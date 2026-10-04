// Network-wide coverage map: paints every station's estimated Excellent /
// Good / Fair reach onto one canvas and shows it as a Leaflet image overlay,
// like a carrier coverage map. Each cell takes the best tier of any station
// that reaches it, so the picture answers "where can Husker Nation hear the
// game, and how clearly" rather than "which station".
//
// Field strength falls monotonically with distance in both propagation
// models, so a station's tier regions are concentric discs whose radii
// coverageRadii already finds by bisection. Painting discs is a few million
// cell writes for the whole network — well under 100 ms — versus evaluating
// signalScoreAt at every cell for every station.

let coverageMapOverlay = null; // L.imageOverlay while the map is shown
let coverageMapLegend = null;  // L.control legend while the map is shown
const coverageRasterCache = {}; // key: sport + day/night → { url, bounds }

// Cell size in degrees of longitude (rows are spaced to match in Web
// Mercator so the overlay lines up with the tiles). ~0.9 km at 41°N.
const COVERAGE_CELL_DEG = 0.01;
// Draw this far past the outermost tower so big AM rings are not clipped.
const COVERAGE_PAD_DEG = 3;
const KM_PER_DEG_LAT = 111.2;

// Tier fills, matching the signal bars and the per-station rings. Alpha is
// baked into the pixels so stronger tiers read a touch more solid.
const COVERAGE_TIERS = [
  { score: 2, rgba: [255, 165, 0, 80], label: 'Fair' },       // orange
  { score: 3, rgba: [120, 200, 110, 115], label: 'Good' },    // light green
  { score: 4, rgba: [0, 110, 0, 165], label: 'Excellent' }    // deep green
];

const mercatorY = latDeg => Math.log(Math.tan(Math.PI / 4 + latDeg * Math.PI / 360));
const mercatorLat = y => (2 * Math.atan(Math.exp(y)) - Math.PI / 2) * 180 / Math.PI;

// Distance from tower (km) at which the tier score drops below `target`.
// Same bisection as coverageRadii, exposed per tier.
function tierRadiusKm(station, target) {
  const MIN_KM = 0.5;
  const MAX_KM = 400;
  const atMax = signalScoreAt(station, MAX_KM);
  if (!atMax) return null; // off air (daytimer after sunset)
  if (atMax.score >= target) return MAX_KM;
  if (signalScoreAt(station, MIN_KM).score < target) return 0;
  let lo = MIN_KM, hi = MAX_KM;
  for (let i = 0; i < 40 && hi - lo > 0.1; i++) {
    const mid = (lo + hi) / 2;
    if (signalScoreAt(station, mid).score >= target) lo = mid; else hi = mid;
  }
  return lo;
}

// Render the raster for a list of stations. Returns { url, bounds } where
// bounds is [[south, west], [north, east]].
function renderCoverageRaster(stationList) {
  const lats = stationList.map(s => s.latitude);
  const lngs = stationList.map(s => s.longitude);
  const west = Math.min(...lngs) - COVERAGE_PAD_DEG;
  const east = Math.max(...lngs) + COVERAGE_PAD_DEG;
  const south = Math.min(...lats) - COVERAGE_PAD_DEG;
  const north = Math.max(...lats) + COVERAGE_PAD_DEG;

  const width = Math.ceil((east - west) / COVERAGE_CELL_DEG);
  const yTop = mercatorY(north);
  const yBottom = mercatorY(south);
  const yStep = COVERAGE_CELL_DEG * Math.PI / 180; // Mercator units per cell, square at the equator
  const height = Math.ceil((yTop - yBottom) / yStep);

  // Latitude of each pixel row (top row = north)
  const rowLat = new Float64Array(height);
  for (let r = 0; r < height; r++) rowLat[r] = mercatorLat(yTop - (r + 0.5) * yStep);

  const grid = new Uint8Array(width * height); // 0 none, 1 Fair, 2 Good, 3 Excellent

  // Paint one disc: for each row the disc touches, fill the span of columns
  // within the great-circle radius (small-angle approximation per row).
  const paintDisc = (station, radiusKm, value) => {
    if (!radiusKm) return;
    const dLat = radiusKm / KM_PER_DEG_LAT;
    const r0 = Math.max(0, Math.floor((yTop - mercatorY(station.latitude + dLat)) / yStep));
    const r1 = Math.min(height - 1, Math.ceil((yTop - mercatorY(station.latitude - dLat)) / yStep));
    for (let r = r0; r <= r1; r++) {
      const dLatKm = (rowLat[r] - station.latitude) * KM_PER_DEG_LAT;
      const rem = radiusKm * radiusKm - dLatKm * dLatKm;
      if (rem <= 0) continue;
      const halfLng = Math.sqrt(rem) / (KM_PER_DEG_LAT * Math.cos(rowLat[r] * Math.PI / 180));
      const c0 = Math.max(0, Math.floor((station.longitude - halfLng - west) / COVERAGE_CELL_DEG));
      const c1 = Math.min(width - 1, Math.ceil((station.longitude + halfLng - west) / COVERAGE_CELL_DEG));
      const base = r * width;
      for (let c = c0; c <= c1; c++) {
        if (grid[base + c] < value) grid[base + c] = value;
      }
    }
  };

  // Distinct towers/frequencies only: the same frequency listed under two
  // sports paints the same disc twice
  const seen = new Set();
  stationList.forEach(station => {
    const key = `${station.Frequency}${station.Format}@${station.latitude},${station.longitude}`;
    if (seen.has(key) || !station.power) return;
    seen.add(key);
    COVERAGE_TIERS.forEach((tier, i) => {
      const km = tierRadiusKm(station, tier.score);
      if (km) paintDisc(station, km, i + 1);
    });
  });

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(width, height);
  const px = image.data;
  for (let i = 0; i < grid.length; i++) {
    const v = grid[i];
    if (!v) continue;
    const [rr, gg, bb, aa] = COVERAGE_TIERS[v - 1].rgba;
    const o = i * 4;
    px[o] = rr; px[o + 1] = gg; px[o + 2] = bb; px[o + 3] = aa;
  }
  ctx.putImageData(image, 0, 0);

  return { url: canvas.toDataURL('image/png'), bounds: [[south, west], [north, east]] };
}

// Stations to include for the current sport filter (same predicate as the markers)
function coverageStations() {
  return stations.filter(s =>
    (s.Sport === 'Football' && currentFilters.football) ||
    (s.Sport === 'Volleyball' && currentFilters.volleyball) ||
    (s.Sport === "Men's Basketball" && currentFilters.mensBasketball) ||
    (s.Sport === "Women's Basketball" && currentFilters.womensBasketball)
  );
}

// Whether AM stations are on night power right now (judged at the center of
// the network; sunset sweeps across the state in ~20 minutes)
function coverageIsNight() {
  return isNightAt(41.5, -99.8);
}

function coverageLegendHtml() {
  const rows = [...COVERAGE_TIERS].reverse().map(t =>
    `<div><span class="coverage-swatch" style="background: rgba(${t.rgba[0]}, ${t.rgba[1]}, ${t.rgba[2]}, ${(t.rgba[3] / 255).toFixed(2)})"></span>${t.label}</div>`
  ).join('');
  const amNote = coverageIsNight()
    ? '🌙 AM stations at nighttime power'
    : '☀️ AM stations at daytime power';
  return `<strong>Estimated reception</strong>${rows}<div class="coverage-note">${amNote}</div>`;
}

// Draw (or redraw) the overlay for the current sport filter
function showCoverageMap() {
  if (!map) return;
  const night = coverageIsNight();
  const key = `${currentSport}|${night ? 'night' : 'day'}`;
  if (!coverageRasterCache[key]) {
    coverageRasterCache[key] = renderCoverageRaster(coverageStations());
  }
  const raster = coverageRasterCache[key];

  if (coverageMapOverlay) {
    coverageMapOverlay.setUrl(raster.url);
    coverageMapOverlay.setBounds(L.latLngBounds(raster.bounds));
  } else {
    coverageMapOverlay = L.imageOverlay(raster.url, raster.bounds,
      { interactive: false, className: 'coverage-raster' }).addTo(map);
  }

  if (!coverageMapLegend) {
    coverageMapLegend = L.control({ position: 'bottomleft' });
    coverageMapLegend.onAdd = () => {
      const div = L.DomUtil.create('div', 'coverage-map-legend');
      div.innerHTML = coverageLegendHtml();
      return div;
    };
    coverageMapLegend.addTo(map);
  } else {
    coverageMapLegend.getContainer().innerHTML = coverageLegendHtml();
  }
}

function hideCoverageMap() {
  if (coverageMapOverlay) {
    map.removeLayer(coverageMapOverlay);
    coverageMapOverlay = null;
  }
  if (coverageMapLegend) {
    map.removeControl(coverageMapLegend);
    coverageMapLegend = null;
  }
}

function coverageMapVisible() {
  return coverageMapOverlay !== null;
}

// Checkbox handler. Turning it on zooms out to the whole network the first
// time so the user sees the full picture; the coordinates link in the header
// still returns to their located view.
function toggleCoverageMap(on) {
  track('coverage-map', { on: on ? 'on' : 'off' });
  if (!on) {
    hideCoverageMap();
    return;
  }
  showCoverageMap();
  map.closePopup();
  map.fitBounds(L.latLngBounds(stations.map(s => [s.latitude, s.longitude])).pad(0.1));
}

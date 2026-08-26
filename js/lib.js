//Calculations modeled off of https://github.com/manuelbieh/geolib/blob/master/src/getDistance.ts
const normalizeACosArg = val => {
  if (val > 1) {
    return 1;
  }
  if (val < -1) {
    return -1;
  }
  return val;
};

const earthRadius = 6378137;
const toRad = value => (value * Math.PI) / 180;
const getDistance = (from, to, accuracy = 1) => {
  const fromLat = from.latitude;
  const fromLon = from.longitude;
  const toLat = to.latitude;
  const toLon = to.longitude;

  const distance =
    Math.acos(
      normalizeACosArg(
        Math.sin(toRad(toLat)) * Math.sin(toRad(fromLat)) +
        Math.cos(toRad(toLat)) *
        Math.cos(toRad(fromLat)) *
        Math.cos(toRad(fromLon) - toRad(toLon))
      )
    ) * earthRadius;

  return Math.round(distance / accuracy) * accuracy;
};

function lookupByLocation() {
  setDisplay('🔍 Finding your location...');
  setResults('<div style="text-align: center; color: #999; padding: 2rem;">Loading...</div>');

  // Check if geolocation is available
  if (!navigator.geolocation) {
    showFallbackStations();
    return;
  }

  navigator.geolocation.getCurrentPosition(function({coords}) {
      sortByLocation(coords);

      setDisplay(`📍 Your location: ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`);
    },
    (error) => {
      let errorMessage = 'Unable to get your location. ';
      switch(error.code) {
        case error.PERMISSION_DENIED:
          errorMessage += 'Showing all stations - click "Find Nearest Stations" to enable location access.';
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage += 'Showing all stations instead.';
          break;
        case error.TIMEOUT:
          errorMessage += 'Showing all stations instead.';
          break;
        default:
          errorMessage += 'Showing all stations instead.';
      }
      setDisplay(`ℹ️ ${errorMessage}`);
      showFallbackStations();
    });
}

function showFallbackStations() {
  // When location is unavailable, show helpful message and link to full list
  // This ensures crawlers and users without location access still have a path forward

  const html = `
    <div style="padding: 2rem; text-align: center;">
      <p style="color: #666; margin-bottom: 1rem;">
        <strong>Location access is required to find stations near you.</strong>
      </p>
      <p style="color: #666; margin-bottom: 1.5rem;">
        Click the "Find Nearest Stations" button above to enable location access,
        or view all stations by city.
      </p>
      <a href="stations.html" style="
        display: inline-block;
        background: #d00000;
        color: white;
        padding: 0.75rem 1.5rem;
        border-radius: 4px;
        text-decoration: none;
        font-weight: 600;
      ">View Full Station List</a>
    </div>
  `;

  setResults(html);

  // Update the display message
  setDisplay('ℹ️ Location unavailable. Click "Find Nearest Stations" to enable location access.');
}

function setDisplay(text) {
  document.getElementById('display').innerHTML = text;
}
function setResults(text) {
  const stationList = document.getElementById('station-list');
  if (stationList) {
    stationList.innerHTML = text;
  } else {
    // Fallback for compatibility
    document.getElementById('results').innerHTML = text;
  }
}

/**
 * Convert meters to miles and round to 2 decimals
 */
function metersToMiles(meters) {
  return Math.round(meters / 1609.344 * 100) / 100;
}

/**
 * Convert meters to kilometers
 */
function metersToKm(meters) {
  return meters / 1000;
}

/**
 * FCC F(50,50) FM propagation curve — predicted field strength in dBu for
 * 1 kW ERP. Rows = distance (km), columns = antenna HAAT (m). This is the
 * same curve family the FCC uses to compute station coverage contours
 * (47 CFR 73.333 Figure 1); values digitized from the FCC's TVFMFS code.
 * Beyond-horizon rolloff is baked into the table.
 */
const F5050_DIST_KM = [1.6, 3.2, 4.8, 6.4, 8, 16.1, 32.2, 48.3, 64.4, 80.5, 96.6, 112.7, 128.7, 144.8,
  160.9, 177, 193.1, 209.2, 225.3, 241.4, 257.5, 273.6, 289.7, 305.8, 321.9];
const F5050_HAAT_M = [30.5, 61, 121.9, 182.9, 243.8, 304.8, 381, 457.2, 533.4, 609.6, 914.4, 1219.2, 1524];
const F5050_DBU = [
  [92, 98, 100.6, 101.5, 101.9, 102, 102.1, 102.2, 102.3, 102.4, 102.5, 102.5, 102.5],
  [79.7, 85.9, 91, 93.4, 94.6, 95, 95.6, 95.9, 96, 96.1, 96.3, 96.5, 96.5],
  [72.7, 79, 84.8, 87.8, 89.4, 90.4, 91.2, 91.8, 92, 92.2, 92.5, 92.5, 92.5],
  [67.8, 73.8, 80, 83.3, 85.4, 86.8, 87.7, 88.3, 88.9, 89.2, 89.9, 90.1, 90.2],
  [64, 70, 76, 79.6, 82, 83.7, 85, 85.8, 86.3, 86.7, 87.6, 88, 88.1],
  [52, 58, 64, 67.6, 70, 72, 73.9, 75.4, 76.7, 77.9, 80.2, 81.3, 81.9],
  [39.4, 45.5, 51.5, 55, 57.6, 59.6, 61.7, 63.3, 64.9, 66.2, 70, 72.4, 74.2],
  [31, 37, 43, 46.7, 49, 51, 53.2, 55.1, 57, 58.5, 62.6, 65, 66.5],
  [25.3, 29.5, 35.5, 39, 41.5, 43.6, 45.9, 47.9, 50, 51.5, 55.4, 57.8, 59.6],
  [20.3, 23.5, 28.8, 32, 34.4, 36.7, 39.1, 41.5, 43.5, 45, 48.9, 51.2, 53],
  [16.2, 18.1, 22, 25.3, 27.7, 29.9, 32, 34.4, 36.7, 38.2, 42.5, 44.9, 46.4],
  [12.8, 14.5, 17.1, 19.8, 22, 23.9, 26, 28.3, 30.7, 32.4, 36.9, 39.1, 40.8],
  [9.8, 11, 13.4, 15.2, 17, 18.8, 21, 23.2, 25.2, 27, 31, 33.2, 35],
  [6.9, 8.2, 10.2, 11.8, 13.1, 14.7, 16.8, 18.8, 20.4, 22, 25.7, 28.1, 30],
  [4, 5.5, 7.4, 8.9, 10.1, 11.5, 13.1, 14.9, 16, 17.3, 21, 23.5, 25.5],
  [1.5, 2.9, 4.8, 6, 7.2, 8.4, 9.9, 11.1, 12.5, 13.7, 17.1, 19.8, 21.8],
  [-1.1, .3, 2.2, 3.7, 4.8, 5.7, 7, 8, 9.1, 10.1, 13.6, 16.1, 18.3],
  [-3.6, -2.2, -.3, 1, 2, 3, 4.1, 5.2, 6.2, 7.1, 10.3, 13, 15],
  [-5.8, -4.8, -3, -1.4, -.3, .6, 1.7, 2.7, 3.8, 4.6, 7.8, 10.4, 12.4],
  [-8.1, -7, -5.2, -3.9, -2.7, -1.8, -.7, .2, 1.1, 2, 5.1, 8, 10],
  [-10.6, -9.4, -7.6, -6.1, -5.1, -4.2, -3.2, -2.2, -1.3, -.4, 2.8, 5.5, 7.7],
  [-13, -11.7, -10, -8.7, -7.6, -6.6, -5.6, -4.6, -3.6, -2.7, .5, 3.1, 5.1],
  [-15.1, -14, -12.2, -11, -10, -9, -8, -7, -6.1, -5.1, -2.1, .6, 2.8],
  [-17.2, -16.1, -14.6, -13.2, -12.1, -11.2, -10.2, -9.2, -8.4, -7.6, -4.5, -2, .2],
  [-19.2, -18.3, -16.9, -15.6, -14.6, -13.6, -12.5, -11.6, -10.6, -10, -6.8, -4.1, -2]
];

/**
 * FM predicted field strength in dBu at a distance, per the FCC F(50,50)
 * curves (bilinear interpolation in log distance / log height).
 *
 * @param {number} erpKw - Effective radiated power in kW
 * @param {number} haatM - Antenna height above average terrain in meters
 * @param {number} distanceKm - Distance from tower in km
 * @returns {number} Field strength in dBu
 */
function fmFieldStrengthDbu(erpKw, haatM, distanceKm) {
  // 47 CFR 73.313(e): HAAT below 30 m uses the 30 m curve
  const h = Math.min(Math.max(haatM || 100, 30.5), 1524);
  const d = Math.min(Math.max(distanceKm, 1.6), 321.9);

  const seg = (x, xs) => {
    let i = 0;
    while (i < xs.length - 2 && xs[i + 1] < x) i++;
    return [i, (Math.log(x) - Math.log(xs[i])) / (Math.log(xs[i + 1]) - Math.log(xs[i]))];
  };
  const [i, td] = seg(d, F5050_DIST_KM);
  const [j, th] = seg(h, F5050_HAAT_M);
  const nearRow = F5050_DBU[i][j] * (1 - th) + F5050_DBU[i][j + 1] * th;
  const farRow = F5050_DBU[i + 1][j] * (1 - th) + F5050_DBU[i + 1][j + 1] * th;
  return nearRow * (1 - td) + farRow * td + 10 * Math.log10(erpKw);
}

/**
 * AM daytime groundwave field strength in mV/m (Norton/van der Pol flat-earth
 * model — the physics behind the FCC 73.184 graphs). Uses 15 mS/m soil
 * conductivity, the Great Plains value from the FCC M3 map (much of central
 * NE/KS is even better at 30).
 *
 * @param {number} powerKw - Transmitter power in kW
 * @param {number} freqKhz - Frequency in kHz
 * @param {number} distanceKm - Distance from tower in km
 * @returns {number} Field strength in mV/m
 */
function amFieldStrengthMvm(powerKw, freqKhz, distanceKm) {
  const sigmaMSm = 15;
  const d = Math.max(distanceKm, 0.5);
  const inverseDistance = 300 * Math.sqrt(powerKw) / d; // mV/m
  const fMhz = freqKhz / 1000;
  const p = 0.582 * fMhz * fMhz * d / sigmaMSm; // Norton "numerical distance"
  const groundLoss = (2 + 0.3 * p) / (2 + p + 0.6 * p * p);
  return inverseDistance * groundLoss;
}

/**
 * Is the sun down at this location right now? AM stations must switch to
 * their (often much lower) licensed nighttime power from local sunset to
 * sunrise. NOAA solar position algorithm.
 */
function isNightAt(latitude, longitude, date = new Date()) {
  const rad = Math.PI / 180;
  const dayOfYear = (date - Date.UTC(date.getUTCFullYear(), 0, 0)) / 86400000;
  const hourUtc = date.getUTCHours() + date.getUTCMinutes() / 60;
  const gamma = 2 * Math.PI / 365 * (dayOfYear - 1 + (hourUtc - 12) / 24);
  const declination = 0.006918 - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma)
    - 0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma)
    - 0.002697 * Math.cos(3 * gamma) + 0.00148 * Math.sin(3 * gamma);
  const equationOfTime = 229.18 * (0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma)
    - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma)); // minutes
  const trueSolarTime = (hourUtc * 60 + equationOfTime + 4 * longitude + 1440) % 1440;
  const hourAngle = (trueSolarTime / 4 < 0 ? trueSolarTime / 4 + 180 : trueSolarTime / 4 - 180) * rad;
  const cosZenith = Math.sin(latitude * rad) * Math.sin(declination)
    + Math.cos(latitude * rad) * Math.cos(declination) * Math.cos(hourAngle);
  return Math.acos(Math.max(-1, Math.min(1, cosZenith))) > 90.833 * rad;
}

/**
 * Listenability tier floors, chosen so the same score means the same
 * real-world reception on a car radio in either band:
 *   score 4+ Excellent (FCC city grade), 3 Good (protected service contour),
 *   2 Fair, 1 Weak-but-listenable, <1 fringe/static.
 * FM floors are dBu (47 CFR 73.211/73.315 + car radio practice);
 * AM floors are dB(mV/m) for 0.15 / 0.5 / 2 / 5 mV/m (47 CFR 73.24/73.182).
 */
const SIGNAL_TIER_FLOORS = {
  FM: [40, 50, 60, 70],
  AM: [-16.5, -6, 6, 14]
};

/**
 * Describe an AM station's nighttime behavior so users searching in the
 * afternoon know what to expect for an evening game — not just what the
 * signal is right now. Returns null for stations that don't change at night.
 * Keep in sync with the copies in stations.html and
 * scripts/generate-station-table.js.
 *
 * @param {object} station - Station record
 * @returns {object|null} { symbol, title } or null
 */
function nightBehavior(station) {
  if (station.Format !== 'AM' || station.powerNight == null || station.powerNight >= station.power) {
    return null;
  }
  if (station.powerNight <= 0) {
    return {
      symbol: '☀️',
      title: 'Daytime-only AM station — off the air from sunset to sunrise, so not available during night games'
    };
  }
  const fmt = kw => kw >= 1 ? `${kw} kW` : `${Math.round(kw * 1000)} watts`;
  return {
    symbol: '🌙',
    title: `Runs reduced power after sunset (${fmt(station.power)} day → ${fmt(station.powerNight)} night) — expect a weaker signal during night games`
  };
}

/**
 * Estimate signal at the listener's location for one station.
 *
 * @param {object} station - Station record (power, haat, powerNight, Format, Frequency, coords)
 * @param {number} distanceMeters - Distance from listener to tower
 * @returns {object} { strength, category } - strength is a cross-band
 *   comparable score (equal score = comparable listenability), category
 *   holds the display info (bars, color, description)
 */
function estimateSignal(station, distanceMeters) {
  if (!station.power || !distanceMeters || distanceMeters <= 0) {
    return { strength: -99, category: getSignalCategory(-99) };
  }

  const distanceKm = metersToKm(distanceMeters);
  let level; // dBu for FM, dB(mV/m) for AM
  let nightNote = '';

  if (station.Format === 'AM') {
    let power = station.power;
    if (station.powerNight != null && station.powerNight < station.power
        && isNightAt(station.latitude, station.longitude)) {
      power = station.powerNight;
      if (power <= 0) {
        // Daytime-only license: the station signs off at sunset
        return {
          strength: -99,
          category: { label: 'Off air', emoji: '🌙', bars: '▱▱▱▱', color: '#999',
            description: 'Daytime-only AM station — off the air from sunset to sunrise' }
        };
      }
      nightNote = ` (reduced nighttime power: ${power >= 1 ? power + ' kW' : (power * 1000) + ' watts'})`;
    }
    level = 20 * Math.log10(amFieldStrengthMvm(power, station.Frequency, distanceKm));
  } else {
    level = fmFieldStrengthDbu(station.power, station.haat, distanceKm);
  }

  // Convert field strength to a tier score: 1.0 at the Weak floor, one unit
  // per tier, linear in dB between floors (comparable across AM and FM).
  const floors = SIGNAL_TIER_FLOORS[station.Format] || SIGNAL_TIER_FLOORS.FM;
  let score;
  if (level <= floors[0]) {
    score = 1 + (level - floors[0]) / (floors[1] - floors[0]);
  } else if (level >= floors[floors.length - 1]) {
    score = 4 + (level - floors[3]) / (floors[3] - floors[2]);
  } else {
    let k = 0;
    while (k < floors.length - 2 && floors[k + 1] < level) k++;
    score = 1 + k + (level - floors[k]) / (floors[k + 1] - floors[k]);
  }

  const category = getSignalCategory(score, nightNote);
  return { strength: score, category: category };
}

/**
 * Get signal strength display category from a tier score.
 *
 * @param {number} score - Cross-band tier score from estimateSignal
 * @param {string} nightNote - Optional note appended to the description
 * @returns {object} Category info with label, emoji, bars, color, description
 */
function getSignalCategory(score, nightNote = '') {
  let category;
  if (score >= 4) {
    category = { label: 'Excellent', emoji: '📶', bars: '▰▰▰▰', color: '#00aa00', description: 'Excellent — strong local-grade signal' };
  } else if (score >= 3) {
    category = { label: 'Good', emoji: '📡', bars: '▰▰▰▱', color: '#4CAF50', description: 'Good — solid reception' };
  } else if (score >= 2) {
    category = { label: 'Fair', emoji: '📻', bars: '▰▰▱▱', color: '#FFA500', description: 'Fair — fine in a car, some noise possible' };
  } else if (score >= 1) {
    category = { label: 'Weak', emoji: '📉', bars: '▰▱▱▱', color: '#ff6b6b', description: 'Weak — listenable but noisy' };
  } else {
    category = { label: 'Fringe', emoji: '⚠️', bars: '▱▱▱▱', color: '#999', description: 'Fringe — likely static' };
  }
  category.description += nightNote;
  return category;
}

/**
 {
     "City": "Alliance",
     "State": "NE",
     lat: 42.09302,
     lng: -102.8702,
     "CallSign": "KCOW",
     "Format": "AM",
     "Frequency": 1400,
     "Sport": "Football",
     "Year": 2019
   }
 */
function sortByLocation(point, sortBy = 'signal') {
  // Calculate distance and signal strength for each station
  const stationsWithData = stations.map(station => {
    const distanceMeters = getDistance(point, station);
    const distanceMiles = metersToMiles(distanceMeters);

    const signal = estimateSignal(station, distanceMeters);

    return {
      ...station,
      distance: distanceMiles,
      distanceMeters: distanceMeters,
      signalStrength: signal.strength,
      signalCategory: signal.category
    };
  });

  // Filter to stations within reasonable range
  const filtered = stationsWithData.filter(it => it.distance < 150);
  const results = filtered.length > 0 ? filtered : stationsWithData.slice(0, 15);

  // Sort by distance or signal strength
  if (sortBy === 'signal') {
    // Sort by signal strength (highest first), then by distance
    results.sort((a, b) => (b.signalStrength - a.signalStrength) || (a.distance - b.distance));
  } else {
    // Sort by distance (nearest first), then by format (FM before AM)
    results.sort((a, b) => (a.distance - b.distance) || (b.Format.localeCompare(a.Format)));
  }

  // Take top 15
  const top15 = results.slice(0, 15);

  // Generate HTML with signal indicators
  const html = top15.map(station => {
    const signalIndicator = station.signalStrength > 0
      ? `<span style="color: ${station.signalCategory.color}; font-size: 0.9em;" title="${station.signalCategory.description}">
           ${station.signalCategory.bars}
         </span>`
      : '';

    const powerInfo = station.power
      ? `<span style="color: #666; font-size: 0.85em;">${station.power} kW</span>`
      : '';

    return `
      <div style="padding: 0.5rem 0; border-bottom: 1px solid #eee;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="flex: 1;">
            <strong>${station.Frequency}${station.Format}</strong>
            ${station.CallSign} - ${station.City}, ${station.State}
            ${powerInfo}
          </div>
          <div style="text-align: right; margin-left: 1rem;">
            ${signalIndicator}
            <div style="font-size: 0.9em; color: #666;">${station.distance} mi</div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  setResults(html);
}

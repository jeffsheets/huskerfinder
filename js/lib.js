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
      console.error('Geolocation error:', error);
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
  // Show a sample of stations from different areas of Nebraska when location is unavailable
  // This ensures crawlers and users without location access still see content

  const fallbackCities = ['Lincoln', 'Omaha', 'Grand Island', 'Kearney', 'North Platte', 'Scottsbluff'];
  const fallbackStations = stations.filter(station =>
    fallbackCities.includes(station.City)
  );

  // Group by city and take first station from each
  const cityMap = new Map();
  fallbackStations.forEach(station => {
    if (!cityMap.has(station.City)) {
      cityMap.set(station.City, station);
    }
  });

  const displayStations = Array.from(cityMap.values()).slice(0, 10);

  if (displayStations.length > 0) {
    // Use the same display format as location-based results
    if (typeof sortByLocation !== 'undefined') {
      // If we have the map.js loaded, show stations with proper formatting
      setResults(displayStations.map(station =>
        `<div class="station-item">
          <div class="station-info">
            <span class="station-freq">${station.Frequency}${station.Format}</span>
            <span class="station-call">${station.CallSign}</span>
            <span class="station-location">${station.City}, ${station.State || ''}</span>
          </div>
          <div class="station-sports">
            <span class="station-sport ${station.Sport.toLowerCase().replace(/['\s]/g, '-')}">${station.Sport}</span>
          </div>
        </div>`
      ).join(''));
    } else {
      // Fallback simple display
      setResults(displayStations.map(station =>
        `<div>${station.Frequency}${station.Format} ${station.CallSign}, ${station.City}, ${station.State} -- ${station.Sport}</div>`
      ).join(''));
    }
  }
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
function sortByLocation(point) {
  const distances = stations.map(it => ({...it, distance: metersToMiles(getDistance(point, it))}));
  const filtered = distances.filter(it=>it.distance < 50);
  const results = filtered.length > 0 ? filtered : distances.slice(0, 5);
  results.sort((a, b) => (a.distance - b.distance || b.Format.localeCompare(a.Format)));

  setResults(results.map(it => (
    `<div>${it.Frequency}${it.Format} ${it.CallSign}, ${it.City}, ${it.State} -- ${it.distance}</div>`
  )).join(''));
}

function sortByTowerLocation(point) {
  //https://radio-locator.com/cgi-bin/locate?select=lonlat&latd=41&latm=9&lats=30&latpol=N&lond=96&lonm=6&lons=24&lonpol=W&band=Both&is_lic=Y&is_cp=Y&is_fl=Y&is_fx=Y&is_fb=Y&format=&dx=1&radius=&freq=&sort=dist
}
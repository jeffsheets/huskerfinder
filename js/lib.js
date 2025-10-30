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
 * Calculate estimated signal strength
 * Uses different propagation models for AM vs FM
 *
 * @param {number} powerKw - Transmitter power in kilowatts
 * @param {number} distanceMeters - Distance from tower in meters
 * @param {string} format - "AM" or "FM"
 * @returns {number} Signal strength score (higher is better)
 */
function calculateSignalStrength(powerKw, distanceMeters, format) {
  if (!powerKw || powerKw <= 0 || !distanceMeters || distanceMeters <= 0) {
    return 0;
  }

  const distanceKm = metersToKm(distanceMeters);

  // Prevent division by zero for very close distances
  const minDistance = 0.1; // 100 meters minimum
  const effectiveDistance = Math.max(distanceKm, minDistance);

  let strength;

  if (format === 'AM') {
    // AM uses ground wave propagation - much better than inverse square
    // Path loss is closer to inverse 1.5 power for AM ground wave
    // Also, AM needs much less power to achieve similar coverage to FM
    // Boost factor accounts for AM's superior propagation efficiency
    strength = powerKw / Math.pow(effectiveDistance, 1.5);
    strength = strength * 150; // Major AM boost for efficient ground wave propagation
  } else {
    // FM uses line-of-sight propagation - follows inverse square more closely
    strength = powerKw / (effectiveDistance * effectiveDistance);
  }

  return strength;
}

/**
 * Get signal strength category with emoji and color
 *
 * @param {number} strength - Signal strength score
 * @returns {object} Category info with label, emoji, color, description
 */
function getSignalCategory(strength) {
  if (strength >= 100) {
    return {
      label: 'Excellent',
      emoji: '📶',
      bars: '▰▰▰▰',
      color: '#00aa00',
      description: 'Very strong signal'
    };
  } else if (strength >= 10) {
    return {
      label: 'Good',
      emoji: '📡',
      bars: '▰▰▰▱',
      color: '#4CAF50',
      description: 'Strong signal'
    };
  } else if (strength >= 1) {
    return {
      label: 'Fair',
      emoji: '📻',
      bars: '▰▰▱▱',
      color: '#FFA500',
      description: 'Moderate signal'
    };
  } else if (strength >= 0.1) {
    return {
      label: 'Weak',
      emoji: '📉',
      bars: '▰▱▱▱',
      color: '#ff6b6b',
      description: 'Weak signal'
    };
  } else {
    return {
      label: 'Very Weak',
      emoji: '⚠️',
      bars: '▱▱▱▱',
      color: '#999',
      description: 'Very weak signal'
    };
  }
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
function sortByLocation(point, sortBy = 'distance') {
  // Calculate distance and signal strength for each station
  const stationsWithData = stations.map(station => {
    const distanceMeters = getDistance(point, station);
    const distanceMiles = metersToMiles(distanceMeters);

    // Calculate signal strength if we have power data
    const signalStrength = station.power
      ? calculateSignalStrength(station.power, distanceMeters, station.Format)
      : 0;

    const signalCategory = getSignalCategory(signalStrength);

    return {
      ...station,
      distance: distanceMiles,
      distanceMeters: distanceMeters,
      signalStrength: signalStrength,
      signalCategory: signalCategory
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

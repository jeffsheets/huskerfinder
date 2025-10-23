let map;
let markers = [];
let userMarker;
let currentFilters = {
  football: true,
  volleyball: true,
  mensBasketball: true,
  womensBasketball: true
};
let userLocation = null;

// Initialize the map centered on Nebraska
function initMap() {
  map = L.map('map').setView([41.5, -99.8], 7);

  // Add OpenStreetMap tiles
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  }).addTo(map);

  // Add all station markers
  addStationMarkers();
}

// Create custom icons for different sports
function getStationIcon(sport) {
  const colors = {
    'Football': '#d00000',
    'Volleyball': '#333333',
    "Men's Basketball": '#D2B48C',
    "Women's Basketball": '#FFB6D9'
  };

  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background: ${colors[sport] || '#666'};
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -8]
  });
}

// Add all station markers to the map
function addStationMarkers() {
  // Clear existing markers
  markers.forEach(marker => map.removeLayer(marker));
  markers = [];

  // Get unique stations (combine duplicates at same location)
  const locationMap = new Map();

  stations.forEach(station => {
    const key = `${station.latitude}-${station.longitude}`;
    if (!locationMap.has(key)) {
      locationMap.set(key, []);
    }
    locationMap.get(key).push(station);
  });

  // Add markers for each unique location
  locationMap.forEach(stationList => {
    const firstStation = stationList[0];

    // Check if this station should be shown based on filters
    const shouldShow = stationList.some(s =>
      (s.Sport === 'Football' && currentFilters.football) ||
      (s.Sport === 'Volleyball' && currentFilters.volleyball) ||
      (s.Sport === "Men's Basketball" && currentFilters.mensBasketball) ||
      (s.Sport === "Women's Basketball" && currentFilters.womensBasketball)
    );

    if (!shouldShow) return;

    // Determine primary sport for icon color (priority order: Football, Volleyball, Men's BB, Women's BB)
    const primarySport = stationList.find(s => s.Sport === 'Football')?.Sport ||
                        stationList.find(s => s.Sport === 'Volleyball')?.Sport ||
                        stationList.find(s => s.Sport === "Men's Basketball")?.Sport ||
                        stationList.find(s => s.Sport === "Women's Basketball")?.Sport ||
                        'Football';

    const marker = L.marker(
      [firstStation.latitude, firstStation.longitude],
      { icon: getStationIcon(primarySport) }
    );

    // Create popup content
    let popupContent = `<div style="min-width: 200px;">`;
    popupContent += `<h3 style="margin: 0 0 8px 0; color: #333;">${firstStation.City}, ${firstStation.State || ''}</h3>`;

    // Group by sport
    const bySport = {};
    stationList.forEach(s => {
      if (!bySport[s.Sport]) bySport[s.Sport] = [];
      bySport[s.Sport].push(s);
    });

    Object.keys(bySport).forEach(sport => {
      const sportStations = bySport[sport];
      const sportColors = {
        'Football': '#d00000',
        'Volleyball': '#333',
        "Men's Basketball": '#8B7355',
        "Women's Basketball": '#FF69B4'
      };
      const sportColor = sportColors[sport] || '#666';
      popupContent += `<div style="margin-bottom: 8px;">`;
      popupContent += `<strong style="color: ${sportColor};">${sport}:</strong><br>`;
      sportStations.forEach(s => {
        popupContent += `<span style="margin-left: 10px;">${s.Frequency}${s.Format} - ${s.CallSign}</span><br>`;
      });
      popupContent += `</div>`;
    });

    popupContent += `</div>`;

    marker.bindPopup(popupContent);
    marker.stationData = stationList;
    marker.addTo(map);
    markers.push(marker);
  });
}

// Update filters when checkboxes change
function updateFilters() {
  currentFilters.football = document.getElementById('showFootball').checked;
  currentFilters.volleyball = document.getElementById('showVolleyball').checked;
  currentFilters.mensBasketball = document.getElementById('showMensBasketball').checked;
  currentFilters.womensBasketball = document.getElementById('showWomensBasketball').checked;

  // Refresh markers
  addStationMarkers();

  // Refresh results if we have a location
  if (userLocation) {
    sortByLocation(userLocation);
  }
}

function sortByLocation(point) {
  userLocation = point;

  // Filter stations based on current sport filters
  let filteredStations = stations.filter(station =>
    (station.Sport === 'Football' && currentFilters.football) ||
    (station.Sport === 'Volleyball' && currentFilters.volleyball) ||
    (station.Sport === "Men's Basketball" && currentFilters.mensBasketball) ||
    (station.Sport === "Women's Basketball" && currentFilters.womensBasketball)
  );

  // Calculate distances for all filtered stations
  const stationsWithDistance = filteredStations.map(it => ({
    ...it,
    distance: metersToMiles(getDistance(point, it))
  }));

  // Group stations by unique frequency/callsign/location combination
  const groupedStations = new Map();

  stationsWithDistance.forEach(station => {
    const key = `${station.CallSign}-${station.Frequency}${station.Format}-${station.City}`;

    if (!groupedStations.has(key)) {
      groupedStations.set(key, {
        CallSign: station.CallSign,
        Frequency: station.Frequency,
        Format: station.Format,
        City: station.City,
        State: station.State,
        latitude: station.latitude,
        longitude: station.longitude,
        distance: station.distance,
        sports: []
      });
    }

    groupedStations.get(key).sports.push(station.Sport);
  });

  // Convert to array and sort by distance
  const results = Array.from(groupedStations.values())
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 10);

  // Update the display with enhanced HTML
  let html = '';
  results.forEach((station, index) => {
    const isNearest = index < 3;
    const uniqueSports = [...new Set(station.sports)];

    html += `<div class="station-item ${isNearest ? 'nearest' : ''}"
                  onclick="focusStation(${station.latitude}, ${station.longitude})">`;
    html += `<div class="station-info">`;
    html += `<span class="station-freq">${station.Frequency}${station.Format}</span>`;
    html += `<span class="station-call">${station.CallSign}</span>`;
    html += `<span class="station-location">${station.City}, ${station.State || ''}</span>`;
    html += `<span class="station-distance"><span class="distance-long">${station.distance} miles away</span><span class="distance-short">${station.distance}mi</span></span>`;
    html += `</div>`;

    html += `<div class="station-sports">`;
    // Show all sports this station broadcasts
    uniqueSports.forEach(sport => {
      const sportClass = sport.toLowerCase().replace(/['\s]/g, '-');
      const shortForms = {
        'Football': 'FB',
        'Volleyball': 'VB',
        "Men's Basketball": 'MBB',
        "Women's Basketball": 'WBB'
      };
      html += `<span class="station-sport ${sportClass}">`;
      html += `${shortForms[sport] || sport}`;
      html += `</span>`;
    });
    html += `</div>`;

    html += `</div>`;
  });

  setResults(html || '<div style="text-align: center; color: #999;">No stations found</div>');

  // Add or update user location marker
  if (userMarker) {
    map.removeLayer(userMarker);
  }

  userMarker = L.marker([point.latitude, point.longitude], {
    icon: L.divIcon({
      className: 'user-marker',
      html: `<div style="
        background: #4285F4;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        position: relative;
      ">
        <div style="
          position: absolute;
          top: -4px;
          left: -4px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 2px solid #4285F4;
          opacity: 0.3;
          background: #4285F4;
        "></div>
      </div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    })
  });

  userMarker.bindPopup('<b>Your Location</b>').addTo(map);

  // Center on user location and zoom to show nearest stations
  if (results.length > 0) {
    // Calculate the maximum distance to the nearest 5 stations to adjust zoom
    const maxDistance = Math.max(...results.slice(0, 5).map(s => s.distance));

    // Adjust zoom level based on distance (closer stations = higher zoom)
    let zoomLevel = 10; // default
    if (maxDistance < 25) zoomLevel = 11;      // Very close stations
    else if (maxDistance < 50) zoomLevel = 10; // Close stations
    else if (maxDistance < 100) zoomLevel = 9; // Medium distance
    else if (maxDistance < 200) zoomLevel = 8; // Far stations
    else {
      // For very far stations, calculate optimal zoom to fit both user and closest station
      const closestStation = results[0];
      const userLatLng = L.latLng(point.latitude, point.longitude);
      const stationLatLng = L.latLng(closestStation.latitude, closestStation.longitude);

      // Create bounds containing both points
      const bounds = L.latLngBounds([userLatLng, stationLatLng]);

      // Add some padding to the bounds (10% on each side)
      const paddedBounds = bounds.pad(0.1);

      // Calculate zoom level that fits both points
      zoomLevel = map.getBoundsZoom(paddedBounds);

      // Ensure zoom level is within reasonable limits
      zoomLevel = Math.max(4, Math.min(8, zoomLevel));
    }

    map.setView([point.latitude, point.longitude], zoomLevel);

    // Automatically open popup for closest station
    if (results.length > 0) {
      const closestStation = results[0];
      // Small delay to ensure map has finished moving
      setTimeout(() => {
        openStationPopup(closestStation.latitude, closestStation.longitude);
      }, 500);
    }
  }
}

// Focus on a specific station when clicked in the list
function focusStation(lat, lng) {
  map.setView([lat, lng], 10);

  // Find and open the popup for this station
  markers.forEach(marker => {
    const markerLatLng = marker.getLatLng();
    if (Math.abs(markerLatLng.lat - lat) < 0.001 && Math.abs(markerLatLng.lng - lng) < 0.001) {
      marker.openPopup();
    }
  });
}

// Open popup for a specific station without changing the map view
function openStationPopup(lat, lng) {
  // Find and open the popup for this station
  markers.forEach(marker => {
    const markerLatLng = marker.getLatLng();
    if (Math.abs(markerLatLng.lat - lat) < 0.001 && Math.abs(markerLatLng.lng - lng) < 0.001) {
      marker.openPopup();
    }
  });
}

// Initialize map when page loads
window.addEventListener('DOMContentLoaded', () => {
  initMap();

  // Automatically try to get user location on page load
  setTimeout(() => {
    lookupByLocation();
  }, 500); // Small delay to ensure map is fully loaded
});

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
  setDisplay('Loading...');
  setResults('');

  navigator.geolocation.getCurrentPosition(function({coords}) {
      sortByLocation(coords);

      setDisplay(`Lat/Lon: ${coords.latitude}, ${coords.longitude}`);
    },
    () => {
      setDisplay('Position lookup from browser failed');
    });
}

function setDisplay(text) {
  document.getElementById('display').innerHTML = text;
}
function setResults(text) {
  document.getElementById('results').innerHTML = text;
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
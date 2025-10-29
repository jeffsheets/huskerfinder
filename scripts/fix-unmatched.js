/**
 * Fix unmatched FM stations by using their AM tower data
 * FM translators typically broadcast from or near the AM tower location
 */

const fs = require('fs');

// Load data
const fccData = JSON.parse(fs.readFileSync('./scripts/fcc-data-cache.json', 'utf8'));
const stationsFile = fs.readFileSync('./js/stations.js', 'utf8');
const stations = eval(stationsFile.replace('const stations = ', ''));

console.log('Fixing unmatched FM stations...\n');

// Create FCC lookup map
const fccMap = new Map();
fccData.forEach(fcc => {
  const key = `${fcc.callSign}-${fcc.format}`;
  if (!fccMap.has(key)) {
    fccMap.set(key, []);
  }
  fccMap.get(key).push(fcc);
});

// Manual fixes based on our research
const fixes = [
  // These FM frequencies should use AM tower data
  {
    match: s => s.CallSign === 'KCOW' && s.Format === 'FM',
    amCallSign: 'KCOW',
    reason: 'FM translator uses AM tower location'
  },
  {
    match: s => s.CallSign === 'KUVR' && s.Format === 'FM',
    amCallSign: 'KUVR',
    reason: 'FM translator uses AM tower location'
  },
  {
    match: s => s.CallSign === 'KGFW' && s.Format === 'FM',
    amCallSign: 'KGFW',
    reason: 'FM translator uses AM tower location'
  },
  {
    match: s => s.CallSign === 'KTNC' && s.Format === 'FM',
    amCallSign: 'KTNC',
    reason: 'FM translator uses AM tower location'
  },
  {
    match: s => s.CallSign === 'KLIN' && s.Format === 'FM',
    amCallSign: 'KLIN',
    reason: 'FM translator uses AM tower location'
  },
  {
    match: s => s.CallSign === 'KOTA' && s.Format === 'FM',
    amCallSign: 'KOTA',
    reason: 'FM translator uses AM tower location'
  },
  {
    match: s => s.CallSign === 'KICS/KXPN' && s.Format === 'FM',
    fmCallSign: 'KLIQ',
    reason: 'Actual call sign is KLIQ'
  }
];

let fixedCount = 0;
let notFixedCount = 0;

const updatedStations = stations.map(station => {
  // Check if this station needs a fix
  const fix = fixes.find(f => f.match(station));

  if (!fix) {
    return station; // No fix needed
  }

  // Apply fix based on type
  if (fix.amCallSign) {
    // Use AM tower data for FM frequency
    const amStations = fccMap.get(`${fix.amCallSign}-AM`) || [];

    if (amStations.length > 0) {
      const amData = amStations[0]; // Use first match
      fixedCount++;

      console.log(`✓ Fixed: ${station.CallSign} ${station.Frequency}${station.Format} (${station.City})`);
      console.log(`  Using ${amData.callSign} AM tower location: ${amData.latitude}, ${amData.longitude}`);
      console.log(`  Power: ${amData.power} kW (AM)`);
      console.log(`  Reason: ${fix.reason}\n`);

      return {
        ...station,
        latitude: amData.latitude,
        longitude: amData.longitude,
        towerLatitude: amData.latitude,
        towerLongitude: amData.longitude,
        cityLatitude: station.latitude,
        cityLongitude: station.longitude,
        power: amData.power,
        powerSource: 'AM', // Note that power is from AM station
        translatorOf: amData.callSign // Note this is a translator
      };
    } else {
      notFixedCount++;
      console.log(`⚠️  Could not fix: ${station.CallSign} ${station.Frequency}${station.Format} - AM data not found\n`);
      return station;
    }

  } else if (fix.fmCallSign) {
    // Use different FM call sign
    const fmStations = fccMap.get(`${fix.fmCallSign}-FM`) || [];

    if (fmStations.length > 0) {
      // Try to match by frequency
      let fmData = fmStations.find(s => Math.abs(s.frequency - station.Frequency) < 0.5);
      if (!fmData) fmData = fmStations[0]; // Use first if no frequency match

      fixedCount++;

      console.log(`✓ Fixed: ${station.CallSign} ${station.Frequency}${station.Format} (${station.City})`);
      console.log(`  Using ${fmData.callSign} FM data: ${fmData.latitude}, ${fmData.longitude}`);
      console.log(`  Power: ${fmData.power} kW`);
      console.log(`  Reason: ${fix.reason}\n`);

      return {
        ...station,
        CallSign: fmData.callSign, // Update call sign
        latitude: fmData.latitude,
        longitude: fmData.longitude,
        towerLatitude: fmData.latitude,
        towerLongitude: fmData.longitude,
        cityLatitude: station.latitude,
        cityLongitude: station.longitude,
        power: fmData.power
      };
    } else {
      notFixedCount++;
      console.log(`⚠️  Could not fix: ${station.CallSign} ${station.Frequency}${station.Format} - FM data not found\n`);
      return station;
    }
  }

  return station;
});

console.log('='.repeat(60));
console.log(`Results:`);
console.log(`  Fixed: ${fixedCount} stations`);
console.log(`  Not fixed: ${notFixedCount} stations`);
console.log('='.repeat(60) + '\n');

// Save the updated file
const output = `const stations = ${JSON.stringify(updatedStations, null, 2)};\n`;

fs.writeFileSync('./js/stations-fixed.js', output);
console.log('✓ Created: js/stations-fixed.js');
console.log('\nNext steps:');
console.log('1. Review the changes');
console.log('2. If it looks good, run: mv js/stations-fixed.js js/stations.js');

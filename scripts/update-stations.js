/**
 * Update stations.js with FCC tower data
 * Matches by call sign and format, updates coordinates and adds power data
 */

const fs = require('fs');

// Read FCC data
const fccData = JSON.parse(fs.readFileSync('./scripts/fcc-data-cache.json', 'utf8'));

// Read current stations.js
const stationsFile = fs.readFileSync('./js/stations.js', 'utf8');
const stations = eval(stationsFile.replace('const stations = ', ''));

console.log(`Loaded ${stations.length} stations from stations.js`);
console.log(`Loaded ${fccData.length} stations from FCC data\n`);

// Create a lookup map for FCC data
const fccMap = new Map();
fccData.forEach(fcc => {
  const key = `${fcc.callSign}-${fcc.format}`;
  // Store multiple entries for same call sign + format (they might have different frequencies)
  if (!fccMap.has(key)) {
    fccMap.set(key, []);
  }
  fccMap.get(key).push(fcc);
});

console.log(`FCC data organized into ${fccMap.size} unique call sign + format combinations\n`);

// Match and update stations
let matched = 0;
let notMatched = 0;
let updated = 0;

const updatedStations = stations.map(station => {
  const key = `${station.CallSign}-${station.Format}`;
  const fccEntries = fccMap.get(key);

  if (fccEntries && fccEntries.length > 0) {
    matched++;

    // Find best match by frequency
    let fccMatch = fccEntries[0];
    if (fccEntries.length > 1) {
      // Try to match by frequency
      const frequencyMatch = fccEntries.find(fcc =>
        Math.abs(fcc.frequency - station.Frequency) < 0.1
      );
      if (frequencyMatch) {
        fccMatch = frequencyMatch;
      }
    }

    // Check if coordinates are different
    const coordsChanged =
      Math.abs(station.latitude - fccMatch.latitude) > 0.001 ||
      Math.abs(station.longitude - fccMatch.longitude) > 0.001;

    if (coordsChanged) {
      updated++;
      if (updated <= 5) {
        console.log(`Updating: ${station.CallSign} ${station.Frequency}${station.Format}`);
        console.log(`  Old: ${station.latitude}, ${station.longitude} (${station.City})`);
        console.log(`  New: ${fccMatch.latitude}, ${fccMatch.longitude} (tower)`);
        console.log(`  Power: ${fccMatch.power} kW`);
        console.log('');
      }
    }

    // Return updated station with new fields
    return {
      ...station,
      latitude: fccMatch.latitude,
      longitude: fccMatch.longitude,
      towerLatitude: fccMatch.latitude,  // Keep original tower coords
      towerLongitude: fccMatch.longitude,
      cityLatitude: station.latitude,  // Keep original city coords for reference
      cityLongitude: station.longitude,
      power: fccMatch.power  // Add power in kW
    };
  } else {
    notMatched++;
    if (notMatched <= 5) {
      console.log(`⚠️  No match: ${station.CallSign} ${station.Frequency}${station.Format} (${station.City})`);
    }
    return station;
  }
});

console.log('\n' + '='.repeat(60));
console.log(`Results:`);
console.log(`  Matched: ${matched} stations`);
console.log(`  Updated coordinates: ${updated} stations`);
console.log(`  Not matched: ${notMatched} stations`);
console.log('='.repeat(60) + '\n');

// Generate the new stations.js file
const output = `const stations = ${JSON.stringify(updatedStations, null, 2)};\n`;

// Save to a temporary file for review
const newFile = './js/stations-updated.js';

// Write new version
fs.writeFileSync(newFile, output);
console.log(`✓ Created updated file: ${newFile}`);

console.log('\nNext steps:');
console.log('1. Review the changes in stations-updated.js');
console.log('2. If it looks good, run: mv js/stations-updated.js js/stations.js');
console.log('3. Test the app to make sure it still works');
console.log('4. Use git to track changes (git diff js/stations.js)');

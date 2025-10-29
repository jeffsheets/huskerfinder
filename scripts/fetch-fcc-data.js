/**
 * Script to fetch FCC tower data for radio stations
 * Updates stations.js with actual tower coordinates and signal strength data
 */

const fs = require('fs');
const https = require('https');

// Read current stations
const stationsFile = fs.readFileSync('./js/stations.js', 'utf8');
// Extract the stations array from the file
const stationsData = eval(stationsFile.replace('const stations = ', ''));

// FCC API endpoint for broadcast station data
// Using FCC's public API for broadcast facilities
const FCC_API_BASE = 'https://publicfiles.fcc.gov/api/service/';

/**
 * Query FCC for station data by call sign and service (AM/FM)
 */
async function queryFCC(callSign, format) {
  return new Promise((resolve, reject) => {
    // FCC uses different endpoints for AM vs FM
    const service = format === 'AM' ? 'am' : 'fm';

    // Try the FCC's facility search API
    const url = `https://publicfiles.fcc.gov/api/service/${service}/facility/${callSign}.json`;

    console.log(`Querying: ${url}`);

    https.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const json = JSON.parse(data);
            resolve(json);
          } catch (e) {
            resolve(null);
          }
        } else {
          resolve(null);
        }
      });
    }).on('error', (err) => {
      console.error(`Error querying ${callSign}:`, err.message);
      resolve(null);
    });
  });
}

/**
 * Alternative: Try querying via FCC's CDBS public data
 */
async function queryFCCAlternative(callSign, format, frequency) {
  // This uses the FCC's CDBS (Consolidated Database System) query
  // Format: https://transition.fcc.gov/fcc-bin/fmq?call=KBRB&fileno=&state=&city=&freq=&fre2=&serv=&status=&facid=&asrn=&class=&list=0&dist=&dlat2=&mlat2=&slat2=&NS=N&dlon2=&mlon2=&slon2=&EW=W&size=9

  return new Promise((resolve, reject) => {
    const service = format === 'AM' ? 'amq' : 'fmq';
    const url = `https://transition.fcc.gov/fcc-bin/${service}?call=${callSign}&list=4&dist=&dlat2=&mlat2=&slat2=&NS=N&dlon2=&mlon2=&slon2=&EW=W&size=9`;

    console.log(`Trying alternative query: ${url}`);

    https.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        // Parse the pipe-delimited text response
        if (res.statusCode === 200 && data.includes('|')) {
          const lines = data.split('\n');
          for (const line of lines) {
            if (line.includes(callSign)) {
              const fields = line.split('|');
              console.log(`  Raw fields (${fields.length} total):`, fields.slice(0, 15));
              if (fields.length > 10) {
                resolve({
                  callSign: fields[0],
                  frequency: parseFloat(fields[1]),
                  latitude: parseFloat(fields[6]),
                  longitude: parseFloat(fields[7]),
                  power: parseFloat(fields[4]), // ERP in kW
                  format: format,
                  rawFields: fields
                });
                return;
              }
            }
          }
        }
        resolve(null);
      });
    }).on('error', (err) => {
      console.error(`Error querying ${callSign}:`, err.message);
      resolve(null);
    });
  });
}

/**
 * Add delay between requests to be nice to FCC servers
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Process all stations
 */
async function processStations() {
  console.log(`Processing ${stationsData.length} station entries...`);

  // Get unique call signs with their formats
  const uniqueStations = new Map();
  stationsData.forEach(station => {
    const key = `${station.CallSign}-${station.Format}`;
    if (!uniqueStations.has(key)) {
      uniqueStations.set(key, station);
    }
  });

  console.log(`Found ${uniqueStations.size} unique call sign + format combinations`);

  // Test with just a few first
  const testStations = Array.from(uniqueStations.values()).slice(0, 5);

  console.log('\n=== Testing with 5 sample stations ===\n');

  for (const station of testStations) {
    console.log(`\nProcessing: ${station.CallSign} ${station.Frequency}${station.Format} (${station.City}, ${station.State})`);

    // Try alternative query method
    const fccData = await queryFCCAlternative(station.CallSign, station.Format, station.Frequency);

    if (fccData) {
      console.log('✓ Found FCC data:');
      console.log(`  Tower Location: ${fccData.latitude}, ${fccData.longitude}`);
      console.log(`  Power: ${fccData.power} kW`);
      console.log(`  Current location: ${station.latitude}, ${station.longitude}`);

      // Calculate distance between city center and tower
      const distance = calculateDistance(
        station.latitude, station.longitude,
        fccData.latitude, fccData.longitude
      );
      console.log(`  Distance from city center: ${distance.toFixed(2)} km`);
    } else {
      console.log('✗ No FCC data found');
    }

    // Be nice to FCC servers
    await sleep(1000);
  }
}

/**
 * Calculate distance between two points (haversine formula)
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Run the script
processStations().then(() => {
  console.log('\n=== Done ===');
}).catch(err => {
  console.error('Error:', err);
});

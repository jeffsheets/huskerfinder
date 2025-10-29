/**
 * Script to fetch FCC tower data using their facility search
 * This version uses radio-locator.com's open data which aggregates FCC info
 */

const fs = require('fs');
const https = require('https');

// Read current stations
const stationsFile = fs.readFileSync('./js/stations.js', 'utf8');
const stationsData = eval(stationsFile.replace('const stations = ', ''));

/**
 * Query radio-locator.com for station data
 * They aggregate FCC data in an easier format
 */
async function queryRadioLocator(callSign, state) {
  return new Promise((resolve) => {
    // Radio-locator uses URLs like: https://radio-locator.com/cgi-bin/finder?call=kbrb&state=ne
    const url = `https://radio-locator.com/cgi-bin/finder?call=${callSign.toLowerCase()}&state=${state.toLowerCase()}&service=AM&status=L`;

    console.log(`Querying: ${callSign} in ${state}`);

    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        // Try to extract coordinates from the HTML
        // Radio-locator shows coordinates in a specific format
        const latMatch = data.match(/Latitude:\s*([\d.-]+)/);
        const lonMatch = data.match(/Longitude:\s*([\d.-]+)/);
        const powerMatch = data.match(/Power:\s*([\d.]+)\s*kW/);

        if (latMatch && lonMatch) {
          resolve({
            latitude: parseFloat(latMatch[1]),
            longitude: parseFloat(lonMatch[1]),
            power: powerMatch ? parseFloat(powerMatch[1]) : null
          });
        } else {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

/**
 * Try the FCC's actual license data API
 */
async function queryFCCLicenseAPI(callSign) {
  return new Promise((resolve) => {
    // The FCC has a license view API
    const url = `https://publicfiles.fcc.gov/api/manager/download/public-file-attachments/facility/${callSign}`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const json = JSON.parse(data);
            resolve(json);
          } catch(e) {
            resolve(null);
          }
        } else {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

/**
 * Use the FCC's actual database files (they publish CSV dumps)
 * For now, let's use a manual lookup approach with known good data sources
 */
async function manualLookup(callSign, format, city, state) {
  // For this proof of concept, let's show what data we WOULD add
  // In a real implementation, you'd:
  // 1. Download FCC's database dumps (they're huge CSV files)
  // 2. Parse them locally
  // 3. Match by call sign + service type

  console.log(`Would lookup: ${callSign} ${format} in ${city}, ${state}`);

  // Return null for now - this is where the actual FCC data would go
  return null;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testQuery() {
  console.log('=== Testing FCC Data Fetching ===\n');

  // Test with a well-known station
  const testStations = [
    { CallSign: 'KFAB', Format: 'AM', Frequency: 1110, City: 'Omaha', State: 'NE' },
    { CallSign: 'KBRB', Format: 'FM', Frequency: 92.7, City: 'Ainsworth', State: 'NE' }
  ];

  for (const station of testStations) {
    console.log(`\nTesting: ${station.CallSign} ${station.Frequency}${station.Format}`);
    console.log(`Location: ${station.City}, ${station.State}`);

    // Try radio-locator
    const data = await queryRadioLocator(station.CallSign, station.State);
    if (data) {
      console.log('✓ Found data:');
      console.log(`  Tower: ${data.latitude}, ${data.longitude}`);
      console.log(`  Power: ${data.power} kW`);
    } else {
      console.log('✗ No data found');
    }

    await sleep(2000);
  }

  console.log('\n=== Recommendation ===');
  console.log('The FCC data is complex to parse automatically.');
  console.log('');
  console.log('Options:');
  console.log('1. Download FCC database dumps (CSV files) and parse locally');
  console.log('   - AM: https://www.fcc.gov/media/radio/am-station-classes');
  console.log('   - FM: https://www.fcc.gov/media/radio/fm-station-classes');
  console.log('');
  console.log('2. Use a commercial API service like:');
  console.log('   - Radio-Locator API (if they offer one)');
  console.log('   - FCC Entity API (requires more setup)');
  console.log('');
  console.log('3. Manual enhancement for key stations only');
  console.log('   - Focus on major Nebraska stations (KFAB, WOW, etc.)');
  console.log('   - Look up tower locations manually via FCC.gov');
  console.log('');
  console.log('Would you like me to help with any of these approaches?');
}

testQuery().catch(console.error);

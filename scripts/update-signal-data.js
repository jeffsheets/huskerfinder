/**
 * Update js/stations.js with corrected power (ERP) and antenna height (HAAT)
 * re-parsed from the raw FCC data cached in scripts/fcc-data-cache.json.
 *
 * Why this exists: the original fetch parser read FM field [4] as power,
 * but in the FCC fmq pipe-delimited output that field is the FM CHANNEL
 * NUMBER (e.g. 224 = 92.7 MHz). The real ERP is field [14]/[15] and the
 * antenna HAAT (meters) is field [16]/[17]. AM field [14] is power, with
 * day/night power appearing as separate rows (field [5] = DAY/NIG/UNL).
 *
 * Writes, per station:
 *   power      - FM: ERP in kW. AM: daytime power in kW.
 *   powerNight - AM only: nighttime power in kW (often much lower).
 *   haat       - FM only: antenna height above average terrain, meters.
 *
 * FM translators aren't in the cache (they're FCC service class FX, not FM),
 * so they get the standard translator ceiling: 0.25 kW ERP at an assumed 50m.
 *
 * Usage: node scripts/update-signal-data.js   (rewrites js/stations.js in place;
 *        review with git diff)
 */

const fs = require('fs');

const fccData = JSON.parse(fs.readFileSync('./scripts/fcc-data-cache.json', 'utf8'));
const stationsFile = fs.readFileSync('./js/stations.js', 'utf8');
const stations = eval(stationsFile.replace('const stations = ', ''));

// Call signs in stations.js that differ from the FCC license
// (590 AM Omaha was licensed KXSP until its 2026 relaunch legally restored
// the historic WOW callsign, so no alias is needed for it anymore)
const CALLSIGN_ALIASES = {};

// Fallback for FM translators with no FX record in the cache.
// Translators max out at 0.25 kW ERP; 50m HAAT is a typical assumption.
const TRANSLATOR_DEFAULTS = { power: 0.25, haat: 50 };

/**
 * Find the licensed FX (translator) record matching an FM entry: same
 * frequency, licensed, within 60 km of the station's current coordinates.
 */
function findTranslatorLicense(station) {
  const toRad = x => x * Math.PI / 180;
  const kmBetween = (aLat, aLon, bLat, bLon) => Math.acos(Math.min(1,
    Math.sin(toRad(aLat)) * Math.sin(toRad(bLat)) +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.cos(toRad(aLon) - toRad(bLon))
  )) * 6378.137;

  const candidates = fccData
    .filter(fcc => fcc.service === 'FX' && fcc.status === 'LIC' &&
      Math.abs(fcc.frequency - station.Frequency) < 0.05 && fcc.latitude)
    .map(fcc => ({ fcc, km: kmBetween(station.latitude, station.longitude, fcc.latitude, fcc.longitude) }))
    .filter(c => c.km < 60)
    .sort((a, b) => a.km - b.km);
  return candidates.length ? candidates[0].fcc : null;
}

function applyTranslator(station) {
  const updated = { ...station };
  updated.translatorOf = station.translatorOf || station.CallSign;
  const fx = findTranslatorLicense(station);
  if (fx) {
    updated.power = fx.power || TRANSLATOR_DEFAULTS.power;
    updated.haat = fx.haat || TRANSLATOR_DEFAULTS.haat;
    updated.latitude = fx.latitude;
    updated.longitude = fx.longitude;
    updated.towerLatitude = fx.latitude;
    updated.towerLongitude = fx.longitude;
    updated.translatorCallSign = fx.callSign;
    updated.powerSource = 'FCC-FX';
  } else {
    updated.power = TRANSLATOR_DEFAULTS.power;
    updated.haat = TRANSLATOR_DEFAULTS.haat;
    updated.powerSource = 'translator-estimate';
  }
  delete updated.powerNight;
  return updated;
}

function parseFccFields(fcc) {
  const f = fcc.rawLine.split('|');
  if (fcc.format === 'FM') {
    return {
      erp: parseFloat(f[14]) || parseFloat(f[15]) || null,
      haat: parseFloat(f[16]) || parseFloat(f[17]) || null,
      hours: null
    };
  }
  return {
    erp: parseFloat(f[14]) || null,
    haat: null,
    hours: (f[5] || '').trim() // DAY / NIG / UNL
  };
}

// Index FCC rows by callsign+format
const fccMap = new Map();
fccData.forEach(fcc => {
  const key = `${fcc.callSign}-${fcc.format}`;
  if (!fccMap.has(key)) fccMap.set(key, []);
  fccMap.get(key).push(fcc);
});

let fmFixed = 0, amFixed = 0, translators = 0, unmatched = [];

const updatedStations = stations.map(station => {
  const updated = { ...station };

  // Known translator entries: match against their real FX license
  if (station.translatorOf || station.powerSource === 'AM') {
    translators++;
    return applyTranslator(station);
  }

  const callSign = CALLSIGN_ALIASES[station.CallSign] || station.CallSign;
  const frequency = station.Frequency;

  const entries = fccMap.get(`${callSign}-${station.Format}`) || [];
  // Only licensed facilities (field [9] = LIC) — the FCC query also returns
  // construction permits, modifications, and auxiliary records.
  let matches = entries.filter(fcc =>
    Math.abs(fcc.frequency - frequency) < 0.1 &&
    (fcc.rawLine.split('|')[9] || '').trim() === 'LIC'
  );
  if (matches.length === 0) {
    matches = entries.filter(fcc => Math.abs(fcc.frequency - frequency) < 0.1);
  }

  if (matches.length === 0) {
    // KBRB 106.3 and any future callsign-frequency mismatch: the FCC has the
    // callsign but not this frequency, meaning it's a translator frequency.
    if (station.Format === 'FM') {
      translators++;
      return applyTranslator(station);
    }
    unmatched.push(`${station.CallSign} ${station.Frequency}${station.Format} (${station.City})`);
    return station;
  }

  if (station.Format === 'FM') {
    const parsed = parseFccFields(matches[0]);
    updated.power = parsed.erp;
    updated.haat = parsed.haat;
    fmFixed++;
  } else {
    // AM: separate rows for day and night power. A station with only a DAY
    // row is a daytime-only license (Class D daytimer) — it signs off at
    // sunset, so its night power is 0. UNL = unlimited, same power all night.
    let day = null, night = null, unlimited = false;
    matches.forEach(fcc => {
      const parsed = parseFccFields(fcc);
      if (parsed.hours === 'NIG') night = parsed.erp;
      else {
        day = parsed.erp;
        if (parsed.hours === 'UNL') unlimited = true;
      }
    });
    updated.power = day || night;
    updated.powerNight = unlimited ? updated.power : (night || 0);
    amFixed++;
  }

  return updated;
});

console.log(`FM entries corrected:        ${fmFixed}`);
console.log(`AM entries corrected:        ${amFixed}`);
console.log(`Translator entries defaulted: ${translators}`);
if (unmatched.length) {
  console.log(`\n⚠️  Unmatched (left untouched):`);
  [...new Set(unmatched)].forEach(u => console.log(`  ${u}`));
}

const output = `const stations = ${JSON.stringify(updatedStations, null, 2)};\n`;
fs.writeFileSync('./js/stations.js', output);
console.log('\n✓ Rewrote js/stations.js (review with git diff)');

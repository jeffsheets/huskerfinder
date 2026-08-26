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
const CALLSIGN_ALIASES = {
  'WOW': 'KXSP' // 590 AM Omaha brands as "WOW" but is licensed KXSP
};

// stations.js frequency -> FCC licensed frequency (lookup only; display unchanged)
const FREQUENCY_ALIASES = {
  'KICS-AM': { from: 1450, to: 1550 } // KICS Hastings is licensed at 1550
};

// FM entries that are actually low-power translators of an AM station.
// Translators max out at 0.25 kW ERP; 50m HAAT is a typical assumption.
const TRANSLATOR_DEFAULTS = { power: 0.25, haat: 50 };

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

  // Existing translator entries keep their tower coords but get honest FM
  // translator power instead of the parent AM station's transmitter power.
  if (station.translatorOf || station.powerSource === 'AM') {
    translators++;
    updated.power = TRANSLATOR_DEFAULTS.power;
    updated.haat = TRANSLATOR_DEFAULTS.haat;
    updated.powerSource = 'translator-estimate';
    delete updated.powerNight;
    return updated;
  }

  const callSign = CALLSIGN_ALIASES[station.CallSign] || station.CallSign;
  const freqAlias = FREQUENCY_ALIASES[`${station.CallSign}-${station.Format}`];
  const frequency = (freqAlias && station.Frequency === freqAlias.from)
    ? freqAlias.to
    : station.Frequency;

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
    if (entries.length > 0 || station.Format === 'FM') {
      translators++;
      updated.power = TRANSLATOR_DEFAULTS.power;
      updated.haat = TRANSLATOR_DEFAULTS.haat;
      updated.powerSource = 'translator-estimate';
      updated.translatorOf = updated.translatorOf || station.CallSign;
      return updated;
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
    // AM: separate rows for day and night power
    let day = null, night = null;
    matches.forEach(fcc => {
      const parsed = parseFccFields(fcc);
      if (parsed.hours === 'NIG') night = parsed.erp;
      else day = parsed.erp; // DAY or UNL
    });
    updated.power = day || night;
    updated.powerNight = night || day;
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

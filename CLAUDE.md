# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Huskers Radio Finder is a vanilla JavaScript web application that helps users find radio stations broadcasting Nebraska Husker football and volleyball games near their location. The app uses browser geolocation and displays results on an interactive Leaflet map.

**Live site**: https://jeffsheets.github.io/huskerfinder/

## Development Commands

### Local Development
```bash
# Start local development server
npx serve .

# Visit http://localhost:3000
```

### Deployment
The site is automatically deployed to GitHub Pages from the master branch. Simply push changes to master to deploy.

## Code Architecture

### File Structure
- **index.html** - Main page with map view and location-based search
- **about.html** - About page
- **stations.html** - Complete station list page
- **styles.css** - Global styles
- **js/stations.js** - Station data array (185 entries with FCC tower coordinates, power, frequency, sport)
- **js/lib.js** - Core utilities: geolocation, distance calculations, signal strength estimation
- **js/map.js** - Leaflet map initialization, markers, filtering, user interaction
- **js/coverage.js** - Network-wide coverage map overlay (raster of every station's Excellent/Good/Fair reach)
- **scripts/** - FCC data fetching and station updating scripts
  - **fetch-fcc-bulk.js** - Fetch fresh FCC tower data
  - **update-stations.js** - Match and update station coordinates
  - **fix-unmatched.js** - Fix FM translator stations

### Key Technical Details

**Distance Calculation**: Uses haversine formula (modeled after geolib) in `js/lib.js`. Calculates great-circle distance between user location and **actual FCC tower coordinates**. Returns distance in meters, converted to miles for display.

**Signal Strength Estimation**: `estimateSignal` in `js/lib.js` predicts field strength from FCC license data — FM via the FCC F(50,50) curves (ERP + HAAT), AM via a Norton groundwave model (day or night power by local sunset) over the FCC M3 ground-conductivity map: `walkAmPath`/`amPathFieldMvm` follow the tower-to-listener bearing across the `js/conductivity.js` grid and combine soils with Kirke's equivalent-distance method (47 CFR 73.183), so `estimateSignal` takes the listener point. `coverageReach` gives AM reach per 5° radial, so AM rings are polygons (`goodShape`/`fairShape`), the popup footer shows a min–max range, and `js/coverage.js` paints each AM outline. The grid is built by `scripts/build-conductivity.js` from `scripts/m3.seq` (FCC download; value columns are east-side/west-side conductivity, codes 102/199 treated as unknown); the grid covers every tower + 800 km; re-run it if the station footprint grows. Field strength maps to a cross-band tier score (Weak/Fair/Good/Excellent) using floors calibrated for a car radio (FM floors are 10 dB below the FCC planning contours). `listeningRank` turns that into the default "Sounds best" sort key: the score saturates at Excellent and FM gets a one-tier fidelity bonus once it is at least Fair, so a Good FM outranks a strong AM but a fuzzy FM does not. The bars show the raw signal tier; only the ordering applies the FM preference.

**Data Structure**: Each station object in `stations.js` contains:
- `City`, `State` - Location information
- `latitude`, `longitude` - **Actual FCC tower coordinates**
- `towerLatitude`, `towerLongitude` - Tower coords (same as above)
- `cityLatitude`, `cityLongitude` - Original city center coords (preserved for reference)
- `CallSign` - Radio station call sign
- `Format` - "AM" or "FM"
- `Frequency` - Station frequency (number)
- `power` - Transmitter power in kilowatts
- `powerSource` - "AM" for FM translator stations
- `translatorOf` - Parent station call sign (for translators)
- `Sport` - "Football", "Volleyball", "Men's Basketball", or "Women's Basketball"
- `Year` - Broadcasting year (currently 2025)

**Station Filtering**:
- Filter by sport with a single-select segmented control (All/Football/Volleyball/Men's Basketball/Women's Basketball); `updateSportFilter` derives the per-sport booleans in `currentFilters`
- The selected sport is mirrored into the URL as `?sport=football|volleyball|mbb|wbb` (pushState, so back/forward work) so filtered views are shareable; `sportFromUrl` reads it on load and on popstate, and `all` clears the param
- Results show **top 15 nearest stations** based on actual tower distance
- Default sort is "Sounds best" (listening rank, see above); "Nearest" sorts by tower distance
- Signal strength bars (▰▰▰▱) shown for reference with color coding:
  - Green: Excellent/Good signal
  - Orange: Fair signal
  - Red: Weak signal
- Map markers are all Husker red (unified deliberately); sport colors appear only in popup headings
- Stations at same location are grouped in map popups

**Map Integration** (`js/map.js`):
- Leaflet.js with OpenStreetMap tiles
- Custom markers for stations and user location
- Auto-zoom logic based on nearest station distances (lines 244-268)
- Clicking a station in the list fits the map to its Fair coverage ring (plus the user) and opens its popup
- Popup opens automatically for closest station after location lookup
- **Pick a spot**: right-click (desktop) or long-press (touch) anywhere on the map, or arm the 📌 control under the zoom buttons and tap once, to rank the list for that point instead of the GPS fix (e.g. the venue you're heading to). `pinSpot` in `js/map.js` calls `sortByLocation(point, false, { pinned: true })`, which draws a blue teardrop `pin-marker` (draggable; `dragend` re-ranks with `keepView` so the map doesn't jump) instead of the round GPS dot, and the header gains a "Use my location instead" link (`clearPin`, which reuses the stored `geoCoords` so there is no second permission prompt). The pin lives in a custom `pinPane` (z-index 750, above popups) so a station card opening over it never hides where the user tapped; the GPS dot stays in the normal marker pane. On phones the popup's "Est. range" footer is hidden (the rings show it) to keep the card short. Plain map clicks never pin (they close popups, and stray taps while panning are common). **The pinned point is intentionally never written to the URL, stored, or sent to analytics** — the `pin-spot` event carries only the gesture (press/pick/drag)
- **Full-screen map**: ⛶ control (top-right) toggles `body.map-fullscreen`, which fixes `#map` over the viewport (`setMapFullscreen` in `js/map.js`, then `invalidateSize`). CSS class rather than the Fullscreen API so it works in iOS Safari. `#map` declares `position: relative` in CSS on purpose: otherwise Leaflet writes an inline position that would beat the fullscreen rule. Escape exits. On phones the coverage legend collapses to one row of swatches
- **Network coverage map**: the "Show network coverage map" checkbox in the controls panel calls `toggleCoverageMap` in `js/coverage.js`. It bisects each station's Excellent/Good/Fair radius (same `signalScoreAt` model as the rings), paints the discs onto a canvas whose rows are spaced in Web Mercator so it lines up with the tiles, and shows it as an `L.imageOverlay` with a bottom-left legend. Each cell keeps the best tier of any station reaching it. Follows the sport filter and the current AM day/night power; a Band row (All / FM only / AM only, `setCoverageBand`) appears under the checkbox while the overlay is on and narrows the painted stations by `Format`. Rasters are cached per sport + band + day/night. Turning it on fits the map to the whole network
- **Coverage rings**: whenever a station popup is open, `showCoverage` draws estimated Good (green, inner) and Fair (orange, outer) rings per distinct frequency at that tower, dashed for AM; `coverageRadii` in `js/lib.js` bisects `signalScoreAt` for the distance where the tier score crosses 3 and 2. AM rings use night power after local sunset (daytimers draw nothing). The popup footer lists the same ranges in miles, built at open time so it stays current

**Geolocation Flow**:
1. Page loads → map initializes → auto-requests user location (500ms delay)
2. User location acquired → calculates distances → sorts stations → displays results
3. Map updates with user marker (blue) and auto-zooms to show nearest stations
4. Results list shows nearest 15 stations with distance in miles and signal indicators

### Privacy & Analytics
- Location data stays client-side, never sent to servers
- Umami analytics configured (script in index.html:32). Custom events via `track()` in `js/lib.js` (no-op when blocked): `locate` {result: ok|denied|unavailable|timeout|unsupported}, `find-click`, `sport-filter` {sport slug}, `sort-by` {mode}, `station-popup` {station, source: list|marker|auto}, `coverage-map` {on: on|off}, `coverage-band` {band: all|fm|am}, `map-fullscreen` {on: on|off}, `pick-spot` {action: start}, `pin-spot` {source: press|pick|drag}. Payloads are UI state only — never coordinates, for the GPS fix or for pinned spots
- No cookies or other tracking

**FM terrain (2026-10-17)**: `scripts/build-fm-radials.js <FM_service_contour_current.txt>` adds `fmHaatRadials` (72 effective heights, every 5°) and, rarely, `fmOffsetRadials` (dB, for directional nulls / heights outside the F(50,50) range) to FM entries in `js/stations.js`. Source: the FCC's daily FM service contour file (https://transition.fcc.gov/bureaus/mb/databases/map/FM_service_contour_current.zip, ~65 MB; the FCC page lists a different, dead filename), linked by the LMS application ID in field 38 of the cache row (falls back to frequency + tower location when the display call sign differs, e.g. KFAN/KFXN). Each radial's height is solved so our 60 dBu edge lands on the FCC contour (verified: median 0.0–0.1%, max ~1%); `fmRadialAt` in `js/lib.js` uses it for every tier, and `coverageReach` returns per-radial reach for FM too. Re-run after anything that rewrites stations.js.

**AM antenna data, night limits, curvature (2026-10-17)**: `scripts/build-am-patterns.js <cdbs dir>` adds `amClass`, `amFieldDay`, `amFieldNight` to `js/stations.js` from the FCC CDBS files `am_ant_sys.dat` / `am_towers.dat` (download the zips from https://transition.fcc.gov/ftp/Bureaus/MB/Databases/cdbs/; CDBS froze in Jan 2024, so newer licenses keep the generic 300 mV/m·√kW). The field is a number (non-directional) or 72 values every 5° (directional, FCC standard pattern, augmentations not applied). Non-directional rows store RMS per kW and directional rows at licensed power — verified across the whole file; WNAX's computed night pattern matches the FCC plot. Re-run it after `build-stations.js`/`update-signal-data.js`, which rewrite stations.js. `amFieldAt1Km` reads it (`amPowerNow` now switches to the night pattern whenever the sun is down, even at unchanged power). At night every AM tier floor moves up 12 dB (`AM_NIGHT_FLOOR_SHIFT_DB`, Fair = 2.0 mV/m, the FCC Class B night protection level), except Class A. `AM_CURVATURE` (exp(−0.0021·f_MHz^1.5·d_km)) corrects the flat-earth Norton model; it was fitted to fccdata.org's FCC daytime contours for WEBC, KTLK, WJON, KFYR, KFGO, WNAX and checked on KRVN, KLIN, WOW (median contour error 3.3%, 90th percentile 7%).

## Modifying Station Data

### Adding/Removing Stations
To update the station list for a new season:
1. Reference source: https://huskers.com/listen
2. Edit `js/stations.js` to add/remove call signs, frequencies, cities
3. Run `node scripts/fetch-fcc-bulk.js` to get FCC tower data (cached in `scripts/fcc-data-cache.json`)
4. Run `node scripts/update-stations.js` to match and update coordinates
5. Run `node scripts/fix-unmatched.js` if needed for FM translators
6. Run `node scripts/update-signal-data.js` to set corrected power (FM ERP kW / AM day kW), `powerNight` (AM), and `haat` (FM antenna height, meters) from the FCC cache — these feed the signal-strength estimates
7. Run `node scripts/generate-station-table.js` to re-render the static station table in stations.html (SEO/AI crawlers don't execute JS, so the table is pre-rendered into the HTML)
8. Update the station counts in visible copy if they changed (index.html FAQ + JSON-LD, stations.html intro, about.html FAQ, llms.txt)
9. **Bump the `?v=` cache-busting query params** on every changed JS/CSS reference (`js/stations.js`, `js/conductivity.js`, `js/lib.js`, `js/coverage.js`, `js/map.js` in index.html; `js/stations.js` in stations.html; `styles.css` in all three pages). Use the current date, e.g. `?v=2026-08-26`. GitHub Pages serves JS/CSS with `max-age=14400` (4 hours), so browsers keep the old file until the URL changes.
10. Review changes and test the app
11. After the changes are deployed, ping IndexNow so Bing re-crawls (key file is committed in the site root):
   ```bash
   curl -X POST "https://api.indexnow.org/indexnow" -H "Content-Type: application/json; charset=utf-8" -d '{
     "host": "huskerfinder.sheetsj.com",
     "key": "63010cfcb74c85c786eb7ca2e6b1d4b8",
     "keyLocation": "https://huskerfinder.sheetsj.com/63010cfcb74c85c786eb7ca2e6b1d4b8.txt",
     "urlList": [
       "https://huskerfinder.sheetsj.com/",
       "https://huskerfinder.sheetsj.com/stations.html",
       "https://huskerfinder.sheetsj.com/llms.txt",
       "https://huskerfinder.sheetsj.com/sitemap.xml"
     ]
   }'
   ```
   (HTTP 200/202 = accepted.) Also update `<lastmod>` dates in sitemap.xml when pages change.

### Updating FCC Tower Data
To refresh tower coordinates and power data annually:
1. Delete `scripts/fcc-data-cache.json` to force fresh fetch
2. Run `node scripts/fetch-fcc-bulk.js` (queries NE, SD, KS stations)
3. Run `node scripts/update-stations.js` to update `js/stations.js`
4. Backup files are temporary - use git for version control

**See `TOWER-DATA-UPDATE.md` for detailed documentation on the FCC data integration.**

## Git Workflow

**IMPORTANT**: Always ask for explicit confirmation before performing ANY git operations:

- ❌ **NEVER** create git commits without asking first
- ❌ **NEVER** push branches without asking first
- ❌ **NEVER** create pull requests without asking first
- ❌ **NEVER** perform any other git operations (merge, rebase, etc.) without asking first

**Workflow**:
1. Make code changes as requested
2. Show the user what changes were made
3. **ASK** if they want to commit the changes
4. Wait for explicit confirmation before running any git commands

## Important Notes

- This is a **static site** - no build process, no backend, no bundler
- All JavaScript is vanilla ES6 - no framework dependencies
- Scripts load in order: stations.js → conductivity.js → lib.js → coverage.js → map.js (see index.html)
- Distance calculations use **actual FCC tower coordinates** for accuracy
- Signal strength indicators are estimates - real reception depends on terrain, buildings, weather
- Station data includes NE, SD, and KS stations broadcasting Husker games
- Use git for version control - temporary backup files are not needed

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
- **js/stations.js** - Station data array (~179 entries with FCC tower coordinates, power, frequency, sport)
- **js/lib.js** - Core utilities: geolocation, distance calculations, signal strength estimation
- **js/map.js** - Leaflet map initialization, markers, filtering, user interaction
- **scripts/** - FCC data fetching and station updating scripts
  - **fetch-fcc-bulk.js** - Fetch fresh FCC tower data
  - **update-stations.js** - Match and update station coordinates
  - **fix-unmatched.js** - Fix FM translator stations

### Key Technical Details

**Distance Calculation**: Uses haversine formula (modeled after geolib) in `js/lib.js`. Calculates great-circle distance between user location and **actual FCC tower coordinates**. Returns distance in meters, converted to miles for display.

**Signal Strength Estimation**: Calculates estimated signal quality using transmitter power and RF propagation models. AM stations use inverse 1.5 power model (ground wave), FM stations use inverse square law (line-of-sight). Signal bars (▰▰▰▱) are visual indicators only - sorting is by distance.

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
- Filter by sport using checkboxes (Football/Volleyball/Men's Basketball/Women's Basketball)
- Results show **top 15 nearest stations** based on actual tower distance
- Stations sorted by distance (not signal strength - distance is more reliable)
- Signal strength bars (▰▰▰▱) shown for reference with color coding:
  - Green: Excellent/Good signal
  - Orange: Fair signal
  - Red: Weak signal
- Map markers color-coded: Football (red #d00000), Volleyball (black #333), Basketball (tan/pink)
- Stations at same location are grouped in map popups

**Map Integration** (`js/map.js`):
- Leaflet.js with OpenStreetMap tiles
- Custom markers for stations and user location
- Auto-zoom logic based on nearest station distances (lines 244-268)
- Clicking a station in the list focuses it on the map
- Popup opens automatically for closest station after location lookup

**Geolocation Flow**:
1. Page loads → map initializes → auto-requests user location (500ms delay)
2. User location acquired → calculates distances → sorts stations → displays results
3. Map updates with user marker (blue) and auto-zooms to show nearest stations
4. Results list shows nearest 15 stations with distance in miles and signal indicators

### Privacy & Analytics
- Location data stays client-side, never sent to servers
- Umami analytics configured (script in index.html:32)
- No cookies or other tracking

## Modifying Station Data

### Adding/Removing Stations
To update the station list for a new season:
1. Reference source: https://huskers.com/listen
2. Edit `js/stations.js` to add/remove call signs, frequencies, cities
3. Run `node scripts/fetch-fcc-bulk.js` to get FCC tower data (cached in `scripts/fcc-data-cache.json`)
4. Run `node scripts/update-stations.js` to match and update coordinates
5. Run `node scripts/fix-unmatched.js` if needed for FM translators
6. Review changes and test the app

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
- Scripts load in order: stations.js → lib.js → map.js (see index.html)
- Distance calculations use **actual FCC tower coordinates** for accuracy
- Signal strength indicators are estimates - real reception depends on terrain, buildings, weather
- Station data includes NE, SD, and KS stations broadcasting Husker games
- Use git for version control - temporary backup files are not needed

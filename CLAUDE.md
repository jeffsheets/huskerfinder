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
- **js/stations.js** - Station data array (~1000 entries with lat/lng, frequency, sport)
- **js/lib.js** - Core utilities: geolocation, distance calculations, sorting
- **js/map.js** - Leaflet map initialization, markers, filtering, user interaction

### Key Technical Details

**Distance Calculation**: Uses haversine formula (modeled after geolib) in `js/lib.js:14`. Calculates great-circle distance between user location and station city coordinates. Returns distance in meters, converted to miles for display.

**Data Structure**: Each station object in `stations.js` contains:
- `City`, `State` - Location information
- `latitude`, `longitude` - Coordinates for distance calculations
- `CallSign` - Radio station call sign
- `Format` - "AM" or "FM"
- `Frequency` - Station frequency (number)
- `Sport` - "Football" or "Volleyball"
- `Year` - Broadcasting year (currently 2025)

**Station Filtering**:
- Filter by sport using checkboxes (Football/Volleyball)
- Results show top 10 nearest stations based on user location
- Map markers color-coded: Football (red #d00000), Volleyball (black #333)
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
4. Results list shows nearest 10 stations with distance in miles

### Privacy & Analytics
- Location data stays client-side, never sent to servers
- Umami analytics configured (script in index.html:32)
- No cookies or other tracking

## Modifying Station Data

To update the station list for a new season:
1. Edit `js/stations.js`
2. Add/remove/update station objects in the `stations` array
3. Ensure each station has all required fields
4. Reference source: https://huskers.com/listen

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
- Scripts load in order: stations.js → lib.js → map.js (see index.html:88-90)
- Distance calculations are based on city coordinates, not actual radio tower locations
- Station reception quality depends on many factors beyond distance

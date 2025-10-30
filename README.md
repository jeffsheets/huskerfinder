# 🏈🏐 Huskers Radio Finder

Find radio stations broadcasting Nebraska Husker football and volleyball games near your location.

Because I never know what station has the game, at home or on the road. And never when I need to know. So now there's an app for that.

## 🌐 Live App

**[https://huskerfinder.sheetsj.com/](https://huskerfinder.sheetsj.com/)**

## ✨ Features

- **📍 Location-Based Search**: Uses your device's GPS to find nearby radio stations
- **🗺️ Interactive Map**: Visual map showing station locations and your position
- **📡 FCC Tower Data**: Uses actual tower coordinates from FCC database for accurate distances
- **📶 Signal Strength Indicators**: Visual bars showing estimated signal quality
- **🏈🏐🏀 Multi-Sport**: Filter by football, volleyball, men's and women's basketball
- **📱 Mobile Responsive**: Works great on phones, tablets, and desktop
- **🎯 Distance Sorting**: Shows 15 nearest stations sorted by actual tower proximity
- **📊 Complete Station List**: Browse all available stations by city and frequency

## 🚀 Quick Start

1. Visit the live site: [huskerfinder.sheetsj.com](https://huskerfinder.sheetsj.com/)
2. Allow location access when prompted
3. View nearby stations sorted by distance
4. Click on map markers or station list items for details
5. Tune in and Go Big Red! 🔴

## 🛠️ Local Development

```bash
# Clone the repository
git clone https://github.com/jeffsheets/huskerfinder.git
cd huskerfinder

# Start local server
npx serve .

# Visit http://localhost:3000
```

## 📡 How It Works

The app uses browser geolocation to determine your position, then calculates distances to actual radio tower locations using FCC (Federal Communications Commission) data. Signal strength indicators use transmitter power and RF propagation models to estimate signal quality.

**Important Note**: While we use actual tower coordinates and power data, real-world reception depends on terrain, buildings, weather, and other factors. Signal bars are estimates - always try the nearest stations first!

## 🛡️ Privacy

- **Location data** stays on your device - never sent to external servers
- **Minimal analytics** - privacy-focused Umami analytics for basic usage stats only
- **No cookies** - no third-party tracking or advertising
- **Open source** - all code is public and auditable

## 🔧 Technology Stack

- **Frontend**: Vanilla HTML, CSS, JavaScript
- **Mapping**: [Leaflet.js](https://leafletjs.com/) with OpenStreetMap tiles
- **Geolocation**: Browser Geolocation API
- **Tower Data**: FCC database (actual tower coordinates and transmitter power)
- **Hosting**: GitHub Pages
- **Build**: Simple static site - no build process needed

## 📋 Station Data

Station information is compiled from [huskers.com/listen](https://huskers.com/listen) and enhanced with actual tower coordinates and transmitter power from the FCC database. The app includes stations from Nebraska, South Dakota, and Kansas that broadcast Husker games.

To update the FCC tower data, run `node scripts/fetch-fcc-bulk.js` to fetch fresh data from the FCC. If you know of stations that should be added or removed, please [open an issue](https://github.com/jeffsheets/huskerfinder/issues).

## 📄 License

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)** - see the [LICENSE](LICENSE) file for details.

**What this means:**
- ✅ You can freely use, study, and modify this code
- ✅ You can deploy your own version of this app
- ✅ If you run a modified version publicly (web service), you must share your source code under AGPL
- ✅ Commercial use is allowed, but modifications must remain open source
- 🔒 Prevents proprietary forks - keeps improvements in the community

**Commercial License:**
If you want to use this project in a proprietary/closed-source application without the AGPL requirements, a commercial license is available. Please contact [Jeff Sheets](https://sheetsj.com) to discuss licensing options.

## ❤️ About

Created by [Jeff Sheets](https://sheetsj.com) - a Nebraska graduate and lifelong Husker fan who got tired of not knowing what station to turn on

**Go Big Red!** 🌽

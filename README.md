# 🏈🏐 Huskers Radio Finder

Find radio stations broadcasting Nebraska Husker football and volleyball games near your location.

Because I never know what station has the game, at home or on the road. And never when I need to know. So now there's an app for that.

## 🌐 Live App

**[https://jeffsheets.github.io/huskerfinder/](https://jeffsheets.github.io/huskerfinder/)**

## ✨ Features

- **📍 Location-Based Search**: Uses your device's GPS to find nearby radio stations
- **🗺️ Interactive Map**: Visual map showing station locations and your position
- **🏈 Football & Volleyball**: Filter by sport to find exactly what you're looking for
- **📱 Mobile Responsive**: Works great on phones, tablets, and desktop
- **🎯 Distance Sorting**: Stations automatically sorted by proximity to your location
- **📊 Complete Station List**: Browse all available stations by city and frequency

## 🚀 Quick Start

1. Visit the live site: [jeffsheets.github.io/huskerfinder](https://jeffsheets.github.io/huskerfinder/)
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

The app uses browser geolocation to determine your position, then calculates distances to radio stations in the database. Stations are sorted by proximity, with the assumption that closer stations generally provide better reception.

**Important Note**: Distance calculations are based on city locations, not actual radio tower positions or signal coverage areas. Always try multiple stations if the closest ones don't have clear reception.

## 🛡️ Privacy

- **Location data** stays on your device - never sent to external servers
- **No tracking** - no analytics, cookies, or data collection
- **Open source** - all code is public and auditable

## 🔧 Technology Stack

- **Frontend**: Vanilla HTML, CSS, JavaScript
- **Mapping**: [Leaflet.js](https://leafletjs.com/) with OpenStreetMap tiles
- **Geolocation**: Browser Geolocation API
- **Hosting**: GitHub Pages
- **Build**: Simple static site - no build process needed

## 📋 Station Data

Station information is compiled from various sources including [huskers.com/listen](https://huskers.com/listen) and updated for the current season. If you know of stations that should be added or removed, please [open an issue](https://github.com/jeffsheets/huskerfinder/issues).

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ❤️ About

Created by [Jeff Sheets](https://sheetsj.com) - a Nebraska graduate and lifelong Husker fan who got tired of not knowing what station to turn on

**Go Big Red!** 🌽

# RideTogether 🚴‍♂️🏃‍♀️

> **Stay connected, even when you're apart.**

RideTogether is a real-time companion app for cyclists and runners. It allows two partners to sync their sessions, visualization their relative position (gap distance, speed difference) on a radar dashboard, and communicate with quick visual signals—all without stopping to type a text.

Designed with a **"Cockpit" aesthetic** (high-contrast dark mode) for maximum visibility during activities on mobile screens.

## ✨ Features

- **Real-Time Radar**: Visualizes your partner's position relative to you (Ahead/Behind) and the distance gap in meters.
- **Live Metrics**: See your speed and the relative speed difference (e.g., "+2.5 km/h") to pace each other perfectly.
- **P2P Connection**: Uses WebRTC (via PeerJS) for direct, low-latency browser-to-browser connection. No backend tracking server required.
- **Simple Room Codes**: Connect easily with readable 4-word codes like `fast-blue-aero-rider` instead of complex IDs.
- **Smart Signals**: Send quick alerts without typing:
    - ⚡ **Kudos/Ping**: Send a pulse to say "Good job" or "I'm here".
    - ⬅️➡️ **Turn Signals**: Indicate upcoming turns.
    - ✋ **Stop**: Signal a stop for traffic or rest.
    - ⬆️⬇️ **Pace Control**: Request to "Speed Up" or "Slow Down".

## 📱 Mobile-First Design

The interface is built for the outdoors:
- **Deep Dark Mode**: Saves battery and reduces glare.
- **Large Touch Targets**: Easy to hit buttons while moving.
- **Sticky Status Bar**: Always know if you are connected and recording.

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS (Custom "Strava-like" aesthetic)
- **Networking**: PeerJS (WebRTC wrapper)
- **Icons**: Lucide React

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd ridetogether
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open the app on two devices (or two browser windows) to test:
   - **Device A**: Select "Create Room", copy the code (e.g., `wild-red-storm-team`).
   - **Device B**: Enter the code in the "Join" box and hit Connect.

## 🎮 Usage

1. **Grant Permissions**: The app requires **Location Access** to calculate speed and distance. Allow this when prompted.
2. **Choose Mode**: Select **Cycling** (km/h) or **Running** (min/km) metrics.
3. **Sync Up**: Share the 4-word code with your partner.
4. **Ride/Run**: Keep the browser open. Your stats will update in real-time as you move.

---

*Note: This app works best on mobile devices with active GPS. Testing on a desktop may result in static location data unless sensors are simulated.*

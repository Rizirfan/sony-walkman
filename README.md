# 🎧 Sony Ericsson Walkman 4.0 - Glassmorphism Edition

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D%2016.0.0-green.svg)](https://nodejs.org/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![Aesthetic](https://img.shields.io/badge/theme-glassmorphism%20%7C%20retro-purple.svg)]()
[![Platform](https://img.shields.io/badge/platform-mobile%20%7C%20desktop-orange.svg)]()

A premium, interactive retro-modern music player modeled after the iconic Sony Ericsson Walkman series. Built with a high-fidelity frosted liquid glass interface, the player combines a realistic 3D physical deck simulation with modern streaming, search integrations, user accounts, and real-time cloud playlist synchronization.

---

## 🌟 Key Features

*   **Realistic Physical Deck Simulation**:
    *   **Interactive digital LCD**: Shows playback status, current track title with marquee scrolling, and simulated graphic equalizer bars.
    *   **Spinning Cassette Reels**: SVG gears spin dynamically in real-time when a song is playing, with winding tape volume sizes that adjust dynamically based on progress.
    *   **Tactile Secondary Controls**: Rectangular mechanical STOP and EJECT buttons with spring pop and latch animations.
    *   **Tape SFX**: Built-in mechanical click sounds generated via the browser's native **Web Audio API** for tactile button-click feedback.
*   **Vibrant Ambient Glows**: Song titles are hashed at run-time to generate complementary HSL colors that power dynamic, shifting ambient background orbs.
*   **Search & Stream Integration**: Seamlessly search YouTube tracks or paste video URLs directly to load them into your cassette library (uses the official **YouTube IFrame API**).
*   **User Auth & Cloud Synchronization**: Consolidately manage accounts inside the Settings modal. Register/Log In to sync your playlist, API keys, audio settings, and active theme across devices. Uses secure PBKDF2/scrypt password hashing with no external database dependencies (stored in a local JSON database).
*   **Aesthetic Theme Options**:
    *   `Obsidian Black` (Default Neon)
    *   `Arctic White` (Liquid Glass)
    *   `Limited Red` (Special Edition Crimson)
*   **Mobile-First GPU Optimizations**: Fully responsive styling, dynamic window auto-scaling to fit 6.1" & 6.7" screens with **zero page-level scrolling**, and hardware-accelerated animations (`will-change` composite transformations) for 60FPS mobile rendering.

---

## 🛠️ Technology Stack

*   **Frontend**: Vanilla HTML5 (semantic layout), Vanilla CSS3 (Custom properties/variables, custom scrollbars, safe-area mapping), Google Fonts (`Orbitron`, `Montserrat`, `Reenie Beanie`).
*   **Logic**: Vanilla ES6 JavaScript, Web Audio API (tactile synthesis), YouTube Player API.
*   **Backend**: Node.js (`http` module), Session authentication maps, local file-based persistent JSON storage.

---

## 🚀 Local Quickstart

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed (version 16 or higher).

### 1. Clone the repository
```bash
git clone https://github.com/Rizirfan/sony-walkman.git
cd sony-walkman
```

### 2. Install dependencies
*(No third-party runtime npm packages are needed! Uses native Node.js APIs).*
```bash
npm install
```

### 3. Run the development server
```bash
npm start
```

### 4. Open the application
Navigate to [http://localhost:3000](http://localhost:3000) in your web browser.

---

## ☁️ Public Deployment (Render.com)

This application is ready for free deployment on **Render**.

1.  Connect your GitHub repository to Render.
2.  Create a new **Web Service** with:
    *   **Root Directory**: `Downloads/shdesignmeld projects/projects/open/sony walkman` (or leave blank if files are at your repo root)
    *   **Build Command**: `npm install`
    *   **Start Command**: `node server.js`
3.  Add a **Persistent Disk** (under **Disks**) mounted at path `/data` (size: `1 GB`) to persist user account data across updates.
4.  Add an **Environment Variable** (under **Environment**):
    *   **Key**: `DATA_DIR`
    *   **Value**: `/data`

---

## 🏷️ Recommended GitHub Repository Labels / Tags

For maximum discoverability, configure the following topics on your GitHub repository page settings:

`music-player` `retro-aesthetic` `synthwave` `glassmorphism` `neomorphism` `web-audio-api` `youtube-api` `vanilla-js` `nodejs` `responsive-design` `liquid-glass` `html5-audio`

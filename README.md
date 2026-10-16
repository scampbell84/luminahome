# 🌟 Lumina Home

> **An elegant, self-hosted smart wall display and ambient dashboard designed for touchscreen kiosks and Raspberry Pi.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/Node.js-20%2B-brightgreen.svg)](https://nodejs.org/)
[![Platform](https://img.shields.io/badge/Platform-Raspberry%20Pi%20%7C%20Linux%20%7C%20macOS-orange.svg)](#raspberry-pi-installation)
[![Version](https://img.shields.io/badge/Version-v2.6.0-indigo.svg)](package.json)

---

## ✨ Features

- 🖥️ **Interactive 12-Column Grid Dashboard**: Drag, drop, and resize widgets with pixel-perfect responsive layouts tailored for 1080p, 1200p, and 4K displays.
- 🕰️ **Liquid Glass StandBy Screensaver**: Full-screen Apple-inspired typographic digital clock with a gently pulsing seconds colon and a subtle frosted-glass complication showing the date and current weather.
- 🌙 **Circadian Red Night Mode**: Instant toggle and automated time scheduling (e.g., 10 PM – 7 AM) switches the screensaver into pitch black with ultra-dim crimson red typography and anti-burn-in micro-drift pixel shift for bedroom and low-light environments.
- 📅 **Multi-Feed Calendar Aggregator**: Live synchronisation with iCloud, Google Calendar, Microsoft Outlook, and standard `.ics` / Webcal feeds, complete with color coding and recurring event support.
- ⛅ **Hyperlocal Weather & Warnings**: Real-time forecasts, precipitation probabilities, daily high/low temperatures via Open-Meteo, with automatic location detection and official weather alert badges.
- 📝 **Household Notes & Quotes**: Pinned reminders, sticky notes, and customizable daily inspirational quotes.
- ⏳ **Milestone Countdowns & News Ticker**: Track upcoming birthdays, holidays, and milestones alongside an integrated live RSS news ticker.
- ⚡ **Hardware Telemetry & Health Monitoring**: Live Raspberry Pi CPU temperature, multi-core load averages, RAM allocation, storage capacity, and local IP addresses.
- 🛡️ **Update-Proof Configuration Persistence**: All user settings, calendar feeds, and widget coordinates are stored safely in `~/.luminahome/config.json` outside the Git repository. Updating code will **never** overwrite your settings.
- 🔄 **One-Click In-App Updates**: Check for and apply updates right from the settings panel or terminal. The update engine dynamically detects your own GitHub remote branch.

---

## 🚀 Quick Start (Raspberry Pi Automated Setup)

The fastest way to install Lumina Home on a Raspberry Pi 4 or 5 running **Raspberry Pi OS (Bookworm or Bullseye)**:

```bash
# 1. Clone the repository
git clone https://github.com/scampbell84/luminahome.git ~/luminahome
cd ~/luminahome

# 2. Run the automated kiosk installer
bash scripts/install-kiosk.sh
```

### What the installer handles for you:
1. Installs Node.js 20 LTS, Chromium browser, `unclutter`, and system utilities.
2. Configures `luminahome.service` with systemd to automatically boot the server 24/7.
3. Sets up full-screen kiosk autostart for your desktop session (supporting **Labwc**, **Wayfire**, and **LXDE**).
4. Tunes swap memory to 1024MB to ensure smooth, crash-free Chromium performance.
5. Builds production assets and starts the display immediately.

---

## 🛠️ Manual Installation (Any Linux, macOS, or Windows PC)

If you are running Lumina Home on an Intel/AMD mini-PC, Home Assistant server, or desktop:

```bash
# 1. Ensure Node.js 20+ is installed
node -v

# 2. Clone the repository
git clone https://github.com/scampbell84/luminahome.git ~/luminahome
cd ~/luminahome

# 3. Install dependencies
npm install

# 4. Build frontend bundle
npm run build

# 5. Start the server
npm start
```

Once running, access Lumina Home via your browser:
- **Kiosk Display**: `http://localhost:3000/display`
- **Admin Dashboard & Settings**: `http://localhost:3000/admin`

*(Replace `localhost` with your device's local IP address, e.g., `http://192.168.1.50:3000/display`, to view from any tablet, phone, or laptop on the same network).*

---

## 📱 Navigation & Endpoints

| Endpoint | Description |
| :--- | :--- |
| `/display` | Fullscreen wall display interface with clock, weather, calendar, and widgets. |
| `/admin` | Settings panel for calendar feeds, weather city, wallpaper, and widget positions. |
| `/screensaver` | Direct StandBy liquid glass ambient screensaver view. |
| `/api/system` | Telemetry endpoint (CPU temp, RAM, storage, network IPs, and Git remote info). |
| `/api/weather` | Open-Meteo caching proxy with automatic reverse-geocoding. |
| `/api/calendar/events` | Aggregated iCal parser with recurrence expansion. |

---

## 🔒 Configuration & Data Persistence

Lumina Home protects your custom setups across software updates.

### Configuration Storage
- User settings are saved atomically to:
  ```
  ~/.luminahome/config.json
  ```
- Because this file lives in your user home directory rather than inside the Git repository, Git commands such as `git pull`, `git reset --hard`, or `git checkout` can **never wipe or overwrite your settings**.
- You can override the directory using the `LUMINA_CONFIG_DIR` environment variable if desired.

### Automatic Migration
If upgrading from an earlier version that stored settings in `./data/config.json`, Lumina Home automatically copies your configuration to `~/.luminahome/config.json` on first startup.

---

## 🔄 Updating Lumina Home

### Option 1: In-App Update (Recommended)
1. Open the Admin Dashboard at `http://localhost:3000/admin`.
2. Navigate to the **System & Updates** tab.
3. Click **Check for Updates**. If a new release or commit is found on your GitHub repository, click **Install Update Now**.
4. The dashboard will pull the latest code, install packages, rebuild assets, and restart the background service automatically.

### Option 2: Command Line
```bash
cd ~/luminahome
bash scripts/update.sh
```

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env` if you wish to customize port or file paths:

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `PORT` | `3000` | Port for the HTTP Express server. |
| `NODE_ENV` | `development` | Set to `production` in kiosk deployments. |
| `LUMINA_CONFIG_DIR` | `~/.luminahome` | Custom directory path for user configuration. |

---

## 💡 Recommended Pre-Launch Checklist (MVP)

Before deploying your wall display into permanent daily use, we recommend:

1. **Set Up Static IP or mDNS**: Assign a static DHCP lease or use `luminahome.local` so your admin dashboard is always accessible at the same address.
2. **Disable Screen Blanking / Power Management**: The provided kiosk scripts automatically disable DPMS and screen blanking so your display stays on continuously.
3. **Calibrate Screensaver Timeout**: Set an idle inactivity timeout in **Admin > Screen Saver** (e.g. 5 or 10 minutes) so your display transitions gracefully into ambient StandBy mode when not in use.
4. **Add Personal Calendar Feeds**: Under **Admin > Calendar**, paste your private Apple iCloud (`webcal://`), Google (`https://calendar.google.com/calendar/ical/...`), or Microsoft 365 ICS URL.

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

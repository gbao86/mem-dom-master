# ⚡ MemDOM Master OS

> **Advanced Realtime RAM & DOM Tree Optimizer for Chrome Power Users**

[![Version](https://img.shields.io/badge/version-0.0.1-blueviolet.svg?style=for-the-badge)](https://github.com/gbao86/mem-dom-master)
[![Manifest](https://img.shields.io/badge/Manifest-V3-sky.svg?style=for-the-badge)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Framework](https://img.shields.io/badge/Stack-React%2019%20+%20TS%20+%20Vite-blue.svg?style=for-the-badge)](https://react.dev/)

---

## 🐱 The Developer Cat Approves

When your Chrome tabs start eating all your precious RAM:

![Coding Cat typing extremely fast](https://media.giphy.com/media/3oKIPnAiaMCws8nruU/giphy.gif)

*“Write code, save RAM, sleep tabs, repeat.”*

---

## 🚀 Key Features

MemDOM Master OS delivers surgical-grade memory optimization techniques packed into a beautiful Nordic/Slate Dark telemetry control HUD.

### 1. 🧹 Active Heap Purging (Force V8 GC)
Forces Chromium's V8 engine to execute immediate garbage collection on active tab runtimes to reclaim unused memory blocks without reloading your workspace.

### 2. ⚡ Deep DOM Compression (Gzip DOM Standby Screen)
Minimizes inactive tabs down to a tiny static footprint. Extracts the entire HTML DOM structure, compresses it using the native `CompressionStream` (Gzip) algorithm, caches dynamic form input fields, unloads all active script threads, and serves a beautiful standby screen.

### 3. 💤 True Background Auto-Pilot
Runs silently in the background via alarms and intervals even when the Dashboard UI is closed. Automatically triggers deep hibernation whenever a tab's memory usage meets or exceeds your custom-configured RAM threshold.

### 4. ⏱️ 5-Minute Grace Period
When you explicitly wake up an auto-hibernated tab, it enters a **5-minute grace period** where Auto-Pilot ignores it. If the tab still exceeds your memory threshold, a sleek notification banner warns you that auto-hibernation will resume in 5 minutes.

### 5. 🗺️ Realtime Memory Defragmentation Map
Visualizes your page DOM node density and V8 heap state in an interactive 10x10 telemetry grid showing Stable, Interactive, Leaking/Heavy, Compressed, and Free memory blocks.

---

## 🛠️ Installation & Setup

To load this extension locally in your browser:

1. Clone or download this repository:
   ```bash
   git clone https://github.com/gbao86/mem-dom-master.git
   ```
2. Navigate to the project directory and install dependencies:
   ```bash
   cd mem-dom-master
   npm install
   ```
3. Compile the production bundle:
   ```bash
   npm run build
   ```
4. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable **Developer mode** (top-right toggle).
   - Click **Load unpacked** (Tải thư mục đã giải nén) and select the generated `dist` folder.

---

## 📝 Changelog

### [v0.0.1] - 2026-06-09
#### Added
- **True Background Auto-Pilot**: Relocated auto-pilot checking loop to the background service worker using alarms and intervals to keep optimization active when the dashboard popup is closed.
- **Custom RAM Threshold**: Added a custom select selector (MB/GB) and text-input box allowing users to specify a customized RAM threshold for the Auto-Pilot trigger.
- **5-Minute Grace Period**: Waking up an auto-hibernated tab temporarily registers it in a 5-minute grace period cache.
- **Webpage Warning Banners**: Injected a floating warnings toast at the top-right of webpages if they remain above the memory threshold during the grace period.
- **Optimized UI Button Controls**: Enlarged the dashboard control buttons (`DỌN RÁC` and `NGỦ ĐÔNG` / `WAKE UP`) directly on the tab cards for a touch-friendly click experience.
- **Telemetry fixes**: Discarded tabs now properly report exactly `0 MB` of memory and `0` DOM nodes/depth on the HUD.
- **Hardware RAM Icon**: Replaced the spinning radar orb with a hardware RAM chip SVG logo to remove generic AI assistant styling.

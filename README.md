# GYMIX — Smart Workout Tracker

A premium, dark-first fitness application for logging workouts, exploring exercises, visualizing muscle activation, and tracking long-term progress.

## Features

- **Home dashboard** — daily plan, live-session banner, streak, activity stats, weekly chart, recent workouts, milestones.
- **Workout tracking** — routine templates, live set/rep/weight logging, previous performance, rest timer, notes, set completion animations, finish summary.
- **Exercise library** — 110 exercises with search, filters by muscle/equipment/difficulty/category, favorites, custom exercises, and detail views with instructions and form tips.
- **Anatomy map** — interactive front/back SVG with individually selectable muscle regions colored by real training volume.
- **Progress analytics** — volume/frequency charts, muscle distribution, exercise progression with estimated 1RM, PRs, selectable time ranges.
- **Streaks & achievements** — rest-day-aware streak policy, monthly consistency calendar, unlockable achievement badges.
- **Profile** — personal metrics, goals, preferred training days, KG/LB units, JSON export/import, reset and clear actions.

## Tech stack

- React 19 + TypeScript
- Vite 7
- Tailwind CSS 4
- Framer Motion
- Recharts
- Lucide React
- Zustand (persisted to `localStorage` under `gymix-store-v1`)
- Vite PWA + Workbox (installable app shell, controlled updates)

All data is stored locally in the browser. No backend or account is required; use **Profile → Export backup** to move data between devices.

## Getting started

```bash
npm install
npm run dev
```

Open `http://localhost:5173/gymix/` (the Vite base path matches GitHub Pages).

Production build:

```bash
npm run build
npm run preview
```

> On Windows PowerShell, use `npm.cmd` if `npm.ps1` is blocked by execution policy.

## Assets

Anatomical muscle paths in `src/assets/anatomy/` are derived from the MIT-licensed `react-native-body-highlighter` artwork; attribution is in `src/assets/anatomy/LICENSE`. Exercise and achievement visuals are locally authored SVG components in `src/components/visual/`. No external image URLs are used.

## Project structure

```
src/
  assets/anatomy/     licensed anatomical SVG path data
  components/
    charts/           Recharts visualizations
    layout/           app shell and navigation
    pwa/              update prompt and offline status
    ui/               buttons, cards, modals, toasts, controls
    visual/           anatomy, exercise and achievement artwork
  data/               exercise database, routines, seed data
  lib/                stats, streaks, achievements, utilities
  screens/            Home, Workout, Muscles, Progress, Profile
  store/              persisted Zustand store
```

## PWA

GYMIX is a production-ready installable PWA built with `vite-plugin-pwa` and Workbox.

- Manifest: name `GYMIX — Smart Workout Tracker`, short name `GYMIX`, `standalone` display, portrait orientation.
- Brand colors: `#101110` background/theme, `#C6F36A` accent.
- Icons generated from `public/favicon.svg`: `gymix-192.png`, `gymix-512.png`, `gymix-maskable-512.png`, and `apple-touch-icon.png`.
- App shell, anatomy JSON, icons and hashed JS/CSS are precached with Workbox.
- Google Fonts stylesheets/files and local images use bounded runtime caches.
- No API responses, auth tokens, or personal data are cached by the service worker.
- Zustand data remains in `localStorage` under `gymix-store-v1`; updates never clear it.
- Safe-area insets, `100dvh`, 16px iOS form fields, and bottom-sheet adjustments are applied for iPhone.

### GitHub Pages deployment

The production base path is `/gymix/`. `.github/workflows/deploy.yml` builds and deploys `dist/` on every push to `main`.

One-time repository setup:

1. Go to **Settings → Pages → Build and deployment**.
2. Set **Source** to **GitHub Actions**.
3. Push to `main` (or run the **Deploy GYMIX to GitHub Pages** workflow manually).

Live URL: **https://miyukigit.github.io/gymix/**

### Install on iPhone 17

No Apple Developer account, MacBook, or Xcode is required.

1. Open **https://miyukigit.github.io/gymix/** in **Safari**.
2. Tap the **Share** button.
3. Tap **Add to Home Screen**.
4. Confirm the name **GYMIX**, then tap **Add**.
5. Open the new **GYMIX** icon; it launches without the Safari UI.

### Updates

When a new GitHub Pages deployment is available, the service worker downloads it in the background and shows a GYMIX-themed **Update ready** card. Tap **Update now** to activate and refresh safely, or **Later** to postpone.

Updates are deferred while an active workout is in progress or while a form field is focused, so unsaved input and training sessions are not interrupted. A guard prevents repeated update/refresh loops.

iOS limitations: background service-worker update checks are controlled by Safari/iOS. Checks happen while GYMIX is open, on return to the foreground, and on connectivity changes; iOS may delay background updates. There is no background sync or push notification in this implementation.

### Offline support

Previously cached screens, icons, styles, scripts, anatomy data and locally saved workouts work offline. All workout/exercise/progress data is local-first and remains available from `localStorage`. Google Fonts fall back to system fonts if they are unavailable. There is no backend, login, or private API to cache.

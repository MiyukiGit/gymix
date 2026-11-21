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

All data is stored locally in the browser. No backend or account is required; use **Profile → Export backup** to move data between devices.

## Getting started

```bash
npm install
npm run dev
```

Open `http://localhost:5173/`.

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
    ui/               buttons, cards, modals, toasts, controls
    visual/           anatomy, exercise and achievement artwork
  data/               exercise database, routines, seed data
  lib/                stats, streaks, achievements, utilities
  screens/            Home, Workout, Muscles, Progress, Profile
  store/              persisted Zustand store
```

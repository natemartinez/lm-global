# Tech Care Dashboard

A responsive medical dashboard built with React, TypeScript, Vite, and Chart.js.

## Architecture & Design Decisions

### Guiding Principles

This project was built following four core engineering principles:

1. **Types over Comments** — TypeScript interfaces in [`src/types.ts`](src/types.ts) enforce data contracts at compile time. The `PatientData`, `DiagnosisHistoryEntry`, and `BloodPressureReading` types ensure every component receives correctly shaped data without runtime validation.

2. **Separation of Concerns** — Each layer has a single responsibility:
   - [`src/services/api.js`](src/services/api.js) — Data fetching only
   - [`src/components/dashboard/`](src/components/dashboard/) — UI rendering only
   - [`src/types.ts`](src/types.ts) — Type definitions only
   - [`server/server.ts`](server/server.ts) — API proxy only

3. **Feature Encapsulation** — Components are organized by feature (`dashboard/`, `layout/`, `common/`), not by technical role. Each feature directory contains its component, CSS module, and any feature-specific logic.

4. **Pragmatic Abstraction** — The [`RetinaImage`](src/components/common/RetinaImage.jsx) component was created only after we had multiple use-cases (nav icons, profile avatars, metric icons). It handles both local Vite assets and external API URLs with automatic `@2x` srcSet generation.

### Development Workflow

The build process followed an iterative, feedback-driven cycle:

1. **Asset Strategy** — Evaluated `src/assets/` vs `public/` for icon storage. Chose `src/assets/` with Vite's `@assets` alias for cache-busting and type-safe imports.

2. **Retina/HiDPI Support** — Discovered `@2x` variants in the asset directory. Implemented `<img srcSet>` via the [`RetinaImage`](src/components/common/RetinaImage.jsx) component, which auto-derives the `@2x` path from the 1x import. Includes an `isExternalUrl` guard to avoid breaking API-sourced profile pictures.

3. **Icon Rendering** — Initially used PNG icons, but their light gray (`#e0e4e6`) color made them invisible on `#F6F7F8` circle backgrounds. Migrated to inline SVGs with `#072635` fill for guaranteed contrast. The phone icon went through three iterations (smartphone → broken CSS filter → Lucide telephone handset) to match the design spec.

4. **Typography Alignment** — Imported Manrope via Google Fonts. Adjusted font weights (500 for nav, 700 for active nav, 800 for BP values), colors (`#707070` for secondary text, `#8c8c8c` for metadata), and sizes (13px for chart axes, 22px for BP values, 14px for detail labels).

5. **Responsive Layout** — Evolved from hardcoded flex-basis widths to a CSS Grid system with four breakpoints:
   - **Desktop** (>1024px): 3-column grid (`320px 1fr 360px`)
   - **Tablet** (≤1024px): Single column, reordered via `grid-row` (Profile → Diagnosis → PatientList)
   - **Mobile** (≤768px): Compact header with hidden profile text
   - **Mobile Web-App** (≤576px): Fixed bottom navigation bar

6. **Header Architecture** — Refactored to a three-zone flex layout (`space-between`):
   - **Strategy A** (≤992px): Icon-only navigation, labels hidden
   - **Strategy 1** (≤576px): Nav becomes fixed bottom bar with column-direction items

7. **Blood Pressure Chart** — Restructured from a single-column layout to a 2-column flex layout (chart `flex: 2`, vitals `flex: 1`) with `#F4F0FA` background per the design blueprint. The range dropdown was moved inside the chart container with a transparent background.

8. **Production Audit** — Final pass identified and fixed 6 issues: unused imports, redundant client-side auth credentials, non-semantic HTML elements, and dead CSS from the flex-to-grid migration.

## Project Structure

```
src/
├── assets/              # PNG icons with @2x Retina variants
├── components/
│   ├── common/          # Reusable: RetinaImage, Loader
│   ├── dashboard/       # Feature: PatientList, DiagnosisView, PatientProfile, BloodPressureChart
│   └── layout/          # Layout: Header, Layout wrapper
├── services/            # API client
├── styles/              # Global CSS, custom properties
├── types.ts             # TypeScript interfaces
├── App.jsx              # Root component with lazy loading
└── main.jsx             # Entry point
server/                  # Express proxy for upstream API
```

## Getting Started

```bash
# Install dependencies
npm install

# Start both the API proxy and dev server
npm run dev:all

# Or start them separately:
npm run server   # Express proxy on :3001
npm run dev      # Vite dev server on :3000
```

## Build

```bash
npm run build    # Production build to dist/
npm run preview  # Preview production build
```

## Tech Stack

- **React 19** with lazy loading for code splitting
- **TypeScript** for type safety
- **Vite 8** for fast builds and HMR
- **Chart.js + react-chartjs-2** for blood pressure visualization
- **Express** proxy server for API authentication
- **CSS Modules** for scoped, maintainable styles

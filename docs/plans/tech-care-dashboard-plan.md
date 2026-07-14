# Tech Care Dashboard — Implementation Plan

## Overview

Transform the existing React boilerplate into a **Tech Care Dashboard** — a responsive, single-page medical dashboard application. The blueprint specifies a three-column flexbox layout with CSS Grid for diagnosis metrics, lazy-loaded components via React Suspense, semantic HTML for accessibility, and a mock Express backend.

---

## Architecture Diagram

```mermaid
flowchart TD
    subgraph Frontend [React App - Vite on port 3000]
        App[App.tsx - Router & Data Fetching]
        Layout[DashboardLayout]
        Header[Header Component]
        LeftAside[PatientList - Lazy Loaded]
        Center[DiagnosisView - Lazy Loaded]
        RightAside[PatientProfile - Lazy Loaded]
        
        App --> Layout
        Layout --> Header
        Layout --> LeftAside
        Layout --> Center
        Layout --> RightAside
    end

    subgraph Backend [Express Mock API on port 3001]
        API[/api/dashboard Endpoint]
        API --> MockData[Mock DashboardResponse JSON]
    end

    App -- fetch /api/dashboard --> API
```

---

## File Structure Changes

```
src/
├── types.ts                          # NEW - TypeScript interfaces
├── main.jsx                          # MODIFY - Remove BrowserRouter, single-page app
├── App.jsx                           # REWRITE - Dashboard app with data fetching
├── App.css                           # NEW - Dashboard-specific styles
├── components/
│   ├── dashboard/
│   │   ├── PatientList.jsx           # NEW - Patient roster with search
│   │   ├── PatientList.module.css    # NEW
│   │   ├── DiagnosisView.jsx         # NEW - Chart placeholder + metrics grid + table
│   │   ├── DiagnosisView.module.css  # NEW
│   │   ├── PatientProfile.jsx        # NEW - Patient info + lab results
│   │   └── PatientProfile.module.css # NEW
│   ├── layout/
│   │   ├── Header.jsx                # REWRITE - Dashboard header (brand, nav, profile)
│   │   ├── Header.module.css         # REWRITE
│   │   ├── Layout.jsx                # REWRITE - Dashboard 3-column layout
│   │   └── Layout.module.css         # REWRITE
│   └── common/
│       └── Loader.jsx                # REUSE - Already exists
├── styles/
│   └── global.css                    # MODIFY - Add dashboard CSS variables
server/
├── tsconfig.json                     # NEW - TypeScript config for server
├── server.ts                         # NEW - Express mock API
└── package.json                      # NEW - Server dependencies
index.html                            # MODIFY - Update title & meta
package.json                          # MODIFY - Add server script + dependencies
```

---

## Implementation Steps

### Step 1: Install Dependencies

- Add `express`, `cors`, `tsx`, `typescript`, `@types/express`, `@types/cors`, `concurrently` to the project.
- The blueprint uses TypeScript for the server; we'll use `tsx` to run it directly.

### Step 2: Create TypeScript Interfaces (`src/types.ts`)

- Define `PatientData` interface: `id`, `name`, `gender`, `age`
- Define `DashboardResponse` interface: `patients`, `diagnosisHistory`, `diagnosticList`, `labResults`

### Step 3: Create Mock Express Backend (`server/`)

- Create `server/server.ts` with a single `GET /api/dashboard` endpoint returning mock `DashboardResponse`
- Use placeholder text values as specified in the blueprint (e.g., `[Patient Name]`, `[Value]`)
- Run on port 3001 with CORS enabled

### Step 4: Update `index.html`

- Change title to "Tech Care Dashboard"
- Update meta description

### Step 5: Rewrite Global Styles (`src/styles/global.css`)

- Add dashboard-specific CSS variables (brand colors: `#01F0D0`, background `#f6f7f9`)
- Keep base reset but adapt for dashboard look

### Step 6: Rewrite Header Component

- Three sections: Brand (left), Navigation (center), Provider profile (right)
- Nav items: Overview, Patients (active), Schedule, Message, Transactions
- Pill-shaped header with `border-radius: 4rem`
- Active nav item uses brand color `#01F0D0`

### Step 7: Rewrite Layout Component

- Three-column flexbox layout: `sidebar-left` (280px), `main-content` (flex: 1), `sidebar-right` (320px)
- Responsive: wraps to single column at 1024px
- Remove Footer (not in blueprint) or keep minimal

### Step 8: Create Dashboard Components

#### 8a. `PatientList` (Left Column)
- Search input for filtering patients
- List of patients with avatar circle placeholder and name/gender/age
- Flexbox for alignment

#### 8b. `DiagnosisView` (Center Column)
- **Diagnosis History** section with chart placeholder
- **CSS Grid metrics** (3-column): Respiratory Rate, Temperature, Heart Rate cards
- **Diagnostic List** table: Problem/Diagnosis, Description, Status columns

#### 8c. `PatientProfile` (Right Column)
- Patient demographic info (name, gender, age, contact placeholders)
- **Lab Results** list with downloadable report links

### Step 9: Rewrite `App.jsx`

- Remove React Router (single-page dashboard)
- Fetch data from `http://localhost:3001/api/dashboard` on mount
- Use `React.Suspense` + `lazy()` for the three main dashboard components
- Show loading state while fetching
- Render the three-column layout with lazy-loaded components

### Step 10: Update `main.jsx`

- Remove `BrowserRouter` wrapper (no routing needed)
- Keep `StrictMode`

### Step 11: Create `App.css`

- Dashboard-specific styles: header, layout columns, cards, metrics grid, table, responsive breakpoints
- Follow the blueprint's CSS exactly

### Step 12: Add npm Scripts

- `"server"` script to run the Express mock API
- `"dev:all"` script using `concurrently` to run both Vite dev server and Express server

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Single-page app (no router)** | Blueprint shows a single dashboard view; no navigation between pages needed |
| **CSS Modules for component styles + App.css for layout** | Boilerplate already uses CSS Modules; layout-level styles in App.css per blueprint |
| **TypeScript for server only** | Blueprint specifies `server.ts`; frontend stays JSX to minimize boilerplate changes |
| **Lazy loading via React.lazy + Suspense** | Blueprint explicitly requires this for performance |
| **Placeholder text, no real graphics** | Blueprint constraint: no specific numbers, logos, or graphics |
| **Semantic HTML + ARIA** | Blueprint requires `<nav>`, `<main>`, `<aside>`, `<article>`, `<section>`, and aria-labels |
| **Express on port 3001, Vite on port 3000** | Avoids port conflicts; CORS enabled on Express |

---

## Accessibility Checklist

- [ ] `<nav>` with `aria-label="Main Navigation"` for header nav
- [ ] `<main>` with `role="main"` for center content
- [ ] `<aside>` with `aria-label` for side columns
- [ ] `<article>` for each metric card
- [ ] `<section>` for content groupings
- [ ] `aria-live="polite"` on loading states
- [ ] `scope="col"` on table headers
- [ ] `aria-label` on chart placeholder
- [ ] Semantic heading hierarchy (h2, h3)

---

## Responsive Behavior

- **Desktop (>1024px)**: Three-column layout with fixed-width sidebars
- **Tablet/Mobile (<1024px)**: Single column stack; metrics grid becomes 1-column
- Header nav may need horizontal scroll on very small screens

---

## Files to Create

1. `src/types.ts`
2. `src/App.css`
3. `src/components/dashboard/PatientList.jsx`
4. `src/components/dashboard/PatientList.module.css`
5. `src/components/dashboard/DiagnosisView.jsx`
6. `src/components/dashboard/DiagnosisView.module.css`
7. `src/components/dashboard/PatientProfile.jsx`
8. `src/components/dashboard/PatientProfile.module.css`
9. `server/server.ts`
10. `server/tsconfig.json`

## Files to Modify

1. `package.json` — add dependencies and scripts
2. `index.html` — update title/meta
3. `src/main.jsx` — remove BrowserRouter
4. `src/App.jsx` — rewrite as dashboard
5. `src/styles/global.css` — add dashboard CSS variables
6. `src/components/layout/Header.jsx` — rewrite
7. `src/components/layout/Header.module.css` — rewrite
8. `src/components/layout/Layout.jsx` — rewrite
9. `src/components/layout/Layout.module.css` — rewrite

## Files to Remove (no longer needed)

1. `src/pages/Home.jsx` + `Home.module.css`
2. `src/pages/About.jsx` + `About.module.css`
3. `src/pages/NotFound.jsx` + `NotFound.module.css`
4. `src/components/layout/Footer.jsx` + `Footer.module.css`
5. `src/components/common/Button.jsx` + `Button.module.css`

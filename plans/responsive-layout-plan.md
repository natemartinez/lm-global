# Responsive Layout Plan

## Current Architecture Audit

### Hardcoded Widths Found

| File | Selector | Issue |
|------|----------|-------|
| `src/App.css` | `.sidebar-left` | `flex: 0 0 280px` — rigid width, won't shrink |
| `src/App.css` | `.sidebar-right` | `flex: 0 0 320px` — rigid width, won't shrink |
| `src/components/dashboard/PatientList.module.css` | `.container` | `flex: 0 0 280px` + `max-height: calc(100vh - 8rem)` — duplicates sidebar-left sizing |
| `src/components/dashboard/PatientProfile.module.css` | `.container` | `flex: 0 0 320px` — duplicates sidebar-right sizing |
| `src/components/layout/Layout.module.css` | `.dashboardLayout` | `display: flex; gap: 1.5rem` — no grid, no min-width:0 |

### Current Layout Flow

```
Layout.module.css (.dashboardLayout)
  └── display: flex (children float)
       ├── App.css (.sidebar-left) flex: 0 0 280px
       │    └── PatientList.container flex: 0 0 280px
       ├── App.css (.main-content) flex: 1
       │    └── DiagnosisView
       │         └── BloodPressureChart (2-col flex inside)
       └── App.css (.sidebar-right) flex: 0 0 320px
            └── PatientProfile.container flex: 0 0 320px
```

### Problems
1. **Double flex-basis**: Both `App.css` sidebar classes AND the inner component containers set `flex: 0 0 Xpx` — redundant and conflicting
2. **No `min-width: 0` on flex children**: Chart canvas and long text prevent flex items from shrinking below content width
3. **Only one breakpoint**: `768px` collapses to single column — no tablet (1024px) 2-column layout
4. **Header nav has no wrap**: On narrow screens, nav items will overflow
5. **BloodPressureChart 2-col layout**: The chart + vitals summary has no responsive behavior

---

## Proposed Solution

### 1. Convert `.dashboardLayout` to CSS Grid

Replace `display: flex` with `display: grid` and explicit column tracks.

```css
/* Layout.module.css */
.dashboardLayout {
  display: grid;
  grid-template-columns: 260px 1fr 360px;
  gap: 1.5rem;
  flex: 1;
  min-width: 0;  /* CRITICAL: prevents grid overflow */
}

/* Tablet: drop right sidebar below */
@media (max-width: 1024px) {
  .dashboardLayout {
    grid-template-columns: 240px 1fr;
  }
  /* Right sidebar spans full width in second row */
  .dashboardLayout > :nth-child(3) {
    grid-column: 1 / -1;
  }
}

/* Mobile: single column */
@media (max-width: 768px) {
  .dashboardLayout {
    grid-template-columns: 1fr;
  }
  .dashboardLayout > :nth-child(3) {
    grid-column: 1;
  }
}
```

### 2. Clean Up App.css

Remove the `flex: 0 0` from sidebar classes since the grid now controls sizing. Keep `min-width: 0` on `.main-content`.

```css
/* App.css */
.sidebar-left,
.sidebar-right {
  /* Grid handles sizing — no flex-basis needed */
  min-width: 0;
}

.main-content {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
```

### 3. Remove Duplicate flex-basis from Components

**PatientList.module.css**: Remove `flex: 0 0 280px` from `.container` — grid handles it. Keep `max-height` for scroll.

**PatientProfile.module.css**: Remove `flex: 0 0 320px` from `.container` — grid handles it.

### 4. Add `min-width: 0` to All Grid Children

This is the critical fix that prevents chart canvases and long text from overflowing grid tracks.

```css
/* Applied to all three columns */
.sidebar-left,
.sidebar-right,
.main-content {
  min-width: 0;
}
```

### 5. Header Nav — Add flex-wrap

```css
/* Header.module.css */
.navList {
  flex-wrap: wrap;
  justify-content: center;
}

@media (max-width: 768px) {
  .header {
    flex-wrap: wrap;
    gap: 0.75rem;
  }
  .profile {
    margin-left: auto;
  }
}
```

### 6. BloodPressureChart — Responsive 2-col → Stack

The chart currently uses `display: flex` with `flex: 2` (chart) and `flex: 1` (vitals). Add a media query to stack them.

Since the chart uses inline styles, we need to either:
- **Option A**: Add a CSS class-based media query in a module CSS file
- **Option B**: Use a `useEffect`/`useMediaQuery` hook to switch inline styles

**Recommendation: Option A** — Create a simple CSS module or add a className.

```css
/* New: BloodPressureChart.module.css or inline in DiagnosisView.module.css */
.bpCard {
  display: flex;
  background-color: #F4F0FA;
  border-radius: 16px;
  padding: 24px;
  gap: 32px;
  font-family: 'Manrope', 'Inter', sans-serif;
}

@media (max-width: 1024px) {
  .bpCard {
    flex-direction: column;
  }
}
```

Then reference this class in BloodPressureChart.tsx instead of inline styles.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/layout/Layout.module.css` | Convert to CSS Grid with 3 breakpoints |
| `src/App.css` | Remove flex-basis, add min-width:0 |
| `src/components/dashboard/PatientList.module.css` | Remove `flex: 0 0 280px` from `.container` |
| `src/components/dashboard/PatientProfile.module.css` | Remove `flex: 0 0 320px` from `.container` |
| `src/components/layout/Header.module.css` | Add `flex-wrap` to nav, responsive wrap for header |
| `src/components/dashboard/BloodPressureChart.tsx` | Use CSS class instead of inline styles for outer container, add responsive stack |

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/dashboard/BloodPressureChart.module.css` | CSS module for the BP card with responsive breakpoint |

---

## Responsive Behavior Summary

| Viewport | Layout | BP Chart |
|----------|--------|----------|
| > 1024px (desktop) | 3 columns: 260px \| 1fr \| 360px | Chart left, vitals right |
| 769–1024px (tablet) | 2 columns: 240px \| 1fr, right sidebar below | Vitals stack below chart |
| ≤ 768px (mobile) | 1 column: 1fr | Vitals stack below chart |

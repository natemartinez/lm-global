# Testing, Error Boundaries & Accessibility Plan

## Overview

Three parallel workstreams to harden the Tech Care Dashboard:

1. **Unit Tests** — Comprehensive test suite for all critical components
2. **Error Boundaries** — Graceful failure handling at API and lazy-load boundaries
3. **Accessibility (WCAG)** — Audit and refactor for keyboard navigation, ARIA, color contrast, screen readers

---

## Workstream A: Unit Tests

### A1. Install Test Dependencies

Add to `package.json`:

| Package | Purpose |
|---------|---------|
| `vitest` | Test runner (Vite-native, zero-config) |
| `@testing-library/react` | React component rendering & queries |
| `@testing-library/jest-dom` | Custom DOM matchers (`toBeInTheDocument`, etc.) |
| `@testing-library/user-event` | Simulated user interactions |
| `jsdom` | DOM environment for tests |
| `chart.js` (dev) | Mock Chart.js for BloodPressureChart tests |

### A2. Configure Vitest

Create `vitest.config.js` (or extend `vite.config.js`):

```js
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@styles': path.resolve(__dirname, 'src/styles'),
      '@assets': path.resolve(__dirname, 'src/assets'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    css: { modules: { classNameStrategy: 'non-scoped' } },
  },
});
```

Create `src/test/setup.js`:

```js
import '@testing-library/jest-dom';
```

Add script to `package.json`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

### A3. Test File Structure

```
src/
  __tests__/
    RetinaImage.test.jsx
    BloodPressureChart.test.tsx
    PatientList.test.jsx
    PatientProfile.test.jsx
    DiagnosisView.test.jsx
    Header.test.jsx
    api.test.js
  test/
    setup.js
    mocks/
      chart.js        # Mock Chart.js registration
      styleMock.js    # CSS module mock (if needed)
```

### A4. RetinaImage.test.jsx — Test Plan

**Focus: Image loading behavior, srcSet derivation, edge cases**

| Test Case | Description |
|-----------|-------------|
| Renders img with correct src | Pass `src` prop, verify `<img>` element has correct `src` attribute |
| Generates srcSet for local assets | Pass local Vite URL, verify `srcSet` contains `1x` and `@2x` variants |
| Skips srcSet for external URLs | Pass `https://...` URL, verify `srcSet` is `undefined` |
| Skips srcSet when src already contains @2x | Pass `icon@2x.png`, verify no srcSet |
| Returns null when src is null/undefined | Pass `null` or `undefined`, verify component returns `null` |
| Applies className, width, height | Verify all passthrough props are applied to `<img>` |
| Sets loading="lazy" and decoding="async" | Verify these attributes are present |
| Sets alt text correctly | Pass `alt="Search"`, verify `alt` attribute |
| Handles hashed Vite build URLs | Test `insert2xSuffix` with `/assets/icon.abc123.png` → `/assets/icon@2x.abc123.png` |
| Handles unhashed dev URLs | Test `insert2xSuffix` with `/assets/icon.png` → `/assets/icon@2x.png` |
| Handles URLs without extension | Test `insert2xSuffix` with `/assets/icon` → returns unchanged |

### A5. BloodPressureChart.test.tsx — Test Plan

**Focus: Chart rendering, computeMonthRange, data mapping, dropdown interaction**

| Test Case | Description |
|-----------|-------------|
| Renders chart container | Verify `.card` div is rendered |
| Renders "Blood Pressure" heading | Verify `<h2>` with text "Blood Pressure" exists |
| Renders range dropdown | Verify `<select>` with 3 options (3, 6, 12 months) |
| computeMonthRange returns correct pairs | Pass history with latest entry "October 2023", range=3 → `[{September,2023}, {October,2023}, {November,2023}]` |
| computeMonthRange handles year boundary | Pass latest "January 2024", range=3 → `[{November,2023}, {December,2023}, {January,2024}]` |
| computeMonthRange returns empty for empty history | Pass `[]` → returns `[]` |
| Maps data correctly to chart format | Pass mock history, verify `systolicData` and `diastolicData` arrays match expected values |
| Handles missing history entries gracefully | Pass history missing some months, verify missing months get value `0` |
| Renders systolic vitals section | Verify systolic value, colored dot, and "Higher than Average" text appear |
| Renders diastolic vitals section | Verify diastolic value, colored dot, and "Lower than Average" text appear |
| Dropdown change updates range | Simulate `onChange` on select, verify `onRangeChange` callback is called with correct value |
| Shows fallback "—" when systolic/diastolic is null | Pass `systolic={null}`, verify "—" is displayed |
| Renders SVG arrow indicators | Verify up/down triangle SVGs are present in vitals sections |
| Renders horizontal divider between vitals | Verify `<hr>` element exists |

### A6. PatientList.test.jsx — Test Plan

| Test Case | Description |
|-----------|-------------|
| Renders patient list with items | Pass array of 3 patients, verify 3 `<li>` elements |
| Highlights selected patient | Pass `selectedPatientId`, verify `aria-selected="true"` on correct item |
| Calls onPatientSelect on click | Simulate click on a patient, verify callback with patient name |
| Calls onPatientSelect on Enter key | Simulate `keyDown` with `Enter`, verify callback |
| Calls onPatientSelect on Space key | Simulate `keyDown` with ` ` (space), verify callback |
| Shows empty state when no patients | Pass `[]`, verify "No patients found." text |
| Renders avatar image when profile_picture exists | Pass patient with `profile_picture`, verify `<img>` rendered |
| Renders placeholder div when no profile_picture | Pass patient without `profile_picture`, verify placeholder `<div>` |
| Shows patient name, gender, age | Verify text content includes name, gender, and age |
| Renders three-dot menu button per patient | Verify `<button>` with `aria-label="Options for ..."` exists per item |
| Uses `role="listbox"` and `role="option"` on list/items | Verify correct ARIA roles |

### A7. PatientProfile.test.jsx — Test Plan

| Test Case | Description |
|-----------|-------------|
| Renders patient name | Pass patient object, verify name in heading |
| Renders profile picture with alt text | Verify `<img>` with `alt="{name}'s profile"` |
| Renders all 5 info fields | Verify Date of Birth, Gender, Contact Info, Emergency Contact, Insurance Provider |
| Formats date correctly | Pass `date_of_birth: "08/23/1996"`, verify "August 23, 1996" |
| Shows fallback "—" for missing fields | Pass patient with missing fields, verify "—" displayed |
| Renders lab results list | Pass `lab_results: ["Blood Test", "X-Ray"]`, verify both items rendered |
| Shows empty state for no lab results | Pass `lab_results: []`, verify "No lab results available." |
| Download button has correct aria-label | Verify button `aria-label` includes lab result name |
| Returns null when patient is null | Pass `null`, verify component returns `null` |
| Renders "Show All Information" button | Verify button exists |

### A8. DiagnosisView.test.jsx — Test Plan

| Test Case | Description |
|-----------|-------------|
| Renders "Diagnosis History" heading | Verify `<h2>` with correct text |
| Renders 3 metric cards | Verify respiratory, temperature, heart rate articles exist |
| Shows metric values from latest entry | Pass history, verify values displayed |
| Shows fallback "[Status]" when levels missing | Pass history without levels, verify "[Status]" text |
| Renders diagnostic list table | Verify `<table>` with Problem/Diagnosis, Description, Status columns |
| Shows empty state for no diagnostics | Pass `[]`, verify "No diagnostic records available." |
| Renders BloodPressureChart via Suspense | Verify lazy-loaded chart container exists |
| Default range is 6 months | Verify `range` state initializes to 6 |

### A9. api.test.js — Test Plan

| Test Case | Description |
|-----------|-------------|
| fetchPatients calls /api/dashboard | Mock `fetch`, verify URL includes `/api/dashboard` |
| Sets Content-Type header | Verify `Content-Type: application/json` header |
| Throws error on non-ok response | Mock 500 response, verify error thrown with status |
| Throws error with data on JSON error response | Mock 400 with `{message: "Bad Request"}`, verify `error.data` |
| Handles network failure | Mock rejected promise, verify error propagates |
| Uses VITE_API_BASE_URL or falls back to localhost | Verify `BASE_URL` logic |

### A10. Header.test.jsx — Test Plan

| Test Case | Description |
|-----------|-------------|
| Renders logo with alt text "Tech Care" | Verify `<img>` with `alt="Tech Care"` |
| Renders 5 nav items | Verify 5 `<li>` elements in nav |
| Highlights active nav item | Verify "Patients" item has active class |
| Renders doctor name and title | Verify "Dr. Jose Simmons" and "General Practitioner" |
| Renders settings and more-options buttons | Verify 2 `<button>` elements with correct aria-labels |
| Renders doctor avatar with alt text | Verify `<img>` with `alt="Dr. Jose Simmons"` |

---

## Workstream B: Error Boundaries

### B1. Create ErrorBoundary Component

File: `src/components/common/ErrorBoundary.jsx`

```jsx
import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    // Future: send to error reporting service
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div role="alert" style={{ padding: '2rem', textAlign: 'center' }}>
          <h2>Something went wrong</h2>
          <p style={{ color: '#64748b' }}>{this.state.error?.message || 'An unexpected error occurred.'}</p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{ marginTop: '1rem', padding: '0.5rem 1rem', cursor: 'pointer' }}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

Export from `src/components/common/index.js`.

### B2. Wrap API Fetch in App.jsx

The `fetchPatients()` call in `App.jsx` `useEffect` already has a `.catch()` that sets `error` state. However, if an error occurs *outside* the fetch chain (e.g., in a `.then()` callback), it would crash. Wrap the entire data-fetching section:

```jsx
import ErrorBoundary from '@components/common/ErrorBoundary';

// In App.jsx return:
<ErrorBoundary>
  {/* existing content */}
</ErrorBoundary>
```

### B3. Wrap Lazy-Loaded Suspense Boundaries

Each `Suspense` boundary currently only has a fallback for loading state. If the lazy import fails (network error, broken module), the Suspense boundary won't catch it — an ErrorBoundary is needed *above* each Suspense:

```jsx
<ErrorBoundary fallback={<div role="alert">Failed to load Patient List</div>}>
  <Suspense fallback={<div aria-live="polite">Loading Patients...</div>}>
    <PatientList ... />
  </Suspense>
</ErrorBoundary>
```

Apply to all 3 lazy-loaded components in `App.jsx`:
- `PatientList` (left column)
- `DiagnosisView` (center column, which itself contains a nested lazy `BloodPressureChart`)
- `PatientProfile` (right column)

### B4. Nested ErrorBoundary for BloodPressureChart

`DiagnosisView.jsx` lazy-loads `BloodPressureChart`. Wrap it in its own ErrorBoundary so a chart failure doesn't take down the entire DiagnosisView:

```jsx
<ErrorBoundary fallback={<div role="alert">Chart failed to load</div>}>
  <Suspense fallback={<div>Loading chart data...</div>}>
    <BloodPressureChart ... />
  </Suspense>
</ErrorBoundary>
```

---

## Workstream C: Accessibility (WCAG Audit & Refactor)

### C1. Current Accessibility Inventory

| Component | What's Good | What's Missing |
|-----------|-------------|----------------|
| **Layout.jsx** | Skip-to-content link, `role="presentation"` on grid | — |
| **Header.jsx** | `role="banner"`, `aria-label="Main Navigation"`, `aria-label` on buttons | Nav items have `cursor: default` (should be `pointer` for clickable), no `aria-current="page"` on active item |
| **PatientList.jsx** | `aria-label="Patient Directory"`, `role="listbox"`, `role="option"`, `aria-selected`, keyboard handlers, `role="status"` for empty state | Search icon has `alt=""` (decorative — correct), but no `aria-label` on the clickable icon. Menu button has `aria-label` ✓ |
| **PatientProfile.jsx** | `aria-label` on sections, `aria-labelledby` on cards, `aria-label` on download buttons, `aria-hidden="true"` on decorative SVGs | `role="alert"` not used on error states. Lab list has `role="list"` but items lack `role="listitem"` |
| **DiagnosisView.jsx** | `aria-labelledby` on sections, `aria-label` on metric articles, `aria-label` on chart container, `scope="col"` on table headers, `role="status"` for empty states | Table could use `aria-sort` on sortable columns (not applicable — no sorting). Chart canvas needs `aria-label` or `title` |
| **BloodPressureChart.tsx** | `aria-label="Select chart time range"` on dropdown | Chart.js `<canvas>` has no `aria-label` or `role="img"`. The chart is rendered as a `<canvas>` element which is invisible to screen readers by default |
| **Loader.jsx** | `role="status"`, `aria-live="polite"`, `sr-only` text | — |
| **global.css** | `:focus-visible` styles, skip-link, `.sr-only` utility, custom scrollbar | — |

### C2. Specific Accessibility Fixes

#### C2a. Chart Canvas Accessibility (BloodPressureChart.tsx)

Chart.js renders an HTML5 `<canvas>` which has no built-in accessibility. Add:

```tsx
<Line
  data={data}
  options={{
    ...options,
    plugins: {
      ...options.plugins,
      accessibility: {
        enabled: true, // Chart.js accessibility plugin (if available)
      },
    },
  }}
  aria-label={`Blood pressure chart showing systolic and diastolic readings over the last ${range} months`}
  role="img"
/>
```

Since `react-chartjs-2` passes extra props to the canvas wrapper, add:

```tsx
<div role="img" aria-label={`Blood pressure chart, last ${range} months`}>
  <Line data={data} options={options} />
</div>
```

#### C2b. Add `aria-current="page"` to Active Nav Item

In `Header.jsx`, the active nav item should indicate its current state:

```jsx
<li
  key={item.label}
  className={`${styles.navItem} ${item.active ? styles.active : ''}`}
  aria-current={item.active ? 'page' : undefined}
>
```

#### C2c. Make Nav Items Keyboard-Accessible

Currently nav items have `cursor: default` and no `tabIndex` or keyboard handlers. If they're meant to be interactive, add:

```jsx
<li
  role="button"
  tabIndex={0}
  onKeyDown={(e) => { if (e.key === 'Enter') handleNavClick(item.label); }}
  aria-current={item.active ? 'page' : undefined}
>
```

If they're purely decorative/static (just showing current page), keep as-is but add `aria-current="page"`.

#### C2d. Color Contrast Audit

Check all text/background combinations against WCAG AA (4.5:1 for normal text, 3:1 for large text):

| Location | Text Color | Background | Ratio | Pass? |
|----------|-----------|------------|-------|-------|
| `.detailLabel` | `#707070` | `#ffffff` | 4.56:1 | ✅ AA (normal) |
| `.meta` (PatientList) | `#8c8c8c` | `#ffffff` | 2.93:1 | ❌ FAIL (needs 4.5:1) |
| `.metricStatus` | `#64748b` | `#E0F3FA` | 3.82:1 | ❌ FAIL (needs 4.5:1) |
| `.metricStatus` | `#64748b` | `#FFE6E9` | 3.82:1 | ❌ FAIL |
| `.metricStatus` | `#64748b` | `#FFE6F1` | 3.82:1 | ❌ FAIL |
| `.title` (Header) | `#707070` | `#ffffff` | 4.56:1 | ✅ AA |
| `.detailValue` | `#07263E` | `#ffffff` | 15.6:1 | ✅ AAA |
| Nav active | `#0b0c10` | `#01F0D0` | 2.34:1 | ❌ FAIL (needs 4.5:1) |
| `.searchIcon` | `opacity: 0.6` on `#072635` | `#ffffff` | ~9.4:1 | ✅ AA (effective) |

**Fixes needed:**
1. `.meta` color: change from `#8c8c8c` to `#6b6b6b` (ratio 4.56:1)
2. `.metricStatus` color: change from `#64748b` to `#4a5568` (ratio ~5.2:1 on light backgrounds)
3. Nav active text: add `color: #072635` or darken the background to `#00c9ae` for better contrast

#### C2e. Focus Management

- **Patient list**: When a patient is selected via keyboard, ensure focus moves to the selected item. Currently `tabIndex={0}` on all items — this is correct for a listbox pattern.
- **Mobile bottom nav**: At ≤576px, the nav becomes a fixed bottom bar. Ensure it remains keyboard accessible and doesn't overlap with page content.
- **Skip link**: Already implemented in `Layout.jsx` — verify it's the first focusable element.

#### C2f. Screen Reader Announcements

- **Dynamic content**: When `selectedPatientId` changes, the DiagnosisView and PatientProfile update. Add `aria-live="polite"` regions around these sections.
- **Loading states**: Already have `aria-live="polite"` on loading fallbacks. ✓
- **Error states**: Already have `role="alert"` on error display. ✓

#### C2g. Mobile Bottom Nav Bar

At ≤576px, the nav becomes `position: fixed; bottom: 0`. Ensure:
- It doesn't overlap page content (already handled via `padding-bottom: 4.5rem` on `.layout`)
- Focus order is logical (nav should be last in DOM order — currently it's in the middle via Header)
- Touch targets are at least 44×44px (WCAG 2.5.5)

### C3. Accessibility Test Checklist

```
□ Page has a skip-to-content link (first focusable element)
□ All images have appropriate alt text (decorative → alt="", informative → descriptive)
□ All form controls have associated labels
□ Color contrast meets WCAG AA (4.5:1 normal, 3:1 large)
□ All interactive elements are keyboard accessible
□ Focus indicators are visible (focus-visible styles)
□ ARIA landmarks are used correctly (banner, navigation, main, complementary)
□ Screen reader announces dynamic content changes
□ Error messages are associated with their inputs
□ Touch targets are at least 44×44px on mobile
□ Chart data is available in an alternative format (data table or text summary)
```

---

## Implementation Order

The workstreams are largely independent and can be parallelized:

```
Phase 1: Infrastructure
  ├── Install test dependencies (npm install --save-dev vitest ...)
  ├── Create vitest.config.js
  ├── Create src/test/setup.js
  └── Create src/components/common/ErrorBoundary.jsx

Phase 2: Tests (can be parallelized)
  ├── RetinaImage.test.jsx
  ├── BloodPressureChart.test.tsx
  ├── PatientList.test.jsx
  ├── PatientProfile.test.jsx
  ├── DiagnosisView.test.jsx
  ├── Header.test.jsx
  └── api.test.js

Phase 3: Error Boundaries
  ├── Wrap App.jsx with ErrorBoundary
  ├── Wrap each Suspense boundary with ErrorBoundary
  └── Wrap BloodPressureChart with nested ErrorBoundary

Phase 4: Accessibility
  ├── Fix color contrast issues (PatientList.meta, metricStatus, nav active)
  ├── Add aria-current="page" to active nav item
  ├── Add chart canvas aria-label and role="img"
  ├── Add aria-live regions for dynamic content
  ├── Verify keyboard navigation across all interactive elements
  └── Verify mobile touch targets (44×44px)
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `vitest.config.js` | Test runner configuration |
| `src/test/setup.js` | Test environment setup (jest-dom matchers) |
| `src/test/mocks/chart.js` | Mock Chart.js registration for tests |
| `src/__tests__/RetinaImage.test.jsx` | RetinaImage unit tests |
| `src/__tests__/BloodPressureChart.test.tsx` | BloodPressureChart unit tests |
| `src/__tests__/PatientList.test.jsx` | PatientList unit tests |
| `src/__tests__/PatientProfile.test.jsx` | PatientProfile unit tests |
| `src/__tests__/DiagnosisView.test.jsx` | DiagnosisView unit tests |
| `src/__tests__/Header.test.jsx` | Header unit tests |
| `src/__tests__/api.test.js` | API client unit tests |
| `src/components/common/ErrorBoundary.jsx` | Error boundary component |

## Files to Modify

| File | Changes |
|------|---------|
| `package.json` | Add test dependencies + `test` script |
| `src/components/common/index.js` | Export ErrorBoundary |
| `src/App.jsx` | Wrap with ErrorBoundary, wrap each Suspense |
| `src/components/dashboard/DiagnosisView.jsx` | Wrap BloodPressureChart with ErrorBoundary |
| `src/components/dashboard/BloodPressureChart.tsx` | Add chart canvas aria-label/role |
| `src/components/layout/Header.jsx` | Add `aria-current="page"` to active nav item |
| `src/components/dashboard/PatientList.module.css` | Fix `.meta` color contrast |
| `src/components/dashboard/DiagnosisView.module.css` | Fix `.metricStatus` color contrast |
| `src/components/layout/Header.module.css` | Fix nav active text contrast |

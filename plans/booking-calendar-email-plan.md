# Booking Calendar & Email Notification Plan

## Overview

Two feature requests:

1. **Booking Calendar**: Change default available days from `[Sun, Wed, Fri, Sat]` to **all days except Sunday**. Admins can block/unblock any date via the existing admin panel.
2. **Booking Email Notifications**: Connect booking submissions to Resend so notifications go to a configurable email address (the user wants to use Resend, which is already set up).

---

## Current State Analysis

### Calendar Frontend (`index.html` lines 1084-1226)

- `DEFAULT_AVAILABLE_DAYS = [0, 3, 5, 6]` — currently allows Sun(0), Wed(3), Fri(5), Sat(6)
- `availableDaysOfWeek` is populated from the API response's `available_days` field
- `isDayAvailable()` checks both day-of-week AND blocked dates cache
- `fetchBlockedDates()` calls `/api/available-dates?month=X&year=Y` and caches results

### Available Dates API (`functions/api/available-dates.ts`)

- Returns `available_days: [0, 3, 5, 6]` hardcoded on line 59
- Returns `blocked` array from `blocked_dates` table for the requested month

### Admin Block/Unblock API (`functions/api/admin/block-date.ts`)

- **GET**: Lists all blocked dates with IDs
- **POST**: Blocks a date (inserts into `blocked_dates` table)
- **DELETE**: Unblocks a date by ID
- Already fully functional

### Admin Panel (`admin.html`)

- Has a "Block / Unblock Dates" section with date picker, reason input, and block button
- Lists all blocked dates as removable chips
- Already fully functional

### Booking Submission (`functions/api/book-speaking.ts`)

- Currently sends email to hardcoded `bookings@lmministries.org` (line 97)
- Uses `sendEmail()` helper from `_email.ts`
- Resend API key exists in `.dev.vars`: `re_wiekxBDZ_6DmQBb4mxrBkjht4kZ76v6du`

### Email Helper (`functions/api/_email.ts`)

- Sends via Resend REST API (`POST https://api.resend.com/emails`)
- Default from: `LM Ministries <bookings@lmministries.org>`
- Returns `true`/`false`, never throws — errors are logged only

### Database Schema

- `blocked_dates` table: `id`, `blocked_date` (UNIQUE), `reason`, `created_at`
- `speaking_invitations` table: `id`, `organization_name`, `host_name`, `host_email`, `engagement_type`, `event_date`, `event_time`, `additional_comments`, `status`, `created_at`

---

## Request 1: Calendar — All Dates Available Except Sundays

### Changes Needed

#### 1a. `functions/api/available-dates.ts` (line 59)

Change the hardcoded `available_days` from `[0, 3, 5, 6]` to `[1, 2, 3, 4, 5, 6]` (Mon-Sat).

```typescript
// Before:
available_days: [0, 3, 5, 6],

// After:
available_days: [1, 2, 3, 4, 5, 6],
```

#### 1b. `index.html` (line 1092)

Update the frontend default to match.

```javascript
// Before:
const DEFAULT_AVAILABLE_DAYS = [0, 3, 5, 6];

// After:
const DEFAULT_AVAILABLE_DAYS = [1, 2, 3, 4, 5, 6];
```

#### 1c. `index.html` — Update comment on line 1091

```javascript
// Before:
// Default available days of week (Sun, Wed, Fri, Sat)

// After:
// Default available days of week (Mon-Sat); Sundays are always unavailable
```

### How Blocking Works (Already in Place)

- When a booking is **approved** via the admin panel, the date is automatically inserted into `blocked_dates` (see `functions/api/admin/bookings/[id].ts` lines 62-73)
- Admins can **manually block** any date via the admin panel's "Block / Unblock Dates" section
- Admins can **unblock** any date by clicking the × on a blocked-date chip
- The frontend fetches blocked dates each month and renders them as unavailable

### Flow Diagram

```mermaid
flowchart TD
    A[User opens calendar] --> B[fetchBlockedDates API call]
    B --> C[available-dates.ts returns available_days: 1-6 + blocked[]]
    C --> D[renderCalendar: Mon-Sat clickable, Sun disabled]
    D --> E[User selects date + time + submits form]
    E --> F[book-speaking.ts: checks blocked_dates, inserts invitation]
    F --> G[Admin reviews in admin panel]
    G --> H{Approve?}
    H -->|Yes| I[auto-block date in blocked_dates]
    H -->|No| J[Decline or leave Pending]
    I --> K[Calendar reflects blocked date next render]
```

---

## Request 2: Booking Email Notifications via Resend

### Current Behavior

The `book-speaking.ts` endpoint already sends an email notification when a booking is submitted (lines 96-101). It's hardcoded to send to `bookings@lmministries.org`.

### What Needs to Change

The user wants to be able to configure which email receives booking notifications. Since the user said "I would like to Resend" — they want to use Resend (already set up) and need a way to manage the notification recipient.

#### Option A (Recommended): Environment Variable

Add a `BOOKING_NOTIFICATIONS_EMAIL` environment variable so the recipient is configurable without code changes.

**Changes to `functions/api/book-speaking.ts`:**

1. Add `BOOKING_NOTIFICATIONS_EMAIL` to the `Env` interface
2. Replace hardcoded `'bookings@lmministries.org'` with `env.BOOKING_NOTIFICATIONS_EMAIL`

```typescript
interface Env {
  DB: D1Database;
  RESEND_API_KEY: string;
  BOOKING_NOTIFICATIONS_EMAIL: string;
}

// Line 97 change:
await sendEmail(env.RESEND_API_KEY, {
  to: env.BOOKING_NOTIFICATIONS_EMAIL,
  subject: `New Speaking Invitation - ${body.organization}`,
  html: buildEmailHtml(body),
  text: buildEmailText(body),
});
```

3. Add to `.dev.vars`:
```
BOOKING_NOTIFICATIONS_EMAIL=bookings@lmministries.org
```

4. Set as Cloudflare Pages secret for both environments:
```bash
npx wrangler pages secret put BOOKING_NOTIFICATIONS_EMAIL --env production
npx wrangler pages secret put BOOKING_NOTIFICATIONS_EMAIL --env preview
```

#### Option B: Configurable via Admin Panel

Add a settings section to `admin.html` where the admin can update the notification email, stored in a new `app_settings` database table. This is more complex but gives the admin full control without needing CLI access.

**Recommendation**: Start with **Option A** (env var) since it's simpler, already matches the pattern used by other secrets, and the user can update it via Cloudflare dashboard or CLI at any time.

---

## Implementation Steps (Ordered)

| # | File | Change | Complexity |
|---|------|--------|------------|
| 1 | `functions/api/available-dates.ts:59` | Change `available_days` to `[1, 2, 3, 4, 5, 6]` | Trivial |
| 2 | `index.html:1092` | Change `DEFAULT_AVAILABLE_DAYS` to `[1, 2, 3, 4, 5, 6]` | Trivial |
| 3 | `index.html:1091` | Update comment | Trivial |
| 4 | `functions/api/book-speaking.ts:13` | Add `BOOKING_NOTIFICATIONS_EMAIL` to `Env` interface | Small |
| 5 | `functions/api/book-speaking.ts:97` | Replace hardcoded email with `env.BOOKING_NOTIFICATIONS_EMAIL` | Small |
| 6 | `.dev.vars` | Add `BOOKING_NOTIFICATIONS_EMAIL=bookings@lmministries.org` | Trivial |
| 7 | Terminal | Set Cloudflare Pages secret for production + preview | Small |

---

## Verification Checklist

- [ ] Calendar shows Mon-Sat as available, Sunday as disabled
- [ ] Blocked dates from `blocked_dates` table are still disabled
- [ ] Admin can block a date → it appears disabled on calendar
- [ ] Admin can unblock a date → it becomes available again
- [ ] Approving a booking auto-blocks the date
- [ ] New booking submission sends email to `BOOKING_NOTIFICATIONS_EMAIL`
- [ ] Email arrives with correct formatting (organization, host, date, time, etc.)
- [ ] Email notification failure does not block the booking submission (already handled by `sendEmail` returning false without throwing)

---

## Files Not Modified (No Changes Needed)

- `functions/api/_email.ts` — already works correctly
- `functions/api/admin/block-date.ts` — already fully functional
- `functions/api/admin/bookings.ts` — already fully functional
- `functions/api/admin/bookings/[id].ts` — already auto-blocks on approval
- `admin.html` — already has block/unblock UI
- `wrangler.toml` / `wrangler.jsonc` — no binding changes needed
- Database migrations — no schema changes needed

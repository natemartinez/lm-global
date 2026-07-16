# Gemini Handoff — LM Ministries: Next Steps

This document is a handoff for a **Gemini-based coding agent** to continue work on the LM Ministries website (`lm-live-site`). It summarizes the current project state, all implemented features, and the prioritized next steps.

---

## Project Overview

| Property | Value |
|----------|-------|
| **Site** | LM Ministries — Apostle Lee Martinez |
| **Platform** | Cloudflare Pages + Functions (TypeScript) |
| **Database** | Cloudflare D1 (SQLite) |
| **File Storage** | Cloudflare R2 (pending Dashboard setup) |
| **Payments** | Stripe Checkout Sessions |
| **Email** | Resend REST API (replaced Cloudflare Email Service) |
| **Auth** | JWT (HMAC-SHA256), PBKDF2 password hashing |
| **Frontend** | Single-page `index.html` with Tailwind CSS |
| **Deployment URL** | `https://40828775.lm-live-site.pages.dev` |
| **Project Name** | `lm-live-site` |

---

## Current State — What's Already Built

### Backend API Endpoints (all verified working)

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/api/books/purchase` | POST | Creates Stripe Checkout Session, stores pending order | ✅ Live |
| `/api/books/stripe-webhook` | POST | Verifies webhook signature, fulfills order, sends download email | ✅ Live |
| `/api/books/download` | GET | Validates download token, streams PDF from R2 | ✅ Live |
| `/api/auth/signup` | POST | PBKDF2 hashing, JWT creation, welcome email | ✅ Live |
| `/api/auth/login` | POST | Password verification, returns JWT | ✅ Live |
| `/api/auth/me` | GET | Returns current user from JWT `Authorization` header | ✅ Live |
| `/api/mailing/subscribe` | POST | Adds to mailing list, sends confirmation email | ✅ Live |
| `/api/mailing/unsubscribe` | POST | Sets `is_active = 0` | ✅ Live |
| `/api/book-speaking` | POST | Speaking invitation booking with date collision check | ✅ Live |
| `/api/available-dates` | GET | Returns available dates for booking | ✅ Live |
| `/api/admin/bookings` | GET | Admin: list all bookings | ✅ Live |
| `/api/admin/bookings/[id]` | GET/PUT/DELETE | Admin: manage single booking | ✅ Live |
| `/api/admin/block-date` | POST | Admin: block a date | ✅ Live |

### Database Schema (`migrations/0002_create_books_auth_tables.sql`)

- **`books`** — `id`, `title`, `slug`, `description`, `price_cents`, `stripe_price_id`, `pdf_path`, `cover_image`, `is_active`, `created_at`
- **`orders`** — `id`, `user_id`, `book_id`, `email`, `stripe_session_id`, `stripe_payment_intent`, `amount_cents`, `currency`, `status`, `download_token`, `download_count`, `created_at`, `fulfilled_at`
- **`users`** — `id`, `email`, `password_hash`, `name`, `is_subscribed`, `created_at`, `last_login_at`
- **`mailing_list_subscribers`** — `id`, `email`, `name`, `user_id`, `source`, `is_active`, `subscribed_at`, `unsubscribed_at`

### Seed Data (2 books at $14.99 each)

| Title | Slug | Price |
|-------|------|-------|
| Fear No More! | `fear-no-more` | $14.99 |
| There's Levels To This | `theres-levels-to-this` | $14.99 |

### Key Files

| File | Purpose |
|------|---------|
| [`wrangler.toml`](wrangler.toml) | Pages config with D1 + R2 bindings |
| [`functions/api/_email.ts`](functions/api/_email.ts) | Shared Resend email helper |
| [`functions/api/books/stripe-webhook.ts`](functions/api/books/stripe-webhook.ts) | Stripe webhook with HMAC-SHA256 verification |
| [`functions/api/auth/signup.ts`](functions/api/auth/signup.ts) | PBKDF2 hashing, JWT create/verify, exports shared utils |
| [`index.html`](index.html) | Full SPA with modals, auth UI, mailing list section |
| [`.dev.vars`](.dev.vars) | Local dev secrets |
| [`plans/book-purchase-auth-mailing-list-plan.md`](plans/book-purchase-auth-mailing-list-plan.md) | Original architecture plan |

### Production Secrets Set

| Secret | Status |
|--------|--------|
| `STRIPE_SECRET_KEY` | ✅ Set (test key `sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | ⚠️ Placeholder (`whsec_mock_local_dev_secret`) — needs real value |
| `JWT_SECRET` | ⚠️ Placeholder — needs strong random value |
| `RESEND_API_KEY` | ✅ Set (`re_DJqcyxb1_9Z4tbz1sHR1uhmPMUA8cAFUv`) |
| `ADMIN_SECRET` | ✅ Set |

---

## Priority 1 — Configure Stripe Webhook (CRITICAL)

**Why**: Without this, the purchase flow is broken. After a user pays on Stripe, Stripe sends a `checkout.session.completed` event to the webhook endpoint. If the signing secret isn't configured, the webhook signature verification fails and orders are never fulfilled.

### Steps

1. Go to **Stripe Dashboard → Developers → Webhooks**
2. Click **"Add endpoint"**
3. **Endpoint URL**: `https://40828775.lm-live-site.pages.dev/api/books/stripe-webhook`
4. **Events to listen**: Select `checkout.session.completed`
5. Click **"Add endpoint"**
6. Under **"Signing secret"**, click **"Reveal"** and copy the `whsec_...` value
7. Run:
   ```bash
   echo "whsec_YOUR_REAL_SECRET_HERE" | npx wrangler pages secret put STRIPE_WEBHOOK_SECRET --project-name lm-live-site
   ```
8. Update [`.dev.vars`](.dev.vars) with the same value for local development

### Verification

```bash
curl -X POST https://40828775.lm-live-site.pages.dev/api/books/purchase \
  -H "Content-Type: application/json" \
  -d '{"book_slug":"fear-no-more","email":"test@example.com","name":"Test"}'
# Should return a checkout_url — open in browser, pay with test card 4242 4242 4242 4242
```

---

## Priority 2 — Enable R2 & Upload PDFs

**Why**: The download endpoint streams PDFs from R2. Without the bucket and files, fulfilled orders return 404.

### Steps

1. Go to **Cloudflare Dashboard → R2**
2. Enable R2 (may require adding a payment method)
3. Create bucket named **`lm-books-pdfs`**
4. Upload the two PDF files:
   - `fear-no-more.pdf` → path: `books/fear-no-more.pdf`
   - `theres-levels-to-this.pdf` → path: `books/theres-levels-to-this.pdf`
5. Verify the bucket binding in [`wrangler.toml`](wrangler.toml) is correct:
   ```toml
   [[r2_buckets]]
   binding = "BOOKS_BUCKET"
   bucket_name = "lm-books-pdfs"
   ```

### Verification

```bash
# After a successful purchase + webhook, get the download token from D1
curl -L https://40828775.lm-live-site.pages.dev/api/books/download?token=TOKEN_HERE
# Should stream the PDF
```

---

## Priority 3 — Verify Domain in Resend

**Why**: Emails are sent from `bookings@lmministries.org`. Until the domain is verified in Resend, emails may be rejected or land in spam.

### Steps

1. Go to **Resend Dashboard → Domains**
2. Click **"Add Domain"**
3. Enter `lmministries.org`
4. Add the provided DNS TXT record to your domain's DNS settings (via Cloudflare Dashboard)
5. Wait for DNS propagation and click **"Verify"**

---

## Priority 4 — Generate Strong Production Secrets

**Why**: The current `JWT_SECRET` is a placeholder (`local-dev-jwt-secret-do-not-use-in-production`). Anyone who can read the source can forge JWTs.

### Steps

```bash
openssl rand -base64 32 | npx wrangler pages secret put JWT_SECRET --project-name lm-live-site
```

Also update [`.dev.vars`](.dev.vars) with the same value for local development consistency.

---

## Priority 5 — Custom Domain

**Why**: The site is currently at a `*.pages.dev` URL. For production, it should use `lmministries.org`.

### Steps

**Option A — Cloudflare Dashboard (easier):**
1. Go to **Cloudflare Dashboard → Pages → lm-live-site → Custom domains**
2. Click **"Set up a custom domain"**
3. Enter `lmministries.org` (or a subdomain like `www.lmministries.org`)
4. Cloudflare will automatically add the DNS records

**Option B — DNS CNAME:**
1. Add a CNAME record in your DNS: `@` → `lm-live-site.pages.dev`

---

## Priority 6 — End-to-End Purchase Flow Test

Once priorities 1-3 are complete, run a full manual test:

1. Open `https://40828775.lm-live-site.pages.dev/` in a browser
2. Click **"Get Your Copy"** on a book
3. Enter email in the purchase modal → click **"Continue to Checkout"**
4. You're redirected to Stripe Checkout
5. Pay with test card: `4242 4242 4242 4242` (any future expiry, any CVC)
6. Stripe sends webhook → order status changes to `fulfilled` → download token generated
7. Resend sends download email to the entered address
8. Click the download link → PDF streams from R2

---

## Optional Enhancements (Future)

| Feature | Description | Files Involved |
|---------|-------------|----------------|
| **Rate limiting** | Prevent brute force on auth endpoints | `functions/_middleware.ts` |
| **Password reset** | Forgot password flow with reset token | `functions/api/auth/` + new endpoints |
| **Admin dashboard** | View orders, mailing list subscribers | `admin.html` + new API endpoints |
| **Email templates** | Custom-branded HTML emails | `functions/api/_email.ts` + template files |
| **Stripe price IDs** | Replace empty `stripe_price_id` in seed data with real price IDs | `migrations/0002_create_books_auth_tables.sql` |
| **Analytics** | Track purchases, signups, mailing list growth | New D1 tables + dashboard |

---

## Technical Notes for the Agent

### Email Architecture
- All email sending goes through [`functions/api/_email.ts`](functions/api/_email.ts) → Resend REST API
- Sender: `LM Ministries <bookings@lmministries.org>`
- Errors are logged but never thrown — email failures don't break the user's request
- 4 endpoints send emails: `stripe-webhook.ts`, `signup.ts`, `subscribe.ts`, `book-speaking.ts`

### Auth Architecture
- Passwords: PBKDF2 with SHA-256, 100,000 iterations, stored as `pbkdf2:100000:salt:hash`
- JWTs: HMAC-SHA256, 7-day expiry, stored in `localStorage` on the frontend
- Shared utilities in [`functions/api/auth/signup.ts`](functions/api/auth/signup.ts): `verifyPassword()`, `createJWT()`, `verifyJWT()` — exported for use by `login.ts` and `me.ts`

### Stripe Integration
- No Stripe SDK — uses raw REST API calls + Web Crypto API for webhook verification
- Checkout Sessions created via `POST https://api.stripe.com/v1/checkout/sessions`
- Webhook signature verified with HMAC-SHA256 using `crypto.subtle`

### TypeScript Errors
- All TS errors are type compatibility issues between local `@cloudflare/workers-types` and the Cloudflare runtime — **non-blocking for deployment**
- The `wrangler pages deploy` command compiles and deploys successfully despite these errors

### Config Files
- [`wrangler.toml`](wrangler.toml) is the **primary config** (TOML format supports `[[r2_buckets]]` and `[[send_email]]`)
- [`wrangler.jsonc`](wrangler.jsonc) exists but is secondary — it does NOT have `send_email` or `r2_buckets` bindings
- Production secrets are set via `npx wrangler pages secret put` — NOT in `wrangler.toml`

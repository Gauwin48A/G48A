# MHub — Future Steps & Roadmap

> Last updated: March 2026

---

## CRITICAL — Location Detection (Exact Village/Colony)

| # | Task | Status | Details |
|---|------|--------|---------|
| L1 | **Village/colony field propagation** | FIXED | `getCurrentLocation()` and `normalizeLocationShape()` now include `village` and `colony` fields end-to-end. Previously these fields were extracted by Nominatim/BigDataCloud but dropped during normalization. |
| L2 | **IP fallback location isolation** | FIXED | IP-based fallback locations (5km accuracy) no longer get cached in localStorage or runtime cache. Prevents all users on the same ISP from seeing identical "Habbebnagar" location. |
| L3 | **GPS-first enforcement** | FIXED | Runtime cache and localStorage cache now reject `ip_fallback` provider data. Only real GPS fixes are cached and reused. IP fallback can never overwrite a GPS fix in the runtime cache. |
| L4 | **Display name includes village/colony** | FIXED | `buildLocationString()` in LocationContext now includes colony and village between placeName and area for the most specific display possible. |
| L5 | **Nominatim zoom level 19** | VERIFIED | Already set to zoom=19 (building-level) with `addressdetails=1&namedetails=1&extratags=1` for maximum detail. |
| L6 | **Coordinate precision** | VERIFIED | 7-decimal-place precision for GPS coordinates (~1.1cm), 5-decimal rounding for reverse geocode cache keys (~1.1m). |
| L7 | **Backend location storage — village/colony columns** | DONE | Added `village` and `colony` columns to `user_locations` + `users` tables. Migration `001_location_village_colony.sql`. `locationController.js` persists and returns these fields. |
| L8 | **Server-side reverse geocode for IP requests** | DONE | `serverReverseGeocode()` in `locationController.js` calls Nominatim when provider is IP-based, enriching city-level data with village/colony/area. |
| L9 | **India-specific geocoding enhancement** | TODO | Integrate India Post API or Survey of India data for rural areas where Nominatim/BigDataCloud have sparse coverage. Especially for hamlets and small colonies near Habbebnagar area. |
| L10 | **Location accuracy indicator in UI** | DONE | `AccuracyBadge` component in `LocationGate.jsx` shows "Precise (GPS)", "Approximate (Network)", or "City-level (IP)" with color-coded badge. |
| L11 | **Force GPS re-capture on stale data** | DONE | `STALE_LOCATION_THRESHOLD_MS = 30 * 60 * 1000` in `LocationContext.jsx`. Stale cache forces immediate GPS refresh. |

---

## CRITICAL — Authentication System

### Login (Mobile + Password)

| # | Task | Status | Details |
|---|------|--------|---------|
| A1 | **Mobile number + password login** | DONE | Users log in with registered mobile number and password. Indian phone normalization (10 digits, 6-9 prefix). |
| A2 | **Account lockout** | DONE | 5 failed attempts → 15-minute lock. `login_attempts` counter resets on success. |
| A3 | **Legacy bcrypt migration** | DONE | Auto-upgrades bcrypt hashes to Argon2id on successful login. |
| A4 | **ML fraud scoring on login** | DONE | `mlFraudScoringService.scoreLoginAttempt()` evaluates risk. Challenge mode with OTP enforcement. |
| A5 | **Error messages** | DONE | "Invalid credentials" (wrong phone/password), "Account temporarily locked" (lockout), "Account is deactivated" (disabled). |

### Sign Up (Aadhaar-Verified Registration)

| # | Task | Status | Details |
|---|------|--------|---------|
| A6 | **Step 1: Aadhaar + mobile entry** | DONE | Verhoeff checksum validation for Aadhaar number. Mobile must be Aadhaar-registered. |
| A7 | **Step 2: OTP verification** | DONE | OTP sent to Aadhaar-registered mobile. 10-minute TTL. Max 5 verify attempts. Rate-limited to 3 OTP requests per 10 minutes. |
| A8 | **Step 3: Password creation** | DONE | Min 8 chars, at least 1 number, at least 1 special character. zxcvbn strength score >= 2. Confirm password match. |
| A9 | **Step 4: Account creation** | DONE | User created in PostgreSQL, profile row inserted, signup bonus (25 points), referral code support. |
| A10 | **Aadhaar mobile mismatch** | DONE | "The mobile number does not match the Aadhaar record." error when provider response shows mismatch. |
| A11 | **OTP failure messages** | DONE | "Invalid or expired OTP. Please try again." with attempts remaining counter. |
| A12 | **Password mismatch** | DONE | Client-side confirm password validation. "Passwords do not match." error. |

### Forgot/Reset Password

| # | Task | Status | Details |
|---|------|--------|---------|
| A13 | **Forgot password (email + SMS)** | DONE | Token-based reset link via email + OTP via SMS. 15-minute TTL. |
| A14 | **Reset password** | DONE | Dual path: token link or phone+OTP. Password strength validation. Revokes all sessions after reset. |

### Security Layer

| # | Task | Status | Details |
|---|------|--------|---------|
| A15 | **JWT with rotation** | DONE | Access token 15m, refresh token 30d. HTTP-only secure cookies. Issuer/audience claims. |
| A16 | **Refresh token reuse detection** | DONE | If reuse detected, ALL sessions for user are revoked. |
| A17 | **Argon2id hashing** | DONE | `argon2id, memoryCost=64KB, timeCost=3, parallelism=1`. |
| A18 | **CSRF protection** | DONE | XSRF-TOKEN cookie support. |
| A19 | **Audit logging** | DONE | LOGIN_SUCCESS, SIGNUP_SUCCESS events with IP and user-agent. |

### Auth — Remaining TODO

| # | Task | Details |
|---|------|---------|
| A20 | **Real-time Aadhaar validation UI** | DONE | Verhoeff checksum validation as-you-type in `SignUp.jsx`. |
| A21 | **Resend OTP with cooldown timer** | DONE | 30-second countdown timer in `SignUp.jsx` OTP step. |
| A22 | **Password strength indicator** | DONE | 3-level strength bar (weak/fair/strong) in `SignUp.jsx`. |
| A23 | **Forgot Password via OTP (mobile-first)** | DONE | Phone detection + OTP reset in `ForgotPassword.jsx`. |
| A24 | **Biometric login (repeat sessions)** | TODO | Fingerprint/Face ID via Capacitor BiometricAuth plugin for returning users. |
| A25 | **Session management UI** | DONE | Active sessions with revoke in `SecuritySettings.jsx`. |
| A26 | **Phone number change flow** | DONE | `initiatePhoneChange` + `completePhoneChange` in `authController.js`. Aadhaar re-verification, all sessions revoked. |

---

## IMPLEMENTED — 4-Tier Pricing & Monetization

| # | Feature | Status | Details |
|---|---------|--------|---------|
| P1 | **4-tier pricing model** | DONE | Basic ₹500/listing, Bronze ₹850/3mo, Silver ₹1200/6mo, Premium ₹1500/12mo. `tierRules.js` rewritten. |
| P2 | **Subscription system** | DONE | `subscriptionController.js` + `002_subscription_plans.sql`. Create/upgrade subscriptions, quota tracking. |
| P3 | **Bundled boost quotas** | DONE | Boost/featured/spotlight included in subscription. No standalone purchase. Quota-checked via `checkQuota()`. |
| P4 | **Monthly quota reset cron** | DONE | `quotaReset.js` runs 1st of each month. Resets all active subscription usage counters. |
| P5 | **Subscription expiry cron** | DONE | `subscriptionExpiry.js` — daily check, auto-downgrades to basic, notifies user. |
| P6 | **Boost expiry cron** | DONE | Recalculates `boost_level` when boosts expire, cleans expired records. |
| P7 | **Tier-based listing expiry** | DONE | Basic=15d, Bronze/Silver=30d, Premium=45d. `setTierBasedExpiry()` cron. |
| P8 | **3-level referral chain** | DONE | Level 1→2 coins, Level 2→1 coin, Level 3→0.5 coin. Max depth 3. |
| P9 | **Coin economy** | DONE | 90-coin welcome bonus, +1/post, +3/sale. Redeem for boost(10), featured(20), spotlight(40). Transaction-safe ledger. |
| P10 | **Tier-based search ranking** | DONE | Premium Featured > Premium > Silver Featured > Silver > Bronze > Basic ordering in search + feed. |
| P11 | **Premium recommendations** | DONE | `/posts/:id/premium-recommendations` — 3-5 premium/silver listings in same category on post detail. |
| P12 | **Seller dashboard** | DONE | `sellerAnalyticsController.js` — stats, listings performance, views trend, conversion funnel. Silver/Premium only. |
| P13 | **Promo codes** | DONE | LAUNCH50 (50% off), WELCOME20 (20%), SILVER10, BRONZE15 in `tierRules.js`. |
| P14 | **Coin hooks** | DONE | `coinHooks.js` middleware auto-awards coins on post creation and sale without modifying minified controllers. |

## Priority 1 — Revenue & Monetization (Remaining)

| # | Task | Details |
|---|------|---------|
| 1 | **Post-credit enforcement middleware** | Block `createPost` for basic users with 0 credits. `post_credits` column exists in DB but middleware not wired. |
| 3 | **Razorpay integration for subscriptions** | Connect subscription purchase flow to Razorpay/UPI payment gateway end-to-end. |
| 4 | **Trial system UI trigger** | Backend trial logic exists (Silver 7d, Premium 14d) — add "Start Free Trial" button in subscription page. |
| 5 | **In-app upsell surfaces** | Surface upgrade prompts in post-limit toasts, feed banners, and boost prompts. |
| 6 | **Razorpay/UPI reconciliation** | Automate matching between manual UPI screenshots and Razorpay webhook confirmations. |

---

## Priority 2 — Performance & Optimization

| # | Task | Details |
|---|------|---------|
| 7 | **List virtualization** | Large feeds (AllPosts, MyFeed, ForYou) need `react-window` or `@tanstack/virtual` for 100+ item lists. |
| 8 | **Image lazy-loading & CDN** | Ensure all product images use Cloudflare Image Resizing or `loading="lazy"` + `srcset`. |
| 9 | **Bundle analysis & splitting** | Run `npx vite-bundle-visualizer`, split heavy vendors (radix 100KB, i18n 72KB) into async chunks. |
| 10 | **Database query optimization** | Add composite indexes on `posts(user_id, status, created_at)` and `transactions(buyer_id, seller_id)`. |
| 11 | **Redis cache warming** | Pre-warm trending posts, category counts, and location-based feeds on server start. |

---

## Priority 3 — Testing & Quality

| # | Task | Details |
|---|------|---------|
| 12 | **E2E coverage expansion** | Current: top 10 journeys. Target: all 59+ routes with smoke tests. |
| 13 | **Visual regression tests** | Add Playwright screenshot comparisons for mobile navbar, auth forms, post cards. |
| 14 | **API contract tests** | Route-level request/response schema validation for all server endpoints. |
| 15 | **Load testing** | k6 or Artillery scripts for `/api/posts`, `/api/auth/login`, `/api/search` under 500+ concurrent users. |
| 16 | **Accessibility audit** | Run axe-core on all pages; fix contrast ratios, ARIA labels, keyboard navigation. |

---

## Priority 4 — Security Hardening

| # | Task | Details |
|---|------|---------|
| 17 | **Rate-limit tuning** | Fine-tune per-endpoint limits — current signup: 10/15min, login: 5/15min. Add adaptive limits based on abuse patterns. |
| 18 | **Location fraud mitigation** | Detect GPS spoofing via speed/distance anomalies between consecutive location updates. |
| 19 | **HMAC key rotation** | Automate HMAC secret rotation for location payloads with zero-downtime rollover. |
| 20 | **CSP tightening** | Move from report-only to enforced Content-Security-Policy. Audit all inline scripts. |
| 21 | **Dependency audit pipeline** | Automate `npm audit` in CI — block merges with critical/high vulnerabilities. |

---

## Priority 5 — Infrastructure & DevOps

| # | Task | Details |
|---|------|---------|
| 22 | **Production monitoring dashboard** | Deploy Sentry for error tracking + Grafana/Prometheus for API latency, DB connections, Redis memory. |
| 23 | **Backup/restore drill** | Document and test full PostgreSQL + Redis + uploads restore from backups. |
| 24 | **CI/CD pipeline** | GitHub Actions: lint -> test -> build -> deploy (staging on PR, production on main merge). |
| 25 | **Multi-region active-active** | Currently BLOCKED on infrastructure provisioning. Requires read replicas + Cloudflare load balancing. |
| 26 | **Blue-green deployments** | Zero-downtime deployment strategy with PM2 or Docker Swarm rollback capability. |
| 27 | **Log aggregation** | Centralize Pino logs from PM2 cluster into ELK stack or Cloudflare Logpush. |

---

## Priority 6 — Feature Completion

| # | Task | Details |
|---|------|---------|
| 28 | **Admin launch governance dashboard** | Real-time view of active users, post volume, transaction completion rates, fraud flags. |
| 29 | **Seller analytics page** | Views, clicks, conversion rate, revenue breakdown per post. |
| 30 | **Buyer protection flow** | Dispute resolution UI — escalation to admin with evidence upload. |
| 31 | **Notification preferences** | Per-category opt-in/out (chat, price drops, nearby listings, promotions). |
| 32 | **Advanced search filters** | Price range slider, condition (new/used), verified-seller-only toggle, sort by distance. |
| 33 | **Localization to 100%** | Current: ~80-84% coverage in some languages. Complete missing keys for all 26 languages. |

---

## Priority 7 — Mobile App Polish (Capacitor)

| # | Task | Details |
|---|------|---------|
| 34 | **Sticky filter bar** | Pin category/sort filters below header on scroll for mobile feed pages. |
| 35 | **Pull-to-refresh** | Native-feel refresh gesture on feed and post detail pages. |
| 36 | **Deep linking** | `mhub://post/:id` and `mhub://profile/:id` for share-to-app flows. |
| 37 | **Push notification channels** | Android notification channels for chat vs. transactions vs. promotions. |
| 38 | **App store assets** | Screenshots, feature graphic, store description in English + Telugu + Hindi. |
| 39 | **Biometric auth** | Fingerprint/Face ID for login on repeat sessions (Capacitor BiometricAuth plugin). |

---

## Completed (Previous Sessions)

| Feature | Status | Rating |
|---------|--------|--------|
| **Location detection** — village, colony, hamlet extraction with 5-decimal precision | DONE | 9/10 |
| **Auth: Login** — mobile + password, risk-based OTP challenge, device tracking | DONE | 9.5/10 |
| **Auth: Signup** — Aadhaar (Verhoeff) -> OTP -> password creation (3-step) | DONE | 9.5/10 |
| **Auth: Forgot/Reset Password** — token + phone OTP dual reset path | DONE | 9/10 |
| **Auth: Security layer** — Argon2id, JWT rotation, reuse detection, ML fraud scoring | DONE | 10/10 |
| **PWA** — Service Worker v3, stale-while-revalidate, background sync | DONE | 9/10 |
| **SEO** — structured data, meta tags, robots.txt, sitemap | DONE | 8.5/10 |
| **Dark mode** — global CSS layer with proper contrast | DONE | 8/10 |
| **Cloudflare headers** — security headers, cache rules, redirects | DONE | 9/10 |
| **Performance** — Terser console strip, web vitals, request dedup | DONE | 8.5/10 |

## Completed (This Session)

| Feature | Status | Rating |
|---------|--------|--------|
| **Location: village/colony propagation** — fields now flow through normalizeLocationShape, getCurrentLocation, LocationContext | FIXED | - |
| **Location: IP fallback isolation** — IP-based locations no longer cached or reused as GPS data | FIXED | - |
| **Location: GPS-first enforcement** — runtime/localStorage caches reject ip_fallback provider | FIXED | - |
| **Location: display name includes village/colony** — buildLocationString updated | FIXED | - |
| **Feature branch** — `feature/location-auth-fixes` created | DONE | - |

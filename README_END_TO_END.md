# MHub End-to-End README

This document is a full technical walkthrough of the current MHub codebase in this repository.
It is intended as an implementation-level README for developers, QA, DevOps, and maintainers.

## 1. Project Overview

MHub is a marketplace platform with:
- React + Vite client (`Mhub/client`)
- Node.js + Express backend (`Mhub/server`)
- PostgreSQL as primary datastore
- Real-time channels via Socket.IO and optional Pusher
- Tier-based posting and monetization model (basic/silver/premium)
- Security, fraud checks, location-aware discovery, and multilingual support

Primary goals implemented in code:
- local buying/selling workflows
- trust-oriented flows (KYC, 2FA, fraud checks, admin verification)
- discovery (feed, geo-nearby, saved searches, alerts)
- seller tooling (analytics, offers, reward/referral systems)

## 2. Repository Structure

```text
Mhub/
  client/    # React app (Vite, Tailwind, Capacitor support)
  server/    # Express API, jobs, middleware, SQL scripts, tests
  README.md  # Existing project PRD-style doc
```

Server-side notable directories:
- `Mhub/server/src/routes` - REST API routes
- `Mhub/server/src/controllers` - route logic
- `Mhub/server/src/middleware` - auth/security/fraud/image/rate-limit layers
- `Mhub/server/src/services` - cache/push/risk/chat/subscription helpers
- `Mhub/server/database` - bootstrap SQL + migrations
- `Mhub/server/docs` - performance/security/testing docs

Client-side notable directories:
- `Mhub/client/src/pages` - app screens
- `Mhub/client/src/components` - reusable UI + shell/navigation
- `Mhub/client/src/context` - auth/location/filter state
- `Mhub/client/src/services` - API, contacts, location integrations
- `Mhub/client/public/locales` - i18n translation payloads
- `Mhub/client/android` - Capacitor Android project

## 3. Stack and Runtime

### Frontend
- React 18
- React Router v6
- TanStack Query
- Tailwind CSS + Radix UI primitives
- i18next with LocalStorage + HTTP chained backend
- Socket.IO client + optional Pusher client
- Capacitor (Android/iOS support)

### Backend
- Node.js / Express
- PostgreSQL (`pg`)
- JWT auth (access + refresh token rotation)
- Argon2 + bcrypt (legacy compatibility)
- Redis optional (session/rate/cache fallback to in-memory)
- Image handling via Multer, Sharp, Cloudinary fallback support
- Cron via `node-cron`

### Infra/ops assets in repo
- PM2 config (`Mhub/server/ecosystem.config.js`)
- Nginx reference config (`Mhub/server/nginx.conf`)
- Vercel caching headers (`Mhub/client/vercel.json`)

## 4. Functional Domains (End-to-End)

## 4.1 Identity, Authentication, and Session Security

Implemented capabilities:
- signup/login with password (`/api/auth/signup`, `/api/auth/login`)
- OTP login (`/api/auth/send-otp`, `/api/auth/verify-otp`)
- token refresh and logout (`/api/auth/refresh-token`, `/api/auth/logout`)
- forgot/reset password (`/api/auth/forgot-password`, `/api/auth/reset-password`)
- optional password setup for OTP-created users (`/api/auth/set-password`)
- current-session user info (`/api/auth/me`)

Security behavior present in code:
- refresh token rotation with server-side session hash tracking (`user_sessions`)
- login attempt lockout counters
- auth and OTP rate limiting
- secure cookie configuration for refresh token
- password strength checks using `zxcvbn`

2FA (TOTP):
- setup QR + secret (`/api/auth/2fa/setup`)
- verify and enable (`/api/auth/2fa/verify`)
- validate during auth flows (`/api/auth/2fa/validate`)
- disable and status endpoints

## 4.2 User Profile, KYC, Trust, and Admin Verification

User profile:
- `GET/PUT /api/users/profile`
- legacy profile endpoints under `/api/profile`

KYC:
- submit documents (`POST /api/users/kyc/submit`)
- status polling (`GET /api/users/kyc/status`)
- supports front/back image uploads and masked response fields

Admin verification workflows:
- pending verification listing
- review approve/reject
- private document view endpoint
- audit logging + user notification on decisions

Trust mechanics:
- trust score endpoint via post module (`/api/posts/trust/:userId`)
- role/tier-based controls in posting and admin middleware

## 4.3 Marketplace Posting and Listing Lifecycle

Post creation:
- `POST /api/posts` and `POST /api/posts/create`
- image uploads + optimization middleware
- tier-enforced quotas/credits and visibility expiry assignment

Post lifecycle:
- active -> sale_pending -> sold / expired / deleted / reactivated (controller + cron paths)
- mark sold (`POST /api/posts/:postId/sold`)
- reactivate (`POST /api/posts/:postId/reactivate`)
- delete/update endpoints

Engagement actions:
- view tracking (`POST /api/posts/:postId/view`, batch-view)
- like toggle (`POST /api/posts/:postId/like`)
- share tracking (`POST /api/posts/:postId/share`)

Related discovery utilities:
- similar items (`GET /api/posts/:postId/similar`)
- nearby search variants (`/api/posts/nearby`, `/api/posts/nearby-v2`)
- search v2 (`/api/posts/search-v2`)

## 4.4 Feed and Discovery

Feed families:
- base feed (`GET /api/feed`)
- my feed (`GET /api/feed/mine`)
- dynamic stratified feed (`GET /api/feed/dynamic`)
- trending (`GET /api/feed/trending`)
- random/chaos feed (`GET /api/feed/random`)
- nearby feed (`GET /api/feed/nearby`)
- feed search (`GET /api/feed/search`)
- impression tracking (`POST /api/feed/impression`)

Guaranteed reach:
- `GET /api/posts/for-you`
- supports fairness-oriented distribution, cache-backed behavior, and client filters

Recommendations:
- `GET /api/recommendations` with preference-aware filtering

Saved discovery helpers:
- saved searches (`/api/saved-searches`)
- wishlist (`/api/wishlist`)
- recently viewed (`/api/recently-viewed`)
- price alerts/history (`/api/price-alerts`, `/api/price-history`)

## 4.5 Negotiation, Sale Handshake, and Payments

Buyer/seller interaction:
- buyer inquiries (`/api/inquiries`)
- offer negotiation (`/api/offers`)

Dual-handshake sale flow (`/api/sale`):
1. seller initiates with buyer + price
2. system generates OTP and pending transaction
3. buyer confirms with OTP
4. transaction completes, post marked sold, rewards granted
5. pending transactions can be cancelled or auto-expired

Tier monetization and payments (`/api/payments`):
- UPI payment details retrieval
- payment submission with transaction ID
- admin verify/reject workflow
- user tier/subscription or credits updated after verification
- notification side effects on submit/verify/reject

## 4.6 Communication and Notifications

Chat:
- conversations/messages endpoints under `/api/chat`
- persistence in `messages` table
- realtime emission via Pusher helper (and Socket.IO server exists globally)

Notifications:
- fetch/read/delete/count endpoints under `/api/notifications`
- tier-aware priority + icon category mapping in controller
- notifications generated by many backend flows (payments, sales, subscriptions, verification)

Push notifications:
- token register/unregister/send/broadcast under `/api/push`
- service worker and firebase helper files exist client-side

## 4.7 Location, Nearby Intelligence, and Fraud Defense

Location capture and persistence:
- `/api/location` for history + profile sync behavior
- fallback and enrichment using IP and reverse geocoding paths

Nearby search:
- dedicated route `/api/nearby` with Haversine logic
- `/api/nearby/cities` for city distribution snapshot

Fraud/location safeguards:
- middleware checks timezone mismatch, impossible IP/GPS distance, suspicious coordinate precision
- device fingerprinting middleware available
- risk engine service for impossible travel/device churn scoring

## 4.8 Seller Analytics and Operations

Analytics routes (`/api/analytics`):
- device analytics ingestion
- seller dashboard stats
- post performance breakdown
- category breakdown
- device summary

Background jobs (`cronJobs`):
- post expiry processing
- expiry warning notifications
- subscription expiry checks
- stale transaction expiry and post restoration

## 4.9 Internationalization and Translation Pipeline

Client i18n:
- i18next chained backend (LocalStorage + HTTP)
- large language catalog set (global + regional + Indian language groups)
- RTL handling for supported RTL languages

Server translation queue:
- queue insertion on post creation
- batch processing endpoint (`/api/translation/process-translations`)
- status/stats endpoints

## 4.10 Compliance and Data Rights

GDPR routes (`/api/gdpr`):
- user data export
- account/data deletion with confirmation
- security event logging around sensitive actions

## 5. Frontend Route Map (Active in `App.jsx`)

Authentication:
- `/login`
- `/signup`
- `/forgot-password`
- `/reset-password`
- `/reset-password/:token`

Marketplace and discovery:
- `/all-posts`
- `/post/:id`
- `/feed`
- `/feed/:id`
- `/my-feed`
- `/for-you`
- `/search`
- `/categories`
- `/nearby`

Posting and inventory:
- `/add-post`
- `/post_add`
- `/feed/feedpostadd`
- `/bought-posts`
- `/sold-posts`
- `/saledone`
- `/saleundone`

User and trust:
- `/profile`
- `/security`
- `/verification`
- `/aadhaar-verify`
- `/kyc`

Monetization and gamification:
- `/tier-selection`
- `/tiers`
- `/pricing`
- `/payment`
- `/rewards`

Engagement:
- `/wishlist`
- `/recently-viewed`
- `/saved-searches`
- `/notifications`
- `/chat`
- `/feedback`
- `/complaints`

Admin and other:
- `/admin-panel`
- `/dashboard`
- `/my-home`
- `/home`
- `/my-recommendations`
- `/public-wall`

## 6. Backend API Capability Map (Mounted in `src/index.js`)

- `/api/auth` - signup/login/OTP/session/password recovery
- `/api/auth/2fa` - TOTP setup/verify/validate/status/disable
- `/api/users` - profile/tier/KYC operations
- `/api/profile` - legacy profile and preferences operations
- `/api/posts` - CRUD, for-you, nearby, trust, similar, engagement counters
- `/api/feed` - feed variants, search, impression tracking
- `/api/recommendations` - personalized listing recommendations
- `/api/categories` - categories lookup
- `/api/brands` - brands lookup with fallback defaults
- `/api/nearby` - location-radius listing and popular cities
- `/api/location` - location history capture and updates
- `/api/wishlist` - wishlist add/remove/list/check
- `/api/recently-viewed` - recent history tracking and management
- `/api/saved-searches` - persisted searches and notification toggles
- `/api/price-alerts` - subscribe/unsubscribe/list alert rules
- `/api/price-history` - price history and drop feeds
- `/api/inquiries` - buyer interest submission and seller processing
- `/api/offers` - offer create/list/respond
- `/api/sale` - OTP-based dual-handshake sale flow
- `/api/payments` - UPI submission + admin verification lifecycle
- `/api/rewards` - rewards profile and logs
- `/api/referral` - referral information endpoint
- `/api/notifications` - list/read/delete/unread count
- `/api/chat` - conversations, messages, unread counts
- `/api/push` - push token registration and send/broadcast utilities
- `/api/analytics` - seller/device analytics
- `/api/translation` - translation queue processing/status/stats
- `/api/gdpr` - data export/deletion
- `/api/admin` - admin verification document actions
- `/api/admin/dashboard` - admin dashboard metrics and moderation views
- `/api/dashboard`, `/api/feedback`, `/api/complaints` - additional app modules

Health:
- `/health`
- `/api/health` (includes DB connectivity check)

## 7. Database Overview

Primary bootstrap script:
- `Mhub/server/database/MHUB_ULTIMATE.sql`

Important behavior:
- this script drops and recreates core tables
- seeds demo users/data
- creates indexes and helper structures

Core tables (from bootstrap script):
- `users`, `profiles`, `categories`, `tiers`, `posts`
- `transactions`, `notifications`, `feedback`, `preferences`
- `user_locations`, `buyer_inquiries`, `reviews`
- `wishlists`, `recently_viewed`, `saved_searches`
- `price_history`, `offers`, `price_drop_alerts`
- `referrals`, `rewards`, `reports`, `promoted_posts`
- `user_verifications`, `push_tokens`, `post_metrics`

Additional structures from setup/migrations include:
- `translation_queue`, `verification_documents`, `user_contacts`
- security/performance and login history related tables

## 8. Security Model (Implemented Layers)

Backend:
- Helmet security headers
- CORS whitelist policy
- API and auth rate limiters
- JWT verification middleware
- input sanitization middleware
- account lock checks
- fraud/location spoof checks
- device tracking support
- optional recaptcha middleware

Frontend:
- runtime defense utilities (domain lock, anti-devtools hooks)
- LocationGate + analytics capture before full app usage
- token/device/timezone headers through centralized API service

## 9. Caching and Performance

Server caching:
- `cacheService` (node-cache in-memory)
- `redisCache` distributed cache with automatic memory fallback
- short-lived feed cache windows for high-frequency traffic

Query/data optimizations present:
- random feed TABLESAMPLE pattern
- tier-priority sorting patterns
- full-text/ILIKE fallback for search
- Haversine/geo SQL function usage where available

Client performance patterns:
- route-level lazy loading
- TanStack Query configuration
- language resource caching strategy

## 10. Environment Variables

Use templates:
- `Mhub/server/.env.example`
- `Mhub/client/.env.example`

Server variables (major):
- `PORT`, `NODE_ENV`
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `JWT_SECRET`, `REFRESH_SECRET` (or template alias `JWT_REFRESH_SECRET`)
- `CLIENT_URL`
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_DB`
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER`
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL`
- `RECAPTCHA_SECRET_KEY`
- `UPI_ID`, `MERCHANT_NAME`

Client variables (major):
- `VITE_API_BASE_URL`
- `VITE_PUSHER_KEY`, `VITE_PUSHER_CLUSTER`
- `VITE_RECAPTCHA_SITE_KEY`
- `VITE_VAPID_PUBLIC_KEY`

## 11. Local Setup and Run

Prerequisites:
- Node.js 20+
- npm
- PostgreSQL
- optional: Redis, Cloudinary, Pusher

1. Install server deps:
```bash
cd Mhub/server
npm install
```

2. Install client deps:
```bash
cd Mhub/client
npm install
```

3. Configure env files from examples:
- `Mhub/server/.env`
- `Mhub/client/.env`

4. Bootstrap database (warning: destructive bootstrap):
```bash
psql -U postgres -d mhub_db -f Mhub/server/database/MHUB_ULTIMATE.sql
```

5. Run backend:
```bash
cd Mhub/server
npm run dev
```

6. Run frontend:
```bash
cd Mhub/client
npm run dev
```

Expected dev endpoints:
- client: `http://localhost:8081` (from `vite.config.js`)
- API: `http://localhost:5000`

## 12. Tests and Validation Assets

Backend:
- `npm test` (Jest + Supertest basic health check)
- e2e helper scripts in `Mhub/server/tests/e2e` (Python/Playwright + requests)

Frontend:
- `npm test` (Vitest basic test scaffold)

Additional QA docs:
- `Mhub/server/docs/TEST_CASES.md`
- `Mhub/server/docs/TEST_VALIDATION.md`

## 13. Deployment Notes

Backend start scripts:
- `npm start` runs `scripts/start-prod.js` (port auto-clear + restart logic)
- PM2 and Nginx reference configs are included for clustered deployment patterns

Frontend build:
```bash
cd Mhub/client
npm run build
npm run preview
```

Caching headers:
- Vercel config sets long cache headers for locales/assets

## 14. Known Gaps / Technical Debt Observed

1. Route files present but not mounted in current server bootstrap:
- `aadhaar`, `audit`, `channel`, `channels`, `dailycode`, `feeds`, `loginAudit`, `products`, `saleundone`, `transactions`

2. Frontend references some endpoints that are not mounted or not implemented in current server wiring:
- examples include Aadhaar/channel/publicwall/banner and some location/chat helper paths

3. `feedController` uses `feedCache` in trending flow without local declaration in that file version.

4. PM2 config references `./src/server.js`, but active entrypoint is `./src/index.js`.

5. API base usage is inconsistent between some client modules (`/api` prefixed raw fetch) and centralized axios base URL assumptions.

6. PWA assets exist (`manifest.json`, `sw.js`) but service worker registration/manifest wiring is not fully visible in active bootstrap.

7. Mixed legacy and newer modules coexist (duplicate/overlapping controllers/routes), so endpoint behavior should be validated per environment before release.

## 15. Recommended Next Cleanup Pass

1. Standardize a single API base URL convention across all client API callers.
2. Mount or remove stale routes to avoid drift.
3. Fix PM2 entrypoint and verify cluster startup.
4. Resolve feed trending cache variable inconsistency.
5. Add OpenAPI spec generation from mounted routes.
6. Add real integration tests for auth, post create, feed, sale, and payments flows.
7. Add explicit migration orchestration script (ordered + idempotent) beyond manual SQL calls.
8. Formalize env docs with required vs optional flags per deployment profile.
9. Consolidate duplicate profile/user modules and duplicate route families.
10. Add CI checks to detect client/server endpoint mismatches.

---

Maintainer note: this README is based on current code wiring in `Mhub/server/src/index.js`, route/controller implementations, and client route composition in `Mhub/client/src/App.jsx`.

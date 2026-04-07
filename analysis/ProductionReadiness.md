# MHub Production Readiness Audit Report

**Date**: April 7, 2026 (Rev 3)  
**Scope**: Full-stack — Client (React 18 + Vite 5) · Server (Express 5 + PostgreSQL 17) · Database · Deployment · UI/UX · Dark Mode  
**Overall Score**: **76/100** (up from 72 — CORS, error leaks, dark mode, scroll-to-top all fixed)

---

## Severity Legend

| Level | Meaning |
|-------|---------|
| **P0 – CRITICAL** | Must fix before production. Security risk or data loss. |
| **P1 – HIGH** | Major functional/operational gap. Fix before launch. |
| **P2 – MEDIUM** | Should fix for quality launch. Acceptable short-term risk. |
| **P3 – LOW** | Nice-to-have. Post-launch is fine. |

---

## Scorecard

| Category | Score | Notes |
|----------|-------|-------|
| Security | 9/10 | Auth bypass fixed. Stack leak fixed. CORS prod-filtered. |
| API Stability | 8/10 | Error leaks fixed. Input validation gaps remain. |
| Database | 7.5/10 | Migrations created for indexes, updated_at, disputes. |
| Client Quality | 7/10 | Good architecture. Dark mode CSS bugs remain. |
| UI/UX Dark Mode | 7/10 | Template literal bugs fixed. Hardcoded inline colors tracked. |
| Test Coverage | 5/10 | 132 test files but 30% threshold too low. |
| Deployment | 6.5/10 | Vercel + PM2 configured. No Docker. |
| Performance | 8.5/10 | Good code-splitting, lazy loading. Scroll restoration added. |
| SEO | 6/10 | Static meta only. No per-page titles. |
| Accessibility | 6/10 | Missing labels on interactive elements. |
| Feature Completeness | 7.5/10 | Core flows work. Missing 2FA, email verify. |

---

## P0 – CRITICAL BLOCKERS

### 1. Localhost Auth Bypass in Production
- **File**: `server/src/routes/auth.js` (line ~62)
- **Issue**: `ALLOW_LOCALHOST_AUTH_BYPASS` defaults to `true`. Behind a reverse proxy, spoofed `X-Forwarded-For: 127.0.0.1` headers could bypass auth rate limits.
- **Fix**: Default to `false`. Only enable via explicit env var in dev.
- **Status**: ✅ FIXED

### 2. Hardcoded Secrets in Source
- **Files**: `server/generate-sql.js` (line 4), `server/generateHash.js` (line 15)
- **Issue**: Hardcoded bcrypt hash for `Password123` and `Test@12345` in source files.
- **Fix**: Remove both files from production deployment. Add `.gitignore` entries.
- **Status**: ✅ FIXED

### 3. Error Handler Leaks Stack Traces
- **File**: `server/src/middleware/errorHandler.js` (line ~83)
- **Issue**: Sends raw error objects (including stack traces) when `NODE_ENV` is not explicitly `production`.
- **Fix**: Default to suppressing stack traces. Only expose in `development`.
- **Status**: ✅ FIXED

### 4. Soft-Deleted Posts Don't Clean Up Files
- **File**: `server/src/controllers/postController.js` (line ~1943)
- **Issue**: `deletePost` marks status as `'deleted'` but never removes uploaded images from disk/Cloudinary. Unbounded storage growth.
- **Fix**: Add file cleanup logic in post deletion flow.
- **Status**: ✅ FIXED

### 5. SQL Seed Data in Production Script
- **File**: `server/database/MHUB_ULTIMATE.sql`
- **Issue**: Contains `DROP TABLE` cascades and 120+ seed `INSERT` statements mixed with schema DDL. Running in production would wipe all data.
- **Fix**: Separate schema DDL from seed data into `schema.sql` and `seed-dev.sql`.
- **Status**: ✅ FIXED

---

## P1 – HIGH PRIORITY

### 6. Hardcoded `localhost:5001` in Client Services
- **Files**:
  - `client/src/services/api.js` (lines 38–41)
  - `client/src/services/locationService.js` (line 114)
  - `client/src/lib/backendPreflight.js` (line 14)
- **Issue**: Hardcoded dev backend origins. `locationService.js` has a direct reference outside any dev guard.
- **Fix**: Ensure all localhost refs are gated behind hostname checks.
- **Status**: ✅ FIXED

### 7. `alert()` Calls in Production Components
- **Files**:
  - `client/src/components/BargainActions.jsx` (lines 75, 79)
  - `client/src/components/PriceAlertButton.jsx` (line 23)
- **Fix**: Replace with toast notifications.
- **Status**: ✅ FIXED

### 8. No 2FA / MFA
- **Issue**: No TOTP or SMS-based second factor. For a marketplace handling financial transactions, this is a trust gap.
- **Fix**: Implement optional TOTP-based 2FA for seller accounts.
- **Status**: 🔲 DEFERRED (post-launch feature)

### 9. No Email Verification Flow
- **Issue**: Users can sign up and transact without confirming their email address.
- **Fix**: Add email verification before allowing posting/selling.
- **Status**: 🔲 DEFERRED (post-launch feature)

### 10. No DOMPurify on Client-Side UGC Rendering
- **Issue**: Server sanitizes input, but client doesn't use DOMPurify for user-generated content. XSS possible if server sanitization bypassed.
- **Fix**: Add DOMPurify wrapper for UGC rendering.
- **Status**: ✅ FIXED

### 11. Missing `updated_at` on Critical Tables
- **Tables**: `profiles`, `categories`, `subcategories`, `tiers`, `referrals`, `rewards`, `reward_log`, `notifications`, `feedback`, `channels`, `buyer_inquiries`, `reviews`, `wishlists`, `recently_viewed`, `price_history`
- **Fix**: Add migration with `updated_at TIMESTAMP DEFAULT NOW()` columns + trigger.
- **Status**: ✅ FIXED (migration created)

### 12. Missing Indexes on Foreign Keys
- **Tables**: `referrals(referrer_id)`, `referrals(referee_id)`, additional FK indexes needed.
- **Fix**: Add performance indexes migration.
- **Status**: ✅ FIXED (migration created)

### 13. No Refund/Dispute Fields in Transactions Table
- **Issue**: `transactions` table has no `refund_status`, `refund_amount`, `dispute_id`, or `dispute_reason` columns. Marketplace needs dispute resolution.
- **Fix**: Add migration with dispute/refund columns.
- **Status**: ✅ FIXED (migration created)

### 14. Test Coverage Thresholds at 30%
- **File**: `server/jest.config.cjs`
- **Issue**: 30% branch/function/line/statement coverage is dangerously low.
- **Fix**: Raise to 60% lines, 50% branches.
- **Status**: 🔲 DEFERRED (incremental improvement)

### 15. Premium Feature Override Hardcoded
- **Files**:
  - `client/src/pages/CreateChannelPage.jsx` (line 48) — `isPremium = !0 // TODO`
  - `server/src/routes/channels.js` (line 12) — `FORCE_PREMIUM_CENTREPAGE = true // TODO`
- **Fix**: Remove overrides, use actual tier checks.
- **Status**: ✅ FIXED

### 16. No Docker Configuration
- **Issue**: No Dockerfile or docker-compose.yml. Environment drift risk.
- **Fix**: Create Dockerfiles for development reproducibility.
- **Status**: 🔲 DEFERRED (post-launch infra)

---

## P2 – MEDIUM PRIORITY

### 17. Broken Dark Mode CSS Template Literals (4 pages)
- **`PublicWall.jsx` (line 422)**: `dark:border${getRankStyle(...)}` → missing space → invalid class
- **`Profile.jsx` (line 4092)**: `dark:border${r.border}` and `dark:bg-gradient-to-br${r.accent}` → missing spaces
- **`ForYou.jsx` (line 1273)**: `dark:text-xs${condition}` → missing space → broken conditional classes
- **`Chat.jsx` (line 462)**: `dark:border-r${selectedConversation}` → "hidden" concatenated into class name
- **Fix**: Add space before `${` in all 4 files
- **Status**: ✅ FIXED

### 18. CORS Allows Localhost Origins in Production
- **File**: `server/src/index.js` (line ~258)
- **Issue**: `defaultCorsOrigins` includes 5 localhost ports. These are merged into `configuredCorsOrigins` regardless of `NODE_ENV`. An attacker could serve from `localhost:5173` on a victim machine.
- **Fix**: Only include `defaultCorsOrigins` when `isDevelopment`.
- **Status**: ✅ FIXED

### 19. 20+ Controllers Leak Internal Errors
- **Pattern**: `res.status(500).json({ error: err.message })` leaks DB/logic errors to client.
- **Files**: `notificationController.js` (6), `wishlistController.js` (4), `channelController.js` (5), `profileController.js` (2), `postController.js` (3), `saleundoneController.js` (1)
- **Fix**: Replace with generic "Internal server error" message. Log actual error server-side.
- **Status**: ✅ FIXED

### 20. Hardcoded Inline Colors Break Dark Mode
- **Files**: `PaymentPage.jsx` (line 739), `MyFeedPage.jsx` (line 703), `RewardsSections.jsx` (line 275), `PwaEnhancements.jsx` (line 88)
- **Issue**: Inline `style={{ background: '#ffffff' }}` that won't adapt to dark mode.
- **Status**: 🔲 TRACKED (cosmetic — low risk)

### 21. Redundant Dark Mode Toggle in GreenNavbar
- **File**: `client/src/components/GreenNavbar.jsx` (line ~101)
- **Issue**: Manages its own `darkMode` state separately from `ThemeContext`. Potential conflicts.
- **Status**: 🔲 TRACKED

### 22. No Global Scroll-to-Top on Navigation
- **File**: `client/src/App.jsx`
- **Issue**: No `ScrollRestoration` or `window.scrollTo(0,0)` on route change. Pages retain scroll position.
- **Fix**: Added `ScrollToTop` component using `useLocation` from react-router-dom.
- **Status**: ✅ FIXED (Rev 3)

### 23. ~30 Console.log Statements in Client
- 15+ files with unguarded `console.log`. Top offenders: `utils/security.js` (5), `App.jsx` (4), `lib/auth.js` (3).
- **Fix**: Remove or wrap in `import.meta.env.DEV`.

### 24. ESLint `no-unused-vars: off`
- `client/eslint.config.js` (line 32) has unused variable detection disabled. Dead code accumulates.
- **Fix**: Set to `warn`.

### 19. No Dynamic Page Titles (SEO)
- No `react-helmet` or equivalent. All pages share static `<title>` from `index.html`.
- **Fix**: Add `react-helmet-async` per page.

### 20. Orphan Page Files
- Files with no route: `FeedPostAdd.jsx`, `Profile.backup.jsx`, `AadhaarVerify.jsx`, `index.jsx`.
- **Fix**: Remove or wire up.

### 21. Global Event Listeners Without Cleanup
- `utils/security.js` adds `contextmenu`/`keydown` listeners with no removal.
- `utils/codeProtection.js` uses `setInterval` debugger trap with no cleanup.
- Potential memory leaks in SPA navigation.

### 22. Static Assets Not Optimized
- `client/public/products/` contains `.png` files. Server converts uploads to `.webp` but static assets remain PNG.
- **Fix**: Convert to `.webp`.

### 23. No API Documentation (Swagger/OpenAPI)
- 100+ endpoints undocumented.
- **Fix**: Add `swagger-jsdoc` + `swagger-ui-express`.

### 24. Accessibility Gaps
- Icon-only buttons in `AudioRecorder.jsx`, `DealsCarousel.jsx` missing `aria-label`.
- Several `<img>` tags missing `alt`.

### 25. Database Pool Size Not Tuned
- `db.js` defaults max pool to 20. With PM2 cluster mode × cores, could exceed PG `max_connections`.
- **Fix**: Set `DB_POOL_MAX` relative to PM2 instances.

### 26. Catch-All Route Shows No 404 Page
- `App.jsx` (line 441) `path="*"` redirects to `/category-hub` instead of showing 404.
- **Fix**: Create a proper 404 page.

### 27. Rate-Limit Skips on Key Paths
- `security.js` skips rate limiting on `/api/posts` and `/api/location`. Vulnerable to scraping.
- **Fix**: Apply specialized (higher threshold) limits.

### 28. `window.location.reload` in 6 Places
- Forced reloads in `App.jsx`, `main.jsx`, `CentreListings.jsx`, `SubscriptionPlans.jsx` — causes state loss.
- **Fix**: Replace with React state management.

---

## P3 – LOW PRIORITY

### 29. Duplicate Route Aliases
- `/listings` → `/all-posts`, `/sell` → `/add-post`, `/pricing` → `/tier-selection`, `/chats` → `/chat`.

### 30. Dual Hashing Libraries
- Server has both `bcrypt` and `argon2`. Standardize on `argon2`.

### 31. No Stripe Support
- Only Razorpay. Consider Stripe for international users.

### 32. Translation Worker is Only Background Job
- Only `translationWorker.js` in `server/worker/`. Missing: file cleanup, abandoned cart, rating reminders, report aggregation.

### 33. Category-Mode Dead Code Remains
- `categoryModeFilters.js`, `CategoryModeContext.jsx`, and imports across 10+ files still exist after route removal.

### 34. Missing `react-helmet-async` for Server-Side Meta
- Static OG meta tags. Rich link previews won't vary by page.

### 35. No Rate Limiting on WebSocket Events
- Socket.io has auth but no event-level throttling. Chat message flooding possible.

---

## Recommended Launch Sequence

1. **Fix all P0 items** (5 issues) — Security + data safety
2. **Fix P1 items** 6, 7, 10, 15 — Client-facing quality
3. **Fix P1 items** 11, 12, 13 — Database migrations
4. **Deploy to staging** with production env vars
5. **Run full test suite** against staging
6. **Launch** with P2/P3 as tracked technical debt

---

## Files Changed in This Audit

| File | Change |
|------|--------|
| `server/src/routes/auth.js` | Default bypass to `false` |
| `server/generate-sql.js` | Added to `.gitignore` |
| `server/generateHash.js` | Added to `.gitignore` |
| `server/src/middleware/errorHandler.js` | Stack trace suppression default |
| `server/src/controllers/postController.js` | File cleanup on delete |
| `server/database/MHUB_ULTIMATE.sql` | Warning header added |
| `server/database/schema-only.sql` | Schema DDL extracted |
| `server/database/seed-dev-only.sql` | Seed data extracted |
| `client/src/services/locationService.js` | Localhost guard added |
| `client/src/components/BargainActions.jsx` | alert → toast |
| `client/src/components/PriceAlertButton.jsx` | alert → toast |
| `server/src/routes/channels.js` | Premium override removed |
| `client/src/pages/CreateChannelPage.jsx` | Premium override removed |
| `server/database/migrations/prod_readiness_*.sql` | New migrations |

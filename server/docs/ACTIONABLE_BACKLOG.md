# MHub — Actionable Implementation Backlog

> Consolidated from deleted analysis files (`NEGATIVES.md`, `POSITIVES.md`, `NEGATIVES_DETAILED.md`, `POSITIVES_DETAILED.md`, `latest_md_txt.md`). Cross-referenced with already-completed fixes.
> 
> Date: 2026-03-30

---

## Already Fixed ✅ (Prior Sessions)

| # | Issue | Fix Applied | Session |
|---|-------|-------------|---------|
| 1 | Regex-only XSS sanitization | Replaced with `sanitize-html` in `security.js` | Remediation |
| 2 | Socket.IO rooms lack JWT auth | Added JWT middleware + room membership checks in `index.js` | Remediation |
| 3 | `authController.js` minified | Unminified with Prettier | Remediation |
| 4 | CI security audit not blocking | Added `npm audit` gates + Playwright smoke tests to `ci.yml` | Remediation |
| 5 | `.env` not in `.gitignore` | Added to `.gitignore` | P0 Fixes |
| 6 | `express-slow-down` missing | Installed in server | P0 Fixes |
| 7 | Duplicate error handlers in `index.js` | Removed redundant handlers | P0 Fixes |
| 8 | `user_id` fallback in `postController.js` | Fixed security vulnerability | P0 Fixes |
| 9 | Language switching broken | Fixed 3 switcher components + deleted dead `LanguageContext.jsx` | Current |
| 10 | 15 legacy `.bak` files | Purged | Remediation |
| 11 | `App.js` + `App.css` CRA leftovers | Removed | Remediation |
| 12 | Workspace junk files (~105MB) | Cleaned up | Current |
| 13 | C2: `subscriptionExpiry.js` dynamic column | Added `ALLOWED_PLAN_COLUMNS` whitelist | Current |
| 14 | C4: `AUTH_EXPOSE_TEST_SECRETS` in API response | Removed — tokens no longer in API response | Current |
| 15 | H14: `check-performance-budget.mjs` `<= 0` bug | Changed to `< 0` on lines 70 & 93 | Current |
| 16 | `.gitignore` missing patterns | Added 30+ patterns for dumps, caches, backups | Current |
| 17 | git tracked junk files | `git rm --cached` test1.json, test2.json | Current |

---

## 🔴 CRITICAL — Fix Immediately

### ~~C1. SQL Injection — `translationWorker.js`~~ ✅ Already Fixed
### ~~C2. SQL Injection — `subscriptionExpiry.js`~~ ✅ Fixed (whitelist added)
### ~~C3. Real Credentials in Archived `.env`~~ ✅ Already Removed
### ~~C4. Test Mode Secret Exposure~~ ✅ Fixed (removed from API response)

### C5. Promo Code Race Condition
**File:** `server/src/services/tierRules.js`
- In-memory `usedCount++` → resets on restart, race on concurrent requests
- **Fix:** Move promo tracking to DB with atomic `UPDATE ... RETURNING`

### ~~C6. `MHUB_ULTIMATE.sql` Has `DROP TABLE` at Top~~ ✅ Already Fixed

### C7. INT vs UUID Inconsistency
- `MHUB_ULTIMATE.sql` uses `SERIAL` (integers), newer tables use `UUID`
- Controllers use `::text` casts as workaround → verification fields permanently `NULL`
- **Fix:** Complete the UUID migration across all tables

### ~~C8. `nuke-payments.js`~~ ✅ Already has env guard + confirmation prompt

---

## 🟠 HIGH — Fix Before Next Release

### H1. SSRF — No Internal IP Validation
**Files:** `paymentController.js`, `AadhaarService.js`
- Outbound HTTP calls don't block internal IPs (127.0.0.1, 169.254.169.254)
- **Fix:** Add URL validation middleware blocking private/internal IP ranges

### H2. Rate Limiter In-Memory (Resets on Restart)
**File:** `rateLimiter.js`, `security.js`
- IP request counts in `Map()` → resets on PM2 restart
- **Fix:** Move to Redis-backed rate limiting

### H3. Feed Query Self-Post Exclusion Bug
**File:** `server/src/queries/feedQuery.js`
- OR logic shows ALL posts (including user's own) when `uid IS NULL`
- **Fix:** Change to AND logic for self-exclusion

### H4. Guaranteed Reach Query — `RANDOM()` Defeats Pagination
**File:** `server/src/queries/guaranteedReachQuery.js`
- `RANDOM()` in hash makes shuffle non-deterministic → posts repeat across pages
- **Fix:** Use a seeded hash without `RANDOM()`

### H5. `authUtils.js` — Unbounded `failedAttempts` Map
**File:** `server/src/utils/authUtils.js`
- Never cleared on successful login → OOM under sustained attack
- **Fix:** Clear entry on successful login, add TTL sweep

### H6. `auditLogger.js` — Fire-and-Forget Writes
**File:** `server/src/config/auditLogger.js`
- `fs.appendFile` called without `await` → audit entries lost on crash
- **Fix:** Add `await` to all audit writes

### H7. Duplicate `activate` Listener in `push-sw.js`
**File:** `client/public/push-sw.js`
- Two `activate` handlers → stale caches not cleared after SW update
- **Fix:** Consolidate into single `activate` handler

### H8. RBAC DB Query on Every Request
**File:** `server/src/middleware/rbac.js`
- SELECT on `users` table for every route → performance bottleneck
- **Fix:** Cache role in JWT claims during login

### H9. Nested Duplicate Directories
```
server/src/controllers/controllers/   ← accidental double-nesting
server/src/routes/routes/             ← accidental double-nesting
```
- **Fix:** Flatten to single level, verify which files are actually imported

### H10. Duplicate Controller/Route Files
| Singular | Plural |
|----------|--------|
| `rewardController.js` | `rewardsController.js` |
| `feed.js` | `feeds.js` |
| `channel.js` | `channels.js` |
- **Fix:** Keep one, redirect or delete the other

### H11. Triple API Client
```
client/src/api.js            ← Legacy shim
client/src/lib/api.js        ← "Smart" client (219 lines)
client/src/services/api.js   ← "Defence" client (574 lines)
```
- **Fix:** Consolidate into single client with consistent interceptors

### H12. Verification Fields Permanently `NULL`
**File:** `postController.js` — `NULL as aadhaar_verified, NULL as pan_verified`
- Trust indicators broken for all sellers
- **Fix:** Re-enable after UUID migration (C7)

### H13. Verification Simulation
**File:** `client/src/pages/GetVerified.jsx`
- Uses `setTimeout` to simulate Aadhaar verification instead of real backend call
- **Fix:** Connect to actual verification backend

### H14. `check-performance-budget.mjs` — `<= 0` Bug
**File:** `client/scripts/check-performance-budget.mjs`
- `if (budget <= 0) continue;` skips zero-budget checks silently
- **Fix:** Change to `if (budget < 0) continue;`

### H15. Navbar Re-renders on Every Keystroke
**File:** `GreenNavbar.jsx` (~450 lines)
- Search input state causes full header tree re-render
- **Fix:** Extract search into isolated `SearchOverlay` component with own state

### H16. Image Carousel Loads All At Once
**File:** `PostImageCarousel.jsx`
- All images loaded simultaneously instead of lazy-loading
- **Fix:** Lazy-load images beyond viewport

### H17. Cache Stampede — No Lock on Expired Cache
**File:** `server/src/config/redisCache.js`
- Thundering herd on expired keys
- **Fix:** Add single-flight/mutex for cache population

---

## 🟡 MEDIUM — Planned Improvements

### Architecture & Code Quality
| # | Item | File(s) |
|---|------|---------|
| M1 | Split `authController.js` into 5 sub-controllers | `authController.js` |
| M2 | Split `Rewards.jsx` (1300 lines, 30 useState) into sub-components | `Rewards.jsx` |
| M3 | AuthContext god object (450 lines, 15+ state vars) — causes global re-renders | `AuthContext.jsx` |
| M4 | Consolidate 15+ duplicate components (3 language selectors, 3 category grids, 3 skeletons, 3 deals carousels) | Multiple |
| M5 | Delete duplicate pages (`PostDetail` vs `PostDetails` vs `PostDetailView`, `PostAdd` vs `Post_add` vs `AddPost`) | Multiple |
| M6 | Move `locationService.js` (1200 lines, Kalman filters) to Web Worker | `locationService.js` |
| M7 | Consolidate 50+ translation scripts into proper i18n workflow | `server/scripts/` |
| M8 | Remove `window.__MHUB_API_ORIGIN_OVERRIDE__` (XSS attack surface) | `services/api.js` |
| M9 | Delete dead CSS files (Skeleton.css, StarRating.css, ErrorState.css, etc.) | Multiple |

### Database & Migrations
| # | Item | File(s) |
|---|------|---------|
| M10 | Add migration tracking table (`schema_migrations`) | Database |
| M11 | Fix migration `008` numbering collision | 2 migration files |
| M12 | Add `down.sql` rollback scripts for all migrations | Database |
| M13 | Fix `subscriptionExpiry.js` N+1 query pattern | `subscriptionExpiry.js` |
| M14 | Fix silent `.catch(() => {})` in `subscriptionExpiry.js` | `subscriptionExpiry.js` |
| M15 | Consolidate duplicate locale files (`src/locales/` vs `public/locales/`) | 52+ files |
| M16 | Fix off-by-one in `cronJobs.js` expiry warning (`>` → `>=`) | `cronJobs.js` |

### Security & Infrastructure
| # | Item | File(s) |
|---|------|---------|
| M17 | Hardcoded canonical URL `example.com` in `index.html` + `sitemap.xml` | 2 files |
| M18 | Create `client/.env.example` (document required frontend env vars) | New file |
| M22 | PM2 `instances: 'max'` → `os.cpus().length - 1` | `ecosystem.config.js` |
| M23 | Remove double compression (Express + Nginx both compress) | `index.js` + `nginx.conf` |

### Testing & CI
| # | Item | File(s) |
|---|------|---------|
| M24 | Add Playwright E2E tests to CI pipeline | `.github/workflows/` |
| M25 | Add jest coverage thresholds | `jest.config.cjs` |
| M26 | Restore Docker infrastructure (Dockerfile, docker-compose) | New files |

### Performance & UX
| # | Item | File(s) |
|---|------|---------|
| M27 | Move in-memory state to Redis (6 services: security, telemetry, socket, rate limiter, activity) | 6+ services |
| M28 | Add `AbortController` to all `useEffect` fetch calls | Multiple hooks/pages |
| M29 | `useFeed` — O(n) synchronous filtering on every render | `useFeed.js` |
| M30 | Add `aria-label` to language selector, location selector, filter controls | Multiple components |
| M31 | Service Worker update prompt ("Click to Refresh") | `sw.js`, `pwa.js` |
| M32 | Re-enable ESLint rules (`no-unused-vars`, `react-hooks/exhaustive-deps`) | `eslint.config.js` |

### Files to `git rm --cached` (Still Tracked)
| # | File | Reason |
|---|------|--------|
| 1 | `client/stderr.txt` | Generated build output |
| 2 | `client/lint_log.txt` | Linter output |
| 3 | `server/hash.txt` | Debug artifact |
| 4 | `server/hash_out.txt` | Debug artifact |
| 5 | `server/migration_log.txt` | Runtime output |
| 6 | `server/schema_log.txt` | Schema dump |
| 7 | `server/posts_schema.txt` | Schema dump |
| 8 | `server/users_schema.txt` | Schema dump |
| 9 | `server/TEST_USER_SQL.txt` | Test credentials risk |
| 10 | `server/tests/test1.json` | Test artifact |
| 11 | `server/tests/test2.json` | Test artifact |
| 12 | `server/scripts/audit_report.txt` | Generated |
| 13 | `server/scripts/missing-keys.txt` | Generated |
| 14 | `server/scripts/verification_report.txt` | Generated |
| 15 | `server/scripts/hardcoded-strings-audit.generated.md` | Generated |

---

## Summary

| Priority | Count | Status |
|----------|-------|--------|
| Already Fixed ✅ | 12 | Done |
| 🔴 Critical | 8 | Pending |
| 🟠 High | 17 | Pending |
| 🟡 Medium | 32 | Pending |
| **Total Remaining** | **57** | |

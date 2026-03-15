# Mhub Codebase Optimization Plan

> **Created**: 2026-03-15
> **Goal**: Analyze entire codebase, optimize for readability, maintainability, and production-readiness
> **Status**: IN PROGRESS

---

## Summary of Codebase

| Area | Total Files | Minified | Already Optimized | Needs Work |
|------|-------------|----------|-------------------|------------|
| Server Controllers | 39 | 9 | 17 (with shared helpers) | 13 |
| Server Routes | 68 | ~45 | ~23 | ~45 |
| Server Services | 52 | ~20 | ~32 | ~20 |
| Server Middleware | 33 | ~10 | ~23 | ~10 |
| Server Config | 11 | ~5 | ~6 | ~5 |
| Server Jobs | 1 | 1 | 0 | 1 |
| Server Entry (index.js) | 1 | 1 | 0 | 1 |
| Client Components | 107 | ~20 | ~87 | ~20 |
| Client Pages | 71 | ~50 (minified vars) | ~21 | ~50 |
| Client UI | 40 | ~16 | ~24 | ~16 |

---

## Phase 1: Deminify Remaining Server Controllers (9 files) ⬜ PENDING

**Priority**: HIGH — These are core business logic files

| # | File | Size | Status |
|---|------|------|--------|
| 1 | `adminDocController.js` | minified | ⬜ Pending |
| 2 | `analyticsController.js` | minified | ⬜ Pending |
| 3 | `inquiryController.js` | minified | ⬜ Pending |
| 4 | `paymentController.js` | minified | ⬜ Pending |
| 5 | `postGuaranteedReachController.js` | minified | ⬜ Pending |
| 6 | `rewardController.js` | minified | ⬜ Pending |
| 7 | `translationController.js` | minified | ⬜ Pending |
| 8 | `twoFactorController.js` | minified | ⬜ Pending |
| 9 | `userController.js` | minified | ⬜ Pending |

**Pattern for each file**:
- Import shared helpers from `../utils/dbHelpers` and `../utils/parseHelpers`
- Remove duplicate local `runQuery`, `parseOptionalString`, `parsePositiveInt`, `getAuthUserId`
- Reformat from single-line to 2-space indentation
- Fix SQL injection (string interpolation in queries → parameterized)
- Fix auto-migrate DDL (CREATE TABLE on every request → cached promise)
- Add JSDoc comments on exported functions

---

## Phase 2: Deminify server/src/index.js (Critical Entry Point) ⬜ PENDING

**Priority**: CRITICAL — This is the server entry point, currently 17,975 chars on one line

**Tasks**:
- [ ] Reformat to readable multi-line code
- [ ] Document all route mounts (~50+ routes)
- [ ] Document middleware chain order
- [ ] Document Socket.IO configuration
- [ ] Document graceful shutdown logic
- [ ] Verify all route imports resolve

---

## Phase 3: Deminify Minified Routes, Config, Jobs ⬜ PENDING

**Priority**: HIGH — Routes wire controllers to endpoints

### Routes (~45 minified files)
| # | File | Status |
|---|------|--------|
| 1 | `admin.js` (221KB!) | ⬜ |
| 2 | `adminDashboard.js` | ⬜ |
| 3 | All other 0-line route files | ⬜ |

### Config (~5 minified files)
| # | File | Status |
|---|------|--------|
| 1 | `jwtConfig.js` | ⬜ |
| 2 | `redisCache.js` | ⬜ |
| 3 | `redisSession.js` | ⬜ |
| 4 | `auditLogger.js` | ⬜ |
| 5 | `pusher.js` | ⬜ |

### Jobs
| # | File | Status |
|---|------|--------|
| 1 | `cronJobs.js` (minified) | ⬜ |

---

## Phase 4: Deminify Minified Client Components ⬜ PENDING

**Priority**: MEDIUM — UI building blocks

### Minified Components (~20 files)
| # | File | Status |
|---|------|--------|
| 1 | `ErrorBoundary.jsx` | ⬜ |
| 2 | `LoginPromptModal.jsx` | ⬜ |
| 3 | `MakeOfferModal.jsx` | ⬜ |
| 4 | `RouteTelemetry.jsx` | ⬜ |
| 5 | `TransactionStepper.jsx` | ⬜ |
| 6 | `AadhaarOtpVerify.jsx` | ⬜ |
| 7 | `BargainActions.jsx` | ⬜ |
| 8 | `BuyerInterestModal.jsx` | ⬜ |
| 9 | `EmptyState.jsx` | ⬜ |

### Minified UI Components (~16 files)
| # | File | Status |
|---|------|--------|
| 1 | `button.jsx` | ⬜ |
| 2 | `card.jsx` | ⬜ |
| 3 | `dialog.jsx` | ⬜ |
| 4 | `label.jsx` | ⬜ |
| 5 | `switch.jsx` | ⬜ |
| 6 | `tabs.jsx` | ⬜ |
| 7 | `textarea.jsx` | ⬜ |
| 8 | `toast.jsx` | ⬜ |
| 9 | `toaster.jsx` | ⬜ |
| 10 | `checkbox.jsx` | ⬜ |
| 11 | `alert-dialog.jsx` | ⬜ |
| 12 | `alert.jsx` | ⬜ |
| 13 | `avatar.jsx` | ⬜ |
| 14 | `badge.jsx` | ⬜ |
| 15 | `dropdown-menu.jsx` | ⬜ |
| 16 | `use-toast.jsx` | ⬜ |

---

## Phase 5: Deminify Minified Client Pages ⬜ PENDING

**Priority**: MEDIUM — Many pages have minified variable names

Large pages with minified code that need full reformatting:
- Most pages in `client/src/pages/` use obfuscated variable names (n, E, K, W, r, i, q, F)
- Need to restore meaningful variable names and proper formatting

---

## Phase 6: Update Shared Helper Imports Across Server ⬜ PENDING

**Priority**: HIGH — Eliminate code duplication

**Files needing shared helper migration**:
- `channelController.js` — has own helpers, not using dbHelpers
- `gdprController.js` — has own helpers, not using dbHelpers
- `dailyCodeController.js` — not using dbHelpers
- `locationVerificationController.js` — not using dbHelpers
- `postActionsController.js` — not using dbHelpers
- `productController.js` — not using dbHelpers
- `publicWallController.js` — not using dbHelpers
- `saleundoneController.js` — not using dbHelpers
- `tiersController.js` — not using dbHelpers (already formatted)
- `recentlyViewedController.js` — uses dbHelpers but not parseHelpers
- `profileController.js` — uses dbHelpers but not parseHelpers
- `postController.js` — uses dbHelpers but not parseHelpers
- `complaintsController.js` — uses dbHelpers but not parseHelpers
- `categoryController.js` — not importing shared properly
- `coinController.js` — uses dbHelpers but not parseHelpers
- Routes, services, middleware — ~117 files still using local helpers

---

## Phase 7: Fix SQL Injection and Security Issues ⬜ PENDING

**Priority**: CRITICAL

| # | Issue | File | Fix |
|---|-------|------|-----|
| 1 | String interpolation in INTERVAL | `cronJobs.js` | Use `$N::interval` parameterized |
| 2 | Any remaining string interpolation in queries | All controllers | Audit and parameterize |
| 3 | Port mismatch (5000 vs 5001) | Root `.env` | Update to 5001 |
| 4 | Missing error handling | Services (12+ files) | Add try/catch |

---

## Phase 8: React Performance Optimizations ⬜ PENDING

**Priority**: MEDIUM

**Components needing React.memo/useCallback**:
- ~92 components not using any optimization
- Inline onClick handlers in ~20 pages
- Large monolithic pages to consider breaking down:
  - `GreenNavbar.jsx` (1,783 lines)
  - `Rewards.jsx` (2,441 lines)
  - `AllPosts.jsx` (2,340 lines)
  - `Profile.jsx` (2,320 lines)

**Already optimized** (15 files): FeedPostCard, GreenNavbar, PostBoostPanel, SubscriptionPlans, SellerDashboard, CoinBalance, PwaEnhancements, PostImageCarousel, ShareLinkDialog, LanguageSelector, VirtualizedList, VirtualizedFeed, CategoriesGrid, PasswordStrengthIndicator, ui/select

---

## Phase 9: Final Verification ⬜ PENDING

- [ ] All server files pass `node -e "require('./...')"` import check
- [ ] All client files pass Vite build without errors
- [ ] No SQL injection via string interpolation remaining
- [ ] All shared helper imports resolve correctly
- [ ] Performance indexes migration is complete
- [ ] Update this plan with final status

---

## Previously Completed (from prior sessions)

### Controllers Already Deminified (13 of 39) ✅
1. ✅ `postController.js` — shared helpers, JSDoc
2. ✅ `reviewsController.js` — shared helpers, cached schema
3. ✅ `complaintsController.js` — shared helpers
4. ✅ `savedSearchesController.js` — shared helpers
5. ✅ `priceAlertsController.js` — shared helpers
6. ✅ `profileController.js` — shared helpers
7. ✅ `dashboardController.js` — shared helpers
8. ✅ `notificationController.js` — shared helpers
9. ✅ `categoryController.js` — shared helpers
10. ✅ `wishlistController.js` — shared helpers
11. ✅ `tiersController.js` — shared helpers
12. ✅ `feedbackController.js` — shared helpers
13. ✅ `priceHistoryController.js` — shared helpers

### Shared Utilities Created ✅
- ✅ `server/src/utils/dbHelpers.js` — pool, runQuery, getAuthUserId, parseOptionalString, parsePositiveInt, isAdmin
- ✅ `server/src/utils/parseHelpers.js` — parseSafeInterval, parseBoolean, parseRating, etc.

### Other Completed Items ✅
- ✅ SQL injection fix in `sellerAnalyticsController.js`
- ✅ Performance indexes migration (30+ indexes)
- ✅ React.memo on `FeedPostCard.jsx`
- ✅ Coin economy routes + controller
- ✅ Seller analytics routes + controller
- ✅ Subscription expiry cron
- ✅ Monthly quota reset cron
- ✅ Tier-based search ranking in feed
- ✅ Welcome bonus coins on signup
- ✅ Coin hooks middleware (post create, sale)

---

## Progress Tracker

| Phase | Total Items | Completed | Remaining | % Done |
|-------|-------------|-----------|-----------|--------|
| Phase 1 | 9 | 0 | 9 | 0% |
| Phase 2 | 1 | 0 | 1 | 0% |
| Phase 3 | ~51 | 0 | ~51 | 0% |
| Phase 4 | ~25 | 0 | ~25 | 0% |
| Phase 5 | ~50 | 0 | ~50 | 0% |
| Phase 6 | ~20 | 0 | ~20 | 0% |
| Phase 7 | 4 | 1 | 3 | 25% |
| Phase 8 | ~92 | 15 | ~77 | 16% |
| Phase 9 | 5 | 0 | 5 | 0% |
| **Overall** | **~257** | **16** | **~241** | **6%** |

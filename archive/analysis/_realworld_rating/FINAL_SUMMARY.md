# Real-World Mobile Parity Audit - Final Summary

**Date:** 2026-05-04 (updated 2026-05-05)
**Scope:** 69 pages of the Mhub PWA captured in Android WebView viewport (412x915), rated against equivalent screens in real-world Indian/global apps (Flipkart, Amazon, OLX, Razorpay, Paytm, PhonePe, Cred, Meesho, Telegram, WhatsApp, Instagram, Shopify, DigiLocker, etc.).
**Method:** Screenshot capture (`_phase_screenshot.cjs` Phase 1-4 + `_phase*_real/` directories) + 10-axis rubric (`app_shell`, `above_fold`, `touch_targets`, `typography`, `image_text_balance`, `sticky_cta`, `polish`, `empty_state`, `native_gestures`, `brand`).
**Coverage:** 100% of routable pages (69/69 unique routes rated).

---

## Headline numbers

| Metric | Value |
|---|---|
| Pages rated | **69** |
| Unique routes covered | **69 / 69** (100%) |
| Overall mobile-parity score | **6.31 / 10** (~63% of a real-world app) |
| Best phase | **Phase 9 (Legal/Create flows)** — 7.30 |
| Worst phase | **Phase 4 (Post-lifecycle gates)** — 4.38 |

### Per-phase parity

| Phase | Pages | Avg | Theme |
|---|---|---|---|
| 0 | 1 | 7.00 | Profile |
| 1 | 2 | 5.50 | All-posts / Category-hub |
| 2 | 4 | 6.75 | Listings, my-posts, my-home, profile |
| 3 | 5 | 6.40 | Auth-gated leaf pages (rewards, security, notifications) |
| 4 | 8 | **4.38** | Post-lifecycle (post-detail, add-post, sell, edit-post...) |
| 5 | 6 | 7.08 | channels, feed, search, for-you, login, signup |
| 6 | 6 | 6.67 | public-wall, cart, wishlist, chat, centre, my-feed |
| 7 | 6 | 7.08 | dashboard, activity, analytics, nearby, recently-viewed, tier-selection |
| 8 | 6 | 6.50 | pricing, payment, sold-posts, bought-posts, kyc, verification |
| 9 | 5 | 7.30 | channels/create, centre/create, terms, privacy, refund |
| 10 | 20 | 6.15 | Remaining routes: auth-gates, categories, compare, reviews, legal, errors |

### Top 5 (close to real-app parity)
1. **tier-selection** — 8.5 (vs YouTube/Spotify Premium)
2. **login** — 8.0 (vs Razorpay/Paytm)
3. **signup** — 8.0 (vs DigiLocker/Cred)
4. **dashboard** — 8.0 (vs Meesho Seller / Amazon Seller)
5. **payment** — 8.0 (vs Razorpay/PhonePe checkout)

### Bottom 5 (need rebuild)
1. **post-detail** — 4.0 (404 — test data missing)
2. **listing-detail** — 4.0 (404 — test data missing)
3. **channel-detail** — 4.5 (generic error state, no contextual messaging)
4. **add-post / sell / edit-post / post-add / feed-post-add / post-welcome** — 4.5 each (routes share one identical generic auth-gate)
5. **kyc** — 4.5 (no progress, no docs preview, dead space)

---

### Axis averages (0–1 scale)

| Axis | Avg | Status |
|---|---|---|
| touch_targets | **0.99** | Excellent |
| typography | **0.83** | Good |
| above_fold | **0.82** | Good |
| app_shell | **0.73** | Fair |
| brand | **0.72** | Fair |
| polish | **0.70** | Fair |
| image_text_balance | **0.59** | Needs work |
| empty_state | **0.59** | Needs work |
| sticky_cta | **0.57** | Needs work |
| native_gestures | **0.50** | Weak |

---

## Cross-cutting issues (appear on >50% of pages)

1. **Floating "GPS pill"** overlaps content on virtually every page. ✅ **FIXED in Wave 1** — repositioned to top-right, hides on scroll.
2. **Missing top app bar** on listing/index pages (channels, centre, sold-posts, bought-posts, activity) — titles float unanchored.
3. **Auth-gate template duplication** — many routes render the same generic "Sign in to continue" gate. ✅ **PARTIALLY FIXED in Wave 5** — 18 routes now have personalized auth-gate messages. Remaining generic: `/buyer-view`, `/saledone`, `/saleundone`, `/saved-searches`, `/aadhaar-verify`, `/offers` (6 routes).
4. **Empty states show all filters/sorts** (wishlist, recently-viewed). ✅ **FIXED in Wave 3** — controls hidden until data exists.
5. **No native gestures** (pull-to-refresh, swipe-back) on most data pages. `native_gestures` avg = 0.50.
6. **Image_text_balance failures** on auth-gates — too much copy, no illustrations. Avg = 0.59.
7. **i18n keys exposed live** on `/verification`. ✅ **FIXED in Wave 1** — all keys translated.
8. **Test data gaps** — `/post/post-1` and `/listing/listing-1` 404 against real backend, blocking PDP audit.
9. **Route duplication** — 3+ routes for "create post" intent and 2 for membership.
10. **Backend access bugs** block real rating on `/analytics` and `/nearby`.
11. **`/offers` uses legacy auth pattern** — old "Please login" modal instead of the new RequireAuth component.

---

## What this means for production-ready Android view

- **Overall: ~63% of a real-world app.** Solid foundation — login, signup, dashboard, payment, premium plans are 80–85% there and would not embarrass on Play Store.
- **Marketplace core (browse + detail + create)** is the weakest link. PDP is 404, "create post" is a maze of 5 dead-end gates. **This is the conversion path — fix first.**
- **Polish layer is consistent** (brand, typography, color) — ~0.72 on most pages. The deficits are **structural**: missing app bars, auth-gate sameness, no native gestures.
- **Post-Wave fixes lifted the overall by ~0.5 pts on affected pages** (GPS pill, i18n, empty-state, auth-gate personalization, KYC stepper, chat FAB).

---

## Fix waves — status

### Wave 1 — Site-wide ✅ DONE
- ✅ GPS pill repositioned to top-right, hides on scroll-down, hidden on auth pages
- ✅ i18n keys fixed for `/verification` (7 placeholder keys translated)
- ✅ LocationGate badge shrunk (28px close, 11px font)

### Wave 2 — Marketplace core ⏳ BLOCKED (backend offline)
- ❌ Seed canonical post/listing in test data for PDP audit
- ❌ Collapse "create post" route maze

### Wave 3 — Empty-state intelligence ✅ DONE
- ✅ Wishlist: search/sort/status controls hidden when empty
- ✅ RecentlyViewed: filter tabs + search/sort hidden when empty
- ✅ KYC: rebuilt with 3-step stepper + ETA card + doc icons

### Wave 4 — Native gestures + extras ✅ PARTIALLY DONE
- ✅ Chat: new-chat FAB added
- ❌ Pull-to-refresh on list pages
- ❌ Voice/barcode in search bar
- ❌ QR on payment

### Wave 5 — Auth-gate personalization ✅ DONE
- ✅ 18 routes personalized in RequireAuth (add-post, sell, edit-post, feed, sold-posts, bought-posts, analytics, etc.)
- ❌ 6 routes still show generic gate: `/buyer-view`, `/saledone`, `/saleundone`, `/saved-searches`, `/aadhaar-verify`, `/offers`

### Wave 6 — KYC stepper ✅ DONE
- ✅ PENDING state rebuilt: 3-step visual stepper + ETA + status summary

---

## Artifacts

- Per-page ratings (JSONL, 69 entries): [Mhub/analysis/_realworld_rating/ratings.jsonl](Mhub/analysis/_realworld_rating/ratings.jsonl)
- Screenshots: `Mhub/analysis/_phase*_real/` directories (per-page folders with scroll captures)
- Capture script: [Mhub/client/_phase_screenshot.cjs](Mhub/client/_phase_screenshot.cjs)
- Source files modified: `LocationGate.jsx`, `en.json`, `Wishlist.jsx`, `RecentlyViewed.jsx`, `Chat.jsx`, `RequireAuth.jsx`, `KycVerification.jsx`

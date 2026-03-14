# MHub – Full Implementation Status & Pending Checklist

Last audited: March 14, 2026  
Source docs analyzed: `--Tier setup -subscription.txt`, `SPRINT_PLAN_WEEK1_TO_WEEK10.md`, `MD_IMPLEMENTATION_MASTER_CHECKLIST.md`, `HALF_PENDING_OR_YET_TO_IMPLEMENT_FEATURES.md`, `FEATURE_STATUS_REPORT.md`, `IMPLEMENTATION_CHECKLIST.md`, `IMMEDIATE_ACTION_ITEMS.md`, `PRODUCTION_LAUNCH_ROADMAP.md`, `ORDERED_EXECUTION_CHECKLIST.md`

---

## Quick Summary

| Area | Implemented | Partial | Pending | Blocked |
|---|---|---|---|---|
| Tier / Subscription System | 9 | 2 | 3 | 0 |
| Boost / Featured / Sponsored | 6 | 1 | 3 | 0 |
| Bug Fixes (from Tier doc) | 7 | 1 | 0 | 0 |
| Sprint Plan Phases (Week 1–10) | 4 | 2 | 4 | 0 |
| Master Checklist Phases (A–G) | 2 | 3 | 2 | 1 |
| Backend Ops / Security | 11 | 0 | 5 | 1 |
| **Totals** | **39** | **9** | **17** | **2** |

---

## 1. Tier / Subscription System (from `--Tier setup -subscription.txt`)

### Implemented ✅

- [x] **3 Clear User Tiers defined** — Free (Basic ₹49/post), Silver (₹499/6mo), Premium (₹999/yr) in `server/src/config/tierRules.js`
- [x] **Tier rules engine** — `getTierRules()`, `canPost()`, daily limits, visibility days, priority ordering
- [x] **TierSelection UI page** — `client/src/pages/TierSelection.jsx` with 3-column pricing layout, feature comparison, boost plan cards
- [x] **DB schema: tier enforcement** — `server/database/migrations/add_tier_enforcement.sql` (users.tier, subscription_expiry, post_credits columns)
- [x] **DB schema: payments + subscriptions** — `server/database/migrations/defender_payment_tables.sql` (payments table, user_subscriptions table)
- [x] **Payment controller (full)** — `server/src/controllers/paymentController.js`: submit (UPI), verify (admin), reject, retry, webhook (Razorpay+Stripe signatures), reconciliation
- [x] **Payment routes** — `server/src/routes/payments.js`: submit, status, pending, verify, reject, retry, promo, webhook, stats, UPI details, reconciliation
- [x] **Promo code system** — `LAUNCH50` (50% off), `WELCOME20` (20% off), `SILVER10` tier-restricted code, with validation + consumption logic
- [x] **Upgrade tier endpoint** — `server/src/controllers/userController.js` has `upgradeTier` with subscription_expiry + post_credits handling

### Partially Implemented 🟡

- [ ] **Trial system** — `getTrialExpiry()`, `isTrialEligible()` exist in tierRules.js with 7/14-day logic, but **no UI trigger** for starting a trial and no `/api/tiers/start-trial` endpoint
- [ ] **Dynamic pricing / flash sales** — `getDynamicPrice()` returns 10% off during 11pm–6am ("Night Owl Deal") but **not surfaced in TierSelection UI**

### Pending ❌

- [ ] **Pay-per-post for free users** — Spec says free users get 3 free posts then pay ₹X per additional. `post_credits` column exists but **no enforcement middleware** checking remaining credits before `createPost`
- [ ] **Subscription auto-expiry handling** — No cron/worker to downgrade users whose `subscription_expiry` has passed. Users stay on Silver/Premium tier indefinitely after expiry
- [ ] **Upsell prompts in-app** — `getUpsellMessage()` exists in tierRules.js but **never called from any route or UI**. Spec wants contextual upsell banners

---

## 2. Boost / Featured / Sponsored Listings (from `--Tier setup -subscription.txt`)

### Implemented ✅

- [x] **Boost controller** — `server/src/controllers/postBoostController.js`: boostPost (₹49/₹99/₹199), getSponsoredPosts, getBoostStatus
- [x] **Boost routes** — `POST /api/posts/:postId/boost`, `GET /api/posts/sponsored`, `GET /api/posts/:postId/boost-status`
- [x] **DB schema: post_boosts** — `server/database/migrations/add_post_boosts.sql` (post_boosts table + boost_level column on posts)
- [x] **PostBoostPanel UI** — `client/src/components/PostBoostPanel.jsx`: 3 boost tiers with pricing, owner-only display
- [x] **SponsoredListings UI** — `client/src/components/SponsoredListings.jsx`: horizontal carousel with promo badges on PostDetail
- [x] **Feed ordering by tier_priority** — `server/src/controllers/feedController.js` orders by `tier_priority DESC`

### Partially Implemented 🟡

- [ ] **Boost priority in all queries** — Feed uses `tier_priority`, but AllPosts/search queries may not use `boost_level` in ORDER BY. Need to verify `allPostsController.js` sorting includes boost_level

### Pending ❌

- [ ] **Premium sellers auto-featured rotation** — Spec says Premium sellers automatically appear in sponsored sections. Current `getSponsoredPosts` prioritizes boost_level but doesn't auto-include Premium-tier sellers who haven't boosted
- [ ] **3 free monthly boosts for Premium** — Spec says Premium gets 3 free boosts/month. No tracking of used free boosts per billing cycle
- [ ] **Boost payment integration** — `PostBoostPanel` calls the boost API but **doesn't go through the payment flow** (Razorpay/UPI). Currently records the boost without actual payment collection

---

## 3. Bug Fixes & UX (from `--Tier setup -subscription.txt`)

### Implemented ✅

- [x] **MyPosts load fix** — `postController.js` getUserPosts: added try/catch with fallback query when transactions table missing
- [x] **Notification popup auto-dismiss** — `App.jsx` socket toast: added `duration: 4000`
- [x] **NotificationPermission resize** — Added resize listener to auto-hide popup on viewport change
- [x] **Back button: SoldPosts** — ArrowLeft + navigateBack added to header
- [x] **Back button: BoughtPosts** — ArrowLeft + navigateBack added to header
- [x] **Back button: TierSelection** — Back button added at top of pricing page
- [x] **Back button: ForYou** — BackArrow + navigateBack added to sticky header

### Partially Implemented 🟡

- [ ] **Saledone testing clarity** — Back button + collapsible testing guide added, but the **OTP delivery to buyer** (via notification channel) should be verified end-to-end. Seller-initiated sale creates transaction + OTP but actual OTP delivery path to buyer's notification channel needs validation

### Post Owner View (already was done before our session)

- [x] **Owner sees leads** — PostDetail.jsx already shows "Users who clicked Interested", "Users who viewed", inquiry/offer counts for isOwnerView
- [x] **Owner buttons hidden** — "Interested", "Make Offer", "Save", "Share" already conditional on `!isOwnerView`

---

## 4. Sprint Plan Phases (from `SPRINT_PLAN_WEEK1_TO_WEEK10.md`)

### Completed ✅

- [x] **Phase 1 (Week 1)** — UI Stabilization: mobile navbar, action rows, responsive polish
- [x] **Phase 2 (Week 2)** — Localization: 26 locales, translation coverage, switch latency
- [x] **Phase 3 (Week 3)** — Auth Hardening: token lifecycle, route guards, session diagnostics (marked "In Progress" in doc but code shows auth mapper, CSRF, refresh all implemented)
- [x] **Phase 4 (Week 4)** — Marketplace Flow: search/filter/save/cart state sync, idempotent cart (code evidence exists)

### Partially Implemented 🟡

- [ ] **Phase 5 (Week 5)** — Rewards + Referral: `rewardsController.js`, `referralController.js`, `rewardsLedgerService.js`, `referralChainRewards.js` all exist. DB migrations for rewards/referral hierarchy exist. **Missing: Rewards dashboard UI page** in client (no dedicated rewards page found), referral tree visualization UI
- [ ] **Phase 6 (Week 6)** — Performance Pass: Some optimization exists (caching, chunk awareness) but **no formal bundle split strategy**, no render memoization audit, no API latency budget CI gate

### Pending ❌

- [ ] **Phase 7 (Week 7)** — Security Hardening: CORS/CSP partially configured. Missing: rate-limit tuning for auth/admin APIs, location fraud mitigation, security lint CI scripts
- [ ] **Phase 8 (Week 8)** — QA Automation: `top10_user_journeys.e2e.test.js` exists but limited scope. Missing: route-level smoke tests, visual/snapshot checks for mobile, CI-gated merge policy
- [ ] **Phase 9 (Week 9)** — Release Readiness: Missing: production checklist sign-off, rollback drill validation, monitoring dashboard setup
- [ ] **Phase 10 (Week 10)** — Post-Launch Optimization: Not started. Needs usage metrics, telemetry review, backlog resequencing

---

## 5. Master Checklist Phases (from `MD_IMPLEMENTATION_MASTER_CHECKLIST.md`)

### Completed ✅

- [x] **Phase A** — Docs Canonicalization: stale references fixed, deduplication done
- [x] **Phase B** — Quality Gates: CI gates for doctor, lint, test, build enforced

### Partially Implemented 🟡

- [ ] **Phase C** — Product/UX Sprint Backlog: Phase 3+4 auth/marketplace done, Phase 5 rewards partially done. **Pending: mobile UX checklist** (sticky quick filters, visible category rail)
- [ ] **Phase D** — Localization: CI gate for hardcoded strings exists. **Pending: high-traffic hardcoded-string replacement pass** across server error messages
- [ ] **Phase E** — Reliability/Security/Testing Ops: **Pending all 6 items**: backup/restore drill, performance budget CI, load cadence, dependency-security automation, UI regression tests, performance-budget tests

### Pending ❌

- [ ] **Phase F** — Release Hygiene: Execute release cleanup checklist, worktree audit, confirm intentional deletions
- [ ] **Phase G** — External/Blocked Backlog: Track MR-001/002/003/006 (multi-region items)

### Blocked 🔴

- [ ] **Multi-region active-active deployment** — Blocked on external infra (secondary region stack + traffic manager credentials). Not actionable until Platform Engineering provisions infrastructure

---

## 6. Backend Infrastructure & Ops

### Implemented ✅

- [x] **KYC/Seller Verification** — `kycAutomationService.js`: Aadhaar + PAN validation, OCR confidence scoring, auto-approve/reject/manual-review pipeline, admin review queue
- [x] **Admin Dashboard** — `adminDashboard.js`: stats, flagged users/posts, bulk moderation actions, verification review, CSV export, audit logging
- [x] **Seller Analytics** — `analyticsController.js`: overview stats, post performance, category breakdown, device analytics, conversion rates
- [x] **Notification System** — `notificationController.js` + Socket.io real-time + push notification support + in-app notification UI
- [x] **Sale/Transaction System** — `saleController.js`: dual-verification (seller initiate → buyer OTP confirm), pending sales, cancel flow, reward points on completion
- [x] **Rewards Ledger** — `rewardsLedgerService.js`: idempotent point mutations, transaction-scoped ledger entries
- [x] **Referral Chain** — `referralChainRewards.js`: multi-depth referral hierarchy, chain rewards on completed sales
- [x] **Complaint System** — Complaints/reviews/moderation controllers exist
- [x] **Guaranteed Reach / Fair Feed** — `postGuaranteedReachController.js`: fair ranking algorithm
- [x] **Payment Reconciliation** — `paymentReconciliationService.js`: automated report + execution
- [x] **Fraud/Risk Engine** — `testRiskEngine.js` exists, ML fraud challenge/telemetry per FEATURE_STATUS_REPORT

### Pending ❌

- [ ] **ML-assisted fraud scoring pipeline** — Currently rule-based. Advanced ML model training and integration not started
- [ ] **Multi-region failover automation** — Tabletop exercise done, live infra blocked (external dependency)
- [ ] **Advanced feature flagging with rollout analytics** — Progressive flag governance documented, but staged rollout analytics dashboard not built
- [ ] **Expanded seller growth analytics suite** — Basic analytics exist; advanced seller growth insights (trends, cohorts, benchmarks) not implemented
- [ ] **Deeper E2E UI coverage** — Only top-10 journeys covered; needs expansion to cover all critical paths

---

## 7. ForYou Page Enhancement (from `--Tier setup -subscription.txt`)

- [x] **Already comprehensive** — ForYou.jsx has trending posts, category tabs, personalized recommendations, infinite scroll, back button (added in our session). Matches "similar to Home Page layout" requirement

---

## Priority Execution Plan (Recommended Order)

### 🔴 P0 — Revenue-Critical (Do Next)

| # | Task | Effort | Impact |
|---|---|---|---|
| 1 | **Post credit enforcement middleware** — Check `post_credits > 0` before `createPost` for basic-tier users | S | Prevents unlimited free posting |
| 2 | **Boost payment integration** — Wire PostBoostPanel through Razorpay/UPI payment flow before recording boost | M | Actually collects boost revenue |
| 3 | **Subscription expiry cron job** — Worker that runs daily, downgrades expired subscriptions to basic | S | Prevents perpetual premium access |

### 🟠 P1 — Product Completeness

| # | Task | Effort | Impact |
|---|---|---|---|
| 4 | **Premium auto-featured rotation** — Include Premium-tier sellers in getSponsoredPosts even without explicit boost | S | Delivers Premium tier value |
| 5 | **Free monthly boosts for Premium** — Track used_free_boosts per billing cycle, allow 3 boosts/month without payment | M | Delivers Premium tier promise |
| 6 | **Trial start endpoint + UI** — `/api/tiers/start-trial` + "Start Free Trial" button on TierSelection | S | User acquisition funnel |
| 7 | **Upsell banners** — Show contextual "Upgrade to Silver/Premium" prompts when users hit free-tier limits | M | Conversion driver |
| 8 | **Rewards dashboard UI page** — Client page showing reward points, referral tree, transaction history | M | Completes rewards feature |
| 9 | **Dynamic pricing in TierSelection** — Surface flash sale / Night Owl pricing from getDynamicPrice() | S | Already built in backend |
| 10 | **AllPosts sort by boost_level** — Verify and add boost_level to ORDER BY in all post listing queries | S | Boosts get visibility everywhere |

### 🟡 P2 — Sprint Plan Completion

| # | Task | Effort | Impact |
|---|---|---|---|
| 11 | **Phase 7: Security hardening** — Rate-limit tuning, CSP headers, security lint CI | M | Pre-launch requirement |
| 12 | **Phase 8: QA e2e expansion** — Route-level smoke tests, visual checks, CI merge gates | L | Prevents regressions |
| 13 | **Phase E: Backup/restore drill** — Execute drill, document evidence | M | Ops readiness |
| 14 | **Phase D: Hardcoded string pass** — Replace server-side English strings with i18n keys | M | Full localization |
| 15 | **Phase F: Release cleanup** — Run worktree audit, cleanup checklist | S | Clean release |

### 🔵 P3 — Future / Blocked

| # | Task | Effort | Impact |
|---|---|---|---|
| 16 | **ML fraud scoring** — Train model, integrate scoring pipeline | XL | Advanced fraud prevention |
| 17 | **Multi-region active-active** — Blocked on external infra provisioning | XL | Geographic resilience |
| 18 | **Advanced seller analytics** — Cohort analysis, trend benchmarks, growth recommendations | L | Seller engagement |
| 19 | **Feature flag rollout dashboard** — Visual analytics for staged feature rollouts | M | Ops sophistication |

---

**Effort Key:** S = Small (< 1 day) | M = Medium (1–3 days) | L = Large (3–7 days) | XL = Extra Large (> 1 week)

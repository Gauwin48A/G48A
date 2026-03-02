# Phased Page Enhancement Checklist

## Scope
This checklist covers all routed pages declared in `client/src/App.jsx` and organizes UX/functionality improvements into implementation phases.

## Quality Gates (apply to every phase)
- [ ] Loading, empty, error, and success states are explicit and actionable.
- [ ] No dead-end screens; each page has clear next actions.
- [ ] Auth-required flows preserve `returnTo` and recover gracefully.
- [ ] Mobile-first layout and tap targets are validated.
- [ ] Accessibility basics: labels, focus order, keyboard paths, contrast.
- [ ] API failures show user-safe messages (no raw stack/unknown errors).

## Phase 0 - Baseline Audit and Standards
Pages: all
- [x] Build a UI state matrix (loading/empty/error/retry/auth-gate) for each page.
- [x] Define shared page-state patterns and enforce usage.
- [x] Add route-level analytics events for key actions and drop-off points.
- [x] Add top-level UX smoke checks for all major routes.

## Phase 1 - Discovery and Conversion Friction (high traffic)
Pages: `/all-posts`, `/home`, `/search`, `/categories`, `/channels`, `/channels/:id`, `/tier-selection`
- [x] Upgrade `/channels` with searchable list, skeleton loading, retryable error, and create CTA.
- [x] Upgrade `/channels/:id` with robust loading/error/empty states, back navigation, and clearer post/follow actions.
- [x] Replace alert-based tier upgrade failure UX with toast + inline recoverable error state.
- [x] Add sticky quick filters and clear-all affordance in browse pages.
- [x] Add explicit no-results guidance + one-click reset filters.
- [x] Improve card-level trust signals (price history, posted time, profile trust markers).

## Phase 2 - Auth and Onboarding Reliability
Pages: `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/profile`, `/security`, `/verification`
- [x] Login identifier clarity improved (email/phone/username) and phone OTP gating added.
- [x] Forgot-password real delivery path + local preview diagnostics implemented.
- [x] Signup alternative auth options explicitly gated and marked unavailable.
- [x] Add first-login onboarding checklist (profile completeness, verification, first post).
- [x] Add password policy hints consistently across auth pages.
- [x] Add auth error taxonomy (wrong credentials vs lockout vs network) in user-friendly language.

## Phase 3 - Post Lifecycle and Marketplace Task Completion
Pages: `/add-post`, `/post/:id`, `/buyer-view`, `/bought-posts`, `/sold-posts`, `/my-posts`, `/feed`, `/feed/:id`
- [x] Standardize media upload progress/error recovery in post creation/edit flows.
- [x] Add structured post validation hints before submit (not only after error).
- [x] Improve buyer-seller action clarity (what to do next, status progression, timeline).
- [x] Add empty-state CTA paths for bought/sold/my-posts pages.
- [x] Add post detail trust panel (seller reliability, verification, response SLA).

## Phase 4 - Transaction Safety and Trust
Pages: `/offers`, `/payment`, `/saledone`, `/saleundone`, `/complaints`, `/feedback`, `/reviews/:userId`, `/kyc`, `/aadhaar-verify`
- [x] Add transaction stepper UI with clear state transitions.
- [x] Show payment verification expectations and retry windows.
- [x] Add complaint and feedback submission confirmations with tracking reference.
- [x] Add explicit fallback actions when KYC/verification fails.
- [x] Add moderation-safe error copy for high-stakes actions.

## Phase 5 - Engagement and Retention
Pages: `/rewards`, `/my-recommendations`, `/nearby`, `/wishlist`, `/recently-viewed`, `/saved-searches`, `/notifications`, `/chat`
- [x] Improve empty states with one-tap engagement actions.
- [x] Add notification deep-link reliability checks and fallback navigation.
- [x] Add chat conversation states (no messages, failed send, reconnecting).
- [x] Make rewards progress and referral steps more explicit.
- [x] Add personalization explanation controls (why this recommendation).

## Phase 6 - Admin, Analytics, and Operational UX
Pages: `/dashboard`, `/admin-panel`, `/analytics`, `/public-wall`, `/my-home`, `/for-you`
- [x] Add admin action confirmations and undo where safe.
- [x] Add analytics date-range controls and empty-data guidance.
- [x] Improve dashboard KPI card clarity with drill-down actions.
- [x] Standardize warning/error banners for operational pages.

## Route Coverage Checklist
Auth:
- [x] `/login`
- [x] `/signup`
- [x] `/forgot-password`
- [x] `/reset-password`

Core browse:
- [x] `/all-posts`
- [x] `/home`
- [x] `/for-you`
- [x] `/search`
- [x] `/categories`

Post and profile:
- [x] `/post/:id`
- [x] `/add-post`
- [x] `/profile`
- [x] `/security`
- [x] `/verification`

Feed and recommendations:
- [x] `/feed`
- [x] `/feed/:id`
- [x] `/my-feed`
- [x] `/my-recommendations`

Commerce lifecycle:
- [x] `/offers`
- [x] `/payment`
- [x] `/saledone`
- [x] `/saleundone`
- [x] `/buyer-view`
- [x] `/bought-posts`
- [x] `/sold-posts`

Engagement:
- [x] `/rewards`
- [x] `/wishlist`
- [x] `/recently-viewed`
- [x] `/saved-searches`
- [x] `/notifications`
- [x] `/chat`

Community and channels:
- [x] `/channels`
- [x] `/channels/:id`
- [x] `/channels/create`
- [x] `/public-wall`

Trust and governance:
- [x] `/complaints`
- [x] `/feedback`
- [x] `/reviews/:userId`
- [x] `/kyc`
- [x] `/aadhaar-verify`

Admin and insights:
- [x] `/dashboard`
- [x] `/analytics`
- [x] `/admin-panel`

Pricing:
- [x] `/tier-selection`

## Done in this execution
- [x] Completed phase-1 UX uplift for `ChannelsListPage` and `ChannelPage`.
- [x] Completed phase-1 failure-state uplift for `TierSelection`.
- [x] Auth reliability improvements from previous pass retained as phase-2 baseline.
- [x] Completed phase-1 browse UX uplift for `AllPosts` (quick filters, clear-all, no-results recovery, retry UX, trust metadata).
- [x] Completed phase-1 discovery UX uplift for `SearchPage` (dynamic category suggestions, active-filter reset, better recent/trending flows).
- [x] Completed phase-1 browse UX uplift for `Categories` and `Home` (search/retry/no-results and stronger next actions).
- [x] Added lifecycle recovery UX for `AddPost`, `PostDetail`, `BoughtPosts`, and `SoldPosts` (retryable loading states, empty-state CTAs, clearer fallbacks).
- [x] Added transaction/trust recovery UX for `Offers`, `PaymentPage`, `Saledone`, `SaleUndone`, `Complaints`, `Feedback`, and `Verification`.
- [x] Added upload-progress UX for `AddPost`, trust-and-safety panel for `PostDetail`, and complaint reference + moderation-safe copy hardening for trust workflows.
- [x] Completed auth hardening on `Login`, `ForgotPassword`, and `ResetPassword` with clearer error taxonomy and recoverable guidance.
- [x] Added first-login onboarding checklist on `Home` and persisted first-post completion marker from `AddPost`.
- [x] Completed Phase 5 hardening for `Rewards`, `Wishlist`, `Notifications`, `Chat`, and `MyRecommendations` (empty/recovery actions, deep-link fallback, reconnect/send-fail states, reward step clarity, and recommendation explanation controls).
- [x] Completed engagement parity pass for `RecentlyViewed` and `SavedSearches` (auth gating, retryable failures, and one-tap recovery actions).
- [x] Completed focused Phase 6 pass on `Dashboard`, `Analytics`, and `AdminPanel` (KPI drill-down actions, date-range + no-data recovery, moderation confirmations/undo, and standardized operational banners).
- [x] Extended reliability and recovery UX for `/for-you`, `/public-wall`, `/my-home`, and `/channels/create` (retry states, auth return paths, explicit empty/error actions, and safer API failure handling).
- [x] Added route-level UX telemetry (`route_view`, `route_action`, `route_exit`, `route_drop_off`) and backend capture endpoint for client event streams.
- [x] Added executable major-route UX smoke checks via `npm run check:ux-smoke`.
- [x] Closed remaining route gaps for `/profile`, `/security`, `/feed`, `/feed/:id`, `/my-feed`, `/buyer-view`, `/reviews/:userId`, `/kyc`, and `/aadhaar-verify` with consistent loading/error/empty/auth-recovery UX.
- [x] Added a Phase-0 UI state matrix baseline in `docs/UI_STATE_MATRIX.md` and mapped alias/redirect routes.
- [x] Added shared `PageState` primitives and migrated `/search` to explicit loading/error/empty states with actionable retries.
- [x] Expanded UX smoke checks from token heuristics to explicit per-route state/CTA contracts on high-risk routes.
- [x] Fixed follow-up UX bugs: removed no-op filter action in `/buyer-view` and added safe stale-request guards for async category loading in `/search`.
- [x] Migrated shared `PageState` primitives across additional long-tail routes (`/feed`, `/feed/:id`, `/my-feed`, `/profile`, `/security`) while preserving existing smoke-contract CTAs and fallback actions.
- [x] Added panel-level `PageState` recovery UX for `/profile` preferences/categories (loading/error/empty + explicit retry controls).
- [x] Expanded smoke checks from route-shell contracts to in-route panel contracts (`profile-preferences`, `security-status`, `feed-post-detail-recovery`).
- [x] Expanded executable UX route smoke tests beyond search/buyer with retry recovery coverage for `/feed/:id` and `/security`.
- [x] Added panel-level contact-sync recovery UX in `/profile` settings (`profile-settings-contacts-loading/error`) with explicit retry and dismiss actions.
- [x] Extended panel smoke contracts to enforce `/profile` settings contact-sync state and CTA markers.

## Next recommended execution order
1. Continue panel-level `PageState` migration for remaining async modules (security setup/verify/disable action outcomes, feed secondary actions, admin utilities).
2. Add browser-level E2E smoke coverage (Playwright/Cypress) for empty/error/retry flows now covered at component-route test level.
3. Convert quality-gate checklist items into enforceable checks (a11y contrast/focus checks and mobile tap-target assertions).

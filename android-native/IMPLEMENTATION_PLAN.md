# Android E-Commerce App - Full Implementation Plan

Date: May 11, 2026
Project: /workspaces/Mhub/android-native
Reference Web App: http://localhost:8081/

## 1) Reality Check: Why this is not 100/100

Your concern is correct.

The Android codebase has strong foundations and many screens, but it is not yet full feature parity for the e-commerce IA you described (Launcher -> Category Mini App -> Category-specific flows).

Current state from code inspection:
- The launcher concept exists and category mini-app shell exists.
- Legacy global navigation and legacy screens still coexist with the new pattern.
- Many advanced commerce features are present as UI scaffolds but not fully integrated with data/state/actions.
- Several screens still rely on mock or partial logic instead of complete flows.

Estimated parity for your requested scope: about 55-65%, not 100%.

## 2) Web vs Android Gap Summary (for your requested IA)

Legend:
- Complete: implemented and wired end-to-end
- Partial: UI exists but data/action/state incomplete
- Missing: absent or only stub

### A) Home Launcher (no bottom nav)
- 4 app cards at home: Complete
- No bottom nav on launcher: Complete
- Card opens independent category app: Complete
- Smooth transition polish and state persistence: Partial

### B) Category App Shell (inside category only)
- Category top bar with title/search/cart badge/notifications/back: Partial
- Category bottom nav visible only inside category: Complete
- Per-category scoped navigation: Partial
- Side drawer/hamburger: Missing

### C) Category Home (per category)
- Hero banners and subcategory chips: Complete
- Featured/deals/trending/new-arrivals sections: Complete
- Brand spotlight and promo mid-page composition parity: Partial
- Pull-to-refresh: Complete
- Shimmer/loading/error empty patterns consistency: Partial

### D) Subcategory and PLP
- Subcategory grid with image and item count: Complete
- Subcategory top banner and breadcrumb trail: Missing
- PLP filter/sort/grid-list/filter chips/no-results: Complete
- Infinite paging backed by repository paging source: Partial
- Quick add/wishlist actions with real cart/wishlist state: Partial

### E) PDP
- Gallery, thumbnails, zoom, variants, qty, pricing, stock, related: Complete/Partial mix
- Write review form and full review pipeline: Partial
- Delivery, return, share, recently viewed persistence: Partial

### F) Cart/Wishlist/Recently Viewed
- Cart item list and totals: Complete
- Swipe-to-remove with undo + robust save-for-later: Partial
- Wishlist move-to-cart/share wishlist: Partial
- Recently viewed reverse-chronological with clear-all and empty CTA: Partial

### G) Checkout (4-step)
- Address, payment, review, confirmation route scaffolds: Complete
- Validation, persistence, failure/retry, order commit pipeline: Partial

### H) Profile/Account/Auth/Search/Notifications/Static pages
- Most pages exist: Complete
- Full depth behavior (order detail tracking timeline, payment methods, notification deep-links, FAQ search quality, voice search): Partial

## 3) Critical Architectural Direction (non-negotiable)

Target model:
- Launcher home is the only top-level home and has no bottom navbar.
- Each category opens its own mini-app shell.
- Category shell owns top bar, bottom bar, and category-local nav graph.
- Legacy global-shell flows are retained only for backward compatibility during migration, then removed.

Migration policy:
- No big-bang rewrite.
- Keep app compiling after every sprint.
- Move one vertical slice at a time from legacy global routes into category-scoped routes.

## 4) Sprint Plan (implementation from current codebase)

### Sprint 0 - Foundation and IA Hardening
Goal: enforce launcher-first architecture and close routing conflicts.

Deliverables:
- Finalize single source of truth for launcher route and category entry.
- Remove or de-prioritize conflicting legacy open-category paths.
- Add category context persistence (last opened category, tab restore).
- Normalize app keys and category mappings across Android and web parity docs.
- Define shared page-state contract for all data screens: Loading, Error+Retry, Empty+CTA, Success.
- Add audit checklist template per screen (a11y + performance + UX states).

### Sprint 1 - Home Launcher Perfection
Goal: polish launcher UX to production quality.

Deliverables:
- Greeting header and contextual quick actions.
- Better app-entry animation and return-to-launcher behavior.
- Accessibility pass for launcher semantics and focus order.
- Tablet layout tuning and landscape behavior.

### Sprint 2 - Category Shell Completion
Goal: make category shell fully equivalent to web category app container.

Deliverables:
- Complete top app bar behavior parity (cart badge state, notifications route, back behavior).
- Category-local search context and category-local cart counters.
- Add side drawer with category shortcuts and static/help links.
- Ensure bottom nav appears only in category shell.

### Sprint 3 - Category Home Deep Parity
Goal: complete hero commerce page experience per category.

Deliverables:
- Auto-scroll hero with robust pause/resume lifecycle behavior.
- Promo mid-page banners and brand spotlight sections.
- Deals countdown reliability and refresh behavior.
- Section-level loading skeletons + empty states where data absent.

### Sprint 4 - Subcategory and PLP Finalization
Goal: complete browse and listing journey.

Deliverables:
- Add subcategory banner and breadcrumb path.
- Product count text as "Showing X of Y".
- Filter bottom sheet completeness (brand/rating/availability/price persisted).
- Pageable data source integration and stable scroll restoration.

### Sprint 5 - PDP End-to-End
Goal: complete decision and conversion page.

Deliverables:
- Write-review form with validation and optimistic insert.
- Specs and policy sections parity with web info hierarchy.
- Buy-now flow connected to checkout step 1.
- Recently viewed persistence through Room with dedupe + cap.

### Sprint 6 - Cart/Wishlist/Recently Viewed
Goal: complete post-discovery commerce utilities.

Deliverables:
- Swipe remove + undo snackbar behavior hardening.
- Move wishlist item to cart with variant preservation.
- Recently viewed reverse-chron list, clear-all, empty state CTA.
- Badge consistency across category shell tabs.

### Sprint 7 - Checkout 4-Step Production Flow
Goal: production-grade transaction path.

Deliverables:
- Address CRUD with validation and default address.
- Payment method selection and add-card validation.
- Order review with price breakdown consistency.
- Place-order state machine: idle/loading/success/failure/retry.

### Sprint 8 - Profile and Account
Goal: account operations parity.

Deliverables:
- Edit profile and account details persistence.
- Order history and order detail timeline.
- Address book and saved payment methods.
- Notification prefs, app settings, logout/delete-account confirmations.

### Sprint 9 - Authentication
Goal: complete and accessible auth suite.

Deliverables:
- Review all auth forms for visible labels and error semantics.
- Google sign-in reliability and fallback states.
- Session expiry and redirect behavior consistency.

### Sprint 10 - Search
Goal: web-grade search discoverability.

Deliverables:
- Autocomplete and trending suggestions.
- Recent searches Room integration cleanup.
- Voice search integration.
- Search results parity with PLP filters and chips.

### Sprint 11 - Notifications and Static Pages
Goal: complete engagement and legal/info layer.

Deliverables:
- Read/unread indicators, deep-link routing, clear-all.
- Empty state handling and filter behavior.
- About, Contact, FAQ searchable, Shipping, Return, Terms, Privacy parity.

### Sprint 12 - Audit and Quality Gate (100/100 target)
Goal: pass strict accessibility/performance checks on every page.

Deliverables:
- Accessibility: content descriptions, focus order, heading semantics, minimum touch target, form labels/errors.
- Performance: lazy lists with keys, image caching, recomposition audits, jank checks.
- UX states: loading/error/empty/retry on all data screens.
- Responsive quality for phone and tablet in light/dark.
- Final parity checklist sign-off per page.

## 5) Implementation Backlog by Priority

P0 (must close first):
- Remove IA ambiguity between legacy global shell and category mini-app behavior.
- Complete category-scoped cart/wishlist badge synchronization.
- Standardize page-state handling contract across all category flows.

P1:
- Checkout reliability and validation completeness.
- PDP review workflow and recently viewed persistence.
- Notification deep-link correctness.

P2:
- Side drawer enhancements and static pages polish.
- Voice search and advanced FAQ search.

## 6) Acceptance Criteria for true 100/100 claim

A 100/100 claim is valid only when all of these are true:
- Every required page/flow exists and is reachable from expected UX paths.
- No required feature is still stubbed or mock-only where persistence is expected.
- Every page has loading, error+retry, and empty+CTA states where applicable.
- Accessibility checks pass for semantics, touch targets, labels, and contrast.
- Performance checks pass for smooth scroll and stable recompositions.
- Parity checklist is green for launcher, 4 category mini-apps, and all commerce/account flows.

## 7) Sprint 0 Start Tasks (immediate execution queue)

1. Navigation hardening
- Verify all launcher taps always navigate to cat/{catKey}.
- Ensure no launcher action sends user to legacy all-posts by default.
- Add analytics event for launcher-enter and category-exit.

2. Category context and badge sync
- Add shared state source for cart/wishlist counts used by category top/bottom bars.
- Persist last selected category tab for return flows.

3. Screen-state contract
- Add reusable sealed UI state model and page state composables.
- Apply first to CategoryHome, Subcategory, ProductListing, ProductDetail.

4. Audit baseline
- Create per-screen audit checklist file and mark current pass/fail before feature changes.

---

Status after this update:
- Project explored and compared against web route/features.
- Plan corrected to reflect actual status and realistic path to true parity.
- Ready to execute Sprint 0 implementation tasks in code next.

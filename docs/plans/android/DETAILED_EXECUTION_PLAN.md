# Android Native Detailed Execution Plan

Date: May 11, 2026
Scope: Launcher-first, 4 category mini-app architecture with full commerce parity

## Objective

Complete Android parity with the category-app model:
- Home launcher has no bottom nav.
- Entering any category opens a scoped mini-app shell.
- Category shell owns top bar, bottom bar, navigation, and commerce journey.
- Every screen has loading/error/empty states and accessibility/performance compliance.

## Current Progress Snapshot

Completed in code:
- Launcher hardening to category routes.
- Category shell live cart/wishlist badges from Room.
- Persist last opened category and last selected category tab.
- Launcher-enter/category-exit/category-switch analytics events.
- Shared page-state components (`UiPageState`, loading/error/empty blocks).
- Applied shared state blocks to category home, subcategory, listing, and mock PDP.
- Added category side drawer with switch category + orders/settings/help shortcuts.
- Added subcategory header with breadcrumb context.
- Updated PLP count to "Showing X of Y".

Pending high-value work:
- Side drawer deep parity polish and profile preview block.
- Subcategory banner image and richer breadcrumb behavior.
- Category-local search context and filter persistence.
- Checkout flow durability and end-to-end persistence.
- Final accessibility/performance audit pass all screens.

## Delivery Phases

### Phase A - Architecture Lock (In Progress)

Goal:
- Ensure all launcher intent paths enter category shell.
- Eliminate behavior drift between legacy global routes and category shell routes.

Tasks:
1. Audit and patch every launcher action to `cat/{catKey}`.
2. Keep legacy routes only as backward-compatibility paths from internal menus.
3. Add explicit navigation guards for unknown category keys.
4. Add analytics for launcher entry, category switch, and launcher return.

Exit Criteria:
- No launcher action routes to global all-posts by default.
- Category shell restores last tab on re-entry.

### Phase B - Category Shell Feature Completion

Goal:
- Deliver production-grade top bar, bottom nav, and side drawer behavior.

Tasks:
1. Side drawer profile card (name/email/avatar placeholder).
2. Add category shortcuts section from mock subcategories.
3. Add visual active category marker and keyboard focus order pass.
4. Add content descriptions for badges and menu items.

Exit Criteria:
- Shell behavior consistent across all 4 categories.
- Drawer actions route correctly and are accessible.

### Phase C - Category Home + Browse Completion

Goal:
- Complete category home and browse flow parity.

Tasks:
1. Hero carousel lifecycle tuning (auto-scroll pause/resume).
2. Brand spotlight and promo blocks with fallback states.
3. Subcategory banner image and breadcrumb route stack.
4. PLP filter persistence and active-chip synchronization.
5. Add paging-backed product listing path (repository + paging source).

Exit Criteria:
- Category discovery path feels complete and stateful.
- No dead-end browse transitions.

### Phase D - PDP, Cart, Wishlist, Recently Viewed

Goal:
- Complete buy-intent and consideration flow.

Tasks:
1. PDP review form and optimistic update.
2. Room-backed recently viewed write/read dedupe and clear-all.
3. Cart swipe-to-remove with undo.
4. Wishlist move-to-cart and share behavior.
5. Cart/wishlist/recent consistency checks across tabs.

Exit Criteria:
- PDP to cart/wishlist/recent works end-to-end.
- Utility screens support empty/loading/error states consistently.

### Phase E - Checkout + Account + Search + Notifications

Goal:
- Complete conversion and account lifecycle.

Tasks:
1. Address CRUD with strict form validation.
2. Payment options and order review persistence.
3. Confirmation/failure/retry state machine.
4. Account order history detail timeline, address book, payment methods.
5. Search autocomplete + trending + voice.
6. Notifications read/unread + deep-link routing + clear all.

Exit Criteria:
- Checkout reliable and recoverable.
- Account/search/notifications feature depth aligned with web parity.

### Phase F - Full Audit and Stabilization

Goal:
- Achieve reliable 100/100 audit posture across pages.

Tasks:
1. Accessibility walk-through: semantics, touch targets, focus, labels/errors.
2. Performance walk-through: lazy keys, recomposition, jank pass.
3. UX state walk-through: loading/error/empty/retry on all data screens.
4. Tablet + dark mode verification.
5. Final parity matrix sign-off.

Exit Criteria:
- All critical pages pass checklist.
- No major parity gaps in launcher/category/commerce core journey.

## Workstream Checklist

### Navigation
- [x] Launcher to category shell hardening
- [x] Category switch events
- [ ] Legacy route deconfliction cleanup

### Category Shell
- [x] Live cart/wishlist badges
- [x] Tab persistence
- [x] Drawer with switch + shortcuts
- [ ] Drawer profile preview polish

### Browse
- [x] Subcategory breadcrumb context
- [x] PLP "Showing X of Y"
- [ ] Subcategory banner image
- [ ] Filter persistence

### State Contracts
- [x] Shared page-state components
- [x] Applied to 4 target screens
- [ ] Expand to cart/wishlist/recent/checkout screens

### Quality
- [x] Sprint 0 baseline audit doc
- [ ] Full accessibility pass launcher + category shell
- [ ] Performance profiling pass for browse and PDP

## Immediate Next Execution Queue (No Pause)

1. Add drawer profile preview and category shortcut chips.
2. Add subcategory banner image block and clickable breadcrumb segments.
3. Add category-local search prefill from shell context.
4. Expand shared page-state handling to cart and wishlist screens.
5. Run compile/error verification after each slice.

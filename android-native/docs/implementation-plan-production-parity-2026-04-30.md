# Android-Web Parity Implementation Plan (Final Pass)
Date: 2026-04-30

## Scope
- Goal: Android parity WebView screens must match web behavior and visual hierarchy per route.
- Constraint: Keep mobile alignment adjustments only (no desktop-style overflow on Android).

## Current Baseline
- Total routes rated: 61
- Score buckets:
  - >= 9.0: 47 routes
  - 8.0 - 8.9: 7 routes
  - 7.0 - 7.9: 4 routes
  - < 7.0: 3 routes

## Phase 0 - Stability (Completed)
- Fixed quoted intent route handling (`debug_route`) in route launch helpers.
- Hardened debug route normalization to strip wrapping quotes.
- Removed stale auth shortcut path that marked old local session as authenticated.
- Added server-session probe (`/api/auth/session` then `/api/auth/me`) before treating user as authenticated.
- Removed auth-surface redirect loop that caused blank `/forgot-password` and `/reset-password` pages.

Acceptance:
- App launches reliably via `debug_route` intents.
- `/category-hub`, `/all-posts`, `/login`, `/forgot-password`, `/reset-password` render non-blank.

## Phase 1 - Critical Parity Gaps (P0)
Routes:
- `/rewards` (score 6)
- `/admin-panel` (score 6)
- `/analytics` (score 6)

Work:
- Ensure above-fold content renders before capture window on Android:
  - prefetch API data for first paint,
  - reduce blocking network chains,
  - fallback skeleton to real content transition < 2s.
- Remove/relocate obstructive floating location badge overlap on these pages.
- Validate route guards and auth hydration for privileged routes (admin/analytics).

Acceptance:
- First meaningful content visible within 2.5s on emulator.
- No blank/near-empty first viewport.
- Per-route score >= 8.5.

## Phase 2 - Legal + Verification Consistency (P1)
Routes:
- `/terms-and-conditions` (7)
- `/privacy-policy` (7)
- `/verification` (7)

Work:
- Match heading hierarchy, spacing, and section padding to web.
- Keep sticky/floating UI from covering legal text blocks.
- For verification: align card order, status badges, and CTA placement to web.

Acceptance:
- No content obstruction.
- Typography and section rhythm matches web within mobile constraints.
- Per-route score >= 8.8.

## Phase 3 - Channel Flow Alignment (P1)
Routes:
- `/centre/:id/listings` (7)
- `/centre/:id` (8)
- `/channels/:id` (8)
- `/invite/:code` (8)

Work:
- Align empty/error states with web copy and iconography.
- Ensure detail routes render stable data card layout (title, metadata, CTA order).
- Standardize back-nav header spacing and action button widths.

Acceptance:
- Error and empty states visually match web patterns.
- No clipped buttons or inconsistent margins.
- Per-route score >= 8.8.

## Phase 4 - Global UX Polish (P1)
Global elements:
- Bottom nav, floating location badge, loading spinners, safe-area padding.

Work:
- Move low-priority controls into hamburger/more where top-bar crowding exists.
- Normalize bottom-nav icon spacing and active-state contrast.
- Ensure loading indicators do not persist after page settle.
- Add route-level ready marker for capture/testing (`window.__MHUB_PARITY_READY__ = true`).

Acceptance:
- No overlap with bottom nav on content pages.
- No persistent loader overlays after data load.
- 10/10 usability on top-nav + bottom-nav interactions.

## Phase 5 - Regression Gate (P0)
- Run authenticated parity capture (web + android) for all routes.
- Reject build if:
  - any blank screenshot,
  - duplicate screenshot hash across unrelated routes,
  - route score < 8.5.

Acceptance:
- 61/61 route captures unique and non-blank.
- Signed-off report + before/after delta table committed in docs.

## Deliverables
- `docs/page-parity-ratings-2026-04-30-final-pass.csv`
- `docs/live-parity-report-2026-04-30-20-04-49.md`
- `docs/live-parity-report-2026-04-30-20-04-49.html`

# Android-Web Parity Signed-Off Report (2026-05-01)

## Scope
- Target web app: `http://localhost:8081/category-hub`
- Target Android app: `com.mhub.app.debug` (Web replica mode)
- Requirement: authenticated parity check and page-by-page scoring

## Launch and Stability Validation
- Android app launch/routing smoke run passed:
  - `quick-test-30s.png` (home loaded)
  - `quick-test-allposts-8s.png` (all-posts route switch loaded)
  - `quick-test-login-8s.png` (login route switch loaded)
- Kotlin compile passed:
  - `:app:compileDebugKotlin`
- Added WebView recovery logic:
  - one automatic reload on startup timeout
  - one automatic reload on main-frame load error / 5xx HTTP error

## UI/UX Delta Applied
- `AllPosts` mobile feed changed from congested 2-column layout to 1-column on small screens, preserving 2-column on larger breakpoints.
- Card spacing/visibility/readability improved for mobile in `AllPosts` (avatar/badge/CTA/media/title/meta/action row adjustments).

## Live Authenticated Capture Used
- Web pack:
  - `android-native/test-screenshots/web-reference-auth-2026-05-01-livepass-2026-05-01T05-30-17-771Z`
- Android pack:
  - `android-native/test-screenshots/route-walkthrough-web-parity-20260501-005154`
- Live parity report:
  - `android-native/docs/live-parity-report-2026-05-01-06-24-13.md`
  - `android-native/docs/live-parity-report-2026-05-01-06-24-13.html`

## Page-By-Page Ratings (Final Pass CSV)
- Ratings file:
  - `android-native/docs/page-parity-ratings-2026-05-01-final-pass.csv`
- Route count: `61`
- Averages:
  - Functionality: `8.61/10`
  - Features: `8.61/10`
  - UI/UX: `8.61/10`
  - Overall: `8.61/10`
- Pages already at `>=9/10`: `47/61`
- Pages below `8/10`:
  - `/rewards` -> `6/10`
  - `/admin-panel` -> `6/10`
  - `/analytics` -> `6/10`
  - `/terms-and-conditions` -> `7/10`
  - `/privacy-policy` -> `7/10`
  - `/verification` -> `7/10`
  - `/centre/:id/listings` -> `7/10`

## Production-Ready Implementation Plan (Phases)
1. Phase A (P0 visual parity polish)
- Rewards, Profile, AllPosts, Category Hub
- Exact web color gradients/contrast/typography matching
- Mobile spacing and touch-target normalization (44dp+)

2. Phase B (P0/P1 functional hardening)
- Stabilize API-dependent sections with robust loading/error states
- Keep route transition latency low and prevent blank intermediary frames
- Validate sign-in persistence and authenticated content rendering per route

3. Phase C (P1/P2 layout and nav consistency)
- Resolve top-nav/menu density issues by consolidating secondary actions under hamburger on mobile where needed
- Remove overlap/clipping across small heights and narrow widths
- Normalize sticky headers/footers and bottom safe-area behavior

4. Phase D (final parity gate)
- Re-capture authenticated web + Android packs
- Re-run per-page scoring and require:
  - no page below `8/10`
  - P0 pages at `>=9/10`
  - no blocking loading/routing regressions

## Visual References (Current)
- Home:
  - `android-native/test-screenshots/quick-test-30s.png`
- AllPosts:
  - `android-native/test-screenshots/quick-test-allposts-8s.png`

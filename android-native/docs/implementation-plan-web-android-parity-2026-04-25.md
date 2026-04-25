# Web-to-Android Replica Implementation Plan

Date: 2026-04-25
Scope: Signed-in parity for `http://localhost:8081/category-hub` across all routes.

## Mandatory Conditions
- Login in both web and Android before any route comparison.
- Every Android page must replicate web behavior/features/visual hierarchy; only Android screen-size alignment differences are allowed.
- Use per-page scoring on Functionality, Features, and UI/UX.

## Current Baseline (Signed-In Run)
- Routes compared: **76**
- Missing Android captures: **7**
- Blank/loading Android captures: **36**
- Low-content Android captures: **7**
- Functionality avg: **3.5/10**
- Features avg: **3.5/10**
- UI/UX avg: **3.1/10**
- Overall avg: **3.4/10**

## Phase Plan
1. Phase 0 - Capture Stability Gate
   - Keep emulator online for full run (current run disconnected after early routes).
   - Regenerate full Android signed-in capture until all P0 pages are present and non-blank.
2. Phase 1 - P0 Replica Pages
   - Login, signup, category hub, all posts, search, add post, profile, rewards, notifications, wishlist, cart, post detail.
   - UI color/gradient parity for Profile and Rewards must match web theme exactly, with only mobile alignment changes.
3. Phase 2 - P1 Core Feature Pages
   - Remaining discovery/account/commerce/social core routes.
4. Phase 3 - P2 Long-tail and Legal/Channels
   - Legal routes, channels/centre routes, remaining low-traffic routes.
5. Phase 4 - Final Signed-In Re-Capture + Closure
   - Re-run signed-in web+Android capture and require per-page >= 8/10 on all three axes.

## Focus Pages (Requested)
- Rewards: web=`39_rewards.png`, android=`042_rewards.png`, scores=2 / 2 / 2, status=Android blank/loading capture
- Profile: web=`14_profile.png`, android=`016_profile.png`, scores=2 / 2 / 2, status=Android blank/loading capture

## Detailed Per-Page Matrix
- See `android-native/docs/page-parity-ratings.md`
- See `android-native/docs/page-parity-ratings.csv`
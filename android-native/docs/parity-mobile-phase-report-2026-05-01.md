# Android vs Web Mobile Parity Report (Live, Authenticated)

Generated: 2026-05-01
Scope: Android emulator (`com.mhub.app.debug`) vs web (`http://localhost:8081`) on mobile viewport parity routes.

## Capture Sets
- Before fixes: `android-native/test-screenshots/manual-check/phase-scan`
- After fixes: `android-native/test-screenshots/manual-check/phase-scan-after`
- Full authenticated sweep (stable waits): `android-native/test-screenshots/android-auth-2026-05-01-15-53-20`

## Phase Ratings (Functionality / Features / UI-UX)

| Page | Functionality | Features | UI/UX | Notes |
|---|---:|---:|---:|---|
| Category Hub | 8.7 | 8.8 | 8.5 | Visual quality is strong; large empty trailing space when short content. |
| All Posts (before) | 8.8 | 8.6 | 7.3 | Header+filters consumed too much vertical space; dense top stack. |
| All Posts (after) | 9.0 | 8.8 | 8.3 | Hero/toolbar compacted; first listing appears earlier; card rhythm improved. |
| For You | 6.9 | 7.2 | 7.4 | Recommendation load failures visible; fallback UI still heavy. |
| Feed (before) | 8.4 | 8.5 | 7.2 | Duplicate action affordance: floating create FAB + bottom-nav center plus. |
| Feed (after) | 8.8 | 8.7 | 8.2 | Duplicate FAB removed on mobile; cleaner lower viewport interaction. |
| Rewards | 9.0 | 8.9 | 8.9 | Good color hierarchy and spacing; minor density tuning opportunity. |
| Profile | 8.8 | 8.7 | 8.5 | Good card quality; very long sections can feel heavy during deep scroll. |
| Dashboard | 8.4 | 8.3 | 8.1 | Good structure; text-heavy hero and high first-fold density. |

## Implemented Fixes (This Pass)

File changed: `client/src/styles/mobile-layout.css`

1. All Posts mobile compaction
- Tightened hero paddings and section gaps.
- Hid hero subtitle on small screens.
- Reduced hero stats footprint.
- Compressed toolbar/category shell spacing.
- Tuned card media height and action-row density for better scanability.

2. Feed floating action de-duplication
- Hid mobile floating `Create Post` FAB when bottom nav already exposes center `+` action.

File changed: `android-native/scripts/android-intent-capture.mjs`

3. Route capture reliability
- Changed debug-route navigation from `parity/page/<key>` to canonical web path (`/<route>`).
- Fixed false negative for Aadhaar Verify route (`Unknown route: aadhaar_verify` no longer occurs).

## Before/After Delta Summary

- All Posts first-fold efficiency: improved (more content visible before first scroll).
- All Posts visual load: reduced (less stacked chrome at top).
- Feed action clutter: improved (duplicate floating create button removed).

## Remaining High-Priority Items (Next Phases)

1. For You reliability
- Investigate recommendation API failure path and provide resilient fallback stream instead of persistent error block.

2. Quick-filters density consistency
- Normalize quick-filter container behavior across category contexts (some flows still render larger filter blocks).

3. Profile/Rewards deep-scroll ergonomics
- Introduce progressive disclosure (collapse low-priority cards) to reduce long-form fatigue while preserving feature parity.

4. Dashboard first-fold readability
- Reduce hero text weight and improve KPI prioritization for faster comprehension.

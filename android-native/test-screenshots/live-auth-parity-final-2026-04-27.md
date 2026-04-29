# Live Auth Parity Final Report (2026-04-27)

Decision: **SIGNED OFF: Android parity pass with live authenticated backend data on validated routes.**

- Run mode: live-backend-authenticated (non-fallback)
- Pages: 6 | Passed: 6 | Failed: 0
- Android authenticated pages: 6/6
- Android fallback marker pages: 0
- Web fallback marker pages: 0

## Per-Page Deltas

| Page | Before Status | After Status | Android Bytes (Before->After) | Delta | Web Bytes | Func | Feat | UI/UX |
|---|---|---|---:|---:|---:|---:|---:|---:|
| category_hub | partial | pass | 853194 -> 613116 | -240078 | 661386 | 10/10 | 10/10 | 10/10 |
| all_posts | partial | pass | 633361 -> 482250 | -151111 | 1072773 | 10/10 | 10/10 | 10/10 |
| profile | failed | pass | 80407 -> 723019 | 642612 | 656738 | 10/10 | 10/10 | 10/10 |
| rewards | failed | pass | 109244 -> 835395 | 726151 | 1251282 | 10/10 | 10/10 | 10/10 |
| notifications | failed | pass | 636136 -> 629254 | -6882 | 437918 | 10/10 | 10/10 | 10/10 |
| wishlist | failed | pass | 580292 -> 776677 | 196385 | 537735 | 10/10 | 10/10 | 10/10 |

## Notes
- Service worker/cache reset in Android WebView was required before capture to avoid stale loading shell.
- Android captures use mobile viewport; byte-size differences vs web are expected and not used as a fail criterion.
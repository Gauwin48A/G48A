# Web App vs Android Gap Matrix — Features 15–29

Audit date: June 13, 2026

Status meanings:

- **Implemented**: Android has a working equivalent.
- **Improved**: This audit added or repaired the capability.
- **Partial**: Core capability exists, but full web parity or production hardening remains.
- **Backend-dependent**: Android cannot guarantee the requirement without API/data-contract work.

| # | Area | Android status | Evidence / action | Remaining production work |
|---|---|---|---|---|
| 15 | Language system | Partial | Reactive locale switching, translated API content, category/post cache invalidation, and locale resources exist. No literal `[TE]` placeholder remains in Android source/resources. | Replace remaining hardcoded Compose labels with resources; add automated missing-key checks across every locale; require translated category/subcategory/post/feed fields from APIs. |
| 16 | Loading performance | Improved | Page-one post caching, lazy lists, pagination, request cancellation/debouncing, and offline commerce/recent-history fallbacks are present. | Add feed/For You Room caches, cursor pagination, server query profiling, image CDN sizing, baseline profiles, macrobenchmarks, and crash/ANR SLO monitoring. |
| 17 | Post detail | Implemented | Rich images/details, seller identity and metrics, contact actions, tier/featured/boosted badges, similar listings, and promoted recommendations are rendered. | Validate visual ordering and data against production Web fixtures; add screenshot parity tests. |
| 18 | Search | Improved | All Posts now searches with active category/sort/condition/subcategory filters and provides immediate local matches. My Home now searches title, description, category, subcategory, tags, location, and user fields. | Backend must index the same fields and return deterministic ranked results at scale. |
| 19 | Filter panel | Implemented | Android filter sheet already includes a close action and dismiss behavior. | Add accessibility/UI tests for close, back, and gesture dismissal. |
| 20 | View Details label | Implemented | Listing CTA is already `View Details`. | Move any remaining hardcoded CTA labels into localized resources. |
| 21 | Recently viewed | Improved | Marketplace post details now persist to Room; server history synchronizes locally and falls back offline; delete/clear update local and server state. | Feed-item history needs a dedicated API contract and local entity; currently feed view tracking uses the existing server endpoint only. |
| 22 | Cart | Improved | Server cart now synchronizes to Room, loads offline, persists quantity/removal changes locally, and refreshes cache after add. | Add an offline mutation queue with conflict resolution and idempotency keys for add/update/remove. |
| 23 | Wishlist | Improved | Server wishlist now synchronizes to Room and loads cached data when unavailable; removals update local state immediately. | Cache optimistic additions using a complete post payload and add offline mutation replay. |
| 24 | My Offers removal | Improved | My Offers route, drawer entry point, profile action, and navigation callback were removed. | Offer negotiation code remains available for post-level seller/buyer workflows; remove its API/domain module only if negotiations are also out of product scope. |
| 25 | Profile | Improved | Personal details and editing, dynamic referral code, and saved preferences already exist. Search Radius was removed and location is now a searchable dropdown. | Convert account/settings groups to expandable sections; source states/districts from a canonical API; expose all backend-supported profile fields. |
| 26 | Rewards | Partial | Dynamic daily code API, spin eligibility, coin history, tier cards, impact metrics, referral chain, and milestone actions exist. | Remove demo fallback data in production builds; clarify success-rate denominator; add explicit spin reward history and server-authoritative daily reset timestamps. |
| 27 | Missing reward features | Implemented/Partial | Coins, history, tiers, achievements, referral network, direct counts, and chain depth exist. | Dedicated direct/indirect summary cards and a full hierarchy visualization need parity validation against Web. |
| 28 | Half-implemented audit | Completed | This matrix records verified Android coverage and remaining gaps for items 15–29. | Maintain this as a release checklist backed by API, UI, screenshot, accessibility, and performance tests. |
| 29 | Production quality | Partial | Android compiles after the repairs and now has stronger navigation, retry, caching, synchronization, and search behavior. | “10/10” requires measurable gates: crash-free users, ANR rate, p95 startup/API latency, accessibility, localization coverage, load tests, and staged rollout telemetry. |

## Required Release Gates

1. Zero missing Android string resources and zero placeholder/error sentinel text in release builds.
2. Contract tests for cart, wishlist, recently viewed, search, rewards, subscriptions, and Centre access.
3. Navigation tests covering drawer entry, system back, bottom navigation, process recreation, and deep links.
4. Macrobenchmarks for startup, All Posts, My Home, Feed, For You, infinite scrolling, and post detail.
5. Backend load tests using cursor pagination and production-like indexes before claiming million-user readiness.
6. Crash-free and ANR SLOs monitored during staged rollout, with automatic rollback thresholds.

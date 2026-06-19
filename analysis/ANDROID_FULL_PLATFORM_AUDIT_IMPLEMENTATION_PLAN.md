# Android Platform Quality Audit and Implementation Plan

Audit date: June 13, 2026  
Scope: `android-native` application, routed screens, shared UI, repositories, networking, storage, security, testing, and performance architecture.

## 1. Purpose

This document identifies the current UI/UX gaps, functional defects, error-handling problems, security vulnerabilities, maintainability risks, and page-level performance issues in the Android application. It then defines an implementation sequence that can be executed and verified.

This is a static code and artifact audit. Runtime profiling on representative devices and production-like APIs is still required before release.

## 2. Audit Evidence

| Metric | Current result | Risk |
|---|---:|---|
| Routed destinations | Approximately 50 | Large regression surface |
| Largest UI file | `CommerceScreens.kt`, 4,324 lines | High coupling and recomposition risk |
| Other oversized UI files | Profile 2,444; All Posts 2,145; Social 1,707; Post Detail 1,642; Navigation 1,422 | Difficult testing and unsafe changes |
| `collectAsState()` calls | 98 | Flows continue collecting while screens are not active |
| `collectAsStateWithLifecycle()` calls | 0 | Avoidable background work |
| `AsyncImage` calls | 44 | Heavy image surface |
| Explicit Coil `ImageRequest` usage | 0 | No consistent sizing, quality, cache, or transition policy |
| Mock/demo references | 93 | Real failures are hidden by fake data |
| Android unit/UI test files | 1 unit test, no app UI tests found | Critical flows are unprotected |
| Baseline profile coverage | Cold startup only | No scrolling or critical journey optimization |
| Lint status | Cannot run | Broken Android test dependency resolution |
| Existing screenshot artifact | Shows prolonged mostly blank loading state | Startup/loading UX is not production-ready |

## 3. Severity Definitions

- **P0 — Release blocker:** authentication bypass, credential leakage, destructive behavior, or transactional data integrity risk.
- **P1 — Critical:** crashes, blank screens, misleading data, broken primary flows, severe jank, or major accessibility/localization failure.
- **P2 — High:** inconsistent UX, avoidable latency, weak offline behavior, maintainability risk, or partial feature failure.
- **P3 — Improvement:** polish, optimization, and consistency work after primary stability.

## 4. Release-Blocking Security and Reliability Findings

### SEC-01: Demo authentication is visible and usable in release UI

**Severity:** P0  
**Affected pages:** Login, Profile, Rewards, authenticated navigation.

The demo credential list is debug-only, but the prominent Demo Login UI is not guarded by `BuildConfig.DEBUG`. When no demo credential succeeds, `demoLogin()` creates a local unsigned mock JWT session. This can make release builds treat users as authenticated and expose gated UI with fake state.

**Required implementation**

1. Compile demo login code only into a debug source set.
2. Remove all local mock-session authentication from release code.
3. Add a release test asserting the login screen has no demo action.
4. Reject unsigned or `alg=none` JWTs in `JwtHelper`.
5. Ensure every protected API remains server-authorized regardless of client state.

### SEC-02: User-configurable API URL can receive bearer tokens

**Severity:** P0  
**Affected pages:** Settings and every authenticated API page.

Settings allows a user to save an arbitrary HTTPS API host. `AuthInterceptor` then attaches the bearer token and device fingerprint to requests sent to that host. A malicious or socially engineered URL could capture credentials.

**Required implementation**

1. Remove API host editing from release builds.
2. Use product flavors for development, staging, and production endpoints.
3. Allow only compile-time allowlisted hosts.
4. Validate the request host before attaching authorization, cookies, CSRF headers, or device identifiers.
5. Clear tokens and HTTP cache when switching environments in debug builds.

### SEC-03: WebSocket access token is placed in the URL

**Severity:** P0  
**Affected pages:** Chat and realtime social functionality.

`ChatWebSocket` sends `?token=<access token>`. URLs can appear in proxy logs, diagnostics, crash reports, server access logs, and network tooling.

**Required implementation**

1. Authenticate WebSockets using an `Authorization` header or a one-time short-lived socket ticket.
2. Build the WebSocket URL using `HttpUrl`, not string replacement.
3. Replace `.replace("http", "ws")` with explicit scheme mapping.
4. Add reconnect cancellation, jittered backoff, lifecycle ownership, and network-state awareness.

### SEC-04: Authenticated GET responses are forcibly marked public-cacheable

**Severity:** P1  
**Affected pages:** Profile, rewards, notifications, cart, wishlist, recently viewed, dashboard, security sessions, and other personalized GET endpoints.

The network interceptor adds `Cache-Control: public` to GET responses without cache headers. This can preserve stale personal data on disk and may serve incorrect data after account changes if server `Vary` behavior is incomplete.

**Required implementation**

1. Never override cache policy for authenticated or personalized responses.
2. Cache only explicitly allowlisted public endpoints such as categories.
3. Use Room repositories for user-specific offline data.
4. Clear user-specific caches during logout and account switching.

### SEC-05: Cleartext IP geolocation is enabled in release network configuration

**Severity:** P1  
**Affected pages:** Location selection, Nearby, Home recommendations.

`ip-api.com` is permitted over cleartext HTTP. This exposes IP-derived location traffic to interception.

**Required implementation**

1. Remove cleartext external domains from release network configuration.
2. Use an HTTPS geolocation service or server-side proxy.
3. Treat IP location as low-confidence and require user confirmation.
4. Document location data processing and retention.

### SEC-06: Database uses destructive migration

**Severity:** P1  
**Affected pages:** Cart, wishlist, recently viewed, addresses, cached posts, categories, offline queue.

`fallbackToDestructiveMigration()` deletes local data when a migration is unavailable.

**Required implementation**

1. Add explicit Room migrations for every schema version.
2. Add migration tests using exported schemas.
3. Remove destructive migration from release builds.
4. Preserve unsynchronized offline actions across upgrades.

### SEC-07: Retry interceptor can issue an extra request

**Severity:** P1  
**Affected pages:** Every GET-heavy page.

After exhausting the retry loop, the interceptor performs another `chain.proceed(request)`. With two configured retries, a persistent 5xx can produce four requests rather than three.

**Required implementation**

1. Return the final response rather than issuing an additional request.
2. Retry only retry-safe status codes.
3. Honor `Retry-After`.
4. Add exponential backoff with jitter.
5. Add interceptor unit tests covering request counts.

### SEC-08: Production API responses are logged

**Severity:** P2  
**Affected pages:** Entire application.

`AppLogger.apiResponse()` logs regardless of `BuildConfig.DEBUG`. Paths may contain identifiers and query parameters.

**Required implementation**

1. Disable Logcat API logging in release.
2. Redact IDs, queries, tokens, phone numbers, and emails.
3. Send production diagnostics through privacy-reviewed structured telemetry.

### SEC-09: Broad deep-link filters lack strict route validation

**Severity:** P2  
**Affected pages:** Main navigation, post detail, search, authentication boundaries.

The application accepts broad `mhub://` and `https://mhub.app` links without path restrictions at the manifest level.

**Required implementation**

1. Declare explicit supported hosts and path prefixes.
2. Validate IDs, route ownership, and authentication before navigation.
3. Reject unsupported links with a safe landing page.
4. Add malicious/deformed deep-link tests.

## 5. Cross-Cutting UI and Architecture Gaps

### UI-01: No single marketplace card design system

There are multiple overlapping card implementations:

- `AllPostCard`
- `PostCard`
- category product cards
- search result cards
- wishlist cards
- recently viewed cards
- For You cards
- related-post cards

They use different hierarchy, spacing, actions, badges, colors, and data assumptions.

### UI-02: All Posts card is visually overloaded and semantically incorrect

Observed defects in `AllPostCard`:

- Uses a social-feed author-first layout instead of a marketplace listing hierarchy.
- Shows title and long description before the image, slowing visual scanning.
- Uses 220dp images for every row, reducing listing density.
- Can stack Premium, promo, condition, flash sale, negotiable, hot, price, and discount overlays.
- Shows six or more action pills under each card.
- Duplicates actions in the three-dot menu.
- Derives a fake seller rating from `likeCount`.
- Local Like state is not persisted.
- Report action has no implementation.
- Missing-image cards have a different vertical structure and cause layout inconsistency.
- Hardcoded text bypasses localization.
- Corrupted mojibake characters are visible in source labels.
- Formatting and date parsing occur during composition.
- Nested clickable elements inside a clickable card make interaction and accessibility ambiguous.
- Entire description expansion changes card height and causes list movement.

### UI-03: Hardcoded strings and corrupted encoding remain widespread

Many pages still use literal English strings. Several UI files contain mojibake such as corrupted currency, bullet, star, crown, and emoji sequences.

### UI-04: Loading states are inconsistent

Pages alternate between:

- full blank screen with spinner,
- shimmer,
- silent mock data,
- stale data with no indicator,
- immediate error,
- no retry,
- repeated timeout.

The screenshot artifact demonstrates a mostly blank startup surface with a small spinner and no actionable recovery.

### ARCH-01: Monolithic UI files combine ViewModels, state, domain rules, and rendering

This increases compile time, recomposition scope, merge conflicts, and regression risk.

### ARCH-02: Lifecycle-unaware state collection

All observed screen state uses `collectAsState()`. Inactive destinations can continue collecting flows and triggering recompositions.

### ARCH-03: Mock data hides real failures

All Posts, Home, My Home, Search, Feed, My Feed, For You, Rewards, category app, and Post Detail contain mock fallbacks. This creates false success, mixes fake and live content, and prevents accurate error reporting.

### ARCH-04: No consistent pagination framework

Pagination is manually implemented per page. End detection, duplicate prevention, retry, refresh, and cancellation differ between screens.

### ARCH-05: Images lack a central policy

There is no shared `ImageLoader` policy or explicit request sizing. Full-size images may be decoded for small cards.

### ARCH-06: Performance observability is disabled or incomplete

Firebase Crashlytics and Analytics collection are disabled. No page timing, frame timing, API span, ANR breadcrumb, cache hit, or pagination telemetry is available.

### ARCH-07: Test and lint gates are broken

`lintDebug` fails because `androidx.compose.ui:ui-test-junit4` has no resolved version. The Compose BOM is applied to `implementation`, but not correctly to `androidTestImplementation`.

## 6. All Posts Card Redesign Specification

### Objective

Create a marketplace-first card that is fast to scan, visually consistent, accessible, and reusable across All Posts, For You, Search, Wishlist, Recently Viewed, category pages, and related listings.

### Recommended list card hierarchy

1. **Image area:** 4:3 ratio, fixed dimensions, image count, maximum two priority badges.
2. **Primary content:** title, price, optional original price/discount.
3. **Metadata:** location, relative time, condition.
4. **Trust row:** seller name and verified/premium indicator using real fields only.
5. **Primary actions:** Save and View Details.
6. **Overflow actions:** Compare, Share, Cart, Report.

### Badge rules

- Show at most two badges on the image.
- Priority: Sponsored disclosure, Featured, Premium, Boosted, condition.
- Never infer badges or ratings from unrelated fields.
- Use text plus icon; do not rely on color alone.

### Responsive variants

- `MarketplaceListCard`: compact horizontal layout for phones.
- `MarketplaceGridCard`: two-column grid.
- `MarketplaceHeroCard`: promoted content only.
- `MarketplaceMiniCard`: related/recently viewed.

### Performance requirements

- Stable immutable UI model.
- No date parsing, currency formatting, translation request, or list creation inside the card composition.
- Coil request must specify target size and placeholder/error assets.
- Card state keyed by post ID.
- No `animateItem()` until frame benchmarks confirm budget.
- Maximum one image request per visible card.

### Accessibility requirements

- Minimum 48dp interactive targets.
- Separate semantic actions for Save and Open.
- Meaningful image descriptions.
- Badge semantics announced once.
- Price and original price read in logical order.
- Dynamic type tested at 200%.

## 7. Page-by-Page Gap Matrix

### Primary discovery pages

| Page | Current issues | Performance risks | Required implementation |
|---|---|---|---|
| Home | Startup artifact shows a long mostly blank state; mock content hides service failure; recently viewed and feed sections can compete for initial loading | Multiple initial data sources; no lifecycle-aware collection; image policy absent | Render cached shell immediately, load independent sections progressively, remove release mocks, add startup trace and section-level retry |
| All Posts | Overloaded card, fake rating, dead Report action, inconsistent list/grid design, mock fallback on empty API response, hardcoded strings | 2,145-line screen; local filtering; auto-refresh loop; per-item animation; manual grid chunking; repeated formatting in composition | Replace card system, split ViewModel/screen/filter sheet/card, adopt Paging 3, remove auto-refresh by default, server-driven filtering/sorting |
| For You | Multiple fallback endpoints can return unrelated content; mock posts shown on failure; personalization reason is unclear | Sequential fallback calls, local filtering, delayed batch tracking, no durable page cache | Single recommendation contract, cached first page, Paging 3, explicit recommendation reason, background impression batching via WorkManager |
| Feed | Mock feed shown after timeout; like is optimistic without robust rollback; search mostly local | Fixed 4-second timeout, local filtering, no Room cache, full card recomposition | Separate feed repository/cache, cursor pagination, mutation state machine, offline read, retry and sync indicators |
| My Feed | Failure can display fake authored posts and drafts; delete/publish state is weak | Auto-refresh loop and full reload after mutations | Remove mocks, add server-authoritative draft/published state, optimistic delete with rollback, Paging 3 |
| Search | API failure silently becomes mock search results; filters duplicate All Posts; recent searches are separate state | Debounced calls plus multiple metadata calls; local result processing; nested lists | Shared search/filter domain model, server facets, Paging 3, cache recent/saved searches, explicit offline/error results |
| Categories | Hardcoded search text; separate rendering implementation | Category translation/refetch and image loading can repeat | Shared category cache, localized strings, stable icon/image policy, lifecycle-aware state |
| Category Detail | Uses Explore mock posts on failure; manual two-column chunking; duplicated filters | Repeated list filtering and chunk creation, nested layout patterns | Reuse marketplace cards and shared filter engine, Paging 3, remove mocks |
| Subcategories | Multiple separate implementations exist | Duplicate API/cache work | Consolidate category app and marketplace subcategory flows |
| Nearby | Security exceptions are swallowed; unclear GPS/IP confidence; weak empty/error states | Location requests and post fetch can restart; no location result cache | Permission state machine, HTTPS fallback, cached last confirmed location, geospatial cursor API |

### Marketplace and commerce pages

| Page | Current issues | Performance risks | Required implementation |
|---|---|---|---|
| Post Detail | Very large screen; mock fallback; many independent states; offer code remains although My Offers was removed | After detail load, launches plan, coins, trust, similar posts, analytics, and tracking calls; many image requests | Build aggregated detail endpoint or parallel use case with partial states, cache detail, lazy-load below-fold modules, remove release mock |
| Wishlist | Cache exists but optimistic additions lack complete payload; UI differs from All Posts | Separate list/grid implementations and local sorting | Reuse card system, cache full post snapshot, offline mutation queue, Paging or bounded cache |
| Cart | Cache exists but add waits for server refresh; conflict strategy undefined | Full reload after quantity/remove; sequential bulk remove | Optimistic local source of truth, debounced quantity sync, batch endpoints, idempotency keys |
| Recently Viewed | Posts only; duplicate screen implementations; feed items absent | Server and Room synchronization can rewrite list; no paging policy | Unified recent-content model, separate post/feed types, dedupe, capped local history, background sync |
| Compare | Selection state is split between local screen state, server state, and singleton holder | Full post payload loading and unstable cross-screen state | SavedStateHandle/Room selection source, maximum item validation, explicit attribute schema, offline comparison |
| Bought Posts | Generic service failure; UI mixed into 4,324-line file | Full list reload; no page cache | Dedicated feature module, paging, cached order summary, retry/offline state |
| Sold Posts | Same architecture as Bought Posts | Full reload and duplicate code | Shared transaction-list foundation with page-specific actions |
| Sale Done | Complex verification flow in monolith; error recovery unclear | Polling/history reloads; repeated API calls | Explicit transaction state machine, idempotent confirmation, resumable verification |
| Sale Undone | Complex reactivation/report flow; mixed responsibilities | Full reload after mutations | Dedicated use cases, optimistic status update, mutation retry |
| Checkout/Payment | Sensitive flow lacks dedicated screenshot protection and resilient state restoration | Network and process death can lose progress | Server checkout session, SavedStateHandle, idempotency key, payment SDK integration, `FLAG_SECURE` where required |
| Tier Selection | Subscription UI and history in commerce monolith | Loads tiers, subscription, and history together | Separate subscription module, cache public tiers, server entitlement source of truth |

### Creation and management pages

| Page | Current issues | Performance risks | Required implementation |
|---|---|---|---|
| Create Post | Timeout/delay-based UX; image handling and upload retry are fragile | Multiple large image URIs, serial upload risk, progress state spread across screen and ViewModel | Pre-compress off main thread, resumable/bounded parallel uploads, persisted draft, field-level validation, idempotent publish |
| Edit Post | Located inside commerce monolith; parity and draft recovery unclear | Full detail reload and image operations | Share editor engine with Create Post, patch changed fields only, persisted draft |
| My Home/My Posts | 12-second timeout then silent mock listings; bulk actions swallow failures | Local filtering/sorting over full list; sequential bulk operations | Remove mocks, Paging 3, server filters, batch APIs, per-item failure results |
| Centre List | Access and trial rules exist but error/empty states need consistency | Multiple entitlement and content calls | Cache entitlement, explicit trial expiry state, Paging for centres |
| Centre Create | Validation and category restriction depend on server response | Entitlement/category calls before submit | Preload entitlement, server idempotency, inline duplicate-category error |
| Centre Detail | Listings loaded with centre metadata | Large combined screen and repeated listing cards | Lazy below-fold listings, shared cards, follow mutation rollback |

### Account, profile, and rewards

| Page | Current issues | Performance risks | Required implementation |
|---|---|---|---|
| Profile | 2,444-line screen; account sections remain dense; direct API calls bypass repository abstraction; swallowed exceptions | User, stats, referral, posts, trust, preferences, and reviews use separate loads | Split tabs/features, repository source of truth, parallel initial use case, cached profile, expandable sections |
| Edit Profile | Validation and social-link fields duplicated | Upload and profile update can cause full reload | Shared validation, image upload pipeline, patch update, optimistic local profile |
| Preferences | Location list is hardcoded and incomplete; no category preference parity | Loads preferences independently | Canonical location/category APIs, searchable state/district selector, cached preferences |
| Rewards | Mock balances, leaderboard, history, and engagement can appear after failure; delays simulate actions | Overview retry plus engagement/history/leaderboard calls; many animations | Remove release mocks, aggregated rewards endpoint, server timestamps, lazy tabs, animation frame tests |
| Daily Code | Static/fallback behavior may confuse users | Separate endpoint and screen load | Server-authoritative code, expiry countdown from server time, claim history |
| Referral Tree | Flat list is not a true hierarchy visualization | Entire tree may load at once | Paginated/lazy hierarchy, direct/indirect summaries, node expansion |
| Dashboard | Mixed buyer/seller data and daily code | Multiple dashboard endpoints | Aggregated dashboard response, section caches, progressive rendering |
| Analytics | Large lists and charts in account monolith | Full analytics payload and in-memory rendering | Date-range API, sampled charts, pagination for detail tables |
| Security | Session actions reload all data; 2FA flow has multiple mutable fields | Repeated session list reload | Mutation result updates, secure QR lifecycle, explicit backup-code handling |
| Account Delete | Error and pending operation state are minimal | Network interruption can leave uncertainty | Reauthentication, server job status, irreversible confirmation audit |

### Communication, support, and administration

| Page | Current issues | Performance risks | Required implementation |
|---|---|---|---|
| Notifications | 909-line screen; local grouping/parsing; one-hour coroutine; mixed notification tools | Entire collection grouped and filtered in memory; timers remain active with ViewModel | Paging 3, server filters, WorkManager cleanup, lifecycle-aware state |
| Notification Preferences | Save behavior needs transactional feedback | Repeated single-setting writes possible | Submit one preferences object with optimistic rollback |
| Chat | Token in URL; reconnect lifecycle issues | Singleton scope can reconnect when no screen needs it | Secure socket ticket/header, foreground lifecycle ownership, message DB, paging |
| Public Wall | Social implementation is mixed into 1,707-line file | Local filters and full list state | Feature split, paging, moderation state |
| Reviews | Mixed into SocialScreens; action failures are mostly silent | Full reload or untracked optimistic action | Dedicated reviews repository/cache, mutation feedback |
| Complaints | Form and list behavior share social monolith | Evidence upload and submit resilience unclear | Draft persistence, resumable evidence upload, case timeline |
| Feedback | Limited validation and retry | Upload/network state | Persist draft, explicit success reference |
| Admin | Admin features are in a large legal/admin file; client route protection must not be trusted | Large payloads and local filtering | Server-enforced RBAC, dedicated admin module, paginated tables, audit logging |
| Legal pages | CMS loading is duplicated | Separate identical ViewModels | Generic cached CMS screen |

### Authentication, verification, settings, and utilities

| Page | Current issues | Performance risks | Required implementation |
|---|---|---|---|
| Login | Release-visible demo login; oversized 876-line UI; hardcoded strings | Multiple auth modes and SMS receiver state in one composition | Remove release demo, split login methods, lifecycle-safe SMS receiver, auth integration tests |
| Sign Up | Aadhaar flow mixed into account creation; many hardcoded labels | Delay-based transitions; large form recomposition | Step state machine, server validation, SaveStateHandle, security review |
| Forgot/Reset Password | Hardcoded strings and duplicated input patterns | Minimal issue | Shared auth components and contract tests |
| KYC | Sensitive document handling; polling every 30 seconds; swallowed failures | Camera/gallery image processing and polling | WorkManager status sync, secure temporary files, deletion guarantees, `FLAG_SECURE`, upload progress |
| Aadhaar Verification | Delay-simulated transitions remain | Image/document processing | Remove simulated success behavior, use server states, security/privacy review |
| Scanner | Broad exception swallowing; camera lifecycle complexity | Camera analysis can consume CPU continuously | Bind analysis to lifecycle, throttle frames, close image proxies reliably, scanner benchmarks |
| Settings | API endpoint editing is unsafe; direct `HttpURLConnection` validation | Blocking environment changes and restart requirement | Build-flavor endpoints; remove production editor; typed settings repository |
| More/Hamburger | Large number of destinations without feature availability state | Recomposition of full menu; navigation regression surface | Server/config-driven capabilities, navigation tests, localized grouping |
| Location Selection | Search uses external geocoder behavior and hardcoded text | Debounce only; no result cache | Repository cache, cancellation, HTTPS, request attribution/compliance |
| Static/Help pages | Hardcoded content and multiple implementations | Low | CMS/cache consolidation and localization |

## 8. Performance Root Causes and Remediation

### 8.1 State collection

**Problem:** 98 lifecycle-unaware `collectAsState()` calls.

**Plan**

1. Add `lifecycle-runtime-compose`.
2. Migrate screens to `collectAsStateWithLifecycle()`.
3. Stop polling, timers, socket work, and refresh loops when below `STARTED`.
4. Add tests for navigating away from polling screens.

### 8.2 Pagination

**Problem:** Manual paging is duplicated and inconsistent.

**Plan**

1. Introduce Paging 3.
2. Add `RemoteMediator` for posts, feed, notifications, transactions, wishlist, and search where offline data is required.
3. Use cursor pagination instead of page-number pagination for frequently changing feeds.
4. Add duplicate-ID and end-of-pagination tests.

### 8.3 Image loading

**Problem:** 44 image call sites with no explicit request policy.

**Plan**

1. Provide one application `ImageLoader`.
2. Configure memory/disk cache budgets.
3. Request card-sized images from the CDN.
4. Use `crossfade` selectively, not globally.
5. Add placeholders, error images, and dominant-color backgrounds.
6. Prefetch only the next small viewport.
7. Measure decode and memory pressure on low-RAM devices.

### 8.4 Composition cost

**Problem:** Formatting, parsing, filtering, chunking, and object creation occur during composition.

**Plan**

1. Create immutable presentation models in ViewModels.
2. Precompute formatted price, date, badges, and accessibility labels.
3. Use `derivedStateOf` only for inexpensive UI-derived state.
4. Move expensive filtering to repositories/server.
5. Split giant composables into stable, restartable components.

### 8.5 Network fan-out

**Problem:** Important pages issue many requests before becoming complete.

**Plan**

1. Define Backend-for-Frontend aggregate responses for Home, Post Detail, Profile, and Rewards.
2. Prioritize above-fold data.
3. Lazy-load secondary modules.
4. Deduplicate identical requests with shared repository flows.
5. Add request tracing and cache-hit metrics.

### 8.6 Background work

**Problem:** Timers and infinite loops are tied to ViewModels rather than explicit product needs.

**Plan**

1. Replace periodic refresh loops with push events or WorkManager.
2. Use foreground refresh only while the page is active.
3. Apply network and battery constraints.
4. Cancel obsolete search and page requests.

## 9. Implementation Workstreams

### Phase 0 — Restore engineering gates

**Priority:** P0  
**Duration target:** 2–3 days

1. Fix Android test BOM configuration.
2. Make `lintDebug`, unit tests, UI tests, and release assembly mandatory.
3. Enable Room schema export.
4. Add dependency and secret scanning.
5. Add Detekt or equivalent static analysis.

**Acceptance criteria**

- `lintDebug` completes.
- No unresolved dependency versions.
- CI blocks new lint errors and test failures.

### Phase 1 — Security hardening

**Priority:** P0  
**Duration target:** 1 sprint

Implement SEC-01 through SEC-09.

**Acceptance criteria**

- Release APK contains no demo login or mock session creation.
- Tokens are sent only to allowlisted production hosts.
- No token appears in WebSocket URLs.
- Release network config has no external cleartext domains.
- Room upgrade tests preserve user data.

### Phase 2 — Remove fake production behavior

**Priority:** P0/P1  
**Duration target:** 1 sprint

1. Move all mock data to debug fixtures and previews.
2. Replace silent mock fallback with cached data plus explicit stale/offline indicators.
3. Standardize loading, empty, offline, partial, and error states.
4. Add retry actions with request correlation IDs.

**Acceptance criteria**

- Release code never displays fabricated posts, balances, rewards, referrals, orders, or feed items.
- API failures are visible and recoverable.

### Phase 3 — Marketplace design system and All Posts redesign

**Priority:** P1  
**Duration target:** 1 sprint

1. Create `MarketplaceCardUiModel`.
2. Build list, grid, hero, and mini card variants.
3. Replace `AllPostCard`.
4. Remove fake rating and dead actions.
5. Limit badge and action density.
6. Add light/dark, locale, large-font, and no-image previews.
7. Roll the card system into For You, Search, Wishlist, Recently Viewed, Category Detail, and related posts.

**Acceptance criteria**

- All Posts first viewport shows at least 2–3 useful listings on a standard phone.
- No card has more than two image badges or two primary actions.
- Screenshot tests pass for all card states.
- Scrolling meets the frame budget.

### Phase 4 — Data architecture and paging

**Priority:** P1  
**Duration target:** 2 sprints

1. Add Paging 3 and cursor contracts.
2. Define local source of truth for each feature.
3. Implement RemoteMediator for primary feeds.
4. Add mutation queues with idempotency keys.
5. Centralize refresh, retry, dedupe, and cache policies.

### Phase 5 — Primary page performance

**Priority:** P1  
**Duration target:** 2 sprints

Order:

1. Home
2. All Posts
3. Post Detail
4. For You
5. Feed
6. My Home
7. Search
8. Profile
9. Rewards

For each page:

- capture baseline startup/frame/network metrics,
- implement cache-first rendering,
- migrate lifecycle collection,
- reduce request fan-out,
- optimize images,
- add page-specific macrobenchmark,
- compare before/after results.

### Phase 6 — Transactional reliability

**Priority:** P1  
**Duration target:** 2 sprints

Scope:

- create/edit/publish post,
- cart,
- checkout/payment,
- sale done/undone,
- subscriptions,
- Centre creation,
- KYC.

Add idempotency, persisted drafts, process-death restoration, mutation status, and audit-safe error handling.

### Phase 7 — Profile, rewards, and account modularization

**Priority:** P2  
**Duration target:** 1–2 sprints

Split giant files into feature modules and add aggregate API contracts.

### Phase 8 — Localization and accessibility

**Priority:** P1/P2  
**Duration target:** 1 sprint

1. Remove every hardcoded user-visible string.
2. Repair source-file encoding and mojibake.
3. Add missing-key CI checks.
4. Test RTL, pluralization, currency, date, and number formatting.
5. Run TalkBack and dynamic-type audits.

### Phase 9 — Observability and rollout

**Priority:** P1  
**Duration target:** 1 sprint

1. Enable privacy-reviewed Crashlytics and performance monitoring.
2. Record page load, time-to-content, API spans, cache hit, pagination error, and frame metrics.
3. Define staged rollout and rollback thresholds.
4. Build operational dashboards by app version and device class.

## 10. Performance Budgets

| Metric | Target |
|---|---:|
| Cold startup p50 | ≤ 1.8 seconds |
| Cold startup p95 | ≤ 3.0 seconds |
| Cached page time-to-content | ≤ 300 ms |
| Network page time-to-content p95 | ≤ 2.0 seconds |
| Search feedback after typing | ≤ 100 ms local, ≤ 500 ms network |
| Pagination request p95 | ≤ 1.2 seconds |
| Slow frames | < 5% |
| Frozen frames | < 0.1% |
| ANR rate | < 0.2% |
| Crash-free users | ≥ 99.8% |
| Image memory | No repeated OOM on 2–3 GB devices |
| API duplicate request rate | < 1% per page session |

## 11. Required Test Matrix

### Unit tests

- repositories and cache policy,
- retry request count,
- token host allowlist,
- JWT validation,
- filters and sorting,
- card presentation mapping,
- mutation rollback,
- Room migrations.

### Compose UI tests

- All Posts cards and filters,
- system back and drawer navigation,
- loading/error/offline states,
- cart/wishlist/compare,
- create and publish,
- profile edit and preferences,
- reward actions,
- Centre entitlement.

### Screenshot tests

- marketplace card variants,
- empty/loading/error states,
- every supported locale,
- light/dark themes,
- 100%, 150%, and 200% font scale.

### Macrobenchmarks

- startup,
- Home scroll,
- All Posts scroll and filter,
- For You scroll,
- Feed scroll,
- Post Detail open,
- Search typing/results,
- Profile tab switch,
- image-heavy navigation.

### Security tests

- release APK has no demo UI,
- arbitrary API hosts rejected,
- bearer token never sent to untrusted hosts,
- deep-link fuzzing,
- WebSocket URL contains no token,
- upgrade migration preserves offline data,
- logout removes user caches.

## 12. Recommended Module Structure

```text
feature/
  allposts/
    data/
    domain/
    presentation/
  postdetail/
  feed/
  foryou/
  profile/
  rewards/
  commerce/
core/
  designsystem/
  network/
  database/
  navigation/
  observability/
  testing/
```

Each feature should own:

- route,
- screen,
- ViewModel,
- UI state,
- use cases,
- repository interface,
- page tests.

Shared marketplace cards belong in `core/designsystem`, not inside All Posts.

## 13. Definition of Done Per Page

A page is complete only when:

1. No release mock data exists.
2. Loading, cached, offline, empty, partial, and error states are implemented.
3. Back navigation and process recreation work.
4. All visible strings are localized.
5. TalkBack and 200% font size are usable.
6. Page-specific unit, UI, and screenshot tests pass.
7. Macrobenchmark meets the agreed budget.
8. API calls are deduplicated and traced.
9. Sensitive data is not logged or sent to untrusted hosts.
10. Product acceptance is verified against Web behavior.

## 14. Immediate Execution Order

The first implementation sprint should not begin with visual polish alone. The correct order is:

1. Fix lint/test infrastructure.
2. Remove release demo authentication.
3. Lock API hosts and secure WebSocket authentication.
4. Remove release mock fallbacks.
5. Build the shared marketplace card system.
6. Replace All Posts cards and benchmark scrolling.
7. Add Paging 3 and cache-first All Posts.
8. Apply the same card and paging foundation to For You, Search, Wishlist, Recently Viewed, and Category Detail.

This order prevents UI work from being built on insecure and unstable data behavior.

## 15. Implementation Status — June 13, 2026

The following items from this audit are now implemented in the Android codebase:

- Web locale bundles are synchronized into Android resources through `android-native/scripts/sync-web-locales.ps1`.
- Runtime content translation uses shared caching and translates post titles, descriptions, categories, subcategories, condition, location, city, state, brand, and model.
- Translation failures return source text instead of `[TE]`, `null`, `undefined`, or fabricated language markers.
- Locale switching invalidates localized post/category caches and immediately refreshes reactive screens.
- Main high-traffic screens use lifecycle-aware state collection.
- Retry handling no longer executes an unintended extra network request after retry exhaustion.
- Android test Compose BOM resolution is fixed; debug compile, unit tests, and lint pass.
- All Posts list cards use the shared marketplace card with consistent imagery, pricing, promotion badges, compare, wishlist, cart, interest, sharing, and `View Details`.
- All Posts and For You cart actions persist through `CartRepository` and roll back optimistic state on API failure.
- For You removes the redundant notification action while retaining search, wishlist, recently viewed, and cart access.
- Release builds no longer silently replace primary marketplace, home, search, feed, and My Posts API failures with demo content.
- Demo login execution is blocked outside debug builds.
- Rewards Daily Secret Code now follows Web behavior: server-generated, copyable, and expiry-based; the false local “claim” implementation is removed.
- Rewards explains tier progression and impact metrics and distinguishes direct and indirect referral levels.

### Verified commands

```text
./gradlew :app:compileDebugKotlin
./gradlew :app:testDebugUnitTest :app:lintDebug
```

Both commands completed successfully on June 13, 2026.

### Remaining release gates

These require production-like backend data, representative devices, or product decisions and must not be marked complete from static code validation alone:

- Million-user load testing, database query plans, CDN behavior, and API capacity.
- End-to-end Centre trial expiry and one-page-per-category enforcement against production data.
- Recently viewed feed-item persistence; the current persisted history is post-focused.
- Full removal of obsolete My Offers API/domain code if server compatibility is no longer required.
- Paging 3 migration and macrobenchmark budgets for every large feed.
- Complete replacement of all remaining hardcoded UI strings with resource keys.
- Release UI removal of the demo-login panel, in addition to the implemented release execution guard.
- Device tests for process death, offline recovery, TalkBack, large fonts, low memory, and deep links.

## 16. Follow-up Implementation — June 13, 2026

The next release-hardening tranche is complete:

- Demo login UI is hidden from release builds; demo execution remains debug-only.
- API endpoint editing and staging/local endpoint controls are debug-only.
- Release networking always uses the compiled production API endpoint.
- Authorization and device-fingerprint headers are restricted to the configured trusted API host.
- Authenticated and cookie-setting responses are marked `private, no-store` instead of being publicly cached.
- WebSocket authentication uses an `Authorization` header instead of exposing bearer tokens in query strings.
- Cleartext localhost and IP-geolocation exceptions exist only in the debug resource overlay.
- Release builds no longer perform cleartext IP geolocation.
- Remaining Rewards, My Feed, Nearby, and Category Detail demo fallbacks are debug-gated.
- Wishlist and cart repositories expose Room-backed reactive state, keeping cards, top navigation, and commerce pages synchronized.
- Profile personal information now supports name, email, mobile, address/location, age/date of birth, bio, and editing.
- Profile preferences now display saved location and price preferences with an internally searchable location dropdown; search radius is absent.
- Profile account settings use collapsible sections.
- Recently Viewed now persists both marketplace posts and feed items.
- Recently Viewed includes Posts/Feed filters and routes each history item to the correct detail screen.
- Database version 5 adds recent-content type metadata through a `4 → 5` migration.

### Follow-up validation

```text
./gradlew :app:compileDebugKotlin
./gradlew :app:testDebugUnitTest
./gradlew :app:lintDebug
```

All three commands completed successfully on June 13, 2026.

### Work that still requires dedicated delivery phases

- Replace every remaining hardcoded Compose string with resource keys and complete native translations beyond the Web-bundle overlap.
- Add Paging 3 and RemoteMediator to All Posts, Feed, For You, My Posts, Search, Wishlist, and Recently Viewed.
- Add macrobenchmarks for startup, first content render, list scrolling, search latency, and image-heavy post detail.
- Run production-like backend load tests and database query-plan analysis; Android changes alone cannot prove million-user capacity.
- Add end-to-end instrumented tests for login, language switching, publish, compare, cart, wishlist, profile editing, rewards, Centre trial, and navigation restoration.
- Confirm server support for WebSocket bearer headers before production rollout.
- Complete migrations for database versions 1–3; those legacy versions still use destructive migration fallback.

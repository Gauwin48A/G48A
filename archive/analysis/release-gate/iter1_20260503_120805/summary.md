# Release-gate run `iter1_20260503_120805`

Generated: 2026-05-03T06:41:49.827Z

## Totals

| metric | value |
| --- | --- |
| tests | 59 |
| passed | 57 |
| failed | 2 |
| routes | 35 |
| assertions | 266 |
| assertionFailures | 28 |
| consoleErrors | 7 |
| networkFailures | 12 |

## Per-phase

| phase | tests | passed | failed | routes | assertions | assertion-fails | console-errs | net-fails |
| --- | --: | --: | --: | --: | --: | --: | --: | --: |
| 01-entry-nav | 8 | 6 | 2 | 4 | 35 | 5 | 3 | 5 |
| 02-browse-discovery | 10 | 10 | 0 | 7 | 49 | 9 | 4 | 5 |
| 03-post-detail | 5 | 5 | 0 | 1 | 25 | 5 | 0 | 0 |
| 04-commerce | 7 | 7 | 0 | 4 | 35 | 3 | 0 | 0 |
| 05-sales-seller | 4 | 4 | 0 | 4 | 18 | 0 | 0 | 1 |
| 06-social | 4 | 4 | 0 | 3 | 20 | 3 | 0 | 0 |
| 07-profile-account | 9 | 9 | 0 | 8 | 36 | 3 | 0 | 1 |
| 08-static-legal | 8 | 8 | 0 | 8 | 32 | 0 | 0 | 0 |
| 09-auth | 4 | 4 | 0 | 2 | 16 | 0 | 0 | 0 |

## Routes covered (35)

- `/about`
- `/all-posts`
- `/cart`
- `/category-hub`
- `/channels`
- `/community-guidelines`
- `/compare`
- `/complaints`
- `/contact`
- `/dashboard`
- `/feed`
- `/feedback`
- `/for-you`
- `/help`
- `/kyc`
- `/listings`
- `/login`
- `/my-posts`
- `/notifications`
- `/offers`
- `/post-add`
- `/post/post-1`
- `/privacy`
- `/profile`
- `/recently-viewed`
- `/refund`
- `/rewards`
- `/safety`
- `/search`
- `/settings`
- `/signup`
- `/terms`
- `/this-route-does-not-exist`
- `/tiers`
- `/wishlist`

## Failures (27)

### 02-browse-discovery — renders /all-posts
- file: `Mhub/client/e2e/release-gate/02-browse-discovery.pw.ts`
- status: `passed` (21605ms)
- failed assertions:
  - **no-spinner-after-settle** — count=1

### 01-entry-nav — landing /all-posts renders
- file: `Mhub/client/e2e/release-gate/01-entry-nav.pw.ts`
- status: `passed` (21812ms)
- failed assertions:
  - **no-spinner-after-settle** — count=1

### 03-post-detail — renders post detail page
- file: `Mhub/client/e2e/release-gate/03-post-detail.pw.ts`
- status: `passed` (21633ms)
- failed assertions:
  - **no-spinner-after-settle** — count=1

### 04-commerce — cart page renders with items
- file: `Mhub/client/e2e/release-gate/04-commerce.pw.ts`
- status: `passed` (24642ms)
- failed assertions:
  - **no-spinner-after-settle** — count=1

### 02-browse-discovery — renders /listings
- file: `Mhub/client/e2e/release-gate/02-browse-discovery.pw.ts`
- status: `passed` (16188ms)
- failed assertions:
  - **no-spinner-after-settle** — count=1
  - **font-floor-12px** — DIV:11.52:MARKETPLACE | BUTTON:11.84:Quick filters
- console errors:
  - `Warning: React does not recognize the `%s` prop on a DOM element. If you intentionally want it to appear in the DOM as a custom attribute, spell it as lowercase `%s` instead. If you accidentally passed it from a parent component, remove it from the DOM element.%s fetchPriority fetchpriority 
    at img
    at div
    at div
    at div
    at div
    at http://127.0.0.1:4173/src/components/ui/card.jsx:3:52
    at div
    at div
    at div
    at div
    at AllPosts (http://127.0.0.1:4173/src/page`
- network failures:
  - `http://127.0.0.1:4173/api/posts?page=1&limit=6&refresh=1777790335372` (net::ERR_ABORTED)

### 03-post-detail — image gallery present
- file: `Mhub/client/e2e/release-gate/03-post-detail.pw.ts`
- status: `passed` (16943ms)
- failed assertions:
  - **no-spinner-after-settle** — count=1

### 01-entry-nav — bottom nav links navigate
- file: `Mhub/client/e2e/release-gate/01-entry-nav.pw.ts`
- status: `passed` (14966ms)
- failed assertions:
  - **no-spinner-after-settle** — count=1
  - **font-floor-12px** — DIV:11.52:MARKETPLACE | BUTTON:11.84:Quick filters
- console errors:
  - `Warning: React does not recognize the `%s` prop on a DOM element. If you intentionally want it to appear in the DOM as a custom attribute, spell it as lowercase `%s` instead. If you accidentally passed it from a parent component, remove it from the DOM element.%s fetchPriority fetchpriority 
    at img
    at div
    at div
    at div
    at div
    at http://127.0.0.1:4173/src/components/ui/card.jsx:3:52
    at div
    at div
    at div
    at div
    at AllPosts (http://127.0.0.1:4173/src/page`
- network failures:
  - `http://127.0.0.1:4173/api/posts?page=1&limit=6&refresh=1777790349668` (net::ERR_ABORTED)

### 03-post-detail — seller card visible
- file: `Mhub/client/e2e/release-gate/03-post-detail.pw.ts`
- status: `passed` (16380ms)
- failed assertions:
  - **no-spinner-after-settle** — count=1

### 02-browse-discovery — renders /for-you
- file: `Mhub/client/e2e/release-gate/02-browse-discovery.pw.ts`
- status: `passed` (9854ms)
- failed assertions:
  - **no-spinner-after-settle** — count=1

### 04-commerce — wishlist renders
- file: `Mhub/client/e2e/release-gate/04-commerce.pw.ts`
- status: `passed` (10181ms)
- failed assertions:
  - **no-spinner-after-settle** — count=1

### 03-post-detail — share button click does not error
- file: `Mhub/client/e2e/release-gate/03-post-detail.pw.ts`
- status: `passed` (11886ms)
- failed assertions:
  - **no-spinner-after-settle** — count=1

### 02-browse-discovery — renders /feed
- file: `Mhub/client/e2e/release-gate/02-browse-discovery.pw.ts`
- status: `passed` (8822ms)
- failed assertions:
  - **no-spinner-after-settle** — count=1

### 01-entry-nav — deep link to /listings hydrates
- file: `Mhub/client/e2e/release-gate/01-entry-nav.pw.ts`
- status: `passed` (8726ms)
- failed assertions:
  - **font-floor-12px** — DIV:11.52:MARKETPLACE | BUTTON:11.84:Quick filters
- console errors:
  - `Warning: React does not recognize the `%s` prop on a DOM element. If you intentionally want it to appear in the DOM as a custom attribute, spell it as lowercase `%s` instead. If you accidentally passed it from a parent component, remove it from the DOM element.%s fetchPriority fetchpriority 
    at img
    at div
    at div
    at div
    at div
    at http://127.0.0.1:4173/src/components/ui/card.jsx:3:52
    at div
    at div
    at div
    at div
    at AllPosts (http://127.0.0.1:4173/src/page`
- network failures:
  - `http://127.0.0.1:4173/api/posts?page=1&limit=6&refresh=1777790373074` (net::ERR_ABORTED)

### 04-commerce — wishlist toggle from a post
- file: `Mhub/client/e2e/release-gate/04-commerce.pw.ts`
- status: `passed` (13278ms)
- failed assertions:
  - **no-spinner-after-settle** — count=1

### 01-entry-nav — unknown route routes to 404 or fallback
- file: `Mhub/client/e2e/release-gate/01-entry-nav.pw.ts`
- status: `failed` (6791ms)

### 03-post-detail — report button surfaces (modal or route)
- file: `Mhub/client/e2e/release-gate/03-post-detail.pw.ts`
- status: `passed` (11014ms)
- failed assertions:
  - **no-spinner-after-settle** — count=1

### 02-browse-discovery — category bar selection on /all-posts
- file: `Mhub/client/e2e/release-gate/02-browse-discovery.pw.ts`
- status: `passed` (8935ms)
- failed assertions:
  - **font-floor-12px** — DIV:11.52:MARKETPLACE | BUTTON:11.84:Quick filters
- console errors:
  - `Warning: React does not recognize the `%s` prop on a DOM element. If you intentionally want it to appear in the DOM as a custom attribute, spell it as lowercase `%s` instead. If you accidentally passed it from a parent component, remove it from the DOM element.%s fetchPriority fetchpriority 
    at img
    at div
    at div
    at div
    at div
    at http://127.0.0.1:4173/src/components/ui/card.jsx:3:52
    at div
    at div
    at div
    at div
    at AllPosts (http://127.0.0.1:4173/src/page`
- network failures:
  - `http://127.0.0.1:4173/api/posts?page=1&limit=6&refresh=1777790393045` (net::ERR_ABORTED)
  - `http://127.0.0.1:4173/api/posts?category_id=101&page=2&limit=6&refresh=1777790394653` (net::ERR_ABORTED)

### 06-social — /feed renders
- file: `Mhub/client/e2e/release-gate/06-social.pw.ts`
- status: `passed` (8495ms)
- failed assertions:
  - **no-spinner-after-settle** — count=1

### 02-browse-discovery — infinite scroll triggers (no errors)
- file: `Mhub/client/e2e/release-gate/02-browse-discovery.pw.ts`
- status: `passed` (9703ms)
- failed assertions:
  - **no-spinner-after-settle** — count=1
  - **font-floor-12px** — DIV:11.52:MARKETPLACE | BUTTON:11.84:Quick filters
- console errors:
  - `Warning: React does not recognize the `%s` prop on a DOM element. If you intentionally want it to appear in the DOM as a custom attribute, spell it as lowercase `%s` instead. If you accidentally passed it from a parent component, remove it from the DOM element.%s fetchPriority fetchpriority 
    at img
    at div
    at div
    at div
    at div
    at http://127.0.0.1:4173/src/components/ui/card.jsx:3:52
    at div
    at div
    at div
    at div
    at AllPosts (http://127.0.0.1:4173/src/page`
- network failures:
  - `http://127.0.0.1:4173/api/posts?page=1&limit=6&refresh=1777790412259` (net::ERR_ABORTED)

### 02-browse-discovery — recently-viewed renders
- file: `Mhub/client/e2e/release-gate/02-browse-discovery.pw.ts`
- status: `passed` (7495ms)
- failed assertions:
  - **no-spinner-after-settle** — count=1

### 06-social — /notifications renders & mark-as-read clickable
- file: `Mhub/client/e2e/release-gate/06-social.pw.ts`
- status: `passed` (9097ms)
- failed assertions:
  - **no-spinner-after-settle** — count=1

### 07-profile-account — renders /profile
- file: `Mhub/client/e2e/release-gate/07-profile-account.pw.ts`
- status: `passed` (9584ms)
- failed assertions:
  - **no-spinner-after-settle** — count=1

### 01-entry-nav — unknown route routes to 404 or fallback
- file: `Mhub/client/e2e/release-gate/01-entry-nav.pw.ts`
- status: `failed` (8768ms)

### 06-social — feed like button (mocked)
- file: `Mhub/client/e2e/release-gate/06-social.pw.ts`
- status: `passed` (10871ms)
- failed assertions:
  - **no-spinner-after-settle** — count=2

### 07-profile-account — renders /rewards
- file: `Mhub/client/e2e/release-gate/07-profile-account.pw.ts`
- status: `passed` (7936ms)
- failed assertions:
  - **no-spinner-after-settle** — count=1
- network failures:
  - `http://127.0.0.1:4173/api/rewards/stream` (net::ERR_ABORTED)

### 07-profile-account — renders /offers
- file: `Mhub/client/e2e/release-gate/07-profile-account.pw.ts`
- status: `passed` (7564ms)
- failed assertions:
  - **no-spinner-after-settle** — count=1

### 01-entry-nav — back button returns to previous route
- file: `Mhub/client/e2e/release-gate/01-entry-nav.pw.ts`
- status: `passed` (18383ms)
- failed assertions:
  - **font-floor-12px** — DIV:11.52:MARKETPLACE | BUTTON:11.84:Quick filters
- console errors:
  - `Warning: React does not recognize the `%s` prop on a DOM element. If you intentionally want it to appear in the DOM as a custom attribute, spell it as lowercase `%s` instead. If you accidentally passed it from a parent component, remove it from the DOM element.%s fetchPriority fetchpriority 
    at img
    at div
    at div
    at div
    at div
    at http://127.0.0.1:4173/src/components/ui/card.jsx:3:52
    at div
    at div
    at div
    at div
    at AllPosts (http://127.0.0.1:4173/src/page`
- network failures:
  - `http://127.0.0.1:4173/api/posts?page=1&limit=6&refresh=1777790470000` (net::ERR_ABORTED)
  - `http://127.0.0.1:4173/api/telemetry/ingest` (net::ERR_ABORTED)
  - `http://127.0.0.1:4173/api/telemetry/ingest` (net::ERR_ABORTED)

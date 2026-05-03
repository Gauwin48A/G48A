# Release-gate run `iter5_20260503_122754`

Generated: 2026-05-03T07:02:31.143Z

## Totals

| metric | value |
| --- | --- |
| tests | 42 |
| passed | 38 |
| failed | 4 |
| routes | 19 |
| assertions | 193 |
| assertionFailures | 0 |
| consoleErrors | 0 |
| networkFailures | 0 |

## Per-phase

| phase | tests | passed | failed | routes | assertions | hard-fails | soft-fails | console-errs | net-fails |
| --- | --: | --: | --: | --: | --: | --: | --: | --: | --: |
| 01-entry-nav | 8 | 7 | 1 | 4 | 37 | 0 | 4 | 0 | 0 |
| 02-browse-discovery | 10 | 9 | 1 | 6 | 47 | 0 | 4 | 0 | 0 |
| 03-post-detail | 6 | 5 | 1 | 1 | 27 | 0 | 1 | 0 | 0 |
| 04-commerce | 8 | 7 | 1 | 4 | 37 | 0 | 0 | 0 | 0 |
| 05-sales-seller | 4 | 4 | 0 | 4 | 18 | 0 | 0 | 0 | 0 |
| 06-social | 3 | 3 | 0 | 3 | 15 | 0 | 0 | 0 | 0 |
| 07-profile-account | 3 | 3 | 0 | 3 | 12 | 0 | 1 | 0 | 0 |

## Routes covered (19)

- `/all-posts`
- `/cart`
- `/category-hub`
- `/channels`
- `/compare`
- `/dashboard`
- `/feed`
- `/for-you`
- `/kyc`
- `/listings`
- `/my-posts`
- `/notifications`
- `/post-add`
- `/post/post-1`
- `/profile`
- `/search`
- `/settings`
- `/this-route-does-not-exist`
- `/wishlist`

## Failures (4)

### 03-post-detail — renders post detail page
- file: `Mhub/client/e2e/release-gate/03-post-detail.pw.ts`
- status: `timedOut` (45040ms)

### 02-browse-discovery — renders /all-posts
- file: `Mhub/client/e2e/release-gate/02-browse-discovery.pw.ts`
- status: `timedOut` (45119ms)

### 01-entry-nav — landing /all-posts renders
- file: `Mhub/client/e2e/release-gate/01-entry-nav.pw.ts`
- status: `timedOut` (45158ms)

### 04-commerce — cart page renders with items
- file: `Mhub/client/e2e/release-gate/04-commerce.pw.ts`
- status: `timedOut` (45245ms)

# Release-gate run `iter2_20260503_121312`

Generated: 2026-05-03T06:46:42.551Z

## Totals

| metric | value |
| --- | --- |
| tests | 59 |
| passed | 58 |
| failed | 1 |
| routes | 35 |
| assertions | 266 |
| assertionFailures | 0 |
| consoleErrors | 8 |
| networkFailures | 0 |

## Per-phase

| phase | tests | passed | failed | routes | assertions | hard-fails | soft-fails | console-errs | net-fails |
| --- | --: | --: | --: | --: | --: | --: | --: | --: | --: |
| 01-entry-nav | 8 | 7 | 1 | 4 | 35 | 0 | 4 | 3 | 0 |
| 02-browse-discovery | 10 | 10 | 0 | 7 | 49 | 0 | 4 | 4 | 0 |
| 03-post-detail | 5 | 5 | 0 | 1 | 25 | 0 | 1 | 0 | 0 |
| 04-commerce | 7 | 7 | 0 | 4 | 35 | 0 | 1 | 0 | 0 |
| 05-sales-seller | 4 | 4 | 0 | 4 | 18 | 0 | 0 | 1 | 0 |
| 06-social | 4 | 4 | 0 | 3 | 20 | 0 | 0 | 0 | 0 |
| 07-profile-account | 9 | 9 | 0 | 8 | 36 | 0 | 2 | 0 | 0 |
| 08-static-legal | 8 | 8 | 0 | 8 | 32 | 0 | 0 | 0 | 0 |
| 09-auth | 4 | 4 | 0 | 2 | 16 | 0 | 0 | 0 | 0 |

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

## Failures (1)

### 01-entry-nav — unknown route routes to 404 or fallback
- file: `Mhub/client/e2e/release-gate/01-entry-nav.pw.ts`
- status: `failed` (6385ms)

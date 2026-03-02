# UI State Matrix (Phase 0 Baseline)

## Scope
This matrix tracks explicit page-state coverage for the major routed pages enforced by `client/scripts/check-ux-route-smoke.mjs`.

Legend:
- `Y` = explicitly implemented
- `N/A` = not required for this page type
- `P` = partial/indirect

## Major Routes
| Route | Loading | Empty | Error | Retry | Auth Gate / returnTo |
| --- | --- | --- | --- | --- | --- |
| `/all-posts` | Y | Y | Y | Y | P |
| `/home` | Y | Y | Y | Y | P |
| `/search` | Y | Y | Y | Y | N/A |
| `/categories` | Y | Y | Y | Y | N/A |
| `/channels` | Y | Y | Y | Y | P |
| `/channels/:id` | Y | Y | Y | Y | P |
| `/tier-selection` | Y | N/A | Y | Y | Y |
| `/dashboard` | Y | Y | Y | Y | Y |
| `/analytics` | Y | Y | Y | Y | Y |
| `/admin-panel` | Y | Y | Y | Y | Y |
| `/for-you` | Y | Y | Y | Y | Y |
| `/public-wall` | Y | Y | Y | Y | P |
| `/my-home` | Y | Y | Y | Y | Y |
| `/profile` | Y | N/A | Y | Y | Y |
| `/security` | Y | N/A | Y | Y | Y |
| `/feed` | Y | Y | Y | Y | Y |
| `/feed/:id` | Y | N/A | Y | Y | N/A |
| `/my-feed` | Y | Y | Y | Y | Y |
| `/buyer-view` | Y | Y | Y | Y | N/A |
| `/reviews/:userId` | Y | Y | Y | Y | Y |
| `/kyc` | Y | N/A | Y | Y | Y |
| `/aadhaar-verify` | Y | N/A | Y | Y | Y |

## Alias and Redirect Routes
| Route | Canonical Target |
| --- | --- |
| `/` | Redirect to `/all-posts` |
| `/tiers` | `/tier-selection` |
| `/pricing` | `/tier-selection` |
| `/my-posts` | `/my-feed` |
| `/reset-password/:token` | `/reset-password` |
| `*` | Redirect to `/all-posts` |

## Notes
- This baseline matrix is enforced for major routes through explicit smoke-check contracts.
- Remaining long-tail routes inherit the same state primitives but are not yet in strict-contract smoke assertions.

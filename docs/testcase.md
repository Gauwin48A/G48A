# Test Case Catalog

## Scope
This document defines executable test cases for routed pages in `client/src/App.jsx`, including aliases and redirects.

## Execution Conventions
- `Priority`: `P0` (release blocking), `P1` (high), `P2` (medium)
- `Type`: `M` (manual), `A` (automation candidate), `MA` (both)
- Expected states use current shared primitives: `loading`, `empty`, `error`, `retry`, `auth-gate`

## Baseline Preconditions
1. Test users are available:
   - `guest` (not logged in)
   - `user_basic` (logged in, unverified)
   - `user_verified` (logged in, verified)
   - `admin_user` (admin privileges)
2. API can be forced to return `200`, `4xx`, and `5xx` responses for state testing.
3. Browser local storage/session storage can be cleared between test runs.
4. Mobile viewport (`390x844`) and desktop viewport (`1440x900`) are both tested.

## Global Cases (Apply To Every Page)
| TC ID | Feature | Type | Priority | Steps | Expected |
| --- | --- | --- | --- | --- | --- |
| GLB-001 | Loading state clarity | MA | P0 | Open route with delayed API response | Explicit loading UI is shown before data renders |
| GLB-002 | Empty state guidance | MA | P0 | Force empty data payload | Empty state includes clear next action CTA |
| GLB-003 | Error and retry behavior | MA | P0 | Force API/network failure, click `Retry` | User-safe error copy appears; retry re-requests data |
| GLB-004 | No dead-end navigation | M | P0 | Reach empty/error state on each route | At least one meaningful next action exists |
| GLB-005 | Auth gate with return path | MA | P0 | Open auth-required route as `guest`, then login | Redirect to login, then returns to original route |
| GLB-006 | Accessibility baseline | M | P1 | Keyboard-only navigation through primary controls | Logical focus order, visible focus ring, form labels present |
| GLB-007 | Mobile tap target safety | M | P1 | Execute key actions on mobile viewport | Tap targets are usable without accidental mis-taps |
| GLB-008 | Safe API messaging | MA | P0 | Force backend error with technical details | UI hides raw stack/internal error strings |

## Route Redirect and Alias Cases
| TC ID | Route | Feature | Type | Priority | Steps | Expected |
| --- | --- | --- | --- | --- | --- | --- |
| RTE-001 | `/` | Canonical redirect | A | P0 | Open `/` | Redirects to `/all-posts` |
| RTE-002 | `/tiers` | Alias mapping | A | P0 | Open `/tiers` | Renders same behavior as `/tier-selection` |
| RTE-003 | `/pricing` | Alias mapping | A | P0 | Open `/pricing` | Renders same behavior as `/tier-selection` |
| RTE-004 | `/my-posts` | Alias mapping | A | P0 | Open `/my-posts` | Renders same behavior as `/my-feed` |
| RTE-005 | `/reset-password/:token` | Token route parity | A | P1 | Open `/reset-password/valid-token` | Token flow renders reset page with token handling |
| RTE-006 | `*` | Wildcard redirect | A | P0 | Open unknown route `/abc-not-found` | Redirects to `/all-posts` |

## Auth Pages
### `/login`
| TC ID | Feature | Type | Priority | Steps | Expected |
| --- | --- | --- | --- | --- | --- |
| LOG-001 | Identifier input clarity | MA | P0 | Try email, phone, username login identifiers | Accepted formats are handled with clear validation |
| LOG-002 | Auth error taxonomy | MA | P0 | Trigger wrong password, lockout, and network fail | Distinct user-friendly error messages per condition |
| LOG-003 | Return path support | A | P0 | Start from protected route, complete login | User returns to original protected route |

### `/signup`
| TC ID | Feature | Type | Priority | Steps | Expected |
| --- | --- | --- | --- | --- | --- |
| SUP-001 | Signup validation | MA | P0 | Submit empty and invalid fields | Inline validation prevents invalid submit |
| SUP-002 | Alternative auth gating | M | P1 | View alternative auth options | Unavailable options are clearly marked and disabled |
| SUP-003 | Successful account creation | A | P0 | Submit valid signup payload | User is onboarded or redirected to next auth step |

### `/forgot-password`
| TC ID | Feature | Type | Priority | Steps | Expected |
| --- | --- | --- | --- | --- | --- |
| FGP-001 | Recovery delivery path | MA | P0 | Submit registered identity | Confirmation shown with safe message |
| FGP-002 | Non-existing identity handling | MA | P0 | Submit unregistered identity | No account enumeration leak; safe neutral response |
| FGP-003 | Local preview diagnostics | M | P1 | Use dev/local mode preview flow | Diagnostic preview data is visible only in intended environment |

### `/reset-password` and `/reset-password/:token`
| TC ID | Feature | Type | Priority | Steps | Expected |
| --- | --- | --- | --- | --- | --- |
| RSP-001 | Password policy hints | MA | P0 | Enter weak and strong passwords | Policy hints visible and enforced |
| RSP-002 | Invalid/expired token recovery | MA | P0 | Use expired token | Clear error and next-step CTA (request new reset) |
| RSP-003 | Successful reset completion | A | P0 | Submit valid token + valid password | Success state and login CTA shown |

## Browse and Discovery Pages
### `/all-posts`
| TC ID | Feature | Type | Priority | Steps | Expected |
| --- | --- | --- | --- | --- | --- |
| ALP-001 | Quick filters + sticky bar | MA | P1 | Apply filters while scrolling | Sticky quick filters remain actionable |
| ALP-002 | Clear-all filter recovery | MA | P0 | Create no-results state, click clear/reset | Results recover to default listing |
| ALP-003 | Card trust metadata | M | P1 | Inspect post cards | Price/posted time/trust markers are visible and consistent |

### `/home`
| TC ID | Feature | Type | Priority | Steps | Expected |
| --- | --- | --- | --- | --- | --- |
| HOM-001 | Onboarding checklist visibility | MA | P1 | Login with first-time account | Checklist appears with completion states |
| HOM-002 | Home feed recoverability | MA | P0 | Force API failure then retry | Error shown with retry and eventual recovery |
| HOM-003 | No-results guidance | MA | P1 | Force empty home payload | Empty state provides clear next actions |

### `/for-you`
| TC ID | Feature | Type | Priority | Steps | Expected |
| --- | --- | --- | --- | --- | --- |
| FYU-001 | Personalized load success | A | P1 | Load recommendations | Recommendation cards render correctly |
| FYU-002 | Retryable error state | MA | P0 | Force API error, click retry | Data fetch is retried successfully |
| FYU-003 | Auth-required recovery | MA | P0 | Open route as `guest` | Auth gate appears and preserves return path |

### `/search`
| TC ID | Feature | Type | Priority | Steps | Expected |
| --- | --- | --- | --- | --- | --- |
| SRC-001 | Recent + trending flows | MA | P1 | Use trending chip; verify recent list update | Search executes and recent history updates |
| SRC-002 | Category suggestion fallback | MA | P0 | Force category API failure | `Category suggestions unavailable` error appears with retry |
| SRC-003 | Filter reset affordance | MA | P1 | Apply restrictive filters, click clear-all | Filters reset and route query is cleaned |

### `/categories`
| TC ID | Feature | Type | Priority | Steps | Expected |
| --- | --- | --- | --- | --- | --- |
| CAT-001 | Category list load state | A | P1 | Open page with delayed response | Loading state appears then category cards render |
| CAT-002 | Empty category handling | MA | P1 | Force empty category list | Empty state with browse/search CTA appears |
| CAT-003 | Error + retry behavior | MA | P0 | Force category API error, click retry | Error clears after successful retry |

### `/channels`
| TC ID | Feature | Type | Priority | Steps | Expected |
| --- | --- | --- | --- | --- | --- |
| CHL-001 | Searchable channel list | MA | P1 | Search by partial channel name | List filters correctly |
| CHL-002 | Skeleton and load transition | A | P1 | Open route with delayed API | Skeleton appears before list |
| CHL-003 | Error recovery + create CTA | MA | P0 | Force list failure | Retry works and create-channel CTA remains visible |

### `/channels/create`
| TC ID | Feature | Type | Priority | Steps | Expected |
| --- | --- | --- | --- | --- | --- |
| CHC-001 | Create form validation | MA | P0 | Submit blank/invalid values | Inline validation messages shown |
| CHC-002 | Successful creation redirect | A | P0 | Submit valid channel details | Channel created and user navigates to channel context |
| CHC-003 | API error handling | MA | P0 | Force server error on submit | Safe error copy and retry/edit option shown |

### `/channels/:id`
| TC ID | Feature | Type | Priority | Steps | Expected |
| --- | --- | --- | --- | --- | --- |
| CHP-001 | Channel detail load states | MA | P0 | Test loading, empty posts, and error responses | Each state has explicit UX and actions |
| CHP-002 | Follow and post actions | MA | P1 | Follow/unfollow and trigger post action | Actions respond with correct status messaging |
| CHP-003 | Back navigation reliability | M | P1 | Navigate into channel then back | User returns to expected previous/browse state |

### `/public-wall`
| TC ID | Feature | Type | Priority | Steps | Expected |
| --- | --- | --- | --- | --- | --- |
| PBW-001 | Public feed render | A | P1 | Open page as `guest` | Public content renders without auth requirement |
| PBW-002 | Empty wall CTA | MA | P1 | Force no public posts | CTA guides user to browse/create relevant content |
| PBW-003 | Error fallback | MA | P0 | Force API failure | Safe error and retry action displayed |

### `/my-home`
| TC ID | Feature | Type | Priority | Steps | Expected |
| --- | --- | --- | --- | --- | --- |
| MYH-001 | Personalized dashboard load | A | P1 | Open page as logged-in user | Widgets/cards load correctly |
| MYH-002 | Empty/reduced data handling | MA | P1 | Force empty dashboard data | Empty modules have clear guidance CTAs |
| MYH-003 | Auth gate protection | MA | P0 | Open as `guest` | Auth gate with return path appears |

### `/nearby`
| TC ID | Feature | Type | Priority | Steps | Expected |
| --- | --- | --- | --- | --- | --- |
| NBY-001 | Location-based results | MA | P1 | Grant location; open nearby | Nearby posts ordered by proximity |
| NBY-002 | Permission denied fallback | MA | P0 | Deny location permission | Clear fallback guidance and retry/allow action |
| NBY-003 | Empty radius state | MA | P1 | No posts near location | Empty state suggests broader browsing actions |

## Post Lifecycle Pages
### `/add-post`
| TC ID | Feature | Type | Priority | Steps | Expected |
| --- | --- | --- | --- | --- | --- |
| ADP-001 | Pre-submit validation hints | MA | P0 | Fill invalid inputs and observe hints before submit | Hints guide correction without hard fail |
| ADP-002 | Upload progress and recoverability | MA | P0 | Upload media with throttled network/failure | Progress shown; failed upload can retry |
| ADP-003 | Successful publish transition | A | P0 | Submit valid post | Success feedback and next CTA shown |

### `/post/:id`
| TC ID | Feature | Type | Priority | Steps | Expected |
| --- | --- | --- | --- | --- | --- |
| PDT-001 | Detail page load and render | A | P0 | Open valid post id | Full details and metadata render |
| PDT-002 | Trust panel visibility | M | P1 | View post details | Seller reliability/verification/SLA panel visible |
| PDT-003 | Not-found/error recovery | MA | P0 | Open invalid id or force failure | Error state includes retry and back navigation |

### `/post_add` and `/feed/feedpostadd`
| TC ID | Feature | Type | Priority | Steps | Expected |
| --- | --- | --- | --- | --- | --- |
| PAD-001 | Legacy route accessibility | A | P1 | Open `/post_add` | Post add form renders as supported alias route |
| PAD-002 | Feed quick-add no-image mode | MA | P1 | Open `/feed/feedpostadd` | Form works with no-image upload behavior |

### `/feed`
| TC ID | Feature | Type | Priority | Steps | Expected |
| --- | --- | --- | --- | --- | --- |
| FED-001 | Feed listing with state contracts | MA | P0 | Validate loading/empty/error/retry states | States and CTA markers are present |
| FED-002 | Feed action continuity | M | P1 | Open item from feed and return | Navigation round-trip preserves context |
| FED-003 | Auth behavior | MA | P0 | Open as `guest` | Auth gate and return path behavior are correct |

### `/feed/:id`
| TC ID | Feature | Type | Priority | Steps | Expected |
| --- | --- | --- | --- | --- | --- |
| FDT-001 | Detail fetch success | A | P0 | Open valid feed post id | Content and metadata render |
| FDT-002 | Error state contract | MA | P0 | Force detail API failure | `error` state with `Retry` and `Back to Feed` actions |
| FDT-003 | Retry action behavior | A | P0 | Trigger error then retry with healthy API | Page recovers and renders post |

### `/my-feed` and `/my-posts`
| TC ID | Feature | Type | Priority | Steps | Expected |
| --- | --- | --- | --- | --- | --- |
| MYF-001 | Own posts listing | A | P1 | Open as logged-in user with posts | User posts list renders |
| MYF-002 | Empty-state CTA | MA | P1 | Use account with no posts | CTA directs user to add first post |
| MYF-003 | Alias parity | A | P1 | Compare `/my-feed` and `/my-posts` | Same feature behavior and state handling |

### `/buyer-view`
| TC ID | Feature | Type | Priority | Steps | Expected |
| --- | --- | --- | --- | --- | --- |
| BYV-001 | Buyer flow clarity | M | P1 | Open buyer view for active transaction | Timeline/next actions are clear |
| BYV-002 | Empty and reset behavior | MA | P1 | Filter to no results then reset | No dead-end; reset recovers list |
| BYV-003 | API failure handling | MA | P0 | Force fetch error | Error state with retry CTA appears |

### `/bought-posts`
| TC ID | Feature | Type | Priority | Steps | Expected |
| --- | --- | --- | --- | --- | --- |
| BOP-001 | Purchase history load | A | P1 | Open as user with purchases | Bought posts render correctly |
| BOP-002 | Empty-state action path | MA | P1 | Use user with no purchases | CTA routes to browsing actions |
| BOP-003 | Error recoverability | MA | P0 | Force API failure and retry | List recovers after retry |

### `/sold-posts`
| TC ID | Feature | Type | Priority | Steps | Expected |
| --- | --- | --- | --- | --- | --- |
| SOP-001 | Sales history load | A | P1 | Open as seller with sales | Sold posts render with status |
| SOP-002 | Empty-state action path | MA | P1 | Use seller with no sales | CTA routes to add/browse actions |
| SOP-003 | Error recoverability | MA | P0 | Force API failure and retry | List recovers after retry |

## Transaction and Trust Pages
### `/offers`
| TC ID | Feature | Type | Priority | Steps | Expected |
| --- | --- | --- | --- | --- | --- |
| OFR-001 | Offer stepper progression | MA | P1 | Move offer through statuses | Stepper reflects current status correctly |
| OFR-002 | Offer error handling | MA | P0 | Force action API failure | Safe error shown with retry |
| OFR-003 | Empty offers guidance | MA | P1 | Account with no offers | Empty state provides next CTA |

### `/payment`
| TC ID | Feature | Type | Priority | Steps | Expected |
| --- | --- | --- | --- | --- | --- |
| PAY-001 | Payment expectation messaging | M | P1 | Open payment flow | Verification timeline/retry window shown |
| PAY-002 | Retry-able payment verification | MA | P0 | Force transient verification failure | Retry action is available and works |
| PAY-003 | High-stakes error copy safety | M | P0 | Trigger payment API error | Message is user-safe and non-technical |

### `/saledone`
| TC ID | Feature | Type | Priority | Steps | Expected |
| --- | --- | --- | --- | --- | --- |
| SLD-001 | Successful completion summary | A | P1 | Open completed transaction | Completion summary and next actions visible |
| SLD-002 | Recovery actions availability | M | P1 | Verify action buttons | User can navigate to relevant follow-up flows |

### `/saleundone`
| TC ID | Feature | Type | Priority | Steps | Expected |
| --- | --- | --- | --- | --- | --- |
| SLU-001 | Unsuccessful outcome clarity | MA | P1 | Open failed/undone flow | Reason + next actions clearly displayed |
| SLU-002 | Retry/escalation path | MA | P1 | Trigger available retry/escalation actions | Actions route correctly without dead-end |

### `/complaints`
| TC ID | Feature | Type | Priority | Steps | Expected |
| --- | --- | --- | --- | --- | --- |
| CMP-001 | Complaint submission | MA | P0 | Submit valid complaint payload | Success confirmation with tracking reference |
| CMP-002 | Validation and moderation-safe errors | MA | P0 | Submit invalid payload and force backend errors | Safe and actionable error messages shown |
| CMP-003 | Submission retry path | MA | P1 | Trigger network failure and retry | Submission succeeds on retry |

### `/feedback`
| TC ID | Feature | Type | Priority | Steps | Expected |
| --- | --- | --- | --- | --- | --- |
| FBK-001 | Feedback submission success | MA | P1 | Submit feedback form | Confirmation message with reference/tracking appears |
| FBK-002 | Error handling and retry | MA | P0 | Force feedback API failure | Retry or edit-and-resubmit flow works |

### `/reviews/:userId`
| TC ID | Feature | Type | Priority | Steps | Expected |
| --- | --- | --- | --- | --- | --- |
| RVW-001 | Reviews list states | MA | P1 | Validate loading/empty/error/retry | All states render with actionable CTAs |
| RVW-002 | User-context integrity | A | P1 | Open reviews for two different users | Correct user review data shown per route param |

### `/kyc`
| TC ID | Feature | Type | Priority | Steps | Expected |
| --- | --- | --- | --- | --- | --- |
| KYC-001 | KYC submit and status tracking | MA | P0 | Submit valid KYC data | Status transition and guidance shown |
| KYC-002 | KYC failure fallback action | MA | P0 | Force verification failure | Explicit fallback actions displayed |
| KYC-003 | Auth-required protection | MA | P0 | Open as `guest` | Auth gate shown with return path |

### `/aadhaar-verify`
| TC ID | Feature | Type | Priority | Steps | Expected |
| --- | --- | --- | --- | --- | --- |
| AAD-001 | Aadhaar verification flow | MA | P0 | Submit valid Aadhaar verification data | Verification result shown clearly |
| AAD-002 | Failure and recovery path | MA | P0 | Force failure response | Error details are safe; retry/fallback actions present |
| AAD-003 | Auth-required protection | MA | P0 | Open as `guest` | Auth gate shown with return path |

### `/verification`
| TC ID | Feature | Type | Priority | Steps | Expected |
| --- | --- | --- | --- | --- | --- |
| VRF-001 | Verification status visibility | A | P1 | Open verification page as user | Current verification status is clearly shown |
| VRF-002 | Verification API failure recovery | MA | P0 | Force status fetch error and retry | Status fetch recovers without reload |

## Profile and Security Pages
### `/profile`
| TC ID | Feature | Type | Priority | Steps | Expected |
| --- | --- | --- | --- | --- | --- |
| PRF-001 | Profile data load and edit | MA | P1 | Load profile and update editable fields | Save success feedback is shown |
| PRF-002 | Preferences panel state contracts | MA | P0 | Force preferences loading/error/empty | Panel-level states and retry CTAs appear |
| PRF-003 | Contact-sync panel recovery | MA | P1 | Force contact sync failure, dismiss, retry | Error can be dismissed and retried successfully |

### `/security`
| TC ID | Feature | Type | Priority | Steps | Expected |
| --- | --- | --- | --- | --- | --- |
| SEC-001 | Security status load/retry | MA | P0 | Force status fetch failure then retry | Error state recovers and status renders |
| SEC-002 | 2FA setup outcome states | MA | P0 | Trigger setup loading, success, and fail | Setup panel shows explicit loading/error/success outcomes |
| SEC-003 | 2FA verify and disable outcomes | MA | P0 | Trigger verify and disable with pass/fail cases | Verify/disable panels show actionable outcome states |

## Engagement Pages
### `/rewards`
| TC ID | Feature | Type | Priority | Steps | Expected |
| --- | --- | --- | --- | --- | --- |
| RWD-001 | Rewards progress visibility | MA | P1 | Open rewards with active progress | Progress and next milestone are visible |
| RWD-002 | Referral step clarity | M | P1 | Navigate referral flow | Steps are explicit and understandable |
| RWD-003 | Empty/error recovery | MA | P1 | Force empty/error responses | Actions exist to continue engagement |

### `/my-recommendations`
| TC ID | Feature | Type | Priority | Steps | Expected |
| --- | --- | --- | --- | --- | --- |
| MRC-001 | Recommendation list load | A | P1 | Open route with recommendation data | Cards render correctly |
| MRC-002 | Personalization explanation controls | MA | P1 | Open `why this recommendation` controls | Explanations are visible and dismissible |
| MRC-003 | Empty and retry states | MA | P1 | Force empty/error data | Actionable recovery CTAs appear |

### `/wishlist`
| TC ID | Feature | Type | Priority | Steps | Expected |
| --- | --- | --- | --- | --- | --- |
| WSH-001 | Wishlist list and item actions | MA | P1 | Load wishlist and remove item | Item updates are reflected correctly |
| WSH-002 | Empty-state engagement CTA | MA | P1 | Use account with empty wishlist | CTA routes to browse flow |
| WSH-003 | Auth and retry behavior | MA | P0 | Open as guest; force API failure | Auth gate and retry UX both work |

### `/recently-viewed`
| TC ID | Feature | Type | Priority | Steps | Expected |
| --- | --- | --- | --- | --- | --- |
| RCV-001 | Recently viewed list render | A | P1 | Open route with history | Recently viewed cards render |
| RCV-002 | Empty-state action path | MA | P1 | No viewing history | CTA drives user to discovery pages |
| RCV-003 | Auth and retry behavior | MA | P0 | Open as guest; force API failure | Auth gate and retry flow work |

### `/saved-searches`
| TC ID | Feature | Type | Priority | Steps | Expected |
| --- | --- | --- | --- | --- | --- |
| SVS-001 | Saved searches render and run | MA | P1 | Open saved searches and execute one | Search criteria apply correctly |
| SVS-002 | Empty-state creation CTA | MA | P1 | No saved searches | CTA guides to create/search actions |
| SVS-003 | Auth and retry behavior | MA | P0 | Open as guest; force API failure | Auth gate and retry flow work |

### `/notifications`
| TC ID | Feature | Type | Priority | Steps | Expected |
| --- | --- | --- | --- | --- | --- |
| NTF-001 | Notification list load | A | P1 | Open notifications | Notification entries render |
| NTF-002 | Deep-link reliability fallback | MA | P0 | Click broken/invalid deep link | App falls back to safe navigation target |
| NTF-003 | Empty/error states | MA | P1 | Force no data and server failure | Actionable empty and retryable error states appear |

### `/chat`
| TC ID | Feature | Type | Priority | Steps | Expected |
| --- | --- | --- | --- | --- | --- |
| CHT-001 | No-messages conversation state | MA | P1 | Open new conversation thread | `No messages` guidance appears |
| CHT-002 | Failed send recoverability | MA | P0 | Force send failure, retry send | Failed message is recoverable |
| CHT-003 | Reconnecting state handling | MA | P1 | Simulate socket disconnect/reconnect | Reconnecting indicator and recovery behavior are clear |

## Commerce Outcome Pages
### `/buyer-view`, `/saledone`, `/saleundone` (cross-flow continuity)
| TC ID | Feature | Type | Priority | Steps | Expected |
| --- | --- | --- | --- | --- | --- |
| CFC-001 | Flow continuity | M | P1 | Move through buyer -> done/undone paths | State and action continuity is maintained |
| CFC-002 | Context preservation | M | P1 | Use back/forward nav across outcome pages | Route context remains coherent |

## Admin and Operations Pages
### `/dashboard`
| TC ID | Feature | Type | Priority | Steps | Expected |
| --- | --- | --- | --- | --- | --- |
| DSH-001 | KPI card clarity + drill-down | MA | P1 | Open dashboard and click KPI drill actions | Correct detail route/filter is opened |
| DSH-002 | Empty and error handling | MA | P0 | Force no-data and API failure | Guidance and retry actions are present |

### `/analytics`
| TC ID | Feature | Type | Priority | Steps | Expected |
| --- | --- | --- | --- | --- | --- |
| ANL-001 | Date-range control behavior | MA | P1 | Change date ranges | Charts/cards refresh to selected range |
| ANL-002 | No-data guidance | MA | P1 | Select range with no data | Empty guidance and alternate actions appear |
| ANL-003 | Error banner consistency | MA | P0 | Force analytics API failure | Standardized warning/error banner shown |

### `/admin-panel`
| TC ID | Feature | Type | Priority | Steps | Expected |
| --- | --- | --- | --- | --- | --- |
| ADM-001 | Action confirmation gating | MA | P0 | Trigger high-impact admin action | Confirmation step required before execution |
| ADM-002 | Undo behavior (safe actions) | MA | P1 | Execute undo-capable action and click undo | Action rollback succeeds |
| ADM-003 | Operational warning banners | M | P1 | Trigger warnings/errors | Banner copy and severity styles are consistent |

## Pricing and Monetization
### `/tier-selection`
| TC ID | Feature | Type | Priority | Steps | Expected |
| --- | --- | --- | --- | --- | --- |
| TIR-001 | Tier listing and selection | A | P1 | Open page and select tier | Selection state updates correctly |
| TIR-002 | Upgrade failure UX | MA | P0 | Force upgrade API failure | Toast + inline recoverable error appears (no alert pop-up) |
| TIR-003 | Retry/alternate CTA availability | MA | P1 | Retry after failure | Upgrade can be retried or user can navigate safely |

## Platform Feature Cases
| TC ID | Feature Sub-area | Type | Priority | Steps | Expected |
| --- | --- | --- | --- | --- | --- |
| FEA-001 | `Auth/session/2FA` | MA | P0 | Execute signup -> login -> forgot/reset password -> 2FA enable/verify/disable | Auth lifecycle succeeds with safe error handling and retry |
| FEA-002 | `User profile and tier handling` | MA | P0 | Update profile data, then upgrade tier and verify new limits | Profile and tier state stay consistent across refresh |
| FEA-003 | `Post lifecycle` | MA | P0 | Create post, open detail, edit, archive/sold, reactivate | Post state transitions are persisted and reflected in all views |
| FEA-004 | `Feed/recommendations/nearby/search` | MA | P0 | Compare discovery routes with same user/session context | Recommendations, nearby, and search stay coherent with filters and auth |
| FEA-005 | `Pagination and payload controls` | A | P1 | Request paged datasets with limit/cursor inputs | Stable ordering, no duplicates, bounded payload sizes |
| FEA-006 | `Payment submit/verify/retry/reconcile` | MA | P0 | Submit payment, force verification failure, retry, run reconciliation | Transaction reaches terminal consistent state without data drift |
| FEA-007 | `Sale OTP handshake` | MA | P0 | Run buyer/seller sale confirmation with OTP mismatch and retry | Sale confirms only on valid OTP and records audit trail |
| FEA-008 | `KYC routing + manual review queue` | MA | P0 | Submit KYC, trigger manual-review path, resolve review | KYC status and queue ownership update correctly |
| FEA-009 | `Complaints lifecycle + SLA + evidence` | MA | P0 | File complaint with evidence, advance status across SLA checkpoints | SLA timestamps and evidence links remain intact |
| FEA-010 | `Reviews lifecycle + moderation controls` | MA | P1 | Submit review, trigger moderation action, verify visibility updates | Moderated content state is enforced consistently |
| FEA-011 | `WAF + abuse limiter + webhook integrity` | A | P0 | Replay malicious payloads and webhook signature edge cases | Requests are blocked/throttled; forged webhooks rejected |
| FEA-012 | `Chat messaging + read-state controls` | MA | P1 | Send/receive chat messages and toggle read state under reconnect | Message order and unread counters remain correct |
| FEA-013 | `CI quality gates + bundle budget gate` | A | P1 | Run CI gate scripts including bundle budget and ux/network checks | Gate fails on contract drift and passes on compliant build |
| FEA-014 | `Monitoring ownership + incident runbook linkage` | M | P1 | Trigger alert scenario and trace owner/runbook references | Alerts map to explicit owners and actionable runbook links |
| FEA-015 | `Readiness endpoint dependency checks` | A | P0 | Call readiness endpoint with db/cache healthy and degraded states | Readiness output reflects dependency truth and recommendation |
| FEA-016 | `Migration safety/idempotency evidence` | A | P0 | Re-run migration scripts on initialized schema | No destructive drift; idempotency evidence generated |
| FEA-017 | `Split load profile (legit vs abuse) + tuned limiter policy` | A | P1 | Execute mixed load profile simulation | Legit traffic remains within SLO while abusive traffic throttles |
| FEA-018 | `Authenticated read/write load profile coverage` | A | P1 | Run authenticated read/write load suite | Throughput and error rates remain within agreed thresholds |
| FEA-019 | `ML fraud challenge cohort rollout with telemetry` | MA | P1 | Toggle fraud challenge cohort flag and submit risk events | Cohort behavior and telemetry tagging match rollout config |
| FEA-020 | `Fraud telemetry persistence + export sink path` | A | P1 | Emit fraud events and execute export job | Events persist, export payload is complete and schema-valid |
| FEA-021 | `Progressive flag lifecycle + audit + rollback simulation` | A | P1 | Roll out feature flag progressively, audit, rollback | Rollout and rollback events are fully auditable |
| FEA-022 | `Multi-region tabletop drill (trigger->failover->rollback)` | M | P1 | Execute documented tabletop sequence | Decision points and rollback criteria are validated |
| FEA-023 | `Multi-region active-active orchestration command set` | A | P1 | Run orchestration commands in dry-run and guarded modes | Commands execute in expected order with safety checks |
| FEA-024 | `Multi-region DB/queue safety gate + idempotency audit` | A | P1 | Run dependency gate and queue idempotency audit scripts | Gate blocks unsafe state and emits actionable findings |
| FEA-025 | `Multi-region active-active deployment automation (live infra execution)` | M | P2 | Validate preconditions and dry-run path for blocked live automation | Blocked status is explicit with documented unblock criteria |

## Completion Checklist
- [x] Every route in `App.jsx` is covered by at least one page-specific test case.
- [x] Every feature in `FEATURE_COMPLETION_MATRIX.md` is mapped to at least one test case.
- [x] Every high-risk route has explicit `loading/empty/error/retry/auth-gate` checks.
- [x] Aliases and redirects are validated.
- [ ] P0 cases are automated or queued for immediate automation.

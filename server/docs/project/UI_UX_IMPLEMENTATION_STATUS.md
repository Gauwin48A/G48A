# UI / UX Implementation Status Audit

Date: 2026-03-18  
Scope: `Notifications`, `Wishlist`, `Recently Viewed`, `Cart`, `MyHome`, `MyFeed`, `Feed`, `SaleDone`, `SaleUndone`

## Audit Method

This document is based on direct code inspection of the current repo, not just the raw issue list. The main files reviewed were:

- `client/src/pages/Notifications.jsx`
- `client/src/pages/Wishlist.jsx`
- `client/src/pages/RecentlyViewed.jsx`
- `client/src/context/CartContext.jsx`
- `client/src/pages/Cart.jsx`
- `client/src/pages/MyHome.jsx`
- `client/src/pages/MyFeedPage.jsx`
- `client/src/pages/FeedPage.jsx`
- `client/src/pages/Saledone.jsx`
- `client/src/pages/SaleUndone.jsx`
- `server/src/controllers/notificationController.js`
- `server/src/controllers/wishlistController.js`
- `server/src/controllers/recentlyViewedController.js`
- `server/src/controllers/feedController.js`
- `server/src/controllers/saleController.js`
- `server/src/controllers/saleundoneController.js`
- `server/src/queries/feedQuery.js`
- `client/src/App.jsx`

## Important Route Note

There is a naming mismatch in the raw backlog:

- `/feed` is the community/text feed (`FeedPage.jsx`)
- `/all-posts` is the marketplace discovery surface

Several raw "Feed" findings describe marketplace product cards, but the current `/feed` implementation is a social/community feed. Those issues should not be assigned to `FeedPage.jsx` without clarification.

## Status Legend

- `Confirmed`: still present in the current codebase.
- `Partial`: the raw issue points at a real weakness, but part of the capability already exists.
- `Stale`: the raw issue is no longer true in the current implementation.

## Executive Snapshot

| Surface | Current State | Highest Value Confirmed Gaps | Important Corrections |
| --- | --- | --- | --- |
| Notifications | Functional but thin | No page-level realtime sync, no pagination UX, no rollback, no search/grouping/preferences | API already returns `unreadCount`; app already has socket/push plumbing |
| Wishlist | Working basic save/remove grid | No pagination, no add-to-cart CTA, no sort/filter/share, `notes` never rendered | Duplicate-save protection already exists; delete is not optimistic |
| Recently Viewed | Better than raw list suggested | No pagination UI, no sort/filter/bulk, `window.confirm`, no AbortController | Tracking is wired from detail pages; backend dedups views; seller avatar/status badge already exist |
| Cart | Basic local cart only | LocalStorage-only, no server validation, duplicate add does not increment qty, totals frontend-only | None of the commerce-hardening pieces are present yet |
| MyHome | Stronger than raw list suggested | No quick "Mark as Sold" action, no condition badge, no pull-to-refresh, no user-facing sort control | Search, tabs, thumbnails, price, location, status badge, and sale-complete toast already exist |
| MyFeed | Works as a social self-feed | Stats only for loaded posts, no search/filter/sort/status controls, no image cards | Pull-to-refresh exists; dedup logic is already robust; saved-post sync includes storage events |
| Feed | Community feed is materially better than raw list suggested | No category/sort/search controls on `/feed` | Refresh, retry, load-more spinner, end-of-feed, avatar, location, save/share, views already exist |
| SaleDone | Transaction flow works, success UX is thin | Success screen lacks item/buyer/price/receipt/reward data, frontend ignores returned `postStatus` | Backend does set post status to `sold`; MyHome consumes `saleCompleted` handoff |
| SaleUndone | Reactivation flow works, history UX is thin | No confirm dialog, no inline validation, no AbortController, success shown without payload verification | Fallback history endpoint already returns richer fields than the UI currently renders |

## Cross-Page Priority Order

1. `P0` Commerce integrity: move cart from local-only state to server-backed state with price and stock validation.
2. `P0` Notifications reliability: connect page state to realtime notification events and add rollback for optimistic mutations.
3. `P0` Sale completion trust: surface returned transaction/post status and richer success metadata in `Saledone.jsx`.
4. `P1` Pagination and manageability: add cursor/load-more patterns for Notifications, Wishlist, and Recently Viewed.
5. `P1` Backlog hygiene: split `/feed` vs `/all-posts` work so social-feed tickets do not get mixed with marketplace-discovery tickets.

---

## 1. Notifications

### Confirmed

- The page fetches once on mount and on manual refresh only. It does not subscribe to socket events or push events to update the list state.  
  Evidence: `client/src/pages/Notifications.jsx` uses `fetchNotifications()` inside `useEffect`; `client/src/App.jsx` listens to `socket.on("notification")` only to show a toast.
- The UI requests the default list and exposes no cursor, page, or load-more pattern.  
  Evidence: `Notifications.jsx` calls `GET /notifications?userId=...` with no pagination params; `notificationController.js` defaults to `DEFAULT_LIMIT = 50` and only supports `LIMIT`.
- The response shape does not include sender name/avatar, item thumbnail, `expires_at`, or server grouping metadata.  
  Evidence: `notificationController.js` selects `notification_id`, `user_id`, `type`, `title`, `message`, `is_read`, `created_at`, `priority`, `icon_category`.
- The page keeps dead bulk-selection state without visible selection controls.  
  Evidence: `selectedIds` is maintained in `Notifications.jsx`, but there is no checkbox UI on cards.
- `markAsRead`, `markAllAsRead`, and delete mutate local state before the API finishes and do not roll back on failure.  
  Evidence: `Notifications.jsx` updates `notifications` immediately, then only logs errors.
- The page can replace real empty/error states with hardcoded sample notifications.  
  Evidence: `Notifications.jsx` falls back to `fallbackNotifications` both on request failure and when the fetched list is empty.
- There is no search, date-group header, user-facing sort control, snooze action, or notification-preference center on the page.
- Visual semantics are still mostly hardcoded in component classes instead of shared semantic tokens.  
  Evidence: `text-blue-500`, `text-emerald-500`, `text-purple-500`, etc. are hardcoded in `renderIcon()`.
- The list applies `animationDelay` but does not implement actual enter/exit transitions.

### Partial

- Realtime infrastructure exists, but it stops at global toast delivery.  
  Evidence: socket client in `client/src/lib/socket.js`, push prompt in `client/src/components/NotificationPermission.jsx`, toast listener in `client/src/App.jsx`.
- The backend already returns unread counts, but the page ignores them.  
  Evidence: `notificationController.js` returns `{ notifications, unreadCount, total }`; `Notifications.jsx` recomputes `unreadCount` with `useMemo`.
- The raw "hard limit of 50" finding is only partially true. The backend supports `limit` up to 200, but the page still behaves like a fixed 50-item surface because it never paginates.

### Stale

- "No separate unread count field from API" is no longer true. The API already returns `unreadCount`.

### Recommended Next Iteration

- Add cursor or offset pagination to the API and a `Load more` or infinite-scroll UI.
- Add a notification store that merges initial fetch, socket events, and mutation rollbacks.
- Use the server-provided `unreadCount`.
- Either expose real bulk selection checkboxes or remove `selectedIds`.
- Add search, date grouping (`Today`, `Yesterday`, `Earlier`), and preferences.

---

## 2. Wishlist

### Confirmed

- The backend defaults to 50 items and the UI has no pagination or load-more affordance.  
  Evidence: `wishlistController.js` uses `DEFAULT_WISHLIST_LIMIT = 50`; `Wishlist.jsx` fetches once with `GET /wishlist`.
- `notes` are loaded from the DB but never rendered in the card UI.  
  Evidence: `wishlistController.js` selects `w.notes`; `Wishlist.jsx` never references `notes`.
- Cards only support `View Details` and remove. There is no `Add to Cart`, `Buy Now`, bulk action, list/grid toggle, or share flow.
- There is no confirmation or undo after removal.
- Category-mode filtering is client-side only. There is no dedicated server-backed wishlist filter/sort/search surface.
- `new Date(t.saved_at).toLocaleDateString()` is called without a null guard.  
  Evidence: `Wishlist.jsx`.
- Seller avatar/verification/rich seller metadata are not explicitly provided by the wishlist API.

### Partial

- Seller rating is attempted in the UI (`rating`, `seller_rating`, `user?.rating`), but the controller does not explicitly fetch rating data. This is more of a weak data contract than a pure UI omission.

### Stale

- "Same post saved twice both appear" is not reproduced in the current controller.  
  Evidence: `wishlistController.js` checks for an existing row before insert and returns `"Already in wishlist"`.
- "Optimistic delete has no rollback" is not true in the current page.  
  Evidence: `Wishlist.jsx` removes the item from local state only after the delete request succeeds.

### Recommended Next Iteration

- Add pagination and explicit filter/sort params to `/wishlist`.
- Render `notes`, add `Add to Cart`, and add share/bulk actions.
- Guard `saved_at` parsing.
- Decide whether seller trust metadata belongs in the wishlist payload or via a shared post-card contract.

---

## 3. Recently Viewed

### Confirmed

- The page hard-caps itself to 50 items and exposes no load-more flow.  
  Evidence: `RecentlyViewed.jsx` uses `const ye = 50` and sends `limit: ye`.
- There is no sort UI, no rich filtering, and no bulk management.
- Grid/list toggle buttons do not expose `aria-pressed`.  
  Evidence: `RecentlyViewed.jsx` toggle buttons only set visual classes.
- Clear History still uses `window.confirm()`.  
  Evidence: `RecentlyViewed.jsx`.
- The history fetch has no `AbortController` cleanup.  
  Evidence: `RecentlyViewed.jsx` increments a request id but does not pass an abort signal.
- There is no TTL/expiry policy for old history entries.
- There is no price-drop or richer revisit analytics surface.

### Partial

- Source tracking exists and the page can filter by `all`, `allposts`, and `feed`, but current callers only send `allposts` or `feed`.  
  Evidence: `recentlyViewedController.js` supports `source`; `PostDetail.jsx` sends `allposts` or `feed`; `FeedPostDetail.jsx` sends `feed`.
- Sold-state indication exists as a badge, but there is no stronger sold overlay treatment.

### Stale

- "Tracking is not wired from detail pages" is no longer true.  
  Evidence: `PostDetail.jsx` and `FeedPostDetail.jsx` both call `/api/recently-viewed/track`.
- "No deduplication" is no longer true.  
  Evidence: `recentlyViewedController.js` updates an existing row before insert and increments `view_count`.
- "Seller avatar missing" is no longer true.  
  Evidence: `RecentlyViewed.jsx` renders `Avatar` for `seller_name`.
- "Optimistic delete has no rollback" is not true in the current page.  
  Evidence: items are removed after delete success.

### Recommended Next Iteration

- Add pagination and server-backed sorting.
- Replace `window.confirm()` with a dialog and optional undo toast.
- Add `aria-pressed` on the grid/list toggle.
- Add `AbortController` to history fetch.

---

## 4. Cart

### Confirmed

- Cart state is local-only in `localStorage`.  
  Evidence: `CartContext.jsx` reads/writes `mhub_cart_v1` and has no backend sync.
- Adding the same item twice does not increment quantity.  
  Evidence: `CartContext.jsx` returns the previous array when a duplicate id is found.
- Totals, quantity changes, and checkout values are frontend-only and unaudited by the server.
- Shipping is hardcoded and there is no tax, coupon, delivery ETA, or inventory validation.
- Quantity can only be changed via `+/-`; there is no direct numeric input.
- There is no cross-tab sync handler for cart storage.
- Setting quantity to `0` silently removes the item.
- No `Save for Later`, no bulk actions, no mini-cart, no cart persistence warning, and no wishlist/cart relationship cues.
- Currency is hardcoded to INR.

### Recommended Next Iteration

- Introduce a server-backed cart table and checkout validation endpoint.
- Make duplicate adds increment `qty`.
- Add `storage` event sync for cross-tab consistency.
- Add validation for max quantity and stale pricing.

---

## 5. MyHome

### Confirmed

- There is still no quick `Mark as Sold` action directly on the listing cards.
- There is no visible condition badge on cards.
- Pull-to-refresh is not integrated here.
- Search exists, but there is no user-facing sort control.

### Partial

- Count badges are based on the currently loaded in-memory dataset. If backend pagination is added later, those labels will need to be revisited.

### Stale

- "No distinct Active / Sold tabs" is false. Tabs and counts exist.
- "No search" is false. Search input exists.
- "Cards missing price" is false. Price is rendered.
- "No location" is false. Location is rendered.
- "No status distinction" is false. Status badge and status tabs exist.
- "No thumbnail" is false. Card image is rendered.
- "saleCompleted flag passed but not consumed" is false.  
  Evidence: `MyHome.jsx` reads route state/query/localStorage marker and shows a toast.

### Recommended Next Iteration

- Add a quick sell action for active listings.
- Surface condition and subcategory on cards.
- Decide whether `MyHome` needs a first-class sort control or if search + status tabs are sufficient.

---

## 6. MyFeed

### Context

`MyFeedPage.jsx` is a social/community self-feed, not a marketplace inventory grid.

### Confirmed

- The stats banner explicitly reflects only loaded posts.  
  Evidence: `my_feed_stats_loaded_note`.
- There is no search, no filter by post status, and no sort control.
- Cards do not show images, categories, or location metadata.
- View/like counts are fetched per request and remain stale until refresh/load-more.
- Manual refresh scrolls to the top before refetching.

### Partial

- Refresh skeletons are limited. Initial loading uses page-state blocks, while pagination uses `SkeletonLoader`, but there is no special in-place refresh skeleton.

### Stale

- "mergeUniquePosts compares both post_id and id and can fail dedup" is not reproduced.  
  Evidence: `mergeUniquePosts()` normalizes to `post?.post_id ?? post?.id`.
- "Pull-to-refresh imported but not used" is false.  
  Evidence: `usePullToRefresh()` is integrated.
- "Saved posts local state can lag another tab" is largely addressed.  
  Evidence: `subscribeSavedPosts()` listens to both a custom event and the browser `storage` event.

### Recommended Next Iteration

- Add search and sort if this page is meant to support management at scale.
- Decide whether social posts should support media thumbnails or remain text-first by design.

---

## 7. Feed

### Context

For the current route map, `/feed` is the community feed. If the intended backlog target is marketplace discovery, that work belongs to `/all-posts` and related post APIs.

### Confirmed on `/feed`

- No category chips, no search bar, and no sort control are exposed on the page.

### Stale on `/feed`

- Refresh button exists.
- Refresh retry exists.
- Load-more spinner exists.
- End-of-feed message exists.
- Cards already show avatar, username, location, timestamp, share/save actions, and view counts.

### Marketplace Discovery Note

If "Feed" was intended to mean `/all-posts`, many of the raw marketplace-card issues are already addressed there:

- seller name fields exist
- condition is rendered
- subcategory is rendered
- sort/filter/quick-filters exist

That surface should be audited separately from `FeedPage.jsx`.

---

## 8. SaleDone

### Confirmed

- The success screen only surfaces transaction id, not item title, image, buyer identity, agreed price, reward outcome, or receipt metadata.
- There is no `View Sold Item`, `View Buyer Profile`, download/share receipt action, next-steps guidance, or buyer feedback action.
- The frontend does not use the backend-returned `postStatus` to confirm that the post is actually `sold`.  
  Evidence: `saleController.confirmSale()` returns `postStatus`; `Saledone.jsx` stores `completedSale` and localStorage markers but does not validate/render `postStatus`.
- The UI has no timeout or recovery flow if the user closes the page mid-confirmation.

### Partial

- The backend does verify and update post status.  
  Evidence: `saleController.js` calls `updatePostStatus(..., "sold", "active")` and returns `postStatus`.

### Stale

- "Sale status not verified after SaleDone" is only partially true now; the backend verifies it, but the frontend does not surface the result.
- "saleCompleted flag passed to MyHome but ignored" is false.

### Recommended Next Iteration

- Extend confirm response payload with post title, image, buyer name, agreed price, and reward totals.
- Render `postStatus` explicitly in the success state.
- Add `View Sold Item` and `Back to Sold Posts` actions.

---

## 9. SaleUndone

### Confirmed

- Submit action runs immediately with no confirm dialog.
- Validation is submit-only; there is no inline guidance.
- The page tries two endpoints sequentially and does not memoize failure.
- There is no `AbortController` around the submit request flow.
- `parsePostId()` is intentionally minimal and may accept malformed user text fragments.
- Success UI is shown whenever a request returns `ok`, without validating a returned payload that proves reactivation state.
- History cards render only id, title, reason, and active badge; they do not surface image, price, category, buyer context, or timestamps.

### Partial

- The fallback controller already returns richer fields than the history UI uses.  
  Evidence: `saleundoneController.js` selects `title`, `description`, `category_id`, `condition`, `price`, `images`, `location`, timestamps.

### Recommended Next Iteration

- Add a confirm dialog before reactivation.
- Add inline validation and a required/default reason strategy.
- Use `AbortController`.
- Render richer history cards from the data already available.

---

## Recommended Backlog Split

### Track Immediately

- Server-backed cart and checkout validation
- Notifications page realtime state + rollback
- SaleDone success payload and verification UX
- Pagination for Notifications, Wishlist, Recently Viewed

### Track After Cleanup

- MyHome quick sell action
- MyFeed search/sort/status management tools
- SaleUndone history enrichment

### Clarify Before Work Starts

- Whether "Feed" in the original backlog means `/feed` or `/all-posts`
- Whether wishlist/recently-viewed should remain lightweight or become full management surfaces

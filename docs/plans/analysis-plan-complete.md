# MHub Android App — Full Page-by-Page Analysis & Implementation Plan

> **Generated:** June 12, 2026  
> **Scope:** All 40+ screens + shared components  
> **Priority:** P0 = Critical, P1 = High, P2 = Medium, P3 = Nice-to-have

---

## Table of Contents

1. [Core Architecture Issues](#1-core-architecture-issues)
2. [Navigation & Shell](#2-navigation--shell)
3. [Home Screen (For You)](#3-home-screen-for-you)
4. [Explore / AllPosts Screen](#4-explore--allposts-screen)
5. [Product Listing & Category Screens](#5-product-listing--category-screens)
6. [CategoryApp Shell](#6-categoryapp-shell)
7. [Feed (Knowledge Feed)](#7-feed-knowledge-feed)
8. [Auth Screens](#8-auth-screens)
9. [Profile Screen](#9-profile-screen)
10. [Account Screens](#10-account-screens)
11. [Settings Screen](#11-settings-screen)
12. [More Screen](#12-more-screen)
13. [Wishlist Screen](#13-wishlist-screen)
14. [Notifications Screen](#14-notifications-screen)
15. [Rewards Screen](#15-rewards-screen)
16. [Commerce & Checkout Screens](#16-commerce--checkout-screens)
17. [Post Creation / Edit / MyPosts](#17-post-creation--edit--myposts)
18. [KYC Screen](#18-kyc-screen)
19. [Search Screen](#19-search-screen)
20. [Legal / Static Pages](#20-legal--static-pages)
21. [Shared Components](#21-shared-components)
22. [Execution Roadmap](#22-execution-roadmap)

---

## 1. Core Architecture Issues

### Drawbacks

| # | Issue | Severity |
|---|-------|----------|
| A1 | **Massive files** — `CommerceScreens.kt` (300K+ chars), `ExploreScreen.kt` (2K+ lines). Multiple screens/viewmodels crammed into single files. | **P0** |
| A2 | **Inconsistent mock fallback** — Every screen has its own `MOCK_*` data arrays. Some screens fall back to mock silently; others show errors. No centralized mock data layer. | **P1** |
| A3 | **String resources vs hardcoded** — Many screens use `stringResource(R.string.*)`, but some use hardcoded English strings (e.g., FeedScreen: `"Read more..."`, `"Share some knowledge..."`, `"My rewards"`). Language switching is broken wherever strings are hardcoded. | **P1** |
| A4 | **No error boundaries** — No composable-level error boundaries. A single crash in one screen can bring down the whole nav host. | **P2** |
| A5 | **Hardcoded colors** — Multiple screens still use raw hex colors like `Color(0xFF6366F1)`, `Color(0xFF1E293B)` instead of `MaterialTheme.colorScheme.*`. Theme/dark mode is inconsistent. | **P1** |
| A6 | **No pagination abstraction** — Each list screen implements its own `loadMore()` with manual page tracking. No shared `PaginatedList` component. | **P2** |
| A7 | **No offline-first strategy** — No Room caching for listings, categories, or feed. Every load hits the network. | **P2** |

### Improvements

- **Split monolithic files** into one-file-per-screen with separate ViewModel files (e.g., `CommerceScreens.kt` → 7+ files).
- **Create a `MockDataProvider` singleton** that all screens use (already partially done in `MockDataProvider.kt`).
- **Audit all strings** — replace every un-`stringResource` string with proper resource references.
- **Add `CompositionLocal` error boundary** at the `MhubApp.kt` level.
- **Add `ColorTokens.kt`** — map all custom hex colors to semantic tokens.
- **Create `PaginatedFeed` composable** — shared pull-to-refresh + load-more pattern.
- **Add Room DAOs** for offline cache of listings, categories, feed items.

---

## 2. Navigation & Shell

### Files: `MhubApp.kt`, `Routes.kt`, `CategoryAppShell.kt`

### Drawbacks

| # | Issue | Severity |
|---|-------|----------|
| N1 | **MhubApp.kt has 3+ compilation errors** — pre-existing from branch. Bottom nav and route setup may be broken. | **P0** |
| N2 | **No deep link handling** — Routes defined but no deep-link NavDeepLink config. | **P2** |
| N3 | **CategoryAppShell has `useExternalBottomNav`** — logic for external vs internal bottom nav is confusing. Some screens render double nav bars. | **P1** |
| N4 | **No `savedStateHandle`** — ViewModels lose state on config changes / process death for most screens. | **P1** |
| N5 | **No transition animations** — Most screen transitions are instant (no `enterTransition`/`exitTransition`). Only CategoryAppShell has fade animations. | **P2** |

### Improvements

- **Fix MhubApp.kt compilation** — resolve the 3 merge-conflict-style errors.
- **Add NavDeepLink support** for post detail, profile, invite codes.
- **Refactor CategoryAppShell** to a single, predictable navigation pattern (remove `useExternalBottomNav`).
- **Add `SavedStateHandle`** to all ViewModels that hold mutable UI state.
- **Add consistent slide+fade transitions** across all NavHost routes.

---

## 3. Home Screen (For You)

### Files: `ForYouScreen.kt`, `ForYouViewModel.kt` (see also `CategoryHubScreen.kt`, `CategoryModeScreen.kt`, `CategoryDetailScreen.kt`, `PostDetailScreen.kt`)

### Drawbacks

| # | Issue | Severity |
|---|-------|----------|
| H1 | **State in ViewModel saved via `object : ViewModel()` with no DI** — ForYouViewModel doesn't use Hilt constructor injection. | **P0** |
| H2 | **No pagination** — Only one page of data loaded. No `loadMore` for infinite scroll. | **P1** |
| H3 | **CategoryHub/CategoryMode** screens are present but may be dead code or only partially wired. | **P2** |
| H4 | **PostDetailScreen** — heavy inline composable with no viewmodel separation. | **P2** |
| H5 | **No "For You" personalization** — AI-recommended badges exist in `PostCard` but no real recommendation engine behind it. | **P2** |

### Improvements

- **Inject ForYouViewModel via Hilt** (`@HiltViewModel` + `@Inject constructor`).
- **Add pagination** — track `currentPage`, `hasMore`, `loadingMore`, call `loadMore()` on scroll to bottom.
- **Consolidate/remove** CategoryHub/CategoryMode if unused.
- **Refactor PostDetailScreen** — extract ViewModel, share between screens.
- **Wire recommendation API** to populate `topLeftBadge` with real "For You" / "Trending" / "Sponsored" labels.

---

## 4. Explore / AllPosts Screen

### Files: `ExploreScreen.kt` (ExploreViewModel is inline in the same file)

### Drawbacks

| # | Issue | Severity |
|---|-------|----------|
| E1 | **Massive file** — 2000+ lines with inline ViewModel, mock data, and multiple nested screens. | **P0** |
| E2 | **Search is now local-only** — we changed `onQueryChange` to filter `state.posts` locally. This is fast but won't find server-only posts. Should support both local filter + API search toggle. | **P1** |
| E3 | **Quick filters moved to stickyHeader** — good for parity, but the sticky header still feels cramped. Sort + subcategories + quick filters all in one sticky row may overflow on smaller screens. | **P1** |
| E4 | **Cart/Notifications icons removed** — user may want quick access. | **P2** |
| E5 | **Hardcoded mock posts** — `MOCK_EXPLORE_POSTS` with 30+ items. No clean fallback to API + cache. | **P1** |
| E6 | **`searchResults` vs `posts` dual state** — confusing. After local filtering change, `searchResults` duplicates `posts`. Should consolidate. | **P2** |

### Improvements

- **Split into separate files** — `ExploreScreen.kt`, `ExploreViewModel.kt`, `AllPostsFilterBar.kt`.
- **Add "Search on server" toggle** — when user taps search icon (or presses Enter), optionally call API for full-text search.
- **Make sticky header scrollable horizontally** — allow users to swipe through filter options.
- **Add cart/notifications back** as icons that open the respective screens (not inline actions).
- **Consolidate state** — replace `searchResults` + `posts` with a single `displayedPosts` derived state.
- **Use `RememberSaveable`** for filter selections across config changes.

---

## 5. Product Listing & Category Screens

### Files: `ProductListingScreen.kt`, `CategoryHomeScreen.kt`, `SubcategoryScreen.kt`, `MockProductDetailScreen.kt`, `CategoriesScreen.kt`

### Drawbacks

| # | Issue | Severity |
|---|-------|----------|
| L1 | **ProductListingScreen uses `MockDataProvider.MockProduct`** — not the real `Post` domain model. Duplicate data models. | **P0** |
| L2 | **`EnhancedProductCard`** depends on `MockProduct` — the real app uses `Post`. Two different card systems. | **P0** |
| L3 | **Compare dialog is functional but uses mock data only** — broken for real API posts. | **P1** |
| L4 | **CategoryHomeScreen** uses hardcoded deals and subcategory tiles — no API integration evident. | **P1** |
| L5 | **`SubcategoryScreen`** loads mock subcategories — real API data not wired. | **P1** |
| L6 | **`MockProductDetailScreen`** — name says it all. No real product detail page. | **P1** |
| L7 | **`CategoriesScreen.kt`** (in categories package separate from categoryapp) — duplicate category listing. | **P2** |
| L8 | **No price history / compare chart** — compare feature shows static table, no price trend visualization. | **P2** |

### Improvements

- **Align on a single `Post` domain model** — remove `MockProduct`, make `EnhancedProductCard` accept `Post`.
- **Wire real API** for product detail, subcategories, category home.
- **Make compare feature work with `Post`** — adapt compare dialog to work with real `Post` fields.
- **Add price trend chart** using `Canvas` or a charting library.
- **Consolidate CategoriesScreen** with CategoryApp's subcategory listing.
- **Add spec comparison visualization** — highlight differences between compared products.

---

## 6. CategoryApp Shell

### Files: `CategoryAppShell.kt`

### Drawbacks

| # | Issue | Severity |
|---|-------|----------|
| C1 | **`useExternalBottomNav` flag** causes complexity — sometimes the shell shows bottom nav, sometimes it doesn't. Race conditions with parent navigation. | **P0** |
| C2 | **Cart/Wishlist badges** — Room-based counts work, but there's also a `cartBadgeCount` prop. Conflicting sources of truth. | **P1** |
| C3 | **Profile tab in CategoryApp** calls `ProfileScreen` with empty callbacks — no settings, no MyPosts, no KYC from within category context. | **P1** |
| C4 | **CategoryApp animations** — only fade, no slide transitions. | **P2** |

### Improvements

- **Remove `useExternalBottomNav`** — always use internal bottom nav. If parent wants no bottom nav, don't render CategoryAppShell at all.
- **Consolidate badge counts** — use Room DAO flows as single source of truth.
- **Wire Profile tab callbacks properly** — pass through meaningful navigation actions.
- **Add slide transitions** for sub-screen navigation inside category context.

---

## 7. Feed (Knowledge Feed)

### Files: `FeedScreen.kt`, `FeedViewModel.kt`

### Drawbacks

| # | Issue | Severity |
|---|-------|----------|
| F1 | **All `FeedItem` translations are hardcoded** — `"Read more..."`, `"View Details"`, `"Share some knowledge..."` are plain strings, not `stringResource`. | **P0** |
| F2 | **FeedScreen uses mock data on API failure silently** — no error state shown to user. | **P1** |
| F3 | **No `TranslatedText` for any feed content** — user's language selection won't affect feed display. | **P1** |
| F4 | **Hero banner is hardcoded gradient** — "Knowledge & News" with purple gradient. Not configurable from CMS/API. | **P2** |
| F5 | **ComposerCard** is a small inline row — should be a full post editor or at least navigate to a proper create-post flow. | **P2** |
| F6 | **No comment/view count for non-expanded items** — counts only shown in expanded state. | **P2** |
| F7 | **No share action in FeedCard** — share icon is present but only for some items. | **P2** |

### Improvements

- **Replace all hardcoded strings** with `stringResource(...)` calls.
- **Show error state** when API fails and no cached data available (instead of silently showing mock).
- **Wrap all user-generated text** in `TranslatedText` or at least apply locale-aware rendering.
- **Make hero banner dynamic** — fetch from CMS API or at least use a configuration object.
- **Make ComposerCard** a real navigation entry point to the CreatePost screen.
- **Add proper share intent** to all feed cards.

---

## 8. Auth Screens

### Files: `LoginScreen.kt`, `SignUpScreen.kt`, `ForgotPasswordScreen.kt`, `ResetPasswordScreen.kt`, `AuthViewModel.kt`

### Drawbacks

| # | Issue | Severity |
|---|-------|----------|
| ATH1 | **No biometric / fingerprint login** — `BiometricHelper.kt` was deleted. Users must type password every time. | **P1** |
| ATH2 | **No social login (Google, Apple)** — only email/password. | **P1** |
| ATH3 | **No phone OTP login** — many Indian marketplace users prefer phone + OTP. | **P1** |
| ATH4 | **No password strength indicator** on signup. | **P2** |
| ATH5 | **ResetPasswordScreen** exists but may not be wired to the API correctly. | **P2** |
| ATH6 | **No "Remember me" toggle** — session persistence is always-on. | **P2** |
| ATH7 | **Auth screens use hardcoded colors** (`Color(0xFF2563EB)`) instead of theme colors. | **P2** |

### Improvements

- **Re-implement biometric login** — use `BiometricPrompt` from AndroidX.
- **Add Google Sign-In** — wire `credential_manager` API.
- **Add phone OTP auth** — Firebase Auth or MSG91 integration.
- **Add password strength meter** — visual indicator on signup.
- **Test ResetPasswordScreen API integration** — ensure forgot/reset flow end-to-end.
- **Add "Remember me" toggle** that controls token persistence duration.
- **Theme-ify auth screens** — use `MaterialTheme.colorScheme.*` everywhere.

---

## 9. Profile Screen

### Files: `ProfileScreen.kt`, `ProfileSubScreens.kt`

### Drawbacks

| # | Issue | Severity |
|---|-------|----------|
| P1 | **ProfileScreen.kt has pre-existing compilation errors** — from the branch state. | **P0** |
| P2 | **Marketplace Pulse stats** are mock — "0 listings", "— rating", "0 sales", "Basic rank" (from screenshots). | **P1** |
| P3 | **Quick actions** section is not fully wired — some actions do nothing. | **P1** |
| P4 | **"Verify now" button** shows Unverified badge even for verified users. | **P1** |
| P5 | **Profile picture editing** — user avatar upload not implemented. | **P1** |
| P6 | **No edit profile form** — "Edit profile" button exists but may not navigate to editable fields. | **P1** |
| P7 | **ProfileSubScreens** — multiple subscreens may be dead or incomplete. | **P2** |

### Improvements

- **Fix ProfileScreen compilation errors** — resolve merge conflicts.
- **Wire real API stats** for marketplace pulse (listings, rating, sales, rank).
- **Fully wire all quick actions** — each button should navigate properly.
- **Sync verification status** with actual KYC API response.
- **Implement avatar upload** — photo picker + upload to server.
- **Implement edit profile flow** — name, phone, location, bio fields.
- **Audit ProfileSubScreens** — remove dead ones, complete partially-wired ones.

---

## 10. Account Screens

### Files: `AccountScreens.kt`

### Drawbacks

| # | Issue | Severity |
|---|-------|----------|
| AC1 | **AccountScreens.kt is a catch-all** — contains multiple unrelated screens (Security, Delete Account, Dashboard, etc.). | **P1** |
| AC2 | **Security screen** likely has placeholder content — not actionable. | **P2** |
| AC3 | **Delete Account flow** — may not actually delete from backend. | **P2** |
| AC4 | **Dashboard screen** — may show mock data instead of real stats. | **P2** |

### Improvements

- **Split into individual files** — one file per sub-screen.
- **Wire Security screen** — show active sessions, logout individual devices, change password.
- **Test Delete Account** — ensure API call is made and data is purged.
- **Wire Dashboard with real analytics** — listing views, inquiries, conversion rate.

---

## 11. Settings Screen

### Files: `SettingsScreen.kt`, `SettingsViewModel.kt`

### Drawbacks

| # | Issue | Severity |
|---|-------|----------|
| S1 | **Settings language change calls `recreate()`** — forces full app restart. Should use `AppCompatDelegate.setApplicationLocales()` more gracefully. | **P1** |
| S2 | **Cache clear is destructive** — deletes entire cache directory including non-image data. Could break in-progress operations. | **P1** |
| S3 | **Notification preferences are local-only** — toggle states are not persisted or synced to server. | **P1** |
| S4 | **Logout all devices** — clears local token but may not invalidate server sessions. | **P1** |
| S5 | **Network section** — API URL editing is a power-user feature, might confuse regular users. Should be hidden behind a "Developer options" toggle. | **P2** |
| S6 | **Data export** — `"Request Data Export"` shows a toast-style message but doesn't actually trigger any API call. | **P2** |
| S7 | **No cache size display** — "Clear Cache" button doesn't show current cache size. | **P2** |

### Improvements

- **Use `AppCompatDelegate.setApplicationLocales()` without `recreate()`** — apply locale changes more gracefully (recompose only active screens).
- **Implement selective cache clearing** — clear only image cache + temp files, not entire cache dir.
- **Persist notification prefs** — save to `AppPreferences` and sync to server API.
- **Add server-side session invalidation** — call logout API before clearing local tokens.
- **Hide network section behind long-press** or developer toggle.
- **Wire real data export API** — generate and email export.
- **Show cache size before clearing** — calculate and display current cache size.

---

## 12. More Screen

### Files: `MoreScreen.kt`

### Drawbacks

| # | Issue | Severity |
|---|-------|----------|
| M1 | **Massive callback list** — 40+ lambda parameters. Extremely hard to maintain and wire from parent. | **P0** |
| M2 | **Appearance/language panel is duplicated** — same language and theme picker exists in Settings screen. Two sources of truth. | **P1** |
| M3 | **No search/filter in More menu** — users with many menu items (40+) can't find what they need. | **P1** |
| M4 | **Admin panel** — `"Admin"` badge is shown but the callback may lead to an access-denied screen. | **P2** |
| M5 | **Menu item ordering** — is hardcoded and may not match user expectations (Trade > Social > Account > Settings). | **P2** |

### Improvements

- **Replace lambdas with a sealed class / route-based navigation** — e.g., `sealed class MoreRoute { object Sell : MoreRoute(); data class OpenItem(val route: String) : MoreRoute() }`.
- **Remove duplicated appearance/language** — keep only in Settings, link from More.
- **Add search bar** at the top of More to filter menu items by name.
- **Pre-check admin access** before showing the badge.
- **Make menu order configurable** — or at least group logically with headers.

---

## 13. Wishlist Screen

### Files: `WishlistScreen.kt`, `WishlistViewModel.kt`

### Drawbacks

| # | Issue | Severity |
|---|-------|----------|
| W1 | **Price drop detection is `null`** — `val priceDrop: Int? = null` on every card. Feature exists in UI but never works. | **P1** |
| W2 | **No API-based price history** — `priceAlertsRepo.subscribe/unsubscribe` may not be wired to real endpoint. | **P1** |
| W3 | **Grid mode uses `chunked(2)` with manual `Column+verticalScroll`** — not a proper `LazyVerticalGrid`. Performance issue for large lists. | **P1** |
| W4 | **Search in wishlist** — works locally on loaded items. No server-side search. | **P2** |
| W5 | **Bulk add-to-cart** — calls `cartRepo.add()` for each selected item sequentially with no progress indicator. | **P2** |

### Improvements

- **Implement price tracking** — poll price history API, compare with saved `wishlistedAt` price.
- **Wire price alerts to real API** — connect `togglePriceAlert` to backend.
- **Fix grid mode** — use proper `LazyVerticalGrid` with `key` parameter for stable recomposition.
- **Add server-side search** option when local results are insufficient.
- **Show bulk-add progress** — LinearProgressIndicator + disable button during operation.

---

## 14. Notifications Screen

### Files: `NotificationsScreen.kt`, `NotificationsViewModel.kt`

### Drawbacks

| # | Issue | Severity |
|---|-------|----------|
| NOT1 | **SwipeToDismiss deletes permanently** — no "undo" snackbar. | **P1** |
| NOT2 | **Notification settings are local-only** — toggle states in ModalBottomSheet are not persisted. | **P1** |
| NOT3 | **Snooze is hardcoded to 1 hour** — no user-configurable snooze duration. | **P2** |
| NOT4 | **Date grouping works but could be more granular** — "This Week" groups all 7 days together. "Today" should show time. | **P2** |
| NOT5 | **Notification styles** — `notifStyle()` maps types to icons/colors by string matching (`contains`). Brittle. Should use enum. | **P2** |

### Improvements

- **Add undo snackbar** — use `SnackbarHost + SnackbarResult` to let users undo dismiss.
- **Persist notification preferences** — save to local Room DB + sync to server.
- **Offer snooze options** — 1h, 4h, 24h, custom.
- **Improve date grouping** — show time for today items, "Yesterday" for yesterday.
- **Replace `contains()` with typed enum** — `NotifType.ORDER`, `NotifType.MESSAGE`, etc.

---

## 15. Rewards Screen

### Files: `RewardsScreen.kt`, `RewardsViewModel.kt`

### Drawbacks

| # | Issue | Severity |
|---|-------|----------|
| R1 | **Massive single-file UI** — RewardsScreen is ~1500+ lines with inline composables and complex animation/game logic. | **P0** |
| R2 | **Spin wheel and scratch card are canvas-based demos** — fun but not connected to real game logic / backend. | **P1** |
| R3 | **Mock fallback is very verbose** — `MOCK_REWARDS`, `MOCK_ENGAGEMENT`, `MOCK_COIN_HISTORY`, `MOCK_LEADERBOARD` all defined inline. | **P1** |
| R4 | **Redeem store items are hardcoded** — "Listing Boost", "Featured Badge", "$5 Gift Card" — none are wired to real inventory API. | **P1** |
| R5 | **Coin discount is not applied** — the `coinsApplied` field exists in TiersViewModel but the actual discount computation at checkout is not implemented. | **P1** |
| R6 | **Daily secret code** — verification logic is purely client-side (`if (codeInput == user.dailySecretCode)`). Should verify server-side. | **P1** |
| R7 | **ScrollableTabRow overflows** — 4 tabs in scrollable row, but content below (LazyColumn) may conflict with tab scrolling. | **P2** |
| R8 | **Confetti animation** — `ConfettiAnimation()` composable exists but is never called. | **P2** |
| R9 | **Leaderboard only shows referrals** — should also show coins earned, posts listed, etc. | **P2** |

### Improvements

- **Split into files** — `RewardsScreen.kt`, `RewardsViewModel.kt`, `RewardsComponents.kt`, `RewardsGameViews.kt`.
- **Extract game logic** — spin wheel and scratch card should be custom composables in a separate file, connected to API.
- **Centralize mock data** — move to `MockDataProvider`.
- **Wire redeem store to real API** — fetch inventory, submit redemption requests.
- **Implement coin discount at checkout** — deduct coins from total before payment.
- **Verify codes server-side** — send code to API for validation.
- **Fix ScrollableTabRow + LazyColumn nesting** — use a single-column scroll or nested-lazy correctly.
- **Actually invoke `ConfettiAnimation`** — on milestone claim or coin reward.
- **Expand leaderboard metrics** — multiple leaderboard categories.

---

## 16. Commerce & Checkout Screens

### Files: `CommerceScreens.kt`, `CheckoutScreens.kt`

### Drawbacks

| # | Issue | Severity |
|---|-------|----------|
| CM1 | **CommerceScreens.kt is monstrous** — 300K+ characters containing 7+ different screens (TierSelection, EditPost, MyPosts, Cart, Bought, Sold, Compare, PostWelcome). | **P0** |
| CM2 | **Checkout is simulated** — no real payment gateway integration. Payment methods (UPI, Card, Net Banking) are just UI forms. | **P0** |
| CM3 | **Cart screen logic is split across files** — `CartScreen` in CommerceScreens.kt but also referenced from CategoryAppShell. No unified cart ViewModel. | **P1** |
| CM4 | **TierSelection screen uses `SubscribeRequest`** — but no actual Stripe/Razorpay payment flow is initiated. | **P1** |
| CM5 | **Bought/Sold screens show mock data** — `MOCK_BOUGHT_POSTS`, `MOCK_SOLD_POSTS`. API integration may be missing. | **P1** |
| CM6 | **FreeLaunchPlan core util** — used in TierSelection but may have incorrect date logic. | **P2** |
| CM7 | **EditPostScreen image upload** — limits to 2MB per image, 10 images total. Upload progress is tracked per-file but not resumable. | **P2** |
| CM8 | **Checkout Address validation** — manual validation code in composable. Should be extracted to a validation utility. | **P2** |

### Improvements

- **Split CommerceScreens.kt** — one file per screen: `TierSelectionScreen.kt`, `EditPostScreen.kt`, `MyPostsScreen.kt`, `CartScreen.kt`, `BoughtScreen.kt`, `SoldScreen.kt`, `PostWelcomeScreen.kt`.
- **Integrate real payment gateway** — Razorpay (best for India) or Stripe.
- **Unify Cart ViewModel** — single `CartViewModel` used across all cart references.
- **Wire TierSelection to real payments** — generate Razorpay order, handle success/failure webhook.
- **Wire Bought/Sold to real API** — call `orders/bought` and `orders/sold` endpoints.
- **Verify FreeLaunchPlan date logic** — ensure promo end date is correct.
- **Add resumable image upload** — chunked upload with pause/resume.
- **Extract address validation** to `InputValidators.kt`.

---

## 17. Post Creation / Edit / MyPosts

### Files: `CreatePostScreen.kt`, `MyPostsScreen.kt`, `CommerceScreens.kt` (EditPostScreen)

### Drawbacks

| # | Issue | Severity |
|---|-------|----------|
| CP1 | **CreatePostScreen** — exists as a separate file but may not be fully wired. | **P1** |
| CP2 | **EditPostScreen embedded in CommerceScreens.kt** — should be its own file. | **P1** |
| CP3 | **MyPostsScreen auto-refreshes every 45s** — `LaunchedEffect` with `while(isActive) { delay(45_000); viewModel.load() }`. Battery-draining, unnecessary for local data. | **P1** |
| CP4 | **MyPostsScreen delete confirms but doesn't call API** — `repo.delete(id)` is called but `load()` is not called after. Optimistic removal only. | **P1** |
| CP5 | **No draft auto-save** — user types a long listing, switches apps, and loses all progress. | **P2** |
| CP6 | **No image reordering** — photos section shows images in upload order but user can't rearrange. | **P2** |

### Improvements

- **Wire CreatePostScreen end-to-end** — ensure navigation from "+" FAB works and submission hits API.
- **Extract EditPostScreen** to its own file.
- **Remove 45-second auto-refresh** — use push notifications or pull-to-refresh only.
- **Call API delete + reload** — ensure both frontend and backend are in sync.
- **Add draft auto-save** — serialize form state to DataStore every 30s.
- **Add drag-to-reorder for images** — use `LazyRow` with `detectDragGestures`.

---

## 18. KYC Screen

### Files: `KycScreen.kt` (inline ViewModel assumed)

### Drawbacks

| # | Issue | Severity |
|---|-------|----------|
| K1 | **KycViewModel may be inline** — need to verify if ViewModel is separate. | **P1** |
| K2 | **Image upload reads full bytes into memory** — `resolver.openInputStream(uri)?.use { it.readBytes() }` can cause OOM for large images. | **P1** |
| K3 | **No image compression** — sending full-resolution images to server. | **P1** |
| K4 | **No supported document detection** — user must manually select document type. Could auto-detect from image. | **P2** |
| K5 | **Step indicator shows 4 steps but only 3 real steps** — "Document" and "Upload" could be merged. | **P2** |

### Improvements

- **Extract KycViewModel** to a proper Hilt ViewModel file.
- **Stream uploads** — use `ContentResolver.openFileDescriptor` + chunked upload instead of reading all bytes.
- **Compress images client-side** — use `BitmapFactory` to downscale before upload.
- **Auto-detect document type** — use ML Kit document scanner or OCR to suggest doc type.
- **Simplify step indicator** — reduce to 3 steps: "Select Document" → "Upload Photos" → "Submit".

---

## 19. Search Screen

### Files: `SearchScreen.kt`

### Drawbacks

| # | Issue | Severity |
|---|-------|----------|
| SR1 | **SearchScreen may be incomplete** — needs review to check if it connects to real search API. | **P1** |
| SR2 | **No recent searches** — no persistence of user's search history. | **P2** |
| SR3 | **No search suggestions** — no autocomplete or trending searches. | **P2** |
| SR4 | **No voice search** — microphone button for voice input not present. | **P2** |

### Improvements

- **Wire SearchScreen to real search API** — `GET /api/posts/search?q=...`.
- **Add recent searches** — save last 10 queries to DataStore.
- **Add trending/searched terms** — fetch from API or show locally popular terms.
- **Add voice search button** — `SpeechRecognizer` integration.

---

## 20. Legal / Static Pages

### Files: `LegalScreens.kt`, `StaticPages.kt`

### Drawbacks

| # | Issue | Severity |
|---|-------|----------|
| LG1 | **Terms, Privacy, Refund use CMS API** — good, but fallback content is hardcoded. If API fails, screens are blank. | **P1** |
| LG2 | **FAQ screen has search** — nice, but questions/answers are hardcoded. Should use CMS-driven FAQ. | **P1** |
| LG3 | **AdminPanelScreen** — comprehensive but has `selectAllUsers`/`selectAllPosts` with potential performance issues for large datasets. | **P2** |
| LG4 | **Contact Us form** — doesn't actually send email. `submitted = true` just shows success message locally. | **P1** |
| LG5 | **About Us** — mission/vision/why-choose are hardcoded strings. Should be CMS-driven. | **P2** |

### Improvements

- **Add fallback UI** — show cached/dummy content when CMS API fails.
- **Make FAQ CMS-driven** — fetch from API with search handled server-side.
- **Add pagination to Admin panels** — don't load all users/posts at once.
- **Wire Contact Us form** — send via API or `Intent.ACTION_SENDTO`.
- **Make About Us dynamic** — fetch from CMS API.

---

## 21. Shared Components

### Files: `PostCardComponents.kt`, `SharedPostComponents.kt`, `MhubTopBar.kt`, `Buttons.kt`, `CommerceComponents.kt`, `ScreenChrome.kt`, `CompareItemHolder.kt`

### Drawbacks

| # | Issue | Severity |
|---|-------|----------|
| SC1 | **PostCardComponents.kt and SharedPostComponents.kt overlap** — `TagChip`, `ConditionChip`, `StatusChip` appear in both. Duplication. | **P1** |
| SC2 | **PostCard component references `TranslatedText`** — good, but the `TagChip` function doesn't use `TranslatedText` for condition labels. | **P1** |
| SC3 | **MhubTopBar** — may be unused now since each screen defines its own `TopAppBar`. Dead code. | **P2** |
| SC4 | **Buttons.kt** — custom `PrimaryButton`, `SecondaryButton`, `AppTextField` etc. are nice but not used consistently across all screens. | **P2** |
| SC5 | **CompareItemHolder** — global mutable singleton for compare items. Reset on process death. Should use ViewModel-scoped state. | **P1** |
| SC6 | **ScreenChrome.kt** — may contain wrappers that are partially adopted. | **P2** |

### Improvements

- **Consolidate PostCardComponents** — merge `TagChip`, `ConditionChip`, etc. into `SharedPostComponents.kt`; remove the duplicate.
- **Add `TranslatedText` to `TagChip`** and all pill/chip labels.
- **Remove or repurpose `MhubTopBar.kt`** — if unused, delete. If useful, adopt across all screens.
- **Enforce use of shared Button components** — audit all screens and replace ad-hoc `Button(...)` with `PrimaryButton(...)` from Buttons.kt.
- **Replace `CompareItemHolder` object** with `ViewModel` + `SavedStateHandle`.
- **Promote ScreenChrome** — make it the standard scaffold wrapper for all screens.

---

## 22. Execution Roadmap

### Phase 1: Critical Fixes (P0) — ~1-2 weeks

| Task | Files | Effort |
|------|-------|--------|
| 1.1 Fix MhubApp.kt compilation errors | `MhubApp.kt` | 1 day |
| 1.2 Fix ProfileScreen.kt compilation errors | `ProfileScreen.kt` | 0.5 day |
| 1.3 Split CommerceScreens.kt into 7+ files | `CommerceScreens.kt` | 2 days |
| 1.4 Split ExploreScreen.kt into screen + viewmodel | `ExploreScreen.kt` | 1 day |
| 1.5 Replace MoreScreen 40-lambda pattern with sealed route | `MoreScreen.kt` | 1 day |
| 1.6 ForYouViewModel Hilt injection + pagination | `ForYouScreen.kt` | 1 day |
| 1.7 Remove `useExternalBottomNav` from CategoryAppShell | `CategoryAppShell.kt` | 0.5 day |
| 1.8 Align `MockProduct` + `Post` domain models | `ProductListingScreen.kt`, `MockDataProvider.kt` | 1.5 days |

### Phase 2: Localization & Theming (P1) — ~1 week

| Task | Files | Effort |
|------|-------|--------|
| 2.1 Audit all hardcoded strings → `stringResource` | All screens | 2 days |
| 2.2 Add `TranslatedText` to all user-facing labels in PostCard, FeedCard | `PostCardComponents.kt`, `FeedScreen.kt` | 0.5 day |
| 2.3 Replace hardcoded hex colors with theme tokens | All screens | 1 day |
| 2.4 Add `ColorTokens.kt` semantic color mapping | New file | 0.5 day |
| 2.5 Make language switching not require `recreate()` | `SettingsScreen.kt`, `LocaleManager.kt` | 1 day |

### Phase 3: Functional Completeness (P1) — ~2-3 weeks

| Task | Files | Effort |
|------|-------|--------|
| 3.1 Wire real Payment Gateway (Razorpay) | `CheckoutScreens.kt`, new `PaymentViewModel.kt` | 3 days |
| 3.2 Wire real KYC API | `KycScreen.kt` + new `KycViewModel.kt` | 1 day |
| 3.3 Wire real Product Detail API | `MockProductDetailScreen.kt` → proper screen | 1 day |
| 3.4 Wire real Subcategories API | `SubcategoryScreen.kt` | 0.5 day |
| 3.5 Wire real Wishlist price alerts | `WishlistViewModel.kt` | 1 day |
| 3.6 Wire real Notifications preferences to server | `NotificationsScreen.kt` | 0.5 day |
| 3.7 Wire real Contact Us form | `StaticPages.kt` | 0.5 day |
| 3.8 Implement biometric login | `LoginScreen.kt`, new `BiometricHelper.kt` | 1 day |
| 3.9 Implement phone OTP login | `LoginScreen.kt`, `AuthViewModel.kt` | 1.5 days |
| 3.10 Implement "For You" recommendation API | `ForYouScreen.kt` | 1 day |
| 3.11 Wire Profile stats to API | `ProfileScreen.kt` | 1 day |
| 3.12 Wire rewards store & games to API | `RewardsScreen.kt` | 2 days |

### Phase 4: Polish & Performance (P2) — ~2 weeks

| Task | Files | Effort |
|------|-------|--------|
| 4.1 Add proper lazy grids (replace chunked hacks) | `WishlistScreen.kt` | 0.5 day |
| 4.2 Add page transitions to all NavHost routes | `MhubApp.kt` + all screens | 0.5 day |
| 4.3 Add deep link support | `MhubApp.kt`, `Routes.kt` | 1 day |
| 4.4 Implement draft auto-save for CreatePost | `CreatePostScreen.kt` | 0.5 day |
| 4.5 Remove 45s auto-refresh in MyPosts | `CommerceScreens.kt` | 0.25 day |
| 4.6 Add undo snackbar for notification dismiss | `NotificationsScreen.kt` | 0.5 day |
| 4.7 Add search bar to More menu | `MoreScreen.kt` | 0.5 day |
| 4.8 Add recent searches + autocomplete to SearchScreen | `SearchScreen.kt` | 1 day |
| 4.9 Consolidate PostCard components | `PostCardComponents.kt`, `SharedPostComponents.kt` | 0.5 day |
| 4.10 Replace `CompareItemHolder` object with ViewModel | `CommerceScreens.kt` | 0.5 day |
| 4.11 Add price trend chart to compare dialog | `ProductListingScreen.kt` | 1 day |
| 4.12 Add cache size display before clearing | `SettingsScreen.kt` | 0.25 day |

### Phase 5: Nice-to-Have (P3) — ~1-2 weeks

| Task | Files | Effort |
|------|-------|--------|
| 5.1 Add Google Sign-In | `LoginScreen.kt` | 1 day |
| 5.2 Add voice search | `SearchScreen.kt` | 1 day |
| 5.3 Add image reordering in edit post | `CommerceScreens.kt` | 1 day |
| 5.4 Add confetti animation on milestone | `RewardsScreen.kt` | 0.5 day |
| 5.5 Make FAQ CMS-driven | `StaticPages.kt` | 0.5 day |
| 5.6 Make hero banners dynamic | `FeedScreen.kt`, `HomeScreen.kt` | 1 day |
| 5.7 Add password strength indicator | `SignUpScreen.kt` | 0.25 day |
| 5.8 Auto-detect KYC document type from image | `KycScreen.kt` | 1 day |
| 5.9 Add error boundary at app level | `MhubApp.kt` | 0.5 day |

---

### Summary Statistics

| Metric | Count |
|--------|-------|
| Total P0 issues | 9 |
| Total P1 issues | 32 |
| Total P2 issues | 24 |
| Total P3 issues | 9 |
| Estimated Phase 1 effort | ~8 days |
| Estimated Phase 2 effort | ~5 days |
| Estimated Phase 3 effort | ~16 days |
| Estimated Phase 4 effort | ~8 days |
| Estimated Phase 5 effort | ~6 days |
| **Total estimated effort** | **~43 days (2 person-months)** |

---

*End of analysis plan.*

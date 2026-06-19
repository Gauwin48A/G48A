# MHub Android App — Complete Screen-by-Screen Analysis

> **Generated:** June 12, 2026  
> **Format:** Per screen — What to ADD (new features), IMPROVE (make better), and FIX (refinements)

---

## Table of Contents

1. [HomeScreen](#1-homescreen)
2. [ForYouScreen](#2-foryouscreen)
3. [ExploreScreen / AllPosts](#3-explorescreen--allposts)
4. [PostDetailScreen](#4-postdetailscreen)
5. [CategoryAppShell + Category Screens](#5-categoryappshell--category-screens)
6. [ProductListingScreen](#6-productlistingscreen)
7. [FeedScreen (Knowledge Feed)](#7-feedscreen-knowledge-feed)
8. [Auth Screens (Login/SignUp/ForgotPassword/ResetPassword)](#8-auth-screens)
9. [ProfileScreen](#9-profilescreen)
10. [AccountScreens](#10-accountscreens)
11. [SettingsScreen](#11-settingsscreens)
12. [MoreScreen](#12-morescreen)
13. [WishlistScreen](#13-wishlistscreen)
14. [NotificationsScreen](#14-notificationsscreen)
15. [RewardsScreen](#15-rewardsscreen)
16. [CommerceScreens (TierSelection, EditPost, MyPosts, Cart, etc.)](#16-commercescreens)
17. [CheckoutScreens](#17-checkoutscreens)
18. [CreatePostScreen](#18-createpostscreen)
19. [SearchScreen](#19-searchscreen)
20. [KycScreen](#20-kycscreen)
21. [ScannerScreen](#21-scannerscreen)
22. [LocationSelectionScreen](#22-locationselectionscreen)
23. [NearbyScreen](#23-nearbyscreen)
24. [SubcategoriesScreen](#24-subcategoriesscreen)
25. [ActivityHubScreen](#25-activityhubscreen)
26. [NotificationsPrefsScreen](#26-notificationsprefsscreen)
27. [DailyCodeAndReferralScreens](#27-dailycodeandreferralscreens)
28. [RecentlyViewedFullScreen](#28-recentlyviewedfullscreen)
29. [Legal/Static Pages](#29-legalstatic-pages)
30. [Shared Components (PostCard, Buttons, etc.)](#30-shared-components)

---

## 1. HomeScreen

**File:** `HomeScreen.kt` (with `HomeViewModel`)

### Analysis

| # | Type | Point | Description |
|---|------|-------|-------------|
| 1 | **➕ New Feature** | **Dynamic hero banner from CMS** | Replace the static "Welcome to MHub" banner with a dynamic carousel of 3-4 promotional banners fetched from a CMS API (offers, featured categories, seasonal campaigns). Each banner should be tappable with deep-link actions. |
| 2 | **➕ New Feature** | **Personalized "Continue where you left off"** | Add a horizontal scroll section showing recently viewed posts (from `RecentlyViewedViewModel`). Show last 6 items with thumbnail + price. |
| 3 | **➕ New Feature** | **Quick actions toolbar** | Add a horizontal scroll row of quick actions below the hero: "Sell", "Search", "Scan QR", "Nearby", "Rewards" — each with icon + label. |
| 4 | **🔧 Improvement** | **CategoryGrid → proper API-driven categories** | The 4 static categories (Electronics, Fashion, Vehicles, Others) are hardcoded. Fetch real categories from API. Each category card should show a live product count. |
| 5 | **🔧 Improvement** | **Add live deal/offer indicators** | Category cards should show a counter badge (e.g., "12 new today") or a "🔥 Hot" indicator when there are recently listed items in that category. |
| 6 | **🔧 Improvement** | **Landing page should show recommended posts** | Below the category grid, add a "Trending Now" or "Recommended for You" LazyRow of PostCards with horizontal scrolling — using the same recommendation logic as ForYou. |
| 7 | **🔧 Improvement** | **Add search bar to top of HomeScreen** | Instead of requiring navigation to a separate SearchScreen, embed a search bar at the top that expands inline (like Airbnb's homescreen search). |
| 8 | **🔧 Refinement** | **Theme-ify hardcoded colors** | `Color(0xFF1E40AF)` and similar hex colors should be `MaterialTheme.colorScheme.primary` etc. |
| 9 | **🔧 Refinement** | **WelcomeBanner uses primaryContainer** | Make sure dark mode works properly — the gradient may be too strong in dark mode. Add dark mode check. |

---

## 2. ForYouScreen

**File:** `ForYouScreen.kt`, `ForYouViewModel.kt`

### Analysis

| # | Type | Point | Description |
|---|------|-------|-------------|
| 1 | **➕ New Feature** | **Infinite scroll pagination** | Currently loads only one page. Add `loadMore()` — detect when user scrolls to last item, increment page, append results. Track `hasMore` from API response. |
| 2 | **➕ New Feature** | **"Why this post?" AI explanations** | When a post has `topLeftBadge = "For You"`, show a small tooltip "Recommended based on your recent views in Electronics" to explain the recommendation. |
| 3 | **➕ New Feature** | **Category-filtered ForYou tabs** | Add horizontal tab chips at top: "All", "Electronics", "Fashion", "Vehicles" — filtering the ForYou feed by category. |
| 4 | **🔧 Improvement** | **Hilt injection for ViewModel** | ForYouViewModel is declared inline or without proper Hilt DI. Make it a proper `@HiltViewModel` with constructor injection. |
| 5 | **🔧 Improvement** | **Pull-to-refresh animation** | Add `PullToRefreshBox` wrapping the post list. |
| 6 | **🔧 Improvement** | **"Not interested" feedback** | When user taps "Not interested" from PostCard dropdown, send feedback to recommendation engine so future results improve. |
| 7 | **🔧 Refinement** | **Consolidate ForYou into AllPosts** | ForYou and AllPosts share the same PostCard layout. Consider making ForYou a tab within ExploreScreen or sharing the same layout to reduce code duplication. |
| 8 | **🔧 Refinement** | **Loading shimmer** | Replace `CircularProgressIndicator` with `ListShimmer` for a smoother loading experience. |

---

## 3. ExploreScreen / AllPosts

**File:** `ExploreScreen.kt` (2000+ lines)

### Analysis

| # | Type | Point | Description |
|---|------|-------|-------------|
| 1 | **➕ New Feature** | **Dual search: local filter + server search toggle** | Currently search filters locally only. Add a "Search on server" button/icon that fires API search when user wants full results. Show `searchResults` vs `posts` in tabs. |
| 2 | **➕ New Feature** | **Saved search alerts** | Add a "🔔 Get alerts" button next to search bar. When tapped, user gets push notifications when new matching posts are listed (via `SavedSearchesRepository`). |
| 3 | **➕ New Feature** | **View count / trending indicator on posts** | Show a small eye icon + view count on each PostCard in list mode. |
| 4 | **🔧 Improvement** | **Split into separate files** | Extract `ExploreViewModel` into its own file. Extract mock data into `MockDataProvider`. Target: max 400 lines per file. |
| 5 | **🔧 Improvement** | **Consolidate `searchResults` + `posts` state** | Remove dual state. Use a single `displayedPosts` derived state that merges local filter + search results. |
| 6 | **🔧 Improvement** | **Sticky filter bar responsiveness** | The sticky header (sort + subcategories + quick filters) may overflow on small screens. Make it horizontally scrollable. |
| 7 | **🔧 Refinement** | **Restore Cart/Notifications icons** | The top bar removed cart and notifications. Users need quick access. Add them back as icon badges. |
| 8 | **🔧 Refinement** | **Remember filter state across config changes** | Use `rememberSaveable` or `SavedStateHandle` for price range, sort option, selected subcategory. |

---

## 4. PostDetailScreen

**File:** `PostDetailScreen.kt` (100K+ chars)

### Analysis

| # | Type | Point | Description |
|---|------|-------|-------------|
| 1 | **➕ New Feature** | **Seller chat button → opens chat** | The "Call" button should be accompanied by a "Chat" button that opens the in-app chat screen for that seller. |
| 2 | **➕ New Feature** | **Price history chart** | Add a "📈 Price History" expandable card with a `Canvas` line chart showing price changes over time (from API). |
| 3 | **➕ New Feature** | **Video playback for video listings** | The video play button overlay is great UX — but it doesn't actually play the video. Wire it to an ExoPlayer or video player overlay. |
| 4 | **🔧 Improvement** | **Split into separate files** | Extract into: `PostDetailScreen.kt`, `PostDetailViewModel.kt`, `PostDetailSections.kt`, `PostDetailActions.kt`. |
| 5 | **🔧 Improvement** | **Share bottom sheet → native Android share** | Currently uses a custom `ShareLinkBottomSheet`. Add a "Share to WhatsApp / Telegram / SMS" quick actions plus native `Intent.ACTION_SEND`. |
| 6 | **🔧 Improvement** | **Activity Log loading** | `activityLog` is always empty in the current code (loads from API but not exposed in UI). Wire the real activity log API. |
| 7 | **🔧 Improvement** | **Seller insights for all users** | Show "View count", "Interest count" even for non-owners (from post model data). Currently only shown for owners. |
| 8 | **🔧 Refinement** | **Optimize image loading** | Use Coil's `size()` to downsample images to display size. Currently loads full-resolution images. |
| 9 | **🔧 Refinement** | **Fix hardcoded safety tips text** | `"• Meet in a public place..."` etc. should be `stringResource` for localization support. |

---

## 5. CategoryAppShell + Category Screens

**Files:** `CategoryAppShell.kt`, `CategoryHomeScreen.kt`, `SubcategoryScreen.kt`, `MockProductDetailScreen.kt`

### Analysis

| # | Type | Point | Description |
|---|------|-------|-------------|
| 1 | **➕ New Feature** | **Voice search in category context** | Add a mic icon in the search bar within category apps that launches voice recognition. |
| 2 | **➕ New Feature** | **Category-specific deals/offers banner** | Show a dynamic banner at the top of each category app (e.g., "Electronics Fest — Up to 40% off on phones") fetched from CMS. |
| 3 | **🔧 Improvement** | **Remove `useExternalBottomNav` flag** | This flag causes unpredictable double-bottom-nav scenarios. Standardize to always use internal bottom nav. |
| 4 | **🔧 Improvement** | **Replace MockProductDetailScreen with real detail** | Wire the real `PostDetailScreen` (from home package) for category product taps. Remove mock screen entirely. |
| 5 | **🔧 Improvement** | **Wire real subcategories API** | CategoryHomeScreen uses hardcoded subcategory tiles. Fetch from `CategoriesRepository`. |
| 6 | **🔧 Improvement** | **Improve cart badge synchronization** | Room-based `cartCount` flow is good but the prop `cartBadgeCount` creates conflict. Use Room as single source. |
| 7 | **🔧 Refinement** | **Fix profile tab callbacks** | ProfileScreen inside CategoryApp has empty callbacks for Settings, MyPosts, KYC. Wire them properly. |
| 8 | **🔧 Refinement** | **Add slide transitions** | Currently only fade transitions. Add slide-in-from-right for sub-screen navigation. |

---

## 6. ProductListingScreen

**File:** `ProductListingScreen.kt`

### Analysis

| # | Type | Point | Description |
|---|------|-------|-------------|
| 1 | **➕ New Feature** | **Price alert on product listing** | Add a "Notify me when price drops" button for each product in the grid. |
| 2 | **➕ New Feature** | **Seller rating display** | Show seller rating (★) and review count on each product card for trust. |
| 3 | **🔧 Improvement** | **Align `MockProduct` domain with `Post` model** | `ProductListingScreen` uses `MockDataProvider.MockProduct` which is incompatible with the real `Post` model. Migrate to `Post`. |
| 4 | **🔧 Improvement** | **Wire real API** for products instead of mock | Replace `MockDataProvider.productsForCategory()` with real API call. |
| 5 | **🔧 Improvement** | **Compare dialog works with real data** | Currently works only with `MockProduct`. Adapt to work with `Post`. |
| 6 | **🔧 Improvement** | **Pagination in product listing** | Load more products when user scrolls to bottom using cursor-based pagination. |
| 7 | **🔧 Refinement** | **Fix "Great Deals" banner hardcoded text** | `"🎉 Great Deals"` and related text should use `stringResource`. |
| 8 | **🔧 Refinement** | **Accessibility labels for filter controls** | Add `semantics { contentDescription }` for all slider, checkbox, and toggle controls. |

---

## 7. FeedScreen (Knowledge Feed)

**File:** `FeedScreen.kt`, `FeedViewModel.kt`

### Analysis

| # | Type | Point | Description |
|---|------|-------|-------------|
| 1 | **➕ New Feature** | **Follow/unfollow users** | Add a "Follow" button in FeedCard author row. Create a user feed based on followed users. |
| 2 | **➕ New Feature** | **Comments section** | Add expandable comments on each FeedCard. Show comment count, tap to view full thread. |
| 3 | **➕ New Feature** | **Feed categories/topics** | Add topic chips (e.g., "Tips", "Reviews", "Safety", "News") to filter the feed by category. |
| 4 | **🔧 Improvement** | **Replace ALL hardcoded English strings** | `"Read more..."`, `"Share some knowledge..."`, `"View Details"` — replace with `stringResource(...)`. |
| 5 | **🔧 Improvement** | **Show error state instead of silent mock** | When API fails, show error UI with retry button. Don't silently show mock data. |
| 6 | **🔧 Improvement** | **Use `TranslatedText` for user content** | Feed content from API should flow through `TranslatedText` composable for locale-aware rendering. |
| 7 | **🔧 Refinement** | **Make composer a navigation entry** | The `ComposerCard` should navigate to a proper Create Feed Post screen, not just show a placeholder. |
| 8 | **🔧 Refinement** | **Share button actually works** | The share icon in FeedCard action bar is present but may not trigger on all items. Ensure every card has a working share action. |

---

## 8. Auth Screens

**Files:** `LoginScreen.kt`, `SignUpScreen.kt`, `ForgotPasswordScreen.kt`, `ResetPasswordScreen.kt`, `AuthViewModel.kt`

### Analysis

| # | Type | Point | Description |
|---|------|-------|-------------|
| 1 | **➕ New Feature** | **Biometric / Fingerprint login** | Re-implement `BiometricHelper.kt` using AndroidX BiometricPrompt. Allow returning users to login with fingerprint instead of password. |
| 2 | **➕ New Feature** | **Google Sign-In** | Add "Continue with Google" button using Credential Manager API. |
| 3 | **➕ New Feature** | **Phone OTP login** | Add "Continue with Phone" — enter phone number, receive OTP via SMS, auto-read OTP. |
| 4 | **➕ New Feature** | **"Remember me" toggle** | Add a checkbox on login to control session persistence (short vs long-lived token). |
| 5 | **🔧 Improvement** | **Password strength indicator** | On SignUp screen, show a progress bar + text ("Weak", "Medium", "Strong") as user types password. |
| 6 | **🔧 Improvement** | **Social login button styling** | Current buttons use hardcoded colors (`Color(0xFF2563EB)`). Use theme colors. |
| 7 | **🔧 Refinement** | **ResetPassword flow end-to-end test** | Verify that ResetPasswordScreen properly reads the token from deep link and calls the API. |
| 8 | **🔧 Refinement** | **Keyboard handling** | Ensure keyboard doesn't overlap input fields. Use `imePadding()` and `WindowInsets`. |

---

## 9. ProfileScreen

**File:** `ProfileScreen.kt`, `ProfileSubScreens.kt`

### Analysis

| # | Type | Point | Description |
|---|------|-------|-------------|
| 1 | **➕ New Feature** | **Edit profile photo + cover photo** | Add camera/gallery picker for avatar and cover image. Upload to server. |
| 2 | **➕ New Feature** | **Seller storefront** | Create a mini storefront page visible to other users: "View @username's Store" showing all their active listings + stats. |
| 3 | **➕ New Feature** | **Profile completeness score** | Show a "80% complete" bar with suggestions: "Add your phone number", "Upload profile picture", "Complete KYC". |
| 4 | **🔧 Improvement** | **Fix compilation errors** | ProfileScreen.kt has pre-existing errors from the branch. Fix them first. |
| 5 | **🔧 Improvement** | **Wire real Marketplace Pulse stats** | Replace mock "0 listings", "— rating" with real API data from `AnalyticsRepository`. |
| 6 | **🔧 Improvement** | **Verification badge sync with KYC** | The "Unverified" / "Verify now" badge should reflect real KYC status from API. |
| 7 | **🔧 Improvement** | **Quick actions fully wired** | Each quick action button ("Edit profile", "My listings", "KYC", "Settings") should navigate to the correct screen. |
| 8 | **🔧 Refinement** | **Fix "Browse Products" button** | The bottom button should navigate to AllPosts/Explore, not just dismiss. |

---

## 10. AccountScreens

**File:** `AccountScreens.kt`

### Analysis

| # | Type | Point | Description |
|---|------|-------|-------------|
| 1 | **➕ New Feature** | **Active sessions management** | In Security screen, show list of active devices/sessions with "Logout" button for each. |
| 2 | **➕ New Feature** | **Download my data** | Wire the data export API properly. Current implementation just shows a toast. |
| 3 | **🔧 Improvement** | **Delete Account — real API call** | Ensure Delete Account button actually calls the API and invalidates all tokens. |
| 4 | **🔧 Improvement** | **Dashboard with real stats** | Replace mock data with real analytics from `AnalyticsRepository`: listing views, conversion rate, total earnings. |
| 5 | **🔧 Improvement** | **Split into individual files** | Extract SecurityScreen, DeleteAccountScreen, DashboardScreen into separate files. |
| 6 | **🔧 Refinement** | **Add confirmation dialogs** | All destructive actions (delete account, logout all sessions) should have confirmation dialogs with text input of the word "DELETE". |
| 7 | **🔧 Refinement** | **Accessibility** | Add proper `contentDescription` semantics for all interactive elements. |

---

## 11. SettingsScreen

**File:** `SettingsScreen.kt`, `SettingsViewModel.kt`

### Analysis

| # | Type | Point | Description |
|---|------|-------|-------------|
| 1 | **➕ New Feature** | **Dark mode schedule** | Add option to auto-switch theme at sunset/sunrise or set custom schedule (e.g., Dark from 8PM to 7AM). |
| 2 | **➕ New Feature** | **Font size / display density** | Add a slider for font size scaling (Small / Normal / Large / Extra Large). |
| 3 | **➕ New Feature** | **Notification quiet hours** | Add "Do Not Disturb" schedule — no push notifications during set hours. |
| 4 | **🔧 Improvement** | **Graceful language switch without `recreate()`** | Instead of calling `recreate()` on language change, use `AppCompatDelegate.setApplicationLocales()` which handles recomposition more gracefully. |
| 5 | **🔧 Improvement** | **Persist notification preferences to server** | Toggle states (push, email, chat alerts) should sync to server via `NotificationPrefsRepository`. |
| 6 | **🔧 Improvement** | **Show cache size before clearing** | Calculate and display "Current cache: 45 MB" before the clear button. |
| 7 | **🔧 Refinement** | **Hide network section behind developer mode** | API URL editing is a power-user feature. Hide it behind a 5-tap gesture on "About" section. |
| 8 | **🔧 Refinement** | **Data export — real trigger** | Replace the toast-only "Request Data Export" with a real API call that generates and emails the export. |

---

## 12. MoreScreen

**File:** `MoreScreen.kt`

### Analysis

| # | Type | Point | Description |
|---|------|-------|-------------|
| 1 | **➕ New Feature** | **Search/filter in More menu** | With 40+ menu items, add a search bar at the top that filters menu items by name as user types. |
| 2 | **➕ New Feature** | **Favorites/bookmarks in More** | Allow users to "star" their most-used menu items, which appear at the top in a "Favorites" section. |
| 3 | **🔧 Improvement** | **Replace 40-lambda pattern with sealed routes** | Define `sealed class MoreRoute { object Sell : MoreRoute(); data class Item(val route: String) : MoreRoute() }` — pass a single `onNavigate: (MoreRoute) -> Unit`. |
| 4 | **🔧 Improvement** | **Remove duplicate appearance/language picker** | The theme + language selector in More duplicates Settings. Keep only in Settings. Show a "Appearance & Language → Settings" link instead. |
| 5 | **🔧 Improvement** | **Admin badge — check access before showing** | Pre-fetch admin status in ViewModel. Only show "Admin" badge if user has admin role. |
| 6 | **🔧 Improvement** | **Add "What's New" badge** | Highlight newly added menu items with a blue dot or "NEW" badge. |
| 7 | **🔧 Refinement** | **Menu ordering** | Let users reorder sections or make order configurable. |
| 8 | **🔧 Refinement** | **Add scroll-to-section index** | Add a fast-scroller with section letters (T, S, A, U for Trade, Social, Account, Utilities). |

---

## 13. WishlistScreen

**File:** `WishlistScreen.kt`, `WishlistViewModel.kt`

### Analysis

| # | Type | Point | Description |
|---|------|-------|-------------|
| 1 | **➕ New Feature** | **Price drop notifications** | Wire the `priceDrop` badge logic. When `PriceAlertsRepository` detects a price drop, show the % badge on the card. |
| 2 | **➕ New Feature** | **Wishlist collections/folders** | Allow users to create named collections (e.g., "Gifts", "Home Office", "Birthday Wishlist") and save items to specific folders. |
| 3 | **➕ New Feature** | **Share wishlist** | Add "Share Wishlist" button that generates a shareable link to the user's public wishlist page. |
| 4 | **🔧 Improvement** | **Fix grid mode — use `LazyVerticalGrid`** | Replace `Column + chunked(2)` hacks with proper `LazyVerticalGrid` for performance. |
| 5 | **🔧 Improvement** | **Add to cart from wishlist — progress indicator** | Show a `LinearProgressIndicator` during bulk add-to-cart operations. Disable button during operation. |
| 6 | **🔧 Improvement** | **Move "Date added" to real timestamp** | Currently uses mock days-ago based on hash. Use real `wishlistedAt` timestamp from API. |
| 7 | **🔧 Refinement** | **Persist grid/list toggle preference** | Save the user's preferred view mode (grid vs list) to DataStore. |
| 8 | **🔧 Refinement** | **Animations** | Add `AnimatedVisibility` for item removal and `animateItemPlacement()` for list reordering. |

---

## 14. NotificationsScreen

**File:** `NotificationsScreen.kt`, `NotificationsViewModel.kt`

### Analysis

| # | Type | Point | Description |
|---|------|-------|-------------|
| 1 | **➕ New Feature** | **In-app notification bell with unread count** | Show a badge on the bottom nav notification icon with live unread count (via WebSocket or periodic polling). |
| 2 | **➕ New Feature** | **Notification grouping by type** | Below the category filter chips, add collapsible groups: "Offers (3)", "Messages (5)", "System (1)" with expand/collapse. |
| 3 | **➕ New Feature** | **Mark as read on scroll** | As user scrolls past unread notifications, auto-mark them as read. |
| 4 | **🔧 Improvement** | **Undo snackbar for dismiss** | When user swipes to dismiss, show a Snackbar with "Undo" button for 3 seconds. |
| 5 | **🔧 Improvement** | **Persist notification settings** | Save the bottom sheet toggle states to server via `NotificationPrefsRepository`. |
| 6 | **🔧 Improvement** | **Snooze options** | Replace hardcoded 1-hour snooze with choices: "Snooze 1h", "Snooze 4h", "Snooze until tomorrow". |
| 7 | **🔧 Refinement** | **Replace `notifStyle().contains()` with typed enum** | String matching on notification type is brittle. Use `NotifType` sealed class. |
| 8 | **🔧 Refinement** | **Better time display** | Show "2:30 PM" for today items instead of "2h ago". Show "Yesterday" for yesterday. |

---

## 15. RewardsScreen

**File:** `RewardsScreen.kt` (1500+ lines), `RewardsViewModel.kt`

### Analysis

| # | Type | Point | Description |
|---|------|-------|-------------|
| 1 | **➕ New Feature** | **Connected games — real backend** | Spin wheel and scratch card should call real game API endpoints, receive results, and credit coins to the user account. |
| 2 | **➕ New Feature** | **Referral leaderboard — multiple categories** | Show "Most Referrals", "Most Coins Earned", "Highest Level" — segmented leaderboard. |
| 3 | **➕ New Feature** | **Daily goals / streak milestones** | Show "7-day streak bonus: +50 coins at day 7", "Complete all 7 daily actions → +100 bonus". |
| 4 | **🔧 Improvement** | **Split into multiple files** | Extract: `RewardsScreen.kt`, `RewardsViewModel.kt`, `RewardsComponents.kt`, `RewardsGameViews.kt`, `RewardsHelpers.kt`. |
| 5 | **🔧 Improvement** | **Wire redeem store to real inventory API** | Replace hardcoded store items ("Listing Boost", "$5 Gift Card") with real API-fetched inventory. |
| 6 | **🔧 Improvement** | **Fix daily secret code — verify server-side** | The `if (codeInput == dailySecretCode)` should be a server API call, not client-side comparison. |
| 7 | **🔧 Improvement** | **Apply coin discount at checkout** | The `coinsApplied` field in TiersViewModel should actually deduct coins from total during payment. |
| 8 | **🔧 Refinement** | **Invoke ConfettiAnimation** | The `ConfettiAnimation()` composable exists but is never called. Invoke it on milestone claim or daily reward. |
| 9 | **🔧 Refinement** | **Fix ScrollableTabRow + LazyColumn nesting** | Place tabs and content inside a single scrollable Column to avoid scroll conflicts. |

---

## 16. CommerceScreens

**File:** `CommerceScreens.kt` (300K+ chars — 7+ screens)

### Analysis

| # | Type | Point | Description |
|---|------|-------|-------------|
| 1 | **🔧 Refinement** | **Split into individual files** | **Critical.** Split into: `TierSelectionScreen.kt`, `EditPostScreen.kt`, `CartScreen.kt`, `BoughtScreen.kt`, `SoldScreen.kt`, `PostWelcomeScreen.kt`, `CommerceViewModel.kt`. Target: no file > 500 lines. |
| 2 | **➕ New Feature** | **Bulk listing management** | In MyPosts, add "Edit selected", "Bulk extend expiry", "Bulk boost" for power sellers. |
| 3 | **➕ New Feature** | **Listing analytics per post** | Show "Views over time" sparkline, "Inquiries", "Offer amounts" within the post card in MyPosts. |
| 4 | **➕ New Feature** | **Auto-relist after expiry** | Add an "Auto-relist" toggle that automatically renews listings when they expire. |
| 5 | **🔧 Improvement** | **Wire real payment in TierSelection** | When user taps "Subscribe", open a payment sheet (Razorpay/Stripe) instead of just calling API. |
| 6 | **🔧 Improvement** | **EditPostScreen image upload — resumable + compressed** | Compress images before upload. Add pause/resume for large uploads. |
| 7 | **🔧 Improvement** | **MyPosts — remove 45-second auto-refresh** | Replace with pull-to-refresh only. Battery-draining timer is unnecessary. |
| 8 | **🔧 Improvement** | **Cart screen — unified ViewModel** | Share `CartViewModel` across all cart references (CategoryAppShell, BottomNav, etc.). |
| 9 | **🔧 Refinement** | **Fix validation messages** | Field validation error messages should use `stringResource` for i18n. |

---

## 17. CheckoutScreens

**File:** `CheckoutScreens.kt`

### Analysis

| # | Type | Point | Description |
|---|------|-------|-------------|
| 1 | **➕ New Feature** | **Real payment gateway integration** | Integrate Razorpay (best for India) or Stripe: generate order on backend, collect payment via SDK, handle webhook. |
| 2 | **➕ New Feature** | **Saved addresses** | Add address CRUD. Users can save multiple addresses and select from a list during checkout. |
| 3 | **➕ New Feature** | **Order tracking timeline** | After order is placed, show a timeline: "Order Placed → Payment Confirmed → Packed → Shipped → Out for Delivery → Delivered". |
| 4 | **🔧 Improvement** | **Address validation — extract to utility** | The manual validation code in `CheckoutAddressScreen` should be in `InputValidators.kt` for reuse. |
| 5 | **🔧 Improvement** | **Cart subtotal from real cart** | Current `cartSubtotal` parameter is 0.0 by default. Pass real cart total from `CartViewModel`. |
| 6 | **🔧 Improvement** | **GST calculation based on user pincode** | GST rate (18%) is hardcoded. Fetch actual GST from API based on seller/buyer location. |
| 7 | **🔧 Refinement** | **Payment screen — validation on card fields** | Add Luhn check for card number, expiry date validation, CVV length check. |
| 8 | **🔧 Refinement** | **Order confirmation screen — deep link** | Generated order ID should be a deep linkable URL for customer support. |

---

## 18. CreatePostScreen

**File:** `CreatePostScreen.kt`, `CreatePostViewModel.kt`

### Analysis

| # | Type | Point | Description |
|---|------|-------|-------------|
| 1 | **➕ New Feature** | **AI-assisted title/description generation** | Add a "✨ Auto-fill" button that uses an LLM API to generate title and description from the uploaded images. |
| 2 | **➕ New Feature** | **Price suggestion from similar listings** | After user selects category, show "Suggested price range: ₹8,000 – ₹12,000 based on similar items" with source count. |
| 3 | **➕ New Feature** | **Draft list management** | Show a "My Drafts" card at top of CreatePostScreen if there are saved drafts. Tap to resume editing. |
| 4 | **🔧 Improvement** | **Image compression before upload** | Compress images to <1MB before upload. Show compression status. |
| 5 | **🔧 Improvement** | **Category-specific dynamic fields** | Electronics shows RAM/Storage fields, Vehicles shows Mileage/Year. These fields currently exist but don't submit to API. Wire them. |
| 6 | **🔧 Improvement** | **Audio recording — real recording** | The audio recorder creates a temp file but doesn't actually record from microphone. Wire `MediaRecorder`. |
| 7 | **🔧 Refinement** | **Draft auto-save timer** | Current 10-second timer is aggressive. Increase to 30 seconds or save on significant changes. |
| 8 | **🔧 Refinement** | **Duplicate detection — use real API** | Current detection is client-side (`title.contains("duplicate")`). Use real API endpoint for duplicate detection. |

---

## 19. SearchScreen

**File:** `SearchScreen.kt`, `SearchViewModel.kt`

### Analysis

| # | Type | Point | Description |
|---|------|-------|-------------|
| 1 | **➕ New Feature** | **Search suggestions with autocomplete** | As user types, show dropdown with suggestions from: recent searches, popular searches, brand names, category names. Already partially implemented — improve by making more responsive. |
| 2 | **➕ New Feature** | **Image search** | Add a camera icon in the search bar that lets users take/upload a photo and search visually (Google Vision API / custom model). |
| 3 | **➕ New Feature** | **Filter by location — radius selector** | Add a "Nearby" toggle that geo-filters results to user's current location with radius slider. |
| 4 | **🔧 Improvement** | **Voice search — better error handling** | Currently wrapped in try-catch that silently fails. Show a "Microphone not available" toast. |
| 5 | **🔧 Improvement** | **Persistent filters across app restarts** | Save last applied filters (minPrice, maxPrice, condition, sort) to DataStore. Restore on re-open. |
| 6 | **🔧 Improvement** | **Saved searches — run from search screen** | Tapping a saved search should auto-populate the search bar AND trigger the search, not just fill the query. |
| 7 | **🔧 Refinement** | **Fixed: MOCK_SEARCH_RESULTS** | The mock results list is defined inside the ViewModel file. Move to MockDataProvider. |
| 8 | **🔧 Refinement** | **Search result card styling** | `SearchResultCard` uses `PostCard` which is designed for feed display. Create a dedicated compact search result card with less whitespace. |

---

## 20. KycScreen

**File:** `KycScreen.kt`

### Analysis

| # | Type | Point | Description |
|---|------|-------|-------------|
| 1 | **➕ New Feature** | **Document auto-detection** | Use ML Kit Document Scanner to auto-detect document type from image (Aadhaar, PAN, Passport). |
| 2 | **➕ New Feature** | **Live photo capture for selfie** | Instead of pick from gallery, use CameraX for live selfie capture with liveness detection. |
| 3 | **➕ New Feature** | **KYC status timeline** | Show a timeline view: "Submitted → Under Review (32h remaining) → Approved/Rejected" after submission. |
| 4 | **🔧 Improvement** | **Stream upload — don't read all bytes** | Current code reads full image bytes into memory (`readBytes()`). Stream the upload using `ContentResolver.openFileDescriptor`. |
| 5 | **🔧 Improvement** | **Image compression before upload** | Downscale images to 1080px max dimension before upload to reduce data usage. |
| 6 | **🔧 Improvement** | **Extract KycViewModel to its own file** | If it's inline in KycScreen.kt, extract it. |
| 7 | **🔧 Refinement** | **Fix step indicator label** | "Document" and "Upload" could be merged — 4 steps is misleading for 3 real steps. |
| 8 | **🔧 Refinement** | **Add retry for failed uploads** | If image upload fails, show "Retry" button per image, not a blanket error. |

---

## 21. ScannerScreen

**File:** `ScannerScreen.kt`

### Analysis

| # | Type | Point | Description |
|---|------|-------|-------------|
| 1 | **➕ New Feature** | **Scan to search products** | When user scans a barcode (EAN-13 / UPC), automatically search the app for matching products. |
| 2 | **➕ New Feature** | **Scan history** | Keep a record of the last 20 scans with date/time and type. Accessible from the scanner screen. |
| 3 | **➕ New Feature** | **Batch scanning mode** | Allow continuous scanning (scan multiple items without tapping "Scan Again" each time). Results accumulate in a list. |
| 4 | **🔧 Improvement** | **Wifi QR — connect automatically** | For Wi-Fi QR codes, show a "Connect to Network" button that uses `WifiManager` to automatically connect. |
| 5 | **🔧 Improvement** | **Flash toggle persistence** | Remember flash state across app sessions. |
| 6 | **🔧 Improvement** | **Improve QR code scanning distance** | The ML Kit barcode scanner can read from further away. Adjust resolution/analysis parameters for longer range. |
| 7 | **🔧 Refinement** | **Result card — add haptic feedback** | Vibrate briefly when a barcode is successfully scanned. |
| 8 | **🔧 Refinement** | **Permission denied screen — settings deep link** | Add a "Open Settings" button that deep-links to app permission settings. |

---

## 22. LocationSelectionScreen

**File:** `LocationSelectionScreen.kt`, `LocationViewModel.kt`

### Analysis

| # | Type | Point | Description |
|---|------|-------|-------------|
| 1 | **➕ New Feature** | **Map picker** | Show a Google Map / OpenStreetMap where user can drop a pin to select exact location. |
| 2 | **➕ New Feature** | **Saved locations** | Allow users to save multiple addresses (Home, Work, Other) for quick selection. |
| 3 | **➕ New Feature** | **Auto-detect city from IP** | As fallback when GPS is off, use IP geolocation API to suggest the user's city. |
| 4 | **🔧 Improvement** | **Nominatim API rate limiting** | The OSM Nominatim API has strict rate limits (1 req/sec). Add client-side rate limiting or caching. |
| 5 | **🔧 Improvement** | **Debounce search** | 350ms debounce already implemented. Good. But also add minimum 3-char wait before searching. |
| 6 | **🔧 Improvement** | **Show "Detecting..." animation** | While GPS is detecting location, show a more engaging animation (pulsing dot or shimmer). |
| 7 | **🔧 Refinement** | **Location error handling** | If GPS returns null or times out, show a meaningful message instead of silently showing no results. |
| 8 | **🔧 Refinement** | **Popular cities should be sorted by user's state** | If user is in Karnataka, show Bengaluru first in popular cities. |

---

## 23. NearbyScreen

**File:** `NearbyScreen.kt`, `NearbyViewModel.kt`

### Analysis

| # | Type | Point | Description |
|---|------|-------|-------------|
| 1 | **➕ New Feature** | **Listings clustering on map** | When many posts are in the same area, cluster markers with count badges (e.g., "3"). |
| 2 | **➕ New Feature** | **Category filter on nearby** | Add category chips to filter nearby listings by category (Electronics, Fashion, etc.). |
| 3 | **➕ New Feature** | **Navigational directions** | Add a "Get Directions" button on each NearbyPostCard that opens Google Maps with turn-by-turn navigation to the seller's location. |
| 4 | **🔧 Improvement** | **Google Maps — handle missing API key** | If Google Maps API key is not configured, fall back to OpenStreetMap via WebView (like the original placeholder). |
| 5 | **🔧 Improvement** | **Proper pagination** | The `LaunchedEffect(Unit)` for pagination is triggered but never loads more. Wire cursor-based `loadMore()`. |
| 6 | **🔧 Improvement** | **Distance display accuracy** | Mock posts show `"2.3 km away"` as a hardcoded string. Compute real distance via haversine between user and post. |
| 7 | **🔧 Refinement** | **Map radius visualization** | The circle overlay is good. Add a concentric ripple animation to make it more visually engaging. |
| 8 | **🔧 Refinement** | **Map markers — custom icons** | Use custom marker icons (MHub pin) instead of default Google Maps red pin. |

---

## 24. SubcategoriesScreen

**File:** `SubcategoriesScreen.kt`

### Analysis

| # | Type | Point | Description |
|---|------|-------|-------------|
| 1 | **➕ New Feature** | **Subcategory icon grid — show live counts** | Each subcategory card already shows `"${cat.productCount} items"`. Add color coding: green for high stock, yellow for medium, gray for low. |
| 2 | **➕ New Feature** | **View mode toggle** | Add grid/list toggle. Grid shows image + name + count. List shows compact rows for dense browsing. |
| 3 | **➕ New Feature** | **Recently viewed categories** | Show a row of "Recently browsed" categories at the top for quick return. |
| 4 | **🔧 Improvement** | **Image loading — placeholder + error** | `AsyncImage` for category icons should show a shimmer placeholder while loading and a fallback icon on error. |
| 5 | **🔧 Improvement** | **Search within subcategories** | The OutlinedTextField search filters client-side. Add server-side search for large category sets. |
| 6 | **🔧 Improvement** | **Category group chips — horizontal scroll** | The group filter chips (All, Electronics, etc.) should be horizontally scrollable if there are many groups. |
| 7 | **🔧 Refinement** | **Fix hardcoded strings** | `"Subcategories"`, `"Sort by"`, `"Popular"`, `"A-Z"`, `"results"` should use `stringResource`. |
| 8 | **🔧 Refinement** | **Add "View All" on group chips** | If a group has many subcategories, add a "View All →" tile at the end. |

---

## 25. ActivityHubScreen

**File:** `ActivityHubScreen.kt`

### Analysis

| # | Type | Point | Description |
|---|------|-------|-------------|
| 1 | **➕ New Feature** | **Live activity feed** | Show a live feed of recent activities: "You viewed iPhone 15", "Rahul messaged you", "Your listing was boosted". |
| 2 | **➕ New Feature** | **Unread indicators** | Show red badges on activity cards that have unread items (e.g., Messages has 3 unread). |
| 3 | **➕ New Feature** | **Quick preview on long press** | Allow long-press on an activity card to show a preview/summary before navigating. |
| 4 | **🔧 Improvement** | **Wire navigation properly** | `onNavigate` receives a key string. Map keys to actual routes in the NavController. |
| 5 | **🔧 Improvement** | **Dynamic activity items** | The 8 activity items are hardcoded. Fetch from API so admin can add/remove items. |
| 6 | **🔧 Improvement** | **Add "Empty state" for unauthenticated** | If user is not logged in, show "Sign in to view your activity" with a login button. |
| 7 | **🔧 Refinement** | **Card styling consistency** | The `FilledTonalButton` "Open" button layout should be consistent with other screens. |
| 8 | **🔧 Refinement** | **Accessibility** | Add semantics for each ActivityCard (role, contentDescription). |

---

## 26. NotificationsPrefsScreen

**File:** `NotificationPrefsScreen.kt`

### Analysis

| # | Type | Point | Description |
|---|------|-------|-------------|
| 1 | **➕ New Feature** | **Global push toggle** | Add a master toggle at the top: "Pause all notifications". When off, all below toggles are disabled. |
| 2 | **➕ New Feature** | **Notification schedule** | Add "Quiet hours" — set start/end time during which notifications are muted. |
| 3 | **➕ New Feature** | **Per-category notification tones** | Allow different sound/vibration patterns for different notification categories. |
| 4 | **🔧 Improvement** | **Optimistic UI toggle** | Currently toggles call `save()` which makes API call. Add optimistic update: toggle immediately, sync in background. |
| 5 | **🔧 Improvement** | **Saved indicator — auto-dismiss** | The "✓ Preferences saved" success message should auto-dismiss after 3 seconds. |
| 6 | **🔧 Refinement** | **Add loading skeleton** | Show shimmer placeholders while preferences are loading from API. |
| 7 | **🔧 Refinement** | **Error handling** | If save API fails, revert the toggle and show error toast. |
| 8 | **🔧 Refinement** | **Dark mode icons** | Icons should use `MaterialTheme.colorScheme.primary` tint so they're visible in both themes. |

---

## 27. DailyCodeAndReferralScreens

**Files:** `DailyCodeAndReferralScreens.kt`

### Analysis

| # | Type | Point | Description |
|---|------|-------|-------------|
| 1 | **➕ New Feature** | **Daily code countdown timer** | Show a live countdown timer (`HH:MM:SS`) until the daily code expires. |
| 2 | **➕ New Feature** | **Referral tree visualization** | Replace the flat list with a visual tree diagram showing referrals at depth 1, 2, 3 with connecting lines. |
| 3 | **➕ New Feature** | **Share referral code as QR** | Generate a QR code image for the referral link, allowing offline sharing. |
| 4 | **🔧 Improvement** | **Daily code — claim via API** | Add a "Claim Code" button that sends the code to the server and credits the user. |
| 5 | **🔧 Improvement** | **Referral tree — earnings breakdown** | Show total earnings from each level (L1: ₹500, L2: ₹250, L3: ₹100). |
| 6 | **🔧 Improvement** | **Loading states** | Both screens show `CircularProgressIndicator` for loading. Replace with skeleton shimmer. |
| 7 | **🔧 Refinement** | **Fix hardcoded strings** | `"Daily Code"`, `"Today's Code"`, `"Total Referrals"` should use `stringResource`. |
| 8 | **🔧 Refinement** | **Copy code — show toast** | When user copies code, show a "Copied!" Snackbar with "Share" action button. |

---

## 28. RecentlyViewedFullScreen

**File:** `RecentlyViewedFullScreen.kt`

### Analysis

| # | Type | Point | Description |
|---|------|-------|-------------|
| 1 | **➕ New Feature** | **Clear history functionality** | The clear dialog says "history cannot be cleared from the app". Add a "Clear All" button that calls the API. |
| 2 | **➕ New Feature** | **Search/filter within recently viewed** | Add a search bar to filter by title or category. |
| 3 | **➕ New Feature** | **Sort by date/price** | Add sort options: "Most Recent", "Highest Price", "Lowest Price". |
| 4 | **🔧 Improvement** | **Show "Viewed X hours ago"** | Instead of static "Viewed recently", show relative time: "Viewed 2h ago", "Viewed yesterday". |
| 5 | **🔧 Improvement** | **Grid/list view toggle** | Add toggle similar to WishlistScreen. |
| 6 | **🔧 Improvement** | **Add pagination** | Load more items as user scrolls down. |
| 7 | **🔧 Refinement** | **Empty state — better messaging** | "Nothing viewed yet" could be more engaging: "Start exploring to see your recently viewed items here." |
| 8 | **🔧 Refinement** | **Image aspect ratio** | Currently fixed `72.dp` size. Use `aspectRatio(1f)` for square thumbnails. |

---

## 29. Legal/Static Pages

**Files:** `LegalScreens.kt`, `StaticPages.kt`

### Analysis

| # | Type | Point | Description |
|---|------|-------|-------------|
| 1 | **➕ New Feature** | **CMS-powered FAQ** | Replace hardcoded FAQ items with CMS API. Allow admin to add/edit Q&A without app update. |
| 2 | **➕ New Feature** | **Version history / changelog** | Add a "What's New" section showing recent app update highlights. |
| 3 | **➕ New Feature** | **Contact Us — file attachment** | Allow users to attach screenshots when submitting a support request. |
| 4 | **🔧 Improvement** | **Wire Contact Us form to real API** | The form currently sets `submitted = true` locally without sending. Email the message to support. |
| 5 | **🔧 Improvement** | **AdminPanel — bulk actions with confirmation** | Already has confirm dialogs for ban/remove. Add them for approve actions too. |
| 6 | **🔧 Improvement** | **AdminPanel — pagination for large datasets** | Loading all flagged users/posts at once will be slow. Add server-side pagination. |
| 7 | **🔧 Refinement** | **Terms/Privacy — loading state** | Show a shimmer while CMS content loads. Currently shows `CircularProgressIndicator`. |
| 8 | **🔧 Refinement** | **InviteScreen — design polish** | The valid invite screen could use celebratory animation (confetti) on successful validation. |

---

## 30. Shared Components

**Files:** `PostCardComponents.kt`, `SharedPostComponents.kt`, `MhubTopBar.kt`, `Buttons.kt`, `CommerceComponents.kt`, `ScreenChrome.kt`, `CompareItemHolder.kt`

### Analysis

| # | Type | Point | Description |
|---|------|-------|-------------|
| 1 | **➕ New Feature** | **Swipeable PostCard actions** | Add swipe-left on PostCard to reveal quick actions: "Wishlist", "Share", "Not interested". |
| 2 | **➕ New Feature** | **Lazy load images with priority** | Prioritize loading images that are closer to the viewport in LazyColumn/LazyVerticalGrid. |
| 3 | **🔧 Improvement** | **Consolidate duplicate components** | `TagChip`, `ConditionChip`, `StatusChip` exist in both `PostCardComponents.kt` and `SharedPostComponents.kt`. Merge into one. |
| 4 | **🔧 Improvement** | **Replace `CompareItemHolder` object with ViewModel** | The global mutable singleton will lose data on process death. Move to ViewModel + SavedStateHandle. |
| 5 | **🔧 Improvement** | **Remove `MhubTopBar.kt` if unused** | If no screen uses `MhubTopBar`, delete it. If some do, adopt it across all screens. |
| 6 | **🔧 Improvement** | **Enforce Button.kt components** | Audit all screens. Replace ad-hoc `Button(...)` with `PrimaryButton(...)` from Buttons.kt for consistency. |
| 7 | **🔧 Refinement** | **Add `TranslatedText` to all chip labels** | `TagChip` condition labels (New, Used, etc.) should use `TranslatedText` for language support. |
| 8 | **🔧 Refinement** | **Standardize card elevation** | Some cards use `2.dp`, some `4.dp`, some `8.dp`. Standardize: cards = 2.dp, elevated = 4.dp, modal = 8.dp. |

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| **Total analysis points** | **240** |
| ➕ New features to add | ~72 |
| 🔧 Improvements to make | ~96 |
| 🔧 Refinements/fixes | ~72 |
| **Screens analyzed** | **30** |
| Average points per screen | **8** |

---

*End of analysis document.*

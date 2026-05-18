# MHub Android — Complete Platform Audit Report

**Date:** May 18, 2026  
**Scope:** Full-stack audit covering architecture, navigation, auth, localization, API, lifecycle, UI/UX  
**Reference:** Web app at `http://localhost:8081/`

---

## EXECUTIVE SUMMARY

| Category | Health | Critical Issues |
|----------|--------|-----------------|
| **Authentication** | 🔴 Critical | Token refresh deadlock risk, concurrent 401 drops, race conditions |
| **Navigation** | 🟡 Stable | 80+ routes functional, but lifecycle edge cases on state restore |
| **Localization** | 🟢 Strong | 99.9% coverage (13 locales), reactive architecture, 2 missing keys |
| **API Layer** | 🟡 Mixed | Most endpoints wired, but mock data leaks in category mini-app |
| **Data Caching** | 🟡 Partial | Room scaffolded but unused for cart/wishlist/recently-viewed |
| **UI/UX** | 🟢 Good | 60+ screens production-grade, consistent Material3 theming |
| **Lifecycle** | 🟡 Medium | Compose state restoration works, but service scope leaks |
| **Web Parity** | 🟡 85% | Missing: inquiries, contacts sync, price history, client analytics |

---

## PHASE 1 — PLATFORM INVENTORY

### Complete Screen Inventory (60+ composables)

| # | Screen | File | Lines | Data Source |
|---|--------|------|-------|-------------|
| 1 | PostWelcome | CommerceScreens.kt | 3164 | Real API |
| 2 | EditPost | CommerceScreens.kt | — | Real API |
| 3 | TierSelection | CommerceScreens.kt | — | Real API |
| 4 | MyPosts | CommerceScreens.kt | — | Real API |
| 5 | SoldPosts | CommerceScreens.kt | — | Real API |
| 6 | BoughtPosts | CommerceScreens.kt | — | Real API |
| 7 | Offers | CommerceScreens.kt | — | Real API |
| 8 | Cart | CommerceScreens.kt | — | Real API |
| 9 | RecentlyViewed | CommerceScreens.kt | — | Real API |
| 10 | SavedSearches | CommerceScreens.kt | — | Real API |
| 11 | Compare | CommerceScreens.kt | — | Real API |
| 12 | BuyerView | CommerceScreens.kt | — | Real API |
| 13 | SaleDone | CommerceScreens.kt | — | Real API |
| 14 | SaleUndone | CommerceScreens.kt | — | Real API |
| 15 | Payment | CommerceScreens.kt | — | Real API |
| 16 | Profile | ProfileScreen.kt | 2186 | Real API |
| 17 | HomeScreen (feed) | HomeScreen.kt | 1880 | Real API + Room cache |
| 18 | MhubApp (nav host) | MhubApp.kt | 1491 | — |
| 19 | Social screens (7) | SocialScreens.kt | 1084 | Real API |
| 20 | PostDetail | PostDetailScreen.kt | 1079 | Real API |
| 21 | Chat | ChatScreen.kt | 1020 | Real API + WebSocket |
| 22 | Rewards | RewardsScreen.kt | 988 | Real API |
| 23 | Account screens (5) | AccountScreens.kt | 922 | Real API |
| 24 | Notifications | NotificationsScreen.kt | 844 | Real API |
| 25 | Search | SearchScreen.kt | 835 | Real API |
| 26 | Explore (AllPosts) | ExploreScreen.kt | 770 | Real API |
| 27 | Feed | FeedScreen.kt | 769 | Real API |
| 28 | ForYou | ForYouScreen.kt | 760 | Real API (buggy pagination) |
| 29 | MockProductDetail | MockProductDetailScreen.kt | 739 | ❌ MOCK ONLY |
| 30 | Legal (7 screens) | LegalScreens.kt | 730 | Real API (CMS) |
| 31 | Channels/Centres | ChannelScreens.kt | 714 | Real API |
| 32 | Wishlist | WishlistScreen.kt | 712 | Real API |
| 33 | CreatePost | CreatePostScreen.kt | 644 | Real API |
| 34 | CategoryDetail | CategoryDetailScreen.kt | 622 | Real API |
| 35 | Login | LoginScreen.kt | 611 | Real API |
| 36 | More Drawer | MoreScreen.kt | 609 | — |
| 37 | Scanner | ScannerScreen.kt | 607 | Camera + API |
| 38 | Checkout (5 screens) | CheckoutScreens.kt | 593 | Real API |
| 39 | AadhaarVerify | AadhaarVerifyScreen.kt | 576 | Real API |
| 40 | Settings | SettingsScreen.kt | 574 | Local prefs |
| 41 | ProductListing | ProductListingScreen.kt | 571 | ⚠️ Hybrid (API + mock fallback) |
| 42 | ProfileSubScreens (4) | ProfileSubScreens.kt | 469 | Real API |
| 43 | CategoryAppShell | CategoryAppShell.kt | 440 | ⚠️ Hybrid |
| 44 | MyPosts | MyPostsScreen.kt | 404 | Real API |
| 45 | Nearby | NearbyScreen.kt | 403 | Real API (no pagination) |
| 46 | ForgotPassword | ForgotPasswordScreen.kt | 390 | Real API |
| 47 | CategoryHub | CategoryHubScreen.kt | 382 | Real API |
| 48 | CategoryMode | CategoryModeScreen.kt | 358 | Local |
| 49 | Static Pages (4) | StaticPages.kt | 336 | Real API (CMS) |
| 50 | RecentlyViewedFull | RecentlyViewedFullScreen.kt | 336 | ❌ MOCK ONLY |
| 51 | KYC | KycScreen.kt | 335 | Real API |
| 52 | Signup | SignUpScreen.kt | 290 | Real API |
| 53 | CategoryHome | CategoryHomeScreen.kt | 276 | ⚠️ Hybrid |
| 54 | ResetPassword | ResetPasswordScreen.kt | 269 | Real API |
| 55 | DailyCode/ReferralTree | DailyCodeAndReferralScreens.kt | 237 | Real API |
| 56 | ActivityHub | ActivityHubScreen.kt | 219 | Real API |
| 57 | Subcategories (browse) | SubcategoriesScreen.kt | 215 | ❌ MOCK ONLY |
| 58 | NotificationPrefs | NotificationPrefsScreen.kt | 159 | Real API |
| 59 | SubcategoryDetail | SubcategoryScreen.kt | 163 | ❌ MOCK ONLY |

---

### Route System (80+ routes)

**Auth Graph:** LOGIN, SIGNUP, FORGOT_PASSWORD, RESET_PASSWORD  
**Main Graph (Bottom Nav):** HOME, ALL_POSTS, FOR_YOU, FEED, REWARDS, PROFILE, MORE, NOTIFICATIONS, WISHLIST, DASHBOARD  
**Commerce:** POST_WELCOME, EDIT_POST, TIER_SELECTION, MY_POSTS, BOUGHT_POSTS, SOLD_POSTS, BUYER_VIEW, SALE_DONE, SALE_UNDONE, OFFERS, PAYMENT, CART, RECENTLY_VIEWED, SAVED_SEARCHES, COMPARE, NEARBY  
**Social:** FEED_DETAIL, MY_FEED, FEED_POST_ADD, PUBLIC_WALL, COMPLAINTS, FEEDBACK, REVIEWS  
**Account:** SECURITY, ACCOUNT_DELETE, VERIFICATION, ANALYTICS, ACTIVITY_HUB  
**Channels:** CHANNELS, CHANNEL_CREATE, CHANNEL_DETAIL, CENTRE_LIST, CENTRE_CREATE, CENTRE_DETAIL, CENTRE_LISTINGS  
**Category App:** cat/{catKey}, cat/{catKey}/home, cat/{catKey}/subcategories, cat/{catKey}/listing, cat/{catKey}/cart, cat/{catKey}/wishlist, cat/{catKey}/profile  
**Checkout:** CHECKOUT_ADDRESS, CHECKOUT_PAYMENT, CHECKOUT_REVIEW, CHECKOUT_CONFIRM, CHECKOUT_FAILED  
**Profile Sub:** EDIT_PROFILE, ORDER_HISTORY, ORDER_DETAIL, ADDRESS_BOOK, ADDRESS_ADD, ADDRESS_EDIT  
**Legal:** TERMS, PRIVACY, REFUND, SUPPORT_POLICY, ADMIN_PANEL, INVITE  
**Other:** SEARCH, CATEGORIES, SUBCATEGORIES, POST_DETAIL, CREATE_POST, KYC, AADHAAR_VERIFY, GET_VERIFIED, NOTIFICATION_PREFS, DAILY_CODE, REFERRAL_TREE, CHAT, CHAT_LIST, SCANNER, CATEGORY_MODE, SETTINGS

---

### Bottom Navigation (6 tabs + Sell FAB + More)

| Position | Tab | Route | Icon |
|----------|-----|-------|------|
| 1 | Home | main/category-hub | Home |
| 2 | All Posts | main/all-posts (→cat/{key} if active) | GridView |
| 3 | For You | main/for-you | Explore |
| CENTER | Sell (FAB) | post/welcome | AddCircle |
| 4 | Feed | main/feed | Article |
| 5 | Rewards | main/rewards | EmojiEvents |
| 6 | Profile | main/profile | Person |
| RIGHT | More (drawer) | overlay | Menu |

---

### Hamburger Menu Groups (40+ items)

| Group | Color | Items |
|-------|-------|-------|
| TRADE | Blue (#3B82F6) | Sell, Plans, Centre, Categories, Category Mode, Subcategories, Nearby, Saved Searches, Wishlist, Recently Viewed, Cart, Compare, Scanner |
| SOCIAL | Emerald (#10B981) | Feed, My Feed, Public Wall, Chat, Channels, My Reviews, My Offers, Activity Hub, Feedback, Complaints |
| ACCOUNT | Amber (#F59E0B) | Profile, My Posts, Dashboard, Bought Posts, Sold Posts, Rewards, Notifications, Analytics, Verification, Security, Delete Account, Admin Panel |
| HELP | Slate (#64748B) | About, Contact, FAQ |

---

## PHASE 2 — AUTHENTICATION AUDIT

### Auth Architecture

```
EncryptedSharedPreferences (AES-256-GCM)
    ↓ StateFlow<String?> accessToken (SharingStarted.Eagerly)
AuthRepository
    ↓ Flow<Boolean> isAuthenticated
AuthViewModel
    ↓ StateFlow<Boolean> isAuthenticated → UI
    ↓ StateFlow<Boolean> isAdmin (JWT claim)
    ↓ StateFlow<String?> currentUserId (JWT claim)
```

### Critical Auth Bugs

| # | Severity | Bug | Impact | Root Cause |
|---|----------|-----|--------|------------|
| 1 | **P0** | Concurrent 401s permanently drop requests | Users see failed loads after token expires | `isRefreshing` flag causes other threads to return null instead of waiting |
| 2 | **P0** | `runBlocking` inside `synchronized` on OkHttp thread pool | Potential deadlock under high concurrency | `tokenStore.accessTokenBlocking()` uses `withContext(Dispatchers.IO)` unnecessarily |
| 3 | **P1** | Non-atomic token save (disk → memory) | Brief window where stale token is sent | `prefs.apply()` then `_accessToken.value = x` are separate operations |
| 4 | **P1** | Plaintext fallback on Keystore corruption | Tokens stored unencrypted | `catch(t: Throwable)` falls back to regular SharedPreferences |
| 5 | **P2** | No proactive token refresh | First request after idle always fails once | Only refreshes on 401 response |
| 6 | **P2** | `lastRefreshWasServerRejection` race | Can incorrectly clear tokens on transient failure | Shared mutable state across concurrent authenticate() calls |
| 7 | **P3** | `isAuthenticated` flickers near expiry | Momentary login screen flash | 60s buffer in TokenStore but no buffer in AuthRepository |

### Required Fixes (Auth)

1. **Replace `isRefreshing` flag with `CompletableDeferred`** — concurrent 401s should wait for the refresh result, then retry
2. **Remove `withContext(Dispatchers.IO)` from `accessTokenBlocking()`** — StateFlow.value is already non-blocking
3. **Add Mutex around save()** — update StateFlow first (in-memory), then persist asynchronously
4. **Guard demo credentials behind BuildConfig.DEBUG**
5. **Schedule proactive refresh** at `token.exp - 5min` using WorkManager or coroutine timer
6. **Make `lastRefreshWasServerRejection` a local return value** instead of class field

---

## PHASE 3 — NAVIGATION AUDIT

### Navigation Status: 🟡 Functional with Edge Cases

**Working correctly:**
- ✅ Bottom tab switching with `saveState`/`restoreState`
- ✅ `launchSingleTop = true` on all navigations (no duplicate stacking)
- ✅ Category-aware ALL_POSTS tab (routes to `cat/{key}` when category active)
- ✅ Guest browsing mode (auth-gated screens show `LoginPromptCard`)
- ✅ Double-back-to-exit on HOME
- ✅ Deep link handling via `LaunchedEffect(deepLinkUri)`
- ✅ Logout → auth graph redirect with `wasAuthenticated` tracking
- ✅ More drawer overlay (not a route, app-level AnimatedVisibility)

**Potential Issues:**
| Issue | Risk | Scenario |
|-------|------|----------|
| `startDestination` depends on runtime state | Medium | If token expires while NavHost is composed, start destination doesn't re-evaluate (but LaunchedEffect handles redirect) |
| `popUpTo(0) { inclusive = true }` on logout | Low | May clear entire back stack including deep-linked entries on edge cases |
| Tab state not persisted across process death | Low | `rememberSaveable` for `activeCategoryKey` survives config changes but not process death with deep stacks |
| Category `cat/{key}` route is outside MAIN_GRAPH `navigation` block | None | Intentional — uses `composable()` at top level for full-screen behavior |

### Navigation Logging

Already implemented via `AppLogger`:
- Route pushes tracked via `NavController.OnDestinationChangedListener`
- Tab switches logged
- Drawer open/close logged
- Deep link events logged

---

## PHASE 4 — LOCALIZATION AUDIT

### Status: 🟢 Strong (99.9% coverage)

| Metric | Value |
|--------|-------|
| Total locales | 13 (hi, es, fr, ar, bn, ta, te, kn, mr, gu, ml, pa, ur) |
| Base EN keys | 1,411 |
| Min coverage | 99.9% (2 missing keys: `plans_advanced`, `plans_full`) |
| Reactive architecture | ✅ LocaleManager + StateFlow + localeVersion |
| API-level localization | ✅ LocaleInterceptor adds Accept-Language |
| AppCompat integration | ✅ Per-app language support |

### Locale Change Propagation

```
User changes language (MoreScreen)
  → localeManager.setLocale(code)
    → SharedPreferences persist
    → _currentLocale StateFlow update → Compose recomposition
    → _localeVersion increment → ViewModels reload API data
    → AppCompatDelegate.setApplicationLocales() → Activity recreation (XML resources)
    → LocaleInterceptor picks up new locale for next API call
```

### Remaining Issues

| Issue | Fix Required |
|-------|-------------|
| 2 missing keys in 10 locales | Add `plans_advanced`, `plans_full` translations |
| 6 stale extra keys in Spanish | Remove deprecated keys |
| `supportedLocales` list (25 codes) > actual locale files (13) | Restrict selector to available locales OR add 12 missing locale files |

---

## PHASE 5 — API & REPOSITORY AUDIT

### API Coverage: ~130 endpoints defined, ~120 used

### Mock Data Contamination (Critical Category App Issue)

The **category mini-app** (`CategoryAppShell`, `CategoryHomeScreen`, `ProductListingScreen`, `MockProductDetailScreen`, `SubcategoryScreen`) is hardwired to `MockDataProvider` types. Even when real API data is fetched, it's converted to mock types via `Post.toMockProduct()`, losing rich server fields.

**Affected screens:**
- `MockProductDetailScreen` — fully mock, can't display real products
- `RecentlyViewedFullScreen` — uses `MockDataProvider.allProducts.take(15)` despite real API existing
- `SubcategoriesScreen` — uses `MockDataProvider.subcategoriesFor()` despite `GET /api/categories/{id}/subcategories` being available
- `CategoryHomeScreen` banners — always mock

### Pagination Bugs

| Screen | Issue |
|--------|-------|
| ForYouScreen | Broken: multiplies limit by page number instead of passing page offset |
| NearbyScreen | Not implemented (comment placeholder only) |
| Notifications | No UI trigger for loadMore (only page 1 loaded) |
| SoldPosts/BoughtPosts | May not paginate (needs verification) |

### Missing Web Parity Features

| Feature | Endpoints Available on Server | Android Status |
|---------|-------------------------------|---------------|
| Buyer Inquiries (create, reply, templates) | 8 endpoints | ❌ Not implemented |
| Contacts Sync (phone matching) | 2 endpoints | ❌ Not implemented |
| Price History/Drops | 2+ endpoints | ❌ Not implemented |
| Client Error/Event Analytics | 3 endpoints | ❌ Not implemented |
| Offer History per Post | 1 endpoint | ❌ Not implemented |
| Auto-accept Offer Threshold | 1 endpoint | ❌ Not implemented |
| Nearby Cities Filter | 1 endpoint | ❌ Not implemented |

### Dead/Unused Infrastructure

| Item | Status |
|------|--------|
| `OfflineQueue` (entity + DAO) | Dead code — no producer or consumer |
| `CartItemDao` + `CartItemEntity` | Room table exists, never populated |
| `WishlistItemDao` + `WishlistItemEntity` | Room table exists, never populated |
| `RecentlyViewedDao` + `RecentlyViewedEntity` | Room table exists, never populated |
| `BrandsRepository.list()` | Wired but no UI consumer |
| `api/search/trending` endpoint | Defined but unused |

---

## PHASE 6 — LIFECYCLE & PERFORMANCE AUDIT

### Lifecycle Issues

| Issue | Severity | Location |
|-------|----------|----------|
| Firebase service scope never cancelled | P2 | MhubFirebaseMessagingService.kt |
| Multiple OTP countdown coroutines | P3 | AuthViewModel.startOtpCountdown() |
| 30s auto-refresh in HomeScreen | Low | Could cause unnecessary rebuilds when backgrounded |
| `fallbackToDestructiveMigration()` on Room | Low | All local data wiped on schema change |

### Performance Concerns

| Area | Status |
|------|--------|
| Compose stability | ⚠️ No `@Stable`/`@Immutable` annotations on most data classes |
| CommerceScreens.kt (3164 lines) | ⚠️ 15 screens + 14 VMs in one file → slow incremental compilation |
| MhubApp.kt (1491 lines) | ⚠️ Entire nav graph in one composable → recomposition scope too large |
| Image loading | ✅ Coil with OkHttp disk cache |
| HTTP cache | ✅ 25MB disk cache with network-layer Cache-Control |
| Connection pool | ✅ 8 idle connections, 3 min keep-alive |

---

## PHASE 7 — SECURITY AUDIT

| Issue | Severity | Recommendation |
|-------|----------|----------------|
| Plaintext token fallback | P1 | Force re-login on Keystore failure |
| Demo credentials in release | P1 | Gate behind `BuildConfig.DEBUG` |
| `Math.random()` for nonce | P2 | Use `SecureRandom` |
| No certificate pinning | P3 | Add for auth endpoints at minimum |
| `AppLogger.ENABLED = true` hardcoded | P3 | Use `BuildConfig.DEBUG` |
| Refresh token sent without pinning | P3 | Minimal OkHttp client has no security config |

---

## PHASE 8 — WEB PARITY COMPARISON

### Feature Parity Matrix

| Feature | Web | Android | Gap |
|---------|-----|---------|-----|
| Login (email/Google/OTP) | ✅ | ✅ | None |
| Signup (Aadhaar 4-step) | ✅ | ✅ | None |
| 2FA setup/verify/disable | ✅ | ✅ | None |
| Category Hub launcher | ✅ | ✅ | None |
| AllPosts with filters/sort | ✅ | ✅ | None |
| ForYou recommendations | ✅ | ⚠️ | Pagination broken |
| Feed social | ✅ | ✅ | None |
| Rewards (coins, spin, scratch) | ✅ | ✅ | None |
| Profile management | ✅ | ✅ | None |
| Post CRUD | ✅ | ✅ | None |
| Chat (WebSocket) | ✅ | ✅ | None |
| Notifications + prefs | ✅ | ⚠️ | No pagination UI |
| Wishlist | ✅ | ✅ | None |
| Cart + Checkout | ✅ | ✅ | None |
| Payment (Razorpay/UPI) | ✅ | ✅ | None |
| Compare posts | ✅ | ✅ | None |
| Saved searches | ✅ | ✅ | None |
| Recently viewed | ✅ | ⚠️ | Full screen uses mock |
| Nearby | ✅ | ⚠️ | No pagination |
| Scanner (QR/barcode) | ❌ | ✅ | Android-only |
| Channels/Centres | ✅ | ✅ | None |
| KYC/Verification | ✅ | ✅ | None |
| Buyer Inquiries | ✅ | ❌ | **Missing entirely** |
| Contacts Sync | ✅ | ❌ | **Missing entirely** |
| Price History | ✅ | ❌ | **Missing entirely** |
| Client Analytics | ✅ | ❌ | **Missing entirely** |
| Hamburger menu (40+ items) | ✅ | ✅ | None |
| Dark mode | ✅ | ✅ | None |
| 13 locale support | ✅ | ✅ | None |
| Offline support | Partial | Partial | Room scaffolded but unused |

---

## PRIORITIZED FIX PLAN

### Sprint 1: P0 Critical (Authentication)

1. **Fix TokenRefreshAuthenticator** — replace `isRefreshing` flag with `CompletableDeferred<RefreshResult?>` pattern
2. **Fix deadlock risk** — remove `withContext(Dispatchers.IO)` from `accessTokenBlocking()`
3. **Fix ForYouScreen pagination** — pass page number, not multiplied limit

### Sprint 2: P1 High (Data Integrity)

4. **Fix TokenStore.save() atomicity** — update StateFlow first, persist async
5. **Remove plaintext fallback** — force re-login on Keystore corruption
6. **Guard demo credentials** behind `BuildConfig.DEBUG`
7. **Replace mock data in category app** — wire real APIs for subcategories, product detail, recently viewed

### Sprint 3: P2 Medium (Architecture)

8. **Add proactive token refresh** (WorkManager or coroutine timer before expiry)
9. **Fix interceptor ordering** (SecurityHeaders inside retry loop)
10. **Cancel Firebase service scope** in `onDestroy()`
11. **Populate Room cache tables** from CartRepository/WishlistRepository
12. **Add notification pagination**
13. **Implement NearbyScreen pagination**
14. **Add missing locale keys** (`plans_advanced`, `plans_full`)

### Sprint 4: Web Parity

15. Add Buyer Inquiries feature
16. Add Contacts Sync feature
17. Add Price History charts
18. Add Client Analytics reporting

---

## QA VALIDATION CHECKLIST

| Area | Test | Status |
|------|------|--------|
| **Navigation** | All 80+ routes reachable | ⬜ |
| **Navigation** | Tab switching preserves state | ⬜ |
| **Navigation** | Deep links work | ⬜ |
| **Navigation** | Back stack correct | ⬜ |
| **Auth** | Login persists across restart | ⬜ |
| **Auth** | Token refresh transparent | ⬜ |
| **Auth** | Guest browsing works | ⬜ |
| **Auth** | No false login prompts | ⬜ |
| **Auth** | Logout clears all state | ⬜ |
| **Localization** | Instant language switch | ⬜ |
| **Localization** | API data re-fetched in new locale | ⬜ |
| **Localization** | All screens translated | ⬜ |
| **Lifecycle** | Minimize/restore preserves state | ⬜ |
| **Lifecycle** | Config change (rotation) safe | ⬜ |
| **Lifecycle** | Process death recovery | ⬜ |
| **API** | Error states displayed correctly | ⬜ |
| **API** | Pagination works (HomeScreen) | ⬜ |
| **API** | Pull-to-refresh works | ⬜ |
| **API** | Offline banner appears | ⬜ |
| **Performance** | No shimmer freezes | ⬜ |
| **Performance** | Smooth scrolling (60fps) | ⬜ |
| **Performance** | No memory leaks | ⬜ |
| **UI/UX** | Dark mode renders correctly | ⬜ |
| **UI/UX** | No visual glitches | ⬜ |
| **UI/UX** | Responsive layouts | ⬜ |

---

## FILES REQUIRING IMMEDIATE ATTENTION

1. `data/remote/TokenRefreshAuthenticator.kt` — P0 deadlock + dropped requests
2. `ui/foryou/ForYouScreen.kt` — P0 broken pagination
3. `ui/recentlyviewed/RecentlyViewedFullScreen.kt` — Mock data when real API exists
4. `data/local/TokenStore.kt` — Non-atomic save, plaintext fallback
5. `ui/auth/AuthViewModel.kt` — Demo credentials, OTP countdown race
6. `ui/categoryapp/MockProductDetailScreen.kt` — Fully mock, needs real API
7. `core/AppLogger.kt` — ENABLED hardcoded true
8. `data/remote/SecurityInterceptors.kt` — Math.random() for nonce
9. `service/MhubFirebaseMessagingService.kt` — Scope leak

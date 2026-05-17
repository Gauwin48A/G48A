# MHub Android — Production Readiness Implementation Plan v2

> Generated from live emulator scan of 18 screens — May 17, 2026  
> Overall readiness: **6.5/10** → Target: **9/10** after P0+P1 completion

---

## Table of Contents

1. [Current State Summary](#current-state-summary)
2. [P0 — Must Fix Before Launch](#p0--must-fix-before-launch-blockers)
3. [P1 — Critical for Good UX](#p1--critical-for-good-ux-first-week)
4. [P2 — Important for Growth](#p2--important-for-growth-week-2-3)
5. [P3 — Nice-to-Have](#p3--nice-to-have-month-1-2)
6. [File Map](#file-map)
7. [Testing Checklist](#testing-checklist)
8. [Risk Register](#risk-register)

---

## Current State Summary

| Category | Score | After P0 | After P1 |
|---|---|---|---|
| UI Completeness | 8.5/10 | 9/10 | 9.5/10 |
| API Integration | 7/10 | 8.5/10 | 9/10 |
| Navigation | 6/10 | 9/10 | 9.5/10 |
| Performance | 8/10 | 8/10 | 8.5/10 |
| Monetization Ready | 4/10 | 7/10 | 9/10 |
| Production Deploy | 6.5/10 | 8.5/10 | 9.5/10 |

### Screen Audit Matrix

| # | Screen | Status | Blocker? |
|---|---|---|---|
| 1 | CategoryHub (Home) | ⚠️ | P0-2, P0-4, P1-6 |
| 2 | Product Listing (Explore) | ✅ | — |
| 3 | Product Detail | ✅ | — |
| 4 | Sell (PostWelcome) | ⚠️ | P0-3 |
| 5 | Rewards Dashboard | ✅ | — |
| 6 | Rewards Earn | ✅ | — |
| 7 | Rewards Referrals | ✅ | — |
| 8 | Rewards Activity | ✅ | — |
| 9 | Profile | ✅ | — |
| 10 | Notifications | ✅ | — |
| 11 | Search | ⚠️ | P1-5 |
| 12 | Login | ✅ | — |
| 13 | Create Post | ✅ | — |
| 14 | Chat | ✅ | — |
| 15 | KYC | ✅ | — |
| 16 | Checkout | ❌ | P0-1 |
| 17 | Admin Panel | ✅ | Already built |
| 18 | Nearby | ⚠️ | P1-7 |

---

## P0 — Must Fix Before Launch (Blockers)

### P0-1: Checkout Backend Integration

**Priority:** 🔴 BLOCKER  
**Effort:** 3–4 days  
**Status:** ❌ Not functional — UI mockup only

#### Problem

`CheckoutReviewScreen` Place Order button executes `delay(1500L)` then navigates to confirm screen. No real API call. No order record created. No payment captured.

#### Current Code (CheckoutScreens.kt ~line 395)

```kotlin
scope.launch {
    isPlacing = true
    delay(1500L)        // ← fake delay, no API
    isPlacing = false
    onPlaceOrder()      // ← just navigates, no order created
}
```

#### Implementation Steps

| Step | Task | File(s) | Details |
|---|---|---|---|
| 1a | Add `CreateOrderRequest` DTO | `data/remote/dto/Dtos.kt` | Fields: `postId: String`, `buyerId: String`, `addressId: String`, `paymentMethod: String`, `amount: Double`, `currency: String = "INR"` |
| 1b | Add `CreateOrderResponse` DTO | `data/remote/dto/Dtos.kt` | Fields: `success: Boolean`, `orderId: String?`, `transactionId: String?`, `message: String?`, `paymentUrl: String?` |
| 1c | Add `OrderDetailResponse` DTO | `data/remote/dto/Dtos.kt` | Fields: `id: String`, `status: String`, `items: List<OrderItem>`, `total: Double`, `createdAt: String`, `trackingSteps: List<TrackingStep>` |
| 1d | Add `POST /api/orders/create` | `data/remote/MhubApi.kt` | `@POST("api/orders/create") suspend fun createOrder(@Body body: CreateOrderRequest): CreateOrderResponse` |
| 1e | Add `GET /api/orders/{id}` | `data/remote/MhubApi.kt` | `@GET("api/orders/{id}") suspend fun getOrder(@Path("id") id: String): OrderDetailResponse` |
| 1f | Add `GET /api/orders/my` | `data/remote/MhubApi.kt` | `@GET("api/orders/my") suspend fun myOrders(): List<OrderDetailResponse>` |
| 1g | Create `OrderRepository` | `data/repository/OrderRepository.kt` | NEW file. Wraps API calls with `ApiResult`, caches last order in memory for confirmation screen |
| 1h | Create `CheckoutViewModel` | `ui/checkout/CheckoutViewModel.kt` | NEW file. Holds address, payment method, cart items; `placeOrder()` calls `orderRepo.create()`, emits success/failure state |
| 1i | Wire ViewModel to UI | `ui/checkout/CheckoutScreens.kt` | Inject `CheckoutViewModel` via `hiltViewModel()`. Replace `delay()` with `viewModel.placeOrder()`. On success → navigate confirm. On failure → navigate failed. |
| 1j | Pass data through nav | `ui/MhubApp.kt` | Use `savedStateHandle` or shared ViewModel scope for address + payment method across checkout steps |
| 1k | Handle payment redirect | `ui/checkout/CheckoutScreens.kt` | If `CreateOrderResponse.paymentUrl` is non-null, open in Custom Chrome Tab for UPI/Razorpay payment |
| 1l | Show real order ID | `ui/checkout/CheckoutScreens.kt` | `OrderConfirmationScreen` displays `orderId` from response instead of generated UUID |
| 1m | Add to order history | `ui/profile/` | Ensure completed orders appear in "My Orders" / "Bought Posts" |

#### Server-Side Requirements

The backend needs these endpoints (check `server/` for existing implementations):

```
POST   /api/orders/create        → { orderId, transactionId, paymentUrl? }
GET    /api/orders/:id            → full order detail with tracking
GET    /api/orders/my             → user's order history  
PATCH  /api/orders/:id/cancel     → cancel pending order
```

**Fallback:** The existing `POST /api/transactions/initiate` takes `postId`, `buyerId`, `saleAmount` and returns `transactionId`. Use this if `/api/orders/create` doesn't exist yet.

#### Acceptance Criteria

- [ ] Tapping "Place Order" creates a real server-side order record
- [ ] Order appears in user's order history
- [ ] Failed orders navigate to `CheckoutFailedScreen` with retry option
- [ ] Payment method selection flows to appropriate gateway (UPI/COD/Card)
- [ ] Order confirmation screen shows real order ID and estimated delivery

---

### P0-2: Fix Navigation Back Stack

**Priority:** 🔴 BLOCKER  
**Effort:** 1–2 days  
**Status:** ✅ PARTIALLY FIXED

#### Problem

Bottom nav `onClick` used `popUpTo(Routes.HOME)` which cleared the entire back stack on every tab switch. User flow: Home → Electronics → Profile → Back → lands on Home instead of Electronics.

#### What Was Already Fixed

```diff
// MhubApp.kt — bottom nav onClick
- popUpTo(Routes.HOME) { saveState = true; inclusive = false }
+ popUpTo(Routes.MAIN_GRAPH) { saveState = true; inclusive = false }

// CategoryHub route
- MainShell(..., showTopBar = false, showBottomBar = false)
+ MainShell(..., showTopBar = false, showBottomBar = true)
```

#### Remaining Work

| Step | Task | File(s) | Details |
|---|---|---|---|
| 2a | Verify back stack retention | Emulator test | Navigate: Home → category card → product → Profile tab → Back → must return to product, not Home |
| 2b | Fix deep link back behavior | `ui/MhubApp.kt` | Product detail opened from notification should have synthetic back stack: Home → category → product |
| 2c | Extract `navigateToTab()` helper | `ui/MhubApp.kt` | Deduplicate bottom nav navigation logic into a single function to prevent future drift |
| 2d | Handle system back on root | `ui/MhubApp.kt` | When on Home tab with no back stack, pressing back should show "Press again to exit" toast (use `BackHandler`) |
| 2e | Verify state preservation | Emulator test | Switch Home → Profile → Home: scroll position and selected category must be preserved |
| 2f | Navigation unit tests | `test/` | Add tests for `popUpTo` behavior with `TestNavHostController` |

#### Implementation: Double-Back Exit (2d)

```kotlin
// In MhubApp composable, add:
var backPressedOnce by remember { mutableStateOf(false) }
val context = LocalContext.current

BackHandler(enabled = navController.currentDestination?.route == Routes.HOME) {
    if (backPressedOnce) {
        (context as? Activity)?.finish()
    } else {
        backPressedOnce = true
        Toast.makeText(context, "Press back again to exit", Toast.LENGTH_SHORT).show()
        scope.launch { delay(2000); backPressedOnce = false }
    }
}
```

#### Acceptance Criteria

- [ ] Back from any tab returns to the previous screen, not always Home
- [ ] Tab state (scroll position, filters) preserved on tab switch
- [ ] Double-back on Home exits app with confirmation
- [ ] Deep links from notifications have correct back stack

---

### P0-3: Sell Page — Prominent CTA

**Priority:** 🔴 BLOCKER  
**Effort:** 0.5 day  
**Status:** ✅ Button exists but may be below scroll fold

#### Current State

`PostWelcomeScreen` in `CommerceScreens.kt` line ~230 already has:
```kotlin
Button(onClick = onStartPost, ...) {
    Box(...) {
        Text(stringResource(R.string.sell_start_listing), ...)
    }
}
```

The button uses a gradient (`brandGrad`), is full width, 54dp tall. It looks good but is positioned after the "How it works" guide and tier badge — which could push it below the fold on smaller screens.

#### Remaining Work

| Step | Task | File(s) | Details |
|---|---|---|---|
| 3a | Test visibility on 5" screen | Emulator (320dp width) | Check if button visible without scrolling |
| 3b | Add sticky bottom CTA | `ui/commerce/CommerceScreens.kt` | Move button outside the scrollable Column into a fixed bottom bar, similar to product detail's "Add to Cart" bar |
| 3c | Add pulse animation for first visit | `ui/commerce/CommerceScreens.kt` | Subtle `infiniteRepeatable(tween)` scale animation (1.0→1.03→1.0) on the CTA for first-time sellers |
| 3d | Track first visit with DataStore | `data/local/AppPreferences.kt` | `hasSeenSellIntro: Boolean` pref — show animation only on first visit |

#### Implementation: Sticky Bottom CTA (3b)

```kotlin
// Change PostWelcomeScreen layout from:
Column(Modifier.fillMaxSize().verticalScroll(...)) {
    // ... content ...
    Button(onClick = onStartPost) { ... }
}

// To:
Column(Modifier.fillMaxSize()) {
    Column(Modifier.weight(1f).verticalScroll(...)) {
        // ... content (without button) ...
    }
    // Sticky bottom bar
    Surface(shadowElevation = 8.dp) {
        Button(onClick = onStartPost, modifier = Modifier.fillMaxWidth().padding(16.dp).height(54.dp)) {
            Text("Start Listing", fontWeight = FontWeight.Bold)
        }
    }
}
```

#### Acceptance Criteria

- [ ] "Start Listing" button visible on ALL screen sizes without scrolling
- [ ] Button navigates to Create Post form
- [ ] KYC-unverified users see KYC gate popup before proceeding
- [ ] First-time visitors see subtle pulse animation on the CTA

---

### P0-4: Differentiate Home vs Explore Tabs

**Priority:** 🔴 BLOCKER  
**Effort:** 1–2 days  

#### Problem

Both bottom nav tabs serve similar content:
- **Home** (CategoryHub) = category cards + search bar + stats
- **Explore** (ALL_POSTS) = product grid with filters

When a user taps a category on Home, they see a product grid. Tapping Explore also shows a product grid. The difference is subtle and confusing.

#### Option A: Full DiscoverScreen (Recommended)

Create a new Explore experience focused on discovery rather than listing:

| Step | Task | File(s) | Details |
|---|---|---|---|
| 4a | Create `DiscoverScreen.kt` | `ui/discover/DiscoverScreen.kt` | NEW file with vertically scrolling sections |
| 4b | "Trending Now" section | `ui/discover/DiscoverScreen.kt` | Horizontal card carousel of hot items (server: `GET /api/posts?sort=trending&limit=10`) |
| 4c | "For You" section | `ui/discover/DiscoverScreen.kt` | Personalized recommendations based on browsing history (reuse ForYouScreen logic) |
| 4d | "Near You" section | `ui/discover/DiscoverScreen.kt` | 3-4 nearby items with distance badges (reuse NearbyScreen data) |
| 4e | "New Arrivals" section | `ui/discover/DiscoverScreen.kt` | Latest posts (server: `GET /api/posts?sort=newest&limit=10`) |
| 4f | "Top Sellers" section | `ui/discover/DiscoverScreen.kt` | Seller cards with rating + post count |
| 4g | Add `DiscoverViewModel.kt` | `ui/discover/DiscoverViewModel.kt` | Loads all sections in parallel, caches results |
| 4h | Update route | `ui/navigation/Routes.kt` | `const val DISCOVER = "main/discover"` |
| 4i | Wire in MhubApp | `ui/MhubApp.kt` | `BottomTab.ALL_POSTS` → route to `DiscoverScreen` |
| 4j | Update tab icon/label | `ui/MhubApp.kt` | Change "All Posts" to "Explore" with compass/explore icon |

#### Option B: Minimal Differentiation (Faster)

Keep ALL_POSTS but add discovery elements:

| Step | Task | File(s) | Details |
|---|---|---|---|
| 4b-alt | Add tab row to AllPostsScreen | `ui/allposts/AllPostsScreen.kt` | Tabs: "All" / "For You" / "Trending" / "New" |
| 4c-alt | "For You" tab content | `ui/allposts/AllPostsScreen.kt` | Filtered feed based on user's category interests |
| 4d-alt | "Trending" tab content | `ui/allposts/AllPostsScreen.kt` | Sort by views/likes in last 24h |

#### Acceptance Criteria

- [ ] Home and Explore tabs show visually distinct content
- [ ] A new user immediately understands the difference between the two tabs
- [ ] Explore has discovery elements (trending, for-you, new arrivals)
- [ ] Each section has a "See All" link to the full listing

---

## P1 — Critical for Good UX (First Week)

### P1-5: Search — Recent Searches + Trending

**Priority:** 🟠 HIGH  
**Effort:** 1 day  
**Status:** ✅ PARTIALLY DONE (recentQueries stored in DataStore already)

#### Current State

`SearchViewModel` already:
- Persists recent queries via `AppPreferences.getRecentSearches()` / `saveRecentSearches()`
- Loads them on init into `state.recentQueries`
- Has `savedSearches` from `SavedSearchesRepository`

The state class has `recentQueries: List<String>` — data is there, need to verify the UI renders it.

#### Remaining Work

| Step | Task | File(s) | Details |
|---|---|---|---|
| 5a | Verify chips render | `ui/search/SearchScreen.kt` | Read the empty-state composable and confirm `recentQueries` are displayed as tappable chips |
| 5b | Add "Recent Searches" header | `ui/search/SearchScreen.kt` | Section header with clock icon + "Clear All" text button |
| 5c | Add trending section | `ui/search/SearchScreen.kt` | Below recent: "🔥 Trending" section. Hardcode 8 popular queries initially, later wire to `GET /api/search/trending` |
| 5d | Add trending API endpoint | `data/remote/MhubApi.kt` | `@GET("api/search/trending") suspend fun trendingSearches(): TrendingSearchResponse` (data class with `queries: List<String>`) |
| 5e | Wire trending to ViewModel | `ui/search/SearchScreen.kt` | Load trending on init, display below recent |
| 5f | Add clear history | `ui/search/SearchScreen.kt` | "Clear All" calls `viewModel.clearRecentSearches()` → `prefs.saveRecentSearches(emptyList())` |
| 5g | Voice search icon | `ui/search/SearchScreen.kt` | Mic icon as trailing icon in search TextField → launch `RecognizerIntent.ACTION_RECOGNIZE_SPEECH` |
| 5h | Handle voice result | `ui/search/SearchScreen.kt` | `rememberLauncherForActivityResult` → fill query and auto-search |

#### Acceptance Criteria

- [ ] Empty search screen shows "Recent Searches" with up to 10 chips
- [ ] Tapping a recent chip fills the query and runs the search
- [ ] "Clear All" removes all search history
- [ ] "Trending" section shows 8+ popular queries below recent
- [ ] Mic icon opens voice input (Android speech-to-text)

---

### P1-6: CategoryHub TopBar Improvements

**Priority:** 🟠 HIGH  
**Effort:** 0.5 day  

#### Problem

CategoryHub uses `showTopBar = false` because it provides its own custom header. The custom header has search bar + notification icon + settings icon, but they're small and easy to miss. The main concern was `showBottomBar = false` which is now fixed.

#### Current State (CategoryHubScreen.kt)

The screen already has:
- Search bar (OutlinedTextField with Search icon)
- Notification bell icon (`Icons.Filled.Notifications`)
- Settings gear icon (`Icons.Filled.Settings`)
- QR scanner icon (`Icons.Filled.QrCodeScanner`)

#### Remaining Work

| Step | Task | File(s) | Details |
|---|---|---|---|
| 6a | Add notification badge | `ui/home/CategoryHubScreen.kt` | `BadgedBox` around notification icon showing unread count |
| 6b | Add cart icon | `ui/home/CategoryHubScreen.kt` | Shopping cart icon with badge next to notification bell |
| 6c | Inject badge counts | `ui/home/CategoryHubScreen.kt` | Pass `unreadNotifications: Int` and `cartItemCount: Int` as params from MhubApp |
| 6d | Style consistency | `ui/home/CategoryHubScreen.kt` | Ensure header matches Material 3 TopAppBar visual weight |

#### Implementation

```kotlin
// In CategoryHubScreen header row, wrap notification icon:
BadgedBox(badge = {
    if (unreadCount > 0) Badge { Text("$unreadCount") }
}) {
    IconButton(onClick = onOpenNotifications) {
        Icon(Icons.Filled.Notifications, "Notifications")
    }
}

// Add cart icon:
BadgedBox(badge = {
    if (cartCount > 0) Badge { Text("$cartCount") }
}) {
    IconButton(onClick = onOpenCart) {
        Icon(Icons.Filled.ShoppingCart, "Cart")
    }
}
```

#### Acceptance Criteria

- [ ] Notification icon has red badge with unread count (when > 0)
- [ ] Cart icon visible with item count badge
- [ ] Bottom nav bar visible on Home ✅ (already fixed)
- [ ] Search bar prominent and functional

---

### P1-7: Nearby — Map Integration

**Priority:** 🟠 HIGH  
**Effort:** 2–3 days  

#### Problem

NearbyScreen shows a flat list with distance from cached GPS coordinates. No visual map. Users expect to see pins on a map for "nearby" features.

#### Implementation Steps

| Step | Task | File(s) | Details |
|---|---|---|---|
| 7a | Add Maps Compose dependency | `build.gradle.kts` (app) | `implementation("com.google.maps.android:maps-compose:6.1.0")` + `implementation("com.google.maps.android:maps-compose-utils:6.1.0")` |
| 7b | Add Maps SDK dependency | `build.gradle.kts` (project) | Google Maps SDK via `com.google.android.gms:play-services-maps:19.0.0` |
| 7c | Add Maps API key | `AndroidManifest.xml` | `<meta-data android:name="com.google.android.geo.API_KEY" android:value="${MAPS_API_KEY}" />` |
| 7d | Store API key | `local.properties` | `MAPS_API_KEY=AIza...` (get from Google Cloud Console) |
| 7e | Pass key to manifest | `build.gradle.kts` (app) | `manifestPlaceholders["MAPS_API_KEY"] = properties["MAPS_API_KEY"] ?: ""` |
| 7f | Create `NearbyMapView` | `ui/nearby/NearbyScreen.kt` | `GoogleMap` composable with `CameraPositionState` centered on user location |
| 7g | Add markers for posts | `ui/nearby/NearbyScreen.kt` | Each nearby post becomes a `Marker` at its lat/lng with title = post title |
| 7h | Add marker clustering | `ui/nearby/NearbyScreen.kt` | Use `Clustering` composable for areas with many posts |
| 7i | Add list/map toggle | `ui/nearby/NearbyScreen.kt` | `SegmentedButton` or `IconToggleButton`: list ↔ map |
| 7j | Post preview on marker tap | `ui/nearby/NearbyScreen.kt` | `BottomSheetScaffold` — tapping marker shows post card in bottom sheet |
| 7k | Request location permission | `ui/nearby/NearbyScreen.kt` | `rememberLauncherForActivityResult(RequestPermission)` for `ACCESS_FINE_LOCATION` |
| 7l | Live GPS with FusedLocation | `ui/nearby/NearbyViewModel.kt` | Replace cached GPS with `FusedLocationProviderClient.lastLocation` |
| 7m | Radius filter | `ui/nearby/NearbyScreen.kt` | Slider or chips: 1km / 5km / 10km / 25km radius filter |

#### Acceptance Criteria

- [ ] Map view shows posts as markers at their GPS coordinates
- [ ] Tapping a marker shows post preview in bottom sheet
- [ ] User can toggle between list and map views
- [ ] Location permission properly requested (with rationale dialog)
- [ ] Map clusters markers when zoomed out
- [ ] Radius filter controls which posts appear

---

### P1-8: Admin Panel Polish

**Priority:** 🟠 HIGH  
**Effort:** 1–2 days  
**Status:** ✅ ALREADY FULLY IMPLEMENTED

#### Current State (LegalScreens.kt)

The Admin Panel is complete with:
- ✅ Role-based access control (`user.role == "admin"`)
- ✅ Stats grid (Users / Posts / Flagged)
- ✅ 4 tabs (Users / Posts / Flags / Activity)
- ✅ Bulk actions (approve, reject, ban, remove)
- ✅ Warning dialog with custom message
- ✅ Undo system with Snackbar
- ✅ Pull-to-refresh
- ✅ Search + filter by category
- ✅ Access Denied screen for non-admins

#### Remaining Polish

| Step | Task | File(s) | Details |
|---|---|---|---|
| 8a | Verify API contract | Server | Ensure `/api/admin/dashboard` returns `AdminDashboardResponse` matching Kotlin DTO |
| 8b | Enable admin access for testing | `ui/more/MoreScreen.kt` | Change `isAdmin = false` to `isAdmin = true` or wire to real user role check |
| 8c | Add post detail expansion | `ui/legal/LegalScreens.kt` | Tapping flagged post → expandable card showing images, description, reporter info |
| 8d | Add export function | `ui/legal/LegalScreens.kt` | "Export" button → generate CSV of flagged items → share via Intent |
| 8e | E2E test with admin account | Emulator | Create admin user on server, verify full flow |

#### Acceptance Criteria

- [ ] Admin panel loads real data from `/api/admin/dashboard`
- [ ] Can approve/reject/ban users with undo
- [ ] Can approve/remove posts with undo
- [ ] Warning messages sent via API
- [ ] Non-admin users see "Access Denied" screen

---

### P1-9: Offline Mode Indicator

**Priority:** 🟠 MEDIUM  
**Effort:** 0.5 day  

#### Implementation Steps

| Step | Task | File(s) | Details |
|---|---|---|---|
| 9a | Locate `OfflineBanner` | `ui/components/` | Find existing offline banner composable |
| 9b | Verify connectivity detection | `core/` or `util/` | Check if `ConnectivityManager` is being observed |
| 9c | Test airplane mode | Emulator | Toggle airplane mode → banner should appear within 3 seconds |
| 9d | Verify Room DB fallback | `data/repository/ContentRepositories.kt` | PostsRepository has 10-min TTL cache in Room — verify it loads when offline |
| 9e | Queue failed writes | `data/repository/` | Cart/wishlist changes made offline → store in Room → sync with `WorkManager` when connectivity returns |
| 9f | Add retry button | `ui/components/OfflineBanner.kt` | "Tap to retry" action in the offline banner |
| 9g | Graceful degradation | All screens | Screens should show cached data with "Offline" indicator, not error/loading state |

#### Acceptance Criteria

- [ ] Banner appears within 3 seconds of losing network
- [ ] Banner disappears within 3 seconds of regaining network
- [ ] Cached posts, categories, and profile load from Room when offline
- [ ] Write operations (wishlist add, cart update) queue and sync later
- [ ] No crash or blank screen when opening any page while offline

---

## P2 — Important for Growth (Week 2-3)

### P2-10: Push Notifications (FCM)

**Effort:** 2 days

| Step | Task | File(s) | Details |
|---|---|---|---|
| 10a | Add dependency | `build.gradle.kts` | `implementation("com.google.firebase:firebase-messaging-ktx:24.0.0")` |
| 10b | Add `google-services.json` | `app/` | Firebase project config file |
| 10c | Create `MhubMessagingService` | `service/MhubMessagingService.kt` | Extend `FirebaseMessagingService`. Override `onNewToken()` → POST token to server. Override `onMessageReceived()` → show notification |
| 10d | Create notification channels | `MhubApplication.kt` | Channels: `orders` (high), `chat` (high), `rewards` (default), `system` (low) |
| 10e | Register token on login | `data/repository/AuthRepository.kt` | After successful login, send FCM token: `POST /api/users/fcm-token` |
| 10f | Deep link on tap | `MhubMessagingService.kt` | Notification data payload includes `route` → create PendingIntent to the right screen |
| 10g | Server triggers | Server-side | FCM push for: new order status, new chat message, reward earned, post approved/rejected |
| 10h | Unread badge | `ui/home/CategoryHubScreen.kt` | Sync notification count with FCM data messages |

---

### P2-11: Payment Gateway Integration

**Effort:** 3–4 days

| Step | Task | File(s) | Details |
|---|---|---|---|
| 11a | Add Razorpay SDK | `build.gradle.kts` | `implementation("com.razorpay:checkout:1.6.40")` |
| 11b | Create `PaymentManager` | `payment/PaymentManager.kt` | Initializes Razorpay, handles `PaymentResultListener` callbacks |
| 11c | Create Razorpay order | Server | `POST /api/payments/razorpay/order` → returns `orderId`, `amount`, `key` (API already exists in MhubApi) |
| 11d | Open Razorpay checkout | `payment/PaymentManager.kt` | `Checkout().open(activity, options)` with order details |
| 11e | Verify payment | Server | `POST /api/payments/razorpay/verify` → verify signature (API already exists in MhubApi) |
| 11f | Handle success/failure | `ui/checkout/CheckoutScreens.kt` | Success → confirm screen. Failure → failed screen with retry |
| 11g | UPI Intent payment | `payment/PaymentManager.kt` | Direct UPI `Intent` for GPay/PhonePe/Paytm |
| 11h | COD option | `ui/checkout/CheckoutScreens.kt` | Cash on delivery with address verification — no payment gateway needed |

**Note:** `MhubApi.kt` already has `createRazorpayOrder()` and `verifyRazorpayPayment()` endpoints defined.

---

### P2-12: Order Tracking

**Effort:** 2–3 days

| Step | Task | File(s) | Details |
|---|---|---|---|
| 12a | Create `OrderTrackingScreen` | `ui/orders/OrderTrackingScreen.kt` | Step indicator: Placed → Confirmed → Shipped → Out for Delivery → Delivered |
| 12b | Add tracking DTOs | `data/remote/dto/Dtos.kt` | `TrackingStep(status, timestamp, description)`, `OrderTrackingResponse` |
| 12c | Add tracking API | `data/remote/MhubApi.kt` | `@GET("api/orders/{id}/tracking")` |
| 12d | Real-time updates | `ui/orders/OrderTrackingScreen.kt` | Poll every 30s or use WebSocket for live status |
| 12e | Push on status change | Server | Send FCM: "Your order has been shipped!" with tracking route as deep link |
| 12f | Delivery confirmation | `ui/orders/OrderTrackingScreen.kt` | Buyer taps "Confirm Delivery" → triggers payment release to seller |
| 12g | Add to nav graph | `ui/MhubApp.kt` | Route: `order-tracking/{orderId}` |

---

### P2-13: Seller Analytics Dashboard

**Effort:** 2 days

| Step | Task | File(s) | Details |
|---|---|---|---|
| 13a | Create `SellerDashboardScreen` | `ui/seller/SellerDashboardScreen.kt` | KPI cards + charts |
| 13b | Wire existing API | `data/remote/MhubApi.kt` | `sellerAnalytics()` already exists → returns `totalViews`, `totalInquiries`, `soldPosts`, `totalRevenue`, `activePosts` |
| 13c | Add sparkline charts | `ui/seller/SellerDashboardScreen.kt` | Simple Canvas-drawn line charts for views over time |
| 13d | Per-post analytics | `ui/seller/SellerDashboardScreen.kt` | List of seller's posts with individual view/inquiry/conversion counts |
| 13e | Revenue tracking | `ui/seller/SellerDashboardScreen.kt` | Monthly/weekly revenue with growth % indicators |

---

### P2-14: Image Optimization

**Effort:** 1 day

| Step | Task | File(s) | Details |
|---|---|---|---|
| 14a | Server-side resize | Server | Generate thumbnails: 150px (list), 400px (card), 800px (detail) on upload |
| 14b | WebP conversion | Server | Convert all uploads to WebP (30-50% smaller than JPEG) |
| 14c | Request appropriate size | Client | Product cards request `?w=400`, detail requests `?w=800`, zoom requests original |
| 14d | Progressive loading | `ui/components/PostCard.kt` | Load 150px blur placeholder → swap to full image |
| 14e | Validate current config | `MhubApplication.kt` | Already set: 150MB disk cache, 30% memory cache, 150ms crossfade, `respectCacheHeaders(false)` |

---

### P2-15: Deep Linking

**Effort:** 1–2 days

| Step | Task | File(s) | Details |
|---|---|---|---|
| 15a | Add intent filters | `AndroidManifest.xml` | Handle: `https://mhub.app/product/{id}`, `/category/{key}`, `/profile/{userId}` |
| 15b | Add App Links verification | Server | Host `/.well-known/assetlinks.json` with app signing fingerprint |
| 15c | Handle in NavHost | `ui/MhubApp.kt` | Parse incoming `Intent.data` URI → extract route → navigate |
| 15d | Synthetic back stack | `ui/MhubApp.kt` | Deep link to product should create stack: Home → Category → Product |
| 15e | Share generates links | `ui/components/ShareLinkBottomSheet.kt` | "Share" button creates `https://mhub.app/product/{id}` link |
| 15f | Social meta tags | Server | `<meta og:title>`, `og:image>`, `og:description` for shared links |

---

## P3 — Nice-to-Have (Month 1-2)

### P3-16: Voice Search
**Effort:** 1–2 days

| Step | Task | Details |
|---|---|---|
| 16a | Add mic icon | Trailing icon in search TextField |
| 16b | Launch SpeechRecognizer | `RecognizerIntent.ACTION_RECOGNIZE_SPEECH` via `ActivityResultLauncher` |
| 16c | Auto-search on result | Fill query field and trigger search |
| 16d | Handle permission | `RECORD_AUDIO` permission request |

### P3-17: AR Product Preview
**Effort:** 5+ days

| Step | Task | Details |
|---|---|---|
| 17a | Add ARCore dependency | `com.google.ar:core:1.44.0` + `io.github.sceneview:arsceneview:2.2.1` |
| 17b | Create ARPreviewScreen | CameraX surface + AR plane detection |
| 17c | 3D model loading | Load `.glb` models for products tagged with 3D assets |
| 17d | Fallback | "AR not available" for devices without ARCore |

### P3-18: Video Reviews
**Effort:** 3 days

| Step | Task | Details |
|---|---|---|
| 18a | Video capture | CameraX or gallery picker |
| 18b | Upload with progress | Chunked multipart upload with progress bar |
| 18c | Video player | ExoPlayer/Media3 inline in review cards |
| 18d | Server transcoding | H.264 MP4, thumbnail extraction |

### P3-19: Price Alerts
**Effort:** 2 days

| Step | Task | Details |
|---|---|---|
| 19a | "Set Alert" button | Product detail + wishlist items |
| 19b | Target price input | User enters desired price |
| 19c | Server monitoring | Cron checks price changes → FCM push |
| 19d | Notification | "Price dropped! iPhone 15 now ₹59,999" |

### P3-20: Seller Verification Badges
**Effort:** 1 day

| Step | Task | Details |
|---|---|---|
| 20a | Badge types | ✅ Verified, ⭐ Top Seller, 🏆 Premium |
| 20b | Display on cards | Badge icon next to seller name in post cards |
| 20c | Badge detail | Bottom sheet on tap explaining badge criteria |

### P3-21: Multi-Language Content
**Effort:** 2–3 days

| Step | Task | Details |
|---|---|---|
| 21a | Server translation | Store title/description in multiple languages |
| 21b | Locale header | `LocaleInterceptor` already sends `Accept-Language` |
| 21c | Fallback chain | Requested → English → original |

### P3-22: App Rating Prompt
**Effort:** 0.5 day

| Step | Task | Details |
|---|---|---|
| 22a | Add Play Review API | `com.google.android.play:review-ktx:2.0.2` |
| 22b | Trigger condition | After 3rd purchase OR 7 days of daily use |
| 22c | Rate limit | Maximum once per 30 days |

---

## File Map

Files modified/created across all phases:

| File | Phases | Purpose |
|---|---|---|
| `ui/MhubApp.kt` | P0-1,2,4 / P1-6 / P2-12,15 | Main NavHost, routing, MainShell |
| `ui/checkout/CheckoutScreens.kt` | P0-1 / P2-11 | Checkout flow UI |
| `ui/checkout/CheckoutViewModel.kt` | P0-1 | **NEW** — checkout state management |
| `ui/commerce/CommerceScreens.kt` | P0-3 | Sell/PostWelcome screen |
| `ui/discover/DiscoverScreen.kt` | P0-4 | **NEW** — Explore tab redesign |
| `ui/discover/DiscoverViewModel.kt` | P0-4 | **NEW** — discovery data loading |
| `ui/search/SearchScreen.kt` | P1-5 / P3-16 | Search empty state + trending + voice |
| `ui/home/CategoryHubScreen.kt` | P1-6 | Badge counts on header icons |
| `ui/nearby/NearbyScreen.kt` | P1-7 | Map view + list/map toggle |
| `ui/legal/LegalScreens.kt` | P1-8 | Admin panel (already built, polish) |
| `ui/settings/SettingsScreen.kt` | ✅ Done | Clear cache + logout (already fixed) |
| `ui/orders/OrderTrackingScreen.kt` | P2-12 | **NEW** — order tracking |
| `ui/seller/SellerDashboardScreen.kt` | P2-13 | **NEW** — seller analytics |
| `data/remote/MhubApi.kt` | P0-1 / P1-5 / P2-10,11,12 | API endpoint definitions |
| `data/remote/dto/Dtos.kt` | P0-1 / P2-12 | Data transfer objects |
| `data/repository/OrderRepository.kt` | P0-1 / P2-12 | **NEW** — order management |
| `ui/navigation/Routes.kt` | P0-4 / P2-12,15 | Route constants |
| `build.gradle.kts` | P1-7 / P2-10,11 / P3-17,22 | Dependencies |
| `AndroidManifest.xml` | P1-7 / P2-10,15 | Permissions, API keys, deep links |
| `service/MhubMessagingService.kt` | P2-10 | **NEW** — FCM handling |
| `payment/PaymentManager.kt` | P2-11 | **NEW** — Razorpay + UPI |

---

## Testing Checklist

### P0 Smoke Tests (Gate: Must Pass Before Beta)

```
[ ] CHECKOUT: Add item → Cart → Address → Payment → Review → Place Order → Confirm shows real order ID
[ ] CHECKOUT: Simulate API failure → Failed screen → Retry navigates back to Review
[ ] CHECKOUT: Order appears in "My Orders" / "Bought Posts" after completion
[ ] NAV: Home → Electronics category → Product detail → Profile tab → Back → returns to Product detail
[ ] NAV: Switch tabs: Home → Profile → Rewards → Home → scroll position preserved
[ ] NAV: Double-back on Home root → "Press again to exit" toast → second back exits
[ ] NAV: All 5 bottom tabs reachable, each preserves state on revisit
[ ] SELL: PostWelcome → "Start Listing" visible without scrolling → tapping opens Create Post
[ ] SELL: Non-KYC user → KYC gate shown before Create Post
[ ] TABS: Home and Explore show visually distinct content
[ ] TABS: Explore has discovery elements (trending/for-you/new)
```

### P1 Smoke Tests (Gate: Must Pass Before Public Launch)

```
[ ] SEARCH: Open with no query → shows "Recent Searches" chips
[ ] SEARCH: Tap recent chip → query runs
[ ] SEARCH: "Clear All" → history removed
[ ] SEARCH: "Trending" section visible below recent
[ ] HOME: Notification bell has unread count badge
[ ] HOME: Cart icon has item count badge  
[ ] HOME: Bottom nav bar visible ✅ (already fixed)
[ ] NEARBY: Toggle list ↔ map view
[ ] NEARBY: Map shows markers at post locations
[ ] NEARBY: Tap marker → post preview bottom sheet
[ ] ADMIN: Non-admin → "Access Denied"
[ ] ADMIN: Admin → dashboard loads with stats
[ ] OFFLINE: Airplane mode → banner appears in < 3s
[ ] OFFLINE: Cached posts still load from Room DB
[ ] OFFLINE: Banner dismisses when connectivity returns
```

### Performance Benchmarks

```
[ ] Cold start: < 2 seconds to first meaningful paint on mid-range device
[ ] Scroll: Consistent 60fps in product listing with 100+ items (no jank)
[ ] Image loading: Thumbnails visible within 500ms on 4G
[ ] Memory: < 200MB RAM after 10 minutes of active browsing
[ ] Cache: Second visit to any category loads instantly from Room
[ ] APK size: < 25MB (compressed)
[ ] Network: < 500KB data for initial home screen load
```

### Device Compatibility

```
[ ] 5.0" screen (320dp width): All CTAs visible, no overflow
[ ] 6.5" screen (411dp width): Good use of space, no awkward gaps
[ ] Tablet 10" (600dp width): Not broken (stretch goal: tablet layout)
[ ] Android 8.0 (API 26): All features work
[ ] Android 14 (API 34): Predictive back gesture works
[ ] RTL layout: Arabic/Hebrew text direction correct
```

---

## Risk Register

| # | Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|---|
| 1 | Server `/api/orders/create` not implemented | P0-1 completely blocked | High | Use existing `/api/transactions/initiate` as fallback; build order wrapper on client |
| 2 | Google Maps API key cost at scale | $7/1000 loads after free tier (28K/mo) | Medium | Monitor usage, add MapBox as cheaper fallback, cache map tiles |
| 3 | Razorpay KYC approval delayed | P2-11 launch blocked | Medium | Launch with COD-only + manual UPI, add gateway later |
| 4 | FCM token delivery failures | Silent push failures, users miss orders | Low | Retry token registration with exponential backoff; add in-app polling fallback |
| 5 | AR not supported on budget phones | P3-17 limited to ~40% of devices | High | Make AR strictly optional; show "Not supported" gracefully; skip for MVP |
| 6 | Navigation back stack regression | P0-2 re-breaks in future changes | Medium | Add navigation instrumentation tests; document nav architecture in README |
| 7 | Room DB migration failures | App crashes on update for existing users | Low | Use `fallbackToDestructiveMigration()` for debug; proper migration scripts for release |
| 8 | Image OOM on low-RAM devices | Crash on product grid scroll | Low | Coil already configured with 30% memory limit; add `crossfade` and `size(ViewSizeResolver)` |

---

## Timeline Summary

| Phase | Items | Duration | Cumulative | Launch Gate |
|---|---|---|---|---|
| **P0** | 4 items | 5–7 days | Week 1 | Beta launch |
| **P1** | 5 items | 5–7 days | Week 2 | Public launch |
| **P2** | 6 items | 8–12 days | Week 4 | Growth features |
| **P3** | 7 items | 10–15 days | Week 7 | Feature-complete v1 |

### Suggested Sprint Plan

**Sprint 1 (Days 1-3):** P0-1 (Checkout) + P0-2 (Nav verification)  
**Sprint 2 (Days 4-5):** P0-3 (Sell CTA) + P0-4 (Home vs Explore)  
**Sprint 3 (Days 6-8):** P1-5 (Search) + P1-6 (TopBar badges) + P1-9 (Offline)  
**Sprint 4 (Days 9-12):** P1-7 (Nearby map) + P1-8 (Admin polish)  
**Sprint 5 (Days 13-18):** P2-10 (FCM) + P2-11 (Razorpay)  
**Sprint 6 (Days 19-24):** P2-12 (Order tracking) + P2-13 (Seller analytics)  
**Sprint 7 (Days 25-28):** P2-14 (Image) + P2-15 (Deep links)  
**Sprint 8+ (Days 29+):** P3 items based on user feedback priority  

---

*Last updated: May 17, 2026*  
*Next review: After P0 completion*

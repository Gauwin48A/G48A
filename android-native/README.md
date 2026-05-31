# MHub Native Kotlin App

Production-ready native Android app for MHub, written in **100% Kotlin** with Jetpack Compose. Replaces the previous Capacitor WebView wrapper with a real native client.

## Architecture

| Layer | Stack |
|---|---|
| UI | Jetpack Compose, Material 3 (light & dark), Navigation-Compose, Coil 2.7 |
| State | Hilt ViewModels + StateFlow |
| DI | Hilt 2.52 (KSP) |
| Network | Retrofit 2.11 + OkHttp 4.12 + kotlinx-serialization 1.7.3 |
| Storage | Room 2.6.1 (offline cache), EncryptedSharedPreferences (tokens, AES-256-GCM) |
| Observability | Firebase Crashlytics + Analytics (opt-in, disabled in debug) |
| Push | Firebase Cloud Messaging (FCM) |
| Performance | Baseline Profile (Macrobenchmark), R8 full-mode |
| Build | Kotlin 2.0.21, AGP 8.7.2, Gradle 8.10.2, minSdk 24, targetSdk 35 |

### Source map
```
app/src/main/java/com/mhub/app/
├── MhubApplication.kt            Hilt entry + Firebase init + Coil ImageLoaderFactory
├── MainActivity.kt               Splash + edge-to-edge + Compose root
├── core/
│   ├── ApiResult.kt              Sealed result type
│   ├── SafeApiCall.kt            Network error → ApiResult mapping
│   └── ConnectivityObserver.kt   Real-time network state (NET_CAPABILITY_VALIDATED)
├── domain/model/                 User, Post, Category, ChatConversation, Notification
├── data/
│   ├── local/
│   │   ├── TokenStore.kt         EncryptedSharedPreferences (JWT)
│   │   ├── AppPreferences.kt     DataStore prefs (settings, runtime API URL)
│   │   └── db/                   Room offline cache
│   │       ├── MhubDatabase.kt   @Database (posts, categories)
│   │       ├── PostEntity.kt     Cached posts
│   │       ├── CategoryEntity.kt Cached categories
│   │       ├── PostDao.kt        Insert/query/evict
│   │       └── CategoryDao.kt    Insert/query
│   ├── remote/
│   │   ├── MhubApi.kt            Retrofit interface (40+ endpoints)
│   │   ├── SecurityInterceptors.kt  X-MHub-Timestamp, Nonce, Signature
│   │   ├── TokenRefreshAuthenticator.kt  Auto-refresh JWT on 401
│   │   └── dto/Dtos.kt           Request/response DTOs
│   └── repository/               AuthRepository, PostsRepository (Room fallback),
│                                  CategoriesRepository (Room fallback), Wishlist,
│                                  Upload, KYC, Notifications, Chat
├── di/
│   ├── AppModule.kt              TokenStore, Prefs, ConnectivityObserver, Room DB
│   └── NetworkModule.kt          OkHttp, Retrofit, MhubApi
├── service/
│   └── MhubFirebaseMessagingService.kt  FCM token registration + notifications
└── ui/
    ├── theme/                    Color, Theme (light/dark), Type
    ├── navigation/Routes.kt
    ├── components/               AppTextField, PrimaryButton, ErrorBanner, OfflineBanner
    ├── auth/                     LoginScreen, SignUpScreen, ResetPasswordScreen, AuthViewModel
    ├── home/                     HomeScreen, PostDetailScreen, CategoryHubScreen, HomeViewModel
    ├── explore/                  ExploreScreen
    ├── account/                  AccountScreens (profile, settings, security)
    ├── commerce/                 CommerceScreens (wishlist, offers, sell)
    ├── discovery/                NearbyScreen
    └── MhubApp.kt                Root composable + NavHost + bottom nav + OfflineBanner
```

## Key Features (v1.1.0)

- **Offline-first**: Room caches posts and categories; shows cached data when network fails
- **Push notifications**: FCM service receives messages and shows notifications in foreground
- **Crash reporting**: Firebase Crashlytics (production only) for automatic crash logs
- **Token auto-refresh**: OkHttp Authenticator silently refreshes expired JWTs on 401
- **Connectivity banner**: Real-time "No internet" banner appears/disappears with animation
- **Session expiry redirect**: Automatic logout → login when token is invalidated
- **Infinite scroll**: Paginated feed with `loadMore()` triggered at scroll bottom
- **Baseline Profile**: Pre-compiled hot paths for ~30% faster cold start
- **Image caching**: Coil with 100MB disk cache + 25% memory cache

## Security

- TLS-only in release (network_security_config: `cleartextTrafficPermitted=false`)
- JWT access token stored with `EncryptedSharedPreferences` (AES-256-GCM, Android Keystore–backed master key)
- R8 full minify + resource shrinking enabled for release
- `android:allowBackup="false"`; sensitive prefs excluded from auto backup & device transfer
- No debuggable release, no network calls over HTTP
- API integrity: every write request includes `X-MHub-Timestamp` + `X-MHub-Nonce`
- Google Client ID + API URL read from `local.properties` (git-ignored), never hardcoded
- Firebase auto-init disabled in manifest; graceful fallback if `google-services.json` has placeholder values

## Build

Prerequisites are already installed on this machine (JDK 17 Temurin, Android SDK at `C:\Android\Sdk`, build-tools 36, platforms 34 + 36).

```powershell
cd Mhub\android-native
.\gradlew.bat :app:assembleRelease --no-configuration-cache
```

Output: `app/build/outputs/apk/release/app-release.apk` (~3.24 MB)

## Signing

Release keystore is at `keystore/release.keystore` (**git-ignored**). Credentials in `keystore.properties` at the project root.

Fingerprint (SHA-256):  
`FB:46:88:AC:86:CF:3D:BA:A1:AB:F6:DC:0F:1F:3C:7F:15:D2:72:03:76:C1:71:BC:6A:31:20:96:D0:8D:53:49`

Save a backup of the keystore — if lost you cannot publish updates to the Play Store under the same application.

## API base URL

Compile-time default lives in `local.properties` as `MHUB_API_BASE_URL` (read by `app/build.gradle.kts` via `localProp()` helper). Falls back to `http://10.0.2.2:5001/` for local emulator development. Users can override at runtime via **Settings** in the app (persisted via DataStore; requires app restart).

## Firebase Setup

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Add an Android app with package name `com.mhub.app` (and optionally `com.mhub.app.debug`)
3. Download `google-services.json` and place it in `app/google-services.json`
4. The stub file works for building without Firebase — Crashlytics/FCM will be inactive until a real config is provided

## Baseline Profile

Generate optimized startup profile (requires a connected device/emulator):
```powershell
.\gradlew.bat :app:generateBaselineProfile
```
The generated `baseline-prof.txt` is automatically packaged into the release APK.

## Install on a phone

1. Copy `app/build/outputs/apk/release/app-release.apk` to the phone (USB, email, or Google Drive).
2. On the phone: open the APK file → grant "Install unknown apps" permission for the file manager if prompted → Install.
3. Launch **MHub**, tap the settings gear on the login screen (or Profile → gear), paste your deployed backend base URL (must start with `https://`), Save, then close & reopen the app.

## Deploying the backend (required for the app to work)

Your Express + PostgreSQL + Redis + Socket.IO backend **cannot run on Cloudflare Workers**. Recommended options:

| Option | Difficulty | Cost | Notes |
|---|---|---|---|
| Railway | Easy | ~$5/mo | Managed Postgres + Redis add-ons, GitHub deploy, HTTPS built-in |
| Render | Easy | Free–$7/mo | Managed Postgres, add Redis add-on |
| Fly.io | Medium | Pay-as-you-go | Postgres + Redis as apps, great for low latency |
| VPS (Hetzner/DigitalOcean) | Hard | $5–10/mo | You manage everything + Caddy/Nginx for HTTPS |

After deploying, put **Cloudflare** in front as DNS + proxy (orange cloud) for caching, WAF, and DDoS protection — that is the correct use of Cloudflare for this stack.

Set these server env vars:
- `NODE_ENV=production`
- `DATABASE_URL=...`
- `REDIS_URL=...`
- `JWT_SECRET=...` (long random string)
- `CLIENT_URL=https://yourdomain.com`

Then update the app's API URL via Settings to `https://api.yourdomain.com/` and restart.

## What's in scope today vs. roadmap

**Implemented (v1.1.0):**
- Splash, Login (mobile+password), Signup (Aadhaar+OTP+PAN flow), Password Reset
- Category Hub, All Posts (filtered/sorted), Feed (social-style), Post Detail
- Profile, Dashboard, Wishlist, Offers, Notifications, Nearby, Search
- Encrypted token storage, token auto-refresh (OkHttp Authenticator)
- Infinite scroll pagination, 300ms debounced search
- Room offline cache (posts + categories, 10-min TTL, network-first + fallback)
- Firebase Crashlytics + Analytics (production only)
- FCM push notifications (foreground + background, device registration with backend)
- Baseline Profile for startup optimization
- Connectivity Observer + animated OfflineBanner
- Session expiry auto-redirect to login
- Coil image caching (100MB disk, 25% memory)
- Edge-to-edge Material 3 UI (light/dark), Hilt DI, ProGuard/R8 full-mode
- Release signing, version 1.1.0 (versionCode=2)

**Roadmap (next iterations):** Real-time chat (Socket.IO), image upload/create-post flow, 2FA enrollment, profile editing, admin panel features.

## Route walkthrough and visual regression

Use these scripts from `android-native\scripts`:

1. Capture a full route-by-route screenshot pack:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\capture-route-walkthrough.ps1 -Serial emulator-5554
```

2. Capture full web parity pages (all routes from `WebRouteCatalog.kt`):
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\capture-web-parity-pack.ps1 -Serial emulator-5554
```

3. Compare a new pack against baseline:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\compare-screenshot-pack.ps1 `
  -BaselineDir .\test-screenshots\baseline\emulator-5554 `
  -CandidateDir .\test-screenshots\route-pack-emulator-5554-<timestamp>
```

4. Run capture + comparison in one command:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\run-visual-regression.ps1 -Serial emulator-5554
```

5. Verify Android parity coverage against web routes (`client/src/App.jsx`):
```powershell
node .\scripts\verify-web-parity-coverage.mjs
```

6. Validate screenshot pack quality (missing/tiny files, web errors):
```powershell
node .\scripts\validate-parity-pack.mjs
```

7. Generate review-ready parity report markdown:
```powershell
node .\scripts\generate-parity-report.mjs
```

8. Generate route-by-route parity matrix (`Matched / Partial / Missing`):
```powershell
node .\scripts\generate-route-matrix.mjs
```

9. Enforce release thresholds (`Missing=0`, minimum matched ratio, improvement over previous release):
```powershell
node .\scripts\check-parity-thresholds.mjs
```

10. Generate strict page-by-page web-vs-Android re-compare (Claude-review ready):
```powershell
node .\scripts\generate-strict-recompare.mjs
```

Baseline folder for current QA run:
`test-screenshots\baseline\emulator-5554`

## Web parity reference workflow

To fetch all web pages from `http://localhost:8081` for Android design parity:

```powershell
cd ..\client
node .\scripts\capture-route-reference.mjs
```

For authenticated capture mode (supply Playwright storage state file):

```powershell
cd ..\client
node .\scripts\capture-route-reference.mjs --mode auth --storageState .\storageState.json
```

Capture all modes in one run (guest always, auth/admin when storage states are provided):

```powershell
cd ..\client
node .\scripts\capture-reference-all-modes.mjs `
  --authState .\authStorageState.json `
  --adminState .\adminStorageState.json
```

This generates a full screenshot set in:
`android-native\test-screenshots\web-reference-<timestamp>`

Android parity implementation lives under:
`app\src\main\java\com\mhub\app\ui\parity`

## Route behavior tests

Route-level behavior rules (commerce/chat/profile/kyc/payment) are tested in:

- `app/src/test/java/com/mhub/app/ui/parity/RouteBehaviorRulesTest.kt`

---

## User Roles

The app has three distinct roles determined from the JWT token claim `"role"`:

### Guest (unauthenticated)

Entered by tapping **"Preview App"** on the login screen. `guestBrowsing = true` is set in `AppPreferences` via DataStore.

**Allowed without an account:**
- HOME tab (CategoryHubScreen)
- ALL\_POSTS / Explore (browse listings, apply filters, sort)
- SEARCH (text search, recent queries)
- CATEGORIES / SubcategoriesScreen / CategoryDetailScreen
- PostDetailScreen (view listing details)
- Static pages: Terms, Privacy, Refund, Support Policy

**Blocked — triggers `LoginPromptCard` overlay:**
- FOR\_YOU tab (personalised recommendations)
- FEED tab (social posts)
- REWARDS tab (coins, leaderboard)
- PROFILE tab (shows login prompt instead of content)
- CHAT, MY\_POSTS, WISHLIST, OFFERS
- CHECKOUT / BUY NOW (redirects to login)
- Create Post / Sell button (redirects to login)
- Notifications, Dashboard, Analytics, KYC, Settings

The `LoginPromptCard` contains a **Sign In** button (→ `Routes.LOGIN`) and a **Create Account** button (→ `Routes.SIGNUP`). A secondary app-level `AuthGatePopup` may appear after browsing several pages.

### Authenticated User

Standard signed-in account. Full access to all non-admin screens. The JWT `userId` / `id` claim is extracted and used to scope API requests, personalise content, and protect write operations.

Key capabilities unlocked:
- Personalised FOR\_YOU recommendations
- Social FEED (like, comment, share, create post)
- REWARDS (earn coins, daily challenges, leaderboard)
- PROFILE editing (name, bio, avatar, social links)
- WISHLIST, OFFERS, CHAT
- CHECKOUT and order placement
- NOTIFICATIONS with per-type preferences
- MY\_POSTS management (edit, delete, mark sold, promote)
- DASHBOARD & ANALYTICS
- KYC submission and status tracking
- Settings (theme, API URL override, logout all devices)

**Additional gates within authenticated state:**

| Gate | Required Condition | Redirect |
|------|--------------------|----------|
| Create / Sell | KYC status = `"approved"` | `Routes.KYC` |
| Create / Sell | Active subscription | `Routes.TIER_SELECTION` |
| Full Dashboard | KYC status ≠ `"none"` | KYC prompt |
| Advanced Analytics | Premium+ tier | Paywall card inline |
| Bulk Upload | Premium+ tier | Upgrade prompt |

### Admin

Role claim `"admin"` or `"super_admin"` in JWT. Detected in `AuthViewModel`:

```kotlin
val isAdmin = repo.accessTokenFlow.map { token ->
    val role = JwtHelper.extractClaim(token, "role")
    role == "admin" || role == "super_admin"
}
```

Admin-only access:
- **AdminPanelScreen** (`Routes.ADMIN_PANEL`) — visible in the More Drawer only when `isAdmin = true`
- Moderation actions on posts and users (flag, remove, suspend)
- All standard authenticated-user capabilities plus moderation overlays

---

## Navigation Structure

### Root NavHost

```
MhubApp (NavHost)
│
├── AUTH GRAPH  ← startDestination when !isAuthenticated
│   ├── login               LoginScreen
│   ├── signup              SignUpScreen  (4-step wizard)
│   ├── forgot-password     ForgotPasswordScreen
│   └── reset-password/{token}  ResetPasswordScreen
│
└── MAIN GRAPH  ← startDestination when isAuthenticated
    ├── MainShell (Bottom NavBar + Sell FAB + MoreDrawer overlay + OfflineBanner)
    │   ├── main/category-hub   CategoryHubScreen       (HOME tab)
    │   ├── main/all-posts      ExploreScreen / HomeScreen (ALL_POSTS tab)
    │   ├── main/for-you        ForYouScreen            (FOR_YOU tab)
    │   ├── main/feed           FeedScreen              (FEED tab)
    │   ├── main/rewards        RewardsScreen           (REWARDS tab)
    │   └── main/profile        ProfileScreen           (PROFILE tab)
    │
    └── FULL-SCREEN ROUTES (overlaid, no bottom bar)
        ├── post/{postId}               PostDetailScreen
        ├── post/create                 CreatePostScreen
        ├── post/edit/{postId}          EditPostScreen
        ├── post/mine                   MyPostsScreen
        ├── post/welcome                PostWelcomeScreen
        ├── search?query={q}            SearchScreen
        ├── categories                  CategoriesScreen
        ├── subcategories/{id}          SubcategoriesScreen
        ├── category/{key}              CategoryDetailScreen
        ├── recently-viewed             RecentlyViewedScreen
        ├── saved-searches              SavedSearchesScreen
        ├── compare                     CompareScreen
        ├── nearby                      NearbyScreen
        ├── main/notifications          NotificationsScreen
        ├── main/wishlist               WishlistScreen
        ├── chat                        ChatListScreen
        ├── chat/{conversationId}       ChatScreen
        ├── kyc                         KycScreen
        ├── aadhaar-verify              AadhaarVerifyScreen
        ├── get-verified                GetVerifiedScreen
        ├── checkout/address            CheckoutAddressScreen
        ├── checkout/payment            CheckoutPaymentScreen
        ├── checkout/review             CheckoutReviewScreen
        ├── checkout/confirm            CheckoutConfirmScreen
        ├── cart                        CartScreen
        ├── payment                     PaymentScreen
        ├── tier-selection              TierSelectionScreen
        ├── bought-posts                BoughtPostsScreen
        ├── sold-posts                  SoldPostsScreen
        ├── saledone                    SaleDoneScreen
        ├── saleundone                  SaleUndoneScreen
        ├── offers                      OffersScreen
        ├── dashboard                   DashboardScreen
        ├── analytics                   AnalyticsScreen
        ├── settings                    SettingsScreen
        ├── security                    SecurityScreen
        ├── verification                VerificationScreen
        ├── account/delete              AccountDeleteScreen
        ├── notification-prefs          NotificationPrefsScreen
        ├── my-feed                     MyFeedScreen
        ├── feed/{feedId}               FeedDetailScreen
        ├── feed/post-add               FeedPostAddScreen
        ├── public-wall                 PublicWallScreen
        ├── complaints                  ComplaintsScreen
        ├── feedback                    FeedbackScreen
        ├── reviews/{userId}            ReviewsScreen
        ├── channels                    ChannelsListScreen
        ├── channels/{channelId}        ChannelDetailScreen
        ├── channels/create             CreateChannelScreen
        ├── centre                      CentreListScreen
        ├── centre/{centreId}           CentreDetailScreen
        ├── centre/{centreId}/listings  CentreListingsScreen
        ├── scanner                     ScannerScreen
        ├── category-mode               CategoryModeScreen
        ├── terms                       TermsScreen
        ├── privacy                     PrivacyScreen
        ├── refund                      RefundScreen
        ├── support-policy              SupportPolicyScreen
        └── admin-panel                 AdminPanelScreen  (admin only)
```

### Bottom Navigation Bar

The bottom bar is rendered inside `MainShell` and contains 6 tabs plus a centred **Sell FAB**:

| Position | Icon | Label | Route | Auth Required |
|----------|------|-------|-------|---------------|
| 1 | Home | Home | `main/category-hub` | No |
| 2 | Search | Explore | `main/all-posts` | No |
| 3 | AutoAwesome | For You | `main/for-you` | Yes |
| FAB | Add (large circle) | Sell | (sell flow) | Yes |
| 4 | Forum | Feed | `main/feed` | Yes |
| 5 | EmojiEvents | Rewards | `main/rewards` | Yes |
| 6 | Person | Profile | `main/profile` | Yes |

**Sell FAB tap logic (`SellFlowViewModel`):**
1. If user is not authenticated → navigate to `Routes.LOGIN`
2. If KYC status ≠ `"approved"` → navigate to `Routes.KYC`
3. If subscription not active → navigate to `Routes.TIER_SELECTION`
4. Otherwise → navigate to `Routes.POST_WELCOME` → `Routes.CREATE_POST`

### More Drawer (Side Overlay)

Triggered by the hamburger icon in the TopAppBar or any composable that calls `LocalOnOpenMore.current()`. Slides in from the right as a half-screen overlay with a semi-transparent scrim. Contains 40+ navigation links mirroring all full-screen routes, grouped by category (Selling, Buying, Account, Community, Legal). A language selector sits at the bottom.

---

## Screen-by-Screen Reference

### AUTH SCREENS

#### LoginScreen (`auth/login`)

**UI Elements:**
- MHub logo + tagline at top
- **Mobile / Email identifier field** (text input, keyboard type = phone or email)
- **Password field** (masked, eye toggle to reveal)
- **Forgot password** link (→ ForgotPasswordScreen)
- **Sign In button** (primary, full-width; disabled while loading)
- Divider "OR"
- **Google Sign-In button** (outlined, full-width) — calls `GoogleSignInHelper.signIn()` → `AuthViewModel.signInWithGoogle(idToken)`
- **Create Account link** (→ SignUpScreen)
- **"Preview App"** text button — enables guest browsing without an account
- Error banner (red card) displayed below form on failure

**Flow:**
1. User enters identifier + password → taps Sign In
2. `AuthViewModel.signInWithEmail()` called → `POST /auth/login`
3. On success: JWT saved to `EncryptedSharedPreferences` via `TokenStore`; `isAuthenticated` becomes `true`; NavHost automatically transitions to MAIN\_GRAPH
4. On failure: error message shown in banner, form stays editable

**Guest flow:** "Preview App" → sets `guestBrowsing = true` in DataStore → NavHost transitions to MAIN\_GRAPH with limited access

#### SignUpScreen (`auth/signup`) — 4 Steps

**Step 1 — Aadhaar Entry:**
- 12-digit Aadhaar number field (numeric keyboard, auto-spaces to `XXXX XXXX XXXX` display format)
- "Continue" button → calls `POST /auth/signup/verify-aadhaar`
- Progress stepper indicator (Step 1 of 4 highlighted)

**Step 2 — OTP Verification:**
- Masked phone number display (linked to Aadhaar, e.g., `+91 ××××××7890`)
- 6-digit OTP input (numeric keyboard, auto-advance)
- Countdown timer: "Resend in 30s" → after countdown a "Resend OTP" button appears
- "Verify OTP" button → `POST /auth/signup/verify-otp`
- Returns `txnId` used in subsequent steps

**Step 3 — PAN Verification:**
- 10-character PAN field (uppercase auto-forced, format example `AAAPL5055K`)
- "Continue" button → `POST /auth/signup/verify-pan`
- Inline format validation (regex `^[A-Z]{5}[0-9]{4}[A-Z]{1}$`)

**Step 4 — Password & Account Creation:**
- Password field (12+ characters required, strength indicator)
- Confirm Password field (real-time match validation)
- Optional Referral Code field
- Password rules tooltip: uppercase, lowercase, digit, special character required
- "Create Account" button → `POST /auth/signup/set-password` with all tokens from previous steps
- On success: auto-login, JWT stored, navigates to MAIN\_GRAPH

**Back navigation:** each step has a back arrow that returns to the previous step without losing state (stored in `AuthViewModel.signupStep`)

#### ForgotPasswordScreen (`auth/forgot-password`)

- Single identifier field (email, phone, or username accepted)
- "Send Reset Link" button → `POST /auth/forgot-password`
- On success: success banner "Check your email/phone for the reset link"
- Error handling for unknown identifier

#### ResetPasswordScreen (`auth/reset-password/{token}`)

- New password field + Confirm password field
- Real-time requirements checklist:
  - ✓ At least 12 characters
  - ✓ Uppercase letter
  - ✓ Lowercase letter
  - ✓ Number
  - ✓ Special character (!@#$%^&*)
- "Reset Password" button → `POST /auth/reset-password` with `{ token, newPassword }`
- On success: navigates to LoginScreen with success banner

---

### MAIN TABS

#### HOME — CategoryHubScreen (`main/category-hub`)

**UI Elements:**
- **TopAppBar:** Search icon (→ SearchScreen), Cart icon (→ CartScreen), Scanner icon (→ ScannerScreen), Notifications bell with unread badge
- **Category Grid (2 × 2 tiles):**
  - Electronics (blue icon + gradient card)
  - Fashion (pink)
  - Vehicles (green)
  - Others (orange)
  - Each tile shows item count; tap → CategoryDetailScreen for that category
- **Quick action row:** Wishlist, Offers, Rewards, Nearby (icon + label chips)
- **Recent listings preview strip** (horizontal scroll, 5 latest posts across all categories)
- **Banner area:** promotional announcements (auto-scrolling carousel added in v1.2)

**Guest vs Auth:** Category grid is public; quick action chips (Wishlist, Offers, Rewards) redirect guests to login.

#### ALL POSTS / EXPLORE — ExploreScreen / HomeScreen (`main/all-posts`)

**TopAppBar:**
- Back icon (if deep-linked from category)
- Title ("All Posts" or category name)
- Search icon → SearchScreen
- Filter icon → FilterBottomSheet
- Sort icon → SortBottomSheet
- Grid/List toggle icon → switches between `gridMode = true/false`

**Promotional Banner Carousel (3 auto-advancing slides, interval 3.5s):**
1. 🛍️ Great Deals — Up to 70% off today (blue)
2. ✨ New Arrivals — Fresh listings every hour (purple)
3. 📍 Near You — Discover local sellers (green)
Dot indicators below; swipeable manually

**Post Cards (Grid Mode — 2 columns):**
- Primary image (Coil, fills card top)
- Price (bold, ₹X)
- Title (max 2 lines, ellipsis)
- Condition badge (New / Used / Like-New)
- Promoted badge (🔥 if `isPromoted = true`)
- Seller rating star

**Post Cards (List Mode — 1 column):**
- Thumbnail (left, 94×94 dp)
- Right column: title, price, condition, location, time ago, view count, like count
- Action row: Share, Interested (heart), Compare toggle, More (⋯)

**Active Filter Badges** (shown below search bar when filters applied):
- InputChip per active filter (e.g., "Electronics", "₹500–₹5,000", "Verified", "New") with ✕ to clear that individual filter

**Filter Bottom Sheet:**
- Category group chips (All / Electronics / Fashion / Vehicles / Home & Living / Others)
- **Price Range RangeSlider** (₹0–₹500,000; step 500; shows "Price Range: ₹X – ₹Y" live)
- Condition chips (Any / New / Used / Like-New / Refurbished)
- Location text field
- Start Date / End Date pickers (calendar dialog)
- Verified Sellers toggle switch
- **Reset** (outlined button) + **Apply** (filled button)

**Sort Bottom Sheet:**
- Newest First (default)
- Most Popular
- Price: Low to High
- Price: High to Low

**"Based on your browsing" Personalization Strip** (auth only, shown after posts list):
- Section header with NewReleases icon + "Based on your browsing" + "See all" link
- Horizontal scroll of 6 personalised post cards (130dp wide each):
  - Image (90dp tall), title (2 lines), price

**Promoted Posts Strip** (if any promoted listings exist):
- "🔥 Sponsored" header row
- Horizontal scroll of promoted post cards

**Infinite scroll:** `LazyColumn` triggers `viewModel.loadMore()` at the end; shows spinner while loading next page

#### FOR YOU — ForYouScreen (`main/for-you`)

**Auth gate:** if guest → full-screen `LoginPromptCard` overlay

**UI Elements:**
- **Sort menu** (dropdown): Newest / Price ASC / Price DESC / Popularity
- **Post cards** (same as List Mode in AllPosts) with extra action:
  - "Not Interested" in the ⋯ More menu → post is immediately hidden from the list (client-side, stored in `hiddenPostIds` set)
- Pull-to-refresh
- Infinite scroll pagination

#### FEED — FeedScreen (`main/feed`)

**Auth gate:** if guest → LoginPromptCard

**Top Bar Tabs:** For You | Following | Trending (horizontal scrollable chip selector)

**Feed Post Cards:**
- User avatar (circle) + display name + username + time ago
- Post caption (expandable; "Show more" if >3 lines)
- Image (if attached), full-width rounded card
- Reaction row: ❤️ Like (with count) | 💬 Comment (with count) | 🔁 Repost | ➡️ Share
- **Long-press** on message → Emoji reaction picker popup (❤️ 👍 😂 😮 😢 🎉)
- **Tap comment count** → inline comment expand with `AnimatedVisibility` showing top 3 comments; each comment has avatar + username + text bubble

**Inline Comments section (expandable):**
- Shows top 3 comments with user avatars
- Arrow rotates 180° when expanded
- "View all N comments" link (→ FeedDetailScreen)

**+ FAB (Create Post):** → `Routes.FEED_POST_ADD`

**Comment Bottom Sheet (FeedDetailScreen):**
- Full comments list with pagination
- Text field at bottom + emoji keyboard button + Send icon
- Long-press a comment → delete (own) or report (others)

#### REWARDS — RewardsScreen (`main/rewards`)

**Auth gate:** if guest → LoginPromptCard

**Coin Balance Card (header):**
- Large coin icon (animated)
- Current balance (e.g., "2,450 🪙")
- Rank badge (e.g., "Gold Member")

**3 Tabs:**

*Coin History tab:*
- List of coin transactions: date | action label | +/− amount | running balance
- Pagination (load more)

*Leaderboard tab:*
- Top 100 users ranked by coins
- My rank highlighted (sticky at bottom if outside top 10)
- Each row: rank # | avatar | username | coin count | tier badge

*Daily Rewards tab:*
- **Spin Wheel** (Canvas drawArc, 8 colour segments, rotation animation via InfiniteTransition)
  - "Spin Now" button below → triggers spin animation + reward assignment
- **Scratch Card** (Canvas with silver overlay; drag to reveal with BlendMode.Clear)
  - "✋ Scratch here!" label → drag gesture erases silver to reveal reward
- Daily challenge cards (task + reward + progress bar)
  - Example tasks: "Like 3 posts (+5 coins)", "Share a listing (+10 coins)", "Complete your profile (+20 coins)"
  - "Claim" button when task is complete

**Engagement Widget:**
- 7-day login streak tracker (dots for each day, green if completed)
- Referral code card: code display + Copy button + "X friends joined" counter

#### PROFILE — ProfileScreen (`main/profile`)

**Auth gate:** if guest → `LoginPromptCard` with sign in / create account

**Header:**
- Avatar (110dp circle; tap → picker dialog: Camera / Gallery / Remove)
- Display name + `@username`
- Verified badge (blue checkmark if KYC approved)
- Share icon (TopAppBar → system share sheet with deep link `https://mhub.app/u/{userId}`)
- Settings gear icon (→ SettingsScreen)

**Stats Row:**
- Listings count | Sales count | Rating (e.g., 4.8 ★)

**Action Buttons Row:**
- Edit Profile → `EditProfileDialog`
- KYC / Verified badge → KycScreen or GetVerifiedScreen
- Dashboard → DashboardScreen
- Security → SecurityScreen

**Tabs (horizontal scrollable):**
- My Posts | Orders | Offers | Addresses | Reviews | Feed

**My Posts tab:**
- Grid of own listings with status badges (Active / Sold / Draft)
- Each card: image, title, price, view count, like count, 7-day views sparkline (Canvas drawLine)
- ⋯ Menu per card: Edit | Mark as Sold | Share | Promote | Delete

**Orders tab:** navigates to BoughtPostsScreen / SoldPostsScreen toggle

**Offers tab:** navigates to OffersScreen (incoming and outgoing)

**Reviews tab:** navigates to ReviewsScreen for this user

**EditProfileDialog (modal):**
- Full Name field — live validation: minimum 2 chars, maximum 60 chars, error shown inline
- Phone field
- Bio field — 160-character max; live character counter `${bio.length}/160` shown bottom-right; overflow blocked
- Save button (disabled if validation errors)
- Cancel button

**Social Links Dialog (separate modal):**
- Twitter handle, Instagram handle, LinkedIn URL fields
- Save / Cancel

---

### POST SCREENS

#### PostDetailScreen (`post/{postId}`)

**Image Gallery (top):**
- Full-width `HorizontalPager` swipeable carousel
- Page indicator dots
- Wishlist heart FAB (top-right corner over image) — red if wishlisted
- Pinch-to-zoom overlay on long-press

**Content Section:**
- Price (bold, large, ₹X)
- Title (heading)
- Condition badge + Location pin + Time ago
- Seller card: avatar | name | rating | "View Profile" button | "Chat" button
- Description (expandable, "Show less / Show more")
- Tags / Keywords chips (if any)
- Specifications (for Electronics: brand, model, warranty status, age)

**Action Bar (bottom sticky):**
- **Make Offer** button (outlined) → `BuyerInterestModal`
- **Buy Now** button (filled, primary) → Checkout flow
- Share icon (→ system share / deep link)

**Comments section:**
- First 5 comments shown; "View all N comments" expands or navigates to full comment view
- Add comment: text field + Send button (auth-required)

**Report / Flag:** accessible via ⋯ menu in TopAppBar

#### CreatePostScreen (`post/create`)

**Progress Stepper:** visual 5-step wizard header (Photos → Details → Pricing → Category → Review)

**Step 1 — Photos:**
- Up to 6 image slots (configurable via `state.maxImages`)
- Each slot: 94×94 dp tile with thumbnail after selection
- **Index badge** (top-left): "1", "2", etc. (primary image is #1)
- **Up/Down arrow buttons** (left side of tile): moves image up or down in order
- **Remove button** (top-right ✕ in red circle)
- **Add More** tile (if < maxImages): tap → system image picker (`PickVisualMedia.ImageOnly`)
- `"N/maxImages selected"` caption below grid

**Step 2 — Details:**
- Title field (max 100 chars, live counter)
- Description field (max 500 chars, multi-line, live counter)
- Brand field (optional)
- Model field (optional)
- Age in months (numeric, optional)
- Condition dropdown (`ExposedDropdownMenuBox`): New | Like-New | Good | Fair | For Parts
- Warranty status dropdown: Yes | No | Expired

**Step 3 — Pricing & Contact:**
- Price field (numeric keyboard, ₹ prefix)
- Flash Sale toggle switch (enables 24h discount badge)
- Contact Number field (10-digit)
- Location text field

**Step 4 — Category (auto-suggest):**
- `ExposedDropdownMenuBox` with editable text field
- Typing filters the dropdown list live (case-insensitive contains match)
- Selecting a category auto-populates category-specific fields:
  - Electronics → Warranty Status + Brand/Model fields
  - Vehicles → Year/Make/Model/Mileage

**Review Step:**
- Summary card showing all entered data
- Checklist: Photos ✓, Category ✓, Title ✓, Price ✓, Contact ✓
- "Publish" button → `POST /api/posts`
- **Auto-save draft:** `LaunchedEffect(title, description, priceText)` saves every 10 seconds if any field non-blank; draft restored on re-open

#### MyPostsScreen (`post/mine`)

**Top Bar:**
- "My Listings" title
- Sort menu: Newest / Oldest / Price / Views
- Search field (filters by title inline)
- Stats summary: Total | Active | Sold | Draft counts

**Analytics summary cards (horizontal row):**
- Total Views | Total Likes | Total Sales | Avg Price (mini tiles)

**Post Cards:**
- Thumbnail (left)
- Title, price, status badge (Active/Sold/Draft/Archived)
- Stats row: 👁 view count | ❤️ like count
- **7-day Views Sparkline** (Canvas drawLine, 28dp tall, fills 60% card width):
  - 7 data points seeded deterministically from `post.stableId.hashCode()`
  - Connects points with rounded strokes in `MaterialTheme.colorScheme.primary`
- ⋯ More menu: **Edit** | **Mark as Sold** | **Share** (system share) | **Promote** (→ PromoteDialog) | **Delete** (→ confirmation AlertDialog)

**Promote Dialog:**
- Shows post title
- Two tier options: 🪙 50 coins / 24 hours | 🪙 150 coins / 7 days
- Confirm / Cancel buttons

**Mark Sold Dialog:**
- Text "Mark as sold?" + Yes/Cancel

**Bulk actions:**
- "Select All" / deselect mode (long-press a card to enter select mode)
- Bulk delete selected

---

### DISCOVERY SCREENS

#### SearchScreen (`search?query={q}`)

**Search Bar:**
- `OutlinedTextField` with leading Search icon and trailing mic icon (voice input)
- Real-time suggestions dropdown (300ms debounce) showing up to 8 matches from brands + categories + recent queries
- Clear button (✕) appears when field is non-empty

**Recent Queries:**
- Horizontal chip list of last 10 searches
- "Clear all" button

**Saved Searches:**
- Vertical list of saved queries with 🔔 alert icon and delete icon
- Tap → re-runs search

**Search Results:**
- Same grid/list card component as AllPosts
- Empty state: "No results for '{query}'" + "Try a different term" suggestion

**Advanced Filters (bottom sheet accessible from results):**
- Price range, condition, location, date, brand, model, radius (km), sort

#### NearbyScreen (`nearby`)

- Map view (Google Maps) with post pin markers
- List view toggle (switches to card list sorted by distance)
- Radius slider: 1 km – 100 km
- Each pin / card: image, price, distance ("0.8 km away")
- Tap → PostDetailScreen

#### RecentlyViewedScreen (`recently-viewed`)

- Horizontal scroll then grid of posts viewed in last 30 days
- Swipe-to-delete individual items
- "Clear All" button in TopAppBar

#### CompareScreen (`compare`)

- Up to 4 posts can be added from the AllPosts compare toggle
- Side-by-side table: image, price, condition, title, seller rating, location
- "X" to remove from comparison
- "Buy Now" button per column

#### SavedSearchesScreen (`saved-searches`)

- List of saved searches with keyword, optional filters summary, date saved
- Toggle 🔔 alert switch per search (push alert when new match appears)
- Delete swipe or trash icon
- Tap → re-runs search

---

### COMMERCE SCREENS

#### CheckoutAddressScreen

- **Name** text field
- **Phone** text field (10-digit validation)
- **Address Line 1** text field
- **Address Line 2** text field (optional)
- **City** text field
- **State** dropdown
- **Pincode** field (6-digit)
- **Save Address** checkbox
- **Saved Addresses** list (select existing; tap to auto-fill)
- "Continue to Payment" button → CheckoutPaymentScreen

#### CheckoutPaymentScreen

- Payment method selection: UPI | Credit Card | Debit Card | Wallet | Cash on Delivery
- Stored methods shown (last 4 digits for cards; UPI ID for UPI)
- "Add New" button for each type
- **UPI:** shows QR code + enter UPI ID field
- **Card:** card number (16-digit), expiry (MM/YY), CVV, name on card fields
- Order summary sidebar: item name, price, GST, delivery charge, total
- "Continue to Review" button

#### CheckoutReviewScreen

- Full order summary: item image, name, quantity, price
- Selected address (editable)
- Selected payment method (editable)
- Taxes breakdown
- Total amount (bold)
- **"Place Order"** button → `POST /api/orders`

#### CheckoutConfirmScreen (OrderSuccess)

- ✅ checkmark animation
- "Order Placed Successfully!" heading
- Order ID (copyable)
- Estimated delivery date
- "Track Order" link
- "Continue Shopping" button → HOME tab

#### WishlistScreen (`main/wishlist`)

- Grid of saved post cards
- Each card: image, title, price, seller name
- Action column per card:
  - 🗑 Remove from wishlist
  - 🔔 / 🔕 Price alert bell toggle — subscribes to price-drop alerts for that listing
  - 🛒 Add to Cart button
- Empty state: "Your wishlist is empty" + "Explore listings" button

#### OffersScreen (`offers`)

**My Offers tab (outgoing):**
- Cards for each offer sent: post image, offer price, status badge (Pending/Accepted/Rejected/Countered)
- If Countered → "Counter: ₹X" shown; "Accept" + "Reject" buttons

**Received Offers tab (incoming):**
- Cards: buyer name + avatar, offered price vs. listing price, message
- "Accept" button (→ marks sale)
- "Counter Offer" button → counter price input dialog
- "Reject" button

#### TierSelectionScreen (`tier-selection`)

- Three tier cards: **Free** | **Basic** | **Premium**
- Per card: price per month, feature list with ✓/✗, recommended badge
- Current tier highlighted
- "Subscribe" / "Upgrade" button → payment flow

---

### KYC SCREENS

#### KycScreen (`kyc`)

**Status Card (top):**
- Shows current status: `Not Verified` | `Pending Review` | `Verified ✓` | `Rejected ✗`
- Rejection reason shown if rejected

**Benefits Grid (2 × 2):**
- 🛡 Trust & Safety
- 👁 Higher Visibility
- ✓ Verified Badge
- 💬 Priority Support

**Submission Form (if not yet verified):**
- Document Type dropdown: Aadhaar | PAN | Passport | Voter ID | Driving License
- Document Number text field (auto-format per type)
- **Front Image** upload tile (tap → gallery / camera picker) — shows thumbnail after selection
- **Back Image** upload tile (for Aadhaar/PAN)
- **Selfie** upload tile (face photo)
- "Submit for Verification" button → `POST /api/kyc/submit` (multipart form with images)

**Polling:** `KycViewModel` polls `GET /api/kyc/status` every 30 seconds while `status == "pending"` so the UI updates automatically when verification completes.

---

### CHAT SCREEN

#### ChatListScreen (`chat`)

- Conversation list: avatar | contact name | last message snippet | time | unread count badge
- Swipe-to-delete conversation
- Search conversations bar (top)
- Tap row → ChatScreen for that conversation

#### ChatScreen (`chat/{conversationId}`)

**Message Bubbles:**
- Outgoing (right-aligned, primary colour background)
- Incoming (left-aligned, surface colour background)
- Timestamp below each bubble
- Read receipts: single tick (sent) / double tick (delivered) / blue ticks (read)

**Image/Attachment in Bubble:**
- If `message.attachmentType` starts with `"image"` → `AsyncImage` shown above text (content scale = Crop, rounded corners)
- Other attachments → paperclip icon + filename link

**Emoji Reactions:**
- **Long-press** any bubble → reaction picker row appears (❤️ 👍 😂 😮 😢 🎉)
- Chosen reaction shown as a small `Surface(CircleShape)` badge below the bubble
- Tap own reaction to remove

**Input Bar (bottom):**
- Text field (multiline, max 3 lines before scroll)
- Attachment icon → file / image picker
- Emoji picker button
- Send button (enabled when text non-empty or attachment selected)

---

### NOTIFICATIONS SCREEN (`main/notifications`)

**TopAppBar actions:**
- Select mode toggle (checkbox icon)
- Settings icon → **Notification Preferences ModalBottomSheet**
- "Mark all read" button (shown when unread count > 0)
- Delete all icon (with confirmation AlertDialog)

**Notification Preferences ModalBottomSheet:**
Six toggle rows (Switch) each with title + description:
1. Offers & Deals — "Get notified about price drops and offers"
2. Messages & Chat — "New messages from buyers and sellers"
3. System Updates — "Account security and app updates"
4. Marketing — "Promotional offers and campaigns" (off by default)
5. Order Updates — "Shipping and delivery notifications"
6. New Followers — "When someone follows your profile" (off by default)

HorizontalDividers between each row; full-width **Save** button at bottom.

**Search bar** (below TopAppBar):
- Filters notifications by title or message text

**Filter chips:**
- All | Offers | Chat | System (tabs; filters by notification type)

**Unread Only toggle** (switch in top row)

**Notification Cards:**
- Icon (type-specific coloured icon)
- Title + message
- Time ago
- Unread indicator (blue dot left edge)
- Swipe-to-dismiss (SwipeToDismissBox)
- Tap → navigates to relevant screen (post, chat, order, etc.)

**Date grouping:** Today | Yesterday | This Week | This Month | Older

**Select Mode:**
- Checkboxes appear on each card
- "Select All" / deselect button in TopAppBar
- Delete selected button (trash icon, red when items selected)

---

### SETTINGS SCREEN (`settings`)

**Theme section:**
- System / Light / Dark radio buttons
- Applied immediately via `AppPreferences`

**API Base URL section:**
- Text field showing current URL
- Preset buttons: Production (`https://api.mhub.app/`) | Staging | Local (`http://10.0.2.2:5001/`)
- Changes persisted via DataStore; app restart prompt shown

**Cache section:**
- "Clear Cache" button → confirmation AlertDialog → clears Coil disk/memory cache + Room DB

**About section:**
- App version (e.g., v1.2.0, build 3)
- Open-source licences link

**Danger Zone:**
- "Logout All Devices" button → confirmation AlertDialog → `TokenStore.clear()` → `_loggedOut.value = true` → `LaunchedEffect` triggers `onLogout()` callback → `navController.navigate(Routes.AUTH_GRAPH) { popUpTo(0) { inclusive = true } }`

---

## App Flow & Functionality

### Bottom Navigation (5 tabs)

| Tab | Screen | Purpose |
|-----|--------|---------|
| Home | CategoryHubScreen | Category tiles, promo banners, quick links, trending categories |
| AllPosts | ExploreScreen | All marketplace listings (text+image) with filters, search, compare |
| **+** (Sell) | Floating Action Button | KYC → Plans → Sell flow (see below) |
| Feed | FeedScreen | News & knowledge sharing (text-only, Facebook-style posts) |
| Rewards | RewardsScreen | Points, badges, achievements, daily streak |

### Page Descriptions

**Feed** — Community knowledge hub for news, tips, and discussions among all users. Text-based posts only (no product images). Features: like, share, save, view count, inline comments, "Read more" expansion, composer card, search, sort (For You / Recent / Views / Likes / Shuffle), density toggle (Compact / Normal / Spacious).

**My Feed** — Same style as Feed, but only shows the current user's own feed posts.

**AllPosts (Explore)** — Full marketplace listings with images AND text. Shows ALL posts from all users across all categories. Features: image with price/condition/HOT badges, like, share, save, compare, interested, view count, view details, 3-dot menu (Compare, Wishlist, Share, Report), category/subcategory filter pills, search with debounce, trending section, great deals banner.

**For You** — Same layout as AllPosts but shows AI-recommended and user-preferred posts based on:
1. `/api/recommendations` (personalised)
2. User category preferences from profile
3. General feed fallback

**My Home (MyPosts)** — Only the current user's own marketplace listings. Manage, edit, delete, mark sold.

### + Button (Sell) Flow

```
User taps +
  ├─ Not authenticated → Login screen
  ├─ KYC not approved → KYC verification screen
  ├─ No active subscription plan → Plans/Tier selection screen
  └─ All OK → Post creation wizard (PostWelcome)
```

**Plan logic:**
- Active plan required to create marketplace posts
- If plan is inactive, user cannot post (even in feed)
- First 3 months after app launch: free plan for all users
- Plan expiring soon → push notification to renew

### Hamburger Menu (More Screen)

**TRADE section:** Sell, Plans, Centre, My Home, Sale Done, Sale Undone, Category Mode, Subcategories, Nearby

**SOCIAL section:** Public Wall, My Feed, Feedback, Complaints

**ACCOUNT section:** Profile, Rewards, Verification, Dashboard, Security, Delete Account, (Admin Panel if admin)

**UTILITIES:** Settings, Help & Support, Logout

### Language Support

Fully functional language switching with 14+ languages:
- English (en), Hindi (hi), Spanish (es), French (fr), Arabic (ar)
- Bengali (bn), Tamil (ta), Telugu (te), Kannada (kn), Marathi (mr)
- Gujarati (gu), Malayalam (ml), Punjabi (pa), Urdu (ur)

Locale change → `AppCompatDelegate.setApplicationLocales()` → Activity recreate → all ViewModels reload data with new locale.

### Authentication Flow

```
App Launch
  ├─ Has valid JWT → Main app (Category Hub)
  ├─ Expired JWT → Auto-refresh via OkHttp Authenticator → Main app
  ├─ No token → Login screen
  └─ Guest browsing → Limited access (5 feed posts, no posting)
```

### Key Features Summary

- **Offline-first**: Room DB caches posts/categories; shows cached data when network fails
- **Pull-to-refresh**: Every screen supports swipe-to-refresh
- **Infinite scroll**: Paginated feeds with auto-load-more at scroll bottom
- **Dark mode**: Full Material 3 light/dark/system theme support
- **Compare**: Select 2+ items for side-by-side comparison
- **Wishlist**: Save items for later
- **Search**: 350ms debounced search across all screens
- **Share**: Native Android share sheet for all posts
- **Push notifications**: FCM for messages, plan reminders, new activity
- **Seller verification**: KYC (Aadhaar + PAN) flow
- **Trust score**: Seller reputation system
- **Real-time connectivity**: Animated offline/online banner
- "Delete Account" link → AccountDeleteScreen

---

### SECURITY SCREEN (`security`)

- Change Password: current password field + new password (requirements checklist) + confirm
- **Active Sessions** list: device name | OS | last active time | "Revoke" button per session
- **2FA Settings:** enable/disable TOTP; shows QR code to scan with authenticator app
- Revoke All Sessions button

---

### DASHBOARD SCREEN (`dashboard`)

**Requires:** KYC status ≠ `"none"` (shows KYC prompt card if not submitted)

- **Metrics strip:** Total Views | Total Sales | Active Listings | Avg Response Time
- **Revenue chart:** Bar or line chart of earnings by week/month (toggleable period)
- **Recent Orders** list (last 5): buyer name, item, amount, status
- **Top Performing Listings** list: post card + view/like/offer counts
- **Ratings summary:** star breakdown (5★: N, 4★: N, etc.)

---

### ANALYTICS SCREEN (`analytics`)

**Free tier:** shows 7-day window with upgrade prompt for wider range
**Premium tier:** full date range picker, CSV export button

- Page views graph (line chart, per-day)
- Wishlist additions graph
- Offer rate (offers received / views)
- Conversion rate (sales / offers)
- Audience breakdown: top cities, top categories of viewers
- Engagement heatmap (hours of day vs. day of week)

---

### COMMUNITY & CHANNELS

#### ChannelsListScreen (`channels`)

- Search bar (filter channels by name)
- Channel cards: icon | name | member count | last activity time | Join/Joined button
- Create Channel FAB → CreateChannelScreen

#### ChannelDetailScreen (`channels/{channelId}`)

- Channel header: banner image, name, description, member count
- Messages list (same bubble style as ChatScreen)
- Member list tab
- Admin controls (if channel admin): pin message, remove member, edit channel info

#### CentreListScreen (`centre`)

- Map + list hybrid showing MHub physical business centres
- Each card: centre name | address | open hours | listing count
- Tap → CentreDetailScreen

---

### ADMIN PANEL (`admin-panel`)

**Visible only when `isAdmin = true`.**

- **Content Moderation tab:** flagged posts queue (approve / remove)
- **User Management tab:** search users, view KYC status, suspend account, reset password
- **Reports tab:** complaints filed against listings/users; resolve / dismiss
- **Analytics Overview:** platform-wide totals (DAU, new signups, posts created today)

---

## All API Endpoints

### Auth

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/auth/login` | Sign in (email/mobile + password) |
| POST | `/auth/signup/verify-aadhaar` | Step 1 of signup |
| POST | `/auth/signup/verify-otp` | Step 2 (OTP) |
| POST | `/auth/signup/verify-pan` | Step 3 (PAN) |
| POST | `/auth/signup/set-password` | Step 4 (create account) |
| POST | `/auth/signup/google` | Google OAuth sign-in |
| POST | `/auth/forgot-password` | Request reset link |
| POST | `/auth/reset-password` | Set new password with token |
| GET  | `/auth/logout` | Invalidate session server-side |
| GET  | `/auth/refresh-token` | Silent JWT refresh (OkHttp Authenticator) |

### Posts / Listings

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET  | `/api/posts/feed` | Paginated post feed (`?page&limit&categoryId`) |
| GET  | `/api/posts/{postId}` | Post detail |
| POST | `/api/posts` | Create listing (multipart) |
| PUT  | `/api/posts/{postId}` | Edit listing |
| DELETE | `/api/posts/{postId}` | Delete listing |
| POST | `/api/posts/{postId}/wishlist` | Add to wishlist |
| DELETE | `/api/posts/{postId}/wishlist` | Remove from wishlist |
| GET  | `/api/posts/recently-viewed` | Recently viewed posts |
| GET  | `/api/posts/search` | Full-text search (`?q&page&limit`) |

### Users / Profile

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET  | `/api/users/me` | My profile |
| PUT  | `/api/users/me` | Update profile (name, bio, etc.) |
| POST | `/api/users/me/avatar` | Upload avatar |
| GET  | `/api/users/{userId}/reviews` | User reviews |
| GET  | `/api/dashboard/stats` | Seller metrics |
| GET  | `/api/dashboard/orders` | Order history |

### Rewards & Engagement

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET  | `/api/rewards/overview` | Coin balance + tier + streak |
| GET  | `/api/rewards/history` | Coin transaction history (paginated) |
| GET  | `/api/rewards/leaderboard` | Top-N leaderboard |
| POST | `/api/rewards/daily-reward/claim` | Claim daily login reward |
| POST | `/api/rewards/challenge/{id}/complete` | Mark challenge done |
| GET  | `/api/engagement/status` | Engagement streaks + badges |

### KYC

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET  | `/api/kyc/status` | Current KYC status |
| POST | `/api/kyc/submit` | Submit documents (multipart: front, back, selfie, docType, docNumber) |

### Orders & Checkout

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/orders` | Place order |
| GET  | `/api/orders/{orderId}` | Order detail |
| GET  | `/api/orders` | Order history (paginated) |
| PUT  | `/api/orders/{orderId}/payment` | Update payment status |
| POST | `/api/orders/{orderId}/confirm` | Confirm receipt |

### Social / Feed

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET  | `/api/feed` | Social feed (paginated, sortable) |
| POST | `/api/feed` | Create social post |
| GET  | `/api/feed/{feedId}` | Single feed post |
| POST | `/api/feed/{feedId}/comment` | Add comment |
| POST | `/api/feed/{feedId}/like` | Like post |
| DELETE | `/api/feed/{feedId}/like` | Unlike post |

### Categories

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET  | `/api/categories` | All categories |
| GET  | `/api/categories/{id}` | Single category |
| GET  | `/api/categories/{id}/subcategories` | Subcategories |

### Chat

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET  | `/api/chat/conversations` | Conversation list |
| GET  | `/api/chat/{conversationId}/messages` | Message history |
| POST | `/api/chat/{conversationId}/message` | Send message (text or attachment) |

### Notifications

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET  | `/api/notifications` | Notification list |
| POST | `/api/notifications/preferences` | Save per-type prefs |
| DELETE | `/api/notifications/{id}` | Delete notification |

### Saved Searches

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET  | `/api/saved-searches` | List saved searches |
| POST | `/api/saved-searches` | Save a search |
| DELETE | `/api/saved-searches/{id}` | Delete saved search |

### Subscriptions / Tiers

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET  | `/api/tiers` | Available tiers |
| GET  | `/api/tiers/my-subscription` | Current subscription status |
| POST | `/api/tiers/subscribe` | Subscribe or upgrade |

---

## Dialogs and Bottom Sheets Reference

| Component | Trigger | Content | Actions |
|-----------|---------|---------|---------|
| **FilterBottomSheet** | Filter icon in AllPosts | Price range slider, condition chips, location, date pickers, verified toggle, category group chips | Reset / Apply |
| **SortBottomSheet** | Sort icon in AllPosts | Newest / Popular / Price ASC / Price DESC radio buttons | Select |
| **NotificationPrefs ModalBottomSheet** | Settings icon in Notifications | 6 per-type toggle rows + Save button | Toggle each type; Save |
| **EditProfileDialog** | Edit button on Profile | Name (validation), Phone, Bio (160-char counter) | Save / Cancel |
| **SocialLinksDialog** | Social links section on Profile | Twitter, Instagram, LinkedIn fields | Save / Cancel |
| **BuyerInterestModal** | "Make Offer" on PostDetail | Offer price field, message to seller | Submit Offer / Cancel |
| **PromotePostDialog** | Promote in MyPosts ⋯ menu | Two tier cards (24h / 7 days + coin cost) | Confirm / Cancel |
| **MarkSoldDialog** | Mark as Sold in MyPosts | Confirmation text | Yes / Cancel |
| **OrderDetailModal** | Tap order in BoughtPosts/SoldPosts | Items, dates, payment status, tracking link, invoice button | Track / Close |
| **DeleteConfirmationDialog** | Delete post, Delete notification, Delete account | "This cannot be undone" warning | Delete / Cancel |
| **LogoutConfirmationDialog** | Logout All Devices in Settings | "Logout from all devices?" | Logout / Cancel |
| **ClearCacheDialog** | Clear Cache in Settings | "Clear app cache (images & data)?" | Clear / Cancel |
| **LoginPromptCard** | Guest accesses auth-gated screen | Inline overlay with app branding | Sign In / Create Account |
| **AuthGatePopup** | Guest browses multiple pages | Full-overlay prompt to join | Sign In / Create Account / Dismiss |
| **ImageZoomDialog** | Tap image in PostDetail | Full-screen pinch-zoomable carousel | Close (back or swipe-down) |
| **ShareLinkBottomSheet** | Share icon on post/feed | Copy link, WhatsApp, Facebook, etc. | Share via chosen channel |
| **CommentBottomSheet** | Tap comment count on Feed post | Comments list + compose field + emoji keyboard | Post comment / Close |
| **CounterOfferDialog** | Counter button on incoming offer | Counter price input | Submit Counter / Cancel |
| **KycBenefitsBottomSheet** | KycScreen (if not verified) | 4 benefit cards (Trust, Visibility, Badge, Priority) | Start KYC / Maybe Later |
| **DatePickerDialog** | Date fields in Filters or Checkout | Calendar date picker | Confirm / Cancel |
| **OfflineBanner** | Network drops (ConnectivityObserver) | "No internet connection" top bar | Auto-dismisses when reconnected |
| **MoreDrawerOverlay** | Hamburger icon / LocalOnOpenMore | 40+ nav links grouped by category + language selector | Navigate / Close |
| **EmojiReactionPicker** | Long-press message bubble in Chat | 6 emoji options (❤️ 👍 😂 😮 😢 🎉) | Select emoji / Dismiss |
| **SpinWheelCanvas** | Spin button in Rewards Daily tab | Animated 8-segment wheel via Canvas drawArc | Spin / Result shown |
| **ScratchCardCanvas** | Scratch card in Rewards Daily tab | Canvas silver overlay cleared by drag gesture | Scratch to reveal reward |

---

## ViewModels Quick Reference

| ViewModel | State Fields | Key Actions |
|-----------|-------------|-------------|
| **AuthViewModel** | loading, error, signupStep, isAuthenticated, isAdmin, currentUserId | signInWithEmail, signInWithGoogle, beginSignup, submitOtp, verifyPan, setPassword, logout, setError, clearError |
| **HomeViewModel** | loading, posts, categories, hasMore, currentPage, selectedSubcategory | load, loadMore, selectSubcategory, boostPost |
| **ExploreViewModel** | loading, posts, filterMinPrice, filterMaxPrice, filterCondition, sortOption | setFilterPrice, setFilterCondition, setSortOption, clearFilters |
| **ProfileViewModel** | loading, user, listingsCount, salesCount, rating, loggedOut | load, updateProfile, uploadAvatar, logout |
| **RewardsViewModel** | loading, rewards, coinHistory, leaderboard, myLeaderboardPosition | load, claimDailyReward, completeChallenge |
| **KycViewModel** | loading, status, docType, docNumber, frontUri, backUri, selfieUri, submitting | refresh, setDocType, setDocNumber, setFront, setBack, setSelfie, submit |
| **CheckoutViewModel** | address, paymentMethod, placing, orderId, placed, error | setAddress, setPaymentMethod, placeOrder |
| **SearchViewModel** | query, items, searched, recentQueries, suggestions | search, saveSearch, clearHistory |
| **FeedViewModel** | feedItems, sortOption, likedIds, bookmarkedIds | load, like, comment, share |
| **NotificationsViewModel** | items, snoozedItems, selectMode, selectedItems, showSettings | markRead, markAllRead, delete, deleteSelected, toggleSelectMode, selectAll, deselectAll, toggleSettings |
| **WishlistViewModel** | items, loading | load, remove, addToCart |
| **CreatePostViewModel** | imageUris, selectedCategory, categories, maxImages, draft state | setImages, selectCategory, setTitle, setPrice, saveDraft, publish |
| **MyPostsViewModel** | posts, loading, stats | load, delete, markSold, promote |
| **ChatViewModel** | messages, sending, attachmentUri | send, sendAttachment, loadMore |
| **MyFeedViewModel** | items, loading, search | load, refresh, deletePost |
| **OffersViewModel** | incoming, outgoing, loading | accept, reject, counter |

---

## Offline & Caching Strategy

| Data Type | Cache Layer | TTL | Behaviour |
|-----------|------------|-----|-----------|
| Posts feed | Room `PostEntity` | 10 minutes | Network-first; on failure shows cached rows with "Showing cached data" banner |
| Categories | Room `CategoryEntity` | 60 minutes | Same as posts |
| Images | Coil disk cache | LRU, max 100 MB | Loaded from cache if still on disk; re-fetched when evicted |
| Images | Coil memory cache | 25% of JVM heap | Instant load for recently seen images |
| JWT access token | EncryptedSharedPreferences | Until expiry or logout | Silently refreshed by `TokenRefreshAuthenticator` on HTTP 401 |
| API base URL | DataStore Preferences | Persistent | Survives app restart; editable in Settings |
| Draft post | DataStore Preferences | Until published or discarded | Auto-saved every 10 seconds during CreatePost |
| Saved searches | DataStore / API | Persistent | Synced with server; locally queryable |

When the device goes offline:
1. `ConnectivityObserver` emits `Status.Unavailable`
2. `OfflineBanner` slides in from top (animated `AnimatedVisibility`)
3. API calls fall back to Room cache where available
4. Write operations (create post, send message, place order) show error snackbar: "No internet. Please reconnect and try again."
5. Banner auto-dismisses when connectivity restored

---

## Push Notifications (FCM)

`MhubFirebaseMessagingService` extends `FirebaseMessagingService`:

- **`onNewToken(token)`:** sends token to backend via `POST /api/notifications/device` with JWT
- **`onMessageReceived(message)`:** for foreground messages builds a `NotificationCompat` with custom icon, opens relevant deep-link on tap
- **Notification channels defined:**
  - `CHANNEL_OFFERS` — Offers & Deals (HIGH importance)
  - `CHANNEL_CHAT` — Messages (HIGH importance)
  - `CHANNEL_SYSTEM` — System Updates (DEFAULT importance)
  - `CHANNEL_MARKETING` — Promotions (LOW importance)
- **Deep links:** notification tap opens `MainActivity` with `intent.data` URI parsed by NavController to navigate directly to the correct screen (e.g., `mhub://post/{postId}`, `mhub://chat/{conversationId}`)

---

## App Startup Sequence

1. **`MhubApplication.onCreate()`**
   - Hilt initialises all modules
   - Firebase initialised (`FirebaseApp.initializeApp`)
   - Coil `ImageLoader` singleton configured (100 MB disk cache, OkHttp interceptors)

2. **`MainActivity.onCreate()`**
   - Edge-to-edge enabled (`enableEdgeToEdge()`)
   - `setContent { MhubApp() }`

3. **`MhubApp` composable**
   - `NavController` created
   - `TokenStore.tokenFlow` observed — if token exists and valid → start on `MAIN_GRAPH`; else start on `AUTH_GRAPH`
   - `ConnectivityObserver` started; `OfflineBanner` shown/hidden reactively
   - `AuthViewModel.isAuthenticated` drives real-time re-routing on logout/session-expiry

4. **First frame** rendered in < 300 ms on mid-range devices thanks to Baseline Profile pre-compilation


---

## Application Overview

MHub is a **category-driven marketplace and community platform** for India. Users can browse, buy, and sell goods across curated categories while participating in knowledge-sharing communities.

### Business Purpose
- Peer-to-peer marketplace for second-hand and new goods
- Category-specific ecosystems (Electronics, Fashion, Vehicles, Others)
- Community knowledge sharing via Feed posts
- Subscription-based seller access with KYC verification
- Rewards program for active community members

### Category Architecture
Each category is a self-contained **ecosystem**:

| Category | Subcategories (examples) |
|---|---|
| Electronics | Phones, Laptops, Cameras, Audio, Gaming, Accessories |
| Fashion | Men's/Women's Clothing, Shoes, Bags, Watches, Jewellery |
| Vehicles | Cars, Motorcycles, Scooters, Bicycles, Spare Parts |
| Others | Home & Furniture, Sports, Books, Health & Beauty, Agriculture, Real Estate |

**Category Isolation Rule:** When a user enters a category from the Home screen, the entire browsing ecosystem (AllPosts, subcategories, filters, compare) scopes to that category only. To switch categories, the user must return to Home.

---

## User Lifecycle Journey

`
New User
  │
  ├─► Register (email/phone + Aadhaar KYC)
  │       ↓
  ├─► Browse (AllPosts, Feed, ForYou) — Guest or Authenticated
  │       ↓
  ├─► Complete KYC → Verified Seller
  │       ↓
  ├─► Activate Plan (or use Free Launch Promo)
  │       ↓
  ├─► Post Listings → Manage in My Posts
  │       ↓
  ├─► Mark Sales Done → Earn Rewards
  │       ↓
  └─► Renew Plan → Continue Selling
`

---

## Authentication Flow

1. **Landing**: App checks TokenStore — valid token → MAIN_GRAPH; no token → AUTH_GRAPH
2. **Login**: Email/phone + password → JWT access + refresh tokens stored in EncryptedSharedPreferences
3. **Token Refresh**: TokenRefreshAuthenticator auto-refreshes on 401 using OkHttp interceptor
4. **Google Sign-In**: Firebase Auth idToken → /api/auth/google → JWT
5. **Logout**: Tokens cleared → AUTH_GRAPH (2s grace period for refresh)
6. **Session Persistence**: Language preference and auth tokens persist across restarts

---

## KYC Flow

`
User clicks "+" (Sell) or navigates to KYC
  │
  ├─► Step 1: Enter Aadhaar number
  ├─► Step 2: Enter OTP (sent to Aadhaar-linked phone)
  ├─► Step 3: Enter PAN number
  └─► Step 4: Set password → Account created + KYC Approved
`

**KYC Status Values:** pending → submitted → pproved | 
ejected

---

## Subscription Flow

`
User wants to post a listing
  │
  ├─► KYC not approved → Redirect to KYC screen
  ├─► Free Launch Promo active → Allow posting directly
  ├─► No active plan → Redirect to Plans screen
  └─► Plan active → Open Sell/Post screen
`

### Plans Screen Features
- Lists all available subscription tiers from /api/tiers
- Shows current active plan with expiry date
- Allows plan upgrade/downgrade
- Shows Free Launch Promo banner when active
- Razorpay payment integration for paid plans

---

## Plan Renewal Flow

When plan expires:
1. Banner shown on AllPosts screen (red)
2. Push notification sent (see Notification System)
3. "+ Sell" button redirects to Plans screen
4. Feed post creation also gated by plan status
5. After renewal, all posting features restore immediately

---

## Plan Expiry Flow (Notification System)

Daily background check via PlanExpiryNotificationWorker (WorkManager):

| Days Before Expiry | Notification |
|---|---|
| 7 days | "Plan expiring in 7 days — Renew now" |
| 3 days | "Only 3 days left — Renew to avoid interruption" |
| 1 day | "Plan expires tomorrow!" |
| 0 days (expired) | "Plan expired — Renew to continue" |

**In-app banners:**
- Orange banner: Plan expires within 7 days
- Red banner: Plan already expired
- Both shown on AllPosts screen, dismissable

---

## Free Launch Plan (3-Month Promo)

For the first 3 months after app launch (June 1, 2026 – September 1, 2026):
- All authenticated users can post listings and feed posts **without a subscription**
- KYC is still required to post
- Free Launch banner shown on Plans screen and AllPosts screen
- Managed via FreeLaunchPlan object in core/PlanManager.kt
- After promo ends, normal subscription flow resumes

---

## Feed Module

**Purpose:** Community news, knowledge sharing, discussions, industry updates

**Post types:** Text-only posts (no marketplace images)

**Features:**
- Facebook-style post cards with author avatar, title, content, Like/Share/Save/Views
- "Read more" expansion for long posts
- Inline comment previews
- FAB (+) to create new feed post — requires active plan (or free promo)
- Pull-to-refresh with 4-second timeout fallback to mock data

**Tabs:**
- **Feed** — All community posts
- **My Feed** — Current user's own feed posts (with promote/delete)

---

## All Posts Module

**Purpose:** Marketplace listings — all users' product posts within selected category

**Features:**
- Category + subcategory filtering
- Sort by: Newest, Price (asc/desc), Popular, Trending
- 3-dot menu per card: Compare, Wishlist, Share, Report
- Like, Interested, Compare, Save, Share, Views pills
- "View Details" button → Full PostDetailScreen
- Compare mode: select up to 4 posts, compare side-by-side
- Pull-to-refresh
- Infinite scroll (pagination)
- Filter bottom sheet: condition, subcategory, price range
- Plan expiry banner (orange/red)
- Free Launch promo banner (green)

**Sample Data (mock fallback):** 40+ posts across all categories:
- Electronics: iPhone 14 Pro, MacBook Air M2, PS5, Sony WH-1000XM5, Canon EOS R50, DJI Mini 3 Pro…
- Fashion: Jordan 1, Yeezy 350, LV Neverfull, Rolex Submariner…
- Vehicles: RE Classic 350, Nexon EV Max, Hyundai Creta…
- Others: IKEA MALM, Harry Potter set, 2BHK Flat Koramangala…

---

## For You Module

**Purpose:** Personalized AllPosts — filtered by user's selected preferences

**Recommendation tiers:**
1. /api/recommendations — AI-personalized recommendations
2. /api/profile/preferences → user's category preferences → filtered posts
3. /api/posts/feed — general feed fallback → mock posts

**Difference from AllPosts:** Content prioritizes user's preferred categories (set in Profile → Preferences)

---

## My Posts Module

**Purpose:** Current user's own marketplace listings

**Features:**
- Edit post
- Delete post
- View post statistics (views, likes, interested buyers)
- Mark Sale Done / Reactivate listing
- Share post
- Filter by status (Active, Sold, Pending)

---

## Rewards Module

**Features:**
- Points balance with tier badges (Bronze/Silver/Gold/Platinum)
- Earn points: posting listings, completing sales, referring users, daily logins
- Redeem: coupons, cashback, premium features
- Leaderboard
- Task/challenge tracking
- Streak tracking
- Requires authentication (login prompt for guests)

---

## Profile Module

**Sections:**
- Account info (name, email, phone, avatar)
- KYC status with verification badge
- My Posts management
- Sale Done / Sale Undone history
- Addresses management
- Orders history
- Preferences (preferred categories for ForYou)
- App Settings (language, theme, notifications)
- Logout

---

## Notification System

**Channels:**

| Channel | Purpose | Priority |
|---|---|---|
| mhub_plan_expiry | Plan expiry reminders | HIGH |
| CHANNEL_OFFERS | Deals & marketplace alerts | HIGH |
| CHANNEL_CHAT | Messages | HIGH |
| CHANNEL_SYSTEM | System updates | DEFAULT |
| CHANNEL_MARKETING | Promotions | LOW |

**Push via FCM:** Deep links via mhub://post/{id}, mhub://chat/{id}, etc.

**WorkManager jobs:**
- plan_expiry_check — Daily, checks subscription expiry and sends notifications
- offline_sync — On network reconnect, processes queued write operations

---

## Localization System

**Supported languages (14):**
en (default), hi, 	e, 	a, kn, mr, n, gu, ml, pa, ur, r, es, r

**Implementation:**
- LocaleManager (Singleton) — persists selected locale to SharedPreferences ("mhub_locale")
- AppCompatDelegate.setApplicationLocales() — per-app language (Android 13+)
- localeVersion StateFlow — increments on change → forces ViewModels to reload data
- Language selector in Settings with Indian + International language groups
- Selection persists across restarts, logout/login, and updates

**String coverage:** 1,425 string keys translated in all 14 languages

---

## Publishing Workflow

### Sell / Marketplace Post
`
"+" FAB click
  ├─► Not authenticated → Login screen
  ├─► KYC not approved → KYC screen
  ├─► Free Promo active → POST_WELCOME (skip plan check)
  ├─► No active plan → Plans screen
  └─► Plan active → Sell screen (PostWelcomeScreen)
`

### Feed Post
`
Feed FAB click
  ├─► Not authenticated → Login screen
  ├─► Free Promo active → FeedPostAddScreen
  ├─► No active plan → Plans screen
  └─► Plan active → FeedPostAddScreen
`

---

## Mobile Application Navigation Flow

### Bottom Navigation (5 tabs)

| Tab | Screen | Purpose |
|---|---|---|
| Home 🏠 | HomeScreen | Category selection, trending, banners |
| Posts 📋 | ExploreScreen (AllPosts) | Browse all marketplace listings |
| + | SellFlow | Post a new listing (KYC+Plan gated) |
| Feed 📰 | FeedScreen | Community news and discussions |
| Rewards 🏆 | RewardsScreen | Points, badges, leaderboard |

### Hamburger Menu (More drawer)

| Section | Items |
|---|---|
| Social | Public Wall, My Feed, Feedback, Complaints |
| Commerce | Sale Done, Sale Undone, Recently Viewed, Saved Searches, Wishlist, Compare |
| Account | Profile, KYC, Plans/Subscription, Settings |
| Info | About, Terms, Privacy, Refund Policy |
| Admin | Admin Dashboard (admin users only) |

### Additional Routes
- ForYou — Personalized recommendations (accessible from Home)
- MyPosts / MyHome — User's own listings
- PostDetail — Full listing detail with images, seller info, buyer interest
- FeedDetail — Full text post view

---

## Category-Based Architecture

### Category Ecosystem Isolation
When user selects a category from Home:
- LocalActiveCategoryKey (CompositionLocal) is set to category key ("electronics", "fashion", "vehicles", "others")
- ExploreViewModel.setEcosystem() scopes all API calls to that category
- Subcategories load category-specific items
- Returning to Home resets the ecosystem key

### Shared vs Category-Specific Modules

| Module | Shared | Category-Specific |
|---|---|---|
| Profile | ✅ | ❌ |
| Rewards | ✅ | ❌ |
| KYC | ✅ | ❌ |
| Plans | ✅ | ❌ |
| AllPosts | ❌ | ✅ (filtered by category) |
| My Posts | ❌ | ✅ |
| Feed | ✅ | ❌ |
| For You | ✅ | Preference-based |
| Sale Done | ❌ | ✅ |
| Sale Undone | ❌ | ✅ |

---

## Web Application Parity

**Reference:** http://localhost:8081/ (local dev) or production URL

### Key Parity Points
- AllPosts card design matches web: image, price badge, HOT badge, condition badge, engagement pills
- Feed posts are text-only (news/discussions), same as web Feed.jsx
- ForYou uses same 3-tier recommendation fallback as web ForYou.jsx
- Sale Done / Sale Undone match Saledone.jsx stepper + seller/buyer tabs
- Category ecosystem isolation matches web category routing
- KYC flow matches web Aadhaar + PAN 4-step flow
- Plan gating logic identical (KYC → Plan → Sell)
- Language switching behavior mirrors web i18n system

---

## Future Scalability Considerations

1. **Modularization:** Current single-module codebase can be split into feature modules (:feature:feed, :feature:allposts, etc.) for faster build times
2. **Offline support:** Room DB caching already in place — extend for full offline browsing
3. **Real-time messaging:** Architecture supports WebSocket upgrades for Chat feature
4. **A/B testing:** Firebase Remote Config integration ready
5. **Dynamic delivery:** Play Feature Delivery for on-demand language packs
6. **Compose Multiplatform:** UI layer is Compose-only, enabling future iOS sharing
7. **Analytics:** Firebase Analytics events defined at key user journeys
8. **Performance:** Baseline Profile reduces cold start by ~30%

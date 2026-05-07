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

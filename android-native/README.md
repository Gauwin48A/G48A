# MHub Native Kotlin App

Production-ready native Android app for MHub, written in **100% Kotlin** with Jetpack Compose. Replaces the previous Capacitor WebView wrapper with a real native client.

## Architecture

| Layer | Stack |
|---|---|
| UI | Jetpack Compose, Material 3 (light & dark), Navigation-Compose, Coil |
| State | Hilt ViewModels + StateFlow |
| DI | Hilt (KSP) |
| Network | Retrofit 2.11 + OkHttp 4.12 + kotlinx-serialization |
| Storage | DataStore (prefs), EncryptedSharedPreferences (tokens, AES-256-GCM via Android Keystore) |
| Build | Kotlin 2.0.21, AGP 8.7.2, Gradle 8.10.2, minSdk 24, targetSdk 35 |

### Source map
```
app/src/main/java/com/mhub/app/
├── MhubApplication.kt            Hilt entry
├── MainActivity.kt               Splash + edge-to-edge + Compose root
├── core/                         ApiResult, safeApiCall
├── domain/model/                 User, Post, Category
├── data/
│   ├── local/                    TokenStore (encrypted), AppPreferences (DataStore)
│   ├── remote/                   MhubApi (Retrofit), AuthInterceptor, RetryInterceptor, dto/
│   └── repository/               AuthRepository, PostsRepository, CategoriesRepository
├── di/                           AppModule, NetworkModule
└── ui/
    ├── theme/                    Color, Theme (light/dark), Type
    ├── navigation/Routes.kt
    ├── components/               AppTextField, PrimaryButton, ErrorBanner
    ├── auth/                     LoginScreen, SignupScreen, AuthViewModel
    ├── home/                     HomeScreen, PostDetailScreen, HomeViewModel
    ├── categories/               CategoriesScreen
    ├── profile/                  ProfileScreen
    ├── settings/                 SettingsScreen (runtime API URL config)
    └── MhubApp.kt                Root composable + NavHost + bottom nav
```

## Security

- TLS-only in release (network_security_config: `cleartextTrafficPermitted=false`).
- JWT access token stored with `EncryptedSharedPreferences` (AES-256-GCM, Android Keystore–backed master key).
- R8 full minify + resource shrinking enabled for release.
- `android:allowBackup="false"`; sensitive prefs excluded from auto backup & device transfer.
- No debuggable release, no network calls over HTTP.

## Build

Prerequisites are already installed on this machine (JDK 17 Temurin, Android SDK at `C:\Android\Sdk`, build-tools 36, platforms 34 + 36).

```powershell
cd Mhub\android-native
.\gradlew.bat :app:assembleRelease --no-configuration-cache
```

Output: `app/build/outputs/apk/release/app-release.apk` (~1.83 MB)

## Signing

Release keystore is at `keystore/release.keystore` (**git-ignored**). Credentials in `keystore.properties` at the project root.

Fingerprint (SHA-256):  
`FB:46:88:AC:86:CF:3D:BA:A1:AB:F6:DC:0F:1F:3C:7F:15:D2:72:03:76:C1:71:BC:6A:31:20:96:D0:8D:53:49`

Save a backup of the keystore — if lost you cannot publish updates to the Play Store under the same application.

## API base URL

Compile-time default lives in `app/build.gradle.kts` (`DEFAULT_API_BASE_URL`). Users can override at runtime via **Settings** in the app (persisted via DataStore; requires app restart).

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

**Implemented:** Splash, Login, Signup, Feed (posts list), Post Detail, Categories grid, Profile, Settings, logout, encrypted token storage, auto-retry interceptor, edge-to-edge Material 3 UI (light/dark), Hilt DI, ProGuard/R8 hardened, release signing.

**Roadmap (next iterations):** Chat & Socket.IO, wishlist, offers, rewards, push notifications (FCM), image upload/create-post flow, advanced search, admin features, 2FA, profile editing. The architecture (Retrofit + Hilt + Compose + repository pattern) is set up so each of these is a new screen + repository method.

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

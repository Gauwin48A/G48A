# MHub Android App

## Architecture

```
app/                     → Application module (DI wiring, navigation, MainActivity)
core/
  common/                → Shared models, Result type, utilities
  ui/                    → Theme, reusable Compose components
  network/               → Retrofit APIs, OkHttp interceptors, cookie jar
  data/                  → Room database, repositories, WorkManager workers
feature/
  auth/                  → Login, Signup, Forgot Password screens + ViewModels
  home/                  → Home feed with categories
  listings/              → All Listings grid, Add Post, Search
  detail/                → Post detail with image pager
  profile/               → User profile with logout
  notifications/         → Notification list with read/unread
benchmark/               → Macrobenchmark + baseline profile generation
```

## Build Flavors

| Flavor | Package Suffix | API Target |
|--------|---------------|------------|
| `dev` | `.dev` | `http://10.0.2.2:3000` (emulator localhost) |
| `staging` | `.staging` | `https://staging-api.mhub.app` |
| `prod` | _(none)_ | `https://api.mhub.app` |

## Quick Start

```bash
cd android

# Debug build (dev flavor)
./gradlew assembleDevDebug

# Run unit tests
./gradlew testDevDebugUnitTest

# Run lint
./gradlew lint

# Release AAB (requires signing config)
./gradlew bundleProdRelease
```

## Tech Stack

- **Language**: Kotlin 2.1
- **UI**: Jetpack Compose + Material 3
- **Architecture**: MVVM + Clean Architecture
- **DI**: Hilt
- **Networking**: Retrofit + OkHttp + Kotlinx Serialization
- **Database**: Room
- **Background**: WorkManager
- **Navigation**: Navigation Compose
- **Image Loading**: Coil
- **Logging**: Timber
- **Testing**: JUnit + MockK + Turbine + Compose UI Tests
- **CI**: GitHub Actions

## Auth Flow

1. App starts → `GET /api/auth/csrf-token` to seed XSRF-TOKEN cookie
2. `GET /api/auth/session` to check existing session
3. Login → `POST /api/auth/login` with identifier + password
4. OkHttp CookieJar persists httpOnly session cookies
5. CSRF interceptor reads XSRF-TOKEN cookie, attaches as X-XSRF-TOKEN header
6. On 401 → Token refresh interceptor retries with `POST /api/auth/refresh-token`
7. Device fingerprint attached to every request via X-Device-Fingerprint header

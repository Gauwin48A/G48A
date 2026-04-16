# Android Development Timeline

## Phase 0: Discovery + Parity Map ✅
- Route/API parity matrix
- P0/P1/P2 scope classification
- Risk register
- Timeline (this document)

## Phase 1: Android Foundation ✅
- Multi-module project scaffold (15 modules)
- Hilt DI, Navigation Compose shell, Material 3 theming
- Build flavors: dev/staging/prod
- Secure config (env-based signing, no secrets in repo)
- CI workflow (.github/workflows/android-ci.yml)

## Phase 2: Networking + Auth ✅
- Cookie-based session with PersistentCookieJar
- CSRF double-submit via CsrfInterceptor
- Token refresh retry via TokenRefreshInterceptor
- Device fingerprint via DeviceFingerprintInterceptor
- AuthRepository with full login/signup/OTP/session flow
- Integration tests for CSRF interceptor

## Phase 3: Core Product Flows (P0) ✅
- All P0 screens implemented (18 screens)
- Loading/empty/error states via StateComponents
- Image picker + upload in AddPostScreen
- Paging 3 for search
- Socket.IO chat
- Offline caching with Room
- Unit tests for repositories and ViewModels

## Phase 4: Native Capabilities — IN PROGRESS
- Deep links configured (mhub://, https://mhub.app)
- Biometric helper utility created
- Location provider utility created
- Connectivity observer created
- FCM service created (pending google-services.json)
- **Remaining**: Contacts sync screen, permission request flows

## Phase 5: Performance + Reliability — IN PROGRESS
- Benchmark module scaffolded
- Baseline profile generator created
- StrictMode enabled in debug
- **Remaining**: ProGuard rules, startup optimization, leak detection

## Phase 6: Play Store Launch Readiness — IN PROGRESS
- Release signing config (env-based)
- CI workflow for lint + test + assembleDebug
- **Remaining**: Generate release AAB, store listing, data safety, privacy policy

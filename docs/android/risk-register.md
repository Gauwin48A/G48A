# Risk Register

| ID | Risk | Likelihood | Impact | Mitigation | Owner | Status |
|---|---|---|---|---|---|---|
| R1 | Firebase `google-services.json` not available — blocks FCM, Crashlytics, Analytics | High | High | FCM plugins commented out; app builds without Firebase. Add json files per flavor when ready. | Developer | Open |
| R2 | No Gradle wrapper in repo — CI and devs can't build | High | Critical | Generate via `gradle wrapper --gradle-version 8.11.1` with local Gradle install | Developer | Open |
| R3 | Missing Android resource files (launcher icons, themes, xml configs) | High | Critical | Create all required res/ files before first build | Developer | Open |
| R4 | Play Store signing key not generated | Medium | High | Generate keystore before release build; document in BLOCKERS.md | Release Manager | Open |
| R5 | App Links `assetlinks.json` not deployed on mhub.app server | Medium | Medium | Deep links work via mhub:// scheme as fallback; deploy assetlinks.json when ready | Backend | Open |
| R6 | Server CORS/cookie policy may reject Android OkHttp user-agent | Low | High | Test with dev server; add `X-Device-Type: android` header (already done) | Developer | Mitigated |
| R7 | Socket.IO transport compatibility (polling vs websocket) | Medium | Medium | Socket.IO client 2.1.1 compatible with server; test with real server | Developer | Open |
| R8 | Image upload multipart format mismatch with server | Medium | High | Server expects `multer` multipart; Android uses OkHttp MultipartBody — test early | Developer | Open |
| R9 | Room schema migration on updates | Low | Medium | Using `fallbackToDestructiveMigration()` for now; add proper migrations before prod | Developer | Open |
| R10 | ProGuard/R8 stripping serialization classes | Medium | High | Add keep rules in proguard-rules.pro for kotlinx.serialization and Retrofit | Developer | Open |
| R11 | WebKit CookieManager not available on some emulators | Low | Medium | Fallback to in-memory cookie store if needed | Developer | Open |
| R12 | Rate limiting differences between web and mobile | Low | Low | Server rate limits by IP + device fingerprint; mobile shares IP differently | Backend | Open |
| R13 | OTP delivery to Indian phone numbers | Low | Medium | Backend dependency; no Android-side mitigation needed | Backend | Open |
| R14 | Feature module Gradle flavor matching | High | Critical | All library modules must declare matching productFlavors or use `missingDimensionStrategy` | Developer | Open |

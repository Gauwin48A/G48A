# 🚀 Production Integration & Features Checklist

This document tracks the verified implementation and live configuration status of all infrastructure, external cloud services, security, and mobile features for the Zaruda / Garuda platform.

---

## 1. ⚡ Redis Caching & Realtime Engine (Upstash Mumbai `ap-south-1`)

- [x] **Cloud Database Created**: Hosted in AWS Mumbai (`ap-south-1`) with TLS enabled on Upstash.
- [x] **Live Connection Configured**: `REDIS_URL` active in [`server/.env`](file:///c:/Users/laksh/GITHUB/1hub_rep2/G48A/server/.env).
- [x] **Unified Connection Resolver**: [`server/src/config/redisConnection.js`](file:///c:/Users/laksh/GITHUB/1hub_rep2/G48A/server/src/config/redisConnection.js) parses `REDIS_URL` and `rediss://` TLS.
- [x] **Distributed Multi-Layer Cache**: [`server/src/config/redisCache.js`](file:///c:/Users/laksh/GITHUB/1hub_rep2/G48A/server/src/config/redisCache.js) with L1 in-memory stampede protection and L2 distributed Redis.
- [x] **Feed Caching Helper**: `feedKey(userId, limit, seedBucket, filters)` implemented.
- [x] **Reels Metadata Caching Helper**: `reelKey(reelId)` implemented.
- [x] **Unread Notification / Message Counter Caching**: `unreadCounterKey(userId)` implemented.
- [x] **Redis Session Store & TTL Expiry**: [`server/src/config/redisSession.js`](file:///c:/Users/laksh/GITHUB/1hub_rep2/G48A/server/src/config/redisSession.js) with `set`, `get`, `incr`, `expire`, and `del`.
- [x] **Distributed Rate Limiting**: [`server/src/middleware/rateLimiter.js`](file:///c:/Users/laksh/GITHUB/1hub_rep2/G48A/server/src/middleware/rateLimiter.js) backed by Redis memory store.
- [x] **BullMQ Background Notification Queue**: [`server/src/services/notificationQueue.js`](file:///c:/Users/laksh/GITHUB/1hub_rep2/G48A/server/src/services/notificationQueue.js) connected to cloud Redis.
- [x] **BullMQ Payout Queue & Workers**: [`server/src/services/payoutQueue.js`](file:///c:/Users/laksh/GITHUB/1hub_rep2/G48A/server/src/services/payoutQueue.js) and [`payoutWorker.js`](file:///c:/Users/laksh/GITHUB/1hub_rep2/G48A/server/src/workers/payoutWorker.js).
- [x] **Automated Diagnostics Harness**: [`server/scripts/test-phase1-redis.js`](file:///c:/Users/laksh/GITHUB/1hub_rep2/G48A/server/scripts/test-phase1-redis.js) (`✅ Passed 23ms latency`).

---

## 2. 🔔 Push Notifications & FCM (Firebase Cloud Messaging v1)

- [x] **Firebase Project**: Project `garudahub-bc561` active.
- [x] **Android Client Config**: [`android-native/app/google-services.json`](file:///c:/Users/laksh/GITHUB/1hub_rep2/G48A/android-native/app/google-services.json) verified for `com.zaruda.app` and `com.zaruda.app.debug`.
- [x] **Android Push Notification Silhouette**: [`ic_notification.xml`](file:///c:/Users/laksh/GITHUB/1hub_rep2/G48A/android-native/app/src/main/res/drawable/ic_notification.xml) with `#2563EB` brand tint.
- [x] **Android Native Push Listener**: [`ZarudaFirebaseMessagingService.kt`](file:///c:/Users/laksh/GITHUB/1hub_rep2/G48A/android-native/app/src/main/java/com/zaruda/app/service/ZarudaFirebaseMessagingService.kt) with `BigPictureStyle` remote image streaming.
- [x] **Android 6 Notification Channels**: Configured in [`NotificationChannelHelper.kt`](file:///c:/Users/laksh/GITHUB/1hub_rep2/G48A/android-native/app/src/main/java/com/zaruda/app/core/notifications/NotificationChannelHelper.kt):
  - `chat_messages` (Inquiries & Offers)
  - `transactions` (Orders & Payments)
  - `promotions` (Promotions & Deals)
  - `rewards` (Rewards & Coins)
  - `system` (System & Security)
  - `general` (General Alerts)
- [x] **Android 13+ Compliance**: Runtime permission check for `POST_NOTIFICATIONS`.
- [x] **Backend Service Account Key**: Valid private key placed in [`server/src/config/serviceAccountKey.json`](file:///c:/Users/laksh/GITHUB/1hub_rep2/G48A/server/src/config/serviceAccountKey.json).
- [x] **Backend Firebase Admin SDK Initialization**: [`server/src/config/firebase.js`](file:///c:/Users/laksh/GITHUB/1hub_rep2/G48A/server/src/config/firebase.js).
- [x] **Backend FCM HTTP v1 Dispatch**: [`server/src/services/fcmAdminService.js`](file:///c:/Users/laksh/GITHUB/1hub_rep2/G48A/server/src/services/fcmAdminService.js).
- [x] **Stale Device Token Pruning**: Automatically deactivates unregistered/expired FCM tokens in PostgreSQL.
- [x] **FCM API Enabled**: Firebase Cloud Messaging API (V1) enabled in Google Cloud Console.
- [ ] **Google Cloud IAM Role**: Assign `Firebase Admin SDK Administrator Service Agent` to `firebase-adminsdk-fbsvc@garudahub-bc561.iam.gserviceaccount.com`.

---

## 3. 🔑 Google 1-Tap Sign-In & Authentication

- [x] **Android OAuth Client ID**: `GOOGLE_WEB_CLIENT_ID` configured in [`android-native/local.properties`](file:///c:/Users/laksh/GITHUB/1hub_rep2/G48A/android-native/local.properties).
- [x] **Android Modern CredentialManager**: [`GoogleSignInHelper.kt`](file:///c:/Users/laksh/GITHUB/1hub_rep2/G48A/android-native/app/src/main/java/com/zaruda/app/ui/auth/GoogleSignInHelper.kt) implemented using Android Jetpack `CredentialManager`.
- [x] **Server-Side Token Verification**: `/api/auth/google` in [`authController.js`](file:///c:/Users/laksh/GITHUB/1hub_rep2/G48A/server/src/controllers/authController.js) verifies token via Firebase Admin `verifyIdToken`.
- [x] **Automatic Account Creation & Profile Linking**: Creates user, generates unique username, awards signup bonus points in transaction.
- [x] **JWT Security**: Access tokens (15m/24h) and Refresh tokens (7d/30d) signed with secret keys.
- [x] **Device Binding & Anti-Abuse**: Device fingerprinting and session tracking active.

---

## 4. 💥 Firebase Crashlytics & Error Tracking

- [x] **SDK Dependencies**: Crashlytics plugin & dependency configured in [`android-native/app/build.gradle.kts`](file:///c:/Users/laksh/GITHUB/1hub_rep2/G48A/android-native/app/build.gradle.kts).
- [x] **Cold-Boot Startup Initialization**: Synchronous main-thread startup in [`ZarudaApplication.kt`](file:///c:/Users/laksh/GITHUB/1hub_rep2/G48A/android-native/app/src/main/java/com/zaruda/app/ZarudaApplication.kt).
- [x] **Build & Diagnostic Metadata**: Custom keys attached (`app_version`, `build_type`, `device_model`, `os_sdk`).
- [x] **User Context Tracking**: `setUser()` on login and `clearUser()` on logout in [`CrashlyticsHelper.kt`](file:///c:/Users/laksh/GITHUB/1hub_rep2/G48A/android-native/app/src/main/java/com/zaruda/app/core/CrashlyticsHelper.kt).
- [x] **Global ViewModel Error Logging**: `logApiError` and `logNonFatal` across all core ViewModels.

---

## 5. 📊 Firebase Analytics (GA4) Business Funnels

- [x] **SDK Integration**: Firebase Analytics configured.
- [x] **Typed Telemetry Helpers**: [`AnalyticsHelper.kt`](file:///c:/Users/laksh/GITHUB/1hub_rep2/G48A/android-native/app/src/main/java/com/zaruda/app/core/AnalyticsHelper.kt).
- [x] **User Role Property**: Sets `user_role` property upon login and session restore.
- [x] **Purchase & Order Telemetry**: `logOrderCompleted(orderId, amount, currency)`.
- [x] **Listings & Content Telemetry**: `logPostCreated(category, price)`.
- [x] **Discovery Telemetry**: `logCategoryBrowsed(categoryId)`.
- [x] **Location Telemetry**: `logLocationDetected(city, state)`.
- [x] **KYC Funnel Telemetry**: `logKycSubmitted(docType)`.

---

## 6. 📦 Cloud Object Storage & CDN (Cloudflare R2)

- [x] **Cloudflare R2 Account**: Configured in [`server/.env`](file:///c:/Users/laksh/GITHUB/1hub_rep2/G48A/server/.env).
- [x] **Media Bucket**: `media-bucket` configured for product images & video reels.
- [x] **KYC Documents Bucket**: `kyc-docs-bucket` configured for encrypted identity verification files.
- [x] **CDN Edge Acceleration**: `https://cdn.wyntechlabs.com` linked.
- [x] **Local Disk Fallback**: High-performance local fallback if R2 is unavailable.

---

## 7. 🛡️ Security, Bot Defense & WAF

- [x] **Cloudflare Turnstile Bot Protection**: Active site & secret keys in [`server/.env`](file:///c:/Users/laksh/GITHUB/1hub_rep2/G48A/server/.env).
- [x] **Rate Limiting & Brute Force Defense**: Login, OTP, and write limiters active.
- [x] **No-VPN Protection for Auth**: Blocks malicious proxies from brute-forcing accounts.

---

## 8. ⏳ Deferred / Post-Launch Items

- [ ] **Razorpay Live Payment Gateway**: `RAZORPAY_KEY_ID` & `RAZORPAY_KEY_SECRET` (to be added when ready for live monetary processing).
- [ ] **Surepass Live KYC Gateway**: `SUREPASS_BEARER_TOKEN` (to be added when ready for live Aadhaar OTP verification).
- [ ] **Android Release Keystore Signing**: [`android-native/keystore.properties`](file:///c:/Users/laksh/GITHUB/1hub_rep2/G48A/android-native/keystore.properties) (when generating final signed Play Store AAB bundle).

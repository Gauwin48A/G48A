# 🚀 Firebase Production Readiness Checklist (100% Complete)

This document tracks the complete end-to-end implementation, hardening, configuration, and verification of all 4 Firebase services across the **Android Native Client** and **Node.js Backend**.

---

## 1. 🔔 Firebase Cloud Messaging (FCM Push Notifications)

- [x] **Monochrome Notification Icon**: Created `ic_notification.xml` (24dp vector silhouette) to prevent solid white box bugs on Android 5+.
- [x] **Notification Brand Tinting**: Configured `.setColor(0xFF2563EB.toInt())` in `ZarudaFirebaseMessagingService.kt`.
- [x] **6 Multi-Channel Architecture**:
  - [x] `chat_messages` (Inquiries & Offers — `IMPORTANCE_HIGH`)
  - [x] `transactions` (Orders & Payments — `IMPORTANCE_HIGH`)
  - [x] `promotions` (Promotions & Deals — `IMPORTANCE_DEFAULT`)
  - [x] `rewards` (Rewards & Coins — `IMPORTANCE_DEFAULT`)
  - [x] `system` (System & Security — `IMPORTANCE_HIGH`)
  - [x] `general` (General Alerts — `IMPORTANCE_DEFAULT`)
- [x] **Channel Initialization**: Auto-created on startup in `NotificationChannelHelper.kt` and `ZarudaApplication.kt`.
- [x] **Android 13+ (API 33) Support**: Added `hasNotificationPermission()` for `POST_NOTIFICATIONS` runtime permission checks.
- [x] **Rich Media Push**: `downloadBitmap` HTTP streaming for `BigPictureStyle` banner notifications.
- [x] **Deep Linking**: `MainActivity` launch intent with `DEEP_LINK` and `NOTIFICATION_TYPE` intent extras.
- [x] **Token Synchronization**: Token caching in `TokenStore` and immediate registration on login via `/api/push/register`.
- [x] **Coroutine Lifecycle Safety**: `SupervisorJob` cancelled on service `onDestroy()`.
- [x] **Modular Backend Dispatch**: Refactored `fcmAdminService.js` to Firebase Admin v14+ modular `getMessaging()`.
- [x] **Automatic Stale Token Pruning**: Backend deactivates dead/unregistered tokens (`is_active = false`) in PostgreSQL during unicast and broadcast dispatch.
- [x] **Unit & Security Tests**: `tests/pushNotifications.security.test.js` passing (5/5 tests).

---

## 2. 💥 Firebase Crashlytics (Crash & Error Observability)

- [x] **Deterministic Startup Initialization**: `FirebaseApp.initializeApp()` and Crashlytics collection executed synchronously in `ZarudaApplication.kt` (catches cold-boot startup crashes).
- [x] **Debug/Release Gating**: Crashlytics collection automatically disabled in debug (`!BuildConfig.DEBUG`).
- [x] **Cold-Boot Diagnostic Metadata**: Automatically attaches:
  - [x] `app_version` (`BuildConfig.VERSION_NAME`)
  - [x] `build_type` (`BuildConfig.BUILD_TYPE`)
  - [x] `device_model` (`Build.MODEL`)
  - [x] `os_sdk` (`Build.VERSION.SDK_INT`)
- [x] **User Identity Binding**: `CrashlyticsHelper.setUser(userId, email, role)` linked to user session lifecycle in `AuthRepository.kt`.
- [x] **Session Reset**: `CrashlyticsHelper.clearUser()` wipes user identifiers and attributes on `logout()`.
- [x] **Typed Helper Methods in `CrashlyticsHelper.kt`**:
  - [x] `setUser(userId, email, role)`
  - [x] `clearUser()`
  - [x] `recordHttpError(url, statusCode, message)`
  - [x] `logApiError(apiError, tag, context)`
  - [x] `logNonFatal(throwable, tag, context)`
  - [x] `logBreadcrumb(event, message)`
- [x] **ViewModel Error Observability**:
  - [x] `CheckoutViewModel.kt` — Logs order placement errors via `logApiError`.
  - [x] `HomeViewModel.kt` — Logs feed loading failures via `logApiError`.
  - [x] `CreatePostViewModel.kt` — Logs listing publication failures via `logApiError`.
- [x] **ProGuard / R8 Mapping**: Gradle Crashlytics plugin active for automatic release mapping upload.

---

## 3. 📊 Firebase Analytics (GA4 Telemetry & Funnels)

- [x] **Automatic Screen View Tracking**: Real-time Compose navigation destination tracking in `ZarudaApp.kt`.
- [x] **User Property Segmentation**: Sets `user_role` user property on authentication in `AuthRepository.kt`.
- [x] **Typed Helper Methods in `AnalyticsHelper.kt`**:
  - [x] `setUserContext(userId, role)`
  - [x] `logOrderCompleted(orderId, amount, currency)`
  - [x] `logError(errorCode, errorMessage)`
  - [x] `logPostView(postId, postTitle)`
  - [x] `logLocationDetected(method, city)`
  - [x] `logCategoryEnter(categoryKey, entryType)`
  - [x] `logAddToCart(itemId, itemName, price)`
  - [x] `logPurchase(itemId, itemName, price, currency)`
  - [x] `logSearch(searchTerm)`
  - [x] `logShare(contentType, itemId, method)`
- [x] **Business Funnels Instrumented**:
  - [x] **Authentication**: `logLogin("google")`, `logLogin("email")`, `logSignUp("email")`.
  - [x] **Purchases / Orders**: `logOrderCompleted` in `CheckoutViewModel.kt`.
  - [x] **Listings**: `post_created` event with price and category in `CreatePostViewModel.kt`.
  - [x] **Navigation & Discovery**: `launcher_enter_category` in `HomeViewModel.kt`.
  - [x] **Location**: `location_detected` upon city selection in `AppLocationViewModel.kt`.
  - [x] **KYC Verification**: `kyc_submitted` event with document type in `KycViewModel.kt`.
- [x] **Real-Time Debugging**: Compatible with Firebase DebugView (`adb shell setprop debug.firebase.analytics.app com.zaruda.app.debug`).

---

## 4. 🔑 Google 1-Tap Sign-In & Firebase Auth (Server-Side)

- [x] **Modern Native Client**: Uses Android Jetpack `CredentialManager` with `GetGoogleIdOption` in `GoogleSignInHelper.kt`.
- [x] **Lightweight Architecture**: Client excludes heavy `firebase-auth` SDK dependencies.
- [x] **Dynamic UI Visibility**: Google Sign-In button automatically renders when configured, gracefully hides if absent.
- [x] **Unified Backend Config**: `server/src/config/firebase.js` exports modular `getAuth()` and `messaging`.
- [x] **Standardized Token Verification**: Backend `/api/auth/google` verifies Google ID tokens using `getAuth().verifyIdToken(idToken)`.
- [x] **Security Gate**: Enforces `decodedToken.email_verified === true` before linking Google accounts to existing accounts.
- [x] **JWT Session Issuance**: Issues native session JWT and refresh cookies on successful verification.

---

## 5. 📁 Keys & Configuration Files Inventory

| Component | Path | Status |
| :--- | :--- | :---: |
| **Android Firebase Config** | `android-native/app/google-services.json` | [x] **Active** (Contains real OAuth clients for `com.zaruda.app` & `.debug`) |
| **Android Web Client ID** | `android-native/local.properties` | [x] **Active** (`GOOGLE_WEB_CLIENT_ID=241696704399-...`) |
| **Debug Keystore SHA-1** | Firebase Console registered | [x] **Active** (`C9:EE:78:E4:DD:F6:04:DB:95:A0:28:80:1D:02:E8:F3:52:0B:9E:83`) |
| **Debug Keystore SHA-256** | Firebase Console registered | [x] **Active** (`2D:1B:19:8B:EE:56:0E:83:12:AE:94:31:CA:C8:75:3C:E1:2D:AF:90:96:73:C5:3F:03:0A:84:A6:0F:58:9B:22`) |
| **Backend Private Key** | `server/src/config/serviceAccountKey.json` | [x] **Active** (Valid private key for `garudahub-bc561`) |
| **Backend Environment** | `server/.env` | [x] **Active** (`FIREBASE_SERVICE_ACCOUNT_PATH=./src/config/serviceAccountKey.json`) |

---

## 6. 🧪 Automated Quality Gates & Verification

- [x] **Android Compilation**: `./gradlew compileDebugKotlin` ➔ `BUILD SUCCESSFUL` (0 errors).
- [x] **Server Route Contracts**: `npm run check:route-contract` ➔ `PASS` (22/22 checks).
- [x] **Server Push Security Suite**: `tests/pushNotifications.security.test.js` ➔ `PASS` (5/5 tests).
- [x] **Backend Firebase Runtime**: `Messaging: true Auth: true` verified with live credentials.

---

## 7. 🏁 Quick Verification Runbook

```bash
# 1. Check Server Firebase Admin & Routes
cd server
npm run check:route-contract

# 2. Check Android Native Build
cd ../android-native
./gradlew compileDebugKotlin

# 3. Stream Live Analytics in Firebase Console DebugView
adb shell setprop debug.firebase.analytics.app com.zaruda.app.debug
```

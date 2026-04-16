# BLOCKERS — MHub Android

## Active Blockers

### B1: Firebase Admin SDK — Server-Side FCM Support
- **Owner**: Backend team
- **Action**: Add `firebase-admin` SDK to server and create dual-path notification delivery (web-push for PWA, FCM for native Android)
- **Affected**: Push notifications to native Android app
- **Workaround**: App can poll `/api/notifications` endpoint on interval until FCM is wired
- **Deadline**: Before Phase 4 completion
- **Files to modify**: `server/src/services/fcm.js`, `server/package.json`

### B2: App Links Domain Verification
- **Owner**: Infrastructure / DevOps
- **Action**: Deploy `/.well-known/assetlinks.json` to `https://mhub.app` with the release signing certificate SHA-256 fingerprint
- **Affected**: Deep link auto-verification (App Links)
- **Workaround**: Custom scheme `mhub://` deep links work without verification
- **Deadline**: Before Play Store submission
- **Template**:
```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.mhub.app",
    "sha256_cert_fingerprints": ["<RELEASE_SIGNING_CERT_SHA256>"]
  }
}]
```

### B3: Play App Signing Key
- **Owner**: Release manager / Engineering lead
- **Action**: Create upload keystore and enroll in Play App Signing
- **Affected**: AAB signing and Play Store upload
- **Workaround**: Debug builds can be tested internally
- **Deadline**: Before Phase 6 completion

### B4: Firebase Project Configuration
- **Owner**: Engineering lead
- **Action**: Create Firebase project (or add Android app to existing), download `google-services.json` for each flavor (dev/staging/prod)
- **Affected**: Crashlytics, Analytics, FCM
- **Workaround**: App compiles without Firebase (graceful degradation), but no crash reporting
- **Deadline**: Before Phase 4 completion

### B5: Google Play Developer Account
- **Owner**: Product / Business
- **Action**: Ensure Google Play Developer account is active and enrolled, with app listing created
- **Affected**: Internal testing, closed testing, production release
- **Deadline**: Before Phase 6

## Resolved Blockers

_(none yet)_

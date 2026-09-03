# 🚀 Zaruda Platform: Production Feature Planning
## 9 Verified Features — Detailed Implementation & QA Plan

---

## 📍 Feature 1: Hyper-Local Location Engine

### Current Implementation Status: ✅ VERIFIED

| Component | File | Status |
|---|---|---|
| 30-min cooldown | `LocationSetupManager.kt:60` | ✅ `DETECTION_COOLDOWN_MS = 30 * 60 * 1000L` |
| 500m distance delta | `LocationSetupManager.kt:62-69` | ✅ `distanceKm()` function |
| Battery-saver GPS | `LocationSetupManager.kt:142-150` | ✅ `BALANCED_POWER` auto, `HIGH_ACCURACY` manual |
| Offline PIN DB | `LocationSetupManager.kt` | ✅ 500+ Indian pincodes bundled |
| Mock GPS detection | `LocationSetupManager.kt` | ✅ `isFromMockProvider` check |
| PIN code display | `ZarudaTopBar.kt` | ✅ `📍 Kukatpally 500085` format |
| Manual refresh | `ZarudaTopBar.kt` | ✅ Refresh button with loading indicator |
| SharedPreferences | `LocationSetupManager.kt` | ✅ 0ms startup restore |
| IP geolocation fallback | `LocationSetupManager.kt` | ✅ ip-api.com → ipapi.co |

### Production QA Checklist

| # | Test | Expected Result | Priority |
|---|---|---|---|
| 1 | Fresh install → grant location | GPS fix → Geocoder → PIN code displayed | P0 |
| 2 | Deny location permission | IP geolocation fallback → city + PIN | P0 |
| 3 | Walk 500m → open app | Cached PIN reused, no Geocoder call | P0 |
| 4 | Walk 600m → open app | New Geocoder call triggered | P0 |
| 5 | Wait 30 min → open app | New GPS fix requested | P0 |
| 6 | Tap refresh button | Force HIGH_ACCURACY GPS fix | P0 |
| 7 | Enable mock GPS app | Mock detected → fallback to IP | P1 |
| 8 | Indoor/no GPS | IP geolocation → city + PIN | P1 |
| 9 | Enter 6-digit PIN in search | Direct Nominatim lookup → area + PIN | P1 |
| 10 | Kill app → relaunch | Location restored from SharedPreferences in 0ms | P0 |
| 11 | Battery drain test (1hr) | <5% battery used by location | P1 |
| 12 | GPS coordinates accuracy | Within 50m of actual position | P1 |

### Production Configuration

```env
# Location thresholds (already configured in LocationSetupManager)
DETECTION_COOLDOWN_MS=1800000    # 30 minutes
DISTANCE_THRESHOLD_KM=0.5        # 500 meters
GPS_HIGH_ACCURACY_INTERVAL=500   # ms
GPS_BALANCED_INTERVAL=2000       # ms
MAX_ACCURACY_METRES=20
```

### Monitoring Metrics to Track

| Metric | Threshold | Alert |
|---|---|---|
| Geocoder calls per session | <5 | Warning if >10 |
| Average GPS fix time | <5s | Alert if >15s |
| IP fallback rate | <20% | Alert if >40% |
| Battery usage per hour | <5% | Alert if >10% |

---

## ⬅️ Feature 2: Navigation Backstack Fixes

### Current Implementation Status: ✅ VERIFIED

| Component | File | Status |
|---|---|---|
| safePopBack guard | `CategoryAppShell.kt:335-374` | ✅ `if (!innerNav.popBackStack()) onBackToLauncher()` |
| Main back handler | `ZarudaApp.kt:373,416` | ✅ `if (!navController.popBackStack())` |
| ForgotPassword back | `ZarudaApp.kt:544` | ✅ `navController.popBackStack()` |
| SignUp back | `ZarudaApp.kt:554` | ✅ `navController.popBackStack()` |
| Help & Support | `StaticPages.kt` | ✅ Back navigation wired |
| Complaints | `StaticPages.kt` | ✅ Back navigation wired |
| Feedback | `StaticPages.kt` | ✅ Back navigation wired |
| Terms/Privacy/Refund | `StaticPages.kt` | ✅ Back navigation wired |
| Admin Panel | `StaticPages.kt` | ✅ Back navigation wired |
| About Us/FAQ | `StaticPages.kt` | ✅ Back navigation wired |

### Production QA Checklist

| # | Test | Expected Result | Priority |
|---|---|---|---|
| 1 | Home → Category → Back | Returns to Home (not app exit) | P0 |
| 2 | Home → Category → Cart → Back | Returns to Category (not Home) | P0 |
| 3 | Home → Category → Wishlist → Back | Returns to Category (not Home) | P0 |
| 4 | Home → Profile → Help → Back | Returns to Profile | P0 |
| 5 | Home → Profile → Complaints → Back | Returns to Profile | P0 |
| 6 | Home → Profile → Terms → Back | Returns to Profile | P0 |
| 7 | Home → Profile → Admin → Back | Returns to Profile | P0 |
| 8 | Auth → ForgotPassword → Back | Returns to Login | P0 |
| 9 | Auth → SignUp → Back | Returns to Login | P0 |
| 10 | Deep link → Back | Navigates to Home | P1 |
| 11 | System back button on Home | App minimizes (not crash) | P0 |
| 12 | Rapid back button taps | No crash, clean navigation | P1 |

### Backstack Architecture

```
NavHost (Main)
├── Auth Graph
│   ├── Login ←→ SignUp
│   ├── Login → ForgotPassword
│   └── Login → ResetPassword
├── Main Graph
│   ├── Home
│   │   ├── PostDetail
│   │   ├── CreatePost
│   │   └── Search
│   ├── Category App Shell (isolated sub-nav)
│   │   ├── Home (category)
│   │   ├── Categories
│   │   ├── Cart (isolated)
│   │   ├── Wishlist (isolated)
│   │   └── Profile (category)
│   ├── Profile
│   │   ├── Help & Support
│   │   ├── Complaints
│   │   ├── Feedback
│   │   ├── Terms
│   │   ├── Privacy
│   │   ├── Refund
│   │   ├── Admin Panel
│   │   ├── About Us
│   │   └── FAQ
│   ├── Rewards
│   ├── KYC
│   └── Settings
```

---

## 🏠 Feature 3: Home Launcher & Category Isolation

### Current Implementation Status: ✅ VERIFIED

| Component | File | Status |
|---|---|---|
| 4 Category Launchers | `CategoryAppShell.kt:103-106` | ✅ Electronics, Fashion, Vehicles, Others |
| Category Isolation | `CategoryAppShell.kt:181` | ✅ Independent sub-nav per category |
| Cart isolation | `CategoryAppShell.kt:349` | ✅ Category-scoped cart |
| Wishlist isolation | `CategoryAppShell.kt:357` | ✅ Category-scoped wishlist |
| + Sell FAB | `CategoryAppShell.kt` | ✅ Scoped inside category apps |
| Back to launcher | `CategoryAppShell.kt:335-374` | ✅ `onBackToLauncher()` callback |

### Production QA Checklist

| # | Test | Expected Result | Priority |
|---|---|---|---|
| 1 | Tap Electronics launcher | Opens Electronics sub-app shell | P0 |
| 2 | Tap Fashion launcher | Opens Fashion sub-app shell | P0 |
| 3 | Electronics Cart → add item | Only shows in Electronics cart | P0 |
| 4 | Fashion Cart → add item | Only shows in Fashion cart | P0 |
| 5 | Electronics Wishlist → add | Only shows in Electronics wishlist | P0 |
| 6 | Fashion Wishlist → add | Only shows in Fashion wishlist | P0 |
| 7 | Electronics + Sell FAB | Creates listing under Electronics | P0 |
| 8 | Fashion + Sell FAB | Creates listing under Fashion | P0 |
| 9 | Electronics Cart → Back | Returns to Electronics shell | P0 |
| 10 | Fashion Wishlist → Back | Returns to Fashion shell | P0 |
| 11 | Category shell → Home launcher | Returns to main Home | P0 |
| 12 | Cross-category item visibility | Items visible in marketplace feed | P1 |

### Category Architecture

```
Home (Main)
├── 💻 Electronics Launcher → CategoryAppShell("electronics")
│   ├── Home (electronics feed)
│   ├── Categories (electronics subcategories)
│   ├── Cart (electronics only)
│   ├── Wishlist (electronics only)
│   ├── Profile (electronics settings)
│   └── + Sell FAB (creates electronics listing)
├── 👗 Fashion Launcher → CategoryAppShell("fashion")
│   ├── Home (fashion feed)
│   ├── Categories (fashion subcategories)
│   ├── Cart (fashion only)
│   ├── Wishlist (fashion only)
│   ├── Profile (fashion settings)
│   └── + Sell FAB (creates fashion listing)
├── 🚗 Vehicles Launcher → CategoryAppShell("vehicles")
│   └── (same isolation pattern)
└── ✨ Others Launcher → CategoryAppShell("others")
    └── (same isolation pattern)
```

---

## 🌐 Feature 4: 14-Language i18n

### Current Implementation Status: ✅ VERIFIED

| Language | Code | Folder | Status |
|---|---|---|---|
| English | en | `values/` | ✅ Default |
| Hindi | hi | `values-hi/` | ✅ |
| Telugu | te | `values-te/` | ✅ |
| Tamil | ta | `values-ta/` | ✅ |
| Kannada | kn | `values-kn/` | ✅ |
| Malayalam | ml | `values-ml/` | ✅ |
| Bengali | bn | `values-bn/` | ✅ |
| Gujarati | gu | `values-gu/` | ✅ |
| Marathi | mr | `values-mr/` | ✅ |
| Punjabi | pa | `values-pa/` | ✅ |
| Urdu | ur | `values-ur/` | ✅ |
| Arabic | ar | `values-ar/` | ✅ |
| French | fr | `values-fr/` | ✅ |
| Spanish | es | `values-es/` | ✅ |

### Production QA Checklist

| # | Test | Expected Result | Priority |
|---|---|---|---|
| 1 | Switch to Hindi | All UI strings in Hindi | P0 |
| 2 | Switch to Telugu | All UI strings in Telugu | P0 |
| 3 | Switch to Tamil | All UI strings in Tamil | P0 |
| 4 | RTL layout (Urdu/Arabic) | Right-to-left layout correct | P0 |
| 5 | Long text handling | No text overflow/truncation | P1 |
| 6 | Number formatting | Locale-appropriate (1,00,000 vs 100,000) | P1 |
| 7 | Date formatting | Locale-appropriate | P1 |
| 8 | Persistence | Language survives app restart | P0 |
| 9 | Mixed content | English product names in localized UI | P1 |
| 10 | Search in local language | Works with Hindi/Telugu input | P1 |
| 11 | Chat in local language | Sends/receives in local language | P1 |
| 12 | Push notifications | Localized notification text | P1 |

### i18n Architecture

```
res/
├── values/strings.xml          (English - default)
├── values-hi/strings.xml       (Hindi)
├── values-te/strings.xml       (Telugu)
├── values-ta/strings.xml       (Tamil)
├── values-kn/strings.xml       (Kannada)
├── values-ml/strings.xml       (Malayalam)
├── values-bn/strings.xml       (Bengali)
├── values-gu/strings.xml       (Gujarati)
├── values-mr/strings.xml       (Marathi)
├── values-pa/strings.xml       (Punjabi)
├── values-ur/strings.xml       (Urdu - RTL)
├── values-ar/strings.xml       (Arabic - RTL)
├── values-fr/strings.xml       (French)
└── values-es/strings.xml       (Spanish)
```

---

## 🔑 Feature 5: Firebase Auth & 1-Tap Google Login

### Current Implementation Status: ✅ VERIFIED

| Component | File | Status |
|---|---|---|
| Credential Manager | `GoogleSignInHelper.kt:5-10` | ✅ `CredentialManager` + `GetGoogleIdOption` |
| AuthViewModel | `AuthViewModel.kt:41,96-126` | ✅ `googleSignIn()` + `signInWithGoogle()` |
| AuthRepository | `AuthRepository.kt` | ✅ `signInWithGoogle()` → backend |
| Server endpoint | `authController.js` | ✅ `POST /api/auth/google` |
| LoginScreen UI | `LoginScreen.kt` | ✅ "Continue with Google" button |
| SignUpScreen UI | `SignUpScreen.kt` | ✅ "Sign up with Google" button |
| Firebase BOM | `build.gradle.kts` | ✅ `firebase-bom:33.7.0` |
| Credential deps | `build.gradle.kts` | ✅ `credentials:1.3.0`, `googleid:1.1.1` |

### Production QA Checklist

| # | Test | Expected Result | Priority |
|---|---|---|---|
| 1 | Tap "Continue with Google" | Credential Manager bottom sheet opens | P0 |
| 2 | Select Google account | ID token returned → JWT received | P0 |
| 3 | Profile created in DB | User + profile + rewards records | P0 |
| 4 | Tap "Sign up with Google" | Same flow → new account created | P0 |
| 5 | Cancel Google sign-in | Returns to login screen, no error | P0 |
| 6 | Email/password login | Works as fallback | P0 |
| 7 | Forgot password | Firebase reset email sent | P0 |
| 8 | Password strength indicator | Real-time validation | P1 |
| 9 | Session persistence | Survives app restart | P0 |
| 10 | Token refresh | Silent 401 retry works | P0 |
| 11 | Logout → re-login | Clean state reset | P0 |
| 12 | Multiple accounts | Account picker shows all Google accounts | P1 |

### Google Sign-In Flow

```
User taps "Continue with Google"
  ↓
CredentialManager.getCredential(GetGoogleIdOption)
  ↓
Google Account Picker (system UI)
  ↓
User selects account → Google ID token returned
  ↓
AuthViewModel.googleSignIn(idToken)
  ↓
POST /api/auth/google { idToken }
  ↓
Server: Firebase Admin verifyIdToken()
  ↓
Find existing user (by google_id or email) → or create new
  ↓
Create JWT session (access + refresh tokens)
  ↓
Client stores tokens → navigate to main app
```

---

## 🔔 Feature 6: FCM Push Notifications

### Current Implementation Status: ✅ VERIFIED

| Component | File | Status |
|---|---|---|
| 6 notification channels | `ZarudaFirebaseMessagingService.kt:45-50` | ✅ Chat, Transaction, Promotion, Reward, System, General |
| onNewToken | `ZarudaFirebaseMessagingService.kt:56` | ✅ Registers with server |
| onMessageReceived | `ZarudaFirebaseMessagingService.kt:66` | ✅ Routes by type |
| Channel routing | `ZarudaFirebaseMessagingService.kt:81-87` | ✅ Type → channel mapping |
| Deep link handling | `ZarudaFirebaseMessagingService.kt` | ✅ Intent launch |
| Image preview | `ZarudaFirebaseMessagingService.kt` | ✅ Remote image download |
| Server FCM dispatch | `fcmAdminService.js` | ✅ `sendFcmMessage()` with channels |
| Token registration | `AuthRepository.kt:153` | ✅ Sends token on login |

### Production QA Checklist

| # | Test | Expected Result | Priority |
|---|---|---|---|
| 1 | Launch app → check logcat | FCM token registered | P0 |
| 2 | Send test push from Firebase Console | Notification appears on device | P0 |
| 3 | Chat message push | Shows in "Chat & Messages" channel | P0 |
| 4 | Order update push | Shows in "Orders & Payments" channel | P0 |
| 5 | Promo push | Shows in "Promotions & Deals" channel | P0 |
| 6 | Reward push | Shows in "Rewards & Coins" channel | P0 |
| 7 | System push | Shows in "System & Security" channel | P0 |
| 8 | Tap notification → deep link | Opens correct screen | P0 |
| 9 | Background notification | Heads-up notification with sound | P0 |
| 10 | Foreground notification | Custom handling (in-app banner) | P1 |
| 11 | Token refresh → server sync | Old token replaced | P0 |
| 12 | Image preview in notification | Image downloaded and displayed | P1 |
| 13 | Notification settings | User can mute/unmute channels | P1 |
| 14 | Badge count | App icon badge updates | P2 |

### Notification Channel Matrix

| Channel | ID | Importance | Use Case |
|---|---|---|---|
| Chat & Messages | `chat_messages` | HIGH | Direct messages, inquiries |
| Orders & Payments | `transactions` | HIGH | Order updates, payment confirmations |
| Promotions & Deals | `promotions` | DEFAULT | Sales, offers, marketing |
| Rewards & Coins | `rewards` | DEFAULT | Spin wheel, coin rewards, streaks |
| System & Security | `system` | HIGH | Security alerts, account changes |
| General Alerts | `general` | DEFAULT | Platform updates, announcements |

---

## 🛡️ Feature 7: Aadhaar Data Security Compliance

### Current Implementation Status: ✅ VERIFIED

| Check | Evidence | Status |
|---|---|---|
| Memory purge | `AadhaarVerifyScreen.kt:183` — `aadhaarNumber = "" // PURGED!` | ✅ |
| No raw numbers in DB | `020_user_kyc_table.sql` — only `masked_aadhaar` | ✅ |
| Masked format | `XXXX-XXXX-5678` | ✅ |
| KYC ref token | `kyc_ref_token` stored, not raw Aadhaar | ✅ |
| Server-side masking | `authController.js:1408` — `XXXX-XXXX-${aadhaarNumber.slice(-4)}` | ✅ |
| No SharedPreferences | Aadhaar cleared from ViewModel state | ✅ |

### DPDP & UIDAI Compliance Checklist

| # | Requirement | Implementation | Status |
|---|---|---|---|
| 1 | Raw 12-digit never stored in DB | Only `masked_aadhaar` column | ✅ |
| 2 | Raw 12-digit purged from memory | `aadhaarNumber = ""` after verify | ✅ |
| 3 | KYC ref token stored (not Aadhaar) | `kyc_ref_token` column | ✅ |
| 4 | Full address stored for KYC | `full_address`, `house_number`, etc. | ✅ |
| 5 | No Aadhaar in logs | No `Log.d()` with Aadhaar | ✅ |
| 6 | No Aadhaar in network calls | Only sent to Surepass, never logged | ✅ |
| 7 | No Aadhaar in SharedPreferences | Cleared after verification | ✅ |
| 8 | No Aadhaar in screenshots | Sensitive fields masked in UI | ✅ |
| 9 | Encrypted storage | EncryptedSharedPreferences for tokens | ✅ |
| 10 | Audit trail | `kyc_verification_log` table | ✅ |

### Security Audit Checklist

| # | Test | Expected Result | Priority |
|---|---|---|---|
| 1 | Verify Aadhaar → check DB | Only XXXX-XXXX-5678 stored | P0 |
| 2 | Verify Aadhaar → check memory | ViewModel state cleared | P0 |
| 3 | Verify Aadhaar → check logs | No Aadhaar in logcat | P0 |
| 4 | Verify Aadhaar → check network | Only Surepass API call | P0 |
| 5 | Verify Aadhaar → check SharedPreferences | No Aadhaar stored | P0 |
| 6 | Force close during OTP | Aadhaar not leaked | P0 |
| 7 | Screen recording | Aadhaar masked in recordings | P1 |
| 8 | Accessibility service | Aadhaar not exposed | P1 |

---

## 🗄️ Feature 8: PostgreSQL KYC Migration

### Current Implementation Status: ✅ VERIFIED

| Component | File | Status |
|---|---|---|
| Table creation | `020_user_kyc_table.sql:4` | ✅ `CREATE TABLE IF NOT EXISTS user_kyc` |
| UUID primary key | `020_user_kyc_table.sql:5` | ✅ `id UUID PRIMARY KEY` |
| Masked Aadhaar | `020_user_kyc_table.sql:10` | ✅ `masked_aadhaar VARCHAR(20)` |
| KYC ref token | `020_user_kyc_table.sql:11` | ✅ `kyc_ref_token VARCHAR(100)` |
| Full name | `020_user_kyc_table.sql:13` | ✅ `full_name VARCHAR(150)` |
| Full address | `020_user_kyc_table.sql:20` | ✅ `full_address TEXT` |
| Address breakdown | `020_user_kyc_table.sql:21-26` | ✅ House, street, locality, district, state, pincode |
| FK to users | `020_user_kyc_table.sql:6` | ✅ `user_id UUID REFERENCES users(id)` |
| CASCADE delete | `020_user_kyc_table.sql:6` | ✅ `ON DELETE CASCADE` |

### Database Schema

```sql
user_kyc
├── id (UUID PK)
├── user_id (UUID FK → users)
├── kyc_status (VARCHAR) — 'PENDING', 'VERIFIED', 'FAILED'
├── masked_aadhaar (VARCHAR) — 'XXXX-XXXX-5678'
├── kyc_ref_token (VARCHAR) — Surepass transaction ID
├── full_name (VARCHAR)
├── dob (DATE)
├── gender (VARCHAR)
├── profile_image_base64 (TEXT) — optional
├── full_address (TEXT)
├── house_number (VARCHAR)
├── street (VARCHAR)
├── locality (VARCHAR)
├── district (VARCHAR)
├── state (VARCHAR)
├── pincode (VARCHAR)
└── verified_at (TIMESTAMPTZ)
```

### Production QA Checklist

| # | Test | Expected Result | Priority |
|---|---|---|---|
| 1 | Run migration on fresh DB | Table created with all columns | P0 |
| 2 | Run migration again (idempotent) | No error, no duplicates | P0 |
| 3 | Insert KYC record | All fields stored correctly | P0 |
| 4 | Query by user_id | Returns correct KYC record | P0 |
| 5 | Delete user → KYC cascade | KYC record deleted | P0 |
| 6 | Verify masked Aadhaar format | `XXXX-XXXX-5678` | P0 |
| 7 | Verify address breakdown | All fields populated | P1 |
| 8 | Verify timestamp | `verified_at` set correctly | P1 |

---

## 🌐 Feature 9: Surepass API Endpoints

### Current Implementation Status: ✅ VERIFIED

| Endpoint | Route | Handler | Status |
|---|---|---|---|
| Send OTP | `POST /api/auth/aadhaar/send-otp` | `authController.js:1376` | ✅ |
| Verify OTP | `POST /api/auth/aadhaar/verify-otp` | `authController.js:1417` | ✅ |
| Complete Signup | `POST /api/auth/aadhaar/complete-signup` | `authController.js:257` | ✅ |
| Rate limiting | `auth.js:235-244` | `authAnomalyThrottle` | ✅ |
| Input validation | `authController.js:1378` | `isValidAadhaarNumber` | ✅ |
| Normalization | `authController.js:1376` | `normalizeAadhaar` | ✅ |

### API Flow

```
1. POST /api/auth/aadhaar/send-otp
   Request: { aadhaarNumber: "123456789012", mobileNumber: "9876543210" }
   Response: { success: true, clientId: "surepass_ref_xxx" }

2. POST /api/auth/aadhaar/verify-otp
   Request: { aadhaarNumber: "123456789012", mobileNumber: "9876543210", otp: "123456", txnId: "xxx" }
   Response: {
     success: true,
     kyc: {
       maskedAadhaar: "XXXX-XXXX-9012",
       fullName: "Laksh User",
       fullAddress: "House No 42, Green Avenue, Indiranagar, Bengaluru, Karnataka - 560038"
     }
   }

3. POST /api/auth/aadhaar/complete-signup
   Request: { userId, kycData }
   Response: { success: true, kycStatus: "VERIFIED" }
```

### Production QA Checklist

| # | Test | Expected Result | Priority |
|---|---|---|---|
| 1 | Send OTP with valid Aadhaar | Surepass API called, OTP sent | P0 |
| 2 | Send OTP with invalid Aadhaar | Validation error returned | P0 |
| 3 | Verify OTP with correct code | KYC verified, masked Aadhaar stored | P0 |
| 4 | Verify OTP with wrong code | Error returned, not verified | P0 |
| 5 | Rate limit (10 req/min) | 429 Too Many Requests | P0 |
| 6 | Complete signup | User KYC status updated | P0 |
| 7 | Surepass API down | Graceful error, retry possible | P1 |
| 8 | Timeout handling | 30s timeout, error returned | P1 |
| 9 | Audit log | `kyc_verification_log` entry created | P1 |
| 10 | Duplicate verification | Idempotent — no double insert | P1 |

### Surepass Configuration

```env
# server/.env
SUREPASS_API_URL=https://kyc-api.surepass.io/api/v1
SUREPASS_BEARER_TOKEN=your_production_token
KYC_MODE=production
```

---

## 📊 Production Launch Master Checklist

### Pre-Launch (T-7 days)

| # | Task | Owner | Status |
|---|---|---|---|
| 1 | Replace all staging credentials with production | DevOps | ⬜ |
| 2 | Register SHA-1/SHA-256 in Firebase Console | DevOps | ⬜ |
| 3 | Update GOOGLE_WEB_CLIENT_ID in local.properties | Dev | ⬜ |
| 4 | Set SUREPASS_BEARER_TOKEN (production) | DevOps | ⬜ |
| 5 | Set RAZORPAY_KEY_ID (production) | DevOps | ⬜ |
| 6 | Run full migration on production DB | DevOps | ⬜ |
| 7 | Seed production categories and tiers | DevOps | ⬜ |
| 8 | Run smoke test suite | QA | ⬜ |

### Launch Day (T-0)

| # | Task | Owner | Status |
|---|---|---|---|
| 1 | Build release AAB | Dev | ⬜ |
| 2 | Upload to Play Console (internal testing) | Dev | ⬜ |
| 3 | Verify FCM push on physical device | QA | ⬜ |
| 4 | Verify Google Sign-In on physical device | QA | ⬜ |
| 5 | Verify location on physical device | QA | ⬜ |
| 6 | Verify Aadhaar KYC flow | QA | ⬜ |
| 7 | Monitor error rates for 1 hour | DevOps | ⬜ |
| 8 | Promote to production track | DevOps | ⬜ |

### Post-Launch (T+1 day)

| # | Task | Owner | Status |
|---|---|---|---|
| 1 | Monitor crash rates in Firebase Crashlytics | DevOps | ⬜ |
| 2 | Monitor API error rates | DevOps | ⬜ |
| 3 | Check user feedback | Product | ⬜ |
| 4 | Verify push notification delivery rates | DevOps | ⬜ |
| 5 | Check database performance | DevOps | ⬜ |
| 6 | Review security audit logs | Security | ⬜ |

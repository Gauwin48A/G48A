# 📱 Google Play Store Metadata — Zaruda App

## App Listing

### Title
```
Zaruda — Buy, Sell & Discover Near You
```

### Short Description (80 chars max)
```
Buy & sell anything in your neighborhood. Hyper-local marketplace with verified sellers.
```

### Full Description (4000 chars max)
```
Zaruda is India's hyper-local marketplace where you can buy, sell, and discover anything in your neighborhood. Whether you're looking for electronics, fashion, furniture, vehicles, or everyday essentials — Zaruda connects you with verified sellers right in your city.

🔑 KEY FEATURES:

📍 HYPER-LOCAL DISCOVERY
• Automatic PIN code detection (e.g., Kukatpally 500085)
• Browse listings filtered by your exact location
• Battery-optimized GPS with smart 500m movement throttling

🛒 SMART MARKETPLACE
• 4 category launchers: Electronics, Fashion, Vehicles, Others
• 5-step listing wizard with photo upload to Cloudflare CDN
• Full-text search with instant results
• Price drop alerts for saved items

💬 MAKING OFFERS
• Negotiate prices with counter-offer system
• 48-hour auto-expiry on offers
• Real-time FCM push notifications for offers and messages

🔐 SECURE TRANSACTIONS
• P2P sale verification with secret OTP handshake
• Digital receipt generation
• Buyer/seller rating system with verified purchase badges

🏆 GAMIFICATION & REWARDS
• Daily spin wheel to earn coins
• XP leveling system with Bronze/Silver/Gold tiers
• Referral rewards with multi-level chain bonuses
• Daily check-in streaks

🏪 STOREFRONTS & CHANNELS
• Verified business storefronts (Centre pages)
• Follow your favorite sellers
• Storefront update posts and announcements

🌐 14 LANGUAGES
• Full native support for Hindi, Telugu, Tamil, Kannada, Malayalam, Bengali, Gujarati, Marathi, Punjabi, Urdu, Arabic, French, Spanish, and English

🛡️ TRUST & SAFETY
• Aadhaar KYC verification for trusted sellers
• Content moderation and fraud reporting
• User blocking for safety

📱 MODERN & FAST
• Material 3 design with dark mode support
• Smooth animations and micro-interactions
• Offline support with local caching

Download Zaruda today and join your local marketplace community!
```

### What's New (Release Notes)
```
🚀 Zaruda v1.0 — Initial Production Release

✅ Hyper-local PIN code detection with battery-optimized GPS
✅ 4 category launchers with isolated cart/wishlist
✅ Firebase 1-Tap Google Sign-In
✅ FCM push notifications with 6 channels
✅ Daily spin wheel and rewards system
✅ Aadhaar KYC verification
✅ 14-language support
✅ P2P sales with OTP verification
✅ Make offers with counter-price negotiation
✅ Verified seller storefronts
```

---

## Data Safety Section (Play Console)

### Data Collection & Sharing

| Data Type | Collected | Shared | Purpose |
|---|---|---|---|
| **Personal Info** (Name, Email, Phone) | ✅ Yes | ❌ No | Account creation & authentication |
| **Location** (GPS, City, PIN code) | ✅ Yes | ❌ No | Hyper-local marketplace listings |
| **Photos/Media** (Listing images, profile photos) | ✅ Yes | ❌ No | Marketplace listings & profiles |
| **Audio** (Voice notes on listings) | ✅ Yes | ❌ No | Listing audio descriptions |
| **Device IDs** (FCM token, device model) | ✅ Yes | ❌ No | Push notifications |
| **Financial Info** (Payment method, UPI ID) | ✅ Yes | ❌ No | Payment processing via Razorpay |
| **Identity** (Aadhaar - masked only) | ✅ Yes | ❌ No | KYC verification (DPDP compliant) |
| **Usage Data** (App interactions, search queries) | ✅ Yes | ❌ No | Analytics & crash reporting |
| **Contacts** | ❌ No | ❌ No | Not collected |
| **SMS** | ❌ No | ❌ No | Not collected |
| **Call Logs** | ❌ No | ❌ No | Not collected |

### Data Security

| Security Measure | Status |
|---|---|
| Data encrypted in transit (HTTPS/TLS) | ✅ |
| Data encrypted at rest (EncryptedSharedPreferences) | ✅ |
| Data can be deleted on request | ✅ |
| Data shared with 3rd parties | ❌ No |
| Data moderation practices | ✅ Content moderation & fraud detection |

### Privacy Policy URL
```
https://zaruda.com/privacy
```

### Data Safety Form Answers

```
Does your app collect or share any of this user data?
→ Yes

Is all of this data collected or shared?
→ Collected, but not shared

What is the purpose of collecting this data?
→ App functionality, Personalization, Analytics

Is the data collection required or optional?
→ Required for core features (location, photos, payments)
→ Optional for analytics and crash reporting

Can users opt out of data collection?
→ Yes, through device settings (location, notifications)

Describe how your app handles user data:
- Location: Used only for hyper-local marketplace. Not stored permanently.
- Photos: Stored in Cloudflare R2 (encrypted). Can be deleted by user.
- Audio: Stored in Cloudflare R2 (encrypted). Can be deleted by user.
- Aadhaar: Only masked version (XXXX-XXXX-1234) stored. Raw numbers purged immediately.
- Payment: Processed via Razorpay. No card details stored on our servers.
```

---

## App Content Rating

### IARC Questionnaire Answers

| Question | Answer |
|---|---|
| App category | Shopping |
| Does the app contain user-generated content? | Yes |
| Does the app allow users to interact? | Yes (chat, offers) |
| Does the app share user location? | Yes (for marketplace) |
| Does the app contain ads? | No |
| Does the app offer in-app purchases? | Yes (subscription tiers) |
| Target age group | 13+ |

---

## Store Listing Requirements

### Graphics

| Asset | Dimensions | Required |
|---|---|---|
| App Icon | 512x512 PNG | ✅ Yes |
| Feature Graphic | 1024x500 PNG | ✅ Yes |
| Phone Screenshots | 16:9 or 9:16, min 2 | ✅ Yes (min 4 recommended) |
| 7-inch Tablet Screenshots | 16:9 or 9:16 | Optional |
| 10-inch Tablet Screenshots | 16:9 or 9:16 | Optional |
| TV Banner | 1280x720 PNG | Optional |
| Wear Screenshots | 384x384 PNG | Optional |

### Screenshot Content (Recommended)

| # | Screen | Caption |
|---|---|---|
| 1 | Home Screen | "Discover items near you" |
| 2 | Category Launcher | "Shop by category" |
| 3 | Post Detail | "View details & make offers" |
| 4 | Create Listing | "5-step listing wizard" |
| 5 | Rewards Screen | "Earn coins with daily spin" |
| 6 | Profile Screen | "Your verified profile" |

---

## Release Checklist

### Pre-Release

| # | Task | Status |
|---|---|---|
| 1 | App icon uploaded (512x512) | ⬜ |
| 2 | Feature graphic uploaded (1024x500) | ⬜ |
| 3 | Minimum 4 screenshots uploaded | ⬜ |
| 4 | App title & descriptions filled | ⬜ |
| 5 | Privacy policy URL set | ⬜ |
| 6 | Data safety form completed | ⬜ |
| 7 | Content rating questionnaire completed | ⬜ |
| 8 | Target audience & age set | ⬜ |
| 9 | Store listing contact email set | ⬜ |
| 10 | Release notes written | ⬜ |

### Technical

| # | Task | Status |
|---|---|---|
| 1 | Release AAB built (`bundleRelease`) | ⬜ |
| 2 | App signed with release keystore | ⬜ |
| 3 | ProGuard/R8 minification enabled | ⬜ |
| 4 | Version code incremented | ⬜ |
| 5 | Version name updated | ⬜ |
| 6 | Target SDK = 34 (Android 14) | ⬜ |
| 7 | Min SDK = 24 (Android 7.0) | ⬜ |
| 8 | No test/debug code in release | ⬜ |
| 9 | No hardcoded API keys | ⬜ |
| 10 | google-services.json is production | ⬜ |

### Compliance

| # | Task | Status |
|---|---|---|
| 1 | Privacy policy page live at zaruda.com/privacy | ⬜ |
| 2 | Terms of service page live | ⬜ |
| 3 | Data deletion mechanism works | ⬜ |
| 4 | Account deletion flow implemented | ⬜ |
| 5 | GDPR compliance verified | ⬜ |
| 6 | DPDP compliance verified (Aadhaar) | ⬜ |
| 7 | No restricted content | ⬜ |
| 8 | Age-appropriate content | ⬜ |

---

## Production Environment Variables Checklist

### Firebase (4.1)
```
✅ FIREBASE_SERVICE_ACCOUNT_PATH=./firebase/firebase-admin.json
✅ FCM_PROJECT_ID=garudahub-bc561
✅ FCM_CLIENT_EMAIL=firebase-adminsdk-xxxxx@garudahub-bc561.iam.gserviceaccount.com
✅ FCM_PRIVATE_KEY="<service account private_key value>" (optional, when not using FIREBASE_SERVICE_ACCOUNT_PATH)
✅ GOOGLE_WEB_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
```

### Cloudflare (4.2)
```
✅ R2_ENDPOINT=https://ACCOUNT_ID.r2.cloudflarestorage.com
✅ R2_ACCESS_KEY_ID=YOUR_ACCESS_KEY
✅ R2_SECRET_ACCESS_KEY=YOUR_SECRET_KEY
✅ R2_BUCKET_NAME=zaruda-media
✅ R2_PUBLIC_URL=https://cdn.zaruda.com
```

### Surepass (4.3)
```
✅ SUREPASS_API_URL=https://kyc-api.surepass.io/api/v1
✅ SUREPASS_BEARER_TOKEN=YOUR_SUREPASS_TOKEN
✅ KYC_MODE=production
```

### Razorpay (4.4)
```
✅ RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxxx
✅ RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxx
✅ RAZORPAY_WEBHOOK_SECRET=YOUR_WEBHOOK_SECRET
```

### Server (4.5)
```
✅ NODE_ENV=production
✅ PORT=8081
✅ DB_HOST=127.0.0.1
✅ DB_PORT=5432
✅ DB_NAME=mhub_db
✅ DB_USER=zaruda_app
✅ DB_PASSWORD=GENERATE_STRONG_PASSWORD
✅ JWT_SECRET=GENERATE_64_CHAR_HEX
✅ JWT_REFRESH_SECRET=GENERATE_64_CHAR_HEX
✅ REDIS_HOST=127.0.0.1
✅ REDIS_PORT=6379
```

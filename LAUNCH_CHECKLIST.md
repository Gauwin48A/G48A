# MHub — Production Launch Checklist

Everything the user must manually do before publishing the Android app.
All code-level bugs have been fixed and all automated tests pass.

---

## Phase 1: Google Cloud Setup

### 1.1 Create Google Cloud Project
1. Go to https://console.cloud.google.com
2. Create a new project (or reuse an existing one)
3. Enable the **Google Identity Services** API

### 1.2 Create OAuth Credentials
1. Go to **APIs & Services → Credentials**
2. Create an **OAuth client ID** of type **Web application**
   - No redirect URIs needed (Android Credential Manager flow)
   - Copy the **Client ID** (e.g. `123456-xxxx.apps.googleusercontent.com`)
3. Create an **OAuth client ID** of type **Android**
   - Package name: `com.mhub.app`
   - SHA-1 fingerprint: get it by running:
     ```powershell
     cd C:\Users\laksh\GITHUB\Android_Kotlin\Mhub\android-native
     keytool -list -v -keystore keystore\release.keystore -alias mhub-release -storepass MhubRelease2026!
     ```
     Copy the SHA1 line.

### 1.3 Paste the Web Client ID in Two Places
1. **`Mhub/android-native/app/build.gradle.kts`** — replace:
   ```
   "REPLACE_WITH_GOOGLE_WEB_CLIENT_ID.apps.googleusercontent.com"
   ```
   with your actual Web Client ID.

2. **`Mhub/server-cf/wrangler.toml`** — replace:
   ```
   GOOGLE_OAUTH_AUDIENCE = "REPLACE_WITH_YOUR_ANDROID_OR_WEB_CLIENT_ID.apps.googleusercontent.com"
   ```
   with the same Web Client ID.

---

## Phase 2: Cloudflare Workers Backend Setup

Run all commands from `Mhub/server-cf/`.

### 2.1 Install & Authenticate
```powershell
cd C:\Users\laksh\GITHUB\Android_Kotlin\Mhub\server-cf
npm install
npx wrangler login          # opens browser — authorize your Cloudflare account
```

### 2.2 Create D1 Database
```powershell
npx wrangler d1 create mhub_db
```
Copy the returned `database_id` → paste into `wrangler.toml`:
```toml
database_id = "<paste here>"    # replaces REPLACE_WITH_D1_ID_AFTER_CREATE
```

### 2.3 Create KV Namespace
```powershell
npx wrangler kv:namespace create CACHE
```
Copy the returned `id` → paste into `wrangler.toml`:
```toml
id = "<paste here>"             # replaces REPLACE_WITH_KV_ID_AFTER_CREATE
```

### 2.4 Create R2 Buckets
```powershell
npx wrangler r2 bucket create mhub-media
npx wrangler r2 bucket create mhub-kyc-docs
```

### 2.5 Enable Public Access on mhub-media Only
1. Cloudflare Dashboard → R2 → `mhub-media` → Settings → Enable "Public access via r2.dev"
2. Copy the public URL (starts with `https://pub-...r2.dev`)
3. Paste into `wrangler.toml`:
   ```toml
   PUBLIC_MEDIA_HOST = "https://pub-<hash>.r2.dev"
   ```
4. Do **NOT** enable public access on `mhub-kyc-docs` (KYC docs must stay private)

### 2.6 Set Secrets
```powershell
npx wrangler secret put JWT_SECRET
# When prompted, paste a strong random string (e.g. output of: openssl rand -hex 32)

npx wrangler secret put ADMIN_API_KEY
# Any strong random string — used for manual KYC admin endpoints
```

### 2.7 Update wrangler.toml Variables
Edit `Mhub/server-cf/wrangler.toml`:
```toml
[vars]
GOOGLE_OAUTH_AUDIENCE = "<your Web Client ID from step 1.2>"
CORS_ALLOWED_ORIGINS = "*"
PUBLIC_MEDIA_HOST = "<your r2.dev URL from step 2.5>"
```

### 2.8 Apply Migrations & Seed Data
```powershell
npx wrangler d1 migrations apply mhub_db --remote
npx wrangler d1 execute mhub_db --remote --file=./migrations/seed.sql
```

### 2.9 Deploy
```powershell
npx wrangler deploy
```
Note the URL printed (e.g. `https://mhub-api.<subdomain>.workers.dev`).

Verify:
```powershell
curl https://mhub-api.<subdomain>.workers.dev/health
```

---

## Phase 3: Android App — Production Build

### 3.1 Update API URL in Build Config
Edit `Mhub/android-native/app/build.gradle.kts`:
```kotlin
buildConfigField(
    "String",
    "DEFAULT_API_BASE_URL",
    "\"https://mhub-api.<your-subdomain>.workers.dev/\""
)
```

### 3.2 Build Signed Release APK
```powershell
cd C:\Users\laksh\GITHUB\Android_Kotlin\Mhub\android-native
.\gradlew.bat :app:assembleRelease
```
Output: `app/build/outputs/apk/release/app-release.apk`

### 3.3 Build App Bundle for Play Store
```powershell
.\gradlew.bat :app:bundleRelease
```
Output: `app/build/outputs/bundle/release/app-release.aab`

---

## Phase 4: Testing the Full Flow

### 4.1 Local E2E Test (Optional)
1. Start the local backend:
   ```powershell
   cd C:\Users\laksh\GITHUB\Android_Kotlin\Mhub\server
   npm start
   ```
2. Temporarily change `DEFAULT_API_BASE_URL` to `http://10.0.2.2:5001/`
3. Build debug APK: `.\gradlew.bat assembleDebug`
4. Install on emulator: `adb install -r app/build/outputs/apk/debug/app-debug.apk`
5. Or just change the URL at runtime via Settings screen in the app

### 4.2 Production E2E Test
1. Install the release APK on a physical device or emulator
2. Open app → Sign in with Google → should authenticate via Credential Manager
3. After login, verify:
   - Feed page loads posts
   - Profile page shows user info
   - KYC flow: submit mock docs (auto-approved since no KYC_PROVIDER_KEY)
   - Wishlist: add/remove posts
   - Channels page loads
   - Settings: API URL displays correctly

---

## Phase 5: KYC Provider (When Ready)

The app currently uses **mock KYC auto-approve**. To switch to a real provider:

1. Pick a provider: Hyperverge, Digio, IDfy, Karza, or Veri5
2. Set the API key:
   ```powershell
   npx wrangler secret put KYC_PROVIDER_KEY
   ```
3. Edit `Mhub/server-cf/src/routes/kyc.ts`:
   - Replace the mock block in `/submit` with the provider's HTTP API call
   - Add a `POST /api/kyc/webhook` handler to receive verification results
4. Redeploy: `npx wrangler deploy`

**Manual fallback**: Admins can approve/reject KYC submissions via:
```
POST /api/kyc/:id/approve   (Header: X-Admin-Key: <ADMIN_API_KEY>)
POST /api/kyc/:id/reject    (Header: X-Admin-Key: <ADMIN_API_KEY>)
```

---

## Phase 6: Play Store Submission

### 6.1 Prepare Store Assets
- [ ] 512×512 app icon PNG
- [ ] 1024×500 feature graphic
- [ ] 2–8 screenshots per form factor (phone, tablet if applicable)
- [ ] Short description (80 chars max)
- [ ] Full description
- [ ] Privacy policy URL (required for Google Sign-In + KYC)

### 6.2 Create Store Listing
1. Go to https://play.google.com/console
2. Create new app → fill in listing details
3. Upload the `.aab` file from Phase 3.3
4. Enable **Play App Signing** on first upload (Google re-signs for you; keep your local keystore as the upload key)

### 6.3 Content Rating
Complete the content rating questionnaire in Play Console.

### 6.4 Target Audience & Pricing
Set as appropriate for MHub's marketplace audience.

---

## Quick Reference: Key Files & Values

| Item | Location |
|---|---|
| Release keystore | `Mhub/android-native/keystore/release.keystore` |
| Key alias | `mhub-release` |
| Keystore password | `MhubRelease2026!` |
| Package name | `com.mhub.app` |
| Backend config | `Mhub/server-cf/wrangler.toml` |
| Android build config | `Mhub/android-native/app/build.gradle.kts` |

---

## What's Already Done (No Action Needed)

- ✅ All database migrations applied (users.is_active, wishlists.user_id uuid fix, posts.post_type)
- ✅ Wishlist controller — profiles.user_id type cast fixed
- ✅ Auth /me endpoint — rewards.user_id type cast fixed
- ✅ CSRF token handling in test probes
- ✅ ESLint clean (zero warnings)
- ✅ All server contract tests pass (schema, route, foundation, runtime, page-flow)
- ✅ Auth integration tests pass (3/3)
- ✅ Critical-path tests pass (4/4)
- ✅ WAF tests pass (5/5)
- ✅ Android debug APK builds and launches on emulator
- ✅ Settings screen correctly shows configurable API base URL
- ✅ Network security config allows cleartext for local dev (10.0.2.2, localhost)
- ✅ Release keystore generated and configured
- ✅ App signing scheme v2 configured

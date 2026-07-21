# MHub — Cloudflare + Android deployment guide

End-to-end instructions for deploying the MHub backend on Cloudflare Workers + D1 + R2 +
KV and wiring the signed Android APK to it.

---

## 1. Architecture

```
┌──────────────┐        HTTPS         ┌───────────────────────────────────┐
│ Android app  │ ───────────────────▶ │ Cloudflare Worker (Hono)          │
│ (Kotlin)     │                      │   /api/auth/google                 │
│              │                      │   /api/posts                       │
│              │ ◀─────── JWT ─────── │   /api/uploads/post-image (R2)     │
└──────────────┘                      │   /api/kyc/*                       │
                                      │   /api/wishlist                    │
                                      └──┬──────────┬──────────┬──────────┘
                                         │          │          │
                                    ┌────▼────┐ ┌───▼───┐ ┌────▼─────┐
                                    │  D1 DB  │ │  KV   │ │  R2      │
                                    │ (SQLite)│ │(cache │ │ (media + │
                                    │         │ │ +rate)│ │ kyc-docs)│
                                    └─────────┘ └───────┘ └──────────┘
```

Free tier limits comfortably support launch-scale traffic:
- Workers: 100k requests/day
- D1: 5 GB storage, 5M rows read/day
- KV: 100k reads/day
- R2: 10 GB storage, no egress fees

---

## 2. One-time Cloudflare setup

From `Mhub/server-cf/`:

```powershell
cd C:\Users\laksh\GITHUB\Android_Kotlin\Mhub\server-cf
npm install
npx wrangler login                 # opens browser; authorize
```

### 2.1 Create D1 database

```powershell
npx wrangler d1 create mhub_db
```

Copy the returned `database_id` into `wrangler.toml` under
`[[d1_databases]] database_id = "..."` (replaces `REPLACE_WITH_D1_ID_AFTER_CREATE`).

### 2.2 Create KV namespace

```powershell
npx wrangler kv:namespace create CACHE
```

Copy the `id` into `wrangler.toml` under `[[kv_namespaces]] id = "..."`.

### 2.3 Create R2 buckets

```powershell
npx wrangler r2 bucket create mhub-media
npx wrangler r2 bucket create mhub-kyc-docs
```

### 2.4 Set secrets

```powershell
# Generate a strong random JWT secret (run once, paste when prompted)
npx wrangler secret put JWT_SECRET
# example value: use a 64-char random hex, e.g. from `openssl rand -hex 32`

# Optional admin API key for manual KYC review:
npx wrangler secret put ADMIN_API_KEY

# When you wire a real KYC provider (Hyperverge/Digio/IDfy), set its API key:
# npx wrangler secret put KYC_PROVIDER_KEY
```

### 2.5 Edit `wrangler.toml` variables

```toml
[vars]
ENV = "production"
# Paste your Google OAuth Web Client ID here (same value as Android BuildConfig):
GOOGLE_OAUTH_AUDIENCE = "123456-xxxx.apps.googleusercontent.com"
# Restrict to your app domain once you have one; "*" is OK for mobile-only:
CORS_ALLOWED_ORIGINS = "*"
# After you enable R2 public access below:
PUBLIC_MEDIA_HOST = "https://pub-<hash>.r2.dev"
```

### 2.6 Enable public R2 access for post images

In the Cloudflare dashboard → R2 → `mhub-media` → Settings → "Public access" →
Enable via r2.dev subdomain. Copy the public URL (starts with `https://pub-...r2.dev`)
and paste it into `PUBLIC_MEDIA_HOST` in `wrangler.toml`.

Do **not** enable public access on `mhub-kyc-docs`. KYC docs must stay private.

### 2.7 Apply database migrations

```powershell
npx wrangler d1 migrations apply mhub_db --remote
npx wrangler d1 execute mhub_db --remote --file=./migrations/seed.sql
```

### 2.8 Deploy

```powershell
npx wrangler deploy
```

This prints a URL like `https://mhub-api.<your-subdomain>.workers.dev`. Save it.

Verify:

```powershell
curl https://mhub-api.<your-subdomain>.workers.dev/health
# → {"status":"ok","ts":"..."}
```

---

## 3. Google OAuth setup

1. Go to <https://console.cloud.google.com> → APIs & Services → Credentials.
2. Create **OAuth client ID** of type **Web application**.
   - Authorized redirect URIs: not needed for Android Credential Manager.
   - Copy the **Client ID** (looks like `123456-xxxx.apps.googleusercontent.com`).
3. Create **OAuth client ID** of type **Android**.
   - Package name: `com.zaruda.app`
   - SHA-1: obtained from the release keystore:
     ```powershell
     cd C:\Users\laksh\GITHUB\Android_Kotlin\Mhub\android-native
     keytool -list -v -keystore keystore\release.keystore -alias mhub-release -storepass MhubRelease2026!
     ```
     Use the "SHA1" line.
4. Paste the **Web Client ID** (from step 2) into:
   - `Mhub/server-cf/wrangler.toml` → `GOOGLE_OAUTH_AUDIENCE`
   - `Mhub/android-native/app/build.gradle.kts` → `GOOGLE_WEB_CLIENT_ID`
5. Re-deploy both:
   ```powershell
   cd C:\Users\laksh\GITHUB\Android_Kotlin\Mhub\server-cf ; npx wrangler deploy
   cd C:\Users\laksh\GITHUB\Android_Kotlin\Mhub\android-native ; .\gradlew.bat :app:assembleRelease
   ```

---

## 4. Pointing the APK at your backend

Two ways:

### A. Bake the URL into the build

Edit `Mhub/android-native/app/build.gradle.kts`:

```kotlin
buildConfigField(
    "String",
    "DEFAULT_API_BASE_URL",
    "\"https://mhub-api.<your-subdomain>.workers.dev/\""
)
```

Then rebuild the APK.

### B. Override at runtime

Install the APK, open the app → **Settings** icon (top-right on login screen) →
set **API base URL** to your Workers URL → Save.

---

## 5. KYC

The current `/api/kyc/submit` endpoint uses a **mock provider** that auto-approves
submissions (so the end-to-end flow is testable out of the box). To switch to a real
paid KYC provider:

1. Pick a provider (Hyperverge, Digio, IDfy, Karza, Veri5).
2. Set the secret: `npx wrangler secret put KYC_PROVIDER_KEY`.
3. In `Mhub/server-cf/src/routes/kyc.ts`, the `/submit` handler already branches on
   `env.KYC_PROVIDER_KEY` being set: replace the stubbed block with the provider's
   HTTP call, and add a `POST /api/kyc/webhook` handler that verifies the provider's
   signature and updates the submission (`approveSubmission` / rejection path).

Manual fallback: admins can approve/reject any submission via
`POST /api/kyc/:id/approve` or `POST /api/kyc/:id/reject` using the `X-Admin-Key`
header set to the value of the `ADMIN_API_KEY` secret.

---

## 6. Signed APK facts

| Property | Value |
|---|---|
| Location | `Mhub/android-native/app/build/outputs/apk/release/app-release.apk` |
| Size | ~2.23 MB |
| Package | `com.zaruda.app` |
| versionCode / versionName | `1` / `1.0.0` |
| minSdk / targetSdk / compileSdk | `24` / `35` / `35` |
| Signing scheme | APK Signature Scheme v2 |
| Keystore | `Mhub/android-native/keystore/release.keystore` |
| Key alias | `mhub-release` |
| Store/key password | `MhubRelease2026!` |
| Keystore SHA-256 | `FB:46:88:AC:86:CF:3D:BA:A1:AB:F6:DC:0F:1F:3C:7F:15:D2:72:03:76:C1:71:BC:6A:31:20:96:D0:8D:53:49` |
| Validity | Sept 2053 (27 years) |

> Keep `keystore.properties` and `release.keystore` out of version control. They are
> already ignored in `.gitignore`.

---

## 7. Play Store readiness checklist

- [ ] Replace the placeholder Google Web Client ID with a real one.
- [ ] Verify SHA-1 added to Android OAuth client matches the release keystore.
- [ ] Replace the mock KYC provider with a real one (see section 5).
- [ ] Replace placeholder `app_name`/brand strings/icons if needed
      (see `res/values/strings.xml` and `res/mipmap-*/ic_launcher.*`).
- [ ] Create a privacy policy URL (required for Google Sign-In + KYC).
- [ ] Prepare Play Store listing assets: 512×512 icon, 1024×500 feature graphic,
      2–8 screenshots per form factor, short description (80 chars), full
      description.
- [ ] Upload as an **app bundle** (`.aab`) for Play (Play requires AAB for new apps):
      `.\gradlew.bat :app:bundleRelease`. The signed `.aab` will be at
      `app/build/outputs/bundle/release/app-release.aab`.
- [ ] Enable **Play App Signing** on first upload (Google re-signs on your behalf;
      keep your local keystore as the upload key).

---

## 8. Common runtime commands

| Task | Command |
|---|---|
| Run Workers locally | `cd Mhub/server-cf ; npx wrangler dev` |
| Tail production logs | `npx wrangler tail` |
| List D1 tables | `npx wrangler d1 execute mhub_db --remote --command "SELECT name FROM sqlite_master WHERE type='table';"` |
| Inspect a user | `npx wrangler d1 execute mhub_db --remote --command "SELECT id,email,role,kyc_status FROM users LIMIT 10;"` |
| Install debug APK | `adb install -r Mhub/android-native/app/build/outputs/apk/debug/app-debug.apk` |
| Install release APK | `adb install -r Mhub/android-native/app/build/outputs/apk/release/app-release.apk` |

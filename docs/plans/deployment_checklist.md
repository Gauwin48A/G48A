# MHub Complete Platform Production Deployment Checklist

To flip the switch to a real production environment, you just need to populate your `.env` file with the actual API keys. Once you have these keys, drop them into the `.env` file on the server, set `NODE_ENV=production`, and the system will automatically stop mocking and start processing real money, real KYC documents, real OTPs, and real push notifications!

Below is the exact master checklist of credentials to gather and plug into your production server and mobile app build:

---

## 1. 🔐 Security & Sessions

- [ ] **`JWT_SECRET`**: A strong, random string (e.g., a 64-character hex string) used to sign 15-minute Access Tokens.
- [ ] **`JWT_REFRESH_SECRET`** (or `REFRESH_SECRET`): A different strong, random string used to sign 30-day Refresh Tokens.
  ```env
  JWT_SECRET=c8a9f3b1e2d4c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c9b0
  JWT_REFRESH_SECRET=f0e1d2c3b4a5f6e7d8c9b0a1f2e3d4c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9
  ```
- [ ] **Anti-Replay & Device Binding Secrets**:
  ```env
  DEVICE_ATTESTATION_SECRET=random_device_attestation_secret
  API_INTEGRITY_SECRET=random_api_integrity_secret
  LOCATION_HMAC_SECRET=random_location_verification_hmac_secret
  ```

---

## 2. 📧 Amazon SES & Email Providers (For Login OTPs & Forgot Password)

To send out authentication emails, OTPs, and password resets:

- [ ] **Amazon SES (AWS Credentials)**:
  ```env
  EMAIL_PROVIDER=smtp
  AWS_REGION=ap-south-1
  AWS_ACCESS_KEY_ID=your_iam_user_access_key_id
  AWS_SECRET_ACCESS_KEY=your_iam_user_secret_access_key
  AWS_SES_FROM_EMAIL=noreply@yourdomain.com
  SMTP_HOST=email-smtp.ap-south-1.amazonaws.com
  SMTP_PORT=587
  SMTP_SECURE=false
  SMTP_USER=your_aws_ses_smtp_username
  SMTP_PASS=your_aws_ses_smtp_password
  ```
- [ ] **SendGrid Alternative** (Optional):
  ```env
  EMAIL_PROVIDER=sendgrid
  SENDGRID_API_KEY=SG.your_sendgrid_api_key
  SENDGRID_FROM=noreply@yourdomain.com
  ```

---

## 3. 💳 Razorpay (For Memberships & Payments)

For handling user subscription payments, seller payouts, and coin purchases:

- [ ] **`RAZORPAY_KEY_ID`**: Your Live Razorpay Key (`rzp_live_...`).
- [ ] **`RAZORPAY_KEY_SECRET`**: Your Live Razorpay Secret.
- [ ] **`RAZORPAY_WEBHOOK_SECRET`**: A secret set in the Razorpay dashboard to verify incoming webhook events (like `payment.captured`) are legitimately from Razorpay.
  ```env
  RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxxxxx
  RAZORPAY_KEY_SECRET=your_razorpay_live_secret
  RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret
  ```

---

## 4. 🆔 Surepass (For KYC - Aadhaar/PAN)

### Surepass API Integration
- [ ] **Surepass Corporate Credentials**: Required for live PAN verification and 2-step Aadhaar OTP verification.
  ```env
  KYC_MODE=production
  SUREPASS_API_URL=https://kyc-api.surepass.io/api/v1
  SUREPASS_BEARER_TOKEN=your_surepass_bearer_token
  KYC_HASH_SECRET=your_random_kyc_hmac_secret
  ```

> [!NOTE]
> **Data Security & Privacy Compliance**:
> - **Zero Clear-Text Storage**: For security and government compliance, the raw Aadhaar and PAN card numbers are **never stored** in clear text in PostgreSQL.
> - **SHA-256 Hashing**: Identifiers are immediately one-way hashed with standard SHA-256. Only the deterministic hashes (`pan_hash`, `aadhaar_hash`) are persisted. This ensures standard compatibility with security bans and moderation blacklists.
> - **Sybil/Duplicate Prevention**: The backend performs pre-verification database queries matching `pan_hash` and `aadhaar_hash`. If a user attempts to verify a duplicate account using a previously verified Aadhaar or PAN, the system blocks registration immediately.
> - **Aadhaar Caching**: The Aadhaar hash is temporarily cached in Redis (or in-memory) for 15 minutes mapped to the Surepass `txnId` to securely tie Aadhaar inputs to the subsequent OTP check.

---

## 5. 🔔 Firebase (For Push Notifications)

For sending real-time push notifications to the Android app and Web clients:

- [ ] **`FIREBASE_SERVICE_ACCOUNT_JSON` / `FIREBASE_SERVICE_ACCOUNT_PATH`**: Generate a private key JSON file from Firebase Console > Project Settings > Service Accounts. Allows the Node.js backend to push messages to user devices via FCM HTTP v1 API.
  ```env
  FIREBASE_SERVICE_ACCOUNT_PATH=./src/config/serviceAccountKey.json
  # Or inline credentials:
  FCM_PROJECT_ID=your_firebase_project_id
  FCM_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your_project.iam.gserviceaccount.com
  FCM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour_Key_Here\n-----END PRIVATE KEY-----\n"
  ```
- [ ] **Android App Config**: Place `google-services.json` inside `android-native/app/google-services.json`.
- [ ] **Web Push VAPID Keys**:
  ```env
  VAPID_PUBLIC_KEY=your_vapid_public_key
  VAPID_PRIVATE_KEY=your_vapid_private_key
  VAPID_EMAIL=mailto:admin@yourdomain.com
  ```

---

## 6. 🗄️ Infrastructure & Database

If not using Docker Compose default values:

- [ ] **`DATABASE_URL` / PostgreSQL Connection**: Your production PostgreSQL connection string.
  ```env
  DATABASE_URL=postgres://mhub_user:your_secure_db_password@your_db_host:5432/mhub_db
  DB_HOST=your_db_host
  DB_PORT=5432
  DB_NAME=mhub_db
  DB_USER=mhub_user
  DB_PASSWORD=your_secure_db_password
  ```
- [ ] **`REDIS_URL` / Redis Connection**: Your production Redis connection string for BullMQ notification queues & session caching.
  ```env
  REDIS_URL=redis://:your_redis_password@your_redis_host:6379
  REDIS_HOST=your_redis_host
  REDIS_PORT=6379
  REDIS_PASSWORD=your_secure_redis_password
  ```
- [ ] **Preflight Migration Command**: Run schema preflight check on deployment:
  ```bash
  npm run preflight:schema
  ```

---

## 7. 📦 Cloud Object Storage & Assets

- [ ] **Cloudflare R2 Object Storage (S3 API)**: Primary asset storage for user uploads:
  ```env
  R2_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
  R2_ACCESS_KEY_ID=your_r2_access_key_id
  R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
  R2_BUCKET_NAME=mhub-production-assets
  R2_PUBLIC_URL=https://cdn.yourdomain.com
  ```
- [ ] **Cloudinary Storage** (Alternative CDN):
  ```env
  CLOUDINARY_CLOUD_NAME=your_cloud_name
  CLOUDINARY_API_KEY=your_api_key
  CLOUDINARY_API_SECRET=your_api_secret
  ```

---

## 8. 📱 SMS Gateways (For Mobile Phone OTPs)

- [ ] **Twilio SMS**:
  ```env
  TWILIO_ACCOUNT_SID=your_twilio_account_sid
  TWILIO_AUTH_TOKEN=your_twilio_auth_token
  TWILIO_FROM=+1xxxxxxxxxx
  ```
- [ ] **MSG91 (India DLT Compliant SMS)**:
  ```env
  MSG91_AUTH_KEY=your_msg91_auth_key
  MSG91_FLOW_ID=your_dlt_registered_flow_id
  MSG91_SENDER_ID=MHUBAP
  ```

---

## 9. 📍 Location & Anti-Fraud Verification

- [ ] **Google Geolocation API Key**: `GOOGLE_GEOLOCATION_API_KEY=AIzaSy_...`
- [ ] **OpenCellID API Key**: `OPENCELLID_API_KEY=pk_...`
- [ ] **IP Geolocation API Key**: `IP_GEOLOCATION_API_KEY=...`

---

## 10. 📱 Android Native Release App Signing

- [ ] **Release Keystore Configuration**:
  - Create `android-native/keystore.properties`:
    ```properties
    storeFile=release.keystore
    storePassword=your_keystore_password
    keyAlias=mhub_key_alias
    keyPassword=your_key_password
    ```
- [ ] **Google Sign-In Client ID**:
  - In `android-native/local.properties`:
    ```properties
    GOOGLE_WEB_CLIENT_ID=your_google_web_client_id.apps.googleusercontent.com
    MHUB_API_BASE_URL=https://api.yourdomain.com/
    ```
- [ ] **Build Production APK & App Bundle**:
  ```bash
  cd android-native
  ./gradlew assembleRelease
  ./gradlew bundleRelease
  ```

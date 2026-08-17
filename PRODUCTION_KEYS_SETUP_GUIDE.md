# 🔑 Zaruda Production Credentials & Service Keys Setup Guide

This guide details how to configure production credentials for Google Sign-In, Firebase Push Notifications, Database, and Storage providers.

---

## 1. Google Sign-In Setup (Android)
- **File**: `android-native/local.properties` (or `gradle.properties`)
- **Key**: `GOOGLE_WEB_CLIENT_ID`
- **Value**: `your_client_id.apps.googleusercontent.com`
- **Behavior**: When configured, the **"Continue with Google"** button automatically appears on the Login screen. When absent, it stays gracefully hidden without showing error toasts.

---

## 2. Firebase Cloud Messaging (FCM Push Notifications)
- **Android App File**: `android-native/app/google-services.json`
- **Server File**: `server/src/config/firebase-service-account.json` (or `FIREBASE_SERVICE_ACCOUNT` in `.env`)
- **Behavior**: Enables real-time background and foreground push notifications for buyer inquiries, trade offers, and sales confirmations.

---

## 3. Cloud Image Storage (S3 / Cloudinary)
- **File**: `server/.env`
- **Keys**:
  - `AWS_ACCESS_KEY_ID=your_key`
  - `AWS_SECRET_ACCESS_KEY=your_secret`
  - `AWS_S3_BUCKET_NAME=your_bucket`
- **Behavior**: If unconfigured, the server automatically uses high-performance local disk storage with zero setup required.

---

## 4. Backend Environment Secrets
- **File**: `server/.env`
- **Keys**:
  - `PORT=5000`
  - `DATABASE_URL=postgresql://host:5432/zarudadb` (add user/password via the `DB_USER` / `DB_PASSWORD` env vars)
  - `JWT_SECRET=your_super_secret_jwt_key`
  - `NODE_ENV=production`

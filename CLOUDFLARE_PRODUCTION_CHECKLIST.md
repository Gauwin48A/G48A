# 🛡️ Cloudflare Production Infrastructure Checklist

**Domain**: `wyntechlabs.com`  
**Primary CDN**: `https://cdn.wyntechlabs.com`  
**Storage Provider**: Cloudflare R2 (S3-Compatible Object Storage)  
**Status**: `100% PRODUCTION READY & VERIFIED`  
**Verified On**: September 3, 2026  

---

## 📋 Comprehensive Feature Checklist

### 1. Object Storage (Cloudflare R2)
- [x] **R2 Subscription Activated**: Free tier (10 GB storage, 1M Class A ops, 10M Class B ops, **$0 egress fees**).
- [x] **Public Media Bucket Created**: `media-bucket` (Used for user avatars, marketplace listing photos, public media).
- [x] **Private KYC Vault Created**: `kyc-docs-bucket` (Used for sensitive Aadhaar, PAN, and identity proofs).
- [x] **KYC Privacy Enforced**: Public URL access explicitly **DISABLED** on `kyc-docs-bucket` to prevent data leaks.
- [x] **S3 API Credentials Generated**:
  - Token Name: `server-upload-token` / `mhub-uploader-token`
  - Permissions: `Admin Read & Write` / `Object Read & Write`
  - Scope: All buckets in account
  - TTL: `Forever`
- [x] **Live S3 Put/Delete Verification**: Verified live upload & deletion via `@aws-sdk/client-s3`.

---

### 2. Global Edge CDN & Custom Domain
- [x] **Custom CDN Domain Connected**: `cdn.wyntechlabs.com` bound directly to `media-bucket`.
- [x] **Cloudflare Anycast CDN Routing**: Assets distributed across 300+ edge data centers worldwide.
- [x] **Zero Bandwidth / Egress Cost**: All asset downloads from `cdn.wyntechlabs.com` incur $0 bandwidth cost.
- [x] **Live HTTPS 200 Verification**: Real test file requested and returned `HTTP 200 OK` via Singapore/APAC edge server.
- [x] **CORS Policy Configured**: Standard wildcard `GET`/`HEAD` CORS policy applied to `media-bucket` to prevent cross-origin image blocks in Android & Web.

```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

---

### 3. SSL / TLS & Encryption
- [x] **Universal SSL Certificate Issued**: Active for `*.wyntechlabs.com` and `wyntechlabs.com`.
- [x] **SSL/TLS Encryption Mode**: `Full (Automatic)` active.
- [x] **TLS 1.3 Enabled**: Modern zero-round-trip time cryptographic protocols active.
- [x] **Automatic HTTPS Rewrites**: Upgrades insecure HTTP requests to HTTPS seamlessly.

---

### 4. Bot Defense & Security (Cloudflare Turnstile & DDoS)
- [x] **Unmetered Layer 3/4/7 DDoS Protection**: Active by default across all Cloudflare proxied hostnames.
- [x] **Cloudflare Turnstile Widget Created**:
  - Name: `app-security-widget`
  - Mode: `Managed` (Smart invisible challenge)
  - Allowed Hostnames: `wyntechlabs.com`, `localhost` (for local development)
- [x] **Turnstile Keys Generated**:
  - Site Key: `0x4AAAAAAAE164es-UffNrOMk`
  - Secret Key: `0x4AAAAAAAE164Sl0dUpGAE1XsnHwgSDMwVM`
- [x] **Invisible CAPTCHA Protection**: Pre-configured to safeguard OTP, Login, Signup, and Listing creation without user friction.

---

### 5. Email Infrastructure
- [x] **Cloudflare Email Routing Enabled**: Active on `wyntechlabs.com`.
- [x] **DNS Records Locked**: MX and SPF records validated for custom inbound routing (`support@wyntechlabs.com` forwarding).

---

### 6. Codebase & Environment Integration
- [x] **Development Env (`server/.env`)**:
  - `R2_ENDPOINT=https://e7997a87f86fce031f929e791268983b.r2.cloudflarestorage.com`
  - `R2_ACCESS_KEY_ID=70c9dd02d05d4c44423028cee2d7280d`
  - `R2_SECRET_ACCESS_KEY=f17a14eb3cbdee6afc1092651cd6f50f104f9619714c91fa633d08aabe6fac3c`
  - `R2_BUCKET_NAME=media-bucket`
  - `R2_KYC_BUCKET_NAME=kyc-docs-bucket`
  - `R2_PUBLIC_URL=https://cdn.wyntechlabs.com`
  - `TURNSTILE_SITE_KEY=0x4AAAAAAAE164es-UffNrOMk`
  - `TURNSTILE_SECRET_KEY=0x4AAAAAAAE164Sl0dUpGAE1XsnHwgSDMwVM`
- [x] **Production Env (`server/.env.production`)**: Synced with identical production credentials.
- [x] **Storage Service (`server/src/services/r2Client.js`)**: Configured with AWS SDK v3 client + fallback mock logic.

---

## 🚀 Future Reference & Maintenance

- **Adding new buckets**: Can be created directly in Cloudflare R2 without recreating tokens (token scope is set to all buckets).
- **Rotating API Keys**: In Cloudflare Dashboard -> `R2 Object Storage` -> `Manage API Tokens` -> Create new token -> Update `.env` -> Delete old token.
- **Monitoring Usage**: Cloudflare Dashboard -> `R2 Object Storage` -> Metrics (shows Class A, Class B operations, and total storage).

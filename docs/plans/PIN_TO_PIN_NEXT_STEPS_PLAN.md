# 📍 ZARUDA MARKETPLACE — PIN-TO-PIN DETAILED NEXT STEPS & ARCHITECTURE PLAN

> **Target Capacity**: 50,000 Daily Active Users (DAU) | 2.5M Daily API Calls | 200,000 Total Users  
> **Execution Strategy**: Sequential Pin-by-Pin Implementation Checklist for Live Launch

---

## 🏗️ ARCHITECTURE MAP & DATA FLOW

```text
 ┌─────────────────────────────────────────────────────────────────────────┐
 │                            USER DEVICES (INDIA)                         │
 └────────────────────────────────────┬────────────────────────────────────┘
                                      │ HTTPS (Port 443) / WebSocket
                                      ▼
 ┌─────────────────────────────────────────────────────────────────────────┐
 │                   CLOUDFLARE EDGE NETWORK (MUMBAI/DELHI)                │
 │  • WAF DDoS Protection  • SSL/TLS Termination  • Free Edge CDN          │
 └────────────────────────────────────┬────────────────────────────────────┘
                                      │ Encrypted Cloudflare Tunnel (cloudflared)
                                      ▼
 ┌─────────────────────────────────────────────────────────────────────────┐
 │             DIGITALOCEAN BANGALORE (BLR1) — NODE.JS APP VPS             │
 │  Specs: 4 vCPU / 8 GB RAM / 160 GB NVMe SSD                             │
 │  Process Manager: PM2 Cluster Mode (4 Workers running Express API)      │
 │  Firewall: UFW (Only ports 22, 80, 443 allowed; rest blocked)           │
 └──────────────────┬──────────────────────────────────┬───────────────────┘
                    │                                  │
   Private VPC IP   │                                  │   Private VPC IP
   (10.x.x.x)       ▼                                  ▼   (10.x.x.x)
 ┌───────────────────────────┐                       ┌───────────────────────────┐
 │   Managed PostgreSQL 15   │                       │      Managed Redis 7      │
 │   2 vCPU / 4 GB RAM       │                       │    1 GB RAM               │
 │   • 26 SQL Migrations     │                       │    • Session Tokens       │
 │   • JOIN Indexes Applied  │                       │    • Rate Limit Counters  │
 │   • 5-min PITR Snapshots  │                       │    • BullMQ Payout Queue  │
 └─────────────┬─────────────┘                       └───────────────────────────┘
               │
               ▼
 ┌─────────────────────────────────────────────────────────────────────────┐
 │                  CLOUDFLARE R2 OBJECT STORAGE                           │
 │  • mhub-media (Listing photos, video drops, avatars)                    │
 │  • mhub-kyc-docs (Private encrypted Aadhaar/PAN scans)                  │
 │  • Encrypted Daily DB Backups (pg_dump, 90-day retention)               │
 └─────────────────────────────────────────────────────────────────────────┘
```

---

## 📌 PIN-TO-PIN ACTION CHECKLIST FOR LIVE DEPLOYMENT

---

### 📍 MILESTONE 1: CLOUD INFRASTRUCTURE PROVISIONING (DIGITALOCEAN)

- [ ] **Pin 1.1: Provision App VPS Droplet**
  * **Provider**: DigitalOcean Datacenter **Bangalore (`BLR1`)**.
  * **Image**: Ubuntu 22.04 LTS x64.
  * **Size**: 4 vCPU / 8 GB RAM / 160 GB NVMe SSD ($48/mo).
  * **SSH Key**: Add your SSH public key for secure passwordless login.

- [ ] **Pin 1.2: Provision Managed PostgreSQL 15 Database**
  * **Size**: 2 vCPU / 4 GB RAM ($30/mo).
  * **Database Name**: `mhub_db` | **User**: `mhub`.
  * **Backups**: Enable Automated Daily Backups with 5-minute Point-In-Time Recovery (PITR).

- [ ] **Pin 1.3: Provision Managed Redis 7 Instance**
  * **Size**: 1 GB RAM ($15/mo).
  * **Maxmemory Policy**: `allkeys-lru` (Evicts oldest keys when memory limit reached).

- [ ] **Pin 1.4: Enable Private VPC Network**
  * Ensure the App VPS, PostgreSQL, and Redis instances are assigned to the **same DigitalOcean VPC subnet (`10.x.x.x`)**.
  * Restrict database access strictly to the VPC private IP range.

---

### 📍 MILESTONE 2: CLOUDFLARE SECURITY, TUNNEL & R2 STORAGE

- [ ] **Pin 2.1: Configure Cloudflare DNS & Proxying**
  * Add `zarudatech.com` to Cloudflare account.
  * Create CNAME record `api.zarudatech.com` pointing to VPS public IP.
  * Toggle status to **Proxied (Orange Cloud)** for origin IP masking and DDoS protection.
  * SSL Mode: Set SSL/TLS to **Full (Strict)**.

- [ ] **Pin 2.2: Create Cloudflare R2 Buckets**
  * Bucket 1: `mhub-media` (Public Access Enabled for image/video URLs).
  * Bucket 2: `mhub-kyc-docs` (Strictly Private Access for encrypted KYC uploads).
  * Bucket 3: `mhub-backups` (Private Access for daily `pg_dump` database dumps).

- [ ] **Pin 2.3: Configure Cloudflare Zero-Trust Tunnel (`cloudflared`)**
  * On VPS, authenticate and create tunnel:
    ```bash
    cloudflared tunnel create zaruda-vps-tunnel
    cloudflared tunnel route dns zaruda-vps-tunnel api.zarudatech.com
    ```
  * Point tunnel ingress to `http://localhost:5001`.

---

### 📍 MILESTONE 3: VPS SERVER HARDENING & PM2 CLUSTER

- [ ] **Pin 3.1: Execute Automated Hardening Installer**
  * SSH into Ubuntu VPS and run:
    ```bash
    sudo bash server/scripts/ops/setup_vps_hardening.sh
    ```
  * Installs Node.js 20 LTS, PM2, UFW firewall rules, and creates `/var/www/zaruda-api`.

- [ ] **Pin 3.2: Verify Firewall Rules (UFW)**
  * Run `sudo ufw status verbose` and verify allowed ports:
    * `22/tcp` (SSH)
    * `80/tcp` (HTTP)
    * `443/tcp` (HTTPS)
    * Default: `Deny (incoming)`, `Allow (outgoing)`.

- [ ] **Pin 3.3: Configure PM2 Auto-Boot**
  * Ensure PM2 starts automatically on system reboot under non-root `zaruda` user.

---

### 📍 MILESTONE 4: PRODUCTION ENVIRONMENT CONFIGURATION (`.env`)

- [ ] **Pin 4.1: Populate `/var/www/zaruda-api/server/.env` File**
  ```env
  PORT=5001
  NODE_ENV=production
  TRUST_PROXY=true
  
  # Managed DB & Redis (Private VPC Addresses)
  DATABASE_URL=postgres://mhub:secret_pass@private-db-blr1.ondigitalocean.com:25060/mhub_db?sslmode=require
  REDIS_URL=rediss://default:secret_pass@private-redis-blr1.ondigitalocean.com:25061
  
  # JWT Secrets (64-char hex)
  JWT_SECRET=replace_with_openssl_rand_hex_32
  JWT_REFRESH_SECRET=replace_with_openssl_rand_hex_32
  
  # SurePass Sandbox KYC
  KYC_MODE=sandbox
  SUREPASS_API_KEY=your_sandbox_key
  SUREPASS_BASE_URL=https://sandbox.surepass.io/api/v1
  
  # Razorpay Test Mode
  RAZORPAY_KEY_ID=rzp_test_xxxx
  RAZORPAY_KEY_SECRET=your_test_secret
  RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
  
  # Cloudflare R2 Storage
  R2_ACCESS_KEY_ID=your_r2_key_id
  R2_SECRET_ACCESS_KEY=your_r2_secret
  R2_BUCKET_NAME=mhub-media
  R2_PUBLIC_HOST=https://pub-xxxx.r2.dev
  
  # Email SMTP
  SMTP_HOST=email-smtp.ap-south-1.amazonaws.com
  SMTP_PORT=587
  SMTP_USER=your_smtp_user
  SMTP_PASS=your_smtp_password
  EMAIL_FROM=noreply@zarudatech.com
  ```

---

### 📍 MILESTONE 5: DATABASE MIGRATION & SERVICE LAUNCH

- [ ] **Pin 5.1: Apply SQL Migrations & Indexes**
  * Apply 26+ SQL schema migrations and performance indexes:
    ```bash
    cd /var/www/zaruda-api/server
    node scripts/ops/run_migration.js
    ```

- [ ] **Pin 5.2: Launch PM2 Cluster**
  * Start Node.js Express server across all CPU cores:
    ```bash
    pm2 start ecosystem.config.js
    pm2 save
    ```

- [ ] **Pin 5.3: Execute 6-Point Automated Diagnostic Suite**
  * Run diagnostic tool:
    ```bash
    node scripts/validate_prod_setup.js
    ```
  * Verify **100% SUCCESS** status across PostgreSQL, Redis, SurePass, Razorpay, R2, and SMTP.

---

### 📍 MILESTONE 6: ANDROID APP CONNECTION & E2E TESTING

- [ ] **Pin 6.1: Update Android App BuildConfig URL**
  * In `android-native/app/build.gradle.kts`:
    ```kotlin
    buildConfigField("String", "DEFAULT_API_BASE_URL", "\"https://api.zarudatech.com/\"")
    ```

- [ ] **Pin 6.2: Extract Release Keystore SHA-1 Fingerprint**
  ```powershell
  keytool -list -v -keystore keystore\release.keystore -alias mhub-release
  ```

- [ ] **Pin 6.3: Register SHA-1 in Google Cloud Console**
  * Add Android package `com.zaruda.app` and SHA-1 fingerprint under Google OAuth 2.0 Client Credentials.

- [ ] **Pin 6.4: Build Signed Release APK**
  ```powershell
  cd android-native
  .\gradlew.bat :app:assembleRelease
  ```

- [ ] **Pin 6.5: End-to-End User Journey Pass**
  1. Open signed APK on Android device connected to `https://api.zarudatech.com`.
  2. Perform Google One-Tap Login.
  3. Submit Aadhaar OTP & PAN validation through SurePass sandbox.
  4. Initiate test purchase using Razorpay overlay.
  5. Send real-time Socket.IO chat message to verify WebSocket heartbeat (25s ping).

---

## 📊 SUMMARY TIMELINE & BUDGET

| Phase | Milestone Description | Target Timeline | Cost (USD) | Cost (INR) |
| :--- | :--- | :---: | :---: | :---: |
| **M1** | Provision VPS + Managed DB + Managed Redis | Day 3 | $93.00 | ₹7,766 |
| **M2** | Cloudflare DNS, Tunnels & R2 Buckets | Day 3 | $10.00 | ₹835 |
| **M3–M4**| VPS Hardening & Production `.env` Config | Day 4 | $0.00 | ₹0 |
| **M5** | Apply DB Migrations & PM2 Service Launch | Day 4 | $0.00 | ₹0 |
| **M6** | Android APK Wire & E2E Sandbox Verification | Day 5 | $0.00 | ₹0 |
| **TOTAL**| **Full 50,000 DAU Production Rollout** | **Days 3–5** | **~$103.00/mo** | **~₹8,601/mo** |

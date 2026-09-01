# 🚀 Zaruda Roadmap: Level 2 — Infrastructure & Backend Hardening Plan

> **Document Status**: Approved Architecture & Implementation Blueprint  
> **Target Timeline**: Days 3–5 (Parallel execution during 14-day testing period)  
> **Scope**: Node.js API Server, PM2 Cluster, Managed PostgreSQL, Redis Cache, Cloudflare Tunnels, SurePass & Razorpay Sandboxes.

---

## 🎯 Executive Objective
Deploy the Zaruda Node.js API server to a hardened Linux production VPS, configure managed cloud database (PostgreSQL) and session cache (Redis) tiers, enforce zero-trust edge security via Cloudflare Tunnels, and execute end-to-end sandbox validations for Aadhaar/PAN KYC (SurePass) and Razorpay Route transactions.

---

## 🏗️ Architecture Blueprint

```
                          ┌────────────────────────┐
                          │  Mobile App (Android)  │
                          └───────────┬────────────┘
                                      │ HTTPS
                                      ▼
                        ┌───────────────────────────┐
                        │   Cloudflare Edge Network │
                        │  (Proxy + WAF + R2 Media) │
                        └─────────────┬─────────────┘
                                      │ Encrypted Tunnel (cloudflared)
                                      ▼
┌───────────────────────────────────────────────────────────────────────────┐
│ Production Linux VPS (UFW Firewall: Inbound Locked)                       │
│                                                                           │
│   ┌───────────────────────────────────────────────────────────────────┐   │
│   │ PM2 Cluster Process Manager                                       │   │
│   │   ├── Worker Core 1 (Node.js API)                                 │   │
│   │   ├── Worker Core 2 (Node.js API)                                 │   │
│   │   └── Worker Core N (Node.js API)                                 │   │
│   └─────────────────┬─────────────────────────────────┬───────────────┘   │
└─────────────────────┼─────────────────────────────────┼───────────────────┘
                      │ DB Pool Connection              │ Redis TCP Connection
                      ▼                                 ▼
         ┌─────────────────────────┐       ┌──────────────────────────┐
         │ Managed PostgreSQL DB   │       │ Managed Redis Instance   │
         │ (AWS RDS / Aiven + PITR)│       │ (Sessions + Rate-Limits) │
         └─────────────────────────┘       └──────────────────────────┘
```

---

## 💻 Step-by-Step Implementation Guide

### Step 1: Production VPS Server Setup
1. **Node.js & PM2 Setup**:
   * Provision Ubuntu 22.04 / 24.04 LTS VPS (minimum 2 vCPU / 4GB RAM).
   * Install Node.js (v20+ LTS) and PM2 process manager globally (`npm install -g pm2`).
   * Deploy API codebase to `/var/www/zaruda-api` and run in cluster mode using all CPU cores (`pm2 start ecosystem.config.js`).
2. **SSL & Port Hardening**:
   * Restrict server network access using UFW firewall (`ufw default deny incoming`, `ufw allow 22`, `ufw allow 80`, `ufw allow 443`).
   * Terminate SSL via Let’s Encrypt / Cloudflare Origin Certificates.

---

### 🗄️ Step 2: Managed Database & Redis Cache
1. **Managed PostgreSQL Database**:
   * Provision AWS RDS or Aiven PostgreSQL instance for high availability.
   * Enable 5-minute RPO Point-in-Time Recovery (PITR) with daily automated backups.
   * Execute 26+ SQL schema migrations and JOIN performance indexes from `server/database/migrations/`.
2. **Redis Session Cache**:
   * Provision Redis instance for user session tokens, rate limiting, and BullMQ worker queues (`server/src/config/redisSession.js`).
   * Guarantees rate-limit states persist across PM2 process reloads and worker crashes.

---

### 🛡️ Step 3: Cloudflare Edge Network Security
1. **Cloudflare DNS Routing**:
   * Configure CNAME record `api.zarudatech.com` pointing to the VPS hostname/IP.
   * Set status to **Proxied (Orange Cloud)** to mask origin IP address.
2. **Cloudflare Tunnel (`cloudflared`)**:
   * Install `cloudflared` daemon on VPS.
   * Establish encrypted tunnel routing traffic from Cloudflare Edge directly to `http://localhost:5001`.
   * Close public HTTP/HTTPS ports on VPS firewall so only Cloudflare Tunnel traffic is accepted.
3. **Cloudflare R2 Bucket (Media Storage)**:
   * Provision Cloudflare R2 bucket `mhub-media` for post photos, videos, and user avatars (zero egress fees).
   * Provision private bucket `mhub-kyc-docs` for secure encrypted storage of user verification documents.

---

### 💳 Step 4: Sandbox Integrations (SurePass & Razorpay)
1. **SurePass KYC Sandbox Setup**:
   * Set `KYC_MODE=sandbox` in VPS `.env`.
   * Add SurePass API keys (`SUREPASS_API_KEY`, `SUREPASS_BASE_URL`).
   * Verify Aadhaar OTP and PAN validation API handshakes (`server/src/services/kycService.js`).
2. **Razorpay Route Sandbox Setup**:
   * Add Razorpay Test Mode keys (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`) and webhook secret.
   * Configure webhook listener `/api/v1/webhooks/razorpay`.
3. **End-to-End Test Verification**:
   * Run automated health check suite:
     ```bash
     node server/scripts/validate_prod_setup.js
     ```
   * Perform end-to-end checkout test on Android client using Razorpay sandbox credentials.

---

## ⚙️ Key Operational Commands & Scripts

| Purpose | Command / Script |
| :--- | :--- |
| **Start PM2 Cluster** | `pm2 start server/ecosystem.config.js` |
| **PM2 Process Health** | `pm2 status` / `pm2 logs` |
| **VPS Hardening Automation** | `bash server/scripts/ops/setup_vps_hardening.sh` |
| **Database Migrations** | `node server/scripts/ops/run_migration.js` |
| **Prod Infrastructure Validation** | `node server/scripts/validate_prod_setup.js` |

---

## 🛠️ Verification & Acceptance Criteria
- [ ] `node server/scripts/validate_prod_setup.js` returns **100% SUCCESS** status for DB, Redis, SurePass, Razorpay, R2, and SMTP.
- [ ] `curl -I https://api.zarudatech.com/health` returns `HTTP 200 OK` routed through Cloudflare edge.
- [ ] Direct IP requests to VPS return `Connection Refused` (Origin Shield active).
- [ ] PM2 cluster handles simulated process crash without dropping active requests.

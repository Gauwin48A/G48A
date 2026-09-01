# 📄 ZARUDA MARKETPLACE — PHASE 4 PRODUCTION MASTER PLAN & INFRASTRUCTURE BLUEPRINT

> **Target Capacity**: 50,000 Daily Active Users (DAU) | 2.5 Million Daily API Calls | 200,000 Total Users  
> **Infrastructure Model**: 3-Tier Separated Architecture (App Node + Managed DB + Managed Redis + Cloudflare Edge)  
> **Target Region**: DigitalOcean Bangalore (`BLR1`) + Cloudflare Mumbai/Delhi Edge (5ms – 25ms India Latency)  
> **Monthly Budget**: ~$103.00 / month (~₹8,601 / month)

---

## 📊 1. TARGET WORKLOAD & CAPACITY METRICS

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PHASE 4 TARGET WORKLOAD SPECIFICATIONS                   │
├────────────────────────────────┬────────────────────────────────────────────┤
│ Total Registered Users         │ 200,000 (2 Lakhs)                          │
│ Daily Active Users (DAU)       │ 50,000 Users / Day                         │
│ Daily API Request Volume       │ 1.5 Million to 2.5 Million+ Calls / Day    │
│ Peak Concurrent Users (CCU)    │ 2,000 to 5,000 Users (Simultaneous Peak)   │
│ Expected Monthly Egress Data   │ 1.5 TB to 3.5 TB (Zero egress cost via R2) │
│ Network Latency in India       │ 5ms – 25ms (Bangalore BLR1 Data Center)    │
└────────────────────────────────┴────────────────────────────────────────────┘
```

---

## 🏗️ 2. SEPARATED 3-TIER SYSTEM ARCHITECTURE

At **50,000 Daily Active Users**, Zaruda enforces a **3-Tier Separated Architecture** to prevent traffic bursts, real-time chat connections, or complex SQL queries from starving application CPU resources.

```text
                                [ 50,000 DAILY USERS IN INDIA ]
                                              │
                                              ▼
                                 ┌───────────────────────────┐
                                 │    Cloudflare Edge WAF    │
                                 │   SSL & Free Edge CDN     │
                                 └─────────────┬─────────────┘
                                               │
                                               ▼ Encrypted Cloudflare Tunnel (cloudflared)
                                 ┌───────────────────────────┐
                                 │    Node.js App Server     │
                                 │   DigitalOcean Bangalore  │
                                 │   4 vCPU / 8 GB RAM       │
                                 │   PM2 Cluster (4 Workers) │
                                 └───────┬───────────┬───────┘
                                         │           │
                    (Private VPC IP)     │           │     (Private VPC IP)
                     ┌───────────────────┘           └───────────────────┐
                     ▼                                                   ▼
       ┌───────────────────────────┐                       ┌───────────────────────────┐
       │   Managed PostgreSQL 15   │                       │      Managed Redis 7      │
       │   2 vCPU / 4 GB RAM       │                       │    1 GB RAM (Feed Cache)  │
       └─────────────┬─────────────┘                       └───────────────────────────┘
                     │
                     ▼
           Offsite DB Backup → Cloudflare R2 (90-Day Retention)
```

### Detailed Component Roles:

1. **Node.js Application Server (DigitalOcean Bangalore `BLR1`)**:
   - **Specs**: 4 vCPU / 8 GB RAM / 160 GB NVMe SSD.
   - **Engine**: PM2 cluster mode running 4 worker processes (`ecosystem.config.js`).
   - **Responsibility**: Express REST API endpoints, JWT authentication, business logic, rate limiting, and real-time Socket.IO WebSocket chat handler.

2. **Managed Database Tier (PostgreSQL 15)**:
   - **Specs**: DigitalOcean Managed PostgreSQL (2 vCPU / 4 GB RAM).
   - **Responsibility**: Transactional data (users, posts, offers, complaints, dispute escrows, KYC audit logs) over a private VPC network. 26+ SQL migrations & JOIN performance indexes pre-applied.

3. **Managed Cache Tier (Redis 7)**:
   - **Specs**: DigitalOcean Managed Redis (1 GB RAM).
   - **Responsibility**: Session token storage, rate-limit counters, feed stampede protection, and BullMQ payout queues (`payoutQueue.js`). Ensures rate-limit limits persist across PM2 restarts.

4. **Edge CDN & Security Firewall (Cloudflare Free Tier)**:
   - **Responsibility**: Edge SSL/TLS termination, WAF DDoS mitigation, HTTP/3 acceleration, static web asset caching at Mumbai and Delhi edge nodes.

5. **Object Storage & Offsite Recovery (Cloudflare R2)**:
   - **Responsibility**: Storage for user listing images, video drops, Aadhaar/PAN KYC documents (`mhub-kyc-docs`), and encrypted daily `pg_dump` database snapshots with 90-day retention.

---

## 🛠️ 3. LEVEL 2 INFRASTRUCTURE & BACKEND HARDENING BLUEPRINT

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                       LEVEL 2 HARDENING TIMELINE (DAYS 3–5)                 │
├───────────────────┬─────────────────────────────────────────────────────────┤
│ Step 1: VPS Setup │ Node 20 LTS, PM2 Cluster (4 workers), UFW Port Locks    │
│ Step 2: Managed DB│ PostgreSQL 15 + Redis 7 Session Store + Connection Pool │
│ Step 3: Cloudflare│ Proxied CNAME, cloudflared Zero-Trust Tunnel, R2 Buckets│
│ Step 4: Sandboxes │ SurePass (Aadhaar/PAN) & Razorpay Route Test Mode       │
└───────────────────┴─────────────────────────────────────────────────────────┘
```

### Step 1: Production VPS & PM2 Cluster Hardening
- **Process Clustering**: `ecosystem.config.js` configured with `instances: "max"`, `exec_mode: "cluster"`, 500MB memory restart caps, and automatic restart on crash.
- **Port Security (UFW)**: Inbound connections denied by default (`ufw default deny incoming`). Only ports `22` (SSH), `80` (HTTP), and `443` (HTTPS) exposed.

### Step 2: Managed Database & Redis Session Cache
- **PostgreSQL Pool**: Fixed max connection limit (`max: 25` in `dbPool.js`) connecting via private VPC IP (`10.x.x.x`) to avoid connection exhaustion.
- **Redis Resilience**: Session tokens (`redisSession.js`) and cache stampede protection (`cacheService.js`) stored in Redis so API reloads do not log out users or reset rate limits.

### Step 3: Cloudflare Edge Network & Zero-Trust Tunnel
- **Cloudflare Tunnel (`cloudflared`)**: Creates an encrypted tunnel between the VPS and Cloudflare Edge. VPS firewall inbound ports 80/443 can be completely closed, eliminating direct IP attack vectors.
- **R2 Media Buckets**: Provision `mhub-media` (public read for listing images/videos) and `mhub-kyc-docs` (strictly private read for sensitive user verification documents).

### Step 4: Sandbox Integrations (SurePass & Razorpay)
- **SurePass KYC**: Configured in `kycService.js` supporting real API payload validation or mock fallback via `KYC_MODE=sandbox` in `.env`.
- **Razorpay Payments**: Complete order creation (`createRazorpayOrder`), signature verification (`verifyRazorpayPayment`), webhook handling (`webhooksController.js`), seller account linking (`profileController.js`), and escrow dispute holds (`disputesController.js`).

---

## 💰 4. MONTHLY PRODUCTION BUDGET (PHASE 4 TARGET)

| Component / Service | Service Provider & Specification | Monthly Cost (USD) | Monthly Cost (INR @ ₹83.5) |
| :--- | :--- | :---: | :---: |
| **Node.js App Server** | DigitalOcean Bangalore (`BLR1`) — 4 vCPU / 8 GB RAM | **$48.00** | **₹4,008** |
| **Managed PostgreSQL 15** | DigitalOcean Managed Database (2 vCPU / 4 GB RAM) | **$30.00** | **₹2,505** |
| **Managed Redis 7** | DigitalOcean Managed Redis (1 GB RAM) | **$15.00** | **₹1,253** |
| **CDN, Security & WAF** | Cloudflare Free Tier (Mumbai/Delhi Edge) | **$0.00** | **₹0** |
| **Media & DB Backup Storage**| Cloudflare R2 (Photos, Videos, KYC docs, DB dumps) | **~$10.00** | **₹835** |
| **TOTAL MONTHLY BUDGET** | **Full 50,000 DAU Production Capacity** | **~$103.00 / mo** | **~₹8,601 / mo** |

---

## 🛡️ 5. PRODUCTION CONFIGURATION SAFEGUARDS & DISASTER RECOVERY

1. **Socket.IO Heartbeat (Preventing Disconnects)**:
   Express WebSocket server configures `pingInterval: 25000` (25 seconds) and `pingTimeout: 60000` to prevent Cloudflare's 100-second idle connection drops on active user chats.

2. **Real User IP Parsing behind Cloudflare**:
   Express relies on `app.set('trust proxy', true)` and inspects `req.headers['cf-connecting-ip']` to accurately enforce rate limits per user device IP.

3. **Cloudflare SSL Full (Strict) Mode**:
   Cloudflare SSL set to **Full (Strict)** with origin SSL certificates installed on the VPS to prevent infinite 301 HTTP-to-HTTPS loop errors.

4. **PostgreSQL Private Connection Pooling**:
   Connections use a strict pool size (`max: 25`, `idleTimeoutMillis: 30000`) over private VPC addresses to guarantee database stability under peak 5,000 CCU bursts.

5. **Two-Layer Disaster Recovery (RPO 5 min / RTO 30 min)**:
   - **Layer 1**: DigitalOcean Managed Database Automated Daily Snapshots + 5-minute Point-In-Time Recovery (PITR).
   - **Layer 2**: Daily `pg_dump` backup job, encrypted via AES-256, and pushed to offsite **Cloudflare R2** with a 90-day retention policy.

---

## 📁 6. CODEBASE COMPONENT MAPPING

All infrastructure logic is already implemented in the codebase:

```text
c:\Users\laksh\GITHUB\1hub_rep2\G48A\
├── server/
│   ├── ecosystem.config.js               # PM2 Cluster Mode (4 worker processes)
│   ├── .env.example                      # Production environment template
│   ├── scripts/
│   │   ├── validate_prod_setup.js        # 6-Point Automated Production Diagnostic Suite
│   │   └── ops/
│   │       ├── setup_vps_hardening.sh    # Ubuntu VPS automated setup & UFW firewall
│   │       ├── deploy_prod.sh            # Hot-reload production deployment script
│   │       └── DEPLOYMENT_GUIDE.sh       # Database & security commit checklist
│   └── src/
│       ├── config/
│       │   ├── dbPool.js                 # PostgreSQL VPC Connection Pool (max 25)
│       │   ├── redisCache.js             # Redis caching layer & stampede protection
│       │   └── redisSession.js           # Redis session token manager
│       ├── services/
│       │   ├── kycService.js             # SurePass KYC (PAN/Aadhaar) integration
│       │   └── paymentGateway.js         # Razorpay Route payment & webhook verification
│       └── jobs/
│           └── payoutQueue.js            # BullMQ Redis worker for payouts & transfers
├── docs/plans/
│   ├── DEPLOYMENT.md                     # Cloudflare Worker & D1 deployment guide
│   └── LEVEL_2_INFRASTRUCTURE_HARDENING_PLAN.md # Level 2 Hardening Reference Plan
```

---

## 📈 7. OPERATIONAL MONITORING & SCALING TRIGGERS

| Metric Indicator | Alert / Threshold | Automatic Action / Remedy |
| :--- | :--- | :--- |
| **App Server CPU** | Exceeds 75% for 15+ mins | Upgrade Droplet to 8 vCPU / 16 GB RAM or add 2nd App Node |
| **App Server RAM** | Exceeds 85% utilization | Trigger PM2 worker reload (`pm2 reload zaruda-backend`) |
| **Database Latency** | Query wait time > 50ms | Verify indexes via `database/APPLY_INDEXES.sql` or scale DB node |
| **Network Ping (India)**| Exceeds 35ms on Jio/Airtel | Verify Cloudflare Mumbai/Delhi routing & Cloudflare Tunnel status |

---

## 🚀 8. EXECUTION RUNBOOK (5-STEP DEPLOYMENT)

Execute these steps on your production Linux VPS to launch Phase 4 infrastructure:

```bash
# Step 1: Run Automated VPS Hardening Installer
sudo bash server/scripts/ops/setup_vps_hardening.sh

# Step 2: Configure Environment Variables
cp server/.env.example server/.env
# Update DATABASE_URL, REDIS_URL, SUREPASS_API_KEY, RAZORPAY_KEY_ID, R2_ACCESS_KEY_ID

# Step 3: Run Database Migrations
node server/scripts/ops/run_migration.js

# Step 4: Start PM2 Process Cluster
cd server && pm2 start ecosystem.config.js

# Step 5: Execute 6-Point Production Diagnostic Suite
node scripts/validate_prod_setup.js
```

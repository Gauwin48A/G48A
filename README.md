# 🛒 MHub - The Fortified Marketplace

A high-performance, secure, and tiered marketplace platform built for scale.

---

# 📋 PROJECT REQUIREMENT DOCUMENT (PRD) v2.0
> **Status:** Production Ready  
> **Classification:** Pin-to-Pin Detail  
> **Last Updated:** 2024

## 1. Executive Summary
**Project Name:** MHub (Marketplace Hub)  
**Vision:** Establish a "Fortress Marketplace" where trust is the currency. Eliminate the 40% fraud rate prevalent in C2C platforms via proactive protocols, while maximizing revenue for honest sellers through a tiered value system.  
**Tech Stack:** React 18, Node.js v20, PostgreSQL 16 (Pure SQL), Socket.io.

---

## 2. Detailed Functional Modules

### Module A: Identity & Access Management (IAM)
**Goal:** Prevent authorized access by bots, scammers, and banned entities.

| Feature ID | Feature Name | Description | Tchnical Implementation |
|:---:|:---:|:---|:---|
| **IAM-01** | **Proxy/VPN Detection** | Block connection if using VPN/Tor. | Middleware `fraudCheck.js` uses `proxycheck.io` or internal IP lists. Checks `X-Forwarded-For`. |
| **IAM-02** | **Session Handling** | Stateless JWT with Rotation. | Access Token (15min, Memory), Refresh Token (7d, HttpOnly Cookie). |
| **IAM-03** | **Trust Score** | Dynamic user reputation. | Calculated via SQL Func: `BASE(50) + PROFILE_COMPLETE(20) + AGE(10) + RATING(20) - REPORTS(50)`. |
| **IAM-04** | **RBAC** | Role Based Access Control. | Roles: `User`, `Seller` (Verified), `Admin`, `SuperAdmin`. |

### Module B: The Feed Engine ("Cube Approximation")
**Goal:** Deliver relevant listings in <200ms without heavy geospatial dependencies.

| Feature ID | Feature Name | Description | Technical Implementation |
|:---:|:---:|:---|:---|
| **FED-01** | **Geo-Fencing** | Show items within X km. | Pure SQL Haversine Formula. `WHERE acos(...) * 6371 < radius`. |
| **FED-02** | **Stratified Algorithm** | Mix tiers in specific ratios. | `UNION ALL` query: top 70% Premium, 20% Silver, 10% Basic. O(1) Fetch. |
| **FED-03** | **Full-Text Search** | Fuzzy search for typos. | PostgreSQL `to_tsvector` on `title` + `description`. GIN Indexing. |
| **FED-04** | **Infinite Scroll** | Load 20 items at a time. | Cursor-based pagination (`WHERE id < last_id`) for performance. |

### Module C: Posting & Inventory
**Goal:** Frictionless listing experience with built-in quality control.

| Feature ID | Feature Name | Description | Technical Implementation |
|:---:|:---:|:---|:---|
| **INV-01** | **Compression** | Uploads < 200KB. | `browser-image-compression` (Max 1920x1080, 0.7 quality) BEFORE upload. |
| **INV-02** | **Tier Quotas** | Enforce daily limits. | Check `posts` table count WHERE `created_at > TODAY` before allowing INSERT. |
| **INV-03** | **Lifecycle** | State Machine. | Statuses: `active` → `sold` (soft lock) → `deleted` (soft delete) → `expired`. |

### Module D: Monetization ("The Vault")
**Goal:** Secure, audit-trail verified payments without gateway fees.

| Feature ID | Feature Name | Description | Technical Implementation |
|:---:|:---:|:---|:---|
| **MON-01** | **Manual UPI** | User pays via QR, submits TxID. | Table `payments` stores `tx_id`, `screenshot_url`. Status: `pending`. |
| **MON-02** | **Admin Verify** | Manual approval workflow. | Admin View: compare Amt/TxID → Click Approve → Trigger `user_subscriptions` UPDATE. |
| **MON-03** | **Subscription** | Tier validity tracking. | Cron Job (Daily Midnight) checks `expiry_date` & downgrades to Basic. |

---

## 3. Database Schema Specification (PostgreSQL)

### 3.1. Users & Profiles
```sql
TABLE users (
  user_id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR NOT NULL,
  tier VARCHAR(20) DEFAULT 'basic', -- basic, silver, premium
  trust_score INT DEFAULT 50,
  post_credits INT DEFAULT 1, -- For basic users
  created_at TIMESTAMP DEFAULT NOW()
);

TABLE profiles (
  user_id INT FK,
  full_name VARCHAR(100),
  bio TEXT,
  avatar_url VARCHAR,
  location VARCHAR,
  verified_seller BOOLEAN DEFAULT FALSE
);
```

### 3.2. Inventory (Posts)
```sql
TABLE posts (
  post_id BIGSERIAL PRIMARY KEY,
  user_id INT FK,
  category_id INT FK,
  title VARCHAR(150),
  description TEXT, -- Indexed for Search
  price DECIMAL(10,2),
  images JSONB, -- ["url1", "url2"]
  latitude DECIMAL(10,8), -- Pure SQL Geo
  longitude DECIMAL(11,8),
  tier_priority INT DEFAULT 1, -- 1=Basic, 2=Silver, 3=Premium
  status VARCHAR(20), -- active, sold, deleted
  sold_at TIMESTAMP,
  search_vector TSVECTOR -- GIN Index
);
```

### 3.3. Commerce (Subscriptions & Payments)
```sql
TABLE user_subscriptions (
  sub_id SERIAL PRIMARY KEY,
  user_id INT FK,
  plan_type VARCHAR(20), -- silver, premium
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  status VARCHAR(20) -- active, expired
);

TABLE payments (
  payment_id SERIAL PRIMARY KEY,
  user_id INT FK,
  amount DECIMAL(10,2),
  upi_ref_id VARCHAR(50) UNIQUE, -- The TxID
  status VARCHAR(20), -- pending, verified, rejected
  admin_note TEXT,
  created_at TIMESTAMP
);
```

---

## 4. API Specification (REST)

### Auth
- `POST /api/auth/register` - { email, password, name }
- `POST /api/auth/login` - { email, password } -> Set-Cookie: refresh_token
- `POST /api/auth/refresh` - Rotate tokens

### Feed
- `GET /api/feed` - ?page=1&limit=20
- `GET /api/feed/nearby` - ?lat=17.38&lng=78.48&radius=10
- `GET /api/feed/search` - ?q=iphone
- `GET /api/posts?sortBy=shuffle` - Randomized discovery feed (Node.js Memory Shuffle)

### Posts
- `POST /api/posts` - { title, price, images[], lat, lng, category } (Protect: Auth)
- `PUT /api/posts/:id/sold` - Mark as sold (Protect: Owner)
- `DELETE /api/posts/:id` - Soft delete (Protect: Owner)

### Payments
- `POST /api/payments/submit` - { plan, tx_id }
- `GET /api/payments/pending` - (Protect: Admin)
- `POST /api/payments/:id/verify` - (Protect: Admin)

### User
- `GET /api/users/profile`
- `PUT /api/users/profile` - { bio, location, avatar }

---

## 5. Security & Deployment

### 5.1. Environment Variables
```env
# Server
PORT=5000
NODE_ENV=production

# DB
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=secret

# Keys
JWT_SECRET=complex_string_32_chars
ADMIN_KEY=setup_admin_secret
```

### 5.2. Folder Structure
```
server/
├── config/         # DB Connection
├── controllers/    # Business Logic (paymentController, etc.)
├── database/       # SQL Migrations (production_hardening.sql)
├── middleware/     # Auth, FraudCheck
├── routes/         # Express Routes
├── src/            # Utils
└── index.js        # Entry Point
```

---

## 6. User Experience Flows (Human-Centric)

### Flow 1: "The Trust-First Purchase"
1. **Discovery:** User lands on Feed. Sees "Premium" badge on a MacBook Pro listing.
2. **Verification:** Clicks item. Sees "Trust Score: 85/100" and "Verified Seller".
3. **Geo-Check:** Map shows item is 4.2km away (verified by GPS).
4. **Action:** Clicks "Chat".

### Flow 2: "The Upward Mobility Seller"
1. **Limit Hit:** Seller tries to post 2nd item today.
2. **Block:** System shows "Basic Plan Limit Reached".
3. **Upsell:** "Upgrade to Silver for ₹499/mo? Get 5 posts/day + 2x Visibility."
4. **Payment:** Scans QR code → Pays → Enters TxID.
5. **Approval:** Admin approves in <1hr. Seller gets notification.

---

## 7. Future Roadmap
- [ ] **AI Price Prediction:** Suggest price based on history.
- [ ] **Video Listings:** 30s video uploads.
- [ ] **Escrow Service:** Hold money until delivery.

---

## 8. Development Logs: The Great UUID Resolution
**Issue:** Persistent `operator does not exist: uuid = integer` crashes and `tier_priority` missing column errors.

### The Root Cause
The database was in a "hybrid" state where some tables/columns (like `users.user_id`) were migrated to UUIDs, while others (like `profiles.user_id` or `posts.category_id`) remained as Integers. Additionally, an older version of the schema script (`MHUB_ULTIMATE.sql`) was missing critical fairness columns.

### The Permanent Solution
1. **Schema Remediation:** Ran [`schema_remediation.sql`](file:///c:/Users/laksh/GITHUB/AG/Mhub/server/database/migrations/schema_remediation.sql) to add missing columns (`tier_priority`, `sold_at`, `expires_at`) and unify table structures.
2. **Global Type-Safety (SQL String Casting):** Modified all SQL queries in the backend to use `::text` casting for ID comparisons (e.g., `WHERE p.user_id::text = u.user_id::text`).
   - This makes the code **"type-blind"**, allowing it to compare IDs regardless of whether they are UUIDs or legacy Integers.
   - **Status:** Resolved & Verified on Port 8082.

---

## 10. Randomized Feed System: Discovery UX & Stability
**Issue:** 500 "integer out of range" errors when using `Date.now()` timestamps in SQL queries and stagnant feed content.

### Technical Implementation
1. **BigInt Overflow Protection:**
   - All timestamp-based parameters (e.g., `_t`, `refreshSeed`) are now cast as `::bigint` in SQL queries (`guaranteedReachQuery.js`, `feedQuery.js`).
   - This prevents crashes when passing 13-digit JavaScript timestamps to PostgreSQL's 32-bit `integer` type.
2. **Zero-Cost Memory Shuffle:**
   - Modified `postController.js` to fetch the latest 200 posts and perform an in-memory shuffle using the Fisher-Yates algorithm in Node.js.
   - This avoids the O(N) cost of `ORDER BY RANDOM()` while ensuring unique discovery for every user.
3. **Sticky Discovery UX:**
   - Implemented a "Tap to see new posts" banner in `FeedPage.jsx`.
   - Uses `cacheBuster` to force fresh data fetches and automatically scrolls to top on refresh.

---

## 9. Native GPS Location Implementation Strategy
To achieve banking-app quality GPS (high accuracy, non-blocking), the following strategy is implemented:
- **Primary:** Capacitor Geolocation for native mobile access.
- **Accuracy:** 3-10 meters with Wi-Fi/Cell triangulation.
- **Fallback:** IP-based location for web/desktop.
- **Integration:** Managed via `LocationContext.jsx` and `nativeGpsService.js`.

---

## 11. Velocity & Risk Defense System (The Architect's Protocol)
**Issue:** Account takeover risks and fraudulent logins.

### Technical Implementation
1. **Strict GPS Mandate:**
   - Logins are now impossible without active GPS permissions.
   - Frontend `getCoordinates()` mandates sub-10m accuracy before permitting auth calls.
2. **Velocity Risk Engine:**
   - Calculates geographic displacement between current and last login.
   - Blocks "Impossible Travel" (e.g., speed > 900 km/h) with a hard 403 verdict.
   - Challenges new devices with compulsory OTP.
3. **Zero-Maintenance Logs:**
   - Auto-cleaning trigger (10% probability) manages `login_history` storage.
   - Keeps only the last 30 days of data for performance parity.

---

## 📄 License
MIT License. Built for MHub.
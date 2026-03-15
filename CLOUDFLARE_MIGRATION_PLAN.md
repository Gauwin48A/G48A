# MHub Cloudflare Migration Plan

## Overview

Migrate MHub from Express + PostgreSQL + Cloudinary to Cloudflare's edge-native stack:

| Current | Target (Cloudflare) |
|---|---|
| Express 5 (Node.js) | Cloudflare Workers (edge compute) |
| PostgreSQL (33 migrations) | D1 (SQLite-based, edge database) |
| Cloudinary (media) | R2 (object storage, 0 egress) |
| Socket.io + Pusher (real-time) | Durable Objects + WebSocket API |
| Vercel / manual deploy (frontend) | Cloudflare Pages (unlimited bandwidth) |
| Redis (cache, optional) | Workers KV (key-value, 100K reads/day free) |

**Total cost: $0/month (free tier) or $5/month (Workers Paid)**

---

## Prerequisites

- Cloudflare account (free)
- wrangler CLI installed: `npm install -g wrangler`
- Domain pointed to Cloudflare DNS (free)

---

## Phase 1: Frontend on Cloudflare Pages (Week 1)

### What changes

The React client deploys to Cloudflare Pages with zero code changes.

### Steps

1. **Connect repo to Cloudflare Pages**
   - Dashboard > Pages > Create Project > Connect Git
   - Build command: `cd client && npm run build`
   - Build output: `client/dist`
   - Root directory: `/`

2. **Environment variables**
   - Set `VITE_API_BASE_URL` to your Workers API URL (from Phase 2)
   - Set `VITE_SOCKET_URL` for real-time (Phase 4)
   - Set all `VITE_PUSHER_*` keys

3. **Custom domain**
   - Add your domain in Pages settings
   - Cloudflare auto-provisions SSL

4. **Verify**
   - Frontend loads, static assets served from global CDN
   - PWA manifest and service worker function correctly

### Code changes required: NONE

The Vite build produces static files. Cloudflare Pages serves them globally.

---

## Phase 2: API on Cloudflare Workers (Weeks 2-4)

### Architecture shift

Express cannot run on Workers directly. Options:

| Approach | Effort | Compatibility |
|---|---|---|
| **Hono framework** (recommended) | Medium | Express-like API, built for Workers |
| **itty-router** | Low | Minimal, good for small APIs |
| **Full rewrite** | High | Maximum optimization |

### Recommended: Hono

Hono is an Express-like framework that runs natively on Cloudflare Workers.

```
Express route:  app.get('/api/posts', auth, getAll)
Hono equivalent: app.get('/api/posts', auth, getAll)
```

### Migration steps

1. **Create Workers project**
   ```bash
   mkdir mhub-api && cd mhub-api
   npm init -y
   npm install hono @cloudflare/workers-types
   npx wrangler init
   ```

2. **Port each route module (59 total)**

   Priority order for migration:
   - P0: auth, posts, users, profile (core functionality)
   - P1: feed, categories, cart, wishlist, offers, sale, transactions
   - P2: payments, tiers, rewards, referral, chat, notifications
   - P3: admin, analytics, complaints, reviews, channels
   - P4: remaining 30+ utility routes

3. **Middleware translation**

   | Express middleware | Cloudflare equivalent |
   |---|---|
   | `helmet` | Workers security headers (manual or Hono plugin) |
   | `cors` | Hono CORS middleware |
   | `express-rate-limit` | Workers KV + rate limit logic |
   | `csrf` | Custom CSRF with KV token store |
   | `jwt auth` | jose library (works in Workers) |
   | `multer` (file upload) | R2 direct upload via Workers |
   | `compression` | Automatic (Cloudflare edge compression) |

4. **wrangler.toml configuration**
   ```toml
   name = "mhub-api"
   main = "src/index.js"
   compatibility_date = "2024-01-01"

   [[d1_databases]]
   binding = "DB"
   database_name = "mhub-db"
   database_id = "<your-d1-id>"

   [[r2_buckets]]
   binding = "MEDIA"
   bucket_name = "mhub-media"

   [[kv_namespaces]]
   binding = "CACHE"
   id = "<your-kv-id>"
   ```

### Code changes required: SIGNIFICANT

Every controller and service needs adaptation from `pg` pool queries to D1 prepared statements. Every middleware needs porting to Hono/Workers patterns.

---

## Phase 3: Database Migration — PostgreSQL to D1 (Weeks 2-4, parallel with Phase 2)

### Critical differences

| PostgreSQL | D1 (SQLite) |
|---|---|
| UUID type | TEXT (generate UUIDs in JS) |
| SERIAL / BIGSERIAL | INTEGER PRIMARY KEY AUTOINCREMENT |
| `NOW()` | `datetime('now')` |
| `RETURNING *` | Separate SELECT after INSERT |
| CTEs (WITH clause) | Supported (SQLite 3.8+) |
| JSONB operators | `json_extract()` |
| Array columns | Not supported (use JSON or junction tables) |
| `ILIKE` | `LIKE` (case-insensitive collation) |
| `pg_trgm` (fuzzy search) | `LIKE '%term%'` or FTS5 |
| Connection pooling | N/A (serverless, auto-managed) |
| Transactions | Supported (but single-writer) |

### Migration steps

1. **Rewrite all 33 SQL migrations for SQLite syntax**
   - Replace UUID → TEXT
   - Replace SERIAL → INTEGER PRIMARY KEY AUTOINCREMENT
   - Replace NOW() → datetime('now')
   - Remove PostgreSQL-specific extensions
   - Replace JSONB → JSON with json_extract()

2. **Create D1 database**
   ```bash
   npx wrangler d1 create mhub-db
   npx wrangler d1 execute mhub-db --file=./migrations/001_schema.sql
   ```

3. **Port all query patterns**

   PostgreSQL:
   ```javascript
   const { rows } = await pool.query('SELECT * FROM posts WHERE id = $1', [id]);
   ```

   D1:
   ```javascript
   const result = await env.DB.prepare('SELECT * FROM posts WHERE id = ?').bind(id).first();
   ```

4. **Data export/import**
   - Export existing PostgreSQL data as SQL INSERT statements
   - Transform for SQLite compatibility
   - Import via `wrangler d1 execute`

### Code changes required: HIGH

Every database query in 42 controllers and 52 services needs rewriting.

---

## Phase 4: Real-Time — Socket.io to Durable Objects (Weeks 5-6)

### Architecture

- **Durable Objects** maintain WebSocket connections per chat room / user
- Each Durable Object is a persistent, stateful Worker instance
- Replaces Socket.io rooms + Pusher channels

### Steps

1. **Create a ChatRoom Durable Object**
   - Handles WebSocket connections for 1:1 chat
   - Stores messages in D1 or Durable Object storage

2. **Create a Notifications Durable Object**
   - Per-user notification stream
   - Push events when new notifications arrive

3. **Client changes**
   - Replace `socket.io-client` with native WebSocket API
   - Connect to Workers WebSocket endpoint

### Code changes required: HIGH

Socket.io and Pusher SDK calls throughout the client need rewriting to native WebSocket with reconnect logic.

---

## Phase 5: Media Storage — Cloudinary to R2 (Week 3)

### Steps

1. **Create R2 bucket**
   ```bash
   npx wrangler r2 bucket create mhub-media
   ```

2. **Upload endpoint in Worker**
   ```javascript
   app.post('/api/upload', auth, async (c) => {
     const formData = await c.req.formData();
     const file = formData.get('file');
     const key = `uploads/${Date.now()}-${file.name}`;
     await c.env.MEDIA.put(key, file.stream());
     return c.json({ url: `https://media.yourdomain.com/${key}` });
   });
   ```

3. **Serve via custom domain**
   - Point `media.yourdomain.com` to R2 bucket
   - Cloudflare CDN auto-caches globally

4. **Migrate existing images**
   - Download from Cloudinary
   - Upload to R2
   - Update database URLs

### Code changes required: MEDIUM

Replace Cloudinary SDK upload calls with R2 put operations. Update image URL patterns.

---

## Phase 6: Caching — Redis to Workers KV (Week 4)

### Mapping

| Redis Pattern | Workers KV Equivalent |
|---|---|
| `SET key value EX 3600` | `await CACHE.put(key, value, { expirationTtl: 3600 })` |
| `GET key` | `await CACHE.get(key)` |
| `DEL key` | `await CACHE.delete(key)` |
| `INCR key` | Read + write (KV is eventually consistent) |
| pub/sub | Durable Objects or Queues |

### Limitations

- KV is eventually consistent (reads may be stale by ~60s)
- No atomic increment (unlike Redis INCR)
- 100,000 reads/day on free tier
- Good for: session tokens, cached queries, rate limit counters

### Code changes required: LOW-MEDIUM

Redis is already optional in MHub. Replace the Redis service calls with KV equivalents.

---

## Phase 7: Background Jobs — node-cron to Cron Triggers (Week 5)

### Mapping

| Current (node-cron) | Cloudflare Equivalent |
|---|---|
| `cron.schedule('0 0 * * *', postExpiry)` | Workers Cron Trigger: `0 0 * * *` |
| 10 scheduled jobs | 10 Cron Triggers in wrangler.toml |

### wrangler.toml

```toml
[triggers]
crons = [
  "0 0 * * *",      # Post expiry (daily midnight)
  "0 9 * * *",      # Expiry warnings
  "0 10 * * *",     # Subscription check
  "0 * * * *",      # Transaction expiry (hourly)
  "0 */2 * * *",    # Payment reconciliation
  "0 * * * *",      # Offer expiry (hourly)
  "30 9 * * *",     # Daily digest
  "0 */6 * * *",    # Fraud batch review
  "0 2 * * *",      # Auto-close complaints
  "10 0 * * 1",     # Leaderboard rewards (Monday)
]
```

### Code changes required: LOW

The job logic stays the same, just triggered differently.

---

## Execution Timeline

| Week | Phase | What Gets Done |
|---|---|---|
| **Week 1** | Phase 1 | Frontend on Cloudflare Pages (zero changes) |
| **Week 2** | Phase 2+3 | Start API porting (P0 routes) + D1 schema migration |
| **Week 3** | Phase 2+3+5 | Continue API (P1 routes) + R2 media setup |
| **Week 4** | Phase 2+6 | Continue API (P2-P3 routes) + KV caching |
| **Week 5** | Phase 4+7 | Real-time (Durable Objects) + Cron Triggers |
| **Week 6** | Phase 4 | Complete real-time + integration testing |
| **Week 7-8** | Testing | End-to-end testing, data migration, cutover |

---

## Risk Assessment

| Risk | Impact | Mitigation |
|---|---|---|
| D1 is SQLite, not PostgreSQL | HIGH - all queries need rewriting | Start early, test each migration |
| Durable Objects complexity | MEDIUM - new programming model | Prototype chat room first |
| Free tier limits (100K req/day) | MEDIUM - may hit during growth | Monitor, upgrade to $5/month when needed |
| D1 single-writer limitation | LOW - only matters at scale | Partition by user/post for writes |
| No native PostgreSQL features (arrays, JSONB operators) | MEDIUM | Use JSON + junction tables |
| Socket.io client library removal | MEDIUM | Native WebSocket is simpler but needs reconnect logic |

---

## What to Exclude from Migration (Per User Request)

- **Authentication layer** — Skip auth middleware/routes until core features work
- **Pricing/payment layer** — Skip Razorpay/Stripe integration until core works
- Focus on: listings, search, feed, categories, profiles, notifications, chat

---

## Free Tier Budget

| Resource | Free Allowance | MHub Estimated Usage |
|---|---|---|
| Workers requests | 100,000/day | ~5,000-20,000/day (early stage) |
| D1 storage | 5 GB | ~500 MB (early stage) |
| D1 reads | 5M/day | ~50,000/day (early stage) |
| D1 writes | 100K/day | ~5,000/day (early stage) |
| R2 storage | 10 GB/month | ~2 GB (early stage) |
| R2 operations | 1M reads, 100K writes/month | Well within limits |
| KV reads | 100,000/day | ~10,000/day |
| KV writes | 1,000/day | ~500/day |
| Pages | Unlimited builds + bandwidth | N/A |

**Verdict: MHub fits comfortably in Cloudflare free tier for the first ~1000 users.**

---

## Alternative: Hybrid Strategy (Recommended)

If the full D1 migration feels too risky, use this hybrid approach:

| Layer | Service | Why |
|---|---|---|
| Frontend | Cloudflare Pages | Best free hosting, unlimited bandwidth |
| API + DB | Supabase Free | PostgreSQL (zero query rewrites), built-in auth |
| Media | Cloudflare R2 | Better than Cloudinary free tier (10 GB vs 25 GB but 0 egress) |
| CDN + DNS | Cloudflare | Free SSL, caching, protection |
| Caching | Supabase Edge Functions + KV | Or keep Redis optional |

This gives you $0/month with minimal code changes while keeping your PostgreSQL intact.

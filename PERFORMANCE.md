# ⚡ Performance Documentation

This document details the performance optimizations implemented in MHub for handling 1 lakh to 10 lakh concurrent users.

---

## 📊 Performance Metrics

### Load Test Results

| Metric | Value | Test Conditions |
|--------|-------|-----------------|
| **Throughput** | 33,300 req/sec | 500 concurrent requests |
| **Avg Response Time** | 0.9 ms | With cache hit |
| **P99 Latency** | < 50 ms | Under normal load |
| **Capacity** | 2M req/min | Single server |

### Scalability

| Users | Requests/sec | Infrastructure Needed |
|-------|--------------|----------------------|
| 1 Lakh (100K) | 33K | Single server + cache |
| 10 Lakh (1M) | 33K | Redis + replicas |
| 100 Lakh (10M) | 330K+ | Load balancer + cluster |

---

## 🚀 Caching Architecture

### Three-Layer Cache Strategy

```
┌─────────────────────────────────────────────────────┐
│                     CLIENT                           │
│  Browser Cache + Service Worker + localStorage       │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│                 EDGE (Nginx)                         │
│  Static files + API response caching (5s TTL)        │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│               APPLICATION (Node.js)                  │
│  Redis distributed cache (5s feed, 30s posts)        │
│  In-memory fallback if Redis unavailable             │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│                DATABASE (PostgreSQL)                 │
│  Read replicas + connection pooling                  │
└─────────────────────────────────────────────────────┘
```

### Cache TTL Configuration

| Cache Type | TTL | Purpose |
|------------|-----|---------|
| Feed Cache | 5 seconds | Fresh posts on refresh |
| Post Cache | 30 seconds | Individual post details |
| User Cache | 60 seconds | User profile data |
| Categories | 5 minutes | Rarely changing data |

---

## 🗄️ Database Optimization

### Performance Indexes

```sql
-- Critical indexes for high-scale operations
CREATE INDEX idx_posts_active_score 
  ON posts(status, created_at DESC, views_count ASC);

CREATE INDEX idx_posts_active_freshness 
  ON posts(created_at DESC) 
  WHERE status = 'active';

CREATE INDEX idx_posts_guaranteed_reach 
  ON posts(user_id, category_id, views_count, created_at DESC);
```

### Connection Pooling

| Setting | Value | Description |
|---------|-------|-------------|
| `DB_POOL_MAX` | 20 | Max connections per pool |
| `DB_REPLICA_POOL_MAX` | 10 | Connections per replica |
| Idle Timeout | 30 seconds | Release unused connections |

### Read Replica Routing

```
SELECT queries → Read Replicas (round-robin)
INSERT/UPDATE/DELETE → Primary database
Transaction queries → Primary database
```

---

## 🔄 Frontend Optimization

### Code Splitting

All pages use lazy loading for minimal initial bundle:

```javascript
const AllPosts = lazy(() => import('./pages/AllPosts.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Profile = lazy(() => import('./pages/Profile.jsx'));
// ... 25+ lazy-loaded pages
```

### Bundle Size

| Bundle | Size (gzipped) | Description |
|--------|----------------|-------------|
| Main | ~150 KB | Core React + routing |
| Vendor | ~200 KB | UI components |
| Pages | ~5-20 KB each | Lazy loaded |

### Image Optimization

- Cloudinary for automatic compression
- WebP format with fallbacks
- Lazy loading with Intersection Observer
- Placeholder blur images

---

## 🏗️ Infrastructure

### PM2 Cluster Mode

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'mhub-api',
    instances: 'max',      // Use all CPU cores
    exec_mode: 'cluster',
    max_memory_restart: '500M'
  }]
};
```

### Nginx Load Balancer

```nginx
upstream mhub_api {
    least_conn;
    server 127.0.0.1:5000;
    server 127.0.0.1:5001;
    server 127.0.0.1:5002;
}

# API caching
proxy_cache_path /tmp/nginx levels=1:2 keys_zone=api_cache:10m;
```

### Docker Compose Stack

| Service | Instances | Purpose |
|---------|-----------|---------|
| Redis | 1 | Distributed cache |
| PostgreSQL Primary | 1 | Write operations |
| PostgreSQL Replica | 1 | Read operations |
| Node.js API | 3 | Application servers |
| Nginx | 1 | Load balancer |

---

## 📈 Monitoring

### Cache Statistics Endpoint

```bash
GET /api/posts/cache-stats

Response:
{
  "hits": 1500,
  "misses": 50,
  "hitRate": "96.77%",
  "isRedisAvailable": true,
  "health": { "status": "healthy", "latency": "1ms" }
}
```

### Key Metrics to Monitor

| Metric | Alert Threshold | Action |
|--------|-----------------|--------|
| Response Time | > 500ms | Scale horizontally |
| Cache Hit Rate | < 80% | Check TTL settings |
| DB Connections | > 80% pool | Add read replicas |
| Memory Usage | > 80% | Restart/scale |
| Error Rate | > 1% | Investigate logs |

---

## 🎯 Guaranteed Reach Algorithm

### Performance Considerations

```sql
-- Scoring components with randomization
impression_boost: 0-15000 (low view posts get priority)
freshness_boost: 0-12000 (new posts get visibility)
random_score: 0-50000 (dominant randomization)

-- Total score = impression + freshness + random
-- Random dominates to ensure variety on each refresh
```

### Query Optimization

- Single CTE-based query (no N+1)
- Author diversity constraint (1 post per seller)
- Category diversity constraint (max 3 per category)
- Limit pushed to SQL level

---

## 🔧 Performance Tuning Guide

### For 1 Lakh Users

```env
# Basic setup - sufficient
DB_POOL_MAX=20
CACHE_TTL=5
NODE_ENV=production
```

### For 10 Lakh Users

```env
# Add Redis + replicas
REDIS_HOST=redis.server.com
DB_REPLICA_HOSTS=replica1.com,replica2.com
DB_POOL_MAX=50
```

### For 100 Lakh Users

- Multiple API server clusters
- Redis cluster (not single instance)
- CDN for static assets
- Database sharding
- Microservices architecture

---

## 📋 Performance Checklist

### Development

- [ ] Use React DevTools Profiler
- [ ] Check bundle size with `npm run analyze`
- [ ] Test with Lighthouse
- [ ] Monitor API response times

### Production

- [ ] Enable gzip compression
- [ ] Configure CDN for static files
- [ ] Set up Redis cluster
- [ ] Enable database connection pooling
- [ ] Configure read replicas
- [ ] Set up monitoring dashboards

---

## 📚 Performance Resources

- [Node.js Performance Best Practices](https://nodejs.org/en/docs/guides/dont-block-the-event-loop/)
- [PostgreSQL Performance Tuning](https://www.postgresql.org/docs/current/performance-tips.html)
- [Redis Best Practices](https://redis.io/docs/management/optimization/)
- [React Performance Optimization](https://reactjs.org/docs/optimizing-performance.html)

---

**Last Updated:** January 2026  
**Tested With:** Node.js 18, PostgreSQL 15, Redis 7

# Edge Caching Setup Guide (Cloudflare CDN)

## Why Edge Caching?
- Static assets (JS, CSS, images) served from 300+ global edge locations
- Reduces origin server load by 90%+
- Sub-50ms load times even in remote areas
- **Free tier** includes unlimited bandwidth

---

## Step 1: Add Domain to Cloudflare

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Add your domain (e.g., `mhub.com`)
3. Update nameservers at your registrar
4. Wait for propagation (5-15 min)

---

## Step 2: Configure Caching Rules

### Page Rules (Free Tier)

**Rule 1: Cache Static Assets**
```
URL: *mhub.com/static/*
Setting: Cache Level = Cache Everything
Edge TTL: 1 month
```

**Rule 2: Cache Images**
```
URL: *mhub.com/uploads/*
Setting: Cache Level = Cache Everything
Edge TTL: 1 week
```

**Rule 3: Bypass Cache for API**
```
URL: *mhub.com/api/*
Setting: Cache Level = Bypass
```

---

## Step 3: Browser Cache Headers

Add to `server/src/index.js`:

```javascript
// Static file caching
app.use('/static', express.static('public', {
  maxAge: '30d', // 30 days
  immutable: true
}));

app.use('/uploads', express.static('uploads', {
  maxAge: '7d', // 7 days
  etag: true
}));
```

---

## Step 4: Enable Compression

In Cloudflare Dashboard:
1. Speed > Optimization
2. Enable: Auto Minify (JS, CSS, HTML)
3. Enable: Brotli Compression

---

## Step 5: Security Settings

1. SSL/TLS > Full (Strict)
2. Enable: Always Use HTTPS
3. Enable: Automatic HTTPS Rewrites

---

## Verification

Run: `curl -I https://your-domain.com/static/app.js`

Look for:
```
cf-cache-status: HIT
age: 12345
```

---

## Expected Results

| Metric | Before | After |
|--------|--------|-------|
| TTFB | 200-500ms | 20-50ms |
| Static Load | 1-2s | 100-200ms |
| Origin Requests | 100% | 10-20% |
| Bandwidth Cost | $XX | Near $0 |

---

*Last Updated: 2026-01-04*

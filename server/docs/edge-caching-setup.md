# Edge Caching Setup (Runtime-Aligned)

Last updated: 2026-02-27

This document is aligned with the current server runtime configuration in `server/src/index.js`.

## Runtime Cache Configuration (Current)

### Static assets
- Route: `/static`
- Source path: `server/public`
- Cache behavior:
  - `maxAge: 30d`
  - `immutable: true`
  - `etag: true`

### Upload assets
- Route: `/uploads`
- Source path: `server/uploads`
- Cache behavior:
  - `maxAge: 7d`
  - `etag: true`

### Optimized upload assets
- Route: `/uploads/optimized`
- Source path: `server/uploads/optimized`
- Cache behavior:
  - `maxAge: 30d`
  - `immutable: true`

## API Caching Guidance
- Keep authenticated and dynamic API routes uncached at edge by default.
- Continue using route-level cache headers for special cases.
- Example: feed controller sends `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate` where required.

## CDN Alignment (Cloudflare/AWS CDN)

### Recommended edge rules
1. Cache `/static/*` for 30 days.
2. Cache `/uploads/optimized/*` for 30 days.
3. Cache `/uploads/*` for 7 days.
4. Bypass cache for `/api/*` unless explicitly marked safe for caching.

## Verification Steps
1. Request a static asset header:
   - `curl -I https://<domain>/static/<asset>.js`
2. Request an optimized upload header:
   - `curl -I https://<domain>/uploads/optimized/<image>.jpg`
3. Request an API endpoint header:
   - `curl -I https://<domain>/api/feed`
4. Confirm expected cache directives and CDN cache status (`HIT`/`MISS`) behavior.

## Completion Decision
- Edge caching documentation is reconciled with deployed runtime behavior.
- Evidence-backed status: COMPLETE.

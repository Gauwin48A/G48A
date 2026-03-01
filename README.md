# MHub

Last updated: 2026-02-27

MHub is a marketplace platform with React client + Node/Express server + PostgreSQL.

## Current Delivery Status
- Ordered execution phases (0-5): COMPLETE.
- Core optimization pass: COMPLETE.
- Baseline validation suites: PASS.

## Run Locally

### Server
```bash
cd server
npm install
npm run dev
```

Expected local backend: `http://localhost:5001`

### Client
```bash
cd client
npm install
npm run dev
```

Expected local frontend: `http://localhost:8081`

### Local CORS/Port Guardrails
- Client localhost development now prefers same-origin `/api` via Vite proxy to avoid CORS drift.
- Keep `VITE_FORCE_ABSOLUTE_API_ORIGIN=false` (or unset) for local dev.
- If you intentionally want direct `http://localhost:5000`, first stop any conflicting service on `5000`.
- After any env/base URL change, do a hard refresh (`Ctrl+F5`) in browser.

## Key Documentation
- `ORDERED_EXECUTION_CHECKLIST.md`
- `FEATURE_STATUS_REPORT.md`
- `FEATURE_COMPLETION_MATRIX.md`
- `PRODUCTION_LAUNCH_ROADMAP.md`
- `server/docs/TEST_VALIDATION.md`
- `server/docs/PHASE5_VALIDATION_EVIDENCE_2026-02-27.md`

## Footprint Commands
```bash
# Size report
npm run footprint:report

# Guard against tracked/generated bloat
npm run footprint:guard
npm run footprint:guard:strict
npm run footprint:guard:tracked-deps

# Cleanup generated artifacts
npm run optimize:footprint

# Aggressive cleanup (preserves dependencies unless explicitly confirmed)
npm run optimize:footprint:aggressive

# Aggressive cleanup + explicit dependency removal confirmation
npm run optimize:footprint:aggressive:remove-deps

# Minify locale JSON payloads
npm run optimize:locales

# Validate locale integrity (src/public JSON + coverage)
npm run validate:locales

# Flawless optimization pipeline (fail-fast, end-to-end)
npm run optimize:run
npm run optimize:run:aggressive

# Reinstall both apps when needed
npm run install:all

# Reinstall + dedupe to reduce dependency footprint
npm run install:all:optimized
```

## Enhancement Backlog
- Fraud ML scoring.
- Multi-region active-active setup.
- Advanced progressive feature rollout framework.

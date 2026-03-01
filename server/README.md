# MHub Server

Last updated: 2026-02-27

## Stack
- Node.js + Express
- PostgreSQL

## Scripts
- `npm run dev`
- `npm test`
- `npm run test:waf`
- `npm run test:critical-paths`
- `npm run test:e2e:journeys`

## Local Runtime
- Default local port: `5001`.
- If configured port is busy in development, server startup will try a safe fallback port.
- CORS allowlist supports `CORS_ORIGINS`, `CORS_ORIGIN`, and `ALLOWED_ORIGINS`.

## Operational Modules
- Auth/session/OTP/2FA
- Posts/feed/recommendations
- Payments/reconciliation
- KYC/complaints/reviews/moderation
- WAF/security middleware

## Supporting Docs
- `docs/TEST_VALIDATION.md`
- `docs/waf-rules.md`
- `docs/security-policy.md`
- `docs/MONITORING_ALERTING_OWNERSHIP.md`

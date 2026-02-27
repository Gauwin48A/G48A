# Security Controls Overview

Last updated: 2026-02-27
Status: OPERATIONAL

## Core Security Controls
- WAF middleware for request filtering and evidence headers.
- Strict auth/login rate limiting.
- Helmet, sanitization, HPP, and API-level rate limits.
- Payment webhook signature verification + dedupe/idempotency checks.
- OTP callback ingestion with provider tracking metrics.

## Evidence
- `server/docs/waf-rules.md`
- `server/docs/security-policy.md`
- `server/docs/TEST_VALIDATION.md`
- `server/docs/PHASE5_VALIDATION_EVIDENCE_2026-02-27.md`

## Validation
- `npm run test:waf` => PASS
- Critical path and integration suites => PASS

## Pending Security Enhancements
- ML-assisted fraud signal layer.
- Expanded dependency-security automation in CI pipeline.

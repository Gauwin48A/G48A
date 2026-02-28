# Security Policy and Response Governance

Last updated: 2026-02-28
Owners: Security Lead, Platform Engineering
Status model: OPERATIONAL | COMPLETE | PENDING | BLOCKED

## Linked Operational Docs
- Incident response runbook: `docs/INCIDENT_RESPONSE.md`
- Monitoring ownership evidence: `server/docs/MONITORING_ALERTING_OWNERSHIP.md`
- Test validation matrix: `server/docs/TEST_VALIDATION.md`
- Load and limiter evidence: `server/docs/LOAD_CAPACITY_REPORT.md`

## Security Controls (Current)
- WAF enforcement and request evidence headers.
- Auth/login strict limiter and account lockout controls.
- Webhook signature and idempotency protections.
- Feature-flag lifecycle governance + kill-switch controls.
- Readiness dependency checks with scenario probe matrix.
- Correlation IDs on request/response for incident traceability.
- IPv6-safe rate-limit key generation (`rateLimit.ipKeyGenerator`).

## Incident Severity Targets
- P1: acknowledge within 5 minutes.
- P2: acknowledge within 15 minutes.
- P3: acknowledge within 60 minutes.

## Validation Evidence
- `npm run test:waf`: PASS
- `npm run test:critical-paths`: PASS
- `npm run readiness:probe-matrix`: PASS
- `node tests/load/simple_load_runner.js ... --scenario both`: PASS (0% 5xx)

## Policy Sync Rule
Any security control update must be reflected in incident runbook and monitoring ownership evidence in the same release cycle.

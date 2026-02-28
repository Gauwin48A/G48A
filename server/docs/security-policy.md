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
- Active-active execute preflight controls:
  - required traffic-manager command template in execute mode
  - optional mandatory safety gate before weighted shift
  - dual-region health checks before any shift step
- DB/queue failover eligibility gate with replica lag + duplicate replay thresholds.

## Incident Severity Targets
- P1: acknowledge within 5 minutes.
- P2: acknowledge within 15 minutes.
- P3: acknowledge within 60 minutes.

## Validation Evidence
- `npm run test:waf`: PASS
- `npm run test:critical-paths`: PASS
- `npm run readiness:probe-matrix`: PASS
- `npm run failover:active-active:dependency-gate`: PASS (`BLOCKED` expected with explicit dependency rows until infra is provisioned)
- `npm run failover:db-queue-audit`: PASS (gate result currently `BLOCKED` by external infra dependency)
- execute-mode active-active proof: `server/docs/artifacts/active_active_orchestration_2026-02-28T06-41-41-340Z.json`
- safety-gate enforcement proof: `server/docs/artifacts/active_active_orchestration_2026-02-28T05-39-10-475Z.json`

## Policy Sync Rule
Any security control update must be reflected in:
1. Incident runbook (`docs/INCIDENT_RESPONSE.md`).
2. Monitoring ownership matrix (`server/docs/MONITORING_ALERTING_OWNERSHIP.md`).
3. Validation evidence (`server/docs/TEST_VALIDATION.md`).
in the same release cycle.


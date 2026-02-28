# 34 - Multi-Region Active-Active Execution Backlog

Date: 2026-02-28
Owner: Platform Engineering
Status: BLOCKED

## Objective
Move from drill-validated failover to infrastructure-validated active-active readiness.

## Automation Command Set (This Run)
- Status: COMPLETE
- Evidence: `server/scripts/run_active_active_orchestration.js`, `server/tests/runActiveActiveOrchestration.test.js`
- Validation:
  - `npm test -- tests/runActiveActiveOrchestration.test.js`
  - `$env:ACTIVE_ACTIVE_SYNTHETIC_PROBE='true'; npm run failover:active-active`
- Artifact: `server/docs/artifacts/active_active_orchestration_2026-02-28T04-03-13-550Z.json`

## Ticket Backlog (Execution-Ready)

| ID | Task | Status | Owner | Target Date | Dependency | Success Criteria |
|---|---|---|---|---|---|---|
| MR-001 | Provision secondary region API stack (app, cache, secrets, WAF) | BLOCKED | Platform Engineering | 2026-03-03 | cloud account quotas | Region-B stack healthy with parity checklist PASS |
| MR-002 | Configure managed Postgres cross-region replica and lag alarms | BLOCKED | DB Engineering | 2026-03-04 | MR-001 | replica lag dashboards + failover eligibility alarms active |
| MR-003 | Implement traffic manager weighted routing + health checks | BLOCKED | Platform Engineering | 2026-03-05 | MR-001 | 10/25/50/100 traffic shifts complete without 5xx regression |
| MR-004 | Automate failover command set (trigger, verify, rollback) | COMPLETE | SRE | 2026-03-06 | repo command path | one-click command and synthetic validation artifact generated |
| MR-005 | Queue replay and idempotency audit under regional switchover | PENDING | Backend Lead | 2026-03-07 | MR-002 | no duplicate side effects during replay window |
| MR-006 | Staging live failover drill (non-tabletop) with timed evidence | BLOCKED | Incident Commander | 2026-03-08 | MR-004, MR-005 | measured RTO/RPO recorded and accepted by owners |

## Risk Register
1. Cross-region write conflicts are still manual mitigation.
2. Queue replay order may diverge under high write bursts.
3. DNS and edge propagation timings vary by provider region.

## Blocking Dependencies
1. Secondary region infrastructure and traffic-manager credentials are not available in current execution environment.
2. Cross-region replica provisioning requires cloud-side actions outside repository control.
3. Live drill requires staging traffic manager with health check endpoints in both regions.

## Exit Criteria
1. All MR tickets complete or explicitly blocked with fallback.
2. Live drill evidence published with timestamps and metrics.
3. RTO and RPO target acceptance signed by Platform + Product.

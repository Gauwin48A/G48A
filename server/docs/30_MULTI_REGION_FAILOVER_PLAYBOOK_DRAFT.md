# 30 - Multi-Region Failover Playbook (Draft + Drill-Aligned)

Date: 2026-02-28
Owner: Platform Engineering
Status: COMPLETE
Status model: OPERATIONAL | COMPLETE | PENDING | BLOCKED

## Trigger Conditions
1. API `5xx` > 5% for 10 minutes with provider-side confirmation.
2. Primary DB unavailable > 3 minutes.
3. Regional network isolation confirmed by synthetic probes.

## Pre-Failover Safety Gate
1. Run `npm run failover:active-active:dependency-gate`.
2. Confirm dependency gate `status == COMPLETE` and all prerequisite rows are `COMPLETE`.
3. Run `npm run failover:db-queue-audit`.
4. Confirm DB/queue `gate.status == COMPLETE` for live execute mode.
5. If any gate is `BLOCKED` or `PENDING`, halt live shift and continue on synthetic/tabletop path.

## Failover Sequence
1. Declare SEV-1 and freeze deploys/schema changes.
2. Shift edge/load-balancer traffic to standby region (weighted steps).
3. Validate `health`, `api/health`, `api/ready` in both regions.
4. Validate critical paths (auth/feed/post/payment webhook).
5. Announce stabilization state.

## Rollback Sequence
1. Validate origin region recovery and replication health.
2. Shift traffic back in staged percentages.
3. Re-validate critical paths and queue drain.
4. Close incident after sustained stability window.

## Drill and Orchestration Evidence
- Tabletop artifact: `server/docs/artifacts/failover_tabletop_2026-02-28T04-40-00-718Z.json`
- Execute-mode synthetic weighted shift: `server/docs/artifacts/active_active_orchestration_2026-02-28T04-34-16-803Z.json`
- Safety-gated blocked execute proof: `server/docs/artifacts/active_active_orchestration_2026-02-28T05-18-03-693Z.json`
- Dependency gate artifact: `server/docs/artifacts/active_active_dependency_gate_2026-02-28T05-18-03-656Z.json`
- DB/queue safety audit artifact: `server/docs/artifacts/failover_db_queue_audit_2026-02-28T04-34-28-871Z.json`
- Evidence summary: `server/docs/32_FAILOVER_DRILL_EVIDENCE.md`

## Measured/Estimated Targets from Drill
- Estimated RTO: 18 minutes
- Estimated RPO: 4 minutes

## Remaining Dependencies
- Live active-active execution remains BLOCKED by missing secondary-region infra and traffic-manager credentials.
- Cross-region write conflict automation is still manual.

## Exit Status
Playbook is COMPLETE for automation + drill readiness, with one explicit external BLOCKED dependency for live infra execution.

# 30 - Multi-Region Failover Playbook (Draft)

Date: 2026-02-28
Owner: Platform Engineering
Status: COMPLETE (draft)

## Target Outcome
Define deterministic failover flow from Region A (primary) to Region B (standby).

## Triggers
1. API 5xx > 5% for 10 minutes with infra confirmation.
2. Primary DB unavailable > 3 minutes.
3. Regional network isolation event confirmed by provider status and synthetic checks.

## RTO/RPO Assumptions
- RTO target: 30 minutes.
- RPO target: 15 minutes.
- Read replica lag threshold before failover: <= 60 seconds.

## Failover Steps
1. Incident commander declares failover event.
2. Freeze deployments and schema changes.
3. Promote standby database.
4. Switch API and worker traffic to standby region.
5. Validate `/health`, `/api/health`, `/api/ready` in standby.
6. Run smoke paths: auth, feed, post read/write, payment webhook path.
7. Announce stabilized degraded mode if necessary.

## Rollback Steps
1. Verify original region recovery and data parity.
2. Re-enable replication direction safely.
3. Shift traffic back in stages (10% -> 25% -> 50% -> 100%).
4. Validate error, latency, and queue drain before each stage.
5. Close incident only after 30 minutes stable metrics.

## Communication Plan
- Internal updates every 15 minutes for P1.
- External status page updates every 30 minutes.
- Post-incident summary within 24 hours.

## Dependency Gaps
- Active-active infra and automated failover tooling are not yet implemented.
- This document is draft guidance until infra maturity phase is complete.

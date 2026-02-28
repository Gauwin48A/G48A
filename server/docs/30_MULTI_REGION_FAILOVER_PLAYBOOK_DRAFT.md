# 30 - Multi-Region Failover Playbook (Draft + Drill-Aligned)

Date: 2026-02-28
Owner: Platform Engineering
Status: COMPLETE

## Trigger Conditions
1. API 5xx > 5% for 10 minutes with provider-side confirmation.
2. Primary DB unavailable > 3 minutes.
3. Regional network isolation confirmed by synthetic probes.

## Failover Sequence
1. Declare SEV-1 and freeze deploys/schema changes.
2. Shift edge/load-balancer traffic to standby region.
3. Validate `health`, `api/health`, `api/ready`.
4. Validate critical paths (auth/feed/post/payment webhook).
5. Announce stabilization state.

## Rollback Sequence
1. Validate origin region recovery and replication health.
2. Shift traffic back in staged percentages.
3. Re-validate critical paths and queue drain.
4. Close incident after sustained stability window.

## Drill Evidence
- Tabletop artifact: `server/docs/artifacts/failover_tabletop_2026-02-28T03-07-34-846Z.json`
- Evidence summary: `server/docs/32_FAILOVER_DRILL_EVIDENCE.md`

## Measured/Estimated Targets from Drill
- Estimated RTO: 18 minutes
- Estimated RPO: 4 minutes

## Remaining Dependencies
- Active-active failover automation is still pending.
- Queue replay consistency under real failover load is not yet proven.
- Automatic conflict resolution for cross-region writes remains pending.

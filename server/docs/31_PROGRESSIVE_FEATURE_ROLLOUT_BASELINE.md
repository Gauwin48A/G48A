# 31 - Progressive Feature Rollout Baseline

Date: 2026-02-28
Owner: Platform + Product Engineering
Status: COMPLETE (baseline design)

## Objective
Standardize safe progressive rollout and rollback controls for production changes.

## Flag Taxonomy
1. `release_*`: enable/disable functional release.
2. `experiment_*`: cohort experiments with metric tracking.
3. `ops_*`: operational toggles (fallbacks, queue guards, strict mode).
4. `kill_*`: immediate emergency off switches.

## Cohort Strategy
1. Internal-only cohort (staff/test accounts).
2. Canary cohort (1-5% deterministic hash bucket).
3. Ramp cohort (10% -> 25% -> 50%).
4. Broad rollout (100%) only after KPI stability window.

## Governance
1. Every flag must have owner and expiry date.
2. Every rollout must define success/fail metrics before enable.
3. Every experiment must include abort thresholds.
4. Every kill-switch must be documented in incident runbook.

## Implementation Baseline
- Service: `server/src/services/featureFlagService.js`
- Current active spike usage: ML fraud scoring shadow mode.

## Required Metrics Before Ramp
1. Error rate delta.
2. p95/p99 latency delta.
3. Key business-flow success ratio.
4. Support ticket and abuse alert delta.

## Kill-Switch Governance
1. Trigger: P1/P2 regression crossing threshold.
2. Action: disable related `release_*` or `ops_*` flag immediately.
3. Owner acknowledgment: within 15 minutes.
4. Post-action note: add timeline entry in incident channel and runbook.

## Next Step
- Add admin/operator interface for controlled flag updates with audit trail.

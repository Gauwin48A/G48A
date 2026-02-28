# Immediate Action Items

Date: 2026-02-28
Owner: Engineering
Scope: backend remaining + half-pending closure
Status model: OPERATIONAL | COMPLETE | PENDING | BLOCKED

## Priority 1 (Execution-Verified)
- [x] Active-active orchestration preflight hardening (traffic command + safety gate + dual-region health checks).
  - Status: COMPLETE
  - Evidence: `server/scripts/run_active_active_orchestration.js`, `server/tests/runActiveActiveOrchestration.test.js`, `server/tests/failoverSafetyService.test.js`
  - Validation: `npm test -- tests/runActiveActiveOrchestration.test.js tests/failoverSafetyService.test.js`
- [x] Active-active dependency gate with explicit owner/dependency/impact/fallback output.
  - Status: COMPLETE
  - Evidence: `server/scripts/run_active_active_dependency_gate.js`, `server/tests/activeActiveDependencyGate.test.js`, `server/docs/artifacts/active_active_dependency_gate_2026-02-28T05-39-10-441Z.json`
  - Validation: `npm run failover:active-active:dependency-gate`
- [x] DB/queue failover eligibility audit with guardrail thresholds.
  - Status: COMPLETE
  - Evidence: `server/scripts/run_failover_db_queue_audit.js`, `server/docs/artifacts/failover_db_queue_audit_2026-02-28T04-34-28-871Z.json`
  - Validation: `npm run failover:db-queue-audit`
- [x] Active-active staged shift execution proof under synthetic probes.
  - Status: COMPLETE
  - Evidence: `server/docs/artifacts/active_active_orchestration_2026-02-28T04-34-16-803Z.json`, `server/docs/artifacts/active_active_orchestration_2026-02-28T05-39-10-475Z.json`
  - Validation: `$env:ACTIVE_ACTIVE_SYNTHETIC_PROBE='true'; $env:MULTI_REGION_EXEC_MODE='execute'; $env:ACTIVE_ACTIVE_REQUIRE_SAFETY_GATE='false'; $env:ACTIVE_ACTIVE_TRAFFIC_COMMAND='echo SHIFT_A={WEIGHT_A} SHIFT_B={WEIGHT_B}'; npm run failover:active-active`

## Priority 2 (Performance + Readiness)
- [x] Legit vs abuse profile rerun with tuned limiter behavior.
  - Status: COMPLETE
  - Evidence: `server/tests/load/results/capacity_report_2026-02-28T04-39-36-639Z.json`
  - Validation: `node tests/load/simple_load_runner.js --base-url http://127.0.0.1:5055 --timeout-ms 5000 --scenario both`
- [x] Authenticated read/write load closure.
  - Status: COMPLETE
  - Evidence: `server/tests/load/results/capacity_report_2026-02-28T04-39-15-952Z.json`
  - Validation: `node tests/load/simple_load_runner.js --base-url http://127.0.0.1:5055 --timeout-ms 5000 --scenario full`
- [x] Readiness matrix refresh for `ready/degraded/not_ready` paths.
  - Status: COMPLETE
  - Evidence: `server/docs/artifacts/readiness_probe_matrix_2026-02-28T04-39-50-002Z.json`
  - Validation: `npm run readiness:probe-matrix`

## Priority 3 (Trust/Ops Evidence)
- [x] Fraud telemetry export sink path run (`risk_decision_events`).
  - Status: COMPLETE
  - Evidence: `server/scripts/export_risk_telemetry.js`, `server/docs/artifacts/risk_telemetry_export_2026-02-28T04-35-51-718Z.json`
  - Validation: `node scripts/export_risk_telemetry.js --lookback-minutes 1440 --limit 500 --batch-size 100`
- [x] Weekly ops evidence rows refreshed with exact artifacts.
  - Status: COMPLETE
  - Evidence: `server/docs/MONITORING_ALERTING_OWNERSHIP.md`
  - Validation: dated rows + runbook step mapping present

## Remaining Blockers
- [ ] Live multi-region active-active weighted shift in staging cloud.
  - Status: BLOCKED
  - Dependency: secondary region stack + traffic manager credentials + replica endpoints (`server/docs/artifacts/active_active_dependency_gate_2026-02-28T05-39-10-441Z.json`)
  - Impact: production-like live failover cutover still unavailable from this environment
  - Owner: Platform Engineering
  - Fallback path: keep synthetic orchestration + tabletop + DB/queue safety audit gates active until infra is provisioned

## Current Gate Snapshot
- Backend tests: COMPLETE (`19/19 suites`, `115/115 tests`)
- Client quality gates: COMPLETE (`test`, `build`, `check:bundle-budget`)
- Migration apply+rereun loop: COMPLETE (`server/docs/artifacts/migration_apply_rerun_20260228_100712.log`)
- Scope status: OPERATIONAL for baseline, COMPLETE for closure items, BLOCKED only for external infra dependency


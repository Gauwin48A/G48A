# Test Validation Evidence

Date: 2026-02-28
Owner: Engineering
Scope: server + client + readiness/load closure
Status model: OPERATIONAL | COMPLETE | PENDING | BLOCKED

## Command Matrix

| Date | Area | Command | Result | Evidence |
|---|---|---|---|---|
| 2026-02-28 | Server full suite | `npm test` | PASS | 23 suites, 130 tests, 0 failures, no open-handle warning |
| 2026-02-28 | Server critical paths | `npm run test:critical-paths` | PASS | auth/post/payment/chat critical flows passed |
| 2026-02-28 | Server WAF | `npm run test:waf` | PASS | SQLi/XSS/geo/login limiter checks passed |
| 2026-02-28 | Server E2E journeys | `npm run test:e2e:journeys` | PASS | top10 user journey suite passed |
| 2026-02-28 | Active-active + failover safety tests | `npm test -- tests/runActiveActiveOrchestration.test.js tests/failoverSafetyService.test.js tests/activeActiveDependencyGate.test.js` | PASS | preflight gate, rollback, dependency-gate evaluation, dual-region probe, safety-gate rules verified |
| 2026-02-28 | API limiter simulated-load regression | `npm test -- tests/apiLimiter.simulatedLoad.test.js` | PASS | simulated-user partitioning for trusted load scenarios + IP fallback behavior verified |
| 2026-02-28 | Client tests | `npm run test` | PASS | vitest: 1/1 test passed |
| 2026-02-28 | Client build | `npm run build` | PASS | Vite production build succeeded |
| 2026-02-28 | Client bundle budget | `npm run check:bundle-budget` | PASS | JS/CSS raw+gzip budgets passed |
| 2026-02-28 | Migration apply+rereun | `node scripts/run_migration_apply_rerun.js` | PASS | `server/docs/artifacts/migration_apply_rerun_2026-02-28T06-59-30-334Z.json` (`status=COMPLETE`, 6 files x2 runs) |
| 2026-02-28 | Readiness probe matrix | `npm run readiness:probe-matrix` | PASS | `server/docs/artifacts/readiness_probe_matrix_2026-02-28T06-41-25-786Z.json` |
| 2026-02-28 | Load test (legit+abuse) | `node tests/load/simple_load_runner.js --scenario both` | PASS | `server/tests/load/results/capacity_report_2026-02-28T07-15-05-255Z.json` (`targetSource=managed_server`, `managedPort=5099`) |
| 2026-02-28 | Load test (full incl auth/write) | `node tests/load/simple_load_runner.js --scenario full` | PASS | `server/tests/load/results/capacity_report_2026-02-28T07-15-17-147Z.json` (`targetSource=managed_server`, `managedPort=5100`, port-fallback verified) |
| 2026-02-28 | Load runner CLI/target hardening check | `node tests/load/simple_load_runner.js --dry-run=true --scenario=full --timeout-ms=7000` | PASS | `server/tests/load/results/capacity_report_2026-02-28T07-14-20-837Z.json` |
| 2026-02-28 | DB/queue failover safety audit | `npm run failover:db-queue-audit` | PASS | `server/docs/artifacts/failover_db_queue_audit_2026-02-28T05-16-39-487Z.json` (status `BLOCKED` due missing replica infra, expected) |
| 2026-02-28 | Active-active dependency gate | `npm run failover:active-active:dependency-gate` | PASS | `server/docs/artifacts/active_active_dependency_gate_2026-02-28T06-41-18-417Z.json` (`BLOCKED` with explicit owner/dependency/impact/fallback rows, expected; top-level status fields mirror `report.gate` for automation consumers) |
| 2026-02-28 | Active-active dependency gate (skip-probe strictness) | `npm run failover:active-active:dependency-gate:skip-probe` | PASS | `server/docs/artifacts/active_active_dependency_gate_2026-02-28T06-41-18-416Z.json` (region endpoint dependencies remain `BLOCKED` when probe is intentionally skipped) |
| 2026-02-28 | Failover tabletop simulation | `npm run failover:tabletop` | PASS | `server/docs/artifacts/failover_tabletop_2026-02-28T04-40-00-718Z.json` |
| 2026-02-28 | Flag rollout simulation | `npm run flags:simulate-rollout` | PASS | `server/docs/artifacts/flag_rollout_simulation_2026-02-28T04-40-00-831Z.json` |
| 2026-02-28 | Active-active default command | `npm run failover:active-active` | PASS | `server/docs/artifacts/active_active_orchestration_2026-02-28T06-41-41-059Z.json` (`blocked_initial_unhealthy_region_a` expected without live region endpoints) |
| 2026-02-28 | Active-active execute proof (synthetic probes) | `$env:ACTIVE_ACTIVE_RUN_SAFETY_AUDIT='false'; npm run failover:active-active:synthetic-execute` | PASS | `server/docs/artifacts/active_active_orchestration_2026-02-28T06-41-41-340Z.json` |
| 2026-02-28 | Active-active safety-gated proof | execute-mode with safety gate enabled | PASS | `server/docs/artifacts/active_active_orchestration_2026-02-28T05-39-10-475Z.json` (`blocked_preflight` by design; issues include `safety_gate_blocked` + specific dependency reasons) |
| 2026-02-28 | Fraud telemetry export path | `node scripts/export_risk_telemetry.js --lookback-minutes 1440 --limit 500 --batch-size 100` | PASS | `server/docs/artifacts/risk_telemetry_export_2026-02-28T04-35-51-718Z.json` |

## Completion Decision
- Validation matrix status: COMPLETE
- Blocking test issues: NONE


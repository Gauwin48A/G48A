# Immediate Action Items

Date: 2026-02-28
Owner: Engineering
Scope: remaining + half-pending closure
Status model: OPERATIONAL | COMPLETE | PENDING | BLOCKED

## Priority 1
- [x] Eliminate Jest open-handle warning in server teardown.
  - Status: COMPLETE
  - Evidence: `server/tests/jest.teardown.js`
  - Validation: `npm test` (15 suites, 98 tests passed; no open-handle warning in summary)
- [x] Apply and rerun migrations in target DB environment.
  - Status: COMPLETE
  - Evidence: `server/docs/artifacts/migration_apply_rerun_20260228_083255.log`
  - Validation: `node run_migration.js <migration>` apply+rereun for six new migrations on `localhost:5433/db_shop_2`
- [x] Execute non-dry-run load and store artifact.
  - Status: COMPLETE
  - Evidence: `server/tests/load/results/capacity_report_2026-02-28T03-25-53-753Z.json`
  - Validation: `node tests/load/simple_load_runner.js --base-url http://127.0.0.1:5055 --timeout-ms 5000 --scenario both`

## Priority 2
- [x] Expand regression net for optimized backend routes/services.
  - Status: COMPLETE
  - Evidence: `server/tests/feedController.regression.test.js`, `server/tests/postController.regression.test.js`, `server/tests/featureFlagService.test.js`, `server/tests/mlFraudScoringService.test.js`, `server/tests/flagAuditService.test.js`, `server/tests/riskTelemetryService.test.js`
  - Validation: targeted test command and full `npm test`
- [x] Keep client perf budget gate enforced in CI.
  - Status: OPERATIONAL
  - Evidence: `.github/workflows/ci.yml`, `client/scripts/check-bundle-budget.mjs`
  - Validation: `npm run test`, `npm run build`, `npm run check:bundle-budget`
- [x] Add weekly monitoring verification rows with concrete artifacts.
  - Status: COMPLETE
  - Evidence: `server/docs/MONITORING_ALERTING_OWNERSHIP.md`
  - Validation: dated rows include artifact links and runbook mapping

## Priority 3
- [x] ML fraud scoring productionization (challenge-only cohort, telemetry, kill switch proof).
  - Status: COMPLETE
  - Evidence: `server/src/services/mlFraudScoringService.js`, `server/src/services/riskTelemetryService.js`, `server/docs/29_ML_FRAUD_SPIKE_PLAN.md`
  - Validation: tests + rollout simulation artifact
- [x] Multi-region failover validation (tabletop drill evidence).
  - Status: COMPLETE
  - Evidence: `server/docs/32_FAILOVER_DRILL_EVIDENCE.md`, `server/docs/artifacts/failover_tabletop_2026-02-28T03-07-34-846Z.json`
  - Validation: `npm run failover:tabletop`
- [x] Progressive rollout operationalization (lifecycle/audit/abort simulation).
  - Status: COMPLETE
  - Evidence: `server/src/services/flagAuditService.js`, `server/docs/33_FLAG_ROLLOUT_OPERATIONAL_AUDIT.md`, `server/docs/artifacts/flag_rollout_simulation_2026-02-28T03-07-35-168Z.json`
  - Validation: `npm run flags:simulate-rollout`

## Remaining Blockers
- [ ] Multi-region active-active deployment automation.
  - Status: PENDING
  - Dependency: infrastructure provisioning and traffic manager orchestration
  - Impact: failover remains drill-validated, not fully automated

## Next-Step Execution (Current Run)
- [x] Add persistent fraud decision telemetry path.
  - Status: COMPLETE
  - Evidence: `server/database/migrations/add_risk_decision_events.sql`, `server/src/services/riskTelemetryService.js`
  - Validation: migration apply+rereun + `npm test -- tests/riskTelemetryService.test.js`
- [x] Expand load validation to authenticated read/write profile.
  - Status: COMPLETE
  - Evidence: `server/tests/load/simple_load_runner.js`, `server/tests/load/results/capacity_report_2026-02-28T03-49-10-081Z.json`
  - Validation: `node tests/load/simple_load_runner.js --base-url http://127.0.0.1:5055 --timeout-ms 5000 --scenario full`
- [x] Convert multi-region next actions into execution ticket backlog.
  - Status: COMPLETE
  - Evidence: `server/docs/34_MULTI_REGION_ACTIVE_ACTIVE_EXECUTION_BACKLOG.md`
  - Validation: backlog includes owner, target date, dependency, and success criteria rows


# 29 - ML Fraud Scoring Productionization Plan

Date: 2026-02-28
Owner: Trust Engineering
Status: COMPLETE
Status model: OPERATIONAL | COMPLETE | PENDING | BLOCKED

## Delivered in This Closure Cycle
1. Challenge-only cohort rollout path.
- Flag: `ml_fraud_scoring_challenge`
- Cohort: deterministic percentage rollout (1-5% canary supported)
- Runtime behavior: challenge path independent from hard-block enforcement.

2. Decision telemetry pipeline.
- Service: `server/src/services/riskTelemetryService.js`
- Captured fields: `score`, `recommendedAction`, `shouldChallenge`, `shouldEnforce`, `flagReason`, `modelVersion`, `explainabilityCount`.
- Admin endpoint: `GET /api/auth/risk-metrics`
- Persistence path: `risk_decision_events` table via `server/database/migrations/add_risk_decision_events.sql`

3. Telemetry export sink command path.
- Export script: `server/scripts/export_risk_telemetry.js`
- Artifact: `server/docs/artifacts/risk_telemetry_export_2026-02-28T04-35-51-718Z.json`
- Current run: export successful (0 events in lookback window; sink path validated)

4. Emergency kill-switch proof.
- Global flag kill-switch: `FEATURE_FLAGS_KILL_SWITCH`
- Fraud-specific switch: `FRAUD_ML_KILL_SWITCH`
- Validation: scoring returns `SKIP` when kill-switch is enabled.

## Evidence
- Code: `server/src/services/mlFraudScoringService.js`, `server/src/services/featureFlagService.js`, `server/src/services/riskTelemetryService.js`, `server/scripts/export_risk_telemetry.js`, `server/src/controllers/authController.js`
- Migration: `server/database/migrations/add_risk_decision_events.sql`
- Tests: `server/tests/mlFraudScoringService.test.js`, `server/tests/featureFlagService.test.js`, `server/tests/riskTelemetryService.test.js`
- Operational artifact: `server/docs/artifacts/flag_rollout_simulation_2026-02-28T04-40-00-831Z.json`

## Validation Commands
- `npm test -- tests/mlFraudScoringService.test.js tests/featureFlagService.test.js tests/riskTelemetryService.test.js`
- `npm run flags:simulate-rollout`
- `node scripts/export_risk_telemetry.js --lookback-minutes 1440 --limit 500 --batch-size 100`

## Exit Decision
ML path is productionized for challenge-only staged operation with telemetry, export path, and immediate rollback controls.

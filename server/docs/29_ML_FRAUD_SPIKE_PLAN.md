# 29 - ML Fraud Scoring Productionization Plan

Date: 2026-02-28
Owner: Trust Engineering
Status: COMPLETE

## Delivered in This Closure Cycle
1. Challenge-only cohort rollout path.
- Flag: `ml_fraud_scoring_challenge`
- Cohort: deterministic percentage rollout (1-5% canary supported)
- Runtime behavior: challenge path independent from hard-block enforcement.

2. Decision telemetry pipeline.
- Service: `server/src/services/riskTelemetryService.js`
- Captured fields: `score`, `recommendedAction`, `shouldChallenge`, `shouldEnforce`, `flagReason`, `modelVersion`, explainability count.
- Admin endpoint: `GET /api/auth/risk-metrics`
- Persistence path: `risk_decision_events` table via `server/database/migrations/add_risk_decision_events.sql`

3. Emergency kill-switch proof.
- Global flag kill-switch: `FEATURE_FLAGS_KILL_SWITCH`
- Fraud-specific switch: `FRAUD_ML_KILL_SWITCH`
- Validation: scoring returns `SKIP` when kill-switch is enabled.

## Evidence
- Code: `server/src/services/mlFraudScoringService.js`, `server/src/services/featureFlagService.js`, `server/src/services/riskTelemetryService.js`, `server/src/controllers/authController.js`
- Migration: `server/database/migrations/add_risk_decision_events.sql`
- Tests: `server/tests/mlFraudScoringService.test.js`, `server/tests/featureFlagService.test.js`, `server/tests/riskTelemetryService.test.js`
- Operational artifact: `server/docs/artifacts/flag_rollout_simulation_2026-02-28T03-07-35-168Z.json`

## Validation Commands
- `npm test -- tests/mlFraudScoringService.test.js tests/featureFlagService.test.js tests/riskTelemetryService.test.js`
- `npm run flags:simulate-rollout`

## Exit Decision
ML path is productionized for challenge-only staged operation with telemetry and immediate rollback controls.

# 29 - ML Fraud Scoring Spike Plan

Date: 2026-02-28
Owner: Trust Engineering
Status: COMPLETE (spike start)

## Scope
Introduce a feature-flagged ML-style fraud scoring path in safe shadow mode.

## Implemented
1. Feature flag framework:
   - `server/src/services/featureFlagService.js`
2. Fraud scoring spike service:
   - `server/src/services/mlFraudScoringService.js`
3. Auth login integration (non-breaking):
   - `server/src/controllers/authController.js`
4. Unit tests:
   - `server/tests/featureFlagService.test.js`
   - `server/tests/mlFraudScoringService.test.js`

## Current Behavior
- Default mode: shadow (no enforcement).
- Flag key: `ML_FRAUD_SCORING`.
- Optional enforcement key: `ML_FRAUD_SCORING_ENFORCE`.
- Explainability payload includes feature impacts and signal values.

## Guardrails
- `FEATURE_FLAGS_ENABLED=true` global switch.
- `FF_ML_FRAUD_SCORING_ROLLOUT_PERCENT=0` by default.
- `FRAUD_ML_SHADOW_MODE=true` by default.

## Validation
- Command: `npm test -- tests/featureFlagService.test.js tests/mlFraudScoringService.test.js`
- Result: PASS

## Next Step
- Add controlled challenge-only cohort before any block enforcement.

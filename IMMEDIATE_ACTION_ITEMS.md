# Immediate Action Items

Date: 2026-02-28
Owner: Engineering
Scope: post-baseline hardening closure

## Priority 1
- [x] Eliminate Jest open-handle warning in server test teardown.
  - Evidence: `server/tests/jest.teardown.js`, `server/tests/cacheService.test.js`, `server/src/config/redisSession.js`, `server/src/config/redisCache.js`
  - Validation: `npm test` (13 suites, 90 tests passed; no open-handle warning observed in this run)
- [x] Apply and validate all new DB migrations in target environments.
  - Evidence: `server/database/migrations/add_admin_moderation_contract.sql`, `add_complaint_sla_and_evidence.sql`, `add_kyc_review_queue.sql`, `add_otp_delivery_tracking.sql`, `add_query_path_indexes_20260227.sql`, `add_review_moderation_controls.sql`
  - Validation: apply pass + rerun pass on `localhost:5433/db_shop_2`
- [x] Execute non-dry-run load tests and append evidence artifact.
  - Evidence: `server/tests/load/results/capacity_report_2026-02-27T18-50-27-835Z.json`
  - Validation: `node tests/load/simple_load_runner.js --base-url http://127.0.0.1:5055 --timeout-ms 4000`

## Priority 2
- [x] Add regression tests for recently optimized controllers/routes.
  - Evidence: `server/tests/feedController.regression.test.js`, `server/tests/postController.regression.test.js`
  - Validation: `npm test -- tests/feedController.regression.test.js tests/postController.regression.test.js`
- [x] Add performance budgets for client bundle growth in CI.
  - Evidence: `.github/workflows/ci.yml`, `client/scripts/check-bundle-budget.mjs`
  - Validation: `npm run build && npm run check:bundle-budget`
- [x] Add dashboard alert evidence rows for weekly verification cadence.
  - Evidence: `server/docs/MONITORING_ALERTING_OWNERSHIP.md`
  - Validation: evidence log rows updated with dated owner checks

## Priority 3
- [x] Start ML fraud scoring spike (feature-flagged).
  - Evidence: `server/src/services/featureFlagService.js`, `server/src/services/mlFraudScoringService.js`, `server/src/controllers/authController.js`
  - Validation: `npm test -- tests/featureFlagService.test.js tests/mlFraudScoringService.test.js`
- [x] Prepare multi-region failover playbook draft.
  - Evidence: `server/docs/30_MULTI_REGION_FAILOVER_PLAYBOOK_DRAFT.md`
  - Validation: playbook sections complete with triggers, RTO/RPO assumptions, rollback
- [x] Define progressive feature rollout baseline.
  - Evidence: `server/docs/31_PROGRESSIVE_FEATURE_ROLLOUT_BASELINE.md`
  - Validation: framework includes taxonomy, cohorts, guardrails, kill-switch governance

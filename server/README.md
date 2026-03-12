# MHub Server

Last updated: 2026-02-27

## Stack
- Node.js + Express
- PostgreSQL

## Scripts
- `npm run dev`
- `npm test`
- `npm run test:waf`
- `npm run test:critical-paths`
- `npm run test:e2e:journeys`
- `npm run check:foundation-contract`

## Local Runtime
- Default local port: `5001`.
- If configured port is busy in development, server startup will try a safe fallback port.
- CORS allowlist supports `CORS_ORIGINS`, `CORS_ORIGIN`, and `ALLOWED_ORIGINS`.
- Use `.env.example` as the baseline for Epic 1 config.

## Operational Modules
- Auth/session/OTP/2FA
- Posts/feed/recommendations
- Payments/reconciliation
- KYC/complaints/reviews/moderation
- WAF/security middleware
- API contract/version guard (`src/middleware/apiContract.js`)
- Tenant context isolation baseline (`src/middleware/tenantContext.js`)
- Foundation config/secret/promotion guard (`src/services/foundationGuardService.js`)
- Device identity + lifecycle control plane (`src/routes/deviceLifecycle.js`)
- Telemetry ingest/replay pipeline (`src/routes/telemetry.js`)
- Automation rules + digital twin + alert intelligence (`src/routes/automation.js`)
- Command + OTA + fleet orchestration (`src/routes/fleetOrchestration.js`)
- Security, privacy, and trust operations (`src/routes/securityOperations.js`)
- Reliability engineering and disaster recovery control plane (`src/routes/reliability.js`)
- Operator console and developer platform workflows (`src/routes/operatorPlatform.js`)
- Intelligence optimization and FinOps controls (`src/routes/intelligenceFinops.js`)
- Launch readiness and governance control plane (`src/routes/launchGovernance.js`)

## Epic 1 Foundation Env Flags
- `API_SUPPORTED_VERSIONS` (default `1`)
- `API_REQUIRE_VERSION_FOR_WRITES` (default `false`)
- `RUNTIME_BUDGET_READ_P95_MS` (default `220`)
- `RUNTIME_BUDGET_WRITE_P95_MS` (default `350`)
- `RUNTIME_BUDGET_EGRESS_KB` (default `128`)
- `RUNTIME_BUDGET_LOG_ONLY` (default `true`)
- `RUNTIME_BUDGET_PATH_PREFIXES` (default `/api`)
- `TENANT_CONTEXT_REQUIRED_WRITE` (default `false`)
- `TENANT_CONTEXT_REQUIRED_ALL` (default `false`)
- `TENANT_CONTEXT_ENFORCE_CRITICAL_WRITE_ROUTES` (default `false`)
- `FOUNDATION_STRICT_MODE` (default production `true`, otherwise `false`)
- `SECRET_MIN_LENGTH` (default `32`)

## Epic 2 Device Lifecycle Env Flags
- `DEVICE_ATTESTATION_REQUIRED` (default `false`)
- `DEVICE_ATTESTATION_SECRET`
- `DEVICE_ATTESTATION_MAX_SKEW_SECONDS` (default `300`)
- `DEVICE_PROVISIONING_IDEMPOTENCY_TTL_SECONDS` (default `900`)

## Epic 3 Telemetry Env Flags
- `TELEMETRY_SUPPORTED_SCHEMA_VERSIONS` (default `1`)
- `TELEMETRY_MAX_EVENTS_PER_REQUEST` (default `200`)
- `TELEMETRY_DEDUPE_TTL_SECONDS` (default `300`)
- `TELEMETRY_HOT_RETENTION_HOURS` (default `1`)
- `TELEMETRY_WARM_RETENTION_DAYS` (default `7`)
- `TELEMETRY_REPLAY_TOKEN` (optional; required only when replay must be gated)
- `TELEMETRY_SCHEMA_ADMIN_TOKEN` (optional; required only when schema registry writes must be gated)
- `TELEMETRY_SCHEMA_STRICT_FIELDS` (default `false`)

## Epic 4 Automation Env Flags
- `AUTOMATION_RULES_ADMIN_TOKEN` (optional; required only when rule mutation endpoints must be admin-gated)
- `AUTOMATION_ALERT_DEDUPE_SECONDS` (default `120`)
- `AUTOMATION_ALERT_SILENCE_SECONDS` (default `0`)
- `AUTOMATION_DEFAULT_ESCALATION_MINUTES` (default `15`)
- `AUTOMATION_EXECUTION_LOG_MAX` (default `500`)
- `AUTOMATION_REPLAY_ENABLED` (default `true`)

## Epic 5 Fleet/OTA Env Flags
- `FLEET_ADMIN_TOKEN` (optional; required only when fleet admin routes must be token-gated)
- `FLEET_COMMAND_ACK_TIMEOUT_SECONDS` (default `60`)
- `FLEET_CRITICAL_COMMAND_REQUIRE_DUAL_APPROVAL` (default `true`)
- `OTA_REQUIRE_SIGNATURE` (default `true`)
- `OTA_DEFAULT_CANARY_PERCENT` (default `10`)
- `OTA_SIGNING_SECRET` (required when `OTA_REQUIRE_SIGNATURE=true`)

## Epic 6 Security Ops Env Flags
- `SECURITY_OPS_ADMIN_TOKEN` (optional)
- `SECURITY_ABUSE_BLOCK_THRESHOLD` (default `5`)
- `SECURITY_MIN_RETENTION_DAYS` (default `7`)
- `SECURITY_MAX_RETENTION_DAYS` (default `3650`)
- `SECURITY_INCIDENT_MTTD_TARGET_MINUTES` (default `5`)
- `SECURITY_EVIDENCE_LOG_MAX` (default `1000`)

## Epic 7 Reliability Env Flags
- `RELIABILITY_ADMIN_TOKEN` (optional)
- `RELIABILITY_TRACE_BUFFER_MAX` (default `500`)
- `RELIABILITY_CHAOS_MIN_PASS_PERCENT` (default `98`)
- `RELIABILITY_RTO_TARGET_MINUTES` (default `30`)
- `RELIABILITY_RPO_TARGET_MINUTES` (default `5`)
- `RELIABILITY_ERROR_BUDGET_WINDOW_DAYS` (default `30`)

## Epic 8 Operator Platform Env Flags
- `OPERATOR_PLATFORM_ADMIN_TOKEN` (optional)
- `OPERATOR_TASK_CLICK_BUDGET` (default `3`)
- `OPERATOR_WIDGET_STALENESS_TARGET_SECONDS` (default `5`)
- `OPERATOR_PLAYBOOK_MAX_STEPS` (default `30`)
- `OPERATOR_ACCESSIBILITY_REQUIRE_WCAG_AA` (default `true`)
- `OPERATOR_DEVKEY_PREFIX` (default `opk`)

## Epic 9 Intelligence/FinOps Env Flags
- `INTELLIGENCE_ADMIN_TOKEN` (optional)
- `INTELLIGENCE_HEALTH_ANOMALY_THRESHOLD` (default `40`)
- `INTELLIGENCE_ENERGY_SAVINGS_TARGET_PERCENT` (default `15`)
- `FINOPS_COST_ALERT_USD` (default `1000`)
- `EXPERIMENT_AUTO_ROLLBACK_THRESHOLD_PERCENT` (default `5`)

## Epic 10 Launch Governance Env Flags
- `LAUNCH_GOVERNANCE_ADMIN_TOKEN` (optional)
- `LAUNCH_ONBOARDING_TARGET_MINUTES` (default `30`)
- `BILLING_ACCURACY_TARGET_PERCENT` (default `99.9`)
- `LAUNCH_CERT_MIN_SCORE` (default `85`)
- `LAUNCH_USAGE_LEDGER_MAX` (default `5000`)
- `LAUNCH_EVIDENCE_LOG_MAX` (default `2000`)

## Supporting Docs
- `docs/PHASE5_VALIDATION_EVIDENCE_2026-02-27.md`
- `docs/TEST_CASES.md`
- `docs/PERFORMANCE.md`
- `docs/INCIDENT_RESPONSE.md`
- `docs/waf-rules.md`
- `docs/security-policy.md`
- `docs/edge-caching-setup.md`

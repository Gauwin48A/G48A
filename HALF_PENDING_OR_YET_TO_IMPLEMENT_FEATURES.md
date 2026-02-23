# MHub - Half Pending and Yet-to-Implement Features
Date: 2026-02-23
Source references:
- `IMPLEMENTATION_CHECKLIST.md:29-40`
- `FEATURE_STATUS_REPORT.md:204-482`
- `PRODUCTION_LAUNCH_ROADMAP.md` (unchecked operational tasks and conclusion at `:669`)

## Half-Implemented Product Features

| Priority | Initiative | Current Completion | Main Gap |
|---|---|---|---|
| P0 | Payment auto-verification + retry + refunds | ~70% | Still heavily manual admin workflow |
| P0 | OTP real delivery for auth + sale | ~80% | OTP generation exists, delivery path still placeholder/fallback |
| P0 | KYC OCR + auto-validation + routing | ~60% | Manual review heavy, no full automation |
| P1 | Complaints workflow + SLA engine | ~50% | Persistence/workflow depth incomplete |
| P1 | Reviews and ratings end-to-end | ~40% | UI + routing + lifecycle incomplete |
| P1 | Admin moderation pro features | ~70% | Dashboard depth/filtering/bulk operations incomplete |
| P2 | Offer negotiation depth | ~70% | Counter/expiry/history lifecycle incomplete |
| P2 | Inquiry management enhancements | ~60% | Templates/routing/anti-spam missing |
| P2 | Tier monetization completion | ~75% | Upgrade flow and production-grade monetization gaps |
| P2 | Referral/rewards expansion | ~65% | Minimal referral loop and redemption depth |
| P3 | Cron/background maturity | ~50-60% | Some jobs missing or not production hardened |
| P3 | Fraud/risk engine maturity | ~60% | Rule-based only, no full review pipeline |

## Yet-to-Implement or Operationally Incomplete Features

From roadmap checklists and launch readiness items:

1. CI/CD and release gates
- GitHub Actions or equivalent.
- Build/test/deploy pipeline.
- Test gates before deployment.

2. Observability and alerting
- Centralized logs.
- Metrics dashboards.
- Alert rules for critical signals.

3. Real integration and E2E testing
- Real (not mocked) integration suite.
- Critical-path E2E scenarios.
- Test DB strategy in CI.

4. Backup and disaster recovery
- Automated backups.
- Restore drills with evidence.
- RPO/RTO documentation.

5. Performance and scale validation
- Load test framework and scenarios.
- Capacity limits and bottleneck reports.
- Horizontal scaling confidence.

6. Database resiliency
- Replication/failover strategy.
- Read replicas for heavy read paths.
- Pool sizing and failover verification.

7. Security/compliance hardening
- Continuous security scans.
- Pen-test + remediation loop.
- GDPR completion and operational runbooks.

## Readiness Conflict to Resolve

Current documentation reports conflicting readiness:
- `FEATURE_COMPLETION_MATRIX.md:9` reports 86%.
- `FEATURE_STATUS_REPORT.md:11` reports 95%.
- `PRODUCTION_LAUNCH_ROADMAP.md:669` reports 50% code quality and 20% operational readiness.

Action: define one single status model (feature completeness vs production readiness vs operational readiness) and publish weekly updates from one source-of-truth document.

## Suggested Execution Order (Pragmatic)

1. P0 product gaps first (payments, OTP delivery, KYC automation).
2. In parallel, build CI/CD + observability baseline.
3. Complete complaints/reviews/admin moderation depth.
4. Run integration/E2E + load tests before scaling user traffic.

# MHub End-to-End Reference

Last updated: 2026-02-27

This file summarizes the operational architecture and major capabilities currently implemented.

## Application Layers
- Client: React + Vite + TanStack Query.
- Server: Express routes/controllers/services.
- Database: PostgreSQL with indexed hot paths.

## Operational Capabilities
- Auth/session/2FA and OTP callbacks.
- Marketplace post lifecycle and discovery feeds.
- Payments + webhook verification + reconciliation.
- KYC automation routing and admin queue.
- Complaints SLA and reviews moderation lifecycle.
- Admin moderation filters, bulk actions, exports.
- WAF, incident response, monitoring ownership, edge caching controls.

## Evidence Docs
- `server/docs/TEST_VALIDATION.md`
- `server/docs/waf-rules.md`
- `server/docs/edge-caching-setup.md`
- `server/docs/security-policy.md`
- `server/docs/MONITORING_ALERTING_OWNERSHIP.md`
- `docs/INCIDENT_RESPONSE.md`

## Remaining Enhancements
- Fraud ML.
- Multi-region failover maturity.
- Expanded E2E coverage and rollout controls.

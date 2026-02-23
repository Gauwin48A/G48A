# MHub - Additional Feature Proposals
Date: 2026-02-23
Goal: propose new features beyond current implementation, prioritized for business impact and operational stability.

## Priority Backlog

| Priority | Feature | Why It Matters | MVP Scope | Estimated Effort |
|---|---|---|---|---|
| P0 | One-command local/dev launcher | Reduces setup friction and startup mistakes | Root `npm run dev` using concurrent client/server start + health check output | 4-8h |
| P0 | Environment validator CLI | Prevents runtime misconfig (missing keys, wrong URL/port, secret mismatch) | `npm run doctor` to validate env files and required services before boot | 8-14h |
| P1 | API contract + typed SDK generation | Eliminates client/server drift and endpoint mismatch | OpenAPI spec + generated client SDK for frontend | 20-30h |
| P1 | Trust timeline for each seller | Improves buyer confidence and conversion | Show account age, successful transactions, complaint resolution stats on profile/post | 18-28h |
| P1 | Listing quality score assistant | Improves listing conversion and feed quality | Score title/photos/description/price; show actionable hints before publish | 20-32h |
| P1 | Buyer protection evidence pack | Speeds dispute resolution | Auto-save timeline of chat/offers/OTP/sale events for each transaction | 18-30h |
| P2 | Dynamic pricing intelligence | Helps sellers price competitively | Suggested price band from recent similar sold listings + confidence score | 26-40h |
| P2 | Seller SLA dashboard | Improves response speed and trust | Track response time, deal closure rate, cancellation rate, late delivery flags | 16-24h |
| P2 | Feature flag and experiment framework | Enables safe rollouts and A/B testing | Server-side flags + client exposure + rollout percentage controls | 24-36h |
| P3 | City-level operations cockpit | Improves scale operations | Per-city health: active listings, fraud alerts, payment delays, complaint SLA | 24-40h |

## Recommended First 3 Additions

1. One-command local/dev launcher (P0)
- Directly solves daily developer friction and startup inconsistency.

2. Environment validator CLI (P0)
- Catches broken config before runtime failures.

3. API contract + typed SDK generation (P1)
- Reduces cross-layer integration bugs and improves release speed.

## Suggested Success Metrics

- Dev onboarding time < 15 minutes from clone to running app.
- Local startup success rate > 95% on first run.
- API integration bugs reduced by at least 40%.
- Listing publish-to-sale conversion increases by at least 10%.
- Dispute resolution time reduced by at least 30%.

## Dependencies and Notes

- P0 items should be completed before scaling new product features.
- P1 trust and listing features benefit from pending work on KYC/reviews/payments.
- Feature flags should be in place before introducing high-risk experiments.

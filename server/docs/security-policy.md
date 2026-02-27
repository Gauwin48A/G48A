# Security Policy and Response Governance

Last updated: 2026-02-27
Owners: Security Lead, Platform Engineering

## Purpose
Define security disclosure process, enforcement controls, and incident governance for MHub.

## Linked Operational Docs
- Incident response runbook: `docs/INCIDENT_RESPONSE.md`
- Monitoring and alert ownership: `server/docs/MONITORING_ALERTING_OWNERSHIP.md`
- WAF enforcement checklist: `server/docs/waf-rules.md`
- Test validation evidence: `server/docs/TEST_VALIDATION.md`

## Responsible Disclosure
- Contact: `security@mhub.com`
- Include: vulnerability description, reproduction steps, impact, optional remediation suggestion.

### Response targets
- Acknowledge reports within 48 hours.
- Critical issues: target remediation within 7 days.
- High/medium issues: target remediation within 30 days.

## Security Enforcement Baseline (Implemented)
- WAF request filtering and evidence headers in API runtime.
- Strict login rate limits and auth endpoint abuse controls.
- Helmet, request sanitization, HPP, and API rate limiting middleware.
- OTP delivery callback and metrics pipeline.
- Payment webhook signature verification and idempotency checks.
- Readiness endpoint with dependency/config checks (`/api/ready`).
- Correlation ID propagation via `x-correlation-id` response header.
- Feature-flag gated ML fraud spike in shadow mode by default.

## Incident Severity Mapping
- P1: outage, breach, data-loss risk. Ack target: 5 minutes.
- P2: major degradation. Ack target: 15 minutes.
- P3: limited regression. Ack target: 60 minutes.

Use the incident runbook for triage, containment, communication, and postmortem handling.

## Bug Bounty Scope
In scope:
- `*.mhub.com`, `api.mhub.com`
- AuthN/AuthZ weaknesses
- Data exposure
- SQLi, XSS, CSRF
- Privilege escalation

Out of scope:
- Social engineering
- Physical attacks
- Volumetric DoS testing without prior approval
- Third-party providers outside MHub control

## Reward Bands (Guideline)
| Severity | Reward |
|---|---|
| Critical | $500 - $1000 |
| High | $200 - $500 |
| Medium | $50 - $200 |
| Low | Recognition |

## Policy Compliance Rule
Security policy updates must remain synchronized with incident response and monitoring ownership docs.

## Completion Decision
- Security policy reconciliation with incident and ownership docs: COMPLETE.
- Last validation: 2026-02-28 (`npm run test:waf`, `npm run test:critical-paths`, `/api/ready` probe).

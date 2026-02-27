# Monitoring, Alerting, and Runbook Ownership

Last updated: 2026-02-27  
Primary owner: Platform Engineering  
Secondary owner: On-call Rotation Lead

## 1. Required Dashboards

### Dashboard A: API Reliability
- Metrics:
  - `http_requests_total` by route/status.
  - `http_request_duration_ms` P50/P95/P99.
  - `5xx_rate_percent` over 5m and 15m windows.
- Owner: Backend Lead.
- Runbook: `docs/INCIDENT_RESPONSE.md` (API/Server section).

### Dashboard B: Auth and Session Health
- Metrics:
  - Login success/failure rate.
  - Refresh token failure ratio.
  - Session revoke volume.
- Owner: Security Lead.
- Runbook: `docs/INCIDENT_RESPONSE.md` (Token/session failures).

### Dashboard C: Payments and Reconciliation
- Metrics:
  - Pending/verified/failed payment counts.
  - Webhook processing latency.
  - Reconciliation mismatch rate.
- Owner: Payments Owner.
- Runbook: payment reconciliation workflow in backend.

### Dashboard D: Trust Operations (OTP + KYC + Complaints + Reviews)
- Metrics:
  - OTP delivery success and callback lag.
  - KYC queue depth and SLA age.
  - Complaint SLA breaches.
  - Review flag volume and hidden ratio.
- Owner: Trust and Safety Lead.
- Runbook: trust workflow docs + incident response.

### Dashboard E: Realtime Chat and Notifications
- Metrics:
  - Active socket connections.
  - Message delivery latency/error rate.
  - Notification send failure rate.
- Owner: Realtime Owner.
- Runbook: `docs/INCIDENT_RESPONSE.md` (Realtime section).

## 2. Alert Rules (Minimum Set)

| Alert | Threshold | Severity | Owner |
|---|---|---|---|
| API 5xx spike | `>2%` for 10m | P1 | Backend Lead |
| API p95 latency | `>1200ms` for 15m | P2 | Backend Lead |
| Auth login failures | `>20%` for 15m | P1 | Security Lead |
| Payment verification lag | `>10m` median for 15m | P1 | Payments Owner |
| Reconciliation mismatch | `>0.5%` daily | P2 | Payments Owner |
| OTP callback delay | `>120s` p95 for 15m | P2 | Trust and Safety Lead |
| KYC queue backlog | `>200 pending` for 30m | P2 | Trust and Safety Lead |
| Complaint SLA breach rate | `>5%` daily | P2 | Support Ops |
| Chat message failures | `>1%` for 10m | P2 | Realtime Owner |

Notification channels:
- P1: Pager + incident channel.
- P2: Slack alert channel + on-call acknowledgment in 15 minutes.
- P3: Ticket queue and next business-day triage.

## 3. Runbook Ownership Matrix

| Area | Primary Owner | Secondary Owner | Review Cadence |
|---|---|---|---|
| API reliability | Backend Lead | Platform Engineer | Weekly |
| Auth/session security | Security Lead | Backend Lead | Weekly |
| Payments | Payments Owner | Finance Ops | Daily |
| Trust operations | Trust and Safety Lead | Support Ops | Daily |
| Realtime chat | Realtime Owner | Backend Lead | Weekly |
| Incident command | On-call Rotation Lead | Engineering Manager | Per incident |

## 4. Operational Process

1. Each owner validates dashboard signal quality every Monday.
2. Alert thresholds are reviewed monthly and tuned with incident data.
3. Any runbook change requires:
   - changelog entry with date,
   - primary owner approval,
   - confirmation in on-call handover notes.

## 5. Evidence Log Template

Use this table to track dashboard and alert validation evidence.

| Date | Owner | Scope | Result | Link/Note |
|---|---|---|---|---|
| 2026-02-27 | Platform Engineering | Dashboard/Alert baseline | PASS | Initial ownership matrix published |

# MHub Unified Implementation Checklist and Delivery Playbook

Date: 2026-02-18
Version: Consolidated v2
Source Merge:
1. Legacy quick priority checklist (effort, dependencies, execution order).
2. Verified code-anchored gap checklist (actual implementation status by file).

---

## 1) Executive Summary

MHub is functional, but monetization, trust, and moderation workflows still have manual bottlenecks. The highest-leverage path is:
1. Payment automation.
2. OTP delivery reliability.
3. KYC automation.
4. Complaints persistence and SLA workflow.
5. Reviews wiring end-to-end.
6. Admin dashboard contract alignment.

These six items reduce manual ops load, unlock revenue, and tighten trust controls.

---

## 2) Consolidated Priority Matrix (What To Build First)

| Priority | Initiative | Current Status | Impact | Estimated Effort | Why First |
|---|---|---|---|---|---|
| P0 | Payment auto-verification + retry + refunds | ~70% | Revenue critical | 30-40h | Removes admin bottleneck and failed upgrade leakage |
| P0 | OTP real delivery for auth + sale | ~80% | Conversion critical | 18-26h | OTP exists but delivery is placeholder/manual |
| P0 | KYC OCR + auto-validation + review routing | ~60% | Trust and compliance critical | 30-45h | Current flow is submit + manual review only |
| P1 | Complaints persistent workflow + SLA engine | ~50% | Safety/ops critical | 20-30h | Frontend submit is mocked, backend list-only |
| P1 | Reviews and ratings full wiring | ~40% | Trust and retention | 18-28h | Controller exists, route/UI integration incomplete |
| P1 | Admin moderation pro features | ~70% | Ops scale critical | 24-36h | Dashboard and frontend contract mismatch |
| P2 | Offer negotiation depth | ~70% | Deal closure uplift | 20-30h | Counter exists, but no lifecycle depth |
| P2 | Inquiry management enhancements | ~60% | Seller productivity | 14-22h | Needs templates, routing, anti-spam |
| P2 | Tier monetization completion | ~75% | ARPU growth | 20-30h | Pricing static and upgrade flow not production-grade |
| P2 | Referral/rewards expansion | ~65% | Growth loop | 20-30h | Minimal referral API, no leaderboard/redemption |
| P3 | Cron/background maturity | ~50-60% | Platform hygiene | 24-36h | Missing digest/fraud batch/auto-resolution jobs |
| P3 | Fraud/risk engine maturity | ~60% | Loss prevention | 35-55h | Rule-based today, no review queue/model pipeline |

---

## 3) Verified Current State (Code-Anchored)

### 3.1 Payment verification workflow (~70%)
Evidence:
1. `server/src/controllers/paymentController.js:9`
2. `server/src/controllers/paymentController.js:178`
3. `client/src/pages/Payments/PaymentPage.jsx:28`

Missing:
1. Bank/gateway webhook verification.
2. Duplicate fingerprinting and reconciliation.
3. Retry and timeout pipeline.
4. Refund workflow and status accounting.
5. Screenshot OCR extraction pipeline.

### 3.2 Sale handshake OTP delivery (~80%)
Evidence:
1. `server/src/controllers/saleController.js:71`
2. `server/src/controllers/saleController.js:106`
3. `server/src/controllers/authController.js:284`

Missing:
1. Real SMS provider and email fallback.
2. Delivery callback tracking.
3. Resend controls and abuse throttling.
4. OTP secrecy hardening (no OTP leakage in response payload).

### 3.3 KYC automation (~60%)
Evidence:
1. `server/src/controllers/userController.js:273`
2. `server/src/controllers/userController.js:309`
3. `server/src/controllers/adminDocController.js:122`
4. `client/src/pages/KYC/KycVerification.jsx:45`

Missing:
1. OCR extraction and field parser.
2. Validation engine (PAN/Aadhaar consistency checks).
3. Expiry detection and reminders.
4. Confidence-based auto-decision + review queue.
5. Optional face match for high-risk cases.

### 3.4 Tier monetization completion (~75%)
Evidence:
1. `server/src/config/tierRules.js:16`
2. `server/src/config/tierRules.js:53`
3. `client/src/pages/TierSelection.jsx:32`

Missing:
1. Dynamic pricing and promo controls.
2. Trial and downgrade lifecycle.
3. Upsell trigger automation.
4. Billing state machine and reconciliation.

### 3.5 Offer negotiation depth (~70%)
Evidence:
1. `server/src/controllers/offersController.js:112`
2. `server/src/controllers/offersController.js:143`
3. `client/src/pages/Offers.jsx:44`

Missing:
1. Offer expiry and multi-round history.
2. Auto-accept thresholds.
3. Negotiation analytics and alerts.

### 3.6 Inquiry management enhancements (~60%)
Evidence:
1. `server/src/controllers/inquiryController.js:4`
2. `server/src/controllers/inquiryController.js:137`

Missing:
1. Templates and quick replies.
2. Spam and duplicate controls.
3. Routing and conversion analytics.

### 3.7 Reviews and ratings end-to-end (~40%)
Evidence:
1. `server/src/controllers/reviewsController.js:77`
2. Reviews routes not mounted in `server/src/index.js`
3. Missing `client/src/pages/Reviews.jsx`

Missing:
1. Route mount and API wiring.
2. Review UI and seller response UI.
3. Moderation workflow and abuse controls.

### 3.8 Referral/rewards expansion (~65%)
Evidence:
1. `server/src/routes/referral.js:6`
2. `server/src/controllers/referralController.js:3`
3. `server/src/controllers/rewardsController.js:82`

Missing:
1. Referral write/action APIs beyond read-only.
2. Leaderboard and redemption mechanics.
3. Affiliate dashboard views.

### 3.9 Complaints workflow (~50%)
Evidence:
1. `server/src/routes/complaints.js:4`
2. `server/src/controllers/complaintsController.js:6`
3. Mocked submit behavior in `client/src/pages/Complaints.jsx:112`

Missing:
1. Persistent create/update endpoints.
2. Lifecycle states and SLA timers.
3. Evidence upload and resolution audit.

### 3.10 Cron/background jobs (~50-60%)
Evidence:
1. `server/src/jobs/cronJobs.js:23`
2. `server/src/jobs/cronJobs.js:91`
3. `server/src/jobs/cronJobs.js:168`

Missing:
1. Daily digest.
2. Fraud batch scoring.
3. Cache invalidation jobs.
4. Report auto-resolution jobs.

### 3.11 Fraud/risk engine maturity (~60%)
Evidence:
1. `server/src/services/riskEngine.js:19`
2. `server/src/middleware/fraudCheck.js:74`

Missing:
1. Model-assisted anomaly scoring.
2. Image risk and behavior signals.
3. Manual review queue and risk reason normalization.

### 3.12 Admin moderation dashboard depth (~70%)
Evidence:
1. `server/src/routes/adminDashboard.js:12`
2. `server/src/routes/adminDashboard.js:41`
3. `client/src/pages/AdminPanel.jsx:22`

Missing:
1. Bulk actions.
2. Advanced filter/sort.
3. CSV exports.
4. Role-specific dashboard variants.

---

## 4) Extra Gaps Confirmed

1. `server/src/controllers/rewardController.js` is empty.
2. `server/src/routes/admin.js:14` still has placeholder `/users`.
3. Push path is placeholder in `server/src/services/fcm.js:32`.
4. Offers page exists but not mounted in `client/src/App.jsx`.
5. Docs mention `riskEngineService.js`, but actual file is `server/src/services/riskEngine.js`.

---

## 5) Detailed Implementation Blueprint for the Top 6

## 5.1 Payment Automation (P0)

Build:
1. Add `POST /api/payments/webhook` with provider signature verification.
2. Introduce payment state machine:
`created -> submitted -> processing -> verified | failed | refunded`.
3. Add idempotency key on payment submit and webhook events.
4. Add duplicate fingerprint:
`hash(transaction_id, amount, payer_handle, timestamp_bucket)`.
5. Queue OCR extraction for screenshots (async worker).
6. Add retry policy with exponential backoff and dead-letter queue.
7. Add refund table + reconciliation job + admin actions.

Definition of done:
1. >95% payments auto-verified.
2. <5% routed to manual queue.
3. Reconciliation mismatch rate <0.2%.

## 5.2 OTP Delivery Hardening (P0)

Build:
1. Create `OtpProvider` abstraction:
`sendSms`, `sendEmailFallback`, `getDeliveryStatus`.
2. Replace OTP console logs and payload leakage.
3. Store hashed OTP and expiry only.
4. Add resend limit, phone/device/IP rate controls.
5. Add delivery callback ingestion and provider health metrics.
6. Use same service for auth and sale confirmation flows.

Definition of done:
1. Delivery success >99.5% within 30 seconds.
2. Abuse-triggered OTP sends reduced via throttling.

## 5.3 KYC Automation (P0)

Build:
1. OCR queue worker extracts doc fields.
2. Rule engine validates format + cross-field consistency.
3. Confidence score outputs:
`auto_approve`, `manual_review`, `auto_reject`.
4. Add expiry extraction and reminder notifications.
5. Add optional face match on high-risk or random sample.
6. Build reviewer queue sorted by risk and SLA.

Definition of done:
1. Auto decision rate >70% with bounded error.
2. Median review decision time <5 minutes for auto-approved cases.

## 5.4 Complaints Workflow Completion (P1)

Build:
1. Add `POST /api/complaints` with evidence attachment metadata.
2. Add lifecycle:
`open -> triage -> investigating -> resolved | rejected -> closed`.
3. Add `PATCH /api/complaints/:id/status` with audit logs.
4. Implement SLA job:
escalate unresolved high-severity complaints.
5. Replace mocked frontend timeout with real API integration.

Definition of done:
1. 100% complaint submissions persisted.
2. SLA breach alerts active.

## 5.5 Reviews End-to-End Wiring (P1)

Build:
1. Add reviews routes and mount in `server/src/index.js`.
2. Create `client/src/pages/Reviews.jsx` and review form/list views.
3. Add seller response endpoint + moderation flag endpoint.
4. Keep verified-purchase guard for posting.
5. Add anti-spam protections and cooldown windows.

Definition of done:
1. Users can submit, view, and moderate reviews through UI.
2. Seller response and helpful-vote paths functional.

## 5.6 Admin Dashboard Alignment (P1)

Build:
1. Align backend payload shape with `AdminPanel.jsx` expectations.
2. Add server-side filter/sort/pagination.
3. Add bulk actions and CSV export as async jobs.
4. Add role-based views: moderator, risk, ops, superadmin.
5. Replace placeholder admin `/users` route with real API.

Definition of done:
1. Dashboard supports high-volume moderation workflows.
2. Export and bulk actions complete with audit logs.

---

## 6) Best Way to Implement for 1M and 10M Users

## 6.1 Architecture Strategy

At 1M:
1. Modular monolith + async workers is enough.
2. Redis queue (BullMQ) for OCR, OTP, webhooks, digests.
3. PostgreSQL primary + read replicas + Redis cache.

At 10M:
1. Keep core transactional APIs on Postgres but move heavy async to Kafka/RabbitMQ.
2. Partition high-write tables monthly (`transactions`, `notifications`, `audit_logs`, `complaints`).
3. Move analytical queries to OLAP store (ClickHouse/BigQuery).
4. Separate moderation, risk, and notification workers by queue partition.

## 6.2 Reliability Controls (Both Scales)

1. Idempotency for all write APIs.
2. Outbox pattern for notifications/webhooks/messages.
3. Distributed locks for cron jobs to avoid duplicate execution.
4. Dead-letter queues + replay tooling.
5. Feature flags and canary rollout for risky flows.

## 6.3 Performance Targets

1. P95 read latency <300 ms.
2. P95 write latency <500 ms.
3. Worker success rate >99.9%.
4. OTP callback visibility >99%.

---

## 7) 12-Week Consolidated Roadmap

### Phase 0 (Week 1): Platform hardening
1. Idempotency middleware.
2. Outbox events.
3. Queue infra and dead-letter setup.
4. Observability and alert baselines.

### Phase 1 (Weeks 2-4): Revenue and trust core
1. Payment webhook + auto-verification + retry/refund.
2. OTP provider integration and hardening.
3. KYC OCR + validation + reviewer queue.

### Phase 2 (Weeks 5-8): Safety and trust UX
1. Complaints real workflow.
2. Reviews end-to-end wiring.
3. Admin dashboard alignment and bulk tooling.

### Phase 3 (Weeks 9-12): Growth and scale optimization
1. Offers/inquiry advanced depth.
2. Referral leaderboard and redemption.
3. Fraud batch + queue and cache invalidation jobs.

---

## 8) Immediate Action Tickets (Open Now)

1. Add `POST /api/payments/webhook` and signature verification.
2. Implement `OtpProvider` and remove OTP leakage/logging.
3. Replace mocked complaint submit with persistent API.
4. Add and mount reviews routes and UI page.
5. Mount `Offers` route in `client/src/App.jsx`.
6. Replace `admin.js` placeholder `/users` with paginated admin endpoint.
7. Either implement or remove empty `rewardController.js`.
8. Replace `fcm.js` placeholder with live provider integration.

---

## 9) Success Metrics and Acceptance

### Product/Business
1. Auto-verified payments >95%.
2. OTP success >99.5% within 30s.
3. KYC median turnaround <5 min for auto-approved.
4. Complaint SLA compliance >95%.

### Engineering/Ops
1. Queue failure rate <0.1%.
2. Cron duplicate execution = 0.
3. Dashboard API P95 <500 ms.
4. Regression test pass rate >99%.

### Quality Bar (for each feature)
1. API contract documented.
2. Happy path and failure path tested.
3. Idempotency and retries validated.
4. Monitoring and alerts deployed.
5. Feature-flag rollback path available.

---

## 10) Team Model (Recommended)

If 2 developers:
1. Dev A: backend-critical (payments, OTP, KYC).
2. Dev B: frontend + admin + complaints + reviews integration.

If 3 developers:
1. Dev A: payments + otp + core infra.
2. Dev B: kyc + fraud + cron/worker systems.
3. Dev C: admin/reviews/complaints/offers UI and API alignment.

---

## 11) Final Notes

1. This is now the single source of truth combining both checklists.
2. Update this file at end of every sprint with:
status delta, metric delta, and new blockers.
3. Keep all references aligned with actual file names to avoid drift.


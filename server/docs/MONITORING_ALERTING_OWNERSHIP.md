# Monitoring, Alerting, and Runbook Ownership

Last updated: 2026-02-28
Primary owner: Platform Engineering
Status model: OPERATIONAL | COMPLETE | PENDING | BLOCKED

## Alert Ownership Matrix

| Domain | Alert Signal | Threshold | Owner | Exact Runbook Action |
|---|---|---|---|---|
| API reliability | `5xx_rate_percent` | >1% for 10m | Backend Lead | `docs/INCIDENT_RESPONSE.md` section 2 step 4, then section 4 "Deployment regression" step 1 rollback |
| API latency | `p95_ms` | >1200ms for 15m | Backend Lead | `docs/INCIDENT_RESPONSE.md` section 3 "API/Server" steps 1-4, then section 2 step 5 stabilize |
| Auth security | login failure ratio | >20% for 15m | Security Lead | `docs/INCIDENT_RESPONSE.md` section 4 "Token/session failures" steps 1-3 |
| Fraud rollout | challenge dropoff | >15% window | Trust Engineering | `server/docs/33_FLAG_ROLLOUT_OPERATIONAL_AUDIT.md` abort path, then `docs/INCIDENT_RESPONSE.md` section 2 step 5 toggle off flag |
| Active-active failover | region health divergence | sustained 3m | Platform Engineering | `server/docs/30_MULTI_REGION_FAILOVER_PLAYBOOK_DRAFT.md` failover sequence steps 1-5 and rollback sequence steps 1-4 |
| Failover safety gate | dependency gate or DB/queue gate != `COMPLETE` | any execute attempt | Platform Engineering + DB Engineering | run `npm run failover:active-active:dependency-gate` and `npm run failover:db-queue-audit`; resolve dependencies in `server/docs/34_MULTI_REGION_ACTIVE_ACTIVE_EXECUTION_BACKLOG.md` MR-001/MR-002 |
| Payments | reconciliation mismatch | >0.5% daily | Payments Owner | `docs/INCIDENT_RESPONSE.md` section 3 "Database" steps 1-3 + payments owner escalation |
| Readiness | `/api/ready` reports `not_ready` | sustained 5m | Platform Engineering | `docs/INCIDENT_RESPONSE.md` section 2 step 4 checks + readiness matrix command rerun |

## Weekly Verification Evidence

| Date | Owner | Scope | Status | Artifact |
|---|---|---|---|---|
| 2026-02-28 | Platform Engineering | Readiness matrix verification | COMPLETE | `server/docs/artifacts/readiness_probe_matrix_2026-02-28T04-39-50-002Z.json` |
| 2026-02-28 | Backend Lead | Load/limiter profile verification | COMPLETE | `server/tests/load/results/capacity_report_2026-02-28T04-39-36-639Z.json` |
| 2026-02-28 | Backend Lead | Authenticated read/write load verification | COMPLETE | `server/tests/load/results/capacity_report_2026-02-28T04-39-15-952Z.json` |
| 2026-02-28 | Trust Engineering | Fraud telemetry export verification | COMPLETE | `server/docs/artifacts/risk_telemetry_export_2026-02-28T04-35-51-718Z.json` |
| 2026-02-28 | Platform Engineering | Failover tabletop drill evidence | COMPLETE | `server/docs/artifacts/failover_tabletop_2026-02-28T04-40-00-718Z.json` |
| 2026-02-28 | Platform Engineering | Active-active staged execute simulation | COMPLETE | `server/docs/artifacts/active_active_orchestration_2026-02-28T04-34-16-803Z.json` |
| 2026-02-28 | Platform Engineering | Active-active dependency-gate output verification | COMPLETE | `server/docs/artifacts/active_active_dependency_gate_2026-02-28T05-39-10-441Z.json` |
| 2026-02-28 | Platform Engineering | Active-active safety-gate enforcement proof | COMPLETE | `server/docs/artifacts/active_active_orchestration_2026-02-28T05-39-10-475Z.json` |
| 2026-02-28 | Platform Engineering | DB/queue failover eligibility audit | COMPLETE | `server/docs/artifacts/failover_db_queue_audit_2026-02-28T04-34-28-871Z.json` |
| 2026-02-28 | Engineering | Validation matrix refresh | COMPLETE | `server/docs/TEST_VALIDATION.md` |

## Operational Rule
No alert row can remain OPERATIONAL without:
1. A dated verification row.
2. A concrete artifact path.
3. A directly mapped runbook action reference.


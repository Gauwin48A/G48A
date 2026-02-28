# Monitoring, Alerting, and Runbook Ownership

Last updated: 2026-02-28
Primary owner: Platform Engineering
Status model: OPERATIONAL | COMPLETE | PENDING | BLOCKED

## Alert Ownership Matrix

| Domain | Alert Signal | Threshold | Owner | Runbook Action |
|---|---|---|---|---|
| API reliability | `5xx_rate_percent` | >1% for 10m | Backend Lead | `docs/INCIDENT_RESPONSE.md` -> API degradation steps |
| API latency | `p95_ms` | >1200ms for 15m | Backend Lead | `docs/INCIDENT_RESPONSE.md` -> latency triage and rollback |
| Auth security | login failure ratio | >20% for 15m | Security Lead | `docs/INCIDENT_RESPONSE.md` -> auth abuse path |
| Fraud rollout | challenge dropoff | >15% window | Trust Engineering | `server/docs/33_FLAG_ROLLOUT_OPERATIONAL_AUDIT.md` abort rules |
| Payments | reconciliation mismatch | >0.5% daily | Payments Owner | payment incident section in runbook |
| Readiness | `/api/ready` not_ready | any sustained 5m | Platform Engineering | readiness dependency checklist |

## Weekly Verification Evidence

| Date | Owner | Scope | Status | Artifact |
|---|---|---|---|---|
| 2026-02-28 | Platform Engineering | Readiness matrix verification | COMPLETE | `server/docs/artifacts/readiness_probe_matrix_2026-02-28T03-21-08-731Z.json` |
| 2026-02-28 | Backend Lead | Load/limiter profile verification | COMPLETE | `server/tests/load/results/capacity_report_2026-02-28T03-25-53-753Z.json` |
| 2026-02-28 | Backend Lead | Authenticated read/write load verification | COMPLETE | `server/tests/load/results/capacity_report_2026-02-28T03-49-10-081Z.json` |
| 2026-02-28 | Trust Engineering | Fraud challenge telemetry + kill switch simulation | COMPLETE | `server/docs/artifacts/flag_rollout_simulation_2026-02-28T03-07-35-168Z.json` |
| 2026-02-28 | Platform Engineering | Failover tabletop drill evidence | COMPLETE | `server/docs/artifacts/failover_tabletop_2026-02-28T03-07-34-846Z.json` |
| 2026-02-28 | Engineering | Validation matrix refresh | COMPLETE | `server/docs/TEST_VALIDATION.md` |

## Operational Rule
No dashboard/alert row may stay OPERATIONAL without a dated evidence artifact and explicit runbook linkage.


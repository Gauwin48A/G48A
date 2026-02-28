# Load Test and Capacity Report

Date: 2026-02-28
Owner: Platform Engineering
Scope: legit traffic, abuse traffic, authenticated read/write profiles
Status model: OPERATIONAL | COMPLETE | PENDING | BLOCKED

## Commands
- `node tests/load/simple_load_runner.js --scenario both`
- `node tests/load/simple_load_runner.js --scenario full`

## Artifacts
- Target-mismatch detection baseline (external target, invalid for MHub routing): `server/tests/load/results/capacity_report_2026-02-28T06-41-29-977Z.json`
- Managed-server validated baseline (both): `server/tests/load/results/capacity_report_2026-02-28T07-04-49-736Z.json`
- Managed-server validated final (full): `server/tests/load/results/capacity_report_2026-02-28T07-05-48-844Z.json`

## Measurement Guardrail
Load runner now defaults to managed local MHub target (unless explicit base URL is provided) and validates target shape via `/health`, `/api/ready` (object `checks` with `db` + `requiredConfig`), and `/api/posts`. This prevents cross-service false artifacts when another app is bound to `127.0.0.1:5000`.

## Baseline vs Final Deltas (50k profile aggregate, managed-server only)

Method: averages of `p50/p95/p99` across 50k endpoints per scenario; `RPS` is endpoint-summed throughput; `429/5xx` are summed counts.

Comparison set: `07-04-49-736Z` -> `07-05-48-844Z`.

### Normal traffic
| Metric | Baseline | Final | Delta |
|---|---:|---:|---:|
| p50 (ms) | 212.64 | 102.54 | -110.10 |
| p95 (ms) | 272.10 | 145.02 | -127.08 |
| p99 (ms) | 296.03 | 172.80 | -123.23 |
| RPS (total across endpoints) | 1337.91 | 2313.23 | +975.32 |
| 429 count | 0 | 0 | 0 |
| 5xx count | 0 | 0 | 0 |

### Abuse traffic
| Metric | Baseline | Final | Delta |
|---|---:|---:|---:|
| p50 (ms) | 133.79 | 122.03 | -11.77 |
| p95 (ms) | 221.66 | 250.08 | +28.41 |
| p99 (ms) | 287.06 | 314.21 | +27.15 |
| RPS (total across endpoints) | 1880.98 | 3970.38 | +2089.40 |
| 429 count | 1800 | 1800 | 0 |
| 5xx count | 0 | 0 | 0 |

### Authenticated read/write traffic (final snapshot)
| Metric | Final |
|---|---:|
| p50 (ms) | 72.03 |
| p95 (ms) | 91.50 |
| p99 (ms) | 113.50 |
| RPS (total across endpoints) | 1645.67 |
| 429 count | 0 |
| 5xx count | 0 |

## Interpretation
1. Normal profile remains within KPI guardrails (`429=0`, `5xx=0`) at 50k.
2. Abuse profile keeps protection active (`429=1800` on public-wall at 50k) with `5xx=0`.
3. Authenticated read/write profile now validates end-to-end against managed MHub target (`429=0`, `5xx=0`).
4. Capacity artifacts generated before managed-target guardrail are retained only as mismatch evidence, not performance baseline truth.

## KPI Check
1. `5xx <= 0.5%` in normal load: PASS (`0.00%`).
2. Reduced unnecessary 429 in legitimate traffic: PASS (`429 normal 50k = 0`, `429 authenticated 50k = 0`).
3. Abuse defense retained: PASS (`429` remains under abuse 50k).

## Capacity Decision
Load/Limiter maturity remains COMPLETE for backend scope with corrected measurement integrity and managed-target evidence.

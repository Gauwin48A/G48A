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
- Managed-server validated baseline (both): `server/tests/load/results/capacity_report_2026-02-28T07-15-05-255Z.json`
- Managed-server validated final (full): `server/tests/load/results/capacity_report_2026-02-28T07-15-17-147Z.json`

## Measurement Guardrail
Load runner now defaults to managed local MHub target (unless explicit base URL is provided), validates target shape via `/health`, `/api/ready` (object `checks` with `db` + `requiredConfig`), and `/api/posts`, and supports managed-port fallback (`bootstrap-port` + range) for occupied/unstable ports.

## Baseline vs Final Deltas (50k profile aggregate, managed-server only)

Method: averages of `p50/p95/p99` across 50k endpoints per scenario; `RPS` is endpoint-summed throughput; `429/5xx` are summed counts.

Comparison set: `07-15-05-255Z` -> `07-15-17-147Z`.

### Normal traffic
| Metric | Baseline | Final | Delta |
|---|---:|---:|---:|
| p50 (ms) | 161.48 | 154.62 | -6.86 |
| p95 (ms) | 229.68 | 224.22 | -5.46 |
| p99 (ms) | 252.01 | 252.91 | +0.90 |
| RPS (total across endpoints) | 1678.88 | 1708.17 | +29.29 |
| 429 count | 0 | 0 | 0 |
| 5xx count | 0 | 0 | 0 |

### Abuse traffic
| Metric | Baseline | Final | Delta |
|---|---:|---:|---:|
| p50 (ms) | 135.58 | 142.42 | +6.83 |
| p95 (ms) | 258.58 | 264.81 | +6.22 |
| p99 (ms) | 365.00 | 308.62 | -56.38 |
| RPS (total across endpoints) | 1997.05 | 2056.83 | +59.78 |
| 429 count | 1800 | 1800 | 0 |
| 5xx count | 0 | 0 | 0 |

### Authenticated read/write traffic (final snapshot)
| Metric | Final |
|---|---:|
| p50 (ms) | 36.92 |
| p95 (ms) | 62.66 |
| p99 (ms) | 74.17 |
| RPS (total across endpoints) | 3136.19 |
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

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
- Managed-server validated baseline (both): `server/tests/load/results/capacity_report_2026-02-28T06-45-36-850Z.json`
- Managed-server validated final (full): `server/tests/load/results/capacity_report_2026-02-28T06-47-18-177Z.json`

## Measurement Guardrail
Load runner now auto-bootstraps a managed local MHub server when default target probes fail (`/health` or `/api/posts` mismatch). This prevents cross-service false artifacts when another app is bound to `127.0.0.1:5000`.

## Baseline vs Final Deltas (50k profile aggregate, managed-server only)

Method: averages of `p50/p95/p99` across 50k endpoints per scenario; `RPS` is endpoint-summed throughput; `429/5xx` are summed counts.

Comparison set: `06-45-36-850Z` -> `06-47-18-177Z`.

### Normal traffic
| Metric | Baseline | Final | Delta |
|---|---:|---:|---:|
| p50 (ms) | 204.10 | 203.38 | -0.72 |
| p95 (ms) | 245.56 | 237.69 | -7.87 |
| p99 (ms) | 267.17 | 251.14 | -16.03 |
| RPS (total across endpoints) | 1347.44 | 1333.61 | -13.83 |
| 429 count | 0 | 0 | 0 |
| 5xx count | 0 | 0 | 0 |

### Abuse traffic
| Metric | Baseline | Final | Delta |
|---|---:|---:|---:|
| p50 (ms) | 143.43 | 144.26 | +0.83 |
| p95 (ms) | 224.01 | 240.97 | +16.97 |
| p99 (ms) | 293.25 | 293.75 | +0.51 |
| RPS (total across endpoints) | 1747.30 | 1707.20 | -40.10 |
| 429 count | 1800 | 1800 | 0 |
| 5xx count | 0 | 0 | 0 |

### Authenticated read/write traffic (final snapshot)
| Metric | Final |
|---|---:|
| p50 (ms) | 68.53 |
| p95 (ms) | 93.44 |
| p99 (ms) | 106.75 |
| RPS (total across endpoints) | 1713.90 |
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

# Load Test and Capacity Report

Date: 2026-02-28
Owner: Platform Engineering
Scope: legit traffic, abuse traffic, authenticated read/write profiles
Status model: OPERATIONAL | COMPLETE | PENDING | BLOCKED

## Commands
- `node tests/load/simple_load_runner.js --scenario both`
- `node tests/load/simple_load_runner.js --scenario full`

## Artifacts
- Baseline pre-limiter-fix (full): `server/tests/load/results/capacity_report_2026-02-28T05-48-31-110Z.json`
- Intermediate post-limiter-fix (full): `server/tests/load/results/capacity_report_2026-02-28T05-55-55-973Z.json`
- Final post-auth-optimization (both): `server/tests/load/results/capacity_report_2026-02-28T06-09-25-345Z.json`
- Final post-auth-optimization (full): `server/tests/load/results/capacity_report_2026-02-28T06-08-26-697Z.json`

## Baseline vs Final Deltas (50k profile aggregate, full scenario)

Method: averages of `p50/p95/p99` across 50k endpoints per scenario; `RPS` is endpoint-summed throughput; `429/5xx` are summed counts.

Comparison set: `05-55-55-973Z` -> `06-08-26-697Z`.

### Normal traffic
| Metric | Baseline | Final | Delta |
|---|---:|---:|---:|
| p50 (ms) | 191.12 | 215.08 | +23.96 |
| p95 (ms) | 241.15 | 259.75 | +18.60 |
| p99 (ms) | 262.01 | 271.32 | +9.31 |
| RPS (total across endpoints) | 1503.16 | 1340.41 | -162.75 |
| 429 count | 0 | 0 | 0 |
| 5xx count | 0 | 0 | 0 |

### Abuse traffic
| Metric | Baseline | Final | Delta |
|---|---:|---:|---:|
| p50 (ms) | 138.17 | 145.69 | +7.51 |
| p95 (ms) | 236.51 | 250.13 | +13.62 |
| p99 (ms) | 266.54 | 330.69 | +64.16 |
| RPS (total across endpoints) | 1845.97 | 1672.32 | -173.65 |
| 429 count | 1800 | 1800 | 0 |
| 5xx count | 0 | 0 | 0 |

### Authenticated read/write traffic
| Metric | Baseline | Final | Delta |
|---|---:|---:|---:|
| p50 (ms) | 136.24 | 58.37 | -77.86 |
| p95 (ms) | 177.52 | 75.27 | -102.25 |
| p99 (ms) | 195.19 | 89.51 | -105.68 |
| RPS (total across endpoints) | 1010.98 | 2080.09 | +1069.11 |
| 429 count | 0 | 0 | 0 |
| 5xx count | 0 | 0 | 0 |

## Interpretation
1. Normal profile stays within KPI guardrails (`429=0`, `5xx=0`) in latest runs.
2. Abuse pressure still triggers throttling at 50k (`429=1800`) and remains protected.
3. Authenticated path improved materially after JWT cache + `/auth/me` query collapse (p95/p99 and RPS improved).
4. `5xx` remained `0` across all measured 50k scenarios.

## KPI Check
1. `5xx <= 0.5%` in normal load: PASS (`0.00%`).
2. Reduced unnecessary 429 in legitimate traffic: PASS (`429 normal 50k = 0`, `429 authenticated 50k = 0`).
3. Abuse defense retained: PASS (`429` still present under abuse 50k).

## Capacity Decision
Load/Limiter maturity target remains COMPLETE for current backend scope; next iteration should reduce abuse-path p99 while preserving `normal 429=0` and `normal 5xx=0`.

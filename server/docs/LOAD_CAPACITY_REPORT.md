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
- Final post-limiter-fix (both): `server/tests/load/results/capacity_report_2026-02-28T05-54-30-958Z.json`
- Final post-limiter-fix (full): `server/tests/load/results/capacity_report_2026-02-28T05-55-55-973Z.json`

## Baseline vs Final Deltas (50k profile aggregate, full scenario)

Method: averages of `p50/p95/p99` across 50k endpoints per scenario; `RPS` is endpoint-summed throughput; `429/5xx` are summed counts.

### Normal traffic
| Metric | Baseline | Final | Delta |
|---|---:|---:|---:|
| p50 (ms) | 296.60 | 191.12 | -105.48 |
| p95 (ms) | 482.11 | 241.15 | -240.96 |
| p99 (ms) | 553.90 | 262.01 | -291.90 |
| RPS (total across endpoints) | 873.49 | 1503.16 | +629.67 |
| 429 count | 3802 | 0 | -3802 |
| 5xx count | 0 | 0 | 0 |

### Abuse traffic
| Metric | Baseline | Final | Delta |
|---|---:|---:|---:|
| p50 (ms) | 104.67 | 138.17 | +33.50 |
| p95 (ms) | 146.36 | 236.51 | +90.15 |
| p99 (ms) | 183.89 | 266.54 | +82.65 |
| RPS (total across endpoints) | 2254.78 | 1845.97 | -408.81 |
| 429 count | 4800 | 1800 | -3000 |
| 5xx count | 0 | 0 | 0 |

### Authenticated read/write traffic
| Metric | Baseline | Final | Delta |
|---|---:|---:|---:|
| p50 (ms) | 45.92 | 136.24 | +90.31 |
| p95 (ms) | 71.74 | 177.52 | +105.78 |
| p99 (ms) | 80.37 | 195.19 | +114.82 |
| RPS (total across endpoints) | 2505.43 | 1010.98 | -1494.45 |
| 429 count | 5400 | 0 | -5400 |
| 5xx count | 0 | 0 | 0 |

## Interpretation
1. Normal profile false-positive throttling was removed in this pass (`429: 3802 -> 0` at 50k).
2. Abuse pressure still triggers throttling at 50k (`429: 1800`) and remains protected.
3. Authenticated traffic moved from fast-reject (`429`) to real work execution; this increases latency but removes auth-path saturation.
4. `5xx` remained `0` across all measured 50k scenarios.

## KPI Check
1. `5xx <= 0.5%` in normal load: PASS (`0.00%`).
2. Reduced unnecessary 429 in legitimate traffic: PASS (`429 normal 50k = 0`).
3. Abuse defense retained: PASS (`429` still present under abuse 50k).

## Capacity Decision
Load/Limiter maturity target is COMPLETE for current backend scope; next iteration should target authenticated-tail latency optimization while keeping `429=0` for normal and `5xx=0` overall.

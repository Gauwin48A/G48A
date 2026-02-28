# Load Test and Capacity Report

Date: 2026-02-28
Owner: Platform Engineering
Scope: legit traffic, abuse traffic, and authenticated read/write profiles
Status model: OPERATIONAL | COMPLETE | PENDING | BLOCKED

## Commands
- Split profile run:
  - `node tests/load/simple_load_runner.js --base-url http://127.0.0.1:5055 --timeout-ms 5000 --scenario both`
- Extended authenticated/write run:
  - `node tests/load/simple_load_runner.js --base-url http://127.0.0.1:5055 --timeout-ms 5000 --scenario full`

## Artifacts
- Baseline split profile: `server/tests/load/results/capacity_report_2026-02-28T03-25-53-753Z.json`
- Final split profile: `server/tests/load/results/capacity_report_2026-02-28T04-39-36-639Z.json`
- Baseline authenticated profile: `server/tests/load/results/capacity_report_2026-02-28T03-49-10-081Z.json`
- Final authenticated profile: `server/tests/load/results/capacity_report_2026-02-28T04-39-15-952Z.json`

## Baseline vs Final Deltas (50k profile aggregate)

### Normal traffic
| Metric | Baseline | Final | Delta |
|---|---:|---:|---:|
| p50 (ms) | 73.99 | 73.28 | -0.71 |
| p95 (ms) | 96.97 | 85.82 | -11.15 |
| p99 (ms) | 124.53 | 95.98 | -28.55 |
| RPS (total across endpoints) | 4249.91 | 4131.18 | -118.73 |
| 429 count | 0 | 0 | 0 |
| 5xx count | 0 | 0 | 0 |

### Abuse traffic
| Metric | Baseline | Final | Delta |
|---|---:|---:|---:|
| p50 (ms) | 21.28 | 27.26 | +5.98 |
| p95 (ms) | 55.27 | 33.21 | -22.06 |
| p99 (ms) | 83.64 | 38.31 | -45.33 |
| RPS (total across endpoints) | 10174.52 | 8712.57 | -1461.95 |
| 429 count | 4550 | 4800 | +250 |
| 5xx count | 0 | 0 | 0 |

### Authenticated read/write traffic
| Metric | Baseline | Final | Delta |
|---|---:|---:|---:|
| p50 (ms) | 256.76 | 44.80 | -211.96 |
| p95 (ms) | 613.91 | 55.25 | -558.66 |
| p99 (ms) | 720.57 | 61.98 | -658.59 |
| RPS (total across endpoints) | 642.39 | 3162.45 | +2520.06 |
| 429 count | 0 | 0 | 0 |
| 5xx count | 0 | 0 | 0 |

## KPI Interpretation
1. `5xx <= 0.5%` under normal load: PASS (`0.00%`).
2. Unnecessary 429 saturation in normal profile: PASS (`0.00%`, unchanged at zero).
3. Abuse protection retained: PASS (high-throttle behavior preserved under concentrated traffic).
4. Authenticated write-path tail latency: PASS (p95/p99 improved materially vs baseline).

## Capacity Decision
Load/Limiter maturity target is COMPLETE for current backend scope. Next step is live multi-region failover load validation once external infra dependencies are available.

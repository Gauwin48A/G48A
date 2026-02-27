# Load Test and Capacity Report

Date: 2026-02-27  
Owner: Platform Engineering  
Scope: API read-heavy baseline (`/health`, `/api/posts`, `/api/public-wall`)

## 1. Tooling Added

- Load runner: `server/tests/load/simple_load_runner.js`
- NPM commands:
  - `npm run load:test:dry-run`
  - `npm run load:test`
- Output folder:
  - `server/tests/load/results/`

## 2. User-Scale Profiles

| Profile | Simulated Users | Concurrent Workers | Total Requests |
|---|---:|---:|---:|
| 1k | 1,000 | 10 | 200 |
| 10k | 10,000 | 30 | 800 |
| 50k | 50,000 | 80 | 2,400 |

## 3. Latest Evidence

- Dry-run execution command:
  - `npm run load:test:dry-run`
- Evidence artifact:
  - `server/tests/load/results/capacity_report_2026-02-27T11-53-41-235Z.json`

Dry-run confirms:
1. 1k/10k/50k profiles are codified and versioned.
2. Endpoint coverage and timeout settings are exported as machine-readable evidence.
3. Report generation pipeline is ready for staging/production live runs.

## 4. Live Run Procedure

1. Start target environment and set:
   - `LOAD_TEST_BASE_URL=http://<target-host>`
2. Execute:
   - `npm run load:test`
3. Attach generated JSON report to this document with date.
4. Record p95/p99 latency, failure ratio, and throughput by profile.

## 5. Capacity Gate Targets

| Profile | p95 Target | Error Rate Target | Throughput Target |
|---|---|---|---|
| 1k | `< 300ms` | `< 0.5%` | `>= 150 rps` |
| 10k | `< 700ms` | `< 1.0%` | `>= 400 rps` |
| 50k | `< 1200ms` | `< 2.0%` | `>= 900 rps` |

## 6. Bottleneck Mitigation Plan

1. If p95 exceeds target: enable deeper caching on read endpoints.
2. If error rate exceeds target: scale API replicas and tune DB pool sizing.
3. If throughput lags: split hot endpoints and isolate heavy queries behind cache/queue.

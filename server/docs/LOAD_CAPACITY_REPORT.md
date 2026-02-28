# Load Test and Capacity Report

Date: 2026-02-28
Owner: Platform Engineering
Scope: read-heavy baseline (`/health`, `/api/posts`, `/api/public-wall`)

## Commands
- Baseline artifact command:
  - `node tests/load/simple_load_runner.js --base-url http://127.0.0.1:5055 --timeout-ms 4000`
- Tuned split-profile command:
  - `node tests/load/simple_load_runner.js --base-url http://127.0.0.1:5055 --timeout-ms 5000 --scenario both`
- Extended auth + write-burst command:
  - `node tests/load/simple_load_runner.js --base-url http://127.0.0.1:5055 --timeout-ms 5000 --scenario full`

## Artifacts
- Baseline: `server/tests/load/results/capacity_report_2026-02-27T18-50-27-835Z.json`
- Final tuned run (`both`): `server/tests/load/results/capacity_report_2026-02-28T03-25-53-753Z.json`
- Extended run (`full`): `server/tests/load/results/capacity_report_2026-02-28T03-49-10-081Z.json`

## Headline Outcomes
1. Normal traffic profile after limiter tuning:
- 429: `0`
- 5xx: `0`
- Failure rate: `0.00%`
2. Abuse profile after limiter tuning:
- 429: `6050`
- 5xx: `0`
- Failure rate: `59.31%`
3. Protection objective preserved: abusive concentration is throttled while legitimate distribution is served.
4. Authenticated read/write scenario:
- `/api/auth/me`: 0 failures across profiles.
- `/api/auth/validate`: 0 failures across profiles.
- `/api/posts/batch-view` (write burst): 0 failures across profiles, with expected higher p95 at 50k profile.

## Baseline vs Final Deltas
- Baseline (single profile) had 7200 throttled requests (all 429) and 0 5xx.
- Final normal profile reduced 429 from 7200 to 0.
- Final normal profile improved latency and throughput:
  - p50: `68.17 -> 42.48` ms
  - p95: `93.00 -> 60.97` ms
  - p99: `139.67 -> 118.15` ms
  - avgRPS: `521.60 -> 1018.28`
- Final all-scenario aggregate improved throughput (`avgRPS +1352.38`) with unchanged 5xx rate (`0.00%`).

## KPI Interpretation
- 5xx <= 0.5% under defined synthetic load: PASS (`0.00%`).
- Reduced unnecessary 429 saturation in normal traffic: PASS.
- Abuse protection retained: PASS.

## Capacity Note
Current limiter settings are tuned for fairness under distributed legitimate load and strict control under concentrated abuse. Next optimization should target p95/p99 for normal 50k profile without relaxing abuse thresholds.


# Load Test and Capacity Report

Date: 2026-02-28
Owner: Platform Engineering
Scope: read-heavy baseline (`/health`, `/api/posts`, `/api/public-wall`)

## Tooling
- Load runner: `server/tests/load/simple_load_runner.js`
- Commands:
  - `npm run load:test:dry-run`
  - `npm run load:test`

## Latest Live Evidence
- Command:
  - `node tests/load/simple_load_runner.js --base-url http://127.0.0.1:5055 --timeout-ms 4000`
- Artifact:
  - `server/tests/load/results/capacity_report_2026-02-27T18-50-27-835Z.json`

## Headline Results
- 1k profile: 0 failures across all endpoints.
- 10k profile: 0 failures across all endpoints.
- 50k profile: 429 throttling on all endpoints (expected due limiter), 0 observed 5xx.
- Aggregate observed 5xx ratio: 0.00%.

## Interpretation
1. Backend remains stable under high synthetic concurrency (no 5xx in this run).
2. Limiter policy currently protects system by aggressively throttling at 50k profile.
3. Next performance step is staged limiter tuning to balance throughput vs abuse defense.

## Capacity Gate Snapshot
| Gate | Result |
|---|---|
| Non-dry-run artifact present | PASS |
| Reproducible command recorded | PASS |
| 5xx <= 0.5% | PASS |
| 50k profile fully served without throttle | WARN (blocked by current limiter policy) |

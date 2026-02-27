# Performance Guide

Last updated: 2026-02-27
Status: BASELINE OPERATIONAL

## Implemented Performance Controls
- API compression middleware enabled.
- Query path optimization on core routes/controllers.
- Hot-path DB index migration added for feed/channel/inquiry/payment paths.
- Frontend chat and cache update in-flight guards added.

## Validation Commands
- `npm run test:critical-paths`
- `npm test -- tests/integration.test.js tests/server.test.js`
- `npm run load:test:dry-run`

## Current Notes
- Baseline test and build validation passes.
- Live staging load evidence should continue to be appended under `tests/load/results`.

## Pending Enhancements
- Add automated performance budget checks in CI.
- Expand live load testing cadence beyond dry-run profile generation.

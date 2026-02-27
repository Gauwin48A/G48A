# Test Cases (Current Baseline)

Last updated: 2026-02-27

## Critical Server Flows
- Auth: signup/login/me.
- Post: create/list.
- Payment: submit + webhook verification + reconciliation path.
- Chat: thread/message/history.
- WAF: SQLi/XSS/geo/login-limit enforcement.

## Client Flows
- Build and runtime smoke checks.
- Core test suite execution.

## Executed Commands (Reference)
- `npm run test:waf`
- `npm run test:critical-paths`
- `npm test -- tests/integration.test.js tests/server.test.js`
- `npm run test:e2e:journeys`
- `npm test` (client)
- `npm run build` (client)

## Result
- Current baseline: PASS.

## Remaining Test Expansion Areas
- Broader UI regression automation.
- Performance budget enforcement tests.

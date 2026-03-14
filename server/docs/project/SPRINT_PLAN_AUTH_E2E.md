# Authentication E2E Sprint Plan

Date: 2026-03-14  
Owner: Engineering  
Scope: Backend + Frontend auth hardening, session resilience, UX correctness, and operational readiness.

## Goals
- Eliminate fragile auth states (stale token loops, noisy unauthorized boot, inconsistent session detection).
- Strengthen session lifecycle control (issue, rotate, revoke, inspect) end to end.
- Improve security posture without breaking existing user flows.
- Add measurable validation (tests + runtime checks) per phase.

## Non-Goals
- No AI-based auth scoring changes in this sprint.
- No breaking redesign of existing auth APIs used by mobile/web clients.
- No infra expansion beyond current runtime stack.

## Status Summary
- Sprint A: COMPLETE
- Sprint B: COMPLETE (pending verification)
- Sprint C: COMPLETE (pending verification)
- Sprint D: COMPLETE (pending verification)
- Sprint E: IN PROGRESS (rollout + operability; signoff pending)

## Baseline (Already Present)
- Access + refresh token model with cookie support.
- CSRF token endpoint and mutation protection.
- Auth anomaly throttles and adaptive MFA hooks.
- Session listing/revocation APIs.
- Route-aware auth-event redirection in client.

## Sprint Breakdown

### Sprint A - Session Bootstrap Reliability (Complete)
Objective: Remove startup auth ambiguity and reduce unnecessary unauthorized retries.

Planned:
- Add explicit `GET /api/auth/session` bootstrap endpoint.
- Add optional auth middleware in security layer for non-breaking anonymous session checks.
- Return normalized auth bootstrap payload:
  - `authenticated`
  - `authState`
  - `hasRefreshCookie`
  - `hasAccessCookie`
  - `user` claims when available
- Update client auth bootstrap flow to use session endpoint before refresh/me chain.

Acceptance:
- Cold boot as logged-out user must not trigger avoidable `/auth/me` 401 noise.
- Cold boot as logged-in user must recover state without manual refresh.

### Sprint B - Token Lifecycle Hardening (Complete, pending verification)
Objective: Tighten token handling and edge-case consistency.

Planned:
- Enforce consistent token-source precedence and state labeling.
- Add explicit invalid-token and revoked-token bootstrap state handling.
- Improve refresh retry guardrails to prevent duplicated refresh storms.

Acceptance:
- No duplicate refresh race under concurrent protected calls.
- Session-expired and revoked flows are deterministic.

Progress update (2026-03-11):
- Added explicit bootstrap fields `canRefresh` and `requiresReauth` to `GET /api/auth/session`.
- Updated AuthContext bootstrap to short-circuit terminal auth states (`revoked`, `password_changed`, `invalid_token`).
- Added refresh-failure backoff + auth redirect cooldown in API interceptor to avoid repeated refresh/redirect storms.
- Added login challenge contract handling (`requireOtp` / challenge codes) in AuthContext.

### Sprint C - UX + Security Controls (Complete, pending verification)
Objective: Make auth behavior user-clear and operator-debuggable.

Planned:
- Improve login/session error mapping for actionable user messages.
- Add frontend auth diagnostics hooks for safe debugging in development.
- Keep security-safe generic responses in production.

Acceptance:
- End users see clear next action on auth failure.
- Debug logs remain behind explicit flags.

Progress update (2026-03-11):
- Added shared auth error mapper with security-safe messaging and category classification.
- Added dev-safe auth diagnostics channel (`window.__MHUB_AUTH_DIAG__`) with redacted payload logging.
- Wired diagnostics and mapped auth errors into API interceptor and AuthContext login/signup/bootstrap paths.

### Sprint D - Testing + Regression Shield (Complete, pending verification)
Objective: Protect auth path from future regressions.

Planned:
- Add middleware and controller tests for session bootstrap contract.
- Add client auth bootstrap behavior tests (logged out vs refresh-cookie vs authenticated).
- Add regression checklist for release gate.

Acceptance:
- Targeted auth tests pass in CI/local.
- Contract checks validate new endpoint shape.

Progress update (2026-03-12):
- Added `RequireAuth` component regression tests to cover redirect + loading behavior.
Progress update (2026-03-14):
- Added AuthContext bootstrap tests for `/auth/session` fallbacks and reauth handling.
- Added server session-status tests for terminal auth states.

### Sprint E - Operability & Rollout (Pending)
Objective: Safe rollout with observability and rollback path.

Planned:
- Add rollout notes and quick rollback instructions.
- Document env toggles and fallback behavior.
- Add post-deploy verification checklist.
- Close auth hardening exit criteria in MD_IMPLEMENTATION_MASTER_CHECKLIST.
- Normalize AUTH_README into done/now/deferred tracker with owner/status/proof.

Acceptance:
- One-command verification path after deployment.
- Clear rollback steps with zero schema risk.

Rollout checklist:
- Run `npm run auth:verify` (optionally set `AUTH_VERIFY_TOKEN` for authenticated checks).
- Verify `/api/auth/session` returns expected payload for anonymous and authenticated requests.
- Confirm CSRF cookie is set by `/api/auth/csrf-token` and refresh flow succeeds once.
- Validate `/api/auth/sessions` list and revoke endpoints for an authenticated user.
- Confirm client bootstrap completes without 401 loops (login -> refresh -> logout path).

Rollback notes:
- If `/api/auth/session` is misbehaving, temporarily return `404` for that route to force the client fallback path.
- Roll back to the previous server and client build if auth errors spike.
- Revoke active sessions only if required to contain a bad token rollout.

## Execution Order (Strict)
1. Sprint A backend contract.
2. Sprint A frontend bootstrap consumption.
3. Sprint D tests for Sprint A.
4. Sprint B/C iterative hardening.
5. Sprint E rollout checklist.

## Risks and Mitigations
- Risk: Existing flows depend on implicit 401 bootstrapping.
  - Mitigation: Keep refresh + `/auth/me` fallback path intact.
- Risk: Token claim shape variance.
  - Mitigation: Normalize user id with multi-claim fallback (`userId`, `id`, `user_id`, `sub`).
- Risk: Auth status drift across docs (AUTH_README vs sprint plan).
  - Mitigation: Normalize AUTH_README and keep one canonical tracker.
- Risk: Dirty worktree side effects.
  - Mitigation: Limit edits to auth-specific files and avoid unrelated rewrites.

## Deliverables for Current Run
- [x] `GET /api/auth/session` endpoint (backend)
- [x] optional auth middleware in security layer
- [x] AuthContext bootstrap refactor to use session endpoint
- [x] tests for session bootstrap middleware/controller behavior
- [x] this sprint plan document
- [x] session bootstrap contract flags for deterministic refresh vs reauth
- [x] interceptor backoff/cooldown guardrails for refresh/redirect storms
- [x] AuthContext login challenge handling for adaptive MFA/risk flow
- [x] shared auth error mapping for UX-safe actionable messages
- [x] dev diagnostics hook for auth lifecycle debugging with sensitive-field redaction
- [x] client bootstrap tests for `/auth/session` success, reauth, and 404 fallback
- [x] server session-status terminal-state regression tests

## Sprint E Checklist
- [ ] Publish rollout checklist and rollback notes with owner signoff.
- [x] Run auth bootstrap/refresh/revoke test suites and confirm no open-handle warnings. (2026-03-14: `npm run test:auth:integration`)
- [x] Confirm post-deploy verification path and update release gate docs. (2026-03-14: release checklist updated with `npm run auth:verify` + auth integration suite)
- [x] Normalize AUTH_README into done/now/deferred tracker with owner/status/proof.

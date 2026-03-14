# MHub Sprint Plan (Week 1 to Week 10)

Last updated: March 11, 2026
Owner: Product + Client + Server
Execution mode: Phase-wise, measurable gates, production-first

> Canonical phased plan: `SPRINT_PLAN_PHASED.md`. This week-based plan is retained for history and detailed scope.

## 1. Goal

Ship a stable, responsive, multilingual marketplace with hardened auth, predictable performance, and release-grade QA in 10 weeks.

## 2. Rules

- No feature closes without test + UX + performance validation.
- Mobile-first UX quality is mandatory for every UI change.
- Translation quality is measured by coverage and switch latency, not just key existence.
- Every phase has explicit exit criteria.

## 3. Phase Timeline

| Week | Phase | Focus | Status |
|---|---|---|---|
| 1 | Phase 1 | UI stabilization (mobile navbar + action rows) | Completed |
| 2 | Phase 2 | i18n completion + language-switch speed | Completed |
| 3 | Phase 3 | Auth hardening (session, token, route guards) | In Progress |
| 4 | Phase 4 | Marketplace flow correctness (search/filter/save/cart) | In Progress |
| 5 | Phase 5 | Rewards + referral reliability and UX | Planned |
| 6 | Phase 6 | Performance pass (bundle/API/render) | Planned |
| 7 | Phase 7 | Security hardening and abuse controls | Planned |
| 8 | Phase 8 | QA automation and regression shields | Planned |
| 9 | Phase 9 | Release readiness and cutover drills | Planned |
| 10 | Phase 10 | Post-launch optimization and metrics loop | Planned |

## 4. Phase Details

### Phase 1 - UI Stabilization (Week 1)

Scope:
- Mobile top navbar spacing, hierarchy, and touch targets.
- Post action rows to single-line behavior in narrow widths.
- Menu consistency (top/bottom/drawer responsibilities).

Deliverables:
- Responsive navbar polish across mobile/tablet/desktop.
- Single-line post action row behavior for common breakpoints.
- No accidental feature disappearance in nav.

Exit criteria:
- No overlap/clipping at 320px/360px/390px/768px widths.
- Lighthouse mobile accessibility >= 90 on core routes.
- Manual UX QA pass complete on `AllPosts`, `Feed`, `MyFeed`, `Profile`.

### Phase 2 - Localization + Language Performance (Week 2)

Scope:
- Full text localization for audited pages.
- Runtime translation cache and switch-path optimization.
- Remove "half-translated" experiences on dynamic pages.

Deliverables:
- Translation coverage report for core pages.
- Fast switch behavior with cache-first rendering.
- Protected UI chrome from unnecessary runtime auto-translation scans.

Exit criteria:
- 100% key coverage on: `AllPosts`, `Feed`, `MyFeed`, `Profile`, `Rewards`, `Support`, `MyHome`.
- Language switch visually updates shell immediately; dynamic content catches up via cache path.
- No i18n init warnings in console.

### Phase 3 - Auth Hardening (Week 3)

Scope:
- Token/session lifecycle consistency.
- Unauthorized handling and route guard reliability.
- Session revoke and diagnostics UX.

Deliverables:
- Unified auth error mapper applied app-wide.
- Stable `/api/auth/me` behavior and graceful 401 flow.
- Session diagnostics in auth context and logs.

Exit criteria:
- No auth loops after token expiry.
- Protected routes redirect predictably with return path.
- Auth integration tests pass for login/logout/session-check flows.

### Phase 4 - Marketplace Flow Correctness (Week 4)

Scope:
- Search/filter in navbar -> AllPosts synchronization.
- Save/wishlist/cart state consistency across pages.
- De-dup actions (avoid repeated add/save noise).

Deliverables:
- Shared state sync contracts for filters and saved posts.
- Visual selected-state behavior for save/cart actions.
- Regression tests on search/filter/save/cart.

Exit criteria:
- Same post state reflects identically on all surfaces.
- Filtered results deterministic for same query.
- No duplicate save/cart server writes on repeated clicks.

### Phase 5 - Rewards + Referral Reliability (Week 5)

Scope:
- Rewards UI structure and referral tree clarity.
- Wallet/credits correctness and idempotent updates.
- Login gating and legal path clarity.

Deliverables:
- Stable rewards dashboard with tree view.
- Referral DB schema and server-side validation complete.
- README section updated for rewards system behavior.

Exit criteria:
- Reward totals match ledger events.
- Referral hierarchy renders without broken nodes.
- Unauthorized users blocked from reward mutations.

### Phase 6 - Performance Pass (Week 6)

Scope:
- Frontend chunk strategy and initial load reduction.
- Heavy list render optimization.
- API latency budgets for core routes.

Deliverables:
- Manual chunk split strategy for large bundles.
- Render memoization and list virtualization where needed.
- API timing instrumentation and budget checks.

Exit criteria:
- Reduce oversized main chunk warnings in production build.
- Home route interactive time improved from baseline.
- P95 API latency target met for `all-posts`, `feed`, `profile`.

### Phase 7 - Security Hardening (Week 7)

Scope:
- Header/CORS/CSP and sensitive endpoint controls.
- Rate-limit and anomaly protections for auth/admin APIs.
- Location fraud mitigation strategy (defense-in-depth).

Deliverables:
- Hardened middleware stack documented.
- Admin route authorization tightened.
- Security test checklist and incident runbook updates.

Exit criteria:
- No unauthorized admin data access paths.
- Security lint/check scripts pass in CI.
- Alerting coverage for auth abuse and repeated failures.

### Phase 8 - QA Automation (Week 8)

Scope:
- Add route-level smoke tests and critical flow e2e.
- Prevent regressions on navbar/i18n/auth.
- CI gates for quality and reliability.

Deliverables:
- E2E smoke suite for core user journeys.
- Snapshot/visual checks for mobile navbar.
- "No merge without green gates" policy applied.

Exit criteria:
- CI green on lint + tests + build + smoke.
- Regressions reproducible with deterministic tests.
- Release gate command stable on local + CI.

### Phase 9 - Release Readiness (Week 9)

Scope:
- Production checklist, fallback flows, rollback path.
- Preflight health readiness and monitoring validation.
- Docs cleanup and deployment clarity.

Deliverables:
- Final release checklist signed.
- Monitoring/dashboard references consolidated.
- Known-risk matrix and rollback instructions published.

Exit criteria:
- Dry-run release succeeds.
- Rollback drill validated.
- Zero blockers in checklist.

### Phase 10 - Post-Launch Optimization (Week 10)

Scope:
- Measure real usage bottlenecks.
- Prioritize highest-ROI backlog from telemetry.
- Tighten cycle from issue -> fix -> verify.

Deliverables:
- Metrics review dashboard and weekly triage template.
- Backlog resequenced by impact and effort.
- Next 4-week plan generated.

Exit criteria:
- Measured improvements recorded against Week 1 baseline.
- Top 10 post-launch issues closed or scheduled with owners.

## 5. Immediate Execution Queue (Active)

1. Done: fixed auth false-expiry regression caused by `password_changed_at` timezone/precision mismatch (`server/src/services/accessTokenPolicyService.js`).
2. Done: fixed recursive auth response hardening crash on 401/403 paths (`server/src/middleware/authResponseHardening.js`).
3. Done: stabilized real auth integration tests with CSRF bootstrapping and stronger diagnostics (`server/tests/auth.real.integration.test.js`).
4. Done: auth integration suite green for `signup -> login -> me`, `refresh/logout`, and `forgot/reset` flows.
5. Done: route-guard return-path regression tests added and passing (`client/tests/components/auth-event-router.test.jsx`).
6. Done: cart add flow made idempotent to prevent repeated listing duplication (`client/src/context/CartContext.jsx`).
7. Done: cart context regression tests added for idempotent add, qty updates, and persistence (`client/tests/context/cart-context.test.jsx`).
8. Done: completed production-doc cleanup for finished non-README checklists/reports and consolidated references to current evidence docs (`server/docs/PHASE5_VALIDATION_EVIDENCE_2026-02-27.md`, `server/docs/TEST_CASES.md`, `server/docs/PERFORMANCE.md`).
9. Next: Phase 4 filter/search determinism pass (navbar query -> `AllPosts` result parity + regression tests).

## 6. Tracking Format

Use this for each task:

- `Task`: short name
- `Owner`: client/server/fullstack
- `Status`: planned/in_progress/blocked/done
- `Proof`: PR/file/test output
- `Risk`: low/medium/high

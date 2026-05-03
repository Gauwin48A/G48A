# Release-gate E2E suite

Pre-launch end-user-perspective gate. **Every** public production release
must run this suite green before the APK / web bundle ships.

The suite mimics a real end user driving the app via WebView (mobile
360×800 floor + Pixel 7 412×915), exercising every reachable feature
**except** real payments, real Google OAuth, real KYC document upload,
and real R2 media upload — those four boundaries are stubbed at the
network layer so production accounts and infra are never touched.

## Layout

```
e2e/release-gate/
├── _setup.ts          # Playwright fixture: mocks + auth + tracker per test
├── _mocks.ts          # Stateful API mocks (cart, wishlist, compare, …)
├── _assertions.ts     # gotoAndAssertPage + per-page quality checks
├── _tracker.ts        # JSONL coverage recorder
├── 01-entry-nav.pw.ts
├── 02-browse-discovery.pw.ts
├── 03-post-detail.pw.ts
├── 04-commerce.pw.ts
├── 05-sales-seller.pw.ts
├── 06-social.pw.ts
├── 07-profile-account.pw.ts
├── 08-static-legal.pw.ts
└── 09-auth.pw.ts
```

Reuses fixtures and mocks from
[../comprehensive/fixtures.ts](../comprehensive/fixtures.ts) and
[../comprehensive/e2e-helpers.ts](../comprehensive/e2e-helpers.ts).

## Quality gates per route (asserted by `gotoAndAssertPage`)

1. Navigation succeeded (HTTP < 500).
2. Suspense fallback cleared (≥1.2s settle, then primary content present:
   `mainTextLen ≥ 60` OR `cardCount ≥ 1`).
3. No visible spinner after settle.
4. No mojibake (`Ã·`, `Â`, `â€` patterns).
5. No console errors (excluding `i18next missingKey` and React DevTools nag).
6. No 5xx responses, no `requestfailed` events on non-mocked URLs.
7. Soft check: every visible text node has computed `font-size ≥ 12px`.

## Excluded (do **not** add tests for these)

- Real payment gateway handoff — checkout test asserts we don't navigate
  to `stripe|razorpay|payu|paytm|upi:` URLs.
- Real Google Sign-In — `**/api/auth/google` returns mocked 401.
- Real KYC document upload — `**/api/kyc/**` returns mock success.
- Real R2 image upload — `**/uploads/**` returns a placeholder URL.

## Run it

Prerequisites: Node 18+, `npm ci` in `Mhub/client/`. Vite dev/preview is
auto-started by Playwright (`webServer.reuseExistingServer: true`).

```powershell
cd Mhub\client

# single end-to-end run (both viewports + summary)
npm run test:release-gate

# loop until 3 clean consecutive runs
npm run test:release-gate -- --loop=10 --clean=3

# only the 360x800 mobile-floor project
npm run test:release-gate:360

# only the Pixel 7 412x915 project
npm run test:release-gate:412

# (re)consolidate summary from latest run
npm run test:release-gate:summary
```

If you see a stale-cache error after editing CSS/JSX, free the dev ports:

```powershell
Get-NetTCPConnection -State Listen -LocalPort 4173,5173 -EA SilentlyContinue |
  ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -EA SilentlyContinue }
```

`scripts/release-gate-run.mjs` does this automatically before each iteration.

## Output

Each run writes to `Mhub/analysis/release-gate/<runId>/`:

- `_records.jsonl` — one record per test (route, clicks, assertions,
  console errors, network failures, screenshots).
- `summary.json` — totals + per-phase rollup.
- `summary.md` — human-readable report (totals, per-phase table, route
  coverage list, failure breakdown).

## Interpreting the summary

`summary.md` headline:

- **All phases**: tests, passed, failed.
- **Per phase**: tests / passed / failed / route count / assertion failures
  / console errors / 5xx-or-failed network requests.
- **Failures section**: file, status, failed assertions, top 5 console
  errors, top 5 network failures per failing test.

Pass criteria for shipping:
- Every test status `passed`.
- `assertionFailures = 0`.
- `consoleErrors = 0`.
- `networkFailures = 0`.

## Adding a new test

1. Pick the right phase file (or add a new one numbered `10-…`).
2. `import { test, expect } from "./_setup";`
3. `test.use({ releaseGatePhase: "<phase-id>" });` (and
   `releaseGateMode: "logged-out"` if needed).
4. Use `await gotoAndAssertPage(page, info, "/route");` — the 7 gates
   above run automatically.
5. Add user-action steps via `clickTracked(page, info, selector)` and
   `trackNote(info, "what happened")`.
6. If you add a `data-testid` to React source, document it in this README.

## Added `data-testid` attributes

_(none yet — tests rely on role + accessible name today; add here as we
need stable hooks for new flows.)_

## Known production-code warnings (filtered, follow-up tickets)

The tracker silently drops these recurring warnings so they don't poison
the pass/fail signal — fix them at the source, not in the gate:

1. `Warning: React does not recognize the 'fetchPriority' prop on a DOM
   element.` — emitted by an `<img>` inside `Mhub/client/src/components/ui/card.jsx`.
   Fix: rename JSX prop to `fetchpriority` (lowercase) or omit when forwarding.
2. `Warning: Cannot update a component (GreenNavbar) while rendering a
   different component (Wishlist).` — `GreenNavbar` is reading state mid-render
   of `Wishlist.jsx`. Fix: move the offending setter into a `useEffect`
   inside whichever component is calling it during render.

Add new filters in `_tracker.ts` only as a temporary measure until the
underlying warning is fixed.

## Known gotchas

- ESM `__dirname` doesn't exist; the tracker derives REPO_ROOT from
  `process.cwd()` (Playwright runs with cwd = `Mhub/client/`).
- Catch-all `**/api/**` mock returns `{}` — augment `_mocks.ts` if a new
  API surface needs a populated shape.
- Mojibake double-encoded text in the source survives into rendered DOM;
  fix at source under `Mhub/client/src/...`, not in this suite.
- A test needing `> 2` retries is **flaky**, not slow — root-cause and fix
  the underlying mock / race / selector instead of bumping retries.

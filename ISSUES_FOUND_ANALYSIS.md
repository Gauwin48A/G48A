# MHub Project Analysis - Issues Found
Date: 2026-02-23
Scope: repository scan, local startup checks, build/test checks

## Verification Snapshot
- Backend startup: working after one syntax fix.
- Backend tests: pass (`49/49`) via `npm test -- --runInBand` in `server`.
- Frontend build: pass via `npm run build` in `client` (with chunk size warnings).
- Frontend tests: pass (`1` test) via `npm run test` in `client`.
- Frontend lint: fails before linting due invalid ESLint CLI flags.

## Open Issues

### Critical

1. Secrets are committed in repo (`server/.env`) and tracked by Git.
- Evidence:
  - `git ls-files server/.env` returns tracked file.
  - `server/.env:6` contains DB password.
  - `server/.env:9` contains JWT secret.
  - `server/.env:10` contains refresh secret.
- Risk: credential leakage, token forgery risk, environment compromise.
- Recommended action:
  - Rotate all exposed secrets immediately.
  - Remove `server/.env` from Git tracking (`git rm --cached server/.env`).
  - Keep secrets in local env/secret manager only.

2. `/public-wall` frontend route is wired, but underlying implementation is broken.
- Evidence:
  - Route is active at `client/src/App.jsx:257`.
  - Component uses `useEffect` but does not import it (`client/src/pages/PublicWall.jsx:2`, `client/src/pages/PublicWall.jsx:16`).
  - Calls hardcoded endpoint `http://localhost:5000/api/publicwall` at `client/src/pages/PublicWall.jsx:18`.
  - No matching backend route found by search in `server/src` for `publicwall`.
- Risk: runtime failure for users visiting `/public-wall`.
- Recommended action:
  - Import `useEffect` correctly.
  - Replace hardcoded URL with `VITE_API_BASE_URL`.
  - Implement and mount backend route for `/api/publicwall` (or remove page route until implemented).

### High

3. Hardcoded localhost endpoints are spread through client code.
- Evidence:
  - `client/src/lib/socket.js:4` hardcodes `http://localhost:5000`.
  - `client/src/pages/AddPost.jsx:273` hardcodes `http://localhost:5000/api/posts`.
  - `client/src/pages/PublicWall.jsx:18` hardcodes `http://localhost:5000/api/publicwall`.
  - Many additional hardcoded matches found by search in `client/src`.
- Risk: staging/production misrouting, difficult environment portability.
- Recommended action:
  - Standardize all API/socket base URLs on env-based config.
  - Enforce via lint rule or CI check against hardcoded localhost.

4. Frontend lint script is broken due ESLint flat-config incompatibility.
- Evidence:
  - Script uses `--ext` at `client/package.json:9`.
  - Flat config file exists at `client/eslint.config.js:1`.
  - `npm run lint` fails with: `Invalid option '--ext'`.
- Risk: linting gate is ineffective; regressions can slip in.
- Recommended action:
  - Update script to flat-config compatible command.
  - Add lint execution to CI once fixed.

5. Refresh-token env naming is inconsistent between template and runtime code.
- Evidence:
  - Template uses `JWT_REFRESH_SECRET` at `server/.env.example:19`.
  - Runtime reads `REFRESH_SECRET` at `server/src/config/jwtConfig.js:33`.
  - Current local env uses `REFRESH_SECRET` at `server/.env:10`.
- Risk: deployment misconfiguration, fallback secret usage, token invalidation surprises.
- Recommended action:
  - Normalize to one env name and update code + docs together.

6. Push notification Firebase config is placeholder-only in client.
- Evidence:
  - Placeholder config and TODO at `client/src/lib/firebase.js:11`.
  - Placeholder service-worker config at `client/public/firebase-messaging-sw.js:10`.
  - No `firebase` dependency declared in `client/package.json`.
- Risk: push notifications silently non-functional in real environments.
- Recommended action:
  - Add real config via env variables and install required SDK dependency.
  - Add startup check and explicit admin warning when unconfigured.

7. Duplicate/nested legacy route/controller folders contain inconsistent code paths.
- Evidence:
  - Nested folders exist: `server/src/routes/routes` and `server/src/controllers/controllers`.
  - `server/src/routes/routes/postActions.js:4` imports from `../controllers/postActionsController` (path is invalid relative to this folder).
  - No mounts/references found from `server/src/index.js`.
- Risk: dead code confusion, accidental future wiring to broken imports.
- Recommended action:
  - Remove or archive legacy nested folders.
  - Keep single canonical routes/controllers structure.

8. Transactions route is placeholder and appears unmounted.
- Evidence:
  - TODO marker at `server/src/routes/transactions.js:4`.
  - Placeholder handler at `server/src/routes/transactions.js:6`.
  - No mount reference found in `server/src/index.js`.
- Risk: misleading implementation status for sale flow.
- Recommended action:
  - Implement real workflow and mount route, or remove placeholder file.

### Medium

9. Project status documents conflict materially.
- Evidence:
  - `FEATURE_COMPLETION_MATRIX.md:9` says `45/52 (86%)`.
  - `FEATURE_STATUS_REPORT.md:11` says `95% completion`.
  - `PRODUCTION_LAUNCH_ROADMAP.md:669` says `50% code quality` and `20% operationally`.
- Risk: planning and stakeholder decisions based on inconsistent readiness numbers.
- Recommended action:
  - Publish one source-of-truth status model with dated metrics.

10. Bundle-size warning indicates performance debt.
- Evidence:
  - `npm run build` reports chunk > `500 kB` after minification.
- Risk: slower initial load on low-end devices/networks.
- Recommended action:
  - Add route-level code splitting/manual chunking.
  - Track JS payload budget in CI.

11. Automated test depth is low relative to platform scope.
- Evidence:
  - Client has only one test file in current run.
  - Existing docs also indicate low coverage (`FEATURE_STATUS_REPORT.md:757`, `FEATURE_STATUS_REPORT.md:764`).
- Risk: regressions in critical flows (payments, sale handshake, KYC, fraud/risk).
- Recommended action:
  - Add integration and E2E tests for revenue/trust-critical paths first.

## Fixed During This Analysis

1. Backend startup syntax blocker in forgot-password flow.
- Issue: duplicate declaration of `crypto` in `forgotPassword` caused parse-time crash.
- Fix applied in `server/src/controllers/authController.js` (single declaration retained at `server/src/controllers/authController.js:605` and reused at hash lines `618-619`).
- Result: backend can start and respond on `/health`.

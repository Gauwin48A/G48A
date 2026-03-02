# E2E Smoke Coverage

This project includes a lightweight browser smoke suite for key route-level
empty/error/retry states.

## Files

- `playwright.config.mjs`
- `e2e/smoke/route-state-smoke.spec.ts`

## Commands

- `npm run test:e2e:smoke`
- `npm run test:e2e:smoke:headed`

## Notes

- The suite starts a local Vite server on `http://127.0.0.1:4173`.
- Tests intentionally validate fallback UX when backend APIs are unavailable.
- Install Playwright browsers before first run:
  - `npx playwright install`

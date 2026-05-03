/**
 * release-gate/_setup.ts
 * ---------------------------------------------------------------------------
 * One-call setup for every release-gate spec. Wires:
 *   - common API mocks (catch-all + health/analytics/coins/cms)
 *   - logged-in or logged-out auth state (mocked, no real OAuth)
 *   - coverage tracker (beginCoverage + endCoverage via afterEach)
 *   - geolocation, animation freeze, deterministic Date/Math.random
 *   - viewport pin (mobile floor 360x800 by default; spec can override)
 *
 * Specs use:
 *   import { test, expect } from "./_setup";
 *   test.describe("Phase X", () => { test("...", async ({ page }, info) => { ... }); });
 *
 * The exported `test` is a Playwright fixture chain that supplies a
 * pre-instrumented page. Use `gotoTracked(page, info, route)` from
 * `./_assertions` to navigate AND record routes.
 * ---------------------------------------------------------------------------
 */
import { test as base, expect, type Page } from "@playwright/test";
import {
  disableAnimations,
  mockAuthenticatedApiRoutes,
  mockCommonApiRoutes,
  setupLoggedInState,
  setupLoggedOutState
} from "../comprehensive/e2e-helpers";
import { setupAllReleaseGateMocks } from "./_mocks";
import {
  beginCoverage,
  endCoverage,
  trackNote,
  type CoverageRecord
} from "./_tracker";

export type ReleaseGateMode = "logged-in" | "logged-out";

export const test = base.extend<{
  releaseGatePhase: string;
  releaseGateMode: ReleaseGateMode;
}>({
  // Specs override these via test.use({ releaseGatePhase: "...", releaseGateMode: "logged-out" }).
  releaseGatePhase: ["unspecified", { option: true }],
  releaseGateMode: ["logged-in", { option: true }],

  page: async ({ page, releaseGatePhase, releaseGateMode }, use, info) => {
    // 1) freeze nondeterminism BEFORE any app code runs
    await page.addInitScript(() => {
      // Freeze Math.random for any code that relies on it during render.
      let seed = 0xC0FFEE;
      Math.random = () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
      };
    });
    await page.context().grantPermissions(["geolocation"]);
    await page.context().setGeolocation({ latitude: 17.385, longitude: 78.4867 });

    // 2) mocks (order matters — catch-all first so specifics override)
    await mockCommonApiRoutes(page);
    await setupAllReleaseGateMocks(page);

    // 3) auth state
    if (releaseGateMode === "logged-in") {
      await setupLoggedInState(page);
      await mockAuthenticatedApiRoutes(page);
    } else {
      await setupLoggedOutState(page);
    }

    // 4) start coverage record
    const rec = beginCoverage(page, info, releaseGatePhase);
    trackNote(info, `mode=${releaseGateMode}`);

    // 5) hand off
    await use(page);

    // 6) animations are disabled on first navigation by the spec via
    //    `gotoTracked` (we can't add styles before the document exists).

    // 7) flush coverage
    endCoverage(info);

    // Reference rec to silence unused-var lint when developers extend.
    void rec;
  }
});

export { expect, disableAnimations, type Page, type CoverageRecord };

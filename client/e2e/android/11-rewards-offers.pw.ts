/**
 * MHub Android E2E — 11 Rewards, Tiers, Offers
 * Tests rewards page, tier selection, offers page.
 */
import { test, expect } from "@playwright/test";
import {
  disableAnimations, waitForPageReady, screenshotPage,
  setupLoggedInState, setupLoggedOutState, enableDarkMode, enableLightMode,
  mockAllApis, assertNoOverflow, ANDROID_VIEWPORT
} from "./android-helpers";

test.use({ viewport: ANDROID_VIEWPORT, hasTouch: true, isMobile: true });

const MODES = ["light", "dark"] as const;

for (const mode of MODES) {
  test.describe(`Rewards [${mode}]`, () => {
    test.beforeEach(async ({ page }) => {
      await mockAllApis(page, true);
      await setupLoggedInState(page);
      if (mode === "dark") await enableDarkMode(page);
      else await enableLightMode(page);
      await page.goto("/rewards", { waitUntil: "domcontentloaded" });
      await waitForPageReady(page);
      await disableAnimations(page);
    });

    test("rewards page renders", async ({ page }) => {
      await screenshotPage(page, `11-rewards-${mode}`);
    });

    test("no horizontal overflow", async ({ page }) => {
      await assertNoOverflow(page);
    });
  });

  test.describe(`Tier Selection [${mode}]`, () => {
    test.beforeEach(async ({ page }) => {
      await mockAllApis(page, true);
      await setupLoggedInState(page);
      if (mode === "dark") await enableDarkMode(page);
      else await enableLightMode(page);
      await page.goto("/tier-selection", { waitUntil: "domcontentloaded" });
      await waitForPageReady(page);
      await disableAnimations(page);
    });

    test("tier selection page renders on mobile", async ({ page }) => {
      await screenshotPage(page, `11-tier-selection-${mode}`);
    });

    test("no horizontal overflow", async ({ page }) => {
      await assertNoOverflow(page);
    });
  });

  test.describe(`Offers [${mode}]`, () => {
    test.beforeEach(async ({ page }) => {
      await mockAllApis(page, false);
      await setupLoggedOutState(page);
      if (mode === "dark") await enableDarkMode(page);
      else await enableLightMode(page);
      await page.goto("/offers", { waitUntil: "domcontentloaded" });
      await waitForPageReady(page);
      await disableAnimations(page);
    });

    test("offers page renders on mobile", async ({ page }) => {
      await screenshotPage(page, `11-offers-${mode}`);
    });

    test("no horizontal overflow", async ({ page }) => {
      await assertNoOverflow(page);
    });
  });
}

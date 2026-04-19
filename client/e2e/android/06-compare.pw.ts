/**
 * MHub Android E2E — 06 Compare Posts
 * Tests the compare posts feature on Android viewport.
 */
import { test, expect } from "@playwright/test";
import {
  disableAnimations, waitForPageReady, screenshotPage,
  setupLoggedOutState, enableDarkMode, enableLightMode,
  mockAllApis, mockCompareApi, assertNoOverflow, ANDROID_VIEWPORT
} from "./android-helpers";

test.use({ viewport: ANDROID_VIEWPORT, hasTouch: true, isMobile: true });

const MODES = ["light", "dark"] as const;

for (const mode of MODES) {
  test.describe(`Compare Posts [${mode}]`, () => {
    test.beforeEach(async ({ page }) => {
      await mockAllApis(page, false);
      await setupLoggedOutState(page);
      await mockCompareApi(page);
      if (mode === "dark") await enableDarkMode(page);
      else await enableLightMode(page);
      await page.goto("/compare", { waitUntil: "domcontentloaded" });
      await waitForPageReady(page);
      await disableAnimations(page);
    });

    test("compare page renders on mobile", async ({ page }) => {
      await screenshotPage(page, `06-compare-${mode}`);
    });

    test("no horizontal overflow", async ({ page }) => {
      await assertNoOverflow(page);
    });
  });
}

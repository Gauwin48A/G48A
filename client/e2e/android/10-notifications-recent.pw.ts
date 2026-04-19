/**
 * MHub Android E2E — 10 Notifications, Recently Viewed, Saved Searches
 * Tests notification list, recently viewed items, saved searches.
 */
import { test, expect } from "@playwright/test";
import {
  disableAnimations, waitForPageReady, screenshotPage,
  setupLoggedInState, enableDarkMode, enableLightMode,
  mockAllApis, assertNoOverflow, ANDROID_VIEWPORT
} from "./android-helpers";

test.use({ viewport: ANDROID_VIEWPORT, hasTouch: true, isMobile: true });

const MODES = ["light", "dark"] as const;

for (const mode of MODES) {
  test.describe(`Notifications [${mode}]`, () => {
    test.beforeEach(async ({ page }) => {
      await mockAllApis(page, true);
      await setupLoggedInState(page);
      if (mode === "dark") await enableDarkMode(page);
      else await enableLightMode(page);
      await page.goto("/notifications", { waitUntil: "domcontentloaded" });
      await waitForPageReady(page);
      await disableAnimations(page);
    });

    test("notifications page renders", async ({ page }) => {
      await screenshotPage(page, `10-notifications-${mode}`);
    });

    test("no horizontal overflow", async ({ page }) => {
      await assertNoOverflow(page);
    });
  });

  test.describe(`Recently Viewed [${mode}]`, () => {
    test.beforeEach(async ({ page }) => {
      await mockAllApis(page, true);
      await setupLoggedInState(page);
      if (mode === "dark") await enableDarkMode(page);
      else await enableLightMode(page);
      await page.goto("/recently-viewed", { waitUntil: "domcontentloaded" });
      await waitForPageReady(page);
      await disableAnimations(page);
    });

    test("recently viewed page renders", async ({ page }) => {
      await screenshotPage(page, `10-recently-viewed-${mode}`);
    });

    test("no horizontal overflow", async ({ page }) => {
      await assertNoOverflow(page);
    });
  });

  test.describe(`Saved Searches [${mode}]`, () => {
    test.beforeEach(async ({ page }) => {
      await mockAllApis(page, true);
      await setupLoggedInState(page);
      if (mode === "dark") await enableDarkMode(page);
      else await enableLightMode(page);
      await page.goto("/saved-searches", { waitUntil: "domcontentloaded" });
      await waitForPageReady(page);
      await disableAnimations(page);
    });

    test("saved searches page renders", async ({ page }) => {
      await screenshotPage(page, `10-saved-searches-${mode}`);
    });

    test("no horizontal overflow", async ({ page }) => {
      await assertNoOverflow(page);
    });
  });
}

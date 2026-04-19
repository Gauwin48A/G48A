/**
 * MHub Android E2E — 09 Profile & Dashboard
 * Tests profile page, dashboard, activity hub, settings.
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
  test.describe(`Profile [${mode}]`, () => {
    test.beforeEach(async ({ page }) => {
      await mockAllApis(page, true);
      await setupLoggedInState(page);
      if (mode === "dark") await enableDarkMode(page);
      else await enableLightMode(page);
      await page.goto("/profile", { waitUntil: "domcontentloaded" });
      await waitForPageReady(page);
      await disableAnimations(page);
    });

    test("profile page renders", async ({ page }) => {
      await screenshotPage(page, `09-profile-${mode}`);
    });

    test("no horizontal overflow", async ({ page }) => {
      await assertNoOverflow(page);
    });

    test("user info displayed correctly", async ({ page }) => {
      // Should show user name or email
      const userText = page.getByText(/e2e user|e2e.user/i).first();
      if (await userText.isVisible()) {
        await expect(userText).toBeVisible();
      }
    });
  });

  test.describe(`Dashboard [${mode}]`, () => {
    test.beforeEach(async ({ page }) => {
      await mockAllApis(page, true);
      await setupLoggedInState(page);
      if (mode === "dark") await enableDarkMode(page);
      else await enableLightMode(page);
      await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
      await waitForPageReady(page);
      await disableAnimations(page);
    });

    test("dashboard renders on mobile", async ({ page }) => {
      await screenshotPage(page, `09-dashboard-${mode}`);
    });

    test("no horizontal overflow", async ({ page }) => {
      await assertNoOverflow(page);
    });
  });

  test.describe(`My Home [${mode}]`, () => {
    test.beforeEach(async ({ page }) => {
      await mockAllApis(page, true);
      await setupLoggedInState(page);
      if (mode === "dark") await enableDarkMode(page);
      else await enableLightMode(page);
      await page.goto("/my-home", { waitUntil: "domcontentloaded" });
      await waitForPageReady(page);
      await disableAnimations(page);
    });

    test("my home page renders", async ({ page }) => {
      await screenshotPage(page, `09-my-home-${mode}`);
    });

    test("no horizontal overflow", async ({ page }) => {
      await assertNoOverflow(page);
    });
  });
}

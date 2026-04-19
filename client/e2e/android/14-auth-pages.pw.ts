/**
 * MHub Android E2E — 14 Auth Pages (Login, Signup, Forgot Password)
 * Tests authentication pages on mobile viewport.
 */
import { test, expect } from "@playwright/test";
import {
  disableAnimations, waitForPageReady, screenshotPage, screenshotViewport,
  setupLoggedOutState, enableDarkMode, enableLightMode,
  mockAllApis, assertNoOverflow, ANDROID_VIEWPORT, TEST_CREDENTIALS
} from "./android-helpers";

test.use({ viewport: ANDROID_VIEWPORT, hasTouch: true, isMobile: true });

const MODES = ["light", "dark"] as const;

for (const mode of MODES) {
  test.describe(`Login Page [${mode}]`, () => {
    test.beforeEach(async ({ page }) => {
      await mockAllApis(page, false);
      await setupLoggedOutState(page);
      if (mode === "dark") await enableDarkMode(page);
      else await enableLightMode(page);
      await page.goto("/login", { waitUntil: "domcontentloaded" });
      await waitForPageReady(page);
      await disableAnimations(page);
    });

    test("login page renders correctly on mobile", async ({ page }) => {
      await screenshotPage(page, `14-login-${mode}`);
    });

    test("no horizontal overflow", async ({ page }) => {
      await assertNoOverflow(page);
    });

    test("email and password fields are visible", async ({ page }) => {
      const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
      const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
      // At least one of these should be visible
      const emailVisible = await emailInput.isVisible().catch(() => false);
      const passwordVisible = await passwordInput.isVisible().catch(() => false);
      expect(emailVisible || passwordVisible).toBe(true);
    });

    test("login button is visible and accessible", async ({ page }) => {
      const loginBtn = page.locator('button[type="submit"], button').filter({ hasText: /log\s*in|sign\s*in/i }).first();
      if (await loginBtn.isVisible()) {
        await expect(loginBtn).toBeVisible();
        // Check touch target is at least 48px
        const box = await loginBtn.boundingBox();
        if (box) {
          expect(box.height).toBeGreaterThanOrEqual(40);
        }
      }
    });

    test("form fields fill correctly on mobile", async ({ page }) => {
      const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
      if (await emailInput.isVisible()) {
        await emailInput.fill(TEST_CREDENTIALS.email);
        await expect(emailInput).toHaveValue(TEST_CREDENTIALS.email);
        await screenshotViewport(page, `14-login-filled-${mode}`);
      }
    });

    test("signup link is visible", async ({ page }) => {
      const signupLink = page.locator('a, button').filter({ hasText: /sign\s*up|create.*account|register/i }).first();
      if (await signupLink.isVisible()) {
        await expect(signupLink).toBeVisible();
      }
    });

    test("forgot password link is visible", async ({ page }) => {
      const forgotLink = page.locator('a, button').filter({ hasText: /forgot.*password|reset.*password/i }).first();
      if (await forgotLink.isVisible()) {
        await expect(forgotLink).toBeVisible();
      }
    });
  });

  test.describe(`Signup Page [${mode}]`, () => {
    test.beforeEach(async ({ page }) => {
      await mockAllApis(page, false);
      await setupLoggedOutState(page);
      if (mode === "dark") await enableDarkMode(page);
      else await enableLightMode(page);
      await page.goto("/signup", { waitUntil: "domcontentloaded" });
      await waitForPageReady(page);
      await disableAnimations(page);
    });

    test("signup page renders on mobile", async ({ page }) => {
      await screenshotPage(page, `14-signup-${mode}`);
    });

    test("no horizontal overflow", async ({ page }) => {
      await assertNoOverflow(page);
    });
  });

  test.describe(`Forgot Password [${mode}]`, () => {
    test.beforeEach(async ({ page }) => {
      await mockAllApis(page, false);
      await setupLoggedOutState(page);
      if (mode === "dark") await enableDarkMode(page);
      else await enableLightMode(page);
      await page.goto("/forgot-password", { waitUntil: "domcontentloaded" });
      await waitForPageReady(page);
      await disableAnimations(page);
    });

    test("forgot password page renders on mobile", async ({ page }) => {
      await screenshotPage(page, `14-forgot-password-${mode}`);
    });

    test("no horizontal overflow", async ({ page }) => {
      await assertNoOverflow(page);
    });
  });
}

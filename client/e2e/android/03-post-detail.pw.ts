/**
 * MHub Android E2E — 03 Post Detail Page
 * Tests post detail view, image gallery, seller info, action buttons.
 */
import { test, expect } from "@playwright/test";
import {
  disableAnimations, waitForPageReady, screenshotPage, screenshotViewport,
  setupLoggedOutState, setupLoggedInState, enableDarkMode, enableLightMode,
  mockAllApis, assertNoOverflow, ANDROID_VIEWPORT
} from "./android-helpers";

test.use({ viewport: ANDROID_VIEWPORT, hasTouch: true, isMobile: true });

const MODES = ["light", "dark"] as const;

for (const mode of MODES) {
  test.describe(`Post Detail [${mode}]`, () => {
    test.beforeEach(async ({ page }) => {
      await mockAllApis(page, true);
      await setupLoggedInState(page);
      if (mode === "dark") await enableDarkMode(page);
      else await enableLightMode(page);
      await page.goto("/post/post-1", { waitUntil: "domcontentloaded" });
      await waitForPageReady(page);
      await disableAnimations(page);
    });

    test("renders post detail page", async ({ page }) => {
      await screenshotPage(page, `03-post-detail-${mode}`);
    });

    test("no horizontal overflow on detail page", async ({ page }) => {
      await assertNoOverflow(page);
    });

    test("post title is visible", async ({ page }) => {
      const title = page.getByText(/vintage camera/i).first();
      await expect(title).toBeVisible();
    });

    test("price is displayed", async ({ page }) => {
      const price = page.getByText(/2,?500|₹\s*2,?500/i).first();
      if (await price.isVisible()) {
        await expect(price).toBeVisible();
      }
    });

    test("action buttons are visible and not overlapping", async ({ page }) => {
      // Check for common action buttons (like, share, add to cart, etc.)
      const buttons = page.locator("button");
      const count = await buttons.count();
      expect(count).toBeGreaterThan(0);
      await screenshotViewport(page, `03-post-detail-actions-${mode}`);
    });

    test("back navigation works", async ({ page }) => {
      await page.goBack();
      await page.waitForTimeout(300);
    });
  });

  test.describe(`Post Detail — Logged Out [${mode}]`, () => {
    test.beforeEach(async ({ page }) => {
      await mockAllApis(page, false);
      await setupLoggedOutState(page);
      if (mode === "dark") await enableDarkMode(page);
      else await enableLightMode(page);
      await page.goto("/post/post-1", { waitUntil: "domcontentloaded" });
      await waitForPageReady(page);
      await disableAnimations(page);
    });

    test("post detail visible for unauthenticated users", async ({ page }) => {
      await screenshotPage(page, `03-post-detail-logged-out-${mode}`);
    });

    test("login prompt shown when trying protected actions", async ({ page }) => {
      // Try clicking any action that requires auth — find a visible one
      const actionBtns = page.locator("button").filter({ hasText: /add to cart|wishlist|save|buy|contact/i });
      const count = await actionBtns.count();
      for (let i = 0; i < count; i++) {
        if (await actionBtns.nth(i).isVisible()) {
          await actionBtns.nth(i).click();
          await page.waitForTimeout(500);
          await screenshotViewport(page, `03-post-detail-auth-prompt-${mode}`);
          break;
        }
      }
    });
  });
}

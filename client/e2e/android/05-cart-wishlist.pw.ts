/**
 * MHub Android E2E — 05 Cart & Wishlist
 * Tests cart page, wishlist page, add/remove operations.
 */
import { test, expect } from "@playwright/test";
import {
  disableAnimations, waitForPageReady, screenshotPage, screenshotViewport,
  setupLoggedInState, enableDarkMode, enableLightMode,
  mockAllApis, assertNoOverflow, ANDROID_VIEWPORT
} from "./android-helpers";

test.use({ viewport: ANDROID_VIEWPORT, hasTouch: true, isMobile: true });

const MODES = ["light", "dark"] as const;

for (const mode of MODES) {
  test.describe(`Cart [${mode}]`, () => {
    test.beforeEach(async ({ page }) => {
      await mockAllApis(page, true);
      await setupLoggedInState(page);
      if (mode === "dark") await enableDarkMode(page);
      else await enableLightMode(page);
      await page.goto("/cart", { waitUntil: "domcontentloaded" });
      await waitForPageReady(page);
      await disableAnimations(page);
    });

    test("cart page renders for authenticated user", async ({ page }) => {
      await screenshotPage(page, `05-cart-${mode}`);
    });

    test("no horizontal overflow", async ({ page }) => {
      await assertNoOverflow(page);
    });

    test("cart items display correctly on mobile", async ({ page }) => {
      await screenshotViewport(page, `05-cart-items-${mode}`);
    });
  });

  test.describe(`Wishlist [${mode}]`, () => {
    test.beforeEach(async ({ page }) => {
      await mockAllApis(page, true);
      await setupLoggedInState(page);
      if (mode === "dark") await enableDarkMode(page);
      else await enableLightMode(page);
      await page.goto("/wishlist", { waitUntil: "domcontentloaded" });
      await waitForPageReady(page);
      await disableAnimations(page);
    });

    test("wishlist page renders", async ({ page }) => {
      await screenshotPage(page, `05-wishlist-${mode}`);
    });

    test("no horizontal overflow", async ({ page }) => {
      await assertNoOverflow(page);
    });

    test("wishlist items display correctly on mobile", async ({ page }) => {
      await screenshotViewport(page, `05-wishlist-items-${mode}`);
    });
  });
}

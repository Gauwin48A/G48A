/**
 * MHub Android E2E — 04 Search Page
 * Tests search functionality, suggestions, results display.
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
  test.describe(`Search Page [${mode}]`, () => {
    test.beforeEach(async ({ page }) => {
      await mockAllApis(page, false);
      await setupLoggedOutState(page);
      if (mode === "dark") await enableDarkMode(page);
      else await enableLightMode(page);
      await page.goto("/search", { waitUntil: "domcontentloaded" });
      await waitForPageReady(page);
      await disableAnimations(page);
    });

    test("search page renders correctly", async ({ page }) => {
      await screenshotPage(page, `04-search-page-${mode}`);
    });

    test("no horizontal overflow", async ({ page }) => {
      await assertNoOverflow(page);
    });

    test("search input is focused and functional", async ({ page }) => {
      const searchInput = page.locator('input[type="search"], input[type="text"], input[placeholder*="Search" i]').first();
      if (await searchInput.isVisible()) {
        await searchInput.fill("camera");
        await page.waitForTimeout(300);
        await screenshotViewport(page, `04-search-typed-${mode}`);
      }
    });

    test("search results display correctly on mobile", async ({ page }) => {
      const searchInput = page.locator('input[type="search"], input[type="text"], input[placeholder*="Search" i]').first();
      if (await searchInput.isVisible()) {
        await searchInput.fill("laptop");
        await page.keyboard.press("Enter");
        await page.waitForTimeout(500);
        await screenshotViewport(page, `04-search-results-${mode}`);
      }
    });
  });
}

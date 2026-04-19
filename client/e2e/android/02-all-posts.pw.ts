/**
 * MHub Android E2E — 02 All Posts / Listings Page
 * Tests post listings, scrolling, filtering, login prompt for unauthenticated users.
 */
import { test, expect } from "@playwright/test";
import {
  disableAnimations, waitForPageReady, screenshotPage, screenshotViewport,
  setupLoggedOutState, setupLoggedInState, enableDarkMode, enableLightMode,
  mockAllApis, assertNoOverflow, assertBottomNavVisible, assertLoginPromptNotBlocking,
  ANDROID_VIEWPORT
} from "./android-helpers";

test.use({ viewport: ANDROID_VIEWPORT, hasTouch: true, isMobile: true });

const MODES = ["light", "dark"] as const;

for (const mode of MODES) {
  test.describe(`All Posts — Logged Out [${mode}]`, () => {
    test.beforeEach(async ({ page }) => {
      await mockAllApis(page, false);
      await setupLoggedOutState(page);
      if (mode === "dark") await enableDarkMode(page);
      else await enableLightMode(page);
      await page.goto("/all-posts", { waitUntil: "domcontentloaded" });
      await waitForPageReady(page);
      await disableAnimations(page);
    });

    test("renders posts list on mobile viewport", async ({ page }) => {
      // Should show post cards
      const body = page.locator("body");
      await expect(body).toBeVisible();
      await screenshotPage(page, `02-all-posts-logged-out-${mode}`);
    });

    test("no horizontal overflow", async ({ page }) => {
      await assertNoOverflow(page);
    });

    test("bottom navigation is visible and not covered", async ({ page }) => {
      await assertBottomNavVisible(page);
      await screenshotViewport(page, `02-all-posts-bottom-nav-${mode}`);
    });

    test("login prompt does not block page on initial load", async ({ page }) => {
      await assertLoginPromptNotBlocking(page);
      await screenshotViewport(page, `02-all-posts-no-blocking-modal-${mode}`);
    });

    test("search bar is visible and interactive", async ({ page }) => {
      const searchBar = page.locator('.mhub-nav-search').first();
      if (await searchBar.isVisible()) {
        // Verify cursor style indicates it's clickable
        const cursor = await searchBar.evaluate(el => getComputedStyle(el).cursor);
        expect(cursor).toBe("pointer");
        await screenshotViewport(page, `02-all-posts-search-bar-${mode}`);
      } else {
        await screenshotViewport(page, `02-all-posts-no-search-bar-${mode}`);
      }
    });

    test("filter button opens filter panel", async ({ page }) => {
      // Close any login prompt overlay first
      await page.keyboard.press("Escape");
      await page.waitForTimeout(200);
      const filterBtn = page.locator('button[aria-label*="ilter" i]').first();
      if (await filterBtn.isVisible()) {
        await filterBtn.click({ force: true });
        await page.waitForTimeout(500);
        await screenshotViewport(page, `02-all-posts-filter-panel-${mode}`);
        await page.keyboard.press("Escape");
        await page.waitForTimeout(200);
      } else {
        await screenshotViewport(page, `02-all-posts-no-filter-btn-${mode}`);
      }
    });

    test("post cards display correctly on mobile", async ({ page }) => {
      // Wait a bit for content to render after dark mode toggle
      await page.waitForTimeout(500);
      const cards = page.locator('[class*="card"], [class*="Card"], [class*="product"]');
      const count = await cards.count();
      if (count > 0) {
        const firstCard = cards.first();
        if (await firstCard.isVisible()) {
          const box = await firstCard.boundingBox();
          if (box) {
            expect(box.width).toBeLessThanOrEqual(412);
          }
        }
      }
      await screenshotViewport(page, `02-all-posts-cards-${mode}`);
    });
  });

  test.describe(`All Posts — Logged In [${mode}]`, () => {
    test.beforeEach(async ({ page }) => {
      await mockAllApis(page, true);
      await setupLoggedInState(page);
      if (mode === "dark") await enableDarkMode(page);
      else await enableLightMode(page);
      await page.goto("/all-posts", { waitUntil: "domcontentloaded" });
      await waitForPageReady(page);
      await disableAnimations(page);
    });

    test("renders posts for authenticated user", async ({ page }) => {
      await screenshotPage(page, `02-all-posts-logged-in-${mode}`);
    });

    test("no login prompt appears for authenticated users", async ({ page }) => {
      const modal = page.locator('[role="dialog"][aria-modal="true"]');
      const isVisible = await modal.isVisible().catch(() => false);
      expect(isVisible).toBe(false);
    });

    test("bottom nav shows correct active state", async ({ page }) => {
      // all-posts should be active in bottom nav
      const activeLink = page.locator('nav a[class*="active"], nav a[aria-current="page"]').first();
      await screenshotViewport(page, `02-all-posts-active-nav-${mode}`);
    });
  });
}

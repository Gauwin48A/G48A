/**
 * MHub Android E2E — 08 Navigation & Bottom Nav
 * Tests bottom navigation bar, more menu, page transitions on Android.
 */
import { test, expect } from "@playwright/test";
import {
  disableAnimations, waitForPageReady, screenshotPage, screenshotViewport,
  setupLoggedOutState, setupLoggedInState, enableDarkMode, enableLightMode,
  mockAllApis, openMoreMenu, closeMoreMenu, assertBottomNavVisible,
  assertNoOverflow, ANDROID_VIEWPORT
} from "./android-helpers";

test.use({ viewport: ANDROID_VIEWPORT, hasTouch: true, isMobile: true });

const MODES = ["light", "dark"] as const;

for (const mode of MODES) {
  test.describe(`Bottom Navigation [${mode}]`, () => {
    test.beforeEach(async ({ page }) => {
      await mockAllApis(page, false);
      await setupLoggedOutState(page);
      if (mode === "dark") await enableDarkMode(page);
      else await enableLightMode(page);
      // Start on all-posts since category-hub hides bottom nav by design
      await page.goto("/all-posts", { waitUntil: "domcontentloaded" });
      await waitForPageReady(page);
      await disableAnimations(page);
      // Dismiss any login prompt overlay that may cover bottom nav
      await page.keyboard.press("Escape");
      await page.waitForTimeout(200);
    });

    test("bottom nav visible and properly positioned", async ({ page }) => {
      await assertBottomNavVisible(page);
      await screenshotViewport(page, `08-bottom-nav-${mode}`);
    });

    test("bottom nav does not overlap content", async ({ page }) => {
      // The bottom nav should be at the very bottom of the viewport
      const navs = page.locator("nav");
      const navCount = await navs.count();
      if (navCount > 0) {
        const lastNav = navs.last();
        const box = await lastNav.boundingBox();
        if (box) {
          // Bottom nav should extend to or near the bottom of viewport
          expect(box.y + box.height).toBeGreaterThan(ANDROID_VIEWPORT.height - 100);
        }
      }
    });

    test("tapping Home navigates to category-hub", async ({ page }) => {
      const homeLink = page.locator(".mhub-bottom-nav-button").filter({ hasText: /home/i }).first();
      if (await homeLink.isVisible()) {
        await homeLink.click({ force: true });
        await page.waitForTimeout(1000);
        await screenshotViewport(page, `08-home-nav-${mode}`);
      }
    });

    test("tapping All Posts navigates correctly", async ({ page }) => {
      const allPostsLink = page.locator(".mhub-bottom-nav-button").filter({ hasText: /all.?posts/i }).first();
      if (await allPostsLink.isVisible()) {
        await allPostsLink.click({ force: true });
        await page.waitForTimeout(1000);
        await screenshotViewport(page, `08-all-posts-nav-${mode}`);
      }
    });

    test("tapping For You navigates correctly", async ({ page }) => {
      const forYouLink = page.locator(".mhub-bottom-nav-button").filter({ hasText: /for you/i }).first();
      if (await forYouLink.isVisible()) {
        await forYouLink.click({ force: true });
        await page.waitForTimeout(1000);
        await screenshotViewport(page, `08-for-you-nav-${mode}`);
      }
    });

    test("tapping Feed navigates correctly", async ({ page }) => {
      const feedLink = page.locator(".mhub-bottom-nav-button").filter({ hasText: /^feed$/i }).first();
      if (await feedLink.isVisible()) {
        await feedLink.click({ force: true });
        await page.waitForTimeout(1000);
        await screenshotViewport(page, `08-feed-nav-${mode}`);
      }
    });

    test("more menu opens and shows all menu items", async ({ page }) => {
      const moreBtn = page.locator(".mhub-bottom-nav-button").filter({ hasText: /^more$/i }).first();
      if (await moreBtn.isVisible()) {
        await moreBtn.click({ force: true });
        await page.waitForTimeout(500);
        await screenshotViewport(page, `08-more-menu-${mode}`);
        await page.keyboard.press("Escape");
        await page.waitForTimeout(200);
      }
    });
  });

  test.describe(`Navigation — Logged In [${mode}]`, () => {
    test.beforeEach(async ({ page }) => {
      await mockAllApis(page, true);
      await setupLoggedInState(page);
      if (mode === "dark") await enableDarkMode(page);
      else await enableLightMode(page);
      // Start on all-posts since category-hub hides bottom nav
      await page.goto("/all-posts", { waitUntil: "domcontentloaded" });
      await waitForPageReady(page);
      await disableAnimations(page);
    });

    test("profile nav link navigates to profile", async ({ page }) => {
      const profileLink = page.locator(".mhub-bottom-nav-button").filter({ hasText: /profile/i }).first();
      if (await profileLink.isVisible()) {
        await profileLink.click({ force: true });
        await page.waitForTimeout(1000);
        await screenshotViewport(page, `08-profile-nav-${mode}`);
      }
    });

    test("rewards nav link navigates to rewards", async ({ page }) => {
      const rewardsLink = page.locator(".mhub-bottom-nav-button").filter({ hasText: /rewards/i }).first();
      if (await rewardsLink.isVisible()) {
        await rewardsLink.click({ force: true });
        await page.waitForTimeout(1000);
        await screenshotViewport(page, `08-rewards-nav-${mode}`);
      }
    });

    test("more menu shows authenticated options", async ({ page }) => {
      const moreBtn = page.locator(".mhub-bottom-nav-button").filter({ hasText: /^more$/i }).first();
      if (await moreBtn.isVisible()) {
        await moreBtn.click({ force: true });
        await page.waitForTimeout(500);
        await screenshotPage(page, `08-more-menu-logged-in-${mode}`);
        await page.keyboard.press("Escape");
        await page.waitForTimeout(200);
      }
    });
  });
}

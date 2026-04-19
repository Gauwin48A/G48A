/**
 * MHub Android E2E — 07 Feed & Social Pages
 * Tests feed page, public wall, feed post detail.
 */
import { test, expect } from "@playwright/test";
import {
  disableAnimations, waitForPageReady, screenshotPage, screenshotViewport,
  setupLoggedOutState, setupLoggedInState, enableDarkMode, enableLightMode,
  mockAllApis, assertNoOverflow, assertLoginPromptNotBlocking, ANDROID_VIEWPORT
} from "./android-helpers";

test.use({ viewport: ANDROID_VIEWPORT, hasTouch: true, isMobile: true });

const MODES = ["light", "dark"] as const;

for (const mode of MODES) {
  test.describe(`Feed Page — Logged Out [${mode}]`, () => {
    test.beforeEach(async ({ page }) => {
      await mockAllApis(page, false);
      await setupLoggedOutState(page);
      if (mode === "dark") await enableDarkMode(page);
      else await enableLightMode(page);
      await page.goto("/feed", { waitUntil: "domcontentloaded" });
      await waitForPageReady(page);
      await disableAnimations(page);
    });

    test("feed page renders for guest", async ({ page }) => {
      await screenshotPage(page, `07-feed-logged-out-${mode}`);
    });

    test("no horizontal overflow", async ({ page }) => {
      await assertNoOverflow(page);
    });

    test("login prompt not blocking feed view initially", async ({ page }) => {
      await assertLoginPromptNotBlocking(page);
    });
  });

  test.describe(`Feed Page — Logged In [${mode}]`, () => {
    test.beforeEach(async ({ page }) => {
      await mockAllApis(page, true);
      await setupLoggedInState(page);
      if (mode === "dark") await enableDarkMode(page);
      else await enableLightMode(page);
      await page.goto("/feed", { waitUntil: "domcontentloaded" });
      await waitForPageReady(page);
      await disableAnimations(page);
    });

    test("feed page renders for authenticated user", async ({ page }) => {
      await screenshotPage(page, `07-feed-logged-in-${mode}`);
    });
  });

  test.describe(`Public Wall [${mode}]`, () => {
    test.beforeEach(async ({ page }) => {
      await mockAllApis(page, false);
      await setupLoggedOutState(page);
      if (mode === "dark") await enableDarkMode(page);
      else await enableLightMode(page);
      await page.goto("/public-wall", { waitUntil: "domcontentloaded" });
      await waitForPageReady(page);
      await disableAnimations(page);
    });

    test("public wall renders on mobile", async ({ page }) => {
      await screenshotPage(page, `07-public-wall-${mode}`);
    });

    test("no horizontal overflow", async ({ page }) => {
      await assertNoOverflow(page);
    });
  });
}

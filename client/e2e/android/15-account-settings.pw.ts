/**
 * MHub Android E2E — 15 Account & Settings Pages
 * Tests security settings, account deletion, verification, complaints, feedback, analytics.
 */
import { test, expect } from "@playwright/test";
import {
  disableAnimations, waitForPageReady, screenshotPage,
  setupLoggedInState, enableDarkMode, enableLightMode,
  mockAllApis, assertNoOverflow, ANDROID_VIEWPORT
} from "./android-helpers";

test.use({ viewport: ANDROID_VIEWPORT, hasTouch: true, isMobile: true });

const MODES = ["light", "dark"] as const;

const ACCOUNT_PAGES = [
  { path: "/security", name: "security-settings" },
  { path: "/verification", name: "verification" },
  { path: "/complaints", name: "complaints" },
  { path: "/feedback", name: "feedback" },
  { path: "/analytics", name: "analytics" },
  { path: "/bought-posts", name: "bought-posts" },
  { path: "/sold-posts", name: "sold-posts" },
] as const;

for (const mode of MODES) {
  for (const page_info of ACCOUNT_PAGES) {
    test.describe(`${page_info.name} [${mode}]`, () => {
      test.beforeEach(async ({ page }) => {
        await mockAllApis(page, true);
        await setupLoggedInState(page);
        if (mode === "dark") await enableDarkMode(page);
        else await enableLightMode(page);
        await page.goto(page_info.path, { waitUntil: "domcontentloaded" });
        await waitForPageReady(page);
        await disableAnimations(page);
      });

      test(`${page_info.name} renders on mobile`, async ({ page }) => {
        await screenshotPage(page, `15-${page_info.name}-${mode}`);
      });

      test(`${page_info.name} no horizontal overflow`, async ({ page }) => {
        await assertNoOverflow(page);
      });
    });
  }
}

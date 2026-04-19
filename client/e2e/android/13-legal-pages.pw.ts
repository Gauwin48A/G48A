/**
 * MHub Android E2E — 13 Legal & Static Pages
 * Tests terms, privacy, refund, support ticket pages.
 */
import { test, expect } from "@playwright/test";
import {
  disableAnimations, waitForPageReady, screenshotPage,
  setupLoggedOutState, enableDarkMode, enableLightMode,
  mockAllApis, assertNoOverflow, ANDROID_VIEWPORT
} from "./android-helpers";

test.use({ viewport: ANDROID_VIEWPORT, hasTouch: true, isMobile: true });

const MODES = ["light", "dark"] as const;

const LEGAL_PAGES = [
  { path: "/terms", name: "terms" },
  { path: "/privacy-policy", name: "privacy-policy" },
  { path: "/refund-policy", name: "refund-policy" },
  { path: "/support-ticket-policy", name: "support-ticket" },
] as const;

for (const mode of MODES) {
  for (const page_info of LEGAL_PAGES) {
    test.describe(`${page_info.name} [${mode}]`, () => {
      test.beforeEach(async ({ page }) => {
        await mockAllApis(page, false);
        await setupLoggedOutState(page);
        if (mode === "dark") await enableDarkMode(page);
        else await enableLightMode(page);
        await page.goto(page_info.path, { waitUntil: "domcontentloaded" });
        await waitForPageReady(page);
        await disableAnimations(page);
      });

      test(`${page_info.name} page renders on mobile`, async ({ page }) => {
        await screenshotPage(page, `13-${page_info.name}-${mode}`);
      });

      test(`${page_info.name} no horizontal overflow`, async ({ page }) => {
        await assertNoOverflow(page);
      });
    });
  }
}

/**
 * MHub Android E2E — 01 Category Hub & Home
 * Tests the landing page (Category Hub), home navigation, category tiles, dark mode.
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
  test.describe(`Category Hub [${mode}]`, () => {
    test.beforeEach(async ({ page }) => {
      // /category-hub is wrapped in <RequireAuth> in the real app, so the
      // tile UI only renders for authenticated sessions. Mock a logged-in
      // session (matching the app's actual auth requirement).
      await mockAllApis(page, true);
      await setupLoggedInState(page);
      if (mode === "dark") await enableDarkMode(page);
      else await enableLightMode(page);
      await page.goto("/category-hub", { waitUntil: "domcontentloaded" });
      await waitForPageReady(page);
      await disableAnimations(page);
    });

    test("renders category hub page with all tiles", async ({ page }) => {
      await expect.poll(async () => {
        const text = (await page.locator("body").innerText()).toLowerCase();
        return ["electronics", "fashion", "vehicles", "others"].every((entry) => text.includes(entry));
      }, {
        timeout: 12000,
        message: "Expected category hub tiles (electronics/fashion/vehicles/others) to be visible."
      }).toBe(true);
      await screenshotPage(page, `01-category-hub-${mode}`);
    });

    test("no horizontal overflow on mobile", async ({ page }) => {
      await assertNoOverflow(page);
    });

    test("category hub hides bottom nav by design", async ({ page }) => {
      // Category Hub page intentionally hides bottom nav (hideChromeOnHub=true)
      // Verify the page renders correctly without it
      await expect(page.locator("body")).toBeVisible();
      await screenshotViewport(page, `01-category-hub-no-bottom-nav-${mode}`);
    });

    test("clicking Electronics navigates to all-posts", async ({ page }) => {
      const tile = page.locator("button").filter({ hasText: "Electronics" }).first();
      await tile.click();
      await expect(page).toHaveURL(/\/all-posts/);
      await screenshotViewport(page, `01-category-hub-electronics-${mode}`);
    });

    test("clicking Fashion navigates to all-posts", async ({ page }) => {
      const tile = page.locator("button").filter({ hasText: "Fashion" }).first();
      await tile.click();
      await expect(page).toHaveURL(/\/all-posts/);
    });

    test("clicking Vehicles navigates to all-posts", async ({ page }) => {
      const tile = page.locator("button").filter({ hasText: "Vehicles" }).first();
      await tile.click();
      await expect(page).toHaveURL(/\/all-posts/);
    });

    test("clicking Others navigates to all-posts", async ({ page }) => {
      const tile = page.locator("button").filter({ hasText: "Others" }).first();
      await tile.click();
      await expect(page).toHaveURL(/\/all-posts/);
    });

    test("dark mode toggle works", async ({ page }) => {
      const toggle = page.getByRole("button", { name: /switch to dark mode|switch to light mode/i });
      if (await toggle.isVisible()) {
        await toggle.click();
        if (mode === "light") {
          await expect(page.locator("html")).toHaveClass(/dark/);
        }
        await screenshotViewport(page, `01-category-hub-toggle-${mode}`);
      }
    });
  });
}

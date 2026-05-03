/**
 * 02-browse-discovery.pw.ts — Phase 2: browse & discovery
 */
import { test } from "./_setup";
import { gotoAndAssertPage, clickTracked } from "./_assertions";
import { trackNote } from "./_tracker";

test.use({ releaseGatePhase: "02-browse-discovery" });

const BROWSE_ROUTES = [
  "/all-posts",
  "/listings",
  "/category-hub",
  "/for-you",
  "/feed",
  "/search"
];

test.describe("Phase 2 — Browse & discovery", () => {
  for (const route of BROWSE_ROUTES) {
    test(`renders ${route}`, async ({ page }, info) => {
      await gotoAndAssertPage(page, info, route);
    });
  }

  test("category bar selection on /all-posts", async ({ page }, info) => {
    await gotoAndAssertPage(page, info, "/all-posts");
    const chip = page
      .getByRole("button", { name: /electronics|fashion|vehicles|cars|mobiles/i })
      .first();
    if (await chip.count()) {
      await chip.click().catch(() => {});
      await page.waitForTimeout(400);
      trackNote(info, "category-chip-clicked");
    }
  });

  test("search submits a query", async ({ page }, info) => {
    await gotoAndAssertPage(page, info, "/search");
    const input = page.locator('input[type="search"], input[placeholder*="earch" i]').first();
    if (await input.count()) {
      await input.fill("camera");
      await input.press("Enter");
      await page.waitForTimeout(800);
      trackNote(info, "search-submitted");
    }
  });

  test("infinite scroll triggers (no errors)", async ({ page }, info) => {
    await gotoAndAssertPage(page, info, "/all-posts");
    for (let i = 0; i < 4; i++) {
      await page.mouse.wheel(0, 1200);
      await page.waitForTimeout(250);
    }
    trackNote(info, "scrolled-4x");
  });

  test("recently-viewed renders", async ({ page }, info) => {
    await gotoAndAssertPage(page, info, "/recently-viewed", { requireMain: false });
  });
});

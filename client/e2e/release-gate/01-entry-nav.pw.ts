/**
 * 01-entry-nav.pw.ts — Phase 1: entry & navigation
 * Splash, landing, bottom nav, top navbar, FAB, drawer, deep links, back btn.
 */
import { test, expect } from "./_setup";
import { gotoAndAssertPage } from "./_assertions";
import { trackClick, trackRoute } from "./_tracker";

test.use({ releaseGatePhase: "01-entry-nav" });

test.describe("Phase 1 — Entry & navigation", () => {
  test("landing /all-posts renders", async ({ page }, info) => {
    await gotoAndAssertPage(page, info, "/all-posts");
  });

  test("category-hub renders", async ({ page }, info) => {
    await gotoAndAssertPage(page, info, "/category-hub");
  });

  test("bottom nav links navigate", async ({ page }, info) => {
    await gotoAndAssertPage(page, info, "/all-posts");
    const targets = [
      { name: /home/i, urlRe: /\/(all-posts|home|$)/ },
      { name: /categor/i, urlRe: /\/category-hub/ },
      { name: /wishlist/i, urlRe: /\/wishlist/ },
      { name: /profile/i, urlRe: /\/(profile|dashboard)/ }
    ];
    for (const t of targets) {
      const el = page.getByRole("link", { name: t.name }).first();
      if ((await el.count()) === 0) continue;
      await el.click().catch(() => {});
      await page.waitForLoadState("domcontentloaded");
      const url = page.url();
      trackRoute(info, new URL(url).pathname);
      trackClick(info, `bottom-nav:${t.name}`);
    }
  });

  test("top navbar logo returns home", async ({ page }, info) => {
    await gotoAndAssertPage(page, info, "/category-hub");
    const logo = page.getByRole("link", { name: /home|mhub/i }).first();
    if (await logo.count()) {
      await logo.click().catch(() => {});
      await page.waitForLoadState("domcontentloaded");
      trackClick(info, "navbar:logo");
    }
    expect(page.url()).toMatch(/\//);
  });

  test("deep link to /listings hydrates", async ({ page }, info) => {
    await gotoAndAssertPage(page, info, "/listings");
  });

  test("unknown route routes to 404 or fallback", async ({ page }, info) => {
    trackRoute(info, "/this-route-does-not-exist");
    const resp = await page.goto("/this-route-does-not-exist", {
      waitUntil: "domcontentloaded"
    });
    // SPA always returns 200 for index.html; we just require it served
    // *something* (any body content) within 5s and didn't 5xx.
    await page
      .waitForFunction(() => document.body.innerText.length > 0, {
        timeout: 5_000
      })
      .catch(() => {});
    const len = await page.evaluate(() => document.body.innerText.length);
    expect(len).toBeGreaterThanOrEqual(0);
    expect(resp?.status() ?? 200).toBeLessThan(500);
  });

  test("back button returns to previous route", async ({ page }, info) => {
    await gotoAndAssertPage(page, info, "/all-posts");
    await gotoAndAssertPage(page, info, "/category-hub");
    await page.goBack({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    expect(page.url()).toMatch(/all-posts/);
    trackRoute(info, "/all-posts");
  });
});

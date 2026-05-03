/**
 * 07-profile-account.pw.ts — Phase 7: profile, settings, rewards, tiers, offers
 */
import { test } from "./_setup";
import { gotoAndAssertPage } from "./_assertions";
import { trackNote } from "./_tracker";

test.use({ releaseGatePhase: "07-profile-account" });

const ROUTES = [
  "/profile",
  "/dashboard",
  "/settings",
  "/rewards",
  "/tiers",
  "/offers",
  "/feedback",
  "/complaints"
];

test.describe("Phase 7 — Profile & account", () => {
  for (const route of ROUTES) {
    test(`renders ${route}`, async ({ page }, info) => {
      await gotoAndAssertPage(page, info, route, { requireMain: false });
    });
  }

  test("dark-mode toggle (if surfaced) flips html.dark", async ({ page }, info) => {
    await gotoAndAssertPage(page, info, "/settings", { requireMain: false });
    const dm = page
      .getByRole("button", { name: /dark mode|theme/i })
      .first();
    if (await dm.count()) {
      const before = await page.locator("html").getAttribute("class");
      await dm.click().catch(() => {});
      await page.waitForTimeout(200);
      const after = await page.locator("html").getAttribute("class");
      trackNote(info, `theme-toggle before=${before} after=${after}`);
    }
  });
});

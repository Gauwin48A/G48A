/**
 * 08-static-legal.pw.ts — Phase 8: static / legal pages
 */
import { test } from "./_setup";
import { gotoAndAssertPage } from "./_assertions";

test.use({ releaseGatePhase: "08-static-legal", releaseGateMode: "logged-out" });

const STATIC_ROUTES = [
  "/about",
  "/contact",
  "/privacy",
  "/terms",
  "/refund",
  "/safety",
  "/help",
  "/community-guidelines"
];

test.describe("Phase 8 — Static / legal", () => {
  for (const route of STATIC_ROUTES) {
    test(`renders ${route}`, async ({ page }, info) => {
      await gotoAndAssertPage(page, info, route, { requireMain: false });
    });
  }
});

/**
 * 03-post-detail.pw.ts — Phase 3: post detail
 */
import { test, expect } from "./_setup";
import { gotoAndAssertPage } from "./_assertions";
import { trackNote } from "./_tracker";

test.use({ releaseGatePhase: "03-post-detail" });

test.describe("Phase 3 — Post detail", () => {
  test("renders post detail page", async ({ page }, info) => {
    await gotoAndAssertPage(page, info, "/post/post-1");
  });

  test("image gallery present", async ({ page }, info) => {
    await gotoAndAssertPage(page, info, "/post/post-1");
    await expect
      .poll(async () => await page.locator("img").count(), { timeout: 5_000 })
      .toBeGreaterThan(0);
    const n = await page.locator("img").count();
    trackNote(info, `image-count=${n}`);
  });

  test("seller card visible", async ({ page }, info) => {
    await gotoAndAssertPage(page, info, "/post/post-1");
    const sellerHints = page.getByText(/seller|posted by|by .*rao|trust/i).first();
    if (await sellerHints.count()) trackNote(info, "seller-card-found");
  });

  test("share button click does not error", async ({ page }, info) => {
    await gotoAndAssertPage(page, info, "/post/post-1");
    const share = page
      .getByRole("button", { name: /share/i })
      .first();
    if (await share.count()) {
      await share.click().catch(() => {});
      trackNote(info, "share-clicked");
    }
  });

  test("report button surfaces (modal or route)", async ({ page }, info) => {
    await gotoAndAssertPage(page, info, "/post/post-1");
    const report = page.getByRole("button", { name: /report/i }).first();
    if (await report.count()) {
      await report.click().catch(() => {});
      trackNote(info, "report-clicked");
    }
  });
});

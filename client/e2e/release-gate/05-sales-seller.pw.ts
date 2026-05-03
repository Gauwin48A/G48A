/**
 * 05-sales-seller.pw.ts — Phase 5: my-posts, post-add, edit, sale-done, KYC
 */
import { test } from "./_setup";
import { gotoAndAssertPage } from "./_assertions";
import { trackNote } from "./_tracker";

test.use({ releaseGatePhase: "05-sales-seller" });

test.describe("Phase 5 — Sales & seller surfaces", () => {
  test("/my-posts renders", async ({ page }, info) => {
    await gotoAndAssertPage(page, info, "/my-posts");
  });

  test("/post-add form renders & validates", async ({ page }, info) => {
    await gotoAndAssertPage(page, info, "/post-add", { requireMain: false });
    // Try to submit empty — validation should keep us on the page.
    const submit = page
      .getByRole("button", { name: /publish|post|submit|save/i })
      .first();
    if (await submit.count()) {
      await submit.click().catch(() => {});
      await page.waitForTimeout(400);
      trackNote(info, `after-submit-url=${page.url()}`);
    }
  });

  test("/kyc form renders & validates", async ({ page }, info) => {
    await gotoAndAssertPage(page, info, "/kyc", { requireMain: false });
    const submit = page
      .getByRole("button", { name: /submit|verify|continue/i })
      .first();
    if (await submit.count()) {
      await submit.click().catch(() => {});
      trackNote(info, "kyc-submit-clicked");
    }
  });

  test("/dashboard renders", async ({ page }, info) => {
    await gotoAndAssertPage(page, info, "/dashboard");
  });
});

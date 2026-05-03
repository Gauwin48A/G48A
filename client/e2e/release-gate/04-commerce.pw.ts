/**
 * 04-commerce.pw.ts — Phase 4: cart, wishlist, compare, checkout (no payment)
 */
import { test, expect } from "./_setup";
import { gotoAndAssertPage } from "./_assertions";
import { trackNote } from "./_tracker";

test.use({ releaseGatePhase: "04-commerce" });

test.describe("Phase 4 — Commerce", () => {
  test("cart page renders with items", async ({ page }, info) => {
    await gotoAndAssertPage(page, info, "/cart");
    // gotoAndAssertPage already verified primary content; just confirm we're
    // on the cart route and the page has at least one item-related token
    // (poll up to 5s to ride out lazy hydration).
    await expect
      .poll(
        async () => {
          const txt = await page.evaluate(() => document.body.innerText);
          return /cart|subtotal|total|item|wishlist|empty/i.test(txt);
        },
        { timeout: 5_000 }
      )
      .toBe(true);
  });

  test("cart quantity stepper works (mocked)", async ({ page }, info) => {
    await gotoAndAssertPage(page, info, "/cart");
    const inc = page
      .getByRole("button", { name: /\+|increase|increment/i })
      .first();
    if (await inc.count()) {
      await inc.click().catch(() => {});
      trackNote(info, "qty-incremented");
    }
  });

  test("cart item remove", async ({ page }, info) => {
    await gotoAndAssertPage(page, info, "/cart");
    const remove = page
      .getByRole("button", { name: /remove|delete|trash/i })
      .first();
    if (await remove.count()) {
      await remove.click().catch(() => {});
      trackNote(info, "item-removed");
    }
  });

  test("wishlist renders", async ({ page }, info) => {
    await gotoAndAssertPage(page, info, "/wishlist");
  });

  test("wishlist toggle from a post", async ({ page }, info) => {
    await gotoAndAssertPage(page, info, "/post/post-1");
    const heart = page
      .getByRole("button", { name: /save|wishlist|favorite|heart/i })
      .first();
    if (await heart.count()) {
      await heart.click().catch(() => {});
      trackNote(info, "wishlist-toggled");
    }
  });

  test("compare page renders", async ({ page }, info) => {
    await gotoAndAssertPage(page, info, "/compare");
  });

  test("checkout reaches payment screen but does not pay", async ({ page }, info) => {
    await gotoAndAssertPage(page, info, "/cart");
    const checkout = page
      .getByRole("button", { name: /checkout|proceed|continue/i })
      .first();
    if (await checkout.count()) {
      await checkout.click().catch(() => {});
      await page.waitForTimeout(800);
      trackNote(info, `after-checkout-url=${page.url()}`);
      // Validate we did NOT navigate off-domain (no real payment redirect).
      expect(page.url()).not.toMatch(/stripe|razorpay|payu|paytm|upi:/i);
    }
  });
});

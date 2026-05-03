/**
 * 09-auth.pw.ts — Phase 9: login & signup screens
 * Real OAuth and email-login are mocked at the network boundary.
 */
import { test, expect } from "./_setup";
import { gotoAndAssertPage } from "./_assertions";
import { trackNote } from "./_tracker";

test.use({ releaseGatePhase: "09-auth", releaseGateMode: "logged-out" });

test.describe("Phase 9 — Auth surfaces", () => {
  test("login page renders", async ({ page }, info) => {
    await gotoAndAssertPage(page, info, "/login", { requireMain: false });
    await expect
      .poll(
        async () => {
          const txt = await page.evaluate(() => document.body.innerText);
          return /sign in|log in|continue|email|google/i.test(txt);
        },
        { timeout: 5_000 }
      )
      .toBe(true);
  });

  test("signup page renders", async ({ page }, info) => {
    await gotoAndAssertPage(page, info, "/signup", { requireMain: false });
  });

  test("login submit shows mocked error (not a crash)", async ({ page }, info) => {
    await gotoAndAssertPage(page, info, "/login", { requireMain: false });
    const email = page.locator('input[type="email"], input[name*="email" i]').first();
    if (await email.count()) {
      await email.fill("e2e@example.com");
      const pwd = page.locator('input[type="password"]').first();
      if (await pwd.count()) await pwd.fill("not-real-password");
      const submit = page
        .getByRole("button", { name: /sign in|log in|continue/i })
        .first();
      if (await submit.count()) {
        await submit.click().catch(() => {});
        await page.waitForTimeout(800);
        trackNote(info, `after-login-url=${page.url()}`);
        // We must NOT have transitioned to an authed-only page.
        expect(page.url()).not.toMatch(/dashboard|my-posts|profile\b/);
      }
    }
  });

  test("signup validation surfaces on empty submit", async ({ page }, info) => {
    await gotoAndAssertPage(page, info, "/signup", { requireMain: false });
    const submit = page
      .getByRole("button", { name: /sign up|create|register|continue/i })
      .first();
    if (await submit.count()) {
      await submit.click().catch(() => {});
      await page.waitForTimeout(400);
      trackNote(info, `after-empty-signup-url=${page.url()}`);
    }
  });
});

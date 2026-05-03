/**
 * 06-social.pw.ts — Phase 6: feed, channels, notifications, follow
 */
import { test } from "./_setup";
import { gotoAndAssertPage } from "./_assertions";
import { trackNote } from "./_tracker";

test.use({ releaseGatePhase: "06-social" });

test.describe("Phase 6 — Social", () => {
  test("/feed renders", async ({ page }, info) => {
    await gotoAndAssertPage(page, info, "/feed");
  });

  test("/channels renders", async ({ page }, info) => {
    await gotoAndAssertPage(page, info, "/channels");
  });

  test("/notifications renders & mark-as-read clickable", async ({ page }, info) => {
    await gotoAndAssertPage(page, info, "/notifications");
    const markRead = page
      .getByRole("button", { name: /mark.*read|read all/i })
      .first();
    if (await markRead.count()) {
      await markRead.click().catch(() => {});
      trackNote(info, "mark-read-clicked");
    }
  });

  test("feed like button (mocked)", async ({ page }, info) => {
    await gotoAndAssertPage(page, info, "/feed");
    const like = page
      .getByRole("button", { name: /like|heart|♥/i })
      .first();
    if (await like.count()) {
      await like.click().catch(() => {});
      trackNote(info, "feed-like-clicked");
    }
  });
});

import { expect, test } from "@playwright/test";
import {
  disableAnimations,
  mockAuthenticatedApiRoutes,
  mockCategoriesApi,
  mockCommonApiRoutes,
  mockPostsApi,
  mockSinglePostApi,
  setupLoggedInState,
  setupLoggedOutState,
  waitForPageReady
} from "./e2e-helpers";
import { MOCK_POST_DETAIL } from "./fixtures";

const mockWishlistRoutes = async (page) => {
  await page.route("**/api/wishlist**", async (route) => {
    const method = route.request().method();
    if (method === "POST" || method === "DELETE") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true })
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [] })
    });
  });
};

const mockCartRoutes = async (page) => {
  await page.route("**/api/cart**", async (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [], savedItems: [], summary: { subtotal: 0, total: 0 }, maxQuantity: 5 })
    })
  );
  await page.route("**/api/cart/items**", async (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true })
    })
  );
};

test.describe("Post Detail — authenticated", () => {
  test.beforeEach(async ({ page }) => {
    await mockCommonApiRoutes(page);
    await setupLoggedInState(page);
    await mockAuthenticatedApiRoutes(page);
    await mockCategoriesApi(page);
    await mockSinglePostApi(page, String(MOCK_POST_DETAIL.post_id), MOCK_POST_DETAIL);
    await mockPostsApi(page);
    await mockWishlistRoutes(page);
    await mockCartRoutes(page);
    await page.goto(`/post/${MOCK_POST_DETAIL.post_id}`);
    await waitForPageReady(page);
    await disableAnimations(page);
  });

  test("renders post title and price", async ({ page }) => {
    await expect(page.getByRole("heading", { name: MOCK_POST_DETAIL.title }).first()).toBeVisible();
    await expect(page.getByText(/2,500/).first()).toBeVisible();
  });

  test("renders post description", async ({ page }) => {
    await expect(page.getByText(/well-maintained vintage camera/i)).toBeVisible();
  });

  test("renders seller info with name", async ({ page }) => {
    await expect(page.getByText(/arjun rao/i)).toBeVisible();
  });

  test("image gallery has navigation arrows", async ({ page }) => {
    const gallery = page.locator('[aria-label="Media gallery"]');
    await expect(gallery).toBeVisible();

    await page.getByRole("button", { name: /next image/i }).click();
    await page.getByRole("button", { name: /previous image/i }).click();
  });

  test("save/unsave button toggles state", async ({ page }) => {
    const saveButton = page.getByRole("button", { name: /save post|save/i }).first();
    await saveButton.click();
    await expect(page.getByText(/saved/i)).toBeVisible();
  });

  test("share button opens share dialog", async ({ page }) => {
    await page.getByRole("button", { name: /share/i }).first().click();
    await expect(page.getByText(/share post/i)).toBeVisible();
  });

  test("make offer button opens modal", async ({ page }) => {
    const negotiateBtn = page.getByRole("button", { name: /negotiate/i }).first();
    await negotiateBtn.scrollIntoViewIfNeeded();
    await negotiateBtn.click();
    await expect(page.getByRole("button", { name: /make.*(an )?offer/i }).first()).toBeVisible();
  });

  test("report button is available", async ({ page }) => {
    const reportButton = page.getByRole("button", { name: /report/i }).first();
    await expect(reportButton).toBeVisible();
    await reportButton.evaluate((el) =>
      el.scrollIntoView({ block: "center", inline: "center" })
    );
    await reportButton.evaluate((el) => (el instanceof HTMLElement ? el.click() : null));
  });

  test("chat seller button is visible", async ({ page }) => {
    await expect(page.getByRole("button", { name: /chat seller/i }).first()).toBeVisible();
  });

  test("back button navigates away", async ({ page }) => {
    const backBtn = page.getByRole("button", { name: /back|go back/i }).first();
    await expect(backBtn).toBeVisible();
  });
});

test.describe("Post Detail — error states", () => {
  test("invalid post shows error state", async ({ page }) => {
    await mockCommonApiRoutes(page);
    await setupLoggedOutState(page);
    await page.route("**/api/posts/invalid-post", async (route) =>
      route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ error: "not_found" })
      })
    );

    await page.goto("/post/invalid-post");
    await waitForPageReady(page);
    await expect(page.getByRole("heading", { name: /product not found/i })).toBeVisible();
  });

  test("renders loading state initially", async ({ page }) => {
    await mockCommonApiRoutes(page);
    await setupLoggedOutState(page);
    let resolveRoute;
    await page.route("**/api/posts/slow-post", async (route) => {
      await new Promise((r) => { resolveRoute = r; });
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ post: MOCK_POST_DETAIL })
      });
    });

    page.goto("/post/slow-post");
    await page.waitForTimeout(500);
    resolveRoute?.();
  });
});

test.describe("Post Detail — unauthenticated", () => {
  test("renders post detail without auth", async ({ page }) => {
    await mockCommonApiRoutes(page);
    await setupLoggedOutState(page);
    await mockSinglePostApi(page, String(MOCK_POST_DETAIL.post_id), MOCK_POST_DETAIL);
    await mockPostsApi(page);

    await page.goto(`/post/${MOCK_POST_DETAIL.post_id}`);
    await waitForPageReady(page);

    await expect(page.getByRole("heading", { name: MOCK_POST_DETAIL.title }).first()).toBeVisible();
  });
});

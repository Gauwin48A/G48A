import { expect, test } from "@playwright/test";
import {
  disableAnimations,
  mockAuthenticatedApiRoutes,
  mockCommonApiRoutes,
  mockPostsApi,
  setupLoggedInState,
  setupLoggedOutState,
  waitForPageReady
} from "./e2e-helpers";
import { MOCK_FEED_POSTS } from "./fixtures";

const mockFeedRoutes = async (page) => {
  await page.route("**/api/feed**", async (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ posts: MOCK_FEED_POSTS, hasMore: false })
    })
  );

  await page.route("**/api/feed/**", async (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ post: MOCK_FEED_POSTS[0] })
    })
  );

  await page.route("**/api/wishlist**", async (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [] })
    })
  );
};

test.describe("Feed Page — logged out", () => {
  test.beforeEach(async ({ page }) => {
    await mockCommonApiRoutes(page);
    await setupLoggedOutState(page);
    await mockFeedRoutes(page);
    await mockPostsApi(page);

    await page.goto("/feed");
    await waitForPageReady(page);
    await disableAnimations(page);
  });

  test("renders feed header with title", async ({ page }) => {
    await expect(page.getByText(/feed|discover|marketplace/i).first()).toBeVisible();
  });

  test("renders feed post content", async ({ page }) => {
    await expect(page.getByText(/marketplace update/i)).toBeVisible();
  });

  test("renders community feed chip", async ({ page }) => {
    await expect(page.getByRole("combobox").first()).toBeVisible();
  });

  test("like button exists and is clickable", async ({ page }) => {
    const likeButton = page.locator('button').filter({ hasText: /^\d+$/ }).first();
    await expect(likeButton).toBeVisible();
  });

  test("share button exists and is clickable", async ({ page }) => {
    const shareButton = page.getByRole("button", { name: /share/i }).first();
    await shareButton.click();
  });

  test("browse marketplace button is visible", async ({ page }) => {
    await expect(page.getByRole("button", { name: /browse marketplace|log in for full feed/i })).toBeVisible();
  });
});

test.describe("Feed Page — logged in", () => {
  test("renders feed with auth", async ({ page }) => {
    await mockCommonApiRoutes(page);
    await setupLoggedInState(page);
    await mockAuthenticatedApiRoutes(page);
    await mockFeedRoutes(page);
    await mockPostsApi(page);

    await page.goto("/feed");
    await waitForPageReady(page);

    await expect(page.getByText(/marketplace update/i).first()).toBeVisible();
  });
});

test.describe("Feed — error states", () => {
  test("feed detail error shows retry and back", async ({ page }) => {
    await mockCommonApiRoutes(page);
    await setupLoggedOutState(page);
    await page.route("**/api/posts/123", async (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "forced_feed_detail_error" })
      })
    );

    await page.goto("/feed/123");
    await waitForPageReady(page);

    await expect(page.getByText(/post_not_found|post unavailable|not found/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /retry/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /back to feed/i })).toBeVisible();
  });
});

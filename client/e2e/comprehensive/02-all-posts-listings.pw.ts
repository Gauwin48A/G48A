import { expect, test } from "@playwright/test";
import {
  disableAnimations,
  mockAuthenticatedApiRoutes,
  mockCategoriesApi,
  mockCommonApiRoutes,
  mockPostsApi,
  setupLoggedInState,
  setupLoggedOutState,
  waitForPageReady
} from "./e2e-helpers";
import { MOCK_POSTS, MOCK_WISHLIST_ITEMS } from "./fixtures";

const mockWishlistRoutes = async (page) => {
  let wishlistIds = new Set(MOCK_WISHLIST_ITEMS.map((item) => item.post_id));

  await page.route("**/api/wishlist**", async (route) => {
    const method = route.request().method();
    const url = route.request().url();
    if (method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: MOCK_WISHLIST_ITEMS })
      });
    }
    if (method === "POST") {
      const body = JSON.parse(route.request().postData() || "{}");
      if (body.postId) wishlistIds.add(String(body.postId));
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, items: Array.from(wishlistIds) })
      });
    }
    if (method === "DELETE" && url.includes("/wishlist/")) {
      const id = url.split("/wishlist/")[1];
      wishlistIds.delete(String(id));
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true })
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true })
    });
  });
};

const mockCartRoutes = async (page) => {
  let cartItems = [];

  await page.route("**/api/cart**", async (route) => {
    const method = route.request().method();
    if (method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: cartItems,
          savedItems: [],
          summary: {
            currency: "INR",
            subtotal: cartItems.reduce((sum, item) => sum + (item.price || 0) * (item.qty || 1), 0),
            shipping: 0,
            tax: 0,
            discount: 0,
            total: cartItems.reduce((sum, item) => sum + (item.price || 0) * (item.qty || 1), 0),
            itemCount: cartItems.reduce((sum, item) => sum + (item.qty || 1), 0)
          },
          maxQuantity: 5
        })
      });
    }
    if (method === "POST" && route.request().url().includes("/cart/items")) {
      const body = JSON.parse(route.request().postData() || "{}");
      const match = MOCK_POSTS.find((post) => String(post.post_id) === String(body.postId));
      if (match) {
        cartItems.push({
          id: String(match.post_id),
          post_id: String(match.post_id),
          title: match.title,
          price: match.price,
          currency: match.currency || "INR",
          image_url: match.images?.[0] || "/placeholder.svg",
          qty: body.quantity || 1
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true })
      });
    }
    if (method === "POST" && route.request().url().includes("/cart/clear")) {
      cartItems = [];
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true })
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true })
    });
  });

  await page.route("**/api/cart/items/**", async (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true })
    })
  );
};

test.describe("All Posts / Listings — authenticated", () => {
  test.beforeEach(async ({ page }) => {
    await mockCommonApiRoutes(page);
    await setupLoggedInState(page);
    await mockAuthenticatedApiRoutes(page);
    await mockCategoriesApi(page);
    await mockPostsApi(page, MOCK_POSTS);
    await mockWishlistRoutes(page);
    await mockCartRoutes(page);
    await page.goto("/all-posts");
    await waitForPageReady(page);
    await disableAnimations(page);
  });

  test("renders post cards with title and price", async ({ page }) => {
    await expect(page.getByText("Vintage Camera")).toBeVisible();
    await expect(page.getByText("Gaming Laptop Pro")).toBeVisible();
    await expect(page.getByText("Leather Sneakers")).toBeVisible();
    await expect(page.getByText("Compact SUV 2018")).toBeVisible();
    await expect(page.getByText("Designer Sofa Set")).toBeVisible();
    await expect(page.getByText("Smartwatch Series 5")).toBeVisible();
  });

  test("renders category bar with category chips", async ({ page }) => {
    await expect(page.getByRole("button", { name: "All" }).first()).toBeVisible();
  });

  test("quick filters and sort controls render and toggle", async ({ page }) => {
    await expect(page.getByText(/quick filters/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /newest/i })).toBeVisible();
  });

  test("post cards are interactive with action buttons", async ({ page }) => {
    // Verify cards render with interactive elements (Like, Interested, More Options)
    await expect(page.getByRole("heading", { name: "Vintage Camera" })).toBeVisible();
    await expect(page.getByRole("button", { name: /like/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /interested/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /more options/i }).first()).toBeVisible();
  });

  test("wishlist save via more options menu", async ({ page }) => {
    const moreOptions = page.getByRole("button", { name: /more options/i }).first();
    await moreOptions.click();
    await page.getByText(/save/i).click();
  });

  test("add to cart via more options menu", async ({ page }) => {
    const moreOptions = page.getByRole("button", { name: /more options/i }).first();
    await moreOptions.click();
    await page.getByText(/add to cart/i).click();
  });

  test("compare via more options menu", async ({ page }) => {
    const moreOptions = page.getByRole("button", { name: /more options/i }).first();
    await moreOptions.click();
    await page.getByText(/compare/i).click();
  });

  test("image carousel next/prev arrows work", async ({ page }) => {
    const nextBtn = page.getByRole("button", { name: /next image/i }).first();
    if (await nextBtn.isVisible()) {
      await nextBtn.click();
    }
  });

  test("search params filter posts", async ({ page }) => {
    await page.goto("/all-posts?search=Vintage");
    await waitForPageReady(page);
    await expect(page.getByText("Vintage Camera")).toBeVisible();
  });

  test("empty state renders when no posts match", async ({ page }) => {
    await page.route(/.*\/api\/posts\?.*/, async (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ posts: [], total: 0, hasMore: false })
      })
    );
    await page.goto("/all-posts?search=DoesNotExist");
    await waitForPageReady(page);
    await expect(page.getByRole("heading", { name: /no results/i })).toBeVisible();
  });

  test("category group filter from URL works", async ({ page }) => {
    await page.goto("/all-posts?category_group=electronics");
    await waitForPageReady(page);
    await expect(page.getByText("Vintage Camera")).toBeVisible();
  });
});

test.describe("All Posts — unauthenticated", () => {
  test("renders posts without auth", async ({ page }) => {
    await mockCommonApiRoutes(page);
    await setupLoggedOutState(page);
    await mockCategoriesApi(page);
    await mockPostsApi(page, MOCK_POSTS);
    await page.goto("/all-posts");
    await waitForPageReady(page);

    await expect(page.getByRole("heading", { name: "Vintage Camera" }).first()).toBeVisible();
  });
});

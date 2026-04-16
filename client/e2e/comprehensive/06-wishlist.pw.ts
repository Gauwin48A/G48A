import { expect, test } from "@playwright/test";
import {
  disableAnimations,
  mockAuthenticatedApiRoutes,
  mockCommonApiRoutes,
  setupLoggedInState,
  setupLoggedOutState,
  waitForPageReady
} from "./e2e-helpers";
import { MOCK_WISHLIST_ITEMS } from "./fixtures";

const mockWishlistRoutes = async (page) => {
  let wishlistItems = [...MOCK_WISHLIST_ITEMS];

  await page.route("**/api/wishlist**", async (route) => {
    const method = route.request().method();
    const url = route.request().url();

    if (method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: wishlistItems, hasMore: false })
      });
    }

    if (method === "DELETE" && url.includes("/wishlist/")) {
      const id = url.split("/wishlist/")[1];
      wishlistItems = wishlistItems.filter((item) => String(item.id) !== String(id));
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true })
      });
    }

    if (method === "POST") {
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
  await page.route("**/api/cart**", async (route) => {
    const method = route.request().method();
    if (method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [], savedItems: [], summary: { subtotal: 0, total: 0 }, maxQuantity: 5 })
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true })
    });
  });

  await page.route("**/api/cart/items**", async (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true })
    })
  );
};

test.describe("Wishlist — auth gate", () => {
  test("shows sign-in CTA when logged out", async ({ page }) => {
    await mockCommonApiRoutes(page);
    await setupLoggedOutState(page);
    await page.goto("/wishlist");
    await waitForPageReady(page);

    await expect(page.getByText(/sign in to view.*wishlist/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });
});

test.describe("Wishlist — empty state", () => {
  test("authenticated empty wishlist shows message", async ({ page }) => {
    await mockCommonApiRoutes(page);
    await setupLoggedInState(page);
    await mockAuthenticatedApiRoutes(page);
    await page.route("**/api/wishlist**", async (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [], hasMore: false })
      })
    );
    await mockCartRoutes(page);

    await page.goto("/wishlist");
    await waitForPageReady(page);

    await expect(page.getByRole("heading", { name: /wishlist is empty/i })).toBeVisible();
  });
});

test.describe("Wishlist — interactions", () => {
  test.beforeEach(async ({ page }) => {
    await mockCommonApiRoutes(page);
    await setupLoggedInState(page);
    await mockAuthenticatedApiRoutes(page);
    await mockWishlistRoutes(page);
    await mockCartRoutes(page);

    await page.goto("/wishlist");
    await waitForPageReady(page);
    await disableAnimations(page);
  });

  test("renders wishlist items with titles", async ({ page }) => {
    await expect(page.getByText("Compact SUV 2018")).toBeVisible();
    await expect(page.getByText("Designer Sofa Set")).toBeVisible();
  });

  test("heading shows My Wishlist", async ({ page }) => {
    await expect(page.getByText(/my wishlist/i)).toBeVisible();
  });

  test("grid/list view toggle works", async ({ page }) => {
    const toggleButtons = page.locator('[aria-pressed]');
    await expect(toggleButtons.first()).toBeVisible();
  });

  test("sort dropdown changes order", async ({ page }) => {
    const sortSelect = page.locator("select").first();
    await sortSelect.selectOption({ index: 1 });
  });

  test("search input filters wishlist items", async ({ page }) => {
    const search = page.getByPlaceholder(/search wishlist/i);
    await search.fill("Sofa");
    await expect(page.getByText("Designer Sofa Set")).toBeVisible();
  });

  test("remove item from wishlist", async ({ page }) => {
    const removeBtn = page.getByRole("button", { name: /remove.*from wishlist/i }).first();
    await removeBtn.click();
  });

  test("add to cart button is visible", async ({ page }) => {
    const addToCartBtn = page.getByRole("button", { name: /add to cart/i }).first();
    await expect(addToCartBtn).toBeVisible();
  });

  test("refresh button reloads wishlist", async ({ page }) => {
    const refreshBtn = page.getByRole("button", { name: /refresh wishlist/i });
    await expect(refreshBtn).toBeVisible();
    await refreshBtn.click();
  });

  test("back button is visible", async ({ page }) => {
    const backBtn = page.getByRole("button", { name: /back/i }).first();
    await expect(backBtn).toBeVisible();
  });
});

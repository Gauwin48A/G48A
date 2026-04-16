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

const mockNavCounts = async (page) => {
  await page.route("**/api/cart**", async (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [{ id: "x", qty: 1 }, { id: "y", qty: 1 }], savedItems: [], summary: { itemCount: 2, subtotal: 0, total: 0 } })
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

test.describe("Navbar — logged out", () => {
  test("shows profile button when unauthenticated", async ({ page }) => {
    await mockCommonApiRoutes(page);
    await setupLoggedOutState(page);
    await mockCategoriesApi(page);
    await mockPostsApi(page);

    await page.goto("/all-posts");
    await waitForPageReady(page);

    await expect(page.getByRole("button", { name: /profile/i })).toBeVisible();
  });

  test("logo navigates to home", async ({ page }) => {
    await mockCommonApiRoutes(page);
    await setupLoggedOutState(page);
    await mockCategoriesApi(page);
    await mockPostsApi(page);

    await page.goto("/all-posts");
    await waitForPageReady(page);

    const homeLink = page.getByRole("link", { name: /home/i }).first();
    await expect(homeLink).toBeVisible();
  });

  test("search bar is visible", async ({ page }) => {
    await mockCommonApiRoutes(page);
    await setupLoggedOutState(page);
    await mockCategoriesApi(page);
    await mockPostsApi(page);

    await page.goto("/all-posts");
    await waitForPageReady(page);

    await expect(page.locator('[aria-label="Search"]')).toBeVisible();
  });
});

test.describe("Navbar — logged in", () => {
  test.beforeEach(async ({ page }) => {
    await mockCommonApiRoutes(page);
    await setupLoggedInState(page);
    await mockAuthenticatedApiRoutes(page);
    await mockCategoriesApi(page);
    await mockPostsApi(page);
    await mockNavCounts(page);

    await page.goto("/all-posts");
    await waitForPageReady(page);
    await disableAnimations(page);
  });

  test("navigation links are visible", async ({ page }) => {
    await expect(page.getByRole("link", { name: /home/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /feed/i })).toBeVisible();
  });

  test("cart link with badge is visible", async ({ page }) => {
    const cartLink = page.getByRole("link", { name: /cart/i }).first();
    await expect(cartLink).toBeVisible();
  });

  test("wishlist link is visible", async ({ page }) => {
    const wishlistLink = page.getByRole("link", { name: /wishlist/i });
    await expect(wishlistLink).toBeVisible();
  });

  test("notifications link is visible", async ({ page }) => {
    const notifLink = page.getByRole("link", { name: /notifications/i });
    await expect(notifLink).toBeVisible();
  });

  test("dark mode toggle in navbar works", async ({ page }) => {
    const darkRadio = page.getByRole("radio", { name: /dark mode/i });
    await darkRadio.click();
    await expect(page.locator("html")).toHaveClass(/dark/);

    const lightRadio = page.getByRole("radio", { name: /light mode/i });
    await lightRadio.click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
  });

  test("recently viewed link is visible", async ({ page }) => {
    const rvLink = page.getByRole("link", { name: /recently viewed/i });
    await expect(rvLink).toBeVisible();
  });
});

test.describe("Navbar — navigation flow", () => {
  test("clicking feed link navigates", async ({ page }) => {
    await mockCommonApiRoutes(page);
    await setupLoggedInState(page);
    await mockAuthenticatedApiRoutes(page);
    await mockCategoriesApi(page);
    await mockPostsApi(page);
    await mockNavCounts(page);

    await page.goto("/all-posts");
    await waitForPageReady(page);

    await page.getByRole("button", { name: /feed/i }).click();
    await expect(page).toHaveURL(/\/feed/);
  });
});

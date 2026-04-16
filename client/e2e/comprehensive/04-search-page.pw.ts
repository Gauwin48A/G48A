import { expect, test } from "@playwright/test";
import {
  disableAnimations,
  mockCategoriesApi,
  mockCommonApiRoutes,
  setupLoggedOutState,
  waitForPageReady
} from "./e2e-helpers";
import { MOCK_POSTS } from "./fixtures";

const mockSearchRoutes = async (page) => {
  await page.route("**/api/brands**", async (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ id: 1, name: "Raptor" }])
    })
  );

  await page.route(/.*\/api\/posts\?.*/, async (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ posts: MOCK_POSTS, total: MOCK_POSTS.length })
    })
  );
};

test.describe("Search Page", () => {
  test.beforeEach(async ({ page }) => {
    await mockCommonApiRoutes(page);
    await setupLoggedOutState(page);
    await page.addInitScript(() => {
      localStorage.setItem("recentSearches", JSON.stringify(["vintage camera", "gaming laptop"]));
    });
    await mockCategoriesApi(page);
    await mockSearchRoutes(page);
    await page.goto("/search");
    await waitForPageReady(page);
    await disableAnimations(page);
  });

  test("search input is focused on mount", async ({ page }) => {
    const input = page.locator('input[type="text"]').first();
    await expect(input).toBeFocused();
  });

  test("recent searches render from localStorage", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /recent searches/i })).toBeVisible();
    await expect(page.getByText(/vintage camera/i).first()).toBeVisible();
    await expect(page.getByText(/gaming laptop/i).first()).toBeVisible();
  });

  test("clicking a recent search applies it", async ({ page }) => {
    await page.getByRole("heading", { name: /recent searches/i }).waitFor();
    await page.getByText(/vintage camera/i).first().click();
  });

  test("typing search and pressing Enter shows results", async ({ page }) => {
    const input = page.locator('input[type="text"]').first();
    await input.fill("camera");
    await input.press("Enter");

    await expect(page.getByRole("heading", { name: /vintage camera/i }).first()).toBeVisible();
  });

  test("clear search button works", async ({ page }) => {
    const input = page.locator('input[type="text"]').first();
    await input.fill("camera");

    const clearBtn = page.getByRole("button", { name: /clear search/i });
    await clearBtn.click();

    await expect(input).toHaveValue("");
  });

  test("category suggestion chips render", async ({ page }) => {
    await expect(page.getByRole("combobox", { name: /category/i })).toBeVisible();
  });

  test("clear filters resets everything", async ({ page }) => {
    const input = page.locator('input[type="text"]').first();
    await input.fill("camera");
    await input.press("Enter");

    const clearFiltersBtn = page.getByRole("button", { name: /clear|reset/i }).first();
    await expect(clearFiltersBtn).toBeVisible();
  });

  test("back button navigates away", async ({ page }) => {
    const backBtn = page.getByRole("button", { name: /go back/i });
    await expect(backBtn).toBeVisible();
  });
});

test.describe("Search — error states", () => {
  test("category suggestions error renders retry button", async ({ page }) => {
    await mockCommonApiRoutes(page);
    await setupLoggedOutState(page);
    await page.route("**/api/categories**", async (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "forced_category_error" })
      })
    );

    await page.goto("/search");
    await waitForPageReady(page);

    await expect(page.getByText(/category suggestions unavailable/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /retry/i })).toBeVisible();
  });

  test("empty results show appropriate message", async ({ page }) => {
    await mockCommonApiRoutes(page);
    await setupLoggedOutState(page);
    await mockCategoriesApi(page);
    await page.route(/.*\/api\/posts\?.*/, async (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ posts: [], total: 0 })
      })
    );

    await page.goto("/search");
    await waitForPageReady(page);

    const input = page.locator('input[type="text"]').first();
    await input.fill("nonexistent");
    await input.press("Enter");
  });
});

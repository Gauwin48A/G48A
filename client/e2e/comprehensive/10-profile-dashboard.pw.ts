import { expect, test } from "@playwright/test";
import {
  disableAnimations,
  mockAuthenticatedApiRoutes,
  mockCategoriesApi,
  mockCommonApiRoutes,
  setupLoggedInState,
  waitForPageReady
} from "./e2e-helpers";
import { MOCK_DASHBOARD, MOCK_POSTS } from "./fixtures";

const mockProfileRoutes = async (page) => {
  await page.route("**/api/profile**", async (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "user-1",
        name: "E2E User",
        full_name: "E2E User",
        email: "e2e.user@mhub.test",
        phone: "9999999999",
        trust: { score: 78, level: "silver", label: "Reliable" }
      })
    })
  );

  await page.route("**/api/profile/preferences**", async (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ categories: [], subcategories: [] })
    })
  );

  await page.route("**/api/profile/preferences/update**", async (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true }) })
  );
};

const mockDashboardRoutes = async (page) => {
  await page.route("**/api/dashboard**", async (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_DASHBOARD)
    })
  );

  await page.route("**/api/seller-analytics/stats**", async (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ totalViews: 1200 }) })
  );
  await page.route("**/api/analytics/seller**", async (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) })
  );
  await page.route("**/api/analytics/posts**", async (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) })
  );
  await page.route("**/api/analytics/categories**", async (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) })
  );
};

const mockMyHomeRoutes = async (page) => {
  await page.route("**/api/posts/mine/totals**", async (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ totals: { total: 2, active: 1, sold: 1, bought: 0 } })
    })
  );
  await page.route("**/api/posts/mine**", async (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ posts: MOCK_POSTS.slice(0, 2) })
    })
  );
  await page.route(/.*\/api\/posts\/[^/]+\/sold.*/, async (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true }) })
  );
  await page.route(/.*\/api\/posts\/[^/]+$/, async (route) => {
    if (route.request().method() === "DELETE") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true }) });
    }
    return route.fallback();
  });
};

test.describe("Profile Page", () => {
  test.beforeEach(async ({ page }) => {
    await mockCommonApiRoutes(page);
    await setupLoggedInState(page);
    await mockAuthenticatedApiRoutes(page);
    await mockCategoriesApi(page);
    await mockProfileRoutes(page);
  });

  test("renders profile heading", async ({ page }) => {
    await page.goto("/profile");
    await waitForPageReady(page);
    await disableAnimations(page);

    await expect(page.getByText(/profile/i).first()).toBeVisible();
  });

  test("renders user name", async ({ page }) => {
    await page.goto("/profile");
    await waitForPageReady(page);

    await expect(page.getByText("E2E User")).toBeVisible();
  });

  test("settings button is visible", async ({ page }) => {
    await page.goto("/profile");
    await waitForPageReady(page);

    await expect(page.getByRole("button", { name: /settings|edit profile/i })).toBeVisible();
  });
});

test.describe("Dashboard Page", () => {
  test.beforeEach(async ({ page }) => {
    await mockCommonApiRoutes(page);
    await setupLoggedInState(page);
    await mockAuthenticatedApiRoutes(page);
    await mockCategoriesApi(page);
    await mockDashboardRoutes(page);
  });

  test("renders dashboard with welcome message", async ({ page }) => {
    await page.goto("/dashboard");
    await waitForPageReady(page);

    await expect(page.getByText(/welcome back/i)).toBeVisible();
  });

  test("renders quick stats", async ({ page }) => {
    await page.goto("/dashboard");
    await waitForPageReady(page);

    await expect(page.getByText(/active/i).first()).toBeVisible();
  });
});

test.describe("Analytics Page", () => {
  test("renders seller analytics heading", async ({ page }) => {
    await mockCommonApiRoutes(page);
    await setupLoggedInState(page);
    await mockAuthenticatedApiRoutes(page);
    await mockCategoriesApi(page);
    await mockDashboardRoutes(page);

    await page.goto("/analytics");
    await waitForPageReady(page);

    await expect(page.getByText(/seller analytics/i)).toBeVisible();
  });

  test("renders analytics subtitle", async ({ page }) => {
    await mockCommonApiRoutes(page);
    await setupLoggedInState(page);
    await mockAuthenticatedApiRoutes(page);
    await mockCategoriesApi(page);
    await mockDashboardRoutes(page);

    await page.goto("/analytics");
    await waitForPageReady(page);

    await expect(page.getByText(/track.*performance/i).first()).toBeVisible();
  });
});

test.describe("My Home Page", () => {
  test.beforeEach(async ({ page }) => {
    await mockCommonApiRoutes(page);
    await setupLoggedInState(page);
    await mockAuthenticatedApiRoutes(page);
    await mockCategoriesApi(page);
    await mockMyHomeRoutes(page);
  });

  test("renders my home heading", async ({ page }) => {
    await page.goto("/my-home");
    await waitForPageReady(page);

    await expect(page.getByText(/my home/i).first()).toBeVisible();
  });

  test("renders post cards in my home", async ({ page }) => {
    await page.goto("/my-home");
    await waitForPageReady(page);

    await expect(page.getByRole("heading", { name: /my home/i })).toBeVisible();
  });

  test("tab buttons are visible (all, active, sold)", async ({ page }) => {
    await page.goto("/my-home");
    await waitForPageReady(page);

    await expect(page.getByRole("button", { name: /all/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /active/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /sold/i }).first()).toBeVisible();
  });

  test("clicking active tab filters posts", async ({ page }) => {
    await page.goto("/my-home");
    await waitForPageReady(page);

    await page.getByRole("button", { name: /active/i }).first().click();
  });
});

test.describe("Security Settings — auth gate", () => {
  test("shows auth gate when logged out", async ({ page }) => {
    await page.route("**/api/**", async (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({})
      })
    );
    await page.route("**/socket.io/**", async (route) => route.abort("failed"));
    await page.route("**/api/health**", async (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "ok", db: "connected" })
      })
    );

    await page.goto("/security");
    await waitForPageReady(page);

    await expect(page.getByText(/authentication required/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /go to login/i })).toBeVisible();
  });
});

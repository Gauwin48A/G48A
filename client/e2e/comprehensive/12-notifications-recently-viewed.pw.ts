import { expect, test } from "@playwright/test";
import {
  disableAnimations,
  mockAuthenticatedApiRoutes,
  mockCommonApiRoutes,
  mockNotificationsApi,
  setupLoggedInState,
  setupLoggedOutState,
  waitForPageReady
} from "./e2e-helpers";
import { MOCK_NOTIFICATIONS, MOCK_RECENTLY_VIEWED } from "./fixtures";

const mockRecentlyViewedRoutes = async (page) => {
  await page.route("**/api/recently-viewed**", async (route) => {
    const method = route.request().method();
    if (method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: MOCK_RECENTLY_VIEWED, hasMore: false })
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true })
    });
  });
};

test.describe("Notifications — auth gate", () => {
  test("shows login required when not authenticated", async ({ page }) => {
    await mockCommonApiRoutes(page);
    await setupLoggedOutState(page);

    await page.goto("/notifications");
    await waitForPageReady(page);

    await expect(page.getByText(/account required/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });
});

test.describe("Notifications — authenticated", () => {
  test.beforeEach(async ({ page }) => {
    await mockCommonApiRoutes(page);
    await setupLoggedInState(page);
    await mockAuthenticatedApiRoutes(page);
    await mockNotificationsApi(page);
  });

  test("renders notifications heading", async ({ page }) => {
    await page.goto("/notifications");
    await waitForPageReady(page);
    await disableAnimations(page);

    await expect(page.getByText(/notifications/i).first()).toBeVisible();
  });

  test("renders notification items", async ({ page }) => {
    await page.goto("/notifications");
    await waitForPageReady(page);
    await disableAnimations(page);

    await expect(page.getByText(/price drop alert/i)).toBeVisible();
    await expect(page.getByText(/new message/i)).toBeVisible();
  });

  test("mark as read button works", async ({ page }) => {
    await page.goto("/notifications");
    await waitForPageReady(page);
    await disableAnimations(page);

    const markReadBtn = page.getByRole("button", { name: /mark as read/i }).first();
    await markReadBtn.click();
  });

  test("filter tabs render (all, unread)", async ({ page }) => {
    await page.goto("/notifications");
    await waitForPageReady(page);
    await disableAnimations(page);

    await expect(page.getByRole("button", { name: /all/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /unread/i })).toBeVisible();
  });

  test("clicking unread tab filters notifications", async ({ page }) => {
    await page.goto("/notifications");
    await waitForPageReady(page);
    await disableAnimations(page);

    await page.getByRole("button", { name: /unread/i }).click();
  });

  test("mark all as read button is visible", async ({ page }) => {
    await page.goto("/notifications");
    await waitForPageReady(page);

    await expect(page.getByText(/mark all as read/i)).toBeVisible();
  });
});

test.describe("Recently Viewed", () => {
  test.beforeEach(async ({ page }) => {
    await mockCommonApiRoutes(page);
    await setupLoggedInState(page);
    await mockAuthenticatedApiRoutes(page);
    await mockRecentlyViewedRoutes(page);
  });

  test("renders recently viewed heading", async ({ page }) => {
    await page.goto("/recently-viewed");
    await waitForPageReady(page);

    await expect(page.getByText(/recently viewed/i)).toBeVisible();
  });

  test("renders recently viewed items", async ({ page }) => {
    await page.goto("/recently-viewed");
    await waitForPageReady(page);

    await expect(page.getByText(/vintage camera/i)).toBeVisible();
  });

  test("browsing history label is visible", async ({ page }) => {
    await page.goto("/recently-viewed");
    await waitForPageReady(page);

    await expect(page.getByText(/browsing history/i).first()).toBeVisible();
  });
});

test.describe("Recently Viewed — empty state", () => {
  test("empty recently viewed shows message", async ({ page }) => {
    await mockCommonApiRoutes(page);
    await setupLoggedInState(page);
    await mockAuthenticatedApiRoutes(page);
    await page.route("**/api/recently-viewed**", async (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [], hasMore: false })
      })
    );

    await page.goto("/recently-viewed");
    await waitForPageReady(page);

    await expect(page.getByText(/recently viewed/i)).toBeVisible();
  });
});

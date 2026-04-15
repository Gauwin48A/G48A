import { expect, test } from "@playwright/test";
import { mockCommonApiRoutes, setupLoggedOutState, waitForPageReady } from "./e2e-helpers";

test.describe("Legal & Static Pages", () => {
  test.beforeEach(async ({ page }) => {
    await mockCommonApiRoutes(page);
    await setupLoggedOutState(page);
  });

  test("terms and conditions page renders", async ({ page }) => {
    await page.goto("/terms-and-conditions");
    await waitForPageReady(page);
    await expect(page.getByRole("heading", { name: /terms/i })).toBeVisible();
  });

  test("privacy policy page renders", async ({ page }) => {
    await page.goto("/privacy-policy");
    await waitForPageReady(page);
    await expect(page.getByRole("heading", { name: /privacy/i })).toBeVisible();
  });

  test("refund policy page renders", async ({ page }) => {
    await page.goto("/refund-policy");
    await waitForPageReady(page);
    await expect(page.getByRole("heading", { name: /^refund policy$/i })).toBeVisible();
  });

  test("support ticket policy page renders", async ({ page }) => {
    await page.goto("/support-ticket-policy");
    await waitForPageReady(page);
    await expect(page.getByRole("heading", { name: /support ticket/i })).toBeVisible();
  });

  test("terms alias /terms works", async ({ page }) => {
    await page.goto("/terms");
    await waitForPageReady(page);
    await expect(page.getByRole("heading", { name: /terms/i })).toBeVisible();
  });

  test("terms alias /t&c works", async ({ page }) => {
    await page.goto("/t&c");
    await waitForPageReady(page);
    await expect(page.getByRole("heading", { name: /terms/i })).toBeVisible();
  });
});

test.describe("Not Found & Auth Gate", () => {
  test.beforeEach(async ({ page }) => {
    await mockCommonApiRoutes(page);
    await setupLoggedOutState(page);
  });

  test("404 page renders for invalid route", async ({ page }) => {
    await page.goto("/this-route-does-not-exist");
    await waitForPageReady(page);
    await expect(page.getByText(/page not found/i)).toBeVisible();
  });

  test("account deletion page shows auth gate", async ({ page }) => {
    await page.goto("/account/delete");
    await waitForPageReady(page);
    await expect(page.getByText(/sign in to continue|authentication required/i)).toBeVisible();
  });
});

test.describe("Home Page", () => {
  test("home page renders", async ({ page }) => {
    await mockCommonApiRoutes(page);
    await setupLoggedOutState(page);

    await page.goto("/home");
    await waitForPageReady(page);
    await expect(page.getByText(/home/i).first()).toBeVisible();
  });

  test("root redirects to category-hub", async ({ page }) => {
    await mockCommonApiRoutes(page);
    await setupLoggedOutState(page);

    await page.goto("/");
    await waitForPageReady(page);
    await expect(page).toHaveURL(/\/category-hub/);
  });
});

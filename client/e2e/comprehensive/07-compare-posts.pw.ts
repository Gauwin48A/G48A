import { expect, test } from "@playwright/test";
import { disableAnimations, mockCommonApiRoutes, setupLoggedOutState, waitForPageReady } from "./e2e-helpers";
import { MOCK_COMPARE_ITEMS } from "./fixtures";

test.describe("Compare Posts — empty state", () => {
  test("shows empty state when no items", async ({ page }) => {
    await mockCommonApiRoutes(page);
    await setupLoggedOutState(page);
    await page.goto("/compare");
    await waitForPageReady(page);

    await expect(page.getByText(/no items to compare/i)).toBeVisible();
    await expect(page.getByText(/select items from listings/i)).toBeVisible();
  });

  test("back to listings link is visible", async ({ page }) => {
    await mockCommonApiRoutes(page);
    await setupLoggedOutState(page);
    await page.goto("/compare");
    await waitForPageReady(page);

    await expect(page.getByText(/back to listings/i)).toBeVisible();
  });
});

test.describe("Compare Posts — with items", () => {
  test.beforeEach(async ({ page }) => {
    await mockCommonApiRoutes(page);
    await setupLoggedOutState(page);
    await page.addInitScript((items) => {
      window.history.replaceState({ usr: { compareItems: items } }, "", "/compare");
    }, MOCK_COMPARE_ITEMS);

    await page.goto("/compare");
    await waitForPageReady(page);
    await disableAnimations(page);
  });

  test("renders comparison heading", async ({ page }) => {
    await expect(page.getByText(/compare products/i)).toBeVisible();
  });

  test("renders all comparison items", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Gaming Laptop Pro" }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Compact SUV 2018" }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Designer Sofa Set" }).first()).toBeVisible();
  });

  test("renders price and condition values", async ({ page }) => {
    await expect(page.getByText(/68,000|68000/).first()).toBeVisible();
    await expect(page.getByText(/like new/i).first()).toBeVisible();
    await expect(page.getByText(/used/i).first()).toBeVisible();
  });

  test("view details links are visible", async ({ page }) => {
    await expect(page.getByRole("button", { name: /view details/i }).first()).toBeVisible();
  });

  test("remove from comparison buttons exist", async ({ page }) => {
    const removeBtn = page.getByRole("button", { name: /remove from comparison/i }).first();
    await expect(removeBtn).toBeVisible();
  });

  test("clear all removes all items", async ({ page }) => {
    await page.getByRole("button", { name: /clear all/i }).click();
    await expect(page.getByText(/no items to compare/i)).toBeVisible();
  });

  test("remove button removes individual item", async ({ page }) => {
    const removeBtn = page.getByRole("button", { name: /remove from comparison/i }).first();
    await removeBtn.click();
  });
});

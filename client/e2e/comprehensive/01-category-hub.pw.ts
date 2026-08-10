import { expect, test } from "@playwright/test";
import {
  disableAnimations,
  mockAuthenticatedApiRoutes,
  mockCategoriesApi,
  mockCommonApiRoutes,
  setupLoggedInState,
  waitForPageReady
} from "./e2e-helpers";

const CATEGORY_GROUPS = [
  { key: "electronics", label: "Electronics", emoji: "📱", tagline: "Phones, laptops & gadgets" },
  { key: "fashion", label: "Fashion", emoji: "👗", tagline: "Clothing, shoes & accessories" },
  { key: "vehicles", label: "Vehicles", emoji: "🚗", tagline: "Cars, bikes & spare parts" },
  { key: "others", label: "Others", emoji: "✨", tagline: "Home, services, jobs & more" }
];

test.describe("Category Hub", () => {
  test.beforeEach(async ({ page }) => {
    // /category-hub is wrapped in <RequireAuth> in the real app, so the tile
    // UI only renders for authenticated sessions. Mock a logged-in session
    // (matching the app's actual auth requirement).
    await mockCommonApiRoutes(page);
    await setupLoggedInState(page);
    await mockAuthenticatedApiRoutes(page);
    await mockCategoriesApi(page);
    await page.goto("/category-hub", { waitUntil: "domcontentloaded" });
    await waitForPageReady(page);
    await disableAnimations(page);
  });

  test("renders header with gradient title", async ({ page }) => {
    await expect(page.getByText(/choose your/i)).toBeVisible();
    await expect(page.getByText(/world/i)).toBeVisible();
  });

  test("renders all 4 category tiles with labels and taglines", async ({ page }) => {
    for (const cat of CATEGORY_GROUPS) {
      await expect(page.getByText(cat.label, { exact: false })).toBeVisible();
      await expect(page.getByText(cat.tagline)).toBeVisible();
    }
  });

  test("each tile shows listing count stats", async ({ page }) => {
    await expect(page.getByText(/listings/i).first()).toBeVisible();
  });

  test("clicking Electronics tile navigates to filtered listings", async ({ page }) => {
    const tile = page.locator('button').filter({ hasText: 'Electronics' }).first();
    await tile.click();
    await expect(page).toHaveURL(/\/all-posts/);
  });

  test("clicking Fashion tile navigates to filtered listings", async ({ page }) => {
    const tile = page.locator('button').filter({ hasText: 'Fashion' }).first();
    await tile.click();
    await expect(page).toHaveURL(/\/all-posts/);
  });

  test("clicking Vehicles tile navigates to filtered listings", async ({ page }) => {
    const tile = page.locator('button').filter({ hasText: 'Vehicles' }).first();
    await tile.click();
    await expect(page).toHaveURL(/\/all-posts/);
  });

  test("clicking Others tile navigates to filtered listings", async ({ page }) => {
    const tile = page.locator('button').filter({ hasText: 'Others' }).first();
    await tile.click();
    await expect(page).toHaveURL(/\/all-posts/);
  });

  test("active category shows Active pill after selection", async ({ page }) => {
    await page.locator('button').filter({ hasText: 'Electronics' }).first().click();
    await expect(page).toHaveURL(/\/all-posts/);
    await page.goto("/category-hub", { waitUntil: "domcontentloaded" });
    await waitForPageReady(page);
    await expect(page.getByText(/active/i).first()).toBeVisible();
  });

  test("layout switcher cycles Mobile → Tablet → Desktop", async ({ page }) => {
    const mobileBtn = page.getByRole("button", { name: "Mobile" });
    const tabletBtn = page.getByRole("button", { name: "Tablet" });
    const desktopBtn = page.getByRole("button", { name: "Desktop" });

    await tabletBtn.click();
    await expect(page.locator("html")).toHaveAttribute("data-layout-preview", "tablet");

    await desktopBtn.click();
    await expect(page.locator("html")).toHaveAttribute("data-layout-preview", "desktop");

    await mobileBtn.click();
    await expect(page.locator("html")).toHaveAttribute("data-layout-preview", "mobile");
  });

  test("dark mode toggle switches to dark theme", async ({ page }) => {
    const toggle = page.getByRole("button", { name: /switch to dark mode/i });
    await toggle.click();
    await expect(page.locator("html")).toHaveClass(/dark/);
  });

  test("dark mode toggle switches back to light theme", async ({ page }) => {
    const toggleDark = page.getByRole("button", { name: /switch to dark mode/i });
    await toggleDark.click();
    await expect(page.locator("html")).toHaveClass(/dark/);

    const toggleLight = page.getByRole("button", { name: /switch to light mode/i });
    await toggleLight.click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
  });

  test("category stats chips show listing counts", async ({ page }) => {
    await expect(page.getByText(/listings/i).first()).toBeVisible();
  });
});

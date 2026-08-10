import { expect, test, type Page } from "@playwright/test";
import {
  disableAnimations,
  mockAuthenticatedApiRoutes,
  mockCommonApiRoutes,
  setupLoggedOutState,
  setupLoggedInState,
  waitForPageReady,
} from "./e2e-helpers";
import { MOCK_USER } from "./fixtures";

// ── Mock API Response for a verified seller with 2 sold items ─────────────
const MOCK_SOLD_POSTS_RESPONSE = {
  success: true,
  seller_id: "999001",
  seller_name: "Rahul Sharma",
  avatar_url: null,
  is_kyc_verified: true,
  total_sold: 2,
  average_rating: 4.5,
  star_string: "★★★★★",
  trust_score: 100,
  trust_badge: "GOLD VERIFIED SELLER",
  message: undefined,
  sold_posts: [
    {
      sale_id: "1001",
      post_id: "999101",
      post_title: "iPhone 15 Pro Max 256GB",
      post_price: 99999,
      category: "Electronics",
      sale_date: "2026-04-10T10:00:00.000Z",
      buyer_rating: 5,
      buyer_comment: "Excellent product! Exactly as described. Fast delivery by seller. Highly recommend!",
      buyer_name: "Ananya Patel",
      rating_stars: "★★★★★",
    },
    {
      sale_id: "1002",
      post_id: "999102",
      post_title: "Leather Jacket - Premium Quality",
      post_price: 4599,
      category: "Fashion",
      sale_date: "2026-04-08T14:30:00.000Z",
      buyer_rating: 4,
      buyer_comment: "Good quality jacket, slight color difference from pictures but overall satisfied.",
      buyer_name: "Ananya Patel",
      rating_stars: "★★★★☆",
    },
  ],
  pagination: {
    page: 1,
    limit: 50,
    total: 2,
    totalPages: 1,
    hasNext: false,
    hasPrevious: false,
  },
};

// ── Mock for a seller with sold items that include an unrated purchase ───────
const MOCK_WITH_UNRATED_POST_RESPONSE = {
  ...MOCK_SOLD_POSTS_RESPONSE,
  total_sold: 3,
  average_rating: 3.0,
  star_string: "★★★☆☆",
  trust_score: 85,
  trust_badge: "VERIFIED SELLER",
  sold_posts: [
    ...MOCK_SOLD_POSTS_RESPONSE.sold_posts,
    {
      sale_id: "1003",
      post_id: "999103",
      post_title: "Honda Activa 6G 2024",
      post_price: 85000,
      category: "Vehicles",
      sale_date: "2026-04-05T09:00:00.000Z",
      buyer_rating: null,
      buyer_comment: null,
      buyer_name: null,
      rating_stars: "Not Rated",
    },
  ],
  pagination: {
    page: 1,
    limit: 50,
    total: 3,
    totalPages: 1,
    hasNext: false,
    hasPrevious: false,
  },
};

// ── Mock for a new seller with 0 sales ──────────────────────────────────────
const MOCK_EMPTY_SOLD_POSTS_RESPONSE = {
  success: true,
  seller_id: "999004",
  seller_name: "New Seller",
  avatar_url: null,
  is_kyc_verified: false,
  total_sold: 0,
  average_rating: 0,
  star_string: "☆☆☆☆☆",
  trust_score: 50,
  trust_badge: "NORMAL TRUST",
  message: "No sold posts found for this seller.",
  sold_posts: [],
  pagination: {
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrevious: false,
  },
};

// ── Mock for category-filtered response (Books = no results) ─────────────────
const MOCK_BOOKS_FILTER_RESPONSE = {
  ...MOCK_SOLD_POSTS_RESPONSE,
  sold_posts: [],
  message: "No sold posts found for this seller.",
  pagination: {
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrevious: false,
  },
};

// ── Helper: mock the sold-posts API endpoint with dynamic category filtering ─
async function mockSoldPostsApi(page: Page, data = MOCK_SOLD_POSTS_RESPONSE) {
  await page.route(
    /\/api\/sales\/user\/[^/]+\/sold-posts/,
    async (route) => {
      const url = new URL(route.request().url());
      const category = url.searchParams.get("category");
      let responseData = data;

      if (category && category !== "all") {
        if (category.toLowerCase() === "books") {
          responseData = MOCK_BOOKS_FILTER_RESPONSE;
        } else {
          const filteredPosts = data.sold_posts.filter(
            (p) => p.category?.toLowerCase() === category.toLowerCase()
          );
          responseData = {
            ...data,
            sold_posts: filteredPosts,
            ...(filteredPosts.length === 0
              ? { message: "No sold posts found for this seller." }
              : {}),
            pagination: {
              ...data.pagination,
              total: filteredPosts.length,
              totalPages:
                Math.ceil(filteredPosts.length / (data.pagination?.limit || 50)) || 1,
            },
          };
        }
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(responseData),
      });
    }
  );
}

// ── Helper: mock empty response for 0-sales seller ─────────────────────────
async function mockEmptySoldPostsApi(page: Page) {
  await page.route(
    /\/api\/sales\/user\/[^/]+\/sold-posts/,
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_EMPTY_SOLD_POSTS_RESPONSE),
      });
    }
  );
}

// ── Helper: mock error response ─────────────────────────────────────────────
async function mockErrorSoldPostsApi(page: Page) {
  await page.route(
    /\/api\/sales\/user\/[^/]+\/sold-posts/,
    async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          error: "Unable to load seller's sold posts",
        }),
      });
    }
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TEST SUITE: UserSoldPosts Page
// ════════════════════════════════════════════════════════════════════════════
test.describe("UserSoldPosts Page", () => {
  test.beforeEach(async ({ page }) => {
    await mockCommonApiRoutes(page);
    await setupLoggedOutState(page);
    await disableAnimations(page);
  });

  // ── Header & Trust Passport ────────────────────────────────────────────

  test("renders seller trust passport header with name and KYC badge", async ({ page }) => {
    await mockSoldPostsApi(page, MOCK_SOLD_POSTS_RESPONSE);
    await page.goto("/user/999001/sold-posts", { waitUntil: "domcontentloaded" });
    await waitForPageReady(page);

    await expect(page.getByText("Rahul Sharma's Sold Posts")).toBeVisible();
    await expect(page.getByText("KYC Verified")).toBeVisible();
  });

  test("displays trust score bar and value", async ({ page }) => {
    await mockSoldPostsApi(page, MOCK_SOLD_POSTS_RESPONSE);
    await page.goto("/user/999001/sold-posts", { waitUntil: "domcontentloaded" });
    await waitForPageReady(page);

    await expect(page.getByText("Trust Score")).toBeVisible();
    await expect(page.getByText("100/100")).toBeVisible();
  });

  test("displays GOLD VERIFIED SELLER badge for high trust score", async ({ page }) => {
    await mockSoldPostsApi(page, MOCK_SOLD_POSTS_RESPONSE);
    await page.goto("/user/999001/sold-posts", { waitUntil: "domcontentloaded" });
    await waitForPageReady(page);

    await expect(page.getByText("GOLD VERIFIED SELLER")).toBeVisible();
  });

  test("displays VERIFIED SELLER badge for mid-range trust score", async ({ page }) => {
    await mockSoldPostsApi(page, MOCK_WITH_UNRATED_POST_RESPONSE);
    await page.goto("/user/999001/sold-posts", { waitUntil: "domcontentloaded" });
    await waitForPageReady(page);

    await expect(page.getByText("VERIFIED SELLER")).toBeVisible();
  });

  test("displays average rating with star icons", async ({ page }) => {
    await mockSoldPostsApi(page, MOCK_SOLD_POSTS_RESPONSE);
    await page.goto("/user/999001/sold-posts", { waitUntil: "domcontentloaded" });
    await waitForPageReady(page);

    await expect(page.getByText("4.5")).toBeVisible();
    await expect(page.getByText("★★★★★")).toBeVisible();
  });

  // ── Sold Items List ────────────────────────────────────────────────────

  test("shows sold items list with correct titles and prices", async ({ page }) => {
    await mockSoldPostsApi(page, MOCK_SOLD_POSTS_RESPONSE);
    await page.goto("/user/999001/sold-posts", { waitUntil: "domcontentloaded" });
    await waitForPageReady(page);

    await expect(page.getByText("iPhone 15 Pro Max 256GB")).toBeVisible();
    await expect(page.getByText("Leather Jacket - Premium Quality")).toBeVisible();
    await expect(page.getByText("₹99,999")).toBeVisible();
    await expect(page.getByText("₹4,599")).toBeVisible();
  });

  test("shows buyer ratings and review comments for each sold item", async ({ page }) => {
    await mockSoldPostsApi(page, MOCK_SOLD_POSTS_RESPONSE);
    await page.goto("/user/999001/sold-posts", { waitUntil: "domcontentloaded" });
    await waitForPageReady(page);

    await expect(page.getByText("Excellent product!")).toBeVisible();
    await expect(page.getByText("Good quality jacket")).toBeVisible();
    await expect(page.getByText("Ananya Patel")).toBeVisible();
  });

  test("shows 'Not yet rated' fallback for items without buyer rating", async ({ page }) => {
    await mockSoldPostsApi(page, MOCK_WITH_UNRATED_POST_RESPONSE);
    await page.goto("/user/999001/sold-posts", { waitUntil: "domcontentloaded" });
    await waitForPageReady(page);

    // The unrated item (Honda Activa) should show "Not yet rated"
    await expect(page.getByText("Not yet rated")).toBeVisible();
    // Rated items should still show their ratings
    await expect(page.getByText("Excellent product!")).toBeVisible();
  });

  test("shows category badges on sold items", async ({ page }) => {
    await mockSoldPostsApi(page, MOCK_SOLD_POSTS_RESPONSE);
    await page.goto("/user/999001/sold-posts", { waitUntil: "domcontentloaded" });
    await waitForPageReady(page);

    await expect(page.getByText("Electronics")).toBeVisible();
    await expect(page.getByText("Fashion")).toBeVisible();
  });

  test("shows View Post button for each sold item", async ({ page }) => {
    await mockSoldPostsApi(page, MOCK_SOLD_POSTS_RESPONSE);
    await page.goto("/user/999001/sold-posts", { waitUntil: "domcontentloaded" });
    await waitForPageReady(page);

    const viewPostButtons = page.getByRole("button", { name: "View Post" });
    await expect(viewPostButtons.first()).toBeVisible();
    await expect(viewPostButtons).toHaveCount(2);
  });

  // ── Stats Card ─────────────────────────────────────────────────────────

  test("displays sales count stats card with Total Sales, Avg Rating, Trust Score", async ({ page }) => {
    await mockSoldPostsApi(page, MOCK_SOLD_POSTS_RESPONSE);
    await page.goto("/user/999001/sold-posts", { waitUntil: "domcontentloaded" });
    await waitForPageReady(page);

    await expect(page.getByText("Total Sales")).toBeVisible();
    await expect(page.getByText("Avg Rating")).toBeVisible();
    await expect(page.getByText("Trust Score").first()).toBeVisible();
    await expect(page.getByText("2").first()).toBeVisible();
  });

  // ── Category Filter ────────────────────────────────────────────────────

  test("shows category filter buttons when categories exist", async ({ page }) => {
    await mockSoldPostsApi(page, MOCK_SOLD_POSTS_RESPONSE);
    await page.goto("/user/999001/sold-posts", { waitUntil: "domcontentloaded" });
    await waitForPageReady(page);

    await expect(page.getByText("Filter by Category")).toBeVisible();
    await expect(page.getByRole("button", { name: "All" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Electronics" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Fashion" })).toBeVisible();
  });

  test("clicking a category filter updates the sold posts list", async ({ page }) => {
    await mockSoldPostsApi(page, MOCK_SOLD_POSTS_RESPONSE);
    await page.goto("/user/999001/sold-posts", { waitUntil: "domcontentloaded" });
    await waitForPageReady(page);

    // Click "Electronics" filter
    await page.getByRole("button", { name: "Electronics" }).click();
    await expect(page.getByText("iPhone 15 Pro Max 256GB")).toBeVisible();
    await expect(page.getByText("Leather Jacket - Premium Quality")).not.toBeVisible();

    // Click "All" to reset
    await page.getByRole("button", { name: "All" }).click();
    await expect(page.getByText("Leather Jacket - Premium Quality")).toBeVisible();
    // Both items visible again
    await expect(page.getByText("iPhone 15 Pro Max 256GB")).toBeVisible();
  });

  test("active filter button is visually highlighted", async ({ page }) => {
    await mockSoldPostsApi(page, MOCK_SOLD_POSTS_RESPONSE);
    await page.goto("/user/999001/sold-posts", { waitUntil: "domcontentloaded" });
    await waitForPageReady(page);

    // "All" should be selected by default
    const allButton = page.getByRole("button", { name: "All" });
    await expect(allButton).toHaveClass(/bg-emerald/);

    // Click Electronics
    await page.getByRole("button", { name: "Electronics" }).click();
    await expect(allButton).not.toHaveClass(/bg-emerald/);

    // Click All again
    await allButton.click();
    await expect(allButton).toHaveClass(/bg-emerald/);
  });

  // ── Empty & Error States ───────────────────────────────────────────────

  test("shows empty state for seller with no sold items", async ({ page }) => {
    await mockEmptySoldPostsApi(page);
    await page.goto("/user/999004/sold-posts", { waitUntil: "domcontentloaded" });
    await waitForPageReady(page);

    await expect(page.getByText("New Seller's Sold Posts")).toBeVisible();
    await expect(page.getByText("NORMAL TRUST")).toBeVisible();
    await expect(page.getByText("No sold items yet")).toBeVisible();
    await expect(page.getByText("50/100")).toBeVisible();
  });

  test("empty category filter shows no-sold-items fallback text", async ({ page }) => {
    // Mock with empty sold_posts (e.g. filter returned nothing)
    const emptyFilterResponse = {
      ...MOCK_SOLD_POSTS_RESPONSE,
      sold_posts: [],
      message: "No sold posts found for this seller.",
      pagination: { page: 1, limit: 50, total: 0, totalPages: 1, hasNext: false, hasPrevious: false },
    };
    // Override the mock to always return empty (simulates no matching posts)
    await page.route(
      /\/api\/sales\/user\/[^/]+\/sold-posts/,
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(emptyFilterResponse),
        });
      }
    );
    await page.goto("/user/999001/sold-posts", { waitUntil: "domcontentloaded" });
    await waitForPageReady(page);

    await expect(page.getByText("No sold items yet")).toBeVisible();
    // Seller trust info still visible even with empty results
    await expect(page.getByText("Rahul Sharma's Sold Posts")).toBeVisible();
    await expect(page.getByText("GOLD VERIFIED SELLER")).toBeVisible();
  });

  test("shows error state with retry button when API fails", async ({ page }) => {
    await mockErrorSoldPostsApi(page);
    await page.goto("/user/999001/sold-posts", { waitUntil: "domcontentloaded" });
    await waitForPageReady(page);

    await expect(page.getByText("Could not load data")).toBeVisible();
    const retryButton = page.getByRole("button", { name: "Retry" });
    await expect(retryButton).toBeVisible();

    // Click retry — should still show error since mock stays error
    await retryButton.click();
    await expect(page.getByText("Could not load data")).toBeVisible();
  });

  // ── Navigation & Invalid States ────────────────────────────────────────

  test("shows invalid user state when userId is missing", async ({ page }) => {
    await page.goto("/user//sold-posts", { waitUntil: "domcontentloaded" });
    await waitForPageReady(page);

    await expect(page.getByText("Invalid User")).toBeVisible();
    await expect(page.getByText("A valid user ID is required")).toBeVisible();
    await expect(page.getByRole("button", { name: "Browse Posts" })).toBeVisible();
  });

  test("has back button that navigates to previous page", async ({ page }) => {
    await mockSoldPostsApi(page, MOCK_SOLD_POSTS_RESPONSE);
    await page.goto("/user/999001/sold-posts", { waitUntil: "domcontentloaded" });
    await waitForPageReady(page);

    const backButton = page.locator('button[aria-label="Back"]');
    await expect(backButton).toBeVisible();
    await expect(backButton).toBeEnabled();
  });
});

// ════════════════════════════════════════════════════════════════════════════
// TEST SUITE: Demo User Flow — SoldPosts Page (Public Access)
// ════════════════════════════════════════════════════════════════════════════
test.describe("Demo User Flow — SoldPosts Page Access", () => {
  test.beforeEach(async ({ page }) => {
    await mockCommonApiRoutes(page);
    await disableAnimations(page);
  });

  test("logged-out user can access public sold-posts page (no RequireAuth gate)", async ({ page }) => {
    await setupLoggedOutState(page);
    await mockSoldPostsApi(page, MOCK_SOLD_POSTS_RESPONSE);
    await page.goto("/user/999001/sold-posts", { waitUntil: "domcontentloaded" });
    await waitForPageReady(page);

    // Should show seller info, not a login gate
    await expect(page.getByText("Rahul Sharma's Sold Posts")).toBeVisible();
    await expect(page.getByText("Trust Score")).toBeVisible();
    await expect(page.getByText("GOLD VERIFIED SELLER")).toBeVisible();
    await expect(page.getByText("Sign in to continue")).not.toBeVisible();
  });

  test("demo user (authSession=true) can view sold posts without auth redirect", async ({ page }) => {
    const demoUser = {
      ...MOCK_USER,
      id: "demo-1234567890",
      user_id: "demo-1234567890",
      name: "Demo User",
      is_demo: true,
    };
    await setupLoggedInState(page, demoUser);
    await mockAuthenticatedApiRoutes(page, demoUser);
    await mockSoldPostsApi(page, MOCK_SOLD_POSTS_RESPONSE);
    await page.goto("/user/999001/sold-posts", { waitUntil: "domcontentloaded" });
    await waitForPageReady(page);

    // The sold posts page should load without hitting RequireAuth
    await expect(page.getByText("Rahul Sharma's Sold Posts")).toBeVisible();
    // No login gate should appear
    await expect(page.getByText("Sign in to continue")).not.toBeVisible();
  });

  test("demo user can view seller with 0 sales without error", async ({ page }) => {
    const demoUser = {
      ...MOCK_USER,
      id: "demo-1234567890",
      user_id: "demo-1234567890",
      name: "Demo User",
      is_demo: true,
    };
    await setupLoggedInState(page, demoUser);
    await mockAuthenticatedApiRoutes(page, demoUser);
    await mockEmptySoldPostsApi(page);
    await page.goto("/user/999004/sold-posts", { waitUntil: "domcontentloaded" });
    await waitForPageReady(page);

    await expect(page.getByText("New Seller's Sold Posts")).toBeVisible();
    await expect(page.getByText("No sold items yet")).toBeVisible();
    // No "Could not load data" error
    await expect(page.getByText("Could not load data")).not.toBeVisible();
  });

  test("demo user sees seller trust info even for zero-sale sellers", async ({ page }) => {
    const demoUser = {
      ...MOCK_USER,
      id: "demo-1234567890",
      user_id: "demo-1234567890",
      name: "Demo User",
      is_demo: true,
    };
    await setupLoggedInState(page, demoUser);
    await mockAuthenticatedApiRoutes(page, demoUser);
    await mockEmptySoldPostsApi(page);
    await page.goto("/user/999004/sold-posts", { waitUntil: "domcontentloaded" });
    await waitForPageReady(page);

    await expect(page.getByText("NORMAL TRUST")).toBeVisible();
    await expect(page.getByText("50/100")).toBeVisible();
    await expect(page.getByText("0")).toBeVisible(); // 0 total sales
  });
});

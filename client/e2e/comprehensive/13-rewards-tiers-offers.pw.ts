import { expect, test } from "@playwright/test";
import {
  disableAnimations,
  mockAuthenticatedApiRoutes,
  mockCommonApiRoutes,
  setupLoggedInState,
  setupLoggedOutState,
  waitForPageReady
} from "./e2e-helpers";
import { MOCK_REVIEWS, MOCK_REWARDS, MOCK_TIER_PLANS } from "./fixtures";

const mockRewardsRoutes = async (page) => {
  await page.route("**/api/rewards**", async (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_REWARDS) })
  );
  await page.route("**/api/coins/balance**", async (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ balance: 320 }) })
  );
  await page.route("**/api/coins/history**", async (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ history: [] }) })
  );
  await page.route("**/api/rewards/log**", async (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ entries: [] }) })
  );
  await page.route("**/api/rewards/stream**", async (route) =>
    route.fulfill({ status: 200, contentType: "text/event-stream", body: "" })
  );
  await page.route("**/api/referral/**", async (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) })
  );
};

const mockTierRoutes = async (page) => {
  await page.route("**/api/subscriptions/plans**", async (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_TIER_PLANS) })
  );
  await page.route("**/api/subscriptions/my**", async (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ active: false }) })
  );
  await page.route("**/api/subscriptions/history**", async (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ history: [] }) })
  );
  await page.route("**/api/subscriptions/plans/silver/price**", async (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ price: 199 }) })
  );
  await page.route("**/api/subscriptions/trial**", async (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true }) })
  );
};

const mockOffersRoutes = async (page) => {
  await page.route("**/api/offers**", async (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ offers: [] }) })
  );
};

const mockReviewsRoutes = async (page) => {
  await page.route(/.*\/api\/reviews\/user\/.*/, async (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ reviews: MOCK_REVIEWS }) })
  );
  await page.route("**/api/reviews**", async (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true }) })
  );
};

test.describe("Rewards Page", () => {
  test.beforeEach(async ({ page }) => {
    await mockCommonApiRoutes(page);
    await setupLoggedInState(page);
    await mockAuthenticatedApiRoutes(page);
    await mockRewardsRoutes(page);
  });

  test("renders rewards heading", async ({ page }) => {
    await page.goto("/rewards");
    await waitForPageReady(page);
    await disableAnimations(page);

    await expect(page.getByText(/rewards/i).first()).toBeVisible();
  });

  test("shows coin balance", async ({ page }) => {
    await page.goto("/rewards");
    await waitForPageReady(page);
    await disableAnimations(page);

    await expect(page.getByText(/coins/i).first()).toBeVisible();
  });

  test("rewards tabs are visible", async ({ page }) => {
    await page.goto("/rewards");
    await waitForPageReady(page);
    await disableAnimations(page);

    await expect(page.getByText(/overview|earn|referrals/i).first()).toBeVisible();
  });
});

test.describe("Tier Selection", () => {
  test.beforeEach(async ({ page }) => {
    await mockCommonApiRoutes(page);
    await setupLoggedInState(page);
    await mockAuthenticatedApiRoutes(page);
    await mockTierRoutes(page);
  });

  test("renders tier plan cards", async ({ page }) => {
    await page.goto("/tier-selection");
    await waitForPageReady(page);

    await expect(page.getByRole("heading").first()).toBeVisible();
  });

  test("plan CTA buttons are visible", async ({ page }) => {
    await page.goto("/tier-selection");
    await waitForPageReady(page);

    await expect(page.getByText(/get silver|get gold|go premium/i).first()).toBeVisible();
  });
});

test.describe("Offers Page", () => {
  test("renders offers heading", async ({ page }) => {
    await mockCommonApiRoutes(page);
    await setupLoggedOutState(page);
    await mockOffersRoutes(page);

    await page.goto("/offers");
    await waitForPageReady(page);

    await expect(page.getByRole("heading").first()).toBeVisible();
  });
});

test.describe("Reviews Page", () => {
  test("renders review cards with ratings", async ({ page }) => {
    await mockCommonApiRoutes(page);
    await setupLoggedOutState(page);
    await mockReviewsRoutes(page);

    await page.goto("/reviews/user-1");
    await waitForPageReady(page);

    await expect(page.getByRole("heading", { name: /reviews/i }).first()).toBeVisible();
  });
});

test.describe("Verification & KYC pages", () => {
  test("verification page renders when authenticated", async ({ page }) => {
    await mockCommonApiRoutes(page);
    await setupLoggedInState(page);
    await mockAuthenticatedApiRoutes(page);

    await page.goto("/verification");
    await waitForPageReady(page);
    await expect(page.getByRole("heading", { name: /verification/i }).first()).toBeVisible();
  });

  test("kyc page renders when authenticated", async ({ page }) => {
    await mockCommonApiRoutes(page);
    await setupLoggedInState(page);
    await mockAuthenticatedApiRoutes(page);

    await page.goto("/kyc");
    await waitForPageReady(page);
    await expect(page.getByText(/kyc/i)).toBeVisible();
  });

  test("verification page shows auth gate when logged out", async ({ page }) => {
    await mockCommonApiRoutes(page);
    await setupLoggedOutState(page);

    await page.goto("/verification");
    await waitForPageReady(page);
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });
});

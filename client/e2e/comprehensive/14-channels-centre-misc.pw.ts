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
import { MOCK_CHANNELS, MOCK_POSTS, MOCK_SAVED_SEARCHES } from "./fixtures";

const mockChannelRoutes = async (page) => {
  await page.route("**/api/channels/**", async (route) => {
    const url = route.request().url();
    if (url.match(/\/api\/channels\/[\w-]+$/)) {
      const channelId = url.split("/channels/")[1];
      const channel = MOCK_CHANNELS.find((item) => String(item.id) === String(channelId)) || MOCK_CHANNELS[0];
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(channel) });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_CHANNELS) });
  });

  await page.route("**/api/channels", async (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_CHANNELS) })
  );

  await page.route("**/api/channel**", async (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_CHANNELS) })
  );
};

const mockPublicAndMiscRoutes = async (page) => {
  await page.route("**/api/publicwall**", async (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ posts: [] }) })
  );

  await page.route("**/api/nearby**", async (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ posts: MOCK_POSTS.slice(0, 2) }) })
  );

  await page.route("**/api/saved-searches**", async (route) => {
    const method = route.request().method();
    if (method === "DELETE") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true }) });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ searches: MOCK_SAVED_SEARCHES }) });
  });

  await page.route("**/api/feedback**", async (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true }) })
  );

  await page.route("**/api/complaints/my**", async (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ complaints: [] }) })
  );

  await page.route("**/api/complaints**", async (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true }) })
  );
};

test.describe("Channels List", () => {
  test("renders channels page with items", async ({ page }) => {
    await mockCommonApiRoutes(page);
    await setupLoggedOutState(page);
    await mockCategoriesApi(page);
    await mockChannelRoutes(page);

    await page.goto("/channels");
    await waitForPageReady(page);
    await disableAnimations(page);

    await expect(page.getByText(/channels/i).first()).toBeVisible();
    await expect(page.getByText("MHub Electronics")).toBeVisible();
  });

  test("renders channel names and descriptions", async ({ page }) => {
    await mockCommonApiRoutes(page);
    await setupLoggedOutState(page);
    await mockCategoriesApi(page);
    await mockChannelRoutes(page);

    await page.goto("/channels");
    await waitForPageReady(page);

    await expect(page.getByText("Auto Enthusiasts")).toBeVisible();
  });
});

test.describe("Channel Detail", () => {
  test("renders individual channel page", async ({ page }) => {
    await mockCommonApiRoutes(page);
    await setupLoggedOutState(page);
    await mockChannelRoutes(page);

    await page.goto("/channels/channel-1");
    await waitForPageReady(page);

    await expect(page.getByText(/followers|no posts yet|channel/i).first()).toBeVisible();
  });
});

test.describe("Centre Pages", () => {
  test("centre list renders", async ({ page }) => {
    await mockCommonApiRoutes(page);
    await setupLoggedInState(page);
    await mockAuthenticatedApiRoutes(page);
    await mockCategoriesApi(page);
    await mockChannelRoutes(page);

    await page.goto("/centre");
    await waitForPageReady(page);

    await expect(page.getByText(/centrepages|centre/i).first()).toBeVisible();
  });

  test("centre detail renders", async ({ page }) => {
    await mockCommonApiRoutes(page);
    await setupLoggedInState(page);
    await mockAuthenticatedApiRoutes(page);
    await mockChannelRoutes(page);

    await page.goto("/centre/channel-1");
    await waitForPageReady(page);

    await expect(page.getByText(/followers|no posts yet|centre/i).first()).toBeVisible();
  });
});

test.describe("Subcategories Page", () => {
  test("renders subcategories heading", async ({ page }) => {
    await mockCommonApiRoutes(page);
    await setupLoggedOutState(page);
    await mockCategoriesApi(page);

    await page.goto("/subcategories");
    await waitForPageReady(page);

    await expect(page.getByText(/subcategories|explore/i).first()).toBeVisible();
  });
});

test.describe("Nearby Posts", () => {
  test("renders nearby posts page", async ({ page }) => {
    await mockCommonApiRoutes(page);
    await setupLoggedInState(page);
    await mockAuthenticatedApiRoutes(page);
    await mockPublicAndMiscRoutes(page);

    await page.goto("/nearby");
    await waitForPageReady(page);

    await expect(page.getByText(/nearby/i).first()).toBeVisible();
  });
});

test.describe("Public Wall", () => {
  test("renders public wall page", async ({ page }) => {
    await mockCommonApiRoutes(page);
    await setupLoggedOutState(page);
    await mockPublicAndMiscRoutes(page);

    await page.goto("/public-wall");
    await waitForPageReady(page);

    await expect(page.getByRole("heading", { name: /^public wall$/i })).toBeVisible();
  });
});

test.describe("Saved Searches", () => {
  test("renders saved searches list", async ({ page }) => {
    await mockCommonApiRoutes(page);
    await setupLoggedInState(page);
    await mockAuthenticatedApiRoutes(page);
    await mockPublicAndMiscRoutes(page);

    await page.goto("/saved-searches");
    await waitForPageReady(page);

    await expect(page.getByRole("heading", { name: /saved searches/i })).toBeVisible();
  });
});

test.describe("Feedback Page", () => {
  test("renders feedback form heading", async ({ page }) => {
    await mockCommonApiRoutes(page);
    await setupLoggedInState(page);
    await mockAuthenticatedApiRoutes(page);
    await mockPublicAndMiscRoutes(page);

    await page.goto("/feedback");
    await waitForPageReady(page);

    await expect(page.getByText(/feedback/i).first()).toBeVisible();
  });

  test("feedback auth gate when logged out", async ({ page }) => {
    await mockCommonApiRoutes(page);
    await setupLoggedOutState(page);

    await page.goto("/feedback");
    await waitForPageReady(page);

    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });
});

test.describe("Complaints Page", () => {
  test("renders complaints form heading", async ({ page }) => {
    await mockCommonApiRoutes(page);
    await setupLoggedInState(page);
    await mockAuthenticatedApiRoutes(page);
    await mockPublicAndMiscRoutes(page);

    await page.goto("/complaints");
    await waitForPageReady(page);

    await expect(page.getByText(/complaint/i).first()).toBeVisible();
  });

  test("complaints auth gate when logged out", async ({ page }) => {
    await mockCommonApiRoutes(page);
    await setupLoggedOutState(page);

    await page.goto("/complaints");
    await waitForPageReady(page);

    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });
});

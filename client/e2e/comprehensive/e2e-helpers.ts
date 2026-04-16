import { expect, type Page } from "@playwright/test";
import {
  MOCK_USER,
  MOCK_CATEGORIES,
  MOCK_POSTS,
  MOCK_POST_DETAIL,
  MOCK_NOTIFICATIONS
} from "./fixtures";

const DISABLE_ANIMATIONS_CSS = `
*,
*::before,
*::after {
  animation: none !important;
  transition: none !important;
  scroll-behavior: auto !important;
}
`;

const AUTH_STORAGE_KEYS = [
  "authToken",
  "refreshToken",
  "user",
  "userId",
  "user_id",
  "userProfile",
  "token",
  "authSession",
  "mhub_cart_v1",
  "mhub_saved_post_ids",
  "mhub_wishlist_cooldown_until",
  "mhub_login_rate_limit_until",
  "mhub_auth_rate_limit_until"
];

const DEFAULT_LOCATION = {
  latitude: 17.385,
  longitude: 78.4867,
  accuracy: 50,
  city: "Hyderabad",
  state: "Telangana",
  country: "India",
  area: "Bachupally",
  locality: "Bachupally",
  provider: "e2e-mock",
  timestamp: Date.now()
};

const jsonResponse = (route, body, status = 200) =>
  route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body)
  });

export async function disableAnimations(page: Page) {
  await page.addStyleTag({ content: DISABLE_ANIMATIONS_CSS });
}

export async function waitForPageReady(page: Page) {
  await page.waitForLoadState("domcontentloaded");
  await page.locator("body").waitFor({ state: "attached", timeout: 10000 });
}

export async function setupLoggedOutState(page: Page) {
  await page.addInitScript(({ keys, location }) => {
    const now = Date.now();
    keys.forEach((key) => localStorage.removeItem(key));
    sessionStorage.removeItem("feedScrollPosition");
    localStorage.setItem(
      "mhub_location_skipped",
      JSON.stringify({ skipped: true, timestamp: now })
    );
    localStorage.setItem("mhub_location", JSON.stringify(location));
    localStorage.setItem("mhub_user_city", location.city);
  }, { keys: AUTH_STORAGE_KEYS, location: DEFAULT_LOCATION });
}

export async function setupLoggedInState(page: Page, user = MOCK_USER) {
  await page.addInitScript(({ keys, location, userProfile }) => {
    const now = Date.now();
    keys.forEach((key) => localStorage.removeItem(key));
    localStorage.setItem("authSession", "true");
    localStorage.setItem("user", JSON.stringify(userProfile));
    localStorage.setItem("userId", String(userProfile.id || userProfile.user_id || "user-1"));
    localStorage.setItem("user_id", String(userProfile.user_id || userProfile.id || "user-1"));
    localStorage.setItem(
      "mhub_location_skipped",
      JSON.stringify({ skipped: true, timestamp: now })
    );
    localStorage.setItem("mhub_location", JSON.stringify(location));
    localStorage.setItem("mhub_user_city", location.city);
  }, { keys: AUTH_STORAGE_KEYS, location: DEFAULT_LOCATION, userProfile: user });
}

export async function mockAuthenticatedApiRoutes(page: Page, user = MOCK_USER) {
  await page.route("**/api/auth/session**", async (route) =>
    jsonResponse(route, {
      authenticated: true,
      authState: "authenticated",
      hasRefreshCookie: true,
      canRefresh: true,
      user
    })
  );

  await page.route("**/api/auth/me**", async (route) =>
    jsonResponse(route, user)
  );

  await page.route("**/api/auth/refresh-token**", async (route) =>
    jsonResponse(route, { success: true, token: "e2e-token" })
  );

  await page.route("**/api/auth/csrf-token**", async (route) =>
    jsonResponse(route, { ok: true })
  );
}

export async function mockCategoriesApi(page: Page, data = MOCK_CATEGORIES) {
  await page.route("**/api/categories/hub-stats**", async (route) => {
    jsonResponse(route, {
      data: {
        electronics: { active_count: 128, new_today: 4, new_week: 12 },
        fashion: { active_count: 92, new_today: 3, new_week: 9 },
        vehicles: { active_count: 38, new_today: 1, new_week: 4 },
        others: { active_count: 75, new_today: 2, new_week: 6 }
      }
    });
  });

  await page.route("**/api/categories/with-subcategories**", async (route) =>
    jsonResponse(route, { categories: data, data })
  );

  await page.route("**/api/categories/resolve**", async (route) =>
    jsonResponse(route, { found: false })
  );

  await page.route("**/api/categories**", async (route) =>
    jsonResponse(route, { categories: data, data })
  );

  await page.route("**/api/subcategories**", async (route) =>
    jsonResponse(route, { subcategories: data.flatMap((entry) => entry.subcategories || []) })
  );
}

export async function mockPostsApi(page: Page, data = MOCK_POSTS) {
  await page.route("**/api/posts/for-you**", async (route) =>
    jsonResponse(route, { posts: data, total: data.length, hasMore: false })
  );

  await page.route("**/api/posts/batch-view**", async (route) =>
    jsonResponse(route, { success: true })
  );

  await page.route(/.*\/api\/posts\/[^/]+\/like.*/, async (route) =>
    jsonResponse(route, { success: true })
  );

  await page.route(/.*\/api\/posts\/[^/]+\/share.*/, async (route) =>
    jsonResponse(route, { success: true })
  );

  await page.route(/.*\/api\/posts\?.*/, async (route) =>
    jsonResponse(route, { posts: data, total: data.length, hasMore: false })
  );

  await page.route(/.*\/api\/posts$/, async (route) =>
    jsonResponse(route, { posts: data, total: data.length, hasMore: false })
  );
}

export async function mockSinglePostApi(
  page: Page,
  postId: string = String(MOCK_POST_DETAIL.post_id || "post-1"),
  data = MOCK_POST_DETAIL
) {
  await page.route(new RegExp(`/api/posts/${postId}$`), async (route) =>
    jsonResponse(route, { post: data })
  );

  await page.route(/.*\/api\/posts\/[^/]+\/report.*/, async (route) =>
    jsonResponse(route, { success: true })
  );

  await page.route(new RegExp(`/api/inquiries/post/${postId}`), async (route) =>
    jsonResponse(route, { inquiries: [] })
  );

  await page.route(new RegExp(`/api/offers/history/${postId}`), async (route) =>
    jsonResponse(route, { offers: [] })
  );

  await page.route(new RegExp(`/api/recently-viewed/post/${postId}`), async (route) =>
    jsonResponse(route, { viewers: [] })
  );
}

export async function mockCommonApiRoutes(page: Page) {
  // ── Catch-all registered FIRST → lowest priority in Playwright LIFO ──
  await page.route("**/api/**", async (route) =>
    jsonResponse(route, {})
  );

  await page.route("**/socket.io/**", async (route) =>
    route.abort("failed")
  );

  // ── Specific routes registered AFTER → higher priority ──
  await page.route("**/api/health**", async (route) =>
    jsonResponse(route, {
      status: "ok",
      db: "connected",
      time: new Date().toISOString()
    })
  );

  await page.route("**/api/analytics/**", async (route) =>
    jsonResponse(route, { ok: true })
  );

  await page.route("**/api/location**", async (route) =>
    jsonResponse(route, { success: true }, 201)
  );

  await page.route("**/api/coins/engagement**", async (route) =>
    jsonResponse(route, {
      dailyCheckIn: { hasCheckedInToday: true, streak: 3, nextReward: 10 },
      spin: { hasSpunToday: false },
      scratch: { available: 0, totalReferrals: 0, claimed: 0 },
      referralMilestone: { target: 3, reward: 50, current: 0, claimed: false, eligible: false }
    })
  );

  await page.route("**/api/cms/pages/**", async (route) =>
    jsonResponse(route, { content: null })
  );
}

export async function mockNotificationsApi(page: Page, data = MOCK_NOTIFICATIONS) {
  await page.route("**/api/notifications/preferences**", async (route) =>
    jsonResponse(route, {})
  );

  await page.route("**/api/notifications**", async (route) => {
    const method = route.request().method();
    if (method === "GET") {
      return jsonResponse(route, {
        notifications: data,
        unreadCount: data.filter((n) => !n.read).length,
        hasMore: false
      });
    }
    return jsonResponse(route, { success: true });
  });
}

export async function assertUrlIncludes(page: Page, value: string) {
  await expect(page).toHaveURL(new RegExp(value.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")));
}

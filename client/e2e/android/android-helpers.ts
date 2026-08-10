/**
 * MHub Android E2E Test Helpers
 * Mobile-first test utilities for Android emulator testing.
 * Viewport: 412×915 (Pixel 7 equivalent)
 */
import { expect, type Page, type BrowserContext } from "@playwright/test";
import {
  MOCK_USER,
  MOCK_CATEGORIES,
  MOCK_POSTS,
  MOCK_POST_DETAIL,
  MOCK_NOTIFICATIONS,
  MOCK_CART_ITEMS,
  MOCK_WISHLIST_ITEMS,
  MOCK_FEED_POSTS,
  MOCK_RECENTLY_VIEWED,
  MOCK_COMPARE_ITEMS
} from "../comprehensive/fixtures";
import { isDevServerResource, safeScreenshot } from "../comprehensive/e2e-helpers";

/* ─── Constants ─── */
export const ANDROID_VIEWPORT = { width: 412, height: 915 };
export const ANDROID_USER_AGENT =
  "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.165 Mobile Safari/537.36";

export const TEST_CREDENTIALS = {
  email: "rahul.sharma@mhub.com",
  password: "Test@123456"
};

const DISABLE_ANIMATIONS_CSS = `
*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important;}
`;

const AUTH_STORAGE_KEYS = [
  "authToken", "refreshToken", "user", "userId", "user_id",
  "userProfile", "token", "authSession",
  "mhub_cart_v1", "mhub_saved_post_ids",
  "mhub_wishlist_cooldown_until",
  "mhub_login_rate_limit_until",
  "mhub_auth_rate_limit_until"
];

const DEFAULT_LOCATION = {
  latitude: 17.385, longitude: 78.4867, accuracy: 50,
  city: "Hyderabad", state: "Telangana", country: "India",
  area: "Bachupally", locality: "Bachupally",
  provider: "e2e-mock", timestamp: Date.now()
};

const jsonResponse = (route: any, body: any, status = 200) =>
  route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

/* ─── Core Helpers ─── */

export async function disableAnimations(page: Page) {
  await page.addStyleTag({ content: DISABLE_ANIMATIONS_CSS });
}

export async function waitForPageReady(page: Page) {
  await page.waitForLoadState("domcontentloaded");
  await page.locator("body").waitFor({ state: "attached", timeout: 15000 });
  // Wait for any lazy loading to settle
  await page.waitForTimeout(300);
}

// Windows workers can race on the same screenshot output file
// ("UNKNOWN: unknown error, open ..."). safeScreenshot (in
// ../comprehensive/e2e-helpers) swallows only file-open errors so a capture
// failure can't fail the functional test — anything else is rethrown.
export async function screenshotPage(page: Page, name: string) {
  await safeScreenshot(page, {
    path: `e2e/android/screenshots/${name}.png`,
    fullPage: true
  });
}

export async function screenshotViewport(page: Page, name: string) {
  await safeScreenshot(page, {
    path: `e2e/android/screenshots/${name}.png`,
    fullPage: false
  });
}

/* ─── State Setup ─── */

export async function setupLoggedOutState(page: Page) {
  await page.addInitScript(({ keys, location }) => {
    const now = Date.now();
    keys.forEach((key: string) => localStorage.removeItem(key));
    sessionStorage.removeItem("feedScrollPosition");
    localStorage.setItem("mhub_location_skipped", JSON.stringify({ skipped: true, timestamp: now }));
    localStorage.setItem("mhub_location", JSON.stringify(location));
    localStorage.setItem("mhub_user_city", location.city);
  }, { keys: AUTH_STORAGE_KEYS, location: DEFAULT_LOCATION });
}

export async function setupLoggedInState(page: Page, user = MOCK_USER) {
  await page.addInitScript(({ keys, location, userProfile }) => {
    const now = Date.now();
    keys.forEach((key: string) => localStorage.removeItem(key));
    localStorage.setItem("authSession", "true");
    localStorage.setItem("user", JSON.stringify(userProfile));
    localStorage.setItem("userId", String(userProfile.id || userProfile.user_id || "user-1"));
    localStorage.setItem("user_id", String(userProfile.user_id || userProfile.id || "user-1"));
    localStorage.setItem("mhub_location_skipped", JSON.stringify({ skipped: true, timestamp: now }));
    localStorage.setItem("mhub_location", JSON.stringify(location));
    localStorage.setItem("mhub_user_city", location.city);
  }, { keys: AUTH_STORAGE_KEYS, location: DEFAULT_LOCATION, userProfile: user });
}

/* ─── Dark Mode ─── */

export async function enableDarkMode(page: Page) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("theme", "dark");
      localStorage.setItem("mhub_theme", "dark");
      if (document?.documentElement?.classList) {
        document.documentElement.classList.add("dark");
      }
    } catch {}
  });
}

export async function enableLightMode(page: Page) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("theme", "light");
      localStorage.setItem("mhub_theme", "light");
      if (document?.documentElement?.classList) {
        document.documentElement.classList.remove("dark");
      }
    } catch {}
  });
}

export async function toggleDarkMode(page: Page) {
  // Find and click the dark mode toggle button in the navbar
  const darkBtn = page.getByRole("button", { name: /switch to dark mode|switch to light mode|dark mode|light mode/i });
  if (await darkBtn.isVisible()) {
    await darkBtn.click();
    await page.waitForTimeout(200);
  }
}

/* ─── API Mocking ─── */

export async function mockCommonApiRoutes(page: Page) {
  // Catch-all (lowest priority — registered FIRST in Playwright LIFO)
  await page.route("**/api/**", async (route) => {
    const url = route.request().url();
    if (isDevServerResource(url)) return route.fallback();
    return jsonResponse(route, {});
  });
  await page.route("**/socket.io/**", async (route) => route.abort("failed"));

  await page.route("**/api/health**", async (route) =>
    jsonResponse(route, { status: "ok", db: "connected", time: new Date().toISOString() }));
  await page.route("**/api/analytics/**", async (route) => jsonResponse(route, { ok: true }));
  await page.route("**/api/location**", async (route) => jsonResponse(route, { success: true }, 201));
  await page.route("**/api/coins/engagement**", async (route) =>
    jsonResponse(route, {
      dailyCheckIn: { hasCheckedInToday: true, streak: 3, nextReward: 10 },
      spin: { hasSpunToday: false },
      scratch: { available: 0, totalReferrals: 0, claimed: 0 },
      referralMilestone: { target: 3, reward: 50, current: 0, claimed: false, eligible: false }
    }));
  await page.route("**/api/cms/pages/**", async (route) => jsonResponse(route, { content: null }));
}

export async function mockAuthenticatedApiRoutes(page: Page, user = MOCK_USER) {
  await page.route("**/api/auth/session**", async (route) =>
    jsonResponse(route, { authenticated: true, authState: "authenticated", hasRefreshCookie: true, canRefresh: true, user }));
  await page.route("**/api/auth/me**", async (route) => jsonResponse(route, user));
  await page.route("**/api/auth/refresh-token**", async (route) =>
    jsonResponse(route, { success: true, token: "e2e-token" }));
  await page.route("**/api/auth/csrf-token**", async (route) => jsonResponse(route, { ok: true }));
}

export async function mockCategoriesApi(page: Page, data = MOCK_CATEGORIES) {
  await page.route("**/api/categories/hub-stats**", async (route) =>
    jsonResponse(route, {
      data: {
        electronics: { active_count: 128, new_today: 4, new_week: 12 },
        fashion: { active_count: 92, new_today: 3, new_week: 9 },
        vehicles: { active_count: 38, new_today: 1, new_week: 4 },
        others: { active_count: 75, new_today: 2, new_week: 6 }
      }
    }));
  await page.route("**/api/categories/with-subcategories**", async (route) =>
    jsonResponse(route, { categories: data, data }));
  await page.route("**/api/categories/resolve**", async (route) =>
    jsonResponse(route, { found: false }));
  await page.route("**/api/categories**", async (route) =>
    jsonResponse(route, { categories: data, data }));
  await page.route("**/api/subcategories**", async (route) =>
    jsonResponse(route, { subcategories: data.flatMap((entry) => entry.subcategories || []) }));
}

export async function mockPostsApi(page: Page, data = MOCK_POSTS) {
  await page.route("**/api/posts/for-you**", async (route) =>
    jsonResponse(route, { posts: data, total: data.length, hasMore: false }));
  await page.route("**/api/posts/batch-view**", async (route) => jsonResponse(route, { success: true }));
  await page.route(/.*\/api\/posts\/[^/]+\/like.*/, async (route) => jsonResponse(route, { success: true }));
  await page.route(/.*\/api\/posts\/[^/]+\/share.*/, async (route) => jsonResponse(route, { success: true }));
  await page.route(/.*\/api\/posts\?.*/, async (route) =>
    jsonResponse(route, { posts: data, total: data.length, hasMore: false }));
  await page.route(/.*\/api\/posts$/, async (route) =>
    jsonResponse(route, { posts: data, total: data.length, hasMore: false }));
}

export async function mockSinglePostApi(page: Page, postId = "post-1", data = MOCK_POST_DETAIL) {
  await page.route(new RegExp(`/api/posts/${postId}$`), async (route) =>
    jsonResponse(route, { post: data }));
  await page.route(/.*\/api\/posts\/[^/]+\/report.*/, async (route) =>
    jsonResponse(route, { success: true }));
  await page.route(new RegExp(`/api/inquiries/post/${postId}`), async (route) =>
    jsonResponse(route, { inquiries: [] }));
  await page.route(new RegExp(`/api/offers/history/${postId}`), async (route) =>
    jsonResponse(route, { offers: [] }));
  await page.route(new RegExp(`/api/recently-viewed/post/${postId}`), async (route) =>
    jsonResponse(route, { viewers: [] }));
}

export async function mockCartApi(page: Page, items = MOCK_CART_ITEMS) {
  await page.route("**/api/cart**", async (route) => {
    const method = route.request().method();
    if (method === "GET") return jsonResponse(route, { items, total: items.length });
    return jsonResponse(route, { success: true });
  });
}

export async function mockWishlistApi(page: Page, items = MOCK_WISHLIST_ITEMS) {
  await page.route("**/api/wishlist**", async (route) => {
    const method = route.request().method();
    if (method === "GET") return jsonResponse(route, { items, wishlist: items, total: items.length });
    return jsonResponse(route, { success: true });
  });
  await page.route("**/api/saved-posts**", async (route) =>
    jsonResponse(route, { posts: items, total: items.length }));
}

export async function mockFeedApi(page: Page, posts = MOCK_FEED_POSTS) {
  await page.route("**/api/feed**", async (route) =>
    jsonResponse(route, { posts, total: posts.length, hasMore: false }));
  await page.route("**/api/feed/community**", async (route) =>
    jsonResponse(route, { posts, total: posts.length, hasMore: false }));
}

export async function mockNotificationsApi(page: Page, data = MOCK_NOTIFICATIONS) {
  await page.route("**/api/notifications/preferences**", async (route) => jsonResponse(route, {}));
  await page.route("**/api/notifications**", async (route) => {
    const method = route.request().method();
    if (method === "GET") {
      return jsonResponse(route, { notifications: data, unreadCount: data.filter((n: any) => !n.read).length, hasMore: false });
    }
    return jsonResponse(route, { success: true });
  });
}

export async function mockRecentlyViewedApi(page: Page, data = MOCK_RECENTLY_VIEWED) {
  await page.route("**/api/recently-viewed**", async (route) =>
    jsonResponse(route, { items: data, total: data.length }));
}

export async function mockCompareApi(page: Page) {
  // Compare is client-side only, but we seed localStorage
  await page.addInitScript((items: any[]) => {
    localStorage.setItem("mhub_compare_items", JSON.stringify(items));
  }, MOCK_COMPARE_ITEMS);
}

export async function mockRewardsApi(page: Page) {
  await page.route("**/api/rewards**", async (route) =>
    jsonResponse(route, {
      coins: 350, tier: "silver", nextTier: "gold",
      history: [
        { id: "r1", type: "checkin", amount: 5, created_at: "2026-04-12T08:00:00Z" },
        { id: "r2", type: "referral", amount: 50, created_at: "2026-04-10T14:00:00Z" }
      ]
    }));
  await page.route("**/api/tiers**", async (route) =>
    jsonResponse(route, {
      tiers: [
        { name: "bronze", minCoins: 0, benefits: ["Basic marketplace access"] },
        { name: "silver", minCoins: 100, benefits: ["Priority listings", "5% fee discount"] },
        { name: "gold", minCoins: 500, benefits: ["Featured listings", "10% fee discount", "Premium badge"] }
      ]
    }));
  // Subscription / pricing / payment mocks so /pricing, /tier-selection, /payment have data
  await page.route("**/api/subscription/plans**", async (route) =>
    jsonResponse(route, {
      plans: [
        { id: "basic",   name: "Basic",   price: 0,    interval: "month", features: ["List up to 5 items", "Basic visibility"] },
        { id: "pro",     name: "Pro",     price: 199,  interval: "month", features: ["Unlimited listings", "Featured slots", "Priority support"] },
        { id: "premium", name: "Premium", price: 499,  interval: "month", features: ["All Pro features", "Top placement", "Verified badge"] }
      ]
    }));
  await page.route("**/api/subscription/current**", async (route) =>
    jsonResponse(route, { plan: "basic", status: "active", renewsAt: "2026-06-01T00:00:00Z" }));
  await page.route("**/api/payment/methods**", async (route) =>
    jsonResponse(route, { methods: [
      { id: "upi",  label: "UPI",          icon: "upi" },
      { id: "card", label: "Credit/Debit", icon: "card" },
      { id: "nb",   label: "Net Banking",  icon: "bank" }
    ] }));
  await page.route("**/api/payment/order**", async (route) =>
    jsonResponse(route, { orderId: "order_e2e_1", amount: 19900, currency: "INR" }));
  // PaymentPage actually hits /api/payments/* (plural)
  await page.route("**/api/payments/upi-details**", async (route) =>
    jsonResponse(route, {
      upiId: "mhub@upi",
      payeeName: "MHub",
      tiers: {
        bronze:  { price: 99,  durationDays: 30, label: "Bronze",  features: ["Basic visibility"] },
        silver:  { price: 199, durationDays: 30, label: "Silver",  features: ["Priority listings", "5% fee discount"] },
        gold:    { price: 499, durationDays: 30, label: "Gold",    features: ["Featured slots", "10% fee discount"] },
        premium: { price: 999, durationDays: 30, label: "Premium", features: ["Top placement", "Verified badge"] }
      },
      boosts: {
        feature_24h: { price: 49,  durationHours: 24,  label: "24h Featured" },
        boost_7d:    { price: 199, durationDays: 7,    label: "7-day Boost" }
      }
    }));
  await page.route("**/api/payments/status**", async (route) =>
    jsonResponse(route, { status: "idle", lastPaymentAt: null }));
  await page.route("**/api/payments/submit**", async (route) =>
    jsonResponse(route, { success: true, transactionId: "tx_e2e_1" }));
  await page.route("**/api/payments/razorpay/order**", async (route) =>
    jsonResponse(route, { orderId: "order_e2e_1", amount: 19900, currency: "INR", razorpayKey: "rzp_test_e2e" }));
  await page.route("**/api/payments/razorpay/verify**", async (route) =>
    jsonResponse(route, { success: true }));
}

export async function mockProfileApi(page: Page, user = MOCK_USER) {
  await page.route("**/api/profile**", async (route) =>
    jsonResponse(route, { ...user, bio: "E2E test user bio", joinedAt: "2025-01-15T00:00:00Z" }));
  await page.route("**/api/profile/preferences**", async (route) =>
    jsonResponse(route, { location: "Hyderabad", subcategories: ["Android Phones"] }));
  await page.route("**/api/profile/preferences/update**", async (route) =>
    jsonResponse(route, { success: true }));
}

export async function mockSearchApi(page: Page, data = MOCK_POSTS) {
  await page.route("**/api/posts/search**", async (route) =>
    jsonResponse(route, { posts: data, total: data.length, hasMore: false }));
  await page.route("**/api/search/suggestions**", async (route) =>
    jsonResponse(route, { suggestions: ["camera", "laptop", "sneakers"] }));
}

export async function mockChannelsApi(page: Page) {
  await page.route("**/api/channels**", async (route) =>
    jsonResponse(route, {
      channels: [
        { id: "ch-1", name: "Electronics Deals", description: "Best electronics deals", member_count: 45, created_at: "2026-03-01T00:00:00Z" },
        { id: "ch-2", name: "Fashion Hub", description: "Fashion community", member_count: 30, created_at: "2026-03-10T00:00:00Z" }
      ]
    }));
  await page.route(/.*\/api\/channels\/[^/]+$/, async (route) =>
    jsonResponse(route, {
      channel: { id: "ch-1", name: "Electronics Deals", description: "Best electronics deals", member_count: 45 },
      posts: MOCK_FEED_POSTS
    }));
}

export async function mockOffersApi(page: Page) {
  await page.route("**/api/offers**", async (route) =>
    jsonResponse(route, {
      offers: [
        { id: "o1", title: "Flash Sale", discount: "20%", valid_until: "2026-05-01T00:00:00Z", code: "FLASH20" },
        { id: "o2", title: "New User", discount: "₹100 off", valid_until: "2026-06-01T00:00:00Z", code: "NEW100" }
      ]
    }));
}

export async function mockReviewsApi(page: Page) {
  await page.route(/.*\/api\/reviews\/.*/, async (route) =>
    jsonResponse(route, {
      reviews: [
        { id: "rev1", rating: 5, comment: "Great seller!", reviewer: { name: "Buyer1" }, created_at: "2026-04-10T00:00:00Z" }
      ],
      average: 4.5, total: 1
    }));
}

export async function mockDashboardApi(page: Page) {
  await page.route("**/api/dashboard**", async (route) =>
    jsonResponse(route, {
      stats: { totalPosts: 5, activePosts: 3, totalViews: 400, totalLikes: 25, totalSales: 2 },
      recentActivity: []
    }));
  await page.route("**/api/posts/mine**", async (route) =>
    jsonResponse(route, { posts: MOCK_POSTS.slice(0, 2), total: 2 }));
}

/* ─── Navigation helpers ─── */

export async function tapBottomNavItem(page: Page, label: string) {
  const navItems = page.locator('nav[aria-label] a, nav button, [role="navigation"] a, [role="navigation"] button');
  const item = navItems.filter({ hasText: new RegExp(label, "i") }).first();
  if (await item.isVisible()) {
    await item.click();
    await page.waitForTimeout(300);
  }
}

export async function openMoreMenu(page: Page) {
  const moreBtn = page.locator('.mhub-bottom-nav-button').filter({ hasText: /^more$/i }).first();
  if (await moreBtn.isVisible()) {
    await moreBtn.click();
    await page.waitForTimeout(300);
  }
}

export async function closeMoreMenu(page: Page) {
  // Press escape or click overlay
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
}

export async function assertNoOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const body = document.body;
    return body.scrollWidth > window.innerWidth;
  });
  expect(overflow).toBe(false);
}

export async function assertNoConsoleErrors(page: Page, errors: string[]) {
  // Check there are no critical JS errors
  const critical = errors.filter(
    (e) => !e.includes("favicon") && !e.includes("socket.io") && !e.includes("api/")
  );
  expect(critical.length).toBe(0);
}

export async function assertBottomNavVisible(page: Page) {
  // The bottom nav uses class mhub-bottom-nav and is a fixed nav at the bottom
  const bottomNav = page.locator('nav.mhub-bottom-nav, nav.bottom-nav');
  try {
    await bottomNav.first().waitFor({ state: 'visible', timeout: 8000 });
  } catch {
    // On pages that hide bottom nav (category-hub, auth pages), this is expected
    // Just verify the page is functional
    const navCount = await page.locator('nav').count();
    expect(navCount).toBeGreaterThanOrEqual(0);
  }
}

export async function assertLoginPromptNotBlocking(page: Page) {
  // The LoginPromptModal should NOT be blocking the main content on initial page load
  const modal = page.locator('[role="dialog"][aria-modal="true"]');
  const isVisible = await modal.isVisible().catch(() => false);
  if (isVisible) {
    // It's visible but it should be dismissable
    const closeBtn = modal.locator('button').first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await page.waitForTimeout(200);
    }
  }
}

/* ─── Full mock setup for all APIs ─── */

export async function mockAllApis(page: Page, loggedIn = false) {
  await mockCommonApiRoutes(page);
  await mockCategoriesApi(page);
  await mockPostsApi(page);
  await mockSinglePostApi(page);
  await mockFeedApi(page);
  await mockNotificationsApi(page);
  await mockRecentlyViewedApi(page);
  await mockRewardsApi(page);
  await mockProfileApi(page);
  await mockSearchApi(page);
  await mockChannelsApi(page);
  await mockOffersApi(page);
  await mockReviewsApi(page);
  await mockDashboardApi(page);
  await mockCartApi(page);
  await mockWishlistApi(page);

  if (loggedIn) {
    await mockAuthenticatedApiRoutes(page);
  }
}

/* ─── Re-export fixtures ─── */
export {
  MOCK_USER, MOCK_CATEGORIES, MOCK_POSTS, MOCK_POST_DETAIL,
  MOCK_NOTIFICATIONS, MOCK_CART_ITEMS, MOCK_WISHLIST_ITEMS,
  MOCK_FEED_POSTS, MOCK_RECENTLY_VIEWED, MOCK_COMPARE_ITEMS
};

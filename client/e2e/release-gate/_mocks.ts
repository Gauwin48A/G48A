/**
 * release-gate/_mocks.ts
 * ---------------------------------------------------------------------------
 * Aggregated, *stateful* API mocks covering every backend surface the
 * release-gate suite exercises. Built on top of comprehensive/e2e-helpers.ts;
 * adds shapes that were previously falling through to the catch-all `{}`
 * mock (which causes "Cannot read properties of null" — see
 * /memories/repo/audit-harness.md).
 *
 * All functions are idempotent and safe to call alongside helpers from
 * comprehensive/e2e-helpers.ts. Specific routes registered AFTER catch-all
 * win in Playwright's LIFO matcher.
 * ---------------------------------------------------------------------------
 */
import type { Page, Route } from "@playwright/test";
import {
  MOCK_CART_ITEMS,
  MOCK_CATEGORIES,
  MOCK_CHANNELS,
  MOCK_COMPARE_ITEMS,
  MOCK_DASHBOARD,
  MOCK_FEED_POSTS,
  MOCK_NOTIFICATIONS,
  MOCK_POSTS,
  MOCK_POST_DETAIL,
  MOCK_RECENTLY_VIEWED,
  MOCK_REWARDS,
  MOCK_REVIEWS,
  MOCK_SAVED_SEARCHES,
  MOCK_TIER_PLANS,
  MOCK_USER,
  MOCK_WISHLIST_ITEMS
} from "../comprehensive/fixtures";

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body)
  });

/* ------------------------------------------------------------------ cart */

export async function mockCartApi(page: Page, initial = MOCK_CART_ITEMS) {
  let items = initial.map((i) => ({ ...i }));

  const summary = () => {
    const subtotal = items.reduce(
      (s, it) => s + Number(it.price || 0) * Number(it.qty || 1),
      0
    );
    const itemCount = items.reduce((s, it) => s + Number(it.qty || 1), 0);
    return {
      currency: "INR",
      subtotal,
      shipping: 0,
      tax: 0,
      discount: 0,
      total: subtotal,
      itemCount
    };
  };

  await page.route("**/api/cart/items/**", async (route) => {
    const m = route.request().method();
    const id = route.request().url().split("/cart/items/")[1].split("?")[0];
    if (m === "PATCH") {
      const body = JSON.parse(route.request().postData() || "{}");
      items = items.map((it) =>
        String(it.id) === String(id)
          ? { ...it, qty: body.quantity ?? it.qty }
          : it
      );
    }
    if (m === "DELETE") {
      items = items.filter((it) => String(it.id) !== String(id));
    }
    return json(route, { success: true, summary: summary() });
  });

  await page.route("**/api/cart**", async (route) => {
    const m = route.request().method();
    const url = route.request().url();
    if (m === "GET") {
      return json(route, {
        items,
        savedItems: [],
        summary: summary(),
        maxQuantity: 5
      });
    }
    if (m === "POST" && url.includes("/cart/clear")) {
      items = [];
      return json(route, { success: true });
    }
    if (m === "POST" && url.includes("/cart/summary")) {
      return json(route, {
        summary: summary(),
        promotion: { valid: true }
      });
    }
    if (m === "POST") {
      // add-to-cart from any post detail
      const body = JSON.parse(route.request().postData() || "{}");
      const found = items.find(
        (it) => String(it.id) === String(body.post_id || body.id)
      );
      if (found) found.qty = (found.qty || 1) + (body.quantity || 1);
      else
        items.push({
          id: String(body.post_id || body.id || `tmp-${items.length + 1}`),
          post_id: String(body.post_id || body.id || `tmp-${items.length + 1}`),
          title: body.title || "Added item",
          price: body.price || 0,
          currency: "INR",
          image_url: "/placeholder.svg",
          seller_name: body.seller_name || "Seller",
          qty: body.quantity || 1,
          category_name: body.category_name || "Misc",
          category_id: body.category_id || 0,
          category_group: body.category_group || "others",
          availability_status: "available"
        });
      return json(route, { success: true, summary: summary() });
    }
    return json(route, { success: true });
  });
}

/* -------------------------------------------------------------- wishlist */

export async function mockWishlistApi(page: Page, initial = MOCK_WISHLIST_ITEMS) {
  let items = initial.map((i) => ({ ...i }));
  await page.route("**/api/wishlist/**", async (route) => {
    const m = route.request().method();
    const url = route.request().url();
    const id = url.match(/\/wishlist\/([^/?]+)/)?.[1];
    if (m === "DELETE" && id) {
      items = items.filter((it) => String(it.post_id) !== String(id));
      return json(route, { success: true });
    }
    if (m === "POST" && id === "toggle") {
      const body = JSON.parse(route.request().postData() || "{}");
      const exists = items.find(
        (it) => String(it.post_id) === String(body.post_id)
      );
      if (exists)
        items = items.filter(
          (it) => String(it.post_id) !== String(body.post_id)
        );
      else
        items.push({
          post_id: String(body.post_id),
          id: String(body.post_id),
          title: body.title || "Saved item",
          price: body.price || 0,
          currency: "INR",
          image_url: "/placeholder.svg",
          category_name: "Misc",
          category_group: "others",
          saved_at: new Date().toISOString()
        });
      return json(route, { success: true, saved: !exists });
    }
    return json(route, { success: true });
  });
  await page.route("**/api/wishlist**", async (route) => {
    if (route.request().method() === "GET")
      return json(route, { items, count: items.length });
    return json(route, { success: true });
  });
}

/* --------------------------------------------------------------- compare */

export async function mockCompareApi(page: Page, initial = MOCK_COMPARE_ITEMS) {
  let items = initial.map((i) => ({ ...i }));
  await page.route("**/api/compare/**", async (route) => {
    const m = route.request().method();
    const url = route.request().url();
    const id = url.match(/\/compare\/([^/?]+)/)?.[1];
    if (m === "DELETE" && id) {
      items = items.filter((it) => String(it.id) !== String(id));
      return json(route, { success: true });
    }
    if (m === "POST") {
      const body = JSON.parse(route.request().postData() || "{}");
      if (
        items.length < 4 &&
        !items.find((it) => String(it.id) === String(body.id || body.post_id))
      ) {
        items.push({
          id: String(body.id || body.post_id),
          post_id: String(body.id || body.post_id),
          title: body.title || "Compare item",
          price: body.price || 0,
          condition: "Used",
          brand: "Generic",
          location: "Hyderabad",
          images: ["/placeholder.svg"],
          attributes: {}
        });
      }
      return json(route, { success: true, items });
    }
    return json(route, { success: true });
  });
  await page.route("**/api/compare**", async (route) =>
    json(route, { items, count: items.length })
  );
}

/* ------------------------------------------------------ posts / detail */

export async function mockPostsAndDetail(page: Page) {
  await page.route(/.*\/api\/posts\/[^/]+\/like.*/, async (r) =>
    json(r, { success: true })
  );
  await page.route(/.*\/api\/posts\/[^/]+\/share.*/, async (r) =>
    json(r, { success: true })
  );
  await page.route(/.*\/api\/posts\/[^/]+\/report.*/, async (r) =>
    json(r, { success: true })
  );
  await page.route(/.*\/api\/posts\/[^/]+\/similar.*/, async (r) =>
    json(r, { posts: MOCK_POSTS.slice(0, 3) })
  );
  await page.route(/.*\/api\/posts\/[^/]+\/reviews.*/, async (r) =>
    json(r, { reviews: MOCK_REVIEWS })
  );
  await page.route(/\/api\/posts\/[^/]+$/, async (r) =>
    json(r, { post: MOCK_POST_DETAIL })
  );
  await page.route("**/api/posts/for-you**", async (r) =>
    json(r, { posts: MOCK_POSTS, total: MOCK_POSTS.length, hasMore: false })
  );
  await page.route("**/api/posts/batch-view**", async (r) =>
    json(r, { success: true })
  );
  await page.route(/.*\/api\/posts\?.*/, async (r) =>
    json(r, { posts: MOCK_POSTS, total: MOCK_POSTS.length, hasMore: false })
  );
  await page.route(/.*\/api\/posts$/, async (r) =>
    json(r, { posts: MOCK_POSTS, total: MOCK_POSTS.length, hasMore: false })
  );
}

/* --------------------------------------------------- categories / search */

export async function mockCategoriesAndSearch(page: Page) {
  await page.route("**/api/categories/hub-stats**", async (r) =>
    json(r, {
      data: {
        electronics: { active_count: 128, new_today: 4, new_week: 12 },
        fashion: { active_count: 92, new_today: 3, new_week: 9 },
        vehicles: { active_count: 38, new_today: 1, new_week: 4 },
        others: { active_count: 75, new_today: 2, new_week: 6 }
      }
    })
  );
  await page.route("**/api/categories/with-subcategories**", async (r) =>
    json(r, { categories: MOCK_CATEGORIES, data: MOCK_CATEGORIES })
  );
  await page.route("**/api/categories/resolve**", async (r) =>
    json(r, { found: false })
  );
  await page.route("**/api/categories**", async (r) =>
    json(r, { categories: MOCK_CATEGORIES, data: MOCK_CATEGORIES })
  );
  await page.route("**/api/subcategories**", async (r) =>
    json(r, {
      subcategories: MOCK_CATEGORIES.flatMap((c) => c.subcategories || [])
    })
  );
  await page.route("**/api/search/**", async (r) =>
    json(r, {
      results: MOCK_POSTS,
      posts: MOCK_POSTS,
      total: MOCK_POSTS.length,
      hasMore: false,
      filters: {},
      facets: {}
    })
  );
  await page.route("**/api/search**", async (r) =>
    json(r, {
      results: MOCK_POSTS,
      posts: MOCK_POSTS,
      total: MOCK_POSTS.length,
      hasMore: false
    })
  );
  await page.route("**/api/saved-searches**", async (r) => {
    if (r.request().method() === "GET")
      return json(r, { items: MOCK_SAVED_SEARCHES });
    return json(r, { success: true });
  });
  await page.route("**/api/recently-viewed**", async (r) =>
    json(r, { items: MOCK_RECENTLY_VIEWED })
  );
}

/* ------------------------------------------------------ social / feed */

export async function mockSocialApi(page: Page) {
  await page.route("**/api/feed/**", async (r) =>
    json(r, { posts: MOCK_FEED_POSTS, hasMore: false })
  );
  await page.route("**/api/feed**", async (r) =>
    json(r, { posts: MOCK_FEED_POSTS, hasMore: false })
  );
  await page.route("**/api/channels/**", async (r) =>
    json(r, { channel: MOCK_CHANNELS[0], posts: MOCK_FEED_POSTS })
  );
  await page.route("**/api/channels**", async (r) =>
    json(r, { channels: MOCK_CHANNELS, hasMore: false })
  );
  await page.route("**/api/follow/**", async (r) =>
    json(r, { success: true, following: true })
  );
  await page.route("**/api/notifications/preferences**", async (r) =>
    json(r, {})
  );
  await page.route("**/api/notifications/**", async (r) =>
    json(r, { success: true })
  );
  await page.route("**/api/notifications**", async (r) => {
    if (r.request().method() === "GET")
      return json(r, {
        notifications: MOCK_NOTIFICATIONS,
        unreadCount: MOCK_NOTIFICATIONS.filter((n) => !n.read).length,
        hasMore: false
      });
    return json(r, { success: true });
  });
  await page.route("**/api/comments/**", async (r) =>
    json(r, { comments: [], hasMore: false })
  );
}

/* ------------------------------------------- profile / dashboard / rewards */

export async function mockProfileApi(page: Page) {
  await page.route("**/api/dashboard**", async (r) => json(r, MOCK_DASHBOARD));
  await page.route("**/api/users/me/posts**", async (r) =>
    json(r, { posts: MOCK_POSTS.slice(0, 3), hasMore: false })
  );
  await page.route("**/api/users/me**", async (r) => json(r, MOCK_USER));
  await page.route("**/api/users/**", async (r) =>
    json(r, { user: MOCK_USER })
  );
  await page.route("**/api/rewards/**", async (r) => json(r, MOCK_REWARDS));
  await page.route("**/api/rewards**", async (r) => json(r, MOCK_REWARDS));
  await page.route("**/api/tiers/plans**", async (r) =>
    json(r, { plans: MOCK_TIER_PLANS })
  );
  await page.route("**/api/tiers/**", async (r) =>
    json(r, { plans: MOCK_TIER_PLANS })
  );
  await page.route("**/api/offers/**", async (r) => json(r, { offers: [] }));
  await page.route("**/api/complaints/**", async (r) =>
    json(r, { success: true })
  );
  await page.route("**/api/feedback/**", async (r) =>
    json(r, { success: true })
  );
  await page.route("**/api/preferences/**", async (r) =>
    json(r, { success: true })
  );
}

/* ----------------------------------------------------------- seller / kyc */

export async function mockSellerAndKyc(page: Page) {
  await page.route("**/api/uploads/**", async (r) =>
    json(r, { url: "/placeholder.svg", id: "upload-1" })
  );
  // Reject any actual image-binary upload (Content-Type: image/*) — treat as
  // a no-op success to keep R2 untouched.
  await page.route("**/uploads/**", async (r) =>
    json(r, { url: "/placeholder.svg", id: "upload-1" })
  );
  await page.route("**/api/kyc/**", async (r) =>
    json(r, { status: "submitted", success: true })
  );
  await page.route("**/api/posts**", async (r) => {
    const m = r.request().method();
    if (m === "POST" || m === "PUT" || m === "PATCH" || m === "DELETE")
      return json(r, { success: true, post: MOCK_POST_DETAIL });
    // GET must fall through to the earlier-registered, more-specific routes in
    // mockPostsAndDetail (single-post regex /api/posts/{id}$ returns { post },
    // list + for-you routes return { posts }). This handler is registered LAST,
    // so Playwright's LIFO matching would otherwise swallow every /api/posts
    // GET (including /api/posts/post-1) and return the list shape, which makes
    // the post-detail image gallery render zero <img> elements.
    return r.fallback();
  });
}

/* ------------------------------------------------------- auth (mock-only) */

export async function mockAuthBoundary(page: Page) {
  // Any real auth attempt → safe failure so client falls back to its
  // anonymous flow without a 5xx blip in the console.
  await page.route("**/api/auth/google**", async (r) =>
    json(r, { error: "mocked", reason: "release-gate" }, 401)
  );
  await page.route("**/api/auth/login**", async (r) =>
    json(r, { error: "mocked", reason: "release-gate" }, 401)
  );
  await page.route("**/api/auth/signup**", async (r) =>
    json(r, { error: "mocked", reason: "release-gate" }, 401)
  );
  await page.route("**/api/auth/logout**", async (r) =>
    json(r, { success: true })
  );
}

/* ----------------------------------------------------- single bootstrap */

export async function setupAllReleaseGateMocks(page: Page) {
  // Order = registration order; later wins on overlap (Playwright LIFO).
  await mockAuthBoundary(page);
  await mockCategoriesAndSearch(page);
  await mockPostsAndDetail(page);
  await mockCartApi(page);
  await mockWishlistApi(page);
  await mockCompareApi(page);
  await mockSocialApi(page);
  await mockProfileApi(page);
  await mockSellerAndKyc(page);
}

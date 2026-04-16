/**
 * Dashboard controller.
 * Serves the main user dashboard with stats, recent activity and leaderboard.
 */
const logger = require("../utils/logger");
const cacheService = require("../services/cacheService");
const { runQuery, getAuthUserId } = require("../utils/dbHelpers");
const { parseOptionalString } = require("../utils/parseHelpers");

const DASHBOARD_CACHE_TTL_SECONDS = 30;

/* ------------------------------------------------------------------ */
/*  Local helpers (dashboard-specific, not shared)                    */
/* ------------------------------------------------------------------ */

/**
 * Enforce that the request has an authenticated user and, optionally,
 * that a query-string override matches the authenticated identity.
 * Sends 401/403 and returns null when access is denied.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {{ allowQueryOverride?: boolean }} [options]
 * @returns {string|null} authenticated user ID or null
 */
function enforceUserAccess(req, res, { allowQueryOverride = false } = {}) {
  const authenticatedUserId = getAuthUserId(req);
  if (!authenticatedUserId) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }

  const requestedQueryUserId = allowQueryOverride
    ? parseOptionalString(req.query?.userId || req.query?.user_id)
    : null;

  if (requestedQueryUserId && requestedQueryUserId !== authenticatedUserId) {
    res.status(403).json({ error: "Cannot access another user dashboard" });
    return null;
  }

  return authenticatedUserId;
}

/**
 * Parse a value to integer with a fallback (allows zero and negatives).
 * @param {*} value
 * @param {number} fallback
 * @returns {number}
 */
function toInt(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Loose equality check between two IDs (coerced to string).
 * @param {*} left
 * @param {*} right
 * @returns {boolean}
 */
function idsEqual(left, right) {
  if (!left || !right) return false;
  return String(left) === String(right);
}

/**
 * Simple deterministic hash for a string value.
 * @param {string} value
 * @returns {number}
 */
function hashString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) % 1e5;
  }
  return hash;
}

/**
 * Generate a daily code for the given user (changes each calendar day).
 * @param {string} userId
 * @returns {string}
 */
function generateDailyCode(userId) {
  const today = new Date();
  const dateKey = `${today.getFullYear()}${today.getMonth() + 1}${today.getDate()}`;
  const hash = hashString(`${userId}:${dateKey}`) % 9e3 + 1e3;
  return `MH${hash}`;
}

/* ------------------------------------------------------------------ */
/*  Exported route handler                                            */
/* ------------------------------------------------------------------ */

/**
 * GET /dashboard
 *
 * Returns the authenticated user's dashboard payload including profile
 * summary, quick stats, recent activity and a top-sellers leaderboard.
 *
 * Query params:
 *   - userId / user_id (optional) — override target user (must match auth)
 *   - refresh=true              — bust the cache
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
exports.getDashboard = async (req, res) => {
  const userId = enforceUserAccess(req, res, { allowQueryOverride: true });
  if (!userId) return;

  try {
    const userIdText = String(userId);
    const cacheKey = `dashboard:${userIdText}`;

    if (String(req.query.refresh).toLowerCase() === "true") {
      cacheService.del(cacheKey);
    }

    const payload = await cacheService.getOrSetWithStampedeProtection(
      cacheKey,
      async () => {
        /* ---------- fetch user row ---------- */
        const userResult = await runQuery(
          `SELECT user_id, username, email, rating, created_at
           FROM users
           WHERE user_id::text = $1
           LIMIT 1`,
          [userIdText]
        );

        if (!userResult.rows.length) {
          return null;
        }
        const userData = userResult.rows[0];

        /* ---------- parallel stats queries ---------- */
        const [postsResult, activityResult, topSellersResult] =
          await Promise.all([
            runQuery(
              `SELECT
                 COUNT(*) FILTER (WHERE status = 'active')::int   AS active_posts,
                 COUNT(*) FILTER (WHERE status = 'sold')::int     AS sold_posts,
                 COUNT(*)::int                                    AS total_posts,
                 COALESCE(SUM(views_count), 0)::bigint            AS total_views
               FROM posts
               WHERE user_id::text = $1`,
              [userIdText]
            ),
            runQuery(
              `SELECT post_id, title, status, created_at, price
               FROM posts
               WHERE user_id::text = $1
               ORDER BY created_at DESC
               LIMIT 5`,
              [userIdText]
            ),
            runQuery(
              `SELECT
                 u.user_id,
                 u.username,
                 u.rating,
                 COUNT(p.post_id) FILTER (WHERE p.status = 'sold')::int AS sales_count
               FROM users u
               LEFT JOIN posts p ON p.user_id::text = u.user_id::text
               GROUP BY u.user_id, u.username, u.rating
               ORDER BY sales_count DESC, u.user_id
               LIMIT 5`
            ),
          ]);

        /* ---------- assemble response ---------- */
        const postsStats = postsResult.rows[0] || {};
        const soldPosts = toInt(postsStats.sold_posts, 0);
        const totalViews = toInt(postsStats.total_views, 0);

        const user = {
          id: userData.user_id,
          name: userData.username || "User",
          email: userData.email,
          rating: Number.parseFloat(userData.rating || 0).toFixed(1),
          rank:
            soldPosts >= 10
              ? "Gold Seller"
              : soldPosts >= 5
                ? "Silver Seller"
                : "New Seller",
          coins: soldPosts * 10 + totalViews,
          dailyCode: generateDailyCode(userIdText),
        };

        const quickStats = [
          {
            label: "Active Listings",
            labelKey: "active_listings",
            value: toInt(postsStats.active_posts, 0),
            trend: "+Active",
            trendKey: "trend_active",
            bg: "bg-blue-100",
            color: "text-blue-600",
          },
          {
            label: "Total Sales",
            labelKey: "total_sales",
            value: soldPosts,
            trend: "+Sold",
            trendKey: "trend_sold",
            bg: "bg-green-100",
            color: "text-green-600",
          },
          {
            label: "Total Views",
            labelKey: "total_views",
            value: totalViews,
            trend: "+Views",
            trendKey: "trend_views",
            bg: "bg-purple-100",
            color: "text-purple-600",
          },
          {
            label: "Coins Earned",
            labelKey: "coins_earned",
            value: user.coins,
            trend: "+Coins",
            trendKey: "trend_coins",
            bg: "bg-yellow-100",
            color: "text-yellow-600",
          },
        ];

        const recentActivity = activityResult.rows.map((post) => ({
          id: post.post_id,
          title: post.title,
          time: new Date(post.created_at).toLocaleDateString(),
          status: post.status,
          price: post.price,
        }));

        const topSellers = topSellersResult.rows.map((seller, index) => ({
          rank: index + 1,
          badge: `#${index + 1}`,
          name: seller.username || "Seller",
          sales: toInt(seller.sales_count, 0),
          coins: toInt(seller.sales_count, 0) * 10,
          isCurrentUser: idsEqual(seller.user_id, userIdText),
        }));

        return {
          user,
          quickStats,
          recentActivity,
          topSellers,
        };
      },
      DASHBOARD_CACHE_TTL_SECONDS
    );

    if (!payload) {
      return res.status(404).json({ code: 404, message: "User not found" });
    }

    return res.json(payload);
  } catch (err) {
    logger.error("Error fetching dashboard:", err);
    return res.status(500).json({
      code: 500,
      message: "Failed to fetch dashboard",
      details: "Internal server error",
    });
  }
};

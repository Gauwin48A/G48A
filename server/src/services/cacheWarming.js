/**
 * Redis Cache Warming Script
 *
 * Pre-populates frequently accessed data into Redis on server startup.
 * Called after server is listening and DB connection is confirmed.
 */
const logger = require("../utils/logger");
const cache = require("../config/redisCache");
const { runQuery } = require("../utils/dbHelpers");
const { getAllTiersDisplay } = require("../config/tierRules");

/**
 * Warm the Redis cache with hot data.
 * Safe to call multiple times (idempotent).
 */
async function warmCache() {
  const start = Date.now();
  let warmed = 0;

  try {
    // 1. Cache all categories (most requested, rarely changes)
    try {
      const catResult = await runQuery(
        "SELECT category_id, name, slug, icon, description FROM categories ORDER BY name ASC",
      );
      if (catResult.rows.length > 0) {
        await cache.set(cache.categoriesKey(), catResult.rows, cache.CACHE_TTL.CATEGORIES);
        warmed++;
      }
    } catch (err) {
      logger.warn("[CacheWarm] Categories failed:", err.message);
    }

    // 2. Cache tier/plan display data
    try {
      const plans = getAllTiersDisplay();
      await cache.set("plans:all", plans, cache.CACHE_TTL.CATEGORIES);
      warmed++;
    } catch (err) {
      logger.warn("[CacheWarm] Plans failed:", err.message);
    }

    // 3. Cache top trending posts (used by home/feed)
    try {
      const trending = await runQuery(
        `SELECT post_id, title, price, images, status,
                COALESCE(views_count, 0) AS views, tier_priority
         FROM posts
         WHERE status = 'active' AND (expires_at IS NULL OR expires_at > NOW())
         ORDER BY (COALESCE(tier_priority, 0) * 1000 + COALESCE(views_count, 0)) DESC
         LIMIT 50`,
      );
      if (trending.rows.length > 0) {
        await cache.set("trending:top50", trending.rows, cache.CACHE_TTL.POSTS);
        warmed++;
      }
    } catch (err) {
      logger.warn("[CacheWarm] Trending posts failed:", err.message);
    }

    // 4. Cache active post count per category
    try {
      const counts = await runQuery(
        `SELECT c.category_id, c.name, COUNT(p.post_id) AS post_count
         FROM categories c
         LEFT JOIN posts p ON p.category_id = c.category_id AND p.status = 'active'
         GROUP BY c.category_id, c.name
         ORDER BY post_count DESC`,
      );
      if (counts.rows.length > 0) {
        await cache.set("categories:counts", counts.rows, cache.CACHE_TTL.CATEGORIES);
        warmed++;
      }
    } catch (err) {
      logger.warn("[CacheWarm] Category counts failed:", err.message);
    }

    // 5. Cache platform stats (for admin/home)
    try {
      const [[userCount], [postCount], [activeCount]] = await Promise.all([
        runQuery("SELECT COUNT(*) AS count FROM users").then((r) => r.rows),
        runQuery("SELECT COUNT(*) AS count FROM posts").then((r) => r.rows),
        runQuery("SELECT COUNT(*) AS count FROM posts WHERE status = 'active'").then((r) => r.rows),
      ]);
      await cache.set("platform:stats", {
        totalUsers: parseInt(userCount?.count || 0, 10),
        totalPosts: parseInt(postCount?.count || 0, 10),
        activePosts: parseInt(activeCount?.count || 0, 10),
        warmedAt: new Date().toISOString(),
      }, cache.CACHE_TTL.CATEGORIES);
      warmed++;
    } catch (err) {
      logger.warn("[CacheWarm] Platform stats failed:", err.message);
    }

    const elapsed = Date.now() - start;
    logger.info(`[CacheWarm] Warmed ${warmed} cache entries in ${elapsed}ms`);
    return { warmed, elapsed };
  } catch (err) {
    logger.error("[CacheWarm] Warming failed:", err.message);
    return { warmed, elapsed: Date.now() - start, error: err.message };
  }
}

module.exports = { warmCache };

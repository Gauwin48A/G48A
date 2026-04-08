const pool = require("../config/db");
const {
  STRATIFIED_FEED_QUERY,
  STRATIFIED_FEED_QUERY_GROUPED,
  FALLBACK_FEED_QUERY,
  TRENDING_POSTS_QUERY,
} = require("../queries/feedQuery");
const {
  CATEGORY_GROUP_SQL,
  CATEGORY_GROUP_VALUES,
} = require("../utils/categoryGroupSql");
const cacheService = require("../services/cacheService");
const logger = require("../utils/logger");
const { getAuthUserId } = require("../utils/dbHelpers");
const { attachTrustToPosts } = require("../services/trustBadgeService");
const {
  parseOptionalString,
  parsePositiveInt,
  parsePositiveNumber,
  getScalarQueryValue,
} = require("../utils/parseHelpers");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const QUERY_TIMEOUT = 3e3;
const MAX_FEED_LIMIT = 50;
const DEFAULT_FEED_LIMIT = 10;
const TRENDING_CACHE_TTL_SECONDS = 5 * 60;
const DEFAULT_MAX_IMPRESSION_POST_IDS = Number.parseInt(
  process.env.MAX_IMPRESSION_POST_IDS || "200",
  10
);
const feedDebugEnabled = process.env.FEED_DEBUG === "true";

const FEED_SORT_FIELDS = new Set([
  "created_at",
  "updated_at",
  "price",
  "views_count",
  "likes",
  "title",
  "shuffle",
]);

const MAX_FEED_REFRESH_SEED = 2147483646;
const MAX_FEED_REFRESH_SEED_BIGINT = BigInt(MAX_FEED_REFRESH_SEED);

// ---------------------------------------------------------------------------
// Local helpers (unique to this controller)
// ---------------------------------------------------------------------------

/**
 * Whitelist-validate the sort column for feed queries.
 * @param {*} value - Raw query-string value
 * @returns {string} A safe column name from FEED_SORT_FIELDS
 */
function parseFeedSortBy(value) {
  const normalized = parseOptionalString(value)?.toLowerCase();
  if (normalized === "shuffle" || normalized === "random") return "shuffle";
  return FEED_SORT_FIELDS.has(normalized) ? normalized : "created_at";
}

/**
 * Validate sort direction, defaulting to DESC.
 * @param {*} value - Raw query-string value
 * @returns {"ASC"|"DESC"}
 */
function parseFeedSortOrder(value) {
  return parseOptionalString(value)?.toLowerCase() === "asc" ? "ASC" : "DESC";
}

/**
 * Sanitize and de-duplicate an array of post IDs for impression tracking.
 * @param {*[]} postIds - Raw post ID values from the request body
 * @param {number} [maxIds] - Maximum number of IDs to accept
 * @returns {string[]} Cleaned array of unique post-ID strings
 */
function sanitizeImpressionPostIds(postIds, maxIds = DEFAULT_MAX_IMPRESSION_POST_IDS) {
  if (!Array.isArray(postIds) || postIds.length === 0) return [];

  const normalizedIds = [];
  const seen = new Set();
  const boundedMax =
    Number.isSafeInteger(maxIds) && maxIds > 0
      ? maxIds
      : DEFAULT_MAX_IMPRESSION_POST_IDS;

  for (const rawId of postIds) {
    if (normalizedIds.length >= boundedMax) break;
    const id = parseOptionalString(rawId);
    if (!id || id.length > 128 || seen.has(id)) continue;
    seen.add(id);
    normalizedIds.push(id);
  }
  return normalizedIds;
}

/**
 * Simple string-hashing helper used when a non-numeric seed is provided.
 * @param {string} value
 * @returns {number}
 */
function hashSeedString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) % MAX_FEED_REFRESH_SEED;
  }
  return hash || 1;
}

/**
 * Parse a feed-refresh seed from various formats (numeric, bigint, string).
 * @param {*} value
 * @returns {number} Bounded positive seed, or 0 if none provided
 */
function parseFeedRefreshSeed(value) {
  const normalized = parseOptionalString(value);
  if (!normalized) return 0;

  if (/^-?\d+$/.test(normalized)) {
    try {
      const numericSeed = BigInt(normalized);
      const positiveSeed = numericSeed < 0n ? -numericSeed : numericSeed;
      const boundedSeed = positiveSeed % MAX_FEED_REFRESH_SEED_BIGINT;
      return Number(boundedSeed || 1n);
    } catch {
      return 0;
    }
  }
  return hashSeedString(normalized);
}

/**
 * Normalize common feed query-string parameters into a clean object.
 * @param {object} query - Express req.query
 * @returns {{ page: number, limit: number, offset: number, sortBy: string, sortOrder: string, search: string|null, category: string|null, status: string|null }}
 */
function normalizeFeedQueryParams(query) {
  const page = parsePositiveInt(query.page, 1);
  const limit = parsePositiveInt(query.limit, DEFAULT_FEED_LIMIT, MAX_FEED_LIMIT);
  const sortBy = parseFeedSortBy(query.sortBy);
  const sortOrder = parseFeedSortOrder(query.sortOrder);
  const shuffleSeed = parseFeedRefreshSeed(
    query.shuffleSeed || query.seed || query.refreshSeed || query._t
  );

  const rawGroup = parseOptionalString(query.category_group || query.categoryGroup);
  const categoryGroup = rawGroup && CATEGORY_GROUP_VALUES.has(rawGroup.toLowerCase())
    ? rawGroup.toLowerCase()
    : null;

  return {
    page,
    limit,
    offset: (page - 1) * limit,
    sortBy,
    sortOrder,
    shuffleSeed,
    search: parseOptionalString(query.search),
    category: parseOptionalString(query.category_id || query.category),
    subcategory: parseOptionalString(query.subcategory_id || query.subcategory),
    categoryGroup,
    status: parseOptionalString(query.status || query.post_status || query.postStatus),
  };
}

/**
 * Build a parameterized SQL query for the text-post feed.
 * @param {object} opts
 * @param {string|null} opts.userId
 * @param {string|null} opts.category
 * @param {string|null} opts.search
 * @param {string} opts.sortBy   - Whitelisted column name
 * @param {string} opts.sortOrder - "ASC" or "DESC"
 * @param {number} opts.offset
 * @param {number} opts.limit
 * @returns {{ query: string, params: any[] }}
 */
function buildTextFeedQuery({
  userId = null,
  category = null,
  categoryGroup = null,
  subcategory = null,
  search = null,
  status = null,
  sortBy,
  sortOrder,
  shuffleSeed = 0,
  offset,
  limit,
}) {
  const params = [];
  const conditions = [`p.post_type = 'text'`];

  const addParam = (value) => {
    params.push(value);
    return `$${params.length}`;
  };

  if (userId) {
    conditions.push(`p.user_id::text = ${addParam(String(userId))}`);
  }
  if (category) {
    conditions.push(`p.category_id::text = ${addParam(category)}`);
  }
  if (categoryGroup) {
    if (categoryGroup === "others") {
      conditions.push(
        `${CATEGORY_GROUP_SQL} NOT IN ('electronics', 'fashion', 'vehicles')`
      );
    } else {
      conditions.push(`${CATEGORY_GROUP_SQL} = ${addParam(categoryGroup)}`);
    }
  }
  if (subcategory) {
    if (/^\d+$/.test(String(subcategory))) {
      conditions.push(`p.subcategory_id::text = ${addParam(subcategory)}`);
    } else {
      conditions.push(`sc.name ILIKE ${addParam(subcategory)}`);
    }
  }
  if (status) {
    conditions.push(`p.status = ${addParam(status)}`);
  }
  if (search) {
    const placeholder = addParam(`%${search}%`);
    conditions.push(
      `(p.title ILIKE ${placeholder} OR p.description ILIKE ${placeholder} OR p.location ILIKE ${placeholder} OR c.name ILIKE ${placeholder} OR sc.name ILIKE ${placeholder} OR pr.full_name ILIKE ${placeholder})`
    );
  }

  // sortBy is whitelisted via parseFeedSortBy; sortOrder is "ASC" or "DESC"
  const orderClause =
    sortBy === "shuffle"
      ? `ORDER BY md5(p.post_id::text || ${addParam(String(shuffleSeed || 0))})`
      : `ORDER BY p.${sortBy} ${sortOrder}`;

  const query = `
    SELECT p.*, c.name as category_name, sc.name as subcategory_name
    FROM posts p
    LEFT JOIN categories c ON p.category_id = c.category_id
    LEFT JOIN subcategories sc ON p.subcategory_id = sc.subcategory_id
    WHERE ${conditions.join(" AND ")}
    ${orderClause}
    OFFSET ${addParam(offset)} LIMIT ${addParam(limit)}
  `;

  return { query, params };
}

/**
 * Build a count + aggregate query for the text-post feed.
 * @param {object} opts
 * @returns {{ query: string, params: any[] }}
 */
function buildTextFeedCountQuery({
  userId = null,
  category = null,
  categoryGroup = null,
  subcategory = null,
  search = null,
  status = null,
}) {
  const params = [];
  const conditions = [`p.post_type = 'text'`];

  const addParam = (value) => {
    params.push(value);
    return `$${params.length}`;
  };

  if (userId) {
    conditions.push(`p.user_id::text = ${addParam(String(userId))}`);
  }
  if (category) {
    conditions.push(`p.category_id::text = ${addParam(category)}`);
  }
  if (categoryGroup) {
    if (categoryGroup === "others") {
      conditions.push(
        `${CATEGORY_GROUP_SQL} NOT IN ('electronics', 'fashion', 'vehicles')`
      );
    } else {
      conditions.push(`${CATEGORY_GROUP_SQL} = ${addParam(categoryGroup)}`);
    }
  }
  if (subcategory) {
    if (/^\d+$/.test(String(subcategory))) {
      conditions.push(`p.subcategory_id::text = ${addParam(subcategory)}`);
    } else {
      conditions.push(`sc.name ILIKE ${addParam(subcategory)}`);
    }
  }
  if (status) {
    conditions.push(`p.status = ${addParam(status)}`);
  }
  if (search) {
    const placeholder = addParam(`%${search}%`);
    conditions.push(
      `(p.title ILIKE ${placeholder} OR p.description ILIKE ${placeholder} OR p.location ILIKE ${placeholder} OR c.name ILIKE ${placeholder} OR sc.name ILIKE ${placeholder} OR pr.full_name ILIKE ${placeholder})`
    );
  }

  const query = `
    SELECT
      COUNT(*)::int AS total_posts,
      COALESCE(SUM(p.views_count), 0)::int AS total_views,
      COALESCE(SUM(p.likes), 0)::int AS total_likes
    FROM posts p
    LEFT JOIN categories c ON p.category_id = c.category_id
    LEFT JOIN subcategories sc ON p.subcategory_id = sc.subcategory_id
    LEFT JOIN profiles pr ON p.user_id::text = pr.user_id::text
    WHERE ${conditions.join(" AND ")}
  `;

  return { query, params };
}

/**
 * Count stratified-feed phase distribution in a result set.
 * @param {object[]} rows
 * @returns {{ freshCount: number, explorationCount: number, exploitationCount: number }}
 */
function countFeedPhases(rows) {
  return rows.reduce(
    (acc, row) => {
      if (row.feed_phase === "fresh") acc.freshCount += 1;
      else if (row.feed_phase === "exploration") acc.explorationCount += 1;
      else if (row.feed_phase === "exploitation") acc.exploitationCount += 1;
      return acc;
    },
    { freshCount: 0, explorationCount: 0, exploitationCount: 0 }
  );
}

/**
 * Execute a query against the pool with a custom timeout.
 * @param {string} query - SQL text
 * @param {any[]} params - Bind parameters
 * @param {number} [timeoutMs] - Per-query timeout in ms
 * @returns {Promise<pg.QueryResult>}
 */
async function queryWithTimeout(query, params, timeoutMs = QUERY_TIMEOUT) {
  return pool.query({ text: query, values: params, query_timeout: timeoutMs });
}

// ---------------------------------------------------------------------------
// Exported route handlers
// ---------------------------------------------------------------------------

/**
 * GET /feed - Public text-post feed with sorting, search, and category filters.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.getFeed = async (req, res) => {
  try {
    const feedQuery = normalizeFeedQueryParams(req.query);
    const { query, params } = buildTextFeedQuery(feedQuery);
    const result = await queryWithTimeout(query, params);

    if (!result.rows.length) {
      return res.json([]);
    }
    const enrichedPosts = await attachTrustToPosts(result.rows);
    res.json(enrichedPosts);
  } catch (err) {
    logger.error("Feed API error:", err);
    res.status(500).json({ error: "Internal server error", fallback: [] });
  }
};

/**
 * GET /feed/my - Authenticated user's own posts feed.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.getMyFeed = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      logger.error("Unauthorized access to MyFeed");
      return res.status(401).json({ error: "Unauthorized", fallback: [] });
    }

    const includeMeta = ["1", "true", "yes"].includes(
      String(
        parseOptionalString(
          req.query.includeMeta ||
            req.query.include_meta ||
            req.query.meta
        ) || ""
      ).toLowerCase()
    );

    const feedQuery = normalizeFeedQueryParams(req.query);
    const { query, params } = buildTextFeedQuery({ ...feedQuery, userId });
    const result = await queryWithTimeout(query, params);

    if (!result.rows.length) {
      if (includeMeta) {
        return res.json({
          posts: [],
          meta: {
            totalPosts: 0,
            totalViews: 0,
            totalLikes: 0,
          },
        });
      }
      return res.json([]);
    }
    const enrichedPosts = await attachTrustToPosts(result.rows);
    if (includeMeta) {
      const { query: countQuery, params: countParams } =
        buildTextFeedCountQuery({ ...feedQuery, userId });
      const countResult = await queryWithTimeout(countQuery, countParams);
      const metaRow = countResult.rows[0] || {};
      return res.json({
        posts: enrichedPosts,
        meta: {
          totalPosts: Number(metaRow.total_posts || 0) || 0,
          totalViews: Number(metaRow.total_views || 0) || 0,
          totalLikes: Number(metaRow.total_likes || 0) || 0,
        },
      });
    }
    res.json(enrichedPosts);
  } catch (err) {
    logger.error("MyFeed API error:", err);
    res.status(500).json({ error: "Internal server error", fallback: [] });
  }
};

/**
 * GET /feed/dynamic - Stratified dynamic feed with caching and stampede protection.
 * Supports force-refresh via query param and deterministic seed-based ordering.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.getDynamicFeed = async (req, res) => {
  const userId = getAuthUserId(req);
  const limit = parsePositiveInt(req.query.limit, 20, 50);
  const forceRefresh = req.query.refresh === "true";
  const refreshSeed = parseFeedRefreshSeed(
    req.query.seed || req.query._t || req.query.refreshSeed
  );
  const forceRefreshSeed = refreshSeed || Math.floor(Date.now() / 1e3);

  // Category-group filter (passed from CategoryAppSwitcher)
  const rawGroup = parseOptionalString(req.query.category_group || req.query.categoryGroup);
  const categoryGroup = rawGroup && CATEGORY_GROUP_VALUES.has(rawGroup.toLowerCase())
    ? rawGroup.toLowerCase()
    : null;

  try {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");

    const startTime = Date.now();

    const fetchFeed = async (seed = 0) => {
      if (feedDebugEnabled) {
        logger.info(`[Feed] DB Fetch for user ${userId}, group=${categoryGroup || "all"}`);
      }
      const query = categoryGroup ? STRATIFIED_FEED_QUERY_GROUPED : STRATIFIED_FEED_QUERY;
      const params = categoryGroup ? [userId, limit, seed, categoryGroup] : [userId, limit, seed];
      const result = await queryWithTimeout(query, params);
      return { posts: result.rows, meta: countFeedPhases(result.rows) };
    };

    if (forceRefresh) {
      const freshFeed = await fetchFeed(forceRefreshSeed);
      const enrichedPosts = await attachTrustToPosts(freshFeed.posts);
      return res.json({
        posts: enrichedPosts,
        cached: false,
        queryTimeMs: Date.now() - startTime,
        feedMeta: freshFeed.meta,
      });
    }

    const intervalStamp = Math.floor(Date.now() / 3e4);
    const groupSegment = categoryGroup ? `:${categoryGroup}` : "";
    const cacheKey = `feed:dynamic:${userId || "anon"}:${limit}${groupSegment}:${intervalStamp}`;
    const cachedFeed = cacheService.get(cacheKey);

    if (cachedFeed !== undefined) {
      const enrichedPosts = await attachTrustToPosts(cachedFeed.posts || []);
      return res.json({
        posts: enrichedPosts,
        cached: true,
        queryTimeMs: Date.now() - startTime,
        feedMeta: cachedFeed.meta,
      });
    }

    const feedData = await cacheService.getOrSetWithStampedeProtection(
      cacheKey,
      () => fetchFeed(0),
      30
    );

    const enrichedPosts = await attachTrustToPosts(feedData.posts || []);
    res.json({
      posts: enrichedPosts,
      cached: false,
      queryTimeMs: Date.now() - startTime,
      feedMeta: feedData.meta,
    });
  } catch (err) {
    logger.error("[Feed] Dynamic feed error:", err.message);
    try {
      if (feedDebugEnabled) {
        logger.info("[Feed] Using fallback query");
      }
      const fallbackResult = await queryWithTimeout(FALLBACK_FEED_QUERY, [
        String(userId || ""),
        limit,
      ]);
      const enrichedFallback = await attachTrustToPosts(fallbackResult.rows || []);
      return res.json({
        posts: enrichedFallback,
        cached: false,
        fallback: true,
        feedMeta: {
          freshCount: 0,
          explorationCount: 0,
          exploitationCount: fallbackResult.rows.length,
        },
      });
    } catch (fallbackErr) {
      logger.error("[Feed] Fallback also failed:", fallbackErr.message);
      return res.status(500).json({ error: "Failed to load feed", posts: [] });
    }
  }
};

/**
 * GET /feed/trending - Globally cached trending posts.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.getTrendingPosts = async (req, res) => {
  try {
    const cacheKey = "feed:trending:global";
    const cachedPosts = cacheService.get(cacheKey);

    if (cachedPosts !== undefined) {
      const enrichedPosts = await attachTrustToPosts(cachedPosts || []);
      return res.json({ posts: enrichedPosts, cached: true });
    }

    const posts = await cacheService.getOrSetWithStampedeProtection(
      cacheKey,
      async () => {
        const result = await queryWithTimeout(TRENDING_POSTS_QUERY, []);
        return result.rows;
      },
      TRENDING_CACHE_TTL_SECONDS
    );

    const enrichedPosts = await attachTrustToPosts(posts || []);
    res.json({ posts: enrichedPosts, cached: false });
  } catch (err) {
    logger.error("[Feed] Trending error:", err);
    res.status(500).json({ error: "Failed to load trending" });
  }
};

/**
 * POST /feed/impressions - Fire-and-forget impression counter for post metrics.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.trackImpression = async (req, res) => {
  try {
    const { postIds } = req.body;
    const normalizedPostIds = sanitizeImpressionPostIds(postIds);

    if (normalizedPostIds.length === 0) {
      return res.status(400).json({ error: "postIds array required" });
    }

    // Fire-and-forget: intentionally not awaited
    queryWithTimeout(
      `
      UPDATE post_metrics
      SET impression_count = impression_count + 1, last_updated = NOW()
      WHERE post_id::text = ANY($1::text[])
      `,
      [normalizedPostIds]
    ).catch((err) => logger.error("Impression tracking failed:", err));

    res.json({
      success: true,
      tracked: normalizedPostIds.length,
      dropped: Math.max(
        0,
        (Array.isArray(postIds) ? postIds.length : 0) - normalizedPostIds.length
      ),
    });
  } catch (err) {
    logger.error("[Feed] Impression tracking error:", err);
    res.status(500).json({ error: "Tracking failed" });
  }
};

/**
 * GET /feed/random - Random post selection using TABLESAMPLE with optional viral bias.
 * Falls back to ORDER BY random() for small tables.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.getRandomFeed = async (req, res) => {
  try {
    const limit = parsePositiveInt(req.query.limit, 20, 50);
    const viralBias = req.query.bias === "viral";

    if (feedDebugEnabled) {
      logger.info("[Chaos Engine] Random feed requested, limit:", limit);
    }

    const startTime = Date.now();

    // Both branches are hardcoded literals -- no injection risk
    const orderClause = viralBias
      ? "ORDER BY (log(COALESCE(p.likes, 0) + 1) * random()) DESC"
      : "ORDER BY random()";

    const query = `
      SELECT
        p.post_id,
        p.user_id AS author_id,
        p.category_id,
        p.title,
        p.description,
        p.price,
        p.images,
        p.location,
        p.created_at,
        COALESCE(to_jsonb(p)->>'audio_url', NULL) AS audio_url,
        p.is_flash_sale,
        p.expires_at,
        COALESCE(p.views_count, 0) AS views_count,
        COALESCE(p.likes, 0) AS likes_count,
        c.name AS category_name,
        COALESCE(pr.full_name, u.username, 'Seller') AS author_name,
        u.username
      FROM posts p TABLESAMPLE BERNOULLI(5)
      LEFT JOIN users u ON p.user_id::text = u.user_id::text
      LEFT JOIN profiles pr ON p.user_id::text = pr.user_id::text
      LEFT JOIN categories c ON p.category_id = c.category_id
      WHERE p.status = 'active'
        AND (p.expires_at IS NULL OR p.expires_at > NOW())
      ${orderClause}
      LIMIT $1;
    `;

    const result = await queryWithTimeout(query, [limit]);
    const enrichedPosts = await attachTrustToPosts(result.rows || []);
    const queryTime = Date.now() - startTime;

    if (feedDebugEnabled) {
      logger.info(
        `[Chaos Engine] TABLESAMPLE returned ${result.rows.length} posts in ${queryTime}ms`
      );
    }

    if (result.rows.length < 5) {
      if (feedDebugEnabled) {
        logger.info("[Chaos Engine] Small table detected, using fallback query");
      }

      const fallbackQuery = `
        SELECT
          p.post_id,
          p.user_id AS author_id,
          p.category_id,
          p.title,
          p.description,
          p.price,
          p.images,
          p.location,
          p.created_at,
          COALESCE(to_jsonb(p)->>'audio_url', NULL) AS audio_url,
          p.is_flash_sale,
          p.expires_at,
          COALESCE(p.views_count, 0) AS views_count,
          COALESCE(p.likes, 0) AS likes_count,
          c.name AS category_name,
          COALESCE(pr.full_name, u.username, 'Seller') AS author_name,
          u.username
        FROM posts p
        LEFT JOIN users u ON p.user_id::text = u.user_id::text
        LEFT JOIN profiles pr ON p.user_id::text = pr.user_id::text
        LEFT JOIN categories c ON p.category_id = c.category_id
        WHERE p.status = 'active'
          AND (p.expires_at IS NULL OR p.expires_at > NOW())
        ${orderClause}
        LIMIT $1;
      `;

      const fallbackResult = await queryWithTimeout(fallbackQuery, [limit]);
      const enrichedFallback = await attachTrustToPosts(fallbackResult.rows || []);
      return res.json({
        posts: enrichedFallback,
        queryTimeMs: Date.now() - startTime,
        engine: "fallback",
        count: fallbackResult.rows.length,
      });
    }

    res.json({
      posts: enrichedPosts,
      queryTimeMs: queryTime,
      engine: "tablesample",
      count: result.rows.length,
    });
  } catch (err) {
    logger.error("[Chaos Engine] Error:", err);
    res.status(500).json({ error: "Failed to load random feed" });
  }
};

/**
 * GET /feed/nearby - Location-based feed using PostGIS get_posts_near_me().
 * Falls back to latest active posts when no nearby results are found.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.getNearbyFeed = async (req, res) => {
  let radiusKm = 10;
  let postLimit = 20;
  try {
    const { lat, lng, radius = 10, limit = 20 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        error: "Location required",
        message: "Please provide lat and lng query parameters",
      });
    }

    const latitude = Number.parseFloat(lat);
    const longitude = Number.parseFloat(lng);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return res.status(400).json({
        error: "Invalid location",
        message: "lat and lng must be valid numeric coordinates",
      });
    }

    radiusKm = parsePositiveNumber(radius, 10, 100);
    postLimit = parsePositiveInt(limit, 20, 50);

    const result = await queryWithTimeout(
      `SELECT * FROM get_posts_near_me($1, $2, $3, $4)`,
      [latitude, longitude, radiusKm, postLimit]
    );

    if (result.rows.length === 0) {
      if (feedDebugEnabled) {
        logger.info("[GeoFeed] No nearby posts found, using fallback");
      }

      const fallback = await queryWithTimeout(
        `
        SELECT p.*, c.name as category_name,
               COALESCE(pr.full_name, 'Seller') as seller_name
        FROM posts p
        LEFT JOIN categories c ON p.category_id = c.category_id
        LEFT JOIN profiles pr ON p.user_id::text = pr.user_id::text
        WHERE p.status = 'active'
          AND (p.expires_at IS NULL OR p.expires_at > NOW())
          AND p.sold_at IS NULL
        ORDER BY p.tier_priority DESC, p.created_at DESC
        LIMIT $1
        `,
        [postLimit]
      );

      const enrichedFallback = await attachTrustToPosts(fallback.rows || []);
      return res.json({
        posts: enrichedFallback,
        nearby: false,
        fallback: true,
        message: "No posts found nearby. Showing latest posts.",
      });
    }

    if (feedDebugEnabled) {
      logger.info(
        `[GeoFeed] Found ${result.rows.length} posts within ${radiusKm}km of (${latitude}, ${longitude})`
      );
    }

    const enrichedPosts = await attachTrustToPosts(result.rows || []);
    res.json({
      posts: enrichedPosts,
      nearby: true,
      location: { lat: latitude, lng: longitude },
      radius_km: radiusKm,
      count: result.rows.length,
    });
  } catch (err) {
    logger.error("[GeoFeed] Error:", err);

    if (
      err.message?.includes("function get_posts_near_me") ||
      err.message?.includes("does not exist")
    ) {
      try {
        const fallback = await queryWithTimeout(
          `
          SELECT p.*, c.name as category_name,
                 COALESCE(pr.full_name, 'Seller') as seller_name
          FROM posts p
          LEFT JOIN categories c ON p.category_id = c.category_id
          LEFT JOIN profiles pr ON p.user_id::text = pr.user_id::text
          WHERE p.status = 'active'
            AND (p.expires_at IS NULL OR p.expires_at > NOW())
            AND p.sold_at IS NULL
          ORDER BY p.tier_priority DESC, p.created_at DESC
          LIMIT $1
          `,
          [postLimit]
        );

        const enrichedFallback = await attachTrustToPosts(fallback.rows || []);
        return res.json({
          posts: enrichedFallback,
          nearby: false,
          fallback: true,
          message:
            "Geo search not configured. Showing latest posts instead.",
          reason: "geo_unavailable",
        });
      } catch (fallbackError) {
        logger.error("[GeoFeed] Fallback error:", fallbackError);
        return res.status(500).json({ error: "Failed to load nearby posts" });
      }
    }

    res.status(500).json({ error: "Failed to load nearby posts" });
  }
};

/**
 * GET /feed/search - Full-text (ts_vector) search with ILIKE fallback.
 * Results are ranked by tier-based ordering (premium > silver > bronze > basic)
 * combined with text-relevance scoring.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.searchPosts = async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;
    const searchQuery = parseOptionalString(q);
    const category = parseOptionalString(req.query.category_id || req.query.category);
    const subcategory = parseOptionalString(
      req.query.subcategory_id || req.query.subcategory
    );
    const postLimit = parsePositiveInt(limit, 20, 50);
    let usedFullText = true;

    if (!searchQuery || searchQuery.length < 2) {
      return res.status(400).json({
        error: "Search query required",
        message: "Please provide at least 2 characters to search",
      });
    }

    let result;

    try {
      result = await queryWithTimeout(
        `
        SELECT
          p.*,
          c.name as category_name,
          sc.name as subcategory_name,
          COALESCE(pr.full_name, 'Seller') as seller_name,
          u.current_plan,
          ts_rank(p.search_vector, plainto_tsquery('english', $1)) as rank
        FROM posts p
        LEFT JOIN categories c ON p.category_id = c.category_id
        LEFT JOIN subcategories sc ON p.subcategory_id = sc.subcategory_id
        LEFT JOIN profiles pr ON p.user_id::text = pr.user_id::text
        LEFT JOIN users u ON p.user_id::text = u.user_id::text
        WHERE p.status = 'active'
          AND (p.expires_at IS NULL OR p.expires_at > NOW())
          AND p.sold_at IS NULL
          AND p.search_vector @@ plainto_tsquery('english', $1)
          AND ($3::text IS NULL OR p.category_id::text = $3::text)
          AND ($4::text IS NULL OR p.subcategory_id::text = $4::text)
        ORDER BY
          COALESCE(p.boost_level,0) DESC,
          CASE
               WHEN COALESCE(u.current_plan,'basic') = 'premium' THEN 1
               WHEN COALESCE(u.current_plan,'basic') = 'silver' THEN 2
               WHEN COALESCE(u.current_plan,'basic') = 'bronze' THEN 3
               ELSE 4
          END ASC,
          rank DESC, p.created_at DESC
        LIMIT $2
        `,
        [searchQuery, postLimit, category, subcategory]
      );
    } catch (tsErr) {
      if (feedDebugEnabled) {
        logger.info("[Search] Falling back to ILIKE search");
      }

      usedFullText = false;

      result = await queryWithTimeout(
        `
        SELECT
          p.*,
          c.name as category_name,
          sc.name as subcategory_name,
          COALESCE(pr.full_name, 'Seller') as seller_name,
          u.current_plan
        FROM posts p
        LEFT JOIN categories c ON p.category_id = c.category_id
        LEFT JOIN subcategories sc ON p.subcategory_id = sc.subcategory_id
        LEFT JOIN profiles pr ON p.user_id::text = pr.user_id::text
        LEFT JOIN users u ON p.user_id::text = u.user_id::text
        WHERE p.status = 'active'
          AND (p.expires_at IS NULL OR p.expires_at > NOW())
          AND (p.title ILIKE $1 OR p.description ILIKE $1 OR p.location ILIKE $1)
          AND ($3::text IS NULL OR p.category_id::text = $3::text)
          AND ($4::text IS NULL OR p.subcategory_id::text = $4::text)
        ORDER BY
          COALESCE(p.boost_level,0) DESC,
          CASE
               WHEN COALESCE(u.current_plan,'basic') = 'premium' THEN 1
               WHEN COALESCE(u.current_plan,'basic') = 'silver' THEN 2
               WHEN COALESCE(u.current_plan,'basic') = 'bronze' THEN 3
               ELSE 4
          END ASC,
          p.created_at DESC
        LIMIT $2
        `,
        [`%${searchQuery}%`, postLimit, category, subcategory]
      );
    }

    const enrichedPosts = await attachTrustToPosts(result.rows || []);
    res.json({
      posts: enrichedPosts,
      query: searchQuery,
      count: result.rows.length,
      fulltext: usedFullText,
    });
  } catch (err) {
    logger.error("[Search] Error:", err);
    res.status(500).json({ error: "Search failed" });
  }
};

module.exports = exports;

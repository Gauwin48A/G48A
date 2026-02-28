const pool = require('../config/db');
const { STRATIFIED_FEED_QUERY, FALLBACK_FEED_QUERY, TRENDING_POSTS_QUERY } = require('../queries/feedQuery');
const cacheService = require('../services/cacheService');
const logger = require('../utils/logger');

// ============================================
// In-Memory Cache for High-Performance Feed
// Designed for 100k+ concurrent users
// Cache changes every 30 seconds for fresh content
// ============================================
const QUERY_TIMEOUT = 3000;
const MAX_FEED_LIMIT = 50;
const DEFAULT_FEED_LIMIT = 10;
const TRENDING_CACHE_TTL_SECONDS = 5 * 60;
const DEFAULT_MAX_IMPRESSION_POST_IDS = Number.parseInt(process.env.MAX_IMPRESSION_POST_IDS || '200', 10);
const feedDebugEnabled = process.env.FEED_DEBUG === 'true';
const FEED_SORT_FIELDS = new Set(['created_at', 'updated_at', 'price', 'views_count', 'likes', 'title']);
const MAX_FEED_REFRESH_SEED = 2147483646;
const MAX_FEED_REFRESH_SEED_BIGINT = BigInt(MAX_FEED_REFRESH_SEED);

function getScalarQueryValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

function parseOptionalString(value) {
  const scalar = getScalarQueryValue(value);
  if (scalar === undefined || scalar === null) return null;
  const normalized = (typeof scalar === 'string' ? scalar : String(scalar)).trim();
  return normalized.length ? normalized : null;
}

function getAuthenticatedUserId(req) {
  return parseOptionalString(req.user?.userId || req.user?.id || req.user?.user_id);
}

function parsePositiveInt(value, fallback, max = Number.MAX_SAFE_INTEGER) {
  const normalized = parseOptionalString(value);
  if (!normalized || !/^\d+$/.test(normalized)) return fallback;
  const parsed = Number(normalized);
  if (!Number.isSafeInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

function parsePositiveNumber(value, fallback, max = Number.MAX_SAFE_INTEGER) {
  const normalized = parseOptionalString(value);
  if (!normalized) return fallback;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

function parseFeedSortBy(value) {
  const normalized = parseOptionalString(value)?.toLowerCase();
  return FEED_SORT_FIELDS.has(normalized) ? normalized : 'created_at';
}

function parseFeedSortOrder(value) {
  return parseOptionalString(value)?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
}

function sanitizeImpressionPostIds(postIds, maxIds = DEFAULT_MAX_IMPRESSION_POST_IDS) {
  if (!Array.isArray(postIds) || postIds.length === 0) return [];
  const normalizedIds = [];
  const seen = new Set();
  const boundedMax = Number.isSafeInteger(maxIds) && maxIds > 0 ? maxIds : DEFAULT_MAX_IMPRESSION_POST_IDS;

  for (const rawId of postIds) {
    if (normalizedIds.length >= boundedMax) break;
    const id = parseOptionalString(rawId);
    if (!id || id.length > 128 || seen.has(id)) continue;
    seen.add(id);
    normalizedIds.push(id);
  }

  return normalizedIds;
}

function hashSeedString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) % MAX_FEED_REFRESH_SEED;
  }
  return hash || 1;
}

function parseFeedRefreshSeed(value) {
  const normalized = parseOptionalString(value);
  if (!normalized) {
    return 0;
  }

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

function normalizeFeedQueryParams(query) {
  const page = parsePositiveInt(query.page, 1);
  const limit = parsePositiveInt(query.limit, DEFAULT_FEED_LIMIT, MAX_FEED_LIMIT);
  const sortBy = parseFeedSortBy(query.sortBy);
  const sortOrder = parseFeedSortOrder(query.sortOrder);

  return {
    page,
    limit,
    offset: (page - 1) * limit,
    sortBy,
    sortOrder,
    search: parseOptionalString(query.search),
    category: parseOptionalString(query.category)
  };
}

function buildTextFeedQuery({ userId = null, category = null, search = null, sortBy, sortOrder, offset, limit }) {
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
  if (search) {
    const placeholder = addParam(`%${search}%`);
    conditions.push(`(p.title ILIKE ${placeholder} OR p.description ILIKE ${placeholder} OR p.location ILIKE ${placeholder} OR c.name ILIKE ${placeholder})`);
  }

  const query = `
    SELECT p.*, c.name as category_name 
    FROM posts p 
    LEFT JOIN categories c ON p.category_id = c.category_id 
    WHERE ${conditions.join(' AND ')}
    ORDER BY p.${sortBy} ${sortOrder}
    OFFSET ${addParam(offset)} LIMIT ${addParam(limit)}
  `;

  return { query, params };
}

function countFeedPhases(rows) {
  return rows.reduce(
    (acc, row) => {
      if (row.feed_phase === 'fresh') acc.freshCount += 1;
      else if (row.feed_phase === 'exploration') acc.explorationCount += 1;
      else if (row.feed_phase === 'exploitation') acc.exploitationCount += 1;
      return acc;
    },
    { freshCount: 0, explorationCount: 0, exploitationCount: 0 }
  );
}

// Query with timeout wrapper for high availability
async function queryWithTimeout(query, params, timeoutMs = QUERY_TIMEOUT) {
  return pool.query({
    text: query,
    values: params,
    query_timeout: timeoutMs
  });
}

// GET /api/feed - all users' text posts
exports.getFeed = async (req, res) => {
  try {
    const feedQuery = normalizeFeedQueryParams(req.query);
    const { query, params } = buildTextFeedQuery(feedQuery);
    const result = await queryWithTimeout(query, params);
    if (!result.rows.length) {
      logger.error('No text posts found for feed');
      return res.status(404).json({ error: 'No text posts found', fallback: [] });
    }
    res.json(result.rows);
  } catch (err) {
    logger.error('Feed API error:', err);
    res.status(500).json({ error: err.message, fallback: [] });
  }
};

// GET /api/feed/mine - logged-in user's text posts
exports.getMyFeed = async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      logger.error('Unauthorized access to MyFeed');
      return res.status(401).json({ error: 'Unauthorized', fallback: [] });
    }
    const feedQuery = normalizeFeedQueryParams(req.query);
    const { query, params } = buildTextFeedQuery({ ...feedQuery, userId });
    const result = await queryWithTimeout(query, params);
    if (!result.rows.length) {
      logger.error('No text posts found for user feed');
      return res.status(404).json({ error: 'No text posts found', fallback: [] });
    }
    res.json(result.rows);
  } catch (err) {
    logger.error('MyFeed API error:', err);
    res.status(500).json({ error: err.message, fallback: [] });
  }
};

// ============================================
// NEW: Stratified Dynamic Feed (Optimized)
// ============================================
exports.getDynamicFeed = async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const limit = parsePositiveInt(req.query.limit, 20, 50);
  const forceRefresh = req.query.refresh === 'true';
  const refreshSeed = parseFeedRefreshSeed(
    req.query.seed || req.query._t || req.query.refreshSeed
  );
  const forceRefreshSeed = refreshSeed || Math.floor(Date.now() / 1000);

  try {
    // Prevent browser/proxy caching for dynamic feed snapshots.
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    const startTime = Date.now();
    const fetchFeed = async (seed = 0) => {
      if (feedDebugEnabled) {
        logger.info(`[Feed] DB Fetch for user ${userId}`);
      }
      const result = await queryWithTimeout(STRATIFIED_FEED_QUERY, [userId, limit, seed]);
      return {
        posts: result.rows,
        meta: countFeedPhases(result.rows)
      };
    };

    // Explicit refresh requests bypass cache and can pass a one-shot seed.
    if (forceRefresh) {
      const freshFeed = await fetchFeed(forceRefreshSeed);
      return res.json({
        posts: freshFeed.posts,
        cached: false,
        queryTimeMs: Date.now() - startTime,
        feedMeta: freshFeed.meta
      });
    }

    // Cache key uses 30-second intervals to match SQL time_seed.
    const intervalStamp = Math.floor(Date.now() / 30000);
    const cacheKey = `feed:dynamic:${userId || 'anon'}:${limit}:${intervalStamp}`;

    const cachedFeed = cacheService.get(cacheKey);
    if (cachedFeed !== undefined) {
      return res.json({
        posts: cachedFeed.posts,
        cached: true,
        queryTimeMs: Date.now() - startTime,
        feedMeta: cachedFeed.meta
      });
    }

    // Use stampede-protected cache accessor.
    const feedData = await cacheService.getOrSetWithStampedeProtection(
      cacheKey,
      () => fetchFeed(0),
      30
    );

    res.json({
      posts: feedData.posts,
      cached: false,
      queryTimeMs: Date.now() - startTime,
      feedMeta: feedData.meta
    });

  } catch (err) {
    logger.error('[Feed] Dynamic feed error:', err.message);
    // ... Fallback logic continues below
    try {
      if (feedDebugEnabled) {
        logger.info('[Feed] Using fallback query');
      }
      const fallbackResult = await queryWithTimeout(FALLBACK_FEED_QUERY, [limit]);

      return res.json({
        posts: fallbackResult.rows,
        cached: false,
        fallback: true,
        feedMeta: { freshCount: 0, explorationCount: 0, exploitationCount: fallbackResult.rows.length }
      });
    } catch (fallbackErr) {
      logger.error('[Feed] Fallback also failed:', fallbackErr.message);
      return res.status(500).json({ error: 'Failed to load feed', posts: [] });
    }
  }
};

/**
 * GET /api/feed/trending
 * Returns top trending posts based on engagement
 */
exports.getTrendingPosts = async (req, res) => {
  try {
    const cacheKey = 'feed:trending:global';
    const cachedPosts = cacheService.get(cacheKey);

    if (cachedPosts !== undefined) {
      return res.json({ posts: cachedPosts, cached: true });
    }

    const posts = await cacheService.getOrSetWithStampedeProtection(
      cacheKey,
      async () => {
        const result = await queryWithTimeout(TRENDING_POSTS_QUERY, []);
        return result.rows;
      },
      TRENDING_CACHE_TTL_SECONDS
    );

    res.json({ posts, cached: false });

  } catch (err) {
    logger.error('[Feed] Trending error:', err);
    res.status(500).json({ error: 'Failed to load trending' });
  }
};

/**
 * POST /api/feed/impression
 * Track when a post is shown in feed (for exploration analytics)
 */
exports.trackImpression = async (req, res) => {
  try {
    const { postIds } = req.body;
    const normalizedPostIds = sanitizeImpressionPostIds(postIds);
    if (normalizedPostIds.length === 0) {
      return res.status(400).json({ error: 'postIds array required' });
    }

    // Batch update impressions (fire and forget)
    queryWithTimeout(`
            UPDATE post_metrics 
            SET impression_count = impression_count + 1, last_updated = NOW()
            WHERE post_id::text = ANY($1::text[])
        `, [normalizedPostIds]).catch((err) => logger.error('Impression tracking failed:', err));

    res.json({
      success: true,
      tracked: normalizedPostIds.length,
      dropped: Math.max(0, (Array.isArray(postIds) ? postIds.length : 0) - normalizedPostIds.length)
    });

  } catch (err) {
    logger.error('[Feed] Impression tracking error:', err);
    res.status(500).json({ error: 'Tracking failed' });
  }
};

// ============================================
// PROTOCOL: CHAOS ENGINE
// High-Performance Random Feed (The Architect)
// Uses TABLESAMPLE for O(1) random access - 1000x faster than ORDER BY RANDOM()
// ============================================

/**
 * GET /api/feed/random
 * Returns a shuffled feed using TABLESAMPLE BERNOULLI
 * Perfect for "Pull to Refresh" infinite discovery
 */
exports.getRandomFeed = async (req, res) => {
  try {
    const limit = parsePositiveInt(req.query.limit, 20, 50);
    const viralBias = req.query.bias === 'viral'; // Optional: boost viral posts

    if (feedDebugEnabled) {
      logger.info('[Chaos Engine] Random feed requested, limit:', limit);
    }
    const startTime = Date.now();

    // PERFORMANCE: TABLESAMPLE scans only ~5% of data blocks
    // This is O(1) vs O(n) for ORDER BY RANDOM()
    const orderClause = viralBias
      ? 'ORDER BY (log(COALESCE(p.likes, 0) + 1) * random()) DESC' // Viral bias
      : 'ORDER BY random()'; // Pure random

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
        p.audio_url,
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
    const queryTime = Date.now() - startTime;

    if (feedDebugEnabled) {
      logger.info(`[Chaos Engine] TABLESAMPLE returned ${result.rows.length} posts in ${queryTime}ms`);
    }

    // FALLBACK: If TABLESAMPLE returns too few (small tables), use regular random
    if (result.rows.length < 5) {
      if (feedDebugEnabled) {
        logger.info('[Chaos Engine] Small table detected, using fallback query');
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
          p.audio_url,
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
      return res.json({
        posts: fallbackResult.rows,
        queryTimeMs: Date.now() - startTime,
        engine: 'fallback',
        count: fallbackResult.rows.length
      });
    }

    res.json({
      posts: result.rows,
      queryTimeMs: queryTime,
      engine: 'tablesample',
      count: result.rows.length
    });

  } catch (err) {
    logger.error('[Chaos Engine] Error:', err);
    res.status(500).json({ error: 'Failed to load random feed' });
  }
};

// ============================================
// GEO-FENCED FEED (Near Me)
// Uses PostGIS for efficient spatial queries
// ============================================

/**
 * GET /api/feed/nearby
 * Returns posts within specified radius of user's location
 * Requires: lat, lng query params
 * Optional: radius (km, default 10), limit (default 20)
 */
exports.getNearbyFeed = async (req, res) => {
  try {
    const { lat, lng, radius = 10, limit = 20 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        error: 'Location required',
        message: 'Please provide lat and lng query parameters'
      });
    }

    const latitude = Number.parseFloat(lat);
    const longitude = Number.parseFloat(lng);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return res.status(400).json({
        error: 'Invalid location',
        message: 'lat and lng must be valid numeric coordinates'
      });
    }
    const radiusKm = parsePositiveNumber(radius, 10, 100); // Max 100km
    const postLimit = parsePositiveInt(limit, 20, 50); // Max 50 posts

    // Use the optimized SQL function (works with Haversine or PostGIS)
    const result = await queryWithTimeout(
      `SELECT * FROM get_posts_near_me($1, $2, $3, $4)`,
      [latitude, longitude, radiusKm, postLimit]
    );

    // If no results, try fallback
    if (result.rows.length === 0) {
      if (feedDebugEnabled) {
        logger.info('[GeoFeed] No nearby posts found, using fallback');
      }

      // Fallback: Simple location text search (less accurate but works without PostGIS)
      const fallback = await queryWithTimeout(`
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
      `, [postLimit]);

      return res.json({
        posts: fallback.rows,
        nearby: false,
        fallback: true,
        message: 'No posts found nearby. Showing latest posts.'
      });
    }

    if (feedDebugEnabled) {
      logger.info(`[GeoFeed] Found ${result.rows.length} posts within ${radiusKm}km of (${latitude}, ${longitude})`);
    }

    res.json({
      posts: result.rows,
      nearby: true,
      location: { lat: latitude, lng: longitude },
      radius_km: radiusKm,
      count: result.rows.length
    });

  } catch (err) {
    logger.error('[GeoFeed] Error:', err);

    // If function is missing, return a helpful error
    if (err.message?.includes('function get_posts_near_me') || err.message?.includes('does not exist')) {
      return res.status(501).json({
        error: 'Geo search not configured',
        message: 'Please run the production hardening migration to enable location-based search.',
        migration: 'server/database/migrations/production_hardening.sql'
      });
    }

    res.status(500).json({ error: 'Failed to load nearby posts' });
  }
};

// ============================================
// FULL-TEXT SEARCH
// Uses PostgreSQL tsvector for fuzzy matching
// ============================================

/**
 * GET /api/feed/search
 * Full-text search with ranking
 * Uses PostgreSQL tsvector for fuzzy matching
 */
exports.searchPosts = async (req, res) => {
  try {
    const { q, category, limit = 20 } = req.query;
    const searchQuery = parseOptionalString(q);
    const postLimit = parsePositiveInt(limit, 20, 50);
    let usedFullText = true;

    if (!searchQuery || searchQuery.length < 2) {
      return res.status(400).json({
        error: 'Search query required',
        message: 'Please provide at least 2 characters to search'
      });
    }

    // Try full-text search first
    let result;
    try {
      result = await queryWithTimeout(`
        SELECT 
          p.*,
          c.name as category_name,
          COALESCE(pr.full_name, 'Seller') as seller_name,
          ts_rank(p.search_vector, plainto_tsquery('english', $1)) as rank
        FROM posts p
        LEFT JOIN categories c ON p.category_id = c.category_id
        LEFT JOIN profiles pr ON p.user_id::text = pr.user_id::text
        WHERE p.status = 'active'
          AND (p.expires_at IS NULL OR p.expires_at > NOW())
          AND p.sold_at IS NULL
          AND p.search_vector @@ plainto_tsquery('english', $1)
          ${category ? 'AND p.category_id = $3' : ''}
        ORDER BY p.tier_priority DESC, rank DESC, p.created_at DESC
        LIMIT $2
      `, category ? [searchQuery, postLimit, category] : [searchQuery, postLimit]);
    } catch (tsErr) {
      // If tsvector search fails, fall back to ILIKE
      if (feedDebugEnabled) {
        logger.info('[Search] Falling back to ILIKE search');
      }
      usedFullText = false;
      result = await queryWithTimeout(`
        SELECT 
          p.*,
          c.name as category_name,
          COALESCE(pr.full_name, 'Seller') as seller_name
        FROM posts p
        LEFT JOIN categories c ON p.category_id = c.category_id
        LEFT JOIN profiles pr ON p.user_id::text = pr.user_id::text
        WHERE p.status = 'active'
          AND (p.expires_at IS NULL OR p.expires_at > NOW())
          AND (p.title ILIKE $1 OR p.description ILIKE $1 OR p.location ILIKE $1)
          ${category ? 'AND p.category_id = $3' : ''}
        ORDER BY p.tier_priority DESC, p.created_at DESC
        LIMIT $2
      `, category ? [`%${searchQuery}%`, postLimit, category] : [`%${searchQuery}%`, postLimit]);
    }

    res.json({
      posts: result.rows,
      query: searchQuery,
      count: result.rows.length,
      fulltext: usedFullText
    });

  } catch (err) {
    logger.error('[Search] Error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
};

module.exports = exports;


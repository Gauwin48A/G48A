const pool = require('../config/db');
const { STRATIFIED_FEED_QUERY, FALLBACK_FEED_QUERY, TRENDING_POSTS_QUERY } = require('../queries/feedQuery');

// ============================================
// In-Memory Cache for High-Performance Feed
// Designed for 100k+ concurrent users
// Cache changes every 30 seconds for fresh content
// ============================================
const feedCache = new Map();
const CACHE_TTL = 10000; // 10 seconds - allows fast refresh
const MAX_CACHE_ENTRIES = 10000; // Handle 10k unique user caches
const CACHE_INTERVAL = 30000; // 30 seconds - matches SQL time_seed
const QUERY_TIMEOUT = 3000; // 3 second query timeout

// Query with timeout wrapper for high availability
async function queryWithTimeout(query, params, timeoutMs = QUERY_TIMEOUT) {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Query timeout')), timeoutMs)
  );
  const queryPromise = pool.query(query, params);
  return Promise.race([queryPromise, timeoutPromise]);
}

// Cache cleanup (LRU-style)
function cleanCache() {
  if (feedCache.size > MAX_CACHE_ENTRIES) {
    const entries = Array.from(feedCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toDelete = entries.slice(0, Math.floor(MAX_CACHE_ENTRIES / 2));
    toDelete.forEach(([key]) => feedCache.delete(key));
  }
}

// GET /api/feed - all users' text posts
exports.getFeed = async (req, res) => {
  try {
    const { category, sortBy = 'created_at', sortOrder = 'desc', page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;

    // Join with categories to enable category name search
    let query = `
      SELECT p.*, c.name as category_name 
      FROM posts p 
      LEFT JOIN categories c ON p.category_id = c.category_id 
      WHERE p.post_type = 'text'
    `;
    let params = [];

    if (category) {
      query += ` AND p.category_id = $${params.length + 1}`;
      params.push(category);
    }

    // Search across title, description, location, and category name
    if (search) {
      query += ` AND (p.title ILIKE $${params.length + 1} OR p.description ILIKE $${params.length + 1} OR p.location ILIKE $${params.length + 1} OR c.name ILIKE $${params.length + 1})`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY p.${sortBy} ${sortOrder} OFFSET $${params.length + 1} LIMIT $${params.length + 2}`;
    params.push(offset, limit);

    const result = await pool.query(query, params);
    if (!result.rows.length) {
      console.error('No text posts found for feed');
      return res.status(404).json({ error: 'No text posts found', fallback: [] });
    }
    res.json(result.rows);
  } catch (err) {
    console.error('Feed API error:', err);
    res.status(500).json({ error: err.message, fallback: [] });
  }
};

// GET /api/feed/mine - logged-in user's text posts
exports.getMyFeed = async (req, res) => {
  try {
    const userId = req.user?.id || req.query.userId;
    if (!userId) {
      console.error('Unauthorized access to MyFeed');
      return res.status(401).json({ error: 'Unauthorized', fallback: [] });
    }
    const { category, sortBy = 'created_at', sortOrder = 'desc', page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;

    // Join with categories to enable category name search
    let query = `
      SELECT p.*, c.name as category_name 
      FROM posts p 
      LEFT JOIN categories c ON p.category_id = c.category_id 
      WHERE p.post_type = 'text' AND p.user_id = $1
    `;
    let params = [userId];

    if (category) {
      query += ` AND p.category_id = $${params.length + 1}`;
      params.push(category);
    }

    // Search across title, description, location, and category name
    if (search) {
      query += ` AND (p.title ILIKE $${params.length + 1} OR p.description ILIKE $${params.length + 1} OR p.location ILIKE $${params.length + 1} OR c.name ILIKE $${params.length + 1})`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY p.${sortBy} ${sortOrder} OFFSET $${params.length + 1} LIMIT $${params.length + 2}`;
    params.push(offset, limit);

    const result = await pool.query(query, params);
    if (!result.rows.length) {
      console.error('No text posts found for user feed');
      return res.status(404).json({ error: 'No text posts found', fallback: [] });
    }
    res.json(result.rows);
  } catch (err) {
    console.error('MyFeed API error:', err);
    res.status(500).json({ error: err.message, fallback: [] });
  }
};

// ============================================
// NEW: Stratified Dynamic Feed
// High-performance with exploration/exploitation
// ============================================

/**
 * GET /api/feed/dynamic
 * Returns a stratified feed with:
 * - Fresh posts (< 6 hours) - highest priority
 * - Exploration posts (new, testing viability)
 * - Exploitation posts (proven high-engagement)
 * 
 * Features:
 * - Time-seeded randomization for fresh content on every refresh
 * - Author diversity (1 post per author)
 * - Category diversity (max 4 per category)
 * - 15-second cache to handle refresh spam
 */
exports.getDynamicFeed = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id || req.query.userId || 0;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const forceRefresh = req.query.refresh === 'true';

    // Cache key uses 30-second intervals to match SQL time_seed
    const intervalStamp = Math.floor(Date.now() / CACHE_INTERVAL);
    const cacheKey = `feed:${userId}:${intervalStamp}`;

    // Check cache (skip if force refresh)
    if (!forceRefresh) {
      const cached = feedCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        console.log(`[Feed] Cache HIT for user ${userId}`);
        return res.json({
          posts: cached.data,
          cached: true,
          expiresIn: Math.max(0, CACHE_TTL - (Date.now() - cached.timestamp))
        });
      }
    }

    console.log(`[Feed] Cache MISS - fetching for user ${userId}`);
    const startTime = Date.now();

    // Execute stratified query with timeout (prevents DB blocking under high load)
    const result = await queryWithTimeout(STRATIFIED_FEED_QUERY, [userId, limit]);

    const queryTime = Date.now() - startTime;
    console.log(`[Feed] Query executed in ${queryTime}ms, returned ${result.rows.length} posts`);

    // Cache the result
    feedCache.set(cacheKey, {
      data: result.rows,
      timestamp: Date.now()
    });

    // Periodic cache cleanup
    if (feedCache.size > MAX_CACHE_ENTRIES * 0.9) {
      cleanCache();
    }

    res.json({
      posts: result.rows,
      cached: false,
      queryTimeMs: queryTime,
      feedMeta: {
        freshCount: result.rows.filter(p => p.feed_phase === 'fresh').length,
        explorationCount: result.rows.filter(p => p.feed_phase === 'exploration').length,
        exploitationCount: result.rows.filter(p => p.feed_phase === 'exploitation').length
      }
    });

  } catch (err) {
    console.error('[Feed] Dynamic feed error:', err.message);
    console.error('[Feed] Full error:', err);

    // Fallback to simple query
    try {
      console.log('[Feed] Using fallback query');
      const fallbackResult = await pool.query(`
        SELECT 
          p.post_id, p.user_id AS author_id, p.category_id, p.title, p.description,
          p.price, p.images, p.location, p.created_at,
          COALESCE(p.views_count, 0) AS views_count,
          COALESCE(p.likes, 0) AS likes_count,
          'exploitation' AS feed_phase,
          c.name AS category_name,
          COALESCE(pr.full_name, 'Seller') AS author_name
        FROM posts p
        LEFT JOIN profiles pr ON p.user_id = pr.user_id
        LEFT JOIN categories c ON p.category_id = c.category_id
        WHERE p.status = 'active'
        ORDER BY p.created_at DESC
        LIMIT $1
      `, [20]);

      return res.json({
        posts: fallbackResult.rows,
        cached: false,
        fallback: true,
        feedMeta: { freshCount: 0, explorationCount: 0, exploitationCount: fallbackResult.rows.length }
      });
    } catch (fallbackErr) {
      console.error('[Feed] Fallback also failed:', fallbackErr.message);
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
    const cacheKey = 'trending:global';
    const cached = feedCache.get(cacheKey);

    // Trending cache for 5 minutes (doesn't need to be as fresh)
    if (cached && (Date.now() - cached.timestamp) < 300000) {
      return res.json({ posts: cached.data, cached: true });
    }

    const result = await pool.query(TRENDING_POSTS_QUERY);

    feedCache.set(cacheKey, {
      data: result.rows,
      timestamp: Date.now()
    });

    res.json({ posts: result.rows, cached: false });

  } catch (err) {
    console.error('[Feed] Trending error:', err);
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

    if (!Array.isArray(postIds) || postIds.length === 0) {
      return res.status(400).json({ error: 'postIds array required' });
    }

    // Batch update impressions (fire and forget)
    pool.query(`
            UPDATE post_metrics 
            SET impression_count = impression_count + 1, last_updated = NOW()
            WHERE post_id = ANY($1)
        `, [postIds]).catch(err => console.error('Impression tracking failed:', err));

    res.json({ success: true, tracked: postIds.length });

  } catch (err) {
    console.error('[Feed] Impression tracking error:', err);
    res.status(500).json({ error: 'Tracking failed' });
  }
};

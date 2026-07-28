const { runQuery, getAuthUserId } = require('../utils/dbHelpers');
const logger = require('../utils/logger');
const { checkQuota, useQuota } = require('./subscriptionController');
const { attachTrustToPosts } = require("../services/trustBadgeService");

const BOOST_CONFIG = {
  boost:     { durationDays: 7,  boostLevel: 1 },
  featured:  { durationDays: 14, boostLevel: 2 },
  spotlight: { durationDays: 30, boostLevel: 3 },
};

// One-time schema initialization (cached promise)
let _schemaInitialized = null;
function ensureBoostSchema() {
  if (!_schemaInitialized) {
    _schemaInitialized = (async () => {
      await runQuery(`
        CREATE TABLE IF NOT EXISTS post_boosts (
          boost_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          post_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          boost_type TEXT NOT NULL,
          source TEXT DEFAULT 'quota',
          status TEXT DEFAULT 'active',
          starts_at TIMESTAMPTZ DEFAULT NOW(),
          expires_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `).catch((err) => {
        logger.warn("[Boost] Schema init (post_boosts) skipped:", { message: err?.message });
      });
      await runQuery(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS boost_level INT DEFAULT 0`).catch((err) => {
        logger.warn("[Boost] Schema init (posts.boost_level) skipped:", { message: err?.message });
      });
      await runQuery(`CREATE INDEX IF NOT EXISTS idx_post_boosts_active ON post_boosts(post_id, status) WHERE status = 'active'`).catch((err) => {
        logger.warn("[Boost] Schema init (idx_post_boosts_active) skipped:", { message: err?.message });
      });
    })();
  }
  return _schemaInitialized;
}

// runQuery and getAuthUserId are imported from ../utils/dbHelpers

/**
 * POST /api/posts/:postId/boost
 * Body: { boostType: 'boost'|'featured'|'spotlight', paymentReference?: string }
 */
exports.boostPost = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const { postId } = req.params;
    const boostType = String(req.body?.boostType || req.body?.tier || '').toLowerCase();

    if (!BOOST_CONFIG[boostType]) {
      return res.status(400).json({
        error: 'Invalid boost type. Must be: boost, featured, or spotlight',
        options: Object.keys(BOOST_CONFIG),
      });
    }

    // Check subscription quota before anything else
    // Re-check after useQuota to prevent race conditions
    const quotaStatus = await checkQuota(userId, boostType);
    if (!quotaStatus.hasQuota) {
      return res.status(403).json({
        error: `No ${boostType} quota remaining. Upgrade your plan for more.`,
        plan: quotaStatus.plan,
        remaining: 0,
        used: quotaStatus.used || 0,
        max: quotaStatus.max || 0,
      });
    }

    // Verify post ownership
    const postCheck = await runQuery(
      'SELECT user_id, title, status FROM posts WHERE post_id::text = $1 LIMIT 1',
      [postId],
    );
    if (!postCheck.rows.length) return res.status(404).json({ error: 'Post not found' });
    if (String(postCheck.rows[0].user_id) !== userId) {
      return res.status(403).json({ error: 'You can only boost your own posts' });
    }
    if (postCheck.rows[0].status !== 'active') {
      return res.status(400).json({ error: 'Only active posts can be boosted' });
    }

    const cfg = BOOST_CONFIG[boostType];
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + cfg.durationDays);

    // Ensure schema (cached, runs once)
    await ensureBoostSchema();

    // Consume one quota unit from subscription
    const used = await useQuota(userId, boostType);
    if (!used) {
      return res.status(403).json({ error: `Boost quota already exhausted (race condition prevented)` });
    }

    // Insert boost record (no payment — quota-based)
    const boostResult = await runQuery(
      `INSERT INTO post_boosts (post_id, user_id, boost_type, source, expires_at)
       VALUES ($1, $2, $3, 'quota', $4)
       RETURNING boost_id, boost_type, expires_at`,
      [postId, userId, boostType, expiresAt],
    );

    // Update post boost_level (take the max of existing and new boost level)
    await runQuery(
      `UPDATE posts
       SET boost_level = GREATEST(COALESCE(boost_level, 0), $1)
       WHERE post_id::text = $2`,
      [cfg.boostLevel, postId],
    );

    const remainingAfter = Math.max(0, (quotaStatus.remaining || 0) - 1);
    logger.info(
      `[Boost] User ${userId} used ${boostType} quota on post ${postId} (remaining: ${remainingAfter})`,
    );

    return res.json({
      success: true,
      message: `"${boostType}" boost applied! Your post will have enhanced visibility for ${cfg.durationDays} days.`,
      boost: boostResult.rows[0],
      source: 'subscription_quota',
      remaining: remainingAfter,
      expiresAt,
    });
  } catch (err) {
    logger.error('[Boost] Error:', err.message);
    return res.status(500).json({ error: 'Failed to apply boost' });
  }
};

/**
 * GET /api/posts/sponsored
 * Returns boosted posts for the sponsored listings carousel on detail pages.
 * Priority: spotlight > featured > boost (then seller tier as a tie-breaker)
 * Query params: limit (default 6), excludePostId, category
 */
exports.getSponsoredPosts = async (req, res) => {
  try {
    const limit = Math.min(Number.parseInt(req.query.limit, 10) || 6, 12);
    const excludePostId = req.query.excludePostId || null;
    const category = req.query.category_id || req.query.category || null;

    await ensureBoostSchema();

    const params = [limit];
    let excludeClause = '';
    let categoryClause = '';
    let paramIdx = 2;

    if (excludePostId) {
      excludeClause = `AND p.post_id::text != $${paramIdx}`;
      params.push(String(excludePostId));
      paramIdx++;
    }
    if (category) {
      categoryClause = `AND (c.name ILIKE $${paramIdx} OR p.category_id::text = $${paramIdx})`;
      params.push(String(category));
      paramIdx++;
    }

    const query = `
      SELECT
        p.post_id,
        p.user_id,
        p.title,
        p.price,
        p.images,
        p.location,
        p.created_at,
        p.subcategory_id,
        COALESCE(pb.boost_level, 0) AS boost_level,
        COALESCE(p.tier_priority, 1) AS tier_priority,
        u.current_plan,
        COALESCE(u.current_plan, u.tier, 'basic') AS seller_plan,
        c.name AS category_name,
        sc.name AS subcategory_name,
        COALESCE(pr.full_name, u.username, 'Seller') AS seller_name,
        pb.boost_type,
        CASE
          WHEN COALESCE(pb.boost_level, 0) >= 3 THEN 'Spotlight'
          WHEN COALESCE(pb.boost_level, 0) = 2 THEN 'Featured'
          WHEN COALESCE(pb.boost_level, 0) = 1 THEN 'Boosted'
          ELSE 'Promoted'
        END AS promo_label
      FROM posts p
      LEFT JOIN users u ON p.user_id::text = u.user_id::text
      LEFT JOIN profiles pr ON p.user_id::text = pr.user_id::text
      LEFT JOIN categories c ON p.category_id = c.category_id
      LEFT JOIN subcategories sc ON p.subcategory_id = sc.subcategory_id
      LEFT JOIN LATERAL (
        SELECT
          boost_type,
          CASE
            WHEN boost_type = 'spotlight' THEN 3
            WHEN boost_type = 'featured' THEN 2
            WHEN boost_type = 'boost' THEN 1
            ELSE 0
          END AS boost_level
        FROM post_boosts
        WHERE post_id::text = p.post_id::text
          AND status = 'active'
          AND expires_at > NOW()
        ORDER BY
          CASE
            WHEN boost_type = 'spotlight' THEN 3
            WHEN boost_type = 'featured' THEN 2
            WHEN boost_type = 'boost' THEN 1
            ELSE 0
          END DESC,
          expires_at DESC
        LIMIT 1
      ) pb ON true
      WHERE p.status = 'active'
        AND (p.expires_at IS NULL OR p.expires_at > NOW())
        AND COALESCE(pb.boost_level, 0) > 0
        ${excludeClause}
        ${categoryClause}
      ORDER BY
        COALESCE(pb.boost_level, 0) DESC,
        CASE
          WHEN COALESCE(u.current_plan, u.tier, 'basic') = 'premium' THEN 1
          WHEN COALESCE(u.current_plan, u.tier, 'basic') = 'silver' THEN 2
          WHEN COALESCE(u.current_plan, u.tier, 'basic') = 'bronze' THEN 3
          ELSE 4
        END ASC,
        RANDOM()
      LIMIT $1
    `;

    const result = await runQuery(query, params);
    const posts = result.rows || [];
    const enrichedPosts = await attachTrustToPosts(posts);
    return res.json({ posts: enrichedPosts, count: posts.length });
  } catch (err) {
    logger.error('[Sponsored] Error:', err.message);
    return res.status(500).json({ error: 'Failed to load sponsored posts', posts: [] });
  }
};

/**
 * GET /api/posts/:postId/boost-status
 * Returns active boost info for a post (owner only or public summary)
 */
exports.getBoostStatus = async (req, res) => {
  try {
    const { postId } = req.params;
    await ensureBoostSchema();

    const post = await runQuery(
      'SELECT boost_level, tier_priority FROM posts WHERE post_id::text = $1 LIMIT 1',
      [postId],
    );
    if (!post.rows.length) return res.status(404).json({ error: 'Post not found' });

    let activeBoosts = [];
    try {
      const boostResult = await runQuery(
        `SELECT boost_type, expires_at, status FROM post_boosts
         WHERE post_id::text = $1 AND status = 'active' AND expires_at > NOW()
         ORDER BY expires_at DESC`,
        [postId],
      );
      activeBoosts = boostResult.rows;
    } catch {
      // post_boosts table may not exist yet
    }

    return res.json({
      boostLevel: post.rows[0].boost_level || 0,
      activeBoosts,
      isBoosted: (post.rows[0].boost_level || 0) > 0,
    });
  } catch (err) {
    logger.error('[BoostStatus] Error:', err.message);
    return res.status(500).json({ error: 'Failed to get boost status' });
  }
};

/**
 * GET /api/posts/:postId/premium-recommendations
 * Returns recommended premium listings matching the same category and area.
 * Used for "Premium listings" section on post detail page.
 */
exports.getPremiumRecommendations = async (req, res) => {
  try {
    const { postId } = req.params;
    const limit = Math.min(Number.parseInt(req.query.limit, 10) || 5, 10);

    // Get current post's category and location
    const postResult = await runQuery(
      `SELECT p.category_id, p.location, u.current_plan
       FROM posts p
       LEFT JOIN users u ON p.user_id::text = u.user_id::text
       WHERE p.post_id::text = $1 LIMIT 1`,
      [postId],
    );
    if (!postResult.rows.length) return res.status(404).json({ error: 'Post not found' });

    const { category_id, location } = postResult.rows[0];

    const locationToken = String(location || "")
      .split(",")[0]
      ?.trim()
      .slice(0, 80);

    // Query paid listings first, fall back to basic if needed via ranking
    const params = [postId, limit, category_id || null, locationToken || null];

    const query = `
      SELECT
        p.post_id, p.title, p.price, p.images, p.location, p.created_at,
        p.subcategory_id,
        COALESCE(p.boost_level, 0) AS boost_level,
        COALESCE(u.current_plan, u.tier, 'basic') AS seller_plan,
        CASE WHEN COALESCE(u.current_plan, u.tier, 'basic') = 'premium' THEN 'crown'
             WHEN COALESCE(u.current_plan, u.tier, 'basic') = 'silver' THEN 'verified'
             WHEN COALESCE(u.current_plan, u.tier, 'basic') = 'bronze' THEN 'seller'
             ELSE NULL END AS badge_type,
        c.name AS category_name,
        sc.name AS subcategory_name,
        COALESCE(pr.full_name, u.username, 'Seller') AS seller_name,
        CASE
          WHEN COALESCE(u.current_plan, u.tier, 'basic') = 'premium' AND COALESCE(p.boost_level, 0) >= 2 THEN 1
          WHEN COALESCE(u.current_plan, u.tier, 'basic') = 'premium' THEN 2
          WHEN COALESCE(u.current_plan, u.tier, 'basic') = 'silver' AND COALESCE(p.boost_level, 0) >= 2 THEN 3
          WHEN COALESCE(u.current_plan, u.tier, 'basic') = 'silver' THEN 4
          WHEN COALESCE(u.current_plan, u.tier, 'basic') = 'bronze' THEN 5
          ELSE 6
        END AS plan_rank,
        CASE
          WHEN $3::text IS NOT NULL AND p.category_id::text = $3::text THEN 1
          ELSE 0
        END AS category_match,
        CASE
          WHEN $4::text IS NOT NULL AND $4::text <> '' AND p.location ILIKE '%' || $4::text || '%' THEN 1
          ELSE 0
        END AS location_match
      FROM posts p
      JOIN users u ON p.user_id::text = u.user_id::text
      LEFT JOIN profiles pr ON p.user_id::text = pr.user_id::text
      LEFT JOIN categories c ON p.category_id = c.category_id
      LEFT JOIN subcategories sc ON p.subcategory_id = sc.subcategory_id
      WHERE p.status = 'active'
        AND p.post_id::text != $1
        AND (p.expires_at IS NULL OR p.expires_at > NOW())
        AND COALESCE(u.current_plan, u.tier, 'basic') = 'premium'
      ORDER BY
        COALESCE(p.boost_level, 0) DESC,
        location_match DESC,
        category_match DESC,
        RANDOM()
      LIMIT $2
    `;

    const result = await runQuery(query, params);

    return res.json({
      success: true,
      recommendations: result.rows,
      count: result.rows.length,
    });
  } catch (err) {
    logger.error('[PremiumRecs] Error:', err.message);
    return res.status(500).json({ error: 'Failed to load premium recommendations', recommendations: [] });
  }
};

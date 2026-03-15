const { runQuery, getAuthUserId } = require('../utils/dbHelpers');
const logger = require('../utils/logger');
const { checkQuota, useQuota } = require('./subscriptionController');

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
      `).catch(() => {});
      await runQuery(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS boost_level INT DEFAULT 0`).catch(() => {});
      await runQuery(`CREATE INDEX IF NOT EXISTS idx_post_boosts_active ON post_boosts(post_id, status) WHERE status = 'active'`).catch(() => {});
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
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const { postId } = req.params;
    const boostType = String(req.body?.boostType || '').toLowerCase();

    if (!BOOST_CONFIG[boostType]) {
      return res.status(400).json({
        error: 'Invalid boost type. Must be: boost, featured, or spotlight',
        options: Object.keys(BOOST_CONFIG),
      });
    }

    // Check subscription quota before anything else
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
    await useQuota(userId, boostType);

    // Insert boost record (no payment — quota-based)
    const boostResult = await runQuery(
      `INSERT INTO post_boosts (post_id, user_id, boost_type, source, expires_at)
       VALUES ($1, $2, $3, 'quota', $4)
       RETURNING boost_id, boost_type, expires_at`,
      [postId, userId, boostType, expiresAt],
    );

    // Update post boost_level (take the max of existing and new boost level)
    await runQuery(
      `UPDATE posts SET boost_level = GREATEST(COALESCE(boost_level, 0), $1),
                        tier_priority = GREATEST(COALESCE(tier_priority, 1), $1 + 1)
       WHERE post_id::text = $2`,
      [cfg.boostLevel, postId],
    );

    logger.info(`[Boost] User ${userId} used ${boostType} quota on post ${postId} (remaining: ${quotaStatus.remaining - 1})`);

    return res.json({
      success: true,
      message: `"${boostType}" boost applied! Your post will have enhanced visibility for ${cfg.durationDays} days.`,
      boost: boostResult.rows[0],
      source: 'subscription_quota',
      remaining: quotaStatus.remaining - 1,
      expiresAt,
    });
  } catch (err) {
    logger.error('[Boost] Error:', err.message);
    return res.status(500).json({ error: 'Failed to apply boost' });
  }
};

/**
 * GET /api/posts/sponsored
 * Returns promoted posts for the sponsored listings carousel on detail pages.
 * Priority: spotlight > featured > boost > premium seller posts > silver boosted
 * Query params: limit (default 6), excludePostId, category
 */
exports.getSponsoredPosts = async (req, res) => {
  try {
    const limit = Math.min(Number.parseInt(req.query.limit, 10) || 6, 12);
    const excludePostId = req.query.excludePostId || null;
    const category = req.query.category || null;

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
        p.title,
        p.price,
        p.images,
        p.location,
        p.created_at,
        COALESCE(p.boost_level, 0) AS boost_level,
        COALESCE(p.tier_priority, 1) AS tier_priority,
        u.tier AS seller_tier,
        c.name AS category_name,
        COALESCE(pr.full_name, u.username, 'Seller') AS seller_name,
        CASE
          WHEN COALESCE(p.boost_level, 0) >= 3 THEN 'Spotlight'
          WHEN COALESCE(p.boost_level, 0) = 2 THEN 'Featured'
          WHEN COALESCE(p.boost_level, 0) = 1 THEN 'Boosted'
          WHEN u.tier = 'premium' THEN 'Premium Seller'
          ELSE 'Promoted'
        END AS promo_label
      FROM posts p
      LEFT JOIN users u ON p.user_id::text = u.user_id::text
      LEFT JOIN profiles pr ON p.user_id::text = pr.user_id::text
      LEFT JOIN categories c ON p.category_id = c.category_id
      LEFT JOIN post_boosts pb ON pb.post_id::text = p.post_id::text
        AND pb.status = 'active' AND pb.expires_at > NOW()
      WHERE p.status = 'active'
        AND (p.expires_at IS NULL OR p.expires_at > NOW())
        AND (
          COALESCE(p.boost_level, 0) > 0
          OR u.tier IN ('premium', 'silver')
        )
        ${excludeClause}
        ${categoryClause}
      ORDER BY
        COALESCE(p.boost_level, 0) DESC,
        CASE WHEN u.tier = 'premium' THEN 2 WHEN u.tier = 'silver' THEN 1 ELSE 0 END DESC,
        p.created_at DESC
      LIMIT $1
    `;

    const result = await runQuery(query, params);

    // If not enough sponsored posts, fill with recent active posts
    let posts = result.rows;
    if (posts.length < Math.min(3, limit)) {
      const fillParams = [limit - posts.length];
      const existingIds = posts.map(p => String(p.post_id));
      const excludeList = excludePostId ? [excludePostId, ...existingIds] : existingIds;
      const notInClause = excludeList.length
        ? `AND p.post_id::text != ALL($2::text[])`
        : '';
      const fillQuery = `
        SELECT p.post_id, p.title, p.price, p.images, p.location, p.created_at,
               0 AS boost_level, COALESCE(p.tier_priority,1) AS tier_priority,
               'basic' AS seller_tier, c.name AS category_name,
               COALESCE(pr.full_name, 'Seller') AS seller_name, 'Listing' AS promo_label
        FROM posts p
        LEFT JOIN profiles pr ON p.user_id::text = pr.user_id::text
        LEFT JOIN categories c ON p.category_id = c.category_id
        WHERE p.status = 'active' AND (p.expires_at IS NULL OR p.expires_at > NOW())
        ${notInClause}
        ORDER BY p.created_at DESC
        LIMIT $1
      `;
      const fillResult = await runQuery(
        fillQuery,
        excludeList.length ? [limit - posts.length, excludeList] : [limit - posts.length],
      ).catch(() => ({ rows: [] }));
      posts = [...posts, ...fillResult.rows];
    }

    return res.json({ posts, count: posts.length });
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
 * Returns 3-5 recommended premium/silver listings matching the same category and area.
 * Used for "Recommended Premium Listings" section on post detail page.
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

    // Query premium/silver user posts in same category, excluding current post
    const params = [postId, limit];
    let categoryClause = '';
    let paramIdx = 3;

    if (category_id) {
      categoryClause = `AND p.category_id = $${paramIdx}`;
      params.push(category_id);
      paramIdx++;
    }

    const query = `
      SELECT
        p.post_id, p.title, p.price, p.images, p.location, p.created_at,
        COALESCE(p.boost_level, 0) AS boost_level,
        u.current_plan,
        CASE WHEN u.current_plan = 'premium' THEN 'crown'
             WHEN u.current_plan = 'silver' THEN 'verified'
             WHEN u.current_plan = 'bronze' THEN 'seller'
             ELSE NULL END AS badge_type,
        c.name AS category_name,
        COALESCE(pr.full_name, u.username, 'Seller') AS seller_name
      FROM posts p
      JOIN users u ON p.user_id::text = u.user_id::text
      LEFT JOIN profiles pr ON p.user_id::text = pr.user_id::text
      LEFT JOIN categories c ON p.category_id = c.category_id
      WHERE p.status = 'active'
        AND p.post_id::text != $1
        AND (p.expires_at IS NULL OR p.expires_at > NOW())
        AND u.current_plan IN ('premium', 'silver')
        ${categoryClause}
      ORDER BY
        CASE WHEN u.current_plan = 'premium' THEN 1 ELSE 2 END ASC,
        COALESCE(p.boost_level, 0) DESC,
        RANDOM()
      LIMIT $2
    `;

    let result = await runQuery(query, params);

    // If less than 3 results, fill with bronze users
    if (result.rows.length < 3) {
      const existingIds = result.rows.map(r => String(r.post_id));
      const excludeIds = [postId, ...existingIds];
      const fillLimit = limit - result.rows.length;

      const fillQuery = `
        SELECT
          p.post_id, p.title, p.price, p.images, p.location, p.created_at,
          COALESCE(p.boost_level, 0) AS boost_level,
          u.current_plan,
          'seller' AS badge_type,
          c.name AS category_name,
          COALESCE(pr.full_name, u.username, 'Seller') AS seller_name
        FROM posts p
        JOIN users u ON p.user_id::text = u.user_id::text
        LEFT JOIN profiles pr ON p.user_id::text = pr.user_id::text
        LEFT JOIN categories c ON p.category_id = c.category_id
        WHERE p.status = 'active'
          AND p.post_id::text != ALL($1::text[])
          AND (p.expires_at IS NULL OR p.expires_at > NOW())
          AND u.current_plan = 'bronze'
          ${category_id ? 'AND p.category_id = $3' : ''}
        ORDER BY RANDOM()
        LIMIT $2
      `;

      const fillParams = category_id
        ? [excludeIds, fillLimit, category_id]
        : [excludeIds, fillLimit];

      const fillResult = await runQuery(fillQuery, fillParams).catch(() => ({ rows: [] }));
      result = { rows: [...result.rows, ...fillResult.rows] };
    }

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

const pool = require('../config/db');
let logger;
try {
  logger = require('../utils/logger');
} catch (e) {
  logger = null;
}
const logError = (logger && logger.error) ? logger.error : console.error;
const logInfo = (logger && logger.info) ? logger.info : console.log;
const guaranteedReachController = require('./postGuaranteedReachController');
const { ensureUserTierColumns } = require('../services/schemaGuard');

const DEFAULT_PAGE = 1;
const DEFAULT_USER_POST_LIMIT = 100;
const DEFAULT_ALL_POST_LIMIT = 10;
const MAX_POST_LIMIT = 100;
const SHUFFLE_POOL_LIMIT = 200;
const SHUFFLE_SEED_BUCKET_MS = 5 * 60 * 1000;
const MAX_SHUFFLE_SEED = 2147483647;
const MAX_SHUFFLE_STATE = 2147483646;
const DB_QUERY_TIMEOUT_MS = Number.parseInt(process.env.DB_QUERY_TIMEOUT_MS, 10) || 10000;
const POST_SORT_FIELDS = new Set(['created_at', 'price', 'views_count']);
const USER_POST_SORT_FIELDS = new Set(['created_at', 'updated_at', 'price', 'title', 'status']);

function runQuery(text, values = []) {
  return pool.query({
    text,
    values,
    query_timeout: DB_QUERY_TIMEOUT_MS
  });
}

function getScalarQueryValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

function parseOptionalString(value) {
  const scalar = getScalarQueryValue(value);
  if (scalar === undefined || scalar === null) {
    return null;
  }

  const normalized = (typeof scalar === 'string' ? scalar : String(scalar)).trim();
  return normalized.length ? normalized : null;
}

function getAuthenticatedUserId(req) {
  return parseOptionalString(req.user?.userId || req.user?.id || req.user?.user_id);
}

function parsePositiveInt(value, fallback, max = Number.MAX_SAFE_INTEGER) {
  const normalized = parseOptionalString(value);
  if (!normalized || !/^\d+$/.test(normalized)) {
    return fallback;
  }
  const parsed = Number(normalized);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    return fallback;
  }
  return Math.min(parsed, max);
}

function parseOptionalNumber(value) {
  const normalized = parseOptionalString(value);
  if (normalized === null) {
    return null;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalDate(value) {
  const normalized = parseOptionalString(value);
  if (!normalized) {
    return null;
  }
  const timestamp = Date.parse(normalized);
  return Number.isNaN(timestamp) ? null : normalized;
}

function parseSortBy(value) {
  const normalized = parseOptionalString(value)?.toLowerCase();
  if (normalized === 'shuffle' || normalized === 'random') {
    return 'shuffle';
  }
  return POST_SORT_FIELDS.has(normalized) ? normalized : 'created_at';
}

function parseSortOrder(value) {
  return parseOptionalString(value)?.toLowerCase() === 'asc' ? 'asc' : 'desc';
}

function parseUserPostSortBy(value) {
  const normalized = parseOptionalString(value)?.toLowerCase();
  return USER_POST_SORT_FIELDS.has(normalized) ? normalized : 'created_at';
}

function buildUserPostOrderClause(sortBy, sortOrder) {
  const safeOrder = sortOrder === 'asc' ? 'ASC' : 'DESC';

  if (sortBy === 'price') {
    return `price ${safeOrder} NULLS LAST, created_at DESC`;
  }
  if (sortBy === 'title') {
    return `title ${safeOrder}, created_at DESC`;
  }
  if (sortBy === 'status') {
    return `status ${safeOrder}, created_at DESC`;
  }
  if (sortBy === 'updated_at') {
    return `updated_at ${safeOrder} NULLS LAST, created_at DESC`;
  }

  return `created_at ${safeOrder}`;
}

function hashSeedString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) % MAX_SHUFFLE_SEED;
  }
  return hash || 1;
}

function parseShuffleSeed(value) {
  const normalized = parseOptionalString(value);
  if (!normalized) {
    return Math.floor(Date.now() / SHUFFLE_SEED_BUCKET_MS);
  }
  if (/^-?\d+$/.test(normalized)) {
    const numericSeed = Math.abs(Number.parseInt(normalized, 10)) % MAX_SHUFFLE_SEED;
    return numericSeed || 1;
  }
  return hashSeedString(normalized);
}

function createSeededRandom(seed) {
  let state = seed % MAX_SHUFFLE_SEED;
  if (state <= 0) {
    state += MAX_SHUFFLE_STATE;
  }
  return () => {
    state = (state * 16807) % MAX_SHUFFLE_SEED;
    return (state - 1) / MAX_SHUFFLE_STATE;
  };
}

function shuffleRowsWithSeed(rows, seed) {
  const random = createSeededRandom(seed);
  const shuffledRows = [...rows];
  for (let i = shuffledRows.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [shuffledRows[i], shuffledRows[j]] = [shuffledRows[j], shuffledRows[i]];
  }
  return shuffledRows;
}

function normalizePostListQuery(query) {
  let minPrice = parseOptionalNumber(query.minPrice);
  let maxPrice = parseOptionalNumber(query.maxPrice);
  if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
    [minPrice, maxPrice] = [maxPrice, minPrice];
  }

  let startDate = parseOptionalDate(query.startDate);
  let endDate = parseOptionalDate(query.endDate);
  if (startDate && endDate && Date.parse(startDate) > Date.parse(endDate)) {
    [startDate, endDate] = [endDate, startDate];
  }

  const category = parseOptionalString(query.category) || parseOptionalString(query.category_id);

  return {
    page: parsePositiveInt(query.page, DEFAULT_PAGE),
    limit: parsePositiveInt(query.limit, DEFAULT_ALL_POST_LIMIT, MAX_POST_LIMIT),
    sortBy: parseSortBy(query.sortBy),
    sortOrder: parseSortOrder(query.sortOrder),
    shuffleSeed: parseShuffleSeed(query.shuffleSeed || query.refresh || query.seed),
    filters: {
      search: parseOptionalString(query.search) || parseOptionalString(query.q),
      category: category && category.toLowerCase() !== 'all' ? category : null,
      location: parseOptionalString(query.location),
      minPrice,
      maxPrice,
      author: parseOptionalString(query.author),
      startDate,
      endDate
    }
  };
}

function buildPostWhereClause(filters) {
  const params = [];
  const conditions = [
    `p.status = 'active'`,
    `(p.expires_at IS NULL OR p.expires_at > NOW())`
  ];

  const addParam = (value) => {
    params.push(value);
    return `$${params.length}`;
  };

  if (filters.search) {
    const placeholder = addParam(`%${filters.search}%`);
    conditions.push(`(p.title ILIKE ${placeholder} OR p.description ILIKE ${placeholder} OR p.location ILIKE ${placeholder} OR c.name ILIKE ${placeholder})`);
  }
  if (filters.category) {
    conditions.push(`p.category_id::text = ${addParam(filters.category)}`);
  }
  if (filters.location) {
    conditions.push(`p.location ILIKE ${addParam(`%${filters.location}%`)}`);
  }
  if (filters.author) {
    conditions.push(`p.user_id::text = ${addParam(filters.author)}`);
  }
  if (filters.startDate) {
    conditions.push(`p.created_at >= ${addParam(filters.startDate)}`);
  }
  if (filters.endDate) {
    conditions.push(`p.created_at <= ${addParam(filters.endDate)}`);
  }
  if (filters.minPrice !== null) {
    conditions.push(`p.price >= ${addParam(filters.minPrice)}`);
  }
  if (filters.maxPrice !== null) {
    conditions.push(`p.price <= ${addParam(filters.maxPrice)}`);
  }

  return {
    params,
    clause: `WHERE ${conditions.join(' AND ')}`
  };
}

function mapPostForResponse(post) {
  return {
    ...post,
    id: post.post_id,
    tier_priority: post.tier_priority || 1,
    category: post.category_name || 'General',
    user: {
      name: post.user_name || post.username || 'Unknown',
      username: post.username,
      email: post.email,
      rating: parseFloat(post.seller_rating) || 0,
      isVerified: post.aadhaar_verified || post.pan_verified,
      aadhaarVerified: post.aadhaar_verified,
      panVerified: post.pan_verified,
      verificationDate: post.verification_date
    },
    image_url: post.images?.[0] || post.image_url || '/placeholder.svg'
  };
}

// Get posts for a specific user (includes own posts + posts bought by user)
// PERFORMANCE FIX: Combined two queries into single UNION query (eliminates N+1 pattern)
exports.getUserPosts = async (req, res) => {
  try {
    const {
      userId,
      status,
      page = DEFAULT_PAGE,
      limit = DEFAULT_USER_POST_LIMIT
    } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const pageNumber = parsePositiveInt(page, DEFAULT_PAGE);
    const limitNumber = parsePositiveInt(limit, DEFAULT_USER_POST_LIMIT, MAX_POST_LIMIT);
    const offset = (pageNumber - 1) * limitNumber;
    const normalizedStatus = parseOptionalString(status);
    const sortBy = parseUserPostSortBy(req.query.sortBy);
    const sortOrder = parseSortOrder(req.query.sortOrder);
    const orderClause = buildUserPostOrderClause(sortBy, sortOrder);

    const result = await runQuery(
      `
      WITH user_posts AS (
        -- User's own posts
        SELECT
          p.post_id,
          p.user_id,
          p.title,
          p.description,
          p.price,
          p.category_id,
          p.location,
          p.created_at,
          p.updated_at,
          p.status,
          p.tier_priority,
          p.images,
          'own' AS ownership
        FROM posts p
        WHERE p.user_id::text = $1::text

        UNION ALL

        -- Posts bought by this user (exclude posts owned by this same user)
        SELECT
          p.post_id,
          p.user_id,
          p.title,
          p.description,
          p.price,
          p.category_id,
          p.location,
          p.created_at,
          p.updated_at,
          p.status,
          p.tier_priority,
          p.images,
          'bought' AS ownership
        FROM posts p
        INNER JOIN transactions t ON p.post_id::text = t.post_id::text
        WHERE t.buyer_id::text = $1::text
          AND t.status = 'completed'
          AND p.user_id::text != $1::text
      ),
      filtered_posts AS (
        SELECT
          post_id,
          user_id,
          title,
          description,
          price,
          category_id,
          location,
          created_at,
          updated_at,
          status,
          tier_priority,
          images,
          ownership
        FROM user_posts
        WHERE ($2::text IS NULL OR status = $2::text)
      )
      SELECT
        fp.post_id,
        fp.user_id,
        fp.title,
        fp.description,
        fp.price,
        fp.category_id,
        fp.location,
        fp.created_at,
        fp.updated_at,
        fp.status,
        fp.tier_priority,
        fp.images,
        fp.ownership,
        COUNT(*) OVER() AS total_count
      FROM filtered_posts fp
      ORDER BY ${orderClause}
      LIMIT $3 OFFSET $4
      `,
      [String(userId), normalizedStatus, limitNumber, offset]
    );

    const total = result.rows.length ? Number.parseInt(result.rows[0].total_count, 10) || 0 : 0;
    const posts = result.rows.map(({ total_count, ...post }) => post);

    res.json({ posts, total, page: pageNumber, limit: limitNumber });
  } catch (err) {
    logError('[getUserPosts] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.getAllPosts = async (req, res) => {
  try {
    const {
      page: pageNumber,
      limit: limitNumber,
      sortBy,
      sortOrder,
      shuffleSeed,
      filters
    } = normalizePostListQuery(req.query);
    const offset = (pageNumber - 1) * limitNumber;

    // Shared WHERE clause for both data and count queries keeps pagination totals consistent.
    const { clause: whereClause, params: whereParams } = buildPostWhereClause(filters);
    let query = `
      SELECT 
        ${sortBy === 'shuffle' ? '' : 'COUNT(*) OVER() AS total_count,'}
        p.*,
        COALESCE(p.tier_priority, 1) as tier_priority,
        COALESCE(p.views_count, p.views, 0) as views,
        COALESCE(p.views_count, 0) as views_count,
        COALESCE(p.shares, 0) as shares,
        COALESCE(p.likes, 0) as likes,
        u.username,
        u.email,
        u.rating as seller_rating,
        COALESCE(pr.full_name, u.username) as user_name,
        c.name as category_name,
        -- Verification fields temporarily disabled due to UUID migration
        NULL as aadhaar_verified,
        NULL as pan_verified,
        NULL as verification_date
      FROM posts p
      LEFT JOIN users u ON p.user_id::text = u.user_id::text
      LEFT JOIN profiles pr ON p.user_id::text = pr.user_id::text
      LEFT JOIN categories c ON p.category_id = c.category_id
      ${whereClause}
    `;
    const params = [...whereParams];

    let sortClause;

    if (sortBy === 'shuffle') {
      // THE "INSTAGRAM ALGORITHM" (Pseudo-randomized feed)
      // Instead of expensive SQL ORDER BY RANDOM(), we fetch the top 200 most recent items.
      // We then shuffle them in Node.js (cheap) to ensure a fresh experience on every refresh.
      // Filtering and other logic still apply.
      query += ` ORDER BY p.created_at DESC LIMIT ${SHUFFLE_POOL_LIMIT}`;

      const result = await runQuery(query, params);

      // Seeded shuffle gives stable pagination for the same seed.
      const shuffled = shuffleRowsWithSeed(result.rows, shuffleSeed);

      // Paginate the shuffled results manually
      const paginatedRows = shuffled.slice(offset, offset + limitNumber);

      // Return early as we've already executed the query and sliced the results
      const posts = paginatedRows.map(mapPostForResponse);

      // For shuffle mode, we treat the 200 posts as the world for pagination
      return res.json({
        posts,
        total: result.rows.length,
        page: pageNumber,
        limit: limitNumber,
        shuffled: true,
        shuffleSeed
      });
    }

    // Default sorting logic for non-shuffle requests
    const safeSortBy = `p.${sortBy}`;
    const safeSortOrder = sortOrder === 'asc' ? 'ASC' : 'DESC';
    sortClause = `ORDER BY COALESCE(p.tier_priority, 1) DESC, ${safeSortBy} ${safeSortOrder}`;

    query += ` ${sortClause} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limitNumber, offset);

    const result = await runQuery(query, params);

    // Transform results to include user object with verification status
    const posts = result.rows.map(({ total_count, ...post }) => mapPostForResponse(post));
    const total = result.rows.length ? Number.parseInt(result.rows[0].total_count, 10) || 0 : 0;

    res.json({ posts, total, page: pageNumber, limit: limitNumber });
  } catch (err) {
    logError('Error fetching posts:', err);
    res.status(500).json({ error: err.message });
  }
};


// Post creation - supports regular posts with images OR feed posts (text-only)
// PROTOCOL: VALUE HIERARCHY - Tier Enforcement (The Defender)
// TRANSACTIONAL INTEGRITY: ZERO TRUST
exports.createPost = async (req, res) => {
  const client = await pool.connect();

  try {
    await ensureUserTierColumns();
    await client.query('BEGIN'); // START TRANSACTION

    // SECURITY FIX: Get user_id from authenticated token, NOT from request body
    const user_id = getAuthenticatedUserId(req) || parseOptionalString(req.body.user_id);

    // Use req.body directly but sanitize/validate
    const { category_id, title, description, price, type, location, is_flash_sale } = req.body;
    const images = req.files?.images || [];
    const audioFile = req.files?.audio?.[0] || req.file;

    if (!user_id) {
      throw new Error('User ID required');
    }

    // ============================================
    // TIER ENFORCEMENT - Protocol: Value Hierarchy
    // ============================================
    const { getTierRules } = require('../config/tierRules');

    // 1. GET USER TIER DETAILS (Within Transaction)
    const userResult = await client.query(
      `SELECT tier, subscription_expiry, post_credits FROM users WHERE user_id = $1 FOR UPDATE`,
      [user_id]
    );

    const user = userResult.rows[0];
    if (!user) throw new Error('User not found');

    const tier = user.tier || 'basic';
    const rules = getTierRules(tier);

    // 2. CHECK SUBSCRIPTION VALIDITY
    if (tier !== 'basic' && user.subscription_expiry) {
      if (new Date(user.subscription_expiry) < new Date()) {
        throw new Error('Subscription expired. Please renew.');
      }
    }

    // 3. CHECK DAILY LIMIT (Silver)
    if (tier === 'silver') {
      const today = new Date().toISOString().split('T')[0];
      const dailyCountResult = await client.query(
        `SELECT COUNT(*) as count FROM posts 
         WHERE user_id = $1 AND created_at::date = $2::date`,
        [user_id, today]
      );

      const todayCount = parseInt(dailyCountResult.rows[0]?.count || 0);
      if (todayCount >= rules.dailyLimit) {
        throw new Error(`Daily limit reached (${rules.dailyLimit} per day). Upgrade to Premium.`);
      }
    }

    // 4. CHECK CREDITS (Basic)
    if (tier === 'basic') {
      const credits = user.post_credits || 0;
      if (credits < 1) {
        throw new Error('No post credits remaining. Buy more credits or upgrade.');
      }
    }

    // 5. CALCULATE EXPIRY
    let expiresAt;
    if (is_flash_sale === 'true' || is_flash_sale === true) {
      expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    } else {
      expiresAt = rules.getExpiry();
    }

    // ============================================
    // CREATE THE POST
    // ============================================
    const imagesJson = JSON.stringify(images.map(img => img.path || img.filename));
    const audioUrl = audioFile ? (audioFile.path || audioFile.filename || `/uploads/${audioFile.filename}`) : null;

    const insertResult = await client.query(
      `INSERT INTO posts (user_id, category_id, title, description, price, location, post_type, images, status, created_at, views_count, likes, shares, audio_url, is_flash_sale, expires_at, tier_priority)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::JSONB, 'active', NOW(), 0, 0, 0, $9, $10, $11, $12)
       RETURNING post_id`,
      [
        user_id,
        category_id || 1,
        title || 'Update',
        description || '',
        price || 0,
        location || null,
        type || 'sale',
        imagesJson,
        audioUrl,
        is_flash_sale === 'true' || is_flash_sale === true,
        expiresAt,
        rules.priority
      ]
    );

    const post_id = insertResult.rows[0]?.post_id;

    // TIER ENFORCEMENT: Deduct credit for Basic tier
    if (tier === 'basic') {
      await client.query(
        `UPDATE users SET post_credits = post_credits - 1 WHERE user_id = $1`,
        [user_id]
      );
    }

    // Translation queue (Outside main logic, can fail safely but included in Tx just in case)
    if (title || description) {
      const textToTranslate = `${title || ''}\n\n${description || ''}`.trim();
      await client.query(
        `INSERT INTO translation_queue (post_id, source_text, source_lang, target_lang, status)
             VALUES ($1, $2, 'en', 'hi', 'pending')
             ON CONFLICT DO NOTHING`,
        [post_id, textToTranslate]
      );
    }

    await client.query('COMMIT'); // COMMIT TRANSACTION

    // Fetch final post for response (Read committed)
    const postRes = await runQuery(
      `
        SELECT
          post_id,
          user_id,
          category_id,
          title,
          description,
          price,
          location,
          post_type,
          images,
          status,
          views_count,
          likes,
          shares,
          audio_url,
          is_flash_sale,
          expires_at,
          tier_priority,
          created_at,
          updated_at
        FROM posts
        WHERE post_id = $1
        LIMIT 1
      `,
      [post_id]
    );

    logInfo('Post created successfully', { post_id, user_id, tier });

    res.status(201).json({
      post: postRes.rows[0],
      images: postRes.rows[0].images,
      tier: tier,
      expiresAt: expiresAt
    });

  } catch (err) {
    await client.query('ROLLBACK'); // ROLLBACK ON ERROR
    logError('Error creating post (Transaction Rolled Back):', err);
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
};


// Get post by ID
exports.getPostById = async (req, res) => {
  try {
    const postId = req.params.postId || req.params.id;
    const postRes = await runQuery(
      `
      WITH updated_post AS (
        UPDATE posts
        SET views_count = COALESCE(views_count, 0) + 1
        WHERE post_id = $1
        RETURNING
          post_id,
          user_id,
          category_id,
          title,
          description,
          price,
          location,
          post_type,
          images,
          status,
          views_count,
          likes,
          shares,
          audio_url,
          is_flash_sale,
          expires_at,
          tier_priority,
          created_at,
          updated_at
      )
      SELECT
        up.post_id,
        up.user_id,
        up.category_id,
        up.title,
        up.description,
        up.price,
        up.location,
        up.post_type,
        up.images,
        up.status,
        up.views_count,
        up.likes,
        up.shares,
        up.audio_url,
        up.is_flash_sale,
        up.expires_at,
        up.tier_priority,
        up.created_at,
        up.updated_at,
        COALESCE(u.username, 'Unknown') AS author,
        COALESCE(c.name, 'Unknown') AS category
      FROM updated_post up
      LEFT JOIN users u ON up.user_id::text = u.user_id::text
      LEFT JOIN categories c ON up.category_id = c.category_id
      `,
      [postId]
    );
    if (!postRes.rows.length) return res.status(404).json({ error: 'Post not found' });
    const post = postRes.rows[0];
    post.views = post.views_count; // Alias for frontend compatibility
    // Return with post wrapper for consistency
    res.json({ post });
  } catch (err) {
    logError('Error fetching post by ID:', err);
    res.status(500).json({ error: err.message });
  }
};

// Get nearby posts using Haversine geo-spatial search
// Uses get_nearby_posts() SQL function from fortress schema
exports.getNearbyPosts = async (req, res) => {
  try {
    const { lat, long, radius = 10 } = req.query;

    if (!lat || !long) {
      return res.status(400).json({ error: 'Latitude and longitude required' });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(long);
    const searchRadius = parseFloat(radius);

    // Use the geo-spatial function from fortress schema
    const result = await runQuery(
      'SELECT * FROM get_nearby_posts($1, $2, $3)',
      [latitude, longitude, searchRadius]
    );

    logInfo(`[getNearbyPosts] Found ${result.rows.length} posts within ${searchRadius}km of (${latitude}, ${longitude})`);

    res.json({
      posts: result.rows,
      total: result.rows.length,
      searchParams: { lat: latitude, long: longitude, radius: searchRadius }
    });
  } catch (err) {
    logError('[getNearbyPosts] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// Get user trust score
exports.getUserTrustScore = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    const result = await runQuery(
      'SELECT * FROM view_user_trust_score WHERE user_id = $1',
      [userId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    logError('[getUserTrustScore] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// Guaranteed Reach feed logic is split for maintainability.
exports.getCacheStats = guaranteedReachController.getCacheStats;
exports.getGuaranteedReachPosts = guaranteedReachController.getGuaranteedReachPosts;

// ============================================
// SIMILAR PRODUCTS ENGINE
// Returns products matching category + price ±20%
// ============================================
exports.getSimilarPosts = async (req, res) => {
  try {
    const { postId } = req.params;
    const limit = parsePositiveInt(req.query.limit, 5, 20);

    if (!postId) {
      return res.status(400).json({ error: 'Post ID required' });
    }

    // Get the reference post
    const refPost = await runQuery(
      'SELECT category_id, price FROM posts WHERE post_id = $1',
      [postId]
    );

    if (refPost.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const { category_id, price } = refPost.rows[0];
    const priceMin = price * 0.8;  // -20%
    const priceMax = price * 1.2;  // +20%

    // Find similar posts
    const result = await runQuery(`
      SELECT 
        p.post_id, p.title, p.price, p.images, p.location, p.created_at,
        u.name as seller_name, u.avatar_url
      FROM posts p
      LEFT JOIN users u ON p.user_id = u.user_id
      WHERE p.category_id = $1
        AND p.price BETWEEN $2 AND $3
        AND p.post_id != $4
        AND p.status = 'active'
      ORDER BY 
        ABS(p.price - $5) ASC,  -- Closest price first
        p.created_at DESC
      LIMIT $6
    `, [category_id, priceMin, priceMax, postId, price, limit]);

    logInfo(`[SimilarPosts] Found ${result.rows.length} similar to post ${postId}`);

    res.json({
      similar: result.rows,
      referencePost: { post_id: postId, category_id, price }
    });

  } catch (err) {
    logError('[SimilarPosts] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// ============================================
// MARK AS SOLD
// Hides post from feed, keeps in user's history
// ============================================

/**
 * POST /api/posts/:id/sold
 * Mark a post as sold
 * Only the post owner can mark their post as sold
 */
exports.markAsSold = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getAuthenticatedUserId(req);
    const { buyer_id, sale_price } = req.body; // Optional: record buyer info

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify ownership
    const postCheck = await runQuery(
      'SELECT post_id, user_id, title, status, price FROM posts WHERE post_id = $1',
      [id]
    );

    if (postCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const post = postCheck.rows[0];

    if (String(post.user_id) !== String(userId)) {
      return res.status(403).json({ error: 'You can only mark your own posts as sold' });
    }

    if (post.status === 'sold') {
      return res.status(400).json({ error: 'Post is already marked as sold' });
    }

    // Update post status
    await runQuery(
      `UPDATE posts 
       SET status = 'sold', sold_at = NOW(), updated_at = NOW()
       WHERE post_id = $1`,
      [id]
    );

    // Optional: Create transaction record if buyer info provided
    if (buyer_id) {
      try {
        await runQuery(
          `INSERT INTO transactions (seller_id, buyer_id, post_id, amount, status, completed_at)
           VALUES ($1, $2, $3, $4, 'completed', NOW())`,
          [userId, buyer_id, id, sale_price || post.price || 0]
        );
      } catch (txErr) {
        logError('[MarkAsSold] Transaction record failed (non-fatal):', txErr.message);
      }
    }

    logInfo(`[MarkAsSold] Post ${id} marked as sold by user ${userId}`);

    res.json({
      success: true,
      message: 'Post marked as sold',
      post_id: id,
      status: 'sold'
    });

  } catch (err) {
    logError('[MarkAsSold] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/posts/:id/reactivate
 * Reactivate a sold or expired post
 * Only the post owner can reactivate their post
 */
exports.reactivatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getAuthenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify ownership
    const postCheck = await runQuery(
      'SELECT post_id, user_id, status FROM posts WHERE post_id = $1',
      [id]
    );

    if (postCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const post = postCheck.rows[0];

    if (String(post.user_id) !== String(userId)) {
      return res.status(403).json({ error: 'You can only reactivate your own posts' });
    }

    if (post.status === 'active') {
      return res.status(400).json({ error: 'Post is already active' });
    }

    // Check user's tier for new expiry calculation
    const { getTierRules } = require('../config/tierRules');
    const userResult = await runQuery(
      'SELECT tier FROM users WHERE user_id = $1',
      [userId]
    );
    const tier = userResult.rows[0]?.tier || 'basic';
    const rules = getTierRules(tier);
    const newExpiresAt = rules.getExpiry();

    // Reactivate post
    await runQuery(
      `UPDATE posts 
       SET status = 'active', sold_at = NULL, expires_at = $2, updated_at = NOW()
       WHERE post_id = $1`,
      [id, newExpiresAt]
    );

    logInfo(`[Reactivate] Post ${id} reactivated by user ${userId}`);

    res.json({
      success: true,
      message: 'Post reactivated',
      post_id: id,
      status: 'active',
      expires_at: newExpiresAt
    });

  } catch (err) {
    logError('[Reactivate] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * DELETE /api/posts/:id
 * Soft delete a post (sets status to 'deleted')
 */
exports.deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getAuthenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify ownership
    const postCheck = await runQuery(
      'SELECT post_id, user_id FROM posts WHERE post_id = $1',
      [id]
    );

    if (postCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (String(postCheck.rows[0].user_id) !== String(userId)) {
      return res.status(403).json({ error: 'You can only delete your own posts' });
    }

    // Soft delete
    await runQuery(
      `UPDATE posts SET status = 'deleted', updated_at = NOW() WHERE post_id = $1`,
      [id]
    );

    logInfo(`[DeletePost] Post ${id} deleted by user ${userId}`);

    res.json({
      success: true,
      message: 'Post deleted',
      post_id: id
    });

  } catch (err) {
    logError('[DeletePost] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
};


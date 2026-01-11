const pool = require('../config/db');
let logger;
try {
  logger = require('../utils/logger');
} catch (e) {
  logger = null;
}
const logError = (logger && logger.error) ? logger.error : console.error;
const logInfo = (logger && logger.info) ? logger.info : console.log;

// Get posts for a specific user (includes own posts + posts bought by user)
exports.getUserPosts = async (req, res) => {
  try {
    const { userId, status, sortBy = 'created_at', sortOrder = 'desc', page = 1, limit = 100 } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    // Query 1: Get user's own posts
    const ownPostsResult = await pool.query(
      `SELECT * FROM posts WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );

    // Query 2: Get posts bought BY this user (from transactions table)
    // Join with posts to get full post details where this user is the buyer
    const boughtPostsResult = await pool.query(
      `SELECT p.* FROM posts p
       INNER JOIN transactions t ON p.post_id = t.post_id
       WHERE t.buyer_id = $1 AND t.status = 'completed' AND p.user_id != $1
       ORDER BY t.completed_at DESC`,
      [userId]
    );

    // Mark ownership on each post
    const ownPosts = ownPostsResult.rows.map(p => ({ ...p, ownership: 'own' }));
    const boughtPosts = boughtPostsResult.rows.map(p => ({ ...p, ownership: 'bought', status: 'bought' }));

    // Combine all posts (avoid duplicates by using Set of post_ids)
    const seenIds = new Set();
    let allPosts = [];

    for (const post of ownPosts) {
      if (!seenIds.has(post.post_id)) {
        seenIds.add(post.post_id);
        allPosts.push(post);
      }
    }
    for (const post of boughtPosts) {
      if (!seenIds.has(post.post_id)) {
        seenIds.add(post.post_id);
        allPosts.push(post);
      }
    }

    // Filter by status if requested
    if (status) {
      allPosts = allPosts.filter(p => p.status === status);
    }

    // Sort
    allPosts.sort((a, b) => {
      const aVal = a[sortBy] || a.created_at;
      const bVal = b[sortBy] || b.created_at;
      return sortOrder === 'desc' ? new Date(bVal) - new Date(aVal) : new Date(aVal) - new Date(bVal);
    });

    // Paginate
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const paginatedPosts = allPosts.slice(offset, offset + parseInt(limit));

    res.json({ posts: paginatedPosts, total: allPosts.length });
  } catch (err) {
    console.error('[getUserPosts] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.getAllPosts = async (req, res) => {
  try {
    const { search, category, location, minPrice, maxPrice, author, startDate, endDate, sortBy = 'created_at', sortOrder = 'desc', page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build dynamic query with JOINs for user info, category, and images
    // Use subqueries for verification since user_verifications uses verification_type column
    // PROTOCOL: VALUE HIERARCHY - Include tier_priority for Premium post prioritization
    let query = `
      SELECT 
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

        
        (SELECT is_verified FROM user_verifications WHERE user_id = p.user_id AND verification_type = 'aadhaar' LIMIT 1) as aadhaar_verified,
        (SELECT is_verified FROM user_verifications WHERE user_id = p.user_id AND verification_type = 'pan' LIMIT 1) as pan_verified,
        (SELECT verified_at FROM user_verifications WHERE user_id = p.user_id AND is_verified = true ORDER BY verified_at DESC LIMIT 1) as verification_date
      FROM posts p
      LEFT JOIN users u ON p.user_id = u.user_id
      LEFT JOIN profiles pr ON p.user_id = pr.user_id
      LEFT JOIN categories c ON p.category_id = c.category_id
      WHERE p.status = 'active'
        AND (p.expires_at IS NULL OR p.expires_at > NOW())
    `;


    const params = [];

    // Search across title, description, location, AND category name
    if (search) {
      query += ` AND (p.title ILIKE $${params.length + 1} OR p.description ILIKE $${params.length + 1} OR p.location ILIKE $${params.length + 1} OR c.name ILIKE $${params.length + 1})`;
      params.push(`%${search}%`);
    }
    if (category) {
      query += ` AND p.category_id = $${params.length + 1}`;
      params.push(category);
    }
    if (location) {
      query += ` AND p.location ILIKE $${params.length + 1}`;
      params.push(`%${location}%`);
    }
    if (author) {
      query += ` AND p.user_id = $${params.length + 1}`;
      params.push(author); // UUID is string
    }
    if (startDate) {
      query += ` AND p.created_at >= $${params.length + 1}`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND p.created_at <= $${params.length + 1}`;
      params.push(endDate);
    }
    if (minPrice) {
      query += ` AND p.price >= $${params.length + 1}`;
      params.push(minPrice);
    }
    if (maxPrice) {
      query += ` AND p.price <= $${params.length + 1}`;
      params.push(maxPrice);
    }

    // Dynamic sorting - includes shuffle option and TIER PRIORITY for Protocol: Value Hierarchy
    const allowedSortFields = ['created_at', 'price', 'views_count', 'shuffle', 'tier_priority'];
    let sortClause;

    if (sortBy === 'shuffle' || sortBy === 'random') {
      // Time-seeded random: changes every 30 seconds for fresh content
      // Premium posts still get priority even in shuffle mode
      const timeSeed = Math.floor(Date.now() / 30000); // Changes every 30 seconds
      sortClause = `ORDER BY COALESCE(p.tier_priority, 1) DESC, (p.post_id * ${timeSeed % 1000}) % 1000, p.created_at DESC`;
    } else if (sortBy === 'tier_priority' || sortBy === 'priority') {
      // Explicit tier priority sorting (Protocol: Value Hierarchy)
      sortClause = `ORDER BY COALESCE(p.tier_priority, 1) DESC, p.created_at DESC`;
    } else {
      // Default sorting - always include tier_priority as secondary sort
      const safeSortBy = ['created_at', 'price', 'views_count'].includes(sortBy) ? `p.${sortBy}` : 'p.created_at';
      const safeSortOrder = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
      sortClause = `ORDER BY COALESCE(p.tier_priority, 1) DESC, ${safeSortBy} ${safeSortOrder}`;
    }

    query += ` ${sortClause} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Transform results to include user object with verification status
    const posts = result.rows.map(post => ({
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
    }));


    // Get total count for pagination (must join categories to search by category name)
    let countQuery = `SELECT COUNT(*) FROM posts p LEFT JOIN categories c ON p.category_id = c.category_id WHERE p.status = 'active'`;
    const countParams = [];
    if (search) { countQuery += ` AND (p.title ILIKE $${countParams.length + 1} OR p.description ILIKE $${countParams.length + 1} OR p.location ILIKE $${countParams.length + 1} OR c.name ILIKE $${countParams.length + 1})`; countParams.push(`%${search}%`); }
    if (category) { countQuery += ` AND p.category_id = $${countParams.length + 1}`; countParams.push(category); }
    if (location) { countQuery += ` AND p.location ILIKE $${countParams.length + 1}`; countParams.push(`%${location}%`); }
    if (author) { countQuery += ` AND p.user_id = $${countParams.length + 1}`; countParams.push(author); }
    if (startDate) { countQuery += ` AND p.created_at >= $${countParams.length + 1}`; countParams.push(startDate); }
    if (endDate) { countQuery += ` AND p.created_at <= $${countParams.length + 1}`; countParams.push(endDate); }
    if (minPrice) { countQuery += ` AND p.price >= $${countParams.length + 1}`; countParams.push(minPrice); }
    if (maxPrice) { countQuery += ` AND p.price <= $${countParams.length + 1}`; countParams.push(maxPrice); }
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({ posts, total });
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
    await client.query('BEGIN'); // START TRANSACTION

    // SECURITY FIX: Get user_id from authenticated token, NOT from request body
    const user_id = req.user?.id || req.user?.userId || req.body.user_id;

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
    const postRes = await pool.query('SELECT * FROM posts WHERE post_id = $1', [post_id]);

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
    // Fetch post details - use post_id column
    const postRes = await pool.query('SELECT * FROM posts WHERE post_id = $1', [postId]);
    if (!postRes.rows.length) return res.status(404).json({ error: 'Post not found' });
    const post = postRes.rows[0];
    // Increment view count when post is viewed
    await pool.query('UPDATE posts SET views_count = views_count + 1 WHERE post_id = $1', [postId]);
    // Fetch author and category - use user_id column for users table
    const authorRes = await pool.query('SELECT username FROM users WHERE user_id = $1', [post.user_id]);
    const categoryRes = await pool.query('SELECT name FROM categories WHERE category_id = $1', [post.category_id]);
    post.author = authorRes.rows[0]?.username || 'Unknown';
    post.category = categoryRes.rows[0]?.name || 'Unknown';
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
    const result = await pool.query(
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

    const result = await pool.query(
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

// ============================================
// GUARANTEED REACH ALGORITHM
// Ensures every seller's post reaches all users
// ============================================
const { GUARANTEED_REACH_QUERY, GUARANTEED_REACH_FALLBACK } = require('../queries/guaranteedReachQuery');

// Query timeout for high availability
const QUERY_TIMEOUT = 3000;

// ===========================================
// REDIS DISTRIBUTED CACHING FOR 10 LAKH+ USERS
// Uses Redis when available, falls back to in-memory
// ===========================================
const redisCache = require('../config/redisCache');

// Legacy in-memory fallback (used if Redis module fails to load)
const feedCache = new Map();
const CACHE_TTL = 5;  // 5 seconds (in seconds for Redis)
const MAX_CACHE_ENTRIES = 1000;

function getCacheKey(userId, limit, refreshSeed, filters) {
  // IMPORTANT: Use the FULL refresh seed for unique results on every refresh
  // This ensures users get new posts when they refresh the page
  // Only cache identical requests (same exact seed = same user revisiting quickly)
  const filterKey = filters ? JSON.stringify(filters) : '';
  return `feed:${refreshSeed}:${limit}:${filterKey}`;
}

// Async cache operations using Redis
async function getFromCache(key) {
  try {
    const data = await redisCache.get(key);
    if (data) {
      redisCache.recordHit();
      return data;
    }
    redisCache.recordMiss();
    return null;
  } catch (err) {
    console.log('[PostController] Cache get error, continuing without cache');
    return null;
  }
}

async function setCache(key, data) {
  try {
    await redisCache.set(key, data, CACHE_TTL);
  } catch (err) {
    console.log('[PostController] Cache set error:', err.message);
  }
}

// Performance stats endpoint - shows Redis status
exports.getCacheStats = async (req, res) => {
  try {
    const stats = redisCache.getStats();
    const health = await redisCache.healthCheck();
    res.json({
      ...stats,
      health,
      message: stats.isRedisAvailable
        ? `Redis distributed cache active - ${stats.hitRate} hit rate`
        : `In-memory fallback active - ${stats.hitRate} hit rate`
    });
  } catch (err) {
    res.json({
      error: err.message,
      fallback: 'Using in-memory cache'
    });
  }
};

async function queryWithTimeout(query, params, timeoutMs = QUERY_TIMEOUT) {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Query timeout')), timeoutMs)
  );
  const queryPromise = pool.query(query, params);
  return Promise.race([queryPromise, timeoutPromise]);
}

/**
 * GET /api/posts/for-you
 * Returns posts with Guaranteed Reach algorithm
 * 
 * Features:
 * - Low-view posts get priority (seller fairness)
 * - Fresh posts (< 48 hours) get visibility boost
 * - Time-seeded randomization (different every 30s)
 * - Author diversity (max 1 post per seller)
 */
exports.getGuaranteedReachPosts = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id || req.query.userId || 0;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;

    // Refresh seed - client sends random number on each refresh for instant variety
    const refreshSeed = parseInt(req.query.refresh) || Math.floor(Math.random() * 10000);

    // Category filter support
    const { category, search, minPrice, maxPrice, location } = req.query;
    const hasFilters = search || minPrice || maxPrice || location || (category && category !== 'All');
    const queryLimit = hasFilters ? Math.max(200, limit * 10) : (limit + offset);

    // === REDIS DISTRIBUTED CACHING ===
    // For 10 lakh+ concurrent users, Redis cache prevents database overload
    const cacheKey = getCacheKey(userId, queryLimit, refreshSeed, { category, search, minPrice, maxPrice, location });
    let rows = await getFromCache(cacheKey);
    let fromCache = false;

    const startTime = Date.now();

    if (rows) {
      fromCache = true;
      logInfo(`[GuaranteedReach] REDIS CACHE HIT - ${cacheKey.substring(0, 30)}...`);
    } else {
      // Cache miss - execute DB query
      try {
        const result = await queryWithTimeout(GUARANTEED_REACH_QUERY, [userId, queryLimit, refreshSeed]);
        rows = result.rows;
        await setCache(cacheKey, rows);
        logInfo(`[GuaranteedReach] CACHE MISS - Query: ${Date.now() - startTime}ms, ${rows.length} posts`);
      } catch (queryErr) {
        // Fallback on timeout
        logInfo(`[GuaranteedReach] Timeout, using fallback query`);
        const fallback = await pool.query(GUARANTEED_REACH_FALLBACK, [queryLimit]);
        rows = fallback.rows;
      }
    }

    const queryTime = Date.now() - startTime;

    // Apply client-side filters if needed (category, search, price, location)
    let posts = rows;

    if (category && category !== 'All') {
      posts = posts.filter(p =>
        p.category_id == category ||
        p.category_name?.toLowerCase() === category.toLowerCase()
      );
    }
    if (search) {
      const searchLower = search.toLowerCase();
      posts = posts.filter(p =>
        p.title?.toLowerCase().includes(searchLower) ||
        p.description?.toLowerCase().includes(searchLower) ||
        p.location?.toLowerCase().includes(searchLower) ||
        p.author_name?.toLowerCase().includes(searchLower) ||  // Search by seller name
        p.category_name?.toLowerCase().includes(searchLower)   // Search by category
      );
    }
    if (minPrice) {
      posts = posts.filter(p => p.price >= parseFloat(minPrice));
    }
    if (maxPrice) {
      posts = posts.filter(p => p.price <= parseFloat(maxPrice));
    }
    if (location) {
      posts = posts.filter(p => p.location?.toLowerCase().includes(location.toLowerCase()));
    }

    // Paginate the filtered results
    const paginatedPosts = posts.slice(offset, offset + limit);

    // Transform for frontend compatibility
    const transformedPosts = paginatedPosts.map(post => ({
      ...post,
      id: post.post_id,
      category: post.category_name || 'General',
      user: {
        name: post.author_name || 'Seller',
        id: post.author_id
      },
      image_url: post.images?.[0] || '/placeholder.svg'
    }));

    res.json({
      posts: transformedPosts,
      total: posts.length,
      page,
      limit,
      cached: fromCache,
      queryTimeMs: queryTime,
      feedMeta: {
        lowReachCount: paginatedPosts.filter(p => p.feed_phase === 'low_reach').length,
        freshCount: paginatedPosts.filter(p => p.feed_phase === 'fresh').length,
        rotatingCount: paginatedPosts.filter(p => p.feed_phase === 'rotating').length
      }
    });

  } catch (err) {
    logError('[GuaranteedReach] Error:', err.message);
    res.status(500).json({ error: err.message, posts: [] });
  }
};

// ============================================
// SIMILAR PRODUCTS ENGINE
// Returns products matching category + price ±20%
// ============================================
exports.getSimilarPosts = async (req, res) => {
  try {
    const { postId } = req.params;
    const limit = parseInt(req.query.limit) || 5;

    if (!postId) {
      return res.status(400).json({ error: 'Post ID required' });
    }

    // Get the reference post
    const refPost = await pool.query(
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
    const result = await pool.query(`
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
    const userId = req.user?.userId || req.user?.id;
    const { buyer_id, sale_price } = req.body; // Optional: record buyer info

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify ownership
    const postCheck = await pool.query(
      'SELECT post_id, user_id, title, status FROM posts WHERE post_id = $1',
      [id]
    );

    if (postCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const post = postCheck.rows[0];

    if (post.user_id !== userId) {
      return res.status(403).json({ error: 'You can only mark your own posts as sold' });
    }

    if (post.status === 'sold') {
      return res.status(400).json({ error: 'Post is already marked as sold' });
    }

    // Update post status
    await pool.query(
      `UPDATE posts 
       SET status = 'sold', sold_at = NOW(), updated_at = NOW()
       WHERE post_id = $1`,
      [id]
    );

    // Optional: Create transaction record if buyer info provided
    if (buyer_id) {
      try {
        await pool.query(
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
    const userId = req.user?.userId || req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify ownership
    const postCheck = await pool.query(
      'SELECT post_id, user_id, status FROM posts WHERE post_id = $1',
      [id]
    );

    if (postCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const post = postCheck.rows[0];

    if (post.user_id !== parseInt(userId)) {
      return res.status(403).json({ error: 'You can only reactivate your own posts' });
    }

    if (post.status === 'active') {
      return res.status(400).json({ error: 'Post is already active' });
    }

    // Check user's tier for new expiry calculation
    const { getTierRules } = require('../config/tierRules');
    const userResult = await pool.query(
      'SELECT tier FROM users WHERE user_id = $1',
      [userId]
    );
    const tier = userResult.rows[0]?.tier || 'basic';
    const rules = getTierRules(tier);
    const newExpiresAt = rules.getExpiry();

    // Reactivate post
    await pool.query(
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
    const userId = req.user?.userId || req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify ownership
    const postCheck = await pool.query(
      'SELECT post_id, user_id FROM posts WHERE post_id = $1',
      [id]
    );

    if (postCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (postCheck.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'You can only delete your own posts' });
    }

    // Soft delete
    await pool.query(
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


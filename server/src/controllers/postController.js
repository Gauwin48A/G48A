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
    let query = `
      SELECT 
        p.*,
        COALESCE(p.views_count, p.views, 0) as views,
        COALESCE(p.views_count, 0) as views_count,
        COALESCE(p.shares, 0) as shares,
        COALESCE(p.likes, 0) as likes,
        u.username,
        u.email,
        u.rating as seller_rating,
        COALESCE(pr.full_name, u.username) as user_name,
        c.name as category_name,
        (SELECT array_agg(image_url) FROM post_images pi WHERE pi.post_id = p.post_id LIMIT 5) as images,

        (SELECT is_verified FROM user_verifications WHERE user_id = p.user_id AND verification_type = 'aadhaar' LIMIT 1) as aadhaar_verified,
        (SELECT is_verified FROM user_verifications WHERE user_id = p.user_id AND verification_type = 'pan' LIMIT 1) as pan_verified,
        (SELECT verified_at FROM user_verifications WHERE user_id = p.user_id AND is_verified = true ORDER BY verified_at DESC LIMIT 1) as verification_date
      FROM posts p
      LEFT JOIN users u ON p.user_id = u.user_id
      LEFT JOIN profiles pr ON p.user_id = pr.user_id
      LEFT JOIN categories c ON p.category_id = c.category_id
      WHERE p.status = 'active'
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
    if (author && !isNaN(parseInt(author))) {
      query += ` AND p.user_id = $${params.length + 1}`;
      params.push(parseInt(author));
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

    // Dynamic sorting
    const allowedSortFields = ['created_at', 'price', 'views_count'];
    const safeSortBy = allowedSortFields.includes(sortBy) ? `p.${sortBy}` : 'p.created_at';
    const safeSortOrder = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${safeSortBy} ${safeSortOrder} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Transform results to include user object with verification status
    const posts = result.rows.map(post => ({
      ...post,
      id: post.post_id,
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
    if (author && !isNaN(parseInt(author))) { countQuery += ` AND p.user_id = $${countParams.length + 1}`; countParams.push(parseInt(author)); }
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
exports.createPost = async (req, res) => {
  try {
    // SECURITY FIX: Get user_id from authenticated token, NOT from request body
    const user_id = req.user?.id || req.user?.userId || req.body.user_id;
    const { category_id, title, description, price, type, location } = req.body;
    const images = req.files?.images || [];

    if (!user_id) {
      return res.status(401).json({ error: 'User ID required' });
    }

    // Insert the post directly (no stored procedure needed)
    const insertResult = await pool.query(
      `INSERT INTO posts (user_id, category_id, title, description, price, location, post_type, status, created_at, views_count, likes, shares)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', NOW(), 0, 0, 0)
       RETURNING post_id`,
      [
        user_id,
        category_id || 1, // Default category
        title || 'Update',
        description || '',
        price || 0,
        location || null,
        type || 'sale' // 'feed' for feed posts, 'sale' for regular
      ]
    );

    const post_id = insertResult.rows[0]?.post_id;
    if (!post_id) {
      logError('Post creation failed', { body: req.body });
      return res.status(400).json({ error: 'Post creation failed' });
    }

    // Insert images if any
    if (images.length > 0) {
      const imageValues = images.map((img, idx) =>
        `(${post_id}, '${img.path || img.filename}', ${idx + 1})`
      ).join(',');
      await pool.query(
        `INSERT INTO post_images (post_id, image_url, display_order) VALUES ${imageValues}`
      );
    }

    // Fetch the created post for response
    const postRes = await pool.query('SELECT * FROM posts WHERE post_id = $1', [post_id]);
    const imagesRes = await pool.query('SELECT * FROM post_images WHERE post_id = $1', [post_id]);

    logInfo('Post created successfully', { post_id, user_id, type: type || 'sale' });
    res.status(201).json({ post: postRes.rows[0], images: imagesRes.rows });
  } catch (err) {
    logError('Error creating post:', err);
    res.status(400).json({ error: err.message });
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


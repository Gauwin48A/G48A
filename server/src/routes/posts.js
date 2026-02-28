const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const { validate, postValidation } = require('../middleware/validators');
const { protect, optionalAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const pool = require('../config/db');
const { searchPosts, getNearbyPosts } = require('../services/searchService');
const postViewBufferService = require('../services/postViewBufferService');
const logger = require('../utils/logger');

const DB_QUERY_TIMEOUT_MS = Number.parseInt(process.env.DB_QUERY_TIMEOUT_MS, 10) || 10000;
const MAX_SEARCH_RADIUS_KM = 500;
const DEFAULT_SEARCH_LIMIT = 20;
const MAX_SEARCH_LIMIT = 100;
const MAX_SEARCH_OFFSET = 5000;

function runQuery(text, values = []) {
  return pool.query({
    text,
    values,
    query_timeout: DB_QUERY_TIMEOUT_MS
  });
}

function parseNumberOrNull(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseBoundedInt(value, fallback, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(parsed, min), max);
}

function getAuthenticatedUserId(req) {
  return req.user?.userId || req.user?.id || req.user?.user_id || null;
}

function isAdmin(req) {
  const role = String(req.user?.role || '').toLowerCase();
  return role === 'admin' || role === 'superadmin';
}

function requireAdminRead(req, res, next) {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  return next();
}

// GET /api/posts/all for legacy support
router.get('/all', postController.getAllPosts);

// GET /api/posts/mine for user posts
router.get('/mine', postController.getUserPosts);

// GET /api/posts/nearby - Geo-spatial search (Fortress Schema)
router.get('/nearby',
  postValidation.nearby,
  validate,
  postController.getNearbyPosts
);

// GET /api/posts/:postId/similar - Similar Products Engine
router.get('/:postId/similar', postController.getSimilarPosts);

// ============================================
// SECURITY FORTRESS V2 ENDPOINTS (Optimized)
// ============================================

// GET /api/posts/search-v2 - Optimized full-text + location search
router.get('/search-v2', async (req, res) => {
  try {
    const {
      q: query,
      lat,
      lng,
      radius = 50,
      category_id: categoryId,
      min_price: minPrice,
      max_price: maxPrice,
      limit = 20,
      offset = 0
    } = req.query;

    const latValue = parseNumberOrNull(lat);
    const lngValue = parseNumberOrNull(lng);
    const radiusValue = parseBoundedInt(radius, 50, { min: 1, max: MAX_SEARCH_RADIUS_KM });
    const minPriceValue = parseNumberOrNull(minPrice);
    const maxPriceValue = parseNumberOrNull(maxPrice);
    const limitValue = parseBoundedInt(limit, DEFAULT_SEARCH_LIMIT, { min: 1, max: MAX_SEARCH_LIMIT });
    const offsetValue = parseBoundedInt(offset, 0, { min: 0, max: MAX_SEARCH_OFFSET });

    const results = await searchPosts({
      query: query || null,
      lat: latValue,
      lng: lngValue,
      radius: radiusValue,
      categoryId: categoryId || null,
      minPrice: minPriceValue,
      maxPrice: maxPriceValue,
      limit: limitValue,
      offset: offsetValue
    });

    res.json({
      success: true,
      posts: results,
      count: results.length,
      query: {
        search: query,
        location: latValue !== null && lngValue !== null ? { lat: latValue, lng: lngValue, radius: radiusValue } : null,
        filters: { categoryId, minPrice, maxPrice }
      }
    });
  } catch (error) {
    logger.error('[Posts] search-v2 error:', error);
    res.status(500).json({ error: 'Search failed', details: error.message });
  }
});

// GET /api/posts/nearby-v2 - Optimized nearby posts
router.get('/nearby-v2', async (req, res) => {
  try {
    const {
      lat,
      lng,
      radius = 25,
      category_id: categoryId,
      limit = 20
    } = req.query;

    const latValue = parseNumberOrNull(lat);
    const lngValue = parseNumberOrNull(lng);

    if (latValue === null || lngValue === null) {
      return res.status(400).json({ error: 'lat and lng are required' });
    }

    const radiusValue = parseBoundedInt(radius, 25, { min: 1, max: MAX_SEARCH_RADIUS_KM });
    const limitValue = parseBoundedInt(limit, DEFAULT_SEARCH_LIMIT, { min: 1, max: MAX_SEARCH_LIMIT });

    const results = await getNearbyPosts({
      lat: latValue,
      lng: lngValue,
      radius: radiusValue,
      categoryId: categoryId || null,
      limit: limitValue
    });

    res.json({
      success: true,
      posts: results,
      count: results.length,
      location: { lat: latValue, lng: lngValue, radius: radiusValue }
    });
  } catch (error) {
    logger.error('[Posts] nearby-v2 error:', error);
    res.status(500).json({ error: 'Nearby search failed', details: error.message });
  }
});

// GET /api/posts/trust/:userId - User trust score
router.get('/trust/:userId', postController.getUserTrustScore);

// GET /api/posts/for-you - Guaranteed Reach Algorithm
// Returns posts with fair distribution ensuring all sellers get visibility
router.get('/for-you', optionalAuth, postController.getGuaranteedReachPosts);

// GET /api/posts/cache-stats - Performance monitoring for high-scale operations
router.get('/cache-stats', protect, requireAdminRead, postController.getCacheStats);

// Main GET /api/posts endpoint (returns { posts, total })
router.get('/', postController.getAllPosts);

const optimizeLocalImages = require('../middleware/imageOptimizer');

// ... (existing GET routes)

// CREATE POST: Token Required + Input Sanitization + Validation
router.post('/',
  protect,
  upload.fields([{ name: 'images', maxCount: 10 }]),
  optimizeLocalImages, // Optimize images before controller
  postValidation.create,
  validate,
  postController.createPost
);

// Alternative create endpoint
router.post('/create',
  protect,
  upload.fields([{ name: 'images', maxCount: 10 }]),
  optimizeLocalImages, // Optimize images before controller
  postValidation.create,
  validate,
  postController.createPost
);

router.get('/undone', protect, async (req, res) => {
  try {
    const requesterId = getAuthenticatedUserId(req);
    if (!requesterId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const requestedUserId = req.query.userId ? String(req.query.userId).trim() : null;
    let targetUserId = String(requesterId);

    if (requestedUserId && requestedUserId !== targetUserId) {
      if (!isAdmin(req)) {
        return res.status(403).json({ error: "Not authorized to fetch other users' undone posts" });
      }
      targetUserId = requestedUserId;
    }

    const result = await runQuery(`
      SELECT
        post_id,
        user_id,
        title,
        description,
        category_id,
        post_type,
        condition,
        price,
        status,
        images,
        location,
        created_at,
        updated_at
      FROM posts
      WHERE status = 'undone'
        AND user_id::text = $1
      ORDER BY COALESCE(updated_at, created_at) DESC
      LIMIT 200
    `, [targetUserId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch undone sales' });
  }
});

// POST /api/posts/batch-view - Batch increment views (Optimized for scale)
router.post('/batch-view', async (req, res) => {
  try {
    const outcome = await postViewBufferService.enqueueBatchView(req.body?.postIds);
    res.json({
      success: true,
      mode: outcome.mode,
      queued: outcome.queued,
      skipped: outcome.skipped,
      updated: outcome.updated,
      flushScheduled: outcome.flushScheduled
    });
  } catch (err) {
    logger.error('Batch view error:', err);
    // Don't error out on client for stats issues, just log it
    res.json({ success: false, error: 'Batch update failed' });
  }
});

// GET /api/posts/batch-view/stats - view-buffer queue visibility for ops
router.get('/batch-view/stats', protect, requireAdminRead, (req, res) => {
  res.json({
    success: true,
    ...postViewBufferService.getQueueStats()
  });
});

// POST /api/posts/:postId/view - Increment view count
router.post('/:postId/view', async (req, res) => {
  const { postId } = req.params;

  try {
    // Increment views column in posts table
    const result = await runQuery(
      `UPDATE posts SET views = COALESCE(views, 0) + 1 WHERE post_id = $1 RETURNING views`,
      [postId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json({ success: true, views: result.rows[0].views });
  } catch (err) {
    logger.error('View increment error:', err);
    res.status(500).json({ error: 'Failed to record view' });
  }
});

// POST /api/posts/:postId/share - Track share action
router.post('/:postId/share', async (req, res) => {
  const { postId } = req.params;

  try {
    await runQuery(
      `UPDATE posts SET shares = COALESCE(shares, 0) + 1 WHERE post_id = $1`,
      [postId]
    );
    res.json({ success: true });
  } catch (err) {
    logger.error('Share tracking error:', err);
    res.json({ success: true, warning: 'Share not tracked' });
  }
});

// POST /api/posts/:postId/like - Toggle like on a post
router.post('/:postId/like', protect, async (req, res) => {
  const { postId } = req.params;
  const userId = req.user?.userId || req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required to like posts' });
  }

  try {
    // Try to use post_likes table if it exists, otherwise just increment
    try {
      const existingLike = await runQuery(
        'SELECT 1 FROM post_likes WHERE user_id = $1 AND post_id = $2 LIMIT 1',
        [userId, postId]
      );

      if (existingLike.rows.length > 0) {
        await runQuery('DELETE FROM post_likes WHERE user_id = $1 AND post_id = $2', [userId, postId]);
        await runQuery('UPDATE posts SET likes = GREATEST(COALESCE(likes, 0) - 1, 0) WHERE post_id = $1', [postId]);
        return res.json({ liked: false, message: 'Post unliked' });
      } else {
        await runQuery('INSERT INTO post_likes (user_id, post_id) VALUES ($1, $2)', [userId, postId]);
        await runQuery('UPDATE posts SET likes = COALESCE(likes, 0) + 1 WHERE post_id = $1', [postId]);
        return res.json({ liked: true, message: 'Post liked' });
      }
    } catch (tableErr) {
      // Fallback: If post_likes table doesn't exist, just increment likes
      logger.info('post_likes table not found, incrementing likes directly');
      const result = await runQuery(
        'UPDATE posts SET likes = COALESCE(likes, 0) + 1 WHERE post_id = $1 RETURNING likes',
        [postId]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Post not found' });
      }
      return res.json({ liked: true, likes: result.rows[0].likes, message: 'Post liked' });
    }
  } catch (err) {
    logger.error('Like toggle error:', err);
    res.status(500).json({ error: 'Failed to toggle like' });
  }
});

// POST /api/posts/:postId/sold - Mark post as sold (hides from feed)
router.post('/:postId/sold', protect, postController.markAsSold);

// POST /api/posts/:postId/reactivate - Reactivate sold/expired post
router.post('/:postId/reactivate', protect, postController.reactivatePost);

// GET /api/posts/:postId - get post by ID
router.get('/:postId', postController.getPostById);

// DELETE /api/posts/:postId - delete a post (owner only)
router.delete('/:postId', protect, async (req, res) => {
  const { postId } = req.params;
  const userId = req.user?.userId || req.user?.id;

  logger.info('[DELETE] Attempting delete - postId:', postId, 'userId from token:', userId);

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const ownerCheck = await runQuery(
      'SELECT user_id FROM posts WHERE post_id = $1',
      [postId]
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const postOwnerId = ownerCheck.rows[0].user_id;

    if (String(postOwnerId) !== String(userId)) {
      return res.status(403).json({ error: `Not authorized (owner: ${postOwnerId}, you: ${userId})` });
    }

    await runQuery('DELETE FROM posts WHERE post_id = $1', [postId]);
    res.json({ message: 'Post deleted successfully', postId });
  } catch (err) {
    logger.error('Delete post error:', err);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// PUT /api/posts/:postId - update a post (owner only)
router.put('/:postId', protect, async (req, res) => {
  const { postId } = req.params;
  const userId = req.user?.userId || req.user?.id;
  const { title, description, price, location, status } = req.body;

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const ownerCheck = await runQuery(
      'SELECT user_id, created_at FROM posts WHERE post_id = $1',
      [postId]
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (String(ownerCheck.rows[0].user_id) !== String(userId)) {
      return res.status(403).json({ error: 'Not authorized to edit this post' });
    }

    const result = await runQuery(`
      UPDATE posts SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        price = COALESCE($3, price),
        location = COALESCE($4, location),
        status = COALESCE($5, status),
        updated_at = NOW()
      WHERE post_id = $6
      RETURNING
        post_id,
        user_id,
        title,
        description,
        category_id,
        post_type,
        condition,
        price,
        status,
        images,
        location,
        created_at,
        updated_at
    `, [title, description, price, location, status, postId]);

    res.json({ message: 'Post updated successfully', post: result.rows[0] });
  } catch (err) {
    logger.error('Update post error:', err);
    res.status(500).json({ error: 'Failed to update post' });
  }
});

module.exports = router;

const express = require("express");
const router = express.Router();
const postController = require("../controllers/postController");
const postBoostController = require("../controllers/postBoostController");
const {
  awardCoinOnPostCreate,
  awardCoinOnSale,
} = require("../services/coinHooks");
const { validate, postValidation } = require("../middleware/validators");
const { protect, optionalAuth } = require("../middleware/auth");
const upload = require("../middleware/upload");
const { searchPosts, getNearbyPosts } = require("../services/searchService");
const postViewBufferService = require("../services/postViewBufferService");
const logger = require("../utils/logger");
const { runQuery, getAuthUserId, isAdmin } = require("../utils/dbHelpers");
const { parseNumberOrNull, parseBoundedInt } = require("../utils/parseHelpers");
const { attachTrustToPosts } = require("../services/trustBadgeService");

const MAX_SEARCH_RADIUS_KM = 500;
const DEFAULT_SEARCH_LIMIT = 20;
const MAX_SEARCH_LIMIT = 100;
const MAX_SEARCH_OFFSET = 5e3;

/**
 * Middleware that requires the authenticated user to be an admin.
 * Returns 403 if the user is not an admin.
 */
function requireAdminRead(req, res, next) {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: "Admin access required" });
  }
  return next();
}

/**
 * GET /all
 * Retrieve all posts (public).
 */
router.get("/all", postController.getAllPosts);

/**
 * GET /mine
 * Retrieve the current user's posts.
 */
router.get("/mine", postController.getUserPosts);

/**
 * GET /mine/totals
 * Retrieve aggregate counts for the current user's posts.
 */
router.get("/mine/totals", postController.getUserPostTotals);

/**
 * GET /nearby
 * Retrieve nearby posts using validation middleware.
 */
router.get(
  "/nearby",
  postValidation.nearby,
  validate,
  postController.getNearbyPosts
);

/**
 * GET /:postId/similar
 * Retrieve posts similar to the given post.
 */
router.get("/:postId/similar", postController.getSimilarPosts);

/**
 * GET /search-v2
 * Full-text and geo search for posts with filtering, pagination, and radius.
 * @query {string}  q           - Search query text
 * @query {number}  lat         - Latitude for geo search
 * @query {number}  lng         - Longitude for geo search
 * @query {number}  radius      - Search radius in km (default 50, max 500)
 * @query {string}  category_id - Filter by category
 * @query {string}  subcategory_id - Filter by subcategory
 * @query {number}  min_price   - Minimum price filter
 * @query {number}  max_price   - Maximum price filter
 * @query {number}  limit       - Results per page (default 20, max 100)
 * @query {number}  offset      - Pagination offset (default 0, max 5000)
 */
router.get("/search-v2", async (req, res) => {
  try {
    const {
      q: query,
      lat,
      lng,
      radius = 50,
      category_id: categoryId,
      subcategory_id: subcategoryId,
      min_price: minPrice,
      max_price: maxPrice,
      limit = 20,
      offset = 0,
    } = req.query;

    const latValue = parseNumberOrNull(lat);
    const lngValue = parseNumberOrNull(lng);
    const radiusValue = parseBoundedInt(radius, 50, {
      min: 1,
      max: MAX_SEARCH_RADIUS_KM,
    });
    const minPriceValue = parseNumberOrNull(minPrice);
    const maxPriceValue = parseNumberOrNull(maxPrice);
    const limitValue = parseBoundedInt(limit, DEFAULT_SEARCH_LIMIT, {
      min: 1,
      max: MAX_SEARCH_LIMIT,
    });
    const offsetValue = parseBoundedInt(offset, 0, {
      min: 0,
      max: MAX_SEARCH_OFFSET,
    });

    const results = await searchPosts({
      query: query || null,
      lat: latValue,
      lng: lngValue,
      radius: radiusValue,
      categoryId: categoryId || null,
      subcategoryId: subcategoryId || null,
      minPrice: minPriceValue,
      maxPrice: maxPriceValue,
      limit: limitValue,
      offset: offsetValue,
    });
    const enrichedResults = await attachTrustToPosts(results || []);

    res.json({
      success: true,
      posts: enrichedResults,
      count: results.length,
      query: {
        search: query,
        location:
          latValue !== null && lngValue !== null
            ? { lat: latValue, lng: lngValue, radius: radiusValue }
            : null,
        filters: {
          categoryId: categoryId,
          subcategoryId: subcategoryId,
          minPrice: minPrice,
          maxPrice: maxPrice,
        },
      },
    });
  } catch (error) {
    logger.error("[Posts] search-v2 error:", error);
    res.status(500).json({ error: "Search failed" });
  }
});

/**
 * GET /search
 * Alias for /search-v2 — prevents route collision with /:postId.
 */
router.get("/search", async (req, res) => {
  try {
    const {
      q: query,
      lat,
      lng,
      radius = 50,
      category_id: categoryId,
      subcategory_id: subcategoryId,
      min_price: minPrice,
      max_price: maxPrice,
      limit = 20,
      offset = 0,
    } = req.query;

    const latValue = parseNumberOrNull(lat);
    const lngValue = parseNumberOrNull(lng);
    const radiusValue = parseBoundedInt(radius, 50, { min: 1, max: MAX_SEARCH_RADIUS_KM });
    const limitValue = parseBoundedInt(limit, DEFAULT_SEARCH_LIMIT, { min: 1, max: MAX_SEARCH_LIMIT });
    const offsetValue = parseBoundedInt(offset, 0, { min: 0, max: MAX_SEARCH_OFFSET });

    const results = await searchPosts({
      query: query || null,
      lat: latValue,
      lng: lngValue,
      radius: radiusValue,
      categoryId: categoryId || null,
      subcategoryId: subcategoryId || null,
      minPrice: parseNumberOrNull(minPrice),
      maxPrice: parseNumberOrNull(maxPrice),
      limit: limitValue,
      offset: offsetValue,
    });
    const enrichedResults = await attachTrustToPosts(results || []);

    res.json({
      success: true,
      posts: enrichedResults,
      count: results.length,
    });
  } catch (error) {
    logger.error("[Posts] search error:", error);
    res.status(500).json({ error: "Search failed" });
  }
});

/**
 * GET /nearby-v2
 * Geo-based nearby post lookup with category filtering.
 * @query {number}  lat         - Latitude (required)
 * @query {number}  lng         - Longitude (required)
 * @query {number}  radius      - Search radius in km (default 25, max 500)
 * @query {string}  category_id - Filter by category
 * @query {number}  limit       - Results per page (default 20, max 100)
 */
router.get("/nearby-v2", async (req, res) => {
  try {
    const {
      lat,
      lng,
      radius = 25,
      category_id: categoryId,
      subcategory_id: subcategoryId,
      limit = 20,
    } = req.query;

    const latValue = parseNumberOrNull(lat);
    const lngValue = parseNumberOrNull(lng);

    if (latValue === null || lngValue === null) {
      return res.status(400).json({ error: "lat and lng are required" });
    }

    const radiusValue = parseBoundedInt(radius, 25, {
      min: 1,
      max: MAX_SEARCH_RADIUS_KM,
    });
    const limitValue = parseBoundedInt(limit, DEFAULT_SEARCH_LIMIT, {
      min: 1,
      max: MAX_SEARCH_LIMIT,
    });

    const results = await getNearbyPosts({
      lat: latValue,
      lng: lngValue,
      radius: radiusValue,
      categoryId: categoryId || null,
      subcategoryId: subcategoryId || null,
      limit: limitValue,
    });
    const enrichedResults = await attachTrustToPosts(results || []);

    res.json({
      success: true,
      posts: enrichedResults,
      count: results.length,
      location: { lat: latValue, lng: lngValue, radius: radiusValue },
    });
  } catch (error) {
    logger.error("[Posts] nearby-v2 error:", error);
    res
      .status(500)
      .json({ error: "Nearby search failed" });
  }
});

/**
 * GET /trust/:userId
 * Retrieve the trust score for a given user.
 */
router.get("/trust/:userId", postController.getUserTrustScore);

/**
 * GET /for-you
 * Retrieve guaranteed-reach posts for the authenticated (or anonymous) user.
 */
router.get("/for-you", optionalAuth, postController.getGuaranteedReachPosts);

/**
 * GET /sponsored
 * Retrieve sponsored/boosted posts visible to the current user.
 */
router.get("/sponsored", optionalAuth, postBoostController.getSponsoredPosts);

/**
 * GET /cache-stats
 * Admin-only endpoint returning post cache statistics.
 */
router.get(
  "/cache-stats",
  protect,
  requireAdminRead,
  postController.getCacheStats
);

/**
 * GET /
 * Retrieve all posts (public, alias of /all).
 */
router.get("/", postController.getAllPosts);

const optimizeLocalImages = require("../middleware/imageOptimizer");

/**
 * POST /
 * Create a new post with image upload, validation, and coin reward.
 */
router.post(
  "/",
  protect,
  upload.fields([{ name: "images", maxCount: 10 }]),
  optimizeLocalImages,
  postValidation.create,
  validate,
  awardCoinOnPostCreate,
  postController.createPost
);

/**
 * POST /create
 * Create a new post (alias of POST /).
 */
router.post(
  "/create",
  protect,
  upload.fields([{ name: "images", maxCount: 10 }]),
  optimizeLocalImages,
  postValidation.create,
  validate,
  awardCoinOnPostCreate,
  postController.createPost
);

/**
 * GET /undone
 * Retrieve posts with status 'undone' for the authenticated user.
 * Admins may pass ?userId= to fetch another user's undone posts.
 */
router.get("/undone", protect, async (req, res) => {
  try {
    const requesterId = getAuthUserId(req);
    if (!requesterId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const categoryIdRaw = req.query.category || req.query.category_id || req.query.categoryId || null;
    const categoryId = categoryIdRaw ? String(categoryIdRaw).trim() : null;
    const requestedUserId = req.query.userId
      ? String(req.query.userId).trim()
      : null;
    let targetUserId = String(requesterId);

    if (requestedUserId && requestedUserId !== targetUserId) {
      if (!isAdmin(req)) {
        return res.status(403).json({
          error: "Not authorized to fetch other users' undone posts",
        });
      }
      targetUserId = requestedUserId;
    }

    const params = [targetUserId];
    let categoryClause = "";
    if (categoryId) {
      params.push(categoryId);
      categoryClause = ` AND category_id::text = $${params.length}`;
    }

    const result = await runQuery(
      `SELECT
        p.post_id,
        p.user_id,
        p.title,
        p.description,
        p.category_id,
        p.subcategory_id,
        c.name AS category_name,
        sc.name AS subcategory_name,
        p.post_type,
        p.condition,
        p.price,
        p.status,
        p.images,
        p.location,
        p.created_at,
        p.updated_at,
        tx.transaction_id AS last_transaction_id,
        tx.status AS last_transaction_status,
        tx.created_at AS last_transaction_created_at,
        tx.completed_at AS last_transaction_completed_at,
        buyer.user_id AS buyer_id,
        COALESCE(bp.full_name, buyer.username) AS buyer_name
      FROM posts p
      LEFT JOIN categories c ON p.category_id = c.category_id
      LEFT JOIN subcategories sc ON p.subcategory_id = sc.subcategory_id
      LEFT JOIN LATERAL (
        SELECT transaction_id, buyer_id, status, created_at, completed_at
        FROM transactions
        WHERE post_id::text = p.post_id::text
        ORDER BY created_at DESC
        LIMIT 1
      ) tx ON true
      LEFT JOIN users buyer ON tx.buyer_id::text = buyer.user_id::text
      LEFT JOIN profiles bp ON tx.buyer_id::text = bp.user_id::text
      WHERE p.status = 'undone'
        AND p.user_id::text = $1${categoryClause}
      ORDER BY COALESCE(p.updated_at, p.created_at) DESC
      LIMIT 200`,
      params
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch undone sales" });
  }
});

/**
 * POST /batch-view
 * Enqueue a batch of post-view increments for deferred processing.
 * @body {string[]} postIds - Array of post IDs to record views for
 */
router.post("/batch-view", async (req, res) => {
  try {
    const outcome = await postViewBufferService.enqueueBatchView(
      req.body?.postIds
    );
    res.json({
      success: true,
      mode: outcome.mode,
      queued: outcome.queued,
      skipped: outcome.skipped,
      updated: outcome.updated,
      flushScheduled: outcome.flushScheduled,
    });
  } catch (err) {
    logger.error("Batch view error:", err);
    res.json({ success: false, error: "Batch update failed" });
  }
});

/**
 * GET /batch-view/stats
 * Admin-only endpoint returning the current view-buffer queue stats.
 */
router.get(
  "/batch-view/stats",
  protect,
  requireAdminRead,
  (req, res) => {
    res.json({ success: true, ...postViewBufferService.getQueueStats() });
  }
);

/**
 * POST /:postId/view
 * Increment the view count for a single post.
 */
router.post("/:postId/view", async (req, res) => {
  const { postId } = req.params;
  try {
    const result = await runQuery(
      `UPDATE posts SET views = COALESCE(views, 0) + 1
      WHERE post_id = $1 RETURNING views`,
      [postId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Post not found" });
    }
    res.json({ success: true, views: result.rows[0].views });
  } catch (err) {
    logger.error("View increment error:", err);
    res.status(500).json({ error: "Failed to record view" });
  }
});

/**
 * POST /:postId/share
 * Increment the share count for a post (best-effort, never fails to client).
 */
router.post("/:postId/share", async (req, res) => {
  const { postId } = req.params;
  try {
    await runQuery(
      `UPDATE posts SET shares = COALESCE(shares, 0) + 1
      WHERE post_id = $1`,
      [postId]
    );
    res.json({ success: true });
  } catch (err) {
    logger.error("Share tracking error:", err);
    res.json({ success: true, warning: "Share not tracked" });
  }
});

/**
 * POST /:postId/like
 * Toggle a like on a post for the authenticated user.
 * Uses the post_likes table when available; falls back to direct increment.
 */
router.post("/:postId/like", protect, async (req, res) => {
  const { postId } = req.params;
  const userId = req.user?.userId || req.user?.id;

  if (!userId) {
    return res
      .status(401)
      .json({ error: "Authentication required to like posts" });
  }

  try {
    try {
      const existingLike = await runQuery(
        "SELECT 1 FROM post_likes WHERE user_id = $1 AND post_id = $2 LIMIT 1",
        [userId, postId]
      );

      if (existingLike.rows.length > 0) {
        await runQuery(
          "DELETE FROM post_likes WHERE user_id = $1 AND post_id = $2",
          [userId, postId]
        );
        await runQuery(
          "UPDATE posts SET likes = GREATEST(COALESCE(likes, 0) - 1, 0) WHERE post_id = $1",
          [postId]
        );
        return res.json({ liked: false, message: "Post unliked" });
      } else {
        await runQuery(
          "INSERT INTO post_likes (user_id, post_id) VALUES ($1, $2)",
          [userId, postId]
        );
        await runQuery(
          "UPDATE posts SET likes = COALESCE(likes, 0) + 1 WHERE post_id = $1",
          [postId]
        );
        return res.json({ liked: true, message: "Post liked" });
      }
    } catch (tableErr) {
      logger.info("post_likes table not found, incrementing likes directly");
      const result = await runQuery(
        "UPDATE posts SET likes = COALESCE(likes, 0) + 1 WHERE post_id = $1 RETURNING likes",
        [postId]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Post not found" });
      }
      return res.json({
        liked: true,
        likes: result.rows[0].likes,
        message: "Post liked",
      });
    }
  } catch (err) {
    logger.error("Like toggle error:", err);
    res.status(500).json({ error: "Failed to toggle like" });
  }
});

/**
 * POST /:postId/sold
 * Mark a post as sold and award coins to the seller.
 */
router.post(
  "/:postId/sold",
  protect,
  awardCoinOnSale,
  postController.markAsSold
);

/**
 * POST /:postId/reactivate
 * Reactivate a previously sold or deactivated post.
 */
router.post("/:postId/reactivate", protect, postController.reactivatePost);

/**
 * PATCH /:postId/status
 * Update a post's status. Supports transitions to 'active' and 'sold'.
 */
router.patch("/:postId/status", protect, (req, res) => {
  const desiredStatus = String(req.body?.status || "").toLowerCase();
  if (desiredStatus === "active") {
    return postController.reactivatePost(req, res);
  }
  if (desiredStatus === "sold") {
    return postController.markAsSold(req, res);
  }
  return res
    .status(400)
    .json({ error: "Unsupported status transition", allowed: ["active", "sold"] });
});

/**
 * POST /:postId/boost
 * Boost a post for increased visibility.
 */
router.post("/:postId/boost", protect, postBoostController.boostPost);

/**
 * GET /:postId/boost-status
 * Retrieve the current boost status for a post.
 */
router.get(
  "/:postId/boost-status",
  optionalAuth,
  postBoostController.getBoostStatus
);

/**
 * GET /:postId/premium-recommendations
 * Retrieve premium recommendation options for a post.
 */
router.get(
  "/:postId/premium-recommendations",
  optionalAuth,
  postBoostController.getPremiumRecommendations
);

/**
 * GET /:postId
 * Retrieve a single post by its ID.
 */
router.get("/:postId", postController.getPostById);

/**
 * DELETE /:postId
 * Delete a post. Only the post owner may delete their own post.
 */
router.delete("/:postId", protect, async (req, res) => {
  const { postId } = req.params;
  const userId = req.user?.userId || req.user?.id;

  logger.info(
    "[DELETE] Attempting delete - postId:",
    postId,
    "userId from token:",
    userId
  );

  if (!userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const ownerCheck = await runQuery(
      "SELECT user_id FROM posts WHERE post_id = $1",
      [postId]
    );
    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: "Post not found" });
    }

    const postOwnerId = ownerCheck.rows[0].user_id;
    if (String(postOwnerId) !== String(userId)) {
      return res.status(403).json({
        error: `Not authorized (owner: ${postOwnerId}, you: ${userId})`,
      });
    }

    await runQuery("DELETE FROM posts WHERE post_id = $1", [postId]);
    res.json({ message: "Post deleted successfully", postId: postId });
  } catch (err) {
    logger.error("Delete post error:", err);
    res.status(500).json({ error: "Failed to delete post" });
  }
});

/**
 * PUT /:postId
 * Update a post's title, description, price, location, or status.
 * Only the post owner may edit their post.
 */
router.put("/:postId", protect, async (req, res) => {
  const { postId } = req.params;
  const userId = req.user?.userId || req.user?.id;
  const {
    title,
    description,
    price,
    location,
    status,
    category_id: rawCategoryId,
    subcategory_id: rawSubcategoryId,
  } = req.body;

  if (!userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const ownerCheck = await runQuery(
      "SELECT user_id, created_at FROM posts WHERE post_id = $1",
      [postId]
    );
    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: "Post not found" });
    }
    if (String(ownerCheck.rows[0].user_id) !== String(userId)) {
      return res
        .status(403)
        .json({ error: "Not authorized to edit this post" });
    }

    const normalizedCategoryId =
      rawCategoryId !== undefined && rawCategoryId !== null && String(rawCategoryId).trim() !== ""
        ? String(rawCategoryId).trim()
        : null;
    let normalizedSubcategoryId =
      rawSubcategoryId !== undefined && rawSubcategoryId !== null && String(rawSubcategoryId).trim() !== ""
        ? String(rawSubcategoryId).trim()
        : null;
    let resolvedCategoryId = normalizedCategoryId;

    if (normalizedSubcategoryId) {
      const subcategoryResult = await runQuery(
        `SELECT category_id FROM subcategories WHERE subcategory_id = $1 AND is_active = TRUE LIMIT 1`,
        [normalizedSubcategoryId]
      );
      if (!subcategoryResult.rows.length) {
        return res.status(400).json({ error: "Invalid subcategory_id" });
      }
      const subCategoryId = subcategoryResult.rows[0].category_id;
      if (
        normalizedCategoryId &&
        String(normalizedCategoryId) !== String(subCategoryId)
      ) {
        return res
          .status(400)
          .json({ error: "subcategory_id does not belong to category_id" });
      }
      resolvedCategoryId = normalizedCategoryId || subCategoryId;
    }

    const result = await runQuery(
      `UPDATE posts SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        price = COALESCE($3, price),
        location = COALESCE($4, location),
        status = COALESCE($5, status),
        category_id = COALESCE($6, category_id),
        subcategory_id = COALESCE($7, subcategory_id),
        updated_at = NOW()
      WHERE post_id = $8
      RETURNING
        post_id,
        user_id,
        title,
        description,
        category_id,
        subcategory_id,
        post_type,
        condition,
        price,
        status,
        images,
        location,
        created_at,
        updated_at`,
      [
        title,
        description,
        price,
        location,
        status,
        resolvedCategoryId,
        normalizedSubcategoryId,
        postId,
      ]
    );

    res.json({ message: "Post updated successfully", post: result.rows[0] });
  } catch (err) {
    logger.error("Update post error:", err);
    res.status(500).json({ error: "Failed to update post" });
  }
});

module.exports = router;

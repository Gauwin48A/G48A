const { runQuery, getAuthUserId } = require("../utils/dbHelpers");
const { parseOptionalString, parsePositiveInt } = require("../utils/parseHelpers");
const logger = require("../utils/logger");

const DEFAULT_WISHLIST_LIMIT = 50;
const MAX_WISHLIST_LIMIT = 200;

/**
 * Enforce user access — returns userId or sends error response.
 * Prevents cross-user wishlist access.
 */
function enforceUserAccess(req, res, { allowQueryOverride = false, allowBodyOverride = false } = {}) {
  const authenticatedUserId = getAuthUserId(req);
  if (!authenticatedUserId) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }

  const requestedQueryUserId = allowQueryOverride
    ? parseOptionalString(req.query?.userId || req.query?.user_id)
    : null;
  const requestedBodyUserId = allowBodyOverride
    ? parseOptionalString(req.body?.userId || req.body?.user_id)
    : null;

  if (
    (requestedQueryUserId && requestedQueryUserId !== authenticatedUserId) ||
    (requestedBodyUserId && requestedBodyUserId !== authenticatedUserId)
  ) {
    res.status(403).json({ error: "Cannot access another user wishlist" });
    return null;
  }

  return authenticatedUserId;
}

/**
 * GET /api/wishlist
 * Returns the user's wishlist items with post details.
 */
exports.getWishlist = async (req, res) => {
  try {
    const userId = enforceUserAccess(req, res, { allowQueryOverride: true });
    if (!userId) return;

    const limit = parsePositiveInt(req.query.limit, DEFAULT_WISHLIST_LIMIT, MAX_WISHLIST_LIMIT);

    const result = await runQuery(
      `SELECT
        w.wishlist_id,
        w.notes,
        w.created_at AS saved_at,
        p.*,
        COALESCE(pr.full_name, u.username) AS seller_name,
        c.name AS category_name
      FROM wishlists w
      JOIN posts p ON w.post_id = p.post_id
      LEFT JOIN users u ON p.user_id = u.user_id
      LEFT JOIN profiles pr ON p.user_id = pr.user_id
      LEFT JOIN categories c ON p.category_id = c.category_id
      WHERE w.user_id = $1
      ORDER BY w.created_at DESC
      LIMIT $2`,
      [String(userId), limit],
    );

    res.json({ items: result.rows, total: result.rows.length });
  } catch (err) {
    logger.error("[Wishlist] Get error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/wishlist
 * Add a post to the user's wishlist. Body: { postId, notes? }
 */
exports.addToWishlist = async (req, res) => {
  try {
    const userId = enforceUserAccess(req, res, { allowBodyOverride: true });
    if (!userId) return;

    const { postId, notes } = req.body;
    const normalizedNotes = parseOptionalString(notes);

    if (!postId) {
      return res.status(400).json({ error: "postId required" });
    }

    const existing = await runQuery(
      "SELECT wishlist_id FROM wishlists WHERE user_id = $1 AND post_id = $2",
      [String(userId), String(postId)],
    );

    if (existing.rows.length > 0) {
      return res.json({ message: "Already in wishlist", wishlist_id: existing.rows[0].wishlist_id });
    }

    const result = await runQuery(
      `INSERT INTO wishlists (user_id, post_id, notes)
       VALUES ($1, $2, $3)
       RETURNING wishlist_id, user_id, post_id, notes, created_at`,
      [String(userId), String(postId), normalizedNotes],
    );

    res.status(201).json({ message: "Added to wishlist", item: result.rows[0] });
  } catch (err) {
    logger.error("[Wishlist] Add error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * DELETE /api/wishlist/:postId
 * Remove a post from the user's wishlist.
 */
exports.removeFromWishlist = async (req, res) => {
  try {
    const userId = enforceUserAccess(req, res, { allowQueryOverride: true, allowBodyOverride: true });
    if (!userId) return;

    const { postId } = req.params;
    if (!postId) {
      return res.status(400).json({ error: "postId required" });
    }

    await runQuery(
      "DELETE FROM wishlists WHERE user_id = $1 AND post_id = $2",
      [String(userId), String(postId)],
    );

    res.json({ message: "Removed from wishlist" });
  } catch (err) {
    logger.error("[Wishlist] Remove error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/wishlist/:postId/check
 * Check if a post is in the user's wishlist.
 */
exports.checkWishlist = async (req, res) => {
  try {
    const userId = enforceUserAccess(req, res, { allowQueryOverride: true, allowBodyOverride: true });
    if (!userId) return;

    const { postId } = req.params;
    if (!postId) {
      return res.status(400).json({ error: "postId required" });
    }

    const result = await runQuery(
      "SELECT wishlist_id FROM wishlists WHERE user_id = $1 AND post_id = $2",
      [String(userId), String(postId)],
    );

    res.json({ inWishlist: result.rows.length > 0 });
  } catch (err) {
    logger.error("[Wishlist] Check error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

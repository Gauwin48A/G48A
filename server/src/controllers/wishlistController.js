const { runQuery, getAuthUserId } = require("../utils/dbHelpers");
const {
  parseOptionalString,
  parsePositiveInt,
  parseNumberOrNull,
} = require("../utils/parseHelpers");
const logger = require("../utils/logger");
const { attachTrustToPosts } = require("../services/trustBadgeService");

const DEFAULT_WISHLIST_LIMIT = 20;
const MAX_WISHLIST_LIMIT = 200;
const DEFAULT_SORT = "saved_desc";

function parseCursor(value) {
  const normalized = parseOptionalString(value);
  if (!normalized) return null;
  const [timestamp, id] = normalized.split("|");
  if (!timestamp || !id) return null;
  const parsedDate = new Date(timestamp);
  if (Number.isNaN(parsedDate.getTime())) return null;
  return { savedAt: parsedDate.toISOString(), id: String(id).trim() };
}

function resolveSort(sort) {
  const normalized = String(sort || DEFAULT_SORT).trim().toLowerCase();
  switch (normalized) {
    case "saved_asc":
    case "oldest":
      return { clause: "w.created_at ASC, w.wishlist_id ASC", cursorDir: "asc" };
    case "price_asc":
      return { clause: "p.price ASC NULLS LAST, w.created_at DESC" };
    case "price_desc":
      return { clause: "p.price DESC NULLS LAST, w.created_at DESC" };
    case "title_asc":
      return { clause: "p.title ASC NULLS LAST, w.created_at DESC" };
    case "title_desc":
      return { clause: "p.title DESC NULLS LAST, w.created_at DESC" };
    case "saved_desc":
    case "newest":
    default:
      return { clause: "w.created_at DESC, w.wishlist_id DESC", cursorDir: "desc" };
  }
}

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
 * Returns the user's wishlist items with post details + pagination.
 */
exports.getWishlist = async (req, res) => {
  try {
    const userId = enforceUserAccess(req, res, { allowQueryOverride: true });
    if (!userId) return;

    const limit = parsePositiveInt(
      req.query.limit,
      DEFAULT_WISHLIST_LIMIT,
      MAX_WISHLIST_LIMIT,
    );
    const search = parseOptionalString(req.query.search || req.query.q);
    const minPrice = parseNumberOrNull(req.query.minPrice || req.query.min_price);
    const maxPrice = parseNumberOrNull(req.query.maxPrice || req.query.max_price);
    const categoryId = parseOptionalString(
      req.query.category_id || req.query.categoryId || req.query.category,
    );
    const subcategoryId = parseOptionalString(
      req.query.subcategory_id || req.query.subcategoryId || req.query.subcategory,
    );
    const status = parseOptionalString(req.query.status);
    const sortConfig = resolveSort(req.query.sort);
    const cursor = parseCursor(req.query.cursor);

    const params = [String(userId)];
    const conditions = ["w.user_id = $1::uuid"];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(
        `(p.title ILIKE $${params.length} OR p.description ILIKE $${params.length} OR COALESCE(pr.full_name, u.username) ILIKE $${params.length})`,
      );
    }
    if (minPrice !== null) {
      params.push(minPrice);
      conditions.push(`p.price >= $${params.length}`);
    }
    if (maxPrice !== null) {
      params.push(maxPrice);
      conditions.push(`p.price <= $${params.length}`);
    }
    if (categoryId) {
      params.push(categoryId);
      conditions.push(`p.category_id::text = $${params.length}`);
    }
    if (subcategoryId) {
      params.push(subcategoryId);
      conditions.push(`p.subcategory_id::text = $${params.length}`);
    }
    if (status) {
      params.push(status);
      conditions.push(`COALESCE(to_jsonb(p)->>'status','') = $${params.length}`);
    }

    if (cursor && sortConfig.cursorDir) {
      params.push(cursor.savedAt);
      params.push(cursor.id);
      const dateParam = params.length - 1;
      const idParam = params.length;
      const operator = sortConfig.cursorDir === "asc" ? ">" : "<";
      conditions.push(
        `(w.created_at ${operator} $${dateParam} OR (w.created_at = $${dateParam} AND w.wishlist_id::text ${operator} $${idParam}))`,
      );
    }

    const result = await runQuery(
      `SELECT
        COUNT(*) OVER()::int AS total_count,
        w.wishlist_id,
        w.notes,
        w.created_at AS saved_at,
        p.*,
        COALESCE(
          NULLIF(to_jsonb(pr)->>'full_name', ''),
          NULLIF(to_jsonb(u)->>'name', ''),
          NULLIF(to_jsonb(u)->>'username', ''),
          NULLIF(to_jsonb(pr)->>'name', '')
        ) AS seller_name,
        COALESCE(
          NULLIF(to_jsonb(pr)->>'avatar_url', ''),
          NULLIF(to_jsonb(pr)->>'profile_pic', '')
        ) AS seller_avatar,
        COALESCE(
          CASE
            WHEN LOWER(
              COALESCE(
                NULLIF(to_jsonb(pr)->>'verified', ''),
                NULLIF(to_jsonb(pr)->>'is_verified', '')
              )
            ) IN ('true', 't', '1', 'yes') THEN true
            WHEN LOWER(
              COALESCE(
                NULLIF(to_jsonb(pr)->>'verified', ''),
                NULLIF(to_jsonb(pr)->>'is_verified', '')
              )
            ) IN ('false', 'f', '0', 'no') THEN false
            ELSE NULL
          END,
          false
        ) AS seller_profile_verified,
        COALESCE(
          CASE
            WHEN LOWER(
              COALESCE(
                NULLIF(to_jsonb(u)->>'isAadhaarVerified', ''),
                NULLIF(to_jsonb(u)->>'aadhaar_verified', ''),
                NULLIF(to_jsonb(u)->>'kyc_verified', '')
              )
            ) IN ('true', 't', '1', 'yes') THEN true
            WHEN LOWER(
              COALESCE(
                NULLIF(to_jsonb(u)->>'isAadhaarVerified', ''),
                NULLIF(to_jsonb(u)->>'aadhaar_verified', ''),
                NULLIF(to_jsonb(u)->>'kyc_verified', '')
              )
            ) IN ('false', 'f', '0', 'no') THEN false
            ELSE NULL
          END,
          false
        ) AS seller_verified,
        COALESCE(NULLIF(to_jsonb(u)->>'rating', '')::numeric, 0) AS seller_rating,
        COALESCE(NULLIF(to_jsonb(u)->>'rating_count', '')::int, 0) AS seller_rating_count,
        p.subcategory_id,
        c.name AS category_name,
        sc.name AS subcategory_name
      FROM wishlists w
      JOIN posts p ON w.post_id = p.post_id
      LEFT JOIN users u ON p.user_id = u.user_id
      LEFT JOIN profiles pr ON p.user_id::text = pr.user_id
      LEFT JOIN categories c ON p.category_id = c.category_id
      LEFT JOIN subcategories sc ON p.subcategory_id = sc.subcategory_id
      WHERE ${conditions.join(" AND ")}
      ORDER BY ${sortConfig.clause}
      LIMIT $${params.length + 1}`,
      [...params, limit + 1],
    );

    const rows = result.rows || [];
    const hasMore = rows.length > limit;
    const sliced = hasMore ? rows.slice(0, limit) : rows;
    const enrichedItems = await attachTrustToPosts(sliced);
    const last = enrichedItems[enrichedItems.length - 1];
    const nextCursor =
      last?.saved_at && last?.wishlist_id
        ? `${new Date(last.saved_at).toISOString()}|${last.wishlist_id}`
        : null;
    const total = sliced.length
      ? Number(sliced[0]?.total_count || 0)
      : 0;

    res.json({
      items: enrichedItems,
      total,
      nextCursor,
      hasMore,
      limit,
    });
  } catch (err) {
    logger.error("[Wishlist] Get error:", err.message);
    res.status(500).json({ error: "Internal server error" });
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
      "SELECT wishlist_id FROM wishlists WHERE user_id = $1::uuid AND post_id = $2::uuid",
      [String(userId), String(postId)],
    );

    if (existing.rows.length > 0) {
      return res.json({ message: "Already in wishlist", wishlist_id: existing.rows[0].wishlist_id });
    }

    const result = await runQuery(
      `INSERT INTO wishlists (user_id, post_id, notes)
       VALUES ($1::uuid, $2::uuid, $3)
       RETURNING wishlist_id, user_id, post_id, notes, created_at`,
      [String(userId), String(postId), normalizedNotes],
    );

    res.status(201).json({ message: "Added to wishlist", item: result.rows[0] });
  } catch (err) {
    logger.error("[Wishlist] Add error:", err.message);
    res.status(500).json({ error: "Internal server error" });
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
      "DELETE FROM wishlists WHERE user_id = $1::uuid AND post_id = $2::uuid",
      [String(userId), String(postId)],
    );

    res.json({ message: "Removed from wishlist" });
  } catch (err) {
    logger.error("[Wishlist] Remove error:", err.message);
    res.status(500).json({ error: "Internal server error" });
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
      "SELECT wishlist_id FROM wishlists WHERE user_id = $1::uuid AND post_id = $2::uuid",
      [String(userId), String(postId)],
    );

    res.json({ inWishlist: result.rows.length > 0 });
  } catch (err) {
    logger.error("[Wishlist] Check error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

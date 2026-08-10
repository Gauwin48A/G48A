/**
 * Reviews Controller
 *
 * Handles CRUD operations for user reviews, helpful votes,
 * flagging/moderation, and seller responses.
 */

const pool = require("../config/db");
const { runQuery, getAuthUserId } = require("../utils/dbHelpers");
const {
  parseOptionalString,
  parsePositiveInt,
  parseRating,
  parseBoolean,
} = require("../utils/parseHelpers");
const cacheService = require("../services/cacheService");
const logger = require("../utils/logger");
const { triggerRatingRecalculation } = require("../services/ratingService");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const REVIEWS_CACHE_TTL_SECONDS = 30;

const REVIEW_UPDATE_COOLDOWN_MINUTES =
  Number.parseInt(process.env.REVIEW_UPDATE_COOLDOWN_MINUTES, 10) || 30;
const MAX_REVIEWS_PER_DAY =
  Number.parseInt(process.env.REVIEW_MAX_PER_DAY, 10) || 20;
const REVIEW_AUTO_HIDE_FLAG_THRESHOLD =
  Number.parseInt(process.env.REVIEW_AUTO_HIDE_FLAG_THRESHOLD, 10) || 3;

// ---------------------------------------------------------------------------
// Schema migration (cached promise -- runs at most once per process)
// ---------------------------------------------------------------------------

let _moderationSchemaPromise = null;

/**
 * Ensure all moderation-related columns and tables exist.
 * Uses a cached promise so DDL statements run at most once per process.
 */
function ensureReviewsModerationSchema() {
  if (!_moderationSchemaPromise) {
    _moderationSchemaPromise = (async () => {
      await runQuery(`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS seller_response TEXT`);
      await runQuery(`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS seller_response_at TIMESTAMPTZ`);
      await runQuery(`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false`);
      await runQuery(`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS hidden_reason TEXT`);
      await runQuery(`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS hidden_by TEXT`);
      await runQuery(`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMPTZ`);
      await runQuery(`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS flag_count INTEGER DEFAULT 0`);
      await runQuery(`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS abuse_score INTEGER DEFAULT 0`);

      // Enhanced rating fields: review_type + category ratings
      await runQuery(`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS review_type VARCHAR(20) DEFAULT 'seller'`);
      await runQuery(`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS communication_rating SMALLINT`);
      await runQuery(`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS quality_rating SMALLINT`);
      await runQuery(`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS value_rating SMALLINT`);
      await runQuery(`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS shipping_rating SMALLINT`);
      await runQuery(`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS sale_id TEXT`);
      await runQuery(`CREATE INDEX IF NOT EXISTS idx_reviews_sale_id ON reviews(sale_id)`);
      await runQuery(`CREATE INDEX IF NOT EXISTS idx_reviews_review_type ON reviews(review_type)`);

      await runQuery(`
        CREATE TABLE IF NOT EXISTS review_helpful_votes (
          vote_id    BIGSERIAL PRIMARY KEY,
          review_id  TEXT NOT NULL,
          voter_id   TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE (review_id, voter_id)
        )
      `);
      await runQuery(
        `CREATE INDEX IF NOT EXISTS idx_review_helpful_votes_review
           ON review_helpful_votes(review_id, created_at DESC)`
      );

      await runQuery(`
        CREATE TABLE IF NOT EXISTS review_flags (
          flag_id     BIGSERIAL PRIMARY KEY,
          review_id   TEXT NOT NULL,
          reporter_id TEXT NOT NULL,
          reason      TEXT,
          status      VARCHAR(24) NOT NULL DEFAULT 'open',
          created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          reviewed_at TIMESTAMPTZ,
          reviewed_by TEXT,
          UNIQUE (review_id, reporter_id)
        )
      `);
      await runQuery(
        `CREATE INDEX IF NOT EXISTS idx_review_flags_review_status
           ON review_flags(review_id, status, created_at DESC)`
      );
    })().catch((err) => {
      logger.warn("[Reviews] Moderation schema check failed", { message: err.message });
      return false;
    });
  }
  return _moderationSchemaPromise;
}

// ---------------------------------------------------------------------------
// updated_at column detection (cached promise)
// ---------------------------------------------------------------------------

let _updatedAtAvailablePromise = null;
let _updatedAtMissingLogged = false;

/**
 * Check (once) whether `reviews.updated_at` exists. Falls back to
 * `created_at` if the column is absent.
 * @returns {Promise<boolean>}
 */
function hasReviewsUpdatedAtColumn() {
  if (!_updatedAtAvailablePromise) {
    _updatedAtAvailablePromise = runQuery(`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = 'reviews'
          AND column_name  = 'updated_at'
      ) AS available
    `)
      .then((result) => {
        const available = Boolean(result?.rows?.[0]?.available);
        if (!available && !_updatedAtMissingLogged) {
          logger.warn("[Reviews] reviews.updated_at column is missing; falling back to created_at.");
          _updatedAtMissingLogged = true;
        }
        return available;
      })
      .catch((error) => {
        logger.warn("[Reviews] Failed to inspect updated_at column; using created_at fallback.", {
          message: error.message,
        });
        return false;
      });
  }
  return _updatedAtAvailablePromise;
}

// ---------------------------------------------------------------------------
// Internal helpers (not duplicated in shared utils)
// ---------------------------------------------------------------------------

/**
 * Compare two IDs as strings (null-safe).
 * @param {*} left
 * @param {*} right
 * @returns {boolean}
 */
function idsEqual(left, right) {
  if (!left || !right) return false;
  return String(left) === String(right);
}

/**
 * Get the requester's role in lowercase.
 * @param {import("express").Request} req
 * @returns {string}
 */
function getRequesterRole(req) {
  return String(req.user?.role || "").toLowerCase();
}

/**
 * Check if the requester can moderate reviews (admin / superadmin / moderator).
 * @param {import("express").Request} req
 * @returns {boolean}
 */
function canModerateReviews(req) {
  const role = getRequesterRole(req);
  return role === "admin" || role === "superadmin" || role === "moderator";
}

/**
 * Build a per-user, paginated cache key for reviews.
 * @param {string} userId
 * @param {number} page
 * @param {number} limit
 * @returns {string}
 */
function buildReviewsCacheKey(userId, page, limit) {
  return `reviews:${userId}:page:${page}:limit:${limit}`;
}

/**
 * Invalidate all cached review pages for a given user.
 * @param {string|null} userId
 */
function invalidateReviewsCache(userId) {
  if (!userId) return;
  cacheService.clearPattern(`reviews:${userId}:*`);
}

/**
 * Return the SQL snippet to SELECT the updated_at value, falling back to
 * created_at when the column is absent.
 * @param {boolean} hasUpdatedAtColumn
 * @param {string}  [tableAlias=""]
 * @returns {string}
 */
function getReviewUpdatedAtSelectClause(hasUpdatedAtColumn, tableAlias = "") {
  const prefix = tableAlias ? `${tableAlias}.` : "";
  return hasUpdatedAtColumn
    ? `${prefix}updated_at`
    : `${prefix}created_at AS updated_at`;
}

/**
 * Return the SQL snippet to SET updated_at = NOW() when the column exists.
 * @param {boolean} hasUpdatedAtColumn
 * @returns {string}
 */
function getReviewUpdatedAtSetClause(hasUpdatedAtColumn) {
  return hasUpdatedAtColumn ? ",\n                    updated_at = NOW()" : "";
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

/**
 * GET /api/reviews/:userId
 * Fetch paginated reviews for a user, with stats and distribution.
 */
const getReviewsForUser = async (req, res) => {
  try {
    await ensureReviewsModerationSchema();

    const userId = parseOptionalString(req.params.userId);
    const page = parsePositiveInt(req.query.page, DEFAULT_PAGE);
    const limit = parsePositiveInt(req.query.limit, DEFAULT_LIMIT, MAX_LIMIT);
    const offset = (page - 1) * limit;
    const includeHidden =
      parseBoolean(req.query.include_hidden, false) && canModerateReviews(req);

    const hiddenFilterSql = includeHidden
      ? ""
      : "AND COALESCE(r.is_hidden, false) = false";

    if (!userId) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const cacheKey = buildReviewsCacheKey(userId, page, limit);

    const payload = await cacheService.getOrSetWithStampedeProtection(
      cacheKey,
      async () => {
        const [reviewsResult, statsResult] = await Promise.all([
          runQuery(
            `
            SELECT
              r.*,
              u.username       AS reviewer_name,
              p.full_name      AS reviewer_full_name,
              p.avatar_url     AS reviewer_avatar
            FROM reviews r
            JOIN users u    ON u.user_id::text = r.reviewer_id::text
            LEFT JOIN profiles p ON p.user_id::text = r.reviewer_id::text
            WHERE r.reviewee_id::text = $1
              ${hiddenFilterSql}
            ORDER BY r.created_at DESC
            LIMIT $2 OFFSET $3
            `,
            [userId, limit, offset]
          ),
          runQuery(
            `
            SELECT
              COUNT(*)::int                              AS total_reviews,
              COALESCE(AVG(rating), 0)                   AS average_rating,
              COUNT(CASE WHEN rating = 5 THEN 1 END)::int AS five_star,
              COUNT(CASE WHEN rating = 4 THEN 1 END)::int AS four_star,
              COUNT(CASE WHEN rating = 3 THEN 1 END)::int AS three_star,
              COUNT(CASE WHEN rating = 2 THEN 1 END)::int AS two_star,
              COUNT(CASE WHEN rating = 1 THEN 1 END)::int AS one_star
            FROM reviews
            WHERE reviewee_id::text = $1
              ${includeHidden ? "" : "AND COALESCE(is_hidden, false) = false"}
            `,
            [userId]
          ),
        ]);

        const stats = statsResult.rows[0];
        const totalReviews = stats?.total_reviews || 0;
        const averageRating = Number(stats?.average_rating || 0).toFixed(1);

        return {
          reviews: reviewsResult.rows,
          stats: {
            totalReviews,
            averageRating,
            distribution: {
              5: stats?.five_star || 0,
              4: stats?.four_star || 0,
              3: stats?.three_star || 0,
              2: stats?.two_star || 0,
              1: stats?.one_star || 0,
            },
          },
          pagination: { page, limit, total: totalReviews },
        };
      },
      REVIEWS_CACHE_TTL_SECONDS
    );

    return res.json(payload);
  } catch (error) {
    logger.error("Error fetching reviews:", error);
    return res.status(500).json({ error: "Failed to fetch reviews" });
  }
};

/**
 * POST /api/reviews
 * Create or update (upsert) a review. Enforces daily limits and cooldowns.
 */
const createReview = async (req, res) => {
  try {
    await ensureReviewsModerationSchema();
    const hasReviewsUpdatedAt = await hasReviewsUpdatedAtColumn();

    const revieweeId = parseOptionalString(req.body.revieweeId || req.body.reviewee_id);
    const postId = parseOptionalString(req.body.postId || req.body.post_id);
    const rating = parseRating(req.body.rating);
    const title = parseOptionalString(req.body.title);
    const comment = parseOptionalString(req.body.comment);
    const reviewerId = getAuthUserId(req);
    const reviewType = ["seller", "buyer"].includes(String(req.body.review_type || req.body.reviewType || "").toLowerCase())
      ? String(req.body.review_type || req.body.reviewType).toLowerCase()
      : "seller";
    const communicationRating = parseRating(req.body.communication_rating || req.body.communicationRating);
    const qualityRating = parseRating(req.body.quality_rating || req.body.qualityRating);
    const valueRating = parseRating(req.body.value_rating || req.body.valueRating);
    const shippingRating = parseRating(req.body.shipping_rating || req.body.shippingRating);

    if (!reviewerId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (!revieweeId || rating === null) {
      return res.status(400).json({ error: "Reviewee ID and rating are required" });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating must be between 1 and 5" });
    }
    if (idsEqual(reviewerId, revieweeId)) {
      return res.status(400).json({ error: "You cannot review yourself" });
    }

    // Daily rate limit
    const dailyUsageResult = await runQuery(
      `
      SELECT COUNT(*)::int AS review_count
      FROM reviews
      WHERE reviewer_id::text = $1
        AND created_at > NOW() - INTERVAL '24 hours'
      `,
      [reviewerId]
    );

    if ((dailyUsageResult.rows[0]?.review_count || 0) >= MAX_REVIEWS_PER_DAY) {
      return res.status(429).json({
        error: "Daily review limit reached. Please try again tomorrow.",
        retryAfterHours: 24,
      });
    }

    // Cooldown check for existing review
    const existingReviewResult = await runQuery(
      `
      SELECT review_id, ${getReviewUpdatedAtSelectClause(hasReviewsUpdatedAt)}
      FROM reviews
      WHERE reviewer_id::text = $1
        AND reviewee_id::text = $2
        AND (
              (post_id::text = $3)
              OR (post_id IS NULL AND $3 IS NULL)
            )
      LIMIT 1
      `,
      [reviewerId, revieweeId, postId]
    );

    if (existingReviewResult.rows.length > 0) {
      const updatedAt = existingReviewResult.rows[0].updated_at
        ? new Date(existingReviewResult.rows[0].updated_at).getTime()
        : 0;
      const cooldownMs = REVIEW_UPDATE_COOLDOWN_MINUTES * 60 * 1e3;

      if (updatedAt && Date.now() - updatedAt < cooldownMs) {
        const retryAfterMinutes = Math.ceil(
          (cooldownMs - (Date.now() - updatedAt)) / (60 * 1e3)
        );
        return res.status(429).json({
          error: `Review update cooldown active. Try again in ${retryAfterMinutes} minute(s).`,
          retryAfterMinutes,
        });
      }
    }

    // Verified purchase check
    let verifiedPurchase = false;
    if (postId) {
      const transactionCheck = await runQuery(
        `
        SELECT 1
        FROM transactions
        WHERE buyer_id::text  = $1
          AND seller_id::text = $2
          AND post_id::text   = $3
          AND status = 'completed'
        LIMIT 1
        `,
        [reviewerId, revieweeId, postId]
      );
      verifiedPurchase = transactionCheck.rows.length > 0;
    }

    // Upsert review
    const result = await runQuery(
      `
      INSERT INTO reviews (reviewer_id, reviewee_id, post_id, rating, title, comment, verified_purchase, review_type, communication_rating, quality_rating, value_rating, shipping_rating)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (reviewer_id, reviewee_id, post_id)
      DO UPDATE SET
        rating                = $4,
        title                 = $5,
        comment               = $6,
        verified_purchase     = $7,
        review_type           = $8,
        communication_rating  = $9,
        quality_rating        = $10,
        value_rating          = $11,
        shipping_rating       = $12${getReviewUpdatedAtSetClause(hasReviewsUpdatedAt)}
      RETURNING
        review_id,
        reviewer_id,
        reviewee_id,
        post_id,
        rating,
        title,
        comment,
        verified_purchase,
        helpful_count,
        seller_response,
        seller_response_at,
        is_hidden,
        hidden_reason,
        hidden_by,
        hidden_at,
        flag_count,
        abuse_score,
        review_type,
        communication_rating,
        quality_rating,
        value_rating,
        shipping_rating,
        created_at,
        ${getReviewUpdatedAtSelectClause(hasReviewsUpdatedAt)}
      `,
      [reviewerId, revieweeId, postId, rating, title, comment, verifiedPurchase, reviewType, communicationRating, qualityRating, valueRating, shippingRating]
    );

    invalidateReviewsCache(revieweeId);

    // Fire-and-forget rating recalculation to update users.rating
    triggerRatingRecalculation(revieweeId);

    return res.status(201).json({
      message: "Review submitted successfully",
      review: result.rows[0],
    });
  } catch (error) {
    logger.error("Error creating review:", error);
    return res.status(500).json({ error: "Failed to submit review" });
  }
};

/**
 * POST /api/reviews/:reviewId/helpful
 * Mark a review as helpful (one vote per user).
 */
const markReviewHelpful = async (req, res) => {
  try {
    await ensureReviewsModerationSchema();

    const reviewId = parseOptionalString(req.params.reviewId);
    const voterId = getAuthUserId(req);

    if (!voterId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (!reviewId) {
      return res.status(400).json({ error: "Invalid review ID" });
    }

    const reviewLookup = await runQuery(
      `
      SELECT review_id, reviewer_id, reviewee_id, helpful_count
      FROM reviews
      WHERE review_id::text = $1
      LIMIT 1
      `,
      [reviewId]
    );

    if (!reviewLookup.rows.length) {
      return res.status(404).json({ error: "Review not found" });
    }

    const review = reviewLookup.rows[0];

    if (idsEqual(voterId, review.reviewer_id)) {
      return res.status(400).json({ error: "You cannot mark your own review as helpful" });
    }

    const voteInsert = await runQuery(
      `
      INSERT INTO review_helpful_votes (review_id, voter_id, created_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (review_id, voter_id) DO NOTHING
      RETURNING vote_id
      `,
      [reviewId, voterId]
    );

    if (!voteInsert.rows.length) {
      return res.status(200).json({
        alreadyVoted: true,
        helpfulCount: review.helpful_count || 0,
      });
    }

    const result = await runQuery(
      `
      UPDATE reviews
      SET helpful_count = COALESCE(helpful_count, 0) + 1
      WHERE review_id::text = $1
      RETURNING helpful_count, reviewee_id
      `,
      [reviewId]
    );

    const revieweeId = result.rows[0]?.reviewee_id;
    invalidateReviewsCache(revieweeId);

    return res.json({ helpfulCount: result.rows[0].helpful_count });
  } catch (error) {
    logger.error("Error updating helpful count:", error);
    return res.status(500).json({ error: "Failed to update" });
  }
};

/**
 * DELETE /api/reviews/:reviewId
 * Delete a review (only the original reviewer may delete).
 */
const deleteReview = async (req, res) => {
  try {
    const reviewId = parseOptionalString(req.params.reviewId);
    const reviewerId = getAuthUserId(req);

    if (!reviewerId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (!reviewId) {
      return res.status(400).json({ error: "Invalid review ID" });
    }

    const result = await runQuery(
      `
      DELETE FROM reviews
      WHERE review_id::text  = $1
        AND reviewer_id::text = $2
      RETURNING review_id, reviewee_id
      `,
      [reviewId, reviewerId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Review not found or not authorized" });
    }

    const deletedRevieweeId = result.rows[0]?.reviewee_id;
    invalidateReviewsCache(deletedRevieweeId);

    return res.json({ message: "Review deleted successfully" });
  } catch (error) {
    logger.error("Error deleting review:", error);
    return res.status(500).json({ error: "Failed to delete review" });
  }
};

/**
 * POST /api/reviews/:reviewId/respond
 * Add or update a seller response to a review.
 */
const respondToReview = async (req, res) => {
  try {
    await ensureReviewsModerationSchema();
    const hasReviewsUpdatedAt = await hasReviewsUpdatedAtColumn();

    const reviewId = parseOptionalString(req.params.reviewId);
    const actorId = getAuthUserId(req);
    const responseText = parseOptionalString(req.body.response || req.body.seller_response);

    if (!actorId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (!reviewId) {
      return res.status(400).json({ error: "Invalid review ID" });
    }
    if (!responseText) {
      return res.status(400).json({ error: "Seller response is required" });
    }
    if (responseText.length > 1e3) {
      return res.status(400).json({ error: "Seller response must be 1000 characters or less" });
    }

    const reviewLookup = await runQuery(
      `
      SELECT review_id, reviewee_id
      FROM reviews
      WHERE review_id::text = $1
      LIMIT 1
      `,
      [reviewId]
    );

    if (!reviewLookup.rows.length) {
      return res.status(404).json({ error: "Review not found" });
    }

    const review = reviewLookup.rows[0];

    if (!idsEqual(actorId, review.reviewee_id) && !canModerateReviews(req)) {
      return res.status(403).json({ error: "Only the reviewed seller can respond to this review" });
    }

    const result = await runQuery(
      `
      UPDATE reviews
      SET seller_response    = $1,
          seller_response_at = NOW()${getReviewUpdatedAtSetClause(hasReviewsUpdatedAt)}
      WHERE review_id::text = $2
      RETURNING
        review_id,
        reviewer_id,
        reviewee_id,
        post_id,
        rating,
        title,
        comment,
        verified_purchase,
        helpful_count,
        seller_response,
        seller_response_at,
        is_hidden,
        hidden_reason,
        hidden_by,
        hidden_at,
        flag_count,
        abuse_score,
        created_at,
        ${getReviewUpdatedAtSelectClause(hasReviewsUpdatedAt)}
      `,
      [responseText, reviewId]
    );

    invalidateReviewsCache(review.reviewee_id);

    return res.json({
      message: "Seller response submitted",
      review: result.rows[0],
    });
  } catch (error) {
    logger.error("Error responding to review:", error);
    return res.status(500).json({ error: "Failed to submit seller response" });
  }
};

/**
 * POST /api/reviews/:reviewId/flag
 * Flag a review for moderation. Auto-hides after threshold flags.
 */
const flagReview = async (req, res) => {
  try {
    await ensureReviewsModerationSchema();
    const hasReviewsUpdatedAt = await hasReviewsUpdatedAtColumn();

    const reviewId = parseOptionalString(req.params.reviewId);
    const reporterId = getAuthUserId(req);
    const reason = parseOptionalString(req.body.reason) || "Flagged by user";

    if (!reporterId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (!reviewId) {
      return res.status(400).json({ error: "Invalid review ID" });
    }

    const reviewLookup = await runQuery(
      `
      SELECT review_id, reviewer_id, reviewee_id, flag_count
      FROM reviews
      WHERE review_id::text = $1
      LIMIT 1
      `,
      [reviewId]
    );

    if (!reviewLookup.rows.length) {
      return res.status(404).json({ error: "Review not found" });
    }

    const review = reviewLookup.rows[0];

    if (idsEqual(reporterId, review.reviewer_id)) {
      return res.status(400).json({ error: "You cannot flag your own review" });
    }

    const flagInsert = await runQuery(
      `
      INSERT INTO review_flags (review_id, reporter_id, reason, status, created_at)
      VALUES ($1, $2, $3, 'open', NOW())
      ON CONFLICT (review_id, reporter_id) DO NOTHING
      RETURNING flag_id
      `,
      [reviewId, reporterId, reason]
    );

    if (!flagInsert.rows.length) {
      return res.status(200).json({
        alreadyFlagged: true,
        message: "You have already flagged this review",
      });
    }

    const updatedReview = await runQuery(
      `
      UPDATE reviews
      SET flag_count    = COALESCE(flag_count, 0) + 1,
          abuse_score   = COALESCE(abuse_score, 0) + 1,
          is_hidden     = CASE
                            WHEN COALESCE(flag_count, 0) + 1 >= $2 THEN true
                            ELSE COALESCE(is_hidden, false)
                          END,
          hidden_reason = CASE
                            WHEN COALESCE(flag_count, 0) + 1 >= $2
                              THEN 'Auto-hidden due to multiple abuse flags'
                            ELSE hidden_reason
                          END,
          hidden_by     = CASE
                            WHEN COALESCE(flag_count, 0) + 1 >= $2 THEN 'system'
                            ELSE hidden_by
                          END,
          hidden_at     = CASE
                            WHEN COALESCE(flag_count, 0) + 1 >= $2
                              THEN COALESCE(hidden_at, NOW())
                            ELSE hidden_at
                          END${hasReviewsUpdatedAt ? `,
          updated_at    = NOW()` : ""}
      WHERE review_id::text = $1
      RETURNING review_id, reviewee_id, flag_count, is_hidden, hidden_reason
      `,
      [reviewId, REVIEW_AUTO_HIDE_FLAG_THRESHOLD]
    );

    const revieweeId = updatedReview.rows[0]?.reviewee_id;
    invalidateReviewsCache(revieweeId);

    return res.json({
      success: true,
      message: "Review flagged for moderation",
      moderation: updatedReview.rows[0],
    });
  } catch (error) {
    logger.error("Error flagging review:", error);
    return res.status(500).json({ error: "Failed to flag review" });
  }
};

/**
 * PATCH /api/reviews/:reviewId/moderate
 * Hide or unhide a review (admin / moderator only).
 */
const moderateReviewVisibility = async (req, res) => {
  try {
    await ensureReviewsModerationSchema();
    const hasReviewsUpdatedAt = await hasReviewsUpdatedAtColumn();

    const reviewId = parseOptionalString(req.params.reviewId);
    const moderatorId = getAuthUserId(req);
    const action = String(req.body.action || "").trim().toLowerCase();
    const reason = parseOptionalString(req.body.reason);

    if (!moderatorId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (!canModerateReviews(req)) {
      return res.status(403).json({ error: "Admin or moderator access required" });
    }
    if (!reviewId) {
      return res.status(400).json({ error: "Invalid review ID" });
    }
    if (!["hide", "unhide"].includes(action)) {
      return res.status(400).json({ error: "Action must be hide or unhide" });
    }

    const shouldHide = action === "hide";

    const result = await runQuery(
      `
      UPDATE reviews
      SET is_hidden     = $1,
          hidden_reason = CASE WHEN $1 THEN COALESCE($2, hidden_reason, 'Hidden by moderation') ELSE NULL END,
          hidden_by     = CASE WHEN $1 THEN $3 ELSE NULL END,
          hidden_at     = CASE WHEN $1 THEN NOW() ELSE NULL END${hasReviewsUpdatedAt ? `,
          updated_at    = NOW()` : ""}
      WHERE review_id::text = $4
      RETURNING review_id, reviewee_id, is_hidden, hidden_reason, hidden_by, hidden_at
      `,
      [shouldHide, reason, moderatorId, reviewId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Review not found" });
    }

    invalidateReviewsCache(result.rows[0].reviewee_id);

    return res.json({
      success: true,
      message: shouldHide ? "Review hidden" : "Review made visible",
      moderation: result.rows[0],
    });
  } catch (error) {
    logger.error("Error moderating review visibility:", error);
    return res.status(500).json({ error: "Failed to moderate review" });
  }
};

/**
 * GET /api/reviews/buyer/:userId
 * Fetch paginated buyer reviews for a user (reviews where they are the buyer).
 */
const getBuyerReviews = async (req, res) => {
  try {
    await ensureReviewsModerationSchema();

    const userId = parseOptionalString(req.params.userId);
    const page = parsePositiveInt(req.query.page, DEFAULT_PAGE);
    const limit = parsePositiveInt(req.query.limit, DEFAULT_LIMIT, MAX_LIMIT);
    const offset = (page - 1) * limit;

    if (!userId) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const cacheKey = `buyer-reviews:${userId}:page:${page}:limit:${limit}`;

    const payload = await cacheService.getOrSetWithStampedeProtection(
      cacheKey,
      async () => {
        const [reviewsResult, statsResult] = await Promise.all([
          runQuery(
            `
            SELECT
              r.*,
              u.username       AS reviewer_name,
              p.full_name      AS reviewer_full_name,
              p.avatar_url     AS reviewer_avatar
            FROM reviews r
            JOIN users u    ON u.user_id::text = r.reviewer_id::text
            LEFT JOIN profiles p ON p.user_id::text = r.reviewer_id::text
            WHERE r.reviewee_id::text = $1
              AND COALESCE(r.review_type, 'seller') = 'buyer'
              AND COALESCE(r.is_hidden, false) = false
            ORDER BY r.created_at DESC
            LIMIT $2 OFFSET $3
            `,
            [userId, limit, offset]
          ),
          runQuery(
            `
            SELECT
              COUNT(*)::int                              AS total_reviews,
              COALESCE(AVG(rating), 0)                   AS average_rating,
              COALESCE(AVG(communication_rating), 0)     AS avg_communication,
              COALESCE(AVG(value_rating), 0)             AS avg_value,
              COUNT(CASE WHEN rating = 5 THEN 1 END)::int AS five_star,
              COUNT(CASE WHEN rating = 4 THEN 1 END)::int AS four_star,
              COUNT(CASE WHEN rating = 3 THEN 1 END)::int AS three_star,
              COUNT(CASE WHEN rating = 2 THEN 1 END)::int AS two_star,
              COUNT(CASE WHEN rating = 1 THEN 1 END)::int AS one_star
            FROM reviews
            WHERE reviewee_id::text = $1
              AND COALESCE(review_type, 'seller') = 'buyer'
              AND COALESCE(is_hidden, false) = false
            `,
            [userId]
          ),
        ]);

        const stats = statsResult.rows[0];
        const totalReviews = stats?.total_reviews || 0;

        return {
          reviews: reviewsResult.rows,
          stats: {
            totalReviews,
            averageRating: Number(stats?.average_rating || 0).toFixed(1),
            avgCommunication: Number(stats?.avg_communication || 0).toFixed(1),
            avgValue: Number(stats?.avg_value || 0).toFixed(1),
            distribution: {
              5: stats?.five_star || 0,
              4: stats?.four_star || 0,
              3: stats?.three_star || 0,
              2: stats?.two_star || 0,
              1: stats?.one_star || 0,
            },
          },
          pagination: { page, limit, total: totalReviews },
        };
      },
      REVIEWS_CACHE_TTL_SECONDS
    );

    return res.json(payload);
  } catch (error) {
    logger.error("Error fetching buyer reviews:", error);
    return res.status(500).json({ error: "Failed to fetch buyer reviews" });
  }
};

/**
 * GET /api/reviews/stats/:userId
 * Comprehensive rating stats for a user (both seller + buyer).
 */
const getUserRatingStats = async (req, res) => {
  try {
    await ensureReviewsModerationSchema();

    const userId = parseOptionalString(req.params.userId);
    if (!userId) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const cacheKey = `rating-stats:${userId}`;
    const payload = await cacheService.getOrSetWithStampedeProtection(
      cacheKey,
      async () => {
        const [sellerResult, buyerResult] = await Promise.all([
          runQuery(
            `
            SELECT
              COUNT(*)::int                              AS total,
              COALESCE(AVG(rating), 0)                   AS avg_rating,
              COALESCE(AVG(communication_rating), 0)     AS avg_communication,
              COALESCE(AVG(quality_rating), 0)           AS avg_quality,
              COALESCE(AVG(value_rating), 0)             AS avg_value,
              COALESCE(AVG(shipping_rating), 0)          AS avg_shipping
            FROM reviews
            WHERE reviewee_id::text = $1
              AND COALESCE(review_type, 'seller') = 'seller'
              AND COALESCE(is_hidden, false) = false
            `,
            [userId]
          ),
          runQuery(
            `
            SELECT
              COUNT(*)::int                              AS total,
              COALESCE(AVG(rating), 0)                   AS avg_rating,
              COALESCE(AVG(communication_rating), 0)     AS avg_communication,
              COALESCE(AVG(value_rating), 0)             AS avg_value
            FROM reviews
            WHERE reviewee_id::text = $1
              AND COALESCE(review_type, 'seller') = 'buyer'
              AND COALESCE(is_hidden, false) = false
            `,
            [userId]
          ),
        ]);

        const seller = sellerResult.rows[0] || {};
        const buyer = buyerResult.rows[0] || {};

        return {
          seller: {
            total: seller.total || 0,
            avgRating: Number(seller.avg_rating || 0).toFixed(1),
            avgCommunication: Number(seller.avg_communication || 0).toFixed(1),
            avgQuality: Number(seller.avg_quality || 0).toFixed(1),
            avgValue: Number(seller.avg_value || 0).toFixed(1),
            avgShipping: Number(seller.avg_shipping || 0).toFixed(1),
          },
          buyer: {
            total: buyer.total || 0,
            avgRating: Number(buyer.avg_rating || 0).toFixed(1),
            avgCommunication: Number(buyer.avg_communication || 0).toFixed(1),
            avgValue: Number(buyer.avg_value || 0).toFixed(1),
          },
          overallRating: Number(
            ((Number(seller.avg_rating || 0) + Number(buyer.avg_rating || 0)) /
              (seller.total && buyer.total ? 2 : 1)) || 0
          ).toFixed(1),
        };
      },
      REVIEWS_CACHE_TTL_SECONDS
    );

    return res.json(payload);
  } catch (error) {
    logger.error("Error fetching rating stats:", error);
    return res.status(500).json({ error: "Failed to fetch rating stats" });
  }
};

// ---------------------------------------------------------------------------
// Purchase-specific: POST /api/reviews/purchase
// ---------------------------------------------------------------------------

/**
 * POST /api/reviews/purchase
 * Rate a completed purchase — only the buyer can rate, and only once per sale.
 * Request: { sale_id, rating, comment }
 */
const ratePurchase = async (req, res) => {
  const client = await pool.connect();
  try {
    await ensureReviewsModerationSchema();
    const buyerId = getAuthUserId(req);

    const saleId = parseOptionalString(req.body.sale_id);
    const rating = parseRating(req.body.rating);
    const comment = parseOptionalString(req.body.comment);
    const clientPostId = parseOptionalString(req.body.post_id || req.body.postId);

    if (!buyerId) {
      client.release();
      return res.status(401).json({ error: "Authentication required" });
    }
    if (!saleId || rating === null) {
      client.release();
      return res.status(400).json({ error: "Sale ID and rating are required" });
    }
    if (rating < 1 || rating > 5) {
      client.release();
      return res.status(400).json({ error: "Rating must be between 1 and 5" });
    }

    await client.query("BEGIN");

    // Fetch the sale with row lock to prevent concurrent rating races
    const saleResult = await client.query(
      `
      SELECT sale_id, buyer_id::text AS buyer_id, seller_id::text AS seller_id, post_id::text AS post_id, status
      FROM sales
      WHERE sale_id::text = $1
      LIMIT 1
      FOR UPDATE
      `,
      [saleId]
    );

    if (!saleResult.rows.length) {
      await client.query("ROLLBACK");
      client.release();
      return res.status(404).json({ error: "Sale not found" });
    }

    const sale = saleResult.rows[0];

    // Validate the client-supplied post_id matches the sale's actual post
    if (clientPostId && String(clientPostId) !== String(sale.post_id)) {
      await client.query("ROLLBACK");
      client.release();
      return res.status(400).json({ error: "Post ID does not match the sale record" });
    }

    if (sale.buyer_id !== buyerId) {
      await client.query("ROLLBACK");
      client.release();
      return res.status(403).json({ error: "Only the buyer can rate this purchase" });
    }

    if (sale.status !== "completed" && sale.status !== "amount_received" && sale.status !== "confirmed") {
      await client.query("ROLLBACK");
      client.release();
      return res.status(400).json({ error: "Sale must be completed before rating" });
    }

    // Check for existing review tied to this specific sale_id.
    // This allows the same buyer to rate the same seller+post again
    // if they bought it in a separate sale.
    // Also catches legacy reviews (pre-migration) where sale_id is NULL
    // by falling back to reviewer_id + post_id + reviewee_id match.
    const existingReview = await client.query(
      `
      SELECT review_id
      FROM reviews
      WHERE reviewer_id::text = $1
        AND (
          sale_id::text = $2
          OR (sale_id IS NULL AND post_id::text = $3 AND reviewee_id::text = $4)
        )
      LIMIT 1
      `,
      [buyerId, saleId, sale.post_id, sale.seller_id]
    );

    if (existingReview.rows.length > 0) {
      // Update existing review within the transaction
      const result = await client.query(
        `
        UPDATE reviews
        SET rating = $1,
            comment = $2,
            verified_purchase = true,
            updated_at = NOW()
        WHERE review_id::text = $3
        RETURNING review_id, rating, comment, verified_purchase, created_at, updated_at
        `,
        [rating, comment, existingReview.rows[0].review_id]
      );

      await client.query("COMMIT");
      client.release();

      // Post-commit side effects (cache + rating recalculation)
      invalidateReviewsCache(sale.seller_id);
      triggerRatingRecalculation(sale.seller_id);

      return res.json({
        message: "Rating updated",
        review: result.rows[0],
      });
    }

    // Create new review within the transaction, storing sale_id for dedup
    const result = await client.query(
      `
      INSERT INTO reviews (reviewer_id, reviewee_id, post_id, rating, comment, verified_purchase, review_type, sale_id)
      VALUES ($1, $2, $3, $4, $5, true, 'seller', $6)
      RETURNING review_id, rating, comment, verified_purchase, created_at
      `,
      [buyerId, sale.seller_id, sale.post_id, rating, comment, saleId]
    );

    await client.query("COMMIT");
    client.release();

    // Post-commit side effects
    invalidateReviewsCache(sale.seller_id);
    triggerRatingRecalculation(sale.seller_id);

    return res.status(201).json({
      message: "Purchase rated successfully",
      review: result.rows[0],
    });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (_rollbackErr) {
      // Rollback failed — connection may be in a bad state
    }
    client.release();
    logger.error("Error rating purchase:", error);
    return res.status(500).json({ error: "Failed to rate purchase" });
  }
};

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  getReviewsForUser,
  createReview,
  markReviewHelpful,
  deleteReview,
  respondToReview,
  flagReview,
  moderateReviewVisibility,
  getBuyerReviews,
  getUserRatingStats,
  ratePurchase,
};

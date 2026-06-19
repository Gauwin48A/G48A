/**
 * Rating Service
 *
 * Auto-computes and syncs `users.rating` (seller_rating) from:
 *   - Reviews (average rating from completed transactions)
 *   - Complaints (penalty deduction based on severity/frequency)
 *
 * Also records a `rating_history` audit trail so every rating change
 * is observable with reason, old/new values, and a reference ID.
 */

const { runQuery, pool } = require("../utils/dbHelpers");
const logger = require("../utils/logger");

const COMPLAINT_RATING_PENALTY = {
  low: 0.3,
  medium: 0.5,
  high: 1.0,
  critical: 2.0,
};

const MAX_COMPLAINT_PENALTY = 3.0;
const DEFAULT_RATING = 0;

// ---------------------------------------------------------------------------
// Rating history table auto-creation (cached — runs once per process)
// ---------------------------------------------------------------------------

let _ratingHistorySchemaPromise = null;

/**
 * Ensure the rating_history table exists.
 * Uses a cached promise so DDL runs at most once per process lifetime.
 */
async function ensureRatingHistoryTable() {
  if (!_ratingHistorySchemaPromise) {
    _ratingHistorySchemaPromise = runQuery(`
      CREATE TABLE IF NOT EXISTS rating_history (
        id           BIGSERIAL PRIMARY KEY,
        user_id      TEXT NOT NULL,
        old_rating   NUMERIC(3,2),
        new_rating   NUMERIC(3,2) NOT NULL,
        change_type  VARCHAR(20) NOT NULL DEFAULT 'recompute',
        reference_id TEXT,
        severity     VARCHAR(20),
        reason       TEXT,
        metadata     JSONB DEFAULT '{}'::jsonb,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
      .then(async () => {
        // Ensure indexes exist (idempotent)
        await runQuery(
          `CREATE INDEX IF NOT EXISTS idx_rating_history_user ON rating_history(user_id, created_at DESC)`
        );
        await runQuery(
          `CREATE INDEX IF NOT EXISTS idx_rating_history_type ON rating_history(change_type)`
        );
        return true;
      })
      .catch((err) => {
        logger.warn("[RatingService] Failed to create rating_history table", {
          message: err.message,
        });
        return false;
      });
  }
  return _ratingHistorySchemaPromise;
}

/**
 * Record a single rating change in the history table.
 * Auto-creates the table on first use.
 *
 * @param {object} params
 * @param {string} params.userId
 * @param {number} params.oldRating
 * @param {number} params.newRating
 * @param {'review'|'complaint'|'recompute'} params.changeType
 * @param {string} [params.referenceId]  - e.g. complaint_id or review_id
 * @param {string} [params.severity]     - for complaint changes
 * @param {string} [params.reason]       - human-readable description
 * @param {object} [params.metadata]     - optional JSON payload
 */
async function recordRatingHistory({
  userId,
  oldRating,
  newRating,
  changeType = "recompute",
  referenceId = null,
  severity = null,
  reason = null,
  metadata = {},
}) {
  if (!userId) return;

  try {
    await ensureRatingHistoryTable();
    await runQuery(
      `INSERT INTO rating_history (user_id, old_rating, new_rating, change_type, reference_id, severity, reason, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, NOW())`,
      [
        String(userId),
        oldRating != null ? Number(oldRating.toFixed(2)) : null,
        Number(newRating.toFixed(2)),
        changeType,
        referenceId,
        severity,
        reason || null,
        JSON.stringify(metadata || {}),
      ],
    );
  } catch (err) {
    logger.warn("[RatingService] Failed to record rating history:", err.message);
  }
}

/**
 * Recompute a user's overall rating from reviews and complaints.
 * Rating = max(0, avgReviewRating - totalComplaintPenalty)
 *
 * @param {string} userId
 * @returns {Promise<number>} The new rating value
 */
async function recomputeUserRating(userId) {
  if (!userId) return DEFAULT_RATING;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Get current rating before update
    const currentRatingResult = await client.query(
      `SELECT rating FROM users WHERE user_id = $1 FOR UPDATE`,
      [String(userId)],
    );
    const oldRating = Number(currentRatingResult.rows[0]?.rating || 0);

    // 2. Compute average review rating (0-5 scale)
    const reviewResult = await client.query(
      `SELECT
         COALESCE(AVG(rating), 0) AS avg_rating,
         COUNT(*)::int AS review_count
       FROM reviews
       WHERE reviewee_id::text = $1
         AND COALESCE(is_hidden, false) = false
         AND COALESCE(review_type, 'seller') = 'seller'`,
      [String(userId)],
    );

    const avgReviewRating = Number(reviewResult.rows[0]?.avg_rating || 0);
    const reviewCount = Number(reviewResult.rows[0]?.review_count || 0);

    // 3. Compute complaint penalty
    const complaintResult = await client.query(
      `SELECT
         COUNT(*)::int AS total_complaints,
         COUNT(*) FILTER (WHERE severity = 'critical')::int AS critical_count,
         COUNT(*) FILTER (WHERE severity = 'high')::int AS high_count,
         COUNT(*) FILTER (WHERE severity = 'medium')::int AS medium_count,
         COUNT(*) FILTER (WHERE severity = 'low')::int AS low_count
       FROM complaints
       WHERE seller_id::text = $1
         AND status NOT IN ('rejected', 'closed')`,
      [String(userId)],
    );

    const c = complaintResult.rows[0] || {};
    const totalPenalty = Math.min(
      MAX_COMPLAINT_PENALTY,
      (Number(c.critical_count || 0) * COMPLAINT_RATING_PENALTY.critical) +
        (Number(c.high_count || 0) * COMPLAINT_RATING_PENALTY.high) +
        (Number(c.medium_count || 0) * COMPLAINT_RATING_PENALTY.medium) +
        (Number(c.low_count || 0) * COMPLAINT_RATING_PENALTY.low),
    );

    // 4. Compute final rating
    const newRating = Math.max(0, Math.min(5, avgReviewRating - totalPenalty));
    const finalRating = reviewCount > 0 ? Number(newRating.toFixed(2)) : DEFAULT_RATING;

    // 5. Update users table
    await client.query(
      `UPDATE users
       SET rating = $1,
           rating_count = $2,
           updated_at = NOW()
       WHERE user_id = $3`,
      [finalRating, reviewCount, String(userId)],
    );

    await client.query("COMMIT");

    // 6. Record in rating history (fire-and-forget after commit)
    if (Math.abs(finalRating - oldRating) > 0.01) {
      const delta = finalRating - oldRating;
      const reasonParts = [];
      if (reviewCount > 0) {
        reasonParts.push(`avg_review=${avgReviewRating.toFixed(2)}`);
      }
      if (totalPenalty > 0) {
        reasonParts.push(`complaint_penalty=${totalPenalty.toFixed(2)}`);
      }
      reasonParts.push(`reviews=${reviewCount}`);

      setImmediate(async () => {
        await recordRatingHistory({
          userId,
          oldRating,
          newRating: finalRating,
          changeType: "recompute",
          reason: `Full recompute: ${reasonParts.join(", ")}`,
          metadata: {
            avgReviewRating: Number(avgReviewRating.toFixed(2)),
            totalPenalty: Number(totalPenalty.toFixed(2)),
            reviewCount,
            complaintCount: Number(c.total_complaints || 0),
          },
        });
      });
    }

    logger.info(
      `[RatingService] User ${userId} rating updated: ${oldRating} → ${finalRating} (avg=${avgReviewRating.toFixed(2)}, penalty=${totalPenalty.toFixed(2)})`,
    );

    return finalRating;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    logger.error(`[RatingService] Failed to recompute rating for user ${userId}:`, err.message);
    return DEFAULT_RATING;
  } finally {
    client.release();
  }
}

/**
 * Apply a complaint penalty and recompute the seller's rating.
 * Called when a new complaint is filed against a seller.
 *
 * @param {string} sellerId
 * @param {string} severity - 'low' | 'medium' | 'high' | 'critical'
 * @param {object} [options]
 * @param {string} [options.complaintId] - reference ID for history
 * @returns {Promise<{ newRating: number, penalty: number }>}
 */
async function applyComplaintRatingPenalty(sellerId, severity, options = {}) {
  if (!sellerId) {
    return { newRating: DEFAULT_RATING, penalty: 0 };
  }

  const severityKey = String(severity || "medium").toLowerCase();
  const penalty = COMPLAINT_RATING_PENALTY[severityKey] || COMPLAINT_RATING_PENALTY.medium;

  // Get current rating before update
  const beforeResult = await runQuery(
    `SELECT rating FROM users WHERE user_id = $1`,
    [String(sellerId)],
  );
  const oldRating = Number(beforeResult.rows[0]?.rating || 0);

  // Directly decrease the rating by the penalty amount
  const result = await runQuery(
    `UPDATE users
     SET rating = GREATEST(0, COALESCE(rating, 0) - $1),
         updated_at = NOW()
     WHERE user_id = $2
     RETURNING rating`,
    [penalty, String(sellerId)],
  );

  const newRating = Number(result.rows[0]?.rating || 0);

  // Record the complaint penalty in rating history
  await recordRatingHistory({
    userId: sellerId,
    oldRating,
    newRating,
    changeType: "complaint",
    referenceId: options.complaintId || null,
    severity: severityKey,
    reason: `Complaint penalty: ${severityKey} (${penalty.toFixed(1)} pts deducted)`,
    metadata: { severity: severityKey, penalty },
  });

  // Then do a full recompute to ensure consistency
  setImmediate(async () => {
    try {
      await recomputeUserRating(sellerId);
    } catch (err) {
      logger.warn("[RatingService] Deferred recompute failed:", err.message);
    }
  });

  logger.info(
    `[RatingService] Complaint penalty applied: seller=${sellerId}, severity=${severityKey}, penalty=${penalty}, ${oldRating} → ${newRating}`,
  );

  return { newRating, penalty };
}

/**
 * Trigger rating recalculation when a review is created/updated.
 * Fire-and-forget to avoid blocking the review response.
 * History is recorded automatically inside recomputeUserRating.
 *
 * @param {string} userId - The reviewee (seller/buyer being rated)
 */
function triggerRatingRecalculation(userId) {
  if (!userId) return;
  setImmediate(async () => {
    try {
      await recomputeUserRating(userId);
    } catch (err) {
      logger.warn("[RatingService] Recalculation failed:", err.message);
    }
  });
}

/**
 * GET /api/ratings/history/:userId
 * Fetch paginated rating history for a user.
 *
 * @param {string} userId
 * @param {object} [opts]
 * @param {number} [opts.page=1]
 * @param {number} [opts.limit=20]
 * @returns {Promise<{ history: object[], pagination: object }>}
 */
async function getRatingHistory(userId, opts = {}) {
  if (!userId) return { history: [], pagination: { page: 1, limit: 20, total: 0 } };

  const page = Math.max(1, Number(opts.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(opts.limit) || 20));
  const offset = (page - 1) * limit;

  try {
    await ensureRatingHistoryTable();

    const result = await runQuery(
      `SELECT
         COUNT(*) OVER()::int AS total_count,
         id, user_id, old_rating, new_rating,
         change_type, reference_id, severity, reason, metadata, created_at
       FROM rating_history
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [String(userId), limit, offset],
    );

    const total = result.rows.length ? Number(result.rows[0].total_count) || 0 : 0;
    const history = result.rows.map(({ total_count, ...row }) => row);

    return { history, pagination: { page, limit, total } };
  } catch (err) {
    logger.warn("[RatingService] Failed to fetch rating history:", err.message);
    return { history: [], pagination: { page, limit, total: 0 } };
  }
}

module.exports = {
  recomputeUserRating,
  applyComplaintRatingPenalty,
  triggerRatingRecalculation,
  getRatingHistory,
  recordRatingHistory,
  COMPLAINT_RATING_PENALTY,
  MAX_COMPLAINT_PENALTY,
};

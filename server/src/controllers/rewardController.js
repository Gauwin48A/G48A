const { pool, runQuery, getAuthUserId, DB_QUERY_TIMEOUT_MS } = require("../utils/dbHelpers");
const { parseOptionalString, parsePositiveInt } = require("../utils/parseHelpers");
const logger = require("../utils/logger");
const {
  applyRewardDeltaInTransaction,
  afterCommitRewardMutation,
  InsufficientPointsError,
  InvalidRewardInputError,
  ensureRewardLogTable,
} = require("../services/rewardsLedgerService");

/* ------------------------------------------------------------------ */
/*  Schema introspection helpers (cached per process lifetime)        */
/* ------------------------------------------------------------------ */

let rewardLogIdColumnAvailablePromise = null;
let usersLegacyIdColumnAvailablePromise = null;

/**
 * Check whether the reward_log table exposes an `id` column.
 * The result is cached after the first successful probe; a failed
 * probe clears the cache so the next call retries.
 * @returns {Promise<boolean>}
 */
async function hasRewardLogIdColumn() {
  if (!rewardLogIdColumnAvailablePromise) {
    rewardLogIdColumnAvailablePromise = runQuery(
      `SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = 'reward_log'
          AND column_name  = 'id'
      ) AS available`
    )
      .then((result) => Boolean(result?.rows?.[0]?.available))
      .catch((err) => {
        rewardLogIdColumnAvailablePromise = null;
        logger.warn(
          "[Rewards] Failed to inspect reward_log.id column, using log_id fallback",
          { message: err.message }
        );
        return false;
      });
  }
  return rewardLogIdColumnAvailablePromise;
}

/**
 * Build the SELECT expression that returns the reward-log primary key
 * as `id`, regardless of the underlying column name.
 * @param {boolean} hasIdColumn - Whether the `id` column exists
 * @param {string}  [tableAlias=""] - Optional table alias prefix
 * @returns {string}
 */
function getRewardLogIdSelectExpression(hasIdColumn, tableAlias = "") {
  const prefix = tableAlias ? `${tableAlias}.` : "";
  return hasIdColumn ? `${prefix}id` : `${prefix}log_id AS id`;
}

/**
 * Check whether the users table exposes a legacy `id` column.
 * The result is cached after the first successful probe; a failed
 * probe clears the cache so the next call retries.
 * @returns {Promise<boolean>}
 */
async function hasUsersLegacyIdColumn() {
  if (!usersLegacyIdColumnAvailablePromise) {
    usersLegacyIdColumnAvailablePromise = runQuery(
      `SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = 'users'
          AND column_name  = 'id'
      ) AS available`
    )
      .then((result) => Boolean(result?.rows?.[0]?.available))
      .catch(() => {
        usersLegacyIdColumnAvailablePromise = null;
        return false;
      });
  }
  return usersLegacyIdColumnAvailablePromise;
}

/**
 * Resolve a raw user identifier to its canonical `user_id` value by
 * looking up the users table. Falls back to the raw value on error.
 * @param {string} rawUserId
 * @returns {Promise<string|null>}
 */
async function resolveCanonicalUserId(rawUserId) {
  const normalizedRawUserId = String(rawUserId || "").trim();
  if (!normalizedRawUserId) return null;

  try {
    const usersHasLegacyId = await hasUsersLegacyIdColumn();
    const lookup = await runQuery(
      usersHasLegacyId
        ? `SELECT user_id::text AS user_id
           FROM users
           WHERE user_id::text = $1 OR id::text = $1
           LIMIT 1`
        : `SELECT user_id::text AS user_id
           FROM users
           WHERE user_id::text = $1
           LIMIT 1`,
      [normalizedRawUserId]
    );
    return lookup.rows[0]?.user_id || normalizedRawUserId;
  } catch (err) {
    logger.warn(
      "[Rewards] Failed to resolve canonical user ID, using raw identifier",
      { message: err.message }
    );
    return normalizedRawUserId;
  }
}

/* ------------------------------------------------------------------ */
/*  Route handlers                                                    */
/* ------------------------------------------------------------------ */

/**
 * GET /rewards — Return the authenticated user's reward summary and
 * the most recent 20 reward-log entries.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
exports.getMyRewards = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  try {
    await ensureRewardLogTable();
    const hasRewardLogId = await hasRewardLogIdColumn();
    const normalizedUserId = await resolveCanonicalUserId(userId);

    const [rewardsRes, logRes] = await Promise.all([
      runQuery(
        "SELECT points, tier FROM rewards WHERE user_id::text = $1",
        [normalizedUserId]
      ),
      runQuery(
        `SELECT ${getRewardLogIdSelectExpression(hasRewardLogId)},
                action, points, description, created_at
         FROM reward_log
         WHERE user_id::text = $1
         ORDER BY created_at DESC
         LIMIT 20`,
        [normalizedUserId]
      ),
    ]);

    const rewards = rewardsRes.rows[0] || { points: 0, tier: "Bronze" };
    const history = logRes.rows;

    res.json({
      points: rewards.points || 0,
      tier: rewards.tier || "Bronze",
      history,
    });
  } catch (err) {
    logger.error("Get rewards error:", err);
    res.status(500).json({ error: "Failed to fetch rewards" });
  }
};

/**
 * POST /rewards/redeem — Redeem reward points for post credits.
 * Points must be a positive multiple of 100. Supports idempotency
 * keys to guard against duplicate redemptions.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
exports.redeemRewards = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  const requestedPoints = parsePositiveInt(req.body?.points, 0);
  if (!requestedPoints) {
    return res.status(400).json({ error: "Valid points amount required" });
  }
  if (requestedPoints % 100 !== 0) {
    return res.status(400).json({ error: "Redemption points must be in multiples of 100" });
  }

  try {
    const normalizedUserId = await resolveCanonicalUserId(userId);
    const credits = Math.floor(requestedPoints / 100);

    const idempotencyKey = parseOptionalString(
      (typeof req.get === "function" ? req.get("x-idempotency-key") : null) ||
        req.body?.idempotencyKey ||
        req.body?.requestId
    );

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const rewardChange = await applyRewardDeltaInTransaction({
        client,
        userId: normalizedUserId,
        pointsDelta: -requestedPoints,
        action: "redemption",
        description: `Points redeemed for ${credits} post credits`,
        idempotencyKey,
      });

      if (rewardChange.applied && credits > 0) {
        await client.query({
          text: "UPDATE users SET post_credits = post_credits + $1 WHERE user_id::text = $2",
          values: [credits, normalizedUserId],
          query_timeout: DB_QUERY_TIMEOUT_MS,
        });
      }

      await client.query("COMMIT");

      if (rewardChange.applied) {
        afterCommitRewardMutation(rewardChange);
      }

      const duplicateMessage = "Redemption request already processed";
      res.json({
        message: rewardChange.duplicate
          ? duplicateMessage
          : `Redeemed ${requestedPoints} points for ${credits} post credits`,
        creditsGranted: credits,
        remainingPoints: rewardChange.pointsAfter,
        duplicate: rewardChange.duplicate,
      });
    } catch (txErr) {
      try {
        await client.query("ROLLBACK");
      } catch {
        /* rollback best-effort */
      }
      throw txErr;
    } finally {
      client.release();
    }
  } catch (err) {
    if (err instanceof InsufficientPointsError) {
      return res.status(400).json({
        error: `Insufficient points. Available: ${err.availablePoints}`,
      });
    }
    if (err instanceof InvalidRewardInputError) {
      return res.status(400).json({ error: "Invalid reward input" });
    }
    logger.error("Redeem error:", err);
    return res.status(500).json({ error: "Failed to redeem rewards" });
  }
};

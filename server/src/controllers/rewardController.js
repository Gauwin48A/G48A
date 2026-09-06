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
    const normalizedUserId = await resolveCanonicalUserId(userId);

    const [userRes, logRes] = await Promise.all([
      runQuery(
        "SELECT coins FROM users WHERE user_id::text = $1",
        [normalizedUserId]
      ),
      runQuery(
        `SELECT id, type AS action, amount AS points, description, created_at
         FROM coin_transactions
         WHERE user_id::text = $1
         ORDER BY created_at DESC
         LIMIT 20`,
        [normalizedUserId]
      ),
    ]);

    const coins = Number(userRes.rows[0]?.coins || 0);
    let tier = "Bronze";
    if (coins >= 5000) tier = "Platinum";
    else if (coins >= 2000) tier = "Gold";
    else if (coins >= 500) tier = "Silver";

    res.json({
      points: coins,
      tier: tier,
      history: logRes.rows,
    });
  } catch (err) {
    logger.error("Get rewards error:", err);
    res.status(500).json({ error: "Failed to fetch rewards" });
  }
};

/**
 * POST /rewards/redeem — Redeems coins (deprecated stub, replaced by coins controller redeems)
 */
exports.redeemRewards = async (req, res) => {
  res.status(400).json({ error: "Points redemption is deprecated. Please spend your coins directly in the Rewards Store." });
};

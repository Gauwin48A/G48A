/**
 * Rewards Ledger Service
 *
 * Manages reward points: apply deltas with idempotency, compute tiers,
 * log mutations, invalidate caches, and publish real-time updates.
 */

const { pool, runQuery, DB_QUERY_TIMEOUT_MS, parseOptionalString } = require("../utils/dbHelpers");
const logger = require("../utils/logger");
const cacheService = require("./cacheService");
const { publishRewardUpdate } = require("./rewardsRealtimeService");

/* ------------------------------------------------------------------ */
/*  Configuration                                                     */
/* ------------------------------------------------------------------ */

const IDEMPOTENCY_KEY_MAX_LENGTH = 120;

const CACHE_PROFILE_KEY = (userId) => `rewards:${userId}:profile`;
const CACHE_LOG_KEY_PATTERN = (userId) => `rewards:${userId}:log:*`;

/* ------------------------------------------------------------------ */
/*  Custom errors                                                     */
/* ------------------------------------------------------------------ */

/**
 * Base error for rewards ledger operations.
 */
class RewardsLedgerError extends Error {
  constructor(message, code = "REWARDS_LEDGER_ERROR") {
    super(message);
    this.name = "RewardsLedgerError";
    this.code = code;
  }
}

/**
 * Thrown when reward input validation fails.
 */
class InvalidRewardInputError extends RewardsLedgerError {
  constructor(message) {
    super(message, "INVALID_REWARD_INPUT");
    this.name = "InvalidRewardInputError";
  }
}

/**
 * Thrown when a debit would result in a negative balance.
 */
class InsufficientPointsError extends RewardsLedgerError {
  constructor(availablePoints) {
    super("Insufficient reward points", "INSUFFICIENT_POINTS");
    this.name = "InsufficientPointsError";
    this.availablePoints = Number(availablePoints) || 0;
  }
}

/* ------------------------------------------------------------------ */
/*  Internal helpers                                                  */
/* ------------------------------------------------------------------ */

/**
 * Parse and validate a points delta (must be a non-zero integer).
 * @param {*} value
 * @returns {number}
 * @throws {InvalidRewardInputError}
 */
function parseIntegerDelta(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed) || parsed === 0) {
    throw new InvalidRewardInputError("Points delta must be a non-zero integer");
  }
  return parsed;
}

/**
 * Truncate an idempotency key to the max allowed length.
 * @param {*} value
 * @returns {string|null}
 */
function sanitizeIdempotencyKey(value) {
  const normalized = parseOptionalString(value);
  if (!normalized) return null;
  return normalized.slice(0, IDEMPOTENCY_KEY_MAX_LENGTH);
}

/**
 * Compute the reward tier for a given point total.
 * @param {number} points
 * @returns {string}
 */
function computeTier(points) {
  const normalizedPoints = Number(points) || 0;
  if (normalizedPoints >= 5000) return "Platinum";
  if (normalizedPoints >= 2000) return "Gold";
  if (normalizedPoints >= 500) return "Silver";
  return "Bronze";
}

/**
 * Run a parameterized query using a transactional client.
 * @param {pg.PoolClient} client
 * @param {string} text
 * @param {Array} values
 * @returns {Promise<pg.QueryResult>}
 */
async function runClientQuery(client, text, values = []) {
  return client.query({ text, values, query_timeout: DB_QUERY_TIMEOUT_MS });
}

/* ------------------------------------------------------------------ */
/*  Idempotency table                                                 */
/* ------------------------------------------------------------------ */

let idempotencyTableReadyPromise = null;
let rewardLogTableReadyPromise = null;

/**
 * Ensure the reward_idempotency table exists. Memoized per process.
 * The table is created via migrations; this only verifies availability.
 * @returns {Promise<boolean>}
 */
async function ensureIdempotencyTable() {
  if (idempotencyTableReadyPromise) {
    return idempotencyTableReadyPromise;
  }

  idempotencyTableReadyPromise = (async () => {
    try {
      const result = await pool.query({
        text: "SELECT to_regclass('reward_idempotency') as table_name",
        values: [],
        query_timeout: DB_QUERY_TIMEOUT_MS,
      });
      if (!result.rows[0]?.table_name) {
        logger.warn(
          "[RewardsLedger] reward_idempotency table missing. Idempotency disabled."
        );
        return false;
      }
      return true;
    } catch (err) {
      logger.warn(
        "[RewardsLedger] reward_idempotency table unavailable. Idempotency disabled.",
        { message: err.message }
      );
      return false;
    }
  })();

  const ready = await idempotencyTableReadyPromise;
  if (!ready) {
    idempotencyTableReadyPromise = null;
  }
  return ready;
}

/**
 * Ensure the reward_log table exists with a text-safe user identifier.
 * This intentionally avoids a hard FK so mixed integer/UUID deployments
 * can continue recording ledger events consistently.
 * @returns {Promise<boolean>}
 */
async function ensureRewardLogTable() {
  if (rewardLogTableReadyPromise) {
    return rewardLogTableReadyPromise;
  }

  rewardLogTableReadyPromise = (async () => {
    try {
      await pool.query({
        text: `
          CREATE TABLE IF NOT EXISTS reward_log (
            id SERIAL PRIMARY KEY,
            user_id TEXT NOT NULL,
            action VARCHAR(80) NOT NULL,
            points INTEGER NOT NULL,
            description TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `,
        values: [],
        query_timeout: DB_QUERY_TIMEOUT_MS,
      });
      await pool.query({
        text: `
          CREATE INDEX IF NOT EXISTS idx_reward_log_user_created
          ON reward_log(user_id, created_at DESC)
        `,
        values: [],
        query_timeout: DB_QUERY_TIMEOUT_MS,
      });
      return true;
    } catch (err) {
      logger.warn("[RewardsLedger] reward_log table unavailable.", {
        message: err.message,
      });
      return false;
    }
  })();

  const ready = await rewardLogTableReadyPromise;
  if (!ready) {
    rewardLogTableReadyPromise = null;
  }
  return ready;
}

/* ------------------------------------------------------------------ */
/*  Row helpers                                                       */
/* ------------------------------------------------------------------ */

/**
 * Ensure a rewards row exists for a user (INSERT ... ON CONFLICT DO NOTHING).
 * @param {pg.PoolClient} client
 * @param {string} userId
 */
async function ensureRewardsRow(client, userId) {
  await runClientQuery(
    client,
    `INSERT INTO rewards (user_id, points, tier)
     VALUES ($1, 0, 'Bronze')
     ON CONFLICT (user_id) DO NOTHING`,
    [userId]
  );
}

/**
 * Read the current points balance for a user.
 * @param {pg.PoolClient} client
 * @param {string} userId
 * @param {object} [opts]
 * @param {boolean} [opts.forUpdate=false]
 * @returns {Promise<number>}
 */
async function selectPoints(client, userId, { forUpdate = false } = {}) {
  const result = await runClientQuery(
    client,
    `SELECT points
     FROM rewards
     WHERE user_id::text = $1
     ${forUpdate ? "FOR UPDATE" : ""}
     LIMIT 1`,
    [userId]
  );
  return Number(result.rows[0]?.points || 0);
}

/* ------------------------------------------------------------------ */
/*  Post-commit side effects                                          */
/* ------------------------------------------------------------------ */

/**
 * Build a real-time event payload from a reward mutation.
 * @param {object} change
 * @returns {object}
 */
function toRewardEventPayload(change) {
  return {
    type: "rewards_balance_changed",
    action: change.action,
    pointsDelta: change.pointsDelta,
    pointsBefore: change.pointsBefore,
    pointsAfter: change.pointsAfter,
    tier: change.tier,
    idempotencyKey: change.idempotencyKey || null,
  };
}

/**
 * Invalidate caches and publish a real-time update after a reward mutation.
 * @param {object} change
 */
function afterCommitRewardMutation(change) {
  const normalizedUserId = String(change.userId);
  cacheService.invalidateRelated([
    CACHE_PROFILE_KEY(normalizedUserId),
    CACHE_LOG_KEY_PATTERN(normalizedUserId),
  ]);
  publishRewardUpdate(normalizedUserId, toRewardEventPayload(change));
}

/* ------------------------------------------------------------------ */
/*  Core mutation (within a transaction)                              */
/* ------------------------------------------------------------------ */

/**
 * Apply a point delta inside an existing transaction.
 * Supports idempotency via advisory locks + the reward_idempotency table.
 * @param {object} params
 * @param {pg.PoolClient} params.client
 * @param {string} params.userId
 * @param {number} params.pointsDelta
 * @param {string} [params.action]
 * @param {string} [params.description]
 * @param {string} [params.idempotencyKey]
 * @returns {Promise<object>} Mutation result.
 * @throws {InvalidRewardInputError|InsufficientPointsError}
 */
async function applyRewardDeltaInTransaction({
  client,
  userId,
  pointsDelta,
  action,
  description,
  idempotencyKey = null,
}) {
  if (!client || typeof client.query !== "function") {
    throw new InvalidRewardInputError("A transactional database client is required");
  }

  const normalizedUserId = parseOptionalString(userId);
  if (!normalizedUserId) {
    throw new InvalidRewardInputError("userId is required");
  }

  const normalizedAction = parseOptionalString(action) || "adjustment";
  const normalizedDescription =
    parseOptionalString(description) || "Rewards balance adjusted";
  const normalizedDelta = parseIntegerDelta(pointsDelta);
  const normalizedIdempotencyKey = sanitizeIdempotencyKey(idempotencyKey);

  await ensureRewardLogTable();
  await ensureRewardsRow(client, normalizedUserId);

  let idempotencyTableReady = false;

  if (normalizedIdempotencyKey) {
    idempotencyTableReady = await ensureIdempotencyTable();

    if (idempotencyTableReady) {
      await runClientQuery(
        client,
        "SELECT pg_advisory_xact_lock(hashtext($1))",
        [`rewards:${normalizedUserId}:${normalizedIdempotencyKey}`]
      );

      const existingIdempotencyResult = await runClientQuery(
        client,
        `SELECT id
         FROM reward_idempotency
         WHERE user_id = $1 AND idempotency_key = $2
         LIMIT 1`,
        [normalizedUserId, normalizedIdempotencyKey]
      );

      if (existingIdempotencyResult.rowCount > 0) {
        const currentPoints = await selectPoints(client, normalizedUserId, {
          forUpdate: false,
        });
        return {
          applied: false,
          duplicate: true,
          userId: normalizedUserId,
          action: normalizedAction,
          pointsDelta: normalizedDelta,
          pointsBefore: currentPoints,
          pointsAfter: currentPoints,
          tier: computeTier(currentPoints),
          idempotencyKey: normalizedIdempotencyKey,
        };
      }
    }
  }

  const pointsBefore = await selectPoints(client, normalizedUserId, {
    forUpdate: true,
  });
  const pointsAfter = pointsBefore + normalizedDelta;

  if (pointsAfter < 0) {
    throw new InsufficientPointsError(pointsBefore);
  }

  const nextTier = computeTier(pointsAfter);

  await runClientQuery(
    client,
    `UPDATE rewards
     SET points = $1, tier = $2
     WHERE user_id::text = $3`,
    [pointsAfter, nextTier, normalizedUserId]
  );

  await runClientQuery(
    client,
    `INSERT INTO reward_log (user_id, action, points, description, created_at)
     VALUES ($1, $2, $3, $4, NOW())`,
    [normalizedUserId, normalizedAction, normalizedDelta, normalizedDescription]
  );

  if (normalizedIdempotencyKey && idempotencyTableReady) {
    await runClientQuery(
      client,
      `INSERT INTO reward_idempotency (user_id, idempotency_key, action, points_delta, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [normalizedUserId, normalizedIdempotencyKey, normalizedAction, normalizedDelta]
    );
  }

  return {
    applied: true,
    duplicate: false,
    userId: normalizedUserId,
    action: normalizedAction,
    pointsDelta: normalizedDelta,
    pointsBefore,
    pointsAfter,
    tier: nextTier,
    idempotencyKey: normalizedIdempotencyKey,
  };
}

/* ------------------------------------------------------------------ */
/*  Standalone mutation (manages its own transaction)                 */
/* ------------------------------------------------------------------ */

/**
 * Apply a reward point delta with automatic transaction management.
 * @param {object} options - Same as applyRewardDeltaInTransaction minus `client`.
 * @returns {Promise<object>}
 */
async function applyRewardDelta(options) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const change = await applyRewardDeltaInTransaction({ ...options, client });
    await client.query("COMMIT");

    if (change.applied) {
      afterCommitRewardMutation(change);
    }
    return change;
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* swallow rollback errors */
    }
    throw err;
  } finally {
    client.release();
  }
}

/* ------------------------------------------------------------------ */
/*  Exports                                                           */
/* ------------------------------------------------------------------ */

module.exports = {
  RewardsLedgerError,
  InvalidRewardInputError,
  InsufficientPointsError,
  applyRewardDelta,
  applyRewardDeltaInTransaction,
  afterCommitRewardMutation,
  computeTier,
  ensureRewardLogTable,
};

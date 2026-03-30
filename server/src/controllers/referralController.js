const crypto = require("crypto");
const { pool, runQuery, getAuthUserId, isAdmin, DB_QUERY_TIMEOUT_MS } = require("../utils/dbHelpers");
const { parseOptionalString, parsePositiveInt } = require("../utils/parseHelpers");
const logger = require("../utils/logger");
const redisSession = require("../config/redisSession");
const { applyReferralMilestoneRewards } = require("./coinController");
const cacheService = require("../services/cacheService");

const REFERRAL_CODE_MAX_ATTEMPTS = 5;
const REFERRAL_TRACK_MAX_PER_DAY =
  Number.parseInt(process.env.REFERRAL_TRACK_MAX_PER_DAY, 10) || 20;
const REFERRAL_TRACK_MAX_PER_IP =
  Number.parseInt(process.env.REFERRAL_TRACK_MAX_PER_IP, 10) || 10;
const REFERRAL_SIGNUP_MAX_AGE_DAYS =
  Number.parseInt(process.env.REFERRAL_SIGNUP_MAX_AGE_DAYS, 10) || 7;
const REFERRAL_TREE_CACHE_TTL =
  Number.parseInt(process.env.REFERRAL_TREE_CACHE_TTL, 10) || 60;
const REFERRAL_TREE_MAX_DEPTH = parsePositiveInt(
  process.env.REFERRAL_CHAIN_MAX_DEPTH,
  5,
);

/**
 * Run a parameterized query on a pooled client with timeout.
 * Needed for transactional flows where queries must share a single client.
 * @param {pg.PoolClient} client - Connected pool client
 * @param {string} text - SQL query text
 * @param {Array} values - Query parameters
 * @returns {Promise<pg.QueryResult>}
 */
function runClientQuery(client, text, values = []) {
  return client.query({ text, values, query_timeout: DB_QUERY_TIMEOUT_MS });
}

/**
 * Generate a random alphanumeric suffix for referral codes.
 * @param {number} [length=5] - Length of the suffix
 * @returns {string} Uppercase base-36 string
 */
function generateReferralSuffix(length = 5) {
  const max = 36 ** length;
  return crypto.randomInt(0, max).toString(36).toUpperCase().padStart(length, "0");
}

/**
 * Check whether a Postgres error is a unique-constraint violation.
 * @param {Error} error
 * @returns {boolean}
 */
function isUniqueViolation(error) {
  return String(error?.code || "") === "23505";
}

function isUndefinedTableError(error) {
  return String(error?.code || "").toUpperCase() === "42P01";
}

/**
 * Map a period keyword to a safe SQL interval string.
 * Prevents SQL injection by only allowing whitelisted values.
 * @param {string} period
 * @returns {string}
 */
function periodToInterval(period) {
  if (period === "weekly") return "7 days";
  if (period === "all") return "100 years";
  return "30 days";
}

let referralClosureAvailablePromise = null;

async function hasReferralClosure() {
  if (!referralClosureAvailablePromise) {
    referralClosureAvailablePromise = runQuery(
      "SELECT to_regclass('public.referral_closure') AS table_name",
    )
      .then((result) => Boolean(result.rows?.[0]?.table_name))
      .catch(() => false);
  }
  return referralClosureAvailablePromise;
}

function buildReferralTree(rows, rootUser) {
  const rootId = parseOptionalString(rootUser?.id) || "root";
  const rootNode = {
    id: rootId,
    name: rootUser?.name || "You",
    depth: 0,
    joinDate: "",
    children: [],
  };

  const byId = new Map([[rootId, rootNode]]);

  rows.forEach((row, index) => {
    const id = parseOptionalString(row.user_id) || `node-${index}`;
    if (!id || id === rootId) return;
    const name = row.full_name || row.username || "User";
    const parentId = parseOptionalString(row.parent_user_id) || rootId;
    byId.set(id, {
      id,
      parentId,
      name,
      depth: Number.parseInt(row.depth, 10) || 0,
      joinDate: row.created_at ? new Date(row.created_at).toISOString() : "",
      children: [],
    });
  });

  Array.from(byId.values()).forEach((node) => {
    if (node.id === rootId) return;
    const parent = byId.get(node.parentId) || rootNode;
    parent.children.push(node);
  });

  const sortNodes = (node) => {
    node.children.sort((left, right) => {
      const leftDepth = Number(left.depth || 0);
      const rightDepth = Number(right.depth || 0);
      if (leftDepth !== rightDepth) return leftDepth - rightDepth;
      return String(left.name || "").localeCompare(String(right.name || ""));
    });
    node.children.forEach(sortNodes);
  };

  sortNodes(rootNode);
  return rootNode;
}

async function loadReferralDescendants(userId, maxDepth) {
  const normalizedUserId = parseOptionalString(userId);
  if (!normalizedUserId) return [];

  const useClosure = await hasReferralClosure();
  if (useClosure) {
    const result = await runQuery(
      `
        SELECT
          c.descendant_user_id AS user_id,
          u.referred_by::text AS parent_user_id,
          c.depth,
          u.username,
          p.full_name,
          u.created_at
        FROM referral_closure c
        LEFT JOIN users u ON u.user_id::text = c.descendant_user_id
        LEFT JOIN profiles p ON p.user_id::text = c.descendant_user_id
        WHERE c.ancestor_user_id::text = $1
          AND c.depth <= $2
        ORDER BY c.depth ASC, u.created_at ASC
      `,
      [normalizedUserId, maxDepth],
    );
    return result.rows || [];
  }

  const result = await runQuery(
    `
      WITH RECURSIVE referral_chain AS (
        SELECT
          u.user_id::text AS user_id,
          u.referred_by::text AS parent_user_id,
          1 AS depth,
          u.created_at,
          u.username
        FROM users u
        WHERE u.referred_by::text = $1

        UNION ALL

        SELECT
          child.user_id::text AS user_id,
          child.referred_by::text AS parent_user_id,
          chain.depth + 1 AS depth,
          child.created_at,
          child.username
        FROM users child
        INNER JOIN referral_chain chain
          ON child.referred_by::text = chain.user_id
        WHERE chain.depth < $2
      )
      SELECT
        chain.user_id,
        chain.parent_user_id,
        chain.depth,
        chain.created_at,
        chain.username,
        p.full_name
      FROM referral_chain chain
      LEFT JOIN profiles p ON p.user_id::text = chain.user_id
      ORDER BY chain.depth ASC, chain.created_at ASC
    `,
    [normalizedUserId, maxDepth],
  );
  return result.rows || [];
}

/**
 * Get referral info for the authenticated user (or another user if admin).
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
exports.getReferral = async (req, res) => {
  const authenticatedUserId = getAuthUserId(req);
  if (!authenticatedUserId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const requestedUserId = parseOptionalString(req.query.userId) || authenticatedUserId;
  if (requestedUserId !== authenticatedUserId && !isAdmin(req)) {
    return res.status(403).json({ error: "Cannot access another user referral info" });
  }

  try {
    let result;
    try {
      result = await runQuery(
        `SELECT u.user_id, u.referral_code, u.referred_by,
                (SELECT COUNT(*) FROM users WHERE referred_by = u.user_id) as referral_count,
                (SELECT COALESCE(SUM(amount), 0)
                 FROM coin_transactions
                 WHERE user_id = u.user_id AND type = 'referral_l1') AS direct_earnings,
                (SELECT COALESCE(SUM(amount), 0)
                 FROM coin_transactions
                 WHERE user_id = u.user_id
                   AND type LIKE 'referral_l%'
                   AND type <> 'referral_l1') AS indirect_earnings
         FROM users u WHERE u.user_id = $1`,
        [String(requestedUserId)]
      );
    } catch (err) {
      if (!isUndefinedTableError(err)) {
        throw err;
      }
      result = await runQuery(
        `SELECT u.user_id, u.referral_code, u.referred_by,
                (SELECT COUNT(*) FROM users WHERE referred_by = u.user_id) as referral_count,
                0::numeric AS direct_earnings,
                0::numeric AS indirect_earnings
         FROM users u WHERE u.user_id = $1`,
        [String(requestedUserId)]
      );
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    logger.error("Get referral error:", err);
    res.status(500).json({ error: "Failed to fetch referral info" });
  }
};

/**
 * Generate a unique referral code for the authenticated user.
 * If the user already has a referral code, returns the existing one.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
exports.createReferral = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const normalizedUserId = String(userId);

    const userResult = await runQuery(
      "SELECT username, referral_code FROM users WHERE user_id = $1 LIMIT 1",
      [normalizedUserId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const existingCode = userResult.rows[0]?.referral_code;
    if (existingCode) {
      return res.json({ referralCode: existingCode, message: "Referral code already exists" });
    }

    const username = userResult.rows[0]?.username || "U";
    const prefix = username.substring(0, 3).toUpperCase();

    for (let attempt = 0; attempt < REFERRAL_CODE_MAX_ATTEMPTS; attempt += 1) {
      const code = `${prefix}-${generateReferralSuffix(5)}`;
      try {
        const updateResult = await runQuery(
          "UPDATE users SET referral_code = $1 WHERE user_id = $2 AND referral_code IS NULL RETURNING referral_code",
          [code, normalizedUserId]
        );

        if (updateResult.rows[0]?.referral_code) {
          return res.status(201).json({
            referralCode: updateResult.rows[0].referral_code,
            message: "Referral code generated",
          });
        }

        const latest = await runQuery(
          "SELECT referral_code FROM users WHERE user_id = $1 LIMIT 1",
          [normalizedUserId]
        );

        if (latest.rows[0]?.referral_code) {
          return res.json({
            referralCode: latest.rows[0].referral_code,
            message: "Referral code already exists",
          });
        }
      } catch (err) {
        if (isUniqueViolation(err)) {
          continue;
        }
        throw err;
      }
    }

    return res.status(503).json({ error: "Failed to allocate referral code, please retry" });
  } catch (err) {
    logger.error("Create referral error:", err);
    res.status(500).json({ error: "Failed to create referral code" });
  }
};

/**
 * Track a referral: link newUserId to the owner of referralCode.
 * Enforces rate limits per IP and per referrer, validates referral window,
 * and optionally triggers referral join coin rewards.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
exports.trackReferral = async (req, res) => {
  const authenticatedUserId = getAuthUserId(req);
  if (!authenticatedUserId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const { referralCode, newUserId } = req.body;
  if (!referralCode || !newUserId) {
    return res.status(400).json({ error: "referralCode and newUserId required" });
  }

  try {
    const normalizedNewUserId = String(newUserId);
    if (normalizedNewUserId !== String(authenticatedUserId) && !isAdmin(req)) {
      return res.status(403).json({ error: "Cannot apply referral code for another user" });
    }

    const normalizedReferralCode = String(referralCode).trim();
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const referrer = await runClientQuery(
        client,
        "SELECT user_id FROM users WHERE referral_code = $1 LIMIT 1",
        [normalizedReferralCode]
      );

      if (referrer.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Invalid referral code" });
      }

      const referrerId = String(referrer.rows[0].user_id);

      const newUserMeta = await runClientQuery(
        client,
        "SELECT user_id, created_at, referred_by FROM users WHERE user_id::text = $1 LIMIT 1",
        [normalizedNewUserId]
      );

      if (newUserMeta.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "User not found" });
      }

      const createdAt = new Date(newUserMeta.rows[0].created_at);
      if (REFERRAL_SIGNUP_MAX_AGE_DAYS > 0 && Number.isFinite(createdAt.getTime())) {
        const maxAgeMs = REFERRAL_SIGNUP_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
        if (Date.now() - createdAt.getTime() > maxAgeMs) {
          await client.query("ROLLBACK");
          return res.status(400).json({ error: "Referral window expired" });
        }
      }

      const todayKey = new Date().toISOString().slice(0, 10);
      const ipKey = `REFERRAL_IP:${req.ip || "unknown"}:${todayKey}`;
      const refKey = `REFERRAL_REF:${referrerId}:${todayKey}`;

      const [referralIpCount, referralRefCount] = await Promise.all([
        redisSession.incr(ipKey, 86400),
        redisSession.incr(refKey, 86400),
      ]);

      if (referralIpCount > REFERRAL_TRACK_MAX_PER_IP) {
        await client.query("ROLLBACK");
        return res.status(429).json({
          error: "Too many referral attempts from this network. Please try later.",
        });
      }

      if (referralRefCount > REFERRAL_TRACK_MAX_PER_DAY) {
        await client.query("ROLLBACK");
        return res.status(429).json({
          error: "Referral limit reached for this referrer today.",
        });
      }

      if (referrerId === normalizedNewUserId) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Cannot refer yourself" });
      }

      const updateResult = await runClientQuery(
        client,
        "UPDATE users SET referred_by = $1 WHERE user_id::text = $2 AND referred_by IS NULL RETURNING user_id",
        [referrerId, normalizedNewUserId]
      );

      if (updateResult.rowCount === 0) {
        const existingResult = await runClientQuery(
          client,
          "SELECT referred_by FROM users WHERE user_id::text = $1 LIMIT 1",
          [normalizedNewUserId]
        );

        await client.query("ROLLBACK");

        if (existingResult.rows.length === 0) {
          return res.status(404).json({ error: "User not found" });
        }

        const existingReferrer = parseOptionalString(existingResult.rows[0]?.referred_by);
        if (existingReferrer === referrerId) {
          return res.json({ message: "Referral already tracked", referrerId });
        }

        return res.status(409).json({ error: "Referral already assigned for this user" });
      }

      await client.query("COMMIT");

      let rewardOutcome = null;
      try {
        const { applyReferralJoinCoinRewards } = require("../services/referralJoinRewards");
        rewardOutcome = await applyReferralJoinCoinRewards({
          subjectUserId: normalizedNewUserId,
          requireVerified: true,
          requireActivity: true,
          context: {
            trigger: "manual_track",
            referralCode: normalizedReferralCode,
            ipAddress: req.ip,
            deviceId: req.headers["x-device-id"] || req.headers["user-agent"] || null,
          },
        });
      } catch (referralErr) {
        logger.warn("[Referral] Chain reward skipped", { message: referralErr.message });
      }

      let milestoneOutcome = null;
      try {
        milestoneOutcome = await applyReferralMilestoneRewards(referrerId);
      } catch (milestoneErr) {
        logger.warn("[Referral] Milestone reward skipped", { message: milestoneErr.message });
      }

      return res.json({
        message: "Referral tracked successfully",
        referrerId,
        rewardStatus: rewardOutcome?.applied ? "applied" : rewardOutcome?.reason || "pending",
        milestoneStatus: milestoneOutcome?.applied ? "applied" : "pending",
      });
    } catch (innerErr) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // ignore rollback error
      }
      throw innerErr;
    } finally {
      client.release();
    }
  } catch (err) {
    logger.error("Track referral error:", err);
    res.status(500).json({ error: "Failed to track referral" });
  }
};

/**
 * Get the referral leaderboard, filtered by period and limited in size.
 * Supports "weekly", "monthly" (default), and "all" time periods.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
exports.getLeaderboard = async (req, res) => {
  const { period = "monthly", limit = 20 } = req.query;

  try {
    const normalizedLimit = parsePositiveInt(limit, 20, 100);
    const interval = periodToInterval(period);
    const requestedUserId = parseOptionalString(req.query.userId);
    const leaderboardQuery = `
      WITH ranked_referrers AS (
        SELECT
          u.user_id,
          u.username,
          p.full_name,
          p.avatar_url,
          COUNT(ref.user_id)::int AS referral_count,
          COALESCE(r.points, 0)::int AS total_points,
          DENSE_RANK() OVER (
            ORDER BY COUNT(ref.user_id) DESC, COALESCE(r.points, 0) DESC, u.user_id
          )::int AS rank
        FROM users u
        LEFT JOIN profiles p ON u.user_id = p.user_id
        LEFT JOIN users ref ON ref.referred_by = u.user_id
                            AND ref.created_at > NOW() - $2::interval
        LEFT JOIN rewards r ON u.user_id = r.user_id
        WHERE u.referral_code IS NOT NULL
        GROUP BY u.user_id, u.username, p.full_name, p.avatar_url, r.points
        HAVING COUNT(ref.user_id) > 0
      )
      SELECT user_id, username, full_name, avatar_url, referral_count, total_points, rank
      FROM ranked_referrers
    `;

    const result = await runQuery(
      `${leaderboardQuery}
      ORDER BY rank ASC, total_points DESC, user_id
      LIMIT $1`,
      [normalizedLimit, interval]
    );

    let currentUserRank = null;
    if (requestedUserId) {
      const currentUserResult = await runQuery(
        `${leaderboardQuery}
        WHERE user_id::text = $3
        LIMIT 1`,
        [normalizedLimit, interval, requestedUserId]
      );
      currentUserRank = currentUserResult.rows[0] || null;
    }

    res.json({ leaderboard: result.rows, period, currentUserRank });
  } catch (err) {
    logger.error("Leaderboard error:", err);
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
};

/**
 * Get referral tree (descendants) for the authenticated user.
 */
exports.getReferralTree = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const maxDepth = parsePositiveInt(req.query.maxDepth, REFERRAL_TREE_MAX_DEPTH, 25);
  const cacheKey = `referral:tree:${userId}:${maxDepth}`;

  try {
    const payload = await cacheService.getOrSetWithStampedeProtection(
      cacheKey,
      async () => {
        const [userResult, rows] = await Promise.all([
          runQuery(
            "SELECT username, name FROM users WHERE user_id::text = $1 LIMIT 1",
            [userId],
          ),
          loadReferralDescendants(userId, maxDepth),
        ]);

        const userRow = userResult.rows[0] || {};
        const rootName = userRow.name || userRow.username || "You";
        const directCount = rows.filter((row) => Number(row.depth) === 1).length;
        const indirectCount = rows.filter((row) => Number(row.depth) > 1).length;

        return {
          userId,
          maxDepth,
          total: rows.length,
          directCount,
          indirectCount,
          tree: buildReferralTree(rows, { id: userId, name: rootName }),
        };
      },
      REFERRAL_TREE_CACHE_TTL,
    );

    res.json(payload);
  } catch (err) {
    logger.error("Referral tree error:", err);
    res.status(500).json({ error: "Failed to fetch referral tree" });
  }
};

/**
 * Get flat referral list (direct + indirect).
 */
exports.getReferrals = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const maxDepth = parsePositiveInt(req.query.maxDepth, REFERRAL_TREE_MAX_DEPTH, 25);
  try {
    const rows = await loadReferralDescendants(userId, maxDepth);
    const direct = rows.filter((row) => Number(row.depth) === 1);
    const indirect = rows.filter((row) => Number(row.depth) > 1);
    res.json({
      userId,
      maxDepth,
      total: rows.length,
      direct,
      indirect,
    });
  } catch (err) {
    logger.error("Referral list error:", err);
    res.status(500).json({ error: "Failed to fetch referrals" });
  }
};

/**
 * Get referral-specific wallet transactions.
 */
exports.getReferralTransactions = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const limit = Math.min(Number.parseInt(req.query.limit, 10) || 20, 200);
  const offset = Math.max(Number.parseInt(req.query.offset, 10) || 0, 0);

  try {
    const [transactionsResult, countResult] = await Promise.all([
      runQuery(
        `SELECT id, amount, type, description, source_user_id, level, metadata, created_at
         FROM coin_transactions
         WHERE user_id = $1
           AND type LIKE 'referral_%'
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset],
      ),
      runQuery(
        `SELECT COUNT(*)::int AS total
         FROM coin_transactions
         WHERE user_id = $1
           AND type LIKE 'referral_%'`,
        [userId],
      ),
    ]);

    res.json({
      userId,
      limit,
      offset,
      total: countResult.rows[0]?.total || 0,
      transactions: transactionsResult.rows || [],
    });
  } catch (err) {
    logger.error("Referral transaction error:", err);
    res.status(500).json({ error: "Failed to fetch referral transactions" });
  }
};

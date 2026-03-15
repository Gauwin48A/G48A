const { pool, runQuery, getAuthUserId } = require("../utils/dbHelpers");
const logger = require("../utils/logger");

// Coin costs for redemptions
const REDEEM_COSTS = {
  boost: 10,
  featured: 20,
  spotlight: 40,
};

// Coin earn amounts
const EARN_AMOUNTS = {
  welcome_bonus: 90,
  post: 1,
  sale: 3,
  purchase: 1,
  referral_l1: 2,
  referral_l2: 1,
  referral_l3: 0.5,
};

/**
 * Auto-migrate: ensure coin_transactions table and users.coins column exist
 */
async function ensureCoinSchema() {
  await runQuery(`
    DO $$
    DECLARE current_type text;
    BEGIN
      SELECT data_type INTO current_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'coin_transactions'
        AND column_name = 'user_id';

      IF current_type IS NULL THEN
        CREATE TABLE IF NOT EXISTS coin_transactions (
          id SERIAL PRIMARY KEY,
          user_id UUID NOT NULL REFERENCES users(user_id),
          amount DECIMAL(10,2) NOT NULL,
          type VARCHAR(30) NOT NULL,
          reference_id TEXT,
          description TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      ELSIF current_type <> 'uuid' THEN
        BEGIN
          ALTER TABLE coin_transactions
            ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
        EXCEPTION WHEN others THEN
          ALTER TABLE coin_transactions RENAME TO coin_transactions_legacy;
          CREATE TABLE IF NOT EXISTS coin_transactions (
            id SERIAL PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES users(user_id),
            amount DECIMAL(10,2) NOT NULL,
            type VARCHAR(30) NOT NULL,
            reference_id TEXT,
            description TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
          );
          INSERT INTO coin_transactions (id, user_id, amount, type, reference_id, description, created_at)
          SELECT id,
                 NULLIF(user_id::text, '')::uuid,
                 amount, type, reference_id, description, created_at
          FROM coin_transactions_legacy
          WHERE user_id::text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
        END;
      END IF;
    END $$;
  `).catch(() => {});
  await runQuery(`CREATE INDEX IF NOT EXISTS idx_coin_user ON coin_transactions(user_id, created_at DESC)`).catch(() => {});
  await runQuery(`CREATE INDEX IF NOT EXISTS idx_coin_reference ON coin_transactions(reference_id)`).catch(() => {});
  await runQuery(`ALTER TABLE users ADD COLUMN IF NOT EXISTS coins DECIMAL(10,2) DEFAULT 0`).catch(() => {});
}

// Cached promise pattern — avoids race condition with boolean flag
let _coinSchemaPromise = null;
async function lazyEnsureSchema() {
  if (!_coinSchemaPromise) {
    _coinSchemaPromise = ensureCoinSchema();
  }
  return _coinSchemaPromise;
}

/**
 * Add coins to a user (internal function, used by other services)
 * @param {string|number} userId
 * @param {number} amount - positive number
 * @param {string} type - earn type
 * @param {string} referenceId - idempotency key
 * @param {string} description
 * @returns {object} { applied, newBalance }
 */
async function addCoins(userId, amount, type, referenceId = null, description = "") {
  await lazyEnsureSchema();

  // Idempotency check
  if (referenceId) {
    const existing = await runQuery(
      "SELECT id FROM coin_transactions WHERE reference_id = $1 LIMIT 1",
      [referenceId],
    );
    if (existing.rows.length > 0) {
      return { applied: false, reason: "duplicate", referenceId };
    }
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `INSERT INTO coin_transactions (user_id, amount, type, reference_id, description)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, Math.abs(amount), type, referenceId, description],
    );

    const result = await client.query(
      `UPDATE users SET coins = COALESCE(coins, 0) + $1 WHERE user_id = $2 RETURNING coins`,
      [Math.abs(amount), userId],
    );

    await client.query("COMMIT");

    const newBalance = parseFloat(result.rows[0]?.coins || 0);
    logger.info(`[Coins] +${amount} ${type} for user ${userId} (balance: ${newBalance})`);
    return { applied: true, newBalance };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Spend coins (internal function)
 * @returns {object} { applied, newBalance } or { applied: false, reason }
 */
async function spendCoins(userId, amount, type, referenceId = null, description = "") {
  await lazyEnsureSchema();

  if (referenceId) {
    const existing = await runQuery(
      "SELECT id FROM coin_transactions WHERE reference_id = $1 LIMIT 1",
      [referenceId],
    );
    if (existing.rows.length > 0) {
      return { applied: false, reason: "duplicate", referenceId };
    }
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Check balance with row lock
    const balanceResult = await client.query(
      "SELECT coins FROM users WHERE user_id = $1 FOR UPDATE",
      [userId],
    );
    const currentBalance = parseFloat(balanceResult.rows[0]?.coins || 0);

    if (currentBalance < amount) {
      await client.query("ROLLBACK");
      return { applied: false, reason: "insufficient_balance", currentBalance, required: amount };
    }

    await client.query(
      `INSERT INTO coin_transactions (user_id, amount, type, reference_id, description)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, -Math.abs(amount), type, referenceId, description],
    );

    const result = await client.query(
      `UPDATE users SET coins = COALESCE(coins, 0) - $1 WHERE user_id = $2 RETURNING coins`,
      [Math.abs(amount), userId],
    );

    await client.query("COMMIT");

    const newBalance = parseFloat(result.rows[0]?.coins || 0);
    logger.info(`[Coins] -${amount} ${type} for user ${userId} (balance: ${newBalance})`);
    return { applied: true, newBalance };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// GET /api/coins/balance
exports.getBalance = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  try {
    await lazyEnsureSchema();
    const result = await runQuery("SELECT coins FROM users WHERE user_id = $1", [userId]);
    const balance = parseFloat(result.rows[0]?.coins || 0);
    res.json({ success: true, balance });
  } catch (err) {
    logger.error("[Coins] getBalance error:", err);
    res.status(500).json({ error: "Failed to get balance" });
  }
};

// GET /api/coins/history?limit=20&offset=0
exports.getCoinHistory = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  const limit = Math.min(Number.parseInt(req.query.limit, 10) || 20, 100);
  const offset = Math.max(Number.parseInt(req.query.offset, 10) || 0, 0);

  try {
    await lazyEnsureSchema();
    const result = await runQuery(
      `SELECT id, amount, type, description, created_at
       FROM coin_transactions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    );

    const countResult = await runQuery(
      "SELECT COUNT(*) as total FROM coin_transactions WHERE user_id = $1",
      [userId],
    );

    res.json({
      success: true,
      transactions: result.rows,
      total: parseInt(countResult.rows[0]?.total || 0, 10),
      limit,
      offset,
    });
  } catch (err) {
    logger.error("[Coins] getCoinHistory error:", err);
    res.status(500).json({ error: "Failed to get coin history" });
  }
};

// POST /api/coins/redeem — spend coins on boost/featured/spotlight
exports.redeemCoins = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  const redeemType = String(req.body?.type || "").toLowerCase();
  const postId = req.body?.postId;

  if (!REDEEM_COSTS[redeemType]) {
    return res.status(400).json({
      error: "Invalid redeem type",
      options: Object.entries(REDEEM_COSTS).map(([type, cost]) => ({ type, cost })),
    });
  }

  if (!postId) {
    return res.status(400).json({ error: "postId is required" });
  }

  const cost = REDEEM_COSTS[redeemType];
  const idempotencyKey =
    req.body?.idempotencyKey ||
    req.body?.requestId ||
    req.headers["x-idempotency-key"] ||
    null;
  const referenceId = idempotencyKey
    ? `redeem:${redeemType}:${idempotencyKey}`
    : `redeem:${redeemType}:${userId}:${postId}:${Date.now()}`;

  try {
    const ownershipCheck = await runQuery(
      "SELECT user_id, status FROM posts WHERE post_id::text = $1 LIMIT 1",
      [postId],
    );
    if (!ownershipCheck.rows.length) {
      return res.status(404).json({ error: "Post not found" });
    }
    if (String(ownershipCheck.rows[0].user_id) !== String(userId)) {
      return res.status(403).json({ error: "You can only redeem boosts for your own posts" });
    }
    if (ownershipCheck.rows[0].status !== "active") {
      return res.status(400).json({ error: "Only active posts can be boosted" });
    }

    const result = await spendCoins(
      userId,
      cost,
      `redeem_${redeemType}`,
      referenceId,
      `Redeemed ${cost} coins for ${redeemType} on post ${postId}`,
    );

    if (!result.applied) {
      if (result.reason === "insufficient_balance") {
        return res.status(400).json({
          error: `Insufficient coins. Need ${cost}, have ${result.currentBalance}.`,
          required: cost,
          balance: result.currentBalance,
        });
      }
      return res.status(409).json({ error: "Duplicate redemption" });
    }

    // We directly insert the boost record since the user paid with coins
    const BOOST_DURATIONS = { boost: 7, featured: 14, spotlight: 30 };
    const BOOST_LEVELS = { boost: 1, featured: 2, spotlight: 3 };
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + BOOST_DURATIONS[redeemType]);

    await runQuery(`
      CREATE TABLE IF NOT EXISTS post_boosts (
        boost_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        post_id TEXT NOT NULL, user_id TEXT NOT NULL, boost_type TEXT NOT NULL,
        source TEXT DEFAULT 'coins', status TEXT DEFAULT 'active',
        starts_at TIMESTAMPTZ DEFAULT NOW(), expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `).catch(() => {});

    await runQuery(
      `INSERT INTO post_boosts (post_id, user_id, boost_type, source, expires_at)
       VALUES ($1, $2, $3, 'coins', $4)`,
      [postId, userId, redeemType, expiresAt],
    );

    await runQuery(
      `UPDATE posts SET boost_level = GREATEST(COALESCE(boost_level, 0), $1) WHERE post_id::text = $2`,
      [BOOST_LEVELS[redeemType], postId],
    ).catch(() => {});

    logger.info(`[Coins] User ${userId} redeemed ${cost} coins for ${redeemType} on post ${postId}`);

    res.json({
      success: true,
      message: `${redeemType} applied using ${cost} coins!`,
      newBalance: result.newBalance,
      boost: { type: redeemType, expiresAt, source: "coins" },
    });
  } catch (err) {
    logger.error("[Coins] redeemCoins error:", err);
    res.status(500).json({ error: "Failed to redeem coins" });
  }
};

// Export internal functions for use by other services
exports.addCoins = addCoins;
exports.spendCoins = spendCoins;
exports.EARN_AMOUNTS = EARN_AMOUNTS;
exports.REDEEM_COSTS = REDEEM_COSTS;

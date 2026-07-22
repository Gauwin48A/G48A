const { pool, runQuery, getAuthUserId } = require("../utils/dbHelpers");
const { parsePositiveNumber } = require("../utils/parseHelpers");
const logger = require("../utils/logger");

// Coin costs for redemptions based on user active plan
const REDEEM_COSTS = {
  premium: {
    boost: 50,
    featured: 200,
    spotlight: 500,
  },
  standard: {
    boost: 100,
    featured: 500,
    spotlight: 1000,
  },
};

const REFERRAL_DIRECT_COINS = parsePositiveNumber(
  process.env.REFERRAL_DIRECT_REWARD,
  100,
);
const REFERRAL_INDIRECT_COINS = parsePositiveNumber(
  process.env.REFERRAL_INDIRECT_REWARD,
  10,
);

// Coin earn amounts
const EARN_AMOUNTS = {
  welcome_bonus: 100,
  post: 5,
  sale: 25,
  purchase: 10,
  first_listing: 25,
  first_sale: 50,
  five_star_review: 15,
  referral_l1: REFERRAL_DIRECT_COINS,
  referral_l2: 40,
  referral_l3: 20,
  referral_l4: 10,
  referral_l5: 5,
};

// Daily earning caps per action type (anti-abuse)
const DAILY_EARN_CAPS = {
  post: 50,       // max 50 coins from listings per day (10 listings × 5)
  sale: 250,      // max 250 coins from sales per day
  purchase: 100,  // max 100 coins from purchases per day
};

const DAILY_CHECKIN_REWARDS = [5, 10, 15, 20, 30, 50, 100];
const SPIN_REWARD_POOL = [
  { amount: 25, weight: 15 },
  { amount: 15, weight: 20 },
  { amount: 10, weight: 25 },
  { amount: 5, weight: 25 },
  { amount: 0, weight: 10 },
  { amount: -5, weight: 3 },
  { amount: -10, weight: 2 },
];
const SCRATCH_REWARD_POOL = [
  { amount: 10, weight: 30 },
  { amount: 20, weight: 25 },
  { amount: 40, weight: 20 },
  { amount: 60, weight: 15 },
  { amount: 80, weight: 7 },
  { amount: 100, weight: 3 },
];
const REFERRAL_MILESTONES = [
  { count: 3, reward: 50, type: "referral_milestone_3" },
];
const STORE_REDEEM_COSTS = {
  boost: 100,
  badge: 1000,
  top_search: 500,
};
const STORE_REDEEM_REQUIRES_POST = new Set(["boost", "top_search"]);
const IST_OFFSET_MINUTES = 330;

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function getIstDateKey(date = new Date()) {
  const istDate = addMinutes(date, IST_OFFSET_MINUTES);
  return istDate.toISOString().slice(0, 10);
}

function getNextIstMidnightIso(now = new Date()) {
  const istNow = addMinutes(now, IST_OFFSET_MINUTES);
  const nextIstMidnight = new Date(
    Date.UTC(
      istNow.getUTCFullYear(),
      istNow.getUTCMonth(),
      istNow.getUTCDate() + 1,
      0,
      0,
      0,
    ),
  );
  const nextUtc = addMinutes(nextIstMidnight, -IST_OFFSET_MINUTES);
  return nextUtc.toISOString();
}

function pickWeightedReward(pool) {
  const total = pool.reduce((sum, entry) => sum + entry.weight, 0);
  const roll = Math.random() * total;
  let acc = 0;
  for (const entry of pool) {
    acc += entry.weight;
    if (roll <= acc) {
      return entry.amount;
    }
  }
  return pool[pool.length - 1]?.amount || 0;
}

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
          source_user_id TEXT,
          level INTEGER,
          metadata JSONB DEFAULT '{}'::jsonb,
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
            source_user_id TEXT,
            level INTEGER,
            metadata JSONB DEFAULT '{}'::jsonb,
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
  `).catch((err) => {
    logger.warn("[Coins] Schema migration (main table) skipped:", { message: err?.message, code: err?.code });
  });
  await runQuery(`ALTER TABLE coin_transactions ADD COLUMN IF NOT EXISTS source_user_id TEXT`).catch((err) => {
    logger.warn("[Coins] Schema migration (source_user_id) skipped:", { message: err?.message });
  });
  await runQuery(`ALTER TABLE coin_transactions ADD COLUMN IF NOT EXISTS level INTEGER`).catch((err) => {
    logger.warn("[Coins] Schema migration (level) skipped:", { message: err?.message });
  });
  await runQuery(
    `ALTER TABLE coin_transactions ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb`
  ).catch((err) => {
    logger.warn("[Coins] Schema migration (metadata) skipped:", { message: err?.message });
  });
  await runQuery(`CREATE INDEX IF NOT EXISTS idx_coin_user ON coin_transactions(user_id, created_at DESC)`).catch((err) => {
    logger.warn("[Coins] Schema migration (idx_coin_user) skipped:", { message: err?.message });
  });
  await runQuery(`CREATE INDEX IF NOT EXISTS idx_coin_reference ON coin_transactions(reference_id)`).catch((err) => {
    logger.warn("[Coins] Schema migration (idx_coin_reference) skipped:", { message: err?.message });
  });
  await runQuery(`CREATE INDEX IF NOT EXISTS idx_coin_source_user ON coin_transactions(source_user_id)`).catch((err) => {
    logger.warn("[Coins] Schema migration (idx_coin_source_user) skipped:", { message: err?.message });
  });
  await runQuery(`CREATE INDEX IF NOT EXISTS idx_coin_level ON coin_transactions(level)`).catch((err) => {
    logger.warn("[Coins] Schema migration (idx_coin_level) skipped:", { message: err?.message });
  });
  await runQuery(`ALTER TABLE users ADD COLUMN IF NOT EXISTS coins DECIMAL(10,2) DEFAULT 0`).catch((err) => {
    logger.warn("[Coins] Schema migration (users.coins) skipped:", { message: err?.message });
  });
  // Expiry + FIFO columns
  await runQuery(`ALTER TABLE coin_transactions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ`).catch((err) => {
    logger.warn("[Coins] Schema migration (expires_at) skipped:", { message: err?.message });
  });
  await runQuery(`ALTER TABLE coin_transactions ADD COLUMN IF NOT EXISTS remaining DECIMAL(10,2)`).catch((err) => {
    logger.warn("[Coins] Schema migration (remaining) skipped:", { message: err?.message });
  });
  await runQuery(`CREATE INDEX IF NOT EXISTS idx_coin_fifo ON coin_transactions(user_id, created_at ASC) WHERE amount > 0 AND remaining > 0`).catch((err) => {
    logger.warn("[Coins] Schema migration (idx_coin_fifo) skipped:", { message: err?.message });
  });
}

// Cached promise pattern — avoids race condition with boolean flag
let _coinSchemaPromise = null;
async function lazyEnsureSchema() {
  if (!_coinSchemaPromise) {
    _coinSchemaPromise = ensureCoinSchema();
  }
  return _coinSchemaPromise;
}

async function ensureEngagementSchema() {
  await runQuery(`
    CREATE TABLE IF NOT EXISTS reward_daily_checkins (
      user_id UUID PRIMARY KEY REFERENCES users(user_id),
      last_checkin_date DATE NOT NULL,
      streak INTEGER NOT NULL DEFAULT 1,
      best_streak INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `).catch((err) => {
    logger.warn("[Coins] Schema migration (reward_daily_checkins) skipped:", { message: err?.message });
  });

  await runQuery(`
    CREATE TABLE IF NOT EXISTS reward_spin_history (
      id SERIAL PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(user_id),
      spin_date DATE NOT NULL,
      reward_amount DECIMAL(10,2) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (user_id, spin_date)
    )
  `).catch((err) => {
    logger.warn("[Coins] Schema migration (reward_spin_history) skipped:", { message: err?.message });
  });

  await runQuery(`
    CREATE TABLE IF NOT EXISTS reward_scratch_claims (
      id SERIAL PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(user_id),
      referral_user_id UUID NOT NULL REFERENCES users(user_id),
      reward_amount DECIMAL(10,2) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (user_id, referral_user_id)
    )
  `).catch((err) => {
    logger.warn("[Coins] Schema migration (reward_scratch_claims) skipped:", { message: err?.message });
  });

  await runQuery(`
    CREATE TABLE IF NOT EXISTS reward_redemptions (
      id SERIAL PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(user_id),
      reward_type VARCHAR(40) NOT NULL,
      post_id TEXT,
      cost DECIMAL(10,2) NOT NULL,
      metadata JSONB,
      status VARCHAR(20) DEFAULT 'redeemed',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `).catch((err) => {
    logger.warn("[Coins] Schema migration (reward_redemptions) skipped:", { message: err?.message });
  });

  await runQuery(
    "CREATE INDEX IF NOT EXISTS idx_reward_redemptions_user ON reward_redemptions(user_id, created_at DESC)",
  ).catch((err) => {
    logger.warn("[Coins] Schema migration (idx_reward_redemptions_user) skipped:", { message: err?.message });
  });

  await runQuery(
    "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS reward_badge VARCHAR(30)",
  ).catch((err) => {
    logger.warn("[Coins] Schema migration (profiles.reward_badge) skipped:", { message: err?.message });
  });
}

let _engagementSchemaPromise = null;
async function lazyEnsureEngagementSchema() {
  if (!_engagementSchemaPromise) {
    _engagementSchemaPromise = ensureEngagementSchema();
  }
  return _engagementSchemaPromise;
}

let _usersReferredByColumnPromise = null;
async function hasUsersReferredByColumn() {
  if (_usersReferredByColumnPromise) {
    return _usersReferredByColumnPromise;
  }

  _usersReferredByColumnPromise = runQuery(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'users'
          AND column_name = 'referred_by'
      ) AS exists
    `
  )
    .then((result) => Boolean(result?.rows?.[0]?.exists))
    .catch((error) => {
      logger.warn("[Coins] Unable to verify users.referred_by column", {
        message: error?.message,
        code: error?.code,
      });
      return false;
    });

  return _usersReferredByColumnPromise;
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
async function addCoins(
  userId,
  amount,
  type,
  referenceId = null,
  description = "",
  options = {},
) {
  await lazyEnsureSchema();
  const { sourceUserId = null, level = null, metadata = null } = options || {};

  // Compute expiry based on coin type (promo vs earned)
  const isPromo = PROMO_COIN_TYPES.has(type);
  const expiryDays = isPromo ? EXPIRY_PROMO_DAYS : EXPIRY_EARNED_DAYS;
  const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Idempotency check inside transaction to prevent race conditions
    if (referenceId) {
      const existing = await client.query(
        "SELECT id FROM coin_transactions WHERE reference_id = $1 LIMIT 1 FOR UPDATE",
        [referenceId],
      );
      if (existing.rows.length > 0) {
        await client.query("ROLLBACK");
        return { applied: false, reason: "duplicate", referenceId };
      }
    }

    await client.query(
      `INSERT INTO coin_transactions (
         user_id, amount, type, reference_id, description, source_user_id, level, metadata, remaining, expires_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        userId,
        Math.abs(amount),
        type,
        referenceId,
        description,
        sourceUserId,
        level,
        metadata || {},
        Math.abs(amount),  // remaining = full amount initially
        expiresAt,
      ],
    );

    const result = await client.query(
      `UPDATE users
       SET coins = COALESCE(coins, 0) + $1,
           updated_at = NOW()
       WHERE user_id = $2
       RETURNING coins`,
      [Math.abs(amount), userId],
    );

    await client.query("COMMIT");

    const newBalance = parseFloat(result.rows[0]?.coins || 0);
    logger.info(`[Coins] +${amount} ${type} for user ${userId} (balance: ${newBalance}, expires: ${expiresAt.toISOString().slice(0,10)})`);
    return { applied: true, newBalance, expiresAt };
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

    // FIFO deduction: consume oldest non-expired coins first
    let toDeduct = Math.abs(amount);
    const fifoRows = await client.query(
      `SELECT id, remaining
       FROM coin_transactions
       WHERE user_id = $1
         AND amount > 0
         AND COALESCE(remaining, amount) > 0
         AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY created_at ASC
       FOR UPDATE`,
      [userId],
    );

    for (const row of fifoRows.rows) {
      if (toDeduct <= 0) break;
      const available = parseFloat(row.remaining ?? row.amount ?? 0);
      if (available <= 0) continue;
      const consume = Math.min(available, toDeduct);
      await client.query(
        `UPDATE coin_transactions SET remaining = COALESCE(remaining, amount) - $1 WHERE id = $2`,
        [consume, row.id],
      );
      toDeduct -= consume;
    }

    // Record the spend transaction
    await client.query(
      `INSERT INTO coin_transactions (user_id, amount, type, reference_id, description)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, -Math.abs(amount), type, referenceId, description],
    );

    const result = await client.query(
      `UPDATE users
       SET coins = COALESCE(coins, 0) - $1,
           updated_at = NOW()
       WHERE user_id = $2
       RETURNING coins`,
      [Math.abs(amount), userId],
    );

    await client.query("COMMIT");

    const newBalance = parseFloat(result.rows[0]?.coins || 0);
    logger.info(`[Coins] -${amount} ${type} for user ${userId} (balance: ${newBalance}, FIFO)`);
    return { applied: true, newBalance };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function getDirectReferralIds(userId) {
  if (!userId) return [];
  const hasColumn = await hasUsersReferredByColumn();
  if (!hasColumn) {
    return [];
  }

  try {
    const result = await runQuery(
      "SELECT user_id FROM users WHERE referred_by::text = $1 ORDER BY created_at ASC",
      [String(userId)],
    );
    return (result.rows || []).map((row) => String(row.user_id));
  } catch (error) {
    logger.warn("[Coins] Failed to load referral relationships", {
      message: error?.message,
      code: error?.code,
    });
    return [];
  }
}

async function getReferralMilestoneStatus(userId) {
  const directIds = await getDirectReferralIds(userId);
  const milestone = REFERRAL_MILESTONES[0];
  if (!milestone) {
    return {
      target: 0,
      reward: 0,
      current: directIds.length,
      claimed: false,
      eligible: false,
    };
  }
  const claimedResult = await runQuery(
    "SELECT 1 FROM coin_transactions WHERE user_id = $1 AND type = $2 LIMIT 1",
    [userId, milestone.type],
  );
  const claimed = claimedResult.rows.length > 0;
  const eligible = directIds.length >= milestone.count;
  return {
    target: milestone.count,
    reward: milestone.reward,
    current: directIds.length,
    claimed,
    eligible,
  };
}

async function applyPostBoost({ userId, postId, boostType, durationDays, source }) {
  await runQuery(`
    CREATE TABLE IF NOT EXISTS post_boosts (
      boost_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      post_id TEXT NOT NULL, user_id TEXT NOT NULL, boost_type TEXT NOT NULL,
      source TEXT DEFAULT 'coins', status TEXT DEFAULT 'active',
      starts_at TIMESTAMPTZ DEFAULT NOW(), expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `).catch((err) => {
    logger.warn("[Coins] Boost schema (post_boosts) skipped:", { message: err?.message });
  });

  const BOOST_LEVELS = { boost: 1, featured: 2, spotlight: 3, top_search: 3 };
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + durationDays);

  await runQuery(
    `INSERT INTO post_boosts (post_id, user_id, boost_type, source, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [postId, userId, boostType, source || "coins", expiresAt],
  );

  await runQuery(
    `UPDATE posts SET boost_level = GREATEST(COALESCE(boost_level, 0), $1) WHERE post_id::text = $2`,
    [BOOST_LEVELS[boostType] || 1, postId],
  ).catch((err) => {
    logger.warn("[Coins] ApplyPostBoost level update (posts.boost_level) skipped:", { message: err?.message });
  });

  return { expiresAt };
}

async function applyReferralMilestoneRewards(userId, directCountOverride = null) {
  await lazyEnsureSchema();
  const directCount =
    typeof directCountOverride === "number"
      ? directCountOverride
      : (await getDirectReferralIds(userId)).length;

  const applied = [];
  for (const milestone of REFERRAL_MILESTONES) {
    if (!milestone || directCount < milestone.count) continue;
    const referenceId = `referral_milestone:${milestone.count}:${userId}`;
    const description = `Referral milestone: ${milestone.count} invites`;
    try {
      const result = await addCoins(
        userId,
        milestone.reward,
        milestone.type,
        referenceId,
        description,
      );
      if (result?.applied) {
        applied.push({ count: milestone.count, reward: milestone.reward });
      }
    } catch (err) {
      logger.warn("[Coins] Failed to apply referral milestone", {
        userId,
        message: err.message,
      });
    }
  }

  return { applied: applied.length > 0, appliedRewards: applied, directCount };
}

// GET /api/coins/balance
exports.getBalance = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  try {
    await lazyEnsureSchema();
    const result = await runQuery(
      "SELECT coins, updated_at FROM users WHERE user_id = $1",
      [userId],
    );
    const balance = parseFloat(result.rows[0]?.coins || 0);
    res.json({
      success: true,
      balance,
      updatedAt: result.rows[0]?.updated_at || null,
    });
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
      `SELECT id, amount, type, description, source_user_id, level, metadata, created_at
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

  const userRes = await runQuery(
    "SELECT membership_plan, current_plan, tier FROM users WHERE user_id = $1",
    [userId],
  ).catch(() => ({ rows: [] }));
  const planName = String(
    userRes.rows[0]?.membership_plan || userRes.rows[0]?.current_plan || userRes.rows[0]?.tier || req?.user?.subscription_tier || req?.user?.tier || "",
  ).toLowerCase();
  const isPremium = planName.includes("premium") || planName.includes("gold") || Boolean(req?.user?.is_demo) || Boolean(userId && String(userId).includes("demo"));
  const costMap = isPremium ? REDEEM_COSTS.premium : REDEEM_COSTS.standard;

  if (!costMap[redeemType]) {
    return res.status(400).json({
      error: "Invalid redeem type",
      options: Object.entries(costMap).map(([type, cost]) => ({ type, cost })),
    });
  }

  if (!postId) {
    return res.status(400).json({ error: "postId is required" });
  }

  const cost = costMap[redeemType];
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
    `).catch((err) => {
      logger.warn("[Coins] Redeem boost schema (post_boosts) skipped:", { message: err?.message });
    });

    await runQuery(
      `INSERT INTO post_boosts (post_id, user_id, boost_type, source, expires_at)
       VALUES ($1, $2, $3, 'coins', $4)`,
      [postId, userId, redeemType, expiresAt],
    );

    await runQuery(
      `UPDATE posts SET boost_level = GREATEST(COALESCE(boost_level, 0), $1) WHERE post_id::text = $2`,
      [BOOST_LEVELS[redeemType], postId],
    ).catch((err) => {
      logger.warn("[Coins] Boost level update (posts.boost_level) skipped:", { message: err?.message });
    });

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

// GET /api/coins/engagement - daily check-in + spin + scratch status
exports.getEngagementStatus = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  try {
    await lazyEnsureSchema();
    await lazyEnsureEngagementSchema();

    const todayKey = getIstDateKey();
    const yesterdayKey = getIstDateKey(new Date(Date.now() - 24 * 60 * 60 * 1000));

    const [checkinRes, spinRes, scratchRes] = await Promise.all([
      runQuery(
        "SELECT last_checkin_date, streak, best_streak FROM reward_daily_checkins WHERE user_id = $1 LIMIT 1",
        [userId],
      ),
      runQuery(
        "SELECT reward_amount, spin_date, created_at FROM reward_spin_history WHERE user_id = $1 AND spin_date = $2 LIMIT 1",
        [userId, todayKey],
      ),
      runQuery(
        "SELECT referral_user_id FROM reward_scratch_claims WHERE user_id = $1",
        [userId],
      ),
    ]);

    const checkinRow = checkinRes.rows[0] || null;
    const lastKey = checkinRow?.last_checkin_date
      ? String(checkinRow.last_checkin_date).slice(0, 10)
      : null;
    const rawStreak = Number(checkinRow?.streak || 0);
    const bestStreak = Number(checkinRow?.best_streak || 0);
    const hasCheckedInToday = lastKey === todayKey;
    const isStreakActive = lastKey === todayKey || lastKey === yesterdayKey;
    const currentDay = isStreakActive ? Math.max(1, Math.min(rawStreak || 1, 7)) : 1;
    const nextStreak = hasCheckedInToday
      ? Math.min(rawStreak + 1, 7)
      : lastKey === yesterdayKey
        ? Math.min(rawStreak + 1, 7)
        : 1;
    const nextReward = DAILY_CHECKIN_REWARDS[nextStreak - 1] || DAILY_CHECKIN_REWARDS[0];

    const spinRow = spinRes.rows[0] || null;
    const hasSpunToday = Boolean(spinRow);
    const spinReward = spinRow ? Number(spinRow.reward_amount || 0) : 0;

    const directIds = await getDirectReferralIds(userId);
    const claimedScratch = new Set(
      (scratchRes.rows || []).map((row) => String(row.referral_user_id)),
    );
    const availableScratch = Math.max(0, directIds.length - claimedScratch.size);

    const milestone = REFERRAL_MILESTONES[0];
    const milestoneClaimed = milestone
      ? await runQuery(
          "SELECT 1 FROM coin_transactions WHERE user_id = $1 AND type = $2 LIMIT 1",
          [userId, milestone.type],
        )
      : { rows: [] };

    const referralMilestone = milestone
      ? {
          target: milestone.count,
          reward: milestone.reward,
          current: directIds.length,
          claimed: milestoneClaimed.rows.length > 0,
          eligible: directIds.length >= milestone.count,
        }
      : {
          target: 0,
          reward: 0,
          current: directIds.length,
          claimed: false,
          eligible: false,
        };

    res.json({
      dailyCheckIn: {
        hasCheckedInToday,
        streak: rawStreak || 0,
        currentDay,
        bestStreak,
        lastCheckinDate: lastKey,
        nextReward,
        nextCheckInAt: getNextIstMidnightIso(),
      },
      spin: {
        hasSpunToday,
        reward: spinReward,
        spinDate: spinRow?.spin_date ? String(spinRow.spin_date).slice(0, 10) : null,
        nextSpinAt: getNextIstMidnightIso(),
      },
      scratch: {
        available: availableScratch,
        totalReferrals: directIds.length,
        claimed: claimedScratch.size,
      },
      referralMilestone,
    });
  } catch (err) {
    logger.error("[Coins] engagement status error:", err);
    res.status(500).json({ error: "Failed to load engagement status" });
  }
};

// POST /api/coins/daily-checkin
exports.claimDailyCheckIn = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  try {
    await lazyEnsureSchema();
    await lazyEnsureEngagementSchema();

    const todayKey = getIstDateKey();
    const yesterdayKey = getIstDateKey(new Date(Date.now() - 24 * 60 * 60 * 1000));

    const checkinRes = await runQuery(
      "SELECT last_checkin_date, streak, best_streak FROM reward_daily_checkins WHERE user_id = $1 LIMIT 1",
      [userId],
    );
    const row = checkinRes.rows[0] || null;
    const lastKey = row?.last_checkin_date
      ? String(row.last_checkin_date).slice(0, 10)
      : null;

    const nextCheckInAt = getNextIstMidnightIso();

    if (lastKey === todayKey) {
      const payload = {
        success: true,
        alreadyCheckedIn: true,
        hasCheckedInToday: true,
        streak: row?.streak || 0,
        nextCheckInAt,
      };
      if (process.env.NODE_ENV !== "production") {
        return res.status(200).json(payload);
      }
      return res.status(409).json({
        error: "Already checked in today",
        hasCheckedInToday: true,
        streak: row?.streak || 0,
        nextCheckInAt,
      });
    }

    let nextStreak = 1;
    if (lastKey === yesterdayKey) {
      nextStreak = Math.min(Number(row?.streak || 0) + 1, 7);
    }

    const reward = DAILY_CHECKIN_REWARDS[nextStreak - 1] || DAILY_CHECKIN_REWARDS[0];
    const referenceId = `daily_checkin:${userId}:${todayKey}`;

    const result = await addCoins(
      userId,
      reward,
      "daily_checkin",
      referenceId,
      `Daily check-in day ${nextStreak}`,
    );

    if (!result.applied) {
      const payload = {
        success: true,
        alreadyCheckedIn: true,
        hasCheckedInToday: true,
        streak: row?.streak || 0,
        nextCheckInAt,
      };
      if (process.env.NODE_ENV !== "production") {
        return res.status(200).json(payload);
      }
      return res.status(409).json({
        error: "Duplicate check-in",
        hasCheckedInToday: true,
        nextCheckInAt,
      });
    }

    const bestStreak = Math.max(Number(row?.best_streak || 0), nextStreak);
    await runQuery(
      `INSERT INTO reward_daily_checkins (user_id, last_checkin_date, streak, best_streak, updated_at)
       VALUES ($1, $2::date, $3, $4, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET last_checkin_date = EXCLUDED.last_checkin_date,
                     streak = EXCLUDED.streak,
                     best_streak = GREATEST(reward_daily_checkins.best_streak, EXCLUDED.best_streak),
                     updated_at = NOW()`,
      [userId, todayKey, nextStreak, bestStreak],
    );

    res.json({
      success: true,
      reward,
      streak: nextStreak,
      newBalance: result.newBalance,
      nextCheckInAt,
    });
  } catch (err) {
    logger.error("[Coins] daily check-in error:", err);
    res.status(500).json({ error: "Failed to claim daily check-in" });
  }
};

// POST /api/coins/spin
exports.spinWheel = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  try {
    await lazyEnsureSchema();
    await lazyEnsureEngagementSchema();

    const todayKey = getIstDateKey();
    const existing = await runQuery(
      "SELECT reward_amount FROM reward_spin_history WHERE user_id = $1 AND spin_date = $2 LIMIT 1",
      [userId, todayKey],
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        error: "Already spun today",
        reward: Number(existing.rows[0]?.reward_amount || 0),
        nextSpinAt: getNextIstMidnightIso(),
      });
    }

    const reward = pickWeightedReward(SPIN_REWARD_POOL);
    const referenceId = `spin:${userId}:${todayKey}`;
    let newBalance = 0;

    if (reward > 0) {
      const result = await addCoins(
        userId,
        reward,
        "spin_wheel",
        referenceId,
        `Daily spin wheel reward (+${reward} coins)`,
      );
      if (!result.applied) {
        return res.status(409).json({ error: "Duplicate spin" });
      }
      newBalance = result.newBalance;
    } else if (reward < 0) {
      const penaltyCost = Math.abs(reward);
      const result = await spendCoins(
        userId,
        penaltyCost,
        "spin_penalty",
        referenceId,
        `Daily spin wheel penalty (-${penaltyCost} coins)`,
      ).catch(() => ({ applied: false, newBalance: 0 }));
      newBalance = result.newBalance ?? 0;
    } else {
      // 0 coins - just fetch balance
      const balRes = await runQuery("SELECT coins FROM users WHERE user_id = $1", [userId]);
      newBalance = parseFloat(balRes.rows[0]?.coins || 0);
    }

    await runQuery(
      "INSERT INTO reward_spin_history (user_id, spin_date, reward_amount) VALUES ($1, $2::date, $3)",
      [userId, todayKey, reward],
    );

    res.json({
      success: true,
      reward,
      newBalance,
      nextSpinAt: getNextIstMidnightIso(),
    });
  } catch (err) {
    logger.error("[Coins] spin wheel error:", err);
    res.status(500).json({ error: "Failed to spin the wheel" });
  }
};

// POST /api/coins/scratch
exports.claimScratchCard = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  try {
    await lazyEnsureSchema();
    await lazyEnsureEngagementSchema();

    const directIds = await getDirectReferralIds(userId);
    if (!directIds.length) {
      return res.status(404).json({ error: "No referrals found for scratch rewards" });
    }

    const claimedRes = await runQuery(
      "SELECT referral_user_id FROM reward_scratch_claims WHERE user_id = $1",
      [userId],
    );
    const claimedSet = new Set(
      (claimedRes.rows || []).map((row) => String(row.referral_user_id)),
    );

    const pending = directIds.filter((id) => !claimedSet.has(String(id)));
    if (!pending.length) {
      return res.status(409).json({ error: "No scratch cards available" });
    }

    const referralUserId = pending[0];
    const reward = pickWeightedReward(SCRATCH_REWARD_POOL);
    const referenceId = `scratch:${userId}:${referralUserId}`;
    const result = await addCoins(
      userId,
      reward,
      "scratch_card",
      referenceId,
      "Scratch card reward",
    );

    if (!result.applied) {
      return res.status(409).json({ error: "Duplicate scratch claim" });
    }

    await runQuery(
      "INSERT INTO reward_scratch_claims (user_id, referral_user_id, reward_amount) VALUES ($1, $2, $3)",
      [userId, referralUserId, reward],
    );

    res.json({
      success: true,
      reward,
      newBalance: result.newBalance,
      remaining: Math.max(0, pending.length - 1),
    });
  } catch (err) {
    logger.error("[Coins] scratch card error:", err);
    res.status(500).json({ error: "Failed to claim scratch reward" });
  }
};

// POST /api/coins/store-redeem
exports.redeemStoreReward = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  const rewardType = String(req.body?.type || "").toLowerCase();
  const postId = req.body?.postId || null;

  if (!STORE_REDEEM_COSTS[rewardType]) {
    return res.status(400).json({
      error: "Invalid reward type",
      options: Object.entries(STORE_REDEEM_COSTS).map(([type, cost]) => ({ type, cost })),
    });
  }

  if (STORE_REDEEM_REQUIRES_POST.has(rewardType) && !postId) {
    return res.status(400).json({ error: "postId is required for this reward" });
  }

  try {
    await lazyEnsureSchema();
    await lazyEnsureEngagementSchema();

    if (postId) {
      const ownershipCheck = await runQuery(
        "SELECT user_id, status FROM posts WHERE post_id::text = $1 LIMIT 1",
        [postId],
      );
      if (!ownershipCheck.rows.length) {
        return res.status(404).json({ error: "Post not found" });
      }
      if (String(ownershipCheck.rows[0].user_id) !== String(userId)) {
        return res.status(403).json({ error: "You can only redeem rewards for your own posts" });
      }
      if (ownershipCheck.rows[0].status !== "active") {
        return res.status(400).json({ error: "Only active posts can be boosted" });
      }
    }

    const cost = STORE_REDEEM_COSTS[rewardType];
    const idempotencyKey =
      req.body?.idempotencyKey ||
      req.body?.requestId ||
      req.headers["x-idempotency-key"] ||
      null;
    const referenceId = idempotencyKey
      ? `store:${rewardType}:${idempotencyKey}`
      : `store:${rewardType}:${userId}:${postId || "profile"}:${Date.now()}`;

    const spendResult = await spendCoins(
      userId,
      cost,
      `store_${rewardType}`,
      referenceId,
      `Redeemed ${cost} coins for ${rewardType}`,
    );

    if (!spendResult.applied) {
      if (spendResult.reason === "insufficient_balance") {
        return res.status(400).json({
          error: `Insufficient coins. Need ${cost}, have ${spendResult.currentBalance}.`,
          required: cost,
          balance: spendResult.currentBalance,
        });
      }
      return res.status(409).json({ error: "Duplicate redemption" });
    }

    let fulfillment = {};
    if (rewardType === "badge") {
      await runQuery(
        `INSERT INTO profiles (user_id, reward_badge)
         VALUES ($1, 'elite')
         ON CONFLICT (user_id)
         DO UPDATE SET reward_badge = 'elite'`,
        [String(userId)],
      );
      fulfillment = { badge: "elite" };
    }

    if (rewardType === "boost") {
      const boost = await applyPostBoost({
        userId,
        postId,
        boostType: "boost",
        durationDays: 1,
        source: "store",
      });
      fulfillment = { boostType: "boost", expiresAt: boost.expiresAt };
    }

    if (rewardType === "top_search") {
      const boost = await applyPostBoost({
        userId,
        postId,
        boostType: "spotlight",
        durationDays: 7,
        source: "store",
      });
      fulfillment = { boostType: "spotlight", expiresAt: boost.expiresAt };
    }

    await runQuery(
      `INSERT INTO reward_redemptions (user_id, reward_type, post_id, cost, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, rewardType, postId, cost, fulfillment || null],
    ).catch((err) => {
      logger.warn("[Coins] Store redeem record (reward_redemptions) skipped:", { message: err?.message });
    });

    res.json({
      success: true,
      rewardType,
      cost,
      newBalance: spendResult.newBalance,
      fulfillment,
    });
  } catch (err) {
    logger.error("[Coins] redeem store reward error:", err);
    res.status(500).json({ error: "Failed to redeem reward" });
  }
};

// POST /api/coins/referral-milestones
exports.claimReferralMilestones = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  try {
    const outcome = await applyReferralMilestoneRewards(userId);
    const status = await getReferralMilestoneStatus(userId);
    const balanceResult = await runQuery("SELECT coins FROM users WHERE user_id = $1", [
      userId,
    ]);
    const balance = parseFloat(balanceResult.rows[0]?.coins || 0);
    res.json({
      success: true,
      applied: outcome.applied,
      appliedRewards: outcome.appliedRewards,
      milestone: status,
      balance,
    });
  } catch (err) {
    logger.error("[Coins] referral milestone claim error:", err);
    res.status(500).json({ error: "Failed to claim referral milestone" });
  }
};

// Export internal functions for use by other services
exports.addCoins = addCoins;
exports.spendCoins = spendCoins;
exports.applyReferralMilestoneRewards = applyReferralMilestoneRewards;
exports.EARN_AMOUNTS = EARN_AMOUNTS;
exports.REDEEM_COSTS = REDEEM_COSTS;
exports.DAILY_EARN_CAPS = DAILY_EARN_CAPS;

// GET /api/coins/rewards-config — public config for frontend display
// ---------- Coin-to-Rupee conversion ----------
const COINS_PER_RUPEE = 100; // 100 coins = ₹1

exports.COINS_PER_RUPEE = COINS_PER_RUPEE;

// ---------- Expiry policy ----------
const EXPIRY_EARNED_DAYS = 365;   // earned coins expire in 12 months
const EXPIRY_PROMO_DAYS = 90;     // promo/bonus coins expire in 90 days
const PROMO_COIN_TYPES = new Set([
  "welcome_bonus", "daily_checkin", "spin_wheel", "scratch_card",
  "referral_milestone_3",
]);

exports.EXPIRY_EARNED_DAYS = EXPIRY_EARNED_DAYS;
exports.EXPIRY_PROMO_DAYS = EXPIRY_PROMO_DAYS;
exports.PROMO_COIN_TYPES = PROMO_COIN_TYPES;

// GET /api/coins/rewards-config — public config for frontend display
exports.getRewardsConfig = async (req, res) => {
  const {
    CHAIN_COINS: chainCoins,
    REFERRAL_CAP_DAILY: refCapDaily,
    REFERRAL_CAP_MONTHLY: refCapMonthly,
    REFERRAL_CAP_LIFETIME: refCapLifetime,
  } = require("../services/referralJoinRewards");

  const referralLadder = chainCoins.map((coins, idx) => ({
    level: idx + 1,
    coins,
    label: idx === 0 ? "Direct Referral" : `Level ${idx + 1}`,
  }));

  res.json({
    success: true,
    version: "2.0.0",
    currency: "INR",
    coinsPerRupee: COINS_PER_RUPEE,
    earning: {
      welcome_bonus: EARN_AMOUNTS.welcome_bonus,
      post: EARN_AMOUNTS.post,
      sale: EARN_AMOUNTS.sale,
      purchase: EARN_AMOUNTS.purchase,
      first_listing: EARN_AMOUNTS.first_listing,
      first_sale: EARN_AMOUNTS.first_sale,
      five_star_review: EARN_AMOUNTS.five_star_review,
    },
    dailyEarnCaps: DAILY_EARN_CAPS,
    referralLadder,
    referralCaps: {
      daily: refCapDaily,
      monthly: refCapMonthly,
      lifetime: refCapLifetime,
    },
    referralValidation: {
      tier1: "Referred user completes a real transaction (buy or sell)",
      tier2: "Referred user creates 2+ listings AND is verified (phone/email/Aadhaar)",
      notRewarded: "Invite-only signups, single listings, unverified users",
    },
    dailyCheckinRewards: DAILY_CHECKIN_REWARDS,
    spinRewardPool: SPIN_REWARD_POOL.map((s) => ({ amount: s.amount, weight: s.weight })),
    scratchRewardPool: SCRATCH_REWARD_POOL.map((s) => ({ amount: s.amount, weight: s.weight })),
    tiers: [
      { name: "Bronze", min: 0, max: 499, perks: ["Basic marketplace access"] },
      { name: "Silver", min: 500, max: 1999, perks: ["Bronze perks", "Priority support", "5% boost discount"] },
      { name: "Gold", min: 2000, max: 4999, perks: ["Silver perks", "Featured seller badge", "10% boost discount"] },
      { name: "Platinum", min: 5000, max: null, perks: ["Gold perks", "Premium badge", "20% boost discount", "Early access to features"] },
    ],
    storeItems: [
      { type: "boost", cost: STORE_REDEEM_COSTS.boost, label: "Listing Boost", desc: "Top of search for 1 day", requiresPost: true },
      { type: "badge", cost: STORE_REDEEM_COSTS.badge, label: "Elite Seller Badge", desc: "Elite badge on profile & posts", requiresPost: false },
      { type: "top_search", cost: STORE_REDEEM_COSTS.top_search, label: "Top Search Spotlight", desc: "Spotlight for 7 days", requiresPost: true },
    ],
    expiry: {
      earnedDays: EXPIRY_EARNED_DAYS,
      promoDays: EXPIRY_PROMO_DAYS,
      promoTypes: Array.from(PROMO_COIN_TYPES),
      spendOrder: "FIFO (oldest coins spent first)",
    },
    boostCosts: REDEEM_COSTS,
    milestones: REFERRAL_MILESTONES,
  });
};

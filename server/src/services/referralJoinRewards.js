const pool = require("../config/db");
const logger = require("../utils/logger");
const { getReferralChain } = require("./referralChainRewards");
const { addCoins } = require("../controllers/coinController");
const {
  parseOptionalString,
  parsePositiveInt,
  parsePositiveNumber,
  parseBoolean,
} = require("../utils/parseHelpers");

const DEFAULT_DIRECT_COINS = parsePositiveNumber(
  process.env.REFERRAL_DIRECT_REWARD,
  100,
);
const DEFAULT_INDIRECT_COINS = parsePositiveNumber(
  process.env.REFERRAL_INDIRECT_REWARD,
  10,
);
const DEFAULT_MAX_CHAIN_DEPTH = parsePositiveInt(
  process.env.REFERRAL_CHAIN_MAX_DEPTH,
  5,
);
const REQUIRE_ACTIVITY_DEFAULT = parseBoolean(
  process.env.REFERRAL_REQUIRE_ACTIVITY,
  true,
);

// ---------- Referral earning caps (anti-abuse) ----------
const REFERRAL_CAP_DAILY = parsePositiveInt(process.env.REFERRAL_CAP_DAILY, 500);
const REFERRAL_CAP_MONTHLY = parsePositiveInt(process.env.REFERRAL_CAP_MONTHLY, 5000);
const REFERRAL_CAP_LIFETIME = parsePositiveInt(process.env.REFERRAL_CAP_LIFETIME, 50000);

function parseChainCoinsFromEnv() {
  const raw = parseOptionalString(process.env.REFERRAL_CHAIN_COINS);
  if (!raw) return null;
  const parsed = raw
    .split(",")
    .map((entry) => Number.parseFloat(entry.trim()))
    .filter((value) => Number.isFinite(value) && value > 0);
  return parsed.length ? parsed : null;
}

// Reward ladder: L1=100, L2=40, L3=20, L4=10, L5=5
const CHAIN_COINS =
  parseChainCoinsFromEnv() || [100, 40, 20, 10, 5];

const REFERRAL_CHAIN_MAX_DEPTH = parsePositiveInt(
  process.env.REFERRAL_CHAIN_MAX_DEPTH,
  Math.min(DEFAULT_MAX_CHAIN_DEPTH, CHAIN_COINS.length),
);

function getCoinsForDepth(depth) {
  const normalizedDepth = Number.parseInt(depth, 10);
  if (!Number.isFinite(normalizedDepth) || normalizedDepth < 1) return 0;
  return CHAIN_COINS[normalizedDepth - 1] || 0;
}

/**
 * Check referral earning caps for a user (daily / monthly / lifetime).
 * Returns { allowed: boolean, remaining, dailyUsed, monthlyUsed, lifetimeUsed }
 */
async function checkReferralCaps(client, userId) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  let dailyUsed = 0, monthlyUsed = 0, lifetimeUsed = 0;
  try {
    const dailyRes = await client.query(
      `SELECT COALESCE(SUM(reward_coins), 0)::int AS total
       FROM referral_rewards
       WHERE referrer_id::text = $1 AND created_at >= $2`,
      [String(userId), todayStart],
    );
    dailyUsed = dailyRes.rows[0]?.total || 0;

    const monthlyRes = await client.query(
      `SELECT COALESCE(SUM(reward_coins), 0)::int AS total
       FROM referral_rewards
       WHERE referrer_id::text = $1 AND created_at >= $2`,
      [String(userId), monthStart],
    );
    monthlyUsed = monthlyRes.rows[0]?.total || 0;

    const lifetimeRes = await client.query(
      `SELECT COALESCE(SUM(reward_coins), 0)::int AS total
       FROM referral_rewards
       WHERE referrer_id::text = $1`,
      [String(userId)],
    );
    lifetimeUsed = lifetimeRes.rows[0]?.total || 0;
  } catch (err) {
    if (!isUndefinedTableError(err)) {
      logger.warn("[ReferralJoinRewards] Cap check failed", { message: err.message });
    }
  }

  const dailyRemaining = Math.max(0, REFERRAL_CAP_DAILY - dailyUsed);
  const monthlyRemaining = Math.max(0, REFERRAL_CAP_MONTHLY - monthlyUsed);
  const lifetimeRemaining = Math.max(0, REFERRAL_CAP_LIFETIME - lifetimeUsed);
  const remaining = Math.min(dailyRemaining, monthlyRemaining, lifetimeRemaining);

  return {
    allowed: remaining > 0,
    remaining,
    dailyUsed,
    monthlyUsed,
    lifetimeUsed,
    caps: { daily: REFERRAL_CAP_DAILY, monthly: REFERRAL_CAP_MONTHLY, lifetime: REFERRAL_CAP_LIFETIME },
  };
}

const toBoolean = (value) => {
  if (value === true) return true;
  if (value === false) return false;
  const normalized = String(value || "").trim().toLowerCase();
  return ["true", "1", "yes", "on"].includes(normalized);
};

async function isUserVerified(client, userId) {
  const normalizedUserId = parseOptionalString(userId);
  if (!normalizedUserId) return false;
  try {
    const result = await client.query(
      `SELECT to_jsonb(u) AS payload
       FROM users u
       WHERE u.user_id::text = $1
       LIMIT 1`,
      [normalizedUserId],
    );
    if (!result.rows.length) return false;
    const payload = result.rows[0]?.payload || {};
    const phoneVerified = toBoolean(payload.phone_verified);
    const emailVerified = toBoolean(payload.email_verified);
    const aadhaarVerified = toBoolean(payload.aadhaar_verified);
    const aadhaarStatus = String(payload.aadhaar_status || "").toLowerCase();
    const kycStatus = String(payload.kyc_status || "").toLowerCase();
    return (
      phoneVerified ||
      emailVerified ||
      aadhaarVerified ||
      aadhaarStatus === "verified" ||
      aadhaarStatus === "approved" ||
      kycStatus === "verified"
    );
  } catch (err) {
    logger.warn("[ReferralJoinRewards] Verification check failed", { message: err.message });
    return false;
  }
}

function isUndefinedTableError(error) {
  return String(error?.code || "").toUpperCase() === "42P01";
}

async function hasUserActivity(client, userId) {
  if (!userId) return false;

  // Tier 1 (strongest signal): Completed a real transaction as buyer or seller
  let hasTransaction = false;
  try {
    const txResult = await client.query(
      `SELECT 1
       FROM transactions
       WHERE (buyer_id::text = $1 OR seller_id::text = $1)
         AND status IN ('completed', 'success')
       LIMIT 1`,
      [userId],
    );
    hasTransaction = txResult.rows.length > 0;
  } catch (err) {
    if (!isUndefinedTableError(err)) {
      logger.warn("[ReferralJoinRewards] Transaction activity check failed", {
        message: err.message,
      });
    }
  }

  if (hasTransaction) return true;

  // Tier 2 (moderate signal): Created 2+ listings AND is verified
  // A single post is too easy to game — require multiple to show intent
  let hasMultiplePosts = false;
  try {
    const postResult = await client.query(
      "SELECT COUNT(*)::int AS cnt FROM posts WHERE user_id::text = $1",
      [userId],
    );
    hasMultiplePosts = (postResult.rows[0]?.cnt || 0) >= 2;
  } catch (err) {
    if (!isUndefinedTableError(err)) {
      logger.warn("[ReferralJoinRewards] Post activity check failed", { message: err.message });
    }
  }

  if (hasMultiplePosts) {
    const verified = await isUserVerified(client, userId);
    return verified;
  }

  return false;
}

async function recordReferralReward(client, { referrerId, referredUserId, depth, reward }) {
  try {
    await client.query(
      `INSERT INTO referral_rewards (referrer_id, referred_user_id, level, reward_coins)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (referrer_id, referred_user_id, level) DO NOTHING`,
      [referrerId, referredUserId, depth, reward],
    );
  } catch (err) {
    if (!isUndefinedTableError(err)) {
      logger.warn("[ReferralJoinRewards] Failed to record referral reward", {
        message: err.message,
      });
    }
  }
}

async function applyReferralJoinCoinRewards({
  subjectUserId,
  maxDepth = REFERRAL_CHAIN_MAX_DEPTH,
  requireVerified = true,
  requireActivity = REQUIRE_ACTIVITY_DEFAULT,
  context = {},
}) {
  const normalizedUserId = parseOptionalString(subjectUserId);
  if (!normalizedUserId) return { applied: false, reason: "missing_user" };

  const client = await pool.connect();
  try {
    if (requireVerified) {
      const verified = await isUserVerified(client, normalizedUserId);
      if (!verified) {
        return { applied: false, reason: "unverified" };
      }
    }

    if (requireActivity) {
      const active = await hasUserActivity(client, normalizedUserId);
      if (!active) {
        return { applied: false, reason: "pending_activity" };
      }
    }

    const chain = await getReferralChain(client, normalizedUserId, maxDepth);
    if (!chain.length) {
      return { applied: false, reason: "no_chain" };
    }

    const applied = [];
    for (const node of chain) {
      const ancestorId = parseOptionalString(node.ancestor_user_id);
      if (!ancestorId || ancestorId === normalizedUserId) continue;
      const depth = Number.parseInt(node.depth, 10);
      let reward = getCoinsForDepth(depth);
      if (!reward) continue;

      // --- Enforce referral earning caps ---
      const caps = await checkReferralCaps(client, ancestorId);
      if (!caps.allowed) {
        logger.info(`[ReferralJoinRewards] Skipping L${depth} reward for ${ancestorId}: cap reached`, {
          dailyUsed: caps.dailyUsed, monthlyUsed: caps.monthlyUsed, lifetimeUsed: caps.lifetimeUsed,
        });
        continue;
      }
      // Clamp reward to remaining cap budget
      reward = Math.min(reward, caps.remaining);
      if (reward <= 0) continue;

      const referenceId = `referral_join:l${depth}:${normalizedUserId}:${ancestorId}`;
      const description = `Level ${depth} referral join reward for ${normalizedUserId}`;
      try {
        const metadata = {
          trigger: context.trigger || "signup",
          referralCode: context.referralCode || null,
          ipAddress: context.ipAddress || null,
          deviceId: context.deviceId || null,
        };
        const result = await addCoins(
          ancestorId,
          reward,
          `referral_l${depth}`,
          referenceId,
          description,
          {
            sourceUserId: normalizedUserId,
            level: depth,
            metadata,
          },
        );
        if (result?.applied) {
          await recordReferralReward(client, {
            referrerId: ancestorId,
            referredUserId: normalizedUserId,
            depth,
            reward,
          });
          applied.push({ ancestorId, depth, reward });
        }
      } catch (err) {
        logger.warn("[ReferralJoinRewards] Failed to add coins", {
          ancestorId,
          depth,
          message: err.message,
        });
      }
    }

    return { applied: applied.length > 0, appliedCount: applied.length, applied };
  } finally {
    client.release();
  }
}

module.exports = {
  applyReferralJoinCoinRewards,
  isUserVerified,
  checkReferralCaps,
  CHAIN_COINS,
  REFERRAL_CAP_DAILY,
  REFERRAL_CAP_MONTHLY,
  REFERRAL_CAP_LIFETIME,
};

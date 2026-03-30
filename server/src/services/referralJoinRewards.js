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
  50,
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

function parseChainCoinsFromEnv() {
  const raw = parseOptionalString(process.env.REFERRAL_CHAIN_COINS);
  if (!raw) return null;
  const parsed = raw
    .split(",")
    .map((entry) => Number.parseFloat(entry.trim()))
    .filter((value) => Number.isFinite(value) && value > 0);
  return parsed.length ? parsed : null;
}

const CHAIN_COINS =
  parseChainCoinsFromEnv() ||
  [DEFAULT_DIRECT_COINS, ...Array(Math.max(DEFAULT_MAX_CHAIN_DEPTH - 1, 0)).fill(DEFAULT_INDIRECT_COINS)];

const REFERRAL_CHAIN_MAX_DEPTH = parsePositiveInt(
  process.env.REFERRAL_CHAIN_MAX_DEPTH,
  Math.min(DEFAULT_MAX_CHAIN_DEPTH, CHAIN_COINS.length),
);

function getCoinsForDepth(depth) {
  const normalizedDepth = Number.parseInt(depth, 10);
  if (!Number.isFinite(normalizedDepth) || normalizedDepth < 1) return 0;
  return CHAIN_COINS[normalizedDepth - 1] || 0;
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
  let hasPost = false;
  let hasTransaction = false;

  try {
    const postResult = await client.query(
      "SELECT 1 FROM posts WHERE user_id::text = $1 LIMIT 1",
      [userId],
    );
    hasPost = postResult.rows.length > 0;
  } catch (err) {
    if (!isUndefinedTableError(err)) {
      logger.warn("[ReferralJoinRewards] Post activity check failed", { message: err.message });
    }
  }

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

  return hasPost || hasTransaction;
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
      const reward = getCoinsForDepth(depth);
      if (!reward) continue;

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

module.exports = { applyReferralJoinCoinRewards, isUserVerified };

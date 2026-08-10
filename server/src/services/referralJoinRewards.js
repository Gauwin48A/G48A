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
  4,
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

// Reward ladder: L1=100, L2=10, L3=10, L4=10 (L1 direct + 3 indirect levels)
const CHAIN_COINS =
  parseChainCoinsFromEnv() || [100, 10, 10, 10];

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

  try {
    const result = await client.query(
      `SELECT 1
       FROM user_subscriptions
       WHERE user_id::text = $1
         AND status = 'ACTIVE'
         AND end_date > NOW()
       LIMIT 1`,
      [userId],
    );
    return result.rows.length > 0;
  } catch (err) {
    if (!isUndefinedTableError(err)) {
      logger.warn("[ReferralJoinRewards] Subscription activity check failed", {
        message: err.message,
      });
    }
    return false;
  }
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

    // Award 100 Welcome Coins to the referred user (subjectUserId) if they signed up via referral
    try {
      const userRes = await client.query(
        `SELECT referred_by FROM users WHERE user_id::text = $1 LIMIT 1`,
        [normalizedUserId]
      );
      const referrerId = userRes.rows[0]?.referred_by;
      
      if (referrerId) {
        const rewardCheck = await client.query(
          `SELECT 1 FROM coin_transactions WHERE user_id::text = $1 AND type = 'referral_join_bonus' LIMIT 1`,
          [normalizedUserId]
        );
        
        if (rewardCheck.rows.length === 0) {
          await addCoins(
            normalizedUserId,
            100,
            "referral_join_bonus",
            `referral_join_bonus:${normalizedUserId}`,
            "Welcome bonus for signing up via referral link"
          );
          logger.info(`[ReferralJoinRewards] Awarded 100 welcome coins to referred user ${normalizedUserId}`);
        }
      }
    } catch (welcomeErr) {
      logger.warn("[ReferralJoinRewards] Failed to award welcome coins to referred user:", welcomeErr.message);
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

      // Handle L1 Direct Referral Batching (10 referrals = 1000 coins)
      if (depth === 1) {
        try {
          const checkResult = await client.query(
            `SELECT 1 FROM referral_rewards WHERE referrer_id::text = $1 AND referred_user_id::text = $2 AND level = 1`,
            [ancestorId, normalizedUserId]
          );
          
          if (checkResult.rows.length === 0) {
            await client.query(
              `INSERT INTO referral_rewards (referrer_id, referred_user_id, level, reward_coins)
               VALUES ($1, $2, 1, 0.00)
               ON CONFLICT (referrer_id, referred_user_id, level) DO NOTHING`,
              [ancestorId, normalizedUserId]
            );
            
            const countResult = await client.query(
              `SELECT COUNT(*) AS total FROM referral_rewards WHERE referrer_id::text = $1 AND level = 1`,
              [ancestorId]
            );
            const totalReferrals = parseInt(countResult.rows[0]?.total || 0, 10);
            
            if (totalReferrals > 0 && totalReferrals % 10 === 0) {
              const batchReferenceId = `referral_batch_10:${ancestorId}:${totalReferrals}`;
              const batchDescription = `Completed a batch of 10 direct referrals (Total: ${totalReferrals} referrals)`;
              
              const metadata = {
                trigger: context.trigger || "signup",
                referralCode: context.referralCode || null,
                ipAddress: context.ipAddress || null,
                deviceId: context.deviceId || null,
                batch_count: totalReferrals
              };
              
              const result = await addCoins(
                ancestorId,
                1000,
                "referral_l1_batch",
                batchReferenceId,
                batchDescription,
                {
                  sourceUserId: normalizedUserId,
                  level: 1,
                  metadata
                }
              );
              
              if (result?.applied) {
                await client.query(
                  `UPDATE referral_rewards SET reward_coins = 1000.00
                   WHERE referrer_id::text = $1 AND referred_user_id::text = $2 AND level = 1`,
                  [ancestorId, normalizedUserId]
                );
                applied.push({ ancestorId, depth: 1, reward: 1000 });
              }
            } else {
              logger.info(`[ReferralJoinRewards] Registered L1 referral for ${ancestorId}. Batch progress: ${totalReferrals}/10 completed.`);
              applied.push({ ancestorId, depth: 1, reward: 0 });
            }
          }
        } catch (err) {
          logger.warn("[ReferralJoinRewards] Failed to process L1 batch referral", {
            ancestorId,
            message: err.message
          });
        }
        continue;
      }

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

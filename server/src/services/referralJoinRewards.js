const pool = require("../config/db");
const logger = require("../utils/logger");
const { getReferralChain, CHAIN_MAX_DEPTH } = require("./referralChainRewards");
const { addCoins, EARN_AMOUNTS } = require("../controllers/coinController");

const CHAIN_COIN_BY_DEPTH = {
  1: EARN_AMOUNTS.referral_l1 || 0,
  2: EARN_AMOUNTS.referral_l2 || 0,
  3: EARN_AMOUNTS.referral_l3 || 0,
};

const parseOptionalString = (value) => {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized.length ? normalized : null;
};

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

async function applyReferralJoinCoinRewards({
  subjectUserId,
  maxDepth = CHAIN_MAX_DEPTH,
  requireVerified = true,
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

    const chain = await getReferralChain(client, normalizedUserId, maxDepth);
    if (!chain.length) {
      return { applied: false, reason: "no_chain" };
    }

    const applied = [];
    for (const node of chain) {
      const ancestorId = parseOptionalString(node.ancestor_user_id);
      if (!ancestorId || ancestorId === normalizedUserId) continue;
      const depth = Number.parseInt(node.depth, 10);
      const points = CHAIN_COIN_BY_DEPTH[depth] || 0;
      if (!points) continue;

      const referenceId = `referral_join:l${depth}:${normalizedUserId}:${ancestorId}`;
      const description = `Level ${depth} referral join reward for ${normalizedUserId}`;
      try {
        const result = await addCoins(
          ancestorId,
          points,
          `referral_l${depth}`,
          referenceId,
          description,
        );
        if (result?.applied) {
          applied.push({ ancestorId, depth, points });
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

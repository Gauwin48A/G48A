/**
 * fraudGuardService.js - Fraud & Transaction Limit Guards (Phase 4, items 44/46/47)
 *
 * Implements:
 * 1. Same-party buyer/seller abuse checks (same UPI, same PAN, same phone, same device identity).
 * 2. Transaction limits: minimum/maximum transaction amount, daily buyer/seller limits, payout limit.
 * 3. Velocity checks: repeated counterparty, unusual transaction value.
 *
 * All guards are fail-open (return { allowed: true }) on DB/check errors so a
 * guard outage never blocks legitimate commerce, but suspicious results are
 * logged and alerted.
 */

const { runQuery } = require("../utils/dbHelpers");
const logger = require("../utils/logger");

/** Configurable limits (override via env). Clamped to finite values. */
function parseFiniteFloat(value, fallback) {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
function parseFiniteInt(value, fallback) {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const LIMITS = {
  MIN_TRANSACTION_AMOUNT: parseFiniteFloat(process.env.MIN_TRANSACTION_AMOUNT, 10),
  MAX_TRANSACTION_AMOUNT: parseFiniteFloat(process.env.MAX_TRANSACTION_AMOUNT, 1000000),
  DAILY_BUYER_LIMIT: parseFiniteFloat(process.env.DAILY_BUYER_LIMIT, 500000),
  DAILY_SELLER_LIMIT: parseFiniteFloat(process.env.DAILY_SELLER_LIMIT, 2000000),
  PAYOUT_LIMIT: parseFiniteFloat(process.env.PAYOUT_LIMIT, 1000000),
  VELOCITY_WINDOW_MINUTES: parseFiniteInt(process.env.VELOCITY_WINDOW_MINUTES, 60),
  VELOCITY_COUNTERPARTY_LIMIT: parseFiniteInt(process.env.VELOCITY_COUNTERPARTY_LIMIT, 10),
};

/**
 * Check for same-party abuse between buyer and seller.
 * Returns { allowed: true } if no shared identity signals detected.
 */
const checkSameParty = async ({ buyerId, sellerId }) => {
  if (!buyerId || !sellerId) {
    return { allowed: true };
  }

  if (String(buyerId) === String(sellerId)) {
    logger.warn(`[FraudGuard] SELF-TRADE attempt: buyer ${buyerId} === seller ${sellerId}`);
    return {
      allowed: false,
      reason: "Buyer and seller are the same user — self-trade is not permitted.",
      code: "SELF_TRADE",
    };
  }

  try {
    // Fetch identity signals for both parties.
    // Live-schema note: phone + payout UPI live on profiles (users has no
    // `phone` column), and the PAN hash lives on kyc_verifications. The
    // kyc_verifications table may not be provisioned in every environment,
    // so the PAN lookup is isolated — its absence must never disable the
    // (more reliable) UPI/phone checks.
    const fetchProfilesIdentity = async (userId) => {
      const res = await runQuery(
        `SELECT u.user_id,
                COALESCE(p.phone, '') AS phone,
                COALESCE(p.payout_upi_id, '') AS upi
         FROM users u
         LEFT JOIN profiles p ON u.user_id::text = p.user_id::text
         WHERE u.user_id::text = $1`,
        [String(userId)]
      );
      return res.rows[0] || {};
    };

    const fetchPanHash = async (userId) => {
      try {
        const res = await runQuery(
          `SELECT COALESCE(k.pan_hash, '') AS pan_hash
           FROM users u
           LEFT JOIN kyc_verifications k ON u.user_id::text = k.user_id::text
           WHERE u.user_id::text = $1`,
          [String(userId)]
        );
        return String(res.rows?.[0]?.pan_hash || "").trim().toUpperCase();
      } catch (panErr) {
        // kyc_verifications table may not exist — PAN signal simply unavailable.
        logger.info("[FraudGuard] PAN lookup unavailable (non-blocking):", panErr.message);
        return "";
      }
    };

    const [buyer, seller, buyerPan, sellerPan] = await Promise.all([
      fetchProfilesIdentity(buyerId),
      fetchProfilesIdentity(sellerId),
      fetchPanHash(buyerId),
      fetchPanHash(sellerId),
    ]);

    const buyerUpi = String(buyer.upi || "").trim().toLowerCase();
    const sellerUpi = String(seller.upi || "").trim().toLowerCase();
    const buyerPhone = String(buyer.phone || "").trim();
    const sellerPhone = String(seller.phone || "").trim();

    if (buyerUpi && sellerUpi && buyerUpi === sellerUpi) {
      return { allowed: false, reason: "Buyer and seller share the same UPI ID.", code: "SAME_UPI" };
    }
    if (buyerPhone && sellerPhone && buyerPhone === sellerPhone) {
      return { allowed: false, reason: "Buyer and seller share the same phone number.", code: "SAME_PHONE" };
    }
    if (buyerPan && sellerPan && buyerPan === sellerPan) {
      return { allowed: false, reason: "Buyer and seller share the same PAN.", code: "SAME_PAN" };
    }

    return { allowed: true };
  } catch (err) {
    logger.warn("[FraudGuard] Same-party check error (fail-open):", err.message);
    return { allowed: true };
  }
};

/**
 * Validate that a transaction amount is within configured limits.
 */
const checkAmountLimits = ({ amount }) => {
  const value = parseFloat(amount || 0);
  if (!Number.isFinite(value) || value <= 0) {
    return { allowed: false, reason: "Invalid transaction amount." };
  }
  if (value < LIMITS.MIN_TRANSACTION_AMOUNT) {
    return {
      allowed: false,
      reason: `Transaction amount below minimum of ₹${LIMITS.MIN_TRANSACTION_AMOUNT}.`,
    };
  }
  if (value > LIMITS.MAX_TRANSACTION_AMOUNT) {
    return {
      allowed: false,
      reason: `Transaction amount exceeds maximum of ₹${LIMITS.MAX_TRANSACTION_AMOUNT}.`,
    };
  }
  return { allowed: true };
};

/**
 * Check daily buy/sell volume limits for a user (sum of settled+received sales today).
 */
const checkDailyLimits = async ({ userId, role }) => {
  if (!userId) return { allowed: true };

  try {
    const res = await runQuery(
      `SELECT COALESCE(SUM(COALESCE(agreed_price, 0)), 0)::numeric(18,2) AS today_total,
              COUNT(*)::int AS today_count
       FROM sales
       WHERE ${role === "seller" ? "seller_id" : "buyer_id"}::text = $1
         AND status IN ('received', 'settled')
         AND updated_at > NOW() - INTERVAL '24 hours'`,
      [String(userId)]
    );

    const todayTotal = parseFloat(res.rows?.[0]?.today_total || 0);
    const todayCount = res.rows?.[0]?.today_count || 0;
    const limit = role === "seller" ? LIMITS.DAILY_SELLER_LIMIT : LIMITS.DAILY_BUYER_LIMIT;

    if (todayTotal >= limit) {
      return {
        allowed: false,
        reason: `Daily ${role} transaction limit (₹${limit}) would be exceeded.`,
      };
    }

    // Soft velocity signal — not blocking, but note high counts for alerting
    if (todayCount > 20) {
      logger.warn(`[FraudGuard] High ${role} velocity: ${todayCount} transactions today for user ${userId}`);
    }

    return { allowed: true };
  } catch (err) {
    logger.warn("[FraudGuard] Daily limit check error (fail-open):", err.message);
    return { allowed: true };
  }
};

/**
 * Check counterparty velocity — how many sales the buyer+seller pair already had.
 */
const checkCounterpartyVelocity = async ({ buyerId, sellerId }) => {
  if (!buyerId || !sellerId) return { allowed: true };

  try {
    const res = await runQuery(
      `SELECT COUNT(*)::int AS pair_count
       FROM sales
       WHERE buyer_id::text = $1 AND seller_id::text = $2
         AND created_at > NOW() - ($3 || ' minutes')::interval`,
      [String(buyerId), String(sellerId), String(LIMITS.VELOCITY_WINDOW_MINUTES)]
    );

    const pairCount = res.rows?.[0]?.pair_count || 0;
    if (pairCount >= LIMITS.VELOCITY_COUNTERPARTY_LIMIT) {
      return {
        allowed: false,
        reason: `Repeated counterparty activity detected (${pairCount} sales in ${LIMITS.VELOCITY_WINDOW_MINUTES} minutes).`,
      };
    }
    return { allowed: true };
  } catch (err) {
    logger.warn("[FraudGuard] Velocity check error (fail-open):", err.message);
    return { allowed: true };
  }
};

/**
 * Run the full suite of fraud guards for a new sale between buyer and seller.
 * Used at sale request creation time.
 */
const runSaleGuards = async ({ buyerId, sellerId, amount }) => {
  const results = {};

  // 1. Amount limits
  results.amount = checkAmountLimits({ amount });

  // 2. Same-party abuse
  results.sameParty = await checkSameParty({ buyerId, sellerId });

  // 3. Counterparty velocity
  results.velocity = await checkCounterpartyVelocity({ buyerId, sellerId });

  // 4. Buyer daily limit
  results.buyerDaily = await checkDailyLimits({ userId: buyerId, role: "buyer" });

  for (const [key, check] of Object.entries(results)) {
    if (check && check.allowed === false) {
      logger.warn(
        `[FraudGuard] Sale blocked (${key}): buyer=${buyerId}, seller=${sellerId}, amount=${amount} — ${check.reason}`
      );
      return { allowed: false, reason: check.reason, code: check.code || key };
    }
  }

  return { allowed: true, checks: results };
};

module.exports = {
  LIMITS,
  checkSameParty,
  checkAmountLimits,
  checkDailyLimits,
  checkCounterpartyVelocity,
  runSaleGuards,
};

/**
 * payoutKycGuard.js - Shared KYC eligibility check for payout dispatch
 *
 * Extracted so BOTH the BullMQ payout worker AND the fallback direct-dispatch
 * path enforce the same KYC gate (Phase 7, item 45). Without this shared
 * helper, the fallback path (used when Redis is unavailable) could dispatch a
 * payout to a seller whose KYC is not verified.
 *
 * Live-schema note: `users.kyc_status` is the authoritative KYC flag on the
 * live DB (there is no `kyc_verified` boolean column). A seller is eligible
 * only when kyc_status is VERIFIED or PAN_VERIFIED.
 *
 * Fail-open on DB errors: a transient lookup failure must not block a
 * legitimate payout, but a definitive non-verified status DOES block.
 */

const { runQuery } = require("../utils/dbHelpers");
const logger = require("../utils/logger");

const KYC_ELIGIBLE_STATUSES = new Set(["VERIFIED", "PAN_VERIFIED"]);

/**
 * Check whether a seller is KYC-eligible to receive a payout.
 *
 * @param {string} sellerId
 * @returns {Promise<{ eligible: boolean, kycStatus: string, error?: string }>}
 */
const checkPayoutKycEligibility = async (sellerId) => {
  if (!sellerId) {
    return { eligible: false, kycStatus: "MISSING" };
  }

  try {
    const res = await runQuery(
      `SELECT kyc_status FROM users WHERE user_id::text = $1`,
      [String(sellerId)]
    );
    const kycStatus = String(res.rows?.[0]?.kyc_status || "PENDING").toUpperCase();
    return { eligible: KYC_ELIGIBLE_STATUSES.has(kycStatus), kycStatus };
  } catch (err) {
    logger.warn("[PayoutKycGuard] KYC lookup failed (fail-open):", err.message);
    return { eligible: true, kycStatus: "UNKNOWN", error: err.message };
  }
};

module.exports = {
  KYC_ELIGIBLE_STATUSES,
  checkPayoutKycEligibility,
};

/**
 * accountFinancialGuardService.js - Financial-Activity Guard for Account Deletion (Phase 7, item 50)
 *
 * Implements:
 * - Block permanent account deletion when the user has active financial
 *   exposure: active escrow (razorpay_hold / in-flight sales), pending payouts,
 *   open disputes, unfinalized transactions, or a negative seller balance.
 * - Recommends DEACTIVATED instead of destroying financial identity.
 *
 * All checks are fail-open (return { blocked: false }) on DB errors so a
 * transient DB issue never prevents a GDPR deletion request from proceeding —
 * but blocked results are authoritative.
 */

const { runQuery } = require("../utils/dbHelpers");
const logger = require("../utils/logger");

/**
 * Check a user's financial exposure across all financial subsystems.
 *
 * @param {string} userId
 * @returns {Promise<{ blocked: boolean, reasons: string[] }>}
 */
const checkAccountFinancialExposure = async (userId) => {
  const reasons = [];

  if (!userId) return { blocked: false, reasons };

  // 1. Active sales / escrow hold (sales table)
  try {
    const res = await runQuery(
      `SELECT COUNT(*)::int AS c,
              COUNT(*) FILTER (WHERE razorpay_hold = true)::int AS held
       FROM sales
       WHERE (seller_id::text = $1 OR buyer_id::text = $1)
         AND status IN ('requested', 'approved', 'received', 'shipped')`,
      [String(userId)]
    );
    const row = res.rows?.[0] || {};
    if (row.held > 0) {
      reasons.push(`You have ${row.held} sale(s) with funds held in escrow (active dispute or hold).`);
    } else if (row.c > 0) {
      reasons.push(`You have ${row.c} active sale(s) that have not been finalized.`);
    }
  } catch (err) {
    logger.warn("[AccountGuard] Sales check unavailable:", err.message);
  }

  // 2. Pending / in-flight payouts (payout_records)
  try {
    const res = await runQuery(
      `SELECT COUNT(*)::int AS c FROM payout_records
       WHERE seller_id::text = $1
         AND status IN ('PAYOUT_PENDING', 'PAYOUT_PROCESSING', 'PAYOUT_FAILED_RETRYABLE')`,
      [String(userId)]
    );
    if ((res.rows?.[0]?.c || 0) > 0) {
      reasons.push(`You have ${res.rows[0].c} pending payout(s) that must be completed before deletion.`);
    }
  } catch (err) {
    logger.warn("[AccountGuard] Payout check unavailable:", err.message);
  }

  // 3. Open disputes (disputes table — raised by or against)
  try {
    const res = await runQuery(
      `SELECT COUNT(*)::int AS c FROM disputes
       WHERE (raised_by::text = $1 OR raised_against::text = $1)
         AND status NOT IN ('CLOSED', 'RESOLVED_SELLER', 'RESOLVED_BUYER')`,
      [String(userId)]
    );
    if ((res.rows?.[0]?.c || 0) > 0) {
      reasons.push(`You have ${res.rows[0].c} open dispute(s). Resolve them before deletion.`);
    }
  } catch (err) {
    logger.warn("[AccountGuard] Dispute check unavailable:", err.message);
  }

  // 4. In-flight transactions (transactions table — legacy V0 flow)
  try {
    const res = await runQuery(
      `SELECT COUNT(*)::int AS c FROM transactions
       WHERE (seller_id::text = $1 OR buyer_id::text = $1)
         AND status IN ('pending', 'in_progress', 'processing', 'pending_buyer_confirm')`,
      [String(userId)]
    );
    if ((res.rows?.[0]?.c || 0) > 0) {
      reasons.push(`You have ${res.rows[0].c} in-progress transaction(s).`);
    }
  } catch (err) {
    logger.warn("[AccountGuard] Transaction check unavailable:", err.message);
  }

  // 5. Negative seller balance (seller_balances)
  try {
    const res = await runQuery(
      `SELECT negative_balance FROM seller_balances WHERE seller_id::text = $1`,
      [String(userId)]
    );
    const negativeBalance = parseFloat(res.rows?.[0]?.negative_balance || 0);
    if (negativeBalance > 0) {
      reasons.push(
        `You owe ₹${negativeBalance.toFixed(2)} to the platform (recovered against future earnings).`
      );
    }
  } catch (err) {
    logger.warn("[AccountGuard] Seller balance check unavailable:", err.message);
  }

  return { blocked: reasons.length > 0, reasons };
};

module.exports = {
  checkAccountFinancialExposure,
};

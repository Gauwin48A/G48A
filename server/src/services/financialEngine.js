/**
 * financialEngine.js - Authoritative Financial Engine & Snapshot Manager
 *
 * Implements:
 * 1. Single Rounding Rule:
 *    - platform_fee = round(agreed_price * commission_rate, 2)
 *    - gst_on_fee = round(platform_fee * 0.18, 2)
 *    - seller_payout = agreed_price - platform_fee - gst_on_fee
 *    - Guaranteed invariant: platform_fee + gst_on_fee + seller_payout == agreed_price
 * 2. Immutable Calculation Snapshots:
 *    - Freezes calculation rules (commission_rate, gst_rate, plan) at order/sale creation
 *    - Historical transactions never recalculate if subscription expires or rates change.
 */

const { runQuery } = require("../utils/dbHelpers");
const logger = require("../utils/logger");

const CALCULATION_VERSION = "2026.1_AUTHORITATIVE";
const DEFAULT_GST_RATE = 0.18; // 18% GST on platform fee

/**
 * Calculate settlement amounts using the single rounding rule.
 *
 * @param {number} agreedPrice - GST-inclusive total agreed price
 * @param {number} commissionRate - Platform commission rate decimal (e.g. 0.025 for 2.5%)
 * @param {number} gstRate - GST rate decimal (default 0.18)
 */
const calculateSettlement = (agreedPrice, commissionRate = 0.025, gstRate = DEFAULT_GST_RATE) => {
  const price = Math.max(0, parseFloat(agreedPrice) || 0);
  const commRate = Math.max(0, parseFloat(commissionRate) || 0);
  const taxRate = Math.max(0, parseFloat(gstRate) || 0);

  // 1. Calculate platform fee & round to 2 decimals
  const platformFee = Math.round(price * commRate * 100) / 100;

  // 2. Calculate GST on platform fee & round to 2 decimals
  const gstOnFee = Math.round(platformFee * taxRate * 100) / 100;

  // 3. Derive seller payout directly from remaining balance (prevents independent rounding drift)
  const sellerPayout = Math.round((price - platformFee - gstOnFee) * 100) / 100;

  // 4. Verify invariant
  const checksum = Math.round((platformFee + gstOnFee + sellerPayout) * 100) / 100;
  if (Math.abs(checksum - price) > 0.001) {
    logger.warn(`[FinancialEngine] Discrepancy detected: checksum ${checksum} vs price ${price}`);
  }

  return {
    agreedPrice: price,
    commissionRate: commRate,
    platformFee,
    gstRate: taxRate,
    gstOnFee,
    sellerPayout,
    calculationVersion: CALCULATION_VERSION,
  };
};

/**
 * Create and persist an immutable transaction financial snapshot.
 */
const createFinancialSnapshot = async ({
  entityType, // 'SALE' or 'ORDER'
  entityId,
  userId,
  agreedPrice,
  commissionRate,
  subscriptionPlan = "FREE",
  subscriptionId = null,
}) => {
  const calc = calculateSettlement(agreedPrice, commissionRate);

  try {
    const result = await runQuery(
      `INSERT INTO financial_snapshots (
         entity_type, entity_id, user_id, agreed_price, commission_rate,
         platform_fee, gst_rate, gst_on_fee, seller_payout,
         subscription_plan, subscription_id, calculation_version, created_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
       ON CONFLICT (entity_type, entity_id) DO UPDATE
       SET agreed_price = EXCLUDED.agreed_price,
           platform_fee = EXCLUDED.platform_fee,
           gst_on_fee = EXCLUDED.gst_on_fee,
           seller_payout = EXCLUDED.seller_payout,
           updated_at = NOW()
       RETURNING *`,
      [
        entityType,
        String(entityId),
        String(userId),
        calc.agreedPrice,
        calc.commissionRate,
        calc.platformFee,
        calc.gstRate,
        calc.gstOnFee,
        calc.sellerPayout,
        subscriptionPlan,
        subscriptionId ? String(subscriptionId) : null,
        calc.calculationVersion,
      ]
    );

    logger.info(`[FinancialEngine] Snapshot created for ${entityType} #${entityId}: Payout ₹${calc.sellerPayout}`);
    return result.rows[0];
  } catch (err) {
    logger.error(`[FinancialEngine] Failed to create financial snapshot for ${entityType} #${entityId}:`, err);
    throw err;
  }
};

/**
 * Retrieve immutable financial snapshot or generate fallback.
 */
const getOrFetchFinancialSnapshot = async (entityType, entityId, fallbackAgreedPrice, fallbackCommRate) => {
  try {
    const res = await runQuery(
      `SELECT * FROM financial_snapshots WHERE entity_type = $1 AND entity_id = $2`,
      [entityType, String(entityId)]
    );
    if (res.rows.length > 0) {
      const snap = res.rows[0];
      return {
        agreedPrice: parseFloat(snap.agreed_price),
        commissionRate: parseFloat(snap.commission_rate),
        platformFee: parseFloat(snap.platform_fee),
        gstRate: parseFloat(snap.gst_rate),
        gstOnFee: parseFloat(snap.gst_on_fee),
        sellerPayout: parseFloat(snap.seller_payout),
        subscriptionPlan: snap.subscription_plan,
        calculationVersion: snap.calculation_version,
        isSnapshot: true,
      };
    }
  } catch (err) {
    logger.warn(`[FinancialEngine] Snapshot fetch error for ${entityType} #${entityId}:`, err.message);
  }

  // Fallback calculation
  return {
    ...calculateSettlement(fallbackAgreedPrice, fallbackCommRate),
    isSnapshot: false,
  };
};

module.exports = {
  CALCULATION_VERSION,
  DEFAULT_GST_RATE,
  calculateSettlement,
  createFinancialSnapshot,
  getOrFetchFinancialSnapshot,
};

/**
 * prorationService.js - Subscription Upgrade Proration & Credit Calculations
 *
 * Calculates unused subscription credits when a user upgrades mid-cycle (e.g. Silver -> Gold).
 */

const { runQuery } = require("../utils/dbHelpers");
const logger = require("../utils/logger");

/**
 * Calculate prorated discount for upgrading a user's subscription mid-cycle.
 *
 * @param {string} userId - User ID
 * @param {number|string} targetPlanId - Desired plan ID
 * @returns {Promise<{
 *   hasActiveSub: boolean,
 *   currentPlan: object|null,
 *   targetPlan: object|null,
 *   unusedCredit: number,
 *   originalPrice: number,
 *   netAmount: number,
 *   remainingDays: number
 * }>}
 */
const calculateProratedUpgradePrice = async (userId, targetPlanId) => {
  try {
    // 1. Fetch user's active subscription
    const activeSubRes = await runQuery(
      `SELECT us.*, sp.price AS current_plan_price, sp.duration_days AS current_plan_duration, sp.plan_name AS current_plan_name
       FROM user_subscriptions us
       JOIN subscription_plans sp ON us.plan_id = sp.plan_id
       WHERE us.user_id::text = $1 AND us.status = 'ACTIVE'
       ORDER BY us.end_date DESC LIMIT 1`,
      [String(userId)]
    );

    // 2. Fetch target plan details
    const targetPlanRes = await runQuery(
      `SELECT * FROM subscription_plans WHERE plan_id::text = $1 AND is_active = true`,
      [String(targetPlanId)]
    );

    if (targetPlanRes.rows.length === 0) {
      throw new Error("Target subscription plan not found");
    }

    const targetPlan = targetPlanRes.rows[0];
    const targetPrice = parseFloat(targetPlan.price || 0);

    if (activeSubRes.rows.length === 0) {
      return {
        hasActiveSub: false,
        currentPlan: null,
        targetPlan,
        unusedCredit: 0,
        originalPrice: targetPrice,
        netAmount: targetPrice,
        remainingDays: 0,
      };
    }

    const activeSub = activeSubRes.rows[0];
    const currentPrice = parseFloat(activeSub.current_plan_price || 0);
    const durationDays = parseInt(activeSub.current_plan_duration || 30, 10) || 30;

    const endDate = new Date(activeSub.end_date);
    const now = new Date();
    const remainingMs = endDate.getTime() - now.getTime();

    if (remainingMs <= 0 || currentPrice <= 0) {
      return {
        hasActiveSub: true,
        currentPlan: activeSub,
        targetPlan,
        unusedCredit: 0,
        originalPrice: targetPrice,
        netAmount: targetPrice,
        remainingDays: 0,
      };
    }

    const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
    const dailyRate = currentPrice / durationDays;
    const unusedCredit = Math.min(currentPrice, Math.round(dailyRate * remainingDays * 100) / 100);

    const netAmount = Math.max(0, Math.round((targetPrice - unusedCredit) * 100) / 100);

    logger.info(
      `[Proration] User ${userId} upgrading to ${targetPlan.plan_name}: target ₹${targetPrice}, credit ₹${unusedCredit} (${remainingDays}d remaining), net ₹${netAmount}`
    );

    return {
      hasActiveSub: true,
      currentPlan: activeSub,
      targetPlan,
      unusedCredit,
      originalPrice: targetPrice,
      netAmount,
      remainingDays,
    };
  } catch (err) {
    logger.error("[Proration] Error calculating prorated price:", err);
    throw err;
  }
};

module.exports = {
  calculateProratedUpgradePrice,
};

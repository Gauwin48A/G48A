const { runQuery } = require("../utils/dbHelpers");
const logger = require("../utils/logger");

/**
 * Monthly quota reset — resets boost/featured/spotlight usage counters
 * to 0 for all active subscriptions. Run on the 1st of each month.
 */
async function resetMonthlyQuotas() {
  try {
    const result = await runQuery(
      `UPDATE user_subscriptions
       SET boost_used_this_month = 0,
           featured_used_this_month = 0,
           spotlight_used_this_month = 0,
           quota_reset_at = NOW()
       WHERE is_active = true
       RETURNING user_id`,
    );

    const count = result.rows.length;
    logger.info(`[QuotaReset] Reset monthly quotas for ${count} active subscriptions`);
    return { resetCount: count };
  } catch (err) {
    logger.error("[QuotaReset] Failed to reset quotas:", err.message);
    throw err;
  }
}

module.exports = { resetMonthlyQuotas };

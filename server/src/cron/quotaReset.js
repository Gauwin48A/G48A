const { runQuery } = require("../utils/dbHelpers");
const logger = require("../utils/logger");
const { getTierRules } = require("../config/tierRules");

const normalizeQuotaPeriodMonths = (rules) => {
  const raw = Number.parseInt(rules?.quotaPeriodMonths, 10);
  if (!Number.isFinite(raw) || raw < 1) return 1;
  return raw;
};

const isQuotaResetDue = (quotaResetAt, periodMonths) => {
  if (!periodMonths || periodMonths < 1) return false;
  if (!quotaResetAt) return true;
  const lastReset = new Date(quotaResetAt);
  if (Number.isNaN(lastReset.getTime())) return true;
  const nextReset = new Date(lastReset);
  nextReset.setMonth(nextReset.getMonth() + periodMonths);
  return new Date() >= nextReset;
};

/**
 * Monthly quota reset — resets boost/featured/spotlight usage counters
 * to 0 for all active subscriptions. Run on the 1st of each month.
 */
async function resetMonthlyQuotas() {
  try {
    const subs = await runQuery(
      `SELECT id, plan_name, quota_reset_at
       FROM user_subscriptions
       WHERE is_active = true`,
    );

    const dueIds = [];
    for (const sub of subs.rows || []) {
      const rules = getTierRules(sub.plan_name);
      const periodMonths = normalizeQuotaPeriodMonths(rules);
      const hasQuota =
        (rules.boostQuotaMonthly || 0) > 0 ||
        (rules.featuredQuotaMonthly || 0) > 0 ||
        (rules.spotlightQuotaMonthly || 0) > 0;
      if (!hasQuota) continue;
      if (isQuotaResetDue(sub.quota_reset_at, periodMonths)) {
        dueIds.push(String(sub.id));
      }
    }

    if (!dueIds.length) {
      logger.info("[QuotaReset] No subscriptions due for quota reset");
      return { resetCount: 0 };
    }

    const result = await runQuery(
      `UPDATE user_subscriptions
       SET boost_used_this_month = 0,
           featured_used_this_month = 0,
           spotlight_used_this_month = 0,
           quota_reset_at = NOW()
       WHERE id::text = ANY($1::text[])
       RETURNING user_id`,
      [dueIds],
    );

    const count = result.rows.length;
    logger.info(`[QuotaReset] Reset quotas for ${count} active subscriptions`);
    return { resetCount: count };
  } catch (err) {
    logger.error("[QuotaReset] Failed to reset quotas:", err.message);
    throw err;
  }
}

module.exports = { resetMonthlyQuotas };

const { runQuery, getAuthUserId } = require("../utils/dbHelpers");
const logger = require("../utils/logger");

/**
 * GET /api/subscriptions/plans
 * Fetch all available active plans from the database
 */
exports.getPlans = async (req, res) => {
  try {
    const result = await runQuery(
      `SELECT plan_id, plan_name, price, duration_days, features 
       FROM subscription_plans 
       WHERE is_active = true 
       ORDER BY price ASC`
    );
    res.json({ success: true, plans: result.rows });
  } catch (err) {
    logger.error("[SUBSCRIPTION] getPlans error:", err);
    res.status(500).json({ error: "Failed to load plans" });
  }
};

/**
 * GET /api/subscriptions/my
 * Get current user's active subscription
 */
exports.getMySubscription = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  try {
    const result = await runQuery(
      `SELECT us.sub_id, us.status, us.start_date, us.end_date, 
              sp.plan_name, sp.features 
       FROM user_subscriptions us
       JOIN subscription_plans sp ON sp.plan_id = us.plan_id
       WHERE us.user_id::text = $1 AND us.status = 'ACTIVE'
       ORDER BY us.end_date DESC 
       LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.json({ success: true, subscription: null, currentPlan: "BASIC" });
    }

    res.json({ success: true, subscription: result.rows[0], currentPlan: result.rows[0].plan_name });
  } catch (err) {
    logger.error("[SUBSCRIPTION] getMySubscription error:", err);
    res.status(500).json({ error: "Failed to load subscription" });
  }
};

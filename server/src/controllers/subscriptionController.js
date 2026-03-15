const { pool, runQuery, getAuthUserId } = require("../utils/dbHelpers");
const logger = require("../utils/logger");
const { getTierRules, getSubscriptionExpiry, getAllTiersDisplay, TIER_ORDER } = require("../config/tierRules");

// GET /api/subscriptions/plans — list all available plans
exports.getPlans = async (req, res) => {
  try {
    const plans = getAllTiersDisplay();
    res.json({ success: true, plans });
  } catch (err) {
    logger.error("[SUBSCRIPTION] getPlans error:", err);
    res.status(500).json({ error: "Failed to load plans" });
  }
};

// GET /api/subscriptions/my — get current user subscription
exports.getMySubscription = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  try {
    const result = await runQuery(
      `SELECT us.*, u.current_plan, u.post_credits
       FROM user_subscriptions us
       JOIN users u ON u.user_id = us.user_id
       WHERE us.user_id = $1 AND us.is_active = true
       ORDER BY us.created_at DESC
       LIMIT 1`,
      [userId],
    );

    if (result.rows.length === 0) {
      // No active subscription — they're on basic
      const userResult = await runQuery(
        "SELECT current_plan, post_credits FROM users WHERE user_id = $1",
        [userId],
      );
      const user = userResult.rows[0] || {};
      return res.json({
        success: true,
        subscription: null,
        currentPlan: user.current_plan || "basic",
        postCredits: user.post_credits || 0,
      });
    }

    const sub = result.rows[0];
    const tierRules = getTierRules(sub.plan_name);
    res.json({
      success: true,
      subscription: {
        id: sub.id,
        planName: sub.plan_name,
        startedAt: sub.started_at,
        expiresAt: sub.expires_at,
        isActive: sub.is_active,
        listingsCount: sub.listings_count,
        maxListings: tierRules.maxListings,
        boostUsed: sub.boost_used_this_month,
        boostQuota: tierRules.boostQuotaMonthly,
        featuredUsed: sub.featured_used_this_month,
        featuredQuota: tierRules.featuredQuotaMonthly,
        spotlightUsed: sub.spotlight_used_this_month,
        spotlightQuota: tierRules.spotlightQuotaMonthly,
        quotaResetAt: sub.quota_reset_at,
      },
      currentPlan: sub.current_plan || sub.plan_name,
      postCredits: sub.post_credits || 0,
    });
  } catch (err) {
    logger.error("[SUBSCRIPTION] getMySubscription error:", err);
    res.status(500).json({ error: "Failed to load subscription" });
  }
};

// POST /api/subscriptions/subscribe — create or upgrade subscription
exports.subscribe = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  const { planName, paymentId } = req.body;
  const normalizedPlan = String(planName || "").toLowerCase();

  if (!TIER_ORDER.includes(normalizedPlan)) {
    return res.status(400).json({ error: `Invalid plan. Choose from: ${TIER_ORDER.join(", ")}` });
  }

  const tierRules = getTierRules(normalizedPlan);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Deactivate existing subscription
    await client.query(
      "UPDATE user_subscriptions SET is_active = false WHERE user_id = $1 AND is_active = true",
      [userId],
    );

    // Calculate expiry
    const expiresAt = getSubscriptionExpiry(normalizedPlan);

    // Create subscription
    const insertResult = await client.query(
      `INSERT INTO user_subscriptions (user_id, plan_name, expires_at, payment_id, quota_reset_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id`,
      [userId, normalizedPlan, expiresAt, paymentId || null],
    );
    const subscriptionId = insertResult.rows[0].id;

    // For basic plan: add 1 post credit
    const postCredits = normalizedPlan === "basic" ? 1 : 0;

    // Update user's current plan
    await client.query(
      `UPDATE users SET current_plan = $1, subscription_id = $2, post_credits = COALESCE(post_credits, 0) + $3 WHERE user_id = $4`,
      [normalizedPlan, subscriptionId, postCredits, userId],
    );

    await client.query("COMMIT");

    logger.info(`[SUBSCRIPTION] User ${userId} subscribed to ${normalizedPlan} plan`);

    res.status(201).json({
      success: true,
      message: `Successfully subscribed to ${tierRules.name}`,
      subscription: {
        id: subscriptionId,
        planName: normalizedPlan,
        expiresAt,
        features: tierRules.features,
      },
    });
  } catch (err) {
    await client.query("ROLLBACK");
    logger.error("[SUBSCRIPTION] subscribe error:", err);
    res.status(500).json({ error: "Failed to create subscription" });
  } finally {
    client.release();
  }
};

// GET /api/subscriptions/quota — get boost/featured/spotlight quota status
exports.getQuotaStatus = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  try {
    const result = await runQuery(
      `SELECT us.plan_name, us.boost_used_this_month, us.featured_used_this_month, us.spotlight_used_this_month, us.quota_reset_at
       FROM user_subscriptions us
       WHERE us.user_id = $1 AND us.is_active = true
       ORDER BY us.created_at DESC LIMIT 1`,
      [userId],
    );

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        plan: "basic",
        boost: { used: 0, quota: 0, remaining: 0 },
        featured: { used: 0, quota: 0, remaining: 0 },
        spotlight: { used: 0, quota: 0, remaining: 0 },
      });
    }

    const sub = result.rows[0];
    const rules = getTierRules(sub.plan_name);
    res.json({
      success: true,
      plan: sub.plan_name,
      quotaResetAt: sub.quota_reset_at,
      boost: {
        used: sub.boost_used_this_month,
        quota: rules.boostQuotaMonthly,
        remaining: Math.max(0, rules.boostQuotaMonthly - sub.boost_used_this_month),
      },
      featured: {
        used: sub.featured_used_this_month,
        quota: rules.featuredQuotaMonthly,
        remaining: Math.max(0, rules.featuredQuotaMonthly - sub.featured_used_this_month),
      },
      spotlight: {
        used: sub.spotlight_used_this_month,
        quota: rules.spotlightQuotaMonthly,
        remaining: Math.max(0, rules.spotlightQuotaMonthly - sub.spotlight_used_this_month),
      },
    });
  } catch (err) {
    logger.error("[SUBSCRIPTION] getQuotaStatus error:", err);
    res.status(500).json({ error: "Failed to load quota status" });
  }
};

// Internal: use a quota unit (called from postBoostController)
exports.useQuota = async (userId, quotaType) => {
  const columnMap = {
    boost: "boost_used_this_month",
    featured: "featured_used_this_month",
    spotlight: "spotlight_used_this_month",
  };
  const column = columnMap[quotaType];
  if (!column) throw new Error(`Invalid quota type: ${quotaType}`);

  const result = await runQuery(
    `UPDATE user_subscriptions
     SET ${column} = ${column} + 1
     WHERE user_id = $1 AND is_active = true
     RETURNING id, ${column} as used`,
    [userId],
  );

  return result.rows[0] || null;
};

// Internal: check if user has quota remaining
exports.checkQuota = async (userId, quotaType) => {
  const result = await runQuery(
    `SELECT us.plan_name, us.boost_used_this_month, us.featured_used_this_month, us.spotlight_used_this_month
     FROM user_subscriptions us
     WHERE us.user_id = $1 AND us.is_active = true
     ORDER BY us.created_at DESC LIMIT 1`,
    [userId],
  );

  if (result.rows.length === 0) return { hasQuota: false, plan: "basic", remaining: 0 };

  const sub = result.rows[0];
  const rules = getTierRules(sub.plan_name);
  const quotaMap = {
    boost: { used: sub.boost_used_this_month, max: rules.boostQuotaMonthly },
    featured: { used: sub.featured_used_this_month, max: rules.featuredQuotaMonthly },
    spotlight: { used: sub.spotlight_used_this_month, max: rules.spotlightQuotaMonthly },
  };

  const quota = quotaMap[quotaType];
  if (!quota) return { hasQuota: false, plan: sub.plan_name, remaining: 0 };

  const remaining = Math.max(0, quota.max - quota.used);
  return { hasQuota: remaining > 0, plan: sub.plan_name, remaining, used: quota.used, max: quota.max };
};

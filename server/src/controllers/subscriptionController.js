const { pool, runQuery, getAuthUserId } = require("../utils/dbHelpers");
const logger = require("../utils/logger");
const { getTierRules, getSubscriptionExpiry, getAllTiersDisplay, TIER_ORDER, getUpsellMessage: buildUpsellMessage, getDynamicPrice } = require("../config/tierRules");
const {
  ensureSubscriptionSchema,
  withSubscriptionLock,
  serializeSubscriptionHistoryRow,
} = require("../services/subscriptionSchemaService");

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

async function maybeResetQuota(sub) {
  if (!sub?.id) return sub;
  const rules = getTierRules(sub.plan_name);
  const periodMonths = normalizeQuotaPeriodMonths(rules);
  const hasQuota =
    (rules.boostQuotaMonthly || 0) > 0 ||
    (rules.featuredQuotaMonthly || 0) > 0 ||
    (rules.spotlightQuotaMonthly || 0) > 0;
  if (!hasQuota) return sub;
  if (!isQuotaResetDue(sub.quota_reset_at, periodMonths)) return sub;

  const resetResult = await runQuery(
    `UPDATE user_subscriptions
     SET boost_used_this_month = 0,
         featured_used_this_month = 0,
         spotlight_used_this_month = 0,
         quota_reset_at = NOW()
     WHERE id = $1
     RETURNING id, plan_name, boost_used_this_month, featured_used_this_month, spotlight_used_this_month, quota_reset_at`,
    [sub.id],
  );
  return resetResult.rows[0] || sub;
}

function serializeActiveSubscription(sub, fallbackPlan = "basic", fallbackCredits = 0) {
  if (!sub) {
    return {
      success: true,
      subscription: null,
      currentPlan: fallbackPlan,
      postCredits: fallbackCredits,
    };
  }

  const tierRules = getTierRules(sub.plan_name || fallbackPlan);
  const quotaPeriodMonths = normalizeQuotaPeriodMonths(tierRules);
  return {
    success: true,
    subscription: {
      id: sub.id,
      planName: sub.plan_name,
      startedAt: sub.started_at,
      expiresAt: sub.expires_at,
      isActive: sub.is_active,
      isTrial: Boolean(sub.is_trial),
      cancelledAt: sub.cancelled_at || null,
      cancelReason: sub.cancel_reason || "",
      listingsCount: sub.listings_count,
      maxListings: tierRules.maxListings,
      boostUsed: sub.boost_used_this_month,
      boostQuota: tierRules.boostQuotaMonthly,
      featuredUsed: sub.featured_used_this_month,
      featuredQuota: tierRules.featuredQuotaMonthly,
      spotlightUsed: sub.spotlight_used_this_month,
      spotlightQuota: tierRules.spotlightQuotaMonthly,
      quotaResetAt: sub.quota_reset_at,
      quotaPeriodMonths,
    },
    currentPlan: sub.current_plan || sub.plan_name || fallbackPlan,
    postCredits: sub.post_credits || fallbackCredits,
  };
}

// GET /api/subscriptions/plans — list all available plans
exports.getPlans = async (req, res) => {
  try {
    await ensureSubscriptionSchema();
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
    await ensureSubscriptionSchema();
    const result = await runQuery(
      `SELECT us.*, u.current_plan, u.post_credits
       FROM user_subscriptions us
       JOIN users u ON u.user_id::text = us.user_id::text
       WHERE us.user_id::text = $1 AND us.is_active = true
       ORDER BY us.created_at DESC
       LIMIT 1`,
      [userId],
    );

    if (result.rows.length === 0) {
      // No active subscription — they're on basic
      const userResult = await runQuery(
        "SELECT current_plan, post_credits FROM users WHERE user_id::text = $1",
        [userId],
      );
      const user = userResult.rows[0] || {};
      return res.json(serializeActiveSubscription(null, user.current_plan || "basic", user.post_credits || 0));
    }

    const sub = await maybeResetQuota(result.rows[0]);
    res.json(serializeActiveSubscription(sub));
  } catch (err) {
    logger.error("[SUBSCRIPTION] getMySubscription error:", err);
    try {
      await ensureSubscriptionSchema();
      const userResult = await runQuery(
        "SELECT current_plan, post_credits FROM users WHERE user_id::text = $1",
        [userId],
      );
      const user = userResult.rows[0] || {};
      return res.json({
        ...serializeActiveSubscription(null, user.current_plan || "basic", user.post_credits || 0),
        degraded: true,
      });
    } catch (fallbackErr) {
      logger.error("[SUBSCRIPTION] getMySubscription fallback error:", fallbackErr);
      res.status(500).json({ error: "Failed to load subscription" });
    }
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
    await ensureSubscriptionSchema();
    await client.query("BEGIN");
    await withSubscriptionLock(client, userId);

    // Deactivate existing subscription
    await client.query(
      `UPDATE user_subscriptions
       SET is_active = false
       WHERE user_id::text = $1 AND is_active = true`,
      [userId],
    );

    // Calculate expiry
    const expiresAt = getSubscriptionExpiry(normalizedPlan);

    // Create subscription
    const insertResult = await client.query(
      `INSERT INTO user_subscriptions (user_id, plan_name, expires_at, payment_id, quota_reset_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id`,
      [String(userId), normalizedPlan, expiresAt, paymentId ? String(paymentId) : null],
    );
    const subscriptionId = insertResult.rows[0].id;

    // For basic plan: add 1 post credit
    const postCredits = normalizedPlan === "basic" ? 1 : 0;

    // Update user's current plan
    await client.query(
      `UPDATE users
       SET tier = $1,
           current_plan = $1,
           subscription_id = $2,
           subscription_expiry = $3,
           post_credits = COALESCE(post_credits, 0) + $4
       WHERE user_id::text = $5`,
      [normalizedPlan, subscriptionId, expiresAt, postCredits, userId],
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
        isActive: true,
        isTrial: false,
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
    await ensureSubscriptionSchema();
    const result = await runQuery(
      `SELECT us.plan_name, us.boost_used_this_month, us.featured_used_this_month, us.spotlight_used_this_month, us.quota_reset_at
       FROM user_subscriptions us
       WHERE us.user_id::text = $1 AND us.is_active = true
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

    const sub = await maybeResetQuota(result.rows[0]);
    const rules = getTierRules(sub.plan_name);
    const quotaPeriodMonths = normalizeQuotaPeriodMonths(rules);
    res.json({
      success: true,
      plan: sub.plan_name,
      quotaResetAt: sub.quota_reset_at,
      quotaPeriodMonths,
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
  await ensureSubscriptionSchema();
  const columnMap = {
    boost: "boost_used_this_month",
    featured: "featured_used_this_month",
    spotlight: "spotlight_used_this_month",
  };
  const column = columnMap[quotaType];
  if (!column) throw new Error(`Invalid quota type: ${quotaType}`);

  const subResult = await runQuery(
    `SELECT id, plan_name, boost_used_this_month, featured_used_this_month, spotlight_used_this_month, quota_reset_at
     FROM user_subscriptions
     WHERE user_id::text = $1 AND is_active = true
     ORDER BY created_at DESC LIMIT 1`,
    [userId],
  );

  if (!subResult.rows.length) return null;

  const sub = await maybeResetQuota(subResult.rows[0]);

  const result = await runQuery(
    `UPDATE user_subscriptions
     SET ${column} = ${column} + 1
     WHERE id = $1
     RETURNING id, ${column} as used`,
    [sub.id],
  );

  return result.rows[0] || null;
};

// POST /api/subscriptions/trial — activate free trial for Silver or Premium
exports.activateTrial = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  const { planName, purpose } = req.body;
  const normalizedPlan = String(planName || "").toLowerCase();

  if (normalizedPlan !== "silver" && normalizedPlan !== "premium") {
    return res.status(400).json({ error: "Free trial is only available for Silver and Premium plans" });
  }

  const tierRules = getTierRules(normalizedPlan);
  if (!tierRules.trialDays || tierRules.trialDays <= 0) {
    return res.status(400).json({ error: "No trial available for this plan" });
  }

  const client = await pool.connect();
  try {
    await ensureSubscriptionSchema();
    await client.query("BEGIN");
    await withSubscriptionLock(client, userId);

    // Check if user already used a trial
    const trialCheck = await client.query(
      "SELECT id FROM user_subscriptions WHERE user_id::text = $1 AND is_trial = true LIMIT 1",
      [userId],
    );
    if (trialCheck.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "You have already used your free trial" });
    }

    // Deactivate existing subscription
    await client.query(
      `UPDATE user_subscriptions
       SET is_active = false
       WHERE user_id::text = $1 AND is_active = true`,
      [userId],
    );

    // Calculate trial expiry
    const expiresAt = new Date();
    const trialDays = purpose === "centre" ? 7 : tierRules.trialDays;
    expiresAt.setDate(expiresAt.getDate() + trialDays);

    // Create trial subscription
    const insertResult = await client.query(
      `INSERT INTO user_subscriptions (user_id, plan_name, expires_at, is_trial, quota_reset_at)
       VALUES ($1, $2, $3, true, NOW())
       RETURNING id`,
      [String(userId), normalizedPlan, expiresAt],
    );
    const subscriptionId = insertResult.rows[0].id;

    // Update user's current plan
    await client.query(
      `UPDATE users
       SET tier = $1, current_plan = $1, subscription_id = $2, subscription_expiry = $3
       WHERE user_id::text = $4`,
      [normalizedPlan, subscriptionId, expiresAt, userId],
    );

    await client.query("COMMIT");

    logger.info(`[SUBSCRIPTION] User ${userId} activated ${trialDays}-day trial for ${normalizedPlan}`);

    res.status(201).json({
      success: true,
      message: `${trialDays}-day free trial activated for ${tierRules.name}`,
      subscription: {
        id: subscriptionId,
        planName: normalizedPlan,
        expiresAt,
        isActive: true,
        isTrial: true,
        trialDays,
        features: tierRules.features,
      },
    });
  } catch (err) {
    await client.query("ROLLBACK");
    logger.error("[SUBSCRIPTION] activateTrial error:", err);
    res.status(500).json({ error: "Failed to activate trial" });
  } finally {
    client.release();
  }
};

// Internal: check if user has quota remaining
exports.checkQuota = async (userId, quotaType) => {
  await ensureSubscriptionSchema();
  const result = await runQuery(
    `SELECT us.id, us.plan_name, us.boost_used_this_month, us.featured_used_this_month, us.spotlight_used_this_month, us.quota_reset_at
     FROM user_subscriptions us
     WHERE us.user_id::text = $1 AND us.is_active = true
     ORDER BY us.created_at DESC LIMIT 1`,
    [userId],
  );

  if (result.rows.length === 0) return { hasQuota: false, plan: "basic", remaining: 0 };

  const sub = await maybeResetQuota(result.rows[0]);
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

// GET /api/subscriptions/plans/:planName/price — dynamic pricing with time-of-day discounts
exports.getDynamicPricing = async (req, res) => {
  try {
    await ensureSubscriptionSchema();
    const planName = String(req.params.planName || "").toLowerCase();
    if (!TIER_ORDER.includes(planName)) {
      return res.status(400).json({ error: `Invalid plan. Choose from: ${TIER_ORDER.join(", ")}` });
    }
    const pricing = getDynamicPrice(planName);
    res.json({ success: true, plan: planName, ...pricing });
  } catch (err) {
    logger.error("[SUBSCRIPTION] getDynamicPricing error:", err);
    res.status(500).json({ error: "Failed to load pricing" });
  }
};

// GET /api/subscriptions/comparison — data-driven plan comparison
exports.getComparison = async (req, res) => {
  try {
    await ensureSubscriptionSchema();
    const plans = getAllTiersDisplay();
    const comparison = [
      {
        key: "visibility_days",
        label: "Visibility",
        values: Object.fromEntries(plans.map((plan) => [plan.name, `${plan.visibilityDays} days`])),
      },
      {
        key: "max_listings",
        label: "Listings",
        values: Object.fromEntries(
          plans.map((plan) => [plan.name, plan.maxListings == null ? "Unlimited" : String(plan.maxListings)]),
        ),
      },
      {
        key: "trial_days",
        label: "Free trial",
        values: Object.fromEntries(
          plans.map((plan) => [plan.name, plan.trialDays ? `${plan.trialDays} days` : "Not included"]),
        ),
      },
      {
        key: "quota_window",
        label: "Quota window",
        values: Object.fromEntries(
          plans.map((plan) => [plan.name, plan.quotaPeriodMonths > 1 ? `${plan.quotaPeriodMonths} months` : "Monthly"]),
        ),
      },
    ];
    return res.json({ success: true, plans, comparison });
  } catch (err) {
    logger.error("[SUBSCRIPTION] getComparison error:", err);
    return res.status(500).json({ error: "Failed to load comparison" });
  }
};

// GET /api/subscriptions/history — all prior subscription changes for current user
exports.getHistory = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  try {
    await ensureSubscriptionSchema();
    const result = await runQuery(
      `SELECT id, plan_name, started_at, expires_at, is_active, is_trial, cancelled_at, cancel_reason,
              payment_id, quota_reset_at, listings_count, created_at
       FROM user_subscriptions
       WHERE user_id::text = $1
       ORDER BY COALESCE(started_at, created_at) DESC, id DESC`,
      [userId],
    );
    return res.json({
      success: true,
      history: (result.rows || []).map(serializeSubscriptionHistoryRow),
    });
  } catch (err) {
    logger.error("[SUBSCRIPTION] getHistory error:", err);
    return res.status(500).json({ error: "Failed to load subscription history" });
  }
};

// POST /api/subscriptions/:subscriptionId/cancel — cancel the selected subscription
exports.cancelSubscription = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  const subscriptionId = Number.parseInt(req.params.subscriptionId, 10);
  if (!Number.isFinite(subscriptionId) || subscriptionId < 1) {
    return res.status(400).json({ error: "Valid subscription ID is required" });
  }

  const cancelReason = String(req.body?.reason || "").trim().slice(0, 250);
  const client = await pool.connect();

  try {
    await ensureSubscriptionSchema();
    await client.query("BEGIN");
    await withSubscriptionLock(client, userId);

    const existing = await client.query(
      `SELECT *
       FROM user_subscriptions
       WHERE id = $1
         AND user_id::text = $2
       LIMIT 1`,
      [subscriptionId, userId],
    );

    if (!existing.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Subscription not found" });
    }

    const target = existing.rows[0];
    if (!target.is_active) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "Subscription is already inactive" });
    }

    const updated = await client.query(
      `UPDATE user_subscriptions
       SET is_active = false,
           cancelled_at = NOW(),
           cancel_reason = NULLIF($2, '')
       WHERE id = $1
       RETURNING *`,
      [subscriptionId, cancelReason],
    );

    await client.query(
      `UPDATE users
       SET tier = 'basic',
           current_plan = 'basic',
           subscription_id = NULL,
           subscription_expiry = NULL
       WHERE user_id::text = $1`,
      [userId],
    );

    await client.query("COMMIT");

    return res.json({
      success: true,
      message: "Subscription cancelled successfully",
      currentPlan: "basic",
      cancelledSubscription: serializeSubscriptionHistoryRow(updated.rows[0]),
    });
  } catch (err) {
    await client.query("ROLLBACK");
    logger.error("[SUBSCRIPTION] cancelSubscription error:", err);
    return res.status(500).json({ error: "Failed to cancel subscription" });
  } finally {
    client.release();
  }
};

// GET /api/subscriptions/upsell — contextual upsell message for the current user
exports.getUpsellMessage = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  try {
    await ensureSubscriptionSchema();
    const userResult = await runQuery(
      "SELECT current_plan, tier FROM users WHERE user_id::text = $1",
      [userId],
    );
    const currentPlan = userResult.rows[0]?.current_plan || userResult.rows[0]?.tier || "basic";
    const upsell = buildUpsellMessage(currentPlan);
    if (!upsell) {
      return res.json({ success: true, upsell: null, message: "You're on the top plan!" });
    }
    const pricing = getDynamicPrice(upsell.tier);
    res.json({ success: true, upsell: { ...upsell, dynamicPrice: pricing } });
  } catch (err) {
    logger.error("[SUBSCRIPTION] getUpsellMessage error:", err);
    res.status(500).json({ error: "Failed to load upsell" });
  }
};

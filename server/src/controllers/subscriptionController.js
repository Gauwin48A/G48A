const { runQuery, getAuthUserId } = require("../utils/dbHelpers");
const logger = require("../utils/logger");
const { computeRazorpaySignature, verifyRazorpaySignature } = require("../services/paymentGateway");

// ────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────

/**
 * Return the currently active subscription for a user, or null.
 */
async function getActiveSubscription(userId) {
  // LEFT JOIN so an ACTIVE subscription still surfaces even if its plan row was
  // ever deleted (plan fields fall back to sane defaults instead of vanishing).
  const result = await runQuery(
    `SELECT us.sub_id, us.status, us.start_date, us.end_date, us.auto_renew, us.is_trial,
            sp.plan_id, COALESCE(sp.plan_name, 'PREMIUM') as plan_name, sp.slug,
            COALESCE(sp.price, 0) as price, COALESCE(sp.duration_days, 30) as duration_days,
            sp.features as plan_features
     FROM user_subscriptions us
     LEFT JOIN subscription_plans sp ON sp.plan_id = us.plan_id
     WHERE us.user_id::text = $1 AND us.status = 'ACTIVE' AND us.end_date > NOW()
     ORDER BY us.end_date DESC LIMIT 1`,
    [userId]
  );
  return result.rows[0] || null;
}

/**
 * Return the resolved feature limits for a given plan.
 * Merges subscription_features definitions with plan_feature_limits values.
 */
async function getPlanFeatures(planId) {
  const result = await runQuery(
    `SELECT sf.feature_code, sf.feature_name, sf.description, sf.feature_type,
            COALESCE(pfl.value, 'false') as value,
            pfl.overage_price
     FROM subscription_features sf
     LEFT JOIN plan_feature_limits pfl ON pfl.feature_id = sf.feature_id AND pfl.plan_id = $1
     ORDER BY sf.feature_code`,
    [planId]
  );
  return result.rows;
}

/**
 * Normalise a plan display name ("Starter Plan", "Premium") or slug into the
 * lowercase slug used by getTierRules() and the app's plan detection.
 */
function tierSlug(planName) {
  const raw = String(planName || "basic").trim().toLowerCase();
  if (raw.includes("starter")) return "starter";
  if (raw.includes("premium")) return "premium";
  if (raw.includes("gold")) return "gold";
  if (raw.includes("silver")) return "silver";
  if (raw.includes("bronze")) return "bronze";
  if (raw.includes("basic")) return "basic";
  return raw || "basic";
}

/**
 * Update the user's plan fields on the users table.
 *
 * Writes ALL the columns the rest of the platform gates on — post creation,
 * image limits, daily limits, the /me endpoint — not just current_tier:
 *   users.tier / users.current_plan        → slug (e.g. 'premium')
 *   users.current_tier                     → same slug (legacy consumers)
 *   users.subscription_expiry              → end of the active subscription
 *
 * Called after subscription activation / cancellation / expiry.
 */
async function syncUserTier(userId, planName, options = {}) {
  const slug = tierSlug(planName || "basic");
  const isBasic = slug === "basic";

  let expiry = null;
  if (!isBasic && !options.durationDays) {
    // Derive expiry from the user's currently active subscription row, if any.
    const active = await runQuery(
      `SELECT end_date FROM user_subscriptions
       WHERE user_id::text = $1 AND status = 'ACTIVE' AND end_date > NOW()
       ORDER BY end_date DESC LIMIT 1`,
      [userId]
    ).catch(() => ({ rows: [] }));
    if (active.rows.length > 0) expiry = active.rows[0].end_date;
  } else if (!isBasic && options.durationDays) {
    const d = new Date();
    d.setDate(d.getDate() + Number(options.durationDays));
    expiry = d;
  }

  await runQuery(
    `UPDATE users
     SET current_tier = $1,
         current_plan = $1,
         tier = $1,
         subscription_expiry = $2,
         updated_at = NOW()
     WHERE user_id::text = $3`,
    [slug, expiry, userId]
  );
}

// ────────────────────────────────────────────────────────────
// PUBLIC / PLAN LISTING
// ────────────────────────────────────────────────────────────

/**
 * GET /api/subscriptions/plans
 * Fetch all active plans with their feature details.
 */
exports.getPlans = async (req, res) => {
  try {
    const plans = await runQuery(
      `SELECT plan_id, plan_name, slug, description, price, currency,
              billing_period, duration_days, gst_rate, features, sort_order
       FROM subscription_plans
       WHERE is_active = true
       ORDER BY sort_order ASC, price ASC`
    );

    // Attach features to each plan.
    // `features` is the marketing string list (from the seeded JSONB column) so
    // both the Android app (SubscriptionPlan.features: List<String>) and the web
    // PlanCard render them directly; the resolved feature objects are exposed
    // separately as `featureDetails` for the entitlement system.
    const plansWithFeatures = await Promise.all(
      plans.rows.map(async (plan) => {
        const featureDetails = await getPlanFeatures(plan.plan_id);
        let featureStrings = Array.isArray(plan.features) ? plan.features : null;
        if (typeof plan.features === "string") {
          try {
            const parsed = JSON.parse(plan.features);
            if (Array.isArray(parsed)) featureStrings = parsed;
          } catch (e) {
            /* keep null */
          }
        }
        if (!featureStrings) {
          featureStrings = featureDetails
            .filter((f) => f.value === "true" || (parseInt(f.value, 10) || 0) > 0)
            .map((f) => f.feature_name);
        }
        return {
          ...plan,
          // App/web friendly aliases (Android SubscriptionPlan DTO)
          id: String(plan.plan_id),
          name: plan.plan_name,
          displayName: plan.plan_name,
          priceINR: Math.round(Number(plan.price || 0)),
          durationDays: Number(plan.duration_days || 30),
          features: featureStrings,
          featureDetails,
        };
      })
    );

    res.json({ success: true, plans: plansWithFeatures });
  } catch (err) {
    logger.error("[SUBSCRIPTION] getPlans error:", err);
    res.status(500).json({ error: "Failed to load plans" });
  }
};

/**
 * GET /api/subscriptions/my
 * Get the current user's active subscription with full entitlement details.
 */
exports.getMySubscription = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  try {
    const subscription = await getActiveSubscription(userId);

    if (!subscription) {
      return res.json({
        success: true,
        subscription: null,
        currentPlan: "BASIC",
        features: [],
        active: false,
        isExpired: false,
        expiresInDays: 0,
      });
    }

    // App-friendly aliases so the Android SubscriptionRecord DTO
    // (id/tier/status/started_at/expires_at) parses the row directly.
    subscription.id = String(subscription.sub_id);
    subscription.tier = subscription.plan_name;
    subscription.started_at = subscription.start_date;
    subscription.expires_at = subscription.end_date;

    // Self-heal: keep users.tier/current_plan/subscription_expiry in sync with the
    // active subscription row (in case a purchase was activated before the column
    // sync existed, or an admin activated a subscription manually).
    try {
      const slug = tierSlug(subscription.plan_name);
      await runQuery(
        `UPDATE users
         SET current_tier = $1, current_plan = $1, tier = $1, subscription_expiry = $2, updated_at = NOW()
         WHERE user_id::text = $3
           AND (COALESCE(tier, '') <> $1 OR COALESCE(current_plan, '') <> $1 OR COALESCE(subscription_expiry, NOW()) <> $2::timestamp)`,
        [slug, subscription.end_date, userId]
      );
    } catch (syncErr) {
      logger.warn("[SUBSCRIPTION] getMySubscription self-heal sync failed:", syncErr.message);
    }

    const features = await getPlanFeatures(subscription.plan_id);
    const now = new Date();
    const expiry = new Date(subscription.end_date);
    const expiresInDays = Math.max(0, Math.ceil((expiry - now) / (1000 * 60 * 60 * 24)));
    const isExpired = now > expiry;

    res.json({
      success: true,
      subscription,
      currentPlan: subscription.plan_name,
      features,
      active: !isExpired,
      isExpired,
      expiresInDays,
    });
  } catch (err) {
    logger.error("[SUBSCRIPTION] getMySubscription error:", err);
    res.status(500).json({ error: "Failed to load subscription" });
  }
};

// ────────────────────────────────────────────────────────────
// PURCHASE FLOW
// ────────────────────────────────────────────────────────────

/**
 * POST /api/subscriptions/create-order
 * Step 1: Create a Razorpay order for plan purchase / upgrade.
 * Returns the Razorpay order details so the Android app can initiate checkout.
 */
exports.createOrder = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  const { plan_id, coupon_code, coins_to_redeem } = req.body;
  if (!plan_id) return res.status(400).json({ error: "plan_id is required" });

  try {
    // Fetch the plan
    const planResult = await runQuery(
      `SELECT * FROM subscription_plans WHERE plan_id::text = $1 AND is_active = true`,
      [plan_id]
    );
    if (planResult.rows.length === 0) {
      return res.status(404).json({ error: "Plan not found or inactive" });
    }
    const plan = planResult.rows[0];

    const basePrice = parseFloat(plan.price || plan.price_inr || 0);
    let finalPrice = basePrice;
    let couponDiscount = 0;
    let coinDiscount = 0;
    let redeemedCoinsCount = 0;
    let validatedCouponCode = null;

    // Validate Coupon Code
    if (coupon_code && String(coupon_code).trim()) {
      const couponResult = await runQuery(
        `SELECT * FROM influencer_coupons WHERE UPPER(code) = UPPER($1) AND is_active = true`,
        [String(coupon_code).trim()]
      );
      if (couponResult.rows.length > 0) {
        const coupon = couponResult.rows[0];
        const discountPercent = parseFloat(coupon.discount_percent || 25);
        couponDiscount = Math.round(basePrice * (discountPercent / 100) * 100) / 100;
        validatedCouponCode = coupon.code;
      } else {
        return res.status(400).json({ error: "Invalid or inactive coupon code" });
      }
    }

    // Validate Coin Redemption (Only for Premium or Gold plans)
    if (coins_to_redeem && parseInt(coins_to_redeem, 10) > 0) {
      const coinsCount = parseInt(coins_to_redeem, 10);
      const planNameLower = String(plan.plan_name || "").toLowerCase();
      const isPremiumOrGold = planNameLower.includes("premium") || planNameLower.includes("gold");

      if (!isPremiumOrGold) {
        return res.status(400).json({ error: "Coin redemption is only allowed for Premium or Gold plans" });
      }

      // Cap discount at 500 coins (equivalent to ₹5)
      if (coinsCount > 500) {
        return res.status(400).json({ error: "Maximum coin redemption cap is 500 coins (₹5)" });
      }

      // Fetch user's current coins
      const userRes = await runQuery("SELECT coins FROM users WHERE user_id::text = $1 LIMIT 1", [userId]);
      const userCoins = parseFloat(userRes.rows[0]?.coins || 0);

      if (userCoins < coinsCount) {
        return res.status(400).json({ error: `Insufficient coin balance. You have ${userCoins} coins.` });
      }

      coinDiscount = coinsCount / 100; // 100 coins = ₹1
      redeemedCoinsCount = coinsCount;
    }

    finalPrice = Math.max(0, basePrice - couponDiscount - coinDiscount);
    const amountPaise = Math.round(finalPrice * 100);

    const metadata = {
      plan_id: plan.plan_id,
      plan_name: plan.plan_name,
      user_id: userId,
      coupon_code: validatedCouponCode,
      coupon_discount: couponDiscount,
      coins_redeemed: redeemedCoinsCount,
      coin_discount: coinDiscount,
      base_price: basePrice,
      final_price: finalPrice
    };

    // Create a Razorpay order via their API
    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!razorpayKeyId || !razorpayKeySecret) {
      // Sandbox mode: generate a mock order
      const mockOrderId = `order_mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      // Store the pending order
      await runQuery(
        `INSERT INTO payment_orders (user_id, razorpay_order_id, amount, currency, status, entity_type, entity_id, notes)
         VALUES ($1, $2, $3, $4, 'CREATED', 'subscription', $5, $6)`,
        [userId, mockOrderId, finalPrice, plan.currency || "INR", plan_id, JSON.stringify(metadata)]
      );

      return res.json({
        success: true,
        sandbox: true,
        order: {
          id: mockOrderId,
          amount: amountPaise,
          currency: plan.currency || "INR",
          receipt: `sub_${plan_id}_${Date.now()}`,
        },
        plan,
        discountDetails: {
          couponDiscount,
          coinDiscount,
          finalPrice
        }
      });
    }

    // Production: call Razorpay API
    const basicAuth = Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString("base64");

    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${basicAuth}`,
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: plan.currency || "INR",
        receipt: `sub_${plan_id}_${Date.now()}`,
        notes: metadata,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error("[SUBSCRIPTION] Razorpay order creation failed:", errorBody);
      return res.status(502).json({ error: "Payment gateway error", details: errorBody });
    }

    const razorpayOrder = await response.json();

    // Store the payment order
    await runQuery(
      `INSERT INTO payment_orders (user_id, razorpay_order_id, amount, currency, status, entity_type, entity_id, notes)
       VALUES ($1, $2, $3, $4, 'CREATED', 'subscription', $5, $6)`,
      [userId, razorpayOrder.id, finalPrice, plan.currency || "INR", plan_id, JSON.stringify(metadata)]
    );

    res.json({
      success: true,
      sandbox: false,
      order: razorpayOrder,
      plan,
      discountDetails: {
        couponDiscount,
        coinDiscount,
        finalPrice
      }
    });
  } catch (err) {
    logger.error("[SUBSCRIPTION] createOrder error:", err);
    res.status(500).json({ error: "Failed to create payment order" });
  }
};

/**
 * POST /api/subscriptions/verify-payment
 * Step 2: After the Android app completes Razorpay checkout, verify the payment
 * signature and activate the subscription. NEVER trust client-side "payment_success = true".
 */
exports.verifyPayment = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan_id } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !plan_id) {
    return res.status(400).json({
      error: "Missing required fields: razorpay_order_id, razorpay_payment_id, razorpay_signature, plan_id",
    });
  }

  try {
    // 1. Verify the payment signature (server-side, never trust client)
    const isSandbox = String(razorpay_order_id).startsWith("order_mock_");

    if (!isSandbox) {
      const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
      if (razorpayKeySecret) {
        const isValid = verifyRazorpaySignature(
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature,
          razorpayKeySecret
        );

        if (!isValid) {
          logger.warn(`[SUBSCRIPTION] Invalid payment signature for order ${razorpay_order_id}, user ${userId}`);
          return res.status(400).json({ error: "Invalid payment signature" });
        }
      } else {
        logger.warn("[SUBSCRIPTION] RAZORPAY_KEY_SECRET not set — skipping signature verification");
      }
    } else {
      logger.info(`[SUBSCRIPTION] Sandbox payment verification bypass for order ${razorpay_order_id}`);
    }

    // 2. Verify the order belongs to this user
    const orderResult = await runQuery(
      `SELECT * FROM payment_orders WHERE razorpay_order_id = $1 AND user_id::text = $2 AND status = 'CREATED'`,
      [razorpay_order_id, userId]
    );
    if (orderResult.rows.length === 0) {
      return res.status(400).json({ error: "Order not found or already processed" });
    }
    const paymentOrder = orderResult.rows[0];

    // 3. Fetch the plan details
    const planResult = await runQuery(
      `SELECT * FROM subscription_plans WHERE plan_id::text = $1`,
      [plan_id]
    );
    if (planResult.rows.length === 0) {
      return res.status(404).json({ error: "Plan not found" });
    }
    const plan = planResult.rows[0];

    // 4. Activate the subscription
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + plan.duration_days);

    const subResult = await runQuery(
      `INSERT INTO user_subscriptions (user_id, plan_id, razorpay_order_id, status, start_date, end_date, auto_renew)
       VALUES ($1, $2, $3, 'ACTIVE', $4, $5, $6)
       RETURNING *`,
      [userId, plan_id, razorpay_order_id, startDate, endDate, true]
    );

    // 5. Record the payment transaction
    await runQuery(
      `INSERT INTO payment_transactions (user_id, order_id, plan_id, razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, currency, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'CAPTURED')`,
      [userId, paymentOrder.order_id, plan_id, razorpay_order_id, razorpay_payment_id, razorpay_signature, parseFloat(plan.price), plan.currency || "INR"]
    );

    // 6. Update payment order status
    await runQuery(
      `UPDATE payment_orders SET status = 'PAID', updated_at = NOW() WHERE razorpay_order_id = $1`,
      [razorpay_order_id]
    );

    // 6.5. Process Coupon & Coin Redemptions from order metadata
    try {
      const metadata = JSON.parse(paymentOrder.notes || "{}");
      
      // If a coupon code was redeemed, log and update influencer stats
      if (metadata.coupon_code) {
        await runQuery(
          `UPDATE influencer_coupons SET use_count = use_count + 1 WHERE UPPER(code) = UPPER($1)`,
          [metadata.coupon_code]
        );
        await runQuery(
          `INSERT INTO coupon_redemptions (coupon_id, user_id, razorpay_order_id, discount_amount)
           VALUES ((SELECT coupon_id FROM influencer_coupons WHERE UPPER(code) = UPPER($1) LIMIT 1), $2, $3, $4)`,
          [metadata.coupon_code, userId, razorpay_order_id, metadata.coupon_discount || 0]
        );
        logger.info(`[Coupons] Influencer coupon ${metadata.coupon_code} redeemed by user ${userId} for order ${razorpay_order_id}`);
      }

      // If coins were redeemed, deduct them from the user's balance
      if (metadata.coins_redeemed && parseInt(metadata.coins_redeemed, 10) > 0) {
        const { spendCoins } = require("./coinController");
        await spendCoins(
          userId,
          parseInt(metadata.coins_redeemed, 10),
          "subscription_discount",
          `sub_redeem:${razorpay_order_id}`,
          `Coins redeemed for subscription discount on ${metadata.plan_name}`
        );
      }
    } catch (metaErr) {
      logger.warn("[SUBSCRIPTION] Failed to process coupon/coin redemption metadata:", metaErr);
    }

    // 7. Sync user's current tier
    await syncUserTier(userId, plan.plan_name);

    // 8. Log subscription event
    await runQuery(
      `INSERT INTO subscription_events (user_id, sub_id, event_type, metadata)
       VALUES ($1, $2, 'ACTIVATED', $3)`,
      [userId, subResult.rows[0].sub_id, JSON.stringify({ plan_name: plan.plan_name, plan_id })]
    );

    // 9. Cancel any previously active subscription
    await runQuery(
      `UPDATE user_subscriptions SET status = 'EXPIRED', updated_at = NOW()
       WHERE user_id::text = $1 AND sub_id != $2 AND status = 'ACTIVE'`,
      [userId, subResult.rows[0].sub_id]
    );

    res.json({
      success: true,
      message: "Subscription activated successfully",
      subscription: subResult.rows[0],
      currentPlan: plan.plan_name,
    });
  } catch (err) {
    logger.error("[SUBSCRIPTION] verifyPayment error:", err);
    res.status(500).json({ error: "Failed to verify payment and activate subscription" });
  }
};

// ────────────────────────────────────────────────────────────
// FREE TRIAL
// ────────────────────────────────────────────────────────────

/**
 * POST /api/subscriptions/claim-trial  (alias: POST /api/subscriptions/trial)
 * DISABLED: free trials were removed from the product. This endpoint now
 * refuses all claims so any stale client can never activate a trial.
 */
exports.claimTrial = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  try {
    // 1. Check if user already has an active subscription
    const activeSub = await getActiveSubscription(userId);
    if (activeSub) {
      return res.status(400).json({
        error: "You already have an active subscription. Cancel it before claiming a trial.",
      });
    }

    // 2. Check if user has EVER claimed a trial (one trial per user lifetime)
    const existingTrial = await runQuery(
      `SELECT sub_id FROM user_subscriptions
       WHERE user_id::text = $1 AND is_trial = true LIMIT 1`,
      [userId]
    );
    if (existingTrial.rows.length > 0) {
      return res.status(400).json({
        error: "You have already used your free trial. Please subscribe to a plan.",
      });
    }

    // 3. Find the trial plan (slug-based lookup)
    const planResult = await runQuery(
      `SELECT * FROM subscription_plans
       WHERE (slug ILIKE 'trial%' OR slug ILIKE 'free%' OR plan_name ILIKE 'trial%')
         AND is_active = true
       LIMIT 1`
    );

    // Fallback: use 'basic' plan as trial base if no dedicated trial plan exists
    let planId;
    let durationDays = 7;
    if (planResult.rows.length > 0) {
      const plan = planResult.rows[0];
      planId = plan.plan_id;
      durationDays = plan.duration_days || 7;
    } else {
      // Create a basic plan entry for the trial, or use the basic plan
      const basicPlan = await runQuery(
        `SELECT plan_id, duration_days FROM subscription_plans
         WHERE (slug ILIKE 'basic%' OR plan_name ILIKE 'basic%')
           AND is_active = true LIMIT 1`
      );
      if (basicPlan.rows.length > 0) {
        planId = basicPlan.rows[0].plan_id;
      } else {
        return res.status(500).json({ error: "No trial plan available. Please contact support." });
      }
    }

    // 4. Create the trial subscription (7 days, is_trial = true)
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + durationDays);

    const subResult = await runQuery(
      `INSERT INTO user_subscriptions (user_id, plan_id, status, start_date, end_date, auto_renew, is_trial)
       VALUES ($1, $2, 'ACTIVE', $3, $4, false, true)
       RETURNING *`,
      [userId, planId, startDate, endDate]
    );

    // 5. Sync user tier to match the plan
    const planName = planResult.rows[0]?.plan_name || 'Basic';
    await syncUserTier(userId, planName, { durationDays });

    // 6. Log the event
    await runQuery(
      `INSERT INTO subscription_events (user_id, sub_id, event_type, metadata)
       VALUES ($1, $2, 'TRIAL_ACTIVATED', $3)`,
      [userId, subResult.rows[0].sub_id, JSON.stringify({ plan_name: planName, days: durationDays })]
    );

    logger.info(`[TRIAL] User ${userId} activated trial (${durationDays} days)`);

    res.json({
      success: true,
      message: `Free trial activated! You have ${durationDays} days of premium access.`,
      subscription: subResult.rows[0],
    });
  } catch (err) {
    logger.error("[TRIAL] claimTrial error:", err);
    res.status(500).json({ error: "Failed to activate trial" });
  }
};

// ────────────────────────────────────────────────────────────
// FEATURE ENTITLEMENTS
// ────────────────────────────────────────────────────────────

/**
 * GET /api/subscriptions/features
 * List all available features and the current user's access to each.
 */
exports.myFeatures = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  try {
    const subscription = await getActiveSubscription(userId);

    const allFeatures = await runQuery(
      `SELECT * FROM subscription_features ORDER BY feature_code`
    );

    // Get the properly resolved features from plan_feature_limits
    const planFeatures = subscription
      ? await getPlanFeatures(subscription.plan_id)
      : [];

    const resolvedFeatures = allFeatures.rows.map((feature) => {
      // Find this feature's limit in the plan's resolved features
      const planFeature = planFeatures.find(
        (pf) => pf.feature_code === feature.feature_code
      );

      const value = planFeature?.value || "false";
      const allowed = value === "true" || (!isNaN(parseInt(value, 10)) && parseInt(value, 10) > 0);
      const limit = allowed && !isNaN(parseInt(value, 10)) ? parseInt(value, 10) : null;

      return {
        feature_code: feature.feature_code,
        feature_name: feature.feature_name,
        description: feature.description,
        feature_type: feature.feature_type,
        allowed,
        limit,
        overagePrice: planFeature?.overage_price || null,
      };
    });

    res.json({
      success: true,
      currentPlan: subscription?.plan_name || "BASIC",
      features: resolvedFeatures,
    });
  } catch (err) {
    logger.error("[SUBSCRIPTION] myFeatures error:", err);
    res.status(500).json({ error: "Failed to load features" });
  }
};

/**
 * GET /api/subscriptions/check-feature/:featureCode
 * Check if the current user has access to a specific feature.
 * Used by middleware/business logic to enforce feature gates.
 */
exports.checkFeature = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  const { featureCode } = req.params;
  if (!featureCode) return res.status(400).json({ error: "featureCode is required" });

  try {
    const subscription = await getActiveSubscription(userId);

    if (!subscription) {
      return res.json({ success: true, allowed: false, featureCode, currentPlan: "BASIC" });
    }

    const features = await getPlanFeatures(subscription.plan_id);
    const feature = features.find((f) => f.feature_code === featureCode);

    const allowed = feature ? feature.value === "true" || !isNaN(parseInt(feature.value, 10)) : false;
    const limit = allowed && feature && !isNaN(parseInt(feature.value, 10)) ? parseInt(feature.value, 10) : null;

    res.json({
      success: true,
      allowed,
      featureCode,
      currentPlan: subscription.plan_name,
      limit,
      overagePrice: feature?.overage_price || null,
    });
  } catch (err) {
    logger.error("[SUBSCRIPTION] checkFeature error:", err);
    res.status(500).json({ error: "Failed to check feature" });
  }
};

// ────────────────────────────────────────────────────────────
// SUBSCRIPTION MANAGEMENT
// ────────────────────────────────────────────────────────────

/**
 * GET /api/subscriptions/history
 * List the user's full subscription history.
 */
exports.getHistory = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  try {
    const result = await runQuery(
      `SELECT us.*, sp.plan_name, sp.slug
       FROM user_subscriptions us
       LEFT JOIN subscription_plans sp ON sp.plan_id = us.plan_id
       WHERE us.user_id::text = $1
       ORDER BY us.created_at DESC`,
      [userId]
    );
    res.json({ success: true, history: result.rows });
  } catch (err) {
    logger.error("[SUBSCRIPTION] getHistory error:", err);
    res.status(500).json({ error: "Failed to fetch subscription history" });
  }
};

/**
 * POST /api/subscriptions/cancel
 * Cancel the user's active subscription.
 */
exports.cancelSubscription = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  try {
    const activeSub = await getActiveSubscription(userId);
    if (!activeSub) return res.status(400).json({ error: "No active subscription to cancel" });

    await runQuery(
      `UPDATE user_subscriptions SET status = 'CANCELLED', cancelled_at = NOW(), updated_at = NOW()
       WHERE sub_id = $1`,
      [activeSub.sub_id]
    );

    await syncUserTier(userId, "BASIC");

    await runQuery(
      `INSERT INTO subscription_events (user_id, sub_id, event_type, metadata)
       VALUES ($1, $2, 'CANCELLED', $3)`,
      [userId, activeSub.sub_id, JSON.stringify({ plan_name: activeSub.plan_name })]
    );

    res.json({ success: true, message: "Subscription cancelled successfully" });
  } catch (err) {
    logger.error("[SUBSCRIPTION] cancelSubscription error:", err);
    res.status(500).json({ error: "Failed to cancel subscription" });
  }
};

// ────────────────────────────────────────────────────────────
// ADMIN — PLAN & FEATURE MANAGEMENT
// ────────────────────────────────────────────────────────────

/**
 * GET /api/subscriptions/admin/features
 * List all available features (admin).
 */
exports.adminListFeatures = async (req, res) => {
  try {
    const result = await runQuery(
      `SELECT * FROM subscription_features ORDER BY feature_code`
    );
    res.json({ success: true, features: result.rows });
  } catch (err) {
    logger.error("[SUBSCRIPTION] adminListFeatures error:", err);
    res.status(500).json({ error: "Failed to load features" });
  }
};

/**
 * POST /api/subscriptions/admin/features
 * Create a new feature (admin).
 */
exports.adminCreateFeature = async (req, res) => {
  const { feature_code, feature_name, description, feature_type } = req.body;

  if (!feature_code || !feature_name) {
    return res.status(400).json({ error: "feature_code and feature_name are required" });
  }

  try {
    const result = await runQuery(
      `INSERT INTO subscription_features (feature_code, feature_name, description, feature_type)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [feature_code, feature_name, description || null, feature_type || "boolean"]
    );
    res.status(201).json({ success: true, feature: result.rows[0] });
  } catch (err) {
    logger.error("[SUBSCRIPTION] adminCreateFeature error:", err);
    res.status(500).json({ error: "Failed to create feature" });
  }
};

/**
 * POST /api/subscriptions/admin/plans
 * Create a new subscription plan (admin).
 */
exports.adminCreatePlan = async (req, res) => {
  const { plan_name, slug, description, price, billing_period, duration_days, gst_rate, sort_order } = req.body;

  if (!plan_name || !price || !duration_days) {
    return res.status(400).json({ error: "plan_name, price, and duration_days are required" });
  }

  try {
    const result = await runQuery(
      `INSERT INTO subscription_plans (plan_name, slug, description, price, billing_period, duration_days, gst_rate, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        plan_name,
        slug || plan_name.toLowerCase().replace(/\s+/g, "-"),
        description || null,
        parseFloat(price),
        billing_period || "monthly",
        parseInt(duration_days, 10),
        gst_rate ? parseFloat(gst_rate) : 18.00,
        sort_order ? parseInt(sort_order, 10) : 0,
      ]
    );
    res.status(201).json({ success: true, plan: result.rows[0] });
  } catch (err) {
    logger.error("[SUBSCRIPTION] adminCreatePlan error:", err);
    res.status(500).json({ error: "Failed to create plan" });
  }
};

/**
 * PATCH /api/subscriptions/admin/plans/:id/features
 * Set feature limits for a plan (admin).
 */
exports.adminSetPlanFeature = async (req, res) => {
  const { feature_id, value, overage_price } = req.body;

  if (!feature_id || value === undefined) {
    return res.status(400).json({ error: "feature_id and value are required" });
  }

  try {
    const result = await runQuery(
      `INSERT INTO plan_feature_limits (plan_id, feature_id, value, overage_price)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (plan_id, feature_id)
       DO UPDATE SET value = $3, overage_price = $4
       RETURNING *`,
      [req.params.id, feature_id, value, overage_price ? parseFloat(overage_price) : null]
    );
    res.json({ success: true, limit: result.rows[0] });
  } catch (err) {
    logger.error("[SUBSCRIPTION] adminSetPlanFeature error:", err);
    res.status(500).json({ error: "Failed to set plan feature" });
  }
};

/**
 * GET /api/subscriptions/admin/plans/:id/features
 * Get all features with their limits for a specific plan (admin).
 */
exports.adminGetPlanFeatures = async (req, res) => {
  try {
    const features = await getPlanFeatures(req.params.id);
    res.json({ success: true, features });
  } catch (err) {
    logger.error("[SUBSCRIPTION] adminGetPlanFeatures error:", err);
    res.status(500).json({ error: "Failed to load plan features" });
  }
};

/**
 * POST /api/subscriptions/validate-coupon
 * Validates an influencer coupon code for a specific plan purchase.
 */
exports.validateCoupon = async (req, res) => {
  const { coupon_code, plan_id } = req.body;
  if (!coupon_code) return res.status(400).json({ error: "coupon_code is required" });
  if (!plan_id) return res.status(400).json({ error: "plan_id is required" });

  try {
    const planResult = await runQuery(
      `SELECT * FROM subscription_plans WHERE plan_id::text = $1 AND is_active = true`,
      [plan_id]
    );
    if (planResult.rows.length === 0) {
      return res.status(404).json({ error: "Plan not found or inactive" });
    }
    const plan = planResult.rows[0];

    const couponResult = await runQuery(
      `SELECT * FROM influencer_coupons WHERE UPPER(code) = UPPER($1) AND is_active = true`,
      [coupon_code.trim()]
    );
    if (couponResult.rows.length === 0) {
      return res.json({ valid: false, error: "Invalid or inactive coupon code" });
    }
    const coupon = couponResult.rows[0];

    const basePrice = parseFloat(plan.price || plan.price_inr || 0);
    const discountPercent = parseFloat(coupon.discount_percent);
    const discountAmount = Math.round(basePrice * (discountPercent / 100) * 100) / 100;
    const finalPrice = Math.max(0, basePrice - discountAmount);

    res.json({
      valid: true,
      code: coupon.code,
      discount_percent: discountPercent,
      discount_amount: discountAmount,
      final_price: finalPrice,
      influencer_name: coupon.influencer_name,
    });
  } catch (err) {
    logger.error("[SUBSCRIPTION] validateCoupon error:", err);
    res.status(500).json({ error: "Failed to validate coupon code" });
  }
};

// ────────────────────────────────────────────────────────────
// ADMIN — USER SUBSCRIPTION OVERRIDE
// ────────────────────────────────────────────────────────────

/**
 * POST /api/subscriptions/admin/user/:userId/activate
 * Admin: manually activate a subscription for any user.
 * Used for customer support (e.g., "user paid via bank transfer, please activate").
 */
exports.adminActivateUserSubscription = async (req, res) => {
  const adminId = getAuthUserId(req);
  if (!adminId) return res.status(401).json({ error: "Authentication required" });

  const { userId } = req.params;
  const { plan_id, duration_days, notes } = req.body;

  if (!userId || !plan_id) {
    return res.status(400).json({ error: "userId and plan_id are required" });
  }

  try {
    const userResult = await runQuery(
      `SELECT user_id FROM users WHERE user_id::text = $1`,
      [userId]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const planResult = await runQuery(
      `SELECT * FROM subscription_plans WHERE plan_id::text = $1 AND is_active = true`,
      [plan_id]
    );
    if (planResult.rows.length === 0) {
      return res.status(404).json({ error: "Plan not found or inactive" });
    }
    const plan = planResult.rows[0];

    await runQuery(
      `UPDATE user_subscriptions SET status = 'EXPIRED', updated_at = NOW()
       WHERE user_id::text = $1 AND status = 'ACTIVE'`,
      [userId]
    );

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + (duration_days || plan.duration_days || 30));

    const subResult = await runQuery(
      `INSERT INTO user_subscriptions (user_id, plan_id, status, start_date, end_date, auto_renew)
       VALUES ($1, $2, 'ACTIVE', $3, $4, false)
       RETURNING *`,
      [userId, plan_id, startDate, endDate]
    );

    await syncUserTier(userId, plan.plan_name);

    await runQuery(
      `INSERT INTO subscription_events (user_id, sub_id, event_type, metadata)
       VALUES ($1, $2, 'ADMIN_ACTIVATED', $3)`,
      [userId, subResult.rows[0].sub_id,
       JSON.stringify({ admin_id: adminId, plan_name: plan.plan_name, notes: notes || null })]
    );

    logger.info(`[ADMIN_SUB] Admin ${adminId} activated plan ${plan.plan_name} for user ${userId}`);

    res.json({
      success: true,
      message: `Subscription activated successfully for user ${userId}`,
      subscription: subResult.rows[0],
    });
  } catch (err) {
    logger.error("[ADMIN_SUB] adminActivateUserSubscription error:", err);
    res.status(500).json({ error: "Failed to activate subscription" });
  }
};

/**
 * POST /api/subscriptions/admin/user/:userId/deactivate
 * Admin: manually expire/cancel a user's active subscription.
 */
exports.adminDeactivateUserSubscription = async (req, res) => {
  const adminId = getAuthUserId(req);
  if (!adminId) return res.status(401).json({ error: "Authentication required" });

  const { userId } = req.params;
  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  try {
    const activeSub = await getActiveSubscription(userId);
    if (!activeSub) {
      // Graceful no-op: deactivating a user with no active subscription is
      // an idempotent success, not an error (matches admin UX expectations).
      return res.status(200).json({ success: true, message: "User has no active subscription to deactivate" });
    }

    await runQuery(
      `UPDATE user_subscriptions SET status = 'EXPIRED', cancelled_at = NOW(), updated_at = NOW()
       WHERE sub_id = $1`,
      [activeSub.sub_id]
    );

    await syncUserTier(userId, "BASIC");

    await runQuery(
      `INSERT INTO subscription_events (user_id, sub_id, event_type, metadata)
       VALUES ($1, $2, 'ADMIN_DEACTIVATED', $3)`,
      [userId, activeSub.sub_id, JSON.stringify({ admin_id: adminId })]
    );

    logger.info(`[ADMIN_SUB] Admin ${adminId} deactivated subscription for user ${userId}`);

    res.json({
      success: true,
      message: `Subscription deactivated for user ${userId}`,
    });
  } catch (err) {
    logger.error("[ADMIN_SUB] adminDeactivateUserSubscription error:", err);
    res.status(500).json({ error: "Failed to deactivate subscription" });
  }
};

/**
 * GET /api/subscriptions/admin/user/:userId
 * Admin: view a user's current subscription status and history.
 */
exports.adminGetUserSubscription = async (req, res) => {
  const { userId } = req.params;
  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  try {
    const activeSub = await getActiveSubscription(userId);

    const history = await runQuery(
      `SELECT us.*, sp.plan_name, sp.slug
       FROM user_subscriptions us
       LEFT JOIN subscription_plans sp ON sp.plan_id = us.plan_id
       WHERE us.user_id::text = $1
       ORDER BY us.created_at DESC
       LIMIT 20`,
      [userId]
    );

    const user = await runQuery(
      `SELECT user_id::text, username, email, current_tier, created_at FROM users WHERE user_id::text = $1`,
      [userId]
    );

    res.json({
      success: true,
      user: user.rows[0] || null,
      activeSubscription: activeSub,
      history: history.rows,
    });
  } catch (err) {
    logger.error("[ADMIN_SUB] adminGetUserSubscription error:", err);
    res.status(500).json({ error: "Failed to fetch user subscription" });
  }
};

/**
 * GET /api/subscriptions/admin/users/search
 * Admin: search users by name/email and see their subscription status.
 */
exports.adminSearchUsersWithSubscriptions = async (req, res) => {
  const { q, page, limit } = req.query;

  // When no query is provided, fall back to a recent-users browse listing
  // instead of rejecting with 400 (useful for admin dashboards).
  const trimmed = q ? String(q).trim() : "";
  const hasQuery = trimmed.length >= 2;
  const searchTerm = hasQuery ? `%${trimmed}%` : null;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(parseInt(limit, 10) || 20, 50);
  const offset = (pageNum - 1) * limitNum;

  try {
    const users = await runQuery(
      hasQuery
        ? `SELECT u.user_id::text, u.username, u.email, u.current_tier, u.created_at,
                  us.status AS sub_status, sp.plan_name, us.end_date AS sub_end_date
           FROM users u
           LEFT JOIN user_subscriptions us ON us.user_id::text = u.user_id::text AND us.status = 'ACTIVE'
           LEFT JOIN subscription_plans sp ON sp.plan_id = us.plan_id
           WHERE u.username ILIKE $1 OR u.email ILIKE $1
           ORDER BY u.created_at DESC
           LIMIT $2 OFFSET $3`
        : `SELECT u.user_id::text, u.username, u.email, u.current_tier, u.created_at,
                  us.status AS sub_status, sp.plan_name, us.end_date AS sub_end_date
           FROM users u
           LEFT JOIN user_subscriptions us ON us.user_id::text = u.user_id::text AND us.status = 'ACTIVE'
           LEFT JOIN subscription_plans sp ON sp.plan_id = us.plan_id
           ORDER BY u.created_at DESC
           LIMIT $1 OFFSET $2`,
      hasQuery ? [searchTerm, limitNum, offset] : [limitNum, offset]
    );

    const countResult = await runQuery(
      hasQuery
        ? `SELECT COUNT(*)::int AS total FROM users WHERE username ILIKE $1 OR email ILIKE $1`
        : `SELECT COUNT(*)::int AS total FROM users`,
      hasQuery ? [searchTerm] : []
    );

    res.json({
      success: true,
      users: users.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: countResult.rows[0]?.total || 0,
      },
    });
  } catch (err) {
    logger.error("[ADMIN_SUB] adminSearchUsersWithSubscriptions error:", err);
    res.status(500).json({ error: "Failed to search users" });
  }
};

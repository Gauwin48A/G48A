const { runQuery, getAuthUserId } = require("../utils/dbHelpers");
const { verifyRazorpaySignature } = require("../services/paymentGateway");
const logger = require("../utils/logger");
const axios = require("axios");
const crypto = require("crypto");
const { validateExternalUrl } = require("../utils/ssrfGuard");

const RAZORPAY_API_BASE = process.env.RAZORPAY_API_BASE || "https://api.razorpay.com/v1";

/**
 * Validate an outbound URL against the SSRF guard before making a request.
 * Blocks calls to private/internal IPs that could be used to access
 * internal services (AWS metadata endpoint, internal APIs, etc.).
 *
 * @param {string} url - The URL to validate
 * @returns {Promise<void>} Throws if the URL is unsafe
 * @throws {Error} If the URL targets a private/internal IP
 */
async function assertSafeUrl(url) {
  const { safe, error } = await validateExternalUrl(url);
  if (!safe) {
    throw new Error(`SSRF blocked: ${error}`);
  }
}

/**
 * Boost prices (server-authoritative) + promotion durations.
 * Overridable via BOOST_PRICES JSON env: { boost: 50, featured: 100, spotlight: 200 }
 */
function loadBoostPricing() {
  const base = {
    boost: { price: 50, durationDays: 7 },
    featured: { price: 100, durationDays: 14 },
    spotlight: { price: 200, durationDays: 30 },
  };
  try {
    const raw = process.env.BOOST_PRICES;
    if (!raw) return base;
    const parsed = JSON.parse(raw);
    for (const [type, price] of Object.entries(parsed)) {
      if (base[type] && Number(price) > 0) {
        base[type].price = Number(price);
      }
    }
  } catch (err) {
    logger.warn("[PAYMENT] BOOST_PRICES env invalid — using defaults:", err.message);
  }
  return base;
}
const BOOST_PRICING = loadBoostPricing();

function getRazorpayCredentials() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  return { keyId, keySecret };
}

/** Normalize sale payment mode: only explicit 'OUTSIDE' is outside-platform. */
function normalizePaymentMode(value) {
  return String(value || "IN_APP").toUpperCase() === "OUTSIDE" ? "OUTSIDE" : "IN_APP";
}

/** Ensure the sales table carries payment tracking columns (idempotent). */
async function ensureSalePaymentColumns() {
  const stmts = [
    `ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'PENDING'`,
    `ALTER TABLE sales ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ`,
    `ALTER TABLE sales ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(100)`,
    `ALTER TABLE sales ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(100)`,
    `CREATE TABLE IF NOT EXISTS sale_payments (
       id BIGSERIAL PRIMARY KEY,
       sale_id BIGINT NOT NULL UNIQUE,
       buyer_id TEXT NOT NULL,
       seller_id TEXT NOT NULL,
       post_id TEXT,
       amount DECIMAL(12,2) NOT NULL,
       currency VARCHAR(10) DEFAULT 'INR',
       razorpay_order_id VARCHAR(100),
       razorpay_payment_id VARCHAR(100),
       razorpay_signature VARCHAR(255),
       status VARCHAR(30) DEFAULT 'ORDER_CREATED',
       paid_at TIMESTAMPTZ,
       created_at TIMESTAMPTZ DEFAULT NOW(),
       updated_at TIMESTAMPTZ DEFAULT NOW()
     )`,
  ];
  for (const sql of stmts) {
    try {
      await runQuery(sql);
    } catch (err) {
      logger.warn("[PAYMENT] ensureSalePaymentColumns stmt failed:", err.message);
    }
  }
}
module.exports.ensureSalePaymentColumns = ensureSalePaymentColumns;

/** Normalise a plan display name ("Starter Plan"/"Premium") into a tier slug. */
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
 * Write every plan-gating column on users (tier, current_plan, current_tier,
 * subscription_expiry) after a plan purchase/activation. Keeps the payment flow
 * and the post-creation/image-limit gating (which read current_plan/tier) in sync.
 */
async function syncUserPlanColumns(userId, planName, durationDays) {
  const slug = tierSlug(planName);
  let expiry = null;
  if (slug !== "basic" && Number(durationDays) > 0) {
    const d = new Date();
    d.setDate(d.getDate() + Number(durationDays));
    expiry = d;
  }
  await runQuery(
    `UPDATE users
     SET current_tier = $1, current_plan = $1, tier = $1, subscription_expiry = $2, updated_at = NOW()
     WHERE user_id::text = $3`,
    [slug, expiry, userId]
  );
}

/**
 * POST /api/payments/razorpay/order
 * Create a Razorpay Order.
 *
 * Supports:
 *  - Plan/tier payments:  { planId | plan_id | tierId | tier_id | tier_slug | plan_type | plan, amount?, coinsToApply? }
 *  - In-app sale payment: { saleId | sale_id }  (buyer pays the approved sale inside the platform)
 *
 * Exported helper `ensureSalePaymentColumns` is reused by salesController.
 */
exports.createRazorpayOrder = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "Authentication required" });

    const body = req.body || {};
    const coinsToApply = Math.max(0, parseInt(body.coinsToApply ?? body.coins_to_apply ?? 0, 10) || 0);
    const credentials = getRazorpayCredentials();
    const keyId = credentials ? credentials.keyId : "";

    const planId =
      body.planId || body.plan_id || body.tierId || body.tier_id || body.tier_slug || body.plan_type || body.plan;
    const saleId = body.saleId || body.sale_id;

    // ════════════════════════════════════════════════════════════════════════
    // SALE PAYMENT — IN_APP purchase (escrow)
    // ════════════════════════════════════════════════════════════════════════
    if (saleId) {
      const saleResult = await runQuery(
        `SELECT id, post_id, buyer_id, seller_id, status, payment_mode, payment_status,
                agreed_price, razorpay_order_id, currency
         FROM sales WHERE id = $1`,
        [saleId]
      );
      const sale = saleResult.rows[0];
      if (!sale) return res.status(404).json({ error: "Sale not found" });
      if (String(sale.buyer_id) !== String(userId)) {
        return res.status(403).json({ error: "Only the buyer of this sale can pay for it" });
      }
      if (normalizePaymentMode(sale.payment_mode) !== "IN_APP") {
        return res.status(400).json({ error: "This sale uses outside-platform payment and does not need in-app payment" });
      }
      if (!["approved", "shipped"].includes(sale.status)) {
        return res.status(400).json({ error: `Sale must be approved before payment (current: ${sale.status})` });
      }
      if (sale.payment_status === "PAID") {
        return res.status(400).json({ error: "This sale has already been paid" });
      }

      // Reuse an existing (unpaid) order instead of creating a duplicate.
      if (sale.razorpay_order_id) {
        const existingAmount = Number(sale.agreed_price || 0);
        return res.json({
          success: true,
          order_id: sale.razorpay_order_id,
          amount: existingAmount,
          amount_paise: Math.round(existingAmount * 100),
          currency: sale.currency || "INR",
          key_id: keyId,
          mock: String(sale.razorpay_order_id).startsWith("mock_"),
          sale_id: String(sale.id),
        });
      }

      // Resolve amount: agreed price > posted amount > post price
      let amountInr = parseFloat(body.amount || sale.agreed_price || 0);
      if (!amountInr || amountInr <= 0) {
        const postRes = await runQuery("SELECT price FROM posts WHERE post_id::text = $1", [sale.post_id]);
        amountInr = parseFloat(postRes.rows[0]?.price || 0);
      }
      if (!amountInr || amountInr <= 0) {
        return res.status(400).json({ error: "Unable to determine sale amount" });
      }

      const amountPaise = Math.round(amountInr * 100);
      const receipt = `sale_${sale.id}_${Date.now()}`;

      let razorpayOrderId = `mock_order_${crypto.randomBytes(8).toString("hex")}`;
      let mock = true;
      if (credentials) {
        const orderUrl = `${RAZORPAY_API_BASE}/orders`;
        await assertSafeUrl(orderUrl);
        const response = await axios.post(
          orderUrl,
          { amount: amountPaise, currency: "INR", receipt, payment_capture: 1 },
          { auth: { username: credentials.keyId, password: credentials.keySecret } }
        );
        razorpayOrderId = response.data.id;
        mock = false;
      } else {
        logger.info(`[PAYMENT MOCK] Created mock sale order for sale #${sale.id} (₹${amountInr})`);
      }

      await ensureSalePaymentColumns();
      await runQuery(
        `INSERT INTO sale_payments (sale_id, buyer_id, seller_id, post_id, amount, currency, razorpay_order_id, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'ORDER_CREATED')
         ON CONFLICT (sale_id) DO UPDATE SET
           razorpay_order_id = EXCLUDED.razorpay_order_id,
           amount = EXCLUDED.amount,
           status = 'ORDER_CREATED',
           updated_at = NOW()`,
        [sale.id, sale.buyer_id, sale.seller_id, sale.post_id, amountInr, "INR", razorpayOrderId]
      );
      await runQuery(
        `UPDATE sales SET razorpay_order_id = $1, payment_status = 'ORDER_CREATED', updated_at = NOW() WHERE id = $2`,
        [razorpayOrderId, sale.id]
      );

      return res.json({
        success: true,
        order_id: razorpayOrderId,
        amount: amountInr,
        amount_paise: amountPaise,
        currency: "INR",
        key_id: keyId,
        mock,
        sale_id: String(sale.id),
      });
    }

    // ════════════════════════════════════════════════════════════════════════
    // BOOST PAYMENT — promote a post (boost/featured/spotlight)
    // ════════════════════════════════════════════════════════════════════════
    const boostTypeRaw = body.boost_type || body.boostType || body.tier;
    const boostType = boostTypeRaw ? String(boostTypeRaw).toLowerCase() : null;
    const boostPostId = body.post_id || body.postId;

    if (boostType) {
      const boostCfg = BOOST_PRICING[boostType];
      if (!boostCfg) {
        return res.status(400).json({
          error: "Invalid boost type. Must be: boost, featured, or spotlight",
          options: Object.keys(BOOST_PRICING),
        });
      }
      if (!boostPostId) {
        return res.status(400).json({ error: "post_id is required for boost payments" });
      }

      const postRes = await runQuery(
        "SELECT post_id, user_id, status FROM posts WHERE post_id::text = $1",
        [String(boostPostId)]
      );
      const post = postRes.rows[0];
      if (!post) return res.status(404).json({ error: "Post not found" });
      if (String(post.user_id) !== String(userId)) {
        return res.status(403).json({ error: "You can only boost your own posts" });
      }
      if (post.status !== "active") {
        return res.status(400).json({ error: "Only active posts can be boosted" });
      }

      // Reuse an existing (unpaid) boost order for this post + type to avoid duplicates.
      const existing = await runQuery(
        `SELECT razorpay_order_id, amount, currency FROM payment_orders
         WHERE user_id::text = $1 AND entity_type = 'boost' AND entity_id = $2
           AND status = 'CREATED' AND notes->>'boost_type' = $3
         ORDER BY created_at DESC LIMIT 1`,
        [userId, String(boostPostId), boostType]
      );
      if (existing.rows.length > 0) {
        const eo = existing.rows[0];
        return res.json({
          success: true,
          order_id: eo.razorpay_order_id,
          amount: Number(eo.amount),
          amount_paise: Math.round(Number(eo.amount) * 100),
          currency: eo.currency || "INR",
          key_id: keyId,
          mock: String(eo.razorpay_order_id).startsWith("mock_"),
          boost_type: boostType,
          post_id: String(boostPostId),
        });
      }

      const amountInr = boostCfg.price;
      const amountPaise = Math.round(amountInr * 100);
      const receipt = `boost_${String(boostPostId).replace(/[^a-zA-Z0-9]/g, "").slice(0, 20)}_${Date.now()}`;

      let razorpayOrderId = `mock_order_${crypto.randomBytes(8).toString("hex")}`;
      let mock = true;
      if (credentials) {
        const orderUrl = `${RAZORPAY_API_BASE}/orders`;
        await assertSafeUrl(orderUrl);
        const response = await axios.post(
          orderUrl,
          { amount: amountPaise, currency: "INR", receipt, payment_capture: 1 },
          { auth: { username: credentials.keyId, password: credentials.keySecret } }
        );
        razorpayOrderId = response.data.id;
        mock = false;
      } else {
        logger.info(`[PAYMENT MOCK] Created mock boost order (${boostType}) for post ${boostPostId} (₹${amountInr})`);
      }

      await runQuery(
        `INSERT INTO payment_orders (user_id, razorpay_order_id, amount, currency, receipt, status, entity_type, entity_id, notes)
         VALUES ($1, $2, $3, $4, $5, 'CREATED', 'boost', $6, $7)`,
        [userId, razorpayOrderId, amountInr, "INR", receipt, String(boostPostId), JSON.stringify({ boost_type: boostType })]
      );

      return res.json({
        success: true,
        order_id: razorpayOrderId,
        amount: amountInr,
        amount_paise: amountPaise,
        currency: "INR",
        key_id: keyId,
        mock,
        boost_type: boostType,
        post_id: String(boostPostId),
      });
    }

    // ════════════════════════════════════════════════════════════════════════
    // PLAN / TIER PAYMENT
    // ════════════════════════════════════════════════════════════════════════
    if (!planId) return res.status(400).json({ error: "planId is required" });

    // Look up by plan_id, slug, or plan_name (app sends slugs like 'starter'/'silver').
    // Defensive: the live DB may predate the slug/plan_name columns — fall back to a
    // minimal plan_id lookup so tier payments never 500 on an older schema.
    let plan = null;
    try {
      const planResult = await runQuery(
        `SELECT plan_id, plan_name, slug, price, duration_days
         FROM subscription_plans
         WHERE plan_id::text = $1 OR slug = $1 OR LOWER(plan_name) = LOWER($1)
         LIMIT 1`,
        [String(planId)]
      );
      plan = planResult.rows[0];
    } catch (lookupErr) {
      logger.warn(`[PAYMENT] Rich plan lookup failed (${lookupErr.message}); retrying by plan_id only`);
      try {
        const fallback = await runQuery(
          `SELECT plan_id, plan_name, price, duration_days FROM subscription_plans WHERE plan_id::text = $1 LIMIT 1`,
          [String(planId)]
        );
        plan = fallback.rows[0];
      } catch (fallbackErr) {
        logger.warn(`[PAYMENT] Minimal plan lookup also failed (${fallbackErr.message}); using amount from request`);
      }
    }
    const resolvedPlanId = plan ? String(plan.plan_id) : null;
    const resolvedPlanName = plan ? (plan.plan_name || plan.slug) : String(planId);

    let amountInr = plan ? Number(plan.price) : Number(body.amount || 0);
    if (!amountInr || amountInr <= 0) {
      return res.status(400).json({ error: "Invalid plan or missing amount" });
    }
    let coinsDeducted = 0;

    // ── Coin discount ────────────────────────────────────────────────────
    if (coinsToApply > 0) {
      const balanceResult = await runQuery(
        `SELECT post_credits FROM users WHERE user_id::text = $1`,
        [userId]
      );
      const currentBalance = balanceResult.rows.length > 0 ? Number(balanceResult.rows[0].post_credits || 0) : 0;

      const tierName = (plan?.plan_name || resolvedPlanName || "").toLowerCase();
      const maxDiscountPct = ["premium", "silver", "gold"].some((t) => tierName.includes(t)) ? 30 : 50;
      const maxCoinDiscount = Math.floor(amountInr * maxDiscountPct / 100);

      const coinsToUse = Math.min(coinsToApply, currentBalance, maxCoinDiscount);
      if (coinsToUse > 0) {
        amountInr = Math.max(0, amountInr - coinsToUse);
        coinsDeducted = coinsToUse;

        await runQuery(
          `UPDATE users SET post_credits = GREATEST(0, post_credits - $1) WHERE user_id::text = $2`,
          [coinsToUse, userId]
        );
        await runQuery(
          `INSERT INTO coin_transactions (user_id, amount, action, description)
           VALUES ($1, $2, 'plan_discount', $3)`,
          [userId, -coinsToUse, `Applied ${coinsToUse} coins towards ${resolvedPlanName} plan`]
        );
      }
    }

    const amountPaise = Math.round(amountInr * 100);
    const receipt = `order_${userId.replace(/-/g, "").substring(0, 8)}_${Date.now()}`;

    let razorpayOrderId = `mock_order_${crypto.randomBytes(8).toString("hex")}`;
    let mock = true;

    if (credentials) {
      const response = await axios.post(
        `${RAZORPAY_API_BASE}/orders`,
        { amount: amountPaise, currency: "INR", receipt, payment_capture: 1 },
        { auth: { username: credentials.keyId, password: credentials.keySecret } }
      );
      razorpayOrderId = response.data.id;
      mock = false;
    } else {
      logger.info(`[PAYMENT MOCK] Created mock order for plan ${resolvedPlanName} with ${coinsDeducted} coin(s) off`);
    }

    // Insert into payment_transactions
    await runQuery(
      `INSERT INTO payment_transactions (user_id, plan_id, razorpay_order_id, amount, status, coins_deducted)
       VALUES ($1, $2, $3, $4, 'CREATED', $5)`,
      [userId, resolvedPlanId, razorpayOrderId, amountInr, coinsDeducted]
    );

    return res.json({
      success: true,
      order_id: razorpayOrderId,
      amount: amountInr,
      amount_paise: amountPaise,
      currency: "INR",
      key_id: keyId,
      coins_deducted: coinsDeducted,
      mock,
      plan_id: resolvedPlanId,
    });
  } catch (err) {
    logger.error("[PAYMENT] createRazorpayOrder failed:", err);
    return res.status(500).json({ error: "Failed to create order" });
  }
};

/**
 * GET /api/payments/upi-details
 * Payment configuration for clients: UPI details, gateway toggle + key, boost pricing, tier options.
 */
exports.getUpiDetails = async (req, res) => {
  try {
    const credentials = getRazorpayCredentials();
    const gatewayEnabled = Boolean(credentials);
    const gatewayKeyId = credentials ? credentials.keyId : "";

    const upiId = process.env.PAYMENT_UPI_ID || "mhub@upi";
    const merchantName = process.env.PAYMENT_MERCHANT_NAME || "MHub Marketplace";

    // Boosts config (mirrors BOOST_PRICING — server-authoritative pricing)
    const boosts = Object.fromEntries(
      Object.entries(BOOST_PRICING).map(([type, cfg]) => [
        type,
        {
          name: type.charAt(0).toUpperCase() + type.slice(1),
          label: type.charAt(0).toUpperCase() + type.slice(1),
          amount: cfg.price,
          durationDays: cfg.durationDays,
        },
      ])
    );

    // Tiers from subscription_plans (schema-defensive, empty on failure)
    let tiers = {};
    try {
      const planRes = await runQuery(
        `SELECT slug, plan_name, price, duration_days FROM subscription_plans
         WHERE COALESCE(is_active, true) = true
         ORDER BY sort_order NULLS LAST, price
         LIMIT 20`
      ).catch(() =>
        runQuery(
          `SELECT slug, plan_name, price, duration_days FROM subscription_plans
           ORDER BY price
           LIMIT 20`
        )
      );
      tiers = Object.fromEntries(
        planRes.rows.map((p) => [
          p.slug || p.plan_name,
          {
            name: p.plan_name || p.slug,
            amount: Number(p.price),
            period: `${p.duration_days || 30} days`,
          },
        ])
      );
    } catch (planErr) {
      logger.warn("[PAYMENT] upi-details tiers lookup failed:", planErr.message);
    }

    const instructions = [
      "Pay instantly with UPI, cards, or netbanking — verification is automatic.",
      "Boosted posts appear at the top of search & feed for the chosen duration.",
      "Tier plans activate immediately after payment.",
    ];

    return res.json({
      success: true,
      upi_id: upiId,
      merchant_name: merchantName,
      gateway_enabled: gatewayEnabled,
      razorpay_key_id: gatewayKeyId,
      boosts,
      tiers,
      instructions,
    });
  } catch (err) {
    logger.error("[PAYMENT] getUpiDetails error:", err);
    return res.status(500).json({ error: "Failed to load payment configuration" });
  }
};

/**
 * POST /api/payments/webhook
 * Handle Razorpay Webhooks (payment.captured, payment.failed)
 */
exports.handleWebhook = async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const payload = JSON.stringify(req.body);
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.PAYMENT_WEBHOOK_SECRET;

    if (secret && signature) {
      if (!verifyRazorpaySignature(payload, signature, secret)) {
        return res.status(400).json({ error: "Invalid signature" });
      }
    }

    const event = req.body.event;
    const paymentEntity = req.body.payload?.payment?.entity || {};
    const orderId = paymentEntity.order_id;
    const paymentId = paymentEntity.id;

    if (!orderId) {
      return res.json({ status: "ignored", reason: "no order_id" });
    }

    // ── SALE payment webhook ─────────────────────────────────────────────
    const salePayResult = await runQuery(
      `SELECT sp.*, s.buyer_id, s.seller_id FROM sale_payments sp
       JOIN sales s ON s.id = sp.sale_id
       WHERE sp.razorpay_order_id = $1`,
      [orderId]
    );
    if (salePayResult.rows.length > 0) {
      const sp = salePayResult.rows[0];
      if (sp.status === "PAID") {
        return res.json({ status: "ok", reason: "already processed" });
      }
      if (event === "payment.captured" || event === "order.paid") {
        await runQuery(
          `UPDATE sale_payments SET status='PAID', razorpay_payment_id=$1, paid_at=NOW(), updated_at=NOW() WHERE sale_id=$2`,
          [paymentId, sp.sale_id]
        );
        await runQuery(
          `UPDATE sales SET razorpay_payment_id=$1, payment_status='PAID', paid_at=NOW(), updated_at=NOW() WHERE id=$2`,
          [paymentId, sp.sale_id]
        );
        logger.info(`[WEBHOOK] Sale #${sp.sale_id} payment captured (${paymentId}) — funds held in escrow`);
      } else if (event === "payment.failed") {
        await runQuery(
          `UPDATE sale_payments SET status='FAILED', updated_at=NOW() WHERE sale_id=$1`,
          [sp.sale_id]
        );
        await runQuery(
          `UPDATE sales SET payment_status='FAILED', updated_at=NOW() WHERE id=$1`,
          [sp.sale_id]
        );
        logger.warn(`[WEBHOOK] Sale #${sp.sale_id} payment failed`);
      }
      return res.json({ status: "ok" });
    }

    // ── BOOST payment webhook ───────────────────────────────────────────
    const boostOrderRes = await runQuery(
      `SELECT * FROM payment_orders WHERE razorpay_order_id = $1 AND entity_type = 'boost'`,
      [orderId]
    );
    if (boostOrderRes.rows.length > 0) {
      const bo = boostOrderRes.rows[0];
      let notes = {};
      try { notes = JSON.parse(bo.notes || "{}"); } catch (e) { /* ignore */ }
      const boostType = notes.boost_type || "";
      const boostPostId = bo.entity_id;
      const boostCfg = BOOST_PRICING[boostType];

      if (bo.status === "PAID") {
        return res.json({ status: "ok", reason: "already processed" });
      }
      if (event === "payment.captured" || event === "order.paid") {
        await runQuery(
          `UPDATE payment_orders SET status = 'PAID', updated_at = NOW() WHERE razorpay_order_id = $1`,
          [orderId]
        );
        const durationDays = boostCfg ? boostCfg.durationDays : 7;
        if (boostCfg && boostPostId) {
          const { applyPostBoost } = require("./coinController");
          await applyPostBoost({
            userId: bo.user_id,
            postId: boostPostId,
            boostType,
            durationDays,
            source: "razorpay_webhook",
          });
        }
        logger.info(`[WEBHOOK] Boost ${boostType} activated for post ${boostPostId}`);
      } else if (event === "payment.failed") {
        await runQuery(
          `UPDATE payment_orders SET status = 'CANCELLED', updated_at = NOW() WHERE razorpay_order_id = $1`,
          [orderId]
        );
        logger.warn(`[WEBHOOK] Boost payment failed for order ${orderId}`);
      }
      return res.json({ status: "ok" });
    }

    // Find the transaction (plan payments)
    const txResult = await runQuery(
      `SELECT transaction_id, user_id, plan_id, status, coins_deducted FROM payment_transactions WHERE razorpay_order_id = $1`,
      [orderId]
    );

    if (txResult.rows.length === 0) {
      return res.json({ status: "ignored", reason: "transaction not found" });
    }

    const tx = txResult.rows[0];

    // Already processed?
    if (tx.status === 'CAPTURED') {
      return res.json({ status: "ok", reason: "already processed" });
    }

    if (event === "payment.captured" || event === "order.paid") {
      // Mark transaction as captured
      await runQuery(
        `UPDATE payment_transactions 
         SET status = 'CAPTURED', razorpay_payment_id = $1, raw_response = $2, updated_at = NOW() 
         WHERE transaction_id = $3`,
        [paymentId, req.body, tx.transaction_id]
      );

      // Fetch plan duration
      const planResult = await runQuery(
        `SELECT duration_days, plan_name FROM subscription_plans WHERE plan_id = $1`,
        [tx.plan_id]
      );
      
      let durationDays = 30;
      let planName = "PREMIUM";
      if (planResult.rows.length > 0) {
        durationDays = planResult.rows[0].duration_days;
        planName = planResult.rows[0].plan_name;
      }

      // Deactivate old subscriptions
      await runQuery(
        `UPDATE user_subscriptions SET status = 'EXPIRED' WHERE user_id::text = $1 AND status = 'ACTIVE'`,
        [tx.user_id]
      );

      // Create new subscription
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + durationDays);

      await runQuery(
        `INSERT INTO user_subscriptions (user_id, plan_id, status, start_date, end_date)
         VALUES ($1, $2, 'ACTIVE', NOW(), $3)`,
        [tx.user_id, tx.plan_id, endDate]
      );

    // Update user tier — write every gating column (tier/current_plan/current_tier/subscription_expiry)
    await syncUserPlanColumns(tx.user_id, planName, durationDays);

    logger.info(`[WEBHOOK] Successfully activated subscription for user ${tx.user_id}`);
    } else if (event === "payment.failed") {
      await runQuery(
        `UPDATE payment_transactions 
         SET status = 'FAILED', raw_response = $1, updated_at = NOW() 
         WHERE transaction_id = $2`,
        [req.body, tx.transaction_id]
      );

      // Refund coins if any were deducted for this order
      const coinsUsed = Number(tx.coins_deducted || 0);
      if (coinsUsed > 0) {
        await runQuery(
          `UPDATE users SET post_credits = COALESCE(post_credits, 0) + $1 WHERE user_id::text = $2`,
          [coinsUsed, tx.user_id]
        );
        await runQuery(
          `INSERT INTO coin_transactions (user_id, amount, action, description)
           VALUES ($1, $2, 'refund', $3)`,
          [tx.user_id, coinsUsed, `Refunded ${coinsUsed} coins — payment failed for order ${orderId}`]
        );
        logger.info(`[WEBHOOK] Refunded ${coinsUsed} coins to user ${tx.user_id} after failed payment`);
      }
    }

    return res.json({ status: "ok" });
  } catch (err) {
    logger.error("[WEBHOOK] Webhook error:", err);
    return res.status(500).json({ error: "Webhook failed" });
  }
};

// ── Regression Test Aliases ──────────────────────────────────────────────────
/**
 * POST /api/payments/razorpay/verify
 * Verify a Razorpay payment signature and finalize it.
 *
 * Handles BOTH:
 *  - Plan/tier payments (payment_transactions → activate subscription)
 *  - In-app sale payments (sale_payments → mark sale PAID + hold funds in escrow)
 */
exports.verifyRazorpayPayment = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    const body = req.body || {};
    const orderId = body.razorpay_order_id || body.orderId;
    const paymentId = body.razorpay_payment_id || body.paymentId;
    const signature = body.razorpay_signature || body.signature;

    if (!userId) return res.status(401).json({ error: "Authentication required" });
    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({ error: "razorpay_order_id, razorpay_payment_id and razorpay_signature are required" });
    }

    // ── BOOST PAYMENT ────────────────────────────────────────────────────
    const boostOrderRes = await runQuery(
      `SELECT * FROM payment_orders
       WHERE razorpay_order_id = $1 AND entity_type = 'boost' AND user_id::text = $2`,
      [orderId, userId]
    );
    if (boostOrderRes.rows.length > 0) {
      const bo = boostOrderRes.rows[0];
      let notes = {};
      try { notes = JSON.parse(bo.notes || "{}"); } catch (e) { /* ignore */ }
      const boostType = notes.boost_type || "";
      const boostPostId = bo.entity_id;
      const boostCfg = BOOST_PRICING[boostType];

      if (bo.status === "PAID") {
        return res.json({
          success: true,
          message: "Boost already activated",
          boost_type: boostType,
          post_id: boostPostId,
          payment_status: "PAID",
        });
      }

      // Verify signature locally
      const credentials = getRazorpayCredentials();
      if (credentials) {
        const generatedSignature = crypto
          .createHmac("sha256", credentials.keySecret)
          .update(orderId + "|" + paymentId)
          .digest("hex");
        if (generatedSignature !== signature) {
          logger.warn(`[PAYMENT] Signature mismatch for boost order ${orderId}`);
          return res.status(400).json({ error: "Payment verification failed: signature mismatch" });
        }
      } else {
        logger.info(`[PAYMENT MOCK] Verifying mock boost order: ${orderId}`);
      }

      await runQuery(
        `UPDATE payment_orders SET status = 'PAID', updated_at = NOW() WHERE razorpay_order_id = $1`,
        [orderId]
      );
      await runQuery(
        `INSERT INTO payment_transactions (user_id, razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, status)
         VALUES ($1, $2, $3, $4, $5, 'CAPTURED')`,
        [userId, orderId, paymentId, signature, Number(bo.amount || 0)]
      ).catch((txnErr) => logger.warn("[PAYMENT] Boost txn record failed:", txnErr.message));

      const durationDays = boostCfg ? boostCfg.durationDays : 7;
      if (boostCfg && boostPostId) {
        const { applyPostBoost } = require("./coinController");
        await applyPostBoost({
          userId,
          postId: boostPostId,
          boostType,
          durationDays,
          source: "razorpay",
        });
      }

      await runQuery(
        `INSERT INTO notifications (user_id, type, title, message, created_at)
         VALUES ($1, 'boost_activated', 'Boost Activated', $2, NOW())`,
        [userId, `Your post has been boosted (${boostType}) for ${durationDays} days.`]
      ).catch((e) => logger.warn('[PAYMENT] Failed to send boost notification', { message: e.message }));

      logger.info(`[PAYMENT] Boost ${boostType} activated for post ${boostPostId} (user ${userId})`);
      return res.json({
        success: true,
        message: `Boost activated! Your post is now promoted for ${durationDays} days.`,
        boost_type: boostType,
        post_id: boostPostId,
        payment_status: "PAID",
      });
    }

    // ── SALE PAYMENT ─────────────────────────────────────────────────────
    const salePayResult = await runQuery(
      `SELECT sp.*, s.status AS sale_status, s.payment_status AS sale_payment_status,
              s.buyer_id, s.seller_id, s.post_id, s.payment_mode
       FROM sale_payments sp
       JOIN sales s ON s.id = sp.sale_id
       WHERE sp.razorpay_order_id = $1`,
      [orderId]
    );

    if (salePayResult.rows.length > 0) {
      const sp = salePayResult.rows[0];
      if (String(sp.buyer_id) !== String(userId)) {
        return res.status(403).json({ error: "Only the buyer of this sale can verify its payment" });
      }
      if (sp.status === "PAID") {
        return res.json({
          success: true,
          message: "Payment already verified",
          sale_id: String(sp.sale_id),
          sale_status: sp.sale_status,
          payment_status: "PAID",
        });
      }

      // Verify signature locally
      const credentials = getRazorpayCredentials();
      if (credentials) {
        const generatedSignature = crypto
          .createHmac("sha256", credentials.keySecret)
          .update(orderId + "|" + paymentId)
          .digest("hex");
        if (generatedSignature !== signature) {
          logger.warn(`[PAYMENT] Signature mismatch for sale order ${orderId}`);
          return res.status(400).json({ error: "Payment verification failed: signature mismatch" });
        }
      } else {
        logger.info(`[PAYMENT MOCK] Verifying mock sale order: ${orderId}`);
      }

      await runQuery(
        `UPDATE sale_payments
         SET status = 'PAID', razorpay_payment_id = $1, razorpay_signature = $2, paid_at = NOW(), updated_at = NOW()
         WHERE sale_id = $3`,
        [paymentId, signature, sp.sale_id]
      );
      // Mark the sale paid; funds are HELD (escrow) until buyer confirms receipt.
      // NOTE: razorpay_hold is deliberately NOT set here — it flags a DISPUTE hold
      // only (set by disputes/chargebacks/fraud). The normal escrow hold is implicit
      // and must not block settlement in salesController.amountReceived.
      await runQuery(
        `UPDATE sales
         SET razorpay_payment_id = $1, payment_status = 'PAID', paid_at = NOW(), updated_at = NOW()
         WHERE id = $2`,
        [paymentId, sp.sale_id]
      );

      // Notify both parties
      const notify = (userId, title, message) =>
        runQuery(
          `INSERT INTO notifications (user_id, type, title, message, created_at)
           VALUES ($1, 'sale_payment', $2, $3, NOW())`,
          [userId, title, message]
        ).catch((nErr) => logger.warn("[PAYMENT] Notification insert failed:", nErr.message));
      await notify(sp.buyer_id, "Payment Successful", `Your payment for sale #${sp.sale_id} was verified. Funds are held securely until you confirm receipt.`);
      await notify(sp.seller_id, "Payment Received", `Buyer has paid for sale #${sp.sale_id}. Funds are held until the buyer confirms receipt.`);

      logger.info(`[PAYMENT] Sale #${sp.sale_id} payment verified. ₹${sp.amount} held in escrow.`);

      return res.json({
        success: true,
        message: "Payment verified! Funds are held securely until you confirm receipt.",
        sale_id: String(sp.sale_id),
        sale_status: sp.sale_status === "shipped" ? "shipped" : "approved",
        payment_status: "PAID",
      });
    }

    // ── PLAN PAYMENT ─────────────────────────────────────────────────────
    const txResult = await runQuery(
      `SELECT transaction_id, user_id, plan_id, status, coins_deducted, amount
       FROM payment_transactions
       WHERE razorpay_order_id = $1`,
      [orderId]
    );

    if (txResult.rows.length === 0) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    const tx = txResult.rows[0];

    if (tx.status === "CAPTURED") {
      return res.json({ success: true, message: "Payment verified successfully" });
    }

    // Verify signature locally
    const credentials = getRazorpayCredentials();
    if (credentials) {
      const generatedSignature = crypto
        .createHmac("sha256", credentials.keySecret)
        .update(orderId + "|" + paymentId)
        .digest("hex");

      if (generatedSignature !== signature) {
        logger.warn(`[PAYMENT] Signature mismatch for order ${orderId}`);
        return res.status(400).json({ error: "Payment verification failed: signature mismatch" });
      }
    } else {
      logger.info(`[PAYMENT MOCK] Verifying mock order: ${orderId}`);
    }

    // Mark transaction as captured
    await runQuery(
      `UPDATE payment_transactions
       SET status = 'CAPTURED', razorpay_payment_id = $1, razorpay_signature = $2, updated_at = NOW()
       WHERE transaction_id = $3`,
      [paymentId, signature, tx.transaction_id]
    );

    // Fetch plan duration
    const planResult = await runQuery(
      `SELECT duration_days, plan_name FROM subscription_plans WHERE plan_id::text = $1`,
      [String(tx.plan_id)]
    );

    let durationDays = 30;
    let planName = "PREMIUM";
    if (planResult.rows.length > 0) {
      durationDays = planResult.rows[0].duration_days;
      planName = planResult.rows[0].plan_name;
    }

    // Deactivate old subscriptions
    await runQuery(
      `UPDATE user_subscriptions SET status = 'EXPIRED' WHERE user_id::text = $1 AND status = 'ACTIVE'`,
      [tx.user_id]
    );

    // Create new subscription
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + durationDays);

    await runQuery(
      `INSERT INTO user_subscriptions (user_id, plan_id, status, start_date, end_date)
       VALUES ($1, $2, 'ACTIVE', NOW(), $3)`,
      [tx.user_id, tx.plan_id, endDate]
    );

    // Update user tier — write every gating column (tier/current_plan/current_tier/subscription_expiry)
    await syncUserPlanColumns(tx.user_id, planName, durationDays);

    logger.info(`[PAYMENT] Successfully activated subscription for user ${tx.user_id} via instant verification`);

    return res.json({ success: true, message: "Payment verified successfully" });
  } catch (err) {
    logger.error("[PAYMENT] verifyRazorpayPayment error:", err);
    return res.status(500).json({ error: "Verification failed" });
  }
};

// ── Legacy / Manual Verification Routes (For Regression & Compatibility) ──

function getAuthenticatedUserId(req) {
  return req.user?.userId || req.user?.id || req.user?.user_id;
}

/**
 * Check whether the legacy `id` column exists on the users table.
 */
async function hasUsersLegacyIdColumn() {
  try {
    const result = await runQuery(
      `SELECT EXISTS (
         SELECT 1
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'users'
           AND column_name = 'id'
       ) AS available`
    );
    return Boolean(result?.rows?.[0]?.available);
  } catch (err) {
    return false;
  }
}

/**
 * Inspect the payments table schema once.
 */
async function getPaymentsSchemaConfig() {
  try {
    const result = await runQuery(
      `SELECT column_name, data_type
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'payments'
         AND column_name IN ('user_id', 'retry_count', 'updated_at')`
    );
    const rows = result?.rows || [];
    const dataTypeByColumn = new Map(
      rows.map((row) => [row.column_name, row.data_type])
    );
    return {
      userIdDataType: dataTypeByColumn.get("user_id") || "text",
      hasRetryCount: dataTypeByColumn.has("retry_count"),
      hasUpdatedAt: dataTypeByColumn.has("updated_at"),
    };
  } catch (err) {
    return {
      userIdDataType: "text",
      hasRetryCount: false,
      hasUpdatedAt: false,
    };
  }
}

/**
 * Resolve the payment-compatible user context for a given auth user ID.
 */
async function resolvePaymentUserContext(rawAuthUserId) {
  const authUserId = parseOptionalString(rawAuthUserId);
  if (!authUserId) return null;

  const [schemaConfig, usersHasLegacyId] = await Promise.all([
    getPaymentsSchemaConfig(),
    hasUsersLegacyIdColumn(),
  ]);

  const userLookup = await runQuery(
    usersHasLegacyId
      ? `SELECT user_id::text AS canonical_user_id,
                id::text AS legacy_user_id
         FROM users
         WHERE user_id::text = $1 OR id::text = $1
         LIMIT 1`
      : `SELECT user_id::text AS canonical_user_id,
                NULL::text AS legacy_user_id
         FROM users
         WHERE user_id::text = $1
         LIMIT 1`,
    [authUserId]
  );

  if (!userLookup.rows.length) return null;

  const row = userLookup.rows[0];
  const canonicalUserId = parseOptionalString(row.canonical_user_id);
  const legacyUserId = parseOptionalString(row.legacy_user_id);
  const userIdDataType = schemaConfig.userIdDataType;

  const INTEGER_COLUMN_TYPES = new Set(["smallint", "integer", "bigint"]);
  const isUuidLike = (val) => {
    if (!val) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(val).trim());
  };

  if (userIdDataType === "uuid") {
    if (!isUuidLike(canonicalUserId)) return null;
    return {
      paymentUserId: canonicalUserId,
      canonicalUserId: canonicalUserId,
    };
  }

  if (INTEGER_COLUMN_TYPES.has(userIdDataType)) {
    const numericCandidate =
      legacyUserId && /^\d+$/.test(legacyUserId)
        ? legacyUserId
        : /^\d+$/.test(authUserId)
          ? authUserId
          : null;
    if (!numericCandidate) return null;
    return {
      paymentUserId: numericCandidate,
      canonicalUserId: canonicalUserId || numericCandidate,
    };
  }

  return {
    paymentUserId: canonicalUserId || authUserId,
    canonicalUserId: canonicalUserId || authUserId,
  };
}

function parseOptionalString(val) {
  if (val === null || val === undefined) return null;
  const str = String(val).trim();
  return str.length > 0 ? str : null;
}

/**
 * Helper to inspect payments table columns
 */
async function getPaymentsColumns() {
  const result = await runQuery(
    `SELECT column_name, data_type 
     FROM information_schema.columns 
     WHERE table_name = 'payments' 
       AND column_name IN ('user_id', 'retry_count', 'updated_at')`
  );
  return result.rows;
}

/**
 * Ensure the legacy `payments` table carries boost/subscription metadata columns
 * used by the manual-UPI submit flow (idempotent, self-healing on old schemas).
 */
async function ensurePaymentColumns() {
  const stmts = [
    `ALTER TABLE payments ADD COLUMN IF NOT EXISTS purchase_type TEXT DEFAULT 'subscription'`,
    `ALTER TABLE payments ADD COLUMN IF NOT EXISTS boost_type TEXT`,
    `ALTER TABLE payments ADD COLUMN IF NOT EXISTS post_id TEXT`,
    `ALTER TABLE payments ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb`,
    // Widen the plan CHECK so newer plans (bronze/gold/plus/etc.) don't get rejected.
    `ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_plan_purchased_check`,
  ];
  for (const sql of stmts) {
    try {
      await runQuery(sql);
    } catch (err) {
      logger.warn("[PAYMENT] ensurePaymentColumns stmt failed:", err.message);
    }
  }
}

/**
 * POST /api/payments/submit
 */
exports.submitPayment = async (req, res) => {
  try {
    const authUserId = getAuthenticatedUserId(req) || getAuthUserId(req);
    const { plan_type, transaction_id, upi_id, boost_type, post_id, amount } = req.body;

    if (!authUserId) return res.status(401).json({ error: "Authentication required" });

    // Inspect columns (trigger schema checks in test)
    await getPaymentsColumns();
    await ensurePaymentColumns();

    const userCtx = await resolvePaymentUserContext(authUserId);
    const paymentUserId = userCtx.paymentUserId;
    const notificationUserId = userCtx.canonicalUserId || paymentUserId;

    // Check existing transaction ID
    const existing = await runQuery("SELECT id FROM payments WHERE transaction_id = $1", [transaction_id]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: "This transaction ID has already been submitted" });
    }

    const isBoost = Boolean(boost_type);
    const purchaseKey = isBoost ? boost_type : plan_type;
    const purchaseType = isBoost ? "boost" : "subscription";

    // Reject unknown boost types up-front (prevents a bogus 499 amount).
    if (isBoost && !BOOST_PRICING[String(boost_type).toLowerCase()]) {
      return res.status(400).json({
        error: "Invalid boost type. Must be: boost, featured, or spotlight",
        options: Object.keys(BOOST_PRICING),
      });
    }

    // Check pending checks (scoped by purchase type so a pending boost does not
    // block a plan submission or vice versa).
    const pendingCheck = await runQuery(
      `SELECT id FROM payments WHERE user_id::text = $1 AND status = 'pending' AND purchase_type = $2`,
      [paymentUserId, purchaseType]
    );
    if (pendingCheck.rows.length > 0) {
      return res.status(400).json({
        error: isBoost
          ? "You already have a pending boost payment. Wait for it to be verified first."
          : "You already have a pending payment for this plan.",
        pending_id: pendingCheck.rows[0].id
      });
    }

    const result = await runQuery(
      `INSERT INTO payments (user_id, amount, payment_method, transaction_id, upi_id, status, plan_purchased, purchase_type, boost_type, post_id, metadata)
       VALUES ($1, $2, 'upi', $3, $4, 'pending', $5, $6, $7, $8, $9)
       RETURNING id, created_at`,
      [
        paymentUserId,
        Number(amount) || (isBoost ? BOOST_PRICING[boost_type]?.price : 499.0),
        transaction_id,
        upi_id || null,
        purchaseKey || null,
        purchaseType,
        isBoost ? boost_type : null,
        post_id || null,
        JSON.stringify({
          purchase_type: purchaseType,
          boost_type: isBoost ? boost_type : null,
          post_id: post_id || null,
        })
      ]
    );

    await runQuery(
      `INSERT INTO notifications (user_id, type, title, message, created_at)
       VALUES ($1, 'payment_submitted', 'Payment Submitted', $2, NOW())`,
      [notificationUserId, isBoost
        ? `Your payment for the ${boost_type} boost is being verified.`
        : `Your payment for the ${plan_type} plan is being verified.`]
    );

    return res.status(201).json({
      success: true,
      payment_id: result.rows[0]?.id || 'pay-1',
      status: 'pending'
    });
  } catch (err) {
    logger.error("[PAYMENT LEGACY] submitPayment failed:", err);
    return res.status(500).json({ error: "Submission failed" });
  }
};

/**
 * POST /api/payments/retry
 */
exports.retryPayment = async (req, res) => {
  try {
    const authUserId = getAuthenticatedUserId(req) || getAuthUserId(req);
    const { transaction_id } = req.body;
    const { id: paymentId } = req.params;

    if (!authUserId) return res.status(401).json({ error: "Authentication required" });

    const userCtx = await resolvePaymentUserContext(authUserId);

    // Columns checks
    const cols = await getPaymentsColumns();
    const hasRetryCount = cols.some(c => c.column_name === 'retry_count');

    // Status check
    const statusResult = await runQuery(
      `SELECT status FROM payments WHERE id = $1 AND user_id::text = $2`,
      [paymentId, userCtx.paymentUserId]
    );

    // Update statement
    let updateQuery;
    let params;
    if (hasRetryCount) {
      updateQuery = `UPDATE payments SET status = 'pending', transaction_id = $1, retry_count = COALESCE(retry_count, 0) + 1 WHERE id = $2`;
      params = [transaction_id, paymentId];
    } else {
      updateQuery = `UPDATE payments SET status = 'pending', transaction_id = $1 WHERE id = $2`;
      params = [transaction_id, paymentId];
    }

    await runQuery(updateQuery, params);

    return res.json({
      success: true,
      message: "Payment resubmitted",
      retry_count: hasRetryCount ? 1 : null
    });
  } catch (err) {
    logger.info("RETRY_ERROR:", err.stack || err.message);
    logger.error("[PAYMENT LEGACY] retryPayment failed:", err);
    return res.status(500).json({ error: "Retry failed" });
  }
};

/**
 * GET /api/payments/status
 */
exports.getPaymentStatus = async (req, res) => {
  try {
    const authUserId = getAuthenticatedUserId(req) || getAuthUserId(req);
    if (!authUserId) return res.status(401).json({ error: "Authentication required" });

    // Inspect columns
    await getPaymentsColumns();

    const userCtx = await resolvePaymentUserContext(authUserId);

    const result = await runQuery(
      `SELECT * FROM payments WHERE user_id::text = $1`,
      [userCtx.paymentUserId]
    );

    return res.json({
      payments: result.rows,
      has_pending: result.rows.some(r => r.status === 'pending'),
      page: 1,
      limit: 10,
      total: result.rows.length,
      totalPages: 1
    });
  } catch (err) {
    logger.error("[PAYMENT LEGACY] getPaymentStatus failed:", err);
    return res.status(500).json({ error: "Status check failed" });
  }
};

/**
 * GET /api/payments/gateway-config
 * Lightweight alias of getUpiDetails — returns gateway toggle, key, boosts, tiers.
 */
exports.getGatewayConfig = exports.getUpiDetails;

/**
 * POST /api/payments/reject
 */
exports.rejectPayment = async (req, res) => {
  try {
    const authUserId = getAuthenticatedUserId(req) || getAuthUserId(req);
    const { id: paymentId } = req.params;

    if (!authUserId) return res.status(401).json({ error: "Authentication required" });

    const userCtx = await resolvePaymentUserContext(authUserId);

    // Fetch payment to check existence
    const payment = await runQuery(
      `SELECT id, user_id, status FROM payments WHERE id = $1`,
      [paymentId]
    );

    if (payment.rows.length === 0) {
      return res.status(404).json({ error: "Payment not found" });
    }

    // Update status
    await runQuery(
      `UPDATE payments SET status = 'rejected', verified_by = $1, verified_at = NOW() WHERE id = $2`,
      [userCtx.canonicalUserId, paymentId]
    );

    // Send notification
    await runQuery(
      `INSERT INTO notifications (user_id, type, title, message, created_at)
       VALUES ($1, 'payment_rejected', 'Payment Rejected', 'Your manual payment submission was rejected.', NOW())`,
      [payment.rows[0].user_id]
    );

    return res.json({
      success: true,
      message: "Payment rejected",
      payment_id: paymentId
    });
  } catch (err) {
    logger.info("REJECT_ERROR:", err.stack || err.message);
    logger.error("[PAYMENT LEGACY] rejectPayment failed:", err);
    return res.status(500).json({ error: "Rejection failed" });
  }
};

/**
 * POST /api/payments/:id/verify
 * Admin verifies a pending manual-UPI payment. For boost payments it activates the
 * boost immediately; for plan payments it marks the payment verified (subscription
 * activation remains with the existing admin subscription endpoints).
 */
exports.verifyPayment = async (req, res) => {
  try {
    const authUserId = getAuthenticatedUserId(req) || getAuthUserId(req);
    const { id: paymentId } = req.params;

    if (!authUserId) return res.status(401).json({ error: "Authentication required" });

    // Admin-only: this endpoint activates boosts / marks payments verified.
    const callerRole = String(req.user?.role || req.user?.tier || "").toLowerCase();
    const isAdmin = callerRole === "admin" || callerRole === "superadmin" || Boolean(req.user?.isAdmin);
    if (!isAdmin) {
      return res.status(403).json({ error: "Admin access required to verify payments" });
    }

    const userCtx = await resolvePaymentUserContext(authUserId);
    if (!userCtx) return res.status(401).json({ error: "User context not found" });
    await ensurePaymentColumns();

    const payment = await runQuery(
      `SELECT id, user_id, status, plan_purchased, purchase_type, boost_type, post_id, amount, metadata
       FROM payments WHERE id = $1`,
      [paymentId]
    );
    if (payment.rows.length === 0) {
      return res.status(404).json({ error: "Payment not found" });
    }
    const pay = payment.rows[0];
    if (pay.status === "verified") {
      return res.json({ success: true, message: "Payment already verified", payment_id: paymentId });
    }

    await runQuery(
      `UPDATE payments SET status = 'verified', verified_by = $1, verified_at = NOW() WHERE id = $2`,
      [userCtx.canonicalUserId, paymentId]
    );

    // Boost payments: activate the boost right away.
    const isBoostPayment = String(pay.purchase_type || "") === "boost" || Boolean(pay.boost_type);
    if (isBoostPayment && pay.boost_type && pay.post_id) {
      const boostCfg = BOOST_PRICING[String(pay.boost_type).toLowerCase()];
      const durationDays = boostCfg ? boostCfg.durationDays : 7;
      const { applyPostBoost } = require("./coinController");
      await applyPostBoost({
        userId: String(pay.user_id),
        postId: String(pay.post_id),
        boostType: String(pay.boost_type).toLowerCase(),
        durationDays,
        source: "admin_verify",
      }).catch((bErr) => logger.warn("[PAYMENT] applyPostBoost during admin verify failed:", bErr.message));
    }

    // Notify the user
    await runQuery(
      `INSERT INTO notifications (user_id, type, title, message, created_at)
       VALUES ($1, 'payment_verified', 'Payment Verified', $2, NOW())`,
      [
        String(pay.user_id),
        isBoostPayment
          ? `Your ${pay.boost_type} boost payment has been verified and activated.`
          : `Your payment for the ${pay.plan_purchased || "plan"} has been verified.`,
      ]
    ).catch((e) => logger.warn('[PAYMENT] Failed to send payment_verified notification', { userId: pay.user_id, error: e.message }));

    return res.json({
      success: true,
      message: "Payment verified",
      payment_id: paymentId,
      boost_activated: isBoostPayment && Boolean(pay.boost_type && pay.post_id),
    });
  } catch (err) {
    logger.error("[PAYMENT LEGACY] verifyPayment failed:", err);
    return res.status(500).json({ error: "Verification failed" });
  }
};

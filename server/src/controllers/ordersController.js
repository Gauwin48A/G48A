const { runQuery, getAuthUserId } = require("../utils/dbHelpers");
const logger = require("../utils/logger");
const financialEngine = require("../services/financialEngine");

/**
 * GET /api/v1/orders
 * List orders for the authenticated user (as buyer or seller)
 */
exports.list = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  const role = req.query.role || "buyer"; // 'buyer' | 'seller'

  try {
    const result = await runQuery(
      `SELECT o.*, p.title as product_title, p.price as product_price
       FROM orders o
       LEFT JOIN products p ON p.product_id = o.product_id
       WHERE o.${role === "seller" ? "seller_id" : "buyer_id"}::text = $1
       ORDER BY o.created_at DESC
       LIMIT 50`,
      [userId]
    );
    res.json({ success: true, orders: result.rows });
  } catch (err) {
    logger.error("[Orders] list error:", err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
};

/**
 * POST /api/v1/orders
 * Create a new order (buyer initiates purchase)
 */
exports.create = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  const { product_id, variant_id, quantity, seller_id } = req.body;

  if (!product_id || !seller_id) {
    return res.status(400).json({ error: "product_id and seller_id are required" });
  }

  try {
    // Get product details
    const productResult = await runQuery(
      `SELECT title, price FROM products WHERE product_id::text = $1 AND status = 'PUBLISHED'`,
      [product_id]
    );
    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: "Product not found or unavailable" });
    }

    const product = productResult.rows[0];
    const qty = Math.max(1, parseInt(quantity, 10) || 1);
    const totalAmount = parseFloat(product.price) * qty;

    // Fetch seller's active subscription plan to apply commission discount
    const subResult = await runQuery(
      `SELECT sp.slug
       FROM user_subscriptions us
       JOIN subscription_plans sp ON sp.plan_id = us.plan_id
       WHERE us.user_id::text = $1 AND us.status = 'ACTIVE'
       ORDER BY us.end_date DESC LIMIT 1`,
      [seller_id]
    );
    const activePlan = subResult.rows[0]?.slug || "free";

    // Flat 2.5% all-inclusive platform fee for escrow-protected (in-app) purchases.
    // No plan discounts — GST is absorbed inside the 2.5% (see financialEngine).
    const commissionRate = 0.025;
    const settlement = financialEngine.calculateSettlement(totalAmount, commissionRate);
    const platformFee = settlement.platformFee;
    const gstOnFee = settlement.gstOnFee;
    const sellerPayout = settlement.sellerPayout;

    // Generate order number using PostgreSQL sequence for uniqueness
    const seqResult = await runQuery("SELECT nextval('order_number_seq') as seq");
    const seqNum = seqResult.rows[0]?.seq;
    const orderNumber = `ZRD-${new Date().getFullYear()}-${String(seqNum).padStart(6, "0")}`;

    const result = await runQuery(
      `INSERT INTO orders (order_number, buyer_id, seller_id, product_id, variant_id, quantity, unit_price, total_amount, platform_fee, gst_on_fee, seller_payout, status, payment_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'PENDING', 'PENDING')
       RETURNING *`,
      [orderNumber, userId, seller_id, product_id, variant_id || null, qty, product.price, totalAmount, platformFee, gstOnFee, sellerPayout]
    );

    // Persist immutable financial snapshot (non-blocking — won't fail the order)
    financialEngine.createFinancialSnapshot({
      entityType: "ORDER",
      entityId: result.rows[0].order_id,
      userId,
      agreedPrice: totalAmount,
      commissionRate,
      subscriptionPlan: activePlan,
    }).catch((snapErr) => logger.warn("[Orders] Snapshot creation error:", snapErr.message));

    res.status(201).json({ success: true, order: result.rows[0] });
  } catch (err) {
    logger.error("[Orders] create error:", err);
    res.status(500).json({ error: "Failed to create order" });
  }
};

/**
 * GET /api/v1/orders/:id
 * Get a single order by ID
 */
exports.getById = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  try {
    const result = await runQuery(
      `SELECT o.*, 
              p.title as product_title, p.description as product_description,
              u_buyer.username as buyer_name,
              u_seller.username as seller_name
       FROM orders o
       LEFT JOIN products p ON p.product_id = o.product_id
       LEFT JOIN users u_buyer ON u_buyer.user_id::text = o.buyer_id::text
       LEFT JOIN users u_seller ON u_seller.user_id::text = o.seller_id::text
       WHERE o.order_id::text = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    const order = result.rows[0];
    if (String(order.buyer_id) !== userId && String(order.seller_id) !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json({ success: true, order });
  } catch (err) {
    logger.error("[Orders] getById error:", err);
    res.status(500).json({ error: "Failed to fetch order" });
  }
};

/**
 * PATCH /api/v1/orders/:id/status
 * Update order status (buyer/seller)
 */
exports.updateStatus = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  const { status } = req.body;
  const validStatuses = ["CONFIRMED", "PAID", "SHIPPED", "DELIVERED", "CANCELLED", "DISPUTED", "COMPLETED"];

  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Valid: ${validStatuses.join(", ")}` });
  }

  try {
    const result = await runQuery(
      `UPDATE orders SET status = $1, updated_at = NOW()
       WHERE order_id::text = $2
       RETURNING *`,
      [status, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Log status change
    await runQuery(
      `INSERT INTO order_status_history (order_id, old_status, new_status, changed_by)
       VALUES ($1, $2, $3, $4)`,
      [result.rows[0].order_id, result.rows[0].status, status, userId]
    );

    res.json({ success: true, order: result.rows[0] });
  } catch (err) {
    logger.error("[Orders] updateStatus error:", err);
    res.status(500).json({ error: "Failed to update order status" });
  }
};

/**
 * POST /api/v1/orders/:id/cancel
 * Cancel an order
 */
exports.cancel = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  try {
    const orderResult = await runQuery(
      `SELECT * FROM orders WHERE order_id::text = $1`,
      [req.params.id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    const order = orderResult.rows[0];
    if (String(order.buyer_id) !== userId) {
      return res.status(403).json({ error: "Only the buyer can cancel an order" });
    }

    if (!["PENDING", "CONFIRMED", "PAID"].includes(order.status)) {
      return res.status(400).json({ error: `Cannot cancel order in status: ${order.status}` });
    }

    const result = await runQuery(
      `UPDATE orders SET status = 'CANCELLED', updated_at = NOW()
       WHERE order_id::text = $1
       RETURNING *`,
      [req.params.id]
    );

    res.json({ success: true, order: result.rows[0] });
  } catch (err) {
    logger.error("[Orders] cancel error:", err);
    res.status(500).json({ error: "Failed to cancel order" });
  }
};

const { runQuery, getAuthUserId } = require("../utils/dbHelpers");
const logger = require("../utils/logger");
const financialEngine = require("../services/financialEngine");
const crypto = require("crypto");

/**
 * Helper to ensure orders and order_items have all required columns
 */
async function ensureOrdersSchema() {
  try {
    await runQuery(`
      CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1001;
      ALTER TABLE orders ALTER COLUMN product_id DROP NOT NULL;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number VARCHAR(50) UNIQUE;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS post_id INTEGER;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS seller_id INTEGER;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS platform_fee DECIMAL(12,2) DEFAULT 0;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS gst_on_fee DECIMAL(12,2) DEFAULT 0;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS seller_payout DECIMAL(12,2) DEFAULT 0;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS escrow_status VARCHAR(20) DEFAULT 'NONE';
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'UPI';
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS handover_otp VARCHAR(6);
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_confirmed_at TIMESTAMP;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_name VARCHAR(150);
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_phone VARCHAR(20);
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_line1 TEXT;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_city VARCHAR(100);
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_state VARCHAR(100);
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_pincode VARCHAR(10);
    `);
  } catch (_) {}
}

/**
 * GET /api/v1/orders
 * List orders for the authenticated user (as buyer or seller)
 */
exports.list = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  const rawRole = String(req.query.role || "buyer").toLowerCase();
  const role = rawRole === "seller" ? "seller" : "buyer";

  try {
    const result = await runQuery(
      `SELECT o.*, 
              COALESCE(p.title, posts.title) as product_title, 
              COALESCE(p.price, posts.price) as product_price,
              posts.images as post_images,
              posts.image_url as post_image_url
       FROM orders o
       LEFT JOIN products p ON p.product_id = o.product_id
       LEFT JOIN posts ON posts.post_id = o.post_id
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
 * GET /api/orders/my
 * Dedicated endpoint for buyer's orders with full tracking information
 */
exports.myOrders = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  try {
    const result = await runQuery(
      `SELECT o.*,
              COALESCE(posts.title, p.title, 'Order Item') as title,
              COALESCE(posts.price, p.price, o.total_amount) as item_price,
              COALESCE(posts.image_url, '') as image_url,
              posts.images as images,
              u_seller.name as seller_name,
              o.order_number as order_id,
              o.order_number as transaction_id
       FROM orders o
       LEFT JOIN posts ON posts.post_id = o.post_id
       LEFT JOIN products p ON p.product_id = o.product_id
       LEFT JOIN users u_seller ON u_seller.user_id::text = o.seller_id::text
       WHERE o.buyer_id::text = $1
       ORDER BY o.created_at DESC
       LIMIT 50`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    logger.error("[Orders] myOrders error:", err);
    res.status(500).json({ error: "Failed to fetch buyer orders" });
  }
};

/**
 * POST /api/v1/orders and POST /api/orders/create
 * Create a new order (buyer initiates purchase) with concurrency locking
 */
exports.create = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  await ensureOrdersSchema();

  const {
    product_id,
    postId,
    post_id,
    variant_id,
    quantity,
    seller_id: explicitSellerId,
    addressId,
    shipping_name,
    shipping_phone,
    shipping_line1,
    shipping_city,
    shipping_state,
    shipping_pincode,
    paymentMethod,
    amount,
  } = req.body;

  const resolvedPostId = postId || post_id;
  const resolvedProductId = product_id;

  if (!resolvedPostId && !resolvedProductId) {
    return res.status(400).json({ error: "postId or product_id is required" });
  }

  try {
    let resolvedSellerId = explicitSellerId;
    let unitPrice = 0;
    let title = "Item";

    if (resolvedPostId) {
      // Row-level lock on the post to prevent double-selling
      const postResult = await runQuery(
        `SELECT post_id, user_id, title, price, status
         FROM posts
         WHERE post_id::text = $1
         FOR UPDATE`,
        [resolvedPostId]
      );

      if (postResult.rows.length === 0) {
        return res.status(404).json({ error: "Listing not found" });
      }

      const post = postResult.rows[0];

      if (String(post.user_id) === String(userId)) {
        return res.status(400).json({ error: "Cannot purchase your own listing" });
      }

      const currentStatus = String(post.status || "").toLowerCase();
      if (currentStatus !== "active") {
        return res.status(409).json({ error: "This listing is no longer available or is already reserved" });
      }

      resolvedSellerId = post.user_id;
      unitPrice = parseFloat(post.price) || parseFloat(amount) || 0;
      title = post.title;

      // Reserve the post so other buyers cannot checkout simultaneously
      await runQuery(
        `UPDATE posts SET status = 'sale_pending', updated_at = NOW() WHERE post_id::text = $1`,
        [resolvedPostId]
      );
    } else {
      // Fallback for product catalog items
      const productResult = await runQuery(
        `SELECT product_id, seller_id, title, price, status
         FROM products
         WHERE product_id::text = $1 AND status = 'PUBLISHED'`,
        [resolvedProductId]
      );

      if (productResult.rows.length === 0) {
        return res.status(404).json({ error: "Product not found or unavailable" });
      }

      const product = productResult.rows[0];
      resolvedSellerId = product.seller_id || explicitSellerId;
      unitPrice = parseFloat(product.price) || 0;
      title = product.title;
    }

    const qty = Math.max(1, parseInt(quantity, 10) || 1);
    const totalAmount = parseFloat(amount) || (unitPrice * qty);

    // Flat 2.5% all-inclusive platform fee for escrow purchases
    const commissionRate = 0.025;
    const settlement = financialEngine.calculateSettlement(totalAmount, commissionRate);
    const platformFee = settlement.platformFee;
    const gstOnFee = settlement.gstOnFee;
    const sellerPayout = settlement.sellerPayout;

    // Generate human-readable order number
    let orderNumber;
    try {
      const seqResult = await runQuery("SELECT nextval('order_number_seq') as seq");
      const seqNum = seqResult.rows[0]?.seq || Math.floor(100000 + Math.random() * 900000);
      orderNumber = `ZRD-${new Date().getFullYear()}-${String(seqNum).padStart(6, "0")}`;
    } catch (_) {
      orderNumber = `ZRD-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    }

    // Secure 6-digit handover OTP
    const handoverOtp = crypto.randomInt(100000, 999999).toString();

    // Insert order with escrow status HELD
    const result = await runQuery(
      `INSERT INTO orders (
         order_number, buyer_id, seller_id, post_id, product_id, variant_id,
         quantity, unit_price, total_amount, platform_fee, gst_on_fee, seller_payout,
         status, payment_status, payment_method, escrow_status, handover_otp,
         shipping_name, shipping_phone, shipping_line1, shipping_city, shipping_state, shipping_pincode
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'PENDING', 'PENDING', $13, 'HELD', $14, $15, $16, $17, $18, $19, $20)
       RETURNING *`,
      [
        orderNumber,
        userId,
        resolvedSellerId,
        resolvedPostId || null,
        resolvedProductId || null,
        variant_id || null,
        qty,
        unitPrice,
        totalAmount,
        platformFee,
        gstOnFee,
        sellerPayout,
        paymentMethod || "UPI",
        handoverOtp,
        shipping_name || null,
        shipping_phone || null,
        shipping_line1 || addressId || null,
        shipping_city || null,
        shipping_state || null,
        shipping_pincode || null,
      ]
    );

    const createdOrder = result.rows[0];

    // Also populate order_items for relational queries
    try {
      await runQuery(
        `INSERT INTO order_items (order_id, post_id, seller_id, quantity, unit_price)
         VALUES ($1, $2, $3, $4, $5)`,
        [createdOrder.order_id, resolvedPostId || null, resolvedSellerId, qty, unitPrice]
      );
    } catch (_) {}

    // Persist immutable financial snapshot
    financialEngine.createFinancialSnapshot({
      entityType: "ORDER",
      entityId: createdOrder.order_id,
      userId,
      agreedPrice: totalAmount,
      commissionRate,
    }).catch((snapErr) => logger.warn("[Orders] Snapshot creation error:", snapErr.message));

    res.status(201).json({
      success: true,
      orderId: String(createdOrder.order_id),
      orderNumber: createdOrder.order_number,
      transactionId: createdOrder.order_number,
      handoverOtp: createdOrder.handover_otp,
      message: "Order placed successfully",
      order: createdOrder,
    });
  } catch (err) {
    logger.error("[Orders] create error:", err);
    res.status(500).json({ error: "Failed to create order" });
  }
};

/**
 * GET /api/v1/orders/:id
 * Get a single order by ID with party verification
 */
exports.getById = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  try {
    const result = await runQuery(
      `SELECT o.*, 
              COALESCE(posts.title, p.title) as product_title,
              COALESCE(posts.description, p.description) as product_description,
              u_buyer.name as buyer_name,
              u_seller.name as seller_name
       FROM orders o
       LEFT JOIN posts ON posts.post_id = o.post_id
       LEFT JOIN products p ON p.product_id = o.product_id
       LEFT JOIN users u_buyer ON u_buyer.user_id::text = o.buyer_id::text
       LEFT JOIN users u_seller ON u_seller.user_id::text = o.seller_id::text
       WHERE o.order_id::text = $1 OR o.order_number = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    const order = result.rows[0];
    if (String(order.buyer_id) !== String(userId) && String(order.seller_id) !== String(userId)) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json({ success: true, order });
  } catch (err) {
    logger.error("[Orders] getById error:", err);
    res.status(500).json({ error: "Failed to fetch order" });
  }
};

/**
 * POST /api/orders/:id/confirm-handover
 * Buyer or Courier confirms physical delivery using the 6-digit Handover OTP,
 * releasing escrow funds to the seller.
 */
exports.confirmHandover = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  const { otp } = req.body;
  if (!otp || String(otp).trim().length !== 6) {
    return res.status(400).json({ error: "Valid 6-digit handover OTP is required" });
  }

  try {
    const orderResult = await runQuery(
      `SELECT * FROM orders WHERE order_id::text = $1 OR order_number = $1`,
      [req.params.id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    const order = orderResult.rows[0];

    // Only buyer or seller can trigger handover confirmation
    if (String(order.buyer_id) !== String(userId) && String(order.seller_id) !== String(userId)) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (String(order.handover_otp).trim() !== String(otp).trim()) {
      return res.status(400).json({ error: "Incorrect Handover OTP. Please verify with buyer." });
    }

    // Release escrow and mark completed
    const updated = await runQuery(
      `UPDATE orders SET
         status = 'COMPLETED',
         escrow_status = 'RELEASED',
         delivery_confirmed_at = NOW(),
         updated_at = NOW()
       WHERE order_id = $1
       RETURNING *`,
      [order.order_id]
    );

    // Mark post permanently as 'sold'
    if (order.post_id) {
      await runQuery(
        `UPDATE posts SET status = 'sold', updated_at = NOW() WHERE post_id::text = $1`,
        [order.post_id]
      );
    }

    res.json({
      success: true,
      message: "Delivery verified! Escrow funds released to seller payout account.",
      order: updated.rows[0],
    });
  } catch (err) {
    logger.error("[Orders] confirmHandover error:", err);
    res.status(500).json({ error: "Failed to confirm delivery handover" });
  }
};

/**
 * PATCH /api/v1/orders/:id/status
 * Update order status
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
       WHERE order_id::text = $2 OR order_number = $2
       RETURNING *`,
      [status, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json({ success: true, order: result.rows[0] });
  } catch (err) {
    logger.error("[Orders] updateStatus error:", err);
    res.status(500).json({ error: "Failed to update order status" });
  }
};

/**
 * POST /api/v1/orders/:id/cancel
 * Cancel an order and release any reserved post back to 'active'
 */
exports.cancel = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  try {
    const orderResult = await runQuery(
      `SELECT * FROM orders WHERE order_id::text = $1 OR order_number = $1`,
      [req.params.id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    const order = orderResult.rows[0];
    if (String(order.buyer_id) !== String(userId)) {
      return res.status(403).json({ error: "Only the buyer can cancel an order" });
    }

    if (!["PENDING", "CONFIRMED", "PAID"].includes(order.status)) {
      return res.status(400).json({ error: `Cannot cancel order in status: ${order.status}` });
    }

    const result = await runQuery(
      `UPDATE orders SET status = 'CANCELLED', escrow_status = 'REFUNDED', updated_at = NOW()
       WHERE order_id = $1
       RETURNING *`,
      [order.order_id]
    );

    // Release post lock back to active
    if (order.post_id) {
      await runQuery(
        `UPDATE posts SET status = 'active', updated_at = NOW() WHERE post_id::text = $1`,
        [order.post_id]
      );
    }

    res.json({ success: true, order: result.rows[0] });
  } catch (err) {
    logger.error("[Orders] cancel error:", err);
    res.status(500).json({ error: "Failed to cancel order" });
  }
};

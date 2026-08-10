const { runQuery, getAuthUserId } = require("../utils/dbHelpers");
const logger = require("../utils/logger");

exports.list = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  try {
    const result = await runQuery(
      `SELECT s.*, o.order_number
       FROM shipments s
       JOIN orders o ON o.order_id = s.order_id
       WHERE s.seller_id::text = $1 OR s.buyer_id::text = $1
       ORDER BY s.created_at DESC LIMIT 50`,
      [userId]
    );
    res.json({ success: true, shipments: result.rows });
  } catch (err) {
    logger.error("[Shipments] list error:", err);
    res.status(500).json({ error: "Failed to fetch shipments" });
  }
};

exports.create = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  const { order_id, carrier, tracking_number, lr_number } = req.body;
  if (!order_id) return res.status(400).json({ error: "order_id is required" });

  try {
    // Verify the authenticated user is the seller of this order
    const orderCheck = await runQuery(
      `SELECT buyer_id, seller_id FROM orders WHERE order_id::text = $1`,
      [order_id]
    );
    if (orderCheck.rows.length === 0) return res.status(404).json({ error: "Order not found" });
    if (String(orderCheck.rows[0].seller_id) !== userId) {
      return res.status(403).json({ error: "Only the seller can create shipments for this order" });
    }

    const result = await runQuery(
      `INSERT INTO shipments (order_id, seller_id, buyer_id, carrier, tracking_number, lr_number, status)
       SELECT $1, $2, o.buyer_id, $3, $4, $5, 'SHIPPED'
       FROM orders o WHERE o.order_id::text = $1 RETURNING *`,
      [order_id, userId, carrier || null, tracking_number || null, lr_number || null]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: "Order not found" });

    await runQuery(`UPDATE orders SET status = 'SHIPPED', updated_at = NOW() WHERE order_id::text = $1`, [order_id]);
    res.status(201).json({ success: true, shipment: result.rows[0] });
  } catch (err) {
    logger.error("[Shipments] create error:", err);
    res.status(500).json({ error: "Failed to create shipment" });
  }
};

exports.getById = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  try {
    const result = await runQuery(
      `SELECT s.*, o.order_number FROM shipments s
       JOIN orders o ON o.order_id = s.order_id
       WHERE s.shipment_id::text = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Shipment not found" });
    res.json({ success: true, shipment: result.rows[0] });
  } catch (err) {
    logger.error("[Shipments] getById error:", err);
    res.status(500).json({ error: "Failed to fetch shipment" });
  }
};

exports.updateStatus = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  const { status, location, description } = req.body;
  const validStatuses = ["SHIPPED", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED", "FAILED", "RETURNED"];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Valid: ${validStatuses.join(", ")}` });
  }

  try {
    const result = await runQuery(
      `UPDATE shipments SET status = $1, updated_at = NOW() WHERE shipment_id::text = $2 RETURNING *`,
      [status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Shipment not found" });

    await runQuery(
      `INSERT INTO shipment_events (shipment_id, status, location, description) VALUES ($1, $2, $3, $4)`,
      [req.params.id, status, location || null, description || null]
    );

    if (status === "DELIVERED") {
      await runQuery(`UPDATE shipments SET delivered_at = NOW() WHERE shipment_id::text = $1`, [req.params.id]);
    }

    res.json({ success: true, shipment: result.rows[0] });
  } catch (err) {
    logger.error("[Shipments] updateStatus error:", err);
    res.status(500).json({ error: "Failed to update shipment status" });
  }
};

exports.confirmDelivery = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  const { notes } = req.body;

  try {
    const shipment = await runQuery(
      `SELECT * FROM shipments WHERE shipment_id::text = $1 AND buyer_id::text = $2`,
      [req.params.id, userId]
    );
    if (shipment.rows.length === 0) return res.status(404).json({ error: "Shipment not found or access denied" });

    await runQuery(
      `UPDATE shipments SET status = 'DELIVERED', delivered_at = NOW(), updated_at = NOW() WHERE shipment_id::text = $1`,
      [req.params.id]
    );
    await runQuery(
      `UPDATE orders SET status = 'DELIVERED', updated_at = NOW() WHERE order_id = $1`,
      [shipment.rows[0].order_id]
    );
    await runQuery(
      `INSERT INTO delivery_confirmations (order_id, shipment_id, confirmed_by, notes) VALUES ($1, $2, $3, $4)`,
      [shipment.rows[0].order_id, req.params.id, userId, notes || null]
    );

    res.json({ success: true, message: "Delivery confirmed" });
  } catch (err) {
    logger.error("[Shipments] confirmDelivery error:", err);
    res.status(500).json({ error: "Failed to confirm delivery" });
  }
};

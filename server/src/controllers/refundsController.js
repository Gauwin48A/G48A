const { runQuery, getAuthUserId } = require("../utils/dbHelpers");
const logger = require("../utils/logger");

exports.list = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  try {
    const result = await runQuery(
      `SELECT r.*, pt.razorpay_payment_id
       FROM payment_refunds r
       JOIN payment_transactions pt ON pt.transaction_id = r.transaction_id
       WHERE r.user_id::text = $1
       ORDER BY r.created_at DESC LIMIT 50`,
      [userId]
    );
    res.json({ success: true, refunds: result.rows });
  } catch (err) {
    logger.error("[Refunds] list error:", err);
    res.status(500).json({ error: "Failed to fetch refunds" });
  }
};

exports.create = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  const { transaction_id, amount, reason } = req.body;
  if (!transaction_id || !amount) {
    return res.status(400).json({ error: "transaction_id and amount are required" });
  }

  try {
    const result = await runQuery(
      `INSERT INTO payment_refunds (transaction_id, user_id, amount, reason, status)
       VALUES ($1, $2, $3, $4, 'PENDING') RETURNING *`,
      [transaction_id, userId, amount, reason || null]
    );
    res.status(201).json({ success: true, refund: result.rows[0] });
  } catch (err) {
    logger.error("[Refunds] create error:", err);
    res.status(500).json({ error: "Failed to create refund" });
  }
};

exports.getById = async (req, res) => {
  try {
    const result = await runQuery(`SELECT * FROM payment_refunds WHERE refund_id::text = $1`, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Refund not found" });
    res.json({ success: true, refund: result.rows[0] });
  } catch (err) {
    logger.error("[Refunds] getById error:", err);
    res.status(500).json({ error: "Failed to fetch refund" });
  }
};

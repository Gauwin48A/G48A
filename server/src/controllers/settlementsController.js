const { runQuery, getAuthUserId } = require("../utils/dbHelpers");
const logger = require("../utils/logger");

exports.list = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  try {
    const result = await runQuery(
      `SELECT * FROM settlement_records WHERE seller_id::text = $1
       ORDER BY period_start DESC LIMIT 12`,
      [userId]
    );
    res.json({ success: true, settlements: result.rows });
  } catch (err) {
    logger.error("[Settlements] list error:", err);
    res.status(500).json({ error: "Failed to fetch settlements" });
  }
};

exports.current = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  try {
    const result = await runQuery(
      `SELECT COUNT(*) as total_orders, COALESCE(SUM(total_amount), 0) as gross_amount,
              COALESCE(SUM(platform_fee), 0) as total_fees,
              COALESCE(SUM(total_amount - platform_fee - gst_on_fee), 0) as estimated_payout
       FROM orders
       WHERE seller_id::text = $1 AND status IN ('DELIVERED', 'COMPLETED')
         AND created_at >= DATE_TRUNC('month', NOW())`,
      [userId]
    );
    res.json({ success: true, current: result.rows[0] });
  } catch (err) {
    logger.error("[Settlements] current error:", err);
    res.status(500).json({ error: "Failed to fetch current settlement" });
  }
};

exports.getById = async (req, res) => {
  try {
    const result = await runQuery(`SELECT * FROM settlement_records WHERE settlement_id::text = $1`, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Settlement not found" });
    res.json({ success: true, settlement: result.rows[0] });
  } catch (err) {
    logger.error("[Settlements] getById error:", err);
    res.status(500).json({ error: "Failed to fetch settlement" });
  }
};

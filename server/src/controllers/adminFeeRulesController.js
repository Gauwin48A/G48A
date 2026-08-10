/**
 * adminFeeRulesController.js - Admin Management for Platform Fee Rules & Settlements
 *
 * Enables admins to:
 * 1. View, create, and update dynamic platform fee rules.
 * 2. View financial ledger payout & fee settlement history.
 */

const { runQuery } = require("../utils/dbHelpers");
const logger = require("../utils/logger");

const getAuthUserId = (req) => req.user?.id || req.user?.userId || req.user?.user_id;

/**
 * GET /api/admin/fee-rules
 * List all platform fee rules.
 */
exports.getFeeRules = async (req, res) => {
  try {
    const result = await runQuery(
      `SELECT * FROM platform_fee_rules ORDER BY created_at DESC`
    );
    return res.json({ success: true, fee_rules: result.rows });
  } catch (err) {
    logger.error("[AdminFeeRules] Error fetching fee rules:", err);
    return res.status(500).json({ error: "Failed to load fee rules" });
  }
};

/**
 * POST /api/admin/fee-rules
 * Create a new platform fee rule (e.g. category or tier specific commission).
 */
exports.createFeeRule = async (req, res) => {
  const adminId = getAuthUserId(req);
  const { rule_name, fee_percentage, category_id, is_active } = req.body;

  if (!rule_name || fee_percentage === undefined) {
    return res.status(400).json({ error: "rule_name and fee_percentage are required" });
  }

  try {
    const feeRate = parseFloat(fee_percentage);
    if (isNaN(feeRate) || feeRate < 0 || feeRate > 100) {
      return res.status(400).json({ error: "fee_percentage must be between 0 and 100" });
    }

    const result = await runQuery(
      `INSERT INTO platform_fee_rules (rule_name, fee_percentage, category_id, is_active, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [rule_name, feeRate, category_id || null, is_active !== false, adminId]
    );

    logger.info(`[AdminFeeRules] Admin ${adminId} created fee rule ${rule_name} (${feeRate}%)`);
    return res.status(201).json({ success: true, fee_rule: result.rows[0] });
  } catch (err) {
    logger.error("[AdminFeeRules] Error creating fee rule:", err);
    return res.status(500).json({ error: "Failed to create fee rule" });
  }
};

/**
 * PATCH /api/admin/fee-rules/:id
 * Toggle active status or update fee rate for a rule.
 */
exports.updateFeeRule = async (req, res) => {
  const adminId = getAuthUserId(req);
  const { id } = req.params;
  const { fee_percentage, is_active } = req.body;

  try {
    const existing = await runQuery(`SELECT * FROM platform_fee_rules WHERE id = $1`, [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Fee rule not found" });
    }

    const current = existing.rows[0];
    const newRate = fee_percentage !== undefined ? parseFloat(fee_percentage) : current.fee_percentage;
    const newActive = is_active !== undefined ? Boolean(is_active) : current.is_active;

    const result = await runQuery(
      `UPDATE platform_fee_rules
       SET fee_percentage = $1, is_active = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [newRate, newActive, id]
    );

    logger.info(`[AdminFeeRules] Admin ${adminId} updated fee rule #${id}`);
    return res.json({ success: true, fee_rule: result.rows[0] });
  } catch (err) {
    logger.error("[AdminFeeRules] Error updating fee rule:", err);
    return res.status(500).json({ error: "Failed to update fee rule" });
  }
};

/**
 * GET /api/admin/settlements/ledger
 * Inspect global financial ledger settlements.
 */
exports.getSettlementLedger = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const offset = (page - 1) * limit;

    const result = await runQuery(
      `SELECT fl.*, u.name AS user_name, u.email AS user_email
       FROM financial_ledger fl
       LEFT JOIN users u ON fl.user_id::text = u.user_id::text
       ORDER BY fl.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countRes = await runQuery(`SELECT COUNT(*)::int AS total FROM financial_ledger`);

    return res.json({
      success: true,
      ledger: result.rows,
      pagination: {
        total: countRes.rows[0]?.total || 0,
        page,
        limit,
      },
    });
  } catch (err) {
    logger.error("[AdminFeeRules] Error fetching settlement ledger:", err);
    return res.status(500).json({ error: "Failed to load settlement ledger" });
  }
};

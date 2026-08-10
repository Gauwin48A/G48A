/**
 * financialAlertsService.js - Financial Alert Service (Phase 6, item 54)
 *
 * Raises alerts on:
 * - Duplicate payout attempts
 * - Payout failure spikes
 * - Gateway outages
 * - Reconciliation mismatches
 * - Stuck payouts / stuck escrow
 * - Large transactions
 * - Unusual refund activity
 * - Queue backlogs
 *
 * Alerts are stored in the `financial_alerts` table and surfaced to admins.
 */

const { runQuery } = require("../utils/dbHelpers");
const logger = require("../utils/logger");

/** Valid alert types (used for validation & filtering). */
const ALERT_TYPES = [
  "DUPLICATE_PAYOUT_ATTEMPT",
  "PAYOUT_FAILURE_SPIKE",
  "GATEWAY_OUTAGE",
  "RECONCILIATION_MISMATCH",
  "STUCK_TRANSACTION",
  "LARGE_TRANSACTION",
  "UNUSUAL_REFUND_ACTIVITY",
  "QUEUE_BACKLOG",
];

const VALID_SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

/**
 * Insert a financial alert row.
 *
 * @param {Object} params
 * @param {string} params.type - One of ALERT_TYPES
 * @param {string} [params.severity] - LOW | MEDIUM | HIGH | CRITICAL (default MEDIUM)
 * @param {string} [params.entityType] - e.g. 'PAYOUT', 'ORDER', 'SALE', 'REFUND'
 * @param {string|number} [params.entityId]
 * @param {string} [params.userId]
 * @param {string} params.message
 * @param {Object} [params.metadata]
 * @returns {Promise<{success: boolean, alertId?: number}>}
 */
const raiseFinancialAlert = async ({
  type,
  severity = "MEDIUM",
  entityType = null,
  entityId = null,
  userId = null,
  message,
  metadata = {},
}) => {
  if (!message) {
    logger.warn("[FinancialAlerts] Alert not raised — message is required");
    return { success: false, error: "message is required" };
  }

  const normalizedType = String(type).toUpperCase();
  const normalizedSeverity = String(severity).toUpperCase();

  if (!ALERT_TYPES.includes(normalizedType)) {
    logger.warn(`[FinancialAlerts] Unknown alert type '${type}' — storing as-is`);
  }
  if (!VALID_SEVERITIES.includes(normalizedSeverity)) {
    logger.warn(`[FinancialAlerts] Unknown severity '${severity}' — storing as MEDIUM`);
  }

  try {
    const result = await runQuery(
      `INSERT INTO financial_alerts
         (alert_type, severity, entity_type, entity_id, user_id, message, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
       RETURNING id`,
      [
        normalizedType,
        VALID_SEVERITIES.includes(normalizedSeverity) ? normalizedSeverity : "MEDIUM",
        entityType || null,
        entityId != null ? String(entityId) : null,
        userId != null ? String(userId) : null,
        message,
        JSON.stringify(metadata || {}),
      ]
    );

    logger.warn(
      `[FinancialAlerts] Raised ${normalizedType} (${normalizedSeverity}): ${message}`
    );
    return { success: true, alertId: result.rows?.[0]?.id };
  } catch (err) {
    logger.error("[FinancialAlerts] Failed to raise alert:", err.message);
    return { success: false, error: err.message };
  }
};

/**
 * Raise a DUPLICATE_PAYOUT_ATTEMPT alert.
 * Call this before (re)dispatching a payout when a prior record already exists.
 */
const raiseDuplicatePayoutAlert = ({ referenceId, payoutId, sellerId, amount }) =>
  raiseFinancialAlert({
    type: "DUPLICATE_PAYOUT_ATTEMPT",
    severity: "HIGH",
    entityType: "PAYOUT",
    entityId: payoutId || referenceId,
    userId: sellerId,
    message: `Duplicate payout attempt blocked for ${referenceId} (₹${amount}). A payout record already exists.`,
    metadata: { reference_id: referenceId, amount },
  });

/**
 * Raise a PAYOUT_FAILURE_SPIKE alert when failures in the window exceed the threshold.
 * Queries the payout_records table for recent failures.
 */
const raisePayoutFailureSpikeAlert = async ({
  windowHours = 1,
  threshold = 3,
  lastError = null,
}) => {
  try {
    const res = await runQuery(
      `SELECT COUNT(*)::int AS failed_count
       FROM payout_records
       WHERE status IN ('PAYOUT_FAILED_FINAL', 'PAYOUT_FAILED_RETRYABLE', 'PAYOUT_REVERSED')
         AND updated_at > NOW() - ($1 || ' hours')::interval`,
      [String(windowHours)]
    );
    const failedCount = res.rows?.[0]?.failed_count || 0;

    if (failedCount >= threshold) {
      return await raiseFinancialAlert({
        type: "PAYOUT_FAILURE_SPIKE",
        severity: "HIGH",
        entityType: "PAYOUT",
        message: `Payout failure spike detected: ${failedCount} failures in the last ${windowHours}h (threshold ${threshold}).`,
        metadata: { failed_count: failedCount, window_hours: windowHours, threshold, last_error: lastError },
      });
    }
    return { success: false, alertId: null, skipped: "below_threshold" };
  } catch (err) {
    logger.warn("[FinancialAlerts] Failure-spike check error:", err.message);
    return { success: false, error: err.message };
  }
};

/**
 * Raise a LARGE_TRANSACTION alert when a sale/order amount exceeds the threshold.
 */
const raiseLargeTransactionAlert = ({ entityType, entityId, userId, amount, threshold }) =>
  raiseFinancialAlert({
    type: "LARGE_TRANSACTION",
    severity: "LOW",
    entityType,
    entityId,
    userId,
    message: `Large transaction of ₹${amount} exceeds threshold ₹${threshold} (${entityType} #${entityId}).`,
    metadata: { amount, threshold },
  });

/**
 * Raise an UNUSUAL_REFUND_ACTIVITY alert when refunds in the window exceed the threshold.
 */
const raiseUnusualRefundAlert = async ({ windowHours = 24, threshold = 5 }) => {
  try {
    const res = await runQuery(
      `SELECT COUNT(*)::int AS refund_count
       FROM payment_refunds
       WHERE created_at > NOW() - ($1 || ' hours')::interval`,
      [String(windowHours)]
    );
    const refundCount = res.rows?.[0]?.refund_count || 0;

    if (refundCount >= threshold) {
      return await raiseFinancialAlert({
        type: "UNUSUAL_REFUND_ACTIVITY",
        severity: "MEDIUM",
        entityType: "REFUND",
        message: `Unusual refund activity: ${refundCount} refunds in the last ${windowHours}h (threshold ${threshold}).`,
        metadata: { refund_count: refundCount, window_hours: windowHours, threshold },
      });
    }
    return { success: false, alertId: null, skipped: "below_threshold" };
  } catch (err) {
    logger.warn("[FinancialAlerts] Refund-activity check error:", err.message);
    return { success: false, error: err.message };
  }
};

/**
 * List unresolved (or all) financial alerts for the admin dashboard.
 */
const listFinancialAlerts = async ({ unresolvedOnly = true, limit = 100 } = {}) => {
  try {
    const result = await runQuery(
      `SELECT id, alert_type, severity, entity_type, entity_id, user_id, message, metadata,
              is_resolved, resolved_by, resolved_at, created_at
       FROM financial_alerts
       ${unresolvedOnly ? "WHERE is_resolved = false" : ""}
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );
    return { success: true, alerts: result.rows };
  } catch (err) {
    logger.error("[FinancialAlerts] List error:", err.message);
    return { success: false, error: err.message, alerts: [] };
  }
};

/**
 * Mark a financial alert as resolved (admin action).
 */
const resolveFinancialAlert = async ({ alertId, resolvedBy }) => {
  try {
    const result = await runQuery(
      `UPDATE financial_alerts
       SET is_resolved = true, resolved_by = $1, resolved_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [String(resolvedBy || "system"), alertId]
    );
    if (result.rows.length === 0) {
      return { success: false, error: "Alert not found" };
    }
    return { success: true, alert: result.rows[0] };
  } catch (err) {
    logger.error("[FinancialAlerts] Resolve error:", err.message);
    return { success: false, error: err.message };
  }
};

module.exports = {
  ALERT_TYPES,
  raiseFinancialAlert,
  raiseDuplicatePayoutAlert,
  raisePayoutFailureSpikeAlert,
  raiseLargeTransactionAlert,
  raiseUnusualRefundAlert,
  listFinancialAlerts,
  resolveFinancialAlert,
};

/**
 * OTP Delivery Service
 *
 * Tracks OTP delivery lifecycle: creates delivery records, finalizes
 * send status, processes provider callbacks (Twilio, MSG91, etc.),
 * and exposes delivery metrics for monitoring dashboards.
 */

const crypto = require("crypto");
const { runQuery, parsePositiveInt } = require("../utils/dbHelpers");
const logger = require("../utils/logger");

/* ------------------------------------------------------------------ */
/*  Configuration                                                     */
/* ------------------------------------------------------------------ */

const DEFAULT_METRICS_LOOKBACK_HOURS = Number.parseInt(
  process.env.OTP_METRICS_LOOKBACK_HOURS, 10
) || 24;

const MAX_METRICS_LOOKBACK_HOURS = 24 * 30;

let schemaReadyPromise = null;

/* ------------------------------------------------------------------ */
/*  Internal helpers                                                  */
/* ------------------------------------------------------------------ */

/**
 * Normalize a value to a trimmed string or null.
 * @param {*} value
 * @returns {string|null}
 */
function normalizeString(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized.length ? normalized : null;
}

/**
 * Coerce a value to a safe JSON-serializable object.
 * @param {*} value
 * @returns {object}
 */
function toSafeJson(value) {
  if (value === undefined) return {};
  if (value === null) return {};
  if (typeof value === "object") return value;
  return { value };
}

/**
 * Mask a destination for logging (email or phone).
 * @param {string} channel - "email" or "sms"
 * @param {string} destination
 * @returns {string|null}
 */
function maskDestination(channel, destination) {
  const normalizedDestination = normalizeString(destination);
  if (!normalizedDestination) return null;

  if (channel === "email") {
    const [user = "", domain = ""] = normalizedDestination.split("@");
    const userPrefix = user.slice(0, 2);
    const maskedUser =
      user.length > 2
        ? `${userPrefix}${"*".repeat(Math.max(1, user.length - 2))}`
        : `${userPrefix}*`;
    return domain ? `${maskedUser}@${domain}` : maskedUser;
  }

  const digits = normalizedDestination.replace(/\D/g, "");
  if (digits.length <= 4) return digits;
  return `${"*".repeat(Math.max(1, digits.length - 4))}${digits.slice(-4)}`;
}

/* ------------------------------------------------------------------ */
/*  Schema bootstrapping                                              */
/* ------------------------------------------------------------------ */

/**
 * Ensure the otp_delivery_logs table and indexes exist.
 * @returns {Promise<boolean|void>}
 */
async function ensureSchema() {
  if (!schemaReadyPromise) {
    schemaReadyPromise = (async () => {
      await runQuery(`
        CREATE TABLE IF NOT EXISTS otp_delivery_logs (
          id BIGSERIAL PRIMARY KEY,
          delivery_id VARCHAR(64) UNIQUE NOT NULL,
          flow VARCHAR(32) NOT NULL,
          purpose VARCHAR(64) NOT NULL,
          channel VARCHAR(16) NOT NULL,
          destination_masked VARCHAR(160),
          provider VARCHAR(64),
          provider_message_id VARCHAR(160),
          send_status VARCHAR(24) NOT NULL DEFAULT 'queued',
          callback_status VARCHAR(64),
          callback_event VARCHAR(64),
          metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
          callback_payload JSONB,
          error_message TEXT,
          sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          callback_received_at TIMESTAMPTZ,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      await runQuery(
        "CREATE INDEX IF NOT EXISTS idx_otp_delivery_logs_sent_at ON otp_delivery_logs(sent_at DESC)"
      );
      await runQuery(
        "CREATE INDEX IF NOT EXISTS idx_otp_delivery_logs_provider_msg ON otp_delivery_logs(provider, provider_message_id)"
      );
      await runQuery(
        "CREATE INDEX IF NOT EXISTS idx_otp_delivery_logs_flow_purpose ON otp_delivery_logs(flow, purpose)"
      );
      await runQuery(
        "CREATE INDEX IF NOT EXISTS idx_otp_delivery_logs_send_status ON otp_delivery_logs(send_status)"
      );
    })().catch((err) => {
      logger.warn(
        "[OTP Delivery] Schema check failed, metrics/callback persistence disabled",
        { message: err.message }
      );
      return false;
    });
  }
  return schemaReadyPromise;
}

/* ------------------------------------------------------------------ */
/*  Public API                                                        */
/* ------------------------------------------------------------------ */

/**
 * Create a new delivery record in the otp_delivery_logs table.
 * @param {object} [options]
 * @param {string} [options.flow]
 * @param {string} [options.purpose]
 * @param {string} [options.channel]
 * @param {string} [options.destination]
 * @param {string} [options.provider]
 * @param {object} [options.metadata]
 * @param {string} [options.deliveryId]
 * @returns {Promise<{ deliveryId: string }>}
 */
async function startDeliveryRecord(options = {}) {
  const flow = normalizeString(options.flow) || "unknown";
  const purpose = normalizeString(options.purpose) || "generic";
  const channel = normalizeString(options.channel) || "sms";
  const destination = normalizeString(options.destination);
  const provider = normalizeString(options.provider) || null;
  const metadata = toSafeJson(options.metadata);
  const deliveryId =
    normalizeString(options.deliveryId) || crypto.randomBytes(16).toString("hex");

  const schemaReady = await ensureSchema();
  if (schemaReady === false) {
    return { deliveryId };
  }

  try {
    await runQuery(
      `INSERT INTO otp_delivery_logs (
         delivery_id, flow, purpose, channel, destination_masked,
         provider, metadata, send_status, sent_at, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, 'queued', NOW(), NOW())`,
      [
        deliveryId,
        flow,
        purpose,
        channel,
        maskDestination(channel, destination),
        provider,
        JSON.stringify(metadata),
      ]
    );
  } catch (err) {
    logger.warn("[OTP Delivery] Failed to create delivery record", {
      message: err.message,
      deliveryId,
    });
  }

  return { deliveryId };
}

/**
 * Finalize a delivery record with provider response details.
 * @param {object} [options]
 * @param {string} [options.deliveryId]
 * @param {string} [options.provider]
 * @param {string} [options.providerMessageId]
 * @param {string} [options.sendStatus]
 * @param {string} [options.errorMessage]
 * @param {object} [options.metadata]
 */
async function finalizeDeliveryRecord(options = {}) {
  const deliveryId = normalizeString(options.deliveryId);
  if (!deliveryId) return;

  const schemaReady = await ensureSchema();
  if (schemaReady === false) return;

  const provider = normalizeString(options.provider) || null;
  const providerMessageId = normalizeString(
    options.providerMessageId || options.messageId || options.sid
  );
  const normalizedStatus =
    normalizeString(options.sendStatus || options.status || "sent") || "sent";
  const errorMessage = normalizeString(options.errorMessage || options.error);
  const metadata = toSafeJson(options.metadata);

  try {
    await runQuery(
      `UPDATE otp_delivery_logs
       SET provider = COALESCE($1, provider),
           provider_message_id = COALESCE($2, provider_message_id),
           send_status = $3,
           error_message = COALESCE($4, error_message),
           metadata = COALESCE(metadata, '{}'::jsonb) || $5::jsonb,
           updated_at = NOW()
       WHERE delivery_id = $6`,
      [
        provider,
        providerMessageId,
        normalizedStatus,
        errorMessage,
        JSON.stringify(metadata),
        deliveryId,
      ]
    );
  } catch (err) {
    logger.warn("[OTP Delivery] Failed to finalize delivery record", {
      message: err.message,
      deliveryId,
    });
  }
}

/**
 * Record a provider callback (delivery receipt) and update send status.
 * @param {object} [options]
 * @param {string} [options.provider]
 * @param {string} [options.providerMessageId]
 * @param {string} [options.callbackStatus]
 * @param {string} [options.callbackEvent]
 * @param {string} [options.deliveryId]
 * @param {object} [options.payload]
 * @returns {Promise<{ matched: boolean, reason?: string }>}
 */
async function recordProviderCallback(options = {}) {
  const provider = normalizeString(options.provider) || "unknown";
  const providerMessageId = normalizeString(options.providerMessageId);
  const callbackStatus =
    normalizeString(options.callbackStatus || options.status) || "unknown";
  const callbackEvent = normalizeString(options.callbackEvent || options.event);
  const deliveryId = normalizeString(options.deliveryId);
  const payload = toSafeJson(options.payload);

  const schemaReady = await ensureSchema();
  if (schemaReady === false) {
    return { matched: false, reason: "schema_unavailable" };
  }

  try {
    let result;

    if (providerMessageId) {
      result = await runQuery(
        `WITH target AS (
           SELECT id
           FROM otp_delivery_logs
           WHERE provider = $1
             AND provider_message_id = $2
           ORDER BY sent_at DESC
           LIMIT 1
         )
         UPDATE otp_delivery_logs logs
         SET callback_status = $3,
             callback_event = COALESCE($4, callback_event),
             callback_payload = $5::jsonb,
             callback_received_at = NOW(),
             send_status = CASE
               WHEN LOWER($3) IN ('delivered', 'delivery_success', 'sent') THEN 'delivered'
               WHEN LOWER($3) IN ('undelivered', 'failed', 'rejected', 'bounce') THEN 'failed'
               ELSE send_status
             END,
             updated_at = NOW()
         FROM target
         WHERE logs.id = target.id
         RETURNING logs.delivery_id, logs.flow, logs.purpose`,
        [provider, providerMessageId, callbackStatus, callbackEvent, JSON.stringify(payload)]
      );
    } else if (deliveryId) {
      result = await runQuery(
        `UPDATE otp_delivery_logs
         SET callback_status = $1,
             callback_event = COALESCE($2, callback_event),
             callback_payload = $3::jsonb,
             callback_received_at = NOW(),
             send_status = CASE
               WHEN LOWER($1) IN ('delivered', 'delivery_success', 'sent') THEN 'delivered'
               WHEN LOWER($1) IN ('undelivered', 'failed', 'rejected', 'bounce') THEN 'failed'
               ELSE send_status
             END,
             updated_at = NOW()
         WHERE delivery_id = $4
         RETURNING delivery_id, flow, purpose`,
        [callbackStatus, callbackEvent, JSON.stringify(payload), deliveryId]
      );
    } else {
      return { matched: false, reason: "missing_identifier" };
    }

    if (result.rows.length === 0) {
      return { matched: false, reason: "delivery_not_found" };
    }

    return { matched: true, ...result.rows[0] };
  } catch (err) {
    logger.warn("[OTP Delivery] Failed to process callback", {
      message: err.message,
    });
    return { matched: false, reason: "db_error" };
  }
}

/**
 * Retrieve delivery metrics for monitoring dashboards.
 * @param {object} [options]
 * @param {number} [options.lookbackHours]
 * @param {string} [options.flow]
 * @param {string} [options.purpose]
 * @returns {Promise<object>}
 */
async function getDeliveryMetrics(options = {}) {
  const lookbackHours = parsePositiveInt(
    options.lookbackHours,
    DEFAULT_METRICS_LOOKBACK_HOURS,
    MAX_METRICS_LOOKBACK_HOURS
  );
  const flow = normalizeString(options.flow);
  const purpose = normalizeString(options.purpose);

  const schemaReady = await ensureSchema();
  if (schemaReady === false) {
    return { available: false, reason: "schema_unavailable" };
  }

  const whereClauses = ["sent_at >= NOW() - ($1::text || ' hours')::interval"];
  const values = [lookbackHours];

  if (flow) {
    values.push(flow);
    whereClauses.push(`flow = $${values.length}`);
  }
  if (purpose) {
    values.push(purpose);
    whereClauses.push(`purpose = $${values.length}`);
  }

  const whereSql = whereClauses.length
    ? `WHERE ${whereClauses.join(" AND ")}`
    : "";

  const [summaryResult, byProviderResult, byPurposeResult, recentCallbacksResult] =
    await Promise.all([
      runQuery(
        `SELECT
           COUNT(*)::int AS total_attempts,
           COUNT(*) FILTER (WHERE send_status = 'sent')::int AS sent_count,
           COUNT(*) FILTER (WHERE send_status = 'delivered')::int AS delivered_count,
           COUNT(*) FILTER (WHERE send_status = 'mock')::int AS mock_count,
           COUNT(*) FILTER (WHERE send_status = 'failed')::int AS failed_count,
           COUNT(*) FILTER (WHERE callback_received_at IS NOT NULL)::int AS callback_received_count
         FROM otp_delivery_logs
         ${whereSql}`,
        values
      ),
      runQuery(
        `SELECT provider, COUNT(*)::int AS attempts
         FROM otp_delivery_logs
         ${whereSql}
         GROUP BY provider
         ORDER BY attempts DESC, provider NULLS LAST`,
        values
      ),
      runQuery(
        `SELECT flow, purpose, COUNT(*)::int AS attempts
         FROM otp_delivery_logs
         ${whereSql}
         GROUP BY flow, purpose
         ORDER BY attempts DESC, flow, purpose`,
        values
      ),
      runQuery(
        `SELECT
           delivery_id, provider, provider_message_id,
           callback_status, callback_event, callback_received_at
         FROM otp_delivery_logs
         ${whereSql}
           AND callback_received_at IS NOT NULL
         ORDER BY callback_received_at DESC
         LIMIT 25`,
        values
      ),
    ]);

  const summary = summaryResult.rows[0] || {};
  const totalAttempts = Number(summary.total_attempts) || 0;
  const sentCount = Number(summary.sent_count) || 0;
  const deliveredCount = Number(summary.delivered_count) || 0;
  const failedCount = Number(summary.failed_count) || 0;
  const callbackCount = Number(summary.callback_received_count) || 0;

  return {
    available: true,
    generated_at: new Date().toISOString(),
    lookback_hours: lookbackHours,
    filters: { flow: flow || null, purpose: purpose || null },
    summary: {
      total_attempts: totalAttempts,
      sent_count: sentCount,
      delivered_count: deliveredCount,
      failed_count: failedCount,
      mock_count: Number(summary.mock_count) || 0,
      callback_received_count: callbackCount,
      delivery_rate_percent:
        totalAttempts > 0
          ? Number(((deliveredCount / totalAttempts) * 100).toFixed(2))
          : 0,
      provider_callback_coverage_percent:
        totalAttempts > 0
          ? Number(((callbackCount / totalAttempts) * 100).toFixed(2))
          : 0,
    },
    by_provider: byProviderResult.rows,
    by_flow_purpose: byPurposeResult.rows,
    recent_callbacks: recentCallbacksResult.rows,
  };
}

/* ------------------------------------------------------------------ */
/*  Exports                                                           */
/* ------------------------------------------------------------------ */

module.exports = {
  startDeliveryRecord,
  finalizeDeliveryRecord,
  recordProviderCallback,
  getDeliveryMetrics,
};

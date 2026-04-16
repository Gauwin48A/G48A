/**
 * Risk Telemetry Service
 *
 * Records risk-engine decisions to an in-memory ring buffer and
 * (optionally) a database table. Provides aggregated metrics and
 * recent-event queries with automatic fallback to memory when
 * the DB table is unavailable.
 */

const logger = require("../utils/logger");
const { runQuery } = require("../utils/dbHelpers");

/* ------------------------------------------------------------------ */
/*  Configuration                                                     */
/* ------------------------------------------------------------------ */

const MAX_EVENTS = Number.parseInt(process.env.RISK_TELEMETRY_MAX_EVENTS || "500", 10);

/* ------------------------------------------------------------------ */
/*  Module state                                                      */
/* ------------------------------------------------------------------ */

const events = [];
let persistenceEnabled = process.env.RISK_TELEMETRY_PERSIST !== "false";
let persistenceWarningLogged = false;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* ------------------------------------------------------------------ */
/*  Internal helpers                                                  */
/* ------------------------------------------------------------------ */

/**
 * Clamp a lookback value to [1, 1440] minutes.
 * @param {*} value
 * @param {number} [fallback=60]
 * @returns {number}
 */
function toLookbackMinutes(value, fallback = 60) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, 24 * 60);
}

/**
 * Extract a millisecond timestamp from an event.
 * @param {object} event
 * @returns {number}
 */
function getEventTimestampMs(event) {
  if (event && Number.isFinite(event.timestampMs)) {
    return event.timestampMs;
  }
  const parsed = Date.parse(event?.timestamp);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Normalize a UUID string for DB persistence.
 * @param {*} value
 * @returns {string|null}
 */
function normalizeUuid(value) {
  const normalized = String(value || "").trim();
  if (!normalized) return null;
  return UUID_REGEX.test(normalized) ? normalized : null;
}

/**
 * Persist a single event to the risk_decision_events table.
 * Silently disables DB persistence on missing-table errors.
 * @param {object} event
 */
async function persistEvent(event) {
  if (!persistenceEnabled) return;

  try {
    const userId = normalizeUuid(event.userId);
    await runQuery(
      `INSERT INTO risk_decision_events (
         event_timestamp, user_id, flow, enabled, score,
         recommended_action, should_challenge, should_enforce,
         shadow_mode, flag_reason, model_version, explainability_count
       ) VALUES (NOW(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        userId,
        event.flow,
        event.enabled,
        event.score,
        event.recommendedAction,
        event.shouldChallenge,
        event.shouldEnforce,
        event.shadowMode,
        event.flagReason,
        event.modelVersion,
        event.explainabilityCount,
      ]
    );
  } catch (err) {
    if (!persistenceWarningLogged) {
      logger.warn(
        `[RISK_TELEMETRY] DB persistence disabled (fallback to memory): ${err.message}`
      );
      persistenceWarningLogged = true;
    }
    if (err.code === "42P01") {
      persistenceEnabled = false;
    }
  }
}

/**
 * Aggregate metric summaries from a list of event rows.
 * @param {object[]} rows
 * @param {number} lookbackMinutes
 * @param {string} source
 * @returns {object}
 */
function aggregateMetrics(rows, lookbackMinutes, source) {
  const byAction = {};
  const byReason = {};
  let scoreSum = 0;
  let scored = 0;
  let challengeCount = 0;
  let enforceCount = 0;

  for (const row of rows) {
    const action = row.recommendedAction || row.recommended_action || "SKIP";
    byAction[action] = (byAction[action] || 0) + 1;

    const reason = row.flagReason || row.flag_reason || null;
    if (reason) {
      byReason[reason] = (byReason[reason] || 0) + 1;
    }

    const score = Number(row.score);
    if (Number.isFinite(score)) {
      scoreSum += score;
      scored += 1;
    }

    if (row.shouldChallenge || row.should_challenge) challengeCount += 1;
    if (row.shouldEnforce || row.should_enforce) enforceCount += 1;
  }

  return {
    lookbackMinutes,
    source,
    totalEvents: rows.length,
    byAction,
    byReason,
    challengeCount,
    enforceCount,
    avgScore: scored > 0 ? Number((scoreSum / scored).toFixed(2)) : null,
    generatedAt: new Date().toISOString(),
  };
}

/* ------------------------------------------------------------------ */
/*  Public API                                                        */
/* ------------------------------------------------------------------ */

/**
 * Record a risk-engine decision. Stores in memory and (optionally) DB.
 * @param {object} [payload]
 * @param {string} [payload.userId]
 * @param {string} [payload.flow]
 * @param {boolean} [payload.enabled]
 * @param {number} [payload.score]
 * @param {string} [payload.recommendedAction]
 * @param {boolean} [payload.shouldChallenge]
 * @param {boolean} [payload.shouldEnforce]
 * @param {boolean} [payload.shadowMode]
 * @param {string} [payload.flagReason]
 * @param {string} [payload.modelVersion]
 * @param {Array} [payload.explainability]
 * @returns {object} The recorded event.
 */
function recordDecision(payload = {}) {
  const timestampMs = Date.now();

  const event = {
    timestamp: new Date(timestampMs).toISOString(),
    timestampMs,
    userId: payload.userId || null,
    flow: payload.flow || "auth_login",
    enabled: Boolean(payload.enabled),
    score: Number.isFinite(Number(payload.score)) ? Number(payload.score) : null,
    recommendedAction: payload.recommendedAction || "SKIP",
    shouldChallenge: Boolean(payload.shouldChallenge),
    shouldEnforce: Boolean(payload.shouldEnforce),
    shadowMode: Boolean(payload.shadowMode),
    flagReason: payload.flagReason || null,
    modelVersion: payload.modelVersion || null,
    explainabilityCount: Array.isArray(payload.explainability)
      ? payload.explainability.length
      : 0,
  };

  events.push(event);
  if (events.length > MAX_EVENTS) {
    events.splice(0, events.length - MAX_EVENTS);
  }

  void persistEvent(event);

  logger.info(
    `[RISK_TELEMETRY] flow=${event.flow} enabled=${event.enabled} ` +
    `score=${event.score ?? "n/a"} action=${event.recommendedAction} ` +
    `challenge=${event.shouldChallenge} enforce=${event.shouldEnforce} ` +
    `reason=${event.flagReason || "n/a"}`
  );

  return event;
}

/**
 * Retrieve aggregated risk telemetry metrics.
 * @param {object} [options]
 * @param {number} [options.lookbackMinutes=60]
 * @param {string} [options.source="auto"] - "auto", "database", or "memory"
 * @returns {Promise<object>}
 */
async function getMetrics({ lookbackMinutes = 60, source = "auto" } = {}) {
  const lookback = toLookbackMinutes(lookbackMinutes, 60);

  if (source !== "memory" && persistenceEnabled) {
    try {
      const result = await runQuery(
        `SELECT score, recommended_action, should_challenge,
                should_enforce, flag_reason
         FROM risk_decision_events
         WHERE event_timestamp >= NOW() - ($1::text || ' minutes')::interval`,
        [String(lookback)]
      );
      return aggregateMetrics(result.rows, lookback, "database");
    } catch (err) {
      logger.warn(
        `[RISK_TELEMETRY] Failed reading DB metrics, falling back to memory: ${err.message}`
      );
    }
  }

  const cutoff = Date.now() - lookback * 60 * 1000;
  const filtered = [];
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const event = events[i];
    if (getEventTimestampMs(event) < cutoff) break;
    filtered.push(event);
  }

  return aggregateMetrics(filtered, lookback, "memory");
}

/**
 * Retrieve recent risk decision events.
 * @param {object} [options]
 * @param {number} [options.lookbackMinutes=60]
 * @param {number} [options.limit=1000]
 * @param {string} [options.source="auto"]
 * @returns {Promise<{ source: string, lookbackMinutes: number, events: object[] }>}
 */
async function getRecentEvents({
  lookbackMinutes = 60,
  limit = 1000,
  source = "auto",
} = {}) {
  const lookback = toLookbackMinutes(lookbackMinutes, 60);
  const normalizedLimit = Number.isFinite(Number(limit))
    ? Math.min(Math.max(Number.parseInt(limit, 10), 1), 5000)
    : 1000;

  if (source !== "memory" && persistenceEnabled) {
    try {
      const result = await runQuery(
        `SELECT
           event_timestamp, user_id, flow, enabled, score,
           recommended_action, should_challenge, should_enforce,
           shadow_mode, flag_reason, model_version, explainability_count
         FROM risk_decision_events
         WHERE event_timestamp >= NOW() - ($1::text || ' minutes')::interval
         ORDER BY event_timestamp DESC
         LIMIT $2`,
        [String(lookback), normalizedLimit]
      );
      return { source: "database", lookbackMinutes: lookback, events: result.rows };
    } catch (err) {
      logger.warn(
        `[RISK_TELEMETRY] Failed reading DB events, falling back to memory: ${err.message}`
      );
    }
  }

  const cutoff = Date.now() - lookback * 60 * 1000;
  const filtered = [];
  for (let i = events.length - 1; i >= 0 && filtered.length < normalizedLimit; i -= 1) {
    const event = events[i];
    if (getEventTimestampMs(event) < cutoff) break;
    filtered.push(event);
  }

  return { source: "memory", lookbackMinutes: lookback, events: filtered };
}

/**
 * Clear all in-memory events (useful for tests).
 */
function reset() {
  events.splice(0, events.length);
}

/**
 * Enable or disable database persistence at runtime.
 * @param {boolean} enabled
 */
function setPersistenceEnabled(enabled) {
  persistenceEnabled = Boolean(enabled);
}

/* ------------------------------------------------------------------ */
/*  Exports                                                           */
/* ------------------------------------------------------------------ */

module.exports = {
  recordDecision,
  getMetrics,
  getRecentEvents,
  reset,
  setPersistenceEnabled,
};

const pool = require("../config/db");
const logger = require("../utils/logger");

const DB_QUERY_TIMEOUT_MS =
  Number.parseInt(process.env.DB_QUERY_TIMEOUT_MS, 10) || 10000;

const runQuery = (text, values = []) =>
  pool.query({ text, values, query_timeout: DB_QUERY_TIMEOUT_MS });

const parseBooleanEnv = (rawValue, fallback) => {
  if (rawValue === undefined || rawValue === null || rawValue === "") {
    return fallback;
  }
  const normalized = String(rawValue).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
};

const parsePositiveInt = (rawValue, fallback) => {
  const parsed = Number.parseInt(rawValue, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const DEFAULT_LOCATION_EVENT_RETENTION_DAYS = 30;
const DEFAULT_FRAUD_EVENT_RETENTION_DAYS = 90;

const LOCATION_RETENTION_ENABLED = parseBooleanEnv(
  process.env.LOCATION_RETENTION_ENABLED,
  true,
);
const LOCATION_EVENT_RETENTION_DAYS = parsePositiveInt(
  process.env.LOCATION_EVENT_RETENTION_DAYS,
  DEFAULT_LOCATION_EVENT_RETENTION_DAYS,
);
const FRAUD_EVENT_RETENTION_DAYS = parsePositiveInt(
  process.env.FRAUD_EVENT_RETENTION_DAYS,
  DEFAULT_FRAUD_EVENT_RETENTION_DAYS,
);

const purgeLocationRetention = async () => {
  if (!LOCATION_RETENTION_ENABLED) {
    return { skipped: true };
  }

  try {
    const locationResult = await runQuery(
      `
        DELETE FROM user_location_events
        WHERE timestamp < NOW() - ($1::text || ' days')::interval
      `,
      [LOCATION_EVENT_RETENTION_DAYS],
    );
    const fraudResult = await runQuery(
      `
        DELETE FROM fraud_events
        WHERE timestamp < NOW() - ($1::text || ' days')::interval
      `,
      [FRAUD_EVENT_RETENTION_DAYS],
    );

    return {
      skipped: false,
      locationEventsDeleted: locationResult.rowCount || 0,
      fraudEventsDeleted: fraudResult.rowCount || 0,
    };
  } catch (error) {
    logger.warn("[LocationRetention] Purge failed", { message: error.message });
    return { skipped: false, error: error.message };
  }
};

module.exports = {
  purgeLocationRetention,
};

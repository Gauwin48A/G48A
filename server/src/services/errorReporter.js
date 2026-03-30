const logger = require("../utils/logger");

let sentryClient = null;
let initAttempted = false;

/**
 * Initialise the Sentry error reporter (no-op if SENTRY_DSN is unset
 * or if @sentry/node is not installed).
 */
function initErrorReporter() {
  if (initAttempted) return;
  initAttempted = true;

  const dsn = String(process.env.SENTRY_DSN || "").trim();
  if (!dsn) {
    logger.info("[ErrorReporter] Sentry disabled (SENTRY_DSN not set).");
    return;
  }

  try {
    const Sentry = require("@sentry/node");
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || "development",
      tracesSampleRate: Number.parseFloat(
        process.env.SENTRY_TRACES_SAMPLE_RATE || "0.1"
      ),
    });
    sentryClient = Sentry;
    logger.info("[ErrorReporter] Sentry initialized.");
  } catch (err) {
    logger.warn(
      "[ErrorReporter] SENTRY_DSN is set but @sentry/node is not installed. Falling back to logs."
    );
  }
}

/**
 * Check whether Sentry is currently active.
 * @returns {boolean}
 */
function isSentryEnabled() {
  return Boolean(sentryClient);
}

/**
 * Report a server-side exception to Sentry (or fall back to logging).
 * @param {Error} error - The caught error
 * @param {object} [context={}] - Additional context
 */
function captureException(error, context = {}) {
  if (sentryClient) {
    sentryClient.captureException(error, { extra: context });
    return;
  }
  logger.error(
    "[ErrorReporter][exception]",
    error?.message || "Unknown error",
    context
  );
}

/**
 * Report a client-side error payload to Sentry (or fall back to logging).
 * @param {object} [payload={}] - Error payload from the client
 * @param {object} [context={}] - Additional context
 */
function captureClientError(payload = {}, context = {}) {
  const message = String(payload?.message || "Client runtime error").slice(
    0,
    500
  );
  const isUxEvent = message.startsWith("[UX_EVENT]");
  const logLevel = isUxEvent ? "info" : "error";

  if (sentryClient) {
    sentryClient.captureMessage(message, {
      level: isUxEvent ? "info" : "error",
      extra: { ...context, payload },
    });
    return;
  }
  if (logLevel === "info") {
    logger.info("[ErrorReporter][client]", message, {
      ...context,
      payload,
    });
    return;
  }
  logger.error("[ErrorReporter][client]", message, {
    ...context,
    payload,
  });
}

module.exports = {
  initErrorReporter,
  isSentryEnabled,
  captureException,
  captureClientError,
};

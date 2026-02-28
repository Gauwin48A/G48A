const logger = require('../utils/logger');

let sentryClient = null;
let initAttempted = false;

function initErrorReporter() {
  if (initAttempted) return;
  initAttempted = true;

  const dsn = String(process.env.SENTRY_DSN || '').trim();
  if (!dsn) {
    logger.info('[ErrorReporter] Sentry disabled (SENTRY_DSN not set).');
    return;
  }

  try {
    // Optional dependency: if missing, we still run with log-only mode.
    const Sentry = require('@sentry/node');
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: Number.parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1')
    });
    sentryClient = Sentry;
    logger.info('[ErrorReporter] Sentry initialized.');
  } catch (err) {
    logger.warn('[ErrorReporter] SENTRY_DSN is set but @sentry/node is not installed. Falling back to logs.');
  }
}

function isSentryEnabled() {
  return Boolean(sentryClient);
}

function captureException(error, context = {}) {
  if (sentryClient) {
    sentryClient.captureException(error, { extra: context });
    return;
  }
  logger.error('[ErrorReporter][exception]', error?.message || 'Unknown error', context);
}

function captureClientError(payload = {}, context = {}) {
  const message = String(payload?.message || 'Client runtime error').slice(0, 500);
  if (sentryClient) {
    sentryClient.captureMessage(message, {
      level: 'error',
      extra: { ...context, payload }
    });
    return;
  }
  logger.error('[ErrorReporter][client]', message, { ...context, payload });
}

module.exports = {
  initErrorReporter,
  isSentryEnabled,
  captureException,
  captureClientError
};

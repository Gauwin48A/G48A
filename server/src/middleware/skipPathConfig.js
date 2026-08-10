/**
 * Shared path-skip configuration for security middlewares.
 *
 * Server-to-server webhook endpoints (Razorpay, Surepass, push notifications)
 * can never carry client-side security artifacts (CSRF tokens, integrity
 * timestamp/nonce headers). Both the CSRF middleware and the API-integrity
 * anti-replay middleware must skip them — keeping the list here prevents the
 * two from drifting apart when a new webhook route is added.
 */

/** Path prefixes that receive server-to-server webhook payloads. */
const WEBHOOK_SKIP_PATHS = Object.freeze([
  "/api/webhooks",
  "/api/v1/webhooks",
  "/api/payments/webhook",
  "/api/push-notifications/webhook",
]);

/**
 * Boundary-aware prefix match (exact path or path + "/").
 * Prevents loose prefix matching like `/api/webhooksfoo` slipping through.
 * @param {string} path - Request path (without query string)
 * @param {readonly string[]} prefixes
 * @returns {boolean}
 */
function isPathUnderPrefixes(path, prefixes) {
  if (!path) return false;
  return prefixes.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  );
}

/**
 * True when the request path falls under a known webhook route.
 * @param {string} path
 * @returns {boolean}
 */
function isWebhookPath(path) {
  return isPathUnderPrefixes(path, WEBHOOK_SKIP_PATHS);
}

module.exports = {
  WEBHOOK_SKIP_PATHS,
  isPathUnderPrefixes,
  isWebhookPath,
};

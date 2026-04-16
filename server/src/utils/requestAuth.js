const BEARER_PREFIX = "bearer ";

/**
 * Extract a bearer token from an Authorization header value.
 * @param {string|undefined|null} authHeader - The raw Authorization header.
 * @returns {string|null} The token string, or null if the header is missing/invalid.
 */
function getBearerTokenFromHeader(authHeader) {
  if (typeof authHeader !== "string") return null;
  if (authHeader.length <= BEARER_PREFIX.length) return null;
  if (!authHeader.toLowerCase().startsWith(BEARER_PREFIX)) return null;

  const token = authHeader.slice(BEARER_PREFIX.length).trim();
  return token.length ? token : null;
}

/**
 * Retrieve the access token from a request, checking both the Authorization
 * header and the `accessToken` cookie.
 * @param {object} req - Express-compatible request object.
 * @param {object} [options] - Extraction options.
 * @param {boolean} [options.preferCookie=false] - When true, prefer the cookie
 *   value over the Authorization header.
 * @returns {string|null} The resolved access token, or null if none found.
 */
function getAccessTokenFromRequest(req, options = {}) {
  const preferCookie = options.preferCookie === true;
  const cookieToken = req?.cookies?.accessToken || null;
  const headerToken = getBearerTokenFromHeader(req?.headers?.authorization);

  if (preferCookie) {
    return cookieToken || headerToken;
  }
  return headerToken || cookieToken;
}

module.exports = {
  getBearerTokenFromHeader,
  getAccessTokenFromRequest,
};

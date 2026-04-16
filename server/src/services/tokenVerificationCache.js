const jwt = require("jsonwebtoken");

const TOKEN_CACHE_TTL_MS = (() => {
  const parsed = Number.parseInt(process.env.AUTH_TOKEN_CACHE_TTL_MS, 10);
  if (Number.isFinite(parsed)) return Math.max(0, parsed);
  return process.env.NODE_ENV === "production" ? 0 : 1e3;
})();

const TOKEN_CACHE_MAX = (() => {
  const parsed = Number.parseInt(process.env.AUTH_TOKEN_CACHE_MAX, 10);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return 1e4;
})();

const TOKEN_CACHE_SWEEP_INTERVAL_MS = (() => {
  const parsed = Number.parseInt(
    process.env.AUTH_TOKEN_CACHE_SWEEP_INTERVAL_MS,
    10
  );
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return 6e4;
})();

const tokenCache = new Map();

/**
 * Remove expired entries from the in-memory token cache.
 * @param {number} [now=Date.now()] - Current timestamp in ms
 * @returns {number} Number of entries removed
 */
function sweepExpiredEntries(now = Date.now()) {
  if (tokenCache.size === 0) return 0;

  let removed = 0;
  for (const [token, entry] of tokenCache.entries()) {
    if (entry.cacheExpiresAtMs <= now || entry.jwtExpiresAtMs <= now) {
      tokenCache.delete(token);
      removed += 1;
    }
  }
  return removed;
}

// Start the periodic sweep timer when caching is enabled
if (TOKEN_CACHE_TTL_MS > 0) {
  const sweepTimer = setInterval(() => {
    sweepExpiredEntries();
  }, TOKEN_CACHE_SWEEP_INTERVAL_MS);

  if (typeof sweepTimer.unref === "function") {
    sweepTimer.unref();
  }
}

/**
 * Retrieve a previously verified token payload from cache.
 * @param {string} token - JWT string
 * @param {string} secret - Secret the token was verified with
 * @param {string} optionsKey - Cache key suffix for verify options
 * @returns {object|null} Cached payload or null
 */
function getCachedToken(token, secret, optionsKey) {
  if (!token || !secret || TOKEN_CACHE_TTL_MS <= 0) return null;

  const cacheKey = optionsKey ? `${token}|${optionsKey}` : token;
  const entry = tokenCache.get(cacheKey);
  if (!entry) return null;
  if (entry.secret !== secret) return null;

  const now = Date.now();
  if (entry.cacheExpiresAtMs <= now || entry.jwtExpiresAtMs <= now) {
    tokenCache.delete(cacheKey);
    return null;
  }

  return entry.payload;
}

/**
 * Store a verified token payload in cache.
 * @param {string} token - JWT string
 * @param {string} secret - Secret the token was verified with
 * @param {object} payload - Decoded JWT payload
 * @param {string} optionsKey - Cache key suffix for verify options
 */
function setCachedToken(token, secret, payload, optionsKey) {
  if (!token || !secret || !payload || TOKEN_CACHE_TTL_MS <= 0) return;

  const cacheKey = optionsKey ? `${token}|${optionsKey}` : token;
  const now = Date.now();

  const jwtExpiresAtMs = Number.isFinite(payload.exp)
    ? Number(payload.exp) * 1e3
    : now + TOKEN_CACHE_TTL_MS;

  const cacheExpiresAtMs = Math.min(
    now + TOKEN_CACHE_TTL_MS,
    jwtExpiresAtMs
  );

  if (cacheExpiresAtMs <= now) return;

  if (tokenCache.size >= TOKEN_CACHE_MAX) {
    const oldestKey = tokenCache.keys().next().value;
    if (oldestKey !== undefined) {
      tokenCache.delete(oldestKey);
    }
  }

  tokenCache.set(cacheKey, {
    secret,
    payload,
    jwtExpiresAtMs,
    cacheExpiresAtMs,
  });
}

/**
 * Build a stable cache-key suffix from jwt.verify options.
 * @param {object} options - Options passed to jwt.verify
 * @returns {string}
 */
function buildOptionsKey(options) {
  if (!options || typeof options !== "object") return "";
  const parts = [];
  if (options.issuer) parts.push(`i:${options.issuer}`);
  if (options.audience) parts.push(`a:${options.audience}`);
  return parts.join("|");
}

/**
 * Verify a JWT, returning a cached result when available.
 * On cache miss the token is verified with jsonwebtoken and the result is cached.
 * @param {string} token - JWT string
 * @param {string} secret - Verification secret
 * @param {object} [options] - Additional jwt.verify options (issuer, audience, etc.)
 * @returns {object} Decoded JWT payload
 * @throws {JsonWebTokenError} When the token is invalid
 */
function verifyToken(token, secret, options) {
  const optionsKey = buildOptionsKey(options);
  const cached = getCachedToken(token, secret, optionsKey);
  if (cached) return cached;

  const verifyOptions =
    options && typeof options === "object" ? { ...options } : {};
  const payload = jwt.verify(token, secret, verifyOptions);

  setCachedToken(token, secret, payload, optionsKey);
  return payload;
}

/**
 * Clear all entries from the token verification cache.
 */
function clearTokenVerificationCache() {
  tokenCache.clear();
}

module.exports = {
  verifyToken,
  clearTokenVerificationCache,
  sweepExpiredEntries,
};

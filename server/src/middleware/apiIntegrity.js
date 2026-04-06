/**
 * API Integrity Middleware
 * ────────────────────────
 * 1. Anti-replay: mandatory timestamp + nonce on write operations
 * 2. Request signature (HMAC-SHA256) verification on sensitive endpoints
 * 3. Bot/automation detection via timing analysis
 * 4. All caches are TTL-bounded with periodic cleanup
 */

const crypto = require("crypto");
const logger = require("../utils/logger");

const API_INTEGRITY_ENABLED = String(process.env.API_INTEGRITY_ENABLED || "true").toLowerCase() === "true";
const isProduction = process.env.NODE_ENV === "production";
const rawIntegritySecret = String(process.env.API_INTEGRITY_SECRET || "").trim();
const fallbackSecret = String(process.env.JWT_SECRET || "").trim();
const API_INTEGRITY_SECRET =
  rawIntegritySecret ||
  fallbackSecret ||
  (isProduction ? "" : "mhub-api-integrity-default");
const usingFallbackSecret = !rawIntegritySecret && Boolean(fallbackSecret);

if (API_INTEGRITY_ENABLED && isProduction) {
  if (!rawIntegritySecret) {
    const message =
      "[API_INTEGRITY] API_INTEGRITY_SECRET is required in production when API integrity is enabled.";
    logger.error(message);
    throw new Error(message);
  }
  if (rawIntegritySecret === "mhub-api-integrity-default") {
    const message =
      "[API_INTEGRITY] API_INTEGRITY_SECRET must not use the default value in production.";
    logger.error(message);
    throw new Error(message);
  }
}

if (API_INTEGRITY_ENABLED && !isProduction && usingFallbackSecret) {
  logger.warn("[API_INTEGRITY] API_INTEGRITY_SECRET not set; falling back to JWT_SECRET.");
}
const REQUEST_MAX_AGE_MS = parseInt(process.env.REQUEST_MAX_AGE_MS || "300000", 10); // 5 min
const CLOCK_SKEW_MS = 5000; // 5 seconds tolerance
const NONCE_TTL_MS = REQUEST_MAX_AGE_MS + 60000; // nonce lives slightly longer than max request age

// ── TTL-bounded Map utility ─────────────────────────────────
class TtlMap {
  constructor(maxSize, ttlMs, cleanupIntervalMs = 30000) {
    this._map = new Map();
    this._maxSize = maxSize;
    this._ttlMs = ttlMs;
    this._timer = setInterval(() => this._cleanup(), cleanupIntervalMs);
    if (this._timer.unref) this._timer.unref();
  }

  set(key, value) {
    // Evict oldest if at capacity
    if (this._map.size >= this._maxSize) {
      const firstKey = this._map.keys().next().value;
      this._map.delete(firstKey);
    }
    this._map.set(key, { value, expiresAt: Date.now() + this._ttlMs });
  }

  has(key) {
    const entry = this._map.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this._map.delete(key);
      return false;
    }
    return true;
  }

  get(key) {
    const entry = this._map.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this._map.delete(key);
      return undefined;
    }
    return entry.value;
  }

  get size() { return this._map.size; }

  _cleanup() {
    const now = Date.now();
    for (const [key, entry] of this._map) {
      if (now > entry.expiresAt) this._map.delete(key);
    }
  }

  destroy() {
    clearInterval(this._timer);
    this._map.clear();
  }
}

// ── Caches ──────────────────────────────────────────────────
const nonceCache = new TtlMap(10000, NONCE_TTL_MS, 30000);
const botTimingCache = new TtlMap(5000, 120000, 60000); // 2min TTL

// ── Timestamp validation ────────────────────────────────────
const validateTimestamp = (timestamp) => {
  if (!timestamp) return { valid: false, reason: "missing_timestamp" };

  const ts = parseInt(timestamp, 10);
  if (!Number.isFinite(ts)) return { valid: false, reason: "invalid_timestamp" };

  const now = Date.now();
  const age = now - ts;

  // Reject future timestamps (beyond clock skew tolerance)
  if (ts > now + CLOCK_SKEW_MS) {
    return { valid: false, reason: "future_timestamp" };
  }

  // Reject stale timestamps
  if (age > REQUEST_MAX_AGE_MS) {
    return { valid: false, reason: "expired_request", age };
  }

  return { valid: true };
};

// ── Nonce validation ────────────────────────────────────────
const validateNonce = (nonce) => {
  if (!nonce || typeof nonce !== "string" || nonce.length < 8 || nonce.length > 128) {
    return { valid: false, reason: "invalid_nonce" };
  }
  // Nonce must be alphanumeric + hyphens only (prevents injection)
  if (!/^[a-zA-Z0-9\-_]+$/.test(nonce)) {
    return { valid: false, reason: "invalid_nonce_format" };
  }

  if (nonceCache.has(nonce)) {
    return { valid: false, reason: "duplicate_nonce" };
  }

  nonceCache.set(nonce, true);
  return { valid: true };
};

// ── HMAC signature verification ─────────────────────────────
const verifyRequestSignature = (req) => {
  const signature = req.headers["x-mhub-signature"];
  const timestamp = req.headers["x-mhub-timestamp"];
  const nonce = req.headers["x-mhub-nonce"];

  if (!signature || !timestamp || !nonce) {
    return { valid: false, reason: "missing_signature_headers" };
  }

  // Validate signature length (SHA-256 hex = 64 chars)
  if (signature.length !== 64 || !/^[0-9a-f]+$/i.test(signature)) {
    return { valid: false, reason: "malformed_signature" };
  }

  const method = req.method.toUpperCase();
  const path = req.originalUrl || req.url;
  const body = req.rawBody ? req.rawBody.toString() : JSON.stringify(req.body || {});
  const message = `${method}:${path}:${timestamp}:${nonce}:${body}`;

  const expectedSignature = crypto
    .createHmac("sha256", API_INTEGRITY_SECRET)
    .update(message)
    .digest("hex");

  try {
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature.toLowerCase(), "hex"),
      Buffer.from(expectedSignature, "hex"),
    );
    return { valid: isValid, reason: isValid ? "verified" : "invalid_signature" };
  } catch {
    return { valid: false, reason: "signature_comparison_error" };
  }
};

// ── Middleware: Anti-replay + signature for write operations ──
const antiReplayProtection = (req, res, next) => {
  if (!API_INTEGRITY_ENABLED) return next();

  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return next();

  const path = req.path || "";
  if (!isProduction && path.includes("/telemetry/vitals")) {
    return next();
  }
  if (path === "/health" || path.endsWith("/health")) return next();

  // Timestamp is MANDATORY on all write operations
  const timestamp = req.headers["x-mhub-timestamp"] || req.body?._timestamp;
  if (!timestamp) {
    logger.warn(`[API_INTEGRITY] Missing timestamp on write: ${method} ${path}`);
    return res.status(403).json({
      error: "Request validation failed. Please update your app.",
      code: "MISSING_TIMESTAMP",
    });
  }

  const tsCheck = validateTimestamp(timestamp);
  if (!tsCheck.valid) {
    logger.warn(`[API_INTEGRITY] Timestamp failed: ${tsCheck.reason} (age: ${tsCheck.age || 0}ms) | ${path}`);
    return res.status(403).json({
      error: "Request expired or invalid. Please try again.",
      code: "REQUEST_EXPIRED",
    });
  }

  // Nonce is MANDATORY with timestamp (prevents replay attacks)
  const nonce = req.headers["x-mhub-nonce"] || req.body?._nonce;
  if (!nonce) {
    logger.warn(`[API_INTEGRITY] Missing nonce on write: ${method} ${path}`);
    return res.status(403).json({
      error: "Request validation failed. Please update your app.",
      code: "MISSING_NONCE",
    });
  }

  const nonceCheck = validateNonce(nonce);
  if (!nonceCheck.valid) {
    logger.warn(`[API_INTEGRITY] Nonce failed: ${nonceCheck.reason} | ${path}`);
    return res.status(403).json({
      error: "Duplicate request detected. Please try again.",
      code: "DUPLICATE_REQUEST",
    });
  }

  // HMAC signature verification (when provided)
  const signature = req.headers["x-mhub-signature"];
  if (signature) {
    const sigCheck = verifyRequestSignature(req);
    if (!sigCheck.valid) {
      logger.warn(`[API_INTEGRITY] Signature failed: ${sigCheck.reason} | ${path}`);
      return res.status(403).json({
        error: "Request integrity check failed.",
        code: "SIGNATURE_INVALID",
      });
    }
  }

  next();
};

// ── Middleware: Bot detection via timing analysis ─────────────
const MIN_REQUEST_INTERVAL_MS = parseInt(process.env.MIN_REQUEST_INTERVAL_MS || "50", 10);
const RAPID_REQUEST_THRESHOLD = parseInt(process.env.RAPID_REQUEST_THRESHOLD || "15", 10);

const botDetection = (req, res, next) => {
  if (!API_INTEGRITY_ENABLED) return next();

  const fingerprint = req.headers["x-device-fingerprint"] || req.headers["x-device-id"];
  if (!fingerprint) return next();

  const now = Date.now();
  const entry = botTimingCache.get(fingerprint);

  if (entry) {
    const interval = now - entry.lastRequest;

    if (interval < MIN_REQUEST_INTERVAL_MS) {
      entry.rapidCount = (entry.rapidCount || 0) + 1;
    } else {
      // Proportional decay: lose 1 count per second of idle time (not just 1 per request)
      const decayAmount = Math.floor(interval / 1000);
      entry.rapidCount = Math.max(0, (entry.rapidCount || 0) - decayAmount);
    }

    entry.lastRequest = now;
    entry.totalRequests = (entry.totalRequests || 0) + 1;
    botTimingCache.set(fingerprint, entry);

    if (entry.rapidCount >= RAPID_REQUEST_THRESHOLD) {
      logger.warn(`[BOT_DETECT] Device ${fingerprint.substring(0, 16)}... (${entry.rapidCount} rapid, ${entry.totalRequests} total)`);
      // Reset rapid count after blocking so user can retry after cooldown
      entry.rapidCount = Math.floor(RAPID_REQUEST_THRESHOLD / 2);
      return res.status(429).json({
        error: "Automated behavior detected. Please slow down.",
        code: "BOT_DETECTED",
        retryAfter: 30,
      });
    }
  } else {
    botTimingCache.set(fingerprint, { lastRequest: now, rapidCount: 0, totalRequests: 1 });
  }

  next();
};

// ── Middleware: Block write operations when DevTools is open ──
// NOTE: This is a soft block — client-reported, can be spoofed.
// It's a deterrent, not a security boundary.
const blockDevToolsRequests = (req, res, next) => {
  const devToolsFlag = req.headers["x-mhub-devtools"];
  if (devToolsFlag === "true" || devToolsFlag === "1") {
    const method = req.method.toUpperCase();
    if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
      logger.info(`[API_INTEGRITY] DevTools soft-block: ${method} ${req.path}`);
      return res.status(403).json({
        error: "Please close developer tools to continue.",
        code: "DEVTOOLS_DETECTED",
      });
    }
  }
  next();
};

module.exports = {
  antiReplayProtection,
  blockDevToolsRequests,
  botDetection,
  verifyRequestSignature,
  validateTimestamp,
  validateNonce,
  TtlMap,
};

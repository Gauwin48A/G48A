/**
 * Enhanced Rate Limiter
 * ─────────────────────
 * Per-user and per-IP rate limiting for all API endpoints.
 * Supplements the existing rate limiters with more granular controls.
 */

const rateLimit = require("express-rate-limit");

const shouldBypassRateLimits =
  process.env.NODE_ENV !== "production" &&
  String(process.env.RATE_LIMIT_BYPASS_DEV || "").toLowerCase() === "true";

const IS_DEV = process.env.NODE_ENV !== "production";
const DEV_WRITE_LIMIT_SKIP_PREFIXES = [
  "/api/analytics",
  "/api/auth",
  "/api/posts/batch-view",
  "/api/location",
  "/analytics",
  "/auth",
  "/location",
];

const LOCALHOST_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const ALLOW_LOCALHOST_RATE_LIMIT_BYPASS =
  String(process.env.RATE_LIMIT_BYPASS_LOCALHOST || "true").toLowerCase() ===
  "true";

const resolveHostname = (req) => {
  const rawHost =
    req.headers["x-forwarded-host"] || req.headers.host || req.hostname || "";
  const host = String(rawHost || "").split(",")[0].trim().toLowerCase();
  if (!host) return "";
  return host.includes(":") ? host.split(":")[0] : host;
};

const isLocalhostRequest = (req) => {
  const hostname = resolveHostname(req);
  if (hostname && LOCALHOST_HOSTS.has(hostname)) return true;
  const ip = String(req.ip || "").trim().toLowerCase();
  return ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";
};

const shouldSkipWriteLimitForPath = (path, isDevRequest) =>
  isDevRequest &&
  DEV_WRITE_LIMIT_SKIP_PREFIXES.some((prefix) =>
    String(path || "").startsWith(prefix),
  );

// Helper to safely resolve IP (IPv6-safe)
function resolveIpKey(req, prefix) {
  const ip = req.ip || "127.0.0.1";
  return `${prefix}:${ip}`;
}

// ── Per-user rate limiting (uses userId from JWT) ────────────
const perUserLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // 500 requests per 15 min per user
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use authenticated user ID if available, otherwise fall back to IP
    const userId = req.user?.id || req.user?.userId || req.user?.user_id;
    if (userId) return `user:${userId}`;
    return resolveIpKey(req, "user");
  },
  message: {
    error: "Rate limit exceeded",
    message: "You are making too many requests. Please slow down.",
    code: "USER_RATE_LIMIT",
    retryAfter: 15,
  },
  skip: (req) => {
    return (
      shouldBypassRateLimits ||
      req.path === "/health" ||
      req.path === "/api/health"
    );
  },
  validate: { xForwardedForHeader: false, ip: false },
});

// ── Strict per-IP limiter for write operations ────────────────
const writeOperationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // 100 write operations per hour per IP
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => resolveIpKey(req, "write"),
  message: {
    error: "Write rate limit exceeded",
    message: "Too many write operations. Please try again later.",
    code: "WRITE_RATE_LIMIT",
    retryAfter: 60,
  },
  skip: (req) => {
    const isDevRequest =
      IS_DEV || (ALLOW_LOCALHOST_RATE_LIMIT_BYPASS && isLocalhostRequest(req));
    // Only apply to write methods
    return (
      shouldBypassRateLimits ||
      !["POST", "PUT", "PATCH", "DELETE"].includes(req.method) ||
      shouldSkipWriteLimitForPath(req.path, isDevRequest)
    );
  },
  validate: { xForwardedForHeader: false, ip: false },
});

// ── Token refresh abuse limiter (per device fingerprint) ──────
const tokenRefreshDeviceLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // 15 token refreshes per 15 min per device
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const fp =
      req.body?.deviceFingerprint ||
      req.headers["x-device-fingerprint"] ||
      req.headers["x-device-id"];
    if (fp) return `refresh:${fp}`;
    return resolveIpKey(req, "refresh");
  },
  message: {
    error: "Too many token refreshes",
    message: "Session refresh rate exceeded. Please try again shortly.",
    code: "REFRESH_RATE_LIMIT",
    retryAfter: 15,
  },
  validate: { xForwardedForHeader: false, ip: false },
});

// ── Global burst protection (very short window, high threshold) ──
const burstLimiter = rateLimit({
  windowMs: 1000, // 1 second
  max: 20, // 20 requests per second per IP
  standardHeaders: false,
  legacyHeaders: false,
  keyGenerator: (req) => resolveIpKey(req, "burst"),
  message: {
    error: "Too many requests",
    message: "Request burst detected. Please slow down.",
    code: "BURST_RATE_LIMIT",
    retryAfter: 1,
  },
  skip: (req) => {
    return (
      shouldBypassRateLimits ||
      req.path === "/health" ||
      req.path === "/api/health"
    );
  },
  validate: { xForwardedForHeader: false, ip: false },
});

module.exports = {
  perUserLimiter,
  writeOperationLimiter,
  tokenRefreshDeviceLimiter,
  burstLimiter,
};

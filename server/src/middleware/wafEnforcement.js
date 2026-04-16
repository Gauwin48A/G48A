const rateLimit = require("express-rate-limit");

/** SQL injection detection patterns (anchored to avoid false positives) */
const SQLI_PATTERNS = [
  /\bunion\b\s+\bselect\b/i,
  /\bdrop\b\s+\btable\b/i,
  /\binsert\b\s+\binto\b/i,
  /\bdelete\b\s+\bfrom\b/i,
  /--\s*\b(select|drop|insert|delete|update|union|alter|create)\b/i,
  /\/\*[^*]*\*\//
];

/** Cross-site scripting detection patterns */
const XSS_PATTERNS = [
  /<script\b[^>]*>/i,
  /<\/script>/i,
  /javascript:/i,
  /\bonerror\s*=/i,
  /\bonload\s*=/i
];

/** Bot user-agent detection patterns (curl/wget allowed for monitoring/dev) */
const BOT_UA_PATTERNS = [
  /\bbot\b/i,
  /\bcrawler\b/i,
  /\bspider\b/i
];

/**
 * Parse a comma-separated environment variable into a trimmed array of strings.
 * @param {string|undefined} value - The raw env variable value.
 * @returns {string[]} Array of non-empty trimmed items.
 */
function parseCsvEnv(value) {
  if (!value) return [];
  return String(value)
    .split(",")
    .map(item => item.trim())
    .filter(Boolean);
}

/**
 * Recursively flatten nested input (objects, arrays, primitives) into
 * an array of string representations for pattern scanning.
 * @param {*} value - The value to flatten.
 * @param {string[]} output - Accumulator array for flattened strings.
 */
function flattenInput(value, output) {
  if (value === null || value === undefined) return;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    output.push(String(value));
    return;
  }
  if (Array.isArray(value)) {
    value.forEach(entry => flattenInput(entry, output));
    return;
  }
  if (typeof value === "object") {
    Object.values(value).forEach(entry => flattenInput(entry, output));
  }
}

/**
 * Test whether any of the given regex patterns match the content string.
 * @param {string} content - The string to test.
 * @param {RegExp[]} patterns - Array of regex patterns to match against.
 * @returns {boolean} True if at least one pattern matches.
 */
function hasAttackPattern(content, patterns) {
  return patterns.some(pattern => pattern.test(content));
}

/**
 * Express middleware that sets a response header indicating WAF enforcement.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function wafEvidenceHeaders(req, res, next) {
  res.setHeader("X-WAF-Enforced", "true");
  next();
}

/**
 * Express middleware implementing a Web Application Firewall (WAF).
 * Blocks requests based on:
 *   - Geo-blocking via CF-IPCountry / X-Country-Code headers
 *   - Bot user-agent detection (with configurable allow-list)
 *   - SQL injection pattern scanning on all input
 *   - XSS pattern scanning on all input
 *
 * Skips OPTIONS requests and health-check endpoints.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function wafRequestFilter(req, res, next) {
  const blockedCountries = new Set(
    parseCsvEnv(process.env.WAF_BLOCKED_COUNTRIES).map(item => item.toUpperCase())
  );
  const botAllowList = new Set(
    parseCsvEnv(process.env.WAF_BOT_ALLOWLIST).map(item => item.toLowerCase())
  );
  const botProtectionEnabled =
    String(process.env.WAF_BOT_PROTECTION_ENABLED || "true").toLowerCase() === "true";

  // Skip preflight and health checks
  if (req.method === "OPTIONS" || req.path === "/health" || req.path === "/api/health") {
    return next();
  }

  // Geo-blocking
  if (blockedCountries.size > 0) {
    const country = String(
      req.headers["cf-ipcountry"] || req.headers["x-country-code"] || ""
    ).toUpperCase();
    if (country && blockedCountries.has(country)) {
      return res.status(403).json({
        error: "Request blocked by WAF geo policy",
        code: "WAF_GEO_BLOCK"
      });
    }
  }

  // Bot protection
  if (botProtectionEnabled) {
    const userAgent = String(req.headers["user-agent"] || "");
    // Skip bot check for health/readiness endpoints and empty user-agents
    const isHealthCheck = req.path === "/api/health" || req.path === "/api/readiness";
    const isEmptyUA = !userAgent.trim();
    const allowListed =
      isHealthCheck || isEmptyUA ||
      (botAllowList.size > 0 &&
      Array.from(botAllowList).some(allowedAgent =>
        userAgent.toLowerCase().includes(allowedAgent)
      ));
    if (!allowListed && BOT_UA_PATTERNS.some(pattern => pattern.test(userAgent))) {
      return res.status(403).json({
        error: "Request blocked by WAF bot policy",
        code: "WAF_BOT_BLOCK"
      });
    }
  }

  // Collect all input values for pattern scanning
  const chunks = [];
  flattenInput(req.query, chunks);
  flattenInput(req.body, chunks);
  flattenInput(req.params, chunks);
  chunks.push(req.originalUrl || req.url || "");
  const combined = chunks.join(" ");

  // SQL injection check
  if (hasAttackPattern(combined, SQLI_PATTERNS)) {
    return res.status(403).json({
      error: "Request blocked by WAF SQLi rule",
      code: "WAF_SQLI_BLOCK"
    });
  }

  // XSS check
  if (hasAttackPattern(combined, XSS_PATTERNS)) {
    return res.status(403).json({
      error: "Request blocked by WAF XSS rule",
      code: "WAF_XSS_BLOCK"
    });
  }

  return next();
}

/**
 * Strict rate limiter for login endpoints.
 * Defaults to 10 requests per minute (configurable via WAF_LOGIN_MAX_REQ_PER_MINUTE).
 */
const strictLoginLimiter = rateLimit({
  windowMs: 60 * 1e3,
  max: Number.parseInt(process.env.WAF_LOGIN_MAX_REQ_PER_MINUTE, 10) || 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Request blocked by WAF rate limiting",
    code: "WAF_RATE_LIMIT"
  }
});

module.exports = {
  wafEvidenceHeaders,
  wafRequestFilter,
  strictLoginLimiter
};

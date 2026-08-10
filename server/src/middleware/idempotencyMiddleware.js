/**
 * idempotencyMiddleware.js - API Idempotency Key Middleware
 *
 * Implements:
 * 1. Idempotency-Key header processing for financial write endpoints.
 * 2. Caches request hashes & responses in database (api_idempotency_keys).
 * 3. Prevents duplicate payments, payouts, settlements, or refunds.
 */

const crypto = require("crypto");
const { runQuery } = require("../utils/dbHelpers");
const logger = require("../utils/logger");

const getAuthUserId = (req) => req.user?.id || req.user?.userId || req.user?.user_id || "anonymous";

/**
 * Express middleware to enforce API request idempotency.
 */
const enforceIdempotency = async (req, res, next) => {
  const idempotencyKey = req.headers["idempotency-key"] || req.headers["x-idempotency-key"];
  
  // If no idempotency key provided, continue normally
  if (!idempotencyKey || typeof idempotencyKey !== "string" || !idempotencyKey.trim()) {
    return next();
  }

  const cleanKey = idempotencyKey.trim();
  const userId = getAuthUserId(req);
  const endpoint = req.originalUrl || req.url;

  // Generate hash of request body to ensure exact parameter match
  const bodyString = JSON.stringify(req.body || {});
  const requestHash = crypto.createHash("sha256").update(bodyString).digest("hex");

  try {
    // 1. Check existing idempotency record
    const existing = await runQuery(
      `SELECT * FROM api_idempotency_keys WHERE user_id = $1 AND endpoint = $2 AND idempotency_key = $3`,
      [String(userId), endpoint, cleanKey]
    );

    if (existing.rows.length > 0) {
      const record = existing.rows[0];

      // If request hash differs, reject duplicate key reuse with different parameters
      if (record.request_hash !== requestHash) {
        return res.status(422).json({
          error: "Idempotency-Key reuse error: parameters do not match original request.",
        });
      }

      logger.info(`[Idempotency] Returning cached response for key ${cleanKey} (${endpoint})`);
      return res.status(record.status_code || 200).json(record.response_body);
    }

    // 2. Intercept res.json to capture response for caching
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      // Only cache successful or client error responses (2xx, 4xx)
      if (res.statusCode >= 200 && res.statusCode < 500) {
        runQuery(
          `INSERT INTO api_idempotency_keys (
             user_id, endpoint, idempotency_key, request_hash, response_body, status_code, created_at
           )
           VALUES ($1, $2, $3, $4, $5::jsonb, $6, NOW())
           ON CONFLICT (user_id, endpoint, idempotency_key) DO NOTHING`,
          [String(userId), endpoint, cleanKey, requestHash, JSON.stringify(body), res.statusCode]
        ).catch((err) => logger.warn("[Idempotency] Insert error:", err.message));
      }

      return originalJson(body);
    };

    next();
  } catch (err) {
    logger.error("[Idempotency] Middleware error:", err);
    next();
  }
};

module.exports = {
  enforceIdempotency,
};

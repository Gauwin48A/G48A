/**
 * idempotency.js — Idempotency-Key middleware for money-changing endpoints
 *
 * Implements Item 8 of the 58-Point Financial Safety Checklist:
 *   - POST /payment, POST /settlement, POST /payout, POST /refund,
 *     POST /sale/confirm, POST /sale/amount-received
 *
 * Usage:
 *   1. Apply `idempotencyMiddleware` to any endpoint where duplicate
 *      requests could cause financial damage.
 *   2. The client sends `Idempotency-Key: <uuid>` in the request header.
 *   3. On first request: stores the response in api_idempotency_keys.
 *   4. On repeat request with same key: returns stored response (201 → 200 status).
 *
 * Database table: api_idempotency_keys (created by schemaGuard.js)
 *   UNIQUE(user_id, endpoint, idempotency_key)
 */

const crypto = require("crypto");
const { runQuery } = require("../utils/dbHelpers");
const logger = require("../utils/logger");

/**
 * Compute a deterministic hash of the request body for content-addressability.
 */
function computeRequestHash(reqBody) {
  const normalized = JSON.stringify(reqBody || {}, Object.keys(reqBody || {}).sort());
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

/**
 * Express middleware that enforces idempotency via the Idempotency-Key header.
 *
 * @param {Object} options
 * @param {number} options.maxAgeSeconds - How long to retain idempotency records (default 24h)
 */
function idempotencyMiddleware(options = {}) {
  const maxAgeSeconds = options.maxAgeSeconds || 86400; // 24h default

  return async (req, res, next) => {
    // Only applies to mutating (non-GET) requests
    if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
      return next();
    }

    const idempotencyKey = req.headers["idempotency-key"] || req.headers["Idempotency-Key"];
    if (!idempotencyKey) {
      return next(); // No key → normal processing
    }

    // Validate key format (must be a non-empty string, max 255 chars)
    if (typeof idempotencyKey !== "string" || idempotencyKey.length < 8 || idempotencyKey.length > 255) {
      return res.status(400).json({
        error: "Invalid Idempotency-Key. Must be between 8 and 255 characters.",
      });
    }

    const userId = req.user?.userId || req.user?.id || req.user?.user_id || "anonymous";
    const endpoint = req.originalUrl || req.url;
    const requestHash = computeRequestHash(req.body);

    try {
      // Check for existing idempotency record
      const existing = await runQuery(
        `SELECT response_body, status_code, request_hash, created_at
         FROM api_idempotency_keys
         WHERE user_id = $1 AND endpoint = $2 AND idempotency_key = $3`,
        [String(userId), endpoint, idempotencyKey]
      );

      if (existing.rows.length > 0) {
        const record = existing.rows[0];

        // Check if the request body matches (content-addressable)
        if (record.request_hash !== requestHash) {
          return res.status(422).json({
            error: "Idempotency-Key already used with a different request body",
          });
        }

        // Check if the record has expired
        const createdAt = new Date(record.created_at);
        const ageSeconds = (Date.now() - createdAt.getTime()) / 1000;
        if (ageSeconds > maxAgeSeconds) {
          // Key expired — allow new request to proceed
          await runQuery(
            `DELETE FROM api_idempotency_keys
             WHERE user_id = $1 AND endpoint = $2 AND idempotency_key = $3`,
            [String(userId), endpoint, idempotencyKey]
          );
          return next();
        }

        // Return the cached response
        logger.info(`[Idempotency] Replayed ${req.method} ${endpoint} with key ${idempotencyKey}`);
        return res.status(record.status_code).json(record.response_body);
      }

      // First-time request: wrap res.json to capture the response
      const originalJson = res.json.bind(res);
      res.json = function (body) {
        // Store the response asynchronously (fire-and-forget, don't block response)
        setImmediate(async () => {
          try {
            await runQuery(
              `INSERT INTO api_idempotency_keys (user_id, endpoint, idempotency_key, request_hash, response_body, status_code)
               VALUES ($1, $2, $3, $4, $5::jsonb, $6)
               ON CONFLICT (user_id, endpoint, idempotency_key) DO NOTHING`,
              [String(userId), endpoint, idempotencyKey, requestHash, JSON.stringify(body), res.statusCode]
            );
          } catch (storeErr) {
            logger.warn("[Idempotency] Failed to store idempotency key:", storeErr.message);
          }
        });
        return originalJson(body);
      };

      return next();
    } catch (err) {
      logger.error("[Idempotency] Middleware error:", err);
      return next(); // Fail open: if idempotency check fails, let request proceed
    }
  };
}

module.exports = { idempotencyMiddleware };

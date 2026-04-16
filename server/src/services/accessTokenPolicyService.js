const crypto = require("crypto");

const { pool, DB_QUERY_TIMEOUT_MS } = require("../utils/dbHelpers");
const redisSession = require("../config/redisSession");
const logger = require("../utils/logger");
const REVOKED_ACCESS_TOKEN_PREFIX = "AUTH:REVOKED_ACCESS_TOKEN:";
const PASSWORD_CHANGE_CHECK_CACHE_TTL_MS = Number.parseInt(
  process.env.AUTH_PASSWORD_CHANGE_CHECK_CACHE_TTL_MS || "0",
  10,
);
const PASSWORD_CHANGE_IAT_TOLERANCE_MS_RAW = Number.parseInt(
  process.env.AUTH_PASSWORD_CHANGE_IAT_TOLERANCE_MS || "1000",
  10,
);
const PASSWORD_CHANGE_IAT_TOLERANCE_MS =
  Number.isFinite(PASSWORD_CHANGE_IAT_TOLERANCE_MS_RAW) &&
  PASSWORD_CHANGE_IAT_TOLERANCE_MS_RAW >= 0
    ? PASSWORD_CHANGE_IAT_TOLERANCE_MS_RAW
    : 1000;

const passwordChangedAtCache = new Map();
let passwordChangedAtCheckDisabled = false;

function parsePayloadUserId(payload) {
  const rawUserId = payload?.userId ?? payload?.id ?? payload?.user_id ?? payload?.sub ?? null;
  if (rawUserId === null || rawUserId === undefined) {
    return null;
  }
  const userId = String(rawUserId).trim();
  return userId.length ? userId : null;
}

function parsePayloadIatMs(payload) {
  const iat = Number(payload?.iat);
  if (!Number.isFinite(iat)) {
    return null;
  }
  return Math.floor(iat * 1000);
}

function parsePayloadExpSecondsRemaining(payload) {
  const exp = Number(payload?.exp);
  if (!Number.isFinite(exp)) {
    return null;
  }
  const nowSeconds = Math.floor(Date.now() / 1000);
  const remaining = exp - nowSeconds;
  return remaining > 0 ? remaining : 1;
}

function hashAccessToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

async function revokeAccessToken(token, payload) {
  if (!token) {
    return false;
  }

  const ttlSeconds = parsePayloadExpSecondsRemaining(payload);
  if (!ttlSeconds) {
    return false;
  }

  const key = `${REVOKED_ACCESS_TOKEN_PREFIX}${hashAccessToken(token)}`;
  await redisSession.set(
    key,
    {
      revoked_at: Date.now(),
    },
    ttlSeconds,
  );

  return true;
}

async function isAccessTokenRevoked(token) {
  if (!token) {
    return false;
  }
  const key = `${REVOKED_ACCESS_TOKEN_PREFIX}${hashAccessToken(token)}`;
  const record = await redisSession.get(key);
  return Boolean(record);
}

function getPasswordChangedAtCache(userId) {
  if (PASSWORD_CHANGE_CHECK_CACHE_TTL_MS <= 0) {
    return null;
  }

  const cached = passwordChangedAtCache.get(userId);
  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= Date.now()) {
    passwordChangedAtCache.delete(userId);
    return null;
  }

  return cached.value;
}

function setPasswordChangedAtCache(userId, changedAtMs) {
  if (PASSWORD_CHANGE_CHECK_CACHE_TTL_MS <= 0) {
    return;
  }

  passwordChangedAtCache.set(userId, {
    value: changedAtMs,
    expiresAt: Date.now() + PASSWORD_CHANGE_CHECK_CACHE_TTL_MS,
  });
}

async function fetchPasswordChangedAtMs(userId) {
  const cached = getPasswordChangedAtCache(userId);
  if (cached !== null) {
    return cached;
  }

  if (passwordChangedAtCheckDisabled) {
    return null;
  }

  try {
    const result = await pool.query({
      text: `
        SELECT EXTRACT(
          EPOCH FROM (password_changed_at AT TIME ZONE current_setting('TIMEZONE'))
        ) * 1000 AS password_changed_at_ms
        FROM users
        WHERE user_id::text = $1
        LIMIT 1
      `,
      values: [userId],
      query_timeout: DB_QUERY_TIMEOUT_MS,
    });

    const rowValue = result.rows?.[0]?.password_changed_at_ms ?? null;
    const changedAtMs = Number(rowValue);
    const normalized = Number.isFinite(changedAtMs) ? Math.floor(changedAtMs) : null;
    setPasswordChangedAtCache(userId, normalized);
    return normalized;
  } catch (error) {
    const isMissingColumn = String(error?.code || "").toUpperCase() === "42703";
    if (isMissingColumn) {
      passwordChangedAtCheckDisabled = true;
      logger.warn(
        "[AUTH] password_changed_at column missing. Access-token invalidation-by-password-change disabled.",
      );
      return null;
    }

    logger.warn("[AUTH] Failed password_changed_at policy check", {
      userId,
      message: error?.message,
    });
    return null;
  }
}

async function isAccessTokenInvalidByPasswordChange(payload) {
  const tokenIssuedAtMs = parsePayloadIatMs(payload);
  if (!tokenIssuedAtMs) {
    return false;
  }

  const userId = parsePayloadUserId(payload);
  if (!userId) {
    return false;
  }

  const passwordChangedAtMs = await fetchPasswordChangedAtMs(userId);
  if (!passwordChangedAtMs) {
    return false;
  }

  // JWT `iat` is second-granularity while DB timestamp has millisecond precision.
  // Treat near-simultaneous issuance/change as valid to avoid false invalidation.
  return tokenIssuedAtMs + PASSWORD_CHANGE_IAT_TOLERANCE_MS < passwordChangedAtMs;
}

function clearAccessTokenPolicyCaches() {
  passwordChangedAtCache.clear();
}

module.exports = {
  clearAccessTokenPolicyCaches,
  isAccessTokenInvalidByPasswordChange,
  isAccessTokenRevoked,
  parsePayloadUserId,
  revokeAccessToken,
};

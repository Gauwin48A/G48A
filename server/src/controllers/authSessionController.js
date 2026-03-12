const pool = require("../config/db");
const logger = require("../utils/logger");

const DB_QUERY_TIMEOUT_MS = Number.parseInt(process.env.DB_QUERY_TIMEOUT_MS, 10) || 10000;
const DEFAULT_SESSION_LIMIT = Number.parseInt(process.env.AUTH_SESSION_LIST_LIMIT || "20", 10);
const MAX_SESSION_LIMIT = Number.parseInt(process.env.AUTH_SESSION_LIST_MAX_LIMIT || "100", 10);
const TERMINAL_REAUTH_STATES = new Set(["invalid_token", "revoked", "password_changed"]);
const REFRESH_BLOCKED_STATES = new Set(["revoked", "password_changed"]);

function runQuery(text, values = []) {
  return pool.query({
    text,
    values,
    query_timeout: DB_QUERY_TIMEOUT_MS,
  });
}

function parseOptionalString(value) {
  if (value === undefined || value === null) {
    return null;
  }
  const normalized = String(value).trim();
  return normalized.length ? normalized : null;
}

function parseUserId(req) {
  return parseOptionalString(req.user?.userId || req.user?.id || req.user?.user_id);
}

function parseLimit(value) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_SESSION_LIMIT;
  }
  return Math.min(parsed, MAX_SESSION_LIMIT);
}

function isMissingTableError(error) {
  return String(error?.code || "").toUpperCase() === "42P01";
}

function parseClaim(req, keys = []) {
  for (const key of keys) {
    const value = req.user?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }
  return null;
}

async function getSessionStatus(req, res) {
  const hasRefreshCookie = Boolean(req?.cookies?.refreshToken);
  const hasAccessCookie = Boolean(req?.cookies?.accessToken);
  const userId = parseUserId(req) || parseClaim(req, ["sub"]);
  const authState = parseOptionalString(req.authState) || (userId ? "authenticated" : "anonymous");
  const requiresReauth = TERMINAL_REAUTH_STATES.has(authState);
  const canRefresh = hasRefreshCookie && !REFRESH_BLOCKED_STATES.has(authState);

  if (!userId) {
    return res.json({
      authenticated: false,
      authState,
      hasRefreshCookie,
      hasAccessCookie,
      canRefresh,
      requiresReauth,
      user: null,
    });
  }

  return res.json({
    authenticated: true,
    authState,
    hasRefreshCookie,
    hasAccessCookie,
    canRefresh,
    requiresReauth,
    user: {
      id: userId,
      role: parseClaim(req, ["role", "userRole"]),
      email: parseClaim(req, ["email"]),
      fullName: parseClaim(req, ["fullName", "name"]),
      phone: parseClaim(req, ["phone", "phone_number"]),
      tier: parseClaim(req, ["tier"]),
    },
  });
}

async function listSessions(req, res) {
  const userId = parseUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const limit = parseLimit(req.query?.limit);

  try {
    const result = await runQuery(
      `
        SELECT
          session_id::text AS session_id,
          created_at,
          last_activity,
          expires_at,
          ip_address,
          user_agent,
          device_fingerprint,
          is_active
        FROM user_sessions
        WHERE user_id::text = $1
          AND is_active = true
        ORDER BY COALESCE(last_activity, created_at) DESC
        LIMIT $2
      `,
      [userId, limit],
    );

    return res.json({
      sessions: result.rows,
      total: result.rows.length,
      limit,
    });
  } catch (error) {
    if (isMissingTableError(error)) {
      return res.json({ sessions: [], total: 0, limit });
    }
    logger.error("[AUTH SESSIONS] listSessions failed", error);
    return res.status(500).json({ error: "Failed to fetch sessions" });
  }
}

async function revokeSession(req, res) {
  const userId = parseUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const sessionId = parseOptionalString(req.params?.sessionId);
  if (!sessionId) {
    return res.status(400).json({ error: "sessionId is required" });
  }

  try {
    const result = await runQuery(
      `
        UPDATE user_sessions
        SET is_active = false
        WHERE session_id::text = $1
          AND user_id::text = $2
        RETURNING session_id::text AS session_id
      `,
      [sessionId, userId],
    );

    if (!result.rowCount) {
      return res.status(404).json({ error: "Session not found" });
    }

    return res.json({
      success: true,
      revokedSessionId: result.rows[0].session_id,
    });
  } catch (error) {
    if (isMissingTableError(error)) {
      return res.status(404).json({ error: "Session storage is not configured" });
    }
    logger.error("[AUTH SESSIONS] revokeSession failed", error);
    return res.status(500).json({ error: "Failed to revoke session" });
  }
}

async function revokeAllSessions(req, res) {
  const userId = parseUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const result = await runQuery(
      `
        UPDATE user_sessions
        SET is_active = false
        WHERE user_id::text = $1
          AND is_active = true
      `,
      [userId],
    );

    return res.json({
      success: true,
      revokedCount: result.rowCount || 0,
    });
  } catch (error) {
    if (isMissingTableError(error)) {
      return res.status(404).json({ error: "Session storage is not configured" });
    }
    logger.error("[AUTH SESSIONS] revokeAllSessions failed", error);
    return res.status(500).json({ error: "Failed to revoke sessions" });
  }
}

module.exports = {
  getSessionStatus,
  listSessions,
  revokeAllSessions,
  revokeSession,
};

/**
 * Admin Routes
 *
 * Provides admin-level user management, bulk actions, CSV export,
 * KYC/document verification, and audit logging.
 *
 * All routes require authentication (protect) and admin-read role.
 * Write operations additionally require admin-write role.
 */

const express = require("express");
const crypto = require("crypto");
const router = express.Router();

const { protect } = require("../middleware/auth");
const { requireRole } = require("../middleware/rbac");
const adminDocController = require("../controllers/adminDocController");
const logger = require("../utils/logger");
const { getClientIP } = require("../services/auditLogger");
const { runQuery } = require("../utils/dbHelpers");
const { parseOptionalString, parsePositiveInt } = require("../utils/parseHelpers");
const { adminLimiter } = require("../middleware/rateLimiter");

// ---------------------------------------------------------------------------
// Constants & Configuration
// ---------------------------------------------------------------------------

const ADMIN_DEFAULT_USER_LIMIT =
  Number.parseInt(process.env.ADMIN_DEFAULT_USER_LIMIT, 10) || 20;
const ADMIN_MAX_USER_LIMIT =
  Number.parseInt(process.env.ADMIN_MAX_USER_LIMIT, 10) || 100;
const ADMIN_BULK_MAX_IDS =
  Number.parseInt(process.env.ADMIN_BULK_MAX_IDS, 10) || 500;
const ADMIN_EXPORT_MAX_ROWS =
  Number.parseInt(process.env.ADMIN_EXPORT_MAX_ROWS, 10) || 5000;

/** Whitelist map of allowed sort columns to safe SQL expressions. */
const USER_SORT_MAP = {
  created_at: "u.created_at",
  full_name:
    "COALESCE(NULLIF(to_jsonb(u)->>'full_name', ''), NULLIF(to_jsonb(u)->>'name', ''), NULLIF(to_jsonb(p)->>'full_name', ''), COALESCE(to_jsonb(u)->>'username', ''))",
  email: "COALESCE(to_jsonb(u)->>'email', '')",
  tier:
    "COALESCE(NULLIF(to_jsonb(u)->>'tier', ''), NULLIF(to_jsonb(u)->>'tier_plan', ''), 'basic')",
  role: "COALESCE(NULLIF(to_jsonb(u)->>'role', ''), 'user')",
  last_login: "u.last_login",
  trust_score: "COALESCE(p.trust_score, 0)",
};

const ALLOWED_ROLE_VALUES = new Set([
  "user",
  "admin",
  "moderator",
  "superadmin",
  "super_admin",
  "super-admin",
  "super admin",
  "administrator",
  "mod",
  "risk",
  "ops",
  "operations",
]);

const ALLOWED_TIER_VALUES = new Set([
  "basic",
  "silver",
  "premium",
  "bronze",
  "gold",
  "platinum",
]);

// ---------------------------------------------------------------------------
// Local Parse / Utility Helpers
// ---------------------------------------------------------------------------

/**
 * Parse a value to an optional boolean (true | false | null).
 * Unlike parseBoolean from parseHelpers, this returns null for
 * absent/unrecognised values rather than a fallback boolean.
 * @param {*} value
 * @returns {boolean|null}
 */
function parseOptionalBoolean(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "boolean") return value;
  const normalized = String(value).trim().toLowerCase();
  if (normalized === "true" || normalized === "1" || normalized === "yes") return true;
  if (normalized === "false" || normalized === "0" || normalized === "no") return false;
  return null;
}

/**
 * Parse a value to an ISO-8601 date string or null.
 * @param {*} value
 * @returns {string|null}
 */
function parseOptionalDate(value) {
  const normalized = parseOptionalString(value);
  if (!normalized) return null;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

/**
 * Parse a value to a finite number or null.
 * @param {*} value
 * @returns {number|null}
 */
function parseOptionalNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isUndefinedTableError(error) {
  return String(error?.code || "").toUpperCase() === "42P01";
}

/**
 * Extract the acting admin's user ID from the request.
 * @param {import('express').Request} req
 * @returns {string|null}
 */
function getRequestUserId(req) {
  return parseOptionalString(req.user?.user_id || req.user?.userId || req.user?.id);
}

/**
 * Map a user-provided sort key to a safe SQL expression.
 * Falls back to created_at.
 * @param {string} sortBy
 * @returns {string}
 */
function getSafeSort(sortBy) {
  const normalized = String(sortBy || "").trim().toLowerCase();
  return USER_SORT_MAP[normalized] || USER_SORT_MAP.created_at;
}

/**
 * Normalise sort order to ASC or DESC.
 * @param {string} order
 * @returns {"ASC"|"DESC"}
 */
function getSafeOrder(order) {
  return String(order || "").trim().toUpperCase() === "ASC" ? "ASC" : "DESC";
}

/**
 * Escape a value for safe inclusion in a CSV cell.
 * @param {*} value
 * @returns {string}
 */
function escapeCsvValue(value) {
  const normalized = value === undefined || value === null ? "" : String(value);
  return `"${normalized.replace(/"/g, '""')}"`;
}

/**
 * Build a CSV string from rows and header definitions.
 * @param {Object[]} rows
 * @param {{ key: string }[]} headers
 * @returns {string}
 */
function buildCsv(rows, headers) {
  const head = headers.map((header) => header.key).join(",");
  const body = rows
    .map((row) => headers.map((header) => escapeCsvValue(row[header.key])).join(","))
    .join("\n");
  return `${head}\n${body}`;
}

// ---------------------------------------------------------------------------
// User Filter Helpers
// ---------------------------------------------------------------------------

/**
 * Normalise raw query parameters into a structured user-filter object.
 * @param {Object} query - req.query
 * @returns {Object}
 */
function normalizeUserFilters(query = {}) {
  return {
    page: parsePositiveInt(query.page, 1),
    limit: parsePositiveInt(query.limit, ADMIN_DEFAULT_USER_LIMIT, ADMIN_MAX_USER_LIMIT),
    search: parseOptionalString(query.search),
    role: parseOptionalString(query.role)?.toLowerCase() || null,
    tier: parseOptionalString(query.tier)?.toLowerCase() || null,
    status: parseOptionalString(query.status)?.toLowerCase() || null,
    sortBy:
      parseOptionalString(query.sort || query.sortBy || "created_at")?.toLowerCase() ||
      "created_at",
    order: getSafeOrder(query.order),
    createdFrom: parseOptionalDate(query.created_from || query.createdFrom),
    createdTo: parseOptionalDate(query.created_to || query.createdTo),
    minTrustScore: parseOptionalNumber(query.min_trust_score || query.minTrustScore),
    emailVerified: parseOptionalBoolean(query.email_verified ?? query.emailVerified),
    phoneVerified: parseOptionalBoolean(query.phone_verified ?? query.phoneVerified),
    isActive: parseOptionalBoolean(query.is_active ?? query.isActive),
    kycStatus:
      parseOptionalString(query.kyc_status || query.kycStatus)?.toUpperCase() || null,
  };
}

/**
 * Build a parameterised WHERE clause from normalised user filters.
 * Mutates `params` array by pushing bound values.
 * @param {Object} filters - Output from normalizeUserFilters
 * @param {Array} params - Mutable parameter array
 * @returns {string} SQL WHERE clause or empty string
 */
function buildUserWhereClause(filters, params) {
  const conditions = [];

  if (filters.search) {
    params.push(`%${filters.search}%`);
    const idx = params.length;
    conditions.push(`
      (
        COALESCE(NULLIF(to_jsonb(u)->>'full_name', ''), NULLIF(to_jsonb(u)->>'name', ''), NULLIF(to_jsonb(p)->>'full_name', ''), COALESCE(to_jsonb(u)->>'username', '')) ILIKE $${idx}
        OR COALESCE(to_jsonb(u)->>'email', '') ILIKE $${idx}
        OR COALESCE(to_jsonb(u)->>'username', '') ILIKE $${idx}
        OR COALESCE(NULLIF(to_jsonb(u)->>'phone', ''), NULLIF(to_jsonb(u)->>'phone_number', ''), NULLIF(to_jsonb(p)->>'phone', '')) ILIKE $${idx}
      )
    `);
  }

  if (filters.role) {
    params.push(filters.role);
    conditions.push(
      `LOWER(COALESCE(NULLIF(to_jsonb(u)->>'role', ''), 'user')) = $${params.length}`
    );
  }

  if (filters.tier) {
    params.push(filters.tier);
    conditions.push(
      `LOWER(COALESCE(NULLIF(to_jsonb(u)->>'tier', ''), NULLIF(to_jsonb(u)->>'tier_plan', ''), 'basic')) = $${params.length}`
    );
  }

  if (filters.status === "active") {
    conditions.push("COALESCE(u.is_active, true) = true");
  } else if (
    ["inactive", "restricted", "suspended", "banned"].includes(filters.status || "")
  ) {
    conditions.push("COALESCE(u.is_active, true) = false");
  }

  if (typeof filters.isActive === "boolean") {
    params.push(filters.isActive);
    conditions.push(`COALESCE(u.is_active, true) = $${params.length}`);
  }

  if (filters.kycStatus) {
    params.push(filters.kycStatus);
    conditions.push(
      `UPPER(COALESCE(NULLIF(to_jsonb(u)->>'aadhaar_status', ''), 'PENDING')) = $${params.length}`
    );
  }

  if (filters.createdFrom) {
    params.push(filters.createdFrom);
    conditions.push(`u.created_at >= $${params.length}::timestamptz`);
  }

  if (filters.createdTo) {
    params.push(filters.createdTo);
    conditions.push(`u.created_at <= $${params.length}::timestamptz`);
  }

  if (filters.minTrustScore !== null) {
    params.push(filters.minTrustScore);
    conditions.push(`COALESCE(p.trust_score, 0) >= $${params.length}`);
  }

  if (typeof filters.emailVerified === "boolean") {
    params.push(filters.emailVerified ? "true" : "false");
    conditions.push(
      `LOWER(COALESCE(to_jsonb(u)->>'email_verified', 'false')) = $${params.length}`
    );
  }

  if (typeof filters.phoneVerified === "boolean") {
    params.push(filters.phoneVerified ? "true" : "false");
    conditions.push(
      `LOWER(COALESCE(to_jsonb(u)->>'phone_verified', 'false')) = $${params.length}`
    );
  }

  return conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
}

// ---------------------------------------------------------------------------
// Schema Bootstrap
// ---------------------------------------------------------------------------

let adminSchemaReadyPromise = null;

/**
 * Ensure the admin-specific columns and tables exist.
 * Runs once per process lifetime; subsequent calls return the cached promise.
 * @returns {Promise<void>}
 */
async function ensureAdminSchema() {
  if (!adminSchemaReadyPromise) {
    adminSchemaReadyPromise = (async () => {
      await runQuery(
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user'`
      );
      await runQuery(
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'basic'`
      );
      await runQuery(
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true`
      );
      await runQuery(
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`
      );
      await runQuery(
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()`
      );
      await runQuery(
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ`
      );

      await runQuery(`
        CREATE TABLE IF NOT EXISTS admin_bulk_action_logs (
          id BIGSERIAL PRIMARY KEY,
          request_id TEXT UNIQUE NOT NULL,
          actor_user_id TEXT NOT NULL,
          action TEXT NOT NULL,
          value TEXT,
          reason TEXT,
          target_user_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
          affected_count INTEGER NOT NULL DEFAULT 0,
          metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      await runQuery(`
        CREATE TABLE IF NOT EXISTS admin_export_logs (
          id BIGSERIAL PRIMARY KEY,
          export_id TEXT UNIQUE NOT NULL,
          actor_user_id TEXT NOT NULL,
          export_type TEXT NOT NULL,
          row_count INTEGER NOT NULL DEFAULT 0,
          filters JSONB NOT NULL DEFAULT '{}'::jsonb,
          metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
          requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      await runQuery(
        `CREATE INDEX IF NOT EXISTS idx_admin_bulk_action_logs_created_at ON admin_bulk_action_logs(created_at DESC)`
      );
      await runQuery(
        `CREATE INDEX IF NOT EXISTS idx_admin_export_logs_requested_at ON admin_export_logs(requested_at DESC)`
      );
    })().catch((err) => {
      logger.warn("[Admin] Schema readiness update skipped", {
        message: err.message,
      });
      return false;
    });
  }
  return adminSchemaReadyPromise;
}

// ---------------------------------------------------------------------------
// Audit / Logging Helpers
// ---------------------------------------------------------------------------

/**
 * Persist a bulk-action audit record and a general audit-log entry.
 * @param {Object} opts
 * @param {string} opts.requestId
 * @param {string} opts.actorUserId
 * @param {string} opts.action
 * @param {string|null} opts.value
 * @param {string|null} opts.reason
 * @param {string[]} opts.targetUserIds
 * @param {number} opts.affectedCount
 * @param {import('express').Request} opts.req
 */
async function logBulkAction({
  requestId,
  actorUserId,
  action,
  value,
  reason,
  targetUserIds,
  affectedCount,
  req,
}) {
  const metadata = {
    ip: getClientIP(req),
    user_agent: req.headers["user-agent"] || "unknown",
    reason: reason || null,
  };

  await runQuery(
    `
      INSERT INTO admin_bulk_action_logs
      (request_id, actor_user_id, action, value, reason, target_user_ids, affected_count, metadata, created_at)
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8::jsonb, NOW())
    `,
    [
      requestId,
      actorUserId,
      action,
      value || null,
      reason || null,
      JSON.stringify(targetUserIds),
      affectedCount,
      JSON.stringify(metadata),
    ]
  ).catch((err) => {
    logger.warn("[Admin] Failed to persist bulk action log", {
      requestId,
      message: err.message,
    });
  });

  await runQuery(
    `
      INSERT INTO audit_logs (user_id, action, ip_address, user_agent, details, created_at)
      VALUES ($1, $2, $3, $4, $5::jsonb, NOW())
    `,
    [
      actorUserId,
      "ADMIN_USER_BULK_ACTION",
      metadata.ip,
      metadata.user_agent,
      JSON.stringify({
        request_id: requestId,
        action,
        value: value || null,
        reason: reason || null,
        target_count: targetUserIds.length,
        affected_count: affectedCount,
      }),
    ]
  ).catch((err) => {
    logger.warn("[Admin] Failed to persist audit log for bulk action", {
      requestId,
      message: err.message,
    });
  });
}

// ---------------------------------------------------------------------------
// Data-Fetching Helpers
// ---------------------------------------------------------------------------

/**
 * Fetch users matching the given filters with pagination.
 * @param {Object} filters - Output of normalizeUserFilters
 * @param {Object} [opts]
 * @param {number} [opts.limitOverride]
 * @param {number} [opts.offsetOverride]
 * @returns {Promise<{ rows: Object[], total: number, page: number, limit: number }>}
 */
async function fetchUsersByFilters(filters, opts = {}) {
  const params = [];
  const whereClause = buildUserWhereClause(filters, params);
  const safeSort = getSafeSort(filters.sortBy);
  const safeOrder = getSafeOrder(filters.order);
  const pageNumber = parsePositiveInt(filters.page, 1);
  const limitNumber = parsePositiveInt(
    filters.limit,
    ADMIN_DEFAULT_USER_LIMIT,
    ADMIN_MAX_USER_LIMIT
  );
  const offset = (pageNumber - 1) * limitNumber;

  const countResult = await runQuery(
    `
      SELECT COUNT(*)::int AS total
      FROM users u
      LEFT JOIN profiles p ON p.user_id::text = u.user_id::text
      ${whereClause}
    `,
    params
  );
  const total = Number.parseInt(countResult.rows[0]?.total, 10) || 0;

  const useLimit =
    opts.limitOverride !== undefined ? opts.limitOverride : limitNumber;
  const useOffset =
    opts.offsetOverride !== undefined ? opts.offsetOverride : offset;

  const dataParams = [...params, useLimit, useOffset];

  const rowsResult = await runQuery(
    `
      SELECT
        u.user_id::text AS user_id,
        COALESCE(NULLIF(to_jsonb(u)->>'full_name', ''), NULLIF(to_jsonb(u)->>'name', ''), NULLIF(to_jsonb(p)->>'full_name', ''), COALESCE(to_jsonb(u)->>'username', 'User')) AS full_name,
        COALESCE(to_jsonb(u)->>'email', '') AS email,
        COALESCE(to_jsonb(u)->>'username', '') AS username,
        COALESCE(NULLIF(to_jsonb(u)->>'phone', ''), NULLIF(to_jsonb(u)->>'phone_number', ''), NULLIF(to_jsonb(p)->>'phone', '')) AS phone,
        LOWER(COALESCE(NULLIF(to_jsonb(u)->>'role', ''), 'user')) AS role,
        LOWER(COALESCE(NULLIF(to_jsonb(u)->>'tier', ''), NULLIF(to_jsonb(u)->>'tier_plan', ''), 'basic')) AS tier,
        COALESCE(u.is_active, true) AS is_active,
        COALESCE(to_jsonb(u)->>'email_verified', 'false') AS email_verified,
        COALESCE(to_jsonb(u)->>'phone_verified', 'false') AS phone_verified,
        UPPER(COALESCE(NULLIF(to_jsonb(u)->>'aadhaar_status', ''), 'PENDING')) AS kyc_status,
        u.created_at,
        u.last_login,
        p.avatar_url,
        COALESCE(p.trust_score, 0) AS trust_score
      FROM users u
      LEFT JOIN profiles p ON p.user_id::text = u.user_id::text
      ${whereClause}
      ORDER BY ${safeSort} ${safeOrder}
      LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}
    `,
    dataParams
  );

  return { rows: rowsResult.rows, total, page: pageNumber, limit: limitNumber };
}

// ---------------------------------------------------------------------------
// Export Handler
// ---------------------------------------------------------------------------

/**
 * GET /users/export | /export/users
 * Stream a CSV export of users matching the provided filters.
 * Logs the export to admin_export_logs and audit_logs.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function exportUsersHandler(req, res) {
  try {
    await ensureAdminSchema();

    const filters = normalizeUserFilters(req.query);
    const exportLimit = parsePositiveInt(
      req.query.export_limit || req.query.limit,
      ADMIN_EXPORT_MAX_ROWS,
      ADMIN_EXPORT_MAX_ROWS
    );
    filters.page = 1;
    filters.limit = exportLimit;

    const { rows, total } = await fetchUsersByFilters(filters, {
      limitOverride: exportLimit,
      offsetOverride: 0,
    });

    const headers = [
      { key: "user_id" },
      { key: "full_name" },
      { key: "email" },
      { key: "username" },
      { key: "phone" },
      { key: "role" },
      { key: "tier" },
      { key: "is_active" },
      { key: "email_verified" },
      { key: "phone_verified" },
      { key: "kyc_status" },
      { key: "trust_score" },
      { key: "created_at" },
      { key: "last_login" },
    ];
    const csv = buildCsv(rows, headers);

    const actorUserId = getRequestUserId(req);
    const exportId = crypto.randomUUID();
    const metadata = {
      ip: getClientIP(req),
      user_agent: req.headers["user-agent"] || "unknown",
      requested_total: total,
    };

    await runQuery(
      `
        INSERT INTO admin_export_logs
        (export_id, actor_user_id, export_type, row_count, filters, metadata, requested_at)
        VALUES ($1, $2, 'users_csv', $3, $4::jsonb, $5::jsonb, NOW())
      `,
      [
        exportId,
        actorUserId || "unknown",
        rows.length,
        JSON.stringify(filters),
        JSON.stringify(metadata),
      ]
    ).catch((err) => {
      logger.warn("[Admin] Failed to persist export log", {
        exportId,
        message: err.message,
      });
    });

    await runQuery(
      `
        INSERT INTO audit_logs (user_id, action, ip_address, user_agent, details, created_at)
        VALUES ($1, $2, $3, $4, $5::jsonb, NOW())
      `,
      [
        actorUserId,
        "ADMIN_USERS_EXPORT",
        metadata.ip,
        metadata.user_agent,
        JSON.stringify({
          export_id: exportId,
          exported_rows: rows.length,
          requested_total: total,
          filters,
        }),
      ]
    ).catch((err) => {
      logger.warn("[Admin] Failed to persist export audit log", {
        exportId,
        message: err.message,
      });
    });

    const dateSuffix = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=users_export_${dateSuffix}.csv`
    );
    res.setHeader("X-Export-Id", exportId);
    res.setHeader("X-Exported-Rows", String(rows.length));
    res.send(csv);
  } catch (err) {
    logger.error("[Admin] Export users error:", err);
    res.status(500).json({ error: "Export failed", details: err.message });
  }
}

// ---------------------------------------------------------------------------
// Role Guards
// ---------------------------------------------------------------------------

const requireAdminRead = requireRole(
  "admin",
  "superadmin",
  "super_admin",
  "moderator",
  "risk",
  "ops"
);
const requireAdminWrite = requireRole("admin", "superadmin", "super_admin");

// ---------------------------------------------------------------------------
// Middleware (applied to all routes in this router)
// ---------------------------------------------------------------------------

router.use(protect);
router.use(adminLimiter);
router.use(requireAdminRead);

// ---------------------------------------------------------------------------
// User Management Routes
// ---------------------------------------------------------------------------

/**
 * @route   GET /admin/complaints/analytics
 * @desc    Complaint analytics for a rolling window (default 30 days).
 * @access  Admin (read)
 */
router.get("/complaints/analytics", async (req, res) => {
  const windowDays = parsePositiveInt(
    req.query.window_days || req.query.windowDays,
    30,
    365,
  );
  const interval = `${windowDays} days`;

  try {
    const statsResult = await runQuery(
      `
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'open')::int AS open_count,
        COUNT(*) FILTER (WHERE status = 'triage')::int AS triage_count,
        COUNT(*) FILTER (WHERE status = 'investigating')::int AS investigating_count,
        COUNT(*) FILTER (WHERE status = 'resolved')::int AS resolved_count,
        COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected_count,
        COUNT(*) FILTER (WHERE status = 'closed')::int AS closed_count,
        COUNT(*) FILTER (WHERE severity = 'low')::int AS low_count,
        COUNT(*) FILTER (WHERE severity = 'medium')::int AS medium_count,
        COUNT(*) FILTER (WHERE severity = 'high')::int AS high_count,
        COUNT(*) FILTER (WHERE severity = 'critical')::int AS critical_count,
        AVG(
          EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600
        ) FILTER (WHERE resolved_at IS NOT NULL) AS avg_resolution_hours
      FROM complaints
      WHERE created_at >= NOW() - $1::interval
      `,
      [interval],
    );

    const statsRow = statsResult.rows?.[0] || {};

    let riskRows = [];
    try {
      const riskResult = await runQuery(
        `
        SELECT status, COUNT(*)::int AS count
        FROM user_risk_states
        WHERE (details->>'source' = 'complaint' OR reason ILIKE 'complaint%')
          AND (expires_at IS NULL OR expires_at > NOW())
        GROUP BY status
        `,
        [],
      );
      riskRows = riskResult.rows || [];
    } catch (riskErr) {
      if (!isUndefinedTableError(riskErr)) {
        logger.warn("[Admin] Complaint risk analytics failed", {
          message: riskErr.message,
        });
      }
    }

    const activeRiskDecisions = riskRows.reduce(
      (acc, row) => {
        const status = String(row.status || "unknown").toLowerCase();
        acc[status] = Number(row.count) || 0;
        acc.total += Number(row.count) || 0;
        return acc;
      },
      { total: 0 },
    );

    res.json({
      windowDays,
      totals: {
        total: Number(statsRow.total) || 0,
        open: Number(statsRow.open_count) || 0,
        triage: Number(statsRow.triage_count) || 0,
        investigating: Number(statsRow.investigating_count) || 0,
        resolved: Number(statsRow.resolved_count) || 0,
        rejected: Number(statsRow.rejected_count) || 0,
        closed: Number(statsRow.closed_count) || 0,
      },
      bySeverity: {
        low: Number(statsRow.low_count) || 0,
        medium: Number(statsRow.medium_count) || 0,
        high: Number(statsRow.high_count) || 0,
        critical: Number(statsRow.critical_count) || 0,
      },
      avgResolutionHours: Number(statsRow.avg_resolution_hours) || 0,
      activeRiskDecisions,
    });
  } catch (error) {
    if (isUndefinedTableError(error)) {
      return res.json({
        windowDays,
        totals: {
          total: 0,
          open: 0,
          triage: 0,
          investigating: 0,
          resolved: 0,
          rejected: 0,
          closed: 0,
        },
        bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
        avgResolutionHours: 0,
        activeRiskDecisions: { total: 0 },
      });
    }
    logger.error("[Admin] Complaint analytics error:", error);
    res.status(500).json({ error: "Failed to load complaint analytics" });
  }
});

/**
 * @route   GET /admin/complaints/actions
 * @desc    Historical complaint-related audit log entries.
 * @access  Admin (read)
 */
router.get("/complaints/actions", async (req, res) => {
  const limit = parsePositiveInt(req.query.limit, 50, 200);
  const offset = parsePositiveInt(req.query.offset, 0, ADMIN_EXPORT_MAX_ROWS);
  const actionFilter = parseOptionalString(req.query.action);

  try {
    const params = [limit, offset];
    let actionClause =
      "AND action IN ('COMPLAINT_RISK_DECISION','COMPLAINT_STATUS_UPDATE')";
    if (actionFilter) {
      params.push(actionFilter);
      actionClause = "AND action = $3";
    }

    const result = await runQuery(
      `
      SELECT
        COUNT(*) OVER()::int AS total_count,
        id,
        user_id,
        action,
        details,
        ip_address,
        created_at
      FROM audit_logs
      WHERE 1=1
        ${actionClause}
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
      `,
      params,
    );

    const total = result.rows.length ? Number(result.rows[0].total_count) || 0 : 0;
    const logs = result.rows.map(({ total_count, ...row }) => row);

    res.json({
      logs,
      pagination: {
        total,
        limit,
        offset,
      },
    });
  } catch (error) {
    if (isUndefinedTableError(error)) {
      return res.json({
        logs: [],
        pagination: { total: 0, limit, offset },
      });
    }
    logger.error("[Admin] Complaint action logs error:", error);
    res.status(500).json({ error: "Failed to load complaint action logs" });
  }
});

/**
 * @route   GET /admin/users
 * @desc    List users with filtering, search, sorting, and pagination
 * @access  Admin (read)
 */
router.get("/users", async (req, res) => {
  try {
    await ensureAdminSchema();

    const filters = normalizeUserFilters(req.query);
    const { rows, total, page, limit } = await fetchUsersByFilters(filters);

    res.json({
      users: rows,
      data: rows,
      filters: {
        search: filters.search,
        role: filters.role,
        tier: filters.tier,
        status: filters.status,
        created_from: filters.createdFrom,
        created_to: filters.createdTo,
        min_trust_score: filters.minTrustScore,
        email_verified: filters.emailVerified,
        phone_verified: filters.phoneVerified,
        kyc_status: filters.kycStatus,
      },
      sort: {
        by: filters.sortBy,
        order: filters.order,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrevious: page > 1,
      },
    });
  } catch (err) {
    logger.error("[Admin] Get users error:", err);
    res.status(500).json({ error: "Failed to fetch users", details: err.message });
  }
});

// ---------------------------------------------------------------------------
// Bulk Action Routes
// ---------------------------------------------------------------------------

/**
 * @route   POST /admin/users/bulk-action
 * @desc    Apply a bulk action (suspend, activate, change-role, change-tier) to multiple users
 * @access  Admin (write)
 */
router.post("/users/bulk-action", requireAdminWrite, async (req, res) => {
  try {
    await ensureAdminSchema();

    const { userIds, action, value, reason } = req.body || {};
    const normalizedAction = String(action || "").trim().toLowerCase();

    if (!Array.isArray(userIds) || !userIds.length) {
      return res.status(400).json({ error: "userIds array required" });
    }
    if (userIds.length > ADMIN_BULK_MAX_IDS) {
      return res.status(400).json({
        error: `Bulk action exceeds max IDs (${ADMIN_BULK_MAX_IDS})`,
        max: ADMIN_BULK_MAX_IDS,
      });
    }

    const normalizedUserIds = [
      ...new Set(
        userIds.map((id) => String(id || "").trim()).filter(Boolean)
      ),
    ];
    if (!normalizedUserIds.length) {
      return res.status(400).json({ error: "No valid user IDs provided" });
    }

    let queryText = null;
    let queryParams = [normalizedUserIds];
    let normalizedValue = null;

    if (normalizedAction === "change-role") {
      normalizedValue = String(value || "").trim().toLowerCase();
      if (!ALLOWED_ROLE_VALUES.has(normalizedValue)) {
        return res.status(400).json({
          error: `Invalid role value. Allowed: ${[...ALLOWED_ROLE_VALUES].join(", ")}`,
        });
      }
      queryText = `
        UPDATE users
        SET role = $2, updated_at = NOW()
        WHERE user_id::text = ANY($1::text[])
        RETURNING user_id::text AS user_id
      `;
      queryParams = [normalizedUserIds, normalizedValue];
    } else if (normalizedAction === "change-tier") {
      normalizedValue = String(value || "").trim().toLowerCase();
      if (!ALLOWED_TIER_VALUES.has(normalizedValue)) {
        return res.status(400).json({
          error: `Invalid tier value. Allowed: ${[...ALLOWED_TIER_VALUES].join(", ")}`,
        });
      }
      queryText = `
        UPDATE users
        SET tier = $2, updated_at = NOW()
        WHERE user_id::text = ANY($1::text[])
        RETURNING user_id::text AS user_id
      `;
      queryParams = [normalizedUserIds, normalizedValue];
    } else if (normalizedAction === "suspend" || normalizedAction === "deactivate") {
      queryText = `
        UPDATE users
        SET is_active = false, updated_at = NOW()
        WHERE user_id::text = ANY($1::text[])
        RETURNING user_id::text AS user_id
      `;
    } else if (normalizedAction === "unsuspend" || normalizedAction === "activate") {
      queryText = `
        UPDATE users
        SET is_active = true, updated_at = NOW()
        WHERE user_id::text = ANY($1::text[])
        RETURNING user_id::text AS user_id
      `;
    } else {
      return res.status(400).json({
        error:
          "Invalid action. Must be one of: suspend, unsuspend, deactivate, activate, change-role, change-tier",
      });
    }

    const result = await runQuery(queryText, queryParams);
    const affectedUserIds = result.rows
      .map((row) => String(row.user_id || "").trim())
      .filter(Boolean);

    const requestId = crypto.randomUUID();
    const actorUserId = getRequestUserId(req) || "unknown";

    await logBulkAction({
      requestId,
      actorUserId,
      action: normalizedAction,
      value: normalizedValue,
      reason: parseOptionalString(reason),
      targetUserIds: normalizedUserIds,
      affectedCount: result.rowCount || 0,
      req,
    });

    return res.json({
      success: true,
      requestId,
      action: normalizedAction,
      value: normalizedValue,
      affected: result.rowCount || 0,
      affectedUserIds,
    });
  } catch (err) {
    logger.error("[Admin] Bulk action error:", err);
    return res
      .status(500)
      .json({ error: "Bulk action failed", details: err.message });
  }
});

/**
 * @route   GET /admin/users/bulk-actions
 * @desc    List bulk action audit logs with pagination
 * @access  Admin (write)
 */
router.get("/users/bulk-actions", requireAdminWrite, async (req, res) => {
  try {
    await ensureAdminSchema();

    const page = parsePositiveInt(req.query.page, 1);
    const limit = parsePositiveInt(req.query.limit, 20, 100);
    const offset = (page - 1) * limit;

    const [rowsResult, countResult] = await Promise.all([
      runQuery(
        `
          SELECT request_id, actor_user_id, action, value, reason,
                 target_user_ids, affected_count, metadata, created_at
          FROM admin_bulk_action_logs
          ORDER BY created_at DESC
          LIMIT $1 OFFSET $2
        `,
        [limit, offset]
      ),
      runQuery("SELECT COUNT(*)::int AS total FROM admin_bulk_action_logs"),
    ]);

    const total = Number.parseInt(countResult.rows[0]?.total, 10) || 0;

    res.json({
      records: rowsResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    logger.error("[Admin] Bulk action log query failed:", err);
    res
      .status(500)
      .json({ error: "Failed to fetch bulk action logs", details: err.message });
  }
});

// ---------------------------------------------------------------------------
// Export Routes
// ---------------------------------------------------------------------------

/**
 * @route   GET /admin/users/export
 * @desc    Export users as CSV (alias)
 * @access  Admin (write)
 */
router.get("/users/export", requireAdminWrite, exportUsersHandler);

/**
 * @route   GET /admin/export/users
 * @desc    Export users as CSV
 * @access  Admin (write)
 */
router.get("/export/users", requireAdminWrite, exportUsersHandler);

/**
 * @route   GET /admin/exports/users/logs
 * @desc    List export audit logs with pagination
 * @access  Admin (write)
 */
router.get("/exports/users/logs", requireAdminWrite, async (req, res) => {
  try {
    await ensureAdminSchema();

    const page = parsePositiveInt(req.query.page, 1);
    const limit = parsePositiveInt(req.query.limit, 20, 100);
    const offset = (page - 1) * limit;

    const [rowsResult, countResult] = await Promise.all([
      runQuery(
        `
          SELECT export_id, actor_user_id, export_type, row_count,
                 filters, metadata, requested_at
          FROM admin_export_logs
          ORDER BY requested_at DESC
          LIMIT $1 OFFSET $2
        `,
        [limit, offset]
      ),
      runQuery("SELECT COUNT(*)::int AS total FROM admin_export_logs"),
    ]);

    const total = Number.parseInt(countResult.rows[0]?.total, 10) || 0;

    res.json({
      records: rowsResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    logger.error("[Admin] Export log query failed:", err);
    res
      .status(500)
      .json({ error: "Failed to fetch export logs", details: err.message });
  }
});

// ---------------------------------------------------------------------------
// Document / KYC Verification Routes
// ---------------------------------------------------------------------------

/**
 * @route   GET /admin/view-doc/:id
 * @desc    View a single document by ID
 * @access  Admin (read)
 */
router.get("/view-doc/:id", adminDocController.viewDocument);

/**
 * @route   GET /admin/verifications
 * @desc    List all pending verifications
 * @access  Admin (read)
 */
router.get("/verifications", adminDocController.listVerifications);

/**
 * @route   POST /admin/verifications/:id/review
 * @desc    Manually review a verification
 * @access  Admin (read)
 */
router.post("/verifications/:id/review", adminDocController.reviewVerification);

/**
 * @route   POST /admin/verifications/:id/auto-validate
 * @desc    Trigger auto-validation on a document
 * @access  Admin (read)
 */
router.post(
  "/verifications/:id/auto-validate",
  adminDocController.autoValidateDocument
);

/**
 * @route   GET /admin/kyc/queue
 * @desc    List KYC review queue items
 * @access  Admin (read)
 */
router.get("/kyc/queue", adminDocController.listKycReviewQueue);

/**
 * @route   POST /admin/kyc/queue/:queueId/review
 * @desc    Review a KYC queue item
 * @access  Admin (read)
 */
router.post("/kyc/queue/:queueId/review", adminDocController.reviewKycQueueItem);

// ---------------------------------------------------------------------------

module.exports = router;

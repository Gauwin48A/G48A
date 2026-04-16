const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const { requireRole } = require("../middleware/rbac");
const { protect } = require("../middleware/auth");
const { runQuery, getAuthUserId, parseOptionalString, parsePositiveInt } = require("../utils/dbHelpers");
const logger = require("../utils/logger");
const { getClientIP } = require("../services/auditLogger");

// ---------------------------------------------------------------------------
// Configuration constants
// ---------------------------------------------------------------------------
const DASHBOARD_DEFAULT_FLAGGED_LIMIT =
  Number.parseInt(process.env.ADMIN_DEFAULT_FLAGGED_LIMIT, 10) || 20;
const DASHBOARD_MAX_FLAGGED_LIMIT =
  Number.parseInt(process.env.ADMIN_MAX_FLAGGED_LIMIT, 10) || 100;
const DASHBOARD_DEFAULT_ACTIVITY_LIMIT =
  Number.parseInt(process.env.ADMIN_ACTIVITY_LIMIT, 10) || 20;
const DASHBOARD_MAX_EXPORT_ROWS =
  Number.parseInt(process.env.ADMIN_EXPORT_MAX_ROWS, 10) || 5e3;
const DASHBOARD_BULK_MAX_IDS =
  Number.parseInt(process.env.ADMIN_BULK_MAX_IDS, 10) || 500;

// ---------------------------------------------------------------------------
// Helper utilities
// ---------------------------------------------------------------------------

let dashboardSchemaReadyPromise = null;

/**
 * Normalise a sort-order string to either "ASC" or "DESC" (default).
 * @param {string} order
 * @returns {"ASC"|"DESC"}
 */
function getSafeOrder(order) {
  return String(order || "").trim().toUpperCase() === "ASC" ? "ASC" : "DESC";
}

/**
 * Extract the authenticated user ID from the request object.
 * @param {import('express').Request} req
 * @returns {string|null}
 */
function getRequestUserId(req) {
  return getAuthUserId(req);
}

/**
 * Escape a value for safe inclusion inside a CSV cell.
 * @param {*} value
 * @returns {string}
 */
function escapeCsvValue(value) {
  const normalized = value === undefined || value === null ? "" : String(value);
  return `"${normalized.replace(/"/g, '""')}"`;
}

/**
 * Build a full CSV string from an array of row objects and an ordered list of
 * header keys.
 * @param {Object[]} rows
 * @param {string[]} headers
 * @returns {string}
 */
function buildCsv(rows, headers) {
  const head = headers.join(",");
  const body = rows
    .map((row) => headers.map((header) => escapeCsvValue(row[header])).join(","))
    .join("\n");
  return `${head}\n${body}`;
}

/**
 * Format a timestamp into a human-readable relative time string.
 * @param {string|Date} timestamp
 * @returns {string}
 */
function formatRelativeTime(timestamp) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 60 * 1e3) return "just now";
  if (diffMs < 60 * 60 * 1e3) return `${Math.floor(diffMs / (60 * 1e3))}m ago`;
  if (diffMs < 24 * 60 * 60 * 1e3)
    return `${Math.floor(diffMs / (60 * 60 * 1e3))}h ago`;
  return `${Math.floor(diffMs / (24 * 60 * 60 * 1e3))}d ago`;
}

function isUndefinedTableError(error) {
  return String(error?.code || "").toUpperCase() === "42P01";
}

// ---------------------------------------------------------------------------
// Schema bootstrap
// ---------------------------------------------------------------------------

/**
 * Ensure required dashboard columns and tables exist. Runs once and caches the
 * result promise so subsequent calls are no-ops.
 * @returns {Promise<void>}
 */
async function ensureDashboardSchema() {
  if (!dashboardSchemaReadyPromise) {
    dashboardSchemaReadyPromise = (async () => {
      await runQuery(
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true`
      );
      await runQuery(
        `ALTER TABLE posts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'`
      );
      await runQuery(
        `ALTER TABLE posts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`
      );
      await runQuery(
        `ALTER TABLE posts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()`
      );
      await runQuery(`
        CREATE TABLE IF NOT EXISTS admin_moderation_actions (
          id BIGSERIAL PRIMARY KEY,
          request_id TEXT UNIQUE NOT NULL,
          actor_user_id TEXT NOT NULL,
          target_type TEXT NOT NULL,
          action TEXT NOT NULL,
          target_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
          affected_count INTEGER NOT NULL DEFAULT 0,
          details JSONB NOT NULL DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      await runQuery(
        `CREATE INDEX IF NOT EXISTS idx_admin_moderation_actions_created_at ON admin_moderation_actions(created_at DESC)`
      );
      await runQuery(
        `CREATE INDEX IF NOT EXISTS idx_posts_status_created_at ON posts(status, created_at DESC)`
      );
    })().catch((err) => {
      logger.warn("[AdminDashboard] Schema readiness update skipped", {
        message: err.message,
      });
      return false;
    });
  }
  return dashboardSchemaReadyPromise;
}

// ---------------------------------------------------------------------------
// Data-fetching helpers
// ---------------------------------------------------------------------------

/**
 * Fetch aggregate dashboard statistics (user counts, post counts, etc.).
 * @returns {Promise<Object>}
 */
async function fetchDashboardStats() {
  const result = await runQuery(`
    SELECT
      (SELECT COUNT(*)::int FROM users) AS total_users,
      (SELECT COUNT(*)::int FROM users WHERE created_at >= date_trunc('day', NOW())) AS today_signups,
      (SELECT COUNT(*)::int FROM posts) AS total_posts,
      (
        SELECT COUNT(*)::int
        FROM posts p
        WHERE LOWER(COALESCE(NULLIF(to_jsonb(p)->>'status', ''), 'active')) = 'flagged'
      ) AS flagged_posts,
      (
        SELECT COUNT(*)::int
        FROM users u
        WHERE COALESCE(u.is_active, true) = false
           OR LOWER(COALESCE(NULLIF(to_jsonb(u)->>'status', ''), 'active')) IN ('banned', 'restricted', 'suspended')
      ) AS restricted_users,
      (SELECT COUNT(*)::int FROM posts WHERE created_at >= date_trunc('day', NOW())) AS today_posts
  `);
  const row = result.rows[0] || {};
  return {
    totalUsers: Number(row.total_users) || 0,
    totalPosts: Number(row.total_posts) || 0,
    flaggedPosts: Number(row.flagged_posts) || 0,
    restrictedUsers: Number(row.restricted_users) || 0,
    todaySignups: Number(row.today_signups) || 0,
    todayPosts: Number(row.today_posts) || 0,
  };
}

/**
 * Fetch users who have been flagged, restricted, or have open complaints.
 * Falls back to a simpler query when the primary one fails (e.g. missing
 * tables).
 * @param {number} limit - Maximum rows to return.
 * @param {string|null} search - Optional search term for name/email/phone.
 * @returns {Promise<Object[]>}
 */
async function fetchFlaggedUsers(limit, search) {
  const params = [limit];
  let searchClause = "";
  if (search) {
    params.push(`%${search}%`);
    const idx = params.length;
    searchClause = `
      AND (
        COALESCE(NULLIF(to_jsonb(u)->>'full_name', ''), NULLIF(to_jsonb(u)->>'name', ''), NULLIF(to_jsonb(p)->>'full_name', ''), COALESCE(to_jsonb(u)->>'username', '')) ILIKE $${idx}
        OR COALESCE(to_jsonb(u)->>'email', '') ILIKE $${idx}
        OR COALESCE(NULLIF(to_jsonb(u)->>'phone', ''), NULLIF(to_jsonb(u)->>'phone_number', ''), NULLIF(to_jsonb(p)->>'phone', '')) ILIKE $${idx}
      )
    `;
  }

  const query = `
    WITH complaint_flags AS (
      SELECT
        COALESCE(c.seller_id::text, c.buyer_id::text) AS user_id,
        COUNT(*)::int AS flag_count,
        MAX(COALESCE(NULLIF(c.description, ''), NULLIF(c.complaint_type, ''), 'Complaint raised')) AS latest_reason
      FROM complaints c
      WHERE COALESCE(c.status, 'open') IN ('open', 'triage', 'investigating')
        AND COALESCE(c.seller_id::text, c.buyer_id::text) IS NOT NULL
      GROUP BY COALESCE(c.seller_id::text, c.buyer_id::text)
    ),
    post_totals AS (
      SELECT p.user_id::text AS user_id, COUNT(*)::int AS total_posts
      FROM posts p
      GROUP BY p.user_id::text
    ),
    sales_totals AS (
      SELECT t.seller_id::text AS user_id, COUNT(*)::int AS completed_sales
      FROM transactions t
      WHERE LOWER(COALESCE(t.status, '')) IN ('completed', 'verified', 'success')
      GROUP BY t.seller_id::text
    )
    SELECT
      u.user_id::text AS id,
      COALESCE(NULLIF(to_jsonb(u)->>'full_name', ''), NULLIF(to_jsonb(u)->>'name', ''), NULLIF(to_jsonb(p)->>'full_name', ''), COALESCE(to_jsonb(u)->>'username', 'User')) AS name,
      CASE
        WHEN COALESCE(u.is_active, true) = false OR LOWER(COALESCE(NULLIF(to_jsonb(u)->>'status', ''), 'active')) IN ('banned', 'restricted', 'suspended')
          THEN 'Restricted'
        WHEN COALESCE(cf.flag_count, 0) >= 3
          THEN 'Under Review'
        ELSE 'Flagged'
      END AS status,
      COALESCE(cf.flag_count, 0) AS "flagCount",
      COALESCE(to_jsonb(u)->>'email', '') AS email,
      COALESCE(NULLIF(to_jsonb(u)->>'phone', ''), NULLIF(to_jsonb(u)->>'phone_number', ''), NULLIF(to_jsonb(p)->>'phone', '')) AS phone,
      COALESCE(cf.latest_reason, 'Policy review triggered') AS reason,
      COALESCE(pt.total_posts, 0) AS "totalPosts",
      COALESCE(st.completed_sales, 0) AS "completedSales",
      TO_CHAR(COALESCE(u.created_at, NOW()), 'YYYY-MM-DD') AS "joinDate"
    FROM users u
    LEFT JOIN profiles p ON p.user_id::text = u.user_id::text
    LEFT JOIN complaint_flags cf ON cf.user_id = u.user_id::text
    LEFT JOIN post_totals pt ON pt.user_id = u.user_id::text
    LEFT JOIN sales_totals st ON st.user_id = u.user_id::text
    WHERE (
      COALESCE(cf.flag_count, 0) > 0
      OR COALESCE(u.is_active, true) = false
      OR LOWER(COALESCE(NULLIF(to_jsonb(u)->>'status', ''), 'active')) IN ('banned', 'restricted', 'suspended')
    )
    ${searchClause}
    ORDER BY COALESCE(cf.flag_count, 0) DESC, u.created_at DESC
    LIMIT $1
  `;

  try {
    const result = await runQuery(query, params);
    return result.rows;
  } catch (error) {
    logger.warn("[AdminDashboard] Flagged users query fallback", {
      message: error.message,
    });
    const fallback = await runQuery(
      `
        SELECT
          u.user_id::text AS id,
          COALESCE(NULLIF(to_jsonb(u)->>'full_name', ''), NULLIF(to_jsonb(u)->>'name', ''), COALESCE(to_jsonb(u)->>'username', 'User')) AS name,
          'Restricted' AS status,
          0 AS "flagCount",
          COALESCE(to_jsonb(u)->>'email', '') AS email,
          COALESCE(NULLIF(to_jsonb(u)->>'phone', ''), NULLIF(to_jsonb(u)->>'phone_number', '')) AS phone,
          'Account restricted' AS reason,
          0 AS "totalPosts",
          0 AS "completedSales",
          TO_CHAR(COALESCE(u.created_at, NOW()), 'YYYY-MM-DD') AS "joinDate"
        FROM users u
        WHERE COALESCE(u.is_active, true) = false
        ORDER BY u.created_at DESC
        LIMIT $1
      `,
      [limit]
    ).catch(() => ({ rows: [] }));
    return fallback.rows;
  }
}

/**
 * Fetch flagged (or filtered) posts with pagination metadata.
 * @param {Object} options
 * @param {number} [options.page=1]
 * @param {number} [options.limit]
 * @param {string} [options.status="flagged"]
 * @param {string|null} [options.search]
 * @param {string} [options.order="DESC"]
 * @returns {Promise<{posts: Object[], pagination: Object}>}
 */
async function fetchFlaggedPosts(options = {}) {
  const page = parsePositiveInt(options.page, 1);
  const limit = parsePositiveInt(
    options.limit,
    DASHBOARD_DEFAULT_FLAGGED_LIMIT,
    DASHBOARD_MAX_FLAGGED_LIMIT
  );
  const status = String(options.status || "flagged").trim().toLowerCase();
  const search = parseOptionalString(options.search);
  const order = getSafeOrder(options.order || "DESC");
  const offset = (page - 1) * limit;

  const params = [];
  const conditions = [];

  if (status && status !== "all") {
    params.push(status);
    conditions.push(
      `LOWER(COALESCE(NULLIF(to_jsonb(p)->>'status', ''), 'active')) = $${params.length}`
    );
  } else {
    conditions.push(
      `LOWER(COALESCE(NULLIF(to_jsonb(p)->>'status', ''), 'active')) = 'flagged'`
    );
  }

  if (search) {
    params.push(`%${search}%`);
    const idx = params.length;
    conditions.push(`
      (
        COALESCE(to_jsonb(p)->>'title', '') ILIKE $${idx}
        OR COALESCE(NULLIF(to_jsonb(p)->>'flag_reason', ''), NULLIF(to_jsonb(p)->>'reason', '')) ILIKE $${idx}
        OR COALESCE(to_jsonb(u)->>'username', '') ILIKE $${idx}
      )
    `);
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  const countResult = await runQuery(
    `
      SELECT COUNT(*)::int AS total
      FROM posts p
      LEFT JOIN users u ON u.user_id::text = p.user_id::text
      ${whereClause}
    `,
    params
  );
  const total = Number(countResult.rows[0]?.total) || 0;

  const dataParams = [...params, limit, offset];
  const result = await runQuery(
    `
      SELECT
        p.post_id::text AS id,
        COALESCE(to_jsonb(p)->>'title', 'Untitled post') AS title,
        LOWER(COALESCE(NULLIF(to_jsonb(p)->>'status', ''), 'active')) AS status,
        COALESCE(to_jsonb(p)->>'price', '0') AS price,
        COALESCE(NULLIF(to_jsonb(u)->>'full_name', ''), NULLIF(to_jsonb(u)->>'name', ''), NULLIF(to_jsonb(sp)->>'full_name', ''), COALESCE(to_jsonb(u)->>'username', 'Seller')) AS "sellerName",
        p.user_id::text AS "sellerId",
        COALESCE(NULLIF(to_jsonb(p)->>'flag_reason', ''), NULLIF(to_jsonb(p)->>'reason', ''), 'Flagged for moderation') AS reason,
        COALESCE(NULLIF(to_jsonb(p)->>'flagged_by', ''), 'system') AS "flaggedBy",
        CASE
          WHEN COALESCE(to_jsonb(p)->>'views_count', '') ~ '^[0-9]+$' THEN (to_jsonb(p)->>'views_count')::bigint
          ELSE 0
        END AS views,
        p.created_at
      FROM posts p
      LEFT JOIN users u ON u.user_id::text = p.user_id::text
      LEFT JOIN profiles sp ON sp.user_id::text = p.user_id::text
      ${whereClause}
      ORDER BY p.created_at ${order}
      LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}
    `,
    dataParams
  );

  return {
    posts: result.rows,
    pagination: {
      page: page,
      limit: limit,
      total: total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrevious: page > 1,
    },
  };
}

/**
 * Fetch recent admin-relevant activity from multiple sources (sign-ups,
 * post flags, KYC verifications) and merge them chronologically.
 * @param {number} limit - Maximum items to return.
 * @returns {Promise<Object[]>}
 */
async function fetchRecentActivity(limit) {
  const sourceLimit = Math.max(2, Math.ceil(limit / 3));

  const [signups, postFlags, verifications] = await Promise.all([
    runQuery(
      `
        SELECT
          u.created_at,
          'signup' AS type,
          'New user signup' AS action,
          COALESCE(NULLIF(to_jsonb(u)->>'full_name', ''), NULLIF(to_jsonb(u)->>'name', ''), COALESCE(to_jsonb(u)->>'username', 'User')) AS actor,
          COALESCE(to_jsonb(u)->>'email', '') AS details
        FROM users u
        ORDER BY u.created_at DESC
        LIMIT $1
      `,
      [sourceLimit]
    ).catch(() => ({ rows: [] })),

    runQuery(
      `
        SELECT
          p.created_at,
          'flag' AS type,
          'Post flagged for moderation' AS action,
          COALESCE(NULLIF(to_jsonb(u)->>'full_name', ''), NULLIF(to_jsonb(u)->>'name', ''), COALESCE(to_jsonb(u)->>'username', 'Seller')) AS actor,
          COALESCE(to_jsonb(p)->>'title', 'Untitled post') AS details
        FROM posts p
        LEFT JOIN users u ON u.user_id::text = p.user_id::text
        WHERE LOWER(COALESCE(NULLIF(to_jsonb(p)->>'status', ''), 'active')) = 'flagged'
        ORDER BY p.created_at DESC
        LIMIT $1
      `,
      [sourceLimit]
    ).catch(() => ({ rows: [] })),

    runQuery(
      `
        SELECT
          vd.created_at,
          'verification' AS type,
          'KYC verification submitted' AS action,
          COALESCE(NULLIF(to_jsonb(u)->>'full_name', ''), NULLIF(to_jsonb(u)->>'name', ''), COALESCE(to_jsonb(u)->>'username', 'User')) AS actor,
          COALESCE(NULLIF(vd.status, ''), 'pending') AS details
        FROM verification_documents vd
        LEFT JOIN users u ON u.user_id::text = vd.user_id::text
        ORDER BY vd.created_at DESC
        LIMIT $1
      `,
      [sourceLimit]
    ).catch(() => ({ rows: [] })),
  ]);

  const merged = [
    ...signups.rows,
    ...postFlags.rows,
    ...verifications.rows,
  ]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, limit);

  return merged.map((item) => ({
    type: item.type,
    action: item.action,
    user: item.actor,
    details: item.details,
    time: formatRelativeTime(item.created_at),
    created_at: item.created_at,
  }));
}

/**
 * Persist a moderation action to both the dedicated moderation log table and
 * the general audit_logs table. Failures are logged but do not throw.
 * @param {Object} params
 * @param {string} params.requestId
 * @param {string} params.actorUserId
 * @param {string} params.action
 * @param {string[]} params.targetIds
 * @param {number} params.affectedCount
 * @param {Object} params.details
 * @param {import('express').Request} params.req
 */
async function logModerationAction({
  requestId,
  actorUserId,
  action,
  targetIds,
  affectedCount,
  details,
  req,
}) {
  const metadata = {
    ip: getClientIP(req),
    user_agent: req.headers["user-agent"] || "unknown",
    ...details,
  };

  await runQuery(
    `
      INSERT INTO admin_moderation_actions
      (request_id, actor_user_id, target_type, action, target_ids, affected_count, details, created_at)
      VALUES ($1, $2, 'post', $3, $4::jsonb, $5, $6::jsonb, NOW())
    `,
    [
      requestId,
      actorUserId,
      action,
      JSON.stringify(targetIds),
      affectedCount,
      JSON.stringify(metadata),
    ]
  ).catch((err) => {
    logger.warn("[AdminDashboard] Failed to persist moderation action log", {
      requestId: requestId,
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
      "ADMIN_POST_BULK_ACTION",
      metadata.ip,
      metadata.user_agent,
      JSON.stringify({
        request_id: requestId,
        action: action,
        target_count: targetIds.length,
        affected_count: affectedCount,
        status_after: details.status_after,
        reason: details.reason || null,
      }),
    ]
  ).catch((err) => {
    logger.warn("[AdminDashboard] Failed to persist moderation audit log", {
      requestId: requestId,
      message: err.message,
    });
  });
}

// ---------------------------------------------------------------------------
// Middleware chains
// ---------------------------------------------------------------------------

/** Read-only dashboard access: admin, superadmin, moderator, risk, ops */
const requireDashboardRead = requireRole(
  "admin",
  "superadmin",
  "super_admin",
  "moderator",
  "risk",
  "ops"
);

/** Write/mutate dashboard access: admin, superadmin only */
const requireDashboardWrite = requireRole(
  "admin",
  "superadmin",
  "super_admin"
);

router.use(protect);
router.use(requireDashboardRead);

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

/**
 * @route   GET /
 * @desc    Retrieve the full admin dashboard summary including stats, flagged
 *          users, flagged posts, and recent activity.
 * @access  Protected + Dashboard-read roles
 */
router.get("/", async (req, res) => {
  try {
    await ensureDashboardSchema();

    const flaggedUserLimit = parsePositiveInt(
      req.query.flaggedUserLimit,
      DASHBOARD_DEFAULT_FLAGGED_LIMIT,
      DASHBOARD_MAX_FLAGGED_LIMIT
    );
    const flaggedPostLimit = parsePositiveInt(
      req.query.flaggedPostLimit,
      DASHBOARD_DEFAULT_FLAGGED_LIMIT,
      DASHBOARD_MAX_FLAGGED_LIMIT
    );
    const activityLimit = parsePositiveInt(
      req.query.activityLimit,
      DASHBOARD_DEFAULT_ACTIVITY_LIMIT,
      100
    );

    const [stats, flaggedUsers, flaggedPostsPayload, recentActivity] =
      await Promise.all([
        fetchDashboardStats(),
        fetchFlaggedUsers(
          flaggedUserLimit,
          parseOptionalString(req.query.userSearch)
        ),
        fetchFlaggedPosts({
          page: 1,
          limit: flaggedPostLimit,
          status: "flagged",
          search: parseOptionalString(req.query.postSearch),
        }),
        fetchRecentActivity(activityLimit),
      ]);

    res.json({
      stats: stats,
      flaggedUsers: flaggedUsers,
      flaggedPosts: flaggedPostsPayload.posts,
      recentActivity: recentActivity,
      pagination: { flaggedPosts: flaggedPostsPayload.pagination },
      message: "Admin dashboard data",
    });
  } catch (error) {
    logger.error("[AdminDashboard] Summary error:", error);
    res
      .status(500)
      .json({ error: "Failed to load dashboard" });
  }
});

/**
 * @route   GET /complaints/analytics
 * @desc    Complaint analytics for a rolling window (default 30 days).
 * @access  Protected + Dashboard-read roles
 */
router.get("/complaints/analytics", async (req, res) => {
  const windowDays = parsePositiveInt(
    req.query.window_days || req.query.windowDays,
    30,
    365
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
      [interval]
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
        []
      );
      riskRows = riskResult.rows || [];
    } catch (riskErr) {
      if (!isUndefinedTableError(riskErr)) {
        logger.warn("[AdminDashboard] Complaint risk analytics failed", {
          message: riskErr.message,
        });
      }
    }

    const activeRiskDecisions = riskRows.reduce((acc, row) => {
      const status = String(row.status || "unknown").toLowerCase();
      acc[status] = Number(row.count) || 0;
      acc.total += Number(row.count) || 0;
      return acc;
    }, { total: 0 });

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
    logger.error("[AdminDashboard] Complaint analytics error:", error);
    res.status(500).json({ error: "Failed to load complaint analytics" });
  }
});

/**
 * @route   GET /complaints/actions
 * @desc    Historical complaint-related audit log entries.
 * @access  Protected + Dashboard-read roles
 */
router.get("/complaints/actions", async (req, res) => {
  const limit = parsePositiveInt(req.query.limit, 50, 200);
  const offset = parsePositiveInt(req.query.offset, 0, DASHBOARD_MAX_EXPORT_ROWS);
  const actionFilter = parseOptionalString(req.query.action);

  try {
    const params = [limit, offset];
    let actionClause = "AND action IN ('COMPLAINT_RISK_DECISION','COMPLAINT_STATUS_UPDATE')";
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
      params
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
    logger.error("[AdminDashboard] Complaint action logs error:", error);
    res.status(500).json({ error: "Failed to load complaint action logs" });
  }
});

/**
 * @route   GET /flagged-posts
 * @desc    Paginated listing of flagged posts with optional search and
 *          status filtering.
 * @access  Protected + Dashboard-read roles
 */
router.get("/flagged-posts", async (req, res) => {
  try {
    await ensureDashboardSchema();

    const payload = await fetchFlaggedPosts({
      page: req.query.page,
      limit: req.query.limit,
      status: req.query.status,
      search: req.query.search,
      order: req.query.order,
    });

    res.json({
      posts: payload.posts,
      data: payload.posts,
      pagination: payload.pagination,
    });
  } catch (error) {
    logger.error("[AdminDashboard] Flagged posts query failed:", error);
    res.status(500).json({ error: "Failed to load flagged posts" });
  }
});

/**
 * @route   POST /flagged-posts/bulk-action
 * @desc    Apply a bulk moderation action (approve, remove, reflag, archive)
 *          to one or more flagged posts.
 * @access  Protected + Dashboard-write roles
 */
router.post(
  "/flagged-posts/bulk-action",
  requireDashboardWrite,
  async (req, res) => {
    try {
      await ensureDashboardSchema();

      const { postIds, action, reason } = req.body || {};
      const normalizedAction = String(action || "").trim().toLowerCase();

      if (!Array.isArray(postIds) || !postIds.length) {
        return res.status(400).json({ error: "postIds array required" });
      }
      if (postIds.length > DASHBOARD_BULK_MAX_IDS) {
        return res.status(400).json({
          error: `Bulk action exceeds max IDs (${DASHBOARD_BULK_MAX_IDS})`,
          max: DASHBOARD_BULK_MAX_IDS,
        });
      }

      const normalizedPostIds = [
        ...new Set(
          postIds
            .map((id) => String(id || "").trim())
            .filter(Boolean)
        ),
      ];
      if (!normalizedPostIds.length) {
        return res.status(400).json({ error: "No valid post IDs provided" });
      }

      const actionToStatus = {
        approve: "active",
        remove: "removed",
        reflag: "flagged",
        archive: "archived",
      };
      const targetStatus = actionToStatus[normalizedAction];
      if (!targetStatus) {
        return res.status(400).json({
          error:
            "Invalid action. Must be one of: approve, remove, reflag, archive",
        });
      }

      const result = await runQuery(
        `
        UPDATE posts
        SET status = $2,
            updated_at = NOW()
        WHERE post_id::text = ANY($1::text[])
        RETURNING post_id::text AS post_id
      `,
        [normalizedPostIds, targetStatus]
      );

      const affectedPostIds = result.rows
        .map((row) => String(row.post_id || "").trim())
        .filter(Boolean);

      const requestId = crypto.randomUUID();
      const actorUserId = getRequestUserId(req) || "unknown";

      await logModerationAction({
        requestId: requestId,
        actorUserId: actorUserId,
        action: normalizedAction,
        targetIds: normalizedPostIds,
        affectedCount: result.rowCount || 0,
        details: {
          status_after: targetStatus,
          reason: parseOptionalString(reason),
        },
        req: req,
      });

      return res.json({
        success: true,
        requestId: requestId,
        action: normalizedAction,
        statusAfter: targetStatus,
        affected: result.rowCount || 0,
        affectedPostIds: affectedPostIds,
      });
    } catch (error) {
      logger.error("[AdminDashboard] Post bulk action failed:", error);
      return res
        .status(500)
        .json({ error: "Failed to apply bulk action" });
    }
  }
);

/**
 * @route   GET /flagged-posts/export
 * @desc    Export flagged posts as a downloadable CSV file.
 * @access  Protected + Dashboard-write roles
 */
router.get(
  "/flagged-posts/export",
  requireDashboardWrite,
  async (req, res) => {
    try {
      await ensureDashboardSchema();

      const exportLimit = parsePositiveInt(
        req.query.export_limit || req.query.limit,
        DASHBOARD_MAX_EXPORT_ROWS,
        DASHBOARD_MAX_EXPORT_ROWS
      );

      const payload = await fetchFlaggedPosts({
        page: 1,
        limit: exportLimit,
        status: req.query.status,
        search: req.query.search,
        order: req.query.order,
      });

      const rows = payload.posts.map((row) => ({
        id: row.id,
        title: row.title,
        status: row.status,
        price: row.price,
        sellerName: row.sellerName,
        sellerId: row.sellerId,
        reason: row.reason,
        flaggedBy: row.flaggedBy,
        views: row.views,
        created_at: row.created_at,
      }));

      const csv = buildCsv(rows, [
        "id",
        "title",
        "status",
        "price",
        "sellerName",
        "sellerId",
        "reason",
        "flaggedBy",
        "views",
        "created_at",
      ]);

      const dateSuffix = new Date().toISOString().slice(0, 10);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=flagged_posts_export_${dateSuffix}.csv`
      );
      res.setHeader("X-Exported-Rows", String(rows.length));
      res.send(csv);
    } catch (error) {
      logger.error("[AdminDashboard] Flagged posts export failed:", error);
      res.status(500).json({
        error: "Failed to export flagged posts",
      });
    }
  }
);

/**
 * @route   GET /verifications
 * @desc    Paginated list of pending KYC verification documents.
 * @access  Protected + Dashboard-read roles
 */
router.get("/verifications", async (req, res) => {
  try {
    const page = parsePositiveInt(req.query.page, 1);
    const limit = parsePositiveInt(req.query.limit, 50, 200);
    const offset = (page - 1) * limit;

    const result = await runQuery(
      `
        SELECT
          COUNT(*) OVER()::int AS total_count,
          vd.document_id,
          vd.user_id,
          vd.document_type,
          vd.filename,
          vd.original_name,
          vd.file_size,
          vd.status,
          vd.reviewed_by,
          vd.review_notes,
          vd.reviewed_at,
          vd.created_at,
          u.username,
          u.email
        FROM verification_documents vd
        JOIN users u ON vd.user_id::text = u.user_id::text
        WHERE vd.status = 'pending'
        ORDER BY vd.created_at ASC
        LIMIT $1 OFFSET $2
      `,
      [limit, offset]
    );

    const total = result.rows.length
      ? Number(result.rows[0].total_count) || 0
      : 0;
    const verifications = result.rows.map(
      ({ total_count, ...row }) => row
    );

    res.json({
      verifications: verifications,
      total: total,
      page: page,
      limit: limit,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to load verifications" });
  }
});

/**
 * @route   POST /verifications/:id
 * @desc    Approve or reject a specific verification document. When approved
 *          the associated user is also marked as verified.
 * @access  Protected + Dashboard-write roles
 */
router.post(
  "/verifications/:id",
  requireDashboardWrite,
  async (req, res) => {
    const { id } = req.params;
    const { action, notes } = req.body;
    const adminId = getRequestUserId(req);

    if (!["approve", "reject"].includes(String(action || "").toLowerCase())) {
      return res
        .status(400)
        .json({ error: "Invalid action. Must be approve or reject." });
    }

    try {
      const status =
        String(action).toLowerCase() === "approve" ? "approved" : "rejected";

      await runQuery(
        `
        UPDATE verification_documents
        SET status = $1,
            reviewed_by = $2,
            review_notes = $3,
            reviewed_at = NOW()
        WHERE document_id::text = $4
      `,
        [status, adminId, notes || "", id]
      );

      if (status === "approved") {
        const doc = await runQuery(
          "SELECT user_id::text AS user_id FROM verification_documents WHERE document_id::text = $1",
          [id]
        );
        if (doc.rows[0]) {
          await runQuery(
            "UPDATE users SET is_verified = true WHERE user_id::text = $1",
            [doc.rows[0].user_id]
          );
        }
      }

      res.json({ success: true, status: status });
    } catch (error) {
      res.status(500).json({ error: "Failed to update verification" });
    }
  }
);

module.exports = router;

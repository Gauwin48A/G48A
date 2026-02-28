const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { requireRole } = require('../middleware/rbac');
const { protect } = require('../middleware/auth');
const pool = require('../config/db');
const logger = require('../utils/logger');
const { getClientIP } = require('../services/auditLogger');

const DB_QUERY_TIMEOUT_MS = Number.parseInt(process.env.DB_QUERY_TIMEOUT_MS, 10) || 10000;
const DASHBOARD_DEFAULT_FLAGGED_LIMIT = Number.parseInt(process.env.ADMIN_DEFAULT_FLAGGED_LIMIT, 10) || 20;
const DASHBOARD_MAX_FLAGGED_LIMIT = Number.parseInt(process.env.ADMIN_MAX_FLAGGED_LIMIT, 10) || 100;
const DASHBOARD_DEFAULT_ACTIVITY_LIMIT = Number.parseInt(process.env.ADMIN_ACTIVITY_LIMIT, 10) || 20;
const DASHBOARD_MAX_EXPORT_ROWS = Number.parseInt(process.env.ADMIN_EXPORT_MAX_ROWS, 10) || 5000;
const DASHBOARD_BULK_MAX_IDS = Number.parseInt(process.env.ADMIN_BULK_MAX_IDS, 10) || 500;

let dashboardSchemaReadyPromise = null;

function runQuery(text, values = []) {
  return pool.query({
    text,
    values,
    query_timeout: DB_QUERY_TIMEOUT_MS
  });
}

function parseOptionalString(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized.length ? normalized : null;
}

function parsePositiveInt(value, fallback, max = Number.MAX_SAFE_INTEGER) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

function getSafeOrder(order) {
  return String(order || '').trim().toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
}

function getRequestUserId(req) {
  return parseOptionalString(req.user?.user_id || req.user?.userId || req.user?.id);
}

function escapeCsvValue(value) {
  const normalized = value === undefined || value === null ? '' : String(value);
  return `"${normalized.replace(/"/g, '""')}"`;
}

function buildCsv(rows, headers) {
  const head = headers.join(',');
  const body = rows.map((row) => headers.map((header) => escapeCsvValue(row[header])).join(',')).join('\n');
  return `${head}\n${body}`;
}

function formatRelativeTime(timestamp) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';

  const diffMs = Date.now() - date.getTime();
  if (diffMs < 60 * 1000) return 'just now';
  if (diffMs < 60 * 60 * 1000) return `${Math.floor(diffMs / (60 * 1000))}m ago`;
  if (diffMs < 24 * 60 * 60 * 1000) return `${Math.floor(diffMs / (60 * 60 * 1000))}h ago`;
  return `${Math.floor(diffMs / (24 * 60 * 60 * 1000))}d ago`;
}

async function ensureDashboardSchema() {
  if (!dashboardSchemaReadyPromise) {
    dashboardSchemaReadyPromise = (async () => {
      await runQuery(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true`);
      await runQuery(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'`);
      await runQuery(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`);
      await runQuery(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()`);

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

      await runQuery(`CREATE INDEX IF NOT EXISTS idx_admin_moderation_actions_created_at ON admin_moderation_actions(created_at DESC)`);
      await runQuery(`CREATE INDEX IF NOT EXISTS idx_posts_status_created_at ON posts(status, created_at DESC)`);
    })().catch((err) => {
      logger.warn('[AdminDashboard] Schema readiness update skipped', { message: err.message });
      return false;
    });
  }

  return dashboardSchemaReadyPromise;
}

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
    todayPosts: Number(row.today_posts) || 0
  };
}

async function fetchFlaggedUsers(limit, search) {
  const params = [limit];
  let searchClause = '';

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
    logger.warn('[AdminDashboard] Flagged users query fallback', { message: error.message });

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

async function fetchFlaggedPosts(options = {}) {
  const page = parsePositiveInt(options.page, 1);
  const limit = parsePositiveInt(options.limit, DASHBOARD_DEFAULT_FLAGGED_LIMIT, DASHBOARD_MAX_FLAGGED_LIMIT);
  const status = String(options.status || 'flagged').trim().toLowerCase();
  const search = parseOptionalString(options.search);
  const order = getSafeOrder(options.order || 'DESC');
  const offset = (page - 1) * limit;

  const params = [];
  const conditions = [];

  if (status && status !== 'all') {
    params.push(status);
    conditions.push(`LOWER(COALESCE(NULLIF(to_jsonb(p)->>'status', ''), 'active')) = $${params.length}`);
  } else {
    conditions.push(`LOWER(COALESCE(NULLIF(to_jsonb(p)->>'status', ''), 'active')) = 'flagged'`);
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

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

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
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrevious: page > 1
    }
  };
}

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
    ).catch(() => ({ rows: [] }))
  ]);

  const merged = [
    ...signups.rows,
    ...postFlags.rows,
    ...verifications.rows
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, limit);

  return merged.map((item) => ({
    type: item.type,
    action: item.action,
    user: item.actor,
    details: item.details,
    time: formatRelativeTime(item.created_at),
    created_at: item.created_at
  }));
}

async function logModerationAction({
  requestId,
  actorUserId,
  action,
  targetIds,
  affectedCount,
  details,
  req
}) {
  const metadata = {
    ip: getClientIP(req),
    user_agent: req.headers['user-agent'] || 'unknown',
    ...details
  };

  await runQuery(
    `
      INSERT INTO admin_moderation_actions
      (request_id, actor_user_id, target_type, action, target_ids, affected_count, details, created_at)
      VALUES ($1, $2, 'post', $3, $4::jsonb, $5, $6::jsonb, NOW())
    `,
    [requestId, actorUserId, action, JSON.stringify(targetIds), affectedCount, JSON.stringify(metadata)]
  ).catch((err) => {
    logger.warn('[AdminDashboard] Failed to persist moderation action log', { requestId, message: err.message });
  });

  await runQuery(
    `
      INSERT INTO audit_logs (user_id, action, ip_address, user_agent, details, created_at)
      VALUES ($1, $2, $3, $4, $5::jsonb, NOW())
    `,
    [actorUserId, 'ADMIN_POST_BULK_ACTION', metadata.ip, metadata.user_agent, JSON.stringify({
      request_id: requestId,
      action,
      target_count: targetIds.length,
      affected_count: affectedCount,
      status_after: details.status_after,
      reason: details.reason || null
    })]
  ).catch((err) => {
    logger.warn('[AdminDashboard] Failed to persist moderation audit log', { requestId, message: err.message });
  });
}

const requireDashboardRead = requireRole('admin', 'superadmin', 'moderator', 'risk', 'ops');
const requireDashboardWrite = requireRole('admin', 'superadmin');

// All admin dashboard routes require authentication + admin visibility role
router.use(protect);
router.use(requireDashboardRead);

// Admin dashboard summary contract
router.get('/', async (req, res) => {
  try {
    await ensureDashboardSchema();

    const flaggedUserLimit = parsePositiveInt(req.query.flaggedUserLimit, DASHBOARD_DEFAULT_FLAGGED_LIMIT, DASHBOARD_MAX_FLAGGED_LIMIT);
    const flaggedPostLimit = parsePositiveInt(req.query.flaggedPostLimit, DASHBOARD_DEFAULT_FLAGGED_LIMIT, DASHBOARD_MAX_FLAGGED_LIMIT);
    const activityLimit = parsePositiveInt(req.query.activityLimit, DASHBOARD_DEFAULT_ACTIVITY_LIMIT, 100);

    const [stats, flaggedUsers, flaggedPostsPayload, recentActivity] = await Promise.all([
      fetchDashboardStats(),
      fetchFlaggedUsers(flaggedUserLimit, parseOptionalString(req.query.userSearch)),
      fetchFlaggedPosts({
        page: 1,
        limit: flaggedPostLimit,
        status: 'flagged',
        search: parseOptionalString(req.query.postSearch)
      }),
      fetchRecentActivity(activityLimit)
    ]);

    res.json({
      stats,
      flaggedUsers,
      flaggedPosts: flaggedPostsPayload.posts,
      recentActivity,
      pagination: {
        flaggedPosts: flaggedPostsPayload.pagination
      },
      message: 'Admin dashboard data'
    });
  } catch (error) {
    logger.error('[AdminDashboard] Summary error:', error);
    res.status(500).json({ error: 'Failed to load dashboard', details: error.message });
  }
});

// Get flagged posts with filters + pagination
router.get('/flagged-posts', async (req, res) => {
  try {
    await ensureDashboardSchema();
    const payload = await fetchFlaggedPosts({
      page: req.query.page,
      limit: req.query.limit,
      status: req.query.status,
      search: req.query.search,
      order: req.query.order
    });

    res.json({
      posts: payload.posts,
      data: payload.posts,
      pagination: payload.pagination
    });
  } catch (error) {
    logger.error('[AdminDashboard] Flagged posts query failed:', error);
    res.status(500).json({ error: 'Failed to load flagged posts' });
  }
});

// Bulk moderation for posts
router.post('/flagged-posts/bulk-action', requireDashboardWrite, async (req, res) => {
  try {
    await ensureDashboardSchema();
    const { postIds, action, reason } = req.body || {};
    const normalizedAction = String(action || '').trim().toLowerCase();

    if (!Array.isArray(postIds) || !postIds.length) {
      return res.status(400).json({ error: 'postIds array required' });
    }

    if (postIds.length > DASHBOARD_BULK_MAX_IDS) {
      return res.status(400).json({
        error: `Bulk action exceeds max IDs (${DASHBOARD_BULK_MAX_IDS})`,
        max: DASHBOARD_BULK_MAX_IDS
      });
    }

    const normalizedPostIds = [...new Set(
      postIds
        .map((id) => String(id || '').trim())
        .filter(Boolean)
    )];

    if (!normalizedPostIds.length) {
      return res.status(400).json({ error: 'No valid post IDs provided' });
    }

    const actionToStatus = {
      approve: 'active',
      remove: 'removed',
      reflag: 'flagged',
      archive: 'archived'
    };

    const targetStatus = actionToStatus[normalizedAction];
    if (!targetStatus) {
      return res.status(400).json({
        error: 'Invalid action. Must be one of: approve, remove, reflag, archive'
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

    const affectedPostIds = result.rows.map((row) => String(row.post_id || '').trim()).filter(Boolean);
    const requestId = crypto.randomUUID();
    const actorUserId = getRequestUserId(req) || 'unknown';

    await logModerationAction({
      requestId,
      actorUserId,
      action: normalizedAction,
      targetIds: normalizedPostIds,
      affectedCount: result.rowCount || 0,
      details: {
        status_after: targetStatus,
        reason: parseOptionalString(reason)
      },
      req
    });

    return res.json({
      success: true,
      requestId,
      action: normalizedAction,
      statusAfter: targetStatus,
      affected: result.rowCount || 0,
      affectedPostIds
    });
  } catch (error) {
    logger.error('[AdminDashboard] Post bulk action failed:', error);
    return res.status(500).json({ error: 'Failed to apply bulk action', details: error.message });
  }
});

// Export flagged posts to CSV
router.get('/flagged-posts/export', requireDashboardWrite, async (req, res) => {
  try {
    await ensureDashboardSchema();

    const exportLimit = parsePositiveInt(req.query.export_limit || req.query.limit, DASHBOARD_MAX_EXPORT_ROWS, DASHBOARD_MAX_EXPORT_ROWS);
    const payload = await fetchFlaggedPosts({
      page: 1,
      limit: exportLimit,
      status: req.query.status,
      search: req.query.search,
      order: req.query.order
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
      created_at: row.created_at
    }));

    const csv = buildCsv(rows, ['id', 'title', 'status', 'price', 'sellerName', 'sellerId', 'reason', 'flaggedBy', 'views', 'created_at']);

    const dateSuffix = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=flagged_posts_export_${dateSuffix}.csv`);
    res.setHeader('X-Exported-Rows', String(rows.length));
    res.send(csv);
  } catch (error) {
    logger.error('[AdminDashboard] Flagged posts export failed:', error);
    res.status(500).json({ error: 'Failed to export flagged posts', details: error.message });
  }
});

// Get pending verifications
router.get('/verifications', async (req, res) => {
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

    const total = result.rows.length ? Number(result.rows[0].total_count) || 0 : 0;
    const verifications = result.rows.map(({ total_count, ...row }) => row);

    res.json({
      verifications,
      total,
      page,
      limit
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load verifications' });
  }
});

// Approve/reject verification
router.post('/verifications/:id', requireDashboardWrite, async (req, res) => {
  const { id } = req.params;
  const { action, notes } = req.body;
  const adminId = getRequestUserId(req);

  if (!['approve', 'reject'].includes(String(action || '').toLowerCase())) {
    return res.status(400).json({ error: 'Invalid action. Must be approve or reject.' });
  }

  try {
    const status = String(action).toLowerCase() === 'approve' ? 'approved' : 'rejected';

    await runQuery(
      `
        UPDATE verification_documents
        SET status = $1,
            reviewed_by = $2,
            review_notes = $3,
            reviewed_at = NOW()
        WHERE document_id::text = $4
      `,
      [status, adminId, notes || '', id]
    );

    if (status === 'approved') {
      const doc = await runQuery('SELECT user_id::text AS user_id FROM verification_documents WHERE document_id::text = $1', [id]);
      if (doc.rows[0]) {
        await runQuery('UPDATE users SET is_verified = true WHERE user_id::text = $1', [doc.rows[0].user_id]);
      }
    }

    res.json({ success: true, status });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update verification' });
  }
});

module.exports = router;

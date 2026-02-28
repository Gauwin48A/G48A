/**
 * Admin Routes
 * Contract-aligned user moderation APIs with filtering, bulk actions, CSV export, and audit traces.
 */

const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const adminDocController = require('../controllers/adminDocController');
const pool = require('../config/db');
const logger = require('../utils/logger');
const { getClientIP } = require('../services/auditLogger');

const DB_QUERY_TIMEOUT_MS = Number.parseInt(process.env.DB_QUERY_TIMEOUT_MS, 10) || 10000;
const ADMIN_DEFAULT_USER_LIMIT = Number.parseInt(process.env.ADMIN_DEFAULT_USER_LIMIT, 10) || 20;
const ADMIN_MAX_USER_LIMIT = Number.parseInt(process.env.ADMIN_MAX_USER_LIMIT, 10) || 100;
const ADMIN_BULK_MAX_IDS = Number.parseInt(process.env.ADMIN_BULK_MAX_IDS, 10) || 500;
const ADMIN_EXPORT_MAX_ROWS = Number.parseInt(process.env.ADMIN_EXPORT_MAX_ROWS, 10) || 5000;

const USER_SORT_MAP = {
  created_at: 'u.created_at',
  full_name: "COALESCE(NULLIF(to_jsonb(u)->>'full_name', ''), NULLIF(to_jsonb(u)->>'name', ''), NULLIF(to_jsonb(p)->>'full_name', ''), COALESCE(to_jsonb(u)->>'username', ''))",
  email: "COALESCE(to_jsonb(u)->>'email', '')",
  tier: "COALESCE(NULLIF(to_jsonb(u)->>'tier', ''), NULLIF(to_jsonb(u)->>'tier_plan', ''), 'basic')",
  role: "COALESCE(NULLIF(to_jsonb(u)->>'role', ''), 'user')",
  last_login: 'u.last_login',
  trust_score: 'COALESCE(p.trust_score, 0)'
};

const ALLOWED_ROLE_VALUES = new Set(['user', 'admin', 'moderator', 'superadmin', 'risk', 'ops']);
const ALLOWED_TIER_VALUES = new Set(['basic', 'silver', 'premium', 'bronze', 'gold', 'platinum']);

let adminSchemaReadyPromise = null;

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
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  return Math.min(parsed, max);
}

function parseOptionalBoolean(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
  if (normalized === 'false' || normalized === '0' || normalized === 'no') return false;
  return null;
}

function parseOptionalDate(value) {
  const normalized = parseOptionalString(value);
  if (!normalized) return null;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function parseOptionalNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getRequestUserId(req) {
  return parseOptionalString(req.user?.user_id || req.user?.userId || req.user?.id);
}

function getSafeSort(sortBy) {
  const normalized = String(sortBy || '').trim().toLowerCase();
  return USER_SORT_MAP[normalized] || USER_SORT_MAP.created_at;
}

function getSafeOrder(order) {
  return String(order || '').trim().toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
}

function escapeCsvValue(value) {
  const normalized = value === undefined || value === null ? '' : String(value);
  return `"${normalized.replace(/"/g, '""')}"`;
}

function buildCsv(rows, headers) {
  const head = headers.map((header) => header.key).join(',');
  const body = rows.map((row) => headers.map((header) => escapeCsvValue(row[header.key])).join(',')).join('\n');
  return `${head}\n${body}`;
}

function normalizeUserFilters(query = {}) {
  return {
    page: parsePositiveInt(query.page, 1),
    limit: parsePositiveInt(query.limit, ADMIN_DEFAULT_USER_LIMIT, ADMIN_MAX_USER_LIMIT),
    search: parseOptionalString(query.search),
    role: parseOptionalString(query.role)?.toLowerCase() || null,
    tier: parseOptionalString(query.tier)?.toLowerCase() || null,
    status: parseOptionalString(query.status)?.toLowerCase() || null,
    sortBy: parseOptionalString(query.sort || query.sortBy || 'created_at')?.toLowerCase() || 'created_at',
    order: getSafeOrder(query.order),
    createdFrom: parseOptionalDate(query.created_from || query.createdFrom),
    createdTo: parseOptionalDate(query.created_to || query.createdTo),
    minTrustScore: parseOptionalNumber(query.min_trust_score || query.minTrustScore),
    emailVerified: parseOptionalBoolean(query.email_verified ?? query.emailVerified),
    phoneVerified: parseOptionalBoolean(query.phone_verified ?? query.phoneVerified),
    isActive: parseOptionalBoolean(query.is_active ?? query.isActive),
    kycStatus: parseOptionalString(query.kyc_status || query.kycStatus)?.toUpperCase() || null
  };
}

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
    conditions.push(`LOWER(COALESCE(NULLIF(to_jsonb(u)->>'role', ''), 'user')) = $${params.length}`);
  }

  if (filters.tier) {
    params.push(filters.tier);
    conditions.push(`LOWER(COALESCE(NULLIF(to_jsonb(u)->>'tier', ''), NULLIF(to_jsonb(u)->>'tier_plan', ''), 'basic')) = $${params.length}`);
  }

  if (filters.status === 'active') {
    conditions.push('COALESCE(u.is_active, true) = true');
  } else if (['inactive', 'restricted', 'suspended', 'banned'].includes(filters.status || '')) {
    conditions.push('COALESCE(u.is_active, true) = false');
  }

  if (typeof filters.isActive === 'boolean') {
    params.push(filters.isActive);
    conditions.push(`COALESCE(u.is_active, true) = $${params.length}`);
  }

  if (filters.kycStatus) {
    params.push(filters.kycStatus);
    conditions.push(`UPPER(COALESCE(NULLIF(to_jsonb(u)->>'aadhaar_status', ''), 'PENDING')) = $${params.length}`);
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

  if (typeof filters.emailVerified === 'boolean') {
    params.push(filters.emailVerified ? 'true' : 'false');
    conditions.push(`LOWER(COALESCE(to_jsonb(u)->>'email_verified', 'false')) = $${params.length}`);
  }

  if (typeof filters.phoneVerified === 'boolean') {
    params.push(filters.phoneVerified ? 'true' : 'false');
    conditions.push(`LOWER(COALESCE(to_jsonb(u)->>'phone_verified', 'false')) = $${params.length}`);
  }

  return conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
}

async function ensureAdminSchema() {
  if (!adminSchemaReadyPromise) {
    adminSchemaReadyPromise = (async () => {
      await runQuery(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user'`);
      await runQuery(`ALTER TABLE users ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'basic'`);
      await runQuery(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true`);
      await runQuery(`ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`);
      await runQuery(`ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()`);
      await runQuery(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ`);

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

      await runQuery(`CREATE INDEX IF NOT EXISTS idx_admin_bulk_action_logs_created_at ON admin_bulk_action_logs(created_at DESC)`);
      await runQuery(`CREATE INDEX IF NOT EXISTS idx_admin_export_logs_requested_at ON admin_export_logs(requested_at DESC)`);
    })().catch((err) => {
      logger.warn('[Admin] Schema readiness update skipped', { message: err.message });
      return false;
    });
  }

  return adminSchemaReadyPromise;
}

async function logBulkAction({
  requestId,
  actorUserId,
  action,
  value,
  reason,
  targetUserIds,
  affectedCount,
  req
}) {
  const metadata = {
    ip: getClientIP(req),
    user_agent: req.headers['user-agent'] || 'unknown',
    reason: reason || null
  };

  await runQuery(
    `
      INSERT INTO admin_bulk_action_logs
      (request_id, actor_user_id, action, value, reason, target_user_ids, affected_count, metadata, created_at)
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8::jsonb, NOW())
    `,
    [requestId, actorUserId, action, value || null, reason || null, JSON.stringify(targetUserIds), affectedCount, JSON.stringify(metadata)]
  ).catch((err) => {
    logger.warn('[Admin] Failed to persist bulk action log', { requestId, message: err.message });
  });

  await runQuery(
    `
      INSERT INTO audit_logs (user_id, action, ip_address, user_agent, details, created_at)
      VALUES ($1, $2, $3, $4, $5::jsonb, NOW())
    `,
    [actorUserId, 'ADMIN_USER_BULK_ACTION', metadata.ip, metadata.user_agent, JSON.stringify({
      request_id: requestId,
      action,
      value: value || null,
      reason: reason || null,
      target_count: targetUserIds.length,
      affected_count: affectedCount
    })]
  ).catch((err) => {
    logger.warn('[Admin] Failed to persist audit log for bulk action', { requestId, message: err.message });
  });
}

async function fetchUsersByFilters(filters, opts = {}) {
  const params = [];
  const whereClause = buildUserWhereClause(filters, params);
  const safeSort = getSafeSort(filters.sortBy);
  const safeOrder = getSafeOrder(filters.order);
  const pageNumber = parsePositiveInt(filters.page, 1);
  const limitNumber = parsePositiveInt(filters.limit, ADMIN_DEFAULT_USER_LIMIT, ADMIN_MAX_USER_LIMIT);
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

  const useLimit = opts.limitOverride !== undefined ? opts.limitOverride : limitNumber;
  const useOffset = opts.offsetOverride !== undefined ? opts.offsetOverride : offset;
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

  return {
    rows: rowsResult.rows,
    total,
    page: pageNumber,
    limit: limitNumber
  };
}

async function exportUsersHandler(req, res) {
  try {
    await ensureAdminSchema();
    const filters = normalizeUserFilters(req.query);
    const exportLimit = parsePositiveInt(req.query.export_limit || req.query.limit, ADMIN_EXPORT_MAX_ROWS, ADMIN_EXPORT_MAX_ROWS);
    filters.page = 1;
    filters.limit = exportLimit;

    const { rows, total } = await fetchUsersByFilters(filters, {
      limitOverride: exportLimit,
      offsetOverride: 0
    });

    const headers = [
      { key: 'user_id' },
      { key: 'full_name' },
      { key: 'email' },
      { key: 'username' },
      { key: 'phone' },
      { key: 'role' },
      { key: 'tier' },
      { key: 'is_active' },
      { key: 'email_verified' },
      { key: 'phone_verified' },
      { key: 'kyc_status' },
      { key: 'trust_score' },
      { key: 'created_at' },
      { key: 'last_login' }
    ];
    const csv = buildCsv(rows, headers);

    const actorUserId = getRequestUserId(req);
    const exportId = crypto.randomUUID();
    const metadata = {
      ip: getClientIP(req),
      user_agent: req.headers['user-agent'] || 'unknown',
      requested_total: total
    };

    await runQuery(
      `
        INSERT INTO admin_export_logs
        (export_id, actor_user_id, export_type, row_count, filters, metadata, requested_at)
        VALUES ($1, $2, 'users_csv', $3, $4::jsonb, $5::jsonb, NOW())
      `,
      [exportId, actorUserId || 'unknown', rows.length, JSON.stringify(filters), JSON.stringify(metadata)]
    ).catch((err) => {
      logger.warn('[Admin] Failed to persist export log', { exportId, message: err.message });
    });

    await runQuery(
      `
        INSERT INTO audit_logs (user_id, action, ip_address, user_agent, details, created_at)
        VALUES ($1, $2, $3, $4, $5::jsonb, NOW())
      `,
      [actorUserId, 'ADMIN_USERS_EXPORT', metadata.ip, metadata.user_agent, JSON.stringify({
        export_id: exportId,
        exported_rows: rows.length,
        requested_total: total,
        filters
      })]
    ).catch((err) => {
      logger.warn('[Admin] Failed to persist export audit log', { exportId, message: err.message });
    });

    const dateSuffix = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=users_export_${dateSuffix}.csv`);
    res.setHeader('X-Export-Id', exportId);
    res.setHeader('X-Exported-Rows', String(rows.length));
    res.send(csv);
  } catch (err) {
    logger.error('[Admin] Export users error:', err);
    res.status(500).json({ error: 'Export failed', details: err.message });
  }
}

const requireAdminRead = requireRole('admin', 'superadmin', 'moderator', 'risk', 'ops');
const requireAdminWrite = requireRole('admin', 'superadmin');

// All routes require authentication and admin-like visibility role.
router.use(protect);
router.use(requireAdminRead);

// GET /admin/users - paginated user listing with advanced filters
router.get('/users', async (req, res) => {
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
        kyc_status: filters.kycStatus
      },
      sort: { by: filters.sortBy, order: filters.order },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrevious: page > 1
      }
    });
  } catch (err) {
    logger.error('[Admin] Get users error:', err);
    res.status(500).json({ error: 'Failed to fetch users', details: err.message });
  }
});

// POST /admin/users/bulk-action - suspend/unsuspend/change-role/change-tier
router.post('/users/bulk-action', requireAdminWrite, async (req, res) => {
  try {
    await ensureAdminSchema();
    const { userIds, action, value, reason } = req.body || {};
    const normalizedAction = String(action || '').trim().toLowerCase();

    if (!Array.isArray(userIds) || !userIds.length) {
      return res.status(400).json({ error: 'userIds array required' });
    }

    if (userIds.length > ADMIN_BULK_MAX_IDS) {
      return res.status(400).json({
        error: `Bulk action exceeds max IDs (${ADMIN_BULK_MAX_IDS})`,
        max: ADMIN_BULK_MAX_IDS
      });
    }

    const normalizedUserIds = [...new Set(
      userIds
        .map((id) => String(id || '').trim())
        .filter(Boolean)
    )];

    if (!normalizedUserIds.length) {
      return res.status(400).json({ error: 'No valid user IDs provided' });
    }

    let queryText = null;
    let queryParams = [normalizedUserIds];
    let normalizedValue = null;

    if (normalizedAction === 'change-role') {
      normalizedValue = String(value || '').trim().toLowerCase();
      if (!ALLOWED_ROLE_VALUES.has(normalizedValue)) {
        return res.status(400).json({ error: `Invalid role value. Allowed: ${[...ALLOWED_ROLE_VALUES].join(', ')}` });
      }
      queryText = `
        UPDATE users
        SET role = $2, updated_at = NOW()
        WHERE user_id::text = ANY($1::text[])
        RETURNING user_id::text AS user_id
      `;
      queryParams = [normalizedUserIds, normalizedValue];
    } else if (normalizedAction === 'change-tier') {
      normalizedValue = String(value || '').trim().toLowerCase();
      if (!ALLOWED_TIER_VALUES.has(normalizedValue)) {
        return res.status(400).json({ error: `Invalid tier value. Allowed: ${[...ALLOWED_TIER_VALUES].join(', ')}` });
      }
      queryText = `
        UPDATE users
        SET tier = $2, updated_at = NOW()
        WHERE user_id::text = ANY($1::text[])
        RETURNING user_id::text AS user_id
      `;
      queryParams = [normalizedUserIds, normalizedValue];
    } else if (normalizedAction === 'suspend' || normalizedAction === 'deactivate') {
      queryText = `
        UPDATE users
        SET is_active = false, updated_at = NOW()
        WHERE user_id::text = ANY($1::text[])
        RETURNING user_id::text AS user_id
      `;
    } else if (normalizedAction === 'unsuspend' || normalizedAction === 'activate') {
      queryText = `
        UPDATE users
        SET is_active = true, updated_at = NOW()
        WHERE user_id::text = ANY($1::text[])
        RETURNING user_id::text AS user_id
      `;
    } else {
      return res.status(400).json({
        error: 'Invalid action. Must be one of: suspend, unsuspend, deactivate, activate, change-role, change-tier'
      });
    }

    const result = await runQuery(queryText, queryParams);
    const affectedUserIds = result.rows.map((row) => String(row.user_id || '').trim()).filter(Boolean);
    const requestId = crypto.randomUUID();
    const actorUserId = getRequestUserId(req) || 'unknown';

    await logBulkAction({
      requestId,
      actorUserId,
      action: normalizedAction,
      value: normalizedValue,
      reason: parseOptionalString(reason),
      targetUserIds: normalizedUserIds,
      affectedCount: result.rowCount || 0,
      req
    });

    return res.json({
      success: true,
      requestId,
      action: normalizedAction,
      value: normalizedValue,
      affected: result.rowCount || 0,
      affectedUserIds
    });
  } catch (err) {
    logger.error('[Admin] Bulk action error:', err);
    return res.status(500).json({ error: 'Bulk action failed', details: err.message });
  }
});

// GET /admin/users/bulk-actions - list recent bulk action audit records
router.get('/users/bulk-actions', requireAdminWrite, async (req, res) => {
  try {
    await ensureAdminSchema();
    const page = parsePositiveInt(req.query.page, 1);
    const limit = parsePositiveInt(req.query.limit, 20, 100);
    const offset = (page - 1) * limit;

    const [rowsResult, countResult] = await Promise.all([
      runQuery(
        `
          SELECT request_id, actor_user_id, action, value, reason, target_user_ids, affected_count, metadata, created_at
          FROM admin_bulk_action_logs
          ORDER BY created_at DESC
          LIMIT $1 OFFSET $2
        `,
        [limit, offset]
      ),
      runQuery('SELECT COUNT(*)::int AS total FROM admin_bulk_action_logs')
    ]);

    const total = Number.parseInt(countResult.rows[0]?.total, 10) || 0;
    res.json({
      records: rowsResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    logger.error('[Admin] Bulk action log query failed:', err);
    res.status(500).json({ error: 'Failed to fetch bulk action logs', details: err.message });
  }
});

// GET /admin/users/export and /admin/export/users - CSV export with filter parity
router.get('/users/export', requireAdminWrite, exportUsersHandler);
router.get('/export/users', requireAdminWrite, exportUsersHandler);

// GET /admin/exports/users/logs - export audit history
router.get('/exports/users/logs', requireAdminWrite, async (req, res) => {
  try {
    await ensureAdminSchema();
    const page = parsePositiveInt(req.query.page, 1);
    const limit = parsePositiveInt(req.query.limit, 20, 100);
    const offset = (page - 1) * limit;

    const [rowsResult, countResult] = await Promise.all([
      runQuery(
        `
          SELECT export_id, actor_user_id, export_type, row_count, filters, metadata, requested_at
          FROM admin_export_logs
          ORDER BY requested_at DESC
          LIMIT $1 OFFSET $2
        `,
        [limit, offset]
      ),
      runQuery('SELECT COUNT(*)::int AS total FROM admin_export_logs')
    ]);

    const total = Number.parseInt(countResult.rows[0]?.total, 10) || 0;
    res.json({
      records: rowsResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    logger.error('[Admin] Export log query failed:', err);
    res.status(500).json({ error: 'Failed to fetch export logs', details: err.message });
  }
});

// Verification and KYC review endpoints
router.get('/view-doc/:id', adminDocController.viewDocument);
router.get('/verifications', adminDocController.listVerifications);
router.post('/verifications/:id/review', adminDocController.reviewVerification);
router.post('/verifications/:id/auto-validate', adminDocController.autoValidateDocument);
router.get('/kyc/queue', adminDocController.listKycReviewQueue);
router.post('/kyc/queue/:queueId/review', adminDocController.reviewKycQueueItem);

module.exports = router;

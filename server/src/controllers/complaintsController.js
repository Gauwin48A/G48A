const pool = require('../config/db');
const logger = require('../utils/logger');
const DB_QUERY_TIMEOUT_MS = Number.parseInt(process.env.DB_QUERY_TIMEOUT_MS, 10) || 10000;
const DEFAULT_COMPLAINT_LIMIT = 20;
const MAX_COMPLAINT_LIMIT = 100;
const SLA_HOURS_BY_SEVERITY = {
  low: Number.parseInt(process.env.COMPLAINT_SLA_HOURS_LOW, 10) || 72,
  medium: Number.parseInt(process.env.COMPLAINT_SLA_HOURS_MEDIUM, 10) || 48,
  high: Number.parseInt(process.env.COMPLAINT_SLA_HOURS_HIGH, 10) || 24,
  critical: Number.parseInt(process.env.COMPLAINT_SLA_HOURS_CRITICAL, 10) || 12
};
const COMPLAINT_TRANSITIONS = {
  open: ['triage', 'rejected', 'closed'],
  triage: ['investigating', 'rejected', 'closed'],
  investigating: ['resolved', 'rejected', 'closed'],
  resolved: ['closed'],
  rejected: ['closed'],
  closed: []
};
let complaintsSchemaReadyPromise = null;
let complaintsTableAvailablePromise = null;
let complaintsTableMissingLogged = false;
const SLA_BREACH_SWEEP_INTERVAL_MS = Number.parseInt(process.env.COMPLAINT_SLA_SWEEP_INTERVAL_MS, 10) || 60000;
let lastSlaBreachSweepAtMs = 0;
let slaBreachSweepPromise = null;

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
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    return fallback;
  }
  return Math.min(parsed, max);
}

function normalizeSeverity(value) {
  const normalized = String(value || 'medium').trim().toLowerCase();
  if (['low', 'medium', 'high', 'critical'].includes(normalized)) {
    return normalized;
  }
  return 'medium';
}

function getSlaDueAtIso(severity) {
  const normalizedSeverity = normalizeSeverity(severity);
  const slaHours = SLA_HOURS_BY_SEVERITY[normalizedSeverity] || SLA_HOURS_BY_SEVERITY.medium;
  return new Date(Date.now() + (slaHours * 60 * 60 * 1000)).toISOString();
}

function normalizeEvidencePayload(payload = {}) {
  const urls = Array.isArray(payload.evidence_urls)
    ? payload.evidence_urls.map((item) => parseOptionalString(item)).filter(Boolean)
    : [];
  const metadata = payload.evidence_metadata && typeof payload.evidence_metadata === 'object'
    ? payload.evidence_metadata
    : {};
  const note = parseOptionalString(payload.evidence_note);

  return {
    evidence_urls: urls,
    evidence_note: note,
    metadata
  };
}

function getComplaintIdentity(req) {
  return String(req.user?.userId || req.user?.id || req.user?.user_id || '').trim() || null;
}

function canModerate(req) {
  return canModerateComplaints(req);
}

async function ensureComplaintsSchema() {
  if (!complaintsSchemaReadyPromise) {
    complaintsSchemaReadyPromise = (async () => {
      const tableAvailable = await isComplaintsTableAvailable();
      if (!tableAvailable) {
        if (!complaintsTableMissingLogged) {
          logger.warn('[Complaints] complaints table missing; read endpoints will return empty results.');
          complaintsTableMissingLogged = true;
        }
        return false;
      }

      await runQuery(`ALTER TABLE complaints ADD COLUMN IF NOT EXISTS severity VARCHAR(20) DEFAULT 'medium'`);
      await runQuery(`ALTER TABLE complaints ADD COLUMN IF NOT EXISTS evidence_metadata JSONB DEFAULT '{}'::jsonb`);
      await runQuery(`ALTER TABLE complaints ADD COLUMN IF NOT EXISTS sla_due_at TIMESTAMPTZ`);
      await runQuery(`ALTER TABLE complaints ADD COLUMN IF NOT EXISTS sla_breached_at TIMESTAMPTZ`);
      await runQuery(`ALTER TABLE complaints ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ`);
      await runQuery(`ALTER TABLE complaints ADD COLUMN IF NOT EXISTS last_status_change_at TIMESTAMPTZ DEFAULT NOW()`);
      await runQuery(`ALTER TABLE complaints ADD COLUMN IF NOT EXISTS status_history JSONB DEFAULT '[]'::jsonb`);

      await runQuery(
        `
          CREATE INDEX IF NOT EXISTS idx_complaints_sla_due_open
          ON complaints(sla_due_at)
          WHERE status IN ('open', 'triage', 'investigating')
        `
      );
      await runQuery(`CREATE INDEX IF NOT EXISTS idx_complaints_severity_status ON complaints(severity, status)`);
      return true;
    })().catch((err) => {
      logger.warn('[Complaints] Schema update skipped', { message: err.message });
      return false;
    });
  }

  return complaintsSchemaReadyPromise;
}

async function isComplaintsTableAvailable() {
  if (!complaintsTableAvailablePromise) {
    complaintsTableAvailablePromise = runQuery(
      `SELECT to_regclass('public.complaints') IS NOT NULL AS available`
    )
      .then((result) => Boolean(result?.rows?.[0]?.available))
      .catch((err) => {
        logger.warn('[Complaints] Failed to verify complaints table availability', { message: err.message });
        return false;
      });
  }

  return complaintsTableAvailablePromise;
}

function isComplaintsTableMissingError(err) {
  if (!err) return false;
  return err.code === '42P01' || String(err.message || '').toLowerCase().includes('relation "complaints" does not exist');
}

async function markSlaBreaches() {
  const now = Date.now();
  if ((now - lastSlaBreachSweepAtMs) < SLA_BREACH_SWEEP_INTERVAL_MS) {
    return;
  }

  if (slaBreachSweepPromise) {
    await slaBreachSweepPromise;
    return;
  }

  slaBreachSweepPromise = (async () => {
    try {
      const tableAvailable = await isComplaintsTableAvailable();
      if (!tableAvailable) {
        return;
      }

      await runQuery(
        `
          UPDATE complaints
          SET sla_breached_at = NOW(),
              updated_at = NOW()
          WHERE sla_due_at IS NOT NULL
            AND sla_due_at < NOW()
            AND status IN ('open', 'triage', 'investigating')
            AND sla_breached_at IS NULL
        `
      );
    } catch (err) {
      logger.warn('[Complaints] Failed to update SLA breaches', { message: err.message });
    } finally {
      lastSlaBreachSweepAtMs = Date.now();
    }
  })()
    .finally(() => {
      slaBreachSweepPromise = null;
    });

  await slaBreachSweepPromise;
}

function buildSlaVisibility(complaint) {
  const dueAt = complaint.sla_due_at ? new Date(complaint.sla_due_at) : null;
  if (!dueAt || Number.isNaN(dueAt.getTime())) {
    return {
      due_at: null,
      breached: false,
      hours_remaining: null
    };
  }

  const diffHours = Number(((dueAt.getTime() - Date.now()) / (1000 * 60 * 60)).toFixed(2));
  return {
    due_at: dueAt.toISOString(),
    breached: Boolean(complaint.sla_breached_at) || diffHours < 0,
    hours_remaining: diffHours
  };
}

function mapComplaintForResponse(row) {
  return {
    ...row,
    sla: buildSlaVisibility(row)
  };
}

function getUserRole(req) {
  return String(req.user?.role || '').toLowerCase();
}

function canModerateComplaints(req) {
  const role = getUserRole(req);
  return role === 'admin' || role === 'superadmin' || role === 'moderator';
}

// GET all complaints (admin view)
exports.getComplaints = async (req, res) => {
  try {
    if (!canModerate(req)) {
      return res.status(403).json({ error: 'Admin or moderator access required' });
    }

    const schemaReady = await ensureComplaintsSchema();
    if (!schemaReady) {
      const pageNumber = parsePositiveInt(req.query.page, 1);
      const limitNumber = parsePositiveInt(req.query.limit, DEFAULT_COMPLAINT_LIMIT, MAX_COMPLAINT_LIMIT);
      return res.json({
        complaints: [],
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          total: 0
        }
      });
    }

    await markSlaBreaches();

    const { status, type, page = 1, limit = DEFAULT_COMPLAINT_LIMIT } = req.query;
    const pageNumber = parsePositiveInt(page, 1);
    const limitNumber = parsePositiveInt(limit, DEFAULT_COMPLAINT_LIMIT, MAX_COMPLAINT_LIMIT);
    const offset = (pageNumber - 1) * limitNumber;
    const params = [];
    const conditions = [];

    if (status) {
      params.push(status);
      conditions.push(`c.status = $${params.length}`);
    }
    if (type) {
      params.push(type);
      conditions.push(`c.complaint_type = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(limitNumber, offset);

    const result = await runQuery(`
      SELECT
             COUNT(*) OVER()::int AS total_count,
             c.*, 
             bu.full_name as buyer_name, 
             su.full_name as seller_name
      FROM complaints c
      LEFT JOIN users bu ON c.buyer_id::text = bu.user_id::text
      LEFT JOIN users su ON c.seller_id::text = su.user_id::text
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    const total = result.rows.length ? result.rows[0].total_count : 0;
    const complaints = result.rows.map(({ total_count, ...complaint }) => complaint);

    res.json({
      complaints: complaints.map(mapComplaintForResponse),
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total
      }
    });
  } catch (err) {
    if (isComplaintsTableMissingError(err)) {
      return res.json({
        complaints: [],
        pagination: {
          page: 1,
          limit: DEFAULT_COMPLAINT_LIMIT,
          total: 0
        }
      });
    }
    logger.error('Error fetching complaints:', err);
    res.status(500).json({ error: 'Failed to fetch complaints', details: err.message });
  }
};

// POST — Create a new complaint
exports.createComplaint = async (req, res) => {
  try {
    const schemaReady = await ensureComplaintsSchema();
    if (!schemaReady) {
      return res.status(503).json({ error: 'Complaints service unavailable', details: 'Complaints table is not initialized' });
    }

    const userId = getComplaintIdentity(req);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const {
      seller_id,
      buyer_id,
      post_id,
      complaint_type,
      description,
      secret_code,
      severity
    } = req.body;

    if (!post_id || !complaint_type || !description) {
      return res.status(400).json({ error: 'post_id, complaint_type, and description are required' });
    }

    // Determine seller/buyer from request or use authenticated user
    const effectiveBuyerId = buyer_id || userId;
    const normalizedSeverity = normalizeSeverity(severity);
    const evidence = normalizeEvidencePayload(req.body);
    const initialHistoryEntry = [
      {
        at: new Date().toISOString(),
        actor: userId,
        from: null,
        to: 'open',
        note: 'Complaint created'
      }
    ];
    const slaDueAt = getSlaDueAtIso(normalizedSeverity);

    const result = await runQuery(`
      INSERT INTO complaints (
        buyer_id, seller_id, post_id, complaint_type, description, secret_code, 
        status, severity, evidence_metadata, sla_due_at, status_history, last_status_change_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 'open', $7, $8::jsonb, $9, $10::jsonb, NOW(), NOW(), NOW())
      RETURNING
        complaint_id,
        buyer_id,
        seller_id,
        post_id,
        complaint_type,
        description,
        secret_code,
        status,
        severity,
        evidence_metadata,
        sla_due_at,
        sla_breached_at,
        status_history,
        last_status_change_at,
        admin_response,
        resolved_by,
        resolved_at,
        created_at,
        updated_at
    `, [
      effectiveBuyerId,
      seller_id || null,
      post_id,
      complaint_type,
      description,
      secret_code || null,
      normalizedSeverity,
      JSON.stringify(evidence),
      slaDueAt,
      JSON.stringify(initialHistoryEntry)
    ]);

    res.status(201).json({
      message: 'Complaint submitted successfully',
      complaint: mapComplaintForResponse(result.rows[0])
    });
  } catch (err) {
    logger.error('Error creating complaint:', err);
    res.status(500).json({ error: 'Failed to submit complaint', details: err.message });
  }
};

// GET /my — Get current user's complaints
exports.getMyComplaints = async (req, res) => {
  try {
    const schemaReady = await ensureComplaintsSchema();
    if (!schemaReady) {
      return res.json({ complaints: [] });
    }
    await markSlaBreaches();

    const userId = getComplaintIdentity(req);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const result = await runQuery(`
      SELECT c.*, 
             su.full_name as seller_name,
             p.title as post_title
      FROM complaints c
      LEFT JOIN users su ON c.seller_id::text = su.user_id::text
      LEFT JOIN posts p ON c.post_id = p.post_id
      WHERE c.buyer_id::text = $1
      ORDER BY c.created_at DESC
    `, [userId]);

    res.json({ complaints: result.rows.map(mapComplaintForResponse) });
  } catch (err) {
    logger.error('Error fetching user complaints:', err);
    res.status(500).json({ error: 'Failed to fetch complaints', details: err.message });
  }
};

// PATCH /:id/status — Update complaint status (admin)
// Valid transitions: open → triage → investigating → resolved | rejected → closed
exports.updateComplaintStatus = async (req, res) => {
  try {
    const schemaReady = await ensureComplaintsSchema();
    if (!schemaReady) {
      return res.status(503).json({ error: 'Complaints service unavailable', details: 'Complaints table is not initialized' });
    }

    const { id } = req.params;
    const { status, admin_response, evidence_metadata, evidence_urls, evidence_note } = req.body;
    const adminId = getComplaintIdentity(req);

    if (!canModerate(req)) {
      return res.status(403).json({ error: 'Admin or moderator access required' });
    }

    const validStatuses = ['open', 'triage', 'investigating', 'resolved', 'rejected', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const currentResult = await runQuery(
      `SELECT complaint_id, status, evidence_metadata, status_history, sla_due_at, sla_breached_at FROM complaints WHERE complaint_id::text = $1`,
      [id]
    );

    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    const currentStatus = String(currentResult.rows[0].status || 'open').toLowerCase();
    const nextStatus = String(status).toLowerCase();
    const allowedNext = COMPLAINT_TRANSITIONS[currentStatus] || [];
    const sameStatus = currentStatus === nextStatus;
    if (!sameStatus && !allowedNext.includes(nextStatus)) {
      return res.status(400).json({
        error: `Invalid status transition from ${currentStatus} to ${nextStatus}`,
        allowedTransitions: allowedNext
      });
    }

    const existingEvidence = currentResult.rows[0].evidence_metadata && typeof currentResult.rows[0].evidence_metadata === 'object'
      ? currentResult.rows[0].evidence_metadata
      : {};
    const incomingEvidence = normalizeEvidencePayload({
      evidence_metadata,
      evidence_urls,
      evidence_note
    });
    const mergedEvidence = {
      ...existingEvidence,
      ...incomingEvidence.metadata,
      evidence_urls: [
        ...(Array.isArray(existingEvidence.evidence_urls) ? existingEvidence.evidence_urls : []),
        ...incomingEvidence.evidence_urls
      ],
      evidence_note: incomingEvidence.evidence_note || existingEvidence.evidence_note || null
    };
    const statusHistory = Array.isArray(currentResult.rows[0].status_history)
      ? currentResult.rows[0].status_history
      : [];
    const nextHistory = [
      ...statusHistory,
      {
        at: new Date().toISOString(),
        actor: adminId,
        from: currentStatus,
        to: nextStatus,
        note: parseOptionalString(admin_response) || null
      }
    ];

    const isTerminal = ['resolved', 'rejected', 'closed'].includes(nextStatus);

    const result = await runQuery(`
      UPDATE complaints 
      SET status = $1, admin_response = COALESCE($2, admin_response), 
          resolved_by = $3,
          evidence_metadata = $4::jsonb,
          status_history = $5::jsonb,
          last_status_change_at = NOW(),
          resolved_at = CASE WHEN $6 THEN COALESCE(resolved_at, NOW()) ELSE resolved_at END,
          sla_breached_at = CASE
            WHEN sla_due_at IS NOT NULL AND sla_due_at < NOW() AND status IN ('open', 'triage', 'investigating')
              THEN COALESCE(sla_breached_at, NOW())
            ELSE sla_breached_at
          END,
          updated_at = NOW()
      WHERE complaint_id::text = $7
      RETURNING
        complaint_id,
        buyer_id,
        seller_id,
        post_id,
        complaint_type,
        description,
        secret_code,
        status,
        severity,
        evidence_metadata,
        sla_due_at,
        sla_breached_at,
        status_history,
        last_status_change_at,
        admin_response,
        resolved_by,
        resolved_at,
        created_at,
        updated_at
    `, [
      status,
      admin_response || null,
      adminId,
      JSON.stringify(mergedEvidence),
      JSON.stringify(nextHistory),
      isTerminal,
      id
    ]);

    // Best-effort audit marker for moderation traceability.
    runQuery(
      `
        INSERT INTO audit_logs (user_id, action, details, ip_address, created_at)
        VALUES ($1, $2, $3, $4, NOW())
      `,
      [
        adminId,
        'COMPLAINT_STATUS_UPDATE',
        JSON.stringify({ complaintId: id, from: currentStatus, to: nextStatus }),
        req.ip || null
      ]
    ).catch(() => { });

    res.json({
      message: `Complaint status updated to ${status}`,
      complaint: mapComplaintForResponse(result.rows[0])
    });
  } catch (err) {
    logger.error('Error updating complaint:', err);
    res.status(500).json({ error: 'Failed to update complaint', details: err.message });
  }
};

// PATCH /:id/evidence - append evidence metadata
exports.addComplaintEvidence = async (req, res) => {
  try {
    const schemaReady = await ensureComplaintsSchema();
    if (!schemaReady) {
      return res.status(503).json({ error: 'Complaints service unavailable', details: 'Complaints table is not initialized' });
    }

    const { id } = req.params;
    const actorId = getComplaintIdentity(req);
    if (!actorId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const currentResult = await runQuery(
      `
        SELECT complaint_id, buyer_id, status, evidence_metadata
        FROM complaints
        WHERE complaint_id::text = $1
      `,
      [id]
    );

    if (!currentResult.rows.length) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    const complaint = currentResult.rows[0];
    if (!canModerate(req) && String(complaint.buyer_id) !== String(actorId)) {
      return res.status(403).json({ error: 'Not authorized to add evidence to this complaint' });
    }

    const incomingEvidence = normalizeEvidencePayload(req.body);
    if (!incomingEvidence.evidence_urls.length && !incomingEvidence.evidence_note && !Object.keys(incomingEvidence.metadata).length) {
      return res.status(400).json({ error: 'Evidence payload is empty' });
    }

    const existingEvidence = complaint.evidence_metadata && typeof complaint.evidence_metadata === 'object'
      ? complaint.evidence_metadata
      : {};
    const mergedEvidence = {
      ...existingEvidence,
      ...incomingEvidence.metadata,
      evidence_urls: [
        ...(Array.isArray(existingEvidence.evidence_urls) ? existingEvidence.evidence_urls : []),
        ...incomingEvidence.evidence_urls
      ],
      evidence_note: incomingEvidence.evidence_note || existingEvidence.evidence_note || null,
      last_updated_by: actorId,
      last_updated_at: new Date().toISOString()
    };

    const result = await runQuery(
      `
        UPDATE complaints
        SET evidence_metadata = $1::jsonb,
            updated_at = NOW()
        WHERE complaint_id::text = $2
        RETURNING
          complaint_id,
          buyer_id,
          seller_id,
          post_id,
          complaint_type,
          description,
          secret_code,
          status,
          severity,
          evidence_metadata,
          sla_due_at,
          sla_breached_at,
          status_history,
          last_status_change_at,
          admin_response,
          resolved_by,
          resolved_at,
          created_at,
          updated_at
      `,
      [JSON.stringify(mergedEvidence), id]
    );

    return res.json({
      message: 'Complaint evidence updated',
      complaint: mapComplaintForResponse(result.rows[0])
    });
  } catch (err) {
    logger.error('Error updating complaint evidence:', err);
    return res.status(500).json({ error: 'Failed to update complaint evidence', details: err.message });
  }
};

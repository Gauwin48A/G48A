/**
 * Complaints Controller
 *
 * Handles CRUD operations for buyer/seller complaints, including
 * SLA tracking, status transitions, and evidence management.
 */

const logger = require("../utils/logger");
const { runQuery, getAuthUserId, pool } = require("../utils/dbHelpers");
const { parseOptionalString, parsePositiveInt } = require("../utils/parseHelpers");
const { computeTrustScore } = require("../services/trustScoreService");
const { setUserRiskState } = require("../services/riskStateService");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_COMPLAINT_LIMIT = 20;
const MAX_COMPLAINT_LIMIT = 100;

/** SLA hours by severity, configurable via environment variables. */
const SLA_HOURS_BY_SEVERITY = {
  low: Number.parseInt(process.env.COMPLAINT_SLA_HOURS_LOW, 10) || 72,
  medium: Number.parseInt(process.env.COMPLAINT_SLA_HOURS_MEDIUM, 10) || 48,
  high: Number.parseInt(process.env.COMPLAINT_SLA_HOURS_HIGH, 10) || 24,
  critical: Number.parseInt(process.env.COMPLAINT_SLA_HOURS_CRITICAL, 10) || 12,
};

const COMPLAINT_WINDOW_DAYS =
  Number.parseInt(process.env.COMPLAINT_WINDOW_DAYS, 10) || 7;
const COMPLAINT_FREEZE_THRESHOLD =
  Number.parseInt(process.env.COMPLAINT_FREEZE_THRESHOLD, 10) || 8;
const COMPLAINT_HIGH_THRESHOLD =
  Number.parseInt(process.env.COMPLAINT_HIGH_THRESHOLD, 10) || 5;
const COMPLAINT_LIMITED_HOURS =
  Number.parseInt(process.env.COMPLAINT_LIMITED_HOURS, 10) || 48;
const COMPLAINT_HIGH_HOURS =
  Number.parseInt(process.env.COMPLAINT_HIGH_HOURS, 10) || 24;

const COMPLAINT_SEVERITY_SCORE = {
  low: 1,
  medium: 2,
  high: 4,
  critical: 6,
};

/** Allowed status transitions for complaints. */
const COMPLAINT_TRANSITIONS = {
  open: ["triage", "rejected", "closed"],
  triage: ["investigating", "rejected", "closed"],
  investigating: ["resolved", "rejected", "closed"],
  resolved: ["closed"],
  rejected: ["closed"],
  closed: [],
};

// ---------------------------------------------------------------------------
// Schema migration (cached promises — run at most once per process)
// ---------------------------------------------------------------------------

let complaintsSchemaReadyPromise = null;
let complaintsTableAvailablePromise = null;
let complaintsTableMissingLogged = false;
const AUTO_CREATE_COMPLAINTS_TABLE =
  process.env.AUTO_CREATE_COMPLAINTS_TABLE !== "false";

// ---------------------------------------------------------------------------
// SLA breach sweep throttle
// ---------------------------------------------------------------------------

const SLA_BREACH_SWEEP_INTERVAL_MS =
  Number.parseInt(process.env.COMPLAINT_SLA_SWEEP_INTERVAL_MS, 10) || 60_000;

let lastSlaBreachSweepAtMs = 0;
let slaBreachSweepPromise = null;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Normalize a severity string to one of the known values.
 * @param {*} value - Raw severity input
 * @returns {"low"|"medium"|"high"|"critical"}
 */
function normalizeSeverity(value) {
  const normalized = String(value || "medium").trim().toLowerCase();
  if (["low", "medium", "high", "critical"].includes(normalized)) {
    return normalized;
  }
  return "medium";
}

/**
 * Compute ISO timestamp for when the SLA is due based on severity.
 * @param {string} severity
 * @returns {string} ISO 8601 timestamp
 */
function getSlaDueAtIso(severity) {
  const normalizedSeverity = normalizeSeverity(severity);
  const slaHours =
    SLA_HOURS_BY_SEVERITY[normalizedSeverity] || SLA_HOURS_BY_SEVERITY.medium;
  return new Date(Date.now() + slaHours * 60 * 60 * 1000).toISOString();
}

function classifyComplaintSeverity(complaintType, fallback) {
  const normalizedType = String(complaintType || "").toLowerCase();
  if (!normalizedType) return normalizeSeverity(fallback);

  if (
    normalizedType.includes("no delivery") ||
    normalizedType.includes("no-delivery") ||
    normalizedType.includes("money") ||
    normalizedType.includes("fraud") ||
    normalizedType.includes("scam")
  ) {
    return "high";
  }
  if (normalizedType.includes("multiple") || normalizedType.includes("repeat")) {
    return "critical";
  }
  if (normalizedType.includes("mismatch") || normalizedType.includes("damaged")) {
    return "medium";
  }
  if (normalizedType.includes("late") || normalizedType.includes("delay")) {
    return "low";
  }
  return normalizeSeverity(fallback);
}

async function getComplaintRiskSnapshot({ sellerId, buyerId, complaintType }) {
  const windowDays = COMPLAINT_WINDOW_DAYS;
  const windowInterval = `${windowDays} days`;

  const [sellerTrust, buyerTrust, complaintStats, recentSimilar] = await Promise.all([
    computeTrustScore(sellerId).catch(() => null),
    buyerId ? computeTrustScore(buyerId).catch(() => null) : Promise.resolve(null),
    runQuery(
      `
        SELECT
          COUNT(*)::int AS total_recent,
          COUNT(*) FILTER (WHERE status IN ('open','triage','investigating'))::int AS open_recent
        FROM complaints
        WHERE seller_id::text = $1
          AND created_at >= NOW() - $2::interval
      `,
      [sellerId, windowInterval],
    ).catch(() => ({ rows: [{ total_recent: 0, open_recent: 0 }] })),
    runQuery(
      `
        SELECT COUNT(*)::int AS similar_count
        FROM complaints
        WHERE seller_id::text = $1
          AND complaint_type = $2
          AND created_at >= NOW() - $3::interval
      `,
      [sellerId, complaintType || "", windowInterval],
    ).catch(() => ({ rows: [{ similar_count: 0 }] })),
  ]);

  const statsRow = complaintStats.rows?.[0] || {};
  const similarRow = recentSimilar.rows?.[0] || {};

  const totalRecent = Number(statsRow.total_recent || 0);
  const openRecent = Number(statsRow.open_recent || 0);
  const similarCount = Number(similarRow.similar_count || 0);

  return {
    sellerTrust: sellerTrust?.score ?? 50,
    buyerTrust: buyerTrust?.score ?? 50,
    totalRecent,
    openRecent,
    similarCount,
  };
}

function decideComplaintAction({ severity, snapshot }) {
  const baseScore = COMPLAINT_SEVERITY_SCORE[severity] || 2;
  const buyerMultiplier = snapshot.buyerTrust >= 70 ? 1.5 : snapshot.buyerTrust <= 40 ? 0.8 : 1;
  const sellerPenalty = snapshot.sellerTrust < 40 ? 2 : snapshot.sellerTrust < 55 ? 1 : 0;
  const recentPenalty = Math.min(4, snapshot.totalRecent);
  const openPenalty = Math.min(3, snapshot.openRecent);
  const patternPenalty = snapshot.similarCount >= 3 ? 4 : snapshot.similarCount >= 2 ? 2 : 0;

  const score = Math.round(baseScore * buyerMultiplier + sellerPenalty + recentPenalty + openPenalty + patternPenalty);

  const shouldFreeze =
    snapshot.totalRecent >= 2 ||
    snapshot.similarCount >= 3 ||
    score >= COMPLAINT_FREEZE_THRESHOLD ||
    severity === "critical";

  if (shouldFreeze) {
    return { status: "frozen", score };
  }

  if (severity === "high" || score >= COMPLAINT_HIGH_THRESHOLD) {
    return { status: "high", score };
  }

  return { status: "limited", score };
}

/**
 * Normalize and sanitize an evidence payload from request body.
 * @param {object} payload
 * @returns {{ evidence_urls: string[], evidence_note: string|null, metadata: object }}
 */
function normalizeEvidencePayload(payload = {}) {
  const urls = Array.isArray(payload.evidence_urls)
    ? payload.evidence_urls.map((item) => parseOptionalString(item)).filter(Boolean)
    : [];

  const metadata =
    payload.evidence_metadata && typeof payload.evidence_metadata === "object"
      ? payload.evidence_metadata
      : {};

  const note = parseOptionalString(payload.evidence_note);

  return { evidence_urls: urls, evidence_note: note, metadata };
}

/**
 * Extract the acting user's ID from the request (complaint-specific alias).
 * @param {import("express").Request} req
 * @returns {string|null}
 */
function getComplaintIdentity(req) {
  return getAuthUserId(req);
}

/**
 * Get the lowercase role string from the request.
 * @param {import("express").Request} req
 * @returns {string}
 */
function getUserRole(req) {
  return String(req.user?.role || "").toLowerCase();
}

/**
 * Check whether the requesting user can moderate complaints.
 * @param {import("express").Request} req
 * @returns {boolean}
 */
function canModerateComplaints(req) {
  const role = getUserRole(req);
  return role === "admin" || role === "superadmin" || role === "moderator";
}

/** Shorthand alias used throughout the controller. */
function canModerate(req) {
  return canModerateComplaints(req);
}

// ---------------------------------------------------------------------------
// Schema / table availability (cached — runs once per process lifetime)
// ---------------------------------------------------------------------------

/**
 * Check whether the `complaints` table exists. Result is cached.
 * @returns {Promise<boolean>}
 */
async function isComplaintsTableAvailable() {
  if (!complaintsTableAvailablePromise) {
    complaintsTableAvailablePromise = runQuery(
      `SELECT to_regclass('public.complaints') IS NOT NULL AS available`
    )
      .then((result) => Boolean(result?.rows?.[0]?.available))
      .catch((err) => {
        logger.warn("[Complaints] Failed to verify complaints table availability", {
          message: err.message,
        });
        return false;
      });
  }
  return complaintsTableAvailablePromise;
}

/**
 * Run one-time schema migrations (add columns / indexes) if the table exists.
 * The promise is cached so migrations execute at most once per process.
 * @returns {Promise<boolean>} true if schema is ready
 */
async function ensureComplaintsSchema() {
  if (!complaintsSchemaReadyPromise) {
    complaintsSchemaReadyPromise = (async () => {
      let tableAvailable = await isComplaintsTableAvailable();
      if (!tableAvailable && AUTO_CREATE_COMPLAINTS_TABLE) {
        try {
          await runQuery(
            `CREATE TABLE IF NOT EXISTS complaints (
              complaint_id BIGSERIAL PRIMARY KEY,
              buyer_id TEXT NOT NULL,
              seller_id TEXT,
              post_id TEXT,
              complaint_type TEXT NOT NULL,
              description TEXT NOT NULL,
              secret_code TEXT,
              status TEXT NOT NULL DEFAULT 'open',
              severity VARCHAR(20) NOT NULL DEFAULT 'medium',
              evidence_metadata JSONB DEFAULT '{}'::jsonb,
              sla_due_at TIMESTAMPTZ,
              sla_breached_at TIMESTAMPTZ,
              status_history JSONB DEFAULT '[]'::jsonb,
              admin_response TEXT,
              resolved_by TEXT,
              resolved_at TIMESTAMPTZ,
              last_status_change_at TIMESTAMPTZ DEFAULT NOW(),
              created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
              updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )`
          );
          complaintsTableAvailablePromise = Promise.resolve(true);
          tableAvailable = true;
          logger.info("[Complaints] complaints table created automatically.");
        } catch (createErr) {
          logger.warn("[Complaints] Unable to auto-create complaints table", {
            message: createErr.message,
          });
        }
      }

      if (!tableAvailable) {
        if (!complaintsTableMissingLogged) {
          logger.warn(
            "[Complaints] complaints table missing; read endpoints will return empty results."
          );
          complaintsTableMissingLogged = true;
        }
        return false;
      }

      // Column migrations
      await runQuery(
        `ALTER TABLE complaints ADD COLUMN IF NOT EXISTS severity VARCHAR(20) DEFAULT 'medium'`
      );
      await runQuery(
        `ALTER TABLE complaints ADD COLUMN IF NOT EXISTS evidence_metadata JSONB DEFAULT '{}'::jsonb`
      );
      await runQuery(
        `ALTER TABLE complaints ADD COLUMN IF NOT EXISTS sla_due_at TIMESTAMPTZ`
      );
      await runQuery(
        `ALTER TABLE complaints ADD COLUMN IF NOT EXISTS sla_breached_at TIMESTAMPTZ`
      );
      await runQuery(
        `ALTER TABLE complaints ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ`
      );
      await runQuery(
        `ALTER TABLE complaints ADD COLUMN IF NOT EXISTS last_status_change_at TIMESTAMPTZ DEFAULT NOW()`
      );
      await runQuery(
        `ALTER TABLE complaints ADD COLUMN IF NOT EXISTS status_history JSONB DEFAULT '[]'::jsonb`
      );

      // Index migrations
      await runQuery(`
        CREATE INDEX IF NOT EXISTS idx_complaints_sla_due_open
        ON complaints(sla_due_at)
        WHERE status IN ('open', 'triage', 'investigating')
      `);
      await runQuery(
        `CREATE INDEX IF NOT EXISTS idx_complaints_severity_status ON complaints(severity, status)`
      );

      return true;
    })().catch((err) => {
      logger.warn("[Complaints] Schema update skipped", { message: err.message });
      return false;
    });
  }
  return complaintsSchemaReadyPromise;
}

/**
 * Detect whether a Postgres error indicates the complaints table is missing.
 * @param {Error} err
 * @returns {boolean}
 */
function isComplaintsTableMissingError(err) {
  if (!err) return false;
  return (
    err.code === "42P01" ||
    String(err.message || "")
      .toLowerCase()
      .includes('relation "complaints" does not exist')
  );
}

// ---------------------------------------------------------------------------
// SLA breach sweep
// ---------------------------------------------------------------------------

/**
 * Periodically mark complaints whose SLA has been breached.
 * Throttled to run at most once per SLA_BREACH_SWEEP_INTERVAL_MS.
 */
async function markSlaBreaches() {
  const now = Date.now();
  if (now - lastSlaBreachSweepAtMs < SLA_BREACH_SWEEP_INTERVAL_MS) {
    return;
  }

  if (slaBreachSweepPromise) {
    await slaBreachSweepPromise;
    return;
  }

  slaBreachSweepPromise = (async () => {
    try {
      const tableAvailable = await isComplaintsTableAvailable();
      if (!tableAvailable) return;

      await runQuery(`
        UPDATE complaints
        SET sla_breached_at = NOW(),
            updated_at = NOW()
        WHERE sla_due_at IS NOT NULL
          AND sla_due_at < NOW()
          AND status IN ('open', 'triage', 'investigating')
          AND sla_breached_at IS NULL
      `);
    } catch (err) {
      logger.warn("[Complaints] Failed to update SLA breaches", {
        message: err.message,
      });
    } finally {
      lastSlaBreachSweepAtMs = Date.now();
    }
  })().finally(() => {
    slaBreachSweepPromise = null;
  });

  await slaBreachSweepPromise;
}

// ---------------------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------------------

/**
 * Build a user-facing SLA visibility object from a complaint row.
 * @param {object} complaint - Database row
 * @returns {{ due_at: string|null, breached: boolean, hours_remaining: number|null }}
 */
function buildSlaVisibility(complaint) {
  const dueAt = complaint.sla_due_at ? new Date(complaint.sla_due_at) : null;

  if (!dueAt || Number.isNaN(dueAt.getTime())) {
    return { due_at: null, breached: false, hours_remaining: null };
  }

  const diffHours = Number(
    ((dueAt.getTime() - Date.now()) / (1000 * 60 * 60)).toFixed(2)
  );

  return {
    due_at: dueAt.toISOString(),
    breached: Boolean(complaint.sla_breached_at) || diffHours < 0,
    hours_remaining: diffHours,
  };
}

/**
 * Map a raw complaint database row to an API response object.
 * @param {object} row - Database row
 * @returns {object}
 */
function mapComplaintForResponse(row) {
  return { ...row, sla: buildSlaVisibility(row) };
}

// ---------------------------------------------------------------------------
// Exported route handlers
// ---------------------------------------------------------------------------

/**
 * GET /complaints
 * List all complaints (admin/moderator only) with pagination and optional filters.
 */
exports.getComplaints = async (req, res) => {
  try {
    if (!canModerate(req)) {
      return res.status(403).json({ error: "Admin or moderator access required" });
    }

    const schemaReady = await ensureComplaintsSchema();

    if (!schemaReady) {
      const pageNumber = parsePositiveInt(req.query.page, 1);
      const limitNumber = parsePositiveInt(
        req.query.limit,
        DEFAULT_COMPLAINT_LIMIT,
        MAX_COMPLAINT_LIMIT
      );
      return res.json({
        complaints: [],
        pagination: { page: pageNumber, limit: limitNumber, total: 0 },
      });
    }

    await markSlaBreaches();

    const {
      status,
      type,
      page = 1,
      limit = DEFAULT_COMPLAINT_LIMIT,
    } = req.query;

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

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    params.push(limitNumber, offset);

      const result = await runQuery(
      `
      SELECT
        COUNT(*) OVER()::int AS total_count,
        c.*,
        COALESCE(bp.full_name, bu.name, bu.username) AS buyer_name,
        COALESCE(sp.full_name, su.name, su.username) AS seller_name
      FROM complaints c
      LEFT JOIN users bu ON c.buyer_id::text = bu.user_id::text
      LEFT JOIN profiles bp ON c.buyer_id::text = bp.user_id::text
      LEFT JOIN users su ON c.seller_id::text = su.user_id::text
      LEFT JOIN profiles sp ON c.seller_id::text = sp.user_id::text
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
      `,
      params
    );

    const total = result.rows.length ? result.rows[0].total_count : 0;
    const complaints = result.rows.map(
      ({ total_count, ...complaint }) => complaint
    );

    res.json({
      complaints: complaints.map(mapComplaintForResponse),
      pagination: { page: pageNumber, limit: limitNumber, total },
    });
  } catch (err) {
    if (isComplaintsTableMissingError(err)) {
      return res.json({
        complaints: [],
        pagination: { page: 1, limit: DEFAULT_COMPLAINT_LIMIT, total: 0 },
      });
    }
    logger.error("Error fetching complaints:", err);
    res.status(500).json({ error: "Failed to fetch complaints" });
  }
};

/**
 * POST /complaints
 * Create a new complaint.
 */
exports.createComplaint = async (req, res) => {
  try {
    const schemaReady = await ensureComplaintsSchema();
    if (!schemaReady) {
      return res.status(503).json({
        error: "Complaints service unavailable",
        details: "Complaints table is not initialized",
      });
    }

    const userId = getComplaintIdentity(req);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const {
      seller_id,
      buyer_id,
      post_id,
      complaint_type,
      description,
      secret_code,
      severity,
    } = req.body;

    if (!post_id || !complaint_type || !description) {
      return res
        .status(400)
        .json({ error: "post_id, complaint_type, and description are required" });
    }

    const effectiveBuyerId = buyer_id || userId;
    const normalizedSeverity = classifyComplaintSeverity(complaint_type, severity);
    const evidence = normalizeEvidencePayload(req.body);
    const hasSeller = Boolean(seller_id);

    let complaintSnapshot = null;
    let complaintDecision = null;

    if (hasSeller) {
      try {
        complaintSnapshot = await getComplaintRiskSnapshot({
          sellerId: seller_id,
          buyerId: effectiveBuyerId,
          complaintType: complaint_type,
        });
        complaintDecision = decideComplaintAction({
          severity: normalizedSeverity,
          snapshot: complaintSnapshot,
        });
      } catch (err) {
        logger.warn("[Complaints] Risk snapshot failed, defaulting to limited review", {
          message: err.message,
        });
        complaintDecision = { status: "limited", score: COMPLAINT_SEVERITY_SCORE[normalizedSeverity] || 2 };
      }
    }

    const initialStatus = hasSeller
      ? complaintDecision?.status === "high" || complaintDecision?.status === "frozen"
        ? "investigating"
        : "triage"
      : "open";
    const initialNote =
      initialStatus === "investigating"
        ? "Complaint created - escalated to investigation"
        : initialStatus === "triage"
          ? "Complaint created - under review"
          : "Complaint created";

    const initialHistoryEntry = [
      {
        at: new Date().toISOString(),
        actor: userId,
        from: null,
        to: initialStatus,
        note: initialNote,
      },
    ];

    const slaDueAt = getSlaDueAtIso(normalizedSeverity);

    const result = await runQuery(
      `
      INSERT INTO complaints (
        buyer_id, seller_id, post_id, complaint_type, description, secret_code,
        status, severity, evidence_metadata, sla_due_at, status_history,
        last_status_change_at, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9::jsonb, $10, $11::jsonb,
        NOW(), NOW(), NOW()
      )
      RETURNING
        complaint_id, buyer_id, seller_id, post_id, complaint_type,
        description, secret_code, status, severity, evidence_metadata,
        sla_due_at, sla_breached_at, status_history, last_status_change_at,
        admin_response, resolved_by, resolved_at, created_at, updated_at
      `,
      [
        effectiveBuyerId,
        seller_id || null,
        post_id,
        complaint_type,
        description,
        secret_code || null,
        initialStatus,
        normalizedSeverity,
        JSON.stringify(evidence),
        slaDueAt,
        JSON.stringify(initialHistoryEntry),
        ]
      );

      const complaintRow = result.rows[0] || {};
      let riskAction = null;
      if (hasSeller && complaintDecision) {
        const now = Date.now();
        const expiresAt =
          complaintDecision.status === "limited"
            ? new Date(now + COMPLAINT_LIMITED_HOURS * 60 * 60 * 1000)
            : complaintDecision.status === "high"
              ? new Date(now + COMPLAINT_HIGH_HOURS * 60 * 60 * 1000)
              : null;

        const reason =
          complaintDecision.status === "frozen"
            ? "complaint_freeze"
            : complaintDecision.status === "high"
              ? "complaint_high_risk"
              : "complaint_under_review";

        const details = {
          source: "complaint",
          complaint_id: complaintRow?.complaint_id || null,
          post_id: post_id || null,
          severity: normalizedSeverity,
          buyer_id: effectiveBuyerId,
          seller_id: seller_id,
          decision_score: complaintDecision.score ?? null,
          snapshot: complaintSnapshot,
        };

        try {
          const state = await setUserRiskState(seller_id, {
            status: complaintDecision.status,
            score: complaintDecision.score ?? 0,
            reason,
            details,
            expires_at: expiresAt ? expiresAt.toISOString() : null,
          });
          if (state?.status && state.status !== "normal") {
            riskAction = {
              status: state.status,
              score: state.score,
              reason: state.reason,
              expires_at: state.expires_at || null,
            };
          }
          runQuery(
            `
            INSERT INTO audit_logs (user_id, action, details, ip_address, created_at)
            VALUES ($1, $2, $3, $4, NOW())
            `,
            [
              userId,
              "COMPLAINT_RISK_DECISION",
              JSON.stringify({
                complaintId: complaintRow?.complaint_id || null,
                sellerId: seller_id || null,
                buyerId: effectiveBuyerId || null,
                decision: {
                  status: state?.status || complaintDecision.status,
                  score: complaintDecision.score ?? null,
                  reason,
                  expires_at: expiresAt ? expiresAt.toISOString() : null,
                },
                severity: normalizedSeverity,
                snapshot: complaintSnapshot || null,
              }),
              req.ip || null,
            ]
          ).catch(() => {});
        } catch (err) {
          logger.warn("[Complaints] Failed to set risk state for complaint", {
            message: err.message,
            seller_id,
          });
        }
      }

      res.status(201).json({
        message: "Complaint submitted successfully",
        complaint: mapComplaintForResponse(complaintRow),
        riskAction,
      });
  } catch (err) {
    logger.error("Error creating complaint:", err);
    res.status(500).json({ error: "Failed to submit complaint" });
  }
};

/**
 * GET /complaints/my
 * Retrieve complaints filed by the authenticated user.
 */
exports.getMyComplaints = async (req, res) => {
  try {
    const schemaReady = await ensureComplaintsSchema();
    if (!schemaReady) {
      return res.json({ complaints: [] });
    }

    await markSlaBreaches();

    const userId = getComplaintIdentity(req);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const result = await runQuery(
      `
      SELECT c.*,
             COALESCE(sp.full_name, su.name, su.username) AS seller_name,
             p.title AS post_title
      FROM complaints c
      LEFT JOIN users su ON c.seller_id::text = su.user_id::text
      LEFT JOIN profiles sp ON c.seller_id::text = sp.user_id::text
      LEFT JOIN posts p ON c.post_id::text = p.post_id::text
      WHERE c.buyer_id::text = $1
      ORDER BY c.created_at DESC
      `,
      [userId]
    );

    res.json({ complaints: result.rows.map(mapComplaintForResponse) });
  } catch (err) {
    logger.error("Error fetching user complaints:", err);
    res.status(500).json({ error: "Failed to fetch complaints" });
  }
};

/**
 * PATCH /complaints/:id/status
 * Update a complaint's status, admin response, and evidence (admin/moderator only).
 */
exports.updateComplaintStatus = async (req, res) => {
  try {
    const schemaReady = await ensureComplaintsSchema();
    if (!schemaReady) {
      return res.status(503).json({
        error: "Complaints service unavailable",
        details: "Complaints table is not initialized",
      });
    }

    const { id } = req.params;
    const {
      status,
      admin_response,
      evidence_metadata,
      evidence_urls,
      evidence_note,
    } = req.body;

    const adminId = getComplaintIdentity(req);

    if (!canModerate(req)) {
      return res.status(403).json({ error: "Admin or moderator access required" });
    }

    const validStatuses = [
      "open",
      "triage",
      "investigating",
      "resolved",
      "rejected",
      "closed",
    ];
    if (!validStatuses.includes(status)) {
      return res
        .status(400)
        .json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
    }

    // Fetch current complaint for transition validation
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const currentResult = await client.query(
        `SELECT complaint_id, status, evidence_metadata, status_history,
                sla_due_at, sla_breached_at
         FROM complaints
         WHERE complaint_id::text = $1
         FOR UPDATE`,
        [id]
      );

    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    const currentStatus = String(currentResult.rows[0].status || "open").toLowerCase();
    const nextStatus = String(status).toLowerCase();
    const allowedNext = COMPLAINT_TRANSITIONS[currentStatus] || [];
    const sameStatus = currentStatus === nextStatus;

    if (!sameStatus && !allowedNext.includes(nextStatus)) {
      return res.status(400).json({
        error: `Invalid status transition from ${currentStatus} to ${nextStatus}`,
        allowedTransitions: allowedNext,
      });
    }

    // Merge evidence
    const existingEvidence =
      currentResult.rows[0].evidence_metadata &&
      typeof currentResult.rows[0].evidence_metadata === "object"
        ? currentResult.rows[0].evidence_metadata
        : {};

    const incomingEvidence = normalizeEvidencePayload({
      evidence_metadata,
      evidence_urls,
      evidence_note,
    });

    const mergedEvidence = {
      ...existingEvidence,
      ...incomingEvidence.metadata,
      evidence_urls: [
        ...(Array.isArray(existingEvidence.evidence_urls)
          ? existingEvidence.evidence_urls
          : []),
        ...incomingEvidence.evidence_urls,
      ],
      evidence_note:
        incomingEvidence.evidence_note || existingEvidence.evidence_note || null,
    };

    // Build status history
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
        note: parseOptionalString(admin_response) || null,
      },
    ];

    const isTerminal = ["resolved", "rejected", "closed"].includes(nextStatus);

    const result = await client.query(
      `
      UPDATE complaints
      SET status = $1,
          admin_response = COALESCE($2, admin_response),
          resolved_by = $3,
          evidence_metadata = $4::jsonb,
          status_history = $5::jsonb,
          last_status_change_at = NOW(),
          resolved_at = CASE WHEN $6 THEN COALESCE(resolved_at, NOW()) ELSE resolved_at END,
          sla_breached_at = CASE
            WHEN sla_due_at IS NOT NULL
              AND sla_due_at < NOW()
              AND status IN ('open', 'triage', 'investigating')
              THEN COALESCE(sla_breached_at, NOW())
            ELSE sla_breached_at
          END,
          updated_at = NOW()
      WHERE complaint_id::text = $7
      RETURNING
        complaint_id, buyer_id, seller_id, post_id, complaint_type,
        description, secret_code, status, severity, evidence_metadata,
        sla_due_at, sla_breached_at, status_history, last_status_change_at,
        admin_response, resolved_by, resolved_at, created_at, updated_at
      `,
      [
        status,
        admin_response || null,
        adminId,
        JSON.stringify(mergedEvidence),
        JSON.stringify(nextHistory),
        isTerminal,
        id,
      ]
    );

    await client.query("COMMIT");

    // Fire-and-forget audit log (outside transaction)
    runQuery(
      `
      INSERT INTO audit_logs (user_id, action, details, ip_address, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      `,
      [
        adminId,
        "COMPLAINT_STATUS_UPDATE",
        JSON.stringify({ complaintId: id, from: currentStatus, to: nextStatus }),
        req.ip || null,
      ]
    ).catch(() => {});

    res.json({
      message: `Complaint status updated to ${status}`,
      complaint: mapComplaintForResponse(result.rows[0]),
    });
    } catch (txErr) {
      await client.query("ROLLBACK").catch(() => {});
      throw txErr;
    } finally {
      client.release();
    }
  } catch (err) {
    logger.error("Error updating complaint:", err);
    res.status(500).json({ error: "Failed to update complaint" });
  }
};

/**
 * POST /complaints/:id/evidence
 * Add evidence to an existing complaint (owner or moderator).
 */
exports.addComplaintEvidence = async (req, res) => {
  try {
    const schemaReady = await ensureComplaintsSchema();
    if (!schemaReady) {
      return res.status(503).json({
        error: "Complaints service unavailable",
        details: "Complaints table is not initialized",
      });
    }

    const { id } = req.params;
    const actorId = getComplaintIdentity(req);

    if (!actorId) {
      return res.status(401).json({ error: "Authentication required" });
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
      return res.status(404).json({ error: "Complaint not found" });
    }

    const complaint = currentResult.rows[0];

    if (!canModerate(req) && String(complaint.buyer_id) !== String(actorId)) {
      return res
        .status(403)
        .json({ error: "Not authorized to add evidence to this complaint" });
    }

    const incomingEvidence = normalizeEvidencePayload(req.body);

    if (
      !incomingEvidence.evidence_urls.length &&
      !incomingEvidence.evidence_note &&
      !Object.keys(incomingEvidence.metadata).length
    ) {
      return res.status(400).json({ error: "Evidence payload is empty" });
    }

    const existingEvidence =
      complaint.evidence_metadata &&
      typeof complaint.evidence_metadata === "object"
        ? complaint.evidence_metadata
        : {};

    const mergedEvidence = {
      ...existingEvidence,
      ...incomingEvidence.metadata,
      evidence_urls: [
        ...(Array.isArray(existingEvidence.evidence_urls)
          ? existingEvidence.evidence_urls
          : []),
        ...incomingEvidence.evidence_urls,
      ],
      evidence_note:
        incomingEvidence.evidence_note || existingEvidence.evidence_note || null,
      last_updated_by: actorId,
      last_updated_at: new Date().toISOString(),
    };

    const result = await runQuery(
      `
      UPDATE complaints
      SET evidence_metadata = $1::jsonb,
          updated_at = NOW()
      WHERE complaint_id::text = $2
      RETURNING
        complaint_id, buyer_id, seller_id, post_id, complaint_type,
        description, secret_code, status, severity, evidence_metadata,
        sla_due_at, sla_breached_at, status_history, last_status_change_at,
        admin_response, resolved_by, resolved_at, created_at, updated_at
      `,
      [JSON.stringify(mergedEvidence), id]
    );

    return res.json({
      message: "Complaint evidence updated",
      complaint: mapComplaintForResponse(result.rows[0]),
    });
  } catch (err) {
    logger.error("Error updating complaint evidence:", err);
    return res
      .status(500)
      .json({ error: "Failed to update complaint evidence" });
  }
};

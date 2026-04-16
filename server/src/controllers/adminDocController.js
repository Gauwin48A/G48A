const path = require("path");
const fs = require("fs");
const fsp = fs.promises;
const logger = require("../utils/logger");
const { runQuery, getAuthUserId } = require("../utils/dbHelpers");
const { parsePositiveInt } = require("../utils/parseHelpers");
const {
  listReviewQueue,
  reviewQueueItem,
} = require("../services/kycAutomationService");

/**
 * Check if a role string represents an admin role.
 * @param {string|null|undefined} role
 * @returns {boolean}
 */
function isAdminRole(role) {
  const normalizedRole = String(role || "").toLowerCase();
  return normalizedRole === "admin" || normalizedRole === "superadmin";
}

const PRIVATE_UPLOADS_DIR = path.join(__dirname, "../../private_uploads");

if (!fs.existsSync(PRIVATE_UPLOADS_DIR)) {
  fs.mkdirSync(PRIVATE_UPLOADS_DIR, { recursive: true });
  logger.info("[Admin] Created private_uploads directory");
}

/**
 * Check whether a user is an admin, optionally using a role hint to avoid a DB query.
 * Falls back to querying the users table if the hint is not admin.
 * @param {string} userId - The user ID to check
 * @param {string|null} [userRoleHint=null] - Optional role from the request token
 * @returns {Promise<boolean>}
 */
const isAdmin = async (userId, userRoleHint = null) => {
  try {
    if (isAdminRole(userRoleHint)) {
      return true;
    }
    const result = await runQuery(
      `SELECT COALESCE(NULLIF(to_jsonb(u)->>'role', ''), 'user') AS role
       FROM users u
       WHERE u.user_id::text = $1
       LIMIT 1`,
      [userId]
    );
    return isAdminRole(result.rows[0]?.role);
  } catch (error) {
    return false;
  }
};

/**
 * Serve a verification document file to an admin user.
 * Logs an audit entry for every document view.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
const viewDocument = async (req, res) => {
  const userId = getAuthUserId(req);
  const { id } = req.params;

  if (!userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const adminCheck = await isAdmin(userId, req.user?.role);
  if (!adminCheck) {
    return res.status(403).json({ error: "Admin access required" });
  }

  try {
    const result = await runQuery(
      `SELECT document_id, user_id, filename
       FROM verification_documents
       WHERE document_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Document not found" });
    }

    const doc = result.rows[0];
    const filename = String(doc.filename || "").trim();
    const safeFilename = path.basename(filename);

    if (!safeFilename || safeFilename !== filename) {
      logger.warn("[Admin] Rejected unsafe verification filename", {
        documentId: id,
        filename,
      });
      return res.status(400).json({ error: "Invalid document path" });
    }

    const filePath = path.join(PRIVATE_UPLOADS_DIR, safeFilename);

    try {
      await fsp.access(filePath, fs.constants.F_OK);
    } catch {
      return res.status(404).json({ error: "File not found on disk" });
    }

    await runQuery(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, created_at)
       VALUES ($1, 'VIEW_DOCUMENT', 'verification_document', $2, $3, NOW())`,
      [userId, id, JSON.stringify({ viewed_user: doc.user_id })]
    );

    res.sendFile(safeFilename, { root: PRIVATE_UPLOADS_DIR });
  } catch (error) {
    logger.error("[Admin] View document error:", error);
    res.status(500).json({ error: "Failed to retrieve document" });
  }
};

/**
 * List pending verification documents with pagination.
 * Returns documents joined with user and profile info.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
const listVerifications = async (req, res) => {
  const userId = getAuthUserId(req);

  if (!userId || !(await isAdmin(userId, req.user?.role))) {
    return res.status(403).json({ error: "Admin access required" });
  }

  try {
    const page = parsePositiveInt(req.query.page, 1);
    const limit = parsePositiveInt(req.query.limit, 50, 200);
    const offset = (page - 1) * limit;

    const result = await runQuery(
      `SELECT
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
         u.email,
         p.full_name
       FROM verification_documents vd
       JOIN users u ON u.user_id = vd.user_id
       LEFT JOIN profiles p ON p.user_id = vd.user_id
       WHERE vd.status = 'pending'
       ORDER BY vd.created_at ASC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const total = result.rows.length
      ? Number(result.rows[0].total_count) || 0
      : 0;
    const verifications = result.rows.map(
      ({ total_count, ...row }) => row
    );

    res.json({ verifications, total, page, limit });
  } catch (error) {
    logger.error("[Admin] List verifications error:", error);
    res.status(500).json({ error: "Failed to list verifications" });
  }
};

/**
 * Review (approve or reject) a verification document.
 * Updates the document status, optionally marks the user as verified,
 * sends a notification, and creates an audit log entry.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
const reviewVerification = async (req, res) => {
  const userId = getAuthUserId(req);
  const { id } = req.params;
  const { status, notes } = req.body;

  if (!userId || !(await isAdmin(userId, req.user?.role))) {
    return res.status(403).json({ error: "Admin access required" });
  }

  if (!["approved", "rejected"].includes(status)) {
    return res
      .status(400)
      .json({ error: "Status must be approved or rejected" });
  }

  try {
    const result = await runQuery(
      `UPDATE verification_documents
       SET status = $1, reviewed_by = $2, review_notes = $3, reviewed_at = NOW()
       WHERE document_id = $4
       RETURNING
         document_id,
         user_id,
         status,
         reviewed_by,
         review_notes,
         reviewed_at,
         created_at,
         updated_at`,
      [status, userId, notes || "", id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Verification not found" });
    }

    const doc = result.rows[0];

    if (status === "approved") {
      await runQuery(
        `UPDATE users SET is_verified = true, verified_at = NOW() WHERE user_id = $1`,
        [doc.user_id]
      );
    }

    await runQuery(
      `INSERT INTO notifications (user_id, title, message, type, created_at)
       VALUES ($1, $2, $3, 'verification_result', NOW())`,
      [
        doc.user_id,
        status === "approved"
          ? "Verification Approved! \u2705"
          : "Verification Rejected",
        status === "approved"
          ? "Your account has been verified. You now have access to premium features."
          : `Your verification was not approved. Reason: ${notes || "Please try again with clearer documents."}`,
      ]
    );

    await runQuery(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, created_at)
       VALUES ($1, $2, 'verification_document', $3, $4, NOW())`,
      [
        userId,
        `VERIFICATION_${status.toUpperCase()}`,
        id,
        JSON.stringify({ notes }),
      ]
    );

    res.json({ message: `Verification ${status}`, document: result.rows[0] });
  } catch (error) {
    logger.error("[Admin] Review verification error:", error);
    res.status(500).json({ error: "Failed to review verification" });
  }
};

/**
 * Run auto-validation on a verification document (mock/stub).
 * Returns a simulated confidence score and extracted data.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
const autoValidateDocument = async (req, res) => {
  const { id } = req.params;
  const userId = getAuthUserId(req);

  if (!userId || !(await isAdmin(userId, req.user?.role))) {
    return res.status(403).json({ error: "Admin access required" });
  }

  try {
    logger.info(`[Admin] Auto-validating document ${id}...`);

    await new Promise((resolve) => setTimeout(resolve, 500));

    const mockResult = {
      confidence: 0.92,
      extracted_data: {
        id_type: "AADHAAR",
        id_number: "**** **** 4321",
        name_match: true,
        dob_match: true,
        expiry_valid: true,
      },
      issues: [],
      recommendation: "APPROVE",
    };

    res.json(mockResult);
  } catch (error) {
    logger.error("[Admin] Auto-validate error:", error);
    res.status(500).json({ error: "Auto-validation failed" });
  }
};

/**
 * List the KYC review queue with status filtering and pagination.
 * Delegates to the kycAutomationService.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
const listKycReviewQueue = async (req, res) => {
  const userId = getAuthUserId(req);

  if (!userId || !(await isAdmin(userId, req.user?.role))) {
    return res.status(403).json({ error: "Admin access required" });
  }

  try {
    const status = req.query.status
      ? String(req.query.status).trim().toLowerCase()
      : "pending";
    const page = parsePositiveInt(req.query.page, 1);
    const limit = parsePositiveInt(req.query.limit, 50, 200);

    const payload = await listReviewQueue({ status, page, limit });
    return res.json(payload);
  } catch (error) {
    logger.error("[Admin] KYC queue list error:", error);
    return res.status(500).json({ error: "Failed to fetch KYC review queue" });
  }
};

/**
 * Review a single KYC queue item (approve/reject).
 * Delegates to the kycAutomationService.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
const reviewKycQueueItem = async (req, res) => {
  const reviewerId = getAuthUserId(req);
  const { queueId } = req.params;
  const { decision, notes } = req.body;

  if (!reviewerId || !(await isAdmin(reviewerId, req.user?.role))) {
    return res.status(403).json({ error: "Admin access required" });
  }

  if (!queueId) {
    return res.status(400).json({ error: "Queue ID is required" });
  }

  try {
    const result = await reviewQueueItem({
      queueId,
      reviewerId,
      decision,
      notes,
    });

    if (result.not_found) {
      return res.status(404).json({ error: "KYC queue item not found" });
    }
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    return res.json({ success: true, review: result });
  } catch (error) {
    logger.error("[Admin] KYC queue review error:", error);
    return res
      .status(500)
      .json({ error: "Failed to review KYC queue item" });
  }
};

module.exports = {
  viewDocument,
  listVerifications,
  reviewVerification,
  autoValidateDocument,
  listKycReviewQueue,
  reviewKycQueueItem,
  PRIVATE_UPLOADS_DIR,
};

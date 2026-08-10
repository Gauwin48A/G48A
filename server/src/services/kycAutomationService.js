/**
 * KYC Automation Service
 *
 * Handles automated KYC processing: validates Aadhaar / PAN inputs,
 * simulates OCR extraction, routes decisions (auto-approve, manual
 * review, auto-reject), persists to a review queue, and supports
 * manual review by admins.
 */

const { runQuery, pool, parseOptionalString } = require("../utils/dbHelpers");
const logger = require("../utils/logger");

/* ------------------------------------------------------------------ */
/*  Configuration                                                     */
/* ------------------------------------------------------------------ */

const DEFAULT_AUTO_APPROVE_THRESHOLD = Number.parseFloat(
  process.env.KYC_AUTO_APPROVE_THRESHOLD || "0.9"
);

const DEFAULT_MANUAL_REVIEW_THRESHOLD = Number.parseFloat(
  process.env.KYC_MANUAL_REVIEW_THRESHOLD || "0.7"
);

let schemaReadyPromise = null;

/* ------------------------------------------------------------------ */
/*  Internal helpers                                                  */
/* ------------------------------------------------------------------ */

/**
 * Mask an Aadhaar number, showing only the last 4 digits.
 * @param {string} aadhaarNumber
 * @returns {string|null}
 */
function maskAadhaar(aadhaarNumber) {
  const digits = String(aadhaarNumber || "").replace(/\D/g, "");
  if (!digits) return null;
  return `XXXX-XXXX-${digits.slice(-4)}`;
}

/**
 * Mask a PAN number, showing only the last 4 characters.
 * @param {string} panNumber
 * @returns {string|null}
 */
function maskPan(panNumber) {
  const normalized = String(panNumber || "").trim().toUpperCase();
  if (!normalized) return null;
  return `XXXXX${normalized.slice(-4)}`;
}

/**
 * Normalize an Aadhaar number to digits only.
 * @param {string} aadhaarNumber
 * @returns {string|null}
 */
function normalizeAadhaar(aadhaarNumber) {
  const digits = String(aadhaarNumber || "").replace(/\D/g, "");
  return digits || null;
}

/**
 * Normalize a PAN number to uppercase, no whitespace.
 * @param {string} panNumber
 * @returns {string|null}
 */
function normalizePan(panNumber) {
  const normalized = String(panNumber || "").trim().toUpperCase().replace(/\s+/g, "");
  return normalized || null;
}

/**
 * Validate Aadhaar and/or PAN inputs, returning errors and risk flags.
 *
 * The validation is docType-aware: when a single document type is submitted
 * (native app flow — one doc number + front/back images), only that type is
 * validated. When no docType is supplied (web flow — both numbers), both are
 * checked. Passport / driving license routes always to manual review.
 * @param {string} aadhaarNumber
 * @param {string} panNumber
 * @param {object} documents - Must contain at least { front }.
 * @param {string} [docType=null] - Optional "aadhaar" | "pan" | "passport" | "driving_license"
 * @returns {{ normalizedAadhaar: string|null, normalizedPan: string|null, aadhaarValid: boolean, panValid: boolean, errors: string[], riskFlags: string[] }}
 */
function validateKycInputs(aadhaarNumber, panNumber, documents = {}, docType = null) {
  const errors = [];
  const riskFlags = [];
  const normalizedType = String(docType || "").trim().toLowerCase();

  const normalizedAadhaar = normalizeAadhaar(aadhaarNumber);
  const normalizedPan = normalizePan(panNumber);

  const aadhaarValid = Boolean(normalizedAadhaar && /^\d{12}$/.test(normalizedAadhaar));
  const panValid = Boolean(normalizedPan && /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(normalizedPan));

  // Only validate the doc type(s) actually submitted.
  const checkAadhaar = !normalizedType || normalizedType === "aadhaar";
  const checkPan = !normalizedType || normalizedType === "pan";

  if (checkAadhaar && normalizedAadhaar && !aadhaarValid) {
    errors.push("Invalid Aadhaar format. Expected 12 digits.");
    riskFlags.push("invalid_aadhaar_format");
  } else if (checkAadhaar && aadhaarValid && /^(\d)\1{11}$/.test(normalizedAadhaar)) {
    errors.push("Aadhaar number appears invalid.");
    riskFlags.push("aadhaar_repeating_digits");
  }

  if (checkPan && normalizedPan && !panValid) {
    errors.push("Invalid PAN format. Expected ABCDE1234F.");
    riskFlags.push("invalid_pan_format");
  }

  // Passport / DL can't be auto-validated locally → manual review.
  if (normalizedType && normalizedType !== "aadhaar" && normalizedType !== "pan") {
    riskFlags.push("manual_review_document_type");
  }

  if (!documents.front) {
    errors.push("Front-side KYC document is missing.");
    riskFlags.push("missing_front_document");
  }

  if (!documents.back) {
    riskFlags.push("missing_back_document");
  }

  return {
    normalizedAadhaar,
    normalizedPan,
    aadhaarValid,
    panValid,
    errors,
    riskFlags,
  };
}

/**
 * Simulate OCR extraction and compute a confidence score.
 * @param {object} params
 * @param {string|null} params.normalizedAadhaar
 * @param {string|null} params.normalizedPan
 * @param {object} params.documents
 * @param {object} params.validation
 * @returns {{ provider: string, extracted: object, confidence: number }}
 */
function buildOcrExtractionResult({ normalizedAadhaar, normalizedPan, documents, validation }) {
  let confidence = 0.95;

  if (!documents.back) confidence -= 0.08;
  if (!validation.aadhaarValid) confidence -= 0.45;
  if (!validation.panValid) confidence -= 0.35;
  if (validation.riskFlags.includes("aadhaar_repeating_digits")) confidence -= 0.15;

  const boundedConfidence = Math.max(0, Math.min(0.99, Number(confidence.toFixed(2))));

  return {
    provider: process.env.KYC_OCR_PROVIDER || "mock_ocr",
    extracted: {
      aadhaar_number: normalizedAadhaar ? maskAadhaar(normalizedAadhaar) : null,
      pan_number: normalizedPan ? maskPan(normalizedPan) : null,
      document_count: [documents.front, documents.back].filter(Boolean).length,
    },
    confidence: boundedConfidence,
  };
}

/**
 * Decide the KYC routing: auto_approved, manual_review, or auto_rejected.
 *
 * Rules:
 *  - Passport / driving license → manual_review (no local OCR provider).
 *  - A valid Aadhaar with high confidence & no risk flags → auto_approved.
 *  - PAN-only or medium confidence → manual_review.
 *  - Invalid / unverifiable → auto_rejected.
 * @param {object} params
 * @param {object} params.validation
 * @param {number} params.ocrConfidence
 * @param {string} [params.docType=null]
 * @returns {{ decision: string, reason: string }}
 */
function decideKycRoute({ validation, ocrConfidence, docType = null }) {
  const normalizedType = String(docType || "").trim().toLowerCase();
  const isManualType =
    normalizedType && normalizedType !== "aadhaar" && normalizedType !== "pan";

  // Passport / DL / any other type cannot be auto-verified locally.
  if (isManualType) {
    return {
      decision: "manual_review",
      reason: "This document type requires manual review by our verification team.",
    };
  }

  const hasValidDoc = validation.aadhaarValid || validation.panValid;
  if (!hasValidDoc) {
    return {
      decision: "auto_rejected",
      reason: validation.errors.join(" ") || "No valid document number provided.",
    };
  }

  // Auto-approve only when a verifiable Aadhaar is present with high confidence.
  const autoApprovalEligible =
    validation.aadhaarValid &&
    ocrConfidence >= DEFAULT_AUTO_APPROVE_THRESHOLD &&
    validation.riskFlags.length === 0;

  if (autoApprovalEligible) {
    return {
      decision: "auto_approved",
      reason: "KYC validated automatically with high confidence.",
    };
  }

  if (ocrConfidence >= DEFAULT_MANUAL_REVIEW_THRESHOLD || validation.panValid) {
    return {
      decision: "manual_review",
      reason: "Manual review required due to medium confidence, PAN-only submission, or minor risk flags.",
    };
  }

  return {
    decision: "auto_rejected",
    reason: "KYC confidence too low. Please resubmit clearer documents.",
  };
}

/* ------------------------------------------------------------------ */
/*  Schema bootstrapping                                              */
/* ------------------------------------------------------------------ */

/**
 * Ensure the kyc_review_queue table and indexes exist.
 * @returns {Promise<boolean|void>}
 */
async function ensureSchema() {
  if (!schemaReadyPromise) {
    schemaReadyPromise = (async () => {
      await runQuery(`
        CREATE TABLE IF NOT EXISTS kyc_review_queue (
          queue_id BIGSERIAL PRIMARY KEY,
          user_id TEXT NOT NULL,
          aadhaar_number_masked TEXT,
          pan_number_masked TEXT,
          documents JSONB NOT NULL DEFAULT '{}'::jsonb,
          ocr_data JSONB NOT NULL DEFAULT '{}'::jsonb,
          confidence NUMERIC(5, 2) NOT NULL DEFAULT 0,
          risk_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
          decision VARCHAR(32) NOT NULL,
          decision_reason TEXT,
          status VARCHAR(24) NOT NULL DEFAULT 'pending',
          reviewed_by TEXT,
          review_notes TEXT,
          reviewed_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          processed_at TIMESTAMPTZ
        )
      `);
      await runQuery(
        "CREATE INDEX IF NOT EXISTS idx_kyc_review_queue_status_created ON kyc_review_queue(status, created_at DESC)"
      );
      await runQuery(
        "CREATE INDEX IF NOT EXISTS idx_kyc_review_queue_user_created ON kyc_review_queue(user_id, created_at DESC)"
      );
    })().catch((err) => {
      logger.warn("[KYC] Schema check failed; queue persistence disabled", {
        message: err.message,
      });
      return false;
    });
  }
  return schemaReadyPromise;
}

/* ------------------------------------------------------------------ */
/*  Database mutation helpers                                         */
/* ------------------------------------------------------------------ */

/**
 * Apply a KYC decision to the users table AND sync the kyc_verifications
 * row so GET /api/users/kyc/status reflects the latest outcome.
 * @param {string} userId
 * @param {string} decision
 * @param {string|null} reason
 * @returns {Promise<string>} New aadhaar_status value.
 */
async function applyDecisionToUser(userId, decision, reason = null) {
  let status = "PENDING";

  if (decision === "auto_approved" || decision === "manual_approved") {
    status = "VERIFIED";
    await runQuery(
      `UPDATE users
       SET aadhaar_status = 'VERIFIED', kyc_status = 'VERIFIED', kyc_verified = true, rejection_reason = NULL
       WHERE user_id::text = $1`,
      [String(userId)]
    );
  } else if (decision === "auto_rejected" || decision === "manual_rejected") {
    status = "REJECTED";
    await runQuery(
      `UPDATE users
       SET aadhaar_status = 'REJECTED', kyc_status = 'REJECTED', kyc_verified = false, rejection_reason = $2
       WHERE user_id::text = $1`,
      [String(userId), reason || "KYC verification failed. Please resubmit valid documents."]
    );
  } else {
    await runQuery(
      `UPDATE users
       SET aadhaar_status = 'PENDING', kyc_status = 'PENDING', kyc_verified = false, rejection_reason = NULL
       WHERE user_id::text = $1`,
      [String(userId)]
    );
  }

  // Keep kyc_verifications in sync so /kyc/status shows the new state.
  try {
    await runQuery(
      `INSERT INTO kyc_verifications (user_id, status, verified_at, updated_at)
       VALUES ($1, $2, CASE WHEN $2 = 'VERIFIED' THEN NOW() ELSE NULL END, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET
         status = EXCLUDED.status,
         verified_at = CASE WHEN EXCLUDED.status = 'VERIFIED' THEN NOW() ELSE kyc_verifications.verified_at END,
         updated_at = NOW()`,
      [String(userId), status]
    );
  } catch (err) {
    logger.warn("[KYC] Failed to sync kyc_verifications", {
      userId,
      message: err.message,
    });
  }

  return status;
}

/**
 * Send a KYC status notification to the user.
 * @param {string} userId
 * @param {string} decision
 * @param {string} reason
 */
async function sendKycNotification(userId, decision, reason) {
  const payloadMap = {
    auto_approved: {
      title: "KYC Verified",
      message: "Your KYC has been auto-approved successfully.",
    },
    manual_review: {
      title: "KYC Under Review",
      message: "Your KYC is in manual review. You will be notified once it is completed.",
    },
    auto_rejected: {
      title: "KYC Rejected",
      message: reason || "Your KYC could not be verified automatically. Please resubmit.",
    },
    manual_approved: {
      title: "KYC Approved",
      message: "Your KYC has been approved by the review team.",
    },
    manual_rejected: {
      title: "KYC Rejected",
      message: reason || "Your KYC was rejected by the review team. Please resubmit.",
    },
  };

  const notification = payloadMap[decision];
  if (!notification) return;

  try {
    await runQuery(
      `INSERT INTO notifications (user_id, type, title, message, created_at)
       VALUES ($1, 'kyc_status', $2, $3, NOW())`,
      [String(userId), notification.title, notification.message]
    );
  } catch (err) {
    logger.warn("[KYC] Failed to create KYC notification", {
      message: err.message,
      userId,
    });
  }
}

/**
 * Insert a row into the kyc_review_queue.
 * @param {object} params
 * @returns {Promise<{ queueId: number|null, persisted: boolean }>}
 */
async function enqueueKycDecision({
  userId,
  aadhaarMasked,
  panMasked,
  documents,
  ocrData,
  confidence,
  riskFlags,
  decision,
  reason,
}) {
  const schemaReady = await ensureSchema();
  if (schemaReady === false) {
    return { queueId: null, persisted: false };
  }

  try {
    const status = decision === "manual_review" ? "pending" : "processed";
    const result = await runQuery(
      `INSERT INTO kyc_review_queue (
         user_id, aadhaar_number_masked, pan_number_masked,
         documents, ocr_data, confidence, risk_flags,
         decision, decision_reason, status, processed_at
       )
       VALUES (
         $1, $2, $3, $4::jsonb, $5::jsonb, $6, $7::jsonb, $8, $9, $10,
         CASE WHEN $10 = 'processed' THEN NOW() ELSE NULL END
       )
       RETURNING queue_id`,
      [
        String(userId),
        aadhaarMasked,
        panMasked,
        JSON.stringify(documents || {}),
        JSON.stringify(ocrData || {}),
        confidence,
        JSON.stringify(riskFlags || []),
        decision,
        reason,
        status,
      ]
    );

    return { queueId: result.rows[0]?.queue_id || null, persisted: true };
  } catch (err) {
    logger.warn("[KYC] Failed to enqueue review queue row", {
      message: err.message,
      userId,
    });
    return { queueId: null, persisted: false };
  }
}

/* ------------------------------------------------------------------ */
/*  Public API                                                        */
/* ------------------------------------------------------------------ */

/**
 * Process a full KYC submission: validate, OCR, route, persist, notify.
 * @param {object} params
 * @param {string} params.userId
 * @param {string} [params.docType=null] - "aadhaar" | "pan" | "passport" | "driving_license"
 * @param {string} params.aadhaarNumber
 * @param {string} params.panNumber
 * @param {object} params.documents - { front, back?, selfie? }
 * @returns {Promise<object>} Processing result with decision, confidence, flags.
 */
async function processKycSubmission({
  userId,
  docType = null,
  aadhaarNumber,
  panNumber,
  documents,
}) {
  const validation = validateKycInputs(
    aadhaarNumber,
    panNumber,
    documents || {},
    docType
  );

  const ocrResult = buildOcrExtractionResult({
    normalizedAadhaar: validation.normalizedAadhaar,
    normalizedPan: validation.normalizedPan,
    documents: documents || {},
    validation,
  });

  const routing = decideKycRoute({
    validation,
    ocrConfidence: ocrResult.confidence,
    docType,
  });

  const queueResult = await enqueueKycDecision({
    userId,
    aadhaarMasked: maskAadhaar(validation.normalizedAadhaar),
    panMasked: maskPan(validation.normalizedPan),
    documents,
    ocrData: ocrResult,
    confidence: ocrResult.confidence,
    riskFlags: validation.riskFlags,
    decision: routing.decision,
    reason: routing.reason,
  });

  const userStatus = await applyDecisionToUser(userId, routing.decision, routing.reason);
  await sendKycNotification(userId, routing.decision, routing.reason);

  return {
    queue_id: queueResult.queueId,
    queue_persisted: queueResult.persisted,
    decision: routing.decision,
    decision_reason: routing.reason,
    user_status: userStatus,
    confidence: ocrResult.confidence,
    risk_flags: validation.riskFlags,
    validation_errors: validation.errors,
  };
}

/**
 * List KYC review queue entries with pagination.
 * @param {object} params
 * @param {string} [params.status="pending"] - Filter status ("pending", "processed", "all").
 * @param {number} [params.page=1]
 * @param {number} [params.limit=50]
 * @returns {Promise<{ queue: object[], total: number, page: number, limit: number, available: boolean }>}
 */
async function listReviewQueue({ status = "pending", page = 1, limit = 50 }) {
  const schemaReady = await ensureSchema();
  if (schemaReady === false) {
    return { queue: [], total: 0, page, limit, available: false };
  }

  const normalizedStatus = String(status || "pending").trim().toLowerCase();
  const safePage = Math.max(1, Number.parseInt(page, 10) || 1);
  const safeLimit = Math.min(200, Math.max(1, Number.parseInt(limit, 10) || 50));
  const offset = (safePage - 1) * safeLimit;

  const values = [safeLimit, offset];
  let statusSql = "";

  if (normalizedStatus !== "all") {
    values.unshift(normalizedStatus);
    statusSql = "WHERE status = $1";
  }

  const limitPlaceholder = normalizedStatus === "all" ? "$1" : "$2";
  const offsetPlaceholder = normalizedStatus === "all" ? "$2" : "$3";

  const result = await runQuery(
    `SELECT
       COUNT(*) OVER()::int AS total_count,
       queue_id, user_id, aadhaar_number_masked, pan_number_masked,
       documents, ocr_data, confidence, risk_flags, decision, decision_reason,
       status, reviewed_by, review_notes, reviewed_at,
       created_at, processed_at
     FROM kyc_review_queue
     ${statusSql}
     ORDER BY created_at ASC
     LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}`,
    values
  );

  const total = result.rows.length ? Number(result.rows[0].total_count) || 0 : 0;
  const queue = result.rows.map(({ total_count, ...row }) => row);

  return { queue, total, page: safePage, limit: safeLimit, available: true };
}

/**
 * Manually review a KYC queue item (approve or reject).
 * Uses a transaction with row locking to prevent races.
 * @param {object} params
 * @param {number} params.queueId
 * @param {string} params.reviewerId
 * @param {string} params.decision - "approve" or "reject"
 * @param {string} [params.notes]
 * @returns {Promise<object>}
 */
async function reviewQueueItem({ queueId, reviewerId, decision, notes }) {
  const schemaReady = await ensureSchema();
  if (schemaReady === false) {
    return { available: false, error: "KYC review queue unavailable" };
  }

  const normalizedDecision = String(decision || "").trim().toLowerCase();
  if (!["approve", "reject"].includes(normalizedDecision)) {
    return { available: true, error: "Decision must be approve or reject" };
  }

  const mappedDecision =
    normalizedDecision === "approve" ? "manual_approved" : "manual_rejected";

  const reason =
    normalizedDecision === "reject"
      ? parseOptionalString(notes) || "KYC rejected during manual review."
      : parseOptionalString(notes) || "KYC approved during manual review.";

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const queueResult = await client.query(
      `SELECT queue_id, user_id, status
       FROM kyc_review_queue
       WHERE queue_id = $1
       FOR UPDATE`,
      [queueId]
    );

    if (!queueResult.rows.length) {
      await client.query("ROLLBACK");
      return { available: true, not_found: true };
    }

    const queueItem = queueResult.rows[0];
    const reviewNotes = parseOptionalString(notes);

    await client.query(
      `UPDATE kyc_review_queue
       SET decision = $1,
           decision_reason = $2,
           status = 'processed',
           reviewed_by = $3,
           review_notes = $4,
           reviewed_at = NOW(),
           processed_at = NOW()
       WHERE queue_id = $5`,
      [mappedDecision, reason, String(reviewerId), reviewNotes, queueId]
    );

    // Apply the decision consistently (users + kyc_verifications) so the
    // user's GET /kyc/status reflects the outcome immediately.
    if (mappedDecision === "manual_approved") {
      await client.query(
        `UPDATE users
         SET aadhaar_status = 'VERIFIED', kyc_status = 'VERIFIED', kyc_verified = true, rejection_reason = NULL
         WHERE user_id::text = $1`,
        [String(queueItem.user_id)]
      );
    } else {
      await client.query(
        `UPDATE users
         SET aadhaar_status = 'REJECTED', kyc_status = 'REJECTED', kyc_verified = false, rejection_reason = $2
         WHERE user_id::text = $1`,
        [String(queueItem.user_id), reason]
      );
    }

    await client.query(
      `INSERT INTO kyc_verifications (user_id, status, verified_at, updated_at)
       VALUES ($1, $2, CASE WHEN $2 = 'VERIFIED' THEN NOW() ELSE NULL END, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET
         status = EXCLUDED.status,
         verified_at = CASE WHEN EXCLUDED.status = 'VERIFIED' THEN NOW() ELSE kyc_verifications.verified_at END,
         updated_at = NOW()`,
      [
        String(queueItem.user_id),
        mappedDecision === "manual_approved" ? "VERIFIED" : "REJECTED",
      ]
    ).catch((err) => {
      logger.warn("[KYC] Failed to sync kyc_verifications after manual review", {
        userId: queueItem.user_id,
        message: err.message,
      });
    });

    await client.query("COMMIT");
    await sendKycNotification(queueItem.user_id, mappedDecision, reason);

    return {
      available: true,
      reviewed: true,
      queue_id: queueId,
      user_id: queueItem.user_id,
      decision: mappedDecision,
      reason,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    logger.error("[KYC] Manual review failed", err);
    return { available: true, error: "Failed to review KYC queue item" };
  } finally {
    client.release();
  }
}

/* ------------------------------------------------------------------ */
/*  Exports                                                           */
/* ------------------------------------------------------------------ */

module.exports = {
  processKycSubmission,
  listReviewQueue,
  reviewQueueItem,
};

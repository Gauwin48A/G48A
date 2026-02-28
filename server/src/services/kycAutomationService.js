const pool = require('../config/db');
const logger = require('../utils/logger');

const DB_QUERY_TIMEOUT_MS = Number.parseInt(process.env.DB_QUERY_TIMEOUT_MS, 10) || 10000;
const DEFAULT_AUTO_APPROVE_THRESHOLD = Number.parseFloat(process.env.KYC_AUTO_APPROVE_THRESHOLD || '0.9');
const DEFAULT_MANUAL_REVIEW_THRESHOLD = Number.parseFloat(process.env.KYC_MANUAL_REVIEW_THRESHOLD || '0.7');

let schemaReadyPromise = null;

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

function maskAadhaar(aadhaarNumber) {
    const digits = String(aadhaarNumber || '').replace(/\D/g, '');
    if (!digits) return null;
    return `XXXX-XXXX-${digits.slice(-4)}`;
}

function maskPan(panNumber) {
    const normalized = String(panNumber || '').trim().toUpperCase();
    if (!normalized) return null;
    return `XXXXX${normalized.slice(-4)}`;
}

function normalizeAadhaar(aadhaarNumber) {
    const digits = String(aadhaarNumber || '').replace(/\D/g, '');
    return digits || null;
}

function normalizePan(panNumber) {
    const normalized = String(panNumber || '').trim().toUpperCase().replace(/\s+/g, '');
    return normalized || null;
}

function validateKycInputs(aadhaarNumber, panNumber, documents = {}) {
    const errors = [];
    const riskFlags = [];

    const normalizedAadhaar = normalizeAadhaar(aadhaarNumber);
    const normalizedPan = normalizePan(panNumber);

    const aadhaarValid = Boolean(normalizedAadhaar && /^\d{12}$/.test(normalizedAadhaar));
    const panValid = Boolean(normalizedPan && /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(normalizedPan));

    if (!aadhaarValid) {
        errors.push('Invalid Aadhaar format. Expected 12 digits.');
        riskFlags.push('invalid_aadhaar_format');
    } else if (/^(\d)\1{11}$/.test(normalizedAadhaar)) {
        errors.push('Aadhaar number appears invalid.');
        riskFlags.push('aadhaar_repeating_digits');
    }

    if (!panValid) {
        errors.push('Invalid PAN format. Expected ABCDE1234F.');
        riskFlags.push('invalid_pan_format');
    }

    if (!documents.front) {
        errors.push('Front-side KYC document is missing.');
        riskFlags.push('missing_front_document');
    }

    if (!documents.back) {
        riskFlags.push('missing_back_document');
    }

    return {
        normalizedAadhaar,
        normalizedPan,
        aadhaarValid,
        panValid,
        errors,
        riskFlags
    };
}

function buildOcrExtractionResult({ normalizedAadhaar, normalizedPan, documents, validation }) {
    // OCR placeholder with deterministic extraction quality. Can be replaced with real provider integration.
    let confidence = 0.95;

    if (!documents.back) confidence -= 0.08;
    if (!validation.aadhaarValid) confidence -= 0.45;
    if (!validation.panValid) confidence -= 0.35;
    if (validation.riskFlags.includes('aadhaar_repeating_digits')) confidence -= 0.15;

    const boundedConfidence = Math.max(0, Math.min(0.99, Number(confidence.toFixed(2))));

    return {
        provider: process.env.KYC_OCR_PROVIDER || 'mock_ocr',
        extracted: {
            aadhaar_number: normalizedAadhaar ? maskAadhaar(normalizedAadhaar) : null,
            pan_number: normalizedPan ? maskPan(normalizedPan) : null,
            document_count: [documents.front, documents.back].filter(Boolean).length
        },
        confidence: boundedConfidence
    };
}

function decideKycRoute({ validation, ocrConfidence }) {
    if (!validation.aadhaarValid || !validation.panValid) {
        return {
            decision: 'auto_rejected',
            reason: validation.errors.join(' ')
        };
    }

    if (ocrConfidence >= DEFAULT_AUTO_APPROVE_THRESHOLD && validation.riskFlags.length === 0) {
        return {
            decision: 'auto_approved',
            reason: 'KYC validated automatically with high confidence.'
        };
    }

    if (ocrConfidence >= DEFAULT_MANUAL_REVIEW_THRESHOLD) {
        return {
            decision: 'manual_review',
            reason: 'Manual review required due to medium confidence or minor risk flags.'
        };
    }

    return {
        decision: 'auto_rejected',
        reason: 'KYC confidence too low. Please resubmit clearer documents.'
    };
}

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
            await runQuery('CREATE INDEX IF NOT EXISTS idx_kyc_review_queue_status_created ON kyc_review_queue(status, created_at DESC)');
            await runQuery('CREATE INDEX IF NOT EXISTS idx_kyc_review_queue_user_created ON kyc_review_queue(user_id, created_at DESC)');
        })().catch((err) => {
            logger.warn('[KYC] Schema check failed; queue persistence disabled', { message: err.message });
            return false;
        });
    }

    return schemaReadyPromise;
}

async function applyDecisionToUser(userId, decision, reason = null) {
    if (decision === 'auto_approved' || decision === 'manual_approved') {
        await runQuery(
            `
                UPDATE users
                SET aadhaar_status = 'VERIFIED',
                    rejection_reason = NULL
                WHERE user_id::text = $1
            `,
            [String(userId)]
        );
        return 'VERIFIED';
    }

    if (decision === 'auto_rejected' || decision === 'manual_rejected') {
        await runQuery(
            `
                UPDATE users
                SET aadhaar_status = 'REJECTED',
                    rejection_reason = $2
                WHERE user_id::text = $1
            `,
            [String(userId), reason || 'KYC verification failed. Please resubmit valid documents.']
        );
        return 'REJECTED';
    }

    await runQuery(
        `
            UPDATE users
            SET aadhaar_status = 'PENDING',
                rejection_reason = NULL
            WHERE user_id::text = $1
        `,
        [String(userId)]
    );
    return 'PENDING';
}

async function sendKycNotification(userId, decision, reason) {
    const payloadMap = {
        auto_approved: {
            title: 'KYC Verified',
            message: 'Your KYC has been auto-approved successfully.'
        },
        manual_review: {
            title: 'KYC Under Review',
            message: 'Your KYC is in manual review. You will be notified once it is completed.'
        },
        auto_rejected: {
            title: 'KYC Rejected',
            message: reason || 'Your KYC could not be verified automatically. Please resubmit.'
        },
        manual_approved: {
            title: 'KYC Approved',
            message: 'Your KYC has been approved by the review team.'
        },
        manual_rejected: {
            title: 'KYC Rejected',
            message: reason || 'Your KYC was rejected by the review team. Please resubmit.'
        }
    };

    const notification = payloadMap[decision];
    if (!notification) return;

    try {
        await runQuery(
            `
                INSERT INTO notifications (user_id, type, title, message, created_at)
                VALUES ($1, 'kyc_status', $2, $3, NOW())
            `,
            [String(userId), notification.title, notification.message]
        );
    } catch (err) {
        logger.warn('[KYC] Failed to create KYC notification', { message: err.message, userId });
    }
}

async function enqueueKycDecision({
    userId,
    aadhaarMasked,
    panMasked,
    documents,
    ocrData,
    confidence,
    riskFlags,
    decision,
    reason
}) {
    const schemaReady = await ensureSchema();
    if (schemaReady === false) {
        return { queueId: null, persisted: false };
    }

    try {
        const status = decision === 'manual_review' ? 'pending' : 'processed';
        const result = await runQuery(
            `
                INSERT INTO kyc_review_queue (
                    user_id,
                    aadhaar_number_masked,
                    pan_number_masked,
                    documents,
                    ocr_data,
                    confidence,
                    risk_flags,
                    decision,
                    decision_reason,
                    status,
                    processed_at
                )
                VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7::jsonb, $8, $9, $10,
                    CASE WHEN $10 = 'processed' THEN NOW() ELSE NULL END
                )
                RETURNING queue_id
            `,
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
                status
            ]
        );

        return {
            queueId: result.rows[0]?.queue_id || null,
            persisted: true
        };
    } catch (err) {
        logger.warn('[KYC] Failed to enqueue review queue row', { message: err.message, userId });
        return { queueId: null, persisted: false };
    }
}

async function processKycSubmission({ userId, aadhaarNumber, panNumber, documents }) {
    const validation = validateKycInputs(aadhaarNumber, panNumber, documents || {});
    const ocrResult = buildOcrExtractionResult({
        normalizedAadhaar: validation.normalizedAadhaar,
        normalizedPan: validation.normalizedPan,
        documents: documents || {},
        validation
    });
    const routing = decideKycRoute({
        validation,
        ocrConfidence: ocrResult.confidence
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
        reason: routing.reason
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
        validation_errors: validation.errors
    };
}

async function listReviewQueue({ status = 'pending', page = 1, limit = 50 }) {
    const schemaReady = await ensureSchema();
    if (schemaReady === false) {
        return {
            queue: [],
            total: 0,
            page,
            limit,
            available: false
        };
    }

    const normalizedStatus = String(status || 'pending').trim().toLowerCase();
    const safePage = Math.max(1, Number.parseInt(page, 10) || 1);
    const safeLimit = Math.min(200, Math.max(1, Number.parseInt(limit, 10) || 50));
    const offset = (safePage - 1) * safeLimit;

    const values = [safeLimit, offset];
    let statusSql = '';

    if (normalizedStatus !== 'all') {
        values.unshift(normalizedStatus);
        statusSql = 'WHERE status = $1';
    }

    const limitPlaceholder = normalizedStatus === 'all' ? '$1' : '$2';
    const offsetPlaceholder = normalizedStatus === 'all' ? '$2' : '$3';

    const result = await runQuery(
        `
            SELECT
                COUNT(*) OVER()::int AS total_count,
                queue_id,
                user_id,
                aadhaar_number_masked,
                pan_number_masked,
                confidence,
                risk_flags,
                decision,
                decision_reason,
                status,
                reviewed_by,
                review_notes,
                reviewed_at,
                created_at,
                processed_at
            FROM kyc_review_queue
            ${statusSql}
            ORDER BY created_at ASC
            LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}
        `,
        values
    );

    const total = result.rows.length ? Number(result.rows[0].total_count) || 0 : 0;
    const queue = result.rows.map(({ total_count, ...row }) => row);

    return {
        queue,
        total,
        page: safePage,
        limit: safeLimit,
        available: true
    };
}

async function reviewQueueItem({ queueId, reviewerId, decision, notes }) {
    const schemaReady = await ensureSchema();
    if (schemaReady === false) {
        return {
            available: false,
            error: 'KYC review queue unavailable'
        };
    }

    const normalizedDecision = String(decision || '').trim().toLowerCase();
    if (!['approve', 'reject'].includes(normalizedDecision)) {
        return {
            available: true,
            error: 'Decision must be approve or reject'
        };
    }

    const mappedDecision = normalizedDecision === 'approve' ? 'manual_approved' : 'manual_rejected';
    const reason = normalizedDecision === 'reject'
        ? parseOptionalString(notes) || 'KYC rejected during manual review.'
        : parseOptionalString(notes) || 'KYC approved during manual review.';

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const queueResult = await client.query(
            `
                SELECT
                    queue_id,
                    user_id,
                    status
                FROM kyc_review_queue
                WHERE queue_id = $1
                FOR UPDATE
            `,
            [queueId]
        );

        if (!queueResult.rows.length) {
            await client.query('ROLLBACK');
            return {
                available: true,
                not_found: true
            };
        }

        const queueItem = queueResult.rows[0];
        const reviewNotes = parseOptionalString(notes);

        await client.query(
            `
                UPDATE kyc_review_queue
                SET decision = $1,
                    decision_reason = $2,
                    status = 'processed',
                    reviewed_by = $3,
                    review_notes = $4,
                    reviewed_at = NOW(),
                    processed_at = NOW()
                WHERE queue_id = $5
            `,
            [mappedDecision, reason, String(reviewerId), reviewNotes, queueId]
        );

        if (mappedDecision === 'manual_approved') {
            await client.query(
                `
                    UPDATE users
                    SET aadhaar_status = 'VERIFIED',
                        rejection_reason = NULL
                    WHERE user_id::text = $1
                `,
                [String(queueItem.user_id)]
            );
        } else {
            await client.query(
                `
                    UPDATE users
                    SET aadhaar_status = 'REJECTED',
                        rejection_reason = $2
                    WHERE user_id::text = $1
                `,
                [String(queueItem.user_id), reason]
            );
        }

        await client.query('COMMIT');

        await sendKycNotification(queueItem.user_id, mappedDecision, reason);

        return {
            available: true,
            reviewed: true,
            queue_id: queueId,
            user_id: queueItem.user_id,
            decision: mappedDecision,
            reason
        };
    } catch (err) {
        await client.query('ROLLBACK');
        logger.error('[KYC] Manual review failed', err);
        return {
            available: true,
            error: 'Failed to review KYC queue item'
        };
    } finally {
        client.release();
    }
}

module.exports = {
    processKycSubmission,
    listReviewQueue,
    reviewQueueItem
};

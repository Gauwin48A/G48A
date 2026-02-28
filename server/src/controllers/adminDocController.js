/**
 * Admin Document Controller
 * Blue Team Gap 4: Private Verification Storage
 * 
 * Serves verification documents ONLY to authenticated admins
 */

const pool = require('../config/db');
const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const logger = require('../utils/logger');
const { listReviewQueue, reviewQueueItem } = require('../services/kycAutomationService');

const DB_QUERY_TIMEOUT_MS = Number.parseInt(process.env.DB_QUERY_TIMEOUT_MS, 10) || 10000;

function runQuery(text, values = []) {
    return pool.query({
        text,
        values,
        query_timeout: DB_QUERY_TIMEOUT_MS
    });
}

function getRequestUserId(req) {
    return String(req.user?.userId || req.user?.user_id || req.user?.id || '').trim() || null;
}

function parsePositiveInt(value, fallback, max = Number.MAX_SAFE_INTEGER) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isSafeInteger(parsed) || parsed < 1) return fallback;
    return Math.min(parsed, max);
}

function isAdminRole(role) {
    const normalizedRole = String(role || '').toLowerCase();
    return normalizedRole === 'admin' || normalizedRole === 'superadmin';
}

// Private uploads directory (outside public web root)
const PRIVATE_UPLOADS_DIR = path.join(__dirname, '../../private_uploads');

// Ensure directory exists
if (!fs.existsSync(PRIVATE_UPLOADS_DIR)) {
    fs.mkdirSync(PRIVATE_UPLOADS_DIR, { recursive: true });
    logger.info('[Admin] Created private_uploads directory');
}

/**
 * Check if user is admin
 */
const isAdmin = async (userId, userRoleHint = null) => {
    try {
        if (isAdminRole(userRoleHint)) {
            return true;
        }
        const result = await runQuery(
            `
              SELECT COALESCE(NULLIF(to_jsonb(u)->>'role', ''), 'user') AS role
              FROM users u
              WHERE u.user_id::text = $1
              LIMIT 1
            `,
            [userId]
        );
        return isAdminRole(result.rows[0]?.role);
    } catch (error) {
        return false;
    }
};

/**
 * View a private verification document
 * GET /api/admin/view-doc/:id
 * Admin only
 */
const viewDocument = async (req, res) => {
    const userId = getRequestUserId(req);
    const { id } = req.params;

    if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify admin role
    const adminCheck = await isAdmin(userId, req.user?.role);
    if (!adminCheck) {
        return res.status(403).json({ error: 'Admin access required' });
    }

    try {
        // Get document record
        const result = await runQuery(
            `SELECT document_id, user_id, filename
             FROM verification_documents
             WHERE document_id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Document not found' });
        }

        const doc = result.rows[0];
        const filename = String(doc.filename || '').trim();
        const safeFilename = path.basename(filename);

        if (!safeFilename || safeFilename !== filename) {
            logger.warn('[Admin] Rejected unsafe verification filename', {
                documentId: id,
                filename
            });
            return res.status(400).json({ error: 'Invalid document path' });
        }

        const filePath = path.join(PRIVATE_UPLOADS_DIR, safeFilename);

        // Check file exists
        try {
            await fsp.access(filePath, fs.constants.F_OK);
        } catch {
            return res.status(404).json({ error: 'File not found on disk' });
        }

        // Log access for audit
        await runQuery(`
      INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, created_at)
      VALUES ($1, 'VIEW_DOCUMENT', 'verification_document', $2, $3, NOW())
    `, [userId, id, JSON.stringify({ viewed_user: doc.user_id })]);

        // Send file from private root.
        res.sendFile(safeFilename, { root: PRIVATE_UPLOADS_DIR });

    } catch (error) {
        logger.error('[Admin] View document error:', error);
        res.status(500).json({ error: 'Failed to retrieve document' });
    }
};

/**
 * List all pending verification requests
 * GET /api/admin/verifications
 */
const listVerifications = async (req, res) => {
    const userId = getRequestUserId(req);

    if (!userId || !(await isAdmin(userId, req.user?.role))) {
        return res.status(403).json({ error: 'Admin access required' });
    }

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
                u.email,
                p.full_name
              FROM verification_documents vd
              JOIN users u ON u.user_id = vd.user_id
              LEFT JOIN profiles p ON p.user_id = vd.user_id
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
        logger.error('[Admin] List verifications error:', error);
        res.status(500).json({ error: 'Failed to list verifications' });
    }
};

/**
 * Approve or reject verification
 * POST /api/admin/verifications/:id/review
 */
const reviewVerification = async (req, res) => {
    const userId = getRequestUserId(req);
    const { id } = req.params;
    const { status, notes } = req.body; // status: 'approved' | 'rejected'

    if (!userId || !(await isAdmin(userId, req.user?.role))) {
        return res.status(403).json({ error: 'Admin access required' });
    }

    if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Status must be approved or rejected' });
    }

    try {
        const result = await runQuery(`
      UPDATE verification_documents 
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
        updated_at
    `, [status, userId, notes || '', id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Verification not found' });
        }

        const doc = result.rows[0];

        // Update user verification status if approved
        if (status === 'approved') {
            await runQuery(
                `UPDATE users SET is_verified = true, verified_at = NOW() WHERE user_id = $1`,
                [doc.user_id]
            );
        }

        // Notify user
        await runQuery(`
      INSERT INTO notifications (user_id, title, message, type, created_at)
      VALUES ($1, $2, $3, 'verification_result', NOW())
    `, [
            doc.user_id,
            status === 'approved' ? 'Verification Approved! ✅' : 'Verification Rejected',
            status === 'approved'
                ? 'Your account has been verified. You now have access to premium features.'
                : `Your verification was not approved. Reason: ${notes || 'Please try again with clearer documents.'}`
        ]);

        // Log action
        await runQuery(`
      INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, created_at)
      VALUES ($1, $2, 'verification_document', $3, $4, NOW())
    `, [userId, `VERIFICATION_${status.toUpperCase()}`, id, JSON.stringify({ notes })]);

        res.json({ message: `Verification ${status}`, document: result.rows[0] });

    } catch (error) {
        logger.error('[Admin] Review verification error:', error);
        res.status(500).json({ error: 'Failed to review verification' });
    }
};

/**
 * Auto-Validate Document (Stub: OCR Rules)
 * POST /api/admin/verifications/:id/auto-validate
 */
const autoValidateDocument = async (req, res) => {
    const { id } = req.params;
    const userId = getRequestUserId(req);

    if (!userId || !(await isAdmin(userId, req.user?.role))) {
        return res.status(403).json({ error: 'Admin access required' });
    }

    try {
        logger.info(`[Admin] Auto-validating document ${id}...`);

        // Mock OCR delay
        await new Promise(resolve => setTimeout(resolve, 500));

        // Simulated OCR Result
        const mockResult = {
            confidence: 0.92,
            extracted_data: {
                id_type: 'AADHAAR',
                id_number: '**** **** 4321',
                name_match: true,
                dob_match: true,
                expiry_valid: true
            },
            issues: [],
            recommendation: 'APPROVE'
        };

        res.json(mockResult);

    } catch (error) {
        logger.error('[Admin] Auto-validate error:', error);
        res.status(500).json({ error: 'Auto-validation failed' });
    }
};

/**
 * List KYC review queue (admin)
 * GET /api/admin/kyc/queue
 */
const listKycReviewQueue = async (req, res) => {
    const userId = getRequestUserId(req);

    if (!userId || !(await isAdmin(userId, req.user?.role))) {
        return res.status(403).json({ error: 'Admin access required' });
    }

    try {
        const status = req.query.status ? String(req.query.status).trim().toLowerCase() : 'pending';
        const page = parsePositiveInt(req.query.page, 1);
        const limit = parsePositiveInt(req.query.limit, 50, 200);

        const payload = await listReviewQueue({ status, page, limit });
        return res.json(payload);
    } catch (error) {
        logger.error('[Admin] KYC queue list error:', error);
        return res.status(500).json({ error: 'Failed to fetch KYC review queue' });
    }
};

/**
 * Review a KYC queue item (admin)
 * POST /api/admin/kyc/queue/:queueId/review
 */
const reviewKycQueueItem = async (req, res) => {
    const reviewerId = getRequestUserId(req);
    const { queueId } = req.params;
    const { decision, notes } = req.body;

    if (!reviewerId || !(await isAdmin(reviewerId, req.user?.role))) {
        return res.status(403).json({ error: 'Admin access required' });
    }

    if (!queueId) {
        return res.status(400).json({ error: 'Queue ID is required' });
    }

    try {
        const result = await reviewQueueItem({
            queueId,
            reviewerId,
            decision,
            notes
        });

        if (result.not_found) {
            return res.status(404).json({ error: 'KYC queue item not found' });
        }
        if (result.error) {
            return res.status(400).json({ error: result.error });
        }

        return res.json({
            success: true,
            review: result
        });
    } catch (error) {
        logger.error('[Admin] KYC queue review error:', error);
        return res.status(500).json({ error: 'Failed to review KYC queue item' });
    }
};

module.exports = {
    viewDocument,
    listVerifications,
    reviewVerification,
    autoValidateDocument,
    listKycReviewQueue,
    reviewKycQueueItem,
    PRIVATE_UPLOADS_DIR
};


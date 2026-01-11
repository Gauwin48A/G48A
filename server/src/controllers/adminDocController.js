/**
 * Admin Document Controller
 * Blue Team Gap 4: Private Verification Storage
 * 
 * Serves verification documents ONLY to authenticated admins
 */

const pool = require('../config/db');
const path = require('path');
const fs = require('fs');

// Private uploads directory (outside public web root)
const PRIVATE_UPLOADS_DIR = path.join(__dirname, '../../private_uploads');

// Ensure directory exists
if (!fs.existsSync(PRIVATE_UPLOADS_DIR)) {
    fs.mkdirSync(PRIVATE_UPLOADS_DIR, { recursive: true });
    console.log('📁 Created private_uploads directory');
}

/**
 * Check if user is admin
 */
const isAdmin = async (userId) => {
    try {
        const result = await pool.query(
            'SELECT role FROM users WHERE user_id = $1',
            [userId]
        );
        return result.rows[0]?.role === 'admin';
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
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify admin role
    const adminCheck = await isAdmin(userId);
    if (!adminCheck) {
        return res.status(403).json({ error: 'Admin access required' });
    }

    try {
        // Get document record
        const result = await pool.query(
            `SELECT * FROM verification_documents WHERE document_id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Document not found' });
        }

        const doc = result.rows[0];
        const filePath = path.join(PRIVATE_UPLOADS_DIR, doc.filename);

        // Check file exists
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found on disk' });
        }

        // Log access for audit
        await pool.query(`
      INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, created_at)
      VALUES ($1, 'VIEW_DOCUMENT', 'verification_document', $2, $3, NOW())
    `, [userId, id, JSON.stringify({ viewed_user: doc.user_id })]);

        // Send file
        res.sendFile(filePath);

    } catch (error) {
        console.error('[Admin] View document error:', error);
        res.status(500).json({ error: 'Failed to retrieve document' });
    }
};

/**
 * List all pending verification requests
 * GET /api/admin/verifications
 */
const listVerifications = async (req, res) => {
    const userId = req.user?.userId;

    if (!userId || !(await isAdmin(userId))) {
        return res.status(403).json({ error: 'Admin access required' });
    }

    try {
        const result = await pool.query(`
      SELECT vd.*, u.username, u.email, p.full_name
      FROM verification_documents vd
      JOIN users u ON u.user_id = vd.user_id
      LEFT JOIN profiles p ON p.user_id = vd.user_id
      WHERE vd.status = 'pending'
      ORDER BY vd.created_at ASC
    `);

        res.json({ verifications: result.rows });

    } catch (error) {
        console.error('[Admin] List verifications error:', error);
        res.status(500).json({ error: 'Failed to list verifications' });
    }
};

/**
 * Approve or reject verification
 * POST /api/admin/verifications/:id/review
 */
const reviewVerification = async (req, res) => {
    const userId = req.user?.userId;
    const { id } = req.params;
    const { status, notes } = req.body; // status: 'approved' | 'rejected'

    if (!userId || !(await isAdmin(userId))) {
        return res.status(403).json({ error: 'Admin access required' });
    }

    if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Status must be approved or rejected' });
    }

    try {
        const result = await pool.query(`
      UPDATE verification_documents 
      SET status = $1, reviewed_by = $2, review_notes = $3, reviewed_at = NOW()
      WHERE document_id = $4
      RETURNING *
    `, [status, userId, notes || '', id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Verification not found' });
        }

        const doc = result.rows[0];

        // Update user verification status if approved
        if (status === 'approved') {
            await pool.query(
                `UPDATE users SET is_verified = true, verified_at = NOW() WHERE user_id = $1`,
                [doc.user_id]
            );
        }

        // Notify user
        await pool.query(`
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
        await pool.query(`
      INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, created_at)
      VALUES ($1, $2, 'verification_document', $3, $4, NOW())
    `, [userId, `VERIFICATION_${status.toUpperCase()}`, id, JSON.stringify({ notes })]);

        res.json({ message: `Verification ${status}`, document: result.rows[0] });

    } catch (error) {
        console.error('[Admin] Review verification error:', error);
        res.status(500).json({ error: 'Failed to review verification' });
    }
};

module.exports = {
    viewDocument,
    listVerifications,
    reviewVerification,
    PRIVATE_UPLOADS_DIR
};

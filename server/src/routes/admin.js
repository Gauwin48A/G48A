/**
 * Admin Routes
 * User management, verification, bulk actions, CSV export
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const adminDocController = require('../controllers/adminDocController');
const pool = require('../config/db');

// All routes require authentication
router.use(protect);

// GET /admin/users — Real paginated user listing with search and filter
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, role, tier, status, sort = 'created_at', order = 'DESC' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const conditions = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(u.full_name ILIKE $${params.length} OR u.email ILIKE $${params.length} OR u.username ILIKE $${params.length})`);
    }
    if (role) {
      params.push(role);
      conditions.push(`u.role = $${params.length}`);
    }
    if (tier) {
      params.push(tier);
      conditions.push(`u.tier = $${params.length}`);
    }
    if (status) {
      params.push(status === 'active');
      conditions.push(`u.is_active = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const allowedSorts = ['created_at', 'full_name', 'email', 'tier', 'role'];
    const safeSort = allowedSorts.includes(sort) ? sort : 'created_at';
    const safeOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Count total
    const countQuery = `SELECT COUNT(*) FROM users u ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Fetch users
    const dataParams = [...params, parseInt(limit), offset];
    const dataQuery = `
      SELECT u.user_id, u.full_name, u.email, u.username, u.phone, u.role, u.tier, 
             u.is_active, u.created_at, u.last_login,
             p.avatar_url, p.trust_score
      FROM users u
      LEFT JOIN profiles p ON u.user_id = p.user_id
      ${whereClause}
      ORDER BY u.${safeSort} ${safeOrder}
      LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}
    `;
    const result = await pool.query(dataQuery, dataParams);

    res.json({
      users: result.rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (err) {
    console.error('Admin get users error:', err);
    res.status(500).json({ error: 'Failed to fetch users', details: err.message });
  }
});

// POST /admin/users/bulk-action — Bulk suspend/unsuspend/change-role
router.post('/users/bulk-action', async (req, res) => {
  try {
    const { userIds, action, value } = req.body;
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'userIds array required' });
    }
    if (!['suspend', 'unsuspend', 'change-role', 'change-tier'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Must be: suspend, unsuspend, change-role, change-tier' });
    }

    let query, params;
    switch (action) {
      case 'suspend':
        query = 'UPDATE users SET is_active = false WHERE user_id = ANY($1::uuid[])';
        params = [userIds];
        break;
      case 'unsuspend':
        query = 'UPDATE users SET is_active = true WHERE user_id = ANY($1::uuid[])';
        params = [userIds];
        break;
      case 'change-role':
        query = 'UPDATE users SET role = $2 WHERE user_id = ANY($1::uuid[])';
        params = [userIds, value];
        break;
      case 'change-tier':
        query = 'UPDATE users SET tier = $2 WHERE user_id = ANY($1::uuid[])';
        params = [userIds, value];
        break;
    }

    const result = await pool.query(query, params);
    res.json({ message: `${action} applied to ${result.rowCount} users`, affected: result.rowCount });
  } catch (err) {
    console.error('Bulk action error:', err);
    res.status(500).json({ error: 'Bulk action failed', details: err.message });
  }
});

// GET /admin/export/users — CSV export
router.get('/export/users', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.user_id, u.full_name, u.email, u.username, u.phone, u.role, u.tier,
             u.is_active, u.created_at, u.last_login
      FROM users u ORDER BY u.created_at DESC
    `);

    const headers = ['user_id', 'full_name', 'email', 'username', 'phone', 'role', 'tier', 'is_active', 'created_at', 'last_login'];
    let csv = headers.join(',') + '\n';
    result.rows.forEach(row => {
      csv += headers.map(h => `"${(row[h] || '').toString().replace(/"/g, '""')}"`).join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=users_export.csv');
    res.send(csv);
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ error: 'Export failed', details: err.message });
  }
});

// View verification document (admin only)
router.get('/view-doc/:id', adminDocController.viewDocument);

// List pending verifications (admin only)
router.get('/verifications', adminDocController.listVerifications);

// Review verification (admin only)
router.post('/verifications/:id/review', adminDocController.reviewVerification);

// Auto-validate verification (admin only) - Mock OCR
router.post('/verifications/:id/auto-validate', adminDocController.autoValidateDocument);

module.exports = router;


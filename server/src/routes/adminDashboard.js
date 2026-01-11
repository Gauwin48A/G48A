const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/rbac');
const { protect } = require('../middleware/auth');
const pool = require('../config/db');

// All admin routes require authentication + admin role
router.use(protect);
router.use(requireAdmin);

// Admin dashboard stats
router.get('/', async (req, res) => {
  try {
    // Get real stats from database
    const statsQuery = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM posts WHERE status = 'active') as total_posts,
        (SELECT COUNT(*) FROM posts WHERE status = 'flagged') as flagged_posts,
        (SELECT COUNT(*) FROM users WHERE status = 'banned') as banned_users
    `);

    const stats = statsQuery.rows[0];

    res.json({
      stats: {
        totalUsers: parseInt(stats.total_users) || 0,
        totalPosts: parseInt(stats.total_posts) || 0,
        flagged: parseInt(stats.flagged_posts) || 0,
        banned: parseInt(stats.banned_users) || 0
      },
      message: 'Admin dashboard data'
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// Get flagged posts
router.get('/flagged-posts', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, u.username 
      FROM posts p 
      JOIN users u ON p.user_id = u.user_id 
      WHERE p.status = 'flagged' 
      ORDER BY p.created_at DESC 
      LIMIT 50
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load flagged posts' });
  }
});

// Get pending verifications
router.get('/verifications', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT vd.*, u.username, u.email 
      FROM verification_documents vd 
      JOIN users u ON vd.user_id = u.user_id 
      WHERE vd.status = 'pending' 
      ORDER BY vd.created_at ASC 
      LIMIT 50
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load verifications' });
  }
});

// Approve/reject verification
router.post('/verifications/:id', async (req, res) => {
  const { id } = req.params;
  const { action, notes } = req.body; // action: 'approve' | 'reject'
  const adminId = req.user.user_id;

  try {
    const status = action === 'approve' ? 'approved' : 'rejected';

    await pool.query(`
      UPDATE verification_documents 
      SET status = $1, reviewed_by = $2, review_notes = $3, reviewed_at = NOW()
      WHERE document_id = $4
    `, [status, adminId, notes || '', id]);

    if (action === 'approve') {
      // Update user as verified
      const doc = await pool.query('SELECT user_id FROM verification_documents WHERE document_id = $1', [id]);
      if (doc.rows[0]) {
        await pool.query('UPDATE users SET is_verified = true WHERE user_id = $1', [doc.rows[0].user_id]);
      }
    }

    res.json({ success: true, status });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update verification' });
  }
});

module.exports = router;


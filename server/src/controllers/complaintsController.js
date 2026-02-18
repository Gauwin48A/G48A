const pool = require('../config/db');
const logger = require('../utils/logger');

// GET all complaints (admin view)
exports.getComplaints = async (req, res) => {
  try {
    const { status, type, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
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
    params.push(parseInt(limit), offset);

    const result = await pool.query(`
      SELECT c.*, 
             bu.full_name as buyer_name, 
             su.full_name as seller_name
      FROM complaints c
      LEFT JOIN users bu ON c.buyer_id = bu.user_id
      LEFT JOIN users su ON c.seller_id = su.user_id
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM complaints c ${whereClause}`,
      params.slice(0, params.length - 2)
    );

    res.json({
      complaints: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count)
      }
    });
  } catch (err) {
    logger.error('Error fetching complaints:', err);
    res.status(500).json({ error: 'Failed to fetch complaints', details: err.message });
  }
};

// POST — Create a new complaint
exports.createComplaint = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { seller_id, buyer_id, post_id, complaint_type, description, secret_code } = req.body;

    if (!post_id || !complaint_type || !description) {
      return res.status(400).json({ error: 'post_id, complaint_type, and description are required' });
    }

    // Determine seller/buyer from request or use authenticated user
    const effectiveBuyerId = buyer_id || userId;

    const result = await pool.query(`
      INSERT INTO complaints (
        buyer_id, seller_id, post_id, complaint_type, description, secret_code, 
        status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 'open', NOW(), NOW())
      RETURNING *
    `, [effectiveBuyerId, seller_id || null, post_id, complaint_type, description, secret_code || null]);

    res.status(201).json({
      message: 'Complaint submitted successfully',
      complaint: result.rows[0]
    });
  } catch (err) {
    logger.error('Error creating complaint:', err);
    res.status(500).json({ error: 'Failed to submit complaint', details: err.message });
  }
};

// GET /my — Get current user's complaints
exports.getMyComplaints = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const result = await pool.query(`
      SELECT c.*, 
             su.full_name as seller_name,
             p.title as post_title
      FROM complaints c
      LEFT JOIN users su ON c.seller_id = su.user_id
      LEFT JOIN posts p ON c.post_id = p.post_id
      WHERE c.buyer_id = $1
      ORDER BY c.created_at DESC
    `, [userId]);

    res.json({ complaints: result.rows });
  } catch (err) {
    logger.error('Error fetching user complaints:', err);
    res.status(500).json({ error: 'Failed to fetch complaints', details: err.message });
  }
};

// PATCH /:id/status — Update complaint status (admin)
// Valid transitions: open → triage → investigating → resolved | rejected → closed
exports.updateComplaintStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_response } = req.body;
    const adminId = req.user?.userId || req.user?.id;

    const validStatuses = ['open', 'triage', 'investigating', 'resolved', 'rejected', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const result = await pool.query(`
      UPDATE complaints 
      SET status = $1, admin_response = COALESCE($2, admin_response), 
          resolved_by = $3, updated_at = NOW()
      WHERE complaint_id = $4
      RETURNING *
    `, [status, admin_response || null, adminId, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    res.json({
      message: `Complaint status updated to ${status}`,
      complaint: result.rows[0]
    });
  } catch (err) {
    logger.error('Error updating complaint:', err);
    res.status(500).json({ error: 'Failed to update complaint', details: err.message });
  }
};

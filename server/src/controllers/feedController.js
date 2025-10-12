const pool = require('../config/db');

// GET /api/feed - all users' text posts
exports.getFeed = async (req, res) => {
  try {
    const { category, sortBy = 'created_at', sortOrder = 'desc', page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;
    let query = `SELECT * FROM posts WHERE post_type = 'text'`;
    let params = [];
    if (category) {
      query += ' AND category_id = $1';
      params.push(category);
    }
    if (search) {
      query += params.length ? ' AND' : ' AND';
      query += ` (title ILIKE $${params.length + 1} OR description ILIKE $${params.length + 1})`;
      params.push(`%${search}%`);
    }
    query += ` ORDER BY ${sortBy} ${sortOrder} OFFSET $${params.length + 1} LIMIT $${params.length + 2}`;
    params.push(offset, limit);
    const result = await pool.query(query, params);
    if (!result.rows.length) return res.status(404).json({ error: 'No text posts found' });
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/feed/mine - logged-in user's text posts
exports.getMyFeed = async (req, res) => {
  try {
    const userId = req.user?.id || req.query.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { category, sortBy = 'created_at', sortOrder = 'desc', page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;
    let query = `SELECT * FROM posts WHERE post_type = 'text' AND user_id = $1`;
    let params = [userId];
    if (category) {
      query += ' AND category_id = $2';
      params.push(category);
    }
    if (search) {
      query += params.length ? ' AND' : ' AND';
      query += ` (title ILIKE $${params.length + 1} OR description ILIKE $${params.length + 1})`;
      params.push(`%${search}%`);
    }
    query += ` ORDER BY ${sortBy} ${sortOrder} OFFSET $${params.length + 1} LIMIT $${params.length + 2}`;
    params.push(offset, limit);
    const result = await pool.query(query, params);
    if (!result.rows.length) return res.status(404).json({ error: 'No text posts found' });
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

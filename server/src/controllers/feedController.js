const pool = require('../config/db');

// GET /api/feed - all users' text posts
exports.getFeed = async (req, res) => {
  try {
    const { category, sortBy = 'created_at', sortOrder = 'desc', page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;

    // Join with categories to enable category name search
    let query = `
      SELECT p.*, c.name as category_name 
      FROM posts p 
      LEFT JOIN categories c ON p.category_id = c.category_id 
      WHERE p.post_type = 'text'
    `;
    let params = [];

    if (category) {
      query += ` AND p.category_id = $${params.length + 1}`;
      params.push(category);
    }

    // Search across title, description, location, and category name
    if (search) {
      query += ` AND (p.title ILIKE $${params.length + 1} OR p.description ILIKE $${params.length + 1} OR p.location ILIKE $${params.length + 1} OR c.name ILIKE $${params.length + 1})`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY p.${sortBy} ${sortOrder} OFFSET $${params.length + 1} LIMIT $${params.length + 2}`;
    params.push(offset, limit);

    const result = await pool.query(query, params);
    if (!result.rows.length) {
      console.error('No text posts found for feed');
      return res.status(404).json({ error: 'No text posts found', fallback: [] });
    }
    res.json(result.rows);
  } catch (err) {
    console.error('Feed API error:', err);
    res.status(500).json({ error: err.message, fallback: [] });
  }
};

// GET /api/feed/mine - logged-in user's text posts
exports.getMyFeed = async (req, res) => {
  try {
    const userId = req.user?.id || req.query.userId;
    if (!userId) {
      console.error('Unauthorized access to MyFeed');
      return res.status(401).json({ error: 'Unauthorized', fallback: [] });
    }
    const { category, sortBy = 'created_at', sortOrder = 'desc', page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;

    // Join with categories to enable category name search
    let query = `
      SELECT p.*, c.name as category_name 
      FROM posts p 
      LEFT JOIN categories c ON p.category_id = c.category_id 
      WHERE p.post_type = 'text' AND p.user_id = $1
    `;
    let params = [userId];

    if (category) {
      query += ` AND p.category_id = $${params.length + 1}`;
      params.push(category);
    }

    // Search across title, description, location, and category name
    if (search) {
      query += ` AND (p.title ILIKE $${params.length + 1} OR p.description ILIKE $${params.length + 1} OR p.location ILIKE $${params.length + 1} OR c.name ILIKE $${params.length + 1})`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY p.${sortBy} ${sortOrder} OFFSET $${params.length + 1} LIMIT $${params.length + 2}`;
    params.push(offset, limit);

    const result = await pool.query(query, params);
    if (!result.rows.length) {
      console.error('No text posts found for user feed');
      return res.status(404).json({ error: 'No text posts found', fallback: [] });
    }
    res.json(result.rows);
  } catch (err) {
    console.error('MyFeed API error:', err);
    res.status(500).json({ error: err.message, fallback: [] });
  }
};

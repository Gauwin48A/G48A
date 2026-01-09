const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// GET /api/recommendations?userId=1&location=Mumbai&minPrice=1000&maxPrice=50000&category=Electronics
router.get('/', async (req, res) => {
  const { userId, location, minPrice, maxPrice, category } = req.query;

  try {
    // Build dynamic query based on user preferences
    let query = `
      SELECT DISTINCT p.*, c.name as category_name, u.username as seller_name
      FROM posts p
      LEFT JOIN categories c ON p.category_id = c.category_id
      LEFT JOIN users u ON p.user_id = u.user_id
      WHERE p.status = 'active'
    `;

    const params = [];
    let paramIndex = 1;

    // Exclude user's own posts
    if (userId) {
      query += ` AND p.user_id != $${paramIndex}`;
      params.push(userId);
      paramIndex++;
    }

    // Filter by location (case-insensitive partial match)
    if (location && location.trim()) {
      query += ` AND LOWER(p.location) LIKE LOWER($${paramIndex})`;
      params.push(`%${location.trim()}%`);
      paramIndex++;
    }

    // Filter by minimum price
    if (minPrice && !isNaN(parseFloat(minPrice))) {
      query += ` AND p.price >= $${paramIndex}`;
      params.push(parseFloat(minPrice));
      paramIndex++;
    }

    // Filter by maximum price
    if (maxPrice && !isNaN(parseFloat(maxPrice))) {
      query += ` AND p.price <= $${paramIndex}`;
      params.push(parseFloat(maxPrice));
      paramIndex++;
    }

    // Filter by category
    if (category && category.trim()) {
      query += ` AND LOWER(c.name) = LOWER($${paramIndex})`;
      params.push(category.trim());
      paramIndex++;
    }

    // Order by relevance (newest first only - views_count may not exist)
    query += ` ORDER BY p.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit);
    params.push(offset);

    console.log('[RECOMMENDATIONS] Query:', query);
    console.log('[RECOMMENDATIONS] Params:', params);

    const result = await pool.query(query, params);

    console.log('[RECOMMENDATIONS] Found', result.rows.length, 'posts');

    res.json({
      posts: result.rows,
      count: result.rows.length,
      filters: { location, minPrice, maxPrice, category }
    });
  } catch (err) {
    console.error('[RECOMMENDATIONS] Error:', err.message);
    console.error('[RECOMMENDATIONS] Full error:', err);
    res.status(500).json({ error: 'Failed to fetch recommendations', details: err.message });
  }
});

module.exports = router;


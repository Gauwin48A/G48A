const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// GET /api/recommendations?userId=1&location=Mumbai&minPrice=1000&maxPrice=50000&category=Electronics&search=iPhone
router.get('/', async (req, res) => {
  let { userId, location, minPrice, maxPrice, category, search, page = 1, limit = 12 } = req.query;

  // Parse pagination
  page = parseInt(page) || 1;
  limit = parseInt(limit) || 12;
  const offset = (page - 1) * limit;

  try {
    // If userId provided but no preferences passed, fetch user's saved preferences
    if (userId && (!location && !minPrice && !maxPrice && !category)) {
      try {
        const prefResult = await pool.query('SELECT * FROM preferences WHERE user_id = $1', [userId]);
        if (prefResult.rows && prefResult.rows.length > 0) {
          const userPref = prefResult.rows[0];
          // Use saved preferences if not explicitly provided in request
          location = location || userPref.location || '';
          minPrice = minPrice || userPref.min_price;
          maxPrice = maxPrice || userPref.max_price;
          // Handle preferred categories (can be array or single value)
          if (!category && userPref.categories && userPref.categories.length > 0) {
            // Use ALL preferred categories for filtering
            category = userPref.categories;
          }
          console.log('[RECOMMENDATIONS] Using user preferences:', { location, minPrice, maxPrice, category });
        }
      } catch (prefErr) {
        console.log('[RECOMMENDATIONS] Could not fetch user preferences:', prefErr.message);
      }
    }

    // Build dynamic query based on user preferences
    let query = `
      SELECT DISTINCT p.*, c.name as category_name, u.username as seller_name, COALESCE(pr.full_name, u.username, 'Seller') as author_name
      FROM posts p
      LEFT JOIN categories c ON p.category_id = c.category_id
      LEFT JOIN users u ON p.user_id = u.user_id
      LEFT JOIN profiles pr ON p.user_id = pr.user_id
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

    // Filter by search term (title, description, and category name)
    if (search && search.trim()) {
      query += ` AND (LOWER(p.title) LIKE LOWER($${paramIndex}) OR LOWER(p.description) LIKE LOWER($${paramIndex}) OR LOWER(c.name) LIKE LOWER($${paramIndex}))`;
      params.push(`%${search.trim()}%`);
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

    // Filter by category (can be category name or ID)
    if (category) {
      // Check if it's an array for multi-category filtering
      if (Array.isArray(category)) {
        if (category.length > 0) {
          // Create placeholders for category names: $2, $3, etc.
          const namePlaceholders = category.map((_, i) => `$${paramIndex + i}`).join(', ');
          // Create placeholders for category IDs: $5, $6, etc. (offset by array length)
          const idPlaceholders = category.map((_, i) => `$${paramIndex + category.length + i}`).join(', ');
          query += ` AND (LOWER(c.name) IN (${namePlaceholders}) OR c.category_id::text IN (${idPlaceholders}))`;
          // Push category values twice - once for name comparison (lowercased), once for ID comparison
          category.forEach(cat => params.push(typeof cat === 'string' ? cat.toLowerCase() : String(cat)));
          category.forEach(cat => params.push(typeof cat === 'string' ? cat : String(cat)));
          paramIndex += category.length * 2;
        }
      } else if (category.trim()) {
        query += ` AND (LOWER(c.name) = LOWER($${paramIndex}) OR c.category_id::text = $${paramIndex})`;
        params.push(category.trim());
        paramIndex++;
      }
    }

    // Order by relevance (newest first)
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
      page,
      limit,
      filters: { location, minPrice, maxPrice, category, search }
    });
  } catch (err) {
    console.error('[RECOMMENDATIONS] Error:', err.message);
    console.error('[RECOMMENDATIONS] Full error:', err);
    res.status(500).json({ error: 'Failed to fetch recommendations', details: err.message });
  }
});

module.exports = router;

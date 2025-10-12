const pool = require('../config/db');
const logger = require('../utils/logger');

exports.getAllCategories = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.category_id, c.name, c.icon_url,
        (SELECT COUNT(*) FROM posts p WHERE p.category_id = c.category_id) AS product_count
      FROM categories c
      ORDER BY c.name ASC
    `);
    if (!result.rows || result.rows.length === 0) {
      logger.error('No categories found in DB');
      return res.status(404).json({ error: 'No categories found' });
    }
    logger.info('Categories fetched: %o', result.rows);
    res.json(result.rows);
  } catch (err) {
    logger.error('Error fetching categories: %o', err);
    res.status(500).json({ error: err.message });
  }
};

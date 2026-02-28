const pool = require('../config/db');
const logger = require('../utils/logger');
const DB_QUERY_TIMEOUT_MS = Number.parseInt(process.env.DB_QUERY_TIMEOUT_MS, 10) || 10000;

function runQuery(text, values = []) {
  return pool.query({
    text,
    values,
    query_timeout: DB_QUERY_TIMEOUT_MS
  });
}

exports.getSaleUndone = async (req, res) => {
  try {
    const result = await runQuery(`
      SELECT
        post_id,
        user_id,
        title,
        description,
        category_id,
        post_type,
        condition,
        price,
        status,
        images,
        location,
        created_at,
        updated_at
      FROM posts
      WHERE status = 'undone'
      ORDER BY COALESCE(updated_at, created_at) DESC
      LIMIT 500
    `);
    res.json(result.rows);
  } catch (err) {
    logger.error('Error fetching saleundone posts:', err);
    res.status(500).json({ error: err.message });
  }
};

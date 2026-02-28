const pool = require('../config/db');
const logger = require('../utils/logger');
const cacheService = require('../services/cacheService');
const DB_QUERY_TIMEOUT_MS = Number.parseInt(process.env.DB_QUERY_TIMEOUT_MS, 10) || 10000;
const CATEGORY_CACHE_TTL_SECONDS = Number.parseInt(process.env.CATEGORY_CACHE_TTL_SECONDS, 10) || 300;

function runQuery(text, values = []) {
  return pool.query({
    text,
    values,
    query_timeout: DB_QUERY_TIMEOUT_MS
  });
}

exports.getAllCategories = async (req, res) => {
  try {
    const rows = await cacheService.getOrSetWithStampedeProtection(
      'categories:with_counts',
      async () => {
        const result = await runQuery(`
          SELECT
            c.category_id,
            c.name,
            c.icon_url,
            COALESCE(pc.product_count, 0)::int AS product_count
          FROM categories c
          LEFT JOIN (
            SELECT category_id::text AS category_key, COUNT(*)::int AS product_count
            FROM posts
            GROUP BY category_id::text
          ) pc ON pc.category_key = c.category_id::text
          ORDER BY c.name ASC
        `);
        return result.rows;
      },
      CATEGORY_CACHE_TTL_SECONDS
    );
    if (!rows || rows.length === 0) {
      logger.error('No categories found in DB');
      return res.status(404).json({ code: 404, message: 'No categories found', fallback: [] });
    }
    if (process.env.NODE_ENV !== 'production') {
      logger.info(`Categories fetched: ${rows.length}`);
    }
    res.json(rows);
  } catch (err) {
    logger.error('Error fetching categories:', err);
    res.status(500).json({ code: 500, message: 'Failed to fetch categories', details: err.message, fallback: [] });
  }
};

const { runQuery } = require("../utils/dbHelpers");
const logger = require("../utils/logger");
const { parsePositiveInt } = require("../utils/parseHelpers");
const MAX_SEARCH_PAGE = 10000;

// GET /api/products/deals
// Return best-value active posts sorted by value score (lowest price relative to category avg)
// This gives users actual deals rather than just recent posts
exports.getDeals = async (req, res) => {
  try {
    const deals = await runQuery(`
      WITH category_avg AS (
        SELECT category_id, AVG(price) AS avg_price
        FROM posts
        WHERE status = 'active' AND price > 0
        GROUP BY category_id
      )
      SELECT p.post_id AS id, p.title AS name, 
             COALESCE(p.images[1], p.image_url, '') AS image_url, 
             p.price, COALESCE(u.rating, 0) AS rating,
             p.location, p.created_at,
             ROUND(
               CASE WHEN ca.avg_price > 0 
                 THEN (1.0 - (p.price / ca.avg_price)) * 100 
                 ELSE 0 END
             ) AS discount_percent
      FROM posts p
      LEFT JOIN users u ON p.user_id = u.user_id
      LEFT JOIN category_avg ca ON p.category_id = ca.category_id
      WHERE p.status = 'active'
        AND p.price > 0
        AND (ca.avg_price IS NULL OR p.price < ca.avg_price OR p.price <= ca.avg_price * 0.95)
      ORDER BY discount_percent DESC, p.rating DESC NULLS LAST, p.created_at DESC
      LIMIT 12
    `);
    res.json(deals.rows);
  } catch (err) {
    logger.error('Failed to fetch deals.');
    res.status(500).json({ error: 'Failed to fetch deals.' });
  }
};

// GET /api/products/search?query=&category=&page=
// Search across real posts table instead of legacy products
exports.searchProducts = async (req, res) => {
  const { query = '', category = '' } = req.query;
  const page = parsePositiveInt(req.query.page, 1, MAX_SEARCH_PAGE);
  const limit = 12;
  const offset = (page - 1) * limit;
  try {
    let sql = `
      SELECT p.post_id AS id, p.title AS name, 
             COALESCE(p.images[1], p.image_url, '') AS image_url, 
             p.price, COALESCE(u.rating, 0) AS rating
      FROM posts p
      LEFT JOIN users u ON p.user_id = u.user_id
      LEFT JOIN categories c ON p.category_id::text = c.category_id::text
      WHERE p.status = 'active'
    `;
    let params = [];
    if (query) {
      sql += ' AND p.title ILIKE $' + (params.length + 1);
      params.push(`%${query}%`);
    }
    if (category) {
      sql += ' AND c.name = $' + (params.length + 1);
      params.push(category);
    }
    sql += ' ORDER BY p.created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);
    const products = await runQuery(sql, params);
    res.json(products.rows);
  } catch (err) {
    logger.error('Failed to search products.');
    res.status(500).json({ error: 'Failed to search products.' });
  }
};

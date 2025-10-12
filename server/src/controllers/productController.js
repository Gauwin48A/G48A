const db = require('../config/db');
const logger = require('../utils/logger');

// GET /api/products/deals
exports.getDeals = async (req, res) => {
  try {
    const deals = await db.query('SELECT id, name, image_url, price, rating FROM products WHERE is_featured = true LIMIT 12');
    res.json(deals.rows);
  } catch (err) {
    logger.error('Failed to fetch deals.');
    res.status(500).json({ error: 'Failed to fetch deals.' });
  }
};

// GET /api/products/search?query=&category=&page=
exports.searchProducts = async (req, res) => {
  const { query = '', category = '', page = 1 } = req.query;
  const limit = 12;
  const offset = (page - 1) * limit;
  try {
    let sql = 'SELECT p.id, p.name, p.image_url, p.price, p.rating FROM products p JOIN categories c ON p.category_id = c.id WHERE 1=1';
    let params = [];
    if (query) {
      sql += ' AND p.name ILIKE $' + (params.length + 1);
      params.push(`%${query}%`);
    }
    if (category) {
      sql += ' AND c.name = $' + (params.length + 1);
      params.push(category);
    }
    sql += ' ORDER BY p.rating DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);
    const products = await db.query(sql, params);
    res.json(products.rows);
  } catch (err) {
    logger.error('Failed to search products.');
    res.status(500).json({ error: 'Failed to search products.' });
  }
};

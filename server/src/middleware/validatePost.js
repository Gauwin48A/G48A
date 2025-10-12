// Middleware for validating post creation input
// Validation is now handled by PostgreSQL stored procedure
module.exports = async (req, res, next) => {
  const pool = require('../config/db');
  const { category, brand, model, price, location, contact } = req.body;
  try {
    const result = await pool.query(
      'SELECT * FROM validate_post_fields($1, $2, $3, $4, $5, $6)',
      [category, brand, model, price, location, contact]
    );
    const errors = result.rows.filter(r => !r.valid);
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }
    next();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

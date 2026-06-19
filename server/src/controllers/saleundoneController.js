const { runQuery, getAuthUserId } = require("../utils/dbHelpers");
const logger = require('../utils/logger');

exports.getSaleUndone = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
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
      WHERE status = 'undone' AND user_id = $1
      ORDER BY COALESCE(updated_at, created_at) DESC
      LIMIT 500
    `, [String(userId)]);
    res.json(result.rows);
  } catch (err) {
    logger.error('Error fetching saleundone posts:', err);
    res.status(500).json({ error: "Internal server error" });
  }
};

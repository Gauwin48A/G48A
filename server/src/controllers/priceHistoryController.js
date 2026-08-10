const { runQuery, getAuthUserId } = require("../utils/dbHelpers");
const { parsePositiveInt, parsePositiveNumber } = require("../utils/parseHelpers");
const logger = require("../utils/logger");

const DEFAULT_DAYS = 7;
const MAX_DAYS = 365;
const DEFAULT_MIN_DROP_PERCENT = 5;
const MAX_MIN_DROP_PERCENT = 100;

/**
 * POST /api/price-history
 * Record a price change for a post. Body: { postId, oldPrice, newPrice, reason? }
 */
const recordPriceChange = async (req, res) => {
  const { postId, reason } = req.body;
  const oldPrice = Number(req.body.oldPrice);
  const newPrice = Number(req.body.newPrice);
  const userId = getAuthUserId(req);

  if (!userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  if (!postId || !Number.isFinite(oldPrice) || !Number.isFinite(newPrice) || oldPrice <= 0) {
    return res.status(400).json({ error: "postId, oldPrice (>0), newPrice required" });
  }

  try {
    const percentageChange = Number(((newPrice - oldPrice) / oldPrice * 100).toFixed(2));

    const result = await runQuery(
      `INSERT INTO price_history (post_id, old_price, new_price, percentage_change, changed_by, reason)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING history_id, post_id, old_price, new_price, percentage_change, changed_by, reason, changed_at`,
      [postId, oldPrice, newPrice, percentageChange, userId || null, reason || null],
    );

    res.status(201).json({ message: "Price change recorded", history: result.rows[0] });
  } catch (error) {
    logger.error("Record price change error:", error);
    res.status(500).json({ error: "Failed to record" });
  }
};

/**
 * GET /api/price-history/:postId
 * Get price history for a specific post.
 */
const getPriceHistory = async (req, res) => {
  const { postId } = req.params;
  if (!postId) {
    return res.status(400).json({ error: "postId required" });
  }

  try {
    const result = await runQuery(
      `SELECT
        ph.history_id, ph.post_id, ph.old_price, ph.new_price,
        ph.percentage_change, ph.changed_by, ph.reason, ph.changed_at,
        COALESCE(pr.full_name, u.username) AS changed_by_name
      FROM price_history ph
      LEFT JOIN users u ON ph.changed_by = u.user_id
      LEFT JOIN profiles pr ON ph.changed_by = pr.user_id
      WHERE ph.post_id = $1
      ORDER BY ph.changed_at DESC`,
      [postId],
    );

    const currentPrice = await runQuery(
      "SELECT price FROM posts WHERE post_id = $1",
      [postId],
    );

    res.json({
      history: result.rows,
      currentPrice: currentPrice.rows[0]?.price || null,
      totalChanges: result.rows.length,
    });
  } catch (error) {
    logger.error("Get price history error:", error);
    res.status(500).json({ error: "Failed to get history" });
  }
};

/**
 * GET /api/price-history/drops?days=7&minDrop=5
 * Get recent price drops across all active posts.
 */
const getRecentPriceDrops = async (req, res) => {
  const days = parsePositiveInt(req.query.days, DEFAULT_DAYS, MAX_DAYS);
  const minDrop = parsePositiveNumber(req.query.minDrop, DEFAULT_MIN_DROP_PERCENT, MAX_MIN_DROP_PERCENT);

  try {
    const result = await runQuery(
      `SELECT DISTINCT ON (p.post_id)
        p.post_id, p.title, p.price AS current_price, p.images, p.location, p.status,
        ph.old_price, ph.percentage_change, ph.changed_at,
        p.subcategory_id,
        c.name AS category_name,
        sc.name AS subcategory_name,
        COALESCE(pr.full_name, u.username) AS seller_name
      FROM price_history ph
      JOIN posts p ON ph.post_id = p.post_id
      LEFT JOIN users u ON p.user_id = u.user_id
      LEFT JOIN profiles pr ON p.user_id = pr.user_id
      LEFT JOIN categories c ON p.category_id::text = c.category_id::text
      LEFT JOIN subcategories sc ON p.subcategory_id::text = sc.subcategory_id::text
      WHERE ph.changed_at >= NOW() - INTERVAL '1 day' * $1
        AND ph.percentage_change <= -$2
        AND p.status = 'active'
      ORDER BY p.post_id, ph.changed_at DESC`,
      [days, minDrop],
    );

    res.json({ posts: result.rows, count: result.rows.length });
  } catch (error) {
    logger.error("Get recent price drops error:", error);
    res.status(500).json({ error: "Failed to get price drops" });
  }
};

module.exports = { recordPriceChange, getPriceHistory, getRecentPriceDrops };

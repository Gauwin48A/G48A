/**
 * Price-drop alert controller.
 * Lets users subscribe to price-drop notifications on posts,
 * view / manage their alerts, and (admin-only) check which alerts
 * should fire.
 */

const logger = require("../utils/logger");
const { runQuery, getAuthUserId, isAdmin } = require("../utils/dbHelpers");
const { parseNumberOrNull } = require("../utils/parseHelpers");

const DEFAULT_PERCENTAGE_THRESHOLD = 10;

/**
 * Subscribe to (or update) a price-drop alert for a post.
 * If an alert already exists for the same user + post it is upserted.
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
const subscribeAlert = async (req, res) => {
  const userId = getAuthUserId(req);
  const { postId, targetPrice, percentageThreshold } = req.body;

  if (!userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  if (!postId) {
    return res.status(400).json({ error: "postId required" });
  }

  try {
    const normalizedUserId = String(userId);
    const normalizedTargetPrice =
      targetPrice === undefined || targetPrice === null || targetPrice === ""
        ? null
        : parseNumberOrNull(targetPrice);
    const normalizedThreshold =
      parseNumberOrNull(percentageThreshold) ?? DEFAULT_PERCENTAGE_THRESHOLD;

    const postCheck = await runQuery(
      "SELECT price FROM posts WHERE post_id = $1",
      [postId]
    );
    if (postCheck.rows.length === 0) {
      return res.status(404).json({ error: "Post not found" });
    }

    const result = await runQuery(
      `INSERT INTO price_drop_alerts (user_id, post_id, target_price, percentage_threshold)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, post_id)
       DO UPDATE SET
         target_price = EXCLUDED.target_price,
         percentage_threshold = EXCLUDED.percentage_threshold,
         is_active = true
       RETURNING
         alert_id,
         user_id,
         post_id,
         target_price,
         percentage_threshold,
         is_active,
         last_notified_at,
         created_at,
         created_at AS updated_at`,
      [normalizedUserId, postId, normalizedTargetPrice, normalizedThreshold]
    );

    res.status(201).json({ message: "Alert subscribed", alert: result.rows[0] });
  } catch (error) {
    logger.error("Subscribe alert error:", error);
    res.status(500).json({ error: "Failed to subscribe" });
  }
};

/**
 * Get all price-drop alerts for the authenticated user.
 * Optionally filter to active-only via `?active=true`.
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
const getAlerts = async (req, res) => {
  const userId = getAuthUserId(req);
  const { active } = req.query;

  if (!userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const normalizedUserId = String(userId);
    const activeOnly = String(active).toLowerCase() === "true";

    let query = `
      SELECT
        pda.alert_id,
        pda.user_id,
        pda.post_id,
        pda.target_price,
        pda.percentage_threshold,
        pda.is_active,
        pda.last_notified_at,
        pda.created_at,
        pda.created_at AS updated_at,
        p.title,
        p.price as current_price,
        p.images,
        p.status,
        p.location
      FROM price_drop_alerts pda
      JOIN posts p ON pda.post_id = p.post_id
      WHERE pda.user_id = $1`;

    if (activeOnly) {
      query += ` AND pda.is_active = true`;
    }
    query += ` ORDER BY pda.created_at DESC`;

    const result = await runQuery(query, [normalizedUserId]);
    res.json({ alerts: result.rows });
  } catch (error) {
    logger.error("Get alerts error:", error);
    res.status(500).json({ error: "Failed to get alerts" });
  }
};

/**
 * Soft-unsubscribe from a price-drop alert (sets is_active = false).
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
const unsubscribeAlert = async (req, res) => {
  const userId = getAuthUserId(req);
  const { postId } = req.params;

  if (!userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    await runQuery(
      "UPDATE price_drop_alerts SET is_active = false WHERE user_id = $1 AND post_id = $2",
      [String(userId), postId]
    );
    res.json({ message: "Alert unsubscribed" });
  } catch (error) {
    logger.error("Unsubscribe error:", error);
    res.status(500).json({ error: "Failed to unsubscribe" });
  }
};

/**
 * Permanently delete a price-drop alert row.
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
const deleteAlert = async (req, res) => {
  const userId = getAuthUserId(req);
  const { postId } = req.params;

  if (!userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    await runQuery(
      "DELETE FROM price_drop_alerts WHERE user_id = $1 AND post_id = $2",
      [String(userId), postId]
    );
    res.json({ message: "Alert deleted" });
  } catch (error) {
    logger.error("Delete alert error:", error);
    res.status(500).json({ error: "Failed to delete" });
  }
};

/**
 * (Admin only) Check which active alerts should fire based on
 * current post prices and price-history percentage changes.
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
const checkPriceDrops = async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: "Admin access required" });
  }

  try {
    const result = await runQuery(
      `SELECT
         pda.alert_id,
         pda.user_id,
         pda.post_id,
         pda.target_price,
         pda.percentage_threshold,
         pda.is_active,
         pda.last_notified_at,
         pda.created_at,
         pda.created_at AS updated_at,
         p.price as current_price,
         p.title,
         u.email,
         pr.full_name
       FROM price_drop_alerts pda
       JOIN posts p ON pda.post_id = p.post_id
       JOIN users u ON pda.user_id = u.user_id
       LEFT JOIN profiles pr ON pda.user_id = pr.user_id
       WHERE pda.is_active = true
         AND p.status = 'active'
         AND (
           (pda.target_price IS NOT NULL AND p.price <= pda.target_price)
           OR (
             pda.target_price IS NULL
             AND EXISTS (
               SELECT 1 FROM price_history ph
               WHERE ph.post_id = p.post_id
                 AND ABS(ph.percentage_change) >= pda.percentage_threshold
                 AND ph.changed_at > COALESCE(pda.last_notified_at, '2000-01-01')
             )
           )
         )`
    );

    res.json({ alertsToNotify: result.rows, count: result.rows.length });
  } catch (error) {
    logger.error("Check price drops error:", error);
    res.status(500).json({ error: "Failed to check" });
  }
};

module.exports = {
  subscribeAlert,
  getAlerts,
  unsubscribeAlert,
  deleteAlert,
  checkPriceDrops,
};

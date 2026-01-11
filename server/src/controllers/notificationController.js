/**
 * Notification Controller
 * Protocol: Value Hierarchy - Tier-aware notifications
 */

const pool = require('../config/db');

// Get notifications for a user
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id || req.query.userId;
    const limit = parseInt(req.query.limit) || 50;
    const unreadOnly = req.query.unread === 'true';

    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    let query = `
      SELECT 
        notification_id, 
        user_id, 
        type, 
        title, 
        message, 
        reference_id,
        is_read,
        created_at,
        CASE 
          WHEN type IN ('subscription_expired', 'subscription_expiring_1day', 'post_limit_reached', 'credits_low') THEN 'high'
          WHEN type IN ('subscription_expiring_3days', 'expiry_warning', 'tier_upgraded') THEN 'medium'
          ELSE 'normal'
        END as priority,
        CASE 
          WHEN type LIKE 'subscription%' THEN 'subscription'
          WHEN type LIKE 'post%' OR type = 'expiry_warning' THEN 'post'
          WHEN type = 'tier_upgraded' OR type LIKE 'credits%' THEN 'tier'
          WHEN type = 'sale_expired' THEN 'order'
          ELSE 'general'
        END as icon_category
      FROM notifications 
      WHERE user_id = $1
    `;

    if (unreadOnly) {
      query += ` AND (is_read = false OR is_read IS NULL)`;
    }

    query += ` ORDER BY created_at DESC LIMIT $2`;

    const result = await pool.query(query, [userId, limit]);

    // Get unread count
    const unreadResult = await pool.query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND (is_read = false OR is_read IS NULL)',
      [userId]
    );

    res.json({
      notifications: result.rows,
      unreadCount: parseInt(unreadResult.rows[0].count),
      total: result.rows.length
    });
  } catch (err) {
    console.error('Error fetching notifications:', err.message);
    res.json({ notifications: [], unreadCount: 0, total: 0 });
  }
};

// Mark a single notification as read
exports.markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user?.userId || req.user?.id;

    if (!notificationId) {
      return res.status(400).json({ error: 'notificationId required' });
    }

    const result = await pool.query(
      `UPDATE notifications SET is_read = true 
       WHERE notification_id = $1 AND user_id = $2
       RETURNING notification_id`,
      [notificationId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ success: true, notificationId });
  } catch (err) {
    console.error('Error marking notification as read:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// Mark all notifications as read for a user
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id || req.body.userId;

    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    const result = await pool.query(
      `UPDATE notifications SET is_read = true 
       WHERE user_id = $1 AND (is_read = false OR is_read IS NULL)
       RETURNING notification_id`,
      [userId]
    );

    res.json({
      success: true,
      markedCount: result.rows.length
    });
  } catch (err) {
    console.error('Error marking all notifications as read:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// Delete a notification
exports.deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user?.userId || req.user?.id;

    const result = await pool.query(
      `DELETE FROM notifications 
       WHERE notification_id = $1 AND user_id = $2
       RETURNING notification_id`,
      [notificationId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ success: true, deleted: notificationId });
  } catch (err) {
    console.error('Error deleting notification:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// Get unread count only (lightweight endpoint)
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id || req.query.userId;

    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    const result = await pool.query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND (is_read = false OR is_read IS NULL)',
      [userId]
    );

    res.json({ unreadCount: parseInt(result.rows[0].count) });
  } catch (err) {
    console.error('Error getting unread count:', err.message);
    res.json({ unreadCount: 0 });
  }
};


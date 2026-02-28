/**
 * Notification Controller
 * Protocol: Value Hierarchy - Tier-aware notifications
 */

const pool = require('../config/db');
const cacheService = require('../services/cacheService');
const logger = require('../utils/logger');

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const NOTIFICATIONS_CACHE_TTL_SECONDS = 20;
const DB_QUERY_TIMEOUT_MS = Number.parseInt(process.env.DB_QUERY_TIMEOUT_MS, 10) || 10000;

function parseOptionalString(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized.length ? normalized : null;
}

function parsePositiveInt(value, fallback, max = Number.MAX_SAFE_INTEGER) {
  const normalized = parseOptionalString(value);
  if (!normalized || !/^\d+$/.test(normalized)) return fallback;
  const parsed = Number(normalized);
  if (!Number.isSafeInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

function getAuthenticatedUserId(req) {
  return parseOptionalString(req.user?.userId || req.user?.id || req.user?.user_id);
}

function resolveRequestUserId(req) {
  const authenticatedUserId = getAuthenticatedUserId(req);
  if (!authenticatedUserId) {
    return { userId: null, error: 'auth_required' };
  }

  const requestedUserId = parseOptionalString(req.query.userId || req.body?.userId);
  if (requestedUserId && requestedUserId !== authenticatedUserId) {
    return { userId: null, error: 'forbidden' };
  }

  return { userId: authenticatedUserId, error: null };
}

function enforceUserAccess(req, res) {
  const { userId, error } = resolveRequestUserId(req);
  if (!error) {
    return userId;
  }

  if (error === 'auth_required') {
    res.status(401).json({ error: 'Authentication required' });
  } else {
    res.status(403).json({ error: 'Cannot access another user notifications' });
  }

  return null;
}

function buildNotificationsCacheKey(userId, limit, unreadOnly) {
  return `notifications:${userId}:list:${limit}:unread:${unreadOnly ? '1' : '0'}`;
}

function buildNotificationsUnreadCacheKey(userId) {
  return `notifications:${userId}:unread-count`;
}

function invalidateNotificationsCache(userId) {
  if (!userId) return;
  cacheService.clearPattern(`notifications:${userId}:*`);
}

function runQuery(text, values = []) {
  return pool.query({
    text,
    values,
    query_timeout: DB_QUERY_TIMEOUT_MS
  });
}

// Get notifications for a user
exports.getNotifications = async (req, res) => {
  try {
    const userId = enforceUserAccess(req, res);
    const limit = parsePositiveInt(req.query.limit, DEFAULT_LIMIT, MAX_LIMIT);
    const unreadOnly = String(req.query.unread).toLowerCase() === 'true';

    if (!userId) return;

    const cacheKey = buildNotificationsCacheKey(userId, limit, unreadOnly);
    const payload = await cacheService.getOrSetWithStampedeProtection(
      cacheKey,
      async () => {
        const params = [userId];
        let query = `
          SELECT
            notification_id,
            user_id,
            type,
            title,
            message,
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
          WHERE user_id::text = $1
        `;

        if (unreadOnly) {
          query += ` AND (is_read = false OR is_read IS NULL)`;
        }

        params.push(limit);
        query += ` ORDER BY created_at DESC LIMIT $${params.length}`;

        const [notificationsResult, unreadResult] = await Promise.all([
          runQuery(query, params),
          runQuery(
            `
              SELECT COUNT(*)::int AS count
              FROM notifications
              WHERE user_id::text = $1 AND (is_read = false OR is_read IS NULL)
            `,
            [userId]
          )
        ]);

        return {
          notifications: notificationsResult.rows,
          unreadCount: unreadResult.rows[0]?.count || 0,
          total: notificationsResult.rows.length
        };
      },
      NOTIFICATIONS_CACHE_TTL_SECONDS
    );

    return res.json(payload);
  } catch (err) {
    logger.error('Error fetching notifications:', err);
    return res.json({ notifications: [], unreadCount: 0, total: 0 });
  }
};

// Mark a single notification as read
exports.markAsRead = async (req, res) => {
  try {
    const notificationId = parseOptionalString(req.params.notificationId);
    const userId = enforceUserAccess(req, res);

    if (!notificationId) {
      return res.status(400).json({ error: 'notificationId required' });
    }

    if (!userId) return;

    const result = await runQuery(
      `
        UPDATE notifications
        SET is_read = true
        WHERE notification_id::text = $1 AND user_id::text = $2
        RETURNING notification_id
      `,
      [notificationId, userId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    invalidateNotificationsCache(userId);
    return res.json({ success: true, notificationId });
  } catch (err) {
    logger.error('Error marking notification as read:', err);
    return res.status(500).json({ error: err.message });
  }
};

// Mark all notifications as read for a user
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = enforceUserAccess(req, res);

    if (!userId) return;

    const result = await runQuery(
      `
        WITH updated AS (
          UPDATE notifications
          SET is_read = true
          WHERE user_id::text = $1 AND (is_read = false OR is_read IS NULL)
          RETURNING 1
        )
        SELECT COUNT(*)::int AS marked_count FROM updated
      `,
      [userId]
    );

    invalidateNotificationsCache(userId);
    return res.json({
      success: true,
      markedCount: result.rows[0]?.marked_count || 0
    });
  } catch (err) {
    logger.error('Error marking all notifications as read:', err);
    return res.status(500).json({ error: err.message });
  }
};

// Delete a notification
exports.deleteNotification = async (req, res) => {
  try {
    const notificationId = parseOptionalString(req.params.notificationId);
    const userId = enforceUserAccess(req, res);

    if (!notificationId) {
      return res.status(400).json({ error: 'notificationId required' });
    }
    if (!userId) return;

    const result = await runQuery(
      `
        DELETE FROM notifications
        WHERE notification_id::text = $1 AND user_id::text = $2
        RETURNING notification_id
      `,
      [notificationId, userId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    invalidateNotificationsCache(userId);
    return res.json({ success: true, deleted: notificationId });
  } catch (err) {
    logger.error('Error deleting notification:', err);
    return res.status(500).json({ error: err.message });
  }
};

// Get unread count only (lightweight endpoint)
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = enforceUserAccess(req, res);

    if (!userId) return;

    const cacheKey = buildNotificationsUnreadCacheKey(userId);
    const unreadCount = await cacheService.getOrSetWithStampedeProtection(
      cacheKey,
      async () => {
        const result = await runQuery(
          `
            SELECT COUNT(*)::int AS count
            FROM notifications
            WHERE user_id::text = $1 AND (is_read = false OR is_read IS NULL)
          `,
          [userId]
        );
        return result.rows[0]?.count || 0;
      },
      NOTIFICATIONS_CACHE_TTL_SECONDS
    );

    return res.json({ unreadCount });
  } catch (err) {
    logger.error('Error getting unread count:', err);
    return res.json({ unreadCount: 0 });
  }
};

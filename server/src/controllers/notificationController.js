/**
 * Notification controller.
 * Handles CRUD operations for user notifications including
 * listing, marking read, deleting, and unread-count queries.
 */
const { runQuery, getAuthUserId } = require("../utils/dbHelpers");
const {
  parseOptionalString,
  parsePositiveInt,
  parseBoolean,
} = require("../utils/parseHelpers");
const cacheService = require("../services/cacheService");
const logger = require("../utils/logger");

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const NOTIFICATIONS_CACHE_TTL_SECONDS = 20;

const DEFAULT_SORT = "newest";

function normalizeUploadsPath(value) {
  const normalized = parseOptionalString(value);
  if (!normalized) return null;

  const withForwardSlashes = normalized.replace(/\\/g, "/");
  if (withForwardSlashes.startsWith("/uploads/")) return withForwardSlashes;
  if (withForwardSlashes.startsWith("uploads/")) return `/${withForwardSlashes}`;

  const withoutFilePrefix = withForwardSlashes.replace(/^file:\/+/i, "/");
  const uploadsMatch = withoutFilePrefix.match(/(?:^|\/)uploads\/(.+)$/i);
  if (uploadsMatch?.[1]) {
    return `/uploads/${uploadsMatch[1].replace(/^\/+/, "")}`;
  }

  if (!withForwardSlashes.includes("/") && /^[^/]+\.[a-z0-9]{2,8}$/i.test(withForwardSlashes)) {
    return `/uploads/${withForwardSlashes}`;
  }

  if (withForwardSlashes.startsWith("http://") || withForwardSlashes.startsWith("https://")) {
    return withForwardSlashes;
  }

  return null;
}

function normalizeImagesPayload(value) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => normalizeUploadsPath(entry) || parseOptionalString(entry))
      .filter(Boolean);
  }

  const normalized = parseOptionalString(value);
  if (!normalized) return [];

  try {
    const parsed = JSON.parse(normalized);
    if (Array.isArray(parsed)) {
      return parsed
        .map((entry) => normalizeUploadsPath(entry) || parseOptionalString(entry))
        .filter(Boolean);
    }
  } catch {
    // fall through
  }

  const fallback = normalizeUploadsPath(normalized) || normalized;
  return fallback ? [fallback] : [];
}

function parseCursor(raw) {
  const normalized = parseOptionalString(raw);
  if (!normalized) return null;
  const [timestamp, id] = normalized.split("|");
  const parsedDate = timestamp ? new Date(timestamp) : null;
  if (!parsedDate || Number.isNaN(parsedDate.getTime())) return null;
  if (!id) return null;
  return { createdAt: parsedDate.toISOString(), id: String(id).trim() };
}

function buildSortClause(sort) {
  const normalized = String(sort || DEFAULT_SORT).trim().toLowerCase();
  if (normalized === "oldest") {
    return "n.created_at ASC, n.notification_id ASC";
  }
  if (normalized === "priority") {
    return "priority_rank DESC, n.created_at DESC, n.notification_id DESC";
  }
  if (normalized === "unread") {
    return "unread_rank DESC, n.created_at DESC, n.notification_id DESC";
  }
  return "n.created_at DESC, n.notification_id DESC";
}

/* ------------------------------------------------------------------ */
/*  Internal helpers                                                   */
/* ------------------------------------------------------------------ */

/**
 * Resolve the effective user ID for the current request.
 * If the request carries a `userId` query/body param that differs from the
 * authenticated user, the request is rejected (users may only access their
 * own notifications).
 *
 * @param {import("express").Request} req
 * @returns {{ userId: string|null, error: string|null }}
 */
function resolveRequestUserId(req) {
  const authenticatedUserId = getAuthUserId(req);
  if (!authenticatedUserId) {
    return { userId: null, error: "auth_required" };
  }

  const requestedUserId = parseOptionalString(
    req.query.userId || req.body?.userId
  );
  if (requestedUserId && requestedUserId !== authenticatedUserId) {
    return { userId: null, error: "forbidden" };
  }

  return { userId: authenticatedUserId, error: null };
}

/**
 * Enforce user access and send the appropriate error response when it fails.
 * Returns the authenticated user ID on success, or `null` after sending an
 * error response.
 *
 * @param {import("express").Request}  req
 * @param {import("express").Response} res
 * @returns {string|null}
 */
function enforceUserAccess(req, res) {
  const { userId, error } = resolveRequestUserId(req);

  if (!error) {
    return userId;
  }

  if (error === "auth_required") {
    res.status(401).json({ error: "Authentication required" });
  } else {
    res.status(403).json({ error: "Cannot access another user notifications" });
  }
  return null;
}

/**
 * Build a cache key for a notification list query.
 * @param {string}  userId
 * @param {number}  limit
 * @param {boolean} unreadOnly
 * @returns {string}
 */
function buildNotificationsCacheKey(userId, limit, unreadOnly) {
  return `notifications:${userId}:list:${limit}:unread:${unreadOnly ? "1" : "0"}`;
}

/**
 * Build a cache key for the unread-count query.
 * @param {string} userId
 * @returns {string}
 */
function buildNotificationsUnreadCacheKey(userId) {
  return `notifications:${userId}:unread-count`;
}

/**
 * Invalidate all cached notification data for a given user.
 * @param {string} userId
 */
function invalidateNotificationsCache(userId) {
  if (!userId) return;
  cacheService.clearPattern(`notifications:${userId}:*`);
}

/* ------------------------------------------------------------------ */
/*  Exported route handlers                                            */
/* ------------------------------------------------------------------ */

/**
 * GET /notifications
 * Retrieve a paginated list of notifications for the authenticated user.
 *
 * Query params:
 *   - limit  {number}  Max rows to return (default 50, max 200)
 *   - unread {string}  "true" to return only unread notifications
 *
 * @param {import("express").Request}  req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
exports.getNotifications = async (req, res) => {
  try {
    const userId = enforceUserAccess(req, res);
    if (!userId) return;

    const limit = parsePositiveInt(req.query.limit, DEFAULT_LIMIT, MAX_LIMIT);
    const unreadOnly = parseBoolean(req.query.unread, false);
    const includeSnoozed = parseBoolean(req.query.includeSnoozed, false);
    const search = parseOptionalString(req.query.search || req.query.q);
    const sort = parseOptionalString(req.query.sort) || DEFAULT_SORT;
    const cursor = parseCursor(req.query.cursor);

    const params = [userId];
    let query = `
      SELECT
        n.notification_id,
        n.user_id,
        n.type,
        n.title,
        n.message,
        n.is_read,
        n.created_at,
        n.sender_id,
        n.post_id,
        n.reference_id,
        n.thumbnail_url,
        n.action_path,
        n.group_key,
        n.metadata,
        n.expires_at,
        n.snoozed_until,
        COALESCE(sp.full_name, su.username) AS sender_name,
        sp.avatar_url AS sender_avatar,
        COALESCE(sp.verified, false) AS sender_verified,
        p.title AS post_title,
        p.price AS post_price,
        COALESCE(to_jsonb(p)->>'status','') AS post_status,
        p.images AS post_images,
        p.category_id AS post_category_id,
        c.name AS post_category_name,
        p.subcategory_id AS post_subcategory_id,
        sc.name AS post_subcategory_name,
        CASE
          WHEN n.type IN (
            'subscription_expired',
            'subscription_expiring_1day',
            'post_limit_reached',
            'credits_low'
          ) THEN 'high'
          WHEN n.type IN (
            'subscription_expiring_3days',
            'expiry_warning',
            'tier_upgraded'
          ) THEN 'medium'
          ELSE 'normal'
        END AS priority,
        CASE
          WHEN n.type LIKE 'subscription%' THEN 'subscription'
          WHEN n.type LIKE 'post%' OR n.type = 'expiry_warning' THEN 'post'
          WHEN n.type = 'tier_upgraded' OR n.type LIKE 'credits%' THEN 'tier'
          WHEN n.type = 'sale_expired' THEN 'order'
          WHEN n.type LIKE 'inquiry%' THEN 'message'
          ELSE 'general'
        END AS icon_category,
        CASE
          WHEN n.type IN (
            'subscription_expired',
            'subscription_expiring_1day',
            'post_limit_reached',
            'credits_low'
          ) THEN 3
          WHEN n.type IN (
            'subscription_expiring_3days',
            'expiry_warning',
            'tier_upgraded'
          ) THEN 2
          ELSE 1
        END AS priority_rank,
        CASE
          WHEN n.is_read = false OR n.is_read IS NULL THEN 1
          ELSE 0
        END AS unread_rank
      FROM notifications n
      LEFT JOIN posts p
        ON (n.post_id IS NOT NULL AND p.post_id::text = n.post_id::text)
      LEFT JOIN categories c ON p.category_id::text = c.category_id::text
      LEFT JOIN subcategories sc ON p.subcategory_id::text = sc.subcategory_id::text
      LEFT JOIN users su ON n.sender_id::text = su.user_id::text
      LEFT JOIN profiles sp ON n.sender_id::text = sp.user_id::text
      WHERE n.user_id::text = $1
    `;

    if (!includeSnoozed) {
      query += ` AND (n.snoozed_until IS NULL OR n.snoozed_until <= NOW())`;
    }

    if (unreadOnly) {
      query += ` AND (n.is_read = false OR n.is_read IS NULL)`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (n.title ILIKE $${params.length} OR n.message ILIKE $${params.length})`;
    }

    if (cursor) {
      params.push(cursor.createdAt);
      params.push(cursor.id);
      const createdParam = params.length - 1;
      const idParam = params.length;
      query += ` AND (n.created_at < $${createdParam} OR (n.created_at = $${createdParam} AND n.notification_id::text < $${idParam}))`;
    }

    query += ` ORDER BY ${buildSortClause(sort)} LIMIT $${params.length + 1}`;
    params.push(limit);

    const [notificationsResult, unreadResult] = await Promise.all([
      runQuery(query, params),
      runQuery(
        `SELECT COUNT(*)::int AS count
         FROM notifications
         WHERE user_id::text = $1
           AND (is_read = false OR is_read IS NULL)
           AND (snoozed_until IS NULL OR snoozed_until <= NOW())`,
        [userId],
      ),
    ]);

    const notifications = (notificationsResult.rows || []).map((row) => {
      const images = normalizeImagesPayload(row.post_images);
      const metadata = row.metadata && typeof row.metadata === "object"
        ? row.metadata
        : (() => {
            try {
              return row.metadata ? JSON.parse(row.metadata) : null;
            } catch {
              return null;
            }
          })();

      const actionPath =
        row.action_path ||
        metadata?.action_path ||
        (row.post_id ? `/post/${row.post_id}` : null);

      const actionLabel =
        metadata?.action_label ||
        (row.type?.includes("inquiry") ? "Open Chat" : "View");

      return {
        ...row,
        group_key:
          row.group_key ||
          `${row.type || "general"}:${row.post_id || row.reference_id || row.notification_id}`,
        post: row.post_id
          ? {
              post_id: row.post_id,
              title: row.post_title,
              price: row.post_price,
              status: row.post_status,
              category_id: row.post_category_id,
              category_name: row.post_category_name,
              subcategory_id: row.post_subcategory_id,
              subcategory_name: row.post_subcategory_name,
              images,
              thumbnail_url:
                normalizeUploadsPath(row.thumbnail_url) ||
                images[0] ||
                null,
            }
          : null,
        sender: row.sender_id
          ? {
              id: row.sender_id,
              name: row.sender_name,
              avatar_url: normalizeUploadsPath(row.sender_avatar),
              verified: Boolean(row.sender_verified),
            }
          : null,
        action: actionPath
          ? {
              path: actionPath,
              label: actionLabel,
            }
          : null,
      };
    });

    const last = notifications[notifications.length - 1];
    const nextCursor =
      last?.created_at && last?.notification_id
        ? `${new Date(last.created_at).toISOString()}|${last.notification_id}`
        : null;

    return res.json({
      notifications,
      unreadCount: unreadResult.rows[0]?.count || 0,
      total: notifications.length,
      nextCursor,
      hasMore: notifications.length === limit,
    });
  } catch (err) {
    logger.error("Error fetching notifications:", err);
    return res.json({ notifications: [], unreadCount: 0, total: 0 });
  }
};

/**
 * PATCH /notifications/:notificationId/read
 * Mark a single notification as read for the authenticated user.
 *
 * @param {import("express").Request}  req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
exports.markAsRead = async (req, res) => {
  try {
    const notificationId = parseOptionalString(req.params.notificationId);
    const userId = enforceUserAccess(req, res);

    if (!notificationId) {
      return res.status(400).json({ error: "notificationId required" });
    }
    if (!userId) return;

    const result = await runQuery(
      `UPDATE notifications
       SET is_read = true
       WHERE notification_id::text = $1
         AND user_id::text = $2
       RETURNING notification_id`,
      [notificationId, userId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Notification not found" });
    }

    invalidateNotificationsCache(userId);
    return res.json({ success: true, notificationId });
  } catch (err) {
    logger.error("Error marking notification as read:", err);
    return res.status(500).json({ error: err.message });
  }
};

/**
 * PATCH /notifications/read-all
 * Mark every unread notification as read for the authenticated user.
 *
 * @param {import("express").Request}  req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = enforceUserAccess(req, res);
    if (!userId) return;

    const result = await runQuery(
      `WITH updated AS (
         UPDATE notifications
         SET is_read = true
         WHERE user_id::text = $1
           AND (is_read = false OR is_read IS NULL)
         RETURNING 1
       )
       SELECT COUNT(*)::int AS marked_count FROM updated`,
      [userId]
    );

    invalidateNotificationsCache(userId);
    return res.json({ success: true, markedCount: result.rows[0]?.marked_count || 0 });
  } catch (err) {
    logger.error("Error marking all notifications as read:", err);
    return res.status(500).json({ error: err.message });
  }
};

/**
 * DELETE /notifications/:notificationId
 * Delete a single notification belonging to the authenticated user.
 *
 * @param {import("express").Request}  req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
exports.deleteNotification = async (req, res) => {
  try {
    const notificationId = parseOptionalString(req.params.notificationId);
    const userId = enforceUserAccess(req, res);

    if (!notificationId) {
      return res.status(400).json({ error: "notificationId required" });
    }
    if (!userId) return;

    const result = await runQuery(
      `DELETE FROM notifications
       WHERE notification_id::text = $1
         AND user_id::text = $2
       RETURNING notification_id`,
      [notificationId, userId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Notification not found" });
    }

    invalidateNotificationsCache(userId);
    return res.json({ success: true, deleted: notificationId });
  } catch (err) {
    logger.error("Error deleting notification:", err);
    return res.status(500).json({ error: err.message });
  }
};

/**
 * PATCH /notifications/:notificationId/snooze
 * Snooze a notification until a future timestamp.
 *
 * Body params:
 *   - minutes {number} Snooze duration in minutes
 *   - until   {string} ISO datetime to snooze until
 */
exports.snoozeNotification = async (req, res) => {
  try {
    const notificationId = parseOptionalString(req.params.notificationId);
    const userId = enforceUserAccess(req, res);
    if (!notificationId) {
      return res.status(400).json({ error: "notificationId required" });
    }
    if (!userId) return;

    const minutesRaw = req.body?.minutes ?? req.query?.minutes;
    const untilRaw = parseOptionalString(req.body?.until || req.query?.until);
    const minutes = minutesRaw !== undefined ? Number(minutesRaw) : null;

    let snoozedUntil = null;
    if (untilRaw) {
      const parsed = new Date(untilRaw);
      if (!Number.isNaN(parsed.getTime())) {
        snoozedUntil = parsed;
      }
    }

    if (!snoozedUntil && Number.isFinite(minutes)) {
      const clamped = Math.max(0, Math.min(60 * 24 * 30, Number(minutes)));
      if (clamped > 0) {
        snoozedUntil = new Date(Date.now() + clamped * 60 * 1000);
      }
    }

    const result = await runQuery(
      `UPDATE notifications
       SET snoozed_until = $1
       WHERE notification_id::text = $2
         AND user_id::text = $3
       RETURNING notification_id, snoozed_until`,
      [snoozedUntil ? snoozedUntil.toISOString() : null, notificationId, userId],
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Notification not found" });
    }

    invalidateNotificationsCache(userId);
    return res.json({ success: true, item: result.rows[0] });
  } catch (err) {
    logger.error("Error snoozing notification:", err);
    return res.status(500).json({ error: err.message });
  }
};

/**
 * GET /notifications/preferences
 * Retrieve notification preferences for the authenticated user.
 */
exports.getNotificationPreferences = async (req, res) => {
  try {
    const userId = enforceUserAccess(req, res);
    if (!userId) return;

    const result = await runQuery(
      `
        SELECT
          user_id,
          email_enabled,
          push_enabled,
          sms_enabled,
          marketing_enabled,
          order_updates_enabled,
          price_drop_enabled,
          message_enabled,
          created_at,
          updated_at
        FROM notification_preferences
        WHERE user_id::text = $1
        LIMIT 1
      `,
      [userId],
    );

    if (!result.rows.length) {
      return res.json({
        user_id: userId,
        email_enabled: true,
        push_enabled: true,
        sms_enabled: false,
        marketing_enabled: true,
        order_updates_enabled: true,
        price_drop_enabled: true,
        message_enabled: true,
      });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    logger.error("Error fetching notification preferences:", err);
    return res.status(500).json({ error: err.message });
  }
};

/**
 * PUT /notifications/preferences
 * Update notification preferences for the authenticated user.
 */
exports.updateNotificationPreferences = async (req, res) => {
  try {
    const userId = enforceUserAccess(req, res);
    if (!userId) return;

    const payload = {
      email_enabled: req.body?.email_enabled,
      push_enabled: req.body?.push_enabled,
      sms_enabled: req.body?.sms_enabled,
      marketing_enabled: req.body?.marketing_enabled,
      order_updates_enabled: req.body?.order_updates_enabled,
      price_drop_enabled: req.body?.price_drop_enabled,
      message_enabled: req.body?.message_enabled,
    };

    const values = [
      userId,
      payload.email_enabled ?? null,
      payload.push_enabled ?? null,
      payload.sms_enabled ?? null,
      payload.marketing_enabled ?? null,
      payload.order_updates_enabled ?? null,
      payload.price_drop_enabled ?? null,
      payload.message_enabled ?? null,
    ];

    const result = await runQuery(
      `
        INSERT INTO notification_preferences (
          user_id,
          email_enabled,
          push_enabled,
          sms_enabled,
          marketing_enabled,
          order_updates_enabled,
          price_drop_enabled,
          message_enabled
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (user_id) DO UPDATE SET
          email_enabled = COALESCE(EXCLUDED.email_enabled, notification_preferences.email_enabled),
          push_enabled = COALESCE(EXCLUDED.push_enabled, notification_preferences.push_enabled),
          sms_enabled = COALESCE(EXCLUDED.sms_enabled, notification_preferences.sms_enabled),
          marketing_enabled = COALESCE(EXCLUDED.marketing_enabled, notification_preferences.marketing_enabled),
          order_updates_enabled = COALESCE(EXCLUDED.order_updates_enabled, notification_preferences.order_updates_enabled),
          price_drop_enabled = COALESCE(EXCLUDED.price_drop_enabled, notification_preferences.price_drop_enabled),
          message_enabled = COALESCE(EXCLUDED.message_enabled, notification_preferences.message_enabled),
          updated_at = NOW()
        RETURNING
          user_id,
          email_enabled,
          push_enabled,
          sms_enabled,
          marketing_enabled,
          order_updates_enabled,
          price_drop_enabled,
          message_enabled,
          updated_at
      `,
      values,
    );

    return res.json(result.rows[0]);
  } catch (err) {
    logger.error("Error updating notification preferences:", err);
    return res.status(500).json({ error: err.message });
  }
};

/**
 * GET /notifications/unread-count
 * Return the number of unread notifications for the authenticated user.
 *
 * @param {import("express").Request}  req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = enforceUserAccess(req, res);
    if (!userId) return;

    const cacheKey = buildNotificationsUnreadCacheKey(userId);

    const unreadCount = await cacheService.getOrSetWithStampedeProtection(
      cacheKey,
      async () => {
        const result = await runQuery(
          `SELECT COUNT(*)::int AS count
           FROM notifications
           WHERE user_id::text = $1
             AND (is_read = false OR is_read IS NULL)
             AND (snoozed_until IS NULL OR snoozed_until <= NOW())`,
          [userId]
        );
        return result.rows[0]?.count || 0;
      },
      NOTIFICATIONS_CACHE_TTL_SECONDS
    );

    return res.json({ unreadCount });
  } catch (err) {
    logger.error("Error getting unread count:", err);
    return res.json({ unreadCount: 0 });
  }
};

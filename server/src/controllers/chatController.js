const { pool, runQuery, getAuthUserId } = require("../utils/dbHelpers");
const { parseOptionalString, parsePositiveInt } = require("../utils/parseHelpers");
const { sendChatMessage } = require("../config/pusher");
const cacheService = require("../services/cacheService");
const logger = require("../utils/logger");

/* ── Constants ─────────────────────────────────────────────────── */

const DEFAULT_MESSAGES_PAGE = 1;
const DEFAULT_MESSAGES_LIMIT = 50;
const MAX_MESSAGES_LIMIT = 100;
const CHAT_CONVERSATIONS_CACHE_TTL = 15; // seconds
const CHAT_UNREAD_CACHE_TTL = 3;         // seconds (reduced from 10s for responsiveness)

/* ── Helpers ───────────────────────────────────────────────────── */

function idsEqual(a, b) {
  if (a == null || b == null) return false;
  return String(a) === String(b);
}

/**
 * Build a deterministic conversation ID from two user IDs (+ optional post).
 */
function compareIdsForConversation(a, b) {
  const left = String(a);
  const right = String(b);
  const leftIsInt = /^-?\d+$/.test(left);
  const rightIsInt = /^-?\d+$/.test(right);
  if (leftIsInt && rightIsInt) return Number(left) - Number(right);
  return left.localeCompare(right);
}

const getConversationId = (userId1, userId2, postId = null) => {
  const sorted = [userId1, userId2].sort(compareIdsForConversation);
  return postId
    ? `conv_${sorted[0]}_${sorted[1]}_${postId}`
    : `conv_${sorted[0]}_${sorted[1]}`;
};

function buildConversationsCacheKey(userId) {
  return `chat:${userId}:conversations`;
}
function buildUnreadCacheKey(userId) {
  return `chat:${userId}:unread`;
}

function invalidateChatCache(userId) {
  if (!userId) return;
  cacheService.clearPattern(`chat:${userId}:*`);
}

function isMessagesTableMissingError(error) {
  if (!error) return false;
  if (error.code === "42P01") return true;
  return String(error.message || "").toLowerCase().includes('relation "messages" does not exist');
}

const DEFAULT_CONVERSATIONS_LIMIT = 20;
const MAX_CONVERSATIONS_LIMIT = 50;

/* ── GET /api/chat/conversations ───────────────────────────────── */

const getConversations = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const page = parsePositiveInt(req.query.page, 1);
  const limit = parsePositiveInt(req.query.limit, DEFAULT_CONVERSATIONS_LIMIT, MAX_CONVERSATIONS_LIMIT);
  const offset = (page - 1) * limit;

  try {
    const userIdText = String(userId);
    const cacheKey = `${buildConversationsCacheKey(userIdText)}:p${page}:l${limit}`;

    const payload = await cacheService.getOrSetWithStampedeProtection(
      cacheKey,
      async () => {
        const countResult = await runQuery(
          `SELECT COUNT(DISTINCT conversation_id)::int AS total
           FROM messages
           WHERE sender_id::text = $1 OR receiver_id::text = $1`,
          [userIdText],
        );
        const total = countResult.rows[0]?.total || 0;

        const result = await runQuery(
          `WITH user_messages AS (
             SELECT m.*,
               CASE
                 WHEN m.sender_id::text = $1 THEN m.receiver_id
                 ELSE m.sender_id
               END AS other_user_id
             FROM messages m
             WHERE m.sender_id::text = $1 OR m.receiver_id::text = $1
           ),
           ranked_messages AS (
             SELECT um.*,
               ROW_NUMBER() OVER (
                 PARTITION BY um.conversation_id
                 ORDER BY um.created_at DESC
               ) AS rn
             FROM user_messages um
           ),
           unread_counts AS (
             SELECT conversation_id, COUNT(*)::int AS unread_count
             FROM messages
             WHERE receiver_id::text = $1 AND is_read = false
             GROUP BY conversation_id
           )
           SELECT
             rm.conversation_id,
             rm.post_id,
             p.title      AS post_title,
             p.images     AS post_images,
             rm.other_user_id,
             u.username    AS other_username,
             pr.full_name  AS other_name,
             pr.avatar_url AS other_avatar,
             rm.content    AS last_message,
             rm.created_at AS last_message_time,
             COALESCE(uc.unread_count, 0) AS unread_count
           FROM ranked_messages rm
           JOIN users u          ON u.user_id::text  = rm.other_user_id::text
           LEFT JOIN profiles pr ON pr.user_id::text = u.user_id::text
           LEFT JOIN posts p     ON p.post_id::text  = rm.post_id::text
           LEFT JOIN unread_counts uc ON uc.conversation_id = rm.conversation_id
           WHERE rm.rn = 1
           ORDER BY rm.created_at DESC
           LIMIT $2 OFFSET $3`,
          [userIdText, limit, offset],
        );
        return {
          conversations: result.rows,
          pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
      },
      CHAT_CONVERSATIONS_CACHE_TTL,
    );

    return res.json(payload);
  } catch (error) {
    if (isMessagesTableMissingError(error)) {
      return res.json({ conversations: [], pagination: { page, limit, total: 0, totalPages: 0 } });
    }
    logger.error("Get conversations error:", error);
    return res.status(500).json({ error: "Failed to fetch conversations" });
  }
};

/* ── GET /api/chat/:conversationId/messages ────────────────────── */

const getMessages = async (req, res) => {
  const userId = getAuthUserId(req);
  const conversationId = parseOptionalString(req.params.conversationId);
  const page = parsePositiveInt(req.query.page, DEFAULT_MESSAGES_PAGE);
  const limit = parsePositiveInt(req.query.limit, DEFAULT_MESSAGES_LIMIT, MAX_MESSAGES_LIMIT);
  const offset = (page - 1) * limit;

  if (!userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  if (!conversationId) {
    return res.status(400).json({ error: "Conversation ID is required" });
  }

  try {
    const userIdText = String(userId);

    // Verify the user is a participant
    const accessCheck = await runQuery(
      `SELECT 1 FROM messages
       WHERE conversation_id = $1
         AND (sender_id::text = $2 OR receiver_id::text = $2)
       LIMIT 1`,
      [conversationId, userIdText],
    );
    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ error: "Access denied" });
    }

    const result = await runQuery(
      `SELECT
         m.*,
         u.username    AS sender_username,
         pr.full_name  AS sender_name,
         pr.avatar_url AS sender_avatar
       FROM messages m
       JOIN users u          ON u.user_id::text  = m.sender_id::text
       LEFT JOIN profiles pr ON pr.user_id::text = m.sender_id::text
       WHERE m.conversation_id = $1
       ORDER BY m.created_at DESC
       LIMIT $2 OFFSET $3`,
      [conversationId, limit, offset],
    );

    // Mark messages as read
    await runQuery(
      `UPDATE messages SET is_read = true
       WHERE conversation_id = $1
         AND receiver_id::text = $2
         AND is_read = false`,
      [conversationId, userIdText],
    );

    invalidateChatCache(userIdText);

    return res.json({
      messages: result.rows.reverse(),
      pagination: { page, limit },
    });
  } catch (error) {
    if (isMessagesTableMissingError(error)) {
      return res.json({ messages: [], pagination: { page, limit } });
    }
    logger.error("Get messages error:", error);
    return res.status(500).json({ error: "Failed to fetch messages" });
  }
};

/* ── POST /api/chat/send ───────────────────────────────────────── */

const sendMessage = async (req, res) => {
  const senderId = getAuthUserId(req);
  const receiverId = parseOptionalString(req.body.receiverId || req.body.receiver_id);
  const postId = parseOptionalString(req.body.postId || req.body.post_id) || null;
  const messageType = parseOptionalString(req.body.messageType || req.body.message_type) || "text";
  const content = parseOptionalString(req.body.content);

  if (!senderId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  if (!receiverId || !content) {
    return res.status(400).json({ error: "Receiver ID and content required" });
  }
  if (idsEqual(senderId, receiverId)) {
    return res.status(400).json({ error: "Cannot message yourself" });
  }

  // Check if sender is blocked by receiver
  try {
    const blockCheck = await runQuery(
      `SELECT id FROM user_blocks
       WHERE blocker_id::text = $1 AND blocked_id::text = $2
       LIMIT 1`,
      [String(receiverId), String(senderId)]
    );
    if (blockCheck.rows.length > 0) {
      return res.status(403).json({ error: "You cannot send messages to this user" });
    }
  } catch (_blockErr) {
    // user_blocks table may not exist yet — allow message through
  }

  try {
    const senderIdText = String(senderId);
    const receiverIdText = String(receiverId);
    const conversationId = getConversationId(senderIdText, receiverIdText, postId);

    const result = await runQuery(
      `INSERT INTO messages (conversation_id, sender_id, receiver_id, post_id, content, message_type)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING
         message_id, conversation_id, sender_id, receiver_id,
         post_id, content, message_type, is_read, created_at`,
      [conversationId, senderIdText, receiverIdText, postId, content, messageType],
    );

    const savedMessage = result.rows[0];

    // Fire-and-forget: push real-time update via Pusher
    sendChatMessage(conversationId, savedMessage).catch((err) => {
      logger.error("[Pusher] Failed to send realtime:", err);
    });

    invalidateChatCache(senderIdText);
    invalidateChatCache(receiverIdText);

    return res.status(201).json({ message: "Message sent", data: savedMessage });
  } catch (error) {
    if (isMessagesTableMissingError(error)) {
      return res.status(503).json({ error: "Chat service unavailable" });
    }
    logger.error("Send message error:", error);
    return res.status(500).json({ error: "Failed to send message" });
  }
};

/* ── GET /api/chat/unread ──────────────────────────────────────── */

const getUnreadCount = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const userIdText = String(userId);
    const cacheKey = buildUnreadCacheKey(userIdText);

    const unreadCount = await cacheService.getOrSetWithStampedeProtection(
      cacheKey,
      async () => {
        const result = await runQuery(
          `SELECT COUNT(*)::int AS unread_count
           FROM messages
           WHERE receiver_id::text = $1 AND is_read = false`,
          [userIdText],
        );
        return result.rows[0]?.unread_count || 0;
      },
      CHAT_UNREAD_CACHE_TTL,
    );

    return res.json({ unreadCount });
  } catch (error) {
    if (isMessagesTableMissingError(error)) {
      return res.json({ unreadCount: 0 });
    }
    logger.error("Get unread count error:", error);
    return res.status(500).json({ error: "Failed to fetch unread count" });
  }
};

/* ── PUT /api/chat/:conversationId/delivered ─────────────────── */

const markDelivered = async (req, res) => {
  const userId = getAuthUserId(req);
  const conversationId = parseOptionalString(req.params.conversationId);
  if (!userId) return res.status(401).json({ error: "Authentication required" });
  if (!conversationId) return res.status(400).json({ error: "Conversation ID required" });
  try {
    await runQuery(
      `UPDATE messages SET delivered_at = NOW()
       WHERE conversation_id = $1 AND receiver_id::text = $2 AND delivered_at IS NULL`,
      [conversationId, String(userId)]
    );
    return res.json({ success: true });
  } catch (error) {
    if (isMessagesTableMissingError(error)) return res.json({ success: true });
    logger.error("Mark delivered error:", error);
    return res.status(500).json({ error: "Failed to mark delivered" });
  }
};

/* ── PUT /api/chat/:conversationId/seen ──────────────────────── */

const markSeen = async (req, res) => {
  const userId = getAuthUserId(req);
  const conversationId = parseOptionalString(req.params.conversationId);
  if (!userId) return res.status(401).json({ error: "Authentication required" });
  if (!conversationId) return res.status(400).json({ error: "Conversation ID required" });
  try {
    const userIdText = String(userId);
    await runQuery(
      `UPDATE messages SET is_read = true, seen_at = NOW()
       WHERE conversation_id = $1 AND receiver_id::text = $2 AND is_read = false`,
      [conversationId, userIdText]
    );
    invalidateChatCache(userIdText);
    return res.json({ success: true });
  } catch (error) {
    if (isMessagesTableMissingError(error)) return res.json({ success: true });
    logger.error("Mark seen error:", error);
    return res.status(500).json({ error: "Failed to mark seen" });
  }
};

module.exports = {
  getConversations,
  getMessages,
  sendMessage,
  getUnreadCount,
  markDelivered,
  markSeen,
  getConversationId,
};

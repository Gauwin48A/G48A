/**
 * Chat/Messages Controller
 * Real-time messaging between buyers and sellers
 * Protocol: Ironclad - Pusher Realtime
 */

const pool = require('../config/db');
const { sendChatMessage } = require('../config/pusher');
const cacheService = require('../services/cacheService');
const logger = require('../utils/logger');

const DEFAULT_MESSAGES_PAGE = 1;
const DEFAULT_MESSAGES_LIMIT = 50;
const MAX_MESSAGES_LIMIT = 100;
const CHAT_CONVERSATIONS_CACHE_TTL_SECONDS = 15;
const CHAT_UNREAD_CACHE_TTL_SECONDS = 10;
const DB_QUERY_TIMEOUT_MS = Number.parseInt(process.env.DB_QUERY_TIMEOUT_MS, 10) || 10000;

function getUserId(req) {
    return req.user?.userId || req.user?.id || req.user?.user_id || null;
}

function idsEqual(a, b) {
    if (a === undefined || a === null || b === undefined || b === null) return false;
    return String(a) === String(b);
}

function getScalarQueryValue(value) {
    return Array.isArray(value) ? value[0] : value;
}

function parseOptionalString(value) {
    const scalar = getScalarQueryValue(value);
    if (scalar === undefined || scalar === null) return null;
    const normalized = (typeof scalar === 'string' ? scalar : String(scalar)).trim();
    return normalized.length ? normalized : null;
}

function parsePositiveInt(value, fallback, max = Number.MAX_SAFE_INTEGER) {
    const normalized = parseOptionalString(value);
    if (!normalized || !/^\d+$/.test(normalized)) return fallback;
    const parsed = Number(normalized);
    if (!Number.isSafeInteger(parsed) || parsed < 1) return fallback;
    return Math.min(parsed, max);
}

function compareIdsForConversation(a, b) {
    const left = String(a);
    const right = String(b);
    const leftIsInt = /^-?\d+$/.test(left);
    const rightIsInt = /^-?\d+$/.test(right);

    if (leftIsInt && rightIsInt) {
        return Number(left) - Number(right);
    }
    return left.localeCompare(right);
}

// Generate conversation ID from two user IDs (always same regardless of order)
const getConversationId = (userId1, userId2, postId = null) => {
    const sorted = [userId1, userId2].sort(compareIdsForConversation);
    return postId ? `conv_${sorted[0]}_${sorted[1]}_${postId}` : `conv_${sorted[0]}_${sorted[1]}`;
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

function runQuery(text, values = []) {
    return pool.query({
        text,
        values,
        query_timeout: DB_QUERY_TIMEOUT_MS
    });
}

function isMessagesTableMissingError(error) {
    if (!error) return false;
    if (error.code === '42P01') return true;
    return String(error.message || '').toLowerCase().includes('relation "messages" does not exist');
}

// Get all conversations for a user
const getConversations = async (req, res) => {
    const userId = getUserId(req);

    if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const userIdText = String(userId);
        const cacheKey = buildConversationsCacheKey(userIdText);
        const payload = await cacheService.getOrSetWithStampedeProtection(
            cacheKey,
            async () => {
                const result = await runQuery(
                    `
                        WITH user_messages AS (
                            SELECT
                                m.*,
                                CASE
                                    WHEN m.sender_id::text = $1 THEN m.receiver_id
                                    ELSE m.sender_id
                                END AS other_user_id
                            FROM messages m
                            WHERE m.sender_id::text = $1 OR m.receiver_id::text = $1
                        ),
                        ranked_messages AS (
                            SELECT
                                um.*,
                                ROW_NUMBER() OVER (
                                    PARTITION BY um.conversation_id
                                    ORDER BY um.created_at DESC
                                ) AS rn
                            FROM user_messages um
                        ),
                        unread_counts AS (
                            SELECT
                                conversation_id,
                                COUNT(*)::int AS unread_count
                            FROM messages
                            WHERE receiver_id::text = $1 AND is_read = false
                            GROUP BY conversation_id
                        )
                        SELECT
                            rm.conversation_id,
                            rm.post_id,
                            p.title AS post_title,
                            p.images AS post_images,
                            rm.other_user_id,
                            u.username AS other_username,
                            pr.full_name AS other_name,
                            pr.avatar_url AS other_avatar,
                            rm.content AS last_message,
                            rm.created_at AS last_message_time,
                            COALESCE(uc.unread_count, 0) AS unread_count
                        FROM ranked_messages rm
                        JOIN users u
                            ON u.user_id::text = rm.other_user_id::text
                        LEFT JOIN profiles pr
                            ON pr.user_id::text = u.user_id::text
                        LEFT JOIN posts p
                            ON p.post_id = rm.post_id
                        LEFT JOIN unread_counts uc
                            ON uc.conversation_id = rm.conversation_id
                        WHERE rm.rn = 1
                        ORDER BY rm.created_at DESC
                    `,
                    [userIdText]
                );
                return { conversations: result.rows };
            },
            CHAT_CONVERSATIONS_CACHE_TTL_SECONDS
        );
        return res.json(payload);
    } catch (error) {
        if (isMessagesTableMissingError(error)) {
            return res.json({ conversations: [] });
        }
        logger.error('Get conversations error:', error);
        return res.status(500).json({ error: 'Failed to fetch conversations' });
    }
};

// Get messages in a conversation
const getMessages = async (req, res) => {
    const userId = getUserId(req);
    const conversationId = parseOptionalString(req.params.conversationId);
    const page = parsePositiveInt(req.query.page, DEFAULT_MESSAGES_PAGE);
    const limit = parsePositiveInt(req.query.limit, DEFAULT_MESSAGES_LIMIT, MAX_MESSAGES_LIMIT);
    const offset = (page - 1) * limit;

    if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    if (!conversationId) {
        return res.status(400).json({ error: 'Conversation ID is required' });
    }

    try {
        const userIdText = String(userId);

        // Verify user is part of conversation
        const accessCheck = await runQuery(
            `
                SELECT 1
                FROM messages
                WHERE conversation_id = $1
                  AND (sender_id::text = $2 OR receiver_id::text = $2)
                LIMIT 1
            `,
            [conversationId, userIdText]
        );

        if (accessCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const result = await runQuery(
            `
                SELECT
                    m.*,
                    u.username AS sender_username,
                    pr.full_name AS sender_name,
                    pr.avatar_url AS sender_avatar
                FROM messages m
                JOIN users u
                    ON u.user_id::text = m.sender_id::text
                LEFT JOIN profiles pr
                    ON pr.user_id::text = m.sender_id::text
                WHERE m.conversation_id = $1
                ORDER BY m.created_at DESC
                LIMIT $2 OFFSET $3
            `,
            [conversationId, limit, offset]
        );

        // Mark fetched thread as read for this receiver
        await runQuery(
            `
                UPDATE messages
                SET is_read = true
                WHERE conversation_id = $1
                  AND receiver_id::text = $2
                  AND is_read = false
            `,
            [conversationId, userIdText]
        );
        invalidateChatCache(userIdText);

        return res.json({
            messages: result.rows.reverse(),
            pagination: { page, limit }
        });
    } catch (error) {
        if (isMessagesTableMissingError(error)) {
            return res.json({
                messages: [],
                pagination: { page, limit }
            });
        }
        logger.error('Get messages error:', error);
        return res.status(500).json({ error: 'Failed to fetch messages' });
    }
};

// Send a message
const sendMessage = async (req, res) => {
    const senderId = getUserId(req);
    const receiverId = parseOptionalString(req.body.receiverId || req.body.receiver_id);
    const postId = parseOptionalString(req.body.postId || req.body.post_id) || null;
    const messageType = parseOptionalString(req.body.messageType || req.body.message_type) || 'text';
    const content = parseOptionalString(req.body.content);

    if (!senderId) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    if (!receiverId || !content) {
        return res.status(400).json({ error: 'Receiver ID and content required' });
    }

    if (idsEqual(senderId, receiverId)) {
        return res.status(400).json({ error: 'Cannot message yourself' });
    }

    try {
        const senderIdText = String(senderId);
        const receiverIdText = String(receiverId);
        const conversationId = getConversationId(senderIdText, receiverIdText, postId);

        const result = await runQuery(
            `
                INSERT INTO messages (conversation_id, sender_id, receiver_id, post_id, content, message_type)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING
                    message_id,
                    conversation_id,
                    sender_id,
                    receiver_id,
                    post_id,
                    content,
                    message_type,
                    is_read,
                    created_at
            `,
            [conversationId, senderIdText, receiverIdText, postId, content, messageType]
        );

        const savedMessage = result.rows[0];

        // Fire-and-forget realtime push
        sendChatMessage(conversationId, savedMessage).catch((err) => {
            logger.error('[Pusher] Failed to send realtime:', err);
        });
        invalidateChatCache(senderIdText);
        invalidateChatCache(receiverIdText);

        return res.status(201).json({
            message: 'Message sent',
            data: savedMessage
        });
    } catch (error) {
        if (isMessagesTableMissingError(error)) {
            return res.status(503).json({ error: 'Chat service unavailable' });
        }
        logger.error('Send message error:', error);
        return res.status(500).json({ error: 'Failed to send message' });
    }
};

// Get unread count
const getUnreadCount = async (req, res) => {
    const userId = getUserId(req);

    if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const userIdText = String(userId);
        const cacheKey = buildUnreadCacheKey(userIdText);
        const unreadCount = await cacheService.getOrSetWithStampedeProtection(
            cacheKey,
            async () => {
                const result = await runQuery(
                    `
                        SELECT COUNT(*)::int AS unread_count
                        FROM messages
                        WHERE receiver_id::text = $1 AND is_read = false
                    `,
                    [userIdText]
                );
                return result.rows[0]?.unread_count || 0;
            },
            CHAT_UNREAD_CACHE_TTL_SECONDS
        );

        return res.json({ unreadCount });
    } catch (error) {
        if (isMessagesTableMissingError(error)) {
            return res.json({ unreadCount: 0 });
        }
        logger.error('Get unread count error:', error);
        return res.status(500).json({ error: 'Failed to fetch unread count' });
    }
};

module.exports = {
    getConversations,
    getMessages,
    sendMessage,
    getUnreadCount,
    getConversationId
};

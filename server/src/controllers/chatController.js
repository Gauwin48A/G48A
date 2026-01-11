/**
 * Chat/Messages Controller
 * Real-time messaging between buyers and sellers
 * Protocol: Ironclad - Pusher Realtime
 */

const pool = require('../config/db');
const { sendChatMessage } = require('../config/pusher');

// Generate conversation ID from two user IDs (always same regardless of order)
const getConversationId = (userId1, userId2, postId = null) => {
    const sorted = [userId1, userId2].sort((a, b) => a - b);
    return postId ? `conv_${sorted[0]}_${sorted[1]}_${postId}` : `conv_${sorted[0]}_${sorted[1]}`;
};

// Get all conversations for a user
const getConversations = async (req, res) => {
    const userId = req.user?.userId;

    if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const result = await pool.query(`
      SELECT DISTINCT ON (m.conversation_id)
        m.conversation_id,
        m.post_id,
        p.title as post_title,
        p.images as post_images,
        CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END as other_user_id,
        u.username as other_username,
        pr.full_name as other_name,
        pr.avatar_url as other_avatar,
        m.content as last_message,
        m.created_at as last_message_time,
        (SELECT COUNT(*) FROM messages WHERE conversation_id = m.conversation_id AND receiver_id = $1 AND is_read = false) as unread_count
      FROM messages m
      JOIN users u ON u.user_id = CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END
      LEFT JOIN profiles pr ON pr.user_id = u.user_id
      LEFT JOIN posts p ON p.post_id = m.post_id
      WHERE m.sender_id = $1 OR m.receiver_id = $1
      ORDER BY m.conversation_id, m.created_at DESC
    `, [userId]);

        res.json({ conversations: result.rows });
    } catch (error) {
        console.error('Get conversations error:', error);
        res.status(500).json({ error: 'Failed to fetch conversations' });
    }
};

// Get messages in a conversation
const getMessages = async (req, res) => {
    const userId = req.user?.userId;
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        // Verify user is part of conversation
        const accessCheck = await pool.query(`
      SELECT 1 FROM messages 
      WHERE conversation_id = $1 AND (sender_id = $2 OR receiver_id = $2)
      LIMIT 1
    `, [conversationId, userId]);

        if (accessCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Get messages
        const result = await pool.query(`
      SELECT m.*, 
             u.username as sender_username,
             pr.full_name as sender_name,
             pr.avatar_url as sender_avatar
      FROM messages m
      JOIN users u ON u.user_id = m.sender_id
      LEFT JOIN profiles pr ON pr.user_id = m.sender_id
      WHERE m.conversation_id = $1
      ORDER BY m.created_at DESC
      LIMIT $2 OFFSET $3
    `, [conversationId, limit, offset]);

        // Mark as read
        await pool.query(`
      UPDATE messages SET is_read = true 
      WHERE conversation_id = $1 AND receiver_id = $2 AND is_read = false
    `, [conversationId, userId]);

        res.json({
            messages: result.rows.reverse(),
            pagination: { page: parseInt(page), limit: parseInt(limit) }
        });
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
};

// Send a message
const sendMessage = async (req, res) => {
    const senderId = req.user?.userId;
    const { receiverId, postId, content, messageType = 'text' } = req.body;

    if (!senderId) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    if (!receiverId || !content) {
        return res.status(400).json({ error: 'Receiver ID and content required' });
    }

    if (parseInt(senderId) === parseInt(receiverId)) {
        return res.status(400).json({ error: 'Cannot message yourself' });
    }

    try {
        const conversationId = getConversationId(senderId, receiverId, postId);

        const result = await pool.query(`
      INSERT INTO messages (conversation_id, sender_id, receiver_id, post_id, content, message_type)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [conversationId, senderId, receiverId, postId, content, messageType]);

        const savedMessage = result.rows[0];

        // Protocol: Ironclad - Trigger Pusher realtime event
        // Fire-and-forget: don't block response on Pusher
        sendChatMessage(conversationId, savedMessage).catch(err => {
            console.error('[Pusher] Failed to send realtime:', err);
        });

        res.status(201).json({
            message: 'Message sent',
            data: savedMessage
        });
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
};

// Get unread count
const getUnreadCount = async (req, res) => {
    const userId = req.user?.userId;

    if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const result = await pool.query(`
      SELECT COUNT(*) as unread_count 
      FROM messages 
      WHERE receiver_id = $1 AND is_read = false
    `, [userId]);

        res.json({ unreadCount: parseInt(result.rows[0].unread_count) });
    } catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({ error: 'Failed to fetch unread count' });
    }
};

module.exports = {
    getConversations,
    getMessages,
    sendMessage,
    getUnreadCount,
    getConversationId
};

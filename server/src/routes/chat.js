/**
 * Chat Routes
 */
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const chatController = require('../controllers/chatController');

// All routes require authentication
router.use(protect);

// Get all conversations
router.get('/conversations', chatController.getConversations);

// Get messages in a conversation
router.get('/conversations/:conversationId', chatController.getMessages);

// Send a message
router.post('/send', chatController.sendMessage);

// Get unread count
router.get('/unread', chatController.getUnreadCount);

module.exports = router;

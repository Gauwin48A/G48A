const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const chatController = require("../controllers/chatController");

/** All chat routes require authentication */
router.use(protect);

/**
 * @route GET /conversations - List user conversations
 * @route GET /conversations/:conversationId - Get messages in a conversation
 * @route POST /send - Send a new message
 * @route GET /unread - Get unread message count
 */
router.get("/conversations", chatController.getConversations);
router.get("/conversations/:conversationId", chatController.getMessages);
router.post("/send", chatController.sendMessage);
router.get("/unread", chatController.getUnreadCount);

module.exports = router;

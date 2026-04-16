const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const { protect } = require("../middleware/auth");
const chatController = require("../controllers/chatController");

/** All chat routes require authentication */
router.use(protect);

/** Rate limit chat message sending to prevent spam */
const chatSendLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many messages. Slow down." },
});

/**
 * @route GET /conversations - List user conversations (supports ?page=&limit=)
 * @route GET /conversations/:conversationId - Get messages in a conversation
 * @route POST /send - Send a new message (rate-limited)
 * @route GET /unread - Get unread message count
 */
router.get("/conversations", chatController.getConversations);
router.get("/conversations/:conversationId", chatController.getMessages);
router.post("/send", chatSendLimiter, chatController.sendMessage);
router.get("/unread", chatController.getUnreadCount);
router.put("/conversations/:conversationId/delivered", chatController.markDelivered);
router.put("/conversations/:conversationId/seen", chatController.markSeen);

module.exports = router;

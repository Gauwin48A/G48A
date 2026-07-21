const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");

// Optional auth helper depending on route setup
const authenticate = typeof authMiddleware === "function" 
  ? authMiddleware 
  : (authMiddleware.authenticate || ((req, res, next) => next()));

const controller = require("../controllers/notificationController");

// FCM Token registration
router.post("/fcm-token", authenticate, controller.registerFcmToken);
router.delete("/fcm-token", authenticate, controller.unregisterFcmToken);

// User notification history & read status
router.get("/", authenticate, controller.getNotifications);
router.patch("/read-all", authenticate, controller.markAllAsRead);
router.patch("/:id/read", authenticate, controller.markAsRead);

// Notification preferences
router.get("/preferences", authenticate, controller.getPreferences);
router.put("/preferences", authenticate, controller.updatePreferences);

// Trigger notification dispatch (Internal/Admin)
router.post("/send", authenticate, controller.sendNotification);

module.exports = router;

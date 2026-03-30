const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");
const { protect } = require("../middleware/auth");

/**
 * @route Notification routes
 * @description Manages user notifications: listing, read status, and deletion
 */

/** @route GET / - Get all notifications for the authenticated user */
router.get("/", protect, notificationController.getNotifications);

/** @route GET /unread-count - Get the count of unread notifications */
router.get("/unread-count", protect, notificationController.getUnreadCount);

/** @route PUT /:notificationId/read - Mark a single notification as read */
router.put("/:notificationId/read", protect, notificationController.markAsRead);

/** @route PUT /mark-all-read - Mark all notifications as read (PUT) */
router.put("/mark-all-read", protect, notificationController.markAllAsRead);

/** @route POST /mark-all-read - Mark all notifications as read (POST) */
router.post("/mark-all-read", protect, notificationController.markAllAsRead);

/** @route DELETE /:notificationId - Delete a notification */
router.delete("/:notificationId", protect, notificationController.deleteNotification);

/** @route PATCH /:notificationId/snooze - Snooze a notification */
router.patch("/:notificationId/snooze", protect, notificationController.snoozeNotification);

/** @route GET /preferences - Fetch notification preferences */
router.get("/preferences", protect, notificationController.getNotificationPreferences);

/** @route PUT /preferences - Update notification preferences */
router.put("/preferences", protect, notificationController.updateNotificationPreferences);

module.exports = router;

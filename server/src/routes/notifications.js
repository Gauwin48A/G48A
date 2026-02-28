/**
 * Notification Routes
 * Protocol: Value Hierarchy - Tier-aware notifications
 */

const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

// Get notifications for a user
router.get('/', protect, notificationController.getNotifications);

// Get unread count only (lightweight)
router.get('/unread-count', protect, notificationController.getUnreadCount);

// Mark a single notification as read
router.put('/:notificationId/read', protect, notificationController.markAsRead);

// Mark all notifications as read
router.put('/mark-all-read', protect, notificationController.markAllAsRead);
router.post('/mark-all-read', protect, notificationController.markAllAsRead); // Also allow POST

// Delete a notification
router.delete('/:notificationId', protect, notificationController.deleteNotification);

module.exports = router;


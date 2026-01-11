/**
 * Notification Routes
 * Protocol: Value Hierarchy - Tier-aware notifications
 */

const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

// Optional auth middleware - notifications can be fetched by userId in query
const optionalAuth = (req, res, next) => {
    // Allow requests with userId in query or authenticated requests
    next();
};

// Get notifications for a user
router.get('/', optionalAuth, notificationController.getNotifications);

// Get unread count only (lightweight)
router.get('/unread-count', optionalAuth, notificationController.getUnreadCount);

// Mark a single notification as read
router.put('/:notificationId/read', optionalAuth, notificationController.markAsRead);

// Mark all notifications as read
router.put('/mark-all-read', optionalAuth, notificationController.markAllAsRead);
router.post('/mark-all-read', optionalAuth, notificationController.markAllAsRead); // Also allow POST

// Delete a notification
router.delete('/:notificationId', optionalAuth, notificationController.deleteNotification);

module.exports = router;


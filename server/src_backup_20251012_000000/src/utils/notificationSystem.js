// Notification System
export const NotificationTypes = {
  SALE_INITIATED: 'sale_initiated',
  SALE_CONFIRMED: 'sale_confirmed',
  POST_EXPIRY_WARNING: 'post_expiry_warning',
  REPOST_OPPORTUNITY: 'repost_opportunity',
  REWARD_EARNED: 'reward_earned',
  ACCOUNT_RESTRICTION: 'account_restriction',
  ADMIN_ANNOUNCEMENT: 'admin_announcement'
};

export class NotificationManager {
  static sendNotification(userId, type, data) {
    const notification = {
      id: this.generateId(),
      userId,
      type,
      data,
      timestamp: new Date().toISOString(),
      read: false
    };

    // Store notification
    this.storeNotification(notification);
    
    // Send based on type
    switch (type) {
      case NotificationTypes.SALE_INITIATED:
        this.sendSaleInitiatedNotification(notification);
        break;
      case NotificationTypes.POST_EXPIRY_WARNING:
        this.sendExpiryWarning(notification);
        break;
      case NotificationTypes.REWARD_EARNED:
        this.sendRewardNotification(notification);
        break;
      default:
        this.sendGenericNotification(notification);
    }
  }

  static async storeNotification(notification) {
    // Store notification in backend
    await fetch(`http://localhost:5000/api/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notification)
    });
  }

  static async getUserNotifications(userId) {
    // Fetch notifications from backend API
    const res = await fetch(`http://localhost:5000/api/notifications?userId=${userId}`);
    return await res.json();
  }

  static async markAsRead(userId, notificationId) {
    // Mark notification as read in backend
    await fetch(`http://localhost:5000/api/notifications/${notificationId}/read`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    });
  }

  static sendSaleInitiatedNotification(notification) {
    // In-app notification
    this.showInAppNotification({
      title: 'Sale Initiated',
      message: `A sale has been initiated for post ${notification.data.postId}`,
      type: 'info'
    });

    // Email notification (simulate)
    this.sendEmail(notification.userId, 'Sale Confirmation Required', 
      `Please confirm the sale for post ${notification.data.postId}`);
  }

  static sendExpiryWarning(notification) {
    this.showInAppNotification({
      title: 'Post Expiring Soon',
      message: `Your post ${notification.data.postId} expires in ${notification.data.daysLeft} days`,
      type: 'warning'
    });
  }

  static sendRewardNotification(notification) {
    this.showInAppNotification({
      title: 'Reward Earned!',
      message: `You've earned ${notification.data.points} points!`,
      type: 'success'
    });
  }

  static sendGenericNotification(notification) {
    this.showInAppNotification({
      title: 'Notification',
      message: notification.data.message,
      type: 'info'
    });
  }

  static showInAppNotification(notification) {
    // This would integrate with your toast system
    if (window.showToast) {
      window.showToast({
        title: notification.title,
        description: notification.message,
        variant: notification.type === 'warning' ? 'destructive' : 'default'
      });
    }
  }

  static sendEmail(userId, subject, message) {
    // Email sending simulation - replace with actual email service
    console.log(`Email sent to user ${userId}: ${subject} - ${message}`);
  }

  static generateId() {
    return 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
  }

  // Reminder system
  static scheduleReminders(userId, postId, reminderCount = 0) {
    if (reminderCount >= 3) {
      // After 3 reminders, flag the user
      import('./fraudPrevention.js').then(({ flagSuspiciousActivity }) => {
        flagSuspiciousActivity(userId, 'no_response_to_sale_confirmation');
      });
      return;
    }

    // Schedule next reminder (simulate with setTimeout for demo)
    setTimeout(() => {
      this.sendNotification(userId, NotificationTypes.SALE_INITIATED, {
        postId,
        reminderNumber: reminderCount + 1,
        message: `Reminder ${reminderCount + 1}: Please respond to the sale confirmation`
      });

      // Schedule next reminder
      this.scheduleReminders(userId, postId, reminderCount + 1);
    }, 24 * 60 * 60 * 1000); // 24 hours
  }
}

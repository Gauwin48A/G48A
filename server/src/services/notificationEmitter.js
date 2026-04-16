let ioInstance = null;

/**
 * Register the Socket.IO instance for notification broadcasts.
 * @param {import("socket.io").Server} io
 */
function setNotificationSocket(io) {
  ioInstance = io;
}

/**
 * Emit a notification event to a specific user room.
 * Users are expected to join `user_<userId>` rooms on connect.
 * @param {string} userId
 * @param {object} payload
 * @returns {boolean}
 */
function emitNotification(userId, payload) {
  if (!ioInstance || !userId) return false;
  ioInstance.to(`user_${userId}`).emit("notification", payload);
  return true;
}

module.exports = {
  setNotificationSocket,
  emitNotification,
};

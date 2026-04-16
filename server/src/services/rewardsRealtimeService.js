const { EventEmitter } = require("events");

const rewardsEvents = new EventEmitter();
rewardsEvents.setMaxListeners(0);

/**
 * Build the event channel name for a given user.
 * @param {string} userId
 * @returns {string}
 */
function getChannelName(userId) {
  return `rewards:${String(userId || "").trim()}`;
}

/**
 * Publish a reward update event for a specific user.
 * @param {string} userId - Target user
 * @param {object} payload - Reward data to broadcast
 */
function publishRewardUpdate(userId, payload) {
  const channel = getChannelName(userId);
  rewardsEvents.emit(channel, {
    ...(payload || {}),
    userId: String(userId || ""),
    emittedAt: new Date().toISOString(),
  });
}

/**
 * Subscribe to reward update events for a specific user.
 * Returns an unsubscribe function.
 * @param {string} userId - User to listen for
 * @param {function} handler - Callback receiving the reward payload
 * @returns {function} Unsubscribe function
 */
function subscribeToRewardUpdates(userId, handler) {
  const channel = getChannelName(userId);
  rewardsEvents.on(channel, handler);
  return () => {
    rewardsEvents.off(channel, handler);
  };
}

module.exports = {
  publishRewardUpdate,
  subscribeToRewardUpdates,
};

const { EventEmitter } = require('events');

const rewardsEvents = new EventEmitter();
rewardsEvents.setMaxListeners(0);

function getChannelName(userId) {
    return `rewards:${String(userId || '').trim()}`;
}

function publishRewardUpdate(userId, payload) {
    const channel = getChannelName(userId);
    rewardsEvents.emit(channel, {
        ...(payload || {}),
        userId: String(userId || ''),
        emittedAt: new Date().toISOString()
    });
}

function subscribeToRewardUpdates(userId, handler) {
    const channel = getChannelName(userId);
    rewardsEvents.on(channel, handler);
    return () => {
        rewardsEvents.off(channel, handler);
    };
}

module.exports = {
    publishRewardUpdate,
    subscribeToRewardUpdates
};

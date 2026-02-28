/**
 * Activity Tracker Middleware
 * Protocol: Presence Tracking
 * 
 * Throttled heartbeat - only updates DB once every 5 minutes per user
 * Reduces 100,000 writes/sec to ~300 writes/sec
 */

const pool = require('../config/db');
const logger = require('../utils/logger');

const DB_QUERY_TIMEOUT_MS = Number.parseInt(process.env.DB_QUERY_TIMEOUT_MS, 10) || 10000;
const CACHE_CLEANUP_INTERVAL_MS = 60 * 60 * 1000;
const CACHE_CLEANUP_THRESHOLD_MS = 60 * 60 * 1000;
const TRACK_ACTIVITY_THRESHOLD_MS = 5 * 60 * 1000;

function runQuery(text, values = []) {
    return pool.query({
        text,
        values,
        query_timeout: DB_QUERY_TIMEOUT_MS
    });
}

// IN-MEMORY CACHE
// Stores userId -> lastUpdatedTimestamp
// With 1M users, this takes ~50MB RAM - acceptable
const activityCache = new Map();

// CLEANUP: Clear old entries every hour to prevent memory leaks
const activityCleanupTimer = setInterval(() => {
    const now = Date.now();

    for (const [userId, lastUpdate] of activityCache) {
        if (now - lastUpdate > CACHE_CLEANUP_THRESHOLD_MS) {
            activityCache.delete(userId);
        }
    }
}, CACHE_CLEANUP_INTERVAL_MS);

if (typeof activityCleanupTimer.unref === 'function') {
    activityCleanupTimer.unref();
}

/**
 * Track user activity with 5-minute throttle
 */
const trackActivity = (req, res, next) => {
    // Skip if user not authenticated
    if (!req.user) return next();

    const userId = req.user.user_id || req.user.id || req.user.userId;
    if (!userId) return next();

    const now = Date.now();
    const lastUpdate = activityCache.get(userId);

    // THE FIREWALL: Only update DB if > 5 minutes have passed
    if (lastUpdate && (now - lastUpdate) < TRACK_ACTIVITY_THRESHOLD_MS) {
        return next(); // Skip DB write, proceed to API
    }

    // Update cache immediately
    activityCache.set(userId, now);

    // FIRE AND FORGET - Don't await, don't slow down the request
    runQuery(
        'UPDATE users SET last_active_at = NOW() WHERE user_id = $1',
        [userId]
    ).catch(err => {
        // Silently fail on tracking errors
        logger.error('[Activity Tracker] Error:', err.message);
    });

    next();
};

/**
 * Get online users count (for admin dashboard)
 */
const getOnlineCount = async () => {
    try {
        const result = await runQuery(`
      SELECT COUNT(*) as online_count 
      FROM users 
      WHERE last_active_at > NOW() - INTERVAL '5 minutes'
    `);
        return parseInt(result.rows[0]?.online_count) || 0;
    } catch (err) {
        logger.error('[Activity Tracker] Count error:', err.message);
        return 0;
    }
};

/**
 * Check if a specific user is online
 */
const isUserOnline = (lastActiveAt) => {
    if (!lastActiveAt) return false;
    const date = new Date(lastActiveAt);
    const diffInMinutes = (Date.now() - date.getTime()) / 1000 / 60;
    return diffInMinutes < 6; // Online if active in last 6 minutes
};

module.exports = {
    trackActivity,
    getOnlineCount,
    isUserOnline
};

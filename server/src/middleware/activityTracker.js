/**
 * Activity Tracker Middleware
 * Protocol: Presence Tracking
 * 
 * Throttled heartbeat - only updates DB once every 5 minutes per user
 * Reduces 100,000 writes/sec to ~300 writes/sec
 */

const pool = require('../config/db');

// IN-MEMORY CACHE
// Stores userId -> lastUpdatedTimestamp
// With 1M users, this takes ~50MB RAM - acceptable
const activityCache = new Map();

// CLEANUP: Clear old entries every hour to prevent memory leaks
setInterval(() => {
    const now = Date.now();
    const CLEANUP_THRESHOLD = 60 * 60 * 1000; // 1 hour

    for (const [userId, lastUpdate] of activityCache) {
        if (now - lastUpdate > CLEANUP_THRESHOLD) {
            activityCache.delete(userId);
        }
    }
}, 60 * 60 * 1000);

/**
 * Track user activity with 5-minute throttle
 */
const trackActivity = async (req, res, next) => {
    // Skip if user not authenticated
    if (!req.user) return next();

    const userId = req.user.user_id || req.user.id || req.user.userId;
    if (!userId) return next();

    const now = Date.now();
    const lastUpdate = activityCache.get(userId);
    const THRESHOLD = 5 * 60 * 1000; // 5 minutes

    // THE FIREWALL: Only update DB if > 5 minutes have passed
    if (lastUpdate && (now - lastUpdate) < THRESHOLD) {
        return next(); // Skip DB write, proceed to API
    }

    // Update cache immediately
    activityCache.set(userId, now);

    // FIRE AND FORGET - Don't await, don't slow down the request
    pool.query(
        'UPDATE users SET last_active_at = NOW() WHERE user_id = $1',
        [userId]
    ).catch(err => {
        // Silently fail on tracking errors
        console.error('[Activity Tracker] Error:', err.message);
    });

    next();
};

/**
 * Get online users count (for admin dashboard)
 */
const getOnlineCount = async () => {
    try {
        const result = await pool.query(`
      SELECT COUNT(*) as online_count 
      FROM users 
      WHERE last_active_at > NOW() - INTERVAL '5 minutes'
    `);
        return parseInt(result.rows[0]?.online_count) || 0;
    } catch (err) {
        console.error('[Activity Tracker] Count error:', err.message);
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

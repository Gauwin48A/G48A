const { runQuery } = require("../utils/dbHelpers");
const logger = require("../utils/logger");
const { recordVisit } = require("../services/streakRewardsService");

const CACHE_CLEANUP_INTERVAL_MS = 60 * 60 * 1e3;
const CACHE_CLEANUP_THRESHOLD_MS = 60 * 60 * 1e3;
const TRACK_ACTIVITY_THRESHOLD_MS = 5 * 60 * 1e3;

/** In-memory cache mapping userId to last-activity timestamp (epoch ms). */
const activityCache = new Map();

/** Periodic cleanup timer that removes stale entries from the activity cache. */
const activityCleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [userId, lastUpdate] of activityCache) {
    if (now - lastUpdate > CACHE_CLEANUP_THRESHOLD_MS) {
      activityCache.delete(userId);
    }
  }
}, CACHE_CLEANUP_INTERVAL_MS);

if (typeof activityCleanupTimer.unref === "function") {
  activityCleanupTimer.unref();
}

/**
 * Express middleware that updates the authenticated user's last-active timestamp.
 * Throttles DB writes to at most once per TRACK_ACTIVITY_THRESHOLD_MS (5 min)
 * using an in-memory cache. Also records a visit for streak/rewards tracking.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const trackActivity = (req, res, next) => {
  if (!req.user) return next();

  const userId = req.user.user_id || req.user.id || req.user.userId;
  if (!userId) return next();

  const now = Date.now();
  const lastUpdate = activityCache.get(userId);
  if (lastUpdate && now - lastUpdate < TRACK_ACTIVITY_THRESHOLD_MS) {
    return next();
  }

  activityCache.set(userId, now);

  runQuery(
    "UPDATE users SET last_active_at = NOW() WHERE user_id = $1",
    [userId]
  ).catch(err => {
    logger.error("[Activity Tracker] Error:", err.message);
  });

  recordVisit(String(userId)).catch(err => {
    logger.warn("[Activity Tracker] Streak update failed", {
      message: err.message
    });
  });

  next();
};

/**
 * Retrieve the count of users active in the last 5 minutes.
 * @returns {Promise<number>} Number of currently online users.
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
    logger.error("[Activity Tracker] Count error:", err.message);
    return 0;
  }
};

/**
 * Determine whether a user is currently online based on their last active timestamp.
 * A user is considered online if active within the last 6 minutes.
 * @param {string|Date|null} lastActiveAt - The user's last_active_at value.
 * @returns {boolean} True if the user is online.
 */
const isUserOnline = (lastActiveAt) => {
  if (!lastActiveAt) return false;
  const date = new Date(lastActiveAt);
  const diffInMinutes = (Date.now() - date.getTime()) / 1e3 / 60;
  return diffInMinutes < 6;
};

module.exports = {
  trackActivity,
  getOnlineCount,
  isUserOnline
};

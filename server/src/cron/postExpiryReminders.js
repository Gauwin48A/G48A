/**
 * postExpiryReminders.js
 *
 * Reminds listing owners about posts nearing expiry:
 *  - ≤ 7 days left  → "Is your post sold?"  (actions: Mark Sold / Still Available)
 *  - ≤ 2 days left  → "Expiring soon — repost now?" (action: Repost)
 *
 * Runs daily from cronJobs.js. Reminders are sent at most once per post per
 * window (tracked via the notifications reference_id/type), so they keep asking
 * until the owner responds (marks sold / reposts / deletes) — exactly once per
 * threshold, not every day.
 */
const pool = require("../config/db");
const logger = require("../utils/logger");
const { emitNotification } = require("../services/notificationEmitter");

const WINDOW_7D = "post_expiry_sold_prompt";
const WINDOW_2D = "post_expiry_repost_prompt";

async function hasReminderBeenSent(userId, postId, windowType) {
  try {
    // emitNotification stores extra metadata in the `data` JSONB column, so the
    // dedupe keys off data->>'post_id' (reference_id may be unset on old rows).
    const result = await pool.query(
      `SELECT 1 FROM notifications
       WHERE user_id::text = $1
         AND type = $2
         AND data->>'post_id' = $3
       LIMIT 1`,
      [String(userId), windowType, String(postId)]
    );
    return result.rows.length > 0;
  } catch (err) {
    // data column missing on legacy schemas — fail-open (send anyway)
    logger.warn("[ExpiryReminders] duplicate-check failed:", err.message);
    return false;
  }
}

/**
 * Find active posts whose expiry falls inside [fromDays, toDays] from now
 * (inclusive) and whose owner still has a reachable push device.
 */
async function findPostsExpiringIn(fromDays, toDays) {
  const fromDate = new Date(Date.now() + fromDays * 24 * 60 * 60 * 1000);
  const toDate = new Date(Date.now() + toDays * 24 * 60 * 60 * 1000);
  const result = await pool.query(
    `SELECT p.post_id::text AS post_id, p.title, p.user_id::text AS user_id,
            p.expires_at, p.status
     FROM posts p
     WHERE p.status = 'active'
       AND p.expires_at IS NOT NULL
       AND p.expires_at > NOW()
       AND p.expires_at BETWEEN $1 AND $2
       AND EXISTS (
         SELECT 1 FROM device_tokens dt
         WHERE dt.user_id = p.user_id AND dt.is_active = true
       )`,
    [fromDate, toDate]
  );
  return result.rows;
}

/**
 * Send the two expiry reminders for all eligible posts.
 * @returns {{sent7: number, sent2: number}} counts for logging
 */
async function sendExpiryReminders() {
  const summary = { sent7: 0, sent2: 0 };

  try {
    // ── ≤ 7 days: Sold / Not sold prompt ────────────────────────────────
    const posts7 = await findPostsExpiringIn(0, 7);
    for (const post of posts7) {
      const already = await hasReminderBeenSent(post.user_id, post.post_id, WINDOW_7D);
      if (already) continue;
      const ok = await emitNotification(post.user_id, {
        title: "Is this post sold? 🏷️",
        message: `"${post.title}" expires in under a week. Mark it sold, or keep it live — tap to choose.`,
        type: WINDOW_7D,
        deep_link: `mhub://post/${post.post_id}`,
        data: {
          post_id: post.post_id,
          action_type: "sold_prompt",
          window: "7d",
        },
      });
      if (ok) summary.sent7++;
    }

    // ── ≤ 2 days: Repost prompt ─────────────────────────────────────────
    const posts2 = await findPostsExpiringIn(0, 2);
    for (const post of posts2) {
      const already = await hasReminderBeenSent(post.user_id, post.post_id, WINDOW_2D);
      if (already) continue;
      const ok = await emitNotification(post.user_id, {
        title: "Your post is expiring soon ⏳",
        message: `"${post.title}" expires in 2 days. Repost it now to keep it live for another full visibility period.`,
        type: WINDOW_2D,
        deep_link: `mhub://post/${post.post_id}`,
        data: {
          post_id: post.post_id,
          action_type: "repost_prompt",
          window: "2d",
        },
      });
      if (ok) summary.sent2++;
    }
  } catch (err) {
    logger.error("[ExpiryReminders] sendExpiryReminders error:", err.message);
  }

  if (summary.sent7 > 0 || summary.sent2 > 0) {
    logger.info(`[ExpiryReminders] Sent ${summary.sent7} sold-prompt(s), ${summary.sent2} repost-prompt(s)`);
  }
  return summary;
}

module.exports = { sendExpiryReminders, WINDOW_7D, WINDOW_2D };

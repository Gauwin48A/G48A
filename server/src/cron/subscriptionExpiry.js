const { pool, runQuery } = require("../utils/dbHelpers");
const logger = require("../utils/logger");

/**
 * Expire subscriptions that have passed their expiry date.
 * Downgrades user to basic plan, removes subscription benefits.
 */
async function expireSubscriptions() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Find and deactivate expired subscriptions
    const expired = await client.query(
      `UPDATE user_subscriptions
       SET is_active = false
       WHERE is_active = true
         AND expires_at IS NOT NULL
         AND expires_at < NOW()
       RETURNING id, user_id, plan_name, expires_at`,
    );

    if (expired.rows.length === 0) {
      await client.query("COMMIT");
      return { expiredCount: 0, downgraded: [] };
    }

    const downgraded = [];

    for (const sub of expired.rows) {
      // Check if user has another active subscription
      const otherActive = await client.query(
        `SELECT id, plan_name FROM user_subscriptions
         WHERE user_id = $1 AND is_active = true AND id != $2
         ORDER BY created_at DESC LIMIT 1`,
        [sub.user_id, sub.id],
      );

      if (otherActive.rows.length === 0) {
        // No other active sub — downgrade to basic
        await client.query(
          `UPDATE users SET current_plan = 'basic', subscription_id = NULL WHERE user_id = $1`,
          [sub.user_id],
        );

        // Notify user
        await client.query(
          `INSERT INTO notifications (user_id, title, message, type, created_at)
           VALUES ($1, 'Subscription Expired', $2, 'subscription_expired', NOW())`,
          [
            sub.user_id,
            `Your ${sub.plan_name.toUpperCase()} plan has expired. You've been moved to the Basic plan. Renew to restore your benefits!`,
          ],
        ).catch(() => {});

        downgraded.push({ userId: sub.user_id, fromPlan: sub.plan_name });
      }
    }

    await client.query("COMMIT");

    logger.info(`[SubExpiry] Expired ${expired.rows.length} subscriptions, downgraded ${downgraded.length} users`);
    return { expiredCount: expired.rows.length, downgraded };
  } catch (err) {
    await client.query("ROLLBACK");
    logger.error("[SubExpiry] Error:", err.message);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Expire listing boosts that have passed their expiry date.
 * Resets boost_level on posts.
 */
async function expireBoosts() {
  try {
    // Mark expired boosts as inactive
    const expired = await runQuery(
      `UPDATE post_boosts
       SET status = 'expired'
       WHERE status = 'active'
         AND expires_at < NOW()
       RETURNING post_id, boost_type`,
    );

    if (expired.rows.length === 0) return { expiredBoosts: 0 };

    // Recalculate boost_level for affected posts
    const affectedPostIds = [...new Set(expired.rows.map(r => r.post_id))];

    for (const postId of affectedPostIds) {
      // Get highest active boost level for this post
      const maxBoost = await runQuery(
        `SELECT COALESCE(MAX(
          CASE boost_type
            WHEN 'spotlight' THEN 3
            WHEN 'featured' THEN 2
            WHEN 'boost' THEN 1
            ELSE 0
          END
        ), 0) AS max_level
        FROM post_boosts
        WHERE post_id::text = $1 AND status = 'active' AND expires_at > NOW()`,
        [String(postId)],
      );

      await runQuery(
        "UPDATE posts SET boost_level = $1 WHERE post_id::text = $2",
        [maxBoost.rows[0]?.max_level || 0, String(postId)],
      );
    }

    logger.info(`[BoostExpiry] Expired ${expired.rows.length} boosts across ${affectedPostIds.length} posts`);
    return { expiredBoosts: expired.rows.length, affectedPosts: affectedPostIds.length };
  } catch (err) {
    logger.error("[BoostExpiry] Error:", err.message);
    throw err;
  }
}

/**
 * Set listing expiry dates based on tier visibility rules.
 * Basic = 15 days, Bronze = 30 days, Silver = 30 days, Premium = 45 days.
 * Only sets expires_at for posts that don't have one yet.
 */
async function setTierBasedExpiry() {
  try {
    const result = await runQuery(
      `UPDATE posts
       SET expires_at = created_at + CASE
         WHEN (SELECT current_plan FROM users WHERE users.user_id = posts.user_id) = 'premium' THEN INTERVAL '45 days'
         WHEN (SELECT current_plan FROM users WHERE users.user_id = posts.user_id) IN ('silver', 'bronze') THEN INTERVAL '30 days'
         ELSE INTERVAL '15 days'
       END
       WHERE status = 'active'
         AND expires_at IS NULL
       RETURNING post_id`,
    );

    const count = result.rows.length;
    if (count > 0) {
      logger.info(`[TierExpiry] Set tier-based expiry for ${count} posts`);
    }
    return { updatedCount: count };
  } catch (err) {
    logger.error("[TierExpiry] Error:", err.message);
    throw err;
  }
}

module.exports = { expireSubscriptions, expireBoosts, setTierBasedExpiry };

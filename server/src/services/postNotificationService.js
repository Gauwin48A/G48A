const { runQuery } = require("../utils/dbHelpers");
const { emitNotification } = require("./notificationEmitter");
const logger = require("../utils/logger");

/**
 * Dispatch dynamic notifications when a post is marked as SOLD.
 *
 * @param {object} params
 * @param {string|number} params.postId
 * @param {string|number} params.sellerId
 * @param {string|number} [params.buyerId]
 * @param {number} [params.salePrice]
 */
async function notifyPostSaleDone({ postId, sellerId, buyerId = null, salePrice = null }) {
  if (!postId || !sellerId) return;

  try {
    const postRes = await runQuery(
      `SELECT post_id, title, price, images, user_id FROM posts WHERE post_id::text = $1::text`,
      [String(postId)]
    );
    if (!postRes.rows.length) return;
    const post = postRes.rows[0];
    const postTitle = post.title || "Your Item";

    let postImage = null;
    if (Array.isArray(post.images) && post.images.length > 0) {
      postImage = typeof post.images[0] === "string" ? post.images[0] : post.images[0]?.url || null;
    } else if (typeof post.images === "string" && post.images.startsWith("[")) {
      try {
        const parsed = JSON.parse(post.images);
        if (Array.isArray(parsed) && parsed.length > 0) postImage = parsed[0];
      } catch (_) {}
    }

    // 1. Notify Seller
    await emitNotification(String(sellerId), {
      title: `🛍️ Listing Marked Sold: ${postTitle}`,
      message: `Your post "${postTitle}" has been marked as sold on the marketplace.`,
      type: "sale_done",
      sender_id: String(sellerId),
      image_url: postImage,
      deep_link: `zaruda://post_detail?post_id=${postId}`,
      data: { post_id: String(postId), status: "sold" },
    });

    // 2. Notify Buyer if specified
    if (buyerId && String(buyerId) !== String(sellerId)) {
      await emitNotification(String(buyerId), {
        title: `🎉 Purchase Confirmed: ${postTitle}`,
        message: `Your purchase of "${postTitle}" has been confirmed by the seller!`,
        type: "purchase_confirmed",
        sender_id: String(sellerId),
        image_url: postImage,
        deep_link: `zaruda://post_detail?post_id=${postId}`,
        data: { post_id: String(postId), status: "sold" },
      });
    }

    // 3. Notify inquirers / interested buyers
    try {
      const inquirersRes = await runQuery(
        `SELECT DISTINCT user_id FROM (
           SELECT user_id::text FROM inquiries WHERE post_id::text = $1::text
           UNION
           SELECT buyer_id::text AS user_id FROM offers WHERE post_id::text = $1::text
         ) q WHERE user_id != $2::text ${buyerId ? `AND user_id != $3::text` : ""}`,
        buyerId ? [String(postId), String(sellerId), String(buyerId)] : [String(postId), String(sellerId)]
      );

      for (const row of inquirersRes.rows) {
        if (!row.user_id) continue;
        await emitNotification(row.user_id, {
          title: `🏷️ Listing Status Update: ${postTitle}`,
          message: `The item "${postTitle}" you inquired about has been marked as sold.`,
          type: "post_sold_alert",
          sender_id: String(sellerId),
          image_url: postImage,
          deep_link: `zaruda://post_detail?post_id=${postId}`,
          data: { post_id: String(postId), status: "sold" },
        });
      }
    } catch (inqErr) {
      logger.warn(`[PostNotificationService] Optional inquirer notification skip: ${inqErr.message}`);
    }
  } catch (err) {
    logger.error(`[PostNotificationService] Error notifying sale done for post ${postId}:`, err.message);
  }
}

/**
 * Dispatch dynamic notifications when a post is REPOSTED or REACTIVATED.
 *
 * @param {object} params
 * @param {string|number} params.postId
 * @param {string|number} params.sellerId
 * @param {string|Date} [params.expiresAt]
 */
async function notifyPostReposted({ postId, sellerId, expiresAt = null }) {
  if (!postId || !sellerId) return;

  try {
    const postRes = await runQuery(
      `SELECT post_id, title, price, images, user_id FROM posts WHERE post_id::text = $1::text`,
      [String(postId)]
    );
    if (!postRes.rows.length) return;
    const post = postRes.rows[0];
    const postTitle = post.title || "Your Item";

    let postImage = null;
    if (Array.isArray(post.images) && post.images.length > 0) {
      postImage = typeof post.images[0] === "string" ? post.images[0] : post.images[0]?.url || null;
    } else if (typeof post.images === "string" && post.images.startsWith("[")) {
      try {
        const parsed = JSON.parse(post.images);
        if (Array.isArray(parsed) && parsed.length > 0) postImage = parsed[0];
      } catch (_) {}
    }

    // 1. Notify Seller
    await emitNotification(String(sellerId), {
      title: `🚀 Listing Reposted: ${postTitle}`,
      message: `Your post "${postTitle}" has been reactivated and is back live on the marketplace with renewed visibility!`,
      type: "repost_success",
      sender_id: String(sellerId),
      image_url: postImage,
      deep_link: `zaruda://post_detail?post_id=${postId}`,
      data: { post_id: String(postId), status: "active", expires_at: expiresAt },
    });

    // 2. Notify interested buyers / inquirers
    try {
      const interestedRes = await runQuery(
        `SELECT DISTINCT user_id FROM (
           SELECT user_id::text FROM inquiries WHERE post_id::text = $1::text
           UNION
           SELECT buyer_id::text AS user_id FROM offers WHERE post_id::text = $1::text
         ) q WHERE user_id != $2::text`,
        [String(postId), String(sellerId)]
      );

      for (const row of interestedRes.rows) {
        if (!row.user_id) continue;
        await emitNotification(row.user_id, {
          title: `✨ Relisted Item Back Online: ${postTitle}`,
          message: `Good news! "${postTitle}" is back on the market. Tap to check out the listing!`,
          type: "post_reposted_alert",
          sender_id: String(sellerId),
          image_url: postImage,
          deep_link: `zaruda://post_detail?post_id=${postId}`,
          data: { post_id: String(postId), status: "active" },
        });
      }
    } catch (inqErr) {
      logger.warn(`[PostNotificationService] Optional inquirer notification skip: ${inqErr.message}`);
    }
  } catch (err) {
    logger.error(`[PostNotificationService] Error notifying repost for post ${postId}:`, err.message);
  }
}

module.exports = {
  notifyPostSaleDone,
  notifyPostReposted,
};

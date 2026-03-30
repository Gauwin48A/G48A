/**
 * Coin Economy Hooks
 * Middleware wrappers that award coins after successful post creation and sales.
 * These wrap the response to intercept success responses and award coins.
 */
const logger = require("../utils/logger");

/**
 * Express middleware: Award 1 coin after successful post creation (status 201)
 */
function awardCoinOnPostCreate(req, res, next) {
  const originalJson = res.json.bind(res);
  res.json = function (body) {
    // Only award for successful post creation
    const postId =
      body?.post_id ||
      body?.post?.post_id ||
      body?.post?.id ||
      null;
    if (res.statusCode >= 200 && res.statusCode < 300 && postId) {
      const userId = req.user?.userId || req.user?.id || req.user?.user_id;
      if (userId) {
        // Fire and forget — don't block the response
        setImmediate(async () => {
          try {
            const { addCoins } = require("../controllers/coinController");
            await addCoins(
              userId, 1, "post",
              `post_create:${postId}`,
              "Earned 1 coin for creating a listing",
            );
            const { applyReferralJoinCoinRewards } = require("../services/referralJoinRewards");
            await applyReferralJoinCoinRewards({
              subjectUserId: userId,
              requireVerified: true,
              requireActivity: true,
              context: {
                trigger: "post_create",
                ipAddress: req.ip,
                deviceId: req.headers["x-device-id"] || req.headers["user-agent"] || null,
              },
            });
          } catch (err) {
            logger.warn("[CoinHook] Failed to award post creation coin:", err.message);
          }
        });
      }
    }
    return originalJson(body);
  };
  next();
}

/**
 * Express middleware: Award 3 coins to seller after successful sale marking
 */
function awardCoinOnSale(req, res, next) {
  const originalJson = res.json.bind(res);
  res.json = function (body) {
    if (res.statusCode >= 200 && res.statusCode < 300 && body?.success && body?.status === "sold") {
      const userId = req.user?.userId || req.user?.id || req.user?.user_id;
      const postId = req.params?.postId || req.params?.id || body?.post_id;
      if (userId && postId) {
        setImmediate(async () => {
          try {
            const { addCoins } = require("../controllers/coinController");
            await addCoins(
              userId, 3, "sale",
              `sale:${postId}:${userId}`,
              "Earned 3 coins for completing a sale",
            );
            const { applyReferralJoinCoinRewards } = require("../services/referralJoinRewards");
            await applyReferralJoinCoinRewards({
              subjectUserId: userId,
              requireVerified: true,
              requireActivity: true,
              context: {
                trigger: "sale_completed",
                ipAddress: req.ip,
                deviceId: req.headers["x-device-id"] || req.headers["user-agent"] || null,
              },
            });
          } catch (err) {
            logger.warn("[CoinHook] Failed to award sale coin:", err.message);
          }
        });
      }
    }
    return originalJson(body);
  };
  next();
}

module.exports = { awardCoinOnPostCreate, awardCoinOnSale };

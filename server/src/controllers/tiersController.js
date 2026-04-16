const { runQuery } = require("../utils/dbHelpers");
const logger = require("../utils/logger");
const cacheService = require("../services/cacheService");

const TIER_CACHE_TTL_SECONDS = Number.parseInt(process.env.TIER_CACHE_TTL_SECONDS, 10) || 300;

const defaultTiers = [
  { tier_id: 1, name: "Free", price: 0, description: "Basic listing with limited features", max_images: 1, color: "gray-400", icon: "FiDollarSign", tier_order: 1 },
  { tier_id: 2, name: "Basic", price: 1.99, description: "Standard listing with more visibility", max_images: 3, color: "blue-400", icon: "FiShield", tier_order: 2 },
  { tier_id: 3, name: "Featured", price: 4.99, description: "Prominent listing with enhanced features", max_images: 5, color: "yellow-400", icon: "FiStar", tier_order: 3 },
  { tier_id: 4, name: "Premium", price: 9.99, description: "Top-tier listing for maximum exposure", max_images: 10, color: "purple-400", icon: "FiCrown", tier_order: 4 },
];

/**
 * GET /api/tiers
 * Returns all available tiers with caching. Falls back to default tiers on error.
 */
exports.getTiers = async (req, res) => {
  try {
    const tiers = await cacheService.getOrSetWithStampedeProtection(
      "tiers:all",
      async () => {
        const result = await runQuery(
          `SELECT tier_id, name, price, description, features
           FROM tiers
           ORDER BY tier_id ASC`,
        );
        return result.rows.map((row, idx) => ({
          ...row,
          max_images: defaultTiers[idx]?.max_images || 1,
          color: defaultTiers[idx]?.color || "gray-400",
          icon: defaultTiers[idx]?.icon || "FiDollarSign",
          tier_order: idx + 1,
        }));
      },
      TIER_CACHE_TTL_SECONDS,
    );

    if (tiers && tiers.length > 0) {
      res.json(tiers);
    } else {
      res.json(defaultTiers);
    }
  } catch (err) {
    logger.error("[Tiers] Error:", err.message);
    res.json(defaultTiers);
  }
};

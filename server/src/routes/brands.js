const express = require("express");
const router = express.Router();
const { runQuery } = require("../utils/dbHelpers");
const logger = require("../utils/logger");
const cacheService = require("../services/cacheService");
const { publicReadSlowDown } = require("../middleware/rateLimiter");

const BRAND_CACHE_TTL_SECONDS =
  Number.parseInt(process.env.BRAND_CACHE_TTL_SECONDS, 10) || 300;

/** Default brand list used as fallback when the DB is unavailable */
const defaultBrands = [
  { brand_id: 1, name: "Apple" },
  { brand_id: 2, name: "Samsung" },
  { brand_id: 3, name: "OnePlus" },
  { brand_id: 4, name: "Xiaomi" },
  { brand_id: 5, name: "Oppo" },
  { brand_id: 6, name: "Vivo" },
  { brand_id: 7, name: "Realme" },
  { brand_id: 8, name: "Google" },
  { brand_id: 9, name: "Sony" },
  { brand_id: 10, name: "Nokia" },
  { brand_id: 11, name: "Motorola" },
  { brand_id: 12, name: "LG" },
  { brand_id: 13, name: "Other" },
];

/**
 * @route GET / - Retrieve all brands (cached, with fallback to defaults)
 */
router.get("/", publicReadSlowDown, async (req, res) => {
  try {
    const brands = await cacheService.getOrSetWithStampedeProtection(
      "brands:all",
      async () => {
        const result = await runQuery(
          "SELECT brand_id, name FROM brands ORDER BY name"
        );
        return result.rows;
      },
      BRAND_CACHE_TTL_SECONDS
    );

    if (brands && brands.length > 0) {
      res.json(brands);
    } else {
      res.json(defaultBrands);
    }
  } catch (err) {
    logger.error("[Brands] Error:", err.message);
    res.json(defaultBrands);
  }
});

module.exports = router;

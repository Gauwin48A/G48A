const express = require("express");
const router = express.Router();
const publicWallController = require("../controllers/publicWallController");
const { publicReadSlowDown } = require("../middleware/rateLimiter");

/**
 * @route Public Wall routes
 * @description Serves the public-facing post wall (no authentication required)
 */

/** @route GET / - Get the public wall listing */
router.get("/", publicReadSlowDown, publicWallController.getPublicWall);

module.exports = router;

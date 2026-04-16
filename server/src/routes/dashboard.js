const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
const logger = require("../utils/logger");
const { protect } = require("../middleware/auth");

/**
 * @route GET / - Get user dashboard data (protected)
 */
router.get("/", protect, (req, res) => {
  dashboardController.getDashboard(req, res).catch((err) => {
    logger.error(err);
    res.status(500).json({ error: "An unexpected error occurred." });
  });
});

module.exports = router;

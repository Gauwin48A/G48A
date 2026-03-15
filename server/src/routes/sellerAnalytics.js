const router = require("express").Router();
const { authenticateToken } = require("../middleware/security");
const sellerAnalytics = require("../controllers/sellerAnalyticsController");

router.get("/stats", authenticateToken, sellerAnalytics.getStats);
router.get("/listings-performance", authenticateToken, sellerAnalytics.getListingsPerformance);
router.get("/views-trend", authenticateToken, sellerAnalytics.getViewsTrend);
router.get("/conversion", authenticateToken, sellerAnalytics.getConversionFunnel);

module.exports = router;

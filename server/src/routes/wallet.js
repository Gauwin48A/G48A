const router = require("express").Router();
const { protect } = require("../middleware/auth");
const coinController = require("../controllers/coinController");

// Wallet aliases for coin economy
router.get("/", protect, coinController.getBalance);
router.get("/transactions", protect, coinController.getCoinHistory);

module.exports = router;

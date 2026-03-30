const router = require("express").Router();
const { authenticateToken } = require("../middleware/security");
const coinController = require("../controllers/coinController");

// Wallet aliases for coin economy
router.get("/", authenticateToken, coinController.getBalance);
router.get("/transactions", authenticateToken, coinController.getCoinHistory);

module.exports = router;

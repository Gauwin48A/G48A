const router = require("express").Router();
const { authenticateToken } = require("../middleware/security");
const coinController = require("../controllers/coinController");

router.get("/balance", authenticateToken, coinController.getBalance);
router.get("/history", authenticateToken, coinController.getCoinHistory);
router.post("/redeem", authenticateToken, coinController.redeemCoins);

module.exports = router;

const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const saleController = require("../controllers/saleController");
const { transactionLimiter } = require("../middleware/rateLimiter");

/** All sale routes require authentication */
router.use(protect);

/** @route POST /initiate - Start a new sale transaction */
router.post("/initiate", transactionLimiter, saleController.initiateSale);

/** @route POST /confirm - Confirm a pending sale */
router.post("/confirm", transactionLimiter, saleController.confirmSale);

/** @route POST /cancel - Cancel a pending sale */
router.post("/cancel", transactionLimiter, saleController.cancelSale);

/** @route GET /pending - Get all pending sales for the current user */
router.get("/pending", saleController.getPendingSales);

module.exports = router;

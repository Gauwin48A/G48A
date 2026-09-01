const express = require("express");
const router = express.Router();
const { body, param, validationResult } = require("express-validator");
const { protect } = require("../middleware/auth");
const saleController = require("../controllers/saleController");
const { transactionLimiter } = require("../middleware/rateLimiter");

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: "Validation failed", details: errors.array().map(e => ({ field: e.path, message: e.msg })) });
  }
  next();
};

/** All sale routes require authentication */
router.use(protect);

/** @route POST /initiate - Start a new sale transaction */
router.post("/initiate", transactionLimiter, [
  body("post_id").notEmpty().withMessage("post_id is required"),
  body("buyer_id").optional().trim(),
  validate,
], saleController.initiateSale);

/** @route POST /confirm - Confirm a pending sale */
router.post("/confirm", transactionLimiter, [
  body("sale_id").notEmpty().withMessage("sale_id is required"),
  validate,
], saleController.confirmSale);

/** @route POST /cancel - Cancel a pending sale */
router.post("/cancel", transactionLimiter, [
  body("sale_id").notEmpty().withMessage("sale_id is required"),
  validate,
], saleController.cancelSale);

/** @route GET /pending - Get all pending sales for the current user */
router.get("/pending", saleController.getPendingSales);

module.exports = router;

const express = require("express");
const router = express.Router();
const { param, body, validationResult } = require("express-validator");
const { protect, requirePlanAndKyc } = require("../middleware/auth");
const salesController = require("../controllers/salesController");

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: "Validation failed", details: errors.array().map(e => ({ field: e.path, message: e.msg })) });
  }
  next();
};

// Validate sale ID parameter on all /:id routes
const saleIdValidation = [
  param("id").isInt({ min: 1 }).withMessage("Invalid sale ID"),
  validate,
];

/** @route GET /api/sales/user/:sellerId/sold-posts - PUBLIC: seller's sold posts with ratings/reviews (category-filtered) */
router.get("/user/:sellerId/sold-posts", [
  param("sellerId").notEmpty().withMessage("Invalid seller ID"),
  validate,
], salesController.getSellerSoldPosts);

/** @route GET /api/sales/user/:userId/bought-posts - PUBLIC: posts the user purchased (trust signal) */
router.get("/user/:userId/bought-posts", [
  param("userId").notEmpty().withMessage("Invalid user ID"),
  validate,
], salesController.getUserBoughtPosts);

/** All sale routes below require authentication */
router.use(protect);

/** @route POST /api/sales/request - Buyer sends sale request */
router.post("/request", requirePlanAndKyc, salesController.requestSale);

/** @route GET /api/sales/pending - Seller sees pending requests */
router.get("/pending", salesController.getPendingSales);

/** @route GET /api/sales/mine - Current user's active sales */
router.get("/mine", salesController.getMySales);

/** @route GET /api/sales/history - Completed/rejected/fraud sales */
router.get("/history", salesController.getSaleHistory);

/** @route GET /api/sales/my/review-status - Is the current user the buyer of a completed, unrated sale for a post? */
router.get("/my/review-status", salesController.getMyReviewStatus);

/** @route POST /api/sales/:id/approve - Seller approves */
router.post("/:id/approve", saleIdValidation, salesController.approveSale);

/** @route POST /api/sales/:id/reject - Seller rejects */
router.post("/:id/reject", saleIdValidation, salesController.rejectSale);

/** @route POST /api/sales/:id/cancel - Buyer withdraws their own pending request */
router.post("/:id/cancel", saleIdValidation, salesController.cancelSale);

/** @route POST /api/sales/:id/undo-sale - Seller marks sale undone and reactivates post on marketplace */
router.post("/:id/undo-sale", saleIdValidation, salesController.undoSale);

/** @route POST /api/sales/:id/order-received - Buyer marks received */
router.post("/:id/order-received", saleIdValidation, salesController.orderReceived);

/** @route POST /api/sales/:id/order-not-received - Buyer marks NOT received (triggers dispute mismatch & freezes both accounts) */
router.post("/:id/order-not-received", saleIdValidation, salesController.orderNotReceived);

/** @route POST /api/sales/:id/amount-received - Seller marks paid */
router.post("/:id/amount-received", saleIdValidation, salesController.amountReceived);

/** @route POST /api/sales/:id/mark-shipped - Seller marks shipped with evidence metadata */
router.post("/:id/mark-shipped", saleIdValidation, [
  body("carrier").optional().trim().isLength({ max: 100 }),
  body("tracking_number").optional().trim().isLength({ max: 100 }),
  body("lr_number").optional().trim().isLength({ max: 50 }),
  validate,
], salesController.markShipped);

/** @route POST /api/sales/:id/seller-respond-dispute - Seller responds AGREE (mutual cancel) or DISAGREE (contested dispute) */
router.post("/:id/seller-respond-dispute", saleIdValidation, [
  body("response").isIn(["AGREE", "DISAGREE"]).withMessage("Response must be AGREE or DISAGREE"),
  validate,
], salesController.sellerRespondDispute);

/** @route POST /api/sales/:id/rate - Buyer rates and reviews completed sale (strictly buyer only) */
router.post("/:id/rate", saleIdValidation, [
  body("rating").isInt({ min: 1, max: 5 }).withMessage("Rating must be 1-5"),
  body("review").optional().trim().isLength({ max: 2000 }).withMessage("Review too long (max 2000 chars)"),
  validate,
], salesController.rateCompletedSale);

/** @route POST /api/sales/:id/report-fraud - Report fraud */
router.post("/:id/report-fraud", saleIdValidation, [
  body("reason").trim().notEmpty().isLength({ max: 2000 }).withMessage("Reason is required (max 2000 chars)"),
  validate,
], salesController.reportFraud);

/** @route POST /api/sales/:id/respond - Respond to fraud flag */
router.post("/:id/respond", saleIdValidation, salesController.respondToFraud);

/** @route POST /api/sales/:id/release-hold - Release razorpay_hold (admin/participant) */
router.post("/:id/release-hold", saleIdValidation, salesController.releaseHold);

/** @route POST /api/sales/:id/admin-resolve - ADMIN resolves a sale fraud dispute (unfreezes both, releases hold, reactivates post) */
router.post("/:id/admin-resolve", saleIdValidation, salesController.adminResolveSale);

module.exports = router;

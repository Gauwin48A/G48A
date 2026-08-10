const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const salesController = require("../controllers/salesController");

/** @route GET /api/sales/user/:sellerId/sold-posts - PUBLIC: seller's sold posts with ratings/reviews (category-filtered) */
router.get("/user/:sellerId/sold-posts", salesController.getSellerSoldPosts);

/** All sale routes below require authentication */
router.use(protect);

/** @route POST /api/sales/request - Buyer sends sale request */
router.post("/request", salesController.requestSale);

/** @route GET /api/sales/pending - Seller sees pending requests */
router.get("/pending", salesController.getPendingSales);

/** @route GET /api/sales/mine - Current user's active sales */
router.get("/mine", salesController.getMySales);

/** @route GET /api/sales/history - Completed/rejected/fraud sales */
router.get("/history", salesController.getSaleHistory);

/** @route GET /api/sales/my/review-status - Is the current user the buyer of a completed, unrated sale for a post? */
router.get("/my/review-status", salesController.getMyReviewStatus);

/** @route POST /api/sales/:id/approve - Seller approves */
router.post("/:id/approve", salesController.approveSale);

/** @route POST /api/sales/:id/reject - Seller rejects */
router.post("/:id/reject", salesController.rejectSale);

/** @route POST /api/sales/:id/cancel - Buyer withdraws their own pending request */
router.post("/:id/cancel", salesController.cancelSale);

/** @route POST /api/sales/:id/order-received - Buyer marks received */
router.post("/:id/order-received", salesController.orderReceived);

/** @route POST /api/sales/:id/order-not-received - Buyer marks NOT received (triggers dispute mismatch & freezes both accounts) */
router.post("/:id/order-not-received", salesController.orderNotReceived);

/** @route POST /api/sales/:id/amount-received - Seller marks paid */
router.post("/:id/amount-received", salesController.amountReceived);

/** @route POST /api/sales/:id/mark-shipped - Seller marks shipped with evidence metadata */
router.post("/:id/mark-shipped", salesController.markShipped);

/** @route POST /api/sales/:id/seller-respond-dispute - Seller responds AGREE (mutual cancel) or DISAGREE (contested dispute) */
router.post("/:id/seller-respond-dispute", salesController.sellerRespondDispute);

/** @route POST /api/sales/:id/rate - Buyer rates and reviews completed sale (strictly buyer only) */
router.post("/:id/rate", salesController.rateCompletedSale);

/** @route POST /api/sales/:id/report-fraud - Report fraud */
router.post("/:id/report-fraud", salesController.reportFraud);

/** @route POST /api/sales/:id/respond - Respond to fraud flag */
router.post("/:id/respond", salesController.respondToFraud);

/** @route POST /api/sales/:id/release-hold - Release razorpay_hold (admin/participant) */
router.post("/:id/release-hold", salesController.releaseHold);

/** @route POST /api/sales/:id/admin-resolve - ADMIN resolves a sale fraud dispute (unfreezes both, releases hold, reactivates post) */
router.post("/:id/admin-resolve", salesController.adminResolveSale);

module.exports = router;

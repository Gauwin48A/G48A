const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { captchaMiddleware } = require("../middleware/captcha");
const referralController = require("../controllers/referralController");

// ---------------------------------------------------------------------------
// Referral routes
// ---------------------------------------------------------------------------

/**
 * @route   GET /
 * @desc    Retrieve the current user's referral information.
 * @access  Protected
 */
router.get("/", protect, referralController.getReferral);

/**
 * @route   GET /tree
 * @desc    Retrieve referral tree for current user.
 * @access  Protected
 */
router.get("/tree", protect, referralController.getReferralTree);

/**
 * @route   GET /list
 * @desc    Retrieve referral list for current user.
 * @access  Protected
 */
router.get("/list", protect, referralController.getReferrals);

/**
 * @route   GET /transactions
 * @desc    Retrieve referral transactions for current user.
 * @access  Protected
 */
router.get("/transactions", protect, referralController.getReferralTransactions);

/**
 * @route   POST /create
 * @desc    Create a new referral code for the authenticated user.
 * @access  Protected
 */
router.post("/create", protect, referralController.createReferral);

/**
 * @route   POST /track
 * @desc    Track a referral usage, guarded by CAPTCHA verification.
 * @access  Protected + CAPTCHA
 */
router.post(
  "/track",
  protect,
  captchaMiddleware("referral"),
  referralController.trackReferral
);

/**
 * @route   GET /leaderboard
 * @desc    Public leaderboard of top referrers.
 * @access  Public
 */
router.get("/leaderboard", referralController.getLeaderboard);

/**
 * @route   GET /chain-status
 * @desc    Detailed status of each referral (pending/qualified/rewarded).
 * @access  Protected
 */
router.get("/chain-status", protect, referralController.getReferralChainStatus);

module.exports = router;

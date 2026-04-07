const express = require("express");
const router = express.Router();
const { runQuery, getAuthUserId, parseOptionalString, isAdmin } = require("../utils/dbHelpers");
const logger = require("../utils/logger");
const userController = require("../controllers/userController");
const { protect } = require("../middleware/auth");
const { requireAdmin } = require("../middleware/rbac");
const upload = require("../middleware/upload");
const optimizeLocalImages = require("../middleware/imageOptimizer");

/**
 * Profile management routes
 */

/** @route GET /profile - Get the current user's profile */
router.get("/profile", protect, userController.getProfile);

/** @route PUT /profile - Update the current user's profile */
router.put("/profile", protect, userController.updateProfile);

/**
 * Tier management routes
 */

/** @route POST /upgrade-tier - Request a tier upgrade */
router.post("/upgrade-tier", protect, requireAdmin, userController.upgradeTier);

/** @route GET /tier-status - Get the current user's tier status */
router.get("/tier-status", protect, userController.getTierStatus);

/**
 * KYC (Know Your Customer) routes
 */

/** @route POST /kyc/submit - Submit KYC documents (front and back images) */
router.post(
  "/kyc/submit",
  protect,
  upload.fields([
    { name: "kyc_front", maxCount: 1 },
    { name: "kyc_back", maxCount: 1 }
  ]),
  optimizeLocalImages,
  userController.submitKYC
);

/** @route GET /kyc/status - Check KYC verification status */
router.get("/kyc/status", protect, userController.getKYCStatus);

/**
 * @route GET /:id
 * @desc  Fetch a user's profile by ID. Users can only view their own profile
 *        unless they have admin access.
 */
router.get("/:id", protect, async (req, res) => {
  try {
    const requesterId = getAuthUserId(req);
    if (!requesterId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const targetUserId = parseOptionalString(req.params.id);
    if (!targetUserId) {
      return res.status(400).json({ error: "User id is required" });
    }

    if (targetUserId !== requesterId && !isAdmin(req)) {
      return res.status(403).json({ error: "Not authorized to access this user profile" });
    }

    const result = await runQuery(
      `
        SELECT
          user_id,
          username,
          name,
          email,
          phone_number,
          role,
          tier,
          COALESCE(email_verified, false) AS is_verified,
          created_at,
          updated_at
        FROM users
        WHERE user_id = $1
        LIMIT 1
      `,
      [targetUserId]
    );

    if (!result.rows || result.rows.length === 0) {
      logger.error("No user found for id", req.params.id);
      return res.status(404).json({ error: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    logger.error("Error fetching user profile:", err);
    res.status(500).json({ error: "Failed to fetch user profile" });
  }
});

module.exports = router;

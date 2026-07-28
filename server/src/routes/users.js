const express = require("express");
const router = express.Router();
const { runQuery, getAuthUserId, parseOptionalString, isAdmin } = require("../utils/dbHelpers");
const logger = require("../utils/logger");
const userController = require("../controllers/userController");
const { protect, requireActivePlan } = require("../middleware/auth");
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

/** @route PUT /preferred-language - Update user's language preference */
router.put("/preferred-language", protect, userController.updatePreferredLanguage);

/**
 * Tier management routes
 */

/** @route GET /tier - Get user's current tier */
router.get("/tier", protect, userController.getTierStatus);

/** @route POST /upgrade-tier - Request a tier upgrade */
router.post("/upgrade-tier", protect, requireAdmin, userController.upgradeTier);

/** @route GET /tier-status - Get the current user's tier status */
router.get("/tier-status", protect, userController.getTierStatus);

/**
 * KYC (Know Your Customer) routes - Requires Active Subscription Plan First
 */

/** @route POST /kyc/pan - Verify PAN */
router.post("/kyc/pan", protect, requireActivePlan, userController.verifyPan);

/** @route POST /kyc/aadhaar/generate - Request Aadhaar OTP */
router.post("/kyc/aadhaar/generate", protect, requireActivePlan, userController.generateAadhaarOtp);

/** @route POST /kyc/aadhaar/verify - Verify Aadhaar OTP */
router.post("/kyc/aadhaar/verify", protect, requireActivePlan, userController.verifyAadhaarOtp);

/** @route GET /kyc/status - Check KYC verification status */
router.get("/kyc/status", protect, userController.getKYCStatus);

/** @route DELETE /account - Self-service account deletion (GDPR/DPDPA) */
router.delete("/account", protect, userController.deleteAccount);

/**
 * POST /block/:userId - Block a user (prevents messaging)
 */
router.post("/block/:userId", protect, async (req, res) => {
  try {
    const blockerId = getAuthUserId(req);
    const blockedId = parseOptionalString(req.params.userId);
    if (!blockerId || !blockedId) {
      return res.status(400).json({ error: "Invalid user ID" });
    }
    if (blockerId === blockedId) {
      return res.status(400).json({ error: "Cannot block yourself" });
    }
    await runQuery(
      `INSERT INTO user_blocks (blocker_id, blocked_id, reason, created_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (blocker_id, blocked_id) DO NOTHING`,
      [blockerId, blockedId, parseOptionalString(req.body.reason) || null]
    );
    return res.json({ success: true, message: "User blocked" });
  } catch (err) {
    logger.error("[Block] Error:", err);
    return res.status(500).json({ error: "Failed to block user" });
  }
});

/**
 * DELETE /block/:userId - Unblock a user
 */
router.delete("/block/:userId", protect, async (req, res) => {
  try {
    const blockerId = getAuthUserId(req);
    const blockedId = parseOptionalString(req.params.userId);
    if (!blockerId || !blockedId) {
      return res.status(400).json({ error: "Invalid user ID" });
    }
    await runQuery(
      "DELETE FROM user_blocks WHERE blocker_id::text = $1 AND blocked_id::text = $2",
      [String(blockerId), String(blockedId)]
    );
    return res.json({ success: true, message: "User unblocked" });
  } catch (err) {
    logger.error("[Unblock] Error:", err);
    return res.status(500).json({ error: "Failed to unblock user" });
  }
});

/**
 * GET /blocked - List blocked users
 */
router.get("/blocked", protect, async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "Authentication required" });
    const result = await runQuery(
      `SELECT ub.blocked_id, ub.reason, ub.created_at, u.name, u.username
       FROM user_blocks ub
       LEFT JOIN users u ON u.user_id = ub.blocked_id
       WHERE ub.blocker_id::text = $1
       ORDER BY ub.created_at DESC`,
      [String(userId)]
    );
    return res.json({ blocked: result.rows });
  } catch (err) {
    return res.json({ blocked: [] });
  }
});

/**
 * GET /sessions - List active sessions for the authenticated user
 */
router.get("/sessions", protect, async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "Authentication required" });
    const result = await runQuery(
      `SELECT session_id, device_id, ip_address, user_agent,
              created_at, last_active_at, is_current
       FROM user_sessions
       WHERE user_id::text = $1 AND revoked_at IS NULL
       ORDER BY last_active_at DESC
       LIMIT 20`,
      [String(userId)]
    );
    return res.json({ sessions: result.rows });
  } catch (err) {
    // Table may not exist yet
    return res.json({ sessions: [] });
  }
});

/**
 * DELETE /sessions/:sessionId - Revoke a specific session
 */
router.delete("/sessions/:sessionId", protect, async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    const sessionId = parseOptionalString(req.params.sessionId);
    if (!userId || !sessionId) return res.status(400).json({ error: "Invalid request" });
    await runQuery(
      `UPDATE user_sessions SET revoked_at = NOW()
       WHERE session_id = $1 AND user_id::text = $2`,
      [sessionId, String(userId)]
    );
    return res.json({ success: true, message: "Session revoked" });
  } catch (err) {
    return res.status(500).json({ error: "Failed to revoke session" });
  }
});

/**
 * GET /profile/completeness - Get profile completeness score
 */
router.get("/profile/completeness", protect, async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "Authentication required" });
    const result = await runQuery(
      `SELECT u.name, u.email, u.phone, u.username,
              p.full_name, p.avatar_url, p.bio, p.location
       FROM users u
       LEFT JOIN profiles p ON p.user_id::text = u.user_id::text
       WHERE u.user_id::text = $1`,
      [String(userId)]
    );
    if (result.rows.length === 0) return res.json({ completeness: 0, missing: [] });
    const user = result.rows[0];
    const fields = [
      { key: 'name', filled: !!user.name },
      { key: 'email', filled: !!user.email },
      { key: 'phone', filled: !!user.phone },
      { key: 'avatar', filled: !!user.avatar_url },
      { key: 'bio', filled: !!user.bio },
      { key: 'location', filled: !!user.location },
    ];
    const filled = fields.filter(f => f.filled).length;
    const missing = fields.filter(f => !f.filled).map(f => f.key);
    return res.json({ completeness: Math.round((filled / fields.length) * 100), missing, total: fields.length, filled });
  } catch (err) {
    return res.status(500).json({ error: "Failed to calculate completeness" });
  }
});

/**
 * GET /search-history - Get recent search queries
 */
router.get("/search-history", protect, async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "Authentication required" });
    const result = await runQuery(
      `SELECT query, searched_at FROM search_history
       WHERE user_id::text = $1
       ORDER BY searched_at DESC LIMIT 20`,
      [String(userId)]
    );
    return res.json({ searches: result.rows });
  } catch (err) {
    return res.json({ searches: [] });
  }
});

/**
 * POST /search-history - Save a search query
 */
router.post("/search-history", protect, async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    const query = parseOptionalString(req.body.query);
    if (!userId || !query) return res.status(400).json({ error: "Query required" });
    await runQuery(
      `INSERT INTO search_history (user_id, query, searched_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id, query) DO UPDATE SET searched_at = NOW()`,
      [String(userId), query.slice(0, 200)]
    );
    return res.json({ success: true });
  } catch (err) {
    return res.json({ success: true }); // best-effort
  }
});

/**
 * DELETE /search-history - Clear search history
 */
router.delete("/search-history", protect, async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "Authentication required" });
    await runQuery("DELETE FROM search_history WHERE user_id::text = $1", [String(userId)]);
    return res.json({ success: true });
  } catch (err) {
    return res.json({ success: true });
  }
});

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

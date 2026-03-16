const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const saleController = require("../controllers/saleController");
const pool = require("../config/db");
const logger = require("../utils/logger");

const DB_QUERY_TIMEOUT_MS = Number.parseInt(process.env.DB_QUERY_TIMEOUT_MS, 10) || 1e4;

/**
 * Execute a parameterized query with a configured timeout.
 */
function runQuery(text, values = []) {
  return pool.query({
    text: text,
    values: values,
    query_timeout: DB_QUERY_TIMEOUT_MS
  });
}

/**
 * Extract the user ID from the request's auth token.
 */
function getUserId(req) {
  return req.user?.userId || req.user?.id || req.user?.user_id || null;
}

/**
 * Check whether the authenticated user has an admin role.
 */
function isAdmin(req) {
  const role = String(req.user?.role || "").toLowerCase();
  return role === "admin" || role === "superadmin";
}

/** All transaction routes require authentication */
router.use(protect);

/** @route POST /initiate - Start a new sale transaction */
router.post("/initiate", saleController.initiateSale);

/** @route POST /confirm - Confirm a pending sale */
router.post("/confirm", saleController.confirmSale);

/** @route POST /cancel - Cancel a pending sale */
router.post("/cancel", saleController.cancelSale);

/** @route GET /pending - Get all pending sales for the current user */
router.get("/pending", saleController.getPendingSales);

/**
 * @route GET /undone
 * @desc  Fetch posts with 'undone' status for the current user (or another user if admin).
 */
router.get("/undone", async (req, res) => {
  try {
    const requesterId = getUserId(req);
    if (!requesterId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const requestedUserId = req.query.userId
      ? String(req.query.userId).trim()
      : null;
    let targetUserId = String(requesterId);

    if (requestedUserId && requestedUserId !== targetUserId) {
      if (!isAdmin(req)) {
        return res.status(403).json({ error: "Not authorized to fetch other users' undone posts" });
      }
      targetUserId = requestedUserId;
    }

    const result = await runQuery(
      `
        SELECT
          post_id,
          title,
          description,
          category_id,
          post_type,
          condition,
          price,
          status,
          images,
          location,
          created_at,
          updated_at
        FROM posts
        WHERE status = 'undone'
          AND user_id::text = $1
        ORDER BY COALESCE(updated_at, created_at) DESC
        LIMIT 200
      `,
      [targetUserId]
    );

    return res.json(result.rows);
  } catch (err) {
    logger.error("[Transactions] Error fetching undone sales:", err);
    return res.status(500).json({ error: "Failed to fetch undone sales", details: err.message });
  }
});

module.exports = router;

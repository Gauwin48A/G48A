const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const saleController = require("../controllers/saleController");
const { runQuery, getAuthUserId, isAdmin } = require("../utils/dbHelpers");
const logger = require("../utils/logger");

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
    const requesterId = getAuthUserId(req);
    if (!requesterId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const categoryIdRaw = req.query.category || req.query.category_id || req.query.categoryId || null;
    const categoryId = categoryIdRaw ? String(categoryIdRaw).trim() : null;
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

    const params = [targetUserId];
    let categoryClause = "";
    if (categoryId) {
      params.push(categoryId);
      categoryClause = ` AND category_id::text = $${params.length}`;
    }

    const result = await runQuery(
      `
        SELECT
          p.post_id,
          p.user_id,
          p.title,
          p.description,
          p.category_id,
          p.subcategory_id,
          c.name AS category_name,
          sc.name AS subcategory_name,
          p.post_type,
          p.condition,
          p.price,
          p.status,
          p.images,
          p.location,
          p.created_at,
          p.updated_at,
          tx.transaction_id AS last_transaction_id,
          tx.status AS last_transaction_status,
          tx.created_at AS last_transaction_created_at,
          tx.completed_at AS last_transaction_completed_at,
          buyer.user_id AS buyer_id,
          COALESCE(bp.full_name, buyer.username) AS buyer_name
        FROM posts p
        LEFT JOIN categories c ON p.category_id::text = c.category_id::text
        LEFT JOIN subcategories sc ON p.subcategory_id::text = sc.subcategory_id::text
        LEFT JOIN LATERAL (
          SELECT transaction_id, buyer_id, status, created_at, completed_at
          FROM transactions
          WHERE post_id::text = p.post_id::text
          ORDER BY created_at DESC
          LIMIT 1
        ) tx ON true
        LEFT JOIN users buyer ON tx.buyer_id::text = buyer.user_id::text
        LEFT JOIN profiles bp ON tx.buyer_id::text = bp.user_id::text
        WHERE p.status = 'undone'
          AND p.user_id::text = $1${categoryClause}
        ORDER BY COALESCE(p.updated_at, p.created_at) DESC
        LIMIT 200
      `,
      params
    );

    return res.json(result.rows);
  } catch (err) {
    logger.error("[Transactions] Error fetching undone sales:", err);
    const detail = err?.message?.includes("does not exist") ? "A required database column is missing. Please contact support." : "An unexpected error occurred while loading undone sales.";
    return res.status(500).json({ error: "Unable to load undone sales records", detail });
  }
});

module.exports = router;

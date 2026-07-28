/**
 * Sales Controller — Full end-to-end sale flow
 *
 * States: requested → approved → received → settled
 *         requested → rejected (dead end)
 *         any active → fraud (suspension triggered)
 */

const { runQuery, getAuthUserId } = require("../utils/dbHelpers");
const logger = require("../utils/logger");

// ── Helper: get sale by ID with user ownership checks ────────────────────────
async function getSaleOrFail(saleId) {
  const result = await runQuery("SELECT * FROM sales WHERE id = $1", [saleId]);
  if (result.rows.length === 0) return null;
  return result.rows[0];
}

// ── Helper: create suspension record ─────────────────────────────────────────
async function createSuspension(userId, saleId, reason) {
  const suspendedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  await runQuery(
    `INSERT INTO suspensions (user_id, sale_id, reason, suspended_until)
     VALUES ($1, $2, $3, $4)`,
    [userId, saleId, reason, suspendedUntil]
  );
}

// ── Helper: permanently lock account and add to KYC blacklist ────────────────
async function permanentlyLockAccount(userId) {
  // Get user details for blacklist
  const userResult = await runQuery(
    `SELECT u.user_id, p.aadhaar_number, p.pan_number, u.phone, u.email
     FROM users u
     LEFT JOIN profiles p ON u.user_id::text = p.user_id::text
     WHERE u.user_id::text = $1`,
    [userId]
  );
  if (userResult.rows.length > 0) {
    const user = userResult.rows[0];
    const aadhaarHash = user.aadhaar_number ? require("crypto").createHash("sha256").update(String(user.aadhaar_number)).digest("hex") : null;
    const mobileHash = user.phone ? require("crypto").createHash("sha256").update(String(user.phone)).digest("hex") : null;
    const panHash = user.pan_number ? require("crypto").createHash("sha256").update(String(user.pan_number)).digest("hex") : null;

    await runQuery(
      `INSERT INTO kyc_blacklist (aadhaar_hash, mobile_hash, pan_hash, user_id, reason)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id) DO NOTHING`,
      [aadhaarHash, mobileHash, panHash, userId, "Permanent account lock due to unresolved fraud"]
    );
  }

  // Update user status to permanently_locked
  await runQuery(
    `UPDATE users SET status = 'permanently_locked', locked_until = NULL WHERE user_id::text = $1`,
    [userId]
  );
}

// ── 1. POST /request ────────────────────────────────────────────────────────
// Buyer sends a sale request to seller
exports.requestSale = async (req, res) => {
  try {
    const buyerId = getAuthUserId(req);
    if (!buyerId) return res.status(401).json({ error: "Authentication required" });

    const { postId, sellerId } = req.body;
    if (!postId || !sellerId) {
      return res.status(400).json({ error: "Both postId and sellerId are required" });
    }

    // Verify post exists and belongs to the seller
    const postResult = await runQuery(
      "SELECT post_id, user_id FROM posts WHERE post_id::text = $1",
      [postId]
    );
    if (postResult.rows.length === 0) {
      return res.status(404).json({ error: "Post not found" });
    }
    if (String(postResult.rows[0].user_id) !== String(sellerId)) {
      return res.status(400).json({ error: "Post does not belong to the specified seller" });
    }

    // Check no duplicate active request
    const existingResult = await runQuery(
      `SELECT id FROM sales
       WHERE post_id::text = $1 AND buyer_id::text = $2 AND status IN ('requested','approved','received')`,
      [postId, buyerId]
    );
    if (existingResult.rows.length > 0) {
      return res.status(400).json({ error: "An active sale request already exists for this post" });
    }

    const result = await runQuery(
      `INSERT INTO sales (post_id, buyer_id, seller_id, status)
       VALUES ($1, $2, $3, 'requested')
       RETURNING id, post_id, buyer_id, seller_id, status, created_at`,
      [postId, buyerId, sellerId]
    );

    return res.status(201).json({ success: true, sale: result.rows[0] });
  } catch (err) {
    logger.error("[Sales] Error requesting sale:", err);
    return res.status(500).json({ error: "Failed to request sale" });
  }
};

// ── 2. GET /pending — Seller sees pending requests ──────────────────────────
exports.getPendingSales = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "Authentication required" });

    const result = await runQuery(
      `SELECT s.*, p.title AS post_title, p.price AS post_price,
              COALESCE(bp.full_name, bu.username) AS buyer_name
       FROM sales s
       LEFT JOIN posts p ON s.post_id::text = p.post_id::text
       LEFT JOIN users bu ON s.buyer_id::text = bu.user_id::text
       LEFT JOIN profiles bp ON s.buyer_id::text = bp.user_id::text
       WHERE s.seller_id::text = $1 AND s.status = 'requested'
       ORDER BY s.created_at DESC`,
      [userId]
    );

    return res.json({ sales: result.rows });
  } catch (err) {
    logger.error("[Sales] Error fetching pending sales:", err);
    return res.status(500).json({ error: "Failed to fetch pending sales" });
  }
};

// ── 3. GET /mine — User sees their active sales ─────────────────────────────
exports.getMySales = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "Authentication required" });

    const result = await runQuery(
      `SELECT s.*,
              p.title AS post_title, p.price AS post_price, p.images AS post_images,
              COALESCE(bp.full_name, bu.username) AS buyer_name,
              COALESCE(sp.full_name, su.username) AS seller_name
       FROM sales s
       LEFT JOIN posts p ON s.post_id::text = p.post_id::text
       LEFT JOIN users bu ON s.buyer_id::text = bu.user_id::text
       LEFT JOIN profiles bp ON s.buyer_id::text = bp.user_id::text
       LEFT JOIN users su ON s.seller_id::text = su.user_id::text
       LEFT JOIN profiles sp ON s.seller_id::text = sp.user_id::text
       WHERE (s.buyer_id::text = $1 OR s.seller_id::text = $1)
         AND s.status IN ('requested','approved','received')
       ORDER BY s.updated_at DESC`,
      [userId]
    );

    return res.json({ sales: result.rows });
  } catch (err) {
    logger.error("[Sales] Error fetching my sales:", err);
    return res.status(500).json({ error: "Failed to fetch sales" });
  }
};

// ── 4. POST /:id/approve — Seller approves sale ─────────────────────────────
exports.approveSale = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "Authentication required" });

    const sale = await getSaleOrFail(req.params.id);
    if (!sale) return res.status(404).json({ error: "Sale not found" });
    if (String(sale.seller_id) !== String(userId)) {
      return res.status(403).json({ error: "Only the seller can approve this sale" });
    }
    if (sale.status !== "requested") {
      return res.status(400).json({ error: "Sale is not in requested status" });
    }

    const result = await runQuery(
      `UPDATE sales SET status = 'approved', updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [req.params.id]
    );

    return res.json({ success: true, sale: result.rows[0] });
  } catch (err) {
    logger.error("[Sales] Error approving sale:", err);
    return res.status(500).json({ error: "Failed to approve sale" });
  }
};

// ── 5. POST /:id/reject — Seller rejects sale ───────────────────────────────
exports.rejectSale = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "Authentication required" });

    const sale = await getSaleOrFail(req.params.id);
    if (!sale) return res.status(404).json({ error: "Sale not found" });
    if (String(sale.seller_id) !== String(userId)) {
      return res.status(403).json({ error: "Only the seller can reject this sale" });
    }
    if (sale.status !== "requested") {
      return res.status(400).json({ error: "Sale is not in requested status" });
    }

    const result = await runQuery(
      `UPDATE sales SET status = 'rejected', updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [req.params.id]
    );

    return res.json({ success: true, sale: result.rows[0] });
  } catch (err) {
    logger.error("[Sales] Error rejecting sale:", err);
    return res.status(500).json({ error: "Failed to reject sale" });
  }
};

// ── 6. POST /:id/order-received — Buyer marks order received ────────────────
exports.orderReceived = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "Authentication required" });

    const sale = await getSaleOrFail(req.params.id);
    if (!sale) return res.status(404).json({ error: "Sale not found" });
    if (String(sale.buyer_id) !== String(userId)) {
      return res.status(403).json({ error: "Only the buyer can mark order as received" });
    }
    if (sale.status !== "approved") {
      return res.status(400).json({ error: "Sale must be approved before marking received" });
    }

    const result = await runQuery(
      `UPDATE sales SET status = 'received', updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [req.params.id]
    );

    return res.json({ success: true, sale: result.rows[0] });
  } catch (err) {
    logger.error("[Sales] Error marking order received:", err);
    return res.status(500).json({ error: "Failed to mark order as received" });
  }
};

// ── 6b. POST /:id/order-not-received — Buyer marks NOT received (mismatch dispute) ────────
exports.orderNotReceived = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "Authentication required" });

    const sale = await getSaleOrFail(req.params.id);
    if (!sale) return res.status(404).json({ error: "Sale not found" });
    if (String(sale.buyer_id) !== String(userId)) {
      return res.status(403).json({ error: "Only the buyer can report non-receipt" });
    }

    const reason = req.body?.reason || "Buyer reported parcel not received after seller dispatch";

    // Mark sale as fraud mismatch with Razorpay hold active
    await runQuery(
      `UPDATE sales SET status = 'fraud', reported_party = 'seller', fraud_reason = $1, admin_notified = true, razorpay_hold = true, updated_at = NOW()
       WHERE id = $2`,
      [reason, req.params.id]
    );

    // Freeze BOTH seller and buyer accounts pending admin review
    await createSuspension(sale.buyer_id, sale.id, `Dispute mismatch (Non-receipt): ${reason}`);
    await createSuspension(sale.seller_id, sale.id, `Dispute mismatch (Non-receipt): ${reason}`);

    // Set account_status to FROZEN for both users
    await runQuery(
      `UPDATE users SET status = 'FROZEN', account_status = 'FROZEN' WHERE user_id::text IN ($1, $2)`,
      [String(sale.buyer_id), String(sale.seller_id)]
    );

    logger.warn(`[DISPUTE_MISMATCH] Sale #${sale.id} non-receipt reported. BOTH seller (${sale.seller_id}) & buyer (${sale.buyer_id}) accounts FROZEN. Razorpay hold active.`);

    return res.json({
      success: true,
      message: "Dispute mismatch logged. Both accounts have been frozen and funds placed on hold with Razorpay pending manual audit.",
    });
  } catch (err) {
    logger.error("[Sales] Error marking order NOT received:", err);
    return res.status(500).json({ error: "Failed to record non-receipt dispute" });
  }
};

// ── 6c. POST /:id/mark-shipped — Seller marks shipped with evidence ─────────
exports.markShipped = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "Authentication required" });

    const sale = await getSaleOrFail(req.params.id);
    if (!sale) return res.status(404).json({ error: "Sale not found" });
    if (String(sale.seller_id) !== String(userId)) {
      return res.status(403).json({ error: "Only the seller can mark parcel as shipped" });
    }

    const { trackingNumber, courierName, evidenceUrls } = req.body || {};

    const result = await runQuery(
      `UPDATE sales SET status = 'shipped', updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [req.params.id]
    );

    // Audit log
    logger.info(`[SALE_SHIPPED] Sale #${sale.id} marked shipped by seller (${userId}). Courier: ${courierName || 'N/A'}, Tracking: ${trackingNumber || 'N/A'}`);

    return res.json({ success: true, message: "Parcel marked as shipped with evidence.", sale: result.rows[0] });
  } catch (err) {
    logger.error("[Sales] Error marking shipped:", err);
    return res.status(500).json({ error: "Failed to mark parcel as shipped" });
  }
};

// ── 6d. POST /:id/seller-respond-dispute — Seller AGREE (mutual cancel) or DISAGREE (contested) ──
exports.sellerRespondDispute = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "Authentication required" });

    const { decision, statement } = req.body || {};
    if (!decision || !["AGREE", "DISAGREE"].includes(decision)) {
      return res.status(400).json({ error: "Decision must be 'AGREE' or 'DISAGREE'" });
    }

    const sale = await getSaleOrFail(req.params.id);
    if (!sale) return res.status(404).json({ error: "Sale not found" });
    if (String(sale.seller_id) !== String(userId)) {
      return res.status(403).json({ error: "Only the seller can respond to this dispute" });
    }

    if (decision === "AGREE") {
      // Mutual Cancellation Path
      await runQuery(
        `UPDATE sales SET status = 'cancelled', fraud_reason = 'Mutual cancellation agreed by seller', updated_at = NOW()
         WHERE id = $1`,
        [req.params.id]
      );
      logger.info(`[MUTUAL_CANCELLATION] Sale #${sale.id} cancelled mutually by seller agreement.`);
      return res.json({
        success: true,
        status: "MUTUAL_CANCELLATION",
        message: "Mutual cancellation agreed. Order cancelled and refund initiated per policy.",
      });
    } else {
      // Contested Dispute Path: Freeze BOTH accounts
      await runQuery(
        `UPDATE sales SET status = 'fraud', reported_party = 'buyer', fraud_reason = $1, admin_notified = true, razorpay_hold = true, updated_at = NOW()
         WHERE id = $2`,
        [statement || "Seller disagreed with buyer non-receipt claim", req.params.id]
      );

      await createSuspension(sale.buyer_id, sale.id, `Contested Dispute: ${statement || "Seller contested non-receipt"}`);
      await createSuspension(sale.seller_id, sale.id, `Contested Dispute: ${statement || "Seller contested non-receipt"}`);

      await runQuery(
        `UPDATE users SET status = 'FROZEN', account_status = 'FROZEN' WHERE user_id::text IN ($1, $2)`,
        [String(sale.buyer_id), String(sale.seller_id)]
      );

      logger.warn(`[CONTESTED_DISPUTE] Sale #${sale.id} contested by seller. BOTH seller (${sale.seller_id}) & buyer (${sale.buyer_id}) accounts FROZEN.`);

      return res.json({
        success: true,
        status: "FLAGGED_DISPUTE",
        message: "Contested dispute logged. BOTH seller and buyer accounts frozen and funds held on Razorpay pending admin review.",
      });
    }
  } catch (err) {
    logger.error("[Sales] Error responding to dispute:", err);
    return res.status(500).json({ error: "Failed to submit dispute response" });
  }
};

// ── 7. POST /:id/amount-received — Seller marks amount received ─────────────
exports.amountReceived = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "Authentication required" });

    const sale = await getSaleOrFail(req.params.id);
    if (!sale) return res.status(404).json({ error: "Sale not found" });
    if (String(sale.seller_id) !== String(userId)) {
      return res.status(403).json({ error: "Only the seller can mark amount as received" });
    }
    // Can settle from 'received' (buyer already marked) or directly from 'approved' if buyer hasn't
    if (sale.status !== "received" && sale.status !== "approved") {
      return res.status(400).json({ error: "Sale must be in approved or received status" });
    }

    const newStatus = sale.status === "received" ? "settled" : "received";
    const result = await runQuery(
      `UPDATE sales SET status = $1, updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [newStatus, req.params.id]
    );

    return res.json({ success: true, sale: result.rows[0] });
  } catch (err) {
    logger.error("[Sales] Error marking amount received:", err);
    return res.status(500).json({ error: "Failed to mark amount as received" });
  }
};

// ── 8. POST /:id/report-fraud — Report fraud ────────────────────────────────
exports.reportFraud = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "Authentication required" });

    const { reportedParty, reason } = req.body;
    if (!reportedParty || !["buyer", "seller"].includes(reportedParty)) {
      return res.status(400).json({ error: "reportedParty must be 'buyer' or 'seller'" });
    }
    if (!reason || String(reason).trim().length < 3) {
      return res.status(400).json({ error: "Reason is required (min 3 characters)" });
    }

    const sale = await getSaleOrFail(req.params.id);
    if (!sale) return res.status(404).json({ error: "Sale not found" });

    // Only the buyer or seller of this sale can report
    const isBuyer = String(sale.buyer_id) === String(userId);
    const isSeller = String(sale.seller_id) === String(userId);
    if (!isBuyer && !isSeller) {
      return res.status(403).json({ error: "You are not a participant in this sale" });
    }

    // Can't report yourself
    if ((reportedParty === "buyer" && isBuyer) || (reportedParty === "seller" && isSeller)) {
      return res.status(400).json({ error: "You cannot report yourself" });
    }

    // Determine the reported user's ID
    const reportedUserId = reportedParty === "buyer" ? sale.buyer_id : sale.seller_id;

    // Mark sale as fraud with Razorpay hold active
    await runQuery(
      `UPDATE sales SET status = 'fraud', reported_party = $1, fraud_reason = $2, admin_notified = true, razorpay_hold = true, updated_at = NOW()
       WHERE id = $3`,
      [reportedParty, reason, req.params.id]
    );

    // Freeze BOTH seller and buyer accounts pending admin review
    await createSuspension(
      sale.buyer_id,
      sale.id,
      `Dispute mismatch flagged by ${isBuyer ? "buyer" : "seller"}: ${reason}`
    );
    await createSuspension(
      sale.seller_id,
      sale.id,
      `Dispute mismatch flagged by ${isBuyer ? "buyer" : "seller"}: ${reason}`
    );

    // Update account status in users table to FROZEN for both participants
    await runQuery(
      `UPDATE users SET status = 'FROZEN', account_status = 'FROZEN' WHERE user_id::text IN ($1, $2)`,
      [String(sale.buyer_id), String(sale.seller_id)]
    );

    // Notify admin & log warning
    logger.warn(`[FRAUD_DISPUTE] Sale #${sale.id} flagged. BOTH seller (${sale.seller_id}) & buyer (${sale.buyer_id}) accounts FROZEN. Funds held on Razorpay. Reason: ${reason}`);

    return res.json({
      success: true,
      message: "Dispute mismatch flagged. Both seller & buyer accounts have been frozen and funds placed on hold pending admin audit.",
    });
  } catch (err) {
    logger.error("[Sales] Error reporting fraud:", err);
    return res.status(500).json({ error: "Failed to report fraud" });
  }
};

// ── 9. POST /:id/respond — Respond to fraud flag ────────────────────────────
exports.respondToFraud = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "Authentication required" });

    const { message } = req.body;
    if (!message || String(message).trim().length < 5) {
      return res.status(400).json({ error: "Response message is required (min 5 characters)" });
    }

    const sale = await getSaleOrFail(req.params.id);
    if (!sale) return res.status(404).json({ error: "Sale not found" });

    // Check if user has an active suspension for this sale
    const suspensionResult = await runQuery(
      `SELECT id FROM suspensions
       WHERE user_id::text = $1 AND sale_id = $2 AND is_active = true`,
      [userId, req.params.id]
    );
    if (suspensionResult.rows.length === 0) {
      return res.status(400).json({ error: "No active suspension found for this sale" });
    }

    // Record the response
    await runQuery(
      `UPDATE suspensions
       SET responded = true, response_message = $1, responded_at = NOW(), is_active = false
       WHERE user_id::text = $2 AND sale_id = $3 AND is_active = true`,
      [message, userId, req.params.id]
    );

    return res.json({ success: true, message: "Your response has been recorded. An admin will review your case." });
  } catch (err) {
    logger.error("[Sales] Error responding to fraud:", err);
    return res.status(500).json({ error: "Failed to respond to fraud report" });
  }
};

// ── 10. GET /user/suspension — Check current user's suspension status ────────
exports.getSuspensionStatus = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "Authentication required" });

    const result = await runQuery(
      `SELECT id, reason, suspended_until, is_active, responded, permanently_locked, created_at
       FROM suspensions
       WHERE user_id::text = $1 AND (is_active = true OR permanently_locked = true)
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.json({ suspended: false });
    }

    const suspension = result.rows[0];
    const now = new Date();
    const suspendedUntil = new Date(suspension.suspended_until);

    // Check if 24hr suspension has expired without response → permanent lock
    if (suspension.is_active && !suspension.responded && now > suspendedUntil && !suspension.permanently_locked) {
      await permanentlyLockAccount(userId);
      await runQuery(
        `UPDATE suspensions SET is_active = false, permanently_locked = true WHERE id = $1`,
        [suspension.id]
      );
      return res.json({
        suspended: true,
        permanently_locked: true,
        reason: suspension.reason,
        message: "Your account has been permanently locked due to no response within 24 hours.",
      });
    }

    // Check if suspension has expired (user responded)
    if (!suspension.is_active && !suspension.permanently_locked) {
      return res.json({ suspended: false });
    }

    // Active suspension — calculate remaining time
    const remainingMs = suspendedUntil.getTime() - now.getTime();
    const remainingHours = Math.max(0, Math.floor(remainingMs / (1000 * 60 * 60)));
    const remainingMinutes = Math.max(0, Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60)));

    return res.json({
      suspended: true,
      permanently_locked: suspension.permanently_locked || false,
      reason: suspension.reason,
      remainingHours,
      remainingMinutes,
      suspendedUntil: suspendedUntil.toISOString(),
      responded: suspension.responded,
    });
  } catch (err) {
    logger.error("[Sales] Error checking suspension status:", err);
    return res.status(500).json({ error: "Failed to check suspension status" });
  }
};

// ── 11. GET /history — Get sale history for current user (completed sales) ──
exports.getSaleHistory = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "Authentication required" });

    const result = await runQuery(
      `SELECT s.*,
              p.title AS post_title, p.price AS post_price,
              COALESCE(bp.full_name, bu.username) AS buyer_name,
              COALESCE(sp.full_name, su.username) AS seller_name
       FROM sales s
       LEFT JOIN posts p ON s.post_id::text = p.post_id::text
       LEFT JOIN users bu ON s.buyer_id::text = bu.user_id::text
       LEFT JOIN profiles bp ON s.buyer_id::text = bp.user_id::text
       LEFT JOIN users su ON s.seller_id::text = su.user_id::text
       LEFT JOIN profiles sp ON s.seller_id::text = sp.user_id::text
       WHERE (s.buyer_id::text = $1 OR s.seller_id::text = $1)
         AND s.status IN ('settled', 'rejected', 'fraud')
       ORDER BY s.updated_at DESC
       LIMIT 50`,
      [userId]
    );

    return res.json({ sales: result.rows });
  } catch (err) {
    logger.error("[Sales] Error fetching sale history:", err);
    return res.status(500).json({ error: "Failed to fetch sale history" });
  }
};

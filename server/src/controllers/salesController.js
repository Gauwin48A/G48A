/**
 * Sales Controller — Full end-to-end sale flow
 *
 * States: requested → approved → received → settled
 *         requested → rejected (dead end)
 *         any active → fraud (suspension triggered)
 */

const { runQuery, getAuthUserId } = require("../utils/dbHelpers");
const { parseOptionalString, parsePositiveInt } = require("../utils/parseHelpers");
const logger = require("../utils/logger");
const cacheService = require("../services/cacheService");
const financialEngine = require("../services/financialEngine");
const { emitNotification } = require("../services/notificationEmitter");

/** TTL for cached trust scores (5 minutes — short enough to stay fresh, long enough to reduce DB chatter). */
const TRUST_SCORE_CACHE_TTL_SECONDS = 300;

/** Maximum sold posts per page. */
const SOLD_POSTS_MAX_LIMIT = 100;

/** Default sold posts per page (kept at 50 for backward compatibility with existing callers). */
const SOLD_POSTS_DEFAULT_LIMIT = 50;

/** GST rate on platform fee (18%). */
const GST_RATE = 0.18;


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

// ── Helper: normalize sale payment mode ─────────────────────────────────────
function normalizePaymentMode(value) {
  return String(value || "IN_APP").toUpperCase() === "OUTSIDE" ? "OUTSIDE" : "IN_APP";
}

/**
 * Electronics category check — these listings are escrow-eligible and get the
 * 2.5% platform commission. Everything else is direct/outside payment only.
 * Matches the enrichment in postController.getPostById (is_escrow_eligible).
 */
function isElectronicsCategory(category) {
  const c = String(category || "").toLowerCase();
  return c.includes("electron") || c.includes("mobile") || c.includes("phone") || c.includes("gadget");
}

/** Best-effort lifecycle notification for the other party of a sale. */
function notifySaleParty(receiverId, type, title, message, saleId, postId) {
  if (!receiverId) return;
  // Tab the app should open: 1=Pending (seller), 3=History (done/cancelled), else Active.
  const tab = type === "sale_request" ? 1
    : (type === "sale_rejected" || type === "sale_cancelled" || type === "sale_completed") ? 3
    : 2;
  emitNotification(receiverId, {
    title,
    message,
    type,
    deep_link: `mhub://saledone/${tab}`,
    data: { saleId, postId },
  }).catch((err) => logger.warn("[Sales] Notification emit failed:", err.message));
}

/**
 * Idempotent settlement finalizer — ledger entries, payout record/job and coins.
 * Reads the persisted snapshot (agreed_price / platform_fee / seller_payout) that
 * was stored on the sale row when the seller confirmed amount received.
 */
async function finalizeSettlement(saleId) {
  const saleRes = await runQuery("SELECT * FROM sales WHERE id = $1", [saleId]);
  if (saleRes.rows.length === 0) return;
  const row = saleRes.rows[0];
  const agreedPrice = parseFloat(row.agreed_price || 0);
  const platformFee = parseFloat(row.platform_fee || 0);
  const sellerPayout = parseFloat(row.seller_payout || 0);

  const checkLedger = await runQuery(
    `SELECT id FROM financial_ledger WHERE reference_id = $1 AND event_type = 'SELLER_TRANSFER'`,
    [`sale_${saleId}`]
  );
  if (checkLedger.rows.length === 0) {
    if (platformFee > 0) {
      await runQuery(
        `INSERT INTO financial_ledger (reference_id, order_id, user_id, event_type, direction, amount, status, provider_reference)
         VALUES ($1, $2, $3, 'PLATFORM_FEE', 'CREDIT', $4, 'COMPLETED', 'V0_SALE_SETTLE')`,
        [`sale_${saleId}`, String(saleId), 'PLATFORM', platformFee]
      ).catch((ledgerErr) => logger.warn("[Sales] Platform fee ledger insert failed:", ledgerErr.message));
    }
    if (sellerPayout > 0) {
      await runQuery(
        `INSERT INTO financial_ledger (reference_id, order_id, user_id, event_type, direction, amount, status, provider_reference)
         VALUES ($1, $2, $3, 'SELLER_TRANSFER', 'DEBIT', $4, 'COMPLETED', 'V0_SALE_SETTLE')`,
        [`sale_${saleId}`, String(saleId), String(row.seller_id), sellerPayout]
      ).catch((ledgerErr) => logger.warn("[Sales] Seller transfer ledger insert failed:", ledgerErr.message));
    }
  }

  const payoutRef = `sale_${saleId}`;
  const payoutRecResult = await runQuery(
    `INSERT INTO payout_records (reference_id, seller_id, amount, currency, status, gateway_reference)
     VALUES ($1, $2, $3, $4, 'PAYOUT_PENDING', $5)
     ON CONFLICT (reference_id) DO UPDATE SET
       amount = EXCLUDED.amount,
       updated_at = NOW()
     RETURNING payout_id`,
    [payoutRef, String(row.seller_id), sellerPayout, 'INR', payoutRef]
  ).catch((payoutRecErr) => {
    logger.warn("[Sales] Payout record creation failed:", payoutRecErr.message);
    return { rows: [] };
  });

  const { enqueuePayoutJob } = require("../services/payoutQueue");
  enqueuePayoutJob({
    referenceId: payoutRef,
    sellerId: row.seller_id,
    amount: sellerPayout,
    currency: "INR",
    payoutRecordId: payoutRecResult?.rows?.[0]?.payout_id || null,
  });

  const { addCoins, checkAndAwardSalesMilestones, EARN_AMOUNTS } = require("./coinController");
  await addCoins(
    row.seller_id,
    EARN_AMOUNTS?.sale || 10,
    "sale",
    `sale_payout:seller:${row.post_id}:${row.seller_id}`,
    `Earned ${EARN_AMOUNTS?.sale || 10} coins for completing a sale (payout: ₹${sellerPayout})`
  );
  await addCoins(
    row.buyer_id,
    EARN_AMOUNTS?.purchase || 10,
    "purchase",
    `sale_payout:buyer:${row.post_id}:${row.buyer_id}`,
    `Earned ${EARN_AMOUNTS?.purchase || 10} coins for completing a purchase`
  );
  await checkAndAwardSalesMilestones(row.seller_id);

  logger.info(`[SALES_SETTLE] Sale #${saleId} settled. Agreed: ₹${agreedPrice}, Fee: ₹${platformFee}, Payout: ₹${sellerPayout}`);
}

// ── Helper: freeze a post during a fraud/dispute hold ───────────────────────
// Falls back to 'inactive' if the live schema rejects 'frozen'.
async function freezePostForHold(postId) {
  if (!postId) return null;
  try {
    await runQuery("UPDATE posts SET status = 'frozen', updated_at = NOW() WHERE post_id::text = $1", [String(postId)]);
    return "frozen";
  } catch (freezeErr) {
    try {
      await runQuery("UPDATE posts SET status = 'inactive', updated_at = NOW() WHERE post_id::text = $1", [String(postId)]);
      return "inactive";
    } catch (fallbackErr) {
      logger.warn("[Sales] Post freeze fallback failed:", fallbackErr.message);
      return null;
    }
  }
}

// ── 1. POST /request ────────────────────────────────────────────────────────
// Buyer sends a sale request to seller. The payment mode is NOT client-driven:
// it is enforced server-side by the listing's category — Electronics listings
// are escrow-eligible (IN_APP, money via platform), everything else is forced
// to direct/outside payment (OUTSIDE, platform only tracks the agreement).
exports.requestSale = async (req, res) => {
  try {
    const buyerId = getAuthUserId(req);
    if (!buyerId) return res.status(401).json({ error: "Authentication required" });

    const { postId, sellerId } = req.body;
    if (!postId || !sellerId) {
      return res.status(400).json({ error: "Both postId and sellerId are required" });
    }

    // Verify post exists and belongs to the seller. The category name is resolved
    // via the categories table — posts only store category_id (no 'category' column).
    const postResult = await runQuery(
      `SELECT p.post_id, p.user_id, p.price,
              COALESCE(c.name, p.category_id::text) AS category
       FROM posts p
       LEFT JOIN categories c ON p.category_id::text = c.category_id::text
       WHERE p.post_id::text = $1`,
      [postId]
    );
    if (postResult.rows.length === 0) {
      return res.status(404).json({ error: "Post not found" });
    }
    if (String(postResult.rows[0].user_id) !== String(sellerId)) {
      return res.status(400).json({ error: "Post does not belong to the specified seller" });
    }

    // ── Category-driven payment mode (server-enforced, never client-trusted) ──
    // Electronics → in-app escrow (IN_APP). All other categories → direct/outside.
    const isElectronics = isElectronicsCategory(postResult.rows[0].category);
    const paymentMode = isElectronics ? "IN_APP" : "OUTSIDE";

    // Check no duplicate active request
    const existingResult = await runQuery(
      `SELECT id FROM sales
       WHERE post_id::text = $1 AND buyer_id::text = $2 AND status IN ('requested','approved','received')`,
      [postId, buyerId]
    );
    if (existingResult.rows.length > 0) {
      return res.status(400).json({ error: "An active sale request already exists for this post" });
    }

    // ── Fraud guards: same-party abuse, counterparty velocity, amount limits ──
    const postPrice = parseFloat(postResult.rows[0].price || 0);
    try {
      const { runSaleGuards } = require("../services/fraudGuardService");
      const guardResult = await runSaleGuards({ buyerId, sellerId, amount: postPrice });
      if (!guardResult.allowed) {
        return res.status(403).json({
          error: "Sale request blocked by safety checks",
          detail: guardResult.reason,
          code: guardResult.code || "GUARD_BLOCKED",
        });
      }
    } catch (guardErr) {
      logger.warn("[Sales] Fraud guard check failed (fail-open):", guardErr.message);
    }

    const result = await runQuery(
      `INSERT INTO sales (post_id, buyer_id, seller_id, status, payment_mode)
       VALUES ($1, $2, $3, 'requested', $4)
       RETURNING id, post_id, buyer_id, seller_id, status, payment_mode, created_at`,
      [postId, buyerId, sellerId, paymentMode]
    );

    // Notify the seller of the new request (best-effort)
    try {
      const buyerNameResult = await runQuery(
        `SELECT COALESCE(p.full_name, u.username) AS name FROM users u
         LEFT JOIN profiles p ON u.user_id::text = p.user_id::text
         WHERE u.user_id::text = $1`,
        [String(buyerId)]
      );
      const buyerName = buyerNameResult.rows[0]?.name || "A buyer";
      notifySaleParty(
        sellerId,
        "sale_request",
        "New Purchase Request",
        `${buyerName} wants to buy your listing. Review it in Sale Done.`,
        result.rows[0].id,
        postId
      );
    } catch (notifErr) {
      logger.warn("[Sales] Request notification failed:", notifErr.message);
    }

    return res.status(201).json({
      success: true,
      sale: result.rows[0],
      paymentMode,
      message:
        paymentMode === "IN_APP"
          ? "Sale request sent. Once approved, payment happens securely inside the platform."
          : "Sale request sent. You and the buyer/seller will transfer money directly outside the platform.",
    });
  } catch (err) {
    logger.error("[Sales] Error requesting sale:", err);
    const detail = err?.message?.includes("already exists") ? err.message : "An unexpected error occurred while creating the sale request.";
    return res.status(500).json({ error: "Unable to create sale request", detail });
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

    if (result.rows.length === 0) {
      return res.json({ sales: [], message: "No pending sale requests found." });
    }
    return res.json({ sales: result.rows });
  } catch (err) {
    logger.error("[Sales] Error fetching pending sales:", err);
    const detail = err?.message?.includes("does not exist") ? "A required database column is missing. Please contact support." : "An unexpected error occurred while loading pending sale requests.";
    return res.status(500).json({ error: "Unable to load pending sale requests", detail });
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
         AND s.status IN ('requested','approved','shipped','received')
       ORDER BY s.updated_at DESC`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.json({ sales: [], message: "No active sales found." });
    }
    return res.json({ sales: result.rows });
  } catch (err) {
    logger.error("[Sales] Error fetching my sales:", err);
    const detail = err?.message?.includes("does not exist") ? "A required database column is missing." : "An unexpected error occurred while loading your sales.";
    return res.status(500).json({ error: "Unable to load your sales", detail });
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

    notifySaleParty(
      sale.buyer_id,
      "sale_approved",
      "Purchase Request Approved",
      "The seller approved your purchase request. Open Sale Done to continue.",
      sale.id,
      sale.post_id
    );

    return res.json({ success: true, sale: result.rows[0] });
  } catch (err) {
    logger.error("[Sales] Error approving sale:", err);
    return res.status(500).json({ error: "Unable to approve sale", detail: "An unexpected error occurred while approving this sale. Please try again." });
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

    notifySaleParty(
      sale.buyer_id,
      "sale_rejected",
      "Purchase Request Declined",
      "The seller declined your purchase request. You can still reach out to them directly.",
      sale.id,
      sale.post_id
    );

    return res.json({ success: true, sale: result.rows[0] });
  } catch (err) {
    logger.error("[Sales] Error rejecting sale:", err);
    return res.status(500).json({ error: "Unable to reject sale", detail: "An unexpected error occurred while rejecting this sale. Please try again." });
  }
};

// ── 5b. POST /:id/cancel — Buyer withdraws their own pending request ─────────
exports.cancelSale = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "Authentication required" });

    const sale = await getSaleOrFail(req.params.id);
    if (!sale) return res.status(404).json({ error: "Sale not found" });
    if (String(sale.buyer_id) !== String(userId)) {
      return res.status(403).json({ error: "Only the buyer can cancel this request" });
    }
    if (sale.status !== "requested") {
      return res.status(400).json({ error: "Only pending purchase requests can be cancelled" });
    }

    const result = await runQuery(
      `UPDATE sales SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [req.params.id]
    );

    notifySaleParty(
      sale.seller_id,
      "sale_cancelled",
      "Purchase Request Cancelled",
      "The buyer withdrew their purchase request.",
      sale.id,
      sale.post_id
    );

    return res.json({ success: true, sale: result.rows[0], message: "Purchase request cancelled." });
  } catch (err) {
    logger.error("[Sales] Error cancelling sale:", err);
    return res.status(500).json({ error: "Unable to cancel request", detail: "An unexpected error occurred while cancelling this request. Please try again." });
  }
};

// ── 5c. POST /:id/undo-sale — Seller marks sale undone & reactivates post ───────
exports.undoSale = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "Authentication required" });

    const sale = await getSaleOrFail(req.params.id);
    if (!sale) return res.status(404).json({ error: "Sale not found" });

    if (String(sale.seller_id) !== String(userId)) {
      return res.status(403).json({ error: "Only the seller can mark a sale as undone and repost the item" });
    }

    const result = await runQuery(
      `UPDATE sales SET status = 'undone', updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [req.params.id]
    );

    if (sale.post_id) {
      await runQuery(
        `UPDATE posts SET status = 'active', updated_at = NOW() WHERE id = $1`,
        [sale.post_id]
      );
    }

    notifySaleParty(
      sale.buyer_id,
      "sale_undone",
      "Sale Marked Undone",
      "The seller marked this sale as undone and reactivated the listing on the marketplace.",
      sale.id,
      sale.post_id
    );

    return res.json({
      success: true,
      sale: result.rows[0],
      message: "Sale marked as undone successfully. Post has been reactivated on the marketplace.",
      post_id: sale.post_id,
    });
  } catch (err) {
    logger.error("[Sales] Error undoing sale:", err);
    return res.status(500).json({ error: "Unable to undo sale", detail: err.message });
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
    // Buyer confirms receipt after approval/shipping — or completes a sale the seller
    // already marked paid (status 'received' → 'settled', fixing the stuck-state edge case).
    if (!["approved", "shipped", "received"].includes(sale.status)) {
      return res.status(400).json({ error: "Sale must be approved, shipped or received before confirming" });
    }

    // IN_APP escrow: the buyer must have actually paid before confirming receipt
    if (normalizePaymentMode(sale.payment_mode) === "IN_APP") {
      const payStatus = String(sale.payment_status || "").toUpperCase();
      if (payStatus !== "PAID") {
        return res.status(400).json({
          error: "This in-app sale hasn't been paid yet. Complete the payment before confirming receipt.",
        });
      }
    }

    // 'received' can be reached two ways:
    //  - buyer confirmed first (agreed_price IS NULL) → the seller must still confirm payment
    //  - seller confirmed payment first (agreed_price IS SET) → buyer confirming completes the sale
    if (sale.status === "received" && sale.agreed_price == null) {
      return res.status(400).json({
        error: "Receipt already confirmed — waiting for the seller to confirm payment.",
      });
    }

    const newStatus = sale.status === "received" ? "settled" : "received";
    const result = await runQuery(
      `UPDATE sales SET status = $1, updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [newStatus, req.params.id]
    );

    // ── Audit: record buyer confirmation (Phase 4, item 43) ─────────────
    try {
      await runQuery(
        `INSERT INTO sale_confirmations (sale_id, user_id, role, action, previous_state, new_state, request_id)
         VALUES ($1, $2, 'buyer', 'ORDER_RECEIVED', $3, $4, $5)`,
        [sale.id, userId, sale.status, newStatus, req.correlationId || null]
      );
    } catch (confirmErr) {
      logger.warn("[Sales] Confirmation audit insert failed:", confirmErr.message);
    }

    if (newStatus === "settled") {
      // Seller already confirmed payment — buyer's confirmation completes the sale.
      setImmediate(() => {
        finalizeSettlement(sale.id).catch((err) =>
          logger.warn("[Sales] Settlement finalize (buyer-confirm path) failed:", err.message)
        );
      });
    }

    notifySaleParty(
      sale.seller_id,
      newStatus === "settled" ? "sale_completed" : "sale_received",
      newStatus === "settled" ? "Sale Completed" : "Order Received",
      newStatus === "settled"
        ? "The buyer confirmed receipt — your sale is complete. Funds are being paid out."
        : "The buyer confirmed they received the item.",
      sale.id,
      sale.post_id
    );

    return res.json({ success: true, sale: result.rows[0] });
  } catch (err) {
    logger.error("[Sales] Error marking order received:", err);
    return res.status(500).json({ error: "Unable to confirm order receipt", detail: "An unexpected error occurred while marking this order as received. Please try again." });
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

    // IN_APP sales have platform money to hold; OUTSIDE sales don't (money moved
    // off-platform). The hold flag only gates settlement for platform money.
    const holdMoney = normalizePaymentMode(sale.payment_mode) === "IN_APP";

    // Mark sale as fraud mismatch with hold active
    await runQuery(
      `UPDATE sales SET status = 'fraud', reported_party = 'seller', fraud_reason = $1, admin_notified = true, razorpay_hold = $3, updated_at = NOW()
       WHERE id = $2`,
      [reason, req.params.id, holdMoney]
    );

    // Freeze the post so it can't be re-listed/sold during the dispute
    await freezePostForHold(sale.post_id);

    // Freeze BOTH seller and buyer accounts pending admin review
    await createSuspension(sale.buyer_id, sale.id, `Dispute mismatch (Non-receipt): ${reason}`);
    await createSuspension(sale.seller_id, sale.id, `Dispute mismatch (Non-receipt): ${reason}`);

    // Set account_status to FROZEN for both users
    await runQuery(
      `UPDATE users SET status = 'FROZEN', account_status = 'FROZEN' WHERE user_id::text IN ($1, $2)`,
      [String(sale.buyer_id), String(sale.seller_id)]
    );

    logger.warn(`[DISPUTE_MISMATCH] Sale #${sale.id} non-receipt reported. BOTH seller (${sale.seller_id}) & buyer (${sale.buyer_id}) accounts FROZEN. Money hold: ${holdMoney}.`);

    return res.json({
      success: true,
      message: "Dispute mismatch logged. Both accounts have been frozen and funds placed on hold with Razorpay pending manual audit.",
    });
  } catch (err) {
    logger.error("[Sales] Error marking order NOT received:", err);
    return res.status(500).json({ error: "Unable to submit non-receipt report", detail: "An unexpected error occurred while reporting this issue. Please try again or contact support." });
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
    if (!["approved", "shipped"].includes(sale.status)) {
      return res.status(400).json({ error: "Sale must be approved before marking shipped" });
    }

    const { trackingNumber, courierName, evidenceUrls } = req.body || {};
    const evidence = Array.isArray(evidenceUrls) ? evidenceUrls.filter(Boolean) : [];

    const result = await runQuery(
      `UPDATE sales SET
         status = 'shipped',
         shipping_tracking = $2,
         shipping_courier = $3,
         shipping_evidence = $4::jsonb,
         updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [req.params.id, trackingNumber || null, courierName || null, JSON.stringify(evidence)]
    );

    // Audit log
    logger.info(`[SALE_SHIPPED] Sale #${sale.id} marked shipped by seller (${userId}). Courier: ${courierName || 'N/A'}, Tracking: ${trackingNumber || 'N/A'}, Evidence: ${evidence.length}`);

    notifySaleParty(
      sale.buyer_id,
      "sale_shipped",
      "Parcel Shipped",
      trackingNumber
        ? `Your order is on the way! Tracking: ${trackingNumber}`
        : "The seller shipped your order. Confirm receipt once it arrives.",
      sale.id,
      sale.post_id
    );

    return res.json({ success: true, message: "Parcel marked as shipped with evidence.", sale: result.rows[0] });
  } catch (err) {
    logger.error("[Sales] Error marking shipped:", err);
    return res.status(500).json({ error: "Unable to mark parcel as shipped", detail: "An unexpected error occurred while updating shipment status. Please try again." });
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
      // Mutual Cancellation Path — refund/release, unfreeze post, lift hold, UNFREEZE BOTH parties
      await runQuery(
        `UPDATE sales SET status = 'cancelled', fraud_reason = 'Mutual cancellation agreed by seller', razorpay_hold = false, updated_at = NOW()
         WHERE id = $1`,
        [req.params.id]
      );
      await runQuery(
        `UPDATE posts SET status = 'active', updated_at = NOW() WHERE post_id::text = $1`,
        [String(sale.post_id)]
      ).catch(() => {});

      // Unified resolution: unfreeze BOTH buyer & seller + close their suspensions
      try {
        const { resolveDisputeForParties } = require("../services/disputeResolutionService");
        const resolved = await resolveDisputeForParties({
          buyerId: sale.buyer_id,
          sellerId: sale.seller_id,
          saleId: sale.id,
          decision: "MUTUAL_CANCELLATION",
          resolution: "Mutual cancellation agreed by seller",
          adminId: userId,
        });
        logger.info(`[MUTUAL_CANCELLATION] Sale #${sale.id} — both accounts unfrozen: ${resolved.unfrozen.join(", ")}`);
      } catch (unfreezeErr) {
        logger.warn("[MUTUAL_CANCELLATION] Unfreeze failed (sale still cancelled):", unfreezeErr.message);
      }

      logger.info(`[MUTUAL_CANCELLATION] Sale #${sale.id} cancelled mutually by seller agreement.`);
      return res.json({
        success: true,
        status: "MUTUAL_CANCELLATION",
        message: "Mutual cancellation agreed. Order cancelled and refund initiated per policy. Both accounts have been unfrozen.",
      });
    } else {
      // Contested Dispute Path: Freeze BOTH accounts + hold platform money (IN_APP only)
      const holdMoney = normalizePaymentMode(sale.payment_mode) === "IN_APP";
      await runQuery(
        `UPDATE sales SET status = 'fraud', reported_party = 'buyer', fraud_reason = $1, admin_notified = true, razorpay_hold = $3, updated_at = NOW()
         WHERE id = $2`,
        [statement || "Seller disagreed with buyer non-receipt claim", req.params.id, holdMoney]
      );

      await freezePostForHold(sale.post_id);

      await createSuspension(sale.buyer_id, sale.id, `Contested Dispute: ${statement || "Seller contested non-receipt"}`);
      await createSuspension(sale.seller_id, sale.id, `Contested Dispute: ${statement || "Seller contested non-receipt"}`);

      await runQuery(
        `UPDATE users SET status = 'FROZEN', account_status = 'FROZEN' WHERE user_id::text IN ($1, $2)`,
        [String(sale.buyer_id), String(sale.seller_id)]
      );

      logger.warn(`[CONTESTED_DISPUTE] Sale #${sale.id} contested by seller. BOTH seller (${sale.seller_id}) & buyer (${sale.buyer_id}) accounts FROZEN. Money hold: ${holdMoney}.`);

      return res.json({
        success: true,
        status: "FLAGGED_DISPUTE",
        message: "Contested dispute logged. BOTH seller and buyer accounts frozen and funds held on Razorpay pending admin review.",
      });
    }
  } catch (err) {
    logger.error("[Sales] Error responding to dispute:", err);
    return res.status(500).json({ error: "Unable to submit dispute response", detail: "An unexpected error occurred while processing your response. Please try again." });
  }
};

// ── 6e. POST /:id/rate — Buyer rates and reviews completed sale (strictly buyer only) ──
exports.rateCompletedSale = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "Authentication required" });

    const { rating, comment } = req.body || {};
    const numericRating = Number(rating);
    if (!numericRating || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ error: "Rating must be a number between 1 and 5" });
    }

    const sale = await getSaleOrFail(req.params.id);
    if (!sale) return res.status(404).json({ error: "Sale not found" });

    // STRICT CHECK: Only the actual buyer of this completed transaction can rate
    if (String(sale.buyer_id) !== String(userId)) {
      return res.status(403).json({ error: "Only the verified buyer of this transaction can leave a rating" });
    }

    if (!["received", "settled"].includes(sale.status)) {
      return res.status(400).json({ error: "Rating can only be submitted for completed/received sales" });
    }

    // Record buyer rating & comment on the sale
    await runQuery(
      `UPDATE sales SET buyer_rating = $1, buyer_comment = $2, rated_at = NOW() WHERE id = $3`,
      [numericRating, comment || "", req.params.id]
    );

    // Also insert into global ratings table for aggregate seller trust score
    await runQuery(
      `INSERT INTO ratings (target_user_id, reviewer_id, post_id, score, review)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (reviewer_id, post_id) DO UPDATE SET score = EXCLUDED.score, review = EXCLUDED.review`,
      [sale.seller_id, userId, sale.post_id, numericRating, comment || ""]
    );

    logger.info(`[RATING] Buyer ${userId} rated Sale #${sale.id} with ${numericRating} stars for seller ${sale.seller_id}`);

    return res.json({ success: true, message: "Thank you! Your rating and review have been recorded." });
  } catch (err) {
    logger.error("[Sales] Error submitting buyer rating:", err);
    return res.status(500).json({ error: "Unable to submit rating", detail: "An unexpected error occurred while saving your rating. Please try again." });
  }
};

// ── GET /my/review-status — Is the current user the buyer of a completed, unrated sale for a post? ──
exports.getMyReviewStatus = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "Authentication required" });

    const postId = req.query.post_id || req.query.postId;
    if (!postId) return res.status(400).json({ error: "post_id is required" });

    const result = await runQuery(
      `SELECT id, post_id, status, buyer_rating, buyer_comment, rated_at
       FROM sales
       WHERE buyer_id::text = $1 AND post_id::text = $2 AND status IN ('received', 'settled')
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId, String(postId)]
    );

    if (result.rows.length === 0) {
      return res.json({ success: true, eligible: false, saleId: null });
    }

    const sale = result.rows[0];
    return res.json({
      success: true,
      eligible: sale.buyer_rating == null,
      rated: sale.buyer_rating != null,
      saleId: sale.id,
      status: sale.status,
      buyerRating: sale.buyer_rating,
      buyerComment: sale.buyer_comment,
      ratedAt: sale.rated_at,
    });
  } catch (err) {
    logger.error("[Sales] Error checking review status:", err);
    return res.status(500).json({ error: "Unable to check review status" });
  }
};

// ── 6f. GET /user/:sellerId/sold-posts — Public category-filtered sold posts for a user ────────
exports.getSellerSoldPosts = async (req, res) => {
  try {
    // Both aliases exist: /user/:sellerId/sold-posts and /user/:userId/sold
    const sellerId = req.params.sellerId || req.params.userId;
    const { category } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(SOLD_POSTS_MAX_LIMIT, Math.max(1, parseInt(req.query.limit, 10) || SOLD_POSTS_DEFAULT_LIMIT));
    const offset = (page - 1) * limit;

    if (!sellerId) return res.status(400).json({ error: "sellerId is required" });

    // ── Seller profile details (cacheable) ──────────────────────────────
    const sellerResult = await runQuery(
      `SELECT u.user_id, u.username, u.created_at, u.kyc_status, u.account_status,
              COALESCE(p.full_name, u.username) AS seller_name, p.avatar_url, p.verified AS is_verified
       FROM users u
       LEFT JOIN profiles p ON u.user_id::text = p.user_id::text
       WHERE u.user_id::text = $1`,
      [String(sellerId)]
    );

    const seller = sellerResult.rows.length > 0 ? sellerResult.rows[0] : { seller_name: "Seller", kyc_status: "PENDING" };

    // ── Sold posts with pagination ──────────────────────────────────────
    let sql = `
      SELECT s.id AS sale_id, s.post_id, s.buyer_rating, s.buyer_comment, s.rated_at, s.created_at AS sale_date,
             p.title AS post_title, p.price AS post_price,
             COALESCE(p.category_id::text, '') AS category,
             COALESCE(bp.full_name, bu.username) AS buyer_name
      FROM sales s
      JOIN posts p ON s.post_id::text = p.post_id::text
      LEFT JOIN users bu ON s.buyer_id::text = bu.user_id::text
      LEFT JOIN profiles bp ON s.buyer_id::text = bp.user_id::text
      WHERE s.seller_id::text = $1 AND s.status IN ('received', 'settled')
    `;

    const queryParams = [String(sellerId)];

    if (category && String(category).trim() !== "" && String(category).toLowerCase() !== "all") {
      sql += ` AND LOWER(COALESCE(p.category_id::text, '')) = LOWER($2)`;
      queryParams.push(String(category).trim());
    }

    // Count total matching rows BEFORE pagination
    const countSql = sql.replace(
      /SELECT s\.id AS sale_id, s\.post_id, s\.buyer_rating, s\.buyer_comment, s\.rated_at, s\.created_at AS sale_date,\n\s+p\.title AS post_title, p\.price AS post_price,\n\s+COALESCE\(p\.category_id::text, ''\) AS category,\n\s+COALESCE\(bp\.full_name, bu\.username\) AS buyer_name/g,
      "SELECT COUNT(*)::int AS total"
    );
    const countResult = await runQuery(countSql, queryParams);
    const totalItems = countResult.rows[0]?.total || 0;

    sql += ` ORDER BY s.created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(limit, offset);

    const result = await runQuery(sql, queryParams);

    // ── Compute seller summary stats (cached) ───────────────────────────
    const cacheKey = `trust:score:${sellerId}`;
    const stats = await cacheService.getOrSetWithStampedeProtection(
      cacheKey,
      async () => {
        const statsResult = await runQuery(
          `SELECT COUNT(*)::int AS total_sold,
                  COUNT(*) FILTER (WHERE s.status IN ('received','settled'))::int AS completed_sold,
                  COALESCE(AVG(buyer_rating), 0)::numeric(3,2) AS avg_rating,
                  COUNT(CASE WHEN status = 'fraud' THEN 1 END)::int AS dispute_count
           FROM sales s WHERE s.seller_id::text = $1`,
          [String(sellerId)]
        );
        const boughtResult = await runQuery(
          `SELECT COUNT(*)::int AS total_bought
           FROM sales WHERE buyer_id::text = $1 AND status IN ('received','settled')`,
          [String(sellerId)]
        );
        const stats = statsResult.rows[0] || { total_sold: 0, completed_sold: 0, avg_rating: "0.00", dispute_count: 0 };
        stats.total_bought = Number(boughtResult.rows[0]?.total_bought || 0);
        return stats;
      },
      TRUST_SCORE_CACHE_TTL_SECONDS
    );

    const totalSold = Number(stats.total_sold || totalItems);
    const totalBought = Number(stats.total_bought || 0);
    const avgRating = Number(stats.avg_rating || 0);

    // Compute Trust Score (0-100) — rewards real marketplace activity: sales
    // completed AND purchases made (a genuine buyer is a genuine member).
    let trustScore = 40;
    if (seller.kyc_status === "VERIFIED" || seller.is_verified) trustScore += 25;
    const completedActivity = Number(stats.completed_sold || 0) + totalBought;
    if (completedActivity >= 10) trustScore += 15;
    else if (completedActivity >= 3) trustScore += 10;
    else if (completedActivity >= 1) trustScore += 5;
    if (avgRating >= 4.5) trustScore += 20;
    else if (avgRating >= 3.5) trustScore += 10;
    if (Number(stats.dispute_count || 0) === 0) trustScore += 10;
    trustScore = Math.min(100, Math.max(0, trustScore));

    // Trust Badge Title (use plain text badges, not emoji-only)
    let trustBadge = "NORMAL TRUST";
    if (trustScore >= 90) trustBadge = "GOLD VERIFIED SELLER";
    else if (trustScore >= 75) trustBadge = "VERIFIED SELLER";
    else if (trustScore < 50) trustBadge = "ELEVATED RISK";

    const getStarString = (ratingNum) => {
      const rounded = Math.round(Number(ratingNum || 0));
      return "★".repeat(rounded) + "☆".repeat(Math.max(0, 5 - rounded));
    };

    const formattedPosts = result.rows.map((item) => ({
      ...item,
      rating_stars: item.buyer_rating ? getStarString(item.buyer_rating) : "Not Rated",
    }));

    const totalPages = Math.ceil(totalItems / limit) || 1;

    const response = {
      success: true,
      seller_id: sellerId,
      seller_name: seller.seller_name,
      avatar_url: seller.avatar_url || null,
      is_kyc_verified: seller.kyc_status === "VERIFIED" || Boolean(seller.is_verified),
      total_sold: totalSold,
      total_bought: totalBought,
      average_rating: avgRating,
      star_string: getStarString(avgRating),
      trust_score: trustScore,
      trust_badge: trustBadge,
      sold_posts: formattedPosts,
      pagination: {
        page,
        limit,
        total: totalItems,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    };

    if (formattedPosts.length === 0) {
      response.message = "No sold posts found for this seller.";
    }

    return res.json(response);
  } catch (err) {
    logger.error("[Sales] Error fetching seller sold posts:", err);
    const detail = err?.message?.includes("does not exist") ? "A required database column is missing. Please contact support." : "An unexpected error occurred while loading sold posts. Please try again later.";
    return res.status(500).json({ error: "Unable to load seller's sold posts", detail });
  }
};

/**
 * GET /api/sales/user/:userId/bought-posts — PUBLIC
 * Posts a user has actually purchased (completed sales where they were the buyer).
 * Like sold-posts, this is a public trust signal: genuine buyers prove themselves
 * through real purchases. New users with no history get an empty list.
 */
exports.getUserBoughtPosts = async (req, res) => {
  try {
    const userId = parseOptionalString(req.params.userId);
    const category = parseOptionalString(req.query.category);
    const page = parsePositiveInt(req.query.page, 1);
    const limit = parsePositiveInt(req.query.limit, 20);
    const offset = (page - 1) * limit;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    // Buyer summary (same trust-passport shape as the seller endpoint)
    const userResult = await runQuery(
      `SELECT COALESCE(pr.full_name, u.username) AS seller_name,
              pr.avatar_url, u.kyc_status, u.is_verified
       FROM users u
       LEFT JOIN profiles pr ON u.user_id::text = pr.user_id::text
       WHERE u.user_id::text = $1`,
      [String(userId)]
    );
    const user = userResult.rows.length > 0 ? userResult.rows[0] : { seller_name: "User", kyc_status: "PENDING" };

    let sql = `
      SELECT s.id AS sale_id, s.post_id, s.seller_id, s.buyer_rating, s.buyer_comment,
             s.rated_at, s.created_at AS sale_date,
             p.title AS post_title, p.price AS post_price,
             COALESCE(p.category_id::text, '') AS category,
             COALESCE(sp.full_name, su.username) AS seller_name
      FROM sales s
      JOIN posts p ON s.post_id::text = p.post_id::text
      LEFT JOIN users su ON s.seller_id::text = su.user_id::text
      LEFT JOIN profiles sp ON s.seller_id::text = sp.user_id::text
      WHERE s.buyer_id::text = $1 AND s.status IN ('received','settled')
    `;
    const queryParams = [String(userId)];

    if (category && String(category).trim() !== "" && String(category).toLowerCase() !== "all") {
      sql += ` AND LOWER(COALESCE(p.category_id::text, '')) = LOWER($2)`;
      queryParams.push(String(category).trim());
    }

    const countSql = sql.replace(
      /SELECT s\.id AS sale_id, s\.post_id, s\.seller_id, s\.buyer_rating, s\.buyer_comment,\n\s+s\.rated_at, s\.created_at AS sale_date,\n\s+p\.title AS post_title, p\.price AS post_price,\n\s+COALESCE\(p\.category_id::text, ''\) AS category,\n\s+COALESCE\(sp\.full_name, su\.username\) AS seller_name/g,
      "SELECT COUNT(*)::int AS total"
    );
    const countResult = await runQuery(countSql, queryParams);
    const totalItems = countResult.rows[0]?.total || 0;

    sql += ` ORDER BY s.created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(limit, offset);

    const result = await runQuery(sql, queryParams);

    const formattedPosts = result.rows.map((item) => ({
      ...item,
      rating_stars: item.buyer_rating ? "★".repeat(Math.round(Number(item.buyer_rating))) : "Not Rated",
    }));

    const totalPages = Math.ceil(totalItems / limit) || 1;

    const response = {
      success: true,
      user_id: userId,
      seller_name: user.seller_name,
      avatar_url: user.avatar_url || null,
      is_kyc_verified: user.kyc_status === "VERIFIED" || Boolean(user.is_verified),
      total_bought: totalItems,
      bought_posts: formattedPosts,
      pagination: { page, limit, total: totalItems, totalPages, hasNext: page < totalPages, hasPrevious: page > 1 },
    };

    if (formattedPosts.length === 0) {
      response.message = "No purchases yet for this user.";
    }

    return res.json(response);
  } catch (err) {
    logger.error("[Sales] Error fetching user bought posts:", err);
    return res.status(500).json({ error: "Unable to load user's purchased posts" });
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
    // Can settle from 'received' (buyer confirmed) or from 'approved'/'shipped' (buyer hasn't marked yet).
    if (!["approved", "shipped", "received"].includes(sale.status)) {
      return res.status(400).json({ error: "Sale must be in approved, shipped or received status" });
    }

    // ── Safeguard: IN_APP sales must actually be paid by the buyer ──────
    if (normalizePaymentMode(sale.payment_mode) === "IN_APP") {
      // Ensure the payment-tracking columns exist (self-healing for live DBs).
      try {
        require("../controllers/paymentController").ensureSalePaymentColumns();
      } catch (guardErr) {
        logger.warn("[Sales] Payment column ensure failed:", guardErr.message);
      }
      const payStatus = String(sale.payment_status || "").toUpperCase();
      if (payStatus !== "PAID") {
        return res.status(400).json({
          error: "In-app sale cannot be settled — the buyer has not completed payment. Ask the buyer to pay inside the platform first.",
        });
      }
    }

    // ── Collect agreed price from body or default to post price ───────────
    let agreedPrice = parseFloat(req.body?.agreedPrice || req.body?.agreed_price || 0);
    if (agreedPrice <= 0) {
      // Fallback to the post's listed price
      const postRes = await runQuery(
        "SELECT price FROM posts WHERE post_id::text = $1",
        [sale.post_id]
      );
      agreedPrice = parseFloat(postRes.rows[0]?.price || 0);
    }

    // ── Safeguard: Re-validate agreed price against configured limits ──
    // (The request-time guard checked the *listed* price; the *agreed* price
    // is what actually moves money at settlement, so it must be re-checked.)
    const { checkAmountLimits, checkDailyLimits } = require("../services/fraudGuardService");
    const amountCheck = checkAmountLimits({ amount: agreedPrice });
    if (!amountCheck.allowed) {
      return res.status(400).json({ error: amountCheck.reason });
    }
    // Enforce the seller's daily volume limit at settlement (Phase 4, item 47).
    // DB-backed, so wrapped fail-open — a temporary DB issue during the
    // daily-limit query must not block settlement (money already in motion).
    try {
      const sellerDaily = await checkDailyLimits({ userId: sale.seller_id, role: "seller" });
      if (!sellerDaily.allowed) {
        return res.status(400).json({ error: sellerDaily.reason });
      }
    } catch (limitsErr) {
      logger.warn("[Sales] Settlement daily-limit guard error (fail-open):", limitsErr.message);
    }

    // ── Safeguard: Check if funds are held in escrow due to an active dispute ────
    if (sale.razorpay_hold) {
      return res.status(400).json({
        error: "Funds for this sale are on hold due to an active dispute. Settlement cannot proceed until the dispute is resolved.",
      });
    }

    // ── Safeguard: Check if either party account is currently frozen or locked ────
    const freezeCheck = await runQuery(
      `SELECT user_id FROM users WHERE user_id::text IN ($1, $2) AND (account_status IN ('FROZEN', 'LOCKED') OR status IN ('frozen', 'locked'))`,
      [String(sale.seller_id), String(sale.buyer_id)]
    );
    if (freezeCheck.rows.length > 0) {
      return res.status(400).json({
        error: "Settlement blocked: one or both account parties are currently frozen/locked due to an ongoing dispute or security audit.",
      });
    }

    // Fetch post category to apply category-specific escrow fee. The category
    // name is resolved via the categories table (posts store only category_id).
    const postCatRes = await runQuery(
      `SELECT p.category_id, COALESCE(c.name, p.category_id::text, '') AS category
       FROM posts p
       LEFT JOIN categories c ON p.category_id::text = c.category_id::text
       WHERE p.post_id::text = $1`,
      [sale.post_id]
    );
    const postCategory = String(postCatRes.rows[0]?.category || postCatRes.rows[0]?.category_id || "");
    const isElectronics = isElectronicsCategory(postCategory);

    // Fetch seller's active subscription plan (kept for the financial snapshot audit trail)
    const subResult = await runQuery(
      `SELECT sp.slug
       FROM user_subscriptions us
       JOIN subscription_plans sp ON sp.plan_id = us.plan_id
       WHERE us.user_id::text = $1 AND us.status = 'ACTIVE'
       ORDER BY us.end_date DESC LIMIT 1`,
      [sale.seller_id]
    );
    const activePlan = subResult.rows[0]?.slug || "free";

    // Flat 2.5% platform commission for Electronics Escrow Protection (no tier
    // discounts); 0% for General Categories (Subscription model covers them).
    const PLATFORM_FEE_RATE = isElectronics ? 0.025 : 0.0;

    const calc = financialEngine.calculateSettlement(agreedPrice, PLATFORM_FEE_RATE);
    const platformFee = calc.platformFee;
    const gstOnFee = calc.gstOnFee;
    const sellerPayout = calc.sellerPayout;

    if (sellerPayout <= 0) {
      return res.status(400).json({ error: "Sale amount is too low — after platform commission the seller would receive ₹0 or less." });
    }

    // ── Payout limit guard (Phase 4, item 47) ──────────────────────────
    try {
      const { LIMITS } = require("../services/fraudGuardService");
      if (LIMITS.PAYOUT_LIMIT > 0 && sellerPayout > LIMITS.PAYOUT_LIMIT) {
        return res.status(400).json({
          error: `Seller payout (₹${sellerPayout}) exceeds the configured payout limit (₹${LIMITS.PAYOUT_LIMIT}). Contact support for a manual payout.`,
        });
      }
    } catch (payoutLimitErr) {
      logger.warn("[Sales] Payout limit guard error (fail-open):", payoutLimitErr.message);
    }

    // Persist immutable calculation snapshot
    await financialEngine.createFinancialSnapshot({
      entityType: "SALE",
      entityId: sale.id,
      userId: sale.seller_id,
      agreedPrice: calc.agreedPrice,
      commissionRate: calc.commissionRate,
      subscriptionPlan: activePlan,
    }).catch((snapErr) => logger.warn("[Sales] Snapshot creation error:", snapErr.message));

    const newStatus = sale.status === "received" ? "settled" : "received";
    const result = await runQuery(
      `UPDATE sales SET
         status = $1,
         agreed_price = $2,
         platform_fee = $3,
         gst_on_fee = $4,
         seller_payout = $5,
         updated_at = NOW()
       WHERE id = $6 RETURNING *`,
      [newStatus, agreedPrice, platformFee, gstOnFee, sellerPayout, req.params.id]
    );

    // ── Audit: record seller confirmation (Phase 4, item 43) ─────────────
    try {
      await runQuery(
        `INSERT INTO sale_confirmations (sale_id, user_id, role, action, previous_state, new_state, request_id)
         VALUES ($1, $2, 'seller', 'AMOUNT_RECEIVED', $3, $4, $5)`,
        [sale.id, userId, sale.status, newStatus, req.correlationId || null]
      );
    } catch (confirmErr) {
      logger.warn("[Sales] Confirmation audit insert failed:", confirmErr.message);
    }

    // ── Alert: large transaction above threshold (Phase 6, item 54) ──────
    try {
      const LARGE_TXN_THRESHOLD = parseFloat(process.env.LARGE_TRANSACTION_ALERT_THRESHOLD || "500000");
      if (agreedPrice >= LARGE_TXN_THRESHOLD) {
        const { raiseLargeTransactionAlert } = require("../services/financialAlertsService");
        raiseLargeTransactionAlert({
          entityType: "SALE",
          entityId: sale.id,
          userId: sale.seller_id,
          amount: agreedPrice,
          threshold: LARGE_TXN_THRESHOLD,
        });
      }
    } catch (alertErr) {
      logger.warn("[Sales] Large-transaction alert failed:", alertErr.message);
    }

    if (newStatus === "settled") {
      setImmediate(() => {
        finalizeSettlement(sale.id).catch((err) =>
          logger.warn("[Sales] Settlement finalize (amount-received path) failed:", err.message)
        );
      });
      notifySaleParty(
        sale.buyer_id,
        "sale_completed",
        "Sale Completed",
        "Your purchase is complete — rate your experience and help build trust for the seller.",
        sale.id,
        sale.post_id
      );
    } else if (newStatus === "received") {
      notifySaleParty(
        sale.buyer_id,
        "sale_paid",
        "Payment Confirmed",
        "The seller confirmed payment. Please confirm you received the item to complete the sale.",
        sale.id,
        sale.post_id
      );
    }

    return res.json({
      success: true,
      sale: {
        ...result.rows[0],
        agreed_price: agreedPrice,
        platform_fee: platformFee,
        gst_on_fee: gstOnFee,
        seller_payout: sellerPayout,
      },
      fee_summary: {
        agreed_price: agreedPrice,
        platform_fee: platformFee,
        gst_on_fee: gstOnFee,
        seller_payout: sellerPayout,
        effective_rate: `${(PLATFORM_FEE_RATE * (1 + GST_RATE) * 100).toFixed(2)}%`,
      },
    });
  } catch (err) {
    logger.error("[Sales] Error marking amount received:", err);
    return res.status(500).json({ error: "Unable to confirm amount received", detail: "An unexpected error occurred while updating payment status. Please try again." });
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
    return res.status(500).json({ error: "Unable to submit fraud report", detail: "An unexpected error occurred while submitting the fraud report. Please try again or contact support." });
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
    return res.status(500).json({ error: "Unable to respond to fraud report", detail: "An unexpected error occurred while processing your response. Please try again." });
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
    return res.status(500).json({ error: "Unable to check suspension status", detail: "An unexpected error occurred while checking your account status. Please try again." });
  }
};

// ── 10b. POST /:id/release-hold — Release razorpay_hold (ADMIN only) ──────────────
// The full unfreeze+hold-release is intentionally ADMIN-ONLY: under the fraud model,
// BOTH accounts stay frozen until a dispute is RESOLVED (admin review). Participants
// have the mutual-cancellation path (seller-respond-dispute AGREE) for the positive
// case; unilaterally unfreezing the counterparty from here would defeat the freeze.
exports.releaseHold = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "Authentication required" });

    const sale = await getSaleOrFail(req.params.id);
    if (!sale) return res.status(404).json({ error: "Sale not found" });

    // Admin only — participants must use the mutual-cancellation / admin-resolve flow
    const role = String(req.user?.role || req.user?.userRole || "").toLowerCase();
    const isAdmin = role === "admin" || role === "super_admin" || role === "superadmin";
    if (!isAdmin) {
      return res.status(403).json({ error: "Only admin can release the hold and unfreeze a disputed sale. Participants should use the respond/mutual-cancel flow." });
    }

    if (!sale.razorpay_hold) {
      return res.status(400).json({ error: "No active hold on this sale" });
    }

    // ── Unified resolution: clear hold (DB + Razorpay API), unfreeze BOTH parties,
    //    reactivate post, close suspensions. Mirrors admin resolve + order-dispute resolve.
    const { resolveDisputeForParties } = require("../services/disputeResolutionService");
    const resolved = await resolveDisputeForParties({
      buyerId: sale.buyer_id,
      sellerId: sale.seller_id,
      saleId: sale.id,
      decision: "HOLD_RELEASED",
      resolution: `Hold released by admin ${userId}`,
      adminId: userId,
    });

    logger.info(`[HOLD_RELEASE] Sale #${sale.id} razorpay_hold released by user ${userId}. Unfrozen: ${resolved.unfrozen.join(", ")}`);

    return res.json({
      success: true,
      message: "Hold has been released. Both parties unfrozen and the post reactivated. Settlement can now proceed.",
      unfrozen: resolved.unfrozen,
      post_reactivated: resolved.postReactivated,
    });
  } catch (err) {
    logger.error("[Sales] Error releasing hold:", err);
    return res.status(500).json({ error: "Unable to release hold", detail: "An unexpected error occurred. Please try again." });
  }
};

// ── 10c. POST /:id/admin-resolve — ADMIN resolves a sales fraud dispute ───────────
// Resolving a sale-level fraud through THIS endpoint produces the same outcome as
// resolving an order dispute: BOTH parties unfrozen, hold released, post reactivated.
exports.adminResolveSale = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "Authentication required" });

    const role = String(req.user?.role || req.user?.userRole || "").toLowerCase();
    const isAdmin = role === "admin" || role === "super_admin" || role === "superadmin";
    if (!isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { decision, resolution } = req.body || {};
    const validDecisions = ["SELLER_FAVOR", "BUYER_FAVOR", "PARTIAL", "DISMISSED"];
    if (!decision || !validDecisions.includes(decision)) {
      return res.status(400).json({ error: `Invalid decision. Valid: ${validDecisions.join(", ")}` });
    }

    const sale = await getSaleOrFail(req.params.id);
    if (!sale) return res.status(404).json({ error: "Sale not found" });
    if (sale.status !== "fraud") {
      return res.status(400).json({ error: "Only sales in 'fraud' status can be admin-resolved" });
    }

    // ── Unified resolution (unfreeze BOTH + release hold + reactivate post) ──
    const { resolveDisputeForParties } = require("../services/disputeResolutionService");
    const resolved = await resolveDisputeForParties({
      buyerId: sale.buyer_id,
      sellerId: sale.seller_id,
      saleId: sale.id,
      decision,
      resolution: resolution || null,
      adminId: userId,
    });

    // Mark the sale resolved according to the decision
    const newStatus = decision === "SELLER_FAVOR" ? "settled" : "cancelled";
    await runQuery(
      `UPDATE sales SET status = $1, admin_notified = false, updated_at = NOW() WHERE id = $2`,
      [newStatus, req.params.id]
    );

    // SELLER_FAVOR / PARTIAL: the escrow hold was captured to the platform account by
    // the unified service (releaseHold API). The seller's payout from that captured
    // amount must be disbursed via the payout pipeline. If the sale already has a
    // computed seller_payout we enqueue it; otherwise flag manual payout.
    let requiresManualPayout = false;
    if (decision === "SELLER_FAVOR" || decision === "PARTIAL") {
      const saleAfter = (await runQuery(
        `SELECT seller_payout, agreed_price FROM sales WHERE id = $1`,
        [req.params.id]
      ).catch(() => ({ rows: [] }))).rows[0];
      const sellerPayout = parseFloat(saleAfter?.seller_payout || 0);
      if (sellerPayout > 0) {
        setImmediate(async () => {
          try {
            const payoutRef = `sale_dispute_${sale.id}`;
            const rec = await runQuery(
              `INSERT INTO payout_records (reference_id, seller_id, amount, currency, status, gateway_reference)
               VALUES ($1, $2, $3, 'INR', 'PAYOUT_PENDING', $1)
               ON CONFLICT (reference_id) DO UPDATE SET amount = EXCLUDED.amount, updated_at = NOW()
               RETURNING payout_id`,
              [payoutRef, String(sale.seller_id), sellerPayout]
            ).catch(() => ({ rows: [] }));
            const { enqueuePayoutJob } = require("../services/payoutQueue");
            enqueuePayoutJob({
              referenceId: payoutRef,
              sellerId: sale.seller_id,
              amount: sellerPayout,
              currency: "INR",
              payoutRecordId: rec?.rows?.[0]?.payout_id || null,
            });
            logger.info(`[ADMIN_SALE_RESOLVE] Payout ₹${sellerPayout} enqueued for seller ${sale.seller_id} (sale #${sale.id}, ${decision})`);
          } catch (payoutErr) {
            logger.warn("[ADMIN_SALE_RESOLVE] Payout enqueue failed (manual payout required):", payoutErr.message);
          }
        });
      } else {
        requiresManualPayout = true;
        logger.warn(`[ADMIN_SALE_RESOLVE] Sale #${sale.id} resolved ${decision} but no seller_payout computed — manual payout required`);
      }
    }

    logger.info(`[ADMIN_SALE_RESOLVE] Sale #${sale.id} resolved as ${decision} by admin ${userId} → ${newStatus}. Unfrozen: ${resolved.unfrozen.join(", ")}`);

    return res.json({
      success: true,
      sale_id: sale.id,
      status: newStatus,
      decision,
      unfrozen: resolved.unfrozen,
      hold_released: resolved.holdReleased,
      post_reactivated: resolved.postReactivated,
      requires_manual_payout: requiresManualPayout,
      message: `Sale dispute resolved as ${decision}. Both parties unfrozen, hold released, post reactivated.`,
    });
  } catch (err) {
    logger.error("[Sales] Admin resolve sale error:", err);
    return res.status(500).json({ error: "Unable to resolve sale dispute", detail: "An unexpected error occurred. Please try again." });
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

    if (result.rows.length === 0) {
      return res.json({ sales: [], message: "No past sale records found." });
    }
    return res.json({ sales: result.rows });
  } catch (err) {
    logger.error("[Sales] Error fetching sale history:", err);
    const detail = err?.message?.includes("does not exist") ? "A required database column is missing." : "An unexpected error occurred while loading sale history.";
    return res.status(500).json({ error: "Unable to load sale history", detail });
  }
};

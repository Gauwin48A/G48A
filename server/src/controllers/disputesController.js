const { runQuery, getAuthUserId } = require("../utils/dbHelpers");
const logger = require("../utils/logger");

/**
 * GET /api/v1/disputes
 * List disputes for the authenticated user
 */
exports.list = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  try {
    const result = await runQuery(
      `SELECT d.*, o.order_number
       FROM disputes d
       LEFT JOIN orders o ON o.order_id = d.order_id
       WHERE d.raised_by::text = $1 OR d.raised_against::text = $1
       ORDER BY d.created_at DESC
       LIMIT 50`,
      [userId]
    );
    res.json({ success: true, disputes: result.rows });
  } catch (err) {
    logger.error("[Disputes] list error:", err);
    res.status(500).json({ error: "Failed to fetch disputes" });
  }
};

/**
 * POST /api/v1/disputes
 * Create a new dispute
 */
exports.create = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  const { order_id, dispute_type, description, raised_against } = req.body;

  if (!order_id || !dispute_type || !description || !raised_against) {
    return res.status(400).json({ error: "order_id, dispute_type, description, and raised_against are required" });
  }

  const validTypes = ["ITEM_NOT_RECEIVED", "ITEM_DAMAGED", "WRONG_ITEM", "QUALITY_ISSUE", "FRAUD", "PAYMENT_ISSUE", "OTHER"];
  if (!validTypes.includes(dispute_type)) {
    return res.status(400).json({ error: `Invalid dispute_type. Valid: ${validTypes.join(", ")}` });
  }

  try {
    const result = await runQuery(
      `INSERT INTO disputes (order_id, raised_by, raised_against, dispute_type, description, status)
       VALUES ($1, $2, $3, $4, $5, 'OPEN')
       RETURNING *`,
      [order_id, userId, raised_against, dispute_type, description]
    );

    // Update order status to DISPUTED
    await runQuery(
      `UPDATE orders SET status = 'DISPUTED', updated_at = NOW() WHERE order_id::text = $1`,
      [order_id]
    );

    // Freeze both party accounts and set razorpay_hold flag.
    // durationHours = 720 (30 days): order disputes are resolved by ADMIN review,
    // NOT by the sales 24h respond window — so the suspension cron must not
    // auto-permanently-lock either party while the dispute is under review.
    const { transitionAccountState } = require("../services/accountStateService");
    await transitionAccountState(userId, "FROZEN_DISPUTE", { reason: `Dispute raised on order ${order_id}`, durationHours: 720 }).catch((e) => logger.warn('[Disputes] Failed to freeze account', { message: e.message }));
    await transitionAccountState(raised_against, "FROZEN_DISPUTE", { reason: `Dispute raised against on order ${order_id}`, durationHours: 720 }).catch((e) => logger.warn('[Disputes] Failed to freeze opposing account', { message: e.message }));

    await runQuery(
      `UPDATE sales SET razorpay_hold = true, updated_at = NOW() WHERE buyer_id::text IN ($1, $2) AND seller_id::text IN ($1, $2) AND status IN ('requested', 'approved', 'received')`,
      [String(userId), String(raised_against)]
    ).catch(() => {});

    // ── Wire razorpay_hold to actual Razorpay API ────────────────
    setImmediate(async () => {
      try {
        const razorpayService = require("../services/razorpayService");

        // Look up the order's payment_id to place actual hold
        const orderRes = await runQuery(
          `SELECT razorpay_payment_id, total_amount FROM orders WHERE order_id::text = $1`,
          [order_id]
        );

        if (orderRes.rows.length > 0 && orderRes.rows[0].razorpay_payment_id) {
          const paymentId = orderRes.rows[0].razorpay_payment_id;
          const amount = parseFloat(orderRes.rows[0].total_amount || 0);

          await razorpayService.holdPayment(paymentId, amount);
        } else {
          logger.warn(`[Disputes] No razorpay_payment_id found for order ${order_id} — DB-level hold only`);
        }
      } catch (holdErr) {
        logger.warn("[Disputes] Razorpay hold error (non-blocking):", holdErr.message);
      }
    });

    res.status(201).json({ success: true, dispute: result.rows[0] });
  } catch (err) {
    logger.error("[Disputes] create error:", err);
    res.status(500).json({ error: "Failed to create dispute" });
  }
};

/**
 * GET /api/v1/disputes/:id
 * Get a single dispute with messages and evidence
 */
exports.getById = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  try {
    const disputeResult = await runQuery(
      `SELECT d.*, o.order_number
       FROM disputes d
       LEFT JOIN orders o ON o.order_id = d.order_id
       WHERE d.dispute_id::text = $1`,
      [req.params.id]
    );

    if (disputeResult.rows.length === 0) {
      return res.status(404).json({ error: "Dispute not found" });
    }

    const dispute = disputeResult.rows[0];
    if (String(dispute.raised_by) !== userId && String(dispute.raised_against) !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Fetch messages and evidence
    const messages = await runQuery(
      `SELECT * FROM dispute_messages WHERE dispute_id::text = $1 ORDER BY created_at ASC`,
      [req.params.id]
    );
    const evidence = await runQuery(
      `SELECT * FROM dispute_evidence WHERE dispute_id::text = $1 ORDER BY created_at DESC`,
      [req.params.id]
    );

    res.json({
      success: true,
      dispute,
      messages: messages.rows,
      evidence: evidence.rows,
    });
  } catch (err) {
    logger.error("[Disputes] getById error:", err);
    res.status(500).json({ error: "Failed to fetch dispute" });
  }
};

/**
 * POST /api/v1/disputes/:id/messages
 * Add a message to a dispute
 */
exports.addMessage = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Message is required" });

  try {
    const dispute = await runQuery(
      `SELECT * FROM disputes WHERE dispute_id::text = $1`,
      [req.params.id]
    );
    if (dispute.rows.length === 0) return res.status(404).json({ error: "Dispute not found" });

    const result = await runQuery(
      `INSERT INTO dispute_messages (dispute_id, sender_id, message) VALUES ($1, $2, $3) RETURNING *`,
      [req.params.id, userId, message]
    );

    res.status(201).json({ success: true, message: result.rows[0] });
  } catch (err) {
    logger.error("[Disputes] addMessage error:", err);
    res.status(500).json({ error: "Failed to add message" });
  }
};

/**
 * POST /api/v1/disputes/:id/evidence
 * Add evidence to a dispute
 */
exports.addEvidence = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  const { evidence_type, object_key, content, description } = req.body;
  if (!evidence_type) return res.status(400).json({ error: "evidence_type is required" });

  try {
    const result = await runQuery(
      `INSERT INTO dispute_evidence (dispute_id, submitted_by, evidence_type, object_key, content, description)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.params.id, userId, evidence_type, object_key || null, content || null, description || null]
    );

    res.status(201).json({ success: true, evidence: result.rows[0] });
  } catch (err) {
    logger.error("[Disputes] addEvidence error:", err);
    res.status(500).json({ error: "Failed to add evidence" });
  }
};

/**
 * GET /api/v1/disputes/admin/pending
 * Admin: list all pending disputes
 */
function isAdminUser(req) {
  const role = String(req.user?.role || req.user?.userRole || "").toLowerCase();
  return role === "admin" || role === "super_admin" || role === "superadmin";
}

exports.adminListPending = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });
  if (!isAdminUser(req)) return res.status(403).json({ error: "Admin access required" });

  try {
    const result = await runQuery(
      `SELECT d.*, o.order_number,
              u1.username as raised_by_name,
              u2.username as raised_against_name
       FROM disputes d
       LEFT JOIN orders o ON o.order_id = d.order_id
       LEFT JOIN users u1 ON u1.user_id::text = d.raised_by::text
       LEFT JOIN users u2 ON u2.user_id::text = d.raised_against::text
       WHERE d.status NOT IN ('CLOSED', 'RESOLVED_SELLER', 'RESOLVED_BUYER')
       ORDER BY d.created_at DESC`
    );
    res.json({ success: true, disputes: result.rows });
  } catch (err) {
    logger.error("[Disputes] adminListPending error:", err);
    res.status(500).json({ error: "Failed to fetch pending disputes" });
  }
};

/**
 * PATCH /api/v1/disputes/:id/resolve
 * Admin: resolve a dispute — with actual Razorpay payout/refund
 */
exports.adminResolve = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });
  if (!isAdminUser(req)) return res.status(403).json({ error: "Admin access required" });

  const { decision, resolution, buyer_refund_amount, seller_payout_amount } = req.body;
  const validDecisions = ["SELLER_FAVOR", "BUYER_FAVOR", "PARTIAL", "DISMISSED"];

  if (!decision || !validDecisions.includes(decision)) {
    return res.status(400).json({ error: `Invalid decision. Valid: ${validDecisions.join(", ")}` });
  }

  try {
    // Fetch dispute with linked order to get payment details
    const disputeWithOrder = await runQuery(
      `SELECT d.*, o.razorpay_payment_id, o.total_amount, o.seller_id, o.buyer_id,
              o.order_number, o.seller_payout
       FROM disputes d
       LEFT JOIN orders o ON o.order_id = d.order_id
       WHERE d.dispute_id::text = $1`,
      [req.params.id]
    );

    if (disputeWithOrder.rows.length === 0) {
      return res.status(404).json({ error: "Dispute not found" });
    }

    const dispute = disputeWithOrder.rows[0];

    // ── Execute actual Razorpay financial operations ────────────────
    const razorpayService = require("../services/razorpayService");
    const payoutResults = [];
    const refundResults = [];

    // If buyer is favored and there's a refund amount, issue a refund
    if ((decision === "BUYER_FAVOR" || decision === "PARTIAL") &&
        buyer_refund_amount > 0 &&
        dispute.razorpay_payment_id) {
      
      const refundResult = await razorpayService.createRefund({
        paymentId: dispute.razorpay_payment_id,
        amount: parseFloat(buyer_refund_amount),
        referenceId: `dispute_refund_${req.params.id}_${Date.now()}`,
        reason: "dispute_resolution",
      });

      refundResults.push(refundResult);

      // Log refund in payment_refunds table
      await runQuery(
        `INSERT INTO payment_refunds (payment_transaction_id, razorpay_payment_id, razorpay_refund_id, amount, reason, status)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          dispute.order_id || null,
          dispute.razorpay_payment_id,
          refundResult.refundId || null,
          buyer_refund_amount,
          `Dispute resolution: ${decision}`,
          refundResult.success ? (refundResult.sandbox ? 'MOCK' : 'PROCESSING') : 'FAILED',
        ]
      ).catch((err) => logger.warn("[Disputes] Refund log insert failed:", err.message));

      // Log in financial_ledger
      await runQuery(
        `INSERT INTO financial_ledger (reference_id, order_id, user_id, event_type, direction, amount, status, provider_reference)
         VALUES ($1, $2, $3, 'REFUND', 'DEBIT', $4, 'COMPLETED', $5)`,
        [
          `dispute_${req.params.id}`,
          String(dispute.order_id || ""),
          dispute.buyer_id,
          buyer_refund_amount,
          refundResult.refundId || "MANUAL",
        ]
      ).catch((err) => logger.warn("[Disputes] Ledger insert failed:", err.message));
    }

    // If seller is favored and there's a payout amount, initiate payout
    if ((decision === "SELLER_FAVOR" || decision === "PARTIAL") &&
        seller_payout_amount > 0) {
      
      // Ensure the seller has a Razorpay contact/fund account
      const contactResult = await razorpayService.ensureContact(dispute.seller_id);
      
      if (contactResult.success && contactResult.fundAccountId) {
        const payoutResult = await razorpayService.createPayout({
          fundAccountId: contactResult.fundAccountId,
          amount: parseFloat(seller_payout_amount),
          referenceId: `dispute_payout_${req.params.id}_${Date.now()}`,
          notes: `Dispute resolution payout for order ${dispute.order_number}`,
        });

        payoutResults.push(payoutResult);

        // Log in financial_ledger
        await runQuery(
          `INSERT INTO financial_ledger (reference_id, order_id, user_id, event_type, direction, amount, status, provider_reference)
           VALUES ($1, $2, $3, 'SELLER_TRANSFER', 'DEBIT', $4, 'COMPLETED', $5)`,
          [
            `dispute_payout_${req.params.id}`,
            String(dispute.order_id || ""),
            dispute.seller_id,
            seller_payout_amount,
            payoutResult.payoutId || "MANUAL",
          ]
        ).catch((err) => logger.warn("[Disputes] Payout ledger insert failed:", err.message));
      } else {
        logger.warn(`[Disputes] Seller ${dispute.seller_id} has no linked Razorpay account — manual payout required`);
        payoutResults.push({ success: false, error: "No linked Razorpay account", requiresManualPayout: true });
      }
    }

    // ── Close the dispute ────────────────────────────────────────────
    const disputeResult = await runQuery(
      `UPDATE disputes SET status = 'CLOSED', resolution = $1, resolved_by = $2, resolved_at = NOW(), updated_at = NOW()
       WHERE dispute_id::text = $3 RETURNING *`,
      [resolution || null, userId, req.params.id]
    );

    // Update order status based on decision
    if (dispute.order_id) {
      let newOrderStatus = "COMPLETED";
      if (decision === "BUYER_FAVOR") newOrderStatus = "REFUNDED";
      else if (decision === "PARTIAL") newOrderStatus = "PARTIALLY_REFUNDED";
      
      await runQuery(
        `UPDATE orders SET status = $1, updated_at = NOW() WHERE order_id::text = $2`,
        [newOrderStatus, dispute.order_id]
      );
    }

    // ── UNIFIED resolution: unfreeze BOTH accounts, release the escrow hold,
    //    reactivate the frozen post, and close sale-scoped suspensions.
    //    Identical outcome to sales-side admin resolve / mutual cancellation.
    const { resolveDisputeForParties } = require("../services/disputeResolutionService");
    const resolved = await resolveDisputeForParties({
      buyerId: dispute.raised_by,
      sellerId: dispute.raised_against,
      orderId: dispute.order_id,
      saleId: dispute.sale_id || null,
      decision,
      resolution: resolution || null,
      adminId: userId,
    });

    // Also clear any sales-level holds between these parties (legacy safety net)
    await runQuery(
      `UPDATE sales SET razorpay_hold = false, updated_at = NOW() WHERE buyer_id::text IN ($1, $2) AND seller_id::text IN ($1, $2)`,
      [String(dispute.raised_by), String(dispute.raised_against)]
    ).catch(() => {});

    // Log resolution
    await runQuery(
      `INSERT INTO dispute_resolutions (dispute_id, decided_by, decision, buyer_refund_amount, seller_payout_amount, notes)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.params.id, userId, decision, buyer_refund_amount || 0, seller_payout_amount || 0, resolution || null]
    );

    // Log admin action
    await runQuery(
      `INSERT INTO admin_audit_logs (admin_id, action, entity_type, entity_id, new_values)
       VALUES ($1, 'DISPUTE_RESOLVED', 'dispute', $2, $3)`,
      [userId, req.params.id, JSON.stringify({ decision, resolution, buyer_refund_amount, seller_payout_amount })]
    );

    logger.info(`[DISPUTE_RESOLVE] Dispute #${req.params.id} resolved as ${decision}. ` +
      `Refund: ₹${buyer_refund_amount || 0}, Payout: ₹${seller_payout_amount || 0}`);

    res.json({
      success: true,
      dispute: disputeResult.rows[0],
      financialActions: {
        refunds: refundResults,
        payouts: payoutResults,
      },
    });
  } catch (err) {
    logger.error("[Disputes] adminResolve error:", err);
    res.status(500).json({ error: "Failed to resolve dispute" });
  }
};

/**
 * paymentGatewayService.js - Live Razorpay & Escrow Payment Gateway Service
 *
 * Handles:
 * 1. Razorpay Payouts to Seller Accounts (via Razorpay Payouts API with
 *    reference_id idempotency — reconcile-before-dispatch prevents double
 *    payouts after network timeouts)
 * 2. Razorpay Payment Refunds (via https://api.razorpay.com/v1/payments/:id/refund)
 * 3. Simulated Sandbox fallback when live API keys are absent or running local tests.
 */

const axios = require("axios");
const logger = require("../utils/logger");
const { runQuery } = require("../utils/dbHelpers");

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

// Gateway HTTP timeout — a hung upstream request must never block the
// money pipeline forever (audit: missing timeouts on gateway calls).
const GATEWAY_HTTP_TIMEOUT_MS = parseInt(process.env.GATEWAY_HTTP_TIMEOUT_MS || "15000", 10);

/**
 * Simulation gate. Simulated/sandbox payouts are acceptable in development,
 * staging and tests, but MUST fail closed in production — a false success on
 * the money path is worse than a clear failure (audit item #30).
 * Override via ALLOW_SIMULATED_PAYOUTS=true/false.
 */
const simulationAllowed = () => {
  const explicit = process.env.ALLOW_SIMULATED_PAYOUTS;
  if (explicit !== undefined) {
    return String(explicit).toLowerCase() === "true";
  }
  // Default: allowed outside production only.
  return process.env.NODE_ENV !== "production";
};

const isRazorpayConfigured = () => {
  const configured = Boolean(
    RAZORPAY_KEY_ID &&
    RAZORPAY_KEY_SECRET &&
    RAZORPAY_KEY_ID !== "rzp_test_placeholder" &&
    RAZORPAY_KEY_SECRET !== "placeholder_secret"
  );
  if (!configured && process.env.NODE_ENV === "production") {
    logger.error("[PaymentGateway] FATAL SECURITY NOTICE: Production mode active but Razorpay live credentials (RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET) are missing!");
  }
  return configured;
};

const getRazorpayAuthHeader = () => {
  const authString = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64");
  return { Authorization: `Basic ${authString}` };
};

/**
 * Execute seller payout / account transfer via Razorpay Route/Transfers API.
 * Falls back to internal ledger simulation if gateway keys are missing.
 */
const executeSellerPayout = async ({ sellerId, amount, currency = "INR", referenceId }) => {
  if (amount <= 0) {
    return { success: false, error: "Payout amount must be greater than zero" };
  }

  try {
    // 1. Fetch seller's payout details from profile
    const profileRes = await runQuery(
      `SELECT payout_upi_id, payout_bank_details, razorpay_fund_account_id, razorpay_contact_id
       FROM profiles WHERE user_id::text = $1`,
      [String(sellerId)]
    );
    const profile = profileRes.rows[0] || {};
    const upiId = profile.payout_upi_id;
    // payout_bank_details can arrive as a JSON string (updateProfile stores
    // JSON.stringify into a text column) or an object (linkPayoutAccount
    // stores ::jsonb). Defensively parse strings so account fields resolve.
    let bankDetails = profile.payout_bank_details || {};
    if (typeof bankDetails === "string" && bankDetails.trim()) {
      try {
        bankDetails = JSON.parse(bankDetails) || {};
      } catch {
        bankDetails = {};
      }
    }

    if (!isRazorpayConfigured()) {
      if (simulationAllowed()) {
        logger.info(`[PaymentGateway] Simulated payout of ₹${amount} (${currency}) to seller ${sellerId} (UPI: ${upiId || "N/A"})`);
        return {
          success: true,
          mode: "SIMULATED",
          transferId: `sim_tr_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          amount,
          currency,
          sellerId,
          upiId,
        };
      }
      logger.error(
        `[PaymentGateway] Payout BLOCKED for seller ${sellerId} (ref ${referenceId}): Razorpay credentials missing and simulation disabled in this environment.`
      );
      return {
        success: false,
        mode: "GATEWAY_ERROR",
        error: "Razorpay credentials not configured and simulated payouts are disabled (ALLOW_SIMULATED_PAYOUTS=false or production mode).",
        amount,
        currency,
        sellerId,
        referenceId,
      };
    }

    // 2. Live mode requires a payout destination — fail closed, don't invent one
    if (!upiId && !bankDetails.account_number) {
      logger.warn(
        `[PaymentGateway] Payout BLOCKED for seller ${sellerId} (ref ${referenceId}): no UPI or bank account linked for payouts.`
      );
      return {
        success: false,
        mode: "PAYOUT_WAITING_FOR_ACCOUNT",
        error: "Seller has no payout destination linked (UPI or bank account). Please add payout details in profile.",
        amount,
        currency,
        sellerId,
        referenceId,
      };
    }

    // 3. LIVE MODE — Razorpay Payouts API with reference_id idempotency.
    //    The Payouts API (POST /v1/payouts) accepts a client-supplied
    //    reference_id that Razorpay enforces as unique. Before dispatching we
    //    reconcile via GET /payouts?reference_id=... — if a prior attempt
    //    already registered the payout (e.g. a network timeout after the
    //    gateway accepted it), we reuse that payout instead of dispatching a
    //    duplicate. This closes the timeout double-dispatch gap.
    const razorpayService = require("./razorpayService");

    // 3a. Ensure the seller has a Razorpay contact (reuses stored contact).
    const contactResult = await razorpayService.ensureContact(sellerId);
    if (!contactResult.success) {
      logger.error(`[PaymentGateway] Payout BLOCKED (ref ${referenceId}): contact setup failed: ${contactResult.error}`);
      return {
        success: false,
        mode: "GATEWAY_ERROR",
        error: `Razorpay contact setup failed: ${contactResult.error}`,
        amount,
        currency,
        sellerId,
        referenceId,
      };
    }

    // 3b. Reuse an existing fund account if the seller linked one; otherwise
    //     create a fund account for their payout destination.
    let fundAccountId = profile.razorpay_fund_account_id || contactResult.fundAccountId || null;
    if (!fundAccountId) {
      // Prefer bank account when present, otherwise fall back to UPI (VPA).
      const isVpa = !bankDetails.account_number && Boolean(upiId);
      const accountDetails = isVpa
        ? { address: upiId } // Razorpay VPA fund-account schema requires { address }
        : {
            account_number: bankDetails.account_number,
            ifsc: bankDetails.ifsc,
            beneficiary_name:
              bankDetails.beneficiary_name || bankDetails.account_name || "Seller",
          };
      const fundResult = await razorpayService.createFundAccount({
        contactId: contactResult.contactId,
        accountType: isVpa ? "vpa" : "bank_account",
        accountDetails,
      });
      if (!fundResult.success) {
        logger.error(`[PaymentGateway] Payout BLOCKED (ref ${referenceId}): fund account setup failed: ${fundResult.error}`);
        return {
          success: false,
          mode: "GATEWAY_ERROR",
          error: `Razorpay fund account setup failed: ${fundResult.error}`,
          amount,
          currency,
          sellerId,
          referenceId,
        };
      }
      fundAccountId = fundResult.fundAccountId;
      // Persist so future payouts reuse this fund account.
      await runQuery(
        `UPDATE profiles SET razorpay_fund_account_id = $1 WHERE user_id::text = $2`,
        [fundAccountId, String(sellerId)]
      ).catch((persistErr) => logger.warn("[PaymentGateway] Could not persist fund_account_id:", persistErr.message));
    }

    // 3c. Reconcile-before-dispatch: if a payout already exists for this
    //     reference (a previous attempt succeeded on the gateway but the
    //     response was lost), reuse it — never dispatch twice.
    const existingPayout = await razorpayService.getPayoutByReferenceId(referenceId);
    if (existingPayout.success && existingPayout.payout) {
      logger.info(
        `[PaymentGateway] Payout ${referenceId} already registered at gateway (${existingPayout.payout.id}) — reusing, no double dispatch.`
      );
      return {
        success: true,
        mode: "RAZORPAY_LIVE",
        transferId: existingPayout.payout.id,
        amount,
        currency,
        sellerId,
        reused: true,
        rawResponse: existingPayout.payout,
      };
    }

    // 3d. Dispatch the payout via the Payouts API with reference_id idempotency.
    const payoutResult = await razorpayService.createPayout({
      fundAccountId,
      amount,
      currency,
      referenceId,
      notes: `Seller payout ${referenceId}`,
    });

    if (!payoutResult.success) {
      // Duplicate-reference rejection: the reference was already used, so the
      // payout must already exist on the gateway — reconcile and reuse it.
      const duplicateRef = /already|exist|duplicate|reference/i.test(payoutResult.error || "");
      if (duplicateRef) {
        const dupLookup = await razorpayService.getPayoutByReferenceId(referenceId);
        if (dupLookup.success && dupLookup.payout) {
          logger.info(
            `[PaymentGateway] Payout ${referenceId} duplicate-reference recovered (${dupLookup.payout.id}) — reusing.`
          );
          return {
            success: true,
            mode: "RAZORPAY_LIVE",
            transferId: dupLookup.payout.id,
            amount,
            currency,
            sellerId,
            reused: true,
            rawResponse: dupLookup.payout,
          };
        }
      }
      logger.error(`[PaymentGateway] Payout BLOCKED (ref ${referenceId}): ${payoutResult.error}`);
      return {
        success: false,
        mode: "GATEWAY_ERROR",
        error: payoutResult.error || "Razorpay payout creation failed",
        amount,
        currency,
        sellerId,
        referenceId,
      };
    }

    logger.info(`[PaymentGateway] Razorpay payout created for seller ${sellerId}: ${payoutResult.payoutId} (ref ${referenceId})`);
    return {
      success: true,
      mode: "RAZORPAY_LIVE",
      transferId: payoutResult.payoutId,
      amount,
      currency,
      sellerId,
      rawResponse: payoutResult.razorpayResponse || null,
    };
  } catch (err) {
    const errorMsg = err.response?.data?.error?.description || err.message;
    logger.error(`[PaymentGateway] Payout execution error for seller ${sellerId}:`, errorMsg);

    // ── GATEWAY_OUTAGE alert (Phase 6, item 54): network/5xx errors mean the
    //    gateway may be unreachable — surface it for ops before silently falling
    //    back to the internal ledger. ──
    try {
      const isNetworkError = !err.response || err.code === "ECONNABORTED" || /timeout|network|socket/i.test(errorMsg);
      if (isNetworkError) {
        const { raiseFinancialAlert } = require("./financialAlertsService");
        raiseFinancialAlert({
          type: "GATEWAY_OUTAGE",
          severity: "HIGH",
          entityType: "PAYOUT",
          entityId: referenceId || String(sellerId),
          userId: String(sellerId),
          message: `Razorpay gateway error during payout dispatch (${errorMsg}). Falling back to internal ledger.`,
          metadata: { reference_id: referenceId, seller_id: sellerId, error: errorMsg },
        });
      }
    } catch (alertErr) {
      logger.warn("[PaymentGateway] Outage alert failed:", alertErr.message);
    }

    // Graceful fallback to internal ledger tracking if API credentials/account route fails.
    // FAIL CLOSED in production: a simulated success would misrepresent that money moved.
    if (simulationAllowed()) {
      return {
        success: true,
        mode: "SIMULATED_FALLBACK",
        transferId: `fallback_tr_${Date.now()}`,
        amount,
        currency,
        sellerId,
        warning: `Gateway transfer error (${errorMsg}); recorded in internal ledger.`,
      };
    }
    return {
      success: false,
      mode: "GATEWAY_ERROR",
      error: errorMsg,
      amount,
      currency,
      sellerId,
      referenceId,
    };
  }
};

/**
 * Execute buyer refund via Razorpay Refunds API.
 * Falls back to internal ledger simulation if gateway keys are missing.
 */
const executeBuyerRefund = async ({ paymentId, amount, currency = "INR", reason = "Dispute resolution refund" }) => {
  if (amount <= 0) {
    return { success: false, error: "Refund amount must be greater than zero" };
  }

  try {
    const simulatedRefund = !isRazorpayConfigured() || !paymentId || paymentId.startsWith("sim_") || paymentId.startsWith("pay_sim");
    if (simulatedRefund) {
      if (simulationAllowed()) {
        logger.info(`[PaymentGateway] Simulated refund of ₹${amount} for payment ${paymentId || "N/A"}`);
        return {
          success: true,
          mode: "SIMULATED",
          refundId: `sim_rfnd_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          amount,
          currency,
          paymentId,
        };
      }
      logger.error(
        `[PaymentGateway] Refund BLOCKED for payment ${paymentId}: gateway unconfigured/simulated and simulation disabled in this environment.`
      );
      return {
        success: false,
        mode: "GATEWAY_ERROR",
        error: "Razorpay not configured for refunds and simulated refunds are disabled (ALLOW_SIMULATED_PAYOUTS=false or production mode).",
        amount,
        currency,
        paymentId,
      };
    }

    const amountInPaise = Math.round(amount * 100);
    const payload = {
      amount: amountInPaise,
      notes: { reason },
    };

    const response = await axios.post(
      `https://api.razorpay.com/v1/payments/${paymentId}/refund`,
      payload,
      { headers: getRazorpayAuthHeader(), timeout: GATEWAY_HTTP_TIMEOUT_MS }
    );

    logger.info(`[PaymentGateway] Razorpay refund succeeded for payment ${paymentId}: ${response.data?.id}`);
    return {
      success: true,
      mode: "RAZORPAY_LIVE",
      refundId: response.data?.id,
      amount,
      currency,
      paymentId,
      rawResponse: response.data,
    };
  } catch (err) {
    const errorMsg = err.response?.data?.error?.description || err.message;
    logger.error(`[PaymentGateway] Refund execution error for payment ${paymentId}:`, errorMsg);

    if (simulationAllowed()) {
      return {
        success: true,
        mode: "SIMULATED_FALLBACK",
        refundId: `fallback_rfnd_${Date.now()}`,
        amount,
        currency,
        paymentId,
        warning: `Gateway refund error (${errorMsg}); recorded in internal ledger.`,
      };
    }
    return {
      success: false,
      mode: "GATEWAY_ERROR",
      error: errorMsg,
      amount,
      currency,
      paymentId,
    };
  }
};

module.exports = {
  isRazorpayConfigured,
  getRazorpayAuthHeader, // required by payoutWorker.js + reconciliationService.js for gateway status checks
  simulationAllowed,
  executeSellerPayout,
  executeBuyerRefund,
};

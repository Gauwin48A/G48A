/**
 * Razorpay Service
 *
 * Provides actual Razorpay API integration for:
 * - Payouts to sellers (via Razorpay Payouts API)
 * - Refunds to buyers (via Razorpay Refunds API)
 * - Payment capture & hold
 * - Linked account management for sellers
 *
 * All functions gracefully degrade to mock/sandbox mode when
 * RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not configured.
 */

const crypto = require("crypto");
const { runQuery } = require("../utils/dbHelpers");
const logger = require("../utils/logger");

const RAZORPAY_API_BASE = process.env.RAZORPAY_API_BASE || "https://api.razorpay.com/v1";

// Gateway HTTP timeout for every Razorpay API call. A hung upstream request
// must never block the payout/refund pipeline forever (audit: missing
// timeouts). Uses AbortController with fetch.
const RAZORPAY_HTTP_TIMEOUT_MS = parseInt(process.env.RAZORPAY_HTTP_TIMEOUT_MS || "15000", 10);

/**
 * Get Razorpay API credentials from environment variables.
 * Returns null if not configured (sandbox mode).
 */
function getCredentials() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  return { keyId, keySecret };
}

/**
 * Make an authenticated request to Razorpay API.
 * @param {string} method - HTTP method
 * @param {string} path - API path (e.g., /payouts)
 * @param {object} [body] - Request body for POST/PATCH
 * @returns {Promise<object>} Response data
 */
async function razorpayRequest(method, path, body = null) {
  const creds = getCredentials();
  if (!creds) {
    throw new Error("Razorpay not configured — set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET");
  }

  const url = `${RAZORPAY_API_BASE}${path}`;
  const basicAuth = Buffer.from(`${creds.keyId}:${creds.keySecret}`).toString("base64");

  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${basicAuth}`,
    },
  };

  if (body && (method === "POST" || method === "PATCH" || method === "PUT")) {
    options.body = JSON.stringify(body);
  }

  // Abort the fetch after the timeout so a dead gateway can never hang the
  // money pipeline. The thrown AbortError is surfaced to callers who map it
  // to a retryable gateway failure.
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), RAZORPAY_HTTP_TIMEOUT_MS);
  options.signal = controller.signal;

  let response;
  try {
    response = await fetch(url, options);
  } catch (fetchErr) {
    clearTimeout(timeoutHandle);
    if (fetchErr && fetchErr.name === "AbortError") {
      const timeoutError = new Error(
        `Razorpay API ${method} ${path} timed out after ${RAZORPAY_HTTP_TIMEOUT_MS}ms`
      );
      timeoutError.code = "ECONNABORTED";
      throw timeoutError;
    }
    throw fetchErr;
  }
  clearTimeout(timeoutHandle);

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "Unknown error");
    logger.error(`[Razorpay] API ${method} ${path} failed: ${response.status} ${errorBody}`);
    throw new Error(`Razorpay API error (${response.status}): ${errorBody}`);
  }

  return response.json();
}

// ────────────────────────────────────────────────────────────
// PAYOUTS (to sellers)
// ────────────────────────────────────────────────────────────

/**
 * Create a Razorpay Payout to a seller's linked bank account/UPI.
 *
 * @param {object} params
 * @param {string} params.fundAccountId - Razorpay fund_account_id for the seller
 * @param {number} params.amount - Amount in INR (e.g., 500.00)
 * @param {string} params.currency - Currency code (default "INR")
 * @param {string} params.referenceId - Unique reference for idempotency
 * @param {string} params.notes - Optional notes
 * @returns {Promise<object>} { success, payoutId, status, ... }
 */
async function createPayout({ fundAccountId, amount, currency = "INR", referenceId, notes = "" }) {
  const creds = getCredentials();
  if (!creds) {
    // Sandbox mode: log and return mock payout
    const mockPayoutId = `payout_mock_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    logger.info(`[Razorpay MOCK] Payout of ₹${amount} to fund_account ${fundAccountId} (ref: ${referenceId}) — mock ID: ${mockPayoutId}`);
    return {
      success: true,
      sandbox: true,
      payoutId: mockPayoutId,
      status: "PROCESSING",
      amount,
      currency,
    };
  }

  try {
    const response = await razorpayRequest("POST", "/payouts", {
      fund_account_id: fundAccountId,
      amount: Math.round(amount * 100), // Razorpay uses paise
      currency,
      mode: "IMPS",
      purpose: "payout",
      queue_if_low_balance: true,
      reference_id: referenceId,
      notes: notes ? { description: notes } : undefined,
    });

    logger.info(`[Razorpay] Payout ${response.id} created for ₹${amount} — status: ${response.status}`);

    return {
      success: true,
      sandbox: false,
      payoutId: response.id,
      status: response.status,
      amount,
      currency,
      razorpayResponse: response,
    };
  } catch (err) {
    logger.error(`[Razorpay] Payout failed for ref ${referenceId}:`, err.message);
    return {
      success: false,
      error: err.message,
      amount,
      referenceId,
    };
  }
}

/**
 * Check the status of a payout.
 * @param {string} payoutId
 * @returns {Promise<object>}
 */
async function getPayoutStatus(payoutId) {
  if (String(payoutId).startsWith("payout_mock_")) {
    return { success: true, sandbox: true, payoutId, status: "COMPLETED" };
  }

  try {
    const response = await razorpayRequest("GET", `/payouts/${payoutId}`);
    return {
      success: true,
      payoutId: response.id,
      status: response.status,
      failure_reason: response.failure_reason || null,
      settled_at: response.settled_at || null,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Look up an existing payout by client reference_id (idempotency key).
 *
 * Razorpay rejects a duplicate reference_id with a 400 rather than returning
 * the existing payout, so BEFORE (re)dispatching a payout we query
 * `GET /payouts?reference_id=...` to detect a payout that was already created
 * by a previous attempt (e.g. a network timeout after the gateway accepted
 * the request). This is what closes the timeout double-dispatch gap.
 *
 * @param {string} referenceId - client-supplied payout reference_id
 * @returns {Promise<object>} { success, payout: <object|null>, payouts: <array> }
 */
async function getPayoutByReferenceId(referenceId) {
  if (!referenceId) {
    return { success: false, error: "referenceId is required" };
  }
  // Mock payouts are only ever created locally — nothing to look up.
  if (String(referenceId).startsWith("payout_mock_")) {
    return { success: true, payout: null, payouts: [] };
  }

  try {
    const response = await razorpayRequest(
      "GET",
      `/payouts?reference_id=${encodeURIComponent(String(referenceId))}`
    );
    const payouts = Array.isArray(response.items) ? response.items : [];
    return { success: true, payout: payouts[0] || null, payouts };
  } catch (err) {
    logger.error(`[Razorpay] Payout lookup by reference ${referenceId} failed:`, err.message);
    return { success: false, error: err.message, payout: null, payouts: [] };
  }
}

// ────────────────────────────────────────────────────────────
// REFUNDS (to buyers)
// ────────────────────────────────────────────────────────────

/**
 * Create a Razorpay Refund for a captured payment.
 *
 * @param {object} params
 * @param {string} params.paymentId - Razorpay payment_id to refund
 * @param {number} params.amount - Amount in INR (full or partial)
 * @param {string} params.referenceId - Unique reference for idempotency
 * @param {string} params.reason - Refund reason (e.g., "dispute_resolution")
 * @returns {Promise<object>} { success, refundId, status, ... }
 */
async function createRefund({ paymentId, amount, referenceId, reason = "dispute_resolution" }) {
  const creds = getCredentials();
  if (!creds) {
    const mockRefundId = `refund_mock_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    logger.info(`[Razorpay MOCK] Refund of ₹${amount} for payment ${paymentId} — mock ID: ${mockRefundId}`);
    return {
      success: true,
      sandbox: true,
      refundId: mockRefundId,
      status: "PROCESSED",
      amount,
    };
  }

  try {
    const response = await razorpayRequest("POST", `/payments/${paymentId}/refund`, {
      amount: Math.round(amount * 100),
      speed: "normal",
      notes: {
        reason,
        reference_id: referenceId,
      },
    });

    logger.info(`[Razorpay] Refund ${response.id} created for ₹${amount} on payment ${paymentId} — status: ${response.status}`);

    return {
      success: true,
      sandbox: false,
      refundId: response.id,
      status: response.status,
      amount,
      paymentId,
      razorpayResponse: response,
    };
  } catch (err) {
    logger.error(`[Razorpay] Refund failed for payment ${paymentId}:`, err.message);
    return {
      success: false,
      error: err.message,
      amount,
      paymentId,
    };
  }
}

/**
 * Check the status of a refund.
 * @param {string} refundId
 * @returns {Promise<object>}
 */
async function getRefundStatus(refundId) {
  if (String(refundId).startsWith("refund_mock_")) {
    return { success: true, sandbox: true, refundId, status: "PROCESSED" };
  }

  try {
    const response = await razorpayRequest("GET", `/refunds/${refundId}`);
    return {
      success: true,
      refundId: response.id,
      status: response.status,
      failure_reason: response.failure_reason || null,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ────────────────────────────────────────────────────────────
// FUND ACCOUNTS (seller onboarding)
// ────────────────────────────────────────────────────────────

/**
 * Create a Razorpay Fund Account for a seller (linked bank account or UPI).
 *
 * @param {object} params
 * @param {string} params.contactId - Razorpay contact_id for the seller
 * @param {string} params.accountType - "bank_account" or "vpa" (UPI)
 * @param {object} params.accountDetails - Account-specific details
 * @returns {Promise<object>}
 */
async function createFundAccount({ contactId, accountType, accountDetails }) {
  const creds = getCredentials();
  if (!creds) {
    const mockFundAccountId = `fa_mock_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    logger.info(`[Razorpay MOCK] Fund account created for contact ${contactId} — mock ID: ${mockFundAccountId}`);
    return {
      success: true,
      sandbox: true,
      fundAccountId: mockFundAccountId,
    };
  }

  try {
    const response = await razorpayRequest("POST", "/fund_accounts", {
      contact_id: contactId,
      account_type: accountType,
      bank_account: accountType === "bank_account" ? accountDetails : undefined,
      vpa: accountType === "vpa" ? accountDetails : undefined,
    });

    logger.info(`[Razorpay] Fund account ${response.id} created for contact ${contactId}`);

    return {
      success: true,
      sandbox: false,
      fundAccountId: response.id,
      active: response.active,
      razorpayResponse: response,
    };
  } catch (err) {
    logger.error(`[Razorpay] Fund account creation failed for contact ${contactId}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Create a Razorpay Contact for a seller (required before fund account).
 *
 * @param {object} params
 * @param {string} params.name - Seller's name
 * @param {string} params.email - Seller's email
 * @param {string} params.phone - Seller's phone
 * @param {string} params.referenceId - User ID as reference
 * @returns {Promise<object>}
 */
async function createContact({ name, email, phone, referenceId }) {
  const creds = getCredentials();
  if (!creds) {
    const mockContactId = `contact_mock_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    logger.info(`[Razorpay MOCK] Contact created for ${name} (${email}) — mock ID: ${mockContactId}`);
    return {
      success: true,
      sandbox: true,
      contactId: mockContactId,
    };
  }

  try {
    const response = await razorpayRequest("POST", "/contacts", {
      name,
      email,
      contact: phone,
      type: "vendor",
      reference_id: referenceId,
      notes: {
        user_id: referenceId,
      },
    });

    logger.info(`[Razorpay] Contact ${response.id} created for ${name}`);

    return {
      success: true,
      sandbox: false,
      contactId: response.id,
      razorpayResponse: response,
    };
  } catch (err) {
    logger.error(`[Razorpay] Contact creation failed for ${email}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Get or create a Razorpay contact for a user based on stored profile data.
 * @param {string} userId
 * @returns {Promise<object>}
 */
async function ensureContact(userId) {
  // Check if user already has a Razorpay contact stored.
  // NOTE: users table may not have phone_number/phone columns in all schemas
  // (user_id is INTEGER in live DBs), so we read optional columns via to_jsonb
  // which is schema-safe — missing keys simply resolve to NULL.
  const userRes = await runQuery(
    `SELECT u.email, u.username,
            COALESCE(p.full_name, u.username) AS full_name,
            COALESCE(NULLIF(p.phone, ''), NULLIF(to_jsonb(u)->>'phone_number', ''), NULLIF(to_jsonb(u)->>'phone', '')) AS phone,
            p.razorpay_contact_id, p.razorpay_fund_account_id
     FROM users u
     LEFT JOIN profiles p ON u.user_id::text = p.user_id::text
     WHERE u.user_id::text = $1`,
    [String(userId)]
  );

  if (userRes.rows.length === 0) {
    return { success: false, error: "User not found" };
  }

  const user = userRes.rows[0];

  // If contact already exists, return it
  if (user.razorpay_contact_id) {
    return {
      success: true,
      contactId: user.razorpay_contact_id,
      fundAccountId: user.razorpay_fund_account_id,
    };
  }

  // Create new contact
  const contactResult = await createContact({
    name: user.full_name || "Seller",
    email: user.email || `user_${userId}@example.com`,
    phone: user.phone || "9999999999",
    referenceId: String(userId),
  });

  if (!contactResult.success) {
    return contactResult;
  }

  // Store contact ID in profiles
  await runQuery(
    `UPDATE profiles SET razorpay_contact_id = $1 WHERE user_id::text = $2`,
    [contactResult.contactId, String(userId)]
  );

  return {
    success: true,
    contactId: contactResult.contactId,
    fundAccountId: user.razorpay_fund_account_id || null,
  };
}

// ────────────────────────────────────────────────────────────
// PAYMENT CAPTURE / HOLD
// ────────────────────────────────────────────────────────────

/**
 * Capture a payment (release hold).
 * @param {string} paymentId - Razorpay payment_id
 * @param {number} amount - Amount to capture in INR
 * @returns {Promise<object>}
 */
async function capturePayment(paymentId, amount) {
  const creds = getCredentials();
  if (!creds) {
    logger.info(`[Razorpay MOCK] Captured payment ${paymentId} for ₹${amount}`);
    return { success: true, sandbox: true, status: "captured" };
  }

  try {
    const response = await razorpayRequest("POST", `/payments/${paymentId}/capture`, {
      amount: Math.round(amount * 100),
      currency: "INR",
    });

    return {
      success: true,
      sandbox: false,
      status: response.status,
      capturedAmount: response.amount / 100,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Place a hold on a payment (only works if order was created with payment_capture=false).
 * For already-captured payments, logs a warning and returns an informational response.
 *
 * @param {string} paymentId - Razorpay payment_id
 * @param {number} amount - Amount to hold in INR (optional, defaults to payment amount)
 * @returns {Promise<object>} { success, held, message, ... }
 */
async function holdPayment(paymentId, amount) {
  const creds = getCredentials();
  if (!creds) {
    logger.info(`[Razorpay MOCK] Hold placed on payment ${paymentId} for ₹${amount || "full"}`);
    return { success: true, sandbox: true, held: true, message: "Mock hold placed" };
  }

  try {
    // Check current payment status first
    const paymentInfo = await razorpayRequest("GET", `/payments/${paymentId}`);

    if (paymentInfo.status === "captured") {
      logger.warn(`[Razorpay] Payment ${paymentId} already captured — cannot retroactively hold. Amount: ₹${paymentInfo.amount / 100}`);
      return {
        success: true,
        held: false,
        status: "already_captured",
        message: "Payment already captured. Hold applies at DB level only — future orders should use payment_capture=false.",
      };
    }

    if (paymentInfo.status === "authorized") {
      // Payment is authorized but not captured — simply don't capture it (equivalent to hold)
      logger.info(`[Razorpay] Hold confirmed on authorized payment ${paymentId} — amount ₹${paymentInfo.amount / 100} remains authorized`);
      return {
        success: true,
        held: true,
        status: "authorized",
        message: "Payment is in authorized state — funds are held. Capture when ready.",
      };
    }

    // For any other status, log and return
    logger.warn(`[Razorpay] Payment ${paymentId} in status '${paymentInfo.status}' — cannot place hold`);
    return {
      success: true,
      held: false,
      status: paymentInfo.status,
      message: `Payment in '${paymentInfo.status}' status. No hold action taken.`,
    };
  } catch (err) {
    logger.error(`[Razorpay] Hold check failed for payment ${paymentId}:`, err.message);
    // Don't fail the dispute creation — DB-level hold still applies
    return {
      success: false,
      held: false,
      error: err.message,
      message: "Could not verify payment status with Razorpay. DB-level hold applied.",
    };
  }
}

/**
 * Release a previously held payment (capture the authorized amount).
 * Convenience alias that logs the release context.
 * @param {string} paymentId - Razorpay payment_id
 * @param {number} amount - Amount to capture in INR
 * @param {string} reason - Reason for releasing the hold
 * @returns {Promise<object>}
 */
async function releaseHold(paymentId, amount, reason = "dispute_resolved") {
  const result = await capturePayment(paymentId, amount);
  if (result.success) {
    logger.info(`[Razorpay] Hold released for payment ${paymentId} — captured ₹${amount}. Reason: ${reason}`);
  }
  return {
    ...result,
    released: result.success,
    reason,
  };
}

/**
 * Create a payment order with payment_capture=false for escrow support.
 * @param {object} params
 * @param {number} params.amount - Amount in INR
 * @param {string} params.currency - Currency (default INR)
 * @param {string} params.receipt - Receipt identifier
 * @param {object} params.notes - Optional notes
 * @returns {Promise<object>} { success, orderId, amount, status }
 */
async function createEscrowOrder({ amount, currency = "INR", receipt, notes = {} }) {
  const creds = getCredentials();
  if (!creds) {
    const mockOrderId = `order_mock_${Date.now()}`;
    logger.info(`[Razorpay MOCK] Escrow order created for ₹${amount} — ${mockOrderId}`);
    return {
      success: true,
      sandbox: true,
      orderId: mockOrderId,
      amount,
      status: "created",
    };
  }

  try {
    const response = await razorpayRequest("POST", "/orders", {
      amount: Math.round(amount * 100),
      currency,
      receipt,
      payment_capture: false, // KEY: Disable auto-capture for escrow
      notes,
    });

    logger.info(`[Razorpay] Escrow order ${response.id} created for ₹${amount} (payment_capture=false)`);

    return {
      success: true,
      sandbox: false,
      orderId: response.id,
      amount,
      status: response.status,
      razorpayResponse: response,
    };
  } catch (err) {
    logger.error(`[Razorpay] Escrow order creation failed:`, err.message);
    return { success: false, error: err.message };
  }
}

// ────────────────────────────────────────────────────────────
// HELPER: verify Razorpay webhook signature
// ────────────────────────────────────────────────────────────

/**
 * Verify a Razorpay webhook signature.
 * @param {string} body - Raw request body as string
 * @param {string} signature - x-razorpay-signature header value
 * @param {string} [secret] - Override default secret
 * @returns {boolean}
 */
function verifyWebhookSignature(body, signature, secret) {
  const webhookSecret = secret || process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret || !signature) return false;

  const expected = crypto
    .createHmac("sha256", webhookSecret)
    .update(body)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "utf8"),
      Buffer.from(signature, "utf8")
    );
  } catch {
    return false;
  }
}

module.exports = {
  createPayout,
  getPayoutStatus,
  getPayoutByReferenceId,
  createRefund,
  getRefundStatus,
  createFundAccount,
  createContact,
  ensureContact,
  capturePayment,
  holdPayment,
  releaseHold,
  createEscrowOrder,
  verifyWebhookSignature,
};

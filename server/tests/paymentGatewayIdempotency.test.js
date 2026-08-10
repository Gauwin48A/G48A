/**
 * paymentGatewayIdempotency.test.js
 *
 * Unit tests for the reference_id idempotency in
 * paymentGatewayService.executeSellerPayout():
 *
 *   1. Reconcile-before-dispatch — if a payout already exists at the gateway
 *      for the reference_id, it is REUSED and createPayout is NOT called
 *      (closes the timeout double-dispatch gap).
 *   2. Duplicate-reference recovery — if createPayout is rejected with a
 *      duplicate-reference error, the existing payout is looked up and reused.
 *   3. Fresh dispatch — when no payout exists for the reference, createPayout
 *      is called once with the reference_id as the idempotency key.
 *   4. Failure handling — non-duplicate createPayout failures surface as
 *      GATEWAY_ERROR; missing destination surfaces as PAYOUT_WAITING_FOR_ACCOUNT;
 *      non-positive amounts are rejected up front.
 *
 * IMPORTANT: RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are captured at module
 * load time, so they must be set BEFORE requiring the module under test.
 */

// ── Env must be set before require (module captures creds at load) ──
process.env.RAZORPAY_KEY_ID = "rzp_test_abc123";
process.env.RAZORPAY_KEY_SECRET = "test_secret_xyz";
process.env.NODE_ENV = "test";

jest.mock("../src/utils/dbHelpers", () => ({
  runQuery: jest.fn(),
}));

// razorpayService is required lazily inside executeSellerPayout — mock it.
jest.mock("../src/services/razorpayService", () => ({
  ensureContact: jest.fn(),
  createFundAccount: jest.fn(),
  createPayout: jest.fn(),
  getPayoutByReferenceId: jest.fn(),
}));

const paymentGateway = require("../src/services/paymentGatewayService");
const { runQuery } = require("../src/utils/dbHelpers");
const razorpayService = require("../src/services/razorpayService");

const PROFILE_WITH_FUND_ACCOUNT = {
  rows: [
    {
      payout_upi_id: "seller@upi",
      payout_bank_details: {
        account_number: "1234567890",
        ifsc: "HDFC0001234",
        beneficiary_name: "Test Seller",
      },
      razorpay_fund_account_id: "fa_test_1",
      razorpay_contact_id: "cont_test_1",
    },
  ],
};

describe("paymentGatewayService.executeSellerPayout idempotency", () => {
  // resetAllMocks (not clearAllMocks) so mock implementations never leak
  // across tests — then re-establish the shared defaults below.
  beforeEach(() => {
    jest.resetAllMocks();
    runQuery.mockResolvedValue(PROFILE_WITH_FUND_ACCOUNT);
    razorpayService.ensureContact.mockResolvedValue({
      success: true,
      contactId: "cont_test_1",
      fundAccountId: "fa_test_1",
    });
  });

  const baseArgs = {
    sellerId: "seller_1",
    amount: 1000,
    currency: "INR",
    referenceId: "order_abc123",
  };

  test("reuses an existing payout for the reference_id and does NOT call createPayout", async () => {
    const existing = { id: "pay_existing_1", status: "processed" };
    razorpayService.getPayoutByReferenceId.mockResolvedValue({
      success: true,
      payout: existing,
      payouts: [existing],
    });

    const result = await paymentGateway.executeSellerPayout(baseArgs);

    expect(result.success).toBe(true);
    expect(result.mode).toBe("RAZORPAY_LIVE");
    expect(result.reused).toBe(true);
    expect(result.transferId).toBe("pay_existing_1");
    expect(result.rawResponse).toBe(existing);
    // The whole point: never dispatch a duplicate.
    expect(razorpayService.createPayout).not.toHaveBeenCalled();
    // It must have reconciled by reference first.
    expect(razorpayService.getPayoutByReferenceId).toHaveBeenCalledWith("order_abc123");
  });

  test("dispatches a fresh payout when no payout exists for the reference", async () => {
    razorpayService.getPayoutByReferenceId.mockResolvedValue({
      success: true,
      payout: null,
      payouts: [],
    });
    razorpayService.createPayout.mockResolvedValue({
      success: true,
      payoutId: "pay_new_1",
      status: "queued",
      razorpayResponse: { id: "pay_new_1" },
    });

    const result = await paymentGateway.executeSellerPayout(baseArgs);

    expect(result.success).toBe(true);
    expect(result.mode).toBe("RAZORPAY_LIVE");
    expect(result.transferId).toBe("pay_new_1");
    expect(result.reused).toBeUndefined();
    // reference_id is passed as the idempotency key.
    expect(razorpayService.createPayout).toHaveBeenCalledTimes(1);
    expect(razorpayService.createPayout).toHaveBeenCalledWith({
      fundAccountId: "fa_test_1",
      amount: 1000,
      currency: "INR",
      referenceId: "order_abc123",
      notes: "Seller payout order_abc123",
    });
  });

  test("recovers a duplicate-reference rejection by reusing the existing payout", async () => {
    const existing = { id: "pay_duplicate_1", status: "processed" };
    // First lookup (reconcile-before-dispatch) finds nothing; then
    // createPayout is rejected as a duplicate; second lookup recovers it.
    razorpayService.getPayoutByReferenceId
      .mockResolvedValueOnce({ success: true, payout: null, payouts: [] })
      .mockResolvedValueOnce({ success: true, payout: existing, payouts: [existing] });
    razorpayService.createPayout.mockResolvedValue({
      success: false,
      error: "Razorpay API error (400): reference_id already exists",
    });

    const result = await paymentGateway.executeSellerPayout(baseArgs);

    expect(result.success).toBe(true);
    expect(result.reused).toBe(true);
    expect(result.transferId).toBe("pay_duplicate_1");
    expect(razorpayService.createPayout).toHaveBeenCalledTimes(1);
    // Both lookups used the same reference key.
    expect(razorpayService.getPayoutByReferenceId).toHaveBeenCalledWith("order_abc123");
    expect(razorpayService.getPayoutByReferenceId).toHaveBeenCalledTimes(2);
  });

  test("surfaces a non-duplicate createPayout failure as GATEWAY_ERROR", async () => {
    razorpayService.getPayoutByReferenceId.mockResolvedValue({
      success: true,
      payout: null,
      payouts: [],
    });
    razorpayService.createPayout.mockResolvedValue({
      success: false,
      error: "Insufficient balance",
    });

    const result = await paymentGateway.executeSellerPayout(baseArgs);

    expect(result.success).toBe(false);
    expect(result.mode).toBe("GATEWAY_ERROR");
    expect(result.error).toBe("Insufficient balance");
    expect(result.reused).toBeUndefined();
  });

  test("returns PAYOUT_WAITING_FOR_ACCOUNT when seller has no linked destination", async () => {
    runQuery.mockResolvedValue({
      rows: [
        {
          payout_upi_id: null,
          payout_bank_details: {},
          razorpay_fund_account_id: null,
          razorpay_contact_id: null,
        },
      ],
    });

    const result = await paymentGateway.executeSellerPayout(baseArgs);

    expect(result.success).toBe(false);
    expect(result.mode).toBe("PAYOUT_WAITING_FOR_ACCOUNT");
    expect(razorpayService.createPayout).not.toHaveBeenCalled();
    expect(razorpayService.ensureContact).not.toHaveBeenCalled();
  });

  test("rejects non-positive amounts up front", async () => {
    const result = await paymentGateway.executeSellerPayout({
      ...baseArgs,
      amount: 0,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Payout amount must be greater than zero");
    expect(runQuery).not.toHaveBeenCalled();
  });

  test("creates and persists a fund account when none is stored, then dispatches", async () => {
    runQuery.mockResolvedValue({
      rows: [
        {
          payout_upi_id: "seller@upi",
          payout_bank_details: {},
          razorpay_fund_account_id: null,
          razorpay_contact_id: "cont_test_1",
        },
      ],
    });
    razorpayService.ensureContact.mockResolvedValue({
      success: true,
      contactId: "cont_test_1",
      fundAccountId: null,
    });
    razorpayService.createFundAccount.mockResolvedValue({
      success: true,
      fundAccountId: "fa_new_1",
    });
    razorpayService.getPayoutByReferenceId.mockResolvedValue({
      success: true,
      payout: null,
      payouts: [],
    });
    razorpayService.createPayout.mockResolvedValue({
      success: true,
      payoutId: "pay_new_2",
      status: "queued",
    });

    const result = await paymentGateway.executeSellerPayout(baseArgs);

    expect(razorpayService.createFundAccount).toHaveBeenCalledWith({
      contactId: "cont_test_1",
      accountType: "vpa",
      accountDetails: { address: "seller@upi" },
    });
    // Persisted so future payouts reuse it.
    expect(runQuery).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE profiles SET razorpay_fund_account_id"),
      ["fa_new_1", "seller_1"]
    );
    expect(result.success).toBe(true);
    expect(result.transferId).toBe("pay_new_2");
    expect(razorpayService.createPayout).toHaveBeenCalledWith(
      expect.objectContaining({ fundAccountId: "fa_new_1", referenceId: "order_abc123" })
    );
  });

  test("prefers bank account over UPI when creating a fund account", async () => {
    runQuery.mockResolvedValue({
      rows: [
        {
          payout_upi_id: "seller@upi",
          payout_bank_details: {
            account_number: "1234567890",
            ifsc: "HDFC0001234",
            beneficiary_name: "Test Seller",
          },
          razorpay_fund_account_id: null,
          razorpay_contact_id: "cont_test_1",
        },
      ],
    });
    // No stored fund account — force the createFundAccount branch.
    razorpayService.ensureContact.mockResolvedValue({
      success: true,
      contactId: "cont_test_1",
      fundAccountId: null,
    });
    razorpayService.createFundAccount.mockResolvedValue({
      success: true,
      fundAccountId: "fa_bank_1",
    });
    razorpayService.getPayoutByReferenceId.mockResolvedValue({
      success: true,
      payout: null,
      payouts: [],
    });
    razorpayService.createPayout.mockResolvedValue({
      success: true,
      payoutId: "pay_new_3",
      status: "queued",
    });

    await paymentGateway.executeSellerPayout(baseArgs);

    expect(razorpayService.createFundAccount).toHaveBeenCalledWith({
      contactId: "cont_test_1",
      accountType: "bank_account",
      accountDetails: {
        account_number: "1234567890",
        ifsc: "HDFC0001234",
        beneficiary_name: "Test Seller",
      },
    });
  });
});

/**
 * Unit tests for the unified dispute resolution service.
 *
 * The whole point of disputeResolutionService is SYMMETRY:
 * whether a dispute is resolved from the sales side (fraud flag / mutual
 * cancellation / admin-resolve) or the order side (adminResolve), the outcome
 * must be identical: BOTH parties unfrozen + hold released + post reactivated.
 */

jest.mock("../src/utils/dbHelpers", () => ({
  runQuery: jest.fn(),
}));
jest.mock("../src/utils/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));
jest.mock("../src/services/accountStateService", () => ({
  transitionAccountState: jest.fn(async () => ({ success: true, state: "ACTIVE" })),
}));

const mockReleaseHold = jest.fn(async () => ({ success: true, released: true }));
jest.mock("../src/services/razorpayService", () => ({
  releaseHold: (...args) => mockReleaseHold(...args),
}));

const { runQuery } = require("../src/utils/dbHelpers");
const { transitionAccountState } = require("../src/services/accountStateService");
const { resolveDisputeForParties } = require("../src/services/disputeResolutionService");

function mockQueryChain(results) {
  // results: array of { rows: [...] } to return in sequence
  runQuery.mockReset();
  results.forEach((r) => runQuery.mockResolvedValueOnce(r));
}

describe("disputeResolutionService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    runQuery.mockResolvedValue({ rows: [] });
  });

  test("unfreezes BOTH buyer and seller via transitionAccountState(ACTIVE)", async () => {
    const buyerId = "buyer-1";
    const sellerId = "seller-1";

    const result = await resolveDisputeForParties({
      buyerId,
      sellerId,
      saleId: 42,
      decision: "SELLER_FAVOR",
      adminId: "admin-1",
    });

    expect(transitionAccountState).toHaveBeenCalledTimes(2);
    expect(transitionAccountState).toHaveBeenCalledWith(
      buyerId,
      "ACTIVE",
      expect.objectContaining({ reason: expect.stringContaining("SELLER_FAVOR") })
    );
    expect(transitionAccountState).toHaveBeenCalledWith(
      sellerId,
      "ACTIVE",
      expect.objectContaining({ reason: expect.stringContaining("SELLER_FAVOR") })
    );
    expect(result.unfrozen).toEqual(expect.arrayContaining([buyerId, sellerId]));
  });

  test("releases sale hold, reactivates post, and closes sale-scoped suspensions", async () => {
    // Sequence of runQuery calls for saleId flow:
    // 1. UPDATE sales razorpay_hold=false
    // 2. SELECT post_id FROM sales
    // 3. SELECT payment from sale_payments
    // 4. UPDATE posts status=active
    // 5. UPDATE suspensions is_active=false
    // 6. INSERT admin_audit_logs
    runQuery
      .mockResolvedValueOnce({ rows: [] })                    // clear sale hold
      .mockResolvedValueOnce({ rows: [{ post_id: "post-9" }] }) // get post_id
      .mockResolvedValueOnce({ rows: [{ razorpay_payment_id: "pay_123", amount: "500" }] }) // payment
      .mockResolvedValueOnce({ rows: [] })                    // reactivate post
      .mockResolvedValueOnce({ rowCount: 2 })                 // close suspensions
      .mockResolvedValueOnce({ rows: [] });                   // audit log

    const result = await resolveDisputeForParties({
      buyerId: "b",
      sellerId: "s",
      saleId: 42,
      decision: "BUYER_FAVOR",
      adminId: "admin-1",
    });

    // Post reactivation query must target the post from the sale
    const reactivateCall = runQuery.mock.calls.find(([sql]) => String(sql).includes("UPDATE posts SET status = 'active'"));
    expect(reactivateCall).toBeTruthy();
    expect(reactivateCall[1][0]).toBe("post-9");

    // Suspensions must be closed
    const suspensionCall = runQuery.mock.calls.find(([sql]) => String(sql).includes("UPDATE suspensions SET is_active = false"));
    expect(suspensionCall).toBeTruthy();
    expect(suspensionCall[1][0]).toBe(42);

    expect(result.postReactivated).toBe(true);
    expect(result.holdReleased).toBe(true);
  });

  test("is null-safe when no saleId is provided (order-only dispute)", async () => {
    runQuery
      .mockResolvedValueOnce({ rows: [] })                    // audit log (no saleId → skip sale flow)
      .mockResolvedValueOnce({ rows: [] });                   // audit log insert

    const result = await resolveDisputeForParties({
      buyerId: "b",
      sellerId: "s",
      orderId: "order-uuid-1",
      decision: "DISMISSED",
      adminId: "admin-1",
    });

    expect(result.unfrozen).toHaveLength(2);
    expect(result.postReactivated).toBe(false);
    // No post update should have been attempted
    const postCall = runQuery.mock.calls.find(([sql]) => String(sql).includes("UPDATE posts"));
    expect(postCall).toBeUndefined();
  });

  test("still unfreezes both parties even if account transitions fail (best-effort)", async () => {
    transitionAccountState
      .mockRejectedValueOnce(new Error("db down"))
      .mockResolvedValueOnce({ success: true, state: "ACTIVE" });

    const result = await resolveDisputeForParties({
      buyerId: "b",
      sellerId: "s",
      saleId: 7,
      decision: "PARTIAL",
    });

    expect(result.unfrozen).toEqual(["s"]);
  });
});

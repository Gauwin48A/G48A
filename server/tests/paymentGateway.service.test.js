const crypto = require("crypto");
const {
  computeRazorpaySignature,
  verifyRazorpaySignature,
} = require("../src/services/paymentGateway");

describe("paymentGateway service", () => {
  test("computes Razorpay signature deterministically", () => {
    const orderId = "order_test_123";
    const paymentId = "pay_test_456";
    const secret = "secret_key";

    const expected = crypto
      .createHmac("sha256", secret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    const actual = computeRazorpaySignature(orderId, paymentId, secret);
    expect(actual).toBe(expected);
  });

  test("verifies Razorpay signature correctly", () => {
    const orderId = "order_test_789";
    const paymentId = "pay_test_101";
    const secret = "another_secret";
    const signature = computeRazorpaySignature(orderId, paymentId, secret);

    expect(
      verifyRazorpaySignature(orderId, paymentId, signature, secret),
    ).toBe(true);
    expect(
      verifyRazorpaySignature(orderId, paymentId, "wrong", secret),
    ).toBe(false);
  });

  test("rejects verification when inputs missing", () => {
    expect(verifyRazorpaySignature("", "pay", "sig", "secret")).toBe(false);
    expect(verifyRazorpaySignature("order", "", "sig", "secret")).toBe(false);
    expect(verifyRazorpaySignature("order", "pay", "", "secret")).toBe(false);
  });
});

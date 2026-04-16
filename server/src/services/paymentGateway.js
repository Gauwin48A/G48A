const crypto = require("crypto");

/**
 * Compute a Razorpay signature for an order/payment pair.
 * @param {string} orderId
 * @param {string} paymentId
 * @param {string} secret
 * @returns {string}
 */
function computeRazorpaySignature(orderId, paymentId, secret) {
  const payload = `${String(orderId || "").trim()}|${String(paymentId || "").trim()}`;
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Verify a Razorpay signature for an order/payment pair.
 * @param {string} orderId
 * @param {string} paymentId
 * @param {string} signature
 * @param {string} secret
 * @returns {boolean}
 */
function verifyRazorpaySignature(orderId, paymentId, signature, secret) {
  if (!orderId || !paymentId || !signature || !secret) return false;
  const expected = computeRazorpaySignature(orderId, paymentId, secret);
  const sig = String(signature).trim();
  if (expected.length !== sig.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(sig, 'utf8'));
  } catch {
    return false;
  }
}

module.exports = {
  computeRazorpaySignature,
  verifyRazorpaySignature,
};

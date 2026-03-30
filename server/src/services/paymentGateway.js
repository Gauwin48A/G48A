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
  return expected === String(signature).trim();
}

module.exports = {
  computeRazorpaySignature,
  verifyRazorpaySignature,
};

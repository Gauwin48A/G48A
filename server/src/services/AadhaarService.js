const kycService = require("./kycService");
const { maskAadhaar, encryptAadhaar } = require("../utils/aadhaarUtils");

async function sendOtp(aadhaar) {
  const result = await kycService.sendAadhaarOtp(aadhaar);
  return {
    txnId: result.txnId,
    masked: result.masked,
    encrypted: encryptAadhaar(aadhaar),
    mock: result.mock || false
  };
}

async function verifyOtp(aadhaar, otp, txnId) {
  return kycService.verifyAadhaarOtp(otp, txnId);
}

const isConfigured = () => kycService.isSignzyConfigured();

module.exports = { sendOtp, verifyOtp, isConfigured };

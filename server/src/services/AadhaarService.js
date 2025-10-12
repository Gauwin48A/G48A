const axios = require('axios');
const crypto = require('crypto');
const { maskAadhaar, encryptAadhaar } = require('../utils/aadhaarUtils');

const KYC_API_BASE = process.env.KYC_API_BASE;
const KYC_API_KEY = process.env.KYC_API_KEY;
const KYC_API_SECRET = process.env.KYC_API_SECRET;

async function sendOtp(aadhaar) {
  // Mask and encrypt Aadhaar for logs/storage
  const masked = maskAadhaar(aadhaar);
  const encrypted = encryptAadhaar(aadhaar);
  // Call KYC provider (example: IDFY)
  const res = await axios.post(`${KYC_API_BASE}/aadhaar/send-otp`, {
    aadhaar_number: aadhaar,
    consent: true,
    consent_text: 'For KYC verification',
  }, {
    headers: {
      'apikey': KYC_API_KEY,
      'x-api-secret': KYC_API_SECRET,
      'Content-Type': 'application/json',
    }
  });
  return { txnId: res.data.txn_id, masked, encrypted };
}

async function verifyOtp(aadhaar, otp, txnId) {
  const res = await axios.post(`${KYC_API_BASE}/aadhaar/verify-otp`, {
    aadhaar_number: aadhaar,
    otp,
    txn_id: txnId,
  }, {
    headers: {
      'apikey': KYC_API_KEY,
      'x-api-secret': KYC_API_SECRET,
      'Content-Type': 'application/json',
    }
  });
  return res.data;
}

module.exports = { sendOtp, verifyOtp };

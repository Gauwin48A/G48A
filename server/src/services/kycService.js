/**
 * Unified KYC Service (Surepass Integration)
 *
 * Implements end-to-end verification workflows for:
 * 1. PAN Verification
 * 2. Aadhaar OTP Verification (Send & Verify)
 * 
 * Includes audit logging to kyc_audit_logs table.
 */

const axios = require("axios");
const crypto = require("crypto");
const logger = require("../utils/logger");
const { runQuery } = require("../utils/dbHelpers");

const SUREPASS_API_URL = process.env.SUREPASS_API_URL || "https://sandbox.surepass.io/api/v1";
const SUREPASS_BEARER_TOKEN = process.env.SUREPASS_BEARER_TOKEN || "";
const KYC_MODE = process.env.KYC_MODE || "development";

const isSurepassConfigured = () => {
  return Boolean(SUREPASS_BEARER_TOKEN.trim());
};

const getHeaders = () => ({
  Authorization: `Bearer ${SUREPASS_BEARER_TOKEN}`,
  "Content-Type": "application/json"
});

/**
 * Log KYC attempt to audit log table
 */
async function logKycAudit(userId, action, responseCode, status, errorMessage = null) {
  try {
    await runQuery(
      `INSERT INTO kyc_audit_logs (user_id, action, provider, provider_response_code, status, error_message)
       VALUES ($1, $2, 'SUREPASS', $3, $4, $5)`,
      [userId, action, responseCode, status, errorMessage]
    );
  } catch (err) {
    logger.error("[KYC Audit Log Error]", err.message);
  }
}

/**
 * Generate HMAC Hash for identifiers (PAN/Aadhaar)
 */
function generateHash(identifier) {
  return crypto.createHash("sha256").update(String(identifier).trim().toUpperCase()).digest("hex");
}

/**
 * Verify PAN Number via Surepass (or Mock fallback)
 */
async function verifyPan(userId, panNumber) {
  const normalizedPan = String(panNumber).trim().toUpperCase();
  const panHash = generateHash(normalizedPan);
  
  // ⚠️ SECURITY: Mock mode ONLY allowed when BOTH conditions are true:
  //   1. KYC_MODE is explicitly NOT "production"
  //   2. NODE_ENV is NOT "production"
  // This prevents mock bypass from EVER running in a production deployment.
  const allowMock = KYC_MODE !== "production" && process.env.NODE_ENV !== "production" && !isSurepassConfigured();
  if (allowMock) {
    logger.warn(`[KYC MOCK] ⚠️ Running PAN verify in MOCK MODE for: ${normalizedPan.substring(0, 4)}****`);
    await logKycAudit(userId, 'VERIFY_PAN', 'MOCK_SUCCESS', 'SUCCESS');
    return { verified: true, name: "Demo Seller Name", panHash, refId: 'mock-pan-ref', mock: true };
  }
  if (!isSurepassConfigured()) {
    logger.error('[KYC] FATAL: Surepass not configured but mock mode disabled. Cannot verify PAN.');
    throw new Error('KYC provider not configured. Contact support.');
  }

  try {
    const url = `${SUREPASS_API_URL.replace(/\/+$/, "")}/corporate/pan`;
    const payload = { id_number: normalizedPan };

    const response = await axios.post(url, payload, { headers: getHeaders() });
    
    if (response.data?.success && response.data?.data?.status === "VALID") {
      await logKycAudit(userId, 'VERIFY_PAN', response.data?.status_code?.toString(), 'SUCCESS');
      return {
        verified: true,
        name: response.data.data.full_name,
        panHash,
        refId: response.data.data.client_id,
        raw: response.data
      };
    }

    await logKycAudit(userId, 'VERIFY_PAN', response.data?.status_code?.toString(), 'FAILED', response.data?.message || 'Verification failed');
    return { verified: false, error: response.data?.message || "PAN verification failed", raw: response.data };
  } catch (error) {
    const status = error.response?.status?.toString() || 'ERROR';
    const message = error.response?.data?.message || error.message;
    await logKycAudit(userId, 'VERIFY_PAN', status, 'FAILED', message);
    logger.error("[KYC SUREPASS PAN ERROR]", message);
    return { verified: false, error: `Surepass PAN API request failed: ${message}` };
  }
}

/**
 * Request Aadhaar OTP via Surepass
 */
async function sendAadhaarOtp(userId, aadhaarNumber) {
  const normalizedAadhaar = String(aadhaarNumber).replace(/\D/g, "");
  const masked = `XXXX-XXXX-${normalizedAadhaar.slice(-4)}`;
  const aadhaarHash = generateHash(normalizedAadhaar);

  if (KYC_MODE !== "production" || !isSurepassConfigured()) {
    const txnId = `mock-txn-${Math.random().toString(36).substr(2, 9)}`;
    logger.info(`[KYC MOCK] Aadhaar OTP sent to: ${masked}, Mock Txn ID: ${txnId}`);
    await logKycAudit(userId, 'AADHAAR_OTP_GENERATE', 'MOCK_SUCCESS', 'SUCCESS');
    return { txnId, masked, aadhaarHash, mock: true };
  }

  try {
    const url = `${SUREPASS_API_URL.replace(/\/+$/, "")}/aadhaar-v2/generate-otp`;
    const payload = { id_number: normalizedAadhaar };

    const response = await axios.post(url, payload, { headers: getHeaders() });

    if (response.data?.success) {
      const txnId = response.data?.data?.client_id;
      await logKycAudit(userId, 'AADHAAR_OTP_GENERATE', response.data?.status_code?.toString(), 'SUCCESS');
      return { txnId, masked, aadhaarHash, raw: response.data };
    }

    await logKycAudit(userId, 'AADHAAR_OTP_GENERATE', response.data?.status_code?.toString(), 'FAILED', response.data?.message);
    throw new Error(response.data?.message || "Failed to generate OTP");
  } catch (error) {
    const status = error.response?.status?.toString() || 'ERROR';
    const message = error.response?.data?.message || error.message;
    await logKycAudit(userId, 'AADHAAR_OTP_GENERATE', status, 'FAILED', message);
    logger.error("[KYC SUREPASS AADHAAR OTP ERROR]", message);
    throw new Error(`Surepass Aadhaar OTP request failed: ${message}`);
  }
}

/**
 * Verify Aadhaar OTP via Surepass
 */
async function verifyAadhaarOtp(userId, otp, txnId) {
  // ⚠️ SECURITY: Mock OTP acceptance ONLY allowed when BOTH conditions are true:
  //   1. KYC_MODE is explicitly NOT "production"
  //   2. NODE_ENV is NOT "production"
  const allowMock = KYC_MODE !== "production" && process.env.NODE_ENV !== "production" && !isSurepassConfigured();
  if (allowMock) {
    logger.warn(`[KYC MOCK] ⚠️ Running Aadhaar OTP verify in MOCK MODE. Txn: ${txnId}`);
    if (otp === "999999" || otp === "123456") {
      await logKycAudit(userId, 'AADHAAR_OTP_SUBMIT', 'MOCK_SUCCESS', 'SUCCESS');
      return { verified: true, name: "Demo User Name", mock: true };
    }
    await logKycAudit(userId, 'AADHAAR_OTP_SUBMIT', 'MOCK_FAIL', 'FAILED', 'Invalid OTP code');
    return { verified: false, error: "Invalid OTP code", mock: true };
  }
  if (!isSurepassConfigured()) {
    logger.error('[KYC] FATAL: Surepass not configured but mock mode disabled. Cannot verify Aadhaar OTP.');
    throw new Error('KYC provider not configured. Contact support.');
  }

  try {
    const url = `${SUREPASS_API_URL.replace(/\/+$/, "")}/aadhaar-v2/submit-otp`;
    const payload = { client_id: txnId, otp: String(otp).trim() };

    const response = await axios.post(url, payload, { headers: getHeaders() });

    if (response.data?.success) {
      await logKycAudit(userId, 'AADHAAR_OTP_SUBMIT', response.data?.status_code?.toString(), 'SUCCESS');
      return { verified: true, name: response.data?.data?.full_name || null, raw: response.data };
    }

    await logKycAudit(userId, 'AADHAAR_OTP_SUBMIT', response.data?.status_code?.toString(), 'FAILED', response.data?.message);
    return { verified: false, error: response.data?.message || "Aadhaar OTP verification failed", raw: response.data };
  } catch (error) {
    const status = error.response?.status?.toString() || 'ERROR';
    const message = error.response?.data?.message || error.message;
    await logKycAudit(userId, 'AADHAAR_OTP_SUBMIT', status, 'FAILED', message);
    logger.error("[KYC SUREPASS AADHAAR VERIFY ERROR]", message);
    return { verified: false, error: `Surepass Aadhaar Verification failed: ${message}` };
  }
}

module.exports = {
  verifyPan,
  sendAadhaarOtp,
  verifyAadhaarOtp,
  isSurepassConfigured
};

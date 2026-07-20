/**
 * Unified KYC Service (Signzy Integration)
 *
 * Implements end-to-end verification workflows for:
 * 1. PAN Verification
 * 2. Aadhaar OTP Verification (Send & Verify)
 * 
 * Supports:
 * - Production Mode: When SIGNZY_API_KEY and SIGNZY_PATRON_ID are configured in .env.
 * - Mock Mode: Fallback simulation for local testing when keys are absent.
 */

const axios = require("axios");
const logger = require("../utils/logger");

const SIGNZY_API_URL = process.env.SIGNZY_API_URL || "https://api.signzy.app/v2";
const SIGNZY_API_KEY = process.env.SIGNZY_API_KEY || "";
const SIGNZY_PATRON_ID = process.env.SIGNZY_PATRON_ID || "";
const KYC_MODE = process.env.KYC_MODE || "development";

const isSignzyConfigured = () => {
  return Boolean(SIGNZY_API_KEY.trim() && SIGNZY_PATRON_ID.trim());
};

/**
 * Verify PAN Number via Signzy (or Mock fallback)
 * @param {string} panNumber - The 10-digit PAN
 * @returns {Promise<{ verified: boolean, name?: string, error?: string, mock?: boolean }>}
 */
async function verifyPan(panNumber) {
  const normalizedPan = String(panNumber).trim().toUpperCase();
  
  if (KYC_MODE !== "production" || !isSignzyConfigured()) {
    logger.info(`[KYC MOCK] PAN verify for: ${normalizedPan}`);
    // Simulated mock check: Auto-approve unless PAN starts with 'F' (simulated failure)
    if (normalizedPan.startsWith("F")) {
      return { verified: false, error: "PAN verification failed: Invalid PAN number", mock: true };
    }
    return { 
      verified: true, 
      name: "Demo Seller Name", 
      mock: true 
    };
  }

  try {
    const url = `${SIGNZY_API_URL.replace(/\/+$/, "")}/patrons/${SIGNZY_PATRON_ID}/panv2`;
    const payload = {
      task: "panv2",
      essentials: {
        number: normalizedPan
      }
    };

    const response = await axios.post(url, payload, {
      headers: {
        Authorization: SIGNZY_API_KEY,
        "Content-Type": "application/json"
      }
    });

    const result = response.data?.result || {};
    const status = String(response.data?.status || "").toLowerCase();

    if (status === "success" || result.verified === true) {
      return {
        verified: true,
        name: result.name || null,
        raw: response.data
      };
    }

    return {
      verified: false,
      error: response.data?.error || "PAN verification failed",
      raw: response.data
    };
  } catch (error) {
    logger.error("[KYC SIGNZY PAN ERROR]", error.message);
    return {
      verified: false,
      error: `Signzy PAN API request failed: ${error.message}`
    };
  }
}

/**
 * Request Aadhaar OTP via Signzy (or Mock fallback)
 * @param {string} aadhaarNumber - The 12-digit Aadhaar
 * @returns {Promise<{ txnId: string, masked: string, mock?: boolean }>}
 */
async function sendAadhaarOtp(aadhaarNumber) {
  const normalizedAadhaar = String(aadhaarNumber).replace(/\D/g, "");
  const masked = `XXXX-XXXX-${normalizedAadhaar.slice(-4)}`;

  if (KYC_MODE !== "production" || !isSignzyConfigured()) {
    const txnId = `mock-txn-${Math.random().toString(36).substr(2, 9)}`;
    logger.info(`[KYC MOCK] Aadhaar OTP sent to: ${masked}, Mock Txn ID: ${txnId}`);
    return {
      txnId,
      masked,
      mock: true
    };
  }

  try {
    const url = `${SIGNZY_API_URL.replace(/\/+$/, "")}/patrons/${SIGNZY_PATRON_ID}/aadhaar`;
    const payload = {
      task: "aadhaarOtpGenerate",
      essentials: {
        aadhaarNumber: normalizedAadhaar
      }
    };

    const response = await axios.post(url, payload, {
      headers: {
        Authorization: SIGNZY_API_KEY,
        "Content-Type": "application/json"
      }
    });

    const txnId = response.data?.result?.requestId || response.data?.requestId;
    if (!txnId) {
      throw new Error(response.data?.error || "Failed to generate OTP request ID");
    }

    return {
      txnId,
      masked,
      raw: response.data
    };
  } catch (error) {
    logger.error("[KYC SIGNZY AADHAAR OTP ERROR]", error.message);
    throw new Error(`Signzy Aadhaar OTP request failed: ${error.message}`);
  }
}

/**
 * Verify Aadhaar OTP via Signzy (or Mock fallback)
 * @param {string} otp - The 6-digit OTP code input by user
 * @param {string} txnId - The transaction ID returned from sendAadhaarOtp
 * @returns {Promise<{ verified: boolean, name?: string, error?: string, mock?: boolean }>}
 */
async function verifyAadhaarOtp(otp, txnId) {
  if (KYC_MODE !== "production" || !isSignzyConfigured()) {
    logger.info(`[KYC MOCK] Aadhaar verify OTP. Code: ${otp}, Txn: ${txnId}`);
    if (otp === "999999" || otp === "123456") {
      return { verified: true, name: "Demo User Name", mock: true };
    }
    return { verified: false, error: "Invalid OTP code", mock: true };
  }

  try {
    const url = `${SIGNZY_API_URL.replace(/\/+$/, "")}/patrons/${SIGNZY_PATRON_ID}/aadhaar`;
    const payload = {
      task: "aadhaarOtpSubmit",
      essentials: {
        otp: String(otp).trim(),
        requestId: txnId
      }
    };

    const response = await axios.post(url, payload, {
      headers: {
        Authorization: SIGNZY_API_KEY,
        "Content-Type": "application/json"
      }
    });

    const result = response.data?.result || {};
    const status = String(response.data?.status || "").toLowerCase();

    if (status === "success" || result.verified === true) {
      return {
        verified: true,
        name: result.name || null,
        raw: response.data
      };
    }

    return {
      verified: false,
      error: response.data?.error || "Aadhaar OTP verification failed",
      raw: response.data
    };
  } catch (error) {
    logger.error("[KYC SIGNZY AADHAAR VERIFY ERROR]", error.message);
    return {
      verified: false,
      error: `Signzy Aadhaar Verification failed: ${error.message}`
    };
  }
}

module.exports = {
  verifyPan,
  sendAadhaarOtp,
  verifyAadhaarOtp,
  isSignzyConfigured
};

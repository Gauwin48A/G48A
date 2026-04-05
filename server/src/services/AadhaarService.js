const axios = require("axios");
const crypto = require("crypto");
const { URL } = require("url");
const redisSession = require("../config/redisSession");
const { maskAadhaar, encryptAadhaar } = require("../utils/aadhaarUtils");

const KYC_API_BASE = process.env.KYC_API_BASE;
const KYC_API_KEY = process.env.KYC_API_KEY;
const KYC_API_SECRET = process.env.KYC_API_SECRET;

const MOCK_OTP_TTL_SECONDS = 10 * 60;

// SSRF protection: only allow HTTPS calls to the configured KYC base
function validateKycUrl(endpoint) {
  const fullUrl = `${KYC_API_BASE}${endpoint}`;
  const parsed = new URL(fullUrl);
  if (parsed.protocol !== "https:") {
    throw new Error("[AadhaarService] KYC_API_BASE must use HTTPS");
  }
  // Block private/internal IPs
  const host = parsed.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.startsWith("10.") ||
    host.startsWith("192.168.") ||
    host.startsWith("172.") ||
    host === "0.0.0.0" ||
    host === "[::1]" ||
    host.endsWith(".internal") ||
    host.endsWith(".local")
  ) {
    throw new Error("[AadhaarService] KYC_API_BASE must not point to internal addresses");
  }
  return fullUrl;
}

const isConfigured = () =>
  Boolean(
    String(KYC_API_BASE || "").trim() &&
      String(KYC_API_KEY || "").trim() &&
      String(KYC_API_SECRET || "").trim(),
  );

const hashSha256 = (value) =>
  crypto.createHash("sha256").update(String(value)).digest("hex");

const generateOtp = () => crypto.randomInt(100000, 1000000).toString();

async function sendOtp(aadhaar) {
  const masked = maskAadhaar(aadhaar);
  const encrypted = encryptAadhaar(aadhaar);

  if (!isConfigured()) {
    const txnId = crypto.randomUUID();
    const otp = generateOtp();
    await redisSession.set(
      `AADHAAR_MOCK_OTP:${txnId}`,
      { otpHash: hashSha256(otp), aadhaar },
      MOCK_OTP_TTL_SECONDS,
    );

    if (process.env.NODE_ENV !== "production") {
      console.log("\n[MOCK AADHAAR OTP] ========================================");
      console.log(`[MOCK AADHAAR OTP] Aadhaar : ${masked}`);
      console.log(`[MOCK AADHAAR OTP] OTP     : ${otp}`);
      console.log(`[MOCK AADHAAR OTP] TXN     : ${txnId}`);
      console.log(
        `[MOCK AADHAAR OTP] Expires : ${MOCK_OTP_TTL_SECONDS} seconds`,
      );
      console.log("[MOCK AADHAAR OTP] ========================================\n");
    }

    return { txnId, masked, encrypted, mock: true };
  }

  const url = validateKycUrl("/aadhaar/send-otp");
  const res = await axios.post(
    url,
    {
      aadhaar_number: aadhaar,
      consent: true,
      consent_text: "For KYC verification",
    },
    {
      headers: {
        apikey: KYC_API_KEY,
        "x-api-secret": KYC_API_SECRET,
        "Content-Type": "application/json",
      },
    },
  );

  return { txnId: res.data.txn_id, masked, encrypted };
}

async function verifyOtp(aadhaar, otp, txnId) {
  if (!isConfigured()) {
    const stored = await redisSession.get(`AADHAAR_MOCK_OTP:${txnId}`);
    if (!stored || stored.aadhaar !== aadhaar) {
      return { verified: false, error: "Invalid or expired OTP" };
    }
    const incomingHash = hashSha256(otp);
    if (incomingHash !== stored.otpHash) {
      return { verified: false, error: "Invalid or expired OTP" };
    }
    await redisSession.del(`AADHAAR_MOCK_OTP:${txnId}`);
    return { verified: true, mock: true };
  }

  const url = validateKycUrl("/aadhaar/verify-otp");
  const res = await axios.post(
    url,
    {
      aadhaar_number: aadhaar,
      otp,
      txn_id: txnId,
    },
    {
      headers: {
        apikey: KYC_API_KEY,
        "x-api-secret": KYC_API_SECRET,
        "Content-Type": "application/json",
      },
    },
  );

  return res.data;
}

module.exports = { sendOtp, verifyOtp, isConfigured };

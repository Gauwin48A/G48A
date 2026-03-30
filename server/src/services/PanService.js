const axios = require("axios");

const BASE_URL =
  process.env.KYC_PAN_API_BASE ||
  process.env.KYC_API_BASE ||
  "";
const API_KEY = process.env.KYC_PAN_API_KEY || process.env.KYC_API_KEY || "";
const API_SECRET =
  process.env.KYC_PAN_API_SECRET || process.env.KYC_API_SECRET || "";
const VERIFY_PATH = process.env.KYC_PAN_VERIFY_PATH || "/pan/verify";

const normalizePan = (value) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");

const isValidPan = (value) => /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(normalizePan(value));

const maskPan = (value) => {
  const normalized = normalizePan(value);
  if (!normalized) return null;
  return `XXXXX${normalized.slice(-4)}`;
};

const isConfigured = () =>
  Boolean(String(BASE_URL).trim() && String(API_KEY).trim() && String(API_SECRET).trim());

const buildVerifyUrl = () => {
  const trimmedBase = String(BASE_URL || "").trim().replace(/\/+$/, "");
  const path = String(VERIFY_PATH || "").trim();
  if (!trimmedBase) return "";
  if (!path) return trimmedBase;
  return path.startsWith("/") ? `${trimmedBase}${path}` : `${trimmedBase}/${path}`;
};

const resolveVerifiedFlag = (payload = {}) => {
  if (payload.verified === true || payload.success === true) return true;
  const status = String(payload.status || payload.verification_status || "").toLowerCase();
  if (["success", "verified", "valid", "approved"].includes(status)) return true;
  return false;
};

async function verifyPan(panNumber, options = {}) {
  const normalizedPan = normalizePan(panNumber);
  if (!isValidPan(normalizedPan)) {
    return { verified: false, error: "Invalid PAN number", normalizedPan };
  }

  if (!isConfigured()) {
    return { verified: true, mock: true, normalizedPan };
  }

  const url = buildVerifyUrl();
  const payload = {
    pan_number: normalizedPan,
    consent: true,
    consent_text: "For KYC verification",
  };

  if (options?.fullName) payload.name = String(options.fullName).trim();
  if (options?.dob) payload.dob = String(options.dob).trim();

  const response = await axios.post(url, payload, {
    headers: {
      apikey: API_KEY,
      "x-api-secret": API_SECRET,
      "Content-Type": "application/json",
    },
  });

  const data = response?.data || {};
  return {
    verified: resolveVerifiedFlag(data),
    normalizedPan,
    raw: data,
  };
}

module.exports = {
  verifyPan,
  normalizePan,
  isValidPan,
  maskPan,
  isConfigured,
};

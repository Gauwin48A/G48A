

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

const kycService = require("./kycService");

const isConfigured = () => kycService.isSignzyConfigured();

async function verifyPan(panNumber, options = {}) {
  const normalizedPan = normalizePan(panNumber);
  if (!isValidPan(normalizedPan)) {
    return { verified: false, error: "Invalid PAN number", normalizedPan };
  }
  return kycService.verifyPan(normalizedPan);
}

module.exports = {
  verifyPan,
  normalizePan,
  isValidPan,
  maskPan,
  isConfigured,
};

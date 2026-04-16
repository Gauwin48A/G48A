const crypto = require("crypto");

function parseBoolean(rawValue, fallback = false) {
  if (rawValue === undefined || rawValue === null || rawValue === "") {
    return fallback;
  }
  const normalized = String(rawValue).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

function parsePositiveInteger(rawValue, fallback) {
  const parsed = Number.parseInt(String(rawValue), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function normalizeHeaderValue(rawValue) {
  if (rawValue === undefined || rawValue === null) return "";
  if (Array.isArray(rawValue)) return String(rawValue[0] || "").trim();
  return String(rawValue).trim();
}

function resolveDeviceId(req) {
  const headerValue = normalizeHeaderValue(req.headers["x-device-id"]);
  if (headerValue) return headerValue;
  const body = req.body || {};
  const bodyValue = body.deviceId || body.device_id;
  return normalizeHeaderValue(bodyValue);
}

function buildAttestationSignature(deviceId, timestampMs, secret) {
  return crypto
    .createHmac("sha256", secret)
    .update(`${deviceId}.${timestampMs}`)
    .digest("hex");
}

function timingSafeHexEquals(expectedHex, providedHex) {
  if (!/^[a-f0-9]{64}$/i.test(expectedHex) || !/^[a-f0-9]{64}$/i.test(providedHex)) {
    return false;
  }
  const expected = Buffer.from(expectedHex, "hex");
  const provided = Buffer.from(providedHex, "hex");
  if (expected.length !== provided.length) return false;
  return crypto.timingSafeEqual(expected, provided);
}

function verifyDeviceAttestation(req, res, next) {
  const attestationRequired = parseBoolean(process.env.DEVICE_ATTESTATION_REQUIRED, false);
  const maxSkewSeconds = parsePositiveInteger(process.env.DEVICE_ATTESTATION_MAX_SKEW_SECONDS || "300", 300);
  const deviceId = resolveDeviceId(req);

  req.deviceIdentity = {
    deviceId: deviceId || null,
    verified: false,
    attestationRequired,
  };

  if (!attestationRequired) {
    return next();
  }

  if (!deviceId) {
    return res.status(400).json({
      error: "Missing device id.",
      message: "Provide x-device-id header or deviceId in payload.",
    });
  }

  const sharedSecret = String(process.env.DEVICE_ATTESTATION_SECRET || "").trim();
  if (!sharedSecret) {
    return res.status(500).json({
      error: "Device attestation secret is not configured.",
    });
  }

  const timestampRaw = normalizeHeaderValue(req.headers["x-device-timestamp"]);
  const signatureRaw = normalizeHeaderValue(req.headers["x-device-signature"]);
  if (!timestampRaw || !signatureRaw) {
    return res.status(401).json({
      error: "Missing device attestation headers.",
      message: "Provide x-device-timestamp and x-device-signature headers.",
    });
  }

  const timestampMs = Number.parseInt(timestampRaw, 10);
  if (!Number.isInteger(timestampMs) || timestampMs <= 0) {
    return res.status(401).json({
      error: "Invalid attestation timestamp.",
    });
  }

  const skewMs = Math.abs(Date.now() - timestampMs);
  if (skewMs > maxSkewSeconds * 1000) {
    return res.status(401).json({
      error: "Attestation timestamp outside allowed skew.",
    });
  }

  const expectedSignature = buildAttestationSignature(deviceId, timestampMs, sharedSecret);
  if (!timingSafeHexEquals(expectedSignature, signatureRaw)) {
    return res.status(401).json({
      error: "Invalid device attestation signature.",
    });
  }

  req.deviceIdentity = {
    deviceId,
    verified: true,
    attestationRequired,
    timestampMs,
  };
  return next();
}

function requireIdempotencyKey(req, res, next) {
  const idempotencyKey = normalizeHeaderValue(req.headers["x-idempotency-key"]);
  if (!idempotencyKey) {
    return res.status(400).json({
      error: "Missing idempotency key.",
      message: "Provide x-idempotency-key header.",
    });
  }
  req.idempotencyKey = idempotencyKey;
  return next();
}

module.exports = {
  verifyDeviceAttestation,
  requireIdempotencyKey,
  resolveDeviceId,
  buildAttestationSignature,
  parseBoolean,
  parsePositiveInteger,
};

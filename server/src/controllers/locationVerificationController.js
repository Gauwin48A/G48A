const crypto = require("crypto");
const {
  verifyLocationPayload,
  verifySignature,
  LocationVerificationError,
  CONFIG,
} = require("../services/locationVerificationService");

const resolveUserId = (req) => {
  return (
    req.user?.userId ||
    req.user?.id ||
    req.user?.user_id ||
    req.user?.sub ||
    null
  );
};

exports.verifyLocation = async (req, res) => {
  const requestId = req.correlationId || crypto.randomUUID();
  try {
    const payload = req.body || {};
    const signature =
      req.headers["x-location-signature"] || payload.signature || null;

    if (CONFIG.requireSignature) {
      // S-06: Dual-key HMAC verification for zero-downtime key rotation.
      // Try current secret first; if it fails, try previous secret (if configured).
      // This allows LOCATION_HMAC_SECRET to be rotated without invalidating
      // in-flight requests signed with the previous key.
      const previousSecret = process.env.LOCATION_HMAC_SECRET_PREVIOUS || "";
      const verifiedWithCurrent = await verifySignature(payload, signature, CONFIG.signatureSecret);
      const verifiedWithPrevious =
        !verifiedWithCurrent &&
        Boolean(previousSecret) &&
        (await verifySignature(payload, signature, previousSecret));

      if (!verifiedWithCurrent && !verifiedWithPrevious) {
        return res.status(401).json({
          error: "Invalid signature",
          code: "SIGNATURE_INVALID",
          request_id: requestId,
        });
      }
    }

    const userId = resolveUserId(req);
    const result = await verifyLocationPayload({ payload, req, userId });

    return res.json({
      ...result,
      request_id: requestId,
      processed_at: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof LocationVerificationError) {
      return res.status(error.status || 400).json({
        error: "Location verification failed",
        code: error.code || "LOCATION_VERIFICATION_FAILED",
        request_id: requestId,
      });
    }

    return res.status(500).json({
      error: "Internal Server Error",
      code: "LOCATION_VERIFICATION_ERROR",
      request_id: requestId,
    });
  }
};

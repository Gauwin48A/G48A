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

    if (
      CONFIG.requireSignature &&
      !verifySignature(payload, signature, CONFIG.signatureSecret)
    ) {
      return res.status(401).json({
        error: "Invalid signature",
        code: "SIGNATURE_INVALID",
        request_id: requestId,
      });
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
        error: error.message,
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

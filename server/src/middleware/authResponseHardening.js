const DEFAULT_MIN_DELAY_MS = Number.parseInt(
  process.env.AUTH_RESPONSE_MIN_DELAY_MS || "550",
  10,
);

function parseAuthFailureCode(body, statusCode) {
  const rawCode = String(body?.code || body?.errorCode || "").trim();
  if (rawCode) {
    return rawCode;
  }
  if (statusCode === 429) {
    return "RATE_LIMITED";
  }
  if (statusCode === 403) {
    return "AUTH_DENIED";
  }
  return "AUTH_FAILED";
}

function isLockOrRateMessage(body = {}) {
  const text = String(body?.error || body?.message || "").toLowerCase();
  return (
    text.includes("locked") ||
    text.includes("too many") ||
    text.includes("rate")
  );
}

function normalizeAuthFailureBody(body, statusCode) {
  const code = parseAuthFailureCode(body, statusCode);
  const lockOrRate = isLockOrRateMessage(body);

  if (lockOrRate) {
    return {
      error: "Authentication temporarily unavailable",
      code,
      message:
        statusCode === 429
          ? "Too many attempts. Please retry later."
          : "Authentication temporarily blocked. Please retry later.",
    };
  }

  return {
    error: "Authentication failed",
    code,
    message: "Invalid credentials or verification data.",
  };
}

function withMinimumDelay(startedAtMs, minDelayMs, fn) {
  const elapsed = Date.now() - startedAtMs;
  const remaining = Math.max(0, minDelayMs - elapsed);
  if (!remaining) {
    fn();
    return;
  }
  setTimeout(fn, remaining);
}

function hardenAuthResponse({ minDelayMs = DEFAULT_MIN_DELAY_MS } = {}) {
  return (req, res, next) => {
    const startedAtMs = Date.now();
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);
    let isApplyingNormalization = false;

    const sendNormalized = (body) => {
      const statusCode = Number(res.statusCode || 200);
      const isAuthFailureStatus = statusCode === 401 || statusCode === 403 || statusCode === 429;
      const isAuthChallenge = statusCode === 202;
      const challengeCode = String(body?.code || "").trim().toUpperCase();
      const isExplicitChallenge =
        Boolean(body?.requireOtp) ||
        String(body?.challengeType || "").toLowerCase() === "otp" ||
        challengeCode === "RISK_CHALLENGE_REQUIRED" ||
        challengeCode === "TWO_FACTOR_REQUIRED" ||
        challengeCode === "TWO_FACTOR_INVALID";

      if (!isAuthFailureStatus && !isAuthChallenge) {
        return null;
      }

      if (isAuthChallenge || isExplicitChallenge) {
        return null;
      }

      const payload = normalizeAuthFailureBody(body, statusCode);
      withMinimumDelay(startedAtMs, minDelayMs, () => {
        isApplyingNormalization = true;
        try {
          originalJson(payload);
        } finally {
          isApplyingNormalization = false;
        }
      });
      return payload;
    };

    res.json = (body) => {
      if (isApplyingNormalization) {
        return originalJson(body);
      }
      const normalized = sendNormalized(body);
      if (normalized !== null) {
        return res;
      }
      return originalJson(body);
    };

    res.send = (body) => {
      if (isApplyingNormalization) {
        return originalSend(body);
      }
      let parsedBody = body;
      if (typeof body === "string") {
        try {
          parsedBody = JSON.parse(body);
        } catch {
          parsedBody = { message: body };
        }
      }

      const normalized = sendNormalized(parsedBody);
      if (normalized !== null) {
        return res;
      }
      return originalSend(body);
    };

    return next();
  };
}

module.exports = {
  hardenAuthResponse,
};

const AUTH_MESSAGE_FALLBACK = "Authentication failed. Please try again.";
const RAW_MESSAGE_BLOCKLIST = [
  "jwt",
  "token",
  "stack",
  "trace",
  "exception",
  "sql",
  "postgres",
  "redis",
  "secret",
  "password",
  "cookie",
];

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeLowerText(value) {
  return normalizeText(value).toLowerCase();
}

function parseAuthErrorShape(error) {
  const response = error?.response || {};
  const data = error?.data || response?.data || {};
  const status = error?.status ?? response?.status ?? null;
  const code = normalizeText(data?.code || data?.errorCode).toUpperCase();
  const message =
    normalizeText(data?.message) ||
    normalizeText(data?.error) ||
    normalizeText(error?.message);

  return {
    status,
    code,
    data,
    message,
    lowerMessage: normalizeLowerText(message),
  };
}

function isUnsafeRawMessage(message) {
  const normalized = normalizeLowerText(message);
  if (!normalized) return true;
  if (normalized.length > 220) return true;
  return RAW_MESSAGE_BLOCKLIST.some((keyword) => normalized.includes(keyword));
}

function isNetworkError(shape) {
  if (!shape.status) {
    return true;
  }
  return (
    shape.lowerMessage.includes("network") ||
    shape.lowerMessage.includes("timeout") ||
    shape.lowerMessage.includes("failed to fetch")
  );
}

function buildMappedError({
  status = null,
  code = "",
  category = "unknown",
  message = AUTH_MESSAGE_FALLBACK,
  retryable = false,
  requiresOtp = false,
  requiresReauth = false,
} = {}) {
  return {
    status,
    code,
    category,
    message,
    retryable,
    requiresOtp,
    requiresReauth,
  };
}

function isOtpChallenge(shape) {
  if (shape.status === 202 && shape.data?.requireOtp) {
    return true;
  }
  if (shape.data?.requireOtp) {
    return true;
  }
  if (normalizeLowerText(shape.data?.challengeType) === "otp") {
    return true;
  }
  return ["RISK_CHALLENGE_REQUIRED", "TWO_FACTOR_REQUIRED"].includes(shape.code);
}

export function mapAuthError(error, options = {}) {
  const {
    defaultMessage = AUTH_MESSAGE_FALLBACK,
    allowUnsafeMessage = false,
  } = options;
  const shape = parseAuthErrorShape(error);

  if (isOtpChallenge(shape)) {
    return buildMappedError({
      status: shape.status,
      code: shape.code || "OTP_CHALLENGE_REQUIRED",
      category: "challenge",
      message: "Additional verification is required to continue.",
      retryable: true,
      requiresOtp: true,
    });
  }
  if (shape.code === "RISK_CHALLENGE_UNAVAILABLE") {
    return buildMappedError({
      status: shape.status,
      code: shape.code,
      category: "challenge_unavailable",
      message:
        shape.message ||
        "Additional verification is required, but two-factor authentication is not enabled.",
      retryable: true,
    });
  }

  if (
    shape.status === 429 ||
    shape.lowerMessage.includes("too many") ||
    shape.lowerMessage.includes("rate limit")
  ) {
    return buildMappedError({
      status: shape.status,
      code: shape.code || "RATE_LIMITED",
      category: "rate_limit",
      message: "Too many attempts. Please wait a few minutes and try again.",
      retryable: true,
    });
  }

  if (
    shape.status === 423 ||
    shape.lowerMessage.includes("locked") ||
    shape.code === "ACCOUNT_LOCKED"
  ) {
    return buildMappedError({
      status: shape.status,
      code: shape.code || "ACCOUNT_LOCKED",
      category: "locked",
      message: "Your account is temporarily locked. Reset password or try again later.",
      retryable: true,
    });
  }

  if (shape.status === 401 || shape.status === 403) {
    const reauthCodes = ["INVALID_TOKEN", "AUTH_DENIED", "SESSION_REVOKED", "PASSWORD_CHANGED"];
    return buildMappedError({
      status: shape.status,
      code: shape.code || "AUTH_FAILED",
      category: "unauthorized",
      message: "Sign-in failed. Please check your credentials and retry.",
      retryable: true,
      requiresReauth:
        reauthCodes.includes(shape.code) ||
        shape.lowerMessage.includes("session") ||
        shape.lowerMessage.includes("expired"),
    });
  }

  if (isNetworkError(shape)) {
    return buildMappedError({
      status: shape.status,
      code: shape.code || "NETWORK_ERROR",
      category: "network",
      message: "Unable to reach authentication service. Check network and retry.",
      retryable: true,
    });
  }

  if (shape.status >= 500) {
    return buildMappedError({
      status: shape.status,
      code: shape.code || "SERVER_ERROR",
      category: "server",
      message: "Authentication service is temporarily unavailable. Please try again shortly.",
      retryable: true,
    });
  }

  if (shape.message && (allowUnsafeMessage || !isUnsafeRawMessage(shape.message))) {
    return buildMappedError({
      status: shape.status,
      code: shape.code || "AUTH_FAILED",
      category: "unknown",
      message: shape.message,
      retryable: true,
    });
  }

  return buildMappedError({
    status: shape.status,
    code: shape.code || "AUTH_FAILED",
    category: "unknown",
    message: defaultMessage || AUTH_MESSAGE_FALLBACK,
    retryable: true,
  });
}

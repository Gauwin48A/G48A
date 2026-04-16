const DEFAULT_MESSAGES = {
  forgot: {
    key: "failed_send_link",
    fallback: "Failed to send reset link",
  },
  reset: {
    key: "failed_reset_password",
    fallback: "Failed to reset password",
  },
};

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeLowerText(value) {
  return normalizeText(value).toLowerCase();
}

function resolveTranslator(t) {
  if (typeof t === "function") {
    return (key, fallback) => t(key, { defaultValue: fallback });
  }
  return (_key, fallback) => fallback;
}

export function mapPasswordResetError({
  status = null,
  message = "",
  t,
  context = "forgot",
  defaultMessage,
} = {}) {
  const tr = resolveTranslator(t);
  const normalized = normalizeLowerText(message);
  const bucket = context === "reset" ? "reset" : "forgot";
  const defaults = DEFAULT_MESSAGES[bucket] || DEFAULT_MESSAGES.forgot;
  const fallbackMessage = defaultMessage || tr(defaults.key, defaults.fallback);

  if (
    status === 429 ||
    normalized.includes("too many") ||
    normalized.includes("rate limit")
  ) {
    return tr(
      "reset_rate_limited",
      "Too many reset attempts. Please wait a few minutes before retrying.",
    );
  }

  if (
    normalized.includes("network") ||
    normalized.includes("fetch") ||
    normalized.includes("timeout")
  ) {
    return tr(
      "reset_network_unreachable",
      "Reset service is temporarily unreachable. Please retry shortly.",
    );
  }

  if (status >= 500 || normalized.includes("server")) {
    return tr(
      "reset_service_unavailable",
      "Reset service is temporarily unavailable. Please retry in a few minutes.",
    );
  }

  if (
    bucket === "forgot" &&
    (normalized.includes("invalid") || normalized.includes("required"))
  ) {
    return tr(
      "reset_invalid_identifier",
      "Please enter a valid email, phone number, or username.",
    );
  }

  if (bucket === "reset") {
    if (
      status === 400 &&
      (normalized.includes("invalid") ||
        normalized.includes("expired") ||
        normalized.includes("token"))
    ) {
      return tr(
        "invalid_reset_link",
        "This reset link is invalid or expired. Request a new one from Forgot Password.",
      );
    }
    if (normalized.includes("weak") || normalized.includes("password")) {
      return tr(
        "weak_password",
        "Password does not meet security requirements. Review the checklist below.",
      );
    }
  }

  return normalizeText(message) || fallbackMessage;
}

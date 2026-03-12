const MAX_AUTH_DIAG_EVENTS = 120;
const FORCE_AUTH_DIAGNOSTICS =
  String(import.meta.env.VITE_AUTH_DIAGNOSTICS || "").toLowerCase() === "true";
const AUTH_DIAGNOSTICS_ENABLED = Boolean(import.meta.env.DEV || FORCE_AUTH_DIAGNOSTICS);
const REDACTED_VALUE = "[REDACTED]";
const SENSITIVE_KEY_PATTERN =
  /(token|password|cookie|authorization|secret|otp|passcode|refresh|xsrf|csrf)/i;
const authDiagEvents = [];

function sanitizeValue(value, depth = 0) {
  if (depth > 3) {
    return "[TRUNCATED]";
  }
  if (value === null || value === undefined) {
    return value;
  }
  if (typeof value === "string") {
    if (value.length > 240) {
      return `${value.slice(0, 237)}...`;
    }
    return value;
  }
  if (typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.slice(0, 15).map((item) => sanitizeValue(item, depth + 1));
  }
  const output = {};
  for (const [key, nested] of Object.entries(value)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      output[key] = REDACTED_VALUE;
      continue;
    }
    output[key] = sanitizeValue(nested, depth + 1);
  }
  return output;
}

function attachDebugHandle() {
  if (!AUTH_DIAGNOSTICS_ENABLED || typeof window === "undefined") {
    return;
  }
  if (window.__MHUB_AUTH_DIAG__) {
    return;
  }
  window.__MHUB_AUTH_DIAG__ = {
    clear: () => {
      authDiagEvents.length = 0;
    },
    list: () => [...authDiagEvents],
    enabled: true,
  };
}

export function logAuthDiagnostic(eventName, payload = {}) {
  if (!AUTH_DIAGNOSTICS_ENABLED) {
    return;
  }
  const event = {
    event: String(eventName || "unknown"),
    at: new Date().toISOString(),
    payload: sanitizeValue(payload),
  };
  authDiagEvents.push(event);
  if (authDiagEvents.length > MAX_AUTH_DIAG_EVENTS) {
    authDiagEvents.shift();
  }
  attachDebugHandle();
}

export function isAuthDiagnosticsEnabled() {
  return AUTH_DIAGNOSTICS_ENABLED;
}


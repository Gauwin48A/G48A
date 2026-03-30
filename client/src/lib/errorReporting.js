import { buildApiPath } from "@/lib/networkConfig";
import { buildRequestSecurity } from "@/lib/requestSecurity";

const MAX_ERRORS_PER_SESSION = 20;

let initialized = false;
let sentCount = 0;

/**
 * Build the client-error reporting endpoint URL.
 * @returns {string}
 */
function buildEndpointUrl() {
  return buildApiPath("/analytics/client-error");
}

/**
 * Check whether error reporting is enabled (via env toggle or Sentry DSN).
 * @returns {boolean}
 */
function isReportingEnabled() {
  const explicitToggle =
    String(import.meta.env.VITE_ENABLE_ERROR_REPORTING || "").toLowerCase() === "true";
  const sentryDsnProvided = Boolean(
    String(import.meta.env.VITE_SENTRY_DSN || "").trim()
  );
  return explicitToggle || sentryDsnProvided;
}

/**
 * Send an error payload to the reporting endpoint.
 * Uses sendBeacon when available, falls back to fetch.
 * @param {object} payload
 */
function sendError(payload) {
  if (!isReportingEnabled() || sentCount >= MAX_ERRORS_PER_SESSION) return;

  sentCount += 1;
  const endpoint = buildEndpointUrl();
  const security = buildRequestSecurity();
  const body = JSON.stringify({
    ...payload,
    ...security.body,
  });

  try {
    if (navigator?.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      const beaconSent = navigator.sendBeacon(endpoint, blob);
      if (beaconSent) return;
    }
  } catch { /* ignore beacon errors */ }

  const token = localStorage.getItem("authToken");

  fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...security.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
    keepalive: true,
    body: body,
  }).catch(() => {});
}

/**
 * Create a structured error payload from an error-like value.
 * @param {Error|string} errorLike
 * @param {string} source - Where the error originated.
 * @returns {object}
 */
function createPayload(errorLike, source) {
  const message = String(
    errorLike?.message || errorLike || "Unknown client error"
  );
  const stack = String(errorLike?.stack || "");

  return {
    source: source,
    message: message.slice(0, 500),
    stack: stack.slice(0, 5e3),
    page: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Report a runtime error to the analytics backend.
 * @param {Error|string} errorLike - The error or error message.
 * @param {string} [source="runtime"] - Label for the error source.
 */
export function reportRuntimeError(errorLike, source = "runtime") {
  sendError(createPayload(errorLike, source));
}

/**
 * Initialize global error listeners (window.error and unhandledrejection).
 * Safe to call multiple times; only installs listeners once.
 */
export function initErrorReporting() {
  if (initialized || !isReportingEnabled()) return;
  initialized = true;

  window.addEventListener("error", (event) => {
    reportRuntimeError(event.error || event.message, "window.error");
  });

  window.addEventListener("unhandledrejection", (event) => {
    reportRuntimeError(
      event.reason || "Unhandled promise rejection",
      "window.unhandledrejection"
    );
  });
}

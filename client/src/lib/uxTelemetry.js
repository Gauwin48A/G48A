import { buildApiPath } from "@/lib/networkConfig";
import { buildRequestSecurity } from "@/lib/requestSecurity";

const MAX_EVENTS_PER_SESSION = 250;
const MAX_ACTION_EVENTS_PER_ROUTE = 30;
const DROP_OFF_DWELL_MS = 12e3;
const TELEMETRY_MIN_INTERVAL_MS = 4000;
const TELEMETRY_COOLDOWN_FALLBACK_MS = 60 * 1000;
const TELEMETRY_COOLDOWN_MAX_MS = 10 * 60 * 1000;
const TELEMETRY_COOLDOWN_KEY = "mhub_telemetry_cooldown_until";

let totalSentEvents = 0;
let activeRouteSession = null;
let lastSentAt = 0;
let telemetryCooldownUntil = 0;

const resolveRetryAfterMs = (headerValue, fallbackMs = TELEMETRY_COOLDOWN_FALLBACK_MS) => {
  if (!headerValue) return fallbackMs;
  const trimmed = String(headerValue).trim();
  if (!trimmed) return fallbackMs;
  const seconds = Number.parseInt(trimmed, 10);
  if (Number.isFinite(seconds)) {
    return Math.max(1000, seconds * 1000);
  }
  const asDate = Date.parse(trimmed);
  if (Number.isFinite(asDate)) {
    const diff = asDate - Date.now();
    return diff > 0 ? diff : fallbackMs;
  }
  return fallbackMs;
};
const readTelemetryCooldown = () => {
  if (telemetryCooldownUntil > Date.now()) {
    return telemetryCooldownUntil;
  }
  if (typeof localStorage === "undefined") return 0;
  const raw = localStorage.getItem(TELEMETRY_COOLDOWN_KEY);
  const parsed = Number(raw);
  if (Number.isFinite(parsed)) {
    telemetryCooldownUntil = parsed;
    return parsed;
  }
  return 0;
};
const setTelemetryCooldown = (cooldownMs) => {
  const capped = Math.min(
    Math.max(Number(cooldownMs) || 0, 0),
    TELEMETRY_COOLDOWN_MAX_MS,
  );
  if (!Number.isFinite(capped) || capped <= 0) return 0;
  const until = Date.now() + capped;
  telemetryCooldownUntil = Math.max(telemetryCooldownUntil, until);
  try {
    localStorage.setItem(TELEMETRY_COOLDOWN_KEY, String(telemetryCooldownUntil));
  } catch {
    // ignore storage failures
  }
  return telemetryCooldownUntil;
};

/**
 * Normalize a string value to a trimmed string capped at a max length.
 * @param {*} value
 * @param {number} [max=200]
 * @returns {string}
 */
const normalizeString = (value, max = 200) =>
  String(value || "").trim().slice(0, max);

/**
 * Get the current time as an ISO string.
 * @returns {string}
 */
const getNowIso = () => new Date().toISOString();

/**
 * Check whether UX telemetry is enabled via environment variable.
 * @returns {boolean}
 */
const isEnabled = () => {
  const configured = String(
    import.meta.env.VITE_ENABLE_UX_TELEMETRY || ""
  ).trim().toLowerCase();

  if (configured === "false" || configured === "0") {
    return false;
  }
  return true;
};
const shouldUseBeacon = () => {
  const configured = String(
    import.meta.env.VITE_TELEMETRY_USE_BEACON || ""
  ).trim().toLowerCase();
  if (configured === "true" || configured === "1") return true;
  return false;
};

/**
 * Build the analytics endpoint URL.
 * @returns {string}
 */
const buildEndpoint = () => buildApiPath("/analytics/client-event");

/**
 * Send a telemetry payload to the analytics endpoint.
 * Uses sendBeacon when available, falls back to fetch.
 * @param {object} payload
 */
const sendPayload = (payload) => {
  if (!isEnabled() || totalSentEvents >= MAX_EVENTS_PER_SESSION) {
    return;
  }

  const now = Date.now();
  const cooldownUntil = readTelemetryCooldown();
  if (cooldownUntil && cooldownUntil > now) {
    return;
  }
  if (now - lastSentAt < TELEMETRY_MIN_INTERVAL_MS) {
    return;
  }
  lastSentAt = now;

  totalSentEvents += 1;
  const endpoint = buildEndpoint();
  const security = buildRequestSecurity();
  const body = JSON.stringify({
    ...payload,
    ...security.body,
    source: "ux-telemetry",
    page: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: getNowIso(),
  });

  try {
    if (shouldUseBeacon() && navigator?.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      const sent = navigator.sendBeacon(endpoint, blob);
      if (sent) {
        return;
      }
    }
  } catch { /* ignore beacon errors */ }

  const token =
    localStorage.getItem("authToken") ||
    localStorage.getItem("token");

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
  })
    .then((response) => {
      if (!response) return;
      if (response.status === 429) {
        const retryAfterHeader =
          response.headers?.get?.("retry-after") ||
          response.headers?.get?.("Retry-After");
        const retryAfterMs = resolveRetryAfterMs(retryAfterHeader);
        setTelemetryCooldown(retryAfterMs);
      }
    })
    .catch(() => {});
};

/**
 * Create a unique session ID for a given pathname.
 * @param {string} pathname
 * @returns {string}
 */
const createSessionId = (pathname) => {
  const nonce = Math.random().toString(36).slice(2, 8);
  return `${Date.now()}-${normalizeString(pathname, 80)}-${nonce}`;
};

/**
 * Begin tracking a new route session. Ends any active session first.
 * @param {object} params
 * @param {string} params.pathname - Current route pathname.
 * @param {string} params.search - Current query string.
 */
export const beginRouteSession = ({ pathname, search }) => {
  if (activeRouteSession) {
    endRouteSession("session_restart");
  }

  const routePath = normalizeString(pathname, 200) || "/";
  const routeSearch = normalizeString(search, 300);

  activeRouteSession = {
    sessionId: createSessionId(routePath),
    pathname: routePath,
    search: routeSearch,
    startedAtMs: Date.now(),
    actionCount: 0,
    actionEventsSent: 0,
  };

  sendPayload({
    eventName: "route_view",
    pathname: routePath,
    search: routeSearch,
    sessionId: activeRouteSession.sessionId,
    metadata: {},
  });
};

/**
 * End the current route session and send exit / drop-off events.
 * @param {string} [reason="route_change"] - Why the session ended.
 */
export const endRouteSession = (reason = "route_change") => {
  if (!activeRouteSession) {
    return;
  }

  const session = activeRouteSession;
  activeRouteSession = null;

  const dwellMs = Math.max(0, Date.now() - session.startedAtMs);
  const isDropOff =
    session.actionCount === 0 && dwellMs >= DROP_OFF_DWELL_MS;

  sendPayload({
    eventName: "route_exit",
    pathname: session.pathname,
    search: session.search,
    sessionId: session.sessionId,
    metadata: {
      dwellMs: dwellMs,
      actionCount: session.actionCount,
      reason: reason,
      isDropOff: isDropOff,
    },
  });

  if (isDropOff) {
    sendPayload({
      eventName: "route_drop_off",
      pathname: session.pathname,
      search: session.search,
      sessionId: session.sessionId,
      metadata: {
        dwellMs: dwellMs,
        reason: reason,
      },
    });
  }
};

/**
 * Track a user action within the current route session.
 * @param {string} actionName - Name of the action (e.g. "click_button").
 * @param {object} [metadata={}] - Additional metadata for the event.
 */
export const trackRouteAction = (actionName, metadata = {}) => {
  if (!activeRouteSession) {
    return;
  }

  activeRouteSession.actionCount += 1;

  if (activeRouteSession.actionEventsSent >= MAX_ACTION_EVENTS_PER_ROUTE) {
    return;
  }

  activeRouteSession.actionEventsSent += 1;

  sendPayload({
    eventName: "route_action",
    pathname: activeRouteSession.pathname,
    search: activeRouteSession.search,
    sessionId: activeRouteSession.sessionId,
    metadata: {
      actionName: normalizeString(actionName, 80) || "ui_action",
      ...metadata,
    },
  });
};

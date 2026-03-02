import { buildApiPath } from '@/lib/networkConfig';

const MAX_EVENTS_PER_SESSION = 250;
const MAX_ACTION_EVENTS_PER_ROUTE = 30;
const DROP_OFF_DWELL_MS = 12000;

let totalSentEvents = 0;
let activeRouteSession = null;

const normalizeString = (value, max = 200) => String(value || '').trim().slice(0, max);

const getNowIso = () => new Date().toISOString();

const isEnabled = () => {
  const configured = String(import.meta.env.VITE_ENABLE_UX_TELEMETRY || '').trim().toLowerCase();
  if (configured === 'false' || configured === '0') {
    return false;
  }
  return true;
};

const buildEndpoint = () => buildApiPath('/analytics/client-event');

const sendPayload = (payload) => {
  if (!isEnabled() || totalSentEvents >= MAX_EVENTS_PER_SESSION) {
    return;
  }

  totalSentEvents += 1;
  const endpoint = buildEndpoint();
  const body = JSON.stringify({
    ...payload,
    source: 'ux-telemetry',
    page: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: getNowIso()
  });

  try {
    if (navigator?.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      const sent = navigator.sendBeacon(endpoint, blob);
      if (sent) {
        return;
      }
    }
  } catch {
    // Fall back to fetch.
  }

  const token = localStorage.getItem('authToken') || localStorage.getItem('token');
  fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    credentials: 'include',
    keepalive: true,
    body
  }).catch(() => {
    // Avoid telemetry loops.
  });
};

const createSessionId = (pathname) => {
  const nonce = Math.random().toString(36).slice(2, 8);
  return `${Date.now()}-${normalizeString(pathname, 80)}-${nonce}`;
};

export const beginRouteSession = ({ pathname, search }) => {
  if (activeRouteSession) {
    endRouteSession('session_restart');
  }

  const routePath = normalizeString(pathname, 200) || '/';
  const routeSearch = normalizeString(search, 300);

  activeRouteSession = {
    sessionId: createSessionId(routePath),
    pathname: routePath,
    search: routeSearch,
    startedAtMs: Date.now(),
    actionCount: 0,
    actionEventsSent: 0
  };

  sendPayload({
    eventName: 'route_view',
    pathname: routePath,
    search: routeSearch,
    sessionId: activeRouteSession.sessionId,
    metadata: {}
  });
};

export const endRouteSession = (reason = 'route_change') => {
  if (!activeRouteSession) {
    return;
  }

  const session = activeRouteSession;
  activeRouteSession = null;

  const dwellMs = Math.max(0, Date.now() - session.startedAtMs);
  const isDropOff = session.actionCount === 0 && dwellMs >= DROP_OFF_DWELL_MS;

  sendPayload({
    eventName: 'route_exit',
    pathname: session.pathname,
    search: session.search,
    sessionId: session.sessionId,
    metadata: {
      dwellMs,
      actionCount: session.actionCount,
      reason,
      isDropOff
    }
  });

  if (isDropOff) {
    sendPayload({
      eventName: 'route_drop_off',
      pathname: session.pathname,
      search: session.search,
      sessionId: session.sessionId,
      metadata: {
        dwellMs,
        reason
      }
    });
  }
};

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
    eventName: 'route_action',
    pathname: activeRouteSession.pathname,
    search: activeRouteSession.search,
    sessionId: activeRouteSession.sessionId,
    metadata: {
      actionName: normalizeString(actionName, 80) || 'ui_action',
      ...metadata
    }
  });
};

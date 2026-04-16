const SOFT_NAV_HANDLER_KEY = "__mhub_soft_nav_handler__";
const SOFT_NAV_QUEUE_KEY = "__mhub_soft_nav_queue__";

export const requestSoftNavigate = (to, options = {}) => {
  if (typeof window === "undefined" || !to) {
    return false;
  }

  const payload = {
    to,
    options,
    requestedAt: Date.now(),
  };

  const handler = window[SOFT_NAV_HANDLER_KEY];
  if (typeof handler === "function") {
    handler(payload);
    return true;
  }

  const queue = Array.isArray(window[SOFT_NAV_QUEUE_KEY])
    ? window[SOFT_NAV_QUEUE_KEY]
    : [];
  queue.push(payload);
  window[SOFT_NAV_QUEUE_KEY] = queue;
  return false;
};

export const registerSoftNavigationHandler = (handler) => {
  if (typeof window === "undefined" || typeof handler !== "function") {
    return () => {};
  }

  window[SOFT_NAV_HANDLER_KEY] = handler;

  const queue = window[SOFT_NAV_QUEUE_KEY];
  if (Array.isArray(queue) && queue.length) {
    const pending = queue.splice(0, queue.length);
    pending.forEach((payload) => handler(payload));
  }

  return () => {
    if (window[SOFT_NAV_HANDLER_KEY] === handler) {
      window[SOFT_NAV_HANDLER_KEY] = null;
    }
  };
};

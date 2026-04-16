const SOFT_RELOAD_HANDLER_KEY = "__mhub_soft_reload_handler__";
const SOFT_RELOAD_QUEUE_KEY = "__mhub_soft_reload_queue__";

export const requestSoftReload = (detail = {}) => {
  if (typeof window === "undefined") {
    return false;
  }

  const payload = {
    ...detail,
    requestedAt: Date.now(),
  };

  const handler = window[SOFT_RELOAD_HANDLER_KEY];
  if (typeof handler === "function") {
    handler(payload);
    return true;
  }

  const queue = Array.isArray(window[SOFT_RELOAD_QUEUE_KEY])
    ? window[SOFT_RELOAD_QUEUE_KEY]
    : [];
  queue.push(payload);
  window[SOFT_RELOAD_QUEUE_KEY] = queue;
  return false;
};

export const registerSoftReloadHandler = (handler) => {
  if (typeof window === "undefined" || typeof handler !== "function") {
    return () => {};
  }

  window[SOFT_RELOAD_HANDLER_KEY] = handler;

  const queue = window[SOFT_RELOAD_QUEUE_KEY];
  if (Array.isArray(queue) && queue.length) {
    const pending = queue.splice(0, queue.length);
    pending.forEach((payload) => handler(payload));
  }

  return () => {
    if (window[SOFT_RELOAD_HANDLER_KEY] === handler) {
      window[SOFT_RELOAD_HANDLER_KEY] = null;
    }
  };
};

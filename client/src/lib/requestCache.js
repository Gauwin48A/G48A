const requestCache = new Map();

export function fetchWithCache(key, fetcher, { ttlMs = 60 * 1000 } = {}) {
  const now = Date.now();
  const existing = requestCache.get(key);

  if (existing?.data && now - existing.timestamp < ttlMs) {
    return Promise.resolve(existing.data);
  }

  if (existing?.promise) {
    return existing.promise;
  }

  const promise = Promise.resolve()
    .then(fetcher)
    .then((data) => {
      requestCache.set(key, { data, timestamp: Date.now() });
      return data;
    })
    .catch((error) => {
      requestCache.delete(key);
      throw error;
    });

  requestCache.set(key, { ...existing, promise, timestamp: now });
  return promise;
}

export function clearCachedRequest(key) {
  if (key) {
    requestCache.delete(key);
    return;
  }
  requestCache.clear();
}

export function peekCachedRequest(key) {
  const entry = requestCache.get(key);
  if (!entry?.data) return null;
  return entry.data;
}

export default {
  fetchWithCache,
  clearCachedRequest,
  peekCachedRequest,
};

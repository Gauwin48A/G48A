const DEFAULT_DEV_API_ORIGIN = "http://localhost:5001";
const LOCALHOST_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);
const FORCE_ABSOLUTE_LOCAL_API_ORIGIN =
  String(import.meta.env.VITE_FORCE_ABSOLUTE_API_ORIGIN || "").toLowerCase() ===
  "true";
const normalize = (value) =>
  String(value || "")
    .trim()
    .replace(/\/+$/, "");
const isValidAbsoluteOrigin = (value) => {
  try {
    const parsed = new URL(value);
    return !!parsed.protocol && !!parsed.hostname;
  } catch {
    return false;
  }
};
const normalizeAbsoluteOrigin = (value) => {
  const normalized = normalize(value);
  if (!normalized || !isValidAbsoluteOrigin(normalized)) {
    return "";
  }
  return normalized.endsWith("/api") ? normalized.slice(0, -4) : normalized;
};
const isLocalhostRuntime = () =>
  typeof window !== "undefined" &&
  LOCALHOST_HOSTNAMES.has(window.location.hostname);
const shouldPreferLocalDevProxy = () =>
  Boolean(import.meta.env.DEV) &&
  isLocalhostRuntime() &&
  !FORCE_ABSOLUTE_LOCAL_API_ORIGIN;
const getRuntimeApiOriginOverride = () => {
  if (typeof window === "undefined") return "";
  return normalize(window.__MHUB_API_ORIGIN_OVERRIDE__ || "");
};
export function getApiOriginBase() {
  const runtimeOverride = normalizeAbsoluteOrigin(
    getRuntimeApiOriginOverride(),
  );
  if (runtimeOverride) {
    return runtimeOverride;
  }
  if (shouldPreferLocalDevProxy()) {
    return "";
  }
  const configuredBase = normalize(import.meta.env.VITE_API_BASE_URL || "");
  if (!configuredBase) {
    if (import.meta.env.DEV || isLocalhostRuntime()) {
      return DEFAULT_DEV_API_ORIGIN;
    }
    return "";
  }
  if (configuredBase === "/api") {
    return "";
  }
  if (configuredBase.startsWith("/")) {
    return configuredBase;
  }
  const normalizedConfiguredOrigin = normalizeAbsoluteOrigin(configuredBase);
  if (normalizedConfiguredOrigin) {
    return normalizedConfiguredOrigin;
  }
  if (import.meta.env.DEV || isLocalhostRuntime()) {
    return DEFAULT_DEV_API_ORIGIN;
  }
  return "";
}
export function getApiRootUrl() {
  const originBase = getApiOriginBase();
  if (!originBase) {
    return "/api";
  }
  if (originBase === "/api" || originBase.endsWith("/api")) {
    return originBase;
  }
  if (originBase.startsWith("/")) {
    return `${originBase}/api`;
  }
  return `${originBase}/api`;
}
export function getSocketUrl() {
  const runtimeOverride = normalizeAbsoluteOrigin(
    getRuntimeApiOriginOverride(),
  );
  if (runtimeOverride) {
    return runtimeOverride;
  }
  if (shouldPreferLocalDevProxy() && typeof window !== "undefined") {
    return window.location.origin;
  }
  const configuredSocketUrl = normalize(import.meta.env.VITE_SOCKET_URL || "");
  if (configuredSocketUrl) {
    if (configuredSocketUrl.startsWith("/")) {
      return configuredSocketUrl;
    }
    if (!isValidAbsoluteOrigin(configuredSocketUrl)) {
      if (import.meta.env.DEV || isLocalhostRuntime()) {
        return DEFAULT_DEV_API_ORIGIN;
      }
      return "";
    }
    return configuredSocketUrl;
  }
  const originBase = getApiOriginBase();
  if (originBase && !originBase.startsWith("/")) {
    return originBase;
  }
  if (import.meta.env.DEV || isLocalhostRuntime()) {
    return DEFAULT_DEV_API_ORIGIN;
  }
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return DEFAULT_DEV_API_ORIGIN;
}
export function buildApiPath(path = "") {
  const safePath = path.startsWith("/") ? path : `/${path}`;
  return `${getApiRootUrl()}${safePath}`;
}

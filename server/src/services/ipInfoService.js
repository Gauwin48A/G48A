const requestIp = require("request-ip");
const logger = require("../utils/logger");

const IP_INFO_CACHE_TTL_MS = Number.parseInt(
  process.env.IP_INFO_CACHE_TTL_MS || "60000",
  10,
);

const cache = new Map();

const resolveFetch = () => {
  if (typeof fetch === "function") return fetch;
  try {
    // eslint-disable-next-line global-require
    return require("node-fetch");
  } catch {
    return null;
  }
};

const normalizeIp = (rawIp) => {
  const value = String(rawIp || "").split(",")[0].trim();
  if (value.startsWith("::ffff:")) return value.replace("::ffff:", "");
  return value;
};

const isPrivateIp = (ip) => {
  if (!ip) return true;
  if (
    ip === "::1" ||
    ip === "127.0.0.1" ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    ip.startsWith("169.254.") ||
    ip.startsWith("fc") ||
    ip.startsWith("fd") ||
    ip.startsWith("fe80:")
  ) {
    return true;
  }
  const octets = ip.split(".").map(Number);
  if (octets.length === 4 && octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) {
    return true;
  }
  return false;
};

const getCached = (key) => {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry;
};

const setCached = (key, payload) => {
  cache.set(key, {
    payload,
    expiresAt: Date.now() + IP_INFO_CACHE_TTL_MS,
  });
};

const fetchWithTimeout = async (fetchFn, url, timeoutMs = 4000) => {
  if (!fetchFn) return null;
  const controller =
    typeof AbortController !== "undefined" ? new AbortController() : null;
  const timeout = setTimeout(() => controller?.abort(), timeoutMs);
  try {
    return await fetchFn(url, {
      headers: { "User-Agent": "mhub-ipinfo-proxy/1.0" },
      signal: controller?.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
};

const toNumberOrNull = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const extractAsn = (value) => {
  const text = String(value || "");
  const match = text.match(/\bAS\d+\b/i);
  return match ? match[0].toUpperCase() : "";
};

const normalizePayload = (data, fallbackIp = "") => {
  const loc = typeof data?.loc === "string" ? data.loc.split(",") : [];
  const latitude =
    data?.latitude ?? data?.lat ?? (loc.length > 0 ? loc[0] : null);
  const longitude =
    data?.longitude ?? data?.lon ?? (loc.length > 1 ? loc[1] : null);
  const org = data?.org || data?.organization || "";
  const asn = data?.asn || extractAsn(org);

  return {
    ip: data?.ip || data?.ip_address || fallbackIp || "",
    country_code: data?.country_code || data?.country || "",
    country_name: data?.country_name || "",
    org: org || "",
    asn: asn || "",
    timezone: data?.timezone || data?.time_zone || "",
    city: data?.city || "",
    region: data?.region || "",
    latitude: toNumberOrNull(latitude),
    longitude: toNumberOrNull(longitude),
  };
};

async function resolveIpInfo(req) {
  const fetchFn = resolveFetch();
  if (!fetchFn) {
    return { ok: false, reason: "fetch_unavailable" };
  }

  const rawIp = requestIp.getClientIp(req);
  const clientIp = normalizeIp(rawIp);
  const lookupIp = clientIp && !isPrivateIp(clientIp) ? clientIp : "";
  const cacheKey = lookupIp || "self";

  const cached = getCached(cacheKey);
  if (cached) {
    return { ok: true, payload: { ...cached.payload, cached: true }, source: cached.source || "cache" };
  }

  const ipapiUrl = lookupIp
    ? `https://ipapi.co/${encodeURIComponent(lookupIp)}/json/`
    : "https://ipapi.co/json/";
  try {
    const response = await fetchWithTimeout(fetchFn, ipapiUrl, 4500);
    if (response && response.ok) {
      const data = await response.json();
      if (!data?.error) {
        const payload = normalizePayload(data, lookupIp);
        const wrapped = { ...payload, source: "ipapi", cached: false };
        setCached(cacheKey, wrapped);
        return { ok: true, payload: wrapped, source: "ipapi" };
      }
    }
  } catch (error) {
    logger.warn("[ipInfoService] ipapi lookup failed:", error?.message || error);
  }

  const ipinfoUrl = lookupIp
    ? `https://ipinfo.io/${encodeURIComponent(lookupIp)}/json`
    : "https://ipinfo.io/json";

  try {
    const response = await fetchWithTimeout(fetchFn, ipinfoUrl, 4500);
    if (response && response.ok) {
      const data = await response.json();
      const payload = normalizePayload(data, lookupIp);
      const wrapped = { ...payload, source: "ipinfo", cached: false };
      setCached(cacheKey, wrapped);
      return { ok: true, payload: wrapped, source: "ipinfo" };
    }
  } catch (error) {
    logger.warn("[ipInfoService] ipinfo lookup failed:", error?.message || error);
  }

  return { ok: false, reason: "lookup_failed" };
}

module.exports = { resolveIpInfo };

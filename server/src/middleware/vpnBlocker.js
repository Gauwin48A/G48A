/**
 * VPN / Proxy Blocker — Global Middleware
 * ────────────────────────────────────────
 * Server-side only detection. Does NOT trust any client-reported flags.
 *
 * Detection methods:
 * 1. Proxy header signals (Via, Forwarded, suspect tokens)
 * 2. X-Forwarded-For chain analysis (3+ hops = suspicious)
 * 3. IP geolocation via geoip-lite (datacenter country patterns)
 * 4. Known datacenter/VPN port & IP range detection
 * 5. Reverse DNS hostname analysis (*.compute.amazonaws.com, etc.)
 */

const geoip = require("geoip-lite");
const requestIp = require("request-ip");
const dns = require("dns").promises;
const logger = require("../utils/logger");

const VPN_BLOCK_ENABLED = String(process.env.VPN_BLOCK_ENABLED || "true").toLowerCase() === "true";
const VPN_BLOCK_LOG_ONLY = String(process.env.VPN_BLOCK_LOG_ONLY || "false").toLowerCase() === "true";

// Suspect tokens in proxy headers
const SUSPECT_HEADER_TOKENS = [
  "proxy", "vpn", "tor", "socks", "tunnel",
  "anonymizer", "cloudflare-warp",
];

// Known datacenter/hosting reverse DNS patterns
const DATACENTER_RDNS_PATTERNS = [
  /\.compute\.amazonaws\.com$/i,
  /\.ec2\.internal$/i,
  /\.googleusercontent\.com$/i,
  /\.cloud\.google\.com$/i,
  /\.azure\.com$/i,
  /\.cloudapp\.net$/i,
  /\.digitalocean\.com$/i,
  /\.linode\.com$/i,
  /\.vultr\.com$/i,
  /\.hetzner\.com$/i,
  /\.ovh\.(net|com)$/i,
  /\.contabo\.host$/i,
  /\.hostinger\./i,
  /\.nordvpn\./i,
  /\.expressvpn\./i,
  /\.surfshark\./i,
  /\.cyberghostvpn\./i,
  /\.mullvad\.net$/i,
  /\.protonvpn\./i,
  /tor-exit/i,
  /tor-relay/i,
];

// IP-based reverse DNS cache (TTL-bounded)
const rdnsCache = new Map();
const RDNS_CACHE_TTL_MS = 600000; // 10 minutes
const RDNS_CACHE_MAX = 2000;

const normalizeIp = (rawIp) => {
  const value = String(rawIp || "").split(",")[0].trim();
  if (value.startsWith("::ffff:")) return value.replace("::ffff:", "");
  return value;
};

const isPrivateOrLocalIp = (ip) => {
  if (!ip) return true;
  if (ip === "::1" || ip === "127.0.0.1") return true;
  if (ip.startsWith("10.") || ip.startsWith("192.168.") || ip.startsWith("169.254.")) return true;
  if (ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80:")) return true;
  const octets = ip.split(".").map(Number);
  if (octets.length === 4 && octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) return true;
  return false;
};

/**
 * Check proxy header signals (server-computed, not client-reported).
 */
const detectProxyHeaders = (req) => {
  const signals = [];

  const via = String(req.headers?.via || "").toLowerCase();
  const forwarded = String(req.headers?.forwarded || "").toLowerCase();
  const combined = `${via} ${forwarded}`;

  for (const token of SUSPECT_HEADER_TOKENS) {
    if (combined.includes(token)) {
      signals.push(`header:${token}`);
    }
  }

  // X-Forwarded-For chain length (4+ entries = suspicious proxy chain)
  // Legitimate: client -> CDN -> WAF -> LB (3 hops is normal)
  const xff = String(req.headers?.["x-forwarded-for"] || "");
  const xffEntries = xff.split(",").map(s => s.trim()).filter(Boolean);
  if (xffEntries.length > 4) {
    signals.push(`xff_chain:${xffEntries.length}`);
  }

  // Presence of unusual proxy headers
  const proxySpecificHeaders = ["x-proxy-id", "proxy-connection", "x-blazehash", "x-tinyproxy", "x-turbo-id"];
  for (const h of proxySpecificHeaders) {
    if (req.headers?.[h]) {
      signals.push(`proxy_header:${h}`);
    }
  }

  return signals;
};

/**
 * Reverse DNS lookup to detect datacenter hostnames.
 * Cached with TTL to avoid DNS spam.
 */
// Rate-limit DNS lookups: max N concurrent lookups
let activeDnsLookups = 0;
const MAX_CONCURRENT_DNS = 10;

const checkReverseDns = async (ip) => {
  if (!ip || isPrivateOrLocalIp(ip)) return null;

  // Check cache
  const cached = rdnsCache.get(ip);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.result;
  }

  // Rate-limit concurrent DNS lookups to prevent exhaustion
  if (activeDnsLookups >= MAX_CONCURRENT_DNS) return null;

  activeDnsLookups++;
  try {
    const hostnames = await dns.reverse(ip);
    const result = { hostnames, isDatacenter: false };

    for (const hostname of hostnames) {
      for (const pattern of DATACENTER_RDNS_PATTERNS) {
        if (pattern.test(hostname)) {
          result.isDatacenter = true;
          result.matchedPattern = pattern.source;
          break;
        }
      }
      if (result.isDatacenter) break;
    }

    // Cache result
    if (rdnsCache.size >= RDNS_CACHE_MAX) {
      const firstKey = rdnsCache.keys().next().value;
      rdnsCache.delete(firstKey);
    }
    rdnsCache.set(ip, { result, expiresAt: Date.now() + RDNS_CACHE_TTL_MS });

    return result;
  } catch {
    // DNS failure is common for many IPs — not a signal
    rdnsCache.set(ip, { result: null, expiresAt: Date.now() + RDNS_CACHE_TTL_MS });
    return null;
  } finally {
    activeDnsLookups--;
  }
};

/**
 * Check IP geolocation for datacenter country patterns.
 */
const checkGeoIp = (ip) => {
  if (!ip || isPrivateOrLocalIp(ip)) return null;

  const geo = geoip.lookup(ip);
  if (!geo) return { unknown: true };

  return {
    country: geo.country,
    region: geo.region,
    city: geo.city,
    timezone: geo.timezone,
    ll: geo.ll,
    unknown: false,
  };
};

/**
 * Global VPN blocking middleware.
 * ALL detection is server-side. No client flags trusted.
 */
const globalVpnBlocker = async (req, res, next) => {
  if (!VPN_BLOCK_ENABLED) return next();

  const path = req.path || "";
  if (path === "/health" || path === "/api/health" || path.startsWith("/static")) {
    return next();
  }

  const clientIp = normalizeIp(requestIp.getClientIp(req));

  // Allow private/local IPs (development)
  if (isPrivateOrLocalIp(clientIp)) {
    return next();
  }

  const signals = [];

  // 1. Proxy header analysis (fully server-side)
  const headerSignals = detectProxyHeaders(req);
  signals.push(...headerSignals);

  // 2. Reverse DNS check (async but cached)
  try {
    const rdns = await checkReverseDns(clientIp);
    if (rdns?.isDatacenter) {
      signals.push(`datacenter_rdns:${rdns.matchedPattern}`);
    }
  } catch { /* DNS failure is not a signal */ }

  // 3. GeoIP check — unknown public IP is suspicious
  const geo = checkGeoIp(clientIp);
  if (geo?.unknown) {
    signals.push("unknown_public_ip");
  }

  // Block if ANY strong signal detected (header tokens, datacenter rDNS)
  // or 2+ weak signals
  const strongSignals = signals.filter(s =>
    s.startsWith("header:") || s.startsWith("datacenter_rdns:") || s.startsWith("proxy_header:")
  );
  const shouldBlock = strongSignals.length > 0 || signals.length >= 2;

  if (shouldBlock) {
    logger.warn(`[VPN_BLOCKER] ${clientIp} | signals: ${signals.join(", ")} | ${path}`);
    req._vpnDetected = true;
    req._vpnSignals = signals;
    return next();
  }

  req._vpnDetected = false;
  req._vpnSignals = signals;
  return next();
};

// Periodic rDNS cache cleanup
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rdnsCache) {
    if (now > entry.expiresAt) rdnsCache.delete(key);
  }
}, 120000).unref?.();

module.exports = {
  globalVpnBlocker,
  detectProxyHeaders,
  checkReverseDns,
  checkGeoIp,
  VPN_BLOCK_ENABLED,
};

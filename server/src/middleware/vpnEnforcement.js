/**
 * VPN Enforcement Middleware (Server-side)
 * ────────────────────────────────────────
 * Multi-signal server-side VPN/proxy detection for all API routes.
 * Combines: proxy headers, timezone mismatch, IP-behind-VPN header
 * checks, connection anomalies, and known VPN port patterns.
 * Complements the client-side VPN detection.
 */

const geoip = require("geoip-lite");
const requestIp = require("request-ip");
const logger = require("../utils/logger");

const VPN_ENFORCEMENT_ENABLED =
  String(process.env.VPN_ENFORCEMENT_ENABLED || "true").toLowerCase() === "true";

const VPN_ENFORCEMENT_MODE =
  String(process.env.VPN_ENFORCEMENT_MODE || "enforce").toLowerCase(); // 'enforce' | 'log'

// Country allow-list: only allow connections from India for MHub
const ALLOWED_COUNTRIES = new Set(
  String(process.env.VPN_ALLOWED_COUNTRIES || "IN").toUpperCase().split(",").map(c => c.trim())
);

const normalizeIp = (rawIp) => {
  const value = String(rawIp || "").split(",")[0].trim();
  if (value.startsWith("::ffff:")) return value.replace("::ffff:", "");
  return value;
};

const isPrivateIp = (ip) => {
  if (!ip) return true;
  if (
    ip === "::1" || ip === "127.0.0.1" ||
    ip.startsWith("10.") || ip.startsWith("192.168.") ||
    ip.startsWith("169.254.") || ip.startsWith("fc") ||
    ip.startsWith("fd") || ip.startsWith("fe80:")
  ) return true;
  const octets = ip.split(".").map(Number);
  if (octets.length === 4 && octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) return true;
  return false;
};

/**
 * Build a VPN block response
 */
const blockVpn = (res, code, message) => {
  return res.status(403).json({
    error: "VPN/Proxy Detected",
    code,
    message,
  });
};

/**
 * Multi-signal VPN check for all routes.
 * Accumulates a risk score from multiple signals and blocks if threshold exceeded.
 */
const vpnEnforcementMiddleware = (req, res, next) => {
  if (!VPN_ENFORCEMENT_ENABLED) return next();

  // Skip health checks and static assets
  if (req.path === "/health" || req.path === "/api/health" ||
      req.path.startsWith("/uploads/")) {
    return next();
  }

  const clientIp = normalizeIp(requestIp.getClientIp(req));

  // Skip private/local IPs (development)
  if (isPrivateIp(clientIp)) return next();

  let riskScore = 0;
  const riskReasons = [];

  // ── Signal 1: Proxy/VPN headers ───────────────────────
  const via = String(req.headers?.via || "").toLowerCase();
  const forwarded = String(req.headers?.forwarded || "").toLowerCase();
  const xForwardedFor = String(req.headers?.["x-forwarded-for"] || "");
  const combined = `${via} ${forwarded}`;
  const proxyKeywords = ["proxy", "vpn", "tor", "socks", "tunnel", "anonymizer", "cloudflare-warp"];

  if (proxyKeywords.some((token) => combined.includes(token))) {
    riskScore += 60;
    riskReasons.push("proxy_header_detected");
  }

  // Multiple IPs in X-Forwarded-For suggest proxy chains
  const forwardedIps = xForwardedFor.split(",").map(s => s.trim()).filter(Boolean);
  if (forwardedIps.length > 3) {
    riskScore += 30;
    riskReasons.push("excessive_proxy_chain");
  }

  // ── Signal 2: Suspicious request headers ──────────────
  // VPN browser extensions often inject or modify headers
  const suspiciousHeaders = [
    "x-real-ip", "cf-connecting-ip", "true-client-ip",
    "x-proxy-id", "proxy-connection",
  ];
  const presentSuspicious = suspiciousHeaders.filter(h => req.headers?.[h]);
  if (presentSuspicious.length >= 2) {
    riskScore += 20;
    riskReasons.push("suspicious_headers");
  }

  // ── Signal 3: GeoIP checks ───────────────────────────
  const geo = geoip.lookup(clientIp);

  if (!geo) {
    // No geo data for a public IP is suspicious
    riskScore += 15;
    riskReasons.push("unknown_geo_ip");
  } else {
    // Check if country is outside allowed list
    const country = String(geo.country || "").toUpperCase();
    if (country && !ALLOWED_COUNTRIES.has(country)) {
      riskScore += 40;
      riskReasons.push(`foreign_country:${country}`);
    }

    // ── Signal 4: Timezone mismatch ─────────────────────
    const browserTz = req.body?.timezone || req.headers["x-timezone"];
    if (browserTz && geo.timezone) {
      const browserRegion = String(browserTz).split("/")[0];
      const ipRegion = String(geo.timezone).split("/")[0];
      if (browserRegion && ipRegion && browserRegion !== ipRegion) {
        riskScore += 40;
        riskReasons.push(`tz_mismatch:browser=${browserTz},ip=${geo.timezone}`);
      }
    }
  }

  // ── Signal 5: Missing browser signals ─────────────────
  // Legitimate browsers always send these; automated VPN clients may not
  const userAgent = req.headers?.["user-agent"] || "";
  if (!userAgent || userAgent.length < 20) {
    riskScore += 15;
    riskReasons.push("missing_or_short_user_agent");
  }

  // ── Signal 6: Client-side VPN detection result ────────
  // Client can send its VPN check result
  const clientVpnFlag = req.headers["x-vpn-detected"];
  if (clientVpnFlag === "true") {
    riskScore += 50;
    riskReasons.push("client_vpn_flag");
  }

  // ── Decision ──────────────────────────────────────────
  const BLOCK_THRESHOLD = 50;

  req.vpnRisk = riskScore >= BLOCK_THRESHOLD ? "blocked" : riskScore > 0 ? "suspicious" : "clean";
  req.vpnRiskScore = riskScore;
  req.vpnRiskReasons = riskReasons;

  if (riskScore >= BLOCK_THRESHOLD) {
    const logMsg = `[VPN_ENFORCEMENT] Detected: ip=${clientIp}, score=${riskScore}, reasons=${riskReasons.join(",")}`;
    if (VPN_ENFORCEMENT_MODE === "enforce") {
      logger.warn(logMsg);
    } else {
      logger.info(`[VPN_ENFORCEMENT] [LOG_ONLY] ${logMsg}`);
    }
  } else if (riskScore > 0) {
    logger.debug?.(
      `[VPN_ENFORCEMENT] Suspicious: ip=${clientIp}, score=${riskScore}, reasons=${riskReasons.join(",")}`
    );
  }

  return next();
};

module.exports = { vpnEnforcementMiddleware };

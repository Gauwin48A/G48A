import { buildApiPath } from "@/lib/networkConfig";

/**
 * VPN Detection Service
 * ─────────────────────
 * Detects VPN/proxy usage on the client side using multiple detection methods:
 * 1. WebRTC IP leak detection (compares public/local IPs)
 * 2. DNS leak detection via timing
 * 3. IP consistency checks via multiple endpoints
 * 4. Timezone vs IP geolocation mismatch
 *
 * If VPN is detected, the app blocks functionality.
 */

const VPN_CHECK_INTERVAL_MS = 60 * 1000; // Re-check every 60 seconds
const VPN_STATUS_KEY = "mhub_vpn_status";
const VPN_LAST_CHECK_KEY = "mhub_vpn_last_check";
const VPN_CACHE_TTL_MS = 30 * 1000; // Cache result for 30 seconds
const VPN_IP_RATE_LIMIT_FALLBACK_MS = 60 * 1000;
const VPN_IP_COOLDOWN_MAX_MS = 10 * 60 * 1000;
const VPN_IP_COOLDOWN_KEY = "mhub_vpn_ip_cooldown_until";

let vpnCheckTimer = null;
let vpnStatusListeners = [];
let lastVpnStatus = null;
let isChecking = false;
let vpnIpCooldownUntil = 0;

function resolveRetryAfterMs(headerValue, fallbackMs = VPN_IP_RATE_LIMIT_FALLBACK_MS) {
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
}

function readVpnIpCooldown() {
  if (vpnIpCooldownUntil > Date.now()) {
    return vpnIpCooldownUntil;
  }
  try {
    const raw = localStorage.getItem(VPN_IP_COOLDOWN_KEY);
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) {
      vpnIpCooldownUntil = parsed;
      return parsed;
    }
  } catch { /* ignore */ }
  return 0;
}

function setVpnIpCooldown(cooldownMs) {
  const capped = Math.min(
    Math.max(Number(cooldownMs) || 0, 0),
    VPN_IP_COOLDOWN_MAX_MS,
  );
  if (!Number.isFinite(capped) || capped <= 0) return 0;
  const until = Date.now() + capped;
  vpnIpCooldownUntil = Math.max(vpnIpCooldownUntil, until);
  try {
    localStorage.setItem(VPN_IP_COOLDOWN_KEY, String(vpnIpCooldownUntil));
  } catch { /* ignore */ }
  return vpnIpCooldownUntil;
}

function isDevEnvironment() {
  try {
    if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.DEV) {
      return true;
    }
  } catch { /* ignore */ }
  return false;
}

function isLocalhostHost() {
  if (typeof window === "undefined") return false;
  const host = window.location?.hostname || "";
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

function shouldSkipDnsTiming() {
  return isDevEnvironment() || isLocalhostHost();
}
function shouldSkipIpReputation() {
  return isDevEnvironment() || isLocalhostHost();
}

/**
 * Register a listener for VPN status changes
 */
export function onVpnStatusChange(callback) {
  vpnStatusListeners.push(callback);
  // Immediately notify with current status
  if (lastVpnStatus !== null) {
    callback(lastVpnStatus);
  }
  return () => {
    vpnStatusListeners = vpnStatusListeners.filter((cb) => cb !== callback);
  };
}

function notifyListeners(status) {
  lastVpnStatus = status;
  vpnStatusListeners.forEach((cb) => {
    try {
      cb(status);
    } catch { /* ignore */ }
  });
}

/**
 * Method 1: WebRTC IP leak detection
 * Creates a peer connection to detect local vs public IPs
 */
async function detectWebRTCLeak() {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve({ detected: false, reason: "timeout" }), 5000);

    try {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });

      const ips = new Set();
      let hasPublicIP = false;
      let hasPrivateIP = false;

      pc.onicecandidate = (event) => {
        if (!event.candidate) {
          clearTimeout(timeout);
          pc.close();

          // VPN indicators via WebRTC:
          // 1. No candidates at all = WebRTC blocked (VPN extension or privacy setting)
          // 2. Only private IPs = VPN is properly hiding public IP
          // 3. Multiple public IPs = possible leak (real + VPN IP)
          const noCandidates = ips.size === 0;
          const multiplePublicIPs = Array.from(ips).filter(ip =>
            !ip.startsWith("10.") && !ip.startsWith("192.168.") &&
            !ip.startsWith("172.") && ip !== "127.0.0.1"
          ).length > 1;

          resolve({
            detected: noCandidates || multiplePublicIPs,
            reason: noCandidates ? "webrtc_blocked" : multiplePublicIPs ? "multiple_public_ips" : "clean",
            ips: Array.from(ips),
            hasPublicIP,
            hasPrivateIP,
          });
          return;
        }

        const candidate = event.candidate.candidate;
        const ipMatch = candidate.match(
          /(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)/
        );
        if (ipMatch) {
          const ip = ipMatch[0];
          ips.add(ip);
          if (
            ip.startsWith("10.") ||
            ip.startsWith("192.168.") ||
            ip.startsWith("172.") ||
            ip === "127.0.0.1"
          ) {
            hasPrivateIP = true;
          } else {
            hasPublicIP = true;
          }
        }
      };

      pc.createDataChannel("vpn-detect");
      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .catch(() => {
          clearTimeout(timeout);
          pc.close();
          resolve({ detected: false, reason: "offer_failed" });
        });
    } catch {
      clearTimeout(timeout);
      resolve({ detected: false, reason: "webrtc_unavailable" });
    }
  });
}

/**
 * Method 2: Check IP info from a public API
 * Detects VPN/proxy/hosting IPs
 */
async function checkIPReputation() {
  try {
    if (shouldSkipIpReputation()) {
      return { detected: false, reason: "ip_check_skipped" };
    }
    const cooldownUntil = readVpnIpCooldown();
    if (cooldownUntil && cooldownUntil > Date.now()) {
      return { detected: false, reason: "ip_check_rate_limited" };
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(buildApiPath("/location/ip-info"), {
      signal: controller.signal,
      cache: "no-store",
      credentials: "include",
    });
    clearTimeout(timeout);

    if (response.status === 429) {
      const retryAfterHeader =
        response.headers?.get?.("retry-after") ||
        response.headers?.get?.("Retry-After");
      const retryAfterMs = resolveRetryAfterMs(retryAfterHeader);
      setVpnIpCooldown(retryAfterMs);
      return { detected: false, reason: "rate_limited" };
    }
    if (!response.ok) return { detected: false, reason: "api_error" };

    const data = await response.json();

    const signals = {
      ip: data.ip,
      country: data.country_code,
      org: data.org || "",
      asn: data.asn || "",
      timezone: data.timezone,
    };

    // Check for known VPN/datacenter ASN patterns (word boundary to avoid false positives)
    const vpnOrgPatterns = [
      /\bvpn\b/i,
      /\bproxy\b/i,
      /\btunnel\b/i,
      /\banonimi/i,
      /private\s*internet\s*access/i,
      /nordvpn/i,
      /expressvpn/i,
      /surfshark/i,
      /cyberghost/i,
      /mullvad/i,
      /protonvpn/i,
      /windscribe/i,
      /hide\.me/i,
      /hotspot\s*shield/i,
      /\bdigitalocean\b/i,
      /\bamazon.*ec2\b/i,
      /\baws\b/i,
      /google\s*cloud/i,
      /microsoft\s*(azure|corp)/i,
      /\blinode\b/i,
      /\bvultr\b/i,
      /\bhetzner\b/i,
      /\bovh\b/i,
      /\bchoopa\b/i,
      /\bhostwinds\b/i,
    ];

    const orgLower = (signals.org + " " + signals.asn).toLowerCase();
    const isVpnOrg = vpnOrgPatterns.some((pattern) => pattern.test(orgLower));

    // Check timezone mismatch
    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const ipTz = signals.timezone;
    const tzMismatch = browserTz && ipTz && browserTz !== ipTz;

    // Get timezone regions for comparison
    const browserRegion = browserTz?.split("/")[0];
    const ipRegion = ipTz?.split("/")[0];
    const regionMismatch = browserRegion && ipRegion && browserRegion !== ipRegion;

    if (isVpnOrg) {
      return {
        detected: true,
        reason: "vpn_org_detected",
        details: { org: signals.org, asn: signals.asn },
      };
    }

    if (regionMismatch) {
      return {
        detected: true,
        reason: "timezone_region_mismatch",
        details: { browserTz, ipTz },
      };
    }

    return {
      detected: false,
      signals,
      tzMismatch,
    };
  } catch (err) {
    if (err.name === "AbortError") {
      return { detected: false, reason: "timeout" };
    }
    return { detected: false, reason: "network_error" };
  }
}

/**
 * Method 3: DNS timing analysis
 * VPNs often add latency to DNS resolution
 */
async function checkDNSTiming() {
  try {
    if (shouldSkipDnsTiming()) {
      return { detected: false, reason: "dns_check_skipped" };
    }
    const domains = [
      `check-${Date.now()}.mhub-security.invalid`,
      "dns-check.mhub-security.invalid",
    ];

    const timings = [];

    for (const domain of domains) {
      const start = performance.now();
      try {
        await fetch(`https://${domain}/`, {
          mode: "no-cors",
          cache: "no-store",
          signal: AbortSignal.timeout(3000),
        });
      } catch {
        // Expected to fail
      }
      const elapsed = performance.now() - start;
      timings.push(elapsed);
    }

    // Unusually high DNS resolution time could indicate VPN tunnel
    const avgTiming = timings.reduce((a, b) => a + b, 0) / timings.length;

    return {
      detected: false,
      avgDnsTimeMs: Math.round(avgTiming),
      suspicious: avgTiming > 2000, // More than 2s is suspicious
    };
  } catch {
    return { detected: false, reason: "dns_check_failed" };
  }
}

/**
 * Method 4: Check for proxy/VPN browser extensions
 * Some VPN extensions modify navigator properties
 */
function checkBrowserExtensionSignals() {
  const signals = [];

  // Check for modified WebRTC
  try {
    if (typeof RTCPeerConnection === "undefined") {
      signals.push("webrtc_blocked"); // Some VPN extensions block WebRTC
    }
  } catch {
    signals.push("webrtc_error");
  }

  // Check for Proxy Auto-Config
  try {
    if (navigator.connection) {
      const connType = navigator.connection.type;
      if (connType === "vpn" || connType === "other") {
        signals.push("connection_type_suspicious");
      }
    }
  } catch { /* ignore */ }

  return {
    detected: signals.includes("webrtc_blocked"),
    signals,
  };
}

/**
 * Main VPN detection — combines all methods
 * Returns: { vpnDetected: boolean, confidence: 'low'|'medium'|'high', reasons: string[] }
 */
export async function detectVPN() {
  // Check in-memory cache first (not sessionStorage — avoids XSS tampering)
  if (lastVpnStatus && lastVpnStatus.timestamp && Date.now() - lastVpnStatus.timestamp < VPN_CACHE_TTL_MS) {
    return lastVpnStatus;
  }

  if (isChecking) {
    // Return last known status while a check is in progress
    return lastVpnStatus || { vpnDetected: false, confidence: "low", reasons: [] };
  }

  isChecking = true;
  const reasons = [];
  let score = 0; // 0-100 confidence score

  try {
    // Run checks in parallel
    const [webrtcResult, ipResult, extensionResult, dnsResult] = await Promise.all([
      detectWebRTCLeak().catch(() => ({ detected: false })),
      checkIPReputation().catch(() => ({ detected: false })),
      Promise.resolve(checkBrowserExtensionSignals()),
      checkDNSTiming().catch(() => ({ detected: false, suspicious: false })),
    ]);

    // Score WebRTC findings
    if (webrtcResult.detected) {
      score += 30;
      reasons.push("webrtc_leak");
    }

    // Score IP reputation
    if (ipResult.detected) {
      score += 50;
      reasons.push(ipResult.reason);
    } else if (ipResult.tzMismatch) {
      score += 20;
      reasons.push("timezone_mismatch");
    }

    // Score extension signals
    if (extensionResult.detected) {
      score += 25;
      reasons.push("browser_extension_signal");
    }
    if (extensionResult.signals.includes("webrtc_blocked")) {
      score += 15;
      reasons.push("webrtc_blocked_by_extension");
    }

    // Score DNS timing (suspicious high latency indicates tunnel)
    if (dnsResult.suspicious) {
      score += 15;
      reasons.push("dns_latency_high");
    }

    let confidence = "low";
    if (score >= 50) confidence = "high";
    else if (score >= 25) confidence = "medium";

    const result = {
      vpnDetected: score >= 40, // Threshold for blocking
      confidence,
      reasons,
      score,
      timestamp: Date.now(),
    };

    // Cache in memory only (not sessionStorage — avoids XSS tampering)
    notifyListeners(result);
    return result;
  } catch (err) {
    return { vpnDetected: false, confidence: "low", reasons: ["check_failed"], score: 0 };
  } finally {
    isChecking = false;
  }
}

/**
 * Start periodic VPN monitoring
 * Call this when app initializes
 */
export function startVPNMonitoring() {
  // Initial check
  detectVPN();

  // Periodic re-checks
  if (vpnCheckTimer) clearInterval(vpnCheckTimer);
  vpnCheckTimer = setInterval(() => {
    detectVPN();
  }, VPN_CHECK_INTERVAL_MS);

  // Check when network changes (user might toggle VPN)
  if (navigator.connection) {
    navigator.connection.addEventListener("change", () => {
      // Clear cache on network change
      lastVpnStatus = null; // Clear in-memory cache
      detectVPN();
    });
  }

  // Check when app becomes visible again
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      // Clear cache when user returns to tab
      lastVpnStatus = null; // Clear in-memory cache
      detectVPN();
    }
  });

  return () => {
    if (vpnCheckTimer) {
      clearInterval(vpnCheckTimer);
      vpnCheckTimer = null;
    }
  };
}

/**
 * Stop VPN monitoring
 */
export function stopVPNMonitoring() {
  if (vpnCheckTimer) {
    clearInterval(vpnCheckTimer);
    vpnCheckTimer = null;
  }
}

/**
 * Get current VPN status synchronously (from cache)
 */
export function getVPNStatus() {
  return lastVpnStatus || null;
}

export default {
  detectVPN,
  startVPNMonitoring,
  stopVPNMonitoring,
  onVpnStatusChange,
  getVPNStatus,
};

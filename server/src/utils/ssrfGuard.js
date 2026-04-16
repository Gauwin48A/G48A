/**
 * SSRF Guard — Validates URLs to prevent Server-Side Request Forgery
 *
 * Blocks requests to private/internal IP addresses that could be used
 * to access internal services (AWS metadata, internal APIs, etc.)
 */

const { URL } = require("url");
const net = require("net");
const dns = require("dns");
const { promisify } = require("util");

const dnsLookup = promisify(dns.lookup);

// Private/internal IP ranges to block
const PRIVATE_RANGES = [
  // Loopback
  { start: "127.0.0.0", end: "127.255.255.255" },
  // Class A private
  { start: "10.0.0.0", end: "10.255.255.255" },
  // Class B private
  { start: "172.16.0.0", end: "172.31.255.255" },
  // Class C private
  { start: "192.168.0.0", end: "192.168.255.255" },
  // Link-local
  { start: "169.254.0.0", end: "169.254.255.255" },
  // Current network
  { start: "0.0.0.0", end: "0.255.255.255" },
];

/**
 * Convert an IPv4 address to a 32-bit integer for range comparison.
 * @param {string} ip - IPv4 address string
 * @returns {number} 32-bit integer representation
 */
function ipToInt(ip) {
  return ip
    .split(".")
    .reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

/**
 * Check if an IP address falls within any private/internal range.
 * @param {string} ip - IPv4 address to check
 * @returns {boolean} True if the IP is private/internal
 */
function isPrivateIp(ip) {
  // Handle IPv6 loopback
  if (ip === "::1" || ip === "::ffff:127.0.0.1") return true;

  // Strip IPv6-mapped IPv4 prefix
  const cleanIp = ip.replace(/^::ffff:/, "");

  // Skip non-IPv4
  if (!net.isIPv4(cleanIp)) return false;

  const ipInt = ipToInt(cleanIp);
  return PRIVATE_RANGES.some(
    (range) => ipInt >= ipToInt(range.start) && ipInt <= ipToInt(range.end),
  );
}

/**
 * Validate a URL to ensure it does not target internal/private addresses.
 * Performs DNS resolution to catch DNS rebinding attacks.
 *
 * @param {string} urlString - The URL to validate
 * @returns {Promise<{safe: boolean, error?: string}>}
 */
async function validateExternalUrl(urlString) {
  try {
    const parsed = new URL(urlString);

    // Only allow HTTP(S)
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return { safe: false, error: `Blocked protocol: ${parsed.protocol}` };
    }

    const hostname = parsed.hostname;

    // Block direct IP access to private ranges
    if (net.isIP(hostname)) {
      if (isPrivateIp(hostname)) {
        return { safe: false, error: `Blocked private IP: ${hostname}` };
      }
      return { safe: true };
    }

    // Resolve hostname and check resolved IP
    try {
      const { address } = await dnsLookup(hostname);
      if (isPrivateIp(address)) {
        return {
          safe: false,
          error: `DNS resolved to private IP: ${hostname} → ${address}`,
        };
      }
    } catch {
      // DNS resolution failure — allow (fail open) but log
      console.warn(`[SSRF Guard] DNS resolution failed for: ${hostname}`);
    }

    return { safe: true };
  } catch (error) {
    return { safe: false, error: `Invalid URL: ${error.message}` };
  }
}

module.exports = { validateExternalUrl, isPrivateIp };

/**
 * Device Fingerprint Service
 * ──────────────────────────
 * Generates a persistent, unique device fingerprint that survives
 * page refreshes and browser restarts. Used to enforce one-account-per-device.
 */

const STORAGE_KEY = "mhub_device_fp";
const FALLBACK_STORAGE_KEY = "mhub_dfp_backup";

/**
 * Generate a stable hash from a string
 */
async function hashString(str) {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  // Fallback: simple hash
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36) + str.length.toString(36);
}

/**
 * Collect device signals for fingerprinting
 */
function collectSignals() {
  const signals = [];

  // Screen properties
  signals.push(`screen:${screen.width}x${screen.height}x${screen.colorDepth}`);
  signals.push(`avail:${screen.availWidth}x${screen.availHeight}`);
  signals.push(`dpr:${window.devicePixelRatio || 1}`);

  // Timezone
  signals.push(`tz:${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
  signals.push(`tzo:${new Date().getTimezoneOffset()}`);

  // Language
  signals.push(`lang:${navigator.language}`);
  signals.push(`langs:${(navigator.languages || []).join(",")}`);

  // Platform
  signals.push(`platform:${navigator.platform || "unknown"}`);
  signals.push(`cores:${navigator.hardwareConcurrency || 0}`);
  signals.push(`mem:${navigator.deviceMemory || 0}`);

  // Touch support
  signals.push(`touch:${navigator.maxTouchPoints || 0}`);

  // Canvas fingerprint
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext("2d");
    ctx.textBaseline = "top";
    ctx.font = "14px Arial";
    ctx.fillStyle = "#f60";
    ctx.fillRect(0, 0, 200, 50);
    ctx.fillStyle = "#069";
    ctx.fillText("MHub Device FP", 2, 15);
    ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
    ctx.fillText("Security Check", 4, 35);
    signals.push(`canvas:${canvas.toDataURL().slice(-50)}`);
  } catch {
    signals.push("canvas:unavailable");
  }

  // WebGL renderer
  try {
    const gl =
      document.createElement("canvas").getContext("webgl") ||
      document.createElement("canvas").getContext("experimental-webgl");
    if (gl) {
      const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
      if (debugInfo) {
        signals.push(`gpu:${gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)}`);
        signals.push(`gpuv:${gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)}`);
      }
    }
  } catch {
    signals.push("gpu:unavailable");
  }

  // Audio context fingerprint
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    signals.push(`audio:${audioCtx.sampleRate}`);
    signals.push(`audioDest:${audioCtx.destination.maxChannelCount}`);
    audioCtx.close().catch(() => {});
  } catch {
    signals.push("audio:unavailable");
  }

  // Installed plugins count (legacy but still useful)
  signals.push(`plugins:${navigator.plugins?.length || 0}`);

  // Connection type if available
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (conn) {
    signals.push(`conn:${conn.effectiveType || "unknown"}`);
  }

  return signals;
}

/**
 * Generate or retrieve a persistent device fingerprint.
 * The fingerprint is stored in localStorage and backed up in sessionStorage.
 */
export async function getDeviceFingerprint() {
  // Try to retrieve existing fingerprint
  let stored = localStorage.getItem(STORAGE_KEY);
  if (stored && stored.length > 10) {
    // Also keep a backup
    try {
      sessionStorage.setItem(FALLBACK_STORAGE_KEY, stored);
    } catch { /* ignore */ }
    return stored;
  }

  // Check fallback
  stored = sessionStorage.getItem(FALLBACK_STORAGE_KEY);
  if (stored && stored.length > 10) {
    localStorage.setItem(STORAGE_KEY, stored);
    return stored;
  }

  // Generate new fingerprint
  const signals = collectSignals();
  const raw = signals.join("|");
  const hash = await hashString(raw);

  // Add a random component for first-time uniqueness (persisted)
  const randomPart = crypto.getRandomValues
    ? Array.from(crypto.getRandomValues(new Uint8Array(8)))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
    : Math.random().toString(36).slice(2, 18);

  const fingerprint = `${hash.slice(0, 32)}-${randomPart}`;

  // Persist
  localStorage.setItem(STORAGE_KEY, fingerprint);
  try {
    sessionStorage.setItem(FALLBACK_STORAGE_KEY, fingerprint);
  } catch { /* ignore */ }

  return fingerprint;
}

/**
 * Get device info object to send with auth requests
 */
export async function getDeviceInfo() {
  const fingerprint = await getDeviceFingerprint();
  return {
    deviceFingerprint: fingerprint,
    platform: navigator.platform || "unknown",
    screenResolution: `${screen.width}x${screen.height}`,
    userAgent: navigator.userAgent,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    cores: navigator.hardwareConcurrency || 0,
    touchPoints: navigator.maxTouchPoints || 0,
  };
}

export default {
  getDeviceFingerprint,
  getDeviceInfo,
};

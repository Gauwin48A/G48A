const PARITY_STORAGE_KEY = "mhub_parity_offline_auth";

function parseParityStorageFlag(rawValue) {
  if (!rawValue) return false;
  const normalized = String(rawValue).trim().toLowerCase();
  if (normalized === "1" || normalized === "true") {
    return true;
  }
  try {
    const parsed = JSON.parse(rawValue);
    return Boolean(parsed?.enabled);
  } catch {
    return false;
  }
}

export function isParityOfflineAuthMode() {
  if (typeof window === "undefined") {
    return false;
  }

  if (window.__MHUB_ANDROID_WEB_REPLICA__ === true) {
    return true;
  }

  try {
    if (parseParityStorageFlag(window.localStorage.getItem(PARITY_STORAGE_KEY))) {
      return true;
    }
    if (parseParityStorageFlag(window.sessionStorage.getItem(PARITY_STORAGE_KEY))) {
      return true;
    }
  } catch {
    // Ignore storage access failures
  }

  const ua = String(window.navigator?.userAgent || "").toLowerCase();
  return ua.includes("mhubandroidwebreplica") || (ua.includes("android") && /\bwv\b/.test(ua));
}

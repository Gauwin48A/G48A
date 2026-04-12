/**
 * Generate a UUID using crypto.randomUUID when available,
 * otherwise fall back to a timestamp-based ID.
 * @returns {string}
 */
const generateId = () => {
  if (typeof globalThis !== "undefined" && globalThis.crypto) {
    if (typeof globalThis.crypto.randomUUID === "function") {
      return globalThis.crypto.randomUUID();
    }
    // Cryptographically secure fallback
    const bytes = new Uint8Array(16);
    globalThis.crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }
  return `dev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
};

/**
 * Get (or create) a persistent device ID stored in localStorage.
 * @returns {string} The device identifier.
 */
export const getDeviceId = () => {
  let deviceId = localStorage.getItem("mhub_device_id");
  if (!deviceId) {
    deviceId = generateId();
    localStorage.setItem("mhub_device_id", deviceId);
  }
  return deviceId;
};

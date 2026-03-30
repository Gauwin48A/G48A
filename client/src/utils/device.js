/**
 * Generate a UUID using crypto.randomUUID when available,
 * otherwise fall back to a timestamp-based ID.
 * @returns {string}
 */
const generateId = () =>
  typeof globalThis !== "undefined" &&
  globalThis.crypto &&
  typeof globalThis.crypto.randomUUID === "function"
    ? globalThis.crypto.randomUUID()
    : `dev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

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

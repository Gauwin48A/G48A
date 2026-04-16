/**
 * Biometric Auth Utility for MHub
 *
 * Uses Capacitor NativeBiometric plugin for fingerprint/face auth.
 * Falls back gracefully on web or unsupported devices.
 */
import { Capacitor } from "@capacitor/core";

let NativeBiometric = null;

/**
 * Dynamically import the biometric plugin (avoids crash on web).
 */
async function loadPlugin() {
  if (NativeBiometric) return NativeBiometric;
  if (!Capacitor.isNativePlatform()) return null;

  try {
    const mod = await import("capacitor-native-biometric");
    NativeBiometric = mod.NativeBiometric;
    return NativeBiometric;
  } catch {
    return null;
  }
}

/**
 * Check if biometric auth is available on this device.
 * @returns {Promise<{available: boolean, biometryType?: string}>}
 */
export async function isBiometricAvailable() {
  const plugin = await loadPlugin();
  if (!plugin) return { available: false };

  try {
    const result = await plugin.isAvailable();
    return {
      available: true,
      biometryType: result.biometryType === 1
        ? "fingerprint"
        : result.biometryType === 2
          ? "face"
          : result.biometryType === 3
            ? "iris"
            : "unknown",
    };
  } catch {
    return { available: false };
  }
}

/**
 * Prompt user for biometric verification.
 * @param {{ reason?: string }} opts
 * @returns {Promise<boolean>} - true if authenticated
 */
export async function verifyBiometric({ reason = "Verify your identity" } = {}) {
  const plugin = await loadPlugin();
  if (!plugin) return false;

  try {
    await plugin.verifyIdentity({ reason, title: "MHub Authentication" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Store credentials securely behind biometric lock.
 * @param {string} server - identifier (e.g., "mhub-auth")
 * @param {string} username
 * @param {string} password
 */
export async function setCredentials(server, username, password) {
  const plugin = await loadPlugin();
  if (!plugin) return false;

  try {
    await plugin.setCredentials({ username, password, server });
    return true;
  } catch {
    return false;
  }
}

/**
 * Retrieve stored credentials after biometric verification.
 * @param {string} server
 * @returns {Promise<{username: string, password: string}|null>}
 */
export async function getCredentials(server) {
  const plugin = await loadPlugin();
  if (!plugin) return null;

  try {
    const result = await plugin.getCredentials({ server });
    return { username: result.username, password: result.password };
  } catch {
    return null;
  }
}

/**
 * Delete stored credentials.
 * @param {string} server
 */
export async function deleteCredentials(server) {
  const plugin = await loadPlugin();
  if (!plugin) return false;

  try {
    await plugin.deleteCredentials({ server });
    return true;
  } catch {
    return false;
  }
}

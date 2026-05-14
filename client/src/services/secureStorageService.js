/**
 * Secure Storage Service for MHub
 *
 * Uses @capacitor/preferences for secure key-value storage on native.
 * Replaces localStorage for sensitive data (auth tokens, user IDs).
 * Falls back to localStorage on web.
 */
import { Capacitor } from "@capacitor/core";

let Preferences = null;

const DEBUG = import.meta.env.DEV;
const log = (...args) => { if (DEBUG) console.log("[SecureStorage]", ...args); };

const STORAGE_PREFIX = "mhub:";

/**
 * Dynamically import preferences plugin
 */
async function loadPlugin() {
  if (Preferences) return Preferences;
  if (!Capacitor.isNativePlatform()) return null;

  try {
    const mod = await import("@capacitor/preferences");
    Preferences = mod.Preferences;
    return Preferences;
  } catch {
    return null;
  }
}

/**
 * Store a value securely.
 * @param {string} key
 * @param {string} value
 */
export async function setSecure(key, value) {
  const plugin = await loadPlugin();
  const prefixedKey = `${STORAGE_PREFIX}${key}`;

  if (plugin) {
    try {
      await plugin.set({ key: prefixedKey, value });
      log("Set:", key);
      return true;
    } catch (err) {
      log("Set failed, falling back to localStorage:", err);
    }
  }

  // Fallback to localStorage
  try {
    localStorage.setItem(prefixedKey, value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Retrieve a stored value.
 * @param {string} key
 * @returns {Promise<string|null>}
 */
export async function getSecure(key) {
  const plugin = await loadPlugin();
  const prefixedKey = `${STORAGE_PREFIX}${key}`;

  if (plugin) {
    try {
      const result = await plugin.get({ key: prefixedKey });
      return result.value;
    } catch (err) {
      log("Get failed, falling back to localStorage:", err);
    }
  }

  // Fallback to localStorage
  try {
    return localStorage.getItem(prefixedKey);
  } catch {
    return null;
  }
}

/**
 * Remove a stored value.
 * @param {string} key
 */
export async function removeSecure(key) {
  const plugin = await loadPlugin();
  const prefixedKey = `${STORAGE_PREFIX}${key}`;

  if (plugin) {
    try {
      await plugin.remove({ key: prefixedKey });
      log("Removed:", key);
    } catch { /* silent */ }
  }

  // Also remove from localStorage (migration safety)
  try {
    localStorage.removeItem(prefixedKey);
  } catch { /* silent */ }
}

/**
 * Clear all MHub stored data.
 */
export async function clearAll() {
  const plugin = await loadPlugin();

  if (plugin) {
    try {
      // Get all keys and only remove those with our prefix
      const { keys } = await plugin.keys();
      for (const key of keys) {
        if (key.startsWith(STORAGE_PREFIX)) {
          await plugin.remove({ key });
        }
      }
      log("Cleared all MHub secure storage");
    } catch { /* silent */ }
  }

  // Also clear localStorage items with our prefix
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch { /* silent */ }
}

/**
 * Store auth token securely.
 * @param {string} token
 */
export async function setAuthToken(token) {
  return setSecure("auth_token", token);
}

/**
 * Get stored auth token.
 * @returns {Promise<string|null>}
 */
export async function getAuthToken() {
  return getSecure("auth_token");
}

/**
 * Remove auth token (logout).
 */
export async function removeAuthToken() {
  return removeSecure("auth_token");
}

/**
 * Store user ID securely.
 * @param {string} userId
 */
export async function setUserId(userId) {
  return setSecure("user_id", userId);
}

/**
 * Get stored user ID.
 * @returns {Promise<string|null>}
 */
export async function getUserIdSecure() {
  return getSecure("user_id");
}

/**
 * Store FCM/push token.
 * @param {string} token
 */
export async function setPushToken(token) {
  return setSecure("push_token", token);
}

/**
 * Get stored push token.
 * @returns {Promise<string|null>}
 */
export async function getPushToken() {
  return getSecure("push_token");
}

/**
 * Migrate localStorage tokens to secure storage (one-time).
 */
export async function migrateFromLocalStorage() {
  if (!Capacitor.isNativePlatform()) return;

  const legacyKeys = [
    { local: "mhub_auth_token", secure: "auth_token" },
    { local: "mhub_user_id", secure: "user_id" },
    { local: "fcm_token", secure: "push_token" },
  ];

  for (const { local, secure } of legacyKeys) {
    try {
      const value = localStorage.getItem(local);
      if (value) {
        await setSecure(secure, value);
        localStorage.removeItem(local);
        log(`Migrated ${local} to secure storage`);
      }
    } catch { /* silent */ }
  }
}

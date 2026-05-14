/**
 * Native Network Service for MHub
 *
 * Uses @capacitor/network for reliable network state detection.
 * Replaces navigator.onLine with proper native API.
 */
import { Capacitor } from "@capacitor/core";

let Network = null;

const DEBUG = import.meta.env.DEV;
const log = (...args) => { if (DEBUG) console.log("[NativeNetwork]", ...args); };

/** @type {Set<Function>} */
const listeners = new Set();
let currentStatus = { connected: navigator.onLine, connectionType: "unknown" };

/**
 * Dynamically import network plugin
 */
async function loadPlugin() {
  if (Network) return Network;
  if (!Capacitor.isNativePlatform()) return null;

  try {
    const mod = await import("@capacitor/network");
    Network = mod.Network;
    return Network;
  } catch {
    return null;
  }
}

/**
 * Get current network status.
 * @returns {Promise<{ connected: boolean, connectionType: string }>}
 */
export async function getNetworkStatus() {
  const plugin = await loadPlugin();
  if (!plugin) {
    return { connected: navigator.onLine, connectionType: "unknown" };
  }

  try {
    const status = await plugin.getStatus();
    currentStatus = {
      connected: status.connected,
      connectionType: status.connectionType,
    };
    return currentStatus;
  } catch {
    return { connected: navigator.onLine, connectionType: "unknown" };
  }
}

/**
 * Listen for network status changes.
 * @param {Function} callback - ({ connected, connectionType }) => void
 * @returns {Function} cleanup
 */
export async function onNetworkChange(callback) {
  listeners.add(callback);

  const plugin = await loadPlugin();
  if (plugin) {
    const listener = await plugin.addListener("networkStatusChange", (status) => {
      log("Network changed:", status.connected, status.connectionType);
      currentStatus = {
        connected: status.connected,
        connectionType: status.connectionType,
      };
      for (const cb of listeners) {
        try { cb(currentStatus); } catch { /* silent */ }
      }
    });

    return () => {
      listeners.delete(callback);
      listener.remove();
    };
  }

  // Fallback to browser events
  const onlineHandler = () => {
    currentStatus = { connected: true, connectionType: "unknown" };
    callback(currentStatus);
  };
  const offlineHandler = () => {
    currentStatus = { connected: false, connectionType: "none" };
    callback(currentStatus);
  };

  window.addEventListener("online", onlineHandler);
  window.addEventListener("offline", offlineHandler);

  return () => {
    listeners.delete(callback);
    window.removeEventListener("online", onlineHandler);
    window.removeEventListener("offline", offlineHandler);
  };
}

/**
 * Check if currently connected (synchronous check using cached status).
 */
export function isConnected() {
  return currentStatus.connected;
}

/**
 * Get connection type (wifi, cellular, none, unknown).
 */
export function getConnectionType() {
  return currentStatus.connectionType;
}

/**
 * Initialize network monitoring (call once at app startup).
 */
export async function initNetworkMonitor() {
  const status = await getNetworkStatus();
  log("Initial network status:", status);
  return status;
}

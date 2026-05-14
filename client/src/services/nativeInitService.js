/**
 * Native App Initializer for MHub
 *
 * Bootstraps all native Capacitor services when running on Android/iOS.
 * Call once from App.jsx during mount.
 */
import { Capacitor } from "@capacitor/core";
import { initNetworkMonitor, onNetworkChange } from "./nativeNetworkService";
import { initStatusBar } from "./nativeStatusBarService";
import { initKeyboardListeners } from "./nativeKeyboardService";
import { hideSplash } from "./nativeSplashService";
import {
  registerNativePush,
  registerNativeTokenWithBackend,
  setupNativePushListeners,
} from "./nativePushService";
import { migrateFromLocalStorage } from "./secureStorageService";

const DEBUG = import.meta.env.DEV;
const log = (...args) => { if (DEBUG) console.log("[NativeInit]", ...args); };

/**
 * Initialize all native services.
 * Call after React renders and auth state is known.
 *
 * @param {{ isDarkMode?: boolean, userId?: string, onNotification?: Function, onNetworkChange?: Function }} options
 * @returns {Promise<Function>} cleanup function
 */
export async function initNativeApp({
  isDarkMode = false,
  userId = null,
  onNotification,
  onNetworkChange: onNetChange,
} = {}) {
  if (!Capacitor.isNativePlatform()) {
    log("Not native platform, skipping native init");
    return () => {};
  }

  log("=== NATIVE APP INITIALIZATION ===");
  log("Platform:", Capacitor.getPlatform());

  const cleanups = [];

  try {
    // 1. Migrate from localStorage to secure storage
    await migrateFromLocalStorage();
    log("✓ Secure storage migration complete");

    // 2. Initialize status bar
    await initStatusBar(isDarkMode);
    log("✓ Status bar initialized");

    // 3. Initialize keyboard handling
    const keyboardCleanup = await initKeyboardListeners();
    cleanups.push(keyboardCleanup);
    log("✓ Keyboard listeners active");

    // 4. Initialize network monitoring
    await initNetworkMonitor();
    if (onNetChange) {
      const netCleanup = await onNetworkChange(onNetChange);
      cleanups.push(netCleanup);
    }
    log("✓ Network monitor active");

    // 5. Register for push notifications (if user logged in)
    if (userId) {
      const fcmToken = await registerNativePush();
      if (fcmToken) {
        await registerNativeTokenWithBackend(fcmToken, userId);
        log("✓ Push notifications registered, token:", fcmToken.substring(0, 20) + "...");
      }
    }

    // 6. Set up push notification listeners
    if (onNotification) {
      const pushCleanup = await setupNativePushListeners(onNotification);
      cleanups.push(pushCleanup);
      log("✓ Push listeners active");
    }

    // 7. Hide splash screen (app is ready)
    await hideSplash({ fadeOutDuration: 300 });
    log("✓ Splash screen hidden");

    log("=== NATIVE INIT COMPLETE ===");
  } catch (err) {
    log("Native init error (non-fatal):", err);
    // Still hide splash even if something failed
    await hideSplash({ fadeOutDuration: 200 });
  }

  return () => {
    for (const cleanup of cleanups) {
      try { cleanup?.(); } catch { /* silent */ }
    }
  };
}

/**
 * Check if we're running as a native app.
 */
export function isNativeApp() {
  return Capacitor.isNativePlatform();
}

/**
 * Get the platform name.
 * @returns {'android' | 'ios' | 'web'}
 */
export function getNativePlatform() {
  return Capacitor.getPlatform();
}

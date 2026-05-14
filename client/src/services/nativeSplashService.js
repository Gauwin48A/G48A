/**
 * Native Splash Screen Service for MHub
 *
 * Controls the native splash screen during app initialization.
 * Hides splash after auth check and location init are complete.
 */
import { Capacitor } from "@capacitor/core";

let SplashScreen = null;

const DEBUG = import.meta.env.DEV;
const log = (...args) => { if (DEBUG) console.log("[Splash]", ...args); };

/**
 * Dynamically import splash screen plugin
 */
async function loadPlugin() {
  if (SplashScreen) return SplashScreen;
  if (!Capacitor.isNativePlatform()) return null;

  try {
    const mod = await import("@capacitor/splash-screen");
    SplashScreen = mod.SplashScreen;
    return SplashScreen;
  } catch {
    return null;
  }
}

/**
 * Hide the splash screen.
 * @param {{ fadeOutDuration?: number }} options
 */
export async function hideSplash({ fadeOutDuration = 300 } = {}) {
  const plugin = await loadPlugin();
  if (!plugin) return;

  try {
    await plugin.hide({ fadeOutDuration });
    log("Splash hidden");
  } catch (err) {
    log("Hide splash failed:", err);
  }
}

/**
 * Show the splash screen (useful for app transitions).
 * @param {{ autoHide?: boolean, fadeInDuration?: number, showDuration?: number }} options
 */
export async function showSplash({
  autoHide = true,
  fadeInDuration = 200,
  showDuration = 2000,
} = {}) {
  const plugin = await loadPlugin();
  if (!plugin) return;

  try {
    await plugin.show({ autoHide, fadeInDuration, showDuration });
    log("Splash shown");
  } catch (err) {
    log("Show splash failed:", err);
  }
}

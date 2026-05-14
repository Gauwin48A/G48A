/**
 * Native Status Bar Service for MHub
 *
 * Controls Android/iOS status bar appearance (color, style, visibility).
 * Falls back silently on web.
 */
import { Capacitor } from "@capacitor/core";

let StatusBar = null;
let Style = null;

const DEBUG = import.meta.env.DEV;
const log = (...args) => { if (DEBUG) console.log("[StatusBar]", ...args); };

/**
 * Dynamically import status-bar plugin
 */
async function loadPlugin() {
  if (StatusBar) return { StatusBar, Style };
  if (!Capacitor.isNativePlatform()) return null;

  try {
    const mod = await import("@capacitor/status-bar");
    StatusBar = mod.StatusBar;
    Style = mod.Style;
    return { StatusBar, Style };
  } catch {
    return null;
  }
}

/**
 * Set status bar to dark content (light background).
 * Use for light themes.
 */
export async function setLightStatusBar() {
  const plugins = await loadPlugin();
  if (!plugins) return;

  try {
    await plugins.StatusBar.setStyle({ style: plugins.Style.Light });
    await plugins.StatusBar.setBackgroundColor({ color: "#FFFFFF" });
    log("Set light status bar");
  } catch { /* silent */ }
}

/**
 * Set status bar to light content (dark background).
 * Use for dark themes.
 */
export async function setDarkStatusBar() {
  const plugins = await loadPlugin();
  if (!plugins) return;

  try {
    await plugins.StatusBar.setStyle({ style: plugins.Style.Dark });
    await plugins.StatusBar.setBackgroundColor({ color: "#1a1a2e" });
    log("Set dark status bar");
  } catch { /* silent */ }
}

/**
 * Set status bar background color.
 * @param {string} color - Hex color (e.g., "#16a34a" for green)
 */
export async function setStatusBarColor(color) {
  const plugins = await loadPlugin();
  if (!plugins) return;

  try {
    await plugins.StatusBar.setBackgroundColor({ color });
    log("Set color:", color);
  } catch { /* silent */ }
}

/**
 * Hide the status bar (for fullscreen experiences).
 */
export async function hideStatusBar() {
  const plugins = await loadPlugin();
  if (!plugins) return;

  try {
    await plugins.StatusBar.hide();
  } catch { /* silent */ }
}

/**
 * Show the status bar.
 */
export async function showStatusBar() {
  const plugins = await loadPlugin();
  if (!plugins) return;

  try {
    await plugins.StatusBar.show();
  } catch { /* silent */ }
}

/**
 * Set status bar to overlay content (transparent background).
 * @param {boolean} overlay
 */
export async function setOverlaysWebView(overlay) {
  const plugins = await loadPlugin();
  if (!plugins) return;

  try {
    await plugins.StatusBar.setOverlaysWebView({ overlay });
  } catch { /* silent */ }
}

/**
 * Initialize status bar based on current theme.
 * @param {boolean} isDark - Whether dark mode is active
 */
export async function initStatusBar(isDark = false) {
  if (!Capacitor.isNativePlatform()) return;

  if (isDark) {
    await setDarkStatusBar();
  } else {
    await setLightStatusBar();
  }
}

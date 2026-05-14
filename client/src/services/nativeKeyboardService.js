/**
 * Native Keyboard Service for MHub
 *
 * Handles keyboard events for proper form/chat UX on Android.
 * Prevents content from being hidden behind the keyboard.
 */
import { Capacitor } from "@capacitor/core";

let Keyboard = null;

const DEBUG = import.meta.env.DEV;
const log = (...args) => { if (DEBUG) console.log("[NativeKeyboard]", ...args); };

/**
 * Dynamically import keyboard plugin
 */
async function loadPlugin() {
  if (Keyboard) return Keyboard;
  if (!Capacitor.isNativePlatform()) return null;

  try {
    const mod = await import("@capacitor/keyboard");
    Keyboard = mod.Keyboard;
    return Keyboard;
  } catch {
    return null;
  }
}

/**
 * Initialize keyboard listeners for scroll/resize behavior.
 * @param {{ onShow?: Function, onHide?: Function }} callbacks
 * @returns {Function} cleanup
 */
export async function initKeyboardListeners({ onShow, onHide } = {}) {
  const plugin = await loadPlugin();
  if (!plugin) return () => {};

  const showListener = await plugin.addListener("keyboardWillShow", (info) => {
    log("Keyboard showing, height:", info.keyboardHeight);
    document.documentElement.style.setProperty(
      "--keyboard-height",
      `${info.keyboardHeight}px`
    );
    document.body.classList.add("keyboard-open");
    onShow?.(info.keyboardHeight);
  });

  const hideListener = await plugin.addListener("keyboardWillHide", () => {
    log("Keyboard hiding");
    document.documentElement.style.setProperty("--keyboard-height", "0px");
    document.body.classList.remove("keyboard-open");
    onHide?.();
  });

  return () => {
    showListener.remove();
    hideListener.remove();
  };
}

/**
 * Hide the keyboard programmatically.
 */
export async function hideKeyboard() {
  const plugin = await loadPlugin();
  if (!plugin) return;

  try {
    await plugin.hide();
  } catch { /* silent */ }
}

/**
 * Show the keyboard programmatically.
 */
export async function showKeyboard() {
  const plugin = await loadPlugin();
  if (!plugin) return;

  try {
    await plugin.show();
  } catch { /* silent */ }
}

/**
 * Set keyboard accessory bar visibility (iOS).
 * @param {boolean} isVisible
 */
export async function setAccessoryBarVisible(isVisible) {
  const plugin = await loadPlugin();
  if (!plugin) return;

  try {
    await plugin.setAccessoryBarVisible({ isVisible });
  } catch { /* silent */ }
}

/**
 * Enable/disable keyboard scroll (Android).
 * @param {boolean} isDisabled
 */
export async function setScroll(isDisabled) {
  const plugin = await loadPlugin();
  if (!plugin) return;

  try {
    await plugin.setScroll({ isDisabled });
  } catch { /* silent */ }
}

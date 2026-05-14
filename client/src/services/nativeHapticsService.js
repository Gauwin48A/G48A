/**
 * Native Haptics Service for MHub
 *
 * Provides haptic feedback on native devices for better touch UX.
 * Falls back silently on web.
 */
import { Capacitor } from "@capacitor/core";

let Haptics = null;
let ImpactStyle = null;
let NotificationType = null;

/**
 * Dynamically import haptics plugin
 */
async function loadPlugin() {
  if (Haptics) return { Haptics, ImpactStyle, NotificationType };
  if (!Capacitor.isNativePlatform()) return null;

  try {
    const mod = await import("@capacitor/haptics");
    Haptics = mod.Haptics;
    ImpactStyle = mod.ImpactStyle;
    NotificationType = mod.NotificationType;
    return { Haptics, ImpactStyle, NotificationType };
  } catch {
    return null;
  }
}

/**
 * Light haptic impact - for button taps, toggles.
 */
export async function impactLight() {
  const plugins = await loadPlugin();
  if (!plugins) return;
  try {
    await plugins.Haptics.impact({ style: plugins.ImpactStyle.Light });
  } catch { /* silent */ }
}

/**
 * Medium haptic impact - for pull-to-refresh trigger, selection.
 */
export async function impactMedium() {
  const plugins = await loadPlugin();
  if (!plugins) return;
  try {
    await plugins.Haptics.impact({ style: plugins.ImpactStyle.Medium });
  } catch { /* silent */ }
}

/**
 * Heavy haptic impact - for destructive actions, confirmations.
 */
export async function impactHeavy() {
  const plugins = await loadPlugin();
  if (!plugins) return;
  try {
    await plugins.Haptics.impact({ style: plugins.ImpactStyle.Heavy });
  } catch { /* silent */ }
}

/**
 * Success notification haptic.
 */
export async function notifySuccess() {
  const plugins = await loadPlugin();
  if (!plugins) return;
  try {
    await plugins.Haptics.notification({ type: plugins.NotificationType.Success });
  } catch { /* silent */ }
}

/**
 * Warning notification haptic.
 */
export async function notifyWarning() {
  const plugins = await loadPlugin();
  if (!plugins) return;
  try {
    await plugins.Haptics.notification({ type: plugins.NotificationType.Warning });
  } catch { /* silent */ }
}

/**
 * Error notification haptic.
 */
export async function notifyError() {
  const plugins = await loadPlugin();
  if (!plugins) return;
  try {
    await plugins.Haptics.notification({ type: plugins.NotificationType.Error });
  } catch { /* silent */ }
}

/**
 * Selection changed haptic - for scrolling through lists/pickers.
 */
export async function selectionChanged() {
  const plugins = await loadPlugin();
  if (!plugins) return;
  try {
    await plugins.Haptics.selectionChanged();
  } catch { /* silent */ }
}

/**
 * Start a continuous selection haptic (for drag gestures).
 */
export async function selectionStart() {
  const plugins = await loadPlugin();
  if (!plugins) return;
  try {
    await plugins.Haptics.selectionStart();
  } catch { /* silent */ }
}

/**
 * End a continuous selection haptic.
 */
export async function selectionEnd() {
  const plugins = await loadPlugin();
  if (!plugins) return;
  try {
    await plugins.Haptics.selectionEnd();
  } catch { /* silent */ }
}

/**
 * Custom vibration pattern.
 * @param {{ duration?: number }} options
 */
export async function vibrate({ duration = 300 } = {}) {
  const plugins = await loadPlugin();
  if (!plugins) return;
  try {
    await plugins.Haptics.vibrate({ duration });
  } catch { /* silent */ }
}

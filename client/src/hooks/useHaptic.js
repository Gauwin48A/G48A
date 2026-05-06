import { useCallback } from "react";
import { Capacitor } from "@capacitor/core";

let HapticsModule = null;

// Lazy-load Capacitor Haptics only on native
async function getHaptics() {
  if (HapticsModule) return HapticsModule;
  if (Capacitor.isNativePlatform()) {
    try {
      const mod = await import(/* @vite-ignore */ "@capacitor/haptics");
      HapticsModule = mod.Haptics;
      return HapticsModule;
    } catch { /* not available */ }
  }
  return null;
}

/**
 * Haptic feedback hook — uses Capacitor on native, navigator.vibrate on PWA.
 */
export function useHaptic() {
  const light = useCallback(async () => {
    const h = await getHaptics();
    if (h) {
      h.impact({ style: "light" });
    } else if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  }, []);

  const medium = useCallback(async () => {
    const h = await getHaptics();
    if (h) {
      h.impact({ style: "medium" });
    } else if (navigator.vibrate) {
      navigator.vibrate(20);
    }
  }, []);

  const success = useCallback(async () => {
    const h = await getHaptics();
    if (h) {
      h.notification({ type: "success" });
    } else if (navigator.vibrate) {
      navigator.vibrate([10, 50, 10]);
    }
  }, []);

  return { light, medium, success };
}

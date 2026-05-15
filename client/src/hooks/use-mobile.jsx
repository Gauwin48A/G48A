import { useState, useEffect } from "react";

const MOBILE_BREAKPOINT = 768;

/**
 * Returns true if viewport is ≤ 767px (responsive mobile layout).
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(undefined);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);

    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);

    return () => {
      mql.removeEventListener("change", onChange);
    };
  }, []);

  return !!isMobile;
}

/**
 * Returns true when running inside a Capacitor native app (Android/iOS).
 * Safe to call on web — always returns false there.
 */
export function useIsNativeApp() {
  try {
    if (
      typeof window !== "undefined" &&
      window.Capacitor &&
      typeof window.Capacitor.isNativePlatform === "function"
    ) {
      return window.Capacitor.isNativePlatform();
    }
  } catch {
    // swallow — not in a Capacitor context
  }
  return false;
}

/**
 * Returns the current platform: 'android' | 'ios' | 'web'.
 */
export function useNativePlatform() {
  try {
    if (
      typeof window !== "undefined" &&
      window.Capacitor &&
      typeof window.Capacitor.getPlatform === "function"
    ) {
      return window.Capacitor.getPlatform();
    }
  } catch {
    // swallow
  }
  return "web";
}

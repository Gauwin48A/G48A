/**
 * Deep Link Handler for MHub
 *
 * Handles mhub://post/:id and https://mhub.app/post/:id deep links.
 * Should be called once from App-level component.
 */
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

/**
 * Initialize deep link listener.
 * @param {Function} navigate - React Router navigate function
 * @returns {Function} cleanup function
 */
export function initDeepLinkListener(navigate) {
  if (!Capacitor.isNativePlatform()) return () => {};

  const listener = App.addListener("appUrlOpen", (event) => {
    const url = event.url || "";

    // Handle mhub://post/:id
    const customSchemeMatch = url.match(/mhub:\/\/post\/([^/?#]+)/);
    if (customSchemeMatch) {
      navigate(`/post/${customSchemeMatch[1]}`);
      return;
    }

    // Handle https://mhub.app/... or similar web URLs
    try {
      const parsed = new URL(url);
      const path = parsed.pathname;

      // Route mapping for deep links
      const routePatterns = [
        { pattern: /^\/post\/([^/?#]+)/, target: (m) => `/post/${m[1]}` },
        { pattern: /^\/feed\/([^/?#]+)/, target: (m) => `/feed/${m[1]}` },
        { pattern: /^\/signup/, target: () => `/signup${parsed.search}` },
        { pattern: /^\/rewards/, target: () => "/rewards" },
        { pattern: /^\/tier-selection/, target: () => "/tier-selection" },
      ];

      for (const { pattern, target } of routePatterns) {
        const match = path.match(pattern);
        if (match) {
          navigate(target(match));
          return;
        }
      }

      // Fallback: navigate to path as-is
      if (path && path !== "/") {
        navigate(path);
      }
    } catch {
      // Invalid URL, ignore
    }
  });

  return () => {
    listener.then((l) => l.remove());
  };
}

/**
 * Deep Link Handler for MHub
 *
 * Handles mhub://... and https://mhub.app/... deep links.
 * Covers ALL app routes: marketplace, feed, chat, centre, channels, etc.
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

    // Handle mhub:// custom scheme
    const customSchemeMatch = url.match(/mhub:\/\/(.+)/);
    if (customSchemeMatch) {
      const path = customSchemeMatch[1];
      const resolved = resolveDeepLinkPath(path);
      if (resolved) {
        navigate(resolved);
        return;
      }
    }

    // Handle https://mhub.app/... or similar web URLs
    try {
      const parsed = new URL(url);
      const path = parsed.pathname;
      const search = parsed.search || "";

      const resolved = resolveDeepLinkPath(path.replace(/^\//, ""), search);
      if (resolved) {
        navigate(resolved);
        return;
      }

      // Fallback: navigate to path as-is
      if (path && path !== "/") {
        navigate(path + search);
      }
    } catch {
      // Invalid URL, ignore
    }
  });

  return () => {
    listener.then((l) => l.remove());
  };
}

/**
 * Resolve a deep link path segment to an internal route.
 * @param {string} path - Path without leading slash (e.g., "post/123")
 * @param {string} search - Query string (e.g., "?ref=abc")
 * @returns {string|null} Resolved route or null
 */
function resolveDeepLinkPath(path, search = "") {
  if (!path) return null;

  // Comprehensive route mapping for all 4 apps in 1
  const routes = [
    // === MARKETPLACE ===
    { pattern: /^post\/([^/?#]+)/, target: (m) => `/post/${m[1]}` },
    { pattern: /^listing\/([^/?#]+)/, target: (m) => `/post/${m[1]}` },
    { pattern: /^all-posts/, target: () => "/all-posts" },
    { pattern: /^listings/, target: () => "/all-posts" },
    { pattern: /^add-post/, target: () => "/add-post" },
    { pattern: /^sell/, target: () => "/add-post" },
    { pattern: /^edit-post\/([^/?#]+)/, target: (m) => `/edit-post/${m[1]}` },
    { pattern: /^category-hub/, target: () => "/category-hub" },
    { pattern: /^categories\/([^/?#]+)/, target: (m) => `/categories/${m[1]}` },
    { pattern: /^categories/, target: () => "/categories" },
    { pattern: /^subcategories/, target: () => "/subcategories" },
    { pattern: /^search/, target: () => `/search${search}` },
    { pattern: /^nearby/, target: () => "/nearby" },
    { pattern: /^compare/, target: () => "/compare" },
    { pattern: /^wishlist/, target: () => "/wishlist" },
    { pattern: /^cart/, target: () => "/cart" },
    { pattern: /^offers/, target: () => "/offers" },
    { pattern: /^buyer-view/, target: () => "/buyer-view" },
    { pattern: /^bought-posts/, target: () => "/bought-posts" },
    { pattern: /^sold-posts/, target: () => "/sold-posts" },
    { pattern: /^saledone/, target: () => "/saledone" },
    { pattern: /^saleundone/, target: () => "/saleundone" },
    { pattern: /^for-you/, target: () => "/for-you" },
    { pattern: /^recently-viewed/, target: () => "/recently-viewed" },
    { pattern: /^saved-searches/, target: () => "/saved-searches" },

    // === SOCIAL / FEED ===
    { pattern: /^feed\/([^/?#]+)/, target: (m) => `/feed/${m[1]}` },
    { pattern: /^feed/, target: () => "/feed" },
    { pattern: /^my-feed/, target: () => "/my-feed" },
    { pattern: /^public-wall/, target: () => "/public-wall" },

    // === CHAT ===
    { pattern: /^chat/, target: () => "/chat" },
    { pattern: /^chats/, target: () => "/chat" },

    // === CENTRE (Business Hub) ===
    { pattern: /^centre\/create/, target: () => "/centre/create" },
    { pattern: /^centre\/([^/?#]+)\/listings/, target: (m) => `/centre/${m[1]}/listings` },
    { pattern: /^centre\/([^/?#]+)/, target: (m) => `/centre/${m[1]}` },
    { pattern: /^centre/, target: () => "/centre" },

    // === CHANNELS ===
    { pattern: /^channels\/create/, target: () => "/channels/create" },
    { pattern: /^channels\/([^/?#]+)/, target: (m) => `/channels/${m[1]}` },
    { pattern: /^channels/, target: () => "/channels" },

    // === USER / PROFILE ===
    { pattern: /^profile\/([^/?#]+)/, target: (m) => `/profile/${m[1]}` },
    { pattern: /^profile/, target: () => "/profile" },
    { pattern: /^dashboard/, target: () => "/dashboard" },
    { pattern: /^activity/, target: () => "/activity" },
    { pattern: /^notifications/, target: () => "/notifications" },
    { pattern: /^security/, target: () => "/security" },

    // === PAYMENTS / TIERS ===
    { pattern: /^payment/, target: () => "/payment" },
    { pattern: /^tier-selection/, target: () => "/tier-selection" },
    { pattern: /^tiers/, target: () => "/tier-selection" },
    { pattern: /^pricing/, target: () => "/tier-selection" },

    // === REWARDS / REFERRAL ===
    { pattern: /^rewards/, target: () => "/rewards" },
    { pattern: /^invite\/([^/?#]+)/, target: (m) => `/invite/${m[1]}` },

    // === VERIFICATION ===
    { pattern: /^kyc/, target: () => "/kyc" },
    { pattern: /^verification/, target: () => "/verification" },
    { pattern: /^aadhaar-verify/, target: () => "/aadhaar-verify" },
    { pattern: /^get-verified/, target: () => "/get-verified" },

    // === REVIEWS / ANALYTICS ===
    { pattern: /^reviews\/([^/?#]+)/, target: (m) => `/reviews/${m[1]}` },
    { pattern: /^analytics/, target: () => "/analytics" },

    // === AUTH ===
    { pattern: /^login/, target: () => "/login" },
    { pattern: /^signup/, target: () => `/signup${search}` },
    { pattern: /^forgot-password/, target: () => "/forgot-password" },
    { pattern: /^reset-password\/([^/?#]+)/, target: (m) => `/reset-password/${m[1]}` },

    // === LEGAL ===
    { pattern: /^terms/, target: () => "/terms" },
    { pattern: /^privacy-policy/, target: () => "/privacy-policy" },
    { pattern: /^refund-policy/, target: () => "/refund-policy" },

    // === MISC ===
    { pattern: /^complaints/, target: () => "/complaints" },
    { pattern: /^feedback/, target: () => "/feedback" },
    { pattern: /^home/, target: () => "/home" },
    { pattern: /^my-home/, target: () => "/my-home" },
    { pattern: /^my-posts/, target: () => "/my-posts" },
  ];

  for (const { pattern, target } of routes) {
    const match = path.match(pattern);
    if (match) {
      return target(match);
    }
  }

  return null;
}

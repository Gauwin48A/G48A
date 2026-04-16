/**
 * Navigation utilities for MHub
 * Provides reliable back navigation and route history management
 */

export const DEFAULT_BACK_FALLBACK = "/all-posts";
export const LAST_ROUTE_KEY = "mhub:lastRoute";
export const ROUTE_HISTORY_KEY = "mhub:routeHistory";
export const MAX_HISTORY_LENGTH = 10;

/**
 * Protected routes that should not be used as fallback destinations
 */
const PROTECTED_ROUTES = new Set([
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
]);

/**
 * Check if current browser history allows back navigation
 */
export const canNavigateBack = () => {
  if (typeof window === "undefined") return false;
  
  // Check React Router's history index
  const historyIndex =
    typeof window.history?.state?.idx === "number"
      ? window.history.state.idx
      : null;
  
  if (historyIndex !== null) {
    return historyIndex > 0;
  }
  
  // Fallback to browser history length
  return window.history.length > 1;
};

/**
 * Get the last safe route from session storage
 */
export const getLastSafeRoute = () => {
  if (typeof window === "undefined") return null;
  
  try {
    const lastRoute = sessionStorage.getItem(LAST_ROUTE_KEY);
    const current = `${window.location.pathname}${window.location.search}`;
    
    // Don't return the same route or protected routes
    if (lastRoute && lastRoute !== current && !PROTECTED_ROUTES.has(lastRoute.split("?")[0])) {
      return lastRoute;
    }
    
    // Try to get from route history
    const historyJson = sessionStorage.getItem(ROUTE_HISTORY_KEY);
    if (historyJson) {
      const history = JSON.parse(historyJson);
      // Find the most recent safe route that isn't current
      for (let i = history.length - 1; i >= 0; i--) {
        const route = history[i];
        if (route !== current && !PROTECTED_ROUTES.has(route.split("?")[0])) {
          return route;
        }
      }
    }
  } catch {
    // Ignore storage/parse errors
  }
  
  return null;
};

/**
 * Save current route to history
 */
export const saveRouteToHistory = (route) => {
  if (typeof window === "undefined" || !route) return;
  
  // Don't save protected routes
  const basePath = route.split("?")[0];
  if (PROTECTED_ROUTES.has(basePath)) return;
  
  try {
    // Update last route
    sessionStorage.setItem(LAST_ROUTE_KEY, route);
    
    // Update route history
    const historyJson = sessionStorage.getItem(ROUTE_HISTORY_KEY);
    let history = historyJson ? JSON.parse(historyJson) : [];
    
    // Remove duplicate if exists
    history = history.filter(r => r !== route);
    
    // Add new route
    history.push(route);
    
    // Keep history within limit
    if (history.length > MAX_HISTORY_LENGTH) {
      history = history.slice(-MAX_HISTORY_LENGTH);
    }
    
    sessionStorage.setItem(ROUTE_HISTORY_KEY, JSON.stringify(history));
  } catch {
    // Ignore storage errors
  }
};

/**
 * Navigate back with intelligent fallback
 * @param {Function} navigate - React Router navigate function
 * @param {string} fallback - Fallback route if no back navigation possible
 */
export const navigateBack = (navigate, fallback = DEFAULT_BACK_FALLBACK) => {
  if (typeof navigate !== "function") return;
  
  // First try browser back
  if (canNavigateBack()) {
    navigate(-1);
    return;
  }
  
  // Try last safe route from storage
  const lastSafeRoute = getLastSafeRoute();
  if (lastSafeRoute) {
    navigate(lastSafeRoute);
    return;
  }
  
  // Final fallback
  navigate(fallback);
};

/**
 * Navigate to a route and save the current route to history
 * @param {Function} navigate - React Router navigate function
 * @param {string} to - Destination route
 * @param {Object} options - Navigation options
 */
export const navigateTo = (navigate, to, options = {}) => {
  if (typeof navigate !== "function" || !to) return;
  
  // Save current route before navigating
  if (typeof window !== "undefined") {
    const current = `${window.location.pathname}${window.location.search}`;
    saveRouteToHistory(current);
  }
  
  navigate(to, options);
};

/**
 * Clear navigation history (useful for logout)
 */
export const clearNavigationHistory = () => {
  if (typeof window === "undefined") return;
  
  try {
    sessionStorage.removeItem(LAST_ROUTE_KEY);
    sessionStorage.removeItem(ROUTE_HISTORY_KEY);
  } catch {
    // Ignore storage errors
  }
};

export default {
  DEFAULT_BACK_FALLBACK,
  LAST_ROUTE_KEY,
  ROUTE_HISTORY_KEY,
  canNavigateBack,
  getLastSafeRoute,
  saveRouteToHistory,
  navigateBack,
  navigateTo,
  clearNavigationHistory,
};

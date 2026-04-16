import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import {
  beginRouteSession,
  endRouteSession,
  trackRouteAction,
} from "@/lib/uxTelemetry";
import { saveRouteToHistory } from "@/utils/navigation";

const SCROLL_KEY_PREFIX = "mhub:scroll:";
const LAST_ROUTE_KEY = "mhub:lastRoute";

const buildScrollKey = (location) =>
  location?.key
    ? `${SCROLL_KEY_PREFIX}${location.key}`
    : `${SCROLL_KEY_PREFIX}${location?.pathname || ""}${location?.search || ""}`;

const getActionLabel = (element) => {
  const uxLabel = String(
    element.getAttribute("data-ux-action-label") || ""
  ).trim();
  if (uxLabel) return uxLabel.slice(0, 120);

  const ariaLabel = String(element.getAttribute("aria-label") || "").trim();
  if (ariaLabel) return ariaLabel.slice(0, 120);

  const textContent = String(element.textContent || "")
    .replace(/\s+/g, " ")
    .trim();
  return textContent ? textContent.slice(0, 120) : "";
};

const getHref = (element) =>
  String(element.getAttribute("href") || "")
    .trim()
    .slice(0, 240);

const RouteTelemetry = () => {
  const location = useLocation();
  const { key, pathname, search, state } = location;
  const navigationType = useNavigationType();
  const navSwitchTimerRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    window.__MHUB_NAV_SWITCHING = true;
    if (navSwitchTimerRef.current) {
      clearTimeout(navSwitchTimerRef.current);
    }
    navSwitchTimerRef.current = window.setTimeout(() => {
      window.__MHUB_NAV_SWITCHING = false;
      navSwitchTimerRef.current = null;
    }, 800);
    return () => {
      if (navSwitchTimerRef.current) {
        clearTimeout(navSwitchTimerRef.current);
        navSwitchTimerRef.current = null;
      }
      window.__MHUB_NAV_SWITCHING = false;
    };
  }, [pathname, search]);

  // Track route sessions
  useEffect(() => {
    beginRouteSession({
      pathname,
      search,
    });

    return () => {
      endRouteSession("route_change");
    };
  }, [pathname, search]);

  // Store scroll position and last route on navigation
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const currentPath = `${pathname}${search}`;
    const scrollKey = buildScrollKey({ key, pathname, search });
    saveRouteToHistory(currentPath);
    return () => {
      try {
        sessionStorage.setItem(scrollKey, String(window.scrollY));
        sessionStorage.setItem(LAST_ROUTE_KEY, currentPath);
      } catch {
        // Ignore storage errors (private mode / quota)
      }
    };
  }, [key, pathname, search]);

  // Restore scroll position on back/forward navigation
  useEffect(() => {
    if (typeof window === "undefined") return;
    const preserveScroll = Boolean(state?.preserveScroll);
    if (preserveScroll && navigationType !== "POP") {
      return;
    }
    try {
      const currentPath = `${pathname}${search}`;
      const lastRoute = sessionStorage.getItem(LAST_ROUTE_KEY) || "";
      if (lastRoute === currentPath && navigationType !== "POP") {
        return;
      }
    } catch {
      // ignore storage read errors
    }
    try {
      const stored = sessionStorage.getItem(buildScrollKey({ key, pathname, search }));
      if (navigationType === "POP" && stored !== null) {
        const y = Number.parseInt(stored, 10);
        if (Number.isFinite(y)) {
          requestAnimationFrame(() => window.scrollTo(0, y));
          return;
        }
      }
      window.scrollTo(0, 0);
    } catch {
      window.scrollTo(0, 0);
    }
  }, [key, pathname, search, navigationType, state]);

  // Track UI clicks
  useEffect(() => {
    const handleClick = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const actionElement = target.closest(
        'button, a, [role="button"], [data-ux-action]'
      );
      if (!actionElement) return;

      const actionName =
        String(actionElement.getAttribute("data-ux-action") || "").trim() ||
        "ui_click";

      trackRouteAction(actionName, {
        label: getActionLabel(actionElement),
        element: actionElement.tagName.toLowerCase(),
        href: getHref(actionElement),
      });
    };

    document.addEventListener("click", handleClick, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
    };
  }, []);

  // Track visibility and pagehide
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        endRouteSession("hidden");
      } else if (document.visibilityState === "visible") {
        beginRouteSession({
          pathname: window.location.pathname,
          search: window.location.search,
        });
      }
    };

    const handlePageHide = () => {
      endRouteSession("pagehide");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, []);

  return null;
};

export default RouteTelemetry;

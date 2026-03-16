import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  beginRouteSession,
  endRouteSession,
  trackRouteAction,
} from "@/lib/uxTelemetry";

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

  // Track route sessions
  useEffect(() => {
    beginRouteSession({
      pathname: location.pathname,
      search: location.search,
    });

    return () => {
      endRouteSession("route_change");
    };
  }, [location.pathname, location.search]);

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

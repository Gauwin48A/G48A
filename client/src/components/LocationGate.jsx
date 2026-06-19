import React, { useEffect, useState } from "react";
import { useLocation as useRouterLocation } from "react-router-dom";
import { useLocation } from "../context/LocationContext";
import { getDeviceInfo } from "../utils/deviceInfo";
import {
  MapPin,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Smartphone,
  Crosshair,
  Wifi,
  Globe,
} from "lucide-react";
import { buildApiPath } from "@/lib/networkConfig";
import { buildRequestSecurity } from "@/lib/requestSecurity";
import { readUserCity } from "@/utils/locationCache";

const DEVICE_INFO_KEY = "mhub_device_info_sent";

const getAccuracyBadge = (provider, accuracy) => {
  const prov = String(provider || "").toLowerCase();
  if (prov === "ip_fallback") {
    return { label: "City-level (IP)", icon: Globe, color: "#f59e0b" };
  }
  if (prov.includes("cache") || prov === "network") {
    return { label: "Cached (Network)", icon: Wifi, color: "#3b82f6" };
  }
  if (accuracy && accuracy <= 30) {
    return { label: "Precise (GPS)", icon: Crosshair, color: "#22c55e" };
  }
  if (accuracy && accuracy <= 100) {
    return { label: "Good (GPS)", icon: Crosshair, color: "#84cc16" };
  }
  if (accuracy && accuracy <= 500) {
    return { label: "Moderate (GPS)", icon: Wifi, color: "#3b82f6" };
  }
  if (accuracy && accuracy <= 5000) {
    return { label: "Approximate", icon: Wifi, color: "#f59e0b" };
  }
  return { label: "GPS", icon: Crosshair, color: "#6b7280" };
};

function LocationGate({ children }) {
  const {
    loading,
    error,
    permissionGranted,
    permissionDenied,
    requestLocation,
    forceRefreshLocation,
    city,
    area,
    locality,
    colony,
    village,
    suburb,
    accuracy,
    provider,
    lastRefreshedAt,
    isStaleLocation,
    userSkipped,
  } = useLocation();

  const [deviceInfoSent, setDeviceInfoSent] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [bypassed, setBypassed] = useState(false);
  const [badgeDismissed, setBadgeDismissed] = useState(false);
  const userAgent =
    typeof navigator !== "undefined" ? String(navigator.userAgent || "").toLowerCase() : "";
  const isAndroidReplicaFlag =
    typeof window !== "undefined" && window.__MHUB_ANDROID_WEB_REPLICA__ === true;
  const isAndroidReplicaWebView =
    isAndroidReplicaFlag ||
    userAgent.includes("mhubandroidwebreplica") ||
    (userAgent.includes("android") && /\bwv\b/.test(userAgent));

  // Routes where the floating accuracy badge should be hidden because it
  // overlaps the primary CTA (auth/onboarding flows have no bottom-nav).
  const routerLoc = useRouterLocation();
  const HIDE_BADGE_ROUTES = [
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/aadhaar-verify",
    "/tier-selection",
  ];
  const shouldHideBadge =
    badgeDismissed ||
    isAndroidReplicaWebView ||
    HIDE_BADGE_ROUTES.some((p) => (routerLoc?.pathname || "").startsWith(p));
  const shouldBypassGate = bypassed || Boolean(userSkipped) || isAndroidReplicaWebView;

  const isWebDriver =
    typeof navigator !== "undefined" && navigator.webdriver;

  useEffect(() => {
    if (isWebDriver) {
      setBypassed(true);
    }
  }, [isWebDriver]);

  // Auto-bypass after 5 seconds so app loads while GPS continues
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading && !permissionGranted) {
        if (import.meta.env.DEV) {
          console.log(
            "[LocationGate] Auto-bypassing after 5 seconds - app will load while GPS continues in background",
          );
        }
        setBypassed(true);
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [loading, permissionGranted]);

  // Send device info once per session
  useEffect(() => {
    if (sessionStorage.getItem(DEVICE_INFO_KEY) === "1") {
      setDeviceInfoSent(true);
      return;
    }
    if (!deviceInfoSent) {
      sendDeviceInfo();
      setDeviceInfoSent(true);
    }
  }, [deviceInfoSent]);

  const sendDeviceInfo = async () => {
    try {
      const info = getDeviceInfo();
      const security = buildRequestSecurity();
      await fetch(buildApiPath("/analytics/device"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...security.headers,
        },
        credentials: "include",
        body: JSON.stringify({
          ...info,
          ...security.body,
        }),
      });
      sessionStorage.setItem(DEVICE_INFO_KEY, "1");
      if (import.meta.env.DEV) console.log("[LocationGate] Device info sent:", info.fingerprint);
    } catch (err) {
      if (import.meta.env.DEV) console.error("[LocationGate] Failed to send device info:", err);
    }
  };

  const handleRetry = async () => {
    setRetrying(true);
    try {
      // Use forceRefresh to bypass all caches for a truly fresh GPS fix
      if (forceRefreshLocation) {
        await forceRefreshLocation();
      } else {
        await requestLocation();
      }
    } catch {
      // Error state is handled by LocationContext
    } finally {
      setRetrying(false);
    }
  };

  // L10: Accuracy badge component -- pill with detection state and dismiss button
  const AccuracyBadge = () => {
    if (!permissionGranted && !bypassed) return null;
    if (shouldHideBadge) return null;
    const badge = getAccuracyBadge(provider, accuracy);
    const BadgeIcon = badge.icon;
    const ageText = lastRefreshedAt
      ? (() => {
          const secs = Math.round((Date.now() - lastRefreshedAt) / 1000);
          if (secs < 60) return `${secs}s ago`;
          const mins = Math.round(secs / 60);
          return `${mins}m ago`;
        })()
      : "";
    const handleRefresh = () => {
      if (forceRefreshLocation && !loading) {
        forceRefreshLocation().catch(() => {});
      }
    };
    const labelText = loading || isStaleLocation ? "Detecting..." : (() => {
      const areaName = colony || village || suburb || locality || area || city || readUserCity() || "";
      const cleanName = areaName.replace(/\s+(mandal|district|municipality|tehsil|taluk|block)$/i, "").trim();
      const accuracyText = accuracy ? ` ±${Math.round(accuracy)}m` : "";
      const parts = [];
      if (cleanName) parts.push(cleanName);
      parts.push(badge.label + accuracyText);
      if (ageText) parts.push(ageText);
      return parts.join(" · ");
    })();
    return React.createElement(
      "div",
      { className: "location-accuracy-badge-wrap" },
      React.createElement(
        "button",
        {
          className: "location-accuracy-badge",
          style: { borderColor: badge.color, cursor: "pointer" },
          onClick: handleRefresh,
          "aria-label": "Refresh location",
          type: "button",
        },
        loading
          ? React.createElement(Loader2, { size: 12, className: "spin", style: { color: badge.color } })
          : React.createElement(BadgeIcon, { size: 12, style: { color: badge.color } }),
        React.createElement("span", { style: { color: badge.color } }, labelText),
      ),
      React.createElement(
        "button",
        {
          className: "location-accuracy-badge-close",
          onClick: () => setBadgeDismissed(true),
          "aria-label": "Hide location indicator",
          type: "button",
        },
        "×",
      ),
    );
  };

  // app renders with optional accuracy badge overlay
  if ((permissionGranted && !loading) || shouldBypassGate) {
    return React.createElement(
      React.Fragment,
      null,
      children,
      React.createElement(AccuracyBadge, null),
      React.createElement("style", null, badgeStyles),
    );
  }

  // Loading state
  if (loading) {
    return React.createElement(
      "div",
      { className: "location-gate" },
      React.createElement(
        "div",
        { className: "location-gate-content" },
        React.createElement(
          "div",
          { className: "location-gate-icon pulse" },
          React.createElement(MapPin, { size: 48 }),
        ),
        React.createElement("h1", null, "Detecting Your Location"),
        React.createElement(
          "p",
          null,
          "Using GPS for accurate location (up to 60 seconds)",
        ),
        React.createElement(
          "div",
          { className: "location-gate-loader" },
          React.createElement(Loader2, { className: "spin", size: 32 }),
        ),
        React.createElement(
          "p",
          { className: "location-gate-hint" },
          "App will load shortly even if detection takes time...",
        ),
        React.createElement(
          "button",
          {
            className: "location-gate-btn skip",
            onClick: () => setBypassed(true),
            type: "button",
          },
          "Skip for Now",
        ),
      ),
      React.createElement("style", null, gateStyles),
    );
  }

  // Permission denied
  if (permissionDenied) {
    return React.createElement(
      "div",
      { className: "location-gate denied" },
      React.createElement(
        "div",
        { className: "location-gate-content" },
        React.createElement(
          "div",
          { className: "location-gate-icon warning" },
          React.createElement(AlertTriangle, { size: 48 }),
        ),
        React.createElement("h1", null, "Location Access Required"),
        React.createElement(
          "p",
          null,
          "MHub needs your location to show nearby products and connect you with local sellers.",
        ),
        React.createElement(
          "div",
          { className: "location-gate-instructions" },
          React.createElement(
            "h3",
            null,
            React.createElement(Smartphone, { size: 20 }),
            " How to Enable Location:",
          ),
          React.createElement(
            "ol",
            null,
            React.createElement(
              "li",
              null,
              "Tap the ",
              React.createElement("strong", null, "\uD83D\uDD12 lock icon"),
              " in your browser's address bar",
            ),
            React.createElement(
              "li",
              null,
              "Find ",
              React.createElement("strong", null, "Location"),
              " setting",
            ),
            React.createElement(
              "li",
              null,
              "Change to ",
              React.createElement("strong", null, "Allow"),
            ),
            React.createElement("li", null, "Refresh this page"),
          ),
        ),
        city &&
          React.createElement(
            "div",
            { className: "location-gate-fallback" },
            React.createElement(
              "p",
              null,
              "Current location source: ",
              React.createElement("strong", null, provider || "unknown"),
            ),
            React.createElement(
              "p",
              { className: "muted" },
              accuracy
                ? `Last known accuracy: \xB1${Math.round(accuracy)}m`
                : "Enable GPS for the most accurate location.",
            ),
          ),
        React.createElement(
          "button",
          {
            className: "location-gate-btn",
            onClick: handleRetry,
            disabled: retrying,
          },
          retrying
            ? React.createElement(
                React.Fragment,
                null,
                React.createElement(Loader2, { className: "spin", size: 20 }),
                " Checking...",
              )
            : React.createElement(
                React.Fragment,
                null,
                React.createElement(RefreshCw, { size: 20 }),
                " Try Again",
              ),
        ),
        React.createElement(
          "button",
          {
            className: "location-gate-btn skip",
            onClick: () => setBypassed(true),
            type: "button",
            style: { marginTop: "12px" },
          },
          "Continue Without Location",
        ),
      ),
      React.createElement("style", null, gateStyles),
    );
  }

  // Error state
  if (error) {
    return React.createElement(
      "div",
      { className: "location-gate error" },
      React.createElement(
        "div",
        { className: "location-gate-content" },
        React.createElement(
          "div",
          { className: "location-gate-icon warning" },
          React.createElement(AlertTriangle, { size: 48 }),
        ),
        React.createElement("h1", null, "Location Error"),
        React.createElement("p", null, error),
        React.createElement(
          "button",
          {
            className: "location-gate-btn",
            onClick: handleRetry,
            disabled: retrying,
          },
          retrying
            ? React.createElement(
                React.Fragment,
                null,
                React.createElement(Loader2, { className: "spin", size: 20 }),
                " Retrying...",
              )
            : React.createElement(
                React.Fragment,
                null,
                React.createElement(RefreshCw, { size: 20 }),
                " Try Again",
              ),
        ),
        React.createElement(
          "button",
          {
            className: "location-gate-btn skip",
            onClick: () => setBypassed(true),
            type: "button",
            style: { marginTop: "12px" },
          },
          "Continue Without Location",
        ),
      ),
      React.createElement("style", null, gateStyles),
    );
  }

  // Initial prompt
  return React.createElement(
    "div",
    { className: "location-gate" },
    React.createElement(
      "div",
      { className: "location-gate-content" },
      React.createElement(
        "div",
        { className: "location-gate-icon pulse" },
        React.createElement(MapPin, { size: 48 }),
      ),
      React.createElement("h1", null, "Enable Location"),
      React.createElement(
        "p",
        null,
        "Allow location access to discover products near you and connect you with local sellers.",
      ),
      React.createElement(
        "button",
        { className: "location-gate-btn primary", onClick: () => requestLocation().catch(() => {}) },
        React.createElement(MapPin, { size: 20 }),
        " Allow Location Access",
      ),
      React.createElement(
        "p",
        { className: "location-gate-privacy" },
        "\uD83D\uDD12 Your location is stored securely and only used to improve your experience.",
      ),
    ),
    React.createElement("style", null, gateStyles),
  );
}

const badgeStyles = `
  /* Anchored to top app bar area (right side), so it never overlaps page content
     or sticky CTAs. Hides on scroll-down via .nav-scrolled-down class set by app shell. */
  .location-accuracy-badge-wrap {
    position: fixed;
    top: calc(var(--top-nav-height, 60px) + env(safe-area-inset-top, 0px) + 6px);
    right: 8px;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    z-index: 40;
    pointer-events: auto;
    max-width: calc(100vw - 16px);
    transition: opacity 0.2s ease, transform 0.2s ease;
  }
  html.nav-scrolled-down .location-accuracy-badge-wrap {
    opacity: 0;
    transform: translateY(-8px);
    pointer-events: none;
  }
  .location-accuracy-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    background: rgba(15, 23, 42, 0.78);
    backdrop-filter: blur(8px);
    border: 1px solid;
    border-radius: 16px;
    padding: 4px 9px;
    font-size: 12px;
    font-weight: 600;
    line-height: 1.1;
    max-width: 70vw;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    transition: opacity 0.3s;
    border-color: currentColor;
  }
  .location-accuracy-badge span {
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 60vw;
  }
  .location-accuracy-badge-close {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: rgba(15, 23, 42, 0.78);
    backdrop-filter: blur(8px);
    color: rgba(255,255,255,0.85);
    border: 1px solid rgba(255,255,255,0.18);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 0.85rem;
    line-height: 1;
    cursor: pointer;
    padding: 0;
  }
  html.dark .location-accuracy-badge,
  html.dark .location-accuracy-badge-close {
    background: rgba(241, 245, 249, 0.12);
  }
  @media (max-width: 480px) {
    .location-accuracy-badge { font-size: 11px; padding: 3px 7px; max-width: 55vw; }
    .location-accuracy-badge-close { width: 26px; height: 26px; font-size: 14px; }
  }
`;

const gateStyles = `
  .location-gate {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: 20px;
  }
  .location-gate-content {
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 24px;
    padding: 40px;
    max-width: 420px;
    width: 100%;
    text-align: center;
    color: #fff;
  }
  .location-gate-icon {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 24px;
    color: white;
  }
  .location-gate-icon.warning {
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  }
  .location-gate-icon.pulse {
    animation: pulse 2s infinite;
  }
  @keyframes pulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.05); opacity: 0.8; }
  }
  .location-gate h1 {
    font-size: 1.75rem;
    font-weight: 700;
    margin-bottom: 12px;
    color: #fff;
  }
  .location-gate p {
    color: rgba(255, 255, 255, 0.7);
    margin-bottom: 24px;
    line-height: 1.6;
  }
  .location-gate-loader {
    display: flex;
    justify-content: center;
    margin-top: 20px;
    color: #22c55e;
  }
  .location-gate-hint {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.5);
    margin-top: 16px;
    margin-bottom: 0;
  }
  .spin {
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  .location-gate-instructions {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 24px;
    text-align: left;
  }
  .location-gate-instructions h3 {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 1rem;
    margin-bottom: 12px;
    color: #fff;
  }
  .location-gate-instructions ol {
    margin: 0;
    padding-left: 20px;
    color: rgba(255, 255, 255, 0.7);
  }
  .location-gate-instructions li {
    margin-bottom: 8px;
  }
  .location-gate-fallback {
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.3);
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 24px;
  }
  .location-gate-fallback p {
    margin-bottom: 8px;
    color: #22c55e;
  }
  .location-gate-fallback .muted {
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.5);
    margin-bottom: 0;
  }
  .location-gate-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
    color: white;
    border: none;
    padding: 14px 28px;
    border-radius: 12px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    width: 100%;
  }
  .location-gate-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(34, 197, 94, 0.3);
  }
  .location-gate-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .location-gate-btn.skip {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: rgba(255, 255, 255, 0.7);
    margin-top: 12px;
    font-size: 0.875rem;
    padding: 10px 20px;
  }
  .location-gate-btn.skip:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.08);
    box-shadow: none;
    transform: none;
  }
  .location-gate-privacy {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.5);
    margin-top: 20px;
    margin-bottom: 0;
  }
`;

export { LocationGate as default };

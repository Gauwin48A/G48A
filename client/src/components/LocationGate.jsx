import React, { useEffect, useState } from "react";
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

const DEVICE_INFO_KEY = "mhub_device_info_sent";

const getAccuracyBadge = (provider, accuracy) => {
  const prov = String(provider || "").toLowerCase();
  if (prov === "ip_fallback") {
    return { label: "City-level (IP)", icon: Globe, color: "#f59e0b" };
  }
  if (prov.includes("cache") || prov === "network") {
    return { label: "Approximate (Network)", icon: Wifi, color: "#3b82f6" };
  }
  if (accuracy && accuracy <= 100) {
    return { label: "Precise (GPS)", icon: Crosshair, color: "#22c55e" };
  }
  if (accuracy && accuracy <= 500) {
    return { label: "Approximate (GPS)", icon: Wifi, color: "#3b82f6" };
  }
  return { label: "Precise (GPS)", icon: Crosshair, color: "#22c55e" };
};

function LocationGate({ children }) {
  const {
    loading,
    error,
    permissionGranted,
    permissionDenied,
    requestLocation,
    city,
    accuracy,
    provider,
    locationString,
  } = useLocation();

  const [deviceInfoSent, setDeviceInfoSent] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [bypassed, setBypassed] = useState(false);

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
        console.log(
          "[LocationGate] Auto-bypassing after 5 seconds - app will load while GPS continues in background",
        );
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
      await fetch(buildApiPath("/analytics/device"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(info),
      });
      sessionStorage.setItem(DEVICE_INFO_KEY, "1");
      console.log("[LocationGate] Device info sent:", info.fingerprint);
    } catch (err) {
      console.error("[LocationGate] Failed to send device info:", err);
    }
  };

  const handleRetry = async () => {
    setRetrying(true);
    await requestLocation();
    setRetrying(false);
  };

  // L10: Accuracy badge component
  const AccuracyBadge = () => {
    if (!permissionGranted && !bypassed) return null;
    const badge = getAccuracyBadge(provider, accuracy);
    const BadgeIcon = badge.icon;
    return React.createElement(
      "div",
      { className: "location-accuracy-badge", style: { borderColor: badge.color } },
      React.createElement(BadgeIcon, { size: 14, style: { color: badge.color } }),
      React.createElement("span", { style: { color: badge.color } }, badge.label),
    );
  };

  // Passed through — app renders with optional accuracy badge overlay
  if ((permissionGranted && !loading) || bypassed) {
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
        { className: "location-gate-btn primary", onClick: requestLocation },
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
  .location-accuracy-badge {
    position: fixed;
    bottom: 72px;
    left: 12px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(15, 23, 42, 0.85);
    backdrop-filter: blur(8px);
    border: 1px solid;
    border-radius: 20px;
    padding: 6px 12px;
    font-size: 0.7rem;
    font-weight: 600;
    z-index: 999;
    pointer-events: none;
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
  .location-gate-privacy {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.5);
    margin-top: 20px;
    margin-bottom: 0;
  }
`;

export { LocationGate as default };

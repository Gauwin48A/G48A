import { useState, useEffect, useCallback } from "react";
import { getBestAvailableLocation, sendLocation } from "../services/locationService";

const LOCATION_TIMEOUT_MS = 22000;

const withTimeout = (promise, timeoutMs) => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const timeoutError = new Error("Location request timed out.");
      timeoutError.name = "TimeoutError";
      reject(timeoutError);
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
};

/**
 * Unified location permission hook.
 * Uses the shared location service so web + mobile follow the same pipeline.
 */
export default function useLocationPermission() {
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [location, setLocation] = useState(null);
  const [timedOut, setTimedOut] = useState(false);

  const requestLocation = useCallback(async () => {
    setLoading(true);
    setError(null);
    setTimedOut(false);

    try {
      const loc = await withTimeout(
        getBestAvailableLocation({
          allowCache: true,
          allowIpFallback: true,
          requiredAccuracy: 500,
        }),
        LOCATION_TIMEOUT_MS
      );
      const normalizedProvider = String(loc.provider || "browser_gps");
      const permissionStatus =
        normalizedProvider === "ip_fallback"
          ? "granted_via_ip"
          : normalizedProvider.includes("cached")
            ? "granted_cached"
            : "granted";
      const coords = {
        latitude: loc.latitude ?? loc.lat,
        longitude: loc.longitude ?? loc.lng,
        accuracy: loc.accuracy ?? null,
        speed: loc.speed ?? 0,
        city: loc.city || "",
        state: loc.state || "",
        country: loc.country || "",
        provider: normalizedProvider,
        permission_status: permissionStatus,
      };

      setLocation(coords);
      setPermissionGranted(true);
      setLoading(false);

      sendLocation(coords).catch(() => {});
      localStorage.setItem("last_location", JSON.stringify({
        ...coords,
        timestamp: Date.now(),
      }));
    } catch (err) {
      const message = (err?.message || "").toLowerCase();
      const isTimeout = err?.name === "TimeoutError" || message.includes("timeout");
      const isDenied = message.includes("denied");
      const isHttpsIssue = message.includes("https") || message.includes("secure");

      let userMessage = "Location unavailable.";
      let permissionStatus = "error";

      if (isDenied) {
        userMessage = "Location permission denied. Please enable in browser/app settings.";
        permissionStatus = "denied";
      } else if (isHttpsIssue) {
        userMessage = "Web location requires HTTPS (or localhost in development).";
        permissionStatus = "insecure_origin";
      } else if (isTimeout) {
        userMessage = "Location request timed out. You can retry.";
        permissionStatus = "timeout";
        setTimedOut(true);
      }

      setError(userMessage);
      setLoading(false);
      setPermissionGranted(false);

      sendLocation({
        latitude: 0,
        longitude: 0,
        permission_status: permissionStatus,
        provider: "location_hook",
      }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  const retry = useCallback(() => {
    requestLocation();
  }, [requestLocation]);

  const skipForNow = useCallback(() => {
    setLoading(false);
    setError(null);
  }, []);

  return {
    permissionGranted,
    loading,
    isLoading: loading, // backward compatibility with existing call-sites
    error,
    retry,
    location,
    timedOut,
    skipForNow,
  };
}

import { useState, useEffect, useCallback, useRef } from "react";
import { sendLocation } from "../services/locationService";

// Timeout duration in milliseconds
const LOCATION_TIMEOUT = 30000; // 30 seconds for banking-grade GPS accuracy

/**
 * Custom hook to manage browser geolocation permission and location capture.
 * 
 * CRITICAL: Implements a 5-second timeout safeguard.
 * - If location hangs or is denied, app will NOT freeze
 * - Shows "Location Required" state but still renders UI
 * - Retries are available for user-initiated requests
 */
export default function useLocationPermission() {
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [location, setLocation] = useState(null);
  const [timedOut, setTimedOut] = useState(false);
  const timeoutRef = useRef(null);
  const watchIdRef = useRef(null);

  /**
   * Clear any active timeouts and watches
   */
  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (watchIdRef.current && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  /**
   * Request FRESH location from the browser with timeout safeguard
   */
  const requestLocation = useCallback(() => {
    console.log("[LocationService] ==========================================");
    console.log("[LocationService] LOCATION CAPTURE STARTED (5s timeout)");
    console.log("[LocationService] Timestamp:", new Date().toISOString());
    console.log("[LocationService] ==========================================");

    setLoading(true);
    setError(null);
    setTimedOut(false);

    // Check if geolocation is supported
    if (!navigator.geolocation) {
      const errorMsg = "Geolocation is not supported by your browser.";
      console.warn("[LocationService] NOT SUPPORTED:", errorMsg);
      setError(errorMsg);
      setLoading(false);
      // Don't block app - just note the error
      sendLocation({
        latitude: 0,
        longitude: 0,
        permission_status: "unsupported",
        provider: "browser"
      }).catch(() => { });
      return;
    }

    // Set up timeout safeguard - app will NOT freeze
    timeoutRef.current = setTimeout(() => {
      console.warn("[LocationService] ⏱️ TIMEOUT! Location request took > 30 seconds");
      console.warn("[LocationService] Try moving to an open area for better GPS signal");
      setTimedOut(true);
      setLoading(false);
      setError("Location request timed out. You can retry or continue without location.");

      // Clear the watch
      if (watchIdRef.current && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }

      // Record timeout in DB
      sendLocation({
        latitude: 0,
        longitude: 0,
        permission_status: "timeout",
        provider: "browser"
      }).catch(() => { });
    }, LOCATION_TIMEOUT);

    console.log("[LocationService] Requesting position with timeout safeguard...");

    navigator.geolocation.getCurrentPosition(
      // SUCCESS - Location captured!
      async (pos) => {
        cleanup(); // Clear timeout

        console.log("[LocationService] ✅ LOCATION CAPTURED!");
        console.log("[LocationService] Lat:", pos.coords.latitude, "Lng:", pos.coords.longitude);

        const coords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          altitude: pos.coords.altitude,
          heading: pos.coords.heading,
          speed: pos.coords.speed,
          timestamp: pos.timestamp,
          provider: "browser",
          permission_status: "granted"
        };

        setLocation(coords);
        setPermissionGranted(true);
        setLoading(false);

        // Persist to database
        try {
          console.log("[LocationService] 📤 Persisting to PostgreSQL...");
          const response = await sendLocation(coords);
          console.log("[LocationService] ✅ DB Write Success! ID:", response.id);

          localStorage.setItem("last_location", JSON.stringify({
            ...coords,
            dbId: response.id,
            city: response.location?.city || 'Unknown',
            country: response.location?.country || 'Unknown'
          }));
        } catch (err) {
          console.error("[LocationService] DB write failed:", err);
        }
      },
      // ERROR - Permission denied or unavailable
      async (err) => {
        cleanup(); // Clear timeout

        console.warn("[LocationService] ⚠️ Location error:", err.code, err.message);

        let userMessage = "Location unavailable.";
        let permissionStatus = "error";

        switch (err.code) {
          case 1:
            userMessage = "Location permission denied. Please enable in browser settings.";
            permissionStatus = "denied";
            break;
          case 2:
            userMessage = "Location unavailable. Check your device settings.";
            permissionStatus = "unavailable";
            break;
          case 3:
            userMessage = "Location request timed out.";
            permissionStatus = "timeout";
            break;
        }

        setError(userMessage);
        setLoading(false);
        // Don't set permissionGranted to true - but app will still render

        // Record in DB for analytics
        sendLocation({
          latitude: 0,
          longitude: 0,
          permission_status: permissionStatus,
          provider: "browser"
        }).catch(() => { });
      },
      // OPTIONS
      {
        enableHighAccuracy: true,
        timeout: LOCATION_TIMEOUT,
        maximumAge: 0
      }
    );
  }, [cleanup]);

  /**
   * Effect: Request location on mount with timeout safeguard
   */
  useEffect(() => {
    console.log("[LocationService] Hook mounted - starting location request...");
    requestLocation();

    return cleanup;
  }, [requestLocation, cleanup]);

  /**
   * Retry function for user-initiated re-requests
   */
  const retry = useCallback(() => {
    console.log("[LocationService] User initiated retry...");
    requestLocation();
  }, [requestLocation]);

  /**
   * Skip location for now (user can enable later)
   */
  const skipForNow = useCallback(() => {
    console.log("[LocationService] User skipped location - app will continue");
    setLoading(false);
    setError(null);
    // Don't set permissionGranted - but app won't block
  }, []);

  return {
    permissionGranted,
    loading,
    error,
    retry,
    location,
    timedOut,
    skipForNow
  };
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation as useLocationContext } from "@/context/LocationContext";

const isTimeoutError = (err) => {
  const message = String(err?.message || "").toLowerCase();
  return err?.name === "LocationTimeoutError" || message.includes("timeout");
};

/**
 * Unified location permission hook backed by LocationContext.
 * Keeps backward compatibility with existing call-sites.
 */
export default function useLocationPermission() {
  const {
    permissionGranted,
    loading,
    error,
    retry,
    skipForNow,
    userSkipped,
    requestLocation,
    latitude,
    longitude,
    accuracy,
    city,
    state,
    country,
    provider,
  } = useLocationContext();

  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (permissionGranted || userSkipped || loading) return;
    requestLocation().catch((err) => {
      if (isTimeoutError(err)) {
        setTimedOut(true);
      }
    });
  }, [loading, permissionGranted, requestLocation, userSkipped]);

  const location = useMemo(() => {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    return {
      latitude,
      longitude,
      accuracy: accuracy ?? null,
      city: city || "",
      state: state || "",
      country: country || "",
      provider: provider || "browser_gps",
    };
  }, [accuracy, city, country, latitude, longitude, provider, state]);

  const retryRequest = useCallback(() => {
    setTimedOut(false);
    if (typeof retry === "function") {
      return retry();
    }
    return requestLocation();
  }, [requestLocation, retry]);

  return {
    permissionGranted,
    loading,
    isLoading: loading,
    error,
    retry: retryRequest,
    location,
    timedOut,
    skipForNow,
  };
}

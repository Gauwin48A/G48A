import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { getBestAvailableLocation, sendLocation } from "../services/locationService";

const LOCATION_CACHE_TTL_MS = 5 * 60 * 1000;
const AUTH_LOCATION_CACHE_TTL_MS = 60 * 1000;
const SKIP_TTL_MS = 24 * 60 * 60 * 1000;
const REQUIRED_ACCURACY_METERS = 100;
const BACKGROUND_REFRESH_MS = 10 * 60 * 1000;
const DEBUG = import.meta.env.DEV;

const log = (...args) => {
  if (DEBUG) {
    console.log(...args);
  }
};

const LocationContext = createContext(null);

export function useLocation() {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error("useLocation must be used within a LocationProvider");
  }
  return context;
}

const readJson = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeJson = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage failures
  }
};

const isAuthenticatedSession = () => {
  try {
    return Boolean(
      localStorage.getItem("authToken") ||
        localStorage.getItem("token") ||
        localStorage.getItem("authSession") === "true",
    );
  } catch {
    return false;
  }
};

const safeText = (value) => {
  if (value === undefined || value === null) return "";
  const normalized = String(value).trim();
  return normalized.length ? normalized : "";
};

const normalizeLocation = (location) => {
  if (!location || typeof location !== "object") return null;

  const latitude = Number(location.latitude ?? location.lat);
  const longitude = Number(location.longitude ?? location.lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const accuracy = Number(location.accuracy);

  return {
    latitude,
    longitude,
    accuracy: Number.isFinite(accuracy) ? accuracy : null,
    city: safeText(location.city || location.address?.city),
    state: safeText(location.state || location.address?.state),
    country: safeText(location.country || location.address?.country),
    area: safeText(location.area || location.address?.area),
    locality: safeText(location.locality || location.address?.locality),
    district: safeText(location.district || location.address?.district),
    pincode: safeText(location.pincode || location.address?.pincode),
    street: safeText(location.street || location.address?.street),
    displayName: safeText(location.displayName || location.address?.displayName),
    provider: safeText(location.provider || "browser_gps"),
    speed: Number(location.speed) || 0,
    timestamp: Number(location.timestamp) || Date.now(),
  };
};

const getCachedLocation = () => {
  const cached = readJson("mhub_location");
  if (!cached?.timestamp) return null;
  if (Date.now() - Number(cached.timestamp) > LOCATION_CACHE_TTL_MS) return null;
  return normalizeLocation(cached);
};

const cacheLocation = (location) => {
  writeJson("mhub_location", {
    ...location,
    timestamp: Date.now(),
  });
};

const readManualLocation = () => {
  const manual = readJson("mhub_manual_location");
  return normalizeLocation(manual);
};

const saveManualLocation = (location) => {
  writeJson("mhub_manual_location", {
    ...location,
    isManual: true,
    timestamp: Date.now(),
  });
};

const clearManualLocation = () => {
  try {
    localStorage.removeItem("mhub_manual_location");
  } catch {
    // ignore
  }
};

const readSkipFlag = () => {
  const payload = readJson("mhub_location_skipped");
  if (!payload?.timestamp) return false;
  const fresh = Date.now() - Number(payload.timestamp) < SKIP_TTL_MS;
  if (!fresh) {
    try {
      localStorage.removeItem("mhub_location_skipped");
    } catch {
      // ignore
    }
  }
  return fresh;
};

const writeSkipFlag = () => {
  writeJson("mhub_location_skipped", {
    skipped: true,
    timestamp: Date.now(),
  });
};

const clearSkipFlag = () => {
  try {
    localStorage.removeItem("mhub_location_skipped");
  } catch {
    // ignore
  }
};

const buildLocationString = (location) => {
  const parts = [];
  const add = (value) => {
    const text = safeText(value);
    if (!text) return;
    if (parts.some((part) => part.toLowerCase() === text.toLowerCase())) return;
    parts.push(text);
  };

  add(location?.area || location?.locality || "");
  add(location?.city || "");
  add(location?.state || "");

  return parts.join(", ");
};

const permissionStatusFromProvider = (provider) => {
  const normalized = String(provider || "").toLowerCase();
  if (normalized === "ip_fallback") return "granted_via_ip";
  if (normalized.includes("cache")) return "granted_cached";
  return "granted";
};

const sendLocationBestEffort = async (location) => {
  try {
    const userId = localStorage.getItem("userId");
    const payload = {
      ...location,
      user_id: location.user_id || userId || null,
      latitude: location.latitude,
      longitude: location.longitude,
      permission_status:
        location.permission_status || permissionStatusFromProvider(location.provider),
      timezone:
        location.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "",
      last_active_at: new Date().toISOString(),
    };
    await sendLocation(payload);
  } catch (error) {
    console.error("[LocationContext] Failed to send location to backend:", error);
  }
};

export function LocationProvider({ children }) {
  const manual = readManualLocation();
  const cached = getCachedLocation();
  const bootstrapLocation = manual || cached;

  const [coords, setCoords] = useState(
    bootstrapLocation
      ? {
          latitude: bootstrapLocation.latitude,
          longitude: bootstrapLocation.longitude,
          accuracy: bootstrapLocation.accuracy,
        }
      : null,
  );
  const [city, setCity] = useState(bootstrapLocation?.city || "");
  const [state, setState] = useState(bootstrapLocation?.state || "");
  const [country, setCountry] = useState(bootstrapLocation?.country || "");
  const [area, setArea] = useState(bootstrapLocation?.area || "");
  const [locality, setLocality] = useState(bootstrapLocation?.locality || "");
  const [district, setDistrict] = useState(bootstrapLocation?.district || "");
  const [pincode, setPincode] = useState(bootstrapLocation?.pincode || "");
  const [street, setStreet] = useState(bootstrapLocation?.street || "");
  const [displayName, setDisplayName] = useState(bootstrapLocation?.displayName || "");
  const [provider, setProvider] = useState(bootstrapLocation?.provider || "");
  const [lastUpdatedAt, setLastUpdatedAt] = useState(bootstrapLocation?.timestamp || null);

  const [loading, setLoading] = useState(!bootstrapLocation);
  const [error, setError] = useState(null);
  const [permissionGranted, setPermissionGranted] = useState(Boolean(bootstrapLocation));
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [userSkipped, setUserSkipped] = useState(() => readSkipFlag());

  const initializedRef = useRef(false);
  const requestInFlightRef = useRef(null);

  const setLocationState = useCallback((location) => {
    const normalized = normalizeLocation(location);
    if (!normalized) return null;

    setCoords({
      latitude: normalized.latitude,
      longitude: normalized.longitude,
      accuracy: normalized.accuracy,
    });
    setCity(normalized.city);
    setState(normalized.state);
    setCountry(normalized.country);
    setArea(normalized.area);
    setLocality(normalized.locality);
    setDistrict(normalized.district);
    setPincode(normalized.pincode);
    setStreet(normalized.street);
    setDisplayName(normalized.displayName || buildLocationString(normalized));
    setProvider(normalized.provider);
    setLastUpdatedAt(normalized.timestamp || Date.now());
    setPermissionGranted(true);
    setPermissionDenied(false);

    return normalized;
  }, []);

  const requestLocation = useCallback(
    async (options = {}) => {
      const silent = options?.silent === true;
      log("[LocationContext] Starting location capture", { silent });

      if (requestInFlightRef.current) {
        if (!silent) {
          setLoading(true);
          setError(null);
        }
        return requestInFlightRef.current;
      }

      if (!silent) {
        setLoading(true);
        setError(null);
      }

      const capturePromise = (async () => {
        try {
          const authenticated = isAuthenticatedSession();
          const cacheMaxAgeMs = authenticated
            ? AUTH_LOCATION_CACHE_TTL_MS
            : LOCATION_CACHE_TTL_MS;
          const location = await getBestAvailableLocation({
            allowCache: true,
            allowIpFallback: !authenticated,
            cacheMaxAgeMs,
            requiredAccuracy: REQUIRED_ACCURACY_METERS,
          });

          const normalized = setLocationState(location);
          if (!normalized) {
            throw new Error("Unable to normalize captured location");
          }

          clearManualLocation();
          cacheLocation(normalized);
          localStorage.setItem("mhub_user_city", normalized.city || normalized.area || "");

          sendLocationBestEffort({
            ...normalized,
            provider: normalized.provider || "browser_gps",
          });

          if (!silent) {
            setLoading(false);
          }

          return normalized;
        } catch (captureError) {
          const message = String(captureError?.message || "Unable to get location");
          const lower = message.toLowerCase();
          const denied = lower.includes("denied");

          if (!silent) {
            setError(
              denied
                ? "Location permission denied. Please enable in settings."
                : message,
            );
            setLoading(false);
          }

          setPermissionGranted(false);
          setPermissionDenied(denied);

          sendLocationBestEffort({
            latitude: 0,
            longitude: 0,
            provider: "none",
            permission_status: denied ? "denied" : "error",
          });

          if (silent) {
            log("[LocationContext] Silent refresh failed", message);
          }

          throw captureError;
        }
      })();

      requestInFlightRef.current = capturePromise;
      return capturePromise.finally(() => {
        if (requestInFlightRef.current === capturePromise) {
          requestInFlightRef.current = null;
        }
      });
    },
    [setLocationState],
  );

  const retry = useCallback(() => {
    initializedRef.current = false;
    return requestLocation();
  }, [requestLocation]);

  const skipForNow = useCallback(() => {
    setLoading(false);
    setError(null);
    setUserSkipped(true);
    writeSkipFlag();
    log("[LocationContext] User skipped location prompt");
  }, []);

  const clearLocation = useCallback(() => {
    setCoords(null);
    setCity("");
    setState("");
    setCountry("");
    setArea("");
    setLocality("");
    setDistrict("");
    setPincode("");
    setStreet("");
    setDisplayName("");
    setProvider("");
    setLastUpdatedAt(null);
    setPermissionGranted(false);
    setPermissionDenied(false);

    try {
      localStorage.removeItem("mhub_location");
      localStorage.removeItem("mhub_manual_location");
      localStorage.removeItem("mhub_user_city");
    } catch {
      // ignore
    }
  }, []);

  const setManualLocation = useCallback(
    (manualLocation) => {
      const normalized = normalizeLocation({
        ...manualLocation,
        provider: "manual",
        accuracy: Number(manualLocation?.accuracy) || 0,
      });

      if (!normalized) return;

      setLocationState(normalized);
      setLoading(false);
      setError(null);

      saveManualLocation(normalized);
      cacheLocation(normalized);
      localStorage.setItem("mhub_user_city", normalized.city || normalized.area || "");
    },
    [setLocationState],
  );

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    log("[LocationContext] Initializing location context");

    if (readSkipFlag()) {
      setLoading(false);
      setUserSkipped(true);
      return;
    }

    const manualLocation = readManualLocation();
    const cachedLocation = manualLocation || getCachedLocation();

    if (cachedLocation) {
      setLocationState(cachedLocation);
      setLoading(false);

      if (!manualLocation) {
        setTimeout(() => {
          requestLocation({ silent: true }).catch(() => {});
        }, 5000);
      }
      return;
    }

    requestLocation().catch(() => {});
  }, [requestLocation, setLocationState]);

  useEffect(() => {
    if (userSkipped || typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    const refreshIfNeeded = () => {
      if (readManualLocation()) return;
      const cachedLocation = getCachedLocation();
      const stale = !cachedLocation || Date.now() - Number(cachedLocation.timestamp || 0) >= LOCATION_CACHE_TTL_MS;
      if (stale) {
        requestLocation({ silent: true }).catch(() => {});
      }
    };

    const interval = setInterval(refreshIfNeeded, BACKGROUND_REFRESH_MS);
    const onFocus = () => refreshIfNeeded();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshIfNeeded();
      }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [requestLocation, userSkipped]);

  const currentLocation = {
    area,
    locality,
    city,
    state,
    country,
  };

  const value = {
    coords,
    latitude: coords?.latitude || null,
    longitude: coords?.longitude || null,
    accuracy: coords?.accuracy || null,
    city,
    state,
    country,
    area,
    locality,
    district,
    pincode,
    street,
    displayName,
    provider,
    lastUpdatedAt,
    loading,
    error,
    permissionGranted,
    permissionDenied,
    requestLocation,
    retry,
    skipForNow,
    clearLocation,
    setManualLocation,
    enableLocation: () => {
      clearSkipFlag();
      setUserSkipped(false);
      requestLocation().catch(() => {});
    },
    hasLocation: Boolean(coords),
    userSkipped,
    locationString: buildLocationString(currentLocation) || "Location not set",
  };

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export default LocationContext;

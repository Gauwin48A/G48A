import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  getBestAvailableLocation,
  sendLocation,
  verifyLocation,
} from "../services/locationService";

const LOCATION_CACHE_TTL_MS = 5 * 60 * 1000;
const AUTH_LOCATION_CACHE_TTL_MS = 60 * 1000;
const SKIP_TTL_MS = 24 * 60 * 60 * 1000;
const REQUIRED_ACCURACY_METERS = 100;
const BACKGROUND_REFRESH_MS = 10 * 60 * 1000;
const LOCATION_CAPTURE_TIMEOUT_MS = 45 * 1000;
const STALE_LOCATION_THRESHOLD_MS = 30 * 60 * 1000; // L11: 30 min stale threshold
const DEBUG = import.meta.env.DEV;

const log = (...args) => {
  if (DEBUG) {
    console.log(...args);
  }
};

const withTimeout = (promise, timeoutMs, message) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const error = new Error(message || "Location request timed out.");
      error.name = "LocationTimeoutError";
      reject(error);
    }, timeoutMs);

    promise
      .then((value) => resolve(value))
      .catch((error) => reject(error))
      .finally(() => clearTimeout(timer));
  });

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
    altitude: Number.isFinite(Number(location.altitude)) ? Number(location.altitude) : null,
    altitudeAccuracy: Number.isFinite(Number(location.altitudeAccuracy)) ? Number(location.altitudeAccuracy) : null,
    heading: Number.isFinite(Number(location.heading)) ? Number(location.heading) : null,
    city: safeText(location.city || location.address?.city),
    state: safeText(location.state || location.address?.state),
    country: safeText(location.country || location.address?.country),
    area: safeText(location.area || location.address?.area),
    village: safeText(location.village || location.address?.village),
    colony: safeText(location.colony || location.address?.colony),
    locality: safeText(location.locality || location.address?.locality),
    placeName: safeText(
      location.placeName ||
        location.poiName ||
        location.address?.placeName ||
        location.address?.poiName,
    ),
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

  // Build from most specific to least: street → colony → village → area → city → state
  add(location?.street || "");
  add(location?.placeName || "");
  add(location?.colony || "");
  add(location?.village || "");
  add(location?.area || location?.locality || "");
  const cityText = safeText(location?.city);
  const areaText = safeText(location?.area || location?.locality);
  // Only add city if it's different from area (avoid "Madhapur, Madhapur")
  if (cityText && cityText.toLowerCase() !== areaText.toLowerCase()) {
    add(cityText);
  }

  // If we have no sub-city parts yet, fall back to the district
  if (parts.length === 0) {
    add(location?.district || "");
  }

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
  const cached = getCachedLocation();
  const bootstrapLocation = cached;

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
  const [village, setVillage] = useState(bootstrapLocation?.village || "");
  const [colony, setColony] = useState(bootstrapLocation?.colony || "");
  const [locality, setLocality] = useState(bootstrapLocation?.locality || "");
  const [district, setDistrict] = useState(bootstrapLocation?.district || "");
  const [pincode, setPincode] = useState(bootstrapLocation?.pincode || "");
  const [street, setStreet] = useState(bootstrapLocation?.street || "");
  const [placeName, setPlaceName] = useState(bootstrapLocation?.placeName || "");
  const [displayName, setDisplayName] = useState(bootstrapLocation?.displayName || "");
  const [provider, setProvider] = useState(bootstrapLocation?.provider || "");
  const [lastUpdatedAt, setLastUpdatedAt] = useState(bootstrapLocation?.timestamp || null);

  const [loading, setLoading] = useState(!bootstrapLocation);
  const [error, setError] = useState(null);
  const [permissionGranted, setPermissionGranted] = useState(Boolean(bootstrapLocation));
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [userSkipped, setUserSkipped] = useState(() => readSkipFlag());
  const [accuracyTier, setAccuracyTier] = useState("unknown");

  const initializedRef = useRef(false);
  const requestInFlightRef = useRef(null);

  const setLocationState = useCallback((location) => {
    const normalized = normalizeLocation(location);
    if (!normalized) return null;

    setCoords({
      latitude: normalized.latitude,
      longitude: normalized.longitude,
      accuracy: normalized.accuracy,
      altitude: normalized.altitude,
      altitudeAccuracy: normalized.altitudeAccuracy,
      heading: normalized.heading,
    });
    setCity(normalized.city);
    setState(normalized.state);
    setCountry(normalized.country);
    setArea(normalized.area);
    setVillage(normalized.village || "");
    setColony(normalized.colony || "");
    setLocality(normalized.locality);
    setDistrict(normalized.district);
    setPincode(normalized.pincode);
    setStreet(normalized.street);
    setPlaceName(normalized.placeName || "");
    setDisplayName(normalized.displayName || buildLocationString(normalized));
    setProvider(normalized.provider);
    setLastUpdatedAt(normalized.timestamp || Date.now());
    setPermissionGranted(true);
    setPermissionDenied(false);

    // Classify accuracy for UI quality indicators
    const acc = normalized.accuracy;
    if (acc !== null && Number.isFinite(acc)) {
      if (acc <= 30) setAccuracyTier("precise");
      else if (acc <= 100) setAccuracyTier("good");
      else if (acc <= 500) setAccuracyTier("moderate");
      else if (acc <= 5000) setAccuracyTier("coarse");
      else setAccuracyTier("very_coarse");
    } else {
      setAccuracyTier("unknown");
    }

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
          const location = await withTimeout(
            getBestAvailableLocation({
              allowCache: true,
              allowIpFallback: true,
              cacheMaxAgeMs,
              requiredAccuracy: REQUIRED_ACCURACY_METERS,
              strictAccuracy: false,
            }),
            LOCATION_CAPTURE_TIMEOUT_MS,
            "Location request timed out. You can continue without location.",
          );

          const normalized = setLocationState(location);
          if (!normalized) {
            throw new Error("Unable to normalize captured location");
          }

          // If we got a coarse location, schedule a background refinement attempt
          const isCoarse = location.accuracyTier === "coarse" || location.accuracyTier === "very_coarse";
          if (isCoarse && !silent) {
            log("[LocationContext] Coarse location received, scheduling background GPS refinement");
            setTimeout(() => {
              requestLocation({ silent: true }).catch(() => {});
            }, 3000);
          }

          clearManualLocation();
          // Only cache GPS-sourced locations — IP fallback is coarse (~5km)
          // and produces identical results for all users on the same network.
          const isIpFallback = String(normalized.provider || "").toLowerCase() === "ip_fallback";
          if (!isIpFallback) {
            cacheLocation(normalized);
          }
          localStorage.setItem("mhub_user_city", normalized.area || normalized.locality || normalized.city || "");

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

          // Do NOT send (0,0) to backend — server rejects it and it creates noise
          if (denied) {
            log("[LocationContext] Permission denied, not sending fallback");
          }

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

  const verifyPreciseLocation = useCallback(async (options = {}) => {
    try {
      const userId = localStorage.getItem("userId");
      return await verifyLocation({ ...options, userId });
    } catch (error) {
      console.error("[LocationContext] Location verification failed:", error);
      throw error;
    }
  }, []);

  const retry = useCallback(() => {
    initializedRef.current = false;
    return requestLocation();
  }, [requestLocation]);

  const skipForNow = useCallback(() => {
    setLoading(false);
    setError(null);
    setPermissionGranted(false);
    setPermissionDenied(false);
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
    setVillage("");
    setColony("");
    setLocality("");
    setDistrict("");
    setPincode("");
    setStreet("");
    setPlaceName("");
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

    clearManualLocation();

    if (readSkipFlag()) {
      setLoading(false);
      setUserSkipped(true);
      return;
    }

    const cachedLocation = getCachedLocation();

    if (cachedLocation) {
      setLocationState(cachedLocation);
      setLoading(false);
      // L11: If cached location is older than 30 min, force fresh GPS fix
      const cacheAge = Date.now() - Number(cachedLocation.timestamp || 0);
      const isStale = cacheAge >= STALE_LOCATION_THRESHOLD_MS;
      if (isStale) {
        log("[LocationContext] L11: Cached location is stale (>30min), forcing GPS refresh");
        requestLocation({ silent: true }).catch(() => {});
      } else {
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
    street,
    placeName,
    area,
    village,
    colony,
    locality,
    city,
    district,
    state,
    country,
  };

  const value = {
    coords,
    latitude: coords?.latitude || null,
    longitude: coords?.longitude || null,
    accuracy: coords?.accuracy || null,
    altitude: coords?.altitude || null,
    altitudeAccuracy: coords?.altitudeAccuracy || null,
    heading: coords?.heading || null,
    city,
    state,
    country,
    area,
    village,
    colony,
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
    accuracyTier,
    isPrecise: accuracyTier === "precise" || accuracyTier === "good",
    requestLocation,
    verifyLocation: verifyPreciseLocation,
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
    placeName,
    locationString: displayName || buildLocationString(currentLocation) || "Location not set",
  };

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export default LocationContext;

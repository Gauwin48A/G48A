import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import * as LocationService from '../services/locationService';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes - fresher location like banking apps
const SKIP_TTL = 24 * 60 * 60 * 1000; // 24 hours
const STRICT_REQUIRED_ACCURACY_METERS = 500;
const AUTO_REFRESH_INTERVAL_MS = 10 * 60 * 1000;
const LOCATION_DEBUG = import.meta.env.DEV;

const debugLocation = (...args) => {
    if (LOCATION_DEBUG) {
        console.log(...args);
    }
};

/**
 * Location Context - Global state for user location
 * Similar to Swiggy/Flipkart - detects and tracks user location
 * Uses Capacitor Geolocation for native platforms (banking-app accuracy)
 */
const LocationContext = createContext(null);

export function useLocation() {
    const context = useContext(LocationContext);
    if (!context) {
        throw new Error('useLocation must be used within a LocationProvider');
    }
    return context;
}

/**
 * Send location to backend for storage/analytics
 */
async function sendLocationToBackend(locationData) {
    try {
        const userId = localStorage.getItem('userId');
        const payload = {
            ...locationData,
            user_id: locationData.user_id || userId || null,
            timezone: locationData.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
            last_active_at: locationData.last_active_at || new Date().toISOString()
        };
        return await LocationService.sendLocation(payload);
    } catch (error) {
        console.error('[LocationContext] Failed to send location to backend:', error);
        return null;
    }
}

/**
 * Get cached location from localStorage
 */
function getCachedLocation() {
    try {
        const cached = localStorage.getItem('mhub_location');
        if (cached) {
            const data = JSON.parse(cached);
            if (data.timestamp && Date.now() - data.timestamp < CACHE_TTL) {
                debugLocation('[LocationContext] Using cached location:', data.city);
                return data;
            }
        }
    } catch (e) {
        console.error('[LocationContext] Failed to parse cached location:', e);
    }
    return null;
}

/**
 * Save location to localStorage cache
 */
function setCachedLocation(locationData) {
    try {
        const cacheData = {
            ...locationData,
            timestamp: Date.now()
        };
        localStorage.setItem('mhub_location', JSON.stringify(cacheData));
        debugLocation('[LocationContext] Location cached:', locationData.city);
    } catch (e) {
        console.error('[LocationContext] Failed to cache location:', e);
    }
}

/**
 * Check if user has skipped location (within 24 hours)
 */
function hasSkippedLocation() {
    try {
        const skipped = localStorage.getItem('mhub_location_skipped');
        if (skipped) {
            const data = JSON.parse(skipped);
            if (data.timestamp && Date.now() - data.timestamp < SKIP_TTL) {
                debugLocation('[LocationContext] User previously skipped location');
                return true;
            }
            localStorage.removeItem('mhub_location_skipped');
        }
    } catch (e) {
        console.error('[LocationContext] Failed to check skip status:', e);
    }
    return false;
}

/**
 * Set skip preference (persists for 24 hours)
 */
function setSkippedLocation() {
    try {
        localStorage.setItem('mhub_location_skipped', JSON.stringify({
            skipped: true,
            timestamp: Date.now()
        }));
        debugLocation('[LocationContext] Skip preference saved for 24 hours');
    } catch (e) {
        console.error('[LocationContext] Failed to save skip preference:', e);
    }
}

/**
 * Clear skip preference (when user wants to enable location)
 */
function clearSkippedLocation() {
    localStorage.removeItem('mhub_location_skipped');
}

/**
 * Clear manual location preference (switching back to auto-detected mode)
 */
function clearCachedManualLocation() {
    localStorage.removeItem('mhub_manual_location');
}

/**
 * Save manual location preference
 */
function setCachedManualLocation(locationData) {
    try {
        const data = {
            ...locationData,
            isManual: true,
            timestamp: Date.now()
        };
        localStorage.setItem('mhub_manual_location', JSON.stringify(data));
        debugLocation('[LocationContext] Manual location saved:', locationData.city);
    } catch (e) {
        console.error('[LocationContext] Failed to save manual location:', e);
    }
}

/**
 * Get manual location persistence
 */
function getCachedManualLocation() {
    try {
        const cached = localStorage.getItem('mhub_manual_location');
        if (cached) {
            return JSON.parse(cached);
        }
    } catch (e) {
        console.warn('Failed to parse manual location');
    }
    return null;
}

export function LocationProvider({ children }) {
    // Read cache synchronously on mount to prevent flash
    const manualCache = getCachedManualLocation();
    const autoCache = getCachedLocation();
    const initialCache = manualCache || autoCache;
    const hasCache = !!initialCache;

    // Location state - Initialize from cache if available
    const [coords, setCoords] = useState(
        hasCache ? { latitude: initialCache.latitude, longitude: initialCache.longitude, accuracy: initialCache.accuracy } : null
    );
    const [city, setCity] = useState(initialCache?.city || '');
    const [state, setState] = useState(initialCache?.state || '');
    const [country, setCountry] = useState(initialCache?.country || '');
    const [displayName, setDisplayName] = useState(initialCache?.displayName || '');
    const [provider, setProvider] = useState(initialCache?.provider || '');
    const [lastUpdatedAt, setLastUpdatedAt] = useState(initialCache?.timestamp || null);
    const [loading, setLoading] = useState(!hasCache);
    const [error, setError] = useState(null);
    const [permissionGranted, setPermissionGranted] = useState(hasCache);
    const [permissionDenied, setPermissionDenied] = useState(false);
    const [userSkipped, setUserSkipped] = useState(() => hasSkippedLocation());

    const hasRequestedRef = useRef(false);

    /**
     * Request fresh location from browser or native GPS
     * Uses Capacitor Geolocation on native platforms for banking-app accuracy
     */
    const requestLocation = useCallback(async (options = {}) => {
        const silent = options?.silent === true;

        debugLocation('[LocationContext] ========================================');
        debugLocation('[LocationContext] BANKING-GRADE CAPTURE STARTED');
        if (silent) {
            debugLocation('[LocationContext] Silent refresh mode enabled');
        }
        debugLocation('[LocationContext] Timestamp:', new Date().toISOString());
        debugLocation('[LocationContext] ========================================');

        if (!silent) {
            setLoading(true);
            setError(null);
        }

        try {
            // Unified fallback ladder: precise -> cache -> IP.
            const locationData = await LocationService.getBestAvailableLocation({
                allowCache: true,
                allowIpFallback: true,
                cacheMaxAgeMs: CACHE_TTL,
                requiredAccuracy: STRICT_REQUIRED_ACCURACY_METERS
            });
            const normalizedProvider = String(locationData.provider || 'browser_gps');
            const permissionStatus =
                normalizedProvider === 'ip_fallback'
                    ? 'granted_via_ip'
                    : normalizedProvider.includes('cached')
                        ? 'granted_cached'
                        : 'granted';
            const timestamp = Date.now();

            debugLocation('[LocationContext] ✅ LOCATION CAPTURED!');
            debugLocation('[LocationContext] City:', locationData.city);
            debugLocation('[LocationContext] Accuracy:', locationData.accuracy, 'meters');

            // Update state
            setCoords({
                latitude: locationData.latitude,
                longitude: locationData.longitude,
                accuracy: locationData.accuracy
            });
            setCity(locationData.city || '');
            setState(locationData.state || '');
            setCountry(locationData.country || '');
            setDisplayName(locationData.displayName || '');
            setProvider(normalizedProvider);
            setLastUpdatedAt(timestamp);
            setPermissionGranted(true);
            setPermissionDenied(false);
            if (!silent) {
                setLoading(false);
            }

            // Auto-detected location should replace old manual override
            clearCachedManualLocation();

            // Cache the location
            setCachedLocation({
                ...locationData,
                provider: normalizedProvider,
                timestamp
            });

            // Send to backend
            sendLocationToBackend({
                ...locationData,
                provider: normalizedProvider,
                permission_status: permissionStatus
            });

            return locationData;

        } catch (err) {
            console.warn('[LocationContext] Location capture failed:', err?.message || err);

            // All methods failed inside LocationService fallback ladder
            let userMessage = 'Unable to get location';
            const errMessage = (err?.message || '').toLowerCase();
            if (errMessage.includes('denied')) {
                userMessage = 'Location permission denied. Please enable in settings.';
                setPermissionDenied(true);
            } else if (errMessage.includes('timeout')) {
                userMessage = 'Location request timed out. Please try again.';
            } else if (errMessage.includes('https') || errMessage.includes('secure')) {
                userMessage = 'Web location requires HTTPS (or localhost in development).';
            }

            setPermissionGranted(false);

            if (!silent) {
                setError(userMessage);
                setLoading(false);
            } else {
                console.warn('[LocationContext] Silent refresh failed:', userMessage);
            }

            sendLocationToBackend({
                latitude: 0,
                longitude: 0,
                permission_status: errMessage.includes('denied') ? 'denied' : 'error',
                provider: 'none'
            });
        }
    }, []);

    /**
     * Retry location request (user-initiated)
     */
    const retry = useCallback(() => {
        debugLocation('[LocationContext] User initiated retry...');
        hasRequestedRef.current = false;
        requestLocation();
    }, [requestLocation]);

    /**
     * Skip location for now - persists for 24 hours
     */
    const skipForNow = useCallback(() => {
        debugLocation('[LocationContext] User skipped location (saved for 24 hours)');
        setLoading(false);
        setError(null);
        setUserSkipped(true);
        setSkippedLocation();
    }, []);

    /**
     * Clear location data
     */
    const clearLocation = useCallback(() => {
        debugLocation('[LocationContext] Clearing location data');
        setCoords(null);
        setCity('');
        setState('');
        setCountry('');
        setDisplayName('');
        setProvider('');
        setLastUpdatedAt(null);
        setPermissionGranted(false);
        localStorage.removeItem('mhub_location');
        localStorage.removeItem('mhub_manual_location');
    }, []);

    /**
     * Set manual location (user override)
     */
    const setManualLocation = useCallback((locationData) => {
        debugLocation('[LocationContext] Setting manual location:', locationData);

        setCoords({
            latitude: locationData.latitude,
            longitude: locationData.longitude,
            accuracy: 0
        });
        setCity(locationData.city || '');
        setState(locationData.state || '');
        setCountry(locationData.country || '');
        setDisplayName(locationData.city || '');
        setProvider('manual');
        setLastUpdatedAt(Date.now());

        setPermissionGranted(true);
        setLoading(false);
        setError(null);

        setCachedManualLocation(locationData);
        setCachedLocation({
            ...locationData,
            provider: 'manual'
        });
    }, []);

    /**
     * Initialize: Check cache first, then request fresh location
     * IMPORTANT: Don't prompt if user has skipped within 24 hours
     */
    useEffect(() => {
        if (hasRequestedRef.current) return;
        hasRequestedRef.current = true;

        debugLocation('[LocationContext] Initializing...');

        // Check if user previously skipped (within 24 hours)
        if (hasSkippedLocation()) {
            debugLocation('[LocationContext] User skipped location within 24 hours, not prompting again');
            setLoading(false);
            setUserSkipped(true);
            return;
        }

        // Check for cached location first (Manual OR Auto)
        const manualLoc = getCachedManualLocation();
        const cached = manualLoc || getCachedLocation();

        if (cached) {
            setCoords({ latitude: cached.latitude, longitude: cached.longitude, accuracy: cached.accuracy });
            setCity(cached.city || '');
            setState(cached.state || '');
            setCountry(cached.country || '');
            setDisplayName(cached.displayName || '');
            setProvider(cached.provider || '');
            setLastUpdatedAt(cached.timestamp || null);
            setPermissionGranted(true);
            setLoading(false);

            if (manualLoc) {
                // Respect explicit manual selection until user asks to auto-detect again.
                debugLocation('[LocationContext] Manual location cache found, skipping background refresh.');
            } else {
                // Still request fresh location in background (silent update)
                debugLocation('[LocationContext] Using cache, but requesting fresh location in background...');
                setTimeout(() => {
                    requestLocation({ silent: true });
                }, 5000);
            }
        } else {
            // No cache, request immediately
            requestLocation();
        }
    }, [requestLocation]);

    /**
     * Keep location fresh in background for long sessions.
     * Skip refresh when user intentionally selected manual location.
     */
    useEffect(() => {
        if (userSkipped) return;
        if (typeof window === 'undefined' || typeof document === 'undefined') return;

        const refreshIfStale = () => {
            const manualLoc = getCachedManualLocation();
            if (manualLoc) return;

            const cached = getCachedLocation();
            const ageMs = cached?.timestamp ? Date.now() - cached.timestamp : Number.MAX_SAFE_INTEGER;
            if (ageMs >= CACHE_TTL) {
                requestLocation({ silent: true });
            }
        };

        const interval = setInterval(refreshIfStale, AUTO_REFRESH_INTERVAL_MS);
        const onFocus = () => refreshIfStale();
        const onVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                refreshIfStale();
            }
        };

        window.addEventListener('focus', onFocus);
        document.addEventListener('visibilitychange', onVisibilityChange);

        return () => {
            clearInterval(interval);
            window.removeEventListener('focus', onFocus);
            document.removeEventListener('visibilitychange', onVisibilityChange);
        };
    }, [requestLocation, userSkipped]);

    const value = {
        // Location data
        coords,
        latitude: coords?.latitude || null,
        longitude: coords?.longitude || null,
        accuracy: coords?.accuracy || null,
        city,
        state,
        country,
        displayName,
        provider,
        lastUpdatedAt,

        // Status
        loading,
        error,
        permissionGranted,
        permissionDenied,

        // Actions
        requestLocation,
        retry,
        skipForNow,
        clearLocation,
        setManualLocation,
        enableLocation: () => {
            clearSkippedLocation();
            setUserSkipped(false);
            requestLocation();
        },

        // Helpers
        hasLocation: !!coords,
        userSkipped,
        locationString: city ? `${city}${state ? ', ' + state : ''}` : 'Location not set'
    };

    return (
        <LocationContext.Provider value={value}>
            {children}
        </LocationContext.Provider>
    );
}

export default LocationContext;


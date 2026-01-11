import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const API_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000') + "/api/location";
const LOCATION_TIMEOUT = 30000; // 30 seconds (increased from 10s)
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const SKIP_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Get location from IP address (fallback when GPS fails/denied)
 * Uses free ipapi.co service
 */
async function getIPBasedLocation() {
    try {
        console.log('[LocationContext] Attempting IP-based location fallback...');
        const response = await fetch('https://ipapi.co/json/', { timeout: 5000 });

        if (!response.ok) throw new Error('IP lookup failed');

        const data = await response.json();
        console.log('[LocationContext] IP location found:', data.city, data.country_name);

        return {
            latitude: data.latitude,
            longitude: data.longitude,
            city: data.city || 'Unknown',
            state: data.region || '',
            country: data.country_name || 'Unknown',
            displayName: `${data.city}, ${data.region}`,
            accuracy: 5000, // ~5km accuracy for IP
            provider: 'ip_fallback'
        };
    } catch (error) {
        console.error('[LocationContext] IP fallback failed:', error);
        return null;
    }
}

/**
 * Location Context - Global state for user location
 * Similar to Swiggy/Flipkart - detects and tracks user location
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
 * Reverse geocode coordinates to get city/state/country
 * Uses free OpenStreetMap Nominatim API with zoom=18 for max precision
 */
async function reverseGeocode(lat, lng) {
    try {
        // zoom=18 gives street-level detail, addressdetails=1 ensures all address components
        const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en&zoom=18&addressdetails=1`;
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'MHub/1.0 (marketplace app)'
            }
        });

        if (!response.ok) {
            throw new Error('Geocoding failed');
        }

        const data = await response.json();
        const address = data.address || {};

        console.log('[LocationContext] Full address data:', address);

        // Get the most specific location name available
        // Priority: village > suburb > neighbourhood > hamlet > town > city > county
        const specificLocation = address.village ||
            address.suburb ||
            address.neighbourhood ||
            address.hamlet ||
            address.locality ||
            address.town ||
            address.city ||
            address.county ||
            'Unknown';

        // Get the broader area (for context)
        const district = address.county || address.state_district || '';

        // Create a display name showing specific location first
        const locationDisplay = specificLocation;

        return {
            // Specific location (village/area name)
            city: specificLocation,
            // District/county for reference
            district: district,
            state: address.state || address.region || '',
            country: address.country || 'Unknown',
            // Full address for detailed view
            displayName: data.display_name || '',
            postcode: address.postcode || '',
            // Raw address for debugging
            rawAddress: address
        };
    } catch (error) {
        console.error('[LocationContext] Reverse geocoding failed:', error);
        return { city: 'Unknown', district: '', state: '', country: 'Unknown', displayName: '', postcode: '' };
    }
}


/**
 * Send location to backend for storage/analytics
 */
async function sendLocationToBackend(locationData) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(locationData),
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
        }

        return await response.json();
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
            // Check if cache is still valid (30 min TTL)
            if (data.timestamp && Date.now() - data.timestamp < CACHE_TTL) {
                console.log('[LocationContext] Using cached location:', data.city);
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
        console.log('[LocationContext] Location cached:', locationData.city);
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
                console.log('[LocationContext] User previously skipped location');
                return true;
            }
            // Expired, remove it
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
        console.log('[LocationContext] Skip preference saved for 24 hours');
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

export function LocationProvider({ children }) {
    // Read cache synchronously on mount to prevent flash
    const initialCache = getCachedLocation();
    const hasCache = !!initialCache;

    // Location state - Initialize from cache if available
    const [coords, setCoords] = useState(
        hasCache ? { latitude: initialCache.latitude, longitude: initialCache.longitude, accuracy: initialCache.accuracy } : null
    );
    const [city, setCity] = useState(initialCache?.city || '');
    const [state, setState] = useState(initialCache?.state || '');
    const [country, setCountry] = useState(initialCache?.country || '');
    const [displayName, setDisplayName] = useState(initialCache?.displayName || '');
    const [loading, setLoading] = useState(!hasCache); // NOT loading if cache exists
    const [error, setError] = useState(null);
    const [permissionGranted, setPermissionGranted] = useState(hasCache); // Granted if cache exists
    const [permissionDenied, setPermissionDenied] = useState(false);
    const [userSkipped, setUserSkipped] = useState(() => hasSkippedLocation());

    const timeoutRef = useRef(null);
    const hasRequestedRef = useRef(false);

    /**
     * Request fresh location from browser
     */
    const requestLocation = useCallback(async () => {
        console.log('[LocationContext] ========================================');
        console.log('[LocationContext] LOCATION CAPTURE STARTED');
        console.log('[LocationContext] Timestamp:', new Date().toISOString());
        console.log('[LocationContext] ========================================');

        setLoading(true);
        setError(null);

        // Check if geolocation is supported
        if (!navigator.geolocation) {
            console.warn('[LocationContext] Geolocation not supported');
            setError('Geolocation is not supported by your browser');
            setLoading(false);
            return;
        }

        // Set up timeout
        const timeoutPromise = new Promise((_, reject) => {
            timeoutRef.current = setTimeout(() => {
                reject(new Error('Location request timed out'));
            }, LOCATION_TIMEOUT);
        });

        // Request location
        const locationPromise = new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
                (position) => resolve(position),
                (err) => reject(err),
                {
                    enableHighAccuracy: true,
                    timeout: LOCATION_TIMEOUT,
                    maximumAge: 0
                }
            );
        });

        try {
            const position = await Promise.race([locationPromise, timeoutPromise]);

            // Clear timeout
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }

            const { latitude, longitude, accuracy } = position.coords;

            console.log('[LocationContext] ✅ LOCATION CAPTURED!');
            console.log('[LocationContext] Lat:', latitude, 'Lng:', longitude);
            console.log('[LocationContext] Accuracy:', accuracy, 'meters');

            // Update coordinates
            setCoords({ latitude, longitude, accuracy });
            setPermissionGranted(true);
            setPermissionDenied(false);

            // Reverse geocode to get city name
            console.log('[LocationContext] 🌍 Reverse geocoding...');
            const geoData = await reverseGeocode(latitude, longitude);

            console.log('[LocationContext] 📍 Location:', geoData.city, geoData.state, geoData.country);

            setCity(geoData.city);
            setState(geoData.state);
            setCountry(geoData.country);
            setDisplayName(geoData.displayName);

            // Prepare full location data
            const fullLocationData = {
                latitude,
                longitude,
                accuracy,
                city: geoData.city,
                state: geoData.state,
                country: geoData.country,
                displayName: geoData.displayName,
                postcode: geoData.postcode,
                provider: 'browser',
                permission_status: 'granted',
                timestamp: Date.now()
            };

            // Cache locally
            setCachedLocation(fullLocationData);

            // Send to backend for analytics/tracking
            console.log('[LocationContext] 📤 Sending to backend...');
            const response = await sendLocationToBackend(fullLocationData);
            if (response) {
                console.log('[LocationContext] ✅ Backend saved! ID:', response.id);
            }

            setLoading(false);

        } catch (err) {
            // Clear timeout
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }

            console.warn('[LocationContext] ⚠️ Location error:', err.message);

            // TRY IP-BASED FALLBACK immediately
            console.log('[LocationContext] Trying IP-based fallback...');
            const ipLocation = await getIPBasedLocation();

            if (ipLocation) {
                // SUCCESS! Use IP location as fallback
                console.log('[LocationContext] ✅ Using IP-based location:', ipLocation.city);

                setCoords({
                    latitude: ipLocation.latitude,
                    longitude: ipLocation.longitude,
                    accuracy: ipLocation.accuracy
                });
                setCity(ipLocation.city);
                setState(ipLocation.state);
                setCountry(ipLocation.country);
                setDisplayName(ipLocation.displayName);
                setPermissionGranted(true); // Allow app access with IP location
                setPermissionDenied(false);
                setError(null);
                setLoading(false);

                // Cache the IP location
                setCachedLocation({
                    latitude: ipLocation.latitude,
                    longitude: ipLocation.longitude,
                    accuracy: ipLocation.accuracy,
                    city: ipLocation.city,
                    state: ipLocation.state,
                    country: ipLocation.country,
                    displayName: ipLocation.displayName,
                    provider: 'ip_fallback'
                });

                // Send to backend
                sendLocationToBackend({
                    ...ipLocation,
                    permission_status: 'granted_via_ip'
                });

                return; // Success! Exit early
            }

            // IP FALLBACK ALSO FAILED - Show error to user
            let userMessage = 'Unable to get location';
            let status = 'error';

            if (err.code === 1) {
                userMessage = 'Location permission denied. Please enable in browser settings.';
                status = 'denied';
                setPermissionDenied(true);
            } else if (err.code === 2) {
                userMessage = 'Location unavailable. Check your device settings.';
                status = 'unavailable';
            } else if (err.code === 3 || err.message.includes('timeout')) {
                userMessage = 'Location request timed out. Please try again.';
                status = 'timeout';
            }

            setError(userMessage);
            setLoading(false);

            // Send status to backend for analytics
            sendLocationToBackend({
                latitude: 0,
                longitude: 0,
                permission_status: status,
                provider: 'browser'
            });
        }
    }, []);

    /**
     * Retry location request (user-initiated)
     */
    const retry = useCallback(() => {
        console.log('[LocationContext] User initiated retry...');
        hasRequestedRef.current = false;
        requestLocation();
    }, [requestLocation]);

    /**
     * Skip location for now - persists for 24 hours
     */
    const skipForNow = useCallback(() => {
        console.log('[LocationContext] User skipped location (saved for 24 hours)');
        setLoading(false);
        setError(null);
        setUserSkipped(true);
        setSkippedLocation();
    }, []);

    /**
     * Clear location data
     */
    const clearLocation = useCallback(() => {
        console.log('[LocationContext] Clearing location data');
        setCoords(null);
        setCity('');
        setState('');
        setCountry('');
        setDisplayName('');
        setPermissionGranted(false);
        localStorage.removeItem('mhub_location');
    }, []);

    /**
     * Initialize: Check cache first, then request fresh location
     * IMPORTANT: Don't prompt if user has skipped within 24 hours
     */
    useEffect(() => {
        if (hasRequestedRef.current) return;
        hasRequestedRef.current = true;

        console.log('[LocationContext] Initializing...');

        // Check if user previously skipped (within 24 hours)
        if (hasSkippedLocation()) {
            console.log('[LocationContext] User skipped location within 24 hours, not prompting again');
            setLoading(false);
            setUserSkipped(true);
            return;
        }

        // Check for cached location first
        const cached = getCachedLocation();
        if (cached) {
            setCoords({ latitude: cached.latitude, longitude: cached.longitude, accuracy: cached.accuracy });
            setCity(cached.city || '');
            setState(cached.state || '');
            setCountry(cached.country || '');
            setDisplayName(cached.displayName || '');
            setPermissionGranted(true);
            setLoading(false);

            // Still request fresh location in background (silent update)
            console.log('[LocationContext] Using cache, but requesting fresh location in background...');
            setTimeout(() => {
                requestLocation();
            }, 5000); // Delay background refresh to 5 seconds
        } else {
            // No cache, request immediately
            requestLocation();
        }

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [requestLocation]);

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

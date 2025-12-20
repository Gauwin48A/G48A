import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const API_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000') + "/api/location";
const LOCATION_TIMEOUT = 10000; // 10 seconds
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

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
 * Uses free OpenStreetMap Nominatim API
 */
async function reverseGeocode(lat, lng) {
    try {
        const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`;
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

        return {
            city: address.city || address.town || address.village || address.county || 'Unknown',
            state: address.state || address.region || '',
            country: address.country || 'Unknown',
            displayName: data.display_name || '',
            postcode: address.postcode || ''
        };
    } catch (error) {
        console.error('[LocationContext] Reverse geocoding failed:', error);
        return { city: 'Unknown', state: '', country: 'Unknown', displayName: '', postcode: '' };
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

export function LocationProvider({ children }) {
    // Location state
    const [coords, setCoords] = useState(null);
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [country, setCountry] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [permissionGranted, setPermissionGranted] = useState(false);
    const [permissionDenied, setPermissionDenied] = useState(false);

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

            // Still send status to backend for analytics
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
     * Skip location for now
     */
    const skipForNow = useCallback(() => {
        console.log('[LocationContext] User skipped location');
        setLoading(false);
        setError(null);
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
     */
    useEffect(() => {
        if (hasRequestedRef.current) return;
        hasRequestedRef.current = true;

        console.log('[LocationContext] Initializing...');

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
            }, 2000);
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

        // Helpers
        hasLocation: !!coords,
        locationString: city ? `${city}${state ? ', ' + state : ''}` : 'Location not set'
    };

    return (
        <LocationContext.Provider value={value}>
            {children}
        </LocationContext.Provider>
    );
}

export default LocationContext;

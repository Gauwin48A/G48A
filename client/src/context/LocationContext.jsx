import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import * as NativeGPS from '../services/nativeGpsService';
import * as LocationService from '../services/locationService';

const API_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000') + "/api/location";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes - fresher location like banking apps
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
 * Reverse geocode coordinates to get city/state/country
 * Uses free OpenStreetMap Nominatim API with zoom=18 for max precision
 */
async function reverseGeocode(lat, lng) {
    try {
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
        const specificLocation = address.village ||
            address.suburb ||
            address.neighbourhood ||
            address.hamlet ||
            address.locality ||
            address.town ||
            address.city ||
            address.county ||
            'Unknown';

        const district = address.county || address.state_district || '';

        return {
            city: specificLocation,
            district: district,
            state: address.state || address.region || '',
            country: address.country || 'Unknown',
            displayName: data.display_name || '',
            postcode: address.postcode || '',
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
        console.log('[LocationContext] Manual location saved:', locationData.city);
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
    const requestLocation = useCallback(async () => {
        console.log('[LocationContext] ========================================');
        console.log('[LocationContext] BANKING-GRADE CAPTURE STARTED');
        console.log('[LocationContext] Timestamp:', new Date().toISOString());
        console.log('[LocationContext] ========================================');

        setLoading(true);
        setError(null);

        try {
            // Use Upgraded Banking-Grade Service
            const locationData = await LocationService.getCurrentLocation();

            console.log('[LocationContext] ✅ LOCATION CAPTURED!');
            console.log('[LocationContext] City:', locationData.city);
            console.log('[LocationContext] Accuracy:', locationData.accuracy, 'meters');

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
            setPermissionGranted(true);
            setPermissionDenied(false);
            setLoading(false);

            // Cache the location
            setCachedLocation({
                ...locationData,
                timestamp: Date.now()
            });

            // Send to backend
            sendLocationToBackend({
                ...locationData,
                permission_status: 'granted'
            });

            return locationData;

        } catch (err) {
            console.warn('[LocationContext] ⚠️ Native GPS failed:', err.message);

            // Try IP-based fallback
            console.log('[LocationContext] Trying IP-based fallback...');
            const ipLocation = await getIPBasedLocation();

            if (ipLocation) {
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
                setPermissionGranted(true);
                setPermissionDenied(false);
                setLoading(false);

                setCachedLocation({
                    ...ipLocation,
                    timestamp: Date.now()
                });

                sendLocationToBackend({
                    ...ipLocation,
                    permission_status: 'granted_via_ip'
                });

                return ipLocation;
            }

            // All methods failed
            let userMessage = 'Unable to get location';
            if (err.message.includes('denied')) {
                userMessage = 'Location permission denied. Please enable in settings.';
                setPermissionDenied(true);
            } else if (err.message.includes('timeout')) {
                userMessage = 'Location request timed out. Please try again.';
            }

            setError(userMessage);
            setLoading(false);

            sendLocationToBackend({
                latitude: 0,
                longitude: 0,
                permission_status: 'error',
                provider: 'none'
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
     * Set manual location (user override)
     */
    const setManualLocation = useCallback((locationData) => {
        console.log('[LocationContext] Setting manual location:', locationData);

        setCoords({
            latitude: locationData.latitude,
            longitude: locationData.longitude,
            accuracy: 0
        });
        setCity(locationData.city || '');
        setState(locationData.state || '');
        setCountry(locationData.country || '');
        setDisplayName(locationData.city || '');

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

        console.log('[LocationContext] Initializing...');

        // Check if user previously skipped (within 24 hours)
        if (hasSkippedLocation()) {
            console.log('[LocationContext] User skipped location within 24 hours, not prompting again');
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
            setPermissionGranted(true);
            setLoading(false);

            // Still request fresh location in background (silent update)
            console.log('[LocationContext] Using cache, but requesting fresh location in background...');
            setTimeout(() => {
                requestLocation();
            }, 5000);
        } else {
            // No cache, request immediately
            requestLocation();
        }
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

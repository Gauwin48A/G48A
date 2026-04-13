/**
 * Native GPS Location Service
 * Uses Capacitor Geolocation for native device GPS
 * Falls back to browser geolocation for web
 */

import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

const LOCATION_TIMEOUT = 60000; // 60 seconds for GPS lock
const DEBUG = import.meta.env.DEV;
const debugLog = (...args) => { if (DEBUG) console.log(...args); };
const debugError = (...args) => { if (DEBUG) console.error(...args); };

/**
 * Check if running on native platform (Android/iOS)
 */
export const isNativePlatform = () => {
    return Capacitor.isNativePlatform();
};

/**
 * Get current platform name
 */
export const getPlatform = () => {
    return Capacitor.getPlatform(); // 'android', 'ios', or 'web'
};

/**
 * Check and request location permissions
 * @returns {Promise<boolean>} true if permission granted
 */
export const checkLocationPermission = async () => {
    try {
        const status = await Geolocation.checkPermissions();
        debugLog('[NativeGPS] Permission status:', status.location);

        if (status.location === 'granted') {
            return true;
        }

        // Request permission if not granted
        if (status.location === 'prompt' || status.location === 'prompt-with-rationale') {
            const newStatus = await Geolocation.requestPermissions();
            return newStatus.location === 'granted';
        }

        return false;
    } catch (error) {
        debugError('[NativeGPS] Permission check failed:', error);
        return false;
    }
};

/**
 * Get current position using native GPS
 * This uses the device's GPS hardware for high accuracy
 * 
 * @returns {Promise<{latitude, longitude, accuracy, altitude, speed, heading}>}
 */
export const getCurrentPosition = async () => {
    debugLog('[NativeGPS] ================================');
    debugLog('[NativeGPS] NATIVE GPS DETECTION STARTED');
    debugLog('[NativeGPS] Platform:', getPlatform());
    debugLog('[NativeGPS] Is Native:', isNativePlatform());
    debugLog('[NativeGPS] ================================');

    try {
        // Check permissions first
        const hasPermission = await checkLocationPermission();
        if (!hasPermission) {
            throw new Error('Location permission denied');
        }

        // Get position with high accuracy (uses GPS on mobile)
        const position = await Geolocation.getCurrentPosition({
            enableHighAccuracy: true,    // Use GPS, not WiFi/Cell
            timeout: LOCATION_TIMEOUT,   // 60 second timeout
            maximumAge: 0                // Never use cached position
        });

        debugLog('[NativeGPS] âœ… GPS SUCCESS!');
        debugLog('[NativeGPS] Latitude:', position.coords.latitude);
        debugLog('[NativeGPS] Longitude:', position.coords.longitude);
        debugLog('[NativeGPS] Accuracy:', position.coords.accuracy, 'meters');
        debugLog('[NativeGPS] Altitude:', position.coords.altitude);
        debugLog('[NativeGPS] Speed:', position.coords.speed);
        debugLog('[NativeGPS] Heading:', position.coords.heading);

        return {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            speed: position.coords.speed,
            heading: position.coords.heading,
            timestamp: position.timestamp,
            provider: isNativePlatform() ? 'native_gps' : 'browser_gps'
        };

    } catch (error) {
        debugError('[NativeGPS] âŒ GPS ERROR:', error);
        throw error;
    }
};

/**
 * Watch position continuously (for real-time tracking)
 * @param {Function} callback - Called with each position update
 * @param {Function} errorCallback - Called on error
 * @returns {string} watchId - Use to stop watching
 */
export const watchPosition = async (callback, errorCallback) => {
    try {
        const hasPermission = await checkLocationPermission();
        if (!hasPermission) {
            throw new Error('Location permission denied');
        }

        const watchId = await Geolocation.watchPosition(
            {
                enableHighAccuracy: true,
                timeout: LOCATION_TIMEOUT,
                maximumAge: 0
            },
            (position, err) => {
                if (err) {
                    debugError('[NativeGPS] Watch error:', err);
                    errorCallback?.(err);
                    return;
                }

                debugLog('[NativeGPS] Position update:', position.coords.latitude, position.coords.longitude);
                callback({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    altitude: position.coords.altitude,
                    speed: position.coords.speed,
                    heading: position.coords.heading,
                    timestamp: position.timestamp,
                    provider: isNativePlatform() ? 'native_gps' : 'browser_gps'
                });
            }
        );

        debugLog('[NativeGPS] Watch started, ID:', watchId);
        return watchId;

    } catch (error) {
        debugError('[NativeGPS] Watch setup failed:', error);
        throw error;
    }
};

/**
 * Stop watching position
 * @param {string} watchId - ID from watchPosition
 */
export const clearWatch = async (watchId) => {
    try {
        await Geolocation.clearWatch({ id: watchId });
        debugLog('[NativeGPS] Watch cleared:', watchId);
    } catch (error) {
        debugError('[NativeGPS] Clear watch failed:', error);
    }
};

/**
 * Reverse geocode coordinates to get city/address
 * Uses OpenStreetMap Nominatim
 */
export const reverseGeocode = async (lat, lng) => {
    try {
        const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en&zoom=18&addressdetails=1`;
        const response = await fetch(url, {
            headers: { 'User-Agent': 'MHub/1.0 (marketplace app)' }
        });

        if (!response.ok) throw new Error('Geocoding failed');

        const data = await response.json();
        const address = data.address || {};

        // Get the most specific location name
        const specificLocation = address.village ||
            address.suburb ||
            address.neighbourhood ||
            address.hamlet ||
            address.locality ||
            address.town ||
            address.city ||
            address.county ||
            'Unknown';

        debugLog('[NativeGPS] Geocoded to:', specificLocation);

        return {
            city: specificLocation,
            district: address.county || address.state_district || '',
            state: address.state || '',
            country: address.country || 'India',
            postcode: address.postcode || '',
            displayName: data.display_name || ''
        };

    } catch (error) {
        debugError('[NativeGPS] Geocoding failed:', error);
        return null;
    }
};

/**
 * Get full location with city name (combines GPS + geocoding)
 * This is the main function to use for getting accurate location
 */
export const getFullLocation = async () => {
    // Get GPS coordinates
    const coords = await getCurrentPosition();

    // Geocode to get city name
    const geoData = await reverseGeocode(coords.latitude, coords.longitude);

    return {
        ...coords,
        ...(geoData || {}),
        timestamp: Date.now()
    };
};

export default {
    isNativePlatform,
    getPlatform,
    checkLocationPermission,
    getCurrentPosition,
    watchPosition,
    clearWatch,
    reverseGeocode,
    getFullLocation
};

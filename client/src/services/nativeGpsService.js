/**
 * Native GPS Location Service
 * Uses Capacitor Geolocation for native device GPS
 * Falls back to browser geolocation for web
 */

import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

const LOCATION_TIMEOUT = 60000; // 60 seconds for GPS lock

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
        console.log('[NativeGPS] Permission status:', status.location);

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
        console.error('[NativeGPS] Permission check failed:', error);
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
    console.log('[NativeGPS] ================================');
    console.log('[NativeGPS] NATIVE GPS DETECTION STARTED');
    console.log('[NativeGPS] Platform:', getPlatform());
    console.log('[NativeGPS] Is Native:', isNativePlatform());
    console.log('[NativeGPS] ================================');

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

        console.log('[NativeGPS] ✅ GPS SUCCESS!');
        console.log('[NativeGPS] Latitude:', position.coords.latitude);
        console.log('[NativeGPS] Longitude:', position.coords.longitude);
        console.log('[NativeGPS] Accuracy:', position.coords.accuracy, 'meters');
        console.log('[NativeGPS] Altitude:', position.coords.altitude);
        console.log('[NativeGPS] Speed:', position.coords.speed);
        console.log('[NativeGPS] Heading:', position.coords.heading);

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
        console.error('[NativeGPS] ❌ GPS ERROR:', error);
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
                    console.error('[NativeGPS] Watch error:', err);
                    errorCallback?.(err);
                    return;
                }

                console.log('[NativeGPS] Position update:', position.coords.latitude, position.coords.longitude);
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

        console.log('[NativeGPS] Watch started, ID:', watchId);
        return watchId;

    } catch (error) {
        console.error('[NativeGPS] Watch setup failed:', error);
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
        console.log('[NativeGPS] Watch cleared:', watchId);
    } catch (error) {
        console.error('[NativeGPS] Clear watch failed:', error);
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

        console.log('[NativeGPS] Geocoded to:', specificLocation);

        return {
            city: specificLocation,
            district: address.county || address.state_district || '',
            state: address.state || '',
            country: address.country || 'India',
            postcode: address.postcode || '',
            displayName: data.display_name || ''
        };

    } catch (error) {
        console.error('[NativeGPS] Geocoding failed:', error);
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

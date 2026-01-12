import { Geolocation } from '@capacitor/geolocation';

// 1. BANKING-GRADE CONFIGURATION
const GEO_OPTIONS = {
  enableHighAccuracy: true, // Forces GPS/WiFi hardware usage
  timeout: 15000,           // Wait max 15s for satellite lock
  maximumAge: 300000        // Accept cached location if < 5 mins old (Saves Battery)
};

const MIN_MOVEMENT_THRESHOLD = 500; // meters

/**
 * Helper: Convert Lat/Lng to Human Address (Reverse Geocoding)
 * Uses OpenStreetMap (Free, No API Key required for moderate usage)
 */
const resolveAddress = async (lat, lng) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=en&zoom=18&addressdetails=1`,
      { headers: { 'User-Agent': 'MHub/1.0 (Banking-Grade Location Engine)' } }
    );
    const data = await response.json();

    // Extract meaningful parts like "Whitefield, Bangalore"
    const address = data.address || {};
    const city = address.city || address.town || address.village || address.suburb || address.locality || 'Unknown';
    const state = address.state || '';
    const pincode = address.postcode || '';
    const district = address.state_district || address.county || '';

    return {
      formatted: `${city}${state ? ', ' + state : ''}`,
      city,
      state,
      pincode,
      district
    };
  } catch (err) {
    console.warn("[LocationService] Address resolution failed:", err);
    return { formatted: "Unknown Location", city: "Unknown", state: "", pincode: "", district: "" };
  }
};

/**
 * THE CORE LOCATION FUNCTION (Banking-Grade)
 */
export const getCurrentLocation = async () => {
  try {
    // A. Check and Request Permissions
    const permissionStatus = await Geolocation.checkPermissions();
    if (permissionStatus.location !== 'granted') {
      const requestStatus = await Geolocation.requestPermissions();
      if (requestStatus.location !== 'granted') {
        throw new Error("Location permission denied. Cannot capture high-accuracy logs.");
      }
    }

    // B. Get Precise Coordinates (Hardware Lock)
    const coordinates = await Geolocation.getCurrentPosition(GEO_OPTIONS);
    const { latitude, longitude, speed, accuracy } = coordinates.coords;

    // C. Get Human Address (The "Smart" Touch)
    const addressData = await resolveAddress(latitude, longitude);

    return {
      latitude,
      longitude,
      lat: latitude, // Support both naming conventions for compatibility
      lng: longitude,
      accuracy,
      speed: speed || 0,
      address: addressData,
      city: addressData.city,
      state: addressData.state,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error("[LocationService] Critical Location Error:", error);
    throw error;
  }
};

/**
 * Send location data to the backend
 * @param {Object} locationData - Location data to send
 * @returns {Promise<Object>} - Server response
 */
export async function sendLocation(locationData) {
  console.log("[LocationService] Sending location to backend:", locationData);

  let attempts = 0;
  let lastError = null;
  const API_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000') + "/api/location";

  while (attempts < 3) {
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(locationData),
        credentials: "include",
      });

      if (!response.ok) {
        const errText = await response.text();
        lastError = `Server returned ${response.status}: ${errText}`;
        throw new Error(lastError);
      }

      const result = await response.json();
      console.log("[LocationService] Backend response:", result);
      return result;
    } catch (error) {
      lastError = error.message;
      console.error("[LocationService] sendLocation error (attempt " + (attempts + 1) + "):", lastError);
      attempts++;
      if (attempts >= 3) throw new Error(lastError);
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

/**
 * Capture and Sync Location (Phase 3: Fraud Fingerprint)
 */
export async function captureLocation(userId = null) {
  try {
    const loc = await getCurrentLocation();

    // Send to backend (log history)
    const response = await sendLocation({
      user_id: userId,
      latitude: loc.latitude,
      longitude: loc.longitude,
      accuracy: loc.accuracy,
      speed: loc.speed,
      city: loc.city,
      state: loc.state,
      provider: "native_gps",
      permission_status: "granted"
    });

    // Cache the rich data
    localStorage.setItem("user_location", JSON.stringify(loc));
    localStorage.setItem("mhub_user_city", loc.city);

    return { ...loc, backend: response };
  } catch (error) {
    console.warn("[LocationService] captureLocation failed:", error.message);
    throw error;
  }
}

/**
 * Clear cached location (use when logging out)
 */
export function clearCachedLocation() {
  console.log("[LocationService] Clearing cached location");
  localStorage.removeItem("user_location");
  localStorage.removeItem("mhub_user_city");
}

/**
 * Get cached location from localStorage
 * @returns {Object|null} - Cached location or null
 */
export function getCachedLocation() {
  try {
    const cached = localStorage.getItem("user_location");
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
    console.error("[LocationService] Failed to parse cached location:", e);
  }
  return null;
}

/**
 * BACKWARD COMPATIBILITY: Haversine distance
 */
const getDistanceInMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/**
 * Smart Sync: Check if user moved significantly before syncing (Zero Maintenance)
 */
export async function checkAndSyncLocation(userId = null) {
  try {
    const loc = await getCurrentLocation();
    const lastSaved = getCachedLocation();

    if (lastSaved?.lat && lastSaved?.lng) {
      const distance = getDistanceInMeters(lastSaved.lat, lastSaved.lng, loc.lat, loc.lng);
      if (distance < MIN_MOVEMENT_THRESHOLD) {
        console.log(`[LocationService] Movement ${Math.round(distance)}m < threshold. Skipping sync.`);
        return loc;
      }
    }

    return await syncLocationToBackend(userId || localStorage.getItem('userId'), loc);
  } catch (error) {
    console.warn("[LocationService] Smart sync failed:", error.message);
  }
}

/**
 * SYNC TO BACKEND (The "Paper Trail")
 */
export async function syncLocationToBackend(userId, locationData = null) {
  if (!userId) return;

  try {
    const loc = locationData || await getCurrentLocation();
    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    const token = localStorage.getItem('authToken');

    // Dual Sync: 1. Update Profile | 2. Add to logs
    const response = await fetch(`${API_BASE}/api/users/${userId}/location`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        latitude: loc.lat,
        longitude: loc.lng,
        city: loc.address.city,
        state: loc.address.state,
        pincode: loc.address.pincode,
        device_speed: loc.speed,
        last_active_at: new Date().toISOString()
      })
    });

    if (response.ok) {
      localStorage.setItem('mhub_user_city', loc.address.city);
      localStorage.setItem('user_location', JSON.stringify(loc));
      console.log("[LocationService] Location Secured in Profile:", loc.address.city);
    }

    return loc;
  } catch (err) {
    console.error("[LocationService] Sync failed:", err);
    return null;
  }
}

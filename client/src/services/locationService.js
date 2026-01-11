const API_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000') + "/api/location";

// Protocol: Native Hybrid - Smart Location
const MIN_MOVEMENT_THRESHOLD = 500; // meters

/**
 * Get browser's timezone (for fraud detection triangulation)
 * @returns {string} Timezone e.g., "Asia/Kolkata"
 */
const getBrowserTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (e) {
    console.warn('[LocationService] Could not get timezone:', e);
    return null;
  }
};

/**
 * Haversine formula to calculate distance in meters
 */
const getDistanceInMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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
 * Capture current location from browser and send to backend.
 * Use this for login/signup events to refresh location data.
 * @param {string} userId - Optional user ID to associate with location
 * @returns {Promise<Object>} - Location data with coords
 */
export function captureLocation(userId = null) {
  return new Promise((resolve, reject) => {
    console.log("[LocationService] captureLocation called for user:", userId || "anonymous");

    if (!navigator.geolocation) {
      const error = new Error("Geolocation not supported");
      console.error("[LocationService] ERROR:", error.message);
      reject(error);
      return;
    }

    console.log("[LocationService] Requesting fresh location...");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        console.log("[LocationService] captureLocation SUCCESS:");
        console.log("[LocationService] Latitude:", pos.coords.latitude);
        console.log("[LocationService] Longitude:", pos.coords.longitude);

        const coords = {
          user_id: userId,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          altitude: pos.coords.altitude,
          heading: pos.coords.heading,
          speed: pos.coords.speed,
          timestamp: pos.timestamp,
          provider: "browser",
          permission_status: "granted",
          // Protocol: Reality Check - Send timezone for triangulation
          timezone: getBrowserTimezone()
        };

        try {
          const response = await sendLocation(coords);

          // Update cached location
          const locationData = {
            ...coords,
            city: response.location?.city || 'Unknown',
            country: response.location?.country || 'Unknown'
          };
          localStorage.setItem("user_location", JSON.stringify(locationData));
          console.log("[LocationService] Location cached and synced to backend");

          resolve(locationData);
        } catch (err) {
          // Handle VPN/Spoofing block errors
          if (err.message?.includes('403') || err.message?.includes('Security') || err.message?.includes('Location')) {
            console.error("[LocationService] 🔴 Blocked by fraud detection:", err.message);
            // Don't cache location if blocked for fraud
            reject(new Error(err.message || 'Location verification failed'));
            return;
          }

          console.error("[LocationService] Failed to sync location to backend:", err);
          // Still resolve with coords since we have the location
          localStorage.setItem("user_location", JSON.stringify(coords));
          resolve(coords);
        }
      },
      (err) => {
        console.error("[LocationService] captureLocation ERROR:");
        console.error("[LocationService] Code:", err.code, "Message:", err.message);

        // Don't reject - just log and resolve with null
        // This way login/signup can continue even if location fails
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  });
}

/**
 * Clear cached location (use when logging out)
 */
export function clearCachedLocation() {
  console.log("[LocationService] Clearing cached location");
  localStorage.removeItem("user_location");
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
 * Smart Sync: Check if user moved significantly before syncing
 * Only sends to server if user moved > 500m
 * Reduces server load by 99.9% for stationary users
 */
export function checkAndSyncLocation() {
  if (!navigator.geolocation) {
    console.log("[LocationService] Geolocation not supported");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      // Check cached location
      const lastSaved = getCachedLocation();

      if (lastSaved && lastSaved.latitude && lastSaved.longitude) {
        const distance = getDistanceInMeters(
          lastSaved.latitude,
          lastSaved.longitude,
          lat,
          lng
        );

        // If user moved less than threshold, skip server update
        if (distance < MIN_MOVEMENT_THRESHOLD) {
          console.log(`[LocationService] User moved only ${Math.round(distance)}m. Skipping sync.`);
          return;
        }

        console.log(`[LocationService] User moved ${Math.round(distance)}m. Syncing...`);
      }

      // Send to server (user moved significantly or first sync)
      try {
        const token = localStorage.getItem('token');

        // Protocol: Reality Check - Include timezone for fraud detection
        const timezone = getBrowserTimezone();

        const response = await fetch(API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token && { "Authorization": `Bearer ${token}` })
          },
          body: JSON.stringify({ latitude: lat, longitude: lng, timezone }),
          credentials: "include",
        });

        if (response.ok) {
          // Update cache
          localStorage.setItem("user_location", JSON.stringify({
            latitude: lat,
            longitude: lng,
            timestamp: Date.now()
          }));
          console.log("[LocationService] 📍 Location synced silently");
        } else if (response.status === 403) {
          // VPN or GPS spoofing detected
          const errorData = await response.json().catch(() => ({}));
          console.warn("[LocationService] 🔴 Fraud detected:", errorData.message || 'Access denied');
          // Show user-friendly alert
          if (typeof window !== 'undefined' && errorData.message) {
            alert(errorData.message);
          }
        }
      } catch (error) {
        console.error("[LocationService] Silent sync failed:", error.message);
      }
    },
    (error) => {
      console.warn("[LocationService] Location access denied or unavailable");
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
}


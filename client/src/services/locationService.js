const API_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000') + "/api/location";

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
          permission_status: "granted"
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

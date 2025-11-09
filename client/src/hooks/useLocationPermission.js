import { useState, useEffect } from "react";
import { sendLocation } from "../services/locationService";

export default function useLocationPermission() {
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [location, setLocation] = useState(null);

  useEffect(() => {
    const cached = localStorage.getItem("user_location");
    if (cached) {
      try {
        const parsedLocation = JSON.parse(cached);
        setPermissionGranted(true);
        setLocation(parsedLocation);
        return;
      } catch (e) {
        localStorage.removeItem("user_location");
      }
    }
    requestLocation();
  }, []);

  const requestLocation = () => {
    setLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      setLoading(false);
      
      // Send error status to backend
      sendLocation({
        latitude: 0,
        longitude: 0,
        permission_status: "error",
        provider: "browser"
      }).catch(console.error);
      
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = {
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

        setLocation(coords);

        try {
          const response = await sendLocation(coords);
          
          // Store location with city/country from backend
          const locationData = {
            ...coords,
            city: response.location?.city || 'Unknown',
            country: response.location?.country || 'Unknown'
          };
          
          localStorage.setItem("user_location", JSON.stringify(locationData));
          setPermissionGranted(true);
        } catch (err) {
          console.error("Failed to send location:", err);
          setError("Failed to send location. Please retry.");
        }

        setLoading(false);
      },
      async (err) => {
        let msg = "Failed to fetch location. Please retry.";
        let permissionStatus = "error";

        if (err.code === 1) {
          msg = "Permission denied. Please allow location access to continue.";
          permissionStatus = "denied";
        } else if (err.code === 2) {
          msg = "Location unavailable. Please retry.";
          permissionStatus = "error";
        } else if (err.code === 3) {
          msg = "Location request timed out. Please retry.";
          permissionStatus = "timeout";
        }

        // Send denied/error status to backend
        try {
          await sendLocation({
            latitude: 0,
            longitude: 0,
            permission_status: permissionStatus,
            provider: "browser"
          });
        } catch (e) {
          console.error("Failed to record permission status:", e);
        }

        setError(msg);
        setLoading(false);
      },
      { 
        enableHighAccuracy: true, 
        timeout: 15000,
        maximumAge: 0
      }
    );
  };

  const retry = () => {
    requestLocation();
  };

  return { permissionGranted, loading, error, retry, location };
}

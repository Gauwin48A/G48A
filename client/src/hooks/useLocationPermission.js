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
      setPermissionGranted(true);
      setLocation(JSON.parse(cached));
      return;
    }
    requestLocation();
  }, []);

  const requestLocation = () => {
    setLoading(true);
    setError(null);
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      setLoading(false);
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
        };
        setLocation(coords);
        try {
          await sendLocation(coords);
          localStorage.setItem("user_location", JSON.stringify(coords));
          setPermissionGranted(true);
        } catch (err) {
          setError("Failed to send location. Please retry.");
        }
        setLoading(false);
      },
      (err) => {
        let msg = "Failed to fetch location. Please retry.";
        if (err.code === 1)
          msg = "Permission denied. Please allow location access to continue.";
        if (err.code === 2) msg = "Location unavailable. Please retry.";
        if (err.code === 3) msg = "Location request timed out. Please retry.";
        setError(msg);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const retry = () => {
    requestLocation();
  };

  return { permissionGranted, loading, error, retry, location };
}

import React, { useState, useEffect } from "react";
import { WifiOff } from "lucide-react";

/**
 * NetworkStatusBanner.jsx - Realtime Offline Network Connection Banner
 */
export default function NetworkStatusBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-600 text-white px-4 py-2 text-center text-xs font-semibold flex items-center justify-center gap-2 shadow-lg animate-pulse">
      <WifiOff className="w-4 h-4" />
      <span>You are currently offline. Check your internet connection.</span>
    </div>
  );
}

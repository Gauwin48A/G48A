import { useEffect, useState } from "react";

const normalizeDensity = (value, fallback) =>
  value === "full" ? "full" : fallback || "compact";

export function usePageDensity(storageKey, fallback = "compact") {
  const [density, setDensity] = useState(() => {
    if (typeof window === "undefined") return fallback;
    const stored = window.localStorage.getItem(storageKey);
    return normalizeDensity(stored, fallback);
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(storageKey, density);
  }, [density, storageKey]);

  return { density, setDensity };
}


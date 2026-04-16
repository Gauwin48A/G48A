import React, { useEffect, useRef, useState } from "react";
import {
  FiAlertCircle,
  FiCheckCircle,
  FiLoader,
  FiMapPin,
  FiNavigation,
  FiSearch,
  FiX,
} from "react-icons/fi";
import { useLocation } from "@/context/LocationContext";
import { useTranslation } from "react-i18next";

const POPULAR_CITIES = [
  { name: "Hyderabad", state: "Telangana", lat: 17.385, lng: 78.4867 },
  { name: "Vijayawada", state: "Andhra Pradesh", lat: 16.5062, lng: 80.648 },
  { name: "Bengaluru", state: "Karnataka", lat: 12.9716, lng: 77.5946 },
  { name: "Chennai", state: "Tamil Nadu", lat: 13.0827, lng: 80.2707 },
  { name: "Mumbai", state: "Maharashtra", lat: 19.076, lng: 72.8777 },
  { name: "Delhi", state: "Delhi", lat: 28.7041, lng: 77.1025 },
  { name: "Kolkata", state: "West Bengal", lat: 22.5726, lng: 88.3639 },
  { name: "Pune", state: "Maharashtra", lat: 18.5204, lng: 73.8567 },
];

const safeText = (value) => {
  if (value === undefined || value === null) return "";
  const normalized = String(value).trim();
  return normalized.length ? normalized : "";
};

const toSuggestion = (item) => {
  const latitude = Number(item.lat);
  const longitude = Number(item.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  const address = item.address || {};
  const area =
    safeText(address.neighbourhood) ||
    safeText(address.suburb) ||
    safeText(address.residential) ||
    safeText(address.locality);
  const city =
    safeText(address.city) ||
    safeText(address.town) ||
    safeText(address.village) ||
    safeText(address.municipality) ||
    safeText(address.county);
  const state = safeText(address.state);
  const country = safeText(address.country);
  const locality =
    safeText(address.city_district) || safeText(address.county) || safeText(address.borough);

  const title = area || city || safeText(item.display_name) || "Unknown location";
  const subtitle = [city, state, country].filter(Boolean).join(", ");

  return {
    id: `${item.place_id}`,
    title,
    subtitle,
    latitude,
    longitude,
    area,
    locality,
    city,
    state,
    country,
    district: safeText(address.state_district) || safeText(address.county),
    pincode: safeText(address.postcode),
    street:
      [safeText(address.house_number), safeText(address.road)].filter(Boolean).join(" ") ||
      safeText(address.road),
    displayName: safeText(item.display_name),
  };
};

export default function LocationSelector({ isOpen, onClose }) {
  const { t } = useTranslation();
  const {
    city,
    area,
    locality,
    state,
    country,
    displayName,
    setManualLocation,
    requestLocation,
    forceRefreshLocation,
  } = useLocation();

  const searchInputRef = useRef(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState(POPULAR_CITIES);
  const [isSearching, setIsSearching] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState(null);
  const [detectedLocation, setDetectedLocation] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    setError(null);
    setDetectedLocation(null);
    setIsSearching(false);
    setIsDetecting(false);
    setQuery("");
    setResults(POPULAR_CITIES);

    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);

    return () => clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setResults(POPULAR_CITIES);
      setIsSearching(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const url =
          "https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=8&accept-language=en&q=" +
          encodeURIComponent(trimmed);

        const response = await fetch(url, {
          method: "GET",
          signal: controller.signal,
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`Search failed (${response.status})`);
        }

        const payload = await response.json();
        const suggestions = Array.isArray(payload)
          ? payload.map(toSuggestion).filter(Boolean)
          : [];

        setResults(suggestions);
      } catch (searchError) {
        if (searchError?.name !== "AbortError") {
          setResults([]);
        }
      } finally {
        setIsSearching(false);
      }
    }, 500); // 500ms debounce to respect OSM rate limit (1 req/sec)

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [isOpen, query]);

  const applyManualLocation = (location) => {
    if (!location) return;

    setManualLocation({
      latitude: location.latitude,
      longitude: location.longitude,
      city: location.city || location.title || "",
      state: location.state || "",
      country: location.country || "",
      area: location.area || "",
      locality: location.locality || "",
      district: location.district || "",
      pincode: location.pincode || "",
      street: location.street || "",
      displayName: location.displayName || location.title || "",
      isManual: true,
    });

    onClose?.();
  };

  const detectCurrentLocation = async () => {
    setIsDetecting(true);
    setError(null);
    setDetectedLocation(null);

    try {
      // Use forceRefreshLocation to bypass all caches and get truly fresh GPS
      const location = forceRefreshLocation
        ? await forceRefreshLocation()
        : await requestLocation();
      setDetectedLocation(location);
      setTimeout(() => {
        onClose?.();
      }, 1200);
    } catch (captureError) {
      setError(
        captureError?.message ||
          "Unable to detect your exact location. Move near open sky and retry.",
      );
    } finally {
      setIsDetecting(false);
    }
  };

  if (!isOpen) return null;

  const currentLabel =
    displayName || [area || locality || city, state, country].filter(Boolean).join(", ");

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/50 sm:items-start sm:pt-20"
      onClick={onClose}
    >
      <div
        className="mx-0 flex h-[88dvh] w-full flex-col overflow-hidden rounded-t-2xl mhub-premium-surface shadow-2xl sm:mx-4 sm:h-auto sm:max-h-[calc(100dvh-6rem)] sm:max-w-md sm:rounded-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between bg-blue-600 px-4 py-3 text-white">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <FiMapPin className="h-5 w-5" />
            Select Location
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 hover:bg-blue-500"
            aria-label={t("close_location_selector")}
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b bg-gradient-to-r from-green-50 to-blue-50 p-4 dark:border-gray-700 dark:from-green-900/20 dark:to-blue-900/20">
          <button
            type="button"
            onClick={detectCurrentLocation}
            disabled={isDetecting}
            className={`w-full rounded-lg py-4 font-medium transition ${
              isDetecting
                ? "cursor-wait bg-gray-200 text-gray-500 dark:bg-gray-700"
                : "bg-green-500 text-white shadow-lg hover:bg-green-600"
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              {isDetecting ? <FiLoader className="h-5 w-5 animate-spin" /> : <FiNavigation className="h-5 w-5" />}
              {isDetecting ? "Detecting exact GPS..." : "Detect My Exact Location"}
            </span>
          </button>

          {error ? (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
              <div className="flex items-start gap-2">
                <FiAlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
                <p className="whitespace-pre-line text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
            </div>
          ) : null}

          {detectedLocation ? (
            <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20">
              <div className="flex items-start gap-2">
                <FiCheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" />
                <div>
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">
                    Location detected: {detectedLocation.displayName || detectedLocation.city}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-500">
                    Accuracy: �{Math.round(Number(detectedLocation.accuracy) || 0)}m
                  </p>
                  <p className="mt-1 text-xs text-green-500 dark:text-green-600">
                    {Number(detectedLocation.latitude).toFixed(6)},{" "}
                    {Number(detectedLocation.longitude).toFixed(6)}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="border-b p-4 dark:border-gray-700">
          <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
            {t("location_search_prompt")}
          </p>
          <div className="relative">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("location_search_placeholder")}
              className="mhub-input w-full rounded-lg py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          <p className="px-2 py-1 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
            {query.trim().length >= 3 ? "Area results" : "Popular cities"}
          </p>

          {isSearching ? (
            <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              {t("searching")}
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              No matching locations found.
            </div>
          ) : (
            results.map((item, index) => (
              <button
                key={item.id || `${item.name}-${index}`}
                type="button"
                onClick={() =>
                  applyManualLocation({
                    latitude: Number(item.latitude ?? item.lat),
                    longitude: Number(item.longitude ?? item.lng),
                    city: item.city || item.name,
                    state: item.state || "",
                    country: item.country || "India",
                    area: item.area || "",
                    locality: item.locality || "",
                    district: item.district || "",
                    pincode: item.pincode || "",
                    street: item.street || "",
                    displayName: item.displayName || item.title || item.name,
                  })
                }
                className="w-full rounded-lg px-4 py-3 text-left transition hover:bg-blue-50 dark:hover:bg-blue-900/20"
              >
                <div className="flex items-start gap-3">
                  <FiMapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500" />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-800 dark:text-white">
                      {item.title || item.name}
                    </p>
                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                      {item.subtitle || item.state}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {currentLabel ? (
          <div className="border-t bg-gray-50 px-4 py-3 dark:border-gray-600 dark:bg-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t("current_location_label")}
            </p>
            <p className="truncate text-sm font-medium text-gray-800 dark:text-white">{currentLabel}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

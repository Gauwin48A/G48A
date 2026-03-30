import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";

const FilterContext = createContext(null);
const FILTER_STORAGE_KEY = "mhub:filters";

export const DEFAULT_FILTERS = {
  search: "",
  category: "All",
  subcategory: "All",
  categoryGroup: "",
  condition: "",
  minRating: "",
  sortBy: "",
  latestWindow: "",
  location: "",
  minPrice: "",
  maxPrice: "",
  priceRange: "",
  startDate: "",
  endDate: "",
  verifiedOnly: false,
  page: 1,
};

function normalizeStoredFilters(rawFilters) {
  if (!rawFilters || typeof rawFilters !== "object") {
    return { ...DEFAULT_FILTERS };
  }
  return {
    ...DEFAULT_FILTERS,
    ...rawFilters,
  };
}

function readStoredFilters() {
  if (typeof window === "undefined") {
    return { ...DEFAULT_FILTERS };
  }
  try {
    const raw = window.localStorage.getItem(FILTER_STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_FILTERS };
    }
    return normalizeStoredFilters(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_FILTERS };
  }
}

export function FilterProvider({ children }) {
  const [filters, setFilters] = useState(readStoredFilters);

  const updateFilter = useCallback((key, value) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
      page: key === "page" ? value : 1,
    }));
  }, []);

  const resetFilters = useCallback((nextFilters = DEFAULT_FILTERS) => {
    setFilters(normalizeStoredFilters(nextFilters));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      FILTER_STORAGE_KEY,
      JSON.stringify(normalizeStoredFilters(filters))
    );
  }, [filters]);

  const value = useMemo(
    () => ({
      filters,
      setFilters,
      updateFilter,
      resetFilters,
    }),
    [filters, resetFilters, updateFilter],
  );

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}

export function useFilter() {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error("useFilter must be used within FilterProvider");
  }
  return context;
}

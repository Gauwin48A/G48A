import React, { createContext, useContext, useMemo, useState } from "react";

const FilterContext = createContext(null);

export const DEFAULT_FILTERS = {
  search: "",
  category: "All",
  sortBy: "",
  latestWindow: "",
  location: "",
  minPrice: "",
  maxPrice: "",
  priceRange: "",
  startDate: "",
  endDate: "",
  page: 1,
};

export function FilterProvider({ children }) {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const value = useMemo(
    () => ({
      filters,
      setFilters,
    }),
    [filters],
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

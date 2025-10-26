import React, { createContext, useContext, useState, useMemo } from 'react';

const FilterContext = createContext();

const defaultFilters = {
  search: '',
  category: 'All',
  sortBy: 'recent',
};

export function FilterProvider({ children }) {
  const [filters, setFilters] = useState(defaultFilters);
  const value = useMemo(() => ({ filters, setFilters }), [filters]);
  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}

export function useFilter() {
  return useContext(FilterContext);
}

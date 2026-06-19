import React, { useState, useCallback } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import AllPostsFilterPanel from "@/components/allposts/FilterPanel";
import { DEFAULT_FILTERS } from "@/context/FilterContext";

/**
 * AllPostsEnhancements — Adds the FilterPanel overlay + trigger button.
 * Renders alongside the AllPosts page content.
 */

const filterCount = (filters) => {
  let count = 0;
  if (filters.minPrice) count++;
  if (filters.maxPrice) count++;
  if (filters.location) count++;
  if (filters.condition) count++;
  if (filters.startDate || filters.endDate) count++;
  if (filters.verifiedOnly) count++;
  if (filters.premiumOnly) count++;
  if (filters.postType) count++;
  if (filters.sortBy) count++;
  return count;
};

export default function AllPostsEnhancements({ filters, setFilters, onApply }) {
  const [showPanel, setShowPanel] = useState(false);
  const activeCount = filterCount(filters);

  const handleApply = useCallback((newFilters) => {
    setFilters({ ...newFilters, page: 1 });
    setShowPanel(false);
    if (typeof onApply === "function") {
      onApply(newFilters);
    }
  }, [setFilters, onApply]);

  const handleClear = useCallback(() => {
    setFilters({ ...DEFAULT_FILTERS, page: 1 });
    setShowPanel(false);
  }, [setFilters]);

  return (
    <>
      {/* Filter trigger button — renders where placed */}
      <button
        type="button"
        onClick={() => setShowPanel(true)}
        className={`inline-flex items-center gap-1.5 px-3 py-2 min-h-[2.25rem] rounded-xl text-xs font-semibold transition-all ${
          activeCount > 0
            ? "bg-violet-600 text-white shadow-sm shadow-violet-200 dark:shadow-violet-900/30"
            : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
        }`}
        aria-label="Open filters"
      >
        <SlidersHorizontal className="w-3.5 h-3.5" />
        <span>Filters</span>
        {activeCount > 0 && (
          <Badge className="ml-0.5 bg-white/20 text-white border-0 text-[10px] px-1.5 py-0 min-w-[18px] flex items-center justify-center">
            {activeCount}
          </Badge>
        )}
      </button>

      {/* Filter panel overlay */}
      <AllPostsFilterPanel
        open={showPanel}
        onClose={() => setShowPanel(false)}
        filters={filters}
        onApplyFilters={handleApply}
        onClearFilters={handleClear}
        activeFilterCount={activeCount}
      />
    </>
  );
}

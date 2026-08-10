import React from "react";
import { X } from "lucide-react";

/**
 * CategoryFilterBar.jsx - Clean Category Filter & Active Filter Chips Component
 */
export default function CategoryFilterBar({
  categories = [],
  activeCategory = null,
  onSelectCategory,
  activeFilters = [],
  onRemoveFilter,
  t = (key) => key,
}) {
  return (
    <div className="w-full space-y-3 mb-4">
      {/* Category Pills Slider */}
      {categories.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            type="button"
            onClick={() => onSelectCategory(null)}
            className={`h-9 px-4 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              !activeCategory
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
            }`}
          >
            {t("all_categories") || "All Categories"}
          </button>
          {categories.map((cat) => {
            const isSelected = String(activeCategory) === String(cat.id || cat.slug || cat.name);
            return (
              <button
                key={cat.id || cat.slug || cat.name}
                type="button"
                onClick={() => onSelectCategory(cat.id || cat.slug || cat.name)}
                className={`h-9 px-4 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  isSelected
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
                }`}
              >
                {cat.name || cat.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Active Filter Chips */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {activeFilters.map((filter) => (
            <span
              key={filter.key}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60"
            >
              <span>{filter.label}</span>
              <button
                type="button"
                onClick={() => onRemoveFilter(filter.key)}
                className="hover:text-rose-600 transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

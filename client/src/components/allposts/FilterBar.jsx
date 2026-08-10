import React from "react";
import AllPostsQuickFilters from "./QuickFilters";
import AllPostsCategoryBar from "./CategoryBar";
import { useTranslation } from "react-i18next";

/**
 * FilterBar — sticky toolbar at top of AllPosts/ForYou page.
 * Renders the inline search input, quick filter chips, and category/subcategory bar.
 * All state lives in the parent AllPosts component and is passed as props.
 */
export default function FilterBar({
  // Search
  searchValue,
  onSearchChange,
  onClearSearch,
  searchPlaceholder,

  // Quick filters
  quickFiltersChips,
  isForYouMode,

  // Category bar
  categoryBarCategories,
  activeCategoryBarLabel,
  onCategorySelectAll,
  onCategorySelect,
  subcategoryList,
  activeSubcategoryLabel,
  onSubcategorySelectAll,
  onSubcategorySelect,

  // Layout
  maxWidthClass,
  secondaryStickyTop,
  secondaryStickyRef,

  // Density
  compact,
}) {
  const { t } = useTranslation();

  return (
    <div
      className="w-full sticky z-30 mhub-premium-bar mhub-allposts-toolbar"
      ref={secondaryStickyRef}
      style={{ top: `${secondaryStickyTop}px` }}
    >
      {/* ── Inline search input ──────────────── */}
      <div className="px-3 pt-1.5 pb-0">
        <div className="relative flex items-center w-full">
          <svg
            className="absolute left-3 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full h-10 pl-9 pr-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white dark:placeholder-slate-400 transition-all"
          />
          {searchValue ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onClearSearch(); }}
              className="absolute right-2 p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-500 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          ) : null}
        </div>
      </div>

      {/* ── Quick filters ──────────────── */}
      <div className="w-full mhub-allposts-filters">
        <AllPostsQuickFilters
          title={isForYouMode ? t("refine_for_you", "Refine For You") : t("quick_filters", "Quick filters")}
          variant={isForYouMode ? "forYou" : "default"}
          compact={true}
          inline={true}
          inlineWrap={isForYouMode}
          hideTitle={!isForYouMode}
          showDivider={false}
          chips={quickFiltersChips}
          maxWidthClass={maxWidthClass}
          embedded={false}
        />
      </div>

      {/* ── Category bar ──────────────── */}
      <AllPostsCategoryBar
        categories={categoryBarCategories}
        activeCategory={activeCategoryBarLabel}
        onSelectAll={onCategorySelectAll}
        onSelectCategory={onCategorySelect}
        subcategories={subcategoryList}
        activeSubcategory={activeSubcategoryLabel || "All"}
        onSelectAllSubcategories={onSubcategorySelectAll}
        onSelectSubcategory={onSubcategorySelect}
        maxWidthClass={maxWidthClass}
        compact={compact}
      />
    </div>
  );
}

import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FaFilter,
} from "react-icons/fa";
import { Sparkles, Grid } from "lucide-react";
import PageDensityToggle from "@/components/ui/PageDensityToggle";
import { usePageDensity } from "@/hooks/usePageDensity";

/**
 * AllPostsSubNav — Secondary sticky navigation bar for the AllPosts/ForYou page.
 * Simplified: view mode toggle (All Posts / For You) + results count + filter badge.
 */
const AllPostsSubNav = ({
  resultsCount = 0,
  activeFilterCount = 0,
  onClearFilters,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const normalizedPath = (location.pathname || "").replace(/\/+$/, "") || "/";
  const isForYouMode = normalizedPath.startsWith("/for-you") || searchParams.get("mode") === "for-you";
  const { density, setDensity } = usePageDensity("mhub_allposts_subnav_density");

  const handleViewSwitch = (mode) => {
    if (mode === "for-you") {
      navigate("/for-you");
    } else {
      navigate("/all-posts");
    }
  };

  return (
    <div
      className="allposts-subnav sticky z-40 w-full border-b border-slate-200/70 dark:border-slate-800/60 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md shadow-sm"
      style={{ top: "calc(var(--top-nav-height, 56px))" }}
    >
      <div className="mx-auto flex w-full max-w-[640px] items-center justify-between gap-2 px-3 py-2">
        {/* View toggle pills */}
        <div className="flex items-center gap-1 rounded-full border border-slate-200/70 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-800/60 p-0.5">
          <button
            type="button"
            onClick={() => handleViewSwitch("all-posts")}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
              !isForYouMode
                ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t("all_posts", "All Posts")}</span>
          </button>
          <button
            type="button"
            onClick={() => handleViewSwitch("for-you")}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
              isForYouMode
                ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t("for_you", "For You")}</span>
          </button>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1.5">
          {/* Results count */}
          {resultsCount > 0 && (
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-slate-200/70 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-800/60 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
              {resultsCount} {t("results", "results")}
            </span>
          )}

          {/* Active filters badge */}
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={onClearFilters}
              className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-200/70 dark:border-blue-700/50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800/40 transition"
            >
              <FaFilter className="w-3 h-3" />
              {activeFilterCount}
            </button>
          )}

          {/* Density toggle */}
          <PageDensityToggle
            value={density}
            onChange={setDensity}
            label=""
            compact
          />
        </div>
      </div>
    </div>
  );
};

export default React.memo(AllPostsSubNav);

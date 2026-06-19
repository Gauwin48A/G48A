import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FaBolt, FaClock, FaMapMarkerAlt, FaTag,
  FaSyncAlt, FaList, FaTh, FaFilter,
} from "react-icons/fa";
import { Sparkles, Grid } from "lucide-react";
import PageDensityToggle from "@/components/ui/PageDensityToggle";
import { usePageDensity } from "@/hooks/usePageDensity";

/**
 * AllPostsSubNav — Secondary sticky navigation bar for the AllPosts page.
 *
 * Mirrors the For You page's secondary navbar pattern:
 * - View mode toggle (All Posts / For You)
 * - Quick filter chips (price ranges, latest, date, near me)
 * - Results count + density toggle
 * - Clear filters action
 */
const AllPostsSubNav = ({
  resultsCount = 0,
  activeFilterCount = 0,
  onClearFilters,
  onToggleAutoRefresh,
  onRefresh,
  autoRefreshEnabled = false,
  isRefreshing = false,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isForYouMode = searchParams.get("mode") === "for-you";
  const { density, setDensity } = usePageDensity("mhub_allposts_subnav_density");

  const handleViewSwitch = (mode) => {
    if (mode === "for-you") {
      navigate("/for-you");
    } else {
      navigate("/all-posts");
    }
  };

  /** Set a URL param and navigate, preserving existing params */
  const setFilterParam = (key, value, deleteKey) => {
    const params = new URLSearchParams(location.search);
    // Clear conflicting params
    if (deleteKey) params.delete(deleteKey);
    if (value === null || value === "" || value === undefined) {
      params.delete(key);
    } else {
      params.set(key, String(value));
    }
    const qs = params.toString();
    navigate(`${location.pathname}${qs ? "?" + qs : ""}`, { replace: true });
  };

  /** Toggle a price range filter */
  const togglePriceFilter = (min, max) => {
    const currentMin = searchParams.get("minPrice") || "";
    const currentMax = searchParams.get("maxPrice") || "";
    if (currentMin === String(min) && currentMax === String(max)) {
      // Toggle off
      setFilterParam("minPrice", "", "");
      setFilterParam("maxPrice", "", "");
    } else {
      setFilterParam("minPrice", String(min), "");
      setFilterParam("maxPrice", String(max), "");
    }
  };

  /** Toggle a single-value filter */
  const toggleFilter = (key, value) => {
    const current = searchParams.get(key) || "";
    if (current === String(value)) {
      setFilterParam(key, "", "");
    } else {
      setFilterParam(key, String(value), "");
    }
  };

  const isFilterActive = (key, value) => {
    return searchParams.get(key) === String(value);
  };

  const isPriceActive = (min, max) => {
    return searchParams.get("minPrice") === String(min) && searchParams.get("maxPrice") === String(max);
  };

  return (
    <div
      className="allposts-subnav sticky z-40 w-full border-b border-slate-200/70 dark:border-slate-800/60 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md shadow-sm"
      style={{ top: "calc(var(--top-nav-height, 56px))" }}
    >
      <div className="mx-auto flex w-full max-w-[640px] flex-col gap-1 px-3 py-2">
        {/* Row 1: View switcher + actions */}
        <div className="flex items-center justify-between gap-2">
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

            {/* Auto refresh toggle */}
            <button
              type="button"
              onClick={onToggleAutoRefresh}
              aria-pressed={autoRefreshEnabled}
              className={`inline-flex items-center justify-center rounded-full border p-1.5 text-xs transition ${
                autoRefreshEnabled
                  ? "border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-900/30 dark:text-emerald-300"
                  : "border-slate-200/70 bg-slate-50/80 text-slate-500 dark:border-slate-700/60 dark:bg-slate-800/60 dark:text-slate-400"
              }`}
              title={autoRefreshEnabled ? t("auto_refresh_on", "Auto-refresh on") : t("auto_refresh_off", "Auto-refresh off")}
            >
              <FaSyncAlt className={`w-3 h-3 ${autoRefreshEnabled ? "animate-spin" : ""}`} />
            </button>

            {/* Refresh */}
            <button
              type="button"
              onClick={typeof onRefresh === 'function' ? onRefresh : onToggleAutoRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center justify-center rounded-full border border-slate-200/70 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-800/60 p-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition disabled:opacity-50"
              title={t("refresh", "Refresh")}
            >
              <FaSyncAlt className={`w-3 h-3 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Row 2: Quick filter chips (only shown on /all-posts, not for-you mode) */}
        {!isForYouMode && (
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-0.5 -mx-0.5 px-0.5">
            <button
              type="button"
              onClick={() => togglePriceFilter("", "1000")}
              className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition whitespace-nowrap ${
                isPriceActive("", "1000")
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                  : "border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/80"
              }`}
            >
              <FaTag className="w-3 h-3 text-amber-500" />
              {t("under_1000", "Under ₹1K")}
            </button>
            <button
              type="button"
              onClick={() => togglePriceFilter("500", "2000")}
              className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition whitespace-nowrap ${
                isPriceActive("500", "2000")
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                  : "border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/80"
              }`}
            >
              <FaTag className="w-3 h-3 text-amber-500" />
              {t("500_to_2k", "₹500-₹2K")}
            </button>
            <button
              type="button"
              onClick={() => togglePriceFilter("2000", "10000")}
              className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition whitespace-nowrap ${
                isPriceActive("2000", "10000")
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                  : "border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/80"
              }`}
            >
              <FaTag className="w-3 h-3 text-amber-500" />
              {t("2k_to_10k", "₹2K-₹10K")}
            </button>
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                const ds = today.toISOString().split("T")[0];
                const currentStart = searchParams.get("startDate") || "";
                const currentEnd = searchParams.get("endDate") || "";
                if (currentStart === ds && currentEnd === ds) {
                  setFilterParam("startDate", "");
                  setFilterParam("endDate", "");
                } else {
                  setFilterParam("startDate", ds);
                  setFilterParam("endDate", ds);
                }
              }}
              className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition whitespace-nowrap ${
                (() => {
                  const today = new Date().toISOString().split("T")[0];
                  return searchParams.get("startDate") === today && searchParams.get("endDate") === today
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/80"
                })()
              }`}
            >
              <FaBolt className="w-3 h-3 text-yellow-500" />
              {t("posted_today", "Today")}
            </button>
            <button
              type="button"
              onClick={() => {
                const current = searchParams.get("latestWindow") || "";
                if (current === "10") {
                  setFilterParam("latestWindow", "");
                } else {
                  setFilterParam("latestWindow", "10");
                  setFilterParam("sortBy", "date_desc");
                }
              }}
              className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition whitespace-nowrap ${
                isFilterActive("latestWindow", "10")
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                  : "border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/80"
              }`}
            >
              <FaClock className="w-3 h-3 text-blue-500" />
              {t("latest_10", "Latest 10")}
            </button>
            <button
              type="button"
              onClick={() => {
                const userCity = (typeof window !== "undefined")
                  ? (localStorage.getItem("mhub_user_city") || localStorage.getItem("city") || "")
                  : "";
                const current = searchParams.get("location") || "";
                if (current === userCity) {
                  setFilterParam("location", "");
                } else if (userCity) {
                  setFilterParam("location", userCity);
                }
              }}
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-800/60 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition whitespace-nowrap"
            >
              <FaMapMarkerAlt className="w-3 h-3 text-red-500" />
              {t("near_me", "Near me")}
            </button>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (typeof onClearFilters === "function") {
                    onClearFilters();
                  } else {
                    navigate("/all-posts");
                  }
                }}
                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-50 dark:bg-red-900/20 border border-red-200/60 dark:border-red-800/40 px-2.5 py-1 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition whitespace-nowrap"
              >
                {t("clear_all", "Clear all")}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(AllPostsSubNav);

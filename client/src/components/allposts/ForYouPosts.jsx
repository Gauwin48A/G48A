import React from "react";
import { useTranslation } from "react-i18next";
import { FaArrowRight as ArrowRightIcon, FaBolt as BoltIcon, FaEye as EyeIcon, FaTimes as TimesIcon } from "react-icons/fa";

/**
 * ForYouPosts — For You mode hero section + feed for the AllPosts page.
 * Renders collapsible interests panel, stats grid, and action buttons.
 * The actual post cards are rendered elsewhere (via children / feed node).
 */
export default function ForYouPosts({
  forYouHeroExpanded,
  onToggleHeroExpanded,
  resultsCount,
  subcategoryCount,
  activeFiltersCount,
  onBrowseFeed,
  onShuffle,
  canShuffle,
  isAuthenticated,
  onClearFilters,
  hasActiveFilters,
  autoRefreshEnabled,
  onToggleAutoRefresh,
  onSwitchToAllPosts,
  setLoginPromptOpen,
  pageMaxWidthClass,
  contentTopOffset,
  feedNode,
  dealsBannerNode,
  children,
}) {
  const { t } = useTranslation();
  const tr = (key, fallback) => t(key, { defaultValue: fallback || key });

  return (
    <section className="w-full mhub-allposts-hero mhub-foryou-redesign-hero" data-density="extra">
      {/* Collapse toggle header */}
      <button
        type="button"
        onClick={onToggleHeroExpanded}
        className="w-full flex items-center justify-between gap-2 px-3 sm:px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        aria-expanded={forYouHeroExpanded}
      >
        <span className="flex items-center gap-2">
          <span>🌟</span>
          <span>{tr("your_interests", "Your Interests")}</span>
        </span>
        <span className={`transform transition-transform duration-200 ${forYouHeroExpanded ? "rotate-180" : ""}`}>
          ▼
        </span>
      </button>

      {/* Collapsible content */}
      {forYouHeroExpanded && (
        <div className={`w-full ${pageMaxWidthClass} mx-auto px-3 sm:px-4 pt-3`}>
          <div className="mhub-allposts-hero-card overflow-hidden border border-indigo-100/80 bg-gradient-to-br from-white via-indigo-50/70 to-sky-50/80 p-0 shadow-sm dark:border-indigo-500/20 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/30">
            <div className="px-4 py-4 sm:px-5 sm:py-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-white/85 px-2.5 py-1 text-xs font-bold text-indigo-700 shadow-sm dark:border-indigo-500/30 dark:bg-white/10 dark:text-indigo-200">
                      <BoltIcon className="h-3.5 w-3.5" />
                      {tr("ai_curated", "AI curated")}
                    </span>
                    <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl dark:text-white">
                      {tr("for_you", "For You")}
                    </h1>
                  </div>
                  <p className="mt-1 max-w-xl text-sm font-medium leading-5 text-slate-600 dark:text-slate-300">
                    {tr("for_you_refined_subtitle",
                      "Personalized listings ranked from your activity, filters, location, and fresh marketplace signals."
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onSwitchToAllPosts}
                  className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-white/10 dark:bg-white/10 dark:text-slate-100 dark:hover:bg-white/15"
                >
                  {tr("all_posts", "All Posts")}
                  <ArrowRightIcon className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Stats grid */}
              <div className="mhub-foryou-hero-stats mt-4 grid grid-cols-3 keep-cols gap-2 text-center sm:max-w-lg">
                {[
                  { key: "items", label: tr("matched_items", "Matched"), value: Number.isFinite(resultsCount) ? resultsCount : 0 },
                  { key: "categories", label: tr("categories", "Categories"), value: subcategoryCount || 0 },
                  { key: "filters", label: tr("filters", "Filters"), value: activeFiltersCount },
                ].map((stat) => (
                  <div key={stat.key} className="rounded-2xl border border-white/70 bg-white/80 px-2 py-2.5 shadow-sm dark:border-white/10 dark:bg-white/10">
                    <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{stat.value}</div>
                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-300">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Action buttons */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={onBrowseFeed}
                  className="inline-flex h-10 items-center gap-1.5 rounded-full bg-blue-600 px-3.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
                >
                  <EyeIcon className="h-3.5 w-3.5" />
                  {tr("browse", "Browse")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!isAuthenticated) {
                      setLoginPromptOpen(true);
                      return;
                    }
                    onShuffle();
                  }}
                  disabled={isAuthenticated && !canShuffle}
                  className="inline-flex h-10 items-center gap-1.5 rounded-full border border-indigo-200 bg-white px-3.5 text-xs font-bold text-indigo-700 shadow-sm hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-indigo-500/30 dark:bg-white/10 dark:text-indigo-200 dark:hover:bg-white/15"
                >
                  <BoltIcon className="h-3.5 w-3.5" />
                  {tr("shuffle", "Shuffle")}
                </button>
                <button
                  type="button"
                  onClick={onToggleAutoRefresh}
                  aria-pressed={autoRefreshEnabled}
                  className={`inline-flex h-10 items-center gap-1.5 rounded-full border px-3.5 text-xs font-bold shadow-sm transition ${
                    autoRefreshEnabled
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15"
                  }`}
                >
                  <BoltIcon className={`h-3.5 w-3.5 ${autoRefreshEnabled ? "animate-spin" : ""}`} />
                  {autoRefreshEnabled ? tr("live_on", "Live on") : tr("live", "Live")}
                </button>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={onClearFilters}
                    className="inline-flex h-10 items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3.5 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200"
                  >
                    <TimesIcon className="h-3.5 w-3.5" />
                    {tr("clear_filters", "Clear filters")}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deals banner & feed section */}
      <div className="w-full" style={{ paddingTop: `${forYouHeroExpanded ? 0 : contentTopOffset}px` }}>
        {dealsBannerNode}
        {children || feedNode}
      </div>
    </section>
  );
}

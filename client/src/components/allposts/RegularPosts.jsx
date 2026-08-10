import React from "react";
import { useTranslation } from "react-i18next";
import {
  FaArrowRight as ArrowRightIcon,
  FaBolt as BoltIcon,
  FaChevronUp as ChevronUpIcon,
  FaExchangeAlt as CompareIcon,
  FaTimes as TimesIcon,
} from "react-icons/fa";

/**
 * RegularPosts — Standard listing view for the AllPosts page.
 * Renders marketplace hero, the post feed (children), load-more button,
 * back-to-top button, and compare panel.
 */
export default function RegularPosts({
  // Hero
  heroContextLabel,
  heroTitle,
  heroSubtitle,
  resultsCount,
  onNavigateFeed,

  // Feed section
  feedNode,
  children,

  // Load more
  hasMore,
  isLoading,
  isError,
  onLoadMore,
  showLoadMoreButton,
  showInfiniteScrollSentinel,

  // Back to top
  showBackToTop,
  onScrollToTop,

  // Compare panel
  compareItems,
  showComparePanel,
  onCloseCompare,
  onRemoveCompareItem,
  comparePanelContent,

  // Stalled loading
  isStalledLoading,
  stalledLoadingLabel,

  // Layout
  pageMaxWidthClass,
  feedMaxWidthClass,
  contentTopOffset,
}) {
  const { t } = useTranslation();
  const tr = (key, fallback) => t(key, { defaultValue: fallback || key });

  return (
    <>
      {/* ── Standard hero section ──────────────── */}
      <section className="w-full mhub-allposts-hero" data-density="extra">
        <div
          className="w-full flex justify-center px-3 sm:px-4 pt-3"
          style={{ paddingTop: `${contentTopOffset}px` }}
        >
          <div className={`w-full ${pageMaxWidthClass}`}>
            <div className="mhub-allposts-hero-card">
              <div className="mhub-allposts-hero-grid">
                <div className="mhub-allposts-hero-main">
                  <div className="mhub-allposts-hero-kicker">{heroContextLabel}</div>
                  <h1 className="mhub-allposts-hero-title">{heroTitle}</h1>
                  <p className="mhub-allposts-hero-subtitle">{heroSubtitle}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 text-blue-600 px-3 py-2 dark:bg-blue-500/10 dark:text-blue-300">
                      {tr("marketplace_listings", "Marketplace listings")}
                    </span>
                    <button
                      type="button"
                      onClick={onNavigateFeed}
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 px-3 py-2 text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                    >
                      {tr("community_feed", "Community Feed")}
                      <ArrowRightIcon className="w-4 h-4" />
                    </button>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {tr("feed_updates_hint", "news & updates")}
                    </span>
                  </div>
                  {resultsCount > 0 && (
                    <div className="allposts-hero-stats mt-2 flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-3 py-1.5 text-xs font-bold whitespace-nowrap">
                        📦 {resultsCount} {tr("items_available", "items")}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 px-3 py-1.5 text-xs font-bold whitespace-nowrap">
                        ⚡ {tr("live_marketplace", "Live marketplace")}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Feed section ──────────────── */}
      <div
        id="all-posts-feed"
        className={`mhub-allposts-feed w-full flex flex-col items-center mb-4`}
      >
        {children || feedNode}
      </div>

      {/* ── Load more sentinel (infinite scroll anchor) ──────────────── */}
      {showInfiniteScrollSentinel && (
        <div ref={showInfiniteScrollSentinel} aria-hidden="true" className="w-full h-1" />
      )}

      {/* ── Load more button ──────────────── */}
      {hasMore && !isLoading && !isError && (
        <div className="flex justify-center mt-5">
          <button
            type="button"
            onClick={onLoadMore}
            className="inline-flex items-center gap-1.5 rounded-full border border-blue-300 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 dark:border-blue-600/40 dark:text-blue-300 dark:hover:bg-blue-900/20 transition-colors"
          >
            <BoltIcon className="w-3.5 h-3.5" />
            {tr("load_more_posts", "Load more posts")}
          </button>
        </div>
      )}

      {/* ── Stalled loading indicator ──────────────── */}
      {isStalledLoading && (
        <div className="flex justify-center py-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 dark:bg-slate-800 px-4 py-2 text-sm text-slate-600 dark:text-slate-300">
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
            {stalledLoadingLabel || tr("still_loading", "Still loading...")}
          </div>
        </div>
      )}

      {/* ── Back to top button ──────────────── */}
      {showBackToTop && (
        <button
          type="button"
          onClick={onScrollToTop}
          className="fixed bottom-24 right-4 z-40 w-12 h-12 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all animate-in slide-in-from-bottom duration-200"
          aria-label={tr("back_to_top", "Back to top")}
        >
          <ChevronUpIcon className="w-5 h-5" />
        </button>
      )}

      {/* ── Compare panel ──────────────── */}
      {showComparePanel && compareItems.length > 0 && (
        <div
          className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
          onClick={(ev) => { if (ev.target === ev.currentTarget) onCloseCompare(); }}
        >
          <div className="mhub-premium-surface w-full max-w-[640px] max-h-[90vh] overflow-auto rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 animate-in slide-in-from-bottom-8 sm:m-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <CompareIcon className="w-5 h-5 text-purple-500" />
                {tr("compare_items", "Compare Items")}
              </h2>
              <button
                type="button"
                onClick={onCloseCompare}
                className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                aria-label={tr("close_compare", "Close compare")}
              >
                <TimesIcon className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            {comparePanelContent}
          </div>
        </div>
      )}
    </>
  );
}

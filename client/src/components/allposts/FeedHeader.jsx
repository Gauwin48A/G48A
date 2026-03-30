import React from "react";
import { FaSyncAlt } from "react-icons/fa";

const AllPostsFeedHeader = ({
  title,
  liveLabel,
  updatedLabel,
  updatedAt,
  formatUpdatedAt,
  updatedPulse = false,
  showLiveStatus = true,
  showUpdatedStatus = true,
  resultsCount,
  resultsLabel,
  showResults = false,
  refreshLabel,
  onRefresh,
  isRefreshing = false,
  disabled = false,
  autoRefreshEnabled = true,
  showAutoRefresh = false,
  autoRefreshLabel = "Auto refresh every 30s",
  autoRefreshPausedLabel = "Auto refresh paused",
  onToggleAutoRefresh,
  maxWidthClass = "max-w-[92rem]",
  titleId,
  compact = false,
  sticky = false,
  stickyTop = 0,
  containerClassName = "",
}) => {
  const hasTitle = Boolean(title);
  const showMeta = hasTitle || showResults;
  const wrapperPaddingClass = compact
    ? showMeta
      ? "py-1.5 mb-1.5 gap-2"
      : "py-1 mb-1 gap-2"
    : "py-2.5 mb-3 gap-3";
  const layoutClass = compact
    ? `flex flex-col gap-2 sm:flex-row ${
        showMeta ? "sm:items-end sm:justify-between" : "sm:justify-end"
      }`
    : `flex flex-col gap-3 md:flex-row md:items-end ${
        showMeta ? "md:justify-between" : "md:justify-end"
      }`;
  const controlsWrapperClass = compact
    ? "inline-flex flex-wrap items-center gap-1.5 rounded-full border border-slate-200/70 dark:border-slate-800/60 bg-white/85 dark:bg-slate-900/60 px-1.5 py-1 shadow-sm"
    : "inline-flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/70 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/60 px-2.5 py-1.5 shadow-sm";
  const liveChipClass = autoRefreshEnabled
    ? "border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-900/30 dark:text-emerald-300"
    : "border-slate-300/70 bg-slate-100 text-slate-600 dark:border-slate-700/70 dark:bg-slate-800/60 dark:text-slate-300";
  const liveDotClass = autoRefreshEnabled
    ? "bg-emerald-500 animate-pulse"
    : "bg-slate-400";

  return (
    <div
      className={`w-full ${sticky ? "sticky z-30 bg-white/95 dark:bg-gray-900/95 backdrop-blur border-b border-slate-200/70 dark:border-slate-800/60" : ""} ${containerClassName}`}
      style={sticky ? { top: `${stickyTop}px` } : undefined}
    >
      <div className={`w-full ${maxWidthClass} mx-auto px-3 md:px-0 ${wrapperPaddingClass} ${layoutClass}`}>
        {showMeta ? (
          <div className="min-w-0">
            {hasTitle ? (
              <h2
                id={titleId}
                className={`${
                  compact ? "text-xl sm:text-2xl" : "text-xl sm:text-2xl md:text-3xl"
                } font-bold text-slate-900 dark:text-slate-100 ${compact ? "mb-0.5" : "mb-1"}`}
              >
                {title}
              </h2>
            ) : null}
            {showResults ? (
              <p
                className={`${
                  compact ? "text-[10px] sm:text-[11px]" : "text-xs sm:text-sm"
                } font-semibold text-slate-600 dark:text-slate-300`}
              >
                {resultsLabel ||
                  (Number.isFinite(resultsCount)
                    ? `${resultsCount} results`
                    : "")}
              </p>
            ) : null}
          </div>
        ) : null}
        <div className={controlsWrapperClass}>
          {showLiveStatus ? (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 ${
                compact ? "text-[9px]" : "text-[10px] sm:text-xs"
              } font-semibold ${liveChipClass}`}
            >
              <span className={`h-2 w-2 rounded-full ${liveDotClass}`} />
              {liveLabel}
            </span>
          ) : null}
          {showUpdatedStatus ? (
            <span
              className={`${
                compact ? "text-[10px]" : "text-xs md:text-sm"
              } text-slate-500 dark:text-slate-300 ${
                updatedPulse ? "animate-pulse" : ""
              }`}
              aria-live="polite"
            >
              {updatedLabel} {formatUpdatedAt?.(updatedAt)}
            </span>
          ) : null}
          {showAutoRefresh ? (
            <button
              type="button"
              onClick={onToggleAutoRefresh}
              aria-pressed={autoRefreshEnabled}
              className={`rounded-full border border-slate-200 text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 ${
                compact ? "h-8 px-2.5 text-[9px] sm:text-[10px]" : "h-10 px-3 text-[10px] sm:text-xs"
              }`}
            >
              <FaSyncAlt className={`w-3.5 h-3.5 ${autoRefreshEnabled ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">
                {autoRefreshEnabled ? autoRefreshLabel : autoRefreshPausedLabel}
              </span>
            </button>
          ) : null}
          <button
            type="button"
            className={`rounded-full border border-slate-200 text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 ${
              compact ? "h-8 px-2.5 text-[10px]" : "h-10 px-3.5 text-[11px] sm:text-xs"
            }`}
            onClick={onRefresh}
            disabled={disabled || isRefreshing}
          >
            <FaSyncAlt className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>{refreshLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AllPostsFeedHeader;

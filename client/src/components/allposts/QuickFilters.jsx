import React from "react";
import {
  FaTag,
  FaBolt,
  FaClock,
  FaMapMarkerAlt,
  FaSyncAlt,
} from "react-icons/fa";

const AllPostsQuickFilters = ({
  title,
  activeCount = 0,
  showActiveCount = false,
  chips = null,
  variant = "default",
  showAutoRefresh = false,
  autoRefreshLabel = "",
  autoRefreshPausedLabel = "Auto refresh paused",
  autoRefreshEnabled = true,
  onToggleAutoRefresh,
  under1000Label = "Under 1000",
  range1000to5000Label = "1000-5000",
  latest5Label = "Latest 5",
  latest10Label = "Latest 10",
  postedTodayLabel = "Posted Today",
  nearMeLabel = "Near me",
  isUnder1000 = false,
  isRange1000to5000 = false,
  isLatest5 = false,
  isLatest10 = false,
  isPostedToday = false,
  isNearMe = false,
  showNearMe = true,
  onUnder1000,
  onRange1000to5000,
  onLatest5,
  onLatest10,
  onPostedToday,
  onNearMe,
  maxWidthClass = "max-w-[92rem]",
  compact = false,
  showDivider = true,
  headerRight,
  embedded = false,
  inline = false,
  inlineWrap = true,
  children,
}) => {
  const isForYouVariant = variant === "forYou";
  const isInlineLayout = inline && !embedded;
  const inlineRowWrapClass = inlineWrap ? "flex-wrap" : "flex-wrap sm:flex-nowrap";
  const inlineChipsWrapClass = inlineWrap ? "flex-wrap" : "flex-nowrap";
  const childItems = React.Children.toArray(children).filter(
    (child) => child !== null && child !== undefined && child !== false,
  );
  const hasChildren = childItems.length > 0;
  const isDenseForYouVariant = isForYouVariant && compact;
  const chipSize = isDenseForYouVariant
    ? "h-8 px-3 text-xs"
    : isForYouVariant
      ? "h-9 px-4 text-sm"
    : compact
      ? "h-8 px-3 text-[11px]"
      : "h-9 px-3.5 text-xs";
  const iconSize = compact ? "w-3 h-3" : "w-3.5 h-3.5";
  const chipBase = isDenseForYouVariant
    ? "inline-flex h-8 shrink-0 items-center justify-center rounded-full border px-3 text-xs font-semibold transition-colors whitespace-nowrap"
    : isForYouVariant
      ? "inline-flex h-9 shrink-0 items-center justify-center rounded-full border px-4 text-sm font-semibold transition-colors whitespace-nowrap"
    : "mhub-quick-filter-chip rounded-full border inline-flex items-center gap-1.5 shrink-0 font-semibold transition-colors";
  const chipActive = isForYouVariant
    ? "!border-blue-600 !bg-blue-600 !text-white shadow-sm hover:!border-blue-600 hover:!bg-blue-600 hover:!text-white"
    : "bg-blue-600 text-white border-blue-600 shadow-sm hover:bg-blue-700";
  const chipInactive = isForYouVariant
    ? "border-slate-200 bg-slate-50 !text-slate-700 hover:border-slate-300 hover:bg-slate-100 hover:!text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:!text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:hover:!text-slate-100"
    : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-800";
  const childrenWrapperClass = (() => {
    const base =
      compact && !isForYouVariant
        ? "pt-1 mt-0.5"
        : isDenseForYouVariant
          ? "pt-1 mt-0.5"
          : "pt-1.5 mt-1";
    if (!showDivider) return base;
    return `${base} border-t border-slate-200/70 dark:border-slate-800/60`;
  })();
  const stackClass = isForYouVariant
    ? `flex flex-col ${isDenseForYouVariant ? "gap-1 sm:gap-1.5" : "gap-2 sm:gap-2.5"}`
    : `flex flex-col ${compact ? "gap-1.5 sm:gap-2" : "gap-2 sm:gap-2.5"}`;
  const chipsRowClass = isForYouVariant
    ? `for-you-quick-filters-row flex flex-wrap items-center ${isDenseForYouVariant ? "gap-1.5" : "gap-2"} ${isDenseForYouVariant ? "pb-0" : "pb-0.5"}`
    : `all-posts-quick-filters-row flex items-center ${compact ? "gap-1.5" : "gap-2"} overflow-x-auto scrollbar-hide pb-1`;
  const inlineChipsRowClass = isForYouVariant
    ? `for-you-quick-filters-row flex items-center ${inlineChipsWrapClass} ${isDenseForYouVariant ? "gap-1.5" : "gap-2"}`
    : `all-posts-quick-filters-row flex items-center ${inlineChipsWrapClass} ${compact ? "gap-1.5" : "gap-2"} ${inlineWrap ? "" : "overflow-x-auto scrollbar-hide"} ${inlineWrap ? "" : "min-w-0"}`;

  const titleNode = isForYouVariant ? (
    <h3 className={`${isDenseForYouVariant ? "text-sm md:text-base" : "text-base md:text-lg"} font-bold text-gray-900 dark:text-white`}>
      {title}
    </h3>
  ) : (
    <div
      className={`mhub-quick-filters-title inline-flex items-center gap-2 rounded-full ${
        compact ? "text-[10px] sm:text-[11px]" : "text-[11px] sm:text-xs"
      } font-semibold`}
    >
      <FaBolt className={compact ? "w-3 h-3" : "w-3.5 h-3.5"} />
      {title}
    </div>
  );

  const renderedChips =
    Array.isArray(chips) && chips.length > 0 ? (
      chips.map((chip, index) => {
        const Icon = chip.icon;
        return (
          <button
            key={chip.key || chip.label || index}
            type="button"
            disabled={chip.disabled}
            data-active={chip.active ? "true" : "false"}
            className={`${chipSize} ${chipBase} ${
              chip.active ? chipActive : chipInactive
            }${chip.disabled ? " cursor-not-allowed opacity-60" : ""}${
              chip.className ? ` ${chip.className}` : ""
            }`}
            onClick={chip.onClick}
          >
            {Icon ? <Icon className={chip.iconClassName || iconSize} /> : null}
            {chip.label}
          </button>
        );
      })
    ) : (
      <>
        <button
          type="button"
          className={`${chipSize} ${chipBase} ${
            isUnder1000 ? chipActive : chipInactive
          }`}
          onClick={onUnder1000}
        >
          <FaTag className={iconSize} />
          {under1000Label}
        </button>
        <button
          type="button"
          className={`${chipSize} ${chipBase} ${
            isRange1000to5000 ? chipActive : chipInactive
          }`}
          onClick={onRange1000to5000}
        >
          <FaTag className={iconSize} />
          {range1000to5000Label}
        </button>
        <button
          type="button"
          className={`${chipSize} ${chipBase} ${
            isLatest5 ? chipActive : chipInactive
          }`}
          onClick={onLatest5}
        >
          <FaClock className={iconSize} />
          {latest5Label}
        </button>
        <button
          type="button"
          className={`${chipSize} ${chipBase} ${
            isLatest10 ? chipActive : chipInactive
          }`}
          onClick={onLatest10}
        >
          <FaClock className={iconSize} />
          {latest10Label}
        </button>
        <button
          type="button"
          className={`${chipSize} ${chipBase} ${
            isPostedToday ? chipActive : chipInactive
          }`}
          onClick={onPostedToday}
        >
          <FaBolt className={iconSize} />
          {postedTodayLabel}
        </button>
        {showNearMe ? (
          <button
            type="button"
            className={`${chipSize} ${chipBase} ${
              isNearMe ? chipActive : chipInactive
            }`}
            onClick={onNearMe}
          >
            <FaMapMarkerAlt className={iconSize} />
            {nearMeLabel}
          </button>
        ) : null}
      </>
    );

  const content = isInlineLayout ? (
    <div className={`mhub-quick-filters-content flex flex-col ${hasChildren ? "gap-1" : ""}`}>
      <div className={`mhub-quick-filters-row flex items-center gap-2 ${inlineRowWrapClass}`}>
        <div className="shrink-0">{titleNode}</div>
        <div className={`${inlineChipsRowClass} mhub-quick-filters-chips flex-1 min-w-0`}>
          {renderedChips}
        </div>
        {showActiveCount ? (
          <span
            className={`inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 ${
              compact ? "text-[9px]" : "text-[10px]"
            } font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700`}
          >
            Active: {activeCount}
          </span>
        ) : null}
        {showAutoRefresh ? (
          <button
            type="button"
            onClick={onToggleAutoRefresh}
            aria-pressed={autoRefreshEnabled}
            className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-[11px] md:text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <FaSyncAlt
              className={`w-3 h-3 ${
                autoRefreshEnabled ? "animate-spin" : ""
              }`}
            />
            {autoRefreshEnabled ? autoRefreshLabel : autoRefreshPausedLabel}
          </button>
        ) : null}
        {headerRight ? (
          <div className="mhub-quick-filters-actions shrink-0 ml-auto">
            {headerRight}
          </div>
        ) : null}
      </div>
      {hasChildren ? <div className={childrenWrapperClass}>{childItems}</div> : null}
    </div>
  ) : (
    <div className={stackClass}>
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {titleNode}
        <div className="flex flex-wrap items-center gap-2">
          {showActiveCount ? (
            <span
              className={`inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 ${
                compact ? "text-[9px]" : "text-[10px]"
              } font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700`}
            >
              Active: {activeCount}
            </span>
          ) : null}
          {showAutoRefresh ? (
            <button
              type="button"
              onClick={onToggleAutoRefresh}
              aria-pressed={autoRefreshEnabled}
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-[11px] md:text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <FaSyncAlt
                className={`w-3 h-3 ${
                  autoRefreshEnabled ? "animate-spin" : ""
                }`}
              />
              {autoRefreshEnabled ? autoRefreshLabel : autoRefreshPausedLabel}
            </button>
          ) : null}
          {headerRight}
        </div>
      </div>
      <div className={chipsRowClass}>{renderedChips}</div>
      {hasChildren ? <div className={childrenWrapperClass}>{childItems}</div> : null}
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <div
      className={`w-full flex justify-center px-3 sm:px-4 ${
        isDenseForYouVariant
          ? "pb-1 pt-1"
          : isForYouVariant
            ? "pb-1.5 pt-1.5"
            : isInlineLayout
              ? "py-1.5"
              : compact
                ? "pb-1.5"
                : "pb-2.5"
      }`}
    >
      <div
        className={`w-full ${maxWidthClass} ${
          isDenseForYouVariant
            ? "bg-white/95 dark:bg-slate-900/40 border border-blue-100/60 dark:border-slate-800/60 rounded-xl p-1.5 shadow-sm backdrop-blur-sm"
            : isForYouVariant
              ? "bg-white/95 dark:bg-slate-900/40 border border-blue-100/70 dark:border-slate-800/60 rounded-2xl p-2.5 shadow-sm backdrop-blur-sm"
            : `mhub-quick-filters-shell ${isInlineLayout ? "mhub-quick-filters-inline" : "mhub-quick-filters-stacked"} bg-white/95 dark:bg-slate-900/50 border ${
                compact ? "border-slate-200/80" : "border-slate-200/70"
              } dark:border-slate-800/60 rounded-2xl ${
                isInlineLayout ? "p-2" : compact ? "p-2" : "p-2 sm:p-3"
              } shadow-sm backdrop-blur`
        }`}
      >
        {content}
      </div>
    </div>
  );
};

export default AllPostsQuickFilters;

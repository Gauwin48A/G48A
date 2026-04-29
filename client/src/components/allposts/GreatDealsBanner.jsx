import React from "react";
import { FaBolt, FaChevronUp } from "react-icons/fa";

const AllPostsGreatDealsBanner = ({
  title,
  subtitle,
  contextLabel,
  collapsed,
  onCollapse,
  onExpand,
  onShopNow,
  allowCollapse = true,
  stickyTop = 0,
  maxWidthClass = "max-w-[640px]",
  previewImages = [],
  t,
  compact = false,
  outerPaddingClass = "",
  sticky = false,
}) => {
  const text = (key, fallback) =>
    typeof t === "function" ? t(key, fallback) : fallback;
  const previewList = Array.isArray(previewImages)
    ? previewImages.filter(Boolean).slice(0, 3)
    : [];
  const wrapperMargin = compact ? "mb-1" : "mb-3 md:mb-4";
  const collapsedClass = compact ? "px-2.5 py-1" : "px-3 py-2";
  const expandedDesktopClass = compact
    ? "px-3 md:px-4 py-1.5 md:py-2"
    : "px-3 md:px-5 lg:px-6 py-2.5 md:py-3";
  const wrapperTopMargin = compact ? "mt-0" : "mt-0 md:mt-2";
  return (
    <div className={`w-full flex justify-center ${outerPaddingClass}`}>
      <div
        className={`w-full ${maxWidthClass} ${wrapperMargin} ${wrapperTopMargin} ${sticky ? "z-40" : "z-10"}`}
        style={
          sticky ? { position: "sticky", top: `${stickyTop}px` } : { position: "static" }
        }
      >
        {collapsed ? (
          <div className={`great-deals-banner-panel flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-2xl border border-slate-200/70 dark:border-slate-800/60 bg-white/95 dark:bg-slate-900/60 shadow-sm backdrop-blur-sm ${collapsedClass}`}>
            <div className="flex flex-col gap-0.5">
              <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wide font-semibold text-slate-600">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                {text("sponsored", "Sponsored")}
              </span>
              <span className={`${compact ? "text-[12px]" : "text-sm"} font-semibold text-slate-900 dark:text-slate-100`}>
                {title}
              </span>
              <span className={`${compact ? "text-xs" : "text-xs"} text-slate-600 dark:text-slate-300`}>
                {contextLabel}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {previewList.length > 0 ? (
                <div className="hidden sm:flex items-center -space-x-2">
                  {previewList.map((src, index) => (
                    <div
                      key={`${src}-${index}`}
                      className="h-8 w-8 rounded-lg overflow-hidden ring-2 ring-white/70 shadow-sm"
                    >
                      <img
                        src={src}
                        alt={`${text("deal_preview", "Deal preview")} ${index + 1}`}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
              ) : null}
              {allowCollapse ? (
                <button
                  type="button"
                  className={`inline-flex items-center justify-center rounded-full border border-slate-200 bg-white ${compact ? "px-2.5 py-1 text-xs" : "px-3 py-1 text-xs"} font-semibold text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-800`}
                  onClick={onExpand}
                >
                  {text("expand", "Expand")}
                </button>
              ) : null}
              <button
                type="button"
                className={`inline-flex items-center justify-center rounded-full bg-blue-600 ${compact ? "px-2.5 py-1 text-xs" : "px-3 py-1 text-xs"} font-semibold text-white hover:bg-blue-700`}
                onClick={onShopNow}
              >
                <FaBolt className={compact ? "w-4 h-4" : "w-3.5 h-3.5"} />
                {text("shop_now", "Shop now")}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className={`great-deals-banner-panel sm:hidden relative flex items-center justify-between gap-3 rounded-2xl border border-slate-200/70 dark:border-slate-800/60 bg-gradient-to-r from-blue-50 via-white to-sky-50 dark:from-slate-900/70 dark:via-slate-900/60 dark:to-slate-900/70 shadow-sm ${compact ? "px-2.5 py-1.5" : "px-3 py-2.5"}`}>
              <div className="flex flex-col gap-1">
                <span className="text-xs uppercase tracking-wide font-semibold text-slate-600">
                  {text("sponsored", "Sponsored")}
                </span>
                <span className={`${compact ? "text-[12px]" : "text-sm"} font-semibold text-blue-900 dark:text-blue-100`}>
                  {title}
                </span>
                <span className={`${compact ? "text-xs" : "text-xs"} text-blue-700 dark:text-blue-300`}>
                  {subtitle}
                </span>
                <span className={`${compact ? "text-xs" : "text-xs"} text-blue-700/90 dark:text-blue-300`}>
                  {contextLabel}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className={`bg-blue-600 text-white font-semibold ${compact ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-xs"} rounded-full inline-flex items-center gap-1.5`}
                  onClick={onShopNow}
                >
                  <FaBolt className={compact ? "w-4 h-4" : "w-3.5 h-3.5"} />
                  {text("shop_now", "Shop now")}
                </button>
                {allowCollapse ? (
                  <button
                    type="button"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700"
                    onClick={onCollapse}
                    aria-label={text("minimize", "Minimize")}
                  >
                    <FaChevronUp className="w-3.5 h-3.5" />
                  </button>
                ) : null}
              </div>
            </div>
            <div className={`great-deals-banner-panel hidden sm:flex flex-col md:flex-row items-center justify-between ${expandedDesktopClass} bg-gradient-to-r from-blue-50 via-white to-sky-50 dark:from-slate-900/70 dark:via-slate-900/60 dark:to-slate-900/70 rounded-2xl shadow-sm w-full relative overflow-hidden border border-slate-200/70 dark:border-slate-800/60`}>
              {allowCollapse ? (
                <button
                  type="button"
                  className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700"
                  onClick={onCollapse}
                  aria-label={text("minimize", "Minimize")}
                >
                  <FaChevronUp className="w-3.5 h-3.5" />
                </button>
              ) : null}
              <div className={`flex flex-col ${compact ? "gap-1" : "gap-2"} z-10 w-full md:w-auto`}>
                <span className="text-xs uppercase tracking-wide font-semibold text-slate-600">
                  {text("sponsored", "Sponsored")}
                </span>
                <span className={`${compact ? "text-sm sm:text-base md:text-lg" : "text-base sm:text-lg md:text-2xl lg:text-3xl"} font-bold text-blue-900 dark:text-blue-100 ${compact ? "mb-0.5" : "mb-1"}`}>
                  {title}
                </span>
                <span className={`${compact ? "text-xs sm:text-xs" : "text-xs sm:text-sm md:text-base"} text-blue-800 dark:text-blue-200 font-medium ${compact ? "mb-0.5" : "mb-1.5"}`}>
                  {subtitle}
                </span>
                <span className={`${compact ? "text-xs sm:text-xs" : "text-xs sm:text-sm"} text-blue-700/90 dark:text-blue-300 font-medium`}>
                  {contextLabel}
                </span>
                <button
                  type="button"
                  className={`bg-blue-600 text-white font-semibold ${compact ? "px-3 py-1 text-xs sm:text-xs" : "px-3 md:px-5 py-1.5 md:py-2 text-xs sm:text-sm md:text-base"} ${compact ? "rounded-full" : "rounded-lg"} shadow hover:bg-blue-700 transition w-fit inline-flex items-center gap-1.5`}
                  onClick={onShopNow}
                >
                  <FaBolt className={compact ? "w-4 h-4" : "w-3.5 h-3.5"} />
                  {text("shop_now", "Shop now")}
                </button>
            </div>
            <div className="hidden sm:block mt-2 md:mt-0 md:ml-4 z-10">
                {previewList.length > 0 ? (
                  <div className="flex items-center -space-x-3">
                    {previewList.map((src, index) => (
                      <div
                        key={`${src}-${index}`}
                        className={`${compact ? "w-12 h-9 sm:w-14 sm:h-10 md:w-16 md:h-12" : "w-16 h-12 sm:w-20 sm:h-14 md:w-24 md:h-18"} rounded-xl overflow-hidden ring-2 ring-white/70 dark:ring-white/20 shadow-sm bg-white dark:bg-gray-800`}
                      >
                        <img
                          src={src}
                          alt={`${text("deal_preview", "Deal preview")} ${index + 1}`}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={`${compact ? "w-12 h-9 sm:w-14 sm:h-10 md:w-16 md:h-12" : "w-16 h-12 sm:w-20 sm:h-14 md:w-28 md:h-20"} bg-blue-200/80 dark:bg-blue-800/60 rounded-xl flex items-center justify-center`}>
                    <svg width="64" height="48" fill="none" viewBox="0 0 64 48">
                      <rect width="64" height="48" rx="8" fill="#2563eb" />
                    </svg>
                  </div>
                )}
            </div>
              <div className={`absolute right-0 bottom-0 opacity-10 ${compact ? "w-20 h-16 md:w-24 md:h-20" : "w-24 h-20 md:w-32 md:h-24"} bg-blue-300 dark:bg-blue-700 rounded-bl-2xl`} />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AllPostsGreatDealsBanner;

/**
 * CategoryAppSwitcher
 *
 * A sticky pill shown at the top of every page (except /category-hub) that
 * displays the current "app world" the user is browsing.  Clicking it opens a
 * compact panel for switching or clearing the filter.
 *
 * It is rendered inside AppShell (App.jsx) so it stays mounted across routes.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useCategoryMode } from "@/context/CategoryModeContext";
import { DEFAULT_FILTERS, useFilter } from "@/context/FilterContext";

// Routes where the switcher should be hidden
const HIDDEN_ROUTES = new Set([
  "/category-hub",
  "/category-mode",
  "/cart",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
]);

const APP_LIST = [
  { key: "electronics", label: "Electronics", emoji: "📱", gradient: "from-blue-500 to-indigo-600",   textLight: "text-blue-700",   bgLight: "bg-blue-50",   borderLight: "border-blue-200",   accentDark: "bg-blue-600" },
  { key: "fashion",     label: "Fashion",     emoji: "👗", gradient: "from-pink-500 to-rose-600",     textLight: "text-pink-700",   bgLight: "bg-pink-50",   borderLight: "border-pink-200",   accentDark: "bg-pink-600" },
  { key: "vehicles",    label: "Vehicles",    emoji: "🚗", gradient: "from-emerald-500 to-teal-600",  textLight: "text-emerald-700",bgLight: "bg-emerald-50",borderLight: "border-emerald-200",accentDark: "bg-emerald-600" },
  { key: "others",      label: "Others",      emoji: "✨", gradient: "from-purple-500 to-violet-600", textLight: "text-purple-700", bgLight: "bg-purple-50", borderLight: "border-purple-200", accentDark: "bg-purple-600" },
];

function useOutsideClick(ref, handler) {
  useEffect(() => {
    const listener = (e) => {
      if (ref.current && !ref.current.contains(e.target)) handler();
    };
    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);
    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, handler]);
}

export default function CategoryAppSwitcher() {
  const location = useLocation();
  const navigate = useNavigate();
  const { setFilters } = useFilter();
  const {
    activeApp,
    setActiveApp,
    clearCategory,
    clearSubcategory,
    clearActiveApp,
  } = useCategoryMode();
  const pathname = location.pathname;

  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useOutsideClick(wrapperRef, () => setOpen(false));

  // Close panel on route change
  useEffect(() => { setOpen(false); }, [location.pathname]);

  const syncListingRoute = useCallback(
    (nextAppKey) => {
      const params = new URLSearchParams(location.search || "");
      [
        "search",
        "category",
        "category_id",
        "categoryId",
        "subcategory",
        "subcategory_id",
        "subcategoryId",
        "location",
        "minPrice",
        "maxPrice",
        "priceRange",
        "startDate",
        "endDate",
        "latestWindow",
        "sortBy",
        "group",
        "categoryGroup",
        "category_group",
      ].forEach((paramKey) => params.delete(paramKey));
      if (nextAppKey) {
        params.set("category_group", nextAppKey);
      }
      const nextQuery = params.toString();
      const nextPath = nextQuery ? `${pathname}?${nextQuery}` : pathname;
      navigate(nextPath, { replace: true });
    },
    [location.search, navigate, pathname],
  );

  const handleSelect = useCallback((key) => {
    clearCategory();
    clearSubcategory();
    setActiveApp(key);
    setFilters({ ...DEFAULT_FILTERS, categoryGroup: key });
    setOpen(false);
    if (pathname.startsWith("/all-posts") || pathname.startsWith("/for-you")) {
      syncListingRoute(key);
      return;
    }
    navigate(`/all-posts?category_group=${encodeURIComponent(key)}`);
  }, [clearCategory, clearSubcategory, setActiveApp, setFilters, pathname, syncListingRoute, navigate]);

  const handleClearApp = useCallback(() => {
    clearCategory();
    clearSubcategory();
    clearActiveApp();
    setFilters({ ...DEFAULT_FILTERS, categoryGroup: "" });
    setOpen(false);
    if (pathname.startsWith("/all-posts") || pathname.startsWith("/for-you")) {
      syncListingRoute("");
      return;
    }
    navigate("/all-posts");
  }, [clearCategory, clearSubcategory, clearActiveApp, setFilters, pathname, syncListingRoute, navigate]);

  const handleGoHub = useCallback(() => {
    setOpen(false);
    navigate("/category-hub");
  }, [navigate]);

  // All hooks must be called before any conditional return
  const currentApp = APP_LIST.find((a) => a.key === activeApp) || null;
  const shouldHide =
    HIDDEN_ROUTES.has(pathname) ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/profile");

  if (shouldHide) return null;

  return (
    <div
      ref={wrapperRef}
      className="fixed top-[var(--navbar-height,56px)] left-1/2 -translate-x-1/2 z-40 flex flex-col items-center"
      style={{ "--navbar-height": "56px" }}
    >
      {/* Trigger pill */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={[
          "flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-semibold shadow-lg transition-all duration-200 focus:outline-none",
          "border backdrop-blur-md",
          currentApp
            ? `bg-gradient-to-r ${currentApp.gradient} text-white border-white/20 shadow-lg`
            : "bg-white/90 dark:bg-gray-900/90 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700",
          open ? "scale-95" : "hover:scale-105",
        ].join(" ")}
        aria-haspopup="true"
        aria-expanded={open}
      >
        {currentApp ? (
          <>
            <span className="text-base leading-none">{currentApp.emoji}</span>
            <span>{currentApp.label}</span>
          </>
        ) : (
          <>
            <span className="text-base leading-none">🌐</span>
            <span>Choose App</span>
          </>
        )}
        <svg
          className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""} ${currentApp ? "opacity-80" : "opacity-50"}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute top-full mt-2 w-72 rounded-2xl overflow-hidden shadow-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 animate-in fade-in slide-in-from-top-2 duration-200"
          role="menu"
        >
          {/* Header */}
          <div className="px-4 pt-3 pb-2 border-b border-gray-100 dark:border-gray-800">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
              Switch App World
            </p>
          </div>

          {/* App options */}
          <div className="p-2 grid grid-cols-2 gap-1.5">
            {APP_LIST.map((app) => {
              const isActive = activeApp === app.key;
              return (
                <button
                  key={app.key}
                  type="button"
                  role="menuitem"
                  onClick={() => handleSelect(app.key)}
                  className={[
                    "flex flex-col items-start gap-1 rounded-xl p-3 text-left transition-all focus:outline-none",
                    isActive
                      ? `bg-gradient-to-br ${app.gradient} text-white shadow-md`
                      : `${app.bgLight} ${app.textLight} hover:opacity-80 border ${app.borderLight}`,
                  ].join(" ")}
                >
                  <span className="text-xl leading-none">{app.emoji}</span>
                  <span className={`text-xs font-bold ${isActive ? "text-white" : ""}`}>{app.label}</span>
                  {isActive && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-white/80">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-300 animate-pulse" />
                      Active
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer actions */}
          <div className="px-3 pb-3 pt-1 flex flex-col gap-1.5 border-t border-gray-100 dark:border-gray-800 mt-1">
            {activeApp && (
              <button
                type="button"
                role="menuitem"
                onClick={handleClearApp}
                className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear App Filter
              </button>
            )}
            <button
              type="button"
              role="menuitem"
              onClick={handleGoHub}
              className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
              </svg>
              Go to Hub
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

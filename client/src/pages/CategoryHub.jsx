import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCategoryMode } from "@/context/CategoryModeContext";
import { DEFAULT_FILTERS, useFilter } from "@/context/FilterContext";
import { fetchCategoriesCached } from "@/services/categoriesService";
import { useTheme } from "@/context/ThemeContext";
import api from "@/services/api";
import { useCmsPage } from "@/hooks/useCmsPage";
import DarkModeToggle from "@/components/DarkModeToggle";
import { Smartphone, Tablet, Monitor } from "lucide-react";
import { usePageRefresh } from "@/hooks/usePageRefresh";

const LAYOUT_STORAGE_KEY = 'mhub_layout_preview_mode';
const LAYOUT_USER_KEY = 'mhub_layout_preview_user';
const LAYOUT_SESSION_KEY = 'mhub_layout_preview_session';
const LAYOUT_MODES = [
  { key: 'mobile', label: 'Mobile', icon: Smartphone },
  { key: 'tablet', label: 'Tablet', icon: Tablet },
  { key: 'desktop', label: 'Desktop', icon: Monitor },
];

const isAndroidReplicaWebView = () => {
  if (typeof navigator === "undefined") return false;
  const ua = String(navigator.userAgent || "").toLowerCase();
  return ua.includes("mhubandroidwebreplica") || (ua.includes("android") && /\bwv\b/.test(ua));
};

const detectNativeRuntime = () => {
  if (typeof window === "undefined") return false;
  if (window.Capacitor?.isNativePlatform?.()) return true;
  return isAndroidReplicaWebView();
};

// ─── App definitions ────────────────────────────────────────────────────────

const APPS = [
  {
    key: "electronics",
    label: "Electronics",
    tagline: "Phones, laptops & gadgets",
    description: "Explore the latest mobiles, laptops, cameras, and all things tech.",
    gradient: "from-blue-500 via-indigo-600 to-violet-700",
    shadowColor: "shadow-blue-500/40",
    glowColor: "rgba(99,102,241,0.35)",
    ringColor: "ring-blue-400",
    chipBg: "bg-blue-500/20",
    chipText: "text-blue-200",
    emoji: "\uD83D\uDCF1",
    bgBlob: "bg-blue-400/10",
  },
  {
    key: "fashion",
    label: "Fashion",
    tagline: "Clothing, shoes & accessories",
    description: "Discover trending outfits, footwear, bags and accessories.",
    gradient: "from-pink-500 via-rose-500 to-red-500",
    shadowColor: "shadow-pink-500/40",
    glowColor: "rgba(236,72,153,0.35)",
    ringColor: "ring-pink-400",
    chipBg: "bg-pink-500/20",
    chipText: "text-pink-200",
    emoji: "\uD83D\uDC57",
    bgBlob: "bg-pink-400/10",
  },
  {
    key: "vehicles",
    label: "Vehicles",
    tagline: "Cars, bikes & spare parts",
    description: "Browse cars, motorcycles, auto parts and accessories.",
    gradient: "from-emerald-500 via-teal-500 to-cyan-600",
    shadowColor: "shadow-emerald-500/40",
    glowColor: "rgba(16,185,129,0.35)",
    ringColor: "ring-emerald-400",
    chipBg: "bg-emerald-500/20",
    chipText: "text-emerald-200",
    emoji: "\uD83D\uDE97",
    bgBlob: "bg-emerald-400/10",
  },
  {
    key: "others",
    label: "Others",
    tagline: "Home, services, jobs & more",
    description: "Find home goods, services, jobs, real estate and everything else.",
    gradient: "from-purple-500 via-violet-600 to-indigo-700",
    shadowColor: "shadow-purple-500/40",
    glowColor: "rgba(139,92,246,0.35)",
    ringColor: "ring-purple-400",
    chipBg: "bg-purple-500/20",
    chipText: "text-purple-200",
    emoji: "\u2728",
    bgBlob: "bg-purple-400/10",
  },
];

function getLocalizedApps(t) {
  return APPS.map((app) => ({
    ...app,
    label: t(`cat_${app.key}`, { defaultValue: app.label }),
    tagline: t(`cat_${app.key}_tagline`, { defaultValue: app.tagline }),
    description: t(`cat_${app.key}_desc`, { defaultValue: app.description }),
  }));
}

function createEmptyStatsMap() {
  return APPS.reduce((acc, app) => {
    acc[app.key] = {
      active_count: 0,
      new_today: 0,
      new_week: 0,
    };
    return acc;
  }, {});
}

function normalizeStatsMap(payload) {
  const source =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)
        ? payload.data
        : payload
      : {};

  const normalized = createEmptyStatsMap();
  APPS.forEach((app) => {
    const entry = source?.[app.key];
    if (!entry || typeof entry !== "object") return;
    normalized[app.key] = {
      active_count: Number(entry.active_count || 0),
      new_today: Number(entry.new_today || 0),
      new_week: Number(entry.new_week || 0),
    };
  });
  return normalized;
}

function normalizeCategoryList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.categories)) return payload.categories;
  return [];
}

function deriveStatsFromCategories(payload) {
  const normalized = createEmptyStatsMap();
  normalizeCategoryList(payload).forEach((category) => {
    const group = String(category?.category_group || "others").trim().toLowerCase();
    const targetGroup = Object.prototype.hasOwnProperty.call(normalized, group)
      ? group
      : "others";
    normalized[targetGroup].active_count += Number(category?.product_count || 0);
  });
  return normalized;
}

// ─── Stat formatter ─────────────────────────────────────────────────────────

function fmtCount(n) {
  const value = Number(n);
  if (!Number.isFinite(value) || value <= 0) return "0";
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (value >= 1_000) return (value / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(Math.round(value));
}

// ─── Loading skeleton ────────────────────────────────────────────────────────

function AppSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 md:gap-4">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="relative overflow-hidden rounded-3xl bg-slate-200/80 dark:bg-gray-800/60 animate-pulse dark:bg-slate-900/80"
          style={{ height: 160 }}
        />
      ))}
    </div>
  );
}

// ─── App Tile ────────────────────────────────────────────────────────────────

function AppTile({ app, stats, isActive, onSelect, t }) {
  const tileRef = useRef(null);
  const [hovered, setHovered] = useState(false);
  const s = stats[app.key] || {};

  const handleMouseMove = useCallback((e) => {
    const el = tileRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 12;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 12;
    el.style.transform = `perspective(600px) rotateX(${-y}deg) rotateY(${x}deg) scale(1.03)`;
  }, []);

  const handleMouseLeave = useCallback(() => {
    const el = tileRef.current;
    if (!el) return;
    el.style.transform = "perspective(600px) rotateX(0deg) rotateY(0deg) scale(1)";
    setHovered(false);
  }, []);

  return (
    <button
      ref={tileRef}
      type="button"
      onClick={() => onSelect(app.key)}
      onMouseEnter={() => setHovered(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={[
        "relative overflow-hidden rounded-3xl text-left transition-all duration-300 focus:outline-none group tile-active-bounce",
        "bg-gradient-to-br", app.gradient,
        isActive ? `ring-4 ${app.ringColor} ring-offset-2 ring-offset-slate-50 dark:ring-offset-gray-950` : "",
        hovered ? `shadow-2xl ${app.shadowColor} tile-hovered` : "shadow-lg",
      ].join(" ")}
      style={{ transition: "transform 0.15s ease, box-shadow 0.3s ease" }}
      aria-pressed={isActive}
      aria-label={t('enter_app', { label: app.label, defaultValue: `Enter ${app.label} app` })}
    >
      <span className="tile-shine-overlay" />
      {/* Decorative blobs */}
      <span className="pointer-events-none absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/10 blur-2xl dark:bg-slate-900/10" />
      <span className="pointer-events-none absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-white/8 blur-xl dark:bg-slate-900/8" />

      <div className="relative z-10 p-3 md:p-5 flex flex-col gap-1.5 h-full">
        {/* Top row: emoji + active badge */}
        <div className="flex items-start justify-between">
          <span
            className="text-xl sm:text-3xl md:text-5xl select-none"
            style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.3))" }}
          >
            {app.emoji}
          </span>
          {isActive && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/25 px-2.5 py-1 sm:px-3 sm:py-1 text-xs font-bold text-white uppercase tracking-wider backdrop-blur-sm dark:bg-slate-900/25 dark:text-white">
              <span className="w-1.5 h-1.5 rounded-full bg-green-300 animate-pulse dark:bg-green-900/30" />
              {t('active', { defaultValue: 'Active' })}
            </span>
          )}
        </div>

        {/* Title + tagline */}
        <div className="flex-1">
          <h2 className="text-base md:text-2xl font-extrabold text-white leading-tight tracking-tight dark:text-white">
            {app.label}
          </h2>
          <p className="text-xs sm:text-sm text-white/75 mt-0.5 line-clamp-1 dark:text-white/75">{app.tagline}</p>
        </div>

        {/* Stats chips */}
        <div className="hidden sm:flex flex-wrap gap-2">
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold backdrop-blur-sm ${app.chipBg} ${app.chipText}`}>
            {fmtCount(s.active_count)} {t('listings', { defaultValue: 'listings' })}
          </span>
          {s.new_today > 0 && (
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold backdrop-blur-sm ${app.chipBg} ${app.chipText}`}>
              +{fmtCount(s.new_today)} {t('today', { defaultValue: 'today' })}
            </span>
          )}
        </div>

        {/* Compact mobile stats */}
        <p className="sm:hidden text-xs text-white/60 font-medium dark:text-white/60">
          {fmtCount(s.active_count)} {t('listings', { defaultValue: 'listings' })}
        </p>

        {/* CTA row */}
        <div className="hidden sm:flex items-center justify-between mt-1">
          <p className="text-xs text-white/60 leading-tight max-w-[70%] line-clamp-2 hidden md:block dark:text-white/60">
            {app.description}
          </p>
          <span className={[
            "ml-auto flex items-center gap-1.5 rounded-2xl px-4 py-2 text-sm font-bold",
            "bg-white/20 text-white backdrop-blur-sm transition-all",
            hovered ? "bg-white/30 shadow-lg" : "",
          ].join(" ")}>
            {isActive ? t('continue_arrow', { defaultValue: 'Continue →' }) : t('enter', { defaultValue: 'Enter' })}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </span>
        </div>
      </div>
    </button>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function CategoryHub() {
  const navigate = useNavigate();
  const { setFilters } = useFilter();
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const {
    activeApp,
    setActiveApp,
    clearCategory,
    clearSubcategory,
    categories,
    loading: categoriesLoading,
  } = useCategoryMode();
  const { data: cmsContent } = useCmsPage("category-hub");

  const [stats, setStats] = useState({});
  const [statsLoading, setStatsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const isNativeRuntime = useMemo(() => detectNativeRuntime(), []);
  const [layoutMode, setLayoutMode] = useState(() => {
    if (detectNativeRuntime()) return "mobile";
    const stored = String(localStorage.getItem(LAYOUT_STORAGE_KEY) || '').trim().toLowerCase();
    return LAYOUT_MODES.some((m) => m.key === stored) ? stored : 'mobile';
  });

  const handleLayoutChange = useCallback((mode) => {
    if (isNativeRuntime) return;
    setLayoutMode(mode);
    localStorage.setItem(LAYOUT_STORAGE_KEY, mode);
    localStorage.setItem(LAYOUT_USER_KEY, '1');
    try { sessionStorage.setItem(LAYOUT_SESSION_KEY, '1'); } catch {}
    document.documentElement.setAttribute('data-layout-preview', mode);
    document.body?.setAttribute('data-layout-preview', mode);
  }, [isNativeRuntime]);

  useEffect(() => {
    if (!isNativeRuntime) return;
    document.documentElement.setAttribute("data-native-platform", "1");
    document.body?.setAttribute("data-native-platform", "1");
    document.documentElement.setAttribute("data-layout-preview", "mobile");
    document.body?.setAttribute("data-layout-preview", "mobile");
    localStorage.setItem(LAYOUT_STORAGE_KEY, "mobile");
  }, [isNativeRuntime]);

  useEffect(() => { document.title = t('browse_categories', { defaultValue: 'MHub — Browse Categories' }); return () => { document.title = "MHub"; }; }, [t]);

  // Entrance animation trigger
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  const apps = useMemo(() => {
    const base = getLocalizedApps(t);
    const overrides = Array.isArray(cmsContent?.apps) ? cmsContent.apps : [];
    if (!overrides.length) return base;
    return base.map((app) => {
      const match = overrides.find(
        (entry) => String(entry?.key || "").trim().toLowerCase() === app.key,
      );
      if (!match) return app;
      return {
        ...app,
        ...match,
        key: app.key,
      };
    });
  }, [cmsContent, t]);

  const currentApp = apps.find((app) => app.key === activeApp) || null;
  const heroGradient = isDark
    ? "radial-gradient(ellipse at 50% 0%, #6366f1 0%, #0f172a 70%)"
    : "radial-gradient(ellipse at 50% 0%, #c7d2fe 0%, #f8fafc 70%)";
  const headerPillClass = isDark
    ? "border border-white/15 bg-white/10 text-white/80"
    : "border border-slate-200 bg-white text-slate-600 shadow-sm";

  // Fetch hub stats (with stale-while-revalidate behaviour)
  const [refreshKey, setRefreshKey] = useState(0);
  usePageRefresh(useCallback(() => setRefreshKey(k => k + 1), []));
  useEffect(() => {
    let live = true;
    const cached = sessionStorage.getItem("mhub:hub_stats");
    if (cached) {
      try {
        setStats(normalizeStatsMap(JSON.parse(cached)));
        setStatsLoading(false);
      } catch {
        /* ignore */
      }
    }

    const applyStats = (nextStats) => {
      if (!live) return;
      setStats(nextStats);
      setStatsLoading(false);
      try {
        sessionStorage.setItem("mhub:hub_stats", JSON.stringify(nextStats));
      } catch {
        /* ignore */
      }
    };

    const deriveFromSource = (source) => {
      const nextStats = deriveStatsFromCategories(source);
      applyStats(nextStats);
    };

    const loadStats = async () => {
      try {
        if (Array.isArray(categories) && categories.length > 0) {
          deriveFromSource(categories);
        }
        const hubStatsResponse = await api.get("/categories/hub-stats");
        const normalized = normalizeStatsMap(hubStatsResponse);
        if (Object.keys(normalized).length > 0) {
          applyStats(normalized);
          return;
        }
      } catch {
        /* fall back to category list */
      }

      try {
        const list = await fetchCategoriesCached({ includeSubcategories: true });
        if (Array.isArray(list) && list.length > 0) {
          deriveFromSource(list);
          return;
        }
        applyStats(normalizeStatsMap({}));
      } catch {
        if (live) setStatsLoading(false);
      }
    };

    loadStats();
    return () => { live = false; };
  }, [categories, categoriesLoading, refreshKey]);

  const handleSelect = useCallback((appKey) => {
    clearCategory();
    clearSubcategory();
    setActiveApp(appKey);
    setFilters({ ...DEFAULT_FILTERS, categoryGroup: appKey });
    navigate(`/all-posts?category_group=${encodeURIComponent(appKey)}`);
  }, [clearCategory, clearSubcategory, setActiveApp, setFilters, navigate]);

  return (
    <div className="min-h-[100dvh] mhub-premium-page bg-slate-50 text-slate-900 dark:bg-gray-950 dark:text-white relative overflow-x-hidden flex flex-col dark:bg-slate-950 dark:text-slate-100 pb-20">
      <style>{`
        @keyframes tile-shine {
          0% { transform: translateX(-150%) skewX(-15deg); }
          50% { transform: translateX(150%) skewX(-15deg); }
          100% { transform: translateX(150%) skewX(-15deg); }
        }
        .tile-shine-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 50%;
          height: 100%;
          background: linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0) 100%);
          transform: translateX(-150%) skewX(-15deg);
          pointer-events: none;
          z-index: 5;
        }
        .tile-hovered .tile-shine-overlay {
          animation: tile-shine 2s infinite;
        }
        .tile-active-bounce {
          transform-origin: center;
          transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.3s ease !important;
        }
        .tile-active-bounce:active {
          transform: scale(0.96) !important;
          transition: transform 0.1s ease !important;
        }
      `}</style>
      {/* Full-screen gradient aurora background */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[140vw] h-[60vh] rounded-b-full opacity-20 blur-3xl"
          style={{ background: heroGradient }}
        />
        <div className={`absolute bottom-0 right-0 w-96 h-96 rounded-full blur-3xl ${isDark ? "opacity-10 bg-pink-600" : "opacity-20 bg-pink-300"}`} />
        <div className={`absolute top-1/3 left-0 w-72 h-72 rounded-full blur-3xl ${isDark ? "opacity-10 bg-emerald-600" : "opacity-20 bg-emerald-300"}`} />
      </div>

      <div className="relative z-10 max-w-[640px] mx-auto px-4 pt-4 md:pt-8 flex flex-col flex-1 min-h-0">
        {/* Header */}
        <div
          className="mb-4 text-center transition-all duration-700 flex-shrink-0"
          style={{ opacity: mounted ? 1 : 0, transform: mounted ? "none" : "translateY(-16px)" }}
        >
          {currentApp && (
            <div className={`mb-4 inline-flex flex-wrap items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-semibold backdrop-blur-sm ${headerPillClass}`}>
              <span className="text-base leading-none" aria-hidden="true">
                {currentApp.emoji}
              </span>
              <span>{t('active_app', { defaultValue: 'Active app:' })} {currentApp.label}</span>
              <span className={isDark ? "text-white/45" : "text-slate-500"}>{t('switch_anytime', { defaultValue: 'Switch anytime from here' })}</span>
            </div>
          )}
          <h1 className="text-lg sm:text-2xl md:text-3xl font-black tracking-tight leading-none">
            {t('choose_your', { defaultValue: 'Choose Your' })}{" "}
            <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent dark:bg-clip-text dark:text-transparent">
              {t('world', { defaultValue: 'World' })}
            </span>
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-white/60 max-w-xl mx-auto leading-relaxed dark:text-slate-200" data-density="extra">
            {t('category_hub_desc', { defaultValue: 'Select the app you want to open. Your choice becomes the active experience across feed, listings, chat, and every page until you switch to another app from this hub.' })}
          </p>
        </div>

        {/* App grid */}
        <div
          className="transition-all duration-700 delay-100 flex-1 min-h-0 flex flex-col"
          style={{ opacity: mounted ? 1 : 0, transform: mounted ? "none" : "translateY(20px)" }}
        >
          {statsLoading && Object.keys(stats).length === 0 ? (
            <AppSkeleton />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
          {apps.map((app) => (
                <AppTile
                  key={app.key}
                  app={app}
                  stats={stats}
                  isActive={activeApp === app.key}
                  onSelect={handleSelect}
                  t={t}
                />
              ))}
            </div>
          )}

          {/* ── Quick settings below categories (hidden on native mobile) ── */}
          {!isNativeRuntime && import.meta.env.DEV && (
          <div className="mt-6 mb-2 flex flex-col items-center gap-4">
            {/* Layout switcher */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-white shadow-md border border-gray-200 dark:bg-gray-800 dark:border-gray-600">
              {LAYOUT_MODES.map((mode) => {
                const Icon = mode.icon;
                const isActive = layoutMode === mode.key;
                return (
                  <button
                    key={mode.key}
                    type="button"
                    onClick={() => handleLayoutChange(mode.key)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    aria-label={mode.label}
                    aria-pressed={isActive}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{t(mode.key, { defaultValue: mode.label })}</span>
                  </button>
                );
              })}
            </div>

            {/* Dark mode toggle */}
            <div className="flex items-center gap-2">
              <DarkModeToggle className="!p-2 !rounded-xl !bg-white !shadow-md !border !border-gray-200 dark:!bg-gray-800 dark:!border-gray-600 hover:!shadow-lg transition-all" />
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{isDark ? t('light_mode', { defaultValue: 'Light' }) : t('dark_mode', { defaultValue: 'Dark' })}</span>
            </div>
          </div>
          )}
        </div>

      </div>
    </div>
  );
}


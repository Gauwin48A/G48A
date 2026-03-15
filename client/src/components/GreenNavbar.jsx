import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FiBell,
  FiArrowLeft,
  FiClock,
  FiHelpCircle,
  FiCheck,
  FiFilter,
  FiBookmark,
  FiHome,
  FiMapPin,
  FiMonitor,
  FiMenu,
  FiLock,
  FiMoon,
  FiPlus,
  FiSearch,
  FiShoppingCart,
  FiSmartphone,
  FiStar,
  FiSun,
  FiTablet,
  FiUser,
  FiX,
} from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { useFilter, DEFAULT_FILTERS } from "@/context/FilterContext";
import { useCart } from "@/context/CartContext";
import { useLocation as useLocationContext } from "@/context/LocationContext";
import { useAuth } from "@/context/AuthContext";
import { fetchCategoriesCached } from "@/services/categoriesService";
import { getSavedPostsMap, subscribeSavedPosts } from "@/utils/savedPosts";
import LanguageSelector from "./LanguageSelector";
import { useToast } from "@/hooks/use-toast";
import { navigateBack } from "@/utils/navigation";

const HIDDEN_PATHS = new Set(["/login", "/signup", "/forgot-password"]);
const BACK_BUTTON_HIDDEN_PATHS = new Set([]);
const LOCATION_OPTIONS = [
  "Any",
  "Hyderabad",
  "Bengaluru",
  "Chennai",
  "Mumbai",
  "Delhi",
  "Kolkata",
  "Pune",
];
const LOCATION_OPTION_KEYS = {
  Any: "any_location",
  Hyderabad: "hyderabad",
  Bengaluru: "bangalore",
  Chennai: "chennai",
  Mumbai: "mumbai",
  Delhi: "delhi",
  Kolkata: "kolkata",
  Pune: "pune",
};

const BOTTOM_ITEMS = [
  { key: "home", path: "/all-posts", icon: FiHome },
  { key: "for_you", path: "/for-you", icon: FiStar },
  { key: "feed", path: "/feed", icon: FiSearch },
  { key: "rewards", path: "/rewards", icon: FiStar },
  { key: "profile", path: "/profile", icon: FiUser },
  { key: "more", path: "#", icon: FiMenu },
];

const DRAWER_EXTRA_ITEMS = [
  { key: "chat", path: "/chat", icon: FiMenu, protected: true },
  { key: "dashboard", path: "/dashboard", icon: FiMenu, protected: true },
  { key: "my_reviews", path: "/reviews", icon: FiStar, protected: true },
  { key: "my_offers", path: "/offers", icon: FiShoppingCart, protected: true },
  { key: "nearby", path: "/nearby", icon: FiMapPin },
  { key: "categories", path: "/categories", icon: FiFilter },
  { key: "verification", path: "/verification", icon: FiUser, protected: true },
  { key: "feedback", path: "/feedback", icon: FiMenu },
  { key: "complaints", path: "/complaints", icon: FiMenu },
  { key: "admin_panel", path: "/admin-panel", icon: FiMenu, protected: true },
];
const ADMIN_ACCESS_ROLES = new Set([
  "admin",
  "superadmin",
  "moderator",
  "risk",
  "ops",
]);
const LAYOUT_STORAGE_KEY = "mhub_layout_preview_mode";
const LAYOUT_PRESETS = [
  {
    key: "mobile",
    labelKey: "mobile",
    icon: FiSmartphone,
    width: 390,
    height: 844,
  },
  {
    key: "tablet",
    labelKey: "tablet",
    icon: FiTablet,
    width: 834,
    height: 1112,
  },
  {
    key: "desktop",
    labelKey: "desktop",
    icon: FiMonitor,
    width: 1366,
    height: 900,
  },
];

const SEO_DEFAULTS = {
  title: "MHub - Verified Marketplace",
  description:
    "MHub is a secure marketplace for buying and selling verified products with trust-first listings and local discovery.",
  robots: "index,follow,max-image-preview:large",
  image: "/pwa-512x512.png",
};

const SEO_NO_INDEX_PATH_PREFIXES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/admin-panel",
  "/dashboard",
  "/profile",
  "/cart",
  "/payment",
];

function safeDecode(value) {
  try {
    return decodeURIComponent(String(value || ""));
  } catch {
    return String(value || "");
  }
}

function getStaticSeoForPath(pathname) {
  if (pathname === "/all-posts" || pathname === "/") {
    return {
      title: "All Posts - MHub",
      description:
        "Browse verified listings across categories, locations, and price ranges on MHub.",
    };
  }

  const byPath = {
    "/home": {
      title: "Home - MHub",
      description:
        "Discover trending verified listings and marketplace updates on MHub.",
    },
    "/categories": {
      title: "Categories - MHub",
      description:
        "Explore product categories and browse listings with fast filters on MHub.",
    },
    "/nearby": {
      title: "Nearby Listings - MHub",
      description:
        "Find verified listings near your location and compare local deals on MHub.",
    },
    "/public-wall": {
      title: "Public Wall - MHub",
      description:
        "Browse public listing highlights and marketplace activity on MHub.",
    },
    "/search": {
      title: "Search Listings - MHub",
      description:
        "Search verified products with category, location, and price filters on MHub.",
    },
    "/rewards": {
      title: "Rewards - MHub",
      description:
        "Track rewards, referrals, and growth milestones in your MHub account.",
    },
    "/support": {
      title: "Support - MHub",
      description:
        "Get help, policy guidance, and issue resolution support from the MHub team.",
    },
    "/t&c": {
      title: "Terms and Conditions - MHub",
      description:
        "Read marketplace terms, responsibilities, and usage guidelines for MHub.",
    },
    "/privacy-policy": {
      title: "Privacy Policy - MHub",
      description:
        "Review how MHub collects, uses, and protects your account and listing data.",
    },
    "/refund-policy": {
      title: "Refund Policy - MHub",
      description:
        "Understand refund eligibility, timelines, and process rules on MHub.",
    },
    "/support-ticket-policy": {
      title: "Support Ticket Policy - MHub",
      description:
        "Learn support ticket response expectations and escalation flow on MHub.",
    },
    "/login": {
      title: "Login - MHub",
      description:
        "Sign in to access your verified marketplace account on MHub.",
    },
    "/signup": {
      title: "Create Account - MHub",
      description:
        "Create your MHub account to post, buy, and manage listings securely.",
    },
  };

  return byPath[pathname] || null;
}

function buildSeoMeta(pathname, search) {
  const params = new URLSearchParams(search || "");
  const base = getStaticSeoForPath(pathname) || {};
  let title = base.title || SEO_DEFAULTS.title;
  let description = base.description || SEO_DEFAULTS.description;

  if (pathname === "/all-posts" || pathname === "/") {
    const searchTerm = safeDecode(params.get("search")).trim();
    const category = safeDecode(params.get("category")).trim();
    const location = safeDecode(params.get("location")).trim();

    const chunks = ["All Posts"];
    if (searchTerm) chunks.push(`"${searchTerm}"`);
    if (category) chunks.push(category);
    if (location) chunks.push(location);

    title = `${chunks.join(" | ")} - MHub`;
    description = [
      "Browse verified listings on MHub.",
      searchTerm ? `Search: ${searchTerm}.` : "",
      category ? `Category: ${category}.` : "",
      location ? `Location: ${location}.` : "",
    ]
      .filter(Boolean)
      .join(" ");
  } else if (pathname.startsWith("/post/")) {
    title = "Post Details - MHub";
    description =
      "View listing details, media, seller context, and trust signals for this MHub post.";
  }

  const noIndex = SEO_NO_INDEX_PATH_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  );

  return {
    title,
    description,
    robots: noIndex ? "noindex,nofollow" : SEO_DEFAULTS.robots,
    image: SEO_DEFAULTS.image,
  };
}

function upsertMeta(attribute, key, content) {
  if (typeof document === "undefined") return;
  if (!key || !content) return;

  let node = document.head.querySelector(`meta[${attribute}="${key}"]`);
  if (!node) {
    node = document.createElement("meta");
    node.setAttribute(attribute, key);
    document.head.appendChild(node);
  }
  node.setAttribute("content", content);
}

function upsertCanonical(pathname, search) {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  const origin = window.location.origin || "https://example.com";
  const canonicalUrl = `${origin}${pathname}${search || ""}`;

  let link = document.head.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.setAttribute("href", canonicalUrl);
}

function applySeoMeta(meta, pathname, search) {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  const origin = window.location.origin || "https://example.com";
  const pageUrl = `${origin}${pathname}${search || ""}`;

  document.title = meta.title || SEO_DEFAULTS.title;

  upsertMeta(
    "name",
    "description",
    meta.description || SEO_DEFAULTS.description,
  );
  upsertMeta("name", "robots", meta.robots || SEO_DEFAULTS.robots);
  upsertMeta("name", "theme-color", "#2563eb");

  upsertMeta("property", "og:type", "website");
  upsertMeta("property", "og:site_name", "MHub");
  upsertMeta("property", "og:title", meta.title || SEO_DEFAULTS.title);
  upsertMeta(
    "property",
    "og:description",
    meta.description || SEO_DEFAULTS.description,
  );
  upsertMeta("property", "og:url", pageUrl);
  upsertMeta("property", "og:image", meta.image || SEO_DEFAULTS.image);

  upsertMeta("name", "twitter:card", "summary_large_image");
  upsertMeta("name", "twitter:title", meta.title || SEO_DEFAULTS.title);
  upsertMeta(
    "name",
    "twitter:description",
    meta.description || SEO_DEFAULTS.description,
  );
  upsertMeta("name", "twitter:image", meta.image || SEO_DEFAULTS.image);

  upsertCanonical(pathname, search);
}

function normalizeNumber(value) {
  const parsed = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? String(parsed) : "";
}

function normalizeRole(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  if (!normalized) return "";
  if (normalized === "super_admin") return "superadmin";
  if (normalized === "administrator") return "admin";
  if (normalized === "mod") return "moderator";
  if (normalized === "operations") return "ops";
  return normalized;
}

function buildAllPostsSearch(filters) {
  const params = new URLSearchParams();

  if (filters.search) params.set("search", filters.search);
  if (filters.category && filters.category !== "All")
    params.set("category", filters.category);
  if (filters.location) params.set("location", filters.location);
  if (filters.minPrice)
    params.set("minPrice", normalizeNumber(filters.minPrice));
  if (filters.maxPrice)
    params.set("maxPrice", normalizeNumber(filters.maxPrice));
  if (filters.priceRange && !filters.minPrice && !filters.maxPrice) {
    const [minValue, maxValue] = String(filters.priceRange)
      .split("-")
      .map((value) => Number.parseInt(value, 10));
    if (Number.isFinite(minValue) && minValue >= 0)
      params.set("minPrice", String(minValue));
    if (Number.isFinite(maxValue) && maxValue > 0)
      params.set("maxPrice", String(maxValue));
  }
  if (filters.startDate) params.set("startDate", filters.startDate);
  if (filters.endDate) params.set("endDate", filters.endDate);
  if (filters.latestWindow) params.set("latestWindow", filters.latestWindow);
  if (filters.sortBy) params.set("sortBy", filters.sortBy);

  return params.toString();
}

function mergeFilterState(current, updates) {
  return {
    ...current,
    ...updates,
    search: String(updates.search ?? current.search ?? "").trim(),
    category: updates.category ?? current.category ?? "All",
    location:
      updates.location === "Any"
        ? ""
        : (updates.location ?? current.location ?? ""),
    minPrice: normalizeNumber(updates.minPrice ?? current.minPrice),
    maxPrice: normalizeNumber(updates.maxPrice ?? current.maxPrice),
    latestWindow: String(
      updates.latestWindow ?? current.latestWindow ?? "",
    ).trim(),
    startDate: updates.startDate ?? current.startDate ?? "",
    endDate: updates.endDate ?? current.endDate ?? "",
    sortBy: updates.sortBy ?? current.sortBy ?? "",
    page: 1,
  };
}

export default function GreenNavbar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const route = useLocation();
  const { toast } = useToast();

  const { filters, setFilters } = useFilter();
  const { totalCount } = useCart();
  const { user, logout, isAuthenticated: authIsAuthenticated } = useAuth();
  const {
    city,
    area,
    locality,
    displayName,
    loading: locationLoading,
  } = useLocationContext();

  const isAuthenticated = Boolean(authIsAuthenticated ?? user);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isLayoutMenuOpen, setIsLayoutMenuOpen] = useState(false);
  const [isCompactMenuOpen, setIsCompactMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === "undefined") return false;
    const storedTheme = String(localStorage.getItem("mhub-theme") || "")
      .trim()
      .toLowerCase();
    if (storedTheme === "dark") return true;
    if (storedTheme === "light") return false;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  });
  const [isLargeFont, setIsLargeFont] = useState(() => {
    if (typeof window === "undefined") return false;
    const raw = localStorage.getItem("largeFont");
    if (raw == null) return false;
    if (raw === "true") return true;
    if (raw === "false") return false;
    try {
      return Boolean(JSON.parse(raw));
    } catch {
      return false;
    }
  });
  const [savedCount, setSavedCount] = useState(
    () => Object.keys(getSavedPostsMap()).length,
  );
  const [layoutMode, setLayoutMode] = useState(() => {
    if (typeof window === "undefined") return "desktop";
    const stored = String(localStorage.getItem(LAYOUT_STORAGE_KEY) || "")
      .trim()
      .toLowerCase();
    return LAYOUT_PRESETS.some((item) => item.key === stored)
      ? stored
      : "desktop";
  });
  const layoutMenuRef = useRef(null);
  const compactMenuRef = useRef(null);
  const [isSmallViewport, setIsSmallViewport] = useState(false);

  const [searchInput, setSearchInput] = useState(filters.search || "");
  const [filterDraft, setFilterDraft] = useState(filters);
  const [categories, setCategories] = useState([]);

  const currentUserRole = useMemo(() => {
    const roleFromUser = normalizeRole(user?.role);
    if (roleFromUser) return roleFromUser;
    try {
      const storedUser = JSON.parse(localStorage.getItem("user") || "null");
      return normalizeRole(storedUser?.role);
    } catch {
      return "";
    }
  }, [user?.role]);
  const hasAdminPanelAccess = ADMIN_ACCESS_ROLES.has(currentUserRole);
  const hideNavbar =
    HIDDEN_PATHS.has(route.pathname) ||
    route.pathname.startsWith("/reset-password");
  const showBackButton = !BACK_BUTTON_HIDDEN_PATHS.has(route.pathname);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchCategoriesCached();
        if (cancelled) return;
        setCategories(Array.isArray(list) ? list : []);
      } catch {
        if (cancelled) return;
        setCategories([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setSearchInput(filters.search || "");
  }, [filters.search]);

  useEffect(() => {
    if (isFilterOpen) {
      setFilterDraft(filters);
    }
  }, [isFilterOpen, filters]);

  useEffect(() => {
    const seoMeta = buildSeoMeta(route.pathname, route.search);
    applySeoMeta(seoMeta, route.pathname, route.search);
  }, [route.pathname, route.search]);

  useEffect(() => {
    setIsLayoutMenuOpen(false);
    setIsCompactMenuOpen(false);
  }, [route.pathname, route.search]);

  useEffect(() => {
    const onClickOutside = (event) => {
      const clickedInLayout = layoutMenuRef.current?.contains(event.target);
      const clickedInMenu =
        typeof event.target?.closest === "function"
          ? event.target.closest('[data-layout-menu="true"]')
          : null;
      const clickedInCompact = compactMenuRef.current?.contains(event.target);
      const clickedInCompactMenu =
        typeof event.target?.closest === "function"
          ? event.target.closest('[data-compact-menu="true"]')
          : null;
      if (!clickedInLayout && !clickedInMenu) {
        setIsLayoutMenuOpen(false);
      }
      if (!clickedInCompact && !clickedInCompactMenu) {
        setIsCompactMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const query = window.matchMedia("(max-width: 639px)");
    const handleChange = (event) => setIsSmallViewport(event.matches);
    handleChange(query);
    if (typeof query.addEventListener === "function") {
      query.addEventListener("change", handleChange);
      return () => query.removeEventListener("change", handleChange);
    }
    query.addListener(handleChange);
    return () => query.removeListener(handleChange);
  }, []);

  useEffect(() => {
    return subscribeSavedPosts((map) => {
      setSavedCount(Object.keys(map || {}).length);
    });
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute("data-layout-preview", layoutMode);
    document.body?.setAttribute("data-layout-preview", layoutMode);
    localStorage.setItem(LAYOUT_STORAGE_KEY, layoutMode);
    if (typeof window !== "undefined") {
      try {
        window.dispatchEvent(
          new CustomEvent("mhub:layout-change", { detail: { mode: layoutMode } }),
        );
      } catch {
        // No-op: event dispatch isn't critical for layout mode.
      }
    }
  }, [layoutMode]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", isDarkMode);
    localStorage.setItem("mhub-theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.classList.toggle("text-lg", isLargeFont);
    document.body.style.fontSize = isLargeFont ? "18px" : "";
    localStorage.setItem("largeFont", JSON.stringify(isLargeFont));
  }, [isLargeFont]);

  const locationLabel = useMemo(() => {
    if (displayName) return displayName;
    if (area) return area;
    if (locality) return locality;
    if (city) return city;
    if (locationLoading)
      return t("detecting_location") || "Detecting location...";
    return t("location") || "Location";
  }, [area, city, displayName, locality, locationLoading, t]);
  const currentLayoutPreset = useMemo(
    () =>
      LAYOUT_PRESETS.find((item) => item.key === layoutMode) ||
      LAYOUT_PRESETS[2],
    [layoutMode],
  );
  const CurrentLayoutIcon = currentLayoutPreset.icon;
  const hasSavedPosts = savedCount > 0;
  const isPreviewMobile = layoutMode === "mobile";
  const isPreviewTablet = layoutMode === "tablet";
  const forceCompactUi = isPreviewMobile || isPreviewTablet;
  const showAllIconsInPreview = forceCompactUi;
  const showCompactHeader = forceCompactUi || isSmallViewport;

  const handleToggleDarkMode = () => {
    setIsDarkMode((value) => !value);
  };

  const handleToggleLargeFont = () => {
    setIsLargeFont((value) => !value);
  };

  const applyFilterAndNavigate = (next) => {
    const query = buildAllPostsSearch(next);
    setFilters(next);
    navigate(query ? `/all-posts?${query}` : "/all-posts");
  };

  const handleSearchSubmit = (event) => {
    event?.preventDefault?.();
    const next = mergeFilterState(filters, { search: searchInput });
    applyFilterAndNavigate(next);
  };

  const handleSearchClear = () => {
    setSearchInput("");
    const next = mergeFilterState(filters, { search: "" });
    applyFilterAndNavigate(next);
  };

  const handleApplyFilters = () => {
    const next = mergeFilterState(filters, filterDraft);
    setIsFilterOpen(false);
    applyFilterAndNavigate(next);
  };

  const handleResetFilters = () => {
    const reset = {
      ...DEFAULT_FILTERS,
      search: searchInput.trim(),
    };
    setFilterDraft(reset);
    setIsFilterOpen(false);
    applyFilterAndNavigate(reset);
  };

  const handleOpenProtected = (path) => {
    if (isAuthenticated) {
      navigate(path);
      setIsDrawerOpen(false);
      return;
    }
    toast({
      title: t("login_required_title") || "Login required",
      description: t("please_login_continue") || "Please login to continue.",
      variant: "destructive",
    });
    navigate("/login", { state: { returnTo: path } });
  };

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      setIsDrawerOpen(false);
      navigate("/login", { replace: true });
    }
  };

  const handleBackNavigation = () => {
    navigateBack(navigate);
  };

  const handleDrawerItemClick = (item) => {
    if (!item?.path) return;

    if (item.path === "/admin-panel" && !isAuthenticated) {
      handleOpenProtected(item.path);
      return;
    }

    if (item.path === "/admin-panel" && !hasAdminPanelAccess) {
      toast({
        title: t("admin_access_required") || "Admin access required",
        description:
          t("no_admin_permission") ||
          "You do not have permission to open Admin Panel.",
        variant: "destructive",
      });
      setIsDrawerOpen(false);
      return;
    }

    if (item.protected && !isAuthenticated) {
      handleOpenProtected(item.path);
      return;
    }

    if (item.key === "my_reviews") {
      const resolvedUserId =
        user?.id ||
        user?.user_id ||
        localStorage.getItem("userId") ||
        localStorage.getItem("user_id");
      if (!resolvedUserId) {
        toast({
          title: t("unable_open_reviews") || "Unable to open reviews",
          description:
            t("user_id_missing_refresh") ||
            "User ID is missing. Refresh your profile and try again.",
          variant: "destructive",
        });
        setIsDrawerOpen(false);
        return;
      }
      navigate(`/reviews/${resolvedUserId}`);
      setIsDrawerOpen(false);
      return;
    }

    navigate(item.path);
    setIsDrawerOpen(false);
  };

  const handleLayoutModeChange = (modeKey) => {
    const next = LAYOUT_PRESETS.find((item) => item.key === modeKey);
    if (!next) return;

    setLayoutMode(next.key);
    setIsLayoutMenuOpen(false);
    setIsCompactMenuOpen(false);
    setIsDrawerOpen(false);

    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        window.dispatchEvent(new Event("resize"));
      });
    }

    toast({
      title: `${t(next.labelKey) || next.key} ${t("layout_active") || "layout active"}`,
      description:
        t("responsive_preview_updated") ||
        `Responsive preview updated (${next.width}x${next.height}).`,
    });
  };

  const handleCycleLayout = () => {
    const currentIndex = LAYOUT_PRESETS.findIndex(
      (preset) => preset.key === layoutMode,
    );
    const nextPreset =
      currentIndex === -1
        ? LAYOUT_PRESETS[0]
        : LAYOUT_PRESETS[(currentIndex + 1) % LAYOUT_PRESETS.length];
    handleLayoutModeChange(nextPreset.key);
  };

  if (hideNavbar)
    return (
      <header
        className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/95 shadow-sm backdrop-blur dark:border-slate-800/60 dark:bg-slate-950/90"
        aria-label={t("main_navigation") || "Main navigation"}
      >
        <div className="mx-auto flex w-full max-w-[92rem] items-center gap-2 px-3 py-2">
          <button
            type="button"
            onClick={() => {
              navigateBack(navigate);
            }}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700 shadow-sm hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            aria-label={t("back") || "Back"}
            title={t("back") || "Back"}
          >
            <FiArrowLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {t("back") || "Back"}
          </span>
        </div>
      </header>
    );

  return (
    <>
            <header
        className="sticky top-0 z-50 border-b border-blue-500/25 bg-blue-600/95 shadow-lg backdrop-blur"
        aria-label={t("main_navigation") || "Main navigation"}
        data-no-auto-translate="true"
      >
        <div className="mx-auto w-full max-w-[92rem] px-2 py-1 sm:px-3 sm:py-2 md:px-4">
          {showCompactHeader ? (
            <div className="flex flex-col gap-1">
              <div className="flex flex-nowrap items-center justify-between gap-1">
                <div className="flex min-w-0 items-center gap-2">
                  {showBackButton ? (
                    <button
                      type="button"
                      onClick={handleBackNavigation}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 text-white shadow-sm hover:bg-white/25"
                      aria-label={t("back") || "Back"}
                      title={t("back") || "Back"}
                    >
                      <FiArrowLeft className="h-4 w-4" />
                    </button>
                  ) : null}
                  <Link
                    to="/all-posts"
                    className="flex items-center gap-2"
                    aria-label={t("home") || "Home"}
                  >
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white text-blue-600 shadow">
                      <FiHome className="h-4 w-4" />
                    </span>
                    <span className="hidden text-sm font-semibold text-white sm:inline sm:text-base">
                      {t("home") || "Home"}
                    </span>
                  </Link>

                  <div
                    className="inline-flex h-7 max-w-[120px] items-center gap-1 rounded-full bg-white/15 px-1.5 text-[10px] font-semibold text-white shadow-sm sm:max-w-[200px] sm:px-2 sm:text-xs"
                    title={locationLabel}
                    aria-label={locationLabel}
                  >
                    <FiMapPin className="h-4 w-4" />
                    <span className="truncate">{locationLabel}</span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1 rounded-full bg-white/10 px-1 py-0.5 backdrop-blur">
                  <div ref={compactMenuRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setIsCompactMenuOpen((value) => !value)}
                      aria-expanded={isCompactMenuOpen}
                      aria-haspopup="menu"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/20"
                      aria-label={t("quick_settings") || "Quick settings"}
                      title={t("quick_settings") || "Quick settings"}
                    >
                      <FiMenu className="h-4 w-4" />
                    </button>

                    {isCompactMenuOpen ? (
                      <div className="fixed inset-0 z-[80]" data-compact-menu="true">
                        <button
                          type="button"
                          aria-label={t("close") || "Close"}
                          onClick={() => setIsCompactMenuOpen(false)}
                          className="absolute inset-0 bg-black/40"
                        />
                        <div className="absolute bottom-0 left-0 right-0 rounded-t-2xl bg-white dark:bg-slate-900 px-4 pb-6 pt-4 shadow-2xl">
                          <div className="flex items-center justify-between pb-3">
                            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                              {t("quick_settings") || "Quick settings"}
                            </h3>
                            <button
                              type="button"
                              onClick={() => setIsCompactMenuOpen(false)}
                              className="rounded-full p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              <FiX className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-3">
                              <div>
                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                  {t("language") || "Language"}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  {t("choose_language") || "Choose your preferred language"}
                                </p>
                              </div>
                              <LanguageSelector compact className="shrink-0 max-w-[84px]" />
                            </div>

                            <button
                              type="button"
                              onClick={handleToggleDarkMode}
                              className="flex w-full items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-3 text-left"
                            >
                              <div>
                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                  {isDarkMode
                                    ? t("light_mode") || "Light mode"
                                    : t("dark_mode") || "Dark mode"}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  {t("theme") || "Theme"}
                                </p>
                              </div>
                              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                                {isDarkMode ? (
                                  <FiSun className="h-4 w-4 text-amber-500" />
                                ) : (
                                  <FiMoon className="h-4 w-4 text-slate-700" />
                                )}
                              </span>
                            </button>

                            <div className="grid gap-2">
                              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                {t("layout") || "Layout"}
                              </p>
                              {LAYOUT_PRESETS.map((preset) => {
                                const Icon = preset.icon;
                                const active = preset.key === layoutMode;
                                return (
                                  <button
                                    key={preset.key}
                                    type="button"
                                    onClick={() => handleLayoutModeChange(preset.key)}
                                    className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left ${
                                      active
                                        ? "border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                                        : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                                    }`}
                                  >
                                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white dark:bg-slate-800 shadow-sm">
                                      <Icon className="h-4 w-4" />
                                    </span>
                                    <span className="flex flex-1 flex-col">
                                      <span className="text-sm font-semibold">
                                        {t(preset.labelKey) || preset.key}
                                      </span>
                                      <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                                        {preset.width} x {preset.height}
                                      </span>
                                    </span>
                                    {active ? <FiCheck className="h-4 w-4" /> : null}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <form
                onSubmit={handleSearchSubmit}
                className="flex w-full items-center gap-1"
              >
                <div className="relative min-w-0 flex-1">
                  <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder={
                      t("search_placeholder") ||
                      "Search products, brands and more"
                    }
                    className="h-8 w-full rounded-full border border-white/50 bg-white px-8 pr-8 text-[10px] text-slate-800 outline-none ring-0 placeholder:text-slate-400 focus:border-blue-300 sm:h-9 sm:text-xs"
                  />
                  {searchInput ? (
                    <button
                      type="button"
                      onClick={handleSearchClear}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:bg-slate-100"
                      aria-label={t("clear_search") || "Clear search"}
                    >
                      <FiX className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => setIsFilterOpen(true)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-[10px] font-semibold text-white shadow-sm hover:bg-blue-500/80 sm:h-9 sm:w-auto sm:px-3 sm:justify-center"
                >
                  <FiFilter className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {t("filter") || "Filter"}
                  </span>
                </button>
              </form>

              <div className="relative w-full">
                <div className="relative flex w-full items-center gap-2 overflow-x-auto rounded-full border border-white/15 bg-white/10 px-2 py-1 backdrop-blur scrollbar-hide">
                  <div className="flex min-w-max items-center gap-2">
                    {isAuthenticated ? (
                      <Link
                        to="/tier-selection"
                        aria-label={t("add_post") || "Add post"}
                        className="relative inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-blue-600 shadow sm:h-9 sm:w-9"
                        title={t("add_post") || "Add Post"}
                      >
                        <FiPlus className="h-4 w-4" />
                        <span className="sr-only">{t("add_post") || "Add post"}</span>
                      </Link>
                    ) : null}

                    <Link
                      to="/notifications"
                      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:h-9 sm:w-9"
                      aria-label={t("notifications") || "Notifications"}
                      title={t("notifications") || "Notifications"}
                    >
                      <FiBell className="h-4 w-4" />
                      <span className="sr-only">{t("notifications") || "Notifications"}</span>
                    </Link>

                    <Link
                      to="/wishlist"
                      className={`relative inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full sm:h-9 sm:w-9 ${
                        route.pathname === "/wishlist"
                          ? "bg-white text-blue-700"
                          : hasSavedPosts
                            ? "bg-emerald-300 text-blue-900"
                            : "bg-white/10 text-white hover:bg-white/20"
                      }`}
                      aria-label={t("wishlist") || "Wishlist"}
                      title={
                        savedCount > 0
                          ? `${savedCount} ${t("saved_posts") || "saved posts"}`
                          : t("wishlist") || "Wishlist"
                      }
                    >
                      <FiBookmark className="h-4 w-4" />
                      {savedCount > 0 ? (
                        <span className="absolute -right-0.5 -top-0.5 min-w-[18px] rounded-full bg-emerald-300 px-1 text-center text-[10px] font-bold text-blue-900">
                          {savedCount > 99 ? "99+" : savedCount}
                        </span>
                      ) : null}
                      <span className="sr-only">{t("wishlist") || "Wishlist"}</span>
                    </Link>

                    <Link
                      to="/cart"
                      className="relative inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:h-9 sm:w-9"
                      aria-label={t("cart") || "Cart"}
                      title={t("cart") || "Cart"}
                    >
                      <FiShoppingCart className="h-4 w-4" />
                      {totalCount > 0 ? (
                        <span className="absolute -right-0.5 -top-0.5 min-w-[18px] rounded-full bg-emerald-300 px-1 text-center text-[10px] font-bold text-blue-900">
                          {totalCount > 99 ? "99+" : totalCount}
                        </span>
                      ) : null}
                      <span className="sr-only">{t("cart") || "Cart"}</span>
                    </Link>

                    <Link
                      to="/recently-viewed"
                      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:h-9 sm:w-9"
                      aria-label={t("recently_viewed") || "Recently viewed"}
                      title={t("recently_viewed") || "Recently viewed"}
                    >
                      <FiClock className="h-4 w-4" />
                      <span className="sr-only">{t("recently_viewed") || "Recently viewed"}</span>
                    </Link>

                    <button
                      type="button"
                      onClick={handleCycleLayout}
                      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:h-9 sm:w-9"
                      aria-label={`${t("layout") || "Layout"}: ${
                        t(currentLayoutPreset.labelKey) ||
                        currentLayoutPreset.key
                      }`}
                      title={`${t(currentLayoutPreset.labelKey) || currentLayoutPreset.key} ${
                        t("layout") || "layout"
                      }`}
                    >
                      <CurrentLayoutIcon className="h-4 w-4" />
                      <span className="sr-only">
                        {t("layout") || "Layout"}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex w-full flex-wrap items-center gap-1 sm:gap-2 md:gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2 md:flex-none">
                {showBackButton ? (
                  <button
                    type="button"
                    onClick={handleBackNavigation}
                    className="inline-flex h-6 w-6 items-center justify-center rounded-xl bg-white/20 text-white shadow-sm hover:bg-white/30 sm:h-10 sm:w-10"
                    aria-label={t("back") || "Back"}
                    title={t("back") || "Back"}
                  >
                    <FiArrowLeft className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
                  </button>
                ) : null}
                <Link
                  to="/all-posts"
                  className="flex items-center gap-2"
                  aria-label={t("home") || "Home"}
                >
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-xl bg-white text-blue-600 shadow sm:h-10 sm:w-10">
                    <FiHome className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
                  </span>
                  <span className="hidden text-3xl font-bold text-white md:inline">
                    {t("home") || "Home"}
                  </span>
                </Link>

                <div
                  className="inline-flex h-6 max-w-[72px] items-center gap-0.5 rounded-xl bg-blue-500 px-1 text-[8px] font-semibold text-white sm:h-10 sm:max-w-[180px] sm:gap-1 sm:px-2.5 sm:text-xs md:max-w-[240px] md:text-sm"
                  title={locationLabel}
                  aria-label={locationLabel}
                >
                  <FiMapPin className="h-4 w-4" />
                  <span className="truncate">{locationLabel}</span>
                </div>
              </div>

              <form
                onSubmit={handleSearchSubmit}
                className="order-3 mt-0 flex w-full flex-1 items-center gap-1 sm:order-none sm:mt-0 sm:min-w-[260px] md:gap-2"
              >
                <div className="relative min-w-0 flex-1">
                  <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder={
                      t("search_placeholder") ||
                      "Search products, brands and more"
                    }
                    className="h-6 w-full rounded-full border border-white/40 bg-white px-8 pr-8 text-[9px] text-slate-800 outline-none ring-0 placeholder:text-slate-400 focus:border-blue-300 sm:h-11 sm:px-10 sm:pr-10 sm:text-sm"
                  />
                  {searchInput ? (
                    <button
                      type="button"
                      onClick={handleSearchClear}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:bg-slate-100"
                      aria-label={t("clear_search") || "Clear search"}
                    >
                      <FiX className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => setIsFilterOpen(true)}
                  className="inline-flex h-6 items-center gap-1 rounded-xl bg-blue-500 px-1 text-[9px] font-semibold text-white hover:bg-blue-500/80 sm:h-11 sm:px-3 sm:text-sm"
                >
                  <FiFilter className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {t("filter") || "Filter"}
                  </span>
                </button>
              </form>

              <div className="ml-0 flex min-w-0 flex-1 items-center justify-between gap-1 sm:ml-auto sm:flex-none sm:justify-end">
                <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-0.5 overflow-x-auto pr-0.5 scrollbar-hide [&>*]:shrink-0 sm:flex-none sm:overflow-visible sm:pr-0 sm:gap-1.5">
                  {isAuthenticated ? (
                    <Link
                      to="/tier-selection"
                      aria-label={t("add_post") || "Add post"}
                      className={`h-8 w-8 items-center justify-center rounded-full border-2 border-blue-300 bg-blue-500 text-white shadow hover:scale-105 sm:h-10 sm:w-10 ${
                        showAllIconsInPreview
                          ? "inline-flex"
                          : "hidden md:inline-flex"
                      }`}
                      title={t("add_post") || "Add Post"}
                    >
                      <FiPlus className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Link>
                  ) : null}

                  <Link
                    to="/notifications"
                    className={`h-8 w-8 items-center justify-center rounded-full text-white hover:bg-blue-500 sm:h-10 sm:w-10 ${
                      showAllIconsInPreview
                        ? "inline-flex"
                        : "hidden lg:inline-flex"
                    }`}
                    aria-label={t("notifications") || "Notifications"}
                  >
                    <FiBell className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Link>

                  <Link
                    to="/wishlist"
                    className={`relative h-8 w-8 items-center justify-center rounded-full sm:h-10 sm:w-10 ${
                      route.pathname === "/wishlist"
                        ? "bg-blue-500 text-white"
                        : hasSavedPosts
                          ? "bg-emerald-300 text-blue-900"
                          : "text-white hover:bg-blue-500"
                    } ${showAllIconsInPreview ? "inline-flex" : "hidden lg:inline-flex"}`}
                    aria-label={t("wishlist") || "Wishlist"}
                    title={
                      savedCount > 0
                        ? `${savedCount} ${t("saved_posts") || "saved posts"}`
                        : t("wishlist") || "Wishlist"
                    }
                  >
                    <FiBookmark className="h-4 w-4 sm:h-5 sm:w-5" />
                    {savedCount > 0 ? (
                      <span className="absolute -right-0.5 -top-0.5 min-w-[18px] rounded-full bg-emerald-300 px-1 text-center text-[10px] font-bold text-blue-900">
                        {savedCount > 99 ? "99+" : savedCount}
                      </span>
                    ) : null}
                  </Link>

                  <Link
                    to="/cart"
                    className="relative inline-flex h-8 w-8 items-center justify-center rounded-full text-white hover:bg-blue-500 sm:h-10 sm:w-10"
                    aria-label={t("cart") || "Cart"}
                  >
                    <FiShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
                    {totalCount > 0 ? (
                      <span className="absolute -right-0.5 -top-0.5 min-w-[18px] rounded-full bg-emerald-300 px-1 text-center text-[10px] font-bold text-blue-900">
                        {totalCount > 99 ? "99+" : totalCount}
                      </span>
                    ) : null}
                  </Link>

                  <Link
                    to="/recently-viewed"
                    className={`h-8 w-8 items-center justify-center rounded-full text-white hover:bg-blue-500 sm:h-10 sm:w-10 ${
                      showAllIconsInPreview
                        ? "inline-flex"
                        : "hidden xl:inline-flex"
                    }`}
                    aria-label={t("recently_viewed") || "Recently viewed"}
                  >
                    <FiClock className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Link>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <LanguageSelector
                    compact
                    className={`shrink-0 ${
                      forceCompactUi ? "inline-flex" : "lg:hidden"
                    }`}
                  />
                  <LanguageSelector
                    className={`shrink-0 ${
                      forceCompactUi ? "hidden" : "hidden lg:block"
                    }`}
                  />

                  <button
                    type="button"
                    onClick={handleToggleDarkMode}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/30 bg-blue-500 text-white hover:bg-blue-500/80 sm:h-10 sm:w-10"
                    aria-label={
                      isDarkMode
                        ? t("light_mode") || "Switch to light mode"
                        : t("dark_mode") || "Switch to dark mode"
                    }
                    title={
                      isDarkMode
                        ? t("light_mode") || "Switch to light mode"
                        : t("dark_mode") || "Switch to dark mode"
                    }
                  >
                    {isDarkMode ? (
                      <FiSun className="h-4 w-4 sm:h-5 sm:w-5" />
                    ) : (
                      <FiMoon className="h-4 w-4 sm:h-5 sm:w-5" />
                    )}
                  </button>

                  <div ref={layoutMenuRef} className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsLayoutMenuOpen((value) => !value)}
                      aria-expanded={isLayoutMenuOpen}
                      aria-haspopup="menu"
                      className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-white/30 bg-blue-500 px-1.5 text-white hover:bg-blue-500/80 sm:h-10 sm:gap-1.5 sm:rounded-xl sm:px-2.5"
                      aria-label={`${t(currentLayoutPreset.labelKey) || currentLayoutPreset.key} ${
                        t("layout") || "layout"
                      }`}
                      title={`${t(currentLayoutPreset.labelKey) || currentLayoutPreset.key} ${
                        t("layout") || "layout"
                      }`}
                    >
                      <CurrentLayoutIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                      <span className="hidden text-xs font-semibold md:inline">
                        {t(currentLayoutPreset.labelKey) ||
                          currentLayoutPreset.key}
                      </span>
                    </button>

                    {isLayoutMenuOpen ? (
                      <div
                        className="absolute right-0 top-full z-[70] mt-2 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
                        data-layout-menu="true"
                      >
                        {LAYOUT_PRESETS.map((preset) => {
                          const Icon = preset.icon;
                          const active = preset.key === layoutMode;
                          return (
                            <button
                              key={preset.key}
                              type="button"
                              onClick={() => handleLayoutModeChange(preset.key)}
                              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                                active
                                  ? "bg-blue-50 font-semibold text-blue-700"
                                  : "text-slate-700 hover:bg-slate-50"
                              }`}
                            >
                              <Icon className="h-4 w-4" />
                              <span className="flex flex-1 flex-col">
                                <span>{t(preset.labelKey) || preset.key}</span>
                                <span className="text-[11px] font-normal text-slate-500">
                                  {preset.width} x {preset.height}
                                </span>
                              </span>
                              {active ? <FiCheck className="h-4 w-4" /> : null}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {isFilterOpen ? (
        <div
          className="fixed inset-0 z-[65] flex items-center justify-center bg-black/50 p-3"
          onClick={() => setIsFilterOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">
                {t("filter_products") || "Filter products"}
              </h3>
              <button
                type="button"
                onClick={() => setIsFilterOpen(false)}
                className="rounded p-1 text-slate-500 hover:bg-slate-100"
                aria-label={t("close_filter") || "Close filter"}
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-700">
                {t("location") || "Location"}
                <select
                  className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                  value={filterDraft.location || ""}
                  onChange={(event) =>
                    setFilterDraft((prev) => ({
                      ...prev,
                      location: event.target.value,
                    }))
                  }
                >
                  {LOCATION_OPTIONS.map((option) => (
                    <option key={option} value={option === "Any" ? "" : option}>
                      {t(LOCATION_OPTION_KEYS[option]) || option}
                    </option>
                  ))}
                  {city && !LOCATION_OPTIONS.includes(city) ? (
                    <option value={city}>{city}</option>
                  ) : null}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="block text-sm font-medium text-slate-700">
                  {t("min_price") || "Min price"}
                  <input
                    type="number"
                    min="0"
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                    value={filterDraft.minPrice || ""}
                    onChange={(event) =>
                      setFilterDraft((prev) => ({
                        ...prev,
                        minPrice: event.target.value,
                      }))
                    }
                    placeholder="0"
                  />
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  {t("max_price") || "Max price"}
                  <input
                    type="number"
                    min="0"
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                    value={filterDraft.maxPrice || ""}
                    onChange={(event) =>
                      setFilterDraft((prev) => ({
                        ...prev,
                        maxPrice: event.target.value,
                      }))
                    }
                    placeholder="50000"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="block text-sm font-medium text-slate-700">
                  {t("start_date") || "Start date"}
                  <input
                    type="date"
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                    value={filterDraft.startDate || ""}
                    onChange={(event) =>
                      setFilterDraft((prev) => ({
                        ...prev,
                        startDate: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  {t("end_date") || "End date"}
                  <input
                    type="date"
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                    value={filterDraft.endDate || ""}
                    onChange={(event) =>
                      setFilterDraft((prev) => ({
                        ...prev,
                        endDate: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>

              <label className="block text-sm font-medium text-slate-700">
                {t("category") || "Category"}
                <select
                  className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                  value={filterDraft.category || "All"}
                  onChange={(event) =>
                    setFilterDraft((prev) => ({
                      ...prev,
                      category: event.target.value,
                    }))
                  }
                >
                  <option value="All">
                    {t("all_categories") || "All Categories"}
                  </option>
                  {categories.map((category) => (
                    <option
                      key={category.category_id || category.id || category.name}
                      value={category.name}
                    >
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium text-slate-700">
                {t("sort_by") || "Sort by"}
                <select
                  className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                  value={filterDraft.sortBy || ""}
                  onChange={(event) =>
                    setFilterDraft((prev) => ({
                      ...prev,
                      sortBy: event.target.value,
                    }))
                  }
                >
                  <option value="">{t("default") || "Default"}</option>
                  <option value="price_asc">
                    {t("price_low_high") || "Price: Low to high"}
                  </option>
                  <option value="price_desc">
                    {t("price_high_low") || "Price: High to low"}
                  </option>
                  <option value="date_desc">
                    {t("newest_first") || "Newest first"}
                  </option>
                  <option value="date_asc">
                    {t("oldest_first") || "Oldest first"}
                  </option>
                </select>
              </label>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={handleApplyFilters}
                className="h-10 flex-1 rounded-lg bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700"
              >
                {t("apply") || "Apply"}
              </button>
              <button
                type="button"
                onClick={handleResetFilters}
                className="h-10 flex-1 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                {t("reset") || "Reset"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isDrawerOpen ? (
        <div
          className="fixed inset-0 z-[70]"
          onClick={() => setIsDrawerOpen(false)}
        >
          <div className="absolute inset-0 bg-black/35" />
          <aside
            className="fixed right-0 top-0 z-[71] h-full w-[380px] max-w-[92vw] overflow-y-auto bg-white p-6 pb-10 shadow-2xl dark:bg-gray-900"
            onClick={(event) => event.stopPropagation()}
            data-no-auto-translate="true"
          >
            <button
              type="button"
              onClick={() => setIsDrawerOpen(false)}
              className="absolute right-5 top-5 rounded p-1 text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white"
              aria-label={t("close_menu") || "Close menu"}
            >
              <FiX className="h-6 w-6" />
            </button>

            <h2 className="mb-5 text-4xl font-bold tracking-tight text-slate-800 dark:text-white">
              {t("more_options") || "More options"}
            </h2>

            <div className="space-y-3">
              <p className="px-1 text-sm font-bold uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500">
                {t("extra_options") || "Extra options"}
              </p>
              {DRAWER_EXTRA_ITEMS.map((item) => {
                const blockedForGuest =
                  !isAuthenticated && Boolean(item.protected);
                const blockedForRole =
                  isAuthenticated &&
                  item.path === "/admin-panel" &&
                  !hasAdminPanelAccess;
                const Icon = item.icon || FiMenu;
                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => handleDrawerItemClick(item)}
                    className={`flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left text-[1.05rem] font-semibold transition-colors duration-150 ${
                      blockedForRole
                        ? "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                        : blockedForGuest
                          ? "border-amber-200 bg-amber-50/70 text-slate-700 hover:bg-amber-100/80 dark:border-amber-400/40 dark:bg-amber-500/10 dark:text-slate-100 dark:hover:bg-amber-500/20"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <Icon
                        className={`h-5 w-5 shrink-0 ${
                          blockedForGuest
                            ? "text-amber-500 dark:text-amber-300"
                            : "text-slate-400 dark:text-slate-400"
                        }`}
                      />
                      {t(item.key) || item.key}
                    </span>
                    {blockedForRole ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                        <FiLock className="h-3.5 w-3.5 shrink-0" />
                        {t("admin_only") || "Admin only"}
                      </span>
                    ) : null}
                    {blockedForGuest ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-200/80 px-2 py-1 text-[11px] font-semibold text-amber-900 dark:bg-amber-400/20 dark:text-amber-200">
                        <FiLock className="h-3.5 w-3.5 shrink-0" />
                        {t("login_required") || "Login"}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 border-t border-gray-200 pt-4 dark:border-gray-700">
              <p className="mb-2 text-center text-xs text-slate-500 dark:text-slate-400">
                {t("accessibility") || "Accessibility"}
              </p>
              <button
                type="button"
                onClick={handleToggleDarkMode}
                className={`mb-2 w-full rounded-2xl px-4 py-3 text-base font-semibold transition-colors ${
                  isDarkMode
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {isDarkMode
                  ? t("light_mode") || "Switch to light mode"
                  : t("dark_mode") || "Switch to dark mode"}
              </button>
              <button
                type="button"
                onClick={handleToggleLargeFont}
                className={`w-full rounded-2xl px-4 py-3 text-base font-semibold transition-colors ${
                  isLargeFont
                    ? "bg-green-500 text-white hover:bg-green-600"
                    : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {isLargeFont
                  ? t("normal_size") || "Normal size"
                  : t("larger_text") || "Larger text"}
              </button>
              <p className="mt-1 text-center text-xs text-slate-500 dark:text-slate-400">
                {isLargeFont
                  ? t("using_large_fonts") || "Currently using large fonts"
                  : t("easier_to_read") || "Easier to read for everyone"}
              </p>
            </div>

            <div className="mt-6 border-t border-gray-200 pt-4 dark:border-gray-700">
              <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500">
                {t("layout") || "Layout"}
              </p>
              <div className="grid gap-2">
                {LAYOUT_PRESETS.map((preset) => {
                  const Icon = preset.icon;
                  const active = preset.key === layoutMode;
                  return (
                    <button
                      key={preset.key}
                      type="button"
                      onClick={() => handleLayoutModeChange(preset.key)}
                      className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-colors ${
                        active
                          ? "border-blue-300 bg-blue-50 text-blue-700"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white shadow-sm dark:bg-slate-800">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="flex flex-1 flex-col">
                        <span>{t(preset.labelKey) || preset.key}</span>
                        <span className="text-[11px] font-normal text-slate-500">
                          {preset.width} x {preset.height}
                        </span>
                      </span>
                      {active ? <FiCheck className="h-4 w-4" /> : null}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-700">
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="block w-full rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[1.05rem] font-semibold text-red-600 transition-colors duration-150 hover:bg-red-100 dark:border-red-500/30 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30"
                >
                  {t("logout") || "Logout"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    navigate("/login");
                    setIsDrawerOpen(false);
                  }}
                  className="block w-full rounded-2xl bg-blue-600 px-4 py-3 text-[1.05rem] font-semibold text-white transition-colors duration-150 hover:bg-blue-700"
                >
                  {t("login") || "Login"}
                </button>
              )}
            </div>
          </aside>
        </div>
      ) : null}

      <nav
        className="bottom-nav fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 px-1 py-1.5 shadow-lg backdrop-blur"
        aria-label={t("bottom_navigation") || "Bottom navigation"}
        data-no-auto-translate="true"
      >
        <div className="mx-auto flex max-w-[92rem] items-center justify-between gap-1">
          {BOTTOM_ITEMS.slice(0, 3).map((item) => {
            const Icon = item.icon;
            const active = route.pathname === item.path;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => navigate(item.path)}
                className={`flex min-h-[52px] min-w-[56px] flex-1 flex-col items-center justify-center rounded-lg text-xs font-semibold transition ${
                  active ? "text-blue-600" : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                <Icon className="mb-1 h-4 w-4" />
                <span>{t(item.key) || item.key}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() =>
              isAuthenticated ? navigate("/tier-selection") : navigate("/login")
            }
            className="mx-0.5 inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg"
            aria-label={t("sell") || "Sell"}
          >
            <FiPlus className="h-6 w-6" />
          </button>

          {BOTTOM_ITEMS.slice(3).map((item) => {
            const Icon = item.icon;
            const isMore = item.key === "more";
            const active = !isMore && route.pathname === item.path;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  if (isMore) {
                    setIsDrawerOpen(true);
                    return;
                  }
                  navigate(item.path);
                }}
                className={`flex min-h-[52px] min-w-[56px] flex-1 flex-col items-center justify-center rounded-lg text-xs font-semibold transition ${
                  active ? "text-blue-600" : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                <Icon className="mb-1 h-4 w-4" />
                <span>{t(item.key) || item.key}</span>
              </button>
            );
          })}
        </div>
      </nav>

    </>
  );
}


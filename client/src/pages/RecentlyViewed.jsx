import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import SellerTrustBadges from "@/components/SellerTrustBadges";
import {
  History,
  Trash2,
  MapPin,
  Clock,
  Eye,
  XCircle,
  Sparkles,
  ShoppingBag,
  Newspaper,
  Heart,
  Search,
  Bell,
  Home,
  ArrowLeft,
  Grid3X3,
  List,
  RefreshCw,
  Check,
  Lock,
  LogIn,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "@/lib/api";
import { useTranslatedPosts } from "@/hooks/useTranslatedContent";
import { useAuth } from "@/context/AuthContext";
import { useCategoryMode } from "@/context/CategoryModeContext";
import {
  getAccessToken,
  getUserId,
  isAuthenticated,
} from "@/utils/authStorage";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import {
  buildActiveAppMatcher,
  matchesCategoryModeItem,
} from "@/utils/categoryModeFilters";
import { navigateBack } from "@/utils/navigation";

const PAGE_LIMIT = 24;
const TOAST_TIMEOUT = 3000;
const PLACEHOLDER = "/placeholder.svg";
const isTestEnv =
  import.meta.env.MODE === "test" ||
  import.meta.env.VITEST === true ||
  import.meta.env.VITEST === "true";

const RecentlyViewed = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const {
    activeCategory: categoryModeCategory,
    activeApp,
    hasSelection: hasCategoryMode,
    categories: categoryModeCategories,
  } = useCategoryMode();

  const seededHistory =
    isTestEnv &&
    typeof window !== "undefined" &&
    Array.isArray(window.__MHUB_TEST_RECENTLY_VIEWED__)
      ? window.__MHUB_TEST_RECENTLY_VIEWED__
      : null;
  const [items, setItems] = useState(() => seededHistory || []);
  const { translatedPosts } = useTranslatedPosts(items);
  const [loading, setLoading] = useState(() => !seededHistory);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [clearConfirmArmed, setClearConfirmArmed] = useState(false);
  const [sourceFilter, setSourceFilter] = useState("all");
  const [viewMode, setViewMode] = useState("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const requestIdRef = useRef(0);
  const toastTimerRef = useRef(null);
  const requestControllerRef = useRef(null);
  const cursorRef = useRef(null);
  const initialFetchRef = useRef(true);

  const currentUserId = useMemo(() => getUserId(user), [user]);
  const isUserAuthenticated = useMemo(
    () => isAuthenticated(user),
    [user],
  );
  const handleBack = useCallback(
    () => navigateBack(navigate),
    [navigate],
  );

  const logError = useCallback((msg, err) => {
    import.meta.env.DEV && console.error(msg, err);
  }, []);

  const getHistoryKey = useCallback(
    (item) => String(item?.post_id ?? item?.id ?? "").trim(),
    [],
  );

  const dedupeHistoryItems = useCallback((list) => {
    const seen = new Set();
    return (Array.isArray(list) ? list : []).filter((item) => {
      const key = getHistoryKey(item);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [getHistoryKey]);

  const getAuthInfo = useCallback(() => {
    const userId = getUserId(user);
    const token = getAccessToken();
    return { userId: userId ? String(userId) : "", token: token ? String(token) : "" };
  }, [user]);

  const fetchHistory = useCallback(
    async ({ reset = false } = {}) => {
      const currentRequestId = ++requestIdRef.current;
      requestControllerRef.current && requestControllerRef.current.abort();
      const controller = new AbortController();
      requestControllerRef.current = controller;
      try {
        if (reset) {
          setLoading(true);
          setCursor(null);
          cursorRef.current = null;
          setHasMore(false);
          setSelectedIds(new Set());
        } else {
          setIsLoadingMore(true);
        }
        setError(null);
        const { userId, token } = getAuthInfo();
        if (!userId || !token) {
          setError(t("please_login_history"));
          setLoading(false);
          return;
        }
        const params = {
          userId,
          limit: PAGE_LIMIT,
          sort: sortBy,
        };
        if (searchQuery) params.search = searchQuery;
        if (sourceFilter !== "all") params.source = sourceFilter;
        const cursorValue = cursorRef.current;
        if (!reset && cursorValue) params.cursor = cursorValue;
        const response = await api.get("/recently-viewed", {
          params,
          signal: controller.signal,
        });
        if (currentRequestId !== requestIdRef.current) return;
        const data = response?.data ?? response;
        const fetchedItems = Array.isArray(data?.items) ? data.items : [];
        const nextCursor = data?.nextCursor || null;
        setCursor(nextCursor);
        cursorRef.current = nextCursor;
        setHasMore(Boolean(data?.hasMore));
        setItems((prev) => {
          const next = reset ? fetchedItems : [...prev, ...fetchedItems];
          return dedupeHistoryItems(next);
        });
      } catch (err) {
        if (err?.name === "AbortError" || err?.code === "ERR_CANCELED") return;
        logError("Failed to fetch history:", err);
        const status = err?.status || err?.response?.status;
        setError(status === 401 ? "session_expired" : t("failed_load_history"));
      } finally {
        if (requestControllerRef.current === controller) {
          requestControllerRef.current = null;
        }
        if (currentRequestId === requestIdRef.current) {
          setLoading(false);
          setIsLoadingMore(false);
        }
      }
    },
    [
      dedupeHistoryItems,
      getAuthInfo,
      logError,
      searchQuery,
      sortBy,
      sourceFilter,
      t,
    ],
  );

  useEffect(() => {
    if (seededHistory) return;
    if (authLoading) return;
    const delay = initialFetchRef.current ? 0 : 250;
    initialFetchRef.current = false;
    const debounce = setTimeout(() => {
      fetchHistory({ reset: true });
    }, delay);
    return () => {
      clearTimeout(debounce);
      requestIdRef.current += 1;
    };
  }, [authLoading, fetchHistory, searchQuery, sortBy, sourceFilter, seededHistory]);

  const showToast = useCallback((message, type = "success") => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, TOAST_TIMEOUT);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
        toastTimerRef.current = null;
      }
      if (requestControllerRef.current) {
        requestControllerRef.current.abort();
        requestControllerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!clearConfirmArmed) return;
    const timer = setTimeout(() => {
      setClearConfirmArmed(false);
    }, 4000);
    return () => clearTimeout(timer);
  }, [clearConfirmArmed]);

  const removeItem = useCallback(
    async (postId) => {
      try {
        await api.delete(`/recently-viewed/${postId}`);
        setItems((prev) => prev.filter((item) => item.post_id !== postId));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(String(postId));
          return next;
        });
        showToast(t("removed_from_history"));
      } catch {
        showToast("Failed to remove", "error");
      }
    },
    [showToast, t],
  );

  const clearAll = useCallback(async () => {
    if (!clearConfirmArmed) {
      setClearConfirmArmed(true);
      showToast(
        t("clear_history_confirm_again") || "Tap Clear All again to confirm.",
        "error",
      );
      return;
    }
    try {
      await api.delete("/recently-viewed/clear");
      setItems([]);
      setSelectedIds(new Set());
      setClearConfirmArmed(false);
      showToast(t("history_cleared"));
    } catch {
      showToast("Failed to clear history", "error");
    }
  }, [clearConfirmArmed, showToast, t]);

  const toggleSelection = useCallback((postId) => {
    const key = String(postId);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const getImageUrl = (item) => {
    if (item.image_url) {
      return resolveMediaUrl(item.image_url, PLACEHOLDER);
    }
    if (item.images) {
      if (Array.isArray(item.images) && item.images.length > 0)
        return resolveMediaUrl(item.images[0], PLACEHOLDER);
      if (typeof item.images === "string")
        try {
          const parsed = JSON.parse(item.images);
          return Array.isArray(parsed)
            ? resolveMediaUrl(parsed[0], PLACEHOLDER)
            : resolveMediaUrl(item.images, PLACEHOLDER);
        } catch {
          return resolveMediaUrl(item.images, PLACEHOLDER);
        }
    }
    return PLACEHOLDER;
  };

  const formatTimeAgo = (dateStr) => {
    const date = new Date(dateStr);
    const diff = new Date() - date;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    return mins < 60 ? `${mins}m ago` : hours < 24 ? `${hours}h ago` : `${days}d ago`;
  };

  const formatExpiry = (timestamp) => {
    if (!timestamp) return null;
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return null;
    const diff = date - new Date();
    if (diff <= 0) return "Expired";
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    return mins < 60
      ? `Expires in ${mins}m`
      : hours < 24
        ? `Expires in ${hours}h`
        : `Expires in ${days}d`;
  };

  const formatPrice = (price) =>
    price
      ? new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
          maximumFractionDigits: 0,
        }).format(price)
      : "\u20B9 --";

  const normalizeSourceKey = useCallback((value) => {
    const normalized = String(value || "")
      .trim()
      .toLowerCase()
      .replace(/_/g, "-");
    if (!normalized) return "";
    if (normalized === "all-posts") return "allposts";
    if (normalized === "for-you" || normalized === "foryou") return "for-you";
    if (normalized === "myhome") return "my-home";
    if (normalized === "recently-viewed") return "recently-viewed";
    return normalized;
  }, []);

  const sourceMetaMap = useMemo(
    () => ({
      allposts: {
        label: t("all_posts") || "All Posts",
        icon: ShoppingBag,
        badgeClass:
          "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-500/20",
      },
      feed: {
        label: t("feed") || "Feed",
        icon: Newspaper,
        badgeClass:
          "bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-200/60 dark:border-purple-500/20",
      },
      "for-you": {
        label: t("for_you") || "For You",
        icon: Sparkles,
        badgeClass:
          "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-300 border border-blue-200/60 dark:border-blue-500/20",
      },
      wishlist: {
        label: t("wishlist") || "Wishlist",
        icon: Heart,
        badgeClass:
          "bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-300 border border-pink-200/60 dark:border-pink-500/20",
      },
      search: {
        label: t("search") || "Search",
        icon: Search,
        badgeClass:
          "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-500/20",
      },
      notifications: {
        label: t("notifications") || "Notifications",
        icon: Bell,
        badgeClass:
          "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-500/20",
      },
      "my-home": {
        label: t("my_home") || "My Home",
        icon: Home,
        badgeClass:
          "bg-slate-50 dark:bg-slate-500/10 text-slate-600 dark:text-slate-200 border border-slate-200/60 dark:border-slate-500/20",
      },
      "recently-viewed": {
        label: t("recently_viewed") || "Recently Viewed",
        icon: History,
        badgeClass:
          "bg-slate-50 dark:bg-slate-500/10 text-slate-600 dark:text-slate-200 border border-slate-200/60 dark:border-slate-500/20",
      },
    }),
    [t],
  );

  const sourceFilterTabs = useMemo(
    () => [
      {
        id: "all",
        label: t("all") || "All",
        icon: History,
        color: "from-blue-500 to-indigo-600",
      },
      {
        id: "allposts",
        label: t("all_posts") || "All Posts",
        icon: ShoppingBag,
        color: "from-emerald-500 to-teal-600",
      },
      {
        id: "feed",
        label: t("feed") || "Feed",
        icon: Newspaper,
        color: "from-purple-500 to-pink-600",
      },
      {
        id: "for-you",
        label: t("for_you") || "For You",
        icon: Sparkles,
        color: "from-sky-500 to-blue-600",
      },
      {
        id: "wishlist",
        label: t("wishlist") || "Wishlist",
        icon: Heart,
        color: "from-pink-500 to-rose-600",
      },
      {
        id: "search",
        label: t("search") || "Search",
        icon: Search,
        color: "from-amber-500 to-orange-600",
      },
      {
        id: "notifications",
        label: t("notifications") || "Notifications",
        icon: Bell,
        color: "from-indigo-500 to-blue-600",
      },
      {
        id: "my-home",
        label: t("my_home") || "My Home",
        icon: Home,
        color: "from-slate-500 to-slate-700",
      },
    ],
    [t],
  );

  const normalizeCategory = (val) =>
    String(val || "")
      .trim()
      .toLowerCase();

  const activeCategoryKey = normalizeCategory(categoryModeCategory?.name);

  const activeAppMatcher = useMemo(
    () => buildActiveAppMatcher(activeApp, categoryModeCategories),
    [activeApp, categoryModeCategories],
  );

  const rawDisplayItems = translatedPosts.filter((item) =>
    matchesCategoryModeItem(item, {
      activeCategory: hasCategoryMode ? categoryModeCategory : null,
      activeAppMatcher,
    }),
  );

  // Deduplicate by post_id — keep the most recent entry for each post
  const displayItems = useMemo(() => {
    const seen = new Set();
    return rawDisplayItems.filter((item) => {
      const pid = String(item.post_id ?? item.id ?? "");
      if (!pid || seen.has(pid)) return false;
      seen.add(pid);
      return true;
    });
  }, [rawDisplayItems]);

  const selectedCount = selectedIds.size;
  const allSelected = useMemo(() => {
    if (!displayItems.length) return false;
    return displayItems.every((item) =>
      selectedIds.has(String(item.post_id ?? item.id ?? "")),
    );
  }, [displayItems, selectedIds]);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (!displayItems.length) return prev;
      const shouldClear = displayItems.every((item) =>
        prev.has(String(item.post_id ?? item.id ?? "")),
      );
      if (shouldClear) return new Set();
      return new Set(displayItems.map((item) => String(item.post_id ?? item.id ?? "")));
    });
  }, [displayItems]);

  const removeSelected = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    const nextItems = items.filter(
      (item) => !selectedIds.has(String(item.post_id ?? item.id ?? "")),
    );
    setItems(nextItems);
    setSelectedIds(new Set());
    try {
      await api.delete("/recently-viewed/bulk", {
        data: { postIds: ids },
      });
      showToast(
        `${ids.length} ${t("removed_from_history") || "removed from history"}`,
      );
    } catch {
      showToast("Failed to remove", "error");
      setItems(items);
    }
  }, [items, selectedIds, showToast, t]);

  useEffect(() => {
    setSelectedIds((prev) => {
      if (!prev.size) return prev;
      const visible = new Set(
        displayItems.map((item) => String(item.post_id ?? item.id ?? "")),
      );
      const next = new Set(Array.from(prev).filter((id) => visible.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [displayItems]);

  const isFilteredEmpty =
    (Boolean(hasCategoryMode && activeCategoryKey) ||
      Boolean(activeAppMatcher?.activeApp)) &&
    translatedPosts.length > 0 &&
    displayItems.length === 0;

  // ─── Render ───────────────────────────────────────────────

  return (
    <div className="min-h-screen mhub-premium-page bg-gradient-to-b from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 mhub-page-pad-bottom dark:bg-gradient-to-b">
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateX(-50%) translateY(16px) scale(0.95); }
          to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
        }
        @keyframes toast-progress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
      {/* ── Page Header ── */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 profile-hero-bg" />
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fillRule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fillOpacity=\'0.1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          }}
        />
        <div className="relative max-w-6xl mx-auto px-4 py-5 sm:px-6 sm:py-6 page-shell page-pad">
          <div className="mb-3 max-w-3xl text-left dark:text-left mhub-hero-card min-h-[132px] sm:min-h-[150px] rounded-2xl px-4 py-4 sm:px-6 sm:py-5">
            <div className="flex flex-wrap items-center justify-between gap-4 min-h-[34px]">
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/20 px-3 py-1.5 text-xs font-semibold text-white shadow-[0_8px_18px_rgba(15,23,42,0.18)] hover:bg-white/30 transition"
                aria-label={t("back", { defaultValue: "Back" })}
              >
                <ArrowLeft className="w-4 h-4" />
                {t("back", { defaultValue: "Back" })}
              </button>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex bg-white/15 backdrop-blur-sm rounded-full p-0.5 border border-white/20 gap-0.5 dark:bg-slate-900/15 dark:border dark:border-white/20">
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    aria-pressed={viewMode === "grid"}
                    aria-label={t("grid_view") || "Grid view"}
                    className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full transition-all duration-300 ${
                      viewMode === "grid"
                        ? "bg-white dark:bg-white/95 text-slate-900 shadow-md shadow-black/15"
                        : "text-white/60 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    aria-pressed={viewMode === "list"}
                    aria-label={t("list_view") || "List view"}
                    className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full transition-all duration-300 ${
                      viewMode === "list"
                        ? "bg-white dark:bg-white/95 text-slate-900 shadow-md shadow-black/15"
                        : "text-white/60 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={fetchHistory}
                  disabled={loading}
                  className="inline-flex items-center justify-center rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/85 shadow-[0_8px_18px_rgba(15,23,42,0.15)] hover:bg-white/20 transition disabled:opacity-70"
                  aria-label={t("refresh") || "Refresh"}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                </button>

                {translatedPosts.length > 0 && (
                  <button
                    type="button"
                    onClick={clearAll}
                    title={
                      clearConfirmArmed
                        ? "Confirm clear history"
                        : "Clear history"
                    }
                    className={
                      clearConfirmArmed
                        ? "inline-flex items-center gap-1.5 rounded-full bg-red-500 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-red-500/30 transition-all duration-300 animate-pulse ring-2 ring-red-400/50 ring-offset-1 ring-offset-transparent"
                        : "inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/85 hover:bg-white/20 transition"
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {clearConfirmArmed
                      ? t("confirm_clear_all") || "Confirm Clear"
                      : t("clear_all") || "Clear All"}
                  </button>
                )}
              </div>
            </div>
            <div className="mt-3">
              <p className="text-[clamp(9px,0.95vw,11px)] font-semibold uppercase tracking-[0.2em] text-white/70 mb-1 dark:text-white/70">
                {t("recently_viewed_label") || "Browsing history"}
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center dark:bg-slate-900/15">
                  <History className="w-5 h-5 text-white dark:text-white" />
                </div>
                <h1 className="text-[clamp(20px,2.1vw,28px)] leading-[1.1] font-bold text-white dark:text-white">
                  {t("recently_viewed") || "Recently Viewed"}
                </h1>
              </div>
              <p className="text-[clamp(12px,1.3vw,16px)] leading-[1.5] text-white/80 mt-1 dark:text-white/80">
                {t("recently_viewed_subtitle") ||
                  "Pick up where you left off and compare items."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Category Mode Banner ── */}
      {hasCategoryMode && categoryModeCategory?.name && (
        <div className="max-w-6xl mx-auto px-4 pt-3 page-shell page-pad">
          <div className="rounded-2xl border border-blue-200/60 dark:border-blue-800/30 bg-blue-50/50 dark:bg-blue-950/20 backdrop-blur-sm p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 dark:border dark:border-blue-600/60 dark:bg-blue-950/50">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white dark:text-slate-100">
                Category mode: {categoryModeCategory.name}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 dark:text-slate-300">
                Recently viewed is filtered to this marketplace.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="border-blue-200 dark:border-blue-800/50 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors duration-200 dark:border-blue-600/40 dark:text-blue-300 dark:hover:bg-blue-950/20"
              onClick={() => navigate("/category-mode")}
            >
              Switch category
            </Button>
          </div>
        </div>
      )}

      {/* ── Source Filter Tabs — segmented control ── */}
      <div className="max-w-6xl mx-auto px-4 py-3 page-shell page-pad">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide bg-gray-100/90 dark:bg-white/[0.06] rounded-xl p-1 dark:bg-gray-950/90">
          {sourceFilterTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = sourceFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSourceFilter(tab.id)}
                className={`relative flex items-center justify-center gap-1.5 min-h-[36px] py-2 px-3 rounded-lg font-semibold text-[12px] whitespace-nowrap transition-all duration-300 ease-out flex-shrink-0 ${
                  isActive
                    ? "bg-white dark:bg-white/[0.12] text-gray-900 dark:text-white shadow-sm shadow-black/5"
                    : "text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300 hover:bg-white/50 dark:hover:bg-white/[0.04]"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 transition-colors duration-300 ${isActive ? "text-blue-600 dark:text-blue-400" : ""}`} />
                <span>{tab.label}</span>
                {isActive && displayItems.length > 0 && (
                  <span className="ml-0.5 min-w-[20px] px-1.5 py-0.5 rounded-md text-[11px] font-bold tabular-nums bg-gray-800 dark:bg-white text-white dark:text-gray-900 dark:bg-gray-700 dark:text-white">
                    {displayItems.length}
                  </span>
                )}
                {isActive && (
                  <span className={`absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-gradient-to-r ${tab.color}`} />
                )}
              </button>
            );
          })}
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 pb-2 page-shell page-pad">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-1 flex-col sm:flex-row gap-2">
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t("search_history") || "Search history"}
              className="h-10 w-full sm:flex-1 rounded-xl border border-gray-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 px-3 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              className="h-10 rounded-xl border border-gray-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 px-3 text-sm text-gray-700 dark:text-gray-200"
            >
              <option value="recent">{t("sort_recent") || "Most recent"}</option>
              <option value="oldest">{t("sort_oldest") || "Oldest first"}</option>
              <option value="price_low">{t("sort_price_low") || "Price: Low to High"}</option>
              <option value="price_high">{t("sort_price_high") || "Price: High to Low"}</option>
              <option value="most_viewed">{t("sort_most_viewed") || "Most viewed"}</option>
            </select>
          </div>
          {displayItems.length > 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={toggleSelectAll}
              className="h-10 rounded-xl border-gray-200 dark:border-white/10 text-xs font-semibold"
            >
              {allSelected
                  ? t("clear_selection") || "Clear selection"
                  : t("select_all") || "Select all"}
              {selectedCount > 0 && (
                <span className="ml-1 text-[10px] text-gray-500 dark:text-gray-400">
                  ({selectedCount})
                </span>
              )}
            </Button>
          )}
        </div>

        {selectedCount > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-gray-500 dark:text-gray-300">
              {selectedCount} {t("selected") || "selected"}
            </span>
            <Button
              type="button"
              onClick={removeSelected}
              className="h-9 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              {t("remove_selected") || "Remove selected"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-9 rounded-xl text-xs"
              onClick={() => setSelectedIds(new Set())}
            >
              {t("clear") || "Clear"}
            </Button>
          </div>
        )}
      </div>

      {/* ── Main Content ── */}
      <div className="max-w-6xl mx-auto px-4 pb-32 page-shell page-pad">
        {/* Loading — skeleton cards */}
        {loading ? (
          <div
            className={
              viewMode === "grid"
                  ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5"
                  : "flex flex-col gap-4"
              }
            >
            {Array.from({ length: 6 }).map((_, i) => {
              if (viewMode === "grid") {
                return (
                  <div
                    key={i}
                    className="rounded-2xl border border-gray-200/60 dark:border-white/5 bg-white dark:bg-white/5 overflow-hidden dark:border dark:border-gray-700/60 dark:bg-slate-900"
                  >
                    <div className="aspect-[4/3] bg-gray-200 dark:bg-white/10 animate-pulse dark:bg-gray-900" />
                    <div className="p-4 space-y-3">
                      <div className="h-4 w-16 rounded-lg bg-gray-200 dark:bg-white/10 animate-pulse dark:bg-gray-900" />
                      <div className="h-5 w-3/4 rounded-lg bg-gray-200 dark:bg-white/10 animate-pulse dark:bg-gray-900" />
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-gray-200 dark:bg-white/10 animate-pulse dark:bg-gray-900" />
                        <div className="h-3 w-20 rounded-lg bg-gray-200 dark:bg-white/10 animate-pulse dark:bg-gray-900" />
                      </div>
                      <div className="flex justify-between">
                        <div className="h-3 w-24 rounded-lg bg-gray-100 dark:bg-white/5 animate-pulse dark:bg-gray-950" />
                        <div className="h-3 w-16 rounded-lg bg-gray-100 dark:bg-white/5 animate-pulse dark:bg-gray-950" />
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={i}
                  className="rounded-2xl border border-gray-200/60 dark:border-white/5 bg-white dark:bg-white/5 p-4 flex gap-4 dark:border dark:border-gray-700/60 dark:bg-slate-900"
                >
                  <div className="w-32 h-24 rounded-xl bg-gray-200 dark:bg-white/10 animate-pulse flex-shrink-0 dark:bg-gray-900" />
                  <div className="flex-1 space-y-2.5">
                    <div className="h-4 w-16 rounded-lg bg-gray-200 dark:bg-white/10 animate-pulse dark:bg-gray-900" />
                    <div className="h-5 w-2/3 rounded-lg bg-gray-200 dark:bg-white/10 animate-pulse dark:bg-gray-900" />
                    <div className="h-6 w-24 rounded-lg bg-gray-100 dark:bg-white/5 animate-pulse dark:bg-gray-950" />
                    <div className="h-3 w-40 rounded-lg bg-gray-100 dark:bg-white/5 animate-pulse dark:bg-gray-950" />
                  </div>
                </div>
              );
            })}
          </div>
        ) : error ? (
          /* ── Error / Session Expired — premium redesign ── */
          <div className="text-center py-16 dark:text-center">
            {error === "session_expired" || !isUserAuthenticated ? (
              <div className="max-w-sm mx-auto">
                <div className="relative w-28 h-28 mx-auto mb-8">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-500/10 dark:to-orange-500/10 rounded-full blur-xl opacity-60 dark:bg-gradient-to-br" />
                  <div className="absolute inset-3 rounded-full bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/5 dark:to-orange-500/5 border border-amber-100/50 dark:border-amber-500/10 dark:bg-gradient-to-br dark:border dark:border-amber-600/50" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-xl shadow-amber-500/30 rotate-6 dark:bg-gradient-to-br">
                      <Lock className="h-6 w-6 text-white -rotate-6 dark:text-white" />
                    </div>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 dark:text-gray-100">
                  {t("session_expired") || "Session Expired"}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-8 text-[13px] leading-relaxed max-w-[260px] mx-auto dark:text-gray-300">
                  {t("login_to_view_history") ||
                    "Please login to view your browsing history."}
                </p>
                <Button
                  onClick={() =>
                    navigate("/login", {
                      state: { returnTo: "/recently-viewed" },
                    })
                  }
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl px-8 h-11 font-semibold shadow-xl shadow-amber-500/20 transition-all duration-300 hover:-translate-y-0.5 dark:bg-gradient-to-r dark:text-white"
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  {t("login_now") || "Login Now"}
                </Button>
              </div>
            ) : (
              <div className="max-w-sm mx-auto">
                <div className="relative w-28 h-28 mx-auto mb-8">
                  <div className="absolute inset-0 bg-gradient-to-br from-red-100 to-rose-100 dark:from-red-500/10 dark:to-rose-500/10 rounded-full blur-xl opacity-60 dark:bg-gradient-to-br" />
                  <div className="absolute inset-3 rounded-full bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-500/5 dark:to-rose-500/5 border border-red-100/50 dark:border-red-500/10 dark:bg-gradient-to-br dark:border dark:border-red-600/50" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-14 h-14 bg-gradient-to-br from-red-400 to-rose-500 rounded-2xl flex items-center justify-center shadow-xl shadow-red-500/30 dark:bg-gradient-to-br">
                      <XCircle className="h-7 w-7 text-white dark:text-white" />
                    </div>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 dark:text-gray-100">
                  {t("something_went_wrong")}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-8 text-[13px] leading-relaxed dark:text-gray-300">
                  {t("try_again_later") || "Check your connection and try again"}
                </p>
                <Button
                  onClick={fetchHistory}
                  className="bg-gradient-to-r from-gray-800 to-gray-900 dark:from-white dark:to-gray-100 dark:text-gray-900 hover:from-gray-900 hover:to-black text-white rounded-xl px-8 h-11 font-semibold shadow-xl shadow-gray-900/15 transition-all duration-300 hover:-translate-y-0.5 dark:bg-gradient-to-r dark:text-white"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {t("try_again")}
                </Button>
              </div>
            )}
          </div>
        ) : displayItems.length === 0 ? (
          /* ── Empty State — premium redesign ── */
          <div className="text-center py-16 dark:text-center">
            <div className="relative w-32 h-32 mx-auto mb-8">
              {/* Ambient glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-slate-200 dark:from-slate-500/20 dark:to-gray-500/20 rounded-full blur-2xl opacity-50 dark:bg-gradient-to-br" />
              {/* Rotating ring */}
              <div className="absolute inset-0 rounded-full border-2 border-dashed border-gray-200 dark:border-gray-700 animate-[spin_25s_linear_infinite] dark:border-2 dark:border-dashed" />
              {/* Inner circle */}
              <div className="absolute inset-4 rounded-full bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-800 dark:to-slate-800 border border-gray-100/50 dark:border-gray-700/50 dark:bg-gradient-to-br dark:border" />
              {/* Icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-14 h-14 bg-gradient-to-br from-gray-700 to-slate-800 dark:from-slate-200 dark:to-white rounded-2xl flex items-center justify-center shadow-xl shadow-gray-900/20 dark:shadow-white/10 -rotate-6 dark:bg-gradient-to-br">
                  <History className="h-7 w-7 text-white dark:text-gray-900 rotate-6 dark:text-white" />
                </div>
              </div>
              {/* Decorative */}
              <div className="absolute -top-1 right-6 w-2.5 h-2.5 bg-blue-400 rounded-full opacity-60 dark:bg-blue-800/30" />
              <div className="absolute bottom-4 -left-1 w-2 h-2 bg-indigo-400 rounded-full opacity-40 dark:bg-indigo-800/30" />
            </div>

            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 dark:text-gray-100">
              {isFilteredEmpty
                  ? `No ${categoryModeCategory?.name || "category"} items viewed yet`
                  : t("no_browsing_history")}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-[280px] mx-auto text-[13px] leading-relaxed dark:text-gray-300">
              {isFilteredEmpty
                  ? "Switch category or view items in this marketplace."
                  : t("posts_you_view_appear")}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 max-w-xs mx-auto">
              <Button
                onClick={() => navigate("/all-posts")}
                className="w-full sm:w-auto bg-gradient-to-r from-gray-800 to-gray-900 dark:from-white dark:to-gray-100 dark:text-gray-900 hover:from-gray-900 hover:to-black text-white rounded-xl px-6 h-11 font-semibold shadow-xl shadow-gray-900/15 dark:shadow-white/10 transition-all duration-300 hover:-translate-y-0.5 dark:bg-gradient-to-r dark:text-white"
              >
                <ShoppingBag className="h-4 w-4 mr-2" />
                {t("browse_posts")}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto rounded-xl px-5 h-11 border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-all duration-200 font-medium dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-950"
                onClick={() => navigate("/for-you")}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                For You
              </Button>
            </div>
          </div>
        ) : (
          /* ── Items Grid / List ── */
          <div className="space-y-6">
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5"
                  : "flex flex-col gap-3"
              }
            >
            {displayItems.map((item) => {
              const itemId = String(item.post_id ?? item.id ?? "");
              const isSelected = selectedIds.has(itemId);
              const expiryLabel = formatExpiry(item.expires_at);
              const priceDropLabel =
                item.price_drop && Number.isFinite(item.price_delta)
                  ? formatPrice(Math.abs(item.price_delta))
                  : null;
              const sourceKey = normalizeSourceKey(item.source);
              const sourceMeta = sourceKey ? sourceMetaMap[sourceKey] : null;
              const statusValue = String(item.status || "").toLowerCase();
              const isSold =
                statusValue === "sold" ||
                statusValue === "completed" ||
                statusValue === "closed";
              const isActiveStatus = statusValue === "active";
              const statusLabel = statusValue
                ? `${statusValue.charAt(0).toUpperCase()}${statusValue.slice(1)}`
                : "Active";
              const displayStatusLabel = isSold
                ? t("sold") || "Sold"
                : statusLabel;
              return viewMode === "grid" ? (
                /* ── Grid Card ── */
                <Card
                  key={itemId}
                  className={`group bg-white dark:bg-white/[0.04] backdrop-blur-sm border border-gray-100 dark:border-white/[0.06] overflow-hidden cursor-pointer hover:border-blue-200/60 dark:hover:border-blue-500/20 shadow-md shadow-gray-200/30 dark:shadow-none hover:shadow-xl hover:shadow-blue-500/[0.08] transition-all duration-300 rounded-2xl hover:-translate-y-0.5 dark:bg-slate-900 dark:border dark:border-gray-700 dark:hover:border-blue-600/60 ${isSelected ? "ring-2 ring-blue-400/50 dark:ring-blue-500/40" : ""} ${isSold ? "border-red-200/70 dark:border-red-500/30 bg-red-50/40 dark:bg-red-950/10" : ""}`}
                  onClick={() =>
                    navigate(`/post/${item.post_id}`, {
                      state: {
                        source: "recently-viewed",
                        returnTo: "/recently-viewed",
                      },
                    })
                  }
                >
                  {/* Image area */}
                  <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300 dark:from-gray-800 dark:via-gray-700 dark:to-gray-600 dark:bg-gradient-to-br">
                    <img
                      src={getImageUrl(item)}
                      alt={item.title}
                      className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out ${isSold ? "grayscale" : ""}`}
                      onError={(e) => {
                        e.target.style.display = "none";
                        const placeholder = e.target.parentElement.querySelector(".img-placeholder");
                        if (placeholder) placeholder.style.display = "flex";
                      }}
                    />
                    <div className="img-placeholder hidden absolute inset-0 bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300 dark:from-gray-800 dark:via-gray-700 dark:to-gray-600 items-center justify-center dark:bg-gradient-to-br">
                      <ShoppingBag className="h-10 w-10 text-gray-400 dark:text-gray-500 dark:text-gray-300" />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent dark:bg-gradient-to-t" />

                    {/* Status badge */}
                    <Badge
                      className={`absolute top-3 right-3 px-2.5 py-0.5 text-[11px] font-semibold rounded-full border-0 shadow-sm ${
                        isActiveStatus
                          ? "bg-emerald-500 text-white"
                          : isSold
                            ? "bg-red-500 text-white"
                            : "bg-gray-500 text-white"
                      }`}
                    >
                      {displayStatusLabel}
                    </Badge>

                    <button
                      type="button"
                      aria-pressed={isSelected}
                      aria-label={isSelected ? "Deselect item" : "Select item"}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelection(itemId);
                      }}
                      className={`absolute top-12 right-3 w-8 h-8 rounded-full backdrop-blur-md border transition-all duration-200 flex items-center justify-center ${
                        isSelected
                          ? "bg-blue-500 text-white border-blue-400 shadow-md shadow-blue-500/30"
                          : "bg-white/20 text-white/80 border-white/40 hover:bg-white/30"
                      }`}
                    >
                      <Check className={`h-3.5 w-3.5 ${isSelected ? "opacity-100" : "opacity-40"}`} />
                    </button>

                    {/* SOLD overlay */}
                    {isSold && (
                      <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px] flex items-center justify-center dark:bg-black/45">
                        <div className="flex flex-col items-center gap-1">
                          <div className="bg-red-500 text-white text-lg font-bold tracking-wider px-8 py-2 rounded-2xl shadow-xl dark:bg-red-800/40 dark:text-white">
                            {(t("sold") || "Sold").toUpperCase()}
                          </div>
                          <span className="text-[11px] text-white/80">
                            {t("sold_out_hint") || "No longer available"}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* View count */}
                    <div className="absolute top-3 left-3 bg-black/30 backdrop-blur-md text-white/90 px-2.5 py-1 rounded-full text-[11px] font-medium flex items-center gap-1.5 dark:bg-black/30 dark:text-white/90">
                      <Eye className="h-3 w-3" />
                      {item.view_count || 1}
                      {t("x_viewed")}
                    </div>

                    {priceDropLabel && (
                      <Badge className="absolute top-12 left-3 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-500/90 text-white shadow-sm">
                        {t("price_drop") || "Price drop"} {priceDropLabel}
                      </Badge>
                    )}

                    {/* Price */}
                    <div className="absolute bottom-3 left-3">
                      <p
                        className={`text-lg font-bold text-white drop-shadow-lg tracking-tight bg-black/20 backdrop-blur-sm px-2.5 py-0.5 rounded-lg dark:text-white dark:bg-black/20 ${
                          isSold ? "line-through text-white/70" : ""
                        }`}
                      >
                        {formatPrice(item.price)}
                      </p>
                    </div>

                    {/* Remove button */}
                    <button
                      type="button"
                      aria-label={`Remove ${item.title} from history`}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeItem(item.post_id);
                      }}
                      className="absolute bottom-3 right-3 p-2 bg-black/30 backdrop-blur-md rounded-full text-white/70 hover:text-red-400 hover:bg-red-500/20 transition-all duration-200 sm:opacity-0 sm:group-hover:opacity-100 dark:bg-black/30 dark:text-white/70 dark:hover:text-red-200 dark:hover:bg-red-800/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Card body */}
                  <div className="p-3 sm:p-4">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5 sm:mb-2">
                      {item.category_name && (
                        <Badge className="bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-300 border border-blue-200/60 dark:border-blue-500/20 text-[10px] sm:text-[11px] font-medium px-1.5 sm:px-2 py-0.5 rounded-lg dark:bg-blue-950/20 dark:border dark:border-blue-600/60">
                          {item.category_name}
                        </Badge>
                      )}
                      {sourceMeta && (
                        <span
                          className={`inline-flex items-center gap-1.5 px-1.5 sm:px-2 py-0.5 rounded-lg text-[10px] font-semibold ${sourceMeta.badgeClass}`}
                        >
                          <sourceMeta.icon className="h-3 w-3" />
                          {sourceMeta.label}
                        </span>
                      )}
                    </div>
                    <h3
                      className={`text-gray-900 dark:text-white font-semibold text-[13px] sm:text-base truncate mb-1.5 sm:mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200 dark:text-gray-100 dark:group-hover:text-blue-300 ${
                        isSold ? "line-through text-gray-400 dark:text-gray-500" : ""
                      }`}
                    >
                      {item.title}
                    </h3>

                    {item.seller_name && (
                      <div className="flex items-center gap-2 mb-2 sm:mb-3">
                        <Avatar className="h-5 w-5 bg-gradient-to-br from-violet-500 to-fuchsia-500 ring-2 ring-white dark:ring-gray-900 dark:bg-gradient-to-br">
                          <AvatarFallback className="text-white text-[10px] font-bold dark:text-white">
                            {item.seller_name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-gray-500 dark:text-gray-400 truncate font-medium dark:text-gray-300">
                          {item.seller_name}
                        </span>
                      </div>
                    )}
                    <SellerTrustBadges
                      className="mb-2"
                      size="xs"
                      sellerId={item.seller_id || item.user_id || item.user?.id || null}
                      trust={item.trust || item.user?.trust || null}
                      riskState={item.risk_state || item.user?.risk_state || null}
                      underReview={item.under_review ?? item.user?.under_review ?? null}
                    />

                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-2 border-t border-gray-100 dark:border-white/5 dark:border-t dark:border-gray-700">
                      <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400 dark:text-gray-300">
                        <MapPin className="h-3 w-3" />
                        {item.location || t("unknown")}
                      </span>
                      <span className="flex items-center gap-1 text-gray-400 dark:text-gray-500 tabular-nums dark:text-gray-300" title={new Date(item.viewed_at).toLocaleString()}>
                        <Clock className="h-3 w-3" />
                        {formatTimeAgo(item.viewed_at)}
                      </span>
                      {expiryLabel && (
                        <span className="flex items-center gap-1 text-amber-500 dark:text-amber-300 text-[11px]">
                          <Clock className="h-3 w-3" />
                          {expiryLabel}
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              ) : (
                /* ── List Card ── */
                <Card
                  key={itemId}
                  className={`group bg-white/80 dark:bg-white/5 backdrop-blur-sm border border-gray-200/60 dark:border-white/[0.08] overflow-hidden cursor-pointer hover:border-gray-300 dark:hover:border-white/[0.15] hover:bg-white dark:hover:bg-white/[0.08] hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 rounded-2xl dark:bg-slate-900/80 dark:border dark:border-gray-700/60 dark:hover:border-gray-600 dark:hover:bg-slate-900 ${isSelected ? "ring-2 ring-blue-400/50 dark:ring-blue-500/40" : ""} ${isSold ? "border-red-200/70 dark:border-red-500/30 bg-red-50/30 dark:bg-red-950/10" : ""}`}
                  onClick={() =>
                    navigate(`/post/${item.post_id}`, {
                      state: {
                        source: "recently-viewed",
                        returnTo: "/recently-viewed",
                      },
                    })
                  }
                >
                  <div className="flex gap-4 p-3">
                    {/* Thumbnail */}
                    <div className="relative w-28 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300 dark:from-gray-800 dark:via-gray-700 dark:to-gray-600 dark:bg-gradient-to-br">
                      <img
                        src={getImageUrl(item)}
                        alt={item.title}
                        className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${isSold ? "grayscale" : ""}`}
                        onError={(e) => {
                          e.target.style.display = "none";
                          const placeholder = e.target.parentElement.querySelector(".img-placeholder");
                          if (placeholder) placeholder.style.display = "flex";
                        }}
                      />
                      <div className="img-placeholder hidden absolute inset-0 bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300 dark:from-gray-800 dark:via-gray-700 dark:to-gray-600 items-center justify-center dark:bg-gradient-to-br">
                        <ShoppingBag className="h-6 w-6 text-gray-400 dark:text-gray-500 dark:text-gray-300" />
                      </div>
                      <Badge
                        className={`absolute top-1.5 right-1.5 px-1.5 py-0 text-[9px] font-semibold rounded-full border-0 ${
                          isActiveStatus
                            ? "bg-emerald-500 text-white"
                            : isSold
                              ? "bg-red-500 text-white"
                              : "bg-gray-500 text-white"
                        }`}
                      >
                        {displayStatusLabel}
                      </Badge>

                      {isSold && (
                        <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px] flex items-center justify-center">
                          <span className="bg-red-500 text-white text-[10px] font-bold tracking-wider px-3 py-1 rounded-full shadow-sm">
                            {(t("sold") || "Sold").toUpperCase()}
                          </span>
                        </div>
                      )}

                      <button
                        type="button"
                        aria-pressed={isSelected}
                        aria-label={isSelected ? "Deselect item" : "Select item"}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelection(itemId);
                        }}
                        className={`absolute top-1.5 left-1.5 w-6 h-6 rounded-full backdrop-blur-md border transition-all duration-200 flex items-center justify-center ${
                          isSelected
                            ? "bg-blue-500 text-white border-blue-400 shadow-sm"
                            : "bg-white/20 text-white/80 border-white/40"
                        }`}
                      >
                        <Check className={`h-3 w-3 ${isSelected ? "opacity-100" : "opacity-40"}`} />
                      </button>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 py-0.5">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        {item.category_name && (
                          <Badge className="bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200/60 dark:border-blue-500/20 text-[10px] font-medium px-1.5 py-0 rounded-md dark:bg-blue-950/20 dark:text-blue-300 dark:border dark:border-blue-600/60">
                            {item.category_name}
                          </Badge>
                        )}
                        {sourceMeta && (
                          <span
                            className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-semibold ${sourceMeta.badgeClass}`}
                          >
                            <sourceMeta.icon className="h-3 w-3" />
                            {sourceMeta.label}
                          </span>
                        )}
                      </div>
                      <h3
                        className={`text-gray-900 dark:text-white font-semibold text-sm truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200 dark:text-gray-100 dark:group-hover:text-blue-300 ${
                          isSold ? "line-through text-gray-400 dark:text-gray-500" : ""
                        }`}
                      >
                        {item.title}
                      </h3>
                      <p
                        className={`text-lg font-bold mt-0.5 tracking-tight ${
                          isSold
                            ? "text-gray-400 dark:text-gray-500 line-through"
                            : "text-emerald-600 dark:text-emerald-400 dark:text-emerald-300"
                        }`}
                      >
                        {formatPrice(item.price)}
                      </p>
                      {priceDropLabel && (
                        <Badge className="mt-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-500/20 text-[9px] px-2 py-0.5 rounded-full">
                          {t("price_drop") || "Price drop"} {priceDropLabel}
                        </Badge>
                      )}
                      <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[11px] text-gray-500 dark:text-gray-400 dark:text-gray-300">
                        {item.seller_name && (
                          <span className="flex items-center gap-1">
                            <Avatar className="h-3.5 w-3.5 bg-gradient-to-br from-violet-500 to-fuchsia-500 dark:bg-gradient-to-br">
                              <AvatarFallback className="text-white text-[7px] font-bold dark:text-white">
                                {item.seller_name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            {item.seller_name}
                          </span>
                        )}
                        <SellerTrustBadges
                          size="xs"
                          sellerId={item.seller_id || item.user_id || item.user?.id || null}
                          trust={item.trust || item.user?.trust || null}
                          riskState={item.risk_state || item.user?.risk_state || null}
                          underReview={item.under_review ?? item.user?.under_review ?? null}
                        />
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {item.location || t("unknown")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {t("viewed")} {item.view_count}x
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTimeAgo(item.viewed_at)}
                        </span>
                        {expiryLabel && (
                          <span className="flex items-center gap-1 text-amber-500 dark:text-amber-300">
                            <Clock className="h-3 w-3" />
                            {expiryLabel}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Remove */}
                    <div className="flex flex-col justify-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeItem(item.post_id);
                        }}
                        className="h-8 w-8 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors duration-200 dark:text-gray-300 dark:hover:text-red-300 dark:hover:bg-red-950/20"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
          {hasMore && (
            <div className="flex justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => fetchHistory()}
                disabled={isLoadingMore}
                className="h-11 px-6 rounded-xl text-sm font-semibold border-gray-200 dark:border-white/10"
              >
                {isLoadingMore ? (t("loading") || "Loading...") : (t("load_more") || "Load more")}
              </Button>
            </div>
          )}
        </div>
        )}
      </div>

      {/* ── Toast Notification ── */}
      {toast && (
        <div
          className={`fixed bottom-24 left-1/2 -translate-x-1/2 px-5 py-3 rounded-2xl shadow-2xl z-50 flex items-center gap-2.5 backdrop-blur-xl border text-sm font-medium animate-[toast-in_0.35s_ease-out] ${
            toast.type === "error"
              ? "bg-red-500/90 dark:bg-red-600/90 border-red-400/30 dark:border-red-500/30 text-white shadow-red-500/25"
              : "bg-emerald-500/90 dark:bg-emerald-600/90 border-emerald-400/30 dark:border-emerald-500/30 text-white shadow-emerald-500/25"
          }`}
          style={{
            animation: "toast-in 0.35s ease-out",
          }}
        >
          {toast.type === "error" ? (
            <XCircle className="h-4 w-4 flex-shrink-0" />
          ) : (
            <Sparkles className="h-4 w-4 flex-shrink-0" />
          )}
          {toast.message}
          {/* Auto-dismiss progress bar */}
          <div className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full overflow-hidden bg-white/20 dark:bg-slate-900/20">
            <div
              className="h-full bg-white/60 rounded-full dark:bg-slate-900/60"
              style={{
                animation: `toast-progress ${TOAST_TIMEOUT}ms linear forwards`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default RecentlyViewed;

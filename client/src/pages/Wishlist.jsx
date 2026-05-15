import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ToastAction } from "@/components/ui/toast";
import {
  Heart,
  Trash2,
  Star,
  Image as ImageIcon,
  MapPin,
  ShoppingBag,
  ExternalLink,
  RefreshCw,
  Compass,
  ShoppingCart as CartIcon,
  LayoutGrid,
  List,
  Share2,
  Check,
  ArrowLeft,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useTranslation } from "react-i18next";
import { useTranslatedPosts } from "@/hooks/useTranslatedContent";
import { useToast } from "@/hooks/use-toast";
import {
  beginSavedPostMutation,
  endSavedPostMutation,
  extractSavedPostIds,
  replaceSavedPostIds,
  setSavedPostStatus,
  subscribeSavedPosts,
} from "@/utils/savedPosts";
import { useAuth } from "@/context/AuthContext";
import { useCategoryMode } from "@/context/CategoryModeContext";
import { getUserId, isAuthenticated } from "@/utils/authStorage";
import { getApiOriginBase } from "@/lib/networkConfig";
import {
  buildActiveAppMatcher,
  matchesCategoryModeItem,
} from "@/utils/categoryModeFilters";
import { navigateBack } from "@/utils/navigation";
import PageDensityToggle from "@/components/ui/PageDensityToggle";
import { usePageDensity } from "@/hooks/usePageDensity";
import { shareContent } from "@/services/nativeShareService";

/* ─── helpers ─── */

const getWishlistItemKey = (item) =>
  String(item?.post_id ?? item?.id ?? item?.postId ?? "").trim();

const dedupeWishlistItems = (items) => {
  const seen = new Set();
  return (Array.isArray(items) ? items : []).filter((item) => {
    const key = getWishlistItemKey(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const getWishlistNotesText = (value) => {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed === "string") return parsed.trim();
    if (parsed && typeof parsed === "object") {
      const candidate = parsed.note || parsed.notes || parsed.text || "";
      return typeof candidate === "string" ? candidate.trim() : "";
    }
  } catch {
    return trimmed;
  }
  return trimmed;
};

const PAGE_LIMIT = 24;

/* ─── component ─── */

const Wishlist = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const { addItem: addToCart, isInCart } = useCart();
  const { density, setDensity } = usePageDensity("mhub_wishlist_density");
  const densityClass = density === "compact" ? "mhub-compact" : "";
  const {
    activeCategory: categoryModeCategory,
    activeApp,
    hasSelection: hasCategoryMode,
    categories: categoryModeCategories,
  } = useCategoryMode();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("saved_desc");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState("grid");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);

  const fetchIdRef = useRef(0);
  const cursorRef = useRef(null);
  const savedIdsRef = useRef(new Set());
  const syncingRef = useRef(0);

  const isAuth = isAuthenticated(user);
  const userId = getUserId(user);
  const handleBack = useCallback(
    () => navigateBack(navigate),
    [navigate],
  );

  const { translatedPosts, isTranslating } = useTranslatedPosts(items);

  /* ─── fetch wishlist ─── */

  const fetchWishlist = useCallback(
    async ({ reset = false } = {}) => {
      const currentId = ++fetchIdRef.current;
      if (reset) {
        setLoading(true);
        setCursor(null);
        cursorRef.current = null;
        setHasMore(false);
        setSelectedIds(new Set());
      } else {
        setIsLoadingMore(true);
      }
      syncingRef.current += 1;
      try {
        const params = {
          userId,
          limit: PAGE_LIMIT,
          sort: sortBy,
        };
        if (searchQuery) params.search = searchQuery;
        if (statusFilter !== "all") params.status = statusFilter;
        if (hasCategoryMode && categoryModeCategory?.category_id) {
          params.category_id = categoryModeCategory.category_id;
        }
        const cursorValue = cursorRef.current;
        if (!reset && cursorValue) {
          params.cursor = cursorValue;
        }
        const res = await api.get("/wishlist", { params });
        if (currentId !== fetchIdRef.current) return;
        const data = res?.data ?? res;
        const list = Array.isArray(data?.items) ? data.items : [];
        const nextCursor = data?.nextCursor || null;
        setCursor(nextCursor);
        cursorRef.current = nextCursor;
        setHasMore(Boolean(data?.hasMore));
        setItems((prev) => {
          const next = reset ? list : [...prev, ...list];
          const deduped = dedupeWishlistItems(next);
          const ids = extractSavedPostIds(deduped);
          savedIdsRef.current = new Set(ids);
          replaceSavedPostIds(ids);
          return deduped;
        });
        setError(null);
      } catch (err) {
        if (import.meta.env.DEV) console.error("Failed to fetch wishlist:", err);
        if (currentId === fetchIdRef.current) {
          setError(t("failed_load_wishlist"));
          if (reset) setItems([]);
        }
      } finally {
        if (currentId === fetchIdRef.current) {
          setLoading(false);
          setIsLoadingMore(false);
        }
        syncingRef.current = Math.max(0, syncingRef.current - 1);
      }
    },
    [
      categoryModeCategory,
      hasCategoryMode,
      searchQuery,
      sortBy,
      statusFilter,
      t,
      userId,
    ],
  );

  /* ─── effects ─── */

  const mountedRef = useRef(false);

  useEffect(() => {
    if (authLoading || !isAuth || !userId) {
      setLoading(false);
      return;
    }
    if (!mountedRef.current) {
      mountedRef.current = true;
      fetchWishlist({ reset: true });
    }
  }, [authLoading, isAuth, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isAuth || !userId || !mountedRef.current) return;
    const debounce = setTimeout(() => {
      fetchWishlist({ reset: true });
    }, 250);
    return () => clearTimeout(debounce);
  }, [
    fetchWishlist,
    isAuth,
    searchQuery,
    sortBy,
    statusFilter,
    categoryModeCategory?.category_id,
    userId,
  ]);

  useEffect(() => {
    if (!isAuth || !userId) {
      savedIdsRef.current = new Set();
      return;
    }
    return subscribeSavedPosts((map) => {
      const ids = new Set(Object.keys(map || {}));
      if (syncingRef.current > 0) {
        savedIdsRef.current = ids;
        return;
      }
      const previousIds = savedIdsRef.current;
      let hasNew = false;
      ids.forEach((id) => {
        if (!previousIds.has(id)) hasNew = true;
      });
      savedIdsRef.current = ids;
      setItems((prev) =>
        prev.filter((item) =>
          ids.has(String(item.post_id ?? item.id ?? item.postId)),
        ),
      );
      if (hasNew) void fetchWishlist({ reset: true });
    });
  }, [isAuth, userId, fetchWishlist]);

  /* ─── remove item ─── */

  const syncSavedIds = useCallback((list) => {
    const ids = extractSavedPostIds(list);
    savedIdsRef.current = new Set(ids);
    replaceSavedPostIds(ids);
  }, []);

  const removeItem = async (postId) => {
    const mutationId = beginSavedPostMutation(postId);
    if (!mutationId) return;
    const removedItem = items.find(
      (item) => String(item.post_id ?? item.id ?? item.postId) === mutationId,
    );
    setItems((prev) => {
      const next = prev.filter(
        (item) => String(item.post_id ?? item.id ?? item.postId) !== mutationId,
      );
      syncSavedIds(next);
      return next;
    });
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(mutationId);
      return next;
    });

    if (removedItem) {
      toast({
        title: t("removed_from_wishlist") || "Removed from wishlist",
        description: removedItem.title,
        action: (
          <ToastAction
            altText="Undo removal"
            onClick={async () => {
              try {
                await api.post("/wishlist", { postId: mutationId });
                setItems((prev) => {
                  const next = dedupeWishlistItems([removedItem, ...prev]);
                  syncSavedIds(next);
                  return next;
                });
                setSavedPostStatus(mutationId, true);
              } catch (err) {
                if (import.meta.env.DEV)
                  console.error("Failed to undo removal:", err);
              }
            }}
          >
            {t("undo") || "Undo"}
          </ToastAction>
        ),
      });
    }

    try {
      await api.delete(`/wishlist/${mutationId}`, { params: { userId } });
      setSavedPostStatus(mutationId, false);
    } catch (err) {
      if (import.meta.env.DEV) console.error("Failed to remove:", err);
      if (removedItem) {
        setItems((prev) => {
          const next = dedupeWishlistItems([removedItem, ...prev]);
          syncSavedIds(next);
          return next;
        });
      }
      setError(
        t("failed_remove_wishlist_item") || "Unable to remove item right now.",
      );
    } finally {
      endSavedPostMutation(mutationId);
    }
  };

  const toggleSelection = useCallback((postId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
  }, []);

  /* ─── image url helper ─── */

  const getImageUrl = (item) => {
    const raw = item.images?.[0] || item.image_url;
    return raw ? (raw.startsWith("http") ? raw : `${getApiOriginBase()}${raw}`) : "/placeholder.svg";
  };

  const buildCartItem = useCallback(
    (item) => ({
      id: item.post_id,
      title: item.title,
      price: item.price,
      currency: item.currency || item.currency_code || item.currencyCode || undefined,
      image: item.images?.[0] || item.image_url,
      seller: item.seller_name || item.user_name,
      location: item.location,
      category_name: item.category_name,
      category_id:
        item.category_id ||
        item.categoryId ||
        item.category?.category_id ||
        item.category?.id ||
        "",
      category_group:
        item.category_group ||
        item.categoryGroup ||
        item.category?.category_group ||
        item.category?.categoryGroup ||
        activeApp ||
        "",
    }),
    [activeApp],
  );

  const handleShare = useCallback(
    async (item) => {
      const url =
        typeof window !== "undefined"
          ? `${window.location.origin}/post/${item.post_id}`
          : `/post/${item.post_id}`;
      try {
        await shareContent({
          title: item.title,
          text: item.title,
          url,
        });
      } catch (err) {
        if (import.meta.env.DEV) console.error("Failed to share:", err);
      }
    },
    [t, toast],
  );

  const handleBuyNow = useCallback(
    (item) => {
      addToCart(buildCartItem(item));
      navigate("/cart");
    },
    [addToCart, buildCartItem, navigate],
  );

  /* ─── category mode filtering ─── */

  const normalizeCategory = (cat) => String(cat || "").trim().toLowerCase();
  const activeCategoryKey = normalizeCategory(categoryModeCategory?.name);

  const activeAppMatcher = useMemo(
    () => buildActiveAppMatcher(activeApp, categoryModeCategories),
    [activeApp, categoryModeCategories],
  );

  const dedupedTranslatedItems = useMemo(
    () => dedupeWishlistItems(translatedPosts),
    [translatedPosts],
  );

  const displayItems = dedupedTranslatedItems.filter((item) =>
    matchesCategoryModeItem(item, {
      activeCategory: hasCategoryMode ? categoryModeCategory : null,
      activeAppMatcher,
    }),
  );

  const isFilteredEmpty =
    (Boolean(hasCategoryMode && activeCategoryKey) ||
      Boolean(activeAppMatcher?.activeApp)) &&
    dedupedTranslatedItems.length > 0 &&
    displayItems.length === 0;

  const selectedCount = selectedIds.size;
  const allSelected = useMemo(() => {
    if (!displayItems.length) return false;
    return displayItems.every((item) =>
      selectedIds.has(getWishlistItemKey(item)),
    );
  }, [displayItems, selectedIds]);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (!displayItems.length) return prev;
      const shouldClear = displayItems.every((item) =>
        prev.has(getWishlistItemKey(item)),
      );
      if (shouldClear) return new Set();
      return new Set(displayItems.map((item) => getWishlistItemKey(item)));
    });
  }, [displayItems]);

  useEffect(() => {
    setSelectedIds((prev) => {
      if (!prev.size) return prev;
      const visibleIds = new Set(
        displayItems.map((item) => getWishlistItemKey(item)),
      );
      const next = new Set(
        Array.from(prev).filter((id) => visibleIds.has(id)),
      );
      return next.size === prev.size ? prev : next;
    });
  }, [displayItems]);

  const isListView = viewMode === "list";
  const gridClassName = isListView
    ? "grid-cols-1"
    : displayItems.length <= 2
      ? "grid-cols-1 sm:grid-cols-2 max-w-5xl"
      : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3";

  const removeSelected = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    const previousItems = items;
    const nextItems = items.filter(
      (item) => !selectedIds.has(getWishlistItemKey(item)),
    );
    setItems(nextItems);
    syncSavedIds(nextItems);
    setSelectedIds(new Set());
    try {
      await Promise.all(
        ids.map((id) => api.delete(`/wishlist/${id}`, { params: { userId } })),
      );
      ids.forEach((id) => setSavedPostStatus(id, false));
      toast({
        title: t("removed_items") || "Removed items",
        description: `${ids.length} ${t("items_removed") || "items removed"}.`,
      });
    } catch (err) {
      if (import.meta.env.DEV) console.error("Failed to bulk remove:", err);
      setItems(previousItems);
      syncSavedIds(previousItems);
      setError(
        t("failed_remove_wishlist_item") || "Unable to remove items right now.",
      );
    }
  }, [items, selectedIds, syncSavedIds, t, toast, userId]);

  const addSelectedToCart = useCallback(() => {
    const selectedItems = items.filter((item) =>
      selectedIds.has(getWishlistItemKey(item)),
    );
    if (!selectedItems.length) return;
    selectedItems.forEach((item) => addToCart(buildCartItem(item)));
    toast({
      title: t("added_to_cart") || "Added to cart",
      description: `${selectedItems.length} ${t("items_added") || "items added"}.`,
    });
    setSelectedIds(new Set());
  }, [addToCart, buildCartItem, items, selectedIds, t, toast]);

  /* ─── auth loading state ─── */

  if (authLoading) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center mhub-premium-page bg-slate-50 dark:bg-slate-950 ${densityClass}`}
      >
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-pink-400 border-t-transparent rounded-full animate-spin dark:border-2 dark:border-pink-600/40 dark:border-t-transparent" />
          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium dark:text-gray-300">
            {t("loading") || "Loading..."}
          </p>
        </div>
      </div>
    );
  }

  /* ─── not authenticated ─── */

  if (!isAuth || !userId) {
    return (
      <div
        className={`min-h-screen mhub-premium-page bg-gradient-to-br from-slate-50 via-pink-50 to-purple-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center p-4 relative overflow-hidden dark:bg-gradient-to-br ${densityClass}`}
      >
        {/* Decorative blobs */}
        <div className="absolute top-20 -left-32 w-80 h-80 bg-pink-200/30 rounded-full blur-3xl pointer-events-none dark:bg-pink-900/30" />
        <div className="absolute bottom-20 -right-32 w-96 h-96 bg-purple-200/30 rounded-full blur-3xl pointer-events-none dark:bg-purple-900/30" />

        <div className="mhub-premium-surface rounded-3xl p-8 sm:p-10 max-w-md w-full text-center relative z-10 border border-white/60 dark:border-gray-700/40 shadow-xl shadow-pink-500/5 dark:text-center dark:border dark:border-white/60">
          {/* Icon */}
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 bg-gradient-to-br from-pink-200 to-purple-200 rounded-full blur-xl opacity-60 dark:bg-gradient-to-br" />
            <div className="relative w-20 h-20 bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl shadow-pink-500/30 rotate-6 dark:bg-gradient-to-br">
              <Heart className="w-10 h-10 text-white -rotate-6 dark:text-white" fill="white" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 dark:text-gray-100">
            {t("sign_in_to_view_wishlist") || "Sign in to view Wishlist"}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 leading-relaxed dark:text-gray-300">
            {t("save_favorites") || "Save your favorite items for later"}
          </p>
          <Button
            onClick={() => navigate("/login", { state: { returnTo: "/wishlist" } })}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white py-6 text-base font-semibold rounded-xl shadow-lg shadow-pink-500/20 hover:shadow-xl hover:shadow-pink-500/30 transition-all duration-300 hover:-translate-y-0.5 dark:bg-gradient-to-r dark:text-white"
          >
            {t("sign_in") || "Sign In"}
          </Button>
        </div>
      </div>
    );
  }

  /* ─── main authenticated view ─── */

  return (
    <div
      className={`min-h-screen mhub-premium-page bg-gradient-to-b from-slate-50 via-gray-50 to-slate-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 mhub-page-pad-bottom relative overflow-hidden dark:bg-gradient-to-b ${densityClass}`}
    >
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 profile-hero-bg bg-gradient-to-r from-sky-500/95 via-blue-500/95 to-violet-500/95 dark:from-sky-700/90 dark:via-blue-700/90 dark:to-violet-700/90" />
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fillRule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fillOpacity=\'0.1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          }}
        />
        <div className="relative max-w-[92rem] mx-auto px-4 py-4 sm:px-6 sm:py-5 page-shell page-pad">
          <div className="mb-2 max-w-4xl text-left dark:text-left mhub-hero-card min-h-[116px] sm:min-h-[132px] rounded-2xl px-4 py-3.5 sm:px-6 sm:py-4.5">
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
                <button
                  type="button"
                  onClick={() => fetchWishlist({ reset: true })}
                  disabled={loading}
                  className="inline-flex items-center justify-center rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/85 shadow-[0_8px_18px_rgba(15,23,42,0.15)] hover:bg-white/20 transition disabled:opacity-70"
                  aria-label="Refresh wishlist"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                </button>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white/80">
                  <Heart className="w-3.5 h-3.5" fill="white" />
                  {displayItems.length}{" "}
                  {displayItems.length === 1
                    ? t("saved_item") || "saved item"
                    : t("saved_items") || "saved items"}
                </span>
                <PageDensityToggle
                  value={density}
                  onChange={setDensity}
                  className="[&>span]:text-white/70 [&_select]:bg-white/15 [&_select]:text-white [&_select]:border-white/30"
                />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-[clamp(9px,0.95vw,11px)] font-semibold uppercase tracking-[0.2em] text-white/70 mb-1 dark:text-white/70">
                {t("wishlist_label") || "Saved items"}
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center dark:bg-slate-900/15">
                  <Heart className="w-5 h-5 text-white dark:text-white" fill="white" />
                </div>
                <h1 className="text-[clamp(20px,2.1vw,28px)] leading-[1.1] font-bold text-white dark:text-white">
                  {t("my_wishlist") || "My Wishlist"}
                </h1>
              </div>
              <p className="text-[clamp(12px,1.3vw,16px)] leading-[1.5] text-white/80 mt-1 dark:text-white/80">
                {t("wishlist_subtitle") ||
                  "Save favorites, compare options, and revisit later."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── subheader ── */}
      <div className="relative z-10 max-w-[92rem] mx-auto px-4 pt-3 pb-0.5 sm:px-6 lg:px-8 page-shell page-pad">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-7 h-7 bg-gradient-to-br from-pink-500 to-rose-500 rounded-lg flex items-center justify-center shadow-sm shadow-pink-500/20 dark:bg-gradient-to-br">
            <Heart className="w-3.5 h-3.5 text-white fill-white shrink-0 dark:text-white" />
          </div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 dark:text-gray-200">
            {hasCategoryMode && categoryModeCategory?.name
              ? `${displayItems.length} ${displayItems.length === 1 ? (t("saved_item") || "saved item") : (t("saved_items") || "saved items")} in ${categoryModeCategory.name}`
              : `${items.length} ${items.length === 1 ? (t("saved_item") || "saved item") : (t("saved_items") || "saved items")}`}
          </p>
          {isTranslating && (
            <span className="inline-flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 ml-1 dark:text-gray-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75 dark:bg-pink-800/30" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-pink-500 dark:bg-pink-800/30" />
              </span>
              {t("translating") || "Translating"}
            </span>
          )}
        </div>

        {/* ── category mode banner ── */}
        {hasCategoryMode && categoryModeCategory?.name && (
          <div className="mb-3 rounded-xl border border-pink-200/60 dark:border-pink-900/30 mhub-premium-surface backdrop-blur-sm p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 dark:border dark:border-pink-600/60">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-white dark:text-gray-100">
                Category mode: {categoryModeCategory.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-300">
                Your wishlist is filtered to this category.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="border-pink-200 text-pink-700 dark:border-pink-800 dark:text-pink-300 w-fit rounded-lg text-xs h-8 dark:border-pink-600/40"
              onClick={() => navigate("/category-mode")}
            >
              Switch category
            </Button>
          </div>
        )}

        {/* ── error banner — premium inline alert ── */}
        {error && (
          <div className="mt-3 mhub-premium-surface rounded-2xl border border-red-100 dark:border-red-900/40 p-4 flex items-center gap-3 shadow-sm dark:border dark:border-red-600/40">
            <div className="w-9 h-9 bg-red-50 dark:bg-red-950/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Heart className="w-4 h-4 text-red-400 dark:text-red-200" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200 dark:text-gray-100">{t("wishlist_load_error") || "Couldn't load your wishlist"}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 dark:text-gray-300">{t("try_again_later") || "Check your connection and try again"}</p>
            </div>
            <Button
              type="button"
              size="sm"
              className="bg-red-500 hover:bg-red-600 text-white rounded-xl h-9 px-4 text-xs font-semibold shadow-sm flex-shrink-0 dark:bg-red-800/30 dark:hover:bg-red-700/40 dark:text-white"
              onClick={() => fetchWishlist({ reset: true })}
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              {t("retry") || "Retry"}
            </Button>
          </div>
        )}

        <div className="mt-4 flex flex-col gap-3">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="flex flex-1 flex-col sm:flex-row gap-2">
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t("search_wishlist") || "Search wishlist"}
                className="h-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-slate-900/60 text-sm"
              />
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="h-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-slate-900/60 text-sm px-3 text-gray-700 dark:text-gray-200"
              >
                <option value="saved_desc">{t("sort_newest") || "Newest"}</option>
                <option value="saved_asc">{t("sort_oldest") || "Oldest"}</option>
                <option value="price_asc">{t("sort_price_low") || "Price: Low to High"}</option>
                <option value="price_desc">{t("sort_price_high") || "Price: High to Low"}</option>
                <option value="title_asc">{t("sort_title_asc") || "Title: A to Z"}</option>
                <option value="title_desc">{t("sort_title_desc") || "Title: Z to A"}</option>
              </select>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-slate-900/60 text-sm px-3 text-gray-700 dark:text-gray-200"
              >
                <option value="all">{t("status_all") || "All statuses"}</option>
                <option value="active">{t("status_active") || "Active"}</option>
                <option value="sold">{t("status_sold") || "Sold"}</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              {displayItems.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-xl border-gray-200 dark:border-gray-700 text-xs font-semibold"
                  onClick={toggleSelectAll}
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
              <div className="flex items-center gap-1 bg-white/70 dark:bg-slate-900/60 border border-gray-200 dark:border-gray-700 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  aria-pressed={viewMode === "grid"}
                  className={`h-8 w-8 rounded-lg flex items-center justify-center transition ${
                    viewMode === "grid"
                      ? "bg-pink-500 text-white shadow-md shadow-pink-500/20"
                      : "text-gray-500 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-white/10"
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  aria-pressed={viewMode === "list"}
                  className={`h-8 w-8 rounded-lg flex items-center justify-center transition ${
                    viewMode === "list"
                      ? "bg-pink-500 text-white shadow-md shadow-pink-500/20"
                      : "text-gray-500 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-white/10"
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {selectedCount > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-gray-500 dark:text-gray-300">
                {selectedCount} {t("selected") || "selected"}
              </span>
              <Button
                type="button"
                onClick={addSelectedToCart}
                className="h-9 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold"
              >
                <CartIcon className="w-3.5 h-3.5 mr-1.5" />
                {t("add_to_cart") || "Add to cart"}
              </Button>
              <Button
                type="button"
                onClick={removeSelected}
                className="h-9 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                {t("remove_selected") || "Remove"}
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
      </div>

      {/* ── main content ── */}
      <div className="relative z-10 max-w-[92rem] mx-auto px-4 sm:px-6 lg:px-8 pt-1.5 pb-4 page-shell page-pad">
        {loading ? (
          /* ── loading skeleton ── */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-3 sm:gap-4">
            {[...Array(8)].map((_, idx) => (
              <div
                key={idx}
                className="mhub-premium-surface backdrop-blur-sm rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800/50 dark:border dark:border-gray-700"
              >
                {/* image placeholder with shimmer */}
                <div className="relative w-full aspect-[4/3] bg-gray-200 dark:bg-gray-700 overflow-hidden">
                  <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/40 dark:via-white/5 to-transparent dark:bg-gradient-to-r" />
                </div>
                {/* body placeholder */}
                <div className="p-3.5 space-y-2.5">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full w-4/5 relative overflow-hidden">
                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite_0.1s] bg-gradient-to-r from-transparent via-white/40 dark:via-white/5 to-transparent dark:bg-gradient-to-r" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-3 w-3 bg-gray-200 dark:bg-gray-700 rounded-full" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full w-10" />
                  </div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full w-full relative overflow-hidden">
                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite_0.2s] bg-gradient-to-r from-transparent via-white/40 dark:via-white/5 to-transparent dark:bg-gradient-to-r" />
                  </div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full w-2/3" />
                  <div className="flex items-center justify-between pt-1">
                    <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded-full w-20" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full w-14" />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-xl flex-1" />
                    <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-xl" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : displayItems.length === 0 && !error ? (
          /* ── empty state — premium redesign ── */
          <div className="flex flex-col items-center justify-center py-16 px-4">
            {/* Premium heart illustration */}
            <div className="relative w-36 h-36 mx-auto mb-8">
              {/* Ambient glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-pink-200 to-purple-200 dark:from-pink-500/20 dark:to-purple-500/20 rounded-full blur-2xl opacity-60 dark:bg-gradient-to-br" />
              {/* Outer rotating dashed ring */}
              <div className="absolute inset-0 rounded-full border-2 border-dashed border-pink-200 dark:border-pink-500/20 animate-[spin_20s_linear_infinite] dark:border-2 dark:border-dashed dark:border-pink-600/40" />
              {/* Inner solid ring with gradient fill */}
              <div className="absolute inset-4 rounded-full bg-gradient-to-br from-pink-50 to-purple-50 dark:from-pink-500/10 dark:to-purple-500/10 border border-pink-100/50 dark:border-pink-500/10 dark:bg-gradient-to-br dark:border dark:border-pink-600/50" />
              {/* Icon container */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-xl shadow-pink-500/30 transition-transform hover:scale-105 duration-500 dark:bg-gradient-to-br">
                  <Heart className="w-9 h-9 text-white dark:text-white" fill="white" />
                </div>
              </div>
              {/* Floating dots with bounce */}
              <div className="absolute top-2 right-4 w-2.5 h-2.5 bg-pink-400 rounded-full opacity-70 animate-[bounce_3s_ease-in-out_infinite] dark:bg-pink-800/30" />
              <div className="absolute bottom-6 left-2 w-2 h-2 bg-purple-400 rounded-full opacity-50 animate-[bounce_3s_ease-in-out_infinite_0.5s] dark:bg-purple-800/30" />
              {/* Star decoration */}
              <Star className="absolute top-8 left-4 w-3 h-3 text-amber-400 opacity-60 dark:text-amber-200" />
            </div>

            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 text-center dark:text-gray-100 dark:text-center">
              {isFilteredEmpty
                ? `No ${categoryModeCategory?.name || "category"} items saved yet`
                : t("wishlist_empty") || "Your wishlist is empty"}
            </h3>
            <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-8 text-center max-w-[280px] leading-relaxed dark:text-gray-300 dark:text-center">
              {isFilteredEmpty
                ? "Switch category or save items in this marketplace."
                : t("start_saving") || "Tap the heart icon on any listing to add it here."}
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full max-w-xs">
              <Button
                onClick={() => navigate("/all-posts")}
                className="w-full sm:w-auto bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-6 h-11 rounded-xl text-sm font-semibold shadow-xl shadow-pink-500/20 transition-all duration-300 hover:shadow-2xl hover:shadow-pink-500/30 hover:-translate-y-0.5 dark:bg-gradient-to-r dark:text-white"
              >
                <ShoppingBag className="w-4 h-4 mr-2" />
                {t("browse_products") || "Browse Products"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto px-5 h-11 rounded-xl border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:border-pink-300 hover:text-pink-600 dark:hover:border-pink-700 dark:hover:text-pink-400 transition-all duration-200 hover:-translate-y-0.5 dark:text-gray-200 dark:hover:border-pink-600/40 dark:hover:text-pink-300"
                onClick={() => navigate("/for-you")}
              >
                <Compass className="w-4 h-4 mr-2" />
                {t("for_you") || "For You"}
              </Button>
            </div>
          </div>
        ) : (
          /* ── items grid — responsive: wider cards when few items ── */
          <div className="space-y-6">
            <div className={`grid gap-3 sm:gap-4 ${gridClassName}`}>
            {displayItems.map((item) => {
              const imageUrl = getImageUrl(item);
              const hasImage = Boolean(item.images?.[0] || item.image_url);
              const rating = Number(
                item.rating || item.seller_rating || item.user?.rating || 0,
              );
              const reviews = Number(
                item.review_count || item.reviews_count || item.reviewCount || 0,
              );
              const notesText = getWishlistNotesText(item.notes);
              const itemId = getWishlistItemKey(item);
              const isSelected = selectedIds.has(itemId);
              const sellerName = item.seller_name || item.user_name;
              const sellerAvatar = item.seller_avatar || item.user?.avatar_url;
              const sellerVerified =
                item.seller_verified ||
                item.seller_profile_verified ||
                item.user?.verified ||
                false;
              const sellerInitials = sellerName
                ? sellerName
                    .split(" ")
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join("")
                    .toUpperCase()
                : "U";
              const savedAtLabel = item.saved_at
                ? new Date(item.saved_at).toLocaleDateString()
                : "\u2014";

              return (
                <Card
                  key={itemId}
                  className={`group mhub-premium-surface backdrop-blur-md rounded-2xl overflow-hidden border border-gray-100/80 dark:border-gray-700/40 shadow-md shadow-gray-200/40 dark:shadow-black/20 hover:shadow-lg hover:shadow-pink-500/10 dark:hover:shadow-pink-500/5 hover:border-pink-200/60 dark:hover:border-pink-500/20 transition-all duration-300 hover:-translate-y-0.5 dark:border dark:border-gray-700/80 dark:hover:border-pink-600/60 ${isListView ? "sm:flex sm:flex-row" : ""} ${isSelected ? "ring-2 ring-pink-400/60 dark:ring-pink-500/40" : ""}`}
                >
                  {/* ── image area ── */}
                  <div className={`relative w-full overflow-hidden ${isListView ? "sm:w-56 sm:aspect-[4/3] sm:shrink-0" : "aspect-[4/3]"}`}>
                    {hasImage ? (
                      <img
                        src={imageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                        onError={(e) => {
                          e.target.src = "/placeholder.svg";
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-pink-50 via-slate-50 to-purple-50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-800 text-gray-400 dark:bg-gradient-to-br dark:text-gray-300">
                        <div className="w-14 h-14 bg-gradient-to-br from-pink-100 to-purple-100 dark:from-pink-500/10 dark:to-purple-500/10 rounded-2xl flex items-center justify-center mb-2 dark:bg-gradient-to-br">
                          <ImageIcon className="w-7 h-7 text-pink-300 dark:text-pink-500/40 dark:text-pink-200" />
                        </div>
                        <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 dark:text-gray-300">
                          {t("image_unavailable") || "Image coming soon"}
                        </span>
                      </div>
                    )}

                    {/* bottom gradient overlay with price */}
                    <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 to-transparent pointer-events-none dark:bg-gradient-to-t" />
                    <span className="absolute bottom-2.5 left-3 inline-flex items-center">
                      <span className="bg-black/20 backdrop-blur-md rounded-lg px-2.5 py-1 text-lg font-bold text-white dark:bg-black/20 dark:text-white">
                        &#x20B9;{item.price?.toLocaleString() || "0"}
                      </span>
                    </span>

                    {/* trash button - circular, glass, red on hover */}
                    <button
                      type="button"
                      onClick={() => toggleSelection(itemId)}
                      aria-pressed={isSelected}
                      aria-label={isSelected ? "Deselect item" : "Select item"}
                      className={`absolute top-2.5 right-12 w-8 h-8 rounded-full backdrop-blur-sm flex items-center justify-center border transition-all duration-200 ${
                        isSelected
                          ? "bg-pink-500 text-white border-pink-400 shadow-md shadow-pink-500/30"
                          : "bg-white/20 text-white/80 border-white/40 hover:bg-white/30"
                      }`}
                    >
                      <Check className={`w-3.5 h-3.5 ${isSelected ? "opacity-100" : "opacity-40"}`} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(itemId)}
                      aria-label={`Remove ${item.title} from wishlist`}
                      className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white/80 hover:bg-red-500 hover:text-white transition-all duration-200 hover:scale-110 disabled:opacity-50 disabled:pointer-events-none dark:bg-slate-900/20 dark:text-white/80 dark:hover:bg-red-800/30 dark:hover:text-white"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    {/* category badge - pill, semi-transparent with tint */}
                    <Badge className="absolute top-2.5 left-2.5 bg-white/20 backdrop-blur-md text-white border border-white/20 text-[10px] font-medium px-2.5 py-0.5 rounded-full shadow-sm dark:bg-slate-900/20 dark:text-white dark:border dark:border-white/20">
                      {item.category_name || t("general") || "General"}
                    </Badge>
                  </div>

                  {/* ── card body ── */}
                  <div className={`p-3 sm:p-3.5 ${isListView ? "flex-1" : ""}`}>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-[13px] sm:text-sm leading-snug mb-1 line-clamp-1 transition-colors duration-200 group-hover:text-pink-600 dark:group-hover:text-pink-400 dark:group-hover:text-pink-300">
                      {item.title}
                    </h3>
                    {sellerName && (
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400 mb-1">
                        {sellerAvatar ? (
                          <img
                            src={sellerAvatar}
                            alt={sellerName}
                            className="w-4 h-4 rounded-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <span className="w-4 h-4 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center text-[9px] font-semibold">
                            {sellerInitials}
                          </span>
                        )}
                        <ShoppingBag className="w-3 h-3" />
                        <span className="truncate">{sellerName}</span>
                        {sellerVerified && (
                          <Badge className="bg-emerald-50 text-emerald-600 border border-emerald-100 text-[9px] px-1.5 py-0.5 rounded-full dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20">
                            {t("verified") || "Verified"}
                          </Badge>
                        )}
                      </div>
                    )}
                    {/* Trust badges removed from cards — only shown on PostDetail */}

                    {/* rating */}
                    {rating > 0 && (
                      <div className="flex items-center gap-1 text-xs mb-1.5">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400 dark:text-amber-200" />
                        <span className="font-medium text-gray-700 dark:text-gray-300 dark:text-gray-200">{rating.toFixed(1)}</span>
                        {reviews > 0 && (
                          <span className="text-gray-400 dark:text-gray-500 dark:text-gray-300">
                            ({reviews})
                          </span>
                        )}
                      </div>
                    )}

                    {/* description */}
                    <p className="text-gray-500 dark:text-gray-400 text-[11px] sm:text-xs leading-relaxed mb-2 line-clamp-2 dark:text-gray-300">
                      {item.description || t("no_description") || "No description"}
                    </p>

                    {/* notes */}
                    {notesText && (
                      <p className="text-[10px] sm:text-[11px] italic text-pink-700 dark:text-pink-300 mb-2 border-l-2 border-pink-400 pl-2 py-0.5 bg-pink-50/50 rounded-r-md line-clamp-2 dark:border-pink-600/40 dark:bg-pink-950/50">
                        {notesText}
                      </p>
                    )}

                    {/* location + saved date */}
                    <div className="flex items-center justify-between mb-2.5 text-[10px] sm:text-[11px] text-gray-400 dark:text-gray-500 dark:text-gray-300">
                      <div className="flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{item.location || t("not_available") || "N/A"}</span>
                      </div>
                      <span className="shrink-0 ml-1.5 hidden sm:inline">
                        {t("saved") || "Saved"}{" "}
                        {savedAtLabel}
                      </span>
                    </div>

                    {/* action buttons */}
                    <div className="flex flex-col gap-1.5 sm:gap-2">
                      <div className="flex gap-1.5 sm:gap-2">
                        <Button
                          onClick={() =>
                            navigate(`/post/${item.post_id}`, {
                              state: { source: "wishlist", returnTo: "/wishlist" },
                            })
                          }
                          className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-xl text-[11px] sm:text-xs h-9 sm:h-10 font-semibold shadow-md shadow-pink-500/20 hover:shadow-lg hover:shadow-pink-500/25 transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none dark:bg-gradient-to-r dark:text-white"
                        >
                          <ExternalLink className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1" />
                          <span className="hidden sm:inline">{t("view_details") || "View Details"}</span>
                          <span className="sm:hidden">{t("view") || "View"}</span>
                        </Button>
                        <Button
                          onClick={() => handleBuyNow(item)}
                          className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl text-[11px] sm:text-xs h-9 sm:h-10 font-semibold shadow-md shadow-amber-500/20 hover:shadow-lg hover:shadow-amber-500/25 transition-all duration-200 hover:-translate-y-0.5"
                        >
                          <ShoppingBag className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1" />
                          {t("buy_now") || "Buy Now"}
                        </Button>
                      </div>
                      <div className="flex gap-1.5 sm:gap-2">
                        <Button
                          onClick={() => addToCart(buildCartItem(item))}
                          variant="outline"
                          className={
                            isInCart(item.post_id)
                              ? "flex-1 border-emerald-300 text-emerald-600 bg-emerald-50/50 dark:bg-emerald-500/5 dark:border-emerald-700 dark:text-emerald-400 rounded-xl h-9 sm:h-10 transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none"
                              : "flex-1 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-pink-300 hover:text-pink-600 hover:-translate-y-0.5 dark:hover:border-pink-700 dark:hover:text-pink-400 rounded-xl h-9 sm:h-10 transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none"
                          }
                          title={isInCart(item.post_id) ? "In cart" : "Add to cart"}
                          aria-label={isInCart(item.post_id) ? "In cart" : "Add to cart"}
                        >
                          <CartIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                          <span className="text-[11px] sm:text-xs">
                            {isInCart(item.post_id)
                              ? t("in_cart") || "In cart"
                              : t("add_to_cart") || "Add to cart"}
                          </span>
                        </Button>
                        <Button
                          onClick={() => handleShare(item)}
                          variant="outline"
                          className="flex-1 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-pink-300 hover:text-pink-600 hover:-translate-y-0.5 dark:hover:border-pink-700 dark:hover:text-pink-400 rounded-xl h-9 sm:h-10 transition-all duration-200"
                        >
                          <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                          <span className="text-[11px] sm:text-xs">
                            {t("share") || "Share"}
                          </span>
                        </Button>
                      </div>
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
                onClick={() => fetchWishlist()}
                disabled={isLoadingMore}
                className="h-11 px-6 rounded-xl text-sm font-semibold border-gray-200 dark:border-gray-700"
              >
                {isLoadingMore ? (t("loading") || "Loading...") : (t("load_more") || "Load more")}
              </Button>
            </div>
          )}
        </div>
        )}
      </div>

      {/* Shimmer keyframe style */}
      <style>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

export default Wishlist;

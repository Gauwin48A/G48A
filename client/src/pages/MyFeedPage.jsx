import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  FaHeart,
  FaShare,
  FaEye,
  FaPlus,
  FaNewspaper,
  FaTrash,
  FaMapMarkerAlt,
  FaBookmark,
  FaRegBookmark,
  FaEllipsisV,
} from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { useCategoryMode } from "@/context/CategoryModeContext";
import { getUserId as getUserIdFromStorage, hasAuthSession } from "@/utils/authStorage";
import api from "@/lib/api";
import {
  buildSavedPostsMap,
  beginSavedPostMutation,
  endSavedPostMutation,
  fetchWishlistIds,
  getSavedPostsMap,
  setSavedPostStatus,
  subscribeSavedPosts,
} from "@/utils/savedPosts";
import ShareLinkDialog from "@/components/ShareLinkDialog";
import PromoteDialog from "@/components/PromoteDialog";
import {
  buildActiveAppMatcher,
  matchesCategoryModeItem,
} from "@/utils/categoryModeFilters";
import { isPostOwnedByUser } from "@/utils/postOwnership";
import {
  PageAuthGateState,
  PageEmptyState,
  PageErrorState,
  PageLoadingState,
} from "@/components/page-state/PageStateBlocks";
import { useTranslatedPosts } from "@/hooks/useTranslatedContent";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import SkeletonLoader from "@/components/SkeletonLoader";
import UpsellBanner from "@/components/UpsellBanner";
import PostPromoBadges from "@/components/PostPromoBadges";

const getPostKey = (post) => post?.post_id ?? post?.id ?? null;

const mergeUniquePosts = (existingPosts, incomingPosts) => {
  const mergedMap = new Map();
  existingPosts.forEach((post) => {
    const key = getPostKey(post);
    if (key !== null) {
      mergedMap.set(String(key), post);
    }
  });
  incomingPosts.forEach((post) => {
    const key = getPostKey(post);
    if (key !== null) {
      mergedMap.set(String(key), post);
    }
  });
  return Array.from(mergedMap.values());
};

const getPostLocationLabel = (post) => {
  if (!post) return "";
  const values = [
    post.location,
    post.area,
    post.city,
    post.state,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
  return Array.from(new Set(values)).join(", ");
};

const MyFeedPage = () => {
  const { t } = useTranslation();
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState("");
  const [loadMoreError, setLoadMoreError] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [metaStats, setMetaStats] = useState(null);
  const postsPerPage = 10;
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const currentUserId = getUserIdFromStorage(authUser);
  const { activeApp, categories: categoryModeCategories } = useCategoryMode();
  const activeAppMatcher = useMemo(
    () => buildActiveAppMatcher(activeApp, categoryModeCategories),
    [activeApp, categoryModeCategories],
  );
  const filterFeedPost = useCallback(
    (post) =>
      matchesCategoryModeItem(post, { activeAppMatcher }),
    [activeAppMatcher],
  );
  const openPromote = useCallback((postId, title) => {
    if (!postId) return;
    setPromotePostId(String(postId));
    setPromotePostTitle(String(title || ""));
  }, []);
  const closePromote = useCallback(() => {
    setPromotePostId(null);
    setPromotePostTitle("");
  }, []);

  const [expandedPosts, setExpandedPosts] = useState({});
  const [likeCounts, setLikeCounts] = useState({});
  const [viewCounts, setViewCounts] = useState({});
  const [shareToast, setShareToast] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [menuPostId, setMenuPostId] = useState(null);
  const [savedPosts, setSavedPosts] = useState(() => getSavedPostsMap());
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareDialogUrl, setShareDialogUrl] = useState("");
  const [promotePostId, setPromotePostId] = useState(null);
  const [promotePostTitle, setPromotePostTitle] = useState("");
  const { translatedPosts } = useTranslatedPosts(posts);
  const displayPosts = translatedPosts;
  const displayViewTotal = useMemo(
    () =>
      displayPosts.reduce((sum, post) => {
        const id = post?.post_id || post?.id;
        if (id == null) return sum;
        return sum + (viewCounts[id] || 0);
      }, 0),
    [displayPosts, viewCounts],
  );
  const displayLikeTotal = useMemo(
    () =>
      displayPosts.reduce((sum, post) => {
        const id = post?.post_id || post?.id;
        if (id == null) return sum;
        return sum + (likeCounts[id] || 0);
      }, 0),
    [displayPosts, likeCounts],
  );
  const statsTotalPosts = metaStats?.totalPosts ?? displayPosts.length;
  const statsTotalViews = metaStats?.totalViews ?? displayViewTotal;
  const statsTotalLikes = metaStats?.totalLikes ?? displayLikeTotal;

  const activeRequestIdRef = useRef(0);
  const fetchAbortControllerRef = useRef(null);
  const metricsAbortControllerRef = useRef(null);
  const loadingGuardRef = useRef(false);
  const scrollTickingRef = useRef(false);
  const shareToastTimeoutRef = useRef(null);

  const userId =
    authUser?.id ||
    authUser?.user_id ||
    localStorage.getItem("userId") ||
    localStorage.getItem("user_id");
  const isLoggedIn = Boolean(userId && hasAuthSession());

  useEffect(
    () => () => {
      if (fetchAbortControllerRef.current) {
        fetchAbortControllerRef.current.abort();
      }
      if (metricsAbortControllerRef.current) {
        metricsAbortControllerRef.current.abort();
      }
      if (shareToastTimeoutRef.current) {
        clearTimeout(shareToastTimeoutRef.current);
      }
    },
    [],
  );

  useEffect(() => subscribeSavedPosts(setSavedPosts), []);

  const syncSavedPosts = useCallback(async () => {
    if (!isLoggedIn) {
      return;
    }

    try {
      const ids = await fetchWishlistIds(async () => {
        const response = await api.get(`/wishlist`, {
          params: userId ? { userId: String(userId) } : {},
        });
        return response?.data ?? response;
      });
      setSavedPosts(buildSavedPostsMap(ids));
    } catch {
      // Keep local state if sync fails.
    }
  }, [isLoggedIn, userId]);

  const showToast = useCallback((message) => {
    setShareToast(message);
    if (shareToastTimeoutRef.current) {
      clearTimeout(shareToastTimeoutRef.current);
    }
    shareToastTimeoutRef.current = setTimeout(() => {
      setShareToast("");
      shareToastTimeoutRef.current = null;
    }, 2000);
  }, []);

  const buildFeedParams = useCallback(
    ({ page, limit, includeMeta = false }) => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (activeAppMatcher?.activeApp) {
        params.set("category_group", String(activeAppMatcher.activeApp));
      }
      const trimmedSearch = searchQuery.trim();
      if (trimmedSearch) {
        params.set("search", trimmedSearch);
      }
      if (statusFilter && statusFilter !== "all") {
        params.set("status", statusFilter);
      }
      if (sortBy) {
        params.set("sortBy", sortBy);
      }
      if (sortOrder) {
        params.set("sortOrder", sortOrder);
      }
      if (includeMeta) {
        params.set("includeMeta", "1");
      }
      return Object.fromEntries(params);
    },
    [activeAppMatcher?.activeApp, searchQuery, statusFilter, sortBy, sortOrder],
  );

  const fetchPosts = useCallback(
    async ({ page = 1, refresh = false } = {}) => {
      if (!userId) {
        return;
      }

      const requestId = activeRequestIdRef.current + 1;
      activeRequestIdRef.current = requestId;
      loadingGuardRef.current = true;

      if (fetchAbortControllerRef.current) {
        fetchAbortControllerRef.current.abort();
      }
      const abortController = new AbortController();
      fetchAbortControllerRef.current = abortController;

      const pageToFetch = page;
      if (refresh) {
        setCurrentPage(1);
      }

      setLoading(true);
      if (refresh || pageToFetch === 1) {
        setError("");
        setLoadMoreError("");
      } else {
        setLoadMoreError("");
      }

      try {
        const params = buildFeedParams({
          page: pageToFetch,
          limit: postsPerPage,
          includeMeta: true,
        });
        const response = await api.get("/feed/mine", {
          params,
          signal: abortController.signal,
        });
        const data = response?.data ?? response;
        const loadedPosts = Array.isArray(data)
          ? data
          : Array.isArray(data.posts)
            ? data.posts
            : [];
        if (!Array.isArray(data) && data?.meta) {
          const metaPayload = data.meta || {};
          setMetaStats({
            totalPosts:
              Number(metaPayload.totalPosts ?? metaPayload.total_posts ?? 0) || 0,
            totalViews:
              Number(metaPayload.totalViews ?? metaPayload.total_views ?? 0) || 0,
            totalLikes:
              Number(metaPayload.totalLikes ?? metaPayload.total_likes ?? 0) || 0,
          });
        } else if (refresh || pageToFetch === 1) {
          setMetaStats(null);
        }
        const scopedPosts = activeAppMatcher?.activeApp
          ? loadedPosts.filter(filterFeedPost)
          : loadedPosts;

        if (requestId !== activeRequestIdRef.current) {
          return;
        }

        if (refresh || pageToFetch === 1) {
          setPosts(scopedPosts);
        } else {
          setPosts((prev) => mergeUniquePosts(prev, scopedPosts));
        }

        const likes = {};
        const views = {};
        scopedPosts.forEach((post) => {
          const id = post.post_id || post.id;
          likes[id] = post.likes || 0;
          views[id] = post.views_count || post.views || 0;
        });
        setLikeCounts((prev) => (refresh ? likes : { ...prev, ...likes }));
        setViewCounts((prev) => (refresh ? views : { ...prev, ...views }));
        setCurrentPage(pageToFetch);
        setHasMore(scopedPosts.length === postsPerPage);
      } catch (err) {
        if (err?.name === "AbortError") {
          return;
        }
        if (requestId !== activeRequestIdRef.current) {
          return;
        }
        if (refresh || pageToFetch === 1) {
          setError("Unable to load your feed posts right now. Please retry.");
          setPosts([]);
          setHasMore(false);
          setCurrentPage(1);
          setMetaStats(null);
        } else {
          setLoadMoreError("Unable to load more posts right now. Please retry.");
          setCurrentPage((prev) => Math.max(1, prev - 1));
        }
      } finally {
        if (fetchAbortControllerRef.current === abortController) {
          fetchAbortControllerRef.current = null;
        }
        if (requestId === activeRequestIdRef.current) {
          loadingGuardRef.current = false;
          setLoading(false);
        }
      }
    },
    [
      activeAppMatcher?.activeApp,
      buildFeedParams,
      filterFeedPost,
      postsPerPage,
      userId,
    ],
  );

  useEffect(() => {
    if (!isLoggedIn) {
      return;
    }
    fetchPosts({ page: 1, refresh: true });
  }, [fetchPosts, isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) {
      return;
    }
    void syncSavedPosts();
  }, [isLoggedIn, syncSavedPosts]);

  const loadMorePosts = useCallback(
    ({ ignoreError = false } = {}) => {
      if (
        loadingGuardRef.current ||
        !hasMore ||
        (!ignoreError && loadMoreError)
      ) {
        return;
      }
      const nextPage = currentPage + 1;
      loadingGuardRef.current = true;
      setCurrentPage(nextPage);
      fetchPosts({ page: nextPage });
    },
    [currentPage, fetchPosts, hasMore, loadMoreError],
  );

  const handleLoadMoreRetry = useCallback(() => {
    if (loadingGuardRef.current) {
      return;
    }
    setLoadMoreError("");
    loadMorePosts({ ignoreError: true });
  }, [loadMorePosts]);

  const refreshMetrics = useCallback(async () => {
    if (!isLoggedIn) return;
    if (metricsAbortControllerRef.current) {
      metricsAbortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    metricsAbortControllerRef.current = abortController;
    try {
      const limit = Math.max(
        1,
        Math.min(currentPage * postsPerPage, 50),
      );
      const params = buildFeedParams({
        page: 1,
        limit,
        includeMeta: true,
      });
      const response = await api.get("/feed/mine", {
        params,
        signal: abortController.signal,
      });
      const data = response?.data ?? response;
      const loadedPosts = Array.isArray(data)
        ? data
        : Array.isArray(data.posts)
          ? data.posts
          : [];
      const scopedPosts = activeAppMatcher?.activeApp
        ? loadedPosts.filter(filterFeedPost)
        : loadedPosts;
      const likes = {};
      const views = {};
      scopedPosts.forEach((post) => {
        const id = post.post_id || post.id;
        likes[id] = post.likes || 0;
        views[id] = post.views_count || post.views || 0;
      });
      setLikeCounts((prev) => ({ ...prev, ...likes }));
      setViewCounts((prev) => ({ ...prev, ...views }));
      if (!Array.isArray(data) && data?.meta) {
        const metaPayload = data.meta || {};
        setMetaStats({
          totalPosts:
            Number(metaPayload.totalPosts ?? metaPayload.total_posts ?? 0) || 0,
          totalViews:
            Number(metaPayload.totalViews ?? metaPayload.total_views ?? 0) || 0,
          totalLikes:
            Number(metaPayload.totalLikes ?? metaPayload.total_likes ?? 0) || 0,
        });
      }
    } catch (err) {
      if (err?.name === "AbortError") {
        return;
      }
    } finally {
      if (metricsAbortControllerRef.current === abortController) {
        metricsAbortControllerRef.current = null;
      }
    }
  }, [
    activeAppMatcher?.activeApp,
    buildFeedParams,
    currentPage,
    filterFeedPost,
    isLoggedIn,
    postsPerPage,
  ]);

  useEffect(() => {
    if (!isLoggedIn) {
      return undefined;
    }

    const handleScroll = () => {
      if (scrollTickingRef.current) {
        return;
      }
      scrollTickingRef.current = true;

      window.requestAnimationFrame(() => {
        scrollTickingRef.current = false;
        const scrollBottom = window.innerHeight + window.scrollY;
        const pageBottom = document.documentElement.scrollHeight;
        if (scrollBottom >= pageBottom - 900) {
          loadMorePosts();
        }
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => {
      window.removeEventListener("scroll", handleScroll);
      scrollTickingRef.current = false;
    };
  }, [isLoggedIn, loadMorePosts]);

  useEffect(() => {
    if (!isLoggedIn) {
      return undefined;
    }
    const interval = setInterval(() => {
      refreshMetrics();
    }, 45000);
    return () => clearInterval(interval);
  }, [isLoggedIn, refreshMetrics]);

  // Pull-to-refresh for mobile
  const { pullIndicator } = usePullToRefresh({
    onRefresh: () => fetchPosts({ page: 1, refresh: true }),
    disabled: !isLoggedIn,
  });

  const toggleExpand = (postId) => {
    setExpandedPosts((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

  const handleRefresh = () => {
    fetchPosts({ page: 1, refresh: true });
  };

  const handleShare = async (postId) => {
    const url = `${window.location.origin}/feed/${postId}`;
    setShareDialogUrl(url);
    setShareDialogOpen(true);
    try {
      await api.post(`/posts/${postId}/share`);
    } catch {
      // Ignore share counter failures to keep UX responsive.
    }
  };

  const toggleSaveMyFeed = async (postId) => {
    if (!isLoggedIn) {
      showToast("Please login to save posts");
      return;
    }

    const key = String(postId);
    const mutationId = beginSavedPostMutation(key);
    if (!mutationId) return;
    const isSaved = Boolean(savedPosts[mutationId]);
    const nextSaved = !isSaved;
    setSavedPosts((prev) => ({ ...prev, [mutationId]: nextSaved })),
      setSavedPostStatus(mutationId, nextSaved);

    try {
      if (nextSaved) {
        await api.post(`/wishlist`, { postId: mutationId });
      } else {
        await api.delete(`/wishlist/${mutationId}`);
      }
    } catch {
      setSavedPosts((prev) => ({ ...prev, [mutationId]: isSaved }));
      setSavedPostStatus(mutationId, isSaved);
      showToast(
        isSaved ? "Unable to remove saved post." : "Unable to save post.",
      );
    } finally {
      endSavedPostMutation(mutationId);
    }
  };

  const handleDelete = async (postId) => {
    try {
      await api.delete(`/posts/${postId}`);
      setPosts((prev) =>
        prev.filter((post) => (post.post_id || post.id) !== postId),
      );
      setDeleteConfirm(null);
      showToast("Post deleted.");
    } catch {
      showToast("Unable to delete this post. Please retry.");
    }
  };

  const handleViewDetails = (postId) => {
    const postObj = translatedPosts.find(
      (p) => p.id === postId || p.post_id === postId,
    );
    navigate(`/feed/${postId}`, { state: { post: postObj } });
  };

  const timeAgo = (dateString) => {
    if (!dateString) {
      return "";
    }
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now - date;
    const mins = Math.floor(diffMs / 60000);
    const hrs = Math.floor(diffMs / 3600000);
    const days = Math.floor(diffMs / 86400000);

    if (mins < 1) return t("time_just_now") || "Just now";
    if (mins < 60) {
      return t("time_minutes_ago", { count: mins, defaultValue: `${mins}m ago` });
    }
    if (hrs < 24) {
      return t("time_hours_ago", { count: hrs, defaultValue: `${hrs}h ago` });
    }
    if (days < 7) {
      return t("time_days_ago", { count: days, defaultValue: `${days}d ago` });
    }
    return date.toLocaleDateString();
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center mhub-premium-page bg-gradient-to-br from-green-600 via-emerald-600 to-teal-700 dark:bg-gradient-to-br">
        <div className="w-full max-w-md p-4 page-shell page-pad">
          <PageAuthGateState
            title={t("my_feed") || "My Feed"}
            description={t("view_manage_posts") || "View and manage your posts"}
            className="bg-white/95 dark:bg-slate-900/95"
            marker="auth-gate"
            primaryAction={
              <Link
                to="/login?returnTo=%2Fmy-feed"
                className="bg-emerald-600 text-white px-4 py-2 rounded-md font-semibold text-center hover:bg-emerald-700 dark:bg-emerald-700/40 dark:hover:bg-emerald-700/40"
              >
                {t("login_to_continue") || "Login to Continue"}
              </Link>
            }
            secondaryAction={
              <Link
                to="/signup?returnTo=%2Fmy-feed"
                className="border border-emerald-300 text-emerald-700 px-4 py-2 rounded-md font-semibold text-center hover:bg-emerald-50 dark:border-emerald-600/40 dark:hover:bg-emerald-950/20"
              >
                {t("create_account") || "Create Account"}
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mhub-premium-page bg-gradient-to-b from-slate-50 via-blue-50 to-white dark:from-slate-950 dark:via-slate-900/60 dark:to-slate-950 min-h-screen nav-clearance dark:bg-gradient-to-b">
      {pullIndicator}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 profile-hero-bg" />
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fillRule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fillOpacity=\'0.1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          }}
        />
        <div className="relative max-w-[640px] mx-auto px-4 py-2 sm:px-6 sm:py-3 page-shell page-pad">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70 mb-1 dark:text-white/70">
                {t("my_feed_label") || "Your feed"}
              </p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center dark:bg-slate-900/15">
                  <FaNewspaper className="text-white/90 dark:text-white/90" />
                </div>
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-white dark:text-white">
                  {t("my_feed") || "My Feed"}
                </h1>
              </div>
              <p className="text-sm sm:text-base text-white/80 mt-1 dark:text-white/80">
                {t("your_posts") || "Your posts and updates"}
              </p>
            </div>

            <div className="flex gap-2 sm:gap-3">
              <Button
                onClick={handleRefresh}
                variant="outline"
                className="bg-white/10 border border-white/30 text-white hover:bg-white/20 font-semibold px-4 py-2.5 rounded-xl backdrop-blur-sm dark:bg-slate-900/10 dark:border-white/30 dark:text-white dark:hover:bg-slate-900/20"
                disabled={loading}
              >
                {t("refresh") || "Refresh"}
              </Button>
              <Button
                onClick={() => navigate("/feed/feedpostadd")}
                className="bg-white text-emerald-700 hover:bg-emerald-50 font-semibold px-5 py-2.5 rounded-xl shadow-lg flex items-center gap-2 dark:bg-slate-900 dark:text-emerald-300 dark:hover:bg-emerald-950/20"
              >
                <FaPlus /> {t("new_post") || "New Post"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[640px] mx-auto px-4 py-6 page-shell page-pad">
        <UpsellBanner trigger="feed" className="mb-4" />
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div
            className="rewards-stat-card rounded-2xl bg-white/95 dark:bg-slate-900/80 text-slate-900 dark:text-slate-100 p-4 shadow-lg border border-slate-100/80 dark:border-slate-800/60 dark:bg-slate-900/95 dark:border-slate-700/80"
            style={{ "--card-accent": "linear-gradient(90deg, #22c55e, #16a34a)" }}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-300">
                {metaStats
                  ? t("total_posts") || "Total posts"
                  : t("loaded_posts") || "Loaded posts"}
              </p>
              <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center dark:bg-emerald-950/20">
                <FaNewspaper className="text-emerald-600 dark:text-emerald-300" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-black text-slate-900 dark:text-slate-100">
              {statsTotalPosts}
            </div>
          </div>
          <div
            className="rewards-stat-card rounded-2xl bg-white/95 dark:bg-slate-900/80 text-slate-900 dark:text-slate-100 p-4 shadow-lg border border-slate-100/80 dark:border-slate-800/60 dark:bg-slate-900/95 dark:border-slate-700/80"
            style={{ "--card-accent": "linear-gradient(90deg, #3b82f6, #6366f1)" }}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-300">
                {metaStats
                  ? t("total_views") || "Total views"
                  : t("loaded_views") || "Loaded views"}
              </p>
              <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center dark:bg-blue-950/20">
                <FaEye className="text-blue-600 dark:text-blue-300" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-black text-slate-900 dark:text-slate-100">
              {statsTotalViews}
            </div>
          </div>
          <div
            className="rewards-stat-card rounded-2xl bg-white/95 dark:bg-slate-900/80 text-slate-900 dark:text-slate-100 p-4 shadow-lg border border-slate-100/80 dark:border-slate-800/60 dark:bg-slate-900/95 dark:border-slate-700/80"
            style={{ "--card-accent": "linear-gradient(90deg, #f43f5e, #ec4899)" }}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-widest text-rose-600 dark:text-rose-300">
                {metaStats
                  ? t("total_likes") || "Total likes"
                  : t("loaded_likes") || "Loaded likes"}
              </p>
              <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center dark:bg-rose-950/20">
                <FaHeart className="text-rose-600 dark:text-rose-300" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-black text-slate-900 dark:text-slate-100">
              {statsTotalLikes}
            </div>
          </div>
        </div>
        <p className="mt-1 mb-6 text-center text-xs text-gray-500 dark:text-gray-300">
          {metaStats
            ? t("my_feed_stats_total_note") ||
              "Stats include all posts that match your filters."
            : t("my_feed_stats_loaded_note") ||
              "Stats reflect the posts currently loaded on this page."}
        </p>

        <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative sm:col-span-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t("search_posts") || "Search your posts"}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/80 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/80 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">{t("all_statuses") || "All statuses"}</option>
            <option value="active">{t("active") || "Active"}</option>
            <option value="draft">{t("draft") || "Draft"}</option>
            <option value="sold">{t("sold") || "Sold"}</option>
            <option value="archived">{t("archived") || "Archived"}</option>
          </select>
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/80 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="created_at">
                {t("sort_recent") || "Newest"}
              </option>
              <option value="updated_at">
                {t("sort_updated") || "Recently updated"}
              </option>
              <option value="views_count">
                {t("sort_views") || "Most viewed"}
              </option>
              <option value="likes">{t("sort_likes") || "Most liked"}</option>
              <option value="title">{t("sort_title") || "Title"}</option>
            </select>
            <select
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
              className="w-28 px-2 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/80 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="desc">{t("sort_desc") || "Desc"}</option>
              <option value="asc">{t("sort_asc") || "Asc"}</option>
            </select>
          </div>
        </div>

        <div className="space-y-2 mhub-compact-feed">
          {loading && displayPosts.length === 0 ? (
            <PageLoadingState
              title={t("loading") || "Loading..."}
              description={
                t("my_feed_loading_desc") || "Loading your feed posts."
              }
              marker="loading"
            />
          ) : error ? (
            <PageErrorState
              title={t("feed_load_failed_title")}
              description={error}
              onRetry={() => fetchPosts({ page: 1, refresh: true })}
              retryLabel={t("retry") || "Retry"}
              marker="error"
              secondaryAction={
                <Button
                  variant="outline"
                  className="border-green-300 text-green-700 dark:border-green-600/40 dark:text-green-300"
                  onClick={() => navigate("/feed")}
                >
                  {t("open_public_feed") || "Open public feed"}
                </Button>
              }
            />
          ) : displayPosts.length === 0 ? (
            <PageEmptyState
              title={t("no_posts_yet") || "You haven't posted anything yet"}
              description={
                t("share_first") ||
                "Share your first update with the community."
              }
              icon={FaNewspaper}
              marker="empty"
              action={
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    onClick={() => navigate("/feed/feedpostadd")}
                    className="bg-green-600 text-white dark:bg-green-700/40 dark:text-white"
                  >
                    <FaPlus className="mr-2" />{" "}
                    {t("create_first") || "Create Your First Post"}
                  </Button>
                  <Button
                    variant="outline"
                    className="border-green-300 text-green-700 dark:border-green-600/40 dark:text-green-300"
                    onClick={() => navigate("/feed")}
                  >
                    {t("browse_feed") || "Browse feed"}
                  </Button>
                </div>
              }
            />
          ) : (
            displayPosts.map((post) => {
              const postId = post.post_id || post.id;
              const isOwnerPost = isPostOwnedByUser(post, currentUserId);
              const isExpanded = expandedPosts[postId];
              const description = post.description || "";
              const isLong = description.length > 250;
              const locationLabel = getPostLocationLabel(post);

              return (
                <Card
                  key={postId}
                  className="mhub-premium-surface rounded-2xl overflow-hidden hover:shadow-md transition"
                >
                  <div className="flex items-start gap-2 px-5 pt-4 pb-2 relative min-w-0 flex-nowrap">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 dark:bg-gradient-to-br">
                        <AvatarFallback className="text-white font-bold dark:text-white">
                          {post.user?.name?.[0] || "Y"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <span className="font-semibold text-gray-900 dark:text-white truncate dark:text-gray-100">
                          {t("you") || "You"}
                        </span>
                        <div className="text-gray-400 text-xs dark:text-gray-300">
                          {timeAgo(post.created_at)}
                        </div>
                        <div className="mt-1">
                          <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-1 text-xs font-semibold text-gray-600 dark:text-gray-200 dark:bg-gray-950">
                            Post ID: {postId}
                          </span>
                        </div>
                        <PostPromoBadges
                          post={post}
                          t={t}
                          size="xs"
                          className="mt-2"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 ml-auto self-start shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setMenuPostId((prev) =>
                            prev === String(postId) ? null : String(postId),
                          )
                        }
                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition dark:text-gray-300 dark:hover:text-green-300 dark:hover:bg-green-950/20"
                        title={t("more_options")}
                      >
                        <FaEllipsisV className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(postId)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition dark:text-gray-300 dark:hover:text-red-300 dark:hover:bg-red-950/20"
                        title={t("delete") || "Delete"}
                      >
                        <FaTrash className="w-4 h-4" />
                      </button>
                    </div>

                    {menuPostId === String(postId) && (
                      <div className="absolute right-5 top-12 z-20 w-44 rounded-xl border border-gray-200 dark:border-gray-700 mhub-premium-surface shadow-lg p-1 dark:border">
                        <button
                          type="button"
                          onClick={() => {
                            handleShare(postId);
                            setMenuPostId(null);
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:hover:bg-gray-950"
                        >
                          {t("share") || "Share"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            toggleSaveMyFeed(postId);
                            setMenuPostId(null);
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:hover:bg-gray-950"
                        >
                          {savedPosts[String(postId)]
                            ? t("saved") || "Saved"
                            : t("save") || "Save"}
                        </button>
                        {isOwnerPost && (
                          <button
                            type="button"
                            onClick={() => {
                              openPromote(postId, post.title);
                              setMenuPostId(null);
                            }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:hover:bg-gray-950"
                          >
                            {t("promote") || "Promote"}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteConfirm(postId);
                            setMenuPostId(null);
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg dark:text-red-300 dark:hover:bg-red-950/20"
                        >
                          {t("delete") || "Delete"}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Post thumbnail if available */}
                  {(post.images?.[0] || post.image_url) && (
                    <div className="px-5 pt-2 pb-1">
                      <img
                        src={post.images?.[0] || post.image_url}
                        alt={post.title || "Post image"}
                        className="w-full max-h-48 object-cover rounded-xl border border-gray-100 dark:border-gray-700 dark:border"
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                      />
                    </div>
                  )}

                  <div className="px-5 pb-4">
                    {/* Category badge */}
                    {(post.category_name || post.category) && (
                      <span className="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-1 text-xs font-semibold text-green-700 dark:text-green-300 mb-2 dark:bg-green-950/20">
                        {post.category_name || post.category}
                      </span>
                    )}
                    {locationLabel && (
                      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-2">
                        <FaMapMarkerAlt className="mr-1 text-gray-400 dark:text-gray-300" />
                        <span>{locationLabel}</span>
                      </div>
                    )}
                    {post.title && (
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 dark:text-gray-100">
                        {post.title}
                      </h3>
                    )}

                    <div className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap dark:text-gray-200">
                      {isLong && !isExpanded ? (
                        <>
                          {description.slice(0, 250)}...
                          <button
                            onClick={() => toggleExpand(postId)}
                            className="text-green-600 dark:text-green-400 font-medium hover:underline ml-1 dark:text-green-300"
                          >
                            {t("view_more") || "View more"}
                          </button>
                        </>
                      ) : (
                        <>
                          {description || (
                            <span className="italic text-gray-400 dark:text-gray-300">
                              {t("no_content") || "No content"}
                            </span>
                          )}
                          {isLong && isExpanded && (
                            <button
                              onClick={() => toggleExpand(postId)}
                              className="text-green-600 dark:text-green-400 font-medium hover:underline ml-1 block mt-2 dark:text-green-300"
                            >
                              {t("view_less") || "View less"}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="px-3 py-2.5 border-t mhub-premium-bar dark:border-t">
                    <div className="post-action-row flex flex-nowrap items-center gap-1 overflow-x-auto whitespace-nowrap pr-1 text-xs sm:text-xs scrollbar-hide sm:gap-2">
                      <span className="inline-flex h-7 items-center gap-1 rounded-full bg-red-50 px-2 text-red-500 dark:bg-red-950/20 dark:text-red-300">
                        <FaHeart /> {likeCounts[postId] || 0}
                      </span>
                      <span className="inline-flex h-7 items-center gap-1 rounded-full bg-gray-100 px-2 text-gray-500 dark:bg-gray-700 dark:text-gray-300 dark:bg-gray-950">
                        <FaEye /> {viewCounts[postId] || 0}
                      </span>

                      <Button
                        variant="ghost"
                        className="shrink-0 h-7 rounded-full bg-gray-100 dark:bg-gray-700 px-2 text-xs sm:text-xs text-gray-600 dark:text-gray-200 hover:text-green-600 dark:bg-gray-950 dark:hover:text-green-300"
                        onClick={() => handleShare(postId)}
                      >
                        <FaShare className="mr-1" />
                        <span className="hidden sm:inline">
                          {t("share") || "Share"}
                        </span>
                      </Button>
                      <Button
                        variant="ghost"
                        className="shrink-0 h-7 rounded-full bg-gray-100 dark:bg-gray-700 px-2 text-xs sm:text-xs text-gray-600 dark:text-gray-200 hover:text-green-600 dark:bg-gray-950 dark:hover:text-green-300"
                        onClick={() => toggleSaveMyFeed(postId)}
                      >
                        {savedPosts[String(postId)] ? (
                          <FaBookmark className="mr-1 text-green-600 dark:text-green-300" />
                        ) : (
                          <FaRegBookmark className="mr-1" />
                        )}
                        <span className="hidden sm:inline">
                          {savedPosts[String(postId)]
                            ? t("saved") || "Saved"
                            : t("save") || "Save"}
                        </span>
                      </Button>
                      <Button
                        variant="ghost"
                        className="shrink-0 h-7 rounded-full bg-gray-100 dark:bg-gray-700 px-2 text-xs sm:text-xs text-green-600 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/30 font-medium dark:bg-gray-950 dark:hover:bg-green-950/20"
                        onClick={() => handleViewDetails(postId)}
                      >
                        <FaEye className="mr-1" />
                        <span className="hidden sm:inline">
                          {t("view") || "View"}
                        </span>
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })
          )}

          {loading && currentPage > 1 && (
            <SkeletonLoader type="card" count={2} />
          )}

          {loadMoreError && displayPosts.length > 0 && (
            <Card
              className="border border-amber-300 bg-amber-50 text-amber-900 p-4 dark:border-amber-600/40 dark:bg-amber-950/20 dark:text-amber-200"
              data-ux-state="my-feed-load-more-error"
            >
              <p className="font-semibold">
                {t("more_posts_unavailable") || "More posts unavailable"}
              </p>
              <p className="mt-1 text-sm">{loadMoreError}</p>
              <div className="mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-amber-400 text-amber-900 dark:border-amber-600/40 dark:text-amber-200"
                  onClick={handleLoadMoreRetry}
                >
                  {t("retry_loading_more") || "Retry loading more"}
                </Button>
              </div>
            </Card>
          )}

          {!hasMore && displayPosts.length > 0 && (
            <div className="text-center py-6 text-gray-400 text-sm dark:text-gray-300">
              {t("thats_all") || "That's all your posts"}
            </div>
          )}
        </div>
      </div>

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 dark:bg-black/50">
          <Card className="mhub-premium-surface rounded-2xl p-6 max-w-sm w-full page-shell page-pad">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 dark:text-gray-100">
              {t("delete_post") || "Delete Post?"}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4 dark:text-gray-300">
              {t("delete_confirm") || "This action cannot be undone."}
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setDeleteConfirm(null)}
              >
                {t("cancel") || "Cancel"}
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white dark:bg-red-700/40 dark:hover:bg-red-700/40 dark:text-white"
                onClick={() => handleDelete(deleteConfirm)}
              >
                {t("delete") || "Delete"}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {shareToast && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg z-50 dark:bg-green-700/40 dark:text-white">
          {shareToast}
        </div>
      )}

      <PromoteDialog
        open={Boolean(promotePostId)}
        onOpenChange={(open) => {
          if (!open) closePromote();
        }}
        postId={promotePostId}
        postTitle={promotePostTitle}
      />
      <ShareLinkDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        url={shareDialogUrl}
        title={t("share") || "Share post"}
      />
    </div>
  );
};

export default MyFeedPage;

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
  FaBookmark,
  FaRegBookmark,
  FaEllipsisV,
} from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { getApiOriginBase } from "@/lib/networkConfig";
import {
  buildSavedPostsMap,
  beginSavedPostMutation,
  endSavedPostMutation,
  extractSavedPostIds,
  getSavedPostsMap,
  replaceSavedPostIds,
  setSavedPostStatus,
  subscribeSavedPosts,
} from "@/utils/savedPosts";
import ShareLinkDialog from "@/components/ShareLinkDialog";
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

const MyFeedPage = () => {
  const { t } = useTranslation();
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState("");
  const [loadMoreError, setLoadMoreError] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const postsPerPage = 10;
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const baseUrl = useMemo(() => getApiOriginBase(), []);

  const [expandedPosts, setExpandedPosts] = useState({});
  const [likeCounts, setLikeCounts] = useState({});
  const [viewCounts, setViewCounts] = useState({});
  const [shareToast, setShareToast] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [menuPostId, setMenuPostId] = useState(null);
  const [savedPosts, setSavedPosts] = useState(() => getSavedPostsMap());
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareDialogUrl, setShareDialogUrl] = useState("");
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

  const activeRequestIdRef = useRef(0);
  const fetchAbortControllerRef = useRef(null);
  const loadingGuardRef = useRef(false);
  const scrollTickingRef = useRef(false);
  const shareToastTimeoutRef = useRef(null);

  const userId =
    authUser?.id ||
    authUser?.user_id ||
    localStorage.getItem("userId") ||
    localStorage.getItem("user_id");
  const authToken =
    localStorage.getItem("authToken") || localStorage.getItem("token");
  const isLoggedIn = Boolean(userId && authToken);

  useEffect(
    () => () => {
      if (fetchAbortControllerRef.current) {
        fetchAbortControllerRef.current.abort();
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
      const query = userId
        ? `?userId=${encodeURIComponent(String(userId))}`
        : "";
      const response = await fetch(`${baseUrl}/api/wishlist${query}`, {
        method: "GET",
        credentials: "include",
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      });

      if (!response.ok) {
        return;
      }

      const payload = await response.json();
      const ids = extractSavedPostIds(payload);
      replaceSavedPostIds(ids);
      setSavedPosts(buildSavedPostsMap(ids));
    } catch {
      // Keep local state if sync fails.
    }
  }, [authToken, baseUrl, isLoggedIn, userId]);

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
        const params = new URLSearchParams();
        params.set("page", String(pageToFetch));
        params.set("limit", String(postsPerPage));
        const url = `${baseUrl}/api/feed/mine?${params.toString()}`;
        const res = await fetch(url, {
          signal: abortController.signal,
          credentials: "include",
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        });
        if (!res.ok && res.status !== 404) {
          throw new Error("fetch_failed");
        }

        const data = await res.json();
        const loadedPosts = Array.isArray(data)
          ? data
          : Array.isArray(data.posts)
            ? data.posts
            : [];

        if (requestId !== activeRequestIdRef.current) {
          return;
        }

        if (refresh || pageToFetch === 1) {
          setPosts(loadedPosts);
        } else {
          setPosts((prev) => mergeUniquePosts(prev, loadedPosts));
        }

        const likes = {};
        const views = {};
        loadedPosts.forEach((post) => {
          const id = post.post_id || post.id;
          likes[id] = post.likes || 0;
          views[id] = post.views_count || post.views || 0;
        });
        setLikeCounts((prev) => (refresh ? likes : { ...prev, ...likes }));
        setViewCounts((prev) => (refresh ? views : { ...prev, ...views }));
        setCurrentPage(pageToFetch);
        setHasMore(loadedPosts.length === postsPerPage);
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
    [authToken, baseUrl, postsPerPage, userId],
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

  // Pull-to-refresh for mobile
  const { pullIndicator } = usePullToRefresh({
    onRefresh: () => fetchPosts({ page: 1, refresh: true }),
    disabled: !isLoggedIn,
  });

  const toggleExpand = (postId) => {
    setExpandedPosts((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

  const handleRefresh = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    fetchPosts({ page: 1, refresh: true });
  };

  const handleShare = async (postId) => {
    const url = `${window.location.origin}/feed/${postId}`;
    setShareDialogUrl(url);
    setShareDialogOpen(true);
    try {
      await fetch(`${baseUrl}/api/posts/${postId}/share`, {
        method: "POST",
        credentials: "include",
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      });
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
      const response = nextSaved
        ? await fetch(`${baseUrl}/api/wishlist`, {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
            },
            body: JSON.stringify({ postId: mutationId }),
          })
        : await fetch(`${baseUrl}/api/wishlist/${mutationId}`, {
            method: "DELETE",
            credentials: "include",
            headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
          });
      if (!response.ok) {
        throw new Error("save_failed");
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
      const res = await fetch(`${baseUrl}/api/posts/${postId}`, {
        method: "DELETE",
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("delete_failed");
      }
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-600 via-emerald-600 to-teal-700">
        <div className="w-full max-w-md p-4 page-shell page-pad">
          <PageAuthGateState
            title={t("my_feed") || "My Feed"}
            description={t("view_manage_posts") || "View and manage your posts"}
            className="bg-white/95"
            marker="auth-gate"
            primaryAction={
              <Link
                to="/login?returnTo=%2Fmy-feed"
                className="bg-emerald-600 text-white px-4 py-2 rounded-md font-semibold text-center hover:bg-emerald-700"
              >
                {t("login_to_continue") || "Login to Continue"}
              </Link>
            }
            secondaryAction={
              <Link
                to="/signup?returnTo=%2Fmy-feed"
                className="border border-emerald-300 text-emerald-700 px-4 py-2 rounded-md font-semibold text-center hover:bg-emerald-50"
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
    <div className="bg-gradient-to-b from-green-50 to-white dark:from-gray-900 dark:to-gray-800 min-h-screen nav-clearance">
      {pullIndicator}
      <div className="w-full bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 dark:from-green-800 dark:via-emerald-800 dark:to-teal-800">
        <div className="max-w-3xl mx-auto px-4 py-8 page-shell page-pad">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                <FaNewspaper className="text-3xl text-white/90" />
                <h1 className="text-2xl md:text-3xl font-bold text-white">
                  {t("my_feed") || "My Feed"}
                </h1>
              </div>
              <p className="text-white/70 text-sm">
                {t("your_posts") || "Your posts and updates"}
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleRefresh}
                variant="outline"
                className="bg-transparent border-2 border-white/50 text-white hover:bg-white/10 font-bold px-4 py-3 rounded-xl"
                disabled={loading}
              >
                {t("refresh") || "Refresh"}
              </Button>
              <Button
                onClick={() => navigate("/feed/feedpostadd")}
                className="bg-white text-green-600 hover:bg-green-50 font-bold px-6 py-3 rounded-xl shadow-lg flex items-center gap-2"
              >
                <FaPlus /> {t("new_post") || "New Post"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 page-shell page-pad">
        <UpsellBanner trigger="feed" className="mb-4" />
        <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border flex items-center justify-between">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {displayPosts.length}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {t("loaded_posts") || "Loaded posts"}
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {displayViewTotal}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {t("loaded_views") || "Loaded views"}
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-500">
              {displayLikeTotal}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {t("loaded_likes") || "Loaded likes"}
            </div>
          </div>
        </div>
        <p className="-mt-3 mb-6 text-center text-xs text-gray-500 dark:text-gray-400">
          {t("my_feed_stats_loaded_note") ||
            "Stats reflect the posts currently loaded on this page."}
        </p>

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
                  className="border-green-300 text-green-700"
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
                    className="bg-green-600 text-white"
                  >
                    <FaPlus className="mr-2" />{" "}
                    {t("create_first") || "Create Your First Post"}
                  </Button>
                  <Button
                    variant="outline"
                    className="border-green-300 text-green-700"
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
              const isExpanded = expandedPosts[postId];
              const description = post.description || "";
              const isLong = description.length > 250;

              return (
                <Card
                  key={postId}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border overflow-hidden hover:shadow-md transition"
                >
                  <div className="flex items-start gap-2 px-5 pt-4 pb-2 relative min-w-0 flex-nowrap">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500">
                        <AvatarFallback className="text-white font-bold">
                          {post.user?.name?.[0] || "Y"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <span className="font-semibold text-gray-900 dark:text-white truncate">
                          {t("you") || "You"}
                        </span>
                        <div className="text-gray-400 text-xs">
                          {timeAgo(post.created_at)}
                        </div>
                        <div className="mt-1">
                          <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-[11px] font-semibold text-gray-600 dark:text-gray-200">
                            Post ID: {postId}
                          </span>
                        </div>
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
                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition"
                        title={t("more_options")}
                      >
                        <FaEllipsisV className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(postId)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition"
                        title={t("delete") || "Delete"}
                      >
                        <FaTrash className="w-4 h-4" />
                      </button>
                    </div>

                    {menuPostId === String(postId) && (
                      <div className="absolute right-5 top-12 z-20 w-44 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg p-1">
                        <button
                          type="button"
                          onClick={() => {
                            handleShare(postId);
                            setMenuPostId(null);
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        >
                          {t("share") || "Share"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            toggleSaveMyFeed(postId);
                            setMenuPostId(null);
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        >
                          {savedPosts[String(postId)]
                            ? t("saved") || "Saved"
                            : t("save") || "Save"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteConfirm(postId);
                            setMenuPostId(null);
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
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
                        className="w-full max-h-48 object-cover rounded-xl border border-gray-100 dark:border-gray-700"
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                      />
                    </div>
                  )}

                  <div className="px-5 pb-4">
                    {/* Category badge */}
                    {(post.category_name || post.category) && (
                      <span className="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-[11px] font-semibold text-green-700 dark:text-green-300 mb-2">
                        {post.category_name || post.category}
                      </span>
                    )}
                    {post.title && (
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                        {post.title}
                      </h3>
                    )}

                    <div className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                      {isLong && !isExpanded ? (
                        <>
                          {description.slice(0, 250)}...
                          <button
                            onClick={() => toggleExpand(postId)}
                            className="text-green-600 dark:text-green-400 font-medium hover:underline ml-1"
                          >
                            {t("view_more") || "View more"}
                          </button>
                        </>
                      ) : (
                        <>
                          {description || (
                            <span className="italic text-gray-400">
                              {t("no_content") || "No content"}
                            </span>
                          )}
                          {isLong && isExpanded && (
                            <button
                              onClick={() => toggleExpand(postId)}
                              className="text-green-600 dark:text-green-400 font-medium hover:underline ml-1 block mt-2"
                            >
                              {t("view_less") || "View less"}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="px-3 py-2.5 border-t bg-gray-50 dark:bg-gray-800/50">
                    <div className="post-action-row flex flex-nowrap items-center gap-1 overflow-x-auto whitespace-nowrap pr-1 text-[11px] sm:text-xs scrollbar-hide sm:gap-2">
                      <span className="inline-flex h-7 items-center gap-1 rounded-full bg-red-50 px-2 text-red-500">
                        <FaHeart /> {likeCounts[postId] || 0}
                      </span>
                      <span className="inline-flex h-7 items-center gap-1 rounded-full bg-gray-100 px-2 text-gray-500 dark:bg-gray-700 dark:text-gray-300">
                        <FaEye /> {viewCounts[postId] || 0}
                      </span>

                      <Button
                        variant="ghost"
                        className="shrink-0 h-7 rounded-full bg-gray-100 dark:bg-gray-700 px-2 text-[11px] sm:text-xs text-gray-600 dark:text-gray-200 hover:text-green-600"
                        onClick={() => handleShare(postId)}
                      >
                        <FaShare className="mr-1" />
                        <span className="hidden sm:inline">
                          {t("share") || "Share"}
                        </span>
                      </Button>
                      <Button
                        variant="ghost"
                        className="shrink-0 h-7 rounded-full bg-gray-100 dark:bg-gray-700 px-2 text-[11px] sm:text-xs text-gray-600 dark:text-gray-200 hover:text-green-600"
                        onClick={() => toggleSaveMyFeed(postId)}
                      >
                        {savedPosts[String(postId)] ? (
                          <FaBookmark className="mr-1 text-green-600" />
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
                        className="shrink-0 h-7 rounded-full bg-gray-100 dark:bg-gray-700 px-2 text-[11px] sm:text-xs text-green-600 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/30 font-medium"
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
              className="border border-amber-300 bg-amber-50 text-amber-900 p-4"
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
                  className="border-amber-400 text-amber-900"
                  onClick={handleLoadMoreRetry}
                >
                  {t("retry_loading_more") || "Retry loading more"}
                </Button>
              </div>
            </Card>
          )}

          {!hasMore && displayPosts.length > 0 && (
            <div className="text-center py-6 text-gray-400 text-sm">
              {t("thats_all") || "That's all your posts"}
            </div>
          )}
        </div>
      </div>

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full shadow-xl page-shell page-pad">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              {t("delete_post") || "Delete Post?"}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
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
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                onClick={() => handleDelete(deleteConfirm)}
              >
                {t("delete") || "Delete"}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {shareToast && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg z-50">
          {shareToast}
        </div>
      )}

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

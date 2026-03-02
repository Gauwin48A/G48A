import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { FaHeart, FaShare, FaEye, FaPlus, FaNewspaper, FaTrash } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { getApiOriginBase } from '@/lib/networkConfig';
import {
  PageAuthGateState,
  PageEmptyState,
  PageErrorState,
  PageLoadingState
} from '@/components/page-state/PageStateBlocks';

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
  const [error, setError] = useState('');
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
  const [shareToast, setShareToast] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const activeRequestIdRef = useRef(0);
  const fetchAbortControllerRef = useRef(null);
  const loadingGuardRef = useRef(false);
  const scrollTickingRef = useRef(false);
  const shareToastTimeoutRef = useRef(null);

  const userId = authUser?.id || authUser?.user_id || localStorage.getItem('userId') || localStorage.getItem('user_id');
  const authToken = localStorage.getItem('authToken') || localStorage.getItem('token');
  const isLoggedIn = Boolean(userId && authToken);

  useEffect(() => () => {
    if (fetchAbortControllerRef.current) {
      fetchAbortControllerRef.current.abort();
    }
    if (shareToastTimeoutRef.current) {
      clearTimeout(shareToastTimeoutRef.current);
    }
  }, []);

  const showToast = useCallback((message) => {
    setShareToast(message);
    if (shareToastTimeoutRef.current) {
      clearTimeout(shareToastTimeoutRef.current);
    }
    shareToastTimeoutRef.current = setTimeout(() => {
      setShareToast('');
      shareToastTimeoutRef.current = null;
    }, 2000);
  }, []);

  const fetchPosts = useCallback(async ({ page = 1, refresh = false } = {}) => {
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
    setError('');

    try {
      const url = `${baseUrl}/api/posts?author=${encodeURIComponent(userId)}&page=${pageToFetch}&limit=${postsPerPage}`;
      const res = await fetch(url, {
        signal: abortController.signal,
        credentials: 'include',
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
      });
      if (!res.ok) {
        throw new Error('fetch_failed');
      }

      const data = await res.json();
      const loadedPosts = Array.isArray(data.posts) ? data.posts : [];

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
      setLikeCounts((prev) => (refresh ? likes : ({ ...prev, ...likes })));
      setViewCounts((prev) => (refresh ? views : ({ ...prev, ...views })));
      setHasMore(loadedPosts.length === postsPerPage);
    } catch (err) {
      if (err?.name === 'AbortError') {
        return;
      }
      if (requestId !== activeRequestIdRef.current) {
        return;
      }
      setError('Unable to load your feed posts right now. Please retry.');
      if (refresh || pageToFetch === 1) {
        setPosts([]);
      }
      setHasMore(false);
    } finally {
      if (fetchAbortControllerRef.current === abortController) {
        fetchAbortControllerRef.current = null;
      }
      if (requestId === activeRequestIdRef.current) {
        loadingGuardRef.current = false;
        setLoading(false);
      }
    }
  }, [authToken, baseUrl, postsPerPage, userId]);

  useEffect(() => {
    if (!isLoggedIn) {
      return;
    }
    fetchPosts({ page: 1, refresh: true });
  }, [fetchPosts, isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn || currentPage <= 1) {
      return;
    }
    fetchPosts({ page: currentPage });
  }, [currentPage, fetchPosts, isLoggedIn]);

  const loadMorePosts = useCallback(() => {
    if (loadingGuardRef.current || !hasMore) {
      return;
    }
    loadingGuardRef.current = true;
    setCurrentPage((prev) => prev + 1);
  }, [hasMore]);

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

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => {
      window.removeEventListener('scroll', handleScroll);
      scrollTickingRef.current = false;
    };
  }, [isLoggedIn, loadMorePosts]);

  const toggleExpand = (postId) => {
    setExpandedPosts((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

  const handleRefresh = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    fetchPosts({ page: 1, refresh: true });
  };

  const handleShare = async (postId) => {
    const url = `${window.location.origin}/feed/${postId}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast('Link copied.');
    } catch {
      showToast('Unable to copy link.');
    }
  };

  const handleDelete = async (postId) => {
    try {
      const res = await fetch(`${baseUrl}/api/posts/${postId}`, {
        method: 'DELETE',
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        credentials: 'include'
      });
      if (!res.ok) {
        throw new Error('delete_failed');
      }
      setPosts((prev) => prev.filter((post) => (post.post_id || post.id) !== postId));
      setDeleteConfirm(null);
      showToast('Post deleted.');
    } catch {
      showToast('Unable to delete this post. Please retry.');
    }
  };

  const handleViewDetails = (postId) => {
    const postObj = posts.find((p) => p.id === postId || p.post_id === postId);
    navigate(`/feed/${postId}`, { state: { post: postObj } });
  };

  const timeAgo = (dateString) => {
    if (!dateString) {
      return '';
    }
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now - date;
    const mins = Math.floor(diffMs / 60000);
    const hrs = Math.floor(diffMs / 3600000);
    const days = Math.floor(diffMs / 86400000);

    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hrs < 24) return `${hrs}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-600 via-emerald-600 to-teal-700">
        <div className="w-full max-w-md p-4">
          <PageAuthGateState
            title={t('my_feed') || 'My Feed'}
            description={t('view_manage_posts') || 'View and manage your posts'}
            className="bg-white/95"
            marker="auth-gate"
            primaryAction={(
              <Link
                to="/login?returnTo=%2Fmy-feed"
                className="bg-emerald-600 text-white px-4 py-2 rounded-md font-semibold text-center hover:bg-emerald-700"
              >
                {t('login_to_continue') || 'Login to Continue'}
              </Link>
            )}
            secondaryAction={(
              <Link
                to="/signup?returnTo=%2Fmy-feed"
                className="border border-emerald-300 text-emerald-700 px-4 py-2 rounded-md font-semibold text-center hover:bg-emerald-50"
              >
                {t('create_account') || 'Create Account'}
              </Link>
            )}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-green-50 to-white dark:from-gray-900 dark:to-gray-800 min-h-screen">
      <div className="w-full bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 dark:from-green-800 dark:via-emerald-800 dark:to-teal-800">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                <FaNewspaper className="text-3xl text-white/90" />
                <h1 className="text-2xl md:text-3xl font-bold text-white">
                  {t('my_feed') || 'My Feed'}
                </h1>
              </div>
              <p className="text-white/70 text-sm">
                {t('your_posts') || 'Your posts and updates'}
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleRefresh}
                variant="outline"
                className="bg-transparent border-2 border-white/50 text-white hover:bg-white/10 font-bold px-4 py-3 rounded-xl"
                disabled={loading}
              >
                Refresh
              </Button>
              <Button
                onClick={() => navigate('/feed/feedpostadd')}
                className="bg-white text-green-600 hover:bg-green-50 font-bold px-6 py-3 rounded-xl shadow-lg flex items-center gap-2"
              >
                <FaPlus /> {t('new_post') || 'New Post'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border flex items-center justify-between">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{posts.length}</div>
            <div className="text-xs text-gray-500">{t('posts') || 'Posts'}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {Object.values(viewCounts).reduce((a, b) => a + b, 0)}
            </div>
            <div className="text-xs text-gray-500">{t('total_views') || 'Total Views'}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-500">
              {Object.values(likeCounts).reduce((a, b) => a + b, 0)}
            </div>
            <div className="text-xs text-gray-500">{t('total_likes') || 'Total Likes'}</div>
          </div>
        </div>

        <div className="space-y-4">
          {loading && currentPage === 1 ? (
            <PageLoadingState
              title={t('loading') || 'Loading...'}
              description={t('my_feed_loading_desc') || 'Loading your feed posts.'}
              marker="loading"
            />
          ) : error ? (
            <PageErrorState
              title="Unable to load your feed"
              description={error}
              onRetry={() => fetchPosts({ page: 1, refresh: true })}
              retryLabel="Retry"
              marker="error"
              secondaryAction={(
                <Button variant="outline" className="border-green-300 text-green-700" onClick={() => navigate('/feed')}>
                  Open public feed
                </Button>
              )}
            />
          ) : posts.length === 0 ? (
            <PageEmptyState
              title={t('no_posts_yet') || "You haven't posted anything yet"}
              description={t('share_first') || 'Share your first update with the community.'}
              icon={FaNewspaper}
              marker="empty"
              action={(
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button onClick={() => navigate('/feed/feedpostadd')} className="bg-green-600 text-white">
                    <FaPlus className="mr-2" /> {t('create_first') || 'Create Your First Post'}
                  </Button>
                  <Button variant="outline" className="border-green-300 text-green-700" onClick={() => navigate('/feed')}>
                    Browse feed
                  </Button>
                </div>
              )}
            />
          ) : (
            posts.map((post) => {
              const postId = post.post_id || post.id;
              const isExpanded = expandedPosts[postId];
              const description = post.description || '';
              const isLong = description.length > 250;

              return (
                <Card
                  key={postId}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border overflow-hidden hover:shadow-md transition"
                >
                  <div className="flex items-center justify-between px-5 pt-5 pb-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500">
                        <AvatarFallback className="text-white font-bold">
                          {post.user?.name?.[0] || 'Y'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {t('you') || 'You'}
                        </span>
                        <div className="text-gray-400 text-xs">
                          {timeAgo(post.created_at)}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setDeleteConfirm(postId)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition"
                        title={t('delete') || 'Delete'}
                      >
                        <FaTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="px-5 pb-4">
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
                            {t('view_more') || 'View more'}
                          </button>
                        </>
                      ) : (
                        <>
                          {description || <span className="italic text-gray-400">No content</span>}
                          {isLong && isExpanded && (
                            <button
                              onClick={() => toggleExpand(postId)}
                              className="text-green-600 dark:text-green-400 font-medium hover:underline ml-1 block mt-2"
                            >
                              {t('view_less') || 'View less'}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between px-5 py-3 border-t bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex gap-5 text-sm">
                      <span className="flex items-center gap-1 text-red-500">
                        <FaHeart /> {likeCounts[postId] || 0}
                      </span>
                      <span className="flex items-center gap-1 text-gray-400">
                        <FaEye /> {viewCounts[postId] || 0}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        className="text-gray-500 hover:text-green-600 text-sm"
                        onClick={() => handleShare(postId)}
                      >
                        <FaShare className="mr-1" /> {t('share') || 'Share'}
                      </Button>
                      <Button
                        variant="ghost"
                        className="text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 font-medium text-sm"
                        onClick={() => handleViewDetails(postId)}
                      >
                        {t('view') || 'View'}
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })
          )}

          {loading && currentPage > 1 && (
            <div className="text-center py-4">
              <div className="w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          )}

          {!hasMore && posts.length > 0 && (
            <div className="text-center py-6 text-gray-400 text-sm">
              {t('thats_all') || "That's all your posts"}
            </div>
          )}
        </div>
      </div>

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              {t('delete_post') || 'Delete Post?'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
              {t('delete_confirm') || 'This action cannot be undone.'}
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setDeleteConfirm(null)}
              >
                {t('cancel') || 'Cancel'}
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                onClick={() => handleDelete(deleteConfirm)}
              >
                {t('delete') || 'Delete'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {shareToast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg z-50">
          {shareToast}
        </div>
      )}
    </div>
  );
};

export default MyFeedPage;

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { FaHeart, FaRegHeart, FaShare, FaEye, FaPlus, FaNewspaper, FaTrash, FaEdit } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const MyFeedPage = () => {
  const { t } = useTranslation();
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const postsPerPage = 10;
  const navigate = useNavigate();

  const [expandedPosts, setExpandedPosts] = useState({});
  const [likeCounts, setLikeCounts] = useState({});
  const [viewCounts, setViewCounts] = useState({});
  const [shareToast, setShareToast] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Get userId from multiple possible keys
  const userId = localStorage.getItem('userId') || localStorage.getItem('user_id');
  const isLoggedIn = !!(userId || localStorage.getItem('authToken') || localStorage.getItem('token'));

  // Fetch user's own feed posts
  useEffect(() => {
    if (!userId) return;

    setLoading(true);
    setError(null);
    const fetchPosts = async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
        const url = `${baseUrl}/api/posts?author=${userId}&page=${currentPage}&limit=${postsPerPage}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch your posts');
        const data = await res.json();
        let loadedPosts = Array.isArray(data.posts) ? data.posts : [];

        if (currentPage === 1) {
          setPosts(loadedPosts);
        } else {
          setPosts(prev => [...prev, ...loadedPosts]);
        }

        const likes = {};
        const views = {};
        loadedPosts.forEach(post => {
          const id = post.post_id || post.id;
          likes[id] = post.likes || 0;
          views[id] = post.views_count || post.views || 0;
        });
        setLikeCounts(prev => ({ ...prev, ...likes }));
        setViewCounts(prev => ({ ...prev, ...views }));
        setHasMore(loadedPosts.length === postsPerPage);
      } catch (err) {
        setError(err.message);
        setPosts([]);
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, [userId, currentPage]);

  // Infinite scroll
  const loadMorePosts = useCallback(() => {
    if (loading || !hasMore) return;
    setCurrentPage(prev => prev + 1);
  }, [loading, hasMore]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 1000) {
        loadMorePosts();
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadMorePosts]);

  // Toggle expand
  const toggleExpand = (postId) => {
    setExpandedPosts(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  // Share handler
  const handleShare = async (postId) => {
    const url = `${window.location.origin}/feed/${postId}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareToast('Link copied!');
      setTimeout(() => setShareToast(''), 2000);
    } catch {
      setShareToast('Failed to copy');
      setTimeout(() => setShareToast(''), 2000);
    }
  };

  // Delete post
  const handleDelete = async (postId) => {
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const res = await fetch(`${baseUrl}/api/posts/${postId}`, {
        method: 'DELETE',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to delete');
      setPosts(prev => prev.filter(p => (p.post_id || p.id) !== postId));
      setDeleteConfirm(null);
      setShareToast('Post deleted!');
      setTimeout(() => setShareToast(''), 2000);
    } catch (err) {
      setShareToast('Failed to delete post');
      setTimeout(() => setShareToast(''), 2000);
    }
  };

  // View full post
  const handleViewDetails = (postId) => {
    const postObj = posts.find(p => p.id === postId || p.post_id === postId);
    navigate(`/feed/${postId}`, { state: { post: postObj } });
  };

  // Format time ago
  const timeAgo = (dateString) => {
    if (!dateString) return '';
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

  // If not logged in, show login prompt
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
          <FaNewspaper className="text-5xl text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {t('login_required') || 'Login Required'}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {t('login_to_see_posts') || 'Please login to see your feed posts'}
          </p>
          <div className="flex gap-3 justify-center">
            <Button
              onClick={() => navigate('/login')}
              className="bg-green-600 hover:bg-green-700 text-white px-6"
            >
              {t('login') || 'Login'}
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/feed')}
              className="border-green-300 text-green-600"
            >
              {t('browse_feed') || 'Browse Feed'}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-green-50 to-white dark:from-gray-900 dark:to-gray-800 min-h-screen">
      {/* Header */}
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

            <Button
              onClick={() => navigate('/feed/feedpostadd')}
              className="bg-white text-green-600 hover:bg-green-50 font-bold px-6 py-3 rounded-xl shadow-lg flex items-center gap-2"
            >
              <FaPlus /> {t('new_post') || 'New Post'}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-6">

        {/* Stats */}
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

        {/* Posts */}
        <div className="space-y-4">
          {loading && currentPage === 1 ? (
            <div className="text-center py-12">
              <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-gray-500">{t('loading') || 'Loading...'}</p>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-500">{error}</div>
          ) : posts.length === 0 ? (
            <Card className="p-8 text-center bg-white dark:bg-gray-800 rounded-2xl border-2 border-dashed">
              <FaNewspaper className="text-5xl text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">{t('no_posts_yet') || "You haven't posted anything yet"}</p>
              <p className="text-gray-400 text-sm mb-4">{t('share_first') || 'Share your first update with the community!'}</p>
              <Button onClick={() => navigate('/feed/feedpostadd')} className="bg-green-600 text-white">
                <FaPlus className="mr-2" /> {t('create_first') || 'Create Your First Post'}
              </Button>
            </Card>
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
                  {/* Header with Edit/Delete */}
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

                    {/* Edit/Delete Actions */}
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

                  {/* Content */}
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

                  {/* Stats */}
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
              <div className="w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          )}

          {!hasMore && posts.length > 0 && (
            <div className="text-center py-6 text-gray-400 text-sm">
              {t('thats_all') || "That's all your posts"}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
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

      {/* Toast */}
      {shareToast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg z-50">
          {shareToast}
        </div>
      )}
    </div>
  );
};

export default MyFeedPage;

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { FaHeart, FaRegHeart, FaShare, FaEye, FaPlus, FaNewspaper, FaUser } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LoginPromptModal from '@/components/LoginPromptModal';
import { translatePosts } from '@/utils/translateContent';

const GUEST_POST_LIMIT = 5; // Limit posts for non-logged-in users

const FeedPage = () => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const postsPerPage = 10;
  const navigate = useNavigate();

  const [expandedPosts, setExpandedPosts] = useState({});
  const [likedPosts, setLikedPosts] = useState({});
  const [likeCounts, setLikeCounts] = useState({});
  const [viewCounts, setViewCounts] = useState({});
  const [shareToast, setShareToast] = useState("");
  const [isShuffling, setIsShuffling] = useState(false); // Chaos Engine shuffle state

  // Guest user restrictions
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Check login status on mount
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const userId = localStorage.getItem('userId');
    setIsLoggedIn(!!(token && userId));
  }, []);

  // Fetch feed posts
  useEffect(() => {
    setLoading(true);
    setError(null);
    const fetchPosts = async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
        // Add shuffle sort and cache buster to ensure fresh content on every refresh
        const cacheBuster = Date.now();
        const url = `${baseUrl}/api/posts?page=${currentPage}&limit=${postsPerPage}&sortBy=shuffle&_t=${cacheBuster}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch feed');
        const data = await res.json();
        let loadedPosts = Array.isArray(data.posts) ? data.posts : [];

        // Translate posts to current language
        if (currentLang && currentLang !== 'en') {
          loadedPosts = await translatePosts(loadedPosts, currentLang);
        }

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
  }, [currentPage, currentLang]);

  // CHAOS ENGINE: Shuffle feed with high-performance random query
  const handleShuffle = useCallback(async () => {
    setIsShuffling(true);
    setError(null);
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      const cacheBuster = Date.now();
      const res = await fetch(`${baseUrl}/api/feed/random?limit=20&_t=${cacheBuster}`);
      if (!res.ok) throw new Error('Failed to shuffle');
      const data = await res.json();
      let shuffledPosts = Array.isArray(data.posts) ? data.posts : [];

      // Translate if needed
      if (currentLang && currentLang !== 'en') {
        shuffledPosts = await translatePosts(shuffledPosts, currentLang);
      }

      setPosts(shuffledPosts);
      setCurrentPage(1);
      setHasMore(shuffledPosts.length >= 10);

      // Update counts
      const likes = {};
      const views = {};
      shuffledPosts.forEach(post => {
        const id = post.post_id || post.id;
        likes[id] = post.likes_count || post.likes || 0;
        views[id] = post.views_count || post.views || 0;
      });
      setLikeCounts(likes);
      setViewCounts(views);

      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
      console.log(`[Chaos Engine] Shuffled ${shuffledPosts.length} posts in ${data.queryTimeMs}ms (${data.engine})`);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsShuffling(false);
    }
  }, [currentLang]);

  // Infinite scroll
  const loadMorePosts = useCallback(() => {
    if (loading || !hasMore) return;
    setCurrentPage(prev => prev + 1);
  }, [loading, hasMore]);

  useEffect(() => {
    const handleScroll = () => {
      // For guests, show login modal when scrolling past limit
      if (!isLoggedIn) {
        if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 200) {
          setShowLoginModal(true);
        }
        return;
      }
      if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 1000) {
        loadMorePosts();
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadMorePosts, isLoggedIn]);

  // Toggle expand for long descriptions
  const toggleExpand = (postId) => {
    setExpandedPosts(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  // Like handler
  const handleLike = async (postId) => {
    const alreadyLiked = likedPosts[postId];
    setLikedPosts(prev => ({ ...prev, [postId]: !prev[postId] }));
    setLikeCounts(prev => ({ ...prev, [postId]: (prev[postId] || 0) + (alreadyLiked ? -1 : 1) }));
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      await fetch(`${baseUrl}/api/posts/${postId}/like`, { method: 'POST', credentials: 'include' });
    } catch { }
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

  // View full post
  const handleViewDetails = (postId) => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    const postObj = posts.find(p => p.id === postId || p.post_id === postId);
    fetch(`${baseUrl}/api/posts/${postId}/view`, { method: 'POST', credentials: 'include' }).catch(() => { });
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

  return (
    <div className="bg-gradient-to-b from-slate-50 to-white dark:from-gray-900 dark:to-gray-800 min-h-screen">
      {/* Header */}
      <div className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 dark:from-indigo-800 dark:via-purple-800 dark:to-blue-800">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                <FaNewspaper className="text-3xl text-white/90" />
                <h1 className="text-2xl md:text-3xl font-bold text-white">
                  {t('news_updates') || 'News & Updates'}
                </h1>
              </div>
              <p className="text-white/70 text-sm">
                {t('share_knowledge') || 'Share knowledge, news, and updates with the community'}
              </p>
            </div>

            {/* Action buttons - visible for all users */}
            <div className="flex gap-3">
              {/* CHAOS ENGINE: Shuffle Button */}
              <Button
                onClick={handleShuffle}
                disabled={isShuffling}
                variant="outline"
                className="bg-transparent border-2 border-yellow-400/70 text-yellow-300 hover:bg-yellow-400/20 font-bold px-4 py-3 rounded-xl flex items-center gap-2"
              >
                {isShuffling ? (
                  <><span className="animate-spin">🔄</span> Shuffling...</>
                ) : (
                  <>🎰 Shuffle</>
                )}
              </Button>

              <Button
                onClick={() => navigate('/my-feed')}
                variant="outline"
                className="bg-transparent border-2 border-white/50 text-white hover:bg-white/10 font-bold px-4 py-3 rounded-xl flex items-center gap-2"
              >
                <FaUser /> {t('my_feed') || 'My Feed'}
              </Button>
              {isLoggedIn && (
                <Button
                  onClick={() => navigate('/feed/feedpostadd')}
                  className="bg-white text-indigo-600 hover:bg-indigo-50 font-bold px-6 py-3 rounded-xl shadow-lg flex items-center gap-2"
                >
                  <FaPlus /> {t('share_update') || 'Share Update'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-6">

        {/* Quick Post - Only show for logged-in users */}
        {isLoggedIn && (
          <Card
            className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border cursor-pointer hover:shadow-md transition"
            onClick={() => navigate('/feed/feedpostadd')}
          >
            <div className="flex items-center gap-4">
              <Avatar className="w-11 h-11 bg-indigo-100 dark:bg-indigo-900">
                <AvatarFallback className="text-indigo-600 dark:text-indigo-300 font-bold">
                  {localStorage.getItem('username')?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full px-5 py-3 text-gray-400">
                {t('share_something') || "Share something with the community..."}
              </div>
            </div>
          </Card>
        )}

        {/* Posts */}
        <div className="space-y-4">
          {loading && currentPage === 1 ? (
            <div className="text-center py-12">
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-gray-500">{t('loading') || 'Loading...'}</p>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-500">{error}</div>
          ) : posts.length === 0 ? (
            <Card className="p-8 text-center bg-white dark:bg-gray-800 rounded-2xl border-2 border-dashed">
              <FaNewspaper className="text-5xl text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">{t('no_posts') || 'No posts yet. Be the first to share!'}</p>
              {isLoggedIn && (
                <Button onClick={() => navigate('/feed/feedpostadd')} className="bg-indigo-600 text-white">
                  {t('create_post') || 'Create Post'}
                </Button>
              )}
            </Card>
          ) : (
            (isLoggedIn ? posts : posts.slice(0, GUEST_POST_LIMIT)).map((post) => {
              const postId = post.post_id || post.id;
              const isExpanded = expandedPosts[postId];
              const description = post.description || '';
              const isLong = description.length > 250;

              return (
                <Card
                  key={postId}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border overflow-hidden hover:shadow-md transition"
                >
                  {/* Author */}
                  <div className="flex items-center gap-3 px-5 pt-5 pb-3">
                    <Avatar className="w-11 h-11 bg-gradient-to-br from-indigo-400 to-purple-500">
                      <AvatarFallback className="text-white font-bold">
                        {post.user?.name?.[0] || post.username?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {post.user?.name || post.username || 'Anonymous'}
                      </span>
                      <div className="text-gray-400 text-xs flex items-center gap-2">
                        <span>{post.location || 'Global'}</span>
                        <span>•</span>
                        <span>{timeAgo(post.created_at)}</span>
                      </div>
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
                            className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline ml-1"
                          >
                            {t('view_more') || 'View more'}
                          </button>
                        </>
                      ) : (
                        <>
                          {description || <span className="italic text-gray-400">{t('no_content')}</span>}
                          {isLong && isExpanded && (
                            <button
                              onClick={() => toggleExpand(postId)}
                              className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline ml-1 block mt-2"
                            >
                              {t('view_less') || 'View less'}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between px-5 py-3 border-t bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex gap-5">
                      <button
                        className="flex items-center gap-2 text-gray-500 hover:text-red-500 transition font-medium text-sm"
                        onClick={() => handleLike(postId)}
                      >
                        {likedPosts[postId] ? <FaHeart className="text-red-500" /> : <FaRegHeart />}
                        <span>{likeCounts[postId] || 0}</span>
                      </button>

                      <button
                        className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 transition font-medium text-sm"
                        onClick={() => handleShare(postId)}
                      >
                        <FaShare />
                        <span>{t('share') || 'Share'}</span>
                      </button>

                      <span className="flex items-center gap-2 text-gray-400 text-sm">
                        <FaEye />
                        <span>{viewCounts[postId] || 0}</span>
                      </span>
                    </div>

                    <Button
                      variant="ghost"
                      className="text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 font-medium text-sm"
                      onClick={() => handleViewDetails(postId)}
                    >
                      {t('view_details') || 'View Details'}
                    </Button>
                  </div>
                </Card>
              );
            })
          )}

          {loading && currentPage > 1 && (
            <div className="text-center py-4">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          )}

          {!hasMore && posts.length > 0 && (
            <div className="text-center py-6 text-gray-400 text-sm">
              {t('end_of_feed') || "You've reached the end"}
            </div>
          )}
        </div>
      </div>

      {shareToast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-6 py-3 rounded-xl shadow-lg z-50">
          {shareToast}
        </div>
      )}

      {/* Login Prompt Modal for Guest Users */}
      <LoginPromptModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </div>
  );
};

export default FeedPage;
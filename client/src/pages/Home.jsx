import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  RefreshCw, TrendingUp, Sparkles, Clock, Eye, Heart,
  MapPin, ChevronRight, Zap, ShoppingBag, Star, AlertTriangle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api'; // Centralized Axios Service

const Home = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [feedPosts, setFeedPosts] = useState([]);
  const [trendingPosts, setTrendingPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // Defensive UI: Error State
  const [refreshing, setRefreshing] = useState(false);
  const [feedMeta, setFeedMeta] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const refreshCooldown = useRef(false);

  // Fetch dynamic feed
  const fetchDynamicFeed = useCallback(async (forceRefresh = false) => {
    if (refreshCooldown.current && !forceRefresh) return;
    setError(null);

    try {
      if (forceRefresh) {
        setRefreshing(true);
        refreshCooldown.current = true;
        setTimeout(() => { refreshCooldown.current = false; }, 3000); // 3s cooldown
      }

      // Always fetch fresh data with cache buster
      const cacheBuster = Date.now();
      const response = await api.get('/api/feed/dynamic', {
        params: { refresh: 'true', limit: 20, _t: cacheBuster }
      });

      setFeedPosts(response.posts || []);
      setFeedMeta(response.feedMeta);
      setLastRefresh(new Date());

      // Track impressions for exploration analytics
      if (response.posts?.length > 0) {
        const postIds = response.posts.map(p => p.post_id);
        api.post('/api/feed/impression', { postIds }).catch(() => { });
      }
    } catch (err) {
      console.error('Feed fetch error:', err);
      setError('Failed to load your feed. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Fetch trending
  const fetchTrending = useCallback(async () => {
    try {
      const response = await api.get('/api/feed/trending');
      setTrendingPosts(response.posts || []);
    } catch (err) {
      console.error('Trending fetch error:', err);
      // Non-critical, don't set global error
    }
  }, []);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      // Replaced raw fetch with centralized api
      const data = await api.get('/api/categories');
      setCategories(Array.isArray(data) ? data.slice(0, 8) : []);
    } catch (err) {
      console.error('Categories fetch error:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    setLoading(true);
    fetchDynamicFeed();
    fetchTrending();
    fetchCategories();
  }, [fetchDynamicFeed, fetchTrending, fetchCategories]);

  // Pull to refresh (simulated with button)
  const handleRefresh = () => {
    if (!refreshCooldown.current) {
      fetchDynamicFeed(true);
    }
  };

  const formatPrice = (price) => {
    if (!price) return '₹ --';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(price);
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
  };

  const getImageUrl = (images) => {
    if (!images) return 'https://via.placeholder.com/300x200?text=No+Image';
    if (Array.isArray(images) && images.length > 0) return images[0];
    if (typeof images === 'string') {
      try {
        const parsed = JSON.parse(images);
        return Array.isArray(parsed) ? parsed[0] : images;
      } catch {
        return images;
      }
    }
    return 'https://via.placeholder.com/300x200?text=No+Image';
  };

  const getPhaseBadge = (phase) => {
    switch (phase) {
      case 'fresh':
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs"><Zap className="h-3 w-3 mr-1" />New</Badge>;
      case 'exploration':
        return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs"><Sparkles className="h-3 w-3 mr-1" />Discover</Badge>;
      default:
        return null;
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-900 p-4">
        <AlertTriangle className="h-16 w-16 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Something went wrong</h2>
        <p className="text-gray-500 mb-6 text-center">{error}</p>
        <Button onClick={() => window.location.reload()} className="bg-blue-600 hover:bg-blue-700">
          Reload Page
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 dark:from-slate-900 dark:via-gray-900 dark:to-slate-900 pb-24">
      {/* Premium Header */}
      <div className="sticky top-0 z-50 bg-gradient-to-r from-white/95 via-gray-50/95 to-white/95 dark:from-slate-900/95 dark:via-gray-900/95 dark:to-slate-900/95 backdrop-blur-xl border-b border-gray-200 dark:border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                For You
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {feedMeta ? `${feedMeta.freshCount} fresh • ${feedMeta.explorationCount} discoveries` : 'Personalized feed'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                disabled={refreshing || refreshCooldown.current}
                className={`text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl ${refreshing ? 'animate-spin' : ''}`}
              >
                <RefreshCw className="h-5 w-5" />
              </Button>
              {lastRefresh && (
                <span className="text-xs text-gray-500 dark:text-gray-500">
                  {formatTimeAgo(lastRefresh)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Categories Scroll */}
      <div className="px-4 py-4 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          <button
            onClick={() => navigate('/all-posts')}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold text-sm shadow-lg shadow-blue-500/25 flex items-center gap-2"
          >
            <ShoppingBag className="h-4 w-4" />
            All Posts
          </button>
          {categories.map(cat => (
            <button
              key={cat.category_id || cat.id}
              onClick={() => navigate(`/all-posts?category=${cat.category_id || cat.id}`)}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300 rounded-xl font-medium text-sm hover:bg-gray-200 dark:hover:bg-gray-700/60 hover:text-gray-900 dark:hover:text-white transition-all border border-gray-200 dark:border-gray-700/50"
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Trending Section */}
      {trendingPosts.length > 0 && (
        <div className="px-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange-400" />
              Trending Now
            </h2>
            <button className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1">
              View All <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {trendingPosts.map((post, idx) => (
              <div
                key={post.post_id}
                onClick={() => navigate(`/post/${post.post_id}`)}
                className="flex-shrink-0 w-40 bg-white dark:bg-gray-800/60 rounded-xl p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-all border border-gray-200 dark:border-gray-700/50 shadow-sm"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-orange-400 font-bold text-lg">#{idx + 1}</span>
                  <TrendingUp className="h-4 w-4 text-orange-400" />
                </div>
                <p className="text-gray-900 dark:text-white text-sm font-medium truncate">{post.title}</p>
                <p className="text-emerald-400 font-bold text-sm mt-1">{formatPrice(post.price)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Feed Grid */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-400" />
            Your Feed
          </h2>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-blue-500/30 rounded-full"></div>
              <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-blue-500 rounded-full animate-spin"></div>
            </div>
            <p className="text-gray-600 dark:text-gray-400">Loading your personalized feed...</p>
          </div>
        ) : feedPosts.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingBag className="h-12 w-12 text-blue-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">No Posts Yet</h3>
            <p className="text-gray-400 mb-8">Be the first to post something amazing!</p>
            <Button
              onClick={() => navigate('/create-post')}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl px-8 py-6 text-lg font-semibold shadow-xl"
            >
              Create Post
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {feedPosts.map((post) => (
              <Card
                key={post.post_id}
                className="group bg-white dark:bg-gradient-to-br dark:from-gray-800/80 dark:to-gray-900/80 border-gray-200 dark:border-gray-700/50 overflow-hidden cursor-pointer hover:border-blue-400 dark:hover:border-blue-500/50 hover:shadow-xl dark:hover:shadow-2xl dark:hover:shadow-blue-500/10 transition-all duration-300 rounded-2xl shadow-sm"
                onClick={() => navigate(`/post/${post.post_id}`)}
              >
                {/* Image */}
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img
                    src={getImageUrl(post.images)}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    onError={(e) => { e.target.src = 'https://via.placeholder.com/300x200?text=No+Image'; }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>

                  {/* Phase Badge */}
                  <div className="absolute top-3 left-3">
                    {getPhaseBadge(post.feed_phase)}
                  </div>

                  {/* Price */}
                  <div className="absolute bottom-3 left-3">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white drop-shadow-lg">
                      {formatPrice(post.price)}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="absolute bottom-3 right-3 flex gap-2">
                    <span className="bg-black/50 backdrop-blur-sm px-2 py-1 rounded-lg text-white text-xs flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {post.views_count || 0}
                    </span>
                    <span className="bg-black/50 backdrop-blur-sm px-2 py-1 rounded-lg text-white text-xs flex items-center gap-1">
                      <Heart className="h-3 w-3" />
                      {post.likes_count || 0}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  {/* Category */}
                  {post.category_name && (
                    <Badge className="mb-2 bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                      {post.category_name}
                    </Badge>
                  )}

                  <h3 className="text-gray-900 dark:text-white font-semibold text-lg truncate mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {post.title}
                  </h3>

                  {/* Seller */}
                  {post.author_name && (
                    <div className="flex items-center gap-2 mb-3">
                      <Avatar className="h-6 w-6 bg-gradient-to-br from-purple-500 to-pink-500">
                        <AvatarFallback className="text-white text-xs font-bold">
                          {post.author_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-gray-400 truncate">
                        {post.author_name}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                      <MapPin className="h-3.5 w-3.5" />
                      {post.location || 'Unknown'}
                    </span>
                    <span className="flex items-center gap-1 text-gray-400 dark:text-gray-500">
                      <Clock className="h-3.5 w-3.5" />
                      {formatTimeAgo(post.created_at)}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;

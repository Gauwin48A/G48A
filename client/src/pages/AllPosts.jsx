import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { FaHeart, FaRegHeart, FaShare, FaEye, FaHandHoldingHeart } from 'react-icons/fa';
import { useNavigate, useLocation } from 'react-router-dom';
import CategoriesGrid from '@/components/CategoriesGrid';
import { useFilter } from '@/context/FilterContext';
import useLocationPermission from '@/hooks/useLocationPermission';
import { useTranslation } from 'react-i18next';
import BuyerInterestModal from '@/components/BuyerInterestModal';

const NAVBAR_HEIGHT = 80;

const AllPosts = () => {
  const { t } = useTranslation();
  const { filters, setFilters } = useFilter();
  const location = useLocation();
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const postsPerPage = 6;
  const navigate = useNavigate();

  // Read category from URL params and update filter
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const categoryFromUrl = urlParams.get('category');
    if (categoryFromUrl) {
      setFilters(prev => ({ ...prev, category: categoryFromUrl }));
    }
  }, [location.search, setFilters]);

  // Handle category click - navigate with category param
  const handleCategoryClick = (categoryName) => {
    navigate(`/all-posts?category=${encodeURIComponent(categoryName)}`);
  };

  // Clear category filter
  const clearCategoryFilter = () => {
    setFilters(prev => ({ ...prev, category: 'All' }));
    navigate('/all-posts');
  };

  // Location permission hook - Request location when component mounts
  const { permissionGranted, isLoading: locationLoading, error: locationError } = useLocationPermission();
  const [expandedPost, setExpandedPost] = useState(null);
  const [likedPosts, setLikedPosts] = useState({});
  const [likeCounts, setLikeCounts] = useState({});
  const [viewCounts, setViewCounts] = useState({});
  const [shareToast, setShareToast] = useState("");
  const [debugUrl, setDebugUrl] = useState("");
  const [showInterestModal, setShowInterestModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);

  // Category ID mapping - MUST match database (00_master_setup.sql lines 233-243)
  const categoryMap = {
    Electronics: 1,
    Mobiles: 2,
    Fashion: 3,
    Furniture: 4,
    Vehicles: 5,
    Books: 6,
    Sports: 7,
    'Home Appliances': 8,
    Beauty: 9,
    Kids: 10,
  };

  // Helper to build filter params
  const buildParams = () => {
    const params = new URLSearchParams();
    // Search (title/description/location)
    if (filters.search) params.append('search', filters.search);
    // Location filter (separate from search)
    if (filters.location) params.append('location', filters.location);
    // Category (map name to ID)
    if (filters.category && filters.category !== 'All') {
      const catId = categoryMap[filters.category] || filters.category;
      params.append('category', catId);
    }
    // Price range - use direct minPrice/maxPrice values
    if (filters.minPrice) params.append('minPrice', filters.minPrice);
    if (filters.maxPrice) params.append('maxPrice', filters.maxPrice);
    // Legacy priceRange support
    if (filters.priceRange && !filters.minPrice && !filters.maxPrice) {
      const [min, max] = filters.priceRange.split('-').map(Number);
      if (!isNaN(min)) params.append('minPrice', min);
      if (!isNaN(max)) params.append('maxPrice', max);
    }

    // Date range
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    // Sorting - match GreenNavbar dropdown values
    if (filters.sortBy) {
      if (filters.sortBy === 'price_asc') {
        params.append('sortBy', 'price');
        params.append('sortOrder', 'asc');
      } else if (filters.sortBy === 'price_desc') {
        params.append('sortBy', 'price');
        params.append('sortOrder', 'desc');
      } else if (filters.sortBy === 'date_desc') {
        params.append('sortBy', 'created_at');
        params.append('sortOrder', 'desc');
      } else if (filters.sortBy === 'date_asc') {
        params.append('sortBy', 'created_at');
        params.append('sortOrder', 'asc');
      } else {
        params.append('sortBy', filters.sortBy);
        params.append('sortOrder', 'desc');
      }
    }
    params.append('page', currentPage);
    params.append('limit', postsPerPage);
    return params;
  };


  // Fetch posts with filters
  useEffect(() => {
    setLoading(true);
    setError(null);
    const fetchPosts = async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
        const params = buildParams();
        const url = `${baseUrl}/api/posts?${params.toString()}`;
        setDebugUrl(url);
        const res = await fetch(url);
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to fetch posts');
        }
        const data = await res.json();
        let loadedPosts = Array.isArray(data.posts) ? data.posts : [];
        // FIX: Append posts on page 2+, replace on page 1 (filter change)
        if (currentPage === 1) {
          setPosts(loadedPosts);
        } else {
          setPosts(prev => [...prev, ...loadedPosts]);
        }
        setError(null);
        // Set like/view counts from backend if available
        const likes = {};
        const views = {};
        loadedPosts.forEach(post => {
          likes[post.post_id || post.id] = post.likes || 0;
          views[post.post_id || post.id] = post.views || 0;
        });
        setLikeCounts(prev => ({ ...prev, ...likes }));
        setViewCounts(prev => ({ ...prev, ...views }));
        setHasMore(loadedPosts.length === postsPerPage);
      } catch (err) {
        setError(err.message || 'Failed to fetch posts');
        setPosts([]);
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, [filters.search, filters.location, filters.category, filters.priceRange, filters.startDate, filters.endDate, filters.sortBy, currentPage]);


  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters.search, filters.location, filters.category, filters.priceRange, filters.startDate, filters.endDate, filters.sortBy]);


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


  // Like handler
  const handleLike = async (postId) => {
    const alreadyLiked = likedPosts[postId];
    setLikedPosts(prev => ({ ...prev, [postId]: !prev[postId] }));
    setLikeCounts(prev => ({ ...prev, [postId]: prev[postId] + (alreadyLiked ? -1 : 1) }));
    try {
      await fetch(`/api/posts/${postId}/like`, { method: 'POST', credentials: 'include' });
    } catch { }
  };


  // View handler
  const handleView = async (postId) => {
    setViewCounts(prev => ({ ...prev, [postId]: (prev[postId] || 0) + 1 }));
    try {
      await fetch(`/api/posts/${postId}/view`, { method: 'POST', credentials: 'include' });
    } catch { }
  };


  // Share handler
  const handleShare = async (postId) => {
    const url = `${window.location.origin}/post/${postId}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareToast('Link copied!');
      setTimeout(() => setShareToast(''), 2000);
      await fetch(`/api/posts/${postId}/share`, { method: 'POST', credentials: 'include' });
    } catch {
      setShareToast('Failed to copy link');
      setTimeout(() => setShareToast(''), 2000);
    }
  };


  // View Details
  const handleViewDetails = (postId) => {
    // Find post object by id
    const postObj = posts.find(p => p.id === postId || p.post_id === postId);
    if (postObj) {
      // Pass post object via state for instant display
      navigate(`/post/${postId}`, { state: { post: postObj } });
    } else {
      navigate(`/post/${postId}`);
    }
  };


  // Sponsored Deals
  const sponsoredDeals = posts.filter(post => post.isSponsored).slice(0, 5);

  // Location is now handled at App.jsx level - no blocking here
  return (
    <div className="bg-white dark:bg-gray-900 min-h-screen transition-colors duration-300">
      {/* Category Filter Bar - all 10 categories with horizontal scroll */}
      <div className="w-full flex justify-center px-4 pt-2 pb-4">
        <div className="flex gap-2 md:gap-4 bg-gradient-to-r from-blue-100 via-white to-blue-100 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 rounded-2xl shadow-lg py-3 px-3 md:px-6 items-center overflow-x-auto scrollbar-hide max-w-full">
          {/* All Categories Button */}
          <button
            onClick={clearCategoryFilter}
            className={`flex flex-col items-center cursor-pointer hover:scale-110 transition px-3 py-2 rounded-xl min-w-[60px] ${filters.category === 'All' ? 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-400' : ''
              }`}
          >
            <span className="text-xl md:text-2xl mb-1">📦</span>
            <span className={`font-semibold text-xs md:text-sm ${filters.category === 'All' ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}>{t('all')}</span>
          </button>

          {/* Dynamic category buttons - all 10 categories */}
          {[
            { name: 'Electronics', emoji: '💻', color: 'blue' },
            { name: 'Mobiles', emoji: '📱', color: 'teal' },
            { name: 'Fashion', emoji: '👗', color: 'pink' },
            { name: 'Furniture', emoji: '🛋️', color: 'amber' },
            { name: 'Vehicles', emoji: '🚗', color: 'red' },
            { name: 'Books', emoji: '📚', color: 'indigo' },
            { name: 'Sports', emoji: '⚽', color: 'green' },
            { name: 'Home Appliances', emoji: '🏠', color: 'orange' },
            { name: 'Beauty', emoji: '💄', color: 'purple' },
            { name: 'Kids', emoji: '🧸', color: 'yellow' },
          ].map(cat => (
            <button
              key={cat.name}
              onClick={() => handleCategoryClick(cat.name)}
              className={`flex flex-col items-center cursor-pointer hover:scale-110 transition px-3 py-2 rounded-xl min-w-[70px] whitespace-nowrap ${filters.category === cat.name ? `bg-${cat.color}-600 text-white shadow-lg ring-2 ring-${cat.color}-400` : ''
                }`}
            >
              <span className="text-xl md:text-2xl mb-1">{cat.emoji}</span>
              <span className={`font-semibold text-xs md:text-sm ${filters.category === cat.name ? 'text-white' : `text-${cat.color}-700 dark:text-${cat.color}-300`}`}>
                {t(cat.name.toLowerCase().replace(' ', '_')) || cat.name}
              </span>
            </button>
          ))}
        </div>
      </div>


      {/* Active Filter Indicator */}
      {filters.category && filters.category !== 'All' && (
        <div className="w-full flex justify-center mb-2">
          <div className="flex items-center gap-2 bg-blue-100 dark:bg-blue-900 px-4 py-2 rounded-full">
            <span className="text-blue-800 dark:text-blue-200 font-medium">{t('showing')}: {filters.category}</span>
            <button
              onClick={clearCategoryFilter}
              className="text-blue-600 dark:text-blue-300 hover:text-red-500 font-bold text-lg"
            >
              ×
            </button>
          </div>
        </div>
      )}
      <div className="h-4 md:h-6" />
      <div className="w-full flex justify-center">
        <div className="flex flex-col md:flex-row items-center justify-between px-3 md:px-8 py-6 md:py-8 bg-blue-100 dark:bg-gray-800 rounded-xl mb-8 shadow-lg w-full max-w-5xl relative overflow-hidden border border-blue-200 dark:border-gray-700 mt-0 md:mt-6">
          <div className="flex flex-col gap-2 z-10 w-full md:w-auto">
            <span className="text-xl md:text-3xl font-bold text-blue-900 dark:text-blue-100 mb-1">{t('great_deals')}</span>
            <span className="text-sm md:text-base text-blue-800 dark:text-blue-200 font-medium mb-2">{t('up_to_off')}</span>
            <Button className="bg-blue-600 text-white font-semibold px-5 md:px-6 py-2 rounded-lg shadow hover:bg-blue-700 transition w-fit text-sm md:text-base">{t('shop_now')}</Button>
          </div>
          <div className="mt-4 md:mt-0 md:ml-8 z-10">
            <div className="w-24 h-16 md:w-32 md:h-24 bg-blue-200 dark:bg-blue-800 rounded-lg flex items-center justify-center">
              <svg width="64" height="48" fill="none" viewBox="0 0 64 48"><rect width="64" height="48" rx="8" fill="#2563eb" /></svg>
            </div>
          </div>
          <div className="absolute right-0 bottom-0 opacity-10 w-32 h-24 md:w-40 md:h-32 bg-blue-300 dark:bg-blue-700 rounded-bl-2xl" />
        </div>
      </div >
      <div className="w-full flex flex-col items-center mb-8">
        <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-3 md:mb-4 w-full max-w-5xl px-3 md:px-0">{t('sponsored_deals')}</h2>
        <div className="flex gap-4 md:gap-6 w-full max-w-5xl overflow-x-auto scrollbar-hide px-3 md:px-0">
          {sponsoredDeals.length === 0 ? (
            <div className="text-center text-blue-400 dark:text-blue-300">{t('no_sponsored_deals')}</div>
          ) : (
            sponsoredDeals.map((post, idx) => (
              <Card key={post.id || post._id || idx} className="rounded-xl shadow bg-white dark:bg-gray-800 border border-blue-100 dark:border-gray-700 flex flex-col items-center p-3 md:p-4 min-w-[160px] max-w-[180px] md:min-w-[200px] md:max-w-[220px]">
                <div className="w-20 h-20 md:w-24 md:h-24 bg-gray-100 dark:bg-gray-700 rounded mb-2 flex items-center justify-center">
                  <span className="text-gray-400 dark:text-gray-500">Image</span>
                </div>
                <div className="font-semibold text-gray-800 dark:text-white text-xs md:text-base text-center mb-1 line-clamp-2">{post.title}</div>
                <div className="text-yellow-500 text-xs mb-1">★★★★★</div>
                <div className="text-blue-900 dark:text-blue-300 text-base md:text-lg font-bold mb-1">₹{post.price}</div>
                <Button className="bg-blue-600 text-white w-full mt-1 md:mt-2 text-xs md:text-sm py-1 md:py-2" onClick={() => navigate(`/post/${post.id}`)}>View</Button>
              </Card>
            ))
          )}
        </div>
      </div>
      <div className="w-full flex flex-col items-center mb-6">
        <div className="flex gap-6 w-full max-w-5xl px-3 md:px-0">
          <div className="flex-1 bg-gradient-to-r from-green-200 to-green-400 dark:from-green-800 dark:to-green-600 rounded-xl shadow-lg p-4 flex items-center cursor-pointer hover:scale-105 transition" onClick={() => navigate('/my-recommendations')}>
            <span className="text-2xl mr-3">🌟</span>
            <div>
              <div className="font-bold text-green-900 dark:text-green-100 text-lg">{t('my_recommendations')}</div>
              <div className="text-green-800 dark:text-green-200 text-sm">{t('personalized_posts')}</div>
            </div>
          </div>
          <div className="flex-1 bg-gradient-to-r from-blue-200 to-blue-400 dark:from-blue-800 dark:to-blue-600 rounded-xl shadow-lg p-4 flex items-center cursor-pointer hover:scale-105 transition" onClick={() => navigate('/my-home')}>
            <span className="text-2xl mr-3">🏠</span>
            <div>
              <div className="font-bold text-blue-900 dark:text-blue-100 text-lg">{t('my_home')}</div>
              <div className="text-blue-800 dark:text-blue-200 text-sm">{t('activity_stats')}</div>
            </div>
          </div>
        </div>
      </div>
      {/* All Posts Feed */}
      <div className="w-full flex flex-col items-center mb-10">
        <h2 className="text-xl md:text-2xl font-bold text-blue-800 dark:text-blue-300 mb-4 w-full max-w-5xl px-3 md:px-0">{t('all_posts')}</h2>
        <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto px-2 md:px-0">
          {loading ? (
            <div className="text-center text-blue-400 dark:text-blue-300">{t('loading')}</div>
          ) : error ? (
            <div className="text-center text-red-400">{error}</div>
          ) : posts.length === 0 ? (
            <div className="col-span-full text-center text-blue-400 dark:text-blue-300">{t('no_posts_available')}</div>
          ) : (
            posts.map((post, idx) => (
              <Card key={post.id || post.post_id} post={post} className="rounded-2xl shadow bg-white dark:bg-gray-800 border border-blue-100 dark:border-gray-700 flex flex-col p-0 overflow-hidden hover:shadow-xl transition-shadow">
                <div className="flex items-center gap-3 px-4 pt-4 pb-2">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="dark:bg-gray-700 dark:text-white">{post.user?.name?.[0] || 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-blue-900 dark:text-blue-200 text-base md:text-lg truncate">{post.user?.name || 'Unknown'}</div>
                    <div className="text-gray-500 dark:text-gray-400 text-xs">{post.category}</div>
                  </div>
                </div>
                <div className="w-full h-48 md:h-56 bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                  <span className="text-gray-400 dark:text-gray-500">Image</span>
                </div>
                <div className="px-4 py-3 text-gray-800 dark:text-gray-200 text-sm md:text-base">
                  {expandedPost === post.id || !post.description || post.description.length < 120
                    ? post.description || <span className="italic text-gray-400 dark:text-gray-500">No description</span>
                    : <>
                      {post.description.slice(0, 120)}...{' '}
                      <button className="text-blue-600 dark:text-blue-400 font-semibold hover:underline" onClick={() => setExpandedPost(post.id)}>{t('view_more')}</button>
                    </>
                  }
                </div>
                <div className="flex items-center justify-between px-4 pb-4 pt-2 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex gap-5">
                    <button className={`flex items-center gap-1 font-semibold focus:outline-none dark:text-gray-200`} onClick={() => handleLike(post.post_id || post.id)}>
                      {likedPosts[post.post_id || post.id] ? <FaHeart className="w-4 h-4 text-red-500" /> : <FaRegHeart className="w-4 h-4 text-black dark:text-gray-300" />} {t('like')} {likeCounts[post.post_id || post.id] || 0}
                    </button>
                    <button className="flex items-center gap-1 text-black dark:text-gray-200 font-semibold focus:outline-none" onClick={() => handleShare(post.post_id || post.id)}><FaShare className="w-4 h-4" /> {t('share')}</button>
                    <button
                      className="flex items-center gap-1 text-green-600 dark:text-green-400 font-semibold focus:outline-none hover:text-green-700"
                      onClick={() => { setSelectedPost(post); setShowInterestModal(true); }}
                    >
                      <FaHandHoldingHeart className="w-4 h-4" /> {t('interested') || "Interested"}
                    </button>
                    <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400 font-semibold"><FaEye className="w-4 h-4" />{viewCounts[post.post_id || post.id] || 0}</span>
                  </div>
                  <Button className="bg-blue-600 text-white px-4 py-1 text-xs md:text-sm font-medium rounded" onClick={() => handleViewDetails(post.post_id || post.id)}>View Details</Button>
                </div>
              </Card>
            ))
          )}
        </div>
        {shareToast && <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded shadow-lg z-[9999]">{shareToast}</div>}
      </div>

      {/* Buyer Interest Modal */}
      <BuyerInterestModal
        isOpen={showInterestModal}
        onClose={() => { setShowInterestModal(false); setSelectedPost(null); }}
        postId={selectedPost?.post_id || selectedPost?.id}
        postTitle={selectedPost?.title}
      />
    </div >
  );
};


export default AllPosts;

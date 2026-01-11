import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import LoginPromptModal from '@/components/LoginPromptModal';
import { translatePosts } from '@/utils/translateContent';

const NAVBAR_HEIGHT = 80;
const GUEST_POST_LIMIT = 5; // Limit posts for non-logged-in users

const AllPosts = () => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const { filters, setFilters } = useFilter();
  const location = useLocation();
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const postsPerPage = 6;
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);

  // Read category from URL params and update filter
  // Wait for categories to load before setting filter to properly match ID -> name
  // Sync all filters from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);

    // 1. Resolve Category
    const categoryFromUrl = urlParams.get('category') || '';
    let resolvedCategory = categoryFromUrl;

    if (categoryFromUrl && categories.length > 0) {
      // Check if it's a numeric ID - if so, find the category name
      const isNumericId = !isNaN(parseInt(categoryFromUrl, 10));
      if (isNumericId) {
        const matchedCategory = categories.find(cat =>
          String(cat.category_id) === String(categoryFromUrl) || String(cat.id) === String(categoryFromUrl)
        );
        if (matchedCategory) {
          resolvedCategory = matchedCategory.name;
        }
      }
    }

    // 2. Sync all filters (URL is source of truth)
    setFilters(prev => ({
      ...prev,
      category: resolvedCategory,
      search: urlParams.get('search') || '', // Clear search if not in URL
      location: urlParams.get('location') || '',
      minPrice: urlParams.get('minPrice') || '',
      maxPrice: urlParams.get('maxPrice') || '',
      startDate: urlParams.get('startDate') || '',
      endDate: urlParams.get('endDate') || '',
      // Preserve sort if not in URL? Or sync? Typically sort is persistent or default.
      // Let's preserve existing sort unless URL overrides (if we supported sort params in URL)
      // Current buildParams adds sortBy to API call, but doesn't necessarily READ it from URL for UI state.
      // We'll leave sortBy as is for now to avoid side effects.
    }));

  }, [location.search, categories, setFilters]);

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

  // Low-view posts boost feature - rotates every 30 seconds
  const [boostLowViews, setBoostLowViews] = useState(true);
  const [rotationKey, setRotationKey] = useState(0);
  const [selectedPost, setSelectedPost] = useState(null);
  // const [viewedPosts, setViewedPosts] = useState(new Set()); // Replaced with ref for batching logic
  const postRefs = useRef({}); // Refs for each post card

  // Guest user restrictions - initialize immediately from localStorage
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    const token = localStorage.getItem('authToken');
    const userId = localStorage.getItem('userId');
    return !!(token && userId);
  });
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Restore scroll position when returning from post details
  useEffect(() => {
    const savedPosition = sessionStorage.getItem('allPostsScrollPosition');
    if (savedPosition && posts.length > 0) {
      // Use requestAnimationFrame for smooth restoration after render
      requestAnimationFrame(() => {
        window.scrollTo(0, parseInt(savedPosition, 10));
        sessionStorage.removeItem('allPostsScrollPosition');
      });
    }
  }, [posts.length]);

  // Fetch categories from API on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
        const res = await fetch(`${baseUrl}/api/categories`);
        const data = await res.json();
        setCategories(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to fetch categories:', err);
        setCategories([]);
      }
    };
    fetchCategories();
  }, []);

  // Emoji mapping for categories
  const categoryEmojis = {
    'Electronics': '💻', 'Mobiles': '📱', 'Fashion': '👗', 'Furniture': '🛋️',
    'Vehicles': '🚗', 'Books': '📚', 'Sports': '⚽', 'Home Appliances': '🏠',
    'Beauty': '💄', 'Kids': '🧸', 'Grocery': '🛒', 'Toys': '🎮',
    'Jewelry': '💎', 'Tools': '🔧', 'Garden': '🌿', 'Pet Supplies': '🐾'
  };

  // Create categoryMap from fetched categories (name -> category_id)
  const categoryMap = categories.reduce((map, cat) => {
    map[cat.name] = cat.category_id || cat.name;
    return map;
  }, {});

  // Helper to build filter params
  const buildParams = () => {
    const params = new URLSearchParams();

    // Determine effective category and search term
    let appliedCategory = filters.category;
    let appliedSearch = filters.search;

    // If search term matches a category name EXACTLY (and we aren't already filtering by another category)
    if (filters.search && (filters.category === 'All' || !filters.category)) {
      const matchCat = categories.find(c => c.name.toLowerCase() === filters.search.trim().toLowerCase());
      if (matchCat) {
        appliedCategory = matchCat.name;
        // Clear search term to enforce strict category filtering
        // This prevents posts from other categories that happen to have the keyword from showing up
        appliedSearch = '';
      }
    }

    // Search (title/description/location)
    if (appliedSearch) params.append('search', appliedSearch);
    // Location filter (separate from search)
    if (filters.location) params.append('location', filters.location);
    // Category (map name to ID)
    if (appliedCategory && appliedCategory !== 'All') {
      const catId = categoryMap[appliedCategory] || appliedCategory;
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


  // Fetch posts with Guaranteed Reach algorithm
  useEffect(() => {
    setLoading(true);
    setError(null);
    const fetchPosts = async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
        const params = buildParams();
        // Add refresh seed for instant new posts on every page load
        params.append('refresh', Math.floor(Math.random() * 100000));
        // Use /api/posts/for-you for Guaranteed Reach algorithm
        // This ensures all sellers get fair visibility to all buyers
        const url = `${baseUrl}/api/posts/for-you?${params.toString()}`;
        setDebugUrl(url);
        const res = await fetch(url);
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to fetch posts');
        }
        const data = await res.json();
        let loadedPosts = Array.isArray(data.posts) ? data.posts : [];

        // Translate posts to current language
        if (currentLang && currentLang !== 'en') {
          loadedPosts = await translatePosts(loadedPosts, currentLang);
        }

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
          views[post.post_id || post.id] = post.views_count || post.views || 0;
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
  }, [filters.search, filters.location, filters.category, filters.priceRange, filters.minPrice, filters.maxPrice, filters.startDate, filters.endDate, filters.sortBy, currentPage, currentLang, categories]);


  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters.search, filters.location, filters.category, filters.priceRange, filters.minPrice, filters.maxPrice, filters.startDate, filters.endDate, filters.sortBy]);


  // Infinite scroll
  const loadMorePosts = useCallback(() => {
    if (loading || !hasMore) return;
    setCurrentPage(prev => prev + 1);
  }, [loading, hasMore]);


  useEffect(() => {
    const handleScroll = () => {
      // For guests, show login modal when scrolling past limit instead of loading more
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

  // Rotation interval - rotate low-view priority every 30 seconds
  useEffect(() => {
    const rotationInterval = setInterval(() => {
      setRotationKey(prev => prev + 1);
      setBoostLowViews(prev => !prev);
    }, 30000); // 30 seconds

    return () => clearInterval(rotationInterval);
  }, []);

  // Display posts with smart sorting - low-view posts get priority periodically
  // For guests, limit to GUEST_POST_LIMIT posts
  const displayPosts = React.useMemo(() => {
    if (!posts || posts.length === 0) return [];

    // Create a copy to sort
    let sortedPosts = [...posts];

    if (boostLowViews) {
      // Sort by views ascending (low views first)
      sortedPosts.sort((a, b) => {
        const viewsA = viewCounts[a.post_id || a.id] ?? a.views_count ?? a.views ?? 0;
        const viewsB = viewCounts[b.post_id || b.id] ?? b.views_count ?? b.views ?? 0;
        return viewsA - viewsB;
      });
    }
    // When boostLowViews is false, keep original order (by date/relevance from API)

    // Limit posts for guests
    if (!isLoggedIn) {
      sortedPosts = sortedPosts.slice(0, GUEST_POST_LIMIT);
    }

    return sortedPosts;
  }, [posts, viewCounts, boostLowViews, rotationKey, isLoggedIn]);

  // Batch View Tracking Refs
  const viewQueue = useRef(new Set());
  const viewedPostsRef = useRef(new Set());
  const observerRef = useRef(null);

  // Flush view queue every 5 seconds
  useEffect(() => {
    const flushInterval = setInterval(() => {
      if (viewQueue.current.size > 0) {
        const batchIds = Array.from(viewQueue.current);
        viewQueue.current.clear();

        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
        fetch(`${baseUrl}/api/posts/batch-view`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postIds: batchIds }),
          credentials: 'include'
        }).catch(err => console.error("Batch view error:", err));
      }
    }, 5000);

    return () => clearInterval(flushInterval);
  }, []);

  // IntersectionObserver to track views
  useEffect(() => {
    // Disconnect previous observer
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const postId = parseInt(entry.target.dataset.postId);
            if (postId && !viewedPostsRef.current.has(postId)) {
              // Mark as viewed locally (ref based, no re-render)
              viewedPostsRef.current.add(postId);

              // Add to batch queue
              viewQueue.current.add(postId);

              // Optimistically update UI count (optional, can be throttled)
              setViewCounts(prev => ({ ...prev, [postId]: (prev[postId] || 0) + 1 }));
            }
          }
        });
      },
      { threshold: 0.5 }
    );

    // Observe all post cards
    Object.values(postRefs.current).forEach((ref) => {
      if (ref) observerRef.current.observe(ref);
    });

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [posts]); // Only re-run when posts list changes


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


  // View Details - also tracks view and recently viewed
  const handleViewDetails = async (postId) => {
    // Save scroll position before navigating
    sessionStorage.setItem('allPostsScrollPosition', window.scrollY.toString());

    // Find post object by id
    const postObj = posts.find(p => p.id === postId || p.post_id === postId);

    // Track view count (fire and forget)
    fetch(`/api/posts/${postId}/view`, { method: 'POST', credentials: 'include' }).catch(() => { });

    // Track recently viewed (fire and forget)
    const userId = localStorage.getItem('userId');
    if (userId) {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      fetch(`${baseUrl}/api/recently-viewed/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ postId: postId, userId: userId, source: 'allposts' })
      }).catch(() => { });
    }

    // Update local view count
    setViewCounts(prev => ({ ...prev, [postId]: (prev[postId] || 0) + 1 }));

    if (postObj) {
      navigate(`/post/${postId}`, { state: { post: postObj } });
    } else {
      navigate(`/post/${postId}`);
    }
  };


  // Sponsored Deals
  const sponsoredDeals = posts.filter(post => post.isSponsored).slice(0, 5);

  // Location is now handled at App.jsx level - no blocking here

  // Determine effective category for UI highlighting (sync search with category icons)
  const searchMatchCategory = filters.search ? categories.find(c => c.name.toLowerCase() === filters.search.trim().toLowerCase())?.name : null;
  const uiCategory = ((!filters.category || filters.category === 'All') && searchMatchCategory) ? searchMatchCategory : (filters.category || 'All');

  return (
    <div className="bg-white dark:bg-gray-900 min-h-screen transition-colors duration-300 pb-24">
      {/* Category Filter Bar - sticky on scroll */}
      <div className="w-full flex justify-center px-4 pt-2 pb-4 sticky top-[80px] z-40 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md shadow-sm">
        <div className="flex gap-2 md:gap-4 bg-gradient-to-r from-blue-100 via-white to-blue-100 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 rounded-2xl shadow-lg py-3 px-3 md:px-6 items-center overflow-x-auto scrollbar-hide max-w-full">
          {/* All Categories Button */}
          <button
            onClick={clearCategoryFilter}
            className={`flex flex-col items-center cursor-pointer hover:scale-110 transition px-3 py-2 rounded-xl min-w-[60px] ${uiCategory === 'All' ? 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-400' : ''
              }`}
          >
            <span className="text-xl md:text-2xl mb-1">📦</span>
            <span className={`font-semibold text-xs md:text-sm ${uiCategory === 'All' ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}>{t('all')}</span>
          </button>

          {/* Dynamic category buttons - fetched from API */}
          {categories.map(cat => (
            <button
              key={cat.category_id || cat.name}
              onClick={() => handleCategoryClick(cat.name)}
              className={`flex flex-col items-center cursor-pointer hover:scale-110 transition px-3 py-2 rounded-xl min-w-[70px] whitespace-nowrap ${uiCategory === cat.name ? 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-400' : ''
                }`}
            >
              <span className="text-xl md:text-2xl mb-1">{categoryEmojis[cat.name] || '📦'}</span>
              <span className={`font-semibold text-xs md:text-sm ${uiCategory === cat.name ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}>
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
              <Card key={post.id || post._id || idx} className="rounded-xl shadow bg-white dark:bg-gray-800 border border-blue-100 dark:border-gray-700 flex flex-col items-center p-3 md:p-4 min-w-[140px] max-w-[160px] md:min-w-[200px] md:max-w-[220px] hover:scale-105 transition-transform duration-200">
                <div className="w-20 h-20 md:w-24 md:h-24 bg-gray-100 dark:bg-gray-700 rounded mb-2 flex items-center justify-center">
                  <span className="text-gray-400 dark:text-gray-500">{t('image') || 'Image'}</span>
                </div>
                <div className="font-semibold text-gray-800 dark:text-white text-xs md:text-base text-center mb-1 line-clamp-2">{post.title}</div>
                <div className="text-yellow-500 text-xs mb-1">★★★★★</div>
                <div className="text-blue-900 dark:text-blue-300 text-base md:text-lg font-bold mb-1">₹{post.price}</div>
                <Button className="bg-blue-600 text-white w-full mt-1 md:mt-2 text-xs md:text-sm py-1 md:py-2" onClick={() => navigate(`/post/${post.id}`)}>{t('view') || 'View'}</Button>
              </Card>
            ))
          )}
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
          ) : displayPosts.length === 0 ? (
            <div className="col-span-full text-center text-blue-400 dark:text-blue-300">{t('no_posts_available')}</div>
          ) : (
            displayPosts.map((post, idx) => (
              <Card
                key={post.id || post.post_id}
                ref={el => postRefs.current[post.post_id || post.id] = el}
                data-post-id={post.post_id || post.id}
                post={post}
                className="rounded-2xl shadow bg-white dark:bg-gray-800 border border-blue-100 dark:border-gray-700 flex flex-col p-0 overflow-hidden hover:shadow-xl transition-shadow"
              >
                <div className="flex items-center gap-3 px-4 pt-4 pb-2">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="dark:bg-gray-700 dark:text-white">{post.user?.name?.[0] || 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-blue-900 dark:text-blue-200 text-base md:text-lg truncate">{post.user?.name || t('unknown') || 'Unknown'}</span>
                      {/* Verified Seller Badge */}
                      {post.user?.isVerified && (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs font-semibold rounded-full"
                          title={`KYC Verified${post.user?.aadhaarVerified ? ' (Aadhaar)' : ''}${post.user?.panVerified ? ' (PAN)' : ''}`}
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          {t('verified') || 'Verified'}
                        </span>
                      )}
                      {/* Seller Rating */}
                      {post.user?.rating > 0 && (
                        <span className="text-yellow-500 text-xs font-medium">★ {post.user.rating.toFixed(1)}</span>
                      )}
                    </div>
                    <div className="text-gray-500 dark:text-gray-400 text-xs">{post.category}</div>
                  </div>
                </div>

                <div className="w-full h-48 md:h-56 bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                  <span className="text-gray-400 dark:text-gray-500">{t('image') || 'Image'}</span>
                </div>
                <div className="px-4 py-3 text-gray-800 dark:text-gray-200 text-sm md:text-base">
                  {expandedPost === post.id || !post.description || post.description.length < 120
                    ? post.description || <span className="italic text-gray-400 dark:text-gray-500">{t('no_description') || 'No description'}</span>
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
                  <Button className="bg-blue-600 text-white px-4 py-1 text-xs md:text-sm font-medium rounded" onClick={() => handleViewDetails(post.post_id || post.id)}>{t('view_details') || 'View Details'}</Button>
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

      {/* Login Prompt Modal for Guest Users */}
      <LoginPromptModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </div >
  );
};


export default AllPosts;

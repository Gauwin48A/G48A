import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { FaHeart, FaRegHeart, FaShare, FaEye, FaHandHoldingHeart } from 'react-icons/fa';
import { useNavigate, useLocation } from 'react-router-dom';
import { useFilter } from '@/context/FilterContext';
import { useTranslation } from 'react-i18next';
import BuyerInterestModal from '@/components/BuyerInterestModal';
import { translatePosts } from '@/utils/translateContent';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { getUserId, isAuthenticated } from '@/utils/authStorage';
import { fetchCategoriesCached } from '@/services/categoriesService';

const GUEST_POST_LIMIT = 5; // Limit posts for non-logged-in users
const FALLBACK_IMAGE_URL = 'https://via.placeholder.com/640x480?text=No+Image';
const DEFAULT_FILTERS = {
  search: '',
  category: 'All',
  sortBy: '',
  location: '',
  minPrice: '',
  maxPrice: '',
  priceRange: '',
  startDate: '',
  endDate: '',
};

const getPostKey = (post) => post?.post_id ?? post?.id ?? null;
const normalizePostId = (value) => {
  if (value === undefined || value === null) return '';
  const normalized = String(value).trim();
  return normalized.length ? normalized : '';
};

const normalizePrice = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return value || 0;
  return parsed;
};

const formatRelativeTime = (rawDate) => {
  if (!rawDate) return '';
  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) return '';
  const diff = Date.now() - date.getTime();
  const minutes = Math.max(1, Math.floor(diff / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const resolvePostImageUrl = (post) => {
  if (!post) return FALLBACK_IMAGE_URL;

  const direct = post.image_url || post.imageUrl || post.thumbnail;
  if (typeof direct === 'string' && direct.trim()) {
    return direct;
  }

  const images = post.images;
  if (Array.isArray(images) && images.length) {
    return images[0] || FALLBACK_IMAGE_URL;
  }

  if (typeof images === 'string' && images.trim()) {
    try {
      const parsed = JSON.parse(images);
      if (Array.isArray(parsed) && parsed.length) {
        return parsed[0] || FALLBACK_IMAGE_URL;
      }
      return images;
    } catch {
      return images;
    }
  }

  return FALLBACK_IMAGE_URL;
};

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

const AllPosts = () => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const { filters, setFilters } = useFilter();
  const { user } = useAuth();
  const location = useLocation();
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [retryTick, setRetryTick] = useState(0);
  const postsPerPage = 6;
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const refreshSeedRef = useRef(Date.now());
  const activeRequestIdRef = useRef(0);
  const fetchAbortControllerRef = useRef(null);

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
      sortBy: urlParams.get('sortBy') || prev.sortBy || '',
    }));

  }, [location.search, categories, setFilters]);

  const [expandedPost, setExpandedPost] = useState(null);
  const [likedPosts, setLikedPosts] = useState({});
  const [likeCounts, setLikeCounts] = useState({});
  const [viewCounts, setViewCounts] = useState({});
  const [shareToast, setShareToast] = useState("");
  const [showInterestModal, setShowInterestModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const postRefs = useRef({}); // Refs for each post card

  // Guest user restrictions
  const isLoggedIn = useMemo(() => isAuthenticated(user), [user]);

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
    let active = true;

    const fetchCategories = async () => {
      try {
        const data = await fetchCategoriesCached();
        if (!active) return;
        setCategories(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!active) return;
        console.error('Failed to fetch categories:', err);
        setCategories([]);
      }
    };

    fetchCategories();

    return () => {
      active = false;
    };
  }, []);

  // Emoji mapping for categories
  const categoryEmojis = {
    'Electronics': '💻', 'Mobiles': '📱', 'Fashion': '👗', 'Furniture': '🛋️',
    'Vehicles': '🚗', 'Books': '📚', 'Sports': '⚽', 'Home Appliances': '🏠',
    'Beauty': '💄', 'Kids': '🧸', 'Grocery': '🛒', 'Toys': '🎮',
    'Jewelry': '💎', 'Tools': '🔧', 'Garden': '🌿', 'Pet Supplies': '🐾'
  };

  // Create categoryMap from fetched categories (name -> category_id)
  const categoryMap = useMemo(
    () => categories.reduce((map, cat) => {
      map[cat.name] = cat.category_id || cat.name;
      return map;
    }, {}),
    [categories]
  );

  const detectedCity = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('mhub_user_city') || '';
  }, []);

  const buildBrowseQuery = useCallback((nextFilters) => {
    const params = new URLSearchParams();
    if (nextFilters.search) params.set('search', nextFilters.search);
    if (nextFilters.category && nextFilters.category !== 'All') params.set('category', nextFilters.category);
    if (nextFilters.location) params.set('location', nextFilters.location);
    if (nextFilters.minPrice) params.set('minPrice', nextFilters.minPrice);
    if (nextFilters.maxPrice) params.set('maxPrice', nextFilters.maxPrice);
    if (nextFilters.startDate) params.set('startDate', nextFilters.startDate);
    if (nextFilters.endDate) params.set('endDate', nextFilters.endDate);
    if (nextFilters.sortBy) params.set('sortBy', nextFilters.sortBy);
    return params.toString();
  }, []);

  const applyFilterPatch = useCallback((patch) => {
    const nextFilters = { ...filters, ...patch };
    setFilters(nextFilters);
    setCurrentPage(1);
    const query = buildBrowseQuery(nextFilters);
    navigate(query ? `/all-posts?${query}` : '/all-posts');
  }, [buildBrowseQuery, filters, navigate, setFilters]);

  // Handle category click - navigate with category param
  const handleCategoryClick = useCallback((categoryName) => {
    applyFilterPatch({ category: categoryName });
  }, [applyFilterPatch]);

  // Clear category filter
  const clearCategoryFilter = useCallback(() => {
    applyFilterPatch({ category: 'All' });
  }, [applyFilterPatch]);

  const clearAllFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setCurrentPage(1);
    navigate('/all-posts');
  }, [navigate, setFilters]);

  const removeFilter = useCallback((filterKey) => {
    if (filterKey === 'price') {
      applyFilterPatch({ minPrice: '', maxPrice: '', priceRange: '' });
      return;
    }
    if (filterKey === 'date') {
      applyFilterPatch({ startDate: '', endDate: '' });
      return;
    }
    applyFilterPatch({ [filterKey]: filterKey === 'category' ? 'All' : '' });
  }, [applyFilterPatch]);

  const hasActiveFilters = useMemo(() => (
    Boolean(filters.search)
    || Boolean(filters.location)
    || Boolean(filters.minPrice)
    || Boolean(filters.maxPrice)
    || Boolean(filters.startDate)
    || Boolean(filters.endDate)
    || Boolean(filters.sortBy)
    || Boolean(filters.category && filters.category !== 'All')
  ), [
    filters.category,
    filters.endDate,
    filters.location,
    filters.maxPrice,
    filters.minPrice,
    filters.search,
    filters.sortBy,
    filters.startDate,
  ]);

  const activeFilterChips = useMemo(() => {
    const chips = [];
    if (filters.search) chips.push({ key: 'search', label: `Search: ${filters.search}` });
    if (filters.category && filters.category !== 'All') chips.push({ key: 'category', label: `Category: ${filters.category}` });
    if (filters.location) chips.push({ key: 'location', label: `Location: ${filters.location}` });
    if (filters.minPrice || filters.maxPrice) {
      chips.push({
        key: 'price',
        label: `Price: ${filters.minPrice || '0'} - ${filters.maxPrice || 'any'}`,
      });
    }
    if (filters.startDate || filters.endDate) {
      chips.push({
        key: 'date',
        label: `Date: ${filters.startDate || 'any'} to ${filters.endDate || 'any'}`,
      });
    }
    if (filters.sortBy) chips.push({ key: 'sortBy', label: `Sort: ${filters.sortBy}` });
    return chips;
  }, [
    filters.category,
    filters.endDate,
    filters.location,
    filters.maxPrice,
    filters.minPrice,
    filters.search,
    filters.sortBy,
    filters.startDate,
  ]);

  // Helper to build filter params
  const buildParams = useCallback(() => {
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
  }, [
    categories,
    categoryMap,
    currentPage,
    filters.category,
    filters.endDate,
    filters.location,
    filters.maxPrice,
    filters.minPrice,
    filters.priceRange,
    filters.search,
    filters.sortBy,
    filters.startDate,
    postsPerPage
  ]);


  // Fetch posts with Guaranteed Reach algorithm
  useEffect(() => {
    const requestId = activeRequestIdRef.current + 1;
    activeRequestIdRef.current = requestId;

    if (fetchAbortControllerRef.current) {
      fetchAbortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    fetchAbortControllerRef.current = abortController;

    setLoading(true);
    setError(null);

    const fetchPosts = async () => {
      try {
        const params = buildParams();
        // Keep a stable seed for pagination; rotate when page 1 reloads.
        if (currentPage === 1) {
          refreshSeedRef.current = Date.now();
        }
        params.append('refresh', String(refreshSeedRef.current));
        let data;
        try {
          data = await api.get(`/posts/for-you?${params.toString()}`, {
            signal: abortController.signal
          });
        } catch (forYouError) {
          // Fallback keeps All Posts usable even when the personalized feed endpoint is degraded.
          if (forYouError?.name === 'AbortError') {
            return;
          }
          data = await api.get(`/posts?${params.toString()}`, {
            signal: abortController.signal
          });
        }
        if (requestId !== activeRequestIdRef.current) return;
        let loadedPosts = Array.isArray(data.posts) ? data.posts : [];

        // Translate posts to current language
        if (currentLang && currentLang !== 'en') {
          loadedPosts = await translatePosts(loadedPosts, currentLang);
        }
        if (requestId !== activeRequestIdRef.current) return;

        // FIX: Append posts on page 2+, replace on page 1 (filter change)
        if (currentPage === 1) {
          setPosts(loadedPosts);
        } else {
          setPosts(prev => mergeUniquePosts(prev, loadedPosts));
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
        if (err?.name === 'AbortError') return;
        if (requestId !== activeRequestIdRef.current) return;
        setError(err.message || 'Failed to fetch posts');
        setPosts([]);
        setHasMore(false);
      } finally {
        if (fetchAbortControllerRef.current === abortController) {
          fetchAbortControllerRef.current = null;
        }
        if (requestId === activeRequestIdRef.current) {
          setLoading(false);
        }
      }
    };

    fetchPosts();

    return () => {
      abortController.abort();
      if (fetchAbortControllerRef.current === abortController) {
        fetchAbortControllerRef.current = null;
      }
    };
  }, [buildParams, currentLang, currentPage, retryTick]);


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
      if (!isLoggedIn) {
        return;
      }
      if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 1000) {
        loadMorePosts();
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadMorePosts, isLoggedIn]);

  // Keep API order stable to avoid disruptive list reshuffling during browsing.
  const displayPosts = useMemo(() => {
    if (!posts || posts.length === 0) return [];

    // Limit posts for guests
    if (!isLoggedIn) {
      return posts.slice(0, GUEST_POST_LIMIT);
    }

    return posts;
  }, [posts, isLoggedIn]);

  // Batch View Tracking Refs
  const viewQueue = useRef(new Set());
  const viewedPostsRef = useRef(new Set());
  const observerRef = useRef(null);
  const queueViewImpression = useCallback((rawPostId) => {
    const postId = normalizePostId(rawPostId);
    if (!postId || viewedPostsRef.current.has(postId)) {
      return;
    }

    viewedPostsRef.current.add(postId);
    viewQueue.current.add(postId);
    setViewCounts((prev) => ({ ...prev, [postId]: (prev[postId] || 0) + 1 }));
  }, []);

  // Flush view queue every 5 seconds
  useEffect(() => {
    const flushQueue = async () => {
      if (viewQueue.current.size === 0) {
        return;
      }

      const batchIds = Array.from(viewQueue.current);
      viewQueue.current.clear();
      try {
        await api.post('/posts/batch-view', { postIds: batchIds });
      } catch (err) {
        if (import.meta.env.DEV) {
          console.error("Batch view error:", err);
        }
      }
    };

    const flushInterval = setInterval(() => {
      flushQueue();
    }, 5000);

    return () => {
      clearInterval(flushInterval);
      flushQueue();
    };
  }, []);

  // IntersectionObserver to track views
  useEffect(() => {
    // Disconnect previous observer
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const postId = normalizePostId(entry.target.dataset.postId);
            queueViewImpression(postId);
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
  }, [posts, queueViewImpression]); // Only re-run when posts list changes


  // Like handler
  const handleLike = async (postId) => {
    const alreadyLiked = likedPosts[postId];
    setLikedPosts(prev => ({ ...prev, [postId]: !prev[postId] }));
    setLikeCounts(prev => ({ ...prev, [postId]: (prev[postId] || 0) + (alreadyLiked ? -1 : 1) }));
    try {
      await api.post(`/posts/${postId}/like`);
    } catch { }
  };

  // Share handler
  const handleShare = async (postId) => {
    const url = `${window.location.origin}/post/${postId}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareToast('Link copied!');
      setTimeout(() => setShareToast(''), 2000);
      await api.post(`/posts/${postId}/share`);
    } catch {
      setShareToast('Failed to copy link');
      setTimeout(() => setShareToast(''), 2000);
    }
  };


  // View Details - also tracks view and recently viewed
  const handleViewDetails = async (postId) => {
    const normalizedPostId = normalizePostId(postId);
    if (!normalizedPostId) return;

    // Save scroll position before navigating
    sessionStorage.setItem('allPostsScrollPosition', window.scrollY.toString());

    // Find post object by id
    const postObj = posts.find((p) => normalizePostId(p.id) === normalizedPostId || normalizePostId(p.post_id) === normalizedPostId);

    queueViewImpression(normalizedPostId);

    // Track recently viewed (fire and forget)
    const userId = getUserId(user);
    if (userId) {
      api.post('/recently-viewed/track', {
        postId: normalizedPostId,
        userId,
        source: 'allposts'
      }).catch(() => { });
    }

    if (postObj) {
      navigate(`/post/${normalizedPostId}`, { state: { post: postObj } });
    } else {
      navigate(`/post/${normalizedPostId}`);
    }
  };


  // Sponsored Deals
  const sponsoredDeals = posts
    .filter((post) => post.isSponsored === true || post.is_sponsored === true)
    .slice(0, 5);

  // Location is now handled at App.jsx level - no blocking here

  // Determine effective category for UI highlighting (sync search with category icons)
  const searchMatchCategory = filters.search ? categories.find(c => c.name.toLowerCase() === filters.search.trim().toLowerCase())?.name : null;
  const uiCategory = ((!filters.category || filters.category === 'All') && searchMatchCategory) ? searchMatchCategory : (filters.category || 'All');
  const todayISO = useMemo(() => new Date().toISOString().split('T')[0], []);
  const retryFetch = useCallback(() => {
    setRetryTick((value) => value + 1);
  }, []);

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
      <div className="w-full flex justify-center px-3">
        <div className="w-full max-w-5xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-xl p-3 md:p-4 mb-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-8 border-blue-200 text-blue-700"
              onClick={() => applyFilterPatch({ minPrice: '', maxPrice: '1000' })}
            >
              Under 1000
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-8 border-blue-200 text-blue-700"
              onClick={() => applyFilterPatch({ minPrice: '1000', maxPrice: '5000' })}
            >
              1000-5000
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-8 border-blue-200 text-blue-700"
              onClick={() => applyFilterPatch({ sortBy: 'date_desc' })}
            >
              Latest
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-8 border-blue-200 text-blue-700"
              onClick={() => applyFilterPatch({ startDate: todayISO, endDate: todayISO })}
            >
              Posted Today
            </Button>
            {detectedCity && (
              <Button
                type="button"
                variant="outline"
                className="h-8 border-blue-200 text-blue-700"
                onClick={() => applyFilterPatch({ location: detectedCity })}
              >
                Near {detectedCity}
              </Button>
            )}
            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={clearAllFilters}
              >
                Clear all filters
              </Button>
            )}
          </div>
          {activeFilterChips.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {activeFilterChips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => removeFilter(chip.key)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-gray-800 border border-blue-200 dark:border-gray-700 text-xs text-blue-800 dark:text-blue-200"
                  title="Remove filter"
                >
                  <span>{chip.label}</span>
                  <span className="font-semibold">x</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
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
                <img
                  src={resolvePostImageUrl(post)}
                  alt={post.title || 'Post'}
                  className="w-20 h-20 md:w-24 md:h-24 object-cover rounded mb-2 bg-gray-100 dark:bg-gray-700"
                  onError={(event) => {
                    event.currentTarget.src = FALLBACK_IMAGE_URL;
                  }}
                />
                <div className="font-semibold text-gray-800 dark:text-white text-xs md:text-base text-center mb-1 line-clamp-2">{post.title}</div>
                <div className="text-yellow-500 text-xs mb-1">★★★★★</div>
                <div className="text-blue-900 dark:text-blue-300 text-base md:text-lg font-bold mb-1">₹{normalizePrice(post.price)}</div>
                <Button className="bg-blue-600 text-white w-full mt-1 md:mt-2 text-xs md:text-sm py-1 md:py-2" onClick={() => navigate(`/post/${post.post_id || post.id}`)}>{t('view') || 'View'}</Button>
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
            Array.from({ length: 3 }).map((_, index) => (
              <Card
                key={`all-posts-skeleton-${index}`}
                className="rounded-2xl border border-blue-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 animate-pulse"
              >
                <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
                <div className="h-48 w-full bg-gray-200 dark:bg-gray-700 rounded-lg mb-3" />
                <div className="h-4 w-5/6 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                <div className="h-4 w-2/3 bg-gray-200 dark:bg-gray-700 rounded" />
              </Card>
            ))
          ) : error ? (
            <Card className="border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 p-5">
              <p className="text-sm text-red-700 dark:text-red-300 mb-3">{error}</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" className="bg-red-600 text-white hover:bg-red-700" onClick={retryFetch}>
                  Retry
                </Button>
                {hasActiveFilters && (
                  <Button type="button" variant="outline" className="border-red-200 text-red-700" onClick={clearAllFilters}>
                    Reset filters
                  </Button>
                )}
              </div>
            </Card>
          ) : displayPosts.length === 0 ? (
            <Card className="border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/30 p-6 text-center">
              <h3 className="text-base md:text-lg font-semibold text-blue-900 dark:text-blue-200 mb-2">
                No results for the current filters
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
                Try broadening search terms, changing category, or clearing filters.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button type="button" className="bg-blue-600 text-white hover:bg-blue-700" onClick={clearAllFilters}>
                  Reset filters
                </Button>
                <Button type="button" variant="outline" className="border-blue-200 text-blue-700" onClick={() => navigate('/categories')}>
                  Browse categories
                </Button>
              </div>
            </Card>
          ) : (
            displayPosts.map((post) => {
              const postId = normalizePostId(post.post_id || post.id);
              const userName = post.user?.name || post.user_name || post.username || t('unknown') || 'Unknown';
              const userInitial = String(userName || 'U').charAt(0).toUpperCase();
              const userRating = Number(post.user?.rating || post.seller_rating || 0);
              const categoryLabel = post.category || post.category_name || t('all') || 'General';
              const isVerifiedSeller = Boolean(post.user?.isVerified || post.is_verified || post.aadhaar_verified || post.pan_verified);
              const postDescription = String(post.description || '');
              const isExpanded = expandedPost === postId;
              const canExpand = postDescription.length >= 120;
              const postedAt = formatRelativeTime(post.created_at || post.createdAt);
              const postLocation = post.location || post.city || post.area || '';

              return (
                <Card
                  key={postId}
                  ref={(element) => {
                    postRefs.current[postId] = element;
                  }}
                  data-post-id={postId}
                  className="rounded-2xl shadow bg-white dark:bg-gray-800 border border-blue-100 dark:border-gray-700 flex flex-col p-0 overflow-hidden hover:shadow-xl transition-shadow"
                >
                  <div className="flex items-center gap-3 px-4 pt-4 pb-2">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="dark:bg-gray-700 dark:text-white">{userInitial || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-blue-900 dark:text-blue-200 text-base md:text-lg truncate">{userName}</span>
                        {isVerifiedSeller && (
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
                        {userRating > 0 && (
                          <span className="text-yellow-500 text-xs font-medium">★ {userRating.toFixed(1)}</span>
                        )}
                      </div>
                      <div className="text-gray-500 dark:text-gray-400 text-xs">{categoryLabel}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                        {postedAt && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700">
                            Posted {postedAt}
                          </span>
                        )}
                        {postLocation && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700">
                            {postLocation}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <img
                    src={resolvePostImageUrl(post)}
                    alt={post.title || 'Post'}
                    className="w-full h-48 md:h-56 object-cover bg-gray-100 dark:bg-gray-700"
                    onError={(event) => {
                      event.currentTarget.src = FALLBACK_IMAGE_URL;
                    }}
                  />

                  <div className="px-4 py-3 text-gray-800 dark:text-gray-200 text-sm md:text-base">
                    {isExpanded || !canExpand
                      ? (postDescription || <span className="italic text-gray-400 dark:text-gray-500">{t('no_description') || 'No description'}</span>)
                      : (
                        <>
                          {postDescription.slice(0, 120)}...{' '}
                          <button className="text-blue-600 dark:text-blue-400 font-semibold hover:underline" onClick={() => setExpandedPost(postId)}>{t('view_more')}</button>
                        </>
                      )}
                  </div>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-4 pb-4 pt-2 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex flex-wrap gap-4">
                      <button className={`flex items-center gap-1 font-semibold focus:outline-none dark:text-gray-200`} onClick={() => handleLike(postId)}>
                        {likedPosts[postId] ? <FaHeart className="w-4 h-4 text-red-500" /> : <FaRegHeart className="w-4 h-4 text-black dark:text-gray-300" />} {t('like')} {likeCounts[postId] || 0}
                      </button>
                      <button className="flex items-center gap-1 text-black dark:text-gray-200 font-semibold focus:outline-none" onClick={() => handleShare(postId)}><FaShare className="w-4 h-4" /> {t('share')}</button>
                      <button
                        className="flex items-center gap-1 text-green-600 dark:text-green-400 font-semibold focus:outline-none hover:text-green-700"
                        onClick={() => { setSelectedPost(post); setShowInterestModal(true); }}
                      >
                        <FaHandHoldingHeart className="w-4 h-4" /> {t('interested') || "Interested"}
                      </button>
                      <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400 font-semibold"><FaEye className="w-4 h-4" />{viewCounts[postId] || 0}</span>
                    </div>
                    <Button className="bg-blue-600 text-white px-4 py-1 text-xs md:text-sm font-medium rounded" onClick={() => handleViewDetails(postId)}>{t('view_details') || 'View Details'}</Button>
                  </div>
                </Card>
              );
            })
          )}
        </div>
        {isLoggedIn && hasMore && !loading && !error && displayPosts.length > 0 && (
          <Button type="button" variant="outline" className="mt-5 border-blue-300 text-blue-700" onClick={loadMorePosts}>
            Load more posts
          </Button>
        )}
        {!isLoggedIn && posts.length > GUEST_POST_LIMIT && (
          <Card className="w-full max-w-5xl mt-6 p-5 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <p className="font-semibold text-blue-900 dark:text-blue-200">{t('unlock_more_posts') || 'Unlock more posts'}</p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {t('login_for_full_feed') || 'Sign in to browse the full feed, save searches, and get personalized recommendations.'}
                </p>
              </div>
              <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={() => navigate('/login')}>
                {t('login') || 'Login'}
              </Button>
            </div>
          </Card>
        )}
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


import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { FaHeart, FaRegHeart, FaShare, FaEye } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import CategoriesGrid from '@/components/CategoriesGrid';
import { useFilter } from '@/context/FilterContext';
import useLocationPermission from '@/hooks/useLocationPermission';

const NAVBAR_HEIGHT = 80;

const AllPosts = () => {
  const { filters } = useFilter();
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const postsPerPage = 6;
  const navigate = useNavigate();

    // Location permission hook - Request location when component mounts
  const { permissionGranted, isLoading: locationLoading, error: locationError } = useLocationPermission();
  const [expandedPost, setExpandedPost] = useState(null);
  const [likedPosts, setLikedPosts] = useState({});
  const [likeCounts, setLikeCounts] = useState({});
  const [viewCounts, setViewCounts] = useState({});
  const [shareToast, setShareToast] = useState("");
  const [debugUrl, setDebugUrl] = useState("");


  const categoryMap = {
    Electronics: 1,
    Fashion: 2,
    Home: 3,
    Mobiles: 4,
  };

  // Helper to build filter params
  const buildParams = () => {
    const params = new URLSearchParams();
    // Search (title/description)
    if (filters.search) params.append('search', filters.search);
    // Category (map name to ID)
    if (filters.category && filters.category !== 'All') {
      const catId = categoryMap[filters.category] || filters.category;
      params.append('category', catId);
    }
    // Price range (split to minPrice/maxPrice)
    if (filters.priceRange) {
      const [min, max] = filters.priceRange.split('-').map(Number);
      if (!isNaN(min)) params.append('minPrice', min);
      if (!isNaN(max)) params.append('maxPrice', max);
    }
    // Date range
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    // Sorting
    if (filters.sortBy) {
      if (filters.sortBy === 'leastViews') {
        params.append('sortBy', 'views');
        params.append('sortOrder', 'asc');
      } else if (filters.sortBy === 'mostViews') {
        params.append('sortBy', 'views');
        params.append('sortOrder', 'desc');
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
        setPosts(loadedPosts);
        setError(null);
        // Set like/view counts from backend if available
        const likes = {};
        const views = {};
        loadedPosts.forEach(post => {
          likes[post.post_id || post.id] = post.likes || 0;
          views[post.post_id || post.id] = post.views || 0;
        });
        setLikeCounts(likes);
        setViewCounts(views);
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
  }, [filters.search, filters.category, filters.priceRange, filters.startDate, filters.endDate, filters.sortBy, currentPage]);


  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters.search, filters.category, filters.priceRange, filters.startDate, filters.endDate, filters.sortBy]);


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
    } catch {}
  };


  // View handler
  const handleView = async (postId) => {
    setViewCounts(prev => ({ ...prev, [postId]: (prev[postId] || 0) + 1 }));
    try {
      await fetch(`/api/posts/${postId}/view`, { method: 'POST', credentials: 'include' });
    } catch {}
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


  return (
        // Show location permission loading screen
    locationLoading ? (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
        <div className="text-center p-8 bg-white rounded-2xl shadow-xl max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Requesting Location Permission</h2>
          <p className="text-gray-600">Please allow location access to continue...</p>
        </div>
      </div>
    ) : !permissionGranted ? (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
        <div className="text-center p-8 bg-white rounded-2xl shadow-xl max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 bg-yellow-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Location Permission Required</h2>
          <p className="text-gray-600 mb-4">{locationError || 'Location access is needed to show relevant posts'}</p>
          <Button onClick={() => window.location.reload()} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg">
            Retry
          </Button>
        </div>
      </div>
    ) :
    (<div className="bg-white min-h-screen">
      <CategoriesGrid className="w-full flex justify-center mt-4 mb-8">
        <div className="flex gap-8 md:gap-16 bg-gradient-to-r from-blue-100 via-white to-blue-100 rounded-2xl shadow-lg py-6 px-4 md:px-12 items-center justify-center">
          <div className="flex flex-col items-center cursor-pointer hover:scale-110 transition">
            <img src="/public/icons/electronics.svg" alt="Electronics" className="w-10 h-10 mb-2" />
            <span className="text-blue-700 font-semibold text-base md:text-lg">Electronics</span>
          </div>
          <div className="flex flex-col items-center cursor-pointer hover:scale-110 transition">
            <img src="/public/icons/fashion.svg" alt="Fashion" className="w-10 h-10 mb-2" />
            <span className="text-pink-600 font-semibold text-base md:text-lg">Fashion</span>
          </div>
          <div className="flex flex-col items-center cursor-pointer hover:scale-110 transition">
            <img src="/public/icons/home.svg" alt="Home" className="w-10 h-10 mb-2" />
            <span className="text-green-700 font-semibold text-base md:text-lg">Home</span>
          </div>
          <div className="flex flex-col items-center cursor-pointer hover:scale-110 transition">
            <img src="/public/icons/mobile.svg" alt="Mobiles" className="w-10 h-10 mb-2" />
            <span className="text-teal-700 font-semibold text-base md:text-lg">Mobiles</span>
          </div>
        </div>
      </CategoriesGrid>
      <div className="h-6 md:h-8" />
      <div className="w-full flex justify-center">
        <div className="flex flex-col md:flex-row items-center justify-between px-3 md:px-8 py-6 md:py-8 bg-blue-100 rounded-xl mb-8 shadow-lg w-full max-w-5xl relative overflow-hidden border border-blue-200 mt-0 md:mt-6">
          <div className="flex flex-col gap-2 z-10 w-full md:w-auto">
            <span className="text-xl md:text-3xl font-bold text-blue-900 mb-1">Great Deals on Electronics</span>
            <span className="text-sm md:text-base text-blue-800 font-medium mb-2">Up to 40% off</span>
            <Button className="bg-blue-600 text-white font-semibold px-5 md:px-6 py-2 rounded-lg shadow hover:bg-blue-700 transition w-fit text-sm md:text-base">Shop Now</Button>
          </div>
          <div className="mt-4 md:mt-0 md:ml-8 z-10">
            <div className="w-24 h-16 md:w-32 md:h-24 bg-blue-200 rounded-lg flex items-center justify-center">
              <svg width="64" height="48" fill="none" viewBox="0 0 64 48"><rect width="64" height="48" rx="8" fill="#2563eb" /></svg>
            </div>
          </div>
          <div className="absolute right-0 bottom-0 opacity-10 w-32 h-24 md:w-40 md:h-32 bg-blue-300 rounded-bl-2xl" />
        </div>
      </div>
      <div className="w-full flex flex-col items-center mb-8">
        <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-3 md:mb-4 w-full max-w-5xl px-3 md:px-0">Sponsored Deals</h2>
        <div className="flex gap-4 md:gap-6 w-full max-w-5xl overflow-x-auto scrollbar-hide px-3 md:px-0">
          {sponsoredDeals.length === 0 ? (
            <div className="text-center text-blue-400">No sponsored deals right now.</div>
          ) : (
            sponsoredDeals.map((post, idx) => (
              <Card key={post.id || post._id || idx} className="rounded-xl shadow bg-white border border-blue-100 flex flex-col items-center p-3 md:p-4 min-w-[160px] max-w-[180px] md:min-w-[200px] md:max-w-[220px]">
                <div className="w-20 h-20 md:w-24 md:h-24 bg-gray-100 rounded mb-2 flex items-center justify-center">
                  <span className="text-gray-400">Image</span>
                </div>
                <div className="font-semibold text-gray-800 text-xs md:text-base text-center mb-1 line-clamp-2">{post.title}</div>
                <div className="text-yellow-500 text-xs mb-1">★★★★★</div>
                <div className="text-blue-900 text-base md:text-lg font-bold mb-1">₹{post.price}</div>
                <Button className="bg-blue-600 text-white w-full mt-1 md:mt-2 text-xs md:text-sm py-1 md:py-2" onClick={() => navigate(`/post/${post.id}`)}>View</Button>
              </Card>
            ))
          )}
        </div>
      </div>
      <div className="w-full flex flex-col items-center mb-6">
        <div className="flex gap-6 w-full max-w-5xl px-3 md:px-0">
          <div className="flex-1 bg-gradient-to-r from-green-200 to-green-400 rounded-xl shadow-lg p-4 flex items-center cursor-pointer hover:scale-105 transition" onClick={() => navigate('/my-recommendations')}>
            <span className="text-2xl mr-3">🌟</span>
            <div>
              <div className="font-bold text-green-900 text-lg">My Recommendations</div>
              <div className="text-green-800 text-sm">Personalized posts just for you</div>
            </div>
          </div>
          <div className="flex-1 bg-gradient-to-r from-blue-200 to-blue-400 rounded-xl shadow-lg p-4 flex items-center cursor-pointer hover:scale-105 transition" onClick={() => navigate('/my-home')}>
            <span className="text-2xl mr-3">🏠</span>
            <div>
              <div className="font-bold text-blue-900 text-lg">My Home</div>
              <div className="text-blue-800 text-sm">Your posts, activity, and stats</div>
            </div>
          </div>
        </div>
      </div>
      {/* All Posts Feed */}
      <div className="w-full flex flex-col items-center mb-10">
        <h2 className="text-xl md:text-2xl font-bold text-blue-800 mb-4 w-full max-w-5xl px-3 md:px-0">All Posts</h2>
        <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto px-2 md:px-0">
          {loading ? (
            <div className="text-center text-blue-400">Loading...</div>
          ) : error ? (
            <div className="text-center text-red-400">{error}</div>
          ) : posts.length === 0 ? (
            <div className="col-span-full text-center text-blue-400">No posts available right now.</div>
          ) : (
            posts.map((post, idx) => (
              <Card key={post.id || post.post_id} post={post} className="rounded-2xl shadow bg-white border border-blue-100 flex flex-col p-0 overflow-hidden hover:shadow-xl transition-shadow">
                <div className="flex items-center gap-3 px-4 pt-4 pb-2">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback>{post.user?.name?.[0] || 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-blue-900 text-base md:text-lg truncate">{post.user?.name || 'Unknown'}</div>
                    <div className="text-gray-500 text-xs">{post.category}</div>
                  </div>
                </div>
                <div className="w-full h-48 md:h-56 bg-gray-100 flex items-center justify-center overflow-hidden">
                  <span className="text-gray-400">Image</span>
                </div>
                <div className="px-4 py-3 text-gray-800 text-sm md:text-base">
                  {expandedPost === post.id || !post.description || post.description.length < 120
                    ? post.description || <span className="italic text-gray-400">No description</span>
                    : <>
                        {post.description.slice(0, 120)}...{' '}
                        <button className="text-blue-600 font-semibold hover:underline" onClick={() => setExpandedPost(post.id)}>View More</button>
                      </>
                  }
                </div>
                <div className="flex items-center justify-between px-4 pb-4 pt-2 border-t border-gray-100">
                  <div className="flex gap-5">
                    <button className={`flex items-center gap-1 font-semibold focus:outline-none`} onClick={() => handleLike(post.id)}>
                      {likedPosts[post.id] ? <FaHeart className="w-4 h-4 text-red-500" /> : <FaRegHeart className="w-4 h-4 text-black" />} Like {likeCounts[post.id] || 0}
                    </button>
                    <button className="flex items-center gap-1 text-black font-semibold focus:outline-none" onClick={() => handleShare(post.id)}><FaShare className="w-4 h-4" /> Share</button>
                    <span className="flex items-center gap-1 text-gray-500 font-semibold"><FaEye className="w-4 h-4" />{viewCounts[post.id] || 0}</span>
                  </div>
                  <Button className="bg-blue-600 text-white px-4 py-1 text-xs md:text-sm font-medium rounded" onClick={() => handleViewDetails(post.id || post._id)}>View Details</Button>
                </div>
              </Card>
            ))
          )}
        </div>
        {shareToast && <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded shadow-lg z-[9999]">{shareToast}</div>}
      </div>
    </div>
         )
  );
};


export default AllPosts;

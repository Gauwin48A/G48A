import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { FaHeart, FaRegHeart, FaShare, FaEye } from 'react-icons/fa';
// Assuming FeedPostCard is used for text-based feed posts, 
// and the post list card styling is now integrated below for consistency.
import { useFilter } from '@/context/FilterContext';

// Assuming you have an endpoint for general feed and user-specific feed.
// We will call the API directly using fetch/axios as done in AllPosts.
const POSTS_PER_PAGE = 6;

const FeedPage = () => {
    const { filters } = useFilter();
    const [tab, setTab] = useState('feed'); // 'feed' (all) or 'myFeed' (user's)
    const [posts, setPosts] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    
    // State needed for actions and toasts (from AllPosts)
    const [expandedPost, setExpandedPost] = useState(null);
    const [likedPosts, setLikedPosts] = useState({});
    const [likeCounts, setLikeCounts] = useState({});
    const [viewCounts, setViewCounts] = useState({});
    const [shareToast, setShareToast] = useState("");
    
    const navigate = useNavigate();

    // --- Utility Functions from AllPosts ---

    // Note: Feed Posts are typically text-only and don't usually have these categories/filters.
    // However, if the feed API *does* support them, you can keep this mapping.
    const categoryMap = {
        Electronics: 1,
        Fashion: 2,
        Home: 3,
        Mobiles: 4,
    };

    const buildFeedParams = () => {
        const params = new URLSearchParams();
        // Search (title/description)
        if (filters.search) params.append('search', filters.search);
        // Category (map name to ID) - Assuming the Feed API supports this filter
        if (filters.category && filters.category !== 'All') {
            const catId = categoryMap[filters.category] || filters.category;
            params.append('category', catId);
        }
        
        // Add specific feed/myFeed parameters
        if (tab === 'myFeed') {
            const userId = localStorage.getItem('userId');
            if (userId) {
                params.append('userId', userId);
            }
        }
        
        // Pagination
        params.append('page', currentPage);
        params.append('limit', POSTS_PER_PAGE);
        return params;
    };

    // --- Data Fetching Logic (Modified from AllPosts) ---

    // Fetch posts with filters
    const fetchFeedPosts = useCallback(async (pageToFetch = 1) => {
        if (pageToFetch === 1) {
            setLoading(true);
        }
        setError(null);

        try {
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
            // Use 'all-posts' or 'feed' endpoint based on your API structure. 
            // Assuming '/api/feed' for the purpose of the provided API function name.
            const endpoint = `/api/feed`; 
            
            // Re-build params for the current page
            const params = buildFeedParams();
            params.set('page', pageToFetch);
            
            const url = `${baseUrl}${endpoint}?${params.toString()}`;
            
            const res = await fetch(url);
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to fetch ${tab} feed`);
            }
            
            const data = await res.json();
            // Assuming the feed API returns an array named 'posts' or 'data'
            let loadedPosts = Array.isArray(data.posts) ? data.posts : (Array.isArray(data.data) ? data.data : []);

            if (pageToFetch === 1) {
                setPosts(loadedPosts);
            } else {
                setPosts(prev => [...prev, ...loadedPosts]);
            }
            
            setError(null);
            
            // Set like/view counts from backend if available
            const likes = {};
            const views = {};
            loadedPosts.forEach(post => {
                const id = post.post_id || post.id;
                likes[id] = post.likes || 0;
                views[id] = post.views || 0;
            });
            
            // Only merge counts, don't overwrite
            setLikeCounts(prev => ({ ...prev, ...likes }));
            setViewCounts(prev => ({ ...prev, ...views }));
            
            setHasMore(loadedPosts.length === POSTS_PER_PAGE);
            
        } catch (err) {
            setError(err.message || 'Failed to fetch feed posts');
            if (pageToFetch === 1) {
                setPosts([]);
            }
            setHasMore(false);
        } finally {
            setLoading(false);
        }
    }, [tab, filters.search, filters.category]);


    // Effect 1: Trigger fetch on tab/filter change (Resets page to 1)
    useEffect(() => {
        setCurrentPage(1);
        fetchFeedPosts(1);
    }, [tab, filters.search, filters.category, filters.sortBy]); // Note: Removed priceRange/dates as they rarely apply to a text feed

    // Effect 2: Trigger fetch on page change (Loads more posts)
    useEffect(() => {
        if (currentPage > 1) {
            fetchFeedPosts(currentPage);
        }
    }, [currentPage, fetchFeedPosts]);


    // --- Infinite Scroll Logic (From AllPosts) ---

    const loadMorePosts = useCallback(() => {
        // Prevent loading if already loading, no more posts, or on page 1
        if (loading || !hasMore || currentPage === 1) return; 
        setCurrentPage(prev => prev + 1);
    }, [loading, hasMore, currentPage]);


    useEffect(() => {
        const handleScroll = () => {
            // Check if user is near the bottom (e.g., 1000px margin)
            if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 1000) {
                loadMorePosts();
            }
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [loadMorePosts]);


    // --- Action Handlers (From AllPosts) ---

    // Like handler
    const handleLike = async (postId) => {
        const alreadyLiked = likedPosts[postId];
        setLikedPosts(prev => ({ ...prev, [postId]: !prev[postId] }));
        setLikeCounts(prev => ({ ...prev, [postId]: (prev[postId] || 0) + (alreadyLiked ? -1 : 1) }));
        try {
            // Adjust API call for the feed endpoint if different
            await fetch(`/api/feed/posts/${postId}/like`, { method: 'POST', credentials: 'include' });
        } catch {}
    };

    // Share handler
    const handleShare = async (postId) => {
        const url = `${window.location.origin}/feed/post/${postId}`; // Use the correct path for feed post detail
        try {
            await navigator.clipboard.writeText(url);
            setShareToast('Link copied!');
            setTimeout(() => setShareToast(''), 2000);
            await fetch(`/api/feed/posts/${postId}/share`, { method: 'POST', credentials: 'include' });
        } catch {
            setShareToast('Failed to copy link');
            setTimeout(() => setShareToast(''), 2000);
        }
    };

    // View Details (navigate to a detailed feed post page)
    const handleViewDetails = (postId) => {
        const postObj = posts.find(p => p.id === postId || p.post_id === postId);
        if (postObj) {
             // Assuming your router has a route like /feed/:id or /post/:id that can handle a feed post
            navigate(`/post/${postId}`, { state: { post: postObj } }); 
        } else {
            navigate(`/post/${postId}`);
        }
    };
    
    // Simple View handler (for completeness, though usually tracked server-side)
    const handleView = (postId) => {
        setViewCounts(prev => ({ ...prev, [postId]: (prev[postId] || 0) + 1 }));
        // API call to increment view count if necessary
        // try { await fetch(`/api/feed/posts/${postId}/view`, { method: 'POST', credentials: 'include' }); } catch {}
    };


    // --- Render Logic (Based on AllPosts Card Style) ---

    // Reusable Post Card component logic integrated for feed items
    const FeedItemCard = ({ post }) => {
        const postId = post.id || post.post_id;
        const isLiked = likedPosts[postId];
        const likeCount = likeCounts[postId] || post.likes || 0;
        const viewCount = viewCounts[postId] || post.views || 0;
        
        return (
            <Card className="rounded-2xl shadow bg-white border border-blue-100 flex flex-col p-0 overflow-hidden hover:shadow-xl transition-shadow">
                <div className="flex items-center gap-3 px-4 pt-4 pb-2">
                    <Avatar className="w-10 h-10">
                        <AvatarFallback>{post.user?.name?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                        <div className="font-semibold text-blue-900 text-base md:text-lg truncate">{post.user?.name || 'Unknown'}</div>
                        <div className="text-gray-500 text-xs">{post.location || 'Global'} - {post.createdAt || 'N/A'}</div>
                    </div>
                    {/* Add an image if available - feed posts might have one */}
                </div>
                
                {/* Text Content */}
                <div className="px-4 py-3 text-gray-800 text-sm md:text-base">
                    {expandedPost === postId || !post.description || post.description.length < 300
                        ? post.description || <span className="italic text-gray-400">No content</span>
                        : <>
                            {post.description.slice(0, 300)}...{' '}
                            <button className="text-blue-600 font-semibold hover:underline" onClick={() => setExpandedPost(postId)}>View More</button>
                          </>
                    }
                </div>
                
                <div className="flex items-center justify-between px-4 pb-4 pt-2 border-t border-gray-100">
                    <div className="flex gap-5">
                        <button className={`flex items-center gap-1 font-semibold focus:outline-none`} onClick={() => handleLike(postId)}>
                            {isLiked ? <FaHeart className="w-4 h-4 text-red-500" /> : <FaRegHeart className="w-4 h-4 text-black" />} Like {likeCount}
                        </button>
                        <button className="flex items-center gap-1 text-black font-semibold focus:outline-none" onClick={() => handleShare(postId)}><FaShare className="w-4 h-4" /> Share</button>
                        <span className="flex items-center gap-1 text-gray-500 font-semibold"><FaEye className="w-4 h-4" />{viewCount}</span>
                    </div>
                    <Button className="bg-blue-600 text-white px-4 py-1 text-xs md:text-sm font-medium rounded" onClick={() => handleViewDetails(postId)}>View Post</Button>
                </div>
            </Card>
        );
    };


    return (
        <div className="bg-white min-h-screen">
            {/* Banner section */}
            <div className="w-full flex justify-center">
                <div className="flex flex-col md:flex-row items-center justify-between px-3 md:px-8 py-6 md:py-8 bg-blue-100 rounded-xl mb-8 shadow-lg w-full max-w-5xl relative overflow-hidden border border-blue-200 mt-0 md:mt-6">
                    <div className="flex flex-col gap-2 z-10 w-full md:w-auto">
                        <span className="text-xl md:text-3xl font-bold text-blue-900 mb-1">Latest News & Updates</span>
                        <span className="text-sm md:text-base text-blue-800 font-medium mb-2">Text-only posts from all users</span>
                        <Button 
                            className="bg-blue-600 text-white font-semibold px-5 md:px-6 py-2 rounded-lg shadow hover:bg-blue-700 transition w-fit text-sm md:text-base" 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); e.preventDefault(); navigate('/feed/feedpostadd', { replace: true }); }}
                        >
                            + Add New Post
                        </Button>
                    </div>
                    <div className="mt-4 md:mt-0 md:ml-8 z-10">
                        <div className="w-24 h-16 md:w-32 md:h-24 bg-blue-200 rounded-lg flex items-center justify-center">
                            {/* Placeholder/Icon */}
                            <svg width="64" height="48" fill="none" viewBox="0 0 64 48"><rect width="64" height="48" rx="8" fill="#2563eb" /></svg>
                        </div>
                    </div>
                    <div className="absolute right-0 bottom-0 opacity-10 w-32 h-24 md:w-40 md:h-32 bg-blue-300 rounded-bl-2xl" />
                </div>
            </div>

            {/* --- Tab Selector and Header --- */}
            <div className="w-full flex justify-center mb-6">
        <div className="flex gap-2 bg-gray-100 rounded-full p-2 shadow-md">
          <Button className={`px-6 py-2 rounded-full font-bold text-base ${tab === 'feed' ? 'bg-blue-600 text-white shadow' : 'bg-white text-blue-600'}`} type="button" onClick={(e) => { e.stopPropagation(); e.preventDefault(); setTab('feed'); navigate('/feed', { replace: true }); }}>
            General Feed
          </Button>
          <Button className={`px-6 py-2 rounded-full font-bold text-base ${tab === 'myFeed' ? 'bg-blue-600 text-white shadow' : 'bg-white text-blue-600'}`} type="button" onClick={(e) => { e.stopPropagation(); e.preventDefault(); setTab('myFeed'); navigate('/feed/myfeed', { replace: true }); }}>
            My Feed
          </Button>
        </div>
      </div>

            {/* --- All Posts Feed (Modified to use FeedItemCard) --- */}
            <div className="w-full flex flex-col items-center mb-10">
                <h2 className="text-xl md:text-2xl font-bold text-blue-800 mb-4 w-full max-w-5xl px-3 md:px-0">{tab === 'feed' ? 'All Posts Feed' : 'My Personal Feed'}</h2>
                
                <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto px-2 md:px-0">
                    {loading && currentPage === 1 ? (
                        <div className="text-center text-blue-400 p-8">Loading feed...</div>
                    ) : error ? (
                        <div className="text-center text-red-400 p-8">{error}</div>
                    ) : posts.length === 0 ? (
                        <div className="col-span-full text-center text-gray-500 p-8 border-2 border-dashed border-gray-200 rounded-xl">
                            No posts found in this feed. Try adjusting your filters.
                        </div>
                    ) : (
                        posts.map((post, idx) => (
                            <FeedItemCard key={post.post_id || post.id || idx} post={post} />
                        ))
                    )}
                </div>

                {/* Loading indicator for infinite scroll */}
                {loading && currentPage > 1 && (
                    <div className="text-center text-blue-400 mt-4">Loading more posts...</div>
                )}

                {/* End of results message */}
                {!hasMore && posts.length > 0 && (
                    <div className="text-center text-gray-500 mt-8 py-4 border-t border-gray-200 w-full max-w-5xl">You've reached the end of the {tab} feed.</div>
                )}
            </div>

            {shareToast && <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded shadow-lg z-[9999]">{shareToast}</div>}
        </div>
    );
};

export default FeedPage;
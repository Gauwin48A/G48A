import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Smartphone, Monitor, Shirt, Sofa } from 'lucide-react';
import { FaHeart, FaRegHeart, FaShare, FaEye } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const NAVBAR_HEIGHT = 80; // px, adjust to match your actual navbar height

const MyRecommendations = () => {
	// User preferences fetched from profile
	const [preferences, setPreferences] = useState({ location: '', minPrice: '', maxPrice: '', date: '' });
	const [filters, setFilters] = useState({ category: '', minPrice: '', maxPrice: '', sortBy: 'posted_date', sortOrder: 'desc', page: 1, limit: 10 });
	const [total, setTotal] = useState(0);
	const [posts, setPosts] = useState([]);
	const [error, setError] = useState(null);
	const [loading, setLoading] = useState(false);
	const [currentPage, setCurrentPage] = useState(1);
	const [hasMore, setHasMore] = useState(true);
	const postsPerPage = 6;
	const navigate = useNavigate();
	const [expandedPost, setExpandedPost] = useState(null);
	const [likedPosts, setLikedPosts] = useState({});
	const [likeCounts, setLikeCounts] = useState({});
	const [viewCounts, setViewCounts] = useState({});
	const [shareToast, setShareToast] = useState("");
	const [categories, setCategories] = useState([]);

	// Fetch user preferences from profile
	useEffect(() => {
		const fetchPreferences = async () => {
			const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
			const userId = localStorage.getItem('userId');
			if (!userId) return;
			const res = await fetch(`${baseUrl}/api/profile/preferences?userId=${userId}`);
			if (res.ok) {
				const data = await res.json();
				setPreferences({
					location: data.location || '',
					minPrice: data.minPrice || '',
					maxPrice: data.maxPrice || '',
					date: data.date || ''
				});
			}
		};
		fetchPreferences();
	}, []);

	// Fetch posts based on preferences
	useEffect(() => {
		setLoading(true);
		const fetchPosts = async () => {
			try {
				const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
				const token = localStorage.getItem('authToken');
				const userId = localStorage.getItem('userId');
				if (!userId) throw new Error('User not logged in');
				// Merge preferences into filters for recommendations
				const paramsObj = {
					...filters,
					location: preferences.location,
					minPrice: preferences.minPrice,
					maxPrice: preferences.maxPrice,
					date: preferences.date,
					userId
				};
				Object.keys(paramsObj).forEach(key => {
					if (!paramsObj[key]) delete paramsObj[key];
				});
				const params = new URLSearchParams(paramsObj).toString();
				const res = await fetch(`${baseUrl}/api/recommendations?${params}`, {
					method: 'GET',
					headers: {
						'Content-Type': 'application/json',
						...(token ? { 'Authorization': `Bearer ${token}` } : {})
					},
					credentials: 'include'
				});
				if (!res.ok) {
					const errorData = await res.json().catch(() => ({}));
					throw new Error(errorData.error || 'Failed to fetch posts');
				}
				const data = await res.json();
				setPosts(Array.isArray(data.posts) ? data.posts : []);
				setTotal(data.total || 0);
				setError(null);
				// Set like/view counts from backend if available
				const likes = {};
				const views = {};
				(data.posts || []).forEach(post => {
					likes[post.id] = post.likes || 0;
					views[post.id] = post.views || 0;
				});
				setLikeCounts(likes);
				setViewCounts(views);
			} catch (err) {
				setError(err.message || 'Failed to fetch posts');
				setPosts([]);
				setTotal(0);
			} finally {
				setLoading(false);
			}
		};
		fetchPosts();
	}, [preferences, filters]);

	// Categories (fetched from server)
	useEffect(() => {
		const fetchCategories = async () => {
			try {
				const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
				const res = await fetch(`${baseUrl}/api/categories`);
				if (!res.ok) throw new Error('Failed to fetch categories');
				const data = await res.json();
				setCategories(Array.isArray(data) ? data : []);
			} catch (err) {
				// ignore
			}
		};
		fetchCategories();
	}, []);

	// Pagination logic
	const totalPosts = posts.length;
	const totalPages = Math.ceil(totalPosts / postsPerPage);
	const currentPosts = posts.slice(0, currentPage * postsPerPage);

	// Infinite scroll
	const loadMorePosts = useCallback(() => {
		if (loading || currentPage >= totalPages) return;
		setLoading(true);
		setTimeout(() => {
			setCurrentPage(prev => prev + 1);
			setLoading(false);
		}, 1000);
	}, [loading, currentPage, totalPages]);

	useEffect(() => {
		setHasMore(currentPage < totalPages);
	}, [currentPage, totalPages]);

	useEffect(() => {
		const handleScroll = () => {
			if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 1000) {
				loadMorePosts();
			}
		};
		window.addEventListener('scroll', handleScroll);
		return () => window.removeEventListener('scroll', handleScroll);
	}, [loadMorePosts]);

	useEffect(() => {
		setCurrentPage(1);
	}, [filters, preferences]);

	// Sponsored Deals (show 4/5 only)
	const sponsoredDeals = posts.filter(post => post.isSponsored).slice(0, 5);

	// Like handler (API call)
	const handleLike = async (postId) => {
		const alreadyLiked = likedPosts[postId];
		setLikedPosts(prev => ({ ...prev, [postId]: !prev[postId] }));
		setLikeCounts(prev => ({ ...prev, [postId]: prev[postId] + (alreadyLiked ? -1 : 1) }));
		try {
			await fetch(`/api/posts/${postId}/like`, { method: 'POST', credentials: 'include' });
		} catch {}
	};

	// View handler (API call)
	const handleView = async (postId) => {
		setViewCounts(prev => ({ ...prev, [postId]: (prev[postId] || 0) + 1 }));
		try {
			await fetch(`/api/posts/${postId}/view`, { method: 'POST', credentials: 'include' });
		} catch {}
	};

	// Share handler (copy link, API call)
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

	// When user clicks View Details, increment view count and navigate
	const handleViewDetails = (postId) => {
		handleView(postId);
		navigate(`/post/${postId}`);
	};

	return (
		<div className="bg-white min-h-screen">
			{/* Sticky Categories Bar (improved: shadow, blur, border, more separation) */}
			<div className="sticky z-50 w-full flex justify-center mt-6" style={{ top: NAVBAR_HEIGHT }}>
				<div className="flex bg-white/80 backdrop-blur-md border border-blue-300 shadow-lg rounded-2xl px-2 md:px-6 py-2 md:py-4 gap-4 md:gap-8 w-full max-w-5xl items-center justify-center overflow-x-auto scrollbar-hide ring-2 ring-blue-100">
					{categories.map((cat) => (
						<div key={cat.label} className="flex flex-col items-center gap-1 cursor-pointer hover:bg-blue-50 rounded-xl px-2 py-1 min-w-[70px] md:min-w-[90px] transition-all">
							{cat.icon}
							<span className="text-xs md:text-sm font-medium text-gray-700">{cat.label}</span>
						</div>
					))}
				</div>
			</div>
			{/* Add margin below sticky bar so posts never go under it visually */}
			<div className="h-6 md:h-8" />
			{/* Banner (aligned with categories, responsive, full width) */}
			<div className="w-full flex justify-center">
				<div className="flex flex-col md:flex-row items-center justify-between px-3 md:px-8 py-6 md:py-8 bg-blue-100 rounded-xl mb-8 shadow-lg w-full max-w-5xl relative overflow-hidden border border-blue-200 mt-0 md:mt-6">
					<div className="flex flex-col gap-2 z-10 w-full md:w-auto">
						<span className="text-xl md:text-3xl font-bold text-blue-900 mb-1">Recommended For You</span>
						<span className="text-sm md:text-base text-blue-800 font-medium mb-2">Based on your preferences</span>
						<Button className="bg-blue-600 text-white font-semibold px-5 md:px-6 py-2 rounded-lg shadow hover:bg-blue-700 transition w-fit text-sm md:text-base" onClick={() => navigate('/profile')}>Edit Preferences</Button>
					</div>
					<div className="mt-4 md:mt-0 md:ml-8 z-10">
						<div className="w-24 h-16 md:w-32 md:h-24 bg-blue-200 rounded-lg flex items-center justify-center">
							<svg width="64" height="48" fill="none" viewBox="0 0 64 48"><rect width="64" height="48" rx="8" fill="#2563eb" /></svg>
						</div>
					</div>
					<div className="absolute right-0 bottom-0 opacity-10 w-32 h-24 md:w-40 md:h-32 bg-blue-300 rounded-bl-2xl" />
				</div>
			</div>
			{/* Sponsored Deals (horizontal grid, 4/5 only) */}
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
			{/* All Posts Feed - Instagram/Facebook style modern card */}
			<div className="w-full flex flex-col items-center mb-10">
				<h2 className="text-xl md:text-2xl font-bold text-blue-800 mb-4 w-full max-w-5xl px-3 md:px-0">Recommended Posts</h2>
				<div className="flex flex-col gap-6 w-full max-w-5xl mx-auto px-2 md:px-0">
					{loading ? (
						<div className="text-center text-blue-400">Loading...</div>
					) : error ? (
						<div className="text-center text-red-400">{error}</div>
					) : currentPosts.length === 0 ? (
						<div className="col-span-full text-center text-blue-400">No posts available right now.</div>
					) : (
						currentPosts.map((post, idx) => {
							const liked = likedPosts[post.id];
							return (
								<Card key={post.id || post._id || idx} className="rounded-2xl shadow bg-white border border-blue-100 flex flex-col p-0 overflow-hidden hover:shadow-xl transition-shadow">
									{/* Header: Avatar, Username, Category */}
									<div className="flex items-center gap-3 px-4 pt-4 pb-2">
										<Avatar className="w-10 h-10">
											<AvatarFallback>{post.user?.name?.[0] || 'U'}</AvatarFallback>
										</Avatar>
										<div className="flex-1 min-w-0">
											<div className="font-semibold text-blue-900 text-base md:text-lg truncate">{post.user?.name || 'Unknown'}</div>
											<div className="text-gray-500 text-xs">{post.category}</div>
										</div>
										<span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold">{post.status || 'STANDARD'}</span>
									</div>
									{/* Post Image (reduced height for more compact, Facebook/Instagram style) */}
									<div className="w-full h-48 md:h-56 bg-gray-100 flex items-center justify-center overflow-hidden">
										{/* Replace with actual image if available */}
										<span className="text-gray-400">Image</span>
									</div>
									{/* Description (truncated, with View More) */}
									<div className="px-4 py-3 text-gray-800 text-sm md:text-base">
										{expandedPost === post.id || !post.description || post.description.length < 120
											? post.description || <span className="italic text-gray-400">No description</span>
											: <>
												{post.description.slice(0, 120)}...{' '}
												<button className="text-blue-600 font-semibold hover:underline" onClick={() => setExpandedPost(post.id)}>View More</button>
											</>
										}
									</div>
									{/* Actions: Like, Share, Views */}
									<div className="flex items-center justify-between px-4 pb-4 pt-2 border-t border-gray-100">
										<div className="flex gap-5">
											<button className={`flex items-center gap-1 font-semibold focus:outline-none`} onClick={() => handleLike(post.id)}>
												{liked ? <FaHeart className="w-4 h-4 text-red-500" /> : <FaRegHeart className="w-4 h-4 text-black" />} Like {likeCounts[post.id] || 0}
											</button>
											<button className="flex items-center gap-1 text-black font-semibold focus:outline-none" onClick={() => handleShare(post.id)}><FaShare className="w-4 h-4" /> Share</button>
											<span className="flex items-center gap-1 text-gray-500 font-semibold"><FaEye className="w-4 h-4" />{viewCounts[post.id] || 0}</span>
										</div>
										<Button className="bg-blue-600 text-white px-4 py-1 text-xs md:text-sm font-medium rounded" onClick={() => handleViewDetails(post.id)}>View Details</Button>
									</div>
								</Card>
							);
						})
					)}
				</div>
				{shareToast && <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded shadow-lg z-[9999]">{shareToast}</div>}
			</div>
		</div>
	);
};

export default MyRecommendations;

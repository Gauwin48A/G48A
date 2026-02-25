
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sparkles, Lock, Gift, TrendingUp, Zap, LogIn, Filter, Star, Heart } from 'lucide-react';
import { FaRegHeart, FaShare, FaHandHoldingHeart } from 'react-icons/fa';
import api from '../lib/api';
import CategoriesGrid from '@/components/CategoriesGrid';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import BuyerInterestModal from '../components/BuyerInterestModal'; // Added BuyerInterestModal
import { useTranslatedPosts } from '../hooks/useTranslatedContent'; // Kept existing import

const MyRecommendations = () => {
	const { t, i18n } = useTranslation();
	const navigate = useNavigate();

	// Auth state
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [authChecked, setAuthChecked] = useState(false);

	// State
	const [preferences, setPreferences] = useState({ location: '', minPrice: '', maxPrice: '', date: '' });
	const [posts, setPosts] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [likedPosts, setLikedPosts] = useState({});
	const [selectedCategory, setSelectedCategory] = useState('');


	// Pagination
	const [page, setPage] = useState(1);
	const [hasMore, setHasMore] = useState(true);
	const [isLoadingMore, setIsLoadingMore] = useState(false);

	// Translate posts when language changes
	const { translatedPosts, isTranslating } = useTranslatedPosts(posts);
	const [shareToast, setShareToast] = useState('');

	// Category icons
	const categoryIcons = {
		'Electronics': '📱', 'Mobiles': '📱', 'Fashion': '👕',
		'Furniture': '🛋️', 'Vehicles': '🚗', 'Books': '📚',
		'Home': '🏠', 'Sports': '⚽', 'Beauty': '💄', 'Kids': '🧸'
	};

	// SECURITY: Check authentication on mount
	useEffect(() => {
		const token = localStorage.getItem('authToken');
		const userId = localStorage.getItem('userId');
		setIsAuthenticated(!!(token && userId));
		setAuthChecked(true);
	}, []);

	// Fetch preferences (only if authenticated)
	useEffect(() => {
		if (!isAuthenticated) return;
		const fetchPreferences = async () => {
			const userId = localStorage.getItem('userId');
			if (!userId) return;
			try {
				const data = await api.get(`/profile/preferences?userId=${userId}`);
				if (data) {
					setPreferences({
						location: data.location || '',
						minPrice: data.minPrice || '',
						maxPrice: data.maxPrice || '',
						date: data.date || ''
					});
				}
			} catch (err) {
				// No preferences found
			}
		};
		fetchPreferences();
	}, [isAuthenticated]);



	// Reset pagination when filters change
	useEffect(() => {
		setPage(1);
		setHasMore(true);
	}, [preferences, selectedCategory]);

	// Fetch recommendations
	useEffect(() => {
		if (!isAuthenticated) return;

		const fetchPosts = async () => {
			if (page === 1) setLoading(true);
			else setIsLoadingMore(true);

			try {
				const userId = localStorage.getItem('userId');
				const params = {
					location: preferences.location,
					minPrice: preferences.minPrice,
					maxPrice: preferences.maxPrice,
					category: selectedCategory,
					userId,
					page,
					limit: 12 // Fetch 12 at a time
				};
				Object.keys(params).forEach(key => !params[key] && delete params[key]);

				const data = await api.get('/recommendations', { params });
				const newPosts = Array.isArray(data?.posts) ? data.posts : [];

				if (page === 1) {
					setPosts(newPosts);
				} else {
					setPosts(prev => [...prev, ...newPosts]);
				}

				setHasMore(newPosts.length === 12); // If we got less than limit, no more pages
				setError(null);
			} catch (err) {
				setError('Failed to load recommendations');
				if (page === 1) setPosts([]);
			} finally {
				setLoading(false);
				setIsLoadingMore(false);
			}
		};

		fetchPosts();
	}, [isAuthenticated, preferences, selectedCategory, page]);

	// Handlers
	const handleLike = async (postId) => {
		setLikedPosts(prev => ({ ...prev, [postId]: !prev[postId] }));
		try { await api.post(`/posts/${postId}/like`); } catch (err) { }
	};

	const handleShare = async (postId) => {
		const url = `${window.location.origin}/post/${postId}`;
		try {
			await navigator.clipboard.writeText(url);
			setShareToast('Link copied!');
			setTimeout(() => setShareToast(''), 2000);
		} catch (err) {
			setShareToast('Failed to copy link');
			setTimeout(() => setShareToast(''), 2000);
		}
	};

	const getImageUrl = (img) => {
		if (!img) return '/placeholder.svg';
		if (img.startsWith('http')) return img;
		return `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}${img}`;
	};

	// ==========================================
	// SECURITY: Not Authenticated - Show Login Screen
	// ==========================================
	if (authChecked && !isAuthenticated) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
				{/* Animated background */}
				<div className="absolute inset-0 overflow-hidden">
					<div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
					<div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000" />
					<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse delay-500" />
				</div>

				<div className="relative z-10 max-w-md w-full">
					{/* Glass card */}
					<div className="bg-white/10 backdrop-blur-2xl rounded-3xl p-8 border border-white/20 shadow-2xl">
						{/* Icon */}
						<div className="flex justify-center mb-6">
							<div className="relative">
								<div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-xl">
									<Lock className="w-10 h-10 text-white" />
								</div>
								<div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
									<Sparkles className="w-4 h-4 text-white" />
								</div>
							</div>
						</div>

						{/* Content */}
						<h1 className="text-3xl font-bold text-white text-center mb-3">
							{t('access_restricted') || 'Access Restricted'}
						</h1>
						<p className="text-gray-300 text-center mb-8">
							Sign in to view personalized recommendations curated just for you
						</p>

						{/* Features preview */}
						<div className="space-y-3 mb-8">
							{[
								{ icon: Gift, text: 'Personalized product picks' },
								{ icon: TrendingUp, text: 'Based on your preferences' },
								{ icon: Zap, text: 'Real-time updates' }
							].map((item, i) => (
								<div key={i} className="flex items-center gap-3 text-gray-300">
									<div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
										<item.icon className="w-4 h-4 text-purple-400" />
									</div>
									<span className="text-sm">{item.text}</span>
								</div>
							))}
						</div>

						{/* Actions */}
						<Button
							onClick={() => navigate('/login')}
							className="w-full h-14 bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 hover:from-purple-700 hover:via-blue-700 hover:to-indigo-700 text-white font-semibold text-lg rounded-xl shadow-lg shadow-purple-500/30 transition-all hover:scale-105"
						>
							<LogIn className="w-5 h-5 mr-2" />
							{t('sign_in_to_continue') || 'Sign In to Continue'}
						</Button>

						<p className="text-gray-400 text-center mt-6 text-sm">
							Don't have an account?{' '}
							<span
								onClick={() => navigate('/signup')}
								className="text-purple-400 hover:text-purple-300 cursor-pointer font-medium"
							>
								{t('create_one_now') || 'Create one now'}
							</span>
						</p>
					</div>
				</div>
			</div>
		);
	}

	// ==========================================
	// AUTHENTICATED: Show Full Recommendations UI
	// ==========================================
	// ==========================================
	// AUTHENTICATED: Show Full Recommendations UI
	// ==========================================
	return (
		<div className="min-h-screen bg-white dark:bg-gray-900 pb-20 pt-20">

			<div className="max-w-6xl mx-auto px-4 pt-4">

				{/* Categories - Matching Home Style */}
				<div className="mb-6">
					<CategoriesGrid
						onCategorySelect={setSelectedCategory}
						activeCategory={selectedCategory}
					/>
				</div>

				{/* Great Deals Banner */}
				<div className="bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 rounded-2xl p-6 mb-8 flex items-center justify-between relative overflow-hidden shadow-sm">
					{/* Background Decoration */}
					<div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-blue-300/20 to-transparent skew-x-12 transform translate-x-10" />

					<div className="relative z-10 max-w-lg">
						<h2 className="text-3xl font-bold text-blue-900 dark:text-blue-100 mb-2">Great Deals</h2>
						<p className="text-blue-700 dark:text-blue-200 mb-6 text-lg font-medium">Up to 50% off on selected items</p>
						<Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-2 rounded-xl shadow-lg hover:shadow-xl transition-all">
							Shop Now
						</Button>
					</div>

					{/* Placeholder for banner image/graphic if needed */}
					<div className="hidden md:block w-32 h-32 bg-blue-500/20 rounded-2xl backdrop-blur-sm mr-8"></div>
				</div>

				{/* Sponsored Deals Section */}
				<div className="mb-8">
					<h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Sponsored Deals</h3>
					<p className="text-blue-500 dark:text-blue-400 text-sm">No sponsored deals</p>
				</div>

				{/* All Posts Header */}
				<h3 className="text-2xl font-bold text-blue-700 dark:text-blue-300 mb-4">All Posts</h3>

				{loading ? (
					<div className="grid grid-cols-1 gap-6">
						{[1, 2, 3].map((n) => (
							<div key={n} className="bg-white dark:bg-gray-800 rounded-2xl p-4 h-96 animate-pulse">
								<div className="h-12 w-full bg-gray-200 dark:bg-gray-700 rounded-lg mb-4" />
								<div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg mb-4" />
								<div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded-lg" />
							</div>
						))}
					</div>
				) : posts.length === 0 ? (
					<div className="text-center py-20">
						<div className="w-24 h-24 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
							<Sparkles className="w-12 h-12 text-blue-500" />
						</div>
						<h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('no_recommendations')}</h3>
						<p className="text-gray-500 dark:text-gray-400">Interact with more posts to get personalized picks!</p>
					</div>
				) : (
					<div className="flex flex-col gap-6 w-full max-w-5xl mx-auto">
						{translatedPosts.map((post, index) => (
							<Card
								key={post.post_id || post.id}
								className="rounded-3xl shadow-md bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-shadow duration-300"
							>
								{/* Card Header: User Info at TOP (As requested) */}
								<div className="flex items-center gap-4 p-4 border-b border-gray-50 dark:border-gray-700/50">
									<Avatar className="w-12 h-12 border-2 border-blue-100 dark:border-blue-900">
										<AvatarFallback className="bg-blue-50 text-blue-600 font-bold text-lg dark:bg-gray-700 dark:text-blue-300">
											{post.user?.name?.[0]?.toUpperCase() || 'U'}
										</AvatarFallback>
									</Avatar>
									<div className="flex-1 min-w-0">
										<h4 className="font-bold text-gray-900 dark:text-white text-base truncate">
											{post.user?.name || t('unknown') || 'Rahul Sharma'}
										</h4>
										<p className="text-gray-500 dark:text-gray-400 text-xs font-medium">
											{post.category || post.category_name || 'Sports'}
										</p>
									</div>
								</div>

								{/* Image Section - Middle */}
								<div className="w-full bg-gray-50 dark:bg-gray-900 flex items-center justify-center relative">
									{/* Aspect ratio container */}
									<div className="w-full aspect-video relative">
										<img
											src={getImageUrl(post.images?.[0] || post.image_url)}
											alt={post.title}
											className="w-full h-full object-cover"
											onError={(e) => { e.target.src = '/placeholder.svg'; }}
										/>
										{/* Price Tag Overlay */}
										{/* <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-md px-4 py-1.5 rounded-full shadow-lg">
											<span className="text-white font-bold text-lg">₹{post.price?.toLocaleString()}</span>
										</div> */}
									</div>

									{/* Centered Placeholder Text if no image (for debugging/visual structure) */}
									{!post.images?.[0] && !post.image_url && (
										<span className="text-gray-300 dark:text-gray-600 text-4xl font-bold absolute">Image</span>
									)}
								</div>

								{/* Actions / Add Button Overlay */}
								<div className="relative h-12 -mt-6 z-10 flex justify-center">
									<div className="bg-white dark:bg-gray-800 p-1 rounded-full shadow-lg">
										<Button
											onClick={() => navigate(`/post/${post.post_id || post.id}`)}
											className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center p-0 shadow-md"
										>
											<span className="text-2xl pb-1">+</span>
										</Button>
									</div>
								</div>

								{/* Hidden Footer (Since actions are minimal in screenshot or handled differently) */}
								{/* We can add title/price back here if needed below image, but screenshot emphasized clean image look */}
								<div className="px-4 pb-4 text-center">
									{/* Optional: Add title back if needed for context, but keeping it minimal as per visual hierarchy */}
									{/* <h3 className="font-bold text-lg mt-2">{post.title}</h3> */}
								</div>
							</Card>
						))}

						{hasMore && !loading && (
							<div className="flex justify-center pt-8 pb-4">
								<Button
									onClick={() => setPage(p => p + 1)}
									disabled={isLoadingMore}
									className="bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-gray-700 px-8 py-2 rounded-full shadow-sm transition-all"
								>
									{isLoadingMore ? (
										<>
											<div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></div>
											{t('loading') || 'Loading...'}
										</>
									) : (
										t('load_more') || 'Load More'
									)}
								</Button>
							</div>
						)}
					</div>
				)}
			</div>
			{/* Toast for share feedback */}
			{shareToast && (
				<div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-xl shadow-2xl z-[9999] animate-bounce">
					{shareToast}
				</div>
			)}
		</div>
	);
};

export default MyRecommendations;


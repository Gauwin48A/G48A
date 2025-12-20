import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
	Heart, Share2, MapPin, Sparkles, Filter, ShoppingBag,
	TrendingUp, Lock, LogIn, Zap, Star, ChevronRight, Gift, ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useTranslation } from 'react-i18next';

const MyRecommendations = () => {
	const { t } = useTranslation();
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
	const [categories, setCategories] = useState([]);
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
				const res = await api.get(`/api/profile/preferences?userId=${userId}`);
				if (res.data) {
					setPreferences({
						location: res.data.location || '',
						minPrice: res.data.minPrice || '',
						maxPrice: res.data.maxPrice || '',
						date: res.data.date || ''
					});
				}
			} catch (err) {
				console.log('No preferences found');
			}
		};
		fetchPreferences();
	}, [isAuthenticated]);

	// Fetch categories
	useEffect(() => {
		if (!isAuthenticated) return;
		const fetchCategories = async () => {
			try {
				const res = await api.get('/api/categories');
				setCategories(Array.isArray(res.data) ? res.data : []);
			} catch (err) { }
		};
		fetchCategories();
	}, [isAuthenticated]);

	// Fetch recommendations
	useEffect(() => {
		if (!isAuthenticated) return;
		const fetchPosts = async () => {
			setLoading(true);
			try {
				const userId = localStorage.getItem('userId');
				const params = {
					location: preferences.location,
					minPrice: preferences.minPrice,
					maxPrice: preferences.maxPrice,
					category: selectedCategory,
					userId
				};
				Object.keys(params).forEach(key => !params[key] && delete params[key]);
				const res = await api.get('/api/recommendations', { params });
				setPosts(Array.isArray(res.data?.posts) ? res.data.posts : []);
				setError(null);
			} catch (err) {
				setError('Failed to load recommendations');
				setPosts([]);
			} finally {
				setLoading(false);
			}
		};
		fetchPosts();
	}, [isAuthenticated, preferences, selectedCategory]);

	// Handlers
	const handleLike = async (postId) => {
		setLikedPosts(prev => ({ ...prev, [postId]: !prev[postId] }));
		try { await api.post(`/api/posts/${postId}/like`); } catch (err) { }
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
							Access Restricted
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
							Sign In to Continue
						</Button>

						<p className="text-gray-400 text-center mt-6 text-sm">
							Don't have an account?{' '}
							<span
								onClick={() => navigate('/signup')}
								className="text-purple-400 hover:text-purple-300 cursor-pointer font-medium"
							>
								Create one now
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
	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
			{/* Animated Background Elements */}
			<div className="fixed inset-0 overflow-hidden pointer-events-none">
				<div className="absolute top-20 left-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
				<div className="absolute top-40 right-10 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000" />
				<div className="absolute bottom-20 left-1/3 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-500" />
			</div>

			{/* Premium Header Banner */}
			<div className="relative overflow-hidden">
				<div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600" />
				<div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNCA0LTEuNzkgNC00eiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />

				<div className="relative max-w-7xl mx-auto px-4 py-14 sm:px-6 lg:px-8">
					{/* Back Button */}
					<button
						onClick={() => navigate(-1)}
						className="absolute top-4 left-4 p-2 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-all"
					>
						<ArrowLeft className="w-6 h-6 text-white" />
					</button>

					<div className="flex flex-col md:flex-row items-center justify-between gap-8">
						<div className="text-center md:text-left">
							<div className="flex items-center gap-4 justify-center md:justify-start mb-4">
								<div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
									<Sparkles className="w-8 h-8 text-yellow-300 animate-pulse" />
								</div>
								<div>
									<h1 className="text-4xl md:text-5xl font-bold text-white drop-shadow-lg">
										{t('my_recommendations') || 'My Recommendations'}
									</h1>
									<p className="text-blue-100 text-lg mt-1">
										AI-powered picks just for you ✨
									</p>
								</div>
							</div>
						</div>

						{/* Stats Cards */}
						<div className="flex gap-4">
							<div className="bg-white/20 backdrop-blur-md rounded-2xl p-4 border border-white/30 text-center min-w-[100px]">
								<div className="text-3xl font-bold text-white">{posts.length}</div>
								<div className="text-blue-100 text-sm">Picks</div>
							</div>
							<div className="bg-white/20 backdrop-blur-md rounded-2xl p-4 border border-white/30 text-center min-w-[100px]">
								<div className="text-3xl font-bold text-white">{categories.length}</div>
								<div className="text-blue-100 text-sm">Categories</div>
							</div>
						</div>
					</div>

					{/* Preferences Badge */}
					{(preferences.location || preferences.minPrice || preferences.maxPrice) && (
						<div className="mt-6 flex flex-wrap gap-3 justify-center md:justify-start">
							{preferences.location && (
								<Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30 px-4 py-2 text-sm">
									<MapPin className="w-4 h-4 mr-2" />{preferences.location}
								</Badge>
							)}
							{(preferences.minPrice || preferences.maxPrice) && (
								<Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30 px-4 py-2 text-sm">
									💰 ₹{preferences.minPrice || '0'} - ₹{preferences.maxPrice || '∞'}
								</Badge>
							)}
							<Button
								onClick={() => navigate('/profile')}
								className="bg-white/20 hover:bg-white/30 text-white border border-white/30"
								size="sm"
							>
								Edit Preferences <ChevronRight className="w-4 h-4 ml-1" />
							</Button>
						</div>
					)}
				</div>
			</div>

			{/* Category Filter Pills */}
			<div className="max-w-7xl mx-auto px-4 py-8">
				<div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
					<button
						onClick={() => setSelectedCategory('')}
						className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold transition-all whitespace-nowrap ${selectedCategory === ''
							? 'bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 text-white shadow-xl shadow-purple-500/30 scale-105'
							: 'bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm text-gray-700 dark:text-gray-300 hover:shadow-lg border border-gray-200 dark:border-gray-700'
							}`}
					>
						<ShoppingBag className="w-5 h-5" /> All Items
					</button>
					{categories.map(cat => (
						<button
							key={cat.category_id || cat.name}
							onClick={() => setSelectedCategory(cat.name)}
							className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold transition-all whitespace-nowrap ${selectedCategory === cat.name
								? 'bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 text-white shadow-xl shadow-purple-500/30 scale-105'
								: 'bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm text-gray-700 dark:text-gray-300 hover:shadow-lg border border-gray-200 dark:border-gray-700'
								}`}
						>
							<span className="text-xl">{categoryIcons[cat.name] || '📦'}</span> {cat.name}
						</button>
					))}
				</div>
			</div>

			{/* Posts Grid */}
			<div className="max-w-7xl mx-auto px-4 pb-16">
				{loading ? (
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
						{[...Array(8)].map((_, i) => (
							<div key={i} className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-3xl p-5 animate-pulse border border-white/50">
								<div className="w-full h-52 bg-gray-200 dark:bg-gray-700 rounded-2xl mb-4" />
								<div className="h-5 bg-gray-200 dark:bg-gray-700 rounded-full w-3/4 mb-3" />
								<div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full w-1/2" />
							</div>
						))}
					</div>
				) : posts.length === 0 ? (
					<div className="text-center py-24">
						<div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-blue-600 rounded-3xl mx-auto mb-6 flex items-center justify-center">
							<Sparkles className="w-12 h-12 text-white" />
						</div>
						<h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-3">No recommendations yet</h3>
						<p className="text-gray-500 mb-6 max-w-md mx-auto">Set your preferences to get personalized product recommendations</p>
						<Button
							onClick={() => navigate('/profile')}
							className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-6 text-lg rounded-2xl shadow-xl hover:scale-105 transition-all"
						>
							<Filter className="w-5 h-5 mr-2" /> Set Preferences
						</Button>
					</div>
				) : (
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
						{posts.map((post, index) => (
							<Card
								key={post.post_id || post.id}
								className="group bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-3xl overflow-hidden border border-white/50 dark:border-gray-700/50 shadow-xl hover:shadow-2xl transform hover:-translate-y-3 hover:scale-[1.02] transition-all duration-500"
								style={{ animationDelay: `${index * 100}ms` }}
							>
								{/* Image */}
								<div className="relative w-full h-56 overflow-hidden">
									<img
										src={getImageUrl(post.images?.[0] || post.image_url)}
										alt={post.title}
										className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
										onError={(e) => { e.target.src = '/placeholder.svg'; }}
									/>
									<div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

									{/* Like Button */}
									<button
										onClick={(e) => { e.stopPropagation(); handleLike(post.post_id || post.id); }}
										className="absolute top-4 right-4 p-3 rounded-2xl bg-white/90 dark:bg-gray-800/90 shadow-xl hover:scale-110 transition-all duration-300"
									>
										<Heart className={`w-5 h-5 ${likedPosts[post.post_id || post.id] ? 'fill-red-500 text-red-500 animate-pulse' : 'text-gray-600 dark:text-gray-400'}`} />
									</button>

									{/* Category Badge */}
									<Badge className="absolute top-4 left-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0 px-4 py-1.5 rounded-xl font-semibold shadow-lg">
										{categoryIcons[post.category_name || post.category] || '📦'} {post.category_name || post.category || 'General'}
									</Badge>

									{/* Match Score */}
									<div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-xl flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
										<Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
										<span className="text-white text-sm font-medium">Great Match</span>
									</div>
								</div>

								{/* Content */}
								<div className="p-5">
									<h3 className="font-bold text-gray-800 dark:text-white text-lg mb-2 line-clamp-1 group-hover:text-purple-600 transition-colors">
										{post.title}
									</h3>
									<p className="text-gray-500 dark:text-gray-400 text-sm mb-4 line-clamp-2">
										{post.description || 'Premium quality product'}
									</p>

									{/* Price & Location */}
									<div className="flex items-center justify-between mb-4">
										<span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
											₹{post.price?.toLocaleString() || '0'}
										</span>
										<div className="flex items-center gap-1.5 text-gray-500 text-sm bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-lg">
											<MapPin className="w-4 h-4" />
											{post.location || 'N/A'}
										</div>
									</div>

									{/* Actions */}
									<div className="flex items-center gap-3">
										<Button
											onClick={() => navigate(`/post/${post.post_id || post.id}`)}
											className="flex-1 bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 hover:from-purple-700 hover:via-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl h-12 shadow-lg shadow-purple-500/20"
										>
											View Details
										</Button>
										<button
											onClick={(e) => { e.stopPropagation(); handleShare(post.post_id || post.id); }}
											className="p-3 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all hover:scale-105"
										>
											<Share2 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
										</button>
									</div>
								</div>
							</Card>
						))}
					</div>
				)}
			</div>

			{/* Toast for share feedback */}
			{shareToast && (
				<div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-xl shadow-2xl z-[9999] animate-bounce">
					{shareToast}
				</div>
			)}
		</div>
	);
};

export default MyRecommendations;

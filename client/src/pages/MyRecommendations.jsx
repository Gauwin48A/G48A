import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, Share2, Eye, MapPin, Star, ShoppingBag, Sparkles, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useTranslation } from 'react-i18next';

const MyRecommendations = () => {
	const { t } = useTranslation();
	const navigate = useNavigate();

	// State
	const [preferences, setPreferences] = useState({ location: '', minPrice: '', maxPrice: '', date: '' });
	const [posts, setPosts] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [likedPosts, setLikedPosts] = useState({});
	const [selectedCategory, setSelectedCategory] = useState('');
	const [categories, setCategories] = useState([]);

	// Category icons mapping
	const categoryIcons = {
		'Electronics': '📱',
		'Mobiles': '📱',
		'Fashion': '👕',
		'Furniture': '🛋️',
		'Vehicles': '🚗',
		'Books': '📚',
		'Home': '🏠',
		'Sports': '⚽',
		'Beauty': '💄',
	};

	// Fetch user preferences
	useEffect(() => {
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
	}, []);

	// Fetch categories
	useEffect(() => {
		const fetchCategories = async () => {
			try {
				const res = await api.get('/api/categories');
				setCategories(Array.isArray(res.data) ? res.data : []);
			} catch (err) {
				console.error('Failed to fetch categories');
			}
		};
		fetchCategories();
	}, []);

	// Fetch recommended posts based on preferences
	useEffect(() => {
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
				// Remove empty params
				Object.keys(params).forEach(key => !params[key] && delete params[key]);

				const res = await api.get('/api/recommendations', { params });
				setPosts(Array.isArray(res.data?.posts) ? res.data.posts : []);
				setError(null);
			} catch (err) {
				console.error('Failed to fetch recommendations:', err);
				setError('Failed to load recommendations');
				setPosts([]);
			} finally {
				setLoading(false);
			}
		};
		fetchPosts();
	}, [preferences, selectedCategory]);

	// Handlers
	const handleLike = async (postId) => {
		setLikedPosts(prev => ({ ...prev, [postId]: !prev[postId] }));
		try {
			await api.post(`/api/posts/${postId}/like`);
		} catch (err) { }
	};

	const handleShare = async (postId) => {
		const url = `${window.location.origin}/post/${postId}`;
		await navigator.clipboard.writeText(url);
	};

	const handleViewDetails = (postId) => {
		navigate(`/post/${postId}`);
	};

	const getImageUrl = (img) => {
		if (!img) return '/placeholder.svg';
		if (img.startsWith('http')) return img;
		return `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}${img}`;
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
			{/* Premium Header Banner */}
			<div className="relative overflow-hidden">
				<div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 opacity-90" />
				<div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNCA0LTEuNzkgNC00eiIvPjwvZz48L2c+PC9zdmc+')] opacity-20" />

				<div className="relative max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
					<div className="flex flex-col md:flex-row items-center justify-between gap-6">
						<div className="text-center md:text-left">
							<div className="flex items-center gap-3 justify-center md:justify-start mb-3">
								<Sparkles className="w-8 h-8 text-yellow-300 animate-pulse" />
								<h1 className="text-3xl md:text-4xl font-bold text-white">{t('my_recommendations') || 'My Recommendations'}</h1>
							</div>
							<p className="text-blue-100 text-lg">{t('personalized_posts') || 'Posts curated just for you based on your preferences'}</p>
						</div>

						{/* Preferences Summary */}
						<div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
							<h3 className="text-white font-semibold mb-2 flex items-center gap-2">
								<Filter className="w-4 h-4" /> Your Preferences
							</h3>
							<div className="flex flex-wrap gap-2">
								{preferences.location && (
									<Badge className="bg-white/20 text-white border-white/30">
										<MapPin className="w-3 h-3 mr-1" />{preferences.location}
									</Badge>
								)}
								{(preferences.minPrice || preferences.maxPrice) && (
									<Badge className="bg-white/20 text-white border-white/30">
										₹{preferences.minPrice || '0'} - ₹{preferences.maxPrice || '∞'}
									</Badge>
								)}
								{!preferences.location && !preferences.minPrice && !preferences.maxPrice && (
									<Badge className="bg-white/20 text-white border-white/30">No filters - showing all</Badge>
								)}
							</div>
							<Button
								onClick={() => navigate('/profile')}
								className="mt-3 bg-white/20 hover:bg-white/30 text-white border border-white/30 text-sm"
								size="sm"
							>
								Edit Preferences
							</Button>
						</div>
					</div>
				</div>
			</div>

			{/* Category Filter Chips */}
			<div className="max-w-7xl mx-auto px-4 py-6">
				<div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
					<button
						onClick={() => setSelectedCategory('')}
						className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all whitespace-nowrap ${selectedCategory === ''
								? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30'
								: 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:shadow-md border border-gray-200 dark:border-gray-700'
							}`}
					>
						<ShoppingBag className="w-4 h-4" /> All
					</button>
					{categories.map(cat => (
						<button
							key={cat.category_id || cat.name}
							onClick={() => setSelectedCategory(cat.name)}
							className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all whitespace-nowrap ${selectedCategory === cat.name
									? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30'
									: 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:shadow-md border border-gray-200 dark:border-gray-700'
								}`}
						>
							<span>{categoryIcons[cat.name] || '📦'}</span> {cat.name}
						</button>
					))}
				</div>
			</div>

			{/* Posts Grid */}
			<div className="max-w-7xl mx-auto px-4 pb-12">
				{loading ? (
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
						{[...Array(8)].map((_, i) => (
							<div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-4 animate-pulse">
								<div className="w-full h-48 bg-gray-200 dark:bg-gray-700 rounded-xl mb-4" />
								<div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
								<div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
							</div>
						))}
					</div>
				) : error ? (
					<div className="text-center py-20">
						<div className="text-6xl mb-4">😕</div>
						<p className="text-gray-500 text-lg">{error}</p>
						<Button onClick={() => navigate('/profile')} className="mt-4">Set Preferences</Button>
					</div>
				) : posts.length === 0 ? (
					<div className="text-center py-20">
						<div className="text-6xl mb-4">🔍</div>
						<h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">No recommendations yet</h3>
						<p className="text-gray-500 mb-4">Update your preferences to see personalized posts</p>
						<Button onClick={() => navigate('/profile')} className="bg-gradient-to-r from-blue-600 to-indigo-600">
							Set Preferences
						</Button>
					</div>
				) : (
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
						{posts.map((post) => (
							<Card
								key={post.post_id || post.id}
								className="group bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border-0 shadow-lg hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300"
							>
								{/* Image */}
								<div className="relative w-full h-48 overflow-hidden">
									<img
										src={getImageUrl(post.images?.[0] || post.image_url)}
										alt={post.title}
										className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
										onError={(e) => { e.target.src = '/placeholder.svg'; }}
									/>
									{/* Like Button */}
									<button
										onClick={(e) => { e.stopPropagation(); handleLike(post.post_id || post.id); }}
										className="absolute top-3 right-3 p-2 rounded-full bg-white/90 dark:bg-gray-800/90 shadow-lg hover:scale-110 transition-transform"
									>
										<Heart className={`w-5 h-5 ${likedPosts[post.post_id || post.id] ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
									</button>
									{/* Category Badge */}
									<Badge className="absolute top-3 left-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0">
										{post.category_name || post.category || 'General'}
									</Badge>
								</div>

								{/* Content */}
								<div className="p-4">
									<h3 className="font-semibold text-gray-800 dark:text-white text-lg mb-1 line-clamp-1">{post.title}</h3>
									<p className="text-gray-500 dark:text-gray-400 text-sm mb-3 line-clamp-2">{post.description || 'No description'}</p>

									{/* Price & Location */}
									<div className="flex items-center justify-between mb-3">
										<span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
											₹{post.price?.toLocaleString() || '0'}
										</span>
										<div className="flex items-center gap-1 text-gray-500 text-sm">
											<MapPin className="w-3 h-3" />
											{post.location || 'N/A'}
										</div>
									</div>

									{/* Actions */}
									<div className="flex items-center gap-2">
										<Button
											onClick={() => handleViewDetails(post.post_id || post.id)}
											className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
										>
											View Details
										</Button>
										<button
											onClick={(e) => { e.stopPropagation(); handleShare(post.post_id || post.id); }}
											className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
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
		</div>
	);
};

export default MyRecommendations;

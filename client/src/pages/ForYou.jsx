import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sparkles, Lock, Gift, TrendingUp, Zap, LogIn, Star } from 'lucide-react';
import api from '../lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useTranslatedPosts } from '../hooks/useTranslatedContent';

const ForYou = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();

    // Read filters from URL params (set by navbar filter modal or search)
    const urlSearch = searchParams.get('search') || '';
    const urlCategory = searchParams.get('category') || '';
    const urlMinPrice = searchParams.get('minPrice') || '';
    const urlMaxPrice = searchParams.get('maxPrice') || '';
    const urlLocation = searchParams.get('location') || '';

    // Auth state
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [authChecked, setAuthChecked] = useState(false);

    // State
    const [preferences, setPreferences] = useState({ location: '', minPrice: '', maxPrice: '', categories: [] });
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Pagination
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    // Force refresh key - changes when navigating to this page
    const [refreshKey, setRefreshKey] = useState(0);

    // Translate posts when language changes
    const { translatedPosts, isTranslating } = useTranslatedPosts(posts);



    // Check authentication on mount
    useEffect(() => {
        const token = localStorage.getItem('authToken');
        const userId = localStorage.getItem('userId');
        setIsAuthenticated(!!(token && userId));
        setAuthChecked(true);
    }, []);



    // Fetch preferences (only if authenticated)
    // Re-fetch when page gains focus or when navigating to this page
    useEffect(() => {
        if (!isAuthenticated) return;

        const fetchPreferences = async () => {
            const userId = localStorage.getItem('userId');
            if (!userId) return;
            try {
                const res = await api.get(`/api/profile/preferences?userId=${userId}`);
                if (res.data) {
                    const userCategories = res.data.categories || [];
                    setPreferences({
                        location: res.data.location || '',
                        minPrice: res.data.minPrice || '',
                        maxPrice: res.data.maxPrice || '',
                        categories: userCategories
                    });
                    console.log('[ForYou] Loaded preferences:', res.data);
                }
            } catch (err) {
                console.log('[ForYou] No preferences found:', err.message);
            }
        };

        // Fetch on mount and on navigation (location.key changes)
        fetchPreferences();

        // Re-fetch when page becomes visible (user navigates back from another tab)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchPreferences();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Also re-fetch when window regains focus
        window.addEventListener('focus', fetchPreferences);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', fetchPreferences);
        };
    }, [isAuthenticated, location.key]); // location.key changes on every navigation

    // Reset pagination when filters change
    useEffect(() => {
        setPage(1);
        setHasMore(true);
    }, [preferences, urlSearch, urlCategory, urlMinPrice, urlMaxPrice, urlLocation]);

    // Fetch recommendations
    useEffect(() => {
        if (!isAuthenticated) return;

        const fetchPosts = async () => {
            if (page === 1) setLoading(true);
            else setIsLoadingMore(true);

            try {
                const userId = localStorage.getItem('userId');
                const params = {
                    // URL filters override saved preferences
                    location: urlLocation || preferences.location,
                    minPrice: urlMinPrice || preferences.minPrice,
                    maxPrice: urlMaxPrice || preferences.maxPrice,
                    category: urlCategory || preferences.categories,
                    search: urlSearch,
                    userId,
                    page,
                    limit: 12
                };
                Object.keys(params).forEach(key => {
                    // Remove empty values
                    if (!params[key] || (Array.isArray(params[key]) && params[key].length === 0)) {
                        delete params[key];
                    }
                });

                console.log('[ForYou] Fetching with params:', params);
                const res = await api.get('/api/recommendations', { params });
                const newPosts = Array.isArray(res.data?.posts) ? res.data.posts : [];

                if (page === 1) {
                    setPosts(newPosts);
                } else {
                    setPosts(prev => [...prev, ...newPosts]);
                }

                setHasMore(newPosts.length === 12);
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
    }, [isAuthenticated, preferences, page, urlSearch, urlCategory, urlMinPrice, urlMaxPrice, urlLocation]);



    const getImageUrl = (img) => {
        if (!img) return '/placeholder.svg';
        if (img.startsWith('http')) return img;
        return `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}${img}`;
    };

    // Not Authenticated - Show Login Screen
    if (authChecked && !isAuthenticated) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
                    <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000" />
                </div>

                <div className="relative z-10 max-w-md w-full">
                    <div className="bg-white/10 backdrop-blur-2xl rounded-3xl p-8 border border-white/20 shadow-2xl">
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

                        <h1 className="text-3xl font-bold text-white text-center mb-3">
                            {t('access_restricted') || 'Access Restricted'}
                        </h1>
                        <p className="text-gray-300 text-center mb-8">
                            Sign in to view personalized recommendations curated just for you
                        </p>

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

    // AUTHENTICATED: Show Full Recommendations UI (Same as Home Page)
    return (
        <div className="min-h-screen bg-white dark:bg-gray-900 pb-20">


            <div className="max-w-6xl mx-auto px-4 pt-4">
                {/* Great Deals Banner */}
                <div className="flex flex-col md:flex-row items-center justify-between px-3 md:px-8 py-6 md:py-8 bg-blue-100 dark:bg-gray-800 rounded-xl mb-8 shadow-lg w-full relative overflow-hidden border border-blue-200 dark:border-gray-700">
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

                {/* Sponsored Deals Section */}
                <div className="mb-8">
                    <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-3 md:mb-4">{t('sponsored_deals')}</h3>
                    <div className="text-center text-blue-400 dark:text-blue-300">{t('no_sponsored_deals')}</div>
                </div>

                {/* Active Search Filter Badge */}
                {urlSearch && (
                    <div className="mb-4 flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-gray-600 dark:text-gray-400">{t('search_results_for') || 'Search results for'}:</span>
                        <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
                            "{urlSearch}"
                            <button
                                onClick={() => {
                                    searchParams.delete('search');
                                    setSearchParams(searchParams);
                                }}
                                className="p-0.5 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full transition"
                                aria-label="Clear search"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </span>
                    </div>
                )}

                {/* All Posts Header */}
                <h3 className="text-xl md:text-2xl font-bold text-blue-800 dark:text-blue-300 mb-4">{urlSearch ? t('search_results') || 'Search Results' : t('for_you') || 'For You'}</h3>

                {loading ? (
                    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto">
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 w-full">
                        {translatedPosts.map((post) => {
                            const imageUrl = post.images?.[0]
                                ? getImageUrl(post.images[0])
                                : post.image_url
                                    ? getImageUrl(post.image_url)
                                    : '/placeholder.svg';

                            return (
                                <Card
                                    key={post.post_id || post.id}
                                    className="group rounded-2xl shadow-md hover:shadow-2xl bg-white dark:bg-gray-800 border-0 overflow-hidden transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                                    onClick={() => navigate(`/post/${post.post_id || post.id}`)}
                                >
                                    {/* Image Section with Gradient Overlay */}
                                    <div className="relative w-full aspect-[4/3] bg-gradient-to-br from-blue-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 overflow-hidden">
                                        <img
                                            src={imageUrl}
                                            alt={post.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            onError={(e) => {
                                                e.target.onerror = null;
                                                e.target.src = '/placeholder.svg';
                                            }}
                                        />
                                        {/* Category Badge */}
                                        <div className="absolute top-3 left-3">
                                            <span className="px-2.5 py-1 bg-white/90 dark:bg-gray-900/90 text-blue-600 dark:text-blue-400 text-xs font-semibold rounded-full backdrop-blur-sm shadow-sm">
                                                {post.category || post.category_name || 'General'}
                                            </span>
                                        </div>
                                        {/* Wishlist Button */}
                                        <button
                                            className="absolute top-3 right-3 w-8 h-8 bg-white/90 dark:bg-gray-900/90 rounded-full flex items-center justify-center shadow-sm hover:bg-red-50 dark:hover:bg-red-900/50 transition-colors"
                                            onClick={(e) => { e.stopPropagation(); }}
                                        >
                                            <svg className="w-4 h-4 text-gray-400 hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                            </svg>
                                        </button>
                                    </div>

                                    {/* Content Section */}
                                    <div className="p-4">
                                        {/* Title & Price Row */}
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <h3 className="font-semibold text-gray-900 dark:text-white text-sm md:text-base line-clamp-2 flex-1">
                                                {post.title}
                                            </h3>
                                            <span className="text-blue-600 dark:text-blue-400 font-bold text-base md:text-lg whitespace-nowrap">
                                                ₹{post.price?.toLocaleString() || '0'}
                                            </span>
                                        </div>

                                        {/* Location */}
                                        {post.location && (
                                            <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-xs mb-3">
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                                <span className="truncate">{post.location}</span>
                                            </div>
                                        )}

                                        {/* Seller Info */}
                                        <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
                                            <div className="flex items-center gap-2">
                                                <Avatar className="w-7 h-7">
                                                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs font-medium">
                                                        {(post.author_name || post.seller_name || 'S')[0].toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="text-gray-600 dark:text-gray-300 text-xs font-medium truncate max-w-[100px]">
                                                    {post.author_name || post.seller_name || post.username || 'Seller'}
                                                </span>
                                            </div>
                                            <Button
                                                size="sm"
                                                className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 h-auto rounded-lg shadow-sm"
                                                onClick={(e) => { e.stopPropagation(); navigate(`/post/${post.post_id || post.id}`); }}
                                            >
                                                {t('view_details') || 'View'}
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}

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
        </div>
    );
};

export default ForYou;

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFilter } from '@/context/FilterContext';
import {
    Search,
    ArrowLeft,
    Clock,
    TrendingUp,
    X,
    Sparkles,
    ChevronRight,
    Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const SearchPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { filters, setFilters } = useFilter();
    const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
    const [recentSearches, setRecentSearches] = useState([]);
    const inputRef = useRef(null);

    // Get context from URL params - determines where to navigate after search
    const searchContext = searchParams.get('context') || 'all-posts';
    const isForYouContext = searchContext === 'for-you';

    // Trending searches (can be fetched from API later)
    const trendingSearches = [
        'iPhone 15',
        'Samsung Galaxy',
        'MacBook Pro',
        'Gaming Laptop',
        'AirPods Pro',
        'Smart Watch',
        'LED TV',
        'Refrigerator'
    ];

    // Load recent searches from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('recentSearches');
        if (saved) {
            try {
                setRecentSearches(JSON.parse(saved));
            } catch (e) {
                setRecentSearches([]);
            }
        }
        // Auto-focus search input
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

    // Save recent search
    const saveRecentSearch = (query) => {
        if (!query.trim()) return;
        const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 10);
        setRecentSearches(updated);
        localStorage.setItem('recentSearches', JSON.stringify(updated));
    };

    // Get the target URL based on context
    const getTargetUrl = (query, category = null) => {
        const baseUrl = isForYouContext ? '/for-you' : '/all-posts';
        const params = new URLSearchParams();
        if (query) params.set('search', query);
        if (category) params.set('category', category);
        return `${baseUrl}?${params.toString()}`;
    };

    // Handle search submit
    const handleSearch = (e) => {
        e?.preventDefault();
        if (searchQuery.trim()) {
            saveRecentSearch(searchQuery.trim());
            setFilters(prev => ({ ...prev, search: searchQuery.trim() }));
            navigate(getTargetUrl(searchQuery.trim()));
        }
    };

    // Handle clicking on a search suggestion
    const handleSuggestionClick = (query) => {
        setSearchQuery(query);
        saveRecentSearch(query);
        setFilters(prev => ({ ...prev, search: query }));
        navigate(getTargetUrl(query));
    };

    // Clear all recent searches
    const clearRecentSearches = () => {
        setRecentSearches([]);
        localStorage.removeItem('recentSearches');
    };

    // Remove single recent search
    const removeRecentSearch = (query, e) => {
        e.stopPropagation();
        const updated = recentSearches.filter(s => s !== query);
        setRecentSearches(updated);
        localStorage.setItem('recentSearches', JSON.stringify(updated));
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
            {/* Fixed Header with Search Bar */}
            <div className="sticky top-0 z-50 bg-white dark:bg-gray-900 shadow-lg">
                <div className="max-w-2xl mx-auto px-4 py-3">
                    <form onSubmit={handleSearch} className="flex items-center gap-3">
                        {/* Back Button */}
                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                        >
                            <ArrowLeft className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                        </button>

                        {/* Search Input */}
                        <div className="flex-1 relative">
                            <input
                                ref={inputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={isForYouContext
                                    ? (t('search_for_you') || 'Search in For You...')
                                    : (t('search_placeholder') || 'Search for products, brands and more')}
                                className="w-full h-12 pl-4 pr-12 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition outline-none text-base"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-12 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                                >
                                    <X className="w-4 h-4 text-gray-500" />
                                </button>
                            )}
                            <button
                                type="submit"
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition"
                            >
                                <Search className="w-5 h-5 text-white" />
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-2xl mx-auto px-4 py-6 space-y-6" style={{ paddingBottom: '120px' }}>

                {/* Recent Searches */}
                {recentSearches.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Clock className="w-5 h-5 text-gray-500" />
                                <h2 className="text-lg font-bold text-gray-800 dark:text-white">
                                    {t('recent_searches') || 'Recent Searches'}
                                </h2>
                            </div>
                            <button
                                onClick={clearRecentSearches}
                                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                            >
                                <Trash2 className="w-4 h-4" />
                                {t('clear_all') || 'Clear All'}
                            </button>
                        </div>
                        <div className="space-y-2">
                            {recentSearches.map((query, index) => (
                                <div
                                    key={index}
                                    onClick={() => handleSuggestionClick(query)}
                                    className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition group"
                                >
                                    <div className="flex items-center gap-3">
                                        <Clock className="w-4 h-4 text-gray-400" />
                                        <span className="text-gray-700 dark:text-gray-200">{query}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={(e) => removeRecentSearch(query, e)}
                                            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 opacity-0 group-hover:opacity-100 transition"
                                        >
                                            <X className="w-4 h-4 text-gray-500" />
                                        </button>
                                        <ChevronRight className="w-4 h-4 text-gray-400" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Trending Searches */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg">
                    <div className="flex items-center gap-2 mb-4">
                        <TrendingUp className="w-5 h-5 text-orange-500" />
                        <h2 className="text-lg font-bold text-gray-800 dark:text-white">
                            {t('trending_searches') || 'Trending Searches'}
                        </h2>
                        <Sparkles className="w-4 h-4 text-yellow-500" />
                    </div>
                    <div className="flex flex-wrap gap-3">
                        {trendingSearches.map((query, index) => (
                            <button
                                key={index}
                                onClick={() => handleSuggestionClick(query)}
                                className="px-4 py-2 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 border border-gray-200 dark:border-gray-600 rounded-full text-gray-700 dark:text-gray-200 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition flex items-center gap-2 font-medium"
                            >
                                <TrendingUp className="w-3.5 h-3.5 text-orange-500" />
                                {query}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Popular Categories */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg">
                    <div className="flex items-center gap-2 mb-4">
                        <Sparkles className="w-5 h-5 text-purple-500" />
                        <h2 className="text-lg font-bold text-gray-800 dark:text-white">
                            {t('popular_categories') || 'Popular Categories'}
                        </h2>
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                        {[
                            { icon: '📱', name: 'Mobiles', value: 'Mobiles' },
                            { icon: '💻', name: 'Laptops', value: 'Electronics' },
                            { icon: '👕', name: 'Fashion', value: 'Fashion' },
                            { icon: '🏠', name: 'Home', value: 'Home' },
                            { icon: '⌚', name: 'Watches', value: 'Electronics' },
                            { icon: '📷', name: 'Cameras', value: 'Electronics' },
                            { icon: '🎮', name: 'Gaming', value: 'Electronics' },
                            { icon: '📚', name: 'Books', value: 'Books' },
                        ].map((cat, index) => (
                            <button
                                key={index}
                                onClick={() => {
                                    setFilters(prev => ({ ...prev, category: cat.value }));
                                    navigate(getTargetUrl(null, cat.value));
                                }}
                                className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                            >
                                <span className="text-3xl">{cat.icon}</span>
                                <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{cat.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Search Tips */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-5 border border-blue-200 dark:border-blue-800">
                    <h3 className="font-bold text-blue-800 dark:text-blue-300 mb-3">
                        💡 {t('search_tips') || 'Search Tips'}
                    </h3>
                    <ul className="space-y-2 text-sm text-blue-700 dark:text-blue-400">
                        <li>• {t('search_tip_1') || 'Use specific keywords like "iPhone 15 Pro Max 256GB"'}</li>
                        <li>• {t('search_tip_2') || 'Include brand names for better results'}</li>
                        <li>• {t('search_tip_3') || 'Try searching by location like "iPhone Delhi"'}</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default SearchPage;

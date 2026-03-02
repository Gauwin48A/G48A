import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFilter } from '@/context/FilterContext';
import { fetchCategoriesCached } from '@/services/categoriesService';
import {
  Search,
  ArrowLeft,
  Clock,
  TrendingUp,
  X,
  ChevronRight,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  PageEmptyState,
  PageErrorState,
  PageLoadingState
} from '@/components/page-state/PageStateBlocks';

const RECENT_SEARCHES_KEY = 'recentSearches';
const MAX_RECENT_SEARCHES = 10;
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

const SearchPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { filters, setFilters } = useFilter();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [recentSearches, setRecentSearches] = useState([]);
  const [categorySuggestions, setCategorySuggestions] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState('');
  const inputRef = useRef(null);
  const categoriesRequestIdRef = useRef(0);

  const searchContext = searchParams.get('context') || 'all-posts';
  const isForYouContext = searchContext === 'for-you';
  const baseUrl = isForYouContext ? '/for-you' : '/all-posts';

  const trendingSearches = useMemo(() => ([
    'iPhone 15',
    'Samsung',
    'MacBook',
    'Gaming Laptop',
    'AirPods',
    'Smart Watch',
    'LED TV',
    'Refrigerator',
  ]), []);

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

  useEffect(() => {
    const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setRecentSearches(Array.isArray(parsed) ? parsed : []);
      } catch {
        setRecentSearches([]);
      }
    }
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const loadCategories = useCallback(async () => {
    const requestId = categoriesRequestIdRef.current + 1;
    categoriesRequestIdRef.current = requestId;
    setCategoriesLoading(true);
    setCategoriesError('');
    try {
      const list = await fetchCategoriesCached();
      if (requestId === categoriesRequestIdRef.current) {
        setCategorySuggestions(Array.isArray(list) ? list.slice(0, 8) : []);
      }
    } catch {
      if (requestId === categoriesRequestIdRef.current) {
        setCategorySuggestions([]);
        setCategoriesError('Unable to load category suggestions. You can still search manually.');
      }
    } finally {
      if (requestId === categoriesRequestIdRef.current) {
        setCategoriesLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadCategories();
    return () => {
      categoriesRequestIdRef.current += 1;
    };
  }, [loadCategories]);

  const getTargetUrl = (query = '', category = '') => {
    const params = new URLSearchParams();
    if (query) params.set('search', query);
    if (category) params.set('category', category);
    return `${baseUrl}${params.toString() ? `?${params.toString()}` : ''}`;
  };

  const saveRecentSearch = (query) => {
    if (!query.trim()) return;
    const normalized = query.trim();
    const updated = [normalized, ...recentSearches.filter((item) => item !== normalized)].slice(0, MAX_RECENT_SEARCHES);
    setRecentSearches(updated);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  };

  const handleSearch = (event) => {
    event?.preventDefault();
    const query = searchQuery.trim();
    if (!query) {
      setFilters((prev) => ({ ...prev, search: '' }));
      navigate(baseUrl);
      return;
    }
    saveRecentSearch(query);
    setFilters((prev) => ({ ...prev, search: query }));
    navigate(getTargetUrl(query));
  };

  const handleSuggestionClick = (query) => {
    setSearchQuery(query);
    saveRecentSearch(query);
    setFilters((prev) => ({ ...prev, search: query }));
    navigate(getTargetUrl(query));
  };

  const handleCategoryClick = (categoryName) => {
    setFilters((prev) => ({ ...prev, category: categoryName }));
    navigate(getTargetUrl('', categoryName));
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  };

  const removeRecentSearch = (query, event) => {
    event.stopPropagation();
    const updated = recentSearches.filter((item) => item !== query);
    setRecentSearches(updated);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  };

  const clearAllFilters = () => {
    setFilters(DEFAULT_FILTERS);
    navigate(baseUrl);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="sticky top-0 z-50 bg-white dark:bg-gray-900 shadow-lg">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <form onSubmit={handleSearch} className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              <ArrowLeft className="w-6 h-6 text-gray-600 dark:text-gray-300" />
            </button>
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={isForYouContext
                  ? (t('search_for_you') || 'Search in For You')
                  : (t('search_placeholder') || 'Search products, brands, categories')}
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

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6" style={{ paddingBottom: '120px' }}>
        {hasActiveFilters && (
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-2xl p-4">
            <p className="text-sm text-amber-800 dark:text-amber-300 mb-3">
              Filters from browse are active and can limit your results.
            </p>
            <Button type="button" variant="outline" className="border-amber-300 text-amber-800" onClick={clearAllFilters}>
              Clear all filters
            </Button>
          </div>
        )}

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-gray-500" />
                <h2 className="text-lg font-bold text-gray-800 dark:text-white">
                {t('recent_searches') || 'Recent Searches'}
              </h2>
            </div>
            {recentSearches.length > 0 && (
              <button
                onClick={clearRecentSearches}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                <Trash2 className="w-4 h-4" />
                {t('clear_all') || 'Clear All'}
              </button>
            )}
          </div>
          {recentSearches.length === 0 ? (
            <PageEmptyState
              marker="empty"
              className="border-0 shadow-none bg-transparent"
              title="No recent searches"
              description="Your recent search history will appear here."
              action={(
                <Button
                  type="button"
                  variant="outline"
                  data-ux-action="search_use_trending_seed"
                  onClick={() => handleSuggestionClick(trendingSearches[0])}
                >
                  Try "{trendingSearches[0]}"
                </Button>
              )}
            />
          ) : (
            <div className="space-y-2">
              {recentSearches.map((query) => (
                <div
                  key={query}
                  onClick={() => handleSuggestionClick(query)}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition group"
                >
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700 dark:text-gray-200">{query}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(event) => removeRecentSearch(query, event)}
                      className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 opacity-0 group-hover:opacity-100 transition"
                    >
                      <X className="w-4 h-4 text-gray-500" />
                    </button>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">
              {t('trending_searches') || 'Trending Searches'}
            </h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {trendingSearches.map((query) => (
              <button
                key={query}
                onClick={() => handleSuggestionClick(query)}
                className="px-4 py-2 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 border border-gray-200 dark:border-gray-600 rounded-full text-gray-700 dark:text-gray-200 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition flex items-center gap-2 font-medium"
              >
                <TrendingUp className="w-3.5 h-3.5 text-orange-500" />
                {query}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
            {t('popular_categories') || 'Popular Categories'}
          </h2>
          {categoriesLoading ? (
            <PageLoadingState
              marker="loading"
              className="border-0 shadow-none bg-transparent"
              title="Loading category suggestions"
              description="You can still search manually while we fetch suggestions."
            />
          ) : categoriesError ? (
            <PageErrorState
              marker="error"
              className="border-0 shadow-none bg-transparent"
              title="Category suggestions unavailable"
              description={categoriesError}
              onRetry={loadCategories}
              secondaryAction={(
                <Button
                  type="button"
                  variant="outline"
                  data-ux-action="search_clear_filters"
                  onClick={clearAllFilters}
                >
                  Clear all filters
                </Button>
              )}
            />
          ) : categorySuggestions.length === 0 ? (
            <PageEmptyState
              marker="empty"
              className="border-0 shadow-none bg-transparent"
              title="No category suggestions"
              description="Try a direct keyword search or browse all posts."
              action={(
                <Button
                  type="button"
                  variant="outline"
                  data-ux-action="search_browse_all_posts"
                  onClick={() => navigate('/all-posts')}
                >
                  Browse all posts
                </Button>
              )}
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {categorySuggestions.map((category) => (
                <button
                  key={category.category_id || category.id || category.name}
                  onClick={() => handleCategoryClick(category.name)}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition border border-gray-100 dark:border-gray-700"
                >
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 text-center">
                    {category.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-5 border border-blue-200 dark:border-blue-800">
          <h3 className="font-bold text-blue-800 dark:text-blue-300 mb-3">
            Search Tips
          </h3>
          <ul className="space-y-2 text-sm text-blue-700 dark:text-blue-400">
            <li>- Use specific terms such as model + storage + condition.</li>
            <li>- Add a location keyword to find nearby listings faster.</li>
            <li>- Use category chips first, then narrow with keywords.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SearchPage;

import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Search,
  Smartphone,
  Shirt,
  Home,
  Monitor,
  Laptop,
  Watch,
  Camera,
  Headphones,
  Gamepad,
  Car,
  Package,
  RefreshCw,
  ShoppingBag,
} from 'lucide-react';
import { fetchCategoriesCached } from '@/services/categoriesService';

const CATEGORY_ICONS = {
  Electronics: Monitor,
  Fashion: Shirt,
  Home: Home,
  Mobiles: Smartphone,
  Laptops: Laptop,
  Watches: Watch,
  Cameras: Camera,
  Audio: Headphones,
  Gaming: Gamepad,
  Vehicles: Car,
};

const CATEGORY_TONES = [
  'from-blue-500 to-indigo-600',
  'from-pink-500 to-rose-600',
  'from-emerald-500 to-green-600',
  'from-cyan-500 to-blue-600',
  'from-purple-500 to-violet-600',
  'from-orange-500 to-amber-600',
];

const Categories = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadCategories = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchCategoriesCached();
      setCategories(Array.isArray(data) ? data : []);
    } catch {
      setCategories([]);
      setError('Unable to load categories right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const filteredCategories = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return categories;
    return categories.filter((category) => (
      String(category.name || '').toLowerCase().includes(normalizedQuery)
      || String(category.description || '').toLowerCase().includes(normalizedQuery)
    ));
  }, [categories, query]);

  const handleCategorySelect = (categoryName) => {
    const urlParams = new URLSearchParams(location.search);
    const selectedTier = urlParams.get('tier');
    if (selectedTier) {
      navigate(`/add-post?tier=${encodeURIComponent(selectedTier)}&category=${encodeURIComponent(categoryName)}`);
      return;
    }
    navigate(`/all-posts?category=${encodeURIComponent(categoryName)}`);
  };

  const clearSearch = () => setQuery('');

  return (
    <div className="bg-gradient-to-br from-blue-50 via-white to-slate-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 min-h-screen pb-24">
      <div className="w-full max-w-6xl mx-auto px-4 pt-8 md:pt-10 mb-6">
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 py-8 px-6 rounded-2xl relative overflow-hidden shadow-xl">
          <div className="max-w-4xl mx-auto relative z-10">
            <button
              onClick={() => navigate('/all-posts')}
              className="inline-flex items-center text-white/90 hover:text-white mb-4 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              {t('back_to_browse') || 'Back to Browse'}
            </button>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2">
              {t('explore_categories') || 'Explore Categories'}
            </h1>
            <p className="text-base md:text-lg text-white/90 max-w-2xl">
              Pick a category to jump directly to relevant listings.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 mb-5 shadow-sm">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search categories"
              className="w-full pl-10 pr-20 h-11 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-400"
            />
            {query && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-blue-600 hover:text-blue-700"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl p-4 mb-4">
            <p className="text-sm text-red-700 dark:text-red-300 mb-3">{error}</p>
            <Button type="button" variant="outline" className="border-red-200 text-red-700" onClick={loadCategories}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {Array.from({ length: 8 }).map((_, index) => (
              <Card key={`category-skeleton-${index}`} className="rounded-2xl border border-gray-200 dark:border-gray-700 p-5 animate-pulse">
                <div className="w-12 h-12 rounded-xl bg-gray-200 dark:bg-gray-700 mb-3" />
                <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700 mb-2" />
                <div className="h-3 w-full rounded bg-gray-200 dark:bg-gray-700" />
              </Card>
            ))}
          </div>
        ) : filteredCategories.length === 0 ? (
          <Card className="rounded-2xl border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/30 p-6 text-center">
            <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-200 mb-2">
              No categories match your search
            </h2>
            <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
              Try a broader keyword or reset the search.
            </p>
            <Button type="button" className="bg-blue-600 text-white hover:bg-blue-700" onClick={clearSearch}>
              Reset search
            </Button>
          </Card>
        ) : (
          <>
            <h2 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white mb-6">
              {t('popular_categories') || 'Popular Categories'}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 mb-10">
              {filteredCategories.map((category, index) => {
                const Icon = CATEGORY_ICONS[category.name] || Package;
                const tone = CATEGORY_TONES[index % CATEGORY_TONES.length];
                return (
                  <Card
                    key={category.category_id || category.id || category.name || index}
                    onClick={() => handleCategorySelect(category.name)}
                    className="group cursor-pointer border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden"
                  >
                    <CardContent className="p-5 md:p-6">
                      <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gradient-to-br ${tone} flex items-center justify-center text-white shadow-lg mb-3`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <h3 className="font-bold text-base md:text-lg text-gray-900 dark:text-white mb-1 line-clamp-1">
                        {category.name}
                      </h3>
                      <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 line-clamp-2 min-h-[2.25rem]">
                        {category.description || 'Browse listings in this category.'}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}

        <div className="mt-8 text-center">
          <div className="bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-gray-800 dark:to-gray-700 rounded-2xl p-6 md:p-8 shadow-lg">
            <h3 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white mb-3">
              Need broader results?
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-5 text-sm md:text-base">
              Open the complete marketplace and apply filters there.
            </p>
            <Button
              onClick={() => navigate('/all-posts')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 md:px-8 py-2 md:py-3 rounded-xl shadow-lg"
            >
              <ShoppingBag className="w-4 h-4 md:w-5 md:h-5 mr-2" />
              Browse All Posts
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Categories;

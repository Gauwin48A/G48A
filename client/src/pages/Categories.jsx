import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Smartphone, Shirt, Home, Monitor, ShoppingBag, Package, Laptop, Watch, Camera, Headphones, Gamepad, Car, ArrowLeft } from 'lucide-react';
import { fetchCategoriesCached } from '@/services/categoriesService';

// Category data with icons and colors
const categoryData = {
  'Electronics': { icon: Monitor, color: 'from-blue-500 to-blue-600', bgColor: 'bg-blue-50 dark:bg-blue-900/30', textColor: 'text-blue-600 dark:text-blue-400', emoji: '📱' },
  'Fashion': { icon: Shirt, color: 'from-pink-500 to-rose-600', bgColor: 'bg-pink-50 dark:bg-pink-900/30', textColor: 'text-pink-600 dark:text-pink-400', emoji: '👗' },
  'Home': { icon: Home, color: 'from-green-500 to-emerald-600', bgColor: 'bg-green-50 dark:bg-green-900/30', textColor: 'text-green-600 dark:text-green-400', emoji: '🏠' },
  'Mobiles': { icon: Smartphone, color: 'from-teal-500 to-cyan-600', bgColor: 'bg-teal-50 dark:bg-teal-900/30', textColor: 'text-teal-600 dark:text-teal-400', emoji: '📲' },
  'Laptops': { icon: Laptop, color: 'from-purple-500 to-indigo-600', bgColor: 'bg-purple-50 dark:bg-purple-900/30', textColor: 'text-purple-600 dark:text-purple-400', emoji: '💻' },
  'Watches': { icon: Watch, color: 'from-amber-500 to-orange-600', bgColor: 'bg-amber-50 dark:bg-amber-900/30', textColor: 'text-amber-600 dark:text-amber-400', emoji: '⌚' },
  'Cameras': { icon: Camera, color: 'from-red-500 to-rose-600', bgColor: 'bg-red-50 dark:bg-red-900/30', textColor: 'text-red-600 dark:text-red-400', emoji: '📷' },
  'Audio': { icon: Headphones, color: 'from-violet-500 to-purple-600', bgColor: 'bg-violet-50 dark:bg-violet-900/30', textColor: 'text-violet-600 dark:text-violet-400', emoji: '🎧' },
  'Gaming': { icon: Gamepad, color: 'from-indigo-500 to-blue-600', bgColor: 'bg-indigo-50 dark:bg-indigo-900/30', textColor: 'text-indigo-600 dark:text-indigo-400', emoji: '🎮' },
  'Vehicles': { icon: Car, color: 'from-gray-500 to-slate-600', bgColor: 'bg-gray-50 dark:bg-gray-800/50', textColor: 'text-gray-600 dark:text-gray-400', emoji: '🚗' },
};

const defaultCategoryStyle = { icon: Package, color: 'from-gray-500 to-gray-600', bgColor: 'bg-gray-50 dark:bg-gray-800/50', textColor: 'text-gray-600 dark:text-gray-400', emoji: '📦' };

const Categories = () => {
  const { t } = useTranslation();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;

    const fetchCategories = async () => {
      setLoading(true);
      try {
        const data = await fetchCategoriesCached();
        if (cancelled) return;
        setCategories(Array.isArray(data) ? data : []);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        // Return default categories on error for better UX
        setCategories([
          { name: 'Electronics', description: 'Gadgets & devices' },
          { name: 'Fashion', description: 'Clothing & accessories' },
          { name: 'Home', description: 'Home & living' },
          { name: 'Mobiles', description: 'Smartphones & tablets' },
        ]);
        setError(null);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    fetchCategories();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleCategorySelect = (categoryName) => {
    // Check if user came from tier selection (add-post flow) or just browsing
    const urlParams = new URLSearchParams(location.search);
    const selectedTier = urlParams.get('tier');

    if (selectedTier) {
      // User is adding a post - navigate to add-post with tier and category
      navigate(`/add-post?tier=${encodeURIComponent(selectedTier)}&category=${encodeURIComponent(categoryName)}`);
    } else {
      // User is browsing - navigate to all-posts with category filter
      navigate(`/all-posts?category=${encodeURIComponent(categoryName)}`);
    }
  };

  const getCategoryStyle = (name) => {
    return categoryData[name] || defaultCategoryStyle;
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 min-h-screen transition-colors duration-300 pb-24">
      {/* Hero Banner - with proper spacing from navbar */}
      <div className="w-full max-w-6xl mx-auto px-4 pt-10 mb-8">
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 py-10 px-6 rounded-2xl relative overflow-hidden shadow-xl">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-40 h-40 bg-white rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 right-0 w-60 h-60 bg-pink-300 rounded-full blur-3xl transform translate-x-1/2 translate-y-1/2"></div>
          </div>

          <div className="max-w-4xl mx-auto relative z-10">
            <button
              onClick={() => navigate('/all-posts')}
              className="flex items-center text-white/80 hover:text-white mb-4 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              {t('back_to_browse') || 'Back to Browse'}
            </button>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl mb-4">
                <span className="text-4xl">🏪</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-3 drop-shadow-lg">
                {t('explore_categories') || 'Explore Categories'}
              </h1>
              <p className="text-base md:text-lg text-white/90 font-medium max-w-xl mx-auto">
                {t('find_products') || 'Find exactly what you\'re looking for from our wide range of categories'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="max-w-6xl mx-auto px-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="text-center text-red-500 py-10">{error}</div>
        ) : categories.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-gray-600 dark:text-gray-400 text-lg">{t('no_categories_found') || 'No categories found.'}</p>
          </div>
        ) : (
          <>
            {/* Main Categories */}
            <h2 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white mb-6 flex items-center">
              <span className="mr-3">🔥</span>
              {t('popular_categories') || 'Popular Categories'}
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 mb-10">
              {categories.map((cat, idx) => {
                const style = getCategoryStyle(cat.name);

                return (
                  <Card
                    key={cat.category_id || cat.id || idx}
                    onClick={() => handleCategorySelect(cat.name)}
                    className={`group cursor-pointer border-0 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 overflow-hidden ${style.bgColor} rounded-2xl`}
                  >
                    <CardContent className="p-5 md:p-6 text-center relative">
                      {/* Gradient overlay on hover */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${style.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>

                      {/* Icon Container */}
                      <div className={`w-14 h-14 md:w-16 md:h-16 mx-auto mb-3 md:mb-4 rounded-2xl bg-gradient-to-br ${style.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        <span className="text-2xl md:text-3xl">{style.emoji}</span>
                      </div>

                      {/* Category Name */}
                      <h3 className={`font-bold text-base md:text-lg mb-1 ${style.textColor} group-hover:scale-105 transition-transform`}>
                        {t(cat.name.toLowerCase().replace(/ /g, '_')) || cat.name}
                      </h3>

                      {/* Description */}
                      {cat.description && (
                        <p className="text-gray-500 dark:text-gray-400 text-xs md:text-sm line-clamp-2">
                          {t(cat.description.toLowerCase().replace(/ /g, '_')) || cat.description}
                        </p>
                      )}

                      {/* Hover Arrow */}
                      <div className="mt-2 md:mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className={`text-xs md:text-sm font-semibold ${style.textColor}`}>
                          {t('browse') || 'Browse'} →
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Browse All Section */}
            <div className="mt-8 text-center">
              <div className="bg-gradient-to-r from-blue-100 to-purple-100 dark:from-gray-800 dark:to-gray-700 rounded-2xl p-6 md:p-8 shadow-lg">
                <h3 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white mb-3">
                  {t('cant_find') || "Can't find what you're looking for?"}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-5 text-sm md:text-base">
                  {t('browse_all_products') || 'Browse all products in our marketplace'}
                </p>
                <Button
                  onClick={() => navigate('/all-posts')}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold px-6 md:px-8 py-2 md:py-3 rounded-xl shadow-lg hover:shadow-xl transition-all text-sm md:text-base"
                >
                  <ShoppingBag className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                  {t('browse_all_posts') || 'Browse All Posts'}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Categories;

import React, { useState, useEffect } from 'react';
import { Link, useLocation as useRouterLocation, useNavigate } from 'react-router-dom';
import { FiUser, FiMenu, FiSearch, FiFilter, FiHome, FiGrid, FiUserCheck, FiMapPin, FiBell, FiHeart, FiClock, FiFileText, FiMessageCircle, FiNavigation, FiLock, FiStar } from 'react-icons/fi';
import { useFilter } from '@/context/FilterContext';
import { useLocation } from '@/context/LocationContext';
import { useTranslation } from 'react-i18next';
import { useToast } from "@/hooks/use-toast";
import LanguageSelector from './LanguageSelector';

const GreenNavbar = () => {
  const { t } = useTranslation();

  const navLinks = [
    { name: t('all_categories'), path: '/all-posts' },
    { name: t('mobiles'), path: '/categories/mobiles' },
    { name: t('fashion'), path: '/categories/fashion' },
    { name: t('electronics'), path: '/categories/electronics' },
    { name: t('home'), path: '/categories/home' },
    { name: t('books'), path: '/categories/books' },
    { name: t('more'), path: '/categories/more' },
  ];

  const moreMenuLinks = [
    { key: 'nearby', path: '/nearby' },
    { key: 'chat', path: '/chat' },
    { key: 'verification', path: '/verification' },
    { key: 'categories', path: '/categories' },
    { key: 'feedback', path: '/feedback' },
    { key: 'complaints', path: '/complaints' },
    { key: 'dashboard', path: '/dashboard' },
    { key: 'admin_panel', path: '/admin-panel' },
  ];

  const bottomNavLinks = [
    { key: 'home', path: '/all-posts', icon: <FiHome /> },
    { key: 'for_you', path: '/my-recommendations', icon: <FiStar /> },
    { key: 'feed', path: '/feed', icon: <FiFileText /> },
    { key: 'rewards', path: '/rewards', icon: <FiUserCheck /> },
    { key: 'profile', path: '/profile', icon: <FiUser /> },
    { key: 'more', path: '#', icon: <FiMenu /> },
  ];
  const { toast } = useToast();
  const { filters, setFilters } = useFilter();
  const [moreOpen, setMoreOpen] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [categories, setCategories] = useState([]);
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem('darkMode');
    return stored ? JSON.parse(stored) : false;
  });

  // Large font mode for accessibility
  const [largeFont, setLargeFont] = useState(() => {
    const stored = localStorage.getItem('largeFont');
    return stored ? JSON.parse(stored) : false;
  });
  const darkModeLabel = darkMode ? 'Disable Dark Mode' : 'Enable Dark Mode';

  // Fetch categories from API
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
        const res = await fetch(`${baseUrl}/api/categories`);
        const data = await res.json();
        setCategories(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to fetch categories:', err);
        setCategories([]);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Large Font effect
  useEffect(() => {
    localStorage.setItem('largeFont', JSON.stringify(largeFont));
    if (largeFont) {
      document.body.classList.add('text-lg');
      document.body.style.fontSize = '18px';
    } else {
      document.body.classList.remove('text-lg');
      document.body.style.fontSize = '';
    }
  }, [largeFont]);

  // Check if user is logged in
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const userId = localStorage.getItem('userId');
    setIsLoggedIn(!!(token && userId));
  }, [moreOpen]); // Re-check when menu opens

  const handleLogout = () => {
    // Clear all auth-related localStorage items
    localStorage.removeItem('authToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('userProfile');
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    setMoreOpen(false);
    navigate('/login');
  };

  // Add animation for sliding pane via JS-in-CSS (React-safe)
  useEffect(() => {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      if (!document.getElementById('slideInRightStyle')) {
        const style = document.createElement('style');
        style.id = 'slideInRightStyle';
        style.textContent = `@keyframes slideInRight {from { transform: translateX(100 %); }to { transform: translateX(0); } } .animate - slideInRight { animation: slideInRight 0.3s cubic - bezier(0.4, 0, 0.2, 1); } `;
        document.head.appendChild(style);
      }
    }
  }, []);

  // Get location from context (for city display)
  const { city, displayName, loading: locationLoading, permissionGranted, retry: retryLocation, accuracy } = useLocation();


  // Router location for path detection
  const routerLocation = useRouterLocation();

  // Show full navbar for home (all-posts), my-posts, and my-recommendations
  const showFullNavbar = routerLocation.pathname === '/all-posts' || routerLocation.pathname === '/my-posts' || routerLocation.pathname === '/' || routerLocation.pathname === '/my-recommendations';

  // Helper for ARIA and touch target
  const navButtonProps = (label) => ({
    'aria-label': label,
    role: 'button',
    tabIndex: 0,
    className: 'flex flex-col items-center justify-center min-w-[48px] min-h-[48px] p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 active:bg-blue-100 dark:active:bg-blue-900',
  });

  return (
    <>
      {/* Top Navbar and overlays remain as is */}
      {showFullNavbar ? (
        // Full Navbar
        <nav className={`sticky top-0 z-50 shadow-lg ${darkMode ? 'bg-gray-900' : 'bg-blue-600'} transition-all duration-300`} role="navigation" aria-label={t('main_navigation')}>
          <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-2 md:px-6 md:py-3">
            {/* Logo and Location */}
            <div className="flex items-center gap-3">
              <Link to="/" className="flex items-center gap-2" aria-label="Home">
                <span className="bg-white rounded-lg p-2">
                  <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
                    <rect width="24" height="24" rx="6" fill="#2563eb" />
                    <path
                      d="M7 17V9.5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1V17"
                      stroke="#fff"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx="12" cy="13" r="2" fill="#fff" />
                  </svg>
                </span>
                <span className="text-white text-2xl font-bold hidden sm:block">{t('home')}</span>
              </Link>

              {/* Location Display - Like Swiggy/Flipkart */}
              <button
                onClick={retryLocation}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 hover:bg-blue-400 rounded-lg transition-colors cursor-pointer"
                title={displayName || city || t('location') || 'Click to detect location'}
              >
                <FiMapPin className="text-white w-4 h-4" />
                <span className="text-white text-sm font-medium max-w-[150px] truncate">
                  {locationLoading ? 'Detecting...' : (city || t('location') || 'Location')}
                </span>
                {accuracy && accuracy < 500 && (
                  <span className="text-white/70 text-xs hidden sm:inline">
                    ({Math.round(accuracy)}m)
                  </span>
                )}
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>


            {/* Search Button - Compact icon that opens Search Page */}
            <button
              onClick={() => navigate('/search')}
              className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg hover:bg-gray-50 transition-colors cursor-pointer max-w-xs sm:max-w-md"
              aria-label={t('search') || "Search"}
            >
              <FiSearch className="w-5 h-5 text-gray-400" />
              <span className="text-gray-400 text-sm truncate hidden sm:block">{t('search_placeholder') || 'Search for products, brands...'}</span>
            </button>

            {/* Filter Button */}
            <div className="relative">
              <button type="button" onClick={() => setShowFilter(true)} className="bg-blue-500 text-white px-3 py-2 rounded-lg flex items-center gap-1 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-white">
                <FiFilter className="w-5 h-5" />
                <span className="hidden sm:inline">{t('filter')}</span>
              </button>
              {showFilter && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                  <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border p-6 w-full max-w-sm mx-2 flex flex-col gap-3 relative animate-fadeIn">
                    <button className="absolute top-3 right-3 text-gray-400 hover:text-blue-600 dark:hover:text-yellow-400" onClick={() => setShowFilter(false)} aria-label={t('close') || "Close filter"}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                    <h4 className="font-semibold text-blue-600 dark:text-yellow-300 mb-2">{t('filter_products') || "Filter Products"}</h4>
                    <div className="mb-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('location')}</label>
                      <input type="text" placeholder={t('enter_location') || "Enter location"} className="w-full border rounded px-2 py-1" onChange={e => setFilters(f => ({ ...f, location: e.target.value, page: 1 }))} />
                    </div>
                    <div className="mb-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('price_range') || "Price Range"}</label>
                      <div className="flex gap-2 items-center">
                        <div className="flex-1">
                          <input
                            type="number"
                            min="0"
                            placeholder={t('min_price_placeholder')}
                            className="w-full border rounded px-2 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                            value={filters.minPrice || ''}
                            onChange={e => setFilters(f => ({ ...f, minPrice: e.target.value, page: 1 }))}
                          />
                        </div>
                        <span className="text-gray-400">to</span>
                        <div className="flex-1">
                          <input
                            type="number"
                            min="0"
                            placeholder={t('max_price_placeholder')}
                            className="w-full border rounded px-2 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                            value={filters.maxPrice || ''}
                            onChange={e => setFilters(f => ({ ...f, maxPrice: e.target.value, page: 1 }))}
                          />
                        </div>
                      </div>
                      {/* Quick preset buttons */}
                      <div className="flex gap-1 mt-2 flex-wrap">
                        <button type="button" onClick={() => setFilters(f => ({ ...f, minPrice: '', maxPrice: '500', page: 1 }))} className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full hover:bg-blue-200">{t('under_500')}</button>
                        <button type="button" onClick={() => setFilters(f => ({ ...f, minPrice: '500', maxPrice: '2000', page: 1 }))} className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full hover:bg-blue-200">{t('500_to_2k')}</button>
                        <button type="button" onClick={() => setFilters(f => ({ ...f, minPrice: '2000', maxPrice: '10000', page: 1 }))} className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full hover:bg-blue-200">{t('2k_to_10k')}</button>
                        <button type="button" onClick={() => setFilters(f => ({ ...f, minPrice: '10000', maxPrice: '', page: 1 }))} className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full hover:bg-blue-200">{t('above_10k')}</button>
                      </div>
                    </div>

                    <div className="mb-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('date_range') || "Date Range"}</label>
                      {/* Quick Date Presets Dropdown */}
                      <select
                        className="w-full border rounded px-2 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white mb-2"
                        defaultValue=""
                        onChange={(e) => {
                          const val = e.target.value;
                          const now = new Date();
                          let startDate = '', endDate = now.toISOString().split('T')[0];

                          if (val === 'today') {
                            startDate = endDate;
                          } else if (val === 'yesterday') {
                            const yesterday = new Date(now);
                            yesterday.setDate(yesterday.getDate() - 1);
                            startDate = endDate = yesterday.toISOString().split('T')[0];
                          } else if (val === '24h') {
                            const past24h = new Date(now);
                            past24h.setHours(past24h.getHours() - 24);
                            startDate = past24h.toISOString().split('T')[0];
                          } else if (val === '7d') {
                            const past7d = new Date(now);
                            past7d.setDate(past7d.getDate() - 7);
                            startDate = past7d.toISOString().split('T')[0];
                          } else if (val === '10d') {
                            const past10d = new Date(now);
                            past10d.setDate(past10d.getDate() - 10);
                            startDate = past10d.toISOString().split('T')[0];
                          } else if (val === '30d') {
                            const past30d = new Date(now);
                            past30d.setDate(past30d.getDate() - 30);
                            startDate = past30d.toISOString().split('T')[0];
                          } else if (val === 'custom') {
                            // Keep existing dates or clear for custom selection
                            return;
                          } else {
                            // "Any" - clear dates
                            startDate = endDate = '';
                          }
                          setFilters(f => ({ ...f, startDate, endDate, page: 1 }));
                        }}
                      >
                        <option value="">{t('any_time')}</option>
                        <option value="today">{t('today')}</option>
                        <option value="yesterday">{t('yesterday')}</option>
                        <option value="24h">{t('last_24_hours')}</option>
                        <option value="7d">{t('last_7_days')}</option>
                        <option value="10d">{t('last_10_days')}</option>
                        <option value="30d">{t('last_30_days')}</option>
                        <option value="custom">{t('custom_range')}</option>
                      </select>
                      {/* Custom Date Range Pickers */}
                      <details className="text-xs text-gray-500 dark:text-gray-400">
                        <summary className="cursor-pointer hover:text-blue-600 dark:hover:text-blue-400">{t('custom_date_range')}</summary>
                        <div className="flex gap-2 mt-2">
                          <input
                            type="date"
                            className="w-1/2 border rounded px-2 py-1 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                            value={filters.startDate || ''}
                            onChange={e => setFilters(f => ({ ...f, startDate: e.target.value, page: 1 }))}
                          />
                          <input
                            type="date"
                            className="w-1/2 border rounded px-2 py-1 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                            value={filters.endDate || ''}
                            onChange={e => setFilters(f => ({ ...f, endDate: e.target.value, page: 1 }))}
                          />
                        </div>
                      </details>
                    </div>
                    <div className="mb-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('category')}</label>
                      <select className="w-full border rounded px-2 py-1" value={filters.category} onChange={e => setFilters(f => ({ ...f, category: e.target.value, page: 1 }))}>
                        <option value="">{t('all')}</option>
                        {categories.map(cat => (
                          <option key={cat.category_id || cat.name} value={cat.name}>
                            {t(cat.name.toLowerCase().replace(' ', '_')) || cat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="mb-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('sort_by')}</label>
                      <select className="w-full border rounded px-2 py-1" value={filters.sortBy || ''} onChange={e => setFilters(f => ({ ...f, sortBy: e.target.value, page: 1 }))}>
                        <option value="">{t('default') || "Default"}</option>
                        <option value="price_asc">{t('price_low_high') || "Price: Low to High"}</option>
                        <option value="price_desc">{t('price_high_low') || "Price: High to Low"}</option>
                        <option value="date_desc">{t('newest_first') || "Newest First"}</option>
                        <option value="date_asc">{t('oldest_first') || "Oldest First"}</option>
                      </select>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button
                        className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
                        onClick={() => setShowFilter(false)}
                      >{t('apply') || "Apply"}</button>
                      <button
                        className="flex-1 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-200 py-2 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-700 transition"
                        onClick={() => { setFilters(f => ({ ...f, location: '', priceRange: '', startDate: '', endDate: '', category: '', sortBy: '', page: 1 })); setShowFilter(false); }}
                      >{t('reset') || "Clear"}</button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Icons */}
            <div className="flex items-center gap-4">
              {/* Add Post Button - Only show for logged-in users */}
              {isLoggedIn && (
                <Link to="/tier-selection" aria-label="Add Post" className="relative group">
                  <span
                    className="inline-flex items-center justify-center rounded-full border-2 border-blue-600 bg-gradient-to-br from-blue-400 to-blue-600 text-white w-12 h-12 text-3xl font-extrabold shadow-xl hover:scale-110 hover:shadow-2xl transition-all duration-200 ring-4 ring-blue-300 focus:ring-4 focus:ring-blue-400"
                    style={{ cursor: 'pointer', zIndex: 20 }}
                    tabIndex={0}
                    role="button"
                    aria-label="Add Post"
                  >
                    +
                  </span>
                  <span className="absolute left-14 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs rounded px-3 py-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-lg pointer-events-none">
                    {t('sell') || 'Add Post'}
                  </span>
                </Link>
              )}
              {/* Notifications Bell */}
              <Link to="/notifications" aria-label={t('notifications')} className="relative group">
                <span className="p-2 rounded-full hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-white transition-colors inline-flex items-center justify-center">
                  <FiBell className="text-white w-6 h-6" />
                </span>
                <span className="absolute left-10 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs rounded px-3 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-lg pointer-events-none">
                  {t('notifications')}
                </span>
              </Link>
              {/* Wishlist Heart */}
              <Link to="/wishlist" aria-label={t('wishlist') || 'Wishlist'} className="relative group">
                <span className="p-2 rounded-full hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-white transition-colors inline-flex items-center justify-center">
                  <FiHeart className="text-white w-6 h-6" />
                </span>
                <span className="absolute left-10 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs rounded px-3 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-lg pointer-events-none">
                  {t('wishlist') || 'Wishlist'}
                </span>
              </Link>
              {/* Recently Viewed Clock */}
              <Link to="/recently-viewed" aria-label={t('recently_viewed') || 'Recently Viewed'} className="relative group">
                <span className="p-2 rounded-full hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-white transition-colors inline-flex items-center justify-center">
                  <FiClock className="text-white w-6 h-6" />
                </span>
                <span className="absolute left-10 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs rounded px-3 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-lg pointer-events-none">
                  {t('recently_viewed') || 'Recently Viewed'}
                </span>
              </Link>
              {/* Language Selector */}
              <div>
                <LanguageSelector />
              </div>
              {/* Dark Mode Toggle */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-full hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-white transition-colors"
                aria-label={darkMode ? t('light_mode') : t('dark_mode')}
                title={darkMode ? t('light_mode') : t('dark_mode')}
              >
                {darkMode ? (
                  <span className="text-yellow-300 text-xl">🌞</span>
                ) : (
                  <span className="text-white text-xl">🌙</span>
                )}
              </button>
            </div>
          </div>
        </nav >
      ) : (
        // Blank blue ribbon for other pages
        <div className="h-14 bg-blue-600 w-full" />
      )}

      {/* More Menu Fullscreen Overlay */}
      {
        moreOpen && (
          <div className="fixed inset-0 z-50" onClick={() => setMoreOpen(false)}>
            {/* Right-side vertical sliding pane, with improved highlight and shadow */}
            <div className="fixed top-0 right-0 h-full w-80 max-w-full bg-white dark:bg-gray-800 shadow-2xl p-8 flex flex-col gap-4 animate-slideInRight ring-4 ring-blue-400 dark:ring-yellow-400 ring-opacity-80 z-50 overflow-y-auto pb-24" style={{ transition: 'transform 0.3s' }} onClick={e => e.stopPropagation()}>
              <button className="absolute top-4 right-4 text-gray-500 hover:text-blue-600 dark:hover:text-yellow-400" onClick={() => setMoreOpen(false)}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              <h2 className="text-2xl font-bold text-blue-600 dark:text-yellow-300 mb-4 drop-shadow-lg">{t('more_options')}</h2>
              {moreMenuLinks
                .filter(link => {
                  // Hide login/signup if logged in, show logout instead
                  if (isLoggedIn && (link.key === 'login' || link.key === 'signup')) return false;
                  return true;
                })
                .map(link => {
                  const restrictedKeys = ['chat', 'verification', 'feedback', 'complaints', 'dashboard', 'admin_panel'];
                  const isRestricted = !isLoggedIn && restrictedKeys.includes(link.key);

                  return (
                    <Link
                      key={link.key}
                      to={isRestricted ? '#' : link.path}
                      className={`block px-4 py-3 rounded-lg text-blue-700 dark:text-yellow-200 hover:bg-blue-100 dark:hover:bg-gray-700 font-semibold text-center text-base shadow transition-all duration-150 ${isRestricted ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800' : ''}`}
                      onClick={(e) => {
                        if (isRestricted) {
                          e.preventDefault();
                          e.stopPropagation();
                          toast({
                            description: t('login_required') || "Please login to access this feature",
                            variant: "destructive",
                          });
                        } else {
                          setMoreOpen(false);
                        }
                      }}
                      tabIndex={0}
                    >
                      <span className="flex items-center justify-center gap-2">
                        {isRestricted && <FiLock className="w-4 h-4 text-gray-500" />}
                        {t(link.key)}
                      </span>
                    </Link>
                  );
                })}
              {isLoggedIn && (
                <button
                  className="block w-full px-4 py-3 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 font-semibold text-center text-base shadow transition-colors duration-150"
                  onClick={handleLogout}
                >
                  {t('logout') || 'Logout'}
                </button>
              )}
              {/* Accessibility: Font Size Toggle */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-2">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 text-center">♿ {t('accessibility') || 'Accessibility'}</p>
                <button
                  className={`block w-full px-4 py-3 rounded-lg font-semibold text-center text-base shadow transition-all duration-150 ${largeFont ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                  onClick={() => setLargeFont(!largeFont)}
                  title={largeFont ? "Switch to normal font size" : "Increase font size for easier reading"}
                >
                  {largeFont ? (t('normal_size') || '🔤 Normal Size') : (t('larger_text') || '🔠 Larger Text')}
                  <span className="block text-xs font-normal opacity-75 mt-1">
                    {largeFont ? (t('using_large_fonts') || 'Currently using large fonts') : (t('easier_to_read') || 'Easier to read for everyone')}
                  </span>
                </button>
              </div>
              <button className="mt-4 px-4 py-2 bg-blue-600 dark:bg-yellow-400 text-white dark:text-gray-900 rounded-lg font-semibold hover:bg-blue-700 dark:hover:bg-yellow-500 shadow transition-colors duration-150" onClick={() => setMoreOpen(false)}>{t('close')}</button>
            </div>
            {/* Overlay, less opaque for better background visibility */}
            <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm" />
          </div>
        )
      }

      {/* --- ENSURE: Bottom Navbar, always visible, outside all conditionals --- */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-lg flex justify-between items-center px-2 py-1 animate-fadeIn" role="navigation" aria-label={t('bottom_navigation')}>
        {/* Left nav links */}
        <div className="flex flex-1 justify-evenly">
          {bottomNavLinks.filter(link => link.key !== '+Sell').slice(0, 3).map((link) => (
            <button
              key={link.key}
              {...navButtonProps(t(link.key))}
              aria-current={routerLocation.pathname === link.path ? 'page' : undefined}
              onClick={link.key === 'more' ? (e) => { e.preventDefault(); setMoreOpen(true); } : () => window.location.assign(link.path)}
              style={{ background: 'none', border: 'none', outline: 'none' }}
            >
              <span className={routerLocation.pathname === link.path ? 'text-blue-600 dark:text-blue-400 scale-110' : 'text-gray-500 dark:text-gray-300'}>
                {link.icon}
              </span>
              <span className="text-xs mt-1 font-semibold" style={{ fontSize: '0.85rem', position: 'relative' }}>
                {t(link.key)}
              </span>
              {routerLocation.pathname === link.path && <span className="block w-1 h-1 rounded-full bg-blue-600 dark:bg-blue-400 mt-1 mx-auto animate-pulse" />}
            </button>
          ))}
        </div>
        {/* Center + (Sell) icon - Only show for logged-in users */}
        {isLoggedIn && (
          <div className="flex-none">
            <button
              aria-label={t('sell') || "Sell"}
              className="bg-blue-600 text-white rounded-full w-14 h-14 flex items-center justify-center text-4xl shadow-lg hover:bg-blue-700 transition-all -translate-y-4 border-4 border-white dark:border-gray-900"
              onClick={() => window.location.assign('/tier-selection')}
              style={{ zIndex: 100 }}
            >
              +
            </button>
          </div>
        )}
        {/* Right nav links */}
        <div className="flex flex-1 justify-evenly">
          {bottomNavLinks.filter(link => link.key !== '+Sell').slice(3).map((link) => (
            <button
              key={link.key}
              {...navButtonProps(t(link.key))}
              aria-current={routerLocation.pathname === link.path ? 'page' : undefined}
              onClick={link.key === 'more' ? (e) => { e.preventDefault(); setMoreOpen(true); } : () => window.location.assign(link.path)}
              style={{ background: 'none', border: 'none', outline: 'none' }}
            >
              <span className={routerLocation.pathname === link.path ? 'text-blue-600 dark:text-blue-400 scale-110' : 'text-gray-500 dark:text-gray-300'}>
                {link.icon}
              </span>
              <span className="text-xs mt-1 font-semibold" style={{ fontSize: '0.85rem', position: 'relative' }}>
                {t(link.key)}
              </span>
              {routerLocation.pathname === link.path && <span className="block w-1 h-1 rounded-full bg-blue-600 dark:bg-blue-400 mt-1 mx-auto animate-pulse" />}
            </button>
          ))}
        </div>
      </nav>
    </>
  );
};

export default GreenNavbar;

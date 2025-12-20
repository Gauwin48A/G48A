import React, { useState, useEffect } from 'react';
import { Link, useLocation as useRouterLocation } from 'react-router-dom';
import { FiUser, FiMenu, FiSearch, FiFilter, FiHome, FiGrid, FiUserCheck, FiMapPin, FiBell } from 'react-icons/fi';
import { useFilter } from '@/context/FilterContext';
import { useLocation } from '@/context/LocationContext';
import { useTranslation } from 'react-i18next';
import LanguageSelector from './LanguageSelector';

const navLinks = [
  { name: 'All Categories', path: '/all-posts' },
  { name: 'Mobiles', path: '/categories/mobiles' },
  { name: 'Fashion', path: '/categories/fashion' },
  { name: 'Electronics', path: '/categories/electronics' },
  { name: 'Home', path: '/categories/home' },
  { name: 'Books', path: '/categories/books' },
  { name: 'More', path: '/categories/more' },
];

const moreMenuLinks = [
  { key: 'categories', path: '/categories' },
  { key: 'feed', path: '/feed' },
  { key: 'my_feed', path: '/my-feed' },
  { key: 'feedback', path: '/feedback' },
  { key: 'complaints', path: '/complaints' },
  { key: 'dashboard', path: '/dashboard' },
  { key: 'admin_panel', path: '/admin-panel' },
  { key: 'login', path: '/login' },
  { key: 'signup', path: '/signup' },
];

const bottomNavLinks = [
  { key: 'home', path: '/all-posts', icon: <FiHome /> },
  { key: 'rewards', path: '/rewards', icon: <FiUserCheck /> },
  { key: 'profile', path: '/profile', icon: <FiUser /> },
  { key: 'more', path: '#', icon: <FiMenu /> },
];

const GreenNavbar = () => {
  const { t } = useTranslation();
  const { filters, setFilters } = useFilter();
  const [moreOpen, setMoreOpen] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  // Persist dark mode in localStorage
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem('darkMode');
    return stored ? JSON.parse(stored) : false;
  });
  const darkModeLabel = darkMode ? 'Disable Dark Mode' : 'Enable Dark Mode';

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Add animation for sliding pane via JS-in-CSS (React-safe)
  useEffect(() => {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      if (!document.getElementById('slideInRightStyle')) {
        const style = document.createElement('style');
        style.id = 'slideInRightStyle';
        style.textContent = `@keyframes slideInRight {from {transform: translateX(100%);}to {transform: translateX(0);}} .animate-slideInRight {animation: slideInRight 0.3s cubic-bezier(0.4,0,0.2,1);}`;
        document.head.appendChild(style);
      }
    }
  }, []);

  // Get location from context (for city display)
  const { city, loading: locationLoading, permissionGranted, retry: retryLocation } = useLocation();

  // Router location for path detection
  const routerLocation = useRouterLocation();

  // Show full navbar for home (all-posts) and my-posts
  const showFullNavbar = routerLocation.pathname === '/all-posts' || routerLocation.pathname === '/my-posts' || routerLocation.pathname === '/';

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
        <nav className={`sticky top-0 z-50 shadow-lg ${darkMode ? 'bg-gray-900' : 'bg-blue-600'}`} role="navigation" aria-label="Main Navigation">
          <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-3">
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
                title={city || t('location') || 'Detect Location'}
              >
                <FiMapPin className="text-white w-4 h-4" />
                <span className="text-white text-sm font-medium max-w-[120px] truncate">
                  {locationLoading ? '...' : (city || t('location') || 'Location')}
                </span>
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            {/* Search Bar with icon and filter */}
            <form className="flex-1 mx-6 max-w-xl flex items-center gap-2" role="search" aria-label="Product Search" onSubmit={e => { e.preventDefault(); }}>
              <div className="relative w-full">
                <input
                  type="text"
                  placeholder={t('search_placeholder') || "Search for products, brands and more"}
                  className="w-full px-4 py-2 rounded-lg border-none bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 pr-10"
                  value={filters.search}
                  onChange={e => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))}
                  onKeyDown={e => { if (e.key === 'Enter') setFilters(f => ({ ...f, search: e.target.value, page: 1 })); }}
                />
                <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 w-5 h-5 flex items-center justify-center p-0 m-0 border-0 bg-transparent cursor-pointer">
                  <FiSearch className="w-5 h-5" />
                </button>
              </div>
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('price_range') || "Price Range"}</label>
                        <select className="w-full border rounded px-2 py-1" onChange={e => setFilters(f => ({ ...f, priceRange: e.target.value, page: 1 }))}>
                          <option value="">{t('all')}</option>
                          <option value="0-100">{t('under_100') || "Under $100"}</option>
                          <option value="100-500">{t('price_100_500') || "$100 - $500"}</option>
                          <option value="500-1000">{t('price_500_1000') || "$500 - $1000"}</option>
                          <option value="1000+">{t('above_1000') || "Above $1000"}</option>
                        </select>
                      </div>
                      <div className="mb-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('date_range') || "Date Range"}</label>
                        <div className="flex gap-2">
                          <input type="date" className="w-1/2 border rounded px-2 py-1" onChange={e => setFilters(f => ({ ...f, startDate: e.target.value, page: 1 }))} />
                          <input type="date" className="w-1/2 border rounded px-2 py-1" onChange={e => setFilters(f => ({ ...f, endDate: e.target.value, page: 1 }))} />
                        </div>
                      </div>
                      <div className="mb-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('category')}</label>
                        <select className="w-full border rounded px-2 py-1" value={filters.category} onChange={e => setFilters(f => ({ ...f, category: e.target.value, page: 1 }))}>
                          <option value="">{t('all')}</option>
                          <option value="Electronics">{t('electronics')}</option>
                          <option value="Fashion">{t('fashion')}</option>
                          <option value="Home">{t('home')}</option>
                          <option value="Mobiles">{t('mobiles')}</option>
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
            </form>

            {/* Icons */}
            <div className="flex items-center gap-4">
              {/* Add Post Button */}
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
              {/* Notifications Bell */}
              <Link to="/notifications" aria-label={t('notifications')} className="relative group">
                <span className="p-2 rounded-full hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-white transition-colors inline-flex items-center justify-center">
                  <FiBell className="text-white w-6 h-6" />
                </span>
                <span className="absolute left-10 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs rounded px-3 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-lg pointer-events-none">
                  {t('notifications')}
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
        </nav>
      ) : (
        // Blank blue ribbon for other pages
        <div className="h-14 bg-blue-600 w-full" />
      )}

      {/* More Menu Fullscreen Overlay */}
      {moreOpen && (
        <div className="fixed inset-0 z-50" onClick={() => setMoreOpen(false)}>
          {/* Right-side vertical sliding pane, with improved highlight and shadow */}
          <div className="fixed top-0 right-0 h-full w-80 max-w-full bg-white dark:bg-gray-800 shadow-2xl p-8 flex flex-col gap-4 animate-slideInRight ring-4 ring-blue-400 dark:ring-yellow-400 ring-opacity-80 z-50" style={{ transition: 'transform 0.3s' }} onClick={e => e.stopPropagation()}>
            <button className="absolute top-4 right-4 text-gray-500 hover:text-blue-600 dark:hover:text-yellow-400" onClick={() => setMoreOpen(false)}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <h2 className="text-2xl font-bold text-blue-600 dark:text-yellow-300 mb-4 drop-shadow-lg">{t('more_options')}</h2>
            {moreMenuLinks.map(link => (
              <Link
                key={link.key}
                to={link.path}
                className="block px-4 py-3 rounded-lg text-blue-700 dark:text-yellow-200 hover:bg-blue-100 dark:hover:bg-gray-700 font-semibold text-center text-base shadow transition-colors duration-150"
                onClick={() => setMoreOpen(false)}
                tabIndex={0}
              >
                {t(link.key)}
              </Link>
            ))}
            <button className="mt-4 px-4 py-2 bg-blue-600 dark:bg-yellow-400 text-white dark:text-gray-900 rounded-lg font-semibold hover:bg-blue-700 dark:hover:bg-yellow-500 shadow transition-colors duration-150" onClick={() => setMoreOpen(false)}>{t('close')}</button>
          </div>
          {/* Overlay, less opaque for better background visibility */}
          <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm" />
        </div>
      )}

      {/* --- ENSURE: Bottom Navbar, always visible, outside all conditionals --- */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-lg flex justify-between items-center px-2 py-1 animate-fadeIn" role="navigation" aria-label="Bottom navigation">
        {/* Left nav links */}
        <div className="flex flex-1 justify-evenly">
          {bottomNavLinks.filter(link => link.key !== '+Sell').slice(0, 2).map((link) => (
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
        {/* Center + (Sell) icon */}
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
        {/* Right nav links */}
        <div className="flex flex-1 justify-evenly">
          {bottomNavLinks.filter(link => link.key !== '+Sell').slice(2).map((link) => (
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

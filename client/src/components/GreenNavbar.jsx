import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiUser, FiBell, FiMenu, FiSearch, FiFilter, FiHome, FiList, FiGrid, FiUserCheck } from 'react-icons/fi';
import { FiPlusSquare } from 'react-icons/fi';
import { SkeletonLoader } from './GreenSkeletonLoader';

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
  { name: 'Feedback', path: '/feedback' },
  { name: 'Complaints', path: '/complaints' },
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Admin Panel', path: '/admin-panel' },
  { name: 'Login', path: '/login' },
  { name: 'Sign Up', path: '/signup' },
];

const bottomNavLinks = [
  { name: 'Home', path: '/all-posts', icon: <FiHome /> },
  { name: 'Feed', path: '/feed', icon: <FiList /> },
  { name: 'My Feed', path: '/my-feed', icon: <FiUserCheck /> },
  { name: 'Categories', path: '/categories', icon: <FiList /> },
  { name: 'Rewards', path: '/rewards', icon: <FiUserCheck /> },
  { name: 'Profile', path: '/profile', icon: <FiUser /> },
  { name: 'More', path: '#', icon: <FiMenu /> },
];

const GreenNavbar = () => {
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

  const location = useLocation();
  // Show full navbar for home (all-posts) and my-posts
  const showFullNavbar = location.pathname === '/all-posts' || location.pathname === '/my-posts' || location.pathname === '/';

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
            {/* Logo */}
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
              <span className="text-white text-2xl font-bold">Shop</span>
            </Link>
            {/* Search Bar with icon and filter */}
            <form className="flex-1 mx-6 max-w-xl flex items-center gap-2" role="search" aria-label="Product Search">
              <div className="relative w-full">
                <input
                  type="text"
                  placeholder="Search for products, brands and more"
                  className="w-full px-4 py-2 rounded-lg border-none bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 pl-10"
                />
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-500 w-5 h-5" />
              </div>
              <div className="relative">
                <button type="button" onClick={() => setShowFilter(true)} className="bg-blue-500 text-white px-3 py-2 rounded-lg flex items-center gap-1 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-white">
                  <FiFilter className="w-5 h-5" />
                  <span className="hidden sm:inline">Filter</span>
                </button>
                {showFilter && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border p-6 w-full max-w-sm mx-2 flex flex-col gap-3 relative animate-fadeIn">
                      <button className="absolute top-3 right-3 text-gray-400 hover:text-blue-600 dark:hover:text-yellow-400" onClick={() => setShowFilter(false)} aria-label="Close filter">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                      <h4 className="font-semibold text-blue-600 dark:text-yellow-300 mb-2">Filter Products</h4>
                      <div className="mb-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                        <input type="text" placeholder="Enter location" className="w-full border rounded px-2 py-1" />
                      </div>
                      <div className="mb-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Price Range</label>
                        <select className="w-full border rounded px-2 py-1">
                          <option value="">All</option>
                          <option value="0-100">Under $100</option>
                          <option value="100-500">$100 - $500</option>
                          <option value="500-1000">$500 - $1000</option>
                          <option value="1000+">Above $1000</option>
                        </select>
                      </div>
                      <div className="mb-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                        <div className="flex flex-wrap gap-2 mb-2">
                          <button className="px-3 py-1 rounded bg-blue-100 text-blue-700 text-xs font-semibold hover:bg-blue-200">Today</button>
                          <button className="px-3 py-1 rounded bg-blue-100 text-blue-700 text-xs font-semibold hover:bg-blue-200">Last Week</button>
                          <button className="px-3 py-1 rounded bg-blue-100 text-blue-700 text-xs font-semibold hover:bg-blue-200">Last Month</button>
                          <button className="px-3 py-1 rounded bg-blue-100 text-blue-700 text-xs font-semibold hover:bg-blue-200">All Time</button>
                        </div>
                        <div className="flex gap-2">
                          <input type="date" className="w-1/2 border rounded px-2 py-1" />
                          <input type="date" className="w-1/2 border rounded px-2 py-1" />
                        </div>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <button
                          className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
                          // onClick={handleApplyFilters} // wire this to your filter logic
                        >Apply Filters</button>
                        <button
                          className="flex-1 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-200 py-2 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-700 transition"
                          onClick={() => {
                            // Clear all filter fields logic here
                            // setLocation(''); setPrice(''); setDate(''); etc.
                          }}
                        >Clear Filters</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </form>
            {/* Icons */}
            <div className="flex items-center gap-4">
              {/* Modernized Add Post Icon with floating effect and improved tooltip */}
              <Link to="/add-post" aria-label="Add Post" className="relative group">
                <span
                  className="inline-flex items-center justify-center rounded-full border-2 border-blue-600 bg-gradient-to-br from-blue-400 to-blue-600 text-white w-12 h-12 text-3xl font-extrabold shadow-xl hover:scale-110 hover:shadow-2xl transition-all duration-200 ring-4 ring-blue-300 focus:ring-4 focus:ring-blue-400 animate-bounce"
                  onClick={e => {
                    e.preventDefault();
                    window.location.href = '/tier-selection';
                  }}
                  style={{ cursor: 'pointer', zIndex: 20 }}
                  tabIndex={0}
                  role="button"
                  aria-label="Add Post"
                >
                  +
                </span>
                <span className="absolute left-14 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs rounded px-3 py-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-lg pointer-events-none">
                  Add Post
                </span>
              </Link>
              {/* Notification Bell with fixed tooltip and no overlap */}
              <div className="relative flex items-center" style={{zIndex: 10}}>
                <button className="relative ml-2" aria-label="Notifications" onClick={() => window.location.href = '/notifications'}>
                  <FiBell className={`${darkMode ? 'text-yellow-300' : 'text-white'} w-7 h-7`} />
                  <span className="absolute top-0 right-0 block w-2 h-2 bg-red-500 rounded-full"></span>
                </button>
                <span className="absolute left-10 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs rounded px-3 py-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-lg pointer-events-none">
                  Notifications
                </span>
              </div>
              {/* Channel Icon beside notifications */}
              <Link to="/channels" aria-label="Channels" className="ml-4">
                <FiGrid className={darkMode ? 'text-yellow-300' : 'text-white'} style={{fontSize: '1.8rem'}} />
              </Link>
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
          <div className="fixed top-0 right-0 h-full w-80 max-w-full bg-white dark:bg-gray-800 shadow-2xl p-8 flex flex-col gap-4 animate-slideInRight ring-4 ring-blue-400 dark:ring-yellow-400 ring-opacity-80 z-50" style={{transition: 'transform 0.3s'}} onClick={e => e.stopPropagation()}>
            <button className="absolute top-4 right-4 text-gray-500 hover:text-blue-600 dark:hover:text-yellow-400" onClick={() => setMoreOpen(false)}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <h2 className="text-2xl font-bold text-blue-600 dark:text-yellow-300 mb-4 drop-shadow-lg">More Options</h2>
            {moreMenuLinks.map(link => (
              <Link
                key={link.name}
                to={link.path}
                className="block px-4 py-3 rounded-lg text-blue-700 dark:text-yellow-200 hover:bg-blue-100 dark:hover:bg-gray-700 font-semibold text-center text-base shadow transition-colors duration-150"
                onClick={() => setMoreOpen(false)}
                tabIndex={0}
              >
                {link.name}
              </Link>
            ))}
            <button className="mt-4 px-4 py-2 bg-blue-600 dark:bg-yellow-400 text-white dark:text-gray-900 rounded-lg font-semibold hover:bg-blue-700 dark:hover:bg-yellow-500 shadow transition-colors duration-150" onClick={() => setMoreOpen(false)}>Close</button>
          </div>
          {/* Overlay, less opaque for better background visibility */}
          <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm" />
        </div>
      )}

      {/* --- ENSURE: Bottom Navbar, always visible, outside all conditionals --- */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-lg flex justify-between items-center px-2 py-1 animate-fadeIn" role="navigation" aria-label="Bottom navigation">
        {/* Left nav links */}
        <div className="flex flex-1 justify-evenly">
          {bottomNavLinks.filter(link => link.name !== '+Sell').slice(0,2).map((link) => (
            <button
              key={link.name}
              {...navButtonProps(link.name)}
              aria-current={location.pathname === link.path ? 'page' : undefined}
              onClick={link.name === 'More' ? (e) => { e.preventDefault(); setMoreOpen(true); } : () => window.location.assign(link.path)}
              style={{ background: 'none', border: 'none', outline: 'none' }}
            >
              <span className={location.pathname === link.path ? 'text-blue-600 dark:text-blue-400 scale-110' : 'text-gray-500 dark:text-gray-300'}>
                {link.icon}
              </span>
              <span className="text-xs mt-1 font-semibold" style={{fontSize: '0.85rem', position: 'relative'}}>
                {link.name}
              </span>
              {location.pathname === link.path && <span className="block w-1 h-1 rounded-full bg-blue-600 dark:bg-blue-400 mt-1 mx-auto animate-pulse" />}
            </button>
          ))}
        </div>
        {/* Center + (Sell) icon */}
        <div className="flex-none">
          <button
            aria-label="Sell"
            className="bg-blue-600 text-white rounded-full w-14 h-14 flex items-center justify-center text-4xl shadow-lg hover:bg-blue-700 transition-all -translate-y-4 border-4 border-white dark:border-gray-900"
            onClick={() => window.location.assign('/tier-selection')}
            style={{ zIndex: 100 }}
          >
            +
          </button>
        </div>
        {/* Right nav links */}
        <div className="flex flex-1 justify-evenly">
          {bottomNavLinks.filter(link => link.name !== '+Sell').slice(2).map((link) => (
            <button
              key={link.name}
              {...navButtonProps(link.name)}
              aria-current={location.pathname === link.path ? 'page' : undefined}
              onClick={link.name === 'More' ? (e) => { e.preventDefault(); setMoreOpen(true); } : () => window.location.assign(link.path)}
              style={{ background: 'none', border: 'none', outline: 'none' }}
            >
              <span className={location.pathname === link.path ? 'text-blue-600 dark:text-blue-400 scale-110' : 'text-gray-500 dark:text-gray-300'}>
                {link.icon}
              </span>
              <span className="text-xs mt-1 font-semibold" style={{fontSize: '0.85rem', position: 'relative'}}>
                {link.name}
              </span>
              {location.pathname === link.path && <span className="block w-1 h-1 rounded-full bg-blue-600 dark:bg-blue-400 mt-1 mx-auto animate-pulse" />}
            </button>
          ))}
        </div>
      </nav>
    </>
  );
};

export default GreenNavbar;

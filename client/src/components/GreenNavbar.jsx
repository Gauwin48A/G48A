import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation as useRouterLocation, useNavigate } from 'react-router-dom';
import { FiUser, FiMenu, FiSearch, FiFilter, FiHome, FiGrid, FiUserCheck, FiMapPin, FiBell, FiBookmark, FiClock, FiFileText, FiMessageCircle, FiNavigation, FiLock, FiStar, FiX, FiMonitor, FiSmartphone, FiTablet, FiCheck, FiShoppingCart, FiSun, FiMoon } from 'react-icons/fi';
import { useFilter } from '@/context/FilterContext';
import { useCategoryMode } from '@/context/CategoryModeContext';
import { useLocation } from '@/context/LocationContext';
import { useTranslation } from 'react-i18next';
import { useToast } from "@/hooks/use-toast";
import LanguageSelector from './LanguageSelector';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useTheme } from '@/context/ThemeContext';
import api from '@/services/api';
import { fetchUserPreferencesCached, clearUserPreferencesCache } from '@/services/preferencesService';
import { getAccessToken, getUserId, isAuthenticated } from '@/utils/authStorage';
import { fetchAllSubcategories } from '@/services/subcategoriesService';
import { buildActiveAppMatcher, normalizeCategoryText } from '@/utils/categoryModeFilters';
import MiniCartPopover from '@/components/MiniCartPopover';
import { useUnreadCount } from '@/hooks/useNotifications';
import { readSavedPostIds, subscribeSavedPosts } from '@/utils/savedPosts';
import { readUserCity } from '@/utils/locationCache';

const parseStoredBoolean = (rawValue, fallback = false) => {
  if (rawValue === null || rawValue === undefined) return fallback;
  if (rawValue === 'true') return true;
  if (rawValue === 'false') return false;

  try {
    return Boolean(JSON.parse(rawValue));
  } catch {
    return fallback;
  }
};

const LAYOUT_STORAGE_KEY = 'mhub_layout_preview_mode';
const LAYOUT_PRESETS = [
  { key: 'mobile', labelKey: 'mobile', icon: FiSmartphone, width: 390, height: 844 },
  { key: 'tablet', labelKey: 'tablet', icon: FiTablet, width: 834, height: 1112 },
  { key: 'desktop', labelKey: 'desktop', icon: FiMonitor, width: 1366, height: 900 },
];

const AUTH_ONLY_PATHS = new Set(['/login', '/signup', '/forgot-password', '/reset-password']);

const GreenNavbar = () => {
  const { t } = useTranslation();
  const routerLocation = useRouterLocation();
  const normalizedPath = useMemo(() => {
    const raw = routerLocation.pathname || '/';
    const trimmed = raw.replace(/\/+$/, '');
    return trimmed === '' ? '/' : trimmed;
  }, [routerLocation.pathname]);
  const currentPath = normalizedPath;
  const isAuthPage = AUTH_ONLY_PATHS.has(currentPath) || currentPath.startsWith('/reset-password');

  const navLinks = [
    { name: t('all_categories'), path: '/category-hub' },
    { name: t('mobiles'), path: '/categories/mobiles' },
    { name: t('fashion'), path: '/categories/fashion' },
    { name: t('electronics'), path: '/categories/electronics' },
    { name: t('home'), path: '/categories/home' },
    { name: t('books'), path: '/categories/books' },
    { name: t('more'), path: '/categories/more' },
  ];

  const moreMenuLinks = [
    { key: 'sell', path: '/post-welcome', icon: FiShoppingCart, group: 'trade' },
    { key: 'plans', path: '/tier-selection', icon: FiStar, group: 'trade' },
    { key: 'centre', path: '/centre', icon: FiUser, group: 'trade', label: t('centre_page', { defaultValue: 'CentrePage' }) },
    { key: 'nearby', path: '/nearby', icon: FiMapPin, group: 'trade' },
    { key: 'category_mode', path: '/category-mode', icon: FiNavigation, group: 'trade', label: t('category_mode', { defaultValue: 'Category mode' }) },
    { key: 'subcategories', path: '/subcategories', icon: FiGrid, group: 'trade' },
    { key: 'chat', path: '/chat', icon: FiMessageCircle, group: 'social' },
    { key: 'feedback', path: '/feedback', icon: FiStar, group: 'social' },
    { key: 'complaints', path: '/complaints', icon: FiFileText, group: 'social' },
    { key: 'verification', path: '/verification', icon: FiUserCheck, group: 'account' },
    { key: 'dashboard', path: '/dashboard', icon: FiMonitor, group: 'account' },
    { key: 'admin_panel', path: '/admin-panel', icon: FiLock, group: 'account' },
  ];

  const bottomNavLinks = [
    { key: 'home', path: '/category-hub', icon: <FiHome />, matchPaths: ['/category-hub', '/home'] },
    { key: 'all_posts', path: '/all-posts', icon: <FiGrid />, matchPaths: ['/all-posts', '/listings', '/'] },
    { key: 'for_you', path: '/for-you', icon: <FiStar />, matchPaths: ['/for-you'] },
    { key: 'feed', path: '/feed', icon: <FiFileText />, matchPaths: ['/feed'] },
    { key: 'rewards', path: '/rewards', icon: <FiUserCheck />, matchPaths: ['/rewards'] },
    { key: 'profile', path: '/profile', icon: <FiUser />, matchPaths: ['/profile'] },
    { key: 'more', path: '#', icon: <FiMenu /> },
  ];
  const { toast } = useToast();
  const { user, logout } = useAuth();
  const { items: cartItems, totalCount } = useCart();
  const { filters, setFilters } = useFilter();
  const {
    activeApp,
    activeCategory,
    categories: categoryModeCategories,
  } = useCategoryMode();
  const [moreOpen, setMoreOpen] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [subcategories, setSubcategories] = useState([]);
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search) count += 1;
    if (filters.location) count += 1;
    if (filters.minPrice || filters.maxPrice) count += 1;
    if (filters.startDate || filters.endDate) count += 1;
    if (
      (filters.subcategory && filters.subcategory !== 'All') ||
      (filters.category && filters.category !== 'All')
    ) {
      count += 1;
    }
    if (filters.sortBy) count += 1;
    if (filters.condition) count += 1;
    if (filters.verifiedOnly) count += 1;
    return count;
  }, [
    filters.category,
    filters.subcategory,
    filters.condition,
    filters.endDate,
    filters.location,
    filters.maxPrice,
    filters.minPrice,
    filters.search,
    filters.sortBy,
    filters.startDate,
    filters.verifiedOnly,
  ]);
  const hasActiveFilters = activeFilterCount > 0;
  const { mode: themeMode, setThemeMode } = useTheme();
  const [layoutMode, setLayoutMode] = useState(() => {
    const stored = String(localStorage.getItem(LAYOUT_STORAGE_KEY) || '').trim().toLowerCase();
    return LAYOUT_PRESETS.some((preset) => preset.key === stored) ? stored : 'desktop';
  });
  const [isLayoutMenuOpen, setIsLayoutMenuOpen] = useState(false);
  const layoutMenuRef = useRef(null);
  const layoutMenuPanelRef = useRef(null);
  const [layoutMenuStyle, setLayoutMenuStyle] = useState(null);

  // Large font mode for accessibility
  const [largeFont, setLargeFont] = useState(() => {
    const stored = localStorage.getItem('largeFont');
    return parseStoredBoolean(stored, false);
  });

  useEffect(() => {
    let cancelled = false;

    const fetchSubcategoryOptions = async () => {
      try {
        const subcategoryData = await fetchAllSubcategories();
        if (cancelled) return;
        setSubcategories(Array.isArray(subcategoryData) ? subcategoryData : []);
      } catch (err) {
        if (cancelled) return;
        if (import.meta.env.DEV) {
          console.error('Failed to fetch subcategories:', err);
        }
        setSubcategories([]);
      }
    };
    fetchSubcategoryOptions();

    return () => {
      cancelled = true;
    };
  }, []);

  // Dark mode is now managed by ThemeContext

  useEffect(() => {
    document.documentElement.setAttribute('data-layout-preview', layoutMode);
    document.body?.setAttribute('data-layout-preview', layoutMode);
    localStorage.setItem(LAYOUT_STORAGE_KEY, layoutMode);
  }, [layoutMode]);

  useEffect(() => {
    const onClickOutside = (event) => {
      if (layoutMenuRef.current?.contains(event.target)) return;
      if (layoutMenuPanelRef.current?.contains(event.target)) return;
      setIsLayoutMenuOpen(false);
    };

    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

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
  const isLoggedIn = useMemo(() => isAuthenticated(user), [user]);

  // Notification unread count badge
  const { data: rawUnreadCount = 0 } = useUnreadCount({ enabled: isLoggedIn, refetchInterval: 60000 });
  const unreadCount = isLoggedIn ? rawUnreadCount : 0;

  // Wishlist count badge — subscribe to savedPosts events so badge updates immediately
  const [wishlistCount, setWishlistCount] = useState(0);
  useEffect(() => {
    if (!isLoggedIn) {
      setWishlistCount(0);
      return () => {};
    }
    setWishlistCount(readSavedPostIds().length);
    const unsubscribe = subscribeSavedPosts((savedMap) => {
      setWishlistCount(Object.keys(savedMap).length);
    });
    return unsubscribe;
  }, [isLoggedIn]);

  // Cart count filtered by active category mode (so the badge reflects the current
  // category context rather than the total across all categories).
  const categoryFilteredCartCount = useMemo(() => {
    if (!activeApp && !activeCategory) return totalCount;
    const filtered = (Array.isArray(cartItems) ? cartItems : []).filter((item) => {
      if (activeCategory?.name) {
        const catName = normalizeCategoryText(activeCategory.name);
        if (item.category && normalizeCategoryText(item.category) === catName) return true;
        if (item.category_group && normalizeCategoryText(item.category_group) === catName) return true;
        return false;
      }
      if (activeApp) {
        const matcher = buildActiveAppMatcher(activeApp, categoryModeCategories);
        if (!matcher) return true;
        if (item.category && matcher.categoryNames.has(normalizeCategoryText(item.category))) return true;
        if (item.category_group && matcher.categoryNames.has(normalizeCategoryText(item.category_group))) return true;
        return false;
      }
      return true;
    });
    return filtered.reduce((sum, entry) => sum + Number(entry.qty ?? 1), 0);
  }, [cartItems, totalCount, activeApp, activeCategory, categoryModeCategories]);
  const navigate = useNavigate();
  const currentLayoutPreset = useMemo(
    () => LAYOUT_PRESETS.find((preset) => preset.key === layoutMode) || LAYOUT_PRESETS[2],
    [layoutMode],
  );
  const CurrentLayoutIcon = currentLayoutPreset.icon;
  const cycleLayout = () => {
    const currentIndex = LAYOUT_PRESETS.findIndex((preset) => preset.key === layoutMode);
    const nextPreset =
      currentIndex === -1
        ? LAYOUT_PRESETS[0]
        : LAYOUT_PRESETS[(currentIndex + 1) % LAYOUT_PRESETS.length];
    setLayoutMode(nextPreset.key);
  };

  // User preferences for For You page filter pre-population
  const [userPreferences, setUserPreferences] = useState(null);

  // Fetch user preferences when on For You page (need routerLocation to be defined first)
  // This effect is defined after routerLocation is declared below

  const handleLogout = async () => {
    setMoreOpen(false);
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch {
      // Fallback if logout API fails unexpectedly.
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      localStorage.removeItem('userId');
      localStorage.removeItem('user_id');
      localStorage.removeItem('userProfile');
      localStorage.removeItem('token');
      navigate('/login', { replace: true });
    }
  };

  const closeMoreMenu = () => {
    setMoreOpen(false);
  };

  const handleLayoutModeChange = (modeKey) => {
    const next = LAYOUT_PRESETS.find((preset) => preset.key === modeKey);
    if (!next) return;
    setLayoutMode(next.key);
    setIsLayoutMenuOpen(false);
  };

  // Add animation for sliding pane via JS-in-CSS (React-safe)
  useEffect(() => {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      if (!document.getElementById('slideInRightStyle')) {
        const style = document.createElement('style');
        style.id = 'slideInRightStyle';
        style.textContent = `
          @keyframes slideInRight {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
          .animate-slideInRight {
            animation: slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
        `;
        document.head.appendChild(style);
      }
    }
  }, []);

  useEffect(() => {
    if (!moreOpen || typeof document === 'undefined') return undefined;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setMoreOpen(false);
      }
    };

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [moreOpen]);

  // Get location from context (for city display)
  const { city, area, village, colony, locality, displayName, locationString, hasLocation, loading: locationLoading, permissionGranted, forceRefreshLocation, accuracyTier, isLiveLocation, isIpFallback, provider, isStaleLocation } = useLocation();


  // Router location for path detection
  useEffect(() => {
    setShowFilter(false);
    setMoreOpen(false);
    setIsLayoutMenuOpen(false);
  }, [routerLocation.pathname]);
  const activeAppMatcher = useMemo(
    () => buildActiveAppMatcher(activeApp, categoryModeCategories),
    [activeApp, categoryModeCategories],
  );
  const activeCategoryId = useMemo(() => {
    if (!activeCategory?.name) return "";
    if (activeCategory?.id) return String(activeCategory.id);
    const normalized = normalizeCategoryText(activeCategory.name);
    const match = (Array.isArray(categoryModeCategories) ? categoryModeCategories : []).find((entry) => {
      const entryName = normalizeCategoryText(
        entry?.name || entry?.title || entry?.label || entry?.category_name || "",
      );
      return entryName === normalized;
    });
    const id = match?.category_id || match?.id || null;
    return id != null ? String(id) : "";
  }, [activeCategory?.id, activeCategory?.name, categoryModeCategories]);
  const scopedSubcategories = useMemo(() => {
    const source = Array.isArray(subcategories) ? subcategories : [];
    return source.filter((sub) => {
      const subCategoryId = sub?.category_id != null ? String(sub.category_id) : "";
      const subCategoryName = normalizeCategoryText(sub?.category_name || "");
      if (activeCategoryId) {
        return subCategoryId === activeCategoryId;
      }
      if (activeAppMatcher?.activeApp) {
        if (subCategoryId && activeAppMatcher.categoryIds.has(subCategoryId)) {
          return true;
        }
        if (subCategoryName && activeAppMatcher.categoryNames.has(subCategoryName)) {
          return true;
        }
        return false;
      }
      return true;
    });
  }, [activeAppMatcher, activeCategoryId, subcategories]);

  // Check if currently on For You page
  const isForYouPage = normalizedPath === '/for-you';
  const hideFilterOnGate = isForYouPage && !isLoggedIn;
  const hideChromeOnHub =
    normalizedPath === '/category-hub' ||
    normalizedPath === '/category-mode';
  // Build the most specific area name — colony/neighbourhood > village > locality > area > city
  // Skip values that duplicate city/mandal level names (e.g. area = "Bachupally mandal" equals city)
  const bestAreaName = (() => {
    const candidates = [colony, village, locality, area, city];
    // Deduplicate: skip a candidate if it equals a less-specific one (case-insensitive, trimmed)
    const seen = new Set();
    for (const c of candidates.reverse()) {
      if (c && c.trim()) seen.add(c.trim().toLowerCase());
    }
    // Walk from most specific → least specific, return the first that isn't also a less-specific level
    const normalize = (v) => (v || '').trim().toLowerCase().replace(/\s+(mandal|district|municipality|tehsil|taluk|block)$/i, '');
    const cityNorm = normalize(city);
    for (const c of [colony, village, locality]) {
      if (c && c.trim() && normalize(c) !== cityNorm) return c.trim();
    }
    // area might be same as city (e.g. both "Bachupally mandal") — still use it but strip mandal suffix
    if (area && area.trim()) {
      const cleaned = area.trim().replace(/\s+(mandal|district|municipality|tehsil|taluk|block)$/i, '');
      if (cleaned && cleaned.toLowerCase() !== cityNorm) return cleaned;
      return cleaned || area.trim();
    }
    if (city && city.trim()) {
      return city.trim().replace(/\s+(mandal|district|municipality|tehsil|taluk|block)$/i, '');
    }
    return '';
  })();

  // Build visible location label — prefer most specific area name
  const cachedUserCity = readUserCity();
  const showStalePlaceholder = isStaleLocation && !locationLoading;
  const resolvedLocationLabel = (locationLoading || showStalePlaceholder)
    ? t('detecting_location', { defaultValue: 'Detecting location...' })
    : (bestAreaName || displayName || locationString || cachedUserCity || t('location', { defaultValue: 'Location' }));
  // Short label for compact navbar display
  const shortLocationLabel = (locationLoading || showStalePlaceholder)
    ? t('detecting', { defaultValue: 'Detecting...' })
    : (bestAreaName || (displayName ? displayName.split(',')[0].trim() : '') || cachedUserCity || t('location', { defaultValue: 'Location' }));
  const navbarSearchLabel =
    filters.search || t('search_placeholder', { defaultValue: 'Search products or brands' });
  const openSearchPage = () => {
    const context = normalizedPath === '/for-you' ? 'for-you' : 'all-posts';
    navigate(`/search?context=${context}`);
  };

  // Fetch user preferences when on For You page and pre-populate filters
  useEffect(() => {
    const userId = getUserId(user);
    const token = getAccessToken();

    if (isForYouPage && userId && token) {
      const fetchPreferences = async () => {
        try {
          const data = await fetchUserPreferencesCached({ userId });
          setUserPreferences(data || null);
          if (import.meta.env.DEV) {
            console.log('[Navbar] Loaded user preferences for For You page:', data);
          }
          const savedSubcategories = Array.isArray(data?.subcategories)
            ? data.subcategories
            : Array.isArray(data?.categories)
              ? data.categories
              : [];
          const singleSavedSubcategory =
            savedSubcategories.length === 1 ? savedSubcategories[0] : 'All';
          // Pre-populate filters with user preferences
          if (data) {
            setFilters(f => ({
              ...f,
              location: data.location || '',
              minPrice: data.minPrice !== undefined && data.minPrice !== null ? String(data.minPrice) : '',
              maxPrice: data.maxPrice !== undefined && data.maxPrice !== null ? String(data.maxPrice) : '',
              category: 'All',
              subcategory: singleSavedSubcategory || 'All',
            }));
          }
        } catch (err) {
          if (import.meta.env.DEV) {
            console.error('Failed to fetch user preferences:', err);
          }
        }
      };
      fetchPreferences();
    } else if (!isForYouPage) {
      // Clear preferences when leaving For You page
      setUserPreferences(null);
    }
  }, [isForYouPage, setFilters, user]);

  // Show full navbar for home (all-posts), my-posts, and For You
  const showFullNavbar =
    normalizedPath === '/all-posts' ||
    normalizedPath.startsWith('/all-posts/') ||
    normalizedPath === '/listings' ||
    normalizedPath.startsWith('/listings/') ||
    normalizedPath === '/my-posts' ||
    normalizedPath.startsWith('/my-posts/') ||
    normalizedPath === '/home' ||
    normalizedPath === '/' ||
    normalizedPath === '/for-you' ||
    normalizedPath.startsWith('/for-you/');
  const hideTopRibbon =
    isAuthPage ||
    normalizedPath === '/profile' ||
    normalizedPath.startsWith('/profile/') ||
    normalizedPath === '/rewards' ||
    normalizedPath.startsWith('/rewards');
  const topNavRef = useRef(null);
  const topRibbonRef = useRef(null);

  useLayoutEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    if (!root) return;

    const resolveHeight = () => {
      if (hideChromeOnHub) return 0;
      if (showFullNavbar && topNavRef.current) return topNavRef.current.offsetHeight || 0;
      if (!hideTopRibbon && topRibbonRef.current) return topRibbonRef.current.offsetHeight || 0;
      return 0;
    };

    const applyHeight = () => {
      const height = resolveHeight();
      const value = `${height}px`;
      root.style.setProperty('--top-nav-height', value);
      if (body) body.style.setProperty('--top-nav-height', value);
    };

    applyHeight();
    window.addEventListener('resize', applyHeight);
    return () => window.removeEventListener('resize', applyHeight);
  }, [hideChromeOnHub, hideTopRibbon, showFullNavbar]);

  useLayoutEffect(() => {
    if (!isLayoutMenuOpen || typeof window === 'undefined') {
      setLayoutMenuStyle(null);
      return;
    }

    const update = () => {
      const anchor = layoutMenuRef.current;
      if (!anchor) {
        setLayoutMenuStyle(null);
        return;
      }
      const rect = anchor.getBoundingClientRect();
      const right = Math.max(12, window.innerWidth - rect.right);
      const minWidth = Math.max(rect.width || 0, 176);
      setLayoutMenuStyle({
        top: rect.bottom + 8,
        right,
        minWidth,
      });
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [isLayoutMenuOpen]);

  // Helper for ARIA and touch target
  const navButtonProps = (label) => ({
    'aria-label': label,
    role: 'button',
    tabIndex: 0,
    className: 'flex flex-col items-center justify-center min-w-[48px] min-h-[48px] p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 active:bg-blue-100 dark:active:bg-blue-900',
  });

  const isBottomNavLinkActive = (link) => {
    if (link.key === 'more') return moreOpen;
    const currentPath = normalizedPath;
    const matchPaths =
      Array.isArray(link.matchPaths) && link.matchPaths.length > 0
        ? link.matchPaths
        : [link.path];

    return matchPaths.some((matchPath) => {
      if (!matchPath || matchPath === '#') return false;
      return currentPath === matchPath || currentPath.startsWith(`${matchPath}/`);
    });
  };

  const visibleBottomNavLinks = bottomNavLinks.filter((link) => link.key !== '+Sell');
  const bottomNavLeftLinks = visibleBottomNavLinks.slice(0, 3);
  const bottomNavRightLinks = visibleBottomNavLinks.slice(3);
  const savedPreferenceSubcategories = Array.isArray(userPreferences?.subcategories)
    ? userPreferences.subcategories
    : Array.isArray(userPreferences?.categories)
      ? userPreferences.categories
      : [];
  const scopedSubcategoryNames = useMemo(
    () => new Set(scopedSubcategories.map((item) => normalizeCategoryText(item?.name || item?.title || ""))),
    [scopedSubcategories],
  );
  const visibleSavedPreferenceSubcategories = useMemo(() => {
    if (activeCategoryId || activeAppMatcher?.activeApp) {
      return savedPreferenceSubcategories.filter((item) =>
        scopedSubcategoryNames.has(normalizeCategoryText(item)),
      );
    }
    return savedPreferenceSubcategories;
  }, [
    activeAppMatcher?.activeApp,
    activeCategoryId,
    savedPreferenceSubcategories,
    scopedSubcategoryNames,
  ]);
  const selectedScopedSubcategory =
    filters.subcategory &&
    filters.subcategory !== 'All' &&
    scopedSubcategoryNames.has(normalizeCategoryText(filters.subcategory))
      ? filters.subcategory
      : '';

  if (hideChromeOnHub) {
    return null;
  }

  return (
    <>
      {/* Top Navbar and overlays remain as is */}
      {showFullNavbar ? (
        // Full Navbar
        <nav ref={topNavRef} className="mhub-top-nav mhub-top-nav--primary sticky top-0 z-[120] transition-all duration-300" role="navigation" aria-label={t('main_navigation')}>
          <div className="mx-auto flex w-full max-w-[92rem] items-center gap-3 px-3 py-2 md:px-4 md:py-3 lg:gap-4">
            {/* Logo and Location */}
            <div className="flex shrink-0 items-center gap-2.5 lg:gap-3">
              <Link
                to="/"
                className="mhub-nav-pill flex items-center gap-2 rounded-full px-2.5 py-1.5 transition-colors"
                aria-label="Home"
              >
                <span className="mhub-nav-logo-chip rounded-xl p-2">
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
                <span className="hidden text-lg font-bold tracking-tight sm:block">
                  {t('home')}
                </span>
              </Link>

              {/* Location quick action - click to refresh GPS — shows visible location name */}
              <div className="relative group">
                <button
                  type="button"
                  onClick={() => { if (forceRefreshLocation && !locationLoading) forceRefreshLocation().catch(() => {}); }}
                  className={`mhub-nav-pill relative inline-flex h-10 max-w-[180px] sm:max-w-[220px] cursor-pointer select-none items-center gap-1.5 rounded-full border px-2.5 transition-all active:scale-[0.97] ${
                    locationLoading ? 'border-yellow-400/40 bg-yellow-500/20' :
                    isIpFallback ? 'border-orange-400/40 bg-orange-500/15' :
                    accuracyTier === 'precise' || accuracyTier === 'good' ? 'border-green-400/40 bg-green-500/15' :
                    ''
                  }`}
                  aria-label={`${t('location', { defaultValue: 'Location' })}: ${resolvedLocationLabel}. ${t('tap_to_refresh', { defaultValue: 'Tap to refresh' })}`}
                  title={`${resolvedLocationLabel} - ${t('tap_to_refresh', { defaultValue: 'Tap to refresh GPS' })}`}
                >
                  <FiMapPin className={`w-4 h-4 shrink-0 ${locationLoading ? 'animate-pulse' : ''}`} />
                  <span className="truncate text-xs font-medium leading-tight">
                    {shortLocationLabel}
                  </span>
                  {(accuracyTier === 'precise' || accuracyTier === 'good') && !locationLoading && (
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border border-white/50" />
                  )}
                  {isIpFallback && !locationLoading && (
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-orange-400 rounded-full border border-white/50" />
                  )}
                </button>
                <span className="absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-3 py-1.5 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 pointer-events-none z-50">
                  <span className="block font-medium">{resolvedLocationLabel}</span>
                  <span className="block text-white/60 text-[10px] mt-0.5">
                    {locationLoading ? (t('detecting', { defaultValue: 'Detecting...' })) :
                     isIpFallback ? (t('approximate_ip', { defaultValue: 'Approximate (IP)' })) :
                     accuracyTier === 'precise' ? (t('precise_gps', { defaultValue: 'Precise GPS' })) :
                     accuracyTier === 'good' ? (t('good_gps', { defaultValue: 'Good GPS' })) :
                     (t('tap_to_refresh', { defaultValue: 'Tap to refresh' }))}
                  </span>
                </span>
              </div>

              {/* Mobile layout quick toggle (visible when preview is not desktop) */}
              {layoutMode !== 'desktop' && (
                <button
                  type="button"
                  onClick={cycleLayout}
                  className="mhub-nav-action inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                  aria-label={`${t('layout', { defaultValue: 'Layout' })}: ${t(currentLayoutPreset.labelKey, { defaultValue: currentLayoutPreset.key })}`}
                  title={`${t(currentLayoutPreset.labelKey, { defaultValue: currentLayoutPreset.key })} ${t('layout', { defaultValue: 'layout' })}`}
                >
                  <CurrentLayoutIcon className="h-4 w-4" />
                  <span>{t(currentLayoutPreset.labelKey, { defaultValue: currentLayoutPreset.key })}</span>
                </button>
              )}
            </div>

            <div className="flex min-w-0 flex-1 items-center gap-2">
              {/* Search Button / Bar */}
              <div
                onClick={openSearchPage}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openSearchPage();
                  }
                }}
                className="mhub-nav-search relative flex min-w-0 flex-1 items-center gap-2 rounded-full px-4 py-2.5 transition-all cursor-pointer group"
                role="button"
                tabIndex={0}
                aria-label={t('search', { defaultValue: 'Search' })}
              >
                <FiSearch className="w-5 h-5 text-[color:var(--icon-color-muted)]" />
                <span className={`flex-1 truncate text-sm ${filters.search ? 'text-[color:var(--text-primary)]' : 'mhub-nav-search-placeholder'}`}>
                  {navbarSearchLabel}
                </span>

                {/* Clear Search Button */}
                {filters.search && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const newParams = new URLSearchParams(routerLocation.search);
                      newParams.delete('search');
                      navigate({ pathname: routerLocation.pathname, search: newParams.toString() });
                      setFilters(prev => ({ ...prev, search: '' }));
                    }}
                    className="z-10 rounded-full p-1 text-[color:var(--text-faint)] transition-colors hover:bg-[var(--hover)] hover:text-[color:var(--text-primary)]"
                    aria-label="Clear search"
                    title="Clear search"
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Filter Button */}
              {!hideFilterOnGate && (
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowFilter(true)}
                    className={`mhub-nav-action inline-flex h-11 items-center gap-2 rounded-full px-3.5 text-sm font-semibold backdrop-blur-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${hasActiveFilters ? 'ring-2 ring-[color:var(--primary)] shadow-md' : ''}`}
                    aria-label={`${t('filter', { defaultValue: 'Filter' })}${hasActiveFilters ? ` (${activeFilterCount})` : ''}`}
                  >
                    <FiFilter className="h-4 w-4" />
                    <span className="hidden lg:inline">{t('filter', { defaultValue: 'Filter' })}</span>
                    {hasActiveFilters && (
                      <span className="inline-flex items-center justify-center h-5 min-w-[20px] rounded-full bg-[var(--primary)] text-white text-[10px] font-bold px-1.5">
                        {activeFilterCount}
                      </span>
                    )}
                  </button>
                </div>
              )}
              {!hideFilterOnGate && showFilter && typeof document !== 'undefined'
                ? createPortal(
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black bg-opacity-40">
                      <div className="mhub-premium-surface rounded-2xl shadow-2xl border p-6 w-full max-w-sm mx-2 flex flex-col gap-3 relative animate-fadeIn">
                        <button className="absolute top-3 right-3 text-gray-400 hover:text-blue-600 dark:hover:text-yellow-400" onClick={() => setShowFilter(false)} aria-label={t('close', { defaultValue: 'Close filter' })}>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <h4 className="font-semibold text-blue-600 dark:text-yellow-300 mb-2">{t('filter_products', { defaultValue: 'Filter Products' })}</h4>
                        <div className="mb-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('location')}</label>
                          <select
                            className="mhub-input w-full px-2 py-1.5 text-sm"
                            value={filters.location || ''}
                            onChange={e => setFilters(f => ({ ...f, location: e.target.value, page: 1 }))}
                          >
                            <option value="">{t('any_location', { defaultValue: 'Any Location' })}</option>
                            <option value="Delhi">Delhi</option>
                            <option value="Mumbai">Mumbai</option>
                            <option value="Bangalore">Bangalore</option>
                            <option value="Chennai">Chennai</option>
                            <option value="Kolkata">Kolkata</option>
                            <option value="Hyderabad">Hyderabad</option>
                          </select>
                        </div>
                        <div className="mb-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('price_range', { defaultValue: 'Price Range' })}</label>
                          <div className="flex gap-2 items-center">
                            <div className="flex-1">
                              <input
                                type="number"
                                min="0"
                                placeholder={t('min_price_placeholder')}
                                className="mhub-input w-full px-2 py-1.5 text-sm"
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
                                className="mhub-input w-full px-2 py-1.5 text-sm"
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
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('date_range', { defaultValue: 'Date Range' })}</label>
                          {/* Quick Date Presets Dropdown */}
                          <select
                            className="mhub-input w-full px-2 py-1.5 text-sm mb-2"
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
                          <div className="flex gap-2 items-center">
                            <div className="flex-1">
                              <input
                                type="date"
                                className="mhub-input w-full px-2 py-1.5 text-sm"
                                value={filters.startDate || ''}
                                onChange={(e) => setFilters(f => ({ ...f, startDate: e.target.value, page: 1 }))}
                              />
                            </div>
                            <span className="text-gray-400">to</span>
                            <div className="flex-1">
                              <input
                                type="date"
                                className="mhub-input w-full px-2 py-1.5 text-sm"
                                value={filters.endDate || ''}
                                onChange={(e) => setFilters(f => ({ ...f, endDate: e.target.value, page: 1 }))}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="mb-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('condition', { defaultValue: 'Condition' })}</label>
                          <div className="flex flex-wrap gap-2">
                            {['', 'new', 'like_new', 'good', 'fair'].map((cond) => (
                              <button
                                key={cond}
                                type="button"
                                onClick={() => setFilters(f => ({ ...f, condition: cond, page: 1 }))}
                                className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                                  (filters.condition || '') === cond
                                    ? 'bg-blue-600 text-white border-blue-600 dark:bg-yellow-400 dark:text-gray-900 dark:border-yellow-400'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-gray-600'
                                }`}
                              >
                                {cond === '' ? (t('any', { defaultValue: 'Any' })) :
                                 cond === 'new' ? (t('condition_new', { defaultValue: 'New' })) :
                                 cond === 'like_new' ? (t('condition_like_new', { defaultValue: 'Like New' })) :
                                 cond === 'good' ? (t('condition_good', { defaultValue: 'Good' })) :
                                 (t('condition_fair', { defaultValue: 'Fair' }))}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* F-04: Verified sellers only */}
                        <div className="mb-2 flex items-center gap-3">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={!!filters.verifiedOnly}
                            onClick={() => setFilters(f => ({ ...f, verifiedOnly: !f.verifiedOnly, page: 1 }))}
                            className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${filters.verifiedOnly ? 'bg-blue-600 dark:bg-yellow-400' : 'bg-gray-300 dark:bg-gray-600'}`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${filters.verifiedOnly ? 'translate-x-5' : 'translate-x-0.5'}`} />
                          </button>
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 select-none cursor-pointer" onClick={() => setFilters(f => ({ ...f, verifiedOnly: !f.verifiedOnly, page: 1 }))}>
                            <FiUserCheck className="inline w-3.5 h-3.5 mr-1 text-blue-600 dark:text-yellow-400" />
                            {t('verified_sellers_only', { defaultValue: 'Verified sellers only' })}
                          </label>
                        </div>

                        <div className="mb-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('sort_by')}</label>
                          <select className="mhub-input w-full px-2 py-1.5 text-sm" value={filters.sortBy || ''} onChange={e => setFilters(f => ({ ...f, sortBy: e.target.value, page: 1 }))}>
                            <option value="">{t('default', { defaultValue: 'Default' })}</option>
                            <option value="price_asc">{t('price_low_high', { defaultValue: 'Price: Low to High' })}</option>
                            <option value="price_desc">{t('price_high_low', { defaultValue: 'Price: High to Low' })}</option>
                            <option value="date_desc">{t('newest_first', { defaultValue: 'Newest First' })}</option>
                            <option value="date_asc">{t('oldest_first', { defaultValue: 'Oldest First' })}</option>
                            {permissionGranted && <option value="distance">{t('sort_by_distance', { defaultValue: 'Nearest First' })}</option>}
                          </select>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <button
                            className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
                            onClick={() => {
                              setShowFilter(false);

                              // Sync preferences to DB if on For You page and logged in
                              const loggedIn = isAuthenticated(user);
                              const userId = getUserId(user);

                              if (normalizedPath === '/for-you' && loggedIn && userId) {
                                const subcategoriesPayload =
                                  selectedScopedSubcategory
                                    ? [selectedScopedSubcategory]
                                    : [];

                                if (subcategoriesPayload.length > 0) {
                                  api.post('/profile/preferences/update', {
                                      userId,
                                      location: filters.location,
                                      minPrice: filters.minPrice,
                                      maxPrice: filters.maxPrice,
                                      subcategories: subcategoriesPayload
                                    })
                                  .then(() => {
                                      clearUserPreferencesCache(userId);
                                      setUserPreferences((prev) => ({
                                        ...(prev || {}),
                                        location: filters.location || "",
                                        minPrice: filters.minPrice ?? "",
                                        maxPrice: filters.maxPrice ?? "",
                                        subcategories: subcategoriesPayload,
                                      }));
                                      toast({ title: t('preferences_updated', { defaultValue: 'Preferences Updated' }), description: t('for_you_synced', { defaultValue: 'Your For You feed preferences have been saved.' }) });
                                  })
                                  .catch(err => {
                                    if (import.meta.env.DEV) {
                                      console.error("Failed to sync preferences", err);
                                    }
                                  });
                                }
                              }

                              // If on For You page, navigate with filters as URL params
                              if (normalizedPath === '/for-you') {
                                const params = new URLSearchParams();
                                if (selectedScopedSubcategory) {
                                  const normalized = String(selectedScopedSubcategory).trim().toLowerCase();
                                  const match = scopedSubcategories.find((sub) => {
                                    const id = String(sub.subcategory_id || sub.id || '').trim().toLowerCase();
                                    const name = String(sub.name || sub.title || '').trim().toLowerCase();
                                    return id === normalized || name === normalized;
                                  });
                                  const parentCategoryId = match?.category_id || null;
                                  const subcategoryId = match?.subcategory_id || match?.id || null;
                                  if (parentCategoryId) {
                                    params.set('category_id', String(parentCategoryId));
                                  }
                                  if (subcategoryId) {
                                    params.set('subcategory_id', String(subcategoryId));
                                  } else {
                                    params.set('subcategory', selectedScopedSubcategory);
                                  }
                                }
                                if (filters.minPrice) params.set('minPrice', filters.minPrice);
                                if (filters.maxPrice) params.set('maxPrice', filters.maxPrice);
                                if (filters.location) params.set('location', filters.location);
                                const queryString = params.toString();
                                navigate(`/for-you${queryString ? '?' + queryString : ''}`);
                              }
                            }}
                          >{t('apply', { defaultValue: 'Apply' })}</button>
                          <button
                            className="flex-1 bg-[var(--chip-bg)] text-gray-700 dark:text-gray-200 py-2 rounded-lg font-semibold hover:bg-[var(--surface-2)] transition"
                            onClick={() => {
                              setFilters(f => ({
                                ...f,
                                location: '',
                                minPrice: '',
                                maxPrice: '',
                                priceRange: '',
                                startDate: '',
                                endDate: '',
                                category: 'All',
                                subcategory: 'All',
                                sortBy: '',
                                condition: '',
                                verifiedOnly: false,
                                page: 1,
                              }));
                              setShowFilter(false);
                              // Clear URL params if on For You page
                              if (normalizedPath === '/for-you') {
                                navigate('/for-you');
                              }
                            }}
                          >{t('reset', { defaultValue: 'Clear' })}</button>
                        </div>
                      </div>
                    </div>,
                    document.body,
                  )
                : null}
            </div>

            {/* Icons */}
            <div className="flex shrink-0 items-center gap-2 lg:gap-2.5">
              {/* Add Post Button - Only show for logged-in users */}
              {isLoggedIn && (
                <Link to="/post-welcome" aria-label="Add Post" className="relative group">
                  <span
                    className="mhub-nav-cta inline-flex h-11 w-11 items-center justify-center rounded-full text-2xl font-extrabold transition-all duration-200 hover:scale-105 hover:shadow-xl focus:ring-4 focus:ring-blue-400"
                    style={{ cursor: 'pointer', zIndex: 20 }}
                    tabIndex={0}
                    role="button"
                    aria-label="Add Post"
                  >
                    +
                  </span>
                  <span className="absolute left-1/2 top-full mt-2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded px-3 py-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-lg pointer-events-none">
                    {t('sell', { defaultValue: 'Sell' })}
                  </span>
                </Link>
              )}
              <div className="mhub-nav-pill hidden md:flex items-center gap-1 rounded-full px-1.5 py-1 backdrop-blur-sm">
                {/* Notifications Bell */}
                <Link to="/notifications" aria-label={t('notifications')} className="relative group">
                  <span className="mhub-nav-icon-btn p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors inline-flex items-center justify-center">
                    <FiBell className="w-5 h-5" />
                  </span>
                  {isLoggedIn && Number(unreadCount) > 0 && (
                    <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center shadow-sm">
                      {Number(unreadCount) > 99 ? '99+' : Number(unreadCount)}
                    </span>
                  )}
                  <span className="absolute left-1/2 top-full mt-2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded px-3 py-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-lg pointer-events-none">
                    {t('notifications')}
                  </span>
                </Link>
                {/* Wishlist Bookmark */}
                <Link to="/wishlist" aria-label={t('wishlist', { defaultValue: 'Wishlist' })} className="relative group">
                  <span className="mhub-nav-icon-btn p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors inline-flex items-center justify-center">
                    <FiBookmark className="w-5 h-5" />
                  </span>
                  {isLoggedIn && wishlistCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-pink-500 text-white text-[10px] font-bold rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center shadow-sm">
                      {wishlistCount > 99 ? '99+' : wishlistCount}
                    </span>
                  )}
                  <span className="absolute left-1/2 top-full mt-2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded px-3 py-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-lg pointer-events-none">
                    {t('wishlist', { defaultValue: 'Wishlist' })}
                  </span>
                </Link>
                {/* Cart */}
                <div className="relative group">
                  <Link to="/cart" aria-label={t('cart', { defaultValue: 'Cart' })} className="relative">
                    <span className="mhub-nav-icon-btn p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors inline-flex items-center justify-center">
                      <FiShoppingCart className="w-5 h-5" />
                    </span>
                    {isLoggedIn && Number(categoryFilteredCartCount) > 0 && (
                      <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center shadow-sm">
                        {Number(categoryFilteredCartCount) > 99 ? "99+" : Number(categoryFilteredCartCount)}
                      </span>
                    )}
                  </Link>
                  <span className="absolute left-1/2 top-full mt-2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded px-3 py-1 opacity-0 group-focus-within:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-lg pointer-events-none">
                    {t('cart', { defaultValue: 'Cart' })}
                  </span>
                  <MiniCartPopover />
                </div>
                {/* Recently Viewed Clock */}
                <Link to="/recently-viewed" aria-label={t('recently_viewed', { defaultValue: 'Recently Viewed' })} className="relative group">
                  <span className="mhub-nav-icon-btn p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors inline-flex items-center justify-center">
                    <FiClock className="w-5 h-5" />
                  </span>
                  <span className="absolute left-1/2 top-full mt-2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded px-3 py-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-lg pointer-events-none">
                    {t('recently_viewed', { defaultValue: 'Recently Viewed' })}
                  </span>
                </Link>
              </div>
              {/* Language Selector */}
              <div>
                <LanguageSelector compact />
              </div>
              {/* Theme Toggle */}
              <div
                className="mhub-theme-toggle"
                role="radiogroup"
                aria-label={t('theme_mode', { defaultValue: 'Theme mode' })}
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={themeMode === 'light'}
                  data-active={themeMode === 'light'}
                  onClick={() => setThemeMode('light')}
                  className="mhub-theme-toggle-btn"
                  title={t('light_mode', { defaultValue: 'Light mode' })}
                >
                  <span className="mhub-theme-toggle-icon">
                    <FiSun className="h-4 w-4" />
                  </span>
                  <span className="hidden sm:inline">{t('light_mode', { defaultValue: 'Light' })}</span>
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={themeMode === 'system'}
                  data-active={themeMode === 'system'}
                  onClick={() => setThemeMode('system')}
                  className="mhub-theme-toggle-btn"
                  title={t('system', { defaultValue: 'System' })}
                >
                  <span className="mhub-theme-toggle-icon">
                    <FiMonitor className="h-4 w-4" />
                  </span>
                  <span className="hidden sm:inline">{t('system', { defaultValue: 'System' })}</span>
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={themeMode === 'dark'}
                  data-active={themeMode === 'dark'}
                  onClick={() => setThemeMode('dark')}
                  className="mhub-theme-toggle-btn"
                  title={t('dark_mode', { defaultValue: 'Dark mode' })}
                >
                  <span className="mhub-theme-toggle-icon">
                    <FiMoon className="h-4 w-4" />
                  </span>
                  <span className="hidden sm:inline">{t('dark_mode', { defaultValue: 'Dark' })}</span>
                </button>
              </div>

              {/* Layout Toggle (Desktop/Mobile/Tablet) — dev only */}
              {import.meta.env.DEV && (
              <div ref={layoutMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setIsLayoutMenuOpen((value) => !value)}
                  aria-expanded={isLayoutMenuOpen}
                  aria-haspopup="menu"
                  className="mhub-nav-action inline-flex h-10 items-center gap-2 rounded-full px-3 text-xs font-semibold"
                  aria-label={`${t(currentLayoutPreset.labelKey, { defaultValue: currentLayoutPreset.key })} ${t('layout', { defaultValue: 'layout' })}`}
                  title={`${t(currentLayoutPreset.labelKey, { defaultValue: currentLayoutPreset.key })} ${t('layout', { defaultValue: 'layout' })}`}
                >
                  <CurrentLayoutIcon className="h-4 w-4" />
                  <span className="hidden xl:inline">
                    {t(currentLayoutPreset.labelKey, { defaultValue: currentLayoutPreset.key })}
                  </span>
                </button>

                {isLayoutMenuOpen && typeof document !== 'undefined' && layoutMenuStyle
                  ? createPortal(
                      <div
                        ref={layoutMenuPanelRef}
                        style={{
                          top: `${layoutMenuStyle.top}px`,
                          right: `${layoutMenuStyle.right}px`,
                          minWidth: `${layoutMenuStyle.minWidth}px`,
                        }}
                        className="mhub-layout-menu fixed z-[1000] w-44 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl"
                      >
                        {LAYOUT_PRESETS.map((preset) => {
                          const Icon = preset.icon;
                          const active = preset.key === layoutMode;
                          return (
                            <button
                              key={preset.key}
                              type="button"
                              onClick={() => handleLayoutModeChange(preset.key)}
                              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                                active
                                  ? 'bg-blue-50 dark:bg-blue-900/30 font-semibold text-blue-700 dark:text-blue-300'
                                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                              }`}
                            >
                              <Icon className="h-4 w-4" />
                              <span className="flex flex-1 flex-col">
                                <span>{t(preset.labelKey, { defaultValue: preset.key })}</span>
                                <span className="text-[11px] font-normal text-slate-500">
                                  {preset.width} x {preset.height}
                                </span>
                              </span>
                              {active ? <FiCheck className="h-4 w-4" /> : null}
                            </button>
                          );
                        })}
                      </div>,
                      document.body,
                    )
                  : null}
              </div>
              )}
            </div>
          </div>
        </nav >
      ) : (
        // Blank blue ribbon for other pages
        hideTopRibbon ? null : <div ref={topRibbonRef} className="h-14 w-full mhub-top-ribbon" />
      )}

      {/* More Menu Fullscreen Overlay */}
      {
        moreOpen && (
          <div className="mhub-more-overlay fixed inset-0 z-[1000]">
            <div
              className="mhub-more-overlay-bg absolute inset-0 bg-black/30 backdrop-blur-sm"
              onClick={closeMoreMenu}
              aria-hidden="true"
            />
            {/* Right-side vertical sliding pane, with improved highlight and shadow */}
            <div
              className="mhub-more-panel absolute top-0 right-0 z-[1010] h-full w-80 max-w-full overflow-y-auto mhub-premium-surface p-8 pb-24 shadow-2xl ring-4 ring-blue-400 ring-opacity-80 animate-slideInRight dark:ring-yellow-400"
              style={{ transition: 'transform 0.3s' }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label={t('more_options', { defaultValue: 'More options' })}
            >
              <button
                type="button"
                className="mhub-more-close absolute top-3 right-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-slate-100 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:hover:bg-gray-700 dark:hover:text-yellow-400"
                aria-label={t('close', { defaultValue: 'Close' })}
                onMouseDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  closeMoreMenu();
                }}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  closeMoreMenu();
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              <h2 className="text-2xl font-bold text-blue-600 dark:text-yellow-300 mb-4 drop-shadow-lg">{t('more_options')}</h2>
              {(() => {
                const restrictedKeys = ['sell', 'centre', 'chat', 'verification', 'feedback', 'complaints', 'dashboard', 'admin_panel'];
                const groupLabels = { trade: t('trade', { defaultValue: 'Trade' }), social: t('social', { defaultValue: 'Social' }), account: t('account', { defaultValue: 'Account' }) };
                const filtered = moreMenuLinks.filter(link => {
                  if (isLoggedIn && (link.key === 'login' || link.key === 'signup')) return false;
                  return true;
                });
                let lastGroup = null;
                return filtered.map(link => {
                  const isRestricted = !isLoggedIn && restrictedKeys.includes(link.key);
                  const LinkIcon = link.icon;
                  const showGroupHeader = link.group !== lastGroup;
                  lastGroup = link.group;
                  return (
                    <React.Fragment key={link.key}>
                      {showGroupHeader && (
                        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 px-2 pt-2 pb-1 mt-1">
                          {groupLabels[link.group] || link.group}
                        </p>
                      )}
                      <Link
                        to={isRestricted ? '#' : link.path}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg text-blue-700 dark:text-yellow-200 hover:bg-blue-100 dark:hover:bg-gray-700 font-semibold text-base shadow transition-all duration-150 ${isRestricted ? 'opacity-50 cursor-not-allowed bg-[var(--chip-bg)]' : ''}`}
                        onClick={(e) => {
                          if (isRestricted) {
                            e.preventDefault();
                            e.stopPropagation();
                            toast({
                              description: t('login_required', { defaultValue: 'Please login to access this feature' }),
                              variant: "destructive",
                            });
                          } else {
                            closeMoreMenu();
                          }
                        }}
                        tabIndex={0}
                      >
                        {isRestricted
                          ? <FiLock className="w-4 h-4 text-gray-400 shrink-0" />
                          : LinkIcon && <LinkIcon className="w-4 h-4 shrink-0" />}
                        {link.label || t(link.key)}
                      </Link>
                    </React.Fragment>
                  );
                });
              })()}
              {isLoggedIn && (
                <button
                  className="block w-full px-4 py-3 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 font-semibold text-center text-base shadow transition-colors duration-150"
                  onClick={handleLogout}
                >
                  {t('logout', { defaultValue: 'Logout' })}
                </button>
              )}
              {/* Accessibility: Font Size Toggle */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-2">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 text-center">♿ {t('accessibility', { defaultValue: 'Accessibility' })}</p>
                <button
                  className={`block w-full px-4 py-3 rounded-lg font-semibold text-center text-base shadow transition-all duration-150 ${largeFont ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                  onClick={() => setLargeFont(!largeFont)}
                  title={largeFont ? "Switch to normal font size" : "Increase font size for easier reading"}
                >
                  {largeFont ? (t('normal_size', { defaultValue: '🔤 Normal Size' })) : (t('larger_text', { defaultValue: '🔠 Larger Text' }))}
                  <span className="block text-xs font-normal opacity-75 mt-1">
                    {largeFont ? (t('using_large_fonts', { defaultValue: 'Currently using large fonts' })) : (t('easier_to_read', { defaultValue: 'Easier to read for everyone' }))}
                  </span>
                </button>
              </div>
              <button className="mt-4 px-4 py-2 bg-blue-600 dark:bg-yellow-400 text-white dark:text-gray-900 rounded-lg font-semibold hover:bg-blue-700 dark:hover:bg-yellow-500 shadow transition-colors duration-150" onClick={closeMoreMenu}>{t('close')}</button>
            </div>
          </div>
        )
      }

      {/* --- Bottom Navbar: hidden on auth-only pages --- */}
      {!isAuthPage && <nav className="mhub-bottom-nav bottom-nav fixed bottom-0 left-0 right-0 z-[120] flex justify-between items-center px-2 py-1 animate-fadeIn" role="navigation" aria-label={t('bottom_navigation')}>
        {/* Left nav links */}
        <div className="flex flex-1 justify-evenly">
          {bottomNavLeftLinks.map((link) => {
            const isActive = isBottomNavLinkActive(link);

            return (
            <button
              key={link.key}
              {...navButtonProps(t(link.key))}
              aria-current={isActive ? 'page' : undefined}
              onClick={link.key === 'more' ? (e) => { e.preventDefault(); setMoreOpen((open) => !open); } : () => navigate(link.path)}
              style={{ background: 'none', border: 'none', outline: 'none' }}
              className={`mhub-bottom-nav-button flex flex-col items-center justify-center min-w-[48px] min-h-[48px] p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isActive ? 'is-active' : ''}`}
            >
              <span className={`mhub-bottom-nav-icon ${isActive ? 'is-active' : ''}`}>
                {link.icon}
              </span>
              <span className={`mhub-bottom-nav-label ${isActive ? 'is-active' : ''}`} style={{ fontSize: '0.85rem', position: 'relative' }}>
                {t(link.key)}
              </span>
              {isActive && <span className="mhub-bottom-nav-indicator" />}
            </button>
            );
          })}
        </div>
        {/* Center + (Sell) icon - Only show for logged-in users */}
        {isLoggedIn && (
          <div className="flex-none">
            <button
              aria-label={t('sell', { defaultValue: 'Sell' })}
              className="mhub-fab relative group inline-flex items-center justify-center rounded-full w-12 h-12 text-3xl font-extrabold transition-all duration-200 -translate-y-4"
              onClick={() => navigate('/post-welcome')}
              style={{ zIndex: 100 }}
            >
              +
              <span className="absolute left-1/2 top-full mt-2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded px-3 py-1 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-lg pointer-events-none">
                {t('sell', { defaultValue: 'Add Post' })}
              </span>
            </button>
          </div>
        )}
        {/* Right nav links */}
        <div className="flex flex-1 justify-evenly">
          {bottomNavRightLinks.map((link) => {
            const isActive = isBottomNavLinkActive(link);

            return (
            <button
              key={link.key}
              {...navButtonProps(t(link.key))}
              aria-current={isActive ? 'page' : undefined}
              onClick={link.key === 'more' ? (e) => { e.preventDefault(); setMoreOpen((open) => !open); } : () => navigate(link.path)}
              style={{ background: 'none', border: 'none', outline: 'none' }}
              className={`mhub-bottom-nav-button flex flex-col items-center justify-center min-w-[48px] min-h-[48px] p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isActive ? 'is-active' : ''}`}
            >
              <span className={`mhub-bottom-nav-icon ${isActive ? 'is-active' : ''}`}>
                {link.icon}
              </span>
              <span className={`mhub-bottom-nav-label ${isActive ? 'is-active' : ''}`} style={{ fontSize: '0.85rem', position: 'relative' }}>
                {t(link.key)}
              </span>
              {isActive && <span className="mhub-bottom-nav-indicator" />}
            </button>
            );
          })}
        </div>
      </nav>}
    </>
  );
};

export default GreenNavbar;


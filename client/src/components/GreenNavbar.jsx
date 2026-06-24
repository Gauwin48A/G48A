import React, { useState, useEffect, useMemo, useRef, useCallback, useLayoutEffect, startTransition } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation as useRouterLocation, useNavigate } from 'react-router-dom';
import { FiUser, FiMenu, FiSearch, FiFilter, FiGrid, FiUserCheck, FiMapPin, FiBell, FiSave, FiClock, FiFileText, FiMessageCircle, FiNavigation, FiLock, FiStar, FiX, FiMonitor, FiSmartphone, FiTablet, FiCheck, FiShoppingCart } from 'react-icons/fi';
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
import { getUserId, isAuthenticated } from '@/utils/authStorage';
import { buildActiveAppMatcher, normalizeCategoryText } from '@/utils/categoryModeFilters';
import MiniCartPopover from '@/components/MiniCartPopover';
import AllPostsEnhancements from '@/components/AllPostsEnhancements';
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
const LAYOUT_USER_KEY = 'mhub_layout_preview_user';
const LAYOUT_SESSION_KEY = 'mhub_layout_preview_session';
const LAYOUT_PRESETS = [
  { key: 'mobile', labelKey: 'mobile', icon: FiSmartphone, width: 390, height: 844 },
  { key: 'tablet', labelKey: 'tablet', icon: FiTablet, width: 834, height: 1112 },
  { key: 'desktop', labelKey: 'desktop', icon: FiMonitor, width: 1366, height: 900 },
];

const isAndroidReplicaWebView = () => {
  if (typeof navigator === 'undefined') return false;
  const ua = String(navigator.userAgent || '').toLowerCase();
  return ua.includes('mhubandroidwebreplica') || (ua.includes('android') && /\bwv\b/.test(ua));
};

const AUTH_ONLY_PATHS = new Set(['/login', '/signup', '/forgot-password', '/reset-password']);
const ADMIN_ACCESS_ROLES = new Set([
  'admin',
  'superadmin',
  'super_admin',
  'moderator',
  'risk',
  'ops',
]);

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

  const moreMenuLinks = [
    { key: 'sell', path: '/post-welcome', icon: FiShoppingCart, group: 'trade', requiresAuth: true },
    { key: 'plans', path: '/tier-selection', icon: FiStar, group: 'trade', requiresAuth: true, labelKey: 'select_plan' },
    { key: 'centre', path: '/centre', icon: FiUser, group: 'trade', requiresAuth: true, labelKey: 'centre_page' },
    { key: 'category_hub', path: '/category-hub', icon: FiGrid, group: 'trade', labelKey: 'all_categories' },
    { key: 'category_mode', path: '/category-mode', icon: FiNavigation, group: 'trade', labelKey: 'category_mode' },
    { key: 'subcategories', path: '/subcategories', icon: FiGrid, group: 'trade' },
    { key: 'nearby', path: '/nearby', icon: FiMapPin, group: 'trade' },
    { key: 'saved_searches', path: '/saved-searches', icon: FiSearch, group: 'trade', requiresAuth: true },
    { key: 'wishlist', path: '/wishlist', icon: FiSave, group: 'trade', requiresAuth: true },
    { key: 'recently_viewed', path: '/recently-viewed', icon: FiClock, group: 'trade' },
    { key: 'cart', path: '/cart', icon: FiShoppingCart, group: 'trade', requiresAuth: true },
    { key: 'compare', path: '/compare', icon: FiCheck, group: 'trade' },
    { key: 'feed', path: '/feed', icon: FiFileText, group: 'social' },
    { key: 'public_wall', path: '/public-wall', icon: FiBell, group: 'social', labelKey: 'public_wall_title' },
    { key: 'chat', path: '/chat', icon: FiMessageCircle, group: 'social', requiresAuth: true },
    { key: 'my_reviews', path: '/reviews', icon: FiStar, group: 'social', requiresAuth: true, requiresUserId: true },
    { key: 'my_offers', path: '/offers', icon: FiShoppingCart, group: 'social', requiresAuth: true },
    { key: 'feedback', path: '/feedback', icon: FiStar, group: 'social' },
    { key: 'complaints', path: '/complaints', icon: FiFileText, group: 'social' },
    { key: 'profile', path: '/profile', icon: FiUser, group: 'account', requiresAuth: true },
    { key: 'wallet', path: '/wallet', icon: FiStar, group: 'account', requiresAuth: true },
    { key: 'price_alerts', path: '/price-alerts', icon: FiBell, group: 'account', requiresAuth: true },
    { key: 'rewards', path: '/rewards', icon: FiUserCheck, group: 'account', requiresAuth: true },
    { key: 'notifications', path: '/notifications', icon: FiBell, group: 'account', requiresAuth: true },
    { key: 'verification', path: '/verification', icon: FiUserCheck, group: 'account', requiresAuth: true },
    { key: 'dashboard', path: '/dashboard', icon: FiMonitor, group: 'account', requiresAuth: true },
    { key: 'security', path: '/security', icon: FiLock, group: 'account', requiresAuth: true },
    { key: 'account_delete', path: '/account/delete', icon: FiX, group: 'account', requiresAuth: true, labelKey: 'delete_account' },
    { key: 'admin_panel', path: '/admin-panel', icon: FiLock, group: 'account', requiresAuth: true, adminOnly: true },
  ];

  const bottomNavLinks = [
    { key: 'all_posts', path: '/all-posts', icon: <FiSearch />, matchPaths: ['/all-posts', '/listings', '/search', '/nearby'] },
    { key: 'feed', path: '/feed', icon: <FiFileText />, matchPaths: ['/feed', '/my-feed', '/public-wall'] },
    { key: 'for_you', path: '/for-you', icon: <FiStar />, matchPaths: ['/for-you'] },
    { key: 'rewards', path: '/rewards', icon: <FiUserCheck />, matchPaths: ['/rewards'] },
    { key: 'profile', path: '/profile', icon: <FiUser />, matchPaths: ['/profile', '/notifications', '/dashboard'] },
    { key: 'more', path: '#', icon: <FiMenu />, matchPaths: [] },
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
  const { mode: themeMode, setThemeMode } = useTheme();
  const isNativePlatform =
    typeof window !== 'undefined' &&
    (window.Capacitor?.isNativePlatform?.() || isAndroidReplicaWebView());
  const [layoutMode, setLayoutMode] = useState(() => {
    if (isNativePlatform) return 'mobile';
    const stored = String(localStorage.getItem(LAYOUT_STORAGE_KEY) || '').trim().toLowerCase();
    return LAYOUT_PRESETS.some((preset) => preset.key === stored) ? stored : 'desktop';
  });
  // Large font mode for accessibility
  const [largeFont, setLargeFont] = useState(() => {
    const stored = localStorage.getItem('largeFont');
    return parseStoredBoolean(stored, false);
  });

  // Dark mode is now managed by ThemeContext

  const hasLayoutUserOverride = () => {
    try {
      return (
        localStorage.getItem(LAYOUT_USER_KEY) === '1' ||
        sessionStorage.getItem(LAYOUT_SESSION_KEY) === '1'
      );
    } catch {
      return false;
    }
  };

  const markLayoutUserOverride = () => {
    try {
      localStorage.setItem(LAYOUT_USER_KEY, '1');
      sessionStorage.setItem(LAYOUT_SESSION_KEY, '1');
    } catch {}
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (layoutMode !== 'desktop' && window.innerWidth >= 1100 && !hasLayoutUserOverride()) {
      setLayoutMode('desktop');
      return;
    }
    document.documentElement.setAttribute('data-layout-preview', layoutMode);
    document.body?.setAttribute('data-layout-preview', layoutMode);
    localStorage.setItem(LAYOUT_STORAGE_KEY, layoutMode);
  }, [layoutMode]);

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
    return () => {
      // Cleanup on unmount to prevent stale body styles
      document.body.classList.remove('text-lg');
      document.body.style.fontSize = '';
    };
  }, [largeFont]);

  // Check if user is logged in
  const isLoggedIn = useMemo(() => isAuthenticated(user), [user]);
  const hasAdminPanelAccess = useMemo(() => {
    const role = String(user?.role || user?.userRole || user?.user_type || '')
      .trim()
      .toLowerCase();
    return role ? ADMIN_ACCESS_ROLES.has(role) : false;
  }, [user]);

  // Notification unread count badge
  const { data: rawUnreadCount = 0 } = useUnreadCount({ enabled: isLoggedIn, refetchInterval: 60000 });
  const unreadCount = isLoggedIn ? rawUnreadCount : 0;

  // Wishlist count badge - subscribe to savedPosts events so badge updates immediately
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
      localStorage.removeItem('authSession');
      navigate('/login', { replace: true });
    }
  };

  const closeMoreMenu = () => {
    setMoreOpen(false);
  };

  const handleOpenProtected = (path) => {
    toast({
      title: t('login_required_title', { defaultValue: 'Login required' }),
      description: t('please_login_continue', { defaultValue: 'Please login to continue.' }),
      variant: 'destructive',
    });
    closeMoreMenu();
    navigate('/login', { state: { returnTo: path } });
  };

  const handleMoreMenuItemClick = (item) => {
    if (!item?.path) return;

    if (item.requiresAuth && !isLoggedIn) {
      handleOpenProtected(item.path);
      return;
    }

    if (item.adminOnly && !hasAdminPanelAccess) {
      toast({
        title: t('admin_access_required', { defaultValue: 'Admin access required' }),
        description: t('no_admin_permission', {
          defaultValue: 'You do not have permission to open Admin Panel.',
        }),
        variant: 'destructive',
      });
      closeMoreMenu();
      return;
    }

    if (item.requiresUserId) {
      const resolvedUserId =
        getUserId(user) ||
        localStorage.getItem('userId') ||
        localStorage.getItem('user_id');
      if (!resolvedUserId) {
        toast({
          title: t('unable_open_reviews', { defaultValue: 'Unable to open reviews' }),
          description: t('user_id_missing_refresh', {
            defaultValue: 'User ID is missing. Refresh your profile and try again.',
          }),
          variant: 'destructive',
        });
        closeMoreMenu();
        return;
      }
      navigate(`/reviews/${resolvedUserId}`);
      closeMoreMenu();
      return;
    }

    navigate(item.path);
    closeMoreMenu();
  };

  // User preferences for For You page filter pre-population
  // Fetch user preferences when on For You page (need routerLocation to be defined first)
  // This effect is defined after routerLocation is declared below

  const handleLayoutModeChange = (modeKey) => {
    const next = LAYOUT_PRESETS.find((preset) => preset.key === modeKey);
    if (!next) return;
    markLayoutUserOverride();
    setLayoutMode(next.key);
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
    // On Android WebView, setting overflow:hidden can trigger a spurious resize.
    // Only close the drawer on real viewport dimension changes.
    const initialWidth = window.innerWidth;
    const initialHeight = window.innerHeight;
    const handleResize = () => {
      const dw = Math.abs(window.innerWidth - initialWidth);
      const dh = Math.abs(window.innerHeight - initialHeight);
      if (dw > 50 || dh > 100) {
        setMoreOpen(false);
      }
    };

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, [moreOpen]);

  // Get location from context (for city display)
  const { city, area, village, colony, locality, displayName, locationString, loading: locationLoading, permissionGranted, accuracyTier, isIpFallback, isStaleLocation } = useLocation();


  // Router location for path detection
  useEffect(() => {
    setMoreOpen(false);
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


  // Check if currently on For You page
  const isForYouPage = normalizedPath === '/for-you';
  const hideFilterOnGate = isForYouPage && !isLoggedIn;
  const hideChromeOnHub =
    normalizedPath === '/category-mode';
  // Build the most specific area name - colony/neighbourhood > village > locality > area > city
  // Skip values that duplicate city/mandal level names (e.g. area = "Bachupally mandal" equals city)
  const bestAreaName = (() => {
    const candidates = [colony, village, locality, area, city];
    // Deduplicate: skip a candidate if it equals a less-specific one (case-insensitive, trimmed)
    const seen = new Set();
    for (const c of candidates.reverse()) {
      if (c && c.trim()) seen.add(c.trim().toLowerCase());
    }
    // Walk from most specific -> least specific, return the first that isn't also a less-specific level
    const normalize = (v) => (v || '').trim().toLowerCase().replace(/\s+(mandal|district|municipality|tehsil|taluk|block)$/i, '');
    const cityNorm = normalize(city);
    for (const c of [colony, village, locality]) {
      if (c && c.trim() && normalize(c) !== cityNorm) return c.trim();
    }
    // area might be same as city (e.g. both "Bachupally mandal") - still use it but strip mandal suffix
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

  // Build visible location label - prefer most specific area name
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
    const authed = isAuthenticated(user);

    if (isForYouPage && userId && authed) {
      const fetchPreferences = async () => {
        try {
          const data = await fetchUserPreferencesCached({ userId });
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
    normalizedPath.startsWith('/rewards') ||
    normalizedPath === '/wishlist' ||
    normalizedPath === '/cart' ||
    normalizedPath === '/notifications' ||
    normalizedPath === '/dashboard' ||
    normalizedPath === '/my-home' ||
    normalizedPath === '/complaints' ||
    normalizedPath === '/feedback' ||
    normalizedPath === '/verification' ||
    normalizedPath === '/security-settings' ||
    normalizedPath === '/recently-viewed' ||
    normalizedPath === '/saved-searches' ||
    normalizedPath === '/offers' ||
    normalizedPath === '/analytics' ||
    normalizedPath === '/bought-posts' ||
    normalizedPath === '/sold-posts' ||
    normalizedPath === '/channels' ||
    normalizedPath.startsWith('/channel/') ||
    normalizedPath.startsWith('/centre/') ||
    normalizedPath.startsWith('/post/');
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

  // Bottom nav mirrors the app roadmap: All Posts, Feed, For You, Rewards, Profile, More.
  // Track when More drawer was last opened to prevent ghost-click immediate close on Android WebView
  const moreOpenTimeRef = useRef(0);
  // Dedicated handler for More button — always opens (never toggles) to prevent double-fire closing
  const handleMoreOpen = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    // Debounce: ignore rapid taps (within 400ms)
    if (Date.now() - moreOpenTimeRef.current < 400) return;
    moreOpenTimeRef.current = Date.now();
    setMoreOpen(true);
  }, []);


  return (
    <>
      {/* Top Navbar and overlays remain as is */}
      {!hideChromeOnHub && showFullNavbar ? (
        // Full Navbar
        <nav ref={topNavRef} className="mhub-top-nav mhub-top-nav--primary sticky top-0 z-50 transition-all duration-300" role="navigation" aria-label={t('main_navigation')}>
          <div className="mhub-top-nav-main mx-auto flex w-full max-w-[640px] items-center gap-1.5 sm:gap-3 px-2 sm:px-3 py-1.5 sm:py-2 md:px-4 md:py-3 lg:gap-4">
            {/* Logo and Location */}
            <div className="mhub-top-nav-brand flex shrink-0 items-center gap-1.5 sm:gap-2.5 lg:gap-3">
              <Link
                to="/"
                className="mhub-nav-pill flex items-center gap-1.5 sm:gap-2 rounded-full px-1.5 sm:px-2.5 py-1 sm:py-1.5 transition-colors"
                aria-label="Home"
              >
                <span className="mhub-nav-logo-chip rounded-xl p-1.5 sm:p-2">
                  <svg width="22" height="22" fill="none" viewBox="0 0 24 24" style={{ minWidth: '22px' }}>
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
                <span className="hidden text-base font-bold tracking-tight md:block">
                  {t('home')}
                </span>
              </Link>

              {/* Location label - hidden on native Android (location badge shows it) and hidden on small mobile */}
              {!isNativePlatform && (
                <div className="relative group hidden sm:block">
                  <div
                    className={`mhub-nav-pill relative inline-flex h-9 max-w-[160px] sm:max-w-[180px] md:max-w-[220px] cursor-default select-none items-center gap-1.5 rounded-full border px-2 sm:px-2.5 transition-all ${
                      locationLoading ? 'border-yellow-400/40 bg-yellow-500/20' :
                      isIpFallback ? 'border-orange-400/40 bg-orange-500/15' :
                      accuracyTier === 'precise' || accuracyTier === 'good' ? 'border-green-400/40 bg-green-500/15' :
                      ''
                    }`}
                    aria-label={`${t('location', { defaultValue: 'Location' })}: ${resolvedLocationLabel}`}
                    title={resolvedLocationLabel}
                  >
                    <FiMapPin className={`w-3.5 h-3.5 shrink-0 ${locationLoading ? 'animate-pulse' : ''}`} />
                    <span className="truncate text-xs font-medium leading-tight">
                      {shortLocationLabel}
                    </span>
                    {(accuracyTier === 'precise' || accuracyTier === 'good') && !locationLoading && (
                      <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border border-white/50" />
                    )}
                    {isIpFallback && !locationLoading && (
                      <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-orange-400 rounded-full border border-white/50" />
                    )}
                  </div>
                  <span className="absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-3 py-1.5 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 pointer-events-none z-50">
                    <span className="block font-medium">{resolvedLocationLabel}</span>
                    <span className="block text-white/60 text-xs mt-0.5">
                      {locationLoading ? (t('detecting', { defaultValue: 'Detecting...' })) :
                       isIpFallback ? (t('approximate_ip', { defaultValue: 'Approximate (IP)' })) :
                       accuracyTier === 'precise' ? (t('precise_gps', { defaultValue: 'Precise GPS' })) :
                       accuracyTier === 'good' ? (t('good_gps', { defaultValue: 'Good GPS' })) :
                       (t('location', { defaultValue: 'Location' }))}
                    </span>
                  </span>
                </div>
              )}

            </div>

            <div className="mhub-top-nav-search-area flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
              {/* Search Button / Bar */}
              <div
                onClick={openSearchPage}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openSearchPage();
                  }
                }}
                className="mhub-nav-search relative flex min-w-0 flex-1 items-center gap-2 rounded-full px-3 py-3 sm:px-4 sm:py-2.5 transition-all cursor-pointer group h-[44px]"
                role="button"
                tabIndex={0}
                aria-label={t('search', { defaultValue: 'Search' })}
              >
                <FiSearch className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 text-[color:var(--icon-color-muted)]" />
                <span className={`flex-1 truncate text-xs sm:text-sm ${filters.search ? 'text-[color:var(--text-primary)]' : 'mhub-nav-search-placeholder'}`}>
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

              {/* Filter Button — Advanced Filter Panel */}
              {!hideFilterOnGate && (
                <AllPostsEnhancements
                  filters={filters}
                  setFilters={setFilters}
                  onApply={(newFilters) => {
                    // Sync preferences to DB if on For You page and logged in
                    const isForYou = normalizedPath === '/for-you';
                    const loggedIn = isAuthenticated(user);
                    const userId = getUserId(user);
                    if (isForYou && loggedIn && userId && newFilters.subcategory && newFilters.subcategory !== 'All') {
                      api.post('/profile/preferences/update', {
                        userId,
                        location: newFilters.location,
                        minPrice: newFilters.minPrice,
                        maxPrice: newFilters.maxPrice,
                        subcategories: [newFilters.subcategory],
                      })
                      .then(() => {
                        clearUserPreferencesCache(userId);
                        toast({
                          title: t('preferences_updated', { defaultValue: 'Preferences Updated' }),
                          description: t('for_you_synced', { defaultValue: 'Your For You feed preferences have been saved.' }),
                        });
                      })
                      .catch(err => {
                        if (import.meta.env.DEV) {
                          console.error("Failed to sync preferences", err);
                        }
                      });
                    }
                  }}
                />
              )}
            </div>

            {/* Icons */}
            <div className="mhub-nav-utility-cluster flex shrink-0 items-center gap-1.5 sm:gap-2 lg:gap-2.5">
              {/* Add Post Button - Only show for logged-in users; hidden on native (FAB in bottom nav handles it) */}
              {isLoggedIn && !isNativePlatform && (
                <Link to="/post-welcome" aria-label="Add Post" className="relative group hidden sm:inline-flex">
                  <span
                    className="mhub-nav-cta inline-flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full text-xl sm:text-2xl font-extrabold transition-all duration-200 hover:scale-105 hover:shadow-xl focus:ring-4 focus:ring-blue-400"
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
              {!isNativePlatform && (
              <div className="mhub-nav-pill hidden md:flex items-center gap-1 rounded-full px-1.5 py-1 backdrop-blur-sm">
                {/* Notifications Bell */}
                <Link to="/notifications" aria-label={t('notifications')} className="relative group">
                  <span className="mhub-nav-icon-btn p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors inline-flex items-center justify-center">
                    <FiBell className="w-5 h-5" />
                  </span>
                  {isLoggedIn && Number(unreadCount) > 0 && (
                    <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-xs font-bold rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center shadow-sm">
                      {Number(unreadCount) > 99 ? '99+' : Number(unreadCount)}
                    </span>
                  )}
                  <span className="absolute left-1/2 top-full mt-2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded px-3 py-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-lg pointer-events-none">
                    {t('notifications')}
                  </span>
                </Link>
                {/* Wishlist save */}
                <Link to="/wishlist" aria-label={t('wishlist', { defaultValue: 'Wishlist' })} className="relative group">
                  <span className="mhub-nav-icon-btn p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors inline-flex items-center justify-center">
                    <FiSave className="w-5 h-5" />
                  </span>
                  {isLoggedIn && wishlistCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-pink-500 text-white text-xs font-bold rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center shadow-sm">
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
                      <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-xs font-bold rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center shadow-sm">
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
              )}
            </div>
          </div>
        </nav >
      ) : !hideChromeOnHub ? (
        // Blank blue ribbon for other pages
        hideTopRibbon ? null : <div ref={topRibbonRef} className="h-14 w-full mhub-top-ribbon" />
      ) : null}

      {/* --- More Menu Drawer --- */}
      {moreOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[200]"
          role="dialog"
          aria-modal="true"
          aria-label={t('more_options', { defaultValue: 'More options' })}
          onKeyDown={(e) => { if (e.key === 'Escape') closeMoreMenu(); }}
          onTouchEnd={(e) => {
            // Prevent touch event on backdrop from closing drawer immediately after open
            if (Date.now() - moreOpenTimeRef.current < 500) { e.preventDefault(); e.stopPropagation(); return; }
          }}
          onClick={(e) => {
            // Guard against ghost click on Android WebView: ignore backdrop click
            // if the drawer was opened within the last 500ms (prevents immediate close).
            if (Date.now() - moreOpenTimeRef.current < 500) return;
            closeMoreMenu();
          }}
        >
          <div className="absolute inset-0 bg-black/35 backdrop-blur-sm" />
          <aside
            className="fixed right-0 top-0 z-[201] h-full w-[min(92vw,380px)] overflow-y-auto bg-gradient-to-b from-white via-slate-50 to-white p-6 pb-10 shadow-2xl dark:from-slate-900 dark:via-slate-900 dark:to-slate-950"
            onClick={(event) => event.stopPropagation()}
            data-no-auto-translate="true"
          >
            <button
              type="button"
              onClick={closeMoreMenu}
              className="absolute right-5 top-5 rounded p-1 text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white"
              aria-label={t('close', { defaultValue: 'Close' })}
            >
              <FiX className="h-6 w-6" />
            </button>

            <h2 className="mb-4 text-3xl font-bold tracking-tight text-slate-800 dark:text-white">
              {t('more_options', { defaultValue: 'More options' })}
            </h2>

            {(() => {
              const groupOrder = ['trade', 'social', 'account'];
              const groupLabels = {
                trade: t('trade', { defaultValue: 'Trade' }),
                social: t('social', { defaultValue: 'Social' }),
                account: t('account', { defaultValue: 'Account' }),
              };
              const groupStyles = {
                trade:
                  'border-blue-200 bg-blue-50/70 text-blue-900 hover:bg-blue-100/80 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-100 dark:hover:bg-blue-500/20',
                social:
                  'border-emerald-200 bg-emerald-50/70 text-emerald-900 hover:bg-emerald-100/80 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100 dark:hover:bg-emerald-500/20',
                account:
                  'border-amber-200 bg-amber-50/70 text-amber-900 hover:bg-amber-100/80 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100 dark:hover:bg-amber-500/20',
              };
              const grouped = moreMenuLinks.reduce((acc, item) => {
                if (!item || !item.group) return acc;
                if (!acc[item.group]) acc[item.group] = [];
                acc[item.group].push(item);
                return acc;
              }, {});
              return groupOrder.map((groupKey) => {
                const items = grouped[groupKey];
                if (!items || items.length === 0) return null;
                return (
                  <div key={groupKey} className="space-y-2">
                    <p className="px-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                      {groupLabels[groupKey] || groupKey}
                    </p>
                    <div className="grid gap-2">
                      {items.map((item) => {
                        const blockedForGuest = item.requiresAuth && !isLoggedIn;
                        const blockedForRole =
                          item.adminOnly && isLoggedIn && !hasAdminPanelAccess;
                        const Icon = item.icon || FiMenu;
                        const labelKey = item.labelKey || item.key;
                        const fallbackLabel = String(labelKey || item.key || '')
                          .replace(/_/g, ' ')
                          .replace(/\b\w/g, (match) => match.toUpperCase());
                        const labelText = item.label || t(labelKey, {
                          defaultValue: fallbackLabel,
                        });
                        const cardStyle = blockedForRole
                          ? 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
                          : blockedForGuest
                            ? 'border-amber-200 bg-amber-50/70 text-slate-700 hover:bg-amber-100/80 dark:border-amber-400/40 dark:bg-amber-500/10 dark:text-slate-100 dark:hover:bg-amber-500/20'
                            : groupStyles[groupKey] || 'border-slate-200 bg-white text-slate-700';
                        return (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => handleMoreMenuItemClick(item)}
                            className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-[0.98rem] font-semibold transition-colors duration-150 ${cardStyle}`}
                          >
                            <span className="flex min-w-0 items-center gap-3">
                              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/70 text-slate-700 shadow-sm dark:bg-slate-900/70 dark:text-slate-100">
                                {blockedForGuest || blockedForRole
                                  ? <FiLock className="h-5 w-5" />
                                  : <Icon className="h-5 w-5" />}
                              </span>
                              <span className="truncate">{labelText}</span>
                            </span>
                            {blockedForRole ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                                <FiLock className="h-3.5 w-3.5 shrink-0" />
                                Admin
                              </span>
                            ) : null}
                            {blockedForGuest ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-200/80 px-2 py-1 text-xs font-semibold text-amber-900 dark:bg-amber-400/20 dark:text-amber-200">
                                <FiLock className="h-3.5 w-3.5 shrink-0" />
                                Login
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              });
            })()}

            <div className="mt-6 border-t border-gray-200 pt-4 dark:border-gray-700">
              <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500">
                {t('language', { defaultValue: 'Language' })}
              </p>
              <LanguageSelector variant="panel" compact className="w-full" />
            </div>

            <div className="mt-6 border-t border-gray-200 pt-4 dark:border-gray-700">
              <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500">
                {t('theme_mode', { defaultValue: 'Theme mode' })}
              </p>
              <div className="grid gap-2">
                <button
                  type="button"
                  onClick={() => setThemeMode('light')}
                  className={`w-full rounded-2xl px-4 py-3 text-base font-semibold transition-colors ${
                    themeMode === 'light'
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {t('light_mode', { defaultValue: 'Light mode' })}
                </button>
                <button
                  type="button"
                  onClick={() => setThemeMode('system')}
                  className={`w-full rounded-2xl px-4 py-3 text-base font-semibold transition-colors ${
                    themeMode === 'system'
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {t('system', { defaultValue: 'System' })}
                </button>
                <button
                  type="button"
                  onClick={() => setThemeMode('dark')}
                  className={`w-full rounded-2xl px-4 py-3 text-base font-semibold transition-colors ${
                    themeMode === 'dark'
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {t('dark_mode', { defaultValue: 'Dark mode' })}
                </button>
              </div>
            </div>

            <div className="mt-6 border-t border-gray-200 pt-4 dark:border-gray-700">
              <p className="mb-2 text-center text-xs text-slate-500 dark:text-slate-400">
                {t('accessibility', { defaultValue: 'Accessibility' })}
              </p>
              <button
                className={`block w-full rounded-2xl px-4 py-3 text-base font-semibold transition-colors ${
                  largeFont
                    ? 'bg-green-500 text-white hover:bg-green-600'
                    : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                }`}
                onClick={() => setLargeFont(!largeFont)}
                title={largeFont ? 'Switch to normal font size' : 'Increase font size for easier reading'}
              >
                {largeFont
                  ? t('normal_size', { defaultValue: 'Normal Size' })
                  : t('larger_text', { defaultValue: 'Larger Text' })}
                <span className="block text-xs font-normal opacity-75 mt-1">
                  {largeFont
                    ? t('using_large_fonts', { defaultValue: 'Currently using large fonts' })
                    : t('easier_to_read', { defaultValue: 'Easier to read for everyone' })}
                </span>
              </button>
            </div>

            {import.meta.env.DEV && (
              <div className="mt-6 border-t border-gray-200 pt-4 dark:border-gray-700">
                <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500">
                  {t('layout', { defaultValue: 'Layout' })}
                </p>
                <div className="grid gap-2">
                  {LAYOUT_PRESETS.map((preset) => {
                    const Icon = preset.icon;
                    const active = preset.key === layoutMode;
                    return (
                      <button
                        key={preset.key}
                        type="button"
                        onClick={() => handleLayoutModeChange(preset.key)}
                        className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-colors ${
                          active
                            ? 'border-blue-300 bg-blue-50 text-blue-700'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white shadow-sm dark:bg-slate-800">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="flex flex-1 flex-col">
                          <span>{t(preset.labelKey, { defaultValue: preset.key })}</span>
                          <span className="text-xs font-normal text-slate-500">
                            {preset.width} x {preset.height}
                          </span>
                        </span>
                        {active ? <FiCheck className="h-4 w-4" /> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-6 border-t border-gray-200 pt-4 dark:border-gray-700">
              {isLoggedIn ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="block w-full rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[1.05rem] font-semibold text-red-600 transition-colors duration-150 hover:bg-red-100 dark:border-red-500/30 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30"
                >
                  {t('logout', { defaultValue: 'Logout' })}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    closeMoreMenu();
                    navigate('/login');
                  }}
                  className="block w-full rounded-2xl bg-blue-600 px-4 py-3 text-[1.05rem] font-semibold text-white transition-colors duration-150 hover:bg-blue-700"
                >
                  {t('login', { defaultValue: 'Login' })}
                </button>
              )}
            </div>
          </aside>
        </div>,
        document.body,
      )}

      {/* --- Bottom Navbar: hidden on auth-only pages and category-hub --- */}
      {!isAuthPage && !hideChromeOnHub && <nav className="mhub-bottom-nav bottom-nav fixed bottom-0 left-0 right-0 z-[120] flex justify-around items-center px-1 py-0 animate-fadeIn" role="navigation" aria-label={t('bottom_navigation')}>
        {bottomNavLinks.map((link) => {
          const isActive = isBottomNavLinkActive(link);
          const isMoreTab = link.key === 'more';

          return (
            <button
              key={link.key}
              {...navButtonProps(t(link.key))}
              data-navkey={link.key}
              aria-current={isActive ? 'page' : undefined}
              onClick={(e) => {
                if (isMoreTab) {
                  handleMoreOpen(e);
                } else {
                  startTransition(() => navigate(link.path));
                }
              }}
              style={{ background: 'none', border: 'none', outline: 'none', touchAction: 'manipulation' }}
              className={`mhub-bottom-nav-button flex flex-col items-center justify-center min-w-[48px] min-h-[52px] px-2 py-1.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${isActive ? 'is-active' : ''}`}
            >
              <span className={`mhub-bottom-nav-icon ${isActive ? 'is-active' : ''}`}>
                {link.icon}
              </span>
              <span className={`mhub-bottom-nav-label ${isActive ? 'is-active' : ''}`} style={{ fontSize: '12px' }}>
                {t(link.key, { defaultValue: isMoreTab ? 'More' : link.key })}
              </span>
              {isActive && <span className="mhub-bottom-nav-indicator" />}
            </button>
          );
        })}
      </nav>}
    </>
  );
};

export default GreenNavbar;

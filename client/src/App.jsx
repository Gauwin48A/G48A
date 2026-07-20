import React, { Suspense, lazy, useEffect, startTransition } from "react";
import { Routes, Route, Navigate, useNavigate, Outlet, useLocation as useRouterLocation } from "react-router-dom";
import GreenNavbar from "./components/GreenNavbar.jsx";
import AllPostsSubNav from "./components/AllPostsSubNav.jsx";
import AuthShell from "./components/AuthShell.jsx";
import PullToRefreshWrapper from "./components/PullToRefreshWrapper.jsx";
import LocationGate from "./components/LocationGate.jsx";
import NotificationPermission from "./components/NotificationPermission.jsx";
import RouteTelemetry from "./components/RouteTelemetry.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import RequireAuth from "./components/RequireAuth.jsx";
import PageEnhancer, { PAGE_CONFIGS } from "./components/PageEnhancer.jsx";
import { Toaster } from "@/components/ui/toaster";
import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/components/ui/use-toast";
import { socket } from "./lib/socket";
import { FilterProvider } from "./context/FilterContext.jsx";
import { CartProvider } from "./context/CartContext.jsx";
import { LocationProvider, useLocation } from "./context/LocationContext.jsx";
import { useTranslation } from "react-i18next";
import { AuthProvider, useAuth } from "./context/AuthContext";
import PwaEnhancements from "./components/PwaEnhancements.jsx";
import VPNBlocker from "./components/VPNBlocker.jsx";
import { useRouteTracker } from "@/utils/navigation";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { getUserId } from "@/utils/authStorage";
import { MapPin } from "lucide-react";
import { registerSoftReloadHandler, requestSoftReload } from "@/utils/softReload";
import { registerSoftNavigationHandler } from "@/utils/softNavigate";
import { useSwipeBack } from "@/hooks/useSwipeBack";
import "@/styles/page-enhance.css";

/** Invisible component that activates swipe-back gesture on all pages */
function SwipeBackProvider() {
  useSwipeBack();
  return null;
}

const LAZY_CACHE_KEY_PREFIX = "mhub:lazy-retry:";
const LAZY_RETRY_WINDOW_MS = 60 * 1000;
const SYNC_THROTTLE_MS = 5 * 60 * 1000; // 5 minutes between background location syncs
let lastSyncAt = 0;

function lazyWithRetry(importFn, name) {
  return lazy(async () => {
    const cacheKey = `${LAZY_CACHE_KEY_PREFIX}${name}`;
    try {
      const module = await importFn();
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(cacheKey);
      }
      return module;
    } catch (err) {
      const message = String(err?.message || err || "");
      const isModuleError =
        /Failed to fetch dynamically imported module|Importing a module script failed|Outdated Optimize Dep|fetch dynamically imported module/i.test(
          message,
        );
      if (typeof window !== "undefined" && isModuleError) {
        const stored = window.sessionStorage.getItem(cacheKey);
        const lastRetry = Number.parseInt(stored || "0", 10);
        const now = Date.now();
        if (!Number.isFinite(lastRetry) || now - lastRetry > LAZY_RETRY_WINDOW_MS) {
          window.sessionStorage.setItem(cacheKey, String(now));
          if (import.meta.env.DEV) {
            console.warn(
              `[LAZY_RETRY] Module import failed on "${name}". Prompting for refresh: ${message}`,
            );
          }
          requestSoftReload({
            title: "Refresh recommended",
            description: "We had trouble loading this screen. Refresh to recover.",
          });
        }
      }
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(cacheKey);
      }
      throw err;
    }
  });
}

const AllPostsPage = lazyWithRetry(() => import("./pages/AllPosts.jsx"), "AllPosts");
const DashboardPage = lazyWithRetry(() => import("./pages/Dashboard.jsx"), "Dashboard");
const ActivityHubPage = lazyWithRetry(() => import("./pages/ActivityHub.jsx"), "ActivityHub");
const ProfilePage = lazyWithRetry(() => import("./pages/Profile.jsx"), "Profile");
const SignUpPage = lazyWithRetry(() => import("./pages/Auth/SignUp.jsx"), "SignUp");
const LoginPage = lazyWithRetry(() => import("./pages/Auth/Login.jsx"), "Login");
const ForgotPasswordPage = lazyWithRetry(
  () => import("./pages/Auth/ForgotPassword.jsx"),
  "ForgotPassword",
);
const ResetPasswordPage = lazyWithRetry(
  () => import("./pages/Auth/ResetPassword.jsx"),
  "ResetPassword",
);
const AddPostPage = lazyWithRetry(() => import("./pages/AddPost.jsx"), "AddPost");
const PostWelcomePage = lazyWithRetry(() => import("./pages/PostWelcome.jsx"), "PostWelcome");
const CategoryHubPage = lazyWithRetry(
  () => import("./pages/CategoryHub.jsx"),
  "CategoryHub",
);
const InviteRedirectPage = lazyWithRetry(
  () => import("./pages/InviteRedirect.jsx"),
  "InviteRedirect",
);
const EditPostPage = lazyWithRetry(() => import("./pages/EditPost.jsx"), "EditPost");
const TierSelectionPage = lazyWithRetry(
  () => import("./pages/TierSelection.jsx"),
  "TierSelection",
);
const BuyerViewPage = lazyWithRetry(() => import("./pages/BuyerView.jsx"), "BuyerView");
const SaledonePage = lazyWithRetry(() => import("./pages/Saledone.jsx"), "Saledone");
const SaleUndonePage = lazyWithRetry(() => import("./pages/SaleUndone.jsx"), "SaleUndone");
const AdminPanelPage = lazyWithRetry(() => import("./pages/AdminPanel.jsx"), "AdminPanel");
const AadhaarVerifyPage = lazyWithRetry(
  () => import("./pages/GetVerified.jsx"),
  "GetVerified",
);
const PublicWallPage = lazyWithRetry(() => import("./pages/PublicWall.jsx"), "PublicWall");
const NotificationsPage = lazyWithRetry(
  () => import("./pages/Notifications.jsx"),
  "Notifications",
);
const ComplaintsPage = lazyWithRetry(() => import("./pages/Complaints.jsx"), "Complaints");
const FeedbackPage = lazyWithRetry(() => import("./pages/Feedback.jsx"), "Feedback");
const MyHomePage = lazyWithRetry(() => import("./pages/MyHome.jsx"), "MyHome");
const HomePage = lazyWithRetry(() => import("./pages/Home.jsx"), "Home");
const ForYouPage = lazyWithRetry(() => import("./pages/ForYou.jsx"), "ForYou");
const BoughtPostsPage = lazyWithRetry(() => import("./pages/BoughtPosts.jsx"), "BoughtPosts");
const SoldPostsPage = lazyWithRetry(() => import("./pages/SoldPosts.jsx"), "SoldPosts");
const PostDetailPage = lazyWithRetry(() => import("./pages/PostDetail.jsx"), "PostDetail");
const RewardsPage = lazyWithRetry(() => import("./pages/Rewards.jsx"), "Rewards");
const SubcategoriesPage = lazyWithRetry(
  () => import("./pages/Subcategories.jsx"),
  "Subcategories",
);
const ComparePostsPage = lazyWithRetry(
  () => import("./pages/ComparePosts.jsx"),
  "ComparePosts",
);
const FeedPage = lazyWithRetry(() => import("./pages/FeedPage.jsx"), "FeedPage");
const FeedPostDetailPage = lazyWithRetry(
  () => import("./pages/FeedPostDetail_v2.jsx"),
  "FeedPostDetail",
);
const MyFeedPage = lazyWithRetry(() => import("./pages/MyFeedPage.jsx"), "MyFeedPage");
const PostAddPage = lazyWithRetry(() => import("./pages/PostAdd.jsx"), "PostAdd");
const WishlistPage = lazyWithRetry(() => import("./pages/Wishlist.jsx"), "Wishlist");
const CartPage = lazyWithRetry(() => import("./pages/Cart.jsx"), "Cart");
const RecentlyViewedPage = lazyWithRetry(
  () => import("./pages/RecentlyViewed.jsx"),
  "RecentlyViewed",
);
const SavedSearchesPage = lazyWithRetry(
  () => import("./pages/SavedSearches.jsx"),
  "SavedSearches",
);
const VerificationPage = lazyWithRetry(
  () => import("./pages/Verification.jsx"),
  "Verification",
);
const NearbyPostsPage = lazyWithRetry(() => import("./pages/NearbyPosts.jsx"), "NearbyPosts");

const SearchPage = lazyWithRetry(() => import("./pages/SearchPage.jsx"), "SearchPage");
const TermsPage = lazyWithRetry(
  () => import("./pages/TermsAndConditions.jsx"),
  "TermsAndConditions",
);
const PrivacyPage = lazyWithRetry(() => import("./pages/PrivacyPolicy.jsx"), "PrivacyPolicy");
const RefundPage = lazyWithRetry(() => import("./pages/RefundPolicy.jsx"), "RefundPolicy");
const SupportTicketPage = lazyWithRetry(
  () => import("./pages/SupportTicketPolicy.jsx"),
  "SupportTicketPolicy",
);
const SecuritySettingsPage = lazyWithRetry(
  () => import("./pages/SecuritySettings.jsx"),
  "SecuritySettings",
);
const KycVerificationPage = lazyWithRetry(
  () => import("./pages/KYC/KycVerification.jsx"),
  "KycVerification",
);
const PaymentPage = lazyWithRetry(
  () => import("./pages/Payments/PaymentPage.jsx"),
  "PaymentPage",
);

const AnalyticsPage = lazyWithRetry(() => import("./pages/Analytics.jsx"), "Analytics");
const WalletPage = lazyWithRetry(() => import("./pages/Wallet.jsx"), "Wallet");
const PriceAlertsPage = lazyWithRetry(() => import("./pages/PriceAlerts.jsx"), "PriceAlerts");
const ChannelsListPage = lazyWithRetry(
  () => import("./pages/ChannelsListPage.jsx"),
  "ChannelsListPage",
);
const CreateChannelPage = lazyWithRetry(
  () => import("./pages/CreateChannelPage.jsx"),
  "CreateChannelPage",
);
const ChannelPage = lazyWithRetry(() => import("./pages/ChannelPage.jsx"), "ChannelPage");
const CentreListingsPage = lazyWithRetry(
  () => import("./pages/CentreListings.jsx"),
  "CentreListings",
);
const NotFoundPage = lazyWithRetry(
  () => import("./pages/NotFound.jsx"),
  "NotFound",
);
const AccountDeletionPage = lazyWithRetry(
  () => import("./pages/AccountDeletion.jsx"),
  "AccountDeletion",
);

function RouteBoundary() {
  return (
    <ErrorBoundary>
      <Outlet />
    </ErrorBoundary>
  );
}

/** Automatically saves each route to sessionStorage for reliable back-navigation fallbacks */
function RouteTracker() {
  useRouteTracker();
  return null;
}

function ScrollToTop() {
  const { pathname } = useRouterLocation();
  const scrollPositions = React.useRef({});
  const prevPathname = React.useRef(pathname);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.__MHUB_NAV_SWITCHING = true;
      if (window.__MHUB_NAV_SWITCHING_TIMER) {
        window.clearTimeout(window.__MHUB_NAV_SWITCHING_TIMER);
      }
      window.__MHUB_NAV_SWITCHING_TIMER = window.setTimeout(() => {
        window.__MHUB_NAV_SWITCHING = false;
        window.__MHUB_NAV_SWITCHING_TIMER = null;
      }, 1200);
    }

    // Save scroll position for the page we're leaving
    scrollPositions.current[prevPathname.current] = window.scrollY;

    // Restore scroll position if we've been here before (back nav)
    const savedPos = scrollPositions.current[pathname];
    if (savedPos !== undefined && window.history.state?.idx !== undefined) {
      // Use requestAnimationFrame to let the DOM render first
      requestAnimationFrame(() => window.scrollTo(0, savedPos));
    } else {
      // New page â€” scroll to top
      window.scrollTo(0, 0);
    }

    prevPathname.current = pathname;

    return () => {
      if (window.__MHUB_NAV_SWITCHING_TIMER) {
        window.clearTimeout(window.__MHUB_NAV_SWITCHING_TIMER);
        window.__MHUB_NAV_SWITCHING_TIMER = null;
        window.__MHUB_NAV_SWITCHING = false;
      }
    };
  }, [pathname]);
  return null;
}

function LocationBanner() {
  const { t } = useTranslation();
  const { error, retry, loading, skipForNow, permissionGranted, userSkipped } = useLocation();

  if (permissionGranted || userSkipped) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-yellow-100 dark:bg-yellow-900/30 border-b-2 border-yellow-400 dark:border-yellow-600 shadow-lg">
      <div className="max-w-[640px] mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <MapPin className="w-6 h-6 text-yellow-700 dark:text-yellow-300" />
          <div>
            <p className="font-semibold text-yellow-900 dark:text-yellow-200">{t("location_required")}</p>
            <p className="text-sm text-yellow-800 dark:text-yellow-300">
              {loading ? t("requesting_location") : error || t("grant_permission")}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {!loading && (
            <>
              <button
                onClick={retry}
                className="px-4 py-2 bg-yellow-500 dark:bg-yellow-600 text-white rounded-lg font-medium hover:bg-yellow-600 dark:hover:bg-yellow-500 transition"
              >
                {t("allow_location")}
              </button>
              <button
                onClick={skipForNow}
                className="px-3 py-2 text-yellow-700 dark:text-yellow-300 hover:text-yellow-900 dark:hover:text-yellow-100 font-medium"
              >
                {t("later")}
              </button>
            </>
          )}
          {loading && (
            <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
              <div className="w-4 h-4 border-2 border-yellow-600 dark:border-yellow-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">{t("loading")}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AppShell() {
  const { t } = useTranslation();
  const { loading, permissionGranted, skipForNow, userSkipped, requestLocation } = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const routerLocation = useRouterLocation();
  const normalizedPath = (() => {
    const raw = routerLocation.pathname || '/';
    const trimmed = raw.replace(/\/+$/, '');
    return trimmed === '' ? '/' : trimmed;
  })();
  const isDev = import.meta.env.DEV;

  // Configure native status bar and mark native platform for CSS
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      document.documentElement.setAttribute('data-native-platform', 'true');
      StatusBar.setBackgroundColor({ color: "#2563eb" }).catch(() => {});
      StatusBar.setStyle({ style: Style.Light }).catch(() => {});
      StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
    }
  }, []);

  // Global haptic feedback on button taps (works even with minified button.jsx)
  useEffect(() => {
    const handler = (e) => {
      const btn = e.target.closest('button, [role="button"]');
      if (btn && navigator.vibrate) {
        navigator.vibrate(8);
      }
    };
    // Haptic on toggle/checkbox/switch interactions
    const changeHandler = (e) => {
      const el = e.target;
      if (
        (el.type === "checkbox" || el.type === "radio" || el.role === "switch") &&
        navigator.vibrate
      ) {
        navigator.vibrate(12);
      }
    };
    document.addEventListener("pointerdown", handler, { passive: true });
    document.addEventListener("change", changeHandler, { passive: true });
    return () => {
      document.removeEventListener("pointerdown", handler);
      document.removeEventListener("change", changeHandler);
    };
  }, []);

  useEffect(() => {
    const syncLocation = async () => {
      const userId = getUserId(user);
      if (userId) {
        const now = Date.now();
        if (now - lastSyncAt < SYNC_THROTTLE_MS) return;
        lastSyncAt = now;
        if (isDev) {
          console.log("[DEFENDER] App Active. Syncing Banking-Grade Location...");
        }
        requestLocation({ silent: true }).catch(() => {});
      }
    };

    syncLocation();

    const listenerPromise = (async () =>
      await CapacitorApp.addListener("appStateChange", ({ isActive }) => {
        if (isActive) {
          if (isDev) {
            console.log("[DEFENDER] App Resumed. updating...");
          }
          syncLocation();
        }
      }))();

    // F-10: Deep link handler for mhub:// URL scheme
    const deepLinkPromise = CapacitorApp.addListener("appUrlOpen", ({ url }) => {
      try {
        // Strip scheme: mhub://post/123 â†’ post/123
        const path = url.replace(/^mhub:\/\//, "");
        if (path.startsWith("post/")) {
          const postId = path.slice(5).split("?")[0];
          if (postId) navigate(`/post/${postId}`);
        } else if (path.startsWith("profile/")) {
          const userId = path.slice(8).split("?")[0];
          if (userId) navigate(`/profile/${userId}`);
        } else if (path.startsWith("feed")) {
          navigate("/feed");
        } else if (path.startsWith("orders") || path.startsWith("bought-posts")) {
          navigate("/bought-posts");
        } else if (path.startsWith("wallet")) {
          navigate("/wallet");
        } else if (path.startsWith("price-alerts") || path.startsWith("pricealerts")) {
          navigate("/price-alerts");
        } else if (path.startsWith("wishlist")) {
          navigate("/wishlist");
        } else if (path.startsWith("notifications")) {
          navigate("/notifications");
        } else if (path) {
          navigate(`/${path}`);
        }
      } catch (err) {
        if (isDev) console.warn("[DEEP_LINK] Failed to handle URL:", url, err);
      }
    });

    return () => {
      listenerPromise.then((listener) => listener.remove());
      deepLinkPromise.then((listener) => listener.remove());
    };
  }, [isDev, user, requestLocation, navigate]);

  useEffect(() => {
    socket.on("notification", (notification) => {
      toast({
        title: notification.title,
        description: notification.message,
        variant: notification.type === "error" ? "destructive" : "default",
        className: "bg-gradient-to-r from-purple-500/90 to-pink-500/90 dark:from-purple-700/90 dark:to-pink-700/90 text-white border-none",
        duration: 4000,
      });
    });
    return () => {
      socket.off("notification");
    };
  }, [toast]);

  useEffect(() => {
    return registerSoftNavigationHandler(({ to, options }) => {
      startTransition(() => navigate(to, options));
    });
  }, [navigate]);

  // Prefetch main navigation route chunks after initial render to eliminate lazy-load delays
  useEffect(() => {
    const prefetch = () => {
      import("./pages/Home.jsx");
      import("./pages/AllPosts.jsx");
      import("./pages/ForYou.jsx");
      import("./pages/FeedPage.jsx");
      import("./pages/Profile.jsx");
      import("./pages/Notifications.jsx");
      import("./pages/Rewards.jsx");
      import("./pages/SearchPage.jsx");
    };
    const timer = typeof requestIdleCallback === "function"
      ? (requestIdleCallback(prefetch), null)
      : setTimeout(prefetch, 500);
    return () => { if (timer) clearTimeout(timer); };
  }, []);

  // Listen for parity fallback events and show a toast
  useEffect(() => {
    const handler = (e) => {
      const page = e.detail?.page || "page";
      toast({
        title: t("data_unavailable", { defaultValue: "Data temporarily unavailable" }),
        description: t("parity_fallback_desc", {
          defaultValue: `Could not load ${page} data. Showing what we have.`,
        }),
        variant: "default",
        duration: 5000,
      });
    };
    window.addEventListener("mhub:parity-fallback", handler);
    return () => window.removeEventListener("mhub:parity-fallback", handler);
  }, [toast, t]);

  useEffect(() => {
    const reloadLabel = t("reload", { defaultValue: "Reload" });
    return registerSoftReloadHandler((payload) => {
      const title =
        payload?.title ||
        t("refresh_recommended", { defaultValue: "Refresh recommended" });
      const description =
        payload?.description ||
        t("refresh_recommended_body", {
          defaultValue: "A refresh is recommended to keep things stable.",
        });
      toast({
        title,
        description,
        duration: Number.isFinite(payload?.duration) ? payload.duration : 10000,
        action: (
          <ToastAction altText={reloadLabel} onClick={() => window.location.reload()}>
            {reloadLabel}
          </ToastAction>
        ),
      });
    });
  }, [toast, t]);

  const isInitializing = loading && !userSkipped;

  return (
    <div className="min-h-screen flex flex-col mhub-premium-page transition-colors duration-300">
      {!permissionGranted && !userSkipped && !isInitializing && <LocationBanner />}
      <NotificationPermission userId={getUserId(user)} />
      {isInitializing ? (
        <div className="min-h-screen flex items-center justify-center mhub-premium-page">
          <div className="text-center p-8 mhub-premium-surface rounded-2xl shadow-xl max-w-md">
            <div className="w-16 h-16 mx-auto mb-4 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {t("initializing_app")}
            </h2>
            <p className="text-gray-600 dark:text-gray-300">{t("detecting_location")}</p>
            <p className="text-sm text-gray-400 mt-2">{t("can_skip_hint")}</p>
            <button
              onClick={skipForNow}
              className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
            >
              {t("skip_for_now")}
            </button>
          </div>
        </div>
      ) : (
        <>
          <GreenNavbar />
          {(normalizedPath === '/all-posts' ||
            normalizedPath.startsWith('/all-posts/') ||
            normalizedPath === '/listings' ||
            normalizedPath.startsWith('/listings/') ||
            normalizedPath === '/for-you' ||
            normalizedPath.startsWith('/for-you/')
          ) && (
            <AllPostsSubNav
              resultsCount={0}
              activeFilterCount={(() => {
                const params = new URLSearchParams(routerLocation.search);
                let count = 0;
                if (params.get('search')) count++;
                if (params.get('location')) count++;
                if (params.get('minPrice') || params.get('maxPrice')) count++;
                if (params.get('startDate') || params.get('endDate')) count++;
                if (params.get('category') && params.get('category') !== 'All') count++;
                if (params.get('subcategory') && params.get('subcategory') !== 'All' && params.get('subcategory') !== '') count++;
                if (params.get('latestWindow')) count++;
                if (params.get('sortBy')) count++;
                if (params.get('condition')) count++;
                if (params.get('verifiedOnly')) count++;
                return count;
              })()}
              onClearFilters={() => navigate(normalizedPath.startsWith('/for-you') ? '/for-you?mode=for-you' : '/all-posts')}
              onToggleAutoRefresh={() => navigate(normalizedPath + '?_=' + Date.now(), { replace: true })}
            />
          )}
          <RouteTelemetry />
          <ScrollToTop />
          <RouteTracker />
          <SwipeBackProvider />
          <PullToRefreshWrapper>
          <main
            className="flex-1 app-main"
            style={{ marginTop: !permissionGranted && !userSkipped ? "calc(var(--top-nav-height, 60px) + 64px)" : "0" }}
          >
            <Suspense
              fallback={
                <div className="flex flex-col justify-center items-center h-full py-10 gap-3">
                  <div className="w-8 h-8 border-[3px] border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-muted-foreground">{t("loading")}</span>
                </div>
              }
            >
              <Routes>
                <Route element={<RouteBoundary />}>
                  <Route path="/login" element={<PageEnhancer config={PAGE_CONFIGS["login"]}><AuthShell><LoginPage /></AuthShell></PageEnhancer>} />
                  <Route path="/signup" element={<PageEnhancer config={PAGE_CONFIGS["signup"]}><AuthShell><SignUpPage /></AuthShell></PageEnhancer>} />
                  <Route path="/invite/:code" element={<PageEnhancer config={PAGE_CONFIGS["invite"]}><AuthShell><InviteRedirectPage /></AuthShell></PageEnhancer>} />
                  <Route path="/forgot-password" element={<PageEnhancer config={PAGE_CONFIGS["forgot-password"]}><AuthShell><ForgotPasswordPage /></AuthShell></PageEnhancer>} />
                  <Route path="/reset-password" element={<PageEnhancer config={PAGE_CONFIGS["reset-password"]}><AuthShell><ResetPasswordPage /></AuthShell></PageEnhancer>} />
                  <Route path="/reset-password/:token" element={<PageEnhancer config={PAGE_CONFIGS["reset-password"]}><AuthShell><ResetPasswordPage /></AuthShell></PageEnhancer>} />
                  <Route path="/" element={<Navigate to="/category-hub" replace />} />
                  <Route path="/all-posts" element={<PageEnhancer config={PAGE_CONFIGS["all-posts"]}><RequireAuth><AllPostsPage /></RequireAuth></PageEnhancer>} />
                  <Route path="/listings" element={<Navigate to="/all-posts" replace />} />
                  <Route path="/post/:id" element={<PageEnhancer config={PAGE_CONFIGS["post-detail"]}><RequireAuth><PostDetailPage /></RequireAuth></PageEnhancer>} />
                  <Route path="/listing/:id" element={<PageEnhancer config={PAGE_CONFIGS["post-detail"]}><RequireAuth><PostDetailPage /></RequireAuth></PageEnhancer>} />
                  <Route path="/dashboard" element={<PageEnhancer config={PAGE_CONFIGS["dashboard"]}><RequireAuth><DashboardPage /></RequireAuth></PageEnhancer>} />
                  <Route path="/activity" element={<PageEnhancer config={PAGE_CONFIGS["activity"]}><RequireAuth><ActivityHubPage /></RequireAuth></PageEnhancer>} />
                  <Route path="/profile" element={<PageEnhancer config={PAGE_CONFIGS["profile"]}><RequireAuth><ProfilePage /></RequireAuth></PageEnhancer>} />
                  <Route path="/security" element={<PageEnhancer config={PAGE_CONFIGS["security"]}><RequireAuth><SecuritySettingsPage /></RequireAuth></PageEnhancer>} />
                  <Route path="/account/delete" element={<PageEnhancer config={PAGE_CONFIGS["account-delete"]}><RequireAuth><AccountDeletionPage /></RequireAuth></PageEnhancer>} />
                  <Route path="/add-post" element={<PageEnhancer config={PAGE_CONFIGS["add-post"]}><RequireAuth><AddPostPage /></RequireAuth></PageEnhancer>} />
                  <Route path="/post-welcome" element={<Navigate to="/add-post" replace />} />
                  <Route path="/sell" element={<Navigate to="/add-post" replace />} />
                  <Route path="/category-hub" element={<PageEnhancer config={PAGE_CONFIGS["category-hub"]}><RequireAuth><CategoryHubPage /></RequireAuth></PageEnhancer>} />
                  <Route path="/edit-post/:postId" element={<PageEnhancer config={PAGE_CONFIGS["edit-post"]}><RequireAuth><EditPostPage /></RequireAuth></PageEnhancer>} />
                  <Route path="/tier-selection" element={<PageEnhancer config={PAGE_CONFIGS["tier-selection"]}><RequireAuth><TierSelectionPage /></RequireAuth></PageEnhancer>} />
                  <Route path="/tiers" element={<Navigate to="/tier-selection" replace />} />
                  <Route path="/pricing" element={<Navigate to="/tier-selection" replace />} />
                  <Route path="/my-home" element={<PageEnhancer config={PAGE_CONFIGS["my-home"]}><RequireAuth><MyHomePage /></RequireAuth></PageEnhancer>} />
                  <Route path="/home" element={<Navigate to="/all-posts" replace />} />
                  <Route path="/for-you" element={<PageEnhancer config={PAGE_CONFIGS["for-you"]}><RequireAuth><ForYouPage /></RequireAuth></PageEnhancer>} />
                  <Route path="/bought-posts" element={<PageEnhancer config={PAGE_CONFIGS["bought-posts"]}><RequireAuth><BoughtPostsPage /></RequireAuth></PageEnhancer>} />
                  <Route path="/sold-posts" element={<PageEnhancer config={PAGE_CONFIGS["sold-posts"]}><RequireAuth><SoldPostsPage /></RequireAuth></PageEnhancer>} />
                  <Route path="/buyer-view" element={<PageEnhancer config={PAGE_CONFIGS["buyer-view"]}><RequireAuth><BuyerViewPage /></RequireAuth></PageEnhancer>} />
                  <Route path="/saledone" element={<PageEnhancer config={PAGE_CONFIGS["saledone"]}><RequireAuth><SaledonePage /></RequireAuth></PageEnhancer>} />
                  <Route path="/saleundone" element={<PageEnhancer config={PAGE_CONFIGS["saleundone"]}><RequireAuth><SaleUndonePage /></RequireAuth></PageEnhancer>} />
                  <Route
                    path="/admin-panel"
                    element={
                      <PageEnhancer config={PAGE_CONFIGS["admin-panel"]}><RequireAuth requiredRoles={["admin", "super_admin", "superadmin"]}><AdminPanelPage /></RequireAuth></PageEnhancer>
                    }
                  />
                  <Route path="/aadhaar-verify" element={<PageEnhancer config={PAGE_CONFIGS["aadhaar-verify"]}><RequireAuth><AadhaarVerifyPage /></RequireAuth></PageEnhancer>} />
                  <Route path="/public-wall" element={<PageEnhancer config={PAGE_CONFIGS["public-wall"]}><RequireAuth><PublicWallPage /></RequireAuth></PageEnhancer>} />
                  <Route path="/notifications" element={<PageEnhancer config={PAGE_CONFIGS["notifications"]}><RequireAuth><NotificationsPage /></RequireAuth></PageEnhancer>} />
                  <Route path="/complaints" element={<PageEnhancer config={PAGE_CONFIGS["complaints"]}><RequireAuth><ComplaintsPage /></RequireAuth></PageEnhancer>} />
                  <Route path="/feedback" element={<PageEnhancer config={PAGE_CONFIGS["feedback"]}><RequireAuth><FeedbackPage /></RequireAuth></PageEnhancer>} />
                  <Route path="/rewards" element={<PageEnhancer config={PAGE_CONFIGS["rewards"]}><RequireAuth><RewardsPage /></RequireAuth></PageEnhancer>} />
                  <Route path="/categories" element={<PageEnhancer config={PAGE_CONFIGS["category-hub"]}><RequireAuth><SubcategoriesPage /></RequireAuth></PageEnhancer>} />
                  <Route path="/subcategories" element={<PageEnhancer config={PAGE_CONFIGS["category-hub"]}><RequireAuth><SubcategoriesPage /></RequireAuth></PageEnhancer>} />
                  <Route path="/compare" element={<PageEnhancer config={PAGE_CONFIGS["compare"]}><RequireAuth><ComparePostsPage /></RequireAuth></PageEnhancer>} />
                  <Route path="/categories/:slug" element={<Navigate to="/all-posts" replace />} />
                  <Route path="/feed" element={<PageEnhancer config={PAGE_CONFIGS["feed"]}><RequireAuth><FeedPage /></RequireAuth></PageEnhancer>} />
                  <Route path="/feed/:id" element={<PageEnhancer config={PAGE_CONFIGS["feed-detail"]}><RequireAuth><FeedPostDetailPage /></RequireAuth></PageEnhancer>} />
                  <Route path="/my-feed" element={<PageEnhancer config={PAGE_CONFIGS["my-feed"]}><RequireAuth><MyFeedPage /></RequireAuth></PageEnhancer>} />
                  <Route path="/my-posts" element={<PageEnhancer config={PAGE_CONFIGS["my-posts"]}><RequireAuth><MyHomePage /></RequireAuth></PageEnhancer>} />
                  <Route path="/post_add" element={<Navigate to="/add-post" replace />} />
                  <Route path="/feed/feedpostadd" element={<Navigate to="/add-post?source=feed" replace />} />
                  <Route path="/wishlist" element={<PageEnhancer config={PAGE_CONFIGS["wishlist"]}><RequireAuth><WishlistPage /></RequireAuth></PageEnhancer>} />
                  <Route path="/cart" element={<PageEnhancer config={PAGE_CONFIGS["cart"]}><RequireAuth><CartPage /></RequireAuth></PageEnhancer>} />
                  <Route path="/recently-viewed" element={<PageEnhancer config={PAGE_CONFIGS["recently-viewed"]}><RequireAuth><RecentlyViewedPage /></RequireAuth></PageEnhancer>} />
                  <Route path="/saved-searches" element={<PageEnhancer config={PAGE_CONFIGS["saved-searches"]}><RequireAuth><SavedSearchesPage /></RequireAuth></PageEnhancer>} />
                  <Route path="/verification" element={<PageEnhancer config={PAGE_CONFIGS["verification"]}><RequireAuth><VerificationPage /></RequireAuth></PageEnhancer>} />
                  <Route path="/nearby" element={<PageEnhancer config={PAGE_CONFIGS["nearby"]}><RequireAuth><NearbyPostsPage /></RequireAuth></PageEnhancer>} />

                  <Route path="/t&c" element={<PageEnhancer config={PAGE_CONFIGS["terms"]}><TermsPage /></PageEnhancer>} />
                  <Route path="/terms" element={<PageEnhancer config={PAGE_CONFIGS["terms"]}><TermsPage /></PageEnhancer>} />
                  <Route path="/terms-and-conditions" element={<Navigate to="/t&c" replace />} />
                  <Route path="/privacy-policy" element={<PageEnhancer config={PAGE_CONFIGS["privacy-policy"]}><PrivacyPage /></PageEnhancer>} />
                  <Route path="/refund-policy" element={<PageEnhancer config={PAGE_CONFIGS["refund-policy"]}><RefundPage /></PageEnhancer>} />
                  <Route path="/support-ticket-policy" element={<PageEnhancer config={PAGE_CONFIGS["support-ticket-policy"]}><SupportTicketPage /></PageEnhancer>} />
                  <Route path="/search" element={<PageEnhancer config={PAGE_CONFIGS["search"]}><RequireAuth><SearchPage /></RequireAuth></PageEnhancer>} />
                  <Route path="/analytics" element={<PageEnhancer config={PAGE_CONFIGS["analytics"]}><RequireAuth><AnalyticsPage /></RequireAuth></PageEnhancer>} />
                  <Route path="/wallet" element={<PageEnhancer config={PAGE_CONFIGS["wallet"]}><RequireAuth><WalletPage /></RequireAuth></PageEnhancer>} />
                  <Route path="/price-alerts" element={<PageEnhancer config={PAGE_CONFIGS["price-alerts"]}><RequireAuth><PriceAlertsPage /></RequireAuth></PageEnhancer>} />
                  <Route path="/channels" element={<PageEnhancer config={PAGE_CONFIGS["channels"]}><RequireAuth><ChannelsListPage /></RequireAuth></PageEnhancer>} />
                  <Route path="/channels/create" element={<PageEnhancer config={PAGE_CONFIGS["channels-create"]}><RequireAuth><CreateChannelPage /></RequireAuth></PageEnhancer>} />
                  <Route path="/channels/:id" element={<PageEnhancer config={PAGE_CONFIGS["channels-detail"]}><RequireAuth><ChannelPage /></RequireAuth></PageEnhancer>} />
                  <Route path="/centre" element={<PageEnhancer config={PAGE_CONFIGS["centre"]}><RequireAuth><ChannelsListPage variant="centre" /></RequireAuth></PageEnhancer>} />
                  <Route path="/centre/create" element={<PageEnhancer config={PAGE_CONFIGS["centre-create"]}><RequireAuth><CreateChannelPage variant="centre" /></RequireAuth></PageEnhancer>} />
                  <Route path="/centre/:id/listings" element={<PageEnhancer config={PAGE_CONFIGS["centre-listings"]}><RequireAuth><CentreListingsPage /></RequireAuth></PageEnhancer>} />
                  <Route path="/centre/:id" element={<PageEnhancer config={PAGE_CONFIGS["centre-detail"]}><RequireAuth><ChannelPage variant="centre" /></RequireAuth></PageEnhancer>} />
                  <Route path="/kyc" element={<PageEnhancer config={PAGE_CONFIGS["kyc"]}><RequireAuth><KycVerificationPage /></RequireAuth></PageEnhancer>} />
                  <Route path="/payment" element={<PageEnhancer config={PAGE_CONFIGS["payment"]}><RequireAuth><PaymentPage /></RequireAuth></PageEnhancer>} />

                  <Route path="*" element={<PageEnhancer config={PAGE_CONFIGS["not-found"]}><NotFoundPage /></PageEnhancer>} />
                </Route>
              </Routes>
            </Suspense>
          </main>
          </PullToRefreshWrapper>
          <Toaster />
        </>
      )}
    </div>
  );
}

function App() {
  return (
    <VPNBlocker>
      <LocationProvider>
        <FilterProvider>
          <AuthProvider>
            <CartProvider>
              <LocationGate>
                <AppShell />
                <PwaEnhancements />
              </LocationGate>
            </CartProvider>
          </AuthProvider>
        </FilterProvider>
      </LocationProvider>
    </VPNBlocker>
  );
}

export default App;

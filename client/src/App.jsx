import React, { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import GreenNavbar from './components/GreenNavbar.jsx';
import LocationGate from './components/LocationGate.jsx';
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
import { socket } from './lib/socket';
import { FilterProvider } from './context/FilterContext.jsx';
import { LocationProvider, useLocation } from './context/LocationContext.jsx';
import { useTranslation } from 'react-i18next';
import { AuthProvider, useAuth } from './context/AuthContext';
import { App as CapacitorApp } from '@capacitor/app';
import { checkAndSyncLocation, syncLocationToBackend } from '@/services/locationService';
import { getUserId } from '@/utils/authStorage';
// Redundant mobileLocation import removed

const LAZY_RELOAD_PREFIX = 'mhub:lazy-retry:';
const LAZY_RELOAD_WINDOW_MS = 60 * 1000;
const DEV_DEFENDER_SYNC_DEBOUNCE_MS = 1500;
let lastDefenderSyncAt = 0;

function lazyWithRetry(importer, routeKey) {
  return lazy(async () => {
    const retryKey = `${LAZY_RELOAD_PREFIX}${routeKey}`;

    try {
      const module = await importer();
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(retryKey);
      }
      return module;
    } catch (error) {
      const message = String(error?.message || error || '');
      const isRecoverableImportFailure = /Failed to fetch dynamically imported module|Importing a module script failed|Outdated Optimize Dep|fetch dynamically imported module/i.test(
        message
      );

      if (typeof window !== 'undefined' && isRecoverableImportFailure) {
        const lastRetryRaw = window.sessionStorage.getItem(retryKey);
        const lastRetry = Number.parseInt(lastRetryRaw || '0', 10);
        const now = Date.now();
        const shouldRetry = !Number.isFinite(lastRetry) || now - lastRetry > LAZY_RELOAD_WINDOW_MS;

        if (shouldRetry) {
          window.sessionStorage.setItem(retryKey, String(now));
          if (import.meta.env.DEV) {
            console.warn(`[LAZY_RETRY] Reloading after module import failure on "${routeKey}": ${message}`);
          }
          window.location.reload();
          return new Promise(() => {});
        }
      }

      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(retryKey);
      }
      throw error;
    }
  });
}


// Lazy load pages
const AllPosts = lazyWithRetry(() => import('./pages/AllPosts.jsx'), 'AllPosts');
const Dashboard = lazyWithRetry(() => import('./pages/Dashboard.jsx'), 'Dashboard');
const Profile = lazyWithRetry(() => import('./pages/Profile.jsx'), 'Profile');
const SignUp = lazyWithRetry(() => import('./pages/Auth/SignUp.jsx'), 'SignUp');
const Login = lazyWithRetry(() => import('./pages/Auth/Login.jsx'), 'Login');
const ForgotPassword = lazyWithRetry(() => import('./pages/Auth/ForgotPassword.jsx'), 'ForgotPassword');
const ResetPassword = lazyWithRetry(() => import('./pages/Auth/ResetPassword.jsx'), 'ResetPassword');
const AddPost = lazyWithRetry(() => import('./pages/AddPost.jsx'), 'AddPost');
const TierSelection = lazyWithRetry(() => import('./pages/TierSelection.jsx'), 'TierSelection');
const BuyerView = lazyWithRetry(() => import('./pages/BuyerView.jsx'), 'BuyerView');
const Saledone = lazyWithRetry(() => import('./pages/Saledone.jsx'), 'Saledone');
const SaleUndone = lazyWithRetry(() => import('./pages/SaleUndone.jsx'), 'SaleUndone');
const AdminPanel = lazyWithRetry(() => import('./pages/AdminPanel.jsx'), 'AdminPanel');
const AadhaarVerify = lazyWithRetry(() => import('./pages/AadhaarVerify.jsx'), 'AadhaarVerify');
const PublicWall = lazyWithRetry(() => import('./pages/PublicWall.jsx'), 'PublicWall');
const Notifications = lazyWithRetry(() => import('./pages/Notifications.jsx'), 'Notifications');
const Complaints = lazyWithRetry(() => import('./pages/Complaints.jsx'), 'Complaints');
const Feedback = lazyWithRetry(() => import('./pages/Feedback.jsx'), 'Feedback');
const MyHome = lazyWithRetry(() => import('./pages/MyHome.jsx'), 'MyHome');
const Home = lazyWithRetry(() => import('./pages/Home.jsx'), 'Home');
const ForYou = lazyWithRetry(() => import('./pages/ForYou.jsx'), 'ForYou');
const BoughtPosts = lazyWithRetry(() => import('./pages/BoughtPosts.jsx'), 'BoughtPosts');
const SoldPosts = lazyWithRetry(() => import('./pages/SoldPosts.jsx'), 'SoldPosts');
const PostDetail = lazyWithRetry(() => import('./pages/PostDetail.jsx'), 'PostDetail');
const Rewards = lazyWithRetry(() => import('./pages/Rewards.jsx'), 'Rewards');
const MyRecommendations = lazyWithRetry(() => import('./pages/MyRecommendations.jsx'), 'MyRecommendations');
const Categories = lazyWithRetry(() => import('./pages/Categories.jsx'), 'Categories');
const FeedPage = lazyWithRetry(() => import('./pages/FeedPage.jsx'), 'FeedPage');
const FeedPostDetail = lazyWithRetry(() => import('./pages/FeedPostDetail.jsx'), 'FeedPostDetail');
const MyFeedPage = lazyWithRetry(() => import('./pages/MyFeedPage.jsx'), 'MyFeedPage');
const PostAdd = lazyWithRetry(() => import('./pages/PostAdd.jsx'), 'PostAdd');
const Wishlist = lazyWithRetry(() => import('./pages/Wishlist.jsx'), 'Wishlist');
const RecentlyViewed = lazyWithRetry(() => import('./pages/RecentlyViewed.jsx'), 'RecentlyViewed');
const SavedSearches = lazyWithRetry(() => import('./pages/SavedSearches.jsx'), 'SavedSearches');
const Verification = lazyWithRetry(() => import('./pages/Verification.jsx'), 'Verification');
const NearbyPosts = lazyWithRetry(() => import('./pages/NearbyPosts.jsx'), 'NearbyPosts');
const Chat = lazyWithRetry(() => import('./pages/Chat.jsx'), 'Chat');
const SearchPage = lazyWithRetry(() => import('./pages/SearchPage.jsx'), 'SearchPage');
const SecuritySettings = lazyWithRetry(() => import('./pages/SecuritySettings.jsx'), 'SecuritySettings');
const KycVerification = lazyWithRetry(() => import('./pages/KYC/KycVerification.jsx'), 'KycVerification');
const PaymentPage = lazyWithRetry(() => import('./pages/Payments/PaymentPage.jsx'), 'PaymentPage');
const Offers = lazyWithRetry(() => import('./pages/Offers.jsx'), 'Offers');
const Reviews = lazyWithRetry(() => import('./pages/Reviews.jsx'), 'Reviews');
const Analytics = lazyWithRetry(() => import('./pages/Analytics.jsx'), 'Analytics');
const ChannelsListPage = lazyWithRetry(() => import('./pages/ChannelsListPage.jsx'), 'ChannelsListPage');
const CreateChannelPage = lazyWithRetry(() => import('./pages/CreateChannelPage.jsx'), 'CreateChannelPage');
const ChannelPage = lazyWithRetry(() => import('./pages/ChannelPage.jsx'), 'ChannelPage');

/**
 * Location Banner - Shows when location is not granted
 * Does NOT block the app - just displays a reminder banner
 */
function LocationBanner() {
  const { t } = useTranslation();
  const { error, retry, loading, skipForNow, permissionGranted, userSkipped } = useLocation();

  // Don't show banner if permission granted or user skipped
  if (permissionGranted || userSkipped) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-yellow-100 border-b-2 border-yellow-400 shadow-lg">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📍</span>
          <div>
            <p className="font-semibold text-yellow-900">{t('location_required')}</p>
            <p className="text-sm text-yellow-800">
              {loading ? t('requesting_location') : error || t('grant_permission')}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {!loading && (
            <>
              <button
                onClick={retry}
                className="px-4 py-2 bg-yellow-500 text-white rounded-lg font-medium hover:bg-yellow-600 transition"
              >
                {t('allow_location')}
              </button>
              <button
                onClick={skipForNow}
                className="px-3 py-2 text-yellow-700 hover:text-yellow-900 font-medium"
              >
                {t('later')}
              </button>
            </>
          )}
          {loading && (
            <div className="flex items-center gap-2 text-yellow-700">
              <div className="w-4 h-4 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm">{t('loading')}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * App Content - Uses LocationContext
 */
function AppContent() {
  const { t } = useTranslation();
  const { loading, permissionGranted, skipForNow, userSkipped } = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const lifecycleDebug = import.meta.env.DEV;

  // Initialize security and location sync on mount
  useEffect(() => {
    // Smart location sync (Zero Maintenance)
    const userId = getUserId(user);
    if (userId) {
      checkAndSyncLocation(userId).catch(() => {
        // Location sync not critical
      });
    }
  }, [user]);

  // THE DEFENDER: Mobile Lifecycle Triggers
  useEffect(() => {
    const handleAppLaunch = async () => {
      const userId = getUserId(user);
      if (!userId) return;

      if (lifecycleDebug) {
        const now = Date.now();
        if (now - lastDefenderSyncAt < DEV_DEFENDER_SYNC_DEBOUNCE_MS) {
          return;
        }
        lastDefenderSyncAt = now;
      }

      if (lifecycleDebug) {
        console.log("[DEFENDER] App Active. Syncing Banking-Grade Location...");
      }
      syncLocationToBackend(userId);
    };

    // Trigger on Mount
    handleAppLaunch();

    // Trigger on Resume
    const setupListener = async () => {
      const listener = await CapacitorApp.addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
          if (lifecycleDebug) {
            console.log("[DEFENDER] App Resumed. updating...");
          }
          handleAppLaunch();
        }
      });
      return listener;
    };

    const listenerPromise = setupListener();

    return () => {
      listenerPromise.then(l => l.remove());
    };
  }, [lifecycleDebug, user]);

  // Socket listener for notifications
  useEffect(() => {
    socket.on('notification', (data) => {
      toast({
        title: data.title,
        description: data.message,
        variant: data.type === 'error' ? 'destructive' : 'default',
        className: "bg-gradient-to-r from-purple-500/90 to-pink-500/90 text-white border-none",
      });
    });

    return () => {
      socket.off('notification');
    };
  }, [toast]);

  // Show loading state only for initial location capture (not if user skipped)
  const showInitialLoader = loading && !userSkipped;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      {/* Show location banner if not granted and not skipped */}
      {!permissionGranted && !userSkipped && !showInitialLoader && (
        <LocationBanner />
      )}

      {/* Initial loading spinner */}
      {showInitialLoader ? (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
          <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md">
            <div className="w-16 h-16 mx-auto mb-4 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {t('initializing_app')}
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              {t('detecting_location')}
            </p>
            <p className="text-sm text-gray-400 mt-2">
              {t('can_skip_hint')}
            </p>
            <button
              onClick={skipForNow}
              className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
            >
              {t('skip_for_now')}
            </button>
          </div>
        </div>
      ) : (
        <>
          <GreenNavbar />
          <main className="flex-1" style={{ marginTop: !permissionGranted && !userSkipped ? '60px' : '0' }}>
            <Suspense fallback={<div className="flex justify-center items-center h-full py-20">{t('loading')}</div>}>
              <Routes>
                {/* Authentication routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<SignUp />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/reset-password/:token" element={<ResetPassword />} />
                {/* Main app routes */}
                <Route path="/" element={<Navigate to="/all-posts" replace />} />
                <Route path="/all-posts" element={<AllPosts />} />
                <Route path="/post/:id" element={<PostDetail />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/security" element={<SecuritySettings />} />
                <Route path="/add-post" element={<AddPost />} />
                <Route path="/tier-selection" element={<TierSelection />} />
                <Route path="/tiers" element={<TierSelection />} />
                <Route path="/pricing" element={<TierSelection />} />
                <Route path="/my-home" element={<MyHome />} />
                <Route path="/home" element={<Home />} />
                <Route path="/for-you" element={<ForYou />} />
                <Route path="/bought-posts" element={<BoughtPosts />} />
                <Route path="/sold-posts" element={<SoldPosts />} />
                <Route path="/buyer-view" element={<BuyerView />} />
                <Route path="/saledone" element={<Saledone />} />
                <Route path="/saleundone" element={<SaleUndone />} />
                <Route path="/admin-panel" element={<AdminPanel />} />
                <Route path="/aadhaar-verify" element={<AadhaarVerify />} />
                <Route path="/public-wall" element={<PublicWall />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/complaints" element={<Complaints />} />
                <Route path="/feedback" element={<Feedback />} />
                <Route path="/rewards" element={<Rewards />} />
                <Route path="/my-recommendations" element={<MyRecommendations />} />
                <Route path="/categories" element={<Categories />} />
                <Route path="/feed" element={<FeedPage />} />
                <Route path="/feed/:id" element={<FeedPostDetail />} />
                <Route path="/my-feed" element={<MyFeedPage />} />
                <Route path="/my-posts" element={<MyFeedPage />} />
                <Route path="/post_add" element={<PostAdd />} />
                <Route path="/feed/feedpostadd" element={<PostAdd noImageUpload={true} />} />
                <Route path="/wishlist" element={<Wishlist />} />
                <Route path="/recently-viewed" element={<RecentlyViewed />} />
                <Route path="/saved-searches" element={<SavedSearches />} />
                <Route path="/verification" element={<Verification />} />
                <Route path="/nearby" element={<NearbyPosts />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/channels" element={<ChannelsListPage />} />
                <Route path="/channels/create" element={<CreateChannelPage />} />
                <Route path="/channels/:id" element={<ChannelPage />} />
                <Route path="/kyc" element={<KycVerification />} />
                <Route path="/payment" element={<PaymentPage />} />
                <Route path="/offers" element={<Offers />} />
                <Route path="/reviews/:userId" element={<Reviews />} />
                <Route path="*" element={<Navigate to="/all-posts" replace />} />
              </Routes>
            </Suspense>
          </main>
          <Toaster />
        </>
      )}
    </div>
  );
}

function App() {
  return (
    <LocationProvider>
      <FilterProvider>
        <AuthProvider>
          {/* MANDATORY: Location must be granted to use app */}
          <LocationGate>
            <AppContent />
          </LocationGate>
        </AuthProvider>
      </FilterProvider>
    </LocationProvider>
  );
}

export default App;


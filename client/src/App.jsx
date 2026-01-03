import React, { Suspense, lazy, useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import GreenNavbar from './components/GreenNavbar.jsx';
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
import { socket } from './lib/socket';
import { FilterProvider } from './context/FilterContext.jsx';
import { LocationProvider, useLocation } from './context/LocationContext.jsx';
import LanguageSelector from './components/LanguageSelector';
import { useTranslation } from 'react-i18next';
import './i18n/index';

// Lazy load pages
const AllPosts = lazy(() => import('./pages/AllPosts.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Profile = lazy(() => import('./pages/Profile.jsx'));
const SignUp = lazy(() => import('./pages/Auth/SignUp.jsx'));
const Login = lazy(() => import('./pages/Auth/Login.jsx'));
const ForgotPassword = lazy(() => import('./pages/Auth/ForgotPassword.jsx'));
const ResetPassword = lazy(() => import('./pages/Auth/ResetPassword.jsx'));
const AddPost = lazy(() => import('./pages/AddPost.jsx'));
const TierSelection = lazy(() => import('./pages/TierSelection.jsx'));
const BuyerView = lazy(() => import('./pages/BuyerView.jsx'));
const Saledone = lazy(() => import('./pages/Saledone.jsx'));
const SaleUndone = lazy(() => import('./pages/SaleUndone.jsx'));
const AdminPanel = lazy(() => import('./pages/AdminPanel.jsx'));
const AadhaarVerify = lazy(() => import('./pages/AadhaarVerify.jsx'));
const PublicWall = lazy(() => import('./pages/PublicWall.jsx'));
const Notifications = lazy(() => import('./pages/Notifications.jsx'));
const Complaints = lazy(() => import('./pages/Complaints.jsx'));
const Feedback = lazy(() => import('./pages/Feedback.jsx'));
const MyHome = lazy(() => import('./pages/MyHome.jsx'));
const Home = lazy(() => import('./pages/Home.jsx'));
const BoughtPosts = lazy(() => import('./pages/BoughtPosts.jsx'));
const SoldPosts = lazy(() => import('./pages/SoldPosts.jsx'));
const PostDetail = lazy(() => import('./pages/PostDetail.jsx'));
const Rewards = lazy(() => import('./pages/Rewards.jsx'));
const MyRecommendations = lazy(() => import('./pages/MyRecommendations.jsx'));
const Categories = lazy(() => import('./pages/Categories.jsx'));
const FeedPage = lazy(() => import('./pages/FeedPage.jsx'));
const FeedPostDetail = lazy(() => import('./pages/FeedPostDetail.jsx'));
const MyFeedPage = lazy(() => import('./pages/MyFeedPage.jsx'));
const PostAdd = lazy(() => import('./pages/PostAdd.jsx'));
const Wishlist = lazy(() => import('./pages/Wishlist.jsx'));
const RecentlyViewed = lazy(() => import('./pages/RecentlyViewed.jsx'));
const SavedSearches = lazy(() => import('./pages/SavedSearches.jsx'));
const Verification = lazy(() => import('./pages/Verification.jsx'));
const NearbyPosts = lazy(() => import('./pages/NearbyPosts.jsx'));
const Chat = lazy(() => import('./pages/Chat.jsx'));

/**
 * Location Banner - Shows when location is not granted
 * Does NOT block the app - just displays a reminder banner
 */
function LocationBanner() {
  const { t } = useTranslation();
  const { error, retry, loading, skipForNow, permissionGranted, userSkipped, enableLocation } = useLocation();

  // Don't show banner if permission granted or user skipped
  if (permissionGranted || userSkipped) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-yellow-100 border-b-2 border-yellow-400 shadow-lg">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📍</span>
          <div>
            <p className="font-semibold text-yellow-900">{t('location_required') || 'Location Required'}</p>
            <p className="text-sm text-yellow-800">
              {loading ? (t('requesting_location') || 'Requesting location...') : error || (t('grant_permission') || 'Enable location for better experience')}
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
                {t('allow_location') || 'Enable'}
              </button>
              <button
                onClick={skipForNow}
                className="px-3 py-2 text-yellow-700 hover:text-yellow-900 font-medium"
              >
                {t('later') || 'Later'}
              </button>
            </>
          )}
          {loading && (
            <div className="flex items-center gap-2 text-yellow-700">
              <div className="w-4 h-4 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm">{t('loading') || 'Please wait...'}</span>
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
  const { loading, permissionGranted, skipForNow, city, userSkipped, enableLocation } = useLocation();
  const { toast } = useToast();

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
              {t('loading') || 'Initializing App'}
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              {t('requesting_location') || 'Detecting your location...'}
            </p>
            <p className="text-sm text-gray-400 mt-2">
              {t('skip_for_now') || '(You can skip this)'}
            </p>
            <button
              onClick={skipForNow}
              className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
            >
              {t('skip_for_now') || 'Skip for now'}
            </button>
          </div>
        </div>
      ) : (
        <>
          <GreenNavbar />
          <main className="flex-1" style={{ marginTop: !permissionGranted && !userSkipped ? '60px' : '0' }}>
            <Suspense fallback={<div className="flex justify-center items-center h-full py-20">{t('loading') || 'Loading...'}</div>}>
              <Routes>
                {/* Authentication routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<SignUp />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                {/* Main app routes */}
                <Route path="/" element={<Navigate to="/all-posts" replace />} />
                <Route path="/all-posts" element={<AllPosts />} />
                <Route path="/post/:id" element={<PostDetail />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/add-post" element={<AddPost />} />
                <Route path="/tier-selection" element={<TierSelection />} />
                <Route path="/my-home" element={<MyHome />} />
                <Route path="/home" element={<Home />} />
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
                <Route path="/post_add" element={<PostAdd />} />
                <Route path="/feed/feedpostadd" element={<PostAdd noImageUpload={true} />} />
                <Route path="/wishlist" element={<Wishlist />} />
                <Route path="/recently-viewed" element={<RecentlyViewed />} />
                <Route path="/saved-searches" element={<SavedSearches />} />
                <Route path="/verification" element={<Verification />} />
                <Route path="/nearby" element={<NearbyPosts />} />
                <Route path="/chat" element={<Chat />} />
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
        <AppContent />
      </FilterProvider>
    </LocationProvider>
  );
}

export default App;


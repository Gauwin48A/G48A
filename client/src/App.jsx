import React, { Suspense, lazy, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import GreenNavbar from './components/GreenNavbar.jsx';
import { Toaster } from "@/components/ui/toaster";
import { FilterProvider } from './context/FilterContext.jsx';
import useLocationPermission from './hooks/useLocationPermission';
import LanguageSelector from './components/LanguageSelector';
import './i18n/index';

// Lazy load pages
const AllPosts = lazy(() => import('./pages/AllPosts.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Profile = lazy(() => import('./pages/Profile.jsx'));
const SignUp = lazy(() => import('./pages/Auth/SignUp.jsx'));
const Login = lazy(() => import('./pages/Auth/Login.jsx'));
const ForgotPassword = lazy(() => import('./pages/Auth/ForgotPassword.jsx'));
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
const BoughtPosts = lazy(() => import('./pages/BoughtPosts.jsx'));
const SoldPosts = lazy(() => import('./pages/SoldPosts.jsx'));
const PostDetail = lazy(() => import('./pages/PostDetail.jsx'));
const Rewards = lazy(() => import('./pages/Rewards.jsx'));
const MyRecommendations = lazy(() => import('./pages/MyRecommendations.jsx'));
const Categories = lazy(() => import('./pages/Categories.jsx'));
const FeedPage = lazy(() => import('./pages/FeedPage.jsx'));
const MyFeedPage = lazy(() => import('./pages/MyFeedPage.jsx'));
const PostAdd = lazy(() => import('./pages/PostAdd.jsx'));

/**
 * Location Banner - Shows when location is not granted
 * Does NOT block the app - just displays a reminder banner
 */
function LocationBanner({ error, retry, loading, onDismiss }) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-yellow-100 border-b-2 border-yellow-400 shadow-lg">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📍</span>
          <div>
            <p className="font-semibold text-yellow-900">Location Required</p>
            <p className="text-sm text-yellow-800">
              {loading ? 'Requesting location...' : error || 'Enable location for better experience'}
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
                Enable
              </button>
              <button
                onClick={() => { setDismissed(true); onDismiss?.(); }}
                className="px-3 py-2 text-yellow-700 hover:text-yellow-900 font-medium"
              >
                Later
              </button>
            </>
          )}
          {loading && (
            <div className="flex items-center gap-2 text-yellow-700">
              <div className="w-4 h-4 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm">Please wait...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function App() {
  // Location hook with timeout safeguard - app will NOT freeze
  const { permissionGranted, loading, error, retry, skipForNow } = useLocationPermission();
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Show loading state only for initial 5-second timeout period
  // After that, app renders regardless of location status
  const showInitialLoader = loading && !bannerDismissed;

  return (
    <FilterProvider>
      <div className="min-h-screen flex flex-col bg-gray-50">
        {/* Show location banner if not granted and not dismissed */}
        {!permissionGranted && !bannerDismissed && !showInitialLoader && (
          <LocationBanner
            error={error}
            retry={retry}
            loading={loading}
            onDismiss={() => { setBannerDismissed(true); skipForNow(); }}
          />
        )}

        {/* Initial loading spinner - max 5 seconds then times out */}
        {showInitialLoader ? (
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
            <div className="text-center p-8 bg-white rounded-2xl shadow-xl max-w-md">
              <div className="w-16 h-16 mx-auto mb-4 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Initializing App</h2>
              <p className="text-gray-600">Requesting location permission...</p>
              <p className="text-sm text-gray-400 mt-2">(Max 5 second wait)</p>
              <button
                onClick={() => { setBannerDismissed(true); skipForNow(); }}
                className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
              >
                Skip for now
              </button>
            </div>
          </div>
        ) : (
          <>
            <GreenNavbar />
            <header className="w-full flex justify-end p-2 bg-white border-b" style={{ marginTop: !permissionGranted && !bannerDismissed ? '60px' : '0' }}>
              <LanguageSelector />
            </header>
            <main className="flex-1">
              <Suspense fallback={<div className="flex justify-center items-center h-full py-20">Loading...</div>}>
                <Routes>
                  {/* Authentication routes */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<SignUp />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  {/* Main app routes */}
                  <Route path="/" element={<Navigate to="/all-posts" replace />} />
                  <Route path="/all-posts" element={<AllPosts />} />
                  <Route path="/post/:id" element={<PostDetail />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/add-post" element={<AddPost />} />
                  <Route path="/tier-selection" element={<TierSelection />} />
                  <Route path="/my-home" element={<MyHome />} />
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
                  <Route path="/my-feed" element={<MyFeedPage />} />
                  <Route path="/post_add" element={<PostAdd />} />
                  <Route path="/feed/feedpostadd" element={<PostAdd noImageUpload={true} />} />
                  <Route path="*" element={<Navigate to="/all-posts" replace />} />
                </Routes>
              </Suspense>
            </main>
            <Toaster />
          </>
        )}
      </div>
    </FilterProvider>
  );
}

export default App;

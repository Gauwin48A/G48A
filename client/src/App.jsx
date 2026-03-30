import React, { Suspense, lazy, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate, Outlet } from "react-router-dom";
import GreenNavbar from "./components/GreenNavbar.jsx";
import PullToRefreshWrapper from "./components/PullToRefreshWrapper.jsx";
import LocationGate from "./components/LocationGate.jsx";
import NotificationPermission from "./components/NotificationPermission.jsx";
import RouteTelemetry from "./components/RouteTelemetry.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import RequireAuth from "./components/RequireAuth.jsx";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
import { socket } from "./lib/socket";
import { FilterProvider } from "./context/FilterContext.jsx";
import { CartProvider } from "./context/CartContext.jsx";
import { LocationProvider, useLocation } from "./context/LocationContext.jsx";
import { useTranslation } from "react-i18next";
import { AuthProvider, useAuth } from "./context/AuthContext";
import VPNBlocker from "./components/VPNBlocker.jsx";
import { App as CapacitorApp } from "@capacitor/app";
import { getUserId } from "@/utils/authStorage";

const LAZY_CACHE_KEY_PREFIX = "mhub:lazy-retry:";
const LAZY_RETRY_WINDOW_MS = 60 * 1000;
const DEV_THROTTLE_MS = 1500;
let lastDevSyncAt = 0;

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
              `[LAZY_RETRY] Reloading after module import failure on "${name}": ${message}`,
            );
          }
          window.location.reload();
          return new Promise(() => {});
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
const CategoryModeSelectPage = lazyWithRetry(
  () => import("./pages/CategoryModeSelect.jsx"),
  "CategoryModeSelect",
);
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
const FeedPage = lazyWithRetry(() => import("./pages/FeedPage.jsx"), "FeedPage");
const FeedPostDetailPage = lazyWithRetry(
  () => import("./pages/FeedPostDetail.jsx"),
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
const ProtectedChatPage = lazyWithRetry(
  () => import("./pages/ProtectedChat.jsx"),
  "ProtectedChat",
);
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
const OffersPage = lazyWithRetry(() => import("./pages/Offers.jsx"), "Offers");
const ReviewsPage = lazyWithRetry(() => import("./pages/Reviews.jsx"), "Reviews");
const AnalyticsPage = lazyWithRetry(() => import("./pages/Analytics.jsx"), "Analytics");
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

function RouteBoundary() {
  return (
    <ErrorBoundary>
      <Outlet />
    </ErrorBoundary>
  );
}

function LocationBanner() {
  const { t } = useTranslation();
  const { error, retry, loading, skipForNow, permissionGranted, userSkipped } = useLocation();

  if (permissionGranted || userSkipped) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-yellow-100 border-b-2 border-yellow-400 shadow-lg">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📍</span>
          <div>
            <p className="font-semibold text-yellow-900">{t("location_required")}</p>
            <p className="text-sm text-yellow-800">
              {loading ? t("requesting_location") : error || t("grant_permission")}
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
                {t("allow_location")}
              </button>
              <button
                onClick={skipForNow}
                className="px-3 py-2 text-yellow-700 hover:text-yellow-900 font-medium"
              >
                {t("later")}
              </button>
            </>
          )}
          {loading && (
            <div className="flex items-center gap-2 text-yellow-700">
              <div className="w-4 h-4 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin" />
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
  const isDev = import.meta.env.DEV;

  useEffect(() => {
    const syncLocation = async () => {
      const userId = getUserId(user);
      if (userId) {
        if (isDev) {
          const now = Date.now();
          if (now - lastDevSyncAt < DEV_THROTTLE_MS) return;
          lastDevSyncAt = now;
        }
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
        // Strip scheme: mhub://post/123 → post/123
        const path = url.replace(/^mhub:\/\//, "");
        if (path.startsWith("post/")) {
          const postId = path.slice(5).split("?")[0];
          if (postId) navigate(`/post/${postId}`);
        } else if (path.startsWith("profile/")) {
          const userId = path.slice(8).split("?")[0];
          if (userId) navigate(`/profile/${userId}`);
        } else if (path.startsWith("feed")) {
          navigate("/feed");
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
        className: "bg-gradient-to-r from-purple-500/90 to-pink-500/90 text-white border-none",
        duration: 4000,
      });
    });
    return () => {
      socket.off("notification");
    };
  }, [toast]);

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
          <RouteTelemetry />
          <PullToRefreshWrapper>
          <main
            className="flex-1 app-main"
            style={{ marginTop: !permissionGranted && !userSkipped ? "112px" : "0" }}
          >
            <Suspense
              fallback={
                <div className="flex justify-center items-center h-full py-20">
                  {t("loading")}
                </div>
              }
            >
              <Routes>
                <Route element={<RouteBoundary />}>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/signup" element={<SignUpPage />} />
                  <Route path="/invite/:code" element={<InviteRedirectPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />
                  <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
                  <Route path="/" element={<Navigate to="/category-hub" replace />} />
                  <Route path="/all-posts" element={<AllPostsPage />} />
                  <Route path="/listings" element={<AllPostsPage />} />
                  <Route path="/post/:id" element={<PostDetailPage />} />
                  <Route path="/listing/:id" element={<PostDetailPage />} />
                  <Route path="/dashboard" element={<RequireAuth><DashboardPage /></RequireAuth>} />
                  <Route path="/activity" element={<RequireAuth><ActivityHubPage /></RequireAuth>} />
                  <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
                  <Route path="/security" element={<RequireAuth><SecuritySettingsPage /></RequireAuth>} />
                  <Route path="/add-post" element={<RequireAuth><AddPostPage /></RequireAuth>} />
                  <Route path="/post-welcome" element={<RequireAuth><PostWelcomePage /></RequireAuth>} />
                  <Route path="/sell" element={<RequireAuth><AddPostPage /></RequireAuth>} />
                  <Route path="/category-mode" element={<CategoryModeSelectPage />} />
                  <Route path="/category-hub" element={<CategoryHubPage />} />
                  <Route path="/edit-post/:postId" element={<RequireAuth><EditPostPage /></RequireAuth>} />
                  <Route path="/tier-selection" element={<RequireAuth><TierSelectionPage /></RequireAuth>} />
                  <Route path="/tiers" element={<RequireAuth><TierSelectionPage /></RequireAuth>} />
                  <Route path="/pricing" element={<RequireAuth><TierSelectionPage /></RequireAuth>} />
                  <Route path="/my-home" element={<RequireAuth><MyHomePage /></RequireAuth>} />
                  <Route path="/home" element={<HomePage />} />
                  <Route path="/for-you" element={<ForYouPage />} />
                  <Route path="/bought-posts" element={<RequireAuth><BoughtPostsPage /></RequireAuth>} />
                  <Route path="/sold-posts" element={<RequireAuth><SoldPostsPage /></RequireAuth>} />
                  <Route path="/buyer-view" element={<RequireAuth><BuyerViewPage /></RequireAuth>} />
                  <Route path="/saledone" element={<RequireAuth><SaledonePage /></RequireAuth>} />
                  <Route path="/saleundone" element={<RequireAuth><SaleUndonePage /></RequireAuth>} />
                  <Route
                    path="/admin-panel"
                    element={
                      <RequireAuth requiredRoles={["admin", "super_admin", "superadmin"]}>
                        <AdminPanelPage />
                      </RequireAuth>
                    }
                  />
                  <Route path="/aadhaar-verify" element={<RequireAuth><AadhaarVerifyPage /></RequireAuth>} />
                  <Route path="/public-wall" element={<PublicWallPage />} />
                  <Route path="/notifications" element={<RequireAuth><NotificationsPage /></RequireAuth>} />
                  <Route path="/complaints" element={<RequireAuth><ComplaintsPage /></RequireAuth>} />
                  <Route path="/feedback" element={<RequireAuth><FeedbackPage /></RequireAuth>} />
                  <Route path="/rewards" element={<RequireAuth><RewardsPage /></RequireAuth>} />
                  <Route path="/my-recommendations" element={<Navigate to="/for-you" replace />} />
                  <Route path="/categories" element={<SubcategoriesPage />} />
                  <Route path="/subcategories" element={<SubcategoriesPage />} />
                  <Route path="/categories/:slug" element={<Navigate to="/all-posts" replace />} />
                  <Route path="/feed" element={<FeedPage />} />
                  <Route path="/feed/:id" element={<FeedPostDetailPage />} />
                  <Route path="/my-feed" element={<RequireAuth><MyFeedPage /></RequireAuth>} />
                  <Route path="/my-posts" element={<RequireAuth><MyHomePage /></RequireAuth>} />
                  <Route path="/post_add" element={<RequireAuth><PostAddPage /></RequireAuth>} />
                  <Route path="/feed/feedpostadd" element={<RequireAuth><PostAddPage noImageUpload={true} /></RequireAuth>} />
                  <Route path="/wishlist" element={<RequireAuth><WishlistPage /></RequireAuth>} />
                  <Route path="/cart" element={<RequireAuth><CartPage /></RequireAuth>} />
                  <Route path="/recently-viewed" element={<RequireAuth><RecentlyViewedPage /></RequireAuth>} />
                  <Route path="/saved-searches" element={<RequireAuth><SavedSearchesPage /></RequireAuth>} />
                  <Route path="/verification" element={<RequireAuth><VerificationPage /></RequireAuth>} />
                  <Route path="/nearby" element={<RequireAuth><NearbyPostsPage /></RequireAuth>} />
                  <Route path="/chat" element={<RequireAuth><ProtectedChatPage /></RequireAuth>} />
                  <Route path="/chats" element={<RequireAuth><ProtectedChatPage /></RequireAuth>} />
                  <Route path="/t&c" element={<TermsPage />} />
                  <Route path="/terms" element={<TermsPage />} />
                  <Route path="/terms-and-conditions" element={<TermsPage />} />
                  <Route path="/privacy-policy" element={<PrivacyPage />} />
                  <Route path="/refund-policy" element={<RefundPage />} />
                  <Route path="/support-ticket-policy" element={<SupportTicketPage />} />
                  <Route path="/search" element={<SearchPage />} />
                  <Route path="/analytics" element={<AnalyticsPage />} />
                  <Route path="/channels" element={<ChannelsListPage />} />
                  <Route path="/channels/create" element={<RequireAuth><CreateChannelPage /></RequireAuth>} />
                  <Route path="/channels/:id" element={<ChannelPage />} />
                  <Route path="/centre" element={<RequireAuth><ChannelsListPage variant="centre" /></RequireAuth>} />
                  <Route path="/centre/create" element={<RequireAuth><CreateChannelPage variant="centre" /></RequireAuth>} />
                  <Route path="/centre/:id/listings" element={<RequireAuth><CentreListingsPage /></RequireAuth>} />
                  <Route path="/centre/:id" element={<RequireAuth><ChannelPage variant="centre" /></RequireAuth>} />
                  <Route path="/kyc" element={<RequireAuth><KycVerificationPage /></RequireAuth>} />
                  <Route path="/payment" element={<RequireAuth><PaymentPage /></RequireAuth>} />
                  <Route path="/offers" element={<OffersPage />} />
                  <Route path="/reviews/:userId" element={<ReviewsPage />} />
                  <Route path="*" element={<Navigate to="/category-hub" replace />} />
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
              </LocationGate>
            </CartProvider>
          </AuthProvider>
        </FilterProvider>
      </LocationProvider>
    </VPNBlocker>
  );
}

export default App;

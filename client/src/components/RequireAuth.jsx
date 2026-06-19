import React from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { PageAuthGateState } from "@/components/page-state/PageStateBlocks";
import {
  Gift, UserCircle, LayoutDashboard, Bell, ShoppingCart, Heart,
  CreditCard, MessageSquare, HelpCircle, ShieldCheck, MapPin, Lock,
  PlusCircle, Tag, Edit3, Sparkles, Package, ShoppingBag, Rss,
  BarChart3, Clock, FileText, Trash2, Eye, Search, Bookmark,
  HandCoins, Undo2, Star,
} from "lucide-react";

const normalizeRole = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const buildReturnTo = (location) => {
  if (!location) return "/all-posts";
  const path = `${location.pathname || ""}${location.search || ""}${location.hash || ""}`.trim();
  return path && path !== "/login" ? path : "/all-posts";
};

const hasAllowedRole = (user, requiredRoles = []) => {
  if (!requiredRoles || requiredRoles.length === 0) return true;
  const role = normalizeRole(user?.role || user?.userRole || user?.user_role);
  if (!role) return false;
  const allowed = new Set(requiredRoles.map(normalizeRole));
  return allowed.has(role);
};

const AUTH_GATE_CONTENT = {
  "/rewards": {
    title: "Sign in to view Rewards",
    description: "Earn points and redeem exclusive rewards by signing in to your account.",
    highlights: ["Earn coins faster", "Redeem member perks", "Track your streaks"],
    icon: Gift,
    benefits: [
      { label: "Daily Coins", hint: "Earn up to 50 coins/day" },
      { label: "Streak Bonus", hint: "7-day login multiplier" },
      { label: "Member Perks", hint: "Exclusive deals & boosts" },
      { label: "Redeem Store", hint: "Spend coins on upgrades" },
    ],
    tone: "rewards",
    backgroundClass:
      "from-fuchsia-50 via-violet-50 to-rose-100 dark:from-slate-950 dark:via-fuchsia-950/25 dark:to-slate-950",
    primaryClassName: "bg-fuchsia-600 hover:bg-fuchsia-700 text-white",
    secondaryClassName:
      "border-fuchsia-200 text-fuchsia-800 hover:bg-fuchsia-50 dark:border-fuchsia-500/40 dark:text-fuchsia-200 dark:hover:bg-fuchsia-900/30",
  },
  "/profile": {
    title: "Sign in to view your Profile",
    description: "Manage your listings, settings, and account details after signing in.",
    highlights: ["Edit listings", "Update preferences", "Build buyer trust"],
    icon: UserCircle,
    benefits: [
      { label: "Your Listings", hint: "Manage all your posts" },
      { label: "Trust Score", hint: "Build verified reputation" },
      { label: "Preferences", hint: "Language, theme & more" },
      { label: "Account", hint: "Security & privacy" },
    ],
    tone: "profile",
    backgroundClass:
      "from-cyan-50 via-sky-50 to-indigo-100 dark:from-slate-950 dark:via-cyan-950/25 dark:to-slate-950",
    primaryClassName: "bg-cyan-600 hover:bg-cyan-700 text-white",
    secondaryClassName:
      "border-cyan-200 text-cyan-800 hover:bg-cyan-50 dark:border-cyan-500/40 dark:text-cyan-200 dark:hover:bg-cyan-900/30",
  },
  "/dashboard": {
    title: "Sign in to access your Dashboard",
    description: "Track your activity, manage posts, and view analytics after signing in.",
    highlights: ["Activity insights", "Post performance", "Revenue overview"],
    icon: LayoutDashboard,
    benefits: [
      { label: "Stat Cards", hint: "Views, likes & revenue" },
      { label: "Post Manager", hint: "Active & expired posts" },
      { label: "Buyer/Seller", hint: "Toggle dashboard view" },
      { label: "Quick Actions", hint: "List, boost & share" },
    ],
    tone: "profile",
    backgroundClass:
      "from-sky-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-blue-950/25 dark:to-slate-950",
    primaryClassName: "bg-blue-600 hover:bg-blue-700 text-white",
    secondaryClassName:
      "border-blue-200 text-blue-800 hover:bg-blue-50 dark:border-blue-500/40 dark:text-blue-200 dark:hover:bg-blue-900/30",
  },
  "/notifications": {
    title: "Sign in to view Notifications",
    description: "Stay updated on replies and activity in your account.",
    highlights: ["Offer updates", "Message alerts", "Security notices"],
    icon: Bell,
    benefits: [
      { label: "Offer Alerts", hint: "New offers on your posts" },
      { label: "Chat Messages", hint: "Buyer/seller replies" },
      { label: "Price Drops", hint: "Wishlist item updates" },
      { label: "Security", hint: "Login & session alerts" },
    ],
    tone: "notifications",
    backgroundClass:
      "from-sky-50 via-cyan-50 to-emerald-100 dark:from-slate-950 dark:via-sky-950/25 dark:to-slate-950",
    primaryClassName: "bg-sky-600 hover:bg-sky-700 text-white",
    secondaryClassName:
      "border-sky-200 text-sky-800 hover:bg-sky-50 dark:border-sky-500/40 dark:text-sky-200 dark:hover:bg-sky-900/30",
  },
  "/cart": {
    title: "Sign in to view your Cart",
    description: "Your saved items are waiting - sign in to continue.",
    highlights: ["Saved items", "Faster checkout", "Price drop alerts"],
    icon: ShoppingCart,
    benefits: [
      { label: "Saved Items", hint: "Resume where you left" },
      { label: "Price Alerts", hint: "Get notified on drops" },
      { label: "Quick Buy", hint: "One-tap checkout" },
      { label: "Order History", hint: "Track past purchases" },
    ],
    tone: "wishlist",
    backgroundClass:
      "from-rose-50 via-pink-50 to-orange-100 dark:from-slate-950 dark:via-rose-950/25 dark:to-slate-950",
    primaryClassName: "bg-rose-600 hover:bg-rose-700 text-white",
    secondaryClassName:
      "border-rose-200 text-rose-800 hover:bg-rose-50 dark:border-rose-500/40 dark:text-rose-200 dark:hover:bg-rose-900/30",
  },
  "/wishlist": {
    title: "Sign in to view your Wishlist",
    description: "Save favorites and get notified when prices change.",
    highlights: ["Save favorites", "Deal alerts", "One-tap checkout"],
    icon: Heart,
    benefits: [
      { label: "Save Items", hint: "Bookmark for later" },
      { label: "Price Watch", hint: "Alert on price drops" },
      { label: "Compare", hint: "Side-by-side compare" },
      { label: "Share List", hint: "Send to friends" },
    ],
    tone: "wishlist",
    backgroundClass:
      "from-rose-50 via-pink-50 to-fuchsia-100 dark:from-slate-950 dark:via-rose-950/25 dark:to-slate-950",
    primaryClassName: "bg-rose-600 hover:bg-rose-700 text-white",
    secondaryClassName:
      "border-rose-200 text-rose-800 hover:bg-rose-50 dark:border-rose-500/40 dark:text-rose-200 dark:hover:bg-rose-900/30",
  },
  "/tier-selection": {
    title: "Sign in to manage your Plan",
    description: "Choose the right plan and unlock premium visibility.",
    highlights: ["Compare plans", "Unlock boosts", "Manage billing"],
    icon: CreditCard,
    benefits: [
      { label: "Free Tier", hint: "5 listings included" },
      { label: "Bronze", hint: "50 listings + boosts" },
      { label: "Silver", hint: "200 listings + priority" },
      { label: "Gold", hint: "Unlimited + analytics" },
    ],
  },
  "/feedback": {
    title: "Sign in to share Feedback",
    description: "Help us improve the experience with your feedback.",
    highlights: ["Report issues", "Suggest features", "Track responses"],
    icon: MessageSquare,
    benefits: [
      { label: "Bug Reports", hint: "Help us fix issues" },
      { label: "Feature Ideas", hint: "Shape the roadmap" },
      { label: "Track Status", hint: "See resolution updates" },
      { label: "Priority", hint: "Members get faster reply" },
    ],
  },
  "/complaints": {
    title: "Sign in to file Complaints",
    description: "Report issues and track the resolution status.",
    highlights: ["File complaints", "Track status", "Secure support"],
    icon: HelpCircle,
    benefits: [
      { label: "File Report", hint: "Describe the issue" },
      { label: "Track Progress", hint: "Real-time updates" },
      { label: "Resolution", hint: "Guaranteed follow-up" },
      { label: "Escalate", hint: "Priority support path" },
    ],
  },
  "/verification": {
    title: "Sign in to verify your Account",
    description: "Verify your identity to unlock trusted selling.",
    highlights: ["Verify identity", "Unlock trust badge", "Access full features"],
    icon: ShieldCheck,
    benefits: [
      { label: "Aadhaar KYC", hint: "Quick verification" },
      { label: "Trust Badge", hint: "Verified seller tag" },
      { label: "Full Access", hint: "All features unlocked" },
      { label: "Buyer Trust", hint: "Higher conversion rate" },
    ],
  },
  "/nearby": {
    title: "Sign in to view Nearby",
    description: "Discover listings around your location after signing in.",
    highlights: ["Local listings", "Distance filters", "Instant chats"],
    icon: MapPin,
    benefits: [
      { label: "Local Deals", hint: "Within your radius" },
      { label: "Distance Sort", hint: "Closest items first" },
      { label: "Map View", hint: "Browse on map" },
      { label: "Meet & Buy", hint: "Arrange local pickup" },
    ],
  },
  "/security": {
    title: "Authentication Required",
    description: "Please sign in to manage security settings and active sessions.",
    highlights: ["Protect your account", "Manage sessions", "Enable 2FA"],
    icon: Lock,
    badge: "Authentication Required",
    primaryLabel: "Go to Login",
    secondaryLabel: "Browse Marketplace",
    benefits: [
      { label: "2FA Setup", hint: "Extra login security" },
      { label: "Sessions", hint: "View active logins" },
      { label: "Password", hint: "Change your password" },
      { label: "Privacy", hint: "Control visibility" },
    ],
  },
  "/add-post": {
    title: "Sign in to list your item",
    description: "Create a listing with photos, price, and description to start selling.",
    highlights: ["Upload photos", "Set your price", "Reach local buyers"],
    icon: PlusCircle,
    benefits: [
      { label: "Add Photos", hint: "Up to 10 images" },
      { label: "Set Price", hint: "Fixed or negotiable" },
      { label: "Categories", hint: "Auto-suggested tags" },
      { label: "Go Live", hint: "Instant visibility" },
    ],
    tone: "default",
    backgroundClass:
      "from-emerald-50 via-green-50 to-teal-100 dark:from-slate-950 dark:via-emerald-950/25 dark:to-slate-950",
    primaryClassName: "bg-emerald-600 hover:bg-emerald-700 text-white",
    secondaryClassName:
      "border-emerald-200 text-emerald-800 hover:bg-emerald-50 dark:border-emerald-500/40 dark:text-emerald-200 dark:hover:bg-emerald-900/30",
  },
  "/sell": {
    title: "Sign in to start selling",
    description: "List your products and connect with buyers in your area.",
    highlights: ["Quick listing", "Set your price", "Instant visibility"],
    icon: Tag,
    tone: "default",
    backgroundClass:
      "from-emerald-50 via-green-50 to-teal-100 dark:from-slate-950 dark:via-emerald-950/25 dark:to-slate-950",
    primaryClassName: "bg-emerald-600 hover:bg-emerald-700 text-white",
    secondaryClassName:
      "border-emerald-200 text-emerald-800 hover:bg-emerald-50 dark:border-emerald-500/40 dark:text-emerald-200 dark:hover:bg-emerald-900/30",
  },
  "/edit-post": {
    title: "Sign in to edit your post",
    description: "Update your listing details, photos, or pricing.",
    highlights: ["Update photos", "Change price", "Edit description"],
    icon: Edit3,
    tone: "default",
    backgroundClass:
      "from-amber-50 via-yellow-50 to-orange-100 dark:from-slate-950 dark:via-amber-950/25 dark:to-slate-950",
    primaryClassName: "bg-amber-600 hover:bg-amber-700 text-white",
    secondaryClassName:
      "border-amber-200 text-amber-800 hover:bg-amber-50 dark:border-amber-500/40 dark:text-amber-200 dark:hover:bg-amber-900/30",
  },
  "/post-welcome": {
    title: "Sign in to celebrate your listing",
    description: "Your post is ready! Sign in to see your publishing dashboard.",
    highlights: ["Track views", "Manage responses", "Boost visibility"],
    icon: Sparkles,
    tone: "default",
    backgroundClass:
      "from-violet-50 via-purple-50 to-fuchsia-100 dark:from-slate-950 dark:via-violet-950/25 dark:to-slate-950",
    primaryClassName: "bg-violet-600 hover:bg-violet-700 text-white",
    secondaryClassName:
      "border-violet-200 text-violet-800 hover:bg-violet-50 dark:border-violet-500/40 dark:text-violet-200 dark:hover:bg-violet-900/30",
  },
  "/post_add": {
    title: "Sign in to create a post",
    description: "Share your product with buyers in your neighbourhood.",
    highlights: ["Upload photos", "Set your price", "Reach local buyers"],
    icon: PlusCircle,
    tone: "default",
    backgroundClass:
      "from-emerald-50 via-green-50 to-teal-100 dark:from-slate-950 dark:via-emerald-950/25 dark:to-slate-950",
    primaryClassName: "bg-emerald-600 hover:bg-emerald-700 text-white",
    secondaryClassName:
      "border-emerald-200 text-emerald-800 hover:bg-emerald-50 dark:border-emerald-500/40 dark:text-emerald-200 dark:hover:bg-emerald-900/30",
  },
  "/feed": {
    title: "Sign in to post on your Feed",
    description: "Share updates with your followers and grow your audience.",
    highlights: ["Share to feed", "Engage followers", "Build your brand"],
    icon: Rss,
    tone: "default",
    backgroundClass:
      "from-indigo-50 via-blue-50 to-sky-100 dark:from-slate-950 dark:via-indigo-950/25 dark:to-slate-950",
    primaryClassName: "bg-indigo-600 hover:bg-indigo-700 text-white",
    secondaryClassName:
      "border-indigo-200 text-indigo-800 hover:bg-indigo-50 dark:border-indigo-500/40 dark:text-indigo-200 dark:hover:bg-indigo-900/30",
  },
  "/sold-posts": {
    title: "Sign in to view Sales History",
    description: "Track completed sales and revisit your receipts.",
    highlights: ["Sale receipts", "Revenue tracking", "Buyer history"],
    icon: Package,
    benefits: [
      { label: "Sale History", hint: "All past transactions" },
      { label: "Revenue", hint: "Total earnings tracked" },
      { label: "Receipts", hint: "Download invoices" },
      { label: "Re-list", hint: "Sell similar items" },
    ],
    tone: "default",
    backgroundClass:
      "from-emerald-50 via-teal-50 to-green-100 dark:from-slate-950 dark:via-emerald-950/25 dark:to-slate-950",
    primaryClassName: "bg-emerald-600 hover:bg-emerald-700 text-white",
    secondaryClassName:
      "border-emerald-200 text-emerald-800 hover:bg-emerald-50 dark:border-emerald-500/40 dark:text-emerald-200 dark:hover:bg-emerald-900/30",
  },
  "/bought-posts": {
    title: "Sign in to view Purchases",
    description: "Review your order history and track past purchases.",
    highlights: ["Order history", "Payment receipts", "Reorder items"],
    icon: ShoppingBag,
    benefits: [
      { label: "Orders", hint: "All purchases tracked" },
      { label: "Receipts", hint: "Download payment proof" },
      { label: "Re-order", hint: "Buy again in 1 tap" },
      { label: "Reviews", hint: "Rate your purchases" },
    ],
    tone: "default",
    backgroundClass:
      "from-sky-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-sky-950/25 dark:to-slate-950",
    primaryClassName: "bg-sky-600 hover:bg-sky-700 text-white",
    secondaryClassName:
      "border-sky-200 text-sky-800 hover:bg-sky-50 dark:border-sky-500/40 dark:text-sky-200 dark:hover:bg-sky-900/30",
  },
  "/my-feed": {
    title: "Sign in to manage your Feed",
    description: "View your posts, stats, and audience engagement.",
    highlights: ["Post analytics", "Audience stats", "Content management"],
    icon: BarChart3,
    tone: "default",
    backgroundClass:
      "from-violet-50 via-purple-50 to-indigo-100 dark:from-slate-950 dark:via-violet-950/25 dark:to-slate-950",
    primaryClassName: "bg-violet-600 hover:bg-violet-700 text-white",
    secondaryClassName:
      "border-violet-200 text-violet-800 hover:bg-violet-50 dark:border-violet-500/40 dark:text-violet-200 dark:hover:bg-violet-900/30",
  },
  "/account/delete": {
    title: "Sign in to manage Account Deletion",
    description: "Verify your identity before requesting account deletion.",
    highlights: ["Verify identity", "Confirm deletion", "Download your data"],
    icon: Trash2,
    badge: "Sensitive Action",
    tone: "default",
    backgroundClass:
      "from-red-50 via-rose-50 to-orange-100 dark:from-slate-950 dark:via-red-950/25 dark:to-slate-950",
    primaryClassName: "bg-red-600 hover:bg-red-700 text-white",
    secondaryClassName:
      "border-red-200 text-red-800 hover:bg-red-50 dark:border-red-500/40 dark:text-red-200 dark:hover:bg-red-900/30",
  },
  "/analytics": {
    title: "Sign in to view Analytics",
    description: "Track your performance, views, and engagement metrics.",
    highlights: ["View counts", "Engagement trends", "Revenue insights"],
    icon: BarChart3,
    benefits: [
      { label: "Views", hint: "Total post impressions" },
      { label: "Engagement", hint: "Likes, saves & shares" },
      { label: "Revenue", hint: "Sales performance" },
      { label: "Trends", hint: "7/30/90 day charts" },
    ],
    tone: "default",
    backgroundClass:
      "from-sky-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-blue-950/25 dark:to-slate-950",
    primaryClassName: "bg-blue-600 hover:bg-blue-700 text-white",
    secondaryClassName:
      "border-blue-200 text-blue-800 hover:bg-blue-50 dark:border-blue-500/40 dark:text-blue-200 dark:hover:bg-blue-900/30",
  },
  "/recently-viewed": {
    title: "Sign in to see Recently Viewed",
    description: "Pick up where you left off and compare items you browsed.",
    highlights: ["Browsing history", "Quick compare", "Price change alerts"],
    icon: Clock,
    tone: "default",
    backgroundClass:
      "from-amber-50 via-orange-50 to-yellow-100 dark:from-slate-950 dark:via-amber-950/25 dark:to-slate-950",
    primaryClassName: "bg-amber-600 hover:bg-amber-700 text-white",
    secondaryClassName:
      "border-amber-200 text-amber-800 hover:bg-amber-50 dark:border-amber-500/40 dark:text-amber-200 dark:hover:bg-amber-900/30",
  },
  "/my-posts": {
    title: "Sign in to manage your Posts",
    description: "View, edit, and track performance of your listings.",
    highlights: ["Manage listings", "View responses", "Track performance"],
    icon: FileText,
  },
  "/my-home": {
    title: "Sign in to access My Home",
    description: "Your personalized hub for account activity and shortcuts.",
    highlights: ["Quick actions", "Account overview", "Activity feed"],
    icon: LayoutDashboard,
  },
  "/buyer-view": {
    title: "Sign in to view Buyer Profile",
    description: "See buyer ratings, reviews, and transaction history.",
    highlights: ["Buyer ratings", "Transaction history", "Trust score"],
    icon: Eye,
    tone: "default",
    backgroundClass:
      "from-teal-50 via-cyan-50 to-emerald-100 dark:from-slate-950 dark:via-teal-950/25 dark:to-slate-950",
    primaryClassName: "bg-teal-600 hover:bg-teal-700 text-white",
    secondaryClassName:
      "border-teal-200 text-teal-800 hover:bg-teal-50 dark:border-teal-500/40 dark:text-teal-200 dark:hover:bg-teal-900/30",
  },
  "/saledone": {
    title: "Sign in to mark items as Sold",
    description: "Update your listing status and celebrate your sale!",
    highlights: ["Mark as sold", "Update status", "Sale receipt"],
    icon: Package,
    tone: "default",
    backgroundClass:
      "from-green-50 via-emerald-50 to-lime-100 dark:from-slate-950 dark:via-green-950/25 dark:to-slate-950",
    primaryClassName: "bg-green-600 hover:bg-green-700 text-white",
    secondaryClassName:
      "border-green-200 text-green-800 hover:bg-green-50 dark:border-green-500/40 dark:text-green-200 dark:hover:bg-green-900/30",
  },
  "/saleundone": {
    title: "Sign in to undo a Sale",
    description: "Re-list an item that was marked sold by mistake.",
    highlights: ["Undo sale", "Re-list item", "Update inventory"],
    icon: Undo2,
    tone: "default",
    backgroundClass:
      "from-amber-50 via-yellow-50 to-orange-100 dark:from-slate-950 dark:via-amber-950/25 dark:to-slate-950",
    primaryClassName: "bg-amber-600 hover:bg-amber-700 text-white",
    secondaryClassName:
      "border-amber-200 text-amber-800 hover:bg-amber-50 dark:border-amber-500/40 dark:text-amber-200 dark:hover:bg-amber-900/30",
  },
  "/saved-searches": {
    title: "Sign in to view Saved Searches",
    description: "Get notified when new items match your search criteria.",
    highlights: ["Search alerts", "Price tracking", "Quick re-search"],
    icon: Bookmark,
    tone: "default",
    backgroundClass:
      "from-indigo-50 via-blue-50 to-violet-100 dark:from-slate-950 dark:via-indigo-950/25 dark:to-slate-950",
    primaryClassName: "bg-indigo-600 hover:bg-indigo-700 text-white",
    secondaryClassName:
      "border-indigo-200 text-indigo-800 hover:bg-indigo-50 dark:border-indigo-500/40 dark:text-indigo-200 dark:hover:bg-indigo-900/30",
  },
  "/aadhaar-verify": {
    title: "Sign in to verify your Identity",
    description: "Complete Aadhaar verification to unlock trusted seller status.",
    highlights: ["Aadhaar verification", "Trust badge", "Full access"],
    icon: ShieldCheck,
    tone: "default",
    backgroundClass:
      "from-orange-50 via-amber-50 to-yellow-100 dark:from-slate-950 dark:via-orange-950/25 dark:to-slate-950",
    primaryClassName: "bg-orange-600 hover:bg-orange-700 text-white",
    secondaryClassName:
      "border-orange-200 text-orange-800 hover:bg-orange-50 dark:border-orange-500/40 dark:text-orange-200 dark:hover:bg-orange-900/30",
  },
  "/offers": {
    title: "Sign in to view your Offers",
    description: "Manage negotiations, counter-offers, and deals.",
    highlights: ["Active offers", "Counter-offer", "Deal history"],
    icon: HandCoins,
    benefits: [
      { label: "Active Offers", hint: "Pending negotiations" },
      { label: "Counter", hint: "Send counter-offers" },
      { label: "History", hint: "All past deals" },
      { label: "Alerts", hint: "New offer notifications" },
    ],
    tone: "default",
    backgroundClass:
      "from-purple-50 via-violet-50 to-fuchsia-100 dark:from-slate-950 dark:via-purple-950/25 dark:to-slate-950",
    primaryClassName: "bg-purple-600 hover:bg-purple-700 text-white",
    secondaryClassName:
      "border-purple-200 text-purple-800 hover:bg-purple-50 dark:border-purple-500/40 dark:text-purple-200 dark:hover:bg-purple-900/30",
  },
};

const getGateContent = (pathname) => {
  const match = Object.keys(AUTH_GATE_CONTENT).find((k) => pathname.startsWith(k));
  const defaults = {
    title: "Sign in to continue",
    description: "This page requires an account. Sign in or create one to proceed.",
    highlights: ["Secure sign-in", "Personalized experience", "Sync across devices"],
    badge: "Account Required",
    primaryLabel: "Sign In",
    secondaryLabel: "Browse Marketplace",
    tone: "default",
    backgroundClass:
      "from-slate-50 via-white to-slate-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950",
    primaryClassName: "bg-blue-600 hover:bg-blue-700 text-white",
    secondaryClassName:
      "border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800",
    cardClassName:
      "mx-auto w-full max-w-[640px] border-white/70 bg-white/88 shadow-2xl backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-900/76",
  };
  return match
    ? { ...defaults, ...AUTH_GATE_CONTENT[match] }
    : defaults;
};

export default function RequireAuth({
  children,
  redirectTo = "/login",
  requiredRoles = [],
  fallback = null,
}) {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const authed = Boolean(isAuthenticated ?? user);
  const returnTo = buildReturnTo(location);

  if (loading) {
    if (typeof fallback === "function") {
      return fallback({ returnTo, loading: true });
    }
    if (fallback) return fallback;
    // Show a minimal skeleton instead of null to prevent blank screens
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  if (!authed) {
    if (typeof fallback === "function") {
      return fallback({ returnTo });
    }
    if (fallback) {
      return fallback;
    }
    const queryJoiner = redirectTo.includes("?") ? "&" : "?";
    const loginTarget = `${redirectTo}${queryJoiner}returnTo=${encodeURIComponent(returnTo)}`;
    const {
      title,
      description,
      highlights,
      badge,
      primaryLabel,
      secondaryLabel,
      tone,
      backgroundClass,
      primaryClassName,
      secondaryClassName,
      cardClassName,
      icon,
      benefits,
    } = getGateContent(location.pathname);
    return (
      <div className={`min-h-screen mhub-premium-page bg-gradient-to-br ${backgroundClass}`}>
        <div className="page-shell page-pad min-h-[calc(100dvh-5rem)] flex items-start sm:items-center justify-center py-10 sm:py-12">
          <PageAuthGateState
            title={title}
            description={description}
            badge={badge}
            highlights={highlights}
            tone={tone}
            icon={icon}
            benefits={benefits}
            className={cardClassName}
            primaryAction={
              <Button className={primaryClassName} onClick={() => navigate(loginTarget)}>
                {primaryLabel}
              </Button>
            }
            secondaryAction={
              <Button
                variant="outline"
                className={secondaryClassName}
                onClick={() => navigate("/all-posts")}
              >
                {secondaryLabel}
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  if (!hasAllowedRole(user, requiredRoles)) {
    return <Navigate to="/all-posts" replace />;
  }

  return children;
}

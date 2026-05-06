import React from "react";
import { useNavigate } from "react-router-dom";
import {
  ShoppingCart, Heart, Clock, Search, Rss, Star,
  Package, TrendingUp, BarChart3, Bookmark, MessageSquare,
  FileText,
} from "lucide-react";

const CONFIGS = {
  wishlist: {
    icon: Heart,
    iconColor: "text-rose-500",
    bgGradient: "from-rose-50 to-pink-50 dark:from-rose-950/20 dark:to-pink-950/20",
    title: "Your wishlist is empty",
    message: "Items you save will appear here for easy access.",
    primaryLabel: "Browse Marketplace",
    primaryTo: "/all-posts",
  },
  cart: {
    icon: ShoppingCart,
    iconColor: "text-orange-500",
    bgGradient: "from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20",
    title: "Your cart is empty",
    message: "Add items to your cart to start shopping.",
    primaryLabel: "Browse Marketplace",
    primaryTo: "/all-posts",
  },
  "recently-viewed": {
    icon: Clock,
    iconColor: "text-amber-500",
    bgGradient: "from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20",
    title: "No recently viewed items",
    message: "Items you browse will show up here.",
    primaryLabel: "Start Browsing",
    primaryTo: "/all-posts",
  },
  "saved-searches": {
    icon: Bookmark,
    iconColor: "text-indigo-500",
    bgGradient: "from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20",
    title: "No saved searches",
    message: "Save a search to get notified when new items match.",
    primaryLabel: "Search Now",
    primaryTo: "/search",
  },
  "sold-posts": {
    icon: Package,
    iconColor: "text-emerald-500",
    bgGradient: "from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20",
    title: "No sales yet",
    message: "List items you want to sell and track completed sales here.",
    primaryLabel: "List an Item",
    primaryTo: "/add-post",
    secondaryLabel: "View My Posts",
    secondaryTo: "/my-posts",
  },
  "bought-posts": {
    icon: ShoppingCart,
    iconColor: "text-sky-500",
    bgGradient: "from-sky-50 to-blue-50 dark:from-sky-950/20 dark:to-blue-950/20",
    title: "No purchases yet",
    message: "Items you buy from the marketplace will appear here.",
    primaryLabel: "Browse Marketplace",
    primaryTo: "/all-posts",
    secondaryLabel: "For You",
    secondaryTo: "/for-you",
  },
  feed: {
    icon: Rss,
    iconColor: "text-blue-500",
    bgGradient: "from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20",
    title: "No posts in your feed",
    message: "Follow channels and sellers to see their updates here.",
    primaryLabel: "Explore Channels",
    primaryTo: "/channels",
  },
  analytics: {
    icon: BarChart3,
    iconColor: "text-violet-500",
    bgGradient: "from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20",
    title: "No analytics data yet",
    message: "Post a listing to start tracking views and engagement.",
    primaryLabel: "Create a Post",
    primaryTo: "/add-post",
  },
  reviews: {
    icon: Star,
    iconColor: "text-yellow-500",
    bgGradient: "from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20",
    title: "No reviews yet",
    message: "Reviews from buyers and sellers will appear here.",
    primaryLabel: "Browse Marketplace",
    primaryTo: "/all-posts",
  },
  search: {
    icon: Search,
    iconColor: "text-gray-500",
    bgGradient: "from-gray-50 to-slate-50 dark:from-gray-950/20 dark:to-slate-950/20",
    title: "No results found",
    message: "Try different keywords or browse categories.",
    primaryLabel: "Browse Categories",
    primaryTo: "/category-hub",
  },
  chat: {
    icon: MessageSquare,
    iconColor: "text-green-500",
    bgGradient: "from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20",
    title: "No conversations yet",
    message: "Start chatting with sellers or buyers.",
    primaryLabel: "Browse Marketplace",
    primaryTo: "/all-posts",
  },
  notifications: {
    icon: TrendingUp,
    iconColor: "text-sky-500",
    bgGradient: "from-sky-50 to-cyan-50 dark:from-sky-950/20 dark:to-cyan-950/20",
    title: "No notifications",
    message: "You're all caught up! Notifications will appear here.",
    primaryLabel: "Browse Marketplace",
    primaryTo: "/all-posts",
  },
};

/**
 * Smart empty state — typed empty state with illustration, message, and CTA.
 * @param {{ type: string, title?: string, message?: string, primaryLabel?: string, primaryTo?: string, secondaryLabel?: string, secondaryTo?: string }} props
 */
export default function SmartEmptyState({ type, title, message, primaryLabel, primaryTo, secondaryLabel, secondaryTo }) {
  const navigate = useNavigate();
  const config = CONFIGS[type] || CONFIGS.search;
  const Icon = config.icon;

  const resolvedSecondaryLabel = secondaryLabel || config.secondaryLabel;
  const resolvedSecondaryTo = secondaryTo || config.secondaryTo;

  return (
    <div className={`flex flex-col items-center justify-center py-16 px-6 text-center bg-gradient-to-b ${config.bgGradient} rounded-2xl mx-4 my-6`}>
      <div className={`w-20 h-20 rounded-full bg-white dark:bg-gray-800 shadow-lg flex items-center justify-center mb-5`}>
        <Icon className={`w-10 h-10 ${config.iconColor}`} strokeWidth={1.5} />
      </div>
      <h3 className="text-heading font-display mb-2">{title || config.title}</h3>
      <p className="text-body text-muted-foreground max-w-xs mb-6">{message || config.message}</p>
      <div className="flex gap-3 flex-wrap justify-center">
        <button
          onClick={() => navigate(primaryTo || config.primaryTo)}
          className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-sm active:scale-[0.97] transition-transform"
        >
          {primaryLabel || config.primaryLabel}
        </button>
        {(resolvedSecondaryLabel && resolvedSecondaryTo) && (
          <button
            onClick={() => navigate(resolvedSecondaryTo)}
            className="px-5 py-2.5 rounded-xl border border-border text-sm font-medium active:scale-[0.97] transition-transform"
          >
            {resolvedSecondaryLabel}
          </button>
        )}
      </div>
    </div>
  );
}

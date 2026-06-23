import React from "react";
import {
  Search,
  Package,
  MessageSquare,
  Bookmark,
  ShoppingBag,
  MapPin,
  Bell,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const iconMap = {
  search: Search,
  posts: Package,
  messages: MessageSquare,
  wishlist: Bookmark,
  cart: ShoppingBag,
  location: MapPin,
  notifications: Bell,
  default: FileText,
};

const defaults = {
  search: {
    title: "No results found",
    message:
      "Try adjusting your search or filters to find what you're looking for.",
  },
  posts: {
    title: "No posts yet",
    message: "Be the first to create a post in this category!",
  },
  messages: {
    title: "No messages",
    message: "Start a conversation with a seller or buyer.",
  },
  wishlist: {
    title: "Wishlist is empty",
    message: "Save items you like by tapping the save icon.",
  },
  cart: {
    title: "Your cart is empty",
    message: "Browse products and add items to your cart.",
  },
  location: {
    title: "No nearby items",
    message: "Try expanding your search radius or check back later.",
  },
  notifications: {
    title: "No notifications",
    message: "You're all caught up! Check back later for updates.",
  },
  default: {
    title: "Nothing here yet",
    message: "Check back later for new content.",
  },
};

const EmptyState = React.memo(
  ({
    type = "default",
    title,
    message,
    actionLabel,
    onAction,
    className = "",
  }) => {
    const Icon = iconMap[type] || iconMap.default;
    const resolvedTitle =
      title || defaults[type]?.title || defaults.default.title;
    const resolvedMessage =
      message || defaults[type]?.message || defaults.default.message;

    return (
      <div
        className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}
      >
        <div className="mhub-empty-card mhub-premium-surface w-full max-w-md rounded-3xl px-6 py-8">
          <div className="mhub-empty-icon w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center">
            <Icon
              className="w-10 h-10 text-gray-400 dark:text-gray-200"
              strokeWidth={1.5}
            />
          </div>

          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
            {resolvedTitle}
          </h3>

          <p className="text-sm text-gray-500 dark:text-gray-300 max-w-xs mx-auto mb-6">
            {resolvedMessage}
          </p>

          {actionLabel && onAction && (
            <Button
              onClick={onAction}
              className="mhub-btn-pill"
            >
              {actionLabel}
            </Button>
          )}
        </div>
      </div>
    );
  }
);

EmptyState.displayName = "EmptyState";

export default EmptyState;

/**
 * EmptyState Component
 * Architect Cleanup - Phase 3
 * 
 * Reusable empty state for when no data is available
 */

import React from 'react';
import {
    Search,
    Package,
    MessageSquare,
    Heart,
    ShoppingBag,
    MapPin,
    Bell,
    FileText
} from 'lucide-react';

const icons = {
    search: Search,
    posts: Package,
    messages: MessageSquare,
    wishlist: Heart,
    cart: ShoppingBag,
    location: MapPin,
    notifications: Bell,
    default: FileText
};

const EmptyState = ({
    type = 'default',
    title,
    message,
    actionLabel,
    onAction,
    className = '',
}) => {
    const Icon = icons[type] || icons.default;

    // Default messages based on type
    const defaults = {
        search: {
            title: 'No results found',
            message: 'Try adjusting your search or filters to find what you\'re looking for.'
        },
        posts: {
            title: 'No posts yet',
            message: 'Be the first to create a post in this category!'
        },
        messages: {
            title: 'No messages',
            message: 'Start a conversation with a seller or buyer.'
        },
        wishlist: {
            title: 'Wishlist is empty',
            message: 'Save items you love by tapping the heart icon.'
        },
        cart: {
            title: 'Your cart is empty',
            message: 'Browse products and add items to your cart.'
        },
        location: {
            title: 'No nearby items',
            message: 'Try expanding your search radius or check back later.'
        },
        notifications: {
            title: 'No notifications',
            message: 'You\'re all caught up! Check back later for updates.'
        },
        default: {
            title: 'Nothing here yet',
            message: 'Check back later for new content.'
        }
    };

    const displayTitle = title || defaults[type]?.title || defaults.default.title;
    const displayMessage = message || defaults[type]?.message || defaults.default.message;

    return (
        <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
            {/* Icon with gradient background */}
            <div className="w-20 h-20 mb-6 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center">
                <Icon className="w-10 h-10 text-gray-400 dark:text-gray-500" strokeWidth={1.5} />
            </div>

            {/* Title */}
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                {displayTitle}
            </h3>

            {/* Message */}
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mb-6">
                {displayMessage}
            </p>

            {/* Action Button */}
            {actionLabel && onAction && (
                <button
                    onClick={onAction}
                    className="px-6 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium rounded-full hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg shadow-green-500/25"
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
};

export default EmptyState;

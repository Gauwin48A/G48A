/**
 * Protocol: Value Hierarchy - Tier Rules Configuration
 * The Defender's Strategy: Make Premium feel like "God Mode"
 * 
 * Basic:   Pay-per-post, 15 days visibility, low priority
 * Silver:  1 post/day, 25 days visibility, medium priority  
 * Premium: Unlimited posts, 45 days visibility, TOP priority
 */

const TIER_RULES = {
    basic: {
        name: 'Basic',
        visibilityDays: 15,
        dailyLimit: 0, // Managed by 'credits', not daily limit
        priority: 1,
        priceINR: 49,
        durationMonths: null, // Single use
        features: ['1 Single Post', '15 Days Visibility', 'Standard Reach'],
        canPost: (user) => (user.post_credits || 0) > 0,
        getExpiry: () => {
            const date = new Date();
            date.setDate(date.getDate() + 15);
            return date;
        }
    },

    silver: {
        name: 'Silver Seller',
        visibilityDays: 25,
        dailyLimit: 1,
        priority: 2,
        priceINR: 499,
        durationMonths: 6,
        features: ['1 Post Per Day', '25 Days Visibility/Post', 'Verified Badge'],
        canPost: (user) => {
            // Check subscription expiry
            if (!user.subscription_expiry) return false;
            if (new Date(user.subscription_expiry) < new Date()) return false;
            return true; // Daily limit checked separately in controller
        },
        getExpiry: () => {
            const date = new Date();
            date.setDate(date.getDate() + 25);
            return date;
        }
    },

    premium: {
        name: 'Premium God Mode',
        visibilityDays: 45,
        dailyLimit: 9999, // Unlimited
        priority: 3,
        priceINR: 999,
        durationMonths: 12,
        features: ['Unlimited Posts', '45 Days Visibility', 'Top of Feed Priority', 'Premium Support'],
        canPost: (user) => {
            if (!user.subscription_expiry) return false;
            if (new Date(user.subscription_expiry) < new Date()) return false;
            return true;
        },
        getExpiry: () => {
            const date = new Date();
            date.setDate(date.getDate() + 45);
            return date;
        }
    }
};

/**
 * Get tier rules, defaulting to basic if unknown
 */
const getTierRules = (tierName) => {
    return TIER_RULES[tierName?.toLowerCase()] || TIER_RULES.basic;
};

/**
 * Calculate subscription expiry date based on tier
 */
const getSubscriptionExpiry = (tierName) => {
    const rules = getTierRules(tierName);
    if (!rules.durationMonths) return null; // Basic has no subscription

    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + rules.durationMonths);
    return expiry;
};

/**
 * Format tier for display
 */
const formatTierDisplay = (tierName) => {
    const rules = getTierRules(tierName);
    return {
        name: rules.name,
        price: `₹${rules.priceINR}`,
        duration: rules.durationMonths ? `/${rules.durationMonths} months` : '/post',
        features: rules.features,
        priority: rules.priority
    };
};

module.exports = {
    TIER_RULES,
    getTierRules,
    getSubscriptionExpiry,
    formatTierDisplay
};

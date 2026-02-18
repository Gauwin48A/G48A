/**
 * Tier Rules — Enhanced with promo/trial/downgrade logic
 *
 * Additions:
 *  - Trial periods (TRIAL_DAYS per tier)
 *  - Promo code support (PROMO_CODES map)
 *  - Downgrade / upsell helpers
 *  - Dynamic pricing (time-limited discounts)
 */

/* ─────────────────────────────────────────────
   Core tier definitions
───────────────────────────────────────────── */
const TIER_RULES = {
    basic: {
        name: 'Basic',
        visibilityDays: 15,
        dailyLimit: 0,
        priority: 1,
        priceINR: 49,
        durationMonths: null,
        trialDays: 0,
        features: ['1 Single Post', '15 Days Visibility', 'Standard Reach'],
        canPost: (user) => (user.post_credits || 0) > 0,
        getExpiry: () => {
            const d = new Date();
            d.setDate(d.getDate() + 15);
            return d;
        }
    },

    silver: {
        name: 'Silver Seller',
        visibilityDays: 25,
        dailyLimit: 1,
        priority: 2,
        priceINR: 499,
        durationMonths: 6,
        trialDays: 7,
        features: ['1 Post Per Day', '25 Days Visibility/Post', 'Verified Badge', '7-Day Free Trial'],
        canPost: (user) => {
            if (!user.subscription_expiry) return false;
            return new Date(user.subscription_expiry) >= new Date();
        },
        getExpiry: () => {
            const d = new Date();
            d.setDate(d.getDate() + 25);
            return d;
        }
    },

    premium: {
        name: 'Premium God Mode',
        visibilityDays: 45,
        dailyLimit: 9999,
        priority: 3,
        priceINR: 999,
        durationMonths: 12,
        trialDays: 14,
        features: ['Unlimited Posts', '45 Days Visibility', 'Top of Feed Priority', 'Premium Support', '14-Day Free Trial'],
        canPost: (user) => {
            if (!user.subscription_expiry) return false;
            return new Date(user.subscription_expiry) >= new Date();
        },
        getExpiry: () => {
            const d = new Date();
            d.setDate(d.getDate() + 45);
            return d;
        }
    }
};

/* ─────────────────────────────────────────────
   Promo codes
   Format: { discount: 0–1 (fraction), validUntil: Date|null, maxUses: number|null }
───────────────────────────────────────────── */
const PROMO_CODES = {
    LAUNCH50: { discount: 0.50, validUntil: new Date('2026-06-30'), maxUses: 500, usedCount: 0 },
    WELCOME20: { discount: 0.20, validUntil: null, maxUses: null, usedCount: 0 },
    SILVER10: { discount: 0.10, validUntil: null, maxUses: null, usedCount: 0, tierOnly: 'silver' },
};

/**
 * Validate and apply a promo code
 * @returns {{ valid: boolean, discount: number, finalPrice: number, error?: string }}
 */
const applyPromoCode = (code, tierName) => {
    const promo = PROMO_CODES[code?.toUpperCase()];
    if (!promo) return { valid: false, error: 'Invalid promo code' };

    if (promo.validUntil && new Date() > promo.validUntil)
        return { valid: false, error: 'Promo code has expired' };

    if (promo.maxUses !== null && promo.usedCount >= promo.maxUses)
        return { valid: false, error: 'Promo code usage limit reached' };

    if (promo.tierOnly && promo.tierOnly !== tierName)
        return { valid: false, error: `This promo code is only valid for ${promo.tierOnly} tier` };

    const rules = getTierRules(tierName);
    const finalPrice = Math.round(rules.priceINR * (1 - promo.discount));

    return {
        valid: true,
        discount: promo.discount,
        discountPercent: Math.round(promo.discount * 100),
        originalPrice: rules.priceINR,
        finalPrice
    };
};

/**
 * Consume a promo code (increment usedCount)
 */
const consumePromoCode = (code) => {
    const promo = PROMO_CODES[code?.toUpperCase()];
    if (promo && promo.maxUses !== null) promo.usedCount++;
};

/* ─────────────────────────────────────────────
   Trial period helpers
───────────────────────────────────────────── */
/**
 * Get trial expiry date for a tier
 * @returns {Date|null}
 */
const getTrialExpiry = (tierName) => {
    const rules = getTierRules(tierName);
    if (!rules.trialDays) return null;
    const d = new Date();
    d.setDate(d.getDate() + rules.trialDays);
    return d;
};

/**
 * Check if a user is eligible for a trial (never had this tier before)
 * @param {string} userId
 * @param {string} tierName
 * @param {object} pool - pg pool
 */
const isTrialEligible = async (userId, tierName, pool) => {
    try {
        const result = await pool.query(
            `SELECT COUNT(*) FROM payments WHERE user_id = $1 AND plan_purchased = $2 AND status = 'verified'`,
            [userId, tierName]
        );
        return parseInt(result.rows[0].count) === 0;
    } catch {
        return false;
    }
};

/* ─────────────────────────────────────────────
   Downgrade / upsell helpers
───────────────────────────────────────────── */
/**
 * Get the next tier up from current
 */
const getUpsellTier = (currentTier) => {
    const order = ['basic', 'silver', 'premium'];
    const idx = order.indexOf(currentTier?.toLowerCase());
    return idx >= 0 && idx < order.length - 1 ? order[idx + 1] : null;
};

/**
 * Get the tier below current (for downgrade)
 */
const getDowngradeTier = (currentTier) => {
    const order = ['basic', 'silver', 'premium'];
    const idx = order.indexOf(currentTier?.toLowerCase());
    return idx > 0 ? order[idx - 1] : null;
};

/**
 * Build an upsell message for a user
 */
const getUpsellMessage = (currentTier) => {
    const next = getUpsellTier(currentTier);
    if (!next) return null;
    const rules = getTierRules(next);
    return {
        tier: next,
        name: rules.name,
        price: rules.priceINR,
        headline: `Upgrade to ${rules.name} for just ₹${rules.priceINR}`,
        benefits: rules.features
    };
};

/* ─────────────────────────────────────────────
   Dynamic pricing (time-limited flash sales)
───────────────────────────────────────────── */
/**
 * Get current effective price for a tier (respects flash sales)
 */
const getDynamicPrice = (tierName) => {
    const rules = getTierRules(tierName);
    const now = new Date();
    const hour = now.getHours();

    // Example: 10% off during off-peak hours (11pm–6am IST)
    if (hour >= 23 || hour < 6) {
        return {
            price: Math.round(rules.priceINR * 0.90),
            originalPrice: rules.priceINR,
            discount: '10% off (Night Owl Deal 🦉)',
            isFlashSale: true
        };
    }

    return { price: rules.priceINR, originalPrice: rules.priceINR, discount: null, isFlashSale: false };
};

/* ─────────────────────────────────────────────
   Core exports (unchanged API)
───────────────────────────────────────────── */
const getTierRules = (tierName) => TIER_RULES[tierName?.toLowerCase()] || TIER_RULES.basic;

const getSubscriptionExpiry = (tierName) => {
    const rules = getTierRules(tierName);
    if (!rules.durationMonths) return null;
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + rules.durationMonths);
    return expiry;
};

const formatTierDisplay = (tierName) => {
    const rules = getTierRules(tierName);
    return {
        name: rules.name,
        price: `₹${rules.priceINR}`,
        duration: rules.durationMonths ? `/${rules.durationMonths} months` : '/post',
        features: rules.features,
        priority: rules.priority,
        trialDays: rules.trialDays
    };
};

module.exports = {
    TIER_RULES,
    PROMO_CODES,
    getTierRules,
    getSubscriptionExpiry,
    formatTierDisplay,
    applyPromoCode,
    consumePromoCode,
    getTrialExpiry,
    isTrialEligible,
    getUpsellTier,
    getDowngradeTier,
    getUpsellMessage,
    getDynamicPrice
};

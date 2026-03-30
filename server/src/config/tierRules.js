/**
 * MHub 4-Tier Pricing Model
 *
 * Basic:   INR 500/listing, 15-day expiry, no bonuses
 * Bronze:  INR 850/3mo, 100 listings, 30-day expiry, seller badge, basic analytics
 * Silver:  INR 1200/6mo, 200 listings, 30-day expiry, 5 boosts + 5 featured + 5 spotlights/6mo
 * Premium: INR 1500/12mo, unlimited, 45-day expiry, 5 boosts + 5 featured + 5 spotlights/month
 */

const TIER_RULES = {
  basic: {
    name: "Basic",
    displayName: "Basic",
    visibilityDays: 15,
    maxListings: 1,
    dailyLimit: 0,
    priority: 0,
    searchPriority: 0,
    priceINR: 500,
    durationMonths: null,
    quotaPeriodMonths: 1,
    trialDays: 0,
    boostQuotaMonthly: 0,
    featuredQuotaMonthly: 0,
    spotlightQuotaMonthly: 0,
    badgeType: null,
    hasAnalytics: false,
    hasPrioritySearch: false,
    hasPrioritySupport: false,
    perPostCost: 500,
    maxImages: 1,
    tagline: "Simple one-off listing",
    features: ["1 Single Post", "15 Days Visibility", "Standard Reach"],
    canPost: (user) => (user.post_credits || 0) > 0,
    getExpiry: () => {
      const d = new Date();
      d.setDate(d.getDate() + 15);
      return d;
    },
  },
  bronze: {
    name: "Bronze",
    displayName: "Bronze",
    visibilityDays: 30,
    maxListings: 100,
    dailyLimit: 5,
    priority: 1,
    searchPriority: 1,
    priceINR: 850,
    durationMonths: 3,
    quotaPeriodMonths: 1,
    trialDays: 0,
    boostQuotaMonthly: 0,
    featuredQuotaMonthly: 0,
    spotlightQuotaMonthly: 0,
    badgeType: "seller",
    hasAnalytics: true,
    hasPrioritySearch: false,
    hasPrioritySupport: false,
    perPostCost: 8.5,
    maxImages: 3,
    tagline: "For casual sellers",
    features: [
      "Up to 100 Posts",
      "30 Days Visibility/Post",
      "Seller Badge",
      "Basic Analytics",
    ],
    canPost: (user) => {
      if (!user.subscription_expiry) return false;
      return new Date(user.subscription_expiry) >= new Date();
    },
    getExpiry: () => {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      return d;
    },
  },
  silver: {
    name: "Silver Seller",
    displayName: "Silver Seller",
    visibilityDays: 30,
    maxListings: 200,
    dailyLimit: 10,
    priority: 2,
    searchPriority: 2,
    priceINR: 1200,
    durationMonths: 6,
    quotaPeriodMonths: 6,
    trialDays: 7,
    boostQuotaMonthly: 5,
    featuredQuotaMonthly: 5,
    spotlightQuotaMonthly: 5,
    badgeType: "verified",
    hasAnalytics: true,
    hasPrioritySearch: true,
    hasPrioritySupport: false,
    perPostCost: 6,
    maxImages: 5,
    tagline: "Most Popular",
    features: [
      "Up to 200 Posts",
      "30 Days Visibility/Post",
      "5 Boosts + 5 Featured + 5 Spotlights / 6 Months",
      "Verified Badge",
      "Priority Search Ranking",
      "Full Analytics Dashboard",
      "7-Day Free Trial",
    ],
    canPost: (user) => {
      if (!user.subscription_expiry) return false;
      return new Date(user.subscription_expiry) >= new Date();
    },
    getExpiry: () => {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      return d;
    },
  },
  premium: {
    name: "Premium God Mode",
    displayName: "Premium God Mode",
    visibilityDays: 45,
    maxListings: null,
    dailyLimit: 9999,
    priority: 3,
    searchPriority: 3,
    priceINR: 1500,
    durationMonths: 12,
    quotaPeriodMonths: 1,
    trialDays: 14,
    boostQuotaMonthly: 5,
    featuredQuotaMonthly: 5,
    spotlightQuotaMonthly: 5,
    badgeType: "crown",
    hasAnalytics: true,
    hasPrioritySearch: true,
    hasPrioritySupport: true,
    perPostCost: 0,
    maxImages: 10,
    tagline: "Best Value",
    features: [
      "Unlimited Posts",
      "45 Days Visibility",
      "5 Boosts + 5 Featured + 5 Spotlights/Month",
      "Crown Badge",
      "Top of Feed Priority",
      "Priority Support",
      "Full Analytics Dashboard",
      "14-Day Free Trial",
    ],
    canPost: (user) => {
      if (!user.subscription_expiry) return false;
      return new Date(user.subscription_expiry) >= new Date();
    },
    getExpiry: () => {
      const d = new Date();
      d.setDate(d.getDate() + 45);
      return d;
    },
  },
};

const TIER_ORDER = ["basic", "bronze", "silver", "premium"];

const PROMO_CODES = {
  LAUNCH50: { discount: 0.5, validUntil: new Date("2026-06-30"), maxUses: 500, usedCount: 0 },
  WELCOME20: { discount: 0.2, validUntil: null, maxUses: null, usedCount: 0 },
  SILVER10: { discount: 0.1, validUntil: null, maxUses: null, usedCount: 0, tierOnly: "silver" },
  BRONZE15: { discount: 0.15, validUntil: null, maxUses: null, usedCount: 0, tierOnly: "bronze" },
};

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
    name: tierName.toLowerCase(),
    displayName: rules.displayName,
    price: rules.priceINR,
    priceINR: rules.priceINR,
    duration: rules.durationMonths ? `${rules.durationMonths} months` : "per listing",
    durationLabel: rules.durationMonths ? `${rules.durationMonths}mo` : "listing",
    quotaPeriodMonths: rules.quotaPeriodMonths || 1,
    quotaPeriodLabel: rules.quotaPeriodMonths && rules.quotaPeriodMonths > 1
      ? `${rules.quotaPeriodMonths}mo`
      : "month",
    features: rules.features,
    priority: rules.priority,
    searchPriority: rules.searchPriority,
    trialDays: rules.trialDays || 0,
    visibilityDays: rules.visibilityDays,
    maxListings: rules.maxListings,
    badgeType: rules.badgeType,
    tagline: rules.tagline,
    perPostCost: rules.perPostCost,
    maxImages: rules.maxImages,
    quotas: {
      boost: rules.boostQuotaMonthly || 0,
      featured: rules.featuredQuotaMonthly || 0,
      spotlight: rules.spotlightQuotaMonthly || 0,
      [userId, tierName],
    );
    return parseInt(result.rows[0].count) === 0;
  } catch {
    return false;
  }
};

const getUpsellTier = (currentTier) => {
  const idx = TIER_ORDER.indexOf(currentTier?.toLowerCase());
  return idx >= 0 && idx < TIER_ORDER.length - 1 ? TIER_ORDER[idx + 1] : null;
};

const getDowngradeTier = (currentTier) => {
  const idx = TIER_ORDER.indexOf(currentTier?.toLowerCase());
  return idx > 0 ? TIER_ORDER[idx - 1] : null;
};

const getUpsellMessage = (currentTier) => {
  const next = getUpsellTier(currentTier);
  if (!next) return null;
  const rules = getTierRules(next);
  return { tier: next, name: rules.name, price: rules.priceINR, headline: `Upgrade to ${rules.name} for just ₹${rules.priceINR}`, benefits: rules.features, tagline: rules.tagline };
};

const getDynamicPrice = (tierName) => {
  const rules = getTierRules(tierName);
  const hour = new Date().getHours();
  if (hour >= 23 || hour < 6) {
    return { price: Math.round(rules.priceINR * 0.9), originalPrice: rules.priceINR, discount: "10% off (Night Owl Deal)", isFlashSale: true };
  }
  return { price: rules.priceINR, originalPrice: rules.priceINR, discount: null, isFlashSale: false };
};

module.exports = {
  TIER_RULES, TIER_ORDER, PROMO_CODES,
  getTierRules, getSubscriptionExpiry, formatTierDisplay, getAllTiersDisplay,
  applyPromoCode, consumePromoCode, getTrialExpiry, isTrialEligible,
  getUpsellTier, getDowngradeTier, getUpsellMessage, getDynamicPrice,
};

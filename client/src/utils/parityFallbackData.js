// Dispatch a custom event so App can show a toast when fallback is used
function dispatchFallbackEvent(pageName) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("mhub:parity-fallback", {
        detail: { page: pageName, timestamp: Date.now() },
      })
    );
  }
}

export function buildParityProfileFallback(authUser = null) {
  dispatchFallbackEvent("profile");
  // Return minimal real data only — no fabricated stats, trust scores, or fake sales
  const userId = authUser?.id ?? authUser?.user_id ?? "";
  const name = String(authUser?.full_name || authUser?.name || "").trim() || "MHub User";
  const createdAt = authUser?.created_at || null;

  return {
    id: userId,
    user_id: userId,
    name,
    full_name: name,
    email: authUser?.email || "",
    phone: authUser?.phone || "",
    address: authUser?.address || "",
    avatar_url: authUser?.avatar_url || authUser?.avatar || "",
    bio: authUser?.bio || "",
    created_at: createdAt,
    current_plan: authUser?.current_plan || authUser?.tier || "",
    verified: authUser?.verified ?? false,
    kyc_verified: authUser?.kyc_verified ?? authUser?.verified ?? false,
    email_verified: authUser?.email_verified ?? false,
    phone_verified: authUser?.phone_verified ?? false,
    response_rate: Number(authUser?.response_rate ?? authUser?.responseRate ?? 0) || 0,
    rating: Number(authUser?.rating ?? 0) || 0,
    successful_sales: Number(authUser?.successful_sales ?? 0) || 0,
    trust: null,
  };
}

export function buildParityRewardsFallback(authUser = null) {
  dispatchFallbackEvent("rewards");
  const userId = authUser?.id ?? authUser?.user_id ?? "";
  const name = String(authUser?.full_name || authUser?.name || "").trim() || "MHub User";

  // Return empty shell — no fabricated coins, ranks, or referral history
  return {
    user_id: userId,
    userId,
    name,
    rank: "",
    tier: authUser?.current_plan || authUser?.tier || "premium",
    membershipPlan: authUser?.current_plan || authUser?.tier || "premium",
    currentPlan: authUser?.current_plan || authUser?.tier || "premium",
    level: 0,
    xpCurrent: 0,
    xpRequired: 0,
    totalCoins: 0,
    referralCode: "",
    dailySecretCode: "",
    dailySecretCodeExpiresAt: null,
    trust: null,
    referralStats: null,
    leaderboard: null,
    activityStats: {},
    responseRate: 0,
    milestones: [],
    levelBenefits: [],
    referralHistory: [],
    chainRules: [],
  };
}

export function buildParityNotificationsFallback(userId = null) {
  dispatchFallbackEvent("notifications");
  // Return empty array — no fabricated notifications
  return [];
}

export function buildParityWishlistFallback(userId = null) {
  dispatchFallbackEvent("wishlist");
  // Return empty array — no fabricated wishlist items
  return [];
}

const ONE_MINUTE_MS = 60 * 1000;
const ONE_HOUR_MS = 60 * ONE_MINUTE_MS;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const toSafeId = (value, fallback = "1001") => {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
};

const toSafeName = (user) =>
  String(user?.full_name || user?.name || "").trim() || "MHub User";

const makeWishlistPreviewImage = (title, startColor, endColor, accentColor) => {
  const safeTitle = String(title || "MHub Item");
  const svg = `
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 600'>
  <defs>
    <linearGradient id='bg' x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0%' stop-color='${startColor}' />
      <stop offset='100%' stop-color='${endColor}' />
    </linearGradient>
  </defs>
  <rect width='800' height='600' fill='url(#bg)' />
  <circle cx='680' cy='120' r='90' fill='rgba(255,255,255,0.14)' />
  <circle cx='130' cy='500' r='120' fill='rgba(255,255,255,0.1)' />
  <rect x='70' y='70' width='260' height='44' rx='22' fill='rgba(255,255,255,0.25)' />
  <rect x='70' y='420' width='660' height='120' rx='24' fill='rgba(0,0,0,0.16)' />
  <text x='92' y='100' font-size='22' font-family='Arial, sans-serif' fill='white'>MHub Saved Item</text>
  <text x='92' y='474' font-size='42' font-family='Arial, sans-serif' font-weight='700' fill='white'>${safeTitle}</text>
  <rect x='92' y='500' width='220' height='14' rx='7' fill='rgba(255,255,255,0.7)' />
  <rect x='340' y='500' width='170' height='14' rx='7' fill='rgba(255,255,255,0.48)' />
  <rect x='540' y='500' width='110' height='14' rx='7' fill='${accentColor}' />
</svg>`.trim();
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

function buildRewardMilestones(now) {
  return [
    {
      key: "first_referral",
      title: "First referral unlocked",
      progress: 1,
      target: 1,
      reward: 100,
      claimed: true,
      unlockedAt: new Date(now - 12 * ONE_DAY_MS).toISOString(),
    },
    {
      key: "referral_streak",
      title: "Referral momentum",
      progress: 3,
      target: 5,
      reward: 300,
      claimed: false,
      unlockedAt: null,
    },
    {
      key: "seller_trust",
      title: "Trusted seller badge",
      progress: 84,
      target: 100,
      reward: 250,
      claimed: false,
      unlockedAt: null,
    },
  ];
}

function buildRewardLevelBenefits() {
  return [
    {
      level: "Bronze",
      benefit: "Starter seller visibility",
      bonus: "+5% discovery boost",
    },
    {
      level: "Silver",
      benefit: "Priority recommendation slots",
      bonus: "+10% conversion support",
    },
    {
      level: "Gold",
      benefit: "Featured rewards multiplier",
      bonus: "+15% reward multiplier",
    },
  ];
}

export function buildParityProfileFallback(authUser = null) {
  const userId = toSafeId(authUser?.id ?? authUser?.user_id);
  const name = toSafeName(authUser);
  const createdAt =
    authUser?.created_at || new Date(Date.now() - 210 * ONE_DAY_MS).toISOString();

  return {
    id: userId,
    user_id: userId,
    name,
    full_name: name,
    email: authUser?.email || "demo.user@mhub.local",
    phone: authUser?.phone || "+91 98765 43210",
    address: authUser?.address || "Bengaluru, Karnataka",
    avatar_url: authUser?.avatar_url || authUser?.avatar || "",
    bio:
      authUser?.bio ||
      "Trusted MHub member focused on premium listings and fast responses.",
    created_at: createdAt,
    current_plan: authUser?.current_plan || authUser?.tier || "Premium",
    tier: authUser?.tier || "Gold",
    verified: authUser?.verified ?? true,
    kyc_verified: authUser?.kyc_verified ?? authUser?.verified ?? true,
    email_verified: authUser?.email_verified ?? true,
    phone_verified: authUser?.phone_verified ?? true,
    response_rate: Number(authUser?.response_rate ?? authUser?.responseRate ?? 94),
    rating: Number(authUser?.rating ?? 4.8),
    successful_sales: Number(authUser?.successful_sales ?? 37),
    trust: {
      score: Number(authUser?.trust?.score ?? authUser?.trustScore ?? 86),
      level: String(authUser?.trust?.level || authUser?.trustLevel || "verified"),
      label: String(authUser?.trust?.label || authUser?.trustLabel || "Trusted Seller"),
      risk_state: authUser?.trust?.risk_state || authUser?.risk_state || { status: "normal" },
      under_review: Boolean(authUser?.trust?.under_review ?? authUser?.under_review ?? false),
    },
  };
}

export function buildParityRewardsFallback(authUser = null) {
  const now = Date.now();
  const userId = toSafeId(authUser?.id ?? authUser?.user_id);
  const name = toSafeName(authUser);

  return {
    user_id: userId,
    userId,
    name,
    rank: "Gold",
    tier: "premium",
    level: 12,
    xpCurrent: 780,
    xpRequired: 1000,
    totalCoins: 2480,
    referralCode: `MH${userId.slice(-4).padStart(4, "0")}`,
    dailySecretCode: "SPARK42",
    dailySecretCodeExpiresAt: new Date(now + 180 * ONE_MINUTE_MS).toISOString(),
    trust: {
      score: 86,
      level: "verified",
      label: "Trusted Seller",
      risk_state: { status: "normal" },
      under_review: false,
    },
    referralStats: {
      goal: 5,
      reward: 300,
      directCount: 2,
      indirectCount: 1,
      totalCount: 3,
    },
    leaderboard: {
      nextPayoutAt: new Date(now + 2 * ONE_DAY_MS).toISOString(),
      lastPayoutAt: new Date(now - 5 * ONE_DAY_MS).toISOString(),
    },
    activityStats: {
      salesCount: 37,
      postStreak: 2,
      visitStreak: 4,
    },
    responseRate: 94,
    milestones: buildRewardMilestones(now),
    levelBenefits: buildRewardLevelBenefits(),
    referralHistory: [
      {
        id: "ref-direct-1",
        name: "Ananya R.",
        level: 1,
        coins: 120,
        joinedAt: new Date(now - 8 * ONE_DAY_MS).toISOString(),
        status: "qualified",
      },
      {
        id: "ref-direct-2",
        name: "Rahul S.",
        level: 1,
        coins: 90,
        joinedAt: new Date(now - 3 * ONE_DAY_MS).toISOString(),
        status: "qualified",
      },
      {
        id: "ref-indirect-1",
        name: "Neha P.",
        level: 2,
        coins: 60,
        joinedAt: new Date(now - 2 * ONE_DAY_MS).toISOString(),
        status: "pending",
      },
    ],
    chainRules: [
      { level: 1, points: 120 },
      { level: 2, points: 60 },
      { level: 3, points: 30 },
    ],
  };
}

export function buildParityNotificationsFallback(userId = null) {
  const safeUserId = toSafeId(userId, "1001");
  const now = Date.now();
  return [
    {
      id: `notif-${safeUserId}-1`,
      notification_id: `notif-${safeUserId}-1`,
      title: "Price drop on saved listing",
      message: "A wishlist item just dropped by INR 500. Good time to buy.",
      icon: "trending",
      type: "price_drop",
      priority: "high",
      read: false,
      created_at: new Date(now - 18 * ONE_MINUTE_MS).toISOString(),
      action: { label: "Open wishlist" },
      path: "/wishlist",
      group_key: "price-updates",
      sender_name: "MHub Alerts",
      sender_verified: true,
    },
    {
      id: `notif-${safeUserId}-2`,
      notification_id: `notif-${safeUserId}-2`,
      title: "New inquiry on your listing",
      message: "A buyer sent a question on your featured electronics post.",
      icon: "message",
      type: "message",
      priority: "normal",
      read: false,
      created_at: new Date(now - 65 * ONE_MINUTE_MS).toISOString(),
      action: { label: "Open chat" },
      path: "/chat",
      sender_name: "Buyer Chat",
      sender_verified: true,
    },
    {
      id: `notif-${safeUserId}-3`,
      notification_id: `notif-${safeUserId}-3`,
      title: "Rewards milestone reached",
      message: "You unlocked a referral milestone. Claim your bonus coins.",
      icon: "gift",
      type: "reward",
      priority: "normal",
      read: true,
      created_at: new Date(now - 6 * ONE_HOUR_MS).toISOString(),
      action: { label: "View rewards" },
      path: "/rewards",
      sender_name: "Rewards Center",
      sender_verified: true,
    },
    {
      id: `notif-${safeUserId}-4`,
      notification_id: `notif-${safeUserId}-4`,
      title: "Profile trust update",
      message: "Your profile trust score was refreshed after recent activity.",
      icon: "security",
      type: "security",
      priority: "normal",
      read: true,
      created_at: new Date(now - 18 * ONE_HOUR_MS).toISOString(),
      action: { label: "Open profile" },
      path: "/profile",
      sender_name: "MHub Trust",
      sender_verified: true,
    },
  ];
}

export function buildParityWishlistFallback(userId = null) {
  const safeUserId = toSafeId(userId, "1001");
  const now = Date.now();
  const audioImage = makeWishlistPreviewImage(
    "Wireless Headphones",
    "#0f172a",
    "#7c3aed",
    "#fde047",
  );
  const deskImage = makeWishlistPreviewImage(
    "Minimal Work Desk",
    "#0f766e",
    "#0891b2",
    "#fbbf24",
  );
  const bikeImage = makeWishlistPreviewImage(
    "Commuter Bicycle",
    "#14532d",
    "#16a34a",
    "#22d3ee",
  );
  return [
    {
      id: `wish-${safeUserId}-1`,
      post_id: `wish-${safeUserId}-1`,
      title: "Premium Wireless Headphones",
      price: 7499,
      location: "Bengaluru",
      description: "Active noise cancellation, 30h battery, barely used.",
      category_name: "Electronics",
      category_id: "electronics-audio",
      category_group: "electronics",
      status: "active",
      seller_name: "Aarav Tech Store",
      seller_verified: true,
      rating: 4.8,
      review_count: 128,
      saved_at: new Date(now - 3 * ONE_DAY_MS).toISOString(),
      notes: "Waiting for festive deal before checkout.",
      image_url: audioImage,
      images: [audioImage],
      user_id: safeUserId,
    },
    {
      id: `wish-${safeUserId}-2`,
      post_id: `wish-${safeUserId}-2`,
      title: "Minimalist Work Desk",
      price: 12999,
      location: "Hyderabad",
      description: "Solid wood desk with cable tray and matte finish.",
      category_name: "Furniture",
      category_id: "home-furniture",
      category_group: "others",
      status: "active",
      seller_name: "Urban Home Hub",
      seller_verified: true,
      rating: 4.6,
      review_count: 74,
      saved_at: new Date(now - 6 * ONE_DAY_MS).toISOString(),
      notes: "",
      image_url: deskImage,
      images: [deskImage],
      user_id: safeUserId,
    },
    {
      id: `wish-${safeUserId}-3`,
      post_id: `wish-${safeUserId}-3`,
      title: "City Commuter Bicycle",
      price: 18999,
      location: "Pune",
      description: "Lightweight alloy frame with hydraulic disc brakes.",
      category_name: "Vehicles",
      category_id: "vehicles-cycle",
      category_group: "vehicles",
      status: "active",
      seller_name: "RideBetter",
      seller_verified: false,
      rating: 4.5,
      review_count: 39,
      saved_at: new Date(now - 10 * ONE_DAY_MS).toISOString(),
      notes: "Compare with two similar options before buying.",
      image_url: bikeImage,
      images: [bikeImage],
      user_id: safeUserId,
    },
  ];
}

import React, { memo } from "react";
import {
  useTrustScore,
  getTrustBadgeClass,
  normalizeTrustPayload,
  isComplaintRiskState,
} from "@/hooks/useTrustScore";

const BOOST_BADGE_CONFIG = {
  3: { key: "spotlight", label: "Spotlight", className: "bg-orange-500 text-white" },
  2: { key: "featured", label: "Featured", className: "bg-purple-500 text-white" },
  1: { key: "boosted", label: "Boosted", className: "bg-emerald-500 text-white" },
};

const STATIC_BADGES = {
  sponsored: { key: "sponsored", label: "Sponsored", className: "bg-blue-600 text-white" },
  premium: { key: "premium", label: "Premium", className: "bg-amber-400 text-slate-900" },
};

const normalizeText = (value) => String(value || "").trim().toLowerCase();

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const resolveBoostLevel = (post) => {
  if (!post) return 0;
  const direct = toNumber(
    post.boost_level ?? post.boostLevel ?? post.boost ?? post.boosted,
  );
  if (direct > 0) return Math.min(direct, 3);
  const promoLabel = normalizeText(post.promo_label);
  if (promoLabel.includes("spotlight")) return 3;
  if (promoLabel.includes("featured")) return 2;
  if (promoLabel.includes("boost")) return 1;
  return 0;
};

const resolveSponsored = (post, boostLevel) => {
  if (!post) return false;
  if (post.isSponsored || post.is_sponsored || post.sponsored) return true;
  const promoLabel = normalizeText(post.promo_label);
  if (promoLabel.includes("sponsor") || promoLabel.includes("promoted")) {
    return true;
  }
  return boostLevel > 0;
};

const resolvePremium = (post) => {
  if (!post) return false;
  const tierPriority = toNumber(post.tier_priority ?? post.tierPriority ?? post.tier);
  if (tierPriority >= 3) return true;
  const plan = normalizeText(
    post.current_plan ??
      post.currentPlan ??
      post.seller_plan ??
      post.sellerPlan ??
      post.plan ??
      post.tier_name,
  );
  if (plan === "premium") return true;
  const badgeType = normalizeText(post.badge_type ?? post.badgeType);
  if (badgeType === "crown" || badgeType === "premium") return true;
  return post.is_premium === true;
};

export const buildPostPromoBadges = (post, t) => {
  if (!post) return [];
  const text = (key, fallback) =>
    typeof t === "function" ? t(key, fallback) : fallback;

  const badges = [];
  const boostLevel = resolveBoostLevel(post);
  const isSponsored = resolveSponsored(post, boostLevel);
  const isPremium = resolvePremium(post);

  if (isSponsored) {
    badges.push({
      ...STATIC_BADGES.sponsored,
      label: text("sponsored", STATIC_BADGES.sponsored.label),
    });
  }

  if (boostLevel > 0) {
    const boostBadge = BOOST_BADGE_CONFIG[Math.min(boostLevel, 3)];
    if (boostBadge) {
      badges.push({
        ...boostBadge,
        label: text(boostBadge.key, boostBadge.label),
      });
    }
  }

  if (isPremium) {
    badges.push({
      ...STATIC_BADGES.premium,
      label: text("premium", STATIC_BADGES.premium.label),
    });
  }

  return badges;
};

const PostPromoBadges = memo(function PostPromoBadges({
  post,
  t,
  className = "",
  size = "sm",
  limit,
}) {
  const text = (key, fallback) =>
    typeof t === "function" ? t(key, fallback) : fallback;
  const promoBadges = buildPostPromoBadges(post, t);

  const sellerId =
    post?.seller_id ||
    post?.sellerId ||
    post?.user_id ||
    post?.owner_id ||
    post?.user?.id ||
    post?.author_id ||
    null;
  const localTrustPayload = post?.trust || post?.user?.trust || null;
  const localRiskState =
    post?.risk_state || post?.user?.risk_state || localTrustPayload?.risk_state || null;
  const localUnderReview =
    post?.under_review ?? post?.user?.under_review ?? localTrustPayload?.under_review;
  const normalizedLocalTrust = normalizeTrustPayload(
    localTrustPayload ||
      (localRiskState || localUnderReview != null
        ? { risk_state: localRiskState, under_review: localUnderReview }
        : null),
  );
  const shouldFetchTrust =
    !normalizedLocalTrust ||
    (!normalizedLocalTrust.score &&
      !normalizedLocalTrust.label &&
      !normalizedLocalTrust.level);
  const trustState = useTrustScore(sellerId, {
    enabled: Boolean(sellerId) && shouldFetchTrust,
  });
  const resolvedTrust = normalizedLocalTrust || trustState;
  const trustLabel = resolvedTrust?.label;
  const trustScore = resolvedTrust?.score;
  const trustBadgeClass = getTrustBadgeClass(resolvedTrust?.level);
  const riskState = resolvedTrust?.riskState || localRiskState;
  const isFrozen = riskState?.status === "frozen";
  const underReview =
    resolvedTrust?.underReview ??
    (localUnderReview != null ? Boolean(localUnderReview) : isComplaintRiskState(riskState));

  const priorityBadges = [];
  if (trustLabel) {
    const labelText =
      trustScore != null ? `${trustLabel} - ${trustScore}` : trustLabel;
    priorityBadges.push({
      key: "trust",
      label: labelText,
      className: trustBadgeClass,
    });
  }
  if (isFrozen) {
    priorityBadges.push({
      key: "frozen",
      label: text("account_frozen", "Seller Frozen"),
      className: "bg-rose-600 text-white border-0",
    });
  } else if (underReview) {
    priorityBadges.push({
      key: "under_review",
      label: text("seller_under_review", "Under Review"),
      className: "bg-amber-500 text-white border-0",
    });
  }

  const remainingSlots =
    typeof limit === "number" ? Math.max(0, limit - priorityBadges.length) : null;
  const visiblePromoBadges =
    remainingSlots == null ? promoBadges : promoBadges.slice(0, remainingSlots);
  const visibleBadges = [...priorityBadges, ...visiblePromoBadges];

  if (!visibleBadges.length) return null;
  const sizeClass =
    size === "xs"
      ? "text-xs px-2 py-1"
      : "text-xs px-2.5 py-1";

  return (
    <div className={`flex flex-wrap gap-1 ${className}`.trim()}>
      {visibleBadges.map((badge) => (
        <span
          key={badge.key}
          className={`inline-flex items-center rounded-full font-semibold ${sizeClass} ${badge.className}`}
        >
          {badge.label}
        </span>
      ))}
    </div>
  );
});

export default PostPromoBadges;

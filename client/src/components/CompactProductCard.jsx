import React, { memo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MessageSquare, ShoppingCart, Heart, Share2, MoreHorizontal } from "lucide-react";
import SmartImage from "@/components/SmartImage";
import {
  useTrustScore,
  getTrustBadgeClass,
  normalizeTrustPayload,
  isComplaintRiskState,
} from "@/hooks/useTrustScore";

/**
 * CompactProductCard — Redesigned card per Deatiled_doc.txt:
 * - Image left (100x120) + Content right
 * - 2 primary CTAs (Message + Cart) instead of 6
 * - Seller info with trust signals
 * - Trending / Verified badges
 * - WCAG-compliant dark mode
 * - 120px total height vs previous 296px = 59% more compact
 */
const CompactProductCard = memo(function CompactProductCard({
  post,
  onMessage,
  onAddToCart,
  onLike,
  onShare,
  showReason,
}) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const sellerName = post.seller_name || post.username || "Seller";
  const sellerInitial = sellerName.charAt(0).toUpperCase();
  const rating = post.seller_rating || post.rating || null;
  const isVerified = post.seller_verified || post.is_verified || false;
  const sellerId =
    post.seller_id ||
    post.sellerId ||
    post.user_id ||
    post.user?.id ||
    post.owner_id ||
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
  const trustState = useTrustScore(sellerId, { enabled: shouldFetchTrust });
  const resolvedTrust = normalizedLocalTrust || trustState;
  const trustBadgeClass = getTrustBadgeClass(resolvedTrust?.level);
  const trustLabel = resolvedTrust?.label;
  const trustScore = resolvedTrust?.score;
  const riskState = resolvedTrust?.riskState || localRiskState;
  const isFrozen = riskState?.status === "frozen";
  const underReview =
    resolvedTrust?.underReview ??
    (localUnderReview != null ? Boolean(localUnderReview) : isComplaintRiskState(riskState));
  const interestedCount = post.interested_count || post.views || 0;
  const isTrending = interestedCount > 400;
  const postedDaysAgo = post.posted_days_ago || (post.created_at
    ? Math.floor((Date.now() - new Date(post.created_at).getTime()) / 86400000)
    : null);
  const location = post.location || post.city || "";
  const price = post.price != null ? Number(post.price).toLocaleString("en-IN") : null;
  const imageUrl = post.image_url || post.images?.[0] || post.thumbnail || null;

  const handleCardClick = () => {
    if (post.id || post.post_id) {
      navigate(`/post/${post.id || post.post_id}`);
    }
  };

  return (
    <article
      className="mhub-card flex p-2 cursor-pointer"
      onClick={handleCardClick}
      role="article"
      aria-label={post.title || "Product listing"}
    >
      {/* LEFT: Image */}
      <div className="relative flex-shrink-0 w-[100px] h-[120px] rounded-md overflow-hidden bg-gray-100 dark:bg-slate-700">
        {imageUrl ? (
          <SmartImage
            src={imageUrl}
            alt={post.title || "Product"}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-slate-500">
            <ShoppingCart className="w-8 h-8" />
          </div>
        )}
        {isTrending && (
          <span className="absolute top-1 right-1 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
            🔥 {t("trending", { defaultValue: "HOT" })}
          </span>
        )}
      </div>

      {/* RIGHT: Content */}
      <div className="flex-1 ml-2 flex flex-col justify-between min-w-0">
        {/* Title */}
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 leading-tight">
          {post.title || "Untitled"}
        </h3>

        {/* Price */}
        {price && (
          <div className="text-base font-bold text-green-600 dark:text-green-400">
            ₹{price}
          </div>
        )}

        {/* Seller info */}
        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400">
          <span
            className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0"
            aria-hidden="true"
          >
            {sellerInitial}
          </span>
          <span className="font-medium truncate">{sellerName}</span>
          {trustLabel && (
            <span
              className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${trustBadgeClass}`}
              title={trustScore != null ? `${trustLabel} · ${trustScore}` : trustLabel}
            >
              {trustLabel}
              {trustScore != null ? ` · ${trustScore}` : ""}
            </span>
          )}
          {isFrozen ? (
            <span className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold bg-rose-600 text-white">
              Frozen
            </span>
          ) : underReview ? (
            <span className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold bg-amber-500 text-white">
              Under Review
            </span>
          ) : null}
          {rating && <span className="text-[10px]">⭐ {rating}</span>}
          {isVerified && (
            <span className="text-[10px]" title="Verified seller" aria-label="Verified seller">✅</span>
          )}
        </div>

        {/* Meta: date + location + interest */}
        <div className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-slate-500">
          {postedDaysAgo != null && <span>{postedDaysAgo}d ago</span>}
          {postedDaysAgo != null && location && <span>•</span>}
          {location && <span className="truncate">{location}</span>}
          {interestedCount > 0 && (
            <>
              <span>•</span>
              <span>👥 {interestedCount}</span>
            </>
          )}
        </div>

        {/* Recommendation reason */}
        {showReason && post.recommendation_reason && (
          <div className="text-[10px] text-blue-600 dark:text-blue-400 truncate">
            {post.recommendation_reason}
          </div>
        )}

        {/* Actions: 2 primary CTAs */}
        <div className="flex items-center gap-1 mt-1">
          <button
            onClick={(e) => { e.stopPropagation(); onMessage?.(post); }}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-green-600 hover:bg-green-700 text-white text-[11px] font-semibold rounded-md transition-colors"
            aria-label={`Message ${sellerName}`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Message</span>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onAddToCart?.(post); }}
            className="flex items-center justify-center px-2 py-1.5 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-300 text-[11px] font-semibold rounded-md transition-colors border border-gray-200 dark:border-slate-600"
            aria-label="Add to cart"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); }}
            className="flex items-center justify-center p-1.5 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
            aria-label="More actions"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>
    </article>
  );
});

export default CompactProductCard;

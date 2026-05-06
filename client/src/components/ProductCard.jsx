import React, { memo } from "react";
import { AiFillStar } from "react-icons/ai";

import { useTranslation } from "react-i18next";
import { getApiOriginBase } from "@/lib/networkConfig";
import { Button } from "@/components/ui/button";
import SafeImage from "@/components/SafeImage";
import CardContextMenu from "@/components/CardContextMenu";
import {
  useTrustScore,
  getTrustBadgeClass,
  normalizeTrustPayload,
  isComplaintRiskState,
} from "@/hooks/useTrustScore";

const ProductCard = memo(function ProductCard({ product }) {
  const { t } = useTranslation();
  const isValidProduct = product && typeof product === "object";
  const safeProduct = isValidProduct ? product : {};

  // Defensive: Ensure rating is a number
  const rating = typeof safeProduct.rating === "number" ? safeProduct.rating : 0;
  const sellerId =
    safeProduct.seller_id ||
    safeProduct.sellerId ||
    safeProduct.user_id ||
    safeProduct.userId ||
    safeProduct.owner_id ||
    safeProduct.ownerId ||
    null;
  const localTrustPayload = safeProduct?.trust || safeProduct?.user?.trust || null;
  const localRiskState =
    safeProduct?.risk_state ||
    safeProduct?.user?.risk_state ||
    localTrustPayload?.risk_state ||
    null;
  const localUnderReview =
    safeProduct?.under_review ??
    safeProduct?.user?.under_review ??
    localTrustPayload?.under_review;
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
    enabled: isValidProduct && Boolean(sellerId) && shouldFetchTrust,
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

  if (!isValidProduct) {
    return (
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl">
        {t("invalid_product_data")}
      </div>
    );
  }

  // Helper to get full image URL
  const baseUrl = getApiOriginBase();
  const getImageUrl = (img) => {
    if (!img) return '/placeholder.svg';
    if (img.startsWith('/uploads/')) return baseUrl + img;
    if (img.startsWith('http')) return img;
    return '/placeholder.svg';
  };

  return (
    <CardContextMenu onShare={() => navigator.share?.({ title: safeProduct.name, url: window.location.href }).catch(() => {})} onSave={() => {}} onReport={() => {}}>
    <div
      className="mhub-card overflow-hidden flex flex-col transition focus-within:ring-2 focus-within:ring-primary"
      tabIndex={0}
      role="article"
      aria-label={safeProduct.name}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.currentTarget.querySelector("button")?.click();
        }
      }}
    >
      <SafeImage
        src={getImageUrl(safeProduct.image_url || safeProduct.image)}
        alt={safeProduct.name}
        className="h-40 w-full object-contain bg-light"
        loading="lazy"
        fallbackSrc="/placeholder.svg"
      />
      <div className="p-4 flex-1 flex flex-col justify-between">
        <h2 className="text-lg font-semibold mb-2 text-dark">{safeProduct.name}</h2>
        <div className="flex flex-wrap items-center gap-1 mb-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i}>
              <AiFillStar className={`w-4 h-4 ${i < Math.round(rating) ? "text-primary" : "text-light"}`} />
            </span>
          ))}
          <span className="ml-2 text-sm text-dark">{Number(rating).toFixed(1)}</span>
        </div>
        {trustLabel || isFrozen || underReview ? (
          <div className="flex flex-wrap items-center gap-1 mb-2 text-xs">
            {trustLabel ? (
              <span
                className={`inline-flex items-center rounded-full px-2 py-1 font-semibold ${trustBadgeClass}`}
                title={trustScore != null ? `${trustLabel} - ${trustScore}` : trustLabel}
              >
                {trustLabel}
                {trustScore != null ? ` - ${trustScore}` : ""}
              </span>
            ) : null}
            {isFrozen ? (
              <span className="inline-flex items-center rounded-full px-2 py-1 font-semibold bg-rose-600 text-white">
                {t("seller_frozen") || "Seller Frozen"}
              </span>
            ) : underReview ? (
              <span className="inline-flex items-center rounded-full px-2 py-1 font-semibold bg-amber-500 text-white">
                {t("under_review") || "Under Review"}
              </span>
            ) : null}
          </div>
        ) : null}
        <div className="flex items-center justify-between mt-auto">
          <span className="text-primary font-bold text-xl">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(safeProduct.price))}</span>
          <Button size="sm" aria-label={t("view_product")}>
            {t("view")}
          </Button>
        </div>
      </div>
    </div>
    </CardContextMenu>
  );
});

export default ProductCard;


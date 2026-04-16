import React from "react";
import {
  useTrustScore,
  getTrustBadgeClass,
  normalizeTrustPayload,
  isComplaintRiskState,
} from "@/hooks/useTrustScore";

const resolveLocalTrust = ({ trust, riskState, underReview }) =>
  normalizeTrustPayload(
    trust ||
      (riskState || underReview != null
        ? { risk_state: riskState, under_review: underReview }
        : null),
  );

const SellerTrustBadges = ({
  sellerId,
  trust,
  riskState,
  underReview,
  className = "",
  size = "xs",
  showScore = true,
}) => {
  const normalizedLocalTrust = resolveLocalTrust({
    trust,
    riskState,
    underReview,
  });
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
  const resolvedRiskState = resolvedTrust?.riskState || riskState;
  const isFrozen = resolvedRiskState?.status === "frozen";
  const resolvedUnderReview =
    resolvedTrust?.underReview ??
    (underReview != null
      ? Boolean(underReview)
      : isComplaintRiskState(resolvedRiskState));

  if (!trustLabel && !isFrozen && !resolvedUnderReview) {
    return null;
  }

  const sizeClass =
    size === "sm"
      ? "text-[10px] px-2 py-0.5"
      : size === "md"
        ? "text-xs px-2.5 py-0.5"
        : "text-[9px] px-1.5 py-0.5";
  const trustTitle =
    trustLabel && trustScore != null ? `${trustLabel} - ${trustScore}` : trustLabel;

  return (
    <div className={`flex flex-wrap items-center gap-1 ${className}`.trim()}>
      {trustLabel ? (
        <span
          className={`inline-flex items-center rounded-full font-semibold ${sizeClass} ${trustBadgeClass}`}
          title={trustTitle}
        >
          {trustLabel}
          {showScore && trustScore != null ? ` - ${trustScore}` : ""}
        </span>
      ) : null}
      {isFrozen ? (
        <span
          className={`inline-flex items-center rounded-full font-semibold ${sizeClass} bg-rose-600 text-white`}
        >
          Seller Frozen
        </span>
      ) : resolvedUnderReview ? (
        <span
          className={`inline-flex items-center rounded-full font-semibold ${sizeClass} bg-amber-500 text-white`}
        >
          Under Review
        </span>
      ) : null}
    </div>
  );
};

export default SellerTrustBadges;

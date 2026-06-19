import React, { memo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

import { useTranslation } from 'react-i18next';
import {
  useTrustScore,
  getTrustBadgeClass,
  normalizeTrustPayload,
  isComplaintRiskState,
} from '@/hooks/useTrustScore';

const FeedPostCard = memo(function FeedPostCard({ post }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const subcategoryLabel =
    post?.subcategory_name || post?.subcategory || post?.subcategoryName || "";
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
  const trustState = useTrustScore(sellerId, { enabled: shouldFetchTrust });
  const resolvedTrust = normalizedLocalTrust || trustState;
  const trustBadgeClass = getTrustBadgeClass(resolvedTrust?.level);
  const trustLabel = resolvedTrust?.label;
  const trustScore = resolvedTrust?.score;
  const riskState = resolvedTrust?.riskState || localRiskState;
  const isFrozen = riskState?.status === 'frozen';
  const underReview =
    resolvedTrust?.underReview ??
    (localUnderReview != null ? Boolean(localUnderReview) : isComplaintRiskState(riskState));

  const handleViewDetails = useCallback(() => {
    navigate(`/post/${post.id || post.post_id}`, { state: { post } });
  }, [navigate, post]);

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow mb-4 rounded-2xl border border-blue-100 flex flex-col p-0">
      <CardHeader className="pb-2 flex items-center justify-between">
        <CardTitle className="text-lg font-semibold text-blue-900">
          {post.title || t("post_untitled")}
        </CardTitle>
        <div className="flex items-center gap-2">
          {subcategoryLabel ? (
            <Badge variant="secondary" className="text-xs">
              {subcategoryLabel}
            </Badge>
          ) : null}
          {trustLabel ? (
            <Badge
              className={`text-xs px-2 py-1 leading-none ${trustBadgeClass}`}
              title={trustScore != null ? `${trustLabel} · ${trustScore}` : trustLabel}
            >
              {trustLabel}
              {trustScore != null ? ` · ${trustScore}` : ""}
            </Badge>
          ) : null}
          {isFrozen ? (
            <Badge className="text-xs px-2 py-1 leading-none bg-rose-600 text-white border-0">
              Seller Frozen
            </Badge>
          ) : underReview ? (
            <Badge className="text-xs px-2 py-1 leading-none bg-amber-500 text-white border-0">
              Under Review
            </Badge>
          ) : null}
          <Badge variant="outline" className="text-xs">{t("text_post", "Text Post")}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-gray-700 mb-2 whitespace-pre-line text-base md:text-lg">
          {post.description || <span className="italic text-gray-400">{t("no_description")}</span>}
        </div>
        <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
          <span>{t("posted_by_user", { userId: post.user_id })}</span>
          <span>{formatDate(post.created_at)}</span>
        </div>
        <div className="flex items-center justify-end">
          <button
            className="h-8 px-3 bg-blue-600 text-white rounded text-xs sm:h-8 sm:text-xs md:text-sm font-medium hover:bg-blue-700"
            onClick={handleViewDetails}
          >
            {t("view_details", "View Details")}
          </button>
        </div>
      </CardContent>
    </Card>
  );
});

export default FeedPostCard;

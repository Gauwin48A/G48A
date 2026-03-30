import React, { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, MapPin, Clock, Phone } from 'lucide-react';
import { formatPrice, formatDate } from '@/lib/utils';

import { useTranslation } from 'react-i18next';
import {
  useTrustScore,
  getTrustBadgeClass,
  normalizeTrustPayload,
  isComplaintRiskState,
} from '@/hooks/useTrustScore';
import { getApiOriginBase } from '@/lib/networkConfig';

/**
 * Mask a phone number for privacy: show first 2 and last 2 digits.
 * e.g., "9876543210" → "98******10"
 */
function maskPhone(phone) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length < 5) return '***';
  return `${digits.slice(0, 2)}${'*'.repeat(digits.length - 4)}${digits.slice(-2)}`;
}

const PostCard = memo(function PostCard({ post }) {
  const { t } = useTranslation();
  const {
    id,
    title,
    brand,
    model,
    condition,
    price,
    location,
    isVerified,
    createdAt,
    expiresAt,
    images,
    contactNumber
  } = post;
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

  const daysLeft = Math.ceil((new Date(expiresAt) - new Date()) / (1000 * 60 * 60 * 24));

  // Helper to get full image URL
  const baseUrl = getApiOriginBase();
  const getImageUrl = (img) => {
    if (!img) return '/placeholder.svg';
    if (img.startsWith('/uploads/')) return baseUrl + img;
    if (img.startsWith('http')) return img;
    return '/placeholder.svg';
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {/* Image */}
      <div className="aspect-video bg-gray-100 relative">
        {images && images.length > 0 ? (
          <img
            src={getImageUrl(images[0])}
            alt={title}
            className="w-full h-full object-cover"
            onError={e => { e.target.onerror = null; e.target.src = "/placeholder.svg"; }}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            No Image
          </div>
        )}

        {trustLabel && (
          <Badge
            className={`absolute top-2 left-2 text-[10px] px-2 py-1 leading-none ${trustBadgeClass}`}
            title={trustScore != null ? `${trustLabel} · ${trustScore}` : trustLabel}
          >
            {trustLabel}
            {trustScore != null ? ` · ${trustScore}` : ""}
          </Badge>
        )}
        {isFrozen ? (
          <Badge className="absolute top-9 left-2 text-[10px] px-2 py-1 leading-none bg-rose-600 text-white border-0">
            Seller Frozen
          </Badge>
        ) : underReview ? (
          <Badge className="absolute top-9 left-2 text-[10px] px-2 py-1 leading-none bg-amber-500 text-white border-0">
            Under Review
          </Badge>
        ) : null}
        
        {/* Verification Badge */}
        {isVerified && (
          <Badge className="absolute top-2 right-2 bg-green-600">
            <Shield className="w-3 h-3 mr-1" />
            Verified
          </Badge>
        )}
      </div>

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
          <div className="text-right">
            <p className="text-lg sm:text-2xl font-bold text-green-600 dark:text-green-400">{formatPrice(price)}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 text-[11px] sm:text-sm text-gray-600 dark:text-gray-400">
          <span>{brand}</span>
          <span>•</span>
          <span>{model}</span>
          <span>•</span>
          <Badge variant="outline" className="text-xs">
            {condition}
          </Badge>
          {subcategoryLabel ? (
            <>
              <span>â€¢</span>
              <Badge variant="secondary" className="text-xs">
                {subcategoryLabel}
              </Badge>
            </>
          ) : null}
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-2 sm:space-y-3">
          {/* Location */}
          <div className="flex items-center space-x-2 text-[11px] sm:text-sm text-gray-600 dark:text-gray-400">
            <MapPin className="w-4 h-4" />
            <span>{location}</span>
          </div>

          {/* Time Info */}
          <div className="flex items-center justify-between text-[11px] sm:text-sm">
            <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
              <Clock className="w-4 h-4" />
              <span>Posted {formatDate(createdAt)}</span>
            </div>
            <Badge 
              variant={daysLeft <= 3 ? "destructive" : "secondary"}
              className="text-xs"
            >
              {daysLeft > 0 ? `${daysLeft} days left` : 'Expired'}
            </Badge>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-nowrap items-center gap-1 overflow-x-auto whitespace-nowrap pt-2 scrollbar-hide sm:gap-2">
            <Button
              className="flex-1 min-w-[96px] h-8 text-[11px] sm:h-9 sm:text-sm"
              onClick={() => {
                if (contactNumber) window.open(`tel:${contactNumber}`);
              }}
              disabled={!contactNumber}
              title={contactNumber ? `Call ${maskPhone(contactNumber)}` : 'No contact number'}
            >
              <Phone className="w-4 h-4 mr-1 sm:mr-2" />
              {contactNumber ? `Call ${maskPhone(contactNumber)}` : 'No Number'}
            </Button>
            <Button variant="outline" className="flex-1 min-w-[96px] h-8 text-[11px] sm:h-9 sm:text-sm">
              View Details
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

export default PostCard;

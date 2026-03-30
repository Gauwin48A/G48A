import React, { memo } from "react";

/**
 * SkeletonLoader — Shimmer animations per Deatiled_doc.txt requirement.
 * Provides skeleton placeholders for various content types:
 * - card: Compact product card skeleton
 * - list: Vertical list items
 * - carousel: Horizontal carousel items
 * - profile: Profile header skeleton
 * - text: Text block skeleton
 */

const CardSkeleton = memo(function CardSkeleton() {
  return (
    <div className="flex bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-2 animate-pulse">
      <div className="w-[100px] h-[120px] rounded-md mhub-skeleton flex-shrink-0" />
      <div className="flex-1 ml-2 flex flex-col justify-between">
        <div className="h-4 mhub-skeleton rounded w-3/4" />
        <div className="h-5 mhub-skeleton rounded w-1/3 mt-1" />
        <div className="flex items-center gap-2 mt-1">
          <div className="w-5 h-5 rounded-full mhub-skeleton" />
          <div className="h-3 mhub-skeleton rounded w-20" />
        </div>
        <div className="h-3 mhub-skeleton rounded w-2/3 mt-1" />
        <div className="flex gap-1 mt-1">
          <div className="h-7 mhub-skeleton rounded flex-1" />
          <div className="h-7 mhub-skeleton rounded w-8" />
        </div>
      </div>
    </div>
  );
});

const CarouselSkeleton = memo(function CarouselSkeleton() {
  return (
    <div className="flex gap-2 overflow-hidden">
      {[1, 2, 3].map((i) => (
        <div key={i} className="w-[140px] flex-shrink-0 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
          <div className="h-[100px] mhub-skeleton" />
          <div className="p-2 space-y-1.5">
            <div className="h-3 mhub-skeleton rounded w-4/5" />
            <div className="h-4 mhub-skeleton rounded w-1/2" />
            <div className="h-6 mhub-skeleton rounded" />
          </div>
        </div>
      ))}
    </div>
  );
});

const ProfileSkeleton = memo(function ProfileSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-full mhub-skeleton" />
        <div className="flex-1 space-y-2">
          <div className="h-5 mhub-skeleton rounded w-1/3" />
          <div className="h-3 mhub-skeleton rounded w-1/2" />
          <div className="h-3 mhub-skeleton rounded w-1/4" />
        </div>
      </div>
      <div className="h-2 mhub-skeleton rounded w-full" />
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 mhub-skeleton rounded-lg" />
        ))}
      </div>
    </div>
  );
});

const TextSkeleton = memo(function TextSkeleton({ lines = 3 }) {
  return (
    <div className="animate-pulse space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-3 mhub-skeleton rounded"
          style={{ width: `${85 - i * 12}%` }}
        />
      ))}
    </div>
  );
});

const SkeletonLoader = memo(function SkeletonLoader({
  type = "card",
  count = 3,
  lines,
}) {
  if (type === "carousel") return <CarouselSkeleton />;
  if (type === "profile") return <ProfileSkeleton />;
  if (type === "text") return <TextSkeleton lines={lines} />;

  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
});

export default SkeletonLoader;

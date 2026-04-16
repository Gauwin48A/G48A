import React from "react";
import { Card } from "@/components/ui/card";

/**
 * PostCardSkeleton - Skeleton placeholder for post cards
 * Used during loading state in AllPosts and other listing pages
 */
export default function PostCardSkeleton({ count = 6 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <Card
          key={`skeleton-${index}`}
          className="rounded-2xl shadow mhub-premium-surface border border-blue-100 dark:border-gray-700 flex flex-col p-0 overflow-hidden min-h-[520px] sm:min-h-[540px] animate-pulse"
        >
          {/* Price header skeleton */}
          <div className="px-3 pt-2.5 pb-2 border-b border-gray-100 dark:border-gray-700/70 sm:px-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-gray-200 dark:bg-gray-700 px-3 py-2 w-24 h-8" />
          </div>

          {/* Seller info skeleton */}
          <div className="relative px-3 pt-2 pb-2 flex items-center gap-2 sm:px-4 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16" />
            </div>
            <div className="absolute right-3 top-3 w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700" />
          </div>

          {/* Image skeleton */}
          <div className="w-full h-[200px] sm:h-[260px] md:h-[340px] bg-gray-200 dark:bg-gray-700" />

          {/* Content skeleton */}
          <div className="flex-1 flex flex-col justify-between px-3 py-3 sm:px-4 sm:py-4">
            <div className="space-y-2">
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
            </div>

            {/* Action buttons skeleton */}
            <div className="mt-3 flex items-center gap-2">
              <div className="h-7 sm:h-8 bg-gray-200 dark:bg-gray-700 rounded-full w-16" />
              <div className="h-7 sm:h-8 bg-gray-200 dark:bg-gray-700 rounded-full w-16" />
              <div className="h-7 sm:h-8 bg-gray-200 dark:bg-gray-700 rounded-full w-16" />
              <div className="flex-1" />
              <div className="h-7 sm:h-8 bg-blue-200 dark:bg-blue-700 rounded w-24" />
            </div>
          </div>
        </Card>
      ))}
    </>
  );
}

/**
 * CategoryChipSkeleton - Skeleton for category filter chips
 */
export function CategoryChipSkeleton({ count = 8 }) {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide py-2">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={`chip-skeleton-${index}`}
          className="h-8 sm:h-9 w-20 sm:w-24 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse shrink-0"
        />
      ))}
    </div>
  );
}

/**
 * SubcategoryChipSkeleton - Skeleton for subcategory chips
 */
export function SubcategoryChipSkeleton({ count = 6 }) {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide py-2">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={`sub-skeleton-${index}`}
          className="h-7 sm:h-8 w-24 sm:w-28 rounded-full bg-indigo-100 dark:bg-indigo-900/30 animate-pulse shrink-0"
        />
      ))}
    </div>
  );
}


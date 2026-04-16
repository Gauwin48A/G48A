import React, { useState, useEffect, memo, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, ShieldCheck, Sparkles, Loader2 } from "lucide-react";
import { getApiOriginBase } from "@/lib/networkConfig";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import { useCategoryMode } from "@/context/CategoryModeContext";
import {
  buildActiveAppMatcher,
  matchesCategoryModeItem,
} from "@/utils/categoryModeFilters";

const API_BASE = (() => {
  const base = String(getApiOriginBase()).replace(/\/+$/, "");
  return base.endsWith("/api") ? base : `${base}/api`;
})();

const BADGE_CONFIG = {
  crown: { icon: Crown, label: "Premium", color: "text-amber-500" },
  verified: { icon: ShieldCheck, label: "Silver", color: "text-gray-500" },
  seller: { icon: Sparkles, label: "Bronze", color: "text-orange-400" },
};

const BOOST_BADGE_CONFIG = {
  3: { label: "Spotlight", className: "bg-orange-500 text-white" },
  2: { label: "Featured", className: "bg-purple-500 text-white" },
  1: { label: "Boosted", className: "bg-emerald-500 text-white" },
};

function formatPrice(price) {
  if (!price && price !== 0) return "\u20B9 N/A";
  const numeric = Number(price);
  if (!Number.isFinite(numeric)) return "\u20B9 N/A";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(numeric);
}

function extractImageUrl(entry) {
  if (!entry) return null;
  if (typeof entry === "string") return entry;
  if (typeof entry === "object") {
    return (
      entry.url ||
      entry.image_url ||
      entry.imageUrl ||
      entry.path ||
      entry.file_path ||
      entry.filePath ||
      entry.src ||
      entry.uri ||
      null
    );
  }
  return null;
}

function getFirstImage(images) {
  if (!images) return null;
  if (typeof images === "string") {
    try {
      const parsed = JSON.parse(images);
      if (Array.isArray(parsed)) {
        return extractImageUrl(parsed[0]);
      }
      const extracted = extractImageUrl(parsed);
      if (extracted) return extracted;
    } catch {
      return images;
    }
    return images;
  }
  if (Array.isArray(images)) {
    return extractImageUrl(images[0]);
  }
  if (typeof images === "object") {
    return extractImageUrl(images);
  }
  return null;
}

function getPostId(post) {
  if (!post) return "";
  const direct =
    post.post_id ??
    post.postId ??
    post.id ??
    post.listing_id ??
    post.listingId ??
    null;
  if (direct !== null && direct !== undefined && String(direct).trim()) {
    return String(direct);
  }
  const nested = post.post || post.listing || null;
  const nestedId =
    nested?.post_id ??
    nested?.postId ??
    nested?.id ??
    nested?.listing_id ??
    nested?.listingId ??
    null;
  return nestedId !== null && nestedId !== undefined ? String(nestedId) : "";
}

const RecommendationCard = memo(function RecommendationCard({ post }) {
  const postId = getPostId(post);
  const image = resolveMediaUrl(getFirstImage(post.images), "/placeholder.svg");
  const badge = BADGE_CONFIG[post.badge_type];
  const boostLevel = Number(post.boost_level || 0);
  const boostBadge = BOOST_BADGE_CONFIG[boostLevel] || null;
  const linkProps = postId
    ? { to: `/post/${postId}`, state: { post } }
    : {
        to: "#",
        onClick: (event) => event.preventDefault(),
        "aria-disabled": true,
      };

  return (
    <Link
      {...linkProps}
      className="block group"
    >
      <Card className="overflow-hidden h-full transition-shadow hover:shadow-md">
        <div className="aspect-[4/3] bg-muted relative overflow-hidden">
          {image ? (
            <img
              src={image}
              alt={post.title || "Premium listing"}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
              No image
            </div>
          )}
          {badge && (
            <div className="absolute top-2 right-2">
              <Badge variant="secondary" className="text-[10px] gap-1 bg-white/90 backdrop-blur-sm">
                <badge.icon className={`h-3 w-3 ${badge.color}`} />
                {badge.label}
              </Badge>
            </div>
          )}
          {boostBadge && (
            <div className="absolute top-2 left-2">
              <Badge className={`text-[10px] ${boostBadge.className}`}>
                {boostBadge.label}
              </Badge>
            </div>
          )}
        </div>
        <CardContent className="p-3">
          <p className="text-sm font-medium line-clamp-1 group-hover:text-primary transition-colors">
            {post.title || "Untitled"}
          </p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-sm font-bold text-primary">
              {formatPrice(post.price)}
            </span>
            <span className="text-[11px] text-muted-foreground truncate ml-2">
              {post.seller_name}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
});

/**
 * Premium Recommendations section for post detail pages.
 * Shows premium listings from the same category.
 * @param {{ postId: string, limit?: number, category?: string, categoryId?: string, categoryGroup?: string }} props
 */
export default function PremiumRecommendations({
  postId,
  limit = 5,
  variant = "card",
  onStatusChange,
  category,
  categoryId,
  categoryGroup,
}) {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const {
    activeCategory,
    activeApp,
    categories: categorySource,
    hasSelection: hasCategoryMode,
  } = useCategoryMode();

  const resolvedCategoryName = useMemo(() => {
    if (hasCategoryMode && activeCategory?.name) {
      return String(activeCategory.name).trim();
    }
    if (!category) return "";
    if (typeof category === "string") return category.trim();
    if (typeof category === "object") {
      const nested = category?.name || category?.title || category?.label || "";
      return String(nested || "").trim();
    }
    return String(category || "").trim();
  }, [activeCategory?.name, category, hasCategoryMode]);

  const resolvedCategoryId = useMemo(() => {
    if (hasCategoryMode) {
      const id = activeCategory?.id || activeCategory?.category_id || "";
      return id != null ? String(id).trim() : "";
    }
    if (categoryId != null && categoryId !== "") return String(categoryId).trim();
    return "";
  }, [activeCategory?.category_id, activeCategory?.id, categoryId, hasCategoryMode]);

  const activeAppKey = useMemo(
    () => (categoryGroup || activeApp ? String(categoryGroup || activeApp).trim().toLowerCase() : ""),
    [activeApp, categoryGroup],
  );

  const activeAppMatcher = useMemo(
    () => buildActiveAppMatcher(activeAppKey, categorySource),
    [activeAppKey, categorySource],
  );

  useEffect(() => {
    if (!postId) return;
    let cancelled = false;

    async function load() {
      try {
        if (onStatusChange) {
          onStatusChange({ loading: true, count: 0, hasResults: false });
        }
        const params = new URLSearchParams();
        params.set("limit", String(limit));
        if (resolvedCategoryId) params.set("category_id", String(resolvedCategoryId));
        if (!resolvedCategoryId && resolvedCategoryName) {
          params.set("category", String(resolvedCategoryName));
        }
        if (activeAppKey) params.set("category_group", String(activeAppKey));
        const res = await fetch(
          `${API_BASE}/posts/${postId}/premium-recommendations?${params.toString()}`,
          {
            headers: { "Content-Type": "application/json" },
            credentials: "include",
          },
        );
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();
        if (!cancelled) {
          const list = Array.isArray(data.recommendations) ? data.recommendations : [];
          setRecommendations(list);
          if (onStatusChange) {
            onStatusChange({ loading: false, count: list.length, hasResults: list.length > 0 });
          }
        }
      } catch {
        if (!cancelled && onStatusChange) {
          onStatusChange({ loading: false, count: 0, hasResults: false, error: true });
        }
        // Silently fail - this is an enhancement, not critical
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [
    postId,
    limit,
    onStatusChange,
    resolvedCategoryId,
    resolvedCategoryName,
    activeAppKey,
  ]);

  const filteredRecommendations = useMemo(() => {
    if (!Array.isArray(recommendations) || recommendations.length === 0) return [];
    const hasCategory = !!(resolvedCategoryId || resolvedCategoryName);
    const categoryFilter = hasCategory
      ? {
          activeCategory: resolvedCategoryName ? { name: resolvedCategoryName } : null,
          activeCategoryId: resolvedCategoryId || "",
        }
      : null;
    return recommendations.filter((post) => {
      if (categoryFilter) {
        if (!matchesCategoryModeItem(post, categoryFilter)) {
          return false;
        }
      }
      if (activeAppMatcher?.activeApp) {
        if (!matchesCategoryModeItem(post, { activeAppMatcher })) {
          return false;
        }
      }
      return true;
    });
  }, [activeAppMatcher, recommendations, resolvedCategoryId, resolvedCategoryName]);

  useEffect(() => {
    if (!onStatusChange) return;
    if (loading) {
      onStatusChange({ loading: true, count: 0, hasResults: false });
      return;
    }
    onStatusChange({
      loading: false,
      count: filteredRecommendations.length,
      hasResults: filteredRecommendations.length > 0,
    });
  }, [filteredRecommendations.length, loading, onStatusChange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!filteredRecommendations.length) {
    if (variant === "embedded") {
      return (
        <div className="text-xs text-gray-400 dark:text-gray-500">
          No premium listings right now.
        </div>
      );
    }
    return null;
  }

  const grid = (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {filteredRecommendations.map((post, index) => (
        <RecommendationCard key={getPostId(post) || post?.title || index} post={post} />
      ))}
    </div>
  );

  if (variant === "embedded") {
    return grid;
  }

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-amber-500" />
        <h3 className="text-base font-semibold">Premium Listings</h3>
      </div>
      {grid}
    </div>
  );
}





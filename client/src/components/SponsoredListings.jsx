import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import api from "@/lib/api";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import { useCategoryMode } from "@/context/CategoryModeContext";
import {
  buildActiveAppMatcher,
  matchesCategoryModeItem,
} from "@/utils/categoryModeFilters";

const PROMO_BADGE_COLORS = {
  Spotlight: "bg-orange-500 text-white",
  Featured: "bg-purple-500 text-white",
  Boosted: "bg-emerald-500 text-white",
  "Premium Seller": "bg-yellow-500 text-black",
  "Silver Seller": "bg-slate-500 text-white",
  "Bronze Seller": "bg-amber-500 text-white",
  Promoted: "bg-blue-500 text-white",
  Listing: "bg-gray-400 text-white",
};

function formatPrice(price) {
  const n = Number(price);
  if (!Number.isFinite(n)) return "\u20B9 N/A";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
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

export default function SponsoredListings({
  excludePostId,
  category,
  categoryId,
  categoryGroup,
  limit = 6,
  variant = "card",
  onStatusChange,
}) {
  const [posts, setPosts] = useState([]);
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
    let cancelled = false;
    setLoading(true);
    if (onStatusChange) {
      onStatusChange({ loading: true, count: 0, hasResults: false });
    }
    const params = new URLSearchParams({ limit: String(limit) });
    if (excludePostId) params.set("excludePostId", String(excludePostId));
    if (resolvedCategoryId) params.set("category_id", String(resolvedCategoryId));
    if (!resolvedCategoryId && resolvedCategoryName) {
      params.set("category", String(resolvedCategoryName));
    }
    if (activeAppKey) params.set("category_group", String(activeAppKey));

    api.get(`/api/posts/sponsored?${params.toString()}`)
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res?.posts) ? res.posts : Array.isArray(res) ? res : [];
        setPosts(list);
        if (onStatusChange) {
          onStatusChange({ loading: false, count: list.length, hasResults: list.length > 0 });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPosts([]);
          if (onStatusChange) {
            onStatusChange({ loading: false, count: 0, hasResults: false, error: true });
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [
    excludePostId,
    resolvedCategoryId,
    resolvedCategoryName,
    activeAppKey,
    limit,
    onStatusChange,
  ]);

  const categoryFilter = useMemo(() => {
    const hasCategory = !!(resolvedCategoryId || resolvedCategoryName);
    if (!hasCategory) return null;
    return {
      activeCategory: resolvedCategoryName ? { name: resolvedCategoryName } : null,
      activeCategoryId: resolvedCategoryId || "",
    };
  }, [resolvedCategoryId, resolvedCategoryName]);

  const displayPosts = useMemo(() => {
    if (!Array.isArray(posts) || posts.length === 0) return [];
    return posts.filter((post) => {
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
  }, [activeAppMatcher, categoryFilter, posts]);

  useEffect(() => {
    if (!onStatusChange) return;
    if (loading) {
      onStatusChange({ loading: true, count: 0, hasResults: false });
      return;
    }
    onStatusChange({
      loading: false,
      count: displayPosts.length,
      hasResults: displayPosts.length > 0,
    });
  }, [displayPosts.length, loading, onStatusChange]);

  if (!loading && displayPosts.length === 0) {
    if (variant === "embedded") {
      return (
        <div className="text-xs text-gray-400 dark:text-gray-500">
          No sponsored listings right now.
        </div>
      );
    }
    return null;
  }

  const cardWidth = variant === "embedded" ? "w-48 sm:w-52" : "w-36";
  const useGrid = variant === "embedded" && !loading && displayPosts.length > 0 && displayPosts.length <= 3;
  const listClass = useGrid
    ? "grid grid-cols-2 sm:grid-cols-3 gap-3"
    : "flex gap-3 overflow-x-auto pb-2 scrollbar-hide";
  const imageAspectClass = variant === "embedded" ? "aspect-[4/3]" : "aspect-square";

  const listBody = loading ? (
    <div className={listClass}>
      {[1, 2, 3].map((k) => (
        <div
          key={k}
          className={`${useGrid ? "w-full" : `flex-shrink-0 ${cardWidth}`} rounded-xl bg-gray-100 dark:bg-gray-700 animate-pulse h-52`}
        />
      ))}
    </div>
  ) : (
    <div className={listClass}>
      {displayPosts.map((post) => {
        const postId = getPostId(post);
        const imgSrc = resolveMediaUrl(
          getFirstImage(post.images),
          "/placeholder.svg",
        );
        const badge = post.promo_label || "Promoted";
        const badgeClass =
          PROMO_BADGE_COLORS[badge] || PROMO_BADGE_COLORS.Promoted;
        const linkProps = postId
          ? { to: `/post/${postId}`, state: { post } }
          : {
              to: "#",
              onClick: (event) => event.preventDefault(),
              "aria-disabled": true,
            };
        return (
          <Link
            key={postId || post.title}
            {...linkProps}
            className={`${useGrid ? "w-full" : `flex-shrink-0 ${cardWidth}`} rounded-xl overflow-hidden border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 hover:shadow-md transition-shadow group flex flex-col`}
          >
            <div className={`relative ${imageAspectClass} bg-gray-100 dark:bg-gray-700`}>
              <img
                src={imgSrc}
                alt={post.title || "Sponsored listing"}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                onError={(ev) => {
                  ev.target.src = "/placeholder.svg";
                }}
              />
              <span
                className={`absolute top-1 left-1 text-xs font-bold px-1.5 py-1 rounded-full ${badgeClass}`}
              >
                {badge}
              </span>
            </div>
            <div className="p-2 mt-auto">
              <p className="text-xs font-semibold text-gray-800 dark:text-white line-clamp-2 leading-tight">
                {post.title || "Listing"}
              </p>
              <p className="text-xs font-bold text-green-600 dark:text-green-400 mt-1">
                {formatPrice(post.price)}
              </p>
              {post.location && (
                <p className="text-xs text-gray-400 mt-0.5 truncate">
                  {post.location}
                </p>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );

  if (variant === "embedded") {
    return listBody;
  }

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-gray-700 mhub-premium-surface p-4 shadow-lg">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-5 h-5 text-amber-500" />
        <h3 className="font-bold text-gray-900 dark:text-white text-sm">
          Sponsored Listings
        </h3>
        <span className="text-xs bg-slate-100 dark:bg-gray-700 text-slate-500 dark:text-gray-400 px-2 py-1 rounded-full">
          Ad
        </span>
      </div>
      {listBody}
    </div>
  );
}




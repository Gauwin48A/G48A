import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ExternalLink,
  Grid3X3,
  Loader2,
  MapPin,
  Package,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import api from "@/services/api";
import { getChannelById, getChannelByUser } from "@/lib/api";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import { formatINR } from "@/utils/formatPrice";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const LISTING_PAGE_SIZE = 12;

const resolveChannelFromPayload = (payload) => {
  const data = payload?.data ?? payload;
  if (!data) return null;
  if (data.channel) return data.channel;
  if (data.channel_id || data.owner_id || data.ownerId) return data;
  return null;
};

const resolveOwnerId = (channel) =>
  channel?.owner_id ||
  channel?.ownerId ||
  channel?.user_id ||
  channel?.userId ||
  channel?.id ||
  "";

const resolveListingImage = (post) => {
  const direct =
    post?.image_url ||
    post?.imageUrl ||
    post?.thumbnail ||
    post?.thumbnail_url ||
    post?.image;
  if (direct) return resolveMediaUrl(direct, "/placeholder.svg");
  const images = post?.images || post?.image_urls || post?.imageUrls;
  if (Array.isArray(images) && images.length) {
    return resolveMediaUrl(images[0], "/placeholder.svg");
  }
  if (typeof images === "string" && images.trim()) {
    try {
      const parsed = JSON.parse(images);
      if (Array.isArray(parsed) && parsed.length) {
        return resolveMediaUrl(parsed[0], "/placeholder.svg");
      }
    } catch {
      return resolveMediaUrl(images, "/placeholder.svg");
    }
  }
  return "/placeholder.svg";
};

const resolveCoverImage = (channel) => {
  const cover =
    channel?.cover_image ||
    channel?.coverImage ||
    channel?.banner_url ||
    channel?.banner;
  return cover ? resolveMediaUrl(cover) : null;
};

const resolveAvatar = (channel) => {
  const avatar =
    channel?.avatar ||
    channel?.avatar_url ||
    channel?.logo ||
    channel?.logo_url ||
    channel?.image;
  return avatar ? resolveMediaUrl(avatar) : null;
};

const getInitials = (name) => {
  if (!name) return "C";
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
};

const formatPrice = (value, tr) => {
  const formatted = formatINR(value);
  return formatted || tr("price_on_request", "Price on request");
};

function HeroSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-48 sm:h-56 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
      <div className="flex items-end gap-4 -mt-10 px-6">
        <div className="h-20 w-20 rounded-2xl bg-slate-300 dark:bg-slate-700 ring-4 ring-white dark:ring-slate-950" />
        <div className="flex-1 pb-2 space-y-2">
          <div className="h-5 w-48 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-3 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
        </div>
      </div>
    </div>
  );
}

function ListingSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-2xl overflow-hidden">
          <div className="aspect-[4/3] bg-slate-200 dark:bg-slate-800" />
          <div className="p-4 space-y-2 bg-white dark:bg-slate-900">
            <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-4 w-1/3 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-3 w-1/2 bg-slate-200 dark:bg-slate-700 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function CentreListings() {
  const { id } = useParams();
  const { t } = useTranslation();
  const tr = useCallback(
    (key, fallback) => t(key, { defaultValue: fallback }),
    [t],
  );

  const [channel, setChannel] = useState(null);
  const [channelLoading, setChannelLoading] = useState(true);
  const [channelError, setChannelError] = useState(null);

  const [listings, setListings] = useState([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [listingsError, setListingsError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [viewMode, setViewMode] = useState("grid");

  const ownerId = useMemo(() => resolveOwnerId(channel), [channel]);

  const loadChannel = useCallback(async () => {
    if (!id) {
      setChannel(null);
      setChannelError(tr("centre_not_found", "CentrePage not found"));
      setChannelLoading(false);
      return;
    }
    setChannelLoading(true);
    setChannelError(null);
    let payload = null;
    let caughtError = null;
    try {
      payload = await getChannelById(id);
    } catch (err) {
      caughtError = err;
    }
    if (!payload) {
      try {
        payload = await getChannelByUser(id);
      } catch (err) {
        caughtError = caughtError || err;
      }
    }
    const resolved = resolveChannelFromPayload(payload);
    if (!resolved) {
      setChannel(null);
      setChannelError(
        caughtError?.message || tr("centre_not_found", "CentrePage not found"),
      );
    } else {
      setChannel(resolved);
    }
    setChannelLoading(false);
  }, [id, tr]);

  const loadListings = useCallback(
    async (nextPage, { append = false } = {}) => {
      if (!ownerId) return;
      setListingsLoading(true);
      setListingsError(null);
      try {
        const response = await api.get("/posts", {
          params: {
            author: ownerId,
            limit: LISTING_PAGE_SIZE,
            page: nextPage,
            sortBy: "created_at",
            sortOrder: "desc",
          },
        });
        const payload = response?.data ?? response;
        const posts = Array.isArray(payload?.posts)
          ? payload.posts
          : Array.isArray(payload)
            ? payload
            : [];
        setListings((prev) => (append ? [...prev, ...posts] : posts));
        setHasMore(posts.length === LISTING_PAGE_SIZE);
      } catch (err) {
        if (!append) {
          setListingsError(
            err?.message || tr("listings_unavailable", "Listings unavailable"),
          );
          setListings([]);
        }
      } finally {
        setListingsLoading(false);
      }
    },
    [ownerId, tr],
  );

  useEffect(() => {
    loadChannel();
  }, [loadChannel]);

  useEffect(() => {
    if (!ownerId) return;
    setPage(1);
    loadListings(1, { append: false });
  }, [ownerId, loadListings]);

  const handleLoadMore = async () => {
    if (!hasMore || listingsLoading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    await loadListings(nextPage, { append: true });
  };

  const centreName =
    channel?.name ||
    channel?.title ||
    channel?.channel_name ||
    channel?.channelName ||
    tr("centre_page", "CentrePage");
  const centreSubtitle = channel?.description || channel?.bio || "";
  const coverImage = resolveCoverImage(channel);
  const avatarUrl = resolveAvatar(channel);
  const isVerified = channel?.verified || channel?.is_verified || false;
  const followerCount = Number(channel?.followers_count || channel?.followerCount || 0);
  const listingCount = Number(channel?.listing_count || channel?.postCount || listings.length || 0);
  const memberSince = channel?.created_at || channel?.createdAt;
  const memberYear = memberSince ? new Date(memberSince).getFullYear() : null;
  const rating = Number(channel?.rating || channel?.avg_rating || 0);
  const ratingCount = Number(channel?.rating_count || 0);

  /* ── Loading State ─────────────────────────────────────────────── */
  if (channelLoading) {
    return (
      <div className="min-h-screen mhub-premium-page bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
        <div className="container mx-auto max-w-6xl px-4 py-6 sm:px-6 page-shell page-pad">
          <HeroSkeleton />
          <div className="mt-10">
            <ListingSkeleton />
          </div>
        </div>
      </div>
    );
  }

  /* ── Error State ───────────────────────────────────────────────── */
  if (channelError) {
    return (
      <div className="min-h-screen mhub-premium-page bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
        <div className="container mx-auto max-w-6xl px-4 py-6 sm:px-6 page-shell page-pad">
          <Link
            to={`/centre/${id}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {tr("back_to_centre_pages", "Back to CentrePages")}
          </Link>
          <div className="mt-8 rounded-2xl border border-red-200/60 bg-red-50/50 p-6 text-center dark:border-red-800/40 dark:bg-red-950/20">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40 mb-3">
              <Store className="h-6 w-6 text-red-500" />
            </div>
            <p className="text-sm font-medium text-red-700 dark:text-red-300">{channelError}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={loadChannel}>
              {tr("try_again", "Try Again")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Main Content ──────────────────────────────────────────────── */
  return (
    <div className="min-h-screen mhub-premium-page bg-gradient-to-b from-slate-50 via-white to-slate-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* ─── Hero Banner ──────────────────────────────────────────── */}
      <div className="relative">
        {/* Cover Image / Gradient */}
        <div className="h-48 sm:h-56 md:h-64 overflow-hidden">
          {coverImage ? (
            <img
              src={coverImage}
              alt={centreName}
              className="h-full w-full object-cover"
              loading="eager"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-violet-500 via-blue-500 to-cyan-400 dark:from-violet-700 dark:via-blue-800 dark:to-cyan-700" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        </div>

        {/* Back Button (overlay) */}
        <Link
          to={`/centre/${id}`}
          className="absolute top-4 left-4 z-10 inline-flex items-center gap-1.5 rounded-full bg-black/30 backdrop-blur-md px-3 py-1.5 text-xs font-medium text-white hover:bg-black/50 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {tr("back", "Back")}
        </Link>

        {/* Share Button (overlay) */}
        <button
          type="button"
          className="absolute top-4 right-4 z-10 inline-flex items-center justify-center h-8 w-8 rounded-full bg-black/30 backdrop-blur-md text-white hover:bg-black/50 transition-colors"
          onClick={() => {
            if (navigator.share) {
              navigator.share({ title: centreName, url: window.location.href }).catch(() => {});
            } else if (navigator.clipboard) {
              navigator.clipboard.writeText(window.location.href).catch(() => {});
            }
          }}
          aria-label={tr("share", "Share")}
        >
          <Share2 className="h-4 w-4" />
        </button>

        {/* Profile Card (overlay at bottom) */}
        <div className="container mx-auto max-w-6xl px-4 sm:px-6">
          <div className="relative -mt-16 sm:-mt-20 z-10 flex items-end gap-4 sm:gap-5">
            {/* Avatar */}
            <div className="shrink-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={centreName}
                  className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl object-cover ring-4 ring-white dark:ring-slate-900 shadow-xl"
                />
              ) : (
                <Avatar className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl ring-4 ring-white dark:ring-slate-900 shadow-xl">
                  <AvatarFallback className="rounded-2xl text-2xl font-bold bg-gradient-to-br from-violet-500 to-blue-500 text-white">
                    {getInitials(centreName)}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>

            {/* Name & Badges */}
            <div className="flex-1 min-w-0 pb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white drop-shadow-sm truncate">
                  {centreName}
                </h1>
                {isVerified && (
                  <ShieldCheck className="h-5 w-5 text-blue-400 shrink-0" aria-label="Verified" />
                )}
              </div>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {memberYear && (
                  <Badge className="bg-white/15 text-white border-0 text-[10px] px-2 py-0.5 backdrop-blur-sm">
                    {tr("member_since", "Since")} {memberYear}
                  </Badge>
                )}
                {isVerified && (
                  <Badge className="bg-blue-500/20 text-blue-200 border-0 text-[10px] px-2 py-0.5 backdrop-blur-sm">
                    <ShieldCheck className="w-3 h-3 mr-0.5" />
                    {tr("verified_seller", "Verified")}
                  </Badge>
                )}
                {rating > 0 && (
                  <Badge className="bg-amber-500/20 text-amber-200 border-0 text-[10px] px-2 py-0.5 backdrop-blur-sm">
                    <Star className="w-3 h-3 mr-0.5 fill-amber-300" />
                    {rating.toFixed(1)}{ratingCount > 0 ? ` (${ratingCount})` : ""}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Content Area ─────────────────────────────────────────── */}
      <div className="container mx-auto max-w-6xl px-4 sm:px-6 page-shell page-pad">
        {/* Description & Stats Row */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-start">
          {/* Left: Bio */}
          <div>
            {centreSubtitle && (
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                {centreSubtitle}
              </p>
            )}
          </div>

          {/* Right: Quick Stats */}
          <div className="flex items-center gap-6 text-center">
            <div>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{listingCount}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{tr("listings", "Listings")}</p>
            </div>
            {followerCount > 0 && (
              <>
                <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />
                <div>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">{followerCount}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{tr("followers", "Followers")}</p>
                </div>
              </>
            )}
            {rating > 0 && (
              <>
                <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />
                <div>
                  <p className="text-xl font-bold text-amber-600 dark:text-amber-400 flex items-center justify-center gap-1">
                    <Star className="h-4 w-4 fill-amber-500" /> {rating.toFixed(1)}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{tr("rating", "Rating")}</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="my-6 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-slate-700" />

        {/* Section Header with View Toggle */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-blue-500">
              <Package className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                {tr("all_listings", "All Listings")}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {listings.length}{hasMore ? "+" : ""} {tr("items_available", "items available")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-md transition-colors ${viewMode === "grid" ? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"}`}
              aria-label="Grid view"
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-md transition-colors ${viewMode === "list" ? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"}`}
              aria-label="List view"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
          </div>
        </div>

        {/* Listings Content */}
        {listingsLoading && listings.length === 0 ? (
          <ListingSkeleton />
        ) : listingsError ? (
          <Card className="border-amber-200/60 bg-amber-50/50 dark:border-amber-800/40 dark:bg-amber-950/20">
            <CardContent className="p-6 text-center">
              <p className="text-sm text-amber-700 dark:text-amber-300">{listingsError}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => loadListings(1)}>
                {tr("retry", "Retry")}
              </Button>
            </CardContent>
          </Card>
        ) : listings.length === 0 ? (
          <Card className="border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30">
            <CardContent className="py-16 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 mb-4">
                <Package className="h-7 w-7 text-slate-400" />
              </div>
              <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200">
                {tr("no_listings_yet", "No listings yet")}
              </h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                {tr("centre_no_listings_desc", "This seller hasn't posted any listings yet. Check back soon!")}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Grid View */}
            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {listings.map((post) => {
                  const postId = post?.post_id || post?.id;
                  const title = post?.title || tr("untitled_listing", "Untitled listing");
                  const priceLabel = formatPrice(post?.price, tr);
                  const location = post?.location || tr("location_unknown", "Location unknown");
                  const imageUrl = resolveListingImage(post);
                  const condition = post?.condition;
                  const isFeatured = post?.is_featured || post?.featured;

                  const cardContent = (
                    <div className="group relative rounded-2xl overflow-hidden bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/60 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                      {/* Image */}
                      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                        <img
                          src={imageUrl}
                          alt={title}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                          decoding="async"
                        />
                        {/* Overlay badges */}
                        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5">
                          {isFeatured && (
                            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 text-[10px] shadow-lg">
                              <Sparkles className="w-3 h-3 mr-0.5" /> {tr("featured", "Featured")}
                            </Badge>
                          )}
                          {condition && condition !== "unknown" && (
                            <Badge className="bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 border-0 text-[10px] backdrop-blur-sm shadow-sm">
                              {condition === "new" ? tr("condition_new", "New") :
                               condition === "like_new" ? tr("condition_like_new", "Like New") :
                               condition === "good" ? tr("condition_good", "Good") :
                               tr("condition_fair", "Fair")}
                            </Badge>
                          )}
                        </div>
                        {/* Gradient overlay at bottom */}
                        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      {/* Content */}
                      <div className="p-3.5">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate leading-snug">
                          {title}
                        </p>
                        <p className="mt-1.5 text-base font-bold bg-gradient-to-r from-emerald-600 to-green-500 bg-clip-text text-transparent dark:from-emerald-400 dark:to-green-300">
                          {priceLabel}
                        </p>
                        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">{location}</span>
                        </p>
                      </div>
                    </div>
                  );

                  return postId ? (
                    <Link key={postId} to={`/post/${postId}`}>
                      {cardContent}
                    </Link>
                  ) : (
                    <div key={title}>{cardContent}</div>
                  );
                })}
              </div>
            ) : (
              /* List View */
              <div className="space-y-3">
                {listings.map((post) => {
                  const postId = post?.post_id || post?.id;
                  const title = post?.title || tr("untitled_listing", "Untitled listing");
                  const priceLabel = formatPrice(post?.price, tr);
                  const location = post?.location || tr("location_unknown", "Location unknown");
                  const imageUrl = resolveListingImage(post);

                  const cardContent = (
                    <div className="group flex gap-4 rounded-2xl overflow-hidden bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/60 shadow-sm hover:shadow-lg transition-all duration-200 p-3">
                      <div className="h-24 w-24 sm:h-28 sm:w-28 shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
                        <img
                          src={imageUrl}
                          alt={title}
                          className="h-full w-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {title}
                        </p>
                        <p className="mt-1 text-base font-bold text-emerald-600 dark:text-emerald-400">
                          {priceLabel}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">{location}</span>
                        </p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-slate-300 dark:text-slate-600 self-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  );

                  return postId ? (
                    <Link key={postId} to={`/post/${postId}`}>
                      {cardContent}
                    </Link>
                  ) : (
                    <div key={title}>{cardContent}</div>
                  );
                })}
              </div>
            )}

            {/* Load More */}
            {hasMore && (
              <div className="mt-8 flex justify-center">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={handleLoadMore}
                  disabled={listingsLoading}
                  className="rounded-full px-8 border-slate-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/20 transition-all"
                >
                  {listingsLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      {tr("loading", "Loading...")}
                    </>
                  ) : (
                    tr("load_more", "Load more")
                  )}
                </Button>
              </div>
            )}
          </>
        )}

        {/* Bottom Spacer */}
        <div className="h-8" />
      </div>
    </div>
  );
}

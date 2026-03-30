import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";
import api from "@/services/api";
import { getChannelById, getChannelByUser } from "@/lib/api";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import { formatINR } from "@/utils/formatPrice";
import { Button } from "@/components/ui/button";

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

const formatPrice = (value, tr) => {
  const formatted = formatINR(value);
  return formatted || tr("price_on_request", "Price on request");
};

export default function CentreListings() {
  const { id } = useParams();
  const { t } = useTranslation();
  const tr = (key, fallback) => t(key, { defaultValue: fallback });

  const [channel, setChannel] = useState(null);
  const [channelLoading, setChannelLoading] = useState(true);
  const [channelError, setChannelError] = useState(null);

  const [listings, setListings] = useState([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [listingsError, setListingsError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

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

  if (channelLoading) {
    return (
      <div className="min-h-screen mhub-premium-page bg-gray-50 container mx-auto max-w-6xl p-4 sm:p-6 page-shell page-pad dark:bg-gray-950">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-300">
          <Loader2 className="h-4 w-4 animate-spin" />
          {tr("loading", "Loading...")}
        </div>
      </div>
    );
  }

  if (channelError) {
    return (
      <div className="min-h-screen mhub-premium-page bg-gray-50 container mx-auto max-w-6xl p-4 sm:p-6 page-shell page-pad dark:bg-gray-950">
        <Link
          to={`/centre/${id}`}
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          {tr("back_to_centre_pages", "Back to CentrePages")}
        </Link>
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-700 dark:bg-red-950/40 dark:text-red-200">
          {channelError}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen mhub-premium-page bg-gray-50 container mx-auto max-w-6xl p-4 sm:p-6 page-shell page-pad dark:bg-gray-950">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          to={`/centre/${id}`}
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          {tr("back_to_centre_pages", "Back to CentrePages")}
        </Link>
      </div>

      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">
          {tr("listings", "Listings")}
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          {centreName}
        </h1>
        {centreSubtitle ? (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            {centreSubtitle}
          </p>
        ) : null}
      </div>

      {listingsLoading && listings.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-300">
          <Loader2 className="h-4 w-4 animate-spin" />
          {tr("loading_listings", "Loading listings...")}
        </div>
      ) : listingsError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
          {listingsError}
        </div>
      ) : listings.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-300">
          {tr("no_listings_yet", "No listings yet.")}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.map((post) => {
              const postId = post?.post_id || post?.id;
              const title = post?.title || tr("untitled_listing", "Untitled listing");
              const priceLabel = formatPrice(post?.price, tr);
              const location = post?.location || tr("location_unknown", "Location unknown");
              const imageUrl = resolveListingImage(post);
              const cardContent = (
                <div className="group rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg dark:border-gray-700 dark:bg-gray-900/40">
                  <div className="aspect-[4/3] w-full overflow-hidden rounded-t-2xl bg-slate-100">
                    <img
                      src={imageUrl}
                      alt={title}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {title}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-emerald-600 dark:text-emerald-300">
                      {priceLabel}
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-300 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {location}
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
          {hasMore ? (
            <div className="mt-6 flex justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={handleLoadMore}
                disabled={listingsLoading}
              >
                {listingsLoading
                  ? tr("loading", "Loading...")
                  : tr("load_more", "Load more")}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

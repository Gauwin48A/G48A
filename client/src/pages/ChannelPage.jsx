import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  getChannelById,
  getChannelByUser,
  createChannelPost,
  followChannel,
} from "../lib/api";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  Users,
  Video,
  MapPin as MapPinIcon,
  Star as StarIcon,
  Package as PackageIcon,
  Edit3,
  Share2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import ImageUpload from "@/components/ImageUpload";
import api from "@/services/api";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import CentrePageTabs, {
  CentreVerificationBadge,
} from "@/components/centre/CentrePageTabs";
import CentrePageAnalytics from "@/components/centre/CentrePageAnalytics";

/* ------------------------------------------------------------------ */
/*  Skeleton loader                                                   */
/* ------------------------------------------------------------------ */
function PageSkeleton() {
  return (
    <div className="min-h-screen mhub-premium-page bg-gray-50 dark:bg-gray-950">
      <div className="h-48 sm:h-56 animate-pulse bg-slate-200 dark:bg-slate-800" />
      <div className="max-w-[640px] mx-auto px-4 -mt-12">
        <div className="flex items-end gap-4">
          <div className="h-24 w-24 rounded-2xl animate-pulse bg-slate-300 dark:bg-slate-700 ring-4 ring-white dark:ring-slate-900" />
          <div className="flex-1 pb-2 space-y-2">
            <div className="h-5 w-48 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
            <div className="h-3 w-32 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
          </div>
        </div>
        <div className="mt-6 space-y-4">
          {[1, 2, 3].map((k) => (
            <div
              key={k}
              className="rounded-2xl border border-slate-200 dark:border-slate-700 p-5 animate-pulse"
            >
              <div className="h-4 w-40 rounded bg-slate-200 dark:bg-slate-700 mb-3" />
              <div className="h-3 w-full rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-3 w-3/4 rounded bg-slate-200 dark:bg-slate-700 mt-2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Image helpers                                                     */
/* ------------------------------------------------------------------ */
function resolveListingImage(post) {
  const direct =
    post?.image_url || post?.imageUrl || post?.thumbnail || post?.image;
  if (direct) return resolveMediaUrl(direct, "/placeholder.svg");
  const images = post?.images;
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
}

function resolvePostImages(post) {
  const collected = [];
  const rawList = post?.image_urls ?? post?.imageUrls ?? null;
  if (Array.isArray(rawList)) {
    collected.push(...rawList);
  } else if (typeof rawList === "string" && rawList.trim()) {
    try {
      const parsed = JSON.parse(rawList);
      if (Array.isArray(parsed)) collected.push(...parsed);
      else collected.push(rawList);
    } catch {
      collected.push(rawList);
    }
  }
  const single = post?.image_url || post?.imageUrl;
  if (single) collected.unshift(single);
  return [...new Set(collected)]
    .map((url) => resolveMediaUrl(url, ""))
    .filter(Boolean);
}

function formatPrice(value, tr) {
  const numeric = Number(String(value ?? "").replace(/[^\d.]/g, ""));
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return tr("price_on_request", "Price on request");
  }
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(numeric);
}

/* ------------------------------------------------------------------ */
/*  Post images                                                       */
/* ------------------------------------------------------------------ */
function PostImages({ post }) {
  const images = resolvePostImages(post);
  if (!images.length) return null;
  if (images.length === 1) {
    return (
      <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
        <img
          src={images[0]}
          alt="Post media"
          className="h-64 w-full object-cover"
          loading="lazy"
          onError={(ev) => {
            ev.currentTarget.onerror = null;
            ev.currentTarget.src = "/placeholder.svg";
          }}
        />
      </div>
    );
  }
  const displayImages = images.slice(0, 4);
  const extraCount = images.length - displayImages.length;
  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      {displayImages.map((url, idx) => (
        <div
          key={`${post?.post_id || post?.id || "img"}-${idx}`}
          className="relative aspect-[4/3] overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700"
        >
          <img
            src={url}
            alt="Post media"
            className="h-full w-full object-cover"
            loading="lazy"
            onError={(ev) => {
              ev.currentTarget.onerror = null;
              ev.currentTarget.src = "/placeholder.svg";
            }}
          />
          {extraCount > 0 && idx === displayImages.length - 1 && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white text-sm font-semibold">
              +{extraCount}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Listings Grid                                                     */
/* ------------------------------------------------------------------ */
function ListingsGrid({ listings, listingsLoading, listingsError, channelId, tr }) {
  if (listingsLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6].map((k) => (
          <div
            key={k}
            className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-pulse"
          >
            <div className="aspect-square bg-slate-200 dark:bg-slate-800" />
            <div className="p-3 space-y-2">
              <div className="h-3 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-4 w-1/2 rounded bg-slate-200 dark:bg-slate-700" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (listingsError) {
    return <p className="text-sm text-red-600 dark:text-red-300">{listingsError}</p>;
  }
  if (!listings.length) {
    return (
      <div className="text-center py-8">
        <PackageIcon className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {tr("no_listings_yet", "No listings yet.")}
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {listings.map((item) => (
          <Link
            key={item.post_id || item.id || item.title}
            to={`/post/${item.post_id || item.id}`}
            className="group rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900/50 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
          >
            <div className="aspect-square overflow-hidden bg-slate-100 dark:bg-slate-800">
              <img
                src={resolveListingImage(item)}
                alt={item.title || "Listing"}
                className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
                onError={(ev) => {
                  ev.currentTarget.onerror = null;
                  ev.currentTarget.src = "/placeholder.svg";
                }}
              />
            </div>
            <div className="p-3">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                {item.title || tr("untitled_listing", "Untitled listing")}
              </p>
              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-300 mt-1">
                {formatPrice(item.price, tr)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                <MapPinIcon className="h-3 w-3" />
                {item.location || tr("location_unknown", "Location unknown")}
              </p>
            </div>
          </Link>
        ))}
      </div>
      <Link
        to={`/centre/${channelId}/listings`}
        className="inline-flex items-center text-sm font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-300 dark:hover:text-indigo-200"
      >
        {tr("view_all_listings", "View all listings")} →
      </Link>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Reviews Section                                                   */
/* ------------------------------------------------------------------ */
function ReviewsSection({ reviews, reviewsStats, reviewsLoading, reviewsError, ownerId, tr }) {
  const ratingValue = Number(
    reviewsStats?.averageRating ?? reviewsStats?.average_rating ?? reviewsStats?.avgRating ?? 0,
  );
  const reviewCountValue = Number(
    reviewsStats?.totalReviews ?? reviewsStats?.total_reviews ?? reviews?.length ?? 0,
  );
  const displayedReviews = Array.isArray(reviews) ? reviews.slice(0, 3) : [];

  if (reviewsLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-300 py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        {tr("loading_reviews", "Loading reviews...")}
      </div>
    );
  }
  if (reviewsError) {
    return <p className="text-sm text-red-600 dark:text-red-300">{reviewsError}</p>;
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {ratingValue > 0 ? ratingValue.toFixed(1) : "—"}
          </span>
          <div>
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <StarIcon
                  key={star}
                  className={`h-4 w-4 ${
                    star <= Math.round(ratingValue)
                      ? "text-amber-500 fill-amber-500"
                      : "text-slate-300 dark:text-slate-600"
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {reviewCountValue > 0
                ? `${reviewCountValue} ${tr("reviews_count", "reviews")}`
                : tr("no_reviews", "No reviews yet")}
            </p>
          </div>
        </div>
      </div>
      {displayedReviews.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {tr("be_first_review", "Be the first to review this seller.")}
        </p>
      ) : (
        <div className="space-y-3">
          {displayedReviews.map((review) => (
            <div
              key={review.review_id || review.id || review.created_at}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {review.reviewer_name || tr("anonymous", "Anonymous")}
                </span>
                <div className="flex items-center gap-0.5">
                  {review.rating &&
                    [1, 2, 3, 4, 5].map((star) => (
                      <StarIcon
                        key={star}
                        className={`h-3 w-3 ${
                          star <= Number(review.rating)
                            ? "text-amber-500 fill-amber-500"
                            : "text-slate-300 dark:text-slate-600"
                        }`}
                      />
                    ))}
                </div>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {review.comment || tr("no_comment", "No comment provided.")}
              </p>
            </div>
          ))}
        </div>
      )}
      {ownerId && (
        <Link to={`/reviews/${ownerId}`} className="inline-flex">
          <Button variant="outline" size="sm">
            {tr("view_all_reviews", "View all reviews")}
          </Button>
        </Link>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Updates Feed                                                      */
/* ------------------------------------------------------------------ */
function UpdatesFeed({
  sortedPosts, isOwner, isCentre, posting,
  description, setDescription, mediaUrl, setMediaUrl,
  postType, setPostType, setImageFiles,
  imageUploadKey, setImageUploadKey, onSubmit, tr, t,
}) {
  return (
    <div className="space-y-4">
      {isOwner && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 p-5">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
            <Edit3 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            {isCentre ? tr("post_update_title", "Post an update") : tr("create_post", "Create Post")}
          </h3>
          <form onSubmit={onSubmit} className="space-y-3">
            <Textarea
              className="min-h-[90px]"
              placeholder={t("description_placeholder") || "Write a description"}
              value={description}
              onChange={(ev) => setDescription(ev.target.value)}
            />
            {postType === "image" && (
              <ImageUpload
                key={`image-upload-${imageUploadKey}`}
                onImagesChange={setImageFiles}
                maxFiles={5}
              />
            )}
            {(postType === "image" || postType === "video") && (
              <Input
                placeholder={t("media_url_optional") || "Media URL (optional)"}
                value={mediaUrl}
                onChange={(ev) => setMediaUrl(ev.target.value)}
              />
            )}
            <div className="flex items-center gap-3">
              <select
                className="mhub-input rounded-xl px-3 py-2 text-sm"
                value={postType}
                onChange={(ev) => {
                  const nextType = ev.target.value;
                  setPostType(nextType);
                  if (nextType !== "image") {
                    setImageFiles([]);
                    setImageUploadKey((k) => k + 1);
                  }
                  if (nextType === "text") setMediaUrl("");
                }}
              >
                <option value="text">{t("text_type") || "Text"}</option>
                <option value="image">{t("image_type") || "Image"}</option>
                <option value="video">{t("video_type") || "Video"}</option>
              </select>
              <Button type="submit" disabled={posting}>
                {posting ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("publishing") || "Publishing..."}
                  </span>
                ) : isCentre ? (
                  tr("post_update", "Post Update")
                ) : (
                  t("post_button") || "Post"
                )}
              </Button>
            </div>
          </form>
        </div>
      )}
      {sortedPosts.length === 0 ? (
        <EmptyState
          type="posts"
          title={t("no_posts") || "No posts yet"}
          message={
            isOwner
              ? tr("start_posting_updates", isCentre ? "Create the first update for this CentrePage." : "Create the first post for this channel.")
              : t("check_back_later") || "Check back later for updates."
          }
        />
      ) : (
        <div className="space-y-4">
          {sortedPosts.map((post) => (
            <Card key={post.post_id} className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50">
              <CardContent className="p-4">
                {post.description && (
                  <p className="whitespace-pre-wrap text-sm text-slate-800 dark:text-slate-100">
                    {post.description}
                  </p>
                )}
                <PostImages post={post} />
                {post.video_url && (
                  <a
                    href={resolveMediaUrl(post.video_url, post.video_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline dark:text-blue-300"
                  >
                    <Video className="h-4 w-4" />
                    {t("view_video") || "View video"}
                  </a>
                )}
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
                  {new Date(post.created_at).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main ChannelPage                                                  */
/* ------------------------------------------------------------------ */
const ChannelPage = ({ variant = "channel" } = {}) => {
  const { t } = useTranslation();
  const tr = useCallback((key, fallback) => t(key, { defaultValue: fallback }), [t]);
  const tRef = useRef(t);
  const trRef = useRef(tr);
  const { toast } = useToast();
  const { channelId: paramChannelId, id: paramId } = useParams();
  const channelId = paramChannelId || paramId;
  const isCentre = variant === "centre";

  const [channel, setChannel] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [description, setDescription] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [postType, setPostType] = useState("text");
  const [imageFiles, setImageFiles] = useState([]);
  const [imageUploadKey, setImageUploadKey] = useState(0);
  const [isOwner, setIsOwner] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [error, setError] = useState(null);
  const [listings, setListings] = useState([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [listingsError, setListingsError] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewsStats, setReviewsStats] = useState(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState(null);
  const [activeTab, setActiveTab] = useState("about");

  const processChannelData = useCallback((data) => {
    const raw = data?.data ?? data;
    const ch = raw?.channel || raw || null;
    const userId = String(localStorage.getItem("userId") || "");
    setChannel(ch);
    setIsOwner(!!raw?.isOwner || (ch?.owner_id && String(ch.owner_id) === userId));
    setPosts(Array.isArray(raw?.posts) ? raw.posts : Array.isArray(ch?.posts) ? ch.posts : []);
  }, []);

  const fetchChannel = useCallback(async () => {
    if (!channelId) {
      setError(tRef.current("something_went_wrong") || "Failed to load channel");
      setChannel(null);
      setPosts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      let data = null;
      try {
        data = await getChannelById(channelId);
      } catch (err) {
        if (isCentre) data = await getChannelByUser(channelId);
        else throw err;
      }
      if (!data && isCentre) {
        setError(trRef.current("centre_not_found", "CentrePage not found"));
        setChannel(null);
        setPosts([]);
        return;
      }
      processChannelData(data);
    } catch (err) {
      if (import.meta.env.DEV) console.error("Failed to fetch channel:", err);
      setError(tRef.current("something_went_wrong") || "Failed to load channel");
      setChannel(null);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [processChannelData, channelId, isCentre]);

  useEffect(() => { tRef.current = t; trRef.current = tr; }, [t, tr]);
  useEffect(() => { fetchChannel(); }, [fetchChannel]);

  const backPath = isCentre ? "/centre" : "/channels";
  const backLabel = isCentre ? tr("back_to_centre_pages", "Back to CentrePages") : tr("back_to_channels", "Back to Channels");
  const ownerId = channel?.owner_id || channel?.ownerId || channel?.user_id || channel?.userId || channel?.id || "";

  // Load listings & reviews for CentrePage
  useEffect(() => {
    let active = true;
    const resolvedOwnerId = String(ownerId || "").trim();
    if (!isCentre || !resolvedOwnerId) {
      if (active) { setListings([]); setReviews([]); setReviewsStats(null); }
      return () => { active = false; };
    }
    const loadListings = async () => {
      setListingsLoading(true);
      setListingsError(null);
      try {
        const response = await api.get("/posts", {
          params: { author: resolvedOwnerId, limit: 6, page: 1, sortBy: "created_at", sortOrder: "desc" },
        });
        if (!active) return;
        const payload = response?.data ?? response;
        setListings(Array.isArray(payload?.posts) ? payload.posts : []);
      } catch (err) {
        if (!active) return;
        setListingsError(trRef.current("listings_unavailable", "Listings unavailable"));
        setListings([]);
      } finally {
        if (active) setListingsLoading(false);
      }
    };
    const loadReviews = async () => {
      setReviewsLoading(true);
      setReviewsError(null);
      try {
        const response = await api.get(`/reviews/user/${resolvedOwnerId}`);
        if (!active) return;
        const payload = response?.data ?? response;
        setReviews(Array.isArray(payload?.reviews) ? payload.reviews : []);
        setReviewsStats(payload?.stats || null);
      } catch (err) {
        if (!active) return;
        setReviewsError(trRef.current("reviews_unavailable", "Reviews unavailable"));
        setReviews([]);
        setReviewsStats(null);
      } finally {
        if (active) setReviewsLoading(false);
      }
    };
    loadListings();
    loadReviews();
    return () => { active = false; };
  }, [ownerId, isCentre]);

  const sortedPosts = useMemo(
    () => [...posts].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()),
    [posts],
  );

  const handleCreatePost = async (ev) => {
    ev.preventDefault();
    if (!channelId || posting) return;
    if (postType === "text" && !description.trim()) {
      toast({ title: t("validation_error") || "Validation Error", description: t("enter_description") || "Enter a description before posting.", variant: "destructive" });
      return;
    }
    const hasMediaFile = Array.isArray(imageFiles) && imageFiles.length > 0;
    const hasMediaUrl = !!mediaUrl.trim();
    if ((postType === "image" || postType === "video") && !hasMediaUrl && !description.trim() && !hasMediaFile) {
      toast({ title: t("validation_error") || "Validation Error", description: t("media_or_description_required") || "Add media URL or description.", variant: "destructive" });
      return;
    }
    setPosting(true);
    setError(null);
    try {
      const payload =
        postType === "image" && hasMediaFile
          ? (() => { const fd = new FormData(); fd.append("description", description || ""); fd.append("type", "image"); imageFiles.forEach((f) => fd.append("images", f)); if (mediaUrl.trim()) fd.append("media_url", mediaUrl.trim()); return fd; })()
          : { description, type: postType, media_url: mediaUrl };
      await createChannelPost(channelId, payload);
      setDescription("");
      setMediaUrl("");
      setImageFiles([]);
      setImageUploadKey((k) => k + 1);
      await fetchChannel();
      toast({ title: t("success") || "Success", description: isCentre ? tr("update_posted", "Update posted successfully.") : t("post_created") || "Channel post created successfully." });
    } catch (err) {
      if (import.meta.env.DEV) console.error("Failed to create channel post:", err);
      const msg = t("something_went_wrong") || "Failed to post";
      setError(msg);
      toast({ title: t("error") || "Error", description: msg, variant: "destructive" });
    } finally {
      setPosting(false);
    }
  };

  const handleFollow = async () => {
    if (!channelId || followLoading || isOwner) return;
    setFollowLoading(true);
    setError(null);
    try {
      const res = await followChannel(channelId);
      const data = res?.data ?? res;
      const action = String(data?.action || "").toLowerCase();
      if (action === "followed" || action === "unfollowed") {
        setChannel((prev) => {
          if (!prev) return prev;
          const wasFollowing = !!prev.is_following;
          const nowFollowing = action === "followed";
          const count = Number.parseInt(prev.follower_count, 10) || 0;
          return { ...prev, is_following: nowFollowing, follower_count: Math.max(0, count + (nowFollowing === wasFollowing ? 0 : nowFollowing ? 1 : -1)) };
        });
      } else {
        await fetchChannel();
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error("Failed to toggle follow:", err);
      const msg = t("something_went_wrong") || "Failed to update follow state";
      setError(msg);
      toast({ title: t("error") || "Error", description: msg, variant: "destructive" });
    } finally {
      setFollowLoading(false);
    }
  };

  const ratingValue = Number(reviewsStats?.averageRating ?? reviewsStats?.average_rating ?? reviewsStats?.avgRating ?? 0);
  const reviewCountValue = Number(reviewsStats?.totalReviews ?? reviewsStats?.total_reviews ?? reviews?.length ?? 0);

  // --- Loading ---
  if (loading) return <PageSkeleton />;

  // --- Error / no channel ---
  if (!channel) {
    return (
      <div className="min-h-screen mhub-premium-page bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <p className="text-sm text-red-600 dark:text-red-300">{error || t("something_went_wrong") || "Failed to load channel"}</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="outline" className="gap-2" onClick={fetchChannel}>
                <RefreshCw className="h-4 w-4" />
                {t("retry") || "Retry"}
              </Button>
              <Link to={backPath}>
                <Button className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  {backLabel}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const channelLogoUrl = resolveMediaUrl(channel.logo_url || channel.profile_pic || "", "");
  const channelCoverUrl = resolveMediaUrl(channel.cover_url || "", "");
  const channelCategory = String(channel.category || "").trim();
  const channelLocation = String(channel.location || "").trim();
  const channelInitial = String(channel.name || "C").trim().charAt(0).toUpperCase();

  return (
    <div className="min-h-screen mhub-premium-page nav-clearance bg-gray-50 dark:bg-gray-950">
      {/* Hero Cover */}
      {isCentre && (
        <div className="relative h-48 sm:h-56 bg-slate-100 dark:bg-slate-800">
          {channelCoverUrl ? (
            <img src={channelCoverUrl} alt="cover" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-blue-100 via-white to-amber-100 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
        </div>
      )}

      <div className="max-w-[640px] mx-auto px-4">
        {/* Back button */}
        <div className={`${isCentre ? "-mt-2" : "mt-4"} mb-4 flex items-center gap-3`}>
          <Link to={backPath} className="inline-flex items-center gap-1 rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 bg-white/80 dark:bg-slate-900/60 backdrop-blur-sm">
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Link>
        </div>

        {/* CentrePage profile header */}
        {isCentre && (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end -mt-14 mb-6">
            <div className="flex items-end gap-4">
              {channelLogoUrl ? (
                <img src={channelLogoUrl} alt="logo" className="h-24 w-24 rounded-2xl object-cover ring-4 ring-white dark:ring-slate-900 shadow-lg" />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white text-3xl font-bold ring-4 ring-white dark:ring-slate-900 shadow-lg">
                  {channelInitial}
                </div>
              )}
              <div className="pb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">{channel.name}</h1>
                  <CentreVerificationBadge channel={channel} />
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-300">
                  {channelCategory && <Badge variant="secondary" className="text-xs font-semibold">{channelCategory}</Badge>}
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {channel.follower_count || 0} {t("followers") || "Followers"}
                  </span>
                  {channelLocation && (
                    <span className="inline-flex items-center gap-1">
                      <MapPinIcon className="h-3 w-3" />
                      {channelLocation}
                    </span>
                  )}
                  {reviewCountValue > 0 && (
                    <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-300">
                      <StarIcon className="h-3 w-3" />
                      {ratingValue > 0 ? ratingValue.toFixed(1) : "0.0"} ({reviewCountValue})
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2 sm:ml-auto">
              {!isOwner && (
                <Button type="button" onClick={handleFollow} disabled={followLoading} variant={channel.is_following ? "outline" : "default"}>
                  {followLoading ? (
                    <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />{t("loading") || "Loading..."}</span>
                  ) : channel.is_following ? (t("unfollow") || "Unfollow") : (t("follow") || "Follow")}
                </Button>
              )}
              {isOwner && (
                <Link to={`/centre/create?channelId=${channel.channel_id || ""}`}>
                  <Button type="button" variant="outline" className="gap-2">
                    <Edit3 className="h-4 w-4" />
                    {tr("edit_centre_page", "Edit CentrePage")}
                  </Button>
                </Link>
              )}
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({ title: channel.name, url: window.location.href });
                  } else {
                    navigator.clipboard.writeText(window.location.href);
                    toast({ title: tr("copied", "Copied!"), description: tr("link_copied", "Link copied to clipboard") });
                  }
                }}
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 dark:border-red-600/40 bg-red-50 dark:bg-red-950/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Non-Centre channel: simple header */}
        {!isCentre && (
          <div className="mb-6">
            <div className="flex items-center gap-4">
              {channelLogoUrl ? (
                <img src={channelLogoUrl} alt="logo" className="h-16 w-16 rounded-xl object-cover" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white text-xl font-bold">{channelInitial}</div>
              )}
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">{channel.name}</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{channel.follower_count || 0} {t("followers") || "Followers"}</p>
              </div>
              {!isOwner && (
                <Button type="button" onClick={handleFollow} disabled={followLoading} variant={channel.is_following ? "outline" : "default"} className="ml-auto">
                  {followLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : channel.is_following ? (t("unfollow") || "Unfollow") : (t("follow") || "Follow")}
                </Button>
              )}
            </div>
            {(channel.bio || channel.description) && (
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{channel.bio || channel.description}</p>
            )}
          </div>
        )}

        {/* CentrePage: Tabbed content */}
        {isCentre ? (
          <CentrePageTabs channel={channel} isOwner={isOwner} activeTab={activeTab} onTabChange={setActiveTab}>
            {(tab) => {
              if (tab === "listings") return <ListingsGrid listings={listings} listingsLoading={listingsLoading} listingsError={listingsError} channelId={channelId} tr={tr} />;
              if (tab === "updates") return <UpdatesFeed sortedPosts={sortedPosts} isOwner={isOwner} isCentre={isCentre} posting={posting} description={description} setDescription={setDescription} mediaUrl={mediaUrl} setMediaUrl={setMediaUrl} postType={postType} setPostType={setPostType} setImageFiles={setImageFiles} imageUploadKey={imageUploadKey} setImageUploadKey={setImageUploadKey} onSubmit={handleCreatePost} tr={tr} t={t} />;
              if (tab === "reviews") return <ReviewsSection reviews={reviews} reviewsStats={reviewsStats} reviewsLoading={reviewsLoading} reviewsError={reviewsError} ownerId={ownerId} tr={tr} />;
              if (tab === "analytics") return <CentrePageAnalytics channelId={channel.channel_id || channelId} />;
              return null;
            }}
          </CentrePageTabs>
        ) : (
          <UpdatesFeed sortedPosts={sortedPosts} isOwner={isOwner} isCentre={isCentre} posting={posting} description={description} setDescription={setDescription} mediaUrl={mediaUrl} setMediaUrl={setMediaUrl} postType={postType} setPostType={setPostType} setImageFiles={setImageFiles} imageUploadKey={imageUploadKey} setImageUploadKey={setImageUploadKey} onSubmit={handleCreatePost} tr={tr} t={t} />
        )}
      </div>
    </div>
  );
};

export default ChannelPage;

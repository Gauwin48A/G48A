import e, {
  useCallback as P,
  useEffect as J,
  useMemo as K,
  useState as n,
} from "react";
import {
  getChannelById as Q,
  getChannelByUser as Qe,
  createChannelPost as X,
  followChannel as Y,
} from "../lib/api";
import { Link as V, useParams as Z } from "react-router-dom";
import {
  ArrowLeft as T,
  Loader2 as U,
  RefreshCw as R,
  Users as ee,
  Video as te,
  Mail as MailIcon,
  Phone as PhoneIcon,
  Globe as GlobeIcon,
  MapPin as MapPinIcon,
  Star as StarIcon,
  Package as PackageIcon,
} from "lucide-react";
import { useTranslation as ae } from "react-i18next";
import { useToast as oe } from "@/hooks/use-toast";
import re from "@/components/EmptyState";
import { Button as x } from "@/components/ui/button";
import { Card as m, CardContent as c } from "@/components/ui/card";
import { Input as se } from "@/components/ui/input";
import { Textarea as ne } from "@/components/ui/textarea";
import ImageUpload from "@/components/ImageUpload";
import api from "@/services/api";
import { resolveMediaUrl } from "@/lib/mediaUrl";
const le = ({ variant = "channel" } = {}) => {
  const { t } = ae(),
    tr = P((key, fallback) => t(key, { defaultValue: fallback }), [t]),
    { toast: p } = oe(),
    { channelId: A, id: M } = Z(),
    i = A || M,
    isCentre = variant === "centre",
    [o, f] = n(null),
    [F, y] = n([]),
    [O, v] = n(!0),
    [_, I] = n(!1),
    [w, B] = n(""),
    [b, D] = n(""),
    [u, j] = n("text"),
    [imageFiles, setImageFiles] = n([]),
    [imageUploadKey, setImageUploadKey] = n(0),
    [h, q] = n(!1),
    [N, E] = n(!1),
    [C, d] = n(null),
    [listings, setListings] = n([]),
    [listingsLoading, setListingsLoading] = n(!1),
    [listingsError, setListingsError] = n(null),
    [reviews, setReviews] = n([]),
    [reviewsStats, setReviewsStats] = n(null),
    [reviewsLoading, setReviewsLoading] = n(!1),
    [reviewsError, setReviewsError] = n(null),
    L = P((a) => {
      const r = a?.data ?? a,
        s = r?.channel || r || null,
        l = String(localStorage.getItem("userId") || "");
      f(s),
        q(!!r?.isOwner || (s?.owner_id && String(s.owner_id) === l)),
        y(
          Array.isArray(r?.posts)
            ? r.posts
            : Array.isArray(s?.posts)
              ? s.posts
              : [],
        );
    }, []),
    g = P(async () => {
      if (!i) {
        d(t("something_went_wrong") || "Failed to load channel"),
          f(null),
          y([]),
          v(!1);
        return;
      }
      v(!0), d(null);
      try {
        let a = null;
        try {
          a = await Q(i);
        } catch (err) {
          if (isCentre) {
            a = await Qe(i);
          } else {
            throw err;
          }
        }
        if (!a && isCentre) {
          d(tr("centre_not_found", "CentrePage not found")),
            f(null),
            y([]);
          return;
        }
        L(a);
      } catch (a) {
        import.meta.env.DEV && console.error("Failed to fetch channel:", a),
          d(
            a?.message || t("something_went_wrong") || "Failed to load channel",
          ),
          f(null),
          y([]);
      } finally {
        v(!1);
      }
    }, [L, i, t, tr, isCentre]);
  J(() => {
    g();
  }, [g]);
  const backPath = isCentre ? "/centre" : "/channels";
  const backLabel = isCentre
    ? tr("back_to_centre_pages", "Back to CentrePages")
    : tr("back_to_channels", "Back to Channels");
  const updatesLabel = isCentre
    ? tr("centre_updates", "Updates")
    : tr("channel_posts", "Posts");
  const createUpdateTitle = isCentre
    ? tr("post_update_title", "Post an update")
    : tr("create_post", "Create Post");
  const createUpdateLabel = isCentre
    ? tr("post_update", "Post Update")
    : tr("post_button", "Post");
  const ownerId = o?.owner_id || o?.ownerId || o?.user_id || o?.userId || o?.id || "";

  J(() => {
    let active = !0;
    const resolvedOwnerId = String(ownerId || "").trim();
    if (!isCentre) {
      return () => {
        active = !1;
      };
    }
    if (!resolvedOwnerId) {
      if (active) {
        setListings([]), setReviews([]), setReviewsStats(null);
      }
      return () => {
        active = !1;
      };
    }

    const loadListings = async () => {
      setListingsLoading(!0), setListingsError(null);
      try {
        const response = await api.get("/posts", {
          params: {
            author: resolvedOwnerId,
            limit: 6,
            page: 1,
            sortBy: "created_at",
            sortOrder: "desc",
          },
        });
        if (!active) return;
        const payload = response?.data ?? response;
        const nextListings = Array.isArray(payload?.posts) ? payload.posts : [];
        setListings(nextListings);
      } catch (err) {
        if (!active) return;
        setListingsError(
          err?.message || tr("listings_unavailable", "Listings unavailable"),
        );
        setListings([]);
      } finally {
        active && setListingsLoading(!1);
      }
    };

    const loadReviews = async () => {
      setReviewsLoading(!0), setReviewsError(null);
      try {
        const response = await api.get(`/reviews/user/${resolvedOwnerId}`);
        if (!active) return;
        const payload = response?.data ?? response;
        setReviews(Array.isArray(payload?.reviews) ? payload.reviews : []);
        setReviewsStats(payload?.stats || null);
      } catch (err) {
        if (!active) return;
        setReviewsError(
          err?.message || tr("reviews_unavailable", "Reviews unavailable"),
        );
        setReviews([]);
        setReviewsStats(null);
      } finally {
        active && setReviewsLoading(!1);
      }
    };

    loadListings();
    loadReviews();

    return () => {
      active = !1;
    };
  }, [ownerId, tr, isCentre]);
  const S = K(
      () =>
        [...F].sort((a, r) => {
          const s = new Date(r.created_at || 0).getTime(),
            l = new Date(a.created_at || 0).getTime();
          return s - l;
        }),
      [F],
    ),
    z = async (a) => {
      if ((a.preventDefault(), !(!i || _))) {
        if (u === "text" && !w.trim()) {
          p({
            title: t("validation_error") || "Validation Error",
            description:
              t("enter_description") || "Enter a description before posting.",
            variant: "destructive",
          });
          return;
        }
        const hasMediaFile = Array.isArray(imageFiles) && imageFiles.length > 0;
        const hasMediaUrl = !!b.trim();
        if ((u === "image" || u === "video") && !hasMediaUrl && !w.trim() && !hasMediaFile) {
          p({
            title: t("validation_error") || "Validation Error",
            description:
              t("media_or_description_required") ||
              "Add media URL or description.",
            variant: "destructive",
          });
          return;
        }
        I(!0), d(null);
        try {
          const payload =
            u === "image" && hasMediaFile
              ? (() => {
                  const formData = new FormData();
                  formData.append("description", w || "");
                  formData.append("type", "image");
                  imageFiles.forEach((file) => {
                    formData.append("images", file);
                  });
                  if (b.trim()) formData.append("media_url", b.trim());
                  return formData;
                })()
              : { description: w, type: u, media_url: b };
          await X(i, payload),
            B(""),
            D(""),
            setImageFiles([]),
            setImageUploadKey((k) => k + 1),
            await g(),
            p({
              title: t("success") || "Success",
              description: isCentre
                ? tr("update_posted", "Update posted successfully.")
                : t("post_created") || "Channel post created successfully.",
            });
        } catch (r) {
          import.meta.env.DEV &&
            console.error("Failed to create channel post:", r);
          const s = r?.message || t("something_went_wrong") || "Failed to post";
          d(s),
            p({
              title: t("error") || "Error",
              description: s,
              variant: "destructive",
            });
        } finally {
          I(!1);
        }
      }
    },
    W = async () => {
      if (!(!i || N || h)) {
        E(!0), d(null);
        try {
          const a = await Y(i),
            r = a?.data ?? a,
            s = String(r?.action || "").toLowerCase();
          s === "followed" || s === "unfollowed"
            ? f((l) => {
                if (!l) return l;
                const G = !!l.is_following,
                  k = s === "followed",
                  H = Number.parseInt(l.follower_count, 10) || 0;
                return {
                  ...l,
                  is_following: k,
                  follower_count: Math.max(0, H + (k === G ? 0 : k ? 1 : -1)),
                };
              })
            : await g();
        } catch (a) {
          import.meta.env.DEV && console.error("Failed to toggle follow:", a);
          const r =
            a?.message ||
            t("something_went_wrong") ||
            "Failed to update follow state";
          d(r),
            p({
              title: t("error") || "Error",
              description: r,
              variant: "destructive",
            });
        } finally {
          E(!1);
        }
      }
    };
  const ratingValue = Number(
      reviewsStats?.averageRating ??
        reviewsStats?.average_rating ??
        reviewsStats?.avgRating ??
        0,
    ),
    reviewCountValue = Number(
      reviewsStats?.totalReviews ?? reviewsStats?.total_reviews ?? reviews?.length ?? 0,
    ),
    displayedReviews = Array.isArray(reviews) ? reviews.slice(0, 3) : [],
    hasContactInfo = Boolean(
      o?.contact_email || o?.contact_phone || o?.contact_website || o?.location,
    ),
    formatPrice = (value) => {
      const numeric = Number(String(value ?? "").replace(/[^\d.]/g, ""));
      if (!Number.isFinite(numeric) || numeric <= 0) {
        return tr("price_on_request", "Price on request");
      }
      return `₹${numeric.toLocaleString()}`;
    },
    resolveListingImage = (post) => {
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
    },
    resolvePostImages = (post) => {
      const collected = [];
      const rawList = post?.image_urls ?? post?.imageUrls ?? null;
      if (Array.isArray(rawList)) {
        collected.push(...rawList);
      } else if (typeof rawList === "string" && rawList.trim()) {
        try {
          const parsed = JSON.parse(rawList);
          if (Array.isArray(parsed)) {
            collected.push(...parsed);
          } else {
            collected.push(rawList);
          }
        } catch {
          collected.push(rawList);
        }
      }
      const single = post?.image_url || post?.imageUrl;
      if (single) collected.unshift(single);
      return [...new Set(collected)]
        .map((url) => resolveMediaUrl(url, ""))
        .filter(Boolean);
    },
    renderPostImages = (post) => {
      const images = resolvePostImages(post);
      if (!images.length) return null;
      if (images.length === 1) {
        return e.createElement(
          "div",
          {
            className:
              "mt-2 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700",
          },
          e.createElement("img", {
            src: images[0],
            alt: "Post media",
            className: "h-64 w-full object-cover",
            loading: "lazy",
            onError: (event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = "/placeholder.svg";
            },
          }),
        );
      }
      const displayImages = images.slice(0, 4);
      const extraCount = images.length - displayImages.length;
      return e.createElement(
        "div",
        { className: "mt-2 grid grid-cols-2 gap-2" },
        displayImages.map((url, idx) =>
          e.createElement(
            "div",
            {
              key: `${post?.post_id || post?.id || "img"}-${idx}`,
              className:
                "relative aspect-[4/3] overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700",
            },
            e.createElement("img", {
              src: url,
              alt: "Post media",
              className: "h-full w-full object-cover",
              loading: "lazy",
              onError: (event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = "/placeholder.svg";
              },
            }),
            extraCount > 0 &&
              idx === displayImages.length - 1 &&
              e.createElement(
                "div",
                {
                  className:
                    "absolute inset-0 flex items-center justify-center bg-black/60 text-white text-sm font-semibold",
                },
                "+",
                extraCount,
              ),
          ),
        ),
      );
    };
  const channelLogoUrl = resolveMediaUrl(
      o?.logo_url || o?.profile_pic || "",
      "",
    ),
    channelCoverUrl = resolveMediaUrl(o?.cover_url || "", ""),
    channelCategory = String(o?.category || "").trim(),
    channelLocation = String(o?.location || "").trim(),
    channelInitial = String(o?.name || "C").trim().charAt(0).toUpperCase();
  return O
    ? e.createElement(
        "div",
        { className: "min-h-screen mhub-premium-page bg-gray-50 container mx-auto max-w-4xl p-4 sm:p-6 page-shell page-pad dark:bg-gray-950" },
        e.createElement(
          "div",
          { className: "space-y-3" },
          [1, 2, 3].map((a) =>
            e.createElement(
              m,
              { key: a, className: "animate-pulse" },
              e.createElement(
                c,
                { className: "p-4" },
                e.createElement("div", {
                  className:
                    "mb-2 h-5 w-52 rounded bg-gray-200 dark:bg-gray-700 dark:bg-gray-900",
                }),
                e.createElement("div", {
                  className: "h-4 w-full rounded bg-gray-200 dark:bg-gray-700 dark:bg-gray-900",
                }),
              ),
            ),
          ),
        ),
      )
    : o
      ? e.createElement(
          "div",
          { className: "min-h-screen mhub-premium-page bg-gray-50 container mx-auto max-w-4xl p-4 sm:p-6 page-shell page-pad dark:bg-gray-950" },
          e.createElement(
            "div",
            { className: "mb-4 flex items-center gap-3" },
            e.createElement(
              V,
              {
                to: backPath,
                className:
                  "inline-flex items-center gap-1 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:border dark:text-sm dark:text-gray-200 dark:hover:bg-gray-950",
              },
              e.createElement(T, { className: "h-4 w-4" }),
              backLabel,
            ),
          ),
          isCentre &&
          e.createElement(
            m,
            { className: "mb-5 overflow-hidden" },
            e.createElement(
              c,
              { className: "p-0" },
              e.createElement(
                "div",
                {
                  className:
                    "relative h-40 sm:h-52 bg-slate-100 dark:bg-slate-800",
                },
                channelCoverUrl
                  ? e.createElement("img", {
                      src: channelCoverUrl,
                      alt: "cover",
                      className: "absolute inset-0 h-full w-full object-cover",
                    })
                  : e.createElement("div", {
                      className:
                        "absolute inset-0 bg-gradient-to-br from-blue-100 via-white to-amber-100 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800",
                    }),
                e.createElement("div", {
                  className:
                    "absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent",
                }),
              ),
              e.createElement(
                "div",
                { className: "flex flex-col gap-4 p-4 sm:flex-row sm:items-end" },
                e.createElement(
                  "div",
                  { className: "flex items-center gap-3 -mt-10" },
                  channelLogoUrl
                    ? e.createElement("img", {
                        src: channelLogoUrl,
                        alt: "logo",
                        className:
                          "h-20 w-20 rounded-2xl object-cover ring-4 ring-white dark:ring-slate-900",
                      })
                    : e.createElement(
                        "div",
                        {
                          className:
                            "flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white text-2xl font-bold ring-4 ring-white dark:ring-slate-900",
                        },
                        channelInitial,
                      ),
                  e.createElement(
                    "div",
                    null,
                    e.createElement(
                      "h1",
                      {
                        className:
                          "text-xl font-bold text-gray-900 dark:text-white dark:text-xl dark:text-gray-100",
                      },
                      o.name,
                    ),
                    e.createElement(
                      "div",
                      {
                        className:
                          "mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-300",
                      },
                      channelCategory &&
                        e.createElement(
                          "span",
                          {
                            className:
                              "rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200",
                          },
                          channelCategory,
                        ),
                      e.createElement(
                        "span",
                        { className: "inline-flex items-center gap-1" },
                        e.createElement(ee, { className: "h-3 w-3" }),
                        o.follower_count || 0,
                        " ",
                        t("followers") || "Followers",
                      ),
                      channelLocation &&
                        e.createElement(
                          "span",
                          { className: "inline-flex items-center gap-1" },
                          e.createElement(MapPinIcon, { className: "h-3 w-3" }),
                          channelLocation,
                        ),
                    ),
                    reviewCountValue > 0 &&
                      e.createElement(
                        "div",
                        {
                          className:
                            "mt-1 inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-300",
                        },
                        e.createElement(StarIcon, { className: "h-3 w-3" }),
                        ratingValue > 0 ? ratingValue.toFixed(1) : "0.0",
                        " (",
                        reviewCountValue,
                        ")",
                      ),
                  ),
                ),
                !h &&
                  e.createElement(
                    x,
                    {
                      type: "button",
                      onClick: W,
                      disabled: N,
                      className: "sm:ml-auto",
                      variant: o.is_following ? "outline" : "default",
                    },
                    N
                      ? e.createElement(
                          "span",
                          { className: "inline-flex items-center gap-2" },
                          e.createElement(U, {
                            className: "h-4 w-4 animate-spin",
                          }),
                          t("loading") || "Loading...",
                        )
                      : o.is_following
                        ? t("unfollow") || "Unfollow"
                        : t("follow") || "Follow",
                  ),
                h &&
                  e.createElement(
                    V,
                    {
                      to: `/centre/create?channelId=${o.channel_id || ""}`,
                      className: "sm:ml-auto",
                    },
                    e.createElement(
                      x,
                      { type: "button", variant: "outline" },
                      tr("edit_centre_page", "Edit CentrePage"),
                    ),
                  ),
              ),
            ),
          ),
          (o.bio || o.description) &&
            e.createElement(
              m,
              { className: "mb-5" },
              e.createElement(
                c,
                { className: "p-4 text-sm text-gray-600 dark:text-gray-300 dark:text-sm dark:text-gray-200" },
                o.bio || o.description,
              ),
            ),
          isCentre &&
          e.createElement(
            m,
            { className: "mb-5" },
            e.createElement(
              c,
              { className: "p-4" },
              e.createElement(
                "div",
                { className: "mb-3 flex items-center gap-2" },
                e.createElement(PackageIcon, {
                  className: "h-5 w-5 text-blue-600 dark:text-blue-300",
                }),
                e.createElement(
                  "h2",
                  {
                    className:
                      "text-lg font-semibold text-gray-900 dark:text-white dark:text-lg dark:text-gray-100",
                  },
                  tr("listings", "Listings"),
                ),
              ),
              listingsLoading
                ? e.createElement(
                    "div",
                    { className: "flex items-center gap-2 text-sm text-gray-500 dark:text-gray-300" },
                    e.createElement(U, { className: "h-4 w-4 animate-spin" }),
                    tr("loading_listings", "Loading listings..."),
                  )
                : listingsError
                  ? e.createElement(
                      "p",
                      { className: "text-sm text-red-600 dark:text-red-300" },
                      listingsError,
                    )
                  : listings.length === 0
                    ? e.createElement(
                        "p",
                        { className: "text-sm text-gray-500 dark:text-gray-300" },
                        tr("no_listings_yet", "No listings yet."),
                      )
                    : e.createElement(
                        "div",
                        { className: "space-y-3" },
                        e.createElement(
                          "ul",
                          { className: "grid grid-cols-1 sm:grid-cols-2 gap-3" },
                          listings.map((a) =>
                            e.createElement(
                              "li",
                              { key: a.post_id || a.id || a.title },
                              e.createElement(
                                "div",
                                {
                                  className:
                                    "flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-900/40",
                                },
                                e.createElement("img", {
                                  src: resolveListingImage(a),
                                  alt: a.title || "Listing",
                                  className:
                                    "h-16 w-16 rounded-lg object-cover bg-slate-100",
                                }),
                                e.createElement(
                                  "div",
                                  { className: "min-w-0" },
                                  e.createElement(
                                    "p",
                                    {
                                      className:
                                        "text-sm font-semibold text-gray-900 dark:text-gray-100 truncate",
                                    },
                                    a.title || tr("untitled_listing", "Untitled listing"),
                                  ),
                                  e.createElement(
                                    "p",
                                    {
                                      className:
                                        "text-sm font-semibold text-emerald-600 dark:text-emerald-300",
                                    },
                                    formatPrice(a.price),
                                  ),
                                  e.createElement(
                                    "p",
                                    {
                                      className:
                                        "text-xs text-gray-500 dark:text-gray-300 flex items-center gap-1",
                                    },
                                    e.createElement(MapPinIcon, { className: "h-3 w-3" }),
                                    a.location ||
                                      tr("location_unknown", "Location unknown"),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                        e.createElement(
                          V,
                          {
                            to: `/centre/${i}/listings`,
                            className:
                              "inline-flex items-center text-sm font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-300 dark:hover:text-indigo-200",
                          },
                          tr("view_all_listings", "View all listings"),
                        ),
                      ),
            ),
          ),
          isCentre &&
          e.createElement(
            m,
            { className: "mb-5" },
            e.createElement(
              c,
              { className: "p-4" },
              e.createElement(
                "div",
                { className: "mb-3 flex items-center gap-2" },
                e.createElement(StarIcon, {
                  className: "h-5 w-5 text-amber-500 dark:text-amber-300",
                }),
                e.createElement(
                  "h2",
                  {
                    className:
                      "text-lg font-semibold text-gray-900 dark:text-white dark:text-lg dark:text-gray-100",
                  },
                  tr("reviews", "Reviews"),
                ),
              ),
              reviewsLoading
                ? e.createElement(
                    "div",
                    { className: "flex items-center gap-2 text-sm text-gray-500 dark:text-gray-300" },
                    e.createElement(U, { className: "h-4 w-4 animate-spin" }),
                    tr("loading_reviews", "Loading reviews..."),
                  )
                : reviewsError
                  ? e.createElement(
                      "p",
                      { className: "text-sm text-red-600 dark:text-red-300" },
                      reviewsError,
                    )
                  : e.createElement(
                      "div",
                      { className: "space-y-3" },
                      e.createElement(
                        "div",
                        { className: "flex items-center gap-3" },
                        e.createElement(
                          "p",
                          {
                            className:
                              "text-2xl font-bold text-gray-900 dark:text-white dark:text-gray-100",
                          },
                          ratingValue > 0
                            ? ratingValue.toFixed(1)
                            : tr("no_rating_yet", "No rating yet"),
                        ),
                        e.createElement(
                          "p",
                          { className: "text-xs text-gray-500 dark:text-gray-300" },
                          reviewCountValue > 0
                            ? `${reviewCountValue} ${tr("reviews_count", "reviews")}`
                            : tr("no_reviews", "No reviews yet"),
                        ),
                      ),
                      displayedReviews.length === 0
                        ? e.createElement(
                            "p",
                            { className: "text-sm text-gray-500 dark:text-gray-300" },
                            tr("be_first_review", "Be the first to review this seller."),
                          )
                        : e.createElement(
                            "ul",
                            { className: "space-y-2" },
                            displayedReviews.map((a) =>
                              e.createElement(
                                "li",
                                {
                                  key: a.review_id || a.id || a.created_at,
                                  className:
                                    "rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-200",
                                },
                                e.createElement(
                                  "div",
                                  { className: "flex items-center justify-between mb-1" },
                                  e.createElement(
                                    "span",
                                    { className: "text-xs font-semibold" },
                                    a.reviewer_name || tr("anonymous", "Anonymous"),
                                  ),
                                  e.createElement(
                                    "span",
                                    { className: "text-xs text-slate-500" },
                                    a.rating ? `${Number(a.rating).toFixed(1)} ★` : "",
                                  ),
                                ),
                                e.createElement(
                                  "p",
                                  { className: "text-sm text-slate-600 dark:text-slate-200" },
                                  a.comment || tr("no_comment", "No comment provided."),
                                ),
                              ),
                            ),
                          ),
                      ownerId &&
                        e.createElement(
                          V,
                          { to: `/reviews/${ownerId}`, className: "inline-flex" },
                          e.createElement(
                            x,
                            { variant: "outline", size: "sm" },
                            tr("view_all_reviews", "View all reviews"),
                          ),
                        ),
                    ),
            ),
          ),
          e.createElement(
            m,
            { className: "mb-5" },
            e.createElement(
              c,
              { className: "p-4" },
              e.createElement(
                "div",
                { className: "mb-3 flex items-center gap-2" },
                e.createElement(MapPinIcon, {
                  className: "h-5 w-5 text-emerald-500 dark:text-emerald-300",
                }),
                e.createElement(
                  "h2",
                  {
                    className:
                      "text-lg font-semibold text-gray-900 dark:text-white dark:text-lg dark:text-gray-100",
                  },
                  tr("contact", "Contact"),
                ),
              ),
              hasContactInfo
                ? e.createElement(
                    "div",
                    { className: "space-y-2 text-sm text-gray-600 dark:text-gray-200" },
                    o.contact_phone &&
                      e.createElement(
                        "div",
                        { className: "flex items-center gap-2" },
                        e.createElement(PhoneIcon, { className: "h-4 w-4" }),
                        e.createElement("span", null, o.contact_phone),
                      ),
                    o.contact_email &&
                      e.createElement(
                        "div",
                        { className: "flex items-center gap-2" },
                        e.createElement(MailIcon, { className: "h-4 w-4" }),
                        e.createElement(
                          "a",
                          {
                            href: `mailto:${o.contact_email}`,
                            className: "text-blue-600 hover:underline dark:text-blue-300",
                          },
                          o.contact_email,
                        ),
                      ),
                    o.contact_website &&
                      e.createElement(
                        "div",
                        { className: "flex items-center gap-2" },
                        e.createElement(GlobeIcon, { className: "h-4 w-4" }),
                        e.createElement(
                          "a",
                          {
                            href: o.contact_website,
                            target: "_blank",
                            rel: "noopener noreferrer",
                            className: "text-blue-600 hover:underline dark:text-blue-300",
                          },
                          o.contact_website,
                        ),
                      ),
                    o.location &&
                      e.createElement(
                        "div",
                        { className: "flex items-center gap-2" },
                        e.createElement(MapPinIcon, { className: "h-4 w-4" }),
                        e.createElement("span", null, o.location),
                      ),
                  )
                : e.createElement(
                    "p",
                    { className: "text-sm text-gray-500 dark:text-gray-300" },
                    tr(
                      "contact_not_provided",
                      "Contact details not provided yet. Use chat to reach the seller.",
                    ),
                  ),
              e.createElement(
                V,
                { to: "/chat", className: "mt-3 inline-flex" },
                e.createElement(
                  x,
                  { size: "sm", variant: "default" },
                  tr("chat_seller", "Chat seller"),
                ),
              ),
            ),
          ),
          C &&
            e.createElement(
              "div",
              {
                className:
                  "mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border dark:border-red-600/40 dark:bg-red-950/20 dark:text-sm dark:text-red-300",
              },
              C,
            ),
          h &&
            e.createElement(
              m,
              { className: "mb-6" },
              e.createElement(
                c,
                { className: "p-4" },
                e.createElement(
                  "h2",
                  {
                    className:
                      "mb-3 text-lg font-semibold text-gray-900 dark:text-white dark:text-lg dark:text-gray-100",
                  },
                  createUpdateTitle,
                ),
                e.createElement(
                  "form",
                  { onSubmit: z, className: "space-y-3" },
                  e.createElement(ne, {
                    className: "min-h-[90px]",
                    placeholder:
                      t("description_placeholder") || "Write a description",
                    value: w,
                    onChange: (a) => B(a.target.value),
                  }),
                  u === "image" &&
                    e.createElement(
                      "div",
                      { className: "space-y-2" },
                      e.createElement(ImageUpload, {
                        key: `image-upload-${imageUploadKey}`,
                        onImagesChange: setImageFiles,
                        maxFiles: 5,
                      }),
                    ),
                  (u === "image" || u === "video") &&
                    e.createElement(se, {
                      placeholder:
                        t("media_url_optional") || "Media URL (optional)",
                      value: b,
                      onChange: (a) => D(a.target.value),
                    }),
                  e.createElement(
                    "select",
                    {
                      className:
                        "mhub-input w-full rounded-xl px-3 py-2 text-sm dark:text-sm",
                      value: u,
                      onChange: (a) => {
                        const nextType = a.target.value;
                        j(nextType);
                        if (nextType !== "image") {
                          setImageFiles([]);
                          setImageUploadKey((k) => k + 1);
                        }
                        if (nextType === "text") {
                          D("");
                        }
                      },
                    },
                    e.createElement(
                      "option",
                      { value: "text" },
                      t("text_type") || "Text",
                    ),
                    e.createElement(
                      "option",
                      { value: "image" },
                      t("image_type") || "Image",
                    ),
                    e.createElement(
                      "option",
                      { value: "video" },
                      t("video_type") || "Video",
                    ),
                  ),
                  e.createElement(
                    x,
                    { type: "submit", disabled: _ },
                    _
                      ? e.createElement(
                          "span",
                          { className: "inline-flex items-center gap-2" },
                          e.createElement(U, {
                            className: "h-4 w-4 animate-spin",
                          }),
                          t("publishing") || "Publishing...",
                        )
                      : createUpdateLabel,
                  ),
                ),
              ),
            ),
          e.createElement(
            "div",
            null,
            e.createElement(
              "h3",
              {
                className:
                  "mb-3 text-lg font-semibold text-gray-900 dark:text-white dark:text-lg dark:text-gray-100",
              },
              updatesLabel,
            ),
            S.length === 0
              ? e.createElement(re, {
                  type: "posts",
                  title: t("no_posts") || "No posts yet",
                  message: h
                    ? tr(
                        "start_posting_updates",
                        isCentre
                          ? "Create the first update for this CentrePage."
                          : "Create the first post for this channel.",
                      )
                    : t("check_back_later") || "Check back later for updates.",
                })
              : e.createElement(
                  "ul",
                  { className: "space-y-3" },
                  S.map((a) =>
                    e.createElement(
                      "li",
                      { key: a.post_id },
                      e.createElement(
                        m,
                        null,
                        e.createElement(
                          c,
                          { className: "p-4" },
                          a.description &&
                            e.createElement(
                              "p",
                              {
                                className:
                                  "mb-2 whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-100 dark:text-sm",
                              },
                              a.description,
                            ),
                          renderPostImages(a),
                          a.video_url &&
                            e.createElement(
                              "a",
                              {
                                href: resolveMediaUrl(a.video_url, a.video_url),
                                target: "_blank",
                                rel: "noopener noreferrer",
                                className:
                                  "mb-2 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline dark:text-sm dark:text-blue-300",
                              },
                              e.createElement(te, { className: "h-4 w-4" }),
                              t("view_video") || "View video",
                            ),
                          e.createElement(
                            "p",
                            { className: "text-xs text-gray-400 dark:text-xs dark:text-gray-300" },
                            new Date(a.created_at).toLocaleString(),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
          ),
        )
      : e.createElement(
          "div",
          { className: "min-h-screen mhub-premium-page bg-gray-50 container mx-auto max-w-3xl p-4 sm:p-6 page-shell page-pad dark:bg-gray-950" },
          e.createElement(
            m,
            null,
            e.createElement(
              c,
              { className: "flex flex-col items-center gap-3 p-8 text-center dark:text-center" },
              e.createElement(
                "p",
                { className: "text-sm text-red-600 dark:text-sm dark:text-red-300" },
                C || t("something_went_wrong") || "Failed to load channel",
              ),
              e.createElement(
                "div",
                { className: "flex flex-wrap justify-center gap-2" },
                e.createElement(
                  x,
                  { variant: "outline", className: "gap-2", onClick: g },
                  e.createElement(R, { className: "h-4 w-4" }),
                  t("retry") || "Retry",
                ),
                e.createElement(
                V,
                { to: backPath },
                e.createElement(
                  x,
                  { className: "gap-2" },
                  e.createElement(T, { className: "h-4 w-4" }),
                    backLabel,
                  ),
                ),
              ),
            ),
          ),
        );
};
var ve = le;
export { ve as default };

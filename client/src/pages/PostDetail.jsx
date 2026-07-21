import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  useParams,
  useNavigate,
  useLocation,
  Link,
} from "react-router-dom";
import re from "../lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { useAuth as useAuthContext } from "@/context/AuthContext";
import SEOHead from "@/components/SEOHead";
import BuyerInterestModal from "@/components/BuyerInterestModal";
import MakeOfferModal from "@/components/MakeOfferModal";
import BargainActions from "@/components/BargainActions";
import ShareLinkDialog from "@/components/ShareLinkDialog";
import ImageZoomModal from "@/components/ImageZoomModal";
import PostBoostPanel from "@/components/PostBoostPanel";
import SponsoredListings from "@/components/SponsoredListings";
import PremiumRecommendations from "@/components/PremiumRecommendations";

import { getUserId as getUserIdFromStorage } from "@/utils/authStorage";
import {
  beginSavedPostMutation,
  endSavedPostMutation,
  isSavedPostId,
  setSavedPostStatus,
  subscribeSavedPosts,
} from "@/utils/savedPosts";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import { navigateBack } from "@/utils/navigation";
import { useToast } from "@/hooks/use-toast";
import {
  useTrustScore,
  getTrustBadgeClass,
  normalizeTrustPayload,
  isComplaintRiskState,
} from "@/hooks/useTrustScore";
import {
  ArrowLeft as $,
  ChevronLeft as me,
  ChevronRight as ge,
  MapPin as pe,
  Star as ue,
  Eye as ce,
  Flag as be,
  HandHeart as fe,
  Package as x,
  Tag as xe,
  Clock as he,
  CheckCircle as ye,
  Sparkles as ve,
  ShieldCheck as Ne,
  DollarSign as ke,
  Bookmark as We,
  BookmarkCheck as Xe,
  Link as Qe,
  ChevronDown as ChevronDownIcon,
  ChevronUp as ChevronUpIcon,
  FileText as Ce,
} from "lucide-react";
import { usePageRefresh } from "@/hooks/usePageRefresh";

const SECTION_OBSERVER_IDS = [
  "overview",
  "description",
  "seller",
  "sponsored",
  "premium",
];
function PostDetail() {
  const { t: h } = useTranslation(),
    tr = useCallback(
      (key, fallback, options = {}) => {
        const value = h(key, { defaultValue: fallback, ...options });
        if (typeof value !== "string" || !value.trim() || value === key) {
          return fallback;
        }
        return value;
      },
      [h],
    ),
    { id: d } = useParams(),
    y = useLocation(),
    { user: currentUser } = useAuthContext(),
    { toast } = useToast(),
    [r, u] = useState(y.state?.post || null),
    [j, c] = useState(!y.state?.post),
    [v, N] = useState(null),
    [F, M] = useState(0),
    [b, m] = useState(0),
    [E, f] = useState(!1),
    [V, w] = useState(!1),
    [shareDialogOpen, setShareDialogOpen] = useState(!1),
    [shareUrl, setShareUrl] = useState(""),
    [savedPost, setSavedPost] = useState(!1),
    [descriptionExpanded, setDescriptionExpanded] = useState(!1),
    [zoomOpen, setZoomOpen] = useState(!1),
    [sponsoredStatus, setSponsoredStatus] = useState({ loading: !0, count: null }),
    [premiumStatus, setPremiumStatus] = useState({ loading: !0, count: null }),

    [activeSection, setActiveSection] = useState("overview"),
    
    [reportSubmitting, setReportSubmitting] = useState(!1),
    [reportSubmitted, setReportSubmitted] = useState(!1),
    sectionNavRef = useRef(null),
    U = useNavigate(),
    resolveMessage = (t, a) => {
      if (!t) return "";
      if (typeof t === "string") return t;
      const s = t?.key ?? a;
      const Q = t?.fallback ?? "";
      return s ? tr(s, Q || s) : Q;
    },
    errorMessage = resolveMessage(v, "load_product_failed"),

    normalizeId = (t) => {
      if (t === undefined || t === null) return "";
      if (typeof t === "number") {
        return Number.isFinite(t) ? String(t).trim() : "";
      }
      if (typeof t === "string") {
        const trimmed = t.trim();
        if (!trimmed) return "";
        const lowered = trimmed.toLowerCase();
        if (lowered === "undefined" || lowered === "null" || lowered === "nan") {
          return "";
        }
        return trimmed;
      }
      if (typeof t === "object") {
        const candidate = t.post_id || t.id || t.user_id;
        return candidate ? String(candidate).trim() : "";
      }
      return "";
    },
    buildShareUrl = (postId) => {
      const safeId = normalizeId(postId);
      if (!safeId) return "";
      if (typeof window !== "undefined" && window.location?.origin) {
        try {
          return new URL(`/post/${safeId}`, window.location.origin).toString();
        } catch {
          return `${window.location.origin}/post/${safeId}`;
        }
      }
      return `/post/${safeId}`;
    },
    handleReportPost = async () => {
      if (reportSubmitting || reportSubmitted) return;
      setReportSubmitting(!0);
      try {
        const api = (await import("@/services/api")).default;
        await api.post(`/posts/${d}/report`, { reason: "inappropriate" });
        setReportSubmitted(!0);
        toast({ title: tr("report_submitted", "Report Submitted"), description: tr("report_thanks", "Thank you for helping keep MHub safe.") });
      } catch (e) {
        toast({ title: tr("error", "Error"), description: e?.response?.data?.error || tr("report_failed", "Failed to submit report"), variant: "destructive" });
      } finally {
        setReportSubmitting(!1);
      }
    },
    currentUserId = getUserIdFromStorage(currentUser),
    normalizedCurrentUserId = normalizeId(currentUserId),
    J = normalizeId(r?.post_id || r?.id || d),
    isOwner = Boolean(
      normalizedCurrentUserId &&
        [
          r?.user_id,
          r?.userId,
          r?.owner_id,
          r?.ownerId,
          r?.seller_id,
          r?.sellerId,
          r?.seller?.id,
          r?.user?.id,
          r?.user?.user_id,
          r?.author_id,
          r?.authorId,
        ].some((t) => normalizeId(t) === normalizedCurrentUserId),
    ),
    isOwnerView = isOwner || Boolean(y?.state?.fromMyPosts),
    backTarget =
      y?.state?.returnTo ||
      (y?.state?.fromMyPosts ? "/my-home" : "/all-posts"),
    swipeState = useRef({ startX: 0, startY: 0, active: false });
  const sellerTrustUserId = normalizeId(
    r?.seller_id ??
      r?.sellerId ??
      r?.seller?.id ??
      r?.user_id ??
      r?.user?.id ??
      r?.author_id ??
      null,
  );
  const localTrustPayload = r?.trust || r?.user?.trust || null;
  const localRiskState =
    r?.risk_state || r?.user?.risk_state || localTrustPayload?.risk_state || null;
  const localUnderReview =
    r?.under_review ?? r?.user?.under_review ?? localTrustPayload?.under_review;
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
  const sellerTrust = useTrustScore(sellerTrustUserId, { enabled: shouldFetchTrust });
  const resolvedTrust = normalizedLocalTrust || sellerTrust;
  const sellerTrustBadgeClass = getTrustBadgeClass(resolvedTrust?.level);
  const sellerTrustLabel = resolvedTrust?.label;
  const sellerTrustScore = resolvedTrust?.score;
  const sellerRiskState = resolvedTrust?.riskState || localRiskState;
  const sellerFrozen = sellerRiskState?.status === "frozen";
  const sellerUnderReview =
    resolvedTrust?.underReview ??
    (localUnderReview != null
      ? Boolean(localUnderReview)
      : isComplaintRiskState(sellerRiskState));
  const postCategoryId = (() => {
    const raw =
      r?.category_id ??
      r?.categoryId ??
      r?.category?.category_id ??
      r?.category?.id ??
      null;
    return raw != null && raw !== "" ? String(raw).trim() : "";
  })();
  const postCategoryName = (() => {
    const candidate =
      r?.category_name ??
      r?.categoryName ??
      r?.category_title ??
      r?.categoryTitle ??
      r?.category ??
      r?.category?.name ??
      r?.category?.title ??
      r?.category?.label ??
      "";
    if (typeof candidate === "string") return candidate.trim();
    if (candidate && typeof candidate === "object") {
      const nested = candidate?.name || candidate?.title || candidate?.label || "";
      return String(nested || "").trim();
    }
    return String(candidate || "").trim();
  })();
  const resolveRecentlyViewedSource = useCallback(() => {
    const normalizeSourceValue = (value) => {
      const normalized = String(value || "")
        .trim()
        .toLowerCase()
        .replace(/_/g, "-");
      if (!normalized) return "";
      if (normalized === "all-posts") return "allposts";
      if (normalized === "for-you" || normalized === "foryou") return "for-you";
      if (normalized === "myhome") return "my-home";
      return normalized;
    };
    const resolveFromPath = (pathValue) => {
      const raw = String(pathValue || "").toLowerCase();
      if (!raw) return "";
      if (raw.includes("/my-feed") || raw.includes("/feed")) return "feed";
      if (raw.includes("/for-you") || raw.includes("/my-recommendations")) return "for-you";
      if (raw.includes("/wishlist")) return "wishlist";
      if (raw.includes("/notifications")) return "notifications";
      if (raw.includes("/recently-viewed")) return "recently-viewed";
      if (raw.includes("/search") || raw.includes("/saved-searches")) return "search";
      if (raw.includes("/my-home")) return "my-home";
      if (raw.includes("/offers")) return "offers";
      if (raw.includes("/all-posts") || raw === "/") return "allposts";
      return "";
    };
    const explicit = normalizeSourceValue(y?.state?.source);
    if (explicit) return explicit;
    if (y?.state?.fromMyPosts) return "my-home";
    const returnTo = y?.state?.returnTo || "";
    const fromReturn = resolveFromPath(returnTo);
    if (fromReturn) return fromReturn;
    let stored = "";
    try {
      stored =
        typeof window !== "undefined"
          ? sessionStorage.getItem("recentlyViewedSource")
          : "";
      if (stored) {
        sessionStorage.removeItem("recentlyViewedSource");
      }
    } catch {
      stored = "";
    }
    const fromStored = resolveFromPath(stored);
    if (fromStored) return fromStored;
    const referrer =
      typeof document !== "undefined" ? document.referrer || "" : "";
    const fromReferrer = resolveFromPath(referrer);
    return fromReferrer || "allposts";
  }, [y?.state?.source, y?.state?.returnTo, y?.state?.fromMyPosts]);
  useEffect(() => {
    const t = normalizeId(r?.post_id || r?.id || d);
    if (!t) return;
    const a = currentUserId;
    if (!a) return;
    const source = resolveRecentlyViewedSource();
    re.post("/recently-viewed/track", { postId: t, userId: a, source })
      .catch(() => {});
  }, [
    d,
    currentUserId,
    y?.state?.source,
    y?.state?.returnTo,
    y?.state?.fromMyPosts,
    r?.post_id,
    r?.id,
    resolveRecentlyViewedSource,
  ]);
  useEffect(() => {
    const abortCtrl = new AbortController();
    window.scrollTo(0, 0),
      r ||
        (async () => {
          const safeId = normalizeId(d);
          try {
            N(null);
            if (!safeId) {
              N({
                key: "invalid_listing_id",
                fallback: tr("invalid_listing_id", "Invalid listing id."),
              }),
                c(!1),
                u(null);
              return;
            }
            const a = await re.get(`/posts/${safeId}`, { signal: abortCtrl.signal }),
              s = a?.post || a;
            if (abortCtrl.signal.aborted) return;
            if (!s || Object.keys(s).length === 0)
              throw new Error("API returned no post data.");
            const mediaList = Array.isArray(s.images)
                ? s.images
                : typeof s.images == "string" && s.images.trim()
                  ? (() => {
                      try {
                        const Ce = JSON.parse(s.images);
                        return Array.isArray(Ce) ? Ce : [s.images];
                      } catch {
                        return [s.images];
                      }
                    })()
                  : [],
              T = { ...s, images: mediaList, seller: s.seller || {} };
            // Cache successful post data in localStorage for offline fallback
            try { localStorage.setItem("mhub_post_cache_" + safeId, JSON.stringify(T));
              const cacheKeys = Object.keys(localStorage).filter(k => k.startsWith("mhub_post_cache_"));
              if (cacheKeys.length > 50) {
                const toRemove = cacheKeys.sort().slice(0, cacheKeys.length - 50);
                toRemove.forEach(k => localStorage.removeItem(k));
              }
            } catch {}
            u(T)
          } catch (a) {
            if (abortCtrl.signal.aborted) return;
            if (import.meta.env.DEV) console.error("Error fetching post data:", a);
            // Try localStorage cache as fallback
            let cachedPost = null;
            try {
              const raw = localStorage.getItem("mhub_post_cache_" + safeId);
              if (raw) cachedPost = JSON.parse(raw);
            } catch {}
            if (cachedPost && cachedPost.post_id) {
              const mediaList = Array.isArray(cachedPost.images)
                ? cachedPost.images
                : typeof cachedPost.images == "string" && cachedPost.images.trim()
                  ? (() => { try { const p = JSON.parse(cachedPost.images); return Array.isArray(p) ? p : [cachedPost.images]; } catch { return [cachedPost.images]; } })()
                  : [];
              u({ ...cachedPost, images: mediaList, seller: cachedPost.seller || {} });
            } else {
              u(null);
              N({ key: "network_error", fallback: tr("network_error", "Unable to load product. Check your connection and try again.") });
            }
            c(!1);
          }
        })(),
      m(0);
    return () => abortCtrl.abort();
  }, [d, F, r, tr]);
  usePageRefresh(useCallback(() => M(k => k + 1), []));
  useEffect(() => {
    const t = normalizeId(r?.post_id || r?.id || d);
    if (!t) return;
    setSavedPost(isSavedPostId(t));
    return subscribeSavedPosts((a) => {
      setSavedPost(Boolean(a?.[t]));
    });
  }, [d, r?.id, r?.post_id]);
  useEffect(() => {
    const postId = normalizeId(r?.post_id || r?.id || d);
    if (!postId || !isOwnerView) return;
    let cancelled = false;
    setOwnerInsightsLoading(true);
    setOwnerInsightsError(null);
    Promise.allSettled([
      re.get(`/inquiries/post/${postId}`),
      re.get(`/offers/history/${postId}`),
      re.get(`/recently-viewed/post/${postId}`),
    ])
      .then((results) => {
        if (cancelled) return;
        const [inquiriesRes, offersRes, viewersRes] = results;
        const inquiries =
          inquiriesRes.status === "fulfilled" &&
          Array.isArray(inquiriesRes.value?.inquiries)
            ? inquiriesRes.value.inquiries
            : [];
        const offers =
          offersRes.status === "fulfilled" &&
          Array.isArray(offersRes.value?.history)
            ? offersRes.value.history
            : [];
        const viewers =
          viewersRes.status === "fulfilled" &&
          Array.isArray(viewersRes.value?.viewers)
            ? viewersRes.value.viewers
            : [];
        setOwnerInsights({ inquiries, offers, viewers });
      })
      .catch(() => {
        if (!cancelled) {
          setOwnerInsightsError({
            key: "lead_fetch_failed",
            fallback: "Failed to load lead activity.",
          });
        }
      })
      .finally(() => {
        if (!cancelled) {
          setOwnerInsightsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [
    d,
    isOwnerView,
    r?.id,
    r?.post_id,
    r?.user_id,
    r?.userId,
    r?.owner_id,
    r?.seller_id,
    r?.seller?.id,
    r?.user?.id,
  ]);
  useEffect(() => {
    if (!r) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: 0 },
    );
    SECTION_OBSERVER_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [r]);
  if (j)
    return React.createElement(
      "div",
      {
        className:
          "min-h-screen mhub-premium-page bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center dark:bg-gradient-to-br",
      },
      React.createElement(
        "div",
        { className: "text-center" },
        React.createElement("div", {
          className:
            "w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4 dark:border-t-transparent",
        }),
        React.createElement(
          "p",
          { className: "text-lg font-medium text-gray-600 dark:text-gray-200" },
          tr("loading_product", "Loading product..."),
        ),
      ),
    );
  if (!r)
    return React.createElement(
      "div",
      {
        className:
          "min-h-screen mhub-premium-page bg-gradient-to-br from-slate-50 to-blue-50 flex items-start justify-center pt-20 p-4 dark:bg-gradient-to-br",
      },
      React.createElement(
        "div",
        {
        className:
          "text-center p-8 mhub-premium-surface rounded-3xl max-w-lg w-full page-shell page-pad",
        },
        React.createElement(
          "div",
          {
            className:
              "w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6 dark:bg-red-950/20",
          },
          React.createElement(x, { className: "w-10 h-10 text-red-500 dark:text-red-300" }),
        ),
        React.createElement(
          "h2",
          {
            className: "text-2xl font-bold text-gray-800 dark:text-white mb-3 dark:text-gray-100",
          },
          tr("product_not_found", "Product Not Found"),
        ),
        React.createElement(
          "p",
          { className: "text-gray-600 dark:text-gray-300 mb-2 dark:text-gray-200" },
          tr(
            "product_unavailable_desc",
            "This product is no longer available or has been removed.",
          ),
        ),
        errorMessage &&
          React.createElement(
            "p",
            { className: "text-sm text-red-500 mb-4 dark:text-red-300" },
            errorMessage,
          ),
        React.createElement(
          "div",
          { className: "flex flex-wrap justify-center gap-2" },
          React.createElement(Button,
            {
              type: "button",
              variant: "outline",
              onClick: () => {
                c(!0), u(null), M((t) => t + 1);
              },
            },
            tr("retry", "Retry"),
          ),
          React.createElement(Link,
            { to: "/all-posts" },
            React.createElement(Button,
              {
                className:
                  "bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-semibold dark:bg-blue-700/40 dark:hover:bg-blue-700/40 dark:text-white",
              },
              React.createElement($, { className: "w-4 h-4 mr-2" }),
              tr("browse_products", "Browse Products"),
            ),
          ),
        ),
      ),
    );
  const extractImageUrl = (entry) => {
      if (!entry) return "";
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
          ""
        );
      }
      return "";
    },
    rawImages = r.images,
    parsedImages = Array.isArray(rawImages)
      ? rawImages
      : typeof rawImages === "string" && rawImages.trim()
        ? (() => {
            try {
              const parsed = JSON.parse(rawImages);
              return Array.isArray(parsed) ? parsed : [rawImages];
            } catch {
              return [rawImages];
            }
          })()
        : [],
    imageList = parsedImages.length
      ? parsedImages.map(extractImageUrl).filter((t) => t)
      : [
          r.image_url,
          r.imageUrl,
          r.thumbnail,
          r.thumbnail_url,
          r.thumbnailUrl,
          r.cover,
          r.cover_image,
          r.featured_image,
          r.featuredImage,
          r.photo,
          r.photo_url,
          r.photoUrl,
          r.img,
          r.media,
          r.hero_image,
          r.heroImage,
        ]
          .filter(Boolean)
          .map(extractImageUrl)
          .filter((t) => t),
    imageCount = imageList.length,
    activeIndex = imageCount ? b % imageCount : 0,
    activeImage = imageCount ? imageList[activeIndex] : "",
    viewCount = Number(r.views ?? r.views_count ?? r.viewsCount ?? 0),
    likesCount = Number(r.likes ?? r.likes_count ?? r.likesCount ?? 0),
    sharesCount = Number(r.shares ?? r.shares_count ?? r.sharesCount ?? 0),
    postedAt = r.created_at || r.postedDate || r.createdAt,
    updatedAt = r.updated_at || r.updatedAt,
    expiresAt = r.expires_at || r.expiresAt,
    formatEnum = (value) =>
      String(value || "")
        .replace(/_/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/\b\w/g, (c) => c.toUpperCase()),
    formatSpecValue = (value) => {
      if (value === null || value === undefined || value === "") return null;
      if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed ? formatEnum(trimmed) : null;
      }
      return String(value);
    },
    conditionLabel = r.condition || r.item_condition || r.product_condition,
    categoryLabel = r.category || r.category_name || r.categoryLabel,
    subcategoryLabel =
      r.subcategory || r.subcategory_name || r.subcategoryLabel,
    postTypeLabel = r.post_type || r.postType,
    locationLabel = r.location || r.city || r.area || r.neighborhood,
    categoryDisplay =
      categoryLabel || tr("category_unknown", "Category not specified"),
    subcategoryDisplay = subcategoryLabel
      ? formatEnum(subcategoryLabel)
      : null,
    categoryFactValue = subcategoryDisplay
      ? `${categoryDisplay} \u2022 ${subcategoryDisplay}`
      : categoryDisplay,
    conditionDisplay =
      conditionLabel
        ? tr(
            `condition_${String(conditionLabel).toLowerCase()}`,
            formatEnum(conditionLabel),
          )
        : tr("condition_unknown", "Condition not specified"),
    postTypeDisplay = postTypeLabel
      ? tr(
          `post_type_${String(postTypeLabel).toLowerCase()}`,
          formatEnum(postTypeLabel),
        )
      : null,
    locationDisplay =
      locationLabel || tr("location_unknown", "Location not specified"),
    statusTone = String(r.status || "active").toLowerCase(),
    statusLabel = r.status
      ? tr(
          `status_${String(r.status).toLowerCase()}`,
          formatEnum(r.status),
        )
      : tr("status_active", "Active"),
    statusBadgeClass =
      statusTone === "sold"
        ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
        : statusTone === "inactive" || statusTone === "expired"
          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    statusDotClass =
      statusTone === "sold"
        ? "bg-red-500"
        : statusTone === "inactive" || statusTone === "expired"
          ? "bg-amber-500"
          : "bg-emerald-500",
    discountPercent = Number(
      r.discount ??
        r.discount_percentage ??
        r.discountPercent ??
        r.discountPercentage ??
        0,
    ),
    discountValue =
      Number.isFinite(discountPercent) && discountPercent > 0
        ? Math.round(discountPercent)
        : 0,
    parsePrice = (value) => {
      if (value === null || value === undefined || value === "") return NaN;
      if (typeof value === "number") return value;
      const cleaned = String(value).replace(/[^\d.-]/g, "");
      return Number(cleaned);
    },
    listingPrice =
      r.price ??
      r.listing_price ??
      r.post_price ??
      r.product_price ??
      r.amount ??
      null,
    originalPrice =
      r.originalPrice || r.original_price || r.mrp || r.mrp_price || null,
    originalPriceValue = parsePrice(originalPrice),
    priceValue = parsePrice(listingPrice),
    savingsValue =
      Number.isFinite(originalPriceValue) &&
      Number.isFinite(priceValue) &&
      originalPriceValue > priceValue
        ? originalPriceValue - priceValue
        : 0,
    hasValidPrice = Number.isFinite(priceValue) && priceValue > 0,
    hasListingId = Boolean(J),
    contactCtaReason = !hasListingId
      ? tr("listing_unavailable", "Listing details are unavailable.")
      : sellerFrozen
        ? tr("seller_unavailable", "Seller account is currently unavailable.")
        : null,
    contactCtaDisabled = Boolean(contactCtaReason),
    offerCtaReason =
      contactCtaReason ||
      (!hasValidPrice
        ? tr("offer_unavailable", "Offers are unavailable without a price.")
        : null),
    offerCtaDisabled = Boolean(offerCtaReason),
    latitude = Number(r.latitude ?? r.lat),
    longitude = Number(r.longitude ?? r.lng ?? r.long),
    hasCoords = Number.isFinite(latitude) && Number.isFinite(longitude),
    mapsUrl = hasCoords
      ? `https://www.google.com/maps?q=${latitude},${longitude}`
      : "",
    locationHint = locationLabel
      ? tr(
          "meetup_hint",
          "Meet in a public place near this location for safer exchanges.",
        )
      : tr(
          "ask_location_hint",
          "Ask the seller for a precise meetup location before you travel.",
        ),
    deliveryRaw =
      r.delivery_option ??
      r.deliveryOption ??
      r.delivery ??
      r.shipping_option ??
      r.shippingOption ??
      r.shipping ??
      r.shipping_available ??
      r.delivery_available ??
      r.deliveryAvailable ??
      r.shippable ??
      null,
    deliveryFeeRaw =
      r.delivery_fee ??
      r.deliveryFee ??
      r.shipping_fee ??
      r.shippingFee ??
      r.shipping_cost ??
      r.shippingCost ??
      null,
    deliveryEtaRaw =
      r.delivery_eta ??
      r.deliveryEta ??
      r.shipping_eta ??
      r.shippingEta ??
      r.eta_days ??
      r.etaDays ??
      null,
    deliveryPieces = (() => {
      const parts = [];
      if (typeof deliveryRaw === "boolean") {
        parts.push(
          deliveryRaw
            ? tr("delivery_available", "Delivery available")
            : tr("meetup_only", "Meetup only"),
        );
      } else if (deliveryRaw) {
        parts.push(formatEnum(deliveryRaw));
      }
      if (deliveryFeeRaw !== null && deliveryFeeRaw !== undefined && deliveryFeeRaw !== "") {
        const feeNum = Number(deliveryFeeRaw);
        parts.push(
          Number.isFinite(feeNum)
            ? tr("delivery_fee", "{{fee}} delivery", { fee: C(feeNum) })
            : formatEnum(deliveryFeeRaw),
        );
      }
      if (deliveryEtaRaw !== null && deliveryEtaRaw !== undefined && deliveryEtaRaw !== "") {
        const etaNum = Number(deliveryEtaRaw);
        parts.push(
          Number.isFinite(etaNum)
            ? tr("delivery_eta_days", "{{count}} days delivery", { count: etaNum })
            : formatEnum(deliveryEtaRaw),
        );
      }
      if (!parts.length) {
        parts.push(
          locationLabel
            ? tr("meetup_near", "Meetup near {{place}}", { place: locationLabel })
            : tr("meetup_only", "Meetup with seller"),
        );
      }
      return parts;
    })(),
    deliveryDetail = deliveryPieces.join(" \u2022 "),
    returnRaw =
      r.return_policy ??
      r.returnPolicy ??
      r.inspection_policy ??
      r.inspectionPolicy ??
      r.inspection ??
      r.inspection_available ??
      r.inspectionAvailable ??
      r.returnable ??
      r.return_allowed ??
      r.returnAllowed ??
      r.returnable ??
      null,
    returnDaysRaw =
      r.return_days ??
      r.returnDays ??
      r.return_window ??
      r.returnWindow ??
      null,
    inspectionWindowRaw =
      r.inspection_window ??
      r.inspectionWindow ??
      r.inspection_hours ??
      r.inspectionHours ??
      null,
    inspectionPieces = (() => {
      const parts = [];
      if (typeof returnRaw === "boolean") {
        parts.push(
          returnRaw
            ? tr("returns_available", "Returns accepted after inspection")
            : tr("inspect_before_pay", "Inspect before payment - No returns"),
        );
      } else if (returnRaw) {
        parts.push(formatEnum(returnRaw));
      }
      if (returnDaysRaw !== null && returnDaysRaw !== undefined && returnDaysRaw !== "") {
        const daysNum = Number(returnDaysRaw);
        parts.push(
          Number.isFinite(daysNum)
            ? tr("return_window_days", "{{count}} day return", { count: daysNum })
            : formatEnum(returnDaysRaw),
        );
      }
      if (inspectionWindowRaw !== null && inspectionWindowRaw !== undefined && inspectionWindowRaw !== "") {
        const hoursNum = Number(inspectionWindowRaw);
        parts.push(
          Number.isFinite(hoursNum)
            ? tr("inspection_window_hours", "{{count}} hr inspection", { count: hoursNum })
            : formatEnum(inspectionWindowRaw),
        );
      }
      if (!parts.length) {
        parts.push(
          tr(
            "inspect_before_pay",
            "Inspect before payment - No returns unless specified",
          ),
        );
      }
      return parts;
    })(),
    inspectionDetail = inspectionPieces.join(" \u2022 "),
    typeFactValue = postTypeDisplay
      ? postTypeDisplay
      : tr("type_unknown", "Type not specified"),
    atAGlanceFacts = [
      {
        key: "category",
        label: tr("category", "Category"),
        value: categoryFactValue,
        icon: xe,
      },
      {
        key: "condition",
        label: tr("condition", "Condition"),
        value: conditionDisplay,
        icon: x,
      },
      {
        key: "location",
        label: tr("location", "Location"),
        value: locationDisplay,
        icon: pe,
      },
      {
        key: "type",
        label: tr("type", "Type"),
        value: typeFactValue,
        icon: Ne,
      },
    ],
    warrantyRaw =
      r.warranty ??
      r.warranty_period ??
      r.warrantyPeriod ??
      r.warranty_months ??
      r.warrantyMonths ??
      null,
    warrantyDisplay = Number.isFinite(Number(warrantyRaw))
      ? tr("warranty_months", "{{count}} months warranty", {
          count: Number(warrantyRaw),
        })
      : warrantyRaw
        ? formatEnum(warrantyRaw)
        : null,
    accessoriesRaw =
      r.accessories ||
      r.accessories_included ||
      r.included_items ||
      r.accessoriesIncluded ||
      null,
    accessoryFlags = [
      r.box_included || r.boxIncluded || r.box_available || r.boxAvailable
        ? tr("box_included", "Box included")
        : null,
      r.charger_included || r.chargerIncluded
        ? tr("charger_included", "Charger included")
        : null,
      r.earphones_included || r.earphonesIncluded
        ? tr("earphones_included", "Earphones included")
        : null,
    ].filter(Boolean),
    accessoriesDisplay = Array.isArray(accessoriesRaw)
      ? accessoriesRaw.join(", ")
      : typeof accessoriesRaw === "string" && accessoriesRaw.trim()
        ? accessoriesRaw
        : accessoryFlags.length > 0
          ? accessoryFlags.join(", ")
          : null,
    specs = [
      {
        key: "brand",
        label: tr("brand", "Brand"),
        value: formatSpecValue(r.brand || r.brand_name || r.make),
      },
      {
        key: "model",
        label: tr("model", "Model"),
        value: formatSpecValue(r.model || r.model_name),
      },
      {
        key: "storage",
        label: tr("storage", "Storage"),
        value: formatSpecValue(r.storage || r.storage_size),
      },
      {
        key: "size",
        label: tr("size", "Size"),
        value: formatSpecValue(r.size),
      },
      {
        key: "color",
        label: tr("color", "Color"),
        value: formatSpecValue(r.color),
      },
      {
        key: "year",
        label: tr("year", "Year"),
        value: formatSpecValue(r.year || r.manufacture_year),
      },
      {
        key: "mileage",
        label: tr("mileage", "Mileage"),
        value: formatSpecValue(r.mileage || r.km_driven || r.kilometers),
      },
    ].filter((spec) => spec.value),
    sponsoredReason = locationLabel
      ? tr(
          "sponsored_reason_local",
          "Boosted (Boost/Featured/Spotlight) {{category}} listings near {{location}}.",
          { category: categoryDisplay, location: locationDisplay },
        )
      : tr(
          "sponsored_reason_category",
          "Boosted (Boost/Featured/Spotlight) {{category}} listings you may like.",
          { category: categoryDisplay },
        ),
    premiumReason = tr(
      "premium_reason",
      "Premium-tier {{category}} listings from top sellers.",
      { category: categoryDisplay },
    ),
    sponsoredSectionVisible =
      !sponsoredStatus ||
      sponsoredStatus.loading ||
      (typeof sponsoredStatus.count === "number"
        ? sponsoredStatus.count > 0
        : !0),
    premiumSectionVisible =
      !premiumStatus ||
      premiumStatus.loading ||
      (typeof premiumStatus.count === "number"
        ? premiumStatus.count > 0
        : !0),
    descriptionText =
      typeof r.description === "string" ? r.description.trim() : "",
    descriptionParts = descriptionText
      ? descriptionText.split(/\n+/).filter(Boolean)
      : [],
    bulletRegex = /^[-*\u2022]\s+/,
    descriptionBullets = descriptionParts
      .filter((part) => bulletRegex.test(part))
      .map((part) => part.replace(bulletRegex, "").trim())
      .filter(Boolean),
    descriptionParagraphs = descriptionParts.filter(
      (part) => !bulletRegex.test(part),
    ),
    hasDescription =
      descriptionParagraphs.length > 0 || descriptionBullets.length > 0,
    descriptionIsLong =
      descriptionText.length > 260 ||
      descriptionParagraphs.length > 3 ||
      descriptionBullets.length > 4 ||
      descriptionParagraphs.some((part) => part.length > 160),
    descriptionContainerClass = `space-y-3 text-gray-600 dark:text-gray-300 leading-relaxed${descriptionIsLong && !descriptionExpanded ? " relative max-h-48 overflow-hidden" : ""}`,
    highlightBadges = [
      r.is_flash_sale || r.flash_sale
        ? { key: "flash", label: tr("flash_sale", "Flash sale") }
        : null,
      r.is_negotiable || r.negotiable
        ? { key: "negotiable", label: tr("negotiable", "Negotiable") }
        : null,
    ].filter(Boolean),
    safetyHighlights = [
      {
        key: "public_meetup",
        label: tr("public_meetup", "Public meetup"),
        hint: tr(
          "public_meetup_hint",
          "Choose a well-lit public place for exchanges.",
        ),
        icon: pe,
      },
      {
        key: "no_prepay",
        label: tr("no_prepay", "No pre-payment"),
        hint: tr(
          "no_prepay_hint",
          "Avoid paying in advance before you inspect the item.",
        ),
        icon: ke,
      },
      {
        key: "verify_listing",
        label: tr("verify_listing", "Verify listing ID"),
        hint: tr(
          "verify_listing_hint",
          "Match the listing ID before handover.",
        ),
        icon: ye,
      },
    ],
    z = () => {
      imageCount > 1 && m((t) => (t + 1) % imageCount);
    },
    H = () => {
      imageCount > 1 && m((t) => (t - 1 + imageCount) % imageCount);
    },
    o = r.seller || {
      name:
        r.seller_name ||
        r.user?.name ||
        r.author ||
        r.username ||
        tr("verified_seller", "Verified Seller"),
      id: r.seller_id || r.user_id || r.user?.id || tr("na", "N/A"),
      rating: r.seller_rating || r.user?.rating || 0,
      verified: Boolean(
        r.seller_verified || r.user?.verified || r.user?.is_verified,
      ),
    },
    tierLabel = r?.tier
      ? tr(
          `tier_${String(r.tier).toLowerCase()}`,
          String(r.tier).toUpperCase(),
        )
      : tr("tier_standard", "STANDARD"),
    C = (t) => {
      if (t === null || t === undefined || t === "") {
        return tr("currency_na", "\u20B9 N/A");
      }
      const numeric = parsePrice(t);
      if (!Number.isFinite(numeric)) {
        return tr("currency_na", "\u20B9 N/A");
      }
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(numeric);
    },
    I = (t) => {
      if (!t) return tr("recently", "Recently");
      try {
        return new Date(t).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
      } catch {
        return tr("recently", "Recently");
      }
    },
    dateOnlyDiff = (value) => {
      if (!value) return null;
      const parsed = new Date(value);
      if (!Number.isFinite(parsed.valueOf())) return null;
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const target = new Date(
        parsed.getFullYear(),
        parsed.getMonth(),
        parsed.getDate(),
      );
      return Math.round((target - today) / 864e5);
    },
    expiresDiff = dateOnlyDiff(expiresAt),
    expiresNote =
      typeof expiresDiff === "number"
        ? expiresDiff < 0
          ? tr("expired", "Expired")
          : expiresDiff === 0
            ? tr("expires_today", "Expires today")
            : tr("expires_in_days", "Expires in {{count}} days", {
                count: expiresDiff,
              })
        : null,
    updatedDiff = dateOnlyDiff(updatedAt),
    updatedNote =
      typeof updatedDiff === "number"
        ? updatedDiff === 0
          ? tr("updated_today", "Updated today")
          : updatedDiff < 0
            ? tr("updated_days_ago", "Updated {{count}} days ago", {
                count: Math.abs(updatedDiff),
              })
            : tr("updated_in_days", "Updates in {{count}} days", {
                count: updatedDiff,
              })
        : null,
    freshnessLine = [updatedNote, expiresNote]
      .filter(Boolean)
      .join(" \u2022 "),
    pricingLabel =
      r.is_negotiable || r.negotiable
        ? tr("negotiable", "Negotiable")
        : tr("fixed_price", "Fixed price"),
    availabilityLabel =
      statusTone !== "active"
        ? statusLabel
        : expiresNote
          ? expiresNote
          : tr("available_now", "Available now"),
    dealHighlights = [
      {
        key: "condition",
        label: tr("condition", "Condition"),
        value: conditionDisplay,
        icon: x,
      },
      {
        key: "pricing",
        label: tr("pricing", "Pricing"),
        value: pricingLabel,
        icon: ke,
      },
      {
        key: "availability",
        label: tr("availability", "Availability"),
        value: availabilityLabel,
        icon: he,
      },
    ],
    keyDetails = [
      ...dealHighlights,
      warrantyDisplay
        ? {
            key: "warranty",
            label: tr("warranty", "Warranty"),
            value: warrantyDisplay,
            icon: Ne,
          }
        : null,
      accessoriesDisplay
        ? {
            key: "accessories",
            label: tr("accessories", "Accessories"),
            value: accessoriesDisplay,
            icon: x,
          }
        : null,
    ].filter(Boolean),
    summaryStats = [
      {
        key: "views",
        label: tr("views", "Views"),
        value: Number.isFinite(viewCount)
          ? viewCount.toLocaleString("en-IN")
          : "0",
      },
      {
        key: "likes",
        label: tr("likes", "Likes"),
        value: Number.isFinite(likesCount)
          ? likesCount.toLocaleString("en-IN")
          : "0",
      },
      {
        key: "shares",
        label: tr("shares", "Shares"),
        value: Number.isFinite(sharesCount)
          ? sharesCount.toLocaleString("en-IN")
          : "0",
      },
      {
        key: "posted",
        label: tr("posted_on", "Posted on"),
        value: postedAt ? I(postedAt) : tr("recently", "Recently"),
      },
    ],
    listingDetails = [
      {
        key: "listing",
        label: tr("listing_id", "Listing ID"),
        value: J ? `#${J}` : tr("not_available", "Not available"),
        icon: xe,
      },
      {
        key: "updated",
        label: tr("last_updated", "Last updated"),
        value: updatedAt ? I(updatedAt) : tr("not_available", "Not available"),
        icon: he,
      },
      {
        key: "expires",
        label: tr("expires_on", "Expires on"),
        value: expiresAt
          ? `${I(expiresAt)}${expiresNote ? ` (${expiresNote})` : ""}`
          : tr("no_expiry", "No expiry"),
        icon: he,
      },
      {
        key: "status",
        label: tr("status", "Status"),
        value: statusLabel,
        icon: ye,
      },
    ],
    sectionNavItems = [
      {
        key: "overview",
        id: "overview",
        label: tr("overview", "Overview"),
        show: !0,
      },
      {
        key: "description",
        id: "description",
        label: tr("description", "Description"),
        show: !0,
      },
      {
        key: "seller",
        id: "seller",
        label: tr("seller", "Seller"),
        show: !0,
      },
      {
        key: "sponsored",
        id: "sponsored",
        label: tr("sponsored_listings", "Sponsored"),
        show: !isOwnerView,
      },
      {
        key: "premium",
        id: "premium",
        label: tr("premium_recommendations", "Premium"),
        show: !isOwnerView,
      },
    ].filter((item) => item.show);
    const S = !!(
      o?.verified ||
      o?.isVerified ||
      r?.seller_verified ||
      r?.aadhaar_verified ||
      r?.pan_verified ||
      r?.user?.isVerified
    ),
    hasEliteBadge = !!(
      r?.reward_badge === "elite" ||
      r?.rewardBadge === "elite" ||
      r?.user?.rewardBadge === "elite" ||
      o?.rewardBadge === "elite" ||
      r?.user?.reward_badge === "elite"
    ),
    _ = Number(o?.rating || r?.seller_rating || 0),
    B = Number(
      o?.successful_sales ||
        r?.successful_sales ||
        r?.completed_sales ||
        r?.seller_completed_sales ||
        0,
    ),
    P = Number(
      o?.response_rate || r?.response_rate || r?.seller_response_rate || 0,
    ),
    A =
      o?.member_since || r?.seller_member_since || r?.user?.created_at || null,
    q = A ? I(A) : tr("not_available", "Not available"),
    G =
      o?.response_time ||
      r?.response_time ||
      r?.avg_response_time ||
      tr("not_available", "Not available"),
    responseValue =
      P > 0
        ? tr("response_rate_short", "{{count}}% response rate", {
            count: P,
          })
        : G && G !== tr("not_available", "Not available")
          ? tr("response_time_short", "Responds in {{time}}", {
              time: G,
            })
          : tr(
              "response_time_unavailable",
              "Response time not available",
            ),
    sellerStats = [
      {
        key: "sales",
        label: tr("completed_sales", "Completed sales"),
        value:
          B > 0
            ? tr("sales_count", "{{count}}", { count: B })
            : tr("new_seller", "New seller"),
      },
      {
        key: "response",
        label: tr("response_rate", "Response rate"),
        value:
          P > 0
            ? tr("response_rate_short", "{{count}}% response rate", {
                count: P,
              })
            : String(G),
      },
      {
        key: "member",
        label: tr("member_since", "Member since"),
        value: q,
      },
    ],
    trustFacts = [
      {
        key: "verification",
        label: tr("seller_verification", "Seller verification"),
        value: S
          ? tr("verified_profile", "Verified profile")
          : tr("verification_pending", "Verification pending"),
        icon: Ne,
        tone: S ? "text-emerald-500" : "text-gray-400",
      },
      {
        key: "reliability",
        label: tr("reliability_score", "Reliability score"),
        value: sellerTrustScore >= 80
          ? tr("high_reliability", "High Reliability")
          : sellerTrustScore >= 60
            ? tr("good_reliability", "Good Reliability")
            : sellerTrustScore >= 40
              ? tr("fair_reliability", "Fair")
              : tr("building_trust", "Building trust"),
        icon: Ne,
        tone: sellerTrustScore >= 80 ? "text-emerald-500"
          : sellerTrustScore >= 60 ? "text-teal-500"
          : sellerTrustScore >= 40 ? "text-amber-500"
          : "text-gray-400",
      },
      {
        key: "response",
        label: tr("response_profile", "Response profile"),
        value: responseValue,
        icon: he,
        tone: "text-blue-500",
      },
      {
        key: "member",
        label: tr("member_since", "Member since"),
        value: q,
        icon: ue,
        tone: "text-amber-400",
      },
    ],
    toggleSavedPost = async () => {
      const t = J;
      if (!t) return;
      const a = beginSavedPostMutation(t);
      if (!a) return;
      const s = isSavedPostId(a),
        l = !s;
      setSavedPost(l), setSavedPostStatus(a, l);
      try {
        l
          ? await re.post("/wishlist", { postId: a })
          : await re.delete(`/wishlist/${a}`);
      } catch {
        setSavedPost(s), setSavedPostStatus(a, s);
        toast({
          title: tr("save_failed", "Unable to update saved status"),
          description: tr("try_again", "Please try again in a moment."),
          variant: "destructive",
        });
      } finally {
        endSavedPostMutation(a);
      }
    },
    handleContactSeller = () => {
      if (contactCtaDisabled) {
        toast({
          title: tr("seller_unavailable_title", "Seller unavailable"),
          description:
            contactCtaReason ||
            tr("seller_unavailable_hint", "Seller is unavailable right now."),
          variant: "destructive",
        });
        return;
      }
      const sellerId = r?.seller_id || r?.user_id || r?.user?.id || "seller_demo";
      const sellerName = encodeURIComponent(r?.seller_name || r?.user?.name || "Seller");
      const postTitle = encodeURIComponent(r?.title || "Item");
      navigate(`/chat?sellerId=${sellerId}&sellerName=${sellerName}&postId=${J}&title=${postTitle}`);
    },
    handleMakeOffer = () => {
      if (offerCtaDisabled) {
        toast({
          title: tr("offer_unavailable_title", "Offer unavailable"),
          description:
            offerCtaReason ||
            tr("offer_unavailable_hint", "Offers are unavailable right now."),
          variant: "destructive",
        });
        return;
      }
      w(!0);
    };


  const handleMediaTouchStart = (event) => {
    const touch = event?.touches?.[0];
    if (!touch) return;
    swipeState.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      active: true,
    };
  };
  const handleMediaTouchEnd = (event) => {
    if (!swipeState.current.active) return;
    const touch = event?.changedTouches?.[0];
    swipeState.current.active = false;
    if (!touch) return;
    const deltaX = touch.clientX - swipeState.current.startX;
    const deltaY = touch.clientY - swipeState.current.startY;
    if (Math.abs(deltaX) < 40 || Math.abs(deltaX) < Math.abs(deltaY)) return;
    if (deltaX < 0) {
      z();
    } else {
      H();
    }
  };
  const handleMediaTouchCancel = () => {
    swipeState.current.active = false;
  };
  const mediaCard = React.createElement(
    "div",
    {
      className:
        "mhub-post-media-card mhub-premium-surface rounded-2xl shadow-lg overflow-hidden w-full",
    },
    React.createElement(
      "div",
      {
        className:
          "relative aspect-[4/3] lg:aspect-auto lg:min-h-[480px] bg-gray-100 dark:bg-gray-700 group overflow-hidden mhub-media-swipe dark:bg-gray-950",
        onTouchStart: handleMediaTouchStart,
        onTouchEnd: handleMediaTouchEnd,
        onTouchCancel: handleMediaTouchCancel,
        role: "region",
        "aria-label": tr("media_gallery", "Media gallery"),
      },
          React.createElement("img", {
            src: resolveMediaUrl(activeImage || "/placeholder.svg"),
            alt: r.title
              ? `${r.title} - ${tr("image", "Image")} ${activeIndex + 1}`
              : tr("listing_image", "Listing image"),
            className:
              "w-full h-full object-contain transition-transform duration-300 ease-out group-hover:scale-[1.05] cursor-zoom-in",
            loading: "eager",
            onClick: () => {
              setZoomOpen(!0);
            },
            onError: (t) => {
              t.target.onerror = null;
              t.target.src = "/placeholder.svg";
            },
          }),
    imageCount > 1 &&
      React.createElement(
        "div",
        {
          className:
            "p-3 border-t lg:border-t-0 lg:border-r dark:border-gray-700 overflow-x-auto lg:overflow-y-auto lg:overflow-x-hidden scrollbar-hide lg:w-[88px] lg:max-h-[420px] lg:flex-shrink-0 lg:order-first dark:border-t dark:lg:border-t-0 dark:lg:border-r",
        },
        React.createElement(
          "div",
          { className: "flex lg:flex-col gap-2" },
          imageList.map((t, a) =>
            React.createElement(
              "button",
              {
                key: a,
                type: "button",
                onClick: () => m(a),
                "aria-current": a === activeIndex ? "true" : "false",
                className: `flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all dark:border-2 ${a === activeIndex ? "border-blue-500 scale-105" : "border-transparent opacity-60"}`,
              },
              React.createElement("img", {
                src: resolveMediaUrl(t),
                onError: (s) => {
                  s.target.onerror = null;
                  s.target.src = "/placeholder.svg";
                },
                alt: r.title
                  ? `${r.title} - ${tr("thumbnail", "Thumbnail")} ${a + 1}`
                  : tr("listing_image", "Listing image"),
                loading: "lazy",
                className: "w-full h-full object-cover",
              }),
            ),
          ),
        ),
      ),
    ),
  );
  const summaryCard = React.createElement(
    "div",
    { className: "mhub-post-summary-wrap w-full" },
    React.createElement(Card,
      {
        className:
          "mhub-post-summary-card mhub-premium-surface border-0 shadow-lg rounded-2xl overflow-hidden scroll-mt-24 dark:border-0",
        id: "overview",
      },
      React.createElement(CardContent,
        { className: "p-5" },
        React.createElement(
          "div",
          { className: "flex items-start justify-between gap-3" },
          React.createElement(
            "h1",
            {
              className:
                "text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white leading-snug dark:text-gray-100",
            },
            r.title || tr("product_title_fallback", "Product Title"),
          ),
          React.createElement(
            "span",
            {
              className: `inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-semibold ring-1 ring-inset ${statusBadgeClass}`,
            },
            React.createElement("span", {
              className: `w-2 h-2 rounded-full ${statusDotClass}`,
            }),
            statusLabel,
          ),
        ),
        React.createElement(
          "div",
          {
            className:
              "flex flex-wrap items-baseline gap-3 mt-3 mb-4 pb-4 border-b border-gray-100 dark:border-gray-700",
          },
          React.createElement(
            "span",
            {
              className:
                "text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100",
            },
            C(r.price),
          ),
          Number.isFinite(originalPriceValue) &&
            originalPriceValue > 0 &&
            React.createElement(
              "span",
              {
                className:
                  "text-lg text-gray-400 dark:text-gray-500 line-through dark:text-gray-300",
              },
              C(originalPriceValue),
            ),
          discountValue > 0 &&
            React.createElement(
              "span",
              {
                className:
                  "bg-green-600 text-white px-2.5 py-1 rounded-md text-sm font-bold dark:bg-green-700/40 dark:text-white",
              },
              tr("discount_percent", "{{count}}% OFF", {
                count: discountValue,
              }),
            ),
          savingsValue > 0 &&
            React.createElement(
              "span",
              {
                className:
                  "text-xs font-semibold text-emerald-600 dark:text-emerald-300",
              },
              tr("you_save", "You save {{amount}}", {
                amount: C(savingsValue),
              }),
            ),
        ),
        React.createElement(
          "div",
          { className: "mb-4" },
          React.createElement(
            "p",
            {
              className:
                "text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2 dark:text-gray-300",
            },
            tr("highlights", "Highlights"),
          ),
          React.createElement(
            "ul",
            { className: "space-y-2" },
            atAGlanceFacts.map((fact) =>
              React.createElement(
                "li",
                {
                  key: fact.key,
                  className:
                    "flex items-start gap-2.5 text-sm text-gray-700 dark:text-gray-200",
                },
                fact.icon
                  ? React.createElement(fact.icon, {
                      className:
                        "w-4 h-4 mt-0.5 text-gray-400 dark:text-gray-500 flex-shrink-0 dark:text-gray-300",
                    })
                  : React.createElement("span", {
                      className:
                        "w-1.5 h-1.5 mt-2 rounded-full bg-gray-400 dark:bg-gray-500 flex-shrink-0 dark:bg-gray-800",
                    }),
                React.createElement(
                  "span",
                  null,
                  React.createElement(
                    "span",
                    { className: "text-gray-500 dark:text-gray-300" },
                    fact.label,
                    ": ",
                  ),
                  React.createElement(
                    "span",
                    { className: "font-medium text-gray-900 dark:text-gray-100" },
                    fact.value,
                  ),
                ),
              ),
            ),
          ),
        ),
        React.createElement(
          "div",
          { className: "grid grid-cols-2 sm:grid-cols-4 gap-3" },
          summaryStats.map((stat) =>
            React.createElement(
              "div",
              {
                key: stat.key,
                className:
                  "rounded-xl bg-white/60 dark:bg-gray-900/30 px-3 py-2 border border-gray-100 dark:border-gray-800 dark:bg-slate-900/60 dark:border-gray-700",
              },
              React.createElement(
                "p",
                {
                  className:
                    "text-xs uppercase tracking-wide text-gray-400 dark:text-gray-300",
                },
                stat.label,
              ),
              React.createElement(
                "p",
                {
                  className:
                    "text-xs font-semibold text-gray-700 dark:text-gray-200",
                },
                stat.value,
              ),
            ),
          ),
        ),
                !isOwnerView &&
          React.createElement(
            "div",
            { className: "mhub-summary-cta mt-4 space-y-3" },
            React.createElement(
              "div",
              { className: "grid gap-2" },
              React.createElement(
                "div",
                { className: "grid grid-cols-2 gap-2" },
                React.createElement(Button,
                  {
                    type: "button",
                    onClick: handleContactSeller,
                    disabled: contactCtaDisabled,
                    title: contactCtaDisabled ? contactCtaReason : undefined,
                    className: `bg-blue-600 hover:bg-blue-700 text-white font-semibold h-11 px-3 rounded-xl shadow-sm text-sm sm:text-sm truncate dark:bg-blue-700/40 dark:hover:bg-blue-700/40 dark:text-white dark:sm:text-sm${contactCtaDisabled ? " opacity-60 cursor-not-allowed" : ""}`,
                  },
                  React.createElement(fe, { className: "w-4 h-4 mr-2" }),
                  tr("contact_seller", "Contact seller"),
                ),
                React.createElement(Button,
                  {
                    type: "button",
                    onClick: handleMakeOffer,
                    variant: "outline",
                    disabled: offerCtaDisabled,
                    title: offerCtaDisabled ? offerCtaReason : undefined,
                    className: `border-gray-200 text-gray-700 dark:border-gray-600 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-900/40 font-semibold h-11 px-3 rounded-xl text-sm sm:text-sm truncate dark:border-gray-700 dark:hover:bg-gray-950 dark:sm:text-sm${offerCtaDisabled ? " opacity-60 cursor-not-allowed" : ""}`,
                  },
                  React.createElement(ke, { className: "w-4 h-4 mr-2" }),
                  tr("make_an_offer", "Make an Offer"),
                ),
              ),
              React.createElement(
                "div",
                { className: "grid grid-cols-2 gap-2" },
                React.createElement(Button,
                  {
                    variant: "outline",
                    type: "button",
                    onClick: toggleSavedPost,
                    className: `h-11 px-3 rounded-xl font-semibold text-sm sm:text-sm truncate dark:sm:text-sm${savedPost ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400" : "border-gray-200 text-gray-700 dark:border-gray-600 dark:text-gray-300"}`,
                  },
                  savedPost
                    ? React.createElement(Xe, { className: "w-4 h-4 mr-2" })
                    : React.createElement(We, { className: "w-4 h-4 mr-2" }),
                  savedPost ? tr("saved", "Saved") : tr("save", "Save"),
                ),
                React.createElement(Button,
                  {
                    variant: "outline",
                    type: "button",
                    onClick: () => {
                      if (!J) return;
                      const t = buildShareUrl(J);
                      setShareUrl(t),
                        setShareDialogOpen(!0),
                        re.post(`/posts/${J}/share`).catch(() => {});
                    },
                    className:
                      "h-11 px-3 rounded-xl font-semibold text-sm sm:text-sm truncate border-gray-200 text-gray-700 dark:border-gray-600 dark:text-gray-300 dark:border-gray-700 dark:text-gray-200",
                  },
                  React.createElement(Qe, { className: "w-4 h-4 mr-2" }),
                  tr("share", "Share"),
                ),
                !isOwner && React.createElement(Button,
                  {
                    variant: "outline",
                    type: "button",
                    disabled: reportSubmitting || reportSubmitted,
                    onClick: handleReportPost,
                    className:
                      "h-11 px-3 rounded-xl font-semibold text-sm sm:text-sm truncate border-red-200 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950/30",
                  },
                  reportSubmitted ? tr("reported", "Reported") : tr("report", "Report"),
                ),
              ),
              (contactCtaDisabled || offerCtaDisabled) &&
                React.createElement(
                  "div",
                  {
                    className:
                      "rounded-lg bg-amber-50 text-amber-700 text-xs px-3 py-2 dark:bg-amber-900/30 dark:text-amber-200",
                  },
                  contactCtaReason ||
                    offerCtaReason ||
                    tr("cta_unavailable_hint", "Seller actions are unavailable."),
                ),
            ),
            React.createElement(Button,
              {
                variant: "ghost",
                type: "button",
                onClick: () => {
                  if (!J) return;
                  U("/complaints", { state: { postId: J } });
                },
                className:
                  "w-full text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 py-2 rounded-lg text-sm dark:text-gray-300 dark:hover:text-red-300 dark:hover:bg-red-950/20",
              },
              React.createElement(be, { className: "w-4 h-4 mr-2" }),
              tr("report_listing", "Report this listing"),
            ),
          ),
      ),
    ),
  );
  return React.createElement(
    "div",
    {
      id: "top",
      className:
        "mhub-post-detail min-h-screen mhub-premium-page pb-24 bg-gradient-to-b from-slate-100 via-white to-slate-50 dark:bg-gradient-to-b",
    },
    /* ── SEO: Dynamic meta tags for this listing ── */
    React.createElement(SEOHead, {
      title: r.title || "Listing",
      description: r.description ? String(r.description).slice(0, 160) : undefined,
      image: activeImage ? resolveMediaUrl(activeImage) : undefined,
      url: typeof window !== "undefined" ? window.location.href : undefined,
      type: "product",
    }),
    /* ── Sticky header: Back + Section tabs + Share/Save ── */
    React.createElement(
      "div",
      {
        className:
          "sticky top-0 z-40 backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 shadow-[0_1px_3px_rgba(0,0,0,0.08)] border-b border-gray-200/50 dark:border-gray-700/50",
      },
      React.createElement(
        "div",
        {
          className:
            "w-full mx-auto px-3 py-2 flex items-center gap-2 page-shell page-pad mhub-post-header",
        },
        /* Back button */
        React.createElement(Button,
          {
            variant: "ghost",
            onClick: () => navigateBack(U, backTarget),
            className:
              "inline-flex items-center gap-1.5 rounded-full bg-white/90 dark:bg-gray-800/90 text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-700 shadow-sm border border-gray-200/60 dark:border-gray-600/60 px-2.5 py-1.5 flex-shrink-0 backdrop-blur-sm transition-all",
            "aria-label": tr("back", "Back"),
          },
          React.createElement($, { className: "w-4 h-4" }),
        ),
        /* Section navigation tabs */
        sectionNavItems.length > 1 &&
          React.createElement(
            "div",
            {
              ref: sectionNavRef,
              className: "flex-1 overflow-x-auto scrollbar-hide min-w-0",
            },
            React.createElement(
              "div",
              { className: "flex flex-nowrap gap-1 px-0.5" },
              sectionNavItems.map((item) =>
                React.createElement(
                  "button",
                  {
                    key: item.key,
                    type: "button",
                    onClick: (ev) => {
                      ev.preventDefault();
                      const el = document.getElementById(item.id);
                      if (el) {
                        el.scrollIntoView({ behavior: "smooth", block: "start" });
                        setActiveSection(item.id);
                      }
                    },
                    className:
                      activeSection === item.id
                        ? "inline-flex items-center justify-center whitespace-nowrap min-h-[2.25rem] min-w-[3rem] px-3 py-1.5 rounded-full bg-blue-600 text-white text-xs font-bold shadow-md shadow-blue-500/25 transition-all duration-200"
                        : "inline-flex items-center justify-center whitespace-nowrap min-h-[2.25rem] min-w-[3rem] px-3 py-1.5 rounded-full text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/30 dark:hover:text-blue-200 transition-all duration-200",
                  },
                  item.label,
                ),
              ),
            ),
          ),
        /* Compact action buttons */
        React.createElement(
          "div",
          { className: "flex items-center gap-1 flex-shrink-0" },
          !isOwnerView &&
            React.createElement(Button,
              {
                variant: "ghost",
                size: "icon",
                onClick: toggleSavedPost,
                type: "button",
                "aria-label": savedPost
                  ? tr("remove_from_saved", "Remove from saved")
                  : tr("save_post", "Save post"),
                className: `rounded-full w-8 h-8 ${savedPost ? "text-blue-600 bg-blue-50 dark:bg-blue-900/30" : "text-gray-500 dark:text-gray-400"}`,
              },
              savedPost
                ? React.createElement(Xe, { className: "w-4 h-4" })
                : React.createElement(We, { className: "w-4 h-4" }),
            ),
          React.createElement(Button,
            {
              variant: "ghost",
              size: "icon",
              onClick: () => {
                if (!J) return;
                const t = buildShareUrl(J);
                setShareUrl(t);
                setShareDialogOpen(!0);
                re.post(`/posts/${J}/share`).catch(() => {});
              },
              type: "button",
              "aria-label": tr("share", "Share"),
              className: "rounded-full w-8 h-8 text-gray-500 dark:text-gray-400",
            },
            React.createElement(Qe, { className: "w-4 h-4" }),
          ),
        ),
      ),
    ),
    /* ── Main content ── */
    React.createElement(
      "div",
      { className: "w-full mx-auto px-4 py-4 space-y-5 page-shell page-pad mhub-post-shell" },
      React.createElement(
        "div",
        { className: "mhub-post-body" },
          React.createElement(
            "div",
            { className: "mhub-post-media" },
            mediaCard,
          ),
          React.createElement(
            "aside",
            { className: "mhub-post-rail" },
            summaryCard,
            isOwnerView &&
              React.createElement(PostBoostPanel, { key: "boost-panel", postId: J || d }),
            React.createElement(Card,
          {
            className:
              "mhub-post-section-card mhub-premium-surface rounded-2xl scroll-mt-24",
            id: "seller",
          },
          React.createElement(CardContent,
            { className: "p-5" },
            React.createElement(
              "div",
              { className: "flex items-center gap-4" },
              React.createElement(Avatar,
                {
                  className:
                    "h-14 w-14 ring-4 ring-white dark:ring-gray-600 shadow-lg",
                },
                React.createElement(AvatarFallback,
                  {
                    className:
                      "bg-gradient-to-br from-blue-500 to-purple-600 text-white text-lg font-bold dark:bg-gradient-to-br dark:text-white",
                  },
                  (o.name || "S").charAt(0).toUpperCase(),
                ),
              ),
              React.createElement(
                "div",
                { className: "flex-1" },
                React.createElement(
                  "div",
                  { className: "flex items-center gap-2 mb-0.5" },
                  React.createElement(
                    "h3",
                    { className: "font-bold text-gray-900 dark:text-gray-100" },
                    o.name,
                  ),
                  sellerFrozen
                    ? React.createElement(Badge,
                        {
                          className:
                            "text-xs px-2 py-1 leading-none bg-rose-600 text-white border-0",
                        },
                        tr("seller_frozen", "Seller Frozen"),
                      )
                    : sellerUnderReview
                      ? React.createElement(Badge,
                          {
                            className:
                              "text-xs px-2 py-1 leading-none bg-amber-500 text-white border-0",
                          },
                          tr("seller_under_review", "Under Review"),
                        )
                      : null,
                  hasEliteBadge
                    ? React.createElement(Badge,
                        {
                          className:
                            "text-xs px-2 py-1 leading-none bg-purple-600 text-white border-0 font-bold ml-1",
                        },
                        "⭐ " + tr("elite_seller", "Elite Seller"),
                      )
                    : null,
                  S
                    ? React.createElement(ye, {
                        className: "w-4 h-4 text-green-500 dark:text-green-300",
                      })
                    : React.createElement(BargainActions, {
                        className: "w-4 h-4 text-gray-400 dark:text-gray-300",
                      }),
                ),
                React.createElement(
                  "p",
                  { className: "text-xs text-gray-500 dark:text-gray-300" },
                  S
                    ? tr("verified_profile", "Verified profile")
                    : tr("verification_pending", "Verification pending"),
                ),
                React.createElement(
                  "div",
                  {
                    className:
                      "flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mt-1 dark:text-gray-200",
                  },
                  _ > 0
                  ? React.createElement(
                      "span",
                      { className: "inline-flex items-center gap-0.5" },
                      Array.from({ length: 5 }).map(function(v, idx) {
                        return React.createElement(ue, {
                          key: idx,
                          className: "w-3.5 h-3.5 " + (idx < Math.round(_) ? "text-amber-400 fill-current dark:text-amber-300" : "text-gray-300 dark:text-gray-600"),
                        });
                      }),
                      React.createElement(
                        "span",
                        { className: "ml-1 font-semibold text-sm" },
                        _.toFixed(1),
                      ),
                    )
                  : React.createElement(
                      "span",
                      { className: "font-semibold text-sm text-gray-500" },
                      tr("no_rating_yet", "No rating yet"),
                    ), React.createElement("span", null, "\u2022"),
                  React.createElement(
                    "span",
                    null,
                    tr("id_label", "ID:"),
                    " ",
                    o.id,
                  ),
                ),
              ),
            ),
          ),
        ),
        !isOwnerView &&
          React.createElement(Card,
            {
              className:
                "mhub-post-section-card mhub-premium-surface border-0 shadow-lg rounded-2xl mhub-ready-cta-card dark:border-0",
            },
            React.createElement(CardContent,
              { className: "p-5 space-y-4" },
              React.createElement(
                "div",
                {
                  className:
                    "flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200",
                },
                React.createElement(fe, { className: "w-4 h-4 text-emerald-500 dark:text-emerald-300" }),
                tr("ready_to_buy", "Ready to buy?"),
              ),
              React.createElement(Button,
                {
                  onClick: handleContactSeller,
                  disabled: contactCtaDisabled,
                  title: contactCtaDisabled ? contactCtaReason : undefined,
                  className: `w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-4 text-base rounded-xl shadow-lg hover:shadow-xl transition-all dark:bg-gradient-to-r dark:text-white ${contactCtaDisabled ? "opacity-60 cursor-not-allowed" : ""}`,
                },
                React.createElement(fe, { className: "w-6 h-6 mr-3" }),
                tr(
                  "interested_contact_seller",
                  "I'm Interested - Contact Seller",
                ),
              ),
              React.createElement(Button,
                {
                  onClick: handleMakeOffer,
                  variant: "outline",
                  disabled: offerCtaDisabled,
                  title: offerCtaDisabled ? offerCtaReason : undefined,
                  className: `w-full bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-gray-900 font-bold py-4 text-base rounded-xl shadow-lg transition-all dark:bg-gradient-to-r dark:text-gray-100 ${offerCtaDisabled ? "opacity-60 cursor-not-allowed" : ""}`,
                },
                React.createElement(ke, { className: "w-5 h-5 mr-2" }),
                tr("make_an_offer", "Make an Offer"),
              ),
              React.createElement(
                "p",
                {
                  className:
                    "text-center text-xs text-gray-500 dark:text-gray-300",
                },
                tr(
                  "secure_contact_details_hint",
                  "Share your contact details securely with only this seller",
                ),
              ),
              React.createElement(
                "div",
                {
                  className:
                    "pt-2 border-t border-slate-200/70 dark:border-t",
                },
                React.createElement(Button,
                  {
                    variant: "ghost",
                    type: "button",
                    onClick: () => {
                      if (!J) return;
                      U("/complaints", { state: { postId: J } });
                    },
                    className:
                      "w-full text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 py-2 rounded-lg text-sm dark:text-gray-300 dark:hover:text-red-300 dark:hover:bg-red-950/20",
                  },
                  React.createElement(be, { className: "w-4 h-4 mr-2" }),
                  tr("report_listing", "Report this listing"),
                ),
              ),
            ),
          ),
        isOwnerView &&
          React.createElement(Button,
            {
              variant: "ghost",
              type: "button",
              onClick: () => {
                if (!J) return;
                U("/complaints", { state: { postId: J } });
              },
              className:
                "w-full text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 py-3 rounded-xl dark:text-gray-300 dark:hover:text-red-300 dark:hover:bg-red-950/20",
            },
            React.createElement(be, { className: "w-4 h-4 mr-2" }),
            tr("report_listing", "Report this listing"),
          ),
          ),
          React.createElement(
            "div",
            { className: "mhub-post-main" },
        listingDetails.length > 0 &&
          React.createElement(
            "div",
            { className: "rounded-xl border border-gray-100 dark:border-gray-700 bg-white/60 dark:bg-slate-900/40 divide-y divide-gray-100 dark:divide-gray-700 mb-5 scroll-mt-24" },
            React.createElement(
              "div",
              { className: "px-4 py-3 flex items-center justify-between" },
              React.createElement(
                "span",
                { className: "text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400" },
                tr("listing_details", "Listing Details"),
              ),
            ),
            listingDetails.map((detail) =>
              React.createElement(
                "div",
                { key: detail.key, className: "flex items-center justify-between px-4 py-2.5" },
                React.createElement(
                  "div",
                  { className: "flex items-center gap-2" },
                  React.createElement(detail.icon, { className: "w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" }),
                  React.createElement(
                    "span",
                    { className: "text-xs font-medium text-gray-500 dark:text-gray-300" },
                    detail.label,
                  ),
                ),
                React.createElement(
                  "span",
                  { className: "text-xs font-semibold text-gray-800 dark:text-gray-100 text-right" },
                  detail.value,
                ),
              ),
            ),
          ),
        hasDescription &&
          React.createElement(
            "div",
            { className: "rounded-xl border border-gray-100 dark:border-gray-700 bg-white/60 dark:bg-slate-900/40 p-4 mb-5 scroll-mt-24", id: "description" },
            React.createElement(
              "div",
              { className: "flex items-center gap-2 mb-3" },
              React.createElement(Ce, { className: "w-4 h-4 text-blue-500 dark:text-blue-300" }),
              React.createElement(
                "span",
                { className: "text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400" },
                tr("description", "Description"),
              ),
            ),
            React.createElement(
              "div",
              { className: descriptionContainerClass },
              descriptionParagraphs.map((paragraph, idx) =>
                React.createElement(
                  "p",
                  { key: idx, className: "text-sm text-gray-600 dark:text-gray-300 leading-relaxed" },
                  paragraph,
                ),
              ),
              descriptionBullets.length > 0 &&
                React.createElement(
                  "ul",
                  { className: "list-disc list-inside space-y-1 mt-2" },
                  descriptionBullets.map((bullet, idx) =>
                    React.createElement(
                      "li",
                      { key: idx, className: "text-sm text-gray-600 dark:text-gray-300" },
                      bullet,
                    ),
                  ),
                ),
            ),
            descriptionIsLong &&
              React.createElement(
                "button",
                {
                  type: "button",
                  onClick: () => setDescriptionExpanded(!descriptionExpanded),
                  className: "mt-2 flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors",
                },
                descriptionExpanded ? tr("show_less", "Show less") : tr("show_more", "Show more"),
                descriptionExpanded
                  ? React.createElement(ChevronUpIcon, { className: "w-3.5 h-3.5" })
                  : React.createElement(ChevronDownIcon, { className: "w-3.5 h-3.5" }),
              ),
          ),
        !isOwnerView &&
          React.createElement(
            "div",
            { className: "space-y-5" },
            sponsoredSectionVisible &&
              React.createElement(Card,
                {
                  className:
                    "mhub-premium-surface border-0 shadow-lg rounded-2xl scroll-mt-24 dark:border-0",
                  id: "sponsored",
                },
                React.createElement(CardContent,
                  { className: "p-5" },
                  React.createElement(
                    "div",
                    {
                      className:
                        "flex flex-wrap items-center justify-between gap-3 mb-4",
                    },
                    React.createElement(
                      "div",
                      null,
                      React.createElement(
                        "h3",
                        {
                          className:
                            "text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 dark:text-gray-100",
                        },
                        React.createElement(xe, {
                          className: "w-5 h-5 text-blue-600 dark:text-blue-300",
                        }),
                        tr("sponsored_listings", "Sponsored listings"),
                      ),
                      React.createElement(
                        "p",
                        { className: "text-xs text-gray-500 dark:text-gray-300" },
                        tr(
                          "sponsored_hint",
                          "Paid boosts (Boost/Featured/Spotlight) similar to this listing.",
                        ),
                      ),
                    ),
                    React.createElement(
                      "div",
                      { className: "flex items-center gap-2" },
                      React.createElement(Badge,
                        {
                          className:
                            "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 dark:bg-blue-950/20",
                        },
                        tr("ad", "Ad"),
                      ),
                      React.createElement(
                        "span",
                        {
                          className:
                            "text-xs text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-full cursor-help",
                          title: tr(
                            "sponsored_tooltip",
                            "Sponsored listings are boosted with Boost, Featured, or Spotlight promotions.",
                          ),
                        },
                        tr("why_this", "Why this?"),
                      ),
                    ),
                  ),
                  React.createElement(
                    "div",
                    {
                      className:
                        "mb-4 inline-flex items-center gap-2 rounded-full bg-blue-50 dark:bg-blue-900/30 px-3 py-1 text-xs text-blue-700 dark:text-blue-300 dark:bg-blue-950/20",
                    },
                    React.createElement(xe, { className: "w-3.5 h-3.5" }),
                    sponsoredReason,
                  ),
                  React.createElement(
                    "div",
                    { className: "mt-2" },
                    React.createElement(SponsoredListings, {
                      key: "sponsored",
                      excludePostId: J,
                      category: postCategoryName,
                      categoryId: postCategoryId,
                      limit: 6,
                      variant: "embedded",
                      onStatusChange: setSponsoredStatus,
                    }),
                  ),
                ),
              ),
            premiumSectionVisible &&
              React.createElement(Card,
                {
                  className:
                    "mhub-premium-surface rounded-2xl scroll-mt-24",
                  id: "premium",
                },
                React.createElement(CardContent,
                  { className: "p-5" },
                  React.createElement(
                    "div",
                    {
                      className:
                        "flex flex-wrap items-center justify-between gap-3 mb-4",
                    },
                    React.createElement(
                      "div",
                      null,
                      React.createElement(
                        "h3",
                        {
                          className:
                            "text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 dark:text-gray-100",
                        },
                        React.createElement(ve, {
                          className: "w-5 h-5 text-purple-600 dark:text-purple-300",
                        }),
                        tr("premium_recommendations", "Premium listings"),
                      ),
                      React.createElement(
                        "p",
                        { className: "text-xs text-gray-500 dark:text-gray-300" },
                        tr(
                          "premium_hint",
                          "Premium-tier listings from top sellers in this category.",
                        ),
                      ),
                    ),
                    React.createElement(
                      "div",
                      { className: "flex items-center gap-2" },
                      React.createElement(Badge,
                        {
                          className:
                            "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 dark:bg-purple-950/20",
                        },
                        tr("premium", "Premium"),
                      ),
                      React.createElement(
                        "span",
                        {
                          className:
                            "text-xs text-purple-600 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/30 px-2 py-1 rounded-full cursor-help",
                          title: tr(
                            "premium_tooltip",
                            "Premium listings are from Premium-tier sellers (top priority plans).",
                          ),
                        },
                        tr("why_this", "Why this?"),
                      ),
                    ),
                  ),
                  React.createElement(
                    "div",
                    {
                      className:
                        "mb-4 inline-flex items-center gap-2 rounded-full bg-purple-50 dark:bg-purple-900/30 px-3 py-1 text-xs text-purple-700 dark:text-purple-300 dark:bg-purple-950/20",
                    },
                    React.createElement(ve, { className: "w-3.5 h-3.5" }),
                    premiumReason,
                  ),
                  React.createElement(
                    "div",
                    { className: "mt-2" },
                    React.createElement(PremiumRecommendations, {
                      key: "premium-recs",
                      postId: J,
                      category: postCategoryName,
                      categoryId: postCategoryId,
                      limit: 6,
                      variant: "embedded",
                      onStatusChange: setPremiumStatus,
                    }),
                  ),
                ),
              ),
          ),
        ),
        React.createElement(
          "div",
          { className: "flex justify-center" },
          React.createElement(
            "a",
            {
              href: "#top",
              className:
                "text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-300 dark:text-gray-300",
            },
            tr("back_to_top", "Back to top"),
          ),
        ),
        React.createElement("div", { className: "h-8" }),
      ),
    ),
    /* ── Bottom CTA bar ── */
    !isOwnerView &&
      React.createElement(
        "div",
        {
          className: "mhub-post-cta-bar",
        },
        React.createElement(
          "div",
          { className: "mhub-post-cta-bar-inner" },
          React.createElement(
            "div",
            { className: "mhub-cta-bar-price min-w-0" },
            React.createElement(
              "p",
              { className: "text-lg font-bold text-gray-900 dark:text-white truncate dark:text-gray-100" },
              C(r.price),
            ),
            freshnessLine &&
              React.createElement(
                "p",
                { className: "text-xs text-gray-500 dark:text-gray-300 truncate" },
                freshnessLine,
              ),
          ),
          React.createElement(
            "div",
            { className: "mhub-cta-bar-actions" },
            React.createElement(Button,
              {
                onClick: handleContactSeller,
                disabled: contactCtaDisabled,
                title: contactCtaDisabled ? contactCtaReason : undefined,
                className: `bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold px-5 py-3 rounded-xl text-xs sm:text-sm truncate dark:bg-gradient-to-r dark:text-white ${contactCtaDisabled ? "opacity-60 cursor-not-allowed" : ""}`,
              },
              tr("contact_seller", "Contact Seller"),
            ),
            React.createElement(Button,
              {
                onClick: handleMakeOffer,
                disabled: offerCtaDisabled,
                title: offerCtaDisabled ? offerCtaReason : undefined,
                className: `bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-900 font-bold px-5 py-3 rounded-xl text-xs sm:text-sm truncate dark:bg-gradient-to-r dark:text-gray-100 dark:sm:text-sm${offerCtaDisabled ? " opacity-60 cursor-not-allowed" : ""}`,
              },
              tr("make_offer_short", "Make Offer"),
            ),
          ),
        ),
      ),
    /* ── Modals ── */
    React.createElement(BuyerInterestModal, {
      isOpen: E,
      onClose: () => f(!1),
      postId: J,
      postTitle: r?.title,
    }),
    React.createElement(MakeOfferModal, { isOpen: V, onClose: () => w(!1), post: r }),
    React.createElement(ImageZoomModal, {
      isOpen: zoomOpen && Boolean(activeImage),
      onClose: () => setZoomOpen(!1),
      imageUrl: resolveMediaUrl(activeImage || "/placeholder.svg"),
      alt: r.title
        ? `${r.title} - ${tr("image", "Image")} ${activeIndex + 1}`
        : tr("listing_image", "Listing image"),
      onNext: imageCount > 1 ? z : null,
      onPrev: imageCount > 1 ? H : null,
      currentIndex: activeIndex,
      totalCount: imageCount,
    }),
    React.createElement(ShareLinkDialog, {
      open: shareDialogOpen,
      onOpenChange: setShareDialogOpen,
      url: shareUrl,
      title: tr("share_post", "Share post"),
    }),
  );
}
export { PostDetail as default };





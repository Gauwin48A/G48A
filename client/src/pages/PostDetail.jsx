import e, { useEffect as L, useState as i, useRef as Oe } from "react";
import {
  useParams as Y,
  useNavigate as Z,
  Link as R,
  useLocation as ee,
} from "react-router-dom";
import re from "../lib/api";
import { Button as l } from "@/components/ui/button";
import { Badge as te } from "@/components/ui/badge";
import { Avatar as ae, AvatarFallback as se } from "@/components/ui/avatar";
import { Card as g, CardContent as p } from "@/components/ui/card";
import { useTranslation as oe } from "react-i18next";
import { useAuth as useAuthContext } from "@/context/AuthContext";
import le from "@/components/BuyerInterestModal";
import ie from "@/components/MakeOfferModal";
import ne from "@/components/BargainActions";
import Se from "@/components/ShareLinkDialog";
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
import { resolveMediaUrl as cee } from "@/lib/mediaUrl";
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
  MoreVertical as Je,
  Link as Qe,
  ChevronDown as ChevronDownIcon,
  ChevronUp as ChevronUpIcon,
} from "lucide-react";
function PostDetail() {
  const { t: h } = oe(),
    tr = (key, fallback, options = {}) => {
      const value = h(key, { defaultValue: fallback, ...options });
      if (typeof value !== "string" || !value.trim() || value === key) {
        return fallback;
      }
      return value;
    },
    { id: d } = Y(),
    y = ee(),
    { user: currentUser } = useAuthContext(),
    { toast } = useToast(),
    [r, u] = i(y.state?.post || null),
    [j, c] = i(!y.state?.post),
    [v, N] = i(null),
    [F, M] = i(0),
    [b, m] = i(0),
    [E, f] = i(!1),
    [V, w] = i(!1),
    [shareDialogOpen, setShareDialogOpen] = i(!1),
    [shareUrl, setShareUrl] = i(""),
    [showMenu, setShowMenu] = i(!1),
    [savedPost, setSavedPost] = i(!1),
    [descriptionExpanded, setDescriptionExpanded] = i(!1),
    [zoomOpen, setZoomOpen] = i(!1),
    [sponsoredStatus, setSponsoredStatus] = i({ loading: !0, count: null }),
    [premiumStatus, setPremiumStatus] = i({ loading: !0, count: null }),
    [ownerInsights, setOwnerInsights] = i({
      inquiries: [],
      offers: [],
      viewers: [],
    }),
    [ownerInsightsLoading, setOwnerInsightsLoading] = i(!1),
    [ownerInsightsError, setOwnerInsightsError] = i(null),
    [activeSection, setActiveSection] = i("overview"),
    [collapsedSections, setCollapsedSections] = i({}),
    sectionNavRef = Oe(null),
    U = Z(),
    resolveMessage = (t, a) => {
      if (!t) return "";
      if (typeof t === "string") return t;
      const s = t?.key ?? a;
      const Q = t?.fallback ?? "";
      return s ? tr(s, Q || s) : Q;
    },
    errorMessage = resolveMessage(v, "load_product_failed"),
    ownerInsightsErrorMessage = resolveMessage(
      ownerInsightsError,
      "lead_fetch_failed",
    ),
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
    swipeState = Oe({ startX: 0, startY: 0, active: false });
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
  const resolveRecentlyViewedSource = () => {
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
  };
  if (
    (L(() => {
      const t = normalizeId(r?.post_id || r?.id || d);
      if (!t) return;
      const a = currentUserId;
      if (!a) return;
      const source = resolveRecentlyViewedSource();
      re.post("/recently-viewed/track", { postId: t, userId: a, source })
        .catch(() => {});
    }, [d, currentUserId, y?.state?.source, y?.state?.returnTo, y?.state?.fromMyPosts]),
    L(() => {
      window.scrollTo(0, 0),
        r ||
          (async () => {
            try {
              N(null);
              const safeId = normalizeId(d);
              if (!safeId) {
                N({
                  key: "invalid_listing_id",
                  fallback: tr("invalid_listing_id", "Invalid listing id."),
                }),
                  c(!1),
                  u(null);
                return;
              }
              const a = await re.get(`/posts/${safeId}`),
                s = a?.post || a;
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
              u(T),
                setSavedPost(
                  Boolean(
                    T?.is_saved ||
                      T?.saved ||
                      isSavedPostId(T?.post_id || T?.id || safeId),
                  ),
                ),
                c(!1);
            } catch (a) {
              console.error("Error fetching post data:", a),
                N({
                  key: "load_product_failed",
                  fallback: "Failed to load product details. Please retry.",
                }),
                c(!1),
                u(null);
            }
          })(),
        m(0);
    }, [d, F]),
    L(() => {
      const t = normalizeId(r?.post_id || r?.id || d);
      if (!t) return;
      setSavedPost(isSavedPostId(t));
      return subscribeSavedPosts((a) => {
        setSavedPost(Boolean(a?.[t]));
      });
    }, [d, r?.id, r?.post_id]),
      L(() => {
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
      ]),
    j)
  )
    return e.createElement(
      "div",
      {
        className:
          "min-h-screen mhub-premium-page bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center dark:bg-gradient-to-br",
      },
      e.createElement(
        "div",
        { className: "text-center dark:text-center" },
        e.createElement("div", {
          className:
            "w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4 dark:border-4 dark:border-blue-500/40 dark:border-t-transparent",
        }),
        e.createElement(
          "p",
          { className: "text-lg font-medium text-gray-600 dark:text-gray-300 dark:text-gray-200" },
          tr("loading_product", "Loading product..."),
        ),
      ),
    );
  if (!r)
    return e.createElement(
      "div",
      {
        className:
          "min-h-screen mhub-premium-page bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4 dark:bg-gradient-to-br",
      },
      e.createElement(
        "div",
        {
        className:
          "text-center p-8 mhub-premium-surface rounded-3xl max-w-lg w-full page-shell page-pad dark:text-center",
        },
        e.createElement(
          "div",
          {
            className:
              "w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6 dark:bg-red-950/20",
          },
          e.createElement(x, { className: "w-10 h-10 text-red-500 dark:text-red-300" }),
        ),
        e.createElement(
          "h2",
          {
            className: "text-2xl font-bold text-gray-800 dark:text-white mb-3 dark:text-gray-100",
          },
          tr("product_not_found", "Product Not Found"),
        ),
        e.createElement(
          "p",
          { className: "text-gray-600 dark:text-gray-300 mb-2 dark:text-gray-200" },
          tr(
            "product_unavailable_desc",
            "This product is no longer available or has been removed.",
          ),
        ),
        errorMessage &&
          e.createElement(
            "p",
            { className: "text-sm text-red-500 mb-4 dark:text-red-300" },
            errorMessage,
          ),
        e.createElement(
          "div",
          { className: "flex flex-wrap justify-center gap-2" },
          e.createElement(
            l,
            {
              type: "button",
              variant: "outline",
              onClick: () => {
                c(!0), u(null), M((t) => t + 1);
              },
            },
            tr("retry", "Retry"),
          ),
          e.createElement(
            R,
            { to: "/all-posts" },
            e.createElement(
              l,
              {
                className:
                  "bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-semibold dark:bg-blue-700/40 dark:hover:bg-blue-700/40 dark:text-white",
              },
              e.createElement($, { className: "w-4 h-4 mr-2" }),
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
          r.image_url || r.imageUrl || r.thumbnail || r.cover,
        ]
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
    backContextLabel = categoryLabel
      ? tr("back_to_category", "Back to {{category}}", {
          category: categoryDisplay,
        })
      : tr("back_to_listings", "Back to listings"),
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
        key: "listing-details",
        id: "listing-details",
        label: tr("listing_details", "Listing details"),
        show: listingDetails.length > 0,
      },
      {
        key: "key-details",
        id: "key-details",
        label: tr("key_details", "Key details"),
        show: keyDetails.length > 0,
      },
      {
        key: "specs",
        id: "specs",
        label: tr("specifications", "Specs"),
        show: specs.length > 0,
      },
      {
        key: "location",
        id: "location",
        label: tr("location_meetup", "Location & meetup"),
        show: !0,
      },
      {
        key: "trust-safety",
        id: "trust-safety",
        label: tr("trust_safety", "Trust & Safety"),
        show: !0,
      },
      {
        key: "description",
        id: "description",
        label: tr("description", "Description"),
        show: !0,
      },
      {
        key: "negotiation",
        id: "negotiation",
        label: tr("negotiate_price", "Negotiate"),
        show: !isOwnerView,
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
    L(() => {
      if (!r) return;
      const sectionIds = sectionNavItems.map((item) => item.id);
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
      sectionIds.forEach((id) => {
        const el = document.getElementById(id);
        if (el) observer.observe(el);
      });
      return () => observer.disconnect();
    }, [r]);
    const S = !!(
      o?.verified ||
      o?.isVerified ||
      r?.seller_verified ||
      r?.aadhaar_verified ||
      r?.pan_verified ||
      r?.user?.isVerified
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
      f(!0);
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
    },
    toggleSection = (sectionKey) => {
      setCollapsedSections((prev) => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
    },
    renderSectionHeader = (sectionKey, icon, title, extraClass) => {
      const isCollapsed = collapsedSections[sectionKey];
      return e.createElement(
        "button",
        {
          type: "button",
          onClick: () => toggleSection(sectionKey),
          className: `flex items-center justify-between w-full gap-2 group cursor-pointer ${extraClass || ""}`,
        },
        e.createElement(
          "div",
          { className: "flex items-center gap-2" },
          icon && e.createElement(icon, { className: "w-5 h-5" }),
          e.createElement(
            "h3",
            { className: "font-bold text-gray-900 dark:text-white dark:text-gray-100" },
            title,
          ),
        ),
        e.createElement(isCollapsed ? ChevronDownIcon : ChevronUpIcon, {
          className: "w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform group-hover:text-gray-600 dark:group-hover:text-gray-300",
        }),
      );
    },
    K = [
      {
        key: "verification",
        label: tr("seller_verification", "Seller verification"),
        value: S
          ? tr("verified_profile", "Verified profile")
          : tr("verification_pending", "Verification pending"),
        hint: S
          ? tr("identity_checks_completed", "Identity checks completed.")
          : tr(
              "identity_checks_pending_hint",
              "Use in-app chat and confirm identity before payment.",
            ),
      },
      {
        key: "rating",
        label: tr("seller_rating", "Seller rating"),
        value:
          _ > 0
            ? tr("seller_rating_value", "{{rating}} / 5", {
                rating: _.toFixed(1),
              })
            : tr("no_rating_yet", "No rating yet"),
        hint: tr("seller_rating_hint", "Based on prior buyer feedback."),
      },
      {
        key: "sales",
        label: tr("completed_sales", "Completed sales"),
        value:
          B > 0
            ? tr("sales_count", "{{count}}", { count: B })
            : tr("new_seller", "New seller"),
        hint: tr(
          "completed_sales_hint",
          "Higher completed sales can indicate reliability.",
        ),
      },
      {
        key: "response",
        label: tr("response_profile", "Response profile"),
        value:
          P > 0
            ? tr("response_rate", "{{count}}% response rate", { count: P })
            : String(G),
        hint: tr(
          "response_time_hint",
          "Check response time before committing to urgent deals.",
        ),
      },
      {
        key: "member",
        label: tr("member_since", "Member since"),
        value: q,
        hint: tr("listing_id_hint", "Listing ID: {{id}}", { id: J }),
      },
    ];
  const ownerInquiries = Array.isArray(ownerInsights?.inquiries)
      ? ownerInsights.inquiries
      : [],
    ownerOffers = Array.isArray(ownerInsights?.offers)
      ? ownerInsights.offers
      : [],
    ownerViewers = Array.isArray(ownerInsights?.viewers)
      ? ownerInsights.viewers
      : [],
    ownerLeadSnapshot = (() => {
      const map = new Map();
      const upsert = (entry, type) => {
        if (!entry) return;
        const id =
          entry?.buyer_id ||
          entry?.viewer_id ||
          entry?.user_id ||
          entry?.id ||
          "";
        if (!id) return;
        const key = String(id);
        const existing = map.get(key) || {
          id: key,
          name:
            entry?.buyer_name ||
            entry?.viewer_name ||
            entry?.full_name ||
            entry?.username ||
            entry?.name ||
            entry?.buyer_id ||
            entry?.viewer_id ||
            entry?.user_id ||
            tr("unknown", "Unknown"),
          types: new Set(),
        };
        existing.types.add(type);
        map.set(key, existing);
      };
      const leadTypes = {
        interested: tr("lead_type_interested", "Interested"),
        offer: tr("lead_type_offer", "Offer"),
        view: tr("lead_type_view", "View"),
      };
      ownerInquiries.forEach((entry) => upsert(entry, leadTypes.interested));
      ownerOffers.forEach((entry) => upsert(entry, leadTypes.offer));
      ownerViewers.forEach((entry) => upsert(entry, leadTypes.view));
      return map;
    })(),
    ownerLeadCount = ownerLeadSnapshot.size,
    ownerLeadList = Array.from(ownerLeadSnapshot.values()).map((lead) => ({
      ...lead,
      types: Array.from(lead.types),
    }));
  const handleMediaTouchStart = (event) => {
    if (imageCount < 2) return;
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
  const mediaCard = e.createElement(
    "div",
    {
      className:
        "mhub-post-media-card mhub-premium-surface rounded-2xl shadow-lg overflow-hidden w-full",
    },
    e.createElement(
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
          activeImage
        ? e.createElement("img", {
            src: cee(activeImage),
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
          })
        : e.createElement(
            "div",
            {
              className:
                "w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 via-white to-slate-200 dark:from-gray-700 dark:via-gray-800 dark:to-gray-900 dark:bg-gradient-to-br",
            },
            e.createElement(
              "div",
              {
                className:
                  "text-center space-y-3 text-gray-500 dark:text-gray-300 max-w-sm px-4",
              },
              e.createElement(x, {
                className: "w-12 h-12 mx-auto text-gray-300 dark:text-gray-500 dark:text-gray-300",
              }),
              e.createElement(
                "p",
                { className: "text-sm font-semibold" },
                isOwnerView
                  ? tr(
                      "add_photos_prompt",
                      "Add photos to get more views",
                    )
                  : tr("no_photo", "No photo available"),
              ),
              e.createElement(
                "p",
                { className: "text-xs text-gray-400 dark:text-gray-300" },
                isOwnerView
                  ? tr(
                      "add_photos_hint",
                      "Listings with clear photos get more responses.",
                    )
                  : contactCtaDisabled
                    ? contactCtaReason ||
                      tr(
                        "seller_unavailable_hint",
                        "Seller is unavailable right now.",
                      )
                    : tr(
                        "ask_seller_for_photos",
                        "Ask the seller for photos before deciding.",
                      ),
              ),
              !isOwnerView &&
                !contactCtaDisabled &&
                e.createElement(
                  l,
                  {
                    type: "button",
                    onClick: handleContactSeller,
                    className:
                      "mx-auto mt-1 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-gray-700 border border-gray-200 shadow-sm hover:bg-gray-50 text-xs font-semibold dark:bg-slate-900/60 dark:text-gray-100 dark:border-slate-700",
                  },
                  tr("request_photos", "Request photos"),
                ),
              e.createElement(
                "div",
                { className: "mt-3 grid grid-cols-3 gap-3 justify-center" },
                Array.from({ length: 3 }).map((_, idx) =>
                  e.createElement("div", {
                    key: idx,
                    className:
                      "h-16 w-16 rounded-lg border border-dashed border-gray-300 bg-white/70 dark:border-gray-600 dark:bg-gray-800/60",
                  }),
                ),
              ),
            ),
          ),
      e.createElement(
        "div",
        { className: "absolute top-3 left-3 flex flex-col gap-2" },
        e.createElement(
          te,
          {
            className: `px-3 py-1 text-xs font-bold rounded-full ${r.tier?.toLowerCase() === "premium" ? "bg-gradient-to-r from-yellow-400 to-orange-500 text-white" : r.tier?.toLowerCase() === "silver" ? "bg-gradient-to-r from-gray-400 to-gray-500 text-white" : "bg-gradient-to-r from-green-400 to-emerald-500 text-white"}`,
          },
          e.createElement(ve, { className: "w-3 h-3 mr-1 inline" }),
          tierLabel,
        ),
        highlightBadges.length > 0 &&
          e.createElement(
            "div",
            { className: "flex flex-wrap gap-2" },
            highlightBadges.map((t) =>
              e.createElement(
                "span",
                {
                  key: t.key,
                  className:
                    "inline-flex items-center rounded-full bg-white/90 text-gray-700 px-2.5 py-1 text-[11px] font-semibold shadow-sm dark:bg-slate-900/90 dark:text-gray-200",
                },
                t.label,
              ),
            ),
          ),
      ),
      e.createElement(
        "div",
        {
          className:
            "absolute top-3 right-3 bg-black/60 text-white px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 dark:bg-black/60 dark:text-white",
          title: tr("views", "Views"),
        },
        e.createElement(ce, { className: "w-3.5 h-3.5" }),
        Number.isFinite(viewCount) ? viewCount.toLocaleString("en-IN") : "0",
      ),
      imageCount > 1 &&
        e.createElement(
          "div",
          {
            className:
              "absolute bottom-3 right-3 bg-white/85 text-gray-700 px-2.5 py-1 rounded-full text-xs font-semibold shadow-sm dark:bg-slate-900/85 dark:text-gray-200",
          },
          activeIndex + 1,
          " / ",
          imageCount,
        ),
      imageCount > 1 &&
        e.createElement(
          e.Fragment,
          null,
          e.createElement(
            "button",
            {
              onClick: H,
              type: "button",
              "aria-label": tr("previous_image", "Previous image"),
              title: tr("previous_image", "Previous image"),
              className:
                "absolute left-2 top-1/2 -translate-y-1/2 bg-[var(--surface-1)] p-3 sm:p-2 rounded-full shadow-lg opacity-90 hover:opacity-100 transition-opacity dark:bg-[var(--surface-1)]",
            },
            e.createElement(me, { className: "w-6 h-6 sm:w-5 sm:h-5" }),
          ),
          e.createElement(
            "button",
            {
              onClick: z,
              type: "button",
              "aria-label": tr("next_image", "Next image"),
              title: tr("next_image", "Next image"),
              className:
                "absolute right-2 top-1/2 -translate-y-1/2 bg-[var(--surface-1)] p-3 sm:p-2 rounded-full shadow-lg opacity-90 hover:opacity-100 transition-opacity dark:bg-[var(--surface-1)]",
            },
            e.createElement(ge, { className: "w-6 h-6 sm:w-5 sm:h-5" }),
          ),
          e.createElement(
            "div",
            {
              className:
                "absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5",
            },
            imageList.map((t, a) =>
              e.createElement("button", {
                key: a,
                type: "button",
                "aria-label": tr("view_image", "View image {{count}}", {
                  count: a + 1,
                }),
                "aria-current": a === activeIndex ? "true" : "false",
                onClick: () => m(a),
                className: `w-2 h-2 rounded-full transition-all ${a === activeIndex ? "bg-blue-500 w-6" : "bg-white/70"}`,
              }),
            ),
          ),
        ),
    ),
    imageCount > 1 &&
      e.createElement(
        "div",
        {
          className:
            "p-3 border-t lg:border-t-0 lg:border-r dark:border-gray-700 overflow-x-auto lg:overflow-y-auto lg:overflow-x-hidden scrollbar-hide lg:w-[88px] lg:max-h-[420px] lg:flex-shrink-0 lg:order-first dark:border-t dark:lg:border-t-0 dark:lg:border-r",
        },
        e.createElement(
          "div",
          { className: "flex lg:flex-col gap-2" },
          imageList.map((t, a) =>
            e.createElement(
              "button",
              {
                key: a,
                type: "button",
                onClick: () => m(a),
                "aria-current": a === activeIndex ? "true" : "false",
                className: `flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all dark:border-2 ${a === activeIndex ? "border-blue-500 scale-105" : "border-transparent opacity-60"}`,
              },
              e.createElement("img", {
                src: cee(t),
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
  );
  const sectionNavNode =
    sectionNavItems.length > 1
      ? e.createElement(
          "div",
          {
            ref: sectionNavRef,
            className:
              "mhub-post-section-nav mhub-post-section-banner mhub-premium-surface border-0 shadow-lg rounded-2xl dark:border-0",
            id: "page-sections",
          },
          e.createElement(
            "div",
            { className: "px-3 py-2.5 sm:px-4 sm:py-3" },
            e.createElement(
              "div",
              {
                className:
                  "flex flex-nowrap gap-1.5 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-0.5",
              },
              sectionNavItems.map((item) =>
                e.createElement(
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
                    className: activeSection === item.id
                      ? "inline-flex items-center px-3 py-1.5 rounded-full border-2 border-blue-500 bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-500/25 whitespace-nowrap transition-all duration-200"
                      : "inline-flex items-center px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900/40 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 dark:hover:bg-blue-900/30 dark:hover:border-blue-700 transition-all duration-200 whitespace-nowrap",
                  },
                  item.label,
                ),
              ),
            ),
          ),
        )
      : null;
  const summaryCard = e.createElement(
    "div",
    { className: "mhub-post-summary-wrap w-full" },
    e.createElement(
      g,
      {
        className:
          "mhub-post-summary-card mhub-premium-surface border-0 shadow-lg rounded-2xl overflow-hidden scroll-mt-24 dark:border-0",
        id: "overview",
      },
      e.createElement(
        p,
        { className: "p-5" },
        e.createElement(
          "div",
          { className: "flex items-start justify-between gap-3" },
          e.createElement(
            "h1",
            {
              className:
                "text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white leading-snug dark:text-gray-100",
            },
            r.title || tr("product_title_fallback", "Product Title"),
          ),
          e.createElement(
            "span",
            {
              className: `inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-semibold ring-1 ring-inset ${statusBadgeClass}`,
            },
            e.createElement("span", {
              className: `w-2 h-2 rounded-full ${statusDotClass}`,
            }),
            statusLabel,
          ),
        ),
        e.createElement(
          "div",
          {
            className:
              "flex flex-wrap items-baseline gap-3 mt-3 mb-4 pb-4 border-b border-gray-100 dark:border-gray-800 dark:border-b dark:border-gray-700",
          },
          e.createElement(
            "span",
            {
              className:
                "text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white dark:text-gray-100",
            },
            C(r.price),
          ),
          Number.isFinite(originalPriceValue) &&
            originalPriceValue > 0 &&
            e.createElement(
              "span",
              {
                className:
                  "text-lg text-gray-400 dark:text-gray-500 line-through dark:text-gray-300",
              },
              C(originalPriceValue),
            ),
          discountValue > 0 &&
            e.createElement(
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
            e.createElement(
              "span",
              {
                className:
                  "text-xs font-semibold text-emerald-600 dark:text-emerald-400 dark:text-emerald-300",
              },
              tr("you_save", "You save {{amount}}", {
                amount: C(savingsValue),
              }),
            ),
        ),
        e.createElement(
          "div",
          {
            className:
              "rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-3 py-2.5 mb-4 space-y-2 dark:border dark:bg-slate-900/70",
          },
          e.createElement(
            "div",
            { className: "flex items-start gap-2.5" },
            e.createElement(pe, {
              className:
                "w-4 h-4 mt-0.5 text-gray-400 dark:text-gray-500 flex-shrink-0 dark:text-gray-300",
            }),
            e.createElement(
              "div",
              { className: "space-y-0.5" },
              e.createElement(
                "p",
                {
                  className:
                    "text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400 dark:text-gray-300",
                },
                tr("delivery_meetup", "Delivery / Meetup"),
              ),
              e.createElement(
                "p",
                { className: "text-sm font-medium text-gray-900 dark:text-white dark:text-gray-100" },
                deliveryDetail,
              ),
            ),
          ),
          e.createElement(
            "div",
            { className: "flex items-start gap-2.5" },
            e.createElement(Ne, {
              className:
                "w-4 h-4 mt-0.5 text-emerald-500 dark:text-emerald-400 flex-shrink-0 dark:text-emerald-300",
            }),
            e.createElement(
              "div",
              { className: "space-y-0.5" },
              e.createElement(
                "p",
                {
                  className:
                    "text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400 dark:text-gray-300",
                },
                tr("return_inspection", "Return / Inspection"),
              ),
              e.createElement(
                "p",
                { className: "text-sm font-medium text-gray-900 dark:text-white dark:text-gray-100" },
                inspectionDetail,
              ),
            ),
          ),
        ),
        e.createElement(
          "div",
          { className: "mb-4" },
          e.createElement(
            "p",
            {
              className:
                "text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2 dark:text-gray-300",
            },
            tr("highlights", "Highlights"),
          ),
          e.createElement(
            "ul",
            { className: "space-y-2" },
            atAGlanceFacts.map((fact) =>
              e.createElement(
                "li",
                {
                  key: fact.key,
                  className:
                    "flex items-start gap-2.5 text-sm text-gray-700 dark:text-gray-300 dark:text-gray-200",
                },
                fact.icon
                  ? e.createElement(fact.icon, {
                      className:
                        "w-4 h-4 mt-0.5 text-gray-400 dark:text-gray-500 flex-shrink-0 dark:text-gray-300",
                    })
                  : e.createElement("span", {
                      className:
                        "w-1.5 h-1.5 mt-2 rounded-full bg-gray-400 dark:bg-gray-500 flex-shrink-0 dark:bg-gray-800",
                    }),
                e.createElement(
                  "span",
                  null,
                  e.createElement(
                    "span",
                    { className: "text-gray-500 dark:text-gray-400 dark:text-gray-300" },
                    fact.label,
                    ": ",
                  ),
                  e.createElement(
                    "span",
                    { className: "font-medium text-gray-900 dark:text-white dark:text-gray-100" },
                    fact.value,
                  ),
                ),
              ),
            ),
          ),
        ),
        e.createElement(
          "div",
          { className: "grid grid-cols-2 sm:grid-cols-4 gap-3" },
          summaryStats.map((stat) =>
            e.createElement(
              "div",
              {
                key: stat.key,
                className:
                  "rounded-xl bg-white/60 dark:bg-gray-900/30 px-3 py-2 border border-gray-100 dark:border-gray-800 dark:bg-slate-900/60 dark:border dark:border-gray-700",
              },
              e.createElement(
                "p",
                {
                  className:
                    "text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500 dark:text-gray-300",
                },
                stat.label,
              ),
              e.createElement(
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
          e.createElement(
            "div",
            { className: "mhub-summary-meta mt-4 space-y-3" },
            freshnessLine &&
              e.createElement(
                "div",
                {
                  className:
                    "inline-flex flex-wrap items-center gap-1 rounded-full bg-slate-50 dark:bg-gray-900/40 px-3 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 dark:bg-slate-950 dark:text-gray-200",
                },
                freshnessLine,
              ),
            e.createElement(
              "div",
              {
                className:
                  "rounded-xl border border-gray-200 dark:border-gray-700 p-3 bg-slate-50/70 dark:bg-gray-900/40 dark:border dark:bg-slate-950/70",
              },
              e.createElement(
                "p",
                {
                  className:
                    "text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2 dark:text-gray-300",
                },
                tr("trustworthy_listing", "Why this listing is trustworthy"),
              ),
              e.createElement(
                "div",
                { className: "grid grid-cols-1 sm:grid-cols-3 gap-2" },
                trustFacts.map((fact) =>
                  e.createElement(
                    "div",
                    {
                      key: fact.key,
                      className:
                        "rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-2.5 py-2 dark:border dark:bg-slate-900/70",
                    },
                    e.createElement(
                      "div",
                      {
                        className:
                          "flex items-center gap-2 text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400 dark:text-gray-300",
                      },
                      fact.icon &&
                        e.createElement(fact.icon, {
                          className: `w-3.5 h-3.5 ${fact.tone || "text-gray-400"}`,
                        }),
                      fact.label,
                    ),
                    e.createElement(
                      "p",
                      {
                        className:
                          "text-xs font-semibold text-gray-700 dark:text-gray-200 mt-1 leading-tight",
                      },
                      fact.value,
                    ),
                  ),
                ),
              ),
            ),
          ),
        !isOwnerView &&
          e.createElement(
            "div",
            { className: "mhub-summary-cta mt-4 space-y-3" },
            e.createElement(
              "div",
              { className: "grid gap-2" },
              e.createElement(
                "div",
                { className: "grid grid-cols-2 gap-2" },
                e.createElement(
                  l,
                  {
                    type: "button",
                    onClick: handleContactSeller,
                    disabled: contactCtaDisabled,
                    title: contactCtaDisabled ? contactCtaReason : undefined,
                    className: `bg-blue-600 hover:bg-blue-700 text-white font-semibold h-11 px-3 rounded-xl shadow-sm text-[13px] sm:text-sm whitespace-nowrap dark:bg-blue-700/40 dark:hover:bg-blue-700/40 dark:text-white dark:sm:text-sm${contactCtaDisabled ? " opacity-60 cursor-not-allowed" : ""}`,
                  },
                  e.createElement(fe, { className: "w-4 h-4 mr-2" }),
                  tr("chat_seller", "Chat seller"),
                ),
                e.createElement(
                  l,
                  {
                    type: "button",
                    onClick: handleMakeOffer,
                    variant: "outline",
                    disabled: offerCtaDisabled,
                    title: offerCtaDisabled ? offerCtaReason : undefined,
                    className: `border-gray-200 text-gray-700 dark:border-gray-600 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-900/40 font-semibold h-11 px-3 rounded-xl text-[13px] sm:text-sm whitespace-nowrap dark:border-gray-700 dark:hover:bg-gray-950 dark:sm:text-sm${offerCtaDisabled ? " opacity-60 cursor-not-allowed" : ""}`,
                  },
                  e.createElement(ke, { className: "w-4 h-4 mr-2" }),
                  tr("make_an_offer", "Make an Offer"),
                ),
              ),
              e.createElement(
                "div",
                { className: "grid grid-cols-2 gap-2" },
                e.createElement(
                  l,
                  {
                    variant: "outline",
                    type: "button",
                    onClick: toggleSavedPost,
                    className: `h-11 px-3 rounded-xl font-semibold text-[13px] sm:text-sm whitespace-nowrap dark:sm:text-sm${savedPost ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400" : "border-gray-200 text-gray-700 dark:border-gray-600 dark:text-gray-300"}`,
                  },
                  savedPost
                    ? e.createElement(Xe, { className: "w-4 h-4 mr-2" })
                    : e.createElement(We, { className: "w-4 h-4 mr-2" }),
                  savedPost ? tr("saved", "Saved") : tr("save", "Save"),
                ),
                e.createElement(
                  l,
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
                      "h-11 px-3 rounded-xl font-semibold text-[13px] sm:text-sm whitespace-nowrap border-gray-200 text-gray-700 dark:border-gray-600 dark:text-gray-300 dark:border-gray-700 dark:text-gray-200",
                  },
                  e.createElement(Qe, { className: "w-4 h-4 mr-2" }),
                  tr("share", "Share"),
                ),
              ),
              (contactCtaDisabled || offerCtaDisabled) &&
                e.createElement(
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
            e.createElement(
              l,
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
              e.createElement(be, { className: "w-4 h-4 mr-2" }),
              tr("report_listing", "Report this listing"),
            ),
          ),
      ),
    ),
  );
  return e.createElement(
    "div",
    {
      id: "top",
      className:
        "mhub-post-detail min-h-screen mhub-premium-page bg-gradient-to-b from-slate-100 via-white to-slate-50 dark:bg-gradient-to-b",
    },
    e.createElement(
      "div",
      {
        className:
          "sticky top-0 z-50 mhub-premium-bar shadow-sm",
      },
      e.createElement(
        "div",
        {
          className:
            "w-full mx-auto px-4 py-3 flex items-center justify-between page-shell page-pad mhub-post-header",
        },
        e.createElement(
          "div",
          { className: "flex items-center gap-3 min-w-0 flex-1" },
          e.createElement(
            l,
            {
              variant: "ghost",
              onClick: () => navigateBack(U, backTarget),
              className:
                "inline-flex items-center gap-2 rounded-full bg-white/80 dark:bg-gray-800/80 text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-700 shadow-sm border border-gray-200/60 dark:border-gray-600/60 px-3 py-1.5 flex-shrink-0 backdrop-blur-sm transition-all",
            },
            e.createElement($, { className: "w-4 h-4" }),
            e.createElement("span", { className: "text-sm font-medium" }, tr("back", "Back")),
          ),
          e.createElement(
            "span",
            {
              className:
                "hidden sm:inline text-xs text-gray-500 dark:text-gray-400 max-w-[240px] truncate dark:text-gray-300",
            },
            backContextLabel,
          ),
        ),
        !isOwnerView &&
          e.createElement(
            "div",
            { className: "flex items-center gap-1 relative flex-shrink-0" },
            e.createElement(
              l,
              {
                variant: "ghost",
                size: "icon",
                onClick: toggleSavedPost,
                type: "button",
                "aria-label": savedPost
                  ? tr("remove_from_saved", "Remove from saved")
                  : tr("save_post", "Save post"),
                title: savedPost
                  ? tr("remove_from_saved", "Remove from saved")
                  : tr("save_post", "Save post"),
                className: `rounded-full w-10 h-10 ${savedPost ? "text-blue-600 bg-blue-50 dark:bg-blue-900/30" : "text-gray-500 dark:text-gray-400"}`,
              },
              savedPost
                ? e.createElement(Xe, { className: "w-5 h-5" })
                : e.createElement(We, { className: "w-5 h-5" }),
            ),
            e.createElement(
              l,
              {
                variant: "ghost",
                size: "icon",
                onClick: () => setShowMenu((t) => !t),
                type: "button",
                "aria-label": tr("more_options", "More options"),
                title: tr("more_options", "More options"),
                className: "rounded-full w-10 h-10 text-gray-500 dark:text-gray-400 dark:text-gray-300",
              },
              e.createElement(Je, { className: "w-5 h-5" }),
            ),
            showMenu &&
              e.createElement(
                "div",
                {
                  className:
                    "absolute right-0 top-11 z-30 w-44 rounded-xl border border-gray-200 dark:border-gray-700 mhub-premium-surface shadow-lg p-1 dark:border",
                },
                e.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: () => {
                      if (!J) return;
                      const t = buildShareUrl(J);
                      setShareUrl(t),
                        setShareDialogOpen(!0),
                        setShowMenu(!1),
                        re.post(`/posts/${J}/share`).catch(() => {});
                    },
                    className:
                      "w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-left dark:hover:bg-gray-950",
                  },
                  tr("share_link", "Share link"),
                ),
                e.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: () => {
                      toggleSavedPost(), setShowMenu(!1);
                    },
                    className:
                      "w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-left dark:hover:bg-gray-950",
                  },
                  savedPost
                    ? tr("remove_from_saved", "Remove from saved")
                    : tr("save_post", "Save post"),
                ),
                e.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: () => {
                      setShowMenu(!1),
                        U("/complaints", { state: { postId: J } });
                    },
                    className:
                      "w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg dark:text-left dark:text-red-300 dark:hover:bg-red-950/20",
                  },
                  tr("report", "Report"),
                ),
              ),
          ),
      ),
      e.createElement(
        "div",
        { className: "w-full mx-auto px-4 py-4 space-y-5 page-shell page-pad mhub-post-shell" },
        sectionNavNode,
        e.createElement(
          "div",
          { className: "mhub-post-body" },
          e.createElement(
            "div",
            { className: "mhub-post-media" },
            mediaCard,
          ),
          e.createElement(
            "aside",
            { className: "mhub-post-rail" },
            summaryCard,
            isOwnerView &&
              e.createElement(PostBoostPanel, { key: "boost-panel", postId: J || d }),
            e.createElement(
          g,
          {
            className:
              "mhub-post-section-card mhub-premium-surface rounded-2xl scroll-mt-24",
            id: "seller",
          },
          e.createElement(
            p,
            { className: "p-5" },
            e.createElement(
              "div",
              { className: "flex items-center gap-4" },
              e.createElement(
                ae,
                {
                  className:
                    "h-14 w-14 ring-4 ring-white dark:ring-gray-600 shadow-lg",
                },
                e.createElement(
                  se,
                  {
                    className:
                      "bg-gradient-to-br from-blue-500 to-purple-600 text-white text-lg font-bold dark:bg-gradient-to-br dark:text-white",
                  },
                  (o.name || "S").charAt(0).toUpperCase(),
                ),
              ),
              e.createElement(
                "div",
                { className: "flex-1" },
                e.createElement(
                  "div",
                  { className: "flex items-center gap-2 mb-0.5" },
                  e.createElement(
                    "h3",
                    { className: "font-bold text-gray-900 dark:text-white dark:text-gray-100" },
                    o.name,
                  ),
                  sellerTrustLabel
                    ? e.createElement(
                        te,
                        {
                          className: `text-[10px] px-2 py-1 leading-none ${sellerTrustBadgeClass}`,
                          title:
                            sellerTrustScore != null
                              ? `${sellerTrustLabel} · ${sellerTrustScore}`
                              : sellerTrustLabel,
                        },
                        sellerTrustLabel,
                        sellerTrustScore != null ? ` · ${sellerTrustScore}` : "",
                      )
                    : null,
                  sellerFrozen
                    ? e.createElement(
                        te,
                        {
                          className:
                            "text-[10px] px-2 py-1 leading-none bg-rose-600 text-white border-0",
                        },
                        tr("seller_frozen", "Seller Frozen"),
                      )
                    : sellerUnderReview
                      ? e.createElement(
                          te,
                          {
                            className:
                              "text-[10px] px-2 py-1 leading-none bg-amber-500 text-white border-0",
                          },
                          tr("seller_under_review", "Under Review"),
                        )
                      : null,
                  S
                    ? e.createElement(ye, {
                        className: "w-4 h-4 text-green-500 dark:text-green-300",
                      })
                    : e.createElement(Ne, {
                        className: "w-4 h-4 text-gray-400 dark:text-gray-300",
                      }),
                ),
                e.createElement(
                  "p",
                  { className: "text-xs text-gray-500 dark:text-gray-400 dark:text-gray-300" },
                  S
                    ? tr("verified_profile", "Verified profile")
                    : tr("verification_pending", "Verification pending"),
                ),
                e.createElement(
                  "div",
                  {
                    className:
                      "flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mt-1 dark:text-gray-200",
                  },
                  _ > 0 &&
                    e.createElement(ue, {
                      className: "w-4 h-4 text-amber-400 fill-current dark:text-amber-200",
                    }),
                  e.createElement(
                    "span",
                    { className: "font-semibold" },
                    _ > 0
                      ? _.toFixed(1)
                      : tr("no_rating_yet", "No rating yet"),
                  ),
                  e.createElement("span", null, "\u2022"),
                  e.createElement(
                    "span",
                    null,
                    tr("id_label", "ID:"),
                    " ",
                    o.id,
                  ),
                ),
                e.createElement(
                  "div",
                  {
                    className:
                      "mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-gray-600 dark:text-gray-300 dark:text-gray-200",
                  },
                  sellerStats.map((t) =>
                    e.createElement(
                      "div",
                      {
                        key: t.key,
                        className:
                          "rounded-lg bg-white/80 dark:bg-gray-900/40 px-2.5 py-2 dark:bg-slate-900/80",
                      },
                      e.createElement(
                        "p",
                        {
                          className:
                            "text-[11px] uppercase text-gray-500 dark:text-gray-400 dark:text-gray-300",
                        },
                        t.label,
                      ),
                      e.createElement(
                        "p",
                        {
                          className:
                            "font-semibold text-gray-800 dark:text-gray-200 dark:text-gray-100",
                        },
                        t.value,
                      ),
                    ),
                  ),
                ),
                sellerTrustUserId &&
                  e.createElement(
                    "div",
                    { className: "mt-4 flex flex-wrap gap-2" },
                    e.createElement(
                      R,
                      { to: `/centre/${sellerTrustUserId}` },
                      e.createElement(
                        l,
                        { variant: "outline", className: "gap-2" },
                        tr("view_centre_page", "View CentrePage"),
                      ),
                    ),
                  ),
              ),
            ),
          ),
        ),
        !isOwnerView &&
          e.createElement(
            g,
            {
              className:
                "mhub-post-section-card mhub-premium-surface border-0 shadow-lg rounded-2xl mhub-ready-cta-card dark:border-0",
            },
            e.createElement(
              p,
              { className: "p-5 space-y-4" },
              e.createElement(
                "div",
                {
                  className:
                    "flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 dark:text-gray-200",
                },
                e.createElement(fe, { className: "w-4 h-4 text-emerald-500 dark:text-emerald-300" }),
                tr("ready_to_buy", "Ready to buy?"),
              ),
              e.createElement(
                l,
                {
                  onClick: handleContactSeller,
                  disabled: contactCtaDisabled,
                  title: contactCtaDisabled ? contactCtaReason : undefined,
                  className: `w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-4 text-base rounded-xl shadow-lg hover:shadow-xl transition-all dark:bg-gradient-to-r dark:text-white ${contactCtaDisabled ? "opacity-60 cursor-not-allowed" : ""}`,
                },
                e.createElement(fe, { className: "w-6 h-6 mr-3" }),
                tr(
                  "interested_contact_seller",
                  "I'm Interested - Contact Seller",
                ),
              ),
              e.createElement(
                l,
                {
                  onClick: handleMakeOffer,
                  variant: "outline",
                  disabled: offerCtaDisabled,
                  title: offerCtaDisabled ? offerCtaReason : undefined,
                  className: `w-full bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-gray-900 font-bold py-4 text-base rounded-xl shadow-lg transition-all dark:bg-gradient-to-r dark:text-gray-100 ${offerCtaDisabled ? "opacity-60 cursor-not-allowed" : ""}`,
                },
                e.createElement(ke, { className: "w-5 h-5 mr-2" }),
                tr("make_an_offer", "Make an Offer"),
              ),
              e.createElement(
                "p",
                {
                  className:
                    "text-center text-xs text-gray-500 dark:text-gray-400 dark:text-center dark:text-gray-300",
                },
                tr(
                  "secure_contact_details_hint",
                  "Share your contact details securely with only this seller",
                ),
              ),
              e.createElement(
                "div",
                {
                  className:
                    "pt-2 border-t border-slate-200/70 dark:border-slate-700/70 dark:border-t",
                },
                e.createElement(
                  l,
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
                  e.createElement(be, { className: "w-4 h-4 mr-2" }),
                  tr("report_listing", "Report this listing"),
                ),
              ),
            ),
          ),
        isOwnerView &&
          e.createElement(
            l,
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
            e.createElement(be, { className: "w-4 h-4 mr-2" }),
            tr("report_listing", "Report this listing"),
          ),
          isOwnerView &&
            e.createElement(
            "div",
            {
              className:
                "rounded-2xl border border-slate-200 mhub-premium-surface p-4 shadow-lg space-y-4 dark:border dark:border-slate-700",
            },
            e.createElement(
              "div",
              { className: "flex items-center justify-between" },
              e.createElement(
                "div",
                null,
                e.createElement(
                  "h3",
                  {
                    className:
                      "text-lg font-bold text-gray-900 dark:text-white dark:text-gray-100",
                  },
                  tr("lead_activity", "Lead activity"),
                ),
                e.createElement(
                  "p",
                  { className: "text-xs text-gray-500 dark:text-gray-400 dark:text-gray-300" },
                  tr(
                    "lead_activity_hint",
                    "Track who viewed and engaged with your post.",
                  ),
                ),
              ),
              e.createElement(
                "span",
                {
                  className:
                    "inline-flex items-center rounded-full bg-emerald-100 text-emerald-700 px-3 py-1 text-xs font-semibold dark:bg-emerald-950/20 dark:text-emerald-300",
                },
                tr("total_leads", "Total leads"),
                " : ",
                ownerLeadCount,
              ),
            ),
            ownerInsightsLoading
              ? e.createElement(
                  "p",
                  { className: "text-sm text-gray-500 dark:text-gray-400 dark:text-gray-300" },
                  tr("loading_leads", "Loading lead activity..."),
                )
              : ownerInsightsErrorMessage
                ? e.createElement(
                    "p",
                    { className: "text-sm text-gray-500 dark:text-gray-400 dark:text-gray-300" },
                    ownerInsightsErrorMessage,
                  )
                : e.createElement(
                    "div",
                    { className: "grid gap-3 md:grid-cols-3" },
                    e.createElement(
                      "div",
                      {
                        className:
                          "rounded-xl border border-slate-200 p-3 bg-slate-50 dark:bg-gray-900/40 dark:border dark:border-slate-700 dark:bg-slate-950",
                      },
                      e.createElement(
                        "div",
                        { className: "flex items-center justify-between" },
                        e.createElement(
                          "p",
                          { className: "text-xs text-slate-500 dark:text-slate-400 uppercase dark:text-slate-300" },
                          tr("interested_users", "Interested"),
                        ),
                        e.createElement(
                          "span",
                          {
                            className:
                              "text-xs font-semibold text-slate-600 dark:text-slate-300 dark:text-slate-200",
                          },
                          ownerInquiries.length,
                        ),
                      ),
                      ownerInquiries.length > 0
                        ? e.createElement(
                            "div",
                            {
                              className:
                                "mt-2 space-y-1 text-xs max-h-32 overflow-y-auto pr-1",
                            },
                            ownerInquiries.map((t, s) =>
                              e.createElement(
                                "div",
                                {
                                  key: t.inquiry_id || t.buyer_id || s,
                                  className:
                                    "flex items-center justify-between text-slate-600 dark:text-slate-300 dark:text-slate-200",
                                },
                                e.createElement(
                                  "span",
                                  null,
                                  t.buyer_name ||
                                    t.name ||
                                    t.buyer_id ||
                                    tr("unknown", "Unknown"),
                                ),
                                t.phone
                                  ? e.createElement(
                                      "span",
                                      { className: "text-[11px]" },
                                      t.phone,
                                    )
                                  : null,
                              ),
                            ),
                          )
                        : e.createElement(
                            "p",
                            {
                              className:
                                "mt-2 text-xs text-slate-400 dark:text-slate-500 dark:text-slate-300",
                            },
                            tr("no_leads_yet", "No interactions yet."),
                          ),
                    ),
                    e.createElement(
                      "div",
                      {
                        className:
                          "rounded-xl border border-slate-200 p-3 bg-slate-50 dark:bg-gray-900/40 dark:border dark:border-slate-700 dark:bg-slate-950",
                      },
                      e.createElement(
                        "div",
                        { className: "flex items-center justify-between" },
                        e.createElement(
                          "p",
                          { className: "text-xs text-slate-500 dark:text-slate-400 uppercase dark:text-slate-300" },
                          tr("detail_views", "View details"),
                        ),
                        e.createElement(
                          "span",
                          {
                            className:
                              "text-xs font-semibold text-slate-600 dark:text-slate-300 dark:text-slate-200",
                          },
                          ownerViewers.length,
                        ),
                      ),
                      ownerViewers.length > 0
                        ? e.createElement(
                            "div",
                            {
                              className:
                                "mt-2 space-y-1 text-xs max-h-32 overflow-y-auto pr-1",
                            },
                            ownerViewers.map((t, s) =>
                              e.createElement(
                                "div",
                                {
                                  key: t.viewer_id || t.user_id || s,
                                  className:
                                    "flex items-center justify-between text-slate-600 dark:text-slate-300 dark:text-slate-200",
                                },
                                e.createElement(
                                  "span",
                                  null,
                                  t.viewer_name ||
                                    t.full_name ||
                                    t.username ||
                                    t.user_id ||
                                    tr("unknown", "Unknown"),
                                ),
                                t.viewed_at
                                  ? e.createElement(
                                      "span",
                                      { className: "text-[11px]" },
                                      I(t.viewed_at),
                                    )
                                  : null,
                              ),
                            ),
                          )
                        : e.createElement(
                            "p",
                            {
                              className:
                                "mt-2 text-xs text-slate-400 dark:text-slate-500 dark:text-slate-300",
                            },
                            tr("no_leads_yet", "No interactions yet."),
                          ),
                    ),
                    e.createElement(
                      "div",
                      {
                        className:
                          "rounded-xl border border-slate-200 p-3 bg-slate-50 dark:bg-gray-900/40 dark:border dark:border-slate-700 dark:bg-slate-950",
                      },
                      e.createElement(
                        "div",
                        { className: "flex items-center justify-between" },
                        e.createElement(
                          "p",
                          { className: "text-xs text-slate-500 dark:text-slate-400 uppercase dark:text-slate-300" },
                          tr("lead_users", "Leads"),
                        ),
                        e.createElement(
                          "span",
                          {
                            className:
                              "text-xs font-semibold text-slate-600 dark:text-slate-300 dark:text-slate-200",
                          },
                          ownerLeadCount,
                        ),
                      ),
                      ownerLeadList.length > 0
                        ? e.createElement(
                            "div",
                            {
                              className:
                                "mt-2 space-y-1 text-xs max-h-32 overflow-y-auto pr-1",
                            },
                            ownerLeadList.map((t, s) =>
                              e.createElement(
                                "div",
                                {
                                  key: t.id || s,
                                  className:
                                    "flex items-center justify-between text-slate-600 dark:text-slate-300 dark:text-slate-200",
                                },
                                e.createElement(
                                  "span",
                                  null,
                                  t.name || tr("unknown", "Unknown"),
                                ),
                                t.types?.length
                                  ? e.createElement(
                                      "span",
                                      { className: "text-[11px]" },
                                      t.types.join(", "),
                                    )
                                  : null,
                              ),
                            ),
                          )
                        : e.createElement(
                            "p",
                            {
                              className:
                                "mt-2 text-xs text-slate-400 dark:text-slate-500 dark:text-slate-300",
                            },
                            tr("no_leads_yet", "No interactions yet."),
                          ),
                    ),
                  ),
          ),
          ),
          e.createElement(
            "div",
            { className: "mhub-post-main" },
        listingDetails.length > 0 &&
          e.createElement(
            g,
            {
              className:
                "mhub-post-section-card mhub-premium-surface border-0 shadow-lg rounded-2xl scroll-mt-24 dark:border-0",
              id: "listing-details",
            },
            e.createElement(
              p,
              { className: "p-5" },
              renderSectionHeader("listing-details", xe, tr("listing_details", "Listing details"), "mb-3"),
              !collapsedSections["listing-details"] &&
              e.createElement(
                "div",
                { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3" },
                listingDetails.map((t) =>
                  e.createElement(
                    "div",
                    {
                      key: t.key,
                      className:
                        "rounded-xl border border-gray-200 dark:border-gray-700 p-3 dark:border",
                    },
                    e.createElement(
                      "div",
                      {
                        className:
                          "flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-300",
                      },
                      t.icon &&
                        e.createElement(t.icon, { className: "w-3.5 h-3.5" }),
                      t.label,
                    ),
                    e.createElement(
                      "p",
                      {
                        className:
                          "text-sm font-semibold text-gray-900 dark:text-white mt-1 dark:text-gray-100",
                      },
                      t.value,
                    ),
                  ),
                ),
              ),
            ),
          ),
        keyDetails.length > 0 &&
          e.createElement(
            g,
            {
              className:
                "mhub-post-section-card mhub-premium-surface border-0 shadow-lg rounded-2xl scroll-mt-24 dark:border-0",
              id: "key-details",
            },
            e.createElement(
              p,
              { className: "p-5" },
              renderSectionHeader("key-details", ve, tr("key_details", "Key details"), "mb-3"),
              !collapsedSections["key-details"] &&
              e.createElement(
                "div",
                { className: "divide-y divide-gray-100 dark:divide-gray-800" },
                keyDetails.map((item) =>
                  e.createElement(
                    "div",
                    {
                      key: item.key,
                      className:
                        "flex items-center justify-between py-3 px-1",
                    },
                    e.createElement(
                      "div",
                      {
                        className:
                          "flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-300",
                      },
                      item.icon &&
                        e.createElement(item.icon, { className: "w-3.5 h-3.5" }),
                      item.label,
                    ),
                    e.createElement(
                      "p",
                      {
                        className:
                          "text-sm font-semibold text-gray-900 dark:text-white mt-1 dark:text-gray-100",
                      },
                      item.value,
                    ),
                  ),
                ),
              ),
            ),
          ),
        specs.length > 0 &&
          e.createElement(
            g,
            {
              className:
                "mhub-post-section-card mhub-premium-surface border-0 shadow-lg rounded-2xl scroll-mt-24 dark:border-0",
              id: "specs",
            },
            e.createElement(
              p,
              { className: "p-5" },
              renderSectionHeader("specs", xe, tr("specifications", "Specifications"), "mb-3"),
              !collapsedSections["specs"] &&
              e.createElement(
                "div",
                { className: "divide-y divide-gray-100 dark:divide-gray-800" },
                specs.map((spec) =>
                  e.createElement(
                    "div",
                    {
                      key: spec.key,
                      className:
                        "flex items-center justify-between py-3 px-1",
                    },
                    e.createElement(
                      "p",
                      {
                        className:
                          "text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 dark:text-gray-300",
                      },
                      spec.label,
                    ),
                    e.createElement(
                      "p",
                      {
                        className:
                          "text-sm font-semibold text-gray-900 dark:text-white mt-1 dark:text-gray-100",
                      },
                      spec.value,
                    ),
                  ),
                ),
              ),
            ),
          ),
        e.createElement(
          g,
          {
            className:
              "mhub-post-section-card mhub-premium-surface border-0 shadow-lg rounded-2xl scroll-mt-24 dark:border-0",
            id: "location",
          },
          e.createElement(
            p,
            { className: "p-5 space-y-3" },
            renderSectionHeader("location", pe, tr("location_meetup", "Location & meetup")),
            !collapsedSections["location"] &&
            e.createElement(
              e.Fragment,
              null,
            e.createElement(
              "div",
              {
                className:
                  "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-3",
              },
              e.createElement(
                "div",
                null,
                e.createElement(
                  "p",
                  {
                    className:
                      "text-sm font-semibold text-gray-900 dark:text-white dark:text-gray-100",
                  },
                  locationDisplay,
                ),
                hasCoords &&
                  e.createElement(
                    "p",
                    { className: "text-xs text-gray-500 dark:text-gray-400 dark:text-gray-300" },
                    tr("coordinates", "Coordinates"),
                    ": ",
                    latitude.toFixed(4),
                    ", ",
                    longitude.toFixed(4),
                  ),
              ),
              mapsUrl &&
                e.createElement(
                  l,
                  { variant: "outline", asChild: true },
                  e.createElement(
                    "a",
                    {
                      href: mapsUrl,
                      target: "_blank",
                      rel: "noreferrer",
                    },
                    tr("open_in_maps", "Open in maps"),
                  ),
                ),
            ),
            e.createElement(
              "p",
              { className: "text-xs text-gray-500 dark:text-gray-400 dark:text-gray-300" },
              locationHint,
            ),
            ),
          ),
        ),
        e.createElement(
          g,
          {
            className:
              "mhub-post-section-card mhub-premium-surface border-0 shadow-lg rounded-2xl scroll-mt-24 dark:border-0",
            id: "trust-safety",
          },
          e.createElement(
            p,
            { className: "p-5" },
            renderSectionHeader("trust-safety", Ne, tr("trust_safety", "Trust & Safety"), "mb-4"),
            !collapsedSections["trust-safety"] &&
            e.createElement(
              e.Fragment,
              null,
            e.createElement(
              "div",
              {
                className:
                  "rounded-xl border border-emerald-100 dark:border-emerald-900 bg-emerald-50/70 dark:bg-emerald-900/20 p-3 mb-4 dark:border dark:border-emerald-600/40 dark:bg-emerald-950/70",
              },
              e.createElement(
                "p",
                {
                  className:
                    "text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300 mb-2",
                },
                tr("safety_at_a_glance", "Safety at a glance"),
              ),
              e.createElement(
                "div",
                { className: "grid grid-cols-1 sm:grid-cols-3 gap-3" },
                safetyHighlights.map((tip) =>
                  e.createElement(
                    "div",
                    {
                      key: tip.key,
                      className:
                        "mhub-safety-tile rounded-lg border border-emerald-200/60 dark:border-emerald-800/60 bg-white/80 dark:bg-gray-900/40 p-2.5 dark:border dark:border-emerald-600/60 dark:bg-slate-900/80",
                    },
                    e.createElement(
                      "div",
                      {
                        className:
                          "mhub-safety-title flex items-center gap-2 text-[11px] text-emerald-700 dark:text-emerald-200 dark:text-emerald-300",
                      },
                      tip.icon &&
                        e.createElement(tip.icon, { className: "w-3.5 h-3.5" }),
                      tip.label,
                    ),
                    e.createElement(
                      "p",
                      {
                        className:
                          "mhub-safety-hint text-[11px] text-emerald-800/80 dark:text-emerald-100/80 mt-1 dark:text-emerald-200/80",
                      },
                      tip.hint,
                    ),
                  ),
                ),
              ),
            ),
            e.createElement(
              "div",
              { className: "grid grid-cols-1 md:grid-cols-2 gap-3" },
              K.map((t) =>
                e.createElement(
                  "div",
                  {
                    key: t.key,
                    className:
                      "rounded-xl border border-gray-200 dark:border-gray-700 p-3 dark:border",
                  },
                  e.createElement(
                    "p",
                    { className: "text-xs text-gray-500 dark:text-gray-400 dark:text-gray-300" },
                    t.label,
                  ),
                  e.createElement(
                    "p",
                    {
                      className:
                        "text-sm font-semibold text-gray-900 dark:text-white dark:text-gray-100",
                    },
                    t.value,
                  ),
                  e.createElement(
                    "p",
                    {
                      className:
                        "text-xs text-gray-500 dark:text-gray-400 mt-1 dark:text-gray-300",
                    },
                    t.hint,
                  ),
                ),
              ),
            ),
            e.createElement(
              "div",
              {
                className:
                  "mt-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-3 dark:bg-amber-950/20 dark:border dark:border-amber-600/40",
              },
              e.createElement(
                "p",
                { className: "text-xs text-amber-800 dark:text-amber-300 dark:text-amber-200" },
                tr(
                  "safety_tip",
                  "Safety tip: avoid sharing sensitive details outside the app and verify the listing ID before payment handover.",
                ),
              ),
            ),
            ),
          ),
        ),
        e.createElement(
          g,
          {
            className:
              "mhub-post-section-card mhub-premium-surface border-0 shadow-lg rounded-2xl scroll-mt-24 dark:border-0",
            id: "description",
          },
          e.createElement(
            p,
            { className: "p-5" },
            renderSectionHeader("description", x, tr("description", "Description"), "mb-3"),
            !collapsedSections["description"] &&
            e.createElement(
              e.Fragment,
              null,
            e.createElement(
              "div",
              {
                className:
                  descriptionContainerClass,
              },
              hasDescription
                ? e.createElement(
                    e.Fragment,
                    null,
                    descriptionParagraphs.map((t, s) =>
                      e.createElement("p", { key: `desc-${s}` }, t),
                    ),
                    descriptionBullets.length > 0 &&
                      e.createElement(
                        "ul",
                        { className: "list-disc pl-5 space-y-1" },
                        descriptionBullets.map((t, s) =>
                          e.createElement(
                            "li",
                            { key: `desc-bullet-${s}` },
                            t,
                          ),
                        ),
                      ),
                  )
                : e.createElement(
                    "p",
                    { className: "text-gray-500 dark:text-gray-400 dark:text-gray-300" },
                    tr(
                      "no_description",
                      "No description provided for this product. Contact the seller for more details.",
                    ),
                  ),
              descriptionIsLong &&
                !descriptionExpanded &&
                e.createElement("div", {
                  className:
                    "pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white dark:from-gray-800 to-transparent dark:bg-gradient-to-t",
                  "aria-hidden": "true",
                }),
            ),
            descriptionIsLong &&
              e.createElement(
                "button",
                {
                  type: "button",
                  onClick: () => setDescriptionExpanded((t) => !t),
                  className:
                    "mt-3 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 dark:text-blue-300",
                },
                descriptionExpanded
                  ? tr("show_less", "Show less")
                  : tr("read_more", "Read more"),
              ),
            ),
          ),
        ),
        e.createElement(
          g,
          {
            className:
              "mhub-post-section-card mhub-premium-surface border-0 shadow-lg rounded-2xl scroll-mt-24 dark:border-0",
            id: "negotiation",
          },
          e.createElement(
            p,
            { className: "p-5" },
            e.createElement(
              "div",
              { className: "flex items-center gap-2 mb-3" },
              e.createElement(ke, { className: "w-5 h-5 text-emerald-500 dark:text-emerald-300" }),
              e.createElement(
                "h3",
                { className: "font-bold text-gray-900 dark:text-white dark:text-gray-100" },
                tr("negotiate_price", "Negotiate & bargain"),
              ),
            ),
            e.createElement(ne, {
              post: r,
              currentUser: {
                userId: currentUserId,
                id: currentUserId,
              },
              onChatClick: handleContactSeller,
            }),
          ),
        ),
        !isOwnerView &&
          e.createElement(
            "div",
            { className: "space-y-5" },
            sponsoredSectionVisible &&
              e.createElement(
                g,
                {
                  className:
                    "mhub-premium-surface border-0 shadow-lg rounded-2xl scroll-mt-24 dark:border-0",
                  id: "sponsored",
                },
                e.createElement(
                  p,
                  { className: "p-5" },
                  e.createElement(
                    "div",
                    {
                      className:
                        "flex flex-wrap items-center justify-between gap-3 mb-4",
                    },
                    e.createElement(
                      "div",
                      null,
                      e.createElement(
                        "h3",
                        {
                          className:
                            "text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 dark:text-gray-100",
                        },
                        e.createElement(xe, {
                          className: "w-5 h-5 text-blue-600 dark:text-blue-300",
                        }),
                        tr("sponsored_listings", "Sponsored listings"),
                      ),
                      e.createElement(
                        "p",
                        { className: "text-xs text-gray-500 dark:text-gray-400 dark:text-gray-300" },
                        tr(
                          "sponsored_hint",
                          "Paid boosts (Boost/Featured/Spotlight) similar to this listing.",
                        ),
                      ),
                    ),
                    e.createElement(
                      "div",
                      { className: "flex items-center gap-2" },
                      e.createElement(
                        te,
                        {
                          className:
                            "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 dark:bg-blue-950/20",
                        },
                        tr("ad", "Ad"),
                      ),
                      e.createElement(
                        "span",
                        {
                          className:
                            "text-[10px] text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full cursor-help",
                          title: tr(
                            "sponsored_tooltip",
                            "Sponsored listings are boosted with Boost, Featured, or Spotlight promotions.",
                          ),
                        },
                        tr("why_this", "Why this?"),
                      ),
                    ),
                  ),
                  e.createElement(
                    "div",
                    {
                      className:
                        "mb-4 inline-flex items-center gap-2 rounded-full bg-blue-50 dark:bg-blue-900/30 px-3 py-1 text-xs text-blue-700 dark:text-blue-300 dark:bg-blue-950/20",
                    },
                    e.createElement(xe, { className: "w-3.5 h-3.5" }),
                    sponsoredReason,
                  ),
                  e.createElement(
                    "div",
                    { className: "mt-2" },
                    e.createElement(SponsoredListings, {
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
              e.createElement(
                g,
                {
                  className:
                    "mhub-premium-surface rounded-2xl scroll-mt-24",
                  id: "premium",
                },
                e.createElement(
                  p,
                  { className: "p-5" },
                  e.createElement(
                    "div",
                    {
                      className:
                        "flex flex-wrap items-center justify-between gap-3 mb-4",
                    },
                    e.createElement(
                      "div",
                      null,
                      e.createElement(
                        "h3",
                        {
                          className:
                            "text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 dark:text-gray-100",
                        },
                        e.createElement(ve, {
                          className: "w-5 h-5 text-purple-600 dark:text-purple-300",
                        }),
                        tr("premium_recommendations", "Premium listings"),
                      ),
                      e.createElement(
                        "p",
                        { className: "text-xs text-gray-500 dark:text-gray-400 dark:text-gray-300" },
                        tr(
                          "premium_hint",
                          "Premium-tier listings from top sellers in this category.",
                        ),
                      ),
                    ),
                    e.createElement(
                      "div",
                      { className: "flex items-center gap-2" },
                      e.createElement(
                        te,
                        {
                          className:
                            "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 dark:bg-purple-950/20",
                        },
                        tr("premium", "Premium"),
                      ),
                      e.createElement(
                        "span",
                        {
                          className:
                            "text-[10px] text-purple-600 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded-full cursor-help",
                          title: tr(
                            "premium_tooltip",
                            "Premium listings are from Premium-tier sellers (top priority plans).",
                          ),
                        },
                        tr("why_this", "Why this?"),
                      ),
                    ),
                  ),
                  e.createElement(
                    "div",
                    {
                      className:
                        "mb-4 inline-flex items-center gap-2 rounded-full bg-purple-50 dark:bg-purple-900/30 px-3 py-1 text-xs text-purple-700 dark:text-purple-300 dark:bg-purple-950/20",
                    },
                    e.createElement(ve, { className: "w-3.5 h-3.5" }),
                    premiumReason,
                  ),
                  e.createElement(
                    "div",
                    { className: "mt-2" },
                    e.createElement(PremiumRecommendations, {
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
        e.createElement(
          "div",
          { className: "flex justify-center" },
          e.createElement(
            "a",
            {
              href: "#top",
              className:
                "text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-300 dark:text-gray-300",
            },
            tr("back_to_top", "Back to top"),
          ),
        ),
        e.createElement("div", { className: "h-8" }),
      ),
      !isOwnerView &&
        e.createElement(
          "div",
          {
            className: "mhub-post-cta-bar",
          },
          e.createElement(
            "div",
            { className: "mhub-post-cta-bar-inner" },
            e.createElement(
              "div",
              { className: "mhub-cta-bar-price min-w-0" },
              e.createElement(
                "p",
                { className: "text-lg font-bold text-gray-900 dark:text-white truncate dark:text-gray-100" },
                C(r.price),
              ),
              freshnessLine &&
                e.createElement(
                  "p",
                  { className: "text-[11px] text-gray-500 dark:text-gray-400 truncate dark:text-gray-300" },
                  freshnessLine,
                ),
            ),
            e.createElement(
              "div",
              { className: "mhub-cta-bar-actions" },
              e.createElement(
                l,
                {
                  onClick: handleContactSeller,
                  disabled: contactCtaDisabled,
                  title: contactCtaDisabled ? contactCtaReason : undefined,
                  className: `bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold px-5 py-3 rounded-xl text-xs sm:text-sm whitespace-nowrap dark:bg-gradient-to-r dark:text-white ${contactCtaDisabled ? "opacity-60 cursor-not-allowed" : ""}`,
                },
                tr("contact_seller", "Contact Seller"),
              ),
              e.createElement(
                l,
                {
                  onClick: handleMakeOffer,
                  disabled: offerCtaDisabled,
                  title: offerCtaDisabled ? offerCtaReason : undefined,
                  className: `bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-900 font-bold px-5 py-3 rounded-xl text-xs sm:text-sm whitespace-nowrap dark:bg-gradient-to-r dark:text-gray-100 dark:sm:text-sm${offerCtaDisabled ? " opacity-60 cursor-not-allowed" : ""}`,
                },
                tr("make_offer_short", "Make Offer"),
              ),
            ),
          ),
        ),
      e.createElement(le, {
        isOpen: E,
        onClose: () => f(!1),
        postId: J,
        postTitle: r?.title,
      }),
      e.createElement(ie, { isOpen: V, onClose: () => w(!1), post: r }),
      e.createElement(ImageZoomModal, {
        isOpen: zoomOpen && Boolean(activeImage),
        onClose: () => setZoomOpen(!1),
        imageUrl: cee(activeImage || "/placeholder.svg"),
        alt: r.title
          ? `${r.title} - ${tr("image", "Image")} ${activeIndex + 1}`
          : tr("listing_image", "Listing image"),
        onNext: imageCount > 1 ? z : null,
        onPrev: imageCount > 1 ? H : null,
        currentIndex: activeIndex,
        totalCount: imageCount,
      }),
      e.createElement(Se, {
        open: shareDialogOpen,
        onOpenChange: setShareDialogOpen,
        url: shareUrl,
        title: tr("share_post", "Share post"),
      }),
    ),
  ));
}
export { PostDetail as default };


import e, {
  useState as c,
  useEffect as I,
  useRef as H,
  useCallback as A,
  useMemo as J,
} from "react";
import {
  useNavigate as ce,
  useLocation as ge,
  useSearchParams as be,
} from "react-router-dom";
import { useTranslation as xe } from "react-i18next";
import PageDensityToggle from "@/components/ui/PageDensityToggle";
import { usePageDensity } from "@/hooks/usePageDensity";
import { readUserCity } from "@/utils/locationCache";
import {
  Sparkles as K,
  Lock as pe,
  Gift as he,
  TrendingUp as fe,
  Zap as ve,
  LogIn as we,
  AlertTriangle as Q,
  RefreshCw as X,
  RotateCcw as F,
} from "lucide-react";
import {
  FaHeart as He,
  FaRegHeart as qe,
  FaShare as Ge,
  FaEye as Qe,
  FaHandHoldingHeart as Ye,
  FaBookmark as Po,
  FaRegBookmark as Ro,
  FaEllipsisV as To,
  FaChevronLeft as Lo,
  FaChevronRight as Co,
  FaShoppingCart as Bo,
  FaCartPlus as Mo,
} from "react-icons/fa";
import R from "../lib/api";
import { Card as ee } from "@/components/ui/card";
import { Button as o } from "@/components/ui/button";
import { Avatar as ye, AvatarFallback as Ne } from "@/components/ui/avatar";
import BuyerInterestModal from "@/components/BuyerInterestModal";
import LoginPromptModal from "@/components/LoginPromptModal";
import AllPostsGreatDealsBanner from "@/components/allposts/GreatDealsBanner";
import AllPostsFeedHeader from "@/components/allposts/FeedHeader";
import {
  Alert as ke,
  AlertDescription as Pe,
  AlertTitle as Ce,
} from "@/components/ui/alert";
import { useTranslatedPosts as Le } from "../hooks/useTranslatedContent";
import { useAuth as _e } from "@/context/AuthContext";
import { useCart as mt } from "@/context/CartContext";
import { useCategoryMode } from "@/context/CategoryModeContext";
import { hasAuthSession as Ae, getUserId as Se } from "@/utils/authStorage";
import { fetchCategoriesCached } from "@/services/categoriesService";
import { fetchUserPreferencesCached } from "@/services/preferencesService";
import ShareLinkDialog from "@/components/ShareLinkDialog";
import PromoteDialog from "@/components/PromoteDialog";
import { sharePost } from "@/services/nativeShareService";
import { impactLight } from "@/services/nativeHapticsService";
import {
  buildSavedPostsMap,
  fetchWishlistIds,
  getSavedPostsMap,
  setSavedPostStatus,
  subscribeSavedPosts,
} from "@/utils/savedPosts";
import {
  normalizeMediaList as ctm,
  resolveMediaUrl as utm,
} from "@/lib/mediaUrl";
import {
  buildActiveAppMatcher,
  matchesCategoryModeItem,
} from "@/utils/categoryModeFilters";
import { isPostOwnedByUser } from "@/utils/postOwnership";
const te = 12,
  PLACEHOLDER_IMAGE = "/placeholder.svg",
  getPostId = (r) => {
    if (r == null) return "";
    if (Array.isArray(r)) return "";
    if (typeof r === "object") {
      const candidate = r.post_id ?? r.postId ?? r.id;
      if (candidate == null) return "";
      if (typeof candidate === "object") return "";
      return String(candidate).trim();
    }
    const value = String(r).trim();
    return value.length ? value : "";
  },
  parsePrice = (r) => {
    if (r == null) return 0;
    if (typeof r === "number") return Number.isFinite(r) ? r : 0;
    const cleaned = String(r).replace(/[^0-9.-]/g, "");
    const value = Number(cleaned);
    return Number.isFinite(value) ? value : 0;
  },
  resolvePostPriceValue = (r) => {
    if (!r || typeof r !== "object") {
      return parsePrice(r);
    }
    const candidates = [
      r.price,
      r.price_value,
      r.priceValue,
      r.price_inr,
      r.priceInr,
      r.listing_price,
      r.listingPrice,
      r.selling_price,
      r.sellingPrice,
      r.sale_price,
      r.salePrice,
      r.expected_price,
      r.expectedPrice,
      r.asking_price,
      r.askingPrice,
      r.amount,
      r.budget,
    ];
    for (let i = 0; i < candidates.length; i += 1) {
      const value = parsePrice(candidates[i]);
      if (Number.isFinite(value) && value > 0) return value;
    }
    return 0;
  },
  collectPostImageUrls = (r) => {
    if (!r) return [PLACEHOLDER_IMAGE];
    const urls = [];
    const pushList = (value) => {
      ctm(value).forEach((item) => {
        const resolved = utm(item, PLACEHOLDER_IMAGE);
        resolved && urls.push(resolved);
      });
    };
    const pushFrom = (value) => {
      if (!value) return;
      pushList(value.images);
      pushList(value.image_urls);
      pushList(value.imageUrls);
      pushList(value.image_url);
      pushList(value.imageUrl);
      pushList(value.image);
      pushList(value.photo);
      pushList(value.photos);
      pushList(value.gallery);
      pushList(value.media);
      pushList(value.media_urls);
      pushList(value.mediaUrls);
      pushList(value.cover_image);
      pushList(value.coverImage);
      pushList(value.primary_image);
      pushList(value.primaryImage);
      pushList(value.thumbnail);
    };
    pushFrom(r);
    pushFrom(r.post);
    pushFrom(r.listing);
    pushFrom(r.item);
    const unique = Array.from(
      new Set(
        urls.map((item) => String(item || "").trim()).filter((item) => !!item && item !== PLACEHOLDER_IMAGE),
      ),
    );
    return unique.length ? unique : [PLACEHOLDER_IMAGE];
  },
  getPrimaryImage = (r) => {
    const list = collectPostImageUrls(r);
    return list[0] || PLACEHOLDER_IMAGE;
  },
  normalizeLatestWindow = (r) => {
    const value = Number.parseInt(String(r || ""), 10);
    return value === 5 || value === 10 || value === 50 ? value : null;
  },
  buildTodayValue = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  },
  formatRelativeTime = (r) => {
    if (!r) return "";
    const i = new Date(r);
    if (Number.isNaN(i.getTime())) return "";
    const g = Date.now() - i.getTime();
    const n = Math.max(1, Math.floor(g / 6e4));
    if (n < 60) return `${n}m ago`;
    const P = Math.floor(n / 60);
    return P < 24 ? `${P}h ago` : `${Math.floor(P / 24)}d ago`;
  },
  resolveRetryAfterMs = (r, fallbackMs = 60 * 1000) => {
    const header =
      r?.response?.headers?.["retry-after"] ||
      r?.response?.headers?.["Retry-After"] ||
      null;
    const bodyRetryAfter = Number(
      r?.response?.data?.retryAfter ??
        r?.response?.data?.retry_after ??
        r?.response?.data?.retryAfterMs,
    );
    if (!header && !Number.isFinite(bodyRetryAfter)) return fallbackMs;
    const trimmed = String(header).trim();
    if (!trimmed) {
      if (Number.isFinite(bodyRetryAfter)) {
        return Math.max(1000, bodyRetryAfter > 1000 ? bodyRetryAfter : bodyRetryAfter * 1000);
      }
      return fallbackMs;
    }
    const seconds = Number.parseInt(trimmed, 10);
    if (Number.isFinite(seconds)) {
      return Math.max(1000, seconds * 1000);
    }
    const asDate = Date.parse(trimmed);
    if (Number.isFinite(asDate)) {
      const diff = asDate - Date.now();
      return diff > 0 ? diff : fallbackMs;
    }
    if (Number.isFinite(bodyRetryAfter)) {
      return Math.max(1000, bodyRetryAfter > 1000 ? bodyRetryAfter : bodyRetryAfter * 1000);
    }
    return fallbackMs;
  },
  Be = (r) => {
    const i = Number(r?.status || r?.response?.status || 0),
      g = String(r?.message || "").toLowerCase();
    return i === 401 || i === 403 || g.includes("auth") || g.includes("session")
      ? "Your session expired. Please sign in again to continue."
      : "Recommendations are temporarily unavailable. Please retry.";
  },
  Ee = () => {
    const { t: r } = xe(),
      tr = (key, fallback, options = {}) =>
        r(key, { defaultValue: fallback, ...options }),
      i = ce(),
      g = ge(),
      [n, P] = be(),
      { user: S, loading: re } = _e(),
      {
        activeCategory: categoryModeCategory,
        activeApp,
        categories: categoryModeCategories,
        hasSelection: hasCategoryMode,
      } = useCategoryMode(),
      d = n.get("search") || "",
      categoryIdParam = n.get("category_id") || n.get("categoryId") || "",
      h = n.get("category") || "",
      f = n.get("minPrice") || "",
      v = n.get("maxPrice") || "",
      w = n.get("location") || "",
      startDateParam = n.get("startDate") || "",
      endDateParam = n.get("endDate") || "",
      latestWindowParam = n.get("latestWindow") || "",
      z = Ae(),
      m = Se(S),
      y = J(() => !!(S || (z && m)), [S, z, m]),
      returnTo = `${g.pathname}${g.search}`,
      [b, se] = c({ location: "", minPrice: "", maxPrice: "" }),
      [categories, setCategories] = c([]),
      [C, j] = c([]),
      [ae, T] = c(!0),
      [L, U] = c(""),
      [oe, le] = c(0),
      [x, Y] = c(1),
      [ie, $] = c(!0),
      [D, W] = c(!1),
      [lastUpdatedAt, setLastUpdatedAt] = c(Date.now()),
      [updatedPulse, setUpdatedPulse] = c(!1),
      [expandedPostId, setExpandedPostId] = c(null),
      [likedById, setLikedById] = c({}),
      [likeCounts, setLikeCounts] = c({}),
      [viewCounts, setViewCounts] = c({}),
      [interestPost, setInterestPost] = c(null),
      [isInterestOpen, setIsInterestOpen] = c(!1),
      [menuPostId, setMenuPostId] = c(null),
      [guestInterests, setGuestInterests] = c(() => {
        if (typeof window === "undefined") return [];
        try {
          const stored = window.localStorage.getItem("mhub_guest_interests");
          const parsed = stored ? JSON.parse(stored) : [];
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      }),
      [savedPosts, setSavedPosts] = c(() => getSavedPostsMap()),
      [shareDialogOpen, setShareDialogOpen] = c(!1),
      [shareDialogUrl, setShareDialogUrl] = c(""),
      [promotePostId, setPromotePostId] = c(null),
      [promotePostTitle, setPromotePostTitle] = c(""),
      [loginPromptOpen, setLoginPromptOpen] = c(!1),
      [reportNotice] = c(""),
      [carouselIndexByPost, setCarouselIndexByPost] = c({}),
      { density, setDensity } = usePageDensity("mhub_foryou_density"),
      openPromote = A((postId, title) => {
        if (!postId) return;
        setPromotePostId(String(postId));
        setPromotePostTitle(String(title || ""));
      }, []),
      closePromote = A(() => {
        setPromotePostId(null);
        setPromotePostTitle("");
      }, []),
      q = H(0),
      B = H(0),
      recommendationsCooldownRef = H(0),
      recommendationsInFlightRef = H(null),
      reportTimeoutRef = H(null),
      postCardRefs = H({}),
      carouselTrackRefs = H({}),
      viewQueue = H(new Set()),
      viewedSet = H(new Set()),
      viewObserverRef = H(null),
      { addItem: addCartItem, removeItem: removeCartItem, isInCart: isInCartItem } = mt(),
      { translatedPosts: ne, isTranslating: de } = Le(C),
      N = A((t, a) => {
        import.meta.env.DEV && console.log(t, a);
      }, []),
      guestInterestOptions = J(
        () => ["Cars", "Mobiles", "Bikes", "Electronics", "Fashion", "Vehicles"],
        [],
      ),
      toggleGuestInterest = A((t) => {
        setGuestInterests((a) => {
          const next = Array.isArray(a) ? [...a] : [];
          const index = next.indexOf(t);
          if (index >= 0) {
            next.splice(index, 1);
          } else {
            next.push(t);
          }
          try {
            window.localStorage.setItem(
              "mhub_guest_interests",
              JSON.stringify(next),
            );
          } catch {
            // ignore storage failures
          }
          return next;
        });
      }, []),
      nearMeLocation = J(
        () =>
          readUserCity() ||
          localStorage.getItem("city") ||
          b.location ||
          "",
        [b.location],
      ),
      latestWindowValue = J(
        () => normalizeLatestWindow(latestWindowParam),
        [latestWindowParam],
      ),
      _ = J(
        () =>
          !!(
            d ||
            categoryIdParam ||
            h ||
            f ||
            v ||
            w ||
            startDateParam ||
            endDateParam ||
            latestWindowValue
          ),
        [
          categoryIdParam,
          h,
          w,
          v,
          f,
          d,
          startDateParam,
          endDateParam,
          latestWindowValue,
        ],
      ),
      sponsoredPosts = J(
        () =>
          Array.isArray(C)
            ? C.filter((t) => t.isSponsored === !0 || t.is_sponsored === !0).slice(
                0,
                5,
              )
            : [],
        [C],
      ),
      priceFormatter = J(
        () =>
          new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
          }),
        [],
      ),
      formatCurrency = A(
        (t) => {
          const value = parsePrice(t);
          if (!Number.isFinite(value) || value <= 0) return "INR --";
          try {
            return priceFormatter.format(value);
          } catch {
            return `\u20B9${value.toLocaleString("en-IN")}`;
          }
        },
        [priceFormatter],
      ),
      setCarouselTrackRef = A((t, a) => {
        const s = getPostId(t);
        if (!s) return;
        if (!a) {
          delete carouselTrackRefs.current[s];
          return;
        }
        carouselTrackRefs.current[s] = a;
      }, []),
      updateCarouselIndex = A((t, a) => {
        const s = getPostId(t);
        if (!s) return;
        setCarouselIndexByPost((u) => (u[s] === a ? u : { ...u, [s]: a }));
      }, []),
      getCarouselIndex = A(
        (t, a) => {
          const s = getPostId(t);
          if (!s || !a || a <= 0) return 0;
          const u = Number(carouselIndexByPost[s] ?? 0);
          if (!Number.isFinite(u) || u < 0) return 0;
          if (u >= a) return a - 1;
          return u;
        },
        [carouselIndexByPost],
      ),
      scrollCarouselToIndex = A(
        (t, a, s) => {
          const u = getPostId(t);
          if (!u || !s || s <= 0) return;
          const l = carouselTrackRefs.current[u];
          if (!l) return;
          const k = ((a % s) + s) % s;
          l.scrollTo({ left: l.clientWidth * k, behavior: "smooth" });
          updateCarouselIndex(u, k);
        },
        [updateCarouselIndex],
      ),
      moveCarousel = A(
        (t, a, s, u) => {
          if (s <= 1) return;
          u.preventDefault();
          u.stopPropagation();
          const l = getCarouselIndex(t, s);
          scrollCarouselToIndex(t, l + a, s);
        },
        [getCarouselIndex, scrollCarouselToIndex],
      ),
      handleCarouselScroll = A(
        (t, a, s) => {
          if (s <= 1) return;
          const u = a.currentTarget;
          const l = u.clientWidth || 1;
          const k = Math.round(u.scrollLeft / l);
          updateCarouselIndex(t, Math.max(0, Math.min(s - 1, k)));
        },
        [updateCarouselIndex],
      ),
      syncAllCarouselIndexes = A(() => {
        setCarouselIndexByPost((t) => {
          let a = !1;
          const s = { ...t };
          Object.entries(carouselTrackRefs.current).forEach(([u, l]) => {
            if (!l) return;
            const k = l.clientWidth || 1;
            const p = Math.max(0, Math.round(l.scrollLeft / k));
            if (s[u] !== p) {
              s[u] = p;
              a = !0;
            }
          });
          return a ? s : t;
        });
      }, []),
      updateQueryParams = A(
        (t, a = {}) => {
          const s = new URLSearchParams(n);
          const keys = Object.keys(t || {});
          Object.entries(t || {}).forEach(([u, l]) => {
            if (
              l === null ||
              l === undefined ||
              l === "" ||
              (Array.isArray(l) && l.length === 0)
            ) {
              s.delete(u);
              return;
            }
            if (Array.isArray(l)) {
              s.set(u, l.join(","));
              return;
            }
            s.set(u, String(l));
          });
          if (keys.includes("category_id")) {
            s.delete("category");
          }
          if (keys.includes("category")) {
            s.delete("category_id");
          }
          if (keys.includes("subcategory_id")) {
            s.delete("subcategory");
          }
          if (keys.includes("subcategory")) {
            s.delete("subcategory_id");
          }
          P(s, { replace: a.replace ?? !1 });
        },
        [n, P],
      ),
      categoryIdByName = J(() => {
        const map = {};
        (Array.isArray(categories) ? categories : []).forEach((entry) => {
          const nameKey = String(entry?.name || entry?.title || "")
            .trim()
            .toLowerCase();
          if (!nameKey) return;
          map[nameKey] = entry?.category_id || entry?.id || null;
        });
        return map;
      }, [categories]),
      categoryNameById = J(() => {
        const map = {};
        (Array.isArray(categories) ? categories : []).forEach((entry) => {
          const id = entry?.category_id || entry?.id;
          if (id == null) return;
          map[String(id)] = entry?.name || entry?.title || "";
        });
        return map;
      }, [categories]),
      activeCategoryId = J(() => {
        if (categoryIdParam) return String(categoryIdParam);
        const normalized = String(h || "").trim().toLowerCase();
        const resolved = normalized ? categoryIdByName[normalized] : null;
        return resolved ? String(resolved) : "";
      }, [categoryIdParam, h, categoryIdByName]),
      categoryScopeSource = J(
        () =>
          Array.isArray(categoryModeCategories) && categoryModeCategories.length > 0
            ? categoryModeCategories
            : categories,
        [categoryModeCategories, categories],
      ),
      categoryModeCategoryId = J(() => {
        if (!hasCategoryMode || !categoryModeCategory?.name) return "";
        const directId =
          categoryModeCategory?.id || categoryModeCategory?.category_id;
        if (directId != null && directId !== "") {
          return String(directId);
        }
        const normalized = String(categoryModeCategory.name).trim().toLowerCase();
        const match = (Array.isArray(categoryScopeSource)
          ? categoryScopeSource
          : []
        ).find((entry) => {
          const name = String(
            entry?.name || entry?.title || entry?.label || entry?.category_name || "",
          )
            .trim()
            .toLowerCase();
          return name === normalized;
        });
        const resolved = match?.category_id || match?.id;
        return resolved != null && resolved !== "" ? String(resolved) : "";
      }, [
        hasCategoryMode,
        categoryModeCategory?.id,
        categoryModeCategory?.category_id,
        categoryModeCategory?.name,
        categoryScopeSource,
      ]),
      activeCategoryName = J(() => {
        if (activeCategoryId) {
          return (
            categoryNameById[String(activeCategoryId)] ||
            h ||
            String(activeCategoryId)
          );
        }
        if (!h) return "";
        const match = categories.find((t) => {
          const name = String(t.name || t.title || "")
            .trim()
            .toLowerCase();
          return name === String(h).trim().toLowerCase();
        });
        return match?.name || match?.title || h;
      }, [categories, h, activeCategoryId, categoryNameById]),
      effectiveCategoryId = activeCategoryId || categoryModeCategoryId,
      effectiveCategoryName =
        activeCategoryName || (hasCategoryMode ? categoryModeCategory?.name || "" : ""),
      activeAppMatcher = J(
        () => buildActiveAppMatcher(activeApp, categoryScopeSource),
        [activeApp, categoryScopeSource],
      ),
      dealsContextLabel = J(() => {
        if (effectiveCategoryName) {
          return `${tr("deals_in_category", "Deals in")} ${effectiveCategoryName}`;
        }
        return tr("deals_for_you", "Deals for you");
      }, [effectiveCategoryName, tr]),
      me = A(() => {
        const t = new URLSearchParams(n);
        t.delete("search"), P(t, { replace: !0 });
      }, [n, P]),
      E = A(() => {
        const t = new URLSearchParams(n);
        [
          "search",
          "category_id",
          "subcategory_id",
          "category",
          "subcategory",
          "minPrice",
          "maxPrice",
          "location",
          "startDate",
          "endDate",
          "latestWindow",
        ].forEach(
          (a) => {
            t.delete(a);
          },
        ),
          P(t, { replace: !0 });
      }, [n, P]),
      todayValue = J(() => buildTodayValue(), []),
      isUnder1000Filter = f === "" && v === "1000",
      isRange500to2000Filter = f === "500" && v === "2000",
      isRange2000to10000Filter = f === "2000" && v === "10000",
      isAbove10000Filter = f === "10000" && v === "",
      isPostedTodayFilter =
        startDateParam === todayValue && endDateParam === todayValue,
      isLatest10Filter = latestWindowValue === 10,
      isLatest50Filter = latestWindowValue === 50,
      isNearMeFilter = !!(w && nearMeLocation && w === nearMeLocation),
      O = A(() => {
        le((t) => t + 1);
      }, []);
    const filterRecommendationPost = A(
      (post) =>
        matchesCategoryModeItem(post, {
          activeCategory:
            effectiveCategoryId || effectiveCategoryName
              ? {
                  id: effectiveCategoryId || null,
                  name: effectiveCategoryName || categoryModeCategory?.name || "",
                }
              : hasCategoryMode
                ? categoryModeCategory
                : null,
          activeCategoryId: effectiveCategoryId,
          activeAppMatcher,
        }),
      [
        effectiveCategoryId,
        effectiveCategoryName,
        hasCategoryMode,
        categoryModeCategory,
        activeAppMatcher,
      ],
    );
    const markViewed = A((t) => {
        const a = getPostId(t);
        if (!a || viewedSet.current.has(a)) return;
        viewedSet.current.add(a);
        viewQueue.current.add(a);
        setViewCounts((s) => ({ ...s, [a]: (s[a] || 0) + 1 }));
      }, []),
      handleLike = A((t) => {
        const a = getPostId(t);
        if (!a) return;
        setLikedById((s) => {
          const next = !s[a];
          setLikeCounts((u) => ({
            ...u,
            [a]: (u[a] || 0) + (next ? 1 : -1),
          }));
          return { ...s, [a]: next };
        });
        R.post(`/posts/${a}/like`).catch(() => {});
      }, []),
      handleSharePost = A((t) => {
        const a = getPostId(t);
        if (!a) return;
        impactLight();
        const s = `${window.location.origin}/post/${a}`;
        const title = typeof t === "object" ? (t.title || "") : "";
        const price = typeof t === "object" ? (t.price ? `₹${t.price}` : "") : "";
        sharePost({ postId: String(a), title: title || "Check out this listing", price }).then((result) => {
          if (!result) {
            setShareDialogUrl(s);
            setShareDialogOpen(!0);
          }
        }).catch(() => {
          setShareDialogUrl(s);
          setShareDialogOpen(!0);
        });
        R.post(`/posts/${a}/share`).catch(() => {});
      }, []),
      toggleSave = A(
        async (t) => {
          const a = getPostId(t);
          if (!a) return;
          if (!y) {
            setLoginPromptOpen(!0);
            return;
          }
          const s = !!savedPosts[a],
            u = !s;
          setSavedPosts((l) => ({ ...l, [a]: u }));
          setSavedPostStatus(a, u);
          try {
            u ? await R.post("/wishlist", { postId: a }) : await R.delete(`/wishlist/${a}`);
          } catch {
            setSavedPosts((l) => ({ ...l, [a]: s }));
            setSavedPostStatus(a, s);
          }
        },
        [savedPosts, y],
      ),
      handleCartToggle = A(
        (t) => {
          const a = getPostId(t?.post_id || t?.id);
          if (!a) return;
          if (!y) {
            setLoginPromptOpen(!0);
            return;
          }
          if (isInCartItem(a)) {
            removeCartItem(a);
          } else {
            addCartItem({
              id: a,
              title: t?.title || tr("title", "Item"),
              price: t?.price || 0,
              image: getPrimaryImage(t),
              seller: t?.user?.name || t?.user_name || t?.username || "Unknown",
              location: t?.location || t?.city || t?.area || "",
              category_id:
                t?.category_id ||
                t?.categoryId ||
                t?.category?.category_id ||
                t?.category?.id ||
                "",
              category_name:
                t?.category_name ||
                t?.categoryName ||
                t?.category_title ||
                t?.categoryTitle ||
                (typeof t?.category === "object"
                  ? t?.category?.name || t?.category?.title || t?.category?.label
                  : t?.category) ||
                "",
              category_group:
                t?.category_group ||
                t?.categoryGroup ||
                t?.category?.category_group ||
                t?.category?.categoryGroup ||
                activeApp ||
                "",
            });
          }
        },
        [y, addCartItem, removeCartItem, isInCartItem, tr, activeApp],
      ),
      handleViewDetails = A(
        (t) => {
          const a = getPostId(t?.post_id || t?.id || t);
          if (!a) return;
          if (!y) {
            setLoginPromptOpen(!0);
            return;
          }
          markViewed(a);
          m &&
            R.post("/recently-viewed/track", {
              postId: a,
              userId: m,
              source: "for-you",
            }).catch(() => {});
          const s = C.find((u) => getPostId(u) === a);
          s
            ? i(`/post/${a}`, {
                state: { post: s, source: "for-you", returnTo },
              })
            : i(`/post/${a}`, {
                state: { source: "for-you", returnTo },
              });
        },
        [y, m, C, i, markViewed],
      ),
      handleViewMore = A(
        (t) => {
          const a = getPostId(t);
          if (!a) return;
          setExpandedPostId((s) => (s === a ? null : a));
        },
        [],
      ),
      handleReportPost = A(
        (t) => {
          const a = getPostId(t);
          if (!a) return;
          i(`/complaints?postId=${encodeURIComponent(a)}`);
        },
        [tr, i],
      );
    I(() => {
      if (!y || !m) return;
      let t = !1;
      const a = async () => {
        const s = ++q.current;
        try {
          const u = await fetchUserPreferencesCached({ userId: m });
          if (t || s !== q.current) return;
          if (u) {
            se({
              location: u.location || "",
              minPrice: u.minPrice || "",
              maxPrice: u.maxPrice || "",
            });
            N("[ForYou] Loaded preferences:", u);
          }
        } catch (u) {
          N("[ForYou] No preferences found:", u?.message || u);
        }
      };
      a();
      return () => {
        t = !0;
      };
    }, [N, y, g.key, m]),
      I(() => {
        if (!lastUpdatedAt) return;
        setUpdatedPulse(!0);
      }, [lastUpdatedAt]),
      I(() => {
        if (!updatedPulse) return;
        const t = setTimeout(() => setUpdatedPulse(!1), 900);
        return () => clearTimeout(t);
      }, [updatedPulse]),
      I(() => {
        let t = null;
        const a = () => {
          t && cancelAnimationFrame(t);
          t = requestAnimationFrame(() => syncAllCarouselIndexes());
        };
        window.addEventListener("resize", a);
        return () => {
          window.removeEventListener("resize", a);
          t && cancelAnimationFrame(t);
        };
      }, [syncAllCarouselIndexes]),
      I(() => {
        syncAllCarouselIndexes();
      }, [C.length, syncAllCarouselIndexes]),
      I(() => {
        let t = !1;
        (async () => {
          try {
            const a = await fetchCategoriesCached({ includeSubcategories: false });
            t || setCategories(Array.isArray(a) ? a : []);
          } catch {
            t || setCategories([]);
          }
        })();
        return () => {
          t = !0;
        };
      }, []),
      I(() => subscribeSavedPosts(setSavedPosts), []),
      I(() => () => {
        reportTimeoutRef.current &&
          clearTimeout(reportTimeoutRef.current);
      }, []),
      I(() => {
        if (!menuPostId) return;
        const t = (s) => {
          const a =
            typeof s.composedPath === "function" ? s.composedPath() : [];
          const u = (a || []).some(
            (l) =>
              l?.dataset?.forYouMenuPanel || l?.dataset?.forYouMenuTrigger,
          );
          if (u) return;
          const target = s.target;
          if (target && typeof target.closest === "function") {
            const within = target.closest(
              "[data-for-you-menu-panel], [data-for-you-menu-trigger]",
            );
            if (within) return;
          }
          setMenuPostId(null);
        };
        const a = (s) => {
          s.key === "Escape" && setMenuPostId(null);
        };
        document.addEventListener("click", t);
        document.addEventListener("keydown", a);
        return () => {
          document.removeEventListener("click", t);
          document.removeEventListener("keydown", a);
        };
      }, [menuPostId]),
      I(() => {
        if (!y) return;
        let t = !1;
        (async () => {
          try {
            const s = await fetchWishlistIds(() =>
              m ? R.get("/wishlist", { params: { userId: m } }) : R.get("/wishlist"),
            );
            if (t) return;
            setSavedPosts(buildSavedPostsMap(s));
          } catch {
            // keep last known saved state
          }
        })();
        return () => {
          t = !0;
        };
      }, [y, m]),
      I(() => {
        const t = async () => {
          if (viewQueue.current.size === 0) return;
          const a = Array.from(viewQueue.current);
          viewQueue.current.clear();
          try {
            await R.post("/posts/batch-view", { postIds: a });
          } catch {}
        };
        const s = setInterval(t, 5e3);
        return () => {
          clearInterval(s);
          t();
        };
      }, []),
      I(() => {
        if (!Array.isArray(C) || C.length === 0) return;
        viewObserverRef.current && viewObserverRef.current.disconnect();
        viewObserverRef.current = new IntersectionObserver(
          (t) => {
            t.forEach((a) => {
              if (a.isIntersecting) {
                const s = getPostId(a.target.dataset.postId);
                markViewed(s);
              }
            });
          },
          { threshold: 0.5 },
        );
        Object.values(postCardRefs.current).forEach((t) => {
          t && viewObserverRef.current.observe(t);
        });
        return () => {
          viewObserverRef.current && viewObserverRef.current.disconnect();
        };
      }, [C, markViewed]),
      I(() => {
        Y(1), $(!0);
      }, [
        b,
        d,
        categoryIdParam,
        h,
        categoryModeCategoryId,
        f,
        v,
        w,
        startDateParam,
        endDateParam,
        latestWindowValue,
        activeAppMatcher?.activeApp,
      ]),
      I(() => {
        if (!y || !m) return;
        const now = Date.now();
        if (recommendationsCooldownRef.current > now) {
          return;
        }
        if (recommendationsInFlightRef.current) {
          return;
        }
        const request = (async () => {
          const a = ++B.current;
          x === 1 ? T(!0) : W(!0);
          try {
            const s = {
              location: w || b.location,
              minPrice: f || b.minPrice,
              maxPrice: v || b.maxPrice,
              ...(effectiveCategoryId
                ? { category_id: effectiveCategoryId }
                : h
                  ? { category: h }
                  : activeAppMatcher?.activeApp
                    ? { category_group: activeAppMatcher.activeApp }
                    : {}),
              search: d,
              startDate: startDateParam,
              endDate: endDateParam,
              latestWindow: latestWindowValue || "",
              userId: m,
              page: x,
              limit: latestWindowValue || te,
            };
            Object.keys(s).forEach((p) => {
              (!s[p] || (Array.isArray(s[p]) && s[p].length === 0)) &&
                delete s[p];
            }),
              N("[ForYou] Fetching with params:", s);
            let u = null;
            let usedFallback = !1;
            try {
              u = await R.get("/recommendations", { params: s });
            } catch (err) {
              const status = err?.status ?? err?.response?.status ?? 0;
              if (status === 404 || status === 405) {
                usedFallback = !0;
                u = await R.get("/posts/for-you", { params: s });
              } else {
                throw err;
              }
            }
            if (a !== B.current) return;
            let l = u?.data ?? u;
            let rawPosts = Array.isArray(l?.posts)
              ? l.posts
              : Array.isArray(l)
                ? l
                : [];
            if (!rawPosts.length && !usedFallback) {
              try {
                const fallbackResponse = await R.get("/posts/for-you", { params: s });
                l = fallbackResponse?.data ?? fallbackResponse;
                rawPosts = Array.isArray(l?.posts)
                  ? l.posts
                  : Array.isArray(l)
                    ? l
                    : [];
                usedFallback = !0;
              } catch {
                // ignore fallback failures and keep empty
              }
            }
            const k = rawPosts.filter(filterRecommendationPost);
            const likesSeed = {};
            const viewsSeed = {};
            k.forEach((p) => {
              const id = getPostId(p);
              if (!id) return;
              likesSeed[id] = p.likes || 0;
              viewsSeed[id] = p.views_count || p.views || 0;
            });
            setLikeCounts((p) => ({ ...p, ...likesSeed }));
            setViewCounts((p) => ({ ...p, ...viewsSeed }));
            j(
              x === 1
                ? k
                : (p) => {
                    const ue = [...p, ...k],
                      V = new Set();
                    return ue.filter((Z) => {
                      const M = String(Z.post_id || Z.id || "");
                    return !M || V.has(M) ? !1 : (V.add(M), !0);
                    });
                },
            ),
              $(latestWindowValue ? !1 : k.length === te),
              U(""),
              setLastUpdatedAt(Date.now());
          } catch (s) {
            const status = s?.status ?? s?.response?.status ?? null;
            if (status === 429) {
              const retryAfterMs = resolveRetryAfterMs(s);
              recommendationsCooldownRef.current = Date.now() + retryAfterMs;
            }
            U(
              x === 1
                ? Be(s)
                : "Could not load more recommendations. Please retry.",
            ),
              x === 1 && j([]);
          } finally {
            a === B.current && (T(!1), W(!1));
          }
        })().finally(() => {
          if (recommendationsInFlightRef.current === request) {
            recommendationsInFlightRef.current = null;
          }
        });
        recommendationsInFlightRef.current = request;
      }, [
        N,
        y,
        x,
        b,
        oe,
        activeCategoryId,
        effectiveCategoryId,
        h,
        activeAppMatcher,
        w,
        v,
        f,
        d,
        m,
        startDateParam,
        endDateParam,
        latestWindowValue,
        filterRecommendationPost,
      ]);
    const formatPrice = (t) => {
      const a = parsePrice(t);
      if (!Number.isFinite(a) || a <= 0) return "INR --";
      try {
        return priceFormatter.format(a);
      } catch {
        return `\u20B9${a.toLocaleString("en-IN")}`;
      }
    };
    return !re && !y
      ? e.createElement(
          "div",
          {
              className:
                `min-h-screen mhub-premium-page overflow-x-hidden bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 flex items-start justify-center p-4 pt-10 pb-24 relative dark:bg-gradient-to-br ${density === "compact" ? "mhub-compact" : ""}`,
          },
          e.createElement(
            "div",
            { className: "absolute inset-0 overflow-hidden" },
            e.createElement("div", {
              className:
                "absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse dark:bg-purple-800/30",
            }),
            e.createElement("div", {
              className:
                "absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000 dark:bg-blue-800/30",
            }),
          ),
          e.createElement(
            "div",
            {
              className:
                "absolute inset-0 flex items-center justify-center pointer-events-none",
            },
            e.createElement(
              "div",
              {
                className:
                  "w-full max-w-2xl grid gap-4 opacity-40 blur-[1px] px-4",
              },
              e.createElement("div", {
                className:
                  "h-28 rounded-2xl bg-white/80 dark:bg-slate-800/60 border border-white/70 dark:border-white/10 shadow-sm dark:bg-slate-900/80 dark:border dark:border-white/70",
              }),
              e.createElement("div", {
                className:
                  "h-28 rounded-2xl bg-white/70 dark:bg-slate-800/50 border border-white/60 dark:border-white/10 shadow-sm dark:bg-slate-900/70 dark:border dark:border-white/60",
              }),
              e.createElement("div", {
                className:
                  "h-28 rounded-2xl bg-white/60 dark:bg-slate-800/40 border border-white/50 dark:border-white/10 shadow-sm dark:bg-slate-900/60 dark:border dark:border-white/50",
              }),
            ),
          ),
          e.createElement(
            "div",
            { className: "relative z-10 max-w-md w-full page-shell page-pad" },
            e.createElement(
              "div",
              {
                className:
                  "mhub-premium-surface rounded-3xl p-8",
              },
              e.createElement(
                "div",
                { className: "flex justify-center mb-6" },
                e.createElement(
                  "div",
                  { className: "relative" },
                  e.createElement(
                    "div",
                    {
                      className:
                        "w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl dark:bg-gradient-to-br",
                    },
                    e.createElement(pe, { className: "w-10 h-10 text-white dark:text-white" }),
                  ),
                  e.createElement(
                    "div",
                    {
                      className:
                        "absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg animate-bounce dark:bg-gradient-to-br",
                    },
                    e.createElement(K, { className: "w-4 h-4 text-white dark:text-white" }),
                  ),
                ),
              ),
              e.createElement(
                "h1",
                {
                  className:
                    "text-3xl font-bold text-gray-900 dark:text-white text-center mb-3 dark:text-gray-100 dark:text-center",
                },
                r("access_restricted") || "Access Restricted",
              ),
              e.createElement(
                "p",
                {
                  className:
                    "text-gray-600 dark:text-gray-300 text-center mb-8 dark:text-gray-200 dark:text-center",
                },
                "Sign in to view personalized recommendations curated just for you",
              ),
              e.createElement(
                "div",
                { className: "space-y-3 mb-8" },
                [
                  { icon: he, text: "Personalized product picks" },
                  { icon: fe, text: "Based on your preferences" },
                  { icon: ve, text: "Real-time updates" },
                ].map((t, a) =>
                  e.createElement(
                    "div",
                    {
                      key: a,
                      className:
                        "flex items-center gap-3 text-gray-600 dark:text-gray-300 dark:text-gray-200",
                    },
                    e.createElement(
                      "div",
                      {
                        className:
                          "w-8 h-8 rounded-lg bg-blue-50 dark:bg-white/10 flex items-center justify-center dark:bg-blue-950/20",
                      },
                      e.createElement(t.icon, {
                        className: "w-4 h-4 text-blue-600 dark:text-purple-400 dark:text-blue-300",
                      }),
                    ),
                    e.createElement("span", { className: "text-sm" }, t.text),
                  ),
                ),
              ),
              e.createElement(
                "p",
                {
                  className:
                    "text-xs text-gray-500 dark:text-gray-400 text-center mb-4 dark:text-gray-300 dark:text-center",
                },
                r("filters_unlock_after_signin", "Filters unlock after sign-in."),
              ),
              e.createElement(
                "div",
                {
                  className:
                    "flex flex-wrap items-center justify-center gap-2 mb-6",
                },
                guestInterestOptions.map((t) =>
                  e.createElement(
                    "button",
                    {
                      key: t,
                      type: "button",
                      onClick: () => toggleGuestInterest(t),
                      className: `inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition dark:border ${
                        guestInterests.includes(t)
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                      }`,
                      "aria-pressed": guestInterests.includes(t) ? "true" : "false",
                    },
                    t,
                  ),
                ),
              ),
              e.createElement(
                o,
                {
                  onClick: () =>
                    i("/login", {
                      state: { returnTo: `${g.pathname}${g.search}` },
                    }),
                  className:
                    "w-full h-14 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white font-semibold text-lg rounded-xl shadow-lg shadow-blue-500/30 transition-all hover:scale-105 dark:bg-gradient-to-r dark:text-white",
                },
                e.createElement(we, { className: "w-5 h-5 mr-2" }),
                r("sign_in_to_continue") || "Sign In to Continue",
              ),
              e.createElement(
                o,
                {
                  onClick: () => i("/all-posts"),
                  className:
                    "w-full h-12 mt-3 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold rounded-xl transition-colors dark:border dark:hover:bg-slate-950",
                  variant: "outline",
                },
                r("browse_all_posts", "Browse All Posts"),
              ),
              e.createElement(
                "p",
                {
                  className:
                    "text-gray-500 dark:text-gray-400 text-center mt-6 text-sm dark:text-gray-300 dark:text-center",
                },
                "Don't have an account?",
                " ",
                e.createElement(
                  "span",
                  {
                    onClick: () => i("/signup"),
                    className:
                      "text-blue-600 dark:text-purple-300 hover:text-blue-700 dark:hover:text-purple-200 cursor-pointer font-medium dark:text-blue-300 dark:hover:text-blue-300",
                  },
                  r("create_one_now") || "Create one now",
                ),
              ),
            ),
          ),
        )
      : e.createElement(
          e.Fragment,
          null,
          e.createElement(
            "div",
            {
              className:
                `min-h-screen mhub-premium-page overflow-x-hidden bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 dark:from-slate-950 dark:via-slate-900/60 dark:to-slate-950 dark:bg-gradient-to-br ${density === "compact" ? "mhub-compact" : ""}`,
            },
          e.createElement(
            "div",
            {
              className:
                "w-full sticky z-30 mhub-premium-bar",
              style: { top: "calc(var(--top-nav-height, 56px) + 0.75rem)" },
            },
            e.createElement(
              "div",
              { className: "w-full flex justify-center px-3 pb-1.5 pt-1.5" },
              e.createElement(
                "div",
                {
                  className:
                    "w-full max-w-[92rem] mhub-premium-surface rounded-2xl p-2.5",
                },
                e.createElement(
                  "div",
                  {
                    className:
                      "flex items-center justify-between mb-2 flex-wrap gap-2",
                  },
                  e.createElement(
                    "h3",
                    {
                      className:
                        "text-base md:text-lg font-bold text-gray-900 dark:text-white dark:text-gray-100",
                    },
                    tr("quick_filters", "Quick filters"),
                  ),
                  e.createElement(PageDensityToggle, {
                    value: density,
                    onChange: setDensity,
                    label: tr("view", "View"),
                  }),
                ),
                e.createElement(
                  "div",
                  {
                    className:
                      "for-you-quick-filters-row flex flex-wrap gap-2 pb-1",
                  },
                  e.createElement(
                    "button",
                    {
                      type: "button",
                      "data-active": isUnder1000Filter ? "true" : "false",
                      className: `inline-flex h-9 shrink-0 items-center justify-center rounded-full border px-4 text-sm font-semibold transition-colors whitespace-nowrap dark:border ${
                        isUnder1000Filter
                          ? "!border-blue-600 !bg-blue-600 !text-white shadow-sm hover:!border-blue-600 hover:!bg-blue-600 hover:!text-white"
                          : "border-slate-200 bg-slate-50 !text-slate-700 hover:border-slate-300 hover:bg-slate-100 hover:!text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:!text-slate-300 dark:hover:border-slate-500 dark:hover:bg-slate-700"
                      }`,
                      onClick: () =>
                        updateQueryParams(
                          isUnder1000Filter
                            ? { minPrice: "", maxPrice: "" }
                            : { minPrice: "", maxPrice: "1000" },
                        ),
                    },
                    tr("under_1000", "Under 1000"),
                  ),
                  e.createElement(
                    "button",
                    {
                      type: "button",
                      "data-active": isRange500to2000Filter ? "true" : "false",
                      className: `inline-flex h-9 shrink-0 items-center justify-center rounded-full border px-4 text-sm font-semibold transition-colors whitespace-nowrap dark:border ${
                        isRange500to2000Filter
                          ? "!border-blue-600 !bg-blue-600 !text-white shadow-sm hover:!border-blue-600 hover:!bg-blue-600 hover:!text-white"
                          : "border-slate-200 bg-slate-50 !text-slate-700 hover:border-slate-300 hover:bg-slate-100 hover:!text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:!text-slate-300 dark:hover:border-slate-500 dark:hover:bg-slate-700"
                      }`,
                      onClick: () =>
                        updateQueryParams(
                          isRange500to2000Filter
                            ? { minPrice: "", maxPrice: "" }
                            : { minPrice: "500", maxPrice: "2000" },
                        ),
                    },
                    tr("500_to_2k", "₹500-₹2K"),
                  ),
                  e.createElement(
                    "button",
                    {
                      type: "button",
                      "data-active": isRange2000to10000Filter ? "true" : "false",
                      className: `inline-flex h-9 shrink-0 items-center justify-center rounded-full border px-4 text-sm font-semibold transition-colors whitespace-nowrap dark:border ${
                        isRange2000to10000Filter
                          ? "!border-blue-600 !bg-blue-600 !text-white shadow-sm hover:!border-blue-600 hover:!bg-blue-600 hover:!text-white"
                          : "border-slate-200 bg-slate-50 !text-slate-700 hover:border-slate-300 hover:bg-slate-100 hover:!text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:!text-slate-300 dark:hover:border-slate-500 dark:hover:bg-slate-700"
                      }`,
                      onClick: () =>
                        updateQueryParams(
                          isRange2000to10000Filter
                            ? { minPrice: "", maxPrice: "" }
                            : { minPrice: "2000", maxPrice: "10000" },
                        ),
                    },
                    tr("2k_to_10k", "₹2K-₹10K"),
                  ),
                  e.createElement(
                    "button",
                    {
                      type: "button",
                      "data-active": isAbove10000Filter ? "true" : "false",
                      className: `inline-flex h-9 shrink-0 items-center justify-center rounded-full border px-4 text-sm font-semibold transition-colors whitespace-nowrap dark:border ${
                        isAbove10000Filter
                          ? "!border-blue-600 !bg-blue-600 !text-white shadow-sm hover:!border-blue-600 hover:!bg-blue-600 hover:!text-white"
                          : "border-slate-200 bg-slate-50 !text-slate-700 hover:border-slate-300 hover:bg-slate-100 hover:!text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:!text-slate-300 dark:hover:border-slate-500 dark:hover:bg-slate-700"
                      }`,
                      onClick: () =>
                        updateQueryParams(
                          isAbove10000Filter
                            ? { minPrice: "", maxPrice: "" }
                            : { minPrice: "10000", maxPrice: "" },
                        ),
                    },
                    tr("above_10k", "Above ₹10K"),
                  ),
                  e.createElement(
                    "button",
                    {
                      type: "button",
                      "data-active": isPostedTodayFilter ? "true" : "false",
                      className: `inline-flex h-9 shrink-0 items-center justify-center rounded-full border px-4 text-sm font-semibold transition-colors whitespace-nowrap dark:border ${
                        isPostedTodayFilter
                          ? "!border-blue-600 !bg-blue-600 !text-white shadow-sm hover:!border-blue-600 hover:!bg-blue-600 hover:!text-white"
                          : "border-slate-200 bg-slate-50 !text-slate-700 hover:border-slate-300 hover:bg-slate-100 hover:!text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:!text-slate-300 dark:hover:border-slate-500 dark:hover:bg-slate-700"
                      }`,
                      onClick: () =>
                        updateQueryParams(
                          isPostedTodayFilter
                            ? { startDate: "", endDate: "" }
                            : {
                                startDate: todayValue,
                                endDate: todayValue,
                                latestWindow: "",
                              },
                        ),
                    },
                    tr("posted_today", "Posted Today"),
                  ),
                  e.createElement(
                    "button",
                    {
                      type: "button",
                      "data-active": isLatest10Filter ? "true" : "false",
                      className: `inline-flex h-9 shrink-0 items-center justify-center rounded-full border px-4 text-sm font-semibold transition-colors whitespace-nowrap dark:border ${
                        isLatest10Filter
                          ? "!border-blue-600 !bg-blue-600 !text-white shadow-sm hover:!border-blue-600 hover:!bg-blue-600 hover:!text-white"
                          : "border-slate-200 bg-slate-50 !text-slate-700 hover:border-slate-300 hover:bg-slate-100 hover:!text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:!text-slate-300 dark:hover:border-slate-500 dark:hover:bg-slate-700"
                      }`,
                      onClick: () =>
                        updateQueryParams(
                          isLatest10Filter
                            ? { latestWindow: "" }
                            : { latestWindow: "10", startDate: "", endDate: "" },
                        ),
                    },
                    tr("latest_10", "Latest 10"),
                  ),
                  e.createElement(
                    "button",
                    {
                      type: "button",
                      "data-active": isLatest50Filter ? "true" : "false",
                      className: `inline-flex h-9 shrink-0 items-center justify-center rounded-full border px-4 text-sm font-semibold transition-colors whitespace-nowrap dark:border ${
                        isLatest50Filter
                          ? "!border-blue-600 !bg-blue-600 !text-white shadow-sm hover:!border-blue-600 hover:!bg-blue-600 hover:!text-white"
                          : "border-slate-200 bg-slate-50 !text-slate-700 hover:border-slate-300 hover:bg-slate-100 hover:!text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:!text-slate-300 dark:hover:border-slate-500 dark:hover:bg-slate-700"
                      }`,
                      onClick: () =>
                        updateQueryParams(
                          isLatest50Filter
                            ? { latestWindow: "" }
                            : { latestWindow: "50", startDate: "", endDate: "" },
                        ),
                    },
                    tr("latest_50", "Latest 50"),
                  ),
                  e.createElement(
                    "button",
                    {
                      type: "button",
                      "data-active": isNearMeFilter ? "true" : "false",
                      disabled: !nearMeLocation,
                      className: `inline-flex h-9 shrink-0 items-center justify-center rounded-full border px-4 text-sm font-semibold transition-colors whitespace-nowrap dark:border ${
                        isNearMeFilter
                          ? "!border-blue-600 !bg-blue-600 !text-white shadow-sm hover:!border-blue-600 hover:!bg-blue-600 hover:!text-white"
                          : "border-slate-200 bg-slate-50 !text-slate-700 hover:border-slate-300 hover:bg-slate-100 hover:!text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:!text-slate-300 dark:hover:border-slate-500 dark:hover:bg-slate-700"
                      } ${nearMeLocation ? "" : "cursor-not-allowed opacity-60"}`,
                      onClick: () =>
                        updateQueryParams(
                          isNearMeFilter
                            ? { location: "" }
                            : { location: nearMeLocation },
                        ),
                    },
                    tr("near_me", "Near me"),
                  ),
                  e.createElement(
                    "button",
                    {
                      type: "button",
                      disabled: !_,
                      className: `inline-flex h-9 shrink-0 items-center justify-center rounded-full border px-4 text-sm font-semibold transition-colors whitespace-nowrap dark:border ${
                        _
                          ? "border-slate-200 bg-white !text-slate-700 hover:border-slate-300 hover:bg-slate-50 hover:!text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:!text-slate-300 dark:hover:border-slate-500 dark:hover:bg-slate-700"
                          : "cursor-not-allowed border-slate-200 bg-slate-100 !text-slate-400 dark:border-slate-600 dark:bg-slate-800/50 dark:!text-slate-500"
                      }`,
                      onClick: E,
                    },
                    tr("clear_filters", "Clear Filters"),
                  ),
                ),
              ),
            ),
            e.createElement(
              "div",
              { "data-density": "extra" },
              e.createElement(
                AllPostsGreatDealsBanner,
                {
                  title: tr("great_deals", "Great Deals"),
                  subtitle: tr("up_to_off", "Up to 50% off"),
                  contextLabel: dealsContextLabel,
                  collapsed: !1,
                  allowCollapse: !1,
                  onShopNow: () => {
                    const t = document.getElementById("for-you-feed");
                    t?.scrollIntoView({ behavior: "smooth", block: "start" });
                  },
                  maxWidthClass: "max-w-[92rem]",
                  t: tr,
                  compact: true,
                  outerPaddingClass: "px-3",
                  sticky: false,
                },
              ),
            ),
          ),
          reportNotice
            ? e.createElement(
                "div",
                { className: "w-full flex justify-center px-3 pb-2" },
                e.createElement(
                  "div",
                  {
                    className:
                      "w-full max-w-[92rem] rounded-xl border border-amber-200/70 bg-amber-50 text-amber-800 px-3 py-2 text-[11px] font-semibold dark:border-amber-900/40 dark:bg-amber-900/30 dark:text-amber-200 dark:border dark:border-amber-600/70 dark:bg-amber-950/20",
                  },
                  reportNotice,
                ),
              )
            : null,
          sponsoredPosts.length > 0 &&
            e.createElement(
              "div",
              { className: "w-full flex flex-col items-center mb-3" },
              e.createElement(
                "h2",
                {
                  className:
                    "text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-3 md:mb-4 w-full max-w-[92rem] px-3 md:px-0 dark:text-gray-100",
                },
                tr("sponsored_deals", "Sponsored deals"),
              ),
              e.createElement(
                "div",
                {
                  className:
                    "flex gap-3 md:gap-4 w-full max-w-[92rem] overflow-x-auto scrollbar-hide px-3 md:px-0 snap-x snap-mandatory",
                },
                sponsoredPosts.map((t, a) => {
                  const imageList = collectPostImageUrls(t);
                  const s = imageList[0] || PLACEHOLDER_IMAGE;
                  return e.createElement(
                    ee,
                    {
                      key: t.post_id || t.id || a,
                      className:
                        "rounded-xl shadow mhub-premium-surface border border-blue-100 dark:border-gray-700 flex flex-col items-center p-3 md:p-4 min-w-[160px] max-w-[180px] md:min-w-[220px] md:max-w-[240px] hover:scale-[1.02] transition-transform duration-200 snap-start cursor-pointer dark:border dark:border-blue-600/40",
                      onClick: () => i(`/post/${t.post_id || t.id}`),
                    },
                    e.createElement("img", {
                      src: s,
                      alt: t.title || "Post",
                      className:
                        "mhub-media-frame mhub-media-img w-20 h-20 md:w-24 md:h-24 object-cover rounded mb-2 bg-gray-100 dark:bg-gray-700 dark:bg-gray-950",
                      onLoad: (u) => {
                        u.currentTarget.dataset.loaded = "true";
                      },
                      onError: (u) => {
                        u.currentTarget.src = "/placeholder.svg";
                        u.currentTarget.dataset.loaded = "true";
                      },
                    }),
                    e.createElement(
                      "div",
                      {
                        className:
                          "font-semibold text-gray-800 dark:text-white text-xs md:text-base text-center mb-1 line-clamp-2 dark:text-gray-100 dark:text-center",
                      },
                      t.title,
                    ),
                    e.createElement(
                      "div",
                      {
                        className:
                          "text-blue-900 dark:text-blue-300 text-base md:text-lg font-bold mb-1 dark:text-blue-200",
                      },
                      formatPrice(resolvePostPriceValue(t)),
                    ),
                    e.createElement(
                      o,
                      {
                        className:
                          "bg-blue-600 text-white w-full mt-1 md:mt-2 text-xs md:text-sm py-1 md:py-2 dark:bg-blue-700/40 dark:text-white",
                        onClick: (u) => {
                          u.stopPropagation();
                          i(`/post/${t.post_id || t.id}`);
                        },
                      },
                      tr("view", "View"),
                    ),
                  );
                }),
              ),
            ),
            d
              ? e.createElement(
                  "div",
                  { className: "mb-4 flex items-center gap-2 flex-wrap" },
                  e.createElement(
                    "span",
                    { className: "text-sm text-gray-600 dark:text-gray-400 dark:text-gray-200" },
                    r("search_results_for") || "Search results for",
                    ":",
                  ),
                  e.createElement(
                    "span",
                    {
                      className:
                        "inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium dark:bg-blue-950/20",
                    },
                    '"',
                    d,
                    '"',
                    e.createElement(
                      "button",
                      {
                        onClick: me,
                        className:
                          "p-0.5 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full transition dark:hover:bg-blue-900/20",
                        "aria-label": "Clear search",
                      },
                      e.createElement(
                        "svg",
                        {
                          className: "w-4 h-4",
                          fill: "none",
                          viewBox: "0 0 24 24",
                          stroke: "currentColor",
                        },
                        e.createElement("path", {
                          strokeLinecap: "round",
                          strokeLinejoin: "round",
                          strokeWidth: 2,
                          d: "M6 18L18 6M6 6l12 12",
                        }),
                      ),
                    ),
                  ),
                )
              : null,
            e.createElement(AllPostsFeedHeader, {
              title: d
                ? r("search_results") || "Search Results"
                : "",
              liveLabel: r("live") || "Live",
              showLiveStatus: !1,
              updatedLabel: r("updated") || "Updated",
              updatedAt: lastUpdatedAt,
              formatUpdatedAt: (t) => formatRelativeTime(t),
              updatedPulse,
              showUpdatedStatus: !1,
              refreshLabel: r("refresh") || "Refresh",
              onRefresh: O,
              isRefreshing: ae || D,
              disabled: ae || D,
              maxWidthClass: "max-w-[92rem]",
              titleId: "for-you-feed",
              compact: true,
            }),
            de
              ? e.createElement(
                  "p",
                  {
                    className: "mb-4 text-sm text-blue-700 dark:text-blue-300",
                  },
                  "Updating post language...",
                )
              : null,
            L && C.length > 0
              ? e.createElement(
                  ke,
                  { variant: "destructive", className: "mb-5" },
                  e.createElement(Q, { className: "h-4 w-4" }),
                  e.createElement(Ce, null, "Latest refresh failed"),
                  e.createElement(Pe, null, L),
                  e.createElement(
                    "div",
                    { className: "mt-3 flex flex-wrap gap-2" },
                    e.createElement(
                      o,
                      { size: "sm", onClick: O },
                      e.createElement(X, { className: "w-4 h-4 mr-2" }),
                      "Retry",
                    ),
                    _
                      ? e.createElement(
                          o,
                          { size: "sm", variant: "outline", onClick: E },
                          e.createElement(F, { className: "w-4 h-4 mr-2" }),
                          "Reset Filters",
                        )
                      : null,
                  ),
                )
              : null,
            ae
              ? e.createElement(
                  "div",
                  { className: "flex flex-col gap-6 w-full max-w-[92rem] mx-auto page-shell page-pad" },
                  [1, 2, 3].map((t) =>
                    e.createElement(
                      "div",
                      {
                        key: t,
                        className:
                          "mhub-premium-surface rounded-2xl p-4 h-96 animate-pulse",
                      },
                      e.createElement("div", {
                        className:
                          "h-12 w-full bg-gray-200 dark:bg-gray-700 rounded-lg mb-4 dark:bg-gray-900",
                      }),
                      e.createElement("div", {
                        className:
                          "h-64 bg-gray-200 dark:bg-gray-700 rounded-lg mb-4 dark:bg-gray-900",
                      }),
                      e.createElement("div", {
                        className:
                          "h-10 w-full bg-gray-200 dark:bg-gray-700 rounded-lg dark:bg-gray-900",
                      }),
                    ),
                  ),
                )
              : L && C.length === 0
                ? e.createElement(
                    ee,
                    {
                      className:
                        "max-w-2xl mx-auto p-6 text-center border-red-200 page-shell page-pad dark:text-center dark:border-red-600/40",
                    },
                    e.createElement(
                      "div",
                      {
                        className:
                          "w-12 h-12 mx-auto rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-3 dark:bg-red-950/20 dark:text-red-300",
                      },
                      e.createElement(Q, { className: "w-6 h-6" }),
                    ),
                    e.createElement(
                      "h4",
                      {
                        className:
                          "text-lg font-semibold text-gray-900 dark:text-white mb-2 dark:text-gray-100",
                      },
                      "Could not load recommendations",
                    ),
                    e.createElement(
                      "p",
                      {
                        className:
                          "text-sm text-gray-600 dark:text-gray-300 mb-5 dark:text-gray-200",
                      },
                      L,
                    ),
                    e.createElement(
                      "div",
                      { className: "flex flex-wrap justify-center gap-2" },
                      e.createElement(
                        o,
                        { onClick: O },
                        e.createElement(X, { className: "w-4 h-4 mr-2" }),
                        "Retry",
                      ),
                      _
                        ? e.createElement(
                            o,
                            { variant: "outline", onClick: E },
                            e.createElement(F, { className: "w-4 h-4 mr-2" }),
                            "Reset Filters",
                          )
                        : null,
                      e.createElement(
                        o,
                        { variant: "outline", onClick: () => i("/all-posts") },
                        "Explore Marketplace",
                      ),
                    ),
                  )
                : C.length === 0
                  ? e.createElement(
                      "div",
                      { className: "w-full max-w-[92rem] mx-auto px-3 py-14" },
                      e.createElement(
                        "div",
                        {
                          className:
                            "mx-auto max-w-2xl rounded-3xl border border-slate-200/80 bg-white/92 dark:bg-slate-900/75 dark:border-slate-800/70 shadow-sm px-6 py-10 text-center backdrop-blur-sm dark:border dark:border-slate-700/80 dark:bg-slate-900/92 dark:text-center",
                        },
                        e.createElement(
                          "div",
                          {
                            className:
                              "w-24 h-24 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6 dark:bg-blue-950/20",
                          },
                          e.createElement(K, {
                            className: "w-12 h-12 text-blue-500 dark:text-blue-300",
                          }),
                        ),
                        e.createElement(
                          "h3",
                          {
                            className:
                              "text-xl font-bold text-gray-900 dark:text-white mb-2 dark:text-gray-100",
                          },
                          r("no_recommendations"),
                        ),
                        e.createElement(
                          "p",
                          {
                            className:
                              "mx-auto max-w-md text-gray-500 dark:text-gray-400 mb-6 dark:text-gray-300",
                          },
                          _
                            ? "No matches found for your current filters."
                            : "Interact with more posts to get personalized picks.",
                        ),
                        e.createElement(
                          "div",
                          {
                            className:
                              "flex flex-wrap justify-center gap-3",
                          },
                          _
                            ? e.createElement(
                                "button",
                                {
                                  type: "button",
                                  onClick: E,
                                  className:
                                    "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 dark:border dark:hover:bg-slate-950",
                                },
                                e.createElement(F, { className: "w-4 h-4" }),
                                "Reset Filters",
                              )
                            : null,
                          e.createElement(
                            "button",
                            {
                              type: "button",
                              onClick: () => i("/all-posts"),
                              className:
                                "inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 dark:bg-blue-700/40 dark:text-white dark:hover:bg-blue-700/40",
                            },
                            "Browse All Posts",
                          ),
                        ),
                      ),
                    )
                  : e.createElement(
                      e.Fragment,
                      null,
                      e.createElement(
                        "div",
                        {
                          className:
                            "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-2.5 w-full max-w-[92rem] mx-auto px-3",
                        },
                        ne.map((t) => {
                          const a = getPostId(t);
                          const s = a || String(t.post_id || t.id || Math.random());
                          const isOwnerPost = isPostOwnedByUser(t, m);
                          const u =
                            t.user?.name ||
                            t.user_name ||
                            t.username ||
                            tr("unknown", "Unknown");
                          const l = String(u || "U")
                            .charAt(0)
                            .toUpperCase();
                          const subLabel =
                            t.subcategory_name ||
                            t.subcategory ||
                            t.subcategoryName ||
                            "";
                          const subcategoryLabel = String(subLabel || "").trim();
                          const resolvedSubcategoryLabel =
                            subcategoryLabel &&
                            subcategoryLabel !== "All" &&
                            !/^\d+$/.test(subcategoryLabel)
                              ? subcategoryLabel
                              : "";
                          const v = !!(
                            t.user?.isVerified ||
                            t.is_verified ||
                            t.aadhaar_verified ||
                            t.pan_verified
                          );
                          const d = String(t.description || "");
                          const Oe = d.length >= 60;
                          const he = formatRelativeTime(
                            t.created_at || t.createdAt,
                          );
                          const we = t.location || t.city || t.area || "";
                          const imageList = collectPostImageUrls(t);
                          const priceValue = resolvePostPriceValue(t);
                          const hasPrice =
                            Number.isFinite(priceValue) && priceValue > 0;
                          const priceText = hasPrice
                            ? formatCurrency(priceValue)
                            : tr("price_on_request", "Price on request");
                          const activeImageIndex = getCarouselIndex(
                            a,
                            imageList.length,
                          );
                          const inCart = a ? isInCartItem(a) : !1;
                          return e.createElement(
                            ee,
                            {
                              key: s,
                              ref: (P) => {
                                if (a) {
                                  postCardRefs.current[a] = P;
                                }
                              },
                              "data-post-id": a,
                              className:
                                "for-you-post-card rounded-xl shadow-sm mhub-premium-surface border border-blue-100 dark:border-gray-700 flex flex-col p-0 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 dark:border dark:border-blue-600/40",
                            },
                            e.createElement(
                              "div",
                              {
                                className:
                                  "px-2 pt-0.5 pb-0.5 border-b border-gray-100 dark:border-gray-700/70 sm:px-2.5 sm:pt-0.5 sm:pb-1 dark:border-b dark:border-gray-700",
                              },
                              e.createElement(
                                "div",
                                {
                                  className:
                                    "inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 px-1.5 py-0.5 sm:px-2 sm:py-0.5 dark:bg-emerald-950/20 dark:border dark:border-emerald-600/40",
                                },
                                e.createElement(
                                  "span",
                                  {
                                      className:
                                        "text-[9px] sm:text-[10px] md:text-[11px] uppercase tracking-wide font-semibold text-emerald-700 dark:text-emerald-300",
                                  },
                                  r("price") || "Price",
                                ),
                                e.createElement(
                                  "span",
                                  {
                                      className: hasPrice
                                        ? "text-xs sm:text-sm md:text-base font-bold text-emerald-800 dark:text-emerald-200"
                                        : "text-[10px] sm:text-xs font-semibold text-emerald-700/70 dark:text-emerald-300/80",
                                  },
                                  priceText,
                                ),
                              ),
                            ),
                            e.createElement(
                              "div",
                              {
                                className:
                                  "flex items-start gap-2 px-2 pt-1.5 pb-1.5 relative sm:px-2.5",
                              },
                              e.createElement(
                                ye,
                                { className: "w-7 h-7 sm:w-8 sm:h-8" },
                                e.createElement(
                                  Ne,
                                  { className: "dark:bg-gray-700 dark:text-white" },
                                  l || "U",
                                ),
                              ),
                              e.createElement(
                                "div",
                                { className: "flex-1 min-w-0 pr-10" },
                                e.createElement(
                                  "div",
                                  { className: "flex items-center gap-1.5 text-[11px] sm:text-[12px] text-gray-700 dark:text-gray-300 truncate" },
                                  e.createElement(
                                    "span",
                                    {
                                      className:
                                        "font-semibold text-blue-900 dark:text-blue-200 truncate cursor-pointer hover:underline",
                                      onClick: (P) => { P.stopPropagation(); const uid = t.user?.id || t.user_id; if (uid) i(`/profile/${uid}`); },
                                    },
                                    u,
                                  ),
                                  v &&
                                    e.createElement(
                                      "svg",
                                      {
                                        className: "w-3.5 h-3.5 text-blue-500 dark:text-blue-400 flex-shrink-0",
                                        fill: "currentColor",
                                        viewBox: "0 0 20 20",
                                        title: "Verified",
                                      },
                                      e.createElement("path", {
                                        fillRule: "evenodd",
                                        d: "M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z",
                                        clipRule: "evenodd",
                                      }),
                                    ),
                                  we && e.createElement("span", { className: "text-gray-400 dark:text-gray-500 flex-shrink-0" }, "\u00B7"),
                                  we && e.createElement("span", { className: "truncate text-gray-500 dark:text-gray-400" }, we),
                                  he && e.createElement("span", { className: "text-gray-400 dark:text-gray-500 flex-shrink-0" }, "\u00B7"),
                                  he && e.createElement("span", { className: "text-gray-400 dark:text-gray-500 flex-shrink-0 whitespace-nowrap" }, he),
                                  a && e.createElement("span", { className: "text-gray-400 dark:text-gray-500 flex-shrink-0" }, "\u00B7"),
                                  a && e.createElement("span", { className: "text-[10px] text-gray-400 dark:text-gray-500 font-mono flex-shrink-0" }, "#", String(a)),
                                ),
                                (categoryNameById[String(t.category_id)] || resolvedSubcategoryLabel) && e.createElement(
                                  "div",
                                  { className: "flex items-center gap-1 mt-0.5 flex-wrap" },
                                  categoryNameById[String(t.category_id)] && e.createElement("span", { className: "text-[9px] px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 font-medium" }, categoryNameById[String(t.category_id)]),
                                  resolvedSubcategoryLabel && e.createElement("span", { className: "text-[9px] px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 font-medium" }, resolvedSubcategoryLabel),
                                ),
                              ),
                              e.createElement(
                                "button",
                                {
                                  type: "button",
                                  onClick: (P) => {
                                    P.stopPropagation();
                                    setMenuPostId((s) => (s === a ? null : a));
                                  },
                                  className:
                                    "absolute right-2.5 top-2.5 p-1 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 sm:right-3 sm:top-3 sm:p-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 focus-visible:ring-offset-1 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-800 dark:text-gray-300 dark:hover:bg-gray-950",
                                  title: r("more_options", "More options"),
                                  "aria-label": r("more_options", "More options"),
                                  "data-for-you-menu-trigger": "true",
                                },
                                e.createElement(To, { className: "w-3.5 h-3.5" }),
                              ),
                              menuPostId === a &&
                                e.createElement(
                                  "div",
                                  {
                                    className:
                                      "absolute right-4 top-14 z-40 w-44 rounded-xl border border-gray-200 dark:border-gray-700 mhub-premium-surface shadow-lg p-1 dark:border",
                                    onClick: (P) => P.stopPropagation(),
                                    "data-for-you-menu-panel": "true",
                                  },
                                  e.createElement(
                                    "button",
                                    {
                                      type: "button",
                                  onClick: () => {
                                    handleSharePost(t);
                                    setMenuPostId(null);
                                  },
                                      className:
                                        "w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-left dark:hover:bg-gray-950",
                                    },
                                    r("share") || "Share",
                                  ),
                                  e.createElement(
                                    "button",
                                    {
                                      type: "button",
                                  onClick: () => {
                                    toggleSave(t);
                                    setMenuPostId(null);
                                  },
                                      className:
                                        "w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-left dark:hover:bg-gray-950",
                                    },
                                    savedPosts[a]
                                      ? r("saved") || "Saved"
                                      : r("save") || "Save",
                                  ),
                                  isOwnerPost &&
                                    e.createElement(
                                      "button",
                                      {
                                        type: "button",
                                        onClick: () => {
                                          openPromote(a, t.title);
                                          setMenuPostId(null);
                                        },
                                        className:
                                          "w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-left dark:hover:bg-gray-950",
                                      },
                                      r("promote") || "Promote",
                                    ),
                                  e.createElement(
                                    "button",
                                    {
                                      type: "button",
                                      onClick: () => {
                                        setInterestPost(t);
                                        setIsInterestOpen(!0);
                                        setMenuPostId(null);
                                      },
                                      className:
                                        "w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-left dark:hover:bg-gray-950",
                                    },
                                    r("interested") || "Interested",
                                  ),
                                  e.createElement(
                                    "button",
                                    {
                                      type: "button",
                                      onClick: () => {
                                        handleCartToggle(t);
                                        setMenuPostId(null);
                                      },
                                      className:
                                        "w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-left dark:hover:bg-gray-950",
                                    },
                                    inCart
                                      ? r("in_cart") || "In Cart"
                                      : r("add_to_cart") || "Add to Cart",
                                  ),
                                  e.createElement(
                                    "button",
                                    {
                                      type: "button",
                                  onClick: () => {
                                    handleReportPost(t);
                                    setMenuPostId(null);
                                  },
                                      className:
                                        "w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg dark:text-left dark:text-red-300 dark:hover:bg-red-950/20",
                                    },
                                    r("report") || "Report",
                                  ),
                                ),
                            ),
                            e.createElement(
                              "div",
                              {
                                className:
                                  "for-you-post-media group relative w-full bg-slate-100 dark:bg-slate-900/70 border-y border-slate-200/70 dark:border-slate-700 mhub-media-frame dark:bg-slate-950 dark:border-y dark:border-slate-700/70",
                              },
                              /* PostPromoBadges removed from cards */
                              e.createElement(
                                "div",
                                {
                                  ref: (P) => setCarouselTrackRef(a, P),
                                  onScroll: (P) =>
                                    handleCarouselScroll(a, P, imageList.length),
                                  className:
                                    "flex w-full overflow-x-auto snap-x snap-mandatory scrollbar-hide",
                                },
                                imageList.map((P, St) =>
                                  e.createElement(
                                    "div",
                                    {
                                      key: `${a}-media-${St}`,
                                      className:
                                        "w-full shrink-0 snap-center bg-slate-100 dark:bg-slate-800 dark:bg-slate-950",
                                    },
                                    e.createElement("img", {
                                      src: P,
                                      alt: `${t.title || r("post") || "Post"} ${
                                        r("image") || "image"
                                      } ${St + 1}`,
                                      loading: "lazy",
                                      className:
                                        `mhub-media-img for-you-post-image w-full h-[150px] sm:h-[185px] md:h-[210px] object-cover object-center ${
                                          P === PLACEHOLDER_IMAGE
                                            ? "opacity-45 saturate-50 grayscale"
                                            : ""
                                        }`,
                                      onLoad: (Rt) => {
                                        Rt.currentTarget.dataset.loaded = "true";
                                        const frame = Rt.currentTarget.closest(".mhub-media-frame");
                                        frame && frame.setAttribute("data-loaded", "true");
                                      },
                                      onError: (Rt) => {
                                        Rt.currentTarget.src = PLACEHOLDER_IMAGE;
                                        Rt.currentTarget.dataset.loaded = "true";
                                        const frame = Rt.currentTarget.closest(".mhub-media-frame");
                                        frame && frame.setAttribute("data-loaded", "true");
                                      },
                                    }),
                                  ),
                                ),
                              ),
                              imageList.length > 1 &&
                                e.createElement(
                                  e.Fragment,
                                  null,
                                  e.createElement(
                                    "button",
                                    {
                                      type: "button",
                                      onClick: (P) =>
                                        moveCarousel(a, -1, imageList.length, P),
                                      className:
                                        "absolute left-3 top-1/2 -translate-y-1/2 z-10 h-6 w-6 rounded-full bg-black/45 text-white hover:bg-black/60 flex items-center justify-center sm:h-7 sm:w-7 opacity-0 group-hover:opacity-100 transition-opacity dark:bg-black/45 dark:text-white dark:hover:bg-black/60",
                                      "aria-label":
                                        r("previous_image") || "Previous image",
                                    },
                                    e.createElement(Lo, { className: "w-3 h-3" }),
                                  ),
                                  e.createElement(
                                    "button",
                                    {
                                      type: "button",
                                      onClick: (P) =>
                                        moveCarousel(a, 1, imageList.length, P),
                                      className:
                                        "absolute right-3 top-1/2 -translate-y-1/2 z-10 h-6 w-6 rounded-full bg-black/45 text-white hover:bg-black/60 flex items-center justify-center sm:h-7 sm:w-7 opacity-0 group-hover:opacity-100 transition-opacity dark:bg-black/45 dark:text-white dark:hover:bg-black/60",
                                      "aria-label": r("next_image") || "Next image",
                                    },
                                    e.createElement(Co, { className: "w-3 h-3" }),
                                  ),
                                  e.createElement(
                                    "div",
                                    {
                                      className:
                                        "absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-black/55 text-white text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity dark:bg-black/55 dark:text-white",
                                    },
                                    activeImageIndex + 1,
                                    "/",
                                    imageList.length,
                                  ),
                                  e.createElement(
                                    "div",
                                    {
                                      className:
                                        "absolute bottom-2.5 left-1/2 -translate-x-1/2 hidden sm:flex items-center gap-1.5 bg-black/40 px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity dark:bg-black/40",
                                    },
                                    imageList.map((P, St) =>
                                      e.createElement("button", {
                                        key: `${a}-dot-${St}`,
                                        type: "button",
                                        onClick: (Rt) => {
                                          Rt.preventDefault();
                                          Rt.stopPropagation();
                                          scrollCarouselToIndex(
                                            a,
                                            St,
                                            imageList.length,
                                          );
                                        },
                                        className: `h-1.5 w-1.5 rounded-full transition-all ${St === activeImageIndex ? "bg-white w-3" : "bg-white/50"}`,
                                        "aria-label": `${
                                          r("go_to_image") || "Go to image"
                                        } ${St + 1}`,
                                      }),
                                    ),
                                  ),
                                ),
                            ),
                            e.createElement(
                              "div",
                              {
                                className:
                                  "px-2 py-1 text-gray-800 dark:text-gray-200 text-[10px] sm:text-xs md:text-sm leading-tight sm:px-2.5 sm:py-1.5 dark:text-gray-100",
                              },
                              expandedPostId === a || !Oe
                                ? d ||
                                    e.createElement(
                                      "span",
                                      {
                                        className:
                                          "italic text-gray-400 dark:text-gray-400 dark:text-gray-300",
                                      },
                                      r("no_description") || "No description",
                                    )
                                : e.createElement(
                                    e.Fragment,
                                    null,
                                    d.slice(0, 60),
                                    "...",
                                    " ",
                                    e.createElement(
                                      "button",
                                      {
                                        className:
                                          "text-blue-600 dark:text-blue-400 font-semibold hover:underline dark:text-blue-300",
                                        onClick: () => handleViewMore(a),
                                      },
                                      r("view_more"),
                                    ),
                                  ),
                            ),
                            e.createElement(
                              "div",
                              {
                                className:
                                  "px-2 pb-1 pt-0.5 border-t border-gray-100 dark:border-gray-700 sm:pb-1.5 dark:border-t",
                              },
                              e.createElement(
                                "div",
                                {
                                  className:
                                    "post-action-row flex flex-nowrap items-center gap-1 overflow-x-auto whitespace-nowrap pr-1 scrollbar-hide sm:gap-1.5",
                                },
                                e.createElement(
                                  "button",
                                  {
                                    className:
                                      "shrink-0 inline-flex h-6 items-center gap-1 px-1 rounded-full bg-gray-50 dark:bg-gray-700/70 text-gray-700 dark:text-gray-200 text-[9px] sm:h-7 sm:px-2 sm:text-[10px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 focus-visible:ring-offset-1 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-800 dark:bg-gray-950",
                                    onClick: () => handleLike(t),
                                    "aria-label": r("like") || "Like",
                                  },
                                  likedById[a]
                                    ? e.createElement(He, {
                                        className: "w-4 h-4 text-red-500 dark:text-red-300",
                                      })
                                    : e.createElement(qe, {
                                        className:
                                          "w-4 h-4 text-black dark:text-gray-300 dark:text-slate-100",
                                      }),
                                  e.createElement(
                                    "span",
                                    { className: "text-[9px] sm:text-[10px]" },
                                    likeCounts[a] || 0,
                                  ),
                                ),
                                e.createElement(
                                  "button",
                                  {
                                    className:
                                      "shrink-0 inline-flex h-6 items-center gap-1 px-1 rounded-full bg-gray-50 dark:bg-gray-700/70 text-gray-700 dark:text-gray-200 text-[9px] sm:h-7 sm:px-2 sm:text-[10px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 focus-visible:ring-offset-1 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-800 dark:bg-gray-950",
                                    onClick: () => handleSharePost(t),
                                    "aria-label": r("share") || "Share",
                                  },
                                  e.createElement(Ge, { className: "w-4 h-4" }),
                                  e.createElement(
                                    "span",
                                    { className: "sr-only" },
                                    r("share") || "Share",
                                  ),
                                ),
                                e.createElement(
                                  "button",
                                  {
                                    className:
                                      "shrink-0 inline-flex h-6 items-center gap-1 px-1 rounded-full bg-gray-50 dark:bg-gray-700/70 text-gray-700 dark:text-gray-200 text-[9px] sm:h-7 sm:px-2 sm:text-[10px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 focus-visible:ring-offset-1 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-800 dark:bg-gray-950",
                                    onClick: () => toggleSave(t),
                                    "aria-label":
                                      savedPosts[a]
                                        ? r("saved") || "Saved"
                                        : r("save") || "Save",
                                  },
                                  savedPosts[a]
                                    ? e.createElement(Po, {
                                        className: "w-4 h-4 text-blue-600 dark:text-blue-300",
                                      })
                                    : e.createElement(Ro, { className: "w-4 h-4" }),
                                  e.createElement(
                                    "span",
                                    { className: "sr-only" },
                                    savedPosts[a]
                                      ? r("saved") || "Saved"
                                      : r("save") || "Save",
                                  ),
                                ),
                                e.createElement(
                                  "button",
                                  {
                                    className:
                                      "shrink-0 inline-flex h-7 items-center gap-1.5 px-2 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-[10px] sm:h-8 sm:px-2.5 sm:text-xs font-semibold focus:outline-none hover:bg-emerald-100 dark:hover:bg-emerald-900/50 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/20",
                                    onClick: (P) => {
                                      P.stopPropagation();
                                      setInterestPost(t);
                                      setIsInterestOpen(!0);
                                    },
                                    "aria-label": r("interested") || "Interested",
                                  },
                                  e.createElement(Ye, { className: "w-4 h-4" }),
                                  e.createElement(
                                    "span",
                                    { className: "hidden sm:inline" },
                                    r("interested") || "Interested",
                                  ),
                                ),
                                e.createElement(
                                  o,
                                  {
                                    variant: "outline",
                                    className: `shrink-0 h-6 px-1 text-[9px] sm:h-7 sm:px-2 sm:text-[10px] font-semibold rounded inline-flex items-center gap-1 dark:sm:text-[10px]${inCart ? "border-green-200 bg-green-50 text-green-700 hover:bg-green-100" : "border-blue-200 text-blue-700 hover:bg-blue-50"}`,
                                    onClick: (P) => {
                                      P.stopPropagation();
                                      handleCartToggle(t);
                                    },
                                    "aria-label": inCart
                                      ? r("in_cart") || "In Cart"
                                      : r("add_to_cart") || "Add to Cart",
                                  },
                                  inCart
                                    ? e.createElement(Bo, { className: "w-4 h-4" })
                                    : e.createElement(Mo, { className: "w-4 h-4" }),
                                  e.createElement(
                                    "span",
                                    null,
                                    inCart
                                      ? r("in_cart") || "In Cart"
                                      : r("add_to_cart") || "Add to Cart",
                                  ),
                                ),
                                e.createElement(
                                  "span",
                                  {
                                    className:
                                      "shrink-0 inline-flex h-6 items-center gap-1 px-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[9px] sm:h-7 sm:px-2 sm:text-[10px] font-semibold dark:bg-gray-950 dark:text-gray-200",
                                  },
                                  e.createElement(Qe, { className: "w-4 h-4" }),
                                  viewCounts[a] || 0,
                                ),
                                e.createElement(
                                  o,
                                  {
                                    className:
                                      "shrink-0 h-6 bg-blue-600 text-white px-1.5 text-[9px] sm:h-7 sm:px-2 sm:text-[10px] font-medium rounded hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 focus-visible:ring-offset-1 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-800 dark:bg-blue-700/40 dark:text-white dark:hover:bg-blue-700/40",
                                    onClick: () => handleViewDetails(t),
                                    "aria-label":
                                      r("view_details") || "View Details",
                                  },
                                  e.createElement(Qe, { className: "w-4 h-4" }),
                                  e.createElement(
                                    "span",
                                    null,
                                    tr("view", "View"),
                                  ),
                                ),
                              ),
                            ),
                          );
                        }),                      ),
                      ie
                        ? e.createElement(
                            "div",
                            {
                              className:
                                "w-full max-w-[92rem] mx-auto px-3 pt-8 pb-28",
                            },
                            e.createElement(
                              "div",
                              {
                                className:
                                  "rounded-2xl border border-slate-200/80 bg-white/90 dark:bg-slate-900/70 dark:border-slate-800/70 shadow-sm backdrop-blur-sm px-4 py-4 sm:px-5 dark:border dark:border-slate-700/80 dark:bg-slate-900/90",
                              },
                              e.createElement(
                                "div",
                                {
                                  className:
                                    "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
                                },
                                e.createElement(
                                  "div",
                                  { className: "min-w-0" },
                                  e.createElement(
                                    "p",
                                    {
                                      className:
                                        "text-sm font-semibold text-slate-900 dark:text-slate-100",
                                    },
                                    tr("more_recommendations", "More recommendations"),
                                  ),
                                  e.createElement(
                                    "p",
                                    {
                                      className:
                                        "text-xs text-slate-500 dark:text-slate-400 dark:text-slate-300",
                                    },
                                    tr(
                                      "load_more_recommendations_hint",
                                      "Load another set of picks for you.",
                                    ),
                                  ),
                                ),
                                e.createElement(
                                  "button",
                                  {
                                    type: "button",
                                    onClick: () => Y((t) => t + 1),
                                    disabled: D,
                                    className:
                                      "inline-flex min-h-11 min-w-[180px] items-center justify-center rounded-xl border border-blue-200 bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70 dark:border-blue-500/40 dark:border dark:border-blue-600/40 dark:bg-blue-700/40 dark:text-white dark:hover:bg-blue-700/40",
                                  },
                                  D
                                    ? e.createElement(
                                        e.Fragment,
                                        null,
                                        e.createElement("div", {
                                          className:
                                            "mr-2 h-4 w-4 rounded-full border-2 border-white/80 border-t-transparent animate-spin dark:border-2 dark:border-white/80 dark:border-t-transparent",
                                        }),
                                        r("loading") || "Loading...",
                                      )
                                    : r("load_more") || "Load More",
                                ),
                              ),
                            ),
                          )
                        : null,
                    ),
          e.createElement(ShareLinkDialog, {
            open: shareDialogOpen,
            onOpenChange: setShareDialogOpen,
            url: shareDialogUrl,
          }),
          e.createElement(PromoteDialog, {
            open: Boolean(promotePostId),
            onOpenChange: (t) => {
              if (!t) closePromote();
            },
            postId: promotePostId,
            postTitle: promotePostTitle,
          }),
          e.createElement(BuyerInterestModal, {
            isOpen: isInterestOpen,
            onClose: () => setIsInterestOpen(!1),
            postId: interestPost?.post_id || interestPost?.id,
            postTitle: interestPost?.title,
          }),
          e.createElement(LoginPromptModal, {
            isOpen: loginPromptOpen,
            onClose: () => setLoginPromptOpen(!1),
          }),
          )
        )
        ;
  };
var Ve = Ee;
export { Ve as default };

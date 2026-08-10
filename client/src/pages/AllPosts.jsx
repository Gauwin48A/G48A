import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  FaBookmark as He,
  FaRegBookmark as qe,
  FaEye as Qe,
  FaHandHoldingHeart as Ye,
  FaArrowRight as Bo,
  FaEllipsisV as To,
  FaChevronLeft as Lo,
  FaChevronRight as Co,
  FaChevronUp as Uo,
  FaBolt as zo,
  FaTimes as Jo,
  FaExchangeAlt as CompareIcon,
} from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";
import { useFilter as We } from "@/context/FilterContext";
import { useCategoryMode as Zt } from "@/context/CategoryModeContext";
import { useTranslation } from "react-i18next";
import PageDensityToggle from "@/components/ui/PageDensityToggle";
import { usePageDensity } from "@/hooks/usePageDensity";
import LoginPromptModal from "@/components/LoginPromptModal";
import {
  translatePosts as Re,
  translatePostsInstant as Ue,
} from "@/utils/translateContent";
import { useAuth as et } from "@/context/AuthContext";
import { useCart as mt } from "@/context/CartContext";
import A from "@/lib/api";
import { getUserId as tt, isAuthenticated as rt } from "@/utils/authStorage";
import {
  buildSavedPostsMap,
  getSavedPostsMap,
  fetchWishlistIds,
  setSavedPostStatus,
  subscribeSavedPosts,
} from "@/utils/savedPosts";
import pt from "@/components/ShareLinkDialog";
import PromoteDialog from "@/components/PromoteDialog";
import BuyerInterestModal from "@/components/BuyerInterestModal";
import AllPostsCategoryBar from "@/components/allposts/CategoryBar";
import AllPostsQuickFilters from "@/components/allposts/QuickFilters";
import AllPostsFilterPanel from "@/components/allposts/FilterPanel";
import AllPostsGreatDealsBanner from "@/components/allposts/GreatDealsBanner";
import PostPromoBadges from "@/components/PostPromoBadges";
import FilterBar from "@/components/allposts/FilterBar";
import ForYouPosts from "@/components/allposts/ForYouPosts";
import RegularPosts from "@/components/allposts/RegularPosts";
import FeedHeader from "@/components/allposts/FeedHeader";
import {
  normalizeMediaList as ctm,
  resolveMediaUrl as utm,
} from "@/lib/mediaUrl";
import {
  buildActiveAppMatcher,
  matchesCategoryModeItem,
} from "@/utils/categoryModeFilters";
import { isPostOwnedByUser } from "@/utils/postOwnership";
import { getDemoPosts, getDemoCategoryList } from "@/utils/demoPosts";
import { usePageRefresh } from "@/hooks/usePageRefresh";
import { fetchUserPreferencesCached } from "@/services/preferencesService";
const ve = 5,
  SHOW_POST_ID_CHIP = !1,
  LOAD_MORE_COOLDOWN_MS = 1200,
  RATE_LIMIT_COOLDOWN_MS = 5000,
  D = "/placeholder.svg",
  ALL_POSTS_TRANSLATE_PATHS = [
    "title",
    "description",
    "category",
    "category_name",
    "location",
    "city",
    "area",
    "state",
    "summary",
    "subtitle",
    "brand",
    "model",
    "user.name",
    "user.location",
  ],
  ALL_POSTS_SEARCH_PATHS = Array.from(
    new Set([
      ...ALL_POSTS_TRANSLATE_PATHS,
      "brand_name",
      "brandName",
      "model_name",
      "modelName",
      "categoryName",
      "subcategory",
      "subcategory_name",
      "subcategoryName",
      "user_name",
      "username",
      "user.username",
      "user.display_name",
      "user.full_name",
      "user.fullName",
      "seller_name",
      "sellerName",
      "tags",
      "keywords",
    ]),
  ),
  st = {
    search: "",
    category: "All",
    subcategory: "All",
    categoryGroup: "",
    sortBy: "",
    latestWindow: "",
    location: "",
    minPrice: "",
    maxPrice: "",
    priceRange: "",
    startDate: "",
    endDate: "",
    condition: "",
    verifiedOnly: !1,
  },
  normalizeName = (v) => String(v || "").trim().toLowerCase(),
  normalizeSearchText = (v) => String(v ?? "").trim().toLowerCase(),
  getNestedValue = (s, c) => {
    if (!s || typeof s !== "object" || !c) return null;
    const l = String(c).split(".");
    let t = s;
    for (let m = 0; m < l.length; m += 1) {
      if (t == null) return null;
      t = t[l[m]];
    }
    return t;
  },
  pushSearchValue = (s, c) => {
    if (c == null) return;
    if (Array.isArray(c)) {
      c.forEach((l) => pushSearchValue(s, l));
      return;
    }
    if (typeof c === "object") {
      if (typeof c.name === "string") s.push(c.name);
      if (typeof c.label === "string") s.push(c.label);
      if (typeof c.title === "string") s.push(c.title);
      return;
    }
    const l = String(c).trim();
    l && s.push(l);
  },
  buildSearchText = (s, c = []) => {
    if (!s || typeof s !== "object") return "";
    const l = [];
    ALL_POSTS_SEARCH_PATHS.forEach((t) => {
      pushSearchValue(l, getNestedValue(s, t));
    });
    c.forEach((t) => pushSearchValue(l, t));
    return normalizeSearchText(l.join(" "));
  },
  matchesSearchQuery = (s, c, l = []) => {
    const t = normalizeSearchText(c);
    if (!t) return !0;
    const m = buildSearchText(s, l);
    if (!m) return !1;
    const p = t.split(/\s+/).filter(Boolean);
    if (p.length === 0) return !0;
    return p.every((F) => m.includes(F));
  },
  ke = (s) => s?.post_id ?? s?.id ?? null,
  I = (s) => {
    if (s == null) return "";
    if (Array.isArray(s)) return "";
    if (typeof s === "object") {
      const candidate = s.post_id ?? s.postId ?? s.id;
      if (candidate == null) return "";
      if (typeof candidate === "object") return "";
      return String(candidate).trim();
    }
    const c = String(s).trim();
    return c.length ? c : "";
  },
  ot = (s) => {
    const c = Number(s);
    return Number.isFinite(c) ? c : s || 0;
  },
  relativeTimeFormatters = new Map(),
  getRelativeTimeFormatter = (s) => {
    const c = String(s || "en")
      .trim()
      .toLowerCase();
    const l = c || "en";
    if (relativeTimeFormatters.has(l)) {
      return relativeTimeFormatters.get(l);
    }
    if (typeof Intl > "u" || typeof Intl.RelativeTimeFormat > "u") {
      relativeTimeFormatters.set(l, null);
      return null;
    }
    try {
      const t = new Intl.RelativeTimeFormat(l, { numeric: "always" });
      return relativeTimeFormatters.set(l, t), t;
    } catch {
      const t = new Intl.RelativeTimeFormat("en", { numeric: "always" });
      return relativeTimeFormatters.set(l, t), t;
    }
  },
  nt = (s, c = "en") => {
    if (!s) return "";
    const l = new Date(s);
    if (Number.isNaN(l.getTime())) return "";
    const t = Date.now() - l.getTime(),
      m = Math.max(1, Math.floor(t / 6e4)),
      p = getRelativeTimeFormatter(c);
    if (p)
      return m < 60
        ? p.format(-m, "minute")
        : (() => {
            const F = Math.floor(m / 60);
            return F < 24
              ? p.format(-F, "hour")
              : p.format(-Math.floor(F / 24), "day");
          })();
    if (m < 60) return `${m}m ago`;
    const F = Math.floor(m / 60);
    return F < 24 ? `${F}h ago` : `${Math.floor(F / 24)}d ago`;
  },
  isDateOnlyValue = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || "")),
  normalizeLatestWindow = (s) => {
    const c = Number.parseInt(String(s || ""), 10);
    return c === 5 || c === 10 || c === 50 ? c : null;
  },
  toInclusiveEndDateValue = (s) =>
    isDateOnlyValue(s) ? `${s}T23:59:59.999` : s,
  parsePriceValue = (s) => {
    if (s == null) return 0;
    if (typeof s === "number") return Number.isFinite(s) ? s : 0;
    const cleaned = String(s).replace(/[^0-9.-]/g, "");
    const value = Number(cleaned);
    return Number.isFinite(value) ? value : 0;
  },
  resolvePostPriceValue = (s) => {
    if (!s || typeof s !== "object") {
      return parsePriceValue(s);
    }
    const candidates = [
      s.price,
      s.price_value,
      s.priceValue,
      s.price_inr,
      s.priceInr,
      s.listing_price,
      s.listingPrice,
      s.selling_price,
      s.sellingPrice,
      s.sale_price,
      s.salePrice,
      s.expected_price,
      s.expectedPrice,
      s.asking_price,
      s.askingPrice,
      s.amount,
      s.budget,
    ];
    for (let i = 0; i < candidates.length; i += 1) {
      const value = parsePriceValue(candidates[i]);
      if (Number.isFinite(value) && value > 0) return value;
    }
    return 0;
  },
  normalizeConditionValue = (s) =>
    String(s ?? "")
      .trim()
      .toLowerCase()
      .replace(/[_-]+/g, " "),
  matchesConditionFilter = (s, c) => {
    const l = normalizeConditionValue(c);
    if (!l) return !0;
    const t = normalizeConditionValue(s);
    if (!t) return !1;
    const m = new Set(["new", "brand new", "unused", "sealed"]);
    if (l === "new") {
      return m.has(t) || t.startsWith("new");
    }
    if (l === "used") {
      return !m.has(t);
    }
    return t.includes(l);
  },
  resolvePostDateValue = (s) => {
    if (!s || typeof s !== "object") {
      const c = new Date(s);
      return Number.isNaN(c.getTime()) ? null : c.getTime();
    }
    const c = [
      s.created_at,
      s.createdAt,
      s.posted_at,
      s.postedAt,
      s.updated_at,
      s.updatedAt,
      s.date,
      s.posted_date,
      s.postedDate,
      s.listing_date,
      s.listingDate,
      s.timestamp,
      s.time,
      s.created,
      s.created_on,
      s.createdOn,
      s.published_at,
      s.publishedAt,
    ];
    for (let l = 0; l < c.length; l += 1) {
      const t = c[l];
      if (!t) continue;
      const m = new Date(t);
      if (!Number.isNaN(m.getTime())) return m.getTime();
    }
    return null;
  },
  parseFilterDateValue = (s, c = !1) => {
    if (!s) return null;
    const l = String(s || "").trim();
    if (!l) return null;
    const t = c ? toInclusiveEndDateValue(l) : l;
    const m = new Date(t);
    if (Number.isNaN(m.getTime())) return null;
    return m.getTime();
  },
  collectPostImageUrls = (s) => {
    if (!s) return [D];
    const c = [];
    const l = (t) => {
      ctm(t).forEach((m) => {
        const p = utm(m, D);
        p && c.push(p);
      });
    };
    const pushFrom = (t) => {
      if (!t) return;
      l(t.images);
      l(t.image_urls);
      l(t.imageUrls);
      l(t.image_url);
      l(t.imageUrl);
      l(t.image);
      l(t.photo);
      l(t.photos);
      l(t.gallery);
      l(t.media);
      l(t.media_urls);
      l(t.mediaUrls);
      l(t.cover_image);
      l(t.coverImage);
      l(t.primary_image);
      l(t.primaryImage);
      l(t.thumbnail);
    };
    pushFrom(s);
    pushFrom(s.post);
    pushFrom(s.listing);
    pushFrom(s.item);
    const t = Array.from(
      new Set(
        c.map((m) => String(m || "").trim()).filter((m) => !!m && m !== D),
      ),
    );
    return t.length ? t : [D];
  },
  Ne = (s) => {
    const c = collectPostImageUrls(s);
    return c[0] || D;
  },
  setNestedValue = (s, c, l) => {
    if (!s || typeof s != "object" || !c) return;
    const t = String(c).split(".");
    let m = s;
    for (let p = 0; p < t.length - 1; p += 1) {
      const F = t[p];
      (!m[F] || typeof m[F] != "object") && (m[F] = {});
      m = m[F];
    }
    m[t[t.length - 1]] = l;
  },
  restoreTranslatedPost = (s) => {
    if (!s || typeof s != "object") return s;
    const c = s._originalTranslations;
    if (!c || typeof c != "object") return s;
    const l = { ...s };
    return (
      Object.entries(c).forEach(([t, m]) => {
        setNestedValue(l, t, m);
      }),
      typeof s._originalTitle == "string" && (l.title = s._originalTitle),
      typeof s._originalDescription == "string" &&
        (l.description = s._originalDescription),
      l
    );
  },
  lt = (s, c) => {
    const l = new Map();
    return (
      s.forEach((t) => {
        const m = ke(t);
        m !== null && l.set(String(m), t);
      }),
      c.forEach((t) => {
        const m = ke(t);
        m !== null && l.set(String(m), t);
      }),
      Array.from(l.values())
    );
  },
  AllPosts = () => {
    const { t: s, i18n: c } = useTranslation(),
      l = c.language,
      { filters: t, setFilters: m } = We(),
      { user: $ } = et(),
      Z = useLocation(),
      debugCategoryEnabled =
        typeof window !== "undefined" &&
        window.localStorage &&
        window.localStorage.getItem("mhub_debug_category") === "1",
      logCategoryFlow = useCallback(
        (label, payload) => {
          if (!debugCategoryEnabled || typeof console === "undefined") return;
          try {
            console.debug("[AllPosts][CategoryDebug]", label, payload);
          } catch {
            // ignore logging errors
          }
        },
        [debugCategoryEnabled],
      ),
      {
        activeCategory: categoryModeCategory,
        activeSubcategory: categoryModeSubcategory,
        activeApp,
        categories: categoryModeCategories,
        hasSelection: hasCategoryMode,
        loading: categoryModeLoading,
        subcategories: categoryModeSubcategories,
        selectCategory: selectCategoryMode,
        selectSubcategory: selectSubcategoryMode,
        clearCategory: clearCategoryMode,
        clearSubcategory: clearSubcategoryMode,
      } = Zt(),
      isForYouPath = useMemo(
        () => (Z.pathname || "").replace(/\/+$/, "").startsWith("/for-you"),
        [Z.pathname],
      ),
      isForYouMode = useMemo(() => {
        const params = new URLSearchParams(Z.search);
        return isForYouPath || params.get("mode") === "for-you";
      }, [Z.search, isForYouPath]),
      basePath = isForYouMode ? "/for-you" : "/all-posts",
      returnTo = useMemo(() => `${Z.pathname}${Z.search}`, [Z.pathname, Z.search]),
      subcategoryCandidatesByName = useMemo(() => {
        const map = {};
        const addEntry = (entry, category) => {
          const rawName = entry?.name || entry?.subcategory_name || "";
          const key = normalizeName(rawName);
          if (!key) return;
          const id = entry?.subcategory_id || entry?.id || null;
          if (id === null || id === undefined || id === "") return;
          const categoryId =
            entry?.category_id ||
            entry?.categoryId ||
            category?.category_id ||
            category?.id ||
            null;
          const categoryGroup =
            entry?.category_group ||
            entry?.categoryGroup ||
            category?.category_group ||
            category?.categoryGroup ||
            category?.group ||
            "";
          const payload = {
            id: String(id),
            name: rawName,
            categoryId: categoryId != null && categoryId !== "" ? String(categoryId) : "",
            categoryGroup: String(categoryGroup || "").trim().toLowerCase(),
          };
          if (!map[key]) {
            map[key] = [payload];
          } else {
            map[key].push(payload);
          }
        };
        if (Array.isArray(categoryModeSubcategories)) {
          categoryModeSubcategories.forEach((entry) => addEntry(entry, null));
        }
        // When the backend catalog is unavailable/empty (e.g. demo login, empty DB),
        // fall back to the mock category+subcategory catalog so preferred subcategory
        // NAMES still resolve to IDs. Without this, subcategory_ids is never appended
        // and the feed stays unfiltered (cars leak into Electronics, etc.).
        // Gated on !categoryModeLoading so mock IDs are never sent to a real backend
        // during the transient loading window before the real catalog arrives.
        const realCatalogReady =
          !categoryModeLoading &&
          Array.isArray(categoryModeCategories) &&
          categoryModeCategories.length > 0;
        const categorySource = realCatalogReady
          ? categoryModeCategories
          : !categoryModeLoading
            ? getDemoCategoryList()
            : [];
        if (Array.isArray(categorySource)) {
          categorySource.forEach((category) => {
            (Array.isArray(category?.subcategories) ? category.subcategories : []).forEach(
              (entry) => addEntry(entry, category),
            );
          });
        }
        return map;
      }, [categoryModeSubcategories, categoryModeCategories, categoryModeLoading]),
      preferredCategoryId = useMemo(() => {
        const directId = categoryModeCategory?.id || categoryModeCategory?.category_id || null;
        if (directId != null && directId !== "") return String(directId);
        const categorySource = Array.isArray(categoryModeCategories) ? categoryModeCategories : [];
        const categoryName = categoryModeCategory?.name || "";
        if (categoryName) {
          const match = categorySource.find(
            (entry) =>
              normalizeName(entry?.name || entry?.title || entry?.label || entry?.category_name) ===
              normalizeName(categoryName),
          );
          const matchId = match?.category_id || match?.id || null;
          if (matchId != null && matchId !== "") return String(matchId);
        }
        const rawFilterCategory = t.category || "";
        if (!rawFilterCategory || rawFilterCategory === "All") return "";
        if (/^\d+$/.test(String(rawFilterCategory))) return String(rawFilterCategory);
        const fallbackMatch = categorySource.find(
          (entry) =>
            normalizeName(entry?.name || entry?.title || entry?.label || entry?.category_name) ===
            normalizeName(rawFilterCategory),
        );
        const fallbackId = fallbackMatch?.category_id || fallbackMatch?.id || null;
        return fallbackId != null && fallbackId !== "" ? String(fallbackId) : "";
      }, [categoryModeCategory, categoryModeCategories, t.category]),
      activeAppCategoryIds = useMemo(() => {
        const matcher = buildActiveAppMatcher(t.categoryGroup, categoryModeCategories);
        return matcher?.categoryIds || new Set();
      }, [t.categoryGroup, categoryModeCategories]),
      subcategoryIdByName = useMemo(() => {
        const map = {};
        const preferredId = preferredCategoryId ? String(preferredCategoryId) : "";
        const hasPreferred = !!preferredId;
        const hasActiveAppScope = activeAppCategoryIds?.size > 0;
        Object.entries(subcategoryCandidatesByName || {}).forEach(([key, list]) => {
          if (!Array.isArray(list) || list.length === 0) return;
          let match = null;
          if (hasPreferred) {
            match = list.find(
              (entry) => entry?.categoryId && String(entry.categoryId) === preferredId,
            );
          }
          if (!match && hasActiveAppScope) {
            match = list.find(
              (entry) => entry?.categoryId && activeAppCategoryIds.has(String(entry.categoryId)),
            );
          }
          if (!match) {
            match = list[0];
          }
          if (match?.id != null && match.id !== "") {
            map[key] = match.id;
          }
        });
        return map;
      }, [subcategoryCandidatesByName, preferredCategoryId, activeAppCategoryIds]),
      subcategoryNameById = useMemo(() => {
        const map = {};
        Object.values(subcategoryCandidatesByName || {}).forEach((list) => {
          if (!Array.isArray(list)) return;
          list.forEach((entry) => {
            if (!entry?.id || map[entry.id]) return;
            if (entry?.name) {
              map[String(entry.id)] = entry.name;
            }
          });
        });
        return map;
      }, [subcategoryCandidatesByName]),
      sortedSubcategories = useMemo(() => {
        const list = Array.isArray(categoryModeSubcategories)
          ? [...categoryModeSubcategories]
          : [];
        return list.sort((a, o) => {
          const orderDiff =
            Number(a?.display_order ?? 0) - Number(o?.display_order ?? 0);
          if (orderDiff !== 0) return orderDiff;
          const countDiff =
            Number(o?.post_count ?? o?.count ?? 0) -
            Number(a?.post_count ?? a?.count ?? 0);
          if (countDiff !== 0) return countDiff;
          return String(a?.name || "").localeCompare(String(o?.name || ""), undefined, {
            sensitivity: "base",
          });
        });
      }, [categoryModeSubcategories]),
      Le = {
        Electronics: "\uD83D\uDCBB",
        Mobiles: "\uD83D\uDCF1",
        Fashion: "\uD83D\uDC57",
        Furniture: "\uD83D\uDECB\uFE0F",
        Vehicles: "\uD83D\uDE97",
        Books: "\uD83D\uDCDA",
        Sports: "\u26BD",
        "Home Appliances": "\uD83C\uDFE0",
        Beauty: "\uD83D\uDC84",
        Kids: "\uD83E\uDDF8",
        Grocery: "\uD83D\uDED2",
        Toys: "\uD83C\uDFAE",
        Jewelry: "\uD83D\uDC8E",
        Tools: "\uD83D\uDD27",
        Garden: "\uD83C\uDF3F",
        "Pet Supplies": "\uD83D\uDC3E",
      },
      fallbackCategoryIds = {
        Electronics: "1",
        Mobiles: "2",
        Fashion: "3",
        Furniture: "4",
        Vehicles: "5",
        Books: "6",
        Beauty: "7",
        Sports: "8",
        "Home Appliances": "9",
        Grocery: "10",
      },
      fallbackCategoryList = Object.keys(Le).map((e) => ({
        name: e,
        category_id: fallbackCategoryIds[e] || e,
      })),
      categoryList =
        Array.isArray(categoryModeCategories) && categoryModeCategories.length > 0
          ? categoryModeCategories
          : fallbackCategoryList,
      [f, O] = useState([]),
      postsRef = useRef(f),
      [V, z] = useState(null),
      [E, R] = useState(!1),
      [L, T] = useState(1),
      [H, ee] = useState(!0),
      [Pe, Ce] = useState(0),
      [_refreshKey, _setRefreshKey] = useState(0),
      [shuffleSeed, setShuffleSeed] = useState(() => {
        if (
          typeof window === "undefined" ||
          typeof performance === "undefined"
        ) {
          return null;
        }
        try {
          const navEntries =
            typeof performance.getEntriesByType === "function"
              ? performance.getEntriesByType("navigation")
              : [];
          const navType = navEntries?.[0]?.type;
          if (navType === "reload") {
            return Date.now();
          }
        } catch {
          // ignore
        }
        const legacy = performance.navigation?.type;
        return legacy === 1 ? Date.now() : null;
      }),
      q = 6,
      y = useNavigate(),
      P = useRef(0),
      v = useRef(null),
      loadMoreScrollRef = useRef(null),
      loadMorePendingRef = useRef(!1),
      loadMoreCooldownRef = useRef(0),
      initialFilterSyncRef = useRef(!1),
      filterSyncScrollRef = useRef(null),
      loadMoreSentinelRef = useRef(null),
      scrollGuardRef = useRef(null),
      userFilterChangeRef = useRef(!1);
    useEffect(() => {
      const e = new URLSearchParams(Z.search),
        categoryIdParam = e.get("category_id") || e.get("categoryId") || "",
        legacyCategory = e.get("category") || "";
      let o = "";
      if (categoryIdParam && categoryList.length > 0) {
        const i = categoryList.find(
          (p) =>
            String(p.category_id) === String(categoryIdParam) ||
            String(p.id) === String(categoryIdParam),
        );
        o = i?.name || String(categoryIdParam);
      }
      if (!o && legacyCategory) {
        if (!isNaN(parseInt(legacyCategory, 10)) && categoryList.length > 0) {
          const i = categoryList.find(
            (p) =>
              String(p.category_id) === String(legacyCategory) ||
              String(p.id) === String(legacyCategory),
          );
          o = i?.name || String(legacyCategory);
        } else {
          o = legacyCategory;
        }
      }
      const subIdParam = e.get("subcategory_id") || e.get("subcategoryId") || "";
      const subParam = e.get("subcategory") || "";
      const lookupName = subcategoryNameById[String(subIdParam || "").trim()];
      const resolvedSubcategory =
        lookupName || subParam || subIdParam || "All";
      const rawCategoryGroup =
        e.get("category_group") || e.get("categoryGroup") || e.get("group") || "";
      let nextCategoryGroup = o && o !== "All" ? "" : rawCategoryGroup;
      if (!nextCategoryGroup && !initialFilterSyncRef.current) {
        const normalizedActiveApp = activeApp ? String(activeApp).trim().toLowerCase() : "";
        if (normalizedActiveApp) {
          nextCategoryGroup = normalizedActiveApp;
        }
      }
      m((n) => {
        const next = { ...n };
        let changed = false;
        const nextCategory = o;
        if (next.category !== nextCategory) {
          next.category = nextCategory;
          changed = true;
        }
        const nextSubcategory = resolvedSubcategory || "All";
        if (next.subcategory !== nextSubcategory) {
          next.subcategory = nextSubcategory;
          changed = true;
        }
        if (next.categoryGroup !== nextCategoryGroup) {
          next.categoryGroup = nextCategoryGroup;
          changed = true;
        }
        const nextSearch = e.get("search") || "";
        if (next.search !== nextSearch) {
          next.search = nextSearch;
          changed = true;
        }
        const nextLocation = e.get("location") || "";
        if (next.location !== nextLocation) {
          next.location = nextLocation;
          changed = true;
        }
        const nextMinPrice = e.get("minPrice") || "";
        if (next.minPrice !== nextMinPrice) {
          next.minPrice = nextMinPrice;
          changed = true;
        }
        const nextMaxPrice = e.get("maxPrice") || "";
        if (next.maxPrice !== nextMaxPrice) {
          next.maxPrice = nextMaxPrice;
          changed = true;
        }
        const nextStartDate = e.get("startDate") || "";
        if (next.startDate !== nextStartDate) {
          next.startDate = nextStartDate;
          changed = true;
        }
        const nextEndDate = e.get("endDate") || "";
        if (next.endDate !== nextEndDate) {
          next.endDate = nextEndDate;
          changed = true;
        }
        const nextLatestWindow = e.get("latestWindow") || "";
        if (next.latestWindow !== nextLatestWindow) {
          next.latestWindow = nextLatestWindow;
          changed = true;
        }
        const nextSortBy = e.get("sortBy") || n.sortBy || "";
        if (next.sortBy !== nextSortBy) {
          next.sortBy = nextSortBy;
          changed = true;
        }
        return changed ? next : n;
      });
      initialFilterSyncRef.current = !0;
    }, [Z.search, categoryList, m, subcategoryNameById, hasCategoryMode, activeApp]);
    useEffect(() => {
      if (categoryModeLoading) return;
      if (hasCategoryMode) return;
      // Guard: use window.location.pathname (always current) instead of the stale
      // Z.pathname closure value. When React Router calls pushState then schedules
      // a React re-render, effects may fire with the OLD Z.pathname before the
      // component re-renders — checking window.location catches this.
      const livePathname = typeof window !== 'undefined' ? window.location.pathname : Z.pathname;
      if (!livePathname.startsWith('/all-posts') && !livePathname.startsWith('/listings') && !livePathname.startsWith('/for-you')) return;
      const effectiveBasePath = isForYouMode ? '/for-you' : '/all-posts';
      const params = new URLSearchParams(Z.search);
      const currentGroup =
        params.get("category_group") || params.get("categoryGroup") || params.get("group") || "";
      if (!currentGroup) return;
      const nextGroup = currentGroup || "";
      m((n) => {
        let changed = !1;
        const next = { ...n };
        if (n.categoryGroup !== nextGroup) {
          next.categoryGroup = nextGroup;
          changed = !0;
        }
        if (nextGroup) {
          if (n.category !== "All") {
            next.category = "All";
            changed = !0;
          }
        }
        return changed ? next : n;
      });
      if (currentGroup === nextGroup) return;
      params.delete("category_group");
      params.delete("categoryGroup");
      params.delete("group");
      if (nextGroup) {
        params.set("category_group", nextGroup);
      }
      const nextQuery = params.toString();
      const nextUrl = nextQuery ? `${effectiveBasePath}?${nextQuery}` : effectiveBasePath;
      if (`${livePathname}${Z.search}` !== nextUrl) {
        y(nextUrl, { replace: !0, state: { preserveScroll: !0 } });
      }
    }, [
      basePath,
      isForYouMode,
      categoryModeLoading,
      hasCategoryMode,
      Z.pathname,
      Z.search,
      y,
      m,
    ]);
    useEffect(() => {
      if (categoryModeLoading) return;
      if (!hasCategoryMode) return;
      // Guard: use window.location.pathname (always current) instead of the stale
      // Z.pathname closure value. When React Router calls pushState then schedules
      // a React re-render, effects may fire with the OLD Z.pathname before the
      // component re-renders — checking window.location catches this.
      const livePathname = typeof window !== 'undefined' ? window.location.pathname : Z.pathname;
      if (!livePathname.startsWith('/all-posts') && !livePathname.startsWith('/listings') && !livePathname.startsWith('/for-you')) return;
      const effectiveBasePath = isForYouMode ? '/for-you' : '/all-posts';
      const nextCategory = categoryModeCategory?.name || "";
      const normalizedCategory = nextCategory && nextCategory !== "All" ? nextCategory : "";
      const normalizedActiveApp = activeApp ? String(activeApp).trim().toLowerCase() : "";
      const nextCategoryGroup = !normalizedCategory && normalizedActiveApp ? normalizedActiveApp : "";
      const nextCategoryId =
        categoryModeCategory?.id ||
        categoryModeCategory?.category_id ||
        (normalizedCategory
          ? categoryModeCategories.find(
              (p) => normalizeName(p?.name) === normalizeName(normalizedCategory),
            )?.category_id
          : "") ||
        "";
      const nextSubcategory = categoryModeSubcategory?.name || "All";
      let shouldPreserveScroll = !1;
      m((n) => {
        let changed = !1;
        const next = { ...n };
        if (normalizedCategory && n.category !== normalizedCategory) {
          next.category = normalizedCategory;
          changed = !0;
        }
        if (normalizedCategory && n.categoryGroup) {
          next.categoryGroup = "";
          changed = !0;
        }
        if (!normalizedCategory && nextCategoryGroup && n.categoryGroup !== nextCategoryGroup) {
          next.categoryGroup = nextCategoryGroup;
          changed = !0;
        }
        if (!normalizedCategory && nextCategoryGroup && n.category !== "All") {
          next.category = "All";
          changed = !0;
        }
        if (nextSubcategory && n.subcategory !== nextSubcategory) {
          next.subcategory = nextSubcategory;
          changed = !0;
        }
        if (!nextSubcategory && n.subcategory && n.subcategory !== "All") {
          next.subcategory = "All";
          changed = !0;
        }
        if (changed) {
          shouldPreserveScroll =
            typeof window !== "undefined" && (window.scrollY || 0) > 120;
        }
        return changed ? next : n;
      });
      if (shouldPreserveScroll && filterSyncScrollRef.current == null) {
        filterSyncScrollRef.current = window.scrollY || 0;
      }
      const params = new URLSearchParams(Z.search);
      let shouldReplace = !1;
      if (nextCategoryId && params.get("category_id") !== String(nextCategoryId)) {
        params.set("category_id", String(nextCategoryId));
        shouldReplace = !0;
      }
      if (params.has("category")) {
        params.delete("category");
        shouldReplace = !0;
      }
      if (nextCategoryId) {
        if (params.has("category_group")) {
          params.delete("category_group");
          shouldReplace = !0;
        }
      } else if (nextCategoryGroup) {
        if (params.get("category_group") !== String(nextCategoryGroup)) {
          params.set("category_group", String(nextCategoryGroup));
          shouldReplace = !0;
        }
      } else if (params.has("category_group")) {
        params.delete("category_group");
        shouldReplace = !0;
      }
      if (nextSubcategory && nextSubcategory !== "All") {
        const resolvedId = subcategoryIdByName[normalizeName(nextSubcategory)];
        if (resolvedId) {
          params.set("subcategory_id", String(resolvedId));
        }
        params.delete("subcategory");
        shouldReplace = !0;
      } else if (params.has("subcategory") || params.has("subcategory_id")) {
        params.delete("subcategory");
        params.delete("subcategory_id");
        shouldReplace = !0;
      }
      if (isForYouMode && params.get("mode") !== "for-you") {
        params.set("mode", "for-you");
        shouldReplace = !0;
      }
      if (!isForYouMode && params.has("mode")) {
        params.delete("mode");
        shouldReplace = !0;
      }
      if (shouldReplace) {
        const nextQuery = params.toString();
        const nextUrl = nextQuery ? `${effectiveBasePath}?${nextQuery}` : effectiveBasePath;
        if (`${livePathname}${Z.search}` !== nextUrl) {
          y(nextUrl, { replace: !0, state: { preserveScroll: !0 } });
        }
      }
    }, [
      categoryModeLoading,
      hasCategoryMode,
      categoryModeCategory?.id,
      categoryModeCategory?.category_id,
      categoryModeCategory?.name,
      categoryModeSubcategory?.name,
      categoryModeCategories,
      activeApp,
      basePath,
      isForYouMode,
      Z.pathname,
      Z.search,
      y,
      m,
      subcategoryIdByName,
    ]);
    const [De, oe] = useState({}),
      [ne, M] = useState(""),
      [Ie, le] = useState(!1),
      [G, ie] = useState(null),
      [menuPostId, setMenuPostId] = useState(null),
      [expandedMetaPostId, setExpandedMetaPostId] = useState(null),
      [savedPosts, setSavedPosts] = useState(() => getSavedPostsMap()),
      [shareDialogOpen, setShareDialogOpen] = useState(!1),
      [shareDialogUrl, setShareDialogUrl] = useState(""),
      [promotePostId, setPromotePostId] = useState(null),
      [promotePostTitle, setPromotePostTitle] = useState(""),
      [loginPromptOpen, setLoginPromptOpen] = useState(!1),
      [carouselIndexByPost, setCarouselIndexByPost] = useState({}),
      de = useRef({}),
      carouselTrackRefs = useRef({}),
      C = useMemo(() => rt($), [$]);
    const currentUserId = tt($);
    // Server-side preference subcategories for For You mode. Profile.jsx only
    // writes the localStorage "userPreferences" key for the DEMO user; real
    // users' preferences are stored on the server (/profile/preferences). Without
    // merging these here, subcategory_ids is never appended for real users and the
    // backend returns the full unfiltered feed (cars leak into Electronics, etc.).
    const [serverPrefSubcats, setServerPrefSubcats] = useState([]);
    useEffect(() => {
      if (!isForYouMode || !C || !currentUserId) {
        setServerPrefSubcats([]);
        return;
      }
      let active = true;
      fetchUserPreferencesCached({ userId: currentUserId })
        .then((data) => {
          if (!active) return;
          const subs = Array.isArray(data?.subcategories)
            ? data.subcategories
            : Array.isArray(data?.categories)
              ? data.categories
              : [];
          setServerPrefSubcats(Array.isArray(subs) ? subs : []);
        })
        .catch(() => {
          if (active) setServerPrefSubcats([]);
        });
      return () => {
        active = false;
      };
    }, [isForYouMode, C, currentUserId]);
    const {
      addItem: addCartItem,
      removeItem: removeCartItem,
      isInCart: isInCartItem,
    } = mt();
    const [, setIsLiveSyncing] = useState(!1),
      [lastLiveSyncAt, setLastLiveSyncAt] = useState(Date.now()),
      [navStickyTop, setNavStickyTop] = useState(68),
      [, setSecondaryStickyHeight] = useState(0),
      [filterPulse, setFilterPulse] = useState(!1),
      [updatedPulse, setUpdatedPulse] = useState(!1),
      [autoRefreshEnabled, setAutoRefreshEnabled] = useState(!1),
      [showBackToTop, setShowBackToTop] = useState(!1),
      [filterPanelOpen, setFilterPanelOpen] = useState(!1),
      [showAllQuickFilters, setShowAllQuickFilters] = useState(!1),
      [compareItems, setCompareItems] = useState([]),
      [showComparePanel, setShowComparePanel] = useState(!1),
      [isStalledLoading, setIsStalledLoading] = useState(!1),
      [forYouHeroExpanded, setForYouHeroExpanded] = useState(!1);
    const { density, setDensity } = usePageDensity("mhub_allposts_density");
    const languageRef = useRef(l);
    const stalledLoadingStartedAtRef = useRef(null);
    const secondaryStickyRef = useRef(null);
    const pageMaxWidthClass = "max-w-[640px]";
    const feedMaxWidthClass = "max-w-[640px]";
    const formatCurrency = useCallback(
      (e) => `\u20B9${ot(e).toLocaleString("en-IN")}`,
      [],
    );
    const tr = useCallback(
      (key, fallback) => {
        const value = s(key, { defaultValue: fallback || key });
        return value;
      },
      [s],
    );
    const markTranslatedPosts = useCallback((posts, lang) => {
      if (!Array.isArray(posts)) return posts;
      return posts.map((post) => {
        if (!post || typeof post !== "object") return post;
        return { ...post, _translatedLang: lang };
      });
    }, []);
    const stripTranslatedMarker = useCallback((posts) => {
      if (!Array.isArray(posts)) return posts;
      return posts.map((post) => {
        if (!post || typeof post !== "object") return post;
        if (!Object.prototype.hasOwnProperty.call(post, "_translatedLang")) {
          return post;
        }
        const rest = { ...post };
        delete rest._translatedLang;
        return rest;
      });
    }, []);
    const openPromote = useCallback((postId, title) => {
      if (!postId) return;
      setPromotePostId(String(postId));
      setPromotePostTitle(String(title || ""));
    }, []);
    const closePromote = useCallback(() => {
      setPromotePostId(null);
      setPromotePostTitle("");
    }, []);
    useEffect(() => {
      if (typeof document === "undefined") return;
      const baseTitle = isForYouMode
        ? tr("for_you", "For You")
        : s("all_posts");
      const resolvedCategoryTitle =
        hasCategoryMode && categoryModeCategory?.name
          ? categoryModeCategory.name
          : t.category;
      const rawSubcategoryTitle =
        categoryModeSubcategory?.name || t.subcategory || "All";
      const resolvedSubcategoryTitle =
        !rawSubcategoryTitle || rawSubcategoryTitle === "All"
          ? ""
          : /^\d+$/.test(String(rawSubcategoryTitle))
            ? subcategoryNameById[String(rawSubcategoryTitle)] || rawSubcategoryTitle
            : rawSubcategoryTitle;
      const resolvedBreadcrumbTitle =
        resolvedCategoryTitle && resolvedCategoryTitle !== "All"
          ? resolvedSubcategoryTitle
            ? `${resolvedCategoryTitle} > ${resolvedSubcategoryTitle}`
            : resolvedCategoryTitle
          : "";
      const nextTitle = resolvedBreadcrumbTitle
        ? `${resolvedBreadcrumbTitle} - ${baseTitle}`
        : baseTitle;
      document.title = nextTitle;
    }, [
      categoryModeCategory?.name,
      categoryModeSubcategory?.name,
      hasCategoryMode,
      isForYouMode,
      s,
      subcategoryNameById,
      t.category,
      t.subcategory,
      tr,
    ]);
    useEffect(() => {
      languageRef.current = l;
    }, [l]);
    useEffect(() => {
      postsRef.current = f;
    }, [f]);
    useEffect(() => {
      const currentPosts = postsRef.current;
      if (!Array.isArray(currentPosts) || currentPosts.length === 0) return;
      const normalizedLang = String(l || "en")
        .trim()
        .toLowerCase()
        .split("-")[0];
      const hasTranslationMarker = currentPosts.some(
        (post) => post && typeof post === "object" && post._translatedLang,
      );
      if (!normalizedLang || normalizedLang === "en") {
        if (hasTranslationMarker) {
          O((a) =>
            stripTranslatedMarker(
              Array.isArray(a) ? a.map(restoreTranslatedPost) : a,
            ),
          );
        }
        return;
      }
      const alreadyTranslated = currentPosts.every(
        (post) =>
          post &&
          typeof post === "object" &&
          post._translatedLang === normalizedLang,
      );
      if (alreadyTranslated) return;
      let e = !1;
      const a = markTranslatedPosts(
        Ue(currentPosts, normalizedLang, { paths: ALL_POSTS_TRANSLATE_PATHS }),
        normalizedLang,
      );
      O(a);
      Re(currentPosts, normalizedLang, { paths: ALL_POSTS_TRANSLATE_PATHS })
        .then((o) => {
          if (e) return;
          const next =
            Array.isArray(o) && o.length > 0
              ? markTranslatedPosts(o, normalizedLang)
              : a;
          O(next);
        })
        .catch(() => {
          if (!e) O(a);
        });
      return () => {
        e = !0;
      };
      // Only re-run when language changes, NOT when posts change
      // Posts changes are tracked via postsRef to avoid render loops
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [l]);
    useEffect(() => {
      if (typeof window !== "undefined") {
        const ua = String(window.navigator?.userAgent || "").toLowerCase();
        const isNativeReplica =
          ua.includes("mhubandroidwebreplica") ||
          (ua.includes("android") && /\bwv\b/.test(ua));
        if (isNativeReplica) {
          sessionStorage.removeItem("allPostsScrollPosition");
          return;
        }
      }
      const e = sessionStorage.getItem("allPostsScrollPosition");
      e &&
        f.length > 0 &&
        requestAnimationFrame(() => {
          window.scrollTo(0, parseInt(e, 10)),
            sessionStorage.removeItem("allPostsScrollPosition");
        });
    }, [f.length]),
      useEffect(() => subscribeSavedPosts(setSavedPosts), []),
      useEffect(() => {
        if (!C) return;
        let e = !1;
        (async () => {
          try {
            const a = tt($);
            const n = await fetchWishlistIds(() =>
              a ? A.get("/wishlist", { params: { userId: a } }) : A.get("/wishlist"),
            );
            if (e) return;
            setSavedPosts(buildSavedPostsMap(n));
          } catch {
            // Keep the last known local saved state.
          }
        })();
        return () => {
          e = !0;
        };
      }, [C, $]),
    useEffect(() => {
      if (typeof window > "u" || typeof document > "u") return;
      let e = null;
      const a = () => {
        const o = document.querySelector("nav[aria-label='main_navigation']");
        const n = Math.ceil(o?.getBoundingClientRect().height || 68);
        setNavStickyTop(Math.max(56, n));
      };
      a();
      window.addEventListener("resize", a);
      const o = document.querySelector("nav[aria-label='main_navigation']");
      if (o && typeof window.ResizeObserver < "u") {
        e = new window.ResizeObserver(a);
        e.observe(o);
      }
      return () => {
        window.removeEventListener("resize", a);
        e?.disconnect();
      };
    }, []);
    useEffect(() => {
      if (C) {
        setLoginPromptOpen(!1);
        return;
      }
      setShuffleSeed(null);
    }, [C]);
    // Login prompt is shown only on explicit user actions (wishlist, shuffle, etc.)
    // Removed aggressive scroll-based auto-trigger which caused the prompt to overlap
    // quick filters and bottom nav tabs on small Android screens.
    useEffect(() => {
      if (typeof window > "u") return;
      const e = () => {
        const a = window.scrollY || 0;
        setShowBackToTop(a > 520);
      };
      window.addEventListener("scroll", e, { passive: !0 });
      e();
      return () => {
        window.removeEventListener("scroll", e);
      };
    }, []);
    const ce = useMemo(
        () =>
          categoryList.reduce(
            (e, a) => {
              const key = normalizeName(a?.name);
              if (key) {
                e[key] = a?.category_id || a?.id || a?.name;
              }
              return e;
            },
            {},
          ),
        [categoryList],
      ),
      categoryNameById = useMemo(() => {
        const e = {};
        categoryList.forEach((a) => {
          const o = a?.category_id ?? a?.id ?? null;
          if (o == null) return;
          e[String(o)] = a?.name || "";
        });
        return e;
      }, [categoryList]),
      Q = useMemo(
        () =>
          typeof window > "u"
            ? ""
            : localStorage.getItem("mhub_user_city") || "",
        [],
      ),
      latestWindow = useMemo(
        () => normalizeLatestWindow(t.latestWindow),
        [t.latestWindow],
      ),
      secondaryStickyTop = useMemo(
        () => Math.max(56, navStickyTop + 2),
        [navStickyTop],
      ),
      canShuffle = useMemo(
        () => !t.sortBy && !latestWindow,
        [t.sortBy, latestWindow],
      ),
      me = useCallback(
        (e) => {
          const a = new URLSearchParams();
          return (
            isForYouMode && a.set("mode", "for-you"),
            e.search && a.set("search", e.search),
            e.category &&
              e.category !== "All" &&
              (() => {
                const resolvedCategoryId = ce[normalizeName(e.category)] || e.category;
                if (resolvedCategoryId) {
                  a.set("category_id", String(resolvedCategoryId));
                }
              })(),
            e.categoryGroup &&
              (!e.category || e.category === "All") &&
              a.set("category_group", e.categoryGroup),
            e.subcategory && e.subcategory !== "All" && (() => {
              const rawSubcategory = String(e.subcategory || "").trim();
              if (!rawSubcategory) return;
              const isNumeric = /^\d+$/.test(rawSubcategory);
              const resolvedSubcategoryId = isNumeric
                ? rawSubcategory
                : subcategoryIdByName[normalizeName(rawSubcategory)];
              if (resolvedSubcategoryId) {
                a.set("subcategory_id", String(resolvedSubcategoryId));
              } else {
                a.set("subcategory", rawSubcategory);
              }
            })(),
            e.location && a.set("location", e.location),
            e.minPrice && a.set("minPrice", e.minPrice),
            e.maxPrice && a.set("maxPrice", e.maxPrice),
            e.startDate && a.set("startDate", e.startDate),
            e.endDate && a.set("endDate", e.endDate),
            e.latestWindow &&
              normalizeLatestWindow(e.latestWindow) &&
              a.set(
                "latestWindow",
                String(normalizeLatestWindow(e.latestWindow)),
              ),
            e.sortBy && a.set("sortBy", e.sortBy),
            a.toString()
          );
        },
        [isForYouMode, subcategoryIdByName, ce],
      ),
      b = useCallback(
        (e) => {
          const a = { ...t, ...e };
          userFilterChangeRef.current = !0;
          m(a), T(1);
          const o = me(a);
          const nextUrl = o ? `${basePath}?${o}` : basePath;
          if (`${Z.pathname}${Z.search}` !== nextUrl) {
            y(nextUrl);
          }
        },
        [me, t, y, m, basePath, Z.pathname, Z.search],
      ),
      Ee = useCallback(() => {
        if (hasCategoryMode) {
          clearSubcategoryMode();
        }
        b({ subcategory: "All" });
      }, [b, hasCategoryMode, clearSubcategoryMode]),
      handleSubcategoryBarSelect = useCallback(
        (e, a) => {
          const subcategoryName =
            typeof e === "string" ? e : a?.name || a?.subcategory_name || "";
          const parentCategoryId =
            a?.parent_category_id ||
            a?.category_id ||
            categoryModeCategory?.id ||
            categoryModeCategory?.category_id ||
            "";
          const parentCategoryName =
            a?.parent_category_name ||
            a?.category_name ||
            categoryNameById[String(parentCategoryId)] ||
            "";
          const currentCategoryLabel =
            hasCategoryMode && categoryModeCategory?.name
              ? categoryModeCategory.name
              : t.category;
          const shouldKeepCategory =
            !!currentCategoryLabel && currentCategoryLabel !== "All";
          const shouldApplyParentCategory =
            !!parentCategoryName &&
            (!currentCategoryLabel ||
              currentCategoryLabel === "All" ||
              normalizeName(currentCategoryLabel) !== normalizeName(parentCategoryName));
          const currentSubcategory =
            categoryModeSubcategory?.name || t.subcategory || "All";
          const currentSubcategoryId = (() => {
            const raw =
              categoryModeSubcategory?.id ||
              (typeof t.subcategory === "string" && /^\d+$/.test(t.subcategory)
                ? t.subcategory
                : "");
            return raw ? String(raw) : "";
          })();
          const nextSubcategoryId = (() => {
            const raw = a?.subcategory_id ?? a?.id ?? null;
            if (raw == null || raw === "") return "";
            const normalized = String(raw);
            return /^\d+$/.test(normalized) ? normalized : "";
          })();
          const isSameSubcategory =
            (currentSubcategoryId &&
              nextSubcategoryId &&
              currentSubcategoryId === nextSubcategoryId) ||
            normalizeName(currentSubcategory) === normalizeName(subcategoryName);
          if (isSameSubcategory && currentSubcategory !== "All") {
            if (hasCategoryMode) {
              clearSubcategoryMode();
            }
            b({ subcategory: "All" });
            return;
          }
          const resolvedSubcategoryValue =
            nextSubcategoryId || subcategoryName || "All";
          if (hasCategoryMode) {
            if (shouldApplyParentCategory) {
              selectCategoryMode({
                name: parentCategoryName,
                category_id: parentCategoryId || null,
                id: parentCategoryId || null,
              });
            }
            if (a) {
              selectSubcategoryMode({
                ...a,
                category_id: parentCategoryId || a?.category_id || null,
                category_name: parentCategoryName || a?.category_name || "",
              });
            } else {
              selectSubcategoryMode({
                name: subcategoryName,
                category_id: parentCategoryId || null,
                category_name: parentCategoryName || "",
              });
            }
          }
          const nextCategoryLabel = shouldApplyParentCategory
            ? parentCategoryName
            : shouldKeepCategory
              ? currentCategoryLabel
              : "All";
          logCategoryFlow("select-subcategory", {
            subcategoryName,
            nextSubcategoryId,
            parentCategoryId,
            parentCategoryName,
            currentCategoryLabel,
            nextCategoryLabel,
            categoryGroup: t.categoryGroup,
            hasCategoryMode,
          });
          b({
            category: nextCategoryLabel,
            categoryGroup:
              nextCategoryLabel && nextCategoryLabel !== "All" ? "" : t.categoryGroup,
            subcategory: resolvedSubcategoryValue,
          });
        },
        [
          b,
          t.category,
          t.subcategory,
          t.categoryGroup,
          hasCategoryMode,
          selectCategoryMode,
          selectSubcategoryMode,
          clearSubcategoryMode,
          categoryNameById,
          categoryModeCategory?.id,
          categoryModeCategory?.category_id,
          categoryModeCategory?.name,
          categoryModeSubcategory?.id,
          categoryModeSubcategory?.name,
          logCategoryFlow,
        ],
      ),
      handleCategoryBarSelect = useCallback(
        (e, a) => {
          const categoryName =
            typeof e === "string" ? e : a?.name || a?.category_name || "";
          const categoryId =
            a?.category_id || a?.id || ce[normalizeName(categoryName)] || "";
          if (hasCategoryMode) {
            selectCategoryMode({
              name: categoryName,
              category_id: categoryId || null,
              id: categoryId || null,
            });
            clearSubcategoryMode();
          }
          b({
            category: categoryName || "All",
            subcategory: "All",
            categoryGroup: "",
          });
        },
        [b, hasCategoryMode, selectCategoryMode, clearSubcategoryMode, ce],
      ),
      handleCategoryBarSelectAll = useCallback(() => {
        if (hasCategoryMode) {
          clearCategoryMode();
          clearSubcategoryMode();
        }
        b({ category: "All", subcategory: "All", categoryGroup: "" });
      }, [b, hasCategoryMode, clearCategoryMode, clearSubcategoryMode]),
      jee = useCallback(
        (e) => {
          const a = String(e);
          if (String(t.latestWindow || "") === a) {
            b({ latestWindow: "", sortBy: "" });
            return;
          }
          b({
            latestWindow: a,
            sortBy: "date_desc",
            startDate: "",
            endDate: "",
          });
        },
        [b, t.latestWindow],
      ),
      Y = useCallback(() => {
        m(st), T(1), y(isForYouMode ? `${basePath}?mode=for-you` : basePath);
      }, [y, m, basePath, isForYouMode]),
      Te = useCallback(
        (e) => {
          if (e === "subcategory") {
            clearSubcategoryMode();
            b({ subcategory: "All" });
            return;
          }
          if (e === "categoryGroup") {
            b({ categoryGroup: "" });
            return;
          }
          if (e === "category" && hasCategoryMode) {
            clearCategoryMode();
            clearSubcategoryMode();
          }
          if (e === "price") {
            b({ minPrice: "", maxPrice: "", priceRange: "" });
            return;
          }
          if (e === "date") {
            b({ startDate: "", endDate: "" });
            return;
          }
          if (e === "latestWindow") {
            b({ latestWindow: "", sortBy: "" });
            return;
          }
          if (e === "verifiedOnly") {
            b({ verifiedOnly: !1 });
            return;
          }
          b({ [e]: e === "category" ? "All" : "" });
        },
        [b, clearSubcategoryMode, hasCategoryMode, clearCategoryMode],
      ),
      handleApplyFilters = useCallback(
        (panelFilters) => {
          b({
            search: panelFilters.search || "",
            location: panelFilters.location || "",
            minPrice: panelFilters.minPrice || "",
            maxPrice: panelFilters.maxPrice || "",
            startDate: panelFilters.startDate || "",
            endDate: panelFilters.endDate || "",
            condition: panelFilters.condition || "",
            verifiedOnly: !!panelFilters.verifiedOnly,
            sortBy: panelFilters.sortBy || "",
            postType: panelFilters.postType || "",
          });
        },
        [b],
      ),
      effectiveCategoryLabel = hasCategoryMode && categoryModeCategory?.name
        ? categoryModeCategory.name
        : t.category,
      hasActiveCategory =
        !!effectiveCategoryLabel && effectiveCategoryLabel !== "All",
      activeSubcategoryLabel = (() => {
        const rawLabel = categoryModeSubcategory?.name || t.subcategory || "All";
        if (!rawLabel || rawLabel === "All") return "All";
        if (/^\d+$/.test(String(rawLabel))) {
          return subcategoryNameById[String(rawLabel)] || rawLabel;
        }
        return rawLabel;
      })(),
      activeCategoryId = (() => {
        if (!hasActiveCategory) return "";
        const directId = categoryModeCategory?.id || categoryModeCategory?.category_id;
        if (directId != null && directId !== "") return String(directId);
        const mapId = ce[normalizeName(effectiveCategoryLabel)];
        if (mapId != null && mapId !== "") return String(mapId);
        const normLabel = normalizeName(effectiveCategoryLabel);
        const match = (Array.isArray(categoryList) ? categoryList : []).find(
          (entry) => normalizeName(entry?.name || entry?.title || entry?.label || entry?.category_name) === normLabel,
        );
        return match?.category_id || match?.id || "";
      })(),
      activeAppMatcher = useMemo(
        () => buildActiveAppMatcher(t.categoryGroup, categoryModeCategories),
        [t.categoryGroup, categoryModeCategories],
      ),
      appScopedCategoryList = useMemo(() => {
        if (!activeAppMatcher?.activeApp) {
          return categoryList;
        }
        return categoryList.filter((entry) => {
          const id = entry?.category_id || entry?.id;
          if (id != null && activeAppMatcher.categoryIds.has(String(id))) {
            return !0;
          }
          const name = normalizeName(entry?.name || entry?.title || entry?.label || "");
          return !!name && activeAppMatcher.categoryNames.has(name);
        });
      }, [categoryList, activeAppMatcher]),
      allPostsSubcategoryBarList = useMemo(() => {
        const normActiveLabel = normalizeName(effectiveCategoryLabel);
        const scopedCategories = (Array.isArray(appScopedCategoryList) ? appScopedCategoryList : []).filter(
          (entry) => {
            if (!hasActiveCategory) return !0;
            const id = entry?.category_id || entry?.id || null;
            if (activeCategoryId && id != null && String(id) === String(activeCategoryId)) {
              return !0;
            }
            const name = normalizeName(entry?.name || entry?.title || entry?.label || "");
            return normActiveLabel && name === normActiveLabel;
          },
        );
        const flattenedFromCategories = scopedCategories
          .flatMap((entry) =>
            (Array.isArray(entry?.subcategories) ? entry.subcategories : []).map((sub) => ({
              id:
                sub?.subcategory_id ||
                sub?.id ||
                `${entry?.category_id || entry?.id || "cat"}-${sub?.name || sub?.subcategory_name || ""}`,
              name: sub?.name || sub?.subcategory_name || "",
              post_count: sub?.post_count ?? sub?.count ?? 0,
              display_order: sub?.display_order ?? 0,
              parent_category_id: sub?.category_id || entry?.category_id || entry?.id || null,
              parent_category_name: sub?.category_name || entry?.name || entry?.title || "",
              category_id: sub?.category_id || entry?.category_id || entry?.id || null,
              category_name: sub?.category_name || entry?.name || entry?.title || "",
              icon_url: sub?.icon_url || sub?.iconUrl || "",
            })),
          )
          .filter((entry) => String(entry?.name || "").trim());
        const baseList =
          flattenedFromCategories.length > 0
            ? flattenedFromCategories
            : (Array.isArray(sortedSubcategories) ? sortedSubcategories : [])
                .filter((entry) => {
                  const categoryId = entry?.category_id || null;
                  if (hasActiveCategory) {
                    if (activeCategoryId && String(categoryId || "") === String(activeCategoryId)) {
                      return !0;
                    }
                    const categoryName = normalizeName(entry?.category_name || "");
                    return normActiveLabel && categoryName === normActiveLabel;
                  }
                  if (!activeAppMatcher?.activeApp) return !0;
                  if (categoryId != null && activeAppMatcher.categoryIds.has(String(categoryId))) {
                    return !0;
                  }
                  const categoryName = normalizeName(entry?.category_name || "");
                  return !!categoryName && activeAppMatcher.categoryNames.has(categoryName);
                })
                .map((entry) => ({
                  id:
                    entry?.subcategory_id ||
                    entry?.id ||
                    `${entry?.category_id || "cat"}-${entry?.name || entry?.subcategory_name || ""}`,
                  name: entry?.name || entry?.subcategory_name || "",
                  post_count: entry?.post_count ?? entry?.count ?? 0,
                  display_order: entry?.display_order ?? 0,
                  parent_category_id: entry?.category_id || null,
                  parent_category_name: entry?.category_name || "",
                  category_id: entry?.category_id || null,
                  category_name: entry?.category_name || "",
                  icon_url: entry?.icon_url || entry?.iconUrl || "",
                }));
        return baseList.sort((a, o) => {
          const orderDiff = Number(a?.display_order ?? 0) - Number(o?.display_order ?? 0);
          if (orderDiff !== 0) return orderDiff;
          const countDiff = Number(o?.post_count ?? 0) - Number(a?.post_count ?? 0);
          if (countDiff !== 0) return countDiff;
          return String(a?.name || "").localeCompare(String(o?.name || ""), void 0, {
            sensitivity: "base",
          });
        });
      }, [appScopedCategoryList, sortedSubcategories, activeCategoryId, activeAppMatcher]),
      allPostsCategoryFallback = useMemo(() => {
        if (allPostsSubcategoryBarList.length > 0) return allPostsSubcategoryBarList;
        return (Array.isArray(categoryList) ? categoryList : [])
          .filter((c) => String(c?.name || "").trim())
          .map((c) => ({
            id: c?.category_id || c?.id || c?.name,
            name: c?.name || "",
            post_count: c?.product_count ?? c?.post_count ?? c?.count ?? 0,
            display_order: c?.display_order ?? 0,
          }));
      }, [allPostsSubcategoryBarList, categoryList]),
      browseOtherSubcategoriesPath = activeCategoryId
        ? `/subcategories?category_id=${encodeURIComponent(activeCategoryId)}`
        : "/subcategories",
      categoryTrail = hasActiveCategory ? effectiveCategoryLabel : "",
      subcategoryTrail =
        activeSubcategoryLabel && activeSubcategoryLabel !== "All"
          ? activeSubcategoryLabel
          : "",
      breadcrumbTitle = categoryTrail
        ? subcategoryTrail
          ? `${categoryTrail} > ${subcategoryTrail}`
          : categoryTrail
        : "",
      feedTitle = breadcrumbTitle
        ? isForYouMode
          ? `${tr("for_you", "For You")} · ${breadcrumbTitle}`
          : breadcrumbTitle
        : isForYouMode
          ? tr("for_you", "For You")
          : s("all_posts"),
      categoryModeLabel =
        categoryModeCategory?.name || effectiveCategoryLabel || tr("all", "All"),
      activeAppLabel =
        ({
          electronics: "Electronics",
          fashion: "Fashion",
          vehicles: "Vehicles",
          others: "Others",
        })[String(t.categoryGroup || "").trim().toLowerCase()] || "",
      activeCategoryBarLabel =
        hasActiveCategory && effectiveCategoryLabel && effectiveCategoryLabel !== "All"
          ? effectiveCategoryLabel
          : activeAppLabel || "All",
      showSubcategoryRail =
        allPostsSubcategoryBarList.length > 0 &&
        (hasActiveCategory ||
          (activeSubcategoryLabel && activeSubcategoryLabel !== "All")),
      showModeBanner = !1,
      dealsContextLabel = useMemo(
        () => {
          if (
            hasActiveCategory &&
            effectiveCategoryLabel &&
            effectiveCategoryLabel !== "All"
          ) {
            return `${tr("deals_in_category", "Deals in")} ${effectiveCategoryLabel}`;
          }
          return tr("deals_for_you", "Deals for you");
        },
        [hasActiveCategory, effectiveCategoryLabel, tr],
      ),
      ue = useMemo(
        () =>
          !!t.search ||
          !!t.location ||
          !!t.minPrice ||
          !!t.maxPrice ||
          !!t.startDate ||
          !!t.endDate ||
          !!t.condition ||
          !!t.verifiedOnly ||
          !!latestWindow ||
          !!t.sortBy ||
          hasActiveCategory ||
          !!t.categoryGroup ||
          !!(t.subcategory && t.subcategory !== "All"),
        [
          hasActiveCategory,
          t.categoryGroup,
          t.condition,
          t.subcategory,
          t.endDate,
          latestWindow,
          t.location,
          t.maxPrice,
          t.minPrice,
          t.search,
          t.sortBy,
          t.startDate,
          t.verifiedOnly,
        ],
      ),
      ge = useMemo(() => {
        const e = [];
        return (
          t.search &&
            e.push({
              key: "search",
              label: `${s("search", { defaultValue: "Search" })}: ${t.search}`,
            }),
          t.location &&
            e.push({
              key: "location",
              label: `${s("location", { defaultValue: "Location" })}: ${t.location}`,
            }),
          (t.minPrice || t.maxPrice) &&
            e.push({
              key: "price",
              label: `${s("price", { defaultValue: "Price" })}: ${t.minPrice || "0"} - ${
                t.maxPrice || s("any", { defaultValue: "any" })
              }`,
            }),
          (t.startDate || t.endDate) &&
            e.push({
              key: "date",
              label: `${s("date", { defaultValue: "Date" })}: ${
                t.startDate || s("any", { defaultValue: "any" })
              } ${s("to", { defaultValue: "to" })} ${t.endDate || s("any", { defaultValue: "any" })}`,
            }),
          t.condition &&
            e.push({
              key: "condition",
              label: `${s("condition", { defaultValue: "Condition" })}: ${
                t.condition === "new"
                  ? s("condition_new", { defaultValue: "New" })
                  : t.condition === "like_new"
                    ? s("condition_like_new", { defaultValue: "Like New" })
                    : t.condition === "good"
                      ? s("condition_good", { defaultValue: "Good" })
                      : t.condition === "fair"
                        ? s("condition_fair", { defaultValue: "Fair" })
                        : t.condition
              }`,
            }),
          t.verifiedOnly &&
            e.push({
              key: "verifiedOnly",
              label: s("verified_sellers_only", {
                defaultValue: "Verified sellers only",
              }),
            }),
          e
        );
      }, [
        s,
        t.condition,
        t.endDate,
        t.location,
        t.maxPrice,
        t.minPrice,
        t.search,
        t.startDate,
        t.verifiedOnly,
      ]),
      activeFiltersCount = useMemo(() => {
        let e = ge.length;
        return latestWindow && (e += 1), t.sortBy && (e += 1), e;
      }, [ge, latestWindow, t.sortBy]),
      requestLimit = latestWindow || q,
      be = useCallback(() => {
        const e = new URLSearchParams();
        const a = t.category;
        const o = t.search;
        if (
          (o && e.append("search", o),
          t.location && e.append("location", t.location),
          a && a !== "All")
        ) {
          const n = ce[normalizeName(a)] || a;
          e.append("category_id", n);
        }
        if (t.categoryGroup) {
          e.append("category_group", t.categoryGroup);
        }
        if (t.subcategory && t.subcategory !== "All") {
          const rawSubcategory = String(t.subcategory || "").trim();
          if (rawSubcategory) {
            const isNumeric = /^\d+$/.test(rawSubcategory);
            const resolvedSubcategoryId = isNumeric
              ? rawSubcategory
              : subcategoryIdByName[normalizeName(rawSubcategory)];
            if (resolvedSubcategoryId) {
              e.append("subcategory_id", String(resolvedSubcategoryId));
            } else {
              e.append("subcategory", rawSubcategory);
            }
          }
        } else if (isForYouMode) {
          let userSubcats = [];
          try {
            const rawUserPref = typeof window !== "undefined" ? localStorage.getItem("userPreferences") : null;
            if (rawUserPref) {
              const parsedPref = JSON.parse(rawUserPref);
              if (Array.isArray(parsedPref.subcategories)) {
                userSubcats = parsedPref.subcategories;
              }
            }
          } catch (_) {}
          // Merge server-side preferences (real users) with the demo/local value so
          // subcategory_ids is always appended — otherwise the feed stays unfiltered.
          if (Array.isArray(serverPrefSubcats) && serverPrefSubcats.length > 0) {
            const seen = new Set(userSubcats.map((subName) => normalizeName(subName)));
            serverPrefSubcats.forEach((subName) => {
              if (typeof subName !== "string") return;
              const key = normalizeName(subName);
              if (key && !seen.has(key)) {
                seen.add(key);
                userSubcats.push(subName);
              }
            });
          }
          if (userSubcats.length > 0) {
            // ── Category-scoped preference resolution (FIX) ────────────────────────
            // Resolve each preferred subcategory NAME against the full category catalog
            // (subcategoryCandidatesByName is built from categoryModeSubcategories AND
            // every category's nested subcategories, each carrying its parent categoryId).
            // This works even in pure For You mode where categoryModeSubcategories is
            // empty because no single category is active. Only subcategories whose parent
            // category matches the active category / app scope are sent — so cars can
            // never leak into Electronics, and Other-category subs never show elsewhere.
            const activeCatId = activeCategoryId ? String(activeCategoryId) : "";
            const hasAppScope = activeAppCategoryIds && activeAppCategoryIds.size > 0;
            const resolvedIds = [];
            const seenIds = new Set();
            userSubcats.forEach((subName) => {
              const candidates = subcategoryCandidatesByName[normalizeName(subName)] || [];
              candidates.forEach((cand) => {
                if (!cand || !cand.id) return;
                const candCatId = cand.categoryId ? String(cand.categoryId) : "";
                // Category-scoped: when a specific category is active, only include
                // subcategories belonging to that exact category.
                if (activeCatId) {
                  if (candCatId !== activeCatId) return;
                } else if (hasAppScope) {
                  // App-scoped: only include subcategories within the active app's
                  // categories (electronics / fashion / vehicles / others).
                  if (!candCatId || !activeAppCategoryIds.has(candCatId)) return;
                }
                const idKey = String(cand.id);
                if (!seenIds.has(idKey)) {
                  seenIds.add(idKey);
                  resolvedIds.push(idKey);
                }
              });
            });
            if (resolvedIds.length > 0) {
              e.append("subcategory_ids", resolvedIds.join(","));
            }
            // Note: when no category/app is active (pure For You), all resolved
            // preferred subcategories are sent — only the user's chosen subcats,
            // never posts from unrelated categories.
          }
        }

        if (
          (t.minPrice && e.append("minPrice", t.minPrice),
          t.maxPrice && e.append("maxPrice", t.maxPrice),
          t.priceRange && !t.minPrice && !t.maxPrice)
        ) {
          const [n, i] = t.priceRange.split("-").map(Number);
          isNaN(n) || e.append("minPrice", n),
            isNaN(i) || e.append("maxPrice", i);
        }
        return (
          t.startDate && e.append("startDate", t.startDate),
          t.endDate && e.append("endDate", toInclusiveEndDateValue(t.endDate)),
          latestWindow && e.append("latestWindow", String(latestWindow)),
          C && shuffleSeed && !t.sortBy && !latestWindow
            ? (e.append("sortBy", "shuffle"),
              e.append("shuffleSeed", String(shuffleSeed)))
            : (t.sortBy || latestWindow) &&
              (t.sortBy === "price_asc"
                ? (e.append("sortBy", "price"), e.append("sortOrder", "asc"))
                : t.sortBy === "price_desc"
                  ? (e.append("sortBy", "price"), e.append("sortOrder", "desc"))
                  : t.sortBy === "date_desc"
                    ? (e.append("sortBy", "created_at"),
                      e.append("sortOrder", "desc"))
                    : t.sortBy === "date_asc"
                      ? (e.append("sortBy", "created_at"),
                        e.append("sortOrder", "asc"))
                      : t.sortBy === "views_desc"
                        ? (e.append("sortBy", "views"),
                          e.append("sortOrder", "desc"))
                      : t.sortBy === "likes_desc"
                        ? (e.append("sortBy", "popularity"),
                          e.append("sortOrder", "desc"))
                        : t.sortBy === "featured"
                          ? (e.append("sortBy", "featured"),
                            e.append("sortOrder", "desc"))
                          : t.sortBy === "premium"
                            ? (e.append("sortBy", "premium"),
                              e.append("sortOrder", "desc"))
                            : latestWindow
                              ? (e.append("sortBy", "created_at"),
                                e.append("sortOrder", "desc"))
                              : (e.append("sortBy", t.sortBy),
                                e.append("sortOrder", "desc"))),
          e.append("page", L),
          e.append("limit", requestLimit),
          e
        );
      }, [
        ce,
        subcategoryIdByName,
        subcategoryCandidatesByName,
        activeCategoryId,
        activeAppCategoryIds,
        serverPrefSubcats,
        L,
        latestWindow,
        requestLimit,
        t.category,
        t.categoryGroup,
        t.subcategory,
        t.endDate,
        t.location,
        t.maxPrice,
        t.minPrice,
        t.priceRange,
        t.search,
        t.sortBy,
        t.startDate,
        shuffleSeed,
        C,
      ]);
    useEffect(() => {
      const e = P.current + 1;
      (P.current = e), v.current && v.current.abort();
      const a = new AbortController();
      let didTimeout = false;
      const requestTimeoutHandle = setTimeout(() => {
        didTimeout = true;
        try {
          a.abort();
        } catch {
          // Ignore abort races.
        }
      }, 15000);
      if (typeof window !== "undefined") {
        const currentScroll = window.scrollY || 0;
        if (L === 1 && !userFilterChangeRef.current && currentScroll > 160) {
          scrollGuardRef.current = currentScroll;
        } else {
          scrollGuardRef.current = null;
        }
      }
      return (
        (v.current = a),
        R(!0),
        z(null),
        (async () => {
          try {
            const n = be();
            if (debugCategoryEnabled) {
              const paramSnapshot = {};
              n.forEach((value, key) => {
                paramSnapshot[key] = value;
              });
              logCategoryFlow("fetch-posts", {
                params: paramSnapshot,
                hasCategoryMode,
                activeApp,
                category: t.category,
                subcategory: t.subcategory,
                categoryGroup: t.categoryGroup,
              });
            }
            const sortByParam = n.get("sortBy");
            if (sortByParam !== "shuffle" && !n.has("refresh")) {
              n.append("refresh", String(Date.now()));
            }
            const endpoint = isForYouMode ? "/posts/for-you" : "/posts";
            const i = await A.get(`${endpoint}?${n.toString()}`, {
              signal: a.signal,
              skipActiveAppFilter: true,
            });
            if (e !== P.current) return;
            const payload = i ?? {};
            const p = Array.isArray(payload?.posts)
              ? payload.posts
              : Array.isArray(payload?.data?.posts)
                ? payload.data.posts
                : Array.isArray(payload)
                  ? payload
                  : [];
            const F = latestWindow ? p.slice(0, latestWindow) : p;
            const activeLanguage = languageRef.current;
            const translatedSeed =
              activeLanguage && activeLanguage !== "en" && F.length > 0
                ? Ue(F, activeLanguage, {
                    paths: ALL_POSTS_TRANSLATE_PATHS,
                  })
                : F;
            const safeTranslatedSeed = Array.isArray(translatedSeed)
              ? translatedSeed
              : Array.isArray(F)
                ? F
                : [];
            O(L === 1 ? safeTranslatedSeed : (d) => lt(d, safeTranslatedSeed)),
              z(null);
            if (
              loadMoreScrollRef.current !== null &&
              loadMoreScrollRef.current !== undefined &&
              L > 1 &&
              typeof window !== "undefined"
            ) {
              const previousScroll = loadMoreScrollRef.current;
              loadMoreScrollRef.current = null;
              const restoreScroll = () => {
                if (window.scrollY < previousScroll - 200) {
                  window.scrollTo(0, previousScroll);
                }
              };
              requestAnimationFrame(restoreScroll);
              setTimeout(restoreScroll, 350);
            }
            if (
              filterSyncScrollRef.current !== null &&
              filterSyncScrollRef.current !== undefined &&
              L === 1 &&
              typeof window !== "undefined"
            ) {
              const previousScroll = filterSyncScrollRef.current;
              filterSyncScrollRef.current = null;
              const restoreScroll = () => {
                if (window.scrollY < previousScroll - 200) {
                  window.scrollTo(0, previousScroll);
                }
              };
              requestAnimationFrame(restoreScroll);
              setTimeout(restoreScroll, 350);
            }
            if (
              scrollGuardRef.current !== null &&
              scrollGuardRef.current !== undefined &&
              L === 1 &&
              typeof window !== "undefined"
            ) {
              const previousScroll = scrollGuardRef.current;
              scrollGuardRef.current = null;
              const restoreScroll = () => {
                if (window.scrollY < previousScroll - 200) {
                  window.scrollTo(0, previousScroll);
                }
              };
              requestAnimationFrame(restoreScroll);
              setTimeout(restoreScroll, 350);
            }
            const Vt = {};
            Array.isArray(safeTranslatedSeed) &&
              safeTranslatedSeed.forEach((d) => {
                Vt[d.post_id || d.id] = d.views_count || d.views || 0;
              }),
              oe((d) => ({ ...d, ...Vt })),
              ee(latestWindow ? !1 : p.length === requestLimit),
              setLastLiveSyncAt(Date.now());
            if (activeLanguage && activeLanguage !== "en" && F.length > 0) {
              Re(F, activeLanguage, {
                paths: ALL_POSTS_TRANSLATE_PATHS,
              })
                .then((d) => {
                  if (e !== P.current || !Array.isArray(d) || d.length === 0) {
                    return;
                  }
                  const _t = new Map();
                  d.forEach((me) => {
                    const ge = ke(me);
                    ge !== null && _t.set(String(ge), me);
                  });
                  O((me) =>
                    Array.isArray(me)
                      ? me.map((ge) => {
                          const Le = ke(ge);
                          if (Le === null) return ge;
                          return _t.get(String(Le)) || ge;
                        })
                      : me,
                  );
                })
                .catch(() => {});
            }
          } catch (n) {
            if (n?.name === "AbortError") {
              // AbortError is normal during fast tab/filter changes — retain real DB posts in state.
              return;
            }
            if (e !== P.current) return;
            const status = n?.status ?? n?.response?.status ?? null;
            const backendMessage =
              n?.response?.data?.error || n?.response?.data?.message || "";
            const message =
              backendMessage || "Failed to fetch posts";
            const normalized = String(message).toLowerCase();
            if (
              status === 429 ||
              normalized.includes("automated behavior") ||
              normalized.includes("too many")
            ) {
              loadMoreCooldownRef.current = Date.now() + RATE_LIMIT_COOLDOWN_MS;
            }
            z(message);
            if (L === 1) {
              ee(!1);
            }
          } finally {
            clearTimeout(requestTimeoutHandle);
            v.current === a && (v.current = null),
              e === P.current && (R(!1), setIsLiveSyncing(!1));
            loadMorePendingRef.current = !1;
            userFilterChangeRef.current = !1;
          }
        })(),
        () => {
          clearTimeout(requestTimeoutHandle);
          a.abort(), v.current === a && (v.current = null);
        }
      );
    }, [
      be,
      L,
      Pe,
      isForYouMode,
      debugCategoryEnabled,
      latestWindow,
      requestLimit,
      logCategoryFlow,
      hasCategoryMode,
      activeApp,
      t.category,
      t.subcategory,
      t.categoryGroup,
      tr,
      _refreshKey,
    ]),
      usePageRefresh(useCallback(() => _setRefreshKey(k => k + 1), [])),
      useEffect(() => {
        T(1);
      }, [
        t.search,
        t.location,
        t.category,
        t.categoryGroup,
        t.subcategory,
        t.priceRange,
        t.minPrice,
        t.maxPrice,
        t.startDate,
        t.endDate,
        t.condition,
        t.verifiedOnly,
        t.latestWindow,
        t.sortBy,
      ]);
    useEffect(() => {
      if (shuffleSeed && (t.sortBy || latestWindow)) {
        setShuffleSeed(null);
      }
    }, [shuffleSeed, t.sortBy, latestWindow]);
    const J = useCallback(() => {
      if (E || !H || latestWindow) return;
      if (loadMorePendingRef.current) return;
      const now = Date.now();
      if (now < loadMoreCooldownRef.current) return;
      loadMoreCooldownRef.current = now + LOAD_MORE_COOLDOWN_MS;
      loadMorePendingRef.current = !0;
      if (typeof window !== "undefined") {
        loadMoreScrollRef.current = window.scrollY;
      }
      T((e) => e + 1);
    }, [E, H, latestWindow]);
    useEffect(() => {
      if (latestWindow) return;
      if (!C) return;
      if (typeof IntersectionObserver === "undefined") {
        const e = () => {
          const scrollTop =
            window.scrollY || document.documentElement.scrollTop || 0;
          const scrollHeight =
            document.documentElement.scrollHeight ||
            document.body?.scrollHeight ||
            0;
          if (window.innerHeight + scrollTop >= scrollHeight - 1e3) {
            J();
          }
        };
        window.addEventListener("scroll", e, { passive: !0 });
        e();
        return () => window.removeEventListener("scroll", e);
      }
      const target = loadMoreSentinelRef.current;
      if (!target) return;
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              J();
            }
          });
        },
        { root: null, rootMargin: "1000px 0px", threshold: 0 },
      );
      observer.observe(target);
      return () => observer.disconnect();
    }, [J, C, latestWindow]);
    useEffect(() => {
      if (latestWindow || !autoRefreshEnabled) return;
      const e = setInterval(() => {
        if (typeof document > "u" || document.hidden || E) return;
        Ce((a) => a + 1);
      }, 3e4);
      return () => clearInterval(e);
    }, [E, latestWindow, autoRefreshEnabled]);
    useEffect(() => {
      const hasPosts = Array.isArray(f) && f.length > 0;
      if (hasPosts || V) {
        stalledLoadingStartedAtRef.current = null;
        if (isStalledLoading) {
          setIsStalledLoading(!1);
        }
        return;
      }
      if (E && stalledLoadingStartedAtRef.current == null) {
        stalledLoadingStartedAtRef.current = Date.now();
      }
      if (stalledLoadingStartedAtRef.current == null) return;
      const evaluateStall = () => {
        if (Date.now() - stalledLoadingStartedAtRef.current >= 15000) {
          setIsStalledLoading(!0);
        }
      };
      evaluateStall();
      const intervalId = setInterval(evaluateStall, 1000);
      return () => clearInterval(intervalId);
    }, [E, V, f.length, isStalledLoading]);
    const filteredPosts = useMemo(() => {
      if (!Array.isArray(f) || f.length === 0) return [];
      const e = normalizeSearchText(t.search);
      const rawActiveSubcategory = String(t.subcategory || "").trim();
      const hasActiveSubcategory =
        !!rawActiveSubcategory && rawActiveSubcategory !== "All";
      const activeSubcategoryId =
        hasActiveSubcategory && /^\d+$/.test(rawActiveSubcategory)
          ? rawActiveSubcategory
          : hasActiveSubcategory
            ? subcategoryIdByName[normalizeName(rawActiveSubcategory)] || ""
            : "";
      const activeSubcategoryName = hasActiveSubcategory
        ? normalizeName(
            !/^\d+$/.test(rawActiveSubcategory)
              ? rawActiveSubcategory
              : subcategoryNameById[String(activeSubcategoryId)] || "",
          )
        : "";
      const locationFilter = normalizeSearchText(t.location);
      const hasLocationFilter = !!locationFilter;
      const conditionFilter = normalizeConditionValue(t.condition);
      const hasConditionFilter = !!conditionFilter;
      const verifiedOnly = !!t.verifiedOnly;
      const hasMinPrice =
        t.minPrice !== "" && t.minPrice !== null && t.minPrice !== undefined;
      const hasMaxPrice =
        t.maxPrice !== "" && t.maxPrice !== null && t.maxPrice !== undefined;
      let minPriceValue = hasMinPrice ? parsePriceValue(t.minPrice) : null;
      let maxPriceValue = hasMaxPrice ? parsePriceValue(t.maxPrice) : null;
      if (!hasMinPrice && !hasMaxPrice && t.priceRange) {
        const [rangeMinRaw, rangeMaxRaw] = String(t.priceRange)
          .split("-")
          .map((a) => String(a || "").trim());
        if (rangeMinRaw !== "") {
          const rangeMinValue = parsePriceValue(rangeMinRaw);
          if (Number.isFinite(rangeMinValue)) minPriceValue = rangeMinValue;
        }
        if (rangeMaxRaw !== "") {
          const rangeMaxValue = parsePriceValue(rangeMaxRaw);
          if (Number.isFinite(rangeMaxValue)) maxPriceValue = rangeMaxValue;
        }
      }
      const hasPriceFilter = minPriceValue !== null || maxPriceValue !== null;
      const startDateValue = parseFilterDateValue(t.startDate, !1);
      const endDateValue = parseFilterDateValue(t.endDate, !0);
      const hasDateFilter = startDateValue !== null || endDateValue !== null;
      const shouldApplyClientAppFilter = !t.categoryGroup;

      const o = f.filter((a) => {
        if (
          !matchesCategoryModeItem(a, {
            activeCategory:
              hasActiveCategory && effectiveCategoryLabel !== "All"
                ? { id: activeCategoryId || null, name: effectiveCategoryLabel }
                : null,
            activeCategoryId,
            activeAppMatcher: shouldApplyClientAppFilter ? activeAppMatcher : null,
          })
        ) {
          return !1;
        }
        if (hasActiveSubcategory) {
          const itemSubcategoryId =
            a?.subcategory_id ?? a?.subcategoryId ?? a?.subcategoryID ?? null;
          const itemSubcategoryNameRaw =
            a?.subcategory_name ??
            a?.subcategoryName ??
            a?.subcategory ??
            "";
          const itemSubcategoryName = normalizeName(
            itemSubcategoryNameRaw ||
              (itemSubcategoryId != null
                ? subcategoryNameById[String(itemSubcategoryId)] || ""
                : ""),
          );
          const itemHasSubcategory =
            itemSubcategoryId != null || !!itemSubcategoryName;
          if (!itemHasSubcategory) {
            return !1;
          }
          if (activeSubcategoryId && itemSubcategoryId != null) {
            if (String(itemSubcategoryId) !== String(activeSubcategoryId)) {
              if (!itemSubcategoryName || itemSubcategoryName !== activeSubcategoryName) {
                return !1;
              }
            }
          } else if (activeSubcategoryName) {
            if (!itemSubcategoryName || itemSubcategoryName !== activeSubcategoryName) {
              return !1;
            }
          } else if (activeSubcategoryId) {
            // Filter is by numeric ID but post has no matching ID and name lookup failed.
            // Try reverse name-to-ID lookup: resolve the post's raw subcategory name.
            const rawPostSubcategoryName =
              a?.subcategory_name ?? a?.subcategoryName ?? a?.subcategory ?? "";
            const normalizedPostName = normalizeName(rawPostSubcategoryName);
            if (normalizedPostName) {
              const resolvedFilterId = subcategoryIdByName[normalizedPostName];
              if (!resolvedFilterId || String(resolvedFilterId) !== String(activeSubcategoryId)) {
                return !1;
              }
            } else {
              return !1;
            }
          }
        }
        if (hasLocationFilter) {
          const locationValues = [
            a?.location,
            a?.city,
            a?.area,
            a?.state,
            a?.country,
            a?.user?.location,
            a?.user?.city,
            a?.seller?.location,
            a?.seller?.city,
            a?.seller?.area,
          ].filter(Boolean);
          const locationText = normalizeSearchText(locationValues.join(" "));
          if (!locationText || !locationText.includes(locationFilter)) {
            return !1;
          }
        }
        if (hasPriceFilter) {
          const priceValue = resolvePostPriceValue(a);
          if (!Number.isFinite(priceValue) || priceValue <= 0) return !1;
          if (minPriceValue !== null && priceValue < minPriceValue) return !1;
          if (maxPriceValue !== null && priceValue > maxPriceValue) return !1;
        }
        if (hasDateFilter) {
          const postDateValue = resolvePostDateValue(a);
          if (postDateValue == null) return !1;
          if (startDateValue !== null && postDateValue < startDateValue) return !1;
          if (endDateValue !== null && postDateValue > endDateValue) return !1;
        }
        if (hasConditionFilter) {
          const conditionValue =
            a?.condition || a?.item_condition || a?.itemCondition || "";
          if (!matchesConditionFilter(conditionValue, conditionFilter)) {
            return !1;
          }
        }
        if (verifiedOnly) {
          const isVerified = !!(
            a?.is_verified ||
            a?.isVerified ||
            a?.verified ||
            a?.seller_verified ||
            a?.sellerVerified ||
            a?.user?.is_verified ||
            a?.user?.isVerified ||
            a?.user?.verified ||
            a?.aadhaar_verified ||
            a?.pan_verified
          );
          if (!isVerified) return !1;
        }
        if (!e) return !0;
        if (t.search && String(t.search).trim()) return !0;

        const l = [];
        const n = a?.category_id ?? a?.categoryId ?? a?.categoryID ?? null;
        if (n != null) {
          const i = categoryNameById[String(n)];
          i && l.push(i);
        }
        const p = a?.subcategory_id ?? a?.subcategoryId ?? a?.subcategoryID ?? null;
        if (p != null) {
          const i = subcategoryNameById[String(p)];
          i && l.push(i);
        }
        return matchesSearchQuery(a, e, l);
      });

      const sortKey = t.sortBy || (latestWindow ? "date_desc" : "");
      if (!sortKey) return o;
      const n = [...o];
      if (sortKey === "price_asc" || sortKey === "price_desc") {
        n.sort((a, i) => {
          const p = resolvePostPriceValue(a);
          const F = resolvePostPriceValue(i);
          return sortKey === "price_asc" ? p - F : F - p;
        });
        return n;
      }
      if (sortKey === "date_asc" || sortKey === "date_desc") {
        n.sort((a, i) => {
          const p = resolvePostDateValue(a) || 0;
          const F = resolvePostDateValue(i) || 0;
          return sortKey === "date_asc" ? p - F : F - p;
        });
        return n;
      }
      if (sortKey === "views_desc") {
        n.sort((a, i) => {
          const p = a.stats?.views ?? a.views ?? a.view_count ?? a.viewCount ?? 0;
          const F = i.stats?.views ?? i.views ?? i.view_count ?? i.viewCount ?? 0;
          return F - p;
        });
        return n;
      }
      if (sortKey === "likes_desc") {
        n.sort((a, i) => {
          const p = a.stats?.likes ?? a.likes ?? a.like_count ?? a.likeCount ?? 0;
          const F = i.stats?.likes ?? i.likes ?? i.like_count ?? i.likeCount ?? 0;
          return F - p;
        });
        return n;
      }
      if (sortKey === "featured") {
        n.sort((a, i) => {
          const aFeatured = !!(a.is_featured || a.isFeatured || a.featured);
          const iFeatured = !!(i.is_featured || i.isFeatured || i.featured);
          if (aFeatured !== iFeatured) return aFeatured ? -1 : 1;
          return (resolvePostDateValue(i) || 0) - (resolvePostDateValue(a) || 0);
        });
        return n;
      }
      if (sortKey === "premium") {
        n.sort((a, i) => {
          const aPremium = !!(a.is_premium || a.isPremium || a.premium);
          const iPremium = !!(i.is_premium || i.isPremium || i.premium);
          if (aPremium !== iPremium) return aPremium ? -1 : 1;
          return (resolvePostDateValue(i) || 0) - (resolvePostDateValue(a) || 0);
        });
        return n;
      }
      return o;
    }, [
        f,
        t.search,
        t.subcategory,
        t.location,
        t.minPrice,
        t.maxPrice,
        t.priceRange,
        t.startDate,
        t.endDate,
        t.condition,
        t.verifiedOnly,
        t.sortBy,
        t.categoryGroup,
        subcategoryIdByName,
        categoryNameById,
        subcategoryNameById,
        hasActiveCategory,
        effectiveCategoryLabel,
        activeCategoryId,
        activeAppMatcher,
        latestWindow,
      ]),
      K = useMemo(
        () =>
          !filteredPosts || filteredPosts.length === 0
            ? []
            : latestWindow
              ? filteredPosts.slice(0, latestWindow)
              : C
                ? filteredPosts
                : filteredPosts.slice(0, ve),
        [filteredPosts, C, latestWindow],
      ),
      visibleResultsCount = K.length,
      resultsCount = filteredPosts.length,
      guestPreviewLimited = !C && resultsCount > visibleResultsCount,
      resultsLabel = visibleResultsCount
        ? `${visibleResultsCount} ${tr("results", "results")}`
        : tr("no_results", "0 results"),
      resultsSummary = guestPreviewLimited
        ? `${tr("showing", "Showing")} ${visibleResultsCount} ${tr("preview_results", "preview results")}`
        : resultsLabel,
      lastUpdatedLabel = lastLiveSyncAt ? nt(lastLiveSyncAt, l) : "",
      lastUpdatedText = lastUpdatedLabel
        ? `${tr("updated", "Updated")} ${lastUpdatedLabel}`
        : "",
      liveUpdatesActive = autoRefreshEnabled && !latestWindow,
      feedSummaryLine = [
        resultsSummary,
        lastUpdatedText,
        activeFiltersCount > 0
          ? `${activeFiltersCount} ${tr("filters", "filters")}`
          : "",
        liveUpdatesActive ? tr("auto_refresh", "Auto refresh") : "",
      ]
        .filter(Boolean)
        .join(" \u2022 "),
      heroTitle = feedTitle || tr("all_posts", "All Posts"),
      heroSubtitle =
        hasActiveCategory &&
        effectiveCategoryLabel &&
        effectiveCategoryLabel !== "All"
          ? `${tr("hero_category_subtitle", "Fresh picks in")} ${effectiveCategoryLabel}${
              activeSubcategoryLabel && activeSubcategoryLabel !== "All"
                ? ` · ${activeSubcategoryLabel}`
                : ""
            }`
          : isForYouMode
            ? tr(
                "hero_for_you_subtitle",
                "A tailored stream of the newest listings and daily deals.",
              )
            : tr(
                "hero_allposts_subtitle",
                "Explore trending listings, fresh drops, and daily deals.",
              ),
      heroContextLabel = hasCategoryMode
        ? categoryModeLabel !== tr("all", "All") ? categoryModeLabel : tr("marketplace", "Marketplace")
        : activeAppLabel
          ? activeAppLabel
          : tr("marketplace", "Marketplace"),
      U = useRef(new Set()),
      fe = useRef(new Set()),
      B = useRef(null),
      W = useCallback((e) => {
        const a = I(e);
        !a ||
          fe.current.has(a) ||
          (fe.current.add(a),
          U.current.add(a),
          oe((o) => ({ ...o, [a]: (o[a] || 0) + 1 })));
      }, []),
      setCarouselTrackRef = useCallback((e, a) => {
        const o = I(e);
        if (!o) return;
        if (!a) {
          delete carouselTrackRefs.current[o];
          return;
        }
        carouselTrackRefs.current[o] = a;
      }, []),
      updateCarouselIndex = useCallback((e, a) => {
        const o = I(e);
        if (!o) return;
        setCarouselIndexByPost((n) => (n[o] === a ? n : { ...n, [o]: a }));
      }, []),
      getCarouselIndex = useCallback(
        (e, a) => {
          const o = I(e);
          if (!o || !a || a <= 0) return 0;
          const n = Number(carouselIndexByPost[o] ?? 0);
          if (!Number.isFinite(n) || n < 0) return 0;
          if (n >= a) return a - 1;
          return n;
        },
        [carouselIndexByPost],
      ),
      scrollCarouselToIndex = useCallback(
        (e, a, o) => {
          const n = I(e);
          if (!n || !o || o <= 0) return;
          const i = carouselTrackRefs.current[n];
          if (!i) return;
          const p = ((a % o) + o) % o;
          i.scrollTo({ left: i.clientWidth * p, behavior: "smooth" });
          updateCarouselIndex(n, p);
        },
        [updateCarouselIndex],
      ),
      moveCarousel = useCallback(
        (e, a, o, n) => {
          if (o <= 1) return;
          n.preventDefault();
          n.stopPropagation();
          const i = getCarouselIndex(e, o);
          scrollCarouselToIndex(e, i + a, o);
        },
        [getCarouselIndex, scrollCarouselToIndex],
      ),
      handleCarouselScroll = useCallback(
        (e, a, o) => {
          if (o <= 1) return;
          const n = a.currentTarget;
          const i = n.clientWidth || 1;
          const p = Math.round(n.scrollLeft / i);
          updateCarouselIndex(e, Math.max(0, Math.min(o - 1, p)));
        },
        [updateCarouselIndex],
      );
    useEffect(() => {
      const e = async () => {
          if (U.current.size === 0) return;
          const o = Array.from(U.current)
            .map((id) => String(id || "").trim())
            .filter(Boolean);
          U.current.clear();
          if (o.length === 0) return;
          try {
            await A.post("/posts/batch-view", { postIds: o });
          } catch (n) {
            import.meta.env.DEV && console.error("Batch view error:", n);
          }
        },
        a = setInterval(() => {
          e();
        }, 5e3);
      return () => {
        clearInterval(a), e();
      };
    }, []),
      useEffect(
        () => (
          B.current && B.current.disconnect(),
          (B.current = new IntersectionObserver(
            (e) => {
              e.forEach((a) => {
                if (a.isIntersecting) {
                  const o = I(a.target.dataset.postId);
                  W(o);
                }
              });
            },
            { threshold: 0.5 },
          )),
          Object.values(de.current).forEach((e) => {
            e && B.current.observe(e);
          }),
          () => {
            B.current && B.current.disconnect();
          }
        ),
        [f, W],
      );
    const handleSharePost = async (e) => {
        const a = I(e);
        if (!a) return;
        const o = `${window.location.origin}/post/${a}`;
        setShareDialogUrl(o), setShareDialogOpen(!0);
        try {
          await A.post(`/posts/${a}/share`);
        } catch {}
      },
      handleReportPost = (e) => {
        const a = I(e);
        if (!a) {
          M("Unable to report this post."),
            setTimeout(() => M(""), 2e3);
          return;
        }
        y(`/complaints?postId=${encodeURIComponent(a)}`);
      },
      toggleSave = async (e) => {
        const rawId = typeof e === "object" && e !== null ? e?.post_id || e?.id || e?._id : e;
        const a = I(rawId);
        if (!a) return;
        if (!C) {
          M(s("login_to_save", { defaultValue: "Please login to save posts" }));
          setTimeout(() => M(""), 2e3);
          setLoginPromptOpen(!0);
          return;
        }
        const o = !!savedPosts[a],
          n = !o;
        setSavedPosts((i) => ({ ...i, [a]: n }));
        setSavedPostStatus(a, n);
        try {
          n
            ? await A.post("/wishlist", { postId: a })
            : await A.delete(`/wishlist/${a}`);
          M(n ? s("added_to_wishlist", { defaultValue: "Saved to wishlist" }) : s("removed_from_wishlist", { defaultValue: "Removed from wishlist" }));
        } catch {
          setSavedPosts((n) => ({ ...n, [a]: o }));
          setSavedPostStatus(a, o);
          M(o ? "Failed to remove saved post" : "Failed to save post");
        }
        setTimeout(() => M(""), 2e3);
      },
      handleCartToggle = useCallback(
        (e) => {
          const rawId = typeof e === "object" && e !== null ? e?.post_id || e?.id || e?._id : e;
          const a = I(rawId);
          if (!a) return;
          if (!C) {
            setLoginPromptOpen(!0);
            return;
          }
          const postObj = typeof e === "object" && e !== null ? e : f.find((item) => I(item?.post_id || item?.id) === a) || {};
          if (isInCartItem(a)) {
            removeCartItem(a);
            M(s("removed", { defaultValue: "Removed from cart" }));
          } else {
            addCartItem({
              id: a,
              title: postObj?.title || s("title", { defaultValue: "Item" }),
              price: postObj?.price || 0,
              image: Ne(postObj),
              seller: postObj?.user?.name || postObj?.user_name || postObj?.username || "Unknown",
              location: postObj?.location || postObj?.city || postObj?.area || "",
              category_id:
                postObj?.category_id ||
                postObj?.categoryId ||
                postObj?.category?.category_id ||
                postObj?.category?.id ||
                "",
              category_name:
                postObj?.category_name ||
                postObj?.categoryName ||
                postObj?.category_title ||
                postObj?.categoryTitle ||
                (typeof postObj?.category === "object"
                  ? postObj?.category?.name || postObj?.category?.title || postObj?.category?.label
                  : postObj?.category) ||
                "",
              category_group:
                postObj?.category_group ||
                postObj?.categoryGroup ||
                postObj?.category?.category_group ||
                postObj?.category?.categoryGroup ||
                activeApp ||
                "",
            });
            M(s("add_to_cart", { defaultValue: "Added to cart" }));
          }
          setTimeout(() => M(""), 2e3);
        },
        [C, addCartItem, isInCartItem, removeCartItem, s, activeApp, f],
      ),
      toggleCompare = useCallback(
        (post) => {
          const postId = I(post?.post_id || post?.id);
          if (!postId) return;
          setCompareItems((prev) => {
            const exists = prev.find((p) => I(p?.post_id || p?.id) === postId);
            if (exists) return prev.filter((p) => I(p?.post_id || p?.id) !== postId);
            if (prev.length >= 4) {
              M(s("compare_max", { defaultValue: "Maximum 4 items to compare" }));
              setTimeout(() => M(""), 2e3);
              return prev;
            }
            // Enforce same-subcategory comparison
            const getSubcat = (p) => String(p?.subcategory_name || p?.subcategory || p?.subcategoryName || "").trim().toLowerCase();
            const newSubcat = getSubcat(post);
            if (prev.length > 0 && newSubcat) {
              const existingSubcat = getSubcat(prev[0]);
              if (existingSubcat && newSubcat !== existingSubcat) {
                M(s("compare_same_subcategory", { defaultValue: `You can only compare similar products. Clear current items to compare ${post?.subcategory_name || post?.subcategory || "different"} products.` }));
                setTimeout(() => M(""), 3e3);
                return prev;
              }
            }
            return [...prev, post];
          });
        },
        [s],
      ),
      isInCompare = useCallback(
        (postId) => {
          const id = I(postId);
          return compareItems.some((p) => I(p?.post_id || p?.id) === id);
        },
        [compareItems],
      ),
      je = async (e) => {
        const a = I(e);
        if (!a) return;
        if (!C) {
          setLoginPromptOpen(!0);
          return;
        }
        sessionStorage.setItem(
          "allPostsScrollPosition",
          window.scrollY.toString(),
        );
        const o = f.find((i) => I(i.id) === a || I(i.post_id) === a);
        W(a);
        const n = tt($);
        n &&
          A.post("/recently-viewed/track", {
            postId: a,
            userId: n,
            source: "allposts",
          }).catch(() => {}),
          o
            ? y(`/post/${a}`, {
                state: { post: o, source: "allposts", returnTo },
              })
            : y(`/post/${a}`, {
                state: { source: "allposts", returnTo },
              });
      },
      pe = filteredPosts
        .filter((e) => e.isSponsored === !0 || e.is_sponsored === !0)
        .slice(0, 5),
          dealsPreviewImages = pe
            .map((e) => Ne(e))
            .filter((e) => e && e !== D)
            .slice(0, 3),
          showTopDealsBanner = pe.length > 0,
          dealsBannerNode = showTopDealsBanner
            ? React.createElement(
                "div",
                { id: "all-posts-deals", className: "mhub-allposts-deals-wrap", "data-density": "extra" },
                React.createElement(AllPostsGreatDealsBanner, {
                  title: tr("great_deals", "Great Deals"),
                  subtitle: tr("up_to_off", "Up to 50% off"),
                  contextLabel: dealsContextLabel,
                  collapsed: !0,
                  allowCollapse: !1,
                  onShopNow: () => {
                    const e = document.getElementById("all-posts-feed");
                    e?.scrollIntoView({ behavior: "smooth", block: "start" });
                  },
                  previewImages: dealsPreviewImages,
                  maxWidthClass: feedMaxWidthClass,
                  t: tr,
                  compact: !0,
                  outerPaddingClass: "px-3 mhub-allposts-deals",
                  sticky: !1,
                }),
              )
            : null,
      ye = useMemo(() => {
        const e = new Date();
        const a = e.getFullYear();
        const o = String(e.getMonth() + 1).padStart(2, "0");
        const n = String(e.getDate()).padStart(2, "0");
        return `${a}-${o}-${n}`;
      }, []),
      isUnder1000 =
        (!t.minPrice || String(t.minPrice) === "0") &&
        String(t.maxPrice || "") === "1000",
      isRange500to2000 =
        String(t.minPrice || "") === "500" &&
        String(t.maxPrice || "") === "2000",
      isRange2000to10000 =
        String(t.minPrice || "") === "2000" &&
        String(t.maxPrice || "") === "10000",
      isAbove10000 =
        String(t.minPrice || "") === "10000" &&
        String(t.maxPrice || "") === "",
      isPostedToday = t.startDate === ye && t.endDate === ye,
      isNearMe =
        !!Q &&
        !!t.location &&
        normalizeName(t.location) === normalizeName(Q),
      isNarrowQuickFilterViewport =
        typeof window !== "undefined" &&
        typeof window.matchMedia === "function" &&
        window.matchMedia("(max-width: 767px)").matches,
      quickFilterMax = isForYouMode ? 2 : isNarrowQuickFilterViewport ? 2 : 4,
      quickFilterChips = [
        {
          key: "posted-today",
          label: tr("posted_today", "Posted Today"),
          active: isPostedToday,
          onClick: () => b({ startDate: ye, endDate: ye, latestWindow: "" }),
        },
        {
          key: "latest-10",
          label: tr("latest_10", "Latest 10"),
          active: latestWindow === 10,
          onClick: () => jee(10),
        },
        {
          key: "latest-5",
          label: tr("latest_5", "Latest 5"),
          active: latestWindow === 5,
          onClick: () => jee(5),
        },
        {
          key: "near-me",
          label: Q ? `${tr("near", "Near")} ${Q}` : tr("near_me", "Near me"),
          active: isNearMe,
          disabled: !Q,
          onClick: () => b({ location: Q }),
        },
        {
          key: "under-1000",
          label: tr("under_1000", "Under 1000"),
          active: isUnder1000,
          onClick: () => b({ minPrice: "", maxPrice: "1000" }),
        },
        {
          key: "500-to-2000",
          label: tr("500_to_2k", `${formatCurrency(500)}-${formatCurrency(2000)}`),
          active: isRange500to2000,
          onClick: () => b({ minPrice: "500", maxPrice: "2000" }),
        },
        {
          key: "2000-to-10000",
          label: tr(
            "2k_to_10k",
            `${formatCurrency(2000)}-${formatCurrency(10000)}`,
          ),
          active: isRange2000to10000,
          onClick: () => b({ minPrice: "2000", maxPrice: "10000" }),
        },
        {
          key: "above-10000",
          label: tr("above_10k", `${tr("above", "Above")} ${formatCurrency(10000)}`),
          active: isAbove10000,
          onClick: () => b({ minPrice: "10000", maxPrice: "" }),
        },
      ],
      quickFiltersVisible = showAllQuickFilters
        ? quickFilterChips
        : quickFilterMax === 0
          ? quickFilterChips.filter((chip) => chip.active)
          : quickFilterChips.slice(0, quickFilterMax),
      quickFiltersChips = [
        ...quickFiltersVisible,
        {
          key: "toggle-filters",
          label:
            quickFilterMax === 0 && !showAllQuickFilters
              ? tr("quick_filters", "Quick filters")
              : showAllQuickFilters
                ? tr("less_filters", "Less filters")
                : tr("more_filters", "More filters"),
          active: showAllQuickFilters,
          onClick: () => setShowAllQuickFilters((e) => !e),
          className:
            "border-dashed border-slate-300 text-slate-600 bg-[var(--surface-1)] hover:bg-[var(--surface-2)] dark:border-slate-600 dark:text-slate-200 dark:border-dashed dark:bg-[var(--surface-1)] dark:hover:bg-[var(--surface-2)]",
        },
      ],
      forYouHeroNode = isForYouMode
        ? React.createElement(
            "section",
            {
              className: "w-full mhub-allposts-hero mhub-foryou-redesign-hero",
              "data-density": "extra",
            },
            React.createElement(
              "div",
              { className: `w-full ${pageMaxWidthClass} mx-auto px-3 sm:px-4 pt-3` },
              React.createElement(
                "div",
                {
                  className:
                    "mhub-allposts-hero-card overflow-hidden border border-indigo-100/80 bg-gradient-to-br from-white via-indigo-50/70 to-sky-50/80 p-0 shadow-sm dark:border-indigo-500/20 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/30",
                },
                React.createElement(
                  "div",
                  { className: "px-4 py-4 sm:px-5 sm:py-5" },
                  React.createElement(
                    "div",
                    { className: "flex items-start justify-between gap-3" },
                    React.createElement(
                      "div",
                      { className: "min-w-0" },
                      React.createElement(
                        "div",
                        {
                          className:
                            "mb-2 flex flex-wrap items-center gap-2",
                        },
                        React.createElement(
                          "span",
                          {
                            className:
                              "inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-white/85 px-2.5 py-1 text-xs font-bold text-indigo-700 shadow-sm dark:border-indigo-500/30 dark:bg-white/10 dark:text-indigo-200",
                          },
                          React.createElement(zo, { className: "h-3.5 w-3.5" }),
                          tr("ai_curated", "AI curated"),
                        ),
                        React.createElement(
                          "h1",
                          {
                            className:
                              "text-2xl font-black tracking-tight text-slate-950 sm:text-3xl dark:text-white",
                          },
                          tr("for_you", "For You"),
                        ),
                      ),
                      React.createElement(
                        "p",
                        {
                          className:
                            "mt-1 max-w-xl text-sm font-medium leading-5 text-slate-600 dark:text-slate-300",
                        },
                        tr(
                          "for_you_refined_subtitle",
                          "Personalized listings ranked from your activity, filters, location, and fresh marketplace signals.",
                        ),
                      ),
                    ),
                    React.createElement(
                      "button",
                      {
                        type: "button",
                        onClick: () => y("/all-posts"),
                        className:
                          "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-white/10 dark:bg-white/10 dark:text-slate-100 dark:hover:bg-white/15",
                      },
                      tr("all_posts", "All Posts"),
                      React.createElement(Bo, { className: "h-3.5 w-3.5" }),
                    ),
                  ),
                  React.createElement(
                    "div",
                    {
                      className:
                        "mhub-foryou-hero-stats mt-4 grid grid-cols-3 keep-cols gap-2 text-center sm:max-w-lg",
                    },
                    [
                      {
                        key: "items",
                        label: tr("matched_items", "Matched"),
                        value: Number.isFinite(resultsCount) ? resultsCount : 0,
                      },
                      {
                        key: "categories",
                        label: tr("categories", "Categories"),
                        value: allPostsCategoryFallback.length || 0,
                      },
                      {
                        key: "filters",
                        label: tr("filters", "Filters"),
                        value: activeFiltersCount,
                      },
                    ].map((stat) =>
                      React.createElement(
                        "div",
                        {
                          key: stat.key,
                          className:
                            "rounded-2xl border border-white/70 bg-white/80 px-2 py-2.5 shadow-sm dark:border-white/10 dark:bg-white/10",
                        },
                        React.createElement(
                          "div",
                          {
                            className:
                              "text-base font-black text-slate-950 dark:text-white",
                          },
                          stat.value,
                        ),
                        React.createElement(
                          "div",
                          {
                            className:
                              "mt-0.5 truncate text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300",
                          },
                          stat.label,
                        ),
                      ),
                    ),
                  ),
                  React.createElement(
                    "div",
                    { className: "mt-4 flex flex-wrap items-center gap-2" },
                    React.createElement(
                      "button",
                      {
                        type: "button",
                        onClick: () => {
                          const e = document.getElementById("all-posts-feed");
                          e?.scrollIntoView({ behavior: "smooth", block: "start" });
                        },
                        className:
                          "inline-flex h-10 items-center gap-1.5 rounded-full bg-blue-600 px-3.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700",
                      },
                      React.createElement(Qe, { className: "h-3.5 w-3.5" }),
                      tr("browse", "Browse"),
                    ),
                    React.createElement(
                      "button",
                      {
                        type: "button",
                        onClick: () => {
                          if (!C) {
                            setLoginPromptOpen(!0);
                            return;
                          }
                          setShuffleSeed(Date.now());
                        },
                        disabled: C && !canShuffle,
                        className:
                          "inline-flex h-10 items-center gap-1.5 rounded-full border border-indigo-200 bg-white px-3.5 text-xs font-bold text-indigo-700 shadow-sm hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-indigo-500/30 dark:bg-white/10 dark:text-indigo-200 dark:hover:bg-white/15",
                      },
                      React.createElement(zo, { className: "h-3.5 w-3.5" }),
                      tr("shuffle", "Shuffle"),
                    ),
                    React.createElement(
                      "button",
                      {
                        type: "button",
                        onClick: () => setAutoRefreshEnabled((e) => !e),
                        "aria-pressed": autoRefreshEnabled,
                        className: `inline-flex h-10 items-center gap-1.5 rounded-full border px-3.5 text-xs font-bold shadow-sm transition ${
                          autoRefreshEnabled
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15"
                        }`,
                      },
                      React.createElement(zo, {
                        className: `h-3.5 w-3.5 ${autoRefreshEnabled ? "animate-spin" : ""}`,
                      }),
                      autoRefreshEnabled
                        ? tr("live_on", "Live on")
                        : tr("live", "Live"),
                    ),
                    ue &&
                      React.createElement(
                        "button",
                        {
                          type: "button",
                          onClick: Y,
                          className:
                            "inline-flex h-10 items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3.5 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200",
                        },
                        React.createElement(Jo, { className: "h-3.5 w-3.5" }),
                        tr("clear_filters", "Clear filters"),
                      ),
                  ),
                ),
              ),
            ),
          )
        : null,
      toolbarQuickFiltersNode = React.createElement(
        "div",
        { className: "w-full mhub-allposts-filters" },
        React.createElement(
          AllPostsQuickFilters,
          {
            title: isForYouMode
              ? tr("refine_for_you", "Refine For You")
              : tr("quick_filters", "Quick filters"),
            variant: isForYouMode ? "forYou" : "default",
            compact: !0,
            inline: !0,
            inlineWrap: isForYouMode ? !0 : !1,
            hideTitle: !isForYouMode,
            showDivider: !1,
            chips: quickFiltersChips,
            maxWidthClass: pageMaxWidthClass,
            headerRight: React.createElement(
              "div",
              {
                className: `quick-filters-actions ${
                  isForYouMode ? "hidden sm:flex" : "flex"
                } flex-wrap items-center gap-2`,
              },
              React.createElement(
                "div",
                {
                  className:
                    "mhub-allposts-action-group inline-flex items-center gap-1 rounded-full border border-[var(--chip-border)] bg-[var(--surface-2)] px-1.5 py-1 dark:border-[var(--chip-border)] dark:bg-[var(--surface-2)]",
                },
                React.createElement(
                  "button",
                  {
                    type: "button",
                    className: "mhub-allposts-action-btn",
                    onClick: () => setFilterPanelOpen(!0),
                    title: s("filter_sort", { defaultValue: "Filter & Sort" }),
                  },
                  React.createElement(
                    "span",
                    { className: "text-base" },
                    "\u2699\uFE0F",
                  ),
                ),
                React.createElement(
                  "button",
                  {
                    type: "button",
                    className: "mhub-allposts-action-btn",
                    onClick: () => {
                      const e = document.getElementById("all-posts-feed");
                      e?.scrollIntoView({ behavior: "smooth", block: "start" });
                    },
                  },
                  React.createElement(Qe, { className: "w-4 h-4" }),
                  tr("browse", "Browse"),
                ),
                React.createElement(
                  "button",
                  {
                    type: "button",
                    className: "mhub-allposts-action-btn",
                    onClick: () => {
                      if (!C) {
                        setLoginPromptOpen(!0);
                        return;
                      }
                      setShuffleSeed(Date.now());
                    },
                    disabled: C && !canShuffle,
                  },
                  React.createElement(zo, { className: "w-4 h-4" }),
                  tr("shuffle", "Shuffle"),
                ),
                React.createElement(
                  "button",
                  {
                    type: "button",
                    className: `mhub-allposts-action-btn ${
                      autoRefreshEnabled ? "is-active" : ""
                    }`,
                    onClick: () => setAutoRefreshEnabled((e) => !e),
                  },
                  React.createElement(zo, { className: "w-4 h-4" }),
                  autoRefreshEnabled
                    ? tr("live_updates_on", "Live")
                    : tr("live_updates_off", "Live"),
                ),
              ),
              React.createElement(PageDensityToggle, {
                value: density,
                onChange: setDensity,
                label: tr("view", "View"),
                className: "hidden sm:inline-flex ml-1",
              }),
              activeFiltersCount > 0 &&
                React.createElement(
                  "button",
                  {
                    type: "button",
                    className:
                      "quick-filters-clear inline-flex items-center justify-center rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 dark:border-red-600/40 dark:bg-red-900/30 dark:text-red-200 dark:hover:bg-red-900/40 transition-colors",
                    onClick: Y,
                  },
                  tr("clear_all_filters", "Clear all filters"),
                ),
            ),
          },
          activeSubcategoryLabel !== "All" &&
            React.createElement(
              "div",
              { className: "flex flex-wrap items-center gap-2.5" },
              React.createElement(
                "span",
                {
                  className:
                    "inline-flex items-center gap-1.5 h-11 px-3.5 rounded-full border border-indigo-200 bg-indigo-50 text-xs font-semibold text-indigo-700 dark:border-indigo-600/40 dark:bg-indigo-900/30 dark:text-indigo-200",
                },
                `${tr("subcategory", "Subcategory")}: ${activeSubcategoryLabel}`,
              ),
              React.createElement(
                "button",
                {
                  type: "button",
                  onClick: () => {
                    clearSubcategoryMode();
                    b({ subcategory: "All" });
                  },
                  className:
                    "inline-flex items-center gap-1.5 h-11 px-3.5 rounded-full border border-[var(--chip-border)] bg-[var(--chip-bg)] text-xs font-semibold text-slate-700 hover:bg-[var(--surface-2)] dark:text-slate-200 dark:border-[var(--chip-border)] dark:bg-[var(--chip-bg)] dark:hover:bg-[var(--surface-2)]",
                },
                tr("show_all_in_category", "Show all in category"),
              ),
            ),
          ge.length > 0 &&
            React.createElement(
              "div",
              { className: "flex flex-wrap items-center gap-2.5" },
              ge.map((e) =>
                React.createElement(
                  "button",
                  {
                    key: e.key,
                    type: "button",
                    onClick: () => Te(e.key),
                    className:
                      "inline-flex items-center gap-1.5 h-11 px-3.5 rounded-full border border-[var(--chip-border)] bg-[var(--chip-bg)] text-xs font-semibold text-slate-700 hover:bg-[var(--surface-2)] dark:text-slate-200 dark:border-[var(--chip-border)] dark:bg-[var(--chip-bg)] dark:hover:bg-[var(--surface-2)]",
                    title: tr("remove_filter", "Remove filter"),
                  },
                  React.createElement("span", null, e.label),
                  React.createElement(Jo, { className: "w-4 h-4 font-semibold" }),
                ),
              ),
            ),
        ),
      );
      const feedHeaderCompact = !showModeBanner;
      const showFeedTitle = showModeBanner;
    const Fe = useCallback(() => {
      setIsLiveSyncing(!0);
      if (C && canShuffle) {
        setShuffleSeed(Date.now());
      }
      Ce((e) => e + 1);
    }, [C, canShuffle]);
    useEffect(() => {
      const e = secondaryStickyRef.current;
      if (!e) {
        setSecondaryStickyHeight(0);
        return;
      }
      let a = null;
      const o = () => {
        const n = Math.ceil(e.getBoundingClientRect().height || 0);
        setSecondaryStickyHeight(n);
      };
      const n = () => {
        a && cancelAnimationFrame(a);
        a = requestAnimationFrame(o);
      };
      n();
      window.addEventListener("resize", n);
      let t = null;
      if (typeof ResizeObserver !== "undefined") {
        t = new ResizeObserver(n);
        t.observe(e);
      }
      return () => {
        window.removeEventListener("resize", n);
        a && cancelAnimationFrame(a);
        t && t.disconnect();
      };
    }, [activeFiltersCount, autoRefreshEnabled, ge.length, latestWindow, pageMaxWidthClass, Q, ue, showTopDealsBanner]);
    // Trigger a lightweight fade when filters change
    useEffect(() => {
      setFilterPulse(!0);
    }, [
      t.search,
      t.category,
      t.subcategory,
      t.categoryGroup,
      t.location,
      t.minPrice,
      t.maxPrice,
      t.startDate,
      t.endDate,
      t.condition,
      t.verifiedOnly,
      t.latestWindow,
      t.sortBy,
      effectiveCategoryLabel,
    ]);
    useEffect(() => {
      if (!filterPulse) return;
      const e = setTimeout(() => setFilterPulse(!1), 180);
      return () => clearTimeout(e);
    }, [filterPulse]);
    useEffect(() => {
      if (!lastLiveSyncAt) return;
      setUpdatedPulse(!0);
    }, [lastLiveSyncAt]);
    useEffect(() => {
      if (!updatedPulse) return;
      const e = setTimeout(() => setUpdatedPulse(!1), 900);
      return () => clearTimeout(e);
    }, [updatedPulse]);
        return (
      <div
        className={`mhub-page-allposts ${isForYouMode ? "mhub-page-foryou" : ""} mhub-premium-page min-h-screen overflow-x-hidden transition-colors duration-300 pb-28 bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 ${density === "compact" ? "mhub-compact" : ""}`}
        data-feed-mode={isForYouMode ? "for-you" : "all-posts"}
      >
        {/* Mode banner */}
        {showModeBanner && (
          <div className="w-full flex justify-center px-3 sm:px-4 pt-3" style={{ paddingTop: `${secondaryStickyTop}px` }}>
            <div className={`w-full ${pageMaxWidthClass} mhub-premium-surface rounded-2xl p-3 sm:p-3.5`}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {hasCategoryMode
                    ? `${tr("category_mode", "Category mode")}: ${categoryModeLabel}`
                    : `${tr("app_world", "App world")}: ${activeAppLabel}`}
                </div>
                <button
                  type="button"
                  onClick={() => y(hasCategoryMode ? "/category-mode" : "/category-hub")}
                  className="inline-flex items-center justify-center rounded-full border border-[var(--chip-border)] bg-[var(--chip-bg)] px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-[var(--surface-2)] dark:text-slate-200 transition-colors dark:border-[var(--chip-border)] dark:bg-[var(--chip-bg)] dark:hover:bg-[var(--surface-2)]"
                >
                  {hasCategoryMode ? tr("switch_category", "Switch category") : tr("switch_app", "Switch app")}
                </button>
              </div>
              {categoryModeLoading ? (
                <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-300">{tr("loading", "Loading")}</div>
              ) : hasCategoryMode && allPostsSubcategoryBarList.length > 0 ? (
                <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-300">
                  {allPostsSubcategoryBarList.length} {tr("subcategories", "subcategories")}
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* For You mode */}
        {isForYouMode ? (
          <ForYouPosts
            forYouHeroExpanded={forYouHeroExpanded}
            onToggleHeroExpanded={() => setForYouHeroExpanded((e) => !e)}
            resultsCount={(f || []).length}
            subcategoryCount={allPostsCategoryFallback.length || 0}
            activeFiltersCount={activeFiltersCount}
            onBrowseFeed={() => { const el = document.getElementById("all-posts-feed"); el?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
            onShuffle={() => setShuffleSeed(Date.now())}
            canShuffle={canShuffle}
            isAuthenticated={C}
            onClearFilters={Y}
            hasActiveFilters={ue}
            autoRefreshEnabled={autoRefreshEnabled}
            onToggleAutoRefresh={() => setAutoRefreshEnabled((e) => !e)}
            onSwitchToAllPosts={() => y("/all-posts")}
            setLoginPromptOpen={setLoginPromptOpen}
            pageMaxWidthClass={pageMaxWidthClass}
            secondaryStickyTop={secondaryStickyTop}
            dealsBannerNode={dealsBannerNode}
          />
        ) : null}

        {/* Regular mode hero */}
        {!showModeBanner && !isForYouMode ? (
          <section className="w-full mhub-allposts-hero" data-density="extra">
            <div className="w-full flex justify-center px-3 sm:px-4 pt-3" style={{ paddingTop: `${secondaryStickyTop}px` }}>
              <div className={`w-full ${pageMaxWidthClass}`}>
                <div className="mhub-allposts-hero-card">
                  <div className="mhub-allposts-hero-grid">
                    <div className="mhub-allposts-hero-main">
                      <div className="mhub-allposts-hero-kicker">{heroContextLabel}</div>
                      <h1 className="mhub-allposts-hero-title">{heroTitle}</h1>
                      <p className="mhub-allposts-hero-subtitle">{heroSubtitle}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 text-blue-600 px-3 py-2 dark:bg-blue-500/10 dark:text-blue-300">
                          {tr("marketplace_listings", "Marketplace listings")}
                        </span>
                        <button type="button" onClick={() => y("/feed")} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 px-3 py-2 text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10">
                          {tr("community_feed", "Community Feed")}
                          <Bo className="w-4 h-4" />
                        </button>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {tr("feed_updates_hint", "news & updates")}
                        </span>
                      </div>
                      {resultsCount > 0 && (
                        <div className="allposts-hero-stats mt-2 flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-3 py-1.5 text-xs font-bold whitespace-nowrap">
                            📦 {resultsCount} {tr("items_available", "items")}
                          </span>
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 px-3 py-1.5 text-xs font-bold whitespace-nowrap">
                            ⚡ {tr("live_marketplace", "Live marketplace")}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {/* Filter bar — sticky toolbar */}
        <FilterBar
          searchValue={t.search || ""}
          onSearchChange={(value) => b({ search: value })}
          onClearSearch={() => b({ search: "" })}
          searchPlaceholder={s("search_products", { defaultValue: "Search by title, description or subcategory..." })}
          quickFiltersChips={quickFiltersChips}
          isForYouMode={isForYouMode}
          categoryBarCategories={categoryBarCategories}
          activeCategoryBarLabel={activeCategoryBarLabel}
          onCategorySelectAll={handleCategoryBarSelectAll}
          onCategorySelect={handleCategoryBarSelect}
          subcategoryList={showSubcategoryRail ? allPostsSubcategoryBarList : []}
          activeSubcategoryLabel={activeSubcategoryLabel}
          onSubcategorySelectAll={Ee}
          onSubcategorySelect={handleSubcategoryBarSelect}
          maxWidthClass={pageMaxWidthClass}
          secondaryStickyTop={secondaryStickyTop}
          secondaryStickyRef={secondaryStickyRef}
          compact={density === "compact"}
        />

        {/* Deals banner */}
        {dealsBannerNode}

        {/* Feed section */}
        <div
          id="all-posts-feed"
          className={`mhub-allposts-feed w-full flex flex-col items-center mb-4 transition-opacity duration-200 ${filterPulse ? "opacity-90" : "opacity-100"}`}
        >
          <div className={`w-full ${feedMaxWidthClass} mx-auto px-3 ${feedHeaderCompact ? "pb-2 pt-2" : "pb-3 pt-4"} md:px-0`}>
            <FeedHeader title={feedTitle} compact={density === "compact"} />
          </div>
          {K.length > 0 ? K : (!E && !V ? (
            <div className="w-full text-center py-12 text-slate-500 dark:text-slate-400">
              {tr("no_posts_found", "No posts found")}
            </div>
          ) : null)}
        </div>

        {/* Filter panel overlay */}
        <AllPostsFilterPanel
          open={filterPanelOpen}
          onClose={() => setFilterPanelOpen(false)}
          filters={t}
          onApplyFilters={handleApplyFilters}
          onClearFilters={Y}
          activeFilterCount={activeFiltersCount}
        />

        {/* Modals */}
        {shareDialogOpen && <pt open={shareDialogOpen} onClose={() => setShareDialogOpen(false)} url={shareDialogUrl} />}
        {promotePostId && <PromoteDialog postId={promotePostId} postTitle={promotePostTitle} onClose={closePromote} />}
        {G && <BuyerInterestModal open={!!G} onClose={() => ie(null)} postDetails={G} />}
        {loginPromptOpen && <LoginPromptModal open={loginPromptOpen} onClose={() => setLoginPromptOpen(false)} returnTo={returnTo} />}

        {/* Page density toggle */}
        <div className="fixed bottom-20 right-4 z-40">
          <PageDensityToggle density={density} onDensityChange={setDensity} storageKey="mhub_allposts_density" />
        </div>

        {/* Nav sticky spacer */}
        <div className="w-full h-0 pointer-events-none" style={{ marginTop: `${navStickyTop}px` }} />
      </div>
    );
  };
var Nt = AllPosts;
export { Nt as default };

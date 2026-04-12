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
  FaHeart as He,
  FaRegHeart as qe,
  FaEye as Qe,
  FaHandHoldingHeart as Ye,
  FaShare as ko,
  FaBookmark as Qo,
  FaRegBookmark as Wo,
  FaArrowRight as Bo,
  FaShoppingCart as Yo,
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
import AllPostsGreatDealsBanner from "@/components/allposts/GreatDealsBanner";
import PostPromoBadges from "@/components/PostPromoBadges";
import {
  normalizeMediaList as ctm,
  resolveMediaUrl as utm,
} from "@/lib/mediaUrl";
import {
  buildActiveAppMatcher,
  matchesCategoryModeItem,
} from "@/utils/categoryModeFilters";
import { isPostOwnedByUser } from "@/utils/postOwnership";
const ve = 5,
  SHOW_POST_ID_CHIP = !0,
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
      isForYouMode = useMemo(() => {
        const params = new URLSearchParams(Z.search);
        return Z.pathname === "/for-you" || params.get("mode") === "for-you";
      }, [Z.pathname, Z.search]),
      basePath = Z.pathname === "/for-you" ? "/for-you" : "/all-posts",
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
        if (Array.isArray(categoryModeCategories)) {
          categoryModeCategories.forEach((category) => {
            (Array.isArray(category?.subcategories) ? category.subcategories : []).forEach(
              (entry) => addEntry(entry, category),
            );
          });
        }
        return map;
      }, [categoryModeSubcategories, categoryModeCategories]),
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
      fallbackCategoryList = Object.keys(Le).map((e) => ({
        name: e,
        category_id: e,
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
      const nextUrl = nextQuery ? `${basePath}?${nextQuery}` : basePath;
      if (`${Z.pathname}${Z.search}` !== nextUrl) {
        y(nextUrl, { replace: !0, state: { preserveScroll: !0 } });
      }
    }, [
      basePath,
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
        const nextUrl = nextQuery ? `${basePath}?${nextQuery}` : basePath;
        if (`${Z.pathname}${Z.search}` !== nextUrl) {
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
    const [ae, Se] = useState({}),
      [Ae, se] = useState({}),
      [De, oe] = useState({}),
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
      [showAllQuickFilters, setShowAllQuickFilters] = useState(!1),
      [compareItems, setCompareItems] = useState([]),
      [showComparePanel, setShowComparePanel] = useState(!1);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { density, setDensity } = usePageDensity("mhub_allposts_density");
    const languageRef = useRef(l);
    const secondaryStickyRef = useRef(null);
    const pageMaxWidthClass = "max-w-[92rem]";
    const feedMaxWidthClass = "max-w-[92rem]";
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
        const { _translatedLang, ...rest } = post;
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
    useEffect(() => {
      if (typeof window > "u" || typeof document > "u") return;
      const e = () => {
        if (C) return;
        const a = window.innerHeight + window.scrollY;
        const o = document.documentElement.scrollHeight;
        a >= o - 200 && setLoginPromptOpen((n) => n || !0);
      };
      return (
        window.addEventListener("scroll", e, { passive: !0 }),
        e(),
        () => {
          window.removeEventListener("scroll", e);
        }
      );
    }, [C]);
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
        () => navStickyTop + 8,
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
      activeCategoryId = hasActiveCategory
        ? categoryModeCategory?.id ||
          categoryModeCategory?.category_id ||
          ce[normalizeName(effectiveCategoryLabel)] ||
          ""
        : "",
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
        const scopedCategories = (Array.isArray(appScopedCategoryList) ? appScopedCategoryList : []).filter(
          (entry) => {
            if (!activeCategoryId) return !0;
            const id = entry?.category_id || entry?.id || null;
            return String(id || "") === String(activeCategoryId);
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
                  if (activeCategoryId) {
                    return String(categoryId || "") === String(activeCategoryId);
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
            const _ = {},
              Vt = {};
            Array.isArray(safeTranslatedSeed) &&
              safeTranslatedSeed.forEach((d) => {
                (_[d.post_id || d.id] = d.likes || 0),
                  (Vt[d.post_id || d.id] = d.views_count || d.views || 0);
              }),
              se((d) => ({ ...d, ..._ })),
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
            if (n?.name === "AbortError" || e !== P.current) return;
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
            v.current === a && (v.current = null),
              e === P.current && (R(!1), setIsLiveSyncing(!1));
            loadMorePendingRef.current = !1;
            userFilterChangeRef.current = !1;
          }
        })(),
        () => {
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
    ]),
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
            return !1;
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
        ? `${tr("category_mode", "Category mode")}: ${categoryModeLabel}`
        : activeAppLabel
          ? `${tr("app_world", "App world")}: ${activeAppLabel}`
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
    const Me = async (e) => {
        const a = ae[e];
        Se((o) => ({ ...o, [e]: !o[e] })),
          se((o) => ({ ...o, [e]: (o[e] || 0) + (a ? -1 : 1) }));
        try {
          await A.post(`/posts/${e}/like`);
        } catch {}
      },
      handleSharePost = async (e) => {
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
        const a = I(e);
        if (!a) return;
        if (!C) {
          M("Please login to save posts"),
            setTimeout(() => M(""), 2e3),
            y("/login", { state: { returnTo } });
          return;
        }
        const o = !!savedPosts[a],
          n = !o;
        setSavedPosts((i) => ({ ...i, [a]: n })), setSavedPostStatus(a, n);
        try {
          n
            ? await A.post("/wishlist", { postId: a })
            : await A.delete(`/wishlist/${a}`);
        } catch {
          setSavedPosts((n) => ({ ...n, [a]: o })),
            setSavedPostStatus(a, o),
            M(o ? "Failed to remove saved post" : "Failed to save post"),
            setTimeout(() => M(""), 2e3);
        }
      },
      handleCartToggle = useCallback(
        (e) => {
          const a = I(e?.post_id || e?.id);
          if (!a) return;
          if (!C) {
            setLoginPromptOpen(!0);
            return;
          }
          if (isInCartItem(a)) {
            removeCartItem(a);
            M(s("removed", { defaultValue: "Removed from cart" }));
          } else {
            addCartItem({
              id: a,
              title: e?.title || s("title", { defaultValue: "Item" }),
              price: e?.price || 0,
              image: Ne(e),
              seller: e?.user?.name || e?.user_name || e?.username || "Unknown",
              location: e?.location || e?.city || e?.area || "",
              category_id:
                e?.category_id ||
                e?.categoryId ||
                e?.category?.category_id ||
                e?.category?.id ||
                "",
              category_name:
                e?.category_name ||
                e?.categoryName ||
                e?.category_title ||
                e?.categoryTitle ||
                (typeof e?.category === "object"
                  ? e?.category?.name || e?.category?.title || e?.category?.label
                  : e?.category) ||
                "",
              category_group:
                e?.category_group ||
                e?.categoryGroup ||
                e?.category?.category_group ||
                e?.category?.categoryGroup ||
                activeApp ||
                "",
            });
            M(s("add_to_cart", { defaultValue: "Added to cart" }));
          }
          setTimeout(() => M(""), 2e3);
        },
        [C, addCartItem, isInCartItem, removeCartItem, s, activeApp],
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
      quickFilterMax = 4,
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
        : quickFilterChips.slice(0, quickFilterMax),
      quickFiltersChips = [
        ...quickFiltersVisible,
        {
          key: "toggle-filters",
          label: showAllQuickFilters
            ? tr("less_filters", "Less filters")
            : tr("more_filters", "More filters"),
          active: showAllQuickFilters,
          onClick: () => setShowAllQuickFilters((e) => !e),
          className:
            "border-dashed border-slate-300 text-slate-600 bg-[var(--surface-1)] hover:bg-[var(--surface-2)] dark:border-slate-600 dark:text-slate-200 dark:border-dashed dark:bg-[var(--surface-1)] dark:hover:bg-[var(--surface-2)]",
        },
          ],
      contentTopOffset = 0,
      feedHeaderCompact = !showModeBanner,
      showFeedTitle = showModeBanner,
    Fe = useCallback(() => {
      if (!C) {
        setLoginPromptOpen(!0);
          return;
        }
        setIsLiveSyncing(!0);
        if (canShuffle) {
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
    return React.createElement(
      "div",
      {
          className:
            `mhub-page-allposts mhub-premium-page min-h-screen transition-colors duration-300 pb-24 ${density === "compact" ? "mhub-compact" : ""}`,
      },
      showModeBanner &&
        React.createElement(
          "div",
          {
            className: "w-full flex justify-center px-3 sm:px-4 pt-3 pb-3",
            style: { paddingTop: `${contentTopOffset}px` },
          },
          React.createElement(
            "div",
            {
              className: `w-full ${pageMaxWidthClass} mhub-premium-surface rounded-2xl p-3 sm:p-3.5`,
            },
            React.createElement(
              "div",
              { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" },
              React.createElement(
                "div",
                {
                  className:
                    "text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200",
                },
                hasCategoryMode
                  ? `${tr("category_mode", "Category mode")}: ${categoryModeLabel}`
                  : `${tr("app_world", "App world")}: ${activeAppLabel}`,
              ),
              React.createElement(
                "button",
                {
                  type: "button",
                  className:
                    "inline-flex items-center justify-center rounded-full border border-[var(--chip-border)] bg-[var(--chip-bg)] px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-[var(--surface-2)] dark:text-slate-200 transition-colors dark:border dark:border-[var(--chip-border)] dark:bg-[var(--chip-bg)] dark:hover:bg-[var(--surface-2)]",
                  onClick: () => y(hasCategoryMode ? "/category-mode" : "/category-hub"),
                },
                hasCategoryMode
                  ? tr("switch_category", "Switch category")
                  : tr("switch_app", "Switch app"),
              ),
            ),
            categoryModeLoading
              ? React.createElement(
                  "div",
                  {
                    className:
                      "mt-1.5 text-[11px] sm:text-xs text-slate-500 dark:text-slate-300",
                  },
                  tr("loading", "Loading"),
                )
              : hasCategoryMode && allPostsSubcategoryBarList.length > 0 &&
                React.createElement(
                  "div",
                  {
                    className:
                      "mt-1.5 text-[11px] sm:text-xs text-slate-500 dark:text-slate-300",
                  },
                  `${allPostsSubcategoryBarList.length} `,
                  tr("subcategories", "subcategories"),
            ),
          ),
        ),
      !showModeBanner &&
        React.createElement(
          "section",
          {
            className: "w-full mhub-allposts-hero",
            "data-density": "extra",
            style: { paddingTop: `${contentTopOffset}px` },
          },
          React.createElement(
            "div",
            { className: `w-full ${pageMaxWidthClass} mx-auto px-3 sm:px-4` },
            React.createElement(
              "div",
              { className: "mhub-allposts-hero-card" },
              React.createElement(
                "div",
                { className: "mhub-allposts-hero-grid" },
                React.createElement(
                  "div",
                  { className: "mhub-allposts-hero-main" },
                  React.createElement(
                    "div",
                    { className: "mhub-allposts-hero-kicker" },
                    heroContextLabel,
                  ),
                  React.createElement(
                    "h1",
                    { className: "mhub-allposts-hero-title" },
                    heroTitle,
                  ),
                  React.createElement(
                    "p",
                    { className: "mhub-allposts-hero-subtitle" },
                    heroSubtitle,
                  ),
                  React.createElement(
                    "div",
                    {
                      className:
                        "mt-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300",
                    },
                    React.createElement(
                      "span",
                      {
                        className:
                          "inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-600 px-2 py-0.5 dark:bg-blue-500/10 dark:text-blue-300",
                      },
                      tr("marketplace_listings", "Marketplace listings"),
                    ),
                    React.createElement(
                      "button",
                      {
                        type: "button",
                        onClick: () => y("/feed"),
                        className:
                          "inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/80 px-2 py-0.5 text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10",
                      },
                      tr("community_feed", "Community Feed"),
                      React.createElement(Bo, { className: "w-3 h-3" }),
                    ),
                    React.createElement(
                      "span",
                      { className: "text-[10px] text-slate-500 dark:text-slate-400" },
                      tr("feed_updates_hint", "news & updates"),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      React.createElement(
        "div",
        {
          className: "w-full sticky z-30 mhub-premium-bar mhub-allposts-toolbar",
          ref: secondaryStickyRef,
          style: { top: `${secondaryStickyTop}px` },
        },
        React.createElement(AllPostsCategoryBar, {
          categories: allPostsSubcategoryBarList,
          activeCategory: activeSubcategoryLabel || "All",
          onSelectAll: Ee,
          onSelectCategory: handleSubcategoryBarSelect,
          translate: tr,
          icons: Le,
          iconResolver: () => "\uD83C\uDFF7\uFE0F",
          maxWidthClass: pageMaxWidthClass,
          compact: !0,
          showCategoryCounts: !1,
        }),
        React.createElement(
          "div",
          { className: "w-full mhub-allposts-filters" },
          React.createElement(
            AllPostsQuickFilters,
            {
              title: tr("quick_filters", "Quick filters"),
              variant: "default",
              compact: !0,
              inline: !0,
              inlineWrap: !1,
              showDivider: !1,
              chips: quickFiltersChips,
              maxWidthClass: pageMaxWidthClass,
              headerRight: React.createElement(
                "div",
                { className: "quick-filters-actions flex flex-wrap items-center gap-2" },
                React.createElement(
                  "div",
                  {
                    className:
                      "mhub-allposts-action-group inline-flex items-center gap-1 rounded-full border border-[var(--chip-border)] bg-[var(--surface-2)] px-1.5 py-0.5 dark:border dark:border-[var(--chip-border)] dark:bg-[var(--surface-2)]",
                  },
                  React.createElement(
                    "button",
                    {
                      type: "button",
                      className: "mhub-allposts-action-btn",
                      onClick: () => {
                        const e = document.getElementById("all-posts-feed");
                        e?.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        });
                      },
                    },
                    React.createElement(Bo, { className: "w-3 h-3" }),
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
                        if (typeof window !== "undefined") {
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }
                      },
                    },
                    React.createElement(zo, { className: "w-3 h-3" }),
                    tr("shuffle_feed", "Shuffle"),
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
                    React.createElement(zo, { className: "w-3 h-3" }),
                    autoRefreshEnabled
                      ? tr("live_updates_on", "Live")
                      : tr("live_updates_off", "Live"),
                  ),
                ),
                React.createElement(
                  "div",
                  {
                    className:
                      "quick-filters-sort inline-flex items-center gap-1 rounded-full border border-[var(--chip-border)] bg-[var(--surface-2)] px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-200 dark:border dark:border-[var(--chip-border)] dark:bg-[var(--surface-2)]",
                  },
                  React.createElement(
                    "span",
                    { className: "px-1.5 text-[10px] uppercase tracking-wide" },
                    tr("sort", "Sort"),
                  ),
                  React.createElement(
                    "button",
                    {
                      type: "button",
                      onClick: () => b({ sortBy: "date_desc", latestWindow: "" }),
                      className: `px-2 py-0.5 rounded-full transition ${t.sortBy === "date_desc" ? "bg-blue-600 text-white" : "hover:bg-[var(--surface-2)]"}`,
                    },
                    tr("newest", "Newest"),
                  ),
                  React.createElement(
                    "button",
                    {
                      type: "button",
                      onClick: () => b({ sortBy: "price_asc", latestWindow: "" }),
                      className: `px-2 py-0.5 rounded-full transition ${t.sortBy === "price_asc" ? "bg-blue-600 text-white" : "hover:bg-[var(--surface-2)]"}`,
                    },
                    tr("price_low", "Price \u2191"),
                  ),
                  React.createElement(
                    "button",
                    {
                      type: "button",
                      onClick: () => b({ sortBy: "price_desc", latestWindow: "" }),
                      className: `px-2 py-0.5 rounded-full transition ${t.sortBy === "price_desc" ? "bg-blue-600 text-white" : "hover:bg-[var(--surface-2)]"}`,
                    },
                    tr("price_high", "Price \u2193"),
                  ),
                ),
                React.createElement(PageDensityToggle, {
                  value: density,
                  onChange: setDensity,
                  label: tr("view", "View"),
                  className: "ml-1",
                }),
                activeFiltersCount > 0 &&
                  React.createElement(
                    "button",
                    {
                      type: "button",
                      className:
                        "quick-filters-clear inline-flex items-center justify-center rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-100 dark:border-red-800/60 dark:bg-red-900/30 dark:text-red-200 dark:hover:bg-red-900/40 transition-colors dark:border dark:border-red-600/40 dark:bg-red-950/20 dark:text-red-300 dark:hover:bg-red-950/20",
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
                      "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border border-indigo-200 bg-indigo-50 text-[10px] font-semibold text-indigo-700 dark:border-indigo-800/60 dark:bg-indigo-900/30 dark:text-indigo-200 dark:border dark:border-indigo-600/40 dark:bg-indigo-950/20 dark:text-indigo-300",
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
                      "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border border-[var(--chip-border)] bg-[var(--chip-bg)] text-[10px] font-semibold text-slate-700 hover:bg-[var(--surface-2)] dark:text-slate-200 dark:border dark:border-[var(--chip-border)] dark:bg-[var(--chip-bg)] dark:hover:bg-[var(--surface-2)]",
                  },
                  tr("show_all_in_category", "Show all in category"),
                ),
                React.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: () => y(browseOtherSubcategoriesPath),
                    className:
                      "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border border-sky-200 bg-sky-50 text-[10px] font-semibold text-sky-700 hover:bg-sky-100 dark:border-sky-800/60 dark:bg-sky-900/30 dark:text-slate-200 dark:border dark:border-sky-600/40 dark:bg-sky-950/20 dark:text-sky-300 dark:hover:bg-sky-950/20",
                  },
                  tr("browse_other_subcategories", "Browse other subcategories"),
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
                        "inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-[var(--chip-border)] bg-[var(--chip-bg)] text-[11px] font-semibold text-slate-700 hover:bg-[var(--surface-2)] dark:text-slate-200 dark:border dark:border-[var(--chip-border)] dark:bg-[var(--chip-bg)] dark:hover:bg-[var(--surface-2)]",
                      title: tr("remove_filter", "Remove filter"),
                    },
                    React.createElement("span", null, e.label),
                    React.createElement(Jo, { className: "w-3 h-3 font-semibold" }),
                  ),
                ),
              ),
          ),
        ),
      ),
      dealsBannerNode,
      React.createElement(
        "div",
        {
          id: "all-posts-feed",
          className: `w-full flex flex-col items-center mb-4 transition-opacity duration-200 ${filterPulse ? "opacity-90" : "opacity-100"}`,
        },
        React.createElement(
          "div",
          {
            className: `w-full ${feedMaxWidthClass} mx-auto px-3 ${feedHeaderCompact ? "pb-2 pt-2" : "pb-3 pt-4"} md:px-0`,
          },
          React.createElement(
            "div",
            {
              className: `mhub-feed-header mhub-allposts-header flex flex-col gap-1 ${feedHeaderCompact ? "is-compact" : ""}`,
            },
            showFeedTitle
              ? React.createElement(
                  showModeBanner ? "h1" : "h2",
                  {
                    id: "all-posts-feed-title",
                    className:
                      showModeBanner
                        ? "text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100"
                        : "text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100",
                  },
                  feedTitle,
                )
              : React.createElement("span", { className: "sr-only" }, feedTitle),
            !E &&
              !V &&
              React.createElement(
                "div",
                {
                  className:
                    `mhub-feed-summary-line ${feedHeaderCompact ? "text-[11px] sm:text-xs font-semibold text-slate-600 dark:text-slate-300" : "text-sm font-semibold text-slate-600 dark:text-slate-300"}`,
                },
                feedSummaryLine,
              ),
          ),
        ),
        React.createElement(
          "div",
          {
            className: `w-full ${feedMaxWidthClass} mx-auto px-3 pt-4 md:px-0`,
          },
          React.createElement(
            "div",
            {
              className: "order-1 flex flex-col gap-3 w-full min-w-0",
            },
            E
              ? Array.from({ length: 3 }).map((e, a) =>
                  React.createElement(Card,
                    {
                      key: `all-posts-skeleton-${a}`,
                      className:
                        "rounded-2xl border border-slate-200/80 dark:border-gray-700/70 mhub-premium-surface p-4 shadow-sm animate-pulse dark:border dark:border-slate-700/80",
                    },
                    React.createElement("div", {
                      className:
                        "h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-3 dark:bg-gray-900",
                    }),
                    React.createElement("div", {
                      className:
                        "h-52 w-full bg-gray-200 dark:bg-gray-700 rounded-lg mb-3 dark:bg-gray-900",
                    }),
                    React.createElement("div", {
                      className:
                        "h-4 w-5/6 bg-gray-200 dark:bg-gray-700 rounded mb-2 dark:bg-gray-900",
                    }),
                    React.createElement("div", {
                      className:
                        "h-4 w-2/3 bg-gray-200 dark:bg-gray-700 rounded dark:bg-gray-900",
                    }),
                  ),
                )
              : V
                ? React.createElement(Card,
                    {
                      className:
                        "border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 p-5 dark:border dark:border-red-600/40 dark:bg-red-950/20",
                    },
                    React.createElement(
                      "p",
                      {
                        className:
                          "text-sm text-red-700 dark:text-red-300 mb-3",
                      },
                      V,
                    ),
                    React.createElement(
                      "div",
                      { className: "flex flex-wrap gap-2" },
                      React.createElement(Button,
                        {
                          type: "button",
                          className: "bg-red-600 text-white hover:bg-red-700 dark:bg-red-700/40 dark:text-white dark:hover:bg-red-700/40",
                          onClick: Fe,
                        },
                        tr("retry", "Retry"),
                      ),
                      ue &&
                        React.createElement(Button,
                          {
                            type: "button",
                            variant: "outline",
                            className: "border-red-200 text-red-700 dark:border-red-600/40 dark:text-red-300",
                            onClick: Y,
                          },
                          tr("reset_filters", "Reset filters"),
                        ),
                    ),
                  )
                : K.length === 0
                  ? React.createElement(Card,
                      {
                        className:
                          "border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/30 p-4 text-center dark:border dark:border-blue-600/40 dark:bg-blue-950/20 dark:text-center",
                      },
                      React.createElement(
                        "h3",
                        {
                          className:
                            "text-base md:text-lg font-semibold text-blue-900 dark:text-blue-200 mb-2",
                        },
                        activeSubcategoryLabel !== "All"
                          ? tr(
                              "no_results_in_subcategory",
                              `No posts in ${activeSubcategoryLabel} right now`,
                            )
                          : hasActiveCategory
                            ? tr(
                                "no_results_in_category",
                                `No posts in ${effectiveCategoryLabel} right now`,
                              )
                            : tr("no_results", "No results for the current filters"),
                      ),
                      React.createElement(
                        "p",
                        {
                          className:
                            "text-sm text-blue-700 dark:text-blue-300 mb-4",
                        },
                        activeSubcategoryLabel !== "All"
                          ? tr(
                              "try_other_subcategory",
                              `Try another subcategory in ${effectiveCategoryLabel || tr("this_category", "this category")} or clear the subcategory filter.`,
                            )
                          : tr(
                              "try_broader_keyword",
                              "Try broadening search terms, changing category, or clearing filters.",
                            ),
                      ),
                      React.createElement(
                        "div",
                        { className: "flex flex-wrap justify-center gap-2" },
                        activeSubcategoryLabel !== "All" &&
                          React.createElement(Button,
                            {
                              type: "button",
                              variant: "outline",
                              className: "border-indigo-200 text-indigo-700 dark:border-indigo-600/40 dark:text-indigo-300",
                              onClick: () => {
                                clearSubcategoryMode();
                                b({ subcategory: "All" });
                              },
                            },
                            tr("show_all_in_category", "Show all in category"),
                          ),
                        React.createElement(Button,
                          {
                            type: "button",
                            className:
                              "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700/40 dark:text-white dark:hover:bg-blue-700/40",
                            onClick: Y,
                          },
                          tr("reset_filters", "Reset filters"),
                        ),
                        React.createElement(Button,
                          {
                            type: "button",
                            variant: "outline",
                            className: "border-blue-200 text-blue-700 dark:border-blue-600/40 dark:text-blue-300",
                            onClick: () => y(browseOtherSubcategoriesPath),
                          },
                          activeSubcategoryLabel !== "All"
                            ? tr("browse_other_subcategories", "Browse other subcategories")
                            : tr("explore_subcategories", "Browse subcategories"),
                        ),
                      ),
                    )
                  : K.map((e, index) => {
                      const a = I(e.post_id || e.id),
                        o =
                          e.user?.name ||
                          e.user_name ||
                          e.username ||
                          s("unknown", { defaultValue: "Unknown" }),
                        n = String(o || "U")
                          .charAt(0)
                          .toUpperCase(),
                        subcategoryNameRaw =
                          e.subcategory_name ||
                          e.subcategory ||
                          e.subcategoryName ||
                          "",
                        subcategoryIdRaw =
                          e.subcategory_id ??
                          e.subcategoryId ??
                          e.subcategoryID ??
                          null,
                        resolvedSubcategoryLabel = (() => {
                          const direct = String(subcategoryNameRaw || "").trim();
                          if (direct && direct !== "All") {
                            if (/^\d+$/.test(direct)) {
                              const mapped = subcategoryNameById[String(direct)];
                              if (mapped) return mapped;
                            }
                            return direct;
                          }
                          const id =
                            subcategoryIdRaw != null && subcategoryIdRaw !== ""
                              ? String(subcategoryIdRaw).trim()
                              : "";
                          if (!id) return "";
                          return subcategoryNameById[String(id)] || "";
                        })(),
                        subcategoryLabel =
                          resolvedSubcategoryLabel || tr("general", "General"),
                        F = !!(
                          e.user?.isVerified ||
                          e.is_verified ||
                          e.aadhaar_verified ||
                          e.pan_verified
                        ),
                        he = nt(e.created_at || e.createdAt, l),
                        we = e.location || e.city || e.area || "",
                        title =
                          e.title || e.name || s("untitled", { defaultValue: "Untitled post" }),
                        isOwnerPost = isPostOwnedByUser(e, currentUserId),
                        resolvedPriceValue = resolvePostPriceValue(e),
                        priceValue =
                          resolvedPriceValue > 0
                            ? formatCurrency(resolvedPriceValue)
                            : tr("price_on_request", "Price on request"),
                        imageList = collectPostImageUrls(e),
                        activeImageIndex = getCarouselIndex(
                          a,
                          imageList.length,
                        ),
                        inCart = isInCartItem(a);
                      const subcategoryChip = subcategoryLabel
                        ? {
                            key: "subcategory",
                            label: subcategoryLabel,
                            className:
                              "mhub-chip inline-flex items-center px-2 py-0.5 rounded-full text-blue-700 dark:text-blue-300 font-medium",
                          }
                        : null;
                      const locationChip = we
                        ? {
                            key: "location",
                            label: we,
                            className:
                              "mhub-chip inline-flex items-center px-2 py-0.5 rounded-full",
                          }
                        : null;
                      const postedChip = he
                        ? {
                            key: "posted",
                            label: `${s("posted", { defaultValue: "Posted" })} ${he}`,
                            className:
                              "mhub-chip inline-flex items-center px-2 py-0.5 rounded-full",
                          }
                        : null;
                      const postIdChip =
                        SHOW_POST_ID_CHIP && a
                          ? {
                              key: "post-id",
                              label: `${s("post_id", { defaultValue: "Post ID" })}: ${a}`,
                              className:
                                "mhub-chip inline-flex items-center px-2 py-0.5 rounded-full font-semibold text-gray-600 dark:text-gray-200",
                            }
                          : null;
                      const visibleMetaChips = [subcategoryChip, locationChip].filter(
                        Boolean,
                      );
                      const hiddenMetaChips = [postedChip, postIdChip].filter(
                        Boolean,
                      );
                      const metaChips = [
                        ...visibleMetaChips,
                        ...hiddenMetaChips,
                      ];
                      const hiddenMetaTitle = hiddenMetaChips
                        .map((X) => X.label)
                        .join(" \u2022 ");
                      const isMetaExpanded = expandedMetaPostId === a;
                      const shownMetaChips = isMetaExpanded
                        ? metaChips
                        : visibleMetaChips;
                      const card = React.createElement(Card,
                          {
                            key: a || `post-card-${index}`,
                            ref: (X) => {
                              de.current[a] = X;
                            },
                            "data-post-id": a,
                            className:
                              "mhub-allposts-card mhub-surface rounded-2xl flex flex-col p-0 overflow-hidden hover:-translate-y-0.5 transition-all duration-300",
                          },
                        React.createElement(
                          "div",
                          {
                            className:
                              "flex items-start gap-3 px-3 pt-2 pb-2 relative sm:px-4",
                          },
                          React.createElement(Avatar,
                            {
                              className: "w-9 h-9 shrink-0 sm:w-10 sm:h-10",
                            },
                            React.createElement(AvatarFallback,
                              {
                                className:
                                  "bg-[var(--surface-2)] text-slate-600 dark:text-slate-100 text-[10px] dark:bg-[var(--surface-2)] dark:text-slate-200",
                              },
                              n || "U",
                            ),
                          ),
                          React.createElement(
                            "div",
                            { className: "flex-1 min-w-0 pr-12" },
                            React.createElement(
                              "div",
                              { className: "flex flex-wrap items-center gap-2" },
                              React.createElement(
                                "span",
                                {
                                  className:
                                    "font-semibold text-slate-700 dark:text-slate-200 text-sm sm:text-base md:text-base truncate",
                                },
                                o,
                              ),
                              F &&
                                React.createElement(
                                  "span",
                                  {
                                    className:
                                      "inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-full border border-blue-200 dark:border-blue-700 shadow-sm",
                                    title: `Verified Seller${e.user?.aadhaarVerified ? " (Aadhaar)" : ""}${e.user?.panVerified ? " (PAN)" : ""}`,
                                  },
                                  React.createElement(
                                    "svg",
                                    {
                                      className: "w-3.5 h-3.5 text-blue-500 dark:text-blue-400",
                                      fill: "currentColor",
                                      viewBox: "0 0 20 20",
                                    },
                                    React.createElement("path", {
                                      fillRule: "evenodd",
                                      d: "M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z",
                                      clipRule: "evenodd",
                                    }),
                                  ),
                                  s("verified", { defaultValue: "Verified" }),
                                ),
                              /* Trust/reliability/response badges removed from cards — only shown on PostDetail */
                              React.createElement(
                                "span",
                                {
                                  className:
                                    "mhub-price-pill inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] sm:text-sm font-semibold sm:ml-auto",
                                },
                                React.createElement(
                                  "span",
                                  {
                                    className:
                                      "uppercase tracking-wide text-[9px] sm:text-[10px] text-emerald-600/80 dark:text-emerald-300/80",
                                  },
                                  tr("price", "Price"),
                                ),
                                React.createElement(
                                  "span",
                                  {
                                    className:
                                      "font-bold text-emerald-900 dark:text-emerald-100 text-sm sm:text-base dark:text-emerald-200",
                                  },
                                  priceValue,
                                ),
                              ),
                            ),
                          React.createElement(
                            "h3",
                            {
                              className:
                                "mhub-card-title mt-1 text-lg sm:text-xl md:text-2xl leading-tight truncate",
                            },
                            title,
                          ),
                          React.createElement(
                            "div",
                            {
                              className:
                                "mhub-card-meta mt-1 flex flex-wrap items-center gap-1 text-[10px] sm:text-[11px]",
                            },
                            shownMetaChips.map((X) =>
                              React.createElement(
                                "span",
                                { key: X.key, className: X.className },
                                X.label,
                              ),
                            ),
                            hiddenMetaChips.length > 0 &&
                              !isMetaExpanded &&
                              React.createElement(
                                "button",
                                {
                                  className:
                                    "mhub-chip inline-flex items-center px-2 py-0.5 rounded-full font-semibold text-gray-600 dark:text-gray-200",
                                  title: hiddenMetaTitle,
                                  onClick: () =>
                                    setExpandedMetaPostId((X) =>
                                      X === a ? null : a,
                                    ),
                                  "aria-expanded": !1,
                                  "aria-label": `${tr(
                                    "show_more_meta",
                                    "Show more details",
                                  )}: ${hiddenMetaTitle}`,
                                },
                                `+${hiddenMetaChips.length} more`,
                              ),
                            hiddenMetaChips.length > 0 &&
                              isMetaExpanded &&
                              React.createElement(
                                "button",
                                {
                                  className:
                                    "mhub-chip inline-flex items-center px-2 py-0.5 rounded-full font-semibold text-gray-600 dark:text-gray-200",
                                  onClick: () => setExpandedMetaPostId(null),
                                  "aria-expanded": !0,
                                  "aria-label": tr(
                                    "hide_details",
                                    "Hide details",
                                  ),
                                },
                                tr("less", "Less"),
                              ),
                          ),
                          ),
                          React.createElement(
                            DropdownMenu,
                            {
                              open: menuPostId === a,
                              onOpenChange: (X) => setMenuPostId(X ? a : null),
                            },
                            React.createElement(
                              DropdownMenuTrigger,
                              { asChild: !0 },
                              React.createElement(
                                "button",
                                {
                                  type: "button",
                                  onClick: (X) => X.stopPropagation(),
                                  className:
                                    "absolute right-3 top-3 rounded-full p-1.5 text-gray-500 hover:bg-[var(--surface-2)] sm:right-4 sm:top-4 sm:p-2 dark:text-gray-300 dark:hover:bg-[var(--surface-2)]",
                                  title: tr("more_options", "More options"),
                                  "aria-label": tr("more_options", "More options"),
                                },
                                React.createElement(To, { className: "w-4 h-4" }),
                              ),
                            ),
                            React.createElement(
                              DropdownMenuContent,
                              {
                                align: "end",
                                className:
                                  "w-44 rounded-xl border border-gray-200 dark:border-gray-700 mhub-premium-surface shadow-lg p-1 dark:border",
                              },
                              React.createElement(
                                DropdownMenuItem,
                                {
                                  onSelect: () => handleSharePost(a),
                                  className:
                                    "w-full text-left px-3 py-2 text-sm hover:bg-[var(--surface-2)] rounded-lg dark:text-left dark:hover:bg-[var(--surface-2)]",
                                },
                                s("share", { defaultValue: "Share" }),
                              ),
                              React.createElement(
                                DropdownMenuItem,
                                {
                                  onSelect: () => toggleSave(a),
                                  className:
                                    "w-full text-left px-3 py-2 text-sm hover:bg-[var(--surface-2)] rounded-lg dark:text-left dark:hover:bg-[var(--surface-2)]",
                                },
                                savedPosts[a]
                                  ? s("saved", { defaultValue: "Saved" })
                                  : s("save", { defaultValue: "Save" }),
                              ),
                              isOwnerPost &&
                                React.createElement(
                                  DropdownMenuItem,
                                  {
                                    onSelect: () => {
                                      openPromote(a, title);
                                      setMenuPostId(null);
                                    },
                                    className:
                                      "w-full text-left px-3 py-2 text-sm hover:bg-[var(--surface-2)] rounded-lg dark:text-left dark:hover:bg-[var(--surface-2)]",
                                  },
                                  tr("promote", "Promote"),
                                ),
                              React.createElement(
                                DropdownMenuItem,
                                {
                                  onSelect: () => handleCartToggle(e),
                                  className:
                                    "w-full text-left px-3 py-2 text-sm hover:bg-[var(--surface-2)] rounded-lg dark:text-left dark:hover:bg-[var(--surface-2)]",
                                },
                                inCart
                                  ? s("in_cart", { defaultValue: "In Cart" })
                                  : s("add_to_cart", { defaultValue: "Add to Cart" }),
                              ),
                              React.createElement(
                                DropdownMenuItem,
                                {
                                  onSelect: () => toggleCompare(e),
                                  className:
                                    "w-full text-left px-3 py-2 text-sm hover:bg-[var(--surface-2)] rounded-lg dark:text-left dark:hover:bg-[var(--surface-2)]",
                                },
                                isInCompare(a)
                                  ? s("in_compare", { defaultValue: "In Compare" })
                                  : s("compare", { defaultValue: "Compare" }),
                              ),
                              React.createElement(
                                DropdownMenuItem,
                                {
                                  onSelect: () => handleReportPost(a),
                                  className:
                                    "w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg dark:text-left dark:text-red-300 dark:hover:bg-red-950/20",
                                },
                                s("report", { defaultValue: "Report" }),
                              ),
                            ),
                          ),
                        ),
                        React.createElement(
                          "div",
                          {
                            className:
                              "relative w-full bg-[var(--surface-2)] border-y border-[var(--chip-border)] mhub-media-frame dark:bg-[var(--surface-2)] dark:border-y dark:border-[var(--chip-border)]",
                          },
                          React.createElement(PostPromoBadges, {
                            post: e,
                            t: s,
                            size: "xs",
                            className: "absolute left-3 top-3 z-10",
                          }),
                          React.createElement(
                            "div",
                            {
                              ref: (X) => setCarouselTrackRef(a, X),
                              onScroll: (X) =>
                                handleCarouselScroll(a, X, imageList.length),
                              className:
                                "flex w-full overflow-x-auto snap-x snap-mandatory scrollbar-hide",
                            },
                            imageList.map((X, _t) =>
                              React.createElement(
                                "div",
                                {
                                  key: `${a}-media-${_t}`,
                                  className:
                                    "w-full shrink-0 snap-center bg-[var(--surface-2)] dark:bg-[var(--surface-2)]",
                                },
                                React.createElement("img", {
                                  src: X,
                                  alt: `${e.title || s("post", { defaultValue: "Post" })} ${s("image", { defaultValue: "image" })} ${_t + 1}`,
                                  loading: "lazy",
                                  ref: (Nt) => {
                                    if (!Nt) return;
                                    if (Nt.complete) {
                                      if (Nt.naturalWidth === 0 && Nt.src !== D) {
                                        Nt.src = D;
                                      }
                                      Nt.dataset.loaded = "true";
                                      const frame = Nt.closest(".mhub-media-frame");
                                      frame && frame.setAttribute("data-loaded", "true");
                                    }
                                  },
                                  className:
                                    "mhub-media-img w-full h-[200px] sm:h-[240px] md:h-[280px] object-cover object-center",
                                  onLoad: (Nt) => {
                                    Nt.currentTarget.dataset.loaded = "true";
                                    const frame = Nt.currentTarget.closest(".mhub-media-frame");
                                    frame && frame.setAttribute("data-loaded", "true");
                                  },
                                  onError: (Nt) => {
                                    Nt.currentTarget.src = D;
                                    Nt.currentTarget.dataset.loaded = "true";
                                    const frame = Nt.currentTarget.closest(".mhub-media-frame");
                                    frame && frame.setAttribute("data-loaded", "true");
                                  },
                                }),
                              ),
                            ),
                          ),
                          imageList.length > 1 &&
                            React.createElement(
                              React.Fragment,
                              null,
                              React.createElement(
                                "button",
                                {
                                  type: "button",
                                  onClick: (X) =>
                                    moveCarousel(a, -1, imageList.length, X),
                                  className:
                                    "absolute left-3 top-1/2 -translate-y-1/2 z-10 h-7 w-7 rounded-full bg-black/45 text-white hover:bg-black/60 flex items-center justify-center sm:h-8 sm:w-8 dark:bg-black/45 dark:text-white dark:hover:bg-black/60",
                                  "aria-label":
                                    tr("previous_image", "Previous image"),
                                },
                                React.createElement(Lo, { className: "w-3 h-3" }),
                              ),
                              React.createElement(
                                "button",
                                {
                                  type: "button",
                                  onClick: (X) =>
                                    moveCarousel(a, 1, imageList.length, X),
                                  className:
                                    "absolute right-3 top-1/2 -translate-y-1/2 z-10 h-7 w-7 rounded-full bg-black/45 text-white hover:bg-black/60 flex items-center justify-center sm:h-8 sm:w-8 dark:bg-black/45 dark:text-white dark:hover:bg-black/60",
                                  "aria-label": tr("next_image", "Next image"),
                                },
                                React.createElement(Co, { className: "w-3 h-3" }),
                              ),
                              React.createElement(
                                "div",
                                {
                                  className:
                                    "absolute top-3 right-3 px-2 py-1 rounded-full bg-black/55 text-white text-[11px] font-medium dark:bg-black/55 dark:text-white",
                                },
                                activeImageIndex + 1,
                                "/",
                                imageList.length,
                              ),
                              React.createElement(
                                "div",
                                {
                                  className:
                                    "absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded-full dark:bg-black/40",
                                },
                                imageList.map((X, _t) =>
                                  React.createElement("button", {
                                    key: `${a}-dot-${_t}`,
                                    type: "button",
                                    onClick: (Nt) => {
                                      Nt.preventDefault();
                                      Nt.stopPropagation();
                                      scrollCarouselToIndex(
                                        a,
                                        _t,
                                        imageList.length,
                                      );
                                    },
                                    className: `h-1.5 w-1.5 rounded-full transition-all ${_t === activeImageIndex ? "bg-white w-3" : "bg-white/50"}`,
                                    "aria-label": `${tr("go_to_image", "Go to image")} ${_t + 1}`,
                                  }),
                                ),
                              ),
                            ),
                        ),
                        React.createElement(
                          "div",
                          {
                            className:
                              "px-3 pb-2.5 pt-2 border-t border-[var(--chip-border)] sm:pb-3 dark:border-t dark:border-[var(--chip-border)]",
                          },
                        React.createElement(
                          "div",
                          {
                            className:
                              "post-action-row flex flex-wrap items-center gap-1 pr-1 scrollbar-hide sm:flex-nowrap sm:overflow-x-auto sm:whitespace-nowrap sm:gap-2",
                          },
                          React.createElement(
                            "button",
                              {
                                className:
                                  "shrink-0 inline-flex h-7 items-center gap-1.5 px-2 rounded-full bg-[var(--chip-bg)] text-gray-700 dark:text-gray-200 text-[10px] sm:h-8 sm:px-2.5 sm:text-xs font-semibold focus:outline-none dark:bg-[var(--chip-bg)]",
                                onClick: () => Me(a),
                              },
                              ae[a]
                                ? React.createElement(He, {
                                    className: "w-4 h-4 text-red-500 dark:text-red-300",
                                  })
                                : React.createElement(qe, {
                                    className:
                                      "w-4 h-4 text-black dark:text-gray-300 dark:text-slate-100",
                                  }),
                              React.createElement(
                                "span",
                                { className: "hidden sm:inline" },
                                s("like", { defaultValue: "Like" }),
                              ),
                              React.createElement(
                                "span",
                                { className: "text-[10px] sm:text-xs" },
                                Ae[a] || 0,
                              ),
                            ),
                            React.createElement(
                              "button",
                              {
                                className:
                                  "shrink-0 inline-flex h-7 items-center gap-1.5 px-2 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-[10px] sm:h-8 sm:px-2.5 sm:text-xs font-semibold focus:outline-none hover:bg-emerald-100 dark:hover:bg-emerald-900/50 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/20",
                                onClick: () => {
                                  ie(e), le(!0);
                                },
                              },
                              React.createElement(Ye, { className: "w-4 h-4" }),
                              React.createElement(
                                "span",
                                { className: "hidden sm:inline" },
                                s("interested", { defaultValue: "Interested" }),
                              ),
                            ),
                            React.createElement(
                              "span",
                              {
                                className:
                                  "mhub-chip shrink-0 inline-flex h-7 items-center gap-1.5 px-2 rounded-full text-gray-600 dark:text-gray-300 text-[10px] sm:h-8 sm:px-2.5 sm:text-xs font-semibold dark:text-gray-200",
                              },
                              React.createElement(Qe, { className: "w-4 h-4" }),
                              De[a] || 0,
                            ),
                            React.createElement(Button,
                              {
                                size: "sm",
                                className:
                                  "mhub-cta shrink-0 inline-flex items-center gap-1 rounded-full px-3 text-[10px] sm:text-xs font-semibold sm:ml-auto w-auto",
                                onClick: () => je(a),
                              },
                              React.createElement(Bo, { className: "w-3.5 h-3.5" }),
                              React.createElement(
                                "span",
                                null,
                                s("view_details", { defaultValue: "View Details" }),
                              ),
                            ),
                          ),
                        ));
                      return card;
                    }),
          ),
        ),
        !latestWindow &&
          C &&
          React.createElement("div", {
            ref: loadMoreSentinelRef,
            "aria-hidden": "true",
            className: "w-full h-1",
          }),
        C &&
          H &&
          !latestWindow &&
          !E &&
          !V &&
          K.length > 0 &&
          React.createElement(Button,
            {
              type: "button",
              variant: "outline",
              className:
                "mt-5 border-blue-300 text-blue-700 inline-flex items-center gap-1.5 dark:border-blue-600/40 dark:text-blue-300",
              onClick: J,
            },
            React.createElement(zo, { className: "w-3.5 h-3.5" }),
            s("load_more_posts", { defaultValue: "Load more posts" }),
          ),
        guestPreviewLimited &&
          React.createElement(Card,
            {
              className:
                `w-full ${feedMaxWidthClass} mt-3 p-4 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 dark:border dark:border-blue-600/40 dark:bg-blue-950/20`,
            },
            React.createElement(
              "div",
              {
                className:
                  "flex flex-col md:flex-row md:items-center md:justify-between gap-3",
              },
              React.createElement(
                "div",
                null,
                React.createElement(
                  "p",
                  {
                    className: "font-semibold text-blue-900 dark:text-blue-200",
                  },
                  s("unlock_more_posts", { defaultValue: "Unlock more posts" }),
                ),
                React.createElement(
                  "p",
                  { className: "text-sm text-blue-700 dark:text-blue-300" },
                  s("login_for_full_feed", { defaultValue: "Sign in to browse the full feed, save searches, and get personalized recommendations." }),
                ),
              ),
              React.createElement(Button,
                {
                  className:
                    "bg-blue-600 text-white hover:bg-blue-700 inline-flex items-center gap-1.5 dark:bg-blue-700/40 dark:text-white dark:hover:bg-blue-700/40",
                  onClick: () => y("/login", { state: { returnTo } }),
                },
                React.createElement(zo, { className: "w-3.5 h-3.5" }),
                s("login", { defaultValue: "Login" }),
              ),
            ),
          ),
        showBackToTop &&
          React.createElement(
            "button",
            {
              type: "button",
              className:
                "fixed bottom-28 right-4 z-50 inline-flex items-center gap-2 rounded-full mhub-premium-surface px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-[var(--surface-2)] dark:text-slate-200 sm:bottom-24 dark:hover:bg-[var(--surface-2)]",
              onClick: () => {
                if (typeof window !== "undefined") {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              },
              "aria-label": tr("back_to_top", "Back to top"),
            },
            React.createElement(Uo, { className: "w-3.5 h-3.5" }),
            tr("back_to_top", "Back to top"),
          ),
        ne &&
          React.createElement(
            "div",
            {
              className:
                "fixed bottom-8 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded shadow-lg z-[9999] dark:bg-blue-700/40 dark:text-white",
            },
            ne,
          ),
        React.createElement(BuyerInterestModal, {
          isOpen: Ie,
          onClose: () => {
            le(!1), ie(null);
          },
          postId: G?.post_id || G?.id,
          postTitle: G?.title,
        }),
        React.createElement(PromoteDialog, {
          open: Boolean(promotePostId),
          onOpenChange: (e) => {
            if (!e) closePromote();
          },
          postId: promotePostId,
          postTitle: promotePostTitle,
        }),
        React.createElement(LoginPromptModal, {
          isOpen: loginPromptOpen,
          onClose: () => setLoginPromptOpen(!1),
        }),
        React.createElement(pt, {
          open: shareDialogOpen,
          onOpenChange: setShareDialogOpen,
          url: shareDialogUrl,
          title: s("share", { defaultValue: "Share post" }),
        }),
        compareItems.length > 0 &&
          React.createElement(
            "div",
            {
              className:
                "fixed bottom-20 left-1/2 -translate-x-1/2 z-[9998] bg-purple-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-4 dark:bg-purple-700",
            },
            React.createElement(CompareIcon, { className: "w-4 h-4" }),
            React.createElement(
              "span",
              { className: "text-sm font-semibold" },
              `${compareItems.length} ${s("items_to_compare", { defaultValue: "items selected" })}`,
            ),
            (() => { const sub = String(compareItems[0]?.subcategory_name || compareItems[0]?.subcategory || "").trim(); return sub ? React.createElement("span", { className: "text-[10px] bg-white/20 rounded-full px-2 py-0.5 font-medium" }, sub) : null; })(),
            React.createElement(
              "button",
              {
                type: "button",
                onClick: () => y("/compare", { state: { compareItems: compareItems } }),
                className:
                  "px-3 py-1.5 bg-white text-purple-700 rounded-lg text-xs font-bold hover:bg-purple-50 transition",
              },
              s("compare_now", { defaultValue: "Compare" }),
            ),
            React.createElement(
              "button",
              {
                type: "button",
                onClick: () => setCompareItems([]),
                className: "ml-1 p-1 hover:bg-purple-500 rounded-full transition",
                "aria-label": "Clear compare",
              },
              React.createElement(Jo, { className: "w-3 h-3" }),
            ),
          ),
        showComparePanel &&
          compareItems.length > 0 &&
          React.createElement(
            "div",
            {
              className: "fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center",
              onClick: (ev) => { if (ev.target === ev.currentTarget) setShowComparePanel(!1); },
            },
            React.createElement(
              "div",
              {
                className:
                  "mhub-premium-surface w-full max-w-5xl max-h-[90vh] overflow-auto rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 animate-in slide-in-from-bottom-8 sm:m-4",
              },
              React.createElement(
                "div",
                { className: "flex items-center justify-between mb-6" },
                React.createElement(
                  "h2",
                  { className: "text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2" },
                  React.createElement(CompareIcon, { className: "w-5 h-5 text-purple-500" }),
                  s("compare_products", { defaultValue: "Compare Products" }),
                  React.createElement("span", { className: "text-sm font-normal text-gray-500 dark:text-gray-400 ml-2" }, `(${compareItems.length})`),
                ),
                React.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: () => setShowComparePanel(!1),
                    className: "p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition",
                  },
                  React.createElement(Jo, { className: "w-5 h-5" }),
                ),
              ),
              React.createElement(
                "div",
                { className: "grid gap-4", style: { gridTemplateColumns: `repeat(${compareItems.length}, minmax(200px, 1fr))` } },
                compareItems.map((item) => {
                  const itemId = I(item?.post_id || item?.id);
                  const imgSrc = Ne(item);
                  const priceVal = resolvePostPriceValue(item);
                  const priceLabel = priceVal > 0 ? formatCurrency(priceVal) : null;
                  return React.createElement(
                    "div",
                    { key: itemId, className: "rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 overflow-hidden" },
                    React.createElement(
                      "div",
                      { className: "relative" },
                      React.createElement("img", {
                        src: imgSrc,
                        alt: item?.title || "",
                        loading: "lazy",
                        className: "w-full h-44 object-cover",
                        onError: (ev) => { ev.target.style.display = "none"; },
                      }),
                      React.createElement(
                        "button",
                        {
                          type: "button",
                          onClick: () => toggleCompare(item),
                          className: "absolute top-2 right-2 p-1.5 rounded-full bg-red-500/90 text-white hover:bg-red-600 transition text-xs",
                          title: s("remove", { defaultValue: "Remove" }),
                        },
                        React.createElement(Jo, { className: "w-3.5 h-3.5" }),
                      ),
                    ),
                    React.createElement(
                      "div",
                      { className: "p-4 space-y-3" },
                      React.createElement("h3", { className: "font-bold text-base text-gray-900 dark:text-white line-clamp-2" }, item?.title || "—"),
                      priceLabel && React.createElement("p", { className: "text-lg font-bold text-emerald-600 dark:text-emerald-400" }, priceLabel),
                      React.createElement(
                        "div",
                        { className: "space-y-2 text-sm" },
                        [
                          { label: s("condition", { defaultValue: "Condition" }), value: item?.condition || item?.item_condition },
                          { label: s("brand", { defaultValue: "Brand" }), value: item?.brand || item?.brand_name },
                          { label: s("model", { defaultValue: "Model" }), value: item?.model || item?.model_name },
                          { label: s("location", { defaultValue: "Location" }), value: item?.location || item?.city || item?.area },
                          { label: s("category", { defaultValue: "Category" }), value: item?.category_name || item?.category },
                          { label: s("seller", { defaultValue: "Seller" }), value: item?.user?.name || item?.user_name || item?.username },
                          { label: s("subcategory", { defaultValue: "Subcategory" }), value: item?.subcategory_name || item?.subcategory },
                          { label: s("posted", { defaultValue: "Posted" }), value: item?.created_at ? new Date(item.created_at).toLocaleDateString() : null },
                        ].filter((spec) => spec.value).map((spec) =>
                          React.createElement(
                            "div",
                            { key: spec.label, className: "flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-gray-700/50" },
                            React.createElement("span", { className: "text-gray-500 dark:text-gray-400 text-xs font-medium" }, spec.label),
                            React.createElement("span", { className: "text-gray-900 dark:text-gray-100 font-medium text-right max-w-[60%] truncate" }, spec.value),
                          ),
                        ),
                      ),
                      React.createElement(
                        W,
                        {
                          onClick: () => { setShowComparePanel(!1); y(`/post/${itemId}`); },
                          className: "w-full mt-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold dark:bg-indigo-700 dark:hover:bg-indigo-800",
                        },
                        s("view_details", { defaultValue: "View Details" }),
                      ),
                    ),
                  );
                }),
              ),
            ),
          ),
      ),
    );
  };
var Nt = AllPosts;
export { Nt as default };




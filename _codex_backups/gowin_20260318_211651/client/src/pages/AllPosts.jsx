import r, {
  useState as g,
  useEffect as w,
  useCallback as x,
  useRef as k,
  useMemo as N,
} from "react";
import { Button as u } from "@/components/ui/button";
import { Card as S } from "@/components/ui/card";
import { Avatar as Ve, AvatarFallback as ze } from "@/components/ui/avatar";
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
  FaChevronUp as Uo,
  FaShoppingCart as Bo,
  FaCartPlus as Mo,
  FaBolt as zo,
  FaTimes as Jo,
} from "react-icons/fa";
import { useNavigate as Je, useLocation as Ke } from "react-router-dom";
import { useFilter as We } from "@/context/FilterContext";
import { useCategoryMode as Zt } from "@/context/CategoryModeContext";
import { useTranslation as Xe } from "react-i18next";
import Ze from "@/components/BuyerInterestModal";
import LoginPromptModal from "@/components/LoginPromptModal";
import {
  translatePosts as Re,
  translatePostsInstant as Ue,
} from "@/utils/translateContent";
import { useAuth as et } from "@/context/AuthContext";
import { useCart as mt } from "@/context/CartContext";
import A from "@/lib/api";
import { getUserId as tt, isAuthenticated as rt } from "@/utils/authStorage";
import { fetchCategoriesCached as at } from "@/services/categoriesService";
import {
  buildSavedPostsMap,
  extractSavedPostIds,
  getSavedPostsMap,
  replaceSavedPostIds,
  setSavedPostStatus,
  subscribeSavedPosts,
} from "@/utils/savedPosts";
import pt from "@/components/ShareLinkDialog";
import AllPostsQuickFilters from "@/components/allposts/QuickFilters";
import AllPostsGreatDealsBanner from "@/components/allposts/GreatDealsBanner";
import {
  normalizeMediaList as ctm,
  resolveMediaUrl as utm,
} from "@/lib/mediaUrl";
const ve = 5,
  SHOW_POST_ID_CHIP = !0,
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
  collectPostImageUrls = (s) => {
    if (!s) return [D];
    const c = [];
    const l = (t) => {
      ctm(t).forEach((m) => {
        const p = utm(m, D);
        p && c.push(p);
      });
    };
    l(s.images),
      l(s.image_urls),
      l(s.imageUrls),
      l(s.image_url),
      l(s.imageUrl),
      l(s.thumbnail);
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
  it = () => {
    const { t: s, i18n: c } = Xe(),
      l = c.language,
      { filters: t, setFilters: m } = We(),
      { user: $ } = et(),
      Z = Ke(),
      {
        activeCategory: categoryModeCategory,
        activeSubcategory: categoryModeSubcategory,
        activeApp,
        hasSelection: hasCategoryMode,
        loading: categoryModeLoading,
        subcategories: categoryModeSubcategories,
        selectCategory: selectCategoryMode,
        selectSubcategory: selectSubcategoryMode,
        clearCategory: clearCategoryMode,
        clearSubcategory: clearSubcategoryMode,
      } = Zt(),
      isForYouMode = N(() => {
        const params = new URLSearchParams(Z.search);
        return Z.pathname === "/for-you" || params.get("mode") === "for-you";
      }, [Z.pathname, Z.search]),
      basePath = Z.pathname === "/for-you" ? "/for-you" : "/all-posts",
      returnTo = N(() => `${Z.pathname}${Z.search}`, [Z.pathname, Z.search]),
      subcategoryIdByName = N(() => {
        const map = {};
        if (!Array.isArray(categoryModeSubcategories)) return map;
        categoryModeSubcategories.forEach((e) => {
          const key = String(e?.name || "").trim().toLowerCase();
          if (!key) return;
          map[key] = e?.subcategory_id || e?.id || null;
        });
        return map;
      }, [categoryModeSubcategories]),
      subcategoryNameById = N(() => {
        const map = {};
        if (!Array.isArray(categoryModeSubcategories)) return map;
        categoryModeSubcategories.forEach((e) => {
          const id = e?.subcategory_id || e?.id || null;
          if (id === null || id === undefined) return;
          map[String(id)] = e?.name || "";
        });
        return map;
      }, [categoryModeSubcategories]),
      sortedSubcategories = N(() => {
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
      [f, O] = g([]),
      [V, z] = g(null),
      [E, R] = g(!1),
      [L, T] = g(1),
      [H, ee] = g(!0),
      [Pe, Ce] = g(0),
      [shuffleSeed, setShuffleSeed] = g(() => {
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
      y = Je(),
      [h, te] = g([]),
      re = k(Date.now()),
      P = k(0),
      v = k(null),
      loadMoreScrollRef = k(null);
    w(() => {
      const e = new URLSearchParams(Z.search),
        categoryIdParam = e.get("category_id") || e.get("categoryId") || "",
        legacyCategory = e.get("category") || "";
      let o = "";
      if (categoryIdParam && h.length > 0) {
        const i = h.find(
          (p) =>
            String(p.category_id) === String(categoryIdParam) ||
            String(p.id) === String(categoryIdParam),
        );
        o = i?.name || String(categoryIdParam);
      }
      if (!o && legacyCategory) {
        if (!isNaN(parseInt(legacyCategory, 10)) && h.length > 0) {
          const i = h.find(
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
      const nextCategoryGroup =
        o && o !== "All" ? "" : rawCategoryGroup || (!hasCategoryMode ? activeApp || "" : "");
      m((n) => ({
        ...n,
        category: o,
        subcategory: resolvedSubcategory || "All",
        categoryGroup: nextCategoryGroup,
        search: e.get("search") || "",
        location: e.get("location") || "",
        minPrice: e.get("minPrice") || "",
        maxPrice: e.get("maxPrice") || "",
        startDate: e.get("startDate") || "",
        endDate: e.get("endDate") || "",
        latestWindow: e.get("latestWindow") || "",
        sortBy: e.get("sortBy") || n.sortBy || "",
      }));
    }, [Z.search, h, m, subcategoryNameById, activeApp, hasCategoryMode]);
    w(() => {
      if (categoryModeLoading) return;
      if (hasCategoryMode) return;
      const params = new URLSearchParams(Z.search);
      const currentGroup =
        params.get("category_group") || params.get("categoryGroup") || params.get("group") || "";
      const nextGroup = activeApp || "";
      m((n) =>
        n.categoryGroup === nextGroup && n.category === "All"
          ? n
          : { ...n, category: "All", subcategory: "All", categoryGroup: nextGroup },
      );
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
        y(nextUrl, { replace: !0 });
      }
    }, [
      activeApp,
      basePath,
      categoryModeLoading,
      hasCategoryMode,
      Z.pathname,
      Z.search,
      y,
      m,
    ]);
    w(() => {
      if (categoryModeLoading) return;
      if (!hasCategoryMode) return;
      const nextCategory = categoryModeCategory?.name || "";
      const nextCategoryId =
        categoryModeCategory?.id ||
        categoryModeCategory?.category_id ||
        (nextCategory
          ? h.find(
              (p) => normalizeName(p?.name) === normalizeName(nextCategory),
            )?.category_id
          : "") ||
        "";
      const nextSubcategory = categoryModeSubcategory?.name || "All";
      m((n) => {
        let changed = !1;
        const next = { ...n };
        if (nextCategory && n.category !== nextCategory) {
          next.category = nextCategory;
          changed = !0;
        }
        if (nextCategory && n.categoryGroup) {
          next.categoryGroup = "";
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
        return changed ? next : n;
      });
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
      if (params.has("category_group")) {
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
          y(nextUrl, { replace: !0 });
        }
      }
    }, [
      categoryModeLoading,
      hasCategoryMode,
      categoryModeCategory?.name,
      categoryModeSubcategory?.name,
      basePath,
      isForYouMode,
      Z.pathname,
      Z.search,
      y,
      m,
      subcategoryIdByName,
    ]);
    const [Be, _e] = g(null),
      [ae, Se] = g({}),
      [Ae, se] = g({}),
      [De, oe] = g({}),
      [ne, M] = g(""),
      [Ie, le] = g(!1),
      [G, ie] = g(null),
      [menuPostId, setMenuPostId] = g(null),
      [savedPosts, setSavedPosts] = g(() => getSavedPostsMap()),
      [shareDialogOpen, setShareDialogOpen] = g(!1),
      [shareDialogUrl, setShareDialogUrl] = g(""),
      [loginPromptOpen, setLoginPromptOpen] = g(!1),
      [carouselIndexByPost, setCarouselIndexByPost] = g({}),
      de = k({}),
      carouselTrackRefs = k({}),
      C = N(() => rt($), [$]);
    const {
      addItem: addCartItem,
      removeItem: removeCartItem,
      isInCart: isInCartItem,
    } = mt();
    const [isLiveSyncing, setIsLiveSyncing] = g(!1),
      [lastLiveSyncAt, setLastLiveSyncAt] = g(Date.now()),
      [navStickyTop, setNavStickyTop] = g(68),
      [secondaryStickyHeight, setSecondaryStickyHeight] = g(0),
      [filterPulse, setFilterPulse] = g(!1),
      [updatedPulse, setUpdatedPulse] = g(!1),
      [isGreatDealsCollapsed, setIsGreatDealsCollapsed] = g(!0),
      [autoRefreshEnabled, setAutoRefreshEnabled] = g(!1),
      [showBackToTop, setShowBackToTop] = g(!1);
    const languageRef = k(l);
    const secondaryStickyRef = k(null);
    const pageMaxWidthClass = "max-w-[80rem]";
    const feedMaxWidthClass = "max-w-[72rem]";
    const formatCurrency = x(
      (e) => `\u20B9${ot(e).toLocaleString("en-IN")}`,
      [],
    );
    const tr = x(
      (key, fallback) => {
        const value = s(key);
        if (typeof value !== "string" || !value.trim() || value === key) {
          return fallback;
        }
        return value;
      },
      [s],
    );
    w(() => {
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
    w(() => {
      languageRef.current = l;
    }, [l]);
    w(() => {
      if (!Array.isArray(f) || f.length === 0) return;
      let e = !1;
      if (!l || l === "en") {
        O((a) => (Array.isArray(a) ? a.map(restoreTranslatedPost) : a));
        return;
      }
      const a = Ue(f, l, { paths: ALL_POSTS_TRANSLATE_PATHS });
      O(a);
      Re(f, l, { paths: ALL_POSTS_TRANSLATE_PATHS })
        .then((o) => {
          if (e) return;
          Array.isArray(o) && o.length > 0 ? O(o) : O(a);
        })
        .catch(() => {
          if (!e) O(a);
        });
      return () => {
        e = !0;
      };
    }, [l]);
    w(() => {
      const e = sessionStorage.getItem("allPostsScrollPosition");
      e &&
        f.length > 0 &&
        requestAnimationFrame(() => {
          window.scrollTo(0, parseInt(e, 10)),
            sessionStorage.removeItem("allPostsScrollPosition");
        });
    }, [f.length]),
      w(() => subscribeSavedPosts(setSavedPosts), []),
      w(() => {
        if (!C) return;
        let e = !1;
        (async () => {
          try {
            const a = tt($);
            const o = a
              ? await A.get("/wishlist", { params: { userId: a } })
              : await A.get("/wishlist");
            if (e) return;
            const n = extractSavedPostIds(o);
            replaceSavedPostIds(n);
            setSavedPosts(buildSavedPostsMap(n));
          } catch {
            // Keep the last known local saved state.
          }
        })();
        return () => {
          e = !0;
        };
      }, [C, $]),
      w(() => {
        let e = !0;
        return (
          (async () => {
            try {
              const o = await at();
              if (!e) return;
              te(Array.isArray(o) ? o : []);
            } catch (o) {
              if (!e) return;
              console.error("Failed to fetch categories:", o), te([]);
            }
          })(),
          () => {
            e = !1;
          }
        );
      }, []);
    w(() => {
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
    w(() => {
      if (C) {
        setLoginPromptOpen(!1);
        return;
      }
      setShuffleSeed(null);
    }, [C]);
    w(() => {
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
    w(() => {
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
    const Le = {
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
      categoryList = h.length > 0 ? h : fallbackCategoryList,
      ce = N(
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
      categoryNameById = N(() => {
        const e = {};
        categoryList.forEach((a) => {
          const o = a?.category_id ?? a?.id ?? null;
          if (o == null) return;
          e[String(o)] = a?.name || "";
        });
        return e;
      }, [categoryList]),
      Q = N(
        () =>
          typeof window > "u"
            ? ""
            : localStorage.getItem("mhub_user_city") || "",
        [],
      ),
      latestWindow = N(
        () => normalizeLatestWindow(t.latestWindow),
        [t.latestWindow],
      ),
      secondaryStickyTop = N(() => navStickyTop, [navStickyTop]),
      canShuffle = N(
        () => !t.sortBy && !latestWindow,
        [t.sortBy, latestWindow],
      ),
      me = x(
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
      b = x(
        (e) => {
          const a = { ...t, ...e };
          m(a), T(1);
          const o = me(a);
          y(o ? `${basePath}?${o}` : basePath);
        },
        [me, t, y, m, basePath],
      ),
      $e = x(
        (e, a) => {
          const resolvedName =
            typeof e === "string"
              ? e
              : a?.name || a?.category_name || "";
          const nextCategory = t.category === resolvedName ? "All" : resolvedName;
          if (hasCategoryMode) {
            if (nextCategory === "All") {
              clearCategoryMode();
              clearSubcategoryMode();
            } else {
              selectCategoryMode(a || resolvedName);
            }
          }
          b({ category: nextCategory, categoryGroup: "" });
        },
        [
          b,
          t.category,
          hasCategoryMode,
          selectCategoryMode,
          clearCategoryMode,
          clearSubcategoryMode,
        ],
      ),
      Ee = x(() => {
        if (hasCategoryMode) {
          clearCategoryMode();
          clearSubcategoryMode();
        }
        b({ category: "All", categoryGroup: "" });
      }, [b, hasCategoryMode, clearCategoryMode, clearSubcategoryMode]),
      jee = x(
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
      Y = x(() => {
        m(st), T(1), y(isForYouMode ? `${basePath}?mode=for-you` : basePath);
      }, [y, m, basePath, isForYouMode]),
      Te = x(
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
      dealsContextLabel = N(
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
      ue = N(
        () =>
          !!t.search ||
          !!t.location ||
          !!t.minPrice ||
          !!t.maxPrice ||
          !!t.startDate ||
          !!t.endDate ||
          !!latestWindow ||
          !!t.sortBy ||
          hasActiveCategory ||
          !!t.categoryGroup ||
          !!(t.subcategory && t.subcategory !== "All"),
        [
          hasActiveCategory,
          t.categoryGroup,
          t.subcategory,
          t.endDate,
          latestWindow,
          t.location,
          t.maxPrice,
          t.minPrice,
          t.search,
          t.sortBy,
          t.startDate,
        ],
      ),
      ge = N(() => {
        const e = [];
        return (
          t.search &&
            e.push({
              key: "search",
              label: `${s("search") || "Search"}: ${t.search}`,
            }),
          t.location &&
            e.push({
              key: "location",
              label: `${s("location") || "Location"}: ${t.location}`,
            }),
          (t.minPrice || t.maxPrice) &&
            e.push({
              key: "price",
              label: `${s("price") || "Price"}: ${t.minPrice || "0"} - ${
                t.maxPrice || s("any") || "any"
              }`,
            }),
          (t.startDate || t.endDate) &&
            e.push({
              key: "date",
              label: `${s("date") || "Date"}: ${
                t.startDate || s("any") || "any"
              } ${s("to") || "to"} ${t.endDate || s("any") || "any"}`,
            }),
          latestWindow &&
            e.push({
              key: "latestWindow",
              label: `${s("latest") || "Latest"}: ${latestWindow} ${
                s("posts") || "posts"
              }`,
            }),
          t.sortBy &&
            e.push({
              key: "sortBy",
              label: `${s("sort_by") || "Sort by"}: ${t.sortBy}`,
            }),
          e
        );
      }, [
        s,
        t.endDate,
        latestWindow,
        t.location,
        t.maxPrice,
        t.minPrice,
        t.search,
        t.sortBy,
        t.startDate,
      ]),
      activeFiltersCount = N(() => ge.length, [ge]),
      // Trigger a lightweight fade when filters change
      filterPulseDeps = [
        t.search,
        t.category,
        t.subcategory,
        t.categoryGroup,
        t.location,
        t.minPrice,
        t.maxPrice,
        t.startDate,
        t.endDate,
        t.latestWindow,
        t.sortBy,
        effectiveCategoryLabel,
      ],
      requestLimit = latestWindow || q,
      be = x(() => {
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
    w(() => {
      const e = P.current + 1;
      (P.current = e), v.current && v.current.abort();
      const a = new AbortController();
      return (
        (v.current = a),
        R(!0),
        z(null),
        (async () => {
          try {
            const n = be();
            L === 1 && (re.current = Date.now()),
              n.append("refresh", String(re.current));
            let i;
            try {
              const endpoint = isForYouMode ? "/posts/for-you" : "/posts";
              i = await A.get(`${endpoint}?${n.toString()}`, {
                signal: a.signal,
              });
            } catch (d) {
              if (d?.name === "AbortError") return;
              const fallbackEndpoint = isForYouMode ? "/posts" : "/posts/for-you";
              i = await A.get(`${fallbackEndpoint}?${n.toString()}`, {
                signal: a.signal,
              });
            }
            if (e !== P.current) return;
            const p = Array.isArray(i.posts) ? i.posts : [];
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
              requestAnimationFrame(() => {
                if (window.scrollY < previousScroll - 200) {
                  window.scrollTo(0, previousScroll);
                }
              });
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
            z(n.message || "Failed to fetch posts"), O([]), ee(!1);
          } finally {
            v.current === a && (v.current = null),
              e === P.current && (R(!1), setIsLiveSyncing(!1));
          }
        })(),
        () => {
          a.abort(), v.current === a && (v.current = null);
        }
      );
    }, [be, L, Pe, isForYouMode]),
      w(() => {
        if (!Array.isArray(f) || f.length === 0) return;
        let e = !1;
        if (!l || l === "en") {
          O((a) => (Array.isArray(a) ? a.map(restoreTranslatedPost) : a));
          return;
        }
        const translatedSeed = Ue(f, l, {
          paths: ALL_POSTS_TRANSLATE_PATHS,
        });
        const safeTranslatedSeed = Array.isArray(translatedSeed)
          ? translatedSeed
          : Array.isArray(f)
            ? f
            : [];
        const n = new Map();
        Array.isArray(safeTranslatedSeed) &&
          safeTranslatedSeed.forEach((i) => {
            const p = ke(i);
            p !== null && n.set(String(p), i);
          });
        O((i) =>
          Array.isArray(i)
            ? i.map((p) => {
                const F = ke(p);
                if (F === null) return p;
                return n.get(String(F)) || p;
              })
            : i,
        );
        Re(f, l, {
          paths: ALL_POSTS_TRANSLATE_PATHS,
        })
          .then((a) => {
            if (e || !Array.isArray(a) || a.length === 0) return;
            const o = new Map();
            a.forEach((n) => {
              const i = ke(n);
              i !== null && o.set(String(i), n);
            });
            O((n) =>
              Array.isArray(n)
                ? n.map((i) => {
                    const p = ke(i);
                    if (p === null) return i;
                    return o.get(String(p)) || i;
                  })
                : n,
            );
          })
          .catch(() => {});
        return () => {
          e = !0;
        };
      }, [l]),
      w(() => {
        T(1);
      }, [
        t.search,
        t.location,
        t.category,
        t.priceRange,
        t.minPrice,
        t.maxPrice,
        t.startDate,
        t.endDate,
        t.latestWindow,
        t.sortBy,
      ]);
    w(() => {
      if (shuffleSeed && (t.sortBy || latestWindow)) {
        setShuffleSeed(null);
      }
    }, [shuffleSeed, t.sortBy, latestWindow]);
    const J = x(() => {
      if (E || !H || latestWindow) return;
      if (typeof window !== "undefined") {
        loadMoreScrollRef.current = window.scrollY;
      }
      T((e) => e + 1);
    }, [E, H, latestWindow]);
    w(() => {
      const e = () => {
        if (latestWindow) return;
        C &&
          window.innerHeight + document.documentElement.scrollTop >=
            document.documentElement.offsetHeight - 1e3 &&
          J();
      };
      return (
        window.addEventListener("scroll", e, { passive: !0 }),
        () => window.removeEventListener("scroll", e)
      );
    }, [J, C, latestWindow]);
    w(() => {
      if (latestWindow || !autoRefreshEnabled) return;
      const e = setInterval(() => {
        if (typeof document > "u" || document.hidden || E) return;
        Ce((a) => a + 1);
      }, 3e4);
      return () => clearInterval(e);
    }, [E, latestWindow, autoRefreshEnabled]);
    const filteredPosts = N(() => {
        if (!Array.isArray(f) || f.length === 0) return [];
        const e = normalizeSearchText(t.search);
        if (!e) return f;
        return f.filter((a) => {
          const o = [];
          const n = a?.category_id ?? a?.categoryId ?? a?.categoryID ?? null;
          if (n != null) {
            const i = categoryNameById[String(n)];
            i && o.push(i);
          }
          const p =
            a?.subcategory_id ?? a?.subcategoryId ?? a?.subcategoryID ?? null;
          if (p != null) {
            const F = subcategoryNameById[String(p)];
            F && o.push(F);
          }
          return matchesSearchQuery(a, e, o);
        });
      }, [f, t.search, categoryNameById, subcategoryNameById]),
      K = N(
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
      resultsCount = filteredPosts.length,
      resultsLabel = resultsCount
        ? `${resultsCount} ${tr("results", "results")}`
        : tr("no_results", "0 results"),
      resultsSummary =
        !C && resultsCount > K.length
          ? `${K.length} ${tr("of", "of")} ${resultsCount} ${tr("results", "results")}`
          : resultsLabel,
      liveUpdatesActive = autoRefreshEnabled && !latestWindow,
      U = k(new Set()),
      fe = k(new Set()),
      B = k(null),
      W = x((e) => {
        const a = I(e);
        !a ||
          fe.current.has(a) ||
          (fe.current.add(a),
          U.current.add(a),
          oe((o) => ({ ...o, [a]: (o[a] || 0) + 1 })));
      }, []),
      setCarouselTrackRef = x((e, a) => {
        const o = I(e);
        if (!o) return;
        if (!a) {
          delete carouselTrackRefs.current[o];
          return;
        }
        carouselTrackRefs.current[o] = a;
      }, []),
      updateCarouselIndex = x((e, a) => {
        const o = I(e);
        if (!o) return;
        setCarouselIndexByPost((n) => (n[o] === a ? n : { ...n, [o]: a }));
      }, []),
      getCarouselIndex = x(
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
      scrollCarouselToIndex = x(
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
      moveCarousel = x(
        (e, a, o, n) => {
          if (o <= 1) return;
          n.preventDefault();
          n.stopPropagation();
          const i = getCarouselIndex(e, o);
          scrollCarouselToIndex(e, i + a, o);
        },
        [getCarouselIndex, scrollCarouselToIndex],
      ),
      handleCarouselScroll = x(
        (e, a, o) => {
          if (o <= 1) return;
          const n = a.currentTarget;
          const i = n.clientWidth || 1;
          const p = Math.round(n.scrollLeft / i);
          updateCarouselIndex(e, Math.max(0, Math.min(o - 1, p)));
        },
        [updateCarouselIndex],
      );
    w(() => {
      const e = async () => {
          if (U.current.size === 0) return;
          const o = Array.from(U.current);
          U.current.clear();
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
      w(
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
      handleCartToggle = x(
        (e) => {
          const a = I(e?.post_id || e?.id);
          if (!a) return;
          if (!C) {
            setLoginPromptOpen(!0);
            return;
          }
          if (isInCartItem(a)) {
            removeCartItem(a);
            M(s("removed") || "Removed from cart");
          } else {
            addCartItem({
              id: a,
              title: e?.title || s("title") || "Item",
              price: e?.price || 0,
              image: Ne(e),
              seller: e?.user?.name || e?.user_name || e?.username || "Unknown",
              location: e?.location || e?.city || e?.area || "",
            });
            M(s("add_to_cart") || "Added to cart");
          }
          setTimeout(() => M(""), 2e3);
        },
        [C, addCartItem, isInCartItem, removeCartItem, s],
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
          o ? y(`/post/${a}`, { state: { post: o } }) : y(`/post/${a}`);
      },
      pe = filteredPosts
        .filter((e) => e.isSponsored === !0 || e.is_sponsored === !0)
        .slice(0, 5),
      showTopDealsBanner = pe.length > 0,
      xe = t.search
        ? h.find((e) => e.name.toLowerCase() === t.search.trim().toLowerCase())
            ?.name
        : null,
      j =
        (!t.category || t.category === "All") && xe ? xe : t.category || "All",
      ye = N(() => {
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
      Fe = x(() => {
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
    w(() => {
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
    }, [activeFiltersCount, autoRefreshEnabled, ge.length, isGreatDealsCollapsed, latestWindow, pageMaxWidthClass, Q, ue, showTopDealsBanner]);
    w(() => {
      setFilterPulse(!0);
    }, filterPulseDeps);
    w(() => {
      if (!filterPulse) return;
      const e = setTimeout(() => setFilterPulse(!1), 180);
      return () => clearTimeout(e);
    }, [filterPulse]);
    w(() => {
      if (!lastLiveSyncAt) return;
      setUpdatedPulse(!0);
    }, [lastLiveSyncAt]);
    w(() => {
      if (!updatedPulse) return;
      const e = setTimeout(() => setUpdatedPulse(!1), 900);
      return () => clearTimeout(e);
    }, [updatedPulse]);
    return r.createElement(
      "div",
      {
        className:
          "bg-gradient-to-b from-blue-50/40 via-white to-white dark:from-gray-900 dark:via-gray-900 dark:to-gray-950 min-h-screen transition-colors duration-300 pb-24",
      },
      hasCategoryMode &&
        r.createElement(
          "div",
          {
            className: "w-full flex justify-center px-3 pt-3 pb-2",
            style: { paddingTop: `${Math.max(navStickyTop - 56, 12)}px` },
          },
          r.createElement(
            "div",
            {
              className: `w-full ${pageMaxWidthClass} rounded-xl border border-slate-200/70 dark:border-slate-800/60 bg-slate-50/80 dark:bg-slate-900/40 p-2 sm:p-2.5`,
            },
            r.createElement(
              "div",
              { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2" },
              r.createElement(
                "div",
                {
                  className:
                    "text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200",
                },
                `${tr("category_mode", "Category mode")}: `,
                categoryModeLabel,
              ),
              r.createElement(
                "button",
                {
                  type: "button",
                  className:
                    "inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-800 transition-colors",
                  onClick: () => y("/category-mode"),
                },
                tr("switch_category", "Switch category"),
              ),
            ),
            categoryModeLoading
              ? r.createElement(
                  "div",
                  {
                    className:
                      "mt-1 text-[11px] sm:text-xs text-slate-500 dark:text-slate-300",
                  },
                  tr("loading", "Loading"),
                )
              : sortedSubcategories.length > 0 &&
                r.createElement(
                  "div",
                  {
                    className:
                      "mt-1 text-[11px] sm:text-xs text-slate-500 dark:text-slate-300",
                  },
                  `${sortedSubcategories.length} `,
                  tr("subcategories", "subcategories"),
                ),
          ),
        ),
        r.createElement(
          "div",
          {
            className:
              "w-full sticky z-30 bg-white/85 dark:bg-gray-900/90 backdrop-blur-md border-b border-slate-200/70 dark:border-slate-800/70",
            ref: secondaryStickyRef,
            style: { top: `${secondaryStickyTop}px` },
          },
          r.createElement(
            AllPostsQuickFilters,
            {
              title: tr("quick_filters", "Quick filters"),
              variant: "forYou",
              chips: [
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
                  key: "latest-50",
                  label: tr("latest_50", "Latest 50"),
                  active: latestWindow === 50,
                  onClick: () => jee(50),
                },
                {
                  key: "near-me",
                  label: Q ? `${tr("near", "Near")} ${Q}` : tr("near_me", "Near me"),
                  active: isNearMe,
                  disabled: !Q,
                  onClick: () => b({ location: Q }),
                },
              ],
              maxWidthClass: pageMaxWidthClass,
              headerRight:
                ge.length > 0 &&
                r.createElement(
                  "button",
                  {
                    type: "button",
                    className:
                      "inline-flex items-center justify-center rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-100 dark:border-red-800/60 dark:bg-red-900/30 dark:text-red-200 dark:hover:bg-red-900/40 transition-colors",
                    onClick: Y,
                  },
                  tr("clear_all_filters", "Clear all filters"),
                ),
            },
            activeSubcategoryLabel !== "All" &&
              r.createElement(
                "div",
                { className: "flex flex-wrap gap-2" },
                r.createElement(
                  "span",
                  {
                    className:
                      "inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-indigo-200 bg-indigo-50 text-[11px] font-semibold text-indigo-700 dark:border-indigo-800/60 dark:bg-indigo-900/30 dark:text-indigo-200",
                  },
                  `${tr("subcategory", "Subcategory")}: ${activeSubcategoryLabel}`,
                ),
                r.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: () => {
                      clearSubcategoryMode();
                      b({ subcategory: "All" });
                    },
                    className:
                      "inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-slate-200 bg-white text-[11px] font-semibold text-slate-700 hover:bg-slate-50 dark:bg-gray-800 dark:border-gray-700 dark:text-slate-200",
                  },
                  tr("show_all_in_category", "Show all in category"),
                ),
                r.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: () => y(browseOtherSubcategoriesPath),
                    className:
                      "inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-sky-200 bg-sky-50 text-[11px] font-semibold text-sky-700 hover:bg-sky-100 dark:border-sky-800/60 dark:bg-sky-900/30 dark:text-sky-200",
                  },
                  tr("browse_other_subcategories", "Browse other subcategories"),
                ),
              ),
            ge.length > 0 &&
              r.createElement(
                "div",
                { className: "flex flex-wrap gap-2" },
                ge.map((e) =>
                  r.createElement(
                    "button",
                    {
                      key: e.key,
                      type: "button",
                      onClick: () => Te(e.key),
                      className:
                        "inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-slate-200 bg-white text-[11px] font-semibold text-slate-700 hover:bg-slate-50 dark:bg-gray-800 dark:border-gray-700 dark:text-slate-200",
                      title: tr("remove_filter", "Remove filter"),
                    },
                    r.createElement("span", null, e.label),
                    r.createElement(Jo, { className: "w-3 h-3 font-semibold" }),
                  ),
                ),
              ),
          ),
          showTopDealsBanner &&
            r.createElement(AllPostsGreatDealsBanner, {
              title: tr("great_deals", "Great Deals"),
              subtitle: tr("up_to_off", "Up to 50% off"),
              contextLabel: dealsContextLabel,
              collapsed: isGreatDealsCollapsed,
              onCollapse: () => setIsGreatDealsCollapsed(!0),
              onExpand: () => setIsGreatDealsCollapsed(!1),
              onShopNow: () => {
                setIsGreatDealsCollapsed(!0);
                const e = document.getElementById("all-posts-feed");
                e?.scrollIntoView({ behavior: "smooth", block: "start" });
              },
              maxWidthClass: pageMaxWidthClass,
              t: tr,
              compact: !0,
              outerPaddingClass: "px-3",
              sticky: !1,
            }),
        ),
      ),
      r.createElement(
        "div",
        {
          id: "all-posts-feed",
          className: `w-full flex flex-col items-center mb-3 transition-opacity duration-200 ${filterPulse ? "opacity-90" : "opacity-100"}`,
        },
        r.createElement(
          "div",
          {
            className: `w-full ${feedMaxWidthClass} mx-auto px-3 pb-3 pt-4 md:px-0`,
          },
          r.createElement(
            "div",
            { className: "flex flex-col gap-1" },
            r.createElement(
              "h1",
              {
                id: "all-posts-feed-title",
                className:
                  "text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100",
              },
              feedTitle,
            ),
            !E &&
              !V &&
              r.createElement(
                "p",
                {
                  className:
                    "text-sm font-semibold text-slate-600 dark:text-slate-300",
                },
                resultsSummary,
              ),
          ),
        ),
        r.createElement(
          "div",
          {
            className: `w-full ${feedMaxWidthClass} mx-auto px-2 md:px-0`,
          },
          r.createElement(
            "div",
            {
              className: "order-1 flex flex-col gap-3 w-full min-w-0",
            },
            E
              ? Array.from({ length: 3 }).map((e, a) =>
                  r.createElement(
                    S,
                    {
                      key: `all-posts-skeleton-${a}`,
                      className:
                        "rounded-2xl border border-slate-200/80 dark:border-gray-700/70 bg-white dark:bg-gray-800 p-4 shadow-sm animate-pulse",
                    },
                    r.createElement("div", {
                      className:
                        "h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-3",
                    }),
                    r.createElement("div", {
                      className:
                        "h-48 w-full bg-gray-200 dark:bg-gray-700 rounded-lg mb-3",
                    }),
                    r.createElement("div", {
                      className:
                        "h-4 w-5/6 bg-gray-200 dark:bg-gray-700 rounded mb-2",
                    }),
                    r.createElement("div", {
                      className:
                        "h-4 w-2/3 bg-gray-200 dark:bg-gray-700 rounded",
                    }),
                  ),
                )
              : V
                ? r.createElement(
                    S,
                    {
                      className:
                        "border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 p-5",
                    },
                    r.createElement(
                      "p",
                      {
                        className:
                          "text-sm text-red-700 dark:text-red-300 mb-3",
                      },
                      V,
                    ),
                    r.createElement(
                      "div",
                      { className: "flex flex-wrap gap-2" },
                      r.createElement(
                        u,
                        {
                          type: "button",
                          className: "bg-red-600 text-white hover:bg-red-700",
                          onClick: Fe,
                        },
                        tr("retry", "Retry"),
                      ),
                      ue &&
                        r.createElement(
                          u,
                          {
                            type: "button",
                            variant: "outline",
                            className: "border-red-200 text-red-700",
                            onClick: Y,
                          },
                          tr("reset_filters", "Reset filters"),
                        ),
                    ),
                  )
                : K.length === 0
                  ? r.createElement(
                      S,
                      {
                        className:
                          "border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/30 p-4 text-center",
                      },
                      r.createElement(
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
                      r.createElement(
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
                      r.createElement(
                        "div",
                        { className: "flex flex-wrap justify-center gap-2" },
                        activeSubcategoryLabel !== "All" &&
                          r.createElement(
                            u,
                            {
                              type: "button",
                              variant: "outline",
                              className: "border-indigo-200 text-indigo-700",
                              onClick: () => {
                                clearSubcategoryMode();
                                b({ subcategory: "All" });
                              },
                            },
                            tr("show_all_in_category", "Show all in category"),
                          ),
                        r.createElement(
                          u,
                          {
                            type: "button",
                            className:
                              "bg-blue-600 text-white hover:bg-blue-700",
                            onClick: Y,
                          },
                          tr("reset_filters", "Reset filters"),
                        ),
                        r.createElement(
                          u,
                          {
                            type: "button",
                            variant: "outline",
                            className: "border-blue-200 text-blue-700",
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
                          s("unknown") ||
                          "Unknown",
                        n = String(o || "U")
                          .charAt(0)
                          .toUpperCase(),
                        i = Number(e.user?.rating || e.seller_rating || 0),
                        p =
                          e.category ||
                          e.category_name ||
                          tr("general", "General"),
                        subLabel =
                          e.subcategory_name ||
                          e.subcategory ||
                          e.subcategoryName ||
                          "",
                        subcategoryLabel = String(subLabel || "").trim(),
                        F = !!(
                          e.user?.isVerified ||
                          e.is_verified ||
                          e.aadhaar_verified ||
                          e.pan_verified
                        ),
                        _ = String(e.description || ""),
                        d = Be === a,
                        Oe = _.length >= 120,
                        he = nt(e.created_at || e.createdAt, l),
                        we = e.location || e.city || e.area || "",
                        title =
                          e.title || e.name || s("untitled") || "Untitled post",
                        summary =
                          [
                            e.summary,
                            e.subtitle,
                            e.tagline,
                            e.brand,
                            e.model,
                            _ ? _.slice(0, 90) : "",
                          ].find((val) => typeof val === "string" && val.trim()) ||
                          "",
                        condition =
                          e.condition ||
                          e.item_condition ||
                          e.itemCondition ||
                          "",
                        brand =
                          e.brand ||
                          e.brand_name ||
                          e.brandName ||
                          "",
                        model =
                          e.model ||
                          e.model_name ||
                          e.modelName ||
                          "",
                        availability =
                          e.availability ||
                          e.status ||
                          e.item_status ||
                          "",
                        ratingCount = Number(
                          e.user?.rating_count ||
                            e.user?.review_count ||
                            e.rating_count ||
                            e.reviews_count ||
                            e.review_count ||
                            0,
                        ),
                        ratingLabel =
                          i > 0
                            ? `${i.toFixed(1)}${ratingCount ? ` (${ratingCount})` : ""}`
                            : "",
                        priceValue =
                          Number.isFinite(Number(e.price)) &&
                          String(e.price).trim() !== ""
                            ? formatCurrency(e.price)
                            : tr("price_on_request", "Price on request"),
                        attributeChips = [
                          condition && {
                            label: tr("condition", "Condition"),
                            value: condition,
                          },
                          (brand || model) && {
                            label: tr("model", "Model"),
                            value: [brand, model].filter(Boolean).join(" "),
                          },
                          availability && {
                            label: tr("availability", "Availability"),
                            value: availability,
                          },
                        ].filter(Boolean),
                        imageList = collectPostImageUrls(e),
                        activeImageIndex = getCarouselIndex(
                          a,
                          imageList.length,
                        ),
                        inCart = isInCartItem(a);
                      const card = r.createElement(
                        S,
                          {
                            ref: (X) => {
                              de.current[a] = X;
                            },
                            "data-post-id": a,
                            className:
                              "rounded-2xl bg-white dark:bg-gray-800 border border-slate-200/80 dark:border-slate-700/60 shadow-sm flex flex-col p-0 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-300",
                          },
                        r.createElement(
                          "div",
                          {
                            className:
                              "px-3 pt-2 pb-1.5 border-b border-gray-100 dark:border-gray-700/70 sm:px-4",
                          },
                          r.createElement(
                            "div",
                            {
                              className:
                                "inline-flex items-center gap-2 rounded-full bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 px-2.5 py-1 sm:px-3 sm:py-1.5",
                            },
                            r.createElement(
                              "span",
                              {
                                className:
                                  "text-[10px] sm:text-[11px] md:text-xs uppercase tracking-wide font-semibold text-emerald-700 dark:text-emerald-300",
                              },
                              tr("service_price", "Service price"),
                            ),
                            r.createElement(
                              "span",
                              {
                                className:
                                  "text-sm sm:text-base font-bold text-emerald-800 dark:text-emerald-200",
                              },
                              priceValue,
                            ),
                          ),
                        ),
                        r.createElement(
                          "div",
                          {
                            className:
                              "flex items-start gap-3 px-3 pt-3 pb-3 relative sm:px-4",
                          },
                          r.createElement(
                            Ve,
                            {
                              className: "w-9 h-9 shrink-0 sm:w-10 sm:h-10",
                            },
                            r.createElement(
                              ze,
                              {
                                className:
                                  "dark:bg-gray-700 dark:text-white text-[10px]",
                              },
                              n || "U",
                            ),
                          ),
                          r.createElement(
                            "div",
                            { className: "flex-1 min-w-0 pr-12" },
                            r.createElement(
                              "div",
                              { className: "flex flex-wrap items-center gap-2" },
                              r.createElement(
                                "span",
                                {
                                  className:
                                    "font-semibold text-blue-900 dark:text-blue-200 text-sm sm:text-base md:text-lg truncate",
                                },
                                o,
                              ),
                              F &&
                                r.createElement(
                                  "span",
                                  {
                                    className:
                                      "inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs font-semibold rounded-full",
                                    title: `KYC Verified${e.user?.aadhaarVerified ? " (Aadhaar)" : ""}${e.user?.panVerified ? " (PAN)" : ""}`,
                                  },
                                  r.createElement(
                                    "svg",
                                    {
                                      className: "w-3 h-3",
                                      fill: "currentColor",
                                      viewBox: "0 0 20 20",
                                    },
                                    r.createElement("path", {
                                      fillRule: "evenodd",
                                      d: "M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z",
                                      clipRule: "evenodd",
                                    }),
                                  ),
                                  s("verified") || "Verified",
                                ),
                              ratingLabel &&
                                r.createElement(
                                  "span",
                                  {
                                    className:
                                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 text-[10px] font-semibold",
                                  },
                                  "\u2605",
                                  ratingLabel,
                                ),
                            ),
                            r.createElement(
                              "h3",
                              {
                                className:
                                  "mt-1 text-sm sm:text-base md:text-lg font-semibold text-slate-900 dark:text-white truncate",
                              },
                              title,
                            ),
                            summary &&
                              r.createElement(
                                "p",
                                {
                                  className:
                                    "mt-0.5 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 line-clamp-1",
                                },
                                summary,
                              ),
                            r.createElement(
                              "div",
                              {
                                className:
                                  "mt-2 flex flex-wrap items-center gap-2 text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-300",
                              },
                              r.createElement(
                                "span",
                                {
                                  className:
                                    "inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-medium",
                                },
                                p,
                              ),
                              subcategoryLabel &&
                                r.createElement(
                                  "span",
                                  {
                                    className:
                                      "inline-flex items-center px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 font-medium",
                                  },
                                  subcategoryLabel,
                                ),
                              we &&
                                r.createElement(
                                  "span",
                                  {
                                    className:
                                      "inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700",
                                  },
                                  we,
                                ),
                            ),
                            r.createElement(
                              "div",
                              {
                                className:
                                  "mt-1 flex flex-wrap items-center gap-2 text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-300",
                              },
                              he &&
                                r.createElement(
                                  "span",
                                  {
                                    className:
                                      "inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700",
                                  },
                                  `${s("posted") || "Posted"} `,
                                  he,
                                ),
                              attributeChips.length > 0 &&
                                attributeChips.slice(0, 2).map((chip, chipIndex) =>
                                  r.createElement(
                                    "span",
                                    {
                                      key: `${a}-attr-${chipIndex}`,
                                      className:
                                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium",
                                    },
                                    chip.label,
                                    ":",
                                    chip.value,
                                  ),
                                ),
                              SHOW_POST_ID_CHIP &&
                                r.createElement(
                                  "span",
                                  {
                                    className:
                                      "hidden sm:inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 font-semibold text-gray-600 dark:text-gray-200",
                                  },
                                  `${s("post_id") || "Post ID"}: `,
                                  a,
                                ),
                            ),
                          ),
                          r.createElement(
                            "button",
                            {
                              type: "button",
                              onClick: () =>
                                setMenuPostId((t) => (t === a ? null : a)),
                              className:
                                "absolute right-3 top-3 rounded-full p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 sm:right-4 sm:top-4 sm:p-2",
                              title: tr("more_options", "More options"),
                              "aria-label": tr("more_options", "More options"),
                            },
                            r.createElement(To, { className: "w-4 h-4" }),
                          ),
                          menuPostId === a &&
                            r.createElement(
                              "div",
                              {
                                className:
                                  "absolute right-4 top-14 z-20 w-44 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg p-1",
                              },
                              r.createElement(
                                "button",
                                {
                                  type: "button",
                                  onClick: () => {
                                    handleSharePost(a), setMenuPostId(null);
                                  },
                                  className:
                                    "w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg",
                                },
                                s("share") || "Share",
                              ),
                              r.createElement(
                                "button",
                                {
                                  type: "button",
                                  onClick: () => {
                                    toggleSave(a), setMenuPostId(null);
                                  },
                                  className:
                                    "w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg",
                                },
                                savedPosts[a]
                                  ? s("saved") || "Saved"
                                  : s("save") || "Save",
                              ),
                              r.createElement(
                                "button",
                                {
                                  type: "button",
                                  onClick: () => {
                                    M(
                                      s("report_feature_coming_soon") ||
                                        "Report feature coming soon",
                                    ),
                                      setTimeout(() => M(""), 2e3),
                                      setMenuPostId(null);
                                  },
                                  className:
                                    "w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg",
                                },
                                s("report") || "Report",
                              ),
                            ),
                        ),
                        r.createElement(
                          "div",
                          {
                            className:
                              "relative w-full bg-slate-100 dark:bg-slate-900/70 border-y border-slate-200/70 dark:border-slate-700",
                          },
                          r.createElement(
                            "div",
                            {
                              ref: (X) => setCarouselTrackRef(a, X),
                              onScroll: (X) =>
                                handleCarouselScroll(a, X, imageList.length),
                              className:
                                "flex w-full overflow-x-auto snap-x snap-mandatory scrollbar-hide",
                            },
                            imageList.map((X, _t) =>
                              r.createElement(
                                "div",
                                {
                                  key: `${a}-media-${_t}`,
                                  className:
                                    "w-full shrink-0 snap-center bg-slate-100 dark:bg-slate-800",
                                },
                                r.createElement("img", {
                                  src: X,
                                  alt: `${e.title || s("post") || "Post"} ${s("image") || "image"} ${_t + 1}`,
                                  loading: "lazy",
                                  className:
                                    "w-full h-[200px] sm:h-[250px] md:h-[300px] object-cover object-center",
                                  onError: (Nt) => {
                                    Nt.currentTarget.src = D;
                                  },
                                }),
                              ),
                            ),
                          ),
                          imageList.length > 1 &&
                            r.createElement(
                              r.Fragment,
                              null,
                              r.createElement(
                                "button",
                                {
                                  type: "button",
                                  onClick: (X) =>
                                    moveCarousel(a, -1, imageList.length, X),
                                  className:
                                    "absolute left-3 top-1/2 -translate-y-1/2 z-10 h-7 w-7 rounded-full bg-black/45 text-white hover:bg-black/60 flex items-center justify-center sm:h-8 sm:w-8",
                                  "aria-label":
                                    s("previous_image") || "Previous image",
                                },
                                r.createElement(Lo, { className: "w-3 h-3" }),
                              ),
                              r.createElement(
                                "button",
                                {
                                  type: "button",
                                  onClick: (X) =>
                                    moveCarousel(a, 1, imageList.length, X),
                                  className:
                                    "absolute right-3 top-1/2 -translate-y-1/2 z-10 h-7 w-7 rounded-full bg-black/45 text-white hover:bg-black/60 flex items-center justify-center sm:h-8 sm:w-8",
                                  "aria-label": s("next_image") || "Next image",
                                },
                                r.createElement(Co, { className: "w-3 h-3" }),
                              ),
                              r.createElement(
                                "div",
                                {
                                  className:
                                    "absolute top-3 right-3 px-2 py-1 rounded-full bg-black/55 text-white text-[11px] font-medium",
                                },
                                activeImageIndex + 1,
                                "/",
                                imageList.length,
                              ),
                              r.createElement(
                                "div",
                                {
                                  className:
                                    "absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded-full",
                                },
                                imageList.map((X, _t) =>
                                  r.createElement("button", {
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
                                    "aria-label": `${s("go_to_image") || "Go to image"} ${_t + 1}`,
                                  }),
                                ),
                              ),
                            ),
                        ),
                        r.createElement(
                          "div",
                          {
                            className:
                              "px-3 py-2.5 text-gray-800 dark:text-gray-200 text-xs sm:text-sm md:text-base leading-relaxed sm:px-4 sm:py-3.5",
                          },
                          d || !Oe
                            ? _ ||
                                r.createElement(
                                  "span",
                                  {
                                    className:
                                      "italic text-gray-400 dark:text-gray-400",
                                  },
                                  s("no_description") || "No description",
                                )
                            : r.createElement(
                                r.Fragment,
                                null,
                                _.slice(0, 120),
                                "...",
                                " ",
                                r.createElement(
                                  "button",
                                  {
                                    className:
                                      "text-blue-600 dark:text-blue-400 font-semibold hover:underline",
                                    onClick: () => _e(a),
                                  },
                                  s("view_more"),
                                ),
                              ),
                        ),
                        r.createElement(
                          "div",
                          {
                            className:
                              "px-3 pb-2.5 pt-2 border-t border-gray-100 dark:border-gray-700 sm:pb-3",
                          },
                          r.createElement(
                            "div",
                            {
                              className:
                                "post-action-row flex flex-nowrap items-center gap-1 overflow-x-auto whitespace-nowrap pr-1 scrollbar-hide sm:gap-2",
                            },
                            r.createElement(
                              "button",
                              {
                                className:
                                  "shrink-0 inline-flex h-7 items-center gap-1.5 px-2 rounded-full bg-gray-50 dark:bg-gray-700/70 text-gray-700 dark:text-gray-200 text-[10px] sm:h-8 sm:px-2.5 sm:text-xs font-semibold focus:outline-none",
                                onClick: () => Me(a),
                              },
                              ae[a]
                                ? r.createElement(He, {
                                    className: "w-4 h-4 text-red-500",
                                  })
                                : r.createElement(qe, {
                                    className:
                                      "w-4 h-4 text-black dark:text-gray-300",
                                  }),
                              r.createElement(
                                "span",
                                { className: "hidden sm:inline" },
                                s("like") || "Like",
                              ),
                              r.createElement(
                                "span",
                                { className: "text-[10px] sm:text-xs" },
                                Ae[a] || 0,
                              ),
                            ),
                            r.createElement(
                              "button",
                              {
                                className:
                                  "shrink-0 inline-flex h-7 items-center gap-1.5 px-2 rounded-full bg-gray-50 dark:bg-gray-700/70 text-gray-700 dark:text-gray-200 text-[10px] sm:h-8 sm:px-2.5 sm:text-xs font-semibold focus:outline-none",
                                onClick: () => handleSharePost(a),
                              },
                              r.createElement(Ge, { className: "w-4 h-4" }),
                              r.createElement(
                                "span",
                                { className: "hidden sm:inline" },
                                s("share") || "Share",
                              ),
                            ),
                            r.createElement(
                              "button",
                              {
                                className:
                                  "shrink-0 inline-flex h-7 items-center gap-1.5 px-2 rounded-full bg-gray-50 dark:bg-gray-700/70 text-gray-700 dark:text-gray-200 text-[10px] sm:h-8 sm:px-2.5 sm:text-xs font-semibold focus:outline-none",
                                onClick: () => toggleSave(a),
                              },
                              savedPosts[a]
                                ? r.createElement(Po, {
                                    className: "w-4 h-4 text-blue-600",
                                  })
                                : r.createElement(Ro, { className: "w-4 h-4" }),
                              r.createElement(
                                "span",
                                { className: "hidden sm:inline" },
                                savedPosts[a]
                                  ? s("saved") || "Saved"
                                  : s("save") || "Save",
                              ),
                            ),
                            r.createElement(
                              "button",
                              {
                                className:
                                  "shrink-0 inline-flex h-7 items-center gap-1.5 px-2 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-[10px] sm:h-8 sm:px-2.5 sm:text-xs font-semibold focus:outline-none hover:bg-emerald-100 dark:hover:bg-emerald-900/50",
                                onClick: () => {
                                  ie(e), le(!0);
                                },
                              },
                              r.createElement(Ye, { className: "w-4 h-4" }),
                              r.createElement(
                                "span",
                                { className: "hidden sm:inline" },
                                s("interested") || "Interested",
                              ),
                            ),
                            r.createElement(
                              "span",
                              {
                                className:
                                  "shrink-0 inline-flex h-7 items-center gap-1.5 px-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] sm:h-8 sm:px-2.5 sm:text-xs font-semibold",
                              },
                              r.createElement(Qe, { className: "w-4 h-4" }),
                              De[a] || 0,
                            ),
                            r.createElement(
                              u,
                              {
                                variant: "outline",
                                className: `shrink-0 h-7 px-2 text-[10px] sm:h-8 sm:px-2.5 sm:text-xs font-medium rounded inline-flex items-center justify-center gap-1 ${inCart ? "border-green-200 bg-green-50 text-green-700 hover:bg-green-100" : "border-blue-200 text-blue-700 hover:bg-blue-50"}`,
                                onClick: () => handleCartToggle(e),
                              },
                              inCart
                                ? r.createElement(Bo, { className: "w-4 h-4" })
                                : r.createElement(Mo, { className: "w-4 h-4" }),
                              r.createElement(
                                "span",
                                { className: "hidden sm:inline" },
                                inCart
                                  ? s("in_cart") || "In Cart"
                                  : s("add_to_cart") || "Add to Cart",
                              ),
                            ),
                            r.createElement(
                              u,
                              {
                                className:
                                  "shrink-0 h-8 bg-blue-600 text-white px-3 text-[11px] font-medium rounded hover:bg-blue-700",
                                onClick: () => je(a),
                              },
                              r.createElement(Qe, { className: "w-4 h-4" }),
                              r.createElement(
                                "span",
                                null,
                                s("view_details") || "View Details",
                              ),
                            ),
                          ),
                        ));
                      return card;
                    }),
          ),
        ),
        C &&
          H &&
          !latestWindow &&
          !E &&
          !V &&
          K.length > 0 &&
          r.createElement(
            u,
            {
              type: "button",
              variant: "outline",
              className:
                "mt-5 border-blue-300 text-blue-700 inline-flex items-center gap-1.5",
              onClick: J,
            },
            r.createElement(zo, { className: "w-3.5 h-3.5" }),
            s("load_more_posts") || "Load more posts",
          ),
        !C &&
          f.length > ve &&
          r.createElement(
            S,
            {
              className:
                `w-full ${feedMaxWidthClass} mt-3 p-4 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30`,
            },
            r.createElement(
              "div",
              {
                className:
                  "flex flex-col md:flex-row md:items-center md:justify-between gap-3",
              },
              r.createElement(
                "div",
                null,
                r.createElement(
                  "p",
                  {
                    className: "font-semibold text-blue-900 dark:text-blue-200",
                  },
                  s("unlock_more_posts") || "Unlock more posts",
                ),
                r.createElement(
                  "p",
                  { className: "text-sm text-blue-700 dark:text-blue-300" },
                  s("login_for_full_feed") ||
                    "Sign in to browse the full feed, save searches, and get personalized recommendations.",
                ),
              ),
              r.createElement(
                u,
                {
                  className:
                    "bg-blue-600 text-white hover:bg-blue-700 inline-flex items-center gap-1.5",
                  onClick: () => y("/login", { state: { returnTo } }),
                },
                r.createElement(zo, { className: "w-3.5 h-3.5" }),
                s("login") || "Login",
              ),
            ),
          ),
        showBackToTop &&
          r.createElement(
            "button",
            {
              type: "button",
              className:
                "fixed bottom-24 right-4 z-50 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200",
              onClick: () => {
                if (typeof window !== "undefined") {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              },
              "aria-label": tr("back_to_top", "Back to top"),
            },
            r.createElement(Uo, { className: "w-3.5 h-3.5" }),
            tr("back_to_top", "Back to top"),
          ),
        ne &&
          r.createElement(
            "div",
            {
              className:
                "fixed bottom-8 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded shadow-lg z-[9999]",
            },
            ne,
          ),
        r.createElement(Ze, {
          isOpen: Ie,
          onClose: () => {
            le(!1), ie(null);
          },
          postId: G?.post_id || G?.id,
          postTitle: G?.title,
        }),
        r.createElement(LoginPromptModal, {
          isOpen: loginPromptOpen,
          onClose: () => setLoginPromptOpen(!1),
        }),
        r.createElement(pt, {
          open: shareDialogOpen,
          onOpenChange: setShareDialogOpen,
          url: shareDialogUrl,
          title: s("share") || "Share post",
        }),
    );
  };
var Nt = it;
export { Nt as default };

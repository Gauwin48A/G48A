import e, {
  useCallback as Q,
  useEffect as L,
  useMemo as D,
  useRef as F,
  useState as g,
} from "react";
import { useNavigate as X, useSearchParams as G } from "react-router-dom";
import { useTranslation as K } from "react-i18next";
import { useFilter as V } from "@/context/FilterContext";
import { useCategoryMode as ze } from "@/context/CategoryModeContext";
import { fetchCategoriesCached as W } from "@/services/categoriesService";
import api from "@/services/api";
import {
  Search as Z,
  ArrowLeft as q,
  Clock as U,
  TrendingUp as I,
  X as Y,
  ChevronRight as R,
  Trash2 as ee,
} from "lucide-react";
import { Button as m } from "@/components/ui/button";
import {
  PageEmptyState as J,
  PageErrorState as re,
  PageLoadingState as te,
} from "@/components/page-state/PageStateBlocks";
import { navigateBack } from "@/utils/navigation";
import PageDensityToggle from "@/components/ui/PageDensityToggle";
import { usePageDensity } from "@/hooks/usePageDensity";
import {
  buildActiveAppMatcher,
  matchesCategoryModeItem,
  normalizeAppGroup,
} from "@/utils/categoryModeFilters";
import { usePageRefresh } from "@/hooks/usePageRefresh";
const u = "recentSearches",
  ae = 10,
  oe = {
    search: "",
    category: "All",
    subcategory: "All",
    sortBy: "",
    location: "",
    condition: "",
    minRating: "",
    minPrice: "",
    maxPrice: "",
    priceRange: "",
    startDate: "",
    endDate: "",
  },
  normalizeConditionValue = (value) =>
    String(value ?? "").trim().toLowerCase(),
  normalizeCategoryValue = (value) =>
    String(value ?? "").trim().toLowerCase(),
  normalizeSubcategoryValue = (value) =>
    String(value ?? "").trim().toLowerCase(),
  matchesSubcategoryFilter = (item, filterName, filterId, nameById = {}) => {
    if (!filterName && !filterId) return !0;
    const itemId =
      item?.subcategory_id ?? item?.subcategoryId ?? item?.subcategoryID ?? null;
    const rawName =
      item?.subcategory_name ??
      item?.subcategoryName ??
      item?.subcategory ??
      "";
    const resolvedName =
      rawName ||
      (itemId != null ? nameById[String(itemId)] || "" : "");
    const normalizedItem = normalizeSubcategoryValue(resolvedName);
    if (filterId) {
      if (itemId != null && String(itemId) === String(filterId)) return !0;
      if (filterName && normalizedItem) return normalizedItem === filterName;
      return !1;
    }
    if (filterName) return normalizedItem === filterName;
    return !0;
  },
  matchesConditionFilter = (value, filter) => {
    const normalizedFilter = normalizeConditionValue(filter);
    if (!normalizedFilter) return !0;
    const normalizedValue = normalizeConditionValue(value);
    if (!normalizedValue) return !1;
    const newConditions = new Set(["new", "brand new", "unused"]);
    if (normalizedFilter === "new") {
      return (
        newConditions.has(normalizedValue) ||
        normalizedValue.startsWith("new")
      );
    }
    if (normalizedFilter === "used") {
      return !newConditions.has(normalizedValue);
    }
    return normalizedValue.includes(normalizedFilter);
  },
  SEARCH_MATCH_FIELDS = [
    "title",
    "description",
    "location",
    "category",
    "category_name",
    "categoryName",
    "subcategory",
    "subcategory_name",
    "subcategoryName",
    "brand",
    "brand_name",
    "brandName",
    "model",
    "model_name",
    "modelName",
    "user.name",
    "user.username",
    "user.full_name",
    "user.fullName",
    "user_name",
    "username",
    "full_name",
    "seller_name",
    "sellerName",
    "tags",
    "keywords",
  ],
  normalizeSearchText = (value) => String(value ?? "").trim().toLowerCase(),
  getNestedValue = (obj, path) => {
    if (!obj || typeof obj !== "object" || !path) return null;
    const parts = String(path).split(".");
    let current = obj;
    for (let i = 0; i < parts.length; i += 1) {
      if (current == null) return null;
      current = current[parts[i]];
    }
    return current;
  },
  pushSearchValue = (bucket, value) => {
    if (value == null) return;
    if (Array.isArray(value)) {
      value.forEach((entry) => pushSearchValue(bucket, entry));
      return;
    }
    if (typeof value === "object") {
      if (typeof value.name === "string") bucket.push(value.name);
      if (typeof value.label === "string") bucket.push(value.label);
      if (typeof value.title === "string") bucket.push(value.title);
      return;
    }
    const text = String(value).trim();
    if (text) bucket.push(text);
  },
  buildSearchText = (item) => {
    if (!item || typeof item !== "object") return "";
    const parts = [];
    SEARCH_MATCH_FIELDS.forEach((field) => {
      pushSearchValue(parts, getNestedValue(item, field));
    });
    return normalizeSearchText(parts.join(" "));
  },
  matchesSearchQuery = (item, query) => {
    const normalized = normalizeSearchText(query);
    if (!normalized) return !0;
    const haystack = buildSearchText(item);
    if (!haystack) return !1;
    const tokens = normalized.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return !0;
    return tokens.every((token) => haystack.includes(token));
  },
  SearchPage = () => {
    const { t: n } = K(),
      s = X(),
      [w] = G(),
      { density: densityValue, setDensity: setDensityValue } =
        usePageDensity("mhub_search_density"),
      densityClass = densityValue === "compact" ? " mhub-compact" : "",
      { filters: a, setFilters: l } = V(),
      {
        activeCategory: categoryModeCategory,
        activeSubcategory: categoryModeSubcategory,
        activeApp,
        categories: categoryModeCategories,
        subcategories: categoryModeSubcategories,
        subcategoriesLoading,
        hasSelection: hasCategoryMode,
        loading: categoryModeLoading,
        selectCategory: selectCategoryMode,
        selectSubcategory: selectSubcategoryMode,
        clearSubcategory: clearSubcategoryMode,
      } = ze(),
      [b, h] = g(w.get("q") || ""),
      [c, d] = g([]),
      [S, C] = g([]),
      [categoryOptions, setCategoryOptions] = g([]),
      [brandSuggestions, setBrandSuggestions] = g([]),
      [results, setResults] = g([]),
      [resultsCount, setResultsCount] = g(null),
      [resultsLoading, setResultsLoading] = g(!1),
      [resultsError, setResultsError] = g(""),
      [resultsRefresh, setResultsRefresh] = g(0),
      [M, _] = g(!0),
      [B, A] = g(""),
      p = F(null),
      i = F(0),
      E = (w.get("context") || "all-posts") === "for-you",
      y = E ? "/for-you" : "/all-posts",
      O = D(
        () =>
          !!a.search ||
          !!a.location ||
          !!a.condition ||
          !!a.minRating ||
          !!a.minPrice ||
          !!a.maxPrice ||
          !!a.startDate ||
          !!a.endDate ||
          !!a.sortBy ||
          !!(a.category && a.category !== "All" && !hasCategoryMode) ||
          !!(a.subcategory && a.subcategory !== "All"),
        [
          a.category,
          a.condition,
          a.endDate,
          a.location,
          a.maxPrice,
          a.minPrice,
          a.minRating,
          a.search,
          a.sortBy,
          a.startDate,
          a.subcategory,
          hasCategoryMode,
        ],
      ),
      activeAppMatcher = D(
        () => buildActiveAppMatcher(activeApp, categoryModeCategories),
        [activeApp, categoryModeCategories],
      ),
      hasLockedCategory = !!categoryModeCategory?.name,
      isAppMode = !!activeAppMatcher?.activeApp,
      isSubcategoryMode = hasLockedCategory || isAppMode,
      categoryLock = hasLockedCategory ? categoryModeCategory?.name : "";
    const categoryLockId = hasCategoryMode
      ? categoryModeCategory?.id || categoryModeCategory?.category_id || null
      : null;
    const appScopedCategoryOptions = D(() => {
      const list = Array.isArray(categoryOptions) ? categoryOptions : [];
      if (!activeAppMatcher?.activeApp) return list;
      return list.filter((entry) => {
        const entryGroup = normalizeAppGroup(
          entry?.category_group || entry?.categoryGroup || entry?.group || "",
        );
        if (entryGroup && entryGroup === activeAppMatcher.activeApp) {
          return true;
        }
        const entryId = entry?.category_id || entry?.id || null;
        if (entryId != null && activeAppMatcher.categoryIds?.has(String(entryId))) {
          return true;
        }
        const entryName = normalizeCategoryValue(
          entry?.name || entry?.title || entry?.label || entry?.category_name || "",
        );
        return entryName && activeAppMatcher.categoryNames?.has(entryName);
      });
    }, [categoryOptions, activeAppMatcher]);
    const categoryValue = D(() => {
      if (hasLockedCategory) return String(categoryLock || "").trim();
      if (isAppMode) return "";
      const raw = a.category && a.category !== "All" ? a.category : "";
      return String(raw || "").trim();
    }, [a.category, categoryLock, hasLockedCategory, isAppMode]);
    const categoryIdByName = D(() => {
      const map = {};
      (Array.isArray(appScopedCategoryOptions) ? appScopedCategoryOptions : []).forEach((entry) => {
        const nameKey = normalizeCategoryValue(entry?.name || entry?.title || "");
        if (!nameKey) return;
        map[nameKey] = entry?.category_id || entry?.id || null;
      });
      return map;
    }, [appScopedCategoryOptions]);
    const appScopedSubcategories = D(() => {
      if (!isAppMode) return [];
      const scopedCategories = Array.isArray(appScopedCategoryOptions)
        ? appScopedCategoryOptions
        : [];
      const seen = new Set();
      const list = scopedCategories.flatMap((category) =>
        (Array.isArray(category?.subcategories) ? category.subcategories : []).map((subcategory) => ({
          ...subcategory,
          category_id:
            subcategory?.category_id || category?.category_id || category?.id || null,
          category_name: subcategory?.category_name || category?.name || "",
        })),
      );
      const deduped = list.filter((entry) => {
        const nameKey = normalizeSubcategoryValue(entry?.name || entry?.subcategory_name || entry?.title || "");
        const idKey = entry?.subcategory_id || entry?.id || "";
        const key = idKey ? `id:${idKey}` : `name:${entry?.category_id || "cat"}:${nameKey}`;
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      return deduped.sort((left, right) => {
        const orderDiff = Number(left?.display_order ?? 0) - Number(right?.display_order ?? 0);
        if (orderDiff !== 0) return orderDiff;
        return String(left?.name || left?.subcategory_name || "").localeCompare(
          String(right?.name || right?.subcategory_name || ""),
          undefined,
          { sensitivity: "base" },
        );
      });
    }, [appScopedCategoryOptions, isAppMode]);
    const subcategoryOptions = D(() => {
      if (hasLockedCategory) {
        return Array.isArray(categoryModeSubcategories) ? categoryModeSubcategories : [];
      }
      if (isAppMode) {
        return appScopedSubcategories;
      }
      return [];
    }, [appScopedSubcategories, categoryModeSubcategories, hasLockedCategory, isAppMode]);
    const trendingSuggestions = D(() => {
      const seen = new Set();
      const list = [];
      const push = (value) => {
        const trimmed = String(value || "").trim();
        if (!trimmed) return;
        const key = trimmed.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        list.push(trimmed);
      };
      (Array.isArray(brandSuggestions) ? brandSuggestions : []).forEach(push);
      const sourceList = isSubcategoryMode ? subcategoryOptions : appScopedCategoryOptions;
      (Array.isArray(sourceList) ? sourceList : []).forEach((entry) => {
        push(
          entry?.name ||
            entry?.subcategory_name ||
            entry?.title ||
            entry?.category_name ||
            entry?.category ||
            "",
        );
      });
      if (list.length === 0) {
        (Array.isArray(c) ? c : []).forEach(push);
      }
      return list.slice(0, 8);
    }, [
      brandSuggestions,
      subcategoryOptions,
      appScopedCategoryOptions,
      isSubcategoryMode,
      c,
    ]);
    const trendingSeed = D(
      () => (trendingSuggestions.length > 0 ? trendingSuggestions[0] : ""),
      [trendingSuggestions],
    );
    const subcategoryIdByName = D(() => {
      const map = {};
      subcategoryOptions.forEach((entry) => {
        const rawName = entry?.name || entry?.subcategory_name || entry?.title || "";
        const nameKey = normalizeSubcategoryValue(rawName);
        if (!nameKey) return;
        map[nameKey] = entry?.subcategory_id || entry?.id || null;
      });
      return map;
    }, [subcategoryOptions]);
    const subcategoryNameById = D(() => {
      const map = {};
      subcategoryOptions.forEach((entry) => {
        const id = entry?.subcategory_id || entry?.id || null;
        const name = entry?.name || entry?.subcategory_name || entry?.title || "";
        if (id == null || id === "" || !name) return;
        map[String(id)] = name;
      });
      return map;
    }, [subcategoryOptions]);
    const subcategoryValue = D(() => {
      const raw = a.subcategory && a.subcategory !== "All" ? a.subcategory : "";
      return String(raw || "").trim();
    }, [a.subcategory]);
    const normalizedSubcategoryValue = D(
      () => normalizeSubcategoryValue(subcategoryValue),
      [subcategoryValue],
    );
    const subcategoryIdValue = D(() => {
      const lockedId =
        categoryModeSubcategory?.id || categoryModeSubcategory?.subcategory_id || null;
      if (lockedId != null && lockedId !== "") return String(lockedId);
      if (!subcategoryValue) return "";
      if (/^\d+$/.test(subcategoryValue)) return subcategoryValue;
      const resolved = subcategoryIdByName[normalizeSubcategoryValue(subcategoryValue)];
      return resolved ? String(resolved) : "";
    }, [
      categoryModeSubcategory?.id,
      categoryModeSubcategory?.subcategory_id,
      subcategoryIdByName,
      subcategoryValue,
    ]);
    const suggestionItems = D(
      () => (isSubcategoryMode ? subcategoryOptions : S),
      [isSubcategoryMode, subcategoryOptions, S],
    );
    const suggestionLoading = hasLockedCategory ? subcategoriesLoading : M;
    const suggestionError = hasLockedCategory ? "" : B;
    const searchPlaceholder = E
      ? n("search_for_you", { defaultValue: "Search in For You" })
      : isSubcategoryMode
        ? n("search_placeholder_subcategories", { defaultValue: "Search products, brands, subcategories" })
        : n("search_placeholder", { defaultValue: "Search products, brands, categories" });
    const searchAriaLabel = isSubcategoryMode
      ? n("search_label_subcategories", { defaultValue: "Search products and subcategories" })
      : n("search_label", { defaultValue: "Search products and categories" });
    const categoryIdValue = D(() => {
      if (categoryLockId) return String(categoryLockId);
      const normalized = normalizeCategoryValue(categoryValue);
      const resolved = normalized ? categoryIdByName[normalized] : null;
      return resolved ? String(resolved) : "";
    }, [categoryLockId, categoryIdByName, categoryValue]);

    const activeFilters = D(() => {
      const filters = [];
      const categoryValue = categoryLock || (a.category && a.category !== "All" ? a.category : "");
      if (categoryValue && !hasCategoryMode) {
        filters.push({ key: "category", label: categoryValue });
      }
      if (a.subcategory && a.subcategory !== "All") {
        filters.push({ key: "subcategory", label: `Subcategory: ${a.subcategory}` });
      }
      if (a.condition) filters.push({ key: "condition", label: `Condition: ${a.condition}` });
      if (a.minRating) filters.push({ key: "minRating", label: `Rating ${a.minRating}+` });
      if (a.minPrice) filters.push({ key: "minPrice", label: `Min Rs ${a.minPrice}` });
      if (a.maxPrice) filters.push({ key: "maxPrice", label: `Max Rs ${a.maxPrice}` });
      if (a.location) filters.push({ key: "location", label: a.location });
      if (a.sortBy) filters.push({ key: "sortBy", label: a.sortBy });
      return filters;
    }, [
      a.category,
      a.subcategory,
      a.condition,
      a.location,
      a.maxPrice,
      a.minPrice,
      a.minRating,
      a.sortBy,
      categoryLock,
      hasCategoryMode,
    ]);
    L(() => {
      const r = localStorage.getItem(u);
      if (r)
        try {
          const t = JSON.parse(r);
          d(Array.isArray(t) ? t : []);
        } catch {
          d([]);
        }
      p.current && p.current.focus();
    }, []);
    L(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, []);
    L(() => { document.title = "MHub \u2014 Search"; return () => { document.title = "MHub"; }; }, []);
    L(() => {
      let active = true;
      (async () => {
        try {
          const response = await api.get("/brands");
          const payload = response?.data ?? response;
          if (!active) return;
          const list = Array.isArray(payload)
            ? payload
            : Array.isArray(payload?.brands)
              ? payload.brands
              : [];
          const names = list
            .map(
              (entry) =>
                entry?.name || entry?.brand || entry?.label || entry?.title || "",
            )
            .map((value) => String(value || "").trim())
            .filter(Boolean);
          setBrandSuggestions(Array.from(new Set(names)));
        } catch {
          if (active) setBrandSuggestions([]);
        }
      })();
      return () => {
        active = false;
      };
    }, []);
    L(() => {
      if (categoryModeLoading) return;
      if (!hasCategoryMode || !categoryModeCategory?.name) return;
      l((r) => {
        if (r.category && r.category !== "All") return r;
        return { ...r, category: categoryModeCategory.name };
      });
    }, [
      categoryModeLoading,
      hasCategoryMode,
      categoryModeCategory?.name,
      l,
    ]);
    L(() => {
      if (categoryModeLoading) return;
      if (!hasCategoryMode) return;
      const nextSubcategory = categoryModeSubcategory?.name || "All";
      l((r) => {
        if ((r.subcategory || "All") === nextSubcategory) return r;
        return { ...r, subcategory: nextSubcategory };
      });
    }, [
      categoryModeLoading,
      hasCategoryMode,
      categoryModeSubcategory?.name,
      l,
    ]);
    const x = Q(async () => {
      const r = i.current + 1;
      (i.current = r), _(!0), A("");
      try {
        const t = await W({ includeSubcategories: true });
        if (r !== i.current) return;
        const list = Array.isArray(t) ? t : [];
        setCategoryOptions(list);
        C(list.slice(0, 8));
      } catch {
        r === i.current &&
          (C([]),
          setCategoryOptions([]),
          A(
            "Unable to load category suggestions. You can still search manually.",
          ));
      } finally {
        r === i.current && _(!1);
      }
    }, []);
    L(
      () => (
        x(),
        () => {
          i.current += 1;
        }
      ),
      [x],
    );
    usePageRefresh(x);

    L(() => {
      const list = Array.isArray(appScopedCategoryOptions)
        ? appScopedCategoryOptions
        : [];
      C(list.slice(0, 8));
    }, [appScopedCategoryOptions]);
    L(() => {
      const queryText = String(b || "").trim();
      const hasFilters = Boolean(
        queryText ||
          categoryValue ||
          subcategoryValue ||
          a.condition ||
          a.minRating ||
          a.minPrice ||
          a.maxPrice,
      );
      if (!hasFilters) {
        setResults([]);
        setResultsCount(null);
        setResultsError("");
        return;
      }
      const controller = new AbortController();
      setResultsLoading(!0);
      setResultsError("");
      const params = new URLSearchParams();
      if (queryText) params.set("search", queryText);
      if (categoryIdValue) {
        params.set("category_id", categoryIdValue);
      } else if (categoryValue) {
        params.set("category", categoryValue);
      } else if (activeAppMatcher?.activeApp) {
        params.set("category_group", activeAppMatcher.activeApp);
      }
      if (subcategoryIdValue) {
        params.set("subcategory_id", subcategoryIdValue);
      } else if (subcategoryValue) {
        params.set("subcategory", subcategoryValue);
      }
      if (a.location) params.set("location", a.location);
      if (a.minPrice) params.set("minPrice", a.minPrice);
      if (a.maxPrice) params.set("maxPrice", a.maxPrice);
      if (a.sortBy) params.set("sortBy", a.sortBy);
      params.set("page", "1");
      params.set("limit", "20");

      api.get("/posts", {
        params,
        signal: controller.signal,
      })
        .then((response) => {
          const payload = response?.data ?? response;
          const posts = Array.isArray(payload?.posts) ? payload.posts : [];
          const categoryModeFilteredPosts = posts.filter((item) =>
            matchesCategoryModeItem(item, {
              activeCategory: hasCategoryMode ? categoryModeCategory : null,
              activeCategoryId: categoryLockId ? String(categoryLockId) : "",
              activeAppMatcher,
            }),
          );
          const queryFilteredPosts = queryText
            ? categoryModeFilteredPosts.filter((item) => matchesSearchQuery(item, queryText))
            : categoryModeFilteredPosts;
          const subcategoryFilteredPosts =
            normalizedSubcategoryValue || subcategoryIdValue
              ? queryFilteredPosts.filter((item) =>
                  matchesSubcategoryFilter(
                    item,
                    normalizedSubcategoryValue,
                    subcategoryIdValue,
                    subcategoryNameById,
                  ),
                )
              : queryFilteredPosts;
          const conditionFilter = String(a.condition || "").trim();
          const minRatingRaw = Number(a.minRating || 0);
          const minRatingValue = Number.isFinite(minRatingRaw)
            ? minRatingRaw
            : 0;
          const filteredPosts =
            conditionFilter || minRatingValue > 0
              ? subcategoryFilteredPosts.filter((item) => {
                  if (
                    conditionFilter &&
                    !matchesConditionFilter(
                      item?.condition ||
                        item?.item_condition ||
                        item?.itemCondition ||
                        "",
                      conditionFilter,
                    )
                  ) {
                    return !1;
                  }
                  if (minRatingValue > 0) {
                    const rating = Number(
                      item?.seller_rating ||
                        item?.rating ||
                        item?.user_rating ||
                        item?.user?.rating ||
                        0,
                    );
                    if (!Number.isFinite(rating) || rating < minRatingValue) {
                      return !1;
                    }
                  }
                  return !0;
                })
              : subcategoryFilteredPosts;
          setResults(filteredPosts);
          const baseCount = Number.isFinite(Number(payload?.total))
            ? Number(payload.total)
            : filteredPosts.length;
          setResultsCount(
            queryText ||
              conditionFilter ||
              minRatingValue > 0 ||
              normalizedSubcategoryValue ||
              subcategoryIdValue
              ? filteredPosts.length
              : baseCount,
          );
        })
        .catch((err) => {
          if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED") return;
          setResults([]);
          setResultsCount(0);
          setResultsError(
            "Unable to load search results right now. Try again in a moment.",
          );
        })
        .finally(() => setResultsLoading(!1));

      return () => controller.abort();
    }, [
      a.condition,
      a.maxPrice,
      a.minPrice,
      a.minRating,
      a.sortBy,
      activeAppMatcher,
      b,
      categoryModeCategory,
      categoryLockId,
      categoryValue,
      categoryIdValue,
      hasCategoryMode,
      a.location,
      normalizedSubcategoryValue,
      subcategoryIdValue,
      subcategoryNameById,
      subcategoryValue,
      resultsRefresh,
    ]);
    const v = (r = "", t = "", sub = "") => {
        const o = new URLSearchParams();
        return (
          r && o.set("search", r),
          (() => {
            const selectedName = categoryLock || t;
            if (!selectedName) return;
            const resolvedId =
              categoryLockId ||
              categoryIdByName[normalizeCategoryValue(selectedName)];
            if (resolvedId) {
              o.set("category_id", String(resolvedId));
              return;
            }
            o.set("category", selectedName);
          })(),
          (() => {
            const rawSub = String(sub || "").trim();
            if (!rawSub || rawSub === "All") return;
            const resolvedSubId = /^\d+$/.test(rawSub)
              ? rawSub
              : subcategoryIdByName[normalizeSubcategoryValue(rawSub)];
            if (resolvedSubId) {
              o.set("subcategory_id", String(resolvedSubId));
              return;
            }
            o.set("subcategory", rawSub);
          })(),
          `${y}${o.toString() ? `?${o.toString()}` : ""}`
        );
      },
      P = (r) => {
        if (!r.trim()) return;
        const t = r.trim(),
          o = [t, ...c.filter((N) => N !== t)].slice(0, ae);
        d(o), localStorage.setItem(u, JSON.stringify(o));
      },
      $ = (r) => {
        r?.preventDefault();
        const t = b.trim();
        if (!t) {
          l((o) => ({ ...o, search: "" })), s(y);
          return;
        }
        P(t), l((o) => ({ ...o, search: t })), s(v(t, a.category, a.subcategory));
      },
      k = (r) => {
        h(r), P(r), l((t) => ({ ...t, search: r })), s(v(r, a.category, a.subcategory));
      },
      j = (r, entry = null) => {
        if (isSubcategoryMode) {
          const name = String(r || "").trim();
          l((t) => ({
            ...t,
            subcategory: name || "All",
            ...(isAppMode && !hasLockedCategory ? { category: "All" } : {}),
          }));
          if (name && name !== "All" && hasLockedCategory) {
            selectSubcategoryMode({
              ...(entry || {}),
              name,
              category_id: entry?.category_id || categoryLockId || null,
            });
          } else if (hasLockedCategory) {
            clearSubcategoryMode();
          }
          s(v(b, categoryLock, name));
          return;
        }
        l((t) => ({ ...t, category: r, subcategory: "All" })),
          r && selectCategoryMode(r),
          s(v("", r));
      },
      z = () => {
        d([]), localStorage.removeItem(u);
      },
      H = (r, t) => {
        t.stopPropagation();
        const o = c.filter((N) => N !== r);
        d(o), localStorage.setItem(u, JSON.stringify(o));
      },
      T = () => {
        if (categoryLock) {
          hasCategoryMode && clearSubcategoryMode();
          l({ ...oe, category: categoryLock, subcategory: "All" }),
            s(v("", categoryLock, ""));
          return;
        }
        l(oe), s(y);
      },
      clearFilterKey = (key) => {
        if (key === "category" && categoryLock) return;
        if ((key === "subcategory" || key === "category") && hasCategoryMode) {
          clearSubcategoryMode();
        }
        l((r) => ({
          ...r,
          [key]: key === "category" || key === "subcategory" ? "All" : "",
          ...(key === "category" ? { subcategory: "All" } : {}),
        }));
        const nextCategory = categoryLock || (key === "category" ? "" : a.category);
        const nextSubcategory =
          key === "subcategory" || key === "category" ? "" : a.subcategory;
        s(v(b, nextCategory, nextSubcategory));
      };
    return e.createElement(
      "div",
      {
        className:
          "min-h-screen mhub-premium-page pb-24 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-slate-900/70 dark:to-slate-950 dark:bg-gradient-to-br" +
          densityClass,
      },
      e.createElement(
        "div",
        { className: "sticky z-50 mhub-premium-bar shadow-lg", style: { top: "var(--top-nav-height, 60px)" } },
        e.createElement(
          "div",
          { className: "max-w-[640px] mx-auto px-4 py-2 page-shell page-pad" },
          e.createElement(
            "form",
            { onSubmit: $, className: "flex items-center gap-3" },
            e.createElement(
              "button",
              {
                type: "button",
                onClick: () => navigateBack(s, y),
                "aria-label": n("go_back", { defaultValue: "Go back" }),
                className:
                  "p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-[var(--surface-2)] transition dark:hover:bg-[var(--surface-2)]",
              },
              e.createElement(q, {
                className: "w-6 h-6 text-gray-600 dark:text-gray-200",
              }),
            ),
            e.createElement(
              "div",
              { className: "flex-1 relative" },
              e.createElement("input", {
                ref: p,
                type: "text",
                value: b,
                onChange: (r) => h(r.target.value),
                placeholder: searchPlaceholder,
                "aria-label": searchAriaLabel,
                className:
                  "w-full h-10 pl-4 pr-24 rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-[var(--surface-2)] text-gray-900 dark:text-white dark:placeholder:text-slate-500 focus:border-blue-500 focus:ring-4 focus:ring-blue-400/30 focus:shadow-lg focus:shadow-blue-500/10 dark:focus:ring-blue-800 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 transition-all duration-200 outline-none text-base dark:border-2 dark:bg-[var(--surface-2)] dark:text-gray-100 dark:focus:border-blue-500/40",
              }),
              b &&
                e.createElement(
                  "button",
                  {
                    type: "button",
                    "aria-label": n("clear_search", "Clear search"),
                    onClick: () => h(""),
                    className:
                      "absolute right-12 top-1/2 -translate-y-1/2 p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-[var(--surface-2)] dark:hover:bg-[var(--surface-2)]",
                  },
                  e.createElement(Y, { className: "w-4 h-4 text-gray-500 dark:text-gray-300" }),
                ),
              e.createElement(
                "button",
                {
                  type: "submit",
                  "aria-label": n("search", "Search"),
                  className:
                    "absolute right-2 top-1/2 -translate-y-1/2 p-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-md shadow-blue-500/25 hover:shadow-lg transition-all duration-200 active:scale-95 dark:bg-gradient-to-r",
                },
                e.createElement(Z, { className: "w-5 h-5 text-white dark:text-white" }),
              ),
            ),
          ),
          e.createElement(
            "div",
            { className: "mt-2 flex justify-end" },
            e.createElement(PageDensityToggle, {
              value: densityValue,
              onChange: setDensityValue,
            }),
          ),
        ),
      ),
      e.createElement(
        "div",
        {
          className: "max-w-[640px] mx-auto px-4 py-4 space-y-2.5 page-shell page-pad",
        },
        O &&
          e.createElement(
            "div",
            {
              className:
                "bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-2xl p-4 dark:border-amber-600/40",
            },
            e.createElement(
              "p",
              { className: "text-sm text-amber-800 dark:text-amber-300 mb-3 dark:text-amber-200" },
              "Filters from browse are active and can limit your results.",
            ),
            e.createElement(
              m,
              {
                type: "button",
                variant: "outline",
                className: "border-amber-300 text-amber-800 dark:border-amber-600/40 dark:text-amber-200",
                onClick: T,
              },
              "Clear all filters",
            ),
          ),
        hasCategoryMode &&
          categoryModeCategory?.name &&
          e.createElement(
            "div",
            {
              className:
                "rounded-2xl border border-blue-100 bg-white/90 dark:border-blue-900/40 dark:bg-gray-900/70 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 dark:border-blue-600/40 dark:bg-slate-900/90",
            },
            e.createElement(
              "div",
              null,
              e.createElement(
                "p",
                {
                  className:
                    "text-sm font-semibold text-slate-800 dark:text-slate-100",
                },
                "Category mode: ",
                categoryModeCategory.name,
              ),
              e.createElement(
                "p",
                { className: "text-xs text-slate-500 dark:text-slate-300" },
                "Search results stay inside this marketplace.",
              ),
            ),
            e.createElement(
              m,
              {
                type: "button",
                variant: "outline",
                className: "border-blue-200 text-blue-700 dark:border-blue-600/40 dark:text-blue-300",
                onClick: () => s("/category-mode"),
              },
              "Switch category",
            ),
          ),
        e.createElement(
          "div",
          { className: "mhub-premium-surface rounded-2xl p-3.5 shadow-lg" },
          e.createElement(
            "div",
            { className: "flex flex-wrap items-center justify-between gap-2" },
            e.createElement(
              "div",
              null,
              e.createElement(
                "h2",
                { className: "text-base font-bold mhub-gradient-text" },
                n("search_results", { defaultValue: "Search Results" }),
              ),
              e.createElement(
                "p",
                { className: "text-xs text-slate-500 dark:text-slate-300" },
                n("results_preview_desc", { defaultValue: "Preview matches for your current search and filters." }),
              ),
            ),
            resultsCount !== null &&
              e.createElement(
                "span",
                { className: "text-sm font-semibold text-blue-700 dark:text-blue-300", "aria-live": "polite" },
                `${resultsCount} ${n("results", { defaultValue: "results" })}`,
              ),
          ),
          e.createElement(
            "div",
            { className: "mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3" },
            isSubcategoryMode
              ? e.createElement(
                  "label",
                  { className: "text-xs font-semibold text-slate-500 dark:text-slate-300" },
                  n("subcategory", { defaultValue: "Subcategory" }),
                  e.createElement(
                    "select",
                    {
                      value: a.subcategory || "All",
                      onChange: (r) => {
                        const value = r.target.value;
                        l((t) => ({
                          ...t,
                          subcategory: value,
                          ...(isAppMode && !hasLockedCategory ? { category: "All" } : {}),
                        }));
                        if (value && value !== "All") {
                          const entry = subcategoryOptions.find(
                            (item) =>
                              normalizeSubcategoryValue(
                                item?.name || item?.subcategory_name || item?.title || "",
                              ) === normalizeSubcategoryValue(value),
                          );
                          if (hasLockedCategory) {
                            selectSubcategoryMode({
                              ...(entry || {}),
                              name: value,
                              category_id: entry?.category_id || categoryLockId || null,
                            });
                          }
                        } else if (hasLockedCategory) {
                          clearSubcategoryMode();
                        }
                        s(v(b, categoryLock, value));
                      },
                      className:
                        "mt-1 h-9 w-full rounded-lg border border-slate-200 dark:border-gray-600 bg-slate-50 dark:bg-gray-800 dark:text-white px-3 text-sm transition-colors dark:border-slate-700 dark:bg-slate-950",
                    },
                    e.createElement("option", { value: "All" }, "All subcategories"),
                    subcategoryOptions.map((r) =>
                      e.createElement(
                        "option",
                        { key: r.subcategory_id || r.id || r.name, value: r.name || r.subcategory_name || r.title },
                        r.name || r.subcategory_name || r.title,
                      ),
                    ),
                  ),
                )
              : e.createElement(
                  "label",
                  { className: "text-xs font-semibold text-slate-500 dark:text-slate-300" },
                  n("category", { defaultValue: "Category" }),
                  e.createElement(
                    "select",
                    {
                      value: categoryLock || a.category || "All",
                      disabled: !!categoryLock,
                      onChange: (r) => {
                        const value = r.target.value;
                        l((t) => ({ ...t, category: value, subcategory: "All" }));
                        value && value !== "All" && selectCategoryMode(value);
                        s(v(b, value, ""));
                      },
                      className:
                        "mt-1 h-9 w-full rounded-lg border border-slate-200 dark:border-gray-600 bg-slate-50 dark:bg-gray-800 dark:text-white px-3 text-sm transition-colors dark:border-slate-700 dark:bg-slate-950",
                    },
                    e.createElement("option", { value: "All" }, "All categories"),
                    (Array.isArray(appScopedCategoryOptions) ? appScopedCategoryOptions : []).map(
                      (r) =>
                        e.createElement(
                          "option",
                          { key: r.category_id || r.id || r.name, value: r.name },
                          r.name,
                        ),
                    ),
                  ),
                ),
            e.createElement(
              "label",
              { className: "text-xs font-semibold text-slate-500 dark:text-slate-300" },
              n("min_price", { defaultValue: "Min price" }),
              e.createElement("input", {
                type: "number",
                value: a.minPrice || "",
                onChange: (r) =>
                  l((t) => ({ ...t, minPrice: r.target.value })),
                className:
                  "mt-1 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm dark:border-slate-700 dark:bg-slate-950",
                placeholder: "0",
              }),
            ),
            e.createElement(
              "label",
              { className: "text-xs font-semibold text-slate-500 dark:text-slate-300" },
              n("max_price", { defaultValue: "Max price" }),
              e.createElement("input", {
                type: "number",
                value: a.maxPrice || "",
                onChange: (r) =>
                  l((t) => ({ ...t, maxPrice: r.target.value })),
                className:
                  "mt-1 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm dark:border-slate-700 dark:bg-slate-950",
                placeholder: "100000",
              }),
            ),
          ),
          activeFilters.length > 0 &&
            e.createElement(
              "div",
              { className: "mt-3 flex flex-wrap gap-2" },
              activeFilters.map((filter) =>
                e.createElement(
                  "button",
                  {
                    key: filter.key,
                    type: "button",
                    onClick: () => clearFilterKey(filter.key),
                    "aria-label": n("remove_filter", { defaultValue: `Remove filter: ${filter.label}` }),
                    className:
                      "inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3.5 h-11 text-xs text-slate-600 hover:shadow-sm active:scale-95 transition-all duration-150 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200",
                  },
                  filter.label,
                  filter.key === "category" && categoryLock
                    ? null
                    : e.createElement(Y, { className: "w-4 h-4" }),
                ),
              ),
            ),
          resultsLoading
            ? e.createElement(te, {
                marker: "loading",
                className: "border-0 shadow-none bg-transparent mt-4 dark:border-0 dark:bg-transparent",
                title: "Loading results",
                description: "Fetching results for your search.",
              })
            : resultsError
              ? e.createElement(re, {
                  marker: "error",
                  className: "border-0 shadow-none bg-transparent mt-4 dark:border-0 dark:bg-transparent",
                  title: "Results unavailable",
                  description: resultsError,
                  onRetry: () => setResultsRefresh((r) => r + 1),
                })
              : resultsCount === 0
                ? e.createElement(
                    "div",
                    { className: "mt-4 space-y-4" },
                    e.createElement(J, {
                      marker: "empty",
                      className: "border-0 shadow-none bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-800 dark:to-gray-800 rounded-2xl dark:border-0 dark:bg-gradient-to-br",
                      title: "No results found",
                      description:
                        "Try adjusting your keywords or filters to see more matches.",
                      action: e.createElement(
                        m,
                        { type: "button", variant: "outline", onClick: T },
                        "Clear filters",
                      ),
                    }),
                    trendingSuggestions.length > 0 &&
                      e.createElement(
                        "div",
                        { className: "bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700" },
                        e.createElement("p", { className: "text-sm font-semibold text-gray-600 dark:text-gray-300 mb-3 flex items-center gap-2" },
                          e.createElement(I, { className: "w-4 h-4" }),
                          "Popular searches"
                        ),
                        e.createElement(
                          "div",
                          { className: "flex flex-wrap gap-2" },
                          trendingSuggestions.map((suggestion) =>
                            e.createElement(
                              m,
                              {
                                key: suggestion,
                                type: "button",
                                variant: "secondary",
                                size: "sm",
                                className: "rounded-full text-xs",
                                  onClick: () => {
                                    l((prev) => ({ ...prev, search: suggestion }));
                                  },
                              },
                              suggestion,
                            ),
                          ),
                        ),
                      ),
                  )
                : resultsCount === null
                  ? e.createElement(J, {
                      marker: "empty",
                      className: "border-0 shadow-none bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-800 dark:to-gray-800 rounded-2xl mt-4 dark:border-0 dark:bg-gradient-to-br",
                      title: "Start searching",
                      description: "Enter a keyword or add a filter to see matches.",
                    })
                  : e.createElement(
                      "div",
                      { className: "mt-4 space-y-3 transition-opacity duration-300" },
                      results.slice(0, 3).map((post) =>
                        e.createElement(
                          "button",
                          {
                            key: post.post_id || post.id,
                            type: "button",
                            onClick: () =>
                              s(`/post/${post.post_id || post.id}`, {
                                state: {
                                  source: "search",
                                  returnTo:
                                    typeof window !== "undefined"
                                      ? `${window.location.pathname}${window.location.search}`
                                      : "/search",
                                },
                              }),
                            className:
                              "w-full text-left rounded-xl border border-slate-200 dark:border-gray-700 mhub-premium-surface mhub-shine px-4 py-2.5 hover:shadow-xl hover:-translate-y-0.5 hover:shadow-blue-500/5 dark:hover:shadow-blue-400/5 transition-all duration-200 ease-out dark:border-slate-700",
                          },
                          e.createElement(
                            "p",
                            {
                              className:
                                "text-sm font-semibold text-slate-900 dark:text-white truncate dark:text-slate-100",
                            },
                            post.title || "Untitled post",
                          ),
                          (() => {
                            const subLabel =
                              post.subcategory_name ||
                              post.subcategory ||
                              post.subcategoryName ||
                              "";
                            const categoryLabel =
                              post.category_name ||
                              post.category ||
                              post.categoryName ||
                              "";
                            const primaryLabel = subLabel || categoryLabel;
                            const secondaryLabel = subLabel ? categoryLabel : "";
                            return primaryLabel
                              ? e.createElement(
                                  "div",
                                  {
                                    className:
                                      "mt-1 flex flex-wrap items-center gap-2 text-xs",
                                  },
                                  e.createElement(
                                    "span",
                                    {
                                      className: `font-semibold ${
                                        subLabel
                                          ? "text-blue-700 dark:text-blue-400"
                                          : "text-slate-600 dark:text-gray-300"
                                      }`,
                                    },
                                    primaryLabel,
                                  ),
                                  secondaryLabel
                                    ? e.createElement(
                                        "span",
                                        { className: "text-slate-500 dark:text-slate-300" },
                                        `- ${secondaryLabel}`,
                                      )
                                    : null,
                                )
                              : null;
                          })(),
                          e.createElement(
                            "div",
                            { className: "mt-1 flex items-center justify-between text-xs text-slate-500 dark:text-slate-300" },
                            e.createElement(
                              "span",
                              null,
                              post.location || "Location unknown",
                            ),
                            e.createElement(
                              "span",
                              { className: "text-blue-600 dark:text-emerald-400 font-semibold dark:text-blue-300" },
                              post.price
                                ? `Rs ${Number(post.price).toLocaleString("en-IN")}`
                                : "Price on request",
                            ),
                          ),
                        ),
                      ),
                    ),
          e.createElement(
            "div",
            { className: "mt-4 flex flex-wrap gap-2" },
            e.createElement(
              m,
              { type: "button", className: "w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/25 hover:shadow-xl transition-all duration-200 dark:bg-gradient-to-r dark:text-white", onClick: () => s(v(b, a.category, a.subcategory)) },
              n("view_results", { defaultValue: "View results" }),
            ),
            e.createElement(
              m,
              { type: "button", variant: "outline", onClick: T },
              n("clear_filters", { defaultValue: "Clear filters" }),
            ),
          ),
        ),
        e.createElement(
          "div",
          { className: "mhub-premium-surface rounded-2xl p-3.5 shadow-lg" },
          e.createElement(
            "div",
            { className: "flex flex-wrap items-center justify-between gap-2 mb-3" },
            e.createElement(
              "div",
              { className: "flex items-center gap-2 min-w-0" },
              e.createElement("div", { className: "flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 dark:bg-gradient-to-br" }, e.createElement(U, { className: "w-4 h-4 text-blue-600 dark:text-blue-300" })),
              e.createElement(
                "h2",
                {
                  className:
                    "text-base font-bold mhub-gradient-text truncate",
                },
                n("recent_searches", { defaultValue: "Recent Searches" }),
              ),
            ),
            c.length > 0 &&
              e.createElement(
                "button",
                {
                  onClick: z,
                  className:
                    "text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 dark:text-blue-300 dark:hover:text-blue-300",
                },
                e.createElement(ee, { className: "w-4 h-4" }),
                n("clear_all", { defaultValue: "Clear All" }),
              ),
          ),
          c.length === 0
            ? e.createElement(J, {
                marker: "empty",
                className: "border-0 shadow-none bg-transparent dark:border-0 dark:bg-transparent",
                title: "No recent searches",
                description: "Your recent search history will appear here.",
                action: trendingSeed
                  ? e.createElement(
                      m,
                      {
                        type: "button",
                        variant: "outline",
                        "data-ux-action": "search_use_trending_seed",
                        onClick: () => k(trendingSeed),
                      },
                      'Try "',
                      trendingSeed,
                      '"',
                    )
                  : null,
              })
            : e.createElement(
                "div",
                { className: "space-y-2" },
                c.map((r) =>
                  e.createElement(
                    "div",
                    {
                      key: r,
                      onClick: () => k(r),
                      className:
                        "flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-gray-800 cursor-pointer transition-colors duration-150 group dark:hover:bg-slate-950",
                    },
                    e.createElement(
                      "div",
                      { className: "flex items-center gap-3 min-w-0 flex-1" },
                      e.createElement(U, {
                        className: "w-4 h-4 text-gray-400 dark:text-gray-300",
                      }),
                      e.createElement(
                        "span",
                        {
                          className: "text-gray-700 dark:text-gray-200 truncate",
                        },
                        r,
                      ),
                    ),
                    e.createElement(
                      "div",
                      { className: "flex items-center gap-2" },
                      e.createElement(
                        "button",
                        {
                          onClick: (t) => H(r, t),
                          className:
                            "p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 opacity-0 group-hover:opacity-100 transition dark:hover:bg-gray-900",
                        },
                        e.createElement(Y, {
                          className: "w-4 h-4 text-gray-500 dark:text-gray-300",
                        }),
                      ),
                      e.createElement(R, {
                        className: "w-4 h-4 text-gray-400 dark:text-gray-300",
                      }),
                    ),
                  ),
                ),
              ),
        ),
        e.createElement(
          "div",
          { className: "mhub-premium-surface rounded-2xl p-3.5 shadow-lg" },
          e.createElement(
            "div",
            { className: "flex items-center gap-2 mb-3" },
            e.createElement("div", { className: "flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 dark:bg-gradient-to-br" }, e.createElement(I, { className: "w-4 h-4 text-orange-600 dark:text-orange-300" })),
            e.createElement(
              "h2",
              { className: "text-base font-bold mhub-gradient-text" },
              n("trending_searches", { defaultValue: "Trending Searches" }),
            ),
          ),
          e.createElement(
            "div",
            { className: "flex flex-wrap gap-3" },
            trendingSuggestions.length === 0
              ? e.createElement(
                  "p",
                  {
                    className:
                      "text-sm text-slate-500 dark:text-slate-300",
                  },
                  n("trending_searches_empty", {
                    defaultValue: "Trending searches will appear here soon.",
                  }),
                )
              : trendingSuggestions.map((r) =>
                  e.createElement(
                    "button",
                    {
                      key: r,
                      onClick: () => k(r),
                      className:
                        "px-4 h-11 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border border-orange-200/50 dark:border-orange-800/30 rounded-full text-gray-700 dark:text-gray-200 hover:shadow-md hover:shadow-orange-500/10 hover:border-orange-400 active:scale-[0.97] transition-all duration-150 flex items-center gap-2 font-medium dark:bg-gradient-to-r dark:border-orange-600/50 dark:hover:border-orange-600/40",
                    },
                    e.createElement(I, {
                      className: "w-3.5 h-3.5 text-orange-500 dark:text-orange-300",
                    }),
                    r,
                  ),
                ),
          ),
        ),
        e.createElement(
          "div",
          { className: "mhub-premium-surface rounded-2xl p-3.5 shadow-lg" },
          e.createElement(
            "div",
            { className: "flex items-center gap-2 mb-3" },
            e.createElement("div", { className: "flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-100 to-violet-100 dark:from-purple-900/30 dark:to-violet-900/30 dark:bg-gradient-to-br" }, e.createElement(Z, { className: "w-4 h-4 text-purple-600 dark:text-purple-300" })),
            e.createElement(
              "h2",
              { className: "text-base font-bold mhub-gradient-text" },
              isSubcategoryMode
                ? n("popular_subcategories", { defaultValue: "Popular Subcategories" })
                : n("popular_categories", { defaultValue: "Popular Categories" }),
            ),
          ),
          suggestionLoading
            ? e.createElement(te, {
                marker: "loading",
                className: "border-0 shadow-none bg-transparent dark:border-0 dark:bg-transparent",
                title: isSubcategoryMode ? "Loading subcategories" : "Loading category suggestions",
                description:
                  "You can still search manually while we fetch suggestions.",
              })
            : suggestionError
              ? e.createElement(re, {
                  marker: "error",
                  className: "border-0 shadow-none bg-transparent dark:border-0 dark:bg-transparent",
                  title: "Category suggestions unavailable",
                  description: suggestionError,
                  onRetry: x,
                  secondaryAction: e.createElement(
                    m,
                    {
                      type: "button",
                      variant: "outline",
                      "data-ux-action": "search_clear_filters",
                      onClick: T,
                    },
                    "Clear all filters",
                  ),
                })
              : suggestionItems.length === 0
                ? e.createElement(J, {
                    marker: "empty",
                    className: "border-0 shadow-none bg-transparent dark:border-0 dark:bg-transparent",
                    title: isSubcategoryMode ? "No subcategories available" : "No category suggestions",
                    description:
                      isSubcategoryMode
                        ? "Switch categories to see different subcategories."
                        : "Try a direct keyword search or browse all posts.",
                    action: isSubcategoryMode
                      ? e.createElement(
                          m,
                          {
                            type: "button",
                            variant: "outline",
                            onClick: () => s("/category-mode"),
                          },
                          "Switch category",
                        )
                      : e.createElement(
                          m,
                          {
                            type: "button",
                            variant: "outline",
                            "data-ux-action": "search_browse_all_posts",
                            onClick: () => s("/all-posts"),
                          },
                          "Browse all posts",
                        ),
                  })
                : e.createElement(
                    "div",
                    { className: "grid grid-cols-2 sm:grid-cols-4 gap-3" },
                    suggestionItems.map((r) =>
                      e.createElement(
                        "button",
                        {
                          key: r.category_id || r.subcategory_id || r.id || r.name,
                          onClick: () => j(r.name || r.subcategory_name || r.title, r),
                          className:
                            "flex flex-col items-center justify-center gap-2 p-4 h-[60px] rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 hover:shadow-lg hover:shadow-indigo-500/10 dark:hover:shadow-indigo-400/5 hover:-translate-y-0.5 transition-all duration-200 border border-gray-100 dark:border-gray-700 dark:hover:bg-gray-950 dark:border",
                        },
                        e.createElement(
                          "span",
                          {
                            className:
                              "text-sm font-semibold text-gray-700 dark:text-gray-200 text-center",
                          },
                          r.name || r.subcategory_name || r.title,
                        ),
                      ),
                    ),
                  ),
        ),
        e.createElement(
          "div",
          {
            className:
              "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-5 border border-blue-200 dark:border-blue-800 dark:bg-gradient-to-r dark:border-blue-600/40",
            "data-density": "extra",
          },
          e.createElement(
            "h3",
            { className: "font-bold text-blue-800 dark:text-blue-300 mb-3 dark:text-blue-200" },
            "Search Tips",
          ),
          e.createElement(
            "ul",
            { className: "space-y-2 text-sm text-blue-700 dark:text-blue-300" },
            e.createElement(
              "li",
              null,
              "- Use specific terms such as model + storage + condition.",
            ),
            e.createElement(
              "li",
              null,
              "- Add a location keyword to find nearby listings faster.",
            ),
            e.createElement(
              "li",
              null,
              "- Use category chips first, then narrow with keywords.",
            ),
          ),
        ),
      ),
    );
  };
var he = SearchPage;
export { he as default };

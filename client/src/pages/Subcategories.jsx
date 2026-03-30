import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import BreadcrumbsBar from "@/components/BreadcrumbsBar";
import { useCategoryMode } from "@/context/CategoryModeContext";
import {
  ArrowLeft,
  Package,
  RefreshCw,
  Search,
  Shapes,
  ShoppingBag,
  X,
} from "lucide-react";
import { fetchAllSubcategories } from "@/services/subcategoriesService";
import { getCategoryIcon, getSubcategoryIcon } from "@/constants/categoryIcons";
import {
  buildActiveAppMatcher,
  matchesCategoryModeItem,
} from "@/utils/categoryModeFilters";
import { useCmsPage } from "@/hooks/useCmsPage";

const CARD_GRADIENTS = [
  "from-blue-500 to-indigo-600",
  "from-pink-500 to-rose-600",
  "from-emerald-500 to-green-600",
  "from-cyan-500 to-blue-600",
  "from-purple-500 to-violet-600",
  "from-orange-500 to-amber-600",
];
const CATEGORY_GRADIENTS = {
  electronics: "from-blue-500 to-indigo-600",
  vehicles: "from-emerald-500 to-teal-600",
  services: "from-slate-700 to-gray-900",
  fashion: "from-pink-500 to-rose-600",
  "real estate": "from-amber-500 to-rose-500",
  jobs: "from-violet-500 to-purple-600",
  "home & living": "from-amber-500 to-orange-500",
  "home appliances": "from-sky-500 to-blue-600",
  books: "from-blue-500 to-indigo-500",
  sports: "from-green-500 to-lime-500",
  "kids & baby": "from-orange-400 to-pink-500",
  kids: "from-orange-400 to-pink-500",
};

const normalizeValue = (value) => String(value || "").trim().toLowerCase();
const getSubcategoryCount = (subcategory) =>
  Number(subcategory?.post_count ?? subcategory?.popularity_score ?? subcategory?.count ?? 0);

function buildQueryString(params) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim()) {
      searchParams.set(key, String(value));
    }
  });
  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export default function Subcategories() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const route = useLocation();
  const {
    selectCategory,
    selectSubcategory,
    activeApp,
    categories: categoryModeCategories,
  } = useCategoryMode();
  const isDarkMode = useMemo(() => {
    if (typeof window === "undefined") return false;
    if (document.documentElement.classList.contains("dark")) return true;
    return window.localStorage.getItem("mhub-theme") === "dark";
  }, []);
  const { data: cmsContent } = useCmsPage("subcategories");
  const cardGradients = useMemo(
    () =>
      Array.isArray(cmsContent?.cardGradients)
        ? cmsContent.cardGradients
        : CARD_GRADIENTS,
    [cmsContent],
  );
  const categoryGradients = useMemo(
    () => ({
      ...CATEGORY_GRADIENTS,
      ...(cmsContent?.categoryGradients &&
      typeof cmsContent.categoryGradients === "object"
        ? cmsContent.categoryGradients
        : {}),
    }),
    [cmsContent],
  );
  const resolveCategoryGradient = useCallback(
    (categoryName, index) => {
      const key = normalizeValue(categoryName);
      return (
        categoryGradients[key] ||
        cardGradients[index % cardGradients.length]
      );
    },
    [categoryGradients, cardGradients],
  );

  const [subcategories, setSubcategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState("popular");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const params = useMemo(() => new URLSearchParams(route.search), [route.search]);
  const categoryIdFilter = params.get("category_id") || params.get("categoryId") || "";
  const categoryNameFilter = params.get("category") || "";
  const tierParam = params.get("tier") || "";
  const isPostFlow = normalizeValue(params.get("flow")) === "post";
  const isForYouMode =
    params.get("mode") === "for-you" ||
    (route?.state?.returnTo || "").startsWith("/for-you");

  const loadSubcategories = async () => {
    setLoading(true);
    setError("");

    try {
      const list = await fetchAllSubcategories();
      setSubcategories(Array.isArray(list) ? list : []);
    } catch {
      setSubcategories([]);
      setError(
        t("subcategories_load_failed", {
          defaultValue: "Unable to load subcategories right now.",
        }),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSubcategories();
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const activeAppMatcher = useMemo(
    () => buildActiveAppMatcher(activeApp, categoryModeCategories),
    [activeApp, categoryModeCategories],
  );

  const filteredSubcategories = useMemo(() => {
    const normalizedSearch = normalizeValue(searchQuery);
    const filtered = subcategories.filter((subcategory) => {
      const categoryId = String(subcategory?.category_id || "").trim();
      const categoryName = String(subcategory?.category_name || "").trim();
      const matchesActiveApp =
        !activeAppMatcher?.activeApp ||
        matchesCategoryModeItem(subcategory, { activeAppMatcher });
      const matchesCategory =
        (!categoryIdFilter || categoryId === String(categoryIdFilter).trim()) &&
        (!categoryNameFilter || normalizeValue(categoryName) === normalizeValue(categoryNameFilter));

      if (!matchesActiveApp || !matchesCategory) return false;
      if (!normalizedSearch) return true;

      return (
        normalizeValue(subcategory?.name).includes(normalizedSearch) ||
        normalizeValue(categoryName).includes(normalizedSearch)
      );
    });

    return [...filtered].sort((left, right) => {
      if (sortMode === "az") {
        const categoryDiff = String(left?.category_name || "").localeCompare(
          String(right?.category_name || ""),
          undefined,
          { sensitivity: "base" },
        );
        if (categoryDiff !== 0) return categoryDiff;
        return String(left?.name || "").localeCompare(String(right?.name || ""), undefined, {
          sensitivity: "base",
        });
      }

      const countDiff = getSubcategoryCount(right) - getSubcategoryCount(left);
      if (countDiff !== 0) return countDiff;

      const displayOrderDiff =
        Number(left?.display_order ?? 0) - Number(right?.display_order ?? 0);
      if (displayOrderDiff !== 0) return displayOrderDiff;

      return String(left?.name || "").localeCompare(String(right?.name || ""), undefined, {
        sensitivity: "base",
      });
    });
  }, [
    activeAppMatcher,
    categoryIdFilter,
    categoryNameFilter,
    searchQuery,
    sortMode,
    subcategories,
  ]);

  const activeCategoryLabel = useMemo(() => {
    if (categoryNameFilter) return categoryNameFilter;
    if (categoryIdFilter) {
      const match = subcategories.find(
        (subcategory) => String(subcategory?.category_id || "") === String(categoryIdFilter),
      );
      return match?.category_name || "";
    }
    return "";
  }, [categoryIdFilter, categoryNameFilter, subcategories]);

  useEffect(() => {
    document.title = activeCategoryLabel
      ? `MHub — ${activeCategoryLabel} Subcategories`
      : "MHub — Subcategories";
    return () => { document.title = "MHub"; };
  }, [activeCategoryLabel]);

  const parentCategoryCount = useMemo(() => {
    return new Set(
      filteredSubcategories.map((subcategory) => String(subcategory?.category_id || subcategory?.category_name || "")),
    ).size;
  }, [filteredSubcategories]);

  const handleSubcategorySelect = (subcategory) => {
    const categoryId = subcategory?.category_id || "";
    const categoryName = subcategory?.category_name || "";
    const subcategoryId = subcategory?.subcategory_id || subcategory?.id || "";
    const subcategoryName = subcategory?.name || "";

    if (categoryName) {
      selectCategory({ name: categoryName, category_id: categoryId, id: categoryId });
    }
    if (subcategoryName) {
      selectSubcategory({
        name: subcategoryName,
        subcategory_id: subcategoryId,
        category_id: categoryId,
      });
    }

    const query = buildQueryString({
      tier: tierParam,
      mode: isForYouMode ? "for-you" : "",
      category_id: categoryId,
      subcategory_id: subcategoryId,
    });
    const target = isPostFlow ? "/add-post" : isForYouMode ? "/for-you" : "/all-posts";
    navigate(`${target}${query}`);
  };

  const clearSearch = () => setSearchQuery("");
  const clearCategoryFilter = () => navigate("/subcategories");
  const heroLabel = activeCategoryLabel
    ? t("explore_category_subcategories", {
        defaultValue: "{{category}} subcategories",
        category: activeCategoryLabel,
      })
    : isPostFlow
    ? t("pick_subcategory_to_post", { defaultValue: "Pick a subcategory to post in" })
    : t("explore_subcategories", { defaultValue: "Explore Subcategories" });
  const heroDescription = activeCategoryLabel
    ? t("pick_subcategory_in_category", {
        defaultValue: "Browse the best subcategories inside {{category}}.",
        category: activeCategoryLabel,
      })
    : isPostFlow
    ? t("pick_subcategory_post_hint", {
        defaultValue: "Choose the right subcategory so buyers can find your listing fast.",
      })
    : t("pick_subcategory_to_jump", {
        defaultValue: "Pick a subcategory to jump directly to focused listings.",
      });

  return (
    <div className="mhub-page-subcategories min-h-screen mhub-premium-page bg-gradient-to-br from-blue-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 dark:bg-gradient-to-br">
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
      <div className="mb-6 w-full max-w-6xl px-4 pt-8 md:pt-10 mx-auto page-shell page-pad">
        {/* Post flow progress banner */}
        {isPostFlow ? (
          <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center gap-3 dark:border-emerald-900/40 dark:bg-emerald-900/10 dark:border dark:border-emerald-600/40 dark:bg-emerald-950/20">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs font-black text-white dark:bg-emerald-800/30 dark:text-xs dark:text-white">
              3
            </div>
            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300 dark:text-sm dark:text-emerald-200">
              {t("post_flow_step_3", { defaultValue: "Step 3 of 3 — Choose where your listing belongs" })}
            </p>
          </div>
        ) : null}
        <div className="mb-4 mhub-premium-surface rounded-2xl px-4 py-3 shadow-sm">
          <BreadcrumbsBar tone={isDarkMode ? "dark" : "light"} />
        </div>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 dark:from-slate-900 dark:via-blue-900 dark:to-slate-800 px-6 py-5 sm:py-6 shadow-xl dark:bg-gradient-to-r">
          <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-blue-400/10 blur-3xl pointer-events-none dark:bg-blue-800/10" />
          <div className="absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none dark:bg-emerald-800/10" />
          <div className="relative z-10 mx-auto max-w-4xl">
            <button
              type="button"
              onClick={() => navigate(isPostFlow ? "/post-welcome" : "/category-hub")}
              className="mb-4 inline-flex items-center text-white/90 transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-500 rounded-md dark:text-white/90 dark:hover:text-white"
            >
              <ArrowLeft className="mr-2 h-5 w-5" />
              {isPostFlow
                ? t("back_to_post_welcome", { defaultValue: "Back to Post Welcome" })
                : t("back_to_home_hub", { defaultValue: "Back to Home" })}
            </button>

            <div className="flex flex-wrap items-center gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70 mb-1 dark:text-[10px] dark:text-white/70">
                  {isPostFlow ? t("posting_flow_label", { defaultValue: "Posting flow" }) : t("browse_label", { defaultValue: "Browse" })}
                </p>
                <h1 className="mb-2 text-xl sm:text-2xl md:text-3xl font-bold text-white dark:text-xl dark:sm:text-2xl dark:md:text-3xl dark:text-white">
                  {heroLabel}
                </h1>
                <p className="max-w-2xl text-base text-white/90 md:text-lg dark:text-base dark:text-white/90 dark:md:text-lg">
                  {heroDescription}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Badge className="bg-white/15 text-white border-white/20 dark:bg-slate-900/15 dark:text-white dark:border-white/20">
                {filteredSubcategories.length} {t("subcategories", { defaultValue: "subcategories" })}
              </Badge>
              <Badge className="bg-white/15 text-white border-white/20 dark:bg-slate-900/15 dark:text-white dark:border-white/20">
                {parentCategoryCount} {t("categories", { defaultValue: "categories" })}
              </Badge>
              {activeCategoryLabel ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-white/30 bg-white/10 text-white hover:bg-white/20 dark:border-white/30 dark:bg-slate-900/10 dark:text-white dark:hover:bg-slate-900/20"
                  onClick={clearCategoryFilter}
                >
                  {t("show_all_subcategories", { defaultValue: "Show all subcategories" })}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 page-shell page-pad">
        <div className="mb-5 mhub-premium-surface rounded-2xl p-4">
          <div className="relative" role="search">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-300" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              aria-label={t("search_subcategories_or_categories", {
                defaultValue: "Search subcategories or categories",
              })}
              placeholder={t("search_subcategories_or_categories", {
                defaultValue: "Search subcategories or categories",
              })}
              className="mhub-input h-11 w-full rounded-lg pl-10 pr-10 text-[var(--text)] dark:text-slate-100 dark:placeholder:text-slate-500 outline-none transition-shadow duration-200 focus:ring-4 focus:ring-blue-400/30 focus:ring-offset-0 dark:text-[var(--text)]"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={clearSearch}
                aria-label={t("clear_search", { defaultValue: "Clear search" })}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-500 dark:hover:bg-gray-700 dark:hover:text-gray-200 dark:text-gray-300 dark:hover:bg-gray-900"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs dark:text-xs">
            <span className="font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
              {t("sort_by", { defaultValue: "Sort" })}
            </span>
            <Button
              size="sm"
              variant={sortMode === "popular" ? "default" : "outline"}
              onClick={() => setSortMode("popular")}
              aria-label={t("sort_by_popular", { defaultValue: "Sort by popularity" })}
              className="focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-500"
            >
              {t("popular", { defaultValue: "Popular" })}
            </Button>
            <Button
              size="sm"
              variant={sortMode === "az" ? "default" : "outline"}
              onClick={() => setSortMode("az")}
              aria-label={t("sort_alphabetically", { defaultValue: "Sort alphabetically" })}
              className="focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-500"
            >
              A-Z
            </Button>
            <span className="ml-auto text-slate-500 dark:text-slate-400 dark:text-slate-300">
              {filteredSubcategories.length} {t("results", { defaultValue: "results" })}
            </span>
          </div>
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30 dark:border dark:border-red-600/40 dark:bg-red-950/20">
            <p className="mb-3 text-sm text-red-700 dark:text-red-300 dark:text-sm">{error}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-red-200 text-red-700 dark:border-red-600/40 dark:text-red-300"
                onClick={loadSubcategories}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {t("retry", { defaultValue: "Retry" })}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={clearCategoryFilter}
              >
                {t("show_all_subcategories", { defaultValue: "Show all subcategories" })}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/category-hub")}
              >
                {t("return_to_home_hub", { defaultValue: "Return to Home Hub" })}
              </Button>
            </div>
          </div>
        ) : null}

        {loading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <Card
                key={`subcategory-skeleton-${index}`}
                className="mhub-premium-surface rounded-2xl p-5"
              >
                <div className="mb-3 h-12 w-12 rounded-xl bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 bg-[length:200%_100%] animate-[shimmer_1.5s_ease-in-out_infinite] dark:bg-gradient-to-r" />
                <div className="mb-2 h-4 w-3/4 rounded bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 bg-[length:200%_100%] animate-[shimmer_1.5s_ease-in-out_infinite] dark:bg-gradient-to-r" />
                <div className="mb-2 h-3 w-1/2 rounded bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 bg-[length:200%_100%] animate-[shimmer_1.5s_ease-in-out_infinite] dark:bg-gradient-to-r" />
                <div className="h-3 w-full rounded bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 bg-[length:200%_100%] animate-[shimmer_1.5s_ease-in-out_infinite] dark:bg-gradient-to-r" />
              </Card>
            ))}
          </div>
        ) : null}

        {!loading && filteredSubcategories.length === 0 ? (
          <Card className="mhub-premium-surface rounded-2xl p-6 text-center dark:text-center">
            <Search className="h-16 w-16 text-slate-300 dark:text-slate-600 mx-auto mb-4 animate-pulse dark:text-slate-300" />
            <h2 className="mb-2 text-lg font-semibold text-blue-900 dark:text-blue-200 dark:text-lg">
              {t("no_subcategories_match_search", {
                defaultValue: "No subcategories match your search",
              })}
            </h2>
            <p className="mb-4 text-sm text-blue-700 dark:text-blue-300 dark:text-sm">
              {t("try_broader_subcategory_keyword", {
                defaultValue: "Try a broader keyword or clear the current filter.",
              })}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                type="button"
                className="bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700/40 dark:text-white dark:hover:bg-blue-700/40"
                onClick={clearSearch}
              >
                {t("reset_search", { defaultValue: "Reset search" })}
              </Button>
              {activeCategoryLabel ? (
                <Button type="button" variant="outline" onClick={clearCategoryFilter}>
                  {t("show_all_subcategories", { defaultValue: "Show all subcategories" })}
                </Button>
              ) : null}
            </div>
          </Card>
        ) : null}

        {!loading && filteredSubcategories.length > 0 ? (
          <>
            <h2 className="mb-6 flex items-center gap-2 text-xl font-bold mhub-gradient-text md:text-2xl dark:text-xl dark:md:text-2xl">
              <span className="inline-block h-5 w-1 rounded-full bg-gradient-to-b from-blue-500 to-indigo-500 dark:bg-gradient-to-b" />
              {sortMode === "popular"
                ? t("popular_subcategories", { defaultValue: "Popular Subcategories" })
                : t("all_subcategories", { defaultValue: "All Subcategories" })}
            </h2>

            <div className="mb-10 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
              {filteredSubcategories.map((subcategory, index) => {
                const Icon = getSubcategoryIcon(
                  subcategory?.name,
                  subcategory?.category_name,
                  Package,
                );
                const gradient = resolveCategoryGradient(subcategory?.category_name, index);
                const count = getSubcategoryCount(subcategory);
                const iconUrl = subcategory?.icon_url || subcategory?.iconUrl;

                return (
                  <Card
                    key={
                      subcategory?.subcategory_id ||
                      subcategory?.id ||
                      `${subcategory?.category_name}-${subcategory?.name}-${index}`
                    }
                    onClick={() => handleSubcategorySelect(subcategory)}
                    style={{ animationDelay: `${(index % 12) * 50}ms` }}
                    className="group cursor-pointer overflow-hidden rounded-2xl border border-gray-200 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-xl hover:shadow-blue-500/10 dark:hover:shadow-blue-400/5 active:scale-[0.98] dark:border-gray-700 dark:shadow-slate-900/50 opacity-0 animate-[fadeInUp_0.4s_ease-out_forwards] mhub-shine dark:border"
                  >
                    <CardContent className="p-5 md:p-6">
                      <div
                        className={`mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg shadow-current/20 md:h-14 md:w-14 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 ${gradient}`}
                      >
                        {iconUrl ? (
                          <img
                            src={iconUrl}
                            alt={`${subcategory?.name || "Subcategory"} icon`}
                            className="h-6 w-6 object-contain"
                            loading="lazy"
                          />
                        ) : (
                          <Icon className="h-6 w-6" />
                        )}
                      </div>

                      <h3 className="mb-1 line-clamp-1 text-base font-extrabold text-gray-900 md:text-lg dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200 dark:text-base dark:text-gray-100 dark:md:text-lg dark:group-hover:text-blue-300">
                        {subcategory?.name || t("subcategory", { defaultValue: "Subcategory" })}
                      </h3>

                      <p className="min-h-[2.25rem] line-clamp-2 text-xs text-gray-500 md:text-sm dark:text-gray-400 dark:text-xs dark:text-gray-300 dark:md:text-sm">
                        {subcategory?.description ||
                          t("browse_listings_subcategory", {
                            defaultValue: "Browse listings in this subcategory.",
                          })}
                      </p>
                      <p className="mt-2">
                        <span className="inline-flex items-center gap-1 bg-gradient-to-r from-slate-100 to-slate-50 dark:from-gray-700 dark:to-gray-600 text-slate-600 dark:text-slate-300 px-2.5 py-0.5 rounded-full text-xs font-bold dark:bg-gradient-to-r dark:text-slate-200 dark:text-xs">
                        {count > 0 ? count : "\u2022"}
                        </span>
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="mt-8 text-center dark:text-center">
              <div className="mhub-premium-surface rounded-2xl p-6 md:p-8">
                <h3 className="mb-3 text-xl font-bold mhub-gradient-text md:text-2xl dark:text-xl dark:md:text-2xl">
                  {t("need_broader_results", { defaultValue: "Need broader results?" })}
                </h3>
                <p className="mb-5 text-sm text-gray-600 md:text-base dark:text-gray-300 dark:text-sm dark:text-gray-200 dark:md:text-base">
                  {t("return_to_home_hub_for_groups", {
                    defaultValue: "Return to the home hub to browse the top-level category groups.",
                  })}
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <Button
                    onClick={() => navigate("/category-hub")}
                    className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-6 py-2 font-bold text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-200 md:px-8 md:py-3 dark:bg-gradient-to-r dark:text-white"
                  >
                    <Shapes className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                    {t("open_home_hub", { defaultValue: "Open Home Hub" })}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate("/all-posts")}
                    className="rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    <ShoppingBag className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                    {t("browse_all_posts", { defaultValue: "Browse All Posts" })}
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

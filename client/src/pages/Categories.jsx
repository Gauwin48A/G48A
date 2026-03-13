import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Camera,
  Car,
  Gamepad,
  Headphones,
  Home,
  Laptop,
  Monitor,
  Package,
  RefreshCw,
  Search,
  Shirt,
  ShoppingBag,
  Smartphone,
  Watch,
} from "lucide-react";
import { fetchCategoriesCached } from "@/services/categoriesService";

const CATEGORY_ICON_MAP = {
  Electronics: Monitor,
  Fashion: Shirt,
  Home: Home,
  Mobiles: Smartphone,
  Laptops: Laptop,
  Watches: Watch,
  Cameras: Camera,
  Audio: Headphones,
  Gaming: Gamepad,
  Vehicles: Car,
};

const CARD_GRADIENTS = [
  "from-blue-500 to-indigo-600",
  "from-pink-500 to-rose-600",
  "from-emerald-500 to-green-600",
  "from-cyan-500 to-blue-600",
  "from-purple-500 to-violet-600",
  "from-orange-500 to-amber-600",
];

const CATEGORY_TRANSLATION_KEYS = {
  "Home Appliances": "home_appliances",
};

function toCategoryTranslationKey(categoryName) {
  const normalized = String(categoryName || "").trim();
  if (!normalized) return "";
  if (CATEGORY_TRANSLATION_KEYS[normalized]) {
    return CATEGORY_TRANSLATION_KEYS[normalized];
  }
  return normalized.toLowerCase().replace(/\s+/g, "_");
}

export default function Categories() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const route = useLocation();

  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadCategories = async () => {
    setLoading(true);
    setError("");

    try {
      const list = await fetchCategoriesCached();
      setCategories(Array.isArray(list) ? list : []);
    } catch {
      setCategories([]);
      setError(
        t("categories_load_failed") || "Unable to load categories right now.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCategories();
  }, []);

  const filteredCategories = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();
    if (!normalized) {
      return categories;
    }

    return categories.filter((category) => {
      const categoryName = String(category.name || "").toLowerCase();
      const categoryDescription = String(
        category.description || "",
      ).toLowerCase();
      return (
        categoryName.includes(normalized) ||
        categoryDescription.includes(normalized)
      );
    });
  }, [categories, searchQuery]);

  const handleCategorySelect = (categoryName) => {
    const selectedTier = new URLSearchParams(route.search).get("tier");

    if (selectedTier) {
      navigate(
        `/add-post?tier=${encodeURIComponent(selectedTier)}&category=${encodeURIComponent(categoryName)}`,
      );
      return;
    }

    navigate(`/all-posts?category=${encodeURIComponent(categoryName)}`);
  };

  const clearSearch = () => setSearchQuery("");

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-100 pb-24 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="mb-6 w-full max-w-6xl px-4 pt-8 md:pt-10 mx-auto">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 px-6 py-8 shadow-xl">
          <div className="relative z-10 mx-auto max-w-4xl">
            <button
              type="button"
              onClick={() => navigate("/all-posts")}
              className="mb-4 inline-flex items-center text-white/90 transition-colors hover:text-white"
            >
              <ArrowLeft className="mr-2 h-5 w-5" />
              {t("back_to_browse") || "Back to Browse"}
            </button>

            <h1 className="mb-2 text-3xl font-extrabold text-white md:text-4xl">
              {t("explore_categories") || "Explore Categories"}
            </h1>
            <p className="max-w-2xl text-base text-white/90 md:text-lg">
              {t("pick_category_to_jump") ||
                "Pick a category to jump directly to relevant listings."}
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-5 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t("search_categories") || "Search categories"}
              className="h-11 w-full rounded-lg border border-gray-200 bg-gray-50 pl-10 pr-20 text-gray-900 outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-blue-600 hover:text-blue-700"
              >
                {t("clear") || "Clear"}
              </button>
            ) : null}
          </div>
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
            <p className="mb-3 text-sm text-red-700 dark:text-red-300">
              {error}
            </p>
            <Button
              type="button"
              variant="outline"
              className="border-red-200 text-red-700"
              onClick={loadCategories}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {t("retry") || "Retry"}
            </Button>
          </div>
        ) : null}

        {loading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <Card
                key={`category-skeleton-${index}`}
                className="animate-pulse rounded-2xl border border-gray-200 p-5 dark:border-gray-700"
              >
                <div className="mb-3 h-12 w-12 rounded-xl bg-gray-200 dark:bg-gray-700" />
                <div className="mb-2 h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-3 w-full rounded bg-gray-200 dark:bg-gray-700" />
              </Card>
            ))}
          </div>
        ) : null}

        {!loading && filteredCategories.length === 0 ? (
          <Card className="rounded-2xl border border-blue-200 bg-blue-50 p-6 text-center dark:border-blue-900 dark:bg-blue-950/30">
            <h2 className="mb-2 text-lg font-semibold text-blue-900 dark:text-blue-200">
              {t("no_categories_match_search") ||
                "No categories match your search"}
            </h2>
            <p className="mb-4 text-sm text-blue-700 dark:text-blue-300">
              {t("try_broader_keyword") ||
                "Try a broader keyword or reset the search."}
            </p>
            <Button
              type="button"
              className="bg-blue-600 text-white hover:bg-blue-700"
              onClick={clearSearch}
            >
              {t("reset_search") || "Reset search"}
            </Button>
          </Card>
        ) : null}

        {!loading && filteredCategories.length > 0 ? (
          <>
            <h2 className="mb-6 text-xl font-bold text-gray-800 md:text-2xl dark:text-white">
              {t("popular_categories") || "Popular Categories"}
            </h2>

            <div className="mb-10 grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
              {filteredCategories.map((category, index) => {
                const Icon = CATEGORY_ICON_MAP[category.name] || Package;
                const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length];
                const key = toCategoryTranslationKey(category.name);

                return (
                  <Card
                    key={
                      category.category_id ||
                      category.id ||
                      category.name ||
                      index
                    }
                    onClick={() => handleCategorySelect(category.name)}
                    className="group cursor-pointer overflow-hidden rounded-2xl border border-gray-200 shadow-sm transition-all duration-300 hover:shadow-xl dark:border-gray-700"
                  >
                    <CardContent className="p-5 md:p-6">
                      <div
                        className={`mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg md:h-14 md:w-14 ${gradient}`}
                      >
                        <Icon className="h-6 w-6" />
                      </div>

                      <h3 className="mb-1 line-clamp-1 text-base font-bold text-gray-900 md:text-lg dark:text-white">
                        {t(key) || category.name}
                      </h3>

                      <p className="min-h-[2.25rem] line-clamp-2 text-xs text-gray-500 md:text-sm dark:text-gray-400">
                        {t("browse_listings_category") ||
                          category.description ||
                          "Browse listings in this category."}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="mt-8 text-center">
              <div className="rounded-2xl bg-gradient-to-r from-blue-100 to-indigo-100 p-6 shadow-lg md:p-8 dark:from-gray-800 dark:to-gray-700">
                <h3 className="mb-3 text-xl font-bold text-gray-800 md:text-2xl dark:text-white">
                  {t("need_broader_results") || "Need broader results?"}
                </h3>
                <p className="mb-5 text-sm text-gray-600 md:text-base dark:text-gray-300">
                  {t("open_marketplace_apply_filters") ||
                    "Open the complete marketplace and apply filters there."}
                </p>
                <Button
                  onClick={() => navigate("/all-posts")}
                  className="rounded-xl bg-blue-600 px-6 py-2 font-bold text-white shadow-lg hover:bg-blue-700 md:px-8 md:py-3"
                >
                  <ShoppingBag className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                  {t("browse_all_posts") || "Browse All Posts"}
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Search,
  Package,
  Plus,
  RefreshCw,
  Filter,
  Sparkles,
  ArrowRight,
} from "lucide-react";

/**
 * EmptyPostsState - Shown when no posts match the current filters
 * 
 * @param {Object} props
 * @param {string} props.variant - 'no-results' | 'empty-category' | 'empty-subcategory' | 'no-posts'
 * @param {string} props.categoryName - Current category name if applicable
 * @param {string} props.subcategoryName - Current subcategory name if applicable
 * @param {string} props.searchQuery - Current search query if applicable
 * @param {Function} props.onResetFilters - Callback to reset all filters
 * @param {Function} props.onRetry - Callback to retry fetching
 * @param {boolean} props.isAuthenticated - Whether user is logged in
 */
export default function EmptyPostsState({
  variant = "no-results",
  categoryName,
  subcategoryName,
  searchQuery,
  onResetFilters,
  onRetry,
  isAuthenticated = false,
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const tr = (key, fallback) => {
    const value = t(key);
    if (typeof value !== "string" || !value.trim() || value === key) {
      return fallback;
    }
    return value;
  };

  const getVariantConfig = () => {
    switch (variant) {
      case "empty-category":
        return {
          icon: Package,
          iconBg: "bg-amber-100 dark:bg-amber-900/30",
          iconColor: "text-amber-600 dark:text-amber-400",
          title: categoryName
            ? tr("no_posts_in_category", `No posts in ${categoryName} yet`)
            : tr("no_posts_category", "No posts in this category yet"),
          description: tr(
            "be_first_to_post_category",
            "Be the first to list something in this category! Your post could help others find what they need."
          ),
          showPostButton: true,
          showBrowseCategories: true,
        };

      case "empty-subcategory":
        return {
          icon: Filter,
          iconBg: "bg-indigo-100 dark:bg-indigo-900/30",
          iconColor: "text-indigo-600 dark:text-indigo-400",
          title: subcategoryName
            ? tr("no_posts_in_subcategory", `No posts in ${subcategoryName}`)
            : tr("no_posts_subcategory", "No posts in this subcategory"),
          description: tr(
            "try_different_subcategory",
            "Try selecting a different subcategory or browse all posts in this category."
          ),
          showPostButton: true,
          showBrowseCategories: false,
        };

      case "search-no-results":
        return {
          icon: Search,
          iconBg: "bg-blue-100 dark:bg-blue-900/30",
          iconColor: "text-blue-600 dark:text-blue-400",
          title: searchQuery
            ? tr("no_results_for_search", `No results for "${searchQuery}"`)
            : tr("no_search_results", "No results found"),
          description: tr(
            "try_different_keywords",
            "Try different keywords, check spelling, or browse categories to find what you're looking for."
          ),
          showPostButton: false,
          showBrowseCategories: true,
        };

      case "no-posts":
        return {
          icon: Sparkles,
          iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
          iconColor: "text-emerald-600 dark:text-emerald-400",
          title: tr("marketplace_empty", "The marketplace is waiting for you!"),
          description: tr(
            "be_first_to_list",
            "No posts yet. Be the first to list something and start the community!"
          ),
          showPostButton: true,
          showBrowseCategories: false,
        };

      default: // 'no-results'
        return {
          icon: Filter,
          iconBg: "bg-blue-100 dark:bg-blue-900/30",
          iconColor: "text-blue-600 dark:text-blue-400",
          title: tr("no_results", "No results for the current filters"),
          description: tr(
            "try_broader_search",
            "Try broadening search terms, changing category, or clearing filters."
          ),
          showPostButton: false,
          showBrowseCategories: true,
        };
    }
  };

  const config = getVariantConfig();
  const IconComponent = config.icon;

  return (
    <Card className="w-full max-w-2xl mx-auto border border-blue-200 dark:border-blue-900 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-gray-900 p-6 sm:p-8 text-center">
      {/* Icon */}
      <div className={`inline-flex p-4 rounded-full ${config.iconBg} mb-4`}>
        <IconComponent className={`w-8 h-8 sm:w-10 sm:h-10 ${config.iconColor}`} />
      </div>

      {/* Title */}
      <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-2">
        {config.title}
      </h3>

      {/* Description */}
      <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-6 max-w-md mx-auto">
        {config.description}
      </p>

      {/* Context badges */}
      {(categoryName || subcategoryName || searchQuery) && (
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {categoryName && (
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-medium">
              {tr("category", "Category")}: {categoryName}
            </span>
          )}
          {subcategoryName && (
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-medium">
              {tr("subcategory", "Subcategory")}: {subcategoryName}
            </span>
          )}
          {searchQuery && (
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium">
              {tr("search", "Search")}: &quot;{searchQuery}&quot;
            </span>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap justify-center gap-3">
        {/* Reset filters button */}
        {onResetFilters && (
          <Button
            type="button"
            variant="outline"
            className="border-blue-200 text-blue-700 hover:bg-blue-50"
            onClick={onResetFilters}
          >
            <RefreshCw className="w-4 h-4 mr-1.5" />
            {tr("reset_filters", "Reset filters")}
          </Button>
        )}

        {/* Browse subcategories button */}
        {config.showBrowseCategories && (
          <Button
            type="button"
            variant="outline"
            className="border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            onClick={() => navigate("/subcategories")}
          >
            <Package className="w-4 h-4 mr-1.5" />
            {tr("explore_subcategories", "Browse subcategories")}
          </Button>
        )}

        {/* Retry button */}
        {onRetry && (
          <Button
            type="button"
            variant="outline"
            className="border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            onClick={onRetry}
          >
            <RefreshCw className="w-4 h-4 mr-1.5" />
            {tr("retry", "Retry")}
          </Button>
        )}

        {/* Post something button - only for authenticated users */}
        {config.showPostButton && isAuthenticated && (
          <Button
            type="button"
            className="bg-blue-600 text-white hover:bg-blue-700"
            onClick={() => navigate("/post-welcome")}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            {tr("post_something", "Post something")}
          </Button>
        )}

        {/* Login prompt for non-authenticated users */}
        {config.showPostButton && !isAuthenticated && (
          <Button
            type="button"
            className="bg-blue-600 text-white hover:bg-blue-700"
            onClick={() => navigate("/login")}
          >
            {tr("login_to_post", "Login to post")}
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        )}
      </div>

      {/* Help text */}
      <p className="mt-6 text-xs text-gray-500 dark:text-gray-400">
        {tr(
          "need_help_finding",
          "Need help finding something specific? Try our"
        )}{" "}
        <button
          type="button"
          className="text-blue-600 hover:underline font-medium"
          onClick={() => navigate("/search")}
        >
          {tr("advanced_search", "advanced search")}
        </button>
      </p>
    </Card>
  );
}

/**
 * LoadingErrorState - Shown when posts fail to load
 */
export function LoadingErrorState({ errorMessage, onRetry, onResetFilters }) {
  const { t } = useTranslation();

  const tr = (key, fallback) => {
    const value = t(key);
    if (typeof value !== "string" || !value.trim() || value === key) {
      return fallback;
    }
    return value;
  };

  return (
    <Card className="w-full max-w-2xl mx-auto border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-6 sm:p-8 text-center">
      <div className="inline-flex p-4 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
        <svg
          className="w-8 h-8 text-red-600 dark:text-red-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>

      <h3 className="text-lg sm:text-xl font-bold text-red-900 dark:text-red-200 mb-2">
        {tr("error_loading_posts", "Unable to load posts")}
      </h3>

      <p className="text-sm text-red-700 dark:text-red-300 mb-6 max-w-md mx-auto">
        {errorMessage ||
          tr(
            "error_try_again",
            "Something went wrong. Please try again or check your connection."
          )}
      </p>

      <div className="flex flex-wrap justify-center gap-3">
        {onRetry && (
          <Button
            type="button"
            className="bg-red-600 text-white hover:bg-red-700"
            onClick={onRetry}
          >
            <RefreshCw className="w-4 h-4 mr-1.5" />
            {tr("retry", "Retry")}
          </Button>
        )}
        {onResetFilters && (
          <Button
            type="button"
            variant="outline"
            className="border-red-200 text-red-700"
            onClick={onResetFilters}
          >
            {tr("reset_filters", "Reset filters")}
          </Button>
        )}
      </div>
    </Card>
  );
}

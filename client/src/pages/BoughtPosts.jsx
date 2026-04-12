import React, { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft as BackIcon, ShoppingBag } from "lucide-react";
import { navigateBack } from "@/utils/navigation";
import { useAuth } from "@/context/AuthContext";
import { useCategoryMode } from "@/context/CategoryModeContext";
import api from "@/lib/api";
import { hasAuthSession, getUserId as getStoredUserId } from "@/utils/authStorage";
import {
  buildActiveAppMatcher,
  matchesCategoryModeItem,
} from "@/utils/categoryModeFilters";
const BoughtPosts = () => {
  const { t: translate } = useTranslation(),
    navigate = useNavigate(),
    { user: currentUser, loading: authLoading } = useAuth(),
    {
      activeCategory: categoryModeCategory,
      activeApp,
      hasSelection: hasCategoryMode,
      categories: categoryModeCategories,
    } = useCategoryMode(),
    [posts, setPosts] = useState([]),
    [isLoading, setIsLoading] = useState(!0),
    [errorMessage, setErrorMessage] = useState(""),
    [refreshCounter, setRefreshCounter] = useState(0),
    accessToken = hasAuthSession(),
    userId = getStoredUserId(currentUser),
    isAuthenticated = useMemo(() => !!(currentUser || (accessToken && userId)), [currentUser, accessToken, userId]),
    categoryModeCategoryId = useMemo(() => {
      if (!hasCategoryMode || !categoryModeCategory?.name) return null;
      if (categoryModeCategory?.id) return String(categoryModeCategory.id);
      const normalized = String(categoryModeCategory.name)
        .trim()
        .toLowerCase();
      const match = (Array.isArray(categoryModeCategories)
        ? categoryModeCategories
        : []
      ).find((item) => {
        const name = String(
          item?.name || item?.title || item?.label || item?.category_name || "",
        )
          .trim()
          .toLowerCase();
        return name === normalized;
      });
      const id = match?.category_id || match?.id;
      return id ? String(id) : null;
    }, [
      hasCategoryMode,
      categoryModeCategory?.id,
      categoryModeCategory?.name,
      categoryModeCategories,
    ]),
    activeAppMatcher = useMemo(
      () => buildActiveAppMatcher(activeApp, categoryModeCategories),
      [activeApp, categoryModeCategories],
    ),
    filteredPosts = useMemo(() => {
      return posts.filter((post) =>
        matchesCategoryModeItem(post, {
          activeCategory: hasCategoryMode ? categoryModeCategory : null,
          activeCategoryId: categoryModeCategoryId,
          activeAppMatcher,
        }),
      );
    }, [
      posts,
      hasCategoryMode,
      categoryModeCategory,
      categoryModeCategoryId,
      activeAppMatcher,
    ]);
  return (
    useEffect(() => {
      if (authLoading) return;
      if (!isAuthenticated || !userId) {
        setIsLoading(!1), setPosts([]), setErrorMessage("");
        return;
      }
      let cancelled = !1;
      return (
        (async () => {
          setIsLoading(!0), setErrorMessage("");
          try {
            const response = await api.get("/posts/mine", {
              params: {
                userId: userId,
                limit: 100,
                page: 1,
                sortBy: "created_at",
                sortOrder: "desc",
                ...(categoryModeCategoryId
                  ? { category: categoryModeCategoryId }
                  : {}),
              },
            });
            if (cancelled) return;
            const responseData = response?.data ?? response,
              boughtPosts = (Array.isArray(responseData?.posts) ? responseData.posts : []).filter(
                (post) => String(post?.ownership || "").toLowerCase() === "bought",
              );
            setPosts(boughtPosts);
          } catch (err) {
            cancelled ||
              (setErrorMessage(err.message || translate("error") || "Failed to load bought posts"),
              setPosts([]));
          } finally {
            cancelled || setIsLoading(!1);
          }
        })(),
        () => {
          cancelled = !0;
        }
      );
    }, [authLoading, isAuthenticated, refreshCounter, translate, userId, categoryModeCategoryId]),
    authLoading
      ? React.createElement(
          "div",
          { className: "text-center py-10 dark:text-center" },
          translate("loading") || "Loading...",
        )
      : isAuthenticated
        ? React.createElement(
            "div",
            {
              className:
                "mhub-premium-page bg-white min-h-screen mhub-page-pad-bottom flex flex-col items-center transition-colors duration-300 dark:bg-slate-900",
            },
            React.createElement(
              "div",
              { className: "w-full max-w-3xl mx-auto px-4 py-5 page-shell page-pad" },
              React.createElement(
                "div",
                { className: "mb-4 mhub-hero-card rounded-2xl px-4 py-4 sm:px-6 sm:py-5 text-left" },
                React.createElement(
                  "div",
                  { className: "flex flex-wrap items-center justify-between gap-4 min-h-[34px]" },
                  React.createElement(
                    "button",
                    {
                      type: "button",
                      onClick: () => navigateBack(navigate),
                      className:
                        "inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-white transition dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-slate-200",
                      "aria-label": translate("back") || "Back",
                    },
                    React.createElement(BackIcon, { className: "w-4 h-4" }),
                    translate("back") || "Back",
                  ),
                  React.createElement(
                    "button",
                    {
                      type: "button",
                      onClick: () => setRefreshCounter((prev) => prev + 1),
                      className:
                        "inline-flex items-center rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-white transition dark:border-slate-700/60 dark:bg-slate-900/50 dark:text-slate-200",
                      "aria-label": translate("refresh") || "Refresh",
                    },
                    translate("refresh") || "Refresh",
                  ),
                ),
                React.createElement(
                  "div",
                  { className: "mt-3" },
                  React.createElement(
                    "p",
                    {
                      className:
                        "text-[clamp(9px,0.95vw,11px)] font-semibold uppercase tracking-[0.2em] text-slate-500 mb-1 dark:text-slate-400",
                    },
                    translate("purchases_label") || "Purchases",
                  ),
                  React.createElement(
                    "div",
                    { className: "flex items-center gap-3" },
                    React.createElement(
                      "div",
                      {
                        className:
                          "w-10 h-10 rounded-xl bg-slate-900/5 backdrop-blur-sm flex items-center justify-center dark:bg-slate-900/40",
                      },
                      React.createElement(ShoppingBag, { className: "w-5 h-5 text-slate-700 dark:text-slate-200" }),
                    ),
                    React.createElement(
                      "h2",
                      {
                        className:
                          "text-[clamp(20px,2.1vw,28px)] leading-[1.1] font-bold text-slate-900 dark:text-white",
                      },
                      translate("bought_posts") || "Bought Posts",
                    ),
                  ),
                  React.createElement(
                    "p",
                    {
                      className:
                        "text-[clamp(12px,1.3vw,16px)] leading-[1.5] text-slate-600 mt-1 dark:text-slate-300",
                    },
                    translate("bought_posts_subtitle") ||
                      "Keep track of items you purchased and revisit listings.",
                  ),
                ),
              ),
              hasCategoryMode &&
                categoryModeCategory?.name &&
                React.createElement(
                  "div",
                  {
                    className:
                      "mb-4 mhub-premium-surface rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3",
                  },
                  React.createElement(
                    "div",
                    null,
                    React.createElement(
                      "p",
                      {
                        className:
                          "text-sm font-semibold text-slate-900 dark:text-white dark:text-slate-100",
                      },
                      "Category mode: ",
                      categoryModeCategory.name,
                    ),
                    React.createElement(
                      "p",
                      {
                        className:
                          "text-xs text-slate-500 dark:text-slate-400 dark:text-slate-300",
                      },
                      "Bought posts are filtered to this category.",
                    ),
                  ),
                  React.createElement(
                    Button,
                    {
                      type: "button",
                      variant: "outline",
                      className: "border-indigo-200 text-indigo-700 w-fit dark:border-indigo-600/40 dark:text-indigo-300",
                      onClick: () => navigate("/category-mode"),
                    },
                    "Switch category",
                  ),
                ),
              isLoading
                ? React.createElement(
                    "div",
                    { className: "space-y-3" },
                    Array.from({ length: 3 }).map((_, idx) =>
                      React.createElement(
                        "div",
                        {
                          key: `bought-skeleton-${idx}`,
                          className:
                            "rounded-xl border border-gray-200 dark:border-gray-700 p-4 animate-pulse dark:border",
                        },
                        React.createElement("div", {
                          className:
                            "h-5 w-2/3 bg-gray-200 dark:bg-gray-700 rounded mb-2 dark:bg-gray-900",
                        }),
                        React.createElement("div", {
                          className:
                            "h-4 w-full bg-gray-200 dark:bg-gray-700 rounded mb-2 dark:bg-gray-900",
                        }),
                        React.createElement("div", {
                          className:
                            "h-4 w-1/3 bg-gray-200 dark:bg-gray-700 rounded dark:bg-gray-900",
                        }),
                      ),
                    ),
                  )
                : errorMessage
                  ? React.createElement(
                      "div",
                      {
                        className:
                          "rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 p-4 dark:border dark:border-red-600/40 dark:bg-red-950/20",
                      },
                      React.createElement(
                        "p",
                        {
                          className:
                            "text-sm text-red-700 dark:text-red-300 mb-3",
                        },
                        errorMessage,
                      ),
                      React.createElement(
                        "div",
                        { className: "flex flex-wrap gap-2" },
                        React.createElement(
                          Button,
                          {
                            type: "button",
                            className: "bg-red-600 text-white hover:bg-red-700 dark:bg-red-700/40 dark:text-white dark:hover:bg-red-700/40",
                            onClick: () => setRefreshCounter((prev) => prev + 1),
                          },
                          "Retry",
                        ),
                        React.createElement(
                          Button,
                          {
                            type: "button",
                            variant: "outline",
                            onClick: () => navigate("/all-posts"),
                          },
                          "Browse posts",
                        ),
                      ),
                    )
                  : filteredPosts.length === 0
                    ? React.createElement(
                        "div",
                        { className: "mt-4 min-h-[28vh] flex items-start justify-center" },
                        React.createElement(
                          "div",
                          {
                            className:
                              "w-full rounded-2xl border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-900 p-6 text-center dark:border dark:border-blue-600/40 dark:bg-blue-950/20 dark:text-center",
                          },
                          React.createElement(
                            "p",
                            {
                              className:
                                "text-blue-900 dark:text-blue-200 font-semibold mb-2",
                            },
                            hasCategoryMode && categoryModeCategory?.name
                              ? `No bought posts in ${categoryModeCategory.name} yet`
                              : translate("bought_posts_empty_title") ||
                                "No bought posts yet",
                          ),
                          React.createElement(
                            "p",
                            {
                              className:
                                "text-sm text-blue-700 dark:text-blue-300 mb-4",
                            },
                            hasCategoryMode && categoryModeCategory?.name
                              ? `Bought posts are filtered to ${categoryModeCategory.name}. Switch category to see more.`
                              : translate("bought_posts_empty_hint") ||
                                "Once you complete purchases, they will appear here.",
                          ),
                          React.createElement(
                            "div",
                            { className: "flex flex-wrap justify-center gap-2" },
                            React.createElement(
                              Button,
                              {
                                type: "button",
                                className:
                                  "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700/40 dark:text-white dark:hover:bg-blue-700/40",
                                onClick: () => navigate("/all-posts"),
                              },
                              translate("browse_listings") || "Explore listings",
                            ),
                            hasCategoryMode &&
                              categoryModeCategory?.name &&
                              React.createElement(
                                Button,
                                {
                                  type: "button",
                                  variant: "outline",
                                  className: "border-indigo-200 text-indigo-700 dark:border-indigo-600/40 dark:text-indigo-300",
                                  onClick: () => navigate("/category-mode"),
                                },
                                "Switch category",
                              ),
                          ),
                        ),
                      )
                    : React.createElement(
                        "div",
                        { className: "flex flex-col gap-4" },
                        filteredPosts.map((post, idx) =>
                          React.createElement(
                            "div",
                            {
                              key: post.post_id || post.id || idx,
                              className:
                                "mhub-premium-surface rounded-xl p-4",
                            },
                            React.createElement(
                              "h3",
                              {
                                className:
                                  "font-bold text-lg text-gray-900 dark:text-white dark:text-gray-100",
                              },
                              post.title || "Untitled post",
                            ),
                            React.createElement(
                              "p",
                              {
                                className:
                                  "text-gray-500 dark:text-gray-400 text-sm line-clamp-2 dark:text-gray-300",
                              },
                              post.description || "No description available.",
                            ),
                            React.createElement(
                              "div",
                              { className: "flex items-center gap-2 mt-2" },
                              React.createElement(
                                "span",
                                {
                                  className:
                                    "text-green-600 dark:text-green-400 font-bold dark:text-green-300",
                                },
                                "Rs ",
                                Number(post.price || 0).toLocaleString(),
                              ),
                              React.createElement(
                                Badge,
                                { className: "bg-blue-100 text-blue-700 dark:bg-blue-950/20 dark:text-blue-300" },
                                post.status || "Bought",
                              ),
                            ),
                            React.createElement(
                              Button,
                              {
                                type: "button",
                                variant: "link",
                                className: "mt-2 p-0 h-auto text-blue-600 dark:text-blue-300",
                                onClick: () => navigate(`/post/${post.post_id || post.id}`),
                              },
                              translate("view_details") || "View details",
                            ),
                          ),
                        ),
                      ),
            ),
          )
        : React.createElement(
            "div",
            {
              className:
                "min-h-screen flex items-center justify-center mhub-premium-page mhub-page-pad-bottom bg-white px-4 dark:bg-slate-900",
            },
            React.createElement(
              "div",
              { className: "text-center max-w-md dark:text-center" },
              React.createElement(
                "h2",
                {
                  className:
                    "text-2xl font-bold text-gray-900 dark:text-white mb-3 dark:text-gray-100",
                },
                translate("bought_posts") || "Bought Posts",
              ),
              React.createElement(
                "p",
                { className: "text-gray-500 dark:text-gray-400 mb-6 dark:text-gray-300" },
                translate("please_login_view") ||
                  "Please log in to view your bought posts.",
              ),
              React.createElement(
                "div",
                { className: "flex flex-col gap-3" },
                React.createElement(
                  Link,
                  {
                    to: "/login",
                    className:
                      "bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold dark:bg-blue-700/40 dark:hover:bg-blue-700/40 dark:text-white",
                  },
                  translate("login") || "Login",
                ),
                React.createElement(
                  Link,
                  {
                    to: "/signup",
                    className:
                      "border border-blue-300 text-blue-600 py-3 rounded-xl font-semibold dark:border dark:border-blue-600/40 dark:text-blue-300",
                  },
                  translate("signup") || "Create Account",
                ),
              ),
            ),
          )
  );
};
var BoughtPostsDefault = BoughtPosts;
export { BoughtPostsDefault as default };

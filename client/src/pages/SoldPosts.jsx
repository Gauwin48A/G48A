import e, { useEffect as L, useMemo as P, useState as d } from "react";
import { Badge as S } from "@/components/ui/badge";
import { Button as o } from "@/components/ui/button";
import { useTranslation as _ } from "react-i18next";
import { Link as k, useNavigate as C } from "react-router-dom";
import { ArrowLeft as BackIcon } from "lucide-react";
import { navigateBack } from "@/utils/navigation";
import { useAuth as A } from "@/context/AuthContext";
import { useCategoryMode } from "@/context/CategoryModeContext";
import T from "@/lib/api";
import { getAccessToken as E, getUserId as I } from "@/utils/authStorage";
import {
  buildActiveAppMatcher,
  matchesCategoryModeItem,
} from "@/utils/categoryModeFilters";
const U = () => {
  const { t: s } = _(),
    i = C(),
    { user: n, loading: m } = A(),
    {
      activeCategory: categoryModeCategory,
      activeApp,
      hasSelection: hasCategoryMode,
      categories: categoryModeCategories,
    } = useCategoryMode(),
    [x, g] = d([]),
    [h, u] = d(!0),
    [c, b] = d(""),
    [N, f] = d(0),
    y = E(),
    r = I(n),
    p = P(() => !!(n || (y && r)), [n, y, r]),
    categoryModeCategoryId = P(() => {
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
    activeAppMatcher = P(
      () => buildActiveAppMatcher(activeApp, categoryModeCategories),
      [activeApp, categoryModeCategories],
    ),
    B = P(() => {
      return x.filter((t) =>
        matchesCategoryModeItem(t, {
          activeCategory: hasCategoryMode ? categoryModeCategory : null,
          activeCategoryId: categoryModeCategoryId,
          activeAppMatcher,
        }),
      );
    }, [
      x,
      hasCategoryMode,
      categoryModeCategory,
      categoryModeCategoryId,
      activeAppMatcher,
    ]);
  return (
    L(() => {
      if (m) return;
      if (!p || !r) {
        u(!1), g([]), b("");
        return;
      }
      let t = !1;
      return (
        (async () => {
          u(!0), b("");
          try {
            const l = await T.get("/posts/mine", {
              params: {
                userId: r,
                status: "sold",
                limit: 100,
                page: 1,
                sortBy: "updated_at",
                sortOrder: "desc",
                ...(categoryModeCategoryId
                  ? { category: categoryModeCategoryId }
                  : {}),
              },
            });
            if (t) return;
            const v = l?.data ?? l,
              w = (Array.isArray(v?.posts) ? v.posts : []).filter(
                (B) => String(B?.ownership || "own").toLowerCase() !== "bought",
              );
            g(w);
          } catch (l) {
            t ||
              (b(l.message || s("error") || "Failed to load sold posts"),
              g([]));
          } finally {
            t || u(!1);
          }
        })(),
        () => {
          t = !0;
        }
      );
    }, [m, p, N, s, r, categoryModeCategoryId]),
    m
      ? e.createElement(
          "div",
          { className: "text-center py-10 dark:text-center" },
          s("loading") || "Loading...",
        )
      : p
        ? e.createElement(
            "div",
            {
              className:
                "mhub-premium-page bg-white min-h-screen flex flex-col items-center transition-colors duration-300 dark:bg-slate-900",
            },
            e.createElement(
              "div",
              { className: "w-full max-w-2xl mx-auto py-6 px-4 page-shell page-pad" },
              e.createElement(
                "div",
                { className: "flex items-center justify-between gap-2 mb-4" },
                e.createElement(
                  "div",
                  { className: "flex items-center gap-2" },
                  e.createElement(
                    o,
                    {
                      type: "button",
                      variant: "ghost",
                      size: "sm",
                      onClick: () => navigateBack(i),
                    },
                    e.createElement(BackIcon, { className: "w-4 h-4 mr-1" }),
                    s("back") || "Back",
                  ),
                  e.createElement(
                    "h2",
                    {
                      className:
                        "text-2xl font-bold text-gray-900 dark:text-white dark:text-2xl dark:text-gray-100",
                    },
                    s("sold_posts") || "Sold Posts",
                  ),
                ),
                e.createElement(
                  o,
                  {
                    type: "button",
                    variant: "outline",
                    onClick: () => f((t) => t + 1),
                  },
                  s("refresh") || "Refresh",
                ),
              ),
              hasCategoryMode &&
                categoryModeCategory?.name &&
                e.createElement(
                  "div",
                  {
                    className:
                      "mb-4 mhub-premium-surface rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3",
                  },
                  e.createElement(
                    "div",
                    null,
                    e.createElement(
                      "p",
                      {
                        className:
                          "text-sm font-semibold text-slate-900 dark:text-white dark:text-sm dark:text-slate-100",
                      },
                      "Category mode: ",
                      categoryModeCategory.name,
                    ),
                    e.createElement(
                      "p",
                      {
                        className:
                          "text-xs text-slate-500 dark:text-slate-400 dark:text-xs dark:text-slate-300",
                      },
                      "Sold posts are filtered to this category.",
                    ),
                  ),
                  e.createElement(
                    o,
                    {
                      type: "button",
                      variant: "outline",
                      className: "border-indigo-200 text-indigo-700 w-fit dark:border-indigo-600/40 dark:text-indigo-300",
                      onClick: () => i("/category-mode"),
                    },
                    "Switch category",
                  ),
                ),
              h
                ? e.createElement(
                    "div",
                    { className: "space-y-3" },
                    Array.from({ length: 3 }).map((t, a) =>
                      e.createElement(
                        "div",
                        {
                          key: `sold-skeleton-${a}`,
                          className:
                            "rounded-xl border border-gray-200 dark:border-gray-700 p-4 animate-pulse dark:border",
                        },
                        e.createElement("div", {
                          className:
                            "h-5 w-2/3 bg-gray-200 dark:bg-gray-700 rounded mb-2 dark:bg-gray-900",
                        }),
                        e.createElement("div", {
                          className:
                            "h-4 w-full bg-gray-200 dark:bg-gray-700 rounded mb-2 dark:bg-gray-900",
                        }),
                        e.createElement("div", {
                          className:
                            "h-4 w-1/3 bg-gray-200 dark:bg-gray-700 rounded dark:bg-gray-900",
                        }),
                      ),
                    ),
                  )
                : c
                  ? e.createElement(
                      "div",
                      {
                        className:
                          "rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 p-4 dark:border dark:border-red-600/40 dark:bg-red-950/20",
                      },
                      e.createElement(
                        "p",
                        {
                          className:
                            "text-sm text-red-700 dark:text-red-300 mb-3 dark:text-sm",
                        },
                        c,
                      ),
                      e.createElement(
                        "div",
                        { className: "flex flex-wrap gap-2" },
                        e.createElement(
                          o,
                          {
                            type: "button",
                            className: "bg-red-600 text-white hover:bg-red-700 dark:bg-red-700/40 dark:text-white dark:hover:bg-red-700/40",
                            onClick: () => f((t) => t + 1),
                          },
                          s("retry") || "Retry",
                        ),
                        e.createElement(
                          o,
                          {
                            type: "button",
                            variant: "outline",
                            onClick: () => i("/all-posts"),
                          },
                          s("browse_posts") || "Browse posts",
                        ),
                      ),
                    )
                  : B.length === 0
                    ? e.createElement(
                        "div",
                        {
                          className:
                            "rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-900 p-6 text-center dark:border dark:border-blue-600/40 dark:bg-blue-950/20 dark:text-center",
                        },
                        e.createElement(
                          "p",
                          {
                            className:
                              "text-blue-900 dark:text-blue-200 font-semibold mb-2",
                          },
                          hasCategoryMode && categoryModeCategory?.name
                            ? `No sold posts in ${categoryModeCategory.name} yet`
                            : s("sold_posts_empty_title") ||
                              s("no_posts_yet") ||
                              "No sold posts yet",
                        ),
                        e.createElement(
                          "p",
                          {
                            className:
                              "text-sm text-blue-700 dark:text-blue-300 mb-4 dark:text-sm",
                          },
                          hasCategoryMode && categoryModeCategory?.name
                            ? `Sold posts are filtered to ${categoryModeCategory.name}. Switch category to see more.`
                            : s("sold_posts_empty_hint") ||
                              "Marking sold listings will keep your completed sales history here.",
                        ),
                        e.createElement(
                          "div",
                          { className: "flex flex-wrap justify-center gap-2" },
                          e.createElement(
                            o,
                            {
                              type: "button",
                              className:
                                "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700/40 dark:text-white dark:hover:bg-blue-700/40",
                              onClick: () => i("/all-posts"),
                            },
                            s("browse_listings") || "Explore listings",
                          ),
                          hasCategoryMode &&
                            categoryModeCategory?.name &&
                            e.createElement(
                              o,
                              {
                                type: "button",
                                variant: "outline",
                                className: "border-indigo-200 text-indigo-700 dark:border-indigo-600/40 dark:text-indigo-300",
                                onClick: () => i("/category-mode"),
                              },
                              "Switch category",
                            ),
                        ),
                      )
                    : e.createElement(
                        "div",
                        { className: "flex flex-col gap-4" },
                        B.map((t, a) =>
                          e.createElement(
                            "div",
                            {
                              key: t.post_id || t.id || a,
                              className:
                                "mhub-premium-surface rounded-xl p-4",
                            },
                            e.createElement(
                              "h3",
                              {
                                className:
                                  "font-bold text-lg text-gray-900 dark:text-white dark:text-lg dark:text-gray-100",
                              },
                              t.title || s("untitled_post") || "Untitled post",
                            ),
                            e.createElement(
                              "p",
                              {
                                className:
                                  "text-gray-500 dark:text-gray-400 text-sm line-clamp-2 dark:text-gray-300 dark:text-sm",
                              },
                              t.description ||
                                s("no_description") ||
                                "No description available.",
                            ),
                            e.createElement(
                              "div",
                              { className: "flex items-center gap-2 mt-2" },
                              e.createElement(
                                "span",
                                {
                                  className:
                                    "text-green-600 dark:text-green-400 font-bold dark:text-green-300",
                                },
                                "Rs ",
                                Number(t.price || 0).toLocaleString(),
                              ),
                              e.createElement(
                                S,
                                { className: "bg-green-100 text-green-700 dark:bg-green-950/20 dark:text-green-300" },
                                t.status || s("sold") || "Sold",
                              ),
                            ),
                            e.createElement(
                              o,
                              {
                                type: "button",
                                variant: "link",
                                className: "mt-2 p-0 h-auto text-blue-600 dark:text-blue-300",
                                onClick: () =>
                                  i(`/post/${t.post_id || t.id}`, {
                                    state: { fromMyPosts: true },
                                  }),
                              },
                              s("view_details") || "View details",
                            ),
                          ),
                        ),
                      ),
            ),
          )
        : e.createElement(
            "div",
            {
              className:
                "min-h-screen flex items-center justify-center mhub-premium-page bg-white px-4 dark:bg-slate-900",
            },
            e.createElement(
              "div",
              { className: "text-center max-w-md dark:text-center" },
              e.createElement(
                "h2",
                {
                  className:
                    "text-2xl font-bold text-gray-900 dark:text-white mb-3 dark:text-2xl dark:text-gray-100",
                },
                s("sold_posts") || "Sold Posts",
              ),
              e.createElement(
                "p",
                { className: "text-gray-500 dark:text-gray-400 mb-6 dark:text-gray-300" },
                s("please_login_view") ||
                  "Please log in to view your sold posts.",
              ),
              e.createElement(
                "div",
                { className: "flex flex-col gap-3" },
                e.createElement(
                  k,
                  {
                    to: "/login",
                    className:
                      "bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold dark:bg-blue-700/40 dark:hover:bg-blue-700/40 dark:text-white",
                  },
                  s("login") || "Login",
                ),
                e.createElement(
                  k,
                  {
                    to: "/signup",
                    className:
                      "border border-blue-300 text-blue-600 py-3 rounded-xl font-semibold dark:border dark:border-blue-600/40 dark:text-blue-300",
                  },
                  s("signup") || "Create Account",
                ),
              ),
            ),
          )
  );
};
var G = U;
export { G as default };

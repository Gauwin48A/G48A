import e, { useEffect as L, useMemo as P, useState as d } from "react";
import { Badge as S } from "@/components/ui/badge";
import { Button as o } from "@/components/ui/button";
import { useTranslation as _ } from "react-i18next";
import { Link as k, useNavigate as C } from "react-router-dom";
import { ArrowLeft as BackIcon, CheckCircle } from "lucide-react";
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
                "mhub-premium-page bg-white min-h-screen mhub-page-pad-bottom flex flex-col items-center transition-colors duration-300 dark:bg-slate-900",
            },
            e.createElement(
              "div",
              { className: "w-full max-w-3xl mx-auto px-4 py-5 page-shell page-pad" },
              e.createElement(
                "div",
                { className: "mb-4 mhub-hero-card rounded-2xl px-4 py-4 sm:px-6 sm:py-5 text-left" },
                e.createElement(
                  "div",
                  { className: "flex flex-wrap items-center justify-between gap-4 min-h-[34px]" },
                  e.createElement(
                    "button",
                    {
                      type: "button",
                      onClick: () => navigateBack(i),
                      className:
                        "inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-white transition dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-slate-200",
                      "aria-label": s("back") || "Back",
                    },
                    e.createElement(BackIcon, { className: "w-4 h-4" }),
                    s("back") || "Back",
                  ),
                  e.createElement(
                    "button",
                    {
                      type: "button",
                      onClick: () => f((t) => t + 1),
                      className:
                        "inline-flex items-center rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-white transition dark:border-slate-700/60 dark:bg-slate-900/50 dark:text-slate-200",
                      "aria-label": s("refresh") || "Refresh",
                    },
                    s("refresh") || "Refresh",
                  ),
                ),
                e.createElement(
                  "div",
                  { className: "mt-3" },
                  e.createElement(
                    "p",
                    {
                      className:
                        "text-[clamp(9px,0.95vw,11px)] font-semibold uppercase tracking-[0.2em] text-slate-500 mb-1 dark:text-slate-400",
                    },
                    s("sales_history") || "Sales history",
                  ),
                  e.createElement(
                    "div",
                    { className: "flex items-center gap-3" },
                    e.createElement(
                      "div",
                      {
                        className:
                          "w-10 h-10 rounded-xl bg-slate-900/5 backdrop-blur-sm flex items-center justify-center dark:bg-slate-900/40",
                      },
                      e.createElement(CheckCircle, { className: "w-5 h-5 text-slate-700 dark:text-slate-200" }),
                    ),
                    e.createElement(
                      "h2",
                      {
                        className:
                          "text-[clamp(20px,2.1vw,28px)] leading-[1.1] font-bold text-slate-900 dark:text-white",
                      },
                      s("sold_posts") || "Sold Posts",
                    ),
                  ),
                  e.createElement(
                    "p",
                    {
                      className:
                        "text-[clamp(12px,1.3vw,16px)] leading-[1.5] text-slate-600 mt-1 dark:text-slate-300",
                    },
                    s("sold_posts_subtitle") ||
                      "Track completed sales and revisit receipts.",
                  ),
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
                          "text-sm font-semibold text-slate-900 dark:text-white dark:text-slate-100",
                      },
                      "Category mode: ",
                      categoryModeCategory.name,
                    ),
                    e.createElement(
                      "p",
                      {
                        className:
                          "text-xs text-slate-500 dark:text-slate-400 dark:text-slate-300",
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
                            "text-sm text-red-700 dark:text-red-300 mb-3",
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
                        { className: "mt-4 min-h-[28vh] flex items-start justify-center" },
                        e.createElement(
                          "div",
                          {
                            className:
                              "w-full rounded-2xl border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-900 p-6 text-center dark:border dark:border-blue-600/40 dark:bg-blue-950/20 dark:text-center",
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
                                "text-sm text-blue-700 dark:text-blue-300 mb-4",
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
                                  "font-bold text-lg text-gray-900 dark:text-white dark:text-gray-100",
                              },
                              t.title || s("untitled_post") || "Untitled post",
                            ),
                            e.createElement(
                              "p",
                              {
                                className:
                                  "text-gray-500 dark:text-gray-400 text-sm line-clamp-2 dark:text-gray-300",
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
                "min-h-screen flex items-center justify-center mhub-premium-page mhub-page-pad-bottom bg-white px-4 dark:bg-slate-900",
            },
            e.createElement(
              "div",
              { className: "text-center max-w-md dark:text-center" },
              e.createElement(
                "h2",
                {
                  className:
                    "text-2xl font-bold text-gray-900 dark:text-white mb-3 dark:text-gray-100",
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

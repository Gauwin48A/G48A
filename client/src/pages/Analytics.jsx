import e, {
  useState as p,
  useEffect as Z,
  useCallback as R,
  useMemo as c,
  useRef as ee,
} from "react";
import {
  Card as A,
  CardContent as P,
  CardHeader as U,
  CardTitle as M,
} from "@/components/ui/card";
import { Button as n } from "@/components/ui/button";
import { Badge as B } from "@/components/ui/badge";
import {
  Alert as O,
  AlertDescription as V,
  AlertTitle as $,
} from "@/components/ui/alert";
import {
  AlertTriangle as te,
  ArrowLeft as se,
  BarChart3 as ae,
  Calendar as re,
  DollarSign as le,
  Eye as ie,
  MessageCircle as H,
  Package as F,
  RefreshCw as oe,
  ShoppingCart as ne,
  Star as de,
  TrendingUp as K,
} from "lucide-react";
import { Link as y, useNavigate as me } from "react-router-dom";
import _ from "../lib/api";
import { useCategoryMode } from "@/context/CategoryModeContext";
import { navigateBack } from "@/utils/navigation";
import {
  buildActiveAppMatcher,
  matchesCategoryModeItem,
} from "@/utils/categoryModeFilters";
import { useTranslation as pe } from "react-i18next";
const D = [
    { value: "7d", label: "7D", days: 7 },
    { value: "30d", label: "30D", days: 30 },
    { value: "90d", label: "90D", days: 90 },
    { value: "all", label: "All time", days: null },
  ],
  ue = (r, tr) => {
    const l = Number(r?.status || r?.response?.status || 0),
      a = String(r?.message || "").toLowerCase();
    return l === 401 ||
      l === 403 ||
      a.includes("authentication") ||
      a.includes("session")
      ? tr
        ? tr(
            "analytics_auth_error",
            "Your session does not have analytics access. Please sign in again.",
          )
        : "Your session does not have analytics access. Please sign in again."
      : tr
        ? tr(
            "analytics_unavailable",
            "Analytics is temporarily unavailable. Please retry.",
          )
        : "Analytics is temporarily unavailable. Please retry.";
  },
  i = (r) => Number(r || 0).toLocaleString(),
  G = (r, tr) =>
    `${tr ? tr("currency_inr", "INR") : "INR"} ${Number(r || 0).toLocaleString()}`,
  ge = (r, tr) => {
    if (!r) return tr ? tr("unknown_date", "Unknown date") : "Unknown date";
    const l = new Date(r);
    return Number.isNaN(l.getTime())
      ? tr
        ? tr("unknown_date", "Unknown date")
        : "Unknown date"
      : l.toLocaleDateString();
  },
  ce = (r) => {
    const l = D.find((N) => N.value === r);
    if (!l || l.days === null) return null;
    const a = new Date();
    return a.setHours(0, 0, 0, 0), a.setDate(a.getDate() - (l.days - 1)), a;
  },
  AnalyticsPage = () => {
    const r = me(),
      { t: o } = pe(),
      tr = R((key, fallback, options = {}) => o(key, { defaultValue: fallback, ...options }), [o]),
      timeRanges = c(
        () =>
          D.map((range) => ({
            ...range,
            label: tr(`analytics_range_${range.value}`, range.label),
          })),
        [tr],
      ),
      l = ee(0),
      [a, N] = p(null),
      [u, Y] = p([]),
      [x, J] = p([]),
      [S, T] = p(!0),
      [L, q] = p(""),
      [v, w] = p("30d"),
    b = R(async () => {
        const t = ++l.current;
        T(!0);
        try {
          const [
            sellerStatsResult,
            legacyOverviewResult,
            postsResult,
            categoriesResult,
          ] = await Promise.allSettled([
            _.get("/seller-analytics/stats"),
            _.get("/analytics/seller"),
            _.get("/analytics/posts"),
            _.get("/analytics/categories"),
          ]);

          if (t !== l.current) return;

          const sellerPayload =
            sellerStatsResult.status === "fulfilled"
              ? sellerStatsResult.value
              : null;
          const legacyPayload =
            legacyOverviewResult.status === "fulfilled"
              ? legacyOverviewResult.value
              : null;
          const postsPayload =
            postsResult.status === "fulfilled" ? postsResult.value : null;
          const categoriesPayload =
            categoriesResult.status === "fulfilled"
              ? categoriesResult.value
              : null;

          const sellerStats =
            sellerPayload?.stats ||
            sellerPayload?.data?.stats ||
            null;
          const legacyOverview =
            legacyPayload?.overview ||
            legacyPayload?.data?.overview ||
            null;

          const mergedOverview = {
            totalViews:
              sellerStats?.totalViews ??
              legacyOverview?.totalViews ??
              0,
            totalInquiries:
              sellerStats?.totalInquiries ??
              legacyOverview?.totalInquiries ??
              0,
            soldPosts:
              sellerStats?.soldCount ??
              legacyOverview?.soldPosts ??
              0,
            totalRevenue:
              sellerStats?.totalRevenue ??
              legacyOverview?.totalRevenue ??
              0,
            activePosts:
              sellerStats?.activeListings ??
              legacyOverview?.activePosts ??
              0,
            conversionRate:
              sellerStats?.conversionRate ??
              legacyOverview?.conversionRate ??
              0,
            avgRating: legacyOverview?.avgRating ?? null,
            totalReviews: legacyOverview?.totalReviews ?? 0,
          };

          if (!sellerStats && !legacyOverview) {
            const failure =
              sellerStatsResult.status === "rejected"
                ? sellerStatsResult.reason
                : legacyOverviewResult.status === "rejected"
                  ? legacyOverviewResult.reason
                  : null;
            throw failure || new Error("Analytics unavailable");
          }

          N(mergedOverview);
          const postList = Array.isArray(postsPayload?.posts)
            ? postsPayload.posts
            : Array.isArray(postsPayload?.data?.posts)
              ? postsPayload.data.posts
              : [];
          const categoryList = Array.isArray(categoriesPayload?.breakdown)
            ? categoriesPayload.breakdown
            : Array.isArray(categoriesPayload?.data?.breakdown)
              ? categoriesPayload.data.breakdown
              : [];
          Y(postList);
          J(categoryList);
          q("");
        } catch (s) {
          if (t !== l.current) return;
          q(ue(s, tr));
          import.meta.env.DEV &&
            console.warn("[Analytics] Fetch failed:", s);
        } finally {
          t === l.current && T(!1);
        }
      }, []);
    Z(() => {
      b();
    }, [b]);
    const {
        activeCategory: categoryModeCategory,
        activeApp,
        hasSelection: hasCategoryMode,
        categories: categoryModeCategories,
      } = useCategoryMode(),
      categoryModeCategoryId = c(() => {
        if (!hasCategoryMode || !categoryModeCategory?.name) return null;
        if (categoryModeCategory?.id) return String(categoryModeCategory.id);
        const normalized = String(categoryModeCategory.name)
          .trim()
          .toLowerCase();
        const match = (Array.isArray(categoryModeCategories)
          ? categoryModeCategories
          : []
        ).find(
          (t) =>
            String(
              t?.name || t?.title || t?.label || t?.category_name || "",
            )
              .trim()
              .toLowerCase() === normalized,
        );
        const id = match?.category_id || match?.id;
        return id ? String(id) : null;
      }, [
        hasCategoryMode,
        categoryModeCategory?.id,
        categoryModeCategory?.name,
        categoryModeCategories,
      ]),
      activeAppMatcher = c(
        () => buildActiveAppMatcher(activeApp, categoryModeCategories),
        [activeApp, categoryModeCategories],
      );
    const I = c(
        () => !!a || u.length > 0 || x.length > 0,
        [x.length, a, u.length],
      ),
      f = c(() => ce(v), [v]),
      g = c(
        () =>
          f
            ? u.filter((t) => {
                const s = new Date(t.created_at);
                return Number.isNaN(s.getTime()) ? !1 : s >= f;
              })
            : u,
        [u, f],
      ),
      filteredPosts = c(
        () => {
          if (hasCategoryMode && categoryModeCategory?.name) {
            const activeName = String(categoryModeCategory.name)
              .trim()
              .toLowerCase();
            const activeId = categoryModeCategoryId || categoryModeCategory.id;
            return g.filter((t) => {
              const id = t?.category_id ?? t?.categoryId ?? null;
              if (activeId && id) {
                return String(activeId) === String(id);
              }
              const name = String(
                t?.category ||
                  t?.category_name ||
                  t?.categoryName ||
                  t?.category_title ||
                  t?.categoryTitle ||
                  "",
              )
                .trim()
                .toLowerCase();
              if (!name) return false;
              return name === activeName;
            });
          }
          if (activeAppMatcher?.activeApp) {
            return g.filter((t) => matchesCategoryModeItem(t, { activeAppMatcher }));
          }
          return g;
        },
        [
          g,
          activeAppMatcher,
          hasCategoryMode,
          categoryModeCategory?.name,
          categoryModeCategoryId,
          categoryModeCategory?.id,
        ],
      ),
      filteredCategoryBreakdown = c(
        () => {
          if (hasCategoryMode && categoryModeCategory?.name) {
            const activeName = String(categoryModeCategory.name)
              .trim()
              .toLowerCase();
            const activeId = categoryModeCategoryId || categoryModeCategory.id;
            return x.filter((t) => {
              const id = t?.category_id ?? t?.categoryId ?? null;
              if (activeId && id) {
                return String(activeId) === String(id);
              }
              const name = String(t?.category || t?.name || "")
                .trim()
                .toLowerCase();
              if (!name) return false;
              return name === activeName;
            });
          }
          if (activeAppMatcher?.activeApp) {
            return x.filter((t) =>
              matchesCategoryModeItem(
                { ...t, category: t?.category || t?.name || "" },
                { activeAppMatcher },
              ),
            );
          }
          return x;
        },
        [
          x,
          activeAppMatcher,
          hasCategoryMode,
          categoryModeCategory?.name,
          categoryModeCategoryId,
          categoryModeCategory?.id,
        ],
      ),
      z = c(() => {
        if (!f) return filteredCategoryBreakdown;
        const t = new Map();
        return (
          filteredPosts.forEach((s) => {
            const d =
                String(s.category || tr("uncategorized", "Uncategorized")).trim() ||
                  tr("uncategorized", "Uncategorized"),
              o = t.get(d) || {
                category: d,
                post_count: 0,
                total_views: 0,
                sold_count: 0,
              };
            (o.post_count += 1),
              (o.total_views += Number(s.views_count || 0)),
              (o.sold_count +=
                String(s.status || "").toLowerCase() === "sold" ? 1 : 0),
              t.set(d, o);
          }),
          Array.from(t.values()).sort((s, d) => d.post_count - s.post_count)
        );
      }, [filteredCategoryBreakdown, filteredPosts, f]),
      Q = c(() => filteredPosts.slice(0, 5), [filteredPosts]),
      h = c(
        () =>
          filteredPosts.reduce(
            (t, s) => (
              (t.views += Number(s.views_count || 0)),
              (t.inquiries += Number(s.inquiry_count || 0)),
              (t.offers += Number(s.offer_count || 0)),
              t
            ),
            { views: 0, inquiries: 0, offers: 0 },
          ),
        [filteredPosts],
      ),
      C = c(() => {
        const t = timeRanges.find((s) => s.value === v);
        return t ? t.label : tr("all_time", "All time");
      }, [v]),
      m = ({ icon: t, label: s, value: d, change: o, color: k }) =>
        e.createElement(
          A,
          { className: "mhub-premium-surface border-0 dark:border-0" },
          e.createElement(
            P,
            { className: "p-6" },
            e.createElement(
              "div",
              { className: "flex items-center justify-between" },
              e.createElement(
                "div",
                {
                  className: `w-12 h-12 rounded-xl ${k} flex items-center justify-center`,
                },
                e.createElement(t, { className: "w-6 h-6 text-white dark:text-white" }),
              ),
              typeof o == "number"
                ? e.createElement(
                    B,
                    {
                      variant: o > 0 ? "default" : "secondary",
                      className: "text-xs",
                    },
                    o > 0 ? "+" : "",
                    o,
                    "%",
                  )
                : null,
            ),
            e.createElement(
              "p",
              {
                className:
                  "text-xl sm:text-3xl font-bold mt-4 text-gray-900 dark:text-gray-100",
              },
              d,
            ),
            e.createElement(
              "p",
              { className: "text-sm text-gray-500 mt-1 dark:text-gray-300" },
              s,
            ),
          ),
        );
    if (S && !I)
      return e.createElement(
        "div",
        {
          className:
            "min-h-screen mhub-premium-page bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900/60 dark:to-slate-950 flex items-center justify-center dark:bg-gradient-to-br",
        },
        e.createElement(
          "div",
          { className: "text-center" },
          e.createElement("div", {
            className:
              "animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto dark:border-blue-500/40",
          }),
          e.createElement(
            "p",
            { className: "mt-4 text-gray-600 dark:text-gray-200" },
            "Loading analytics...",
          ),
        ),
      );
    const W = u.length === 0,
      X = u.length > 0 && filteredPosts.length === 0;
    return e.createElement(
      "div",
      {
        className:
          "min-h-screen mhub-premium-page bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900/60 dark:to-slate-950 pb-24 dark:bg-gradient-to-br",
      },
      e.createElement(
        "div",
        {
          className:
            "bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 dark:from-[#0b1220] dark:via-[#1b2542] dark:to-[#0b1220] px-4 py-8 dark:bg-gradient-to-r",
        },
        e.createElement(
          "div",
          { className: "max-w-[640px] mx-auto" },
          e.createElement(
            "div",
            {
              className:
                "flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-4 mb-6",
            },
            e.createElement(
              n,
              {
                variant: "ghost",
                size: "icon",
                className: "text-white self-start dark:text-white",
                onClick: () => navigateBack(r),
              },
              e.createElement(se, { className: "w-6 h-6" }),
            ),
            e.createElement(
              "div",
              { className: "flex-1 min-w-0" },
              e.createElement(
                "h1",
                {
                  className:
                    "text-xl sm:text-3xl font-bold text-white flex items-center gap-3 flex-wrap dark:text-white",
                },
                e.createElement(ae, { className: "w-8 h-8" }),
                tr("seller_analytics", "Seller Analytics"),
              ),
              e.createElement(
                "p",
                { className: "text-blue-100 mt-1 break-words dark:text-blue-200" },
                tr(
                  "analytics_subtitle",
                  "Track performance, identify drop-offs, and recover quickly.",
                ),
              ),
            ),
            e.createElement(
              "div",
              { className: "flex flex-wrap gap-2" },
              e.createElement(
                n,
                { variant: "secondary", size: "sm", onClick: b, disabled: S },
                e.createElement(oe, { className: "w-4 h-4 mr-2" }),
                tr("refresh", "Refresh"),
              ),
              e.createElement(
                n,
                { asChild: !0, variant: "secondary", size: "sm" },
                e.createElement(
                  y,
                  { to: "/post-welcome" },
                  tr("add_post", "Add Post"),
                ),
              ),
            ),
          ),
          hasCategoryMode && categoryModeCategory?.name
            ? e.createElement(
                "div",
                {
                  className:
                    "mb-4 rounded-2xl border border-white/30 bg-white/15 px-4 py-3 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 dark:border-white/30 dark:bg-slate-900/15 dark:text-white",
                },
                e.createElement(
                  "div",
                  null,
                  e.createElement(
                    "p",
                    { className: "text-sm font-semibold" },
                    tr("category_mode", "Category mode:"),
                    " ",
                    categoryModeCategory.name,
                  ),
                  e.createElement(
                    "p",
                    { className: "text-xs text-white/80 dark:text-white/80" },
                    tr(
                      "analytics_filtered_category",
                      "Analytics panels are filtered to this category.",
                    ),
                  ),
                ),
                e.createElement(
                  n,
                  {
                    type: "button",
                    variant: "secondary",
                    size: "sm",
                  className: "bg-white/20 text-white hover:bg-white/30 dark:bg-slate-900/20 dark:text-white dark:hover:bg-slate-900/30",
                  onClick: () => r("/category-mode"),
                },
                tr("switch_category", "Switch category"),
              ),
            )
            : null,
          e.createElement(
            "div",
            { className: "flex flex-wrap gap-2" },
            timeRanges.map((t) =>
              e.createElement(
                n,
                {
                  key: t.value,
                  type: "button",
                  size: "sm",
                  variant: v === t.value ? "secondary" : "outline",
                  className:
                    v === t.value
                      ? "bg-white text-blue-700"
                      : "border-white/40 text-white hover:bg-white/10",
                  onClick: () => w(t.value),
                },
                e.createElement(re, { className: "w-4 h-4 mr-1" }),
                t.label,
              ),
            ),
          ),
        ),
      ),
      e.createElement(
        "div",
        { className: "max-w-[640px] mx-auto px-4 mt-6 -translate-y-6 space-y-6" },
        L
          ? e.createElement(
              O,
              {
                variant: "destructive",
                className: "mhub-premium-surface",
              },
              e.createElement(te, { className: "h-4 w-4" }),
              e.createElement($, null, tr("analytics_refresh_failed", "Analytics refresh failed")),
              e.createElement(
                V,
                null,
                L,
                " ",
                I
                  ? tr("showing_last_data", "Showing last available data.")
                  : tr("retry_or_return_posts", "Retry now or return to posts."),
              ),
              e.createElement(
                "div",
                { className: "flex flex-wrap gap-2 mt-3" },
                e.createElement(n, { size: "sm", onClick: b }, tr("retry", "Retry")),
                e.createElement(
                  n,
                  {
                    size: "sm",
                    variant: "outline",
                    onClick: () => r("/my-posts"),
                  },
                  tr("my_posts", "My Posts"),
                ),
              ),
            )
          : null,
        e.createElement(
          O,
          { className: "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-600/40 dark:bg-blue-950/20 dark:text-blue-200" },
          e.createElement($, null, tr("kpi_scope_title", "KPI scope: lifetime totals")),
          e.createElement(
            V,
            null,
            tr(
              "kpi_scope_description",
              "Summary cards use full account history. Date range ({{range}}) applies to post and category panels below.",
              { range: C },
            ),
          ),
        ),
        e.createElement(
          "div",
          { className: "grid grid-cols-2 md:grid-cols-4 gap-4" },
          e.createElement(m, {
            icon: ie,
            label: tr("total_views", "Total Views"),
            value: i(a?.totalViews),
            color: "bg-blue-500",
          }),
          e.createElement(m, {
            icon: H,
            label: tr("inquiries", "Inquiries"),
            value: i(a?.totalInquiries),
            color: "bg-green-500",
          }),
          e.createElement(m, {
            icon: ne,
            label: tr("items_sold", "Items Sold"),
            value: i(a?.soldPosts),
            color: "bg-purple-500",
          }),
          e.createElement(m, {
            icon: le,
            label: tr("revenue", "Revenue"),
            value: G(a?.totalRevenue, tr),
            color: "bg-yellow-500",
          }),
        ),
        e.createElement(
          "div",
          { className: "grid grid-cols-2 md:grid-cols-4 gap-4" },
          e.createElement(m, {
            icon: F,
            label: tr("active_posts", "Active Posts"),
            value: i(a?.activePosts),
            color: "bg-indigo-500",
          }),
          e.createElement(m, {
            icon: K,
            label: tr("conversion_rate", "Conversion Rate"),
            value: `${Number(a?.conversionRate || 0)}%`,
            color: "bg-pink-500",
          }),
          e.createElement(m, {
            icon: de,
            label: tr("avg_rating", "Avg Rating"),
            value: a?.avgRating || tr("not_available", "N/A"),
            color: "bg-orange-500",
          }),
          e.createElement(m, {
            icon: H,
            label: tr("total_reviews", "Total Reviews"),
            value: i(a?.totalReviews),
            color: "bg-teal-500",
          }),
        ),
        e.createElement(
          A,
          { className: "mb-8 border-0 shadow-xl dark:border-0" },
          e.createElement(
            U,
            null,
            e.createElement(
              M,
              {
                className: "flex items-center justify-between gap-2 flex-wrap",
              },
              e.createElement(
                "span",
                { className: "flex items-center gap-2" },
                e.createElement(K, { className: "w-5 h-5 text-blue-600 dark:text-blue-300" }),
                tr("top_posts_title", "Top Performing Posts ({{range}})", { range: C }),
              ),
              e.createElement(
                B,
                { variant: "outline" },
                tr("views", "Views"),
                " ",
                i(h.views),
                " | ",
                tr("inquiries", "Inquiries"),
                " ",
                i(h.inquiries),
                " | ",
                tr("offers", "Offers"),
                " ",
                i(h.offers),
              ),
            ),
          ),
          e.createElement(
            P,
            null,
            W
              ? e.createElement(
                  "div",
                  { className: "text-center py-8 space-y-3" },
                  e.createElement(
                    "p",
                    { className: "text-gray-500 dark:text-gray-300" },
                    tr(
                      "no_post_analytics",
                      "No post analytics yet. Publish your first listing to start tracking performance.",
                    ),
                  ),
                  e.createElement(
                    "div",
                    { className: "flex flex-wrap justify-center gap-2" },
                    e.createElement(
                      n,
                      { asChild: !0 },
                      e.createElement(
                        y,
                        { to: "/post-welcome" },
                        tr("create_first_post", "Create First Post"),
                      ),
                    ),
                    e.createElement(
                      n,
                      { asChild: !0, variant: "outline" },
                      e.createElement(
                        y,
                        { to: "/all-posts" },
                        tr("browse_marketplace", "Browse Marketplace"),
                      ),
                    ),
                  ),
                )
              : X
                ? e.createElement(
                    "div",
                    { className: "text-center py-8 space-y-3" },
                    e.createElement(
                      "p",
                      { className: "text-gray-500 dark:text-gray-300" },
                      tr(
                        "no_post_activity_range",
                        "No post activity found in the selected date range.",
                      ),
                    ),
                    e.createElement(
                      "div",
                      { className: "flex flex-wrap justify-center gap-2" },
                      e.createElement(
                        n,
                        { variant: "outline", onClick: () => w("all") },
                        tr("reset_date_range", "Reset Date Range"),
                      ),
                      e.createElement(
                        n,
                        { asChild: !0 },
                        e.createElement(
                          y,
                          { to: "/post-welcome" },
                          tr("add_new_post", "Add New Post"),
                        ),
                      ),
                    ),
                  )
                : e.createElement(
                    "div",
                    { className: "space-y-4" },
                    Q.map((t) =>
                      e.createElement(
                        "div",
                        {
                          key: t.post_id,
                          className:
                            "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl dark:bg-gray-950",
                        },
                        e.createElement(
                          "div",
                          { className: "flex-1" },
                          e.createElement(
                            "h4",
                            {
                              className:
                                "font-semibold text-gray-900 dark:text-gray-100",
                            },
                            t.title,
                          ),
                          e.createElement(
                            "div",
                            {
                              className:
                                "flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-300",
                            },
                            e.createElement("span", null, G(t.price, tr)),
                            e.createElement(
                              B,
                              {
                                variant:
                                  t.status === "active"
                                    ? "default"
                                    : "secondary",
                              },
                              t.status,
                            ),
                            e.createElement("span", null, ge(t.created_at, tr)),
                          ),
                        ),
                        e.createElement(
                          "div",
                          { className: "flex items-center gap-6 text-center" },
                          e.createElement(
                            "div",
                            null,
                            e.createElement(
                              "p",
                              { className: "text-lg font-bold text-blue-600 dark:text-blue-300" },
                              i(t.views_count),
                            ),
                            e.createElement(
                              "p",
                              { className: "text-xs text-gray-500 dark:text-gray-300" },
                              tr("views", "Views"),
                            ),
                          ),
                          e.createElement(
                            "div",
                            null,
                            e.createElement(
                              "p",
                              { className: "text-lg font-bold text-green-600 dark:text-green-300" },
                              i(t.inquiry_count),
                            ),
                            e.createElement(
                              "p",
                              { className: "text-xs text-gray-500 dark:text-gray-300" },
                              tr("inquiries", "Inquiries"),
                            ),
                          ),
                          e.createElement(
                            "div",
                            null,
                            e.createElement(
                              "p",
                              {
                                className: "text-lg font-bold text-purple-600 dark:text-purple-300",
                              },
                              i(t.offer_count),
                            ),
                            e.createElement(
                              "p",
                              { className: "text-xs text-gray-500 dark:text-gray-300" },
                              tr("offers", "Offers"),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
          ),
        ),
        e.createElement(
          A,
          { className: "border-0 shadow-xl dark:border-0" },
          e.createElement(
            U,
            null,
            e.createElement(
              M,
              { className: "flex items-center gap-2" },
              e.createElement(F, { className: "w-5 h-5 text-purple-600 dark:text-purple-300" }),
              tr("category_breakdown", "Category Breakdown ({{range}})", { range: C }),
            ),
          ),
          e.createElement(
            P,
            null,
            z.length === 0
              ? e.createElement(
                  "div",
                  { className: "text-center py-8 space-y-3" },
                  e.createElement(
                    "p",
                    { className: "text-gray-500 dark:text-gray-300" },
                    tr("no_category_data", "No category data available for this range."),
                  ),
                  e.createElement(
                    "div",
                    { className: "flex flex-wrap justify-center gap-2" },
                    e.createElement(
                      n,
                      { variant: "outline", onClick: () => w("all") },
                      tr("use_all_time", "Use all-time view"),
                    ),
                    e.createElement(
                      n,
                      { asChild: !0 },
                      e.createElement(
                        y,
                        { to: "/categories" },
                        tr("explore_categories", "Explore categories"),
                      ),
                    ),
                  ),
                )
              : e.createElement(
                  "div",
                  { className: "grid grid-cols-1 md:grid-cols-2 gap-4" },
                  z.map((t, s) =>
                    e.createElement(
                      "div",
                      {
                        key: `${t.category}-${s}`,
                        className:
                          "flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl dark:bg-gray-950",
                      },
                      e.createElement(
                        "div",
                        null,
                        e.createElement(
                          "h4",
                          {
                            className:
                              "font-semibold text-gray-900 dark:text-gray-100",
                          },
                          t.category || tr("uncategorized", "Uncategorized"),
                        ),
                        e.createElement(
                          "p",
                          { className: "text-sm text-gray-500 dark:text-gray-300" },
                          i(t.post_count),
                          ` ${tr("posts", "posts")} | `,
                          i(t.sold_count),
                          ` ${tr("sold", "sold")}`,
                        ),
                      ),
                      e.createElement(
                        "div",
                        { className: "text-right" },
                        e.createElement(
                          "p",
                          { className: "text-lg font-bold text-blue-600 dark:text-blue-300" },
                          i(t.total_views),
                        ),
                        e.createElement(
                          "p",
                          { className: "text-xs text-gray-500 dark:text-gray-300" },
                          tr("views", "views"),
                        ),
                      ),
                    ),
                  ),
                ),
          ),
        ),
      ),
    );
  };
var Ce = AnalyticsPage;
export { Ce as default };

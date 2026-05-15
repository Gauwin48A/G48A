import e, { useState as m, useEffect as te, useMemo as C } from "react";
import { Link as n } from "react-router-dom";
import { useTranslation as re } from "react-i18next";
import H from "../i18n";
import {
  Card as b,
  CardContent as p,
  CardHeader as Q,
  CardTitle as V,
} from "@/components/ui/card";
import { Badge as j } from "@/components/ui/badge";
import { Avatar as ae, AvatarFallback as se } from "@/components/ui/avatar";
import {
  Alert as A,
  AlertDescription as S,
  AlertTitle as _,
} from "@/components/ui/alert";
import { Button as o } from "@/components/ui/button";
import {
  AlertTriangle as T,
  Calendar as le,
  ChevronRight as oe,
  Coins as ie,
  Eye as ne,
  FileText as de,
  RefreshCw as ge,
  ShoppingCart as me,
  Star as ue,
  TrendingUp as z,
  Trophy as ce,
} from "lucide-react";
import { translateText as be } from "../utils/translateContent";
import { useAuth as pe } from "@/context/AuthContext";
import api from "@/lib/api";
import { getInitials as gi } from "@/lib/userDisplay";
import SellerDashboard from "@/components/SellerDashboard";
import { hasAuthSession } from "@/utils/authStorage";
import { impactLight } from "@/services/nativeHapticsService";
const W = {
    active_listings: {
      icon: de,
      route: "/my-posts",
      ctaKey: "manage_listings",
      ctaFallback: "Manage listings",
    },
    total_sales: {
      icon: me,
      route: "/sold-posts",
      ctaKey: "view_sold_posts",
      ctaFallback: "View sold posts",
    },
    total_views: {
      icon: ne,
      route: "/my-feed",
      ctaKey: "review_post_views",
      ctaFallback: "Review post views",
    },
    coins_earned: {
      icon: ie,
      route: "/rewards",
      ctaKey: "open_rewards",
      ctaFallback: "Open rewards",
    },
  },
  ve = [
    {
      labelKey: "active_listings",
      value: 0,
      trend: "+Active",
      trendKey: "trend_active",
      bg: "bg-blue-100",
      color: "text-blue-600",
    },
    {
      labelKey: "total_sales",
      value: 0,
      trend: "+Sold",
      trendKey: "trend_sold",
      bg: "bg-green-100",
      color: "text-green-600",
    },
    {
      labelKey: "total_views",
      value: 0,
      trend: "+Views",
      trendKey: "trend_views",
      bg: "bg-purple-100",
      color: "text-purple-600",
    },
    {
      labelKey: "coins_earned",
      value: 0,
      trend: "+Coins",
      trendKey: "trend_coins",
      bg: "bg-yellow-100",
      color: "text-yellow-600",
    },
  ],
  ye = (x) => {
    const i = String(x || "").toLowerCase();
    return i.includes("authentication") ||
      i.includes("token") ||
      i.includes("unauthorized")
      ? {
          key: "session_expired",
          fallback: "Your session expired. Sign in again to continue.",
        }
      : {
          key: "dashboard_unavailable_desc",
          fallback:
            "Dashboard data is temporarily unavailable. Retry in a moment.",
        };
  },
  fe = (x) => gi(x, "U", { uppercase: !0 }),
  we = () => {
    const { t: x } = re(),
      { user: i } = pe(),
      [s, F] = m(null),
      [h, M] = m([]),
      [y, f] = m([]),
      [w, P] = m([]),
      [u, L] = m(null),
      [B, D] = m(!1),
      [q, I] = m(0),
      [viewMode, setViewMode] = m("seller"),
      U = C(
        () => H.language || localStorage.getItem("mhub_language") || "en",
        [H.language],
      ),
      K = C(
        () =>
          !!(i || hasAuthSession()),
        [i],
      ),
      r = (t, a) => {
        const v = x(t);
        return v === t ? a : v;
      },
      resolveMessage = (t, a) => {
        if (!t) return "";
        if (typeof t === "string") return t;
        const v = t?.key ?? a;
        const l = t?.fallback ?? "";
        return v ? r(v, l || v) : l;
      },
      errorMessage = resolveMessage(u);
    te(() => {
      if (!K) {
        F(null), M([]), f([]), P([]), L(null), D(!1);
        return;
      }
      const t = new AbortController();
      let a = !0;
      return (
        (async () => {
          D(!0), L(null);
          try {
            const d = {},
              N = i?.user_id || i?.id || localStorage.getItem("userId") || "";
            N && (d.userId = String(N)), q > 0 && (d.refresh = "true");
            const $ = await api.get("/dashboard", {
                params: d,
                signal: t.signal,
              }),
              g = $?.data ?? $;
            if (!a) return;
            const k = Array.isArray(g?.recentActivity) ? g.recentActivity : [],
              Z = Array.isArray(g?.quickStats) ? g.quickStats : [],
              R = Array.isArray(g?.topSellers) ? g.topSellers : [];
            if ((F(g?.user || null), M(Z), P(R), U !== "en" && k.length > 0))
              try {
                const c = await Promise.all(
                  k.map(async (Y) => {
                    const ee = await be(Y.title, U);
                    return { ...Y, title: ee };
                  }),
                );
                a && f(c);
              } catch (c) {
                import.meta.env.DEV &&
                  console.warn("[Dashboard] Activity translation fallback:", c),
                  a && f(k);
              }
            else f(k);
          } catch (l) {
            l?.name !== "AbortError" && l?.name !== "CanceledError" && a && L(ye(l?.response?.data?.error || l?.response?.data?.message || ""));
          } finally {
            a && D(!1);
          }
        })(),
        () => {
          (a = !1), t.abort();
        }
      );
    }, [i, U, K, q]);
    const G = C(
        () =>
          (h.length ? h : ve).map((a, v) => {
            const l =
                a.labelKey ||
                String(a.label || "")
                  .toLowerCase()
                  .replace(/ /g, "_"),
              d = W[l] || W.active_listings,
              N =
                a.trendKey ||
                (a.trend === "+Active"
                  ? "trend_active"
                  : a.trend === "+Sold"
                    ? "trend_sold"
                    : a.trend === "+Views"
                      ? "trend_views"
                      : a.trend === "+Coins"
                        ? "trend_coins"
                        : "trend_active");
            return {
              ...a,
              key: `${l || "stat"}-${v}`,
              labelKey: l,
              trendKey: N,
              icon: d.icon,
              route: d.route,
              ctaLabel: r(d.ctaKey || "cta", d.ctaFallback || d.cta || ""),
          };
        }),
        [h, r],
      ),
      buyerStats = C(
        () => [
          {
            key: "items_bought",
            label: r("items_bought", "Items Bought"),
            value: s?.buyerStats?.purchases ?? 0,
            icon: me,
            bg: "bg-emerald-100",
            color: "text-emerald-600",
          },
          {
            key: "offers_made",
            label: r("offers_made", "Offers Made"),
            value: s?.buyerStats?.offers ?? 0,
            icon: z,
            bg: "bg-blue-100",
            color: "text-blue-600",
          },
          {
            key: "saved_items",
            label: r("saved_items", "Saved Items"),
            value: s?.buyerStats?.saved ?? 0,
            icon: ue,
            bg: "bg-yellow-100",
            color: "text-yellow-600",
          },
          {
            key: "active_chats",
            label: r("active_chats", "Active Chats"),
            value: s?.buyerStats?.chats ?? 0,
            icon: ie,
            bg: "bg-purple-100",
            color: "text-purple-600",
          },
        ],
        [r, s],
      ),
      J = C(
        () =>
          !B &&
          !errorMessage &&
          (h.length === 0 || y.length === 0 || w.length === 0),
        [errorMessage, B, h.length, y.length, w.length],
      );
    return K
      ? B && !s
        ? e.createElement(
            "div",
            {
              className:
                "min-h-screen flex items-center justify-center mhub-premium-page bg-white dark:bg-slate-900",
            },
            e.createElement(
              "div",
              { className: "text-center space-y-3 dark:text-center" },
              e.createElement("div", {
                className:
                  "h-10 w-10 mx-auto rounded-full border-2 border-blue-500 border-t-transparent animate-spin dark:border-2 dark:border-blue-500/40 dark:border-t-transparent",
              }),
              e.createElement(
                "p",
                { className: "text-gray-500 dark:text-gray-400 dark:text-gray-300" },
                r("loading", "Loading"),
              ),
            ),
          )
        : errorMessage && !s
          ? e.createElement(
              "div",
              {
                className:
                  "min-h-screen flex items-center justify-center mhub-premium-page bg-white p-4 dark:bg-slate-900",
              },
              e.createElement(
                b,
                { className: "max-w-lg w-full" },
                e.createElement(
                  p,
                  { className: "p-6 space-y-4" },
                  e.createElement(
                    A,
                    { variant: "destructive" },
                    e.createElement(T, { className: "h-4 w-4" }),
                    e.createElement(
                      _,
                      null,
                      r("dashboard_unavailable", "Dashboard unavailable"),
                    ),
                    e.createElement(S, null, errorMessage),
                  ),
                  e.createElement(
                    "div",
                    { className: "flex flex-wrap gap-2" },
                    e.createElement(
                      o,
                      { onClick: () => I((t) => t + 1) },
                      r("retry", "Retry"),
                    ),
                    e.createElement(
                      o,
                      { asChild: !0, variant: "outline" },
                      e.createElement(
                        n,
                        { to: "/all-posts" },
                        r("browse_marketplace", "Browse marketplace"),
                      ),
                    ),
                  ),
                ),
              ),
            )
          : s
            ? e.createElement(
                "div",
                {
                  className:
                    "min-h-screen mhub-premium-page bg-gray-50 transition-colors duration-300 dark:bg-gray-950",
                },
                e.createElement(
                  "div",
                  {
                    className:
                      "container mx-auto px-4 py-6 max-w-6xl space-y-3",
                  },
                  errorMessage
                    ? e.createElement(
                        A,
                        { variant: "destructive" },
                        e.createElement(T, { className: "h-4 w-4" }),
                        e.createElement(
                          _,
                          null,
                          r("latest_refresh_failed", "Latest refresh failed"),
                        ),
                        e.createElement(
                          S,
                          null,
                          errorMessage,
                          " ",
                          r(
                            "showing_last_available_dashboard_data",
                            "Showing last available dashboard data.",
                          ),
                        ),
                      )
                    : null,
                  J
                    ? e.createElement(
                        A,
                        {
                          className:
                            "border-yellow-300 bg-yellow-50 text-yellow-900 dark:border-yellow-600/40 dark:bg-yellow-950/20 dark:text-yellow-200",
                        },
                        e.createElement(T, {
                          className: "h-4 w-4 text-yellow-700 dark:text-yellow-300",
                        }),
                        e.createElement(
                          _,
                          null,
                          r("limited_dashboard_data", "Limited dashboard data"),
                        ),
                        e.createElement(
                          S,
                          null,
                          r(
                            "dashboard_panels_empty_hint",
                            "Some panels are still empty. Publish posts, complete sales, and refresh to unlock full analytics.",
                          ),
                        ),
                      )
                    : null,
                  e.createElement(
                    b,
                    {
                      className:
                        "mhub-premium-surface rounded-2xl overflow-hidden",
                    },
                    e.createElement(
                      p,
                      {
                        className:
                          "bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-700 dark:to-blue-900 text-white p-6 lg:p-5 dark:bg-gradient-to-r dark:text-white",
                      },
                      e.createElement(
                        "div",
                        {
                          className:
                            "flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4",
                        },
                        e.createElement(
                        "div",
                        {
                          className: "flex items-center gap-4 lg:gap-3 min-w-0",
                        },
                          e.createElement(
                            ae,
                            {
                              className:
                                "h-12 w-12 lg:h-16 lg:w-16 ring-4 ring-white/30",
                            },
                            e.createElement(
                              se,
                              {
                                className:
                                  "text-lg lg:text-xl bg-white/20 text-white font-bold dark:bg-slate-900/20 dark:text-white",
                              },
                              fe(s?.name),
                            ),
                          ),
                          e.createElement(
                          "div",
                          { className: "min-w-0" },
                            e.createElement(
                              "h1",
                              {
                                className:
                                  "text-2xl lg:text-3xl font-bold text-white mb-2 truncate dark:text-white",
                                title: s?.name
                                  ? `${r("welcome_back", "Welcome back")}, ${s?.name}!`
                                  : r("welcome_back", "Welcome back"),
                              },
                              r("welcome_back", "Welcome back"),
                              ", ",
                              s?.name || r("user", "User"),
                              "!",
                            ),
                            e.createElement(
                              "div",
                              {
                                className:
                                  "flex flex-wrap items-center gap-3 text-white/90 text-sm dark:text-white/90",
                              },
                              e.createElement(
                                j,
                                {
                                  className:
                                    "bg-white/20 text-white border-white/30 dark:bg-slate-900/20 dark:text-white dark:border-white/30",
                                },
                                s?.rank || r("member", "Member"),
                              ),
                              e.createElement(
                                "div",
                                { className: "flex items-center gap-1" },
                                e.createElement(ue, {
                                  className:
                                    "w-4 h-4 text-yellow-300 fill-current dark:text-yellow-200",
                                }),
                                e.createElement(
                                  "span",
                                  null,
                                  s?.rating || r("na", "N/A"),
                                ),
                              ),
                              e.createElement(
                                "span",
                                null,
                                r("id_label", "ID: "),
                                s?.id || r("na", "N/A"),
                              ),
                            ),
                          ),
                        ),
                        e.createElement(
                          "div",
                          {
                            className:
                              "w-full lg:w-auto lg:text-right space-y-2 dark:lg:text-right",
                          },
                          e.createElement(
                            "div",
                            null,
                            e.createElement(
                              "div",
                              { className: "text-2xl lg:text-3xl font-bold" },
                              s?.coins || 0,
                            ),
                            e.createElement(
                              "div",
                              { className: "text-white/80 dark:text-white/80" },
                              r("total_coins", "Total Coins"),
                            ),
                          ),
                          e.createElement(
                            "div",
                            { className: "text-sm text-white/75 dark:text-white/75" },
                            r("code", "Code"),
                            ": ",
                            s?.dailyCode || r("na", "N/A"),
                          ),
                          e.createElement(
                            "div",
                            {
                              className:
                                "flex flex-wrap gap-2 lg:justify-end pt-1",
                            },
                            e.createElement(
                              o,
                              {
                                size: "sm",
                                variant: "secondary",
                                className:
                                  "bg-white/20 text-white hover:bg-white/30 border border-white/30 dark:bg-slate-900/20 dark:text-white dark:hover:bg-slate-900/30 dark:border dark:border-white/30",
                                onClick: () => I((t) => t + 1),
                              },
                              e.createElement(ge, {
                                className: "w-4 h-4 mr-1",
                              }),
                              r("refresh", "Refresh"),
                            ),
                            e.createElement(
                              o,
                              {
                                asChild: !0,
                                size: "sm",
                                variant: "secondary",
                                className:
                                  "bg-white text-blue-700 hover:bg-blue-50 dark:bg-slate-900 dark:text-blue-300 dark:hover:bg-blue-950/20",
                              },
                              e.createElement(
                                n,
                                { to: "/post-welcome" },
                                r("add_post", "Add Post"),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                  e.createElement(
                    "div",
                    { className: "flex flex-wrap gap-2 mb-4" },
                    e.createElement(
                      o,
                      {
                        size: "sm",
                        variant: viewMode === "seller" ? "default" : "outline",
                        onClick: () => { impactLight(); setViewMode("seller"); },
                      },
                      r("seller_view", "Seller view"),
                    ),
                    e.createElement(
                      o,
                      {
                        size: "sm",
                        variant: viewMode === "buyer" ? "default" : "outline",
                        onClick: () => { impactLight(); setViewMode("buyer"); },
                      },
                      r("buyer_view", "Buyer view"),
                    ),
                  ),
                  e.createElement(
                    "div",
                    {
                      className:
                        "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4",
                    },
                    (viewMode === "buyer" ? buyerStats : G).map((t) => {
                      const a = t.icon || z;
                      return e.createElement(
                        b,
                        {
                          key: t.key,
                          className:
                            "mhub-premium-surface rounded-xl hover:shadow-xl transition-all duration-300",
                        },
                        e.createElement(
                          p,
                          { className: "p-4 lg:p-6 space-y-3" },
                          e.createElement(
                            "div",
                            { className: "flex items-center justify-between" },
                            e.createElement(
                              "div",
                              {
                                className: `p-2 lg:p-3 rounded-xl ${t.bg || "bg-blue-100"} dark:bg-opacity-20`,
                              },
                              e.createElement(a, {
                                className: `w-5 h-5 lg:w-6 lg:h-6 ${t.color || "text-blue-600"}`,
                              }),
                            ),
                            t.trendKey || t.trend
                              ? e.createElement(
                                  j,
                                  {
                                    className:
                                      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 text-xs dark:bg-green-950/20 dark:text-green-200",
                                  },
                                  r(t.trendKey, t.trend || "+"),
                                )
                              : null,
                          ),
                          e.createElement(
                            "div",
                            null,
                            e.createElement(
                              "div",
                              {
                                className:
                                  "text-xl lg:text-2xl font-bold text-gray-800 dark:text-white mb-1 dark:text-gray-100",
                              },
                              t.value ?? 0,
                            ),
                            e.createElement(
                              "div",
                              {
                                className:
                                  "text-sm text-gray-600 dark:text-gray-400 dark:text-gray-200",
                              },
                              r(t.labelKey, t.label || "Metric"),
                            ),
                          ),
                          t.route
                            ? e.createElement(
                                o,
                                {
                                  asChild: !0,
                                  size: "sm",
                                  variant: "ghost",
                                  className:
                                    "px-0 text-blue-600 dark:text-blue-300",
                                },
                                e.createElement(
                                  n,
                                  { to: t.route },
                                  t.ctaLabel || t.cta || r("view", "View"),
                                  e.createElement(oe, {
                                    className: "h-4 w-4 ml-1",
                                  }),
                                ),
                              )
                            : null,
                        ),
                      );
                    }),
                  ),
                  viewMode === "seller" &&
                    e.createElement(SellerDashboard, { key: "seller-dashboard" }),
                  viewMode === "buyer" &&
                    e.createElement(
                      "div",
                      { className: "grid grid-cols-1 lg:grid-cols-3 gap-3" },
                      e.createElement(
                        "div",
                        { className: "lg:col-span-2" },
                        e.createElement(
                          b,
                          {
                            className:
                              "mhub-premium-surface rounded-2xl overflow-hidden h-full",
                          },
                          e.createElement(
                            Q,
                            {
                              className:
                                "bg-emerald-500 dark:bg-emerald-700 text-white dark:bg-emerald-800/30 dark:text-white",
                            },
                            e.createElement(
                              V,
                              { className: "flex items-center space-x-2" },
                              e.createElement(me, { className: "w-5 h-5" }),
                              e.createElement(
                                "span",
                                null,
                                r("buyer_activity", "Buying Activity"),
                              ),
                            ),
                          ),
                          e.createElement(
                            p,
                            { className: "p-4 lg:p-6" },
                            y.length > 0
                              ? e.createElement(
                                  "div",
                                  { className: "space-y-4" },
                                  y.slice(0, 4).map((t) =>
                                    e.createElement(
                                      "div",
                                      {
                                        key: t.id || `${t.title}-${t.time}`,
                                        className:
                                          "flex items-center space-x-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-700 hover:shadow-md transition-all duration-300 dark:bg-gray-950",
                                      },
                                      e.createElement(
                                        "div",
                                        {
                                          className:
                                            "p-2 rounded-lg bg-white dark:bg-gray-600 dark:bg-slate-900",
                                        },
                                        e.createElement(z, {
                                          className:
                                            "w-5 h-5 text-emerald-500 dark:text-emerald-300",
                                        }),
                                      ),
                                      e.createElement(
                                        "div",
                                        { className: "flex-1 min-w-0" },
                                        e.createElement(
                                          "p",
                                          {
                                            className:
                                              "font-semibold text-gray-800 dark:text-white text-sm lg:text-base break-words dark:text-gray-100",
                                          },
                                          t.title,
                                        ),
                                        e.createElement(
                                          "p",
                                          {
                                            className:
                                              "text-xs lg:text-sm text-gray-600 dark:text-gray-300 flex items-center dark:text-gray-200",
                                          },
                                          e.createElement(le, {
                                            className: "w-3 h-3 mr-1",
                                          }),
                                          t.time,
                                        ),
                                      ),
                                    ),
                                  ),
                                )
                              : e.createElement(
                                  "div",
                                  { className: "text-center py-10 space-y-3 dark:text-center" },
                                  e.createElement(
                                    "p",
                                    {
                                      className:
                                        "text-sm text-gray-500 dark:text-gray-400 dark:text-gray-300",
                                    },
                                    r(
                                      "buyer_activity_empty",
                                      "No buying activity yet. Start exploring listings to build your buyer history.",
                                    ),
                                  ),
                                  e.createElement(
                                    o,
                                    { asChild: !0, size: "sm" },
                                    e.createElement(
                                      n,
                                      { to: "/all-posts" },
                                      r("browse_posts", "Browse listings"),
                                    ),
                                  ),
                                ),
                          ),
                        ),
                      ),
                      e.createElement(
                        b,
                        {
                          className:
                            "mhub-premium-surface rounded-2xl overflow-hidden",
                        },
                        e.createElement(
                          Q,
                          {
                            className:
                              "bg-purple-500 dark:bg-purple-700 text-white dark:bg-purple-800/30 dark:text-white",
                          },
                          e.createElement(
                            V,
                            { className: "flex items-center space-x-2" },
                            e.createElement(ue, { className: "w-5 h-5" }),
                            e.createElement(
                              "span",
                              null,
                              r("buyer_actions", "Quick Actions"),
                            ),
                          ),
                        ),
                        e.createElement(
                          p,
                          { className: "p-4 lg:p-6 space-y-3" },
                          e.createElement(
                            o,
                            { asChild: !0, size: "sm" },
                            e.createElement(
                              n,
                              { to: "/all-posts" },
                              r("browse_posts", "Browse listings"),
                            ),
                          ),
                          e.createElement(
                            o,
                            { asChild: !0, size: "sm", variant: "outline" },
                            e.createElement(
                              n,
                              { to: "/offers" },
                              r("review_offers", "Review offers"),
                            ),
                          ),
                          e.createElement(
                            o,
                            { asChild: !0, size: "sm", variant: "outline" },
                            e.createElement(
                              n,
                              { to: "/wishlist" },
                              r("saved_items", "Saved items"),
                            ),
                          ),
                        ),
                      ),
                    ),
                  viewMode === "seller" &&
                    e.createElement(
                      "div",
                      { className: "grid grid-cols-1 lg:grid-cols-3 gap-3" },
                    e.createElement(
                      "div",
                      { className: "lg:col-span-2" },
                      e.createElement(
                        b,
                        {
                          className:
                            "mhub-premium-surface rounded-2xl overflow-hidden h-full",
                        },
                        e.createElement(
                          Q,
                          {
                            className:
                              "bg-blue-500 dark:bg-blue-700 text-white dark:bg-blue-800/30 dark:text-white",
                          },
                          e.createElement(
                            V,
                            { className: "flex items-center space-x-2" },
                            e.createElement(z, { className: "w-5 h-5" }),
                            e.createElement(
                              "span",
                              null,
                              r("recent_activity", "Recent Activity"),
                            ),
                          ),
                        ),
                        e.createElement(
                          p,
                          { className: "p-4 lg:p-6" },
                          y.length > 0
                            ? e.createElement(
                                "div",
                                { className: "space-y-4" },
                                y.map((t) =>
                                  e.createElement(
                                    "div",
                                    {
                                      key: t.id || `${t.title}-${t.time}`,
                                      className:
                                        "flex items-center space-x-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-700 hover:shadow-md transition-all duration-300 dark:bg-gray-950",
                                    },
                                    e.createElement(
                                      "div",
                                      {
                                        className:
                                          "p-2 rounded-lg bg-white dark:bg-gray-600 dark:bg-slate-900",
                                      },
                                      e.createElement(z, {
                                        className:
                                          "w-5 h-5 text-blue-500 dark:text-blue-300",
                                      }),
                                    ),
                                    e.createElement(
                                      "div",
                                      { className: "flex-1 min-w-0" },
                                      e.createElement(
                                        "p",
                                        {
                                          className:
                                            "font-semibold text-gray-800 dark:text-white text-sm lg:text-base break-words dark:text-gray-100",
                                        },
                                        t.title,
                                      ),
                                      e.createElement(
                                        "p",
                                        {
                                          className:
                                            "text-xs lg:text-sm text-gray-600 dark:text-gray-300 flex items-center dark:text-gray-200",
                                        },
                                        e.createElement(le, {
                                          className: "w-3 h-3 mr-1",
                                        }),
                                        t.time,
                                      ),
                                    ),
                                  ),
                                ),
                              )
                            : e.createElement(
                                "div",
                                { className: "text-center py-10 space-y-3 dark:text-center" },
                                e.createElement(
                                  "p",
                                  {
                                    className:
                                      "text-sm text-gray-500 dark:text-gray-400 dark:text-gray-300",
                                  },
                                  r(
                                    "no_activity_yet",
                                    "No activity yet. Your recent posts and transactions will appear here.",
                                  ),
                                ),
                                e.createElement(
                                  "div",
                                  {
                                    className:
                                      "flex flex-wrap justify-center gap-2",
                                  },
                                  e.createElement(
                                    o,
                                    { asChild: !0, size: "sm" },
                                    e.createElement(
                                      n,
                                      { to: "/post-welcome" },
                                      r(
                                        "create_first_post",
                                        "Create your first post",
                                      ),
                                    ),
                                  ),
                                  e.createElement(
                                    o,
                                    {
                                      asChild: !0,
                                      size: "sm",
                                      variant: "outline",
                                    },
                                    e.createElement(
                                      n,
                                      { to: "/offers" },
                                      r("review_offers", "Review offers"),
                                    ),
                                  ),
                                ),
                              ),
                        ),
                      ),
                    ),
                    e.createElement(
                      b,
                      {
                        className:
                          "mhub-premium-surface rounded-2xl overflow-hidden",
                      },
                      e.createElement(
                        Q,
                        {
                          className:
                            "bg-gradient-to-r from-blue-400 to-blue-500 dark:from-blue-600 dark:to-blue-800 text-white dark:bg-gradient-to-r dark:text-white",
                        },
                        e.createElement(
                          V,
                          { className: "flex items-center space-x-2" },
                          e.createElement(ce, { className: "w-5 h-5" }),
                          e.createElement(
                            "span",
                            null,
                            r("top_sellers_month", "Top Sellers This Month"),
                          ),
                        ),
                      ),
                      e.createElement(
                        p,
                        { className: "p-4 lg:p-6" },
                        e.createElement(
                          "div",
                          { className: "space-y-4" },
                          w.length > 0
                            ? w.map((t) =>
                                e.createElement(
                                  "div",
                                  {
                                    key: t.rank,
                                    className: `flex items-center justify-between p-3 lg:p-4 rounded-xl transition-all duration-300 ${t.isCurrentUser ? "bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-200 dark:border-blue-700 shadow-md" : "bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600"}`,
                                  },
                                  e.createElement(
                                    "div",
                                    {
                                      className:
                                        "flex items-center space-x-3 lg:space-x-4 min-w-0",
                                    },
                                    e.createElement(
                                      "div",
                                      {
                                        className:
                                          "text-lg lg:text-2xl font-bold dark:text-white",
                                      },
                                      t.badge,
                                    ),
                                    e.createElement(
                                    "div",
                                    { className: "min-w-0" },
                                      e.createElement(
                                        "p",
                                      {
                                        className: `font-semibold text-sm lg:text-base truncate dark:lg:text-base${t.isCurrentUser ? "text-blue-600 dark:text-blue-300" : "text-gray-800 dark:text-white"}`,
                                        title: t.name,
                                      },
                                        t.name,
                                        t.isCurrentUser
                                          ? ` (${r("you", "You")})`
                                          : "",
                                      ),
                                      e.createElement(
                                        "p",
                                        {
                                          className:
                                            "text-xs lg:text-sm text-gray-600 dark:text-gray-300 dark:text-gray-200",
                                        },
                                        t.sales,
                                        " ",
                                        r("sales", "sales"),
                                        " | ",
                                        t.coins,
                                        " ",
                                        r("coins", "coins"),
                                      ),
                                    ),
                                  ),
                                  t.isCurrentUser
                                    ? e.createElement(
                                        j,
                                        { className: "bg-blue-500 text-white dark:bg-blue-800/30 dark:text-white" },
                                        r("you", "You"),
                                      )
                                    : null,
                                ),
                              )
                            : e.createElement(
                                "div",
                                { className: "text-center py-8 space-y-3 dark:text-center" },
                                e.createElement(
                                  "p",
                                  {
                                    className:
                                      "text-gray-500 dark:text-gray-400 text-sm dark:text-gray-300",
                                  },
                                  r(
                                    "no_top_sellers",
                                    "Leaderboard data is not available yet.",
                                  ),
                                ),
                                e.createElement(
                                  o,
                                  {
                                    asChild: !0,
                                    size: "sm",
                                    variant: "outline",
                                  },
                                  e.createElement(
                                    n,
                                    { to: "/sold-posts" },
                                    r("open_sold_posts", "Open sold posts"),
                                  ),
                                ),
                              ),
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
                    "min-h-screen mhub-premium-page bg-gray-50 py-8 px-4 dark:bg-gray-950",
                },
                e.createElement(
                  b,
                  { className: "max-w-3xl mx-auto" },
                  e.createElement(
                    p,
                    { className: "p-6 space-y-4" },
                    e.createElement(
                      A,
                      null,
                      e.createElement(T, { className: "h-4 w-4" }),
                      e.createElement(
                        _,
                        null,
                        r(
                          "dashboard_data_incomplete",
                          "Dashboard data incomplete",
                        ),
                      ),
                      e.createElement(
                        S,
                        null,
                        r(
                          "dashboard_metrics_unavailable",
                          "We could not load profile metrics right now. Retry or continue with marketplace actions.",
                        ),
                      ),
                    ),
                    e.createElement(
                      "div",
                      { className: "flex flex-wrap gap-2" },
                      e.createElement(
                        o,
                        { onClick: () => I((t) => t + 1) },
                        r("retry", "Retry"),
                      ),
                      e.createElement(
                        o,
                        { asChild: !0, variant: "outline" },
                        e.createElement(
                          n,
                          { to: "/post-welcome" },
                          r("create_post", "Create a post"),
                        ),
                      ),
                      e.createElement(
                        o,
                        { asChild: !0, variant: "outline" },
                        e.createElement(
                          n,
                          { to: "/my-posts" },
                          r("my_posts", "My posts"),
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
              "min-h-screen flex items-center justify-center mhub-premium-page bg-gradient-to-br from-blue-50 to-blue-200 transition-colors duration-300 p-4 dark:bg-gradient-to-br dark:from-blue-950 dark:to-blue-900",
          },
          e.createElement(
            "div",
            {
              className:
                "mhub-premium-surface rounded-3xl p-5 text-center max-w-md w-full dark:text-center",
            },
            e.createElement(
              "h2",
              {
                className:
                  "text-3xl font-extrabold text-blue-700 dark:text-blue-400 mb-4 dark:text-blue-300",
              },
              r("your_dashboard", "Your Dashboard"),
            ),
            e.createElement(
              "p",
              { className: "text-base text-gray-600 dark:text-gray-300 mb-6 dark:text-gray-200" },
              r(
                "dashboard_login_msg",
                "Sign in to see your personalized marketplace insights.",
              ),
            ),
            e.createElement(
              "div",
              { className: "flex flex-col gap-3" },
              e.createElement(
                n,
                {
                  to: "/login?returnTo=%2Fdashboard",
                  className:
                    "bg-blue-600 hover:bg-blue-700 text-white text-base px-8 py-3 rounded-xl font-bold text-center dark:bg-blue-700/40 dark:hover:bg-blue-700/40 dark:text-white dark:text-center",
                },
                r("login_to_continue", "Login to Continue"),
              ),
              e.createElement(
                n,
                {
                  to: "/signup",
                  className:
                    "border border-blue-300 dark:border-blue-500 text-blue-600 dark:text-blue-400 text-base px-8 py-3 rounded-xl font-semibold text-center hover:bg-blue-50 dark:hover:bg-gray-700 dark:border dark:border-blue-600/40 dark:text-blue-300 dark:text-center dark:hover:bg-blue-950/20",
                },
                r("create_account", "Create Account"),
              ),
            ),
          ),
        );
  };
var $e = we;
export { $e as default };

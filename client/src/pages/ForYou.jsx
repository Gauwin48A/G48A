import e, {
  useState as c,
  useEffect as I,
  useRef as H,
  useCallback as A,
  useMemo as J,
} from "react";
import {
  useNavigate as ce,
  useLocation as ge,
  useSearchParams as be,
} from "react-router-dom";
import { useTranslation as xe } from "react-i18next";
import {
  Sparkles as K,
  Lock as pe,
  Gift as he,
  TrendingUp as fe,
  Zap as ve,
  LogIn as we,
  AlertTriangle as Q,
  RefreshCw as X,
  RotateCcw as F,
} from "lucide-react";
import R from "../lib/api";
import { Card as ee } from "@/components/ui/card";
import { Button as o } from "@/components/ui/button";
import { Avatar as ye, AvatarFallback as Ne } from "@/components/ui/avatar";
import CategoriesGrid from "@/components/CategoriesGrid";
import {
  Alert as ke,
  AlertDescription as Pe,
  AlertTitle as Ce,
} from "@/components/ui/alert";
import { useTranslatedPosts as Le } from "../hooks/useTranslatedContent";
import { useAuth as _e } from "@/context/AuthContext";
import { getAccessToken as Ae, getUserId as Se } from "@/utils/authStorage";
import { getApiOriginBase as je } from "@/lib/networkConfig";
import { fetchCategoriesCached as qe } from "@/services/categoriesService";
const te = 12,
  Be = (r) => {
    const i = Number(r?.status || r?.response?.status || 0),
      g = String(r?.message || "").toLowerCase();
    return i === 401 || i === 403 || g.includes("auth") || g.includes("session")
      ? "Your session expired. Please sign in again to continue."
      : "Recommendations are temporarily unavailable. Please retry.";
  },
  Ee = () => {
    const { t: r } = xe(),
      tr = (key, fallback, options = {}) =>
        r(key, { defaultValue: fallback, ...options }),
      i = ce(),
      g = ge(),
      [n, P] = be(),
      { user: S, loading: re } = _e(),
      d = n.get("search") || "",
      h = n.get("category") || "",
      f = n.get("minPrice") || "",
      v = n.get("maxPrice") || "",
      w = n.get("location") || "",
      z = Ae(),
      m = Se(S),
      y = J(() => !!(S || (z && m)), [S, z, m]),
      [b, se] = c({ location: "", minPrice: "", maxPrice: "", categories: [] }),
      [categories, setCategories] = c([]),
      [C, j] = c([]),
      [trendPosts, setTrendPosts] = c([]),
      [trendLoading, setTrendLoading] = c(!1),
      [ae, T] = c(!0),
      [L, U] = c(""),
      [oe, le] = c(0),
      [x, Y] = c(1),
      [ie, $] = c(!0),
      [D, W] = c(!1),
      q = H(0),
      B = H(0),
      { translatedPosts: ne, isTranslating: de } = Le(C),
      N = A((t, a) => {
        import.meta.env.DEV && console.log(t, a);
      }, []),
      _ = J(() => !!(d || h || f || v || w), [h, w, v, f, d]),
      nearMeLocation = J(
        () =>
          localStorage.getItem("mhub_user_city") ||
          localStorage.getItem("city") ||
          b.location ||
          "",
        [b.location],
      ),
      priceFormatter = J(
        () =>
          new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
          }),
        [],
      ),
      updateQueryParams = A(
        (t, a = {}) => {
          const s = new URLSearchParams(n);
          Object.entries(t || {}).forEach(([u, l]) => {
            if (
              l === null ||
              l === undefined ||
              l === "" ||
              (Array.isArray(l) && l.length === 0)
            ) {
              s.delete(u);
              return;
            }
            if (Array.isArray(l)) {
              s.set(u, l.join(","));
              return;
            }
            s.set(u, String(l));
          });
          P(s, { replace: a.replace ?? !1 });
        },
        [n, P],
      ),
      activeCategoryName = J(() => {
        if (!h) return "";
        const match = categories.find((t) => {
          const id = String(t.category_id || t.id || t.name || "")
            .trim()
            .toLowerCase();
          const name = String(t.name || t.title || "")
            .trim()
            .toLowerCase();
          const target = String(h).trim().toLowerCase();
          return id === target || name === target;
        });
        return match?.name || match?.title || h;
      }, [categories, h]),
      handleCategorySelect = A(
        (t) => {
          updateQueryParams({ category: t || "" });
        },
        [updateQueryParams],
      ),
      me = A(() => {
        const t = new URLSearchParams(n);
        t.delete("search"), P(t, { replace: !0 });
      }, [n, P]),
      E = A(() => {
        const t = new URLSearchParams(n);
        ["search", "category", "minPrice", "maxPrice", "location"].forEach(
          (a) => {
            t.delete(a);
          },
        ),
          P(t, { replace: !0 });
      }, [n, P]),
      O = A(() => {
        le((t) => t + 1);
      }, []);
    I(() => {
      if (!y || !m) return;
      const t = async () => {
        const s = ++q.current;
        try {
          const u = await R.get("/profile/preferences", {
            params: { userId: m },
          });
          if (s !== q.current) return;
          const l = u?.data ?? u;
          if (l) {
            const k = Array.isArray(l.categories) ? l.categories : [];
            se({
              location: l.location || "",
              minPrice: l.minPrice || "",
              maxPrice: l.maxPrice || "",
              categories: k,
            }),
              N("[ForYou] Loaded preferences:", l);
          }
        } catch (u) {
          N("[ForYou] No preferences found:", u?.message || u);
        }
      };
      t();
      const a = () => {
        document.visibilityState === "visible" && t();
      };
      return (
        document.addEventListener("visibilitychange", a),
        window.addEventListener("focus", t),
        () => {
          document.removeEventListener("visibilitychange", a),
            window.removeEventListener("focus", t);
        }
      );
    }, [N, y, g.key, m]),
      I(() => {
        let t = !1;
        (async () => {
          try {
            const a = await qe();
            t || setCategories(Array.isArray(a) ? a : []);
          } catch {
            t || setCategories([]);
          }
        })();
        return () => {
          t = !0;
        };
      }, []),
      I(() => {
        if (!y) {
          setTrendPosts([]);
          setTrendLoading(!1);
          return;
        }
        let t = !1;
        (async () => {
          setTrendLoading(!0);
          try {
            const a = await R.get("/feed/trending"),
              s = a?.data ?? a,
              u = Array.isArray(s?.posts)
                ? s.posts
                : Array.isArray(s)
                  ? s
                  : [];
            t || setTrendPosts(u);
          } catch {
            t || setTrendPosts([]);
          } finally {
            t || setTrendLoading(!1);
          }
        })();
        return () => {
          t = !0;
        };
      }, [oe, y]),
      I(() => {
        Y(1), $(!0);
      }, [b, d, h, f, v, w]),
      I(() => {
        if (!y || !m) return;
        (async () => {
          const a = ++B.current;
          x === 1 ? T(!0) : W(!0);
          try {
            const s = {
              location: w || b.location,
              minPrice: f || b.minPrice,
              maxPrice: v || b.maxPrice,
              category: h || b.categories,
              search: d,
              userId: m,
              page: x,
              limit: te,
            };
            Object.keys(s).forEach((p) => {
              (!s[p] || (Array.isArray(s[p]) && s[p].length === 0)) &&
                delete s[p];
            }),
              N("[ForYou] Fetching with params:", s);
            const u = await R.get("/recommendations", { params: s });
            if (a !== B.current) return;
            const l = u?.data ?? u,
              k = Array.isArray(l?.posts) ? l.posts : [];
            j(
              x === 1
                ? k
                : (p) => {
                    const ue = [...p, ...k],
                      V = new Set();
                    return ue.filter((Z) => {
                      const M = String(Z.post_id || Z.id || "");
                      return !M || V.has(M) ? !1 : (V.add(M), !0);
                    });
                  },
            ),
              $(k.length === te),
              U("");
          } catch (s) {
            U(
              x === 1
                ? Be(s)
                : "Could not load more recommendations. Please retry.",
            ),
              x === 1 && j([]);
          } finally {
            a === B.current && (T(!1), W(!1));
          }
        })();
      }, [N, y, x, b, oe, h, w, v, f, d, m]);
    const formatPrice = (t) => {
      const a = Number(t);
      if (!Number.isFinite(a) || a <= 0) return "INR --";
      try {
        return priceFormatter.format(a);
      } catch {
        return `INR ${a.toLocaleString()}`;
      }
    };
    const G = (t) =>
      t ? (t.startsWith("http") ? t : `${je()}${t}`) : "/placeholder.svg";
    return !re && !y
      ? e.createElement(
          "div",
          {
            className:
              "min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 dark:from-slate-900 dark:via-gray-900 dark:to-slate-900 flex items-center justify-center p-4",
          },
          e.createElement(
            "div",
            { className: "absolute inset-0 overflow-hidden" },
            e.createElement("div", {
              className:
                "absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse",
            }),
            e.createElement("div", {
              className:
                "absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000",
            }),
          ),
          e.createElement(
            "div",
            { className: "relative z-10 max-w-md w-full" },
            e.createElement(
              "div",
              {
                className:
                  "bg-white/95 dark:bg-slate-900/80 backdrop-blur-2xl rounded-3xl p-8 border border-gray-200 dark:border-white/10 shadow-2xl",
              },
              e.createElement(
                "div",
                { className: "flex justify-center mb-6" },
                e.createElement(
                  "div",
                  { className: "relative" },
                  e.createElement(
                    "div",
                    {
                      className:
                        "w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl",
                    },
                    e.createElement(pe, { className: "w-10 h-10 text-white" }),
                  ),
                  e.createElement(
                    "div",
                    {
                      className:
                        "absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg animate-bounce",
                    },
                    e.createElement(K, { className: "w-4 h-4 text-white" }),
                  ),
                ),
              ),
              e.createElement(
                "h1",
                {
                  className:
                    "text-3xl font-bold text-gray-900 dark:text-white text-center mb-3",
                },
                r("access_restricted") || "Access Restricted",
              ),
              e.createElement(
                "p",
                {
                  className:
                    "text-gray-600 dark:text-gray-300 text-center mb-8",
                },
                "Sign in to view personalized recommendations curated just for you",
              ),
              e.createElement(
                "div",
                { className: "space-y-3 mb-8" },
                [
                  { icon: he, text: "Personalized product picks" },
                  { icon: fe, text: "Based on your preferences" },
                  { icon: ve, text: "Real-time updates" },
                ].map((t, a) =>
                  e.createElement(
                    "div",
                    {
                      key: a,
                      className:
                        "flex items-center gap-3 text-gray-600 dark:text-gray-300",
                    },
                    e.createElement(
                      "div",
                      {
                        className:
                          "w-8 h-8 rounded-lg bg-blue-50 dark:bg-white/10 flex items-center justify-center",
                      },
                      e.createElement(t.icon, {
                        className: "w-4 h-4 text-blue-600 dark:text-purple-400",
                      }),
                    ),
                    e.createElement("span", { className: "text-sm" }, t.text),
                  ),
                ),
              ),
              e.createElement(
                o,
                {
                  onClick: () =>
                    i("/login", {
                      state: { returnTo: `${g.pathname}${g.search}` },
                    }),
                  className:
                    "w-full h-14 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white font-semibold text-lg rounded-xl shadow-lg shadow-blue-500/30 transition-all hover:scale-105",
                },
                e.createElement(we, { className: "w-5 h-5 mr-2" }),
                r("sign_in_to_continue") || "Sign In to Continue",
              ),
              e.createElement(
                "p",
                {
                  className:
                    "text-gray-500 dark:text-gray-400 text-center mt-6 text-sm",
                },
                "Don't have an account?",
                " ",
                e.createElement(
                  "span",
                  {
                    onClick: () => i("/signup"),
                    className:
                      "text-blue-600 dark:text-purple-300 hover:text-blue-700 dark:hover:text-purple-200 cursor-pointer font-medium",
                  },
                  r("create_one_now") || "Create one now",
                ),
              ),
            ),
          ),
        )
      : e.createElement(
          "div",
          {
            className:
              "min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 dark:from-slate-900 dark:via-gray-900 dark:to-slate-900 pb-24",
          },
          e.createElement(
            "div",
            {
              className:
                "sticky top-0 z-40 bg-gradient-to-r from-white/95 via-gray-50/95 to-white/95 dark:from-slate-900/95 dark:via-gray-900/95 dark:to-slate-900/95 backdrop-blur-xl border-b border-gray-200 dark:border-white/10",
            },
            e.createElement(
              "div",
              { className: "max-w-6xl mx-auto px-4 py-4" },
              e.createElement(
                "div",
                { className: "flex flex-wrap items-center justify-between gap-3" },
                e.createElement(
                  "div",
                  { className: "min-w-0" },
                  e.createElement(
                    "h1",
                    {
                      className:
                        "text-2xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent truncate",
                    },
                    r("for_you") || "For You",
                  ),
                  e.createElement(
                    "p",
                    {
                      className:
                        "text-sm text-gray-600 dark:text-gray-400 truncate",
                    },
                    d
                      ? `${C.length} ${tr("matches", "matches")}`
                      : tr("personalized_feed", "Personalized feed"),
                  ),
                ),
                e.createElement(
                  "div",
                  { className: "flex items-center gap-2" },
                  e.createElement(
                    o,
                    {
                      variant: "ghost",
                      size: "icon",
                      onClick: O,
                      disabled: ae || D,
                      className: `text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl ${ae || D ? "animate-spin" : ""}`,
                    },
                    e.createElement(X, { className: "h-5 w-5" }),
                  ),
                ),
              ),
            ),
          ),
          e.createElement(
            "div",
            { className: "px-4 pt-4" },
            e.createElement(
              "div",
              { className: "max-w-6xl mx-auto flex flex-wrap gap-2" },
              e.createElement(
                o,
                {
                  type: "button",
                  variant: "outline",
                  className: "border-blue-200 text-blue-700",
                  onClick: () => i("/search?context=for-you"),
                },
                tr("search_listings", "Search Listings"),
              ),
              e.createElement(
                o,
                {
                  type: "button",
                  variant: "outline",
                  className: "border-blue-200 text-blue-700",
                  onClick: () => i("/categories"),
                },
                r("categories") || "Categories",
              ),
              e.createElement(
                o,
                {
                  type: "button",
                  variant: "outline",
                  className: "border-blue-200 text-blue-700",
                  onClick: () => i("/all-posts"),
                },
                tr("browse_all", "Browse All"),
              ),
            ),
          ),
          _ &&
            e.createElement(
              "div",
              { className: "px-4 pt-3" },
              e.createElement(
                "div",
                {
                  className:
                    "max-w-6xl mx-auto bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2",
                },
                e.createElement(
                  "p",
                  { className: "text-sm text-amber-800 dark:text-amber-300" },
                  tr(
                    "for_you_filter_notice",
                    "Filters are active and may hide some recommendations.",
                  ),
                ),
                e.createElement(
                  o,
                  {
                    type: "button",
                    variant: "outline",
                    className: "border-amber-300 text-amber-800 w-fit",
                    onClick: E,
                  },
                  tr("clear_filters", "Clear filters"),
                ),
              ),
            ),
          e.createElement(
            "div",
            { className: "max-w-6xl mx-auto px-4 pt-4" },
          e.createElement(
            "div",
            { className: "mb-6" },
            e.createElement(
              "div",
              {
                className:
                  "flex items-center justify-between mb-3 flex-wrap gap-2",
              },
              e.createElement(
                "h3",
                {
                  className:
                    "text-base md:text-lg font-bold text-gray-900 dark:text-white",
                },
                r("quick_filters") || "Quick filters",
              ),
              _ &&
                e.createElement(
                  "button",
                  {
                    onClick: E,
                    className:
                      "text-xs md:text-sm text-blue-600 dark:text-blue-300 hover:text-blue-700",
                  },
                  r("reset_filters") || "Reset filters",
                ),
            ),
            e.createElement(
              "div",
              { className: "flex flex-wrap gap-2" },
              e.createElement(
                o,
                {
                  type: "button",
                  variant: "outline",
                  className: `h-9 rounded-full border-blue-200 ${f === "" && v === "1000" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-blue-700 hover:bg-blue-50"}`,
                  onClick: () =>
                    updateQueryParams({ minPrice: "", maxPrice: "1000" }),
                },
                r("under_1000") || "Under 1000",
              ),
              e.createElement(
                o,
                {
                  type: "button",
                  variant: "outline",
                  className: `h-9 rounded-full border-blue-200 ${f === "500" && v === "2000" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-blue-700 hover:bg-blue-50"}`,
                  onClick: () =>
                    updateQueryParams({ minPrice: "500", maxPrice: "2000" }),
                },
                r("500_to_2k") || "₹500-₹2K",
              ),
              e.createElement(
                o,
                {
                  type: "button",
                  variant: "outline",
                  className: `h-9 rounded-full border-blue-200 ${f === "2000" && v === "10000" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-blue-700 hover:bg-blue-50"}`,
                  onClick: () =>
                    updateQueryParams({ minPrice: "2000", maxPrice: "10000" }),
                },
                r("2k_to_10k") || "₹2K-₹10K",
              ),
              e.createElement(
                o,
                {
                  type: "button",
                  variant: "outline",
                  className: `h-9 rounded-full border-blue-200 ${f === "10000" && v === "" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-blue-700 hover:bg-blue-50"}`,
                  onClick: () =>
                    updateQueryParams({ minPrice: "10000", maxPrice: "" }),
                },
                r("above_10k") || "Above ₹10K",
              ),
              e.createElement(
                o,
                {
                  type: "button",
                  variant: "outline",
                  disabled: !nearMeLocation,
                  className: `h-9 rounded-full border-blue-200 ${w && nearMeLocation && w === nearMeLocation ? "bg-blue-600 text-white border-blue-600" : "bg-white text-blue-700 hover:bg-blue-50"} ${nearMeLocation ? "" : "opacity-60"}`,
                  onClick: () =>
                    updateQueryParams({ location: nearMeLocation }),
                },
                r("near_me") || "Near me",
              ),
              _ &&
                e.createElement(
                  o,
                  {
                    type: "button",
                    variant: "outline",
                    className:
                      "h-9 rounded-full border-gray-200 bg-white text-gray-600 hover:bg-gray-50",
                    onClick: E,
                  },
                  r("clear") || "Clear",
                ),
            ),
          ),
          categories.length > 0 &&
            e.createElement(
              "div",
              { className: "mb-6" },
              e.createElement(
                "div",
                { className: "flex items-center justify-between mb-3" },
                e.createElement(
                  "h3",
                  {
                    className:
                      "text-base md:text-lg font-bold text-gray-900 dark:text-white",
                  },
                  r("popular_categories") || "Popular categories",
                ),
                e.createElement(
                  "button",
                  {
                    onClick: () => updateQueryParams({ category: "" }),
                    className:
                      "text-xs md:text-sm text-blue-600 dark:text-blue-300 hover:text-blue-700",
                  },
                  r("view_all") || "View all",
                ),
              ),
              e.createElement(CategoriesGrid, {
                onCategorySelect: handleCategorySelect,
                activeCategory: activeCategoryName,
              }),
            ),
          categories.length > 0 &&
            e.createElement(
              "div",
              { className: "mb-6" },
              e.createElement(
                "div",
                { className: "flex items-center justify-between mb-3" },
                e.createElement(
                  "h3",
                  {
                    className:
                      "text-base md:text-lg font-bold text-gray-900 dark:text-white",
                  },
                  r("categories") || "Categories",
                ),
                e.createElement(
                  "button",
                  {
                    onClick: () => updateQueryParams({ category: "" }),
                    className:
                      "text-xs md:text-sm text-blue-600 dark:text-blue-300 hover:text-blue-700",
                  },
                  r("view_all") || "View all",
                ),
              ),
              e.createElement(
                "div",
                {
                  className:
                    "flex gap-2 overflow-x-auto pb-1 scrollbar-hide",
                },
                e.createElement(
                  "button",
                  {
                    onClick: () => updateQueryParams({ category: "" }),
                    className: `px-4 py-2 rounded-xl font-semibold text-sm border ${
                      h
                        ? "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                        : "bg-blue-600 text-white border-blue-600 shadow"
                    }`,
                  },
                  r("all") || "All",
                ),
                  categories.map((t) => {
                    const a = String(t.category_id || t.id || t.name || "");
                    const n = String(t.name || t.title || "");
                    const s =
                      h === a ||
                      (n && h === n) ||
                      (n && activeCategoryName === n) ||
                      activeCategoryName === a;
                    return e.createElement(
                      "button",
                      {
                        key: a || t.name,
                        onClick: () => updateQueryParams({ category: a }),
                        className: `px-4 py-2 rounded-xl font-medium text-sm border transition-all ${
                          s
                            ? "bg-blue-600 text-white border-blue-600 shadow"
                            : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/60"
                        }`,
                      },
                      t.name || t.title || a,
                    );
                  }),
                ),
              ),
            (trendLoading || trendPosts.length > 0) &&
              e.createElement(
                "div",
                { className: "mb-6" },
                e.createElement(
                  "div",
                  { className: "flex items-center justify-between mb-3" },
                  e.createElement(
                    "h3",
                    {
                      className:
                        "text-base md:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2",
                    },
                    e.createElement(fe, {
                      className: "h-4 w-4 text-orange-400",
                    }),
                    r("trending_now") || "Trending Now",
                  ),
                  e.createElement(
                    "button",
                    {
                      onClick: () =>
                        i("/all-posts?sortBy=views_count&sortOrder=desc"),
                      className:
                        "text-xs md:text-sm text-blue-600 dark:text-blue-300 hover:text-blue-700 flex items-center gap-1",
                    },
                    r("view_all") || "View all",
                  ),
                ),
                trendLoading
                  ? e.createElement(
                      "div",
                      {
                        className:
                          "flex gap-3 overflow-x-auto pb-2 scrollbar-hide",
                      },
                      [1, 2, 3].map((t) =>
                        e.createElement(
                          "div",
                          {
                            key: t,
                            className:
                              "flex-shrink-0 w-40 h-24 rounded-xl bg-white/70 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/50 animate-pulse",
                          },
                          e.createElement("div", {
                            className:
                              "h-full w-full rounded-xl bg-gray-200/70 dark:bg-gray-700/60",
                          }),
                        ),
                      ),
                    )
                  : e.createElement(
                      "div",
                      {
                        className:
                          "flex gap-3 overflow-x-auto pb-2 scrollbar-hide",
                      },
                      trendPosts.map((t, a) =>
                        e.createElement(
                          "div",
                          {
                            key: t.post_id || t.id || a,
                            onClick: () =>
                              i(`/post/${t.post_id || t.id}`),
                            className:
                              "flex-shrink-0 w-40 bg-white dark:bg-gray-800/60 rounded-xl p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-all border border-gray-200 dark:border-gray-700/50 shadow-sm",
                          },
                          e.createElement(
                            "div",
                            { className: "flex items-center gap-2 mb-2" },
                            e.createElement(
                              "span",
                              { className: "text-orange-400 font-bold text-lg" },
                              "#",
                              a + 1,
                            ),
                            e.createElement(fe, {
                              className: "h-4 w-4 text-orange-400",
                            }),
                          ),
                          e.createElement(
                            "p",
                            {
                              className:
                                "text-gray-900 dark:text-white text-sm font-medium truncate",
                            },
                            t.title,
                          ),
                          e.createElement(
                            "p",
                            { className: "text-emerald-400 font-bold text-sm mt-1" },
                            formatPrice(t.price),
                          ),
                        ),
                      ),
                    ),
              ),
            e.createElement(
              "div",
              { className: "mb-8" },
                e.createElement(
                "h3",
                {
                  className:
                    "text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-3 md:mb-4",
                },
                r("sponsored_deals"),
              ),
              e.createElement(
                "div",
                { className: "text-center text-blue-400 dark:text-blue-300" },
                r("no_sponsored_deals"),
              ),
            ),
            d
              ? e.createElement(
                  "div",
                  { className: "mb-4 flex items-center gap-2 flex-wrap" },
                  e.createElement(
                    "span",
                    { className: "text-sm text-gray-600 dark:text-gray-400" },
                    r("search_results_for") || "Search results for",
                    ":",
                  ),
                  e.createElement(
                    "span",
                    {
                      className:
                        "inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium",
                    },
                    '"',
                    d,
                    '"',
                    e.createElement(
                      "button",
                      {
                        onClick: me,
                        className:
                          "p-0.5 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full transition",
                        "aria-label": "Clear search",
                      },
                      e.createElement(
                        "svg",
                        {
                          className: "w-4 h-4",
                          fill: "none",
                          viewBox: "0 0 24 24",
                          stroke: "currentColor",
                        },
                        e.createElement("path", {
                          strokeLinecap: "round",
                          strokeLinejoin: "round",
                          strokeWidth: 2,
                          d: "M6 18L18 6M6 6l12 12",
                        }),
                      ),
                    ),
                  ),
                )
              : null,
            e.createElement(
              "h3",
              {
                className:
                  "text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-4",
              },
              d
                ? r("search_results") || "Search Results"
                : r("for_you") || "For You",
            ),
            de
              ? e.createElement(
                  "p",
                  {
                    className: "mb-4 text-sm text-blue-700 dark:text-blue-300",
                  },
                  "Updating post language...",
                )
              : null,
            L && C.length > 0
              ? e.createElement(
                  ke,
                  { variant: "destructive", className: "mb-5" },
                  e.createElement(Q, { className: "h-4 w-4" }),
                  e.createElement(Ce, null, "Latest refresh failed"),
                  e.createElement(Pe, null, L),
                  e.createElement(
                    "div",
                    { className: "mt-3 flex flex-wrap gap-2" },
                    e.createElement(
                      o,
                      { size: "sm", onClick: O },
                      e.createElement(X, { className: "w-4 h-4 mr-2" }),
                      "Retry",
                    ),
                    _
                      ? e.createElement(
                          o,
                          { size: "sm", variant: "outline", onClick: E },
                          e.createElement(F, { className: "w-4 h-4 mr-2" }),
                          "Reset Filters",
                        )
                      : null,
                  ),
                )
              : null,
            ae
              ? e.createElement(
                  "div",
                  { className: "flex flex-col gap-6 w-full max-w-5xl mx-auto" },
                  [1, 2, 3].map((t) =>
                    e.createElement(
                      "div",
                      {
                        key: t,
                        className:
                          "bg-white dark:bg-gray-800 rounded-2xl p-4 h-96 animate-pulse",
                      },
                      e.createElement("div", {
                        className:
                          "h-12 w-full bg-gray-200 dark:bg-gray-700 rounded-lg mb-4",
                      }),
                      e.createElement("div", {
                        className:
                          "h-64 bg-gray-200 dark:bg-gray-700 rounded-lg mb-4",
                      }),
                      e.createElement("div", {
                        className:
                          "h-10 w-full bg-gray-200 dark:bg-gray-700 rounded-lg",
                      }),
                    ),
                  ),
                )
              : L && C.length === 0
                ? e.createElement(
                    ee,
                    {
                      className:
                        "max-w-2xl mx-auto p-6 text-center border-red-200",
                    },
                    e.createElement(
                      "div",
                      {
                        className:
                          "w-12 h-12 mx-auto rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-3",
                      },
                      e.createElement(Q, { className: "w-6 h-6" }),
                    ),
                    e.createElement(
                      "h4",
                      {
                        className:
                          "text-lg font-semibold text-gray-900 dark:text-white mb-2",
                      },
                      "Could not load recommendations",
                    ),
                    e.createElement(
                      "p",
                      {
                        className:
                          "text-sm text-gray-600 dark:text-gray-300 mb-5",
                      },
                      L,
                    ),
                    e.createElement(
                      "div",
                      { className: "flex flex-wrap justify-center gap-2" },
                      e.createElement(
                        o,
                        { onClick: O },
                        e.createElement(X, { className: "w-4 h-4 mr-2" }),
                        "Retry",
                      ),
                      _
                        ? e.createElement(
                            o,
                            { variant: "outline", onClick: E },
                            e.createElement(F, { className: "w-4 h-4 mr-2" }),
                            "Reset Filters",
                          )
                        : null,
                      e.createElement(
                        o,
                        { variant: "outline", onClick: () => i("/all-posts") },
                        "Explore Marketplace",
                      ),
                    ),
                  )
                : C.length === 0
                  ? e.createElement(
                      "div",
                      { className: "text-center py-20" },
                      e.createElement(
                        "div",
                        {
                          className:
                            "w-24 h-24 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6",
                        },
                        e.createElement(K, {
                          className: "w-12 h-12 text-blue-500",
                        }),
                      ),
                      e.createElement(
                        "h3",
                        {
                          className:
                            "text-xl font-bold text-gray-900 dark:text-white mb-2",
                        },
                        r("no_recommendations"),
                      ),
                      e.createElement(
                        "p",
                        { className: "text-gray-500 dark:text-gray-400 mb-5" },
                        _
                          ? "No matches found for your current filters."
                          : "Interact with more posts to get personalized picks.",
                      ),
                      e.createElement(
                        "div",
                        { className: "flex flex-wrap justify-center gap-2" },
                        _
                          ? e.createElement(
                              o,
                              { variant: "outline", onClick: E },
                              e.createElement(F, { className: "w-4 h-4 mr-2" }),
                              "Reset Filters",
                            )
                          : null,
                        e.createElement(
                          o,
                          { onClick: () => i("/all-posts") },
                          "Browse All Posts",
                        ),
                      ),
                    )
                  : e.createElement(
                      e.Fragment,
                      null,
                      e.createElement(
                        "div",
                        {
                          className:
                            "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 w-full",
                        },
                        ne.map((t) => {
                          const a = t.images?.[0]
                            ? G(t.images[0])
                            : t.image_url
                              ? G(t.image_url)
                              : "/placeholder.svg";
                          return e.createElement(
                            ee,
                            {
                              key: t.post_id || t.id,
                              className:
                                "group bg-white dark:bg-gradient-to-br dark:from-gray-800/80 dark:to-gray-900/80 border-gray-200 dark:border-gray-700/50 overflow-hidden cursor-pointer hover:border-blue-400 dark:hover:border-blue-500/50 hover:shadow-xl dark:hover:shadow-2xl dark:hover:shadow-blue-500/10 transition-all duration-300 rounded-2xl shadow-sm",
                              onClick: () => i(`/post/${t.post_id || t.id}`),
                            },
                            e.createElement(
                              "div",
                              {
                                className:
                                  "relative aspect-[4/3] overflow-hidden",
                              },
                              e.createElement("img", {
                                src: a,
                                alt: t.title,
                                className:
                                  "w-full h-full object-cover group-hover:scale-110 transition-transform duration-500",
                                onError: (s) => {
                                  (s.target.onerror = null),
                                    (s.target.src = "/placeholder.svg");
                                },
                              }),
                              e.createElement("div", {
                                className:
                                  "absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent",
                              }),
                              e.createElement(
                                "div",
                                { className: "absolute top-3 left-3" },
                                e.createElement(
                                  "span",
                                  {
                                    className:
                                      "px-2.5 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-semibold rounded-full backdrop-blur-sm shadow-sm",
                                  },
                                  t.category || t.category_name || "General",
                                ),
                              ),
                              e.createElement(
                                "div",
                                { className: "absolute bottom-3 left-3" },
                                e.createElement(
                                  "p",
                                  {
                                    className:
                                      "text-2xl font-bold text-white drop-shadow-lg",
                                  },
                                  "INR ",
                                  t.price?.toLocaleString() || "0",
                                ),
                              ),
                              e.createElement(
                                "button",
                                {
                                  className:
                                    "absolute top-3 right-3 w-8 h-8 bg-white/90 dark:bg-gray-900/90 rounded-full flex items-center justify-center shadow-sm hover:bg-red-50 dark:hover:bg-red-900/50 transition-colors",
                                  onClick: (s) => {
                                    s.stopPropagation();
                                  },
                                },
                                e.createElement(
                                  "svg",
                                  {
                                    className:
                                      "w-4 h-4 text-gray-400 hover:text-red-500",
                                    fill: "none",
                                    stroke: "currentColor",
                                    viewBox: "0 0 24 24",
                                  },
                                  e.createElement("path", {
                                    strokeLinecap: "round",
                                    strokeLinejoin: "round",
                                    strokeWidth: 2,
                                    d: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
                                  }),
                                ),
                              ),
                            ),
                            e.createElement(
                              "div",
                              { className: "p-4" },
                              e.createElement(
                                "div",
                                {
                                  className:
                                    "flex items-start justify-between gap-2 mb-3",
                                },
                                e.createElement(
                                  "h3",
                                  {
                                    className:
                                      "text-gray-900 dark:text-white font-semibold text-lg truncate mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors",
                                  },
                                  t.title,
                                ),
                              ),
                              t.location
                                ? e.createElement(
                                    "div",
                                    {
                                      className:
                                        "flex items-center gap-1 text-gray-500 dark:text-gray-400 text-xs mb-3",
                                    },
                                    e.createElement(
                                      "svg",
                                      {
                                        className: "w-3.5 h-3.5",
                                        fill: "none",
                                        stroke: "currentColor",
                                        viewBox: "0 0 24 24",
                                      },
                                      e.createElement("path", {
                                        strokeLinecap: "round",
                                        strokeLinejoin: "round",
                                        strokeWidth: 2,
                                        d: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z",
                                      }),
                                      e.createElement("path", {
                                        strokeLinecap: "round",
                                        strokeLinejoin: "round",
                                        strokeWidth: 2,
                                        d: "M15 11a3 3 0 11-6 0 3 3 0 016 0z",
                                      }),
                                    ),
                                    e.createElement(
                                      "span",
                                      { className: "truncate" },
                                      t.location,
                                    ),
                                  )
                                : null,
                              e.createElement(
                                "div",
                                {
                                  className:
                                    "flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700",
                                },
                                e.createElement(
                                  "div",
                                  { className: "flex items-center gap-2" },
                                  e.createElement(
                                    ye,
                                    { className: "w-7 h-7" },
                                    e.createElement(
                                      Ne,
                                      {
                                        className:
                                          "bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs font-medium",
                                      },
                                      (t.author_name ||
                                        t.seller_name ||
                                        "S")[0].toUpperCase(),
                                    ),
                                  ),
                                  e.createElement(
                                    "span",
                                    {
                                      className:
                                        "text-gray-600 dark:text-gray-300 text-xs font-medium truncate max-w-[100px]",
                                    },
                                    t.author_name ||
                                      t.seller_name ||
                                      t.username ||
                                      "Seller",
                                  ),
                                ),
                                e.createElement(
                                  o,
                                  {
                                    size: "sm",
                                    className:
                                      "bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 h-auto rounded-lg shadow-sm",
                                    onClick: (s) => {
                                      s.stopPropagation(),
                                        i(`/post/${t.post_id || t.id}`);
                                    },
                                  },
                                  r("view_details") || "View",
                                ),
                              ),
                            ),
                          );
                        }),
                      ),
                      ie
                        ? e.createElement(
                            "div",
                            { className: "flex justify-center pt-8 pb-4" },
                            e.createElement(
                              o,
                              {
                                onClick: () => Y((t) => t + 1),
                                disabled: D,
                                className:
                                  "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-gray-700 px-8 py-2 rounded-full shadow-sm transition-all",
                              },
                              D
                                ? e.createElement(
                                    e.Fragment,
                                    null,
                                    e.createElement("div", {
                                      className:
                                        "w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2",
                                    }),
                                    r("loading") || "Loading...",
                                  )
                                : r("load_more") || "Load More",
                            ),
                          )
                        : null,
                    ),
          ),
          ),
        );
  };
var Ve = Ee;
export { Ve as default };


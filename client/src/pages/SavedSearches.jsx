import e, {
  useState as d,
  useEffect as M,
  useRef as T,
  useCallback as q,
  useMemo as $,
} from "react";
import { Button as t } from "@/components/ui/button";
import { Card as D } from "@/components/ui/card";
import { Badge as C } from "@/components/ui/badge";
import { Input as c } from "@/components/ui/input";
import {
  Search as u,
  Trash2 as E,
  Bell as U,
  BellOff as K,
  Plus as z,
  ArrowLeft as O,
  MapPin as V,
  Save as G,
  RefreshCw as F,
  Compass as H,
  LogIn as J,
} from "lucide-react";
import { useNavigate as W } from "react-router-dom";
import h from "../lib/api";
import { useAuth as X } from "@/context/AuthContext";
import { useCategoryMode } from "@/context/CategoryModeContext";
import { isAuthenticated as Y } from "@/utils/authStorage";
import { navigateBack } from "@/utils/navigation";
import { useTranslation as te } from "react-i18next";
const Z = () => {
  const i = W(),
    { t: trn } = te(),
    tr = (key, fallback, options = {}) => trn(key, { defaultValue: fallback, ...options }),
    { user: S, loading: x } = X(),
    v = $(() => Y(S), [S]),
    { activeCategory: categoryModeCategory, hasSelection: hasCategoryMode } =
      useCategoryMode(),
    [b, m] = d([]),
    [j, f] = d(!0),
    [_, N] = d(""),
    [B, y] = d(!1),
    [w, P] = d(null),
    p = T(0),
    k = T(null),
    [s, n] = d({
      name: "",
      searchQuery: "",
      location: "",
      minPrice: "",
      maxPrice: "",
    }),
    l = q((r, a = "success") => {
      P({ message: r, type: a }),
        clearTimeout(k.current),
        (k.current = setTimeout(() => P(null), 3e3));
    }, []),
    g = q(async () => {
      const r = ++p.current;
      if (!v) {
        m([]), N(tr("saved_searches_sign_in", "Please sign in to view saved searches.")), f(!1);
        return;
      }
      try {
        f(!0), N("");
        const a = await h.get("/saved-searches");
        if (r !== p.current) return;
        const o = a?.data ?? a;
        m(Array.isArray(o?.searches) ? o.searches : []);
      } catch (a) {
        import.meta.env.DEV && console.error("Failed to fetch searches:", a),
          r === p.current &&
            (m([]), N(tr("saved_searches_load_failed", "Failed to load saved searches. Please retry.")));
      } finally {
        r === p.current && f(!1);
      }
    }, [v]);
  M(
    () => (
      x || g(),
      () => {
        clearTimeout(k.current);
      }
    ),
    [x, g],
  );
  const A = async () => {
      if (!s.name || !s.searchQuery) {
        l(tr("saved_searches_name_required", "Name and search query required"), "error");
        return;
      }
      try {
        await h.post("/saved-searches", s),
          l(tr("saved_searches_saved", "Search saved!")),
          y(!1),
          n({
            name: "",
            searchQuery: "",
            location: "",
            minPrice: "",
            maxPrice: "",
          }),
          await g();
      } catch {
        l(tr("saved_searches_save_failed", "Failed to save"), "error");
      }
    },
    Q = async (r) => {
      try {
        await h.delete(`/saved-searches/${r}`),
          m((a) => a.filter((o) => o.search_id !== r)),
          l(tr("saved_searches_deleted", "Search deleted"));
      } catch {
        l(tr("saved_searches_delete_failed", "Failed to delete"), "error");
      }
    },
    I = async (r) => {
      try {
        await h.patch(`/saved-searches/${r}/notifications`, {}),
          m((a) =>
            a.map((o) =>
              o.search_id === r
                ? {
                    ...o,
                    notification_enabled: !(
                      o.notification_enabled ?? o.notify_enabled
                    ),
                    notify_enabled: !(
                      o.notification_enabled ?? o.notify_enabled
                    ),
                  }
                : o,
            ),
          ),
          l(tr("saved_searches_notifications_updated", "Notifications updated"));
      } catch {
        l(tr("saved_searches_update_failed", "Failed to update"), "error");
      }
    },
    L = (r) => {
      const a = new URLSearchParams();
      r.search_query && a.set("q", r.search_query),
        r.location && a.set("location", r.location),
        r.min_price && a.set("minPrice", r.min_price),
        r.max_price && a.set("maxPrice", r.max_price);
      const o =
        r.category ||
        r.category_name ||
        r.categoryName ||
        (hasCategoryMode ? categoryModeCategory?.name : "");
      o && a.set("category", o),
        i(`/all-posts?${a.toString()}`);
    };
  return x
    ? e.createElement(
        "div",
        {
          className:
            "min-h-screen mhub-premium-page flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:bg-gradient-to-br",
        },
        e.createElement("div", {
          className:
            "animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 dark:border-purple-500/40",
        }),
      )
    : v
      ? e.createElement(
          "div",
          {
          className:
            "min-h-screen mhub-premium-page nav-clearance bg-gradient-to-br from-gray-50 to-gray-100 dark:bg-gradient-to-br",
          },
          e.createElement(
            "div",
            {
              className:
                "sticky z-50 mhub-premium-bar",
              style: { top: "var(--top-nav-height, 60px)" },
            },
            e.createElement(
              "div",
              { className: "flex items-center justify-between px-4 py-3" },
              e.createElement(
                "div",
                { className: "flex items-center gap-3" },
                e.createElement(
                  t,
                  {
                    variant: "ghost",
                    size: "icon",
                    onClick: () => navigateBack(i),
                    className:
                      "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white dark:text-gray-200 dark:hover:text-gray-100",
                  },
                  e.createElement(O, { className: "h-5 w-5" }),
                ),
                e.createElement(
                  "div",
                  null,
                  e.createElement(
                    "h1",
                    {
                      className:
                        "text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 dark:text-gray-100",
                    },
                    e.createElement(u, {
                      className: "h-5 w-5 text-purple-400 dark:text-purple-200",
                    }),
                    tr("saved_searches_title", "Saved Searches"),
                  ),
                  e.createElement(
                    "p",
                    { className: "text-xs text-gray-500 dark:text-gray-300" },
                    b.length,
                    ` ${tr("saved_searches_saved_suffix", "saved")}`,
                  ),
                ),
              ),
              e.createElement(
                t,
                {
                  type: "button",
                  variant: "outline",
                  size: "sm",
                  onClick: g,
                  className:
                    "border-gray-300 text-gray-600 dark:border-gray-600 dark:text-gray-200",
                },
                e.createElement(F, { className: "h-4 w-4 mr-1" }),
                "Refresh",
              ),
              e.createElement(
                t,
                {
                  onClick: () => y(!B),
                  className: "bg-purple-600 hover:bg-purple-700 dark:bg-purple-700/40 dark:hover:bg-purple-700/40",
                  size: "sm",
                },
                e.createElement(z, { className: "h-4 w-4 mr-1" }),
                "New",
              ),
            ),
            hasCategoryMode &&
              categoryModeCategory?.name &&
              e.createElement(
                "div",
                { className: "px-4 pb-3" },
                e.createElement(
                  "div",
                  {
                    className:
                      "rounded-2xl border border-indigo-100 bg-indigo-50/70 dark:border-indigo-900/40 dark:bg-gray-900/70 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 dark:border-indigo-600/40 dark:bg-indigo-950/70",
                  },
                  e.createElement(
                    "div",
                    null,
                    e.createElement(
                      "p",
                      {
                        className:
                          "text-sm font-semibold text-slate-900 dark:text-slate-100",
                      },
                      "Category mode: ",
                      categoryModeCategory.name,
                    ),
                    e.createElement(
                      "p",
                      {
                        className:
                          "text-xs text-slate-500 dark:text-slate-300",
                      },
                      tr(
                        "saved_searches_category_notice",
                        "Saved searches will run inside this category.",
                      ),
                    ),
                  ),
                  e.createElement(
                    t,
                    {
                      type: "button",
                      variant: "outline",
                      size: "sm",
                      className: "border-indigo-200 text-indigo-700 w-fit dark:border-indigo-600/40 dark:text-indigo-300",
                      onClick: () => i("/category-mode"),
                    },
                    "Switch category",
                  ),
                ),
              ),
            B &&
              e.createElement(
                "div",
                {
                  className:
                    "p-4 mhub-premium-surface border-b border-gray-200 dark:border-b",
                },
                e.createElement(
                  "div",
                  { className: "space-y-3" },
                  e.createElement(c, {
                    placeholder: tr(
                      "saved_search_name_placeholder",
                      "Search name (e.g., 'Cheap iPhones')",
                    ),
                    value: s.name,
                    onChange: (r) => n({ ...s, name: r.target.value }),
                    className:
                      "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white dark:bg-gray-950 dark:border-gray-700 dark:text-gray-100",
                  }),
                  e.createElement(c, {
                    placeholder: tr(
                      "saved_search_keywords_placeholder",
                      "Search keywords (e.g., 'iPhone 14')",
                    ),
                    value: s.searchQuery,
                    onChange: (r) => n({ ...s, searchQuery: r.target.value }),
                    className:
                      "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white dark:bg-gray-950 dark:border-gray-700 dark:text-gray-100",
                  }),
                  e.createElement(
                    "div",
                    { className: "flex gap-2" },
                    e.createElement(c, {
                      placeholder: "Location",
                      value: s.location,
                      onChange: (r) => n({ ...s, location: r.target.value }),
                      className:
                        "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white dark:bg-gray-950 dark:border-gray-700 dark:text-gray-100",
                    }),
                  ),
                  e.createElement(
                    "div",
                    { className: "flex gap-2" },
                    e.createElement(c, {
                      type: "number",
                      placeholder: "Min price",
                      value: s.minPrice,
                      onChange: (r) => n({ ...s, minPrice: r.target.value }),
                      className:
                        "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white dark:bg-gray-950 dark:border-gray-700 dark:text-gray-100",
                    }),
                    e.createElement(c, {
                      type: "number",
                      placeholder: "Max price",
                      value: s.maxPrice,
                      onChange: (r) => n({ ...s, maxPrice: r.target.value }),
                      className:
                        "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white dark:bg-gray-950 dark:border-gray-700 dark:text-gray-100",
                    }),
                  ),
                  e.createElement(
                    "div",
                    { className: "flex gap-2" },
                    e.createElement(
                      t,
                      {
                        onClick: A,
                        className: "flex-1 bg-purple-600 hover:bg-purple-700 dark:bg-purple-700/40 dark:hover:bg-purple-700/40",
                      },
                      e.createElement(G, { className: "h-4 w-4 mr-1" }),
                      tr("save_search", "Save Search"),
                    ),
                    e.createElement(
                      t,
                      {
                        variant: "outline",
                        onClick: () => y(!1),
                        className:
                          "border-gray-300 text-gray-600 dark:border-gray-600 dark:text-gray-200",
                      },
                      "Cancel",
                    ),
                  ),
                ),
              ),
          ),
          e.createElement(
            "div",
            { className: "p-4 pb-24" },
            j
              ? e.createElement(
                  "div",
                  { className: "flex justify-center items-center h-64" },
                  e.createElement("div", {
                    className:
                      "animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 dark:border-purple-500/40",
                  }),
                )
              : _
                ? e.createElement(
                    "div",
                    { className: "text-center py-16" },
                    e.createElement(u, {
                      className: "h-16 w-16 mx-auto text-red-400 mb-4 dark:text-red-200",
                    }),
                    e.createElement(
                      "h3",
                      {
                        className:
                          "text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2 dark:text-gray-200",
                      },
                      tr("saved_searches_load_failed_title", "Unable to load saved searches"),
                    ),
                    e.createElement(
                      "p",
                      { className: "text-gray-500 dark:text-gray-500 mb-6 dark:text-gray-300" },
                      _,
                    ),
                    e.createElement(
                      "div",
                      { className: "flex flex-wrap justify-center gap-2" },
                      e.createElement(
                        t,
                        {
                          onClick: g,
                          className: "bg-purple-600 hover:bg-purple-700 dark:bg-purple-700/40 dark:hover:bg-purple-700/40",
                        },
                        e.createElement(F, { className: "h-4 w-4 mr-1" }),
                        tr("retry", "Retry"),
                      ),
                      e.createElement(
                        t,
                        {
                          type: "button",
                          variant: "outline",
                          onClick: () => i("/all-posts"),
                        },
                        "Browse Listings",
                      ),
                    ),
                  )
                : b.length === 0
                  ? e.createElement(
                      "div",
                      { className: "text-center py-16" },
                      e.createElement(u, {
                        className: "h-16 w-16 mx-auto text-gray-600 mb-4 dark:text-gray-200",
                      }),
                      e.createElement(
                        "h3",
                        {
                          className:
                            "text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2 dark:text-gray-200",
                        },
                        tr("no_saved_searches", "No Saved Searches"),
                      ),
                      e.createElement(
                        "p",
                        { className: "text-gray-500 dark:text-gray-500 mb-6 dark:text-gray-300" },
                        tr(
                          "saved_searches_empty_message",
                          "Save your searches to get alerts when new posts match",
                        ),
                      ),
                      e.createElement(
                        "div",
                        { className: "flex flex-wrap justify-center gap-2" },
                        e.createElement(
                          t,
                          {
                            onClick: () => y(!0),
                            className: "bg-purple-600 hover:bg-purple-700 dark:bg-purple-700/40 dark:hover:bg-purple-700/40",
                          },
                          e.createElement(z, { className: "h-4 w-4 mr-1" }),
                          tr("create_first_search", "Create First Search"),
                        ),
                        e.createElement(
                          t,
                          {
                            type: "button",
                            variant: "outline",
                            onClick: () => i("/all-posts"),
                          },
                          "Browse Listings",
                        ),
                        e.createElement(
                          t,
                          {
                            type: "button",
                            variant: "outline",
                            onClick: () => i("/for-you"),
                          },
                          e.createElement(H, { className: "h-4 w-4 mr-1" }),
                          "For You",
                        ),
                      ),
                    )
                  : e.createElement(
                      "div",
                      { className: "space-y-3" },
                      b.map((r) =>
                        e.createElement(
                          D,
                          {
                            key: r.search_id,
                            className:
                              "mhub-premium-surface border-gray-200 dark:border-gray-700 overflow-hidden",
                          },
                          e.createElement(
                            "div",
                            { className: "p-4" },
                            e.createElement(
                              "div",
                              { className: "flex items-start justify-between" },
                              e.createElement(
                                "div",
                                { className: "flex-1", onClick: () => L(r) },
                                e.createElement(
                                  "h3",
                                  {
                                    className:
                                      "text-gray-900 dark:text-white font-semibold flex items-center gap-2 cursor-pointer hover:text-purple-600 dark:hover:text-purple-400 dark:text-gray-100 dark:hover:text-purple-300",
                                  },
                                  r.search_name || r.name,
                                ),
                                e.createElement(
                                  "p",
                                  {
                                    className:
                                      "text-sm text-gray-600 dark:text-gray-400 mt-1 dark:text-gray-200",
                                  },
                                  "Keywords: ",
                                  r.search_query,
                                ),
                                e.createElement(
                                  "div",
                                  { className: "flex flex-wrap gap-2 mt-2" },
                                  r.location &&
                                    e.createElement(
                                      C,
                                      {
                                        variant: "outline",
                                        className:
                                          "text-xs border-gray-300 text-gray-600 dark:border-gray-600 dark:text-gray-200",
                                      },
                                      e.createElement(V, {
                                        className: "h-3 w-3 mr-1",
                                      }),
                                      r.location,
                                    ),
                                  (r.min_price || r.max_price) &&
                                    e.createElement(
                                      C,
                                      {
                                        variant: "outline",
                                        className:
                                          "text-xs border-gray-600 text-gray-300 dark:border-gray-500 dark:text-gray-300",
                                      },
                                      "\u20B9",
                                      r.min_price || 0,
                                      " - \u20B9",
                                      r.max_price || "\u221E",
                                    ),
                                  r.matches_count > 0 &&
                                    e.createElement(
                                      C,
                                      { className: "bg-green-600 dark:bg-green-700/40" },
                                      r.matches_count,
                                      " matches",
                                    ),
                                ),
                              ),
                              e.createElement(
                                "div",
                                { className: "flex gap-1" },
                                e.createElement(
                                  t,
                                  {
                                    variant: "ghost",
                                    size: "icon",
                                    onClick: () => I(r.search_id),
                                    className:
                                      r.notification_enabled ?? r.notify_enabled
                                        ? "text-green-400"
                                        : "text-gray-500",
                                  },
                                  r.notification_enabled ?? r.notify_enabled
                                    ? e.createElement(U, {
                                        className: "h-5 w-5",
                                      })
                                    : e.createElement(K, {
                                        className: "h-5 w-5",
                                      }),
                                ),
                                e.createElement(
                                  t,
                                  {
                                    variant: "ghost",
                                    size: "icon",
                                    onClick: () => Q(r.search_id),
                                    className:
                                      "text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 dark:text-gray-300 dark:hover:text-red-300",
                                  },
                                  e.createElement(E, { className: "h-5 w-5" }),
                                ),
                              ),
                            ),
                            e.createElement(
                              t,
                              {
                                variant: "outline",
                                size: "sm",
                                onClick: () => L(r),
                                className:
                                  "mt-3 w-full border-purple-500 text-purple-400 hover:bg-purple-500/20 dark:border-purple-500/40 dark:text-purple-200 dark:hover:bg-purple-800/20",
                              },
                              e.createElement(u, { className: "h-4 w-4 mr-1" }),
                              tr("run_this_search", "Run This Search"),
                            ),
                          ),
                        ),
                      ),
                    ),
          ),
          w &&
            e.createElement(
              "div",
              {
                className: `fixed bottom-24 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-lg shadow-lg z-50 ${w.type === "error" ? "bg-red-600" : "bg-green-600"} text-white text-sm dark:text-white`,
              },
              w.message,
            ),
        )
      : e.createElement(
          "div",
          {
            className:
              "min-h-screen mhub-premium-page bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4 dark:bg-gradient-to-br",
          },
          e.createElement(
            "div",
            {
              className:
                "bg-white/10 backdrop-blur-2xl rounded-3xl p-8 border border-white/20 shadow-2xl max-w-md w-full text-center dark:bg-slate-900/10 dark:border-white/20",
            },
            e.createElement(u, {
              className: "w-16 h-16 text-purple-300 mx-auto mb-4 dark:text-purple-200",
            }),
            e.createElement(
              "h1",
              { className: "text-lg sm:text-2xl font-bold text-white mb-3 dark:text-white" },
              tr("saved_searches_sign_in_title", "Sign in to manage saved searches"),
            ),
            e.createElement(
              "p",
              { className: "text-gray-300 mb-6 dark:text-gray-300" },
              "Track market changes automatically for your favorite keywords.",
            ),
            e.createElement(
              "div",
              { className: "flex flex-col gap-2" },
              e.createElement(
                t,
                {
                  onClick: () =>
                    i("/login", { state: { returnTo: "/saved-searches" } }),
                  className:
                    "w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white py-6 text-lg rounded-xl dark:bg-gradient-to-r dark:text-white",
                },
                e.createElement(J, { className: "h-4 w-4 mr-2" }),
                tr("sign_in", "Sign In"),
              ),
              e.createElement(
                t,
                {
                  type: "button",
                  variant: "outline",
                  className: "border-white/40 text-white dark:border-white/40 dark:text-white",
                  onClick: () => i("/all-posts"),
                },
                "Browse Listings",
              ),
            ),
          ),
        );
};
var de = Z;
export { de as default };

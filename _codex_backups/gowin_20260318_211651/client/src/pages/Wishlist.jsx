import e, {
  useState as v,
  useEffect as S,
  useRef as I,
  useCallback as L,
  useMemo as z,
} from "react";
import { Button as a } from "@/components/ui/button";
import { Card as j } from "@/components/ui/card";
import { Badge as A } from "@/components/ui/badge";
import {
  Heart as b,
  Trash2 as E,
  Star as Z,
  Image as X,
  MapPin as D,
  ShoppingBag as W,
  ExternalLink as P,
  RefreshCw as U,
  Compass as $,
  ShoppingCart as CartIcon,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import T from "../components/PageHeader";
import { useNavigate as V } from "react-router-dom";
import N from "../lib/api";
import { useTranslation as q } from "react-i18next";
import { useTranslatedPosts as F } from "@/hooks/useTranslatedContent";
import {
  beginSavedPostMutation,
  endSavedPostMutation,
  extractSavedPostIds,
  replaceSavedPostIds,
  setSavedPostStatus,
  subscribeSavedPosts,
} from "@/utils/savedPosts";
import { useAuth as H } from "@/context/AuthContext";
import { useCategoryMode } from "@/context/CategoryModeContext";
import { getUserId as M, isAuthenticated as G } from "@/utils/authStorage";
import { getApiOriginBase as O } from "@/lib/networkConfig";
import {
  buildActiveAppMatcher,
  matchesCategoryModeItem,
} from "@/utils/categoryModeFilters";
const Y = () => {
  const { t: s } = q(),
    o = V(),
    { user: w, loading: p } = H(),
    { addItem: addToCart, isInCart } = useCart(),
    {
      activeCategory: categoryModeCategory,
      activeApp,
      hasSelection: hasCategoryMode,
      categories: categoryModeCategories,
    } =
      useCategoryMode(),
    [g, u] = v([]),
    [_, c] = v(!0),
    [y, x] = v(null),
    l = I(0),
    savedIdsRef = I(new Set()),
    syncingRef = I(0),
    f = G(w),
    i = M(w),
    { translatedPosts: Qe, isTranslating: Je } = F(g),
    h = L(async () => {
      const t = ++l.current;
      c(!0);
      syncingRef.current += 1;
      try {
        const r = await N.get("/wishlist", { params: { userId: i } });
        if (t !== l.current) return;
        const n = r?.data ?? r;
        const d = Array.isArray(n?.items) ? n.items : [];
        const I = extractSavedPostIds(d);
        savedIdsRef.current = new Set(I);
        replaceSavedPostIds(I), u(d), x(null);
      } catch (r) {
        import.meta.env.DEV && console.error("Failed to fetch wishlist:", r),
          t === l.current && (x(s("failed_load_wishlist")), u([]));
      } finally {
        t === l.current && c(!1);
        syncingRef.current = Math.max(0, syncingRef.current - 1);
      }
    }, [s, i]);
  S(() => {
    if (p || !f || !i) {
      c(!1);
      return;
    }
    h();
  }, [p, h, f, i]);
  S(() => {
    if (!f || !i) {
      savedIdsRef.current = new Set();
      return;
    }
    return subscribeSavedPosts((map) => {
      const ids = new Set(Object.keys(map || {}));
      if (syncingRef.current > 0) {
        savedIdsRef.current = ids;
        return;
      }
      const previousIds = savedIdsRef.current;
      let hasNew = false;
      ids.forEach((id) => {
        if (!previousIds.has(id)) {
          hasNew = true;
        }
      });
      savedIdsRef.current = ids;
      u((prev) =>
        prev.filter((item) =>
          ids.has(String(item.post_id ?? item.id ?? item.postId)),
        ),
      );
      if (hasNew) {
        void h();
      }
    });
  }, [f, i, h]);
  const C = async (t) => {
      const mutationId = beginSavedPostMutation(t);
      if (!mutationId) return;
      try {
        await N.delete(`/wishlist/${mutationId}`, { params: { userId: i } }),
          u((r) =>
            r.filter((n) => String(n.post_id ?? n.id ?? n.postId) !== mutationId),
          ),
          setSavedPostStatus(mutationId, !1);
      } catch (r) {
        import.meta.env.DEV && console.error("Failed to remove:", r),
          x(
            s("failed_remove_wishlist_item") ||
              "Unable to remove item right now.",
          );
      } finally {
        endSavedPostMutation(mutationId);
      }
    },
    B = (t) => {
      const r = t.images?.[0] || t.image_url;
      return r ? (r.startsWith("http") ? r : `${O()}${r}`) : "/placeholder.svg";
    };
  const normalizeCategory = (t) =>
    String(t || "")
      .trim()
      .toLowerCase();
  const activeCategoryKey = normalizeCategory(categoryModeCategory?.name);
  const activeAppMatcher = z(
    () => buildActiveAppMatcher(activeApp, categoryModeCategories),
    [activeApp, categoryModeCategories],
  );
  const displayItems =
    Qe.filter((t) =>
      matchesCategoryModeItem(t, {
        activeCategory: hasCategoryMode ? categoryModeCategory : null,
        activeAppMatcher,
      }),
    );
  const isFilteredEmpty =
    (Boolean(hasCategoryMode && activeCategoryKey) ||
      Boolean(activeAppMatcher?.activeApp)) &&
    Qe.length > 0 &&
    displayItems.length === 0;
  return p
    ? e.createElement(
        "div",
        { className: "min-h-screen flex items-center justify-center" },
        e.createElement(
          "p",
          { className: "text-gray-500" },
          s("loading") || "Loading...",
        ),
      )
    : !f || !i
      ? e.createElement(
          "div",
          {
            className:
              "min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4",
          },
          e.createElement(
            "div",
            {
              className:
                "bg-white/10 backdrop-blur-2xl rounded-3xl p-8 border border-white/20 shadow-2xl max-w-md w-full text-center page-shell page-pad",
            },
            e.createElement(b, {
              className: "w-16 h-16 text-pink-400 mx-auto mb-4",
            }),
            e.createElement(
              "h1",
              { className: "text-2xl font-bold text-white mb-3" },
              s("sign_in_to_view_wishlist") || "Sign in to view Wishlist",
            ),
            e.createElement(
              "p",
              { className: "text-gray-300 mb-6" },
              s("save_favorites") || "Save your favorite items for later",
            ),
            e.createElement(
              a,
              {
                onClick: () =>
                  o("/login", { state: { returnTo: "/wishlist" } }),
                className:
                  "w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-6 text-lg rounded-xl",
              },
              s("sign_in") || "Sign In",
            ),
          ),
        )
      : e.createElement(
          "div",
          {
            className:
              "min-h-screen bg-gradient-to-br from-slate-50 via-pink-50 to-purple-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900",
          },
          e.createElement(T, { title: s("my_wishlist") || "My Wishlist" }),
          e.createElement(
            "div",
            { className: "max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 page-shell page-pad" },
            e.createElement(
              "div",
              { className: "flex items-center gap-3 mb-2" },
              e.createElement(b, {
                className: "w-6 h-6 text-pink-500 fill-pink-500",
              }),
              e.createElement(
                "p",
                { className: "text-gray-600 dark:text-gray-300" },
                hasCategoryMode && categoryModeCategory?.name
                  ? `${displayItems.length} ${s("saved_items") || "saved items"} in ${categoryModeCategory.name}`
                  : `${g.length} ${s("saved_items") || "saved items"}`,
                Je ? " � " + (s("translating") || "Translating") : "",
              ),
            ),
            hasCategoryMode &&
              categoryModeCategory?.name &&
              e.createElement(
                "div",
                {
                  className:
                    "mb-3 rounded-2xl border border-pink-100 bg-white/80 dark:border-pink-900/40 dark:bg-gray-900/60 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3",
                },
                e.createElement(
                  "div",
                  null,
                  e.createElement(
                    "p",
                    {
                      className:
                        "text-sm font-semibold text-slate-900 dark:text-white",
                    },
                    "Category mode: ",
                    categoryModeCategory.name,
                  ),
                  e.createElement(
                    "p",
                    { className: "text-xs text-slate-500 dark:text-slate-400" },
                    "Your wishlist is filtered to this category.",
                  ),
                ),
                e.createElement(
                  a,
                  {
                    type: "button",
                    variant: "outline",
                    className: "border-pink-200 text-pink-700 w-fit",
                    onClick: () => o("/category-mode"),
                  },
                  "Switch category",
                ),
              ),
            y &&
              e.createElement(
                "div",
                {
                  className:
                    "mt-3 rounded-xl border border-red-200 bg-red-50 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2",
                },
                e.createElement("p", { className: "text-sm text-red-700" }, y),
                e.createElement(
                  a,
                  {
                    type: "button",
                    variant: "outline",
                    className: "border-red-300 text-red-700 w-fit",
                    onClick: h,
                  },
                  e.createElement(U, { className: "w-4 h-4 mr-2" }),
                  s("retry") || "Retry",
                ),
              ),
          ),
          e.createElement(
            "div",
            { className: "max-w-7xl mx-auto px-4 py-8 page-shell page-pad" },
            _
              ? e.createElement(
                  "div",
                  {
                    className:
                      "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6",
                  },
                  [...Array(4)].map((t, r) =>
                    e.createElement(
                      "div",
                      {
                        key: r,
                        className:
                          "bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-3xl p-5 animate-pulse",
                      },
                      e.createElement("div", {
                        className:
                          "w-full h-48 bg-gray-200 dark:bg-gray-700 rounded-2xl mb-4",
                      }),
                      e.createElement("div", {
                        className:
                          "h-5 bg-gray-200 dark:bg-gray-700 rounded-full w-3/4 mb-3",
                      }),
                      e.createElement("div", {
                        className:
                          "h-4 bg-gray-200 dark:bg-gray-700 rounded-full w-1/2",
                      }),
                    ),
                  ),
                )
              : displayItems.length === 0
                ? e.createElement(
                    "div",
                    { className: "text-center py-24" },
                    e.createElement(
                      "div",
                      {
                        className:
                          "w-24 h-24 bg-gradient-to-br from-pink-400 to-purple-500 rounded-3xl mx-auto mb-6 flex items-center justify-center",
                      },
                      e.createElement(b, { className: "w-12 h-12 text-white" }),
                    ),
                    e.createElement(
                      "h3",
                      {
                        className:
                          "text-2xl font-bold text-gray-800 dark:text-white mb-3",
                      },
                      isFilteredEmpty
                        ? `No ${categoryModeCategory?.name || "category"} items saved yet`
                        : s("wishlist_empty") || "Your wishlist is empty",
                    ),
                    e.createElement(
                      "p",
                      { className: "text-gray-500 mb-6" },
                      isFilteredEmpty
                        ? "Switch category or save items in this marketplace."
                        : s("start_saving") || "Start saving items you love!",
                    ),
                    e.createElement(
                      "div",
                      { className: "flex flex-wrap justify-center gap-2" },
                      e.createElement(
                        a,
                        {
                          onClick: () => o("/all-posts"),
                          className:
                            "bg-gradient-to-r from-pink-500 to-purple-600 text-white px-8 py-6 text-lg rounded-2xl",
                        },
                        e.createElement(W, { className: "w-5 h-5 mr-2" }),
                        " ",
                        s("browse_products") || "Browse Products",
                      ),
                      e.createElement(
                        a,
                        {
                          type: "button",
                          variant: "outline",
                          className: "px-6 py-6 rounded-2xl",
                          onClick: () => o("/my-recommendations"),
                        },
                        e.createElement($, { className: "w-4 h-4 mr-2" }),
                        " ",
                        s("my_recommendations") || "Recommendations",
                      ),
                      e.createElement(
                        a,
                        {
                          type: "button",
                          variant: "outline",
                          className: "px-6 py-6 rounded-2xl",
                          onClick: () =>
                            isFilteredEmpty ? o("/category-mode") : o("/categories"),
                        },
                        isFilteredEmpty
                          ? "Switch category"
                          : s("explore_categories") || "Explore Categories",
                      ),
                    ),
                  )
                : e.createElement(
                    "div",
                    {
                      className:
                        "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6",
                    },
                    displayItems.map((t) => {
                      const imageUrl = B(t);
                      const hasImage = Boolean(t.images?.[0] || t.image_url);
                      const rating = Number(
                        t.rating || t.seller_rating || t.user?.rating || 0,
                      );
                      const reviews = Number(
                        t.review_count || t.reviews_count || t.reviewCount || 0,
                      );
                      return e.createElement(
                        j,
                        {
                          key: t.wishlist_id,
                          className:
                            "group bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-3xl overflow-hidden border border-white/50 shadow-xl hover:shadow-2xl transition-all duration-300",
                        },
                        e.createElement(
                          "div",
                          { className: "relative w-full h-48 overflow-hidden" },
                          hasImage
                            ? e.createElement("img", {
                                src: imageUrl,
                                alt: t.title,
                                className:
                                  "w-full h-full object-cover group-hover:scale-110 transition-transform duration-500",
                                onError: (r) => {
                                  r.target.src = "/placeholder.svg";
                                },
                              })
                            : e.createElement(
                                "div",
                                {
                                  className:
                                    "w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-pink-50 via-white to-purple-50 text-gray-400",
                                },
                                e.createElement(X, {
                                  className: "w-10 h-10 mb-2",
                                }),
                                e.createElement(
                                  "span",
                                  { className: "text-xs font-medium" },
                                  s("image_unavailable") ||
                                    "Image coming soon",
                                ),
                              ),
                          e.createElement(
                            "button",
                            {
                              onClick: () => C(t.post_id),
                              className:
                                "absolute top-3 right-3 p-2 rounded-xl bg-red-500 hover:bg-red-600 shadow-lg transition-colors",
                            },
                            e.createElement(E, {
                              className: "w-4 h-4 text-white",
                            }),
                          ),
                          e.createElement(
                            A,
                            {
                              className:
                                "absolute top-3 left-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white border-0",
                            },
                            t.category_name || s("general") || "General",
                          ),
                        ),
                        e.createElement(
                          "div",
                          { className: "p-4" },
                          e.createElement(
                            "h3",
                            {
                              className:
                                "font-bold text-gray-800 dark:text-white text-lg mb-1 line-clamp-1",
                            },
                            t.title,
                          ),
                          rating > 0
                            ? e.createElement(
                                "div",
                                {
                                  className:
                                    "flex items-center gap-1 text-amber-500 text-xs mb-2",
                                },
                                e.createElement(Z, {
                                  className: "w-3.5 h-3.5",
                                }),
                                e.createElement(
                                  "span",
                                  null,
                                  rating.toFixed(1),
                                ),
                                reviews > 0
                                  ? e.createElement(
                                      "span",
                                      {
                                        className:
                                          "text-gray-400 dark:text-gray-500",
                                      },
                                      "(",
                                      reviews,
                                      " ",
                                      s("reviews") || "reviews",
                                      ")",
                                    )
                                  : null,
                              )
                            : null,
                          e.createElement(
                            "p",
                            {
                              className:
                                "text-gray-500 text-sm mb-3 line-clamp-2",
                            },
                            t.description ||
                              s("no_description") ||
                              "No description",
                          ),
                          e.createElement(
                            "div",
                            {
                              className:
                                "flex items-center justify-between mb-3",
                            },
                            e.createElement(
                              "span",
                              {
                                className:
                                  "text-xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent",
                              },
                              "\u20B9",
                              t.price?.toLocaleString() || "0",
                            ),
                            e.createElement(
                              "div",
                              {
                                className:
                                  "flex items-center gap-1 text-gray-500 text-sm",
                              },
                              e.createElement(D, { className: "w-3 h-3" }),
                              t.location || s("not_available") || "N/A",
                            ),
                          ),
                          e.createElement(
                            "div",
                            {
                              className:
                                "flex items-center gap-2 text-xs text-gray-400 mb-3",
                            },
                            e.createElement(
                              "span",
                              null,
                              s("saved") || "Saved",
                              " ",
                              t.saved_at ? new Date(t.saved_at).toLocaleDateString() : "—",
                            ),
                          ),
                          e.createElement(
                            "div",
                            { className: "flex gap-2" },
                            e.createElement(
                              a,
                              {
                                onClick: () => o(`/post/${t.post_id}`),
                                className:
                                  "flex-1 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl",
                              },
                              e.createElement(P, { className: "w-4 h-4 mr-2" }),
                              " ",
                              s("view_details") || "View Details",
                            ),
                            e.createElement(
                              a,
                              {
                                onClick: () => addToCart({
                                  id: t.post_id,
                                  title: t.title,
                                  price: t.price,
                                  image: t.images?.[0] || t.image_url,
                                  seller: t.seller_name || t.user_name,
                                  location: t.location,
                                  category_name: t.category_name,
                                }),
                                variant: "outline",
                                className:
                                  isInCart(t.post_id)
                                    ? "border-green-400 text-green-600 rounded-xl"
                                    : "border-pink-300 text-pink-600 hover:bg-pink-50 rounded-xl",
                                title: isInCart(t.post_id) ? "In cart" : "Add to cart",
                              },
                              e.createElement(CartIcon, { className: "w-4 h-4" }),
                            ),
                          ),
                        ),
                      );
                    }),
                  ),
          ),
        );
};
var oe = Y;
export { oe as default };

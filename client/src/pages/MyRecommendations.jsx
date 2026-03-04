import e, {
  useState as i,
  useEffect as w,
  useMemo as I,
  useCallback as J,
} from "react";
import { useNavigate as Q } from "react-router-dom";
import { useTranslation as X } from "react-i18next";
import {
  Sparkles as z,
  Lock as Y,
  Gift as R,
  TrendingUp as ee,
  Zap as te,
  LogIn as re,
  Filter as se,
  Share2 as shareIcon,
  Bookmark as saveIcon,
  BookmarkCheck as savedIcon,
  MoreVertical as moreIcon,
} from "lucide-react";
import $ from "../lib/api";
import ae from "@/components/CategoriesGrid";
import { Card as oe } from "@/components/ui/card";
import { Button as l } from "@/components/ui/button";
import { Avatar as le, AvatarFallback as ie } from "@/components/ui/avatar";
import ShareLinkDialog from "@/components/ShareLinkDialog";
import { useTranslatedPosts as ne } from "../hooks/useTranslatedContent";
import { useAuth as de } from "@/context/AuthContext";
import { getAccessToken as me, getUserId as ue } from "@/utils/authStorage";
import { getApiOriginBase as ce } from "@/lib/networkConfig";
const be = () => {
  const { t: m } = X(),
    u = Q(),
    { user: p, loading: M } = de(),
    N = me(),
    n = ue(p),
    b = I(() => !!(p || (N && n)), [p, N, n]),
    [s, W] = i({ location: "", minPrice: "", maxPrice: "", date: "" }),
    [k, x] = i([]),
    [P, C] = i(!0),
    [B, S] = i(null),
    [o, f] = i(""),
    [j, F] = i(!0),
    [U, E] = i(null),
    [g, h] = i(1),
    [T, L] = i(!0),
    [_, A] = i(!1),
    [G, D] = i(0),
    [menuPostId, setMenuPostId] = i(null),
    [savedPosts, setSavedPosts] = i({}),
    [shareDialogOpen, setShareDialogOpen] = i(!1),
    [shareDialogUrl, setShareDialogUrl] = i(""),
    apiBase = I(() => ce(), []),
    getPostId = (t) => t?.post_id ?? t?.id ?? null,
    { translatedPosts: H } = ne(k),
    O = I(() => {
      const t = [];
      if (
        (o && t.push(`Category: ${o}`),
        s.location && t.push(`Location: ${s.location}`),
        s.minPrice || s.maxPrice)
      ) {
        const r = s.minPrice || "0",
          d = s.maxPrice || "Any";
        t.push(`Budget: INR ${r} - ${d}`);
      }
      return (
        t.length === 0 &&
          (t.push("Recent browsing activity"),
          t.push("Popular nearby listings")),
        t
      );
    }, [s.location, s.maxPrice, s.minPrice, o]),
    ge = {
      Electronics: "\u{1F4F1}",
      Mobiles: "\u{1F4F1}",
      Fashion: "\u{1F455}",
      Furniture: "\u{1F6CB}\uFE0F",
      Vehicles: "\u{1F697}",
      Books: "\u{1F4DA}",
      Home: "\u{1F3E0}",
      Sports: "\u26BD",
      Beauty: "\u{1F484}",
      Kids: "\u{1F9F8}",
    };
  (w(() => {
    if (!b || !n) return;
    (async () => {
      try {
        const r = await $.get(`/profile/preferences?userId=${n}`);
        r &&
          W({
            location: r.location || "",
            minPrice: r.minPrice || "",
            maxPrice: r.maxPrice || "",
            date: r.date || "",
          });
      } catch {}
    })();
  }, [b, n]),
    w(() => {
      (h(1), L(!0));
    }, [s, o]),
    w(() => {
      if (!b || !n) return;
      (async () => {
        g === 1 ? C(!0) : A(!0);
        try {
          const r = {
            location: s.location,
            minPrice: s.minPrice,
            maxPrice: s.maxPrice,
            category: o,
            userId: n,
            page: g,
            limit: 12,
          };
          Object.keys(r).forEach((a) => !r[a] && delete r[a]);
          const d = await $.get("/recommendations", { params: r }),
            c = Array.isArray(d?.posts) ? d.posts : [];
          (x(g === 1 ? c : (a) => [...a, ...c]), L(c.length === 12), S(null));
        } catch {
          (S("Failed to load recommendations"), g === 1 && x([]));
        } finally {
          (C(!1), A(!1));
        }
      })();
    }, [b, s, o, g, G, n]));
  const K = (t) =>
      t ? (t.startsWith("http") ? t : `${ce()}${t}`) : "/placeholder.svg",
    V = J(
      (t) => {
        const r = [],
          d = String(t.category || t.category_name || "").toLowerCase(),
          c = String(t.location || "").toLowerCase(),
          a = Number(t.price || 0),
          v = Number(s.minPrice || 0),
          y = Number(s.maxPrice || 0);
        if (
          (o &&
            d.includes(String(o).toLowerCase()) &&
            r.push(`Matches your selected category (${o}).`),
          s.location &&
            c.includes(String(s.location).toLowerCase()) &&
            r.push(`Located near your preferred area (${s.location}).`),
          (v > 0 || y > 0) && a > 0)
        ) {
          const Z = v === 0 || a >= v,
            q = y === 0 || a <= y;
          Z && q && r.push("Within your preferred price range.");
        }
        return (
          (Number(t.views_count || 0) >= 10 ||
            Number(t.likes_count || 0) >= 5) &&
            r.push("Getting strong engagement from other users."),
          r.length === 0 &&
            r.push("Based on your recent browsing and category interests."),
          r.slice(0, 3)
        );
      },
      [s.location, s.maxPrice, s.minPrice, o],
    ),
    handleSharePost = J(
      async (t) => {
        const r = getPostId(t);
        if (r === null) return;
        const d = `${window.location.origin}/post/${r}`;
        setShareDialogUrl(d);
        setShareDialogOpen(!0);
        setMenuPostId(null);
        try {
          await fetch(`${apiBase}/api/posts/${r}/share`, {
            method: "POST",
            credentials: "include",
            headers: N ? { Authorization: `Bearer ${N}` } : {},
          });
        } catch {
          // Ignore analytics/share-count errors.
        }
      },
      [N, apiBase],
    ),
    toggleSavePost = J(
      async (t) => {
        const r = getPostId(t);
        if (r === null) return;
        if (!b) {
          u("/login", { state: { returnTo: "/my-recommendations" } });
          return;
        }
        const d = String(r),
          c = !!savedPosts[d];
        setSavedPosts((a) => ({ ...a, [d]: !c }));
        setMenuPostId(null);
        try {
          if (c) {
            await fetch(`${apiBase}/api/wishlist/${d}`, {
              method: "DELETE",
              credentials: "include",
              headers: N ? { Authorization: `Bearer ${N}` } : {},
            });
          } else {
            await fetch(`${apiBase}/api/wishlist`, {
              method: "POST",
              credentials: "include",
              headers: {
                "Content-Type": "application/json",
                ...(N ? { Authorization: `Bearer ${N}` } : {}),
              },
              body: JSON.stringify({ postId: d }),
            });
          }
        } catch {
          setSavedPosts((a) => ({ ...a, [d]: c }));
        }
      },
      [N, b, savedPosts, u, apiBase],
    ),
    openPostMenu = (t) => {
      setMenuPostId((r) => (r === String(t) ? null : String(t)));
    };
  return !M && !b
    ? e.createElement(
        "div",
        {
          className:
            "min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4",
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
          e.createElement("div", {
            className:
              "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse delay-500",
          }),
        ),
        e.createElement(
          "div",
          { className: "relative z-10 max-w-md w-full" },
          e.createElement(
            "div",
            {
              className:
                "bg-white/10 backdrop-blur-2xl rounded-3xl p-8 border border-white/20 shadow-2xl",
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
                      "w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-xl",
                  },
                  e.createElement(Y, { className: "w-10 h-10 text-white" }),
                ),
                e.createElement(
                  "div",
                  {
                    className:
                      "absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg animate-bounce",
                  },
                  e.createElement(z, { className: "w-4 h-4 text-white" }),
                ),
              ),
            ),
            e.createElement(
              "h1",
              { className: "text-3xl font-bold text-white text-center mb-3" },
              m("access_restricted") || "Access Restricted",
            ),
            e.createElement(
              "p",
              { className: "text-gray-300 text-center mb-8" },
              "Sign in to view personalized recommendations curated just for you",
            ),
            e.createElement(
              "div",
              { className: "space-y-3 mb-8" },
              [
                { icon: R, text: "Personalized product picks" },
                { icon: ee, text: "Based on your preferences" },
                { icon: te, text: "Real-time updates" },
              ].map((t, r) =>
                e.createElement(
                  "div",
                  {
                    key: r,
                    className: "flex items-center gap-3 text-gray-300",
                  },
                  e.createElement(
                    "div",
                    {
                      className:
                        "w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center",
                    },
                    e.createElement(t.icon, {
                      className: "w-4 h-4 text-purple-400",
                    }),
                  ),
                  e.createElement("span", { className: "text-sm" }, t.text),
                ),
              ),
            ),
            e.createElement(
              l,
              {
                onClick: () =>
                  u("/login", { state: { returnTo: "/my-recommendations" } }),
                className:
                  "w-full h-14 bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 hover:from-purple-700 hover:via-blue-700 hover:to-indigo-700 text-white font-semibold text-lg rounded-xl shadow-lg shadow-purple-500/30 transition-all hover:scale-105",
              },
              e.createElement(re, { className: "w-5 h-5 mr-2" }),
              m("sign_in_to_continue") || "Sign In to Continue",
            ),
            e.createElement(
              "p",
              { className: "text-gray-400 text-center mt-6 text-sm" },
              "Don't have an account?",
              " ",
              e.createElement(
                "span",
                {
                  onClick: () => u("/signup"),
                  className:
                    "text-purple-400 hover:text-purple-300 cursor-pointer font-medium",
                },
                m("create_one_now") || "Create one now",
              ),
            ),
          ),
        ),
      )
    : e.createElement(
        "div",
        { className: "min-h-screen bg-white dark:bg-gray-900 pb-20 pt-20" },
        e.createElement(
          "div",
          { className: "max-w-6xl mx-auto px-4 pt-4" },
          e.createElement(
            "div",
            { className: "mb-6" },
            e.createElement(ae, { onCategorySelect: f, activeCategory: o }),
          ),
          e.createElement(
            "div",
            {
              className:
                "mb-6 rounded-2xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/80 dark:bg-blue-900/20 p-4",
            },
            e.createElement(
              "div",
              {
                className:
                  "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2",
              },
              e.createElement(
                "div",
                null,
                e.createElement(
                  "h3",
                  {
                    className:
                      "text-base font-bold text-blue-900 dark:text-blue-100",
                  },
                  "Why you are seeing these recommendations",
                ),
                e.createElement(
                  "p",
                  { className: "text-xs text-blue-700 dark:text-blue-200" },
                  "Signals are updated from your filters and browsing activity.",
                ),
              ),
              e.createElement(
                l,
                {
                  type: "button",
                  variant: "outline",
                  size: "sm",
                  className: "border-blue-300 text-blue-800 w-fit",
                  onClick: () => F((t) => !t),
                },
                e.createElement(se, { className: "w-4 h-4 mr-2" }),
                j ? "Hide signals" : "Show signals",
              ),
            ),
            j &&
              e.createElement(
                "div",
                { className: "mt-3 space-y-3" },
                e.createElement(
                  "div",
                  { className: "flex flex-wrap gap-2" },
                  O.map((t) =>
                    e.createElement(
                      "span",
                      {
                        key: t,
                        className:
                          "text-xs px-2 py-1 rounded-full bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800",
                      },
                      t,
                    ),
                  ),
                ),
                e.createElement(
                  "div",
                  { className: "flex flex-wrap gap-2" },
                  e.createElement(
                    l,
                    {
                      type: "button",
                      size: "sm",
                      variant: "outline",
                      className: "border-blue-300 text-blue-800",
                      onClick: () => f(""),
                      disabled: !o,
                    },
                    "Reset category filter",
                  ),
                  e.createElement(
                    l,
                    {
                      type: "button",
                      size: "sm",
                      variant: "outline",
                      className: "border-blue-300 text-blue-800",
                      onClick: () => u("/search?context=recommendations"),
                    },
                    "Tune search filters",
                  ),
                  e.createElement(
                    l,
                    {
                      type: "button",
                      size: "sm",
                      onClick: () => u("/all-posts"),
                    },
                    "Browse all listings",
                  ),
                ),
              ),
          ),
          e.createElement(
            "div",
            {
              className:
                "bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 rounded-2xl p-6 mb-8 flex items-center justify-between relative overflow-hidden shadow-sm",
            },
            e.createElement("div", {
              className:
                "absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-blue-300/20 to-transparent skew-x-12 transform translate-x-10",
            }),
            e.createElement(
              "div",
              { className: "relative z-10 max-w-lg" },
              e.createElement(
                "h2",
                {
                  className:
                    "text-3xl font-bold text-blue-900 dark:text-blue-100 mb-2",
                },
                "Great Deals",
              ),
              e.createElement(
                "p",
                {
                  className:
                    "text-blue-700 dark:text-blue-200 mb-6 text-lg font-medium",
                },
                "Up to 50% off on selected items",
              ),
              e.createElement(
                l,
                {
                  className:
                    "bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-2 rounded-xl shadow-lg hover:shadow-xl transition-all",
                },
                "Shop Now",
              ),
            ),
            e.createElement("div", {
              className:
                "hidden md:block w-32 h-32 bg-blue-500/20 rounded-2xl backdrop-blur-sm mr-8",
            }),
          ),
          e.createElement(
            "div",
            { className: "mb-8" },
            e.createElement(
              "h3",
              {
                className:
                  "text-lg font-bold text-gray-900 dark:text-white mb-2",
              },
              "Sponsored Deals",
            ),
            e.createElement(
              "p",
              { className: "text-blue-500 dark:text-blue-400 text-sm" },
              "No sponsored deals",
            ),
          ),
          e.createElement(
            "h3",
            {
              className:
                "text-2xl font-bold text-blue-700 dark:text-blue-300 mb-4",
            },
            "All Posts",
          ),
          B &&
            e.createElement(
              "div",
              {
                className:
                  "mb-4 rounded-xl border border-red-200 bg-red-50 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2",
              },
              e.createElement("p", { className: "text-sm text-red-700" }, B),
              e.createElement(
                l,
                {
                  type: "button",
                  size: "sm",
                  variant: "outline",
                  className: "border-red-300 text-red-700 w-fit",
                  onClick: () => {
                    (h(1), D((t) => t + 1));
                  },
                },
                "Retry",
              ),
            ),
          P
            ? e.createElement(
                "div",
                { className: "grid grid-cols-1 gap-6" },
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
            : k.length === 0
              ? e.createElement(
                  "div",
                  { className: "text-center py-20" },
                  e.createElement(
                    "div",
                    {
                      className:
                        "w-24 h-24 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6",
                    },
                    e.createElement(z, {
                      className: "w-12 h-12 text-blue-500",
                    }),
                  ),
                  e.createElement(
                    "h3",
                    {
                      className:
                        "text-xl font-bold text-gray-900 dark:text-white mb-2",
                    },
                    m("no_recommendations"),
                  ),
                  e.createElement(
                    "p",
                    { className: "text-gray-500 dark:text-gray-400" },
                    "Interact with more posts to get personalized picks!",
                  ),
                  e.createElement(
                    "div",
                    { className: "mt-4 flex flex-wrap justify-center gap-2" },
                    e.createElement(
                      l,
                      { type: "button", onClick: () => u("/all-posts") },
                      "Browse Listings",
                    ),
                    e.createElement(
                      l,
                      {
                        type: "button",
                        variant: "outline",
                        onClick: () => u("/categories"),
                      },
                      "Explore Categories",
                    ),
                    e.createElement(
                      l,
                      {
                        type: "button",
                        variant: "outline",
                        onClick: () => f(""),
                        disabled: !o,
                      },
                      "Reset Filters",
                    ),
                  ),
                )
              : e.createElement(
                  "div",
                  { className: "flex flex-col gap-6 w-full max-w-5xl mx-auto" },
                  H.map((t) => {
                    const r = t.post_id || t.id,
                      d = V(t),
                      c = U === r;
                    return e.createElement(
                      oe,
                      {
                        key: r,
                        className:
                          "rounded-3xl shadow-md bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-shadow duration-300",
                      },
                      e.createElement(
                        "div",
                        {
                          className:
                            "flex items-center gap-4 p-4 border-b border-gray-50 dark:border-gray-700/50",
                        },
                        e.createElement(
                          le,
                          {
                            className:
                              "w-12 h-12 border-2 border-blue-100 dark:border-blue-900",
                          },
                          e.createElement(
                            ie,
                            {
                              className:
                                "bg-blue-50 text-blue-600 font-bold text-lg dark:bg-gray-700 dark:text-blue-300",
                            },
                            t.user?.name?.[0]?.toUpperCase() || "U",
                          ),
                        ),
                        e.createElement(
                          "div",
                          { className: "flex-1 min-w-0" },
                          e.createElement(
                            "h4",
                            {
                              className:
                                "font-bold text-gray-900 dark:text-white text-base truncate",
                            },
                            t.user?.name || m("unknown") || "Rahul Sharma",
                          ),
                          e.createElement(
                            "p",
                            {
                              className:
                                "text-gray-500 dark:text-gray-400 text-xs font-medium",
                            },
                            t.category || t.category_name || "Sports",
                          ),
                          e.createElement(
                            "span",
                            {
                              className:
                                "mt-1 inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-[11px] font-semibold text-gray-600 dark:text-gray-200",
                            },
                            "Post ID: ",
                            r,
                          ),
                        ),
                        e.createElement(
                          "div",
                          { className: "relative flex items-center gap-2" },
                          e.createElement(
                            l,
                            {
                              type: "button",
                              size: "sm",
                              variant: "outline",
                              className: "text-xs",
                              onClick: () => E((a) => (a === r ? null : r)),
                            },
                            "Why this?",
                          ),
                          e.createElement(
                            "button",
                            {
                              type: "button",
                              onClick: () => openPostMenu(r),
                              className:
                                "p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition",
                              title: "More options",
                            },
                            e.createElement(moreIcon, {
                              className:
                                "w-4 h-4 text-gray-500 dark:text-gray-300",
                            }),
                          ),
                          menuPostId === String(r) &&
                            e.createElement(
                              "div",
                              {
                                className:
                                  "absolute right-0 top-10 z-20 w-40 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg p-1",
                              },
                              e.createElement(
                                "button",
                                {
                                  type: "button",
                                  onClick: () => handleSharePost(t),
                                  className:
                                    "w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg",
                                },
                                m("share") || "Share",
                              ),
                              e.createElement(
                                "button",
                                {
                                  type: "button",
                                  onClick: () => toggleSavePost(t),
                                  className:
                                    "w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg",
                                },
                                savedPosts[String(r)]
                                  ? m("saved") || "Saved"
                                  : m("save") || "Save",
                              ),
                              e.createElement(
                                "button",
                                {
                                  type: "button",
                                  onClick: () => u(`/post/${r}`),
                                  className:
                                    "w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg",
                                },
                                m("view") || "View",
                              ),
                            ),
                        ),
                      ),
                      e.createElement(
                        "div",
                        {
                          className:
                            "w-full bg-gray-50 dark:bg-gray-900 flex items-center justify-center relative",
                        },
                        e.createElement(
                          "div",
                          { className: "w-full aspect-video relative" },
                          e.createElement("img", {
                            src: K(t.images?.[0] || t.image_url),
                            alt: t.title,
                            className: "w-full h-full object-cover",
                            onError: (a) => {
                              a.target.src = "/placeholder.svg";
                            },
                          }),
                        ),
                        !t.images?.[0] &&
                          !t.image_url &&
                          e.createElement(
                            "span",
                            {
                              className:
                                "text-gray-300 dark:text-gray-600 text-4xl font-bold absolute",
                            },
                            "Image",
                          ),
                      ),
                      e.createElement(
                        "div",
                        {
                          className:
                            "relative h-12 -mt-6 z-10 flex justify-center",
                        },
                        e.createElement(
                          "div",
                          {
                            className:
                              "bg-white dark:bg-gray-800 p-1 rounded-full shadow-lg",
                          },
                          e.createElement(
                            l,
                            {
                              onClick: () => u(`/post/${r}`),
                              className:
                                "w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center p-0 shadow-md",
                            },
                            e.createElement(
                              "span",
                              { className: "text-2xl pb-1" },
                              "+",
                            ),
                          ),
                        ),
                      ),
                      e.createElement(
                        "div",
                        { className: "px-4 pb-4 text-center" },
                        c &&
                          e.createElement(
                            "div",
                            {
                              className:
                                "rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50 dark:bg-blue-900/20 p-3 text-left",
                            },
                            e.createElement(
                              "p",
                              {
                                className:
                                  "text-xs font-semibold text-blue-900 dark:text-blue-200 mb-2",
                              },
                              "Recommendation signals",
                            ),
                            e.createElement(
                              "ul",
                              {
                                className:
                                  "space-y-1 text-xs text-blue-800 dark:text-blue-300",
                              },
                              d.map((a) =>
                                e.createElement(
                                  "li",
                                  { key: `${r}-${a}` },
                                  "- ",
                                  a,
                                ),
                              ),
                            ),
                          ),
                        e.createElement(
                          "div",
                          {
                            className:
                              "mt-4 flex items-center justify-center flex-wrap gap-2",
                          },
                          e.createElement(
                            l,
                            {
                              type: "button",
                              size: "sm",
                              variant: "outline",
                              className: "rounded-full",
                              onClick: () => handleSharePost(t),
                            },
                            e.createElement(shareIcon, {
                              className: "w-4 h-4 mr-1",
                            }),
                            m("share") || "Share",
                          ),
                          e.createElement(
                            l,
                            {
                              type: "button",
                              size: "sm",
                              variant: "outline",
                              className: "rounded-full",
                              onClick: () => toggleSavePost(t),
                            },
                            savedPosts[String(r)]
                              ? e.createElement(savedIcon, {
                                  className: "w-4 h-4 mr-1",
                                })
                              : e.createElement(saveIcon, {
                                  className: "w-4 h-4 mr-1",
                                }),
                            savedPosts[String(r)]
                              ? m("saved") || "Saved"
                              : m("save") || "Save",
                          ),
                          e.createElement(
                            l,
                            {
                              type: "button",
                              size: "sm",
                              className: "rounded-full",
                              onClick: () => u(`/post/${r}`),
                            },
                            m("view") || "View",
                          ),
                        ),
                      ),
                    );
                  }),
                  T &&
                    !P &&
                    e.createElement(
                      "div",
                      { className: "flex justify-center pt-8 pb-4" },
                      e.createElement(
                        l,
                        {
                          onClick: () => h((t) => t + 1),
                          disabled: _,
                          className:
                            "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-gray-700 px-8 py-2 rounded-full shadow-sm transition-all",
                        },
                        _
                          ? e.createElement(
                              e.Fragment,
                              null,
                              e.createElement("div", {
                                className:
                                  "w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2",
                              }),
                              m("loading") || "Loading...",
                            )
                          : m("load_more") || "Load More",
                      ),
                    ),
                  e.createElement(ShareLinkDialog, {
                    open: shareDialogOpen,
                    onOpenChange: setShareDialogOpen,
                    url: shareDialogUrl,
                    title: m("share") || "Share post",
                  }),
                ),
        ),
      );
};
var je = be;
export { je as default };

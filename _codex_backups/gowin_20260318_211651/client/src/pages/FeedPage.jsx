import e, {
  useState as i,
  useEffect as T,
  useCallback as D,
  useRef as w,
  useMemo as j,
} from "react";
import { Button as c } from "@/components/ui/button";
import { Card as O } from "@/components/ui/card";
import { Avatar as oe, AvatarFallback as se } from "@/components/ui/avatar";
import {
  Alert as ne,
  AlertDescription as ae,
  AlertTitle as ie,
} from "@/components/ui/alert";
import {
  FaHeart as Se,
  FaRegHeart as Ae,
  FaShare as Le,
  FaEye as Pe,
  FaMapMarkerAlt as Ge,
  FaPlus as Te,
  FaNewspaper as le,
  FaUser as Be,
  FaBookmark as Ke,
  FaRegBookmark as Qe,
  FaEllipsisV as Xe,
} from "react-icons/fa";
import { useNavigate as Ee } from "react-router-dom";
import { useTranslation as Me } from "react-i18next";
import Fe from "@/components/LoginPromptModal";
import {
  translatePosts as $e,
  translatePostsInstant as instantTranslatePosts,
} from "@/utils/translateContent";
import { useAuth as Ue } from "@/context/AuthContext";
import { getApiOriginBase as De } from "@/lib/networkConfig";
import {
  PageEmptyState as je,
  PageErrorState as Oe,
  PageLoadingState as He,
} from "@/components/page-state/PageStateBlocks";
import Re from "@/components/ShareLinkDialog";
import {
  beginSavedPostMutation,
  buildSavedPostsMap,
  endSavedPostMutation,
  extractSavedPostIds,
  getSavedPostsMap,
  replaceSavedPostIds,
  setSavedPostStatus,
  subscribeSavedPosts,
} from "@/utils/savedPosts";
const Ve = 5,
  FEED_TRANSLATE_PATHS = [
    "title",
    "description",
    "category",
    "category_name",
    "location",
    "city",
    "area",
    "state",
    "summary",
    "subtitle",
    "brand",
    "model",
    "user.name",
    "user.location",
  ],
  AVATAR_GRADIENTS = [
    "from-indigo-400 to-purple-500",
    "from-emerald-400 to-teal-500",
    "from-amber-400 to-orange-500",
    "from-pink-400 to-rose-500",
    "from-sky-400 to-blue-500",
  ],
  getAvatarGradient = (o) => {
    const value = String(o || "").trim();
    if (!value) return AVATAR_GRADIENTS[0];
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
      hash = (hash * 31 + value.charCodeAt(i)) % 100000;
    }
    return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
  },
  de = (o) => {
    const candidate = o?.post_id ?? o?.id ?? null;
    if (candidate == null) return null;
    if (typeof candidate === "object") return null;
    return candidate;
  },
  getPostLocationLabel = (o) => {
    const values = [o?.area, o?.city, o?.state, o?.location]
      .map((B) => String(B || "").trim())
      .filter(Boolean);
    return Array.from(new Set(values)).join(", ");
  },
  setNestedValue = (o, B, m) => {
    if (!o || typeof o != "object" || !B) return;
    const n = String(B).split(".");
    let u = o;
    for (let N = 0; N < n.length - 1; N += 1) {
      const H = n[N];
      (!u[H] || typeof u[H] != "object") && (u[H] = {});
      u = u[H];
    }
    u[n[n.length - 1]] = m;
  },
  restoreTranslatedPost = (o) => {
    if (!o || typeof o != "object") return o;
    const B = o._originalTranslations;
    if (!B || typeof B != "object") return o;
    const m = { ...o };
    return (
      Object.entries(B).forEach(([n, u]) => {
        setNestedValue(m, n, u);
      }),
      typeof o._originalTitle == "string" && (m.title = o._originalTitle),
      typeof o._originalDescription == "string" &&
        (m.description = o._originalDescription),
      m
    );
  },
  qe = (o, B) => {
    const m = new Map();
    return (
      o.forEach((n) => {
        const u = de(n);
        u !== null && m.set(String(u), n);
      }),
      B.forEach((n) => {
        const u = de(n);
        u !== null && m.set(String(u), n);
      }),
      Array.from(m.values())
    );
  },
  FeedPage = () => {
    const { t: o, i18n: B } = Me(),
      m = B.language,
      [n, u] = i([]),
      [N, H] = i(null),
      [_, V] = i(!1),
      [f, q] = i(1),
      [E, M] = i(!0),
      [z, C] = i(""),
      F = 10,
      G = w(Date.now()),
      v = w(0),
      p = w(null),
      S = w(!1),
      b = w(null),
      A = w(!1),
      g = Ee(),
      { user: Y } = Ue(),
      L = j(() => De(), []),
      authToken = j(
        () => localStorage.getItem("authToken") || localStorage.getItem("token") || "",
        [Y],
      ),
      me = j(
        () => localStorage.getItem("username")?.[0]?.toUpperCase() || "U",
        [],
      ),
      [ce, ue] = i({}),
      [I, ge] = i({}),
      [fe, J] = i({}),
      [pe, he] = i({}),
      [K, Q] = i(""),
      h = j(
        () =>
          !!(
            Y ||
            localStorage.getItem("authToken") ||
            localStorage.getItem("token")
          ),
        [Y],
      ),
      [xe, W] = i(!1),
      [menuPostId, setMenuPostId] = i(null),
      [savedPosts, setSavedPosts] = i(() => getSavedPostsMap()),
      [shareDialogOpen, setShareDialogOpen] = i(!1),
      [shareDialogUrl, setShareDialogUrl] = i("");
    const languageRef = w(m);
    const resolveMessage = D(
      (t) => {
        if (!t) return "";
        if (typeof t === "string") return t;
        const message = t.key
          ? o(t.key, { defaultValue: t.fallback, ...(t.params || {}) })
          : "";
        if (typeof message === "string" && message && message !== t.key) {
          return message;
        }
        return t.fallback || "";
      },
      [o],
    );
    const errorMessage = resolveMessage(N);
    const loadMoreErrorMessage = resolveMessage(z);
    T(
      () => () => {
        p.current && p.current.abort(), b.current && clearTimeout(b.current);
      },
      [],
    );
    T(() => {
      languageRef.current = m;
    }, [m]);
    T(() => subscribeSavedPosts(setSavedPosts), []);

    const syncSavedPosts = D(async () => {
      if (!h) {
        return;
      }

      try {
        const response = await fetch(`${L}/api/wishlist`, {
          method: "GET",
          credentials: "include",
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        });
        if (!response.ok) {
          return;
        }

        const payload = await response.json();
        const ids = extractSavedPostIds(payload);
        replaceSavedPostIds(ids);
        setSavedPosts(buildSavedPostsMap(ids));
      } catch {
        // Keep local fallback state when sync fails.
      }
    }, [authToken, h, L]);

    T(() => {
      if (!h) {
        return;
      }
      void syncSavedPosts();
    }, [h, syncSavedPosts]);

    const y = D(
      async (t = !1) => {
        const r = v.current + 1;
        (v.current = r), (A.current = !0);
        const s = t ? 1 : f;
        p.current && p.current.abort();
        const a = new AbortController();
        p.current = a;
        try {
          V(!0), s === 1 && H(null), C(null);
          const l = t ? Date.now() : G.current;
          t && (G.current = l);
          const params = new URLSearchParams();
          params.set("page", String(s));
          params.set("limit", String(F));
          const P = `${L}/api/feed?${params.toString()}`,
            k = await fetch(P, { signal: a.signal, credentials: "include" });
          if (!k.ok) throw new Error("Failed to fetch feed");
          const te = await k.json();
          let x = Array.isArray(te?.posts)
            ? te.posts
            : Array.isArray(te)
              ? te
              : [];
          const activeLanguage = languageRef.current;
          const sourcePosts = x;
          const translatedSeed =
            activeLanguage && activeLanguage !== "en" && sourcePosts.length > 0
              ? instantTranslatePosts(sourcePosts, activeLanguage, {
                  paths: FEED_TRANSLATE_PATHS,
                })
              : sourcePosts;
          const safeTranslatedSeed = Array.isArray(translatedSeed)
            ? translatedSeed
            : Array.isArray(sourcePosts)
              ? sourcePosts
              : [];
          if (r !== v.current) return;
          t || s === 1
            ? (u(safeTranslatedSeed), q(1))
            : u((d) => qe(d, safeTranslatedSeed));
          const $ = {},
            U = {};
          Array.isArray(safeTranslatedSeed) &&
            safeTranslatedSeed.forEach((d) => {
              const re = d.post_id || d.id;
              ($[re] = d.likes || 0), (U[re] = d.views_count || d.views || 0);
            }),
            J((d) => (t ? $ : { ...d, ...$ })),
            he((d) => (t ? U : { ...d, ...U })),
            M(safeTranslatedSeed.length === F);
          if (
            activeLanguage &&
            activeLanguage !== "en" &&
            sourcePosts.length > 0
          ) {
            $e(sourcePosts, activeLanguage, {
              paths: FEED_TRANSLATE_PATHS,
            })
              .then((d) => {
                if (r !== v.current || !Array.isArray(d) || d.length === 0)
                  return;
                const _ = new Map();
                d.forEach((re) => {
                  const ce = de(re);
                  ce !== null && _.set(String(ce), re);
                });
                u((re) =>
                  Array.isArray(re)
                    ? re.map((ce) => {
                        const ue = de(ce);
                        if (ue === null) return ce;
                        return _.get(String(ue)) || ce;
                      })
                    : re,
                );
              })
              .catch(() => {});
          }
        } catch (l) {
          if (l?.name === "AbortError" || r !== v.current) return;
          s > 1
            ? (C({
                key: "feed_load_more_failed",
                fallback:
                  l?.message ||
                  "Unable to load more posts right now. Please retry.",
              }),
              M(!1))
            : H({
                key: "feed_load_failed",
                fallback:
                  l?.message ||
                  "Unable to load the feed right now. Please retry.",
              });
        } finally {
          p.current === a && (p.current = null),
            r === v.current && ((A.current = !1), V(!1));
        }
      },
      [L, f, F],
    );
    T(() => {
      y(!0);
    }, [y]),
      T(() => {
        if (!Array.isArray(n) || n.length === 0) return;
        let t = !1;
        if (!m || m === "en") {
          u((r) => (Array.isArray(r) ? r.map(restoreTranslatedPost) : r));
          return;
        }
        const translatedSeed = instantTranslatePosts(n, m, {
          paths: FEED_TRANSLATE_PATHS,
        });
        const safeTranslatedSeed = Array.isArray(translatedSeed)
          ? translatedSeed
          : Array.isArray(n)
            ? n
            : [];
        const s = new Map();
        Array.isArray(safeTranslatedSeed) &&
          safeTranslatedSeed.forEach((a) => {
            const l = de(a);
            l !== null && s.set(String(l), a);
          });
        u((a) =>
          Array.isArray(a)
            ? a.map((l) => {
                const P = de(l);
                if (P === null) return l;
                return s.get(String(P)) || l;
              })
            : a,
        );
        $e(n, m, { paths: FEED_TRANSLATE_PATHS })
          .then((r) => {
            if (t || !Array.isArray(r) || r.length === 0) return;
            const s = new Map();
            r.forEach((a) => {
              const l = de(a);
              l !== null && s.set(String(l), a);
            });
            u((a) =>
              Array.isArray(a)
                ? a.map((l) => {
                    const P = de(l);
                    if (P === null) return l;
                    return s.get(String(P)) || l;
                  })
                : a,
            );
          })
          .catch(() => {});
        return () => {
          t = !0;
        };
      }, [m]),
      T(() => {
        f > 1 && y(!1);
      }, [f]);
    const be = () => {
        window.scrollTo({ top: 0, behavior: "smooth" }), y(!0);
      },
      X = () => {
        window.scrollTo({ top: 0, behavior: "smooth" }), y(!0);
      },
      we = () => {
        C(null), M(!0), y(!1);
      },
      Z = D(() => {
        A.current || !E || ((A.current = !0), q((t) => t + 1));
      }, [E]);
    T(() => {
      const t = () => {
        S.current ||
          ((S.current = !0),
          window.requestAnimationFrame(() => {
            S.current = !1;
            const r = window.innerHeight + window.scrollY,
              s = document.documentElement.scrollHeight;
            if (!h) return;
            r >= s - 1e3 && Z();
          }));
      };
      return (
        window.addEventListener("scroll", t, { passive: !0 }),
        t(),
        () => {
          window.removeEventListener("scroll", t), (S.current = !1);
        }
      );
    }, [Z, h]);
    const R = D((t) => {
        Q(t),
          b.current && clearTimeout(b.current),
          (b.current = setTimeout(() => {
            Q(""), (b.current = null);
          }, 2e3));
      }, []),
      storeScrollPosition = D(() => {
        if (typeof window === "undefined") return;
        try {
          sessionStorage.setItem(
            "feedScrollPosition",
            String(window.scrollY || 0),
          );
        } catch {
          // ignore storage errors
        }
      }, []),
      ee = (t) => {
        ue((r) => ({ ...r, [t]: !r[t] }));
      },
      ve = async (t) => {
        if (!h) {
          W(!0);
          return;
        }
        const r = !!I[t],
          s = fe[t] || 0,
          a = !r;
        ge((l) => ({ ...l, [t]: !l[t] })),
          J((l) => ({ ...l, [t]: Math.max(0, s + (a ? 1 : -1)) }));
        try {
          const l = await fetch(`${L}/api/posts/${t}/like`, {
            method: "POST",
            credentials: "include",
            headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
          });
          if (!l.ok) {
            throw new Error(
              l.status === 401 || l.status === 403 ? "auth_required" : "like_failed",
            );
          }
          const P = await l.json().catch(() => null);
          if (typeof P?.liked == "boolean" && P.liked !== a) {
            ge((k) => ({ ...k, [t]: P.liked })),
              J((k) => ({
                ...k,
                [t]: Math.max(0, s + (P.liked ? 1 : -1)),
              }));
          }
        } catch (l) {
          ge((P) => ({ ...P, [t]: r })),
            J((P) => ({ ...P, [t]: s })),
            l?.message === "auth_required"
              ? W(!0)
              : R(o("like_update_failed") || "Unable to update like right now");
        }
      },
      ye = async (t) => {
        const r = de(t);
        if (r === null) return;
        const s = `${window.location.origin}/feed/${r}`;
        setShareDialogUrl(s), setShareDialogOpen(!0);
        R(o("share_ready") || "Share link ready");
        try {
          await fetch(`${L}/api/posts/${r}/share`, {
            method: "POST",
            credentials: "include",
          });
        } catch {}
      },
      toggleSaveFeed = async (t) => {
        const r = de(t);
        if (r === null) return;
        if (!h) {
          W(!0);
          return;
        }
        const s = beginSavedPostMutation(r);
        if (!s) return;
        const a = !!savedPosts[s],
          l = !a;
        setSavedPosts((P) => ({ ...P, [s]: l })), setSavedPostStatus(s, l);
        try {
          const P = l
            ? await fetch(`${L}/api/wishlist`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
                },
                credentials: "include",
                body: JSON.stringify({ postId: s }),
              })
            : await fetch(`${L}/api/wishlist/${s}`, {
                method: "DELETE",
                credentials: "include",
                headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
              });
          if (!P.ok) {
            throw new Error(
              P.status === 401 || P.status === 403 ? "auth_required" : "save_failed",
            );
          }
          R(
            l
              ? o("saved_post_added") || "Saved to wishlist"
              : o("saved_post_removed") || "Removed from saved",
          );
        } catch (k) {
          setSavedPosts((P) => ({ ...P, [s]: a })),
            setSavedPostStatus(s, a),
            k?.message === "auth_required"
              ? W(!0)
              : R(
                  a
                    ? o("saved_remove_failed") || "Failed to remove saved post"
                    : o("saved_add_failed") || "Failed to save post",
                );
        } finally {
          endSavedPostMutation(s);
        }
      },
      ke = (t) => {
        const r = n.find((s) => s.id === t || s.post_id === t);
        storeScrollPosition();
        fetch(`${L}/api/posts/${t}/view`, {
          method: "POST",
          credentials: "include",
        }).catch(() => {}),
          g(`/feed/${t}`, { state: { post: r } });
      },
      Ne = (t) => {
        if (!t) return "";
      const r = new Date(),
        s = new Date(t),
        a = r - s,
        l = Math.floor(a / 6e4),
        P = Math.floor(a / 36e5),
        k = Math.floor(a / 864e5);
      return l < 1
        ? o("time_just_now") || "Just now"
        : l < 60
          ? o("time_minutes_ago", { count: l, defaultValue: `${l}m ago` })
          : P < 24
            ? o("time_hours_ago", { count: P, defaultValue: `${P}h ago` })
            : k < 7
              ? o("time_days_ago", { count: k, defaultValue: `${k}d ago` })
              : s.toLocaleDateString();
      },
      displayPosts = n,
      visiblePosts = h ? displayPosts : displayPosts.slice(0, Ve),
      guestPreviewLimitReached = !h && displayPosts.length > Ve,
      _e = !!errorMessage && n.length === 0,
      Ce = !!errorMessage && n.length > 0;
    T(() => {
      if (typeof window === "undefined") return;
      const saved = sessionStorage.getItem("feedScrollPosition");
      if (saved && displayPosts.length > 0) {
        requestAnimationFrame(() => {
          window.scrollTo(0, parseInt(saved, 10));
          sessionStorage.removeItem("feedScrollPosition");
        });
      }
    }, [displayPosts.length]);
    return e.createElement(
      "div",
      {
        className:
          "bg-gradient-to-b from-slate-50 to-white dark:from-gray-900 dark:to-gray-800 min-h-screen",
      },
      e.createElement(
        "div",
        {
          className:
            "w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 dark:from-indigo-800 dark:via-purple-800 dark:to-blue-800",
        },
        e.createElement(
          "div",
          { className: "max-w-3xl mx-auto px-4 py-6" },
          e.createElement(
            "div",
            {
              className:
                "flex flex-col md:flex-row items-center justify-between gap-4",
            },
            e.createElement(
              "div",
              { className: "text-center md:text-left" },
              e.createElement(
                "div",
                {
                  className:
                    "flex items-center justify-center md:justify-start gap-3 mb-2",
                },
                e.createElement(le, { className: "text-3xl text-white/90" }),
                e.createElement(
                  "h1",
                  { className: "text-2xl md:text-3xl font-bold text-white" },
                  o("news_updates") || "News & Updates",
                ),
              ),
              e.createElement(
                "p",
                { className: "text-white/70 text-sm" },
                o("share_knowledge") ||
                  "Share knowledge, news, and updates with the community",
              ),
            ),
            e.createElement(
              "div",
              { className: "flex gap-3" },
              e.createElement(
                c,
                {
                  onClick: () => g("/my-feed"),
                  variant: "outline",
                  className:
                    "bg-transparent border-2 border-white/50 text-white hover:bg-white/10 font-bold px-4 py-3 rounded-xl flex items-center gap-2",
                },
                e.createElement(Be, null),
                " ",
                o("my_feed") || "My Feed",
              ),
              h &&
                e.createElement(
                  c,
                  {
                    onClick: () => g("/feed/feedpostadd"),
                    className:
                      "bg-white text-indigo-600 hover:bg-indigo-50 font-bold px-6 py-3 rounded-xl shadow-lg flex items-center gap-2",
                  },
                  e.createElement(Te, null),
                  " ",
                  o("share_update") || "Share Update",
                ),
            ),
          ),
        ),
      ),
      e.createElement(
        "div",
        {
          className:
            "sticky top-0 z-40 border-b bg-white/60 dark:bg-gray-900/60 backdrop-blur-md transition-all active:bg-white/80",
        },
        e.createElement(
          "div",
          {
            className:
              "mx-auto flex w-full max-w-3xl justify-center px-4 py-2",
          },
          e.createElement(
            "button",
            {
              onClick: be,
              disabled: _,
              "aria-label": o("refresh_feed") || "Refresh feed posts",
              "data-ux-action": "feed_refresh_posts",
              className:
                "text-xs font-bold text-indigo-600 dark:text-indigo-400 px-6 py-2 rounded-full bg-indigo-50 dark:bg-indigo-900/40 shadow-sm border border-indigo-100 dark:border-indigo-800 active:scale-95 transition-transform flex items-center gap-2",
            },
            _ && f === 1
              ? e.createElement(
                  e.Fragment,
                  null,
                  e.createElement(
                    "span",
                    { className: "animate-spin inline-block" },
                    "R",
                  ),
                  " ",
                  o("refreshing") || "Refreshing...",
                )
              : e.createElement(
                  e.Fragment,
                  null,
                  o("refresh_feed") || "Refresh posts",
                ),
          ),
        ),
      ),
      e.createElement(
        "div",
        { className: "max-w-3xl mx-auto px-4 py-6" },
        !h &&
          e.createElement(
            O,
            { className: "mb-6 border border-indigo-100 bg-indigo-50/70 p-4" },
            e.createElement(
              "div",
              {
                className:
                  "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
              },
              e.createElement(
                "div",
                null,
                e.createElement(
                  "p",
                  { className: "font-semibold text-indigo-900" },
                  "Guest mode is active",
                ),
                e.createElement(
                  "p",
                  { className: "text-sm text-indigo-700" },
                  "You can read a few posts now. Log in to keep scrolling and post updates.",
                ),
              ),
              e.createElement(
                c,
                {
                  variant: "outline",
                  className:
                    "border-indigo-300 text-indigo-700 hover:bg-indigo-100",
                  onClick: () => g("/login", { state: { returnTo: "/feed" } }),
                },
                "Log in for full feed",
              ),
            ),
          ),
        h &&
          e.createElement(
            O,
            {
              className:
                "mb-6 p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border cursor-pointer hover:shadow-md transition",
              onClick: () => g("/feed/feedpostadd"),
              role: "button",
              tabIndex: 0,
              onKeyDown: (t) => {
                (t.key === "Enter" || t.key === " ") &&
                  (t.preventDefault(), g("/feed/feedpostadd"));
              },
            },
            e.createElement(
              "div",
              { className: "flex items-center gap-4" },
              e.createElement(
                oe,
                { className: "w-11 h-11 bg-indigo-100 dark:bg-indigo-900" },
                e.createElement(
                  se,
                  {
                    className: "text-indigo-600 dark:text-indigo-300 font-bold",
                  },
                  me,
                ),
              ),
              e.createElement(
                "div",
                {
                  className:
                    "flex-1 bg-gray-100 dark:bg-gray-700 rounded-full px-5 py-3 text-gray-400",
                },
                o("share_something") || "Share something with the community...",
              ),
            ),
          ),
        e.createElement(
          "div",
          { className: "space-y-4" },
          Ce
            ? e.createElement(
                ne,
                {
                  className: "border-amber-300 bg-amber-50 text-amber-900",
                  "data-ux-state": "feed-refresh-error",
                },
                e.createElement(
                  ie,
                  null,
                  o("latest_refresh_failed") || "Latest refresh failed",
                ),
                e.createElement(
                  ae,
                  null,
                  errorMessage,
                  " ",
                  o("showing_last_loaded_posts") ||
                    "Showing the last loaded posts.",
                ),
                e.createElement(
                  "div",
                  { className: "mt-3" },
                  e.createElement(
                    c,
                    {
                      size: "sm",
                      variant: "outline",
                      "data-ux-action": "feed_refresh_retry",
                      className: "border-amber-400 text-amber-900",
                      onClick: X,
                    },
                    o("retry_refresh") || "Retry refresh",
                  ),
                ),
              )
            : null,
          _ && f === 1 && n.length === 0
            ? e.createElement(He, {
                title: o("loading") || "Loading...",
                description:
                  o("feed_loading_desc") || "Loading feed posts for you.",
                marker: "loading",
              })
            : _e
              ? e.createElement(Oe, {
                  title: o("feed_unavailable") || "Feed unavailable",
                  description: errorMessage,
                  onRetry: X,
                  retryLabel: o("retry") || "Retry",
                  marker: "error",
                  secondaryAction: h
                    ? e.createElement(
                        c,
                        {
                          variant: "outline",
                          className: "border-indigo-300 text-indigo-700",
                          onClick: () => g("/feed/feedpostadd"),
                        },
                        o("create_post") || "Create Post",
                      )
                    : e.createElement(
                        c,
                        {
                          variant: "outline",
                          className: "border-indigo-300 text-indigo-700",
                          onClick: () =>
                            g("/login", { state: { returnTo: "/feed" } }),
                        },
                        o("login_to_share_updates") ||
                          "Log in to share updates",
                      ),
                })
              : displayPosts.length === 0
                ? e.createElement(je, {
                  title: o("no_posts") || "No posts yet. Be the first to share!",
                  description:
                    o("feed_empty_desc_social", {
                      defaultValue:
                        "Share an update or check back soon for new community posts.",
                    }),
                    icon: le,
                    marker: "empty",
                    action: e.createElement(
                      "div",
                      {
                        className:
                          "flex flex-col sm:flex-row gap-3 justify-center",
                      },
                      h
                        ? e.createElement(
                            c,
                            {
                              onClick: () => g("/feed/feedpostadd"),
                              className: "bg-indigo-600 text-white",
                            },
                            o("create_post") || "Create Post",
                          )
                        : e.createElement(
                            c,
                            {
                              variant: "outline",
                              className: "border-indigo-300 text-indigo-700",
                              onClick: () =>
                                g("/login", { state: { returnTo: "/feed" } }),
                            },
                            o("login_to_share_updates") ||
                              "Log in to share updates",
                          ),
                    ),
                  })
                : visiblePosts.map((t) => {
                    const r = t.post_id || t.id,
                      s = ce[r],
                      a = t.description || "",
                      l = a.length > 250;
                    return e.createElement(
                      O,
                      {
                        key: r,
                        className:
                          "bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition",
                      },
                      e.createElement(
                        "div",
                        {
                          className:
                            "flex items-start gap-2 px-5 pt-4 pb-2 relative min-w-0 flex-nowrap",
                        },
                        e.createElement(
                          oe,
                          {
                            className:
                              `w-11 h-11 shrink-0 bg-gradient-to-br ${getAvatarGradient(
                                t.user?.name || t.username || r,
                              )}`,
                          },
                          e.createElement(
                            se,
                            { className: "text-white font-bold" },
                            t.user?.name?.[0] || t.username?.[0] || "U",
                          ),
                        ),
                        e.createElement(
                          "div",
                          { className: "flex-1 min-w-0 pr-2" },
                          e.createElement(
                            "span",
                            {
                              className:
                                "font-semibold text-gray-900 dark:text-white truncate",
                            },
                            t.user?.name ||
                              t.username ||
                              o("anonymous") ||
                              "Anonymous",
                          ),
                          e.createElement(
                            "p",
                            {
                              className:
                                "text-[11px] font-semibold text-indigo-600 dark:text-indigo-400",
                            },
                            o("activity_update") || "Shared an update",
                          ),
                          e.createElement(
                            "div",
                            {
                              className:
                                "text-gray-400 dark:text-gray-400 text-xs flex flex-wrap items-center gap-2",
                            },
                            e.createElement(
                              "span",
                              {
                              className:
                                "inline-flex items-center gap-1 rounded-full bg-indigo-50 dark:bg-indigo-900/40 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 dark:text-indigo-200",
                            },
                              e.createElement(Ge, { className: "w-3 h-3" }),
                              getPostLocationLabel(t) || o("global") || "Global",
                            ),
                            e.createElement("span", null, "\xE2\u20AC\xA2"),
                            e.createElement(
                              "span",
                              { className: "text-gray-500 dark:text-gray-400" },
                              Ne(t.created_at),
                            ),
                            e.createElement(
                              "span",
                              {
                                className:
                                  "inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-[11px] font-semibold text-gray-600 dark:text-gray-200",
                              },
                              `${o("post_id") || "Post ID"}: `,
                              r,
                            ),
                          ),
                        ),
                        e.createElement(
                          "button",
                          {
                            type: "button",
                            onClick: () =>
                              setMenuPostId((s) =>
                                s === String(r) ? null : String(r),
                              ),
                            className:
                              "p-2 rounded-full text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 shrink-0 ml-auto self-start mt-0.5",
                            title: o("more_options") || "More options",
                          },
                          e.createElement(Xe, { className: "w-4 h-4" }),
                        ),
                        menuPostId === String(r) &&
                          e.createElement(
                            "div",
                            {
                              className:
                                "absolute right-5 top-12 z-20 w-44 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg p-1",
                            },
                            e.createElement(
                              "button",
                              {
                                type: "button",
                                onClick: () => {
                                  ye(r), setMenuPostId(null);
                                },
                                className:
                                  "w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg",
                              },
                              o("share") || "Share",
                            ),
                            e.createElement(
                              "button",
                              {
                                type: "button",
                                onClick: () => {
                                  toggleSaveFeed(r), setMenuPostId(null);
                                },
                                className:
                                  "w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg",
                              },
                              savedPosts[String(r)]
                                ? o("saved") || "Saved"
                                : o("save") || "Save",
                            ),
                            e.createElement(
                              "button",
                              {
                                type: "button",
                                onClick: () => {
                                  R(
                                    o("report_feature_coming_soon") ||
                                      "Report feature coming soon",
                                  ),
                                    setMenuPostId(null);
                                },
                                className:
                                  "w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg",
                              },
                              o("report") || "Report",
                            ),
                          ),
                      ),
                      e.createElement(
                        "div",
                        { className: "px-5 pb-4" },
                        t.title &&
                          e.createElement(
                            "h3",
                            {
                              className:
                                "text-lg font-bold text-gray-900 dark:text-white mb-2",
                            },
                            t.title,
                          ),
                        e.createElement(
                          "div",
                          {
                            className:
                              "text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap",
                          },
                          l && !s
                            ? e.createElement(
                                e.Fragment,
                                null,
                                a.slice(0, 250),
                                "...",
                                e.createElement(
                                  "button",
                                  {
                                    onClick: () => ee(r),
                                    className:
                                      "text-indigo-600 dark:text-indigo-400 font-medium hover:underline ml-1",
                                  },
                                  o("read_more") || o("view_more") || "Read more",
                                ),
                              )
                            : e.createElement(
                                e.Fragment,
                                null,
                                a ||
                                  e.createElement(
                                    "span",
                                    { className: "italic text-gray-400 dark:text-gray-500" },
                                    o("no_content"),
                                  ),
                                l &&
                                  s &&
                                  e.createElement(
                                    "button",
                                    {
                                    onClick: () => ee(r),
                                    className:
                                      "text-indigo-600 dark:text-indigo-400 font-medium hover:underline ml-1 block mt-2",
                                    },
                                    o("read_less") || o("view_less") || "Read less",
                                  ),
                              ),
                        ),
                      ),
                      e.createElement(
                        "div",
                        {
                          className:
                            "px-3 py-2.5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50",
                        },
                        e.createElement(
                          "div",
                          {
                          className:
                            "post-action-row flex flex-nowrap items-center gap-2 sm:gap-3 overflow-x-auto whitespace-nowrap pr-2 py-1 text-[11px] sm:text-xs scrollbar-hide",
                          },
                          e.createElement(
                            "button",
                            {
                              className:
                                "shrink-0 inline-flex h-7 items-center gap-1.5 rounded-full bg-gray-100 dark:bg-gray-700 px-2 text-gray-600 dark:text-gray-300 hover:text-red-500 transition font-medium",
                              onClick: () => ve(r),
                            },
                            I[r]
                              ? e.createElement(Se, {
                                  className: "text-red-500",
                                })
                              : e.createElement(Ae, null),
                            e.createElement("span", null, fe[r] || 0),
                          ),
                          e.createElement(
                            "button",
                            {
                              className:
                                "shrink-0 inline-flex h-7 items-center gap-1.5 rounded-full bg-gray-100 dark:bg-gray-700 px-2 text-gray-600 dark:text-gray-300 hover:text-indigo-600 transition font-medium",
                              onClick: () => ye(r),
                            },
                            e.createElement(Le, null),
                            e.createElement(
                              "span",
                              { className: "hidden sm:inline" },
                              o("share") || "Share",
                            ),
                          ),
                          e.createElement(
                            "button",
                            {
                              className:
                                "shrink-0 inline-flex h-7 items-center gap-1.5 rounded-full bg-gray-100 dark:bg-gray-700 px-2 text-gray-600 dark:text-gray-300 hover:text-indigo-600 transition font-medium",
                              onClick: () => toggleSaveFeed(r),
                            },
                            savedPosts[String(r)]
                              ? e.createElement(Ke, {
                                  className: "text-indigo-600",
                                })
                              : e.createElement(Qe, null),
                            e.createElement(
                              "span",
                              { className: "hidden sm:inline" },
                              savedPosts[String(r)]
                                ? o("saved") || "Saved"
                                : o("save") || "Save",
                            ),
                          ),
                          e.createElement(
                            "span",
                            {
                              className:
                                "shrink-0 inline-flex h-7 items-center gap-1.5 rounded-full bg-gray-100 dark:bg-gray-700 px-2 text-gray-500 dark:text-gray-300",
                            },
                            e.createElement(Pe, null),
                            e.createElement(
                              "span",
                              { className: "hidden sm:inline" },
                              o("views") || "Views",
                            ),
                            e.createElement("span", null, pe[r] || 0),
                          ),
                          e.createElement(
                            c,
                            {
                              variant: "ghost",
                              className:
                                "shrink-0 h-7 rounded-full bg-gray-100 dark:bg-gray-700 px-2 text-[11px] sm:text-xs text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 font-medium",
                              onClick: () => ke(r),
                            },
                            e.createElement(Pe, { className: "w-4 h-4" }),
                            e.createElement(
                              "span",
                              { className: "hidden sm:inline" },
                              o("view_details") || "View Details",
                            ),
                          ),
                        ),
                      ),
                    );
                  }),
          guestPreviewLimitReached &&
            e.createElement(
              O,
              {
                className:
                  "border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-5 text-center shadow-sm",
                "data-ux-state": "feed-guest-preview-limit",
              },
              e.createElement(
                "p",
                { className: "text-sm font-semibold text-indigo-800" },
                o("guest_preview_limit_title") || "Preview limit reached",
              ),
              e.createElement(
                "p",
                { className: "mt-2 text-sm text-indigo-700" },
                o("guest_preview_limit_desc") ||
                  "Log in to read the full community feed, save updates, and post your own news.",
              ),
              e.createElement(
                "div",
                {
                  className:
                    "mt-4 flex flex-col items-center justify-center gap-3 sm:flex-row",
                },
                e.createElement(
                  c,
                  {
                    onClick: () => g("/login", { state: { returnTo: "/feed" } }),
                    className: "bg-indigo-600 text-white hover:bg-indigo-700",
                  },
                  o("login_to_continue") || "Log in to continue",
                ),
                e.createElement(
                  c,
                  {
                    variant: "outline",
                    className: "border-indigo-300 text-indigo-700 hover:bg-indigo-50",
                    onClick: () => g("/signup", { state: { returnTo: "/feed" } }),
                  },
                  o("create_account") || "Create account",
                ),
              ),
            ),
          _ &&
            f > 1 &&
            e.createElement(
              "div",
              {
                className: "text-center py-4",
                "data-ux-state": "feed-load-more-loading",
              },
              e.createElement("div", {
                className:
                  "w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto",
              }),
            ),
          loadMoreErrorMessage &&
            displayPosts.length > 0 &&
            e.createElement(
              ne,
              {
                className: "border-red-300 bg-red-50 text-red-900",
                "data-ux-state": "feed-load-more-error",
              },
              e.createElement(
                ie,
                null,
                o("more_posts_unavailable") || "More posts unavailable",
              ),
              e.createElement(ae, null, loadMoreErrorMessage),
              e.createElement(
                "div",
                { className: "mt-3" },
                e.createElement(
                  c,
                  {
                    size: "sm",
                    variant: "outline",
                    "data-ux-action": "feed_load_more_retry",
                    className: "border-red-300 text-red-700",
                    onClick: we,
                  },
                  o("retry_loading_more") || "Retry loading more",
                ),
              ),
            ),
          !guestPreviewLimitReached &&
            !E &&
            displayPosts.length > 0 &&
            e.createElement(
              "div",
              { className: "text-center py-10" },
              e.createElement(
                "div",
                { className: "inline-flex flex-col items-center gap-2" },
                e.createElement("div", { className: "w-12 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" }),
                e.createElement("span", { className: "text-2xl" }, "✨"),
                e.createElement("p", { className: "text-sm font-medium text-gray-500 dark:text-gray-400" }, o("end_of_feed") || "You've reached the end"),
                e.createElement("p", { className: "text-xs text-gray-400 dark:text-gray-500" }, o("check_back_later") || "Check back later for new listings"),
                e.createElement("div", { className: "w-12 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" }),
              ),
            ),
        ),
      ),
      K &&
        e.createElement(
          "div",
          {
            className:
              "fixed bottom-8 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-6 py-3 rounded-xl shadow-lg z-50",
          },
          K,
        ),
      e.createElement(Fe, { isOpen: xe, onClose: () => W(!1) }),
      e.createElement(Re, {
        open: shareDialogOpen,
        onOpenChange: setShareDialogOpen,
        url: shareDialogUrl,
        title: o("share") || "Share post",
      }),
    );
  };
var ot = FeedPage;
export { ot as default };

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
import PageDensityToggle from "@/components/ui/PageDensityToggle";
import { usePageDensity } from "@/hooks/usePageDensity";
import Fe from "@/components/LoginPromptModal";
import {
  translatePosts as $e,
  translatePostsInstant as instantTranslatePosts,
} from "@/utils/translateContent";
import { useAuth as Ue } from "@/context/AuthContext";
import { useCategoryMode } from "@/context/CategoryModeContext";
import { hasAuthSession } from "@/utils/authStorage";
import { getUserId as getUserIdFromStorage } from "@/utils/authStorage";
import api from "@/services/api";
import {
  PageEmptyState as je,
  PageErrorState as Oe,
  PageLoadingState as He,
} from "@/components/page-state/PageStateBlocks";
import Re from "@/components/ShareLinkDialog";
import PromoteDialog from "@/components/PromoteDialog";
import {
  beginSavedPostMutation,
  buildSavedPostsMap,
  endSavedPostMutation,
  fetchWishlistIds,
  getSavedPostsMap,
  setSavedPostStatus,
  subscribeSavedPosts,
} from "@/utils/savedPosts";
import {
  buildActiveAppMatcher,
  matchesCategoryModeItem,
} from "@/utils/categoryModeFilters";
import { isPostOwnedByUser } from "@/utils/postOwnership";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import { usePageRefresh } from "@/hooks/usePageRefresh";
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
    if (o == null) return null;
    if (typeof o !== "object") return o;
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
  getFeedSellerName = (o) => {
    const candidate =
      o?.user?.name ||
      o?.author_name ||
      o?.seller?.name ||
      o?.seller_name ||
      o?.author ||
      o?.username ||
      "";
    const cleaned = String(candidate || "").trim();
    return (cleaned && cleaned !== "Seller") ? cleaned : "";
  },
  getFeedPriceValue = (o) => {
    const candidate =
      o?.price ??
      o?.amount ??
      o?.listing_price ??
      o?.post_price ??
      o?.product_price ??
      null;
    const parsed = Number(candidate);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  },
  formatFeedPrice = (value) => {
    if (!Number.isFinite(value) || value <= 0) return "";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value);
  },
  getFeedPrimaryImage = (o) => {
    const raw =
      o?.image_url ||
      o?.imageUrl ||
      o?.thumbnail ||
      o?.cover ||
      o?.photo ||
      o?.media_url ||
      (Array.isArray(o?.images) ? o.images[0] : null) ||
      (Array.isArray(o?.media) ? o.media[0] : null);
    if (!raw) return "";
    if (typeof raw === "string") return resolveMediaUrl(raw) || "";
    const candidate =
      raw?.url || raw?.src || raw?.image_url || raw?.imageUrl || raw?.path || "";
    return resolveMediaUrl(candidate) || "";
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
      [searchQuery, setSearchQuery] = i(""),
      [debouncedSearch, setDebouncedSearch] = i(""),
      [sortBy, setSortBy] = i("shuffle"),
      [sortOrder, setSortOrder] = i("desc"),
      [categoryGroup, setCategoryGroup] = i("all"),
      { density, setDensity } = usePageDensity("mhub_feed_density"),
      F = 10,
      G = w(Date.now()),
      v = w(0),
      p = w(null),
      S = w(!1),
      b = w(null),
      A = w(!1),
      g = Ee(),
      { user: Y } = Ue(),
      {
        activeCategory: categoryModeCategory,
        activeApp,
        categories: categoryModeCategories,
      } = useCategoryMode(),
      currentUserId = getUserIdFromStorage(Y),
      me = j(
        () => localStorage.getItem("username")?.[0]?.toUpperCase() || "U",
        [],
      ),
      [ce, ue] = i({}),
      [I, ge] = i({}),
      [fe, J] = i({}),
      [pe, he] = i({}),
      [K, Q] = i(""),
      [showAddFeedModal, setShowAddFeedModal] = i(!1),
      [addFeedText, setAddFeedText] = i(""),
      [isSubmittingFeed, setIsSubmittingFeed] = i(!1),
      handleAddFeedPostSubmit = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        if (!addFeedText.trim() || addFeedText.trim().length < 5) return;
        setIsSubmittingFeed(!0);
        try {
          const res = await api.post("/api/feed/add", { description: addFeedText.trim() });
          if (res.data) {
            u((prev) => [res.data, ...prev]);
            setAddFeedText("");
            setShowAddFeedModal(!1);
            Q("News/Info update posted successfully!");
            setTimeout(() => Q(""), 3000);
          }
        } catch (err) {
          Q(err.response?.data?.error || "Failed to add post");
          setTimeout(() => Q(""), 3000);
        } finally {
          setIsSubmittingFeed(!1);
        }
      },
      h = j(
        () =>
          !!(Y || hasAuthSession()),
        [Y],
      ),
      [xe, W] = i(!1),
      [menuPostId, setMenuPostId] = i(null),
      [savedPosts, setSavedPosts] = i(() => getSavedPostsMap()),
      [shareDialogOpen, setShareDialogOpen] = i(!1),
      [shareDialogUrl, setShareDialogUrl] = i(""),
      [promotePostId, setPromotePostId] = i(null),
      [promotePostTitle, setPromotePostTitle] = i(""),
      [showBackToTop, setShowBackToTop] = i(!1);
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
    const openPromote = D((postId, title) => {
      if (!postId) return;
      setPromotePostId(String(postId));
      setPromotePostTitle(String(title || ""));
    }, []);
    const closePromote = D(() => {
      setPromotePostId(null);
      setPromotePostTitle("");
    }, []);
    const activeAppMatcher = j(
      () => buildActiveAppMatcher(activeApp, categoryModeCategories),
      [activeApp, categoryModeCategories],
    );
    const categoryModeCategoryId = j(() => {
      const directId =
        categoryModeCategory?.id || categoryModeCategory?.category_id || null;
      if (directId != null && directId !== "") return String(directId);
      const categoryName = String(categoryModeCategory?.name || "").trim().toLowerCase();
      if (!categoryName) return "";
      const match = (Array.isArray(categoryModeCategories) ? categoryModeCategories : []).find(
        (entry) =>
          String(
            entry?.name || entry?.title || entry?.label || entry?.category_name || "",
          )
            .trim()
            .toLowerCase() === categoryName,
      );
      const matchedId = match?.category_id || match?.id || null;
      return matchedId != null && matchedId !== "" ? String(matchedId) : "";
    }, [categoryModeCategory?.id, categoryModeCategory?.category_id, categoryModeCategory?.name, categoryModeCategories]);
    const filterFeedPost = D(
      (t) =>
        matchesCategoryModeItem(t, {
          activeCategory: categoryModeCategory,
          activeCategoryId: categoryModeCategoryId,
          activeAppMatcher,
        }),
      [categoryModeCategory, categoryModeCategoryId, activeAppMatcher],
    );
    T(() => {
      if (activeAppMatcher?.activeApp && categoryGroup === "all") {
        setCategoryGroup(activeAppMatcher.activeApp);
      }
    }, [activeAppMatcher?.activeApp]);
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
    T(() => {
      const timer = setTimeout(() => setDebouncedSearch(searchQuery), 350);
      return () => clearTimeout(timer);
    }, [searchQuery]);

    const syncSavedPosts = D(async () => {
      if (!h) {
        return;
      }

      try {
        const ids = await fetchWishlistIds(async () => {
          const response = await api.get("/wishlist");
          return response?.data ?? response;
        });
        setSavedPosts(buildSavedPostsMap(ids));
      } catch {
        // Keep local fallback state when sync fails.
      }
    }, [h]);

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
          const params = new URLSearchParams();
          params.set("page", String(s));
          params.set("limit", String(F));
          const effectiveCategory =
            categoryGroup !== "all"
              ? categoryGroup
              : activeAppMatcher?.activeApp || "";
          if (effectiveCategory) {
            params.set("category_group", String(effectiveCategory));
          }
          if (debouncedSearch.trim()) {
            params.set("search", debouncedSearch.trim());
          }
          if (sortBy === "shuffle") {
            t && (G.current = l);
            params.set("sortBy", "shuffle");
            params.set("shuffleSeed", String(l));
          } else {
            params.set("sortBy", sortBy);
            params.set("sortOrder", sortOrder);
          }
          params.set("post_type", "text");
          const k = await api.get("/feed", { params, signal: a.signal });
          const te = k?.data ?? k;
          let x = Array.isArray(te?.posts)
            ? te.posts
            : Array.isArray(te)
              ? te
              : [];
          if (
            activeAppMatcher?.activeApp ||
            categoryModeCategoryId ||
            categoryModeCategory?.name
          ) {
            x = x.filter(filterFeedPost);
          }
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
          if (l?.name === "CanceledError" || l?.code === "ERR_CANCELED" || r !== v.current) return;
          s > 1
            ? (C({
                key: "feed_load_more_failed",
                fallback: "Unable to load more posts right now. Please retry.",
              }),
              M(!1))
            : H({
                key: "feed_load_failed",
                fallback: "Unable to load the feed right now. Please retry.",
              });
        } finally {
          p.current === a && (p.current = null),
            r === v.current && ((A.current = !1), V(!1));
        }
      },
      [
        f,
        F,
        activeAppMatcher?.activeApp,
        categoryModeCategory?.name,
        categoryModeCategoryId,
        filterFeedPost,
        debouncedSearch,
        sortBy,
        sortOrder,
        categoryGroup,
      ],
    );
    T(() => {
      y(!0);
    }, [y]);
    usePageRefresh(D(() => y(!0), [y]));
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
            setShowBackToTop(window.scrollY > 400);
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
          const l = await api.post(`/posts/${t}/like`);
          const P = l?.data ?? null;
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
            (l?.response?.status === 401 || l?.response?.status === 403)
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
          await api.post(`/posts/${r}/share`);
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
          l
            ? await api.post("/wishlist", { postId: s })
            : await api.delete(`/wishlist/${s}`);
          R(
            l
              ? o("saved_post_added") || "Saved to wishlist"
              : o("saved_post_removed") || "Removed from saved",
          );
        } catch (k) {
          setSavedPosts((P) => ({ ...P, [s]: a })),
            setSavedPostStatus(s, a),
            (k?.response?.status === 401 || k?.response?.status === 403)
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
      handleReportPost = (t) => {
        const r = de(t);
        if (r === null) {
          R(o("report_failed") || "Unable to report this post.");
          return;
        }
        g(`/complaints?postId=${encodeURIComponent(r)}`);
      },
      ke = (t) => {
        const r = n.find((s) => s.id === t || s.post_id === t);
        storeScrollPosition();
        api.post(`/posts/${t}/view`).catch(() => {}),
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
              : k < 30
                ? o("time_weeks_ago", { count: Math.floor(k / 7), defaultValue: `${Math.floor(k / 7)}w ago` })
                : k < 365
                  ? o("time_months_ago", { count: Math.floor(k / 30), defaultValue: `${Math.floor(k / 30)}mo ago` })
                  : o("time_years_ago", { count: Math.floor(k / 365), defaultValue: `${Math.floor(k / 365)}y ago` });
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
          `mhub-premium-page bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:via-slate-900/70 dark:to-slate-950 min-h-screen pb-24 dark:bg-gradient-to-b ${density === "compact" ? "mhub-compact" : ""}`,
      },
      e.createElement(
        "div",
        {
          className:
            "w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 dark:from-[#0b1220] dark:via-[#1b2542] dark:to-[#0b1220] dark:bg-gradient-to-r",
          "data-density": "extra",
        },
        e.createElement(
          "div",
          { className: "max-w-[640px] mx-auto px-4 py-3" },
          e.createElement(
            "div",
            {
              className:
                "flex flex-col md:flex-row items-center justify-between gap-4",
            },
            e.createElement(
              "div",
              { className: "text-center md:text-left dark:md:text-left" },
              e.createElement(
                "div",
                {
                  className:
                    "flex items-center justify-center md:justify-start gap-3 mb-2",
                },
                e.createElement(le, { className: "text-xl sm:text-3xl text-white/90 dark:text-white/90" }),
                e.createElement(
                  "h1",
                  { className: "text-lg sm:text-2xl md:text-3xl font-bold text-white dark:text-white" },
                  o("news_updates") || "News & Updates",
                ),
              ),
              e.createElement(
                "p",
                { className: "text-white/70 text-sm dark:text-white/70" },
                o("share_knowledge") ||
                  "Share knowledge, news, and updates with the community",
              ),
              e.createElement(
                "div",
                {
                  className:
                    "mt-3 flex flex-wrap items-center justify-center md:justify-start gap-2 text-xs font-semibold text-white/80",
                },
                e.createElement(
                  "span",
                  {
                    className:
                      "inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-1 text-white",
                  },
                  o("community_feed", { defaultValue: "Community feed" }),
                ),
                e.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: () => g("/all-posts"),
                    className:
                      "inline-flex items-center gap-1 rounded-full border border-white/30 bg-white/10 px-2 py-1 text-white hover:bg-white/20",
                  },
                  o("browse_marketplace", { defaultValue: "Browse marketplace" }),
                ),
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
                    "bg-transparent border-2 border-white/50 text-white hover:bg-white/10 font-bold px-4 py-3 rounded-xl flex items-center gap-2 dark:bg-transparent dark:border-white/50 dark:text-white dark:hover:bg-slate-900/10",
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
                      "bg-white text-indigo-600 hover:bg-indigo-50 font-bold px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 dark:bg-slate-900 dark:text-indigo-300 dark:hover:bg-indigo-950/20",
                  },
                  e.createElement(Te, null),
                  " ",
                  o("share_update") || "Share Update",
                ),
              e.createElement(PageDensityToggle, {
                value: density,
                onChange: setDensity,
                label: o("view", { defaultValue: "View" }),
              }),
            ),
          ),
        ),
      ),
      e.createElement(
        "div",
        {
          className:
            "sticky z-40 mhub-premium-bar feed-sticky-toolbar transition-all",
          style: { top: "var(--top-nav-height, 60px)" },
        },
        e.createElement(
          "div",
          {
            className:
              "mx-auto w-full max-w-[640px] px-3 py-2 space-y-2",
          },
          /* Search + sort row */
          e.createElement(
            "div",
            { className: "flex items-center gap-2" },
            e.createElement("input", {
              type: "text",
              value: searchQuery,
              onChange: (t) => setSearchQuery(t.target.value),
              placeholder: o("search_feed") || "\uD83D\uDD0D Search the feed...",
              className:
                "feed-search-input flex-1 px-3 py-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/90 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-sm",
            }),
            e.createElement(
              "select",
              {
                value: sortBy,
                onChange: (t) => setSortBy(t.target.value),
                className:
                  "feed-sort-select px-2 py-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/90 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-sm",
              },
              e.createElement("option", { value: "shuffle" }, "\u2728 " + (o("sort_discover") || "Discover")),
              e.createElement("option", { value: "created_at" }, "\uD83D\uDD25 " + (o("sort_recent") || "Newest")),
              e.createElement("option", { value: "updated_at" }, "\uD83D\uDD04 " + (o("sort_updated") || "Updated")),
              e.createElement("option", { value: "views_count" }, "\uD83D\uDC41 " + (o("sort_views") || "Popular")),
              e.createElement("option", { value: "likes" }, "\u2764 " + (o("sort_likes") || "Liked")),
              e.createElement("option", { value: "title" }, "\uD83D\uDD24 " + (o("sort_title") || "Title")),
            ),
            e.createElement(
              "button",
              {
                onClick: be,
                disabled: _,
                "aria-label": o("refresh_feed") || "Refresh feed posts",
                "data-ux-action": "feed_refresh_posts",
                className:
                  "feed-refresh-btn flex items-center justify-center w-9 h-9 rounded-full bg-indigo-50 dark:bg-indigo-900/40 border border-indigo-100 dark:border-indigo-800 active:scale-90 transition-transform text-indigo-600 dark:text-indigo-300 shadow-sm",
              },
              _ && f === 1
                ? e.createElement("span", { className: "animate-spin inline-block text-sm" }, "\u21BB")
                : e.createElement("span", { className: "text-sm" }, "\u21BB"),
            ),
          ),
          /* Sort order pills */
          e.createElement(
            "div",
            { className: "feed-sort-pills flex items-center gap-1.5 overflow-x-auto scrollbar-hide" },
            e.createElement(
              "button",
              {
                type: "button",
                onClick: () => setSortOrder("desc"),
                className: `feed-sort-pill inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold transition-colors ${sortOrder === "desc" ? "bg-indigo-600 text-white shadow-sm" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"}`,
              },
              "\u2B07 " + (o("sort_desc") || "Newest first"),
            ),
            e.createElement(
              "button",
              {
                type: "button",
                onClick: () => setSortOrder("asc"),
                className: `feed-sort-pill inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold transition-colors ${sortOrder === "asc" ? "bg-indigo-600 text-white shadow-sm" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"}`,
              },
              "\u2B06 " + (o("sort_asc") || "Oldest first"),
            ),
            displayPosts && displayPosts.length > 0 && e.createElement(
              "span",
              { className: "ml-auto text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap" },
              displayPosts.length + " " + (o("posts_count") || "posts"),
            ),
          ),
        ),
      ),
      e.createElement(
        "div",
        { className: "max-w-[640px] mx-auto px-4 py-3" },
        !h &&
          e.createElement(
            O,
            { className: "mb-6 border border-indigo-100 bg-indigo-50/70 p-4 dark:border-indigo-600/40 dark:bg-indigo-950/70" },
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
                  { className: "font-semibold text-indigo-900 dark:text-indigo-200" },
                  "Guest mode is active",
                ),
                e.createElement(
                  "p",
                  { className: "text-sm text-indigo-700 dark:text-indigo-300" },
                  "You can read a few posts now. Log in to keep scrolling and post updates.",
                ),
              ),
              e.createElement(
                c,
                {
                  variant: "outline",
                  className:
                    "border-indigo-300 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-600/40 dark:text-indigo-300 dark:hover:bg-indigo-950/20",
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
                "mb-6 p-4 mhub-premium-surface rounded-2xl cursor-pointer hover:shadow-md transition",
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
                { className: "w-11 h-11 bg-indigo-100 dark:bg-indigo-950/20" },
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
                    "flex-1 bg-gray-100 dark:bg-gray-700 rounded-full px-5 py-3 text-gray-400 dark:bg-gray-950 dark:text-gray-300",
                },
                o("share_something") || "Share something with the community...",
              ),
            ),
          ),
        e.createElement(
          "div",
          { className: "space-y-2" },
          Ce
            ? e.createElement(
                ne,
                {
                  className: "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-600/40 dark:bg-amber-950/20 dark:text-amber-200",
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
                      className: "border-amber-400 text-amber-900 dark:border-amber-600/40 dark:text-amber-200",
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
                          className: "border-indigo-300 text-indigo-700 dark:border-indigo-600/40 dark:text-indigo-300",
                          onClick: () => g("/feed/feedpostadd"),
                        },
                        o("create_post") || "Create Post",
                      )
                    : e.createElement(
                        c,
                        {
                          variant: "outline",
                          className: "border-indigo-300 text-indigo-700 dark:border-indigo-600/40 dark:text-indigo-300",
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
                              className: "bg-indigo-600 text-white dark:bg-indigo-700/40 dark:text-white",
                            },
                            o("create_post") || "Create Post",
                          )
                        : e.createElement(
                            c,
                            {
                              variant: "outline",
                              className: "border-indigo-300 text-indigo-700 dark:border-indigo-600/40 dark:text-indigo-300",
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
                      l = a.length > 250,
                      sellerName = getFeedSellerName(t),
                      sellerInitial = (sellerName || "U")[0].toUpperCase(),
                      postPriceValue = getFeedPriceValue(t),
                      postPriceLabel = formatFeedPrice(postPriceValue),
                      primaryImage = getFeedPrimaryImage(t),
                      isOwnerPost = isPostOwnedByUser(t, currentUserId);
                    return e.createElement(
                      O,
                      {
                        key: r,
                        className:
                          "mhub-premium-surface rounded-xl overflow-hidden hover:shadow-md transition",
                      },
                      e.createElement(
                        "div",
                        {
                          className:
                            "flex items-start gap-2 px-3 pt-2 pb-1 relative min-w-0 flex-nowrap",
                        },
                        e.createElement(
                          oe,
                          {
                            className:
                              `w-8 h-8 shrink-0 bg-gradient-to-br dark:bg-gradient-to-br ${getAvatarGradient(
                                sellerName || r,
                              )}`,
                          },
                          e.createElement(
                            se,
                            { className: "text-white font-bold dark:text-white" },
                            sellerInitial,
                          ),
                        ),
                        e.createElement(
                          "div",
                          { className: "flex-1 min-w-0 pr-2" },
                          e.createElement(
                            "div",
                            {
                              className:
                                "flex flex-wrap items-center gap-1.5 text-sm",
                            },
                            e.createElement(
                              "span",
                              {
                                className:
                                  "font-semibold text-gray-900 dark:text-white truncate max-w-[140px] cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400",
                                onClick: () => t.user_id ? g(`/profile/${t.user_id}`) : null,
                              },
                              sellerName || o("community_member") || "Community Member",
                            ),
                            (getPostLocationLabel(t))
                              ? e.createElement(
                                  e.Fragment,
                                  null,
                                  e.createElement("span", { className: "text-gray-300 dark:text-gray-600" }, "\u00B7"),
                                  e.createElement(
                                    "span",
                                    {
                                      className:
                                        "inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 truncate max-w-[120px]",
                                    },
                                    e.createElement(Ge, { className: "w-4 h-4 shrink-0" }),
                                    getPostLocationLabel(t),
                                  ),
                                )
                              : null,
                            e.createElement("span", { className: "text-gray-300 dark:text-gray-600" }, "\u00B7"),
                            e.createElement(
                              "span",
                              { className: "text-xs text-gray-400 dark:text-gray-500" },
                              Ne(t.created_at),
                            ),
                          ),
                          (t.category_name || t.subcategory_name || t.category) &&
                            e.createElement(
                              "div",
                              { className: "flex flex-wrap items-center gap-1 mt-0.5" },
                              (t.category_name || t.category) &&
                                e.createElement(
                                  "span",
                                  { className: "inline-flex items-center px-1.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-xs font-medium text-indigo-600 dark:text-indigo-300" },
                                  t.category_name || t.category,
                                ),
                              t.subcategory_name &&
                                e.createElement(
                                  "span",
                                  { className: "inline-flex items-center px-1.5 py-1 rounded-md bg-purple-50 dark:bg-purple-900/30 text-xs font-medium text-purple-600 dark:text-purple-300" },
                                  t.subcategory_name,
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
                              "p-2 rounded-full text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 shrink-0 ml-auto self-start mt-0.5 dark:hover:bg-gray-950",
                            title: o("more_options") || "More options",
                          },
                          e.createElement(Xe, { className: "w-4 h-4" }),
                        ),
                        menuPostId === String(r) &&
                          e.createElement(
                            "div",
                            {
                              className:
                                "absolute right-4 top-14 z-30 w-52 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-2xl p-1.5 ring-1 ring-black/5 dark:ring-white/10",
                            },
                            e.createElement(
                              "button",
                              {
                                type: "button",
                                onClick: () => {
                                  ke(r), setMenuPostId(null);
                                },
                                className:
                                  "w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/60 text-gray-700 dark:text-gray-200 transition-colors",
                              },
                              e.createElement(Pe, { className: "w-4 h-4 text-indigo-500 shrink-0" }),
                              o("view_details") || "View Details",
                            ),
                            e.createElement(
                              "button",
                              {
                                type: "button",
                                onClick: () => {
                                  ye(r), setMenuPostId(null);
                                },
                                className:
                                  "w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/60 text-gray-700 dark:text-gray-200 transition-colors",
                              },
                              e.createElement(Le, { className: "w-4 h-4 text-blue-500 shrink-0" }),
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
                                  "w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/60 text-gray-700 dark:text-gray-200 transition-colors",
                              },
                              savedPosts[String(r)]
                                ? e.createElement(Ke, { className: "w-4 h-4 text-indigo-600 shrink-0" })
                                : e.createElement(Qe, { className: "w-4 h-4 text-gray-400 shrink-0" }),
                              savedPosts[String(r)]
                                ? o("saved") || "Saved"
                                : o("save") || "Save",
                            ),
                            isOwnerPost &&
                              e.createElement(
                                "button",
                                {
                                  type: "button",
                                  onClick: () => {
                                    openPromote(r, t.title);
                                    setMenuPostId(null);
                                  },
                                  className:
                                    "w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/60 text-gray-700 dark:text-gray-200 transition-colors",
                                },
                                e.createElement(Te, { className: "w-4 h-4 text-emerald-500 shrink-0" }),
                                o("promote") || "Promote",
                              ),
                            e.createElement("div", { className: "my-1 border-t border-gray-100 dark:border-gray-700" }),
                            e.createElement(
                              "button",
                              {
                                type: "button",
                                onClick: () => {
                                  handleReportPost(r), setMenuPostId(null);
                                },
                                className:
                                  "w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 dark:text-red-400 transition-colors",
                              },
                              e.createElement("span", { className: "w-4 h-4 shrink-0 inline-flex items-center justify-center text-xs" }, "\u26A0"),
                              o("report") || "Report",
                            ),
                          ),
                      ),
                      e.createElement(
                        "div",
                        { className: "px-3 pb-2" },
                        (t.title || postPriceLabel)
                          ? e.createElement(
                              "div",
                              { className: "flex items-baseline justify-between gap-1.5 mb-1" },
                              t.title &&
                                e.createElement(
                                  "h3",
                                  {
                                    className:
                                      "text-sm font-bold text-gray-900 dark:text-gray-100 truncate flex-1 min-w-0 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors",
                                    onClick: () => ke(r),
                                  },
                                  t.title,
                                ),
                            )
                          : null,
                        e.createElement(
                          "div",
                          {
                            className:
                              "text-sm text-gray-700 dark:text-gray-300 leading-snug whitespace-pre-wrap dark:text-gray-200",
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
                                      "text-indigo-600 dark:text-indigo-400 font-medium hover:underline ml-1 dark:text-indigo-300",
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
                                    { className: "italic text-gray-400 dark:text-gray-300" },
                                    o("no_content"),
                                  ),
                                l &&
                                  s &&
                                  e.createElement(
                                    "button",
                                    {
                                    onClick: () => ee(r),
                                    className:
                                      "text-indigo-600 dark:text-indigo-400 font-medium hover:underline ml-1 block mt-2 dark:text-indigo-300",
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
                            "px-2 py-1.5 border-t border-gray-200 dark:border-gray-700 mhub-premium-bar dark:border-t",
                        },
                        e.createElement(
                          "div",
                          {
                          className:
                            "post-action-row flex flex-nowrap items-center gap-2 sm:gap-3 overflow-x-auto whitespace-nowrap pr-2 py-1 text-xs sm:text-xs scrollbar-hide",
                          },
                          e.createElement(
                            "button",
                            {
                              className:
                                "shrink-0 inline-flex h-10 items-center gap-1.5 rounded-full bg-gray-100 dark:bg-gray-700 px-2.5 text-gray-600 dark:text-gray-300 hover:text-red-500 transition font-medium dark:bg-gray-950 dark:text-gray-200 dark:hover:text-red-300",
                              onClick: () => ve(r),
                            },
                            I[r]
                              ? e.createElement(Se, {
                                  className: "text-red-500 dark:text-red-300",
                                })
                              : e.createElement(Ae, null),
                            e.createElement("span", null, fe[r] || 0),
                          ),
                          e.createElement(
                            "button",
                            {
                              className:
                                "shrink-0 inline-flex h-10 items-center gap-1.5 rounded-full bg-gray-100 dark:bg-gray-700 px-2.5 text-gray-600 dark:text-gray-300 hover:text-indigo-600 transition font-medium dark:bg-gray-950 dark:text-gray-200 dark:hover:text-indigo-300",
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
                                "shrink-0 inline-flex h-10 items-center gap-1.5 rounded-full bg-gray-100 dark:bg-gray-700 px-2.5 text-gray-600 dark:text-gray-300 hover:text-indigo-600 transition font-medium dark:bg-gray-950 dark:text-gray-200 dark:hover:text-indigo-300",
                              onClick: () => toggleSaveFeed(r),
                            },
                            savedPosts[String(r)]
                              ? e.createElement(Ke, {
                                  className: "text-indigo-600 dark:text-indigo-300",
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
                                "shrink-0 inline-flex h-10 items-center gap-1.5 rounded-full bg-gray-100 dark:bg-gray-700 px-2.5 text-gray-500 dark:text-gray-300 dark:bg-gray-950",
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
                                "shrink-0 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/40 px-3 text-xs text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800/40 font-semibold sm:ml-auto",
                              onClick: () => ke(r),
                            },
                            e.createElement(Pe, { className: "w-3.5 h-3.5" }),
                            e.createElement(
                              "span",
                              null,
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
                  "border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-5 text-center shadow-sm dark:border-indigo-600/40 dark:bg-gradient-to-br",
                "data-ux-state": "feed-guest-preview-limit",
              },
              e.createElement(
                "p",
                { className: "text-sm font-semibold text-indigo-800 dark:text-indigo-200" },
                o("guest_preview_limit_title") || "Preview limit reached",
              ),
              e.createElement(
                "p",
                { className: "mt-2 text-sm text-indigo-700 dark:text-indigo-300" },
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
                    className: "bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-700/40 dark:text-white dark:hover:bg-indigo-700/40",
                  },
                  o("login_to_continue") || "Log in to continue",
                ),
                e.createElement(
                  c,
                  {
                    variant: "outline",
                    className: "border-indigo-300 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-600/40 dark:text-indigo-300 dark:hover:bg-indigo-950/20",
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
                  "w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto dark:border-t-transparent",
              }),
            ),
          loadMoreErrorMessage &&
            displayPosts.length > 0 &&
            e.createElement(
              ne,
              {
                className: "border-red-300 bg-red-50 text-red-900 dark:border-red-600/40 dark:bg-red-950/20 dark:text-red-200",
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
                    className: "border-red-300 text-red-700 dark:border-red-600/40 dark:text-red-300",
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
                e.createElement("div", { className: "w-12 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent dark:bg-gradient-to-r" }),
                e.createElement("span", { className: "text-2xl" }, "✨"),
                e.createElement("p", { className: "text-sm font-medium text-gray-500 dark:text-gray-300" }, o("end_of_feed") || "You've reached the end"),
                e.createElement("p", { className: "text-xs text-gray-400 dark:text-gray-300" }, o("check_back_later") || "Check back later for new listings"),
                e.createElement("div", { className: "w-12 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent dark:bg-gradient-to-r" }),
              ),
            ),
        ),
      ),
      h &&
        e.createElement(
          "button",
          {
            type: "button",
            onClick: () => g("/feed/feedpostadd"),
            className:
              "fixed bottom-24 right-4 z-50 w-14 h-14 rounded-full bg-indigo-600 text-white shadow-xl hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center dark:bg-indigo-700 dark:hover:bg-indigo-800",
            "aria-label": o("create_post") || "Create Post",
          },
          e.createElement(Te, { className: "w-6 h-6" }),
        ),
      showBackToTop &&
        e.createElement(
          "button",
          {
            type: "button",
            onClick: () => window.scrollTo({ top: 0, behavior: "smooth" }),
            className:
              "fixed bottom-40 right-4 z-50 w-10 h-10 rounded-full mhub-premium-surface shadow-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all",
            "aria-label": o("back_to_top") || "Back to top",
          },
          e.createElement(
            "svg",
            { xmlns: "http://www.w3.org/2000/svg", className: "w-5 h-5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2 },
            e.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M5 15l7-7 7 7" }),
          ),
        ),
      K &&
        e.createElement(
          "div",
          {
            className:
              "fixed bottom-[calc(var(--bottom-nav-height,64px)+var(--bottom-nav-safe,0px)+0.5rem)] left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-6 py-3 rounded-xl shadow-lg z-[60] dark:bg-indigo-700/40 dark:text-white",
          },
          K,
        ),
      e.createElement(
        "button",
        {
          type: "button",
          onClick: () => {
            if (!h) {
              W(!0);
              return;
            }
            setShowAddFeedModal(!0);
          },
          className:
            "fixed bottom-24 right-4 z-50 w-14 h-14 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all dark:from-orange-600 dark:to-amber-600",
          "aria-label": "Add News Update",
          title: "Post News or Information Update",
        },
        e.createElement(Te, { className: "w-6 h-6" })
      ),
      showAddFeedModal &&
        e.createElement(
          "div",
          { className: "fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" },
          e.createElement(
            "div",
            { className: "bg-card border rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4" },
            e.createElement(
              "div",
              { className: "flex items-center justify-between border-b pb-3" },
              e.createElement("h3", { className: "text-lg font-bold flex items-center gap-2" }, e.createElement(le, { className: "w-5 h-5 text-orange-500" }), "Post News & Info Update"),
              e.createElement("button", { onClick: () => setShowAddFeedModal(!1), className: "text-muted-foreground hover:text-foreground text-sm font-bold" }, "✕")
            ),
            e.createElement(
              "form",
              { onSubmit: handleAddFeedPostSubmit, className: "space-y-4" },
              e.createElement(
                "div",
                { className: "space-y-1.5" },
                e.createElement("label", { className: "text-xs font-semibold text-muted-foreground" }, "Descriptive Update Text (5-500 chars)"),
                e.createElement("textarea", {
                  rows: 5,
                  placeholder: "Write your news, announcement, or descriptive information update here...",
                  value: addFeedText,
                  onChange: (e) => setAddFeedText(e.target.value),
                  className: "w-full p-3 rounded-xl border bg-background text-sm focus:ring-2 focus:ring-orange-500 outline-none resize-none",
                })
              ),
              e.createElement(
                "div",
                { className: "flex justify-end gap-2 pt-2" },
                e.createElement(c, { type: "button", variant: "outline", onClick: () => setShowAddFeedModal(!1) }, "Cancel"),
                e.createElement(c, { type: "submit", disabled: isSubmittingFeed || addFeedText.trim().length < 5, className: "bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold" }, isSubmittingFeed ? "Posting..." : "Publish Update")
              )
            )
          )
        ),
      e.createElement(PromoteDialog, {
        open: Boolean(promotePostId),
        onOpenChange: (t) => {
          if (!t) closePromote();
        },
        postId: promotePostId,
        postTitle: promotePostTitle,
      }),
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


import e, {
  useState as n,
  useEffect as ie,
  useMemo as h,
  useCallback as Ze,
} from "react";
import {
  Link as ne,
  useNavigate as Ge,
  useLocation as wt,
} from "react-router-dom";
import { useTranslation as Ve } from "react-i18next";
import {
  translatePosts as We,
  translatePostsInstant as instantTranslatePosts,
} from "@/utils/translateContent";
import { Button as g } from "@/components/ui/button";
import { Card as de, CardContent as ge } from "@/components/ui/card";
import { Badge as me } from "@/components/ui/badge";
import { Switch as Oe } from "@/components/ui/switch";
import {
  Alert as Ye,
  AlertDescription as Qe,
  AlertTitle as Je,
} from "@/components/ui/alert";
import {
  Eye as Xe,
  Heart as qe,
  Edit as Ke,
  Trash2 as Z,
  Plus as ce,
  ShoppingBag as Re,
  Package as ue,
  CheckCircle2 as G,
  MapPin as et,
  XCircle as tt,
  MoreVertical as lt,
  Share2 as st,
  ArrowLeft as ot,
  Search as rt,
  CheckSquare as at,
  Square as it,
  Sparkles as nt,
  ChevronRight as be,
  Copy as dt,
  AlertTriangle as xe,
  RefreshCw as he,
  Bookmark as saveMarkIcon,
  BookmarkCheck as savedMarkIcon,
} from "lucide-react";
import { useToast as gt } from "@/hooks/use-toast";
import { useAuth as mt } from "@/context/AuthContext";
import { useCategoryMode } from "@/context/CategoryModeContext";
import { getAccessToken as ct, getUserId as ut } from "@/utils/authStorage";
import {
  buildSavedPostsMap,
  beginSavedPostMutation,
  endSavedPostMutation,
  extractSavedPostIds,
  getSavedPostsMap,
  replaceSavedPostIds,
  setSavedPostStatus,
  subscribeSavedPosts,
} from "@/utils/savedPosts";
import { resolveMediaUrl as meURL } from "@/lib/mediaUrl";
import ShareLinkDialog from "@/components/ShareLinkDialog";
import {
  DropdownMenu as bt,
  DropdownMenuContent as xt,
  DropdownMenuItem as V,
  DropdownMenuTrigger as ht,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog as W,
  AlertDialogAction as O,
  AlertDialogCancel as Y,
  AlertDialogContent as Q,
  AlertDialogDescription as J,
  AlertDialogFooter as X,
  AlertDialogHeader as q,
  AlertDialogTitle as K,
} from "@/components/ui/alert-dialog";
import R from "@/services/api";
import { getApiOriginBase as pt } from "@/lib/networkConfig";
import {
  buildActiveAppMatcher,
  matchesCategoryModeItem,
} from "@/utils/categoryModeFilters";
const setNestedValue = (t, s, r) => {
    if (!t || typeof t != "object" || !s) return;
    const o = String(s).split(".");
    let a = t;
    for (let i = 0; i < o.length - 1; i += 1) {
      const l = o[i];
      (!a[l] || typeof a[l] != "object") && (a[l] = {});
      a = a[l];
    }
    a[o[o.length - 1]] = r;
  },
  restoreTranslatedPost = (t) => {
    if (!t || typeof t != "object") return t;
    const s = t._originalTranslations;
    if (!s || typeof s != "object") return t;
    const r = { ...t };
    return (
      Object.entries(s).forEach(([o, a]) => {
        setNestedValue(r, o, a);
      }),
      typeof t._originalTitle == "string" && (r.title = t._originalTitle),
      typeof t._originalDescription == "string" &&
        (r.description = t._originalDescription),
      r
    );
  },
  normalizeSearchValue = (value) => {
    if (typeof value == "string") return value.toLowerCase();
    if (typeof value == "number") return String(value);
    if (value && typeof value == "object") {
      const candidate =
        value.name ||
        value.city ||
        value.locality ||
        value.address ||
        value.formatted ||
        value.label;
      if (typeof candidate == "string") return candidate.toLowerCase();
    }
    return "";
  },
  extractPostList = (payload) => {
    if (Array.isArray(payload?.posts)) return payload.posts;
    if (Array.isArray(payload?.data?.posts)) return payload.data.posts;
    if (Array.isArray(payload?.items)) return payload.items;
    if (Array.isArray(payload?.rows)) return payload.rows;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload)) return payload;
    return [];
  };
const MyHomePage = () => {
  const [p, pe] = n("active"),
    [c, w] = n(new Set()),
    [ve, B] = n(!1),
    [fe, ee] = n(!1),
    [T, te] = n(null),
    [le, we] = n(new Set()),
    [j, k] = n([]),
    [D, C] = n(""),
    [Ne, L] = n(!1),
    [ye, ke] = n(0),
    [x, A] = n(1),
    N = 10,
    [z, De] = n(""),
    U = "postedDate",
    se = "desc",
    [Ce, $] = n(!1),
    [_, oe] = n(!1),
    [shareDialogOpen, setShareDialogOpen] = n(!1),
    [shareDialogUrl, setShareDialogUrl] = n(""),
    [savedPosts, setSavedPosts] = n(() => getSavedPostsMap()),
    b = Ge(),
    routeLoc = wt(),
    { toast: d } = gt(),
    { t: l, i18n: Ae } = Ve(),
    tr = (key, fallback, options = {}) =>
      l(key, { defaultValue: fallback, ...options }),
    { user: _e, isAuthenticated: _authIsAuthenticated } = mt(),
    {
      activeCategory: categoryModeCategory,
      activeApp,
      hasSelection: hasCategoryMode,
      categories: categoryModeCategories,
    } = useCategoryMode(),
    categoryModeCategoryId = h(() => {
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
    activeAppMatcher = h(
      () => buildActiveAppMatcher(activeApp, categoryModeCategories),
      [activeApp, categoryModeCategories],
    ),
    E = Ae.language || "en",
    F = ut(_e),
    H = ct(),
    Pe = Boolean(_authIsAuthenticated ?? _e ?? F ?? H),
    Se = pt(),
    resolveMessage = Ze(
      (t) => {
        if (!t) return "";
        if (typeof t === "string") return t;
        const s = t.key ? l(t.key, t.params) : "";
        if (typeof s == "string" && s && s !== t.key) return s;
        return t.fallback || "";
      },
      [l],
    ),
    Ie = (t) => {
      if (!t) return "/placeholder.svg";
      const s = t.image_url || t.imageUrl || t.thumbnail || t.image;
      if (typeof s == "string" && s.trim()) return meURL(s, "/placeholder.svg");
      const r = t.images;
      if (Array.isArray(r) && r.length) return meURL(r[0], "/placeholder.svg");
      if (typeof r == "string" && r.trim())
        try {
          const o = JSON.parse(r);
          return Array.isArray(o) && o.length
            ? meURL(o[0], "/placeholder.svg")
            : meURL(r, "/placeholder.svg");
        } catch {
          return meURL(r, "/placeholder.svg");
        }
      if (typeof t == "string") return meURL(t, "/placeholder.svg");
      return "/placeholder.svg";
    };
  ie(() => {
    let t = !1;
    return (
      (async () => {
        L(!0);
        const r = F;
        if (!Pe) {
          t ||
            (C({
              key: "my_home_login_required",
              fallback: "You must be logged in to view your posts.",
            }),
            L(!1));
          return;
        }
        try {
          const params = r
              ? {
                  userId: r,
                  ...(categoryModeCategoryId
                    ? { category: categoryModeCategoryId }
                    : {}),
                }
              : undefined,
            o = await R.get(
              "/posts/mine",
              params ? { params } : undefined,
            ),
            a = extractPostList(o);
          let i = a;
          if (E !== "en" && a.length > 0) {
            const instantTranslated = instantTranslatePosts(a, E);
            const safeInstant = Array.isArray(instantTranslated)
              ? instantTranslated
              : a;
            i = safeInstant;
            t || k(safeInstant);
            We(a, E)
              .then((o) => {
                t || (Array.isArray(o) && o.length > 0 ? k(o) : k(safeInstant));
              })
              .catch(() => {
                t || k(safeInstant);
              });
          }
          t || (k(i), C(""));
        } catch (o) {
          if ((console.error("Fetch posts error:", o), !t)) {
            k([]);
            const a = Number(o?.status || o?.response?.status || 0);
            C(
              a === 401 || a === 403
                ? {
                    key: "session_expired",
                    fallback: "Your session expired. Please sign in again.",
                  }
                : {
                    key: "my_home_load_failed",
                    fallback: "Could not load your listings. Please retry.",
                  },
            );
          }
        } finally {
          t || L(!1);
        }
      })(),
      () => {
        t = !0;
      }
    );
  }, [H, F, ye, categoryModeCategoryId]);
  ie(() => {
    if (!Array.isArray(j) || j.length === 0) return;
    let t = !1;
    if (!E || E === "en") {
      k((s) => (Array.isArray(s) ? s.map(restoreTranslatedPost) : s));
      return;
    }
    const instantTranslated = instantTranslatePosts(j, E);
    const safeInstant = Array.isArray(instantTranslated)
      ? instantTranslated
      : j;
    k(safeInstant);
    We(j, E)
      .then((r) => {
        t || (Array.isArray(r) && r.length > 0 ? k(r) : k(safeInstant));
      })
      .catch(() => {
        t || k(safeInstant);
      });
    return () => {
      t = !0;
    };
  }, [E]);
  ie(() => subscribeSavedPosts(setSavedPosts), []);
  const listError = resolveMessage(D);
  ie(() => {
    if (!Pe) return;
    let t = !1;
    (async () => {
      try {
        const s = F
          ? await R.get("/wishlist", { params: { userId: F } })
          : await R.get("/wishlist");
        if (t) return;
        const r = extractSavedPostIds(s);
        replaceSavedPostIds(r);
        setSavedPosts(buildSavedPostsMap(r));
      } catch {
        // Keep local fallback values.
      }
    })();
    return () => {
      t = !0;
    };
  }, [Pe, F]);
  ie(() => {
    const allowedTabs = new Set(["all", "active", "sold", "bought"]);
    const query = new URLSearchParams(routeLoc?.search || "");
    const stateFocusTab = routeLoc?.state?.focusTab;
    const queryFocusTab = query.get("tab");
    let storedMarker = null;

    try {
      const rawMarker = localStorage.getItem("mhub:sale:lastCompleted");
      if (rawMarker) {
        const parsed = JSON.parse(rawMarker);
        if (parsed && typeof parsed == "object") {
          storedMarker = parsed;
        }
      }
    } catch {
      storedMarker = null;
    }

    const markerCompletedAt = storedMarker?.completedAt
      ? Date.parse(String(storedMarker.completedAt))
      : NaN;
    const markerAgeMs = Number.isFinite(markerCompletedAt)
      ? Date.now() - markerCompletedAt
      : Number.POSITIVE_INFINITY;
    const freshMarker =
      Number.isFinite(markerAgeMs) &&
      markerAgeMs >= 0 &&
      markerAgeMs <= 30 * 60 * 1000;

    const focusTabCandidate = [
      stateFocusTab,
      queryFocusTab,
      storedMarker?.focusTab,
    ].find(
      (tabValue) => typeof tabValue == "string" && allowedTabs.has(tabValue),
    );

    if (focusTabCandidate) {
      pe(focusTabCandidate);
    }

    const shouldShowSaleToast =
      Boolean(routeLoc?.state?.saleCompleted) ||
      query.get("saleCompleted") === "1" ||
      freshMarker;

    if (shouldShowSaleToast) {
      const transactionId =
        routeLoc?.state?.transactionId || storedMarker?.transactionId || "";
      d({
        title: tr("sale_completed", "Sale completed"),
        description: transactionId
          ? l("sale_completed_txn", { transactionId }) ||
            `Listing moved to Sold. Transaction: ${transactionId}.`
          : tr(
              "sale_completed_desc",
              "Listing moved to Sold. You can find it in Sold tab.",
            ),
      });
      try {
        localStorage.removeItem("mhub:sale:lastCompleted");
      } catch {
        // Ignore storage failures.
      }
    } else if (!freshMarker && storedMarker) {
      try {
        localStorage.removeItem("mhub:sale:lastCompleted");
      } catch {
        // Ignore storage failures.
      }
    }
  }, [routeLoc?.key, routeLoc?.search]);
  const re = Ze(() => {
      ke((t) => t + 1);
    }, []),
    u = h(() => {
      const base = Array.isArray(j) ? j : [];
      return base.filter((t) =>
        matchesCategoryModeItem(t, {
          activeCategory: hasCategoryMode ? categoryModeCategory : null,
          activeCategoryId: categoryModeCategoryId,
          activeAppMatcher,
        }),
      );
    }, [
      j,
      hasCategoryMode,
      categoryModeCategory,
      categoryModeCategoryId,
      activeAppMatcher,
    ]),
    P = h(
      () =>
        u.filter((t) => String(t?.ownership || "").toLowerCase() === "bought"),
      [u],
    ),
    S = h(
      () =>
        u.filter(
          (t) => String(t?.ownership || "own").toLowerCase() !== "bought",
        ),
      [u],
    ),
    I = h(() => S.filter((t) => t.status === "sold"), [S]),
    v = h(() => S.filter((t) => t.status === "active"), [S]),
    f = h(() => {
      const t =
          p === "all"
            ? u
            : p === "active"
              ? v
              : p === "sold"
                ? I
                : p === "bought"
                  ? P
                  : u,
        s = z.trim().toLowerCase(),
        r = s
          ? t.filter((o) => {
              const titleValue = normalizeSearchValue(o?.title);
              const locationValue = normalizeSearchValue(o?.location);
              return titleValue.includes(s) || locationValue.includes(s);
            })
          : t,
        m = (o) => {
          if (U === "postedDate")
            return new Date(o.postedDate || o.created_at || 0).getTime();
          const a = o?.[U] ?? o?.created_at ?? 0;
          return typeof a == "string" ? a.toLowerCase() : a;
        };
      return [...r].sort((o, a) => {
        const i = m(o),
          y = m(a);
        if (i === y) return 0;
        if (se === "asc") {
          return i > y ? 1 : -1;
        }
        return i < y ? 1 : -1;
      });
    }, [p, v, u, P, z, I, U, se]),
    M = h(() => Math.max(1, Math.ceil(f.length / N)), [f.length, N]);
  ie(() => {
    A((t) => Math.min(Math.max(t, 1), M));
  }, [M]);
  const Me = h(() => f.slice((x - 1) * N, x * N), [f, x, N]),
    Be = () => b("/saledone"),
    Te = (t) => {
      const minutes = (new Date() - new Date(t)) / (1e3 * 60);
      return minutes <= 5;
    },
    je = (t) =>
      b(`/post/${t.postId || t.post_id || t.id}`, {
        state: { fromMyPosts: true },
      }),
    Le = (t) => {
      if (!Te(t.created_at || t.postedTime)) {
        d({
          title: tr("edit_not_available", "Edit Not Available"),
          description: tr(
            "edit_time_limit",
            "Posts can only be edited within 5 minutes of publishing",
          ),
          variant: "destructive",
        });
        return;
      }
      d({
        title: tr("edit_post", "Edit Post"),
        description: tr("opening_editor_for_post", "Opening editor for post"),
      }),
        b(`/edit-post/${t.postId || t.post_id || t.id}`);
    },
    ze = (t) => {
      const s = t.postId || t.post_id || t.id;
      if (!s) return;
      const r = `${window.location.origin}/post/${s}`;
      setShareDialogUrl(r),
        setShareDialogOpen(!0),
        fetch(`${Se}/api/posts/${s}/share`, {
          method: "POST",
          credentials: "include",
          headers: H ? { Authorization: `Bearer ${H}` } : {},
        }).catch(() => {});
    },
    saveMyPost = async (t) => {
      const s = t.postId || t.post_id || t.id;
      if (!s) return;
      if (!Pe) {
        b("/login", { state: { returnTo: "/my-home" } });
        return;
      }
      const r = String(s);
      const m = beginSavedPostMutation(r);
      if (!m) return;
      const o = !!savedPosts[m],
        a = !o;
      setSavedPosts((l) => ({ ...l, [m]: a })), setSavedPostStatus(m, a);
      try {
        if (a) {
          await fetch(`${Se}/api/wishlist`, {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              ...(H ? { Authorization: `Bearer ${H}` } : {}),
            },
            body: JSON.stringify({ postId: m }),
          });
        } else {
          await fetch(`${Se}/api/wishlist/${m}`, {
            method: "DELETE",
            credentials: "include",
            headers: H ? { Authorization: `Bearer ${H}` } : {},
          });
        }
      } catch {
        setSavedPosts((l) => ({ ...l, [m]: o })),
          setSavedPostStatus(m, o),
          d({
            title: tr("save_failed", "Save Failed"),
            description: tr(
              "save_status_update_failed",
              "Unable to update saved status",
            ),
            variant: "destructive",
          });
      } finally {
        endSavedPostMutation(m);
      }
    },
    ae = (t) => {
      te(t), B(!0);
    },
    Ue = async () => {
      if (T)
        try {
          await R.delete(`/posts/${T}`),
            k((t) => t.filter((s) => (s.postId || s.post_id || s.id) !== T)),
            d({
              title: tr("post_deleted", "Post Deleted"),
              description: tr(
                "post_deleted_success",
                "Post has been deleted successfully",
              ),
            });
        } catch (t) {
          console.error("Delete error:", t),
            d({
              title: tr("delete_failed", "Delete Failed"),
              description:
                t.message ||
                tr("delete_failed_desc", "Could not delete the post."),
              variant: "destructive",
            });
        } finally {
          te(null), B(!1);
        }
    },
    $e = () => {
      const t = new Set([...le, ...c]);
      we(t),
        d({
          title: tr("posts_moved", "Posts Moved"),
          description:
            l("posts_moved_count", { count: c.size }) ||
            `${c.size} posts moved to Sale Undone`,
        }),
        w(new Set()),
        ee(!1),
        b("/saleundone");
    },
    Ee = (t) => {
      if (le.has(t)) {
        d({
          title: tr("cannot_select", "Cannot Select"),
          description: tr(
            "already_moved_sale_undone",
            "This post has already been moved to Sale Undone",
          ),
          variant: "destructive",
        });
        return;
      }
      const s = new Set(c);
      s.has(t) ? s.delete(t) : s.add(t), w(s);
    },
    Fe = () => {
      if (_) w(new Set());
      else {
        const t = v.map((s) => s.postId || s.post_id || s.id);
        w(new Set(t));
      }
      oe(!_);
    },
    He = async () => {
      if (c.size === 0) {
        d({
          title: tr("no_posts_selected", "No Posts Selected"),
          description: tr(
            "select_posts_delete",
            "Please select posts to delete",
          ),
          variant: "destructive",
        });
        return;
      }
      try {
        const t = Array.from(c),
          s = await Promise.allSettled(
            t.map((o) => R.delete(`/posts/${o}`).then(() => o)),
          ),
          r = s.filter((o) => o.status === "fulfilled").map((o) => o.value),
          m = s.length - r.length;
        if (r.length > 0) {
          const o = new Set(r);
          k((a) => a.filter((i) => !o.has(i.postId || i.post_id || i.id))),
            w((a) => {
              const i = new Set(a);
              return r.forEach((y) => i.delete(y)), i;
            });
        }
        m === 0
          ? (oe(!1),
            $(!1),
            d({
              title: tr("posts_deleted", "Posts Deleted"),
              description:
                l("posts_deleted_count", { count: r.length }) ||
                `${r.length} posts have been deleted`,
            }))
          : d({
              title: tr("partial_delete", "Partial Delete"),
              description:
                l("partial_delete_count", { deleted: r.length, failed: m }) ||
                `${r.length} deleted, ${m} failed.`,
              variant: "destructive",
            });
      } catch (t) {
        console.error("Bulk delete error:", t),
          d({
            title: tr("delete_failed", "Delete Failed"),
            description: tr(
              "some_posts_delete_failed",
              "Some posts could not be deleted",
            ),
            variant: "destructive",
          });
      }
    };
  return Ne
    ? e.createElement(
        "div",
        {
          className:
            "flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-900 dark:to-gray-800",
        },
        e.createElement(
          "div",
          { className: "text-center" },
          e.createElement("div", {
            className:
              "animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4",
          }),
          e.createElement(
            "p",
            { className: "text-gray-600 dark:text-gray-300 font-medium" },
            l("loading_posts"),
          ),
        ),
      )
    : Pe
      ? listError && u.length === 0
        ? e.createElement(
            "div",
            {
              className:
                "min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4 pt-28",
            },
            e.createElement(
              de,
              { className: "max-w-xl mx-auto border-red-200 page-shell page-pad" },
              e.createElement(
                ge,
                { className: "p-8 text-center" },
                e.createElement(
                  "div",
                  {
                    className:
                      "w-12 h-12 mx-auto rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-3",
                  },
                  e.createElement(xe, { className: "w-6 h-6" }),
                ),
                e.createElement(
                  "h2",
                  {
                    className:
                      "text-xl font-semibold text-gray-900 dark:text-white mb-2",
                  },
                  tr("my_home_listings_unavailable", "Listings unavailable"),
                ),
                e.createElement(
                  "p",
                  {
                    className: "text-sm text-gray-600 dark:text-gray-300 mb-5",
                  },
                  listError,
                ),
                e.createElement(
                  "div",
                  { className: "flex flex-wrap justify-center gap-2" },
                  e.createElement(
                    g,
                    { onClick: re },
                    e.createElement(he, { className: "w-4 h-4 mr-2" }),
                    tr("retry", "Retry"),
                  ),
                  e.createElement(
                    g,
                    { variant: "outline", onClick: () => b("/all-posts") },
                    tr("browse_marketplace", "Browse Marketplace"),
                  ),
                ),
              ),
            ),
          )
        : e.createElement(
            "div",
            {
              className:
                "min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300 pt-20",
            },
            e.createElement(
              "div",
              { className: "relative overflow-hidden" },
              e.createElement("div", {
                className:
                  "absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600",
              }),
              e.createElement("div", {
                className:
                  "absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0YzAtMi4yMS0xLjc5LTQtNC00cy00IDEuNzktNCA0IDEuNzkgNCA0IDQgNC0xLjc5IDQtNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30",
              }),
              e.createElement(
                "div",
                { className: "relative py-10 sm:py-12 max-w-4xl mx-auto px-4 sm:px-6 page-shell page-pad" },
                e.createElement(
                  "button",
                  {
                    onClick: () => b("/all-posts"),
                    className:
                      "absolute top-4 left-4 p-2 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-all z-50",
                  },
                  e.createElement(ot, { className: "w-6 h-6 text-white" }),
                ),
                e.createElement(
                  "div",
                  { className: "text-center" },
                  e.createElement(
                    "div",
                    {
                      className:
                        "inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm mb-4",
                    },
                    e.createElement(
                      "span",
                      { className: "text-3xl font-semibold text-white" },
                      "MH",
                    ),
                  ),
                  e.createElement(
                    "h1",
                    {
                      className:
                        "text-3xl md:text-4xl font-bold text-white mb-2",
                    },
                    l("my_home_title"),
                  ),
                  e.createElement(
                    "p",
                    { className: "text-blue-100 text-lg" },
                    l("my_home_subtitle"),
                  ),
                ),
              ),
            ),
            e.createElement(
              "div",
              {
                className: "mt-6 mb-8 relative z-10 max-w-4xl mx-auto px-4 sm:px-6 page-shell page-pad",
              },
              e.createElement(
                "div",
                { className: "grid grid-cols-2 md:grid-cols-4 gap-4" },
                e.createElement(
                  "div",
                  {
                    className:
                      "bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-lg border border-gray-100 dark:border-gray-700",
                  },
                  e.createElement(
                    "div",
                    { className: "flex items-center gap-3" },
                    e.createElement(
                      "div",
                      {
                        className:
                          "w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center",
                      },
                      e.createElement(ue, {
                        className: "w-6 h-6 text-blue-600",
                      }),
                    ),
                    e.createElement(
                      "div",
                      null,
                      e.createElement(
                        "p",
                        {
                          className:
                            "text-2xl font-bold text-gray-800 dark:text-white",
                        },
                        u.length,
                      ),
                      e.createElement(
                        "p",
                        { className: "text-sm text-gray-500" },
                        l("total_posts"),
                      ),
                    ),
                  ),
                ),
                e.createElement(
                  "div",
                  {
                    className:
                      "bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-lg border border-gray-100 dark:border-gray-700",
                  },
                  e.createElement(
                    "div",
                    { className: "flex items-center gap-3" },
                    e.createElement(
                      "div",
                      {
                        className:
                          "w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center",
                      },
                      e.createElement(G, {
                        className: "w-6 h-6 text-green-600",
                      }),
                    ),
                    e.createElement(
                      "div",
                      null,
                      e.createElement(
                        "p",
                        {
                          className:
                            "text-2xl font-bold text-gray-800 dark:text-white",
                        },
                        v.length,
                      ),
                      e.createElement(
                        "p",
                        { className: "text-sm text-gray-500" },
                        l("active"),
                      ),
                    ),
                  ),
                ),
                e.createElement(
                  "div",
                  {
                    className:
                      "bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-lg border border-gray-100 dark:border-gray-700",
                  },
                  e.createElement(
                    "div",
                    { className: "flex items-center gap-3" },
                    e.createElement(
                      "div",
                      {
                        className:
                          "w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center",
                      },
                      e.createElement(Re, {
                        className: "w-6 h-6 text-indigo-600",
                      }),
                    ),
                    e.createElement(
                      "div",
                      null,
                      e.createElement(
                        "p",
                        {
                          className:
                            "text-2xl font-bold text-gray-800 dark:text-white",
                        },
                        I.length,
                      ),
                      e.createElement(
                        "p",
                        { className: "text-sm text-gray-500" },
                        l("sold"),
                      ),
                    ),
                  ),
                ),
                e.createElement(
                  "div",
                  {
                    className:
                      "bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-lg border border-gray-100 dark:border-gray-700",
                  },
                  e.createElement(
                    "div",
                    { className: "flex items-center gap-3" },
                    e.createElement(
                      "div",
                      {
                        className:
                          "w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center",
                      },
                      e.createElement(qe, {
                        className: "w-6 h-6 text-purple-600",
                      }),
                    ),
                    e.createElement(
                      "div",
                      null,
                      e.createElement(
                        "p",
                        {
                          className:
                            "text-2xl font-bold text-gray-800 dark:text-white",
                        },
                        P.length,
                      ),
                      e.createElement(
                        "p",
                        { className: "text-sm text-gray-500" },
                        l("bought"),
                      ),
                    ),
                  ),
                ),
              ),
            ),
            hasCategoryMode &&
              categoryModeCategory?.name &&
              e.createElement(
                "div",
                {
                  className:
                    "mb-6 max-w-4xl mx-auto px-4 sm:px-6 page-shell page-pad",
                },
                e.createElement(
                  "div",
                  {
                    className:
                      "rounded-2xl border border-blue-100 bg-white/90 dark:border-blue-900/40 dark:bg-gray-900/70 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm",
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
                      "Your listings are filtered to this category.",
                    ),
                  ),
                  e.createElement(
                    g,
                    {
                      type: "button",
                      variant: "outline",
                      className: "border-blue-200 text-blue-700 w-fit",
                      onClick: () => b("/category-mode"),
                    },
                    "Switch category",
                  ),
                ),
              ),
            e.createElement(
              "div",
              { className: "pb-10 max-w-4xl mx-auto px-4 sm:px-6 page-shell page-pad" },
              listError
                ? e.createElement(
                    Ye,
                    {
                      variant: "destructive",
                      className: "mb-4 bg-white/90 dark:bg-gray-900/90",
                    },
                    e.createElement(xe, { className: "h-4 w-4" }),
                    e.createElement(
                      Je,
                      null,
                      tr("latest_refresh_failed", "Latest refresh failed"),
                    ),
                    e.createElement(Qe, null, listError),
                    e.createElement(
                      "div",
                      { className: "mt-3" },
                      e.createElement(
                        g,
                        { size: "sm", onClick: re },
                        e.createElement(he, { className: "w-4 h-4 mr-2" }),
                        tr("retry", "Retry"),
                      ),
                    ),
                  )
                : null,
              e.createElement(
                "div",
                {
                  className:
                    "w-full flex justify-start gap-2 py-2 mb-4 overflow-x-auto whitespace-nowrap scrollbar-hide",
                },
                [
                  {
                    label: l("all"),
                    tab: "all",
                    color: "bg-blue-600",
                    count: u.length,
                  },
                  {
                    label: l("active"),
                    tab: "active",
                    color: "bg-green-500",
                    count: v.length,
                  },
                  {
                    label: l("sold"),
                    tab: "sold",
                    color: "bg-blue-500",
                    count: I.length,
                  },
                  {
                    label: l("bought"),
                    tab: "bought",
                    color: "bg-purple-500",
                    count: P.length,
                  },
                ].map((t) =>
                  e.createElement(
                    "button",
                    {
                      key: t.tab,
                      className: `flex-1 min-w-0 px-2 py-2 rounded-xl font-bold text-sm shadow-lg border-2 border-blue-300 dark:border-gray-600 focus:outline-none transition-all duration-150 ${p === t.tab ? `${t.color} text-white scale-105 drop-shadow-xl border-2 border-blue-700` : "bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-gray-700"}`,
                      onClick: () => {
                        pe(t.tab), A(1);
                      },
                    },
                    t.label,
                    e.createElement(
                      "span",
                      {
                        className: `ml-1 ${t.color} text-white px-2 py-0.5 rounded text-xs`,
                      },
                      t.count,
                    ),
                  ),
                ),
              ),
              e.createElement(
                "div",
                { className: "relative mb-4" },
                e.createElement(rt, {
                  className:
                    "absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5",
                }),
                e.createElement("input", {
                  type: "text",
                  placeholder: l("search_posts_placeholder"),
                  value: z,
                  onChange: (t) => De(t.target.value),
                  className:
                    "w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none transition-colors",
                }),
              ),
              p === "active" &&
                v.length > 0 &&
                e.createElement(
                  "div",
                  {
                    className:
                      "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 mb-4 border border-blue-200 dark:border-blue-800",
                  },
                  e.createElement(
                    "div",
                    {
                      className:
                        "flex items-center justify-between flex-wrap gap-3",
                    },
                    e.createElement(
                      "div",
                      { className: "flex items-center gap-3" },
                      e.createElement(
                        "button",
                        {
                          onClick: Fe,
                          className:
                            "flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium hover:text-blue-700 transition-colors",
                          title: l("select_all_tooltip"),
                        },
                        _
                          ? e.createElement(at, { className: "w-5 h-5" })
                          : e.createElement(it, { className: "w-5 h-5" }),
                        l(_ ? "deselect_all" : "select_all"),
                      ),
                      e.createElement(
                        "span",
                        {
                          className: "text-sm text-gray-500 dark:text-gray-400",
                        },
                        c.size,
                        " ",
                        l("of"),
                        " ",
                        v.length,
                        " ",
                        l("selected"),
                      ),
                    ),
                    c.size > 0 &&
                      e.createElement(
                        g,
                        {
                          variant: "destructive",
                          size: "sm",
                          onClick: () => $(!0),
                          className:
                            "bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-lg",
                        },
                        e.createElement(Z, { className: "w-4 h-4 mr-1" }),
                        l("delete"),
                        " (",
                        c.size,
                        ")",
                      ),
                  ),
                  e.createElement(
                    "p",
                    {
                      className:
                        "text-xs text-gray-500 dark:text-gray-400 mt-2",
                    },
                    tr("tip", "Tip") + ": ",
                    l("bulk_selection_tip"),
                  ),
                ),

              e.createElement(
                "div",
                { className: "w-full flex flex-col gap-6" },
                f.length === 0
                  ? e.createElement(
                      "div",
                      { className: "text-center py-16" },
                      e.createElement(
                        "div",
                        { className: "text-6xl mb-4" },
                        "[]",
                      ),
                      e.createElement(
                        "h3",
                        {
                          className:
                            "text-xl font-bold text-gray-700 dark:text-gray-300 mb-2",
                        },
                        hasCategoryMode && categoryModeCategory?.name
                          ? `No ${categoryModeCategory.name} listings yet`
                          : l("no_posts"),
                      ),
                      e.createElement(
                        "p",
                        { className: "text-gray-500 dark:text-gray-400 mb-6" },
                        hasCategoryMode && categoryModeCategory?.name
                          ? `Listings are filtered to ${categoryModeCategory.name}. Switch category to see more.`
                          : l("start_selling"),
                      ),
                      e.createElement(
                        "div",
                        {
                          className:
                            "flex flex-col sm:flex-row gap-3 justify-center",
                        },
                        e.createElement(
                          g,
                          {
                            className:
                              "bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl",
                            onClick: () => b("/post-welcome"),
                          },
                          e.createElement(ce, { className: "w-5 h-5 mr-2" }),
                          l("create_new_listing"),
                        ),
                        hasCategoryMode &&
                          categoryModeCategory?.name &&
                          e.createElement(
                            g,
                            {
                              variant: "outline",
                              className: "border-blue-200 text-blue-700",
                              onClick: () => b("/category-mode"),
                            },
                            "Switch category",
                          ),
                      ),
                    )
                  : Me.map((t) => {
                      const s =
                          String(t?.ownership || "").toLowerCase() === "bought",
                        r = s ? "bought" : t.status || "active",
                        statusLabel =
                          r === "active"
                            ? tr("active", "Active")
                            : r === "sold"
                              ? tr("sold", "Sold")
                              : r === "bought"
                                ? tr("bought", "Bought")
                                : r;
                      return e.createElement(
                        de,
                        {
                          key: t.postId || t.post_id || t.id,
                          className:
                            `shadow-xl rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300 bg-white dark:bg-gray-800 ${r === "sold" ? "border-2 border-blue-300 dark:border-blue-700 opacity-90" : r === "bought" ? "border-2 border-purple-300 dark:border-purple-700" : "border-2 border-green-200 dark:border-green-800"}`,
                        },
                        e.createElement(
                          "div",
                          { className: "flex flex-col" },
                          e.createElement(
                            "div",
                            { className: "relative" },
                            e.createElement("img", {
                              src: Ie(t),
                              onError: (m) => {
                                (m.target.onerror = null),
                                  (m.target.src = "/placeholder.svg");
                              },
                              alt: t.title,
                              className: "w-full h-40 md:h-48 object-cover",
                            }),
                            e.createElement(
                              me,
                              {
                                className: `absolute top-3 left-3 ${r === "active" ? "bg-green-500" : r === "sold" ? "bg-blue-500" : r === "bought" ? "bg-purple-500" : "bg-gray-500"} text-white font-bold px-3 py-1 text-sm capitalize`,
                              },
                              statusLabel,
                            ),
                            e.createElement(
                              "div",
                              { className: "absolute top-3 right-3" },
                              e.createElement(
                                bt,
                                null,
                                e.createElement(
                                  ht,
                                  { asChild: !0 },
                                  e.createElement(
                                    g,
                                    {
                                      variant: "ghost",
                                      size: "sm",
                                      className:
                                        "bg-gray-800/80 hover:bg-gray-700 shadow-lg rounded-full h-9 w-9 p-0 z-50",
                                    },
                                    e.createElement(lt, {
                                      className: "h-4 w-4 text-white",
                                    }),
                                  ),
                                ),
                                e.createElement(
                                  xt,
                                  {
                                    align: "end",
                                    className:
                                      "w-48 bg-white dark:bg-gray-800 shadow-lg border rounded-xl",
                                  },
                                  e.createElement(
                                    V,
                                    { onClick: () => Le(t) },
                                    e.createElement(Ke, {
                                      className: "w-4 h-4 mr-2",
                                    }),
                                    l("edit_post"),
                                  ),
                                  !s &&
                                    e.createElement(
                                      V,
                                      {
                                        onClick: () =>
                                          ae(t.postId || t.post_id || t.id),
                                        className: "text-red-600",
                                      },
                                      e.createElement(Z, {
                                        className: "w-4 h-4 mr-2",
                                      }),
                                      l("delete"),
                                    ),
                                ),
                              ),
                            ),
                          ),
                          e.createElement(
                            ge,
                            { className: "p-5" },
                            e.createElement(
                              "div",
                              {
                                className:
                                  "flex items-center justify-between mb-2",
                              },
                              e.createElement(
                                "div",
                                { className: "flex items-center gap-2" },
                                e.createElement(
                                  me,
                                  {
                                    className:
                                      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-mono text-xs px-2 py-1",
                                  },
                                  tr("post_id_label", "Post ID: "),
                                  t.postId || t.post_id || t.id,
                                ),
                                e.createElement(
                                  "button",
                                  {
                                    onClick: (m) => {
                                      m.stopPropagation(),
                                        navigator.clipboard.writeText(
                                          String(t.postId || t.post_id || t.id),
                                        ),
                                        d({
                                          title: tr("copied", "Copied"),
                                          description: tr(
                                            "post_id_copied",
                                            "Post ID copied to clipboard",
                                          ),
                                        });
                                    },
                                    className:
                                      "text-gray-400 hover:text-blue-600 transition-colors p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20",
                                    title: l("copy_post_id_tooltip"),
                                  },
                                  e.createElement(dt, { className: "w-4 h-4" }),
                                ),
                              ),
                              r === "active" &&
                                e.createElement(Oe, {
                                  checked: c.has(t.postId || t.post_id || t.id),
                                  onCheckedChange: () =>
                                    Ee(t.postId || t.post_id || t.id),
                                  className: "scale-90",
                                }),
                            ),
                            e.createElement(
                              "h3",
                              {
                                className:
                                  "text-xl font-bold text-gray-900 dark:text-white mb-2 line-clamp-2",
                              },
                              t.title,
                            ),
                            e.createElement(
                              "div",
                              {
                                className:
                                  "text-2xl font-extrabold text-green-600 dark:text-green-400 mb-3",
                              },
                              "INR ",
                              typeof t.price == "number"
                                ? t.price.toLocaleString()
                                : t.price,
                            ),
                            t.location &&
                              e.createElement(
                                "div",
                                {
                                  className:
                                    "flex items-center text-gray-500 dark:text-gray-400 text-sm mb-4",
                                },
                                e.createElement(et, {
                                  className: "w-4 h-4 mr-1",
                                }),
                                t.location,
                              ),
                            !s &&
                              e.createElement(
                                "div",
                                {
                                  className:
                                    "flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-3",
                                },
                                e.createElement(
                                  "span",
                                  { className: "inline-flex items-center gap-1" },
                                  e.createElement(Xe, {
                                    className: "w-3.5 h-3.5",
                                  }),
                                  Number(t.views_count || t.views || 0),
                                ),
                                e.createElement(
                                  "span",
                                  { className: "inline-flex items-center gap-1" },
                                  e.createElement(qe, {
                                    className: "w-3.5 h-3.5",
                                  }),
                                  Number(t.likes || t.likes_count || 0),
                                ),
                                e.createElement(
                                  "span",
                                  { className: "inline-flex items-center gap-1" },
                                  e.createElement(st, {
                                    className: "w-3.5 h-3.5",
                                  }),
                                  Number(t.shares || 0),
                                ),
                              ),
                            e.createElement(
                              "div",
                              {
                                className:
                                  "flex flex-nowrap items-center gap-1 overflow-x-auto whitespace-nowrap pb-1 scrollbar-hide sm:gap-2",
                              },
                              e.createElement(
                                g,
                                {
                                  className:
                                    "shrink-0 min-w-[36px] h-8 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg px-2.5 text-[10px] sm:h-9 sm:min-w-[120px] sm:px-3 sm:text-xs shadow inline-flex items-center justify-center gap-1.5",
                                  onClick: () => je(t),
                                },
                                e.createElement(Xe, { className: "w-5 h-5" }),
                                e.createElement(
                                  "span",
                                  { className: "hidden sm:inline" },
                                  tr("view_details", "View Details"),
                                ),
                              ),
                              !s &&
                                e.createElement(
                                  g,
                                  {
                                    variant: "outline",
                                    className:
                                      "shrink-0 h-8 border-2 border-red-400 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 font-bold rounded-lg px-2.5 sm:h-9 sm:px-3",
                                    onClick: () =>
                                      ae(t.postId || t.post_id || t.id),
                                  },
                                  e.createElement(Z, { className: "w-5 h-5" }),
                                ),
                            ),
                          ),
                        ),
                      );
                    }),
              ),
              f.length > 0 &&
                e.createElement(
                  "div",
                  {
                    className:
                      "flex justify-center items-center gap-4 mt-4 mb-8",
                  },
                  e.createElement(
                    g,
                    {
                      disabled: x === 1,
                      onClick: () => A(x - 1),
                      className:
                        "text-base px-5 py-2 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50",
                    },
                    l("previous"),
                  ),
                  e.createElement(
                    "span",
                    {
                      className:
                        "px-4 py-2 text-blue-700 dark:text-blue-300 font-bold text-base",
                    },
                    l("page"),
                    " ",
                    x,
                    " ",
                    l("of"),
                    " ",
                    M,
                  ),
                  e.createElement(
                    g,
                    {
                      disabled: x === M,
                      onClick: () => A(x + 1),
                      className:
                        "text-base px-5 py-2 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50",
                    },
                    l("next"),
                  ),
                ),
            ),
            e.createElement(
              "div",
              { className: "fixed right-4 z-40 bottom-[calc(var(--bottom-nav-height)+var(--bottom-nav-safe)+1rem)]" },
              e.createElement(
                g,
                {
                  className:
                    "bg-blue-600 text-white rounded-full shadow-xl w-14 h-14 flex items-center justify-center text-3xl hover:bg-blue-700 hover:scale-110 transition-all",
                  onClick: () => b("/post-welcome"),
                },
                e.createElement(ce, { className: "w-7 h-7" }),
              ),
            ),
            e.createElement(
              W,
              { open: ve, onOpenChange: B },
              e.createElement(
                Q,
                { className: "bg-white dark:bg-gray-800 rounded-2xl" },
                e.createElement(
                  q,
                  null,
                  e.createElement(
                    K,
                    {
                      className:
                        "text-xl font-bold text-gray-900 dark:text-white",
                    },
                    l("delete_post_title"),
                  ),
                  e.createElement(
                    J,
                    { className: "text-gray-600 dark:text-gray-300" },
                    l("delete_post_desc"),
                  ),
                ),
                e.createElement(
                  X,
                  null,
                  e.createElement(Y, { className: "rounded-xl" }, l("cancel")),
                  e.createElement(
                    O,
                    {
                      onClick: Ue,
                      className:
                        "bg-red-600 hover:bg-red-700 text-white rounded-xl",
                    },
                    l("delete"),
                  ),
                ),
              ),
            ),
            e.createElement(
              W,
              { open: fe, onOpenChange: ee },
              e.createElement(
                Q,
                { className: "bg-white dark:bg-gray-800 rounded-2xl" },
                e.createElement(
                  q,
                  null,
                  e.createElement(
                    K,
                    {
                      className:
                        "text-xl font-bold text-gray-900 dark:text-white",
                    },
                    l("move_sale_undone_title"),
                  ),
                  e.createElement(
                    J,
                    { className: "text-gray-600 dark:text-gray-300" },
                    l("move_sale_undone_desc"),
                  ),
                ),
                e.createElement(
                  X,
                  null,
                  e.createElement(Y, { className: "rounded-xl" }, l("cancel")),
                  e.createElement(
                    O,
                    {
                      onClick: $e,
                      className:
                        "bg-orange-600 hover:bg-orange-700 text-white rounded-xl",
                    },
                    l("confirm"),
                  ),
                ),
              ),
            ),
            e.createElement(
              W,
              { open: Ce, onOpenChange: $ },
              e.createElement(
                Q,
                { className: "bg-white dark:bg-gray-800 rounded-2xl" },
                e.createElement(
                  q,
                  null,
                  e.createElement(
                    K,
                    {
                      className:
                        "text-xl font-bold text-gray-900 dark:text-white",
                    },
                    l("bulk_delete_title", { count: c.size }),
                  ),
                  e.createElement(
                    J,
                    { className: "text-gray-600 dark:text-gray-300" },
                    l("bulk_delete_desc"),
                  ),
                ),
                e.createElement(
                  X,
                  null,
                  e.createElement(Y, { className: "rounded-xl" }, l("cancel")),
                  e.createElement(
                    O,
                    {
                      onClick: He,
                      className:
                        "bg-red-600 hover:bg-red-700 text-white rounded-xl",
                    },
                    l("delete_all"),
                  ),
                ),
              ),
            ),
            e.createElement(ShareLinkDialog, {
              open: shareDialogOpen,
              onOpenChange: setShareDialogOpen,
              url: shareDialogUrl,
              title: tr("share_post", "Share post"),
            }),
          )
      : e.createElement(
          "div",
          {
            className:
              "min-h-screen bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700",
          },
          e.createElement(
            "div",
            { className: "pt-16 pb-12 px-6 text-center" },
            e.createElement(
              "div",
              {
                className:
                  "w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-2xl",
              },
              e.createElement(ue, { className: "w-12 h-12 text-white" }),
            ),
            e.createElement(
              "h1",
              { className: "text-4xl font-bold text-white mb-3" },
              l("my_home_title"),
            ),
            e.createElement(
              "p",
              { className: "text-white/80 text-lg max-w-md mx-auto" },
              l("manage_listings"),
            ),
          ),
          e.createElement(
            "div",
            { className: "max-w-2xl mx-auto px-6 space-y-4 page-shell page-pad" },
            e.createElement(
              ne,
              {
                to: "/login",
                state: { returnTo: "/my-home" },
                className:
                  "block bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300",
              },
              e.createElement(
                "div",
                { className: "flex items-center gap-4" },
                e.createElement(
                  "div",
                  {
                    className:
                      "w-14 h-14 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg",
                  },
                  e.createElement(G, { className: "w-7 h-7 text-white" }),
                ),
                e.createElement(
                  "div",
                  { className: "flex-1" },
                  e.createElement(
                    "h3",
                    { className: "text-xl font-bold text-gray-900 dark:text-white" },
                    l("login"),
                  ),
                  e.createElement(
                    "p",
                    { className: "text-gray-500 dark:text-gray-400 text-sm" },
                    l("already_account"),
                  ),
                ),
                e.createElement(be, { className: "w-6 h-6 text-gray-400 dark:text-gray-500" }),
              ),
            ),
            e.createElement(
              ne,
              {
                to: "/signup",
                className:
                  "block bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-xl hover:shadow-2xl hover:bg-white/20 hover:scale-[1.02] transition-all duration-300",
              },
              e.createElement(
                "div",
                { className: "flex items-center gap-4" },
                e.createElement(
                  "div",
                  {
                    className:
                      "w-14 h-14 rounded-xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center shadow-lg",
                  },
                  e.createElement(nt, { className: "w-7 h-7 text-white" }),
                ),
                e.createElement(
                  "div",
                  { className: "flex-1" },
                  e.createElement(
                    "h3",
                    { className: "text-xl font-bold text-white" },
                    l("signup"),
                  ),
                  e.createElement(
                    "p",
                    { className: "text-white/70 text-sm" },
                    l("new_user"),
                  ),
                ),
                e.createElement(be, { className: "w-6 h-6 text-white/60" }),
              ),
            ),
          ),
        );
};
var zt = MyHomePage;
export { zt as default };


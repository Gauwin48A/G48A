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
  MessageSquare,
} from "lucide-react";
import { useToast as gt } from "@/hooks/use-toast";
import { useAuth as mt } from "@/context/AuthContext";
import { useCategoryMode } from "@/context/CategoryModeContext";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { hasAuthSession as ct, getUserId as ut } from "@/utils/authStorage";
import {
  buildSavedPostsMap,
  fetchWishlistIds,
  getSavedPostsMap,
  subscribeSavedPosts,
} from "@/utils/savedPosts";
import { isPostOwnedByUser } from "@/utils/postOwnership";
import { resolveMediaUrl as meURL } from "@/lib/mediaUrl";
import ShareLinkDialog from "@/components/ShareLinkDialog";
import PromoteDialog from "@/components/PromoteDialog";
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
const MY_HOME_LOAD_TIMEOUT_MS = 12000;
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
    [sortBy, setSortBy] = n("postedDate"),
    [sortOrder, setSortOrder] = n("desc"),
    [Ce, $] = n(!1),
    [_, oe] = n(!1),
    [shareDialogOpen, setShareDialogOpen] = n(!1),
    [shareDialogUrl] = n(""),
    [promotePostId, setPromotePostId] = n(null),
    [promotePostTitle, setPromotePostTitle] = n(""),
    [markSoldPost, setMarkSoldPost] = n(null),
    [markSoldLoading, setMarkSoldLoading] = n(!1),
    [postTotals, setPostTotals] = n(null),
    [, setSavedPosts] = n(() => getSavedPostsMap()),
    [activePostForActions, setActivePostForActions] = n(null),
    [actionSheetOpen, setActionSheetOpen] = n(!1),
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
    Pe = Boolean(_authIsAuthenticated || _e || F || H),
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
    openPromote = Ze((postId, title) => {
      if (!postId) return;
      setPromotePostId(String(postId));
      setPromotePostTitle(String(title || ""));
    }, []),
    closePromote = Ze(() => {
      setPromotePostId(null);
      setPromotePostTitle("");
    }, []),
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
    let didTimeout = !1;
    return (
      (async () => {
        L(!0);
        const r = F;
        const timeoutId = setTimeout(() => {
          if (t) return;
          didTimeout = !0;
          C({
            key: "my_home_timeout",
            fallback: "Loading your listings is taking longer than expected. Please retry.",
          });
          L(!1);
        }, MY_HOME_LOAD_TIMEOUT_MS);
        if (!Pe) {
          if (!t && !didTimeout) {
            C({
              key: "my_home_login_required",
              fallback: "You must be logged in to view your posts.",
            });
            L(!1);
          }
          clearTimeout(timeoutId);
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
            if (!t && !didTimeout) {
              k(safeInstant);
            }
            We(a, E)
              .then((o) => {
                if (t || didTimeout) return;
                Array.isArray(o) && o.length > 0 ? k(o) : k(safeInstant);
              })
              .catch(() => {
                if (!t && !didTimeout) {
                  k(safeInstant);
                }
              });
          }
          if (!t && !didTimeout) {
            k(i);
            C("");
          }
        } catch (o) {
          console.error("Fetch posts error:", o);
          if (!t && !didTimeout) {
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
          clearTimeout(timeoutId);
          if (!t && !didTimeout) {
            L(!1);
          }
        }
      })(),
      () => {
        t = !0;
      }
    );
  }, [H, F, ye, categoryModeCategoryId, Pe]);
  ie(() => {
    if (!Pe || !F) return;
    let cancelled = !1;
    (async () => {
      try {
        const params = {
          userId: F,
          ...(categoryModeCategoryId ? { category: categoryModeCategoryId } : {}),
          ...(!categoryModeCategoryId && activeAppMatcher?.activeApp
            ? { category_group: activeAppMatcher.activeApp }
            : {}),
        };
        const response = await R.get("/posts/mine/totals", { params });
        const payload = response?.data ?? response;
        if (cancelled) return;
        setPostTotals(payload?.totals || payload || null);
      } catch {
        if (!cancelled) setPostTotals(null);
      }
    })();
    return () => {
      cancelled = !0;
    };
  }, [Pe, F, ye, categoryModeCategoryId, activeAppMatcher?.activeApp]);
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
        const r = await fetchWishlistIds(() =>
          F ? R.get("/wishlist", { params: { userId: F } }) : R.get("/wishlist"),
        );
        if (t) return;
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
      ke((t) => t + 1), A(1);
    }, []),
    { pullIndicator } = usePullToRefresh({
      onRefresh: () => {
        re();
      },
      disabled: !Pe,
    }),
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
    totals = h(() => {
      const fallback = {
        total: u.length,
        active: v.length,
        sold: I.length,
        bought: P.length,
      };
      if (!postTotals || typeof postTotals !== "object") return fallback;
      const toNumber = (value, fallbackValue) => {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallbackValue;
      };
      return {
        total: toNumber(postTotals.total, fallback.total),
        active: toNumber(postTotals.active, fallback.active),
        sold: toNumber(postTotals.sold, fallback.sold),
        bought: toNumber(postTotals.bought, fallback.bought),
      };
    }, [postTotals, u.length, v.length, I.length, P.length]),
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
          if (sortBy === "postedDate")
            return new Date(o.postedDate || o.created_at || 0).getTime();
          if (sortBy === "price")
            return Number(o.price || o.price_amount || 0);
          if (sortBy === "views")
            return Number(o.views_count || o.views || 0);
          if (sortBy === "likes")
            return Number(o.likes_count || o.likes || 0);
          if (sortBy === "title")
            return String(o.title || "").toLowerCase();
          const a = o?.[sortBy] ?? o?.created_at ?? 0;
          return typeof a == "string" ? a.toLowerCase() : a;
        };
      return [...r].sort((o, a) => {
        const i = m(o),
          y = m(a);
        if (i === y) return 0;
        if (sortOrder === "asc") {
          return i > y ? 1 : -1;
        }
        return i < y ? 1 : -1;
      });
    }, [p, v, u, P, z, I, sortBy, sortOrder]),
    M = h(() => Math.max(1, Math.ceil(f.length / N)), [f.length, N]);
  ie(() => {
    A((t) => Math.min(Math.max(t, 1), M));
  }, [M]);
  const Me = h(() => f.slice((x - 1) * N, x * N), [f, x, N]),
    Te = (t) => {
      const minutes = (new Date() - new Date(t)) / (1e3 * 60);
      return minutes <= 5;
    },
    je = (t) =>
      b(`/post/${t.postId || t.post_id || t.id}`, {
        state: {
          fromMyPosts: true,
          source: "my-home",
          returnTo: "/my-home",
        },
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
    openMarkSold = (t) => {
      const s = t?.postId || t?.post_id || t?.id;
      if (!s) return;
      setMarkSoldPost({
        id: String(s),
        title: t?.title || t?.post_title || "",
        price: t?.price,
      });
    },
    confirmMarkSold = async () => {
      if (!markSoldPost?.id) return;
      setMarkSoldLoading(!0);
      try {
        const s = markSoldPost.id;
        const r = await R.post(`/posts/${s}/sold`);
        const o = r?.data ?? r;
        const status = String(o?.status || "").toLowerCase();
        if (status && status !== "sold" && o?.success !== !0) {
          throw new Error("Post status did not update");
        }
        k((a) =>
          Array.isArray(a)
            ? a.map((i) => {
                const y = i.postId || i.post_id || i.id;
                if (String(y) !== String(s)) return i;
                return {
                  ...i,
                  status: "sold",
                  sold_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                };
              })
            : a,
        );
        d({
          title: tr("marked_sold_title", "Marked as Sold"),
          description: tr(
            "marked_sold_desc",
            "Your listing has been moved to Sold.",
          ),
        });
        setMarkSoldPost(null);
      } catch (s) {
        console.error("Mark sold error:", s),
          d({
            title: tr("action_failed", "Action Failed"),
            description:
              s.message ||
              tr(
                "mark_sold_failed",
                "We couldn't mark this post as sold. Please retry.",
              ),
            variant: "destructive",
          });
      } finally {
        setMarkSoldLoading(!1);
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
            "mhub-page-myposts flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 dark:bg-gradient-to-br",
        },
        e.createElement(
          "div",
          { className: "text-center" },
          e.createElement("div", {
            className:
              "animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4 dark:border-blue-500/40",
          }),
          e.createElement(
            "p",
            { className: "text-gray-600 dark:text-gray-300 font-medium dark:text-gray-200" },
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
                "mhub-page-myposts min-h-screen mhub-premium-page bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 px-4 pt-4 dark:bg-gradient-to-br",
            },
            e.createElement(
              de,
              { className: "max-w-xl mx-auto border-red-200 page-shell page-pad dark:border-red-600/40" },
              e.createElement(
                ge,
                { className: "p-8 text-center" },
                e.createElement(
                  "div",
                  {
                    className:
                      "w-12 h-12 mx-auto rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-3 dark:bg-red-950/20 dark:text-red-300",
                  },
                  e.createElement(xe, { className: "w-6 h-6" }),
                ),
                e.createElement(
                  "h2",
                  {
                    className:
                      "text-xl font-semibold text-gray-900 dark:text-white mb-2 dark:text-gray-100",
                  },
                  tr("my_home_listings_unavailable", "Listings unavailable"),
                ),
                e.createElement(
                  "p",
                  {
                    className: "text-sm text-gray-600 dark:text-gray-300 mb-5 dark:text-gray-200",
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
                "mhub-page-myposts min-h-screen mhub-premium-page transition-colors duration-300 pt-0",
            },
            pullIndicator,
            e.createElement(
              "div",
              { className: "relative overflow-hidden" },
              e.createElement("div", {
                className: "absolute inset-0 profile-hero-bg",
              }),
              e.createElement("div", {
                className: "absolute inset-0 opacity-10",
                style: {
                  backgroundImage:
                    "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
                },
              }),
              e.createElement(
                "div",
                {
                  className:
                    "relative max-w-[640px] mx-auto px-4 py-2 sm:px-6 sm:py-3 page-shell page-pad",
                },
                e.createElement(
                  "div",
                  {
                    className:
                      "flex items-start gap-3 mb-2 max-w-2xl text-left",
                  },
                  e.createElement(
                    "button",
                    {
                      onClick: () => b("/all-posts"),
                      className:
                        "mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-all dark:bg-slate-900/20 dark:hover:bg-slate-900/30",
                    },
                    e.createElement(ot, { className: "w-5 h-5 text-white dark:text-white" }),
                  ),
                  e.createElement(
                    "div",
                    { className: "min-w-0" },
                    e.createElement(
                      "p",
                      {
                        className:
                          "text-xs font-semibold uppercase tracking-[0.16em] text-white/70 mb-1 dark:text-white/70",
                      },
                      tr("my_home_label", "My home"),
                    ),
                    e.createElement(
                      "div",
                      { className: "flex items-center gap-3" },
                      e.createElement(
                        "div",
                        {
                          className:
                            "w-9 h-9 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center dark:bg-slate-900/15",
                        },
                        e.createElement(Re, { className: "w-5 h-5 text-white dark:text-white" }),
                      ),
                      e.createElement(
                        "h1",
                        {
                          className:
                            "text-lg sm:text-xl md:text-2xl font-bold text-white dark:text-white",
                        },
                        l("my_home_title"),
                      ),
                    ),
                    e.createElement(
                      "p",
                      { className: "text-sm sm:text-base text-white/80 mt-1 dark:text-white/80" },
                      l("my_home_subtitle"),
                    ),
                  ),
                ),
              ),
            ),
            e.createElement(
              "div",
              {
                className:
                  "-mt-6 sm:-mt-8 mb-6 relative z-10 max-w-[640px] mx-auto px-4 sm:px-6 page-shell page-pad",
              },
              e.createElement(
                "div",
                { className: "grid grid-cols-2 md:grid-cols-4 gap-4" },
                e.createElement(
                  "div",
                  {
                    className:
                      "rewards-stat-card rounded-2xl bg-white/95 dark:bg-slate-900/80 text-slate-900 dark:text-slate-100 p-4 shadow-lg border border-slate-100/80 dark:border-slate-800/60 dark:bg-slate-900/95 dark:border-slate-700/80",
                    style: {
                      "--card-accent":
                        "linear-gradient(90deg, #38bdf8, #6366f1)",
                    },
                  },
                  e.createElement(
                    "div",
                    { className: "flex items-center gap-3" },
                    e.createElement(
                      "div",
                      {
                        className:
                          "w-11 h-11 rounded-xl bg-sky-100 dark:bg-sky-900/40 flex items-center justify-center dark:bg-sky-950/20",
                      },
                      e.createElement(ue, {
                        className: "w-5 h-5 text-sky-600 dark:text-sky-300",
                      }),
                    ),
                    e.createElement(
                      "div",
                      null,
                      e.createElement(
                        "p",
                        {
                          className:
                            "text-lg sm:text-2xl font-black text-slate-900 dark:text-slate-100",
                        },
                        totals.total,
                      ),
                      e.createElement(
                        "p",
                        {
                          className:
                            "text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300",
                        },
                        l("total_posts"),
                      ),
                    ),
                  ),
                ),
                e.createElement(
                  "div",
                  {
                    className:
                      "rewards-stat-card rounded-2xl bg-white/95 dark:bg-slate-900/80 text-slate-900 dark:text-slate-100 p-4 shadow-lg border border-slate-100/80 dark:border-slate-800/60 dark:bg-slate-900/95 dark:border-slate-700/80",
                    style: {
                      "--card-accent":
                        "linear-gradient(90deg, #34d399, #10b981)",
                    },
                  },
                  e.createElement(
                    "div",
                    { className: "flex items-center gap-3" },
                    e.createElement(
                      "div",
                      {
                        className:
                          "w-11 h-11 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center dark:bg-emerald-950/20",
                      },
                      e.createElement(G, {
                        className:
                          "w-5 h-5 text-emerald-600 dark:text-emerald-300",
                      }),
                    ),
                    e.createElement(
                      "div",
                      null,
                      e.createElement(
                        "p",
                        {
                          className:
                            "text-lg sm:text-2xl font-black text-slate-900 dark:text-slate-100",
                        },
                        totals.active,
                      ),
                      e.createElement(
                        "p",
                        {
                          className:
                            "text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300",
                        },
                        l("active"),
                      ),
                    ),
                  ),
                ),
                e.createElement(
                  "div",
                  {
                    className:
                      "rewards-stat-card rounded-2xl bg-white/95 dark:bg-slate-900/80 text-slate-900 dark:text-slate-100 p-4 shadow-lg border border-slate-100/80 dark:border-slate-800/60 dark:bg-slate-900/95 dark:border-slate-700/80",
                    style: {
                      "--card-accent":
                        "linear-gradient(90deg, #6366f1, #8b5cf6)",
                    },
                  },
                  e.createElement(
                    "div",
                    { className: "flex items-center gap-3" },
                    e.createElement(
                      "div",
                      {
                        className:
                          "w-11 h-11 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center dark:bg-indigo-950/20",
                      },
                      e.createElement(Re, {
                        className:
                          "w-5 h-5 text-indigo-600 dark:text-indigo-300",
                      }),
                    ),
                    e.createElement(
                      "div",
                      null,
                      e.createElement(
                        "p",
                        {
                          className:
                            "text-lg sm:text-2xl font-black text-slate-900 dark:text-slate-100",
                        },
                        totals.sold,
                      ),
                      e.createElement(
                        "p",
                        {
                          className:
                            "text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300",
                        },
                        l("sold"),
                      ),
                    ),
                  ),
                ),
                e.createElement(
                  "div",
                  {
                    className:
                      "rewards-stat-card rounded-2xl bg-white/95 dark:bg-slate-900/80 text-slate-900 dark:text-slate-100 p-4 shadow-lg border border-slate-100/80 dark:border-slate-800/60 dark:bg-slate-900/95 dark:border-slate-700/80",
                    style: {
                      "--card-accent":
                        "linear-gradient(90deg, #f472b6, #ec4899)",
                    },
                  },
                  e.createElement(
                    "div",
                    { className: "flex items-center gap-3" },
                    e.createElement(
                      "div",
                      {
                        className:
                          "w-11 h-11 rounded-xl bg-pink-100 dark:bg-pink-900/40 flex items-center justify-center dark:bg-pink-950/20",
                      },
                      e.createElement(qe, {
                        className:
                          "w-5 h-5 text-pink-600 dark:text-pink-300",
                      }),
                    ),
                    e.createElement(
                      "div",
                      null,
                      e.createElement(
                        "p",
                        {
                          className:
                            "text-lg sm:text-2xl font-black text-slate-900 dark:text-slate-100",
                        },
                        totals.bought,
                      ),
                      e.createElement(
                        "p",
                        {
                          className:
                            "text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300",
                        },
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
                    "mb-6 max-w-[640px] mx-auto px-4 sm:px-6 page-shell page-pad",
                },
                e.createElement(
                  "div",
                  {
                    className:
                      "rounded-2xl border border-blue-100 bg-white/90 dark:border-blue-900/40 dark:bg-gray-900/70 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm dark:border-blue-600/40 dark:bg-slate-900/90",
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
                      { className: "text-xs text-slate-500 dark:text-slate-300" },
                      "Your listings are filtered to this category.",
                    ),
                  ),
                  e.createElement(
                    g,
                    {
                      type: "button",
                      variant: "outline",
                      className: "border-blue-200 text-blue-700 w-fit dark:border-blue-600/40 dark:text-blue-300",
                      onClick: () => b("/category-mode"),
                    },
                    "Switch category",
                  ),
                ),
              ),
            e.createElement(
              "div",
              { className: "pb-10 max-w-[640px] mx-auto px-4 sm:px-6 page-shell page-pad" },
              listError
                ? e.createElement(
                    Ye,
                    {
                      variant: "destructive",
                      className: "mb-4 bg-white/90 dark:bg-slate-900/90",
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
                    "profile-panel rounded-2xl p-4 sm:p-5 mb-4",
                },
                e.createElement(
                  "div",
                  {
                    className:
                      "flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4",
                  },
                  e.createElement(
                    "div",
                    null,
                    e.createElement(
                      "p",
                      {
                        className:
                          "text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400 mb-1 dark:text-slate-300",
                      },
                      tr("listings_overview", "Listings overview"),
                    ),
                    e.createElement(
                      "h3",
                      {
                        className:
                          "text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100",
                      },
                      tr("manage_listings", "Manage your listings"),
                    ),
                  ),
                  e.createElement(
                    g,
                    {
                      type: "button",
                      className:
                        "bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-xl w-fit sm:self-start dark:bg-blue-700/40 dark:hover:bg-blue-700/40 dark:text-white",
                      onClick: () => b("/post-welcome"),
                    },
                    e.createElement(ce, { className: "w-4 h-4 mr-2" }),
                    l("create_new_listing"),
                  ),
                ),
                e.createElement(
                  "div",
                  {
                    className:
                      "w-full flex justify-start gap-2 py-2 mb-3 overflow-x-auto whitespace-nowrap scrollbar-hide rewards-tab-bar bg-white/70 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/60 rounded-2xl px-2 dark:bg-slate-900/70 dark:border-slate-700/70",
                  },
                  [
                    {
                      label: l("all"),
                      tab: "all",
                      color: "bg-blue-600",
                      count: totals.total,
                    },
                    {
                      label: l("active"),
                      tab: "active",
                      color: "bg-green-500",
                      count: totals.active,
                    },
                    {
                      label: l("sold"),
                      tab: "sold",
                      color: "bg-blue-500",
                      count: totals.sold,
                    },
                    {
                      label: l("bought"),
                      tab: "bought",
                      color: "bg-purple-500",
                      count: totals.bought,
                    },
                  ].map((t) =>
                    e.createElement(
                      "button",
                      {
                        key: t.tab,
                        className: `rewards-tab-btn flex-1 min-w-0 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all dark:sm:text-sm${p === t.tab ? `active ${t.color} text-white shadow-md` : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"}`,
                        onClick: () => {
                          pe(t.tab), A(1);
                        },
                      },
                      t.label,
                      e.createElement(
                        "span",
                        {
                          className: `ml-2 px-2 py-1 rounded-full text-xs font-semibold dark:text-xs${p === t.tab ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200"}`,
                        },
                        t.count,
                      ),
                    ),
                  ),
                ),
                e.createElement(
                  "div",
                  { className: "relative" },
                  e.createElement(rt, {
                    className:
                      "absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5 dark:text-slate-300",
                  }),
                  e.createElement("input", {
                    type: "text",
                    placeholder: l("search_posts_placeholder"),
                    value: z,
                    onChange: (t) => De(t.target.value),
                    className:
                      "w-full pl-10 pr-4 py-3 rounded-xl profile-input focus:border-blue-500 focus:outline-none transition-colors dark:focus:border-blue-500/40",
                  }),
                ),
                e.createElement(
                  "div",
                  { className: "grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3" },
                  e.createElement(
                    "div",
                    { className: "flex flex-col gap-1" },
                    e.createElement(
                      "span",
                      {
                        className:
                          "text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide",
                      },
                      tr("sort_by", "Sort by"),
                    ),
                    e.createElement(
                      "select",
                      {
                        value: sortBy,
                        onChange: (t) => {
                          setSortBy(t.target.value), A(1);
                        },
                        className:
                          "w-full px-3 py-2 rounded-xl profile-input focus:border-blue-500 focus:outline-none transition-colors dark:focus:border-blue-500/40",
                      },
                      e.createElement(
                        "option",
                        { value: "postedDate" },
                        tr("sort_recent", "Recently posted"),
                      ),
                      e.createElement(
                        "option",
                        { value: "price" },
                        tr("sort_price", "Price"),
                      ),
                      e.createElement(
                        "option",
                        { value: "views" },
                        tr("sort_views", "Most viewed"),
                      ),
                      e.createElement(
                        "option",
                        { value: "likes" },
                        tr("sort_likes", "Most liked"),
                      ),
                      e.createElement(
                        "option",
                        { value: "title" },
                        tr("sort_title", "Title"),
                      ),
                    ),
                  ),
                  e.createElement(
                    "div",
                    { className: "flex flex-col gap-1" },
                    e.createElement(
                      "span",
                      {
                        className:
                          "text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide",
                      },
                      tr("sort_order", "Order"),
                    ),
                    e.createElement(
                      "select",
                      {
                        value: sortOrder,
                        onChange: (t) => {
                          setSortOrder(t.target.value), A(1);
                        },
                        className:
                          "w-full px-3 py-2 rounded-xl profile-input focus:border-blue-500 focus:outline-none transition-colors dark:focus:border-blue-500/40",
                      },
                      e.createElement(
                        "option",
                        { value: "desc" },
                        tr("sort_desc", "Descending"),
                      ),
                      e.createElement(
                        "option",
                        { value: "asc" },
                        tr("sort_asc", "Ascending"),
                      ),
                    ),
                  ),
                ),
                p === "active" &&
                  v.length > 0 &&
                  e.createElement(
                    "div",
                    {
                      className:
                        "profile-subpanel rounded-xl p-4 mt-4 border border-blue-100/80 dark:border-blue-600/80",
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
                              "flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium hover:text-blue-700 transition-colors dark:text-blue-300 dark:hover:text-blue-300",
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
                            className:
                              "text-sm text-slate-500 dark:text-slate-300",
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
                              "bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-lg dark:bg-red-800/30 dark:hover:bg-red-700/40 dark:text-white",
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
                          "text-xs text-slate-500 dark:text-slate-400 mt-2 dark:text-slate-300",
                      },
                      tr("tip", "Tip") + ": ",
                      l("bulk_selection_tip"),
                    ),
                  ),
              ),

              e.createElement(
                "div",
                { className: "w-full flex flex-col gap-4" },
                f.length === 0
                  ? e.createElement(
                      "div",
                      { className: "text-center py-10 sm:py-12" },
                      e.createElement(
                        "div",
                        { className: "text-6xl mb-4" },
                        p === "active" ? "\uD83D\uDCE6" : "[]",
                      ),
                      e.createElement(
                        "h3",
                        {
                          className:
                            "text-xl font-bold text-gray-700 dark:text-gray-300 mb-2 dark:text-gray-200",
                        },
                        p === "active"
                          ? tr("no_active_listings_yet", "No Active Listings Yet")
                          : hasCategoryMode && categoryModeCategory?.name
                            ? `No ${categoryModeCategory.name} listings yet`
                            : l("no_posts"),
                      ),
                      e.createElement(
                        "p",
                        { className: "text-gray-500 dark:text-gray-400 mb-4 dark:text-gray-300" },
                        p === "active"
                          ? tr("list_first_item_desc", "Get started by posting your first item for sale today!")
                          : hasCategoryMode && categoryModeCategory?.name
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
                              "bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl dark:bg-blue-700/40 dark:hover:bg-blue-700/40 dark:text-white",
                            onClick: () => b("/post-welcome"),
                          },
                          e.createElement(ce, { className: "w-5 h-5 mr-2" }),
                          p === "active"
                            ? tr("list_your_first_item", "List Your First Item")
                            : l("create_new_listing"),
                        ),
                        hasCategoryMode &&
                          categoryModeCategory?.name &&
                          e.createElement(
                            g,
                            {
                              variant: "outline",
                              className: "border-blue-200 text-blue-700 dark:border-blue-600/40 dark:text-blue-300",
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
                                : r,
                        conditionLabel =
                          t.condition ||
                          t.condition_name ||
                          t.item_condition ||
                          t.itemCondition ||
                          "",
                        isOwnerPost = isPostOwnedByUser(t, F);
                      return e.createElement(
                        de,
                        {
                          key: t.postId || t.post_id || t.id,
                          className:
                            `shadow-xl rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300 mhub-premium-surface ${r === "sold" ? "border-2 border-blue-300 dark:border-blue-700 opacity-90" : r === "bought" ? "border-2 border-purple-300 dark:border-purple-700" : "border-2 border-green-200 dark:border-green-800"}`,
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
                                className: `absolute top-3 left-3 ${r === "active" ? "bg-green-500" : r === "sold" ? "bg-blue-500" : r === "bought" ? "bg-purple-500" : "bg-gray-500"} text-white font-bold px-3 py-1 text-sm capitalize dark:text-white`,
                              },
                              statusLabel,
                            ),
                            e.createElement(
                              "div",
                              { className: "absolute top-3 right-3" },
                              e.createElement(
                                g,
                                {
                                  variant: "ghost",
                                  size: "sm",
                                  className:
                                    "bg-gray-800/80 hover:bg-gray-700 shadow-lg rounded-full h-9 w-9 p-0 z-50 dark:bg-gray-700/80 dark:hover:bg-gray-700",
                                  onClick: (evt) => {
                                    evt.stopPropagation();
                                    setActivePostForActions(t);
                                    setActionSheetOpen(true);
                                  },
                                },
                                e.createElement(lt, {
                                  className: "h-4 w-4 text-white dark:text-white",
                                }),
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
                                      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-mono text-xs px-2 py-1 dark:bg-blue-950/20",
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
                                      "text-gray-400 hover:text-blue-600 transition-colors p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 dark:text-gray-300 dark:hover:text-blue-300 dark:hover:bg-blue-950/20",
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
                                  "text-xl font-bold text-gray-900 dark:text-white mb-2 line-clamp-2 dark:text-gray-100",
                              },
                              t.title,
                            ),
                            conditionLabel &&
                              e.createElement(
                                me,
                                {
                                  className:
                                    "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-200 font-semibold text-xs px-2 py-1 mb-2 inline-flex dark:bg-slate-950/20",
                                },
                                tr("condition", "Condition"),
                                ": ",
                                conditionLabel,
                              ),
                            e.createElement(
                              "div",
                              {
                                className:
                                  "text-lg sm:text-2xl font-extrabold text-green-600 dark:text-green-400 mb-3 dark:text-green-300",
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
                                    "flex items-center text-gray-500 dark:text-gray-400 text-sm mb-4 dark:text-gray-300",
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
                                    "grid grid-cols-3 gap-1 py-2 px-1 bg-slate-50 dark:bg-slate-900/40 rounded-xl mb-3 border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300",
                                },
                                e.createElement(
                                  "div",
                                  { className: "flex flex-col items-center justify-center p-1 border-r border-slate-150 dark:border-slate-800" },
                                  e.createElement(Xe, {
                                    className: "w-4 h-4 mb-1 text-blue-500",
                                  }),
                                  e.createElement("span", { className: "font-bold text-slate-800 dark:text-slate-155" }, Number(t.views_count || t.views || 0)),
                                  e.createElement("span", { className: "text-[9px] text-slate-400 font-medium tracking-tight uppercase" }, tr("views", "Views"))
                                ),
                                e.createElement(
                                  "div",
                                  { className: "flex flex-col items-center justify-center p-1 border-r border-slate-155 dark:border-slate-800" },
                                  e.createElement(qe, {
                                    className: "w-4 h-4 mb-1 text-red-500",
                                  }),
                                  e.createElement("span", { className: "font-bold text-slate-800 dark:text-slate-155" }, Number(t.likes || t.likes_count || 0)),
                                  e.createElement("span", { className: "text-[9px] text-slate-400 font-medium tracking-tight uppercase" }, tr("saves", "Saves"))
                                ),
                                e.createElement(
                                  "div",
                                  { className: "flex flex-col items-center justify-center p-1" },
                                  e.createElement(MessageSquare, {
                                    className: "w-4 h-4 mb-1 text-green-500",
                                  }),
                                  e.createElement("span", { className: "font-bold text-slate-800 dark:text-slate-155" }, Number(t.chats_count || t.chats || 0)),
                                  e.createElement("span", { className: "text-[9px] text-slate-400 font-medium tracking-tight uppercase" }, tr("chats", "Chats"))
                                )
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
                                    "shrink-0 min-w-[36px] h-8 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg px-2.5 text-xs sm:h-9 sm:min-w-[120px] sm:px-3 sm:text-xs shadow inline-flex items-center justify-center gap-1.5 dark:bg-blue-700/40 dark:hover:bg-blue-700/40 dark:text-white",
                                  onClick: () => je(t),
                                },
                                e.createElement(Xe, { className: "w-5 h-5" }),
                                e.createElement(
                                  "span",
                                  { className: "hidden sm:inline" },
                                  tr("view_details", "View Details"),
                                ),
                              ),
                              r === "active" &&
                                isOwnerPost &&
                                e.createElement(
                                  g,
                                  {
                                    variant: "outline",
                                    className:
                                      "shrink-0 h-8 border-2 border-emerald-400 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 font-bold rounded-lg px-2.5 sm:h-9 sm:px-3 dark:border-emerald-600/40 dark:text-emerald-300 dark:hover:bg-emerald-950/20",
                                    onClick: () => openMarkSold(t),
                                  },
                                  e.createElement(G, { className: "w-5 h-5" }),
                                  e.createElement(
                                    "span",
                                    { className: "hidden sm:inline" },
                                    tr("mark_sold", "Mark Sold"),
                                  ),
                                ),
                              !s &&
                                e.createElement(
                                  g,
                                  {
                                    variant: "outline",
                                    className:
                                      "shrink-0 h-8 border-2 border-red-400 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 font-bold rounded-lg px-2.5 sm:h-9 sm:px-3 dark:border-red-600/40 dark:text-red-300 dark:hover:bg-red-950/20",
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
                        "text-base px-5 py-2 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-700/40 dark:text-white dark:hover:bg-blue-700/40",
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
                        "text-base px-5 py-2 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-700/40 dark:text-white dark:hover:bg-blue-700/40",
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
                    "bg-blue-600 text-white rounded-full shadow-xl w-14 h-14 flex items-center justify-center text-3xl hover:bg-blue-700 hover:scale-110 transition-all dark:bg-blue-700/40 dark:text-white dark:hover:bg-blue-700/40",
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
                { className: "mhub-premium-surface rounded-2xl" },
                e.createElement(
                  q,
                  null,
                  e.createElement(
                    K,
                    {
                      className:
                        "text-xl font-bold text-gray-900 dark:text-gray-100",
                    },
                    l("delete_post_title"),
                  ),
                  e.createElement(
                    J,
                    { className: "text-gray-600 dark:text-gray-200" },
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
                        "bg-red-600 hover:bg-red-700 text-white rounded-xl dark:bg-red-700/40 dark:hover:bg-red-700/40 dark:text-white",
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
                { className: "mhub-premium-surface rounded-2xl" },
                e.createElement(
                  q,
                  null,
                  e.createElement(
                    K,
                    {
                      className:
                        "text-xl font-bold text-gray-900 dark:text-gray-100",
                    },
                    l("move_sale_undone_title"),
                  ),
                  e.createElement(
                    J,
                    { className: "text-gray-600 dark:text-gray-200" },
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
                        "bg-orange-600 hover:bg-orange-700 text-white rounded-xl dark:bg-orange-700/40 dark:hover:bg-orange-700/40 dark:text-white",
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
                { className: "mhub-premium-surface rounded-2xl" },
                e.createElement(
                  q,
                  null,
                  e.createElement(
                    K,
                    {
                      className:
                        "text-xl font-bold text-gray-900 dark:text-gray-100",
                    },
                    l("bulk_delete_title", { count: c.size }),
                  ),
                  e.createElement(
                    J,
                    { className: "text-gray-600 dark:text-gray-200" },
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
                        "bg-red-600 hover:bg-red-700 text-white rounded-xl dark:bg-red-700/40 dark:hover:bg-red-700/40 dark:text-white",
                    },
                    l("delete_all"),
                  ),
                ),
              ),
            ),
            e.createElement(
              W,
              {
                open: Boolean(markSoldPost),
                onOpenChange: (t) => {
                  t || setMarkSoldPost(null);
                },
              },
              e.createElement(
                Q,
                { className: "mhub-premium-surface rounded-2xl" },
                e.createElement(
                  q,
                  null,
                  e.createElement(
                    K,
                    {
                      className:
                        "text-xl font-bold text-gray-900 dark:text-gray-100",
                    },
                    tr("mark_sold_title", "Mark as sold?"),
                  ),
                  e.createElement(
                    J,
                    { className: "text-gray-600 dark:text-gray-200" },
                    tr(
                      "mark_sold_desc",
                      "This will move your listing to Sold and hide it from buyers.",
                    ),
                  ),
                ),
                markSoldPost &&
                  e.createElement(
                    "div",
                    {
                      className:
                        "mt-2 rounded-xl border border-emerald-200 dark:border-emerald-700/40 bg-emerald-50 dark:bg-emerald-900/20 p-3 text-sm",
                    },
                    e.createElement(
                      "p",
                      { className: "font-semibold text-emerald-900 dark:text-emerald-100" },
                      markSoldPost.title || tr("untitled_post", "Untitled"),
                    ),
                    markSoldPost.price != null &&
                      e.createElement(
                        "p",
                        { className: "text-emerald-700 dark:text-emerald-200 mt-1" },
                        "INR ",
                        typeof markSoldPost.price == "number"
                          ? markSoldPost.price.toLocaleString()
                          : markSoldPost.price,
                      ),
                  ),
                e.createElement(
                  X,
                  null,
                  e.createElement(Y, { className: "rounded-xl" }, l("cancel")),
                  e.createElement(
                    O,
                    {
                      onClick: confirmMarkSold,
                      disabled: markSoldLoading,
                      className:
                        "bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl dark:bg-emerald-700/40 dark:hover:bg-emerald-700/40 dark:text-white",
                    },
                    markSoldLoading
                      ? tr("marking_sold", "Marking...")
                      : tr("confirm", "Confirm"),
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
            e.createElement(PromoteDialog, {
              open: Boolean(promotePostId),
              onOpenChange: (t) => {
                if (!t) closePromote();
              },
              postId: promotePostId,
              postTitle: promotePostTitle,
            }),
            activePostForActions &&
              e.createElement(
                "div",
                {
                  className: `fixed inset-0 z-[100] transition-opacity duration-300 ${actionSheetOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`,
                },
                e.createElement("div", {
                  className: "absolute inset-0 bg-black/60 backdrop-blur-sm",
                  onClick: () => {
                    setActionSheetOpen(false);
                    setTimeout(() => setActivePostForActions(null), 300);
                  },
                }),
                e.createElement(
                  "div",
                  {
                    className: `fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl p-6 transition-transform duration-300 transform z-[110] ${actionSheetOpen ? "translate-y-0" : "translate-y-full"}`,
                  },
                  e.createElement("div", {
                    className: "w-12 h-1.5 bg-gray-300 dark:bg-slate-700 rounded-full mx-auto mb-6",
                  }),
                  e.createElement(
                    "div",
                    { className: "flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-slate-800" },
                    e.createElement("img", {
                      src: Ie(activePostForActions),
                      className: "w-12 h-12 rounded-xl object-cover",
                    }),
                    e.createElement(
                      "div",
                      { className: "flex-1 min-w-0" },
                      e.createElement(
                        "h4",
                        { className: "font-bold text-slate-900 dark:text-slate-100 truncate text-left" },
                        activePostForActions.title,
                      ),
                      e.createElement(
                        "p",
                        { className: "text-xs text-slate-500 dark:text-slate-400 mt-0.5 text-left" },
                        "INR ",
                        activePostForActions.price?.toLocaleString(),
                      ),
                    ),
                  ),
                  e.createElement(
                    "div",
                    { className: "space-y-3" },
                    e.createElement(
                      g,
                      {
                        variant: "outline",
                        className: "w-full justify-start text-left h-12 rounded-xl border-gray-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 gap-3 font-semibold",
                        onClick: () => {
                          setActionSheetOpen(false);
                          setTimeout(() => {
                            Le(activePostForActions);
                            setActivePostForActions(null);
                          }, 200);
                        },
                      },
                      e.createElement(Ke, { className: "w-5 h-5 text-blue-500" }),
                      l("edit_post"),
                    ),
                    activePostForActions && isPostOwnedByUser(activePostForActions, F) &&
                      e.createElement(
                        g,
                        {
                          variant: "outline",
                          className: "w-full justify-start text-left h-12 rounded-xl border-gray-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 gap-3 font-semibold",
                          onClick: () => {
                            setActionSheetOpen(false);
                            setTimeout(() => {
                              openPromote(
                                activePostForActions.postId || activePostForActions.post_id || activePostForActions.id,
                                activePostForActions.title || "",
                              );
                              setActivePostForActions(null);
                            }, 200);
                          },
                        },
                        e.createElement(nt, { className: "w-5 h-5 text-amber-500" }),
                        l("promote") || "Promote",
                      ),
                    e.createElement(
                      g,
                      {
                        variant: "outline",
                        className: "w-full justify-start text-left h-12 rounded-xl border-red-100 hover:bg-red-50 dark:border-red-950/40 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400 gap-3 font-semibold",
                        onClick: () => {
                          setActionSheetOpen(false);
                          setTimeout(() => {
                            ae(activePostForActions.postId || activePostForActions.post_id || activePostForActions.id);
                            setActivePostForActions(null);
                          }, 200);
                        },
                      },
                      e.createElement(Z, { className: "w-5 h-5 text-red-500" }),
                      l("delete"),
                    ),
                  ),
                  e.createElement(
                    g,
                    {
                      variant: "ghost",
                      className: "w-full h-12 mt-4 rounded-xl text-slate-500 dark:text-slate-400 font-bold hover:bg-gray-100 dark:hover:bg-slate-800",
                      onClick: () => {
                        setActionSheetOpen(false);
                        setTimeout(() => setActivePostForActions(null), 300);
                      },
                    },
                    l("cancel"),
                  ),
                ),
              ),
          )
      : e.createElement(
          "div",
          {
            className:
              "mhub-page-myposts min-h-screen mhub-premium-page bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 dark:bg-gradient-to-br",
          },
          e.createElement(
            "div",
            { className: "pt-16 pb-12 px-6 text-center" },
            e.createElement(
              "div",
              {
                className:
                  "w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-2xl dark:bg-gradient-to-br",
              },
              e.createElement(ue, { className: "w-12 h-12 text-white dark:text-white" }),
            ),
            e.createElement(
              "h1",
              { className: "text-lg sm:text-2xl md:text-3xl font-bold text-white mb-3 dark:text-white" },
              l("my_home_title"),
            ),
            e.createElement(
              "p",
              { className: "text-white/80 text-lg max-w-md mx-auto dark:text-white/80" },
              l("manage_listings"),
            ),
          ),
          e.createElement(
            "div",
            { className: "max-w-[640px] mx-auto px-6 space-y-4 page-shell page-pad" },
            e.createElement(
              ne,
              {
                to: "/login",
                state: { returnTo: "/my-home" },
                className:
                  "block mhub-premium-surface rounded-2xl p-6 shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300",
              },
              e.createElement(
                "div",
                { className: "flex items-center gap-4" },
                e.createElement(
                  "div",
                  {
                    className:
                      "w-14 h-14 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg dark:bg-gradient-to-br",
                  },
                  e.createElement(G, { className: "w-7 h-7 text-white dark:text-white" }),
                ),
                e.createElement(
                  "div",
                  { className: "flex-1" },
                  e.createElement(
                    "h3",
                    { className: "text-xl font-bold text-gray-900 dark:text-gray-100" },
                    l("login"),
                  ),
                  e.createElement(
                    "p",
                    { className: "text-gray-500 dark:text-gray-400 text-sm dark:text-gray-300" },
                    l("already_account"),
                  ),
                ),
                e.createElement(be, { className: "w-6 h-6 text-gray-400 dark:text-gray-300" }),
              ),
            ),
            e.createElement(
              ne,
              {
                to: "/signup",
                className:
                  "block bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-xl hover:shadow-2xl hover:bg-white/20 hover:scale-[1.02] transition-all duration-300 dark:bg-slate-900/10 dark:border-white/20 dark:hover:bg-slate-900/20",
              },
              e.createElement(
                "div",
                { className: "flex items-center gap-4" },
                e.createElement(
                  "div",
                  {
                    className:
                      "w-14 h-14 rounded-xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center shadow-lg dark:bg-gradient-to-br",
                  },
                  e.createElement(nt, { className: "w-7 h-7 text-white dark:text-white" }),
                ),
                e.createElement(
                  "div",
                  { className: "flex-1" },
                  e.createElement(
                    "h3",
                    { className: "text-xl font-bold text-white dark:text-white" },
                    l("signup"),
                  ),
                  e.createElement(
                    "p",
                    { className: "text-white/70 text-sm dark:text-white/70" },
                    l("new_user"),
                  ),
                ),
                e.createElement(be, { className: "w-6 h-6 text-white/60 dark:text-white/60" }),
              ),
            ),
          ),
        );
};
var zt = MyHomePage;
export { zt as default };

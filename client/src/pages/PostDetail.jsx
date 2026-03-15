import e, { useEffect as L, useState as i } from "react";
import {
  useParams as Y,
  useNavigate as Z,
  Link as R,
  useLocation as ee,
} from "react-router-dom";
import re from "../lib/api";
import { Button as l } from "@/components/ui/button";
import { Badge as te } from "@/components/ui/badge";
import { Avatar as ae, AvatarFallback as se } from "@/components/ui/avatar";
import { Card as g, CardContent as p } from "@/components/ui/card";
import { useTranslation as oe } from "react-i18next";
import { useAuth as useAuthContext } from "@/context/AuthContext";
import le from "@/components/BuyerInterestModal";
import ie from "@/components/MakeOfferModal";
import ne from "@/components/BargainActions";
import Se from "@/components/ShareLinkDialog";
import PostBoostPanel from "@/components/PostBoostPanel";
import SponsoredListings from "@/components/SponsoredListings";
import { getApiOriginBase as de } from "@/lib/networkConfig";
import { getUserId as getUserIdFromStorage } from "@/utils/authStorage";
import {
  beginSavedPostMutation,
  endSavedPostMutation,
  isSavedPostId,
  setSavedPostStatus,
  subscribeSavedPosts,
} from "@/utils/savedPosts";
import { resolveMediaUrl as cee } from "@/lib/mediaUrl";
import { navigateBack } from "@/utils/navigation";
import {
  ArrowLeft as $,
  ChevronLeft as me,
  ChevronRight as ge,
  MapPin as pe,
  Star as ue,
  Eye as ce,
  Flag as be,
  HandHeart as fe,
  Package as x,
  Tag as xe,
  Clock as he,
  CheckCircle as ye,
  Sparkles as ve,
  ShieldCheck as Ne,
  DollarSign as ke,
  Bookmark as We,
  BookmarkCheck as Xe,
  MoreVertical as Je,
  Link as Qe,
} from "lucide-react";
function PostDetail() {
  const { t: h } = oe(),
    tr = (key, fallback) => {
      const value = h(key);
      if (typeof value !== "string" || !value.trim() || value === key) {
        return fallback;
      }
      return value;
    },
    { id: d } = Y(),
    y = ee(),
    { user: currentUser } = useAuthContext(),
    [r, u] = i(y.state?.post || null),
    [j, c] = i(!y.state?.post),
    [v, N] = i(""),
    [F, M] = i(0),
    [b, m] = i(0),
    [E, f] = i(!1),
    [V, w] = i(!1),
    [shareDialogOpen, setShareDialogOpen] = i(!1),
    [shareUrl, setShareUrl] = i(""),
    [showMenu, setShowMenu] = i(!1),
    [savedPost, setSavedPost] = i(!1),
    [ownerInsights, setOwnerInsights] = i({
      inquiries: [],
      offers: [],
      viewers: [],
    }),
    [ownerInsightsLoading, setOwnerInsightsLoading] = i(!1),
    [ownerInsightsError, setOwnerInsightsError] = i(""),
    U = Z(),
    normalizeId = (t) => {
      if (t === undefined || t === null) return "";
      if (typeof t === "string" || typeof t === "number") {
        return String(t).trim();
      }
      if (typeof t === "object") {
        const candidate = t.post_id || t.id || t.user_id;
        return candidate ? String(candidate).trim() : "";
      }
      return "";
    },
    currentUserId = getUserIdFromStorage(currentUser),
    normalizedCurrentUserId = normalizeId(currentUserId),
    J = normalizeId(r?.post_id || r?.id || d),
    isOwner = Boolean(
      normalizedCurrentUserId &&
        [
          r?.user_id,
          r?.userId,
          r?.owner_id,
          r?.ownerId,
          r?.seller_id,
          r?.sellerId,
          r?.seller?.id,
          r?.user?.id,
          r?.user?.user_id,
          r?.author_id,
          r?.authorId,
        ].some((t) => normalizeId(t) === normalizedCurrentUserId),
    ),
    isOwnerView = isOwner || Boolean(y?.state?.fromMyPosts),
    backTarget =
      y?.state?.returnTo ||
      (y?.state?.fromMyPosts ? "/my-home" : "/all-posts");
  if (
    (L(() => {
      const t = normalizeId(r?.post_id || r?.id || d);
      if (!t) return;
      const a = currentUserId,
        s = localStorage.getItem("authToken");
      if (!a || !s) return;
      const Q = (document.referrer || "").includes("/feed")
          ? "feed"
          : "allposts",
        W = de();
      fetch(`${W}/api/recently-viewed/track`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${s}`,
        },
        credentials: "include",
        body: JSON.stringify({ postId: t, userId: a, source: Q }),
      })
        .then((X) => X.json())
        .catch(() => {});
    }, [d, currentUserId]),
    L(() => {
      window.scrollTo(0, 0),
        r ||
          (async () => {
            try {
              N("");
              const a = await re.get(`/api/posts/${d}`),
                s = a?.post || a;
              if (!s || Object.keys(s).length === 0)
                throw new Error("API returned no post data.");
              const mediaList = Array.isArray(s.images)
                  ? s.images
                  : typeof s.images == "string" && s.images.trim()
                    ? (() => {
                        try {
                          const Ce = JSON.parse(s.images);
                          return Array.isArray(Ce) ? Ce : [s.images];
                        } catch {
                          return [s.images];
                        }
                      })()
                    : [],
                T = { ...s, images: mediaList, seller: s.seller || {} };
              u(T),
                setSavedPost(
                  Boolean(
                    T?.is_saved ||
                      T?.saved ||
                      isSavedPostId(T?.post_id || T?.id || d),
                  ),
                ),
                c(!1);
            } catch (a) {
              console.error("Error fetching post data:", a),
                N(a?.message || "Failed to load product"),
                c(!1),
                u(null);
            }
          })(),
        m(0);
    }, [d, F]),
    L(() => {
      const t = normalizeId(r?.post_id || r?.id || d);
      if (!t) return;
      setSavedPost(isSavedPostId(t));
      return subscribeSavedPosts((a) => {
        setSavedPost(Boolean(a?.[t]));
      });
    }, [d, r?.id, r?.post_id]),
      L(() => {
        const postId = normalizeId(r?.post_id || r?.id || d);
        if (!postId || !isOwnerView) return;
        let cancelled = false;
      setOwnerInsightsLoading(true);
      setOwnerInsightsError("");
      Promise.allSettled([
        re.get(`/api/inquiries/post/${postId}`),
        re.get(`/api/offers/history/${postId}`),
        re.get(`/api/recently-viewed/post/${postId}`),
      ])
        .then((results) => {
          if (cancelled) return;
          const [inquiriesRes, offersRes, viewersRes] = results;
          const inquiries =
            inquiriesRes.status === "fulfilled" &&
            Array.isArray(inquiriesRes.value?.inquiries)
              ? inquiriesRes.value.inquiries
              : [];
          const offers =
            offersRes.status === "fulfilled" &&
            Array.isArray(offersRes.value?.history)
              ? offersRes.value.history
              : [];
          const viewers =
            viewersRes.status === "fulfilled" &&
            Array.isArray(viewersRes.value?.viewers)
              ? viewersRes.value.viewers
              : [];
          setOwnerInsights({ inquiries, offers, viewers });
        })
        .catch(() => {
          if (!cancelled) {
            setOwnerInsightsError(
              tr("lead_fetch_failed", "Failed to load lead activity."),
            );
          }
        })
        .finally(() => {
          if (!cancelled) {
            setOwnerInsightsLoading(false);
          }
        });
      return () => {
        cancelled = true;
      };
      }, [
        d,
        isOwnerView,
        r?.id,
        r?.post_id,
        r?.user_id,
        r?.userId,
        r?.owner_id,
        r?.seller_id,
        r?.seller?.id,
        r?.user?.id,
      ]),
    j)
  )
    return e.createElement(
      "div",
      {
        className:
          "min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center",
      },
      e.createElement(
        "div",
        { className: "text-center" },
        e.createElement("div", {
          className:
            "w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4",
        }),
        e.createElement(
          "p",
          { className: "text-lg font-medium text-gray-600 dark:text-gray-300" },
          h("loading") || "Loading product...",
        ),
      ),
    );
  if (!r)
    return e.createElement(
      "div",
      {
        className:
          "min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4",
      },
      e.createElement(
        "div",
        {
          className:
            "text-center p-8 bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-lg w-full page-shell page-pad",
        },
        e.createElement(
          "div",
          {
            className:
              "w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6",
          },
          e.createElement(x, { className: "w-10 h-10 text-red-500" }),
        ),
        e.createElement(
          "h2",
          {
            className: "text-2xl font-bold text-gray-800 dark:text-white mb-3",
          },
          h("error") || "Product Not Found",
        ),
        e.createElement(
          "p",
          { className: "text-gray-600 dark:text-gray-300 mb-2" },
          "This product is no longer available or has been removed.",
        ),
        v &&
          e.createElement("p", { className: "text-sm text-red-500 mb-4" }, v),
        e.createElement(
          "div",
          { className: "flex flex-wrap justify-center gap-2" },
          e.createElement(
            l,
            {
              type: "button",
              variant: "outline",
              onClick: () => {
                c(!0), u(null), M((t) => t + 1);
              },
            },
            "Retry",
          ),
          e.createElement(
            R,
            { to: "/all-posts" },
            e.createElement(
              l,
              {
                className:
                  "bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-semibold",
              },
              e.createElement($, { className: "w-4 h-4 mr-2" }),
              "Browse Products",
            ),
          ),
        ),
      ),
    );
  const z = () => {
      !r.images || r.images.length === 0 || m((t) => (t + 1) % r.images.length);
    },
    H = () => {
      !r.images ||
        r.images.length === 0 ||
        m((t) => (t - 1 + r.images.length) % r.images.length);
    },
    o = r.seller || {
      name: r.author || "Verified Seller",
      id: r.user_id || "N/A",
      rating: "4.5",
      verified: !0,
    },
    C = (t) =>
      t
        ? new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
          }).format(t)
        : "\u20B9 N/A",
    I = (t) => {
      if (!t) return "Recently";
      try {
        return new Date(t).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
      } catch {
        return "Recently";
      }
    },
    S = !!(
      o?.verified ||
      o?.isVerified ||
      r?.seller_verified ||
      r?.aadhaar_verified ||
      r?.pan_verified ||
      r?.user?.isVerified
    ),
    _ = Number(o?.rating || r?.seller_rating || 0),
    B = Number(
      o?.successful_sales ||
        r?.successful_sales ||
        r?.completed_sales ||
        r?.seller_completed_sales ||
        0,
    ),
    P = Number(
      o?.response_rate || r?.response_rate || r?.seller_response_rate || 0,
    ),
    A =
      o?.member_since || r?.seller_member_since || r?.user?.created_at || null,
    q = A ? I(A) : "Not available",
    G =
      o?.response_time ||
      r?.response_time ||
      r?.avg_response_time ||
      "Not available",
    toggleSavedPost = async () => {
      const t = J;
      if (!t) return;
      const a = beginSavedPostMutation(t);
      if (!a) return;
      const s = isSavedPostId(a),
        l = !s;
      setSavedPost(l), setSavedPostStatus(a, l);
      try {
        l
          ? await re.post("/api/wishlist", { postId: a })
          : await re.delete(`/api/wishlist/${a}`);
      } catch {
        setSavedPost(s), setSavedPostStatus(a, s);
      } finally {
        endSavedPostMutation(a);
      }
    },
    K = [
      {
        key: "verification",
        label: "Seller verification",
        value: S ? "Verified profile" : "Verification pending",
        hint: S
          ? "Identity checks completed."
          : "Use in-app chat and confirm identity before payment.",
      },
      {
        key: "rating",
        label: "Seller rating",
        value: _ > 0 ? `${_.toFixed(1)} / 5` : "No rating yet",
        hint: "Based on prior buyer feedback.",
      },
      {
        key: "sales",
        label: "Completed sales",
        value: B > 0 ? `${B}` : "New seller",
        hint: "Higher completed sales can indicate reliability.",
      },
      {
        key: "response",
        label: "Response profile",
        value: P > 0 ? `${P}% response rate` : String(G),
        hint: "Check response time before committing to urgent deals.",
      },
      {
        key: "member",
        label: "Member since",
        value: q,
        hint: `Listing ID: ${J}`,
      },
    ];
  const ownerInquiries = Array.isArray(ownerInsights?.inquiries)
      ? ownerInsights.inquiries
      : [],
    ownerOffers = Array.isArray(ownerInsights?.offers)
      ? ownerInsights.offers
      : [],
    ownerViewers = Array.isArray(ownerInsights?.viewers)
      ? ownerInsights.viewers
      : [],
    ownerLeadSnapshot = (() => {
      const map = new Map();
      const upsert = (entry, type) => {
        if (!entry) return;
        const id =
          entry?.buyer_id ||
          entry?.viewer_id ||
          entry?.user_id ||
          entry?.id ||
          "";
        if (!id) return;
        const key = String(id);
        const existing = map.get(key) || {
          id: key,
          name:
            entry?.buyer_name ||
            entry?.viewer_name ||
            entry?.full_name ||
            entry?.username ||
            entry?.name ||
            entry?.buyer_id ||
            entry?.viewer_id ||
            entry?.user_id ||
            tr("unknown", "Unknown"),
          types: new Set(),
        };
        existing.types.add(type);
        map.set(key, existing);
      };
      ownerInquiries.forEach((entry) => upsert(entry, "Interested"));
      ownerOffers.forEach((entry) => upsert(entry, "Offer"));
      ownerViewers.forEach((entry) => upsert(entry, "View"));
      return map;
    })(),
    ownerLeadCount = ownerLeadSnapshot.size,
    ownerLeadList = Array.from(ownerLeadSnapshot.values()).map((lead) => ({
      ...lead,
      types: Array.from(lead.types),
    }));
  return e.createElement(
    "div",
    {
      className:
        "min-h-screen bg-gradient-to-b from-slate-100 via-white to-slate-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900",
    },
    e.createElement(
      "div",
      {
        className:
          "sticky top-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md shadow-sm",
      },
      e.createElement(
        "div",
        {
          className:
            "max-w-4xl mx-auto px-4 py-3 flex items-center justify-between page-shell page-pad",
        },
        e.createElement(
          l,
          {
            variant: "ghost",
            onClick: () => navigateBack(U, backTarget),
            className:
              "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full px-4",
          },
          e.createElement($, { className: "w-5 h-5 mr-2" }),
          "Back",
        ),
        !isOwnerView &&
          e.createElement(
            "div",
            { className: "flex items-center gap-1 relative" },
            e.createElement(
              l,
              {
                variant: "ghost",
                size: "icon",
                onClick: toggleSavedPost,
                className: `rounded-full w-10 h-10 ${savedPost ? "text-blue-600 bg-blue-50 dark:bg-blue-900/30" : "text-gray-500 dark:text-gray-400"}`,
              },
              savedPost
                ? e.createElement(Xe, { className: "w-5 h-5" })
                : e.createElement(We, { className: "w-5 h-5" }),
            ),
            e.createElement(
              l,
              {
                variant: "ghost",
                size: "icon",
                onClick: () => setShowMenu((t) => !t),
                className: "rounded-full w-10 h-10 text-gray-500 dark:text-gray-400",
              },
              e.createElement(Je, { className: "w-5 h-5" }),
            ),
            showMenu &&
              e.createElement(
                "div",
                {
                  className:
                    "absolute right-0 top-11 z-30 w-44 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg p-1",
                },
                e.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: () => {
                      if (!J) return;
                      const t = `${window.location.origin}/post/${J}`;
                      setShareUrl(t),
                        setShareDialogOpen(!0),
                        setShowMenu(!1),
                        re.post(`/api/posts/${J}/share`).catch(() => {});
                    },
                    className:
                      "w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg",
                  },
                  tr("share_link", "Share link"),
                ),
                e.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: () => {
                      toggleSavedPost(), setShowMenu(!1);
                    },
                    className:
                      "w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg",
                  },
                  savedPost
                    ? tr("remove_from_saved", "Remove from saved")
                    : tr("save_post", "Save post"),
                ),
                e.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: () => {
                      setShowMenu(!1),
                        U("/complaints", { state: { postId: J } });
                    },
                    className:
                      "w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg",
                  },
                  "Report",
                ),
              ),
          ),
      ),
      e.createElement(
        "div",
        { className: "max-w-4xl mx-auto px-4 py-6 space-y-5 page-shell page-pad" },
        e.createElement(
          "div",
          {
            className:
              "bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden",
          },
          e.createElement(
            "div",
            {
              className:
                "relative aspect-square max-h-96 bg-gray-100 dark:bg-gray-700 group",
            },
            e.createElement("img", {
              src: cee(r.images?.[b]),
              alt: r.title,
              className: "w-full h-full object-contain",
              onError: (t) => {
                (t.target.onerror = null), (t.target.src = "/placeholder.svg");
              },
            }),
            e.createElement(
              "div",
              { className: "absolute top-3 left-3 flex flex-col gap-2" },
              e.createElement(
                te,
                {
                  className: `px-3 py-1 text-xs font-bold rounded-full ${r.tier?.toLowerCase() === "premium" ? "bg-gradient-to-r from-yellow-400 to-orange-500 text-white" : r.tier?.toLowerCase() === "silver" ? "bg-gradient-to-r from-gray-400 to-gray-500 text-white" : "bg-gradient-to-r from-green-400 to-emerald-500 text-white"}`,
                },
                e.createElement(ve, { className: "w-3 h-3 mr-1 inline" }),
                r.tier?.toUpperCase() || "STANDARD",
              ),
            ),
            e.createElement(
              "div",
              {
                className:
                  "absolute top-3 right-3 bg-black/60 text-white px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1",
              },
              e.createElement(ce, { className: "w-3.5 h-3.5" }),
              r.views || 0,
            ),
            r.images &&
              r.images.length > 1 &&
              e.createElement(
                e.Fragment,
                null,
                e.createElement(
                  "button",
                  {
                    onClick: H,
                    className:
                      "absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 dark:bg-gray-800/90 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity",
                  },
                  e.createElement(me, { className: "w-5 h-5" }),
                ),
                e.createElement(
                  "button",
                  {
                    onClick: z,
                    className:
                      "absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 dark:bg-gray-800/90 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity",
                  },
                  e.createElement(ge, { className: "w-5 h-5" }),
                ),
                e.createElement(
                  "div",
                  {
                    className:
                      "absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5",
                  },
                  r.images.map((t, a) =>
                    e.createElement("button", {
                      key: a,
                      onClick: () => m(a),
                      className: `w-2 h-2 rounded-full transition-all ${a === b ? "bg-blue-500 w-6" : "bg-white/70"}`,
                    }),
                  ),
                ),
              ),
          ),
          r.images &&
            r.images.length > 1 &&
            e.createElement(
              "div",
              {
                className:
                  "p-3 border-t dark:border-gray-700 overflow-x-auto scrollbar-hide",
              },
              e.createElement(
                "div",
                { className: "flex gap-2" },
                r.images.map((t, a) =>
                  e.createElement(
                    "button",
                    {
                      key: a,
                      onClick: () => m(a),
                      className: `flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${a === b ? "border-blue-500 scale-105" : "border-transparent opacity-60"}`,
                    },
                    e.createElement("img", {
                      src: cee(t),
                      onError: (s) => {
                        s.target.src = "/placeholder.svg";
                      },
                      alt: "",
                      className: "w-full h-full object-cover",
                    }),
                  ),
                ),
              ),
            ),
        ),
        e.createElement(
          g,
          {
            className:
              "bg-white dark:bg-gray-800 border-0 shadow-lg rounded-2xl overflow-hidden",
          },
          e.createElement(
            p,
            { className: "p-5" },
            e.createElement(
              "h1",
              {
                className:
                  "text-xl font-bold text-gray-900 dark:text-white mb-2",
              },
              r.title || "Product Title",
            ),
            e.createElement(
              "div",
              { className: "flex items-baseline gap-3 mb-4" },
              e.createElement(
                "span",
                {
                  className:
                    "text-3xl font-extrabold text-green-600 dark:text-green-400",
                },
                C(r.price),
              ),
              r.originalPrice &&
                e.createElement(
                  "span",
                  { className: "text-lg text-gray-400 dark:text-gray-500 line-through" },
                  C(r.originalPrice),
                ),
              r.discount &&
                e.createElement(
                  "span",
                  {
                    className:
                      "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 px-2 py-0.5 rounded text-sm font-semibold",
                  },
                  r.discount,
                  "% OFF",
                ),
            ),
            e.createElement(
              "div",
              { className: "flex flex-wrap gap-2 mb-4" },
              e.createElement(
                "span",
                {
                  className:
                    "inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full text-sm font-medium",
                },
                e.createElement(xe, { className: "w-3.5 h-3.5" }),
                " ",
                r.category || "Category",
              ),
              e.createElement(
                "span",
                {
                  className:
                    "inline-flex items-center gap-1 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-3 py-1 rounded-full text-sm font-medium",
                },
                e.createElement(x, { className: "w-3.5 h-3.5" }),
                " ",
                r.condition || "Good Condition",
              ),
              e.createElement(
                "span",
                {
                  className:
                    "inline-flex items-center gap-1 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-3 py-1 rounded-full text-sm font-medium",
                },
                e.createElement(pe, { className: "w-3.5 h-3.5" }),
                " ",
                r.location || "Location",
              ),
            ),
            e.createElement(
              "div",
              {
                className:
                  "text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1",
              },
              e.createElement(he, { className: "w-4 h-4" }),
              " Posted ",
              I(r.created_at || r.postedDate),
            ),
          ),
        ),
        e.createElement(
          g,
          {
            className:
              "bg-white dark:bg-gray-800 border-0 shadow-lg rounded-2xl",
          },
          e.createElement(
            p,
            { className: "p-5" },
            e.createElement(
              "div",
              { className: "flex items-center gap-2 mb-4" },
              e.createElement(Ne, { className: "w-5 h-5 text-green-500" }),
              e.createElement(
                "h3",
                { className: "font-bold text-gray-900 dark:text-white" },
                "Trust & Safety",
              ),
            ),
            e.createElement(
              "div",
              { className: "grid grid-cols-1 md:grid-cols-2 gap-3" },
              K.map((t) =>
                e.createElement(
                  "div",
                  {
                    key: t.key,
                    className:
                      "rounded-xl border border-gray-200 dark:border-gray-700 p-3",
                  },
                  e.createElement(
                    "p",
                    { className: "text-xs text-gray-500 dark:text-gray-400" },
                    t.label,
                  ),
                  e.createElement(
                    "p",
                    {
                      className:
                        "text-sm font-semibold text-gray-900 dark:text-white",
                    },
                    t.value,
                  ),
                  e.createElement(
                    "p",
                    {
                      className:
                        "text-xs text-gray-500 dark:text-gray-400 mt-1",
                    },
                    t.hint,
                  ),
                ),
              ),
            ),
            e.createElement(
              "div",
              {
                className:
                  "mt-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-3",
              },
              e.createElement(
                "p",
                { className: "text-xs text-amber-800 dark:text-amber-300" },
                "Safety tip: avoid sharing sensitive details outside the app and verify the listing ID before payment handover.",
              ),
            ),
          ),
        ),
        e.createElement(
          g,
          {
            className:
              "bg-white dark:bg-gray-800 border-0 shadow-lg rounded-2xl",
          },
          e.createElement(
            p,
            { className: "p-5" },
            e.createElement(
              "h3",
              {
                className:
                  "font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2",
              },
              e.createElement(x, { className: "w-5 h-5 text-blue-500" }),
              tr("description", "Description"),
            ),
            e.createElement(
              "p",
              { className: "text-gray-600 dark:text-gray-300 leading-relaxed" },
              r.description ||
                tr(
                  "no_description",
                  "No description provided for this product. Contact the seller for more details.",
                ),
            ),
          ),
        ),
        e.createElement(
          g,
          {
            className:
              "bg-white dark:bg-gray-800 border-0 shadow-lg rounded-2xl",
          },
          e.createElement(
            p,
            { className: "p-5" },
            e.createElement(ne, {
              post: r,
              currentUser: {
                userId: currentUserId,
                id: currentUserId,
              },
              onChatClick: () => f(!0),
            }),
          ),
        ),
        e.createElement(
          g,
          {
            className:
              "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 border-0 shadow-lg rounded-2xl",
          },
          e.createElement(
            p,
            { className: "p-5" },
            e.createElement(
              "div",
              { className: "flex items-center gap-4" },
              e.createElement(
                ae,
                {
                  className:
                    "h-14 w-14 ring-4 ring-white dark:ring-gray-600 shadow-lg",
                },
                e.createElement(
                  se,
                  {
                    className:
                      "bg-gradient-to-br from-blue-500 to-purple-600 text-white text-lg font-bold",
                  },
                  (o.name || "S").charAt(0).toUpperCase(),
                ),
              ),
              e.createElement(
                "div",
                { className: "flex-1" },
                e.createElement(
                  "div",
                  { className: "flex items-center gap-2 mb-0.5" },
                  e.createElement(
                    "h3",
                    { className: "font-bold text-gray-900 dark:text-white" },
                    o.name,
                  ),
                  e.createElement(ye, { className: "w-4 h-4 text-green-500" }),
                ),
                e.createElement(
                  "div",
                  {
                    className:
                      "flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400",
                  },
                  e.createElement(ue, {
                    className: "w-4 h-4 text-amber-400 fill-current",
                  }),
                  e.createElement(
                    "span",
                    { className: "font-semibold" },
                    o.rating,
                  ),
                  e.createElement("span", null, "\u2022"),
                  e.createElement("span", null, "ID: ", o.id),
                ),
              ),
            ),
          ),
        ),
        !isOwnerView &&
          e.createElement(
            "div",
            { className: "space-y-3" },
            e.createElement(
              l,
              {
                onClick: () => f(!0),
                className:
                  "w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-5 text-lg rounded-2xl shadow-xl hover:shadow-2xl transition-all",
              },
              e.createElement(fe, { className: "w-6 h-6 mr-3" }),
              tr(
                "interested_contact_seller",
                "I'm Interested - Contact Seller",
              ),
            ),
            e.createElement(
              l,
              {
                onClick: () => w(!0),
                variant: "outline",
                className:
                  "w-full border-2 border-purple-500 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 font-bold py-4 text-lg rounded-2xl transition-all",
              },
              e.createElement(ke, { className: "w-5 h-5 mr-2" }),
              tr("make_an_offer", "Make an Offer"),
            ),
            e.createElement(
              "p",
              {
                className:
                  "text-center text-xs text-gray-500 dark:text-gray-400",
              },
              tr(
                "secure_contact_details_hint",
                "🔒 Share your contact details securely with only this seller",
              ),
            ),
          ),
        !isOwnerView &&
          e.createElement(
            "div",
            { className: "grid grid-cols-2 gap-3" },
            e.createElement(
              l,
              {
                variant: "outline",
                onClick: toggleSavedPost,
                className: `py-3 rounded-xl font-medium ${savedPost ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400" : "border-gray-200 text-gray-700 dark:border-gray-600 dark:text-gray-300"}`,
              },
              savedPost
                ? e.createElement(Xe, { className: "w-5 h-5 mr-2" })
                : e.createElement(We, { className: "w-5 h-5 mr-2" }),
              savedPost ? tr("saved", "Saved") : tr("save", "Save"),
            ),
            e.createElement(
              l,
              {
                variant: "outline",
                onClick: () => {
                  if (!J) return;
                  const t = `${window.location.origin}/post/${J}`;
                  setShareUrl(t),
                    setShareDialogOpen(!0),
                    re.post(`/api/posts/${J}/share`).catch(() => {});
                },
                className:
                  "py-3 rounded-xl font-medium border-gray-200 text-gray-700 dark:border-gray-600 dark:text-gray-300",
              },
              e.createElement(Qe, { className: "w-5 h-5 mr-2" }),
              tr("share", "Share"),
            ),
          ),
        e.createElement(
          l,
          {
            variant: "ghost",
            className:
              "w-full text-gray-400 dark:text-gray-500 hover:text-red-500 py-3 rounded-xl",
          },
          e.createElement(be, { className: "w-4 h-4 mr-2" }),
          tr("report_listing", "Report this listing"),
        ),
          isOwnerView &&
            e.createElement(
            "div",
            {
              className:
                "rounded-2xl border border-slate-200 bg-white dark:bg-gray-800 p-4 shadow-lg space-y-4",
            },
            e.createElement(
              "div",
              { className: "flex items-center justify-between" },
              e.createElement(
                "div",
                null,
                e.createElement(
                  "h3",
                  {
                    className:
                      "text-lg font-bold text-gray-900 dark:text-white",
                  },
                  tr("lead_activity", "Lead activity"),
                ),
                e.createElement(
                  "p",
                  { className: "text-xs text-gray-500 dark:text-gray-400" },
                  tr(
                    "lead_activity_hint",
                    "Track who viewed and engaged with your post.",
                  ),
                ),
              ),
              e.createElement(
                "span",
                {
                  className:
                    "inline-flex items-center rounded-full bg-emerald-100 text-emerald-700 px-3 py-1 text-xs font-semibold",
                },
                tr("total_leads", "Total leads"),
                " : ",
                ownerLeadCount,
              ),
            ),
            ownerInsightsLoading
              ? e.createElement(
                  "p",
                  { className: "text-sm text-gray-500 dark:text-gray-400" },
                  tr("loading_leads", "Loading lead activity..."),
                )
              : ownerInsightsError
                ? e.createElement(
                    "p",
                    { className: "text-sm text-gray-500 dark:text-gray-400" },
                    ownerInsightsError,
                  )
                : e.createElement(
                    "div",
                    { className: "grid gap-3 md:grid-cols-3" },
                    e.createElement(
                      "div",
                      {
                        className:
                          "rounded-xl border border-slate-200 p-3 bg-slate-50 dark:bg-gray-900/40",
                      },
                      e.createElement(
                        "div",
                        { className: "flex items-center justify-between" },
                        e.createElement(
                          "p",
                          { className: "text-xs text-slate-500 dark:text-slate-400 uppercase" },
                          tr("interested_users", "Interested"),
                        ),
                        e.createElement(
                          "span",
                          {
                            className:
                              "text-xs font-semibold text-slate-600 dark:text-slate-300",
                          },
                          ownerInquiries.length,
                        ),
                      ),
                      ownerInquiries.length > 0
                        ? e.createElement(
                            "div",
                            {
                              className:
                                "mt-2 space-y-1 text-xs max-h-32 overflow-y-auto pr-1",
                            },
                            ownerInquiries.map((t, s) =>
                              e.createElement(
                                "div",
                                {
                                  key: t.inquiry_id || t.buyer_id || s,
                                  className:
                                    "flex items-center justify-between text-slate-600 dark:text-slate-300",
                                },
                                e.createElement(
                                  "span",
                                  null,
                                  t.buyer_name ||
                                    t.name ||
                                    t.buyer_id ||
                                    tr("unknown", "Unknown"),
                                ),
                                t.phone
                                  ? e.createElement(
                                      "span",
                                      { className: "text-[11px]" },
                                      t.phone,
                                    )
                                  : null,
                              ),
                            ),
                          )
                        : e.createElement(
                            "p",
                            {
                              className:
                                "mt-2 text-xs text-slate-400 dark:text-slate-500",
                            },
                            tr("no_leads_yet", "No interactions yet."),
                          ),
                    ),
                    e.createElement(
                      "div",
                      {
                        className:
                          "rounded-xl border border-slate-200 p-3 bg-slate-50 dark:bg-gray-900/40",
                      },
                      e.createElement(
                        "div",
                        { className: "flex items-center justify-between" },
                        e.createElement(
                          "p",
                          { className: "text-xs text-slate-500 dark:text-slate-400 uppercase" },
                          tr("detail_views", "View details"),
                        ),
                        e.createElement(
                          "span",
                          {
                            className:
                              "text-xs font-semibold text-slate-600 dark:text-slate-300",
                          },
                          ownerViewers.length,
                        ),
                      ),
                      ownerViewers.length > 0
                        ? e.createElement(
                            "div",
                            {
                              className:
                                "mt-2 space-y-1 text-xs max-h-32 overflow-y-auto pr-1",
                            },
                            ownerViewers.map((t, s) =>
                              e.createElement(
                                "div",
                                {
                                  key: t.viewer_id || t.user_id || s,
                                  className:
                                    "flex items-center justify-between text-slate-600 dark:text-slate-300",
                                },
                                e.createElement(
                                  "span",
                                  null,
                                  t.viewer_name ||
                                    t.full_name ||
                                    t.username ||
                                    t.user_id ||
                                    tr("unknown", "Unknown"),
                                ),
                                t.viewed_at
                                  ? e.createElement(
                                      "span",
                                      { className: "text-[11px]" },
                                      I(t.viewed_at),
                                    )
                                  : null,
                              ),
                            ),
                          )
                        : e.createElement(
                            "p",
                            {
                              className:
                                "mt-2 text-xs text-slate-400 dark:text-slate-500",
                            },
                            tr("no_leads_yet", "No interactions yet."),
                          ),
                    ),
                    e.createElement(
                      "div",
                      {
                        className:
                          "rounded-xl border border-slate-200 p-3 bg-slate-50 dark:bg-gray-900/40",
                      },
                      e.createElement(
                        "div",
                        { className: "flex items-center justify-between" },
                        e.createElement(
                          "p",
                          { className: "text-xs text-slate-500 dark:text-slate-400 uppercase" },
                          tr("lead_users", "Leads"),
                        ),
                        e.createElement(
                          "span",
                          {
                            className:
                              "text-xs font-semibold text-slate-600 dark:text-slate-300",
                          },
                          ownerLeadCount,
                        ),
                      ),
                      ownerLeadList.length > 0
                        ? e.createElement(
                            "div",
                            {
                              className:
                                "mt-2 space-y-1 text-xs max-h-32 overflow-y-auto pr-1",
                            },
                            ownerLeadList.map((t, s) =>
                              e.createElement(
                                "div",
                                {
                                  key: t.id || s,
                                  className:
                                    "flex items-center justify-between text-slate-600 dark:text-slate-300",
                                },
                                e.createElement(
                                  "span",
                                  null,
                                  t.name || tr("unknown", "Unknown"),
                                ),
                                t.types?.length
                                  ? e.createElement(
                                      "span",
                                      { className: "text-[11px]" },
                                      t.types.join(", "),
                                    )
                                  : null,
                              ),
                            ),
                          )
                        : e.createElement(
                            "p",
                            {
                              className:
                                "mt-2 text-xs text-slate-400 dark:text-slate-500",
                            },
                            tr("no_leads_yet", "No interactions yet."),
                          ),
                    ),
                  ),
          ),
        isOwnerView && e.createElement(PostBoostPanel, { key: "boost-panel", postId: J || d }),
        !isOwnerView && e.createElement(SponsoredListings, { key: "sponsored", excludePostId: J || d, category: r?.category }),
        e.createElement("div", { className: "h-8" }),
      ),
      e.createElement(le, {
        isOpen: E,
        onClose: () => f(!1),
        postId: J || d,
        postTitle: r?.title,
      }),
      e.createElement(ie, { isOpen: V, onClose: () => w(!1), post: r }),
      e.createElement(Se, {
        open: shareDialogOpen,
        onOpenChange: setShareDialogOpen,
        url: shareUrl,
        title: tr("share_post", "Share post"),
      }),
    ),
  );
}
export { PostDetail as default };

import e, {
  useCallback as I,
  useEffect as H,
  useMemo as j,
  useState as i,
} from "react";
import { useParams as F, useNavigate as U } from "react-router-dom";
import {
  Card as h,
  CardContent as y,
  CardHeader as D,
  CardTitle as M,
} from "@/components/ui/card";
import { Button as u } from "@/components/ui/button";
import { Badge as pe } from "@/components/ui/badge";
import {
  Avatar as q,
  AvatarFallback as W,
  AvatarImage as z,
} from "@/components/ui/avatar";
import { Textarea as G } from "@/components/ui/textarea";
import {
  Star as o,
  ThumbsUp as O,
  MessageSquare as J,
  User as K,
  ArrowLeft as T,
} from "lucide-react";
import x from "@/services/api";
import { useToast as Q } from "@/hooks/use-toast";
import { useAuth as V } from "@/context/AuthContext";
import { navigateBack } from "@/utils/navigation";
import {
  PageEmptyState as X,
  PageErrorState as Y,
  PageLoadingState as Z,
} from "@/components/page-state/PageStateBlocks";
const R = () => {
  const { userId: a } = F(),
    g = U(),
    { user: n } = V(),
    { toast: d } = Q(),
    [N, c] = i([]),
    [s, k] = i(null),
    [$, b] = i(!0),
    [C, p] = i(""),
    [l, f] = i({ rating: 5, comment: "" }),
    [S, A] = i(!1),
    [filterRating, setFilterRating] = i("all"),
    [filterVerified, setFilterVerified] = i(!1),
    [filterSort, setFilterSort] = i("recent"),
    [responseDrafts, setResponseDrafts] = i({}),
    [responseBusy, setResponseBusy] = i({}),
    w = n?.user_id || n?.id ? String(n?.user_id || n?.id) : "",
    _ = !!(w && a && w === String(a)),
    B = !!w,
    m = I(async () => {
      if (!a) {
        p("Invalid review target."), b(!1);
        return;
      }
      b(!0), p("");
      try {
        const r = await x.get(`/reviews/user/${a}`);
        c(Array.isArray(r?.reviews) ? r.reviews : []), k(r?.stats || {});
      } catch (r) {
        import.meta.env.DEV && console.error("Failed to fetch reviews:", r),
          p("Unable to load reviews right now. Please retry."),
          c([]),
          k(null);
      } finally {
        b(!1);
      }
    }, [a]);
  H(() => {
    m();
  }, [m]);
  const E = async () => {
      if (!B) {
        g("/login", { state: { returnTo: `/reviews/${a}` } });
        return;
      }
      if (!l.comment.trim()) {
        d({
          title: "Comment required",
          description: "Please add a short comment.",
          variant: "destructive",
        });
        return;
      }
      A(!0);
      try {
        await x.post("/reviews", {
          revieweeId: a,
          rating: l.rating,
          comment: l.comment.trim(),
        }),
          d({
            title: "Review submitted",
            description: "Thank you for your feedback.",
          }),
          f({ rating: 5, comment: "" }),
          m();
      } catch (r) {
        import.meta.env.DEV && console.error("Review submission failed:", r),
          d({
            title: "Submission failed",
            description: "We could not post your review. Please retry.",
            variant: "destructive",
          });
      } finally {
        A(!1);
      }
    },
    L = async (r) => {
      if (!B) {
        g("/login", { state: { returnTo: `/reviews/${a}` } });
        return;
      }
      try {
        const t = await x.patch(`/reviews/${r}/helpful`),
          v = t?.helpfulCount ?? t?.data?.helpfulCount,
          _ = t?.alreadyVoted ?? t?.data?.alreadyVoted;
        c((n) =>
          n.map((B) =>
            B.review_id === r
              ? {
                  ...B,
                  helpful_count: Number.isFinite(Number(v))
                    ? Number(v)
                    : _
                      ? B.helpful_count || 0
                      : (B.helpful_count || 0) + 1,
                }
              : B,
          ),
        );
      } catch (t) {
        import.meta.env.DEV && console.error("Helpful click error:", t),
          d({
            title: "Action failed",
            description: "Could not register your helpful vote. Please retry.",
            variant: "destructive",
          });
      }
    },
    addSellerResponse = async (r, responseText) => {
      if (!B) {
        g("/login", { state: { returnTo: `/reviews/${a}` } });
        return;
      }
      if (!_)
        return d({
          title: "Not allowed",
          description: "Only the reviewed seller can respond to this review.",
          variant: "destructive",
        });
      const t = (responseText ?? "").trim();
      if (!t) {
        d({
          title: "Response required",
          description: "Please add a short response before submitting.",
          variant: "destructive",
        });
        return;
      }
      setResponseBusy((v) => ({ ...v, [r]: !0 }));
      try {
        const v = await x.post(`/reviews/${r}/respond`, { response: t }),
          updatedReview = v?.review ?? v?.data?.review;
        updatedReview &&
          c((B) =>
            B.map((E) =>
              E.review_id === r ? { ...E, ...updatedReview } : E,
            ),
          );
        d({
          title: "Response saved",
          description: "Your response is now visible to buyers.",
        });
      } catch (v) {
        console.error("Seller response error:", v),
          d({
            title: "Response failed",
            description: "We could not save your response. Please retry.",
            variant: "destructive",
          });
      } finally {
        setResponseBusy((v) => ({ ...v, [r]: !1 }));
      }
    },
    P = j(() => s?.distribution || {}, [s?.distribution]);
  const isVerifiedReview = (r) =>
      Boolean(
        r?.verified_purchase ||
          r?.is_verified_purchase ||
          r?.transaction_id ||
          r?.order_id ||
          r?.verified,
      ),
    isRecentReview = (r) => {
      if (!r?.created_at) return !1;
      const t = new Date(r.created_at);
      if (Number.isNaN(t.getTime())) return !1;
      return Date.now() - t.getTime() < 30 * 24 * 60 * 60 * 1000;
    },
    filteredReviews = j(() => {
      let list = Array.isArray(N) ? [...N] : [];
      if (filterRating !== "all") {
        const ratingValue = Number(filterRating);
        if (Number.isFinite(ratingValue) && ratingValue > 0) {
          list = list.filter((r) => Number(r.rating) === ratingValue);
        }
      }
      if (filterVerified) {
        list = list.filter((r) => isVerifiedReview(r));
      }
      switch (filterSort) {
        case "highest":
          list.sort((a, b) => Number(b.rating) - Number(a.rating));
          break;
        case "lowest":
          list.sort((a, b) => Number(a.rating) - Number(b.rating));
          break;
        case "helpful":
          list.sort(
            (a, b) =>
              Number(b.helpful_count || 0) - Number(a.helpful_count || 0),
          );
          break;
        default:
          list.sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime(),
          );
      }
      return list;
    }, [N, filterRating, filterSort, filterVerified]),
    hasReviewFilters = filterRating !== "all" || filterVerified;
  return $
    ? e.createElement(
        "div",
        {
          className:
            "min-h-screen mhub-premium-page flex items-center justify-center bg-gray-50 dark:bg-gray-950",
        },
        e.createElement(
          "div",
          { className: "w-full max-w-md px-4 page-shell page-pad" },
          e.createElement(Z, {
            marker: "loading",
            className: "mhub-premium-surface",
            title: "Loading reviews",
            description: "Fetching rating history for this user.",
          }),
        ),
      )
    : C
      ? e.createElement(
          "div",
          {
            className:
              "min-h-screen mhub-premium-page bg-gray-50 flex items-center justify-center p-4 dark:bg-gray-950",
          },
          e.createElement(
            "div",
            { className: "max-w-md w-full page-shell page-pad" },
            e.createElement(Y, {
              marker: "error",
              className: "border-red-200 bg-red-50 dark:border-red-600/40 dark:bg-red-950/20",
              title: "Reviews unavailable",
              description: C,
              onRetry: m,
              secondaryAction: e.createElement(
                u,
                { variant: "outline", onClick: () => navigateBack(g) },
                e.createElement(T, { className: "w-4 h-4 mr-2" }),
                " Go back",
              ),
            }),
          ),
        )
      : e.createElement(
          "div",
          { className: "min-h-screen mhub-premium-page nav-clearance bg-gray-50 dark:bg-gray-950" },
          e.createElement(
            "div",
            {
              className:
                "bg-gradient-to-r from-blue-600 to-indigo-700 pt-8 pb-16 px-4 dark:bg-gradient-to-r",
            },
            e.createElement(
              "div",
              { className: "max-w-[640px] mx-auto" },
              e.createElement(
                u,
                {
                  variant: "ghost",
                  className:
                    "text-white mb-4 pl-0 hover:text-blue-100 hover:bg-white/10 dark:text-white dark:hover:text-blue-200 dark:hover:bg-slate-900/10",
                  onClick: () => navigateBack(g),
                },
                e.createElement(T, { className: "w-5 h-5 mr-2" }),
                " Back",
              ),
              e.createElement(
                "div",
                { className: "flex flex-wrap items-center gap-6" },
                e.createElement(
                  "div",
                  { className: "bg-white/10 p-4 rounded-2xl backdrop-blur-sm dark:bg-slate-900/10" },
                  e.createElement(o, {
                    className: "w-12 h-12 text-yellow-400 fill-yellow-400 dark:text-yellow-200",
                  }),
                ),
                e.createElement(
                  "div",
                  { className: "min-w-0" },
                  e.createElement(
                    "h1",
                    {
                      className: "text-xl sm:text-3xl font-bold text-white mb-2 truncate dark:text-white",
                      title: "User Reviews",
                    },
                    "User Reviews",
                  ),
                  e.createElement(
                    "p",
                    { className: "text-blue-100 text-lg break-words dark:text-blue-200" },
                    "See what buyers and sellers say about this user.",
                  ),
                ),
              ),
            ),
          ),
          e.createElement(
            "div",
            { className: "max-w-[640px] mx-auto px-4 mt-8 -translate-y-8 page-shell page-pad" },
            e.createElement(
              "div",
              { className: "grid grid-cols-1 md:grid-cols-3 gap-6" },
              e.createElement(
                h,
                { className: "md:col-span-1 shadow-xl border-0 h-fit dark:border-0" },
                e.createElement(
                  D,
                  null,
                  e.createElement(M, null, "Rating Overview"),
                ),
                e.createElement(
                  y,
                  { className: "text-center" },
                  e.createElement(
                    "div",
                    {
                      className:
                        "text-5xl font-bold text-gray-800 dark:text-white mb-2 dark:text-gray-100",
                    },
                    s?.averageRating || "0.0",
                  ),
                  e.createElement(
                    "div",
                    { className: "flex justify-center gap-1 mb-2" },
                    [1, 2, 3, 4, 5].map((r) =>
                      e.createElement(o, {
                        key: r,
                        className: `w-5 h-5 ${r <= Math.round(s?.averageRating || 0) ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`,
                      }),
                    ),
                  ),
                  e.createElement(
                    "p",
                    { className: "text-gray-500 mb-6 dark:text-gray-300" },
                    s?.totalReviews || 0,
                    " total reviews",
                  ),
                  e.createElement(
                    "div",
                    { className: "space-y-2" },
                    [5, 4, 3, 2, 1].map((r) =>
                      e.createElement(
                        "div",
                        {
                          key: r,
                          className: "flex items-center gap-2 text-sm",
                        },
                        e.createElement("span", { className: "w-3" }, r),
                        e.createElement(o, {
                          className: "w-4 h-4 text-gray-400 dark:text-gray-300",
                        }),
                        e.createElement(
                          "div",
                          {
                            className:
                              "flex-1 h-2 bg-gray-100 rounded-full overflow-hidden dark:bg-gray-950",
                          },
                          e.createElement("div", {
                            className: "h-full bg-yellow-400 rounded-full dark:bg-yellow-800/30",
                            style: {
                              width: `${s?.totalReviews ? ((P?.[r] || 0) / s.totalReviews) * 100 : 0}%`,
                            },
                          }),
                        ),
                        e.createElement(
                          "span",
                          { className: "w-6 text-right text-gray-400 dark:text-gray-300" },
                          P?.[r] || 0,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              e.createElement(
                "div",
                { className: "md:col-span-2 space-y-6" },
                !_ &&
                  e.createElement(
                    h,
                    { className: "shadow-md border-0 dark:border-0" },
                    e.createElement(
                      y,
                      { className: "p-6" },
                      e.createElement(
                        "h3",
                        { className: "text-lg font-semibold mb-4" },
                        "Write a Review",
                      ),
                      !B &&
                        e.createElement(
                          "div",
                          {
                            className:
                              "mb-4 p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-sm dark:border-amber-600/40 dark:bg-amber-950/20 dark:text-amber-200",
                          },
                          "Log in to submit your review.",
                        ),
                      e.createElement(
                        "div",
                        { className: "flex gap-2 mb-4" },
                        [1, 2, 3, 4, 5].map((r) =>
                          e.createElement(
                            "button",
                            {
                              key: r,
                              onClick: () => f((t) => ({ ...t, rating: r })),
                              className:
                                "focus:outline-none transition-transform hover:scale-110",
                              "aria-label": `Rate ${r} stars`,
                            },
                            e.createElement(o, {
                              className: `w-8 h-8 ${r <= l.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`,
                            }),
                          ),
                        ),
                      ),
                      e.createElement(G, {
                        placeholder:
                          "Share your experience dealing with this user...",
                        value: l.comment,
                        onChange: (r) =>
                          f((t) => ({ ...t, comment: r.target.value })),
                        className: "mb-4",
                      }),
                      e.createElement(
                        u,
                        {
                          onClick: E,
                          disabled: S,
                          className: "w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-700/40 dark:hover:bg-blue-700/40",
                        },
                        S ? "Submitting..." : "Post Review",
                      ),
                    ),
                  ),
                e.createElement(
                  h,
                  { className: "shadow-sm border-0 dark:border-0" },
                  e.createElement(
                    y,
                    { className: "p-4 space-y-3" },
                    e.createElement(
                      "div",
                      { className: "flex flex-wrap items-center gap-2" },
                      e.createElement(
                        "span",
                        {
                          className:
                            "text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300",
                        },
                        "Filters",
                      ),
                      ["all", 5, 4, 3, 2, 1].map((r) =>
                        e.createElement(
                          u,
                          {
                            key: r,
                            size: "sm",
                            variant:
                              filterRating === String(r)
                                ? "default"
                                : "outline",
                            onClick: () => setFilterRating(String(r)),
                          },
                          r === "all" ? "All" : `${r} stars`,
                        ),
                      ),
                    ),
                    e.createElement(
                      "div",
                      { className: "flex flex-wrap items-center gap-3" },
                      e.createElement(
                        "label",
                        { className: "text-xs font-semibold text-gray-500 dark:text-gray-300" },
                        "Sort by",
                        e.createElement(
                          "select",
                          {
                            value: filterSort,
                            onChange: (r) => setFilterSort(r.target.value),
                            className:
                              "ml-2 h-9 rounded-lg border border-gray-200 px-2 text-sm dark:border-gray-700",
                          },
                          e.createElement(
                            "option",
                            { value: "recent" },
                            "Most recent",
                          ),
                          e.createElement(
                            "option",
                            { value: "highest" },
                            "Highest rating",
                          ),
                          e.createElement(
                            "option",
                            { value: "lowest" },
                            "Lowest rating",
                          ),
                          e.createElement(
                            "option",
                            { value: "helpful" },
                            "Most helpful",
                          ),
                        ),
                      ),
                      e.createElement(
                        u,
                        {
                          size: "sm",
                          variant: filterVerified ? "default" : "outline",
                          onClick: () => setFilterVerified((r) => !r),
                        },
                        "Verified only",
                      ),
                    ),
                  ),
                ),
                filteredReviews.length === 0
                  ? e.createElement(X, {
                      marker: "empty",
                      className:
                        "bg-gray-50 border-dashed border-2 border-gray-200 dark:bg-gray-950 dark:border-gray-700",
                      icon: J,
                      title: hasReviewFilters
                        ? "No reviews match these filters."
                        : "No reviews yet.",
                      description: hasReviewFilters
                        ? "Try adjusting the filters to see more reviews."
                        : _
                          ? "This user has no reviews yet."
                          : "Be the first to leave helpful feedback.",
                      action: null,
                    })
                  : filteredReviews.map((r) => {
                      const reviewIsVerified = isVerifiedReview(r);
                      const reviewIsRecent = isRecentReview(r);
                      const reviewIsHelpful = (r.helpful_count || 0) >= 3;
                      const sellerResponse =
                        r?.seller_response || r?.sellerResponse || "";
                      const responseValue =
                        responseDrafts?.[r.review_id] ?? sellerResponse ?? "";
                      const responseSaving = responseBusy?.[r.review_id];
                      return e.createElement(
                        h,
                        {
                          key: r.review_id,
                          className:
                            "shadow-sm hover:shadow-md transition-shadow",
                        },
                        e.createElement(
                          y,
                          { className: "p-6" },
                          e.createElement(
                            "div",
                            {
                              className:
                                "flex items-start justify-between mb-4",
                            },
                            e.createElement(
                              "div",
                              { className: "flex items-center gap-3" },
                              e.createElement(
                                q,
                                null,
                                e.createElement(
                                  W,
                                  null,
                                  e.createElement(K, { className: "w-4 h-4" }),
                                ),
                                r.reviewer_avatar &&
                                  e.createElement(z, {
                                    src: r.reviewer_avatar,
                                  }),
                              ),
                              e.createElement(
                                "div",
                                null,
                                e.createElement(
                                  "p",
                                  { className: "font-semibold" },
                                  r.reviewer_name || "Anonymous",
                                ),
                                e.createElement(
                                  "p",
                                  { className: "text-xs text-gray-500 dark:text-gray-300" },
                                  new Date(r.created_at).toLocaleDateString(),
                                ),
                              ),
                            ),
                            e.createElement(
                              "div",
                              { className: "flex" },
                              [1, 2, 3, 4, 5].map((t) =>
                                e.createElement(o, {
                                  key: t,
                                  className: `w-4 h-4 ${t <= r.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-200"}`,
                                }),
                              ),
                            ),
                          ),
                          e.createElement(
                            "div",
                            { className: "flex flex-wrap gap-2 mb-4" },
                            reviewIsVerified &&
                              e.createElement(
                                pe,
                                {
                                  className:
                                    "bg-emerald-100 text-emerald-700 border-0 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-0",
                                },
                                "Verified trade",
                              ),
                            reviewIsRecent &&
                              e.createElement(
                                pe,
                                {
                                  className:
                                    "bg-blue-100 text-blue-700 border-0 dark:bg-blue-950/20 dark:text-blue-300 dark:border-0",
                                },
                                "Recent",
                              ),
                            reviewIsHelpful &&
                              e.createElement(
                                pe,
                                {
                                  className:
                                    "bg-amber-100 text-amber-700 border-0 dark:bg-amber-950/20 dark:text-amber-300 dark:border-0",
                                },
                                "Helpful",
                              ),
                          ),
                          e.createElement(
                            "p",
                            {
                              className:
                                "text-gray-700 dark:text-gray-300 mb-4 leading-relaxed dark:text-gray-200",
                            },
                            r.comment,
                          ),
                          sellerResponse &&
                            e.createElement(
                              "div",
                              {
                                className:
                                  "mb-4 rounded-lg bg-slate-50 border border-slate-200 p-3 dark:bg-slate-900/40 dark:border-slate-700",
                              },
                              e.createElement(
                                "p",
                                {
                                  className:
                                    "text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300",
                                },
                                "Seller response",
                              ),
                              e.createElement(
                                "p",
                                {
                                  className:
                                    "mt-2 text-sm text-slate-700 dark:text-slate-200",
                                },
                                sellerResponse,
                              ),
                              r?.seller_response_at &&
                                e.createElement(
                                  "p",
                                  {
                                    className:
                                      "mt-2 text-xs text-slate-400 dark:text-slate-400",
                                  },
                                  `Responded ${new Date(
                                    r.seller_response_at,
                                  ).toLocaleDateString()}`,
                                ),
                            ),
                          _ &&
                            e.createElement(
                              "div",
                              {
                                className:
                                  "mb-4 rounded-xl border border-slate-200/80 bg-white p-3 dark:border-slate-700 dark:bg-slate-950/40",
                              },
                              e.createElement(
                                "div",
                                {
                                  className:
                                    "mb-2 flex items-center justify-between",
                                },
                                e.createElement(
                                  "p",
                                  {
                                    className:
                                      "text-sm font-semibold text-slate-700 dark:text-slate-200",
                                  },
                                  sellerResponse
                                    ? "Update your response"
                                    : "Respond to this review",
                                ),
                              ),
                              e.createElement(G, {
                                value: responseValue,
                                onChange: (t) =>
                                  setResponseDrafts((v) => ({
                                    ...v,
                                    [r.review_id]: t.target.value,
                                  })),
                                placeholder:
                                  "Share a helpful response (max 1000 characters)",
                                className:
                                  "min-h-[96px] text-sm dark:text-slate-100",
                              }),
                              e.createElement(
                                "div",
                                {
                                  className:
                                    "mt-2 flex items-center justify-between",
                                },
                                e.createElement(
                                  "p",
                                  {
                                    className:
                                      "text-xs text-slate-500 dark:text-slate-400",
                                  },
                                  `${responseValue.length}/1000`,
                                ),
                                e.createElement(
                                  u,
                                  {
                                    size: "sm",
                                    onClick: () =>
                                      addSellerResponse(r.review_id, responseValue),
                                    disabled:
                                      responseSaving ||
                                      !responseValue.trim(),
                                  },
                                  responseSaving
                                    ? "Saving..."
                                    : sellerResponse
                                      ? "Update response"
                                      : "Post response",
                                ),
                              ),
                            ),
                          e.createElement(
                            "div",
                            {
                              className:
                                "flex items-center gap-4 pt-4 border-t border-gray-100 dark:border-gray-700",
                            },
                            e.createElement(
                              u,
                              {
                                variant: "ghost",
                                size: "sm",
                                onClick: () => L(r.review_id),
                                className: "text-gray-500 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-300",
                              },
                              e.createElement(O, { className: "w-4 h-4 mr-2" }),
                              "Helpful (",
                              r.helpful_count || 0,
                              ")",
                            ),
                          ),
                        ),
                      );
                    }),
              ),
            ),
          ),
        );
};
var ve = R;
export { ve as default };


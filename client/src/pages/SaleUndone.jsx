import e, { useState as s, useEffect as T } from "react";
import {
  Card as b,
  CardContent as x,
  CardDescription as O,
  CardHeader as I,
  CardTitle as P,
} from "@/components/ui/card";
import { Button as p } from "@/components/ui/button";
import { Input as V } from "@/components/ui/input";
import { Label as v } from "@/components/ui/label";
import { Badge as l } from "@/components/ui/badge";
import {
  RotateCcw as B,
  Shield as G,
  Clock as J,
  XCircle as u,
  RefreshCw as h,
  Package as f,
  ArrowUp as X,
  HelpCircle as K,
  CheckCircle as Q,
} from "lucide-react";
import { useNavigate as Z } from "react-router-dom";
import { useToast as R } from "@/hooks/use-toast";
import { useTranslation as ee } from "react-i18next";
import te from "../components/PageHeader";
import { buildApiPath as re } from "@/lib/networkConfig";
import { getAccessToken as se } from "@/utils/authStorage";
import oe from "../components/TransactionStepper";
const ae = () => {
  const { t } = ee(),
    { toast: c } = R(),
    L = Z(),
    [j, A] = s(!1),
    [n, d] = s({ postId: "", reason: "", description: "" }),
    [y, w] = s(!1),
    [F, N] = s(!1),
    [k, U] = s([]),
    [D, _] = s(!0),
    [C, m] = s(""),
    [H, z] = s(0),
    E = [
      { key: "listed", label: "Listed", hint: "Post was active previously" },
      { key: "sold", label: "Marked Sold", hint: "Sale was recorded" },
      { key: "issue", label: "Issue Found", hint: "Deal did not complete" },
      {
        key: "undo",
        label: "Undo Request",
        hint: "Reason and notes submitted",
      },
      {
        key: "reactivated",
        label: "Reactivated",
        hint: "Listing returns to market",
      },
    ],
    S = re("/transactions/undone"),
    $ = (r, o, a = 0) => {
      const i = String(r || "").toLowerCase();
      if (a === 401 || i.includes("unauthorized") || i.includes("token") || i.includes("login")) {
        return "Please sign in again and retry this action.";
      }
      if (a === 403 || i.includes("only reactivate your own")) {
        return "You can reactivate only your own sold posts. Check the Post ID and login account.";
      }
      if (a === 404 || i.includes("not found")) {
        return "We could not find that listing. Verify the Post ID from My Home and try again.";
      }
      if (a === 400 && i.includes("already active")) {
        return "This post is already active.";
      }
      if (i.includes("network") || i.includes("timeout") || i.includes("fetch")) {
        return "The service is temporarily unavailable. Please try again in a moment.";
      }
      return o;
    };
  const Y = () => se() || localStorage.getItem("authToken") || localStorage.getItem("token"),
    ce = (r) => {
      const o = String(r || "").trim();
      if (!o) return "";
      const a = o.replace(/^\s*(?:post\s*)?id[:\s-]*/i, "").trim(),
        i = a.match(/^[A-Za-z0-9_-]+/);
      return i ? i[0] : "";
    },
    le = async (r) => {
      const o = [S, re("/posts/undone")];
      let a = null;
      for (const i of o)
        try {
          const g = await fetch(i, {
            headers: {
              Authorization: `Bearer ${r}`,
              "Content-Type": "application/json",
            },
            credentials: "include",
          });
          if (g.ok) {
            const t = await g.json();
            return Array.isArray(t) ? t : [];
          }
          if ((a = new Error("Failed to load reactivation history."), a.status = Number(g.status || 0), g.status !== 404 && g.status !== 405)) throw a;
        } catch (g) {
          if (a = g, !(Number(g?.status || 0) === 404 || Number(g?.status || 0) === 405)) throw g;
        }
      throw a || new Error("Failed to load reactivation history.");
    };
  T(() => {
    const r = () => {
      A(window.scrollY > 300);
    };
    return (
      window.addEventListener("scroll", r),
      () => window.removeEventListener("scroll", r)
    );
  }, []);
  const q = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  T(() => {
    (async () => {
      try {
        m("");
        const o = Y();
        if (!o) {
          (m("Login required to load reactivation history."), _(!1));
          return;
        }
        const a = await le(o);
        U(a);
      } catch (o) {
        (console.error("Failed to fetch undone posts:", o),
          m(o.message || "Failed to load reactivation history."));
      } finally {
        _(!1);
      }
    })();
  }, [H]);
  const M = async (r) => {
      const o = Y(),
        a = ce(n.postId);
      if ((r.preventDefault(), !a)) {
        c({
          title: "Post ID Required",
          description: "Enter the listing Post ID to continue.",
          variant: "destructive",
        });
        return;
      }
      if (!o) {
        c({
          title: "Login required",
          description: "Please login again to reactivate posts.",
          variant: "destructive",
        });
        L("/login", { state: { returnTo: "/saleundone" } });
        return;
      }
      w(!0);
      try {
        const i = [
          {
            url: re(`/posts/${encodeURIComponent(a)}/reactivate`),
            method: "POST",
            body: {
              reason: n.reason,
              description: n.description,
            },
          },
          {
            url: re(`/posts/${encodeURIComponent(a)}/status`),
            method: "PATCH",
            body: {
              status: "active",
              reason: n.reason,
              description: n.description,
            },
          },
        ];
        let g = null;
        for (const t of i) {
          const E = await fetch(t.url, {
            method: t.method,
            headers: {
              Authorization: `Bearer ${o}`,
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify(t.body),
          });
          if (E.ok) {
            g = E;
            break;
          }
          const I = await E.json().catch(() => ({}));
          if (E.status === 404 || E.status === 405) continue;
          const P = new Error(I.error || I.message || "Failed to update post status");
          P.status = Number(E.status || 0);
          throw P;
        }
        if (!g) throw new Error("Failed to update post status");
        if (g.ok)
          (N(!0),
            c({
              title: "\u2705 Post Reactivated",
              description: "Your post is now available for sale again",
            }));
      } catch (i) {
        (console.error("Sale undone error:", i),
          c({
            title: "Action Failed",
            description: $(
              i.message,
              "We couldn't reactivate this post. Please retry shortly.",
              i.status,
            ),
            variant: "destructive",
          }));
      } finally {
        w(!1);
      }
    },
    W = () => {
      (d({ postId: "", reason: "", description: "" }), N(!1));
    };
  return F
    ? e.createElement(
        "div",
        {
          className:
            "min-h-screen bg-gradient-to-br from-orange-400 via-red-500 to-pink-600 relative overflow-hidden",
        },
        e.createElement(
          "div",
          { className: "absolute inset-0 overflow-hidden" },
          e.createElement("div", {
            className:
              "absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse",
          }),
          e.createElement("div", {
            className:
              "absolute -bottom-40 -left-40 w-80 h-80 bg-yellow-300/20 rounded-full blur-3xl animate-pulse delay-1000",
          }),
        ),
        e.createElement(
          "div",
          { className: "relative max-w-2xl mx-auto p-6 pt-20" },
          e.createElement(
            b,
            {
              className:
                "shadow-2xl border-0 rounded-3xl overflow-hidden backdrop-blur-xl bg-white/95 dark:bg-gray-800/95",
            },
            e.createElement(
              x,
              { className: "p-12 text-center" },
              e.createElement(
                "div",
                { className: "relative inline-block mb-8" },
                e.createElement("div", {
                  className:
                    "absolute inset-0 bg-orange-400 rounded-full animate-ping opacity-25",
                }),
                e.createElement(
                  "div",
                  {
                    className:
                      "relative w-32 h-32 mx-auto bg-gradient-to-br from-orange-400 to-red-600 rounded-full flex items-center justify-center shadow-2xl",
                  },
                  e.createElement(h, { className: "w-16 h-16 text-white" }),
                ),
              ),
              e.createElement(
                "h2",
                {
                  className:
                    "text-4xl font-black bg-gradient-to-r from-orange-600 to-red-700 bg-clip-text text-transparent mb-4",
                },
                "\u{1F504} Post Reactivated!",
              ),
              e.createElement(
                "p",
                { className: "text-gray-600 text-xl mb-8 max-w-md mx-auto" },
                "Your post is now active and visible to potential buyers again.",
              ),
              e.createElement(
                "div",
                {
                  className:
                    "bg-gradient-to-r from-orange-50 to-red-50 rounded-2xl p-6 mb-8 border border-orange-200",
                },
                e.createElement(
                  "div",
                  { className: "flex items-center justify-center gap-6" },
                  e.createElement(
                    "div",
                    { className: "text-center" },
                    e.createElement(f, {
                      className: "w-8 h-8 text-orange-500 mx-auto mb-2",
                    }),
                    e.createElement(
                      "p",
                      { className: "text-lg font-bold text-orange-700" },
                      "Active",
                    ),
                    e.createElement(
                      "p",
                      { className: "text-sm text-gray-500" },
                      "Post Status",
                    ),
                  ),
                  e.createElement("div", {
                    className: "w-px h-16 bg-orange-200",
                  }),
                  e.createElement(
                    "div",
                    { className: "text-center" },
                    e.createElement(Q, {
                      className: "w-8 h-8 text-green-500 mx-auto mb-2",
                    }),
                    e.createElement(
                      "p",
                      { className: "text-lg font-bold text-green-700" },
                      "Visible",
                    ),
                    e.createElement(
                      "p",
                      { className: "text-sm text-gray-500" },
                      "To Buyers",
                    ),
                  ),
                ),
              ),
              e.createElement(
                "div",
                { className: "flex flex-col sm:flex-row gap-4 justify-center" },
                e.createElement(
                  p,
                  {
                    variant: "outline",
                    onClick: W,
                    className:
                      "border-2 border-orange-500 text-orange-600 hover:bg-orange-50 rounded-xl px-8 py-3 font-semibold",
                  },
                  "Reactivate Another",
                ),
                e.createElement(
                  p,
                  {
                    className:
                      "bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 rounded-xl px-8 py-3 font-semibold shadow-lg",
                    onClick: () => L("/my-home"),
                  },
                  "Go to My Home",
                ),
              ),
            ),
          ),
        ),
      )
    : e.createElement(
        "div",
        {
          className:
            "bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 dark:from-slate-900 dark:via-orange-900 dark:to-red-900 relative",
          style: { minHeight: "100vh", paddingBottom: "120px" },
        },
        e.createElement(
          "div",
          { className: "absolute inset-0" },
          e.createElement("div", {
            className:
              "absolute top-20 left-10 w-72 h-72 bg-orange-500/10 dark:bg-orange-500/20 rounded-full blur-3xl animate-pulse",
          }),
          e.createElement("div", {
            className:
              "absolute bottom-20 right-10 w-96 h-96 bg-red-500/10 dark:bg-red-500/20 rounded-full blur-3xl animate-pulse delay-1000",
          }),
          e.createElement("div", {
            className:
              "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-pink-500/5 dark:bg-pink-500/10 rounded-full blur-3xl",
          }),
        ),
        e.createElement(te, {
          transparent: !0,
          backTo: "/profile",
          className: "text-white",
          title: "",
        }),
        e.createElement(
          "div",
          { className: "relative max-w-lg mx-auto p-4 sm:p-6 space-y-6" },
          e.createElement(
            "div",
            { className: "text-center pt-4" },
            e.createElement(
              "div",
              {
                className:
                  "inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-400 to-red-600 shadow-2xl shadow-orange-500/30 mb-6",
              },
              e.createElement(B, { className: "w-10 h-10 text-white" }),
            ),
            e.createElement(
              "h1",
              {
                className:
                  "text-4xl sm:text-5xl font-black text-gray-900 dark:text-white mb-3",
              },
              "\u{1F504} ",
              e.createElement(
                "span",
                {
                  className:
                    "bg-gradient-to-r from-orange-600 to-red-600 dark:from-orange-400 dark:to-red-400 bg-clip-text text-transparent",
                },
                t("sale_undone_title"),
              ),
            ),
            e.createElement(
              "p",
              {
                className:
                  "text-orange-700 dark:text-orange-200 text-lg max-w-md mx-auto",
              },
              t("reactivate_sold_posts"),
            ),
          ),
          e.createElement(oe, { steps: E, currentStep: 3 }),
          e.createElement(
            "div",
            { className: "flex flex-wrap justify-center gap-3" },
            e.createElement(
              l,
              {
                className:
                  "bg-orange-500/10 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/20 dark:border-orange-500/30 px-4 py-2 rounded-full backdrop-blur-sm",
              },
              e.createElement(h, { className: "w-4 h-4 mr-2" }),
              " ",
              t("instant_reactivation"),
            ),
            e.createElement(
              l,
              {
                className:
                  "bg-yellow-500/10 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/20 dark:border-yellow-500/30 px-4 py-2 rounded-full backdrop-blur-sm",
              },
              e.createElement(G, { className: "w-4 h-4 mr-2" }),
              " ",
              t("no_penalties"),
            ),
            e.createElement(
              l,
              {
                className:
                  "bg-pink-500/10 dark:bg-pink-500/20 text-pink-700 dark:text-pink-300 border-pink-500/20 dark:border-pink-500/30 px-4 py-2 rounded-full backdrop-blur-sm",
              },
              e.createElement(f, { className: "w-4 h-4 mr-2" }),
              " ",
              t("keep_original_details"),
            ),
          ),
          e.createElement(
            b,
            {
              className:
                "shadow-2xl border-0 rounded-3xl overflow-hidden backdrop-blur-xl bg-white/95 dark:bg-gray-800/95",
            },
            e.createElement(
              I,
              {
                className:
                  "bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white p-8",
              },
              e.createElement(
                P,
                { className: "flex items-center space-x-3 text-2xl" },
                e.createElement(
                  "div",
                  {
                    className:
                      "w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm",
                  },
                  e.createElement(B, { className: "w-6 h-6" }),
                ),
                e.createElement("span", null, t("reactivate_your_post")),
              ),
              e.createElement(
                O,
                { className: "text-orange-100 text-base mt-2" },
                t("enter_post_id_to_reactivate"),
              ),
            ),
            e.createElement(
              x,
              { className: "p-8" },
              e.createElement(
                "div",
                {
                  className:
                    "bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/30 dark:to-red-900/30 border-2 border-orange-200 dark:border-orange-700 rounded-2xl p-6 mb-8",
                },
                e.createElement(
                  "div",
                  { className: "flex items-start space-x-4" },
                  e.createElement(
                    "div",
                    {
                      className:
                        "w-12 h-12 bg-orange-100 dark:bg-orange-800 rounded-xl flex items-center justify-center flex-shrink-0",
                    },
                    e.createElement(K, {
                      className: "w-6 h-6 text-orange-600 dark:text-orange-400",
                    }),
                  ),
                  e.createElement(
                    "div",
                    null,
                    e.createElement(
                      "p",
                      {
                        className:
                          "font-bold text-orange-800 dark:text-orange-300 text-lg mb-2",
                      },
                      t("when_to_use_sale_undone"),
                    ),
                    e.createElement(
                      "ul",
                      {
                        className:
                          "space-y-2 text-orange-700 dark:text-orange-400",
                      },
                      e.createElement(
                        "li",
                        { className: "flex items-center gap-2" },
                        e.createElement(u, { className: "w-4 h-4" }),
                        " ",
                        t("no_buyers_found_for_post"),
                      ),
                      e.createElement(
                        "li",
                        { className: "flex items-center gap-2" },
                        e.createElement(u, { className: "w-4 h-4" }),
                        " ",
                        t("buyer_not_interested_after_all"),
                      ),
                      e.createElement(
                        "li",
                        { className: "flex items-center gap-2" },
                        e.createElement(u, { className: "w-4 h-4" }),
                        " ",
                        t("deal_didnt_go_through"),
                      ),
                      e.createElement(
                        "li",
                        { className: "flex items-center gap-2" },
                        e.createElement(u, { className: "w-4 h-4" }),
                        " ",
                        t("want_to_relist_updated"),
                      ),
                    ),
                  ),
                ),
              ),
              e.createElement(
                "form",
                { onSubmit: M, className: "space-y-6" },
                e.createElement(
                  "div",
                  null,
                  e.createElement(
                    v,
                    {
                      htmlFor: "postId",
                      className:
                        "text-sm font-bold text-gray-700 dark:text-gray-200 mb-2 block",
                    },
                    t("post_id"),
                    " *",
                  ),
                  e.createElement(V, {
                    id: "postId",
                    value: n.postId,
                    onChange: (r) =>
                      d((o) => ({ ...o, postId: r.target.value })),
                    placeholder: t("post_id_placeholder"),
                    className:
                      "h-14 text-lg rounded-xl border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-orange-500 transition-colors",
                    required: !0,
                  }),
                  e.createElement(
                    "p",
                    {
                      className:
                        "text-sm text-gray-500 dark:text-gray-400 mt-2",
                    },
                    "\u{1F4A1} ",
                    t("post_id_hint"),
                  ),
                ),
                e.createElement(
                  "div",
                  null,
                  e.createElement(
                    v,
                    {
                      htmlFor: "reason",
                      className:
                        "text-sm font-bold text-gray-700 dark:text-gray-200 mb-2 block",
                    },
                    t("reason_for_undoing"),
                  ),
                  e.createElement(
                    "select",
                    {
                      id: "reason",
                      value: n.reason,
                      onChange: (r) =>
                        d((o) => ({ ...o, reason: r.target.value })),
                      className:
                        "w-full h-14 text-lg rounded-xl border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-orange-500 transition-colors px-4 bg-white",
                    },
                    e.createElement(
                      "option",
                      { value: "" },
                      t("select_reason_optional"),
                    ),
                    e.createElement(
                      "option",
                      { value: "no_buyers_found" },
                      t("no_buyers_found"),
                    ),
                    e.createElement(
                      "option",
                      { value: "buyer_not_interested" },
                      t("buyer_found_not_interested"),
                    ),
                    e.createElement(
                      "option",
                      { value: "buyer_changed_mind" },
                      t("buyer_changed_mind"),
                    ),
                    e.createElement(
                      "option",
                      { value: "price_too_high" },
                      t("price_too_high"),
                    ),
                    e.createElement(
                      "option",
                      { value: "item_condition_issue" },
                      t("item_condition_concerns"),
                    ),
                    e.createElement(
                      "option",
                      { value: "location_issue" },
                      t("location_not_convenient"),
                    ),
                    e.createElement(
                      "option",
                      { value: "communication_failed" },
                      t("communication_failed"),
                    ),
                    e.createElement(
                      "option",
                      { value: "payment_issue" },
                      t("payment_issue"),
                    ),
                    e.createElement(
                      "option",
                      { value: "want_to_relist" },
                      t("want_to_relist_new_details"),
                    ),
                    e.createElement("option", { value: "other" }, t("other")),
                  ),
                ),
                e.createElement(
                  "div",
                  null,
                  e.createElement(
                    v,
                    {
                      htmlFor: "description",
                      className:
                        "text-sm font-bold text-gray-700 dark:text-gray-200 mb-2 block",
                    },
                    t("additional_notes"),
                  ),
                  e.createElement("textarea", {
                    id: "description",
                    value: n.description,
                    onChange: (r) =>
                      d((o) => ({ ...o, description: r.target.value })),
                    placeholder: t("additional_notes_placeholder"),
                    className:
                      "w-full min-h-[100px] text-lg rounded-xl border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-orange-500 transition-colors px-4 py-3 resize-none",
                  }),
                ),
                e.createElement(
                  p,
                  {
                    type: "submit",
                    disabled: y,
                    className:
                      "w-full h-16 text-lg font-bold bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 rounded-2xl shadow-xl shadow-orange-500/30 transition-all hover:shadow-orange-500/50 hover:scale-[1.02]",
                  },
                  y
                    ? e.createElement(
                        "span",
                        { className: "flex items-center gap-3" },
                        e.createElement("div", {
                          className:
                            "w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin",
                        }),
                        t("reactivating"),
                      )
                    : e.createElement(
                        "span",
                        { className: "flex items-center gap-2" },
                        e.createElement(h, { className: "w-6 h-6" }),
                        t("reactivate_post"),
                      ),
                ),
              ),
            ),
          ),
          e.createElement(
            b,
            {
              className:
                "shadow-2xl border-0 rounded-3xl overflow-hidden backdrop-blur-xl bg-white/95 dark:bg-gray-800/95",
            },
            e.createElement(
              I,
              {
                className:
                  "bg-gradient-to-r from-purple-500 to-indigo-500 text-white p-6",
              },
              e.createElement(
                P,
                { className: "flex items-center space-x-3 text-xl" },
                e.createElement(J, { className: "w-6 h-6" }),
                e.createElement("span", null, t("previously_reactivated")),
              ),
            ),
            e.createElement(
              x,
              { className: "p-6" },
              D
                ? e.createElement(
                    "div",
                    { className: "text-center py-8" },
                    e.createElement("div", {
                      className:
                        "w-10 h-10 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mx-auto mb-4",
                    }),
                    e.createElement(
                      "p",
                      { className: "text-gray-500 dark:text-gray-400" },
                      t("loading_history"),
                    ),
                  )
                : C
                  ? e.createElement(
                      "div",
                      { className: "text-center py-8" },
                      e.createElement(
                        "p",
                        { className: "text-red-500 mb-3" },
                        C,
                      ),
                      e.createElement(
                        p,
                        {
                          type: "button",
                          variant: "outline",
                          onClick: () => z((r) => r + 1),
                        },
                        "Retry",
                      ),
                    )
                  : k.length === 0
                    ? e.createElement(
                        "div",
                        { className: "text-center py-12" },
                        e.createElement(
                          "div",
                          {
                            className:
                              "w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4",
                          },
                          e.createElement(f, {
                            className: "w-8 h-8 text-gray-400",
                          }),
                        ),
                        e.createElement(
                          "p",
                          {
                            className:
                              "text-gray-500 dark:text-gray-400 text-lg",
                          },
                          t("no_reactivated_posts"),
                        ),
                        e.createElement(
                          "p",
                          {
                            className:
                              "text-gray-400 dark:text-gray-500 text-sm mt-1",
                          },
                          t("posts_you_reactivate"),
                        ),
                      )
                    : e.createElement(
                        "div",
                        { className: "space-y-4" },
                        k.map((r) =>
                          e.createElement(
                            "div",
                            {
                              key: r.id || r.post_id,
                              className:
                                "bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-600/50 rounded-2xl p-5 border border-gray-200 dark:border-gray-600 hover:shadow-lg transition-all",
                            },
                            e.createElement(
                              "div",
                              {
                                className: "flex items-center justify-between",
                              },
                              e.createElement(
                                "div",
                                null,
                                e.createElement(
                                  l,
                                  {
                                    className:
                                      "bg-orange-100 text-orange-700 font-mono mb-2",
                                  },
                                  "ID: ",
                                  r.post_id || r.id,
                                ),
                                e.createElement(
                                  "h4",
                                  {
                                    className:
                                      "font-bold text-gray-900 dark:text-white",
                                  },
                                  r.title,
                                ),
                                e.createElement(
                                  "p",
                                  {
                                    className:
                                      "text-sm text-gray-500 dark:text-gray-400",
                                  },
                                  r.reason || "No reason specified",
                                ),
                              ),
                              e.createElement(
                                l,
                                { className: "bg-green-100 text-green-700" },
                                "Active",
                              ),
                            ),
                          ),
                        ),
                      ),
            ),
          ),
        ),
        j &&
          e.createElement(
            "button",
            {
              onClick: q,
              className:
                "fixed bottom-24 right-6 w-14 h-14 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-full shadow-2xl shadow-orange-500/40 flex items-center justify-center hover:scale-110 transition-all z-50 animate-bounce",
            },
            e.createElement(X, { className: "w-6 h-6" }),
          ),
      );
};
var ke = ae;
export { ke as default };

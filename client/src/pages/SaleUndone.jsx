import e, { useState as s, useEffect as T, useRef } from "react";
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
  ArrowLeft as Ae,
  HelpCircle as K,
  CheckCircle as Q,
} from "lucide-react";
import { useNavigate as Z } from "react-router-dom";
import { navigateBack as Ne } from "@/utils/navigation";
import { useToast as R } from "@/hooks/use-toast";
import { useTranslation as ee } from "react-i18next";
import { useCategoryMode } from "@/context/CategoryModeContext";
import {
  buildActiveAppMatcher,
  matchesCategoryModeItem,
} from "@/utils/categoryModeFilters";
import { buildApiPath as re } from "@/lib/networkConfig";
import { getAccessToken as se } from "@/utils/authStorage";
import oe from "../components/TransactionStepper";
import LanguageSelector from "@/components/LanguageSelector";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import W$ from "../lib/api";
import { useCmsPage } from "@/hooks/useCmsPage";
import { resolveMediaUrl } from "@/lib/mediaUrl";
const SaleUndonePage = () => {
  const { t } = ee(),
    tr = (r, o, a = {}) => t(r, { defaultValue: o, ...a }),
    { toast: c } = R(),
    L = Z(),
    {
      activeCategory: categoryModeCategory,
      activeApp,
      hasSelection: hasCategoryMode,
      categories: categoryModeCategories,
    } = useCategoryMode(),
    { data: cmsContent } = useCmsPage("sale-undone"),
    [j, A] = s(!1),
    [n, d] = s({ postId: "", reason: "", description: "" }),
    [y, w] = s(!1),
    [F, N] = s(!1),
    [k, U] = s([]),
    [D, _] = s(!0),
    [C, m] = s(null),
    [H, z] = s(0),
    [validationErrors, setValidationErrors] = s({
      postId: "",
      description: "",
    }),
    [confirmOpen, setConfirmOpen] = s(!1),
    [pendingSubmission, setPendingSubmission] = s(null),
    submitAbortRef = useRef(null),
    historyAbortRef = useRef(null),
    reactivationEndpointRef = useRef(null),
    reactivationEndpointBlacklistRef = useRef(new Set()),
    E = [
      {
        key: "listed",
        label: tr("sale_undone_step_listed", "Listed"),
        hint: tr("sale_undone_step_listed_hint", "Post was active previously"),
      },
      {
        key: "sold",
        label: tr("sale_undone_step_sold", "Marked Sold"),
        hint: tr("sale_undone_step_sold_hint", "Sale was recorded"),
      },
      {
        key: "issue",
        label: tr("sale_undone_step_issue", "Issue Found"),
        hint: tr("sale_undone_step_issue_hint", "Deal did not complete"),
      },
      {
        key: "undo",
        label: tr("sale_undone_step_request", "Undo Request"),
        hint: tr("sale_undone_step_request_hint", "Reason and notes submitted"),
      },
      {
        key: "reactivated",
        label: tr("sale_undone_step_reactivated", "Reactivated"),
        hint: tr("sale_undone_step_reactivated_hint", "Listing returns to market"),
      },
    ],
    categoryModeCategoryId = (() => {
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
    })(),
    S = re("/transactions/undone"),
    $ = (r, o, a = 0) => {
      const i = String(r || "").toLowerCase();
      if (
        a === 401 ||
        i.includes("unauthorized") ||
        i.includes("token") ||
        i.includes("login")
      ) {
        return tr(
          "please_sign_in_again",
          "Please sign in again and retry this action.",
        );
      }
      if (a === 403 || i.includes("only reactivate your own")) {
        return tr(
          "sale_undone_not_owner",
          "You can reactivate only your own sold posts. Check the Post ID and login account.",
        );
      }
      if (a === 404 || i.includes("not found")) {
        return tr(
          "sale_undone_not_found",
          "We could not find that listing. Verify the Post ID from My Home and try again.",
        );
      }
      if (a === 400 && i.includes("already active")) {
        return tr(
          "sale_undone_already_active",
          "This post is already active.",
        );
      }
      if (
        i.includes("network") ||
        i.includes("timeout") ||
        i.includes("fetch")
      ) {
        return tr(
          "service_temporarily_unavailable",
          "The service is temporarily unavailable. Please try again in a moment.",
        );
      }
      return o;
    };
  const stepOverrides = Array.isArray(cmsContent?.steps)
    ? cmsContent.steps
    : Array.isArray(cmsContent?.saleUndoneSteps)
      ? cmsContent.saleUndoneSteps
      : null;
  const steps =
    stepOverrides && stepOverrides.length
      ? stepOverrides.map((step, index) => ({
          key: step?.key || `step_${index + 1}`,
          label: tr(
            step?.labelKey || step?.key || `sale_undone_step_${index + 1}`,
            step?.label || step?.title || "",
          ),
          hint: tr(
            step?.hintKey || step?.key || `sale_undone_step_${index + 1}_hint`,
            step?.hint || step?.description || "",
          ),
        }))
      : E;
  const Y = () =>
      se() ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("token"),
    ce = (r) => {
      const o = String(r || "").trim();
      if (!o) return "";
      const a = o.replace(/^\s*(?:post\s*)?id[:\s-]*/i, "").trim(),
        i = a.trim();
      if (!i) return "";
      if (!/^[A-Za-z0-9_-]+$/.test(i)) return "";
      return i;
    },
    validateForm = (r) => {
      const o = {
          postId: "",
          description: "",
        },
        a = ce(r?.postId);
      a ||
        (o.postId = tr(
          "post_id_invalid",
          "Enter a valid Post ID (letters, numbers, dashes only).",
        ));
      String(r?.reason || "").toLowerCase() === "other" &&
        !String(r?.description || "").trim() &&
        (o.description = tr(
          "sale_undone_description_required",
          "Please add a short note for this reason.",
        ));
      return { errors: o, cleanedPostId: a };
    },
    updateField = (r, o) => {
      d((a) => {
        const i = { ...a, [r]: o },
          { errors: g } = validateForm(i);
        setValidationErrors(g);
        return i;
      });
    },
    formatCurrency = (r) => {
      if (r == null || r === "") return "";
      const o = Number(r);
      if (!Number.isFinite(o)) return String(r);
      return `INR ${o.toLocaleString()}`;
    },
    formatHistoryDate = (r) => {
      if (!r) return tr("not_available", "Not available");
      const o = new Date(r);
      if (Number.isNaN(o.getTime())) return tr("not_available", "Not available");
      return o.toLocaleString();
    },
    resolveHistoryImage = (r) => {
      if (!r) return "/placeholder.svg";
      const o = r.image_url || r.imageUrl || r.thumbnail || r.image;
      if (typeof o == "string" && o.trim()) {
        return resolveMediaUrl(o, "/placeholder.svg");
      }
      const a = r.images;
      if (Array.isArray(a) && a.length) {
        return resolveMediaUrl(a[0], "/placeholder.svg");
      }
      if (typeof a == "string" && a.trim())
        try {
          const i = JSON.parse(a);
          return Array.isArray(i) && i.length
            ? resolveMediaUrl(i[0], "/placeholder.svg")
            : resolveMediaUrl(a, "/placeholder.svg");
        } catch {
          return resolveMediaUrl(a, "/placeholder.svg");
        }
      return "/placeholder.svg";
    },
    le = async (r, o = {}) => {
      const categoryParams = categoryModeCategoryId
        ? { category_id: categoryModeCategoryId }
        : {};
      const endpoints = ["/transactions/undone", "/posts/undone"];
      let a = null;
      for (const endpoint of endpoints)
        try {
          const g = await W$.get(endpoint, {
            params: categoryParams,
            signal: o?.signal,
          });
          const t = g?.data ?? g;
          return Array.isArray(t) ? t : [];
        } catch (g) {
          const status = Number(g?.response?.status || g?.status || 0);
          if (status === 404 || status === 405) {
            a = g;
            continue;
          }
          const fallback = "Failed to load reactivation history.";
          a = new Error(fallback);
          a.key = "reactivation_history_load_failed";
          a.fallback = fallback;
          a.status = status;
          throw a;
        }
      if (!a) {
        const fallback = "Failed to load reactivation history.";
        a = new Error(fallback);
        a.key = "reactivation_history_load_failed";
        a.fallback = fallback;
      }
      throw a;
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
  T(() => {
    return () => {
      submitAbortRef.current && submitAbortRef.current.abort();
      historyAbortRef.current && historyAbortRef.current.abort();
    };
  }, []);
  const q = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const displayHistory =
    hasCategoryMode && categoryModeCategory?.name
      ? k.filter((r) => {
          const id =
            r?.category_id ??
            r?.categoryId ??
            r?.category?.category_id ??
            r?.category?.id ??
            null;
          if (categoryModeCategoryId && id) {
            return String(categoryModeCategoryId) === String(id);
          }
          const rawCategory =
            typeof r?.category === "object"
              ? r?.category?.name ||
                r?.category?.title ||
                r?.category?.label
              : r?.category;
          const name = String(
            rawCategory ||
              r?.category_name ||
              r?.categoryName ||
              r?.category_title ||
              r?.categoryTitle ||
              "",
          )
            .trim()
            .toLowerCase();
          if (!name) return false;
          return (
            name ===
            String(categoryModeCategory.name).trim().toLowerCase()
          );
        })
      : (() => {
          const activeAppMatcher = buildActiveAppMatcher(
            activeApp,
            categoryModeCategories,
          );
          if (!activeAppMatcher?.activeApp) return k;
          return k.filter((r) =>
            matchesCategoryModeItem(r, { activeAppMatcher }),
          );
        })();
  const historyErrorMessage = C
    ? typeof C === "string"
      ? C
      : C.key
        ? tr(C.key, C.fallback)
        : C.message || C.fallback || ""
    : "";
  T(() => {
    const r = new AbortController();
    historyAbortRef.current && historyAbortRef.current.abort();
    historyAbortRef.current = r;
    (async () => {
      try {
        _(!0);
        m(null);
        const o = Y();
        if (!o) {
          m({
            key: "login_required_to_load_history",
            fallback: "Login required to load reactivation history.",
            status: 401,
          }),
            _(!1);
          return;
        }
        const a = await le(o, { signal: r.signal });
        U(a);
      } catch (o) {
        if (
          o?.name === "AbortError" ||
          o?.name === "CanceledError" ||
          o?.code === "ERR_CANCELED"
        )
          return;
        console.error("Failed to fetch undone posts:", o),
          m(
            o || {
              key: "reactivation_history_load_failed",
              fallback: "Failed to load reactivation history.",
            },
          );
      } finally {
        historyAbortRef.current === r && (historyAbortRef.current = null);
        _(!1);
      }
    })();
    return () => {
      r.abort();
    };
  }, [H, categoryModeCategoryId]);
  const M = (r) => {
      r.preventDefault();
      const { errors: o, cleanedPostId: a } = validateForm(n);
      setValidationErrors(o);
      if (o.postId || o.description) {
        o.postId &&
          c({
            title: tr("post_id_required_title", "Post ID Required"),
            description: o.postId,
            variant: "destructive",
          });
        return;
      }
      const i = Y();
      if (!i) {
        c({
          title: tr("login_required_title", "Login required"),
          description: tr(
            "login_required_reactivate_desc",
            "Please login again to reactivate posts.",
          ),
          variant: "destructive",
        });
        L("/login", { state: { returnTo: "/saleundone" } });
        return;
      }
      setPendingSubmission({
        postId: a,
        reason: n.reason,
        description: n.description,
      });
      setConfirmOpen(!0);
    },
    performSubmit = async () => {
      const o = pendingSubmission || {
          postId: ce(n.postId),
          reason: n.reason,
          description: n.description,
        },
        a = o?.postId;
      if (!a) {
        setConfirmOpen(!1);
        return;
      }
      const i = Y();
      if (!i) {
        setConfirmOpen(!1);
        c({
          title: tr("login_required_title", "Login required"),
          description: tr(
            "login_required_reactivate_desc",
            "Please login again to reactivate posts.",
          ),
          variant: "destructive",
        });
        L("/login", { state: { returnTo: "/saleundone" } });
        return;
      }
      setConfirmOpen(!1);
      submitAbortRef.current && submitAbortRef.current.abort();
      const g = new AbortController();
      submitAbortRef.current = g;
      w(!0);
      try {
        const t = [
          {
            url: `/posts/${encodeURIComponent(a)}/reactivate`,
            method: "post",
            body: {
              reason: o.reason,
              description: o.description,
            },
          },
          {
            url: `/posts/${encodeURIComponent(a)}/status`,
            method: "patch",
            body: {
              status: "active",
              reason: o.reason,
              description: o.description,
            },
          },
        ];
        let E = t;
        if (reactivationEndpointRef.current) {
          const P = t.find((he) => he.url === reactivationEndpointRef.current);
          const k = t.filter((he) => he.url !== reactivationEndpointRef.current);
          P && (E = [P, ...k]);
        }
        let payload = null;
        for (const P of E) {
          if (reactivationEndpointBlacklistRef.current?.has(P.url)) continue;
          try {
            const k = await W$[P.method](P.url, P.body, {
              signal: g.signal,
            });
            payload = k?.data ?? k;
            reactivationEndpointRef.current = P.url;
            break;
          } catch (err) {
            const status = Number(err?.response?.status || err?.status || 0);
            if (status === 404 || status === 405) {
              reactivationEndpointBlacklistRef.current?.add(P.url);
              continue;
            }
            const errData = err?.response?.data || {};
            const K = new Error(
              errData.error || errData.message || "Failed to update post status",
            );
            K.status = status;
            throw K;
          }
        }
        if (!payload) throw new Error("Failed to update post status");
        const status = String(
          payload?.status ||
            payload?.post_status ||
            payload?.postStatus ||
            payload?.post?.status ||
            payload?.data?.status ||
            "",
        ).toLowerCase();
        const responsePostId =
          payload?.post_id ||
          payload?.postId ||
          payload?.post?.post_id ||
          payload?.post?.id ||
          payload?.data?.post_id ||
          payload?.data?.postId ||
          null;
        const matchesPost =
          responsePostId != null
            ? String(responsePostId) === String(a)
            : !0;
        if (!matchesPost) {
          throw new Error("Post reactivation response mismatch.");
        }
        const successFlag = payload?.success === !0;
        const isActive = status === "active";
        if (status && !isActive) {
          throw new Error("Post reactivation could not be verified.");
        }
        if (!isActive && !successFlag) {
          throw new Error("Post reactivation could not be verified.");
        }
        N(!0),
          setPendingSubmission(null),
          c({
            title: tr("post_reactivated_title", "Post Reactivated!"),
            description: tr(
              "post_reactivated_desc",
              "Your post is now available for sale again",
            ),
          });
      } catch (t) {
        if (
          t?.name === "AbortError" ||
          t?.name === "CanceledError" ||
          t?.code === "ERR_CANCELED"
        )
          return;
        console.error("Sale undone error:", t),
          c({
            title: tr("action_failed", "Action Failed"),
            description: $(
              t.message,
              tr(
                "reactivation_failed_desc",
                "We couldn't reactivate this post. Please retry shortly.",
              ),
              t.status,
            ),
            variant: "destructive",
          });
      } finally {
        submitAbortRef.current === g && (submitAbortRef.current = null);
        w(!1);
      }
    },
    W = () => {
      d({ postId: "", reason: "", description: "" });
      setValidationErrors({ postId: "", description: "" });
      setPendingSubmission(null);
      setConfirmOpen(!1);
      N(!1);
    };
  return F
    ? e.createElement(
        "div",
        {
          className:
            "mhub-page-saleundone min-h-screen mhub-premium-page mhub-page-pad-bottom bg-gradient-to-br from-emerald-400 via-green-500 to-teal-600 relative overflow-hidden dark:bg-gradient-to-br",
        },
        e.createElement(
          "div",
          { className: "absolute inset-0 overflow-hidden" },
          e.createElement("div", {
            className:
              "absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse dark:bg-slate-900/10",
          }),
          e.createElement("div", {
            className:
              "absolute -bottom-40 -left-40 w-80 h-80 bg-yellow-300/20 rounded-full blur-3xl animate-pulse delay-1000 dark:bg-yellow-900/20",
          }),
        ),
        e.createElement(
          "div",
          { className: "relative max-w-2xl mx-auto p-6 pt-20" },
          e.createElement(
            b,
            {
              className:
                "mhub-premium-surface rounded-3xl overflow-hidden",
            },
            e.createElement(
              x,
              { className: "p-12 text-center dark:text-center" },
              e.createElement(
                "div",
                { className: "relative inline-block mb-8" },
                e.createElement("div", {
                  className:
                    "absolute inset-0 bg-orange-400 rounded-full animate-ping opacity-25 dark:bg-orange-800/30",
                }),
                e.createElement(
                  "div",
                  {
                    className:
                      "relative w-32 h-32 mx-auto bg-gradient-to-br from-emerald-400 to-green-600 rounded-full flex items-center justify-center shadow-2xl dark:bg-gradient-to-br",
                  },
                  e.createElement(h, { className: "w-16 h-16 text-white dark:text-white" }),
                ),
              ),
              e.createElement(
                "h2",
                {
                  className:
                    "text-4xl font-black bg-gradient-to-r from-emerald-600 to-green-700 bg-clip-text text-transparent mb-4 dark:bg-gradient-to-r dark:bg-clip-text dark:text-transparent",
                },
                "\uD83D\uDD04 ",
                tr("post_reactivated_title", "Post Reactivated!"),
              ),
              e.createElement(
                "p",
                { className: "text-gray-600 text-xl mb-8 max-w-md mx-auto dark:text-gray-200" },
                tr(
                  "post_reactivated_success_desc",
                  "Your post is now active and visible to potential buyers again.",
                ),
              ),
              e.createElement(
                "div",
                {
                  className:
                    "bg-gradient-to-r from-emerald-50 to-green-50 rounded-2xl p-6 mb-8 border border-emerald-200 dark:bg-gradient-to-r dark:border dark:border-emerald-600/40",
                },
                e.createElement(
                  "div",
                  { className: "flex items-center justify-center gap-6" },
                  e.createElement(
                    "div",
                    { className: "text-center dark:text-center" },
                    e.createElement(f, {
                      className: "w-8 h-8 text-orange-500 mx-auto mb-2 dark:text-orange-300",
                    }),
                    e.createElement(
                      "p",
                      { className: "text-lg font-bold text-emerald-700 dark:text-emerald-300" },
                      tr("active", "Active"),
                    ),
                    e.createElement(
                      "p",
                      { className: "text-sm text-gray-500 dark:text-gray-300" },
                      tr("post_status", "Post Status"),
                    ),
                  ),
                  e.createElement("div", {
                    className: "w-px h-16 bg-orange-200 dark:bg-orange-900/20",
                  }),
                  e.createElement(
                    "div",
                    { className: "text-center dark:text-center" },
                    e.createElement(Q, {
                      className: "w-8 h-8 text-green-500 mx-auto mb-2 dark:text-green-300",
                    }),
                    e.createElement(
                      "p",
                      { className: "text-lg font-bold text-green-700 dark:text-green-300" },
                      tr("visible", "Visible"),
                    ),
                    e.createElement(
                      "p",
                      { className: "text-sm text-gray-500 dark:text-gray-300" },
                      tr("to_buyers", "To Buyers"),
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
                        "border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 rounded-xl px-8 py-3 font-semibold dark:border-2 dark:border-emerald-500/40 dark:text-emerald-300 dark:hover:bg-emerald-950/20",
                    },
                    tr("reactivate_another", "Reactivate Another"),
                  ),
                  e.createElement(
                    p,
                    {
                      className:
                        "bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 rounded-xl px-8 py-3 font-semibold shadow-lg dark:bg-gradient-to-r",
                      onClick: () => L("/my-home"),
                    },
                    tr("go_to_my_home", "Go to My Home"),
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
            "mhub-page-saleundone min-h-screen mhub-premium-page mhub-page-pad-bottom bg-gradient-to-b from-slate-50 via-orange-50 to-white dark:from-slate-950 dark:via-orange-950/40 dark:to-slate-950 relative dark:bg-gradient-to-b",
          style: { minHeight: "100vh", paddingBottom: "120px" },
        },
        e.createElement(
          "div",
          { className: "absolute inset-0" },
          e.createElement("div", {
            className:
              "absolute top-20 left-10 w-72 h-72 bg-orange-500/10 dark:bg-orange-500/20 rounded-full blur-3xl animate-pulse dark:bg-orange-800/10",
          }),
          e.createElement("div", {
            className:
              "absolute bottom-20 right-10 w-96 h-96 bg-red-500/10 dark:bg-red-500/20 rounded-full blur-3xl animate-pulse delay-1000 dark:bg-red-800/10",
          }),
          e.createElement("div", {
            className:
              "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-pink-500/5 dark:bg-pink-500/10 rounded-full blur-3xl dark:bg-pink-800/5",
          }),
        ),
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
                "relative max-w-3xl mx-auto px-4 py-5 sm:px-6 sm:py-6 page-shell page-pad",
            },
            e.createElement(
              "div",
              {
                className:
                  "mb-2 max-w-3xl text-left dark:text-left mhub-hero-card min-h-[132px] sm:min-h-[150px] rounded-2xl px-4 py-4 sm:px-6 sm:py-5",
              },
              e.createElement(
                "div",
                { className: "flex flex-wrap items-center justify-between gap-4 min-h-[34px]" },
                e.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: () => Ne(L, "/profile"),
                    className:
                      "inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/20 px-3 py-1.5 text-xs font-semibold text-white shadow-[0_8px_18px_rgba(15,23,42,0.18)] hover:bg-white/30 transition",
                    "aria-label": tr("back", "Back"),
                  },
                  e.createElement(Ae, { className: "w-4 h-4" }),
                  tr("back", "Back"),
                ),
                e.createElement(LanguageSelector, {
                  compact: !0,
                  className: "shrink-0",
                }),
              ),
              e.createElement(
                "p",
                {
                  className:
                    "text-[clamp(9px,0.95vw,11px)] font-semibold uppercase tracking-[0.2em] text-white/70 mb-1 dark:text-white/70",
                },
                tr("sale_undone_label", "Sale tools"),
              ),
              e.createElement(
                "div",
                { className: "flex items-center gap-3" },
                e.createElement(
                  "div",
                  {
                    className:
                      "w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center dark:bg-slate-900/15",
                  },
                  e.createElement(B, { className: "w-5 h-5 text-white dark:text-white" }),
                ),
                e.createElement(
                  "h1",
                  {
                    className:
                      "text-[clamp(20px,2.1vw,28px)] leading-[1.1] font-bold text-white dark:text-white",
                  },
                  tr("sale_undone_title", "Sale Undone"),
                ),
              ),
              e.createElement(
                "p",
                {
                  className:
                    "text-[clamp(12px,1.3vw,16px)] leading-[1.5] text-white/80 mt-1 dark:text-white/80",
                },
                tr("reactivate_sold_posts", "Reactivate sold posts"),
              ),
            ),
          ),
        ),
        e.createElement(
          "div",
          {
            className:
              "relative max-w-3xl mx-auto px-4 pt-4 pb-10 sm:px-6 sm:pt-5 sm:pb-12 space-y-5",
          },
        hasCategoryMode &&
          categoryModeCategory?.name &&
            e.createElement(
              "div",
              {
                className:
                  "profile-panel rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3",
              },
            e.createElement(
              "div",
              null,
              e.createElement(
                "p",
                {
                  className:
                    "text-sm font-semibold text-slate-900 dark:text-white dark:text-slate-100",
                },
                tr("category_mode_label", "Category mode: {{category}}", {
                  category: categoryModeCategory.name,
                }),
              ),
              e.createElement(
                "p",
                { className: "text-xs text-slate-500 dark:text-slate-400 dark:text-slate-300" },
                tr(
                  "reactivation_filtered_category",
                  "Reactivation history is filtered to this category.",
                ),
              ),
            ),
            e.createElement(
              p,
              {
                type: "button",
                variant: "outline",
                className: "border-orange-200 text-orange-700 w-fit dark:border-orange-600/40 dark:text-orange-300",
                onClick: () => L("/category-mode"),
              },
              tr("switch_category", "Switch category"),
            ),
          ),
        e.createElement(
          "div",
          { className: "profile-panel rounded-2xl p-4 sm:p-5 space-y-4" },
          e.createElement(
            "div",
            null,
            e.createElement(
              "p",
              {
                className:
                  "text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400 mb-1 dark:text-slate-300",
              },
              tr("sale_undone_progress_label", "Reactivation progress"),
            ),
            e.createElement(
              "h2",
              {
                className:
                  "text-base sm:text-lg font-bold text-slate-900 dark:text-white dark:text-slate-100",
              },
              tr("sale_undone_progress_title", "Confirm and reactivate"),
            ),
          ),
          e.createElement(oe, { steps, currentStep: 3 }),
          e.createElement(
            "div",
            { className: "flex flex-wrap gap-3" },
            e.createElement(
              l,
              {
                className:
                  "bg-orange-500/10 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/20 dark:border-orange-500/30 px-4 py-2 rounded-full backdrop-blur-sm dark:bg-orange-800/10 dark:border-orange-500/20",
              },
              e.createElement(h, { className: "w-4 h-4 mr-2" }),
              " ",
              tr("instant_reactivation", "Instant reactivation"),
            ),
            e.createElement(
              l,
              {
                className:
                  "bg-yellow-500/10 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/20 dark:border-yellow-500/30 px-4 py-2 rounded-full backdrop-blur-sm dark:bg-yellow-800/10 dark:border-yellow-500/20",
              },
              e.createElement(G, { className: "w-4 h-4 mr-2" }),
              " ",
              t("no_penalties"),
            ),
            e.createElement(
              l,
              {
                className:
                  "bg-pink-500/10 dark:bg-pink-500/20 text-pink-700 dark:text-pink-300 border-pink-500/20 dark:border-pink-500/30 px-4 py-2 rounded-full backdrop-blur-sm dark:bg-pink-800/10 dark:border-pink-500/20",
              },
              e.createElement(f, { className: "w-4 h-4 mr-2" }),
              " ",
              t("keep_original_details"),
            ),
          ),
        ),
        e.createElement(
          b,
          {
            className:
              "profile-panel rounded-3xl overflow-hidden",
          },
            e.createElement(
              I,
              {
                className:
                  "bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white p-6 dark:bg-gradient-to-r dark:text-white",
              },
              e.createElement(
                P,
                { className: "flex items-center space-x-3 text-2xl" },
                e.createElement(
                  "div",
                  {
                    className:
                      "w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm dark:bg-slate-900/20",
                  },
                  e.createElement(B, { className: "w-6 h-6" }),
                ),
                e.createElement("span", null, t("reactivate_your_post")),
              ),
              e.createElement(
                O,
                { className: "text-orange-100 text-base mt-2 dark:text-orange-200" },
                t("enter_post_id_to_reactivate"),
              ),
            ),
            e.createElement(
              x,
              { className: "p-6" },
              e.createElement(
                "div",
                {
                  className:
                    "bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/30 dark:to-red-900/30 border-2 border-orange-200 dark:border-orange-700 rounded-2xl p-6 mb-8 dark:bg-gradient-to-r dark:border-2 dark:border-orange-600/40",
                },
                e.createElement(
                  "div",
                  { className: "flex items-start space-x-4" },
                  e.createElement(
                    "div",
                    {
                      className:
                        "w-12 h-12 bg-orange-100 dark:bg-orange-800 rounded-xl flex items-center justify-center flex-shrink-0 dark:bg-orange-950/20",
                    },
                    e.createElement(K, {
                      className: "w-6 h-6 text-orange-600 dark:text-orange-400 dark:text-orange-300",
                    }),
                  ),
                  e.createElement(
                    "div",
                    null,
                    e.createElement(
                      "p",
                      {
                        className:
                          "font-bold text-orange-800 dark:text-orange-300 text-lg mb-2 dark:text-orange-200",
                      },
                      t("when_to_use_sale_undone"),
                    ),
                    e.createElement(
                      "ul",
                      {
                        className:
                          "space-y-2 text-orange-700 dark:text-orange-400 dark:text-orange-300",
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
                    onChange: (r) => updateField("postId", r.target.value),
                    placeholder: t("post_id_placeholder"),
                    className: `h-14 text-lg rounded-xl border-2 ${
                      validationErrors.postId
                        ? "border-red-400 dark:border-red-500/60 focus:border-red-500"
                        : "border-gray-200 dark:border-gray-600 focus:border-orange-500"
                    } dark:bg-gray-700 dark:text-white transition-colors dark:border-2 dark:border-gray-700 dark:focus:border-orange-500/40`,
                    required: !0,
                    "aria-invalid": Boolean(validationErrors.postId),
                  }),
                  validationErrors.postId &&
                    e.createElement(
                      "p",
                      {
                        className:
                          "text-sm text-red-600 dark:text-red-400 mt-2",
                      },
                      validationErrors.postId,
                    ),
                  e.createElement(
                    "p",
                    {
                      className:
                        "text-sm text-gray-500 dark:text-gray-400 mt-2 dark:text-gray-300",
                    },
                    "\uD83D\uDCA1 ",
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
                      onChange: (r) => updateField("reason", r.target.value),
                      className:
                        "w-full h-14 text-lg rounded-xl border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-orange-500 transition-colors px-4 bg-white dark:border-2 dark:border-gray-700 dark:focus:border-orange-500/40 dark:bg-slate-900",
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
                    onChange: (r) => updateField("description", r.target.value),
                    placeholder: t("additional_notes_placeholder"),
                    className: `w-full min-h-[100px] text-lg rounded-xl border-2 ${
                      validationErrors.description
                        ? "border-red-400 dark:border-red-500/60 focus:border-red-500"
                        : "border-gray-200 dark:border-gray-600 focus:border-orange-500"
                    } dark:bg-gray-700 dark:text-white transition-colors px-4 py-3 resize-none dark:border-2 dark:border-gray-700 dark:focus:border-orange-500/40`,
                    "aria-invalid": Boolean(validationErrors.description),
                  }),
                  validationErrors.description &&
                    e.createElement(
                      "p",
                      {
                        className:
                          "text-sm text-red-600 dark:text-red-400 mt-2",
                      },
                      validationErrors.description,
                    ),
                ),
                e.createElement(
                  p,
                  {
                    type: "submit",
                    disabled: y,
                    className:
                      "w-full h-16 text-lg font-bold bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 rounded-2xl shadow-xl shadow-orange-500/30 transition-all hover:shadow-orange-500/50 hover:scale-[1.02] dark:bg-gradient-to-r",
                  },
                  y
                    ? e.createElement(
                        "span",
                        { className: "flex items-center gap-3" },
                        e.createElement("div", {
                          className:
                            "w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin dark:border-3 dark:border-white/30 dark:border-t-white",
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
                "mhub-premium-surface rounded-3xl overflow-hidden",
            },
            e.createElement(
              I,
              {
                className:
                  "bg-gradient-to-r from-purple-500 to-indigo-500 text-white p-6 dark:bg-gradient-to-r dark:text-white",
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
                    { className: "text-center py-8 dark:text-center" },
                    e.createElement("div", {
                      className:
                        "w-10 h-10 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mx-auto mb-4 dark:border-4 dark:border-orange-600/40 dark:border-t-orange-500",
                    }),
                    e.createElement(
                      "p",
                      { className: "text-gray-500 dark:text-gray-400 dark:text-gray-300" },
                      t("loading_history"),
                    ),
                  )
                : historyErrorMessage
                  ? e.createElement(
                      "div",
                      { className: "text-center py-8 dark:text-center" },
                      e.createElement(
                        "p",
                        { className: "text-red-500 mb-3 dark:text-red-300" },
                        historyErrorMessage,
                      ),
                      e.createElement(
                        p,
                        {
                          type: "button",
                          variant: "outline",
                          onClick: () => z((r) => r + 1),
                        },
                        tr("retry", "Retry"),
                      ),
                    )
                  : displayHistory.length === 0
                    ? e.createElement(
                        "div",
                        { className: "text-center py-12 dark:text-center" },
                        e.createElement(
                          "div",
                          {
                            className:
                              "w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4 dark:bg-gray-950",
                          },
                          e.createElement(f, {
                            className: "w-8 h-8 text-gray-400 dark:text-gray-300",
                          }),
                        ),
                        e.createElement(
                          "p",
                          {
                            className:
                              "text-gray-500 dark:text-gray-400 text-lg dark:text-gray-300",
                          },
                          hasCategoryMode && categoryModeCategory?.name
                            ? tr(
                                "no_category_reactivations",
                                "No {{category}} reactivations yet",
                                { category: categoryModeCategory.name },
                              )
                            : t("no_reactivated_posts"),
                        ),
                        e.createElement(
                          "p",
                          {
                            className:
                              "text-gray-400 dark:text-gray-500 text-sm mt-1 dark:text-gray-300",
                          },
                          hasCategoryMode && categoryModeCategory?.name
                            ? tr(
                                "reactivation_history_filtered",
                                "Reactivation history is filtered to {{category}}.",
                                { category: categoryModeCategory.name },
                              )
                            : t("posts_you_reactivate"),
                        ),
                        hasCategoryMode &&
                          categoryModeCategory?.name &&
                          e.createElement(
                            p,
                            {
                              type: "button",
                              variant: "outline",
                              className:
                                "mt-4 border-orange-200 text-orange-700 dark:border-orange-600/40 dark:text-orange-300",
                              onClick: () => L("/category-mode"),
                            },
                            tr("switch_category", "Switch category"),
                          ),
                      )
                    : e.createElement(
                        "div",
                        { className: "space-y-4" },
                        displayHistory.map((r) => {
                          const statusValue = String(
                              r.status || r.post_status || "active",
                            ).toLowerCase(),
                            statusLabel =
                              statusValue === "active"
                                ? tr("active", "Active")
                                : statusValue === "undone"
                                  ? tr("sale_undone_status", "Undone")
                                  : statusValue,
                            statusClass =
                              statusValue === "active"
                                ? "bg-green-100 text-green-700 dark:bg-green-950/20 dark:text-green-300"
                                : statusValue === "undone"
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-950/20 dark:text-amber-300"
                                  : "bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-300",
                            priceLabel = formatCurrency(r.price),
                            categoryLabel =
                              r.category_name ||
                              r.categoryName ||
                              r.category ||
                              r.category_title ||
                              r.categoryTitle ||
                              r.subcategory_name ||
                              r.subcategoryName ||
                              "",
                            buyerLabel =
                              r.buyer_name ||
                              r.buyerName ||
                              r.buyer?.name ||
                              r.buyer?.username ||
                              "",
                            updatedLabel = formatHistoryDate(
                              r.updated_at ||
                                r.last_transaction_completed_at ||
                                r.last_transaction_created_at ||
                                r.created_at,
                            ),
                            imageUrl = resolveHistoryImage(r);
                          return e.createElement(
                            "div",
                            {
                              key: r.id || r.post_id,
                              className:
                                "bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-600/50 rounded-2xl p-5 border border-gray-200 dark:border-gray-600 hover:shadow-lg transition-all dark:bg-gradient-to-r dark:border dark:border-gray-700",
                            },
                            e.createElement(
                              "div",
                              {
                                className:
                                  "flex flex-col sm:flex-row gap-4 items-start sm:items-center",
                              },
                              e.createElement(
                                "div",
                                {
                                  className:
                                    "w-full sm:w-24 h-24 rounded-2xl overflow-hidden bg-white/70 dark:bg-gray-800/40 border border-white/60 dark:border-gray-700/60 flex items-center justify-center",
                                },
                                e.createElement("img", {
                                  src: imageUrl,
                                  alt: r.title || "Listing",
                                  onError: (o) => {
                                    o.target.onerror = null;
                                    o.target.src = "/placeholder.svg";
                                  },
                                  className: "w-full h-full object-cover",
                                }),
                              ),
                              e.createElement(
                                "div",
                                { className: "flex-1 min-w-0" },
                                e.createElement(
                                  l,
                                  {
                                    className:
                                      "bg-orange-100 text-orange-700 font-mono mb-2 dark:bg-orange-950/20 dark:text-orange-300",
                                  },
                                  "ID: ",
                                  r.post_id || r.id,
                                ),
                                e.createElement(
                                  "h4",
                                  {
                                    className:
                                      "font-bold text-gray-900 dark:text-white dark:text-gray-100 truncate",
                                  },
                                  r.title || tr("untitled_post", "Untitled"),
                                ),
                                e.createElement(
                                  "div",
                                  {
                                    className:
                                      "mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-300",
                                  },
                                  priceLabel &&
                                    e.createElement(
                                      "span",
                                      {
                                        className:
                                          "inline-flex items-center rounded-full bg-green-100 text-green-700 px-2 py-0.5 font-semibold dark:bg-green-950/20 dark:text-green-300",
                                      },
                                      priceLabel,
                                    ),
                                  categoryLabel &&
                                    e.createElement(
                                      "span",
                                      {
                                        className:
                                          "inline-flex items-center rounded-full bg-indigo-100 text-indigo-700 px-2 py-0.5 font-semibold dark:bg-indigo-950/20 dark:text-indigo-300",
                                      },
                                      categoryLabel,
                                    ),
                                  buyerLabel &&
                                    e.createElement(
                                      "span",
                                      {
                                        className:
                                          "inline-flex items-center rounded-full bg-slate-100 text-slate-700 px-2 py-0.5 font-semibold dark:bg-slate-950/20 dark:text-slate-300",
                                      },
                                      tr("buyer", "Buyer"),
                                      ": ",
                                      buyerLabel,
                                    ),
                                  updatedLabel &&
                                    e.createElement(
                                      "span",
                                      {
                                        className:
                                          "inline-flex items-center rounded-full bg-gray-100 text-gray-600 px-2 py-0.5 font-semibold dark:bg-gray-950/20 dark:text-gray-300",
                                      },
                                      updatedLabel,
                                    ),
                                ),
                                e.createElement(
                                  "p",
                                  {
                                    className:
                                      "mt-2 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-300",
                                  },
                                  r.reason ||
                                    tr(
                                      "no_reason_specified",
                                      "No reason specified",
                                    ),
                                ),
                              ),
                              e.createElement(
                                l,
                                { className: statusClass },
                                statusLabel,
                              ),
                            ),
                          );
                        }),
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
                "fixed bottom-24 right-6 w-14 h-14 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-full shadow-2xl shadow-orange-500/40 flex items-center justify-center hover:scale-110 transition-all z-50 animate-bounce dark:bg-gradient-to-r dark:text-white",
            },
            e.createElement(X, { className: "w-6 h-6" }),
          ),
        e.createElement(
          AlertDialog,
          {
            open: confirmOpen,
            onOpenChange: (r) => {
              setConfirmOpen(r);
              r || setPendingSubmission(null);
            },
          },
          e.createElement(
            AlertDialogContent,
            { className: "mhub-premium-surface rounded-2xl" },
            e.createElement(
              AlertDialogHeader,
              null,
              e.createElement(
                AlertDialogTitle,
                null,
                tr("confirm_reactivate_title", "Confirm reactivation"),
              ),
              e.createElement(
                AlertDialogDescription,
                null,
                tr(
                  "confirm_reactivate_desc",
                  "We'll move this listing back to Active and make it visible to buyers.",
                ),
              ),
            ),
            e.createElement(
              "div",
              {
                className:
                  "rounded-xl border border-orange-200 dark:border-orange-700/40 bg-orange-50 dark:bg-orange-900/20 p-4 text-sm space-y-2",
              },
              e.createElement(
                "div",
                { className: "flex items-center justify-between" },
                e.createElement(
                  "span",
                  { className: "text-gray-600 dark:text-gray-300" },
                  tr("post_id", "Post ID"),
                ),
                e.createElement(
                  "span",
                  { className: "font-semibold text-gray-900 dark:text-white" },
                  pendingSubmission?.postId || ce(n.postId) || "--",
                ),
              ),
              e.createElement(
                "div",
                { className: "flex items-center justify-between" },
                e.createElement(
                  "span",
                  { className: "text-gray-600 dark:text-gray-300" },
                  tr("reason_for_undoing", "Reason"),
                ),
                e.createElement(
                  "span",
                  { className: "font-semibold text-gray-900 dark:text-white" },
                  pendingSubmission?.reason
                    ? tr(pendingSubmission.reason, pendingSubmission.reason)
                    : tr("select_reason_optional", "Optional"),
                ),
              ),
              pendingSubmission?.description &&
                e.createElement(
                  "div",
                  { className: "text-gray-600 dark:text-gray-300" },
                  pendingSubmission.description,
                ),
            ),
            e.createElement(
              AlertDialogFooter,
              null,
              e.createElement(
                AlertDialogCancel,
                { className: "rounded-xl" },
                tr("cancel", "Cancel"),
              ),
              e.createElement(
                AlertDialogAction,
                {
                  onClick: performSubmit,
                  disabled: y,
                  className:
                    "bg-orange-600 hover:bg-orange-700 text-white rounded-xl dark:bg-orange-700/40 dark:hover:bg-orange-700/40 dark:text-white",
                },
                y ? tr("reactivating", "Reactivating...") : tr("confirm", "Confirm"),
              ),
            ),
          ),
        ),
      );
};
var ke = SaleUndonePage;
export { ke as default };

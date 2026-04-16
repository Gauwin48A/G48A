import e, { useState as i, useEffect as J, useMemo as S } from "react";
import { Button as f } from "@/components/ui/button";
import { Input as W } from "@/components/ui/input";
import { Label as p } from "@/components/ui/label";
import {
  Card as n,
  CardContent as m,
  CardDescription as Y,
  CardHeader as Z,
  CardTitle as G,
} from "@/components/ui/card";
import { Textarea as K } from "@/components/ui/textarea";
import { Badge as h } from "@/components/ui/badge";
import PageDensityToggle from "@/components/ui/PageDensityToggle";
import { useToast as Q } from "@/hooks/use-toast";
import { usePageDensity } from "@/hooks/usePageDensity";
import { hasAuthSession } from "@/utils/authStorage";
import {
  MessageSquare as g,
  Star as V,
  Send as T,
  Heart as v,
  ArrowLeft as X,
  ArrowUp as R,
  Sparkles as j,
  ThumbsUp as ee,
  Lightbulb as te,
  Bug as re,
  Palette as ae,
  Zap as se,
  CheckCircle as oe,
  ChevronRight as L,
} from "lucide-react";
import { Link as I, useNavigate as le } from "react-router-dom";
import { useTranslation as de } from "react-i18next";
import { useAuth as ie } from "@/context/AuthContext";
import api from "@/lib/api";
const FeedbackPage = () => {
  const { t } = de(),
    tr = (r, a, l = {}) => t(r, { defaultValue: a, ...l }),
    { toast: d } = Q(),
    c = le(),
    { user: k } = ie(),
    { density, setDensity } = usePageDensity("mhub_feedback_density"),
    w = S(
      () =>
        !!(k || hasAuthSession()),
      [k],
    ),
    [A, F] = i(!1),
    [N, y] = i(!1),
    [u, $] = i(""),
    [_, D] = i(""),
    [o, b] = i({
      feedbackType: "general",
      rating: 5,
      subject: "",
      message: "",
    }),
    [sectionCollapse, setSectionCollapse] = i({
      feedbackCategory: !0,
      heroHighlights: !0,
      whyMatters: !0,
      directContact: !0,
      thankYou: !0,
    }),
    P = (r, a) => {
      const l = String(r || "").trim();
      if (!l) return a;
      const s = l.toLowerCase();
      return s.includes("unauthorized") ||
        s.includes("token") ||
        s.includes("login")
        ? tr(
            "please_sign_in_again",
            "Please sign in again and retry this action.",
          )
        : s.includes("network") ||
            s.includes("timeout") ||
            s.includes("failed to fetch")
          ? tr(
              "feedback_service_unreachable",
              "Feedback services are currently unreachable. Please retry shortly.",
            )
          : s.includes("required") ||
              s.includes("invalid") ||
              s.includes("validation")
            ? tr(
                "feedback_missing_details",
                "Some feedback details are missing or invalid. Review the form and retry.",
              )
            : a;
    },
    q = (r) => {
      const a =
        r?.feedback_id ||
        r?.id ||
        r?.reference_id ||
        r?.ticket_id ||
        r?.feedback?.id ||
        r?.feedback?.feedback_id ||
        "";
      return a ? String(a) : "";
    };
  J(() => {
    const r = () => {
      F(window.scrollY > 300);
    };
    return (
      window.addEventListener("scroll", r),
      () => window.removeEventListener("scroll", r)
    );
  }, []);
  const U = () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    C = (r) => {
      const { name: a, value: l } = r.target;
      b((s) => ({ ...s, [a]: l }));
    },
    z = (r) => {
      b((a) => ({ ...a, rating: r }));
    },
    toggleSection = (r) => {
      setSectionCollapse((a) => ({ ...a, [r]: !a[r] }));
    },
    E = async (r) => {
      if ((r.preventDefault(), !w)) {
        c("/login", { state: { returnTo: "/feedback" } });
        return;
      }
      if (!o.subject || !o.message) {
        d({
          title: t("incomplete_form"),
          description: t("fill_subject_message"),
          variant: "destructive",
        });
        return;
      }
      y(!0);
      try {
        const l = await api.post("/feedback", {
            subject: o.subject,
            message: o.message,
            rating: o.rating,
            category: o.feedbackType,
          }),
          s = l?.data ?? l;
        const x = q(s);
        $(x || tr("pending_assignment", "Pending assignment")),
          D(new Date().toISOString()),
          d({
            title: t("feedback_submitted"),
            description: x
              ? tr(
                  "feedback_reference_desc",
                  "Reference ID: {{id}}. Thank you for helping us improve.",
                  { id: x },
                )
              : s.message || tr("thank_you_feedback", "Thank you for helping us improve."),
          }),
          b({ feedbackType: "general", rating: 5, subject: "", message: "" });
      } catch (a) {
        d({
          title: tr("feedback_submit_failed", "Submission failed"),
          description: P(
            a.message,
            tr("could_not_submit_feedback", "Could not submit feedback"),
          ),
          variant: "destructive",
        });
      } finally {
        y(!1);
      }
    },
    H = () =>
      [...Array(5)].map((r, a) =>
        e.createElement(
          "button",
          {
            key: a,
            type: "button",
            onClick: () => z(a + 1),
            className: `text-2xl transition-all transform hover:scale-125 dark:text-2xl${a < o.rating ? "text-yellow-400" : "text-gray-300"} hover:text-yellow-400 dark:hover:text-yellow-200`,
          },
          e.createElement(V, { className: "w-8 h-8 fill-current" }),
        ),
      ),
    O = async () => {
      if (u)
        try {
          await navigator.clipboard.writeText(u),
            d({
              title: tr("reference_copied_title", "Reference Copied"),
              description: tr(
                "reference_copied_desc",
                "Use this ID if you need support follow-up.",
              ),
            });
        } catch {
          d({
            title: tr("copy_reference_failed_title", "Unable to Copy"),
            description: tr(
              "copy_reference_failed_desc",
              "Please copy the reference manually.",
            ),
            variant: "destructive",
          });
        }
    },
    M = [
      {
        icon: re,
        name: t("bug_report"),
        description: t("report_technical_issues"),
        value: "bug",
        color: "text-red-500",
        bg: "bg-red-50",
      },
      {
        icon: te,
        name: t("feature_request"),
        description: t("suggest_new_features"),
        value: "feature",
        color: "text-yellow-500",
        bg: "bg-yellow-50",
      },
      {
        icon: ae,
        name: t("ui_improvement"),
        description: t("suggest_design_improvements"),
        value: "ui",
        color: "text-purple-500",
        bg: "bg-purple-50",
      },
      {
        icon: se,
        name: t("performance_issue"),
        description: t("report_slow_loading"),
        value: "performance",
        color: "text-orange-500",
        bg: "bg-orange-50",
      },
      {
        icon: g,
        name: t("general_feedback"),
        description: t("share_general_thoughts"),
        value: "general",
        color: "text-blue-500",
        bg: "bg-blue-50",
      },
    ],
    selectedFeedback =
      M.find((r) => r.value === o.feedbackType) || M[M.length - 1],
    whyMattersItems = [
      {
        key: "needs",
        icon: te,
        title: tr("your_needs_pain_points", "Your needs and pain points"),
        description: tr(
          "feedback_needs_desc",
          "We map recurring pain points to product fixes.",
        ),
        iconWrap: "bg-indigo-50 text-indigo-600",
        border: "border-indigo-100/80",
      },
      {
        key: "build",
        icon: j,
        title: tr("what_to_build_next", "What to build next"),
        description: tr(
          "feedback_build_desc",
          "Top requests guide our roadmap and experiments.",
        ),
        iconWrap: "bg-blue-50 text-blue-600",
        border: "border-blue-100/80",
      },
      {
        key: "everyone",
        icon: ee,
        title: tr("for_all_users", "For all users"),
        description: tr(
          "feedback_for_all_desc",
          "We tune the experience for every segment.",
        ),
        iconWrap: "bg-emerald-50 text-emerald-600",
        border: "border-emerald-100/80",
      },
      {
        key: "trust",
        icon: oe,
        title: tr("a_better_safer_platform", "A better, safer platform"),
        description: tr(
          "feedback_trust_desc",
          "Your reports help us improve safety and reliability.",
        ),
        iconWrap: "bg-amber-50 text-amber-600",
        border: "border-amber-100/80",
      },
    ];
  return w
    ? e.createElement(
        "div",
        {
          className:
            `mhub-page-feedback min-h-screen mhub-premium-page mhub-page-pad-bottom bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-blue-900 dark:to-indigo-900 relative dark:bg-gradient-to-br ${density === "compact" ? "mhub-compact" : ""}`,
          style: { minHeight: "100vh" },
        },
        e.createElement(
          "div",
          { className: "absolute inset-0 pointer-events-none" },
          e.createElement("div", {
            className:
              "absolute top-20 left-10 w-72 h-72 bg-blue-500/10 dark:bg-blue-500/20 rounded-full blur-2xl opacity-60 dark:bg-blue-800/10",
          }),
          e.createElement("div", {
            className:
              "absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 dark:bg-purple-500/20 rounded-full blur-2xl opacity-60 dark:bg-purple-800/10",
          }),
          e.createElement("div", {
            className:
              "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-2xl dark:bg-indigo-800/5",
          }),
        ),
        e.createElement(
          "div",
          { className: "relative max-w-3xl mx-auto px-4 py-5 sm:px-6 sm:py-6 space-y-4" },
          e.createElement(
            "div",
            { className: "text-center pt-4 mhub-hero-card rounded-3xl px-4 py-5 sm:px-6 sm:py-6" },
            e.createElement(
              "button",
              {
                onClick: () => c("/"),
                className:
                  "inline-flex items-center gap-2 rounded-full border border-blue-200/70 bg-white/80 px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-sm hover:bg-white transition mb-4 dark:border-blue-400/30 dark:bg-slate-900/40 dark:text-blue-200 dark:hover:bg-slate-900/60",
              },
              e.createElement(X, {
                className: "w-4 h-4 group-hover:-translate-x-1 transition-transform",
              }),
              t("back_to_home"),
            ),
            e.createElement(
              "div",
              {
                className:
                  "inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-600 shadow-xl shadow-blue-500/25 mb-4 dark:bg-gradient-to-br",
              },
              e.createElement(g, { className: "w-7 h-7 sm:w-8 sm:h-8 text-white dark:text-white" }),
            ),
            e.createElement(
              "h1",
              {
                className:
                  "text-[clamp(24px,2.6vw,36px)] font-black text-gray-900 dark:text-white mb-2 dark:text-gray-100",
              },
              t("share_your"),
              " ",
              e.createElement(
                "span",
                {
                  className:
                    "bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent dark:bg-gradient-to-r dark:bg-clip-text dark:text-transparent",
                },
                t("feedback"),
              ),
            ),
            e.createElement(
              "p",
              {
                className:
                  "text-[clamp(12px,1.3vw,16px)] leading-[1.5] text-blue-700 dark:text-blue-200 max-w-md mx-auto dark:text-blue-300",
              },
              t("help_us_improve"),
            ),
          ),
          e.createElement(
            "div",
            { className: "flex justify-center sm:justify-end" },
            e.createElement(PageDensityToggle, {
              value: density,
              onChange: setDensity,
              label: tr("view", "View"),
            }),
          ),
          e.createElement(
            "div",
            { className: "flex flex-wrap items-center justify-center gap-2" },
            e.createElement(
              "button",
              {
                type: "button",
                onClick: () => toggleSection("heroHighlights"),
                className:
                  "inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800",
                "aria-expanded": !sectionCollapse.heroHighlights,
                "aria-controls": "feedback-hero-highlights",
              },
              sectionCollapse.heroHighlights
                ? tr("show_highlights", "Show highlights")
                : tr("hide_highlights", "Hide highlights"),
              e.createElement(L, {
                className: `w-3.5 h-3.5 transition-transform ${
                  sectionCollapse.heroHighlights ? "" : "rotate-90"
                }`,
              }),
            ),
            sectionCollapse.heroHighlights
              ? e.createElement(
                  "span",
                  {
                    className:
                      "text-[11px] text-slate-600 dark:text-slate-300",
                  },
                  tr(
                    "highlights_summary",
                    "Your voice matters · We listen · Continuous improvement",
                  ),
                )
              : null,
          ),
          sectionCollapse.heroHighlights
            ? null
            : e.createElement(
                "div",
                {
                  id: "feedback-hero-highlights",
                  className: "flex flex-wrap justify-center gap-2",
                },
                e.createElement(
                  h,
                  {
                    className:
                      "bg-blue-500/10 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/20 dark:border-blue-500/30 px-4 py-2 rounded-full backdrop-blur-sm dark:bg-blue-800/10 dark:border-blue-500/20",
                  },
                  e.createElement(v, { className: "w-4 h-4 mr-2" }),
                  " ",
                  t("your_voice_matters"),
                ),
                e.createElement(
                  h,
                  {
                    className:
                      "bg-purple-500/10 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/20 dark:border-purple-500/30 px-4 py-2 rounded-full backdrop-blur-sm dark:bg-purple-800/10 dark:border-blue-500/20",
                  },
                  e.createElement(ee, { className: "w-4 h-4 mr-2" }),
                  " ",
                  t("we_listen"),
                ),
                e.createElement(
                  h,
                  {
                    className:
                      "bg-green-500/10 dark:bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/20 dark:border-green-500/30 px-4 py-2 rounded-full backdrop-blur-sm dark:bg-green-800/10 dark:border-green-500/20",
                  },
                  e.createElement(j, { className: "w-4 h-4 mr-2" }),
                  " ",
                  t("continuous_improvement"),
                ),
              ),
          e.createElement(
            n,
            {
              className:
                "mhub-premium-surface rounded-3xl overflow-hidden",
            },
            e.createElement(
              Z,
              {
                className:
                  "bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 text-white p-6 dark:bg-gradient-to-r dark:text-white",
              },
              e.createElement(
                G,
                { className: "flex items-center space-x-3 text-2xl" },
                e.createElement(
                  "div",
                  {
                    className:
                      "w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm dark:bg-slate-900/20",
                  },
                  e.createElement(g, { className: "w-6 h-6" }),
                ),
                e.createElement("span", null, t("your_feedback")),
              ),
              e.createElement(
                Y,
                { className: "text-blue-100 text-base mt-2 dark:text-blue-200" },
                t("opinion_matters"),
              ),
            ),
            e.createElement(
              m,
              { className: "p-6" },
              e.createElement(
                "form",
                { onSubmit: E, className: "space-y-4" },
                e.createElement(
                  "div",
                  null,
                  e.createElement(
                    "div",
                    {
                      className:
                        "flex flex-wrap items-center justify-between gap-2 mb-3",
                    },
                    e.createElement(
                      p,
                      {
                        className:
                          "text-sm font-bold text-gray-700 dark:text-gray-200 block",
                      },
                      t("feedback_category"),
                    ),
                    e.createElement(
                      "button",
                      {
                        type: "button",
                        onClick: () => toggleSection("feedbackCategory"),
                        className:
                          "inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800",
                        "aria-expanded": !sectionCollapse.feedbackCategory,
                        "aria-controls": "feedback-category-grid",
                      },
                      sectionCollapse.feedbackCategory
                        ? tr("expand", "Expand")
                        : tr("collapse", "Collapse"),
                      e.createElement(L, {
                        className: `w-3.5 h-3.5 transition-transform ${
                          sectionCollapse.feedbackCategory ? "" : "rotate-90"
                        }`,
                      }),
                    ),
                  ),
                  e.createElement(
                    "div",
                    {
                      className:
                        "rounded-2xl border border-slate-200 bg-white/90 p-3 sm:p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/70",
                    },
                    e.createElement(
                      "div",
                      { className: "flex items-start gap-3" },
                      selectedFeedback?.icon
                        ? e.createElement(
                            "div",
                            {
                              className:
                                "w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center dark:bg-slate-800 dark:text-slate-200",
                            },
                            e.createElement(selectedFeedback.icon, {
                              className: `w-5 h-5 ${selectedFeedback.color}`,
                            }),
                          )
                        : null,
                      e.createElement(
                        "div",
                        { className: "flex-1" },
                        e.createElement(
                          "p",
                          {
                            className:
                              "text-sm font-semibold text-slate-900 dark:text-white",
                          },
                          selectedFeedback?.name || t("general_feedback"),
                        ),
                        e.createElement(
                          "p",
                          {
                            className:
                              "text-xs text-slate-600 dark:text-slate-300",
                          },
                          selectedFeedback?.description ||
                            t("share_general_thoughts"),
                        ),
                      ),
                    ),
                    e.createElement(
                      "div",
                      { className: "mt-3 flex flex-wrap items-center gap-2" },
                      e.createElement(
                        "select",
                        {
                          name: "feedbackType",
                          value: o.feedbackType,
                          onChange: C,
                          className:
                            "mhub-input h-10 min-w-[180px] px-3 text-sm",
                        },
                        M.map((r) =>
                          e.createElement(
                            "option",
                            { key: r.value, value: r.value },
                            r.name,
                          ),
                        ),
                      ),
                      e.createElement(
                        "button",
                        {
                          type: "button",
                          onClick: () => toggleSection("feedbackCategory"),
                          className:
                            "inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800",
                          "aria-expanded": !sectionCollapse.feedbackCategory,
                          "aria-controls": "feedback-category-grid",
                        },
                        sectionCollapse.feedbackCategory
                          ? tr("more_options", "More options")
                          : tr("hide_cards", "Hide cards"),
                        e.createElement(L, {
                          className: `w-3.5 h-3.5 transition-transform ${
                            sectionCollapse.feedbackCategory ? "" : "rotate-90"
                          }`,
                        }),
                      ),
                    ),
                  ),
                  sectionCollapse.feedbackCategory
                    ? null
                    : e.createElement(
                        "div",
                        {
                          id: "feedback-category-grid",
                          className: "grid grid-cols-1 sm:grid-cols-2 gap-3",
                        },
                        M.map((r) => {
                          const isActive = o.feedbackType === r.value;
                          return e.createElement(
                            "button",
                            {
                              key: r.value,
                              type: "button",
                              onClick: () =>
                                b((a) => ({ ...a, feedbackType: r.value })),
                              className: `group p-4 rounded-2xl border transition-all text-left shadow-sm ${
                                isActive
                                  ? "border-blue-500 bg-blue-50 shadow-md"
                                  : "border-slate-200 bg-white/80 hover:border-slate-300 hover:bg-white"
                              } dark:border-slate-700 dark:bg-slate-900/60 dark:hover:bg-slate-900/80`,
                            },
                            e.createElement(
                              "div",
                              { className: "flex items-center gap-3" },
                              e.createElement(
                                "div",
                                {
                                  className: `w-10 h-10 ${r.bg} dark:bg-opacity-20 rounded-xl flex items-center justify-center border border-transparent group-hover:shadow-sm`,
                                },
                                e.createElement(r.icon, {
                                  className: `w-5 h-5 ${r.color}`,
                                }),
                              ),
                              e.createElement(
                                "div",
                                null,
                                e.createElement(
                                  "p",
                                  {
                                    className:
                                      "font-semibold text-gray-900 dark:text-gray-100",
                                  },
                                  r.name,
                                ),
                                e.createElement(
                                  "p",
                                  {
                                    className:
                                      "text-xs text-slate-600 dark:text-slate-300",
                                  },
                                  r.description,
                                ),
                              ),
                            ),
                          );
                        }),
                      ),
                ),
                e.createElement(
                  "div",
                  null,
                  e.createElement(
                    p,
                    {
                      className:
                        "text-sm font-bold text-gray-700 dark:text-gray-200 mb-2 block",
                    },
                    t("overall_rating"),
                  ),
                  e.createElement(
                    "div",
                    {
                      className:
                        "flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl dark:bg-gray-950",
                    },
                    e.createElement(
                      "div",
                      { className: "flex items-center space-x-1" },
                      H(),
                    ),
                    e.createElement(
                      "span",
                      {
                        className:
                          "ml-4 text-base font-semibold text-gray-700 dark:text-gray-200",
                      },
                      o.rating,
                      " / 5",
                    ),
                  ),
                ),
                e.createElement(
                  "div",
                  null,
                  e.createElement(
                    p,
                    {
                      htmlFor: "subject",
                      className:
                        "text-sm font-bold text-gray-700 dark:text-gray-200 mb-2 block",
                    },
                    t("subject"),
                    " *",
                  ),
                  e.createElement(W, {
                    id: "subject",
                    name: "subject",
                    type: "text",
                    value: o.subject,
                    onChange: C,
                    placeholder: t("brief_summary"),
                    className:
                      "h-12 text-base rounded-xl border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-blue-500 transition-colors dark:border-2 dark:border-gray-700 dark:focus:border-blue-500/40",
                    required: !0,
                  }),
                ),
                e.createElement(
                  "div",
                  null,
                  e.createElement(
                    p,
                    {
                      htmlFor: "message",
                      className:
                        "text-sm font-bold text-gray-700 dark:text-gray-200 mb-2 block",
                    },
                    t("your_feedback"),
                    " *",
                  ),
                  e.createElement(K, {
                    id: "message",
                    name: "message",
                    value: o.message,
                    onChange: C,
                    placeholder: t("share_detailed_feedback"),
                    rows: 6,
                    className:
                      "text-base rounded-xl border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-blue-500 transition-colors resize-none dark:border-2 dark:border-gray-700 dark:focus:border-blue-500/40",
                    required: !0,
                  }),
                ),
                e.createElement(
                  f,
                  {
                    type: "submit",
                    disabled: N,
                    className:
                      "w-full h-14 text-base font-bold bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 rounded-2xl shadow-xl shadow-blue-500/30 transition-all hover:shadow-blue-500/50 hover:scale-[1.01] dark:bg-gradient-to-r",
                  },
                  N
                    ? e.createElement(
                        "span",
                        { className: "flex items-center gap-3" },
                        e.createElement("div", {
                          className:
                            "w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin dark:border-3 dark:border-white/30 dark:border-t-white",
                        }),
                        t("submitting"),
                      )
                    : e.createElement(
                        "span",
                        { className: "flex items-center gap-2" },
                        e.createElement(T, { className: "w-6 h-6" }),
                        t("submit_feedback"),
                      ),
                ),
                e.createElement(
                  f,
                  {
                    type: "button",
                    variant: "outline",
                    className: "w-full h-12",
                    onClick: () => c("/complaints"),
                  },
                  tr(
                    "report_transaction_issue_instead",
                    "Report a transaction issue instead",
                  ),
                ),
              ),
            ),
          ),
          u &&
            e.createElement(
              n,
              {
                className:
                  "shadow-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/30 rounded-2xl overflow-hidden dark:border dark:border-blue-600/40 dark:bg-blue-950/20",
              },
              e.createElement(
                m,
                { className: "p-5" },
                e.createElement(
                  "p",
                  {
                    className: "text-sm text-blue-800 dark:text-blue-300 mb-1 dark:text-blue-200",
                  },
                  tr("latest_feedback_reference", "Latest feedback reference"),
                ),
                e.createElement(
                  "p",
                  {
                    className:
                      "font-mono text-lg font-bold text-blue-900 dark:text-blue-200",
                  },
                  u,
                ),
                _ &&
                  e.createElement(
                    "p",
                    {
                      className:
                        "text-xs text-blue-700 dark:text-blue-300 mt-1",
                    },
                    tr("submitted", "Submitted"),
                    " ",
                    new Date(_).toLocaleString(),
                  ),
                e.createElement(
                  "div",
                  { className: "mt-3" },
                  e.createElement(
                    f,
                    {
                      type: "button",
                      variant: "outline",
                      className: "border-blue-300 text-blue-800 dark:border-blue-600/40 dark:text-blue-200",
                      onClick: O,
                    },
                    tr("copy_reference", "Copy reference"),
                  ),
                ),
              ),
            ),
          e.createElement(
            n,
            {
              className:
                "shadow-xl border border-slate-200/70 rounded-3xl overflow-hidden backdrop-blur-xl bg-white/90 dark:border-slate-700 dark:bg-slate-900/80",
              "data-density": "extra",
            },
            e.createElement(
              m,
              { className: "p-6 sm:p-7" },
              e.createElement(
                "div",
                { className: "flex flex-wrap items-start justify-between gap-3" },
                e.createElement(
                  "div",
                  { className: "flex items-start gap-3" },
                  e.createElement(
                    "div",
                    {
                      className:
                        "w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md",
                    },
                    e.createElement(v, { className: "w-6 h-6" }),
                  ),
                  e.createElement(
                    "div",
                    null,
                    e.createElement(
                      "p",
                      {
                        className:
                          "text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-300",
                      },
                      tr("feedback_impact", "Impact"),
                    ),
                    e.createElement(
                      "h3",
                      {
                        className:
                          "text-lg sm:text-xl font-bold text-slate-900 dark:text-white",
                      },
                      t("why_feedback_matters"),
                    ),
                    e.createElement(
                      "p",
                      {
                        className:
                          "text-sm text-slate-600 dark:text-slate-300",
                      },
                      tr(
                        "feedback_matters_subtitle",
                        "Every note you send shapes the product direction.",
                      ),
                    ),
                  ),
                ),
                e.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: () => toggleSection("whyMatters"),
                    className:
                      "inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800",
                    "aria-expanded": !sectionCollapse.whyMatters,
                    "aria-controls": "feedback-why-body",
                  },
                  sectionCollapse.whyMatters
                    ? tr("expand", "Expand")
                    : tr("collapse", "Collapse"),
                  e.createElement(L, {
                    className: `w-3.5 h-3.5 transition-transform ${
                      sectionCollapse.whyMatters ? "" : "rotate-90"
                    }`,
                  }),
                ),
              ),
              sectionCollapse.whyMatters
                ? e.createElement(
                    "div",
                    {
                      className:
                        "mt-4 flex flex-wrap gap-2 text-[11px] text-slate-600 dark:text-slate-300",
                    },
                    whyMattersItems.map((r) =>
                      e.createElement(
                        "span",
                        {
                          key: r.key,
                          className:
                            "inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 shadow-sm dark:border-slate-700 dark:bg-slate-900/60",
                        },
                        e.createElement(r.icon, { className: "w-3.5 h-3.5" }),
                        r.title,
                      ),
                    ),
                  )
                : e.createElement(
                    "div",
                    {
                      id: "feedback-why-body",
                      className: "mt-5 grid sm:grid-cols-2 gap-3",
                    },
                    whyMattersItems.map((r) =>
                      e.createElement(
                        "div",
                        {
                          key: r.key,
                          className: `flex items-start gap-3 rounded-2xl border ${r.border} bg-white px-4 py-3 shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-900/60`,
                        },
                        e.createElement(
                          "div",
                          {
                            className: `w-10 h-10 rounded-xl ${r.iconWrap} flex items-center justify-center border border-white/40 shadow-sm dark:bg-slate-800/60 dark:text-slate-100`,
                          },
                          e.createElement(r.icon, { className: "w-5 h-5" }),
                        ),
                        e.createElement(
                          "div",
                          null,
                          e.createElement(
                            "p",
                            {
                              className:
                                "font-semibold text-slate-900 dark:text-white",
                            },
                            r.title,
                          ),
                          e.createElement(
                            "p",
                            {
                              className:
                                "text-xs text-slate-600 dark:text-slate-300",
                            },
                            r.description,
                          ),
                        ),
                      ),
                    ),
                  ),
            ),
          ),
          e.createElement(
            n,
            {
              className:
                "shadow-lg border border-emerald-100/70 rounded-3xl overflow-hidden backdrop-blur-xl bg-white/90 dark:border-emerald-700/40 dark:bg-slate-900/70",
              "data-density": "extra",
            },
            e.createElement(
              m,
              { className: "p-6" },
              e.createElement(
                "div",
                { className: "flex items-start justify-between gap-3" },
                e.createElement(
                  "div",
                  { className: "flex items-start gap-3" },
                  e.createElement(
                    "div",
                    {
                      className:
                        "w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-200",
                    },
                    e.createElement(T, { className: "w-5 h-5" }),
                  ),
                  e.createElement(
                    "div",
                    null,
                    e.createElement(
                      "h3",
                      {
                        className:
                          "font-bold text-slate-900 dark:text-white text-lg",
                      },
                      "\uD83D\uDCE7 ",
                      t("direct_contact"),
                    ),
                    e.createElement(
                      "p",
                      {
                        className:
                          "text-sm text-slate-600 dark:text-slate-300",
                      },
                      tr(
                        "direct_contact_hint",
                        "Reach us directly for urgent issues.",
                      ),
                    ),
                  ),
                ),
                e.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: () => toggleSection("directContact"),
                    className:
                      "inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800",
                    "aria-expanded": !sectionCollapse.directContact,
                    "aria-controls": "feedback-direct-contact",
                  },
                  sectionCollapse.directContact
                    ? tr("expand", "Expand")
                    : tr("collapse", "Collapse"),
                  e.createElement(L, {
                    className: `w-3.5 h-3.5 transition-transform ${
                      sectionCollapse.directContact ? "" : "rotate-90"
                    }`,
                  }),
                ),
              ),
              sectionCollapse.directContact
                ? e.createElement(
                    "p",
                    {
                      className:
                        "mt-3 text-xs text-slate-600 dark:text-slate-300",
                    },
                    "feedback@mobilehub.com · ",
                    t("24_48_hours"),
                  )
                : e.createElement(
                    "div",
                    {
                      id: "feedback-direct-contact",
                      className:
                        "mt-4 space-y-1 text-slate-700 dark:text-slate-300 text-sm",
                    },
                    e.createElement(
                      "p",
                      null,
                      e.createElement(
                        "span",
                        { className: "font-medium" },
                        t("email"),
                        ":",
                      ),
                      " feedback@mobilehub.com",
                    ),
                    e.createElement(
                      "p",
                      null,
                      e.createElement(
                        "span",
                        { className: "font-medium" },
                        t("response_time"),
                        ":",
                      ),
                      " ",
                      t("24_48_hours"),
                    ),
                    e.createElement(
                      "p",
                      null,
                      e.createElement(
                        "span",
                        { className: "font-medium" },
                        t("priority_support"),
                        ":",
                      ),
                      " ",
                      t("verified_users_faster"),
                    ),
                  ),
            ),
          ),
          e.createElement(
            n,
            {
              className:
                "shadow-lg border border-purple-100/70 rounded-3xl overflow-hidden backdrop-blur-xl bg-white/90 dark:border-purple-700/40 dark:bg-slate-900/70",
              "data-density": "extra",
            },
            e.createElement(
              m,
              { className: "p-6" },
              e.createElement(
                "div",
                { className: "flex items-start justify-between gap-3" },
                e.createElement(
                  "div",
                  { className: "flex items-start gap-3" },
                  e.createElement(
                    "div",
                    {
                      className:
                        "w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center dark:bg-purple-900/30 dark:text-purple-200",
                    },
                    e.createElement(v, { className: "w-5 h-5" }),
                  ),
                  e.createElement(
                    "div",
                    null,
                    e.createElement(
                      "h3",
                      {
                        className:
                          "text-lg font-bold text-slate-900 dark:text-white",
                      },
                      t("thank_you_community"),
                    ),
                    e.createElement(
                      "p",
                      {
                        className:
                          "text-sm text-slate-600 dark:text-slate-300",
                      },
                      tr(
                        "thank_you_hint",
                        "We read every message and share trends with the team.",
                      ),
                    ),
                  ),
                ),
                e.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: () => toggleSection("thankYou"),
                    className:
                      "inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800",
                    "aria-expanded": !sectionCollapse.thankYou,
                    "aria-controls": "feedback-thank-you",
                  },
                  sectionCollapse.thankYou
                    ? tr("expand", "Expand")
                    : tr("collapse", "Collapse"),
                  e.createElement(L, {
                    className: `w-3.5 h-3.5 transition-transform ${
                      sectionCollapse.thankYou ? "" : "rotate-90"
                    }`,
                  }),
                ),
              ),
              sectionCollapse.thankYou
                ? e.createElement(
                    "p",
                    {
                      className:
                        "mt-3 text-xs text-slate-600 dark:text-slate-300",
                    },
                    tr(
                      "thank_you_collapsed",
                      "Thanks for helping us make the marketplace better.",
                    ),
                  )
                : e.createElement(
                    "p",
                    {
                      id: "feedback-thank-you",
                      className:
                        "mt-4 text-sm text-slate-600 dark:text-slate-300",
                    },
                    t("feedback_helps_build"),
                  ),
            ),
          ),
        ),
        A &&
          e.createElement(
            "button",
            {
              onClick: U,
              className:
                "fixed bottom-24 right-6 w-14 h-14 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full shadow-2xl shadow-blue-500/40 flex items-center justify-center hover:scale-110 transition-all z-50 animate-bounce dark:bg-gradient-to-r dark:text-white",
            },
            e.createElement(R, { className: "w-6 h-6" }),
          ),
      )
    : e.createElement(
        "div",
        {
          className:
            "mhub-page-feedback min-h-screen mhub-premium-page mhub-page-pad-bottom bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 dark:bg-gradient-to-br",
          style: { minHeight: "100vh" },
        },
        e.createElement(
          "div",
          { className: "pt-10 pb-8 px-6 text-center mhub-hero-card rounded-3xl max-w-2xl mx-auto" },
          e.createElement(
            "div",
            {
              className:
                "w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-2xl dark:bg-gradient-to-br",
            },
            e.createElement(g, { className: "w-8 h-8 text-white dark:text-white" }),
          ),
          e.createElement(
            "h1",
            { className: "text-[clamp(24px,2.6vw,36px)] font-bold text-white mb-2" },
            t("feedback") || "Feedback",
          ),
          e.createElement(
            "p",
            { className: "text-[clamp(12px,1.3vw,16px)] leading-[1.5] text-white/80 max-w-md mx-auto" },
            t("feedback_login_desc") ||
              "We value your feedback! Please login to share your thoughts.",
          ),
        ),
        e.createElement(
          "div",
          { className: "max-w-2xl mx-auto px-6 space-y-4" },
          e.createElement(
            I,
            {
              to: "/login",
              className:
                "block mhub-premium-surface rounded-2xl p-6 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300",
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
                e.createElement(oe, { className: "w-7 h-7 text-white dark:text-white" }),
              ),
              e.createElement(
                "div",
                { className: "flex-1" },
                e.createElement(
                  "h3",
                  { className: "text-xl font-bold text-gray-900 dark:text-gray-100" },
                  t("login") || "Login",
                ),
                e.createElement(
                  "p",
                  { className: "text-gray-500 text-sm dark:text-gray-300" },
                  t("login_desc") || "Already have an account? Sign in here",
                ),
              ),
              e.createElement(L, { className: "w-6 h-6 text-gray-400 dark:text-gray-300" }),
            ),
          ),
          e.createElement(
            I,
            {
              to: "/signup",
              className:
                "block bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-xl hover:shadow-2xl hover:bg-white/20 hover:scale-[1.02] transition-all duration-300 dark:bg-slate-900/10 dark:border dark:border-white/20 dark:hover:bg-slate-900/20",
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
                e.createElement(j, { className: "w-7 h-7 text-white dark:text-white" }),
              ),
              e.createElement(
                "div",
                { className: "flex-1" },
                e.createElement(
                  "h3",
                  { className: "text-xl font-bold text-white dark:text-white" },
                  t("signup") || "Create Account",
                ),
                e.createElement(
                  "p",
                  { className: "text-white/70 text-sm dark:text-white/70" },
                  t("signup_desc") || "New user? Join us in just a few steps",
                ),
              ),
              e.createElement(L, { className: "w-6 h-6 text-white/60 dark:text-white/60" }),
            ),
          ),
        ),
      );
};
var _e = FeedbackPage;
export { _e as default };

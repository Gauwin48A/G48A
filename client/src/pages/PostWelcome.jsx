import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  CheckCircle2,
  Crown,
  Lightbulb,
  Loader2,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Star,
  Zap,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import api from "@/services/api";
import { subscribeSubscriptionUpdated } from "@/utils/appStateEvents";
import { getUserId, isAuthenticated } from "@/utils/authStorage";
import { useCmsPage } from "@/hooks/useCmsPage";

const PLAN_META = {
  premium: {
    label: "Premium",
    Icon: Crown,
    badgeClass: "bg-amber-500 text-white",
    accent: "from-amber-500 to-orange-600",
    ring: "ring-amber-400/40",
  },
  silver: {
    label: "Silver",
    Icon: ShieldCheck,
    badgeClass: "bg-blue-500 text-white",
    accent: "from-blue-500 to-indigo-600",
    ring: "ring-blue-400/40",
  },
  bronze: {
    label: "Bronze",
    Icon: Star,
    badgeClass: "bg-orange-500 text-white",
    accent: "from-orange-400 to-amber-600",
    ring: "ring-orange-400/40",
  },
  basic: {
    label: "Basic",
    Icon: Sparkles,
    badgeClass: "bg-slate-500 text-white",
    accent: "from-slate-500 to-slate-700",
    ring: "ring-slate-400/30",
  },
};

const POPULAR_STARTS_KEYS = [
  { labelKey: "category_electronics", labelFallback: "Electronics", category: "Electronics" },
  { labelKey: "category_vehicles", labelFallback: "Vehicles", category: "Vehicles" },
  { labelKey: "category_fashion", labelFallback: "Fashion", category: "Fashion" },
];

const TIER_SEEN_KEY = "mhub_tier_seen";

const normalizePlan = (value) => {
  if (!value) return "";
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return "";
  if (normalized.includes("premium")) return "premium";
  if (normalized.includes("silver")) return "silver";
  if (normalized.includes("bronze")) return "bronze";
  if (normalized.includes("basic") || normalized.includes("free")) return "basic";
  return normalized;
};

const formatDisplayDate = (value) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const getDaysRemaining = (value) => {
  if (!value) return 0;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 0;
  return Math.max(0, Math.ceil((parsed.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
};

const isRequestCanceled = (error) =>
  error?.name === "CanceledError" || error?.code === "ERR_CANCELED";

// Flow step pill component
function FlowStep({ number, label, active, done }) {
  return (
    <div role="status" className="flex items-center gap-1.5">
      <div
        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all duration-200 ${
          done
            ? "bg-emerald-500 text-white shadow-sm"
            : active
            ? "bg-emerald-500 text-white ring-4 ring-emerald-500/30 shadow-sm"
            : "bg-slate-200 text-slate-400 dark:bg-gray-700 dark:text-gray-500"
        }`}
      >
        {done ? <CheckCircle2 className="h-4 w-4" /> : number}
      </div>
      <span
        className={`text-xs font-semibold sm:text-xs ${
          active ? "text-slate-800 dark:text-white" : done ? "text-emerald-600" : "text-slate-400 dark:text-gray-500"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

function StepConnector({ done }) {
  return (
    <div
      className={`mx-1 h-0.5 w-8 rounded-full transition-all duration-700 ease-out sm:w-12 ${
        done ? "bg-emerald-500" : "bg-slate-200 dark:bg-gray-700"
      }`}
    />
  );
}

export default function PostWelcome() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const tr = (key, fallback, options = {}) =>
    t(key, { defaultValue: fallback, ...options });
  const { data: cmsContent } = useCmsPage("post-welcome");

  const [subscriptionState, setSubscriptionState] = useState({
    loading: true,
    error: "",
    currentPlan: "",
    postCredits: 0,
    subscription: null,
  });
  const [tierSeen, setTierSeen] = useState(false);

  const loadSubscription = useCallback(
    async (signal) => {
      const isAuthed = isAuthenticated(user);
      const userId = getUserId(user);

      if (!isAuthed || !userId) {
        setSubscriptionState({
          loading: false,
          error: "",
          currentPlan: user?.current_plan || user?.tier || "",
          postCredits: user?.post_credits || 0,
          subscription: null,
        });
        return;
      }

      setSubscriptionState((prev) => ({
        ...prev,
        loading: true,
        error: "",
      }));

      try {
        const response = await api.get(
          "/subscriptions/my",
          signal ? { signal, skipActiveAppFilter: true } : { skipActiveAppFilter: true },
        );
        if (signal?.aborted) return;
        const payload = response?.data ?? response ?? {};
        setSubscriptionState({
          loading: false,
          error: "",
          currentPlan: payload?.currentPlan || payload?.current_plan || "",
          postCredits: payload?.postCredits || 0,
          subscription: payload?.subscription || null,
        });
      } catch (err) {
        if (signal?.aborted || isRequestCanceled(err)) {
          return;
        }
        setSubscriptionState({
          loading: false,
          error: err?.message || "Unable to load subscription",
          currentPlan: user?.current_plan || user?.tier || "",
          postCredits: user?.post_credits || 0,
          subscription: null,
        });
      }
    },
    [user],
  );

  useEffect(() => {
    document.title = "MHub — Publish a Listing";
    window.scrollTo({ top: 0, behavior: "smooth" });
    return () => { document.title = "MHub"; };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setTierSeen(sessionStorage.getItem(TIER_SEEN_KEY) === "1");
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadSubscription(controller.signal);
    return () => { controller.abort(); };
  }, [loadSubscription]);

  useEffect(() => subscribeSubscriptionUpdated(() => loadSubscription()), [loadSubscription]);

  const rawPlan =
    subscriptionState.currentPlan ||
    subscriptionState.subscription?.planName ||
    user?.current_plan ||
    user?.tier ||
    "";
  const normalizedPlan = useMemo(() => normalizePlan(rawPlan), [rawPlan]);
  const planMetaMap = useMemo(() => {
    const overrides =
      cmsContent?.planMeta && typeof cmsContent.planMeta === "object"
        ? cmsContent.planMeta
        : {};
    return Object.keys(PLAN_META).reduce((acc, key) => {
      const base = PLAN_META[key];
      const override = overrides?.[key];
      acc[key] = override ? { ...base, ...override } : base;
      return acc;
    }, {});
  }, [cmsContent]);
  const popularStarts = useMemo(
    () =>
      Array.isArray(cmsContent?.popularStarts)
        ? cmsContent.popularStarts
        : POPULAR_STARTS_KEYS,
    [cmsContent],
  );
  const planKey = normalizedPlan || "basic";
  const subscription = subscriptionState.subscription;
  const isLoading = subscriptionState.loading;
  const postCredits =
    Number(subscriptionState.postCredits || user?.post_credits || 0) || 0;
  const subscriptionExpiresAt = subscription?.expiresAt
    ? new Date(subscription.expiresAt)
    : null;
  const hasActiveSubscription =
    subscription &&
    subscription.isActive !== false &&
    (!subscriptionExpiresAt ||
      (!Number.isNaN(subscriptionExpiresAt.getTime()) &&
        subscriptionExpiresAt > new Date()));

  // FIXED: Trust server's currentPlan even when there is no subscription record.
  // Admins can set current_plan directly on the users table (e.g. "bronze") without
  // creating a user_subscriptions row. In that case subscription===null but the user
  // legitimately has that plan.  We treat an unexpired or unset plan as eligible.
  const hasDirectPlanGrant =
    planKey !== "basic" &&
    Boolean(rawPlan) &&
    (!subscriptionExpiresAt ||
      (!Number.isNaN(subscriptionExpiresAt.getTime()) &&
        subscriptionExpiresAt > new Date()));

  const canPost =
    planKey !== "basic"
      ? Boolean(hasActiveSubscription) || hasDirectPlanGrant
      : postCredits > 0;
  const hasPlan = Boolean(rawPlan);
  const isEligible = Boolean(canPost);
    const planMeta = planMetaMap[planKey] || planMetaMap.basic;
  const PlanIcon = planMeta.Icon || Sparkles;
  const planLabel = hasPlan ? planMeta.label : tr("choose_plan", "Choose a plan");
  const planAccent = hasPlan ? planMeta.accent : "from-slate-500 to-slate-700";
  const expiryLabel = formatDisplayDate(subscription?.expiresAt);
  const daysRemaining = getDaysRemaining(subscription?.expiresAt);
  const isTrial = Boolean(subscription?.isTrial);

  // Flow steps: 1=Plan, 2=Pay, 3=Post
  // If eligible, they've passed steps 1+2, currently on step 3
  const currentFlowStep = isEligible ? 3 : 1;

  const heroTips = [
    {
      icon: Lightbulb,
      title: tr("welcome_tip_title_1", "Lead with a searchable title"),
      desc: tr(
        "welcome_tip_desc_1",
        "Use brand, model, size, or condition in the first few words.",
      ),
    },
    {
      icon: Zap,
      title: tr("welcome_tip_title_2", "Show proof in the first photo"),
      desc: tr(
        "welcome_tip_desc_2",
        "Front angle, close-up details, and working condition outperform generic shots.",
      ),
    },
    {
      icon: Star,
      title: tr("welcome_tip_title_3", "Price with a reason"),
      desc: tr(
        "welcome_tip_desc_3",
        "Mention warranty, accessories, or service history to justify your price.",
      ),
    },
  ];

  const markTierSeen = () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(TIER_SEEN_KEY, "1");
    }
    setTierSeen(true);
  };

  // FIXED: navigate to /subcategories?flow=post, not /category-hub
  const handlePrimary = () => {
    if (isEligible) {
      navigate(`/subcategories?flow=post&tier=${planKey}`);
      return;
    }
    markTierSeen();
    navigate(`/tier-selection?returnTo=${encodeURIComponent("/post-welcome")}`);
  };

  const handlePlan = () => {
    if (!isEligible) markTierSeen();
    navigate(`/tier-selection?returnTo=${encodeURIComponent("/post-welcome")}`);
  };

  // FIXED: popular category also goes to /subcategories?flow=post
  const handlePopularStart = (category) => {
    if (!isEligible) {
      handlePlan();
      return;
    }
    navigate(`/subcategories?flow=post&tier=${planKey}&category=${encodeURIComponent(category)}`);
  };

  return (
    <div className="min-h-screen mhub-premium-page nav-clearance bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:bg-gradient-to-br">
      <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } } @keyframes gradientShift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } } @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
      {/* Top flow progress bar */}
      <div className="sticky top-0 z-20 mhub-premium-bar">
        <div className="mx-auto flex max-w-[640px] items-center justify-between px-4 py-3 relative">
          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
            {tr("publish_flow", "Publish Flow")}
          </span>
          <div className="flex items-center gap-1">
            <FlowStep number={1} label={tr("step_choose_plan", "Choose Plan")} active={currentFlowStep === 1} done={currentFlowStep > 1} />
            <StepConnector done={currentFlowStep > 1} />
            <FlowStep number={2} label={tr("step_pay", "Pay")} active={currentFlowStep === 2} done={currentFlowStep > 2} />
            <StepConnector done={currentFlowStep > 2} />
            <FlowStep number={3} label={tr("step_post", "Post")} active={currentFlowStep === 3} done={false} />
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[640px] px-4 py-10 md:py-14">
        <div className="grid items-start gap-4 sm:gap-8 md:grid-cols-[1.1fr_0.9fr]">
          {/* LEFT: Hero copy + CTA + tips */}
          <div className="space-y-6 order-2 md:order-1">
            {/* Eyebrow badge */}
            <div className="opacity-0 animate-[fadeIn_0.5s_ease-out_forwards] inline-flex items-center gap-2 rounded-full border border-[var(--chip-border)] bg-[var(--chip-bg)] px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm dark:text-gray-400 dark:border-[var(--chip-border)] dark:bg-[var(--chip-bg)] dark:text-slate-200" style={{ animationDelay: "0ms" }}>
              <Sparkles className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-300" aria-hidden="true" />
              {isEligible
                ? tr("ready_to_post_label", "Ready to post")
                : tr("subscribe_to_post_label", "Subscribe to start posting")}
            </div>

            {/* Headline */}
            <h1 className="opacity-0 animate-[fadeIn_0.5s_ease-out_forwards] text-2xl sm:text-3xl font-black tracking-tight mhub-gradient-text md:text-4xl lg:text-5xl" style={{ animationDelay: "100ms" }}>
              {isEligible
                ? tr("welcome_publish_title_eligible", "Ready to publish today?")
                : tr("welcome_publish_title_ineligible", "Start publishing today")}
            </h1>

            <p className="opacity-0 animate-[fadeIn_0.5s_ease-out_forwards] text-base text-slate-500 md:text-lg dark:text-slate-300" style={{ animationDelay: "200ms" }}>
              {isEligible
                ? tr(
                    "welcome_publish_subtitle_eligible",
                    "Pick a category, add details, and get your post live in minutes.",
                  )
                : tr(
                    "welcome_publish_subtitle_ineligible",
                    "Subscribe once to unlock fast posting and reach more buyers.",
                  )}
            </p>

            {/* Error notice */}
            {subscriptionState.error ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-600/40 dark:bg-amber-950/20 dark:text-amber-200">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-amber-900 dark:text-amber-200">
                      {tr("subscription_status_unavailable", "Plan status temporarily unavailable")}
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-300">{subscriptionState.error}</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-amber-300 text-amber-700 hover:bg-amber-100 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-500 dark:border-amber-600/40 dark:text-amber-300 dark:hover:bg-amber-950/20"
                    onClick={() => loadSubscription()}
                  >
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    {tr("try_again", "Try again")}
                  </Button>
                </div>
              </div>
            ) : null}

            {/* Tier-seen hint */}
            {!isEligible && tierSeen ? (
              <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700 dark:border-blue-900 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-600/40 dark:text-blue-300">
                <Crown className="h-3.5 w-3.5 flex-shrink-0 text-blue-500 dark:text-blue-300" />
                <span>
                  {tr(
                    "tier_seen_hint",
                    "You viewed plans earlier. Tap \"Review Plans\" to compare again.",
                  )}
                </span>
              </div>
            ) : null}

            {/* CTA buttons */}
            <div className="opacity-0 animate-[fadeIn_0.5s_ease-out_forwards] flex flex-wrap items-center gap-3" style={{ animationDelay: "300ms" }}>
              <Button
                onClick={handlePrimary}
                disabled={isLoading}
                aria-busy={isLoading}
                className="h-12 w-full max-w-[280px] rounded-xl bg-emerald-500 px-6 text-base font-bold text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-400 hover:shadow-xl hover:shadow-emerald-500/40 transition-all active:scale-[0.98] active:shadow-lg active:shadow-emerald-500/20 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 dark:bg-emerald-800/30 dark:text-white dark:hover:bg-emerald-800/30"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    {tr("loading", "Loading...")}
                  </>
                ) : isEligible ? (
                  <>
                    {tr("start_posting_cta", "Start Posting")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                ) : (
                  <>
                    {tr("choose_plan_cta", "Choose a Plan")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={handlePlan}
                className="h-12 rounded-xl border-slate-300 px-4 text-sm font-semibold text-slate-600 hover:bg-gray-50 hover:text-slate-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-500 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-gray-950 dark:hover:text-slate-100"
              >
                {tr("review_plans", "Review Plans")}
              </Button>
            </div>

            {!isEligible ? (
              <p className="text-sm text-slate-400 dark:text-slate-300">
                {tr(
                  "publish_subscribe_hint",
                  "Choose a plan once and manage it anytime from your profile.",
                )}
              </p>
            ) : null}

            {/* Popular categories */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-300">
                {tr("popular_starts", "Quick starts")}
              </p>
              <div className="flex flex-wrap gap-2">
              {popularStarts.map((item) => (
                  <button
                    key={item.category}
                    type="button"
                    aria-label={tr(item.labelKey, item.labelFallback)}
                    onClick={() => handlePopularStart(item.category)}
                    className="group rounded-full border border-[var(--chip-border)] bg-[var(--chip-bg)] px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition-all hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 hover:shadow-md hover:shadow-emerald-500/10 active:scale-95 dark:text-gray-300 dark:hover:border-emerald-400 dark:hover:bg-emerald-950/20 dark:hover:text-emerald-400 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-500 dark:border-[var(--chip-border)] dark:bg-[var(--chip-bg)] dark:text-slate-200 dark:hover:border-emerald-600/40 dark:hover:text-emerald-300"
                  >
                    {tr(item.labelKey, item.labelFallback)}
                    <ArrowRight className="inline ml-1 h-3 w-3 opacity-0 -translate-x-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0" />
                  </button>
                ))}
              </div>
            </div>

            {/* Tip cards */}
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {heroTips.map((tip) => {
                const TipIcon = tip.icon;
                return (
                  <div
                    key={tip.title}
                    className="group rounded-2xl mhub-premium-surface p-4 transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-xl hover:shadow-emerald-500/10 mhub-shine"
                  >
                    <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950/20">
                      <TipIcon className="h-4 w-4 text-emerald-600 group-hover:scale-110 transition-transform duration-300 dark:text-emerald-300" />
                    </div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{tip.title}</p>
                    <p className="mt-1 text-xs text-slate-500 leading-relaxed dark:text-slate-300">{tip.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: Plan status card — shown first on mobile */}
          <div className="space-y-4 order-1 md:order-2">
            {isLoading ? (
              <div className="space-y-4">
                <div className="rounded-2xl mhub-premium-surface p-5">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 bg-[length:200%_100%] animate-[shimmer_1.5s_ease-in-out_infinite] dark:bg-gradient-to-r" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-20 rounded bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 bg-[length:200%_100%] animate-[shimmer_1.5s_ease-in-out_infinite] dark:bg-gradient-to-r" />
                      <div className="h-6 w-32 rounded bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 bg-[length:200%_100%] animate-[shimmer_1.5s_ease-in-out_infinite] dark:bg-gradient-to-r" />
                      <div className="h-3 w-40 rounded bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 bg-[length:200%_100%] animate-[shimmer_1.5s_ease-in-out_infinite] dark:bg-gradient-to-r" />
                    </div>
                  </div>
                </div>
                <div className="h-14 rounded-2xl bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 bg-[length:200%_100%] animate-[shimmer_1.5s_ease-in-out_infinite] dark:bg-gradient-to-r" />
                <div className="rounded-2xl mhub-premium-surface p-5 space-y-4">
                  <div className="h-3 w-24 rounded bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 bg-[length:200%_100%] animate-[shimmer_1.5s_ease-in-out_infinite] dark:bg-gradient-to-r" />
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 bg-[length:200%_100%] animate-[shimmer_1.5s_ease-in-out_infinite] dark:bg-gradient-to-r" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 w-28 rounded bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 bg-[length:200%_100%] animate-[shimmer_1.5s_ease-in-out_infinite] dark:bg-gradient-to-r" />
                        <div className="h-2.5 w-40 rounded bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 bg-[length:200%_100%] animate-[shimmer_1.5s_ease-in-out_infinite] dark:bg-gradient-to-r" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* Plan badge card */}
                <div
                  className={`rounded-2xl bg-gradient-to-br ${planAccent} p-[2px] shadow-xl ring-4 ${planMeta.ring}${hasActiveSubscription ? " shadow-lg shadow-emerald-500/10 dark:shadow-emerald-400/5" : ""}`}
                >
                  <div className="rounded-2xl mhub-premium-surface p-5">
                    <div className="flex items-start gap-4">
                      <div className={`rounded-xl bg-gradient-to-br ${planAccent} p-3`}>
                        <PlanIcon className="h-6 w-6 text-white dark:text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-300">
                          {isEligible
                            ? tr("active_plan", "Active Plan")
                            : tr("plan_label", "Plan")}
                        </p>
                        <p className="text-lg sm:text-2xl font-black text-slate-900 dark:text-slate-100">{planLabel}</p>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                          {isTrial && expiryLabel
                            ? tr("trial_days_left", "Trial active · {{count}} days left", { count: daysRemaining })
                            : expiryLabel
                            ? tr("plan_expires_on", "Expires {{date}}", { date: expiryLabel })
                            : planKey === "basic"
                            ? `${tr("post_credits", "Post credits")}: ${postCredits}`
                            : tr("plan_ready_to_publish", "Ready for publishing")}
                        </p>
                      </div>
                      <Badge
                        className={
                          isEligible
                            ? `${planMeta.badgeClass} text-xs`
                            : "bg-slate-100 text-slate-500 text-xs"
                        }
                      >
                        {isEligible
                          ? isTrial
                            ? tr("trial_active", "Trial")
                            : tr("subscribed", "Active")
                          : tr("choose_plan", "No Plan")}
                      </Badge>
                    </div>

                    {isEligible && daysRemaining > 0 ? (
                      <div className="mt-4">
                        <div className="mb-1 flex items-center justify-between text-xs text-slate-400 dark:text-slate-300">
                          <span>{tr("days_remaining", "Days remaining")}</span>
                          <span className="font-bold text-slate-600 dark:text-slate-200">{daysRemaining}d</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-950">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-1000 ease-out dark:bg-gradient-to-r"
                            style={{
                              width: `${Math.min(100, Math.round((daysRemaining / 365) * 100))}%`,
                            }}
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Ready to post pill */}
                {isEligible ? (
                  <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900 dark:bg-emerald-950/20 dark:border-emerald-600/40">
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-500 animate-pulse dark:text-emerald-300" />
                    <div>
                      <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                        {tr("you_can_post_now", "You can post right now")}
                      </p>
                      <p className="text-xs text-emerald-600/70 dark:text-emerald-300/70">
                        {tr("pick_category_hint", "Pick a category below or use a quick start.")}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 rounded-2xl mhub-premium-surface px-4 py-3">
                    <Sparkles className="h-5 w-5 flex-shrink-0 text-slate-400 dark:text-slate-300" aria-hidden="true" />
                    <div>
                      <p className="text-sm font-bold text-slate-600 dark:text-slate-200">
                        {tr("subscription_needed", "Subscription required")}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-300">
                        {tr("choose_plan_to_post", "Choose a plan to start posting.")}
                      </p>
                    </div>
                  </div>
                )}

                {/* How it works steps */}
                <div className="rounded-2xl mhub-premium-surface mhub-shine p-5">
                  <p className="mb-4 text-xs font-semibold uppercase tracking-widest mhub-gradient-text">
                    {tr("how_it_works", "How it works")}
                  </p>
                  <div className="space-y-1">
                    {[
                      {
                        n: "01",
                        title: tr("step_pick_category", "Pick a category"),
                        desc: tr("step_pick_category_desc", "Choose where your listing fits best."),
                        done: isEligible,
                      },
                      {
                        n: "02",
                        title: tr("step_add_details", "Add details"),
                        desc: tr("step_add_details_desc", "Share price, photos, and condition."),
                        done: false,
                      },
                      {
                        n: "03",
                        title: tr("step_publish", "Publish"),
                        desc: tr("step_publish_desc", "Go live and reach buyers instantly."),
                        done: false,
                      },
                    ].map((step, idx) => (
                      <div key={step.n} className="opacity-0 animate-[fadeIn_0.5s_ease-out_forwards]" style={{ animationDelay: `${idx * 150}ms` }}>
                        <div className="flex items-start gap-3 py-2">
                          <div
                            className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-xs font-black transition-colors ${
                              step.done
                                ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/30"
                                : "bg-slate-100 text-slate-400 dark:bg-gray-700 dark:text-gray-500"
                            }`}
                          >
                            {step.done ? <CheckCircle2 className="h-4 w-4" /> : step.n}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{step.title}</p>
                            <p className="text-xs text-slate-400 leading-relaxed dark:text-slate-300">{step.desc}</p>
                          </div>
                        </div>
                        {idx < 2 ? (
                          <div className="ml-4 h-3 border-l-2 border-dashed border-slate-200 dark:border-slate-700" />
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rewards nudge */}
                <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-violet-50 p-4 dark:border-indigo-900 dark:from-indigo-950/20 dark:to-violet-950/20 bg-[length:200%_200%] animate-[gradientShift_6s_ease_infinite] dark:border-indigo-600/40 dark:bg-gradient-to-br">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-950/20">
                      <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-300" aria-hidden="true" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-indigo-800 dark:text-indigo-200">
                        {tr("welcome_prompt_title", "What are you listing today?")}
                      </p>
                      <p className="mt-1 text-xs text-indigo-600/70 leading-relaxed dark:text-indigo-300/70">
                        {tr(
                          "welcome_referral_hint",
                          "Invite friends and build coin balance while you prepare your first post.",
                        )}
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        className="mt-3 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 dark:bg-indigo-700/40 dark:text-white dark:hover:bg-indigo-800/30"
                        onClick={() => navigate("/rewards")}
                      >
                        {tr("earn_extra_rewards", "Earn extra rewards")}
                        <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

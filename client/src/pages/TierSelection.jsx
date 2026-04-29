import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronDown,
  Clock,
  Crown,
  Loader2,
  Shield,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import api from "@/lib/api";
import { fetchWithCache } from "@/lib/requestCache";
import { hasAuthSession, getUserId } from "@/utils/authStorage";
import { useToast } from "@/hooks/use-toast";
import { navigateBack } from "@/utils/navigation";
import { emitSubscriptionUpdated } from "@/utils/appStateEvents";
import { useCmsPage } from "@/hooks/useCmsPage";
import PageDensityToggle from "@/components/ui/PageDensityToggle";
import { usePageDensity } from "@/hooks/usePageDensity";

const tierPlans = [
  {
    key: "basic",
    nameKey: "basic_plan",
    nameFallback: "Basic",
    subtitleKey: "basic_subtitle",
    subtitleFallback: "Quick one-time listing",
    price: "₹500",
    periodKey: "per_listing",
    periodFallback: "per listing",
    perPostCost: "₹500/post",
    icon: Clock,
    cardBg: "mhub-premium-surface",
    iconBg: "bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 shadow-sm",
    iconColor: "text-slate-600 dark:text-slate-200",
    priceColor: "text-slate-900 dark:text-white",
    accentColor: "text-slate-600 dark:text-slate-300",
    buttonClass: "bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 text-white shadow-md shadow-slate-500/20 hover:shadow-lg",
    trialButtonClass: "",
    ctaLabel: "Get Basic",
    features: [
      { key: "single_listing_credit", label: "1 listing credit", included: true },
      { key: "visibility_15_days", label: "15 days visibility", included: true },
      { key: "standard_reach", label: "Standard search reach", included: true },
      { key: "no_boosts", label: "No boosts or promotions", included: false },
      { key: "no_analytics", label: "No analytics", included: false },
      { key: "no_badge", label: "No seller badge", included: false },
    ],
  },
  {
    key: "bronze",
    nameKey: "bronze_seller",
    nameFallback: "Bronze Seller",
    subtitleKey: "bronze_subtitle",
    subtitleFallback: "For casual sellers",
    price: "₹850",
    periodKey: "per_3_months",
    periodFallback: "per 3 months",
    perPostCost: "₹8.50/post",
    icon: Shield,
    cardBg: "mhub-premium-surface border border-amber-200/60 dark:border-amber-500/20",
    iconBg: "bg-gradient-to-br from-amber-100 to-orange-200 dark:from-amber-800/30 dark:to-orange-700/20 shadow-sm shadow-amber-200/50",
    iconColor: "text-amber-700 dark:text-amber-300",
    priceColor: "text-slate-900 dark:text-white",
    accentColor: "text-amber-700 dark:text-amber-300",
    buttonClass: "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-semibold shadow-md shadow-amber-500/25 hover:shadow-lg hover:shadow-amber-500/30",
    trialButtonClass: "border-amber-400 text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-500/10",
    ctaLabel: "Get Bronze",
    features: [
      { key: "up_to_100_listings", label: "Up to 100 listings", included: true },
      { key: "visibility_30_days", label: "30 days visibility per listing", included: true },
      { key: "medium_search", label: "Medium search priority", included: true },
      { key: "seller_badge", label: "Seller badge", included: true },
      { key: "basic_analytics", label: "Basic analytics", included: true },
      { key: "no_boosts_bronze", label: "No boosts (use coins to boost)", included: false },
    ],
  },
  {
    key: "silver",
    nameKey: "silver_seller",
    nameFallback: "Silver Seller",
    subtitleKey: "silver_subtitle",
    subtitleFallback: "Most popular",
    price: "₹1,200",
    periodKey: "per_6_months",
    periodFallback: "per 6 months",
    perPostCost: "₹6/post",
    icon: Sparkles,
    cardBg: "mhub-premium-surface border border-sky-200/60 dark:border-sky-500/20",
    iconBg: "bg-gradient-to-br from-sky-100 to-blue-200 dark:from-sky-800/30 dark:to-blue-700/20 shadow-sm shadow-sky-200/50",
    iconColor: "text-sky-600 dark:text-sky-300",
    priceColor: "text-slate-900 dark:text-white",
    accentColor: "text-sky-700 dark:text-sky-300",
    buttonClass: "bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white shadow-md shadow-sky-500/25 hover:shadow-lg hover:shadow-sky-500/30",
    trialButtonClass: "border-sky-400 text-sky-700 hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-sky-500/10",
    popular: true,
    ctaLabel: "Get Silver",
    features: [
      { key: "up_to_200_listings", label: "Up to 200 listings", included: true },
      { key: "visibility_30_days", label: "30 days visibility per listing", included: true },
      { key: "boosts_featured_period", label: "5 boosts + 5 featured + 5 spotlights / 6 months", included: true },
      { key: "verified_badge", label: "Verified seller badge", included: true },
      { key: "priority_search", label: "Priority search ranking", included: true },
      { key: "full_analytics", label: "Full analytics dashboard", included: true },
      { key: "trial_7_days", label: "7-day free trial", included: true },
    ],
  },
  {
    key: "premium",
    nameKey: "premium",
    nameFallback: "Premium",
    subtitleKey: "premium_subtitle",
    subtitleFallback: "Best value — Power Sellers",
    price: "₹1,500",
    periodKey: "per_year",
    periodFallback: "per 12 months",
    perPostCost: "Unlimited",
    icon: Crown,
    cardBg: "mhub-premium-surface bg-gradient-to-br from-amber-50/80 to-yellow-50/60 dark:from-amber-900/15 dark:to-yellow-900/10 border border-amber-200/70 dark:border-amber-400/30 ring-2 ring-amber-400/50",
    iconBg: "bg-gradient-to-br from-amber-200 to-yellow-300 dark:from-amber-700/30 dark:to-yellow-600/20 shadow-md shadow-amber-300/40",
    iconColor: "text-amber-800 dark:text-yellow-300",
    priceColor: "text-slate-900 dark:text-white",
    accentColor: "text-amber-700 dark:text-amber-300",
    buttonClass: "bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-400 hover:from-amber-400 hover:via-yellow-400 hover:to-amber-300 text-slate-900 font-bold shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40",
    trialButtonClass: "border-amber-400 text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-500/10",
    featured: true,
    ctaLabel: "Go Premium",
    features: [
      { key: "unlimited_listings", label: "Unlimited listings", included: true },
      { key: "visibility_45_days", label: "45 days visibility", included: true },
      { key: "boosts_featured_spotlight", label: "5 boosts + 5 featured + 5 spotlights / month", included: true },
      { key: "crown_badge", label: "Crown badge", included: true },
      { key: "top_priority", label: "Top of feed priority", included: true },
      { key: "premium_ad_exposure", label: "Premium ad exposure on listings", included: true },
      { key: "priority_support", label: "Priority support", included: true },
      { key: "full_analytics_premium", label: "Full analytics dashboard", included: true },
      { key: "trial_14_days", label: "14-day free trial", included: true },
    ],
  },
];

const PLAN_PRICE_VALUE = {
  basic: 500,
  bronze: 850,
  silver: 1200,
  premium: 1500,
};

const PLAN_PERIOD_MONTHS = {
  basic: 0,
  bronze: 3,
  silver: 6,
  premium: 12,
};

const TIER_SEEN_KEY = "mhub_tier_seen";

const normalizePlan = (value) => String(value || "").trim().toLowerCase();

const parseNumericValue = (value) => {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const normalized = String(value).replace(/[^\d.]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const mapPlanOverrides = (items) => {
  if (!Array.isArray(items)) return {};
  return items.reduce((acc, item) => {
    const key = normalizePlan(item?.key || item?.name || item?.slug || item?.tier || item?.plan);
    if (!key) return acc;
    acc[key] = item;
    return acc;
  }, {});
};

const normalizeFeatureList = (features) => {
  if (!Array.isArray(features) || features.length === 0) return null;
  return features
    .map((feature, index) => {
      if (!feature) return null;
      if (typeof feature === "string") {
        return { key: `feature_${index}`, label: feature, included: true };
      }
      const key =
        feature.key ||
        feature.labelKey ||
        feature.label ||
        feature.title ||
        `feature_${index}`;
      return {
        key,
        label:
          feature.label ||
          feature.title ||
          feature.name ||
          feature.fallback ||
          feature.fallbackLabel ||
          "",
        included: feature.included !== false,
      };
    })
    .filter(Boolean);
};

const formatPeriodFallback = (value) => {
  if (!value) return "";
  const normalized = String(value).trim();
  if (!normalized) return "";
  return normalized.toLowerCase().startsWith("per")
    ? normalized
    : `per ${normalized}`;
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

// FAQ accordion item with smooth animation
let faqIdCounter = 0;
function FaqItem({ question, answer }) {
  const [open, setOpen] = useState(false);
  const [ids] = useState(() => {
    const id = ++faqIdCounter;
    return { button: `faq-btn-${id}`, content: `faq-content-${id}` };
  });
  return (
    <div className="border-b border-slate-200 dark:border-gray-700 last:border-0 dark:border-slate-700 dark:last:border-0">
      <button
        type="button"
        id={ids.button}
        aria-controls={ids.content}
        className="flex w-full items-center justify-between py-4 text-left group focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 rounded-lg"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors dark:text-slate-200 dark:group-hover:text-slate-100">{question}</span>
        <span className={`ml-2 flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
          <ChevronDown className="h-4 w-4 text-slate-400 dark:text-slate-300" />
        </span>
      </button>
      <div
        id={ids.content}
        role="region"
        aria-labelledby={ids.button}
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          display: "grid",
          gridTemplateRows: open ? "1fr" : "0fr",
          opacity: open ? 1 : 0,
        }}
      >
        <div className="min-h-0">
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed pb-4 dark:text-slate-300">{answer}</p>
        </div>
      </div>
    </div>
  );
}

export default function TierSelection() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { density, setDensity } = usePageDensity("mhub_tier_density");
  const densityClass = density === "compact" ? "mhub-compact" : "";
  // CRITICAL FIX: wrap tr in useCallback so it has a stable reference.
  // Without this, tr is a new function on every render → fetchCurrentSubscription
  // and fetchSubscriptionHistory (which list tr in their deps) also recreate every
  // render → their useEffects re-fire every render → infinite API call loop → page hangs.
  const tr = useCallback(
    (key, fallback, options = {}) => t(key, { defaultValue: fallback, ...options }),
    [t],
  );
  const { toast } = useToast();
  const { data: cmsContent } = useCmsPage("tier-selection");
  const [planOverrides, setPlanOverrides] = useState({});

  useEffect(() => {
    document.title = "MHub — Choose a Plan";
    window.scrollTo({ top: 0, behavior: "smooth" });
    return () => { document.title = "MHub"; };
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadPlans = async () => {
      try {
        const res = await fetchWithCache(
          "subscriptions:plans",
          () => api.get("/subscriptions/plans", { skipActiveAppFilter: true }),
          { ttlMs: 5 * 60 * 1000 },
        );
        const payload = res?.data ?? res ?? {};
        const list = Array.isArray(payload?.plans)
          ? payload.plans
          : Array.isArray(payload)
            ? payload
            : [];
        if (mounted) {
          setPlanOverrides(mapPlanOverrides(list));
        }
      } catch {
        if (mounted) {
          setPlanOverrides({});
        }
      }
    };
    loadPlans();
    return () => {
      mounted = false;
    };
  }, []);

  const [processingTier, setProcessingTier] = useState(null);
  const [processingTrial, setProcessingTrial] = useState(null);
  const [activatedTier, setActivatedTier] = useState(null);
  const [error, setError] = useState(null);
  const [lastAttemptedTier, setLastAttemptedTier] = useState(null);
  const [flashSale, setFlashSale] = useState(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [listingsPerMonth, setListingsPerMonth] = useState(4);
  const [subscriptionSummary, setSubscriptionSummary] = useState({
    loading: true,
    error: "",
    currentPlan: "",
    subscription: null,
  });
  const [subscriptionHistoryState, setSubscriptionHistoryState] = useState({
    loading: true,
    error: "",
    items: [],
  });
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  const fetchCurrentSubscription = useCallback(async () => {
    const userId = getUserId();
    const hasSession = hasAuthSession();

    if (!userId || !hasSession) {
      setSubscriptionSummary({
        loading: false,
        error: "",
        currentPlan: "",
        subscription: null,
      });
      return null;
    }

    setSubscriptionSummary((prev) => ({
      ...prev,
      loading: true,
      error: "",
    }));

    try {
      const response = await api.get("/subscriptions/my", { skipActiveAppFilter: true });
      const payload = response?.data ?? response ?? {};
      const nextState = {
        loading: false,
        error: "",
        currentPlan: payload?.currentPlan || payload?.current_plan || "",
        subscription: payload?.subscription || null,
      };
      setSubscriptionSummary(nextState);
      return payload;
    } catch (requestError) {
      const message =
        requestError?.response?.data?.error ||
        requestError?.message ||
        tr("subscription_load_failed", "Unable to load your current plan");
      setSubscriptionSummary({
        loading: false,
        error: message,
        currentPlan: "",
        subscription: null,
      });
      return null;
    }
  }, [tr]);

  const fetchSubscriptionHistory = useCallback(async () => {
    const userId = getUserId();
    const hasSession = hasAuthSession();

    if (!userId || !hasSession) {
      setSubscriptionHistoryState({
        loading: false,
        error: "",
        items: [],
      });
      return [];
    }

    setSubscriptionHistoryState((prev) => ({
      ...prev,
      loading: true,
      error: "",
    }));

    try {
      const response = await api.get("/subscriptions/history", { skipActiveAppFilter: true });
      const payload = response?.data ?? response ?? {};
      const items = Array.isArray(payload?.history) ? payload.history : [];
      setSubscriptionHistoryState({
        loading: false,
        error: "",
        items,
      });
      return items;
    } catch (requestError) {
      const message =
        requestError?.response?.data?.error ||
        requestError?.message ||
        tr("subscription_history_failed", "Unable to load subscription history");
      setSubscriptionHistoryState({
        loading: false,
        error: message,
        items: [],
      });
      return [];
    }
  }, [tr]);

  // Fetch dynamic pricing (checks for time-of-day flash sales)
  useEffect(() => {
    const checkFlashSale = async () => {
      try {
        const res = await fetchWithCache(
          "subscriptions:silver-price",
          () => api.get("/subscriptions/plans/silver/price", { skipActiveAppFilter: true }),
          { ttlMs: 2 * 60 * 1000 },
        );
        const data = res?.data ?? res;
        if (data?.isFlashSale) {
          setFlashSale({ discount: data.discount, price: data.price, originalPrice: data.originalPrice });
        }
      } catch {
        // Flash sale check is non-critical
      }
    };
    checkFlashSale();
  }, []);

  useEffect(() => {
    fetchCurrentSubscription();
  }, [fetchCurrentSubscription]);

  useEffect(() => {
    fetchSubscriptionHistory();
  }, [fetchSubscriptionHistory]);

  const cmsPlanOverrides = useMemo(() => {
    const list = Array.isArray(cmsContent?.plans)
      ? cmsContent.plans
      : Array.isArray(cmsContent?.tiers)
        ? cmsContent.tiers
        : Array.isArray(cmsContent?.planOverrides)
          ? cmsContent.planOverrides
          : [];
    return mapPlanOverrides(list);
  }, [cmsContent]);

  const formatCurrency = useCallback((value) => {
    const amount = Number(value || 0);
    if (!Number.isFinite(amount)) return "Rs 0";
    return `Rs ${amount.toLocaleString("en-IN")}`;
  }, []);

  const resolvedPlans = useMemo(
    () =>
      tierPlans.map((plan) => {
        const apiPlan = planOverrides[plan.key];
        const cmsPlan = cmsPlanOverrides[plan.key];
        const nextPlan = { ...plan };

        const displayName =
          cmsPlan?.displayName ||
          cmsPlan?.name ||
          apiPlan?.displayName ||
          apiPlan?.name;
        if (displayName) {
          nextPlan.nameFallback = displayName;
        }

        const subtitle =
          cmsPlan?.subtitle ||
          cmsPlan?.tagline ||
          apiPlan?.tagline ||
          apiPlan?.subtitle;
        if (subtitle) {
          nextPlan.subtitleFallback = subtitle;
        }

        const priceValue = parseNumericValue(
          cmsPlan?.price ??
            cmsPlan?.priceINR ??
            apiPlan?.price ??
            apiPlan?.priceINR,
        );
        const fallbackPriceValue = parseNumericValue(nextPlan.price);
        nextPlan.priceValue =
          priceValue ||
          fallbackPriceValue ||
          PLAN_PRICE_VALUE[plan.key] ||
          0;
        if (priceValue) {
          nextPlan.price = formatCurrency(priceValue);
        }

        const perPostOverride = cmsPlan?.perPostCost ?? apiPlan?.perPostCost;
        if (
          perPostOverride !== undefined &&
          perPostOverride !== null &&
          perPostOverride !== ""
        ) {
          const perPostValue = parseNumericValue(perPostOverride);
          nextPlan.perPostCost =
            Number.isFinite(perPostValue) && perPostValue > 0
              ? `${formatCurrency(perPostValue)}/post`
              : String(perPostOverride);
        }

        const durationOverride =
          cmsPlan?.duration ||
          cmsPlan?.period ||
          apiPlan?.duration ||
          apiPlan?.period;
        if (durationOverride) {
          const formatted = formatPeriodFallback(durationOverride);
          if (formatted) {
            nextPlan.periodFallback = formatted;
          }
        }

        const featuresOverride =
          normalizeFeatureList(cmsPlan?.features) ||
          normalizeFeatureList(apiPlan?.features);
        if (featuresOverride && featuresOverride.length) {
          nextPlan.features = featuresOverride;
        }

        if (typeof cmsPlan?.ctaLabel === "string") {
          nextPlan.ctaLabel = cmsPlan.ctaLabel;
        } else if (typeof apiPlan?.ctaLabel === "string") {
          nextPlan.ctaLabel = apiPlan.ctaLabel;
        }

        if (typeof cmsPlan?.popular === "boolean") {
          nextPlan.popular = cmsPlan.popular;
        }
        if (typeof cmsPlan?.featured === "boolean") {
          nextPlan.featured = cmsPlan.featured;
        }

        const periodOverride = Number(
          cmsPlan?.durationMonths ?? apiPlan?.durationMonths,
        );
        if (Number.isFinite(periodOverride) && periodOverride >= 0) {
          nextPlan.periodMonths = periodOverride;
        } else if (durationOverride) {
          const normalizedDuration = String(durationOverride).toLowerCase();
          if (normalizedDuration.includes("listing")) {
            nextPlan.periodMonths = 0;
          } else {
            const match = normalizedDuration.match(/(\d+)/);
            nextPlan.periodMonths = match ? Number(match[1]) : undefined;
          }
        }

        if (
          nextPlan.periodMonths === undefined ||
          nextPlan.periodMonths === null ||
          Number.isNaN(nextPlan.periodMonths)
        ) {
          nextPlan.periodMonths = PLAN_PERIOD_MONTHS[plan.key] || 0;
        }

        return nextPlan;
      }),
    [cmsPlanOverrides, planOverrides, formatCurrency],
  );

  const activatedTierLabel = useMemo(() => {
    if (!activatedTier) return "";
    const selectedPlan = resolvedPlans.find((plan) => plan.key === activatedTier);
    if (!selectedPlan) return activatedTier;
    return tr(selectedPlan.nameKey, selectedPlan.nameFallback || selectedPlan.key);
  }, [activatedTier, resolvedPlans, tr]);

  const calculatorRows = useMemo(() => {
    const volume = Math.max(1, Number(listingsPerMonth || 1));
    return resolvedPlans.map((plan) => {
      const planPrice =
        plan.priceValue ||
        PLAN_PRICE_VALUE[plan.key] ||
        Number(String(plan.price || "").replace(/[^\d.]/g, "")) ||
        0;
      const periodMonths =
        typeof plan.periodMonths === "number"
          ? plan.periodMonths
          : PLAN_PERIOD_MONTHS[plan.key] || 0;
      const monthlyCost =
        periodMonths > 0 ? planPrice / periodMonths : planPrice * volume;
      const perListing =
        periodMonths > 0 ? monthlyCost / volume : planPrice || 0;
      return {
        key: plan.key,
        name: tr(plan.nameKey, plan.nameFallback || plan.key),
        monthlyCost: Math.round(monthlyCost),
        perListing: Math.round(perListing),
        highlighted: plan.key === "silver" || plan.key === "premium",
      };
    });
  }, [listingsPerMonth, resolvedPlans, tr]);

  const comparisonTable = useMemo(
    () => (
      <div className="overflow-x-auto scrollbar-hide">
        <table className="mhub-comparison-table" role="table" aria-label="Plan comparison">
          <thead>
            <tr className="border-b-2 border-gray-200 dark:border-gray-700">
              <th scope="col" className="text-left">{tr("feature", "Feature")}</th>
              <th scope="col">{tr("basic_plan", "Basic")}</th>
              <th scope="col">{tr("bronze_seller", "Bronze")}</th>
              <th scope="col" className="highlight-col">{tr("silver_seller", "Silver")}</th>
              <th scope="col">{tr("premium", "Premium")}</th>
            </tr>
          </thead>
          <tbody className="text-gray-700 dark:text-gray-200">
            <tr>
              <td>{tr("active_listings", "Active Listings")}</td>
              <td>1</td>
              <td>100</td>
              <td className="highlight-col font-semibold">200</td>
              <td className="font-bold">Unlimited</td>
            </tr>
            <tr>
              <td>{tr("listing_duration", "Listing Duration")}</td>
              <td>15d</td>
              <td>30d</td>
              <td className="highlight-col">30d</td>
              <td>45d</td>
            </tr>
            <tr>
              <td>{tr("boosts_month", "Boosts")}</td>
              <td className="text-gray-400 dark:text-gray-300">-</td>
              <td className="text-gray-400 dark:text-gray-300">Coins</td>
              <td className="highlight-col">5/6mo</td>
              <td>5/mo</td>
            </tr>
            <tr>
              <td>{tr("featured_month", "Featured")}</td>
              <td className="text-gray-400 dark:text-gray-300">-</td>
              <td className="text-gray-400 dark:text-gray-300">-</td>
              <td className="highlight-col">5/6mo</td>
              <td>5/mo</td>
            </tr>
            <tr>
              <td>{tr("spotlight_month", "Spotlight")}</td>
              <td className="text-gray-400 dark:text-gray-300">-</td>
              <td className="text-gray-400 dark:text-gray-300">-</td>
              <td className="highlight-col">5/6mo</td>
              <td>5/mo</td>
            </tr>
            <tr>
              <td>{tr("seller_badge_label", "Badge")}</td>
              <td className="text-gray-400 dark:text-gray-300">-</td>
              <td>Seller</td>
              <td className="highlight-col">Verified</td>
              <td>Premium</td>
            </tr>
            <tr>
              <td>{tr("analytics_label", "Analytics")}</td>
              <td className="text-gray-400 dark:text-gray-300">-</td>
              <td>Basic</td>
              <td className="highlight-col">Full</td>
              <td>Full</td>
            </tr>
            <tr>
              <td>{tr("free_trial_label", "Free Trial")}</td>
              <td className="text-gray-400 dark:text-gray-300">-</td>
              <td className="text-gray-400 dark:text-gray-300">-</td>
              <td className="highlight-col font-semibold text-blue-600 dark:text-blue-300">7 days</td>
              <td className="font-semibold text-yellow-600 dark:text-yellow-300">14 days</td>
            </tr>
            <tr>
              <td>{tr("monthly_cost_label", "Monthly Cost")}</td>
              <td>{formatCurrency(500)}/listing</td>
              <td>~{formatCurrency(283)}</td>
              <td className="highlight-col font-bold text-green-600 dark:text-green-300">~{formatCurrency(200)}</td>
              <td className="font-bold text-green-600 dark:text-green-300">~{formatCurrency(125)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    ),
    [formatCurrency, tr],
  );

  const normalizedCurrentPlan = useMemo(
    () => normalizePlan(subscriptionSummary.currentPlan || subscriptionSummary.subscription?.planName),
    [subscriptionSummary.currentPlan, subscriptionSummary.subscription],
  );
  const currentPlanMeta = useMemo(
    () => resolvedPlans.find((plan) => plan.key === normalizedCurrentPlan) || null,
    [normalizedCurrentPlan, resolvedPlans],
  );
  const currentPlanLabel = currentPlanMeta
    ? tr(currentPlanMeta.nameKey, currentPlanMeta.nameFallback || currentPlanMeta.key)
    : tr("basic_plan", "Basic");
  const currentSubscription = subscriptionSummary.subscription;
  const subscriptionHistory = subscriptionHistoryState.items;
  const subscriptionExpiresLabel = formatDisplayDate(currentSubscription?.expiresAt);
  const quotaResetLabel = formatDisplayDate(currentSubscription?.quotaResetAt);
  const boostRemaining = Math.max(
    0,
    Number(currentSubscription?.boostQuota || 0) - Number(currentSubscription?.boostUsed || 0),
  );
  const featuredRemaining = Math.max(
    0,
    Number(currentSubscription?.featuredQuota || 0) - Number(currentSubscription?.featuredUsed || 0),
  );
  const spotlightRemaining = Math.max(
    0,
    Number(currentSubscription?.spotlightQuota || 0) - Number(currentSubscription?.spotlightUsed || 0),
  );
  const recentSubscriptionHistory = subscriptionHistory.slice(0, 4);

  const planCtaLabel = (planKey) => {
    const plan = resolvedPlans.find((entry) => entry.key === planKey);
    if (plan?.ctaLabel) return plan.ctaLabel;
    if (planKey === "basic") return t("tier_cta_basic");
    if (planKey === "bronze") return t("tier_cta_bronze");
    if (planKey === "silver") return t("tier_cta_silver");
    return t("tier_cta_premium");
  };

  const returnTo = useMemo(() => {
    const params = new URLSearchParams(location.search || "");
    const raw = params.get("returnTo");
    if (!raw) return "";
    if (!raw.startsWith("/")) return "";
    return raw;
  }, [location.search]);

  const loginReturnTo = useMemo(
    () => `${location.pathname || "/tier-selection"}${location.search || ""}`,
    [location.pathname, location.search],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (returnTo === "/post-welcome") {
      sessionStorage.setItem(TIER_SEEN_KEY, "1");
    }
  }, [returnTo]);

  // FIXED: default to "/post-welcome" instead of "/category-hub"
  const buildReturnPath = (tierKey) => {
    const target = returnTo || "/post-welcome";
    if (!tierKey) return target;
    const [path, search = ""] = target.split("?");
    const params = new URLSearchParams(search);
    params.set("tier", tierKey);
    const query = params.toString();
    return query ? `${path}?${query}` : path;
  };

  const buildPaymentPath = (tierKey) => {
    const params = new URLSearchParams();
    params.set("plan", tierKey);
    if (returnTo) {
      params.set("returnTo", returnTo);
    }
    return `/payment?${params.toString()}`;
  };

  const upgradeTier = async (tierKey) => {
    const userId = getUserId();
    const hasSession = hasAuthSession();
    if (!userId || !hasSession) {
      navigate("/login", { state: { returnTo: loginReturnTo } });
      return;
    }

    setProcessingTier(tierKey);
    setLastAttemptedTier(tierKey);
    setError(null);

    navigate(buildPaymentPath(tierKey));
    setProcessingTier(null);
  };

  const activateTrial = async (tierKey) => {
    const userId = getUserId();
    const hasSession = hasAuthSession();
    if (!userId || !hasSession) {
      navigate("/login", { state: { returnTo: loginReturnTo } });
      return;
    }

    setProcessingTrial(tierKey);
    setError(null);

    try {
      const res = await api.post("/subscriptions/trial", { planName: tierKey });
      const data = res?.data ?? res;
      setActivatedTier(tierKey);
      const selectedPlan = resolvedPlans.find((p) => p.key === tierKey);
      const planLabel = selectedPlan
        ? tr(selectedPlan.nameKey, selectedPlan.nameFallback || selectedPlan.key)
        : tierKey;
      toast({
        title: t("trial_activated_title", { defaultValue: "Trial Activated!" }),
        description: t("trial_activated_desc", {
          defaultValue: `${data?.subscription?.trialDays || 7}-day free trial started for ${planLabel}`,
          plan: planLabel,
          days: data?.subscription?.trialDays || 7,
        }),
      });
      emitSubscriptionUpdated({
        plan: tierKey,
        subscription: data?.subscription || null,
        source: "tier-selection-trial",
      });
      await fetchCurrentSubscription();
      await fetchSubscriptionHistory();
      setTimeout(() => {
        navigate(buildReturnPath(tierKey));
      }, 800);
    } catch (requestError) {
      const errorMessage =
        requestError?.response?.data?.error ||
        requestError?.message ||
        t("trial_failed_fallback", { defaultValue: "Failed to activate trial" });
      setError(errorMessage);
      toast({
        title: t("trial_failed", { defaultValue: "Trial Failed" }),
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setProcessingTrial(null);
    }
  };

  const onRetry = () => {
    if (!lastAttemptedTier || processingTier) return;
    upgradeTier(lastAttemptedTier);
  };

  const handleCancelCurrentPlan = async () => {
    if (!currentSubscription?.id || cancelSubmitting) return;

    setCancelSubmitting(true);
    setError(null);

    try {
      const response = await api.post(`/subscriptions/${currentSubscription.id}/cancel`, {
        reason: "Cancelled from tier selection",
      });
      const payload = response?.data ?? response ?? {};
      toast({
        title: tr("plan_cancelled_title", "Plan cancelled"),
        description:
          payload?.message ||
          tr("plan_cancelled_desc", "Your subscription was cancelled and your account is now on Basic."),
      });
      emitSubscriptionUpdated({
        plan: "basic",
        source: "tier-selection-cancel",
      });
      await Promise.all([fetchCurrentSubscription(), fetchSubscriptionHistory()]);
      setCancelDialogOpen(false);
    } catch (requestError) {
      const message =
        requestError?.response?.data?.error ||
        requestError?.message ||
        tr("cancel_plan_failed", "Unable to cancel your plan right now");
      setError(message);
      toast({
        title: tr("cancel_plan_failed_title", "Cancellation failed"),
        description: message,
        variant: "destructive",
      });
    } finally {
      setCancelSubmitting(false);
    }
  };

  const faqItems = useMemo(() => {
    const cmsFaqs = Array.isArray(cmsContent?.faqs)
      ? cmsContent.faqs
      : Array.isArray(cmsContent?.faqItems)
        ? cmsContent.faqItems
        : [];
    if (cmsFaqs.length) {
      return cmsFaqs.map((faq, index) => ({
        question: tr(
          faq?.questionKey || faq?.key || `faq_q${index + 1}`,
          faq?.question || faq?.title || "",
        ),
        answer: tr(
          faq?.answerKey || faq?.key || `faq_a${index + 1}`,
          faq?.answer || faq?.description || "",
        ),
      }));
    }
    return [
      {
        question: tr("faq_q1", "Can I cancel anytime?"),
        answer: tr(
          "faq_a1",
          "Yes. Cancelling moves your account back to Basic immediately. Any unused quota is forfeited.",
        ),
      },
      {
        question: tr("faq_q2", "What happens when my plan expires?"),
        answer: tr(
          "faq_a2",
          "Your listings remain visible but you won't be able to post new ones until you renew or switch to Basic.",
        ),
      },
      {
        question: tr("faq_q3", "Can I switch from one plan to another mid-cycle?"),
        answer: tr(
          "faq_a3",
          "Yes. You can cancel your current plan and subscribe to a new one at any time.",
        ),
      },
      {
        question: tr("faq_q4", "Are boosts included in my plan?"),
        answer: tr(
          "faq_a4",
          "Silver and Premium plans include bundled boosts, featured slots, and spotlights. Basic and Bronze users can redeem boosts using coins.",
        ),
      },
    ];
  }, [cmsContent, tr]);

  return (
    <div className={`mhub-page-tier min-h-screen mhub-premium-page nav-clearance bg-gradient-to-b from-slate-50 via-blue-50 to-indigo-100 py-6 px-4 sm:px-6 dark:bg-gradient-to-b ${densityClass}`}>
      <style>{`
        @keyframes tierFadeIn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      {/* Hero section */}
      <div className="mx-auto max-w-[640px] mb-8">
        <div className="rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 overflow-hidden relative dark:bg-gradient-to-br">
          {/* SVG cross pattern overlay */}
          <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="tier-hero-pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M10 0v20M0 10h20" stroke="white" strokeWidth="0.5" fill="none" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#tier-hero-pattern)" />
          </svg>
          <div className="relative z-10 px-6 py-5 sm:py-6">
            {/* Top nav row */}
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center justify-between gap-2 sm:justify-start">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateBack(navigate)}
                  className="flex items-center gap-1 text-white/70 hover:text-white hover:bg-white/10 rounded-xl dark:text-white/70 dark:hover:text-white dark:hover:bg-slate-900/10"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {tr("back", "Back")}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => navigate("/rewards")}
                  className="rounded-xl text-white/70 hover:text-white hover:bg-white/10 text-sm dark:text-white/70 dark:hover:text-white dark:hover:bg-slate-900/10"
                >
                  {tr("see_rewards", "Rewards")}
                </Button>
              </div>
              <div className="flex items-center justify-end gap-2">
                <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl border-white/30 px-2.5 text-xs text-white hover:text-white hover:bg-white/10 sm:px-3 sm:text-sm dark:border-white/30 dark:text-white dark:hover:text-white dark:hover:bg-slate-900/10"
                    >
                      {tr("compare_plans", "Compare plans")}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[640px] w-[min(96vw,1024px)]">
                    <DialogHeader>
                      <DialogTitle>{tr("compare_plans", "Compare plans")}</DialogTitle>
                    </DialogHeader>
                    {comparisonTable}
                    <div className="mt-4 text-xs text-slate-500 dark:text-slate-300">
                      {tr("comparison_note", "Tip: Use the pricing calculator below to compare monthly costs at your posting volume.")}
                    </div>
                  </DialogContent>
                </Dialog>
                <PageDensityToggle
                  value={density}
                  onChange={setDensity}
                  className="shrink-0 [&>span]:hidden [&>span]:text-white/70 sm:[&>span]:inline [&_select]:bg-white/15 [&_select]:text-white [&_select]:border-white/30"
                />
              </div>
            </div>
            {/* Hero text */}
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70 mb-1 dark:text-white/70">
              {tr("membership_plans_label", "Membership Plans")}
            </p>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white dark:text-white">
              {t("choose_your_selling_power", { defaultValue: "Choose Your Plan" })}
            </h1>
            <p className="text-sm text-white/80 mt-1 max-w-xl dark:text-white/80">
              {tr(
                "selling_power_subtitle_new",
                "Choose a membership plan. Boosts are included with paid plans.",
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Flash sale banner */}
      {flashSale ? (
        <div data-density="extra" className="mx-auto max-w-[640px] mb-6 page-shell page-pad">
          <div className="rounded-2xl bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 p-4 text-white text-center shadow-xl shadow-orange-500/20 relative overflow-hidden dark:bg-gradient-to-r">
            <div className="absolute inset-0 bg-[linear-gradient(110deg,transparent_25%,rgba(255,255,255,0.15)_50%,transparent_75%)] bg-[length:250%_100%] animate-[shimmer_3s_ease-in-out_infinite] dark:bg-slate-900" />
            <div className="relative flex items-center justify-center gap-2 font-black text-lg">
              <Zap className="w-5 h-5 drop-shadow-sm" />
              {tr("flash_sale_title", "Night Owl Deal")} — {flashSale.discount}
              <Zap className="w-5 h-5 drop-shadow-sm" />
            </div>
            <p className="relative text-sm mt-1 text-white/80 dark:text-white/80">
              {tr("flash_sale_subtitle", "Limited time pricing available between 11 PM – 6 AM")}
            </p>
          </div>
        </div>
      ) : null}

      {/* Current plan banner */}
      {(currentSubscription || normalizedCurrentPlan) && !subscriptionSummary.loading ? (
        <div className="mx-auto max-w-[640px] mb-6 page-shell page-pad">
          <div className="mhub-premium-surface rounded-2xl p-5">
            <div className="flex flex-wrap items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <Badge className="bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-slate-300 text-xs dark:bg-slate-950 dark:text-slate-200">
                    {tr("current_plan_status", "Current plan")}
                  </Badge>
                  <span className="text-base font-black text-slate-900 dark:text-slate-100">{currentPlanLabel}</span>
                  {currentSubscription?.isTrial ? (
                    <Badge className="bg-blue-100 text-blue-700 border border-blue-200 text-xs dark:bg-blue-950/20 dark:text-blue-300 dark:border-blue-600/40">
                      {tr("trial_active", "Trial active")}
                    </Badge>
                  ) : currentSubscription ? (
                    <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-600/40">
                      {tr("active_now", "Active")}
                    </Badge>
                  ) : (
                    <Badge className="bg-slate-100 text-slate-500 text-xs dark:bg-slate-950 dark:text-slate-300">
                      {tr("basic_access", "Basic access")}
                    </Badge>
                  )}
                </div>
                <div className="grid gap-2 text-xs grid-cols-1 sm:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 dark:bg-gray-700/50 px-3 py-2 dark:bg-slate-950">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1 dark:text-slate-300">
                      {tr("expires_label", "Expires")}
                    </p>
                    <p className="font-medium text-slate-700 dark:text-slate-200">
                      {subscriptionExpiresLabel || tr("no_expiry", "No expiry set")}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 dark:bg-gray-700/50 px-3 py-2 dark:bg-slate-950">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1 dark:text-slate-300">
                      {tr("quota_reset", "Quota reset")}
                    </p>
                    <p className="font-medium text-slate-700 dark:text-slate-200">
                      {quotaResetLabel || tr("not_applicable", "N/A")}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 dark:bg-gray-700/50 px-3 py-2 dark:bg-slate-950">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1 dark:text-slate-300">
                      {tr("plan_allowances", "Allowances")}
                    </p>
                    <p className="font-medium text-slate-700 dark:text-slate-300 text-xs dark:text-slate-200">
                      {currentSubscription
                        ? tr("quota_summary", "{{boost}} boosts · {{featured}} featured · {{spotlight}} spotlight", {
                            boost: boostRemaining,
                            featured: featuredRemaining,
                            spotlight: spotlightRemaining,
                          })
                        : tr("basic_credit_hint", "One post credit for Basic.")}
                    </p>
                  </div>
                </div>
              </div>

              {currentSubscription ? (
                <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-xl border-red-300 text-red-600 hover:bg-red-50 dark:border-red-600/40 dark:text-red-300 dark:hover:bg-red-950/20"
                    onClick={() => setCancelDialogOpen(true)}
                  >
                    {cancelSubmitting
                      ? tr("cancelling", "Cancelling...")
                      : tr("cancel_plan", "Cancel plan")}
                  </Button>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {tr("cancel_plan_confirm_title", "Cancel current plan?")}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {tr(
                          "cancel_plan_confirm_desc",
                          "This will end your active subscription access and switch your account back to Basic.",
                        )}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={cancelSubmitting}>
                        {tr("keep_plan", "Keep plan")}
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={(event) => {
                          event.preventDefault();
                          handleCancelCurrentPlan();
                        }}
                        disabled={cancelSubmitting}
                        className="bg-red-600 hover:bg-red-700 dark:bg-red-700/40 dark:hover:bg-red-700/40"
                      >
                        {cancelSubmitting
                          ? tr("cancelling", "Cancelling...")
                          : tr("confirm_cancel", "Confirm cancel")}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : null}
            </div>
          </div>
        </div>
      ) : subscriptionSummary.loading ? (
        <div className="mx-auto max-w-[640px] mb-6 page-shell page-pad">
          <div className="h-24 rounded-2xl bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 bg-[length:200%_100%] animate-[shimmer_1.5s_ease-in-out_infinite] dark:bg-gradient-to-r" />
        </div>
      ) : subscriptionSummary.error ? (
        <div className="mx-auto max-w-[640px] mb-6 page-shell page-pad">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex flex-wrap items-center gap-3 dark:border-amber-600/40 dark:bg-amber-950/20">
            <p className="text-sm text-amber-700 flex-1 dark:text-amber-300">{subscriptionSummary.error}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl border-amber-300 text-amber-700 dark:border-amber-600/40 dark:text-amber-300"
              onClick={fetchCurrentSubscription}
            >
              {tr("retry", "Retry")}
            </Button>
          </div>
        </div>
      ) : null}

      {/* Processing / activated banners */}
      {processingTier ? (
        <p className="max-w-md mx-auto mb-4 text-center text-sm text-blue-600 page-shell page-pad flex items-center justify-center gap-2 dark:text-blue-300">
          <Loader2 className="w-4 h-4 animate-spin" />
          {t("tier_upgrading_plan", { defaultValue: "Redirecting to payment" })}
          <span className="inline-flex gap-0.5" aria-hidden="true">
            <span className="animate-bounce" style={{ animationDelay: "0s" }}>.</span>
            <span className="animate-bounce" style={{ animationDelay: "0.15s" }}>.</span>
            <span className="animate-bounce" style={{ animationDelay: "0.3s" }}>.</span>
          </span>
        </p>
      ) : null}

      {activatedTier ? (
        <div className="max-w-md mx-auto mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center page-shell page-pad dark:border-emerald-600/40 dark:bg-emerald-950/20">
          <Sparkles className="w-8 h-8 text-emerald-500 mx-auto mb-2 animate-pulse dark:text-emerald-300" />
          <p className="text-emerald-700 font-bold dark:text-emerald-300">
            {t("tier_activated_redirect", { plan: activatedTierLabel, defaultValue: `${activatedTierLabel} trial activated!` })}
          </p>
        </div>
      ) : null}

      {/* Error banner */}
      {error ? (
        <div
          className="max-w-md mx-auto mb-6 rounded-2xl border border-red-200 bg-red-50 p-5 page-shell page-pad dark:border-red-600/40 dark:bg-red-950/20"
          role="alert"
        >
          <div className="flex items-start gap-3 text-left">
            <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0 dark:text-red-300" />
            <div className="flex-1">
              <p className="text-red-800 font-bold dark:text-red-200">{t("upgrade_failed", { defaultValue: "Action failed" })}</p>
              <p className="text-red-600 text-sm dark:text-red-300">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-md p-1 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 dark:text-red-200 dark:hover:text-red-300 dark:hover:bg-red-950/20"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-4 flex items-center justify-center gap-2">
            <Button
              size="sm"
              className="rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 dark:bg-red-700/40 dark:hover:bg-red-800/30 dark:text-white"
              onClick={onRetry}
              disabled={!lastAttemptedTier || Boolean(processingTier)}
            >
              {t("retry", { defaultValue: "Retry" })}
            </Button>
          </div>
        </div>
      ) : null}

      {/* Plan cards — 2x2 on mobile, 4-col on desktop */}
      <div className="max-w-[640px] mx-auto grid gap-5 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 items-stretch page-shell page-pad mb-8">
        {resolvedPlans.map((plan, planIndex) => {
          const Icon = plan.icon;
          const isProcessing = processingTier === plan.key;
          const isCurrentPlan = normalizedCurrentPlan === plan.key;
          const isCurrentTrial = Boolean(isCurrentPlan && currentSubscription?.isTrial);
          const primaryDisabled =
            plan.key === "basic"
              ? false
              : isProcessing || Boolean(activatedTier) || isCurrentPlan;
          const primaryLabel = isCurrentPlan
            ? tr("current_plan_button", "Current plan")
            : planCtaLabel(plan.key);

          return (
            <div
              key={plan.key}
              role="article"
              aria-current={isCurrentPlan ? "true" : undefined}
              className={`relative flex flex-col rounded-2xl border-2 overflow-hidden transition-all duration-300 ease-out hover:shadow-2xl hover:-translate-y-2 hover:shadow-blue-500/10 dark:hover:shadow-blue-400/5 mhub-shine ${plan.cardBg} ${
                plan.popular ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-blue-50" : ""
              } ${plan.featured ? "ring-2 ring-yellow-500 ring-offset-2 ring-offset-yellow-50" : ""} ${
                isCurrentPlan ? "border-emerald-400 shadow-emerald-100" : ""
              }`}
              style={{
                animation: `tierFadeIn 0.5s ease-out ${planIndex * 0.1}s both`,
              }}
            >
              {/* Popular / Best value badges */}
              {plan.popular ? (
                <div className="absolute top-0 right-0">
                  <span className="inline-block rounded-bl-xl bg-blue-600 px-3 py-1 text-xs font-black text-white shadow-lg shadow-blue-500/30 animate-pulse dark:bg-blue-700/40 dark:text-white">
                    {t("popular", { defaultValue: "Popular" })}
                  </span>
                </div>
              ) : null}
              {plan.featured ? (
                <div className="absolute top-0 left-0 right-0 bg-yellow-500 text-black text-center py-1 font-black text-xs shadow-lg shadow-yellow-500/30 dark:bg-yellow-800/30">
                  {t("best_value", { defaultValue: "Best Value" })}
                </div>
              ) : null}

              {/* Active plan badge */}
              {isCurrentPlan ? (
                <div className="absolute left-3 top-3 z-10">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-1 text-xs font-black text-white dark:bg-emerald-800/30 dark:text-white">
                    <Check className="w-4 h-4" />
                    {isCurrentTrial ? tr("trial_live_badge", "Trial live") : tr("current_plan_badge", "Active")}
                  </span>
                </div>
              ) : null}

              {/* Card header */}
              <div className={`p-5 ${plan.featured ? "pt-8" : ""} ${isCurrentPlan ? "pt-9" : ""}`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`rounded-2xl p-3 ${plan.iconBg}`}>
                    <Icon className={`w-6 h-6 ${plan.iconColor}`} />
                  </div>
                  <div>
                    <p className="text-lg font-black text-slate-900 dark:text-slate-100">
                      {tr(plan.nameKey, plan.nameFallback || plan.key)}
                    </p>
                    <p className={`text-xs ${plan.accentColor}`}>
                      {tr(plan.subtitleKey, plan.subtitleFallback || plan.subtitleKey)}
                    </p>
                  </div>
                </div>

                <div className="flex items-baseline gap-1 mb-1">
                  <span className={`text-2xl sm:text-4xl font-black tracking-tight tabular-nums ${plan.priceColor}`} style={{ textShadow: '0 1px 2px rgba(0,0,0,0.08)' }}>
                    {plan.price}
                  </span>
                  <span className="text-sm text-slate-400 dark:text-slate-300">
                    {tr(plan.periodKey, plan.periodFallback || plan.periodKey)}
                  </span>
                </div>

                {plan.perPostCost ? (
                  <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-lg ${plan.iconBg} ${plan.accentColor}`}>
                    {plan.perPostCost}
                  </span>
                ) : null}
              </div>

              {/* Features */}
              <div className="flex-1 px-5 pb-2">
                <ul className="space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature.key} className="flex items-start gap-2 text-sm">
                      {feature.included ? (
                        <span className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full ${plan.iconBg}`}>
                          <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-300" />
                        </span>
                      ) : (
                        <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-gray-700 opacity-50 dark:bg-slate-950">
                          <X className="w-4 h-4 text-slate-300 dark:text-slate-300" />
                        </span>
                      )}
                      <span
                        className={
                          feature.included
                            ? "text-slate-600 dark:text-slate-300 leading-snug"
                            : "text-slate-300 dark:text-slate-600 line-through leading-snug"
                        }
                      >
                        {tr(feature.key, feature.label || feature.key)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTAs */}
              <div className="p-5 pt-4 space-y-2">
                <Button
                  onClick={() => {
                    if (plan.key === "basic") {
                      navigate(buildReturnPath(plan.key));
                      return;
                    }
                    upgradeTier(plan.key);
                  }}
                  disabled={primaryDisabled}
                  className={`w-full rounded-xl py-3 font-black text-sm transition-all active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 hover:shadow-lg hover:shadow-emerald-500/25 ${plan.buttonClass} disabled:opacity-50`}
                >
                  {isProcessing ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t("processing", { defaultValue: "Processing..." })}
                    </span>
                  ) : (
                    primaryLabel
                  )}
                </Button>

                {(plan.key === "silver" || plan.key === "premium") ? (
                  <Button
                    variant="outline"
                    onClick={() => activateTrial(plan.key)}
                    disabled={
                      processingTrial === plan.key ||
                      Boolean(activatedTier) ||
                      isCurrentPlan
                    }
                    className={`w-full rounded-xl text-xs font-semibold border-dashed active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 ${plan.trialButtonClass} disabled:opacity-40`}
                  >
                    {processingTrial === plan.key ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        {t("activating_trial", { defaultValue: "Activating..." })}
                      </span>
                    ) : isCurrentTrial ? (
                      tr("trial_active_button", "Trial active")
                    ) : isCurrentPlan ? (
                      tr("trial_unavailable_current", "Included in plan")
                    ) : (
                      t(plan.key === "silver" ? "start_7_day_trial" : "start_14_day_trial", {
                        defaultValue: plan.key === "silver" ? "Start 7-Day Free Trial" : "Start 14-Day Free Trial",
                      })
                    )}
                  </Button>
                ) : null}

                <p className="text-xs text-slate-400 text-center pt-1">
                  {isCurrentPlan
                    ? tr("current_plan_hint", "This is your active plan.")
                    : plan.key === "basic"
                    ? tr("basic_note", "Best for one-off posts.")
                    : tr("tier_note", "Cancel anytime in settings.")}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Divider */}
      <div className="max-w-[640px] mx-auto page-shell page-pad"><hr className="mhub-divider" /></div>

      {/* Cost calculator */}
      <div className="max-w-[640px] mx-auto mb-6 page-shell page-pad">
        <div className="mhub-premium-surface rounded-2xl p-6">
          <h2 className="text-lg font-black text-slate-900 dark:text-white mb-4 dark:text-slate-100">
            {tr("monthly_cost_calculator", "Monthly Cost Calculator")}
          </h2>
          <div className="rounded-xl border border-slate-200 dark:border-gray-600 bg-slate-50 dark:bg-gray-700/50 p-4 mb-4 dark:border-slate-700 dark:bg-slate-950">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  {tr("listings_per_month", "Listings per month")}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-300">
                  {tr("calculator_hint", "Adjust volume to see effective monthly costs.")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={listingsPerMonth}
                  onChange={(event) =>
                    setListingsPerMonth(Math.max(1, Number(event.target.value || 1)))
                  }
                  aria-label={tr("listings_per_month_input", "Number of listings per month")}
                  className="mhub-input w-16 sm:w-20 rounded-xl px-3 py-2 text-sm"
                />
                <span className="text-xs text-slate-400 dark:text-slate-300">/month</span>
              </div>
            </div>
            <input
              type="range"
              min="1"
              max="50"
              value={listingsPerMonth}
              onChange={(event) => setListingsPerMonth(Number(event.target.value))}
              className="w-full accent-indigo-600 dark:accent-indigo-400"
              aria-label={tr("listings_per_month", "Listings per month")}
              aria-valuemin={1}
              aria-valuemax={50}
              aria-valuenow={listingsPerMonth}
              aria-valuetext={`${listingsPerMonth} listings per month`}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-gray-600 dark:text-slate-300 dark:border-slate-700">
                  <th scope="col" className="py-2 font-semibold">{tr("plan", "Plan")}</th>
                  <th scope="col" className="py-2 font-semibold">{tr("monthly_cost", "Monthly cost")}</th>
                  <th scope="col" className="py-2 font-semibold">{tr("per_listing", "Per listing")}</th>
                </tr>
              </thead>
              <tbody>
                {calculatorRows.map((row) => (
                  <tr key={row.key} className={`border-t border-slate-100 dark:border-gray-700 transition-colors duration-300 ${row.highlighted ? "bg-emerald-50/50 dark:bg-emerald-900/20 font-semibold" : ""} ${normalizedCurrentPlan === row.key ? "bg-blue-50/50 dark:bg-blue-900/20" : ""}`}>
                    <td className="py-2.5 font-bold text-slate-700 dark:text-slate-200">
                      <span className="flex items-center gap-2">
                        {row.name}
                        {normalizedCurrentPlan === row.key ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-100 px-1.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300">
                            {tr("your_plan", "Yours")}
                          </span>
                        ) : null}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <span className={row.highlighted ? "text-emerald-600 font-black" : "text-slate-500"}>
                        {formatCurrency(row.monthlyCost)}
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-400 dark:text-slate-300">{formatCurrency(row.perListing)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Subscription history */}
      <div className="max-w-[640px] mx-auto mb-6 page-shell page-pad">
        <div className="mhub-premium-surface rounded-2xl p-6">
          <h2 className="text-base font-black text-slate-900 dark:text-white mb-4 dark:text-slate-100">
            {tr("subscription_history", "Subscription history")}
          </h2>
          {subscriptionHistoryState.loading ? (
            <p className="text-sm text-slate-400 dark:text-slate-300">{tr("loading_subscription_history", "Loading...")}</p>
          ) : subscriptionHistoryState.error ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-amber-700 dark:text-amber-300">{subscriptionHistoryState.error}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl border-slate-300 text-slate-600 hover:text-slate-800 dark:border-slate-600 dark:text-slate-200 dark:hover:text-slate-100"
                onClick={fetchSubscriptionHistory}
              >
                {tr("retry", "Retry")}
              </Button>
            </div>
          ) : recentSubscriptionHistory.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {recentSubscriptionHistory.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-xl border border-slate-200 dark:border-gray-600 bg-slate-50 dark:bg-gray-700/50 px-4 py-3 dark:border-slate-700 dark:bg-slate-950"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="font-bold text-slate-700 text-sm dark:text-slate-200">
                      {tr(`${entry.planName}_plan`, entry.planName || "Plan")}
                    </p>
                    <Badge
                      className={
                        entry.status === "active"
                          ? "bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs"
                          : entry.status === "cancelled"
                          ? "bg-red-100 text-red-700 border border-red-200 text-xs"
                          : "bg-slate-100 text-slate-500 text-xs"
                      }
                    >
                      {tr(`subscription_status_${entry.status}`, entry.status || "status")}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400 dark:text-slate-300">
                    {tr("started_label", "Started")}: {formatDisplayDate(entry.startedAt) || tr("unknown", "Unknown")}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-300">
                    {tr("expires_label", "Expires")}: {formatDisplayDate(entry.expiresAt) || tr("not_applicable", "N/A")}
                  </p>
                  {entry.cancelledAt ? (
                    <p className="text-xs text-slate-400 dark:text-slate-300">
                      {tr("cancelled_on", "Cancelled")}: {formatDisplayDate(entry.cancelledAt)}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2 dark:text-slate-300" />
              <p className="text-sm text-slate-400 dark:text-slate-300">
                {tr("subscription_history_empty", "No subscription changes yet.")}
              </p>
              <p className="text-xs text-slate-300 mt-1 dark:text-slate-300">
                {tr("subscription_history_empty_hint", "Your plan activity will appear here.")}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="max-w-[640px] mx-auto page-shell page-pad"><hr className="mhub-divider" /></div>

      {/* FAQ */}
      <div data-density="extra" className="max-w-[640px] mx-auto mb-8 page-shell page-pad">
        <div className="mhub-premium-surface rounded-2xl px-6 py-4">
          <h2 className="text-base font-black text-slate-900 dark:text-white mb-2 dark:text-slate-100">
            {tr("faq_title", "Frequently asked questions")}
          </h2>
          {faqItems.map((item) => (
            <FaqItem key={item.question} question={item.question} answer={item.answer} />
          ))}
        </div>
      </div>

      {/* Footer note */}
      <div className="max-w-[640px] mx-auto pb-6 text-center page-shell page-pad">
        <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-slate-400 dark:text-slate-500 backdrop-blur-sm mhub-premium-bar rounded-2xl px-6 py-3 dark:text-slate-300">
          <span className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            {t("secure_payments", { defaultValue: "Secure payments" })}
          </span>
          <span className="hidden sm:inline text-slate-300 dark:text-slate-300">·</span>
          <span className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" />
            {t("instant_activation", { defaultValue: "Instant activation" })}
          </span>
          <span className="hidden sm:inline text-slate-300 dark:text-slate-300">·</span>
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            {t("priority_support", { defaultValue: "Priority support" })}
          </span>
        </div>
      </div>
    </div>
  );
}

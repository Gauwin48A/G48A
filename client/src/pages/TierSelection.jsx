import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Clock,
  Crown,
  Loader2,
  Shield,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";
import { getAccessToken, getUserId } from "@/utils/authStorage";
import { useToast } from "@/hooks/use-toast";
import { navigateBack } from "@/utils/navigation";

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
    color: "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700",
    buttonClass: "bg-gray-600 hover:bg-gray-700",
    ctaLabel: "Post Basic Listing",
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
    color: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800",
    buttonClass: "bg-amber-600 hover:bg-amber-700 text-white",
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
    color: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
    buttonClass: "bg-blue-600 hover:bg-blue-700",
    popular: true,
    ctaLabel: "Get Silver ⭐",
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
    color: "bg-gradient-to-br from-gray-900 to-gray-800 border-yellow-500",
    textColor: "text-white",
    buttonClass: "bg-yellow-500 hover:bg-yellow-400 text-black",
    featured: true,
    ctaLabel: "Go Premium 👑",
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

export default function TierSelection() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const tr = (key, fallback, options = {}) =>
    t(key, { defaultValue: fallback, ...options });
  const { toast } = useToast();
  const [processingTier, setProcessingTier] = useState(null);
  const [processingTrial, setProcessingTrial] = useState(null);
  const [activatedTier, setActivatedTier] = useState(null);
  const [error, setError] = useState(null);
  const [lastAttemptedTier, setLastAttemptedTier] = useState(null);
  const [flashSale, setFlashSale] = useState(null);

  // Fetch dynamic pricing (checks for time-of-day flash sales)
  useEffect(() => {
    const checkFlashSale = async () => {
      try {
        const res = await api.get("/subscriptions/plans/silver/price");
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

  const activatedTierLabel = useMemo(() => {
    if (!activatedTier) {
      return "";
    }
    const selectedPlan = tierPlans.find((plan) => plan.key === activatedTier);
    if (!selectedPlan) {
      return activatedTier;
    }
    return tr(selectedPlan.nameKey, selectedPlan.nameFallback || selectedPlan.key);
  }, [activatedTier, tr]);

  const planCtaLabel = (planKey) => {
    const plan = tierPlans.find((entry) => entry.key === planKey);
    if (plan?.ctaLabel) {
      return plan.ctaLabel;
    }
    if (planKey === "basic") {
      return t("tier_cta_basic");
    }
    if (planKey === "bronze") {
      return t("tier_cta_bronze");
    }
    if (planKey === "silver") {
      return t("tier_cta_silver");
    }
    return t("tier_cta_premium");
  };

  const upgradeTier = async (tierKey) => {
    const userId = getUserId();
    const accessToken = getAccessToken();
    if (!userId || !accessToken) {
      navigate("/login", { state: { returnTo: "/tier-selection" } });
      return;
    }

    setProcessingTier(tierKey);
    setLastAttemptedTier(tierKey);
    setError(null);

    // Navigate to payment page with the selected plan
    navigate(`/payment?plan=${encodeURIComponent(tierKey)}`);
    setProcessingTier(null);
  };

  const activateTrial = async (tierKey) => {
    const userId = getUserId();
    const accessToken = getAccessToken();
    if (!userId || !accessToken) {
      navigate("/login", { state: { returnTo: "/tier-selection" } });
      return;
    }

    setProcessingTrial(tierKey);
    setError(null);

    try {
      const res = await api.post("/subscriptions/trial", { planName: tierKey });
      const data = res?.data ?? res;
      setActivatedTier(tierKey);
      const selectedPlan = tierPlans.find((p) => p.key === tierKey);
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
      setTimeout(() => {
        navigate(`/categories?tier=${encodeURIComponent(tierKey)}`);
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
    if (!lastAttemptedTier || processingTier) {
      return;
    }
    upgradeTier(lastAttemptedTier);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigateBack(navigate)}
          className="flex items-center gap-1 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
      </div>
      <div className="text-center mb-12">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl">
            <TrendingUp className="w-8 h-8 text-white" />
          </div>
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-4">
          {t("choose_your_selling_power")}
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          {tr(
            "selling_power_subtitle_new",
            "Choose a membership plan. Boosts are included with paid plans.",
          )}
        </p>
      </div>

      {processingTier && (
        <p
          className="max-w-md mx-auto mb-6 text-center text-sm text-blue-700"
          marker="loading"
        >
          {t("tier_upgrading_plan")}
        </p>
      )}

      {activatedTier && (
        <div className="max-w-md mx-auto mb-8 p-4 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-xl text-center page-shell page-pad">
          <Sparkles className="w-8 h-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
          <p className="text-green-800 dark:text-green-300 font-semibold">
            {t("tier_activated_redirect", { plan: activatedTierLabel })}
          </p>
        </div>
      )}

      {error && (
        <div
          className="max-w-md mx-auto mb-8 p-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-xl text-center page-shell page-pad"
          marker="error"
        >
          <div className="flex items-start gap-3 text-left">
            <AlertTriangle className="w-5 h-5 text-red-700 dark:text-red-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-900 dark:text-red-300 font-semibold">{t("upgrade_failed")}</p>
              <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-center gap-2">
            <Button
              size="sm"
              onClick={onRetry}
              disabled={!lastAttemptedTier || Boolean(processingTier)}
            >
              {t("retry")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-red-300 text-red-800 hover:bg-red-200"
              onClick={() => setError(null)}
            >
              {t("dismiss")}
            </Button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto grid gap-6 sm:grid-cols-2 lg:grid-cols-4 items-stretch page-shell page-pad">
        {flashSale && (
          <div className="sm:col-span-2 lg:col-span-4 mb-2">
            <div className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 rounded-xl p-4 text-white text-center animate-pulse">
              <div className="flex items-center justify-center gap-2 font-bold text-lg">
                <Zap className="w-5 h-5" />
                🌙 Night Owl Deal — {flashSale.discount}
                <Zap className="w-5 h-5" />
              </div>
              <p className="text-sm mt-1 opacity-90">Limited time pricing available between 11 PM – 6 AM</p>
            </div>
          </div>
        )}
        {tierPlans.map((plan) => {
          const Icon = plan.icon;
          const isProcessing = processingTier === plan.key;
          return (
            <Card
              key={plan.key}
              className={`relative overflow-hidden rounded-2xl shadow-xl border-2 transition-all duration-300 hover:shadow-2xl ${plan.color} ${
                plan.featured ? "lg:scale-105 lg:-mt-4 lg:mb-4" : ""
              } ${plan.textColor || ""}`}
            >
              {plan.popular && (
                <div className="absolute top-0 right-0">
                  <Badge className="bg-blue-600 text-white rounded-none rounded-bl-xl px-4 py-1 font-bold">
                    {t("popular")}
                  </Badge>
                </div>
              )}
              {plan.featured && (
                <div className="absolute top-0 left-0 right-0 bg-yellow-500 text-black text-center py-1 font-bold text-sm">
                  {t("best_value")}
                </div>
              )}
              <CardHeader className={plan.featured ? "pt-10" : ""}>
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className={`p-2 rounded-xl ${
                      plan.featured ? "bg-yellow-400/20" : "bg-gray-100 dark:bg-gray-700"
                    }`}
                  >
                    <Icon
                      className={`w-6 h-6 ${plan.featured ? "text-yellow-400" : "text-blue-600"}`}
                    />
                  </div>
                  <div>
                    <CardTitle
                      className={`text-xl font-bold ${plan.textColor || "text-gray-900 dark:text-white"}`}
                    >
                      {tr(plan.nameKey, plan.nameFallback || plan.key)}
                    </CardTitle>
                    <p
                      className={`text-sm ${plan.featured ? "text-yellow-400" : "text-gray-500 dark:text-gray-400"}`}
                    >
                      {tr(plan.subtitleKey, plan.subtitleFallback || plan.subtitleKey)}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex items-baseline">
                  <span
                    className={`text-4xl font-extrabold tracking-tight ${plan.textColor || "text-gray-900 dark:text-white"}`}
                  >
                    {plan.price}
                  </span>
                  <span
                    className={`ml-1 text-lg ${plan.featured ? "text-gray-400" : "text-gray-500 dark:text-gray-400"}`}
                  >
                    {tr(plan.periodKey, plan.periodFallback || plan.periodKey)}
                  </span>
                </div>
                {plan.perPostCost && (
                  <div className="mt-2">
                    <span
                      className={`inline-block text-xs font-semibold px-2 py-1 rounded-full ${
                        plan.featured
                          ? "bg-yellow-400/20 text-yellow-300"
                          : plan.key === "silver"
                            ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
                            : plan.key === "bronze"
                              ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"
                              : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                      }`}
                    >
                      {plan.perPostCost}
                    </span>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature.key} className="flex items-center">
                      {feature.included ? (
                        <Check
                          className={`w-5 h-5 mr-3 flex-shrink-0 ${plan.featured ? "text-yellow-400" : "text-green-500"}`}
                        />
                      ) : (
                        <span className="w-5 h-5 mr-3 flex-shrink-0 text-gray-300">
                          -
                        </span>
                      )}
                      <span
                        className={`${
                          feature.included
                            ? plan.textColor || "text-gray-700 dark:text-gray-200"
                            : "text-gray-400 dark:text-gray-500 line-through"
                        }`}
                      >
                        {tr(feature.key, feature.label || feature.key)}
                      </span>
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => {
                    if (plan.key === "basic") {
                      navigate(`/categories?tier=${encodeURIComponent(plan.key)}`);
                      return;
                    }
                    upgradeTier(plan.key);
                  }}
                  disabled={plan.key === "basic" ? false : isProcessing || Boolean(activatedTier)}
                  className={`w-full py-6 text-lg font-bold rounded-xl transition-all ${plan.buttonClass}`}
                >
                  {isProcessing ? (
                    <span className="flex items-center justify-center">
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      {t("processing")}
                    </span>
                  ) : (
                    planCtaLabel(plan.key)
                  )}
                </Button>
                {(plan.key === "silver" || plan.key === "premium") && (
                  <Button
                    variant="outline"
                    onClick={() => activateTrial(plan.key)}
                    disabled={processingTrial === plan.key || Boolean(activatedTier)}
                    className="w-full mt-2 py-3 text-sm font-medium rounded-xl border-dashed"
                  >
                    {processingTrial === plan.key ? (
                      <span className="flex items-center justify-center">
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t("activating_trial", { defaultValue: "Activating..." })}
                      </span>
                    ) : (
                      t(plan.key === "silver" ? "start_7_day_trial" : "start_14_day_trial", {
                        defaultValue: plan.key === "silver" ? "Start 7-Day Free Trial" : "Start 14-Day Free Trial",
                      })
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="max-w-7xl mx-auto mt-12 grid gap-6 sm:grid-cols-2">
        {/* Feature Comparison Table */}
        <Card className="sm:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg text-gray-900 dark:text-white">
              📊 {tr("compare_plans", "Compare All Plans")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto scrollbar-hide">
              <table className="mhub-comparison-table" role="table">
                <thead>
                  <tr className="border-b-2 border-gray-200 dark:border-slate-600">
                    <th className="text-left">{tr("feature", "Feature")}</th>
                    <th>{tr("basic_plan", "Basic")}</th>
                    <th>{tr("bronze_seller", "Bronze")}</th>
                    <th className="highlight-col">{tr("silver_seller", "Silver")} ⭐</th>
                    <th>{tr("premium", "Premium")} 👑</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700 dark:text-slate-300">
                  <tr>
                    <td>{tr("active_listings", "Active Listings")}</td>
                    <td>1</td><td>100</td><td className="highlight-col font-semibold">200</td><td className="font-bold">∞</td>
                  </tr>
                  <tr>
                    <td>{tr("listing_duration", "Listing Duration")}</td>
                    <td>15d</td><td>30d</td><td className="highlight-col">30d</td><td>45d</td>
                  </tr>
                  <tr>
                    <td>{tr("boosts_month", "Boosts")}</td>
                    <td className="text-gray-400 dark:text-slate-500">—</td>
                    <td className="text-gray-400 dark:text-slate-500">Coins</td>
                    <td className="highlight-col">5/6mo</td>
                    <td>5/mo</td>
                  </tr>
                  <tr>
                    <td>{tr("featured_month", "Featured")}</td>
                    <td className="text-gray-400 dark:text-slate-500">—</td>
                    <td className="text-gray-400 dark:text-slate-500">—</td>
                    <td className="highlight-col">5/6mo</td>
                    <td>5/mo</td>
                  </tr>
                  <tr>
                    <td>{tr("spotlight_month", "Spotlight")}</td>
                    <td className="text-gray-400 dark:text-slate-500">—</td>
                    <td className="text-gray-400 dark:text-slate-500">—</td>
                    <td className="highlight-col">5/6mo</td>
                    <td>5/mo</td>
                  </tr>
                  <tr>
                    <td>{tr("seller_badge_label", "Badge")}</td>
                    <td className="text-gray-400 dark:text-slate-500">—</td>
                    <td>🏷️</td>
                    <td className="highlight-col">✅</td>
                    <td>👑</td>
                  </tr>
                  <tr>
                    <td>{tr("analytics_label", "Analytics")}</td>
                    <td className="text-gray-400 dark:text-slate-500">—</td>
                    <td>Basic</td>
                    <td className="highlight-col">Full</td>
                    <td>Full</td>
                  </tr>
                  <tr>
                    <td>{tr("free_trial_label", "Free Trial")}</td>
                    <td className="text-gray-400 dark:text-slate-500">—</td>
                    <td className="text-gray-400 dark:text-slate-500">—</td>
                    <td className="highlight-col font-semibold text-blue-600 dark:text-blue-400">7 days</td>
                    <td className="font-semibold text-yellow-600 dark:text-yellow-400">14 days</td>
                  </tr>
                  <tr>
                    <td>{tr("monthly_cost_label", "Monthly Cost")}</td>
                    <td>₹500/post</td>
                    <td>~₹283</td>
                    <td className="highlight-col font-bold text-green-600 dark:text-green-400">~₹200</td>
                    <td className="font-bold text-green-600 dark:text-green-400">~₹125</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Feature Explanations */}
        <Card className="sm:col-span-2 border-dashed border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10">
          <CardHeader>
            <CardTitle className="text-lg text-gray-900 dark:text-white">
              💡 {tr("understand_features", "Understanding Seller Features")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-3 gap-4 text-sm">
              <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-gray-100 dark:border-slate-700">
                <p className="font-semibold text-gray-900 dark:text-white mb-1">🚀 Boost</p>
                <p className="text-gray-600 dark:text-gray-300 text-xs">
                  Pushes your listing to the top of search results for 24 hours. Increases inquiries by ~40%.
                </p>
              </div>
              <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-gray-100 dark:border-slate-700">
                <p className="font-semibold text-gray-900 dark:text-white mb-1">⭐ Featured</p>
                <p className="text-gray-600 dark:text-gray-300 text-xs">
                  Premium section placement with badge for 7 days. Increases inquiries by ~30%.
                </p>
              </div>
              <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-gray-100 dark:border-slate-700">
                <p className="font-semibold text-gray-900 dark:text-white mb-1">💎 Spotlight</p>
                <p className="text-gray-600 dark:text-gray-300 text-xs">
                  Boost + Featured combined for maximum visibility. 7-day premium placement.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-lg text-gray-900 dark:text-white">
              {tr("boost_listing_title", "Promotions Bundled With Plans")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {tr(
                "boost_listing_desc",
                "Boost, Featured, and Spotlight quotas are bundled into Silver and Premium plans — not sold separately. This forces real value into higher tiers.",
              )}
            </p>
            <div className="mt-3 space-y-1 text-xs text-gray-500 dark:text-gray-400">
              <p>• <strong>Silver:</strong> 5 boosts + 5 featured + 5 spotlights per 6 months</p>
              <p>• <strong>Premium:</strong> 5 boosts + 5 featured + 5 spotlights per month</p>
              <p>• <strong>Bronze/Basic:</strong> Use coins to redeem boosts (10 coins = 1 boost)</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-lg text-gray-900 dark:text-white">
              {tr("coin_economy_title", "Coin Economy")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
              Earn coins through activity. Redeem for boosts anytime.
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400">
              <div>
                <p className="font-semibold text-gray-700 dark:text-gray-200 mb-1">Earn</p>
                <p>Post listing → +1 coin</p>
                <p>Sell item → +3 coins</p>
                <p>Buy item → +1 coin</p>
                <p>Invite friend → +2 coins</p>
                <p>Welcome bonus → 90 coins</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700 dark:text-gray-200 mb-1">Redeem</p>
                <p>1 Boost → 10 coins</p>
                <p>1 Featured → 20 coins</p>
                <p>1 Spotlight → 40 coins</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="max-w-4xl mx-auto mt-16 text-center">
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          {t("secure_payments")} | {t("priority_support")} | {t("instant_activation")}
        </p>
      </div>
    </div>
  );
}



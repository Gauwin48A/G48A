import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  Check,
  Clock,
  Crown,
  Loader2,
  Shield,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";
import { getAccessToken, getUserId } from "@/utils/authStorage";
import { useToast } from "@/hooks/use-toast";

const tierPlans = [
  {
    key: "basic",
    nameKey: "basic",
    subtitleKey: "pay_as_you_go",
    price: "Rs49",
    periodKey: "per_post",
    icon: Clock,
    color: "bg-gray-100 border-gray-200",
    buttonClass: "bg-gray-600 hover:bg-gray-700",
    features: [
      { key: "one_single_post", included: true },
      { key: "fifteen_days", included: true },
      { key: "standard_reach", included: true },
      { key: "priority_support", included: false },
      { key: "verified_badge", included: false },
    ],
  },
  {
    key: "silver",
    nameKey: "silver_seller",
    subtitleKey: "semi_pro",
    price: "Rs499",
    periodKey: "per_6_months",
    icon: Shield,
    color: "bg-blue-50 border-blue-200",
    buttonClass: "bg-blue-600 hover:bg-blue-700",
    popular: true,
    features: [
      { key: "one_post_per_day", included: true },
      { key: "twentyfive_days", included: true },
      { key: "medium_priority_reach", included: true },
      { key: "verified_badge", included: true },
      { key: "priority_support", included: false },
    ],
  },
  {
    key: "premium",
    nameKey: "premium",
    subtitleKey: "top_seller",
    price: "Rs999",
    periodKey: "per_year",
    icon: Crown,
    color: "bg-gradient-to-br from-gray-900 to-gray-800 border-yellow-500",
    textColor: "text-white",
    buttonClass: "bg-yellow-500 hover:bg-yellow-400 text-black",
    featured: true,
    features: [
      { key: "unlimited_posts", included: true },
      { key: "fortyfive_days", included: true },
      { key: "top_feed_priority", included: true },
      { key: "verified_badge_crown", included: true },
      { key: "premium_support_247", included: true },
    ],
  },
];

export default function TierSelection() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [processingTier, setProcessingTier] = useState(null);
  const [activatedTier, setActivatedTier] = useState(null);
  const [error, setError] = useState(null);
  const [lastAttemptedTier, setLastAttemptedTier] = useState(null);

  const activatedTierLabel = useMemo(() => {
    if (!activatedTier) {
      return "";
    }
    const selectedPlan = tierPlans.find((plan) => plan.key === activatedTier);
    if (!selectedPlan) {
      return activatedTier;
    }
    return t(selectedPlan.nameKey);
  }, [activatedTier, t]);

  const planCtaLabel = (planKey) => {
    if (planKey === "basic") {
      return t("tier_cta_basic");
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

    try {
      await api.post("/users/upgrade-tier", { tier: tierKey });
      setActivatedTier(tierKey);
      const selectedPlan = tierPlans.find((plan) => plan.key === tierKey);
      const planLabel = selectedPlan ? t(selectedPlan.nameKey) : tierKey;
      toast({
        title: t("tier_plan_activated_title"),
        description: t("tier_plan_activated_desc", { plan: planLabel }),
      });
      setTimeout(() => {
        navigate(`/categories?tier=${encodeURIComponent(tierKey)}`);
      }, 800);
    } catch (requestError) {
      const errorMessage =
        requestError?.response?.data?.error ||
        requestError?.message ||
        t("tier_upgrade_failed_fallback");
      setError(errorMessage);
      toast({
        title: t("upgrade_failed"),
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setProcessingTier(null);
    }
  };

  const onRetry = () => {
    if (!lastAttemptedTier || processingTier) {
      return;
    }
    upgradeTier(lastAttemptedTier);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl">
            <TrendingUp className="w-8 h-8 text-white" />
          </div>
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">
          {t("choose_your_selling_power")}
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          {t("selling_power_subtitle")}
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
        <div className="max-w-md mx-auto mb-8 p-4 bg-green-100 border border-green-300 rounded-xl text-center">
          <Sparkles className="w-8 h-8 text-green-600 mx-auto mb-2" />
          <p className="text-green-800 font-semibold">
            {t("tier_activated_redirect", { plan: activatedTierLabel })}
          </p>
        </div>
      )}

      {error && (
        <div
          className="max-w-md mx-auto mb-8 p-4 bg-red-100 border border-red-300 rounded-xl text-center"
          marker="error"
        >
          <div className="flex items-start gap-3 text-left">
            <AlertTriangle className="w-5 h-5 text-red-700 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-900 font-semibold">{t("upgrade_failed")}</p>
              <p className="text-red-700 text-sm">{error}</p>
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

      <div className="max-w-6xl mx-auto grid gap-8 lg:grid-cols-3 items-stretch">
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
                      plan.featured ? "bg-yellow-400/20" : "bg-gray-100"
                    }`}
                  >
                    <Icon
                      className={`w-6 h-6 ${plan.featured ? "text-yellow-400" : "text-blue-600"}`}
                    />
                  </div>
                  <div>
                    <CardTitle
                      className={`text-xl font-bold ${plan.textColor || "text-gray-900"}`}
                    >
                      {t(plan.nameKey)}
                    </CardTitle>
                    <p
                      className={`text-sm ${plan.featured ? "text-yellow-400" : "text-gray-500"}`}
                    >
                      {t(plan.subtitleKey)}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex items-baseline">
                  <span
                    className={`text-4xl font-extrabold tracking-tight ${plan.textColor || "text-gray-900"}`}
                  >
                    {plan.price}
                  </span>
                  <span
                    className={`ml-1 text-lg ${plan.featured ? "text-gray-400" : "text-gray-500"}`}
                  >
                    {t(plan.periodKey)}
                  </span>
                </div>
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
                            ? plan.textColor || "text-gray-700"
                            : "text-gray-400 line-through"
                        }`}
                      >
                        {t(feature.key)}
                      </span>
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => upgradeTier(plan.key)}
                  disabled={isProcessing || Boolean(activatedTier)}
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
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="max-w-4xl mx-auto mt-16 text-center">
        <p className="text-gray-500 text-sm">
          {t("secure_payments")} | {t("priority_support")} | {t("instant_activation")}
        </p>
      </div>
    </div>
  );
}

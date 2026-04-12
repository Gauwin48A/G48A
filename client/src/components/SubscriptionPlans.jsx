import React, { useState, useEffect, useCallback, memo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Check,
  Crown,
  ShieldCheck,
  Star,
  Zap,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getApiOriginBase } from "@/lib/networkConfig";

const API_BASE = (() => {
  const base = String(getApiOriginBase()).replace(/\/+$/, "");
  return base.endsWith("/api") ? base : `${base}/api`;
})();

const TIER_ICONS = {
  basic: Zap,
  bronze: Star,
  silver: ShieldCheck,
  premium: Crown,
};

const TIER_COLORS = {
  basic: "border-gray-200",
  bronze: "border-orange-300",
  silver: "border-gray-400 ring-1 ring-gray-300",
  premium: "border-amber-400 ring-2 ring-amber-300",
};

const PlanCard = memo(function PlanCard({ plan, currentPlan, onSubscribe, subscribing }) {
  const isCurrent = currentPlan === plan.name;
  const Icon = TIER_ICONS[plan.name] || Zap;
  const borderColor = TIER_COLORS[plan.name] || "border-gray-200";
  const quotaPeriodLabel =
    plan.quotaPeriodMonths && plan.quotaPeriodMonths > 1
      ? `per ${plan.quotaPeriodMonths} months`
      : "per month";

  return (
    <Card className={`relative overflow-hidden ${borderColor} ${isCurrent ? "bg-primary/5" : ""}`}>
      {plan.name === "premium" && (
        <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] px-3 py-0.5 rounded-bl-lg font-medium">
          Best Value
        </div>
      )}
      {plan.trialDays > 0 && (
        <div className="absolute top-0 left-0 bg-green-500 text-white text-[10px] px-3 py-0.5 rounded-br-lg font-medium">
          {plan.trialDays}-day trial
        </div>
      )}
      <CardHeader className="pb-2 pt-6">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5" />
          <CardTitle className="text-lg capitalize">{plan.name}</CardTitle>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{plan.tagline}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <span className="text-3xl font-bold">₹{plan.price}</span>
          <span className="text-sm text-muted-foreground">
            /{plan.name === "basic" ? "listing" : plan.durationLabel}
          </span>
        </div>

        <ul className="space-y-2">
          {plan.features.map((feature, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        {plan.quotas && (
          <div className="bg-muted/50 rounded-lg p-3 space-y-1">
            <p className="text-xs font-medium">Plan Quotas ({quotaPeriodLabel}):</p>
            {plan.quotas.boost > 0 && (
              <p className="text-xs text-muted-foreground">{plan.quotas.boost} Boost</p>
            )}
            {plan.quotas.featured > 0 && (
              <p className="text-xs text-muted-foreground">{plan.quotas.featured} Featured</p>
            )}
            {plan.quotas.spotlight > 0 && (
              <p className="text-xs text-muted-foreground">{plan.quotas.spotlight} Spotlight</p>
            )}
          </div>
        )}

        <Button
          className="w-full"
          variant={isCurrent ? "outline" : plan.name === "premium" ? "default" : "outline"}
          disabled={isCurrent || subscribing}
          onClick={() => onSubscribe(plan.name)}
        >
          {subscribing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isCurrent ? (
            "Current Plan"
          ) : (
            `Choose ${plan.name}`
          )}
        </Button>
      </CardContent>
    </Card>
  );
});

export default function SubscriptionPlans() {
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [message, setMessage] = useState(null);

  const currentPlan = user?.current_plan || user?.tier || "basic";

  useEffect(() => {
    async function loadPlans() {
      try {
        const res = await fetch(`${API_BASE}/subscriptions/plans`, {
          headers: { "Content-Type": "application/json" },
        });
        if (res.ok) {
          const data = await res.json();
          setPlans(data.plans || []);
        }
      } catch {
        // Fail gracefully
      } finally {
        setLoading(false);
      }
    }
    loadPlans();
  }, []);

  const handleSubscribe = useCallback(async (planName) => {
    setSubscribing(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE}/subscriptions/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ planName }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: data.message });
        // Re-fetch plans to reflect subscription change
        setPlans((prev) => [...prev]);
      } else {
        setMessage({ type: "error", text: data.error || "Subscription failed" });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Failed to process subscription" });
    } finally {
      setSubscribing(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Choose Your Plan</h2>
        <p className="text-muted-foreground mt-1">
          Boost your listings and unlock premium features
        </p>
        {currentPlan !== "basic" && (
          <Badge variant="secondary" className="mt-2">
            Current: {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}
          </Badge>
        )}
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm text-center ${
          message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((plan) => (
          <PlanCard
            key={plan.name}
            plan={plan}
            currentPlan={currentPlan}
            onSubscribe={handleSubscribe}
            subscribing={subscribing}
          />
        ))}
      </div>
    </div>
  );
}

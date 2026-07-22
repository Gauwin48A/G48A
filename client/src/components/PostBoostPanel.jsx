import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, Sparkles, TrendingUp, CheckCircle, Coins } from "lucide-react";
import api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

import { useAuth } from "@/context/AuthContext";

const BOOST_OPTIONS_PREMIUM = [
  {
    type: "boost",
    label: "Boost (24h)",
    days: 1,
    desc: "Higher in search & feeds",
    coinCost: 50,
    amount: 49,
    Icon: Zap,
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    border: "border-emerald-300",
    accent: "text-emerald-700 dark:text-emerald-300",
  },
  {
    type: "featured",
    label: "Top Placement (7d)",
    days: 7,
    desc: "Featured badge + top placement",
    coinCost: 200,
    amount: 99,
    Icon: Sparkles,
    bg: "bg-purple-50 dark:bg-purple-900/20",
    border: "border-purple-300",
    accent: "text-purple-700 dark:text-purple-300",
  },
  {
    type: "spotlight",
    label: "Spotlight (30d)",
    days: 30,
    desc: "Top placement + Spotlight badge",
    coinCost: 500,
    amount: 199,
    Icon: TrendingUp,
    bg: "bg-orange-50 dark:bg-orange-900/20",
    border: "border-orange-300",
    accent: "text-orange-700 dark:text-orange-300",
  },
];

const BOOST_OPTIONS_STANDARD = [
  {
    type: "boost",
    label: "Boost (24h)",
    days: 1,
    desc: "Higher in search & feeds",
    coinCost: 100,
    amount: 49,
    Icon: Zap,
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    border: "border-emerald-300",
    accent: "text-emerald-700 dark:text-emerald-300",
  },
  {
    type: "featured",
    label: "Top Placement (7d)",
    days: 7,
    desc: "Featured badge + top placement",
    coinCost: 500,
    amount: 99,
    Icon: Sparkles,
    bg: "bg-purple-50 dark:bg-purple-900/20",
    border: "border-purple-300",
    accent: "text-purple-700 dark:text-purple-300",
  },
  {
    type: "spotlight",
    label: "Spotlight (30d)",
    days: 30,
    desc: "Top placement + Spotlight badge",
    coinCost: 1000,
    amount: 199,
    Icon: TrendingUp,
    bg: "bg-orange-50 dark:bg-orange-900/20",
    border: "border-orange-300",
    accent: "text-orange-700 dark:text-orange-300",
  },
];

export default function PostBoostPanel({ postId }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(null);
  const [boosted, setBoosted] = useState(null);
  const [quotaStatus, setQuotaStatus] = useState(null);
  const [coinBalance, setCoinBalance] = useState(null);
  const [coinLoading, setCoinLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      setCoinLoading(true);
      try {
        const [quotaData, coinData] = await Promise.allSettled([
          api.get("/api/subscriptions/quota"),
          api.get("/api/coins/balance"),
        ]);
        if (mounted) {
          setQuotaStatus(quotaData.status === "fulfilled" ? quotaData.value : null);
          setCoinBalance(coinData.status === "fulfilled" ? coinData.value?.balance ?? 0 : 0);
        }
      } catch {
        if (mounted) {
          setQuotaStatus(null);
          setCoinBalance(0);
        }
      } finally {
        if (mounted) {
          setCoinLoading(false);
        }
      }
    }
    loadData();
    return () => { mounted = false; };
  }, []);

  const quotaLabel = useMemo(() => {
    const period = quotaStatus?.quotaPeriodMonths || 1;
    return period > 1 ? `per ${period} months` : "per month";
  }, [quotaStatus?.quotaPeriodMonths]);

  const remainingByType = useMemo(() => {
    const fallback = { boost: 0, featured: 0, spotlight: 0 };
    if (!quotaStatus) return fallback;
    return {
      boost: quotaStatus?.boost?.remaining ?? 0,
      featured: quotaStatus?.featured?.remaining ?? 0,
      spotlight: quotaStatus?.spotlight?.remaining ?? 0,
    };
  }, [quotaStatus]);

  const isQuotaAvailable = (type) => {
    if (!quotaStatus) return false;
    return (remainingByType[type] ?? 0) > 0;
  };

  const canRedeemWithCoins = (coinCost) => {
    return (coinBalance ?? 0) >= coinCost;
  };

  const buildPaymentPath = (boostType) => {
    const params = new URLSearchParams();
    params.set("purpose", "boost");
    params.set("boostType", boostType);
    if (postId) {
      params.set("postId", postId);
      params.set("returnTo", `/post/${postId}`);
    }
    return `/payment?${params.toString()}`;
  };

  const handleBoost = async (boostType) => {
    if (!postId || loading) return;
    if (!isQuotaAvailable(boostType)) {
      toast({
        title: "No quota remaining",
        description: "Upgrade your plan or use coins to boost.",
        variant: "destructive",
      });
      return;
    }
    setLoading(boostType);
    try {
      const res = await api.post(`/api/posts/${postId}/boost`, { boostType });
      setBoosted(boostType);
      setQuotaStatus((prev) => {
        if (!prev) return prev;
        const next = { ...prev };
        if (next[boostType]) {
          next[boostType].remaining = Math.max(0, (next[boostType].remaining ?? 0) - 1);
        }
        return next;
      });
      toast({
        title: "Boost applied!",
        description: res?.message || `Your post is now ${boostType === "spotlight" ? "on the homepage spotlight" : boostType === "featured" ? "featured in feeds" : "boosted in search"}.`,
      });
    } catch (err) {
      toast({
        title: "Boost failed",
        description: err?.response?.data?.error || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const handleRedeemCoin = async (boostType, coinCost) => {
    if (!postId || loading) return;
    if (!canRedeemWithCoins(coinCost)) {
      toast({
        title: "Not enough coins",
        description: `Need ${coinCost} coins. You have ${coinBalance ?? 0}.`,
        variant: "destructive",
      });
      return;
    }
    setLoading(`coin-${boostType}`);
    try {
      const res = await api.post("/api/coins/redeem", { type: boostType, postId });
      setBoosted(boostType);
      setCoinBalance(res?.newBalance ?? Math.max(0, (coinBalance ?? 0) - coinCost));
      toast({
        title: "Redeemed with coins!",
        description: res?.message || `${boostType} applied using ${coinCost} coins.`,
      });
    } catch (err) {
      toast({
        title: "Redemption failed",
        description: err?.response?.data?.error || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const { user } = useAuth();
  const isPremiumUser = useMemo(() => {
    if (!user) return true;
    const plan = String(user.current_plan || user.membership_plan || user.subscription_tier || user.tier || "").toLowerCase();
    return Boolean(user.is_demo || plan.includes("premium") || plan.includes("gold"));
  }, [user]);

  const activeBoostOptions = isPremiumUser ? BOOST_OPTIONS_PREMIUM : BOOST_OPTIONS_STANDARD;

  return (
    <div className="mhub-premium-surface rounded-2xl border p-4 shadow-lg !border-violet-200 dark:!border-violet-800">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-violet-500" />
          <h3 className="font-bold text-gray-900 dark:text-white">Boost This Listing</h3>
        </div>
        {!coinLoading && coinBalance !== null && (
          <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 dark:bg-amber-900/20 rounded-full">
            <Coins className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">{coinBalance}</span>
          </div>
        )}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        Use plan quotas or redeem coins. Boosts appear in search, feeds, and homepage.
      </p>
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
        Sponsored listings show boosted posts. Premium listings are from Premium-tier sellers.
      </p>

      {boosted && (
        <div className="flex items-center gap-2 mb-3 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <span className="text-xs text-green-700 dark:text-green-300 font-medium">
            {activeBoostOptions.find((o) => o.type === boosted)?.label} boost is now active!
          </span>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {activeBoostOptions.map(({ type, label, days, desc, coinCost, amount, Icon, bg, border, accent }) => {
          const remaining = remainingByType[type] ?? 0;
          const hasQuota = remaining > 0;
          const hasCoinBalance = canRedeemWithCoins(coinCost);
          const isLoading = loading === type || loading === `coin-${type}`;
          const canPayDirect = Boolean(postId);

          return (
            <div
              key={type}
              className={`flex flex-col items-center gap-1 rounded-xl border-2 p-3 transition-all ${bg} ${border} ${accent} ${
                boosted === type ? "ring-2 ring-offset-1 ring-green-400" : ""
              }`}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Icon className="w-5 h-5" />
              )}
              <span className="font-semibold text-xs">{label}</span>
              <span className="text-xs text-center leading-tight">{days} days</span>
              <span className="text-xs text-center text-gray-500 dark:text-gray-400 leading-tight">{desc}</span>

              {/* Plan quota button */}
              {hasQuota && (
                <button
                  type="button"
                  disabled={isLoading || !!loading}
                  onClick={() => handleBoost(type)}
                  className="mt-1 w-full text-xs font-semibold px-2 py-1.5 rounded-lg bg-white/80 dark:bg-gray-700 border border-current/20 hover:shadow-sm transition-all disabled:opacity-50"
                >
                  Use Plan ({remaining} left {quotaLabel})
                </button>
              )}

              {/* Coin redeem button */}
              <button
                type="button"
                disabled={isLoading || !hasCoinBalance || !!loading}
                onClick={() => handleRedeemCoin(type, coinCost)}
                className="w-full text-xs font-semibold px-2 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:shadow-sm transition-all disabled:opacity-40"
              >
                <span className="flex items-center justify-center gap-1">
                  <Coins className="w-4 h-4" />
                  {coinCost} coins
                </span>
              </button>

              {!hasQuota && !hasCoinBalance ? (
                <button
                  type="button"
                  disabled={isLoading || !canPayDirect}
                  onClick={() => navigate(buildPaymentPath(type))}
                  className="w-full text-xs font-semibold px-2 py-1.5 rounded-lg bg-white/90 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:shadow-sm transition-all disabled:opacity-40"
                >
                  Pay Rs {amount}
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 text-center">
        Visibility: Spotlight → Featured → Boost → Premium → Silver → Bronze → Basic
      </p>
    </div>
  );
}


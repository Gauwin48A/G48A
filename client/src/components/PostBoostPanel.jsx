import React, { useEffect, useMemo, useState } from "react";
import { Zap, Sparkles, TrendingUp, CheckCircle, Coins } from "lucide-react";
import api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const BOOST_OPTIONS = [
  {
    type: "boost",
    label: "Boost",
    days: 7,
    desc: "Higher in search results",
    coinCost: 10,
    Icon: Zap,
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    border: "border-emerald-300",
    accent: "text-emerald-700 dark:text-emerald-300",
  },
  {
    type: "featured",
    label: "Featured",
    days: 14,
    desc: "Featured badge + feed priority",
    coinCost: 20,
    Icon: Sparkles,
    bg: "bg-purple-50 dark:bg-purple-900/20",
    border: "border-purple-300",
    accent: "text-purple-700 dark:text-purple-300",
  },
  {
    type: "spotlight",
    label: "Spotlight",
    days: 30,
    desc: "Homepage top placement",
    coinCost: 40,
    Icon: TrendingUp,
    bg: "bg-orange-50 dark:bg-orange-900/20",
    border: "border-orange-300",
    accent: "text-orange-700 dark:text-orange-300",
  },
];

export default function PostBoostPanel({ postId }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(null);
  const [boosted, setBoosted] = useState(null);
  const [quotaStatus, setQuotaStatus] = useState(null);
  const [quotaLoading, setQuotaLoading] = useState(true);
  const [coinBalance, setCoinBalance] = useState(null);
  const [coinLoading, setCoinLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      setQuotaLoading(true);
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
          setQuotaLoading(false);
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

  return (
    <div className="rounded-2xl border border-violet-200 dark:border-violet-800 bg-white dark:bg-gray-800 p-4 shadow-lg">
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

      {boosted && (
        <div className="flex items-center gap-2 mb-3 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <span className="text-xs text-green-700 dark:text-green-300 font-medium">
            {BOOST_OPTIONS.find((o) => o.type === boosted)?.label} boost is now active!
          </span>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {BOOST_OPTIONS.map(({ type, label, days, desc, coinCost, Icon, bg, border, accent }) => {
          const remaining = remainingByType[type] ?? 0;
          const hasQuota = remaining > 0;
          const hasCoinBalance = canRedeemWithCoins(coinCost);
          const isLoading = loading === type || loading === `coin-${type}`;
          const disabled = quotaLoading || coinLoading || (!hasQuota && !hasCoinBalance) || !!loading;

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
              <span className="text-[10px] text-center leading-tight">{days} days</span>
              <span className="text-[10px] text-center text-gray-500 dark:text-gray-400 leading-tight">{desc}</span>

              {/* Plan quota button */}
              {hasQuota && (
                <button
                  type="button"
                  disabled={isLoading || !!loading}
                  onClick={() => handleBoost(type)}
                  className="mt-1 w-full text-[10px] font-semibold px-2 py-1.5 rounded-lg bg-white/80 dark:bg-gray-700 border border-current/20 hover:shadow-sm transition-all disabled:opacity-50"
                >
                  Use Plan ({remaining} left {quotaLabel})
                </button>
              )}

              {/* Coin redeem button */}
              <button
                type="button"
                disabled={isLoading || !hasCoinBalance || !!loading}
                onClick={() => handleRedeemCoin(type, coinCost)}
                className="w-full text-[10px] font-semibold px-2 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:shadow-sm transition-all disabled:opacity-40"
              >
                <span className="flex items-center justify-center gap-1">
                  <Coins className="w-3 h-3" />
                  {coinCost} coins
                </span>
              </button>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-3 text-center">
        Visibility: Spotlight → Featured → Boost → Premium → Silver → Bronze → Basic
      </p>
    </div>
  );
}

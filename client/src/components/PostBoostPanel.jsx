import React, { useState } from "react";
import { Zap, Sparkles, TrendingUp, CheckCircle } from "lucide-react";
import api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const BOOST_OPTIONS = [
  {
    type: "boost",
    label: "Boost",
    price: "₹49",
    amountInr: 49,
    days: 7,
    desc: "Higher in search results",
    Icon: Zap,
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    border: "border-emerald-300",
    accent: "text-emerald-700 dark:text-emerald-300",
  },
  {
    type: "featured",
    label: "Featured",
    price: "₹99",
    amountInr: 99,
    days: 14,
    desc: "Featured badge + feed priority",
    Icon: Sparkles,
    bg: "bg-purple-50 dark:bg-purple-900/20",
    border: "border-purple-300",
    accent: "text-purple-700 dark:text-purple-300",
  },
  {
    type: "spotlight",
    label: "Spotlight",
    price: "₹199",
    amountInr: 199,
    days: 30,
    desc: "Homepage top placement",
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

  const handleBoost = async (boostType) => {
    if (!postId || loading) return;
    setLoading(boostType);
    try {
      const res = await api.post(`/api/posts/${postId}/boost`, { boostType });
      setBoosted(boostType);
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

  return (
    <div className="rounded-2xl border border-violet-200 dark:border-violet-800 bg-white dark:bg-gray-800 p-4 shadow-lg">
      <div className="flex items-center gap-2 mb-1">
        <Zap className="w-5 h-5 text-violet-500" />
        <h3 className="font-bold text-gray-900 dark:text-white">Boost This Listing</h3>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        Increase visibility instantly. Boosts appear in search, feeds, and the homepage.
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
        {BOOST_OPTIONS.map(({ type, label, price, days, desc, Icon, bg, border, accent }) => (
          <button
            key={type}
            type="button"
            disabled={!!loading}
            onClick={() => handleBoost(type)}
            className={`flex flex-col items-center gap-1 rounded-xl border-2 p-3 transition-all ${bg} ${border} ${accent} ${
              boosted === type ? "ring-2 ring-offset-1 ring-green-400" : "hover:shadow-md"
            } ${loading === type ? "opacity-60 cursor-wait" : ""}`}
          >
            {loading === type ? (
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Icon className="w-5 h-5" />
            )}
            <span className="font-black text-base leading-none">{price}</span>
            <span className="font-semibold text-xs">{label}</span>
            <span className="text-[10px] text-center leading-tight">{days} days</span>
            <span className="text-[10px] text-center text-gray-500 dark:text-gray-400 leading-tight">{desc}</span>
          </button>
        ))}
      </div>
      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-3 text-center">
        Priority order: Spotlight → Featured → Boost → Premium Sellers
      </p>
    </div>
  );
}

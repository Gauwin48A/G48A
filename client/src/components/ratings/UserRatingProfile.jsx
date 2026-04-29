import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import api from "@/services/api";
import {
  Star,
  MessageCircle,
  Package,
  TrendingUp,
  Truck,
  ShieldCheck,
  Loader2,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  CategoryBar – horizontal bar for a category rating                */
/* ------------------------------------------------------------------ */
function CategoryBar({ label, icon: Icon, value, maxValue = 5 }) {
  const pct = maxValue > 0 ? Math.min((Number(value) / maxValue) * 100, 100) : 0;
  const numVal = Number(value || 0);
  const color =
    numVal >= 4
      ? "bg-emerald-500"
      : numVal >= 3
        ? "bg-amber-500"
        : numVal >= 2
          ? "bg-orange-500"
          : "bg-red-500";

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5 w-32 flex-shrink-0">
        <Icon className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
        <span className="text-xs text-gray-600 dark:text-gray-300">{label}</span>
      </div>
      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 w-8 text-right">
        {numVal > 0 ? numVal.toFixed ? numVal.toFixed(1) : numVal : "—"}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  StarDisplay – render filled/empty stars                           */
/* ------------------------------------------------------------------ */
function StarDisplay({ rating, size = "h-4 w-4" }) {
  const numRating = Number(rating || 0);
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${size} ${
            star <= Math.round(numRating)
              ? "fill-amber-400 text-amber-400"
              : "fill-gray-200 text-gray-200 dark:fill-gray-600 dark:text-gray-600"
          }`}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  RatingCard – seller or buyer rating summary                       */
/* ------------------------------------------------------------------ */
function RatingCard({ type, data, categories }) {
  const isSeller = type === "seller";
  const bgGradient = isSeller
    ? "from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20"
    : "from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20";
  const borderColor = isSeller
    ? "border-blue-200 dark:border-blue-800"
    : "border-emerald-200 dark:border-emerald-800";
  const accentColor = isSeller
    ? "text-blue-700 dark:text-blue-300"
    : "text-emerald-700 dark:text-emerald-300";
  const icon = isSeller ? Package : ShieldCheck;
  const Icon = icon;

  return (
    <div
      className={`bg-gradient-to-br ${bgGradient} rounded-xl p-4 border ${borderColor}`}
    >
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`h-5 w-5 ${accentColor}`} />
        <h3 className={`text-sm font-bold ${accentColor}`}>
          {isSeller ? "Seller Rating" : "Buyer Rating"}
        </h3>
        <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
          {data.total || 0} review{data.total !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <span className={`text-3xl font-bold ${accentColor}`}>
          {Number(data.avgRating || 0) > 0 ? data.avgRating : "—"}
        </span>
        <div>
          <StarDisplay rating={data.avgRating} />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Based on {data.total || 0} reviews
          </p>
        </div>
      </div>

      {/* Category breakdowns */}
      <div className="space-y-2">
        {categories.map((cat) => (
          <CategoryBar
            key={cat.key}
            label={cat.label}
            icon={cat.icon}
            value={data[cat.key] || 0}
          />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  UserRatingProfile – main component                                */
/* ------------------------------------------------------------------ */
export default function UserRatingProfile({ userId }) {
  const { t } = useTranslation();
  const tr = (key, fallback) => t(key, { defaultValue: fallback });

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await api.get(`/reviews/stats/${userId}`);
      setStats(res?.data ?? res);
    } catch (err) {
      setError(err?.message || "Failed to load ratings");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-red-600 dark:text-red-400 text-center py-4">{error}</p>
    );
  }

  if (!stats) return null;

  const sellerCategories = [
    { key: "avgCommunication", label: "Communication", icon: MessageCircle },
    { key: "avgQuality", label: "Product Quality", icon: Package },
    { key: "avgValue", label: "Value for Money", icon: TrendingUp },
    { key: "avgShipping", label: "Shipping Speed", icon: Truck },
  ];

  const buyerCategories = [
    { key: "avgCommunication", label: "Communication", icon: MessageCircle },
    { key: "avgValue", label: "Fair Pricing", icon: TrendingUp },
  ];

  return (
    <div className="space-y-4">
      {/* Overall score */}
      <div className="text-center bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
        <p className="text-xs uppercase tracking-wide font-semibold text-amber-700 dark:text-amber-300 mb-1">
          {tr("overall_reputation", "Overall Reputation")}
        </p>
        <div className="flex items-center justify-center gap-2">
          <span className="text-lg sm:text-2xl md:text-3xl font-black text-amber-700 dark:text-amber-300">
            {Number(stats.overallRating || 0) > 0 ? stats.overallRating : "—"}
          </span>
          <StarDisplay rating={stats.overallRating} size="h-5 w-5" />
        </div>
      </div>

      {/* Seller + Buyer side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RatingCard type="seller" data={stats.seller} categories={sellerCategories} />
        <RatingCard type="buyer" data={stats.buyer} categories={buyerCategories} />
      </div>
    </div>
  );
}

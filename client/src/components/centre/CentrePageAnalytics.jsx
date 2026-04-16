import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import api from "@/services/api";
import {
  TrendingUp,
  Eye,
  Users,
  ShoppingBag,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  StatCard                                                          */
/* ------------------------------------------------------------------ */
function StatCard({ icon: Icon, label, value, trend, trendLabel, color }) {
  const isPositive = Number(trend || 0) >= 0;
  return (
    <div className="bg-white dark:bg-gray-900/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
        {trend !== undefined && trend !== null && (
          <div
            className={`flex items-center gap-0.5 text-[10px] font-semibold ${
              isPositive
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            {isPositive ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {Math.abs(Number(trend))}%
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
        {label}
        {trendLabel && (
          <span className="ml-1 text-gray-400 dark:text-gray-500">
            {trendLabel}
          </span>
        )}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  MiniChart – simple sparkline                                      */
/* ------------------------------------------------------------------ */
function MiniChart({ data = [], color = "#3b82f6" }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const width = 200;
  const height = 50;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-12" preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  CentrePageAnalytics                                               */
/* ------------------------------------------------------------------ */
export default function CentrePageAnalytics({ channelId }) {
  const { t } = useTranslation();
  const tr = (key, fallback) => t(key, { defaultValue: fallback });

  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30d");

  const fetchAnalytics = useCallback(async () => {
    if (!channelId) return;
    setLoading(true);
    try {
      const res = await api.get(`/channel/${channelId}/analytics`, {
        params: { period },
      });
      setAnalytics(res?.data ?? res);
    } catch {
      // Analytics might not be available yet — mock reasonable defaults
      setAnalytics({
        views: { total: 0, trend: 0 },
        followers: { total: 0, trend: 0, recentData: [] },
        listings: { total: 0, active: 0 },
        engagement: { total: 0, trend: 0, recentData: [] },
        topPosts: [],
      });
    } finally {
      setLoading(false);
    }
  }, [channelId, period]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          {tr("page_analytics", "Page Analytics")}
        </h3>
        <div className="flex gap-1">
          {["7d", "30d", "90d"].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`text-[10px] font-medium px-2.5 py-1 rounded-full transition-colors ${
                period === p
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={Eye}
          label={tr("page_views", "Page Views")}
          value={analytics.views?.total?.toLocaleString() || "0"}
          trend={analytics.views?.trend}
          trendLabel={tr("vs_last_period", "vs last period")}
          color="bg-blue-500"
        />
        <StatCard
          icon={Users}
          label={tr("followers", "Followers")}
          value={analytics.followers?.total?.toLocaleString() || "0"}
          trend={analytics.followers?.trend}
          trendLabel={tr("new_this_period", "new this period")}
          color="bg-emerald-500"
        />
        <StatCard
          icon={ShoppingBag}
          label={tr("active_listings", "Active Listings")}
          value={analytics.listings?.active?.toLocaleString() || "0"}
          color="bg-amber-500"
        />
        <StatCard
          icon={TrendingUp}
          label={tr("engagement", "Engagement")}
          value={analytics.engagement?.total?.toLocaleString() || "0"}
          trend={analytics.engagement?.trend}
          color="bg-purple-500"
        />
      </div>

      {/* Growth charts */}
      {(analytics.followers?.recentData?.length > 0 ||
        analytics.engagement?.recentData?.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {analytics.followers?.recentData?.length > 0 && (
            <div className="bg-white dark:bg-gray-900/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                {tr("follower_growth", "Follower Growth")}
              </p>
              <MiniChart data={analytics.followers.recentData} color="#10b981" />
            </div>
          )}
          {analytics.engagement?.recentData?.length > 0 && (
            <div className="bg-white dark:bg-gray-900/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                {tr("engagement_trend", "Engagement Trend")}
              </p>
              <MiniChart data={analytics.engagement.recentData} color="#8b5cf6" />
            </div>
          )}
        </div>
      )}

      {/* Top posts */}
      {analytics.topPosts?.length > 0 && (
        <div className="bg-white dark:bg-gray-900/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            {tr("top_performing_posts", "Top Performing Posts")}
          </p>
          <div className="space-y-2">
            {analytics.topPosts.slice(0, 5).map((post, idx) => (
              <div
                key={post.id || idx}
                className="flex items-center gap-3 py-2 border-b border-gray-100 dark:border-gray-800 last:border-0"
              >
                <span className="text-xs font-bold text-gray-400 w-5">{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                    {post.title || post.description || "Post"}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" /> {post.views || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" /> {post.engagement || 0}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

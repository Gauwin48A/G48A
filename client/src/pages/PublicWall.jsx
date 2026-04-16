import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Trophy,
  Star,
  Medal,
  Crown,
  Shield,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "@/services/api";
const safeNum = (val) => {
    const num = Number(val || 0);
    return Number.isFinite(num) ? num : 0;
  },
  getErrorMessage = (err) => {
    const status = Number(err?.status || err?.response?.status || 0);
    return status === 401 || status === 403
      ? "This session cannot access public wall insights right now."
      : "Public wall data is temporarily unavailable. Please retry.";
  },
  getRankIcon = (rank) => {
    switch (rank) {
      case "Gold":
        return React.createElement(Crown, { className: "w-5 h-5 text-yellow-500 dark:text-yellow-300" });
      case "Silver":
        return React.createElement(Medal, { className: "w-5 h-5 text-gray-400 dark:text-gray-300" });
      case "Bronze":
        return React.createElement(Trophy, { className: "w-5 h-5 text-amber-600 dark:text-amber-300" });
      default:
        return React.createElement(Star, { className: "w-5 h-5 text-gray-400 dark:text-gray-300" });
    }
  },
  getRankStyle = (rank) => {
    switch (rank) {
      case "Gold":
        return "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-600";
      case "Silver":
        return "bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-700/30 dark:text-gray-300 dark:border-gray-500";
      case "Bronze":
        return "bg-amber-100 text-amber-800 border-amber-300 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-600";
      default:
        return "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-600";
    }
  },
  PublicWall = () => {
    const { t: translate } = useTranslation(),
      navigate = useNavigate(),
      [topSellers, setTopSellers] = useState([]),
      [topBuyers, setTopBuyers] = useState([]),
      [topUsers, setTopUsers] = useState([]),
      [error, setError] = useState(""),
      [loading, setLoading] = useState(!0),
      [retryCount, setRetryCount] = useState(0),
      hasData = topSellers.length > 0 || topBuyers.length > 0 || topUsers.length > 0,
      fetchData = useCallback(async (signal) => {
        setLoading(!0);
        try {
          const response = await api.get("/publicwall", { signal });
          const data = response?.data ?? response;
          setTopSellers(Array.isArray(data?.topSellers) ? data.topSellers : []),
            setTopBuyers(Array.isArray(data?.topBuyers) ? data.topBuyers : []),
            setTopUsers(Array.isArray(data?.topUsers) ? data.topUsers : []),
            setError("");
        } catch (catchErr) {
          if (catchErr?.code === "ERR_CANCELED" || catchErr?.name === "CanceledError") return;
          setError(getErrorMessage(catchErr));
        } finally {
          setLoading(!1);
        }
      }, []);
    useEffect(() => {
      const controller = new AbortController();
      return (
        fetchData(controller.signal),
        () => {
          controller.abort();
        }
      );
    }, [fetchData, retryCount]);
    const stats = useMemo(() => {
      const totalSales = topSellers.reduce((acc, item) => acc + safeNum(item.sales), 0),
        activeBuyers = topBuyers.length,
        totalVolume = topSellers.reduce((acc, item) => acc + safeNum(item.coins), 0),
        combined = [...topSellers, ...topBuyers],
        verifiedCount = combined.filter((entry) => !!entry.verified).length,
        verificationRate = combined.length > 0 ? Math.round((verifiedCount / combined.length) * 100) : 0;
      return {
        totalSales: totalSales,
        activeBuyers: activeBuyers,
        totalVolume: totalVolume,
        verificationRate: verificationRate,
      };
    }, [topBuyers, topSellers]);
    return loading && !hasData
      ? React.createElement(
          "div",
          {
            className:
              "min-h-screen mhub-premium-page bg-gradient-to-br from-sky-50 via-white to-blue-100 dark:from-slate-950 dark:via-slate-900/60 dark:to-slate-950 dark:bg-gradient-to-br",
          },
          React.createElement(
            "div",
            { className: "max-w-7xl mx-auto px-4 py-8 space-y-6 page-shell page-pad" },
            [1, 2, 3].map((idx) =>
              React.createElement(
                Card,
                { key: idx, className: "animate-pulse rounded-3xl" },
                React.createElement(
                  CardContent,
                  { className: "p-8 space-y-4" },
                  React.createElement("div", {
                    className: "h-6 w-56 bg-gray-200 dark:bg-gray-700 rounded dark:bg-gray-900",
                  }),
                  React.createElement("div", {
                    className:
                      "h-4 w-full bg-gray-200 dark:bg-gray-700 rounded dark:bg-gray-900",
                  }),
                  React.createElement("div", {
                    className: "h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded dark:bg-gray-900",
                  }),
                ),
              ),
            ),
          ),
        )
      : React.createElement(
          "div",
          {
            className:
              "min-h-screen mhub-premium-page bg-gradient-to-br from-sky-50 via-white to-blue-100 dark:from-slate-950 dark:via-slate-900/60 dark:to-slate-950 dark:bg-gradient-to-br",
          },
          React.createElement(
            "div",
            { className: "max-w-7xl mx-auto px-4 py-8 page-shell page-pad" },
            React.createElement(
              "div",
              { className: "mb-8 text-center dark:text-center" },
              React.createElement(
                "div",
                {
                  className: "flex items-center justify-center space-x-4 mb-4",
                },
                React.createElement(
                  "div",
                  {
                    className:
                      "w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center dark:bg-gradient-to-r",
                  },
                  React.createElement(Trophy, { className: "w-8 h-8 text-white dark:text-white" }),
                ),
                React.createElement(
                  "div",
                  null,
                  React.createElement(
                    "h1",
                    {
                      className:
                        "text-4xl font-bold text-gray-900 dark:text-white dark:text-gray-100",
                    },
                    translate("public_wall", "Public Wall"),
                  ),
                  React.createElement(
                    "p",
                    { className: "text-gray-600 dark:text-gray-300 text-lg dark:text-gray-200" },
                    translate(
                      "public_wall_subtitle",
                      "Celebrating top performance from the community",
                    ),
                  ),
                ),
              ),
              React.createElement(
                "div",
                {
                  className:
                    "bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-2xl p-6 inline-block dark:bg-gradient-to-r dark:text-white",
                },
                React.createElement(
                  "h2",
                  { className: "text-2xl font-bold mb-2" },
                  "Monthly Champions",
                ),
                React.createElement(
                  "p",
                  { className: "text-sky-100 dark:text-sky-200" },
                  "Recognition for trusted, high-quality marketplace activity",
                ),
              ),
            ),
            error && hasData
              ? React.createElement(
                  Alert,
                  { variant: "destructive", className: "mb-6 bg-white/90 dark:bg-slate-900/90" },
                  React.createElement(AlertTriangle, { className: "h-4 w-4" }),
                  React.createElement(AlertTitle, null, "Latest refresh failed"),
                  React.createElement(
                    AlertDescription,
                    null,
                    error,
                    " Showing last available snapshot.",
                  ),
                  React.createElement(
                    "div",
                    { className: "mt-3" },
                    React.createElement(
                      Button,
                      { size: "sm", onClick: () => setRetryCount((prev) => prev + 1) },
                      React.createElement(RefreshCw, { className: "h-4 w-4 mr-2" }),
                      "Retry",
                    ),
                  ),
                )
              : null,
            error && !hasData
              ? React.createElement(
                  Card,
                  { className: "max-w-2xl mx-auto mb-8 border-red-200 page-shell page-pad dark:border-red-600/40" },
                  React.createElement(
                    CardContent,
                    { className: "p-8 text-center dark:text-center" },
                    React.createElement(
                      "div",
                      {
                        className:
                          "w-12 h-12 mx-auto mb-3 rounded-full bg-red-100 text-red-600 flex items-center justify-center dark:bg-red-950/20 dark:text-red-300",
                      },
                      React.createElement(AlertTriangle, { className: "w-6 h-6" }),
                    ),
                    React.createElement(
                      "h3",
                      {
                        className:
                          "text-xl font-semibold text-gray-900 dark:text-white mb-2 dark:text-gray-100",
                      },
                      "Public wall unavailable",
                    ),
                    React.createElement(
                      "p",
                      { className: "text-gray-600 dark:text-gray-300 mb-4 dark:text-gray-200" },
                      error,
                    ),
                    React.createElement(
                      "div",
                      { className: "flex flex-wrap justify-center gap-2" },
                      React.createElement(
                        Button,
                        { onClick: () => setRetryCount((prev) => prev + 1) },
                        React.createElement(RefreshCw, { className: "h-4 w-4 mr-2" }),
                        "Retry",
                      ),
                      React.createElement(
                        Button,
                        {
                          variant: "outline",
                          onClick: () => navigate("/all-posts"),
                        },
                        "Browse Marketplace",
                      ),
                    ),
                  ),
                )
              : null,
            !loading && !error && !hasData
              ? React.createElement(
                  Card,
                  {
                    className:
                      "max-w-2xl mx-auto mb-8 border-dashed border-2 border-blue-200 page-shell page-pad dark:border-dashed dark:border-2 dark:border-blue-600/40",
                  },
                  React.createElement(
                    CardContent,
                    { className: "p-8 text-center space-y-3 dark:text-center" },
                    React.createElement(
                      "h3",
                      {
                        className:
                          "text-xl font-semibold text-gray-900 dark:text-white dark:text-gray-100",
                      },
                      "No public wall data yet",
                    ),
                    React.createElement(
                      "p",
                      { className: "text-gray-600 dark:text-gray-300 dark:text-gray-200" },
                      "Complete trusted sales and purchases to appear in upcoming rankings.",
                    ),
                    React.createElement(
                      "div",
                      { className: "flex flex-wrap justify-center gap-2" },
                      React.createElement(
                        Button,
                        { onClick: () => setRetryCount((prev) => prev + 1) },
                        "Refresh",
                      ),
                      React.createElement(
                        Button,
                        {
                          variant: "outline",
                          onClick: () => navigate("/rewards"),
                        },
                        translate("rewards") || "Rewards",
                      ),
                    ),
                  ),
                )
              : null,
            hasData
              ? React.createElement(
                  "div",
                  { className: "grid grid-cols-1 lg:grid-cols-3 gap-8" },
                  React.createElement(
                    Card,
                    {
                      className:
                        "shadow-xl border-0 rounded-3xl overflow-hidden mhub-premium-surface dark:border-0",
                    },
                    React.createElement(
                      CardHeader,
                      {
                        className:
                          "bg-gradient-to-r from-green-500 to-emerald-600 text-white text-center py-8 dark:bg-gradient-to-r dark:text-white dark:text-center",
                      },
                      React.createElement(
                        "div",
                        {
                          className:
                            "w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 dark:bg-slate-900/20",
                        },
                        React.createElement(TrendingUp, { className: "w-8 h-8 text-white dark:text-white" }),
                      ),
                      React.createElement(
                        CardTitle,
                        { className: "text-2xl font-bold" },
                        "Top Sellers",
                      ),
                      React.createElement(
                        CardDescription,
                        { className: "text-green-100 text-lg dark:text-green-200" },
                        "Outstanding sales performance",
                      ),
                    ),
                    React.createElement(
                      CardContent,
                      { className: "p-8" },
                      topSellers.length === 0
                        ? React.createElement(
                            "p",
                            { className: "text-sm text-gray-500 text-center dark:text-gray-300 dark:text-center" },
                            "No seller leaderboard data available yet.",
                          )
                        : React.createElement(
                            "div",
                            { className: "space-y-6" },
                            topSellers.map((seller, index) =>
                              React.createElement(
                                "div",
                                {
                                  key: seller.id || `${seller.name}-${index}`,
                                  className:
                                    "flex items-center space-x-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-700 dark:to-gray-700 rounded-2xl dark:bg-gradient-to-r",
                                },
                                React.createElement(
                                  "div",
                                  {
                                    className:
                                      "flex items-center justify-center w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl text-white font-bold text-lg dark:bg-gradient-to-r dark:text-white",
                                  },
                                  index + 1,
                                ),
                                React.createElement(
                                  "div",
                                  { className: "flex-1" },
                                  React.createElement(
                                    "div",
                                    {
                                      className: "flex items-center space-x-2",
                                    },
                                    React.createElement(
                                      "h4",
                                      {
                                        className:
                                          "font-bold text-gray-900 dark:text-white dark:text-gray-100",
                                      },
                                      seller.name || "Unknown seller",
                                    ),
                                    seller.verified
                                      ? React.createElement(Shield, {
                                          className: "w-4 h-4 text-green-600 dark:text-green-300",
                                        })
                                      : null,
                                  ),
                                  React.createElement(
                                    "div",
                                    {
                                      className:
                                        "flex items-center space-x-2 mt-1",
                                    },
                                    React.createElement(
                                      Badge,
                                      { className: `border dark:border ${getRankStyle(seller.rank)}` },
                                      React.createElement(
                                        "div",
                                        {
                                          className:
                                            "flex items-center space-x-1",
                                        },
                                        getRankIcon(seller.rank),
                                        React.createElement(
                                          "span",
                                          null,
                                          seller.rank || "Rising",
                                        ),
                                      ),
                                    ),
                                    React.createElement(
                                      "div",
                                      {
                                        className:
                                          "flex items-center space-x-1",
                                      },
                                      React.createElement(Star, {
                                        className:
                                          "w-4 h-4 text-yellow-500 fill-current dark:text-yellow-300",
                                      }),
                                      React.createElement(
                                        "span",
                                        { className: "text-sm font-medium" },
                                        safeNum(seller.rating).toFixed(1),
                                      ),
                                    ),
                                  ),
                                  React.createElement(
                                    "div",
                                    { className: "text-sm text-gray-600 mt-1 dark:text-gray-200" },
                                    safeNum(seller.sales),
                                    " sales | ",
                                    safeNum(seller.coins),
                                    " coins",
                                  ),
                                ),
                              ),
                            ),
                          ),
                    ),
                  ),
                  React.createElement(
                    Card,
                    {
                      className:
                        "shadow-xl border-0 rounded-3xl overflow-hidden mhub-premium-surface dark:border-0",
                    },
                    React.createElement(
                      CardHeader,
                      {
                        className:
                          "bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-center py-8 dark:bg-gradient-to-r dark:text-white dark:text-center",
                      },
                      React.createElement(
                        "div",
                        {
                          className:
                            "w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 dark:bg-slate-900/20",
                        },
                        React.createElement(Star, { className: "w-8 h-8 text-white dark:text-white" }),
                      ),
                      React.createElement(
                        CardTitle,
                        { className: "text-2xl font-bold" },
                        "Top Buyers",
                      ),
                      React.createElement(
                        CardDescription,
                        { className: "text-blue-100 text-lg dark:text-blue-200" },
                        "Most active purchasers",
                      ),
                    ),
                    React.createElement(
                      CardContent,
                      { className: "p-8" },
                      topBuyers.length === 0
                        ? React.createElement(
                            "p",
                            { className: "text-sm text-gray-500 text-center dark:text-gray-300 dark:text-center" },
                            "No buyer leaderboard data available yet.",
                          )
                        : React.createElement(
                            "div",
                            { className: "space-y-6" },
                            topBuyers.map((buyer, index) =>
                              React.createElement(
                                "div",
                                {
                                  key: buyer.id || `${buyer.name}-${index}`,
                                  className:
                                    "flex items-center space-x-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-700 rounded-2xl dark:bg-gradient-to-r",
                                },
                                React.createElement(
                                  "div",
                                  {
                                    className:
                                      "flex items-center justify-center w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl text-white font-bold text-lg dark:bg-gradient-to-r dark:text-white",
                                  },
                                  index + 1,
                                ),
                                React.createElement(
                                  "div",
                                  { className: "flex-1" },
                                  React.createElement(
                                    "div",
                                    {
                                      className: "flex items-center space-x-2",
                                    },
                                    React.createElement(
                                      "h4",
                                      {
                                        className:
                                          "font-bold text-gray-900 dark:text-white dark:text-gray-100",
                                      },
                                      buyer.name || "Unknown buyer",
                                    ),
                                    buyer.verified
                                      ? React.createElement(Shield, {
                                          className: "w-4 h-4 text-blue-600 dark:text-blue-300",
                                        })
                                      : null,
                                  ),
                                  React.createElement(
                                    "div",
                                    {
                                      className:
                                        "flex items-center space-x-1 mt-1",
                                    },
                                    React.createElement(Star, {
                                      className:
                                        "w-4 h-4 text-yellow-500 fill-current dark:text-yellow-300",
                                    }),
                                    React.createElement(
                                      "span",
                                      { className: "text-sm font-medium" },
                                      safeNum(buyer.rating).toFixed(1),
                                    ),
                                  ),
                                  React.createElement(
                                    "div",
                                    {
                                      className:
                                        "text-sm text-gray-600 dark:text-gray-400 mt-1 dark:text-gray-200",
                                    },
                                    safeNum(buyer.purchases),
                                    " purchases | ",
                                    safeNum(buyer.coins),
                                    " coins",
                                  ),
                                ),
                              ),
                            ),
                          ),
                    ),
                  ),
                  React.createElement(
                    Card,
                    {
                      className:
                        "shadow-xl border-0 rounded-3xl overflow-hidden mhub-premium-surface dark:border-0",
                    },
                    React.createElement(
                      CardHeader,
                      {
                        className:
                          "bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-center py-8 dark:bg-gradient-to-r dark:text-white dark:text-center",
                      },
                      React.createElement(
                        "div",
                        {
                          className:
                            "w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 dark:bg-slate-900/20",
                        },
                        React.createElement(Crown, { className: "w-8 h-8 text-white dark:text-white" }),
                      ),
                      React.createElement(
                        CardTitle,
                        { className: "text-2xl font-bold" },
                        "Top Users",
                      ),
                      React.createElement(
                        CardDescription,
                        { className: "text-cyan-100 text-lg dark:text-cyan-200" },
                        "Highest coin earners",
                      ),
                    ),
                    React.createElement(
                      CardContent,
                      { className: "p-8" },
                      topUsers.length === 0
                        ? React.createElement(
                            "p",
                            { className: "text-sm text-gray-500 text-center dark:text-gray-300 dark:text-center" },
                            "No user leaderboard data available yet.",
                          )
                        : React.createElement(
                            "div",
                            { className: "space-y-6" },
                            topUsers.map((user, index) =>
                              React.createElement(
                                "div",
                                {
                                  key: user.id || `${user.name}-${index}`,
                                  className:
                                    "flex items-center space-x-4 p-4 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-gray-700 dark:to-gray-700 rounded-2xl dark:bg-gradient-to-r",
                                },
                                React.createElement(
                                  "div",
                                  {
                                    className:
                                      "flex items-center justify-center w-12 h-12 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl text-white font-bold text-lg dark:bg-gradient-to-r dark:text-white",
                                  },
                                  index + 1,
                                ),
                                React.createElement(
                                  "div",
                                  { className: "flex-1" },
                                  React.createElement(
                                    "h4",
                                    {
                                      className:
                                        "font-bold text-gray-900 dark:text-white dark:text-gray-100",
                                    },
                                    user.name || "Community member",
                                  ),
                                  React.createElement(
                                    Badge,
                                    {
                                      className:
                                        "bg-cyan-100 text-cyan-800 border-cyan-300 mt-1 dark:bg-cyan-950/20 dark:text-cyan-200 dark:border-cyan-600/40",
                                    },
                                    "Level ",
                                    safeNum(user.level),
                                  ),
                                  React.createElement(
                                    "div",
                                    {
                                      className:
                                        "text-sm text-gray-600 dark:text-gray-400 mt-1 dark:text-gray-200",
                                    },
                                    safeNum(user.totalCoins),
                                    " coins | ",
                                    user.badge || "Rising member",
                                  ),
                                ),
                              ),
                            ),
                          ),
                    ),
                  ),
                )
              : null,
            hasData
              ? React.createElement(
                  Card,
                  {
                    className:
                      "mt-8 shadow-xl border-0 rounded-3xl overflow-hidden mhub-premium-surface dark:border-0",
                  },
                  React.createElement(
                    CardHeader,
                    {
                      className:
                        "bg-gradient-to-r from-sky-500 to-blue-600 text-white text-center py-8 dark:bg-gradient-to-r dark:text-white dark:text-center",
                    },
                    React.createElement(
                      CardTitle,
                      { className: "text-2xl font-bold" },
                      "This Month's Snapshot",
                    ),
                    React.createElement(
                      CardDescription,
                      { className: "text-sky-100 text-lg dark:text-sky-200" },
                      "Live summary from current leaderboard data",
                    ),
                  ),
                  React.createElement(
                    CardContent,
                    { className: "p-8" },
                    React.createElement(
                      "div",
                      { className: "grid grid-cols-1 md:grid-cols-4 gap-6" },
                      React.createElement(
                        "div",
                        {
                          className:
                            "text-center p-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-700 dark:to-gray-700 rounded-2xl dark:text-center dark:bg-gradient-to-r",
                        },
                        React.createElement(
                          "div",
                          {
                            className:
                              "text-3xl font-bold text-green-600 dark:text-green-400 dark:text-green-300",
                          },
                          stats.totalSales,
                        ),
                        React.createElement(
                          "div",
                          {
                            className:
                              "text-gray-600 dark:text-gray-300 font-medium dark:text-gray-200",
                          },
                          "Total Sales",
                        ),
                      ),
                      React.createElement(
                        "div",
                        {
                          className:
                            "text-center p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-700 rounded-2xl dark:text-center dark:bg-gradient-to-r",
                        },
                        React.createElement(
                          "div",
                          {
                            className:
                              "text-3xl font-bold text-blue-600 dark:text-blue-400 dark:text-blue-300",
                          },
                          stats.activeBuyers,
                        ),
                        React.createElement(
                          "div",
                          {
                            className:
                              "text-gray-600 dark:text-gray-300 font-medium dark:text-gray-200",
                          },
                          "Active Buyers",
                        ),
                      ),
                      React.createElement(
                        "div",
                        {
                          className:
                            "text-center p-6 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-gray-700 dark:to-gray-700 rounded-2xl dark:text-center dark:bg-gradient-to-r",
                        },
                        React.createElement(
                          "div",
                          {
                            className:
                              "text-3xl font-bold text-cyan-600 dark:text-cyan-400 dark:text-cyan-300",
                          },
                          stats.totalVolume,
                        ),
                        React.createElement(
                          "div",
                          {
                            className:
                              "text-gray-600 dark:text-gray-300 font-medium dark:text-gray-200",
                          },
                          "Coin Volume",
                        ),
                      ),
                      React.createElement(
                        "div",
                        {
                          className:
                            "text-center p-6 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-gray-700 dark:to-gray-700 rounded-2xl dark:text-center dark:bg-gradient-to-r",
                        },
                        React.createElement(
                          "div",
                          {
                            className:
                              "text-3xl font-bold text-yellow-600 dark:text-yellow-400 dark:text-yellow-300",
                          },
                          stats.verificationRate,
                          "%",
                        ),
                        React.createElement(
                          "div",
                          {
                            className:
                              "text-gray-600 dark:text-gray-300 font-medium dark:text-gray-200",
                          },
                          "Verified Rate",
                        ),
                      ),
                    ),
                  ),
                )
              : null,
          ),
        );
  };
var PublicWallDefault = PublicWall;
export { PublicWallDefault as default };


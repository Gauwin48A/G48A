import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Wallet, ArrowUpRight, ArrowDownLeft, RefreshCw, Gift, Calendar, Loader2, ChevronLeft, ChevronRight, Sparkles, Coins, Info, TrendingUp, BarChart3, RotateCcw, Ticket } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import api from "@/services/api";
import { PageLoadingState, PageErrorState } from "@/components/page-state/PageStateBlocks";
import { useToast } from "@/hooks/use-toast";

const WalletPage = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const tr = (key, fallback, options = {}) => t(key, { defaultValue: fallback, ...options });

  const [balance, setBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [scratching, setScratching] = useState(false);
  const [spinResult, setSpinResult] = useState(null);
  const [scratchResult, setScratchResult] = useState(null);
  const [engagement, setEngagement] = useState(null);
  const [rewardsConfig, setRewardsConfig] = useState(null);
  const spinAnimRef = useRef(null);
  const limit = 20;

  const fetchBalance = useCallback(async () => {
    try {
      const res = await api.get("/coins/balance");
      if (res.data?.success) {
        setBalance(res.data.balance);
      }
    } catch (err) {
      console.warn("[Wallet] Balance fetch failed:", err?.message);
    }
  }, []);

  const fetchEngagement = useCallback(async () => {
    try {
      const res = await api.get("/coins/engagement");
      if (res.data) {
        setEngagement(res.data);
      }
    } catch (err) {
      console.warn("[Wallet] Engagement fetch failed:", err?.message);
    }
  }, []);

  const fetchRewardsConfig = useCallback(async () => {
    try {
      const res = await api.get("/coins/rewards-config");
      if (res.data?.success) {
        setRewardsConfig(res.data);
      }
    } catch (err) {
      console.warn("[Wallet] Rewards config fetch failed:", err?.message);
    }
  }, []);

  const fetchHistory = useCallback(async (pageNum = 0) => {
    try {
      const res = await api.get("/coins/history", {
        params: { limit, offset: pageNum * limit },
      });
      if (res.data?.success) {
        setTransactions(res.data.transactions || []);
        setTotalTransactions(res.data.total || 0);
      }
    } catch (err) {
      console.warn("[Wallet] History fetch failed:", err?.message);
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        fetchBalance(),
        fetchEngagement(),
        fetchHistory(0),
        fetchRewardsConfig(),
      ]);
    } catch (err) {
      setError(err?.message || "Failed to load wallet data");
    } finally {
      setLoading(false);
    }
  }, [fetchBalance, fetchEngagement, fetchHistory, fetchRewardsConfig]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handlePageChange = (newPage) => {
    setPage(newPage);
    fetchHistory(newPage);
  };

  const handleSpin = async () => {
    setSpinning(true);
    setSpinResult(null);
    try {
      const res = await api.post("/coins/spin");
      if (res.data?.success) {
        setSpinResult(res.data.reward);
        toast({
          title: tr("spin_win", "Spin win!"),
          description: tr("spin_reward", "You won {{reward}} coins!", {
            reward: res.data.reward,
          }),
          variant: "default",
        });
        await Promise.all([fetchBalance(), fetchEngagement()]);
      }
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || "";
      if (msg.includes("already")) {
        toast({
          title: tr("already_spun", "Already spun today"),
          variant: "default",
        });
        if (err?.response?.data?.reward) setSpinResult(err.response.data.reward);
      } else {
        toast({
          title: tr("spin_failed", "Spin failed"),
          description: msg,
          variant: "destructive",
        });
      }
    } finally {
      setSpinning(false);
    }
  };

  const handleScratch = async () => {
    setScratching(true);
    setScratchResult(null);
    try {
      const res = await api.post("/coins/scratch");
      if (res.data?.success) {
        setScratchResult(res.data.reward);
        toast({
          title: tr("scratch_win", "Scratch win!"),
          description: tr("scratch_reward", "You earned {{reward}} coins!", {
            reward: res.data.reward,
          }),
          variant: "default",
        });
        await Promise.all([fetchBalance(), fetchEngagement()]);
      }
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || "";
      toast({
        title: tr("scratch_failed", "Scratch failed"),
        description: msg || tr("no_scratch_available", "No scratch cards available"),
        variant: "default",
      });
    } finally {
      setScratching(false);
    }
  };

  const handleDailyCheckIn = async () => {
    setCheckingIn(true);
    try {
      const res = await api.post("/coins/daily-checkin");
      if (res.data?.success) {
        toast({
          title: tr("checkin_success", "Check-in complete!"),
          description: tr("checkin_reward", "You earned {{reward}} coins!", {
            reward: res.data.reward,
          }),
          variant: "default",
        });
        await Promise.all([fetchBalance(), fetchEngagement()]);
      } else if (res.data?.alreadyCheckedIn) {
        toast({
          title: tr("already_checkedin", "Already checked in"),
          description: tr("checkin_tomorrow", "Come back tomorrow for more coins!"),
          variant: "default",
        });
      }
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || "";
      if (msg.includes("already")) {
        toast({
          title: tr("already_checkedin", "Already checked in"),
          variant: "default",
        });
      } else {
        toast({
          title: tr("checkin_failed", "Check-in failed"),
          description: msg,
          variant: "destructive",
        });
      }
    } finally {
      setCheckingIn(false);
    }
  };

  const totalPages = Math.ceil(totalTransactions / limit);

  const formatAmount = (amount) => {
    const num = Number(amount);
    if (isNaN(num)) return "0";
    return num.toLocaleString("en-IN");
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    try {
      return new Date(dateStr).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const getTransactionLabel = (type) => {
    const labels = {
      daily_checkin: "Daily Check-in",
      spin_wheel: "Spin Wheel",
      scratch_card: "Scratch Card",
      welcome_bonus: "Welcome Bonus",
      post: "Post Listing",
      sale: "Sale",
      purchase: "Purchase",
      first_listing: "First Listing",
      first_sale: "First Sale",
      five_star_review: "5-Star Review",
      referral_l1: "Direct Referral",
      referral_l2: "Level 2 Referral",
      referral_l3: "Level 3 Referral",
      referral_l4: "Level 4 Referral",
      referral_l5: "Level 5 Referral",
      referral_milestone_3: "Referral Milestone",
      redeem_boost: "Boost Redemption",
      redeem_featured: "Featured Redemption",
      redeem_spotlight: "Spotlight Redemption",
      store_boost: "Store - Listing Boost",
      store_badge: "Store - Profile Badge",
      store_top_search: "Store - Top Search",
    };
    return labels[type] || type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  if (loading) {
    return (
      <div className="min-h-screen mhub-premium-page bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <PageLoadingState
          title={tr("loading_wallet", "Loading wallet...")}
          description={tr("fetching_balance", "Fetching your coin balance.")}
          marker="wallet-loading"
        />
      </div>
    );
  }

  if (error && balance === null) {
    return (
      <div className="min-h-screen mhub-premium-page bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <PageErrorState
          title={tr("wallet_unavailable", "Wallet unavailable")}
          description={error}
          marker="wallet-error"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen mhub-premium-page nav-clearance bg-gray-50 dark:bg-gray-950">
      <div className="max-w-[640px] mx-auto px-4 py-6 space-y-6 page-shell page-pad">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wallet className="w-8 h-8 text-green-600 dark:text-green-400" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {tr("wallet_title", "Wallet")}
            </h1>
          </div>
          <Button variant="ghost" size="sm" onClick={loadAll} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            {tr("refresh", "Refresh")}
          </Button>
        </div>

        {/* Balance Card */}
        <Card className="bg-gradient-to-br from-green-600 to-emerald-700 dark:from-green-900 dark:to-emerald-950 text-white rounded-2xl p-6 border-none shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <span className="text-green-100 text-sm font-medium">
              {tr("coin_balance", "Coin Balance")}
            </span>
            <Coins className="w-6 h-6 text-yellow-300" />
          </div>
          <div className="text-4xl font-bold mb-2">
            {balance !== null ? formatAmount(balance) : "—"}
          </div>
          <p className="text-green-200 text-sm">
            {tr("coin_balance_desc", "Use coins to boost listings, unlock badges & more")}
          </p>
          {rewardsConfig?.coinsPerRupee && (
            <div className="mt-3 pt-3 border-t border-green-500/30">
              <div className="flex items-center gap-2 text-green-200 text-xs">
                <Info className="w-3 h-3" />
                <span>
                  {tr("coin_value", "Coin value")}: {rewardsConfig.coinsPerRupee} coins = ₹1
                </span>
              </div>
            </div>
          )}
        </Card>

        {/* Quick Actions */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-500" />
            {tr("daily_actions", "Daily Actions")}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={handleDailyCheckIn}
              disabled={checkingIn || engagement?.dailyCheckIn?.hasCheckedInToday}
              className={`h-auto py-4 flex-col gap-2 rounded-xl ${
                engagement?.dailyCheckIn?.hasCheckedInToday
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 cursor-default"
                  : ""
              }`}
              variant={engagement?.dailyCheckIn?.hasCheckedInToday ? "outline" : "default"}
            >
              {checkingIn ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Calendar className="w-5 h-5" />
              )}
              <span className="text-xs font-medium">
                {engagement?.dailyCheckIn?.hasCheckedInToday
                  ? tr("checked_in", "Checked in!")
                  : tr("daily_checkin", "Daily Check-in")}
              </span>
              {engagement?.dailyCheckIn?.streak > 0 && (
                <span className="text-[10px] opacity-75">
                  {tr("streak_days", "{{count}} day streak", {
                    count: engagement.dailyCheckIn.streak,
                  })}
                </span>
              )}
              {!engagement?.dailyCheckIn?.hasCheckedInToday && engagement?.dailyCheckIn?.nextReward && (
                <span className="text-[10px] opacity-75">
                  {tr("reward_coins", "+{{count}} coins", {
                    count: engagement.dailyCheckIn.nextReward,
                  })}
                </span>
              )}
            </Button>
            <Button
              onClick={handleSpin}
              disabled={spinning || engagement?.spin?.hasSpunToday}
              className={`h-auto py-4 flex-col gap-2 rounded-xl ${
                engagement?.spin?.hasSpunToday
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 cursor-default opacity-70"
                  : ""
              }`}
              variant={engagement?.spin?.hasSpunToday ? "outline" : "default"}
            >
              {spinning ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <RotateCcw className={`w-5 h-5 ${engagement?.spin?.hasSpunToday ? "" : "text-yellow-400"}`} />
              )}
              <span className="text-xs font-medium">
                {engagement?.spin?.hasSpunToday
                  ? tr("spun_today", "Spun today!")
                  : tr("spin_wheel", "Spin Wheel")}
              </span>
              {spinResult !== null && (
                <span className="text-[10px] font-bold text-yellow-500">
                  +{formatAmount(spinResult)} {tr("coins", "coins")}
                </span>
              )}
            </Button>
            <Button
              onClick={handleScratch}
              disabled={scratching || (engagement?.scratch?.available || 0) === 0}
              className={`h-auto py-4 flex-col gap-2 rounded-xl ${
                (engagement?.scratch?.available || 0) === 0
                  ? "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500 cursor-default opacity-70"
                  : ""
              }`}
              variant={(engagement?.scratch?.available || 0) === 0 ? "outline" : "default"}
            >
              {scratching ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Ticket className={`w-5 h-5 ${(engagement?.scratch?.available || 0) > 0 ? "text-purple-500" : ""}`} />
              )}
              <span className="text-xs font-medium">
                {tr("scratch_card", "Scratch Card")}
              </span>
              {engagement?.scratch?.available > 0 && (
                <span className="text-[10px] opacity-75">
                  {tr("available_count", "{{count}} available", {
                    count: engagement.scratch.available,
                  })}
                </span>
              )}
              {scratchResult !== null && (
                <span className="text-[10px] font-bold text-purple-500">
                  +{formatAmount(scratchResult)} {tr("coins", "coins")}
                </span>
              )}
            </Button>
          </div>
          
          {/* Engagement status summary */}
          {engagement && (
            <Card className="rounded-xl p-3 border border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {tr("checkin_streak", "Check-in: {{count}} days", {
                    count: engagement.dailyCheckIn?.streak || 0,
                  })}
                </span>
                <span className="flex items-center gap-1">
                  <RotateCcw className="w-3 h-3" />
                  {engagement.spin?.hasSpunToday
                    ? tr("spin_done", "Spin done")
                    : tr("spin_ready", "Spin ready")}
                </span>
                <span className="flex items-center gap-1">
                  <Ticket className="w-3 h-3" />
                  {tr("scratch_count", "Scratch: {{count}}", {
                    count: engagement.scratch?.available || 0,
                  })}
                </span>
              </div>
            </Card>
          )}
        </div>

        {/* Earning Rates */}
        {rewardsConfig?.earning && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              {tr("earning_rates", "Earning Rates")}
            </h2>
            <Card className="rounded-xl p-4 border border-gray-100 dark:border-gray-800">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(rewardsConfig.earning).map(([key, amount]) => (
                  <div key={key} className="text-center p-2 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      {getTransactionLabel(key)}
                    </p>
                    <p className="font-bold text-green-600 dark:text-green-400">
                      +{formatAmount(amount)}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* Transaction History */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {tr("transaction_history", "Transaction History")}
          </h2>

          {transactions.length === 0 ? (
            <Card className="rounded-2xl p-8 text-center border-dashed">
              <Coins className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">
                {tr("no_transactions", "No transactions yet")}
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                {tr("no_transactions_desc", "Your coin history will appear here")}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 gap-2"
                onClick={() => navigate("/all-posts")}
              >
                <BarChart3 className="w-4 h-4" />
                {tr("start_earning", "Start earning")}
              </Button>
            </Card>
          ) : (
            <>
              <div className="space-y-2">
                {transactions.map((tx) => {
                  const isCredit = Number(tx.amount) > 0;
                  return (
                    <Card
                      key={tx.id}
                      className="rounded-xl p-4 flex items-center gap-4 border border-gray-100 dark:border-gray-800"
                    >
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                          isCredit
                            ? "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
                            : "bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400"
                        }`}
                      >
                        {isCredit ? (
                          <ArrowUpRight className="w-5 h-5" />
                        ) : (
                          <ArrowDownLeft className="w-5 h-5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                          {tx.description || getTransactionLabel(tx.type)}
                        </p>
                        {tx.description && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                            {getTransactionLabel(tx.type)}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          {formatDate(tx.created_at)}
                        </p>
                      </div>
                      <span
                        className={`font-bold text-lg whitespace-nowrap ${
                          isCredit
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-500 dark:text-red-400"
                        }`}
                      >
                        {isCredit ? "+" : ""}{formatAmount(tx.amount)}
                      </span>
                    </Card>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 0}
                    className="gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    {tr("previous", "Previous")}
                  </Button>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {tr("page_of", "Page {{current}} of {{total}}", {
                      current: page + 1,
                      total: totalPages,
                    })}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page >= totalPages - 1}
                    className="gap-1"
                  >
                    {tr("next", "Next")}
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default WalletPage;

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PageDensityToggle from "@/components/ui/PageDensityToggle";
import { usePageDensity } from "@/hooks/usePageDensity";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { getAccessToken, getUserId } from "@/utils/authStorage";
import UpsellBanner from "@/components/UpsellBanner";
import ReferralChainTree from "@/components/referral/ReferralChainTree";
import { formatCoinValue, setCoinsPerRupee, formatCoinWithRupee } from "@/utils/coinConversion";

/* ── Tier helpers ─────────────────────────────────────────────────── */
const TIERS = [
  { name: "Bronze", min: 0, max: 499, color: "from-amber-600 to-amber-800", icon: "🥉", bg: "bg-amber-50 dark:bg-amber-900/20" },
  { name: "Silver", min: 500, max: 1999, color: "from-gray-400 to-gray-600", icon: "🥈", bg: "bg-gray-100 dark:bg-gray-800/40" },
  { name: "Gold", min: 2000, max: 4999, color: "from-yellow-400 to-yellow-600", icon: "🥇", bg: "bg-yellow-50 dark:bg-yellow-900/20" },
  { name: "Platinum", min: 5000, max: null, color: "from-indigo-400 to-purple-600", icon: "💎", bg: "bg-indigo-50 dark:bg-indigo-900/20" },
];

function getTier(coins) {
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (coins >= TIERS[i].min) return { ...TIERS[i], index: i };
  }
  return { ...TIERS[0], index: 0 };
}

function getTierProgress(coins) {
  const tier = getTier(coins);
  if (tier.max === null) return 100; // Platinum = maxed out
  const range = tier.max - tier.min + 1;
  return Math.min(100, Math.round(((coins - tier.min) / range) * 100));
}

/* ── Format readable action names ─────────────────────────────────── */
function formatAction(action) {
  const map = {
    daily_checkin: "Daily Check-in",
    spin_wheel: "Spin the Wheel",
    scratch_card: "Scratch Card",
    referral_l1: "Referral (Level 1)",
    referral_l2: "Referral (Level 2)",
    referral_l3: "Referral (Level 3)",
    referral_l4: "Referral (Level 4)",
    referral_l5: "Referral (Level 5)",
    post: "Created Listing",
    sale: "Completed Sale",
    purchase: "Made Purchase",
    welcome_bonus: "Welcome Bonus",
    referral_milestone_3: "Referral Milestone",
    redeem_boost: "Boost Redeemed",
    store_boost: "Store Boost",
    store_badge: "Store Badge",
    store_top_search: "Top Search Boost",
  };
  return map[action] || (action || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const RewardsPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const tr = (key, fallback, options = {}) =>
    t(key, { defaultValue: fallback, ...options });

  const [coins, setCoins] = useState(0);
  const [referralCode, setReferralCode] = useState("");
  const [rewardLog, setRewardLog] = useState([]);
  const [engagement, setEngagement] = useState(null);
  const [rewardsConfig, setRewardsConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [spinLoading, setSpinLoading] = useState(false);
  const [spinResult, setSpinResult] = useState(null);
  const { density, setDensity } = usePageDensity("mhub_rewards_density");
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const requestIdRef = useRef(0);

  const fetchData = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    const token = getAccessToken();
    const userId = getUserId(user);

    if (!token || !userId) {
      setError(tr("rewards_login_required", "Please login to view rewards"));
      setLoading(false);
      return;
    }

    try {
      const [rewardsRes, configRes, engagementRes, historyRes] = await Promise.all([
        api.get("/rewards", { params: { userId } }).catch(() => null),
        api.get("/coins/rewards-config").catch(() => null),
        api.get("/coins/engagement").catch(() => null),
        api.get("/coins/history", { params: { limit: 20 } }).catch(() => null),
      ]);

      if (requestId !== requestIdRef.current) return;

      // Coins balance
      const rd = rewardsRes?.data ?? rewardsRes;
      if (rd?.user) {
        setCoins(rd.user.totalCoins || 0);
        setReferralCode(rd.user.referralCode || "");
      }

      // Config
      const cfg = configRes?.data ?? configRes;
      if (cfg?.success) {
        setRewardsConfig(cfg);
        if (cfg.coinsPerRupee) setCoinsPerRupee(cfg.coinsPerRupee);
      }

      // Engagement
      const eng = engagementRes?.data ?? engagementRes;
      if (eng) setEngagement(eng);

      // History
      const hist = historyRes?.data ?? historyRes;
      setRewardLog(Array.isArray(hist?.transactions) ? hist.transactions : []);
    } catch (err) {
      if (import.meta.env.DEV) console.error("Error fetching rewards:", err);
      setError(err.message || "Failed to load rewards");
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (!authLoading) fetchData();
  }, [authLoading, fetchData]);

  /* ── Actions ──────────────────────────────────────────────────── */
  const handleCheckin = async () => {
    setCheckinLoading(true);
    try {
      const res = await api.post("/coins/daily-checkin");
      const data = res?.data ?? res;
      if (data?.success || data?.alreadyCheckedIn) {
        if (data.newBalance != null) setCoins(data.newBalance);
        setEngagement((prev) => prev ? { ...prev, dailyCheckIn: { ...prev.dailyCheckIn, hasCheckedInToday: true, streak: data.streak || prev.dailyCheckIn?.streak } } : prev);
      }
    } catch { /* handled by engagement state */ }
    setCheckinLoading(false);
  };

  const handleSpin = async () => {
    setSpinLoading(true);
    setSpinResult(null);
    try {
      const res = await api.post("/coins/spin");
      const data = res?.data ?? res;
      if (data?.success) {
        setSpinResult(data.reward);
        if (data.newBalance != null) setCoins(data.newBalance);
        setEngagement((prev) => prev ? { ...prev, spin: { ...prev.spin, hasSpunToday: true, reward: data.reward } } : prev);
      }
    } catch { /* already spun */ }
    setSpinLoading(false);
  };

  const handleCopy = () => {
    if (!referralCode) return;
    const url = `${window.location.origin}/signup?ref=${referralCode}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  /* ── Loading / Error ──────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48" />
            <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl" />)}
            </div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-8 text-center">
            <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
            <Link to="/login" className="inline-block bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium">
              {tr("login", "Login")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const tier = getTier(coins);
  const nextTier = TIERS[tier.index + 1] || null;
  const tierProgress = getTierProgress(coins);
  const checkinStreak = engagement?.dailyCheckIn?.streak || 0;
  const hasCheckedIn = engagement?.dailyCheckIn?.hasCheckedInToday || false;
  const hasSpun = engagement?.spin?.hasSpunToday || false;
  const referralLadder = rewardsConfig?.referralLadder || [
    { level: 1, coins: 100, label: "Direct Referral" },
    { level: 2, coins: 40, label: "Level 2" },
    { level: 3, coins: 20, label: "Level 3" },
    { level: 4, coins: 10, label: "Level 4" },
    { level: 5, coins: 5, label: "Level 5" },
  ];
  const refCaps = rewardsConfig?.referralCaps || { daily: 500, monthly: 5000, lifetime: 50000 };
  const earningConfig = rewardsConfig?.earning || {
    welcome_bonus: 100, post: 5, sale: 25, purchase: 10, first_listing: 25, first_sale: 50, five_star_review: 15,
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 ${density === "compact" ? "mhub-compact" : ""}`}>
      <div className="max-w-4xl mx-auto px-4 py-6 pb-24">

        <div data-density="extra">
          <UpsellBanner trigger="rewards" className="mb-4" />
        </div>
        <div className="flex justify-end mb-4">
          <PageDensityToggle
            value={density}
            onChange={setDensity}
            label={tr("view", "View")}
          />
        </div>

        {/* ═══ HERO CARD — Balance + Tier ═══ */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 shadow-xl rounded-2xl p-6 mb-6 text-white">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

          <div className="relative z-10">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium opacity-80">{tr("your_balance", "Your Balance")}</p>
                <p className="text-4xl font-extrabold mt-1 tracking-tight">🪙 {coins.toLocaleString()}</p>
                <p className="text-sm opacity-70 mt-0.5">≈ {formatCoinValue(coins)} value</p>
              </div>
              <div className={`px-3 py-1.5 rounded-full bg-white/20 text-sm font-bold flex items-center gap-1.5`}>
                <span>{tier.icon}</span> {tier.name}
              </div>
            </div>

            {/* Tier progress */}
            {nextTier && (
              <div className="mt-4">
                <div className="flex justify-between text-[11px] opacity-80 mb-1">
                  <span>{tier.name}</span>
                  <span>{nextTier.name} — {nextTier.min.toLocaleString()} coins</span>
                </div>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-white/80 rounded-full transition-all duration-700" style={{ width: `${tierProgress}%` }} />
                </div>
                <p className="text-[11px] opacity-70 mt-1">
                  {Math.max(0, (nextTier.min - coins)).toLocaleString()} coins to {nextTier.name}
                </p>
              </div>
            )}
            {!nextTier && (
              <p className="text-sm opacity-80 mt-3">🎉 {tr("max_tier", "You've reached the highest tier!")}</p>
            )}

            {/* Referral share */}
            {referralCode && (
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <span className="text-xs opacity-80">{tr("your_code", "Your code")}:</span>
                <code className="text-xs bg-white/20 px-2.5 py-1 rounded-lg font-mono">{referralCode}</code>
                <button onClick={handleCopy} className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-medium transition-colors">
                  {copied ? "✓ Copied" : "📋 Copy Link"}
                </button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(
                    tr("referral_share_text", "Join MHub marketplace using my referral link and earn 100 bonus coins! 🎉") +
                    "\n" + `${window.location.origin}/signup?ref=${referralCode}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 bg-green-500/60 hover:bg-green-500/80 rounded-lg text-xs font-medium transition-colors"
                >
                  💬 WhatsApp
                </a>
              </div>
            )}
          </div>
        </div>

        {/* ═══ QUICK ACTIONS — Check-in + Spin ═══ */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {/* Daily Check-in */}
          <button
            onClick={handleCheckin}
            disabled={hasCheckedIn || checkinLoading}
            className={`relative p-4 rounded-2xl border-2 text-left transition-all ${
              hasCheckedIn
                ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700"
                : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md"
            }`}
          >
            <div className="text-2xl mb-1">{hasCheckedIn ? "✅" : "📅"}</div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              {hasCheckedIn ? tr("checked_in", "Checked In!") : tr("daily_checkin", "Daily Check-in")}
            </h3>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
              {hasCheckedIn
                ? `🔥 ${checkinStreak}-day streak`
                : `+${engagement?.dailyCheckIn?.nextReward || 5} coins`}
            </p>
            {!hasCheckedIn && (
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
            )}
          </button>

          {/* Spin the Wheel */}
          <button
            onClick={handleSpin}
            disabled={hasSpun || spinLoading}
            className={`relative p-4 rounded-2xl border-2 text-left transition-all ${
              hasSpun
                ? "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700"
                : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-purple-400 dark:hover:border-purple-500 hover:shadow-md"
            }`}
          >
            <div className="text-2xl mb-1">{hasSpun ? "🎉" : "🎰"}</div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              {hasSpun ? tr("already_spun", "Spun Today!") : tr("spin_wheel", "Spin the Wheel")}
            </h3>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
              {spinResult ? `Won ${spinResult} coins!` : (hasSpun && engagement?.spin?.reward) ? `Won ${engagement.spin.reward} coins!` : "Win 5–100 coins"}
            </p>
            {!hasSpun && (
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-purple-500 rounded-full animate-pulse" />
            )}
          </button>
        </div>

        {/* ═══ HOW IT WORKS — Toggleable for new users ═══ */}
        <div className="mb-6" data-density="extra">
          <button
            onClick={() => setShowHowItWorks(!showHowItWorks)}
            className="w-full flex items-center justify-between px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-2xl text-left hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">💡</span>
              <span className="text-sm font-bold text-blue-800 dark:text-blue-200">
                {tr("how_rewards_work", "How MHub Rewards Work")}
              </span>
              <span className="text-[10px] bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded-full font-semibold">
                {tr("new_users", "Must Read")}
              </span>
            </div>
            <span className={`text-blue-600 dark:text-blue-400 transition-transform ${showHowItWorks ? "rotate-180" : ""}`}>▼</span>
          </button>

          {showHowItWorks && (
            <div className="mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 space-y-5">
              {/* Step 1: Earn */}
              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-xs font-bold text-emerald-700 dark:text-emerald-300">1</span>
                  {tr("earn_coins", "Earn Coins")}
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { icon: "📅", label: "Daily check-in", value: `5–100/day` },
                    { icon: "🎰", label: "Spin the wheel", value: "5–100/day" },
                    { icon: "📝", label: "Post a listing", value: `+${earningConfig.post}` },
                    { icon: "💰", label: "Complete a sale", value: `+${earningConfig.sale}` },
                    { icon: "🛒", label: "Make a purchase", value: `+${earningConfig.purchase}` },
                    { icon: "⭐", label: "Get 5★ review", value: `+${earningConfig.five_star_review}` },
                    { icon: "👥", label: "Valid referral (L1)", value: `+${referralLadder[0]?.coins || 100}` },
                    { icon: "🎁", label: "Welcome bonus", value: `+${earningConfig.welcome_bonus}` },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/40 rounded-lg">
                      <span className="text-base">{item.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-gray-700 dark:text-gray-300 truncate">{item.label}</p>
                      </div>
                      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Step 2: Referral Ladder */}
              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold text-blue-700 dark:text-blue-300">2</span>
                  {tr("referral_ladder", "Referral Rewards Ladder")}
                </h4>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-2">
                  Earn coins when your referrals (and their referrals!) become <strong>active users</strong> — not just signups.
                  A user qualifies when they complete a real transaction OR create 2+ verified listings.
                </p>
                <div className="space-y-1.5">
                  {referralLadder.map((lvl, i) => (
                    <div key={i} className="flex items-center gap-3 p-2.5 bg-gradient-to-r from-gray-50 to-transparent dark:from-gray-700/30 dark:to-transparent rounded-lg border border-gray-100 dark:border-gray-700">
                      <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold text-white ${
                        ["bg-blue-600","bg-emerald-600","bg-amber-600","bg-purple-600","bg-rose-600"][i] || "bg-gray-600"
                      }`}>
                        L{lvl.level}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{lvl.label}</p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">
                          {i === 0 ? "You invited them directly" : `${lvl.level} levels deep in your network`}
                        </p>
                      </div>
                      <span className="text-sm font-extrabold text-yellow-600 dark:text-yellow-400">+{lvl.coins} 🪙</span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 p-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
                  <p className="text-[11px] text-amber-800 dark:text-amber-200">
                    <strong>⚡ Safety Caps:</strong> Max {refCaps.daily}/day · {refCaps.monthly.toLocaleString()}/month · {refCaps.lifetime.toLocaleString()} lifetime from referrals.
                    This keeps the system fair for everyone while still rewarding active referrers.
                  </p>
                </div>
              </div>

              {/* Step 3: Spend */}
              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-xs font-bold text-purple-700 dark:text-purple-300">3</span>
                  {tr("spend_coins", "Spend Coins")}
                </h4>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Use coins to boost your listings, get featured placement, earn badges, and unlock premium perks in the Store tab.
                </p>
              </div>

              {/* Step 4: Tier Up */}
              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center text-xs font-bold text-yellow-700 dark:text-yellow-300">4</span>
                  {tr("tier_up", "Level Up Your Tier")}
                </h4>
                <div className="flex items-center gap-2 flex-wrap">
                  {TIERS.map((t, i) => (
                    <div key={i} className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      tier.index >= i
                        ? "bg-gradient-to-r text-white " + t.color
                        : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                    }`}>
                      {t.icon} {t.name} ({t.min}+)
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ═══ TAB NAVIGATION ═══ */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide border-b border-gray-200 dark:border-gray-700 mb-6 pb-px">
          {[
            { key: "overview", label: tr("overview", "Overview"), icon: "📊" },
            { key: "network", label: tr("referral_network", "Referral Network"), icon: "🌐" },
            { key: "earn", label: tr("earn", "Earn"), icon: "💰" },
            { key: "store", label: tr("store", "Store"), icon: "🎁" },
            { key: "history", label: tr("history", "History"), icon: "📜" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-all ${
                activeTab === tab.key
                  ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ═══════════ OVERVIEW TAB ═══════════ */}
        {activeTab === "overview" && (
          <div className="space-y-4">
            {/* Streak + Engagement Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { icon: "🔥", label: "Check-in Streak", value: `${checkinStreak} days`, sub: `Best: ${engagement?.dailyCheckIn?.bestStreak || 0}` },
                { icon: "🎰", label: "Today's Spin", value: hasSpun ? `Won ${engagement?.spin?.reward || 0}` : "Available!", sub: hasSpun ? "Come back tomorrow" : "Tap to spin" },
                { icon: "🎫", label: "Scratch Cards", value: `${engagement?.scratch?.available || 0} available`, sub: `${engagement?.scratch?.totalReferrals || 0} referrals total` },
                { icon: "🏆", label: "Your Tier", value: tier.name, sub: nextTier ? `${(nextTier.min - coins).toLocaleString()} to ${nextTier.name}` : "Max tier!" },
              ].map((card, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
                  <span className="text-xl">{card.icon}</span>
                  <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-1">{card.label}</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{card.value}</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">{card.sub}</p>
                </div>
              ))}
            </div>

            {/* Referral Ladder Mini */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">👥 Referral Rewards Ladder</h3>
                <button onClick={() => setActiveTab("network")} className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold hover:underline">
                  View Network →
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                {referralLadder.map((lvl, i) => (
                  <div key={i} className="flex-1 text-center">
                    <div className={`mx-auto w-10 h-10 rounded-full flex items-center justify-center text-xs font-extrabold text-white ${
                      ["bg-blue-600","bg-emerald-600","bg-amber-600","bg-purple-600","bg-rose-600"][i] || "bg-gray-600"
                    }`}>
                      L{lvl.level}
                    </div>
                    <p className="text-[11px] font-bold text-yellow-600 dark:text-yellow-400 mt-1">+{lvl.coins}</p>
                    <p className="text-[9px] text-gray-500 dark:text-gray-400">{lvl.label}</p>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-3 text-center">
                Only <strong>valid referrals</strong> count — real transactions or 2+ verified listings. No rewards for invite-only signups.
              </p>
            </div>

            {/* Quick Earning Guide */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">💰 Ways to Earn</h3>
              <div className="space-y-2">
                {[
                  { icon: "📅", label: "Daily check-in", coins: "5–100", note: "7-day streak cycle" },
                  { icon: "🎰", label: "Spin the wheel", coins: "5–100", note: "1 spin per day" },
                  { icon: "📝", label: "Create listing", coins: `+${earningConfig.post}`, note: "Max 50/day" },
                  { icon: "💰", label: "Complete sale", coins: `+${earningConfig.sale}`, note: "No daily limit" },
                  { icon: "🛒", label: "Buy something", coins: `+${earningConfig.purchase}`, note: "No daily limit" },
                  { icon: "⭐", label: "Get 5★ review", coins: `+${earningConfig.five_star_review}`, note: "Be a great seller!" },
                  { icon: "👥", label: "Refer active users", coins: "5–100", note: "See ladder above" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 py-1.5">
                    <span className="text-base">{item.icon}</span>
                    <span className="text-xs text-gray-700 dark:text-gray-300 flex-1">{item.label}</span>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{item.coins}</span>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 w-24 text-right">{item.note}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            {rewardLog.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">📊 Recent Activity</h3>
                  <button onClick={() => setActiveTab("history")} className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold hover:underline">
                    View All →
                  </button>
                </div>
                <div className="space-y-1.5">
                  {rewardLog.slice(0, 5).map((log, idx) => (
                    <div key={log.id || idx} className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
                      <div>
                        <p className="text-xs text-gray-700 dark:text-gray-300">{formatAction(log.type)}</p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500">{log.created_at ? new Date(log.created_at).toLocaleDateString() : ""}</p>
                      </div>
                      <span className={`text-xs font-bold ${Number(log.amount) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                        {Number(log.amount) >= 0 ? "+" : ""}{log.amount}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════ REFERRAL NETWORK TAB ═══════════ */}
        {activeTab === "network" && (
          <div data-density="extra">
            <ReferralChainTree />
          </div>
        )}

        {/* ═══════════ EARN TAB ═══════════ */}
        {activeTab === "earn" && (
          <div className="space-y-4">
            {/* All Earning Methods */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">📈 Complete Earning Guide</h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-4">Every way to earn coins on MHub. Stay active, earn more, unlock better rewards.</p>

              {/* Daily Activities */}
              <div className="mb-5">
                <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">Daily Activities</h4>
                <div className="space-y-2">
                  {[
                    { icon: "📅", title: "Daily Check-in", desc: "Visit MHub every day. Streak rewards increase: 5→10→15→20→30→50→100 coins over 7 days.", coins: "5–100", highlight: !hasCheckedIn },
                    { icon: "🎰", title: "Spin the Wheel", desc: "One free spin daily. Weighted random: most common is 5–10 coins, rare jackpot of 100.", coins: "5–100", highlight: !hasSpun },
                    { icon: "🎫", title: "Scratch Cards", desc: "Earn a scratch card for each direct referral. Rewards from 10 to 100 coins.", coins: "10–100" },
                  ].map((item, i) => (
                    <div key={i} className={`flex items-start gap-3 p-3 rounded-xl transition-all ${
                      item.highlight ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700" : "bg-gray-50 dark:bg-gray-700/30"
                    }`}>
                      <span className="text-xl mt-0.5">{item.icon}</span>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-gray-900 dark:text-white">{item.title}</p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{item.desc}</p>
                      </div>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{item.coins} 🪙</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Marketplace Activities */}
              <div className="mb-5">
                <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">Marketplace Activities</h4>
                <div className="space-y-2">
                  {[
                    { icon: "📝", title: "Create a Listing", desc: `Earn ${earningConfig.post} coins per listing posted. Max 50 coins/day from listings.`, coins: `+${earningConfig.post}`, action: () => navigate("/post-welcome") },
                    { icon: "💰", title: "Complete a Sale", desc: `Earn ${earningConfig.sale} coins when you sell an item. The best way to earn coins consistently.`, coins: `+${earningConfig.sale}` },
                    { icon: "🛒", title: "Make a Purchase", desc: `Earn ${earningConfig.purchase} coins when you buy something through MHub.`, coins: `+${earningConfig.purchase}` },
                    { icon: "⭐", title: "Receive 5★ Review", desc: `Earn ${earningConfig.five_star_review} coins when a buyer gives you a 5-star review.`, coins: `+${earningConfig.five_star_review}` },
                    { icon: "🏷️", title: "First Listing Bonus", desc: `One-time ${earningConfig.first_listing} coin bonus for posting your first item.`, coins: `+${earningConfig.first_listing}` },
                    { icon: "🎉", title: "First Sale Bonus", desc: `One-time ${earningConfig.first_sale} coin bonus for your first completed sale.`, coins: `+${earningConfig.first_sale}` },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                      <span className="text-xl mt-0.5">{item.icon}</span>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-gray-900 dark:text-white">{item.title}</p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{item.desc}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{item.coins} 🪙</span>
                        {item.action && (
                          <button onClick={item.action} className="block mt-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline">Go →</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Referral Rewards */}
              <div>
                <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">Referral Rewards</h4>
                <div className="space-y-2">
                  {referralLadder.map((lvl, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                      <span className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-extrabold text-white flex-shrink-0 ${
                        ["bg-blue-600","bg-emerald-600","bg-amber-600","bg-purple-600","bg-rose-600"][i] || "bg-gray-600"
                      }`}>
                        L{lvl.level}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-900 dark:text-white">{lvl.label}</p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">
                          {i === 0
                            ? "When your direct referral completes a transaction or creates 2+ verified listings"
                            : `When someone ${lvl.level} levels deep in your referral chain becomes active`}
                        </p>
                      </div>
                      <span className="text-sm font-extrabold text-yellow-600 dark:text-yellow-400 flex-shrink-0">+{lvl.coins} 🪙</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl">
                  <p className="text-[11px] text-amber-800 dark:text-amber-200">
                    <strong>⚡ Anti-Abuse Caps:</strong> {refCaps.daily} coins/day · {refCaps.monthly.toLocaleString()} coins/month · {refCaps.lifetime.toLocaleString()} coins lifetime from referrals.
                  </p>
                  <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-1">
                    <strong>⛔ NOT Rewarded:</strong> Invite-only signups, single junk listings, unverified users, inactive accounts.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════ STORE TAB ═══════════ */}
        {activeTab === "store" && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">🎁 Rewards Store</h3>
                <span className="text-xs font-semibold px-2.5 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full">
                  🪙 {coins.toLocaleString()} available
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { icon: "🚀", title: tr("boost_listing", "Boost Listing"), desc: "Top of search results for 7 days", coins: 100, type: "boost", badge: null },
                  { icon: "🏅", title: tr("profile_badge", "Profile Badge"), desc: "Premium badge on your profile", coins: 200, type: "badge", badge: null },
                  { icon: "🔝", title: tr("top_search", "Top Search"), desc: "Spotlight for 7 days + featured", coins: 500, type: "top_search", badge: "POPULAR" },
                  { icon: "📌", title: tr("free_listing", "Free Listing"), desc: "1 free listing (15 days)", coins: 150, type: "free_listing", badge: null },
                  { icon: "✅", title: tr("fast_verify", "Fast Verification"), desc: "Verified in 24 hours", coins: 300, type: "fast_verify", badge: null },
                  { icon: "👑", title: tr("premium_upgrade", "Premium (1 month)"), desc: "Unlock premium features", coins: 2000, type: "premium", badge: "LIMITED" },
                ].map((item, idx) => (
                  <div key={idx} className="relative p-3.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/40 hover:shadow-md transition-all">
                    {item.badge && (
                      <span className="absolute -top-2 -right-2 text-[9px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full">{item.badge}</span>
                    )}
                    <div className="text-2xl mb-1.5">{item.icon}</div>
                    <h3 className="text-xs font-bold text-gray-900 dark:text-white">{item.title}</h3>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-2.5 min-h-[24px]">{item.desc}</p>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-yellow-600 dark:text-yellow-400">🪙 {item.coins}</span>
                        <span className="text-[9px] text-gray-400 dark:text-gray-500 ml-1">({formatCoinValue(item.coins)})</span>
                      </div>
                      <button
                        disabled={coins < item.coins}
                        className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        {tr("redeem", "Redeem")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════ HISTORY TAB ═══════════ */}
        {activeTab === "history" && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">📜 Coin History</h3>
            {rewardLog.length === 0 ? (
              <div className="text-center py-8">
                <span className="text-3xl">📭</span>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{tr("no_history", "No transactions yet")}</p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">Start earning coins by checking in daily or posting a listing!</p>
              </div>
            ) : (
              <div className="space-y-1">
                {rewardLog.map((log, idx) => (
                  <div key={log.id || idx} className="flex items-center justify-between py-2.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{formatAction(log.type)}</p>
                      {log.description && <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">{log.description}</p>}
                      <p className="text-[10px] text-gray-400 dark:text-gray-500">
                        {log.created_at ? new Date(log.created_at).toLocaleString() : ""}
                      </p>
                    </div>
                    <span className={`text-sm font-bold ml-3 ${Number(log.amount) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                      {Number(log.amount) >= 0 ? "+" : ""}{log.amount} 🪙
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RewardsPage;

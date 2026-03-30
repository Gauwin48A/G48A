import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { getAccessToken, getUserId } from "@/utils/authStorage";
import UpsellBanner from "@/components/UpsellBanner";

const RewardsPage = () => {
  const { user, loading: authLoading } = useAuth(); // Use global auth state
  const { t } = useTranslation();
  const navigate = useNavigate();
  const tr = (key, fallback, options = {}) =>
    t(key, { defaultValue: fallback, ...options });
  const [rewards, setRewards] = useState({ points: 0 });
  const [directReferrals, setDirectReferrals] = useState([]);
  const [indirectReferrals, setIndirectReferrals] = useState([]);
  const [rewardLog, setRewardLog] = useState([]);
  const [referralCode, setReferralCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    // Wait for AuthContext to finish checking session
    if (authLoading) return;

    const fetchUserData = async () => {
      const requestId = ++requestIdRef.current;
      setLoading(true);
      setError(null);

      const token = getAccessToken();
      const userId = getUserId(user);

      if (!token || !userId) {
        setError(
          tr("rewards_login_required", "Please login to view rewards"),
        );
        setLoading(false);
        return;
      }

      try {
        // Use the centralized API service (handles refresh tokens automatically)
        const rewardsResponse = await api.get("/rewards", {
          params: { userId },
        });
        if (requestId !== requestIdRef.current) {
          return;
        }
        const rewardsData = rewardsResponse?.data ?? rewardsResponse;

        // Handle both old format (array) and new format (object with user/referralChain)
        if (rewardsData.user) {
          setRewards({ points: rewardsData.user.totalCoins || 0 });
          setReferralCode(rewardsData.user.referralCode || "");

          // Split referrals by level
          const referrals = rewardsData.referralChain || [];
          setDirectReferrals(
            referrals.filter((r) => r.level === 1 || !r.level),
          );
          setIndirectReferrals(referrals.filter((r) => r.level > 1));
        } else if (Array.isArray(rewardsData)) {
          // Legacy format
          const totalPoints = rewardsData.reduce(
            (sum, r) => sum + (r.points || 0),
            0,
          );
          setRewards({ points: totalPoints });
        }

        // Fetch reward log if available
        try {
          const logResponse = await api.get("/rewards/log", {
            params: { userId },
          });
          if (requestId !== requestIdRef.current) {
            return;
          }
          const logData = logResponse?.data ?? logResponse;
          setRewardLog(Array.isArray(logData) ? logData : []);
        } catch (logErr) {
          // Log endpoint might not exist yet or empty - continue
          setRewardLog([]);
        }
      } catch (err) {
        if (import.meta.env.DEV) {
          console.error("Error fetching rewards:", err);
        }
        setError(err.message || "Failed to load rewards");
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    };

    fetchUserData();
  }, [authLoading, user]); // Re-run when auth loading finishes

  if (loading) {
    return (
      <div className="min-h-screen mhub-premium-page bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:bg-gradient-to-br">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 dark:bg-gray-900" />
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl dark:bg-gray-900" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-xl dark:bg-gray-900" />
              <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-xl dark:bg-gray-900" />
            </div>
            <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl dark:bg-gray-900" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen mhub-premium-page bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:bg-gradient-to-br">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-8 text-center dark:bg-red-950/20 dark:border dark:border-red-600/40 dark:text-center">
            <p className="text-red-600 dark:text-red-400 mb-4 dark:text-red-300">{error}</p>
            <Link
              to="/login"
              className="inline-block bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium dark:bg-blue-700/40 dark:text-white dark:hover:bg-blue-700/40"
            >
              {tr("login", "Login")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen mhub-premium-page bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:bg-gradient-to-br">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white dark:text-2xl dark:text-gray-100">
          {tr("my_rewards", "My Rewards")}
        </h1>

        <UpsellBanner trigger="rewards" className="mb-6" />

        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg rounded-xl p-6 mb-6 text-white dark:bg-gradient-to-r dark:text-white">
          <h2 className="text-lg font-medium opacity-90 dark:text-lg">
            {tr("total_points", "Total Points")}
          </h2>
          <p className="text-4xl font-bold mt-1 dark:text-4xl">{rewards.points}</p>
          <p className="mt-3 text-sm opacity-80 dark:text-sm">
            {tr("your_referral_code", "Your referral code")}:{" "}
            <span className="font-mono bg-white/20 px-2 py-0.5 rounded dark:bg-slate-900/20">
              {referralCode || tr("not_available", "N/A")}
            </span>
          </p>
          {referralCode && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => {
                  const url = `${window.location.origin}/signup?ref=${referralCode}`;
                  navigator.clipboard.writeText(url).then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  });
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors dark:bg-slate-900/20 dark:hover:bg-slate-900/30 dark:text-sm"
              >
                {copied ? (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    {tr("copied", "Copied!")}
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    {tr("copy_link", "Copy Link")}
                  </>
                )}
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  tr("referral_share_text", "Join MHub marketplace using my referral link and earn 90 bonus coins! 🎉") +
                  "\n" + `${window.location.origin}/signup?ref=${referralCode}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/80 hover:bg-green-500 rounded-lg text-sm font-medium transition-colors dark:bg-green-800/80 dark:hover:bg-green-800/30 dark:text-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                WhatsApp
              </a>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="mhub-premium-surface shadow-sm rounded-xl p-6 border border-gray-100 dark:border-gray-700 dark:border">
            <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white dark:text-lg dark:text-gray-100">
              {tr("direct_referrals", "Direct Referrals")} (
              {directReferrals.length})
            </h2>
            {directReferrals.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm dark:text-gray-300 dark:text-sm">
                {tr("no_direct_referrals", "No direct referrals yet. Share your code to get started!")}
              </p>
            ) : (
              <ul className="space-y-1">
                {directReferrals.map((ref, idx) => (
                  <li
                    key={ref.user_id || ref.id || idx}
                    className="border-b border-gray-100 dark:border-gray-700 py-2 text-gray-700 dark:text-gray-300 text-sm dark:border-b dark:text-gray-200 dark:text-sm"
                  >
                    {ref.username || ref.name || tr("user", "User")}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="mhub-premium-surface shadow-sm rounded-xl p-6 border border-gray-100 dark:border-gray-700 dark:border">
            <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white dark:text-lg dark:text-gray-100">
              {tr("indirect_referrals", "Indirect Referrals")} (
              {indirectReferrals.length})
            </h2>
            {indirectReferrals.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm dark:text-gray-300 dark:text-sm">
                {tr("no_indirect_referrals", "No indirect referrals yet")}
              </p>
            ) : (
              <ul className="space-y-1">
                {indirectReferrals.map((ref, idx) => (
                  <li
                    key={ref.user_id || ref.id || idx}
                    className="border-b border-gray-100 dark:border-gray-700 py-2 text-gray-700 dark:text-gray-300 text-sm dark:border-b dark:text-gray-200 dark:text-sm"
                  >
                    {ref.username || ref.name || tr("user", "User")} (
                    {tr("level", "Level")} {ref.level})
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Daily Challenges Section */}
        <div className="mhub-premium-surface shadow-sm rounded-xl p-6 border border-gray-100 dark:border-gray-700 mb-6 dark:border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white dark:text-lg dark:text-gray-100">
              📋 {tr("daily_challenges", "Daily Challenges")}
            </h2>
            <span className="text-xs text-gray-500 dark:text-gray-400 dark:text-xs dark:text-gray-300">
              {tr("earn_coins_xp", "Complete tasks to earn coins & XP")}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: "🔑", title: tr("daily_login", "Daily Login"), desc: tr("visit_daily", "Visit MHub today"), reward: "+25 coins", done: true },
              { icon: "📌", title: tr("create_listing", "Create Listing"), desc: tr("post_item", "Post an item"), reward: "+50 coins", done: false, action: () => navigate("/post-welcome") },
              { icon: "⭐", title: tr("get_review", "Get Review"), desc: tr("complete_sale", "Complete a sale"), reward: "+100 coins", done: false },
              { icon: "👥", title: tr("invite_friend", "Invite Friend"), desc: tr("share_code", "Share your code"), reward: "+75 coins", done: false },
            ].map((challenge, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg border text-center transition-all ${
                  challenge.done
                    ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                    : "bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600"
                }`}
              >
                <div className={`text-2xl mb-1 ${challenge.done ? "opacity-50" : ""}`}>
                  {challenge.done ? "✅" : challenge.icon}
                </div>
                <h3 className="text-xs font-semibold text-gray-900 dark:text-white dark:text-xs dark:text-gray-100">{challenge.title}</h3>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-1 dark:text-[10px] dark:text-gray-300">{challenge.desc}</p>
                <span className="inline-block text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full dark:text-[10px] dark:text-blue-300 dark:bg-blue-950/20">
                  {challenge.reward}
                </span>
                {!challenge.done && challenge.action && (
                  <button
                    onClick={challenge.action}
                    className="block w-full mt-2 text-[10px] font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded py-1 transition-colors dark:text-[10px] dark:text-white dark:bg-blue-700/40 dark:hover:bg-blue-700/40"
                  >
                    {tr("start", "Start")} →
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Rewards Store */}
        <div className="mhub-premium-surface shadow-sm rounded-xl p-6 border border-gray-100 dark:border-gray-700 mb-6 dark:border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white dark:text-lg dark:text-gray-100">
              🎁 {tr("rewards_store", "Rewards Store")}
            </h2>
            <span className="text-xs text-gray-500 dark:text-gray-400 dark:text-xs dark:text-gray-300">
              {tr("redeem_coins", "Redeem your coins for benefits")}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { icon: "🚀", title: tr("boost_24h", "Boost (24h)"), desc: tr("top_search", "Top of search"), coins: 250, badge: "50% OFF" },
              { icon: "⭐", title: tr("featured_7d", "Featured (7d)"), desc: tr("premium_placement", "Premium section"), coins: 500, badge: "40% OFF" },
              { icon: "📌", title: tr("free_listing", "Free Listing"), desc: tr("one_listing", "1 free listing (15d)"), coins: 150 },
              { icon: "📦", title: tr("listing_bundle", "5 Listing Bundle"), desc: tr("five_listings", "5 listings (30d each)"), coins: 1000, badge: "POPULAR" },
              { icon: "✅", title: tr("fast_verify", "Fast Verification"), desc: tr("expedited", "Verified in 1 day"), coins: 300 },
              { icon: "👑", title: tr("premium_1mo", "Premium (1 month)"), desc: tr("premium_upgrade", "Premium tier upgrade"), coins: 2000, badge: "LIMITED" },
            ].map((reward, idx) => (
              <div
                key={idx}
                className="relative p-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 hover:shadow-md transition-shadow dark:border dark:border-gray-700 dark:bg-gray-950"
              >
                {reward.badge && (
                  <span className="absolute -top-2 -right-2 text-[9px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full dark:text-[9px] dark:bg-red-800/30 dark:text-white">
                    {reward.badge}
                  </span>
                )}
                <div className="text-2xl mb-1 dark:text-2xl">{reward.icon}</div>
                <h3 className="text-xs font-semibold text-gray-900 dark:text-white dark:text-xs dark:text-gray-100">{reward.title}</h3>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-2 dark:text-[10px] dark:text-gray-300">{reward.desc}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-yellow-600 dark:text-yellow-400 dark:text-xs dark:text-yellow-300">
                    🪙 {reward.coins}
                  </span>
                  <button
                    disabled={rewards.points < reward.coins}
                    className="text-[10px] font-semibold px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors dark:text-[10px] dark:bg-blue-700/40 dark:text-white dark:hover:bg-blue-700/40"
                  >
                    {tr("redeem", "Redeem")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Achievements Section */}
        <div className="mhub-premium-surface shadow-sm rounded-xl p-6 border border-gray-100 dark:border-gray-700 mb-6 dark:border">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white dark:text-lg dark:text-gray-100">
            🏆 {tr("achievements", "Achievements")}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: "🎯", title: tr("first_listing", "First Listing"), desc: tr("post_first", "Post your first item"), unlocked: false, progress: "0/1" },
              { icon: "⭐", title: tr("five_star_seller", "5-Star Seller"), desc: tr("ten_reviews", "Get 10 five-star reviews"), unlocked: false, progress: "0/10" },
              { icon: "🔥", title: tr("streak_master", "Streak Master"), desc: tr("thirty_day_streak", "30-day visit streak"), unlocked: false, progress: "0/30" },
              { icon: "👑", title: tr("elite_seller", "Elite Seller"), desc: tr("reach_premium", "Reach Premium tier"), unlocked: false, progress: "Locked" },
            ].map((achievement, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg border text-center ${
                  achievement.unlocked
                    ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
                    : "bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600"
                }`}
              >
                <div className={`text-2xl mb-1 ${achievement.unlocked ? "" : "opacity-30"}`}>
                  {achievement.icon}
                </div>
                <h3 className="text-xs font-semibold text-gray-900 dark:text-white dark:text-xs dark:text-gray-100">{achievement.title}</h3>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-1 dark:text-[10px] dark:text-gray-300">{achievement.desc}</p>
                <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 dark:text-[10px] dark:text-gray-300">{achievement.progress}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Reward History */}
        <div className="mhub-premium-surface shadow-sm rounded-xl p-6 border border-gray-100 dark:border-gray-700 dark:border">
          <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white dark:text-lg dark:text-gray-100">
            📊 {tr("reward_history", "Reward History")}
          </h2>
          {rewardLog.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm dark:text-gray-300 dark:text-sm">
              {tr("no_reward_history", "No reward history yet")}
            </p>
          ) : (
            <div className="overflow-x-auto scrollbar-hide">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 dark:border-b">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider dark:text-left dark:text-xs dark:text-gray-300">
                      {tr("points", "Points")}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider dark:text-left dark:text-xs dark:text-gray-300">
                      {tr("reason", "Reason")}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider dark:text-left dark:text-xs dark:text-gray-300">
                      {tr("date", "Date")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {rewardLog.map((log, idx) => (
                    <tr key={log.log_id || idx}>
                      <td className="px-4 py-3 text-green-600 dark:text-green-400 font-medium dark:text-green-300">+{log.points}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 text-sm dark:text-gray-200 dark:text-sm">
                        {(log.reason || "").replace("_", " ")}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-sm dark:text-gray-300 dark:text-sm">
                        {log.created_at
                          ? new Date(log.created_at).toLocaleDateString()
                          : tr("not_available", "N/A")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RewardsPage;



import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { getAccessToken, getUserId } from "@/utils/authStorage";

const RewardsPage = () => {
  const { user, loading: authLoading } = useAuth(); // Use global auth state
  const { t } = useTranslation();
  const tr = (key, fallback, options = {}) =>
    t(key, { defaultValue: fallback, ...options });
  const [rewards, setRewards] = useState({ points: 0 });
  const [directReferrals, setDirectReferrals] = useState([]);
  const [indirectReferrals, setIndirectReferrals] = useState([]);
  const [rewardLog, setRewardLog] = useState([]);
  const [referralCode, setReferralCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-950">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48" />
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-xl" />
              <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-xl" />
            </div>
            <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-950">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-8 text-center">
            <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
            <Link
              to="/login"
              className="inline-block bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              {tr("login", "Login")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-950">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
          {tr("my_rewards", "My Rewards")}
        </h1>

        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg rounded-xl p-6 mb-6 text-white">
          <h2 className="text-lg font-medium opacity-90">
            {tr("total_points", "Total Points")}
          </h2>
          <p className="text-4xl font-bold mt-1">{rewards.points}</p>
          <p className="mt-3 text-sm opacity-80">
            {tr("your_referral_code", "Your referral code")}:{" "}
            <span className="font-mono bg-white/20 px-2 py-0.5 rounded">
              {referralCode || tr("not_available", "N/A")}
            </span>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl p-6 border border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
              {tr("direct_referrals", "Direct Referrals")} (
              {directReferrals.length})
            </h2>
            {directReferrals.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {tr("no_direct_referrals", "No direct referrals yet")}
              </p>
            ) : (
              <ul className="space-y-1">
                {directReferrals.map((ref, idx) => (
                  <li
                    key={ref.user_id || ref.id || idx}
                    className="border-b border-gray-100 dark:border-gray-700 py-2 text-gray-700 dark:text-gray-300 text-sm"
                  >
                    {ref.username || ref.name || tr("user", "User")}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl p-6 border border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
              {tr("indirect_referrals", "Indirect Referrals")} (
              {indirectReferrals.length})
            </h2>
            {indirectReferrals.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {tr("no_indirect_referrals", "No indirect referrals yet")}
              </p>
            ) : (
              <ul className="space-y-1">
                {indirectReferrals.map((ref, idx) => (
                  <li
                    key={ref.user_id || ref.id || idx}
                    className="border-b border-gray-100 dark:border-gray-700 py-2 text-gray-700 dark:text-gray-300 text-sm"
                  >
                    {ref.username || ref.name || tr("user", "User")} (
                    {tr("level", "Level")} {ref.level})
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl p-6 border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
            {tr("reward_history", "Reward History")}
          </h2>
          {rewardLog.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {tr("no_reward_history", "No reward history yet")}
            </p>
          ) : (
            <div className="overflow-x-auto scrollbar-hide">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {tr("points", "Points")}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {tr("reason", "Reason")}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {tr("date", "Date")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {rewardLog.map((log, idx) => (
                    <tr key={log.log_id || idx}>
                      <td className="px-4 py-3 text-green-600 dark:text-green-400 font-medium">+{log.points}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 text-sm">
                        {(log.reason || "").replace("_", " ")}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-sm">
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

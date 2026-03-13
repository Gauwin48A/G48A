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
      <div className="container mx-auto p-4 flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500">
          {tr("loading_rewards", "Loading rewards...")}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600">{error}</p>
          <Link
            to="/login"
            className="mt-4 inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            {tr("login", "Login")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">
        {tr("my_rewards", "My Rewards")}
      </h1>

      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold">
          {tr("total_points", "Total Points")}
        </h2>
        <p className="text-3xl text-blue-600">{rewards.points}</p>
        <p className="mt-2">
          {tr("your_referral_code", "Your referral code")}:{" "}
          <span className="font-mono bg-gray-200 px-2 py-1 rounded">
            {referralCode || tr("not_available", "N/A")}
          </span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-2">
            {tr("direct_referrals", "Direct Referrals")} (
            {directReferrals.length})
          </h2>
          {directReferrals.length === 0 ? (
            <p className="text-gray-500">
              {tr("no_direct_referrals", "No direct referrals yet")}
            </p>
          ) : (
            <ul>
              {directReferrals.map((ref, idx) => (
                <li
                  key={ref.user_id || ref.id || idx}
                  className="border-b py-1"
                >
                  {ref.username || ref.name || tr("user", "User")}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-2">
            {tr("indirect_referrals", "Indirect Referrals")} (
            {indirectReferrals.length})
          </h2>
          {indirectReferrals.length === 0 ? (
            <p className="text-gray-500">
              {tr("no_indirect_referrals", "No indirect referrals yet")}
            </p>
          ) : (
            <ul>
              {indirectReferrals.map((ref, idx) => (
                <li
                  key={ref.user_id || ref.id || idx}
                  className="border-b py-1"
                >
                  {ref.username || ref.name || tr("user", "User")} (
                  {tr("level", "Level")} {ref.level})
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-2">
          {tr("reward_history", "Reward History")}
        </h2>
        {rewardLog.length === 0 ? (
          <p className="text-gray-500">
            {tr("no_reward_history", "No reward history yet")}
          </p>
        ) : (
          <div className="overflow-x-auto scrollbar-hide">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left">
                    {tr("points", "Points")}
                  </th>
                  <th className="px-4 py-2 text-left">
                    {tr("reason", "Reason")}
                  </th>
                  <th className="px-4 py-2 text-left">
                    {tr("date", "Date")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rewardLog.map((log, idx) => (
                  <tr key={log.log_id || idx} className="border-b">
                    <td className="px-4 py-2 text-green-600">+{log.points}</td>
                    <td className="px-4 py-2">
                      {(log.reason || "").replace("_", " ")}
                    </td>
                    <td className="px-4 py-2">
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
  );
};

export default RewardsPage;

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient'; // Adjust the import path as needed

const RewardsPage = () => {
    const [rewards, setRewards] = useState({ points: 0 });
    const [directReferrals, setDirectReferrals] = useState([]);
    const [indirectReferrals, setIndirectReferrals] = useState([]);
    const [rewardLog, setRewardLog] = useState([]);
    const [referralCode, setReferralCode] = useState('');

    useEffect(() => {
        const fetchUserData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // Fetch total reward points
                const { data: rewardsData, error: rewardsError } = await supabase
                    .from('rewards')
                    .select('points')
                    .eq('user_id', user.id)
                    .single();
                if (rewardsData) setRewards(rewardsData);

                // Fetch user's referral code
                const { data: userData, error: userError } = await supabase
                    .from('users')
                    .select('referral_code')
                    .eq('user_id', user.id)
                    .single();
                if (userData) setReferralCode(userData.referral_code);

                // Fetch direct and indirect referrals
                const { data: referrals, error: referralsError } = await supabase
                    .rpc('get_user_referrals', { p_user_id: user.id });
                if (referrals) {
                    setDirectReferrals(referrals.filter(r => r.level === 1));
                    setIndirectReferrals(referrals.filter(r => r.level > 1));
                }

                // Fetch reward log
                const { data: logData, error: logError } = await supabase
                    .from('reward_log')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false });
                if (logData) setRewardLog(logData);
            }
        };

        fetchUserData();
    }, []);

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">My Rewards</h1>

            <div className="bg-white shadow rounded-lg p-6 mb-6">
                <h2 className="text-xl font-semibold">Total Points</h2>
                <p className="text-3xl text-blue-600">{rewards.points}</p>
                <p className="mt-2">Your referral code: <span className="font-mono bg-gray-200 px-2 py-1 rounded">{referralCode}</span></p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-xl font-semibold mb-2">Direct Referrals ({directReferrals.length})</h2>
                    <ul>
                        {directReferrals.map(ref => (
                            <li key={ref.user_id} className="border-b py-1">{ref.username}</li>
                        ))}
                    </ul>
                </div>
                <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-xl font-semibold mb-2">Indirect Referrals ({indirectReferrals.length})</h2>
                    <ul>
                        {indirectReferrals.map(ref => (
                            <li key={ref.user_id} className="border-b py-1">{ref.username} (Level {ref.level})</li>
                        ))}
                    </ul>
                </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-2">Reward History</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead>
                            <tr>
                                <th className="px-4 py-2 text-left">Points</th>
                                <th className="px-4 py-2 text-left">Reason</th>
                                <th className="px-4 py-2 text-left">Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rewardLog.map(log => (
                                <tr key={log.log_id} className="border-b">
                                    <td className="px-4 py-2 text-green-600">+{log.points}</td>
                                    <td className="px-4 py-2">{log.reason.replace('_', ' ')}</td>
                                    <td className="px-4 py-2">{new Date(log.created_at).toLocaleDateString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default RewardsPage;

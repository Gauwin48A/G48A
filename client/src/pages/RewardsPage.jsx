import React, { useState, useEffect } from 'react';

const RewardsPage = () => {
    const [rewards, setRewards] = useState({ points: 0 });
    const [directReferrals, setDirectReferrals] = useState([]);
    const [indirectReferrals, setIndirectReferrals] = useState([]);
    const [rewardLog, setRewardLog] = useState([]);
    const [referralCode, setReferralCode] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchUserData = async () => {
            setLoading(true);
            setError(null);

            const token = localStorage.getItem('authToken');
            const userId = localStorage.getItem('userId');

            if (!token || !userId) {
                setError('Please login to view rewards');
                setLoading(false);
                return;
            }

            try {
                const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

                // FIX: Fetch rewards via Node API instead of Supabase direct call
                const rewardsRes = await fetch(`${baseUrl}/api/rewards?userId=${userId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!rewardsRes.ok) {
                    throw new Error('Failed to fetch rewards');
                }

                const rewardsData = await rewardsRes.json();

                // Handle both old format (array) and new format (object with user/referralChain)
                if (rewardsData.user) {
                    setRewards({ points: rewardsData.user.totalCoins || 0 });
                    setReferralCode(rewardsData.user.referralCode || '');

                    // Split referrals by level
                    const referrals = rewardsData.referralChain || [];
                    setDirectReferrals(referrals.filter(r => r.level === 1 || !r.level));
                    setIndirectReferrals(referrals.filter(r => r.level > 1));
                } else if (Array.isArray(rewardsData)) {
                    // Legacy format
                    const totalPoints = rewardsData.reduce((sum, r) => sum + (r.points || 0), 0);
                    setRewards({ points: totalPoints });
                }

                // Fetch reward log if available
                try {
                    const logRes = await fetch(`${baseUrl}/api/rewards/log?userId=${userId}`, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    if (logRes.ok) {
                        const logData = await logRes.json();
                        setRewardLog(Array.isArray(logData) ? logData : []);
                    }
                } catch (logErr) {
                    // Log endpoint might not exist yet - continue without it
                    console.log('Reward log not available');
                }

            } catch (err) {
                console.error('Error fetching rewards:', err);
                setError(err.message || 'Failed to load rewards');
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, []);

    if (loading) {
        return (
            <div className="container mx-auto p-4 flex items-center justify-center min-h-[400px]">
                <p className="text-gray-500">Loading rewards...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto p-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                    <p className="text-red-600">{error}</p>
                    <a href="/login" className="mt-4 inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
                        Login
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">My Rewards</h1>

            <div className="bg-white shadow rounded-lg p-6 mb-6">
                <h2 className="text-xl font-semibold">Total Points</h2>
                <p className="text-3xl text-blue-600">{rewards.points}</p>
                <p className="mt-2">Your referral code: <span className="font-mono bg-gray-200 px-2 py-1 rounded">{referralCode || 'N/A'}</span></p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-xl font-semibold mb-2">Direct Referrals ({directReferrals.length})</h2>
                    {directReferrals.length === 0 ? (
                        <p className="text-gray-500">No direct referrals yet</p>
                    ) : (
                        <ul>
                            {directReferrals.map((ref, idx) => (
                                <li key={ref.user_id || ref.id || idx} className="border-b py-1">{ref.username || ref.name || 'User'}</li>
                            ))}
                        </ul>
                    )}
                </div>
                <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-xl font-semibold mb-2">Indirect Referrals ({indirectReferrals.length})</h2>
                    {indirectReferrals.length === 0 ? (
                        <p className="text-gray-500">No indirect referrals yet</p>
                    ) : (
                        <ul>
                            {indirectReferrals.map((ref, idx) => (
                                <li key={ref.user_id || ref.id || idx} className="border-b py-1">{ref.username || ref.name || 'User'} (Level {ref.level})</li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-2">Reward History</h2>
                {rewardLog.length === 0 ? (
                    <p className="text-gray-500">No reward history yet</p>
                ) : (
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
                                {rewardLog.map((log, idx) => (
                                    <tr key={log.log_id || idx} className="border-b">
                                        <td className="px-4 py-2 text-green-600">+{log.points}</td>
                                        <td className="px-4 py-2">{(log.reason || '').replace('_', ' ')}</td>
                                        <td className="px-4 py-2">{log.created_at ? new Date(log.created_at).toLocaleDateString() : 'N/A'}</td>
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

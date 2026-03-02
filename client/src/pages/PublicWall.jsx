import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Trophy, Star, Medal, Crown, Shield, TrendingUp, AlertTriangle, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getApiOriginBase } from '@/lib/networkConfig';

const normalizeUrl = (value) => String(value || '').replace(/\/+$/, '');
const baseFromEnv = normalizeUrl(getApiOriginBase());
const PUBLIC_WALL_API_URL = baseFromEnv.endsWith('/api')
  ? `${baseFromEnv}/publicwall`
  : `${baseFromEnv}/api/publicwall`;

const toSafeNumber = (value) => {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? numeric : 0;
};

const normalizePublicWallError = (error) => {
  const status = Number(error?.status || error?.response?.status || 0);
  if (status === 401 || status === 403) {
    return 'This session cannot access public wall insights right now.';
  }
  return 'Public wall data is temporarily unavailable. Please retry.';
};

const getRankIcon = (rank) => {
  switch (rank) {
    case 'Gold':
      return <Crown className="w-5 h-5 text-yellow-500" />;
    case 'Silver':
      return <Medal className="w-5 h-5 text-gray-400" />;
    case 'Bronze':
      return <Trophy className="w-5 h-5 text-amber-600" />;
    default:
      return <Star className="w-5 h-5 text-gray-400" />;
  }
};

const getRankColor = (rank) => {
  switch (rank) {
    case 'Gold':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'Silver':
      return 'bg-gray-100 text-gray-800 border-gray-300';
    case 'Bronze':
      return 'bg-amber-100 text-amber-800 border-amber-300';
    default:
      return 'bg-blue-100 text-blue-800 border-blue-300';
  }
};

const PublicWall = () => {
  const { t } = useTranslation();
  const [topSellers, setTopSellers] = useState([]);
  const [topBuyers, setTopBuyers] = useState([]);
  const [topUsers, setTopUsers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [retryNonce, setRetryNonce] = useState(0);

  const hasAnyData = topSellers.length > 0 || topBuyers.length > 0 || topUsers.length > 0;

  const fetchPublicWall = useCallback(async (signal) => {
    setLoading(true);

    try {
      const response = await fetch(PUBLIC_WALL_API_URL, { signal });
      if (!response.ok) {
        let payload = {};
        try {
          payload = await response.json();
        } catch {
          payload = {};
        }
        throw new Error(payload?.error || `Request failed with status ${response.status}`);
      }

      const data = await response.json();
      setTopSellers(Array.isArray(data?.topSellers) ? data.topSellers : []);
      setTopBuyers(Array.isArray(data?.topBuyers) ? data.topBuyers : []);
      setTopUsers(Array.isArray(data?.topUsers) ? data.topUsers : []);
      setError('');
    } catch (fetchError) {
      if (fetchError?.name === 'AbortError') {
        return;
      }
      setError(normalizePublicWallError(fetchError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchPublicWall(controller.signal);
    return () => {
      controller.abort();
    };
  }, [fetchPublicWall, retryNonce]);

  const monthlyStats = useMemo(() => {
    const totalSales = topSellers.reduce((sum, seller) => sum + toSafeNumber(seller.sales), 0);
    const activeBuyers = topBuyers.length;
    const totalVolume = topSellers.reduce((sum, seller) => sum + toSafeNumber(seller.coins), 0);

    const participants = [...topSellers, ...topBuyers];
    const verifiedCount = participants.filter((participant) => Boolean(participant.verified)).length;
    const verificationRate = participants.length > 0 ? Math.round((verifiedCount / participants.length) * 100) : 0;

    return {
      totalSales,
      activeBuyers,
      totalVolume,
      verificationRate,
    };
  }, [topBuyers, topSellers]);

  if (loading && !hasAnyData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-100 dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
          {[1, 2, 3].map((idx) => (
            <Card key={idx} className="animate-pulse rounded-3xl">
              <CardContent className="p-8 space-y-4">
                <div className="h-6 w-56 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center space-x-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center">
              <Trophy className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Public Wall</h1>
              <p className="text-gray-600 dark:text-gray-300 text-lg">Celebrating top performance from the community</p>
            </div>
          </div>
          <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-2xl p-6 inline-block">
            <h2 className="text-2xl font-bold mb-2">Monthly Champions</h2>
            <p className="text-sky-100">Recognition for trusted, high-quality marketplace activity</p>
          </div>
        </div>

        {error && hasAnyData ? (
          <Alert variant="destructive" className="mb-6 bg-white/90">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Latest refresh failed</AlertTitle>
            <AlertDescription>
              {error} Showing last available snapshot.
            </AlertDescription>
            <div className="mt-3">
              <Button size="sm" onClick={() => setRetryNonce((value) => value + 1)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </Alert>
        ) : null}

        {error && !hasAnyData ? (
          <Card className="max-w-2xl mx-auto mb-8 border-red-200">
            <CardContent className="p-8 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Public wall unavailable</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button onClick={() => setRetryNonce((value) => value + 1)}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
                <Button variant="outline" onClick={() => window.location.assign('/all-posts')}>Browse Marketplace</Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {!loading && !error && !hasAnyData ? (
          <Card className="max-w-2xl mx-auto mb-8 border-dashed border-2 border-blue-200">
            <CardContent className="p-8 text-center space-y-3">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">No public wall data yet</h3>
              <p className="text-gray-600 dark:text-gray-300">Complete trusted sales and purchases to appear in upcoming rankings.</p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button onClick={() => setRetryNonce((value) => value + 1)}>Refresh</Button>
                <Button variant="outline" onClick={() => window.location.assign('/rewards')}>{t('rewards') || 'Rewards'}</Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {hasAnyData ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="shadow-xl border-0 rounded-3xl overflow-hidden dark:bg-gray-800">
              <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-600 text-white text-center py-8">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl font-bold">Top Sellers</CardTitle>
                <CardDescription className="text-green-100 text-lg">Outstanding sales performance</CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                {topSellers.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center">No seller leaderboard data available yet.</p>
                ) : (
                  <div className="space-y-6">
                    {topSellers.map((seller, index) => (
                      <div key={seller.id || `${seller.name}-${index}`} className="flex items-center space-x-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-700 dark:to-gray-700 rounded-2xl">
                        <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl text-white font-bold text-lg">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-bold text-gray-900 dark:text-white">{seller.name || 'Unknown seller'}</h4>
                            {seller.verified ? <Shield className="w-4 h-4 text-green-600" /> : null}
                          </div>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge className={`border ${getRankColor(seller.rank)}`}>
                              <div className="flex items-center space-x-1">
                                {getRankIcon(seller.rank)}
                                <span>{seller.rank || 'Rising'}</span>
                              </div>
                            </Badge>
                            <div className="flex items-center space-x-1">
                              <Star className="w-4 h-4 text-yellow-500 fill-current" />
                              <span className="text-sm font-medium">{toSafeNumber(seller.rating).toFixed(1)}</span>
                            </div>
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {toSafeNumber(seller.sales)} sales | {toSafeNumber(seller.coins)} coins
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-xl border-0 rounded-3xl overflow-hidden dark:bg-gray-800">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-center py-8">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl font-bold">Top Buyers</CardTitle>
                <CardDescription className="text-blue-100 text-lg">Most active purchasers</CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                {topBuyers.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center">No buyer leaderboard data available yet.</p>
                ) : (
                  <div className="space-y-6">
                    {topBuyers.map((buyer, index) => (
                      <div key={buyer.id || `${buyer.name}-${index}`} className="flex items-center space-x-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-700 rounded-2xl">
                        <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl text-white font-bold text-lg">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-bold text-gray-900 dark:text-white">{buyer.name || 'Unknown buyer'}</h4>
                            {buyer.verified ? <Shield className="w-4 h-4 text-blue-600" /> : null}
                          </div>
                          <div className="flex items-center space-x-1 mt-1">
                            <Star className="w-4 h-4 text-yellow-500 fill-current" />
                            <span className="text-sm font-medium">{toSafeNumber(buyer.rating).toFixed(1)}</span>
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {toSafeNumber(buyer.purchases)} purchases | {toSafeNumber(buyer.coins)} coins
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-xl border-0 rounded-3xl overflow-hidden dark:bg-gray-800">
              <CardHeader className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-center py-8">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Crown className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl font-bold">Top Users</CardTitle>
                <CardDescription className="text-cyan-100 text-lg">Highest coin earners</CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                {topUsers.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center">No user leaderboard data available yet.</p>
                ) : (
                  <div className="space-y-6">
                    {topUsers.map((user, index) => (
                      <div key={user.id || `${user.name}-${index}`} className="flex items-center space-x-4 p-4 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-gray-700 dark:to-gray-700 rounded-2xl">
                        <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl text-white font-bold text-lg">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-900 dark:text-white">{user.name || 'Community member'}</h4>
                          <Badge className="bg-cyan-100 text-cyan-800 border-cyan-300 mt-1">
                            Level {toSafeNumber(user.level)}
                          </Badge>
                          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {toSafeNumber(user.totalCoins)} coins | {user.badge || 'Rising member'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}

        {hasAnyData ? (
          <Card className="mt-8 shadow-xl border-0 rounded-3xl overflow-hidden dark:bg-gray-800">
            <CardHeader className="bg-gradient-to-r from-sky-500 to-blue-600 text-white text-center py-8">
              <CardTitle className="text-2xl font-bold">This Month's Snapshot</CardTitle>
              <CardDescription className="text-sky-100 text-lg">Live summary from current leaderboard data</CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center p-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-700 dark:to-gray-700 rounded-2xl">
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400">{monthlyStats.totalSales}</div>
                  <div className="text-gray-600 dark:text-gray-300 font-medium">Total Sales</div>
                </div>
                <div className="text-center p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-700 rounded-2xl">
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{monthlyStats.activeBuyers}</div>
                  <div className="text-gray-600 dark:text-gray-300 font-medium">Active Buyers</div>
                </div>
                <div className="text-center p-6 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-gray-700 dark:to-gray-700 rounded-2xl">
                  <div className="text-3xl font-bold text-cyan-600 dark:text-cyan-400">{monthlyStats.totalVolume}</div>
                  <div className="text-gray-600 dark:text-gray-300 font-medium">Coin Volume</div>
                </div>
                <div className="text-center p-6 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-gray-700 dark:to-gray-700 rounded-2xl">
                  <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{monthlyStats.verificationRate}%</div>
                  <div className="text-gray-600 dark:text-gray-300 font-medium">Verified Rate</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
};

export default PublicWall;

import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  Calendar,
  ChevronRight,
  Coins,
  Eye,
  FileText,
  RefreshCw,
  ShoppingCart,
  Star,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import { translateText } from '../utils/translateContent';
import { useAuth } from '@/context/AuthContext';
import { getApiOriginBase } from '@/lib/networkConfig';

const dashboardBaseUrl = String(getApiOriginBase()).replace(/\/+$/, '');
const DASHBOARD_API_URL = dashboardBaseUrl.endsWith('/api') ? dashboardBaseUrl : `${dashboardBaseUrl}/api`;

const QUICK_STAT_CONFIG = {
  active_listings: { icon: FileText, route: '/my-posts', cta: 'Manage listings' },
  total_sales: { icon: ShoppingCart, route: '/sold-posts', cta: 'View sold posts' },
  total_views: { icon: Eye, route: '/my-feed', cta: 'Review post views' },
  coins_earned: { icon: Coins, route: '/rewards', cta: 'Open rewards' },
};

const DEFAULT_QUICK_STATS = [
  { labelKey: 'active_listings', value: 0, trend: '+Active', trendKey: 'trend_active', bg: 'bg-blue-100', color: 'text-blue-600' },
  { labelKey: 'total_sales', value: 0, trend: '+Sold', trendKey: 'trend_sold', bg: 'bg-green-100', color: 'text-green-600' },
  { labelKey: 'total_views', value: 0, trend: '+Views', trendKey: 'trend_views', bg: 'bg-purple-100', color: 'text-purple-600' },
  { labelKey: 'coins_earned', value: 0, trend: '+Coins', trendKey: 'trend_coins', bg: 'bg-yellow-100', color: 'text-yellow-600' },
];

const normalizeDashboardError = (errorMessage) => {
  const message = String(errorMessage || '').toLowerCase();
  if (message.includes('authentication') || message.includes('token') || message.includes('unauthorized')) {
    return 'Your session expired. Sign in again to continue.';
  }
  return 'Dashboard data is temporarily unavailable. Retry in a moment.';
};

const getInitials = (name) => {
  const normalized = String(name || 'U')
    .split(' ')
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => chunk[0]?.toUpperCase())
    .join('');
  return normalized || 'U';
};

const Dashboard = () => {
  const { t } = useTranslation();
  const { user: authUser } = useAuth();
  const [user, setUser] = useState(null);
  const [quickStats, setQuickStats] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [topSellers, setTopSellers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);

  const currentLang = useMemo(
    () => i18n.language || localStorage.getItem('mhub_language') || 'en',
    [i18n.language]
  );

  const isLoggedIn = useMemo(
    () => Boolean(authUser || localStorage.getItem('authToken') || localStorage.getItem('token')),
    [authUser]
  );

  const translatedFallback = (key, fallback) => {
    const translated = t(key);
    return translated === key ? fallback : translated;
  };

  useEffect(() => {
    if (!isLoggedIn) {
      setUser(null);
      setQuickStats([]);
      setRecentActivity([]);
      setTopSellers([]);
      setError('');
      setLoading(false);
      return undefined;
    }

    const abortController = new AbortController();
    let isActive = true;

    const fetchDashboard = async () => {
      setLoading(true);
      setError('');

      try {
        const token = localStorage.getItem('authToken') || localStorage.getItem('token');
        if (token && !localStorage.getItem('authToken')) {
          localStorage.setItem('authToken', token);
        }

        const params = new URLSearchParams();
        const resolvedUserId =
          authUser?.user_id ||
          authUser?.id ||
          localStorage.getItem('userId') ||
          '';

        if (resolvedUserId) {
          params.set('userId', String(resolvedUserId));
        }
        if (retryNonce > 0) {
          params.set('refresh', 'true');
        }

        const query = params.toString();
        const requestUrl = `${DASHBOARD_API_URL}/dashboard${query ? `?${query}` : ''}`;
        const response = await fetch(requestUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: 'include',
          signal: abortController.signal,
        });

        if (!response.ok) {
          const errorPayload = await response.json().catch(() => ({}));
          throw new Error(errorPayload.error || errorPayload.message || 'Failed to fetch dashboard');
        }

        const payload = await response.json();
        if (!isActive) {
          return;
        }

        const activityFromApi = Array.isArray(payload?.recentActivity) ? payload.recentActivity : [];
        const nextQuickStats = Array.isArray(payload?.quickStats) ? payload.quickStats : [];
        const nextTopSellers = Array.isArray(payload?.topSellers) ? payload.topSellers : [];

        setUser(payload?.user || null);
        setQuickStats(nextQuickStats);
        setTopSellers(nextTopSellers);

        if (currentLang !== 'en' && activityFromApi.length > 0) {
          try {
            const translatedActivities = await Promise.all(
              activityFromApi.map(async (activity) => {
                const translatedTitle = await translateText(activity.title, currentLang);
                return { ...activity, title: translatedTitle };
              })
            );
            if (isActive) {
              setRecentActivity(translatedActivities);
            }
          } catch (translationError) {
            if (import.meta.env.DEV) {
              console.warn('[Dashboard] Activity translation fallback:', translationError);
            }
            if (isActive) {
              setRecentActivity(activityFromApi);
            }
          }
        } else {
          setRecentActivity(activityFromApi);
        }
      } catch (fetchError) {
        if (fetchError?.name !== 'AbortError' && isActive) {
          setError(normalizeDashboardError(fetchError?.message));
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    fetchDashboard();

    return () => {
      isActive = false;
      abortController.abort();
    };
  }, [authUser, currentLang, isLoggedIn, retryNonce]);

  const statCards = useMemo(() => {
    const sourceStats = quickStats.length ? quickStats : DEFAULT_QUICK_STATS;
    return sourceStats.map((stat, index) => {
      const labelKey = stat.labelKey || String(stat.label || '').toLowerCase().replace(/ /g, '_');
      const statConfig = QUICK_STAT_CONFIG[labelKey] || QUICK_STAT_CONFIG.active_listings;
      const trendKey =
        stat.trendKey ||
        (stat.trend === '+Active'
          ? 'trend_active'
          : stat.trend === '+Sold'
            ? 'trend_sold'
            : stat.trend === '+Views'
              ? 'trend_views'
              : stat.trend === '+Coins'
                ? 'trend_coins'
                : 'trend_active');
      return {
        ...stat,
        key: `${labelKey || 'stat'}-${index}`,
        labelKey,
        trendKey,
        icon: statConfig.icon,
        route: statConfig.route,
        cta: statConfig.cta,
      };
    });
  }, [quickStats]);

  const hasLimitedData = useMemo(
    () =>
      !loading &&
      !error &&
      (quickStats.length === 0 || recentActivity.length === 0 || topSellers.length === 0),
    [error, loading, quickStats.length, recentActivity.length, topSellers.length]
  );

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-200 dark:from-gray-900 dark:to-gray-800 transition-colors duration-300 p-4">
        <div className="bg-white dark:bg-gray-800 border border-blue-200 dark:border-gray-700 rounded-3xl p-8 shadow-2xl text-center max-w-md w-full">
          <h2 className="text-3xl font-extrabold text-blue-700 dark:text-blue-400 mb-4">
            {translatedFallback('your_dashboard', 'Your Dashboard')}
          </h2>
          <p className="text-base text-gray-600 dark:text-gray-300 mb-6">
            {translatedFallback('dashboard_login_msg', 'Sign in to see your personalized marketplace insights.')}
          </p>
          <div className="flex flex-col gap-3">
            <Link
              to="/login?returnTo=%2Fdashboard"
              className="bg-blue-600 hover:bg-blue-700 text-white text-base px-8 py-3 rounded-xl font-bold text-center"
            >
              {translatedFallback('login_to_continue', 'Login to Continue')}
            </Link>
            <Link
              to="/signup"
              className="border border-blue-300 dark:border-blue-500 text-blue-600 dark:text-blue-400 text-base px-8 py-3 rounded-xl font-semibold text-center hover:bg-blue-50 dark:hover:bg-gray-700"
            >
              {translatedFallback('create_account', 'Create Account')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center space-y-3">
          <div className="h-10 w-10 mx-auto rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          <p className="text-gray-500 dark:text-gray-400">{translatedFallback('loading', 'Loading')}</p>
        </div>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900 p-4">
        <Card className="max-w-lg w-full">
          <CardContent className="p-6 space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Dashboard unavailable</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setRetryNonce((value) => value + 1)}>
                {translatedFallback('retry', 'Retry')}
              </Button>
              <Button asChild variant="outline">
                <Link to="/all-posts">Browse marketplace</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
        <Card className="max-w-3xl mx-auto">
          <CardContent className="p-6 space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Dashboard data incomplete</AlertTitle>
              <AlertDescription>
                We could not load profile metrics right now. Retry or continue with marketplace actions.
              </AlertDescription>
            </Alert>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setRetryNonce((value) => value + 1)}>
                {translatedFallback('retry', 'Retry')}
              </Button>
              <Button asChild variant="outline">
                <Link to="/add-post">Create a post</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/my-posts">My posts</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <div className="container mx-auto px-4 py-6 max-w-6xl space-y-6">
        {error ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Latest refresh failed</AlertTitle>
            <AlertDescription>
              {error}
              {' '}
              Showing last available dashboard data.
            </AlertDescription>
          </Alert>
        ) : null}

        {hasLimitedData ? (
          <Alert className="border-yellow-300 bg-yellow-50 text-yellow-900">
            <AlertTriangle className="h-4 w-4 text-yellow-700" />
            <AlertTitle>Limited dashboard data</AlertTitle>
            <AlertDescription>
              Some panels are still empty. Publish posts, complete sales, and refresh to unlock full analytics.
            </AlertDescription>
          </Alert>
        ) : null}

        <Card className="shadow-lg border-0 rounded-2xl overflow-hidden bg-white dark:bg-gray-800">
          <CardContent className="bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-700 dark:to-blue-900 text-white p-6 lg:p-8">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="flex items-center gap-4 lg:gap-6">
                <Avatar className="h-12 w-12 lg:h-16 lg:w-16 ring-4 ring-white/30">
                  <AvatarFallback className="text-lg lg:text-xl bg-white/20 text-white font-bold">
                    {getInitials(user?.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">
                    {translatedFallback('welcome_back', 'Welcome back')}
                    {', '}
                    {user?.name || 'User'}
                    !
                  </h1>
                  <div className="flex flex-wrap items-center gap-3 text-white/90 text-sm">
                    <Badge className="bg-white/20 text-white border-white/30">{user?.rank || 'Member'}</Badge>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-300 fill-current" />
                      <span>{user?.rating || 'N/A'}</span>
                    </div>
                    <span>ID: {user?.id || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="w-full lg:w-auto lg:text-right space-y-2">
                <div>
                  <div className="text-2xl lg:text-3xl font-bold">{user?.coins || 0}</div>
                  <div className="text-white/80">{translatedFallback('total_coins', 'Total Coins')}</div>
                </div>
                <div className="text-sm text-white/75">
                  {translatedFallback('code', 'Code')}
                  {': '}
                  {user?.dailyCode || 'N/A'}
                </div>
                <div className="flex flex-wrap gap-2 lg:justify-end pt-1">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="bg-white/20 text-white hover:bg-white/30 border border-white/30"
                    onClick={() => setRetryNonce((value) => value + 1)}
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Refresh
                  </Button>
                  <Button asChild size="sm" variant="secondary" className="bg-white text-blue-700 hover:bg-blue-50">
                    <Link to="/add-post">Add Post</Link>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat) => {
            const IconComponent = stat.icon || TrendingUp;
            return (
              <Card
                key={stat.key}
                className="shadow-lg border-0 rounded-xl hover:shadow-xl transition-all duration-300 bg-white dark:bg-gray-800"
              >
                <CardContent className="p-4 lg:p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className={`p-2 lg:p-3 rounded-xl ${stat.bg || 'bg-blue-100'} dark:bg-opacity-20`}>
                      <IconComponent className={`w-5 h-5 lg:w-6 lg:h-6 ${stat.color || 'text-blue-600'}`} />
                    </div>
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 text-xs">
                      {translatedFallback(stat.trendKey, stat.trend || '+')}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-xl lg:text-2xl font-bold text-gray-800 dark:text-white mb-1">
                      {stat.value ?? 0}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {translatedFallback(stat.labelKey, stat.label || 'Metric')}
                    </div>
                  </div>
                  <Button asChild size="sm" variant="ghost" className="px-0 text-blue-600 dark:text-blue-300">
                    <Link to={stat.route}>
                      {stat.cta}
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="shadow-lg border-0 rounded-2xl overflow-hidden bg-white dark:bg-gray-800 h-full">
              <CardHeader className="bg-blue-500 dark:bg-blue-700 text-white">
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5" />
                  <span>{translatedFallback('recent_activity', 'Recent Activity')}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 lg:p-6">
                {recentActivity.length > 0 ? (
                  <div className="space-y-4">
                    {recentActivity.map((activity) => (
                      <div
                        key={activity.id || `${activity.title}-${activity.time}`}
                        className="flex items-center space-x-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-700 hover:shadow-md transition-all duration-300"
                      >
                        <div className="p-2 rounded-lg bg-white dark:bg-gray-600">
                          <TrendingUp className="w-5 h-5 text-blue-500 dark:text-blue-300" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-800 dark:text-white text-sm lg:text-base">
                            {activity.title}
                          </p>
                          <p className="text-xs lg:text-sm text-gray-600 dark:text-gray-300 flex items-center">
                            <Calendar className="w-3 h-3 mr-1" />
                            {activity.time}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 space-y-3">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No activity yet. Your recent posts and transactions will appear here.
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                      <Button asChild size="sm">
                        <Link to="/add-post">Create your first post</Link>
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <Link to="/offers">Review offers</Link>
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-lg border-0 rounded-2xl overflow-hidden bg-white dark:bg-gray-800">
            <CardHeader className="bg-gradient-to-r from-blue-400 to-blue-500 dark:from-blue-600 dark:to-blue-800 text-white">
              <CardTitle className="flex items-center space-x-2">
                <Trophy className="w-5 h-5" />
                <span>{translatedFallback('top_sellers_month', 'Top Sellers This Month')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 lg:p-6">
              <div className="space-y-4">
                {topSellers.length > 0 ? (
                  topSellers.map((seller) => (
                    <div
                      key={seller.rank}
                      className={`flex items-center justify-between p-3 lg:p-4 rounded-xl transition-all duration-300 ${
                        seller.isCurrentUser
                          ? 'bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-200 dark:border-blue-700 shadow-md'
                          : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                      }`}
                    >
                      <div className="flex items-center space-x-3 lg:space-x-4">
                        <div className="text-lg lg:text-2xl font-bold dark:text-white">{seller.badge}</div>
                        <div>
                          <p
                            className={`font-semibold text-sm lg:text-base ${
                              seller.isCurrentUser ? 'text-blue-600 dark:text-blue-300' : 'text-gray-800 dark:text-white'
                            }`}
                          >
                            {seller.name}
                            {seller.isCurrentUser ? ` (${translatedFallback('you', 'You')})` : ''}
                          </p>
                          <p className="text-xs lg:text-sm text-gray-600 dark:text-gray-300">
                            {seller.sales}
                            {' '}
                            {translatedFallback('sales', 'sales')}
                            {' | '}
                            {seller.coins}
                            {' '}
                            {translatedFallback('coins', 'coins')}
                          </p>
                        </div>
                      </div>
                      {seller.isCurrentUser ? (
                        <Badge className="bg-blue-500 text-white">{translatedFallback('you', 'You')}</Badge>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 space-y-3">
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      {translatedFallback('no_top_sellers', 'Leaderboard data is not available yet.')}
                    </p>
                    <Button asChild size="sm" variant="outline">
                      <Link to="/sold-posts">Open sold posts</Link>
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

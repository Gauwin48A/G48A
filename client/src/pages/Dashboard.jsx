import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  TrendingUp,
  Star,
  Trophy,
  Calendar
} from "lucide-react";
import GreenNavbar from '../components/GreenNavbar';
import { translateText } from '../utils/translateContent';

const Dashboard = () => {
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [quickStats, setQuickStats] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [topSellers, setTopSellers] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const currentLang = i18n.language || localStorage.getItem('mhub_language') || 'en';

  useEffect(() => {
    setLoading(true);
    const fetchDashboard = async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
        const token = localStorage.getItem('authToken');
        const userId = localStorage.getItem('userId') || 1;
        const res = await fetch(`${baseUrl}/api/dashboard?userId=${userId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          credentials: 'include'
        });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to fetch dashboard');
        }
        const data = await res.json();
        setUser(data.user || null);
        setQuickStats(data.quickStats || []);
        setTopSellers(data.topSellers || []);
        setError(null);

        // Translate activity titles if not English
        let activities = data.recentActivity || [];
        if (currentLang !== 'en' && activities.length > 0) {
          try {
            const translatedActivities = await Promise.all(
              activities.map(async (activity) => {
                const translatedTitle = await translateText(activity.title, currentLang);
                return {
                  ...activity,
                  title: translatedTitle
                };
              })
            );
            setRecentActivity(translatedActivities);
          } catch (e) {
            console.warn('Translation failed:', e);
            setRecentActivity(activities);
          }
        } else {
          setRecentActivity(activities);
        }
      } catch (err) {
        setError(err.message || 'Failed to fetch dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [currentLang]);

  // Check if user is logged in
  const isLoggedIn = localStorage.getItem('userId') && localStorage.getItem('authToken');

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-200 dark:from-gray-900 dark:to-gray-800 transition-colors duration-300">
        <div className="bg-white dark:bg-gray-800 border border-blue-200 dark:border-gray-700 rounded-3xl p-10 shadow-2xl text-center max-w-md">
          <div className="text-6xl mb-4">📊</div>
          <h2 className="text-3xl font-extrabold text-blue-700 dark:text-blue-400 mb-4">{t('your_dashboard')}</h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">{t('dashboard_login_msg')}</p>
          <div className="flex flex-col gap-3">
            <a href="/login" className="bg-blue-600 hover:bg-blue-700 text-white text-lg px-8 py-4 rounded-xl font-bold text-center">
              {t('login_to_continue')}
            </a>
            <a href="/signup" className="border border-blue-300 dark:border-blue-500 text-blue-600 dark:text-blue-400 text-lg px-8 py-4 rounded-xl font-semibold text-center hover:bg-blue-50 dark:hover:bg-gray-700">
              {t('create_account')}
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="flex items-center justify-center h-screen bg-white dark:bg-gray-900"><p className="text-gray-500 dark:text-gray-400">{t('loading')}</p></div>;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen flex-col gap-4 bg-white dark:bg-gray-900">
        <p className="text-red-500">{error}</p>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={() => window.location.reload()}
        >
          {t('retry')}
        </button>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <GreenNavbar />

      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Welcome Header */}
        <Card className="shadow-lg border-0 rounded-2xl overflow-hidden mb-8 bg-white dark:bg-gray-800">
          <CardContent className="bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-700 dark:to-blue-900 text-white p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
              <div className="flex items-center space-x-4 lg:space-x-6">
                <Avatar className="h-12 w-12 lg:h-16 lg:w-16 ring-4 ring-white/30">
                  <AvatarFallback className="text-lg lg:text-xl bg-white/20 text-white font-bold">
                    {(user?.name || 'U').split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">{t('welcome_back')}, {user?.name || 'User'}!</h1>
                  <div className="flex flex-wrap items-center gap-3 text-white/90">
                    <Badge className="bg-white/20 text-white border-white/30">{user?.rank || 'Member'}</Badge>
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-300 fill-current" />
                      <span>{user?.rating || 'N/A'}</span>
                    </div>
                    <span>•</span>
                    <span>ID: {user?.id || 'N/A'}</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 sm:mt-0 text-right">
                <div className="text-2xl lg:text-3xl font-bold text-white">{user?.coins || 0}</div>
                <div className="text-white/80">{t('total_coins')}</div>
                <div className="mt-2 text-sm text-white/70">{t('code')}: {user?.dailyCode || 'N/A'}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {quickStats.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <Card key={index} className="shadow-lg border-0 rounded-xl hover:shadow-xl transition-all duration-300 bg-white dark:bg-gray-800">
                <CardContent className="p-4 lg:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-2 lg:p-3 rounded-xl ${stat.bg} dark:bg-opacity-20`}>
                      {IconComponent && <IconComponent className={`w-5 h-5 lg:w-6 lg:h-6 ${stat.color}`} />}
                    </div>
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 text-xs">
                      {t(stat.trendKey || (stat.trend === '+Active' ? 'trend_active' : stat.trend === '+Sold' ? 'trend_sold' : stat.trend === '+Views' ? 'trend_views' : stat.trend === '+Coins' ? 'trend_coins' : 'trend_active')) || stat.trend}
                    </Badge>
                  </div>
                  <div className="text-xl lg:text-2xl font-bold text-gray-800 dark:text-white mb-1">{stat.value}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{t(stat.labelKey || stat.label.toLowerCase().replace(/ /g, '_'))}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <Card className="shadow-lg border-0 rounded-2xl overflow-hidden bg-white dark:bg-gray-800">
              <CardHeader className="bg-blue-500 dark:bg-blue-700 text-white">
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5" />
                  <span>{t('recent_activity')}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 lg:p-6">
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center space-x-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-700 hover:shadow-md transition-all duration-300"
                    >
                      <div className="p-2 rounded-lg bg-white dark:bg-gray-600">
                        <TrendingUp className="w-5 h-5 text-blue-500 dark:text-blue-300" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800 dark:text-white text-sm lg:text-base">{activity.title}</p>
                        <p className="text-xs lg:text-sm text-gray-600 dark:text-gray-300 flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {activity.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Sellers Leaderboard */}
          <Card className="shadow-lg border-0 rounded-2xl overflow-hidden bg-white dark:bg-gray-800">
            <CardHeader className="bg-gradient-to-r from-blue-400 to-blue-500 dark:from-blue-600 dark:to-blue-800 text-white">
              <CardTitle className="flex items-center space-x-2">
                <Trophy className="w-5 h-5" />
                <span>{t('top_sellers_month')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 lg:p-6">
              <div className="space-y-4">
                {topSellers.length > 0 ? (
                  topSellers.map((seller) => (
                    <div
                      key={seller.rank}
                      className={`flex items-center justify-between p-3 lg:p-4 rounded-xl transition-all duration-300 ${seller.isCurrentUser
                        ? 'bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-200 dark:border-blue-700 shadow-md'
                        : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                        }`}
                    >
                      <div className="flex items-center space-x-3 lg:space-x-4">
                        <div className="text-lg lg:text-2xl font-bold dark:text-white">{seller.badge}</div>
                        <div>
                          <p className={`font-semibold text-sm lg:text-base ${seller.isCurrentUser ? 'text-blue-600 dark:text-blue-300' : 'text-gray-800 dark:text-white'}`}>
                            {seller.name} {seller.isCurrentUser && `(${t('you')})`}
                          </p>
                          <p className="text-xs lg:text-sm text-gray-600 dark:text-gray-300">{seller.sales} {t('sales')} • {seller.coins} {t('coins')}</p>
                        </div>
                      </div>
                      {seller.isCurrentUser && (
                        <Badge className="bg-blue-500 text-white">{t('you')}</Badge>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">{t('no_top_sellers')}</p>
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

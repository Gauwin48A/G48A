import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  TrendingUp, 
  Star, 
  Trophy,
  Calendar
} from "lucide-react";
import Navbar from '../components/Navbar';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [quickStats, setQuickStats] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [topSellers, setTopSellers] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

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
        setRecentActivity(data.recentActivity || []);
        setTopSellers(data.topSellers || []);
        setError(null);
      } catch (err) {
        setError(err.message || 'Failed to fetch dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-screen"><p className="text-gray-500">Loading...</p></div>;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen flex-col gap-4">
        <p className="text-red-500">{error}</p>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Welcome Header */}
        <Card className="shadow-lg border-0 rounded-2xl overflow-hidden mb-8">
          <CardContent className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
              <div className="flex items-center space-x-4 lg:space-x-6">
                <Avatar className="h-12 w-12 lg:h-16 lg:w-16 ring-4 ring-white/30">
                  <AvatarFallback className="text-lg lg:text-xl bg-white/20 text-white font-bold">
                    {user.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">Welcome back, {user.name}!</h1>
                  <div className="flex flex-wrap items-center gap-3 text-white/90">
                    <Badge className="bg-white/20 text-white border-white/30">{user.rank}</Badge>
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-300 fill-current" />
                      <span>{user.rating}</span>
                    </div>
                    <span>•</span>
                    <span>ID: {user.id}</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 sm:mt-0 text-right">
                <div className="text-2xl lg:text-3xl font-bold text-white">{user.coins}</div>
                <div className="text-white/80">Total Coins</div>
                <div className="mt-2 text-sm text-white/70">Code: {user.dailyCode}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {quickStats.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <Card key={index} className="shadow-lg border-0 rounded-xl hover:shadow-xl transition-all duration-300">
                <CardContent className="p-4 lg:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-2 lg:p-3 rounded-xl ${stat.bg}`}>
                      {IconComponent && <IconComponent className={`w-5 h-5 lg:w-6 lg:h-6 ${stat.color}`} />}
                    </div>
                    <Badge className="bg-green-100 text-green-800 text-xs">
                      {stat.trend}
                    </Badge>
                  </div>
                  <div className="text-xl lg:text-2xl font-bold text-gray-800 mb-1">{stat.value}</div>
                  <div className="text-sm text-gray-600">{stat.label}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <Card className="shadow-lg border-0 rounded-2xl overflow-hidden">
              <CardHeader className="bg-blue-500 text-white">
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5" />
                  <span>Recent Activity</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 lg:p-6">
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div 
                      key={activity.id} 
                      className="flex items-center space-x-4 p-4 rounded-xl bg-gray-50 hover:shadow-md transition-all duration-300"
                    >
                      <div className="p-2 rounded-lg bg-white">
                        <TrendingUp className="w-5 h-5 text-blue-500" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800 text-sm lg:text-base">{activity.title}</p>
                        <p className="text-xs lg:text-sm text-gray-600 flex items-center">
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
          <Card className="shadow-lg border-0 rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-400 to-blue-500 text-white">
              <CardTitle className="flex items-center space-x-2">
                <Trophy className="w-5 h-5" />
                <span>Top Sellers This Month</span>
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
                          ? 'bg-blue-50 border-2 border-blue-200 shadow-md' 
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center space-x-3 lg:space-x-4">
                        <div className="text-lg lg:text-2xl font-bold">{seller.badge}</div>
                        <div>
                          <p className={`font-semibold text-sm lg:text-base ${seller.isCurrentUser ? 'text-blue-600' : 'text-gray-800'}`}>
                            {seller.name} {seller.isCurrentUser && '(You)'}
                          </p>
                          <p className="text-xs lg:text-sm text-gray-600">{seller.sales} sales • {seller.coins} coins</p>
                        </div>
                      </div>
                      {seller.isCurrentUser && (
                        <Badge className="bg-blue-500 text-white">You</Badge>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">No top sellers available</p>
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

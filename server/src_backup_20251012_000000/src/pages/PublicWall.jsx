
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Star, Medal, Crown, Shield, TrendingUp } from "lucide-react";

const PublicWall = () => {
  const [topSellers, setTopSellers] = useState([]);
  const [topBuyers, setTopBuyers] = useState([]);
  const [topUsers, setTopUsers] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    setLoading(true);
    fetch('http://localhost:5000/api/publicwall')
      .then(res => res.json())
      .then(data => {
        setTopSellers(data.topSellers || []);
        setTopBuyers(data.topBuyers || []);
        setTopUsers(data.topUsers || []);
        setError(null);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Failed to fetch public wall data');
        setLoading(false);
      });
  }, []);

  const getRankIcon = (rank) => {
    switch (rank) {
      case 'Gold': return <Crown className="w-5 h-5 text-yellow-500" />;
      case 'Silver': return <Medal className="w-5 h-5 text-gray-400" />;
      case 'Bronze': return <Trophy className="w-5 h-5 text-amber-600" />;
      default: return <Star className="w-5 h-5 text-gray-400" />;
    }
  };

  const getRankColor = (rank) => {
    switch (rank) {
      case 'Gold': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Silver': return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'Bronze': return 'bg-amber-100 text-amber-800 border-amber-300';
      default: return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center space-x-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center">
              <Trophy className="w-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Public Wall</h1>
              <p className="text-gray-600 text-lg">Celebrating our top performers</p>
            </div>
          </div>
          <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-2xl p-6 inline-block">
            <h2 className="text-2xl font-bold mb-2">🏆 Monthly Champions 🏆</h2>
            <p className="text-sky-100">Recognition for outstanding contribution to our community</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Top Sellers */}
          <Card className="shadow-xl border-0 rounded-3xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-600 text-white text-center py-8">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold">🥇 Top Sellers</CardTitle>
              <CardDescription className="text-green-100 text-lg">
                Outstanding sales performance
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <div className="space-y-6">
                {topSellers.map((seller, index) => (
                  <div key={seller.id} className="flex items-center space-x-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl">
                    <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl text-white font-bold text-lg">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-bold text-gray-900">{seller.name}</h4>
                        {seller.verified && <Shield className="w-4 h-4 text-green-600" />}
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge className={`border ${getRankColor(seller.rank)}`}>
                          <div className="flex items-center space-x-1">
                            {getRankIcon(seller.rank)}
                            <span>{seller.rank}</span>
                          </div>
                        </Badge>
                        <div className="flex items-center space-x-1">
                          <Star className="w-4 h-4 text-yellow-500 fill-current" />
                          <span className="text-sm font-medium">{seller.rating}</span>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {seller.sales} sales • {seller.coins} coins
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Buyers */}
          <Card className="shadow-xl border-0 rounded-3xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-center py-8">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold">🥈 Top Buyers</CardTitle>
              <CardDescription className="text-blue-100 text-lg">
                Most active purchasers
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <div className="space-y-6">
                {topBuyers.map((buyer, index) => (
                  <div key={buyer.id} className="flex items-center space-x-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl">
                    <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl text-white font-bold text-lg">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-bold text-gray-900">{buyer.name}</h4>
                        {buyer.verified && <Shield className="w-4 h-4 text-blue-600" />}
                      </div>
                      <div className="flex items-center space-x-1 mt-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        <span className="text-sm font-medium">{buyer.rating}</span>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {buyer.purchases} purchases • {buyer.coins} coins
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Users Overall */}
          <Card className="shadow-xl border-0 rounded-3xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-600 text-white text-center py-8">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Crown className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold">🥉 Top Users</CardTitle>
              <CardDescription className="text-purple-100 text-lg">
                Highest coin earners
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <div className="space-y-6">
                {topUsers.map((user, index) => (
                  <div key={user.id} className="flex items-center space-x-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl">
                    <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl text-white font-bold text-lg">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900">{user.name}</h4>
                      <Badge className="bg-purple-100 text-purple-800 border-purple-300 mt-1">
                        Level {user.level}
                      </Badge>
                      <div className="text-sm text-gray-600 mt-1">
                        {user.totalCoins} coins • {user.badge}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Stats */}
        <Card className="mt-8 shadow-xl border-0 rounded-3xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-sky-500 to-blue-600 text-white text-center py-8">
            <CardTitle className="text-2xl font-bold">📊 This Month's Statistics</CardTitle>
            <CardDescription className="text-sky-100 text-lg">
              Platform performance overview
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl">
                <div className="text-3xl font-bold text-green-600">127</div>
                <div className="text-gray-600 font-medium">Total Sales</div>
              </div>
              <div className="text-center p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl">
                <div className="text-3xl font-bold text-blue-600">89</div>
                <div className="text-gray-600 font-medium">Active Buyers</div>
              </div>
              <div className="text-center p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl">
                <div className="text-3xl font-bold text-purple-600">₹2.3M</div>
                <div className="text-gray-600 font-medium">Total Volume</div>
              </div>
              <div className="text-center p-6 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl">
                <div className="text-3xl font-bold text-yellow-600">95%</div>
                <div className="text-gray-600 font-medium">Success Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PublicWall;

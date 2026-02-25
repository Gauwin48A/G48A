import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Copy, Gift, Star, Trophy, Users, Zap, TrendingUp,
  Calendar, Share2, Award, Crown, Sparkles, Target
} from "lucide-react";
import api from '../lib/api';
import { useTranslation } from 'react-i18next';
import { useToast } from "@/hooks/use-toast";

const Rewards = () => {
  const [user, setUser] = useState(null);
  const [referralChain, setReferralChain] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("overview");
  const { t } = useTranslation();
  const { toast } = useToast();

  useEffect(() => {
    let userId = localStorage.getItem('userId');
    let token = localStorage.getItem('authToken');
    if (!userId || !token) {
      setError('You must be logged in to view rewards.');
      setLoading(false);
      return;
    }
    const fetchRewards = async () => {
      setLoading(true);
      try {
        const data = await api.get(`/rewards?userId=${userId}`);
        if (data) {
          setUser(data.user || null);
          setReferralChain(data.referralChain || []);
        }
      } catch (err) {
        setError(err.message || 'Failed to fetch rewards');
      } finally {
        setLoading(false);
      }
    };
    fetchRewards();
  }, []);

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copied!`, description: text });
  };

  const shareReferral = () => {
    const url = `${window.location.origin}/signup?ref=${user?.referralCode}`;
    if (navigator.share) {
      navigator.share({ title: 'Join MHub!', text: 'Use my referral code', url });
    } else {
      copyToClipboard(url, 'Referral link');
    }
  };

  const isLoggedIn = localStorage.getItem('userId') && localStorage.getItem('authToken');

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-10 shadow-2xl text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
            <Gift className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">{t('rewards_referrals')}</h2>
          <p className="text-white/80 text-lg mb-8">{t('earn_coins_unlock_rewards')}</p>
          <div className="flex flex-col gap-3">
            <a href="/login" className="bg-white text-indigo-600 text-lg px-8 py-4 rounded-xl font-bold hover:bg-white/90 transition">{t('login_to_continue')}</a>
            <a href="/signup" className="border-2 border-white/50 text-white text-lg px-8 py-4 rounded-xl font-semibold hover:bg-white/10 transition">{t('create_account')}</a>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-100">
        <div className="text-center p-8">
          <div className="text-6xl mb-4">😕</div>
          <p className="text-red-500 text-xl mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const progressPercentage = Math.min((user.xpCurrent / user.xpRequired) * 100, 100);
  const rankColors = {
    'Bronze': 'from-amber-600 to-amber-800',
    'Silver': 'from-gray-400 to-gray-600',
    'Gold': 'from-yellow-400 to-yellow-600',
    'Platinum': 'from-cyan-400 to-cyan-600',
    'Diamond': 'from-purple-400 to-pink-500'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900" style={{ paddingBottom: '180px' }}>
      {/* Premium Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500" />
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />

        <div className="relative max-w-5xl mx-auto px-4 py-12 sm:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* User Info */}
            <div className="flex items-center gap-5">
              <div className="relative">
                <Avatar className="h-20 w-20 ring-4 ring-white/30 shadow-xl">
                  <AvatarFallback className={`text-2xl font-bold text-white bg-gradient-to-br ${rankColors[user.rank] || 'from-blue-500 to-indigo-600'}`}>
                    {user.name?.split(' ').map(n => n[0]).join('') || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-lg">
                  <Crown className="w-5 h-5 text-yellow-500" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">{user.name}</h1>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={`bg-gradient-to-r ${rankColors[user.rank] || 'from-blue-500 to-indigo-600'} text-white border-0 shadow-lg`}>
                    <Trophy className="w-3 h-3 mr-1" /> {user.rank}
                  </Badge>
                  <Badge className="bg-white/20 text-white border-0">Level {user.level}</Badge>
                </div>
              </div>
            </div>

            {/* XP Progress */}
            <div className="w-full md:w-64">
              <div className="flex justify-between text-white/80 text-sm mb-2">
                <span>XP Progress</span>
                <span>{user.xpCurrent} / {user.xpRequired}</span>
              </div>
              <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full transition-all duration-500" style={{ width: `${progressPercentage}%` }} />
              </div>
              <p className="text-white/60 text-xs mt-1">{Math.round(user.xpRequired - user.xpCurrent)} XP to next level</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-5xl mx-auto px-4 -mt-8 mb-8 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-white dark:bg-gray-800 border-0 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
            <CardContent className="p-5 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <p className="text-3xl font-bold text-gray-800 dark:text-white">{user.totalCoins}</p>
              <p className="text-sm text-gray-500">{t('total_coins')}</p>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-gray-800 border-0 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
            <CardContent className="p-5 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <p className="text-3xl font-bold text-gray-800 dark:text-white">{user.totalReferrals}</p>
              <p className="text-sm text-gray-500">{t('total_referrals')}</p>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-gray-800 border-0 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
            <CardContent className="p-5 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <p className="text-3xl font-bold text-gray-800 dark:text-white">{user.streak}</p>
              <p className="text-sm text-gray-500">{t('day_streak')} 🔥</p>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-gray-800 border-0 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
            <CardContent className="p-5 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                <Award className="w-6 h-6 text-white" />
              </div>
              <p className="text-3xl font-bold text-gray-800 dark:text-white">{user.successfulRefs}</p>
              <p className="text-sm text-gray-500">{t('verified_refs')}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 pb-12">
        {/* Referral & Secret Code Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Referral Code Card */}
          <Card className="bg-gradient-to-br from-indigo-600 to-purple-700 border-0 shadow-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Gift className="w-5 h-5" /> {t('your_referral_code')}
                </h3>
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={() => copyToClipboard(user.referralCode, 'Referral code')}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <div className="text-4xl font-bold text-white mb-4 tracking-wider">{user.referralCode}</div>
              <p className="text-white/70 text-sm mb-4">{t('share_earn_coins', { amount: 50 })}</p>
              <Button onClick={shareReferral} className="w-full bg-white text-indigo-600 hover:bg-white/90 font-bold">
                <Share2 className="w-4 h-4 mr-2" /> {t('share_now')}
              </Button>
            </CardContent>
          </Card>

          {/* Daily Secret Code Card */}
          <Card className="bg-gradient-to-br from-amber-500 to-orange-600 border-0 shadow-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5" /> {t('daily_secret_code')}
                </h3>
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={() => copyToClipboard(user.dailySecretCode, 'Secret code')}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <div className="text-4xl font-bold text-white mb-4 tracking-wider">{user.dailySecretCode}</div>
              <p className="text-white/70 text-sm mb-2">{t('required_for_sale')}</p>
              <div className="flex items-center gap-2 text-white/80">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">Expires in 12h 30m</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs Section */}
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="w-full flex bg-white dark:bg-gray-800 rounded-2xl p-1 shadow-lg mb-6">
            <TabsTrigger value="overview" className="flex-1 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-600 data-[state=active]:text-white py-3 font-semibold">
              {t('overview')}
            </TabsTrigger>
            <TabsTrigger value="referrals" className="flex-1 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-600 data-[state=active]:text-white py-3 font-semibold">
              {t('referrals')}
            </TabsTrigger>
            <TabsTrigger value="milestones" className="flex-1 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-600 data-[state=active]:text-white py-3 font-semibold">
              {t('milestones')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card className="bg-white dark:bg-gray-800 border-0 shadow-xl rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-indigo-600" /> {t('daily_challenges')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { title: t('share_a_post'), reward: 10, completed: true },
                  { title: t('invite_a_friend'), reward: 50, completed: false },
                  { title: t('complete_your_profile'), reward: 25, completed: true },
                  { title: t('make_a_sale'), reward: 100, completed: false },
                ].map((challenge, i) => (
                  <div key={i} className={`flex items-center justify-between p-4 rounded-xl ${challenge.completed ? 'bg-green-50 dark:bg-green-900/20' : 'bg-gray-50 dark:bg-gray-700'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${challenge.completed ? 'bg-green-500' : 'bg-gray-300'}`}>
                        {challenge.completed ? <span className="text-white">✓</span> : <span className="text-gray-500">{i + 1}</span>}
                      </div>
                      <span className={challenge.completed ? 'line-through text-gray-400' : 'text-gray-700 dark:text-white font-medium'}>{challenge.title}</span>
                    </div>
                    <Badge className={challenge.completed ? 'bg-green-100 text-green-700' : 'bg-indigo-100 text-indigo-700'}>
                      +{challenge.reward} {t('coins')}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="referrals">
            <Card className="bg-white dark:bg-gray-800 border-0 shadow-xl rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" /> {t('your_referrals')} ({referralChain.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {referralChain.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">👥</div>
                    <p className="text-gray-500 mb-4">{t('no_referrals_yet')}</p>
                    <Button onClick={shareReferral} className="bg-gradient-to-r from-indigo-500 to-purple-600">
                      <Share2 className="w-4 h-4 mr-2" /> {t('share_your_code')}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {referralChain.map((r, i) => (
                      <div key={r.id} className={`flex items-center justify-between p-4 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition ${r.type === 'direct' ? 'bg-green-50 dark:bg-green-900/20' : 'bg-blue-50 dark:bg-blue-900/20'}`}>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className={`text-white font-bold ${r.type === 'direct' ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gradient-to-br from-blue-500 to-indigo-600'}`}>
                              {r.name?.split(' ').map(n => n[0]).join('') || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold text-gray-800 dark:text-white">{r.name}</p>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span>Joined {r.joinDate}</span>
                              {r.type === 'indirect' && r.depth && <span className="text-blue-500">• Level {r.depth}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge className={`font-bold ${r.type === 'direct' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>+{r.coins} coins</Badge>
                          <span className={`text-xs ${r.type === 'direct' ? 'text-green-600' : 'text-blue-600'}`}>{r.type === 'direct' ? 'Direct' : 'Indirect'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="milestones">
            <Card className="bg-white dark:bg-gray-800 border-0 shadow-xl rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500" /> Milestones & Achievements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { icon: '🎯', title: 'First Sale', unlocked: true },
                    { icon: '👥', title: '5 Referrals', unlocked: false },
                    { icon: '🔥', title: '7 Day Streak', unlocked: true },
                    { icon: '💎', title: 'Premium User', unlocked: false },
                    { icon: '⭐', title: 'Top Seller', unlocked: false },
                    { icon: '🏆', title: 'Gold Rank', unlocked: false },
                  ].map((m, i) => (
                    <div key={i} className={`p-4 rounded-xl text-center ${m.unlocked ? 'bg-gradient-to-br from-yellow-50 to-amber-100 border-2 border-yellow-300' : 'bg-gray-100 dark:bg-gray-700 opacity-60'}`}>
                      <div className="text-4xl mb-2">{m.icon}</div>
                      <p className={`font-semibold ${m.unlocked ? 'text-yellow-700' : 'text-gray-500'}`}>{m.title}</p>
                      {m.unlocked && <Badge className="bg-yellow-400 text-yellow-900 text-xs mt-2">Unlocked!</Badge>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Rewards;

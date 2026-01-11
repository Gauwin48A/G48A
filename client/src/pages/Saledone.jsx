import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, Shield, Clock, Award, Star, ArrowLeft, ArrowUp, Sparkles, PartyPopper, Trophy, Gift } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

import { useTranslation } from 'react-i18next';
import PageHeader from '../components/PageHeader';

const Saledone = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [sellerForm, setSellerForm] = useState({
    postId: '',
    buyerId: '',
    buyerSecretCode: '',
    saleAmount: ''
  });
  const [buyerForm, setBuyerForm] = useState({
    postId: '',
    sellerId: '',
    sellerSecretCode: '',
    confirmationCode: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationType, setConfirmationType] = useState('');

  // Scroll handler
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const completedSales = [
    {
      id: "SALE001",
      postTitle: t('sample_iphone_title') || "iPhone 14 Pro Max 128GB",
      buyer: t('sample_buyer_1') || "Priya Singh",
      seller: t('sample_seller_1') || "Rahul Sharma",
      amount: 95000,
      completedDate: "2024-01-20",
      rating: 5,
      feedback: t('sample_feedback_1') || "Great seller, product as described!"
    },
    {
      id: "SALE002",
      postTitle: t('sample_samsung_title') || "Samsung Galaxy S23 Ultra",
      buyer: t('sample_buyer_2') || "Amit Kumar",
      seller: t('sample_seller_2') || "Sneha Patel",
      amount: 75000,
      completedDate: "2024-01-18",
      rating: 4,
      feedback: t('sample_feedback_2') || "Good condition, fast delivery"
    },
    {
      id: "SALE003",
      postTitle: t('sample_macbook_title') || "MacBook Pro M2",
      buyer: t('sample_buyer_3') || "Vikram Reddy",
      seller: t('sample_seller_3') || "Neha Gupta",
      amount: 145000,
      completedDate: "2024-01-15",
      rating: 5,
      feedback: t('sample_feedback_3') || "Excellent quality, highly recommend!"
    }
  ];

  const handleSellerSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      setConfirmationType('seller');
      setShowConfirmation(true);
      toast({
        title: "🎉 " + t('sale_confirmation_initiated'),
        description: t('buyer_will_be_notified')
      });
    }, 1500);
  };

  const handleBuyerSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      setConfirmationType('buyer');
      setShowConfirmation(true);
      toast({
        title: "✅ " + t('sale_confirmed_successfully'),
        description: t('both_parties_verified')
      });
    }, 1500);
  };

  const resetForms = () => {
    setSellerForm({ postId: '', buyerId: '', buyerSecretCode: '', saleAmount: '' });
    setBuyerForm({ postId: '', sellerId: '', sellerSecretCode: '', confirmationCode: '' });
    setShowConfirmation(false);
    setConfirmationType('');
  };

  // Success confirmation screen with celebration
  if (showConfirmation) {
    return (
      <div className="bg-gradient-to-br from-emerald-400 via-green-500 to-teal-600 relative" style={{ minHeight: '100vh', paddingBottom: '120px' }}>
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-yellow-300/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          {/* Floating confetti */}
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-3 h-3 rotate-45"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                backgroundColor: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'][i % 5],
                animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 2}s`
              }}
            ></div>
          ))}
        </div>

        <div className="relative max-w-2xl mx-auto p-6 pt-20">
          <Card className="shadow-2xl border-0 rounded-3xl overflow-hidden backdrop-blur-xl bg-white/95 dark:bg-gray-800/95">
            <CardContent className="p-12 text-center">
              {/* Success Icon with animation */}
              <div className="relative inline-block mb-8">
                <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-25"></div>
                <div className="relative w-32 h-32 mx-auto bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center shadow-2xl">
                  <CheckCircle className="w-16 h-16 text-white" />
                </div>
                <PartyPopper className="absolute -top-2 -right-2 w-10 h-10 text-yellow-500 animate-bounce" />
                <Gift className="absolute -bottom-2 -left-2 w-8 h-8 text-pink-500 animate-bounce delay-150" />
              </div>

              <h2 className="text-4xl font-black bg-gradient-to-r from-green-600 to-emerald-700 bg-clip-text text-transparent mb-4">
                🎉 {t('sale_confirmed')}
              </h2>

              <p className="text-gray-600 text-xl mb-8 max-w-md mx-auto">
                {confirmationType === 'seller'
                  ? t('buyer_notified')
                  : t('both_verified')}
              </p>

              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 mb-8 border border-green-200">
                <div className="flex items-center justify-center gap-6">
                  <div className="text-center">
                    <Trophy className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-green-700">+50</p>
                    <p className="text-sm text-gray-500">{t('trust_points')}</p>
                  </div>
                  <div className="w-px h-16 bg-green-200"></div>
                  <div className="text-center">
                    <Star className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-green-700">5.0</p>
                    <p className="text-sm text-gray-500">{t('rating_boost')}</p>
                  </div>
                  <div className="w-px h-16 bg-green-200"></div>
                  <div className="text-center">
                    <Award className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-green-700">{t('verified')}</p>
                    <p className="text-sm text-gray-500">{t('seller_badge')}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  variant="outline"
                  onClick={resetForms}
                  className="border-2 border-green-500 text-green-600 hover:bg-green-50 rounded-xl px-8 py-3 font-semibold"
                >
                  {t('confirm_another_sale')}
                </Button>
                <Button
                  className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-xl px-8 py-3 font-semibold shadow-lg"
                  onClick={() => navigate('/my-home')}
                >
                  {t('go_to_my_home')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0) rotate(45deg); }
            50% { transform: translateY(-20px) rotate(45deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-slate-900 dark:via-green-900 dark:to-emerald-900 relative" style={{ minHeight: '100vh', paddingBottom: '120px' }}>
      {/* Animated background */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-green-500/10 dark:bg-green-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-teal-500/5 dark:bg-teal-500/10 rounded-full blur-3xl"></div>
      </div>

      <PageHeader
        transparent={true}
        backTo="/profile"
        className="text-white"
        title=""
      />

      <div className="relative max-w-lg mx-auto p-4 sm:p-6 space-y-6">
        {/* Premium Header */}
        <div className="text-center pt-4">

          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-600 shadow-2xl shadow-green-500/30 mb-6">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>

          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-white mb-3">
            {t('sale')} <span className="bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400 bg-clip-text text-transparent">{t('confirmation')}</span>
          </h1>
          <p className="text-green-700 dark:text-green-200 text-lg max-w-md mx-auto">
            {t('complete_dual_verification')}
          </p>
        </div>

        {/* Trust Badges */}
        <div className="flex flex-wrap justify-center gap-3">
          <Badge className="bg-green-500/10 dark:bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/20 dark:border-green-500/30 px-4 py-2 rounded-full backdrop-blur-sm">
            <Shield className="w-4 h-4 mr-2" /> {t('secure_verification')}
          </Badge>
          <Badge className="bg-blue-500/10 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/20 dark:border-blue-500/30 px-4 py-2 rounded-full backdrop-blur-sm">
            <Clock className="w-4 h-4 mr-2" /> {t('24h_validity')}
          </Badge>
          <Badge className="bg-purple-500/10 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/20 dark:border-purple-500/30 px-4 py-2 rounded-full backdrop-blur-sm">
            <Award className="w-4 h-4 mr-2" /> {t('earn_trust_points')}
          </Badge>
        </div>

        {/* Main Form Card */}
        <Card className="shadow-2xl border-0 rounded-3xl overflow-hidden backdrop-blur-xl bg-white/95 dark:bg-gray-800/95">
          <CardHeader className="bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 text-white p-8">
            <CardTitle className="flex items-center space-x-3 text-2xl">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <Shield className="w-6 h-6" />
              </div>
              <span>{t('dual_verification_process')}</span>
            </CardTitle>
            <CardDescription className="text-green-100 text-base mt-2">
              {t('dual_verification_desc')}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-8">
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/30 dark:to-yellow-900/30 border border-amber-200 dark:border-amber-700 rounded-xl p-4 mb-6">
              <p className="text-amber-800 dark:text-amber-300 text-sm font-medium mb-2">💡 Where to find IDs:</p>
              <ul className="text-amber-700 dark:text-amber-400 text-sm space-y-1">
                <li>• <strong>Post ID</strong>: Go to <a href="/my-home" className="underline hover:text-amber-900">My Home</a> → Each post shows its ID with a copy button</li>
                <li>• <strong>User ID</strong>: Go to <a href="/profile" className="underline hover:text-amber-900">Profile</a> → Your ID is displayed at the top of Personal Info</li>
              </ul>
            </div>

            <Tabs defaultValue="seller" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-8 bg-gray-100 dark:bg-gray-700 rounded-2xl p-1.5 h-14">
                <TabsTrigger value="seller" className="rounded-xl text-base font-semibold data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white transition-all">
                  🏪 {t('im_the_seller')}
                </TabsTrigger>
                <TabsTrigger value="buyer" className="rounded-xl text-base font-semibold data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white transition-all">
                  🛒 {t('im_the_buyer')}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="seller">
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 border-2 border-green-200 dark:border-green-700 rounded-2xl p-6 mb-8">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-800 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="font-bold text-green-800 dark:text-green-300 text-lg mb-2">{t('seller_instructions')}</p>
                      <ul className="space-y-2 text-green-700 dark:text-green-400">
                        <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Enter your Post ID and Buyer's User ID</li>
                        <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Ask buyer for their daily secret code</li>
                        <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Buyer will receive notification to confirm</li>
                        <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Both parties must verify within 24 hours</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSellerSubmit} className="space-y-6">
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="postId" className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-2 block">Post ID</Label>
                      <Input
                        id="postId"
                        value={sellerForm.postId}
                        onChange={(e) => setSellerForm({ ...sellerForm, postId: e.target.value })}
                        placeholder="e.g., POST-12345"
                        className="h-14 text-lg rounded-xl border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-green-500 transition-colors"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="buyerId" className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-2 block">{t('buyers_user_id')}</Label>
                      <Input
                        id="buyerId"
                        value={sellerForm.buyerId}
                        onChange={(e) => setSellerForm({ ...sellerForm, buyerId: e.target.value })}
                        placeholder="e.g., USER-67890"
                        className="h-14 text-lg rounded-xl border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-green-500 transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="buyerCode" className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-2 block">{t('buyers_secret_code')}</Label>
                      <Input
                        id="buyerCode"
                        value={sellerForm.buyerSecretCode}
                        onChange={(e) => setSellerForm({ ...sellerForm, buyerSecretCode: e.target.value })}
                        placeholder={t('ask_buyer_for_code')}
                        className="h-14 text-lg rounded-xl border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-green-500 transition-colors"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="amount" className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-2 block">{t('sale_amount')} (₹)</Label>
                      <Input
                        id="amount"
                        type="number"
                        value={sellerForm.saleAmount}
                        onChange={(e) => setSellerForm({ ...sellerForm, saleAmount: e.target.value })}
                        placeholder={t('eg_50000') || 'e.g., 50000'}
                        className="h-14 text-lg rounded-xl border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-green-500 transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-16 text-lg font-bold bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-2xl shadow-xl shadow-green-500/30 transition-all hover:shadow-green-500/50 hover:scale-[1.02]"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-3">
                        <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                        {t('verifying')}
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <CheckCircle className="w-6 h-6" />
                        {t('initiate_sale_confirmation')}
                      </span>
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="buyer">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border-2 border-blue-200 dark:border-blue-700 rounded-2xl p-6 mb-8">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-800 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="font-bold text-blue-800 dark:text-blue-300 text-lg mb-2">{t('buyer_instructions')}</p>
                      <ul className="space-y-2 text-blue-700 dark:text-blue-400">
                        <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Enter the Post ID and Seller's User ID</li>
                        <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Enter seller's daily secret code</li>
                        <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Use the confirmation code from notification</li>
                        <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Sale completes when both verify</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleBuyerSubmit} className="space-y-6">
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="buyerPostId" className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-2 block">Post ID</Label>
                      <Input
                        id="buyerPostId"
                        value={buyerForm.postId}
                        onChange={(e) => setBuyerForm({ ...buyerForm, postId: e.target.value })}
                        placeholder="e.g., POST-12345"
                        className="h-14 text-lg rounded-xl border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-blue-500 transition-colors"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="sellerId" className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-2 block">{t('sellers_user_id')}</Label>
                      <Input
                        id="sellerId"
                        value={buyerForm.sellerId}
                        onChange={(e) => setBuyerForm({ ...buyerForm, sellerId: e.target.value })}
                        placeholder="e.g., USER-12345"
                        className="h-14 text-lg rounded-xl border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-blue-500 transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="sellerCode" className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-2 block">{t('sellers_secret_code')}</Label>
                      <Input
                        id="sellerCode"
                        value={buyerForm.sellerSecretCode}
                        onChange={(e) => setBuyerForm({ ...buyerForm, sellerSecretCode: e.target.value })}
                        placeholder="Ask seller for code"
                        className="h-14 text-lg rounded-xl border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-blue-500 transition-colors"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="confirmCode" className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-2 block">{t('confirmation_code')}</Label>
                      <Input
                        id="confirmCode"
                        value={buyerForm.confirmationCode}
                        onChange={(e) => setBuyerForm({ ...buyerForm, confirmationCode: e.target.value })}
                        placeholder="From notification"
                        className="h-14 text-lg rounded-xl border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-blue-500 transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-16 text-lg font-bold bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 rounded-2xl shadow-xl shadow-blue-500/30 transition-all hover:shadow-blue-500/50 hover:scale-[1.02]"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-3">
                        <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                        {t('confirming')}
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <CheckCircle className="w-6 h-6" />
                        {t('confirm_purchase')}
                      </span>
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Completed Sales History */}
        <Card className="shadow-2xl border-0 rounded-3xl overflow-hidden backdrop-blur-xl bg-white/95 dark:bg-gray-800/95">
          <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6">
            <CardTitle className="flex items-center space-x-3 text-xl">
              <Trophy className="w-6 h-6" />
              <span>{t('recent_completed_sales')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {completedSales.map((sale, index) => (
                <div
                  key={sale.id}
                  className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-600/50 rounded-2xl p-5 border border-gray-200 dark:border-gray-600 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-green-100 text-green-700 font-mono">{sale.id}</Badge>
                        <Badge className="bg-yellow-100 text-yellow-700">
                          {'⭐'.repeat(sale.rating)}
                        </Badge>
                      </div>
                      <h4 className="font-bold text-gray-900 dark:text-white text-lg">{sale.postTitle}</h4>
                      <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                        {sale.seller} → {sale.buyer}
                      </p>
                      <p className="text-gray-600 dark:text-gray-300 text-sm mt-2 italic">"{sale.feedback}"</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-600">₹{sale.amount.toLocaleString()}</p>
                      <p className="text-xs text-gray-400">{sale.completedDate}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scroll to Top Button */}
      {
        showScrollTop && (
          <button
            onClick={scrollToTop}
            className="fixed bottom-24 right-6 w-14 h-14 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full shadow-2xl shadow-green-500/40 flex items-center justify-center hover:scale-110 transition-all z-50 animate-bounce"
          >
            <ArrowUp className="w-6 h-6" />
          </button>
        )
      }
    </div >
  );
};

export default Saledone;
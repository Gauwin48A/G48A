import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, Shield, Clock, ArrowLeft, XCircle, RefreshCw, Package, ArrowUp, Sparkles, AlertTriangle, HelpCircle, CheckCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

import { useTranslation } from 'react-i18next';
import PageHeader from '../components/PageHeader';

const SaleUndone = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [form, setForm] = useState({
    postId: '',
    reason: '',
    description: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [undonePosts, setUndonePosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

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

  // Fetch undone posts on mount
  useEffect(() => {
    const fetchUndonePosts = async () => {
      try {
        const userId = localStorage.getItem('userId');
        const token = localStorage.getItem('authToken');
        if (!userId || !token) {
          setLoadingPosts(false);
          return;
        }

        const res = await fetch(`${baseUrl}/api/transactions/undone?userId=${userId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });

        if (res.ok) {
          const data = await res.json();
          setUndonePosts(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Failed to fetch undone posts:', err);
      } finally {
        setLoadingPosts(false);
      }
    };
    fetchUndonePosts();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.postId) {
      toast({
        title: "Post ID Required",
        description: "Please enter the Post ID you want to reactivate",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const userId = localStorage.getItem('userId');
      const token = localStorage.getItem('authToken');

      const res = await fetch(`${baseUrl}/api/posts/${form.postId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          status: 'active',
          userId,
          reason: form.reason,
          description: form.description
        })
      });

      if (res.ok) {
        setShowConfirmation(true);
        toast({
          title: "✅ Post Reactivated",
          description: "Your post is now available for sale again"
        });
      } else {
        const error = await res.json();
        throw new Error(error.message || 'Failed to update post status');
      }
    } catch (err) {
      console.error('Sale undone error:', err);
      toast({
        title: "Action Failed",
        description: err.message || "Could not reactivate the post. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setForm({ postId: '', reason: '', description: '' });
    setShowConfirmation(false);
  };

  // Success confirmation screen
  if (showConfirmation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-400 via-red-500 to-pink-600 relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-yellow-300/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        <div className="relative max-w-2xl mx-auto p-6 pt-20">
          <Card className="shadow-2xl border-0 rounded-3xl overflow-hidden backdrop-blur-xl bg-white/95">
            <CardContent className="p-12 text-center">
              {/* Success Icon */}
              <div className="relative inline-block mb-8">
                <div className="absolute inset-0 bg-orange-400 rounded-full animate-ping opacity-25"></div>
                <div className="relative w-32 h-32 mx-auto bg-gradient-to-br from-orange-400 to-red-600 rounded-full flex items-center justify-center shadow-2xl">
                  <RefreshCw className="w-16 h-16 text-white" />
                </div>
              </div>

              <h2 className="text-4xl font-black bg-gradient-to-r from-orange-600 to-red-700 bg-clip-text text-transparent mb-4">
                🔄 Post Reactivated!
              </h2>

              <p className="text-gray-600 text-xl mb-8 max-w-md mx-auto">
                Your post is now active and visible to potential buyers again.
              </p>

              <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-2xl p-6 mb-8 border border-orange-200">
                <div className="flex items-center justify-center gap-6">
                  <div className="text-center">
                    <Package className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                    <p className="text-lg font-bold text-orange-700">Active</p>
                    <p className="text-sm text-gray-500">Post Status</p>
                  </div>
                  <div className="w-px h-16 bg-orange-200"></div>
                  <div className="text-center">
                    <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <p className="text-lg font-bold text-green-700">Visible</p>
                    <p className="text-sm text-gray-500">To Buyers</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  variant="outline"
                  onClick={resetForm}
                  className="border-2 border-orange-500 text-orange-600 hover:bg-orange-50 rounded-xl px-8 py-3 font-semibold"
                >
                  Reactivate Another
                </Button>
                <Button
                  className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 rounded-xl px-8 py-3 font-semibold shadow-lg"
                  onClick={() => navigate('/my-home')}
                >
                  Go to My Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-900 via-orange-900 to-red-900 relative" style={{ minHeight: '100vh', paddingBottom: '120px' }}>
      {/* Animated background */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-orange-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-red-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-pink-500/10 rounded-full blur-3xl"></div>
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

          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-400 to-red-600 shadow-2xl shadow-orange-500/30 mb-6">
            <RotateCcw className="w-10 h-10 text-white" />
          </div>

          <h1 className="text-4xl sm:text-5xl font-black text-white mb-3">
            🔄 <span className="bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">{t('sale_undone_title')}</span>
          </h1>
          <p className="text-orange-200 text-lg max-w-md mx-auto">
            {t('reactivate_sold_posts')}
          </p>
        </div>

        {/* Info Badges */}
        <div className="flex flex-wrap justify-center gap-3">
          <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/30 px-4 py-2 rounded-full backdrop-blur-sm">
            <RefreshCw className="w-4 h-4 mr-2" /> {t('instant_reactivation')}
          </Badge>
          <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 px-4 py-2 rounded-full backdrop-blur-sm">
            <Shield className="w-4 h-4 mr-2" /> {t('no_penalties')}
          </Badge>
          <Badge className="bg-pink-500/20 text-pink-300 border-pink-500/30 px-4 py-2 rounded-full backdrop-blur-sm">
            <Package className="w-4 h-4 mr-2" /> {t('keep_original_details')}
          </Badge>
        </div>

        {/* Main Form Card */}
        <Card className="shadow-2xl border-0 rounded-3xl overflow-hidden backdrop-blur-xl bg-white/95">
          <CardHeader className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white p-8">
            <CardTitle className="flex items-center space-x-3 text-2xl">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <RotateCcw className="w-6 h-6" />
              </div>
              <span>{t('reactivate_your_post')}</span>
            </CardTitle>
            <CardDescription className="text-orange-100 text-base mt-2">
              {t('enter_post_id_to_reactivate')}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-8">
            {/* Why Undo Section */}
            <div className="bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-200 rounded-2xl p-6 mb-8">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <HelpCircle className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="font-bold text-orange-800 text-lg mb-2">{t('when_to_use_sale_undone')}</p>
                  <ul className="space-y-2 text-orange-700">
                    <li className="flex items-center gap-2"><XCircle className="w-4 h-4" /> {t('no_buyers_found_for_post')}</li>
                    <li className="flex items-center gap-2"><XCircle className="w-4 h-4" /> {t('buyer_not_interested_after_all')}</li>
                    <li className="flex items-center gap-2"><XCircle className="w-4 h-4" /> {t('deal_didnt_go_through')}</li>
                    <li className="flex items-center gap-2"><XCircle className="w-4 h-4" /> {t('want_to_relist_updated')}</li>
                  </ul>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="postId" className="text-sm font-bold text-gray-700 mb-2 block">{t('post_id')} *</Label>
                <Input
                  id="postId"
                  value={form.postId}
                  onChange={(e) => setForm(prev => ({ ...prev, postId: e.target.value }))}
                  placeholder={t('post_id_placeholder')}
                  className="h-14 text-lg rounded-xl border-2 border-gray-200 focus:border-orange-500 transition-colors"
                  required
                />
                <p className="text-sm text-gray-500 mt-2">💡 {t('post_id_hint')}</p>
              </div>

              <div>
                <Label htmlFor="reason" className="text-sm font-bold text-gray-700 mb-2 block">{t('reason_for_undoing')}</Label>
                <select
                  id="reason"
                  value={form.reason}
                  onChange={(e) => setForm(prev => ({ ...prev, reason: e.target.value }))}
                  className="w-full h-14 text-lg rounded-xl border-2 border-gray-200 focus:border-orange-500 transition-colors px-4 bg-white"
                >
                  <option value="">{t('select_reason_optional')}</option>
                  <option value="no_buyers_found">{t('no_buyers_found')}</option>
                  <option value="buyer_not_interested">{t('buyer_found_not_interested')}</option>
                  <option value="buyer_changed_mind">{t('buyer_changed_mind')}</option>
                  <option value="price_too_high">{t('price_too_high')}</option>
                  <option value="item_condition_issue">{t('item_condition_concerns')}</option>
                  <option value="location_issue">{t('location_not_convenient')}</option>
                  <option value="communication_failed">{t('communication_failed')}</option>
                  <option value="payment_issue">{t('payment_issue')}</option>
                  <option value="want_to_relist">{t('want_to_relist_new_details')}</option>
                  <option value="other">{t('other')}</option>
                </select>
              </div>

              <div>
                <Label htmlFor="description" className="text-sm font-bold text-gray-700 mb-2 block">{t('additional_notes')}</Label>
                <textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder={t('additional_notes_placeholder')}
                  className="w-full min-h-[100px] text-lg rounded-xl border-2 border-gray-200 focus:border-orange-500 transition-colors px-4 py-3 resize-none"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-16 text-lg font-bold bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 rounded-2xl shadow-xl shadow-orange-500/30 transition-all hover:shadow-orange-500/50 hover:scale-[1.02]"
              >
                {isLoading ? (
                  <span className="flex items-center gap-3">
                    <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                    {t('reactivating')}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-6 h-6" />
                    {t('reactivate_post')}
                  </span>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Previously Undone Posts */}
        <Card className="shadow-2xl border-0 rounded-3xl overflow-hidden backdrop-blur-xl bg-white/95">
          <CardHeader className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white p-6">
            <CardTitle className="flex items-center space-x-3 text-xl">
              <Clock className="w-6 h-6" />
              <span>{t('previously_reactivated')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {loadingPosts ? (
              <div className="text-center py-8">
                <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-500">{t('loading_history')}</p>
              </div>
            ) : undonePosts.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 text-lg">{t('no_reactivated_posts')}</p>
                <p className="text-gray-400 text-sm mt-1">{t('posts_you_reactivate')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {undonePosts.map((post) => (
                  <div
                    key={post.id || post.post_id}
                    className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-5 border border-gray-200 hover:shadow-lg transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <Badge className="bg-orange-100 text-orange-700 font-mono mb-2">
                          ID: {post.post_id || post.id}
                        </Badge>
                        <h4 className="font-bold text-gray-900">{post.title}</h4>
                        <p className="text-sm text-gray-500">{post.reason || 'No reason specified'}</p>
                      </div>
                      <Badge className="bg-green-100 text-green-700">Active</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-24 right-6 w-14 h-14 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-full shadow-2xl shadow-orange-500/40 flex items-center justify-center hover:scale-110 transition-all z-50 animate-bounce"
        >
          <ArrowUp className="w-6 h-6" />
        </button>
      )}
    </div>
  );
};

export default SaleUndone;

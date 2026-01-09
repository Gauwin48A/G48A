import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Star, Send, Heart, ArrowLeft, ArrowUp, Sparkles, ThumbsUp, Lightbulb, Bug, Palette, Zap, CheckCircle, ChevronRight, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';

const Feedback = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({
    userId: localStorage.getItem('userId') || 'USER123456',
    name: 'User',
    email: '',
    feedbackType: 'general',
    rating: 5,
    subject: '',
    message: ''
  });

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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFeedbackForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRatingChange = (rating) => {
    setFeedbackForm(prev => ({
      ...prev,
      rating: rating
    }));
  };

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();

    if (!feedbackForm.subject || !feedbackForm.message) {
      toast({
        title: t('incomplete_form'),
        description: t('fill_subject_message'),
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: t('feedback_submitted'),
        description: t('thank_you_feedback')
      });

      setFeedbackForm(prev => ({
        ...prev,
        feedbackType: 'general',
        rating: 5,
        subject: '',
        message: ''
      }));
    }, 1500);
  };

  const renderStars = () => {
    return [...Array(5)].map((_, index) => (
      <button
        key={index}
        type="button"
        onClick={() => handleRatingChange(index + 1)}
        className={`text-2xl transition-all transform hover:scale-125 ${index < feedbackForm.rating ? 'text-yellow-400' : 'text-gray-300'} hover:text-yellow-400`}
      >
        <Star className="w-8 h-8 fill-current" />
      </button>
    ));
  };

  const feedbackCategories = [
    { icon: Bug, name: t('bug_report'), description: t('report_technical_issues'), value: 'bug', color: 'text-red-500', bg: 'bg-red-50' },
    { icon: Lightbulb, name: t('feature_request'), description: t('suggest_new_features'), value: 'feature', color: 'text-yellow-500', bg: 'bg-yellow-50' },
    { icon: Palette, name: t('ui_improvement'), description: t('suggest_design_improvements'), value: 'ui', color: 'text-purple-500', bg: 'bg-purple-50' },
    { icon: Zap, name: t('performance_issue'), description: t('report_slow_loading'), value: 'performance', color: 'text-orange-500', bg: 'bg-orange-50' },
    { icon: MessageSquare, name: t('general_feedback'), description: t('share_general_thoughts'), value: 'general', color: 'text-blue-500', bg: 'bg-blue-50' },
  ];

  // Check login status
  const isLoggedIn = localStorage.getItem('userId') && localStorage.getItem('authToken');

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700" style={{ paddingBottom: '120px' }}>
        {/* Hero Section */}
        <div className="pt-16 pb-12 px-6 text-center">
          <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-2xl">
            <MessageSquare className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">{t('feedback') || 'Feedback'}</h1>
          <p className="text-white/80 text-lg max-w-md mx-auto">
            {t('feedback_login_desc') || 'We value your feedback! Please login to share your thoughts.'}
          </p>
        </div>

        {/* Login/Signup Cards */}
        <div className="max-w-lg mx-auto px-6 space-y-4">
          <a
            href="/login"
            className="block bg-white rounded-2xl p-6 shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg">
                <CheckCircle className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900">{t('login') || 'Login'}</h3>
                <p className="text-gray-500 text-sm">{t('login_desc') || 'Already have an account? Sign in here'}</p>
              </div>
              <ChevronRight className="w-6 h-6 text-gray-400" />
            </div>
          </a>

          <a
            href="/signup"
            className="block bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-xl hover:shadow-2xl hover:bg-white/20 hover:scale-[1.02] transition-all duration-300"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center shadow-lg">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white">{t('signup') || 'Create Account'}</h3>
                <p className="text-white/70 text-sm">{t('signup_desc') || 'New user? Join us in just a few steps'}</p>
              </div>
              <ChevronRight className="w-6 h-6 text-white/60" />
            </div>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 relative" style={{ minHeight: '100vh', paddingBottom: '120px' }}>
      {/* Animated background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-lg mx-auto p-4 sm:p-6 space-y-6">
        {/* Premium Header */}
        <div className="text-center pt-8">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center text-blue-300 hover:text-blue-200 mb-8 group transition-all"
          >
            <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
            {t('back_to_home')}
          </button>

          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-600 shadow-2xl shadow-blue-500/30 mb-6">
            <MessageSquare className="w-10 h-10 text-white" />
          </div>

          <h1 className="text-4xl sm:text-5xl font-black text-white mb-3">
            {t('share_your')} <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">{t('feedback')}</span>
          </h1>
          <p className="text-blue-200 text-lg max-w-md mx-auto">
            {t('help_us_improve')}
          </p>
        </div>

        {/* Trust Badges */}
        <div className="flex flex-wrap justify-center gap-3">
          <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 px-4 py-2 rounded-full backdrop-blur-sm">
            <Heart className="w-4 h-4 mr-2" /> {t('your_voice_matters')}
          </Badge>
          <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 px-4 py-2 rounded-full backdrop-blur-sm">
            <ThumbsUp className="w-4 h-4 mr-2" /> {t('we_listen')}
          </Badge>
          <Badge className="bg-green-500/20 text-green-300 border-green-500/30 px-4 py-2 rounded-full backdrop-blur-sm">
            <Sparkles className="w-4 h-4 mr-2" /> {t('continuous_improvement')}
          </Badge>
        </div>

        {/* Feedback Form */}
        <Card className="shadow-2xl border-0 rounded-3xl overflow-hidden backdrop-blur-xl bg-white/95">
          <CardHeader className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 text-white p-8">
            <CardTitle className="flex items-center space-x-3 text-2xl">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <MessageSquare className="w-6 h-6" />
              </div>
              <span>{t('your_feedback')}</span>
            </CardTitle>
            <CardDescription className="text-blue-100 text-base mt-2">
              {t('opinion_matters')}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-8">
            <form onSubmit={handleSubmitFeedback} className="space-y-6">
              {/* Feedback Type */}
              <div>
                <Label className="text-sm font-bold text-gray-700 mb-3 block">{t('feedback_category')}</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {feedbackCategories.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setFeedbackForm(prev => ({ ...prev, feedbackType: cat.value }))}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${feedbackForm.feedbackType === cat.value
                        ? 'border-blue-500 bg-blue-50 shadow-lg'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 ${cat.bg} rounded-lg flex items-center justify-center`}>
                          <cat.icon className={`w-5 h-5 ${cat.color}`} />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">{cat.name}</p>
                          <p className="text-xs text-gray-500">{cat.description}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Rating */}
              <div>
                <Label className="text-sm font-bold text-gray-700 mb-2 block">{t('overall_rating')}</Label>
                <div className="flex items-center gap-2 bg-gray-50 p-4 rounded-xl">
                  <div className="flex items-center space-x-1">
                    {renderStars()}
                  </div>
                  <span className="ml-4 text-lg font-semibold text-gray-700">
                    {feedbackForm.rating} / 5
                  </span>
                </div>
              </div>

              {/* Subject */}
              <div>
                <Label htmlFor="subject" className="text-sm font-bold text-gray-700 mb-2 block">{t('subject')} *</Label>
                <Input
                  id="subject"
                  name="subject"
                  type="text"
                  value={feedbackForm.subject}
                  onChange={handleInputChange}
                  placeholder={t('brief_summary')}
                  className="h-14 text-lg rounded-xl border-2 border-gray-200 focus:border-blue-500 transition-colors"
                  required
                />
              </div>

              {/* Message */}
              <div>
                <Label htmlFor="message" className="text-sm font-bold text-gray-700 mb-2 block">{t('your_feedback')} *</Label>
                <Textarea
                  id="message"
                  name="message"
                  value={feedbackForm.message}
                  onChange={handleInputChange}
                  placeholder={t('share_detailed_feedback')}
                  rows={6}
                  className="text-lg rounded-xl border-2 border-gray-200 focus:border-blue-500 transition-colors resize-none"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-16 text-lg font-bold bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 rounded-2xl shadow-xl shadow-blue-500/30 transition-all hover:shadow-blue-500/50 hover:scale-[1.02]"
              >
                {isLoading ? (
                  <span className="flex items-center gap-3">
                    <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                    {t('submitting')}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Send className="w-6 h-6" />
                    {t('submit_feedback')}
                  </span>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Why Feedback Matters */}
        <Card className="shadow-2xl border-0 rounded-3xl overflow-hidden backdrop-blur-xl bg-gradient-to-r from-blue-500 to-indigo-600">
          <CardContent className="p-8 text-white">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                <Heart className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold">{t('why_feedback_matters')}</h3>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-white/10 rounded-xl p-4">
                <p className="font-semibold mb-1">💡 {t('helps_us_understand')}</p>
                <p className="text-blue-100 text-sm">{t('your_needs_pain_points')}</p>
              </div>
              <div className="bg-white/10 rounded-xl p-4">
                <p className="font-semibold mb-1">🎯 {t('guides_our_priorities')}</p>
                <p className="text-blue-100 text-sm">{t('what_to_build_next')}</p>
              </div>
              <div className="bg-white/10 rounded-xl p-4">
                <p className="font-semibold mb-1">🚀 {t('improves_experience')}</p>
                <p className="text-blue-100 text-sm">{t('for_all_users')}</p>
              </div>
              <div className="bg-white/10 rounded-xl p-4">
                <p className="font-semibold mb-1">🔒 {t('builds_trust')}</p>
                <p className="text-blue-100 text-sm">{t('a_better_safer_platform')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Info */}
        <Card className="shadow-2xl border-0 rounded-3xl overflow-hidden backdrop-blur-xl bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Send className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-bold text-green-800 text-lg mb-2">📧 {t('direct_contact')}</h3>
                <div className="space-y-1 text-green-700">
                  <p><span className="font-medium">{t('email')}:</span> feedback@mobilehub.com</p>
                  <p><span className="font-medium">{t('response_time')}:</span> {t('24_48_hours')}</p>
                  <p><span className="font-medium">{t('priority_support')}:</span> {t('verified_users_faster')}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Thank You */}
        <Card className="shadow-2xl border-0 rounded-3xl overflow-hidden backdrop-blur-xl bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200">
          <CardContent className="p-8 text-center">
            <Heart className="w-16 h-16 text-purple-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-purple-800 mb-2">{t('thank_you_community')}</h3>
            <p className="text-purple-700 max-w-md mx-auto">
              {t('feedback_helps_build')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-24 right-6 w-14 h-14 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full shadow-2xl shadow-blue-500/40 flex items-center justify-center hover:scale-110 transition-all z-50 animate-bounce"
        >
          <ArrowUp className="w-6 h-6" />
        </button>
      )}
    </div>
  );
};

export default Feedback;

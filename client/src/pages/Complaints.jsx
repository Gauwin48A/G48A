import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, FileText, Clock, CheckCircle, ArrowLeft, ArrowUp, Shield, MessageSquare, Send, AlertTriangle, Sparkles, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Complaints = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [complaintForm, setComplaintForm] = useState({
    sellerId: '',
    buyerId: '',
    postId: '',
    secretCode: '',
    complaintType: 'transaction',
    description: ''
  });

  const myComplaints = [
    {
      id: 'COMP001',
      type: t('transaction_issue'),
      postId: 'POST001',
      sellerId: 'USER123',
      buyerId: 'USER456',
      status: t('under_review'),
      submittedDate: '2024-01-20',
      description: t('seller_not_responding'),
      adminResponse: null
    },
    {
      id: 'COMP002',
      type: t('product_quality'),
      postId: 'POST002',
      sellerId: 'USER789',
      buyerId: 'USER456',
      status: t('resolved'),
      submittedDate: '2024-01-15',
      description: t('phone_condition_not_described'),
      adminResponse: t('issue_resolved_refund')
    }
  ];

  const [complaints, setComplaints] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    setLoading(true);
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    fetch(`${baseUrl}/api/complaints`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setComplaints(data);
          setError(null);
        } else {
          setError(data.error || 'Failed to fetch complaints');
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Failed to fetch complaints');
        setLoading(false);
      });
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setComplaintForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmitComplaint = async (e) => {
    e.preventDefault();

    if (!complaintForm.sellerId || !complaintForm.buyerId || !complaintForm.postId || !complaintForm.description) {
      toast({
        title: "Incomplete Form",
        description: "Please fill all required fields",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "✅ Complaint Submitted",
        description: "We'll review your complaint within 24-48 hours"
      });

      setComplaintForm({
        sellerId: '',
        buyerId: '',
        postId: '',
        secretCode: '',
        complaintType: 'transaction',
        description: ''
      });
    }, 1500);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Under Review':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'Resolved':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'Rejected':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Under Review':
        return <Clock className="w-4 h-4" />;
      case 'Resolved':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const displayedComplaints = complaints.length > 0 ? complaints : myComplaints;

  // Check login status
  const isLoggedIn = localStorage.getItem('userId') && localStorage.getItem('authToken');

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-600 via-orange-600 to-amber-600" style={{ paddingBottom: '120px' }}>
        {/* Hero Section */}
        <div className="pt-16 pb-12 px-6 text-center">
          <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-red-400 to-orange-500 flex items-center justify-center shadow-2xl">
            <Shield className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">{t('complaints') || 'Complaints'}</h1>
          <p className="text-white/80 text-lg max-w-md mx-auto">
            {t('complaints_login_desc') || 'Need to report an issue? Please login to file a complaint.'}
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
    <div className="bg-gradient-to-br from-slate-900 via-red-900 to-orange-900 relative" style={{ minHeight: '100vh', paddingBottom: '120px' }}>
      {/* Animated background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-red-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-yellow-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-lg mx-auto p-4 sm:p-6 space-y-6">
        {/* Premium Header */}
        <div className="text-center pt-8">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center text-red-300 hover:text-red-200 mb-8 group transition-all"
          >
            <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
            {t('back_to_home')}
          </button>

          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-red-400 to-orange-600 shadow-2xl shadow-red-500/30 mb-6">
            <AlertTriangle className="w-10 h-10 text-white" />
          </div>

          <h1 className="text-4xl sm:text-5xl font-black text-white mb-3">
            {t('file_a')} <span className="bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">{t('complaint')}</span>
          </h1>
          <p className="text-red-200 text-lg max-w-md mx-auto">
            {t('report_issues_support')}
          </p>
        </div>

        {/* Trust Badges */}
        <div className="flex flex-wrap justify-center gap-3">
          <Badge className="bg-red-500/20 text-red-300 border-red-500/30 px-4 py-2 rounded-full backdrop-blur-sm">
            <Shield className="w-4 h-4 mr-2" /> {t('secure_confidential')}
          </Badge>
          <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 px-4 py-2 rounded-full backdrop-blur-sm">
            <Clock className="w-4 h-4 mr-2" /> {t('24_48h_response')}
          </Badge>
          <Badge className="bg-green-500/20 text-green-300 border-green-500/30 px-4 py-2 rounded-full backdrop-blur-sm">
            <MessageSquare className="w-4 h-4 mr-2" /> {t('fair_resolution')}
          </Badge>
        </div>

        {/* Submit Complaint Form */}
        <Card className="shadow-2xl border-0 rounded-3xl overflow-hidden backdrop-blur-xl bg-white/95">
          <CardHeader className="bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 text-white p-8">
            <CardTitle className="flex items-center space-x-3 text-2xl">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <AlertCircle className="w-6 h-6" />
              </div>
              <span>{t('submit_new_complaint')}</span>
            </CardTitle>
            <CardDescription className="text-red-100 text-base mt-2">
              {t('provide_details_issue')}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-8">
            <form onSubmit={handleSubmitComplaint} className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="sellerId" className="text-sm font-bold text-gray-700 mb-2 block">{t('seller_id')} *</Label>
                  <Input
                    id="sellerId"
                    name="sellerId"
                    value={complaintForm.sellerId}
                    onChange={handleInputChange}
                    placeholder="e.g., USER123456"
                    className="h-14 text-lg rounded-xl border-2 border-gray-200 focus:border-red-500 transition-colors"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="buyerId" className="text-sm font-bold text-gray-700 mb-2 block">{t('buyer_id')} *</Label>
                  <Input
                    id="buyerId"
                    name="buyerId"
                    value={complaintForm.buyerId}
                    onChange={handleInputChange}
                    placeholder="e.g., USER654321"
                    className="h-14 text-lg rounded-xl border-2 border-gray-200 focus:border-red-500 transition-colors"
                    required
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="postId" className="text-sm font-bold text-gray-700 mb-2 block">{t('post_id')} *</Label>
                  <Input
                    id="postId"
                    name="postId"
                    value={complaintForm.postId}
                    onChange={handleInputChange}
                    placeholder="e.g., POST001"
                    className="h-14 text-lg rounded-xl border-2 border-gray-200 focus:border-red-500 transition-colors"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="secretCode" className="text-sm font-bold text-gray-700 mb-2 block">{t('transaction_code')}</Label>
                  <Input
                    id="secretCode"
                    name="secretCode"
                    value={complaintForm.secretCode}
                    onChange={handleInputChange}
                    placeholder="e.g., ABC123"
                    className="h-14 text-lg rounded-xl border-2 border-gray-200 focus:border-red-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="complaintType" className="text-sm font-bold text-gray-700 mb-2 block">{t('complaint_type')}</Label>
                <select
                  id="complaintType"
                  name="complaintType"
                  value={complaintForm.complaintType}
                  onChange={handleInputChange}
                  className="w-full h-14 text-lg rounded-xl border-2 border-gray-200 focus:border-red-500 transition-colors px-4 bg-white"
                >
                  <option value="transaction">💳 {t('transaction_issue')}</option>
                  <option value="quality">📦 {t('product_quality')}</option>
                  <option value="communication">💬 {t('communication_problem')}</option>
                  <option value="fraud">⚠️ {t('suspected_fraud')}</option>
                  <option value="delivery">🚚 {t('delivery_issue')}</option>
                  <option value="other">❓ {t('other')}</option>
                </select>
              </div>

              <div>
                <Label htmlFor="description" className="text-sm font-bold text-gray-700 mb-2 block">{t('description')} *</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={complaintForm.description}
                  onChange={handleInputChange}
                  placeholder={t('describe_issue_detail')}
                  rows={5}
                  className="text-lg rounded-xl border-2 border-gray-200 focus:border-red-500 transition-colors resize-none"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-16 text-lg font-bold bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 rounded-2xl shadow-xl shadow-red-500/30 transition-all hover:shadow-red-500/50 hover:scale-[1.02]"
              >
                {isLoading ? (
                  <span className="flex items-center gap-3">
                    <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                    {t('submitting')}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Send className="w-6 h-6" />
                    {t('submit_complaint')}
                  </span>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* My Complaints History */}
        <Card className="shadow-2xl border-0 rounded-3xl overflow-hidden backdrop-blur-xl bg-white/95">
          <CardHeader className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white p-6">
            <CardTitle className="flex items-center space-x-3 text-xl">
              <FileText className="w-6 h-6" />
              <span>{t('my_complaints')}</span>
            </CardTitle>
            <CardDescription className="text-purple-100">
              {t('track_status')}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="w-10 h-10 border-4 border-red-200 border-t-red-500 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-500">{t('loading_complaints')}</p>
              </div>
            ) : displayedComplaints.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 text-lg">{t('no_complaints_yet')}</p>
                <p className="text-gray-400 text-sm mt-1">{t('completed_your_complaints_here')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {displayedComplaints.map((complaint) => (
                  <div
                    key={complaint.complaint_id || complaint.id || complaint._id}
                    className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-5 border border-gray-200 hover:shadow-lg transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-bold text-gray-900 text-lg">{complaint.type}</h4>
                        <p className="text-sm text-gray-500 font-mono">ID: {complaint.complaint_id || complaint.id}</p>
                      </div>
                      <Badge className={getStatusColor(complaint.status)}>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(complaint.status)}
                          <span>{complaint.status}</span>
                        </div>
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">Post ID:</span>
                        <span className="font-medium">{complaint.postId}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">Submitted:</span>
                        <span className="font-medium">{complaint.submittedDate}</span>
                      </div>
                    </div>

                    <p className="text-gray-700 text-sm mb-3">{complaint.description}</p>

                    {complaint.adminResponse && (
                      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                        <p className="text-sm font-semibold text-green-800 mb-1 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          {t('admin_response')}:
                        </p>
                        <p className="text-sm text-green-700">{complaint.adminResponse}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Important Guidelines */}
        <Card className="shadow-2xl border-0 rounded-3xl overflow-hidden backdrop-blur-xl bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-bold text-yellow-800 text-lg mb-3">📋 {t('important_guidelines')}</h3>
                <ul className="space-y-2 text-yellow-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-1 flex-shrink-0" />
                    <span>{t('provide_accurate_ids')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-1 flex-shrink-0" />
                    <span>{t('include_transaction_details')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-1 flex-shrink-0" />
                    <span>{t('response_time_24_48')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-1 flex-shrink-0" />
                    <span>{t('keep_evidence')}</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-24 right-6 w-14 h-14 bg-gradient-to-r from-red-500 to-orange-600 text-white rounded-full shadow-2xl shadow-red-500/40 flex items-center justify-center hover:scale-110 transition-all z-50 animate-bounce"
        >
          <ArrowUp className="w-6 h-6" />
        </button>
      )}
    </div>
  );
};

export default Complaints;

/**
 * TierSelection Page - Protocol: Value Hierarchy
 * The Defender's Strategy: Make Premium feel like "God Mode"
 * 
 * Displays pricing tiers with clear value proposition
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Shield, Crown, Clock, TrendingUp, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { getAccessToken, getUserId } from '@/utils/authStorage';
import { useToast } from '@/hooks/use-toast';

const TierSelection = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(null);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  const handleSelectTier = async (tier) => {
    const userId = getUserId();
    const token = getAccessToken();

    if (!userId || !token) {
      navigate('/login', { state: { returnTo: '/tier-selection' } });
      return;
    }

    setLoading(tier);
    setError(null);

    try {
      // In production, this would trigger Razorpay/Stripe payment
      // For MVP, we simulate success and update DB directly
      await api.post('/users/upgrade-tier', { tier });
      setSuccess(tier);
      toast({
        title: 'Plan Activated',
        description: `Your ${tier} plan is active now.`
      });
      setTimeout(() => {
        navigate(`/add-post?tier=${encodeURIComponent(tier)}`);
      }, 800);
    } catch (err) {
      console.error('Tier upgrade error:', err);
      const message = err?.response?.data?.error || err?.message || 'Failed to upgrade. Please try again.';
      setError(message);
      toast({
        title: 'Upgrade Failed',
        description: message,
        variant: 'destructive'
      });
    } finally {
      setLoading(null);
    }
  };

  const tiers = [
    {
      key: 'basic',
      name: 'Basic',
      subtitle: 'Pay-As-You-Go',
      price: '₹49',
      period: '/post',
      icon: Clock,
      color: 'bg-gray-100 border-gray-200',
      buttonClass: 'bg-gray-600 hover:bg-gray-700',
      features: [
        { text: '1 Single Post', included: true },
        { text: '15 Days Visibility', included: true },
        { text: 'Standard Reach', included: true },
        { text: 'Priority Support', included: false },
        { text: 'Verified Badge', included: false }
      ]
    },
    {
      key: 'silver',
      name: 'Silver Seller',
      subtitle: 'Semi-Pro',
      price: '₹499',
      period: '/6 months',
      icon: Shield,
      color: 'bg-blue-50 border-blue-200',
      buttonClass: 'bg-blue-600 hover:bg-blue-700',
      popular: true,
      features: [
        { text: '1 Post Per Day', included: true },
        { text: '25 Days Visibility', included: true },
        { text: 'Medium Priority Reach', included: true },
        { text: 'Verified Badge', included: true },
        { text: 'Priority Support', included: false }
      ]
    },
    {
      key: 'premium',
      name: 'Premium',
      subtitle: 'God Mode 🔥',
      price: '₹999',
      period: '/year',
      icon: Crown,
      color: 'bg-gradient-to-br from-gray-900 to-gray-800 border-yellow-500',
      textColor: 'text-white',
      buttonClass: 'bg-yellow-500 hover:bg-yellow-400 text-black',
      featured: true,
      features: [
        { text: 'Unlimited Posts', included: true },
        { text: '45 Days Visibility', included: true },
        { text: 'Top of Feed Priority', included: true },
        { text: 'Verified Badge + Crown', included: true },
        { text: 'Premium Support 24/7', included: true }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl">
            <TrendingUp className="w-8 h-8 text-white" />
          </div>
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-4">
          Choose Your Selling Power
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Unlock higher visibility and sell <span className="font-bold text-green-600">3x faster</span> with Premium.
          More visibility = More buyers = Faster sales.
        </p>
      </div>

      {/* Success Banner */}
      {success && (
        <div className="max-w-md mx-auto mb-8 p-4 bg-green-100 dark:bg-green-900/50 border border-green-300 rounded-xl text-center">
          <Sparkles className="w-8 h-8 text-green-600 mx-auto mb-2" />
          <p className="text-green-800 dark:text-green-300 font-semibold">
            🎉 {success.toUpperCase()} plan activated! Redirecting...
          </p>
        </div>
      )}

      {error && (
        <div className="max-w-md mx-auto mb-8 p-4 bg-red-100 dark:bg-red-900/40 border border-red-300 rounded-xl text-center">
          <p className="text-red-700 dark:text-red-300 text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Tier Cards */}
      <div className="max-w-6xl mx-auto grid gap-8 lg:grid-cols-3 items-stretch">
        {tiers.map((tier) => {
          const Icon = tier.icon;
          const isLoading = loading === tier.key;

          return (
            <Card
              key={tier.key}
              className={`relative overflow-hidden rounded-2xl shadow-xl border-2 transition-all duration-300 hover:shadow-2xl ${tier.color} ${tier.featured ? 'lg:scale-105 lg:-mt-4 lg:mb-4' : ''
                } ${tier.textColor || ''}`}
            >
              {/* Popular Badge */}
              {tier.popular && (
                <div className="absolute top-0 right-0">
                  <Badge className="bg-blue-600 text-white rounded-none rounded-bl-xl px-4 py-1 font-bold">
                    Popular
                  </Badge>
                </div>
              )}

              {/* Featured Badge */}
              {tier.featured && (
                <div className="absolute top-0 left-0 right-0 bg-yellow-500 text-black text-center py-1 font-bold text-sm">
                  ⭐ BEST VALUE
                </div>
              )}

              <CardHeader className={tier.featured ? 'pt-10' : ''}>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-xl ${tier.featured ? 'bg-yellow-400/20' : 'bg-gray-100 dark:bg-gray-800'}`}>
                    <Icon className={`w-6 h-6 ${tier.featured ? 'text-yellow-400' : 'text-blue-600'}`} />
                  </div>
                  <div>
                    <CardTitle className={`text-xl font-bold ${tier.textColor || 'text-gray-900'}`}>
                      {tier.name}
                    </CardTitle>
                    <p className={`text-sm ${tier.featured ? 'text-yellow-400' : 'text-gray-500'}`}>
                      {tier.subtitle}
                    </p>
                  </div>
                </div>

                {/* Price */}
                <div className="mt-4 flex items-baseline">
                  <span className={`text-4xl font-extrabold tracking-tight ${tier.textColor || 'text-gray-900'}`}>
                    {tier.price}
                  </span>
                  <span className={`ml-1 text-lg ${tier.featured ? 'text-gray-400' : 'text-gray-500'}`}>
                    {tier.period}
                  </span>
                </div>
              </CardHeader>

              <CardContent>
                {/* Features List */}
                <ul className="space-y-3 mb-8">
                  {tier.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center">
                      {feature.included ? (
                        <Check className={`w-5 h-5 mr-3 flex-shrink-0 ${tier.featured ? 'text-yellow-400' : 'text-green-500'}`} />
                      ) : (
                        <span className="w-5 h-5 mr-3 flex-shrink-0 text-gray-300">—</span>
                      )}
                      <span className={`${feature.included ? (tier.textColor || 'text-gray-700') : 'text-gray-400 line-through'}`}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <Button
                  onClick={() => handleSelectTier(tier.key)}
                  disabled={isLoading || success}
                  className={`w-full py-6 text-lg font-bold rounded-xl transition-all ${tier.buttonClass}`}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </span>
                  ) : tier.key === 'basic' ? (
                    'Buy 1 Post Credit'
                  ) : tier.key === 'silver' ? (
                    'Get Silver Access'
                  ) : (
                    '🚀 Go Premium'
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Trust Indicators */}
      <div className="max-w-4xl mx-auto mt-16 text-center">
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          🔒 Secure payments • 📞 24/7 Support • ⚡ Instant activation
        </p>
      </div>
    </div>
  );
};

export default TierSelection;

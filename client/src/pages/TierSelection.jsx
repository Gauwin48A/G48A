
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { ArrowLeft, Image, Star, Crown } from "lucide-react";

const TierSelection = () => {
  const tiers = [
    {
      id: 'basic',
      name: 'Basic',
      price: 'Free',
      images: 1,
      features: [
        '1 High-quality image',
        'Basic listing details',
        '15 days visibility',
        'Standard support'
      ],
      icon: Image,
      color: '#96C2DB',
      popular: false
    },
    {
      id: 'silver',
      name: 'Silver',
      price: '₹49',
      images: 3,
      features: [
        'Up to 3 images',
        'Enhanced listing details',
        '30 days visibility',
        'Priority support',
        'Featured in category'
      ],
      icon: Star,
      color: '#C5ADC5',
      popular: true
    },
    {
      id: 'premium',
      name: 'Premium',
      price: '₹99',
      images: 10,
      features: [
        'Up to 10 images',
        'Complete listing details',
        '45 days visibility',
        'Premium support',
        'Top featured placement',
        'Social media promotion'
      ],
      icon: Crown,
      color: '#FFD700',
      popular: false
    }
  ];

  return (
    <div className="min-h-screen py-8 main-content" style={{ backgroundColor: '#E5EDF1' }}>
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Link to="/all-posts" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to All Posts
          </Link>
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4" style={{ color: '#333A45' }}>
              Choose Your Listing Tier
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Select the perfect plan for your mobile phone listing. More images and features help attract more buyers.
            </p>
          </div>
        </div>

        {/* Tier Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {tiers.map((tier) => {
            const IconComponent = tier.icon;
            return (
              <Card 
                key={tier.id} 
                className={`relative bg-white shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-2 border-0 rounded-3xl overflow-hidden ${
                  tier.popular ? 'ring-4 ring-opacity-50' : ''
                }`}
                style={tier.popular ? { ringColor: tier.color } : {}}
              >
                {tier.popular && (
                  <div 
                    className="absolute top-0 left-0 right-0 text-white text-center py-2 text-sm font-semibold"
                    style={{ backgroundColor: tier.color }}
                  >
                    MOST POPULAR
                  </div>
                )}
                
                <CardHeader className={`text-center ${tier.popular ? 'pt-12' : 'pt-8'} pb-4`}>
                  <div 
                    className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
                    style={{ backgroundColor: tier.color }}
                  >
                    <IconComponent className="w-10 h-10 text-white" />
                  </div>
                  
                  <CardTitle className="text-3xl font-bold" style={{ color: '#333A45' }}>
                    {tier.name}
                  </CardTitle>
                  
                  <div className="text-4xl font-bold mb-2" style={{ color: tier.color }}>
                    {tier.price}
                  </div>
                  
                  <CardDescription className="text-lg">
                    Upload up to <strong>{tier.images} image{tier.images > 1 ? 's' : ''}</strong>
                  </CardDescription>
                </CardHeader>

                <CardContent className="px-8 pb-8">
                  <ul className="space-y-4 mb-8">
                    {tier.features.map((feature, index) => (
                      <li key={index} className="flex items-center space-x-3">
                        <div 
                          className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: tier.color }}
                        >
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link to={`/categories?tier=${tier.id}`} className="block">
                    <Button 
                      className={`w-full h-12 text-lg font-semibold rounded-xl transition-all ${
                        tier.popular 
                          ? 'text-white shadow-lg hover:shadow-xl transform hover:scale-105' 
                          : 'text-white hover:opacity-90'
                      }`}
                      style={{ backgroundColor: tier.color }}
                    >
                      Choose {tier.name}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Additional Info */}
        <div className="mt-12 text-center">
          <Card className="bg-white border-0 rounded-2xl shadow-lg max-w-2xl mx-auto">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold mb-4" style={{ color: '#333A45' }}>
                Why Choose Higher Tiers?
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                <div>
                  <h4 className="font-semibold mb-2" style={{ color: '#96C2DB' }}>More Visibility</h4>
                  <p className="text-gray-600">Higher tier listings appear first in search results and get more views.</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2" style={{ color: '#96C2DB' }}>Better Presentation</h4>
                  <p className="text-gray-600">Multiple images help buyers see your phone from all angles.</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2" style={{ color: '#96C2DB' }}>Faster Sales</h4>
                  <p className="text-gray-600">Premium listings typically sell 3x faster than basic ones.</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2" style={{ color: '#96C2DB' }}>Support Priority</h4>
                  <p className="text-gray-600">Get faster response times for any questions or issues.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TierSelection;

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, MapPin, Clock, Phone } from 'lucide-react';
import { formatPrice, formatDate } from '@/lib/utils';

export default function PostCard({ post }) {
  const {
    id,
    title,
    brand,
    model,
    condition,
    price,
    location,
    isVerified,
    createdAt,
    expiresAt,
    images,
    contactNumber
  } = post;

  const daysLeft = Math.ceil((new Date(expiresAt) - new Date()) / (1000 * 60 * 60 * 24));

  // Helper to get full image URL
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
  const getImageUrl = (img) => {
    if (!img) return '/placeholder.svg';
    if (img.startsWith('/uploads/')) return baseUrl + img;
    if (img.startsWith('http')) return img;
    return '/placeholder.svg';
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {/* Image */}
      <div className="aspect-video bg-gray-100 relative">
        {images && images.length > 0 ? (
          <img
            src={getImageUrl(images[0])}
            alt={title}
            className="w-full h-full object-cover"
            onError={e => { e.target.onerror = null; e.target.src = "/placeholder.svg"; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            No Image
          </div>
        )}
        
        {/* Verification Badge */}
        {isVerified && (
          <Badge className="absolute top-2 right-2 bg-green-600">
            <Shield className="w-3 h-3 mr-1" />
            Verified
          </Badge>
        )}
      </div>

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          <div className="text-right">
            <p className="text-2xl font-bold text-green-600">{formatPrice(price)}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <span>{brand}</span>
          <span>•</span>
          <span>{model}</span>
          <span>•</span>
          <Badge variant="outline" className="text-xs">
            {condition}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {/* Location */}
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <MapPin className="w-4 h-4" />
            <span>{location}</span>
          </div>

          {/* Time Info */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2 text-gray-600">
              <Clock className="w-4 h-4" />
              <span>Posted {formatDate(createdAt)}</span>
            </div>
            <Badge 
              variant={daysLeft <= 3 ? "destructive" : "secondary"}
              className="text-xs"
            >
              {daysLeft > 0 ? `${daysLeft} days left` : 'Expired'}
            </Badge>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2 pt-2">
            <Button 
              className="flex-1" 
              onClick={() => window.open(`tel:${contactNumber}`)}
            >
              <Phone className="w-4 h-4 mr-2" />
              Call
            </Button>
            <Button variant="outline" className="flex-1">
              View Details
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

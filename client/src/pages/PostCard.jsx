import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MapPin, Clock, Eye, Shield, Phone } from "lucide-react";

import { useTranslation } from 'react-i18next';

const PostCard = ({ post, onContact, onBuy, showActions = true }) => {
  const { t } = useTranslation();
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {/* Image Section */}
      <div className="aspect-video bg-gray-200 relative">
        <img
          src={post.images[0] || "/placeholder.svg"}
          alt={post.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-2 right-2">
          <Badge variant={post.status === 'Active' ? 'default' : 'secondary'}>
            {post.status}
          </Badge>
        </div>
      </div>

      {/* Header */}
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{post.title}</CardTitle>
            <CardDescription className="mt-1">
              {post.condition} â€¢ {post.age} {t("old") || "old"}
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-green-600">{post.price}</p>
          </div>
        </div>
      </CardHeader>

      {/* Content */}
      <CardContent>
        <div className="space-y-3">
          {/* Seller Info */}
          <div className="flex items-center space-x-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs">
                {post.sellerName
                  .split(' ')
                  .map(word => word[0])
                  .join('')
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm">{post.sellerName}</span>
            {post.sellerVerified && <Shield className="w-3 h-3 text-green-600" />}
            <Badge variant="outline" className="text-xs">
              {post.sellerRank}
            </Badge>
          </div>

          {/* Location & Meta Info */}
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <MapPin className="w-4 h-4" />
            <span>{post.location}</span>
          </div>

          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center space-x-1">
              <Eye className="w-4 h-4" />
              <span>{post.views} {t("views") || "views"}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock className="w-4 h-4" />
              <span>{post.daysLeft} {t("days") || "days"} {t("remaining") || "remaining"}</span>
            </div>
          </div>

          {/* Warranty */}
          <div className="flex items-center space-x-2 text-sm">
            <span className="font-medium">{t("warranty") || "Warranty"}:</span>
            <Badge variant={post.warranty === 'Active' ? 'default' : 'secondary'}>
              {post.warranty}
            </Badge>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-600 line-clamp-2">
            {post.description}
          </p>

          {/* Action Buttons */}
          {showActions && (
            <div className="post-action-row flex flex-nowrap items-center gap-2 overflow-x-auto whitespace-nowrap pt-2 scrollbar-hide">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onContact && onContact(post)}
                className="flex-1 min-w-[120px] h-9 text-xs sm:text-sm"
              >
                <Phone className="w-4 h-4 mr-1" />{t("contact") || "Contact"}</Button>
              <Button
                size="sm"
                onClick={() => onBuy && onBuy(post.id)}
                className="flex-1 min-w-[120px] h-9 text-xs sm:text-sm"
                disabled={post.status !== 'Active'}
              >{t("buy_now") || "Buy Now"}</Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PostCard;








import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight, 
  MapPin, 
  Calendar, 
  Star, 
  Shield, 
  Eye, 
  MessageCircle, 
  Phone, 
  Share2,
  Heart,
  User,
  Package,
  CheckCircle2,
  Clock
} from "lucide-react";

const PostDetailView = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { post, type } = location.state || {};
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(false);

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Post not found</h2>
          <Button onClick={() => navigate(-1)} className="bg-blue-500 hover:bg-blue-600">
            Back to Posts
          </Button>
        </div>
      </div>
    );
  }

  const nextImage = () => {
    if (post.images && post.images.length > 1) {
      setCurrentImageIndex((prev) => (prev + 1) % post.images.length);
    }
  };

  const prevImage = () => {
    if (post.images && post.images.length > 1) {
      setCurrentImageIndex((prev) => (prev - 1 + post.images.length) % post.images.length);
    }
  };

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/post/${post.postId}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert('Link copied to clipboard!');
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-4">
        {/* Back Button */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className="text-gray-700 hover:bg-gray-100"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to My Posts
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Image Section */}
          <div className="lg:col-span-2">
            <Card className="shadow-lg border-0 rounded-2xl overflow-hidden">
              <div className="relative">
                <img
                  src={post.image || (post.images && post.images[currentImageIndex])}
                  alt={post.title}
                  className="w-full h-96 object-cover"
                  onError={e => { e.target.onerror = null; e.target.src = "/placeholder.svg"; }}
                />
                
                {post.images && post.images.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-3 rounded-full hover:bg-black/70 transition-all"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-3 rounded-full hover:bg-black/70 transition-all"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}

                <Badge className="absolute top-4 left-4 bg-blue-500 text-white font-semibold">
                  {type === 'active' ? 'Active' :
                   type === 'sold' ? 'Sold' :
                   type === 'bought' ? 'Purchased' : 'My Post'}
                </Badge>

                {post.views && (
                  <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm flex items-center space-x-1">
                    <Eye className="w-4 h-4" />
                    <span>{post.views}</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Description */}
            <Card className="shadow-lg border-0 rounded-2xl mt-6">
              <CardHeader>
                <CardTitle className="text-gray-800">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 leading-relaxed">
                  {post.description || "No description provided for this item."}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Details Section */}
          <div className="space-y-6">
            {/* Post Details */}
            <Card className="shadow-lg border-0 rounded-2xl">
              <CardHeader>
                <CardTitle className="text-gray-800">{post.title}</CardTitle>
                <div className="text-sm text-gray-500 font-mono">
                  Post ID: {post.postId}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                  <span className="text-3xl font-bold text-green-600">
                    ₹{typeof post.price === 'number' ? post.price.toLocaleString() : post.price}
                  </span>
                  {post.originalPrice && (
                    <span className="text-lg text-gray-400 line-through">
                      ₹{typeof post.originalPrice === 'number' ? post.originalPrice.toLocaleString() : post.originalPrice}
                    </span>
                  )}
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Condition</span>
                    <Badge variant="outline">{post.condition}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Age</span>
                    <span className="text-gray-800">{post.age}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Location</span>
                    <div className="flex items-center space-x-1 text-gray-800">
                      <MapPin className="w-3 h-3" />
                      <span>{post.location}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Posted</span>
                    <div className="flex items-center space-x-1 text-gray-800">
                      <Calendar className="w-3 h-3" />
                      <span>{post.postedDate}</span>
                    </div>
                  </div>
                </div>

                {/* Stats for active posts */}
                {(type === 'active' || type === 'all') && (
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div className="bg-blue-50 rounded-lg p-3 text-center">
                      <div className="font-semibold text-blue-600">{post.views || 0}</div>
                      <div className="text-xs text-blue-500">Views</div>
                    </div>
                    <div className="bg-red-50 rounded-lg p-3 text-center">
                      <div className="font-semibold text-red-600">{post.likes || 0}</div>
                      <div className="text-xs text-red-500">Likes</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3 text-center">
                      <div className="font-semibold text-green-600">{post.inquiries || 0}</div>
                      <div className="text-xs text-green-500">Inquiries</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sale/Purchase Details for sold/bought posts */}
            {(type === 'sold' || type === 'bought') && (
              <Card className={`shadow-lg border-0 rounded-2xl ${
                type === 'sold' ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'
              }`}>
                <CardHeader>
                  <CardTitle className={`${
                    type === 'sold' ? 'text-green-800' : 'text-orange-800'
                  }`}>
                    {type === 'sold' ? 'Sale Details' : 'Purchase Details'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      {type === 'sold' ? 'Buyer:' : 'Seller:'}
                    </span>
                    <div className="text-right">
                      <div className="font-semibold">
                        {type === 'sold' ? post.buyerName : post.sellerName}
                      </div>
                      <div className="text-xs text-gray-500 font-mono">
                        {type === 'sold' ? post.buyerId : post.sellerId}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      {type === 'sold' ? 'Sale Date:' : 'Purchase Date:'}
                    </span>
                    <span className="font-semibold">
                      {type === 'sold' ? post.saleDate : post.purchaseDate}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Phone:</span>
                    <span className="font-semibold">
                      {type === 'sold' ? post.buyerPhone : post.sellerPhone}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <Card className="shadow-lg border-0 rounded-2xl">
              <CardContent className="p-4 space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setIsLiked(!isLiked)}
                >
                  <Heart className={`w-4 h-4 mr-2 ${isLiked ? 'fill-current text-red-500' : ''}`} />
                  {isLiked ? 'Saved' : 'Save'}
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={handleShare}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Post
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostDetailView;

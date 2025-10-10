
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Flag
} from "lucide-react";

const PostDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
        const response = await fetch(`${baseUrl}/api/posts/${id}`);
        if (!response.ok) {
          throw new Error('Post not found');
        }
        const data = await response.json();
        setPost(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-soft-gray flex items-center justify-center">
        <p className="text-xl text-text-primary">Loading post details...</p>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-soft-gray flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-text-primary mb-4">{error || 'Post not found'}</h2>
          <Link to="/all-posts">
            <Button className="btn-primary-modern">Back to All Posts</Button>
          </Link>
        </div>
      </div>
    );
  }

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % post.images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + post.images.length) % post.images.length);
  };

  return (
    <div className="min-h-screen bg-soft-gray">
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        {/* Back Button */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className="text-text-primary hover:bg-light-blue"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Posts
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Image Section */}
          <div className="lg:col-span-2">
            <Card className="card-modern">
              <CardContent className="p-0">
                <div className="relative">
                  <img
                    src={post.images[currentImageIndex] || '/placeholder.svg'}
                    alt={post.title}
                    className="w-full h-96 object-cover rounded-t-2xl"
                    onError={e => { e.target.onerror = null; e.target.src = '/placeholder.svg'; }}
                  />
                  
                  {post.images.length > 1 && (
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
                      
                      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                        {post.images.map((_, index) => (
                          <button
                            key={index}
                            onClick={() => setCurrentImageIndex(index)}
                            className={`w-3 h-3 rounded-full ${
                              index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                            }`}
                          />
                        ))}
                      </div>
                    </>
                  )}

                  <Badge className={`absolute top-4 left-4 ${
                    post.tier === 'premium' ? 'bg-gradient-to-r from-warning-orange to-error-red' :
                    post.tier === 'silver' ? 'bg-gradient-to-r from-gray-400 to-gray-500' :
                    'bg-gradient-to-r from-success-green to-accent-green'
                  } text-white font-semibold`}>
                    {post.tier.toUpperCase()}
                  </Badge>

                  <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm flex items-center space-x-1">
                    <Eye className="w-4 h-4" />
                    <span>{post.views}</span>
                  </div>
                </div>

                {/* Thumbnail Strip */}
                {post.images.length > 1 && (
                  <div className="p-4 border-t border-border-gray">
                    <div className="flex space-x-2 overflow-x-auto">
                      {post.images.map((image, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentImageIndex(index)}
                          className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden ${
                            index === currentImageIndex ? 'ring-2 ring-primary-blue' : ''
                          }`}
                        >
                          <img
                            src={image || '/placeholder.svg'}
                            onError={e => { e.target.onerror = null; e.target.src = '/placeholder.svg'; }}
                            alt={`${post.title} ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Description */}
            <Card className="card-modern mt-6">
              <CardHeader>
                <CardTitle className="text-text-primary">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-text-primary leading-relaxed">
                  {post.description || "No description provided for this item."}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Details Section */}
          <div className="space-y-6">
            {/* Seller Info */}
            <Card className="card-modern">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4 mb-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary-blue text-white">
                      {post.seller.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold text-text-primary">{post.seller.name}</h3>
                      {post.seller.verified && <Shield className="w-4 h-4 text-success-green" />}
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-text-secondary">
                      <Star className="w-3 h-3 text-warning-orange fill-current" />
                      <span>{post.seller.rating}</span>
                      <span>•</span>
                      <span>ID: {post.seller.id}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Button className="btn-primary-modern">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Chat
                  </Button>
                  <Button className="bg-success-green hover:bg-success-green/90 text-white">
                    <Phone className="w-4 h-4 mr-2" />
                    Call
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Post Details */}
            <Card className="card-modern">
              <CardHeader>
                <CardTitle className="text-text-primary">{post.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                  <span className="text-3xl font-bold text-success-green">{post.price}</span>
                  {post.originalPrice && (
                    <span className="text-lg text-text-secondary line-through">{post.originalPrice}</span>
                  )}
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Condition</span>
                    <Badge variant="outline">{post.condition}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Age</span>
                    <span className="text-text-primary">{post.age}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Category</span>
                    <span className="text-text-primary">{post.category}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-text-secondary">Location</span>
                    <div className="flex items-center space-x-1 text-text-primary">
                      <MapPin className="w-3 h-3" />
                      <span>{post.location}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-text-secondary">Posted</span>
                    <div className="flex items-center space-x-1 text-text-primary">
                      <Calendar className="w-3 h-3" />
                      <span>{post.postedDate}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <Card className="card-modern">
              <CardContent className="p-4 space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full btn-secondary-modern"
                  onClick={() => setIsLiked(!isLiked)}
                >
                  <Heart className={`w-4 h-4 mr-2 ${isLiked ? 'fill-current text-error-red' : ''}`} />
                  {isLiked ? 'Saved' : 'Save'}
                </Button>
                <Button variant="outline" className="w-full btn-secondary-modern">
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
                <Button variant="outline" className="w-full text-error-red border-error-red hover:bg-error-red/10">
                  <Flag className="w-4 h-4 mr-2" />
                  Report
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostDetail;

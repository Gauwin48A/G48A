
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { 
  Star, 
  Search, 
  Calendar, 
  MapPin, 
  User,
  Shield,
  CheckCircle,
  ArrowLeft
} from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from '../components/Navbar';

const SoldPosts = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');

  const [soldPosts, setSoldPosts] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    setLoading(true);
    fetch('http://localhost:5000/api/posts/sold')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setSoldPosts(data);
          setError(null);
        } else {
          setError(data.error || 'Failed to fetch sold posts');
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Failed to fetch sold posts');
        setLoading(false);
      });
  }, []);

  const handleRateBuyer = (postId, buyerId) => {
    toast({
      title: "Rate Buyer",
      description: `Opening rating form for buyer ${buyerId} on post ${postId}`
    });
  };

  const handleContactBuyer = (phone) => {
    window.open(`tel:${phone}`, '_self');
  };

  const filteredPosts = soldPosts.filter(post =>
    post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.postId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.buyer.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalEarnings = soldPosts.reduce((sum, post) => sum + post.price, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-6xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-6">
          <Link to="/profile" className="flex items-center text-blue-600 hover:text-blue-700">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Profile
          </Link>
        </div>

        <Card className="shadow-lg border-0 rounded-2xl">
          <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold flex items-center">
                  <CheckCircle className="w-8 h-8 mr-3" />
                  Sold Posts
                </CardTitle>
                <CardDescription className="text-green-100 text-lg">
                  Your successful sales and transactions
                </CardDescription>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">₹{totalEarnings.toLocaleString()}</div>
                <div className="text-green-100">Total Earnings</div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-6">
            {/* Search and Stats */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by title, Post ID, or buyer name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-12 border-2 border-gray-200 focus:border-green-500 rounded-xl"
                />
              </div>
              
              <div className="flex items-center space-x-4">
                <Badge variant="outline" className="px-4 py-2 text-lg">
                  Total: {filteredPosts.length}
                </Badge>
                <Badge className="bg-green-500 text-white px-4 py-2 text-lg">
                  Sold Items
                </Badge>
              </div>
            </div>

            {/* Posts Grid */}
            {filteredPosts.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-2xl font-semibold mb-2 text-gray-800">No sold posts found</h3>
                <p className="text-gray-600 text-lg">
                  {searchTerm ? 'No posts match your search criteria.' : 'You haven\'t sold any items yet.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredPosts.map((post) => (
                  <Card key={post.id} className="shadow-lg hover:shadow-xl transition-shadow border-0 rounded-2xl overflow-hidden">
                    <div className="flex">
                      {/* Image */}
                      <div className="relative w-32 h-32 flex-shrink-0">
                        <img
                          src={post.image || '/placeholder.svg'}
                          onError={e => { e.target.onerror = null; e.target.src = '/placeholder.svg'; }}
                          alt={post.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 left-2">
                          <Badge className="bg-green-500 text-white text-xs">
                            SOLD
                          </Badge>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-bold text-lg text-gray-900 leading-tight">{post.title}</h3>
                            <p className="text-sm text-gray-600">Post ID: <span className="font-mono font-semibold">{post.postId}</span></p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-xl font-bold text-green-600">₹{post.price.toLocaleString()}</span>
                          {post.originalPrice && (
                            <span className="text-sm text-gray-500 line-through">₹{post.originalPrice.toLocaleString()}</span>
                          )}
                        </div>

                        {/* Buyer Info */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                          <div className="flex items-center space-x-3 mb-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-blue-500 text-white text-sm">
                                {post.buyer.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-semibold text-gray-800">{post.buyer.name}</span>
                                {post.buyer.verified && <Shield className="w-3 h-3 text-green-500" />}
                              </div>
                              <p className="text-xs text-gray-600">Buyer ID: {post.buyer.id}</p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleContactBuyer(post.buyer.phone)}
                            className="text-blue-600 border-blue-300 hover:bg-blue-50 text-xs"
                          >
                            Contact Buyer
                          </Button>
                        </div>

                        {/* Sale Details */}
                        <div className="space-y-1 mb-3 text-sm text-gray-600">
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-3 h-3" />
                            <span>Sold: {post.soldDate}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <MapPin className="w-3 h-3" />
                            <span>{post.location}</span>
                          </div>
                        </div>

                        {/* Rating */}
                        {post.rating && (
                          <div className="flex items-center space-x-1 mb-2">
                            {[...Array(5)].map((_, i) => (
                              <Star 
                                key={i} 
                                className={`w-3 h-3 ${i < post.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                              />
                            ))}
                            <span className="text-sm text-gray-600 ml-1">({post.rating}/5)</span>
                          </div>
                        )}

                        {/* Feedback */}
                        {post.feedback && (
                          <div className="bg-gray-50 rounded-lg p-2 mb-3">
                            <p className="text-sm text-gray-700 italic">"{post.feedback}"</p>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={() => handleRateBuyer(post.postId, post.buyer.id)}
                            className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                          >
                            <User className="w-3 h-3 mr-1" />
                            Rate Buyer
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SoldPosts;

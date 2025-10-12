
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
  ShoppingBag,
  ArrowLeft
} from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from '../components/Navbar';

const BoughtPosts = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');

  const [boughtItems, setBoughtItems] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    setLoading(true);
    fetch('http://localhost:5000/api/posts/bought')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setBoughtItems(data);
          setError(null);
        } else {
          setError(data.error || 'Failed to fetch bought posts');
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Failed to fetch bought posts');
        setLoading(false);
      });
  }, []);

  const handleRateSeller = (postId, sellerId) => {
    toast({
      title: "Rate Seller",
      description: `Opening rating form for seller ${sellerId} on post ${postId}`
    });
  };

  const handleContactSeller = (phone) => {
    window.open(`tel:${phone}`, '_self');
  };

  const filteredItems = boughtItems.filter(item =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.postId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.seller.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalSpent = boughtItems.reduce((sum, item) => sum + item.price, 0);

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
          <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold flex items-center">
                  <ShoppingBag className="w-8 h-8 mr-3" />
                  Bought Posts
                </CardTitle>
                <CardDescription className="text-purple-100 text-lg">
                  Items you have purchased from other sellers
                </CardDescription>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">₹{totalSpent.toLocaleString()}</div>
                <div className="text-purple-100">Total Spent</div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-6">
            {/* Search and Stats */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by title, Post ID, or seller name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-12 border-2 border-gray-200 focus:border-purple-500 rounded-xl"
                />
              </div>
              
              <div className="flex items-center space-x-4">
                <Badge variant="outline" className="px-4 py-2 text-lg">
                  Total: {filteredItems.length}
                </Badge>
                <Badge className="bg-purple-500 text-white px-4 py-2 text-lg">
                  Purchased Items
                </Badge>
              </div>
            </div>

            {/* Items Grid */}
            {filteredItems.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-2xl font-semibold mb-2 text-gray-800">No purchased items found</h3>
                <p className="text-gray-600 text-lg">
                  {searchTerm ? 'No items match your search criteria.' : 'You haven\'t purchased any items yet.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredItems.map((item) => (
                  <Card key={item.id} className="shadow-lg hover:shadow-xl transition-shadow border-0 rounded-2xl overflow-hidden">
                    <div className="flex">
                      {/* Image */}
                      <div className="relative w-32 h-32 flex-shrink-0">
                        <img
                          src={item.image || '/placeholder.svg'}
                          onError={e => { e.target.onerror = null; e.target.src = '/placeholder.svg'; }}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 left-2">
                          <Badge className="bg-purple-500 text-white text-xs">
                            PURCHASED
                          </Badge>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-bold text-lg text-gray-900 leading-tight">{item.title}</h3>
                            <p className="text-sm text-gray-600">Post ID: <span className="font-mono font-semibold">{item.postId}</span></p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-xl font-bold text-purple-600">₹{item.price.toLocaleString()}</span>
                          {item.originalPrice && (
                            <span className="text-sm text-gray-500 line-through">₹{item.originalPrice.toLocaleString()}</span>
                          )}
                        </div>

                        {/* Seller Info */}
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                          <div className="flex items-center space-x-3 mb-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-green-500 text-white text-sm">
                                {item.seller.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-semibold text-gray-800">{item.seller.name}</span>
                                {item.seller.verified && <Shield className="w-3 h-3 text-green-500" />}
                              </div>
                              <p className="text-xs text-gray-600">Seller ID: {item.seller.id}</p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleContactSeller(item.seller.phone)}
                            className="text-green-600 border-green-300 hover:bg-green-50 text-xs"
                          >
                            Contact Seller
                          </Button>
                        </div>

                        {/* Purchase Details */}
                        <div className="space-y-1 mb-3 text-sm text-gray-600">
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-3 h-3" />
                            <span>Purchased: {item.purchaseDate}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <MapPin className="w-3 h-3" />
                            <span>{item.location}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm">Status: </span>
                            <Badge className={item.status === 'delivered' ? 'bg-green-500' : 'bg-blue-500'}>
                              {item.status.toUpperCase()}
                            </Badge>
                          </div>
                        </div>

                        {/* Rating */}
                        {item.rating ? (
                          <div className="flex items-center space-x-1 mb-2">
                            {[...Array(5)].map((_, i) => (
                              <Star 
                                key={i} 
                                className={`w-3 h-3 ${i < item.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                              />
                            ))}
                            <span className="text-sm text-gray-600 ml-1">({item.rating}/5)</span>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500 mb-2">Not rated yet</div>
                        )}

                        {/* Feedback */}
                        {item.feedback && (
                          <div className="bg-gray-50 rounded-lg p-2 mb-3">
                            <p className="text-sm text-gray-700 italic">"{item.feedback}"</p>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={() => handleRateSeller(item.postId, item.seller.id)}
                            className="flex-1 bg-purple-500 hover:bg-purple-600 text-white"
                            disabled={item.rating !== null}
                          >
                            <User className="w-3 h-3 mr-1" />
                            {item.rating ? 'Rated' : 'Rate Seller'}
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

export default BoughtPosts;

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Clock, Eye, MapPin, ArrowLeft, Trash2, ExternalLink
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

const RecentlyViewed = () => {
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('authToken');
        const userId = localStorage.getItem('userId');
        setIsAuthenticated(!!(token && userId));
    }, []);

    useEffect(() => {
        if (!isAuthenticated) return;

        const fetchRecentlyViewed = async () => {
            setLoading(true);
            try {
                const userId = localStorage.getItem('userId');
                const res = await api.get(`/api/recently-viewed?userId=${userId}`);
                setItems(res.data?.items || []);
            } catch (err) {
                console.error('Failed to fetch:', err);
                setItems([]);
            } finally {
                setLoading(false);
            }
        };
        fetchRecentlyViewed();
    }, [isAuthenticated]);

    const getImageUrl = (item) => {
        const img = item.images?.[0] || item.image_url;
        if (!img) return '/placeholder.svg';
        if (img.startsWith('http')) return img;
        return `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}${img}`;
    };

    const formatTimeAgo = (date) => {
        const now = new Date();
        const viewed = new Date(date);
        const diff = Math.floor((now - viewed) / 1000);
        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
                <div className="bg-white/10 backdrop-blur-2xl rounded-3xl p-8 border border-white/20 shadow-2xl max-w-md w-full text-center">
                    <Clock className="w-16 h-16 text-blue-400 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-white mb-3">Sign in to view history</h1>
                    <p className="text-gray-300 mb-6">See items you've browsed recently</p>
                    <Button
                        onClick={() => navigate('/login')}
                        className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-6 text-lg rounded-xl"
                    >
                        Sign In
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
            {/* Header */}
            <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
                <div className="relative max-w-7xl mx-auto px-4 py-12">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-white/20 hover:bg-white/30">
                            <ArrowLeft className="w-6 h-6 text-white" />
                        </button>
                        <div>
                            <div className="flex items-center gap-3">
                                <Clock className="w-8 h-8 text-blue-200" />
                                <h1 className="text-3xl md:text-4xl font-bold text-white">Recently Viewed</h1>
                            </div>
                            <p className="text-blue-100 mt-1">{items.length} items in your history</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 py-8">
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="bg-white/60 rounded-3xl p-5 animate-pulse">
                                <div className="w-full h-48 bg-gray-200 rounded-2xl mb-4" />
                                <div className="h-5 bg-gray-200 rounded-full w-3/4 mb-3" />
                            </div>
                        ))}
                    </div>
                ) : items.length === 0 ? (
                    <div className="text-center py-24">
                        <Clock className="w-24 h-24 text-blue-300 mx-auto mb-6" />
                        <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-3">No browsing history</h3>
                        <p className="text-gray-500 mb-6">Start exploring products!</p>
                        <Button onClick={() => navigate('/all-posts')} className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-8 py-6 text-lg rounded-2xl">
                            Browse Products
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {items.map((item, idx) => (
                            <Card key={idx} className="group bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-3xl overflow-hidden border shadow-xl hover:shadow-2xl transition-all">
                                <div className="relative w-full h-48 overflow-hidden">
                                    <img src={getImageUrl(item)} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" onError={(e) => { e.target.src = '/placeholder.svg'; }} />
                                    <Badge className="absolute top-3 left-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-0">
                                        {item.category_name || 'General'}
                                    </Badge>
                                    <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur px-2 py-1 rounded-lg flex items-center gap-1">
                                        <Eye className="w-3 h-3 text-white" />
                                        <span className="text-white text-xs">{formatTimeAgo(item.viewed_at)}</span>
                                    </div>
                                </div>
                                <div className="p-4">
                                    <h3 className="font-bold text-gray-800 dark:text-white text-lg mb-2 line-clamp-1">{item.title}</h3>
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-xl font-bold bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent">₹{item.price?.toLocaleString() || '0'}</span>
                                        <div className="flex items-center gap-1 text-gray-500 text-sm">
                                            <MapPin className="w-3 h-3" />{item.location || 'N/A'}
                                        </div>
                                    </div>
                                    <Button onClick={() => navigate(`/post/${item.post_id}`)} className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl">
                                        <ExternalLink className="w-4 h-4 mr-2" /> View Again
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RecentlyViewed;

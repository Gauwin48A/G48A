import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
    History, Trash2, MapPin, Clock, Eye, Heart,
    ArrowLeft, XCircle, Sparkles, ShoppingBag, Newspaper,
    Grid3X3, List, RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

const RecentlyViewed = () => {
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [toast, setToast] = useState(null);
    const [activeTab, setActiveTab] = useState('all');
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

    useEffect(() => {
        fetchHistory();
    }, [activeTab]);

    const fetchHistory = async () => {
        try {
            setLoading(true);
            setError(null);
            const userId = localStorage.getItem('userId');
            const token = localStorage.getItem('authToken');

            if (!userId || !token) {
                setError('Please login to view your browsing history');
                setLoading(false);
                return;
            }

            const params = { userId, limit: 50 };
            if (activeTab !== 'all') {
                params.source = activeTab;
            }

            const response = await api.get('/api/recently-viewed', {
                headers: { Authorization: `Bearer ${token}` },
                params
            });

            setItems(response.data.items || []);
        } catch (err) {
            console.error('Failed to fetch history:', err);
            if (err.response?.status === 401) {
                setError('Session expired. Please login again.');
                localStorage.removeItem('authToken');
            } else {
                setError('Failed to load browsing history');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleRemove = async (postId) => {
        try {
            const token = localStorage.getItem('authToken');
            await api.delete(`/api/recently-viewed/${postId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setItems(items.filter(item => item.post_id !== postId));
            showToast('Removed from history');
        } catch (err) {
            showToast('Failed to remove', 'error');
        }
    };

    const handleClearAll = async () => {
        if (!window.confirm('Clear all browsing history?')) return;

        try {
            const token = localStorage.getItem('authToken');
            await api.delete('/api/recently-viewed/clear', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setItems([]);
            showToast('History cleared');
        } catch (err) {
            showToast('Failed to clear history', 'error');
        }
    };

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const getImageUrl = (item) => {
        if (item.images) {
            if (Array.isArray(item.images) && item.images.length > 0) {
                return item.images[0];
            } else if (typeof item.images === 'string') {
                try {
                    const parsed = JSON.parse(item.images);
                    return Array.isArray(parsed) ? parsed[0] : item.images;
                } catch {
                    return item.images;
                }
            }
        }
        return 'https://via.placeholder.com/300x200?text=No+Image';
    };

    const formatTimeAgo = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    };

    const formatPrice = (price) => {
        if (!price) return '₹ --';
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(price);
    };

    const tabs = [
        { id: 'all', label: 'All', icon: Sparkles, color: 'from-blue-500 to-indigo-600' },
        { id: 'allposts', label: 'All Posts', icon: ShoppingBag, color: 'from-emerald-500 to-teal-600' },
        { id: 'feed', label: 'Feed', icon: Newspaper, color: 'from-purple-500 to-pink-600' }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-900">
            {/* Premium Header with Glassmorphism */}
            <div className="sticky top-0 z-50 bg-gradient-to-r from-slate-900/95 via-gray-900/95 to-slate-900/95 backdrop-blur-xl border-b border-white/10">
                <div className="max-w-6xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => navigate(-1)}
                                className="text-gray-300 hover:text-white hover:bg-white/10 rounded-xl"
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                            <div>
                                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent flex items-center gap-2">
                                    <History className="h-6 w-6 text-blue-400" />
                                    Recently Viewed
                                </h1>
                                <p className="text-sm text-gray-400 mt-0.5">{items.length} items in your history</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* View Toggle */}
                            <div className="flex bg-gray-800/50 rounded-xl p-1">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-2 rounded-lg transition-all ${viewMode === 'grid'
                                        ? 'bg-blue-600 text-white'
                                        : 'text-gray-400 hover:text-white'}`}
                                >
                                    <Grid3X3 className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-2 rounded-lg transition-all ${viewMode === 'list'
                                        ? 'bg-blue-600 text-white'
                                        : 'text-gray-400 hover:text-white'}`}
                                >
                                    <List className="h-4 w-4" />
                                </button>
                            </div>
                            {/* Refresh */}
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={fetchHistory}
                                className="text-gray-400 hover:text-white hover:bg-white/10 rounded-xl"
                            >
                                <RefreshCw className="h-4 w-4" />
                            </Button>
                            {/* Clear All */}
                            {items.length > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleClearAll}
                                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl"
                                >
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    Clear All
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modern Tab Navigation */}
            <div className="max-w-6xl mx-auto px-4 py-4">
                <div className="flex gap-3 p-1.5 bg-gray-800/30 rounded-2xl backdrop-blur-sm">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-semibold text-sm transition-all duration-300 ${isActive
                                    ? `bg-gradient-to-r ${tab.color} text-white shadow-lg shadow-${tab.color.split('-')[1]}-500/25 scale-[1.02]`
                                    : 'bg-transparent text-gray-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <Icon className={`h-4 w-4 ${isActive ? 'animate-pulse' : ''}`} />
                                {tab.label}
                                {isActive && items.length > 0 && (
                                    <span className="bg-white/20 text-xs px-2 py-0.5 rounded-full">{items.length}</span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Content */}
            <div className="max-w-6xl mx-auto px-4 pb-32">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-64 gap-4">
                        <div className="relative">
                            <div className="w-16 h-16 border-4 border-blue-500/30 rounded-full"></div>
                            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-blue-500 rounded-full animate-spin"></div>
                        </div>
                        <p className="text-gray-400">Loading your history...</p>
                    </div>
                ) : error ? (
                    <div className="text-center py-16">
                        <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <XCircle className="h-10 w-10 text-red-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-white mb-2">Something went wrong</h3>
                        <p className="text-gray-400 mb-6">{error}</p>
                        <Button
                            onClick={fetchHistory}
                            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl px-6"
                        >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Try Again
                        </Button>
                    </div>
                ) : items.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="w-24 h-24 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <History className="h-12 w-12 text-blue-400" />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-3">No Browsing History</h3>
                        <p className="text-gray-400 mb-8 max-w-md mx-auto">
                            Posts you view will appear here. Start exploring to build your history!
                        </p>
                        <Button
                            onClick={() => navigate('/all-posts')}
                            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-2xl px-8 py-6 text-lg font-semibold shadow-xl shadow-blue-500/25"
                        >
                            <ShoppingBag className="h-5 w-5 mr-2" />
                            Browse Posts
                        </Button>
                    </div>
                ) : (
                    <div className={viewMode === 'grid'
                        ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                        : 'flex flex-col gap-4'
                    }>
                        {items.map((item) => (
                            viewMode === 'grid' ? (
                                /* Grid View Card */
                                <Card
                                    key={item.id || item.post_id}
                                    className="group bg-gradient-to-br from-gray-800/80 to-gray-900/80 border-gray-700/50 overflow-hidden cursor-pointer hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 rounded-2xl"
                                    onClick={() => navigate(`/post/${item.post_id}`)}
                                >
                                    {/* Image Container */}
                                    <div className="relative aspect-[4/3] overflow-hidden">
                                        <img
                                            src={getImageUrl(item)}
                                            alt={item.title}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                            onError={(e) => { e.target.src = 'https://via.placeholder.com/300x200?text=No+Image'; }}
                                        />
                                        {/* Gradient Overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>

                                        {/* Status Badge */}
                                        <Badge
                                            className={`absolute top-3 right-3 px-3 py-1 text-xs font-bold rounded-full ${item.status === 'active'
                                                ? 'bg-emerald-500/90 text-white'
                                                : item.status === 'sold'
                                                    ? 'bg-red-500/90 text-white'
                                                    : 'bg-gray-500/90 text-white'
                                                }`}
                                        >
                                            {item.status || 'active'}
                                        </Badge>

                                        {/* View Count */}
                                        <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-sm text-white px-2 py-1 rounded-lg text-xs flex items-center gap-1">
                                            <Eye className="h-3 w-3" />
                                            {item.view_count || 1}x viewed
                                        </div>

                                        {/* Price Tag */}
                                        <div className="absolute bottom-3 left-3">
                                            <p className="text-2xl font-bold text-white drop-shadow-lg">
                                                {formatPrice(item.price)}
                                            </p>
                                        </div>

                                        {/* Delete Button */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRemove(item.post_id);
                                            }}
                                            className="absolute bottom-3 right-3 p-2 bg-black/50 backdrop-blur-sm rounded-full text-gray-300 hover:text-red-400 hover:bg-red-500/20 transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>

                                    {/* Content */}
                                    <div className="p-4">
                                        {/* Category Badge */}
                                        {item.category_name && (
                                            <Badge className="mb-2 bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs px-2 py-0.5 rounded-lg">
                                                {item.category_name}
                                            </Badge>
                                        )}

                                        <h3 className="text-white font-semibold text-lg truncate mb-2 group-hover:text-blue-400 transition-colors">
                                            {item.title}
                                        </h3>

                                        {/* Seller Info */}
                                        {item.seller_name && (
                                            <div className="flex items-center gap-2 mb-3">
                                                <Avatar className="h-6 w-6 bg-gradient-to-br from-purple-500 to-pink-500">
                                                    <AvatarFallback className="text-white text-xs font-bold">
                                                        {item.seller_name.charAt(0).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="text-sm text-gray-400 truncate">
                                                    {item.seller_name}
                                                </span>
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between text-sm">
                                            <span className="flex items-center gap-1 text-gray-400">
                                                <MapPin className="h-3.5 w-3.5" />
                                                {item.location || 'Unknown'}
                                            </span>
                                            <span className="flex items-center gap-1 text-gray-500">
                                                <Clock className="h-3.5 w-3.5" />
                                                {formatTimeAgo(item.viewed_at)}
                                            </span>
                                        </div>
                                    </div>
                                </Card>
                            ) : (
                                /* List View Card */
                                <Card
                                    key={item.id || item.post_id}
                                    className="group bg-gradient-to-r from-gray-800/60 to-gray-900/60 border-gray-700/30 overflow-hidden cursor-pointer hover:border-blue-500/30 hover:bg-gray-800/80 transition-all duration-300 rounded-2xl"
                                    onClick={() => navigate(`/post/${item.post_id}`)}
                                >
                                    <div className="flex gap-4 p-4">
                                        {/* Image */}
                                        <div className="relative w-32 h-24 rounded-xl overflow-hidden flex-shrink-0">
                                            <img
                                                src={getImageUrl(item)}
                                                alt={item.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                onError={(e) => { e.target.src = 'https://via.placeholder.com/150?text=No+Image'; }}
                                            />
                                            <Badge
                                                className={`absolute top-1 right-1 px-2 py-0.5 text-[10px] font-bold rounded-full ${item.status === 'active'
                                                    ? 'bg-emerald-500/90 text-white'
                                                    : 'bg-red-500/90 text-white'
                                                    }`}
                                            >
                                                {item.status}
                                            </Badge>
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            {/* Category Badge */}
                                            {item.category_name && (
                                                <Badge className="mb-1 bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs px-2 py-0.5 rounded-md">
                                                    {item.category_name}
                                                </Badge>
                                            )}
                                            <h3 className="text-white font-semibold truncate group-hover:text-blue-400 transition-colors">
                                                {item.title}
                                            </h3>
                                            <p className="text-xl font-bold text-emerald-400 mt-1">
                                                {formatPrice(item.price)}
                                            </p>
                                            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-400">
                                                {/* Seller */}
                                                {item.seller_name && (
                                                    <span className="flex items-center gap-1">
                                                        <Avatar className="h-4 w-4 bg-gradient-to-br from-purple-500 to-pink-500">
                                                            <AvatarFallback className="text-white text-[8px] font-bold">
                                                                {item.seller_name.charAt(0).toUpperCase()}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        {item.seller_name}
                                                    </span>
                                                )}
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="h-3 w-3" />
                                                    {item.location || 'Unknown'}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Eye className="h-3 w-3" />
                                                    Viewed {item.view_count}x
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {formatTimeAgo(item.viewed_at)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex flex-col justify-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRemove(item.post_id);
                                                }}
                                                className="text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            )
                        ))}
                    </div>
                )}
            </div>

            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-24 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-2xl shadow-2xl z-50 flex items-center gap-2 ${toast.type === 'error'
                    ? 'bg-gradient-to-r from-red-600 to-red-700'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-600'
                    } text-white font-medium`}>
                    {toast.type === 'error' ? <XCircle className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                    {toast.message}
                </div>
            )}
        </div>
    );
};

export default RecentlyViewed;

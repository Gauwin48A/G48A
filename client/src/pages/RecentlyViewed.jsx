import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    History, Trash2, MapPin, Clock, Eye,
    ArrowLeft, XCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

const RecentlyViewed = () => {
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [toast, setToast] = useState(null);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            setLoading(true);
            const userId = localStorage.getItem('userId');
            const token = localStorage.getItem('authToken');

            const response = await api.get('/recently-viewed', {
                headers: { Authorization: `Bearer ${token}` },
                params: { userId, limit: 50 }
            });

            setItems(response.data.items || []);
        } catch (err) {
            console.error('Failed to fetch history:', err);
            setError('Failed to load browsing history');
        } finally {
            setLoading(false);
        }
    };

    const handleRemove = async (postId) => {
        try {
            const token = localStorage.getItem('authToken');
            await api.delete(`/recently-viewed/${postId}`, {
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
            await api.delete('/recently-viewed/clear', {
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
        return 'https://via.placeholder.com/150?text=No+Image';
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

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
            {/* Header */}
            <div className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur-lg border-b border-gray-700">
                <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(-1)}
                            className="text-gray-300 hover:text-white"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="text-xl font-bold text-white flex items-center gap-2">
                                <History className="h-5 w-5 text-blue-400" />
                                Recently Viewed
                            </h1>
                            <p className="text-xs text-gray-400">{items.length} items</p>
                        </div>
                    </div>
                    {items.length > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleClearAll}
                            className="text-red-400 hover:text-red-300"
                        >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Clear All
                        </Button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="p-4 pb-24">
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                ) : error ? (
                    <div className="text-center py-12">
                        <XCircle className="h-12 w-12 mx-auto text-red-400 mb-4" />
                        <p className="text-gray-400">{error}</p>
                        <Button onClick={fetchHistory} className="mt-4">Retry</Button>
                    </div>
                ) : items.length === 0 ? (
                    <div className="text-center py-16">
                        <History className="h-16 w-16 mx-auto text-gray-600 mb-4" />
                        <h3 className="text-xl font-semibold text-gray-300 mb-2">No Browsing History</h3>
                        <p className="text-gray-500 mb-6">Posts you view will appear here</p>
                        <Button onClick={() => navigate('/all-posts')} className="bg-blue-600 hover:bg-blue-700">
                            Browse Posts
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {items.map((item) => (
                            <Card
                                key={item.id || item.post_id}
                                className="bg-gray-800/60 border-gray-700 overflow-hidden cursor-pointer hover:bg-gray-700/60 transition-all"
                                onClick={() => navigate(`/post/${item.post_id}`)}
                            >
                                <div className="flex gap-4 p-3">
                                    <img
                                        src={getImageUrl(item)}
                                        alt={item.title}
                                        className="w-20 h-20 object-cover rounded-lg"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-white font-medium text-sm truncate">{item.title}</h3>
                                        <p className="text-green-400 font-bold mt-1">₹{item.price?.toLocaleString()}</p>
                                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                                            {item.location && (
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="h-3 w-3" />
                                                    {item.location}
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1">
                                                <Eye className="h-3 w-3" />
                                                Viewed {item.view_count}x
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                            <Clock className="h-3 w-3" />
                                            {formatTimeAgo(item.viewed_at)}
                                        </div>
                                    </div>
                                    <div className="flex flex-col justify-between items-end">
                                        <Badge
                                            variant="outline"
                                            className={`text-xs ${item.status === 'active' ? 'border-green-500 text-green-400' :
                                                item.status === 'sold' ? 'border-red-500 text-red-400' :
                                                    'border-gray-500 text-gray-400'
                                                }`}
                                        >
                                            {item.status}
                                        </Badge>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRemove(item.post_id);
                                            }}
                                            className="text-gray-400 hover:text-red-400"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-24 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-lg shadow-lg z-50 ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'
                    } text-white text-sm`}>
                    {toast.message}
                </div>
            )}
        </div>
    );
};

export default RecentlyViewed;

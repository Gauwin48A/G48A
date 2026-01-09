import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Heart, Trash2, MapPin, ShoppingBag, Sparkles,
    ArrowLeft, Share2, ExternalLink
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useTranslation } from 'react-i18next';
import { translatePosts } from '@/utils/translateContent';

const Wishlist = () => {
    const { t, i18n } = useTranslation();
    const currentLang = i18n.language || 'en';
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Check auth
    useEffect(() => {
        const token = localStorage.getItem('authToken');
        const userId = localStorage.getItem('userId');
        setIsAuthenticated(!!(token && userId));
    }, []);

    // Fetch wishlist
    useEffect(() => {
        if (!isAuthenticated) return;

        const fetchWishlist = async () => {
            setLoading(true);
            try {
                const userId = localStorage.getItem('userId');
                const res = await api.get(`/api/wishlist?userId=${userId}`);
                let loadedItems = res.data?.items || [];
                // Translate post content if not English
                if (currentLang !== 'en' && loadedItems.length > 0) {
                    loadedItems = await translatePosts(loadedItems, currentLang);
                }
                setItems(loadedItems);
                setError(null);
            } catch (err) {
                console.error('Failed to fetch wishlist:', err);
                setError(t('failed_load_wishlist'));
                setItems([]);
            } finally {
                setLoading(false);
            }
        };
        fetchWishlist();
    }, [isAuthenticated, currentLang]);

    // Remove from wishlist
    const handleRemove = async (postId) => {
        try {
            const userId = localStorage.getItem('userId');
            await api.delete(`/api/wishlist/${postId}?userId=${userId}`);
            setItems(prev => prev.filter(item => item.post_id !== postId));
        } catch (err) {
            console.error('Failed to remove:', err);
        }
    };

    const getImageUrl = (item) => {
        const img = item.images?.[0] || item.image_url;
        if (!img) return '/placeholder.svg';
        if (img.startsWith('http')) return img;
        return `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}${img}`;
    };

    // Not authenticated
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
                <div className="bg-white/10 backdrop-blur-2xl rounded-3xl p-8 border border-white/20 shadow-2xl max-w-md w-full text-center">
                    <Heart className="w-16 h-16 text-pink-400 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-white mb-3">{t('sign_in_to_view_wishlist') || 'Sign in to view Wishlist'}</h1>
                    <p className="text-gray-300 mb-6">{t('save_favorites') || 'Save your favorite items for later'}</p>
                    <Button
                        onClick={() => navigate('/login')}
                        className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-6 text-lg rounded-xl"
                    >
                        {t('sign_in') || 'Sign In'}
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-pink-50 to-purple-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
            {/* Header */}
            {/* Header */}
            <PageHeader title={t('my_wishlist') || 'My Wishlist'} />

            <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
                <div className="flex items-center gap-3 mb-2">
                    <Heart className="w-6 h-6 text-pink-500 fill-pink-500" />
                    <p className="text-gray-600 dark:text-gray-300">{items.length} {t('saved_items') || 'saved items'}</p>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 py-8">
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-3xl p-5 animate-pulse">
                                <div className="w-full h-48 bg-gray-200 dark:bg-gray-700 rounded-2xl mb-4" />
                                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded-full w-3/4 mb-3" />
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full w-1/2" />
                            </div>
                        ))}
                    </div>
                ) : items.length === 0 ? (
                    <div className="text-center py-24">
                        <div className="w-24 h-24 bg-gradient-to-br from-pink-400 to-purple-500 rounded-3xl mx-auto mb-6 flex items-center justify-center">
                            <Heart className="w-12 h-12 text-white" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-3">{t('wishlist_empty') || 'Your wishlist is empty'}</h3>
                        <p className="text-gray-500 mb-6">{t('start_saving') || 'Start saving items you love!'}</p>
                        <Button
                            onClick={() => navigate('/all-posts')}
                            className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-8 py-6 text-lg rounded-2xl"
                        >
                            <ShoppingBag className="w-5 h-5 mr-2" /> {t('browse_products') || 'Browse Products'}
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {items.map((item) => (
                            <Card
                                key={item.wishlist_id}
                                className="group bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-3xl overflow-hidden border border-white/50 shadow-xl hover:shadow-2xl transition-all duration-300"
                            >
                                {/* Image */}
                                <div className="relative w-full h-48 overflow-hidden">
                                    <img
                                        src={getImageUrl(item)}
                                        alt={item.title}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                        onError={(e) => { e.target.src = '/placeholder.svg'; }}
                                    />
                                    <button
                                        onClick={() => handleRemove(item.post_id)}
                                        className="absolute top-3 right-3 p-2 rounded-xl bg-red-500 hover:bg-red-600 shadow-lg transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4 text-white" />
                                    </button>
                                    <Badge className="absolute top-3 left-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white border-0">
                                        {item.category_name || 'General'}
                                    </Badge>
                                </div>

                                {/* Content */}
                                <div className="p-4">
                                    <h3 className="font-bold text-gray-800 dark:text-white text-lg mb-2 line-clamp-1">
                                        {item.title}
                                    </h3>
                                    <p className="text-gray-500 text-sm mb-3 line-clamp-2">
                                        {item.description || t('no_description') || 'No description'}
                                    </p>
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                                            ₹{item.price?.toLocaleString() || '0'}
                                        </span>
                                        <div className="flex items-center gap-1 text-gray-500 text-sm">
                                            <MapPin className="w-3 h-3" />
                                            {item.location || 'N/A'}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                                        <span>{t('saved') || 'Saved'} {new Date(item.saved_at).toLocaleDateString()}</span>
                                    </div>
                                    <Button
                                        onClick={() => navigate(`/post/${item.post_id}`)}
                                        className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl"
                                    >
                                        <ExternalLink className="w-4 h-4 mr-2" /> {t('view_details') || 'View Details'}
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

export default Wishlist;

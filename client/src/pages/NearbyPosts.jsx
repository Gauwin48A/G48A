import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, Navigation, Sliders, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { getNearbyPosts } from '@/lib/api';

import { useTranslation } from 'react-i18next';

const NearbyPosts = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [userLocation, setUserLocation] = useState(null);
    const [radius, setRadius] = useState(10); // Default 10km
    const [locationPermission, setLocationPermission] = useState('prompt');

    // Radius options
    const radiusOptions = [1, 2, 5, 10, 25, 50, 100];

    // Request user's location
    const requestLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setError(t('geolocation_unsupported'));
            setLocationPermission('denied');
            return;
        }

        setLoading(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setUserLocation({
                    lat: position.coords.latitude,
                    long: position.coords.longitude
                });
                setLocationPermission('granted');
            },
            (err) => {
                console.error('Location error:', err);
                setError(t('enable_location_access'));
                setLocationPermission('denied');
                setLoading(false);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
        );
    }, []);

    // Request location on mount
    useEffect(() => {
        requestLocation();
    }, [requestLocation]);

    // Fetch nearby posts when location or radius changes
    useEffect(() => {
        if (!userLocation) return;

        const fetchNearby = async () => {
            setLoading(true);
            setError(null);
            try {
                const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
                const res = await fetch(`${baseUrl}/api/nearby?lat=${userLocation.lat}&long=${userLocation.long}&radius=${radius}`);
                const data = await res.json();
                if (data.success) {
                    setPosts(data.posts || []);
                } else {
                    setError(data.error || t('failed_fetch_nearby'));
                }
            } catch (err) {
                setError(t('failed_load_nearby_retry'));
            } finally {
                setLoading(false);
            }
        };

        fetchNearby();
    }, [userLocation, radius]);

    // Distance badge color based on km
    const getDistanceColor = (km) => {
        const distance = parseFloat(km);
        if (distance < 1) return 'bg-green-500';
        if (distance < 5) return 'bg-blue-500';
        if (distance < 10) return 'bg-yellow-500';
        return 'bg-orange-500';
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-gradient-to-r from-green-600 to-teal-600 px-4 py-6">
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <MapPin className="w-8 h-8 text-white" />
                            <div>
                                <h1 className="text-2xl font-bold text-white">{t('nearby_posts_title')}</h1>
                                <p className="text-green-100 text-sm">{t('find_items_close')}</p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            className="text-white hover:bg-white/20"
                            onClick={requestLocation}
                        >
                            <RefreshCw className="w-5 h-5" />
                        </Button>
                    </div>

                    {/* Distance Filter */}
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Sliders className="w-4 h-4 text-white" />
                            <span className="text-white font-medium">{t('search_radius')}: {radius} km</span>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            {radiusOptions.map((r) => (
                                <button
                                    key={r}
                                    onClick={() => setRadius(r)}
                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${radius === r
                                        ? 'bg-white text-green-600 shadow-lg'
                                        : 'bg-white/20 text-white hover:bg-white/30'
                                        }`}
                                >
                                    {r} km
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-6xl mx-auto px-4 py-6">
                {/* Location Permission Request */}
                {locationPermission === 'denied' && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6 text-center mb-6">
                        <Navigation className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
                        <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                            {t('location_access_required')}
                        </h3>
                        <p className="text-yellow-600 dark:text-yellow-300 mb-4">
                            {t('need_location_msg')}
                        </p>
                        <Button onClick={requestLocation} className="bg-yellow-500 hover:bg-yellow-600 text-white">
                            {t('enable_location')}
                        </Button>
                    </div>
                )}

                {/* Loading State */}
                {loading && (
                    <div className="flex flex-col items-center justify-center py-16">
                        <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-gray-500 dark:text-gray-400">{t('finding_items')}</p>
                    </div>
                )}

                {/* Error State */}
                {error && !loading && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
                        <p className="text-red-600 dark:text-red-400">{error}</p>
                        <Button onClick={requestLocation} className="mt-4" variant="outline">
                            {t('try_again')}
                        </Button>
                    </div>
                )}

                {/* Posts Grid */}
                {!loading && !error && posts.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {posts.map((post) => (
                            <Card
                                key={post.post_id}
                                onClick={() => navigate(`/post/${post.post_id}`)}
                                className="cursor-pointer hover:shadow-lg transition-shadow overflow-hidden bg-white dark:bg-gray-800"
                            >
                                {/* Distance Badge */}
                                <div className="relative">
                                    <div className="w-full h-48 bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                        {post.images?.[0] ? (
                                            <img src={post.images[0]} alt={post.title} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-gray-400">No Image</span>
                                        )}
                                    </div>
                                    <div className={`absolute top-3 right-3 ${getDistanceColor(post.distance_km)} text-white px-3 py-1 rounded-full text-sm font-medium shadow`}>
                                        {post.distance_text}
                                    </div>
                                    {post.seller_verified && (
                                        <div className="absolute top-3 left-3 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                            {t('verified')}
                                        </div>
                                    )}
                                </div>

                                <div className="p-4">
                                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1 line-clamp-1">
                                        {post.title}
                                    </h3>
                                    <p className="text-2xl font-bold text-green-600 dark:text-green-400 mb-2">
                                        ₹{post.price?.toLocaleString()}
                                    </p>
                                    <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                                        <span className="flex items-center gap-1">
                                            <MapPin className="w-4 h-4" />
                                            {post.location || 'Unknown'}
                                        </span>
                                        <span>{post.category_name}</span>
                                    </div>
                                    {post.seller_name && (
                                        <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                                            {t('seller_label')}: {post.seller_name}
                                            {post.seller_rating > 0 && (
                                                <span className="ml-2 text-yellow-500">★ {parseFloat(post.seller_rating).toFixed(1)}</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Empty State */}
                {!loading && !error && posts.length === 0 && userLocation && (
                    <div className="text-center py-16">
                        <MapPin className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                        <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-300 mb-2">
                            {t('no_posts_radius', { radius })}
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-4">
                            {t('increase_radius')}
                        </p>
                        <Button onClick={() => setRadius(50)} variant="outline">
                            {t('search_50km')}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NearbyPosts;

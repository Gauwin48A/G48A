import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    BarChart3, TrendingUp, Eye, MessageCircle, DollarSign,
    Package, ShoppingCart, Star, ArrowLeft, RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

import { useTranslation } from 'react-i18next';

const Analytics = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [overview, setOverview] = useState(null);
    const [postPerformance, setPostPerformance] = useState([]);
    const [categoryBreakdown, setCategoryBreakdown] = useState([]);
    const [loading, setLoading] = useState(true);
    const requestIdRef = useRef(0);

    const fetchAllAnalytics = useCallback(async () => {
        const requestId = ++requestIdRef.current;
        setLoading(true);
        try {
            const [overviewRes, postsRes, categoriesRes] = await Promise.all([
                api.get('/api/analytics/seller'),
                api.get('/api/analytics/posts'),
                api.get('/api/analytics/categories')
            ]);
            if (requestId !== requestIdRef.current) {
                return;
            }

            const overviewPayload = overviewRes?.data ?? overviewRes;
            const postsPayload = postsRes?.data ?? postsRes;
            const categoriesPayload = categoriesRes?.data ?? categoriesRes;

            setOverview(overviewPayload?.overview || null);
            setPostPerformance(Array.isArray(postsPayload?.posts) ? postsPayload.posts : []);
            setCategoryBreakdown(Array.isArray(categoriesPayload?.breakdown) ? categoriesPayload.breakdown : []);
        } catch (error) {
            if (import.meta.env.DEV) {
                console.error('Failed to fetch analytics:', error);
            }
        } finally {
            if (requestId === requestIdRef.current) {
                setLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        fetchAllAnalytics();
    }, [fetchAllAnalytics]);

    const topPosts = useMemo(() => postPerformance.slice(0, 5), [postPerformance]);

    const StatCard = ({ icon: Icon, label, value, change, color }) => (
        <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg">
            <CardContent className="p-6">
                <div className="flex items-center justify-between">
                    <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center`}>
                        <Icon className="w-6 h-6 text-white" />
                    </div>
                    {change && (
                        <Badge variant={change > 0 ? 'default' : 'secondary'} className="text-xs">
                            {change > 0 ? '+' : ''}{change}%
                        </Badge>
                    )}
                </div>
                <p className="text-3xl font-bold mt-4 text-gray-900 dark:text-white">{value}</p>
                <p className="text-sm text-gray-500 mt-1">{label}</p>
            </CardContent>
        </Card>
    );

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading analytics...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 px-4 py-8">
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-center gap-4 mb-6">
                        <Button variant="ghost" size="icon" className="text-white" onClick={() => navigate(-1)}>
                            <ArrowLeft className="w-6 h-6" />
                        </Button>
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                                <BarChart3 className="w-8 h-8" /> Seller Analytics
                            </h1>
                            <p className="text-purple-100 mt-1">Track your performance and growth</p>
                        </div>
                        <Button variant="secondary" size="sm" onClick={fetchAllAnalytics} disabled={loading}>
                            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
                        </Button>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 -mt-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <StatCard
                        icon={Eye}
                        label="Total Views"
                        value={overview?.totalViews?.toLocaleString() || 0}
                        color="bg-blue-500"
                    />
                    <StatCard
                        icon={MessageCircle}
                        label="Inquiries"
                        value={overview?.totalInquiries || 0}
                        color="bg-green-500"
                    />
                    <StatCard
                        icon={ShoppingCart}
                        label="Items Sold"
                        value={overview?.soldPosts || 0}
                        color="bg-purple-500"
                    />
                    <StatCard
                        icon={DollarSign}
                        label="Revenue"
                        value={`₹${(overview?.totalRevenue || 0).toLocaleString()}`}
                        color="bg-yellow-500"
                    />
                </div>

                {/* Secondary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <StatCard
                        icon={Package}
                        label="Active Posts"
                        value={overview?.activePosts || 0}
                        color="bg-indigo-500"
                    />
                    <StatCard
                        icon={TrendingUp}
                        label="Conversion Rate"
                        value={`${overview?.conversionRate || 0}%`}
                        color="bg-pink-500"
                    />
                    <StatCard
                        icon={Star}
                        label="Avg Rating"
                        value={overview?.avgRating || 'N/A'}
                        color="bg-orange-500"
                    />
                    <StatCard
                        icon={MessageCircle}
                        label="Total Reviews"
                        value={overview?.totalReviews || 0}
                        color="bg-teal-500"
                    />
                </div>

                {/* Post Performance */}
                <Card className="mb-8 border-0 shadow-xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-blue-600" />
                            Top Performing Posts
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {postPerformance.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">{t('no_posts')}</p>
                        ) : (
                            <div className="space-y-4">
                                {topPosts.map((post) => (
                                    <div key={post.post_id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                                        <div className="flex-1">
                                            <h4 className="font-semibold text-gray-900 dark:text-white">{post.title}</h4>
                                            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                                                <span>₹{post.price?.toLocaleString()}</span>
                                                <Badge variant={post.status === 'active' ? 'default' : 'secondary'}>{post.status}</Badge>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6 text-center">
                                            <div>
                                                <p className="text-lg font-bold text-blue-600">{post.views_count}</p>
                                                <p className="text-xs text-gray-500">Views</p>
                                            </div>
                                            <div>
                                                <p className="text-lg font-bold text-green-600">{post.inquiry_count}</p>
                                                <p className="text-xs text-gray-500">Inquiries</p>
                                            </div>
                                            <div>
                                                <p className="text-lg font-bold text-purple-600">{post.offer_count}</p>
                                                <p className="text-xs text-gray-500">Offers</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Category Breakdown */}
                <Card className="border-0 shadow-xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Package className="w-5 h-5 text-purple-600" />
                            Category Breakdown
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {categoryBreakdown.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">No data yet</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {categoryBreakdown.map((cat, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                                        <div>
                                            <h4 className="font-semibold text-gray-900 dark:text-white">{cat.category || 'Uncategorized'}</h4>
                                            <p className="text-sm text-gray-500">{cat.post_count} posts</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-bold text-blue-600">{cat.total_views || 0}</p>
                                            <p className="text-xs text-gray-500">views</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default Analytics;

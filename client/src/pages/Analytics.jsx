import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Calendar,
  DollarSign,
  Eye,
  MessageCircle,
  Package,
  RefreshCw,
  ShoppingCart,
  Star,
  TrendingUp,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';

const DATE_RANGE_OPTIONS = [
  { value: '7d', label: '7D', days: 7 },
  { value: '30d', label: '30D', days: 30 },
  { value: '90d', label: '90D', days: 90 },
  { value: 'all', label: 'All time', days: null },
];

const normalizeAnalyticsError = (error) => {
  const status = Number(error?.status || error?.response?.status || 0);
  const message = String(error?.message || '').toLowerCase();

  if (status === 401 || status === 403 || message.includes('authentication') || message.includes('session')) {
    return 'Your session does not have analytics access. Please sign in again.';
  }

  return 'Analytics is temporarily unavailable. Please retry.';
};

const formatNumber = (value) => Number(value || 0).toLocaleString();
const formatAmount = (value) => `INR ${Number(value || 0).toLocaleString()}`;
const formatDate = (value) => {
  if (!value) return 'Unknown date';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Unknown date' : parsed.toLocaleDateString();
};

const getRangeStartDate = (rangeValue) => {
  const range = DATE_RANGE_OPTIONS.find((item) => item.value === rangeValue);
  if (!range || range.days === null) {
    return null;
  }

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (range.days - 1));
  return start;
};

const Analytics = () => {
  const navigate = useNavigate();
  const requestIdRef = useRef(0);

  const [overview, setOverview] = useState(null);
  const [postPerformance, setPostPerformance] = useState([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRange, setSelectedRange] = useState('30d');

  const fetchAllAnalytics = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);

    try {
      const [overviewRes, postsRes, categoriesRes] = await Promise.all([
        api.get('/api/analytics/seller'),
        api.get('/api/analytics/posts'),
        api.get('/api/analytics/categories'),
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
      setError('');
    } catch (fetchError) {
      if (requestId === requestIdRef.current) {
        setError(normalizeAnalyticsError(fetchError));
      }
      if (import.meta.env.DEV) {
        console.error('[Analytics] Fetch failed:', fetchError);
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

  const hasAnyData = useMemo(
    () => Boolean(overview) || postPerformance.length > 0 || categoryBreakdown.length > 0,
    [categoryBreakdown.length, overview, postPerformance.length]
  );

  const rangeStartDate = useMemo(() => getRangeStartDate(selectedRange), [selectedRange]);

  const filteredPostPerformance = useMemo(() => {
    if (!rangeStartDate) {
      return postPerformance;
    }

    return postPerformance.filter((post) => {
      const createdAt = new Date(post.created_at);
      if (Number.isNaN(createdAt.getTime())) {
        return false;
      }
      return createdAt >= rangeStartDate;
    });
  }, [postPerformance, rangeStartDate]);

  const filteredCategoryBreakdown = useMemo(() => {
    if (!rangeStartDate) {
      return categoryBreakdown;
    }

    const aggregation = new Map();
    filteredPostPerformance.forEach((post) => {
      const categoryKey = String(post.category || 'Uncategorized').trim() || 'Uncategorized';
      const existing = aggregation.get(categoryKey) || {
        category: categoryKey,
        post_count: 0,
        total_views: 0,
        sold_count: 0,
      };

      existing.post_count += 1;
      existing.total_views += Number(post.views_count || 0);
      existing.sold_count += String(post.status || '').toLowerCase() === 'sold' ? 1 : 0;
      aggregation.set(categoryKey, existing);
    });

    return Array.from(aggregation.values()).sort((left, right) => right.post_count - left.post_count);
  }, [categoryBreakdown, filteredPostPerformance, rangeStartDate]);

  const topPosts = useMemo(() => filteredPostPerformance.slice(0, 5), [filteredPostPerformance]);

  const rangeTotals = useMemo(() => {
    return filteredPostPerformance.reduce(
      (accumulator, post) => {
        accumulator.views += Number(post.views_count || 0);
        accumulator.inquiries += Number(post.inquiry_count || 0);
        accumulator.offers += Number(post.offer_count || 0);
        return accumulator;
      },
      { views: 0, inquiries: 0, offers: 0 }
    );
  }, [filteredPostPerformance]);

  const currentRangeLabel = useMemo(() => {
    const selected = DATE_RANGE_OPTIONS.find((item) => item.value === selectedRange);
    return selected ? selected.label : 'All time';
  }, [selectedRange]);

  const StatCard = ({ icon: Icon, label, value, change, color }) => (
    <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          {typeof change === 'number' ? (
            <Badge variant={change > 0 ? 'default' : 'secondary'} className="text-xs">
              {change > 0 ? '+' : ''}
              {change}%
            </Badge>
          ) : null}
        </div>
        <p className="text-3xl font-bold mt-4 text-gray-900 dark:text-white">{value}</p>
        <p className="text-sm text-gray-500 mt-1">{label}</p>
      </CardContent>
    </Card>
  );

  if (loading && !hasAnyData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const noPostsAvailable = postPerformance.length === 0;
  const noPostsInRange = postPerformance.length > 0 && filteredPostPerformance.length === 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-4 mb-6">
            <Button variant="ghost" size="icon" className="text-white self-start" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <BarChart3 className="w-8 h-8" />
                Seller Analytics
              </h1>
              <p className="text-blue-100 mt-1">Track performance, identify drop-offs, and recover quickly.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={fetchAllAnalytics} disabled={loading}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button asChild variant="secondary" size="sm">
                <Link to="/add-post">Add Post</Link>
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {DATE_RANGE_OPTIONS.map((option) => (
              <Button
                key={option.value}
                type="button"
                size="sm"
                variant={selectedRange === option.value ? 'secondary' : 'outline'}
                className={selectedRange === option.value ? 'bg-white text-blue-700' : 'border-white/40 text-white hover:bg-white/10'}
                onClick={() => setSelectedRange(option.value)}
              >
                <Calendar className="w-4 h-4 mr-1" />
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-6 space-y-6">
        {error ? (
          <Alert variant="destructive" className="bg-white dark:bg-gray-900">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Analytics refresh failed</AlertTitle>
            <AlertDescription>
              {error}
              {' '}
              {hasAnyData ? 'Showing last available data.' : 'Retry now or return to posts.'}
            </AlertDescription>
            <div className="flex flex-wrap gap-2 mt-3">
              <Button size="sm" onClick={fetchAllAnalytics}>Retry</Button>
              <Button size="sm" variant="outline" onClick={() => navigate('/my-posts')}>My Posts</Button>
            </div>
          </Alert>
        ) : null}

        <Alert className="border-blue-200 bg-blue-50 text-blue-900">
          <AlertTitle>KPI scope: lifetime totals</AlertTitle>
          <AlertDescription>
            Summary cards use full account history. Date range ({currentRangeLabel}) applies to post and category panels below.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={Eye}
            label="Total Views"
            value={formatNumber(overview?.totalViews)}
            color="bg-blue-500"
          />
          <StatCard
            icon={MessageCircle}
            label="Inquiries"
            value={formatNumber(overview?.totalInquiries)}
            color="bg-green-500"
          />
          <StatCard
            icon={ShoppingCart}
            label="Items Sold"
            value={formatNumber(overview?.soldPosts)}
            color="bg-purple-500"
          />
          <StatCard
            icon={DollarSign}
            label="Revenue"
            value={formatAmount(overview?.totalRevenue)}
            color="bg-yellow-500"
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={Package}
            label="Active Posts"
            value={formatNumber(overview?.activePosts)}
            color="bg-indigo-500"
          />
          <StatCard
            icon={TrendingUp}
            label="Conversion Rate"
            value={`${Number(overview?.conversionRate || 0)}%`}
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
            value={formatNumber(overview?.totalReviews)}
            color="bg-teal-500"
          />
        </div>

        <Card className="mb-8 border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2 flex-wrap">
              <span className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Top Performing Posts ({currentRangeLabel})
              </span>
              <Badge variant="outline">
                Views {formatNumber(rangeTotals.views)} | Inquiries {formatNumber(rangeTotals.inquiries)} | Offers {formatNumber(rangeTotals.offers)}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {noPostsAvailable ? (
              <div className="text-center py-8 space-y-3">
                <p className="text-gray-500">No post analytics yet. Publish your first listing to start tracking performance.</p>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button asChild>
                    <Link to="/add-post">Create First Post</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link to="/all-posts">Browse Marketplace</Link>
                  </Button>
                </div>
              </div>
            ) : noPostsInRange ? (
              <div className="text-center py-8 space-y-3">
                <p className="text-gray-500">No post activity found in the selected date range.</p>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button variant="outline" onClick={() => setSelectedRange('all')}>Reset Date Range</Button>
                  <Button asChild>
                    <Link to="/add-post">Add New Post</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {topPosts.map((post) => (
                  <div key={post.post_id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 dark:text-white">{post.title}</h4>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-500">
                        <span>{formatAmount(post.price)}</span>
                        <Badge variant={post.status === 'active' ? 'default' : 'secondary'}>{post.status}</Badge>
                        <span>{formatDate(post.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-center">
                      <div>
                        <p className="text-lg font-bold text-blue-600">{formatNumber(post.views_count)}</p>
                        <p className="text-xs text-gray-500">Views</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-green-600">{formatNumber(post.inquiry_count)}</p>
                        <p className="text-xs text-gray-500">Inquiries</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-purple-600">{formatNumber(post.offer_count)}</p>
                        <p className="text-xs text-gray-500">Offers</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-purple-600" />
              Category Breakdown ({currentRangeLabel})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredCategoryBreakdown.length === 0 ? (
              <div className="text-center py-8 space-y-3">
                <p className="text-gray-500">No category data available for this range.</p>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button variant="outline" onClick={() => setSelectedRange('all')}>Use all-time view</Button>
                  <Button asChild>
                    <Link to="/categories">Explore categories</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredCategoryBreakdown.map((category, index) => (
                  <div key={`${category.category}-${index}`} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">{category.category || 'Uncategorized'}</h4>
                      <p className="text-sm text-gray-500">{formatNumber(category.post_count)} posts | {formatNumber(category.sold_count)} sold</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-blue-600">{formatNumber(category.total_views)}</p>
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

/**
 * useAnalytics Hook
 * TanStack Query hooks for seller analytics
 *
 * Backend endpoints:
 * - GET /api/seller-analytics/stats -> seller stats
 * - GET /api/seller-analytics/listings-performance -> listing metrics
 * - GET /api/seller-analytics/views-trend -> views over time
 * - GET /api/seller-analytics/conversion -> conversion funnel
 * - GET /api/seller-analytics/export -> CSV export
 */

import { useQuery, useQueries } from '@tanstack/react-query';
import api from '../services/api';

const STALE_TIME = 5 * 60 * 1000; // 5 minutes

// Query keys for cache management
export const analyticsKeys = {
    all: ['analytics'],
    stats: () => [...analyticsKeys.all, 'stats'],
    listings: (params) => [...analyticsKeys.all, 'listings', params],
    viewsTrend: (params) => [...analyticsKeys.all, 'views-trend', params],
    conversion: () => [...analyticsKeys.all, 'conversion'],
};

/**
 * Fetch seller stats summary
 */
export const useSellerStats = (options = {}) => {
    const { enabled = true } = options;

    return useQuery({
        queryKey: analyticsKeys.stats(),
        queryFn: async () => {
            const response = await api.get('/api/seller-analytics/stats');
            return response?.data ?? response;
        },
        staleTime: STALE_TIME,
        gcTime: STALE_TIME * 2,
        enabled,
        retry: 2,
    });
};

/**
 * Fetch listings performance metrics
 */
export const useListingsPerformance = (options = {}) => {
    const { period = '30d', enabled = true } = options;

    return useQuery({
        queryKey: analyticsKeys.listings({ period }),
        queryFn: async () => {
            const response = await api.get('/api/seller-analytics/listings-performance', {
                params: { period }
            });
            return response?.data ?? response;
        },
        staleTime: STALE_TIME,
        gcTime: STALE_TIME * 2,
        enabled,
        retry: 2,
    });
};

/**
 * Fetch views trend over time
 */
export const useViewsTrend = (options = {}) => {
    const { period = '30d', enabled = true } = options;

    return useQuery({
        queryKey: analyticsKeys.viewsTrend({ period }),
        queryFn: async () => {
            const response = await api.get('/api/seller-analytics/views-trend', {
                params: { period }
            });
            return response?.data ?? response;
        },
        staleTime: STALE_TIME,
        gcTime: STALE_TIME * 2,
        enabled,
        retry: 2,
    });
};

/**
 * Fetch conversion funnel data
 */
export const useConversionFunnel = (options = {}) => {
    const { enabled = true } = options;

    return useQuery({
        queryKey: analyticsKeys.conversion(),
        queryFn: async () => {
            const response = await api.get('/api/seller-analytics/conversion');
            return response?.data ?? response;
        },
        staleTime: STALE_TIME,
        gcTime: STALE_TIME * 2,
        enabled,
        retry: 2,
    });
};

/**
 * Fetch all analytics data in parallel
 */
export const useAllAnalytics = (options = {}) => {
    const { period = '30d', enabled = true } = options;

    const results = useQueries({
        queries: [
            {
                queryKey: analyticsKeys.stats(),
                queryFn: async () => {
                    const response = await api.get('/api/seller-analytics/stats');
                    return response?.data ?? response;
                },
                staleTime: STALE_TIME,
                enabled,
            },
            {
                queryKey: analyticsKeys.listings({ period }),
                queryFn: async () => {
                    const response = await api.get('/api/seller-analytics/listings-performance', {
                        params: { period }
                    });
                    return response?.data ?? response;
                },
                staleTime: STALE_TIME,
                enabled,
            },
            {
                queryKey: analyticsKeys.viewsTrend({ period }),
                queryFn: async () => {
                    const response = await api.get('/api/seller-analytics/views-trend', {
                        params: { period }
                    });
                    return response?.data ?? response;
                },
                staleTime: STALE_TIME,
                enabled,
            },
            {
                queryKey: analyticsKeys.conversion(),
                queryFn: async () => {
                    const response = await api.get('/api/seller-analytics/conversion');
                    return response?.data ?? response;
                },
                staleTime: STALE_TIME,
                enabled,
            },
        ],
    });

    const [statsQuery, listingsQuery, viewsQuery, conversionQuery] = results;

    return {
        stats: statsQuery.data,
        listings: listingsQuery.data,
        viewsTrend: viewsQuery.data,
        conversion: conversionQuery.data,
        isLoading: results.some(r => r.isLoading),
        isError: results.some(r => r.isError),
        errors: results.filter(r => r.error).map(r => r.error),
        refetchAll: () => results.forEach(r => r.refetch()),
    };
};

/**
 * Export analytics as CSV (returns a download URL or blob)
 */
export const useExportAnalytics = (options = {}) => {
    const { period = '30d', enabled = false } = options;

    return useQuery({
        queryKey: [...analyticsKeys.all, 'export', { period }],
        queryFn: async () => {
            const response = await api.get('/api/seller-analytics/export', {
                params: { period },
                responseType: 'blob',
            });
            return response?.data ?? response;
        },
        staleTime: 0, // Always fetch fresh for exports
        enabled,
        retry: 1,
    });
};

export default {
    useSellerStats,
    useListingsPerformance,
    useViewsTrend,
    useConversionFunnel,
    useAllAnalytics,
    useExportAnalytics,
    analyticsKeys,
};

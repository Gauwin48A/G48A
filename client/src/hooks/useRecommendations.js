/**
 * useRecommendations Hook
 * TanStack Query hooks for personalized recommendations
 *
 * Backend endpoint:
 * - GET /api/recommendations -> { posts, count, page, limit, filters }
 *   Supports: location, minPrice, maxPrice, category, category_id, subcategory_id,
 *             category_group, search, startDate, endDate, latestWindow, page, limit
 *   When authenticated with no filters, uses saved user preferences
 */

import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import api from '../services/api';

const STALE_TIME = 5 * 60 * 1000; // 5 minutes
const PAGE_SIZE = 12;

// Query keys for cache management
export const recommendationKeys = {
    all: ['recommendations'],
    list: (filters) => [...recommendationKeys.all, 'list', filters],
};

/**
 * Build query params from filter options
 */
const buildParams = (options, page = 1) => {
    const params = { page, limit: options.limit ?? PAGE_SIZE };

    if (options.location) params.location = options.location;
    if (options.minPrice) params.minPrice = options.minPrice;
    if (options.maxPrice) params.maxPrice = options.maxPrice;
    if (options.category) params.category = options.category;
    if (options.categoryId) params.category_id = options.categoryId;
    if (options.subcategoryId) params.subcategory_id = options.subcategoryId;
    if (options.categoryGroup) params.category_group = options.categoryGroup;
    if (options.search) params.search = options.search;
    if (options.startDate) params.startDate = options.startDate;
    if (options.endDate) params.endDate = options.endDate;
    if (options.latestWindow) params.latestWindow = options.latestWindow;

    return params;
};

/**
 * Fetch recommendations for the current user
 * Uses saved preferences when no filters are provided
 */
export const useRecommendations = (options = {}) => {
    const { enabled = true, ...filterOptions } = options;

    // Create a stable filter key for caching
    const filterKey = {
        location: filterOptions.location,
        minPrice: filterOptions.minPrice,
        maxPrice: filterOptions.maxPrice,
        category: filterOptions.category,
        categoryId: filterOptions.categoryId,
        subcategoryId: filterOptions.subcategoryId,
        categoryGroup: filterOptions.categoryGroup,
        search: filterOptions.search,
    };

    return useInfiniteQuery({
        queryKey: recommendationKeys.list(filterKey),
        initialPageParam: 1,
        queryFn: async ({ pageParam = 1 }) => {
            const params = buildParams(filterOptions, pageParam);
            const response = await api.get('/api/recommendations', { params });
            const data = response?.data ?? response;

            return {
                posts: data?.posts ?? [],
                count: data?.count ?? 0,
                page: data?.page ?? pageParam,
                filters: data?.filters ?? {},
                hasMore: (data?.posts?.length ?? 0) === (filterOptions.limit ?? PAGE_SIZE),
            };
        },
        getNextPageParam: (lastPage) =>
            lastPage.hasMore ? lastPage.page + 1 : undefined,
        staleTime: STALE_TIME,
        gcTime: STALE_TIME * 2,
        enabled,
        retry: 2,
    });
};

/**
 * Get flattened posts array from infinite query
 */
export const useRecommendationsList = (options = {}) => {
    const query = useRecommendations(options);

    const posts = query.data?.pages.flatMap(page => page.posts) ?? [];
    const appliedFilters = query.data?.pages[0]?.filters ?? {};

    return {
        ...query,
        posts,
        appliedFilters,
        totalLoaded: posts.length,
    };
};

/**
 * Fetch "For You" personalized recommendations
 * Designed for the ForYou page - uses preferences automatically
 */
export const useForYou = (options = {}) => {
    const { limit = 20, enabled = true } = options;

    return useQuery({
        queryKey: [...recommendationKeys.all, 'for-you'],
        queryFn: async () => {
            const response = await api.get('/api/recommendations', {
                params: { limit }
            });
            const data = response?.data ?? response;
            return {
                posts: data?.posts ?? [],
                filters: data?.filters ?? {},
            };
        },
        staleTime: STALE_TIME,
        gcTime: STALE_TIME * 2,
        enabled,
        retry: 2,
    });
};

/**
 * Fetch recommendations by category group (electronics, fashion, vehicles, others)
 */
export const useRecommendationsByGroup = (categoryGroup, options = {}) => {
    const { limit = 12, enabled = true } = options;

    return useQuery({
        queryKey: [...recommendationKeys.all, 'group', categoryGroup],
        queryFn: async () => {
            const response = await api.get('/api/recommendations', {
                params: {
                    category_group: categoryGroup,
                    limit,
                }
            });
            const data = response?.data ?? response;
            return {
                posts: data?.posts ?? [],
                categoryGroup,
            };
        },
        staleTime: STALE_TIME,
        gcTime: STALE_TIME * 2,
        enabled: enabled && !!categoryGroup,
        retry: 2,
    });
};

/**
 * Fetch latest recommendations (most recent posts)
 */
export const useLatestRecommendations = (options = {}) => {
    const { limit = 12, enabled = true } = options;

    return useQuery({
        queryKey: [...recommendationKeys.all, 'latest', { limit }],
        queryFn: async () => {
            const response = await api.get('/api/recommendations', {
                params: { latestWindow: limit }
            });
            const data = response?.data ?? response;
            return data?.posts ?? [];
        },
        staleTime: STALE_TIME / 2, // 2.5 minutes for latest
        gcTime: STALE_TIME,
        enabled,
        retry: 2,
    });
};

export default {
    useRecommendations,
    useRecommendationsList,
    useForYou,
    useRecommendationsByGroup,
    useLatestRecommendations,
    recommendationKeys,
};

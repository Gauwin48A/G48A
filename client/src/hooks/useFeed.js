/**
 * useFeed Hook
 * Defender Prompt 3: Hyper-Efficient Frontend
 * 
 * Uses TanStack Query for caching (5 min stale time)
 * Supports infinite scroll with pagination
 */

import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useEffect } from 'react';
import api from '../lib/api';
import { useLocation as useLocationContext } from '../context/LocationContext';

const STALE_TIME = 5 * 60 * 1000; // 5 minutes
const PAGE_SIZE = 20;

const hasValue = (value) => value !== undefined && value !== null && value !== '';

/**
 * Custom hook for efficient feed fetching with caching
 */
export const useFeed = (options = {}) => {
    const {
        category = null,
        categoryId = null,
        subcategoryId = null,
        minPrice = null,
        maxPrice = null,
        sortBy = 'created_at',
        lat = null,
        lng = null,
        radius = 50,
        searchQuery = null,
        enabled = true
    } = options;

    const queryClient = useQueryClient();
    const effectiveCategory = hasValue(categoryId) ? categoryId : category;

    // Build query key for caching
    const queryKey = useMemo(() => [
        'feed',
        { category: effectiveCategory, subcategoryId, minPrice, maxPrice, sortBy, lat, lng, radius, searchQuery }
    ], [effectiveCategory, subcategoryId, minPrice, maxPrice, sortBy, lat, lng, radius, searchQuery]);

    // Fetch function
    const fetchPosts = async ({ pageParam = 1, signal }) => {
        const params = new URLSearchParams({
            page: pageParam.toString(),
            limit: PAGE_SIZE.toString()
        });

        if (hasValue(effectiveCategory)) params.set('category_id', String(effectiveCategory));
        if (hasValue(subcategoryId)) params.set('subcategory_id', String(subcategoryId));
        if (hasValue(minPrice)) params.set('minPrice', String(minPrice));
        if (hasValue(maxPrice)) params.set('maxPrice', String(maxPrice));
        if (hasValue(sortBy)) params.set('sortBy', String(sortBy));
        if (hasValue(lat)) params.set('lat', String(lat));
        if (hasValue(lng)) params.set('lng', String(lng));
        if (hasValue(radius)) params.set('radius', String(radius));
        if (hasValue(searchQuery)) params.set('search', String(searchQuery));

        const hasCoordinates = hasValue(lat) && hasValue(lng);
        const endpoint = hasCoordinates
            ? `/api/posts/nearby-v2?${params}`
            : `/api/posts?${params}`;

        const response = await api.get(endpoint, { signal });
        const payload = response?.data ?? response;
        const feedPosts = Array.isArray(payload?.posts)
            ? payload.posts
            : (Array.isArray(payload) ? payload : []);

        return {
            posts: feedPosts,
            page: pageParam,
            hasMore: feedPosts.length === PAGE_SIZE
        };
    };

    // Use infinite query for pagination
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        isError,
        error,
        refetch,
        isRefetching
    } = useInfiniteQuery({
        queryKey,
        initialPageParam: 1,
        queryFn: fetchPosts,
        getNextPageParam: (lastPage) =>
            lastPage.hasMore ? lastPage.page + 1 : undefined,
        staleTime: STALE_TIME,
        gcTime: STALE_TIME * 2,
        enabled,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: 2
    });

    // Flatten pages into single array
    const posts = useMemo(() =>
        data?.pages.flatMap(page => page.posts) || [],
        [data]
    );

    // Load more callback for infinite scroll
    const loadMore = useCallback(() => {
        if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    // Prefetch next page for smoother UX
    const prefetchNext = useCallback(async () => {
        const currentPage = data?.pages.length || 0;
        if (hasNextPage) {
            await queryClient.prefetchInfiniteQuery({
                queryKey,
                queryFn: () => fetchPosts({ pageParam: currentPage + 1 })
            });
        }
    }, [data, hasNextPage, queryClient, queryKey]);

    // Invalidate cache and refetch
    const refresh = useCallback(() => {
        return refetch();
    }, [refetch]);

    return {
        posts,
        isLoading,
        isError,
        error,
        loadMore,
        hasNextPage,
        isFetchingNextPage,
        refetch: refresh,
        isRefetching,
        prefetchNext,
        totalLoaded: posts.length
    };
};

/**
 * Hook for nearby posts with geolocation
 */
export const useNearbyPosts = (options = {}) => {
    const { radius = 50, category = null, categoryId = null, subcategoryId = null, enabled = true } = options;

    const {
        latitude,
        longitude,
        permissionDenied,
        userSkipped,
        requestLocation,
    } = useLocationContext();

    useEffect(() => {
        if (!enabled) return;
        if (Number.isFinite(latitude) && Number.isFinite(longitude)) return;
        if (permissionDenied || userSkipped) return;
        requestLocation({ silent: true }).catch(() => {});
    }, [enabled, latitude, longitude, permissionDenied, requestLocation, userSkipped]);

    return useFeed({
        ...options,
        lat: latitude,
        lng: longitude,
        radius,
        category,
        categoryId,
        subcategoryId,
        enabled: enabled && Number.isFinite(latitude) && Number.isFinite(longitude)
    });
};
export default useFeed;

